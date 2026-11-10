"""
Stage 5 Test Suite for ScholarForge AI:
End-to-End Academic Research Workflow, Structured Planning Assistant,
Manuscript Assembly Engine, 13-Node Research Alignment Matrix,
Academic Document Quality Assurance (6 Categories),
AI Academic Review Assistant (10 Tasks & Refusal Guard),
Data Provenance & Traceability, and Formal Review Checkpoints.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone

from workspaces.models import Workspace, WorkspaceMembership, WorkspaceRole
from disciplines.models import AcademicDiscipline
from projects.models import ResearchProject, ResearchRequirements
from documents.models import ResearchDocument, DocumentSection
from research.models import (
    ResearchWorkflow,
    WorkflowStep,
    ResearchDecision,
    ResearchAlignmentMatrix,
    AlignmentIssue,
    ManuscriptAssembly,
    ManuscriptValidation,
    ValidationIssue,
    ReviewRecord,
    ResearchSource,
    ProjectSource,
    Citation,
    ResearchDataset,
    StatisticalResult,
    HypothesisTest,
    AnalysisJob,
    ResearchVariable
)
from research.workflow_service import WorkflowService
from research.planning_service import PlanningService
from research.alignment_service import AlignmentService
from research.assembly_service import AssemblyService
from research.quality_assurance_service import QualityAssuranceService
from research.review_service import ReviewService
from research.provenance_service import ProvenanceService

User = get_user_model()


@pytest.fixture
def stage5_setup(db):
    user = User.objects.create_user(
        email="stage5_lead@scholarforge.ai",
        password="ValidPassword123!",
        first_name="Marcus",
        last_name="Vance"
    )
    workspace = Workspace.objects.create(name="Stage 5 Institute", slug="stage5-institute", owner=user)
    WorkspaceMembership.objects.create(workspace=workspace, user=user, role=WorkspaceRole.OWNER)
    discipline = AcademicDiscipline.objects.create(name="Economics & Finance", slug="economics-finance-s5", category="Social Sciences")

    project = ResearchProject.objects.create(
        workspace=workspace,
        owner=user,
        title="Macroeconomic Shocks and Digital Financial Inclusivity in Developing Markets",
        discipline=discipline,
        academic_level="PHD",
        document_category="ACADEMIC_PROJECT",
        document_subtype="PhD Dissertation",
        citation_style="APA",
        status="ACTIVE"
    )

    requirements = ResearchRequirements.objects.create(
        project=project,
        target_word_count=50000,
        supervisor_requirements="Prof. Eleanor Thorne guidelines for macroeconomic empirics.",
        research_methodology="Quantitative Survey Design and Instrumental Variable Estimation",
        research_objectives=(
            "1. Quantify the elasticity of mobile money uptake with respect to foreign exchange volatility.\n"
            "2. Determine the moderating impact of financial literacy on transaction volume during inflation shocks."
        ),
        custom_parameters={
            "institution_name": "Global Institute of Development Economics",
            "problem_statement": "Developing economies experience disproportionate digital financial exclusion during acute macroeconomic shocks.",
            "research_aim": "To empirically quantify the impact of currency volatility and inflation spikes on digital banking adoption across rural micro-enterprises.",
            "research_questions": (
                "1. How does foreign exchange volatility affect micro-enterprise mobile money uptake?\n"
                "2. What is the moderating effect of local financial literacy on digital wallet transaction volume during inflationary crises?"
            ),
            "research_hypotheses": (
                "H1: Higher exchange rate volatility reduces digital banking adoption among rural micro-enterprises.\n"
                "H2: Financial literacy significantly moderates the relationship between inflation shocks and wallet retention."
            )
        }
    )

    doc = ResearchDocument.objects.create(
        project=project,
        title="Dissertation Manuscript",
        document_type="DISSERTATION"
    )

    sec1 = DocumentSection.objects.create(
        document=doc,
        title="Chapter 1: Introduction",
        section_type="CHAPTER",
        order_index=1,
        content=(
            "This introductory chapter outlines the research background, problem statement, and primary objectives of the macroeconomic analysis. "
            "Developing economies experience disproportionate digital financial exclusion during acute macroeconomic shocks. "
            "The overarching aim of this inquiry is to empirically quantify the elasticity of mobile money uptake with respect to foreign exchange volatility "
            "and examine how digital banking infrastructure buffers rural micro-enterprises against severe inflationary crises across emerging economies."
        )
    )

    sec2 = DocumentSection.objects.create(
        document=doc,
        title="Chapter 2: Literature Review",
        section_type="CHAPTER",
        order_index=2,
        content=(
            "Extensive literature exists detailing digital payment transformations across Sub-Saharan Africa, Latin America, and South Asia. "
            "Prior scholarly inquiries have demonstrated that mobile money wallets significantly reduce household transaction costs and smooth consumption "
            "during systemic climate or market shocks. However, limited empirical evidence examines how sudden currency devaluations alter adoption thresholds "
            "for rural micro-merchants who rely heavily on imported inventory and cross-border remittances."
        )
    )

    sec3 = DocumentSection.objects.create(
        document=doc,
        title="Chapter 3: Methodology and Empirical Strategy",
        section_type="CHAPTER",
        order_index=3,
        content=(
            "This study employs an instrumental variable panel regression and difference-in-differences estimator to identify causal impacts of macroeconomic shocks. "
            "We exploit district-level variation in mobile network cellular tower coverage and high-frequency central bank foreign exchange rate spikes. "
            "Our primary specification isolates the exogenous component of currency volatility using global commodity price indices, controlling for regional "
            "infrastructure, baseline financial literacy scores, and commercial bank branch proximity."
        )
    )

    client = APIClient()
    client.force_authenticate(user=user)

    return {
        "user": user,
        "workspace": workspace,
        "discipline": discipline,
        "project": project,
        "document": doc,
        "sections": [sec1, sec2, sec3],
        "client": client
    }


# ============================================================================
# 1. COMPLETE RESEARCH WORKFLOW ENGINE TESTS
# ============================================================================

@pytest.mark.django_db
class TestResearchWorkflowEngine:

    def test_workflow_initialization_adaptive_stages(self, stage5_setup):
        """Workflow stages dynamically adapt to document category and methodology."""
        project = stage5_setup["project"]
        workflow = WorkflowService.initialize_workflow(project)

        assert workflow.project == project
        assert workflow.steps.count() == 12
        titles = list(workflow.steps.values_list("title", flat=True))
        assert "Research Setup" in titles
        assert "Research Planning" in titles
        assert "Literature Discovery" in titles
        assert "Methodology Development" in titles
        assert "Data Collection and Analysis" in titles
        assert "Completed Draft" in titles

    def test_calculate_project_progress_real_database_entities(self, stage5_setup):
        """Progress percentages reflect actual DB entities without fabrication."""
        project = stage5_setup["project"]
        progress_data = WorkflowService.calculate_project_progress(project)

        assert "overall_progress_percentage" in progress_data
        assert "current_stage" in progress_data
        assert "stages" in progress_data
        assert len(progress_data["stages"]) == 12

        setup_stage = next(s for s in progress_data["stages"] if s["stage_id"] == "SETUP")
        assert setup_stage["progress_percentage"] == 100.0
        assert setup_stage["status"] == "COMPLETED"

    def test_api_workflow_progress_and_step_update(self, stage5_setup):
        """API endpoints retrieve progress and allow manual step advancement."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        url = reverse("project-workflow", kwargs={"project_id": str(project.id)})
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["project_id"] == str(project.id)

        workflow = project.workflow
        planning_step = workflow.steps.get(stage_id="PLANNING")

        step_url = reverse("workflow-step-update", kwargs={"step_id": str(planning_step.id)})
        patch_res = client.patch(step_url, {
            "status": "IN_PROGRESS",
            "progress_percentage": 65.0
        }, format="json")
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data["status"] == "IN_PROGRESS"
        assert patch_res.data["progress_percentage"] == 65.0


