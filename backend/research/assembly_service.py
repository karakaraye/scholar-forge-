"""
Manuscript Assembly Engine for ScholarForge AI.

Compiles complete academic manuscripts from document sections, preserving Tiptap
structured nodes, tables, figures, callouts, and in-text citations.
Generates preliminary pages, Table of Contents, List of Tables, List of Figures,
complete verified bibliography formatted per selected CSL standard, and appendices.
"""

from typing import Dict, List, Any, Tuple, Optional
import re
from django.utils import timezone
from projects.models import ResearchProject
from research.models import (
    ManuscriptAssembly,
    ResearchSource,
    ProjectSource,
    ResearchInstrument,
    StatisticalResult,
)
from research.citation_service import CitationService


class AssemblyService:
    """Core domain service for assembling full academic manuscripts."""

    @classmethod
    def compile_manuscript(cls, project: ResearchProject, user: Any, citation_style: str = 'APA 7th', options: Optional[Dict[str, Any]] = None) -> ManuscriptAssembly:
        opts = dict(options or {})
        opts['citation_style'] = citation_style
        return cls.assemble_manuscript(project=project, user=user, options=opts)

    @classmethod
    def assemble_manuscript(
        cls,
        project: ResearchProject,
        user: Any,
        options: Optional[Dict[str, Any]] = None
    ) -> ManuscriptAssembly:
        """
        Compiles the entire project manuscript into an integrated previewable document.
        """
        if options is None:
            options = {}

        citation_style = options.get("citation_style", project.citation_style or "APA 7th")
        include_preliminary = options.get("include_preliminary_pages", True)
        include_toc = options.get("include_table_of_contents", True)
        include_lot = options.get("include_list_of_tables", True)
        include_lof = options.get("include_list_of_figures", True)
        include_references = options.get("include_references", True)
        include_appendices = options.get("include_appendices", True)

        doc = project.documents.first()
        sections = list(doc.sections.all().order_by("order_index")) if doc else []

        # Track structural manifests
        toc_items = []
        tables_found = []
        figures_found = []
        citations_found = set()
        total_words = 0

        # Process sections and structure numbers
        chapter_counter = 0
        section_tree = []

        for sec in sections:
            word_count = sec.word_count or len((sec.content_json or {}).get("text", "").split())
            total_words += word_count

            # Determine level
            is_chapter = not sec.parent_section
            if is_chapter:
                chapter_counter += 1
                sec_number = f"Chapter {chapter_counter}"
            else:
                sec_order = getattr(sec, "order_index", getattr(sec, "order", 1))
                sec_number = f"{chapter_counter}.{sec_order}"

            sec_id = f"sec-{sec.id}"
            toc_items.append({
                "id": sec_id,
                "number": sec_number,
                "title": sec.title,
                "is_chapter": is_chapter,
                "word_count": word_count,
            })

            # Scan HTML content for tables, figures, and citation tags
            raw_html = ""
            if sec.content_json and isinstance(sec.content_json, dict):
                raw_html = sec.content_json.get("html", "")
            if not raw_html and sec.content_json:
                # Text fallback wrapped in paragraphs
                text = sec.content_json.get("text", "")
                raw_html = "".join(f"<p>{p.strip()}</p>" for p in text.split("\n\n") if p.strip())

            # Detect APA and standard HTML tables
            table_matches = re.findall(r'<table[^>]*>.*?</table>', raw_html, re.DOTALL | re.IGNORECASE)
            for idx, tbl in enumerate(table_matches):
                tbl_id = f"tbl-{sec.id}-{idx+1}"
                tbl_title = f"Table {len(tables_found)+1}: Summary in {sec.title}"
                tables_found.append({
                    "id": tbl_id,
                    "title": tbl_title,
                    "section": sec.title,
                    "html": tbl,
                })

            # Detect Figures / Images
            fig_matches = re.findall(r'<figure[^>]*>.*?</figure>|<img[^>]*>', raw_html, re.DOTALL | re.IGNORECASE)
            for idx, fig in enumerate(fig_matches):
                fig_id = f"fig-{sec.id}-{idx+1}"
                fig_title = f"Figure {len(figures_found)+1}: Illustration in {sec.title}"
                figures_found.append({
                    "id": fig_id,
                    "title": fig_title,
                    "section": sec.title,
                    "html": fig,
                })

            # Detect citations
            source_id_matches = re.findall(r'data-source-id=["\']([a-f0-9-]+)["\']', raw_html, re.IGNORECASE)
            for sid in source_id_matches:
                citations_found.add(sid)

            section_tree.append({
                "id": sec_id,
                "number": sec_number,
                "title": sec.title,
                "is_chapter": is_chapter,
                "html_content": raw_html,
            })

        # Fetch sources for bibliography
        project_sources = list(ProjectSource.objects.filter(project=project).select_related("source"))
        sources = [ps.source for ps in project_sources]
        total_citations = max(len(citations_found), len(sources))

        # Generate styled bibliography
        bibliography_html = ""
        if include_references and sources:
            bib_entries = CitationService.format_full_bibliography(sources, citation_style)
            bibliography_html = '<div class="manuscript-bibliography"><h2 class="chapter-heading">References</h2><ul class="references-list">'
            for src, entry in zip(sources, bib_entries):
                authors_str = ", ".join(src.authors) if src.authors else ""
                bibliography_html += f'<li class="reference-entry" data-source-id="{src.id}" data-authors="{authors_str}">{entry}</li>'
            bibliography_html += '</ul></div>'

        # Generate Appendices
        appendices_html = ""
        if include_appendices:
            instruments = list(ResearchInstrument.objects.filter(project=project))
            if instruments:
                appendices_html = '<div class="manuscript-appendices"><h2 class="chapter-heading">Appendices</h2>'
                for idx, inst in enumerate(instruments):
                    app_letter = chr(65 + idx)
                    appendices_html += f'<div class="appendix-block"><h3>Appendix {app_letter}: {inst.title}</h3>'
                    appendices_html += f'<p class="appendix-desc"><em>{inst.description}</em></p>'
                    if inst.items.count() > 0:
                        appendices_html += '<table class="apa-table"><thead><tr><th>Item #</th><th>Item Statement</th><th>Type</th></tr></thead><tbody>'
                        for item_idx, item in enumerate(inst.items.all().order_by("order")):
                            appendices_html += f'<tr><td>{item_idx+1}</td><td>{item.item_text}</td><td>{item.item_type}</td></tr>'
                        appendices_html += '</tbody></table>'
                    appendices_html += '</div>'
                appendices_html += '</div>'

        # Compile Full HTML Document
        full_html = cls._compile_full_html(
            project=project,
            section_tree=section_tree,
            toc_items=toc_items if include_toc else [],
            tables=tables_found if include_lot else [],
            figures=figures_found if include_lof else [],
            bibliography_html=bibliography_html,
            appendices_html=appendices_html,
            include_preliminary=include_preliminary,
        )

        # Store Assembly Record
        assembly = ManuscriptAssembly.objects.create(
            project=project,
            assembled_by=user,
            document_title=project.title,
            citation_style=citation_style,
            include_preliminary_pages=include_preliminary,
            include_table_of_contents=include_toc,
            include_list_of_tables=include_lot,
            include_list_of_figures=include_lof,
            include_references=include_references,
            include_appendices=include_appendices,
            total_word_count=total_words,
            total_tables_count=len(tables_found),
            total_figures_count=len(figures_found),
            total_citations_count=total_citations,
            compiled_html=full_html,
            structure_manifest={
                "toc": toc_items,
                "tables_count": len(tables_found),
                "figures_count": len(figures_found),
                "citations_count": total_citations,
                "chapters_count": chapter_counter,
            }
        )

        return assembly

    @classmethod
    def _compile_full_html(
        cls,
        project: ResearchProject,
        section_tree: List[Dict[str, Any]],
        toc_items: List[Dict[str, Any]],
        tables: List[Dict[str, Any]],
        figures: List[Dict[str, Any]],
        bibliography_html: str,
        appendices_html: str,
        include_preliminary: bool = True
    ) -> str:
        """Stitches academic styling, front matter, chapters, tables, and references."""
        html = ['<div class="scholarforge-academic-manuscript">']

        # 1. Preliminary / Title Page
        if include_preliminary:
            discipline_name = project.discipline.name if project.discipline else "Academic Research"
            level_name = project.academic_level or "Academic"
            date_str = timezone.now().strftime("%B %Y")
            html.append(f'''
            <div class="preliminary-page title-page text-center py-16 border-b border-slate-200">
                <div class="institution-header text-sm tracking-widest uppercase font-serif text-slate-500 mb-8">
                    {project.institution or "Academic Research Workspace"}
                </div>
                <h1 class="manuscript-main-title font-serif text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-8 max-w-3xl mx-auto">
                    {project.title}
                </h1>
                <div class="document-metadata text-sm text-slate-600 space-y-2 mb-12">
                    <p class="font-serif italic">A {project.document_subtype or "Research Manuscript"} submitted in partial fulfillment of the requirements for {level_name}</p>
                    <p class="font-sans font-medium text-slate-800">Discipline of {discipline_name}</p>
                </div>
                <div class="author-block text-sm text-slate-700">
                    <p class="font-bold">{project.owner.get_full_name() or project.owner.email}</p>
                    <p class="text-xs text-slate-500 mt-1">{date_str}</p>
                </div>
            </div>
            ''')

        # 2. Table of Contents
        if toc_items:
            html.append('<div class="manuscript-toc py-8 border-b border-slate-200"><h2 class="font-serif text-xl font-bold text-slate-900 mb-6">Table of Contents</h2><ul class="toc-list space-y-2 text-sm">')
            for item in toc_items:
                is_chap = item.get("is_chapter", False)
                indent = "font-bold text-slate-900 pt-2" if is_chap else "pl-6 text-slate-700"
                html.append(f'''
                <li class="flex items-center justify-between {indent}">
                    <a href="#{item['id']}" class="hover:underline flex items-center gap-2">
                        <span class="font-mono text-xs text-slate-400">{item['number']}</span>
                        <span>{item['title']}</span>
                    </a>
                    <span class="text-xs text-slate-400 font-mono">{item['word_count']} w</span>
                </li>
                ''')
            html.append('</ul></div>')

        # 3. List of Tables
        if tables:
            html.append('<div class="manuscript-lot py-8 border-b border-slate-200"><h2 class="font-serif text-xl font-bold text-slate-900 mb-6">List of Tables</h2><ul class="lot-list space-y-2 text-sm">')
            for tbl in tables:
                html.append(f'''
                <li class="flex items-center justify-between text-slate-700">
                    <span class="font-serif">{tbl['title']}</span>
                    <span class="text-xs text-slate-400 italic">{tbl['section']}</span>
                </li>
                ''')
            html.append('</ul></div>')

        # 4. List of Figures
        if figures:
            html.append('<div class="manuscript-lof py-8 border-b border-slate-200"><h2 class="font-serif text-xl font-bold text-slate-900 mb-6">List of Figures</h2><ul class="lof-list space-y-2 text-sm">')
            for fig in figures:
                html.append(f'''
                <li class="flex items-center justify-between text-slate-700">
                    <span class="font-serif">{fig['title']}</span>
                    <span class="text-xs text-slate-400 italic">{fig['section']}</span>
                </li>
                ''')
            html.append('</ul></div>')

        # 5. Manuscript Chapters & Sections
        html.append('<div class="manuscript-body py-10 space-y-12">')
        for sec in section_tree:
            is_chap = sec.get("is_chapter", False)
            h_tag = "h2" if is_chap else "h3"
            h_cls = "font-serif text-2xl font-bold text-slate-900 pb-3 border-b border-slate-200 mb-6" if is_chap else "font-serif text-lg font-bold text-slate-800 mt-6 mb-4"
            html.append(f'''
            <section id="{sec['id']}" class="manuscript-section">
                <{h_tag} class="{h_cls}">
                    <span class="chapter-number mr-2 font-mono text-sm text-gold-600">{sec['number']}</span>
                    {sec['title']}
                </{h_tag}>
                <div class="section-prose font-serif text-base text-slate-800 leading-relaxed space-y-4">
                    {sec['html_content'] or '<p class="italic text-slate-400">Section content is currently being drafted.</p>'}
                </div>
            </section>
            ''')
        html.append('</div>')

        # 6. References
        if bibliography_html:
            html.append(f'<div class="py-8 border-t border-slate-200">{bibliography_html}</div>')

        # 7. Appendices
        if appendices_html:
            html.append(f'<div class="py-8 border-t border-slate-200">{appendices_html}</div>')

        html.append('</div>')
        return "\n".join(html)

