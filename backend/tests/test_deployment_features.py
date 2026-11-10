"""
Tests for the deployment-readiness work:
  * collaborator invitation emails, invitee lookup, accept/decline
  * assigned-section scoping
  * background export worker mode
  * language-model enrichment of AI features (with the model call faked)
"""

import json

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient

import research.llm_client as llm_client
from disciplines.models import AcademicDiscipline
from documents.models import DocumentSection, ResearchDocument
from projects.models import ResearchProject
from research.correction_service import CorrectionService
from research.export_job_service import ExportJobService
from research.interpretation_service import InterpretationService
from research.literature_intelligence import LiteratureIntelligenceService
from research.models import (
    CollaboratorRole,
    CorrectionCategory,
    ExportJob,
    ExportJobStatus,
    InvitationStatus,
    ProjectCollaborator,
    ProjectInvitation,
    ResearchSource,
    SupervisorFeedback,
)
from research.review_service import ReviewService
from workspaces.models import Workspace, WorkspaceMembership

User = get_user_model()

LONG_TEXT = (
    "This study examines how mobile money adoption influences household savings behaviour in rural "
    "districts. It draws on survey data from three hundred households and applies regression analysis "
    "to estimate the association between account ownership and monthly savings while controlling for "
    "income, education and distance to the nearest bank branch."
)


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def other_project(setup):
    """A project owned by an unrelated user, in that user's own workspace."""
    workspace = Workspace.objects.create(name="Other WS", owner=setup["other"])
    WorkspaceMembership.objects.create(workspace=workspace, user=setup["other"], role="OWNER")
    return ResearchProject.objects.create(
        workspace=workspace, owner=setup["other"], title="Private", academic_level="Postgraduate",
        discipline=setup["project"].discipline,
    )