# ============================================================================
# 2. STRUCTURED RESEARCH PLANNING ASSISTANT TESTS
# ============================================================================

@pytest.mark.django_db
class TestStructuredResearchPlanning:

    def test_create_and_approve_research_decision(self, stage5_setup):
        """Research planning decisions maintain audit trail and explicit approval gate."""
        project = stage5_setup["project"]
        user = stage5_setup["user"]

        decision = PlanningService.create_decision(
            project=project,
            user=user,
            decision_category="METHODOLOGY_SELECTION",
            title="Adoption of Instrumental Variable Fixed-Effects Model",
            rationale="Addresses endogeneity in currency exposure across cross-border digital remittances.",
            alternatives_considered="Ordinary Least Squares (rejected due to omitted variable bias); Difference-in-Differences alone.",
            impact_description="Requires panel dataset with at least 5 years of daily currency rates and monthly district-level transactions."
        )

        assert decision.status == "PENDING_REVIEW"
        assert decision.is_approved is False

        approved_decision = PlanningService.approve_decision(decision, user)
        assert approved_decision.is_approved is True
        assert approved_decision.status == "APPROVED"
        assert approved_decision.approved_by == user
        assert approved_decision.approved_at is not None

    def test_api_planning_decisions_crud_and_approval_gate(self, stage5_setup):
        """API allows retrieving planning decisions and explicitly approving them."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        plan_url = reverse("project-planning", kwargs={"project_id": str(project.id)})
        get_res = client.get(plan_url)
        assert get_res.status_code == status.HTTP_200_OK
        assert "is_approved" in get_res.data

        # Update planning decisions
        put_res = client.put(plan_url, {
            "problem_statement": "Developing markets face digital exclusion during macroeconomic currency devaluations.",
            "research_aim": "To determine the impact of exchange volatility on mobile wallet adoption.",
            "objectives": ["Measure elasticity of adoption", "Quantify literacy moderation"]
        }, format="json")
        assert put_res.status_code == status.HTTP_200_OK
        assert len(put_res.data["objectives"]) == 2

        # Formally approve through governance gate
        approve_url = reverse("project-planning-approve", kwargs={"project_id": str(project.id)})
        approve_res = client.post(approve_url)
        assert approve_res.status_code == status.HTTP_200_OK
        assert approve_res.data["is_approved"] is True


# ============================================================================
# 3. 13-NODE RESEARCH ALIGNMENT MATRIX TESTS
# ============================================================================

@pytest.mark.django_db
class TestResearchAlignmentMatrix:

    def test_matrix_detects_untested_hypotheses_and_missing_instruments(self, stage5_setup):
        """Alignment engine highlights untied objectives and untested hypotheses."""
        project = stage5_setup["project"]

        report = AlignmentService.evaluate_project_alignment(project)

        assert "overall_alignment_score" in report
        assert "matrix_data" in report
        assert "issues" in report
        assert len(report["issues"]) > 0

        issue_types = [i["issue_type"] for i in report["issues"]]
        assert any(t in issue_types for t in ["UNTESTED_HYPOTHESES", "ORPHAN_OBJECTIVES", "MISSING_EMPIRICAL_EVIDENCE"])

    def test_api_alignment_matrix_endpoint(self, stage5_setup):
        """API evaluates alignment matrix returning score, issues, and grid."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        url = reverse("project-alignment", kwargs={"project_id": str(project.id)})
        res = client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert "overall_alignment_score" in res.data
        assert "matrix_data" in res.data
        assert "issues" in res.data


