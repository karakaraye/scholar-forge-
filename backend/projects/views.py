from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Q

from projects.models import ResearchProject, ProjectStatus
from projects.serializers import (
    ResearchProjectListSerializer,
    ResearchProjectDetailSerializer,
    ResearchProjectCreateUpdateSerializer,
)
from projects.permissions import IsProjectOwnerOrWorkspaceMember


class ResearchProjectListCreateView(generics.ListCreateAPIView):
    """
    List user's research projects with filtering, or create a new research project.
    Strictly isolated to projects owned by or accessible to current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ResearchProjectCreateUpdateSerializer
        return ResearchProjectListSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = ResearchProject.objects.filter(
            Q(owner=user) | Q(workspace__memberships__user=user)
        ).distinct().select_related('discipline', 'owner', 'workspace')

        # Filters
        category = self.request.query_params.get('category', '').strip()
        status_param = self.request.query_params.get('status', '').strip()
        discipline_id = self.request.query_params.get('discipline', '').strip()
        search = self.request.query_params.get('search', '').strip()

        if category:
            queryset = queryset.filter(document_category=category)
        if status_param:
            queryset = queryset.filter(status=status_param)
        if discipline_id:
            queryset = queryset.filter(discipline__id=discipline_id)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(document_subtype__icontains=search) |
                Q(institution__icontains=search) |
                Q(discipline__name__icontains=search)
            )

        return queryset.order_by('-updated_at')


class ResearchProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a research project.
    Enforces object-level permission check.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ResearchProjectCreateUpdateSerializer
        return ResearchProjectDetailSerializer

    def get_queryset(self):
        user = self.request.user
        return ResearchProject.objects.filter(
            Q(owner=user) | Q(workspace__memberships__user=user)
        ).distinct().select_related('discipline', 'owner', 'workspace').prefetch_related('documents__sections')


class ResearchProjectArchiveView(APIView):
    """
    Toggle archive status on a research project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, id):
        try:
            project = ResearchProject.objects.get(id=id)
        except ResearchProject.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, project)

        if project.status == ProjectStatus.ARCHIVED:
            project.status = ProjectStatus.ACTIVE
            action = 'unarchived'
        else:
            project.status = ProjectStatus.ARCHIVED
            action = 'archived'

        project.save(update_fields=['status', 'updated_at'])
        return Response({
            'message': f'Project successfully {action}.',
            'status': project.status,
            'project_id': str(project.id)
        })


class DashboardStatsView(APIView):
    """
    Returns real database statistics for the user's dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        base_qs = ResearchProject.objects.filter(
            Q(owner=user) | Q(workspace__memberships__user=user)
        ).distinct()

        counts = base_qs.aggregate(
            total=Count('id'),
            active=Count('id', filter=Q(status=ProjectStatus.ACTIVE)),
            draft=Count('id', filter=Q(status=ProjectStatus.DRAFT)),
            archived=Count('id', filter=Q(status=ProjectStatus.ARCHIVED)),
        )

        recent_projects = base_qs.select_related('discipline', 'owner').order_by('-updated_at')[:5]
        recent_data = ResearchProjectListSerializer(recent_projects, many=True).data

        return Response({
            'total_projects': counts['total'] or 0,
            'active_projects': counts['active'] or 0,
            'draft_projects': counts['draft'] or 0,
            'archived_projects': counts['archived'] or 0,
            'recently_updated': recent_data,
        })
