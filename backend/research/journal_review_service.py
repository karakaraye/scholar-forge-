from typing import Dict, List, Any, Optional
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from projects.models import ResearchProject
from documents.models import DocumentSection
from research.models import (
    CorrectionTask,
    CorrectionTaskStatus,
    JournalReviewerResponse,
    RevisionCategory,
    ProjectCollaborator,
    CollaboratorRole,
    ManuscriptComment,
    CommentStatus,
    CollaborationAuditEvent,
)


class JournalReviewService:
    """
    Manages peer-review and journal revision response matrices, point-by-point
    author responses, verified-applied status enforcement, and supervisor project dashboards.
    """

    @classmethod
    def create_response_item(
        cls,
        project: ResearchProject,
        reviewer_label: str,
        comment_number: int,
        original_comment: str,
        revision_category: str = RevisionCategory.MINOR,
        target_section: DocumentSection = None,
        linked_correction_task: CorrectionTask = None,
        author_response: str = "",
        actor = None,
    ) -> JournalReviewerResponse:
        if not original_comment or not original_comment.strip():
            raise ValidationError("Original reviewer comment cannot be empty.")

        if revision_category not in RevisionCategory.values:
            raise ValidationError(f"Invalid revision category '{revision_category}'.")

        # Check if verified applied
        is_verified = False
        if linked_correction_task:
            if linked_correction_task.status in [CorrectionTaskStatus.APPROVED, CorrectionTaskStatus.RESOLVED]:
                is_verified = True

        response_item = JournalReviewerResponse.objects.create(
            project=project,
            reviewer_label=reviewer_label.strip(),
            comment_number=comment_number,
            original_comment=original_comment.strip(),
            revision_category=revision_category,
            target_section=target_section,
            linked_correction_task=linked_correction_task,
            author_response=author_response.strip(),
            is_verified_applied=is_verified,
        )

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=actor,
            event_type="REVIEWER_RESPONSE_CREATED",
            details={
                "response_id": str(response_item.id),
                "reviewer": reviewer_label,
                "comment_number": comment_number,
            }
        )

        return response_item

    @classmethod
    def update_author_response(
        cls,
        response_item: JournalReviewerResponse,
        author_response: str,
        revision_category: str = None,
        target_section: DocumentSection = None,
        linked_correction_task: CorrectionTask = None,
        actor = None,
    ) -> JournalReviewerResponse:
        response_item.author_response = author_response.strip()
        if revision_category:
            response_item.revision_category = revision_category
        if target_section is not None:
            response_item.target_section = target_section
        if linked_correction_task is not None:
            response_item.linked_correction_task = linked_correction_task

        # Verify applied condition
        if response_item.linked_correction_task:
            if response_item.linked_correction_task.status in [
                CorrectionTaskStatus.APPROVED,
                CorrectionTaskStatus.RESOLVED,
            ]:
                response_item.is_verified_applied = True
            else:
                response_item.is_verified_applied = False
        elif response_item.revision_category == RevisionCategory.REJECT_REQUEST and len(author_response) > 50:
            # Substantive rebuttal can be marked verified by supervisor
            response_item.is_verified_applied = True

        response_item.save()

        CollaborationAuditEvent.objects.create(
            project=response_item.project,
            actor=actor,
            event_type="REVIEWER_RESPONSE_UPDATED",
            details={
                "response_id": str(response_item.id),
                "is_verified_applied": response_item.is_verified_applied,
            }
        )

        return response_item

    @classmethod
    def generate_response_matrix_document(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Synthesizes a structured response document organized by reviewer.
        """
        items = JournalReviewerResponse.objects.filter(project=project).order_by(
            "reviewer_label", "comment_number"
        )

        reviewers_dict = {}
        total_items = items.count()
        applied_items = items.filter(is_verified_applied=True).count()

        for item in items:
            label = item.reviewer_label
            if label not in reviewers_dict:
                reviewers_dict[label] = []

            reviewers_dict[label].append({
                "id": str(item.id),
                "comment_number": item.comment_number,
                "original_comment": item.original_comment,
                "revision_category": item.revision_category,
                "target_section": item.target_section.title if item.target_section else "General",
                "author_response": item.author_response,
                "is_verified_applied": item.is_verified_applied,
            })

        markdown_doc = [
            f"# Response to Reviewers",
            f"**Project:** {project.title}",
            f"**Completion Status:** {applied_items}/{total_items} points addressed and verified.\n",
        ]

        for reviewer, comments in reviewers_dict.items():
            markdown_doc.append(f"## {reviewer}")
            for c in comments:
                status_icon = "[VERIFIED APPLIED]" if c["is_verified_applied"] else "[PENDING APPLICATION]"
                markdown_doc.append(f"### Comment {c['comment_number']} ({c['revision_category']}) - {status_icon}")
                markdown_doc.append(f"> \"{c['original_comment']}\"\n")
                markdown_doc.append(f"**Section:** {c['target_section']}")
                markdown_doc.append(f"**Author Response:** {c['author_response'] or '_No response formulated yet._'}\n")

        return {
            "project_id": str(project.id),
            "total_comments": total_items,
            "verified_applied_count": applied_items,
            "compliance_rate_percent": round((applied_items / total_items * 100), 1) if total_items > 0 else 100.0,
            "matrix_by_reviewer": reviewers_dict,
            "formatted_markdown": "\n".join(markdown_doc),
        }

    @classmethod
    def get_supervisor_overview(cls, user) -> List[Dict[str, Any]]:
        """
        Returns a list of all projects where the given user is a SUPERVISOR or ACADEMIC_REVIEWER,
        including student/owner info, pending corrections, and unresolved comments count.
        """
        collaborations = ProjectCollaborator.objects.filter(
            user=user,
            role__in=[CollaboratorRole.SUPERVISOR, CollaboratorRole.ACADEMIC_REVIEWER],
            is_active=True,
        ).select_related("project", "project__owner")

        overview = []
        for collab in collaborations:
            proj = collab.project
            pending_tasks = CorrectionTask.objects.filter(
                project=proj,
                status__in=[CorrectionTaskStatus.OPEN, CorrectionTaskStatus.READY_FOR_REVIEW],
            ).count()

            open_comments = ManuscriptComment.objects.filter(
                project=proj,
                status__in=[CommentStatus.OPEN],
            ).count()

            overview.append({
                "project_id": str(proj.id),
                "title": proj.title,
                "role": collab.role,
                "student_name": f"{proj.owner.first_name} {proj.owner.last_name}".strip() or proj.owner.username,
                "student_email": proj.owner.email,
                "discipline": proj.discipline.name if proj.discipline else "General",
                "academic_level": proj.academic_level,
                "pending_tasks_count": pending_tasks,
                "open_comments_count": open_comments,
                "last_active": proj.updated_at.isoformat() if proj.updated_at else None,
            })

        return overview
