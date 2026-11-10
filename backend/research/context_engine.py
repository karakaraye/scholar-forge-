"""
ScholarForge AI - Research Context Engine
Aggregates multidisciplinary project parameters, objectives, methodology,
supervisor requirements, manuscript sections, and authorized literature sources
into a unified context representation. Strictly isolated to authorized workspace members.
"""

from typing import Dict, Any, Optional
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from projects.models import ResearchProject
from projects.access import VIEW, has_project_access
from documents.models import ResearchDocument, DocumentSection


def get_authorized_project(project_id: str, user) -> Optional[ResearchProject]:
    """
    Validates user authorization and retrieves the ResearchProject.
    Returns None if user is not authorized.
    """
    try:
        project = ResearchProject.objects.select_related('discipline', 'workspace', 'owner', 'requirements').get(id=project_id)
    except (ResearchProject.DoesNotExist, ValueError, DjangoValidationError):
        return None

    if has_project_access(user, project, VIEW):
        return project

    return None


def extract_research_context(
    project_id: str,
    user,
    section_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Constructs a comprehensive research context dictionary for a project, active section,
    and verified project literature sources.
    """
    project = get_authorized_project(project_id, user)
    if not project:
        raise PermissionError("User does not have authorization to access this research project.")

    reqs = getattr(project, 'requirements', None)
    custom_params = reqs.custom_parameters if reqs and reqs.custom_parameters else {}

    # Extract primary document and outline
    main_doc = project.documents.filter(document_type='MAIN_MANUSCRIPT').first()
    if not main_doc:
        main_doc = project.documents.first()

    outline_titles = []
    current_section_info = None

    if main_doc:
        sections = main_doc.sections.all().order_by('order_index')
        outline_titles = [f"{s.order_index + 1}. {s.title} ({s.section_type})" for s in sections]

        if section_id:
            sec = sections.filter(id=section_id).first()
            if sec:
                current_section_info = {
                    "id": str(sec.id),
                    "title": sec.title,
                    "section_type": sec.section_type,
                    "order_index": sec.order_index,
                    "word_count": sec.word_count,
                    "content": sec.content,
                    "parent_title": sec.parent_section.title if sec.parent_section else None
                }

    # Extract verified literature sources attached to this project
    project_sources_data = []
    for ps in project.project_sources.select_related("source").all()[:15]:
        s = ps.source
        authors_display = ", ".join(s.authors[:3]) if s.authors else "Unknown"
        project_sources_data.append({
            "source_id": str(s.id),
            "title": s.title,
            "authors": authors_display,
            "publication_year": s.publication_year,
            "venue": s.journal_or_publisher,
            "doi": s.doi,
            "abstract_snippet": s.abstract[:300] if s.abstract else "",
            "verification_status": s.verification_status,
            "retracted": s.retracted
        })

    context = {
        "project_id": str(project.id),
        "title": project.title,
        "academic_discipline": project.discipline.name if project.discipline else "Interdisciplinary",
        "discipline_category": project.discipline.category if project.discipline else "General",
        "academic_level": project.academic_level,
        "document_category": project.document_category,
        "document_subtype": project.document_subtype,
        "citation_style": project.citation_style,
        "institution": project.institution or "Independent Scholar",
        "country": project.country,
        "preferred_language": project.preferred_language,
        "research_methodology": reqs.research_methodology if reqs else "",
        "research_objectives": reqs.research_objectives if reqs else "",
        "supervisor_requirements": reqs.supervisor_requirements if reqs else "",
        "target_word_count": reqs.target_word_count if reqs else None,
        "research_aim": custom_params.get("research_aim", ""),
        "research_questions": custom_params.get("research_questions", ""),
        "research_hypotheses": custom_params.get("research_hypotheses", ""),
        "key_concepts_and_variables": custom_params.get("key_concepts_and_variables", ""),
        "outline_structure": outline_titles,
        "current_section": current_section_info,
        "project_sources": project_sources_data
    }

    return context


def format_context_for_prompt(context: Dict[str, Any]) -> str:
    """
    Renders the structured research context into an academic briefing string for LLM prompts.
    """
    lines = [
        f"RESEARCH TITLE: {context.get('title')}",
        f"DISCIPLINE: {context.get('academic_discipline')} ({context.get('discipline_category')})",
        f"ACADEMIC LEVEL: {context.get('academic_level')}",
        f"DOCUMENT TYPE: {context.get('document_category')} - {context.get('document_subtype')}",
        f"CITATION STYLE: {context.get('citation_style')}",
        f"INSTITUTION / SETTING: {context.get('institution')} ({context.get('country')})",
    ]

    if context.get("research_aim"):
        lines.append(f"RESEARCH AIM: {context.get('research_aim')}")
    if context.get("research_objectives"):
        lines.append(f"RESEARCH OBJECTIVES:\n{context.get('research_objectives')}")
    if context.get("research_questions"):
        lines.append(f"RESEARCH QUESTIONS:\n{context.get('research_questions')}")
    if context.get("research_hypotheses"):
        lines.append(f"RESEARCH HYPOTHESES:\n{context.get('research_hypotheses')}")
    if context.get("research_methodology"):
        lines.append(f"RESEARCH METHODOLOGY:\n{context.get('research_methodology')}")
    if context.get("key_concepts_and_variables"):
        lines.append(f"KEY CONSTRUCTS / VARIABLES: {context.get('key_concepts_and_variables')}")
    if context.get("supervisor_requirements"):
        lines.append(f"SUPERVISOR REQUIREMENTS:\n{context.get('supervisor_requirements')}")

    curr = context.get("current_section")
    if curr:
        lines.append("\nCURRENT TARGET SECTION:")
        lines.append(f"Section Title: {curr.get('title')} ({curr.get('section_type')})")
        if curr.get("parent_title"):
            lines.append(f"Parent Chapter: {curr.get('parent_title')}")
        if curr.get("content"):
            content_snippet = curr.get("content")[:1000]
            lines.append(f"Existing Section Text (excerpt):\n{content_snippet}")

    sources = context.get("project_sources", [])
    if sources:
        lines.append("\nAUTHORIZED VERIFIED PROJECT LITERATURE SOURCES:")
        lines.append("Directive: You may cite only the following sources. Never invent or hallucinate additional sources.")
        for s in sources:
            year = s.get("publication_year") or "n.d."
            lines.append(
                f"- [ID: {s.get('source_id')}] {s.get('title')} by {s.get('authors')} ({year}) in {s.get('venue')}. Status: {s.get('verification_status')}"
            )

    return "\n".join(lines)
