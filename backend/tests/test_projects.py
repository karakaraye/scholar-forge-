import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, AcademicLevel
from workspaces.models import Workspace, WorkspaceMembership
from disciplines.models import AcademicDiscipline
from projects.models import (
    ResearchProject,
    ResearchRequirements,
    DocumentCategory,
    CitationStyle,
    ProjectStatus,
)
from documents.models import ResearchDocument, DocumentSection


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_a(db):
    user = User.objects.create_user(
        email='author_a@oxford.edu',
        password='Password123!',
        first_name='Alice',
        last_name='Smith',
        academic_level=AcademicLevel.FACULTY
    )
    ws = Workspace.objects.create(name="Alice's Lab", owner=user, is_personal=True)
    WorkspaceMembership.objects.create(workspace=ws, user=user, role='OWNER')
    return user


@pytest.fixture
def user_b(db):
    user = User.objects.create_user(
        email='author_b@cambridge.edu',
        password='Password123!',
        first_name='Bob',
        last_name='Jones',
        academic_level=AcademicLevel.PHD
    )
    ws = Workspace.objects.create(name="Bob's Lab", owner=user, is_personal=True)
    WorkspaceMembership.objects.create(workspace=ws, user=user, role='OWNER')
    return user


@pytest.fixture
def cs_discipline(db):
    return AcademicDiscipline.objects.create(
        name='Computer Science',
        slug='computer-science',
        category='STEM',
        is_active=True
    )


@pytest.fixture
def economics_discipline(db):
    return AcademicDiscipline.objects.create(
        name='Economics',
        slug='economics',
        category='Social Sciences',
        is_active=True
    )


@pytest.fixture
def sample_project_a(db, user_a, cs_discipline):
    ws = Workspace.objects.filter(owner=user_a, is_personal=True).first()
    project = ResearchProject.objects.create(
        owner=user_a,
        workspace=ws,
        discipline=cs_discipline,
        title='Deep Learning in Distributed Systems',
        document_category=DocumentCategory.RESEARCH_PAPER,
        document_subtype='Empirical Research Paper',
        academic_level=AcademicLevel.FACULTY,
        status=ProjectStatus.ACTIVE,
        institution='Oxford University',
        country='United Kingdom',
        preferred_language='English',
        citation_style=CitationStyle.IEEE
    )
    ResearchRequirements.objects.create(
        project=project,
        research_methodology='Quantitative empirical experiments on GPU clusters',
        research_objectives='Benchmark distributed synchronization latency',
        supervisor_requirements='Peer-reviewed standard IEEE transactions'
    )
    doc = ResearchDocument.objects.create(
        project=project,
        title='Deep Learning in Distributed Systems - Manuscript',
        document_type='MAIN_MANUSCRIPT'
    )
    DocumentSection.objects.create(
        document=doc,
        title='Abstract',
        section_type='ABSTRACT',
        order_index=0
    )
    return project