@pytest.fixture
def setup(db):
    owner = User.objects.create_user(email="owner@uni.edu", password="ValidPassword123!", first_name="Ada", last_name="Owner")
    invitee = User.objects.create_user(email="invitee@uni.edu", password="ValidPassword123!")
    other = User.objects.create_user(email="other@uni.edu", password="ValidPassword123!")
    workspace = Workspace.objects.create(name="WS", owner=owner)
    WorkspaceMembership.objects.create(workspace=workspace, user=owner, role="OWNER")
    discipline, _ = AcademicDiscipline.objects.get_or_create(name="Economics")
    project = ResearchProject.objects.create(
        workspace=workspace, owner=owner, title="Mobile Money and Savings", discipline=discipline,
        academic_level="Postgraduate",
    )
    document = ResearchDocument.objects.create(project=project, title="Thesis", current_version_number=1)
    intro = DocumentSection.objects.create(document=document, title="1. Introduction", order_index=0, content=f"<p>{LONG_TEXT}</p>")
    methods = DocumentSection.objects.create(document=document, title="3. Methodology", order_index=1, content=f"<p>{LONG_TEXT}</p>")
    methods_sub = DocumentSection.objects.create(
        document=document, title="3.1 Sampling", order_index=2, parent_section=methods, content="<p>Sampling text.</p>",
    )
    return {
        "owner": owner, "invitee": invitee, "other": other, "project": project,
        "document": document, "intro": intro, "methods": methods, "methods_sub": methods_sub,
    }


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestInvitations:
    def invite(self, setup, settings, **extra):
        settings.FRONTEND_URL = "https://app.example.com"
        body = {"email": "invitee@uni.edu", "role": "CO_AUTHOR", **extra}
        return client_for(setup["owner"]).post(
            f"/api/v1/research/projects/{setup['project'].id}/collaborators/", body, format="json",
        )

    def test_invite_sends_email_with_acceptance_link(self, setup, settings, mailoutbox):
        res = self.invite(setup, settings)
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["email_sent"] is True
        assert len(mailoutbox) == 1
        message = mailoutbox[0]
        assert message.to == ["invitee@uni.edu"]
        assert f"https://app.example.com/invitations/{res.data['token']}" in message.body
        assert "Mobile Money and Savings" in message.subject

    def test_invitee_can_view_list_and_accept(self, setup, settings, mailoutbox):
        token = self.invite(setup, settings).data["token"]
        invitee = client_for(setup["invitee"])

        mine = invitee.get("/api/v1/research/collaborations/invitations/")
        assert mine.status_code == status.HTTP_200_OK
        assert [inv["token"] for inv in mine.data] == [token]

        detail = invitee.get(f"/api/v1/research/collaborations/invitations/{token}/")
        assert detail.status_code == status.HTTP_200_OK
        assert detail.data["project_title"] == "Mobile Money and Savings"
        assert detail.data["role"] == "CO_AUTHOR"

        accepted = invitee.post(f"/api/v1/research/collaborations/invitations/{token}/accept/")
        assert accepted.status_code == status.HTTP_200_OK
        assert ProjectCollaborator.objects.filter(project=setup["project"], user=setup["invitee"], is_active=True).exists()
        # the accepted project now shows up for the invitee
        assert invitee.get(f"/api/v1/projects/{setup['project'].id}/").status_code == status.HTTP_200_OK

    def test_other_users_cannot_see_or_decline_invitation(self, setup, settings, mailoutbox):
        token = self.invite(setup, settings).data["token"]
        other = client_for(setup["other"])
        assert other.get(f"/api/v1/research/collaborations/invitations/{token}/").status_code == status.HTTP_404_NOT_FOUND
        assert other.get("/api/v1/research/collaborations/invitations/").data == []
        assert other.post(f"/api/v1/research/collaborations/invitations/{token}/reject/").status_code == status.HTTP_400_BAD_REQUEST
        assert ProjectInvitation.objects.get(token=token).status == InvitationStatus.PENDING

    def test_assigned_sections_must_belong_to_project(self, setup, settings, mailoutbox):
        ok = self.invite(setup, settings, assigned_sections=[str(setup["methods"].id)])
        assert ok.status_code == status.HTTP_201_CREATED
        assert ok.data["assigned_sections"] == [str(setup["methods"].id)]

        foreign_doc = ResearchDocument.objects.create(project=other_project(setup), title="Other doc")
        foreign = DocumentSection.objects.create(document=foreign_doc, title="Foreign", order_index=0)
        bad = self.invite(setup, settings, email="x@uni.edu", assigned_sections=[str(foreign.id)])
        assert bad.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# Section scoping
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSectionScoping:
    @pytest.fixture
    def scoped(self, setup):
        ProjectCollaborator.objects.create(
            project=setup["project"], user=setup["invitee"], role=CollaboratorRole.CO_AUTHOR,
            assigned_sections=[str(setup["methods"].id)], is_active=True,
        )
        return client_for(setup["invitee"])

    def test_scoped_coauthor_edits_only_assigned_sections(self, setup, scoped):
        url = "/api/v1/documents/sections/{}/"
        assert scoped.patch(url.format(setup["methods"].id), {"content": "<p>Edited.</p>"}, format="json").status_code == 200
        assert scoped.patch(url.format(setup["methods_sub"].id), {"content": "<p>Edited sub.</p>"}, format="json").status_code == 200
        res = scoped.patch(url.format(setup["intro"].id), {"content": "<p>Hijack.</p>"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN
        setup["intro"].refresh_from_db()
        assert LONG_TEXT in setup["intro"].content
        # reading is never scoped
        assert scoped.get(url.format(setup["intro"].id)).status_code == 200

    def test_scoped_coauthor_cannot_delete_assigned_root_or_run_whole_document_actions(self, setup, scoped):
        assert scoped.delete(f"/api/v1/documents/sections/{setup['methods'].id}/").status_code == 403
        reorder = scoped.post(
            f"/api/v1/documents/{setup['document'].id}/sections/reorder/",
            {"sections": [{"id": str(setup["intro"].id), "order_index": 5}]}, format="json",
        )
        assert reorder.status_code == 403
        autoformat = scoped.post(f"/api/v1/research/projects/{setup['project'].id}/autoformat/apply/", {}, format="json")
        assert autoformat.status_code == 403

    def test_scoped_coauthor_adds_subsections_only_under_assigned_section(self, setup, scoped):
        url = f"/api/v1/documents/{setup['document'].id}/sections/"
        under = scoped.post(url, {"title": "3.2 Instruments", "parent_section": str(setup["methods"].id)}, format="json")
        assert under.status_code == status.HTTP_201_CREATED
        top = scoped.post(url, {"title": "New chapter"}, format="json")
        assert top.status_code == status.HTTP_403_FORBIDDEN

    def test_comments_limited_to_assigned_sections(self, setup, scoped):
        url = f"/api/v1/research/projects/{setup['project'].id}/comments/"
        body = {"document_id": str(setup["document"].id), "content": "Note", "anchor_text": "", "start_offset": 0, "end_offset": 0}
        assert scoped.post(url, {**body, "section_id": str(setup["intro"].id)}, format="json").status_code == 403
        assert scoped.post(url, {**body, "section_id": str(setup["methods"].id)}, format="json").status_code == 201

    def test_project_detail_reports_scope_and_capabilities(self, setup, scoped):
        data = scoped.get(f"/api/v1/projects/{setup['project'].id}/").data
        assert data["current_user_role"] == "CO_AUTHOR"
        assert set(data["capabilities"]) == {"view", "comment", "edit"}
        assert data["assigned_sections"] == [str(setup["methods"].id)]

        owner_data = client_for(setup["owner"]).get(f"/api/v1/projects/{setup['project'].id}/").data
        assert owner_data["assigned_sections"] is None
        assert "manage" in owner_data["capabilities"]


# ---------------------------------------------------------------------------
# Background export worker
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestExportWorker:
    def test_worker_mode_queues_then_worker_renders(self, setup, settings):
        settings.EXPORT_JOB_MODE = "worker"
        job = ExportJobService.initiate_export_job(project=setup["project"], user=setup["owner"], export_format="DOCX")
        assert job.status == ExportJobStatus.PENDING
        assert job.document_export is None

        call_command("run_export_worker", "--once")

        job.refresh_from_db()
        assert job.status == ExportJobStatus.COMPLETED, job.error_message
        assert job.document_export is not None
        assert job.document_export.file_size_bytes > 0

    def test_job_can_only_be_claimed_once(self, setup, settings):
        settings.EXPORT_JOB_MODE = "worker"
        job = ExportJobService.initiate_export_job(project=setup["project"], user=setup["owner"], export_format="PDF")
        assert ExportJobService.claim_job(job.id) is not None
        assert ExportJobService.claim_job(job.id) is None

    def test_stale_processing_jobs_are_failed(self, setup, settings):
        settings.EXPORT_JOB_MODE = "worker"
        job = ExportJobService.initiate_export_job(project=setup["project"], user=setup["owner"], export_format="DOCX")
        ExportJobService.claim_job(job.id)
        from datetime import timedelta
        from django.utils import timezone
        ExportJob.objects.filter(pk=job.pk).update(updated_at=timezone.now() - timedelta(hours=2))
        assert ExportJobService.fail_stale_jobs() == 1
        job.refresh_from_db()
        assert job.status == ExportJobStatus.FAILED

    def test_api_returns_pending_job_in_worker_mode(self, setup, settings):
        settings.EXPORT_JOB_MODE = "worker"
        res = client_for(setup["owner"]).post(
            f"/api/v1/research/projects/{setup['project'].id}/export/", {"export_format": "DOCX"}, format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["status"] == ExportJobStatus.PENDING

    def test_foreign_document_version_is_ignored(self, setup, settings):
        from documents.models import DocumentVersion
        other_doc = ResearchDocument.objects.create(project=other_project(setup), title="Private doc")
        foreign_version = DocumentVersion.objects.create(document=other_doc, version_number=1, snapshot_data={"sections": []})
        settings.EXPORT_JOB_MODE = "worker"
        job = ExportJobService.initiate_export_job(
            project=setup["project"], user=setup["owner"], document_version_id=str(foreign_version.id),
        )
        assert job.export_options["document_version_id"] is None


# ---------------------------------------------------------------------------
# Language-model enrichment (model call faked; no network)
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_llm(monkeypatch):
    calls = []

    def install(response_text):
        def fake_call(prompt, ai_settings, system_prompt=None, json_mode=False):
            calls.append({"prompt": prompt, "json_mode": json_mode})
            return response_text, "fake-model-1"

        monkeypatch.setattr(llm_client, "llm_enabled", lambda: True)
        monkeypatch.setattr(llm_client, "call_openai_api", fake_call)
        return calls

    return install


@pytest.mark.django_db
class TestLanguageModelEnrichment:
    def test_literature_intelligence_uses_model_text(self, setup, fake_llm):
        calls = fake_llm("Evidence basis: abstract\n\nModel-written summary.")
        source = ResearchSource.objects.create(
            created_by=setup["owner"], title="Mobile money and saving", abstract=LONG_TEXT, publication_year=2021,
        )
        result = LiteratureIntelligenceService.analyze_literature(
            user=setup["owner"], project=setup["project"], task_type="SUMMARIZE_PUBLICATION", source_ids=[str(source.id)],
        )
        assert result["content"].endswith("Model-written summary.")
        assert result["model"] == "fake-model-1"
        assert "<evidence>" in calls[0]["prompt"] and "Mobile money and saving" in calls[0]["prompt"]

    def test_interpretation_keeps_template_and_uses_model(self, fake_llm):
        fake_llm("Model interpretation of the correlation.")
        stats = [{"test_type": "PEARSON_CORRELATION", "output_data": {
            "variable_1": "income", "variable_2": "savings", "correlation_coefficient": 0.42, "p_value": 0.001, "sample_size": 300,
        }}]
        result = InterpretationService.execute_interpretation_task(
            task_type="INTERPRET_CORRELATION_RESULTS",
            project_context={"title": "T", "discipline": "Economics"},
            statistical_results=stats,
        )
        assert result["data"]["content"] == "Model interpretation of the correlation."
        assert result["data"]["generated_by"] == "fake-model-1"
        assert result["data"]["template_content"]

    def test_review_assistant_adds_ai_review(self, setup, fake_llm):
        fake_llm("## Overall assessment\nModel review.")
        result = ReviewService.execute_review_task(project=setup["project"], task_type="REVIEW_FULL_MANUSCRIPT")
        assert result["ai_review"].startswith("## Overall assessment")
        assert result["generated_by"] == "fake-model-1"

    def test_feedback_analysis_uses_validated_model_classification(self, setup, fake_llm):
        fake_llm(json.dumps({"items": [
            {"index": 0, "category": "RESEARCH_METHODOLOGY", "priority": "HIGH",
             "section_id": str(setup["methods"].id), "requires_evidence": False,
             "guidance": "Explain the stratification procedure."},
            {"index": 1, "category": "NOT_A_REAL_CATEGORY", "section_id": "not-a-section"},
        ]}))
        feedback = SupervisorFeedback.objects.create(
            project=setup["project"], uploaded_by=setup["owner"], source_type="MANUAL_ENTRY",
            raw_content="Clarify how households were selected.\nTighten the tone of the opening paragraph.",
        )
        report = CorrectionService.analyze_feedback(feedback, actor=setup["owner"])
        assert report["analysis_engine"] == "language-model"
        by_text = {t.instruction: t for t in report["tasks"]}
        first = by_text["Clarify how households were selected."]
        second = by_text["Tighten the tone of the opening paragraph."]
        assert first.category == CorrectionCategory.RESEARCH_METHODOLOGY
        assert first.section_id == setup["methods"].id
        assert "Explain the stratification procedure." in first.proposed_text
        # invalid model output falls back to the keyword rules
        assert second.category in CorrectionCategory.values
        assert second.category != "NOT_A_REAL_CATEGORY"

    def test_model_failure_falls_back_to_deterministic_output(self, setup, monkeypatch):
        def boom(*args, **kwargs):
            raise RuntimeError("upstream timeout")

        monkeypatch.setattr(llm_client, "llm_enabled", lambda: True)
        monkeypatch.setattr(llm_client, "call_openai_api", boom)
        result = ReviewService.execute_review_task(project=setup["project"], task_type="REVIEW_FULL_MANUSCRIPT")
        assert "ai_review" not in result
        assert result["generated_by"] == "deterministic-template"

    def test_model_disabled_in_tests_by_default(self):
        assert llm_client.llm_enabled() is False
