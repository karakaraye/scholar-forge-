"""
Research Workflow Engine for ScholarForge AI.

Manages the 12-stage integrated academic research lifecycle dynamically tailored to
document category, academic discipline, and methodology.
Calculates deterministic real-data progress directly from stored research entities.
"""

from typing import Dict, List, Any, Optional
from django.utils import timezone
from projects.models import ResearchProject
from research.models import (
    ResearchWorkflow,
    WorkflowStep,
    ResearchDecision,
    ResearchMethodology,
    ResearchInstrument,
    ResearchDataset,
    StatisticalResult,
    HypothesisTest,
    QualitativeTranscript,
    ProjectSource,
    ManuscriptAssembly,
    ManuscriptValidation,
    ReviewRecord,
)

# 12 Universal Research Lifecycle Stages
STAGE_DEFINITIONS = [
    {
        "stage_id": "SETUP",
        "title": "Research Setup",
        "description": "Establish core research metadata, academic level, discipline, and institutional citation standard.",
        "order": 1,
        "action_url": "/dashboard",
    },
    {
        "stage_id": "PLANNING",
        "title": "Research Planning",
        "description": "Formulate problem statement, research aim, structured objectives, research questions, and hypotheses.",
        "order": 2,
        "action_url": "/research/{id}?tab=planning",
    },
    {
        "stage_id": "LITERATURE",
        "title": "Literature Discovery",
        "description": "Discover authentic academic publications via OpenAlex/Crossref, verify DOIs, and build curated collections.",
        "order": 3,
        "action_url": "/library",
    },
    {
        "stage_id": "FRAMEWORK",
        "title": "Research Framework Development",
        "description": "Synthesize empirical matrices, theoretical frameworks, conceptual models, or PRISMA protocols.",
        "order": 4,
        "action_url": "/research/{id}?tab=literature",
    },
    {
        "stage_id": "METHODOLOGY",
        "title": "Methodology Development",
        "description": "Select discipline-aware research design, research paradigm, and calculate statistically justified sample sizes.",
        "order": 5,
        "action_url": "/research/{id}?tab=methodology",
    },
    {
        "stage_id": "INSTRUMENTS",
        "title": "Research Instrument Preparation",
        "description": "Design structured questionnaires or interview guides aligned to research variables and export to Word (.docx).",
        "order": 6,
        "action_url": "/research/{id}?tab=instruments",
    },
    {
        "stage_id": "WRITING",
        "title": "Manuscript Writing",
        "description": "Draft chapters and sections using the academic editor, navigate outline, and cite verified sources in APA/IEEE.",
        "order": 7,
        "action_url": "/research/{id}?tab=editor",
    },
    {
        "stage_id": "ANALYSIS",
        "title": "Data Collection and Analysis",
        "description": "Upload real datasets with formula injection protection, run descriptive/inferential statistical tests or code transcripts.",
        "order": 8,
        "action_url": "/research/{id}?tab=datasets",
    },
    {
        "stage_id": "RESULTS",
        "title": "Results and Discussion",
        "description": "Evaluate empirical hypotheses, examine publication tables, and interpret findings with non-causal integrity guard.",
        "order": 9,
        "action_url": "/research/{id}?tab=results",
    },
    {
        "stage_id": "VALIDATION",
        "title": "Manuscript Validation",
        "description": "Perform comprehensive academic document check across structural, consistency, citation, and evidence validity categories.",
        "order": 10,
        "action_url": "/research/{id}?tab=validation",
    },
    {
        "stage_id": "REVIEW",
        "title": "Review Preparation",
        "description": "Audit citation integrity, verify alignment matrix, generate checklist, and update internal review status.",
        "order": 11,
        "action_url": "/research/{id}?tab=review",
    },
    {
        "stage_id": "COMPLETED",
        "title": "Completed Draft",
        "description": "Compile full manuscript assembly with preliminary pages, TOC, figures, tables, bibliography, and appendices.",
        "order": 12,
        "action_url": "/research/{id}?tab=assembly",
    },
]


