from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from workspaces.models import Workspace, WorkspaceMembership
from workspaces.serializers import WorkspaceSerializer


class CurrentWorkspaceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        workspace = Workspace.objects.filter(owner=request.user, is_personal=True).first()
        if not workspace:
            workspace = Workspace.objects.create(
                name=f"{request.user.get_short_name()}'s Workspace",
                owner=request.user,
                is_personal=True,
                description="Default personal research workspace"
            )
            WorkspaceMembership.objects.create(
                workspace=workspace,
                user=request.user,
                role='OWNER'
            )
        return Response(WorkspaceSerializer(workspace).data)