# ============================================================================
# 4. MANUSCRIPT ASSEMBLY ENGINE TESTS
# ============================================================================

@pytest.mark.django_db
class TestManuscriptAssemblyEngine:

    def test_compile_manuscript_with_toc_and_bibliography(self, stage5_setup):
        """Assembles full academic manuscript with preliminary pages, TOC, and citations."""
        project = stage5_setup["project"]
        user = stage5_setup["user"]

        source = ResearchSource.objects.create(
            created_by=user,
            title="Digital Banking and Economic Resilience in Emerging Markets",
            authors=["Adebayo, Samuel", "Chen, Wei"],
            publication_year=2023,
            journal_or_publisher="Journal of Financial Economics",
            doi="10.1016/j.jfineco.2023.01.004",
            verification_status="VERIFIED"
        )
        ProjectSource.objects.create(project=project, source=source)

        assembly = AssemblyService.compile_manuscript(
            project=project,
            user=user,
            citation_style="APA",
            options={
                "include_preliminary_pages": True,
                "include_table_of_contents": True,
                "include_list_of_tables": True,
                "include_list_of_figures": True,
                "include_appendices": True
            }
        )

        assert assembly.status == "COMPLETED"
        assert assembly.total_word_count > 0
        html = assembly.assembled_html
        assert "Macroeconomic Shocks and Digital Financial Inclusivity" in html
        assert "Table of Contents" in html
        assert "Chapter 1: Introduction" in html
        assert "References" in html
        assert "Adebayo, Samuel" in html

    def test_api_manuscript_assembly_and_detail(self, stage5_setup):
        """API triggers manuscript compilation and retrieves assembled draft."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        compile_url = reverse("project-assemblies", kwargs={"project_id": str(project.id)})
        res = client.post(compile_url, {
            "citation_style": "APA",
            "include_preliminary_pages": True,
            "include_table_of_contents": True
        }, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert "id" in res.data
        assembly_id = res.data["id"]

        detail_url = reverse("assembly-detail", kwargs={"assembly_id": assembly_id})
        detail_res = client.get(detail_url)
        assert detail_res.status_code == status.HTTP_200_OK
        assert detail_res.data["id"] == assembly_id
        assert "compiled_html" in detail_res.data


# ============================================================================
# 5. ACADEMIC QUALITY ASSURANCE ENGINE TESTS
# ============================================================================

@pytest.mark.django_db
class TestAcademicQualityAssurance:

    def test_quality_audit_evaluates_all_six_categories(self, stage5_setup):
        """Validates structural quality, consistency, citations, evidence, writing, and completeness."""
        project = stage5_setup["project"]
        user = stage5_setup["user"]

        validation = QualityAssuranceService.run_academic_quality_audit(project=project, user=user)

        assert validation.overall_score >= 0.0
        assert validation.readiness_rating in ["NOT_READY", "NEEDS_REVISION", "SUBMISSION_READY", "EXEMPLARY"]
        assert len(validation.category_scores) == 6
        assert "STRUCTURAL_QUALITY" in validation.category_scores
        assert "RESEARCH_CONSISTENCY" in validation.category_scores
        assert "CITATION_INTEGRITY" in validation.category_scores
        assert "EVIDENCE_VALIDITY" in validation.category_scores
        assert "WRITING_QUALITY" in validation.category_scores
        assert "MANUSCRIPT_COMPLETENESS" in validation.category_scores

    def test_api_manuscript_validation_includes_disclaimer(self, stage5_setup):
        """API executes validation and explicitly surfaces institutional non-guarantee disclaimer."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        url = reverse("project-validation", kwargs={"project_id": str(project.id)})
        res = client.post(url)

        assert res.status_code == status.HTTP_200_OK
        assert "readiness_score" in res.data
        assert "disclaimer" in res.data
        assert "does not guarantee" in res.data["disclaimer"].lower()
        assert "category_scores" in res.data


