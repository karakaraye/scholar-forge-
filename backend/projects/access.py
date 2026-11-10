"""
Central project access policy for ScholarForge AI.

Every project-scoped endpoint resolves the requesting user's capabilities on a
project through this module, so role semantics live in exactly one place.

Capabilities
------------
VIEW     read the project, manuscript, data, results and exports
COMMENT  comment, reply, ingest reviewer feedback, raise correction tasks,
         run non-destructive audits/reviews and generate exports
EDIT     change manuscript content and research data
APPROVE  sign off revisions, research plans and review checkpoints
MANAGE   invite/remove collaborators, change roles, archive/delete the project

Role mapping follows docs/COLLABORATION_ARCHITECTURE.md.
"""

from django.apps import apps
from django.db.models import Q
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

VIEW = 'view'
COMMENT = 'comment'
EDIT = 'edit'
APPROVE = 'approve'
MANAGE = 'manage'

ALL_CAPABILITIES = frozenset({VIEW, COMMENT, EDIT, APPROVE, MANAGE})

COLLABORATOR_CAPABILITIES = {
    'PROJECT_OWNER': ALL_CAPABILITIES,
    'SUPERVISOR': frozenset({VIEW, COMMENT, APPROVE}),
    'CO_AUTHOR': frozenset({VIEW, COMMENT, EDIT}),
    'ACADEMIC_REVIEWER': frozenset({VIEW, COMMENT}),
    'VIEWER': frozenset({VIEW}),
}

WORKSPACE_CAPABILITIES = {
    'OWNER': ALL_CAPABILITIES,
    'ADMIN': ALL_CAPABILITIES,
    'COLLABORATOR': frozenset({VIEW, COMMENT, EDIT}),
    'VIEWER': frozenset({VIEW}),
}


def resolve_project(obj):
    """Walks from a project-owned object (section, document, task, ...) to its ResearchProject."""
    ResearchProject = apps.get_model('projects', 'ResearchProject')
    if isinstance(obj, ResearchProject):
        return obj
    project = getattr(obj, 'project', None)
    if project is not None:
        return project
    document = getattr(obj, 'document', None)
    if document is not None:
        return getattr(document, 'project', None)
    return None


def get_project_capabilities(user, project):
    """Returns the frozenset of capabilities `user` holds on `project`."""
    if project is None or not user or not getattr(user, 'is_authenticated', False):
        return frozenset()

    if project.owner_id == user.pk:
        return ALL_CAPABILITIES

    collected = set()
    ProjectCollaborator = apps.get_model('research', 'ProjectCollaborator')
    role = (
        ProjectCollaborator.objects
        .filter(project=project, user=user, is_active=True)
        .values_list('role', flat=True)
        .first()
    )
    if role:
        collected |= COLLABORATOR_CAPABILITIES.get(role, frozenset({VIEW}))

    if project.workspace_id:
        WorkspaceMembership = apps.get_model('workspaces', 'WorkspaceMembership')
        ws_role = (
            WorkspaceMembership.objects
            .filter(workspace_id=project.workspace_id, user=user)
            .values_list('role', flat=True)
            .first()
        )
        if ws_role:
            collected |= WORKSPACE_CAPABILITIES.get(ws_role, frozenset({VIEW}))

    return frozenset(collected)


def has_project_access(user, project, capability=VIEW):
    return capability in get_project_capabilities(user, project)


def require_project_access(user, project, capability=VIEW):
    """Raises DRF PermissionDenied (HTTP 403) unless `user` holds `capability` on `project`."""
    if not has_project_access(user, project, capability):
        raise PermissionDenied('You do not have permission to perform this action on this project.')
    return project


def accessible_projects_q(user, prefix=''):
    """Q filter matching projects the user owns, shares a workspace with, or actively collaborates on."""
    return (
        Q(**{f'{prefix}owner': user})
        | Q(**{f'{prefix}workspace__memberships__user': user})
        | Q(**{f'{prefix}collaborators__user': user, f'{prefix}collaborators__is_active': True})
    )


def required_capability(request, view):
    """
    Capability needed for this request. Safe methods need VIEW, unsafe methods need EDIT,
    unless the view declares `project_capabilities = {'POST': COMMENT, ...}`.
    """
    overrides = getattr(view, 'project_capabilities', None) or {}
    if request.method in overrides:
        return overrides[request.method]
    return VIEW if request.method in permissions.SAFE_METHODS else EDIT


class HasProjectAccess(permissions.BasePermission):
    """Object-level permission enforcing the project capability required by the request."""

    def has_object_permission(self, request, view, obj):
        project = resolve_project(obj)
        return has_project_access(request.user, project, required_capability(request, view))


class RequiresProjectApproval(permissions.BasePermission):
    """Object-level permission requiring the APPROVE capability (owners, supervisors, workspace admins)."""

    def has_object_permission(self, request, view, obj):
        return has_project_access(request.user, resolve_project(obj), APPROVE)
