"""
DRF permission classes for project-scoped endpoints.

All role logic lives in `projects.access`; these classes are thin adapters kept
under their historical names so existing views and docs continue to resolve.
"""

from projects.access import (
    APPROVE,
    HasProjectAccess,
    RequiresProjectApproval,
    has_project_access,
    resolve_project,
)


class IsProjectOwnerOrWorkspaceMember(HasProjectAccess):
    """
    Safe methods require VIEW on the project; unsafe methods require EDIT unless the
    view declares `project_capabilities` overrides (e.g. {'POST': COMMENT}).
    Grants access to owners, active ProjectCollaborators and workspace members
    according to their role.
    """


class CanEditProjectManuscript(HasProjectAccess):
    """
    Read access for anyone with VIEW; manuscript mutations require EDIT
    (owner, PROJECT_OWNER / CO_AUTHOR collaborators, workspace OWNER / ADMIN / COLLABORATOR).
    """


class IsProjectSupervisorOrOwner(RequiresProjectApproval):
    """
    Requires APPROVE: project owner, PROJECT_OWNER or SUPERVISOR collaborators,
    workspace OWNER / ADMIN.
    """


__all__ = [
    'APPROVE',
    'CanEditProjectManuscript',
    'IsProjectOwnerOrWorkspaceMember',
    'IsProjectSupervisorOrOwner',
    'has_project_access',
    'resolve_project',
]