# ============================================================================
# 6. AI ACADEMIC REVIEW ASSISTANT TESTS
# ============================================================================

@pytest.mark.django_db
class TestAIAcademicReviewAssistant:

    def test_review_tasks_structured_output_and_refusal_guard(self, stage5_setup):
        """Review tasks provide grounded academic feedback and refuse ungrounded requests."""
        project = stage5_setup["project"]
        user = stage5_setup["user"]
        workspace = stage5_setup["workspace"]
        discipline = stage5_setup["discipline"]

        # 1. Anti-hallucination Refusal Guard on unwritten manuscript (< 100 words)
        empty_project = ResearchProject.objects.create(
            workspace=workspace,
            owner=user,
            title="Unwritten Conceptual Framework",
            discipline=discipline,
            academic_level="PHD"
        )
        empty_doc = ResearchDocument.objects.create(project=empty_project, title="Empty Doc")
        DocumentSection.objects.create(document=empty_doc, title="Brief Intro", order_index=1, content="Short unwritten draft.")

        refusal_result = ReviewService.execute_review_task(
            project=empty_project,
            task_type="SUGGEST_ABSTRACT",
            user_prompt=""
        )
        assert refusal_result.get("refusal") is True
        assert "Refusal: Manuscript has insufficient written content" in refusal_result.get("message", "")

        # 2. Structured Abstract Suggestion on grounded manuscript
        abstract_result = ReviewService.execute_review_task(
            project=project,
            task_type="SUGGEST_ABSTRACT",
            user_prompt=""
        )
        assert abstract_result.get("task_type") == "SUGGEST_ABSTRACT"
        assert "abstract_structured" in abstract_result
        assert "background" in abstract_result["abstract_structured"]

        # 3. Review Checklist Generation
        checklist_result = ReviewService.execute_review_task(
            project=project,
            task_type="PREPARE_REVIEW_CHECKLIST"
        )
        assert checklist_result.get("task_type") == "PREPARE_REVIEW_CHECKLIST"
        assert len(checklist_result.get("checklist", [])) > 0

    def test_api_review_assistant_endpoint(self, stage5_setup):
        """API invokes AI review assistant for targeted manuscript checks."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        url = reverse("project-review-assistant", kwargs={"project_id": str(project.id)})
        res = client.post(url, {
            "task_type": "CHECK_RESEARCH_ALIGNMENT",
            "prompt": "Evaluate alignment across intro and literature review."
        }, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["task_type"] == "CHECK_RESEARCH_ALIGNMENT"
        assert "alignment_verdict" in res.data


# ============================================================================
# 7. DATA PROVENANCE & REVIEW RECORD TESTS
# ============================================================================

@pytest.mark.django_db
class TestDataProvenanceAndReviewRecords:

    def test_provenance_audit_tracks_citations_and_results(self, stage5_setup):
        """Ensures citations and results link to verified sources and real datasets."""
        project = stage5_setup["project"]
        user = stage5_setup["user"]

        dataset = ResearchDataset.objects.create(
            project=project,
            user=user,
            name="Rural Banking Panel 2020-2024",
            original_filename="rural_banking.csv",
            file_format="CSV",
            file_size_bytes=45000,
            row_count=1200,
            column_count=8
        )

        job = AnalysisJob.objects.create(
            project=project,
            dataset=dataset,
            user=user,
            analysis_type="LINEAR_REGRESSION",
            status="COMPLETED"
        )

        StatisticalResult.objects.create(
            job=job,
            project=project,
            dataset=dataset,
            analysis_type="LINEAR_REGRESSION",
            sample_size=1200,
            p_values={"fx_volatility": 0.0012},
            metrics={"r_squared": 0.38}
        )

        provenance = ProvenanceService.audit_project_provenance(project)
        assert provenance["total_sections_traced"] == 3
        assert "stale_sections_count" in provenance
        assert "provenance_map" in provenance

    def test_api_review_records_lifecycle(self, stage5_setup):
        """Formal review checkpoints manage internal approval stages."""
        project = stage5_setup["project"]
        client = stage5_setup["client"]

        url = reverse("project-reviews", kwargs={"project_id": str(project.id)})

        # Create formal review status record
        post_res = client.post(url, {
            "status": "READY_FOR_INTERNAL_REVIEW",
            "comments": "Initial draft assembled and ready for supervisory committee inspection.",
            "action_items": [
                {"item": "Verify regression tables formatting", "completed": False},
                {"item": "Cross-reference rural panel descriptive stats", "completed": True}
            ]
        }, format="json")

        assert post_res.status_code == status.HTTP_201_CREATED
        assert post_res.data["status"] == "READY_FOR_INTERNAL_REVIEW"
        assert len(post_res.data["action_items"]) == 2

        # List records
        list_res = client.get(url)
        assert list_res.status_code == status.HTTP_200_OK
        assert len(list_res.data) >= 1
