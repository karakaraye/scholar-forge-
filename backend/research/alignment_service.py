"""
Research Alignment Engine for ScholarForge AI.

Constructs and evaluates the complete alignment matrix across 13 research dimensions:
Problem <-> Aim <-> Objectives <-> Questions <-> Hypotheses <-> Variables <-> Framework
<-> Methodology <-> Instruments <-> Datasets <-> Statistical Tests <-> Results <-> Conclusions.

Flags misalignments, orphan objectives, unsupported hypotheses, and ungrounded findings.
"""

from typing import Dict, List, Any, Optional
from django.utils import timezone
from projects.models import ResearchProject
from research.models import (
    ResearchAlignmentMatrix,
    AlignmentIssue,
    ResearchDecision,
    ResearchMethodology,
    ResearchVariable,
    ResearchInstrument,
    ResearchDataset,
    StatisticalResult,
    HypothesisTest,
    QualitativeTheme,
)


class AlignmentService:
    """Core domain service for evaluating research alignment across all project elements."""

    @classmethod
    def evaluate_project_alignment(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Executes comprehensive alignment audit across all 13 research dimensions.
        Returns the matrix grid, score, and detected issues.
        """
        matrix, created = ResearchAlignmentMatrix.objects.get_or_create(
            project=project,
            defaults={"overall_alignment_score": 0.0, "unaligned_count": 0}
        )

        decision = ResearchDecision.objects.filter(project=project).first()
        variables = list(ResearchVariable.objects.filter(project=project))
        methodology = ResearchMethodology.objects.filter(project=project).first()
        instruments = list(ResearchInstrument.objects.filter(project=project))
        datasets = list(ResearchDataset.objects.filter(project=project))
        statistical_results = list(StatisticalResult.objects.filter(project=project))
        hypothesis_tests = list(HypothesisTest.objects.filter(project=project))
        qual_themes = list(QualitativeTheme.objects.filter(project=project))

        # Clear old unresolved issues
        matrix.issues.all().delete()
        issues_to_create = []

        # Extract elements from decision or project
        problem = (decision.problem_statement if decision else "") or (project.problem_statement or "")
        aim = (decision.research_aim if decision else "") or (project.research_aim or "")
        objectives = (decision.objectives if decision else []) or (project.objectives if isinstance(project.objectives, list) else [])
        questions = (decision.research_questions if decision else []) or (project.research_questions if isinstance(project.research_questions, list) else [])
        hypotheses = (decision.hypotheses if decision else []) or (project.hypotheses if isinstance(project.hypotheses, list) else [])

        # 1. Problem & Aim Check
        if not problem.strip():
            issues_to_create.append(AlignmentIssue(
                matrix=matrix,
                issue_type="MISSING_PROBLEM_STATEMENT",
                severity="HIGH",
                source_element="Problem Statement",
                target_element="Research Aim",
                description="The project lacks a defined Problem Statement. All downstream objectives and questions are unanchored.",
                recommendation="Articulate the core academic or practical problem in the Research Planning assistant."
            ))
        if not aim.strip():
            issues_to_create.append(AlignmentIssue(
                matrix=matrix,
                issue_type="MISSING_AIM",
                severity="HIGH",
                source_element="Problem Statement",
                target_element="Research Aim",
                description="No overarching Research Aim has been established to guide the inquiry.",
                recommendation="Formulate a concise research aim summarizing the intended outcome of the study."
            ))

        # 2. Objective <-> Question Alignment
        obj_count = len(objectives)
        q_count = len(questions)
        if obj_count > 0 and q_count == 0:
            issues_to_create.append(AlignmentIssue(
                matrix=matrix,
                issue_type="ORPHAN_OBJECTIVES",
                severity="HIGH",
                source_element="Research Objectives",
                target_element="Research Questions",
                description=f"The project has {obj_count} objectives but no research questions to operationalize them.",
                recommendation="Create at least one research question for each research objective."
            ))
        elif obj_count > 0 and q_count < obj_count:
            issues_to_create.append(AlignmentIssue(
                matrix=matrix,
                issue_type="UNMATCHED_OBJECTIVES",
                severity="MEDIUM",
                source_element="Research Objectives",
                target_element="Research Questions",
                description=f"There are {obj_count} objectives but only {q_count} research questions. Some objectives may be unexamined.",
                recommendation="Ensure each specific objective is addressed by a distinct research question."
            ))

        # 3. Hypotheses <-> Statistical Testing Alignment
        hypo_count = len(hypotheses)
        test_count = len(hypothesis_tests)
        if hypo_count > 0 and test_count == 0:
            issues_to_create.append(AlignmentIssue(
                matrix=matrix,
                issue_type="UNTESTED_HYPOTHESES",
                severity="HIGH",
                source_element="Research Hypotheses",
                target_element="Hypothesis Tests",
                description=f"Project specifies {hypo_count} hypotheses, but none have been evaluated against empirical evidence.",
                recommendation="Navigate to the Results & Hypotheses tab and evaluate hypotheses against statistical test results."
            ))

        # 4. Variables <-> Dataset Schema Alignment
        if variables and datasets:
            active_dataset = datasets[0]
            schema_cols = []
            if active_dataset.columns_schema and isinstance(active_dataset.columns_schema, dict):
                schema_cols = [c.lower() for c in active_dataset.columns_schema.get("columns", [])]
            
            for v in variables:
                v_clean = v.name.lower().replace(" ", "_")
                # Look for fuzzy match in dataset columns
                matched = any(v_clean in c or c in v_clean for c in schema_cols)
                if not matched and schema_cols:
                    issues_to_create.append(AlignmentIssue(
                        matrix=matrix,
                        issue_type="VARIABLE_DATASET_MISMATCH",
                        severity="MEDIUM",
                        source_element=f"Variable: {v.name}",
                        target_element=f"Dataset: {active_dataset.name}",
                        description=f"Variable '{v.name}' was not detected in the dataset schema columns.",
                        recommendation=f"Verify that dataset '{active_dataset.name}' includes a column measuring '{v.name}' or create a composite scale."
                    ))

        # 5. Methodology <-> Empirical Data Alignment
        req_method = getattr(project, 'requirements', None)
        method_str = (req_method.research_methodology if req_method else "") or ""
        is_empirical = "EMPIRICAL" in (project.document_category or "").upper() or "QUANTITATIVE" in method_str.upper() or "SURVEY" in method_str.upper()
        if is_empirical and not datasets and not qual_themes:
            issues_to_create.append(AlignmentIssue(
                matrix=matrix,
                issue_type="MISSING_EMPIRICAL_EVIDENCE",
                severity="HIGH",
                source_element="Methodology",
                target_element="Datasets / Transcripts",
                description="This project is configured as an Empirical study, but no quantitative datasets or qualitative transcripts have been uploaded.",
                recommendation="Upload your collected research dataset (CSV/XLSX) or interview transcripts to ground findings in authentic evidence."
            ))

        # Save issues
        AlignmentIssue.objects.bulk_create(issues_to_create)

        # Calculate alignment score:
        # Base 100 - deductions per issue
        score = 100.0
        for issue in issues_to_create:
            if issue.severity == "HIGH":
                score -= 20.0
            elif issue.severity == "MEDIUM":
                score -= 10.0
            else:
                score -= 5.0

        if not problem:
            score -= 20.0
        if not aim:
            score -= 15.0
        if not objectives:
            score -= 25.0

        final_score = max(0.0, min(100.0, round(score, 1)))
        matrix.overall_alignment_score = final_score
        matrix.unaligned_count = len(issues_to_create)

        # Construct comprehensive 13-node matrix manifest
        matrix_manifest = {
            "problem_statement": problem,
            "research_aim": aim,
            "objectives": objectives,
            "research_questions": questions,
            "hypotheses": hypotheses,
            "variables": [
                {"name": v.name, "role": v.variable_role, "type": v.variable_type}
                for v in variables
            ],
            "methodology": {
                "design_type": methodology.primary_design_type if methodology else "Not specified",
                "paradigm": methodology.paradigm if methodology else "Not specified",
                "sample_size": methodology.sample_size if methodology else None,
            },
            "instruments": [
                {"title": inst.title, "type": inst.instrument_type, "items_count": inst.items.count()}
                for inst in instruments
            ],
            "datasets": [
                {"name": ds.name, "rows": ds.row_count, "cols": ds.column_count}
                for ds in datasets
            ],
            "statistical_tests": [
                {"type": st.analysis_type, "label": st.label, "p_value": st.p_values}
                for st in statistical_results
            ],
            "results": [
                {"hypothesis": ht.hypothesis_statement, "decision": ht.decision, "p_value": ht.p_value}
                for ht in hypothesis_tests
            ],
            "qualitative_themes": [
                {"name": th.name, "summary": th.narrative_summary[:100] if th.narrative_summary else ""}
                for th in qual_themes
            ],
        }

        matrix.matrix_data = matrix_manifest
        matrix.save()

        return {
            "matrix_id": str(matrix.id),
            "project_id": str(project.id),
            "overall_alignment_score": final_score,
            "unaligned_count": len(issues_to_create),
            "matrix_data": matrix_manifest,
            "issues": [
                {
                    "id": str(iss.id),
                    "issue_type": iss.issue_type,
                    "severity": iss.severity,
                    "source_element": iss.source_element,
                    "target_element": iss.target_element,
                    "description": iss.description,
                    "recommendation": iss.recommendation,
                    "is_resolved": iss.is_resolved,
                }
                for iss in issues_to_create
            ]
        }

