from rest_framework import permissions
from workspaces.models import WorkspaceMembership


class IsProjectOwnerOrWorkspaceMember(permissions.BasePermission):
    """
    Object-level permission ensuring users can only access projects
    they own or have membership in within the workspace.
    """

    def has_object_permission(self, request, view, obj):
        # Direct owner always has access
        if obj.owner == request.user:
            return True

        # Check if user has membership in the project's workspace
        return WorkspaceMembership.objects.filter(
            workspace=obj.workspace,
            user=request.user
        ).exists()
