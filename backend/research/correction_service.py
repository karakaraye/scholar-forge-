import re
from typing import Dict, List, Any, Optional
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils import timezone
from projects.models import ResearchProject
from documents.models import (
    ResearchDocument,
    DocumentSection,
    DocumentVersion,
)
from research.models import (
    SupervisorFeedback,
    CorrectionTask,
    CorrectionCategory,
    CorrectionTaskStatus,
    CorrectionPriority,
    ManuscriptComment,
    CollaborationAuditEvent,
)
from research.collaboration_service import CollaborationService

CATEGORY_KEYWORDS = {
    CorrectionCategory.THEORETICAL_FRAMEWORK: ["theory", "theoretical", "framework", "conceptual", "construct", "paradigm"],
    CorrectionCategory.CONCEPTUAL_REVIEW: ["concept", "conceptual", "definition", "model", "terminology"],
    CorrectionCategory.EMPIRICAL_LITERATURE: ["literature", "gap", "background", "prior work", "state of the art", "related work", "empirical studies"],
    CorrectionCategory.RESEARCH_METHODOLOGY: ["method", "methodology", "validity", "reliability", "instrument", "procedure", "rigor", "sample", "sampling", "participants"],
    CorrectionCategory.STATISTICAL_INTERPRETATION: ["statistical", "data analysis", "coding", "regression", "p-value", "quantitative", "anova", "chi-square", "results", "findings", "interpretation"],
    CorrectionCategory.RESEARCH_OBJECTIVES: ["objective", "aim", "purpose", "scope", "goal"],
    CorrectionCategory.RESEARCH_QUESTIONS: ["question", "research question", "rq", "inquiry"],
    CorrectionCategory.HYPOTHESIS_FORMULATION: ["hypothesis", "hypotheses", "h1", "null hypothesis", "h0"],
    CorrectionCategory.CITATION_CORRECTION: ["citation", "reference", "cite", "bibliography", "source", "doi"],
    CorrectionCategory.ACADEMIC_TONE: ["tone", "voice", "passive", "phrasing", "jargon", "clarity", "prose", "informal"],
    CorrectionCategory.GRAMMAR_AND_CLARITY: ["grammar", "spelling", "punctuation", "syntax", "word choice", "typo", "clarity"],
    CorrectionCategory.MANUSCRIPT_STRUCTURE: ["structure", "flow", "transition", "organization", "heading", "reorder", "paragraph"],
    CorrectionCategory.FORMATTING: ["format", "formatting", "apa", "ieee", "font", "margin", "spacing", "layout", "page"],
    CorrectionCategory.UNSUPPORTED_CLAIMS: ["unsupported", "claim", "evidence needed", "substantiate", "proof", "overstated"],
    CorrectionCategory.OTHER: ["general", "feedback", "revision", "note"],
}

PRIORITY_MAP = {
    CorrectionCategory.RESEARCH_METHODOLOGY: CorrectionPriority.HIGH,
    CorrectionCategory.STATISTICAL_INTERPRETATION: CorrectionPriority.CRITICAL,
    CorrectionCategory.UNSUPPORTED_CLAIMS: CorrectionPriority.CRITICAL,
    CorrectionCategory.EMPIRICAL_LITERATURE: CorrectionPriority.MEDIUM,
    CorrectionCategory.THEORETICAL_FRAMEWORK: CorrectionPriority.MEDIUM,
    CorrectionCategory.CONCEPTUAL_REVIEW: CorrectionPriority.MEDIUM,
    CorrectionCategory.RESEARCH_OBJECTIVES: CorrectionPriority.HIGH,
    CorrectionCategory.RESEARCH_QUESTIONS: CorrectionPriority.HIGH,
    CorrectionCategory.HYPOTHESIS_FORMULATION: CorrectionPriority.HIGH,
    CorrectionCategory.CITATION_CORRECTION: CorrectionPriority.MEDIUM,
    CorrectionCategory.ACADEMIC_TONE: CorrectionPriority.LOW,
    CorrectionCategory.GRAMMAR_AND_CLARITY: CorrectionPriority.LOW,
    CorrectionCategory.MANUSCRIPT_STRUCTURE: CorrectionPriority.MEDIUM,
    CorrectionCategory.FORMATTING: CorrectionPriority.LOW,
    CorrectionCategory.OTHER: CorrectionPriority.LOW,
}


