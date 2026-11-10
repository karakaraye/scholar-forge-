"""
Academic Quality Assurance Engine (Document Checker) for ScholarForge AI.

Audits manuscripts across 6 academic readiness categories:
A. Structural Quality
B. Research Consistency
C. Citation Integrity
D. Evidence Validity
E. Writing Quality
F. Manuscript Completeness

Computes overall readiness index with explicit academic disclaimer.
"""

from typing import Dict, List, Any, Optional
import re
from django.utils import timezone
from projects.models import ResearchProject
from research.models import (
    ManuscriptValidation,
    ValidationIssue,
    ResearchSource,
    ProjectSource,
    ResearchDataset,
    StatisticalResult,
    HypothesisTest,
)


class QualityAssuranceService:
    """Core domain service for auditing academic manuscript readiness."""

    DISCLAIMER_TEXT = (
        "Academic Quality Assurance check for scholarly standards. ScholarForge AI provides "
        "formative evaluation and does not guarantee journal publication or institutional grading acceptance."
    )

    @classmethod
    def run_academic_quality_audit(cls, project: ResearchProject, user: Any = None):
        report = cls.audit_manuscript(project)
        return ManuscriptValidation.objects.get(id=report['validation_id'])

    @classmethod
    def audit_manuscript(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Runs comprehensive 6-category audit across project documents, citations, and data provenance.
        """
        validation = ManuscriptValidation.objects.create(
            project=project,
            disclaimer=cls.DISCLAIMER_TEXT,
        )

        doc = project.documents.first()
        sections = list(doc.sections.all().order_by("order_index")) if doc else []
        issues_to_create = []

        # --- Category A: Structural Quality ---
        cat_a_issues = []
        section_titles = [s.title.lower() for s in sections]
        standard_chapters = [
            ("Introduction", ["introduction", "background", "chapter 1"]),
            ("Literature Review", ["literature", "theoretical framework", "chapter 2"]),
            ("Methodology", ["methodology", "methods", "research design", "chapter 3"]),
            ("Results / Findings", ["results", "findings", "analysis", "chapter 4"]),
            ("Discussion / Conclusion", ["discussion", "conclusion", "summary", "chapter 5"]),
        ]

        for expected_name, aliases in standard_chapters:
            found = any(any(a in st for a in aliases) for st in section_titles)
            if not found:
                cat_a_issues.append(ValidationIssue(
                    validation=validation,
                    category="STRUCTURAL_QUALITY",
                    severity="WARNING",
                    section_name=expected_name,
                    message=f"Standard academic chapter '{expected_name}' was not detected in manuscript structure.",
                    academic_suggestion=f"Ensure your manuscript includes a dedicated section for {expected_name} adhering to institutional guidelines."
                ))

        # Check section word count imbalances
        word_counts = [s.word_count or 0 for s in sections]
        if len(word_counts) >= 3 and max(word_counts) > 0:
            avg_words = sum(word_counts) / len(word_counts)
            for s in sections:
                if (s.word_count or 0) < 50 and not s.parent_section:
                    cat_a_issues.append(ValidationIssue(
                        validation=validation,
                        category="STRUCTURAL_QUALITY",
                        severity="INFO",
                        section_name=s.title,
                        message=f"Root section '{s.title}' is unusually short ({s.word_count or 0} words).",
                        academic_suggestion="Elaborate further on this chapter to provide sufficient academic depth."
                    ))

        # --- Category B: Research Consistency ---
        cat_b_issues = []
        all_text = " ".join([
            (s.content_json.get("text", "") if isinstance(s.content_json, dict) else "")
            for s in sections
        ]).lower()

        # Check if research aim or problem statement is mentioned in introduction
        if project.problem_statement:
            keywords = [w for w in project.problem_statement.lower().split() if len(w) > 5][:5]
            if keywords and not any(k in all_text for k in keywords):
                cat_b_issues.append(ValidationIssue(
                    validation=validation,
                    category="RESEARCH_CONSISTENCY",
                    severity="WARNING",
                    section_name="Introduction",
                    message="Core problem statement concepts appear missing from manuscript prose.",
                    academic_suggestion="Explicitly state the research problem in the introductory chapter."
                ))

        # Check if hypotheses have results
        hypotheses = project.hypotheses if isinstance(project.hypotheses, list) else []
        hypo_tests = list(HypothesisTest.objects.filter(project=project))
        if hypotheses and not hypo_tests:
            cat_b_issues.append(ValidationIssue(
                validation=validation,
                category="RESEARCH_CONSISTENCY",
                severity="WARNING",
                section_name="Results",
                message=f"Project specifies {len(hypotheses)} hypotheses but none have been evaluated against statistical results.",
                academic_suggestion="Connect empirical findings to your formulated hypotheses in Chapter 4."
            ))

        # --- Category C: Citation Integrity ---
        cat_c_issues = []
        project_sources = list(ProjectSource.objects.filter(project=project).select_related("source"))
        cited_dois = set()
        for ps in project_sources:
            if ps.source.retracted:
                cat_c_issues.append(ValidationIssue(
                    validation=validation,
                    category="CITATION_INTEGRITY",
                    severity="ERROR",
                    section_name="References",
                    message=f"Retracted publication cited: '{ps.source.title}' (DOI: {ps.source.doi}).",
                    academic_suggestion="Immediately replace or contextualize this retracted source to maintain scholarly integrity."
                ))
            if ps.source.doi:
                cited_dois.add(ps.source.doi.lower())

        if not project_sources and len(all_text) > 500:
            cat_c_issues.append(ValidationIssue(
                validation=validation,
                category="CITATION_INTEGRITY",
                severity="ERROR",
                section_name="References",
                message="No verified academic sources are attached to this research project.",
                academic_suggestion="Search and attach verified literature via the Scholarly Discovery engine."
            ))

        # --- Category D: Evidence Validity ---
        cat_d_issues = []
        is_empirical = "EMPIRICAL" in (project.document_category or "").upper()
        datasets = list(ResearchDataset.objects.filter(project=project))
        stat_results = list(StatisticalResult.objects.filter(project=project))

        if is_empirical:
            if not datasets:
                cat_d_issues.append(ValidationIssue(
                    validation=validation,
                    category="EVIDENCE_VALIDITY",
                    severity="ERROR",
                    section_name="Methodology / Results",
                    message="Empirical study lacks an uploaded research dataset.",
                    academic_suggestion="Upload your raw or processed dataset (CSV/XLSX) to substantiate statistical claims."
                ))
            elif datasets and datasets[0].row_count < 10:
                cat_d_issues.append(ValidationIssue(
                    validation=validation,
                    category="EVIDENCE_VALIDITY",
                    severity="WARNING",
                    section_name="Sampling",
                    message=f"Dataset sample size (N={datasets[0].row_count}) is extremely small for inferential conclusions.",
                    academic_suggestion="Document this limitation explicitly or collect additional observations."
                ))

        # --- Category E: Writing Quality ---
        cat_e_issues = []
        unhedged_phrases = ["this proves that", "obviously", "without a doubt", "indisputably", "it is clear that"]
        for phrase in unhedged_phrases:
            if phrase in all_text:
                cat_e_issues.append(ValidationIssue(
                    validation=validation,
                    category="WRITING_QUALITY",
                    severity="INFO",
                    section_name="Manuscript Text",
                    message=f"Unhedged or absolute phrasing detected: '{phrase}'.",
                    academic_suggestion="Use academic hedging (e.g., 'The empirical findings suggest that...', 'Evidence indicates...')."
                ))
                break

        # --- Category F: Manuscript Completeness ---
        cat_f_issues = []
        total_words = sum(s.word_count or 0 for s in sections)
        target_words = project.target_word_count or 10000

        if total_words < (target_words * 0.2):
            cat_f_issues.append(ValidationIssue(
                validation=validation,
                category="MANUSCRIPT_COMPLETENESS",
                severity="WARNING",
                section_name="Manuscript",
                message=f"Current word count ({total_words}) is well below the target ({target_words} words).",
                academic_suggestion="Continue developing manuscript sections toward institutional requirements."
            ))

        # Combine all issues
        all_issues = cat_a_issues + cat_b_issues + cat_c_issues + cat_d_issues + cat_e_issues + cat_f_issues
        ValidationIssue.objects.bulk_create(all_issues)

        # Calculate scores per category
        def calc_cat_score(issues_list):
            base = 100.0
            for iss in issues_list:
                if iss.severity == "ERROR":
                    base -= 30.0
                elif iss.severity == "WARNING":
                    base -= 15.0
                else:
                    base -= 5.0
            return max(0.0, min(100.0, round(base, 1)))

        cat_scores = {
            "STRUCTURAL_QUALITY": calc_cat_score(cat_a_issues),
            "RESEARCH_CONSISTENCY": calc_cat_score(cat_b_issues),
            "CITATION_INTEGRITY": calc_cat_score(cat_c_issues),
            "EVIDENCE_VALIDITY": calc_cat_score(cat_d_issues),
            "WRITING_QUALITY": calc_cat_score(cat_e_issues),
            "MANUSCRIPT_COMPLETENESS": calc_cat_score(cat_f_issues),
        }

        # Overall readiness score = weighted average
        weights = [0.20, 0.20, 0.25, 0.20, 0.05, 0.10]
        readiness = sum(list(cat_scores.values())[i] * weights[i] for i in range(6))
        readiness_score = max(0.0, min(100.0, round(readiness, 1)))

        error_cnt = sum(1 for iss in all_issues if iss.severity == "ERROR")
        warning_cnt = sum(1 for iss in all_issues if iss.severity == "WARNING")
        info_cnt = sum(1 for iss in all_issues if iss.severity == "INFO")

        validation.total_issues_count = len(all_issues)
        validation.error_count = error_cnt
        validation.warning_count = warning_cnt
        validation.info_count = info_cnt
        validation.category_scores = cat_scores
        validation.readiness_score = readiness_score
        validation.save()

        return {
            "validation_id": str(validation.id),
            "project_id": str(project.id),
            "readiness_score": readiness_score,
            "category_scores": cat_scores,
            "total_issues_count": len(all_issues),
            "error_count": error_cnt,
            "warning_count": warning_cnt,
            "info_count": info_cnt,
            "disclaimer": cls.DISCLAIMER_TEXT,
            "created_at": validation.created_at.isoformat(),
            "issues": [
                {
                    "id": str(iss.id),
                    "category": iss.category,
                    "severity": iss.severity,
                    "section_name": iss.section_name,
                    "message": iss.message,
                    "academic_suggestion": iss.academic_suggestion,
                    "is_resolved": iss.is_resolved,
                }
                for iss in all_issues
            ]
        }

