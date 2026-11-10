"""
Role-based access control across project-scoped endpoints.

Covers the central policy in projects/access.py:
  * collaborator roles (VIEWER / ACADEMIC_REVIEWER / SUPERVISOR / CO_AUTHOR) get exactly
    the capabilities documented in docs/COLLABORATION_ARCHITECTURE.md
  * invited collaborators can open the project and its manuscript
  * outsiders cannot read or mutate objects addressed by primary key
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from disciplines.models import AcademicDiscipline
from documents.models import DocumentSection, ResearchDocument
from projects.access import (
    APPROVE,
    COMMENT,
    EDIT,
    MANAGE,
    VIEW,
    get_project_capabilities,
)
from projects.models import ResearchProject
from research.models import (
    CollaboratorRole,
    CorrectionTask,
    CorrectionTaskStatus,
    ManuscriptComment,
    ProjectCollaborator,
    ResearchDataset,
    ResearchInstrument,
    ResearchSource,
)
from workspaces.models import Workspace, WorkspaceMembership

User = get_user_model()


@pytest.fixture
def rbac(db):
    def make_user(email):
        return User.objects.create_user(email=email, password="ValidPassword123!")

    owner = make_user("owner@uni.edu")
    users = {
        role: make_user(f"{role.lower()}@uni.edu")
        for role in (
            CollaboratorRole.VIEWER,
            CollaboratorRole.ACADEMIC_REVIEWER,
            CollaboratorRole.SUPERVISOR,
            CollaboratorRole.CO_AUTHOR,
        )
    }
    outsider = make_user("outsider@elsewhere.edu")

    workspace = Workspace.objects.create(name="Owner Workspace", owner=owner)
    WorkspaceMembership.objects.create(workspace=workspace, user=owner, role="OWNER")
    discipline, _ = AcademicDiscipline.objects.get_or_create(name="Public Health")
    project = ResearchProject.objects.create(
        workspace=workspace, owner=owner, title="RBAC Project", discipline=discipline,
        academic_level="Postgraduate",
    )
    for role, user in users.items():
        ProjectCollaborator.objects.create(project=project, user=user, role=role, is_active=True)

    document = ResearchDocument.objects.create(project=project, title="Thesis", current_version_number=1)
    section = DocumentSection.objects.create(
        document=document, title="Introduction", order_index=0, content="Original introduction text.",
    )
    instrument = ResearchInstrument.objects.create(project=project, title="Household Survey")
    dataset = ResearchDataset.objects.create(
        project=project, user=owner, name="Survey Data", original_filename="survey.csv",
    )

    return {
        "owner": owner,
        "outsider": outsider,
        "viewer": users[CollaboratorRole.VIEWER],
        "reviewer": users[CollaboratorRole.ACADEMIC_REVIEWER],
        "supervisor": users[CollaboratorRole.SUPERVISOR],
        "coauthor": users[CollaboratorRole.CO_AUTHOR],
        "project": project,
        "document": document,
        "section": section,
        "instrument": instrument,
        "dataset": dataset,
    }


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestCapabilityMatrix:
    @pytest.mark.parametrize(
        "who, expected",
        [
            ("owner", {VIEW, COMMENT, EDIT, APPROVE, MANAGE}),
            ("coauthor", {VIEW, COMMENT, EDIT}),
            ("supervisor", {VIEW, COMMENT, APPROVE}),
            ("reviewer", {VIEW, COMMENT}),
            ("viewer", {VIEW}),
            ("outsider", set()),
        ],
    )
    def test_role_capabilities(self, rbac, who, expected):
        assert set(get_project_capabilities(rbac[who], rbac["project"])) == expected

    def test_inactive_collaborator_has_no_access(self, rbac):
        ProjectCollaborator.objects.filter(user=rbac["coauthor"]).update(is_active=False)
        assert get_project_capabilities(rbac["coauthor"], rbac["project"]) == frozenset()

    def test_workspace_viewer_is_read_only(self, rbac):
        member = User.objects.create_user(email="wsviewer@uni.edu", password="ValidPassword123!")
        WorkspaceMembership.objects.create(workspace=rbac["project"].workspace, user=member, role="VIEWER")
        assert set(get_project_capabilities(member, rbac["project"])) == {VIEW}


@pytest.mark.django_db
class TestCollaboratorsCanOpenProjectAndManuscript:
    @pytest.mark.parametrize("who", ["viewer", "reviewer", "supervisor", "coauthor"])
    def test_collaborator_sees_project_in_list_and_detail(self, rbac, who):
        client = client_for(rbac[who])
        listing = client.get("/api/v1/projects/")
        assert listing.status_code == status.HTTP_200_OK
        payload = listing.json()
        rows = payload["results"] if isinstance(payload, dict) else payload
        assert str(rbac["project"].id) in {row["id"] for row in rows}

        detail = client.get(f"/api/v1/projects/{rbac['project'].id}/")
        assert detail.status_code == status.HTTP_200_OK

    @pytest.mark.parametrize("who", ["viewer", "reviewer", "supervisor", "coauthor"])
    def test_collaborator_can_read_document_and_sections(self, rbac, who):
        client = client_for(rbac[who])
        assert client.get(f"/api/v1/documents/{rbac['document'].id}/").status_code == status.HTTP_200_OK
        assert client.get(f"/api/v1/documents/sections/{rbac['section'].id}/").status_code == status.HTTP_200_OK

    def test_outsider_cannot_read_document(self, rbac):
        client = client_for(rbac["outsider"])
        assert client.get(f"/api/v1/documents/{rbac['document'].id}/").status_code == status.HTTP_403_FORBIDDEN
        assert client.get(f"/api/v1/projects/{rbac['project'].id}/").status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestManuscriptEditing:
    @pytest.mark.parametrize("who", ["viewer", "reviewer", "supervisor"])
    def test_non_editors_cannot_change_sections(self, rbac, who):
        res = client_for(rbac[who]).patch(
            f"/api/v1/documents/sections/{rbac['section'].id}/", {"content": "Overwritten."}, format="json",
        )
        assert res.status_code == status.HTTP_403_FORBIDDEN
        rbac["section"].refresh_from_db()
        assert rbac["section"].content == "Original introduction text."

    def test_coauthor_can_change_sections(self, rbac):
        res = client_for(rbac["coauthor"]).patch(
            f"/api/v1/documents/sections/{rbac['section'].id}/", {"content": "Co-author revision."}, format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        rbac["section"].refresh_from_db()
        assert rbac["section"].content == "Co-author revision."

    def test_viewer_cannot_delete_project_but_owner_can_archive(self, rbac):
        url = f"/api/v1/projects/{rbac['project'].id}/"
        assert client_for(rbac["coauthor"]).delete(url).status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["coauthor"]).post(f"{url}archive/").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["owner"]).post(f"{url}archive/").status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestCommentingAndReview:
    def test_viewer_cannot_comment_but_reviewer_can(self, rbac):
        url = f"/api/v1/research/projects/{rbac['project'].id}/comments/"
        body = {
            "document_id": str(rbac["document"].id),
            "section_id": str(rbac["section"].id),
            "content": "Please clarify.",
            "anchor_text": "Original",
            "start_offset": 0,
            "end_offset": 8,
        }
        assert client_for(rbac["viewer"]).post(url, body, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["reviewer"]).post(url, body, format="json").status_code == status.HTTP_201_CREATED
        # everyone with VIEW can still read the thread
        assert client_for(rbac["viewer"]).get(url).status_code == status.HTTP_200_OK

    def test_reply_and_status_require_comment_capability(self, rbac):
        comment = ManuscriptComment.objects.create(
            project=rbac["project"], document=rbac["document"], section=rbac["section"],
            author=rbac["owner"], content="Check this.",
        )
        reply_url = f"/api/v1/research/comments/{comment.id}/reply/"
        assert client_for(rbac["viewer"]).post(reply_url, {"content": "hi"}, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["outsider"]).post(reply_url, {"content": "hi"}, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["supervisor"]).post(reply_url, {"content": "Noted."}, format="json").status_code == status.HTTP_201_CREATED

    def test_only_approvers_can_review_correction_tasks(self, rbac):
        task = CorrectionTask.objects.create(
            project=rbac["project"], section=rbac["section"], status=CorrectionTaskStatus.READY_FOR_REVIEW,
            supervisor_instruction="Tighten the argument.", expected_base_version=1,
        )
        url = f"/api/v1/research/corrections/{task.id}/review/"
        assert client_for(rbac["coauthor"]).post(url, {"decision": "APPROVE"}, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["reviewer"]).post(url, {"decision": "APPROVE"}, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["supervisor"]).post(url, {"decision": "APPROVE"}, format="json").status_code == status.HTTP_200_OK

    def test_supervisor_cannot_apply_corrections_directly(self, rbac):
        task = CorrectionTask.objects.create(
            project=rbac["project"], section=rbac["section"], status=CorrectionTaskStatus.OPEN,
            supervisor_instruction="Rewrite.", proposed_text="New text.", expected_base_version=1,
        )
        url = f"/api/v1/research/corrections/{task.id}/apply/"
        assert client_for(rbac["supervisor"]).post(url, {"content": "New text."}, format="json").status_code == status.HTTP_403_FORBIDDEN

    def test_only_managers_can_invite(self, rbac):
        url = f"/api/v1/research/projects/{rbac['project'].id}/collaborators/"
        body = {"email": "new@uni.edu", "role": "VIEWER"}
        assert client_for(rbac["coauthor"]).post(url, body, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["supervisor"]).post(url, body, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["owner"]).post(url, body, format="json").status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestObjectLevelIsolation:
    def test_outsider_cannot_touch_instrument_by_id(self, rbac):
        client = client_for(rbac["outsider"])
        url = f"/api/v1/research/instruments/{rbac['instrument'].id}/"
        assert client.get(url).status_code == status.HTTP_403_FORBIDDEN
        assert client.put(url, {"title": "Hijacked"}, format="json").status_code == status.HTTP_403_FORBIDDEN
        assert client.delete(url).status_code == status.HTTP_403_FORBIDDEN
        assert ResearchInstrument.objects.filter(pk=rbac["instrument"].pk, title="Household Survey").exists()

    def test_viewer_can_read_but_not_delete_dataset(self, rbac):
        client = client_for(rbac["viewer"])
        url = f"/api/v1/research/datasets/{rbac['dataset'].id}/"
        assert client.get(url).status_code == status.HTTP_200_OK
        assert client.delete(url).status_code == status.HTTP_403_FORBIDDEN
        assert ResearchDataset.objects.filter(pk=rbac["dataset"].pk).exists()

    def test_outsider_cannot_read_document_diff(self, rbac):
        url = f"/api/v1/research/documents/{rbac['document'].id}/diff/"
        assert client_for(rbac["outsider"]).get(url).status_code == status.HTTP_403_FORBIDDEN

    def test_shared_source_can_only_be_modified_by_creator(self, rbac):
        source = ResearchSource.objects.create(created_by=rbac["owner"], title="Shared Catalog Entry")
        url = f"/api/v1/research/sources/{source.id}/"
        assert client_for(rbac["outsider"]).delete(url).status_code == status.HTTP_403_FORBIDDEN
        assert client_for(rbac["outsider"]).patch(url, {"title": "Vandalised"}, format="json").status_code == status.HTTP_403_FORBIDDEN
        source.refresh_from_db()
        assert source.title == "Shared Catalog Entry"
