"""
Object-level permissions for manuscript documents and sections.

Both classes defer to the central project access policy (`projects.access`):
reads need VIEW on the owning project and writes need EDIT, so invited
ProjectCollaborators get exactly the access their role grants.
"""

from projects.access import HasProjectAccess


class IsDocumentOwnerOrWorkspaceMember(HasProjectAccess):
    """Access to a ResearchDocument according to the requester's role on its project."""


class IsSectionOwnerOrWorkspaceMember(HasProjectAccess):
    """Access to a DocumentSection according to the requester's role on its document's project."""
