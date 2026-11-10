import secrets
import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
from documents.models import DocumentSection
from projects.models import ResearchProject
from scholarforge.emails import send_project_invitation_email
from research.models import (
    ProjectCollaborator,
    CollaboratorRole,
    ProjectInvitation,
    InvitationStatus,
    CollaborationAuditEvent,
)

User = get_user_model()


class CollaborationService:
    """
    Manages project-level collaborator invitations, role assignments,
    access revocations, and collaboration audit event tracking.
    """

    @staticmethod
    def is_project_admin(project: ResearchProject, user: User) -> bool:
        from projects.access import MANAGE, has_project_access
        return has_project_access(user, project, MANAGE)

    @staticmethod
    def get_user_role(project: ResearchProject, user: User) -> str:
        if not user or not user.is_authenticated:
            return None
        if project.owner == user:
            return CollaboratorRole.PROJECT_OWNER

        collab = ProjectCollaborator.objects.filter(
            project=project,
            user=user,
            is_active=True
        ).first()

        if collab:
            return collab.role
        return None

    @classmethod
    def invite_collaborator(
        cls,
        project: ResearchProject,
        invited_by: User,
        invitee_email: str,
        role: str,
        assigned_sections=None
    ) -> ProjectInvitation:
        if not cls.is_project_admin(project, invited_by):
            raise PermissionDenied("Only project owners and administrators can invite collaborators.")

        if role not in CollaboratorRole.values:
            raise ValidationError(f"Invalid role '{role}'. Must be one of {CollaboratorRole.values}.")

        assigned_sections = cls.normalize_assigned_sections(project, assigned_sections)

        # Check if already an active collaborator
        existing_user = User.objects.filter(email__iexact=invitee_email).first()
        if existing_user:
            if existing_user == project.owner:
                raise ValidationError("Cannot invite the project owner as a collaborator.")
            if ProjectCollaborator.objects.filter(project=project, user=existing_user, is_active=True).exists():
                raise ValidationError(f"User with email '{invitee_email}' is already an active collaborator.")

        # Generate unique token and 7-day expiration
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(days=7)

        # Cancel any previous pending invitations for this email
        ProjectInvitation.objects.filter(
            project=project,
            invitee_email__iexact=invitee_email,
            status=InvitationStatus.PENDING
        ).update(status=InvitationStatus.REVOKED)

        invitation = ProjectInvitation.objects.create(
            project=project,
            invited_by=invited_by,
            invitee_email=invitee_email.lower().strip(),
            role=role,
            assigned_sections=assigned_sections or [],
            token=token,
            status=InvitationStatus.PENDING,
            expires_at=expires_at
        )

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=invited_by,
            event_type="INVITATION_SENT",
            details={
                "invitation_id": str(invitation.id),
                "invitee_email": invitation.invitee_email,
                "role": role,
                "expires_at": expires_at.isoformat(),
            }
        )

        invitation.email_sent = send_project_invitation_email(invitation)
        return invitation

    @staticmethod
    def normalize_assigned_sections(project: ResearchProject, assigned_sections) -> list:
        """
        Validates that every assigned section ID belongs to one of the project's documents.
        An empty list means the collaborator is not scoped to particular sections.
        """
        if not assigned_sections:
            return []
        if not isinstance(assigned_sections, (list, tuple)):
            raise ValidationError("assigned_sections must be a list of section IDs.")

        requested = []
        for raw in assigned_sections:
            try:
                requested.append(str(uuid.UUID(str(raw))))
            except (ValueError, TypeError):
                raise ValidationError(f"'{raw}' is not a valid section ID.")

        found = {
            str(pk) for pk in DocumentSection.objects.filter(
                document__project=project, id__in=requested
            ).values_list('id', flat=True)
        }
        missing = [sid for sid in requested if sid not in found]
        if missing:
            raise ValidationError(f"Sections not found in this project: {', '.join(missing)}")
        # De-duplicate while preserving order
        return list(dict.fromkeys(requested))

    @staticmethod
    def get_invitation_for_user(token: str, user: User) -> ProjectInvitation:
        """
        Returns the invitation addressed to `user`. Unknown tokens and invitations for other
        addresses both raise the same error so tokens cannot be probed.
        """
        invitation = (
            ProjectInvitation.objects
            .select_related('project', 'project__owner', 'invited_by')
            .filter(token=token)
            .first()
        )
        if not invitation or invitation.invitee_email.lower().strip() != user.email.lower().strip():
            raise ValidationError("Invitation not found.")
        if invitation.status == InvitationStatus.PENDING and invitation.is_expired:
            invitation.status = InvitationStatus.EXPIRED
            invitation.save(update_fields=['status'])
        return invitation

    @classmethod
    def accept_invitation(cls, token: str, user: User) -> ProjectCollaborator:
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to accept invitation.")

        invitation = ProjectInvitation.objects.filter(token=token).first()
        if not invitation:
            raise ValidationError("Invitation not found.")

        if invitation.status != InvitationStatus.PENDING:
            raise ValidationError(f"Invitation cannot be accepted because it is '{invitation.status}'.")

        if invitation.is_expired:
            invitation.status = InvitationStatus.EXPIRED
            invitation.save(update_fields=['status'])
            raise ValidationError("Invitation has expired.")

        # Validate that the accepting user's email matches the invitation
        if user.email.lower().strip() != invitation.invitee_email.lower().strip():
            raise PermissionDenied(
                f"Invitation is addressed to '{invitation.invitee_email}', not '{user.email}'."
            )

        # Create or reactivate collaborator record
        collaborator, created = ProjectCollaborator.objects.update_or_create(
            project=invitation.project,
            user=user,
            defaults={
                "role": invitation.role,
                "assigned_sections": invitation.assigned_sections,
                "is_active": True,
            }
        )

        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=['status', 'accepted_at'])

        CollaborationAuditEvent.objects.create(
            project=invitation.project,
            actor=user,
            event_type="INVITATION_ACCEPTED",
            details={
                "invitation_id": str(invitation.id),
                "role": invitation.role,
                "collaborator_id": str(collaborator.id),
            }
        )

        return collaborator

    @classmethod
    def reject_invitation(cls, token: str, user: User) -> ProjectInvitation:
        if not user or not user.is_authenticated:
            raise PermissionDenied("Authentication required to decline an invitation.")

        invitation = ProjectInvitation.objects.filter(token=token).first()
        if not invitation or invitation.invitee_email.lower().strip() != user.email.lower().strip():
            raise ValidationError("Invitation not found.")

        if invitation.status != InvitationStatus.PENDING:
            raise ValidationError(f"Invitation is already '{invitation.status}'.")

        invitation.status = InvitationStatus.REJECTED
        invitation.save(update_fields=['status'])

        CollaborationAuditEvent.objects.create(
            project=invitation.project,
            actor=user if user and user.is_authenticated else None,
            event_type="INVITATION_REJECTED",
            details={"invitation_id": str(invitation.id)}
        )

        return invitation

    @classmethod
    def revoke_invitation(cls, invitation_id: str, actor: User) -> ProjectInvitation:
        invitation = ProjectInvitation.objects.filter(id=invitation_id).first()
        if not invitation:
            raise ValidationError("Invitation not found.")

        if not cls.is_project_admin(invitation.project, actor):
            raise PermissionDenied("Only project owners and administrators can revoke invitations.")

        if invitation.status != InvitationStatus.PENDING:
            raise ValidationError("Only pending invitations can be revoked.")

        invitation.status = InvitationStatus.REVOKED
        invitation.save(update_fields=['status'])

        CollaborationAuditEvent.objects.create(
            project=invitation.project,
            actor=actor,
            event_type="INVITATION_REVOKED",
            details={"invitation_id": str(invitation.id)}
        )

        return invitation

    @classmethod
    def update_collaborator_role(
        cls,
        project: ResearchProject,
        collaborator_id: str,
        new_role: str,
        assigned_sections: list,
        actor: User
    ) -> ProjectCollaborator:
        if not cls.is_project_admin(project, actor):
            raise PermissionDenied("Only project owners and administrators can modify roles.")

        if new_role is not None and new_role not in CollaboratorRole.values:
            raise ValidationError(f"Invalid role '{new_role}'.")

        collab = ProjectCollaborator.objects.filter(id=collaborator_id, project=project).first()
        if not collab:
            raise ValidationError("Collaborator not found.")

        old_role = collab.role
        if new_role is not None:
            collab.role = new_role
        if assigned_sections is not None:
            collab.assigned_sections = cls.normalize_assigned_sections(project, assigned_sections)
        collab.save()
        new_role = collab.role

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=actor,
            event_type="ROLE_CHANGED",
            details={
                "collaborator_id": str(collab.id),
                "target_user_id": str(collab.user.id),
                "old_role": old_role,
                "new_role": new_role,
            }
        )

        return collab

    @classmethod
    def remove_collaborator(cls, project: ResearchProject, collaborator_id: str, actor: User) -> None:
        if not cls.is_project_admin(project, actor):
            raise PermissionDenied("Only project owners and administrators can remove collaborators.")

        collab = ProjectCollaborator.objects.filter(id=collaborator_id, project=project).first()
        if not collab:
            raise ValidationError("Collaborator not found.")

        if collab.user == project.owner:
            raise ValidationError("Cannot remove the project owner.")

        collab.is_active = False
        collab.save(update_fields=['is_active'])

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=actor,
            event_type="COLLABORATOR_REMOVED",
            details={
                "collaborator_id": str(collab.id),
                "removed_user_id": str(collab.user.id),
            }
        )
