import uuid
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from disciplines.models import AcademicDiscipline
from projects.models import ResearchProject, ResearchRequirements, DocumentCategory, CitationStyle
from documents.models import ResearchDocument, DocumentSection, DocumentVersion
from documents.structure_engine import get_academic_structure
from research.models import AIJob, AIJobStatus
from workspaces.models import Workspace, WorkspaceMembership

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        email="scholar.writer@example.edu",
        password="SecureWritingPass2026!",
        first_name="Ada",
        last_name="Lovelace",
        academic_level="PHD",
        institution="Oxford University"
    )
    workspace = Workspace.objects.create(
        name="Ada's Workspace",
        owner=user,
        is_personal=True
    )
    WorkspaceMembership.objects.create(
        workspace=workspace,
        user=user,
        role="OWNER"
    )
    return user


@pytest.fixture
def other_user(db):
    user = User.objects.create_user(
        email="unauthorized.peer@example.edu",
        password="SecurePeerPass2026!",
        first_name="Charles",
        last_name="Babbage",
        academic_level="FACULTY",
        institution="Cambridge University"
    )
    workspace = Workspace.objects.create(
        name="Charles's Workspace",
        owner=user,
        is_personal=True
    )
    WorkspaceMembership.objects.create(
        workspace=workspace,
        user=user,
        role="OWNER"
    )
    return user


@pytest.fixture
def sample_project(db, test_user):
    discipline, _ = AcademicDiscipline.objects.get_or_create(
        name="Management",
        defaults={"category": "Social Sciences", "slug": "management"}
    )
    workspace = Workspace.objects.filter(owner=test_user, is_personal=True).first()

    project = ResearchProject.objects.create(
        owner=test_user,
        workspace=workspace,
        discipline=discipline,
        title="Impact of Agile Governance on Organizational Resilience",
        document_category=DocumentCategory.ACADEMIC_PROJECT,
        document_subtype="PhD Dissertation",
        academic_level="PHD",
        citation_style=CitationStyle.APA,
        institution="Oxford University"
    )

    ResearchRequirements.objects.create(
        project=project,
        research_methodology="Quantitative survey design utilizing regression and SEM analysis.",
        research_objectives="1. To assess agile governance adoption.\n2. To measure organizational resilience metrics.\n3. To examine the moderating role of firm size.",
        supervisor_requirements="Submit chapters incrementally following APA 7th edition formatting."
    )

    document = ResearchDocument.objects.create(
        project=project,
        title=f"{project.title} - Main Manuscript",
        document_type="MAIN_MANUSCRIPT"
    )

    # Scaffolding default sections
    s1 = DocumentSection.objects.create(
        document=document,
        title="Chapter One: Introduction",
        section_type="CHAPTER",
        order_index=0,
        content="This introductory chapter outlines the research context.",
        word_count=8
    )
    DocumentSection.objects.create(
        document=document,
        parent_section=s1,
        title="Statement of the Problem",
        section_type="PROBLEM_STATEMENT",
        order_index=1,
        content="Contemporary enterprises face unprecedented operational turbulence.",
        word_count=6
    )
    DocumentSection.objects.create(
        document=document,
        title="Chapter Two: Review of Related Literature",
        section_type="CHAPTER",
        order_index=2,
        content="",
        word_count=0
    )

    return project


