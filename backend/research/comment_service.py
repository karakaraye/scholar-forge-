from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model
from projects.models import ResearchProject
from documents.models import ResearchDocument, DocumentSection
from research.models import (
    ManuscriptComment,
    CommentReply,
    CommentStatus,
    CollaborationAuditEvent,
)

User = get_user_model()


class CommentService:
    """
    Manages manuscript inline comments, replies, resolution states,
    anchor tracking, and orphan detection upon subsequent edits.
    """

    @classmethod
    def create_comment(
        cls,
        project: ResearchProject,
        author: User,
        content: str,
        document: ResearchDocument = None,
        section: DocumentSection = None,
        anchor_text: str = "",
        anchor_prefix: str = "",
        anchor_suffix: str = "",
        start_offset: int = 0,
        end_offset: int = 0,
    ) -> ManuscriptComment:
        if not content or not content.strip():
            raise ValidationError("Comment content cannot be empty.")

        comment = ManuscriptComment.objects.create(
            project=project,
            document=document,
            section=section,
            author=author,
            content=content.strip(),
            anchor_text=anchor_text.strip() if anchor_text else "",
            anchor_prefix=anchor_prefix or "",
            anchor_suffix=anchor_suffix or "",
            start_offset=start_offset if start_offset is not None else 0,
            end_offset=end_offset if end_offset is not None else 0,
            status=CommentStatus.OPEN,
        )

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=author,
            event_type="COMMENT_CREATED",
            details={
                "comment_id": str(comment.id),
                "section_id": str(section.id) if section else None,
                "anchor_text_preview": anchor_text[:60] if anchor_text else "",
            }
        )

        return comment

    @classmethod
    def add_reply(cls, comment: ManuscriptComment, author: User, content: str) -> CommentReply:
        if not content or not content.strip():
            raise ValidationError("Reply content cannot be empty.")

        reply = CommentReply.objects.create(
            comment=comment,
            author=author,
            content=content.strip()
        )

        CollaborationAuditEvent.objects.create(
            project=comment.project,
            actor=author,
            event_type="COMMENT_REPLIED",
            details={
                "comment_id": str(comment.id),
                "reply_id": str(reply.id),
            }
        )

        return reply

    @classmethod
    def update_status(cls, comment: ManuscriptComment, new_status: str, actor: User) -> ManuscriptComment:
        if new_status in ("REOPEN", "REOPENED"):
            new_status = CommentStatus.OPEN
        elif new_status not in CommentStatus.values:
            raise ValidationError(f"Invalid comment status '{new_status}'.")

        old_status = comment.status
        comment.status = new_status
        comment.save(update_fields=['status'])

        CollaborationAuditEvent.objects.create(
            project=comment.project,
            actor=actor,
            event_type="COMMENT_STATUS_CHANGED",
            details={
                "comment_id": str(comment.id),
                "old_status": old_status,
                "new_status": new_status,
            }
        )

        return comment

    @classmethod
    def check_and_relocate_anchors(cls, document: ResearchDocument, full_text: str) -> dict:
        """
        Scans all comments attached to this document.
        If anchor_text exists in full_text, recalibrates offsets.
        If anchor_text cannot be found anywhere, marks comment as ORPHANED.
        """
        comments = ManuscriptComment.objects.filter(
            document=document
        ).exclude(status__in=[CommentStatus.RESOLVED])

        relocated_count = 0
        orphaned_count = 0

        for comment in comments:
            if not comment.anchor_text:
                continue

            target = comment.anchor_text
            # Try to match with context first
            context_pattern = f"{comment.anchor_prefix}{target}{comment.anchor_suffix}"
            idx = -1
            if comment.anchor_prefix and context_pattern in full_text:
                prefix_idx = full_text.find(context_pattern)
                idx = prefix_idx + len(comment.anchor_prefix)
            elif target in full_text:
                idx = full_text.find(target)

            if idx != -1:
                # Text still exists: update offsets and ensure status is OPEN if previously orphaned
                new_start = idx
                new_end = idx + len(target)
                if comment.start_offset != new_start or comment.end_offset != new_end:
                    comment.start_offset = new_start
                    comment.end_offset = new_end
                    if comment.status == CommentStatus.ORPHANED:
                        comment.status = CommentStatus.OPEN
                    comment.save(update_fields=['start_offset', 'end_offset', 'status'])
                    relocated_count += 1
            else:
                # Text was deleted or heavily mutated
                if comment.status != CommentStatus.ORPHANED:
                    comment.status = CommentStatus.ORPHANED
                    comment.save(update_fields=['status'])
                    orphaned_count += 1

        return {
            "relocated_count": relocated_count,
            "orphaned_count": orphaned_count,
        }