@pytest.mark.django_db
class TestDisciplinesAndProjects:
    def test_list_disciplines(self, api_client, cs_discipline, economics_discipline):
        url = reverse('discipline-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        names = [d['name'] for d in response.data['results'] if 'results' in response.data] or [d['name'] for d in response.data]
        assert 'Computer Science' in names
        assert 'Economics' in names

    def test_search_disciplines(self, api_client, cs_discipline, economics_discipline):
        url = reverse('discipline-list') + '?search=Computer'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        assert len(results) == 1
        assert results[0]['name'] == 'Computer Science'

    def test_create_research_project_wizard_flow(self, api_client, user_a, cs_discipline):
        api_client.force_login(user_a)
        url = reverse('project-list-create')
        payload = {
            'title': 'Autonomous Navigation in Dense Urban Environments',
            'document_category': DocumentCategory.ACADEMIC_PROJECT,
            'document_subtype': 'PhD Dissertation',
            'academic_level': AcademicLevel.PHD,
            'discipline_id': str(cs_discipline.id),
            'institution': 'MIT',
            'country': 'United States',
            'preferred_language': 'English',
            'citation_style': CitationStyle.APA,
            'requirements': {
                'research_methodology': 'Simulated multi-agent reinforcement learning',
                'research_objectives': 'Evaluate path optimality and collision avoidance',
                'supervisor_requirements': 'Minimum 50 references, 40k words',
                'target_word_count': 40000
            }
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        project_id = response.data['id']

        # Verify project created in DB
        project = ResearchProject.objects.get(id=project_id)
        assert project.owner == user_a
        assert project.title == 'Autonomous Navigation in Dense Urban Environments'
        assert project.discipline == cs_discipline

        # Verify requirements created
        assert hasattr(project, 'requirements')
        assert project.requirements.target_word_count == 40000

        # Verify manuscript document created with dynamic sections
        docs = project.documents.all()
        assert docs.count() == 1
        assert docs.first().sections.count() >= 5

    def test_project_listing_filtered_by_owner(self, api_client, user_a, user_b, sample_project_a, cs_discipline):
        # Create project for user B
        ws_b = Workspace.objects.filter(owner=user_b, is_personal=True).first()
        ResearchProject.objects.create(
            owner=user_b,
            workspace=ws_b,
            discipline=cs_discipline,
            title="Bob's Private Research",
            document_category=DocumentCategory.JOURNAL_ARTICLE,
            document_subtype='Review Article',
            academic_level=AcademicLevel.PHD,
            status=ProjectStatus.ACTIVE
        )

        # Alice lists projects - must ONLY see her own
        api_client.force_login(user_a)
        url = reverse('project-list-create')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        results = response.data['results'] if 'results' in response.data else response.data
        titles = [p['title'] for p in results]
        assert 'Deep Learning in Distributed Systems' in titles
        assert "Bob's Private Research" not in titles

    def test_project_ownership_isolation_unauthorized_access(self, api_client, user_b, sample_project_a):
        """
        Critical security test: User B must NEVER be able to view, edit,
        archive, or delete User A's private research project.
        """
        api_client.force_login(user_b)

        # 1. User B tries to view Alice's project
        detail_url = reverse('project-detail', kwargs={'id': sample_project_a.id})
        get_resp = api_client.get(detail_url)
        assert get_resp.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

        # 2. User B tries to update Alice's project
        patch_resp = api_client.patch(detail_url, {'title': 'Hacked Title'}, format='json')
        assert patch_resp.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
        sample_project_a.refresh_from_db()
        assert sample_project_a.title == 'Deep Learning in Distributed Systems'

        # 3. User B tries to archive Alice's project
        archive_url = reverse('project-archive', kwargs={'id': sample_project_a.id})
        archive_resp = api_client.post(archive_url)
        assert archive_resp.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

        # 4. User B tries to delete Alice's project
        del_resp = api_client.delete(detail_url)
        assert del_resp.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
        assert ResearchProject.objects.filter(id=sample_project_a.id).exists()

    def test_archive_and_unarchive_project(self, api_client, user_a, sample_project_a):
        api_client.force_login(user_a)
        archive_url = reverse('project-archive', kwargs={'id': sample_project_a.id})

        # Archive
        resp = api_client.post(archive_url)
        assert resp.status_code == status.HTTP_200_OK
        sample_project_a.refresh_from_db()
        assert sample_project_a.status == ProjectStatus.ARCHIVED

        # Unarchive
        resp2 = api_client.post(archive_url)
        assert resp2.status_code == status.HTTP_200_OK
        sample_project_a.refresh_from_db()
        assert sample_project_a.status == ProjectStatus.ACTIVE

    def test_dashboard_stats_endpoint(self, api_client, user_a, sample_project_a):
        api_client.force_login(user_a)
        url = reverse('project-dashboard-stats')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_projects'] >= 1
        assert response.data['active_projects'] >= 1
        assert 'recently_updated' in response.data

    def test_delete_project_success(self, api_client, user_a, sample_project_a):
        api_client.force_login(user_a)
        detail_url = reverse('project-detail', kwargs={'id': sample_project_a.id})
        response = api_client.delete(detail_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not ResearchProject.objects.filter(id=sample_project_a.id).exists()

