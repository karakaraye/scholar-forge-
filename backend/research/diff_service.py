import difflib
from typing import Dict, List, Any
from django.core.exceptions import ValidationError
from django.db import transaction
from documents.models import ResearchDocument, DocumentSection, DocumentVersion
from research.models import CollaborationAuditEvent


class RevisionDiffService:
    """
    Computes high-precision word-level and paragraph-level diffs between
    manuscript versions and handles non-destructive safe version restorations.
    """

    @classmethod
    def get_version_text(cls, document: ResearchDocument, version_number: int) -> str:
        if version_number == document.current_version_number:
            sections = document.sections.all().order_by('order_index')
            return "\n\n".join([s.content for s in sections if s.content])

        v_obj = DocumentVersion.objects.filter(
            document=document,
            version_number=version_number
        ).first()

        if not v_obj:
            # Graceful fallback: if requested version is <= earliest recorded snapshot, use earliest snapshot
            earliest_v = DocumentVersion.objects.filter(document=document).order_by('version_number').first()
            if earliest_v and version_number <= earliest_v.version_number:
                v_obj = earliest_v
            else:
                # Fallback to current sections if no snapshot is available
                sections = document.sections.all().order_by('order_index')
                return "\n\n".join([s.content for s in sections if s.content])

        data = v_obj.snapshot_data or {}
        if "full_text" in data and data["full_text"]:
            return data["full_text"]

        saved_sections = data.get("sections", [])
        if saved_sections:
            return "\n\n".join([s.get("content", "") for s in saved_sections if s.get("content")])

        return ""

    @classmethod
    def compute_word_diff(cls, old_text: str, new_text: str) -> Dict[str, Any]:
        """
        Calculates word-by-word differences between two text revisions.
        Returns additions, deletions, word counts, and diff tokens.
        """
        old_words = (old_text or "").split()
        new_words = (new_text or "").split()

        matcher = difflib.SequenceMatcher(None, old_words, new_words)
        diff_chunks = []
        words_added = 0
        words_deleted = 0
        words_unchanged = 0

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                chunk = " ".join(old_words[i1:i2])
                words_unchanged += (i2 - i1)
                diff_chunks.append({"type": "equal", "text": chunk})
            elif tag == "delete":
                chunk = " ".join(old_words[i1:i2])
                words_deleted += (i2 - i1)
                diff_chunks.append({"type": "deleted", "text": chunk})
            elif tag == "insert":
                chunk = " ".join(new_words[j1:j2])
                words_added += (j2 - j1)
                diff_chunks.append({"type": "added", "text": chunk})
            elif tag == "replace":
                del_chunk = " ".join(old_words[i1:i2])
                add_chunk = " ".join(new_words[j1:j2])
                words_deleted += (i2 - i1)
                words_added += (j2 - j1)
                diff_chunks.append({"type": "deleted", "text": del_chunk})
                diff_chunks.append({"type": "added", "text": add_chunk})

        return {
            "chunks": diff_chunks,
            "words_added": words_added,
            "words_deleted": words_deleted,
            "words_unchanged": words_unchanged,
            "net_word_change": words_added - words_deleted,
            "old_total_words": len(old_words),
            "new_total_words": len(new_words),
        }

    @classmethod
    def compute_paragraph_diff(cls, old_text: str, new_text: str) -> List[Dict[str, Any]]:
        """
        Calculates paragraph-level diffs for structural side-by-side or unified view.
        """
        old_paras = [p.strip() for p in (old_text or "").split("\n\n") if p.strip()]
        new_paras = [p.strip() for p in (new_text or "").split("\n\n") if p.strip()]

        matcher = difflib.SequenceMatcher(None, old_paras, new_paras)
        para_diffs = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for p in old_paras[i1:i2]:
                    para_diffs.append({"type": "equal", "content": p})
            elif tag == "delete":
                for p in old_paras[i1:i2]:
                    para_diffs.append({"type": "deleted", "content": p})
            elif tag == "insert":
                for p in new_paras[j1:j2]:
                    para_diffs.append({"type": "added", "content": p})
            elif tag == "replace":
                for p in old_paras[i1:i2]:
                    para_diffs.append({"type": "deleted", "content": p})
                for p in new_paras[j1:j2]:
                    para_diffs.append({"type": "added", "content": p})

        return para_diffs

    @classmethod
    def compare_versions(
        cls,
        document: ResearchDocument,
        base_version_number: int,
        target_version_number: int
    ) -> Dict[str, Any]:
        """
        Retrieves two versions of a document and generates detailed diff statistics.
        """
        base_text = cls.get_version_text(document, base_version_number)
        target_text = cls.get_version_text(document, target_version_number)

        word_diff = cls.compute_word_diff(base_text, target_text)
        para_diff = cls.compute_paragraph_diff(base_text, target_text)

        return {
            "document_id": str(document.id),
            "base_version": base_version_number,
            "target_version": target_version_number,
            "word_diff": word_diff,
            "paragraph_diff": para_diff,
        }

    @classmethod
    def restore_version_safely(
        cls,
        document: ResearchDocument,
        target_version_number: int,
        actor
    ) -> Dict[str, Any]:
        """
        Restores document content from a prior version by creating a NEW version snapshot.
        Preserves all historical versions, review records, and audit events.
        """
        target_obj = DocumentVersion.objects.filter(
            document=document,
            version_number=target_version_number
        ).first()

        if not target_obj:
            raise ValidationError(f"Cannot restore: Version {target_version_number} does not exist.")

        saved_sections = (target_obj.snapshot_data or {}).get("sections", [])
        if not saved_sections:
            raise ValidationError(f"Target version {target_version_number} has no recorded sections to restore.")

        with transaction.atomic():
            # 1. Take snapshot of current state
            current_sections = document.sections.all().order_by('order_index')
            current_snapshot = [
                {
                    "id": str(s.id),
                    "parent_section_id": str(s.parent_section_id) if s.parent_section_id else None,
                    "title": s.title,
                    "section_type": s.section_type,
                    "order_index": s.order_index,
                    "content": s.content,
                    "word_count": s.word_count,
                }
                for s in current_sections
            ]
            checkpoint_v = document.current_version_number + 1
            DocumentVersion.objects.create(
                document=document,
                version_number=checkpoint_v,
                snapshot_data={
                    "document_title": document.title,
                    "version_number": checkpoint_v,
                    "sections": current_snapshot,
                },
                created_by=actor,
                change_summary=f"Automated checkpoint prior to restoring version {target_version_number}",
            )

            # 2. Restore sections
            for s_data in saved_sections:
                sec = document.sections.filter(title=s_data.get("title")).first()
                if not sec:
                    sec = document.sections.filter(order_index=s_data.get("order_index", 0)).first()
                if sec:
                    sec.content = s_data.get("content", "")
                    sec.save()

            # 3. Increment document version
            new_v = checkpoint_v + 1
            document.current_version_number = new_v
            document.save()

            # 4. Create version record for restored state
            restored_version_obj = DocumentVersion.objects.create(
                document=document,
                version_number=new_v,
                snapshot_data={
                    "document_title": document.title,
                    "version_number": new_v,
                    "sections": saved_sections,
                },
                created_by=actor,
                change_summary=f"Restored state from version {target_version_number}",
            )

        CollaborationAuditEvent.objects.create(
            project=document.project,
            actor=actor,
            event_type="VERSION_RESTORED",
            details={
                "document_id": str(document.id),
                "from_version": target_version_number,
                "new_version": new_v,
            }
        )

        return {
            "status": "restored",
            "from_version": target_version_number,
            "new_version": new_v,
            "version_id": str(restored_version_obj.id),
        }