class CorrectionService:
    """
    Coordinates supervisor feedback analysis, correction task life cycle,
    optimistic concurrency enforcement, version snapshotting, and stale invalidation.
    """

    @classmethod
    def classify_category(cls, text: str) -> str:
        text_lower = text.lower()
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return cat
        return CorrectionCategory.ACADEMIC_TONE

    @classmethod
    def match_section(cls, text: str, sections: List[DocumentSection]) -> Optional[DocumentSection]:
        text_lower = text.lower()
        for sec in sections:
            if sec.title and sec.title.lower() in text_lower:
                return sec
        # Check standard chapter mappings
        for sec in sections:
            title_lower = (sec.title or "").lower()
            if any(term in text_lower for term in ["intro", "introduction", "background"]) and "intro" in title_lower:
                return sec
            if any(term in text_lower for term in ["lit", "literature"]) and "literature" in title_lower:
                return sec
            if any(term in text_lower for term in ["method", "design", "methodology"]) and "method" in title_lower:
                return sec
            if any(term in text_lower for term in ["result", "finding", "data"]) and ("result" in title_lower or "finding" in title_lower):
                return sec
            if any(term in text_lower for term in ["discuss", "implication"]) and "discuss" in title_lower:
                return sec
            if any(term in text_lower for term in ["conclus", "recommend"]) and "conclus" in title_lower:
                return sec
        return sections[0] if sections else None

    @classmethod
    def detect_conflicts(cls, feedback_items: List[str]) -> List[Dict[str, Any]]:
        """
        Identifies contradictory instructions across supervisor feedback items.
        """
        conflicts = []
        expand_keywords = ["expand", "elaborate", "add more", "lengthen", "detail", "include more"]
        shorten_keywords = ["condense", "shorten", "reduce", "remove", "cut", "trim", "too long", "concise"]

        expand_items = []
        shorten_items = []

        for item in feedback_items:
            lower = item.lower()
            if any(k in lower for k in expand_keywords):
                expand_items.append(item)
            if any(k in lower for k in shorten_keywords):
                shorten_items.append(item)

        if expand_items and shorten_items:
            conflicts.append({
                "type": "LENGTH_CONTRADICTION",
                "message": "Conflicting guidance detected: Some instructions ask to expand content while others ask to condense or shorten sections.",
                "items": [expand_items[0], shorten_items[0]],
            })

        return conflicts

    @classmethod
    def check_missing_evidence(cls, category: str, text: str) -> Dict[str, Any]:
        """
        Checks if supervisor feedback demands missing empirical evidence or citations
        rather than simple prose rewrite.
        """
        text_lower = text.lower()
        evidence_indicators = [
            "collect more", "sample size is too small", "insufficient data",
            "gather data", "need empirical evidence", "statistical proof",
            "laboratory results", "missing participants", "cite authoritative sources",
            "add empirical citations", "need citations",
        ]

        needs_evidence = any(ind in text_lower for ind in evidence_indicators) or category in [
            CorrectionCategory.RESEARCH_METHODOLOGY,
            CorrectionCategory.STATISTICAL_INTERPRETATION,
            CorrectionCategory.UNSUPPORTED_CLAIMS,
        ]

        guidance = ""
        if needs_evidence:
            if "cite" in text_lower or "citation" in text_lower:
                guidance = "Action required: Researcher must identify verified peer-reviewed publications [Citation needed: Author, Year]. Do not invent sources."
            elif "sample" in text_lower or "data" in text_lower:
                guidance = "Action required: Researcher must supply empirical dataset or expand participant sampling. ScholarForge AI will not fabricate figures."
            else:
                guidance = "Action required: Empirical substantiation required from primary research findings."

        return {
            "requires_evidence": needs_evidence,
            "guidance": guidance,
        }

    @classmethod
    def _llm_analyze_items(cls, project, items: List[str], sections: List[DocumentSection]) -> Dict[int, Dict[str, Any]]:
        """
        Asks the configured language model to classify each feedback item, match it to a section
        and suggest how to address it. Returns {} when no model is configured or the call fails,
        in which case the keyword rules are used. Every value is validated before use.
        """
        if not items:
            return {}
        from research.llm_client import complete_json

        categories = list(CorrectionCategory.values)
        priorities = list(CorrectionPriority.values)
        section_ids = {str(s.id) for s in sections}
        evidence = {
            "project_title": project.title,
            "discipline": project.discipline.name if project.discipline else None,
            "manuscript_sections": [
                {"section_id": str(s.id), "title": s.title, "opening_text": re.sub(r"<[^>]+>", " ", s.content or "")[:400]}
                for s in sections[:60]
            ],
            "feedback_items": [{"index": i, "text": text[:1500]} for i, text in enumerate(items[:60])],
        }
        instructions = (
            "Classify each supervisor feedback item for a thesis revision tracker.\n"
            f"Allowed categories: {', '.join(categories)}.\n"
            f"Allowed priorities: {', '.join(priorities)}.\n"
            "Return JSON of the form {\"items\": [{\"index\": 0, \"category\": \"...\", \"priority\": \"...\", "
            "\"section_id\": \"<one of the supplied section_id values or null>\", "
            "\"requires_evidence\": true|false, \"guidance\": \"one or two sentences on how the researcher should "
            "address it\"}]}.\n"
            "Set requires_evidence to true when the feedback asks for new data, analyses or citations that only the "
            "researcher can supply. Guidance must not contain invented citations, numbers or findings."
        )
        data = complete_json(instructions, evidence, max_tokens=2500)
        if not data or not isinstance(data.get("items"), list):
            return {}

        plan: Dict[int, Dict[str, Any]] = {}
        for entry in data["items"]:
            if not isinstance(entry, dict):
                continue
            try:
                index = int(entry.get("index"))
            except (TypeError, ValueError):
                continue
            if not 0 <= index < len(items):
                continue
            category = entry.get("category")
            priority = entry.get("priority")
            section_id = entry.get("section_id")
            plan[index] = {
                "category": category if category in categories else None,
                "priority": priority if priority in priorities else None,
                "section_id": str(section_id) if section_id and str(section_id) in section_ids else None,
                "requires_evidence": bool(entry.get("requires_evidence")),
                "guidance": str(entry.get("guidance") or "")[:800],
            }
        return plan

    @classmethod
    def analyze_feedback(
        cls,
        feedback: SupervisorFeedback,
        actor=None,
        auto_create_tasks: bool = True
    ) -> Dict[str, Any]:
        """
        Analyzes supervisor feedback across 15 academic categories,
        matches sections, detects conflicts, and creates structured CorrectionTasks.
        """
        project = feedback.project
        sections = list(
            DocumentSection.objects.filter(document__project=project).order_by("order_index")
        )

        feedback_items = []
        if feedback.extracted_comments:
            for c in feedback.extracted_comments:
                if isinstance(c, dict):
                    feedback_items.append(c.get("text", ""))
                elif isinstance(c, str):
                    feedback_items.append(c)
        elif feedback.raw_content:
            feedback_items = [
                line.strip() for line in feedback.raw_content.splitlines() if line.strip()
            ]

        conflicts = cls.detect_conflicts(feedback_items)
        tasks_created = []
        category_counts = {cat: 0 for cat in CorrectionCategory.values}

        actionable_items = [
            item for item in feedback_items
            if item and not item.startswith("PDF text extraction completed")
        ]
        llm_plan = cls._llm_analyze_items(project, actionable_items, sections)
        sections_by_id = {str(s.id): s for s in sections}

        for item_index, item_text in enumerate(actionable_items):
            plan = llm_plan.get(item_index, {})

            category = plan.get("category") or cls.classify_category(item_text)
            category_counts[category] += 1
            priority = plan.get("priority") or PRIORITY_MAP.get(category, CorrectionPriority.MEDIUM)
            target_section = sections_by_id.get(plan.get("section_id") or "") or cls.match_section(item_text, sections)
            evidence_info = cls.check_missing_evidence(category, item_text)
            if plan.get("requires_evidence"):
                evidence_info["requires_evidence"] = True
                evidence_info["guidance"] = evidence_info["guidance"] or (
                    "Action required: Researcher must supply empirical evidence or verified sources. "
                    "ScholarForge AI will not fabricate figures or citations."
                )

            # Generate structured proposed text or template without fabricating citations
            doc_version = target_section.document.current_version_number if target_section and target_section.document else 1
            original_text = target_section.content if target_section else ""

            revision_guidance = plan.get("guidance", "")
            proposed_text = ""
            if evidence_info["requires_evidence"]:
                proposed_text = f"/* REVISION NOTE */\n{evidence_info['guidance']}\n\n{original_text}"
            else:
                proposed_text = (
                    f"/* Revised for {category.replace('_', ' ').title()} */\n"
                    f"{original_text}\n\n"
                    f"// Addressing supervisor request: {item_text}"
                )
            if revision_guidance:
                proposed_text = f"/* SUGGESTED REVISION APPROACH */\n{revision_guidance}\n\n{proposed_text}"

            if auto_create_tasks:
                task = CorrectionTask.objects.create(
                    project=project,
                    feedback_source=feedback,
                    section=target_section,
                    category=category,
                    priority=priority,
                    status=CorrectionTaskStatus.OPEN,
                    title=f"Address {category.replace('_', ' ').title()} revision",
                    instruction=item_text,
                    original_text=original_text[:1000] if original_text else "",
                    proposed_text=proposed_text,
                    expected_base_version=doc_version,
                )
                tasks_created.append(task)

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=actor or feedback.uploaded_by,
            event_type="FEEDBACK_ANALYZED",
            details={
                "feedback_id": str(feedback.id),
                "tasks_created_count": len(tasks_created),
                "conflicts_count": len(conflicts),
            }
        )

        return {
            "tasks_count": len(tasks_created),
            "tasks": tasks_created,
            "conflicts": conflicts,
            "category_breakdown": category_counts,
            "has_unextracted_annotations": feedback.has_unextracted_annotations,
            "analysis_engine": "language-model" if llm_plan else "keyword-rules",
        }

    @classmethod
    def apply_correction(
        cls,
        task: CorrectionTask,
        actor,
        new_content: str = None,
        force_override: bool = False
    ) -> Dict[str, Any]:
        """
        Applies a correction task to its target section with optimistic concurrency checks
        and automated snapshot version generation.
        """
        section = task.section
        if not section:
            raise ValidationError("Task does not have an associated target section.")

        document = section.document
        if not document:
            raise ValidationError("Target section is not attached to a research document.")

        # Optimistic concurrency check
        if not force_override and task.expected_base_version is not None:
            if document.current_version_number != task.expected_base_version:
                raise ValidationError(
                    f"Conflict detected: Document version is {document.current_version_number}, "
                    f"but this correction was created against version {task.expected_base_version}. "
                    "Review recent edits before applying or pass force_override=True."
                )

        # Snapshot current document version before applying modification
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
        if not DocumentVersion.objects.filter(document=document, version_number=document.current_version_number).exists():
            DocumentVersion.objects.create(
                document=document,
                version_number=document.current_version_number,
                snapshot_data={
                    "document_title": document.title,
                    "version_number": document.current_version_number,
                    "sections": current_snapshot,
                },
                created_by=actor,
                change_summary=f"Baseline snapshot v{document.current_version_number}",
            )
        snapshot_v = document.current_version_number + 1
        DocumentVersion.objects.create(
            document=document,
            version_number=snapshot_v,
            snapshot_data={
                "document_title": document.title,
                "version_number": snapshot_v,
                "sections": current_snapshot,
            },
            created_by=actor,
            change_summary=f"Snapshot before applying correction task {task.id} ({task.category})",
        )

        # Apply content update
        replacement = new_content if new_content is not None else task.proposed_text
        section.content = replacement
        section.save()

        # Increment document version
        document.current_version_number = snapshot_v + 1
        document.save(update_fields=['current_version_number', 'updated_at'])

        # Invalidate any previously approved tasks that are now stale
        cls.invalidate_stale_tasks(section, exclude_task_id=task.id)

        # Update task state
        task.status = CorrectionTaskStatus.READY_FOR_REVIEW
        task.expected_base_version = document.current_version_number
        task.is_stale_after_subsequent_edit = False
        task.save(update_fields=['status', 'expected_base_version', 'is_stale_after_subsequent_edit'])

        CollaborationAuditEvent.objects.create(
            project=task.project,
            actor=actor,
            event_type="CORRECTION_APPLIED",
            details={
                "task_id": str(task.id),
                "section_id": str(section.id),
                "new_document_version": document.current_version_number,
            }
        )

        return {
            "status": "applied",
            "task_id": str(task.id),
            "new_document_version": document.current_version_number,
        }

    @classmethod
    def review_task(
        cls,
        task: CorrectionTask,
        actor,
        decision: str,
        notes: str = ""
    ) -> CorrectionTask:
        """
        Allows Supervisor or Project Owner to approve or reject a correction task.
        """
        if not CollaborationService.is_project_admin(task.project, actor):
            role = CollaborationService.get_user_role(task.project, actor)
            if role != "SUPERVISOR":
                raise PermissionDenied("Only supervisors and project owners can approve or reject corrections.")

        decision = decision.upper()
        if decision == "APPROVE":
            task.status = CorrectionTaskStatus.APPROVED
            task.is_stale_after_subsequent_edit = False
            # Check linked reviewer response
            if hasattr(task, 'journal_response') and task.journal_response:
                task.journal_response.is_verified_applied = True
                task.journal_response.save(update_fields=['is_verified_applied'])
        elif decision == "REJECT":
            task.status = CorrectionTaskStatus.REJECTED
        elif decision == "RESOLVE":
            task.status = CorrectionTaskStatus.RESOLVED
            task.is_stale_after_subsequent_edit = False
            if hasattr(task, 'journal_response') and task.journal_response:
                task.journal_response.is_verified_applied = True
                task.journal_response.save(update_fields=['is_verified_applied'])
        elif decision == "REOPEN":
            task.status = CorrectionTaskStatus.REOPENED
        else:
            raise ValidationError(f"Invalid review decision '{decision}'.")

        task.save(update_fields=['status', 'is_stale_after_subsequent_edit'])

        CollaborationAuditEvent.objects.create(
            project=task.project,
            actor=actor,
            event_type="CORRECTION_REVIEWED",
            details={
                "task_id": str(task.id),
                "decision": decision,
                "notes": notes,
            }
        )

        return task

    @classmethod
    def invalidate_stale_tasks(cls, section: DocumentSection, exclude_task_id=None):
        """
        Flags any approved or resolved tasks for this section as stale
        when subsequent modifications occur.
        """
        qs = CorrectionTask.objects.filter(
            section=section,
            status__in=[CorrectionTaskStatus.APPROVED, CorrectionTaskStatus.RESOLVED],
        )
        if exclude_task_id:
            qs = qs.exclude(id=exclude_task_id)

        updated_count = qs.update(is_stale_after_subsequent_edit=True)
        return updated_count