@pytest.mark.django_db
class TestAcademicStructureEngine:
    """
    Validates multidisciplinary templates across disciplines and categories.
    """

    def test_management_five_chapter_structure(self):
        structure = get_academic_structure(
            discipline_name="Management",
            document_category="ACADEMIC_PROJECT",
            document_subtype="PhD Dissertation"
        )
        assert len(structure) == 5
        chapter_titles = [s["title"] for s in structure]
        assert "Chapter One: Introduction" in chapter_titles[0]
        assert "Chapter Two: Review of Related Literature" in chapter_titles[1]
        assert "Chapter Three: Research Methodology" in chapter_titles[2]
        assert "Chapter Four: Data Presentation, Analysis and Discussion" in chapter_titles[3]
        assert "Chapter Five: Summary, Conclusion and Recommendations" in chapter_titles[4]
        # Check sub-sections in Chapter One
        sub_titles = [sub["title"] for sub in structure[0]["subsections"]]
        assert "Statement of the Problem" in sub_titles
        assert "Objectives of the Study" in sub_titles
        assert "Research Questions" in sub_titles
        assert "Research Hypotheses" in sub_titles

    def test_cs_engineering_structure(self):
        structure = get_academic_structure(
            discipline_name="Computer Science",
            document_category="ACADEMIC_PROJECT",
            document_subtype="Master's Thesis"
        )
        titles = [s["title"] for s in structure]
        assert any("System Requirements and Architectural Design" in t for t in titles)
        assert any("Implementation and System Verification" in t for t in titles)
        assert any("Evaluation, Discussion and Future Work" in t for t in titles)

    def test_medical_clinical_structure(self):
        structure = get_academic_structure(
            discipline_name="Medicine",
            document_category="ACADEMIC_PROJECT",
            document_subtype="PhD Dissertation"
        )
        titles = [s["title"] for s in structure]
        assert any("Materials, Patients and Clinical Methods" in t for t in titles)
        assert any("Clinical Results and Statistical Findings" in t for t in titles)

    def test_law_doctrinal_structure(self):
        structure = get_academic_structure(
            discipline_name="Law",
            document_category="ACADEMIC_PROJECT",
            document_subtype="Master's Thesis"
        )
        titles = [s["title"] for s in structure]
        assert any("Statutory Framework" in t for t in titles)
        assert any("Judicial Interpretation and Precedent" in t for t in titles)
        assert any("Law Reform Proposals" in t for t in titles)

    def test_journal_article_imrad_structure(self):
        structure = get_academic_structure(
            discipline_name="Economics",
            document_category="JOURNAL_ARTICLE",
            document_subtype="Original Research Article"
        )
        titles = [s["title"] for s in structure]
        assert any("Introduction" in t for t in titles)
        assert any("Methods" in t for t in titles)
        assert any("Results" in t for t in titles)
        assert any("Discussion" in t for t in titles)

    def test_templates_catalog_endpoint(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        response = api_client.get("/api/v1/documents/templates/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 6
        template_ids = [t["id"] for t in data]
        assert "management_empirical" in template_ids
        assert "cs_engineering" in template_ids
        assert "medical_health" in template_ids
        assert "law_jurisprudence" in template_ids


@pytest.mark.django_db
class TestDocumentAndSectionAPIs:
    """
    Tests outline manipulation, rich text autosave, and object-level authorization.
    """

    def test_list_document_sections(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()
        response = api_client.get(f"/api/v1/documents/{doc.id}/sections/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2  # Top-level sections

    def test_create_section_and_subsection(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()

        # Create new chapter
        res1 = api_client.post(f"/api/v1/documents/{doc.id}/sections/", {
            "title": "Chapter Six: Appendices",
            "section_type": "CHAPTER"
        })
        assert res1.status_code == status.HTTP_201_CREATED
        new_chapter = res1.json()

        # Create subsection under Chapter Six
        res2 = api_client.post(f"/api/v1/documents/{doc.id}/sections/", {
            "title": "Appendix A: Survey Questionnaire",
            "section_type": "APPENDIX",
            "parent_section": new_chapter["id"]
        })
        assert res2.status_code == status.HTTP_201_CREATED
        sub = res2.json()
        assert sub["parent_section_id"] == new_chapter["id"]

    def test_update_section_content_and_word_count(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()
        sec = doc.sections.first()

        new_content = "<p>ScholarForge AI facilitates multidisciplinary academic writing across all departments.</p>"
        response = api_client.patch(f"/api/v1/documents/sections/{sec.id}/", {
            "content": new_content
        })
        assert response.status_code == status.HTTP_200_OK
        sec.refresh_from_db()
        assert sec.content == new_content
        assert sec.word_count > 0

    def test_delete_section(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()
        sec = doc.sections.last()
        sec_id = sec.id

        response = api_client.delete(f"/api/v1/documents/sections/{sec_id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not DocumentSection.objects.filter(id=sec_id).exists()

    def test_reorder_sections(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()
        sections = list(doc.sections.all())

        payload = {
            "sections": [
                {"id": str(sections[1].id), "order_index": 0},
                {"id": str(sections[0].id), "order_index": 1}
            ]
        }
        response = api_client.post(f"/api/v1/documents/{doc.id}/sections/reorder/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_unauthorized_user_cannot_modify_sections(self, api_client, other_user, sample_project):
        api_client.force_authenticate(user=other_user)
        doc = sample_project.documents.first()
        sec = doc.sections.first()

        # Try to read
        res_get = api_client.get(f"/api/v1/documents/{doc.id}/sections/")
        assert res_get.status_code == status.HTTP_403_FORBIDDEN

        # Try to edit
        res_patch = api_client.patch(f"/api/v1/documents/sections/{sec.id}/", {"content": "Hacked content"})
        assert res_patch.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDocumentVersionHistoryAndRestore:
    """
    Tests version snapshots and safe version restoration.
    """

    def test_create_and_restore_version_snapshot(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()

        # Step 1: Create a version snapshot
        res_snap = api_client.post(f"/api/v1/documents/{doc.id}/versions/", {
            "change_summary": "Initial draft snapshot"
        })
        assert res_snap.status_code == status.HTTP_201_CREATED
        v1_data = res_snap.json()
        assert v1_data["version_number"] == 2

        # Step 2: Make edits to section content
        sec = doc.sections.first()
        api_client.patch(f"/api/v1/documents/sections/{sec.id}/", {
            "content": "Drastically modified content that needs to be rolled back."
        })

        # Step 3: Restore previous version snapshot
        res_restore = api_client.post(f"/api/v1/documents/{doc.id}/versions/{v1_data['id']}/restore/")
        assert res_restore.status_code == status.HTTP_200_OK

        # Verify new version created instead of deleting history
        doc.refresh_from_db()
        assert doc.current_version_number >= 3
        # Verify section content was restored
        sec_restored = doc.sections.first()
        assert "introductory chapter outlines" in sec_restored.content


@pytest.mark.django_db
class TestAIWritingAssistantAndConsistency:
    """
    Tests AI assistant integration, mock handling, permissions, and consistency checker.
    """

    def test_ai_generate_section_mock_mode(self, api_client, test_user, sample_project, monkeypatch):
        api_client.force_authenticate(user=test_user)
        doc = sample_project.documents.first()
        sec = doc.sections.first()

        # Enable mock mode for testing
        monkeypatch.setenv("AI_MOCK_MODE", "True")

        payload = {
            "project_id": str(sample_project.id),
            "action": "GENERATE_SECTION",
            "section_id": str(sec.id),
            "instructions": "Focus on strategic flexibility."
        }
        response = api_client.post("/api/v1/research/ai/generate/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "COMPLETED"
        assert "suggestion" in data
        assert len(data["suggestion"]) > 50
        assert data["action"] == "GENERATE_SECTION"

        # Verify AI job recorded in database
        job_id = data["job_id"]
        job = AIJob.objects.get(id=job_id)
        assert job.status == AIJobStatus.COMPLETED
        assert job.job_type == "GENERATE_SECTION"

    def test_ai_suggestion_feedback_workflow(self, api_client, test_user, sample_project, monkeypatch):
        api_client.force_authenticate(user=test_user)
        monkeypatch.setenv("AI_MOCK_MODE", "True")

        # Generate suggestion
        res_gen = api_client.post("/api/v1/research/ai/generate/", {
            "project_id": str(sample_project.id),
            "action": "IMPROVE_WRITING",
            "selected_text": "Agile methods help firms survive market shocks."
        }, format="json")
        job_id = res_gen.json()["job_id"]

        # Record user acceptance feedback
        res_feedback = api_client.post(f"/api/v1/research/ai/jobs/{job_id}/feedback/", {
            "action": "ACCEPT",
            "final_text": "Accepted scholarly improved text."
        }, format="json")
        assert res_feedback.status_code == status.HTTP_200_OK
        assert res_feedback.json()["is_applied"] is True

        job = AIJob.objects.get(id=job_id)
        assert job.output_payload.get("user_feedback") == "ACCEPT"

    def test_ai_graceful_error_when_key_missing(self, api_client, test_user, sample_project, monkeypatch):
        api_client.force_authenticate(user=test_user)
        monkeypatch.delenv("OPENAI_API_KEY", raising=False)
        monkeypatch.setenv("AI_MOCK_MODE", "False")

        response = api_client.post("/api/v1/research/ai/generate/", {
            "project_id": str(sample_project.id),
            "action": "GENERATE_SECTION"
        }, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "OpenAI API key is not configured" in data.get("error", "")

    def test_academic_consistency_checker(self, api_client, test_user, sample_project):
        api_client.force_authenticate(user=test_user)
        response = api_client.get(f"/api/v1/research/projects/{sample_project.id}/consistency-check/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "consistency_score" in data
        assert "diagnostics" in data
        assert isinstance(data["diagnostics"], list)
        assert data["total_checks"] >= 1

