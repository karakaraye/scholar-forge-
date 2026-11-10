import re
import logging
from typing import Dict, Any, List, Optional
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from projects.models import ResearchProject
from documents.models import ResearchDocument, DocumentSection, DocumentVersion
from research.models import (
    FormattingChange,
    FormattingValidation,
    FormattingIssue,
    TemplateVersion,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class SafeAutoformatService:
    """
    Non-destructive auto-formatting service with automated pre-execution snapshotting,
    granular change auditing, and one-click rollback capabilities.
    """

    @classmethod
    def preview_autoformat_changes(
        cls,
        project: ResearchProject,
        template_version: Optional[TemplateVersion] = None,
    ) -> List[Dict[str, Any]]:
        """
        Calculates candidate non-destructive changes without modifying any data.
        """
        document = project.documents.first()
        if not document:
            return []

        assignment = getattr(project, 'template_assignment', None)
        rules = (template_version.rules_config if template_version else (
            assignment.template_version.rules_config if assignment else {}
        ))

        sections = document.sections.all().order_by('order_index')
        proposed_changes = []

        primary_font = rules.get('typography', {}).get('primary_font', 'Times New Roman')
        numbering_style = rules.get('chapter_structure', {}).get('numbering_style', 'ARABIC_DECIMAL')

        current_chapter = 0
        for sec in sections:
            content = sec.content or ""
            title = sec.title or ""
            changes_for_sec = []

            # 1. Heading renumbering check
            if numbering_style == 'ARABIC_DECIMAL':
                is_chapter = 'CHAPTER' in title.upper() or sec.order_index % 10 == 0
                if is_chapter:
                    current_chapter += 1
                    target_title = f"CHAPTER {current_chapter}: {re.sub(r'^(CHAPTER\s+\d+[:\s]+|[A-Z]\.\s+)', '', title, flags=re.IGNORECASE).strip().upper()}"
                else:
                    target_title = f"{current_chapter}.{sec.order_index % 10 if current_chapter > 0 else sec.order_index + 1} {re.sub(r'^(\d+\.\d+\s+|[A-Z]\.\s+)', '', title).strip()}"

                if target_title != title:
                    changes_for_sec.append({
                        'type': 'NORMALIZE_HEADING_NUMBERING',
                        'field': 'title',
                        'before': title,
                        'after': target_title,
                        'description': f"Normalize heading title to standard decimal format: '{target_title}'",
                    })

            # 2. Font family cleanup
            if 'font-family:' in content:
                new_content = re.sub(r'font-family:\s*[^;"]+;', f'font-family: "{primary_font}", serif;', content)
                if new_content != content:
                    changes_for_sec.append({
                        'type': 'STANDARDIZE_FONT_FAMILY',
                        'field': 'content',
                        'before_snippet': content[:150],
                        'after_snippet': new_content[:150],
                        'description': f"Normalize inline font-family to '{primary_font}'",
                    })

            # 3. Table caption formatting (ensure Table X prefix)
            if '<table' in content and not re.search(r'Table\s+\d+[:\s]+', content, re.IGNORECASE):
                # Propose wrapping table with caption prefix
                new_content = re.sub(r'(<table[^>]*>)', r'<p class="table-caption"><strong>Table [X]:</strong> [Descriptive Title]</p>\1', content, count=1)
                changes_for_sec.append({
                    'type': 'ADD_TABLE_CAPTION_PREFIX',
                    'field': 'content',
                    'before_snippet': content[:150],
                    'after_snippet': new_content[:150],
                    'description': "Add standardized 'Table [X]:' caption above table element.",
                })

            # 4. Figure caption formatting (ensure Figure Y prefix below)
            if '<img' in content and not re.search(r'Figure\s+\d+[:\s]+', content, re.IGNORECASE):
                new_content = re.sub(r'(<img[^>]*>)', r'\1<p class="figure-caption"><em>Figure [Y]: [Figure Description]</em></p>', content, count=1)
                changes_for_sec.append({
                    'type': 'ADD_FIGURE_CAPTION_PREFIX',
                    'field': 'content',
                    'before_snippet': content[:150],
                    'after_snippet': new_content[:150],
                    'description': "Add standardized 'Figure [Y]:' caption beneath figure image.",
                })

            if changes_for_sec:
                proposed_changes.append({
                    'section_id': str(sec.id),
                    'section_title': sec.title,
                    'changes': changes_for_sec,
                })

        return proposed_changes

    @classmethod
    def apply_autoformat(
        cls,
        project: ResearchProject,
        user: User,
        template_version: Optional[TemplateVersion] = None,
        selected_section_ids: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Executes safe auto-formatting:
        1. Creates a full pre-execution DocumentVersion snapshot.
        2. Applies non-destructive transformations.
        3. Records detailed FormattingChange audit records.
        """
        document = project.documents.first()
        if not document:
            return {'status': 'ERROR', 'message': 'Project has no document to format.'}

        with transaction.atomic():
            # Step 1: Create baseline pre-autoformat snapshot
            current_v = getattr(document, 'current_version_number', 1)
            snapshot = DocumentVersion.objects.create(
                document=document,
                version_number=current_v + 1,
                change_summary=f"Automated pre-formatting baseline snapshot before applying template format.",
                snapshot_data={
                    'sections': [
                    {
                        'id': str(s.id),
                        'title': s.title,
                        'order_index': s.order_index,
                        'content': s.content,
                        'word_count': s.word_count,
                    }
                    for s in document.sections.all().order_by('order_index')
                ]},
                created_by=user,
            )
            document.current_version_number = snapshot.version_number
            document.save(update_fields=['current_version_number'])

            # Step 2: Get proposed changes
            proposals = cls.preview_autoformat_changes(project, template_version)
            applied_count = 0

            for prop in proposals:
                sec_id = prop['section_id']
                if selected_section_ids and sec_id not in selected_section_ids:
                    continue

                section = DocumentSection.objects.filter(pk=sec_id).first()
                if not section:
                    continue

                before_state = {'title': section.title, 'content': section.content}
                after_state = {'title': section.title, 'content': section.content}

                for ch in prop['changes']:
                    ch_type = ch['type']
                    if ch_type == 'NORMALIZE_HEADING_NUMBERING':
                        section.title = ch['after']
                        after_state['title'] = ch['after']

                    elif ch_type == 'STANDARDIZE_FONT_FAMILY':
                        primary_font = "Times New Roman"
                        section.content = re.sub(r'font-family:\s*[^;"]+;', f'font-family: "{primary_font}", serif;', section.content or "")
                        after_state['content'] = section.content

                    elif ch_type == 'ADD_TABLE_CAPTION_PREFIX':
                        section.content = re.sub(
                            r'(<table[^>]*>)',
                            r'<p class="table-caption"><strong>Table:</strong> Descriptive Title</p>\1',
                            section.content or "",
                            count=1
                        )
                        after_state['content'] = section.content

                    elif ch_type == 'ADD_FIGURE_CAPTION_PREFIX':
                        section.content = re.sub(
                            r'(<img[^>]*>)',
                            r'\1<p class="figure-caption"><em>Figure: Description</em></p>',
                            section.content or "",
                            count=1
                        )
                        after_state['content'] = section.content

                section.save(update_fields=['title', 'content', 'word_count'])

                # Log formatting change
                FormattingChange.objects.create(
                    project=project,
                    section=section,
                    change_type=prop['changes'][0]['type'] if prop['changes'] else 'FORMATTING_UPDATE',
                    before_state=before_state,
                    after_state=after_state,
                    snapshot_version=snapshot,
                    applied_by=user,
                )
                applied_count += 1

        return {
            'status': 'SUCCESS',
            'sections_formatted': applied_count,
            'snapshot_version_number': snapshot.version_number,
            'snapshot_id': str(snapshot.id),
            'message': f"Successfully applied safe formatting to {applied_count} sections with snapshot #{snapshot.version_number} created.",
        }

    @classmethod
    def rollback_autoformat(
        cls,
        project: ResearchProject,
        snapshot_id: str,
        user: User,
    ) -> Dict[str, Any]:
        """
        Safely restores all document sections to the pre-autoformat snapshot state.
        """
        document = project.documents.first()
        if not document:
            return {'status': 'ERROR', 'message': 'No document found.'}

        snapshot = DocumentVersion.objects.filter(pk=snapshot_id, document=document).first()
        if not snapshot:
            return {'status': 'ERROR', 'message': 'Snapshot version not found.'}

        with transaction.atomic():
            sections_list = snapshot.snapshot_data.get('sections', []) if isinstance(snapshot.snapshot_data, dict) else []
            for sec_data in sections_list:
                sec = DocumentSection.objects.filter(pk=sec_data['id']).first()
                if sec:
                    sec.title = sec_data['title']
                    sec.content = sec_data['content']
                    sec.order_index = sec_data.get('order_index', 0)
                    sec.word_count = sec_data.get('word_count', 0)
                    sec.save(update_fields=['title', 'content', 'order_index', 'word_count'])

            # Create a post-rollback version record
            new_v_num = document.current_version_number + 1
            DocumentVersion.objects.create(
                document=document,
                version_number=new_v_num,
                change_summary=f"Reverted formatting changes back to pre-autoformat baseline #{snapshot.version_number}.",
                snapshot_data=snapshot.snapshot_data,
                created_by=user,
            )
            document.current_version_number = new_v_num
            document.save(update_fields=['current_version_number'])

        return {
            'status': 'SUCCESS',
            'restored_version_number': snapshot.version_number,
            'new_current_version_number': new_v_num,
            'message': f"Document successfully restored to pre-autoformat state #{snapshot.version_number}.",
        }