class WorkflowService:
    """Core domain service for orchestrating research workflows and computing progress."""

    @classmethod
    def initialize_workflow(cls, project: ResearchProject) -> ResearchWorkflow:
        """Alias for get_or_create_workflow."""
        return cls.get_or_create_workflow(project)

    @classmethod
    def get_or_create_workflow(cls, project: ResearchProject) -> ResearchWorkflow:
        """Retrieves or initializes the dynamic workflow for a research project."""
        workflow, created = ResearchWorkflow.objects.get_or_create(
            project=project,
            defaults={
                "document_category": project.document_category or "Empirical Research",
                "overall_progress_percentage": 0.0,
                "current_stage": "Research Setup",
            }
        )

        # Initialize steps if newly created or steps are empty
        if created or workflow.steps.count() == 0:
            cls._initialize_workflow_steps(workflow, project)

        return workflow

    @classmethod
    def _initialize_workflow_steps(cls, workflow: ResearchWorkflow, project: ResearchProject):
        """Generates adapted workflow steps based on document category."""
        category = (project.document_category or "").upper()
        
        # Check if project category skips empirical instruments / quantitative analysis
        is_conceptual = "CONCEPTUAL" in category or "THEORETICAL" in category
        is_legal = "LEGAL" in category or "LAW" in category or (project.discipline and "LAW" in project.discipline.name.upper())
        is_systematic_review = "SYSTEMATIC" in category or "REVIEW" in category

        steps_to_create = []
        for defn in STAGE_DEFINITIONS:
            stage_id = defn["stage_id"]
            is_mandatory = True
            description = defn["description"]

            # Discipline & Category Adaptations
            if is_conceptual and stage_id in ("INSTRUMENTS", "ANALYSIS"):
                is_mandatory = False
                description = "Conceptual/Theoretical analysis: Focus on thematic propositions and construct synthesis rather than empirical data collection."
            elif is_legal and stage_id in ("INSTRUMENTS", "ANALYSIS"):
                is_mandatory = False
                description = "Doctrinal Legal Research: Focus on statutory interpretation, case law analysis, and jurisprudence rather than empirical instruments."
            elif is_systematic_review and stage_id == "INSTRUMENTS":
                is_mandatory = True
                description = "Data Extraction Protocol: Design PRISMA data extraction forms and inclusion/exclusion criteria checklists."

            url = defn["action_url"].replace("{id}", str(project.id))
            step = WorkflowStep(
                workflow=workflow,
                stage_id=stage_id,
                title=defn["title"],
                description=description,
                order=defn["order"],
                status="NOT_STARTED",
                is_mandatory=is_mandatory,
                progress_percentage=0.0,
                action_url=url,
            )
            steps_to_create.append(step)

        WorkflowStep.objects.bulk_create(steps_to_create)

    @classmethod
    def calculate_project_progress(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Calculates deterministic, verifiable progress across all 12 stages
        based strictly on persisted database entities.
        """
        workflow = cls.get_or_create_workflow(project)
        steps = list(workflow.steps.all().order_by("order"))

        # 1. SETUP: Evaluated by project properties
        setup_progress = 100.0 if (project.title and project.document_category and project.discipline) else 50.0

        # 2. PLANNING: Evaluated by ResearchDecision
        decision = ResearchDecision.objects.filter(project=project).first()
        if decision and decision.is_approved:
            planning_progress = 100.0
        elif decision and (decision.problem_statement or decision.research_aim or decision.objectives):
            planning_progress = 60.0
        elif project.objectives or project.research_questions:
            planning_progress = 40.0
        else:
            planning_progress = 0.0

        # 3. LITERATURE: Evaluated by ProjectSource count and verification
        sources_count = ProjectSource.objects.filter(project=project).count()
        if sources_count >= 5:
            literature_progress = 100.0
        elif sources_count > 0:
            literature_progress = min(100.0, sources_count * 20.0)
        else:
            literature_progress = 0.0

        # 4. FRAMEWORK: Evaluated by document sections related to literature/framework
        doc = project.documents.first()
        has_framework = False
        if doc:
            for s in doc.sections.all():
                title_lower = s.title.lower()
                if any(k in title_lower for k in ("framework", "literature", "theoretical", "conceptual")):
                    if s.word_count and s.word_count > 100:
                        has_framework = True
                        break
        framework_progress = 100.0 if has_framework else (40.0 if sources_count > 0 else 0.0)

        # 5. METHODOLOGY: Evaluated by ResearchMethodology
        methodology = ResearchMethodology.objects.filter(project=project).first()
        if methodology and methodology.approved_by_researcher:
            methodology_progress = 100.0
        elif methodology:
            methodology_progress = 70.0
        else:
            methodology_progress = 0.0

        # 6. INSTRUMENTS: Evaluated by ResearchInstrument
        instruments_count = ResearchInstrument.objects.filter(project=project).count()
        if instruments_count > 0:
            instruments_progress = 100.0
        else:
            instruments_progress = 0.0

        # 7. WRITING: Evaluated by total document word count vs target
        total_words = 0
        if doc:
            total_words = sum(s.word_count or 0 for s in doc.sections.all())
        target_words = project.target_word_count or 10000
        writing_progress = min(100.0, round((total_words / max(target_words, 1)) * 100.0, 1))

        # 8. ANALYSIS: Evaluated by ResearchDataset, AnalysisJob, or QualitativeTranscript
        has_datasets = ResearchDataset.objects.filter(project=project).exists()
        has_transcripts = QualitativeTranscript.objects.filter(project=project).exists()
        has_stats = StatisticalResult.objects.filter(project=project).exists()
        if has_stats or has_transcripts:
            analysis_progress = 100.0
        elif has_datasets:
            analysis_progress = 50.0
        else:
            analysis_progress = 0.0

        # 9. RESULTS: Evaluated by HypothesisTest and Results section writing
        has_hypo = HypothesisTest.objects.filter(project=project).exists()
        results_progress = 100.0 if has_hypo else (50.0 if has_stats else 0.0)

        # 10. VALIDATION: Evaluated by ManuscriptValidation audit
        validation = ManuscriptValidation.objects.filter(project=project).order_by("-created_at").first()
        validation_progress = validation.readiness_score if validation else 0.0

        # 11. REVIEW: Evaluated by ReviewRecord
        review = ReviewRecord.objects.filter(project=project).order_by("-created_at").first()
        if review and review.status == "APPROVED_DRAFT":
            review_progress = 100.0
        elif review and review.status in ("READY_FOR_INTERNAL_REVIEW", "REVISIONS_REQUIRED"):
            review_progress = 60.0
        else:
            review_progress = 0.0

        # 12. COMPLETED: Evaluated by ManuscriptAssembly
        assembly = ManuscriptAssembly.objects.filter(project=project).order_by("-created_at").first()
        completed_progress = 100.0 if assembly else 0.0

        progress_map = {
            "SETUP": setup_progress,
            "PLANNING": planning_progress,
            "LITERATURE": literature_progress,
            "FRAMEWORK": framework_progress,
            "METHODOLOGY": methodology_progress,
            "INSTRUMENTS": instruments_progress,
            "WRITING": writing_progress,
            "ANALYSIS": analysis_progress,
            "RESULTS": results_progress,
            "VALIDATION": validation_progress,
            "REVIEW": review_progress,
            "COMPLETED": completed_progress,
        }

        # Update step records
        mandatory_weights = []
        current_active_stage = "Research Setup"
        all_completed = True

        for step in steps:
            p = progress_map.get(step.stage_id, 0.0)
            step.progress_percentage = round(p, 1)

            if p >= 100.0:
                step.status = "COMPLETED"
                if not step.completed_at:
                    step.completed_at = timezone.now()
            elif p > 0.0:
                step.status = "IN_PROGRESS"
                all_completed = False
            else:
                step.status = "NOT_STARTED"
                all_completed = False

            step.save(update_fields=["progress_percentage", "status", "completed_at"])

            if step.is_mandatory:
                mandatory_weights.append(p)
                if p < 100.0 and current_active_stage == "Research Setup" and step.order > 1:
                    current_active_stage = step.title

        overall_progress = round(sum(mandatory_weights) / max(len(mandatory_weights), 1), 1)
        workflow.overall_progress_percentage = overall_progress
        workflow.current_stage = "Completed Draft" if overall_progress >= 100.0 else current_active_stage
        workflow.is_completed = all_completed and (overall_progress >= 95.0)
        workflow.save(update_fields=["overall_progress_percentage", "current_stage", "is_completed", "updated_at"])

        step_list = [
            {
                "id": str(s.id),
                "stage_id": s.stage_id,
                "stage_key": s.stage_id,
                "title": s.title,
                "description": s.description,
                "order": s.order,
                "status": s.status,
                "is_mandatory": s.is_mandatory,
                "progress_percentage": s.progress_percentage,
                "action_url": s.action_url,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in steps
        ]

        return {
            "workflow_id": str(workflow.id),
            "project_id": str(project.id),
            "document_category": workflow.document_category,
            "overall_progress_percentage": overall_progress,
            "current_stage": workflow.current_stage,
            "is_completed": workflow.is_completed,
            "steps": step_list,
            "stages": step_list,
        }

