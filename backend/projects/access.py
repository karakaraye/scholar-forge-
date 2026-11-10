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


# ---------------------------------------------------------------------------
# Section scoping (ProjectCollaborator.assigned_sections)
#
# A collaborator whose `assigned_sections` is non-empty may still READ the whole
# manuscript, but may only edit, comment on, or raise corrections against the
# assigned sections and their subsections. Manuscript-wide operations (restore,
# reorder, apply template, auto-format) need an unscoped role. Owners and
# workspace members are never section-scoped.
# ---------------------------------------------------------------------------

def get_section_scope(user, project):
    """
    Returns None when the user is not section-scoped on `project`, otherwise the
    frozenset of section-ID strings they may write to.
    """
    if project is None or not user or not getattr(user, 'is_authenticated', False):
        return frozenset()
    if project.owner_id == user.pk:
        return None
    if project.workspace_id:
        WorkspaceMembership = apps.get_model('workspaces', 'WorkspaceMembership')
        if WorkspaceMembership.objects.filter(workspace_id=project.workspace_id, user=user).exists():
            return None
    ProjectCollaborator = apps.get_model('research', 'ProjectCollaborator')
    assigned = (
        ProjectCollaborator.objects
        .filter(project=project, user=user, is_active=True)
        .values_list('assigned_sections', flat=True)
        .first()
    )
    if not assigned:
        return None
    return frozenset(str(section_id) for section_id in assigned)


def section_in_scope(section, scope):
    """True when `scope` is unrestricted or contains `section` or one of its ancestors."""
    if scope is None:
        return True
    current, hops = section, 0
    while current is not None and hops < 32:
        if str(current.pk) in scope:
            return True
        current = current.parent_section
        hops += 1
    return False


def has_section_access(user, section, capability=EDIT):
    project = resolve_project(section)
    if not has_project_access(user, project, capability):
        return False
    if capability == VIEW:
        return True
    return section_in_scope(section, get_section_scope(user, project))


def require_section_access(user, section, capability=EDIT):
    if not has_section_access(user, section, capability):
        raise PermissionDenied(
            'You can only change the manuscript sections assigned to you on this project.'
        )
    return section


def has_full_manuscript_access(user, project, capability=EDIT):
    """Capability on the project AND not limited to particular sections."""
    if not has_project_access(user, project, capability):
        return False
    return capability == VIEW or get_section_scope(user, project) is None


def require_full_manuscript_access(user, project, capability=EDIT):
    if not has_full_manuscript_access(user, project, capability):
        raise PermissionDenied(
            'This action affects the whole manuscript and is not available to section-scoped collaborators.'
        )
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
    """
    Object-level permission enforcing the project capability required by the request.

    Section scoping: unsafe requests on a DocumentSection are limited to the requester's
    assigned sections; unsafe requests on a whole ResearchDocument require an unscoped
    role unless the view sets `allow_section_scoped_writes = True` and checks the
    affected section itself.
    """

    message = 'You do not have permission to perform this action on this project.'

    def has_object_permission(self, request, view, obj):
        project = resolve_project(obj)
        capability = required_capability(request, view)
        if not has_project_access(request.user, project, capability):
            return False
        if capability == VIEW:
            return True

        DocumentSection = apps.get_model('documents', 'DocumentSection')
        ResearchDocument = apps.get_model('documents', 'ResearchDocument')
        if isinstance(obj, DocumentSection):
            if not section_in_scope(obj, get_section_scope(request.user, project)):
                self.message = 'You can only change the manuscript sections assigned to you on this project.'
                return False
        elif isinstance(obj, ResearchDocument) and not getattr(view, 'allow_section_scoped_writes', False):
            if get_section_scope(request.user, project) is not None:
                self.message = 'This action affects the whole manuscript and is not available to section-scoped collaborators.'
                return False
        return True


class RequiresProjectApproval(permissions.BasePermission):
    """Object-level permission requiring the APPROVE capability (owners, supervisors, workspace admins)."""

    def has_object_permission(self, request, view, obj):
        return has_project_access(request.user, resolve_project(obj), APPROVE)
