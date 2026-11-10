"""
Intermediate Semantic Document Representation (IR) Pipeline for ScholarForge AI.
Provides a unified, structured document model that bridges stored document sections,
preliminary pages, tables, figures, equations, and citations for both DOCX and PDF exporters.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import re
import html
from html.parser import HTMLParser
from django.utils import timezone

from projects.models import ResearchProject
from documents.models import ResearchDocument, DocumentSection, DocumentVersion
from research.models import FormattingTemplate, TemplateVersion, ProjectTemplateAssignment, ManuscriptMetadata
from research.preliminary_pages_service import PreliminaryPagesService
from research.citation_service import CitationService


@dataclass
class TextRunIR:
    text: str
    bold: bool = False
    italic: bool = False
    underline: bool = False
    superscript: bool = False
    subscript: bool = False
    code: bool = False
    citation_id: Optional[str] = None


@dataclass
class ParagraphBlockIR:
    runs: List[TextRunIR] = field(default_factory=list)
    alignment: str = 'LEFT'  # 'LEFT', 'CENTER', 'RIGHT', 'JUSTIFY'
    first_line_indent_inches: float = 0.5
    space_after_pt: float = 6.0
    line_spacing: float = 2.0
    raw_text: str = ""


@dataclass
class HeadingBlockIR:
    level: int  # 1, 2, 3, 4
    title: str
    number_prefix: str = ""  # e.g. "1.1" or "CHAPTER 1: "
    page_break_before: bool = False
    runs: List[TextRunIR] = field(default_factory=list)


@dataclass
class TableCellIR:
    text: str
    runs: List[TextRunIR] = field(default_factory=list)
    is_header: bool = False
    alignment: str = 'LEFT'
    col_span: int = 1
    row_span: int = 1


@dataclass
class TableBlockIR:
    table_number: int
    caption: str
    caption_placement: str = 'ABOVE'
    headers: List[TableCellIR] = field(default_factory=list)
    rows: List[List[TableCellIR]] = field(default_factory=list)
    notes: str = ""
    source_attribution: str = ""
    col_widths_pct: List[float] = field(default_factory=list)
    is_landscape: bool = False


@dataclass
class FigureBlockIR:
    figure_number: int
    caption: str
    caption_placement: str = 'BELOW'
    image_path: Optional[str] = None
    image_base64: Optional[str] = None
    alt_text: str = ""
    notes: str = ""
    source_attribution: str = ""
    width_inches: float = 5.5
    height_inches: float = 3.5


@dataclass
class EquationBlockIR:
    equation_number: Optional[int] = None
    latex_expr: str = ""
    omml_xml: str = ""
    raw_text: str = ""
    display_mode: str = 'BLOCK'


@dataclass
class BlockquoteIR:
    text: str
    runs: List[TextRunIR] = field(default_factory=list)
    attribution: str = ""
    left_indent_inches: float = 0.5


@dataclass
class PreliminaryPageIR:
    page_key: str
    title: str
    content_html: str
    paragraphs: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    suppress_page_number: bool = False


@dataclass
class SectionIR:
    id: str
    order_index: int
    title: str
    section_type: str = 'CHAPTER'
    blocks: List[Any] = field(default_factory=list)
    word_count: int = 0
    page_break_before: bool = True


@dataclass
class BibliographyEntryIR:
    id: str
    citation_text: str
    sort_key: str
    doi: str = ""
    url: str = ""


@dataclass
class PageLayoutIR:
    paper_size: str = 'A4'
    width_inches: float = 8.27
    height_inches: float = 11.69
    orientation: str = 'PORTRAIT'
    margin_top_inches: float = 1.0
    margin_bottom_inches: float = 1.0
    margin_left_inches: float = 1.0
    margin_right_inches: float = 1.0
    binding_gutter_inches: float = 0.5
    primary_font: str = 'Times New Roman'
    base_font_size_pt: float = 12.0
    line_spacing: float = 2.0
    paragraph_spacing_pt: float = 6.0
    first_line_indent_inches: float = 0.5
    prelim_page_num_format: str = 'ROMAN_LOWER'
    prelim_page_num_position: str = 'BOTTOM_CENTER'
    main_page_num_format: str = 'ARABIC'
    main_page_num_position: str = 'TOP_RIGHT'
    running_header_text: str = ""
    suppress_first_page_number: bool = True


@dataclass
class DocumentMetadataIR:
    project_id: str
    title: str
    subtitle: str = ""
    document_category: str = ""
    academic_level: str = ""
    author_name: str = ""
    author_email: str = ""
    affiliations: List[Dict[str, str]] = field(default_factory=list)
    institution_name: str = ""
    faculty_name: str = ""
    department_name: str = ""
    degree_title: str = ""
    graduation_year: Optional[int] = None
    submission_date: str = ""
    supervisor_names: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    citation_style: str = "apa-7th"
    template_name: str = ""
    template_version: str = "1.0"


@dataclass
class DocumentIR:
    metadata: DocumentMetadataIR
    layout: PageLayoutIR
    preliminary_pages: List[PreliminaryPageIR] = field(default_factory=list)
    body_sections: List[SectionIR] = field(default_factory=list)
    bibliography_entries: List[BibliographyEntryIR] = field(default_factory=list)
    appendices: List[SectionIR] = field(default_factory=list)
    total_word_count: int = 0
    total_tables_count: int = 0
    total_figures_count: int = 0
    total_equations_count: int = 0


class HTMLContentExtractor(HTMLParser):
    """
    Parses Tiptap HTML content into structured semantic blocks (Paragraphs, Headings, Tables, Figures, Equations).
    """
    def __init__(self):
        super().__init__()
        self.blocks = []
        self.current_tag = None
        self.current_block = None
        self.current_runs = []
        self.active_styles = {
            'bold': False,
            'italic': False,
            'underline': False,
            'superscript': False,
            'subscript': False,
            'code': False,
        }
        self.table_in_progress = False
        self.current_table_headers = []
        self.current_table_rows = []
        self.current_table_row = []
        self.current_cell_text = ""
        self.current_caption = ""

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        attr_dict = dict(attrs)

        if tag in ('h1', 'h2', 'h3', 'h4'):
            level = int(tag[1])
            self.current_block = HeadingBlockIR(level=level, title="")
            self.current_runs = []

        elif tag == 'p':
            self.current_block = ParagraphBlockIR(runs=[])
            self.current_runs = []

        elif tag == 'blockquote':
            self.current_block = BlockquoteIR(text="", runs=[])
            self.current_runs = []

        elif tag == 'strong' or tag == 'b':
            self.active_styles['bold'] = True

        elif tag == 'em' or tag == 'i':
            self.active_styles['italic'] = True

        elif tag == 'u':
            self.active_styles['underline'] = True

        elif tag == 'sup':
            self.active_styles['superscript'] = True

        elif tag == 'sub':
            self.active_styles['subscript'] = True

        elif tag == 'code':
            self.active_styles['code'] = True

        elif tag == 'table':
            self.table_in_progress = True
            self.current_table_headers = []
            self.current_table_rows = []
            self.current_caption = attr_dict.get('data-caption', '')

        elif tag == 'caption':
            pass

        elif tag == 'tr':
            self.current_table_row = []

        elif tag in ('th', 'td'):
            self.current_cell_text = ""

        elif tag == 'img':
            src = attr_dict.get('src', '')
            alt = attr_dict.get('alt', '')
            caption = attr_dict.get('data-caption', alt)
            fig_block = FigureBlockIR(
                figure_number=len([b for b in self.blocks if isinstance(b, FigureBlockIR)]) + 1,
                caption=caption or "Figure",
                alt_text=alt,
                image_path=src if not src.startswith('data:') else None,
                image_base64=src if src.startswith('data:') else None,
            )
            self.blocks.append(fig_block)

        elif tag == 'span' and 'equation' in attr_dict.get('class', ''):
            latex = attr_dict.get('data-latex', '')
            eq_block = EquationBlockIR(
                latex_expr=latex,
                raw_text=latex,
                display_mode='BLOCK' if 'display' in attr_dict.get('class', '') else 'INLINE'
            )
            self.blocks.append(eq_block)

    def handle_endtag(self, tag):
        if tag in ('h1', 'h2', 'h3', 'h4') and isinstance(self.current_block, HeadingBlockIR):
            self.current_block.runs = list(self.current_runs)
            self.current_block.title = "".join(r.text for r in self.current_runs).strip()
            self.blocks.append(self.current_block)
            self.current_block = None
            self.current_runs = []

        elif tag == 'p' and isinstance(self.current_block, ParagraphBlockIR):
            self.current_block.runs = list(self.current_runs)
            self.current_block.raw_text = "".join(r.text for r in self.current_runs).strip()
            if self.current_block.raw_text or self.current_runs:
                self.blocks.append(self.current_block)
            self.current_block = None
            self.current_runs = []

        elif tag == 'blockquote' and isinstance(self.current_block, BlockquoteIR):
            self.current_block.runs = list(self.current_runs)
            self.current_block.text = "".join(r.text for r in self.current_runs).strip()
            self.blocks.append(self.current_block)
            self.current_block = None
            self.current_runs = []

        elif tag in ('strong', 'b'):
            self.active_styles['bold'] = False
        elif tag in ('em', 'i'):
            self.active_styles['italic'] = False
        elif tag == 'u':
            self.active_styles['underline'] = False
        elif tag == 'sup':
            self.active_styles['superscript'] = False
        elif tag == 'sub':
            self.active_styles['subscript'] = False
        elif tag == 'code':
            self.active_styles['code'] = False

        elif tag in ('th', 'td'):
            is_header = (tag == 'th')
            cell = TableCellIR(
                text=self.current_cell_text.strip(),
                is_header=is_header,
                runs=[TextRunIR(text=self.current_cell_text.strip(), bold=is_header)]
            )
            self.current_table_row.append(cell)
            self.current_cell_text = ""

        elif tag == 'tr':
            if any(c.is_header for c in self.current_table_row) and not self.current_table_headers:
                self.current_table_headers = list(self.current_table_row)
            else:
                self.current_table_rows.append(list(self.current_table_row))
            self.current_table_row = []

        elif tag == 'table':
            self.table_in_progress = False
            t_num = len([b for b in self.blocks if isinstance(b, TableBlockIR)]) + 1
            tbl_block = TableBlockIR(
                table_number=t_num,
                caption=self.current_caption or f"Table {t_num}",
                headers=self.current_table_headers,
                rows=self.current_table_rows,
            )
            self.blocks.append(tbl_block)
            self.current_table_headers = []
            self.current_table_rows = []
            self.current_caption = ""

    def handle_data(self, data):
        clean_text = data.strip()
        if not clean_text and '\n' in data:
            return

        if self.table_in_progress and self.current_tag in ('th', 'td'):
            self.current_cell_text += data
            return

        if self.current_block is not None:
            # Check for LaTeX equation patterns within data ($$ ... $$ or $ ... $)
            run = TextRunIR(
                text=data,
                bold=self.active_styles['bold'],
                italic=self.active_styles['italic'],
                underline=self.active_styles['underline'],
                superscript=self.active_styles['superscript'],
                subscript=self.active_styles['subscript'],
                code=self.active_styles['code'],
            )
            self.current_runs.append(run)
        elif clean_text:
            # Bare text outside paragraph tags
            run = TextRunIR(
                text=data,
                bold=self.active_styles['bold'],
                italic=self.active_styles['italic'],
                underline=self.active_styles['underline'],
            )
            para = ParagraphBlockIR(runs=[run], raw_text=clean_text)
            self.blocks.append(para)


class DocumentIRBuilder:
    """
    Constructs the canonical DocumentIR instance for a given research project,
    incorporating institutional rules, preliminary pages, sections, equations,
    tables, figures, and verified bibliographic references.
    """

    @classmethod
    def build_ir(
        cls,
        project: ResearchProject,
        template: Optional[FormattingTemplate] = None,
        document_version: Optional[DocumentVersion] = None,
        citation_style: Optional[str] = None,
    ) -> DocumentIR:
        # 1. Resolve Template & Rules Config
        active_version = None
        if not template:
            assignment = getattr(project, 'template_assignment', None)
            if assignment and assignment.template:
                template = assignment.template
                active_version = assignment.template_version
        if template and not active_version:
            active_version = template.versions.filter(is_active=True).first() or template.versions.order_by('-version_number').first()

        rules = active_version.rules_config if active_version else {}

        # 2. Build PageLayoutIR
        page_settings = rules.get('page_settings', {})
        typo_settings = rules.get('typography', {})
        pag_settings = rules.get('pagination', {})
        margins = page_settings.get('margins_inches', {})

        p_spacing = typo_settings.get('paragraph_spacing_pt', 6.0)
        if isinstance(p_spacing, dict):
            space_after = float(p_spacing.get('after', 6.0))
        else:
            try:
                space_after = float(p_spacing)
            except (ValueError, TypeError):
                space_after = 6.0

        p_indent = typo_settings.get('first_line_indent_inches', 0.5)
        try:
            indent_inches = float(p_indent)
        except (ValueError, TypeError):
            indent_inches = 0.5

        suppress_first = pag_settings.get('suppress_title_page', True)
        if 'show_on_first_page' in pag_settings:
            suppress_first = not pag_settings.get('show_on_first_page')

        main_num_fmt = pag_settings.get('main_text_format') or pag_settings.get('main_format', 'ARABIC')
        placement = pag_settings.get('placement', 'TOP_RIGHT')

        layout = PageLayoutIR(
            paper_size=page_settings.get('paper_size', 'A4'),
            orientation=page_settings.get('orientation', 'PORTRAIT'),
            margin_top_inches=float(margins.get('top', 1.0)),
            margin_bottom_inches=float(margins.get('bottom', 1.0)),
            margin_left_inches=float(margins.get('left', 1.0)),
            margin_right_inches=float(margins.get('right', 1.0)),
            binding_gutter_inches=float(margins.get('gutter', 0.5)),
            primary_font=typo_settings.get('primary_font', 'Times New Roman'),
            base_font_size_pt=float(typo_settings.get('base_font_size_pt', 12.0)),
            line_spacing=float(typo_settings.get('line_spacing', 2.0)),
            paragraph_spacing_pt=space_after,
            first_line_indent_inches=indent_inches,
            prelim_page_num_format=pag_settings.get('preliminary_format', 'ROMAN_LOWER'),
            prelim_page_num_position=pag_settings.get('prelim_position', 'BOTTOM_CENTER'),
            main_page_num_format=main_num_fmt,
            main_page_num_position=placement,
            suppress_first_page_number=suppress_first,
            running_header_text=getattr(project, 'title', '')[:50],
        )

        # 3. Build DocumentMetadataIR
        metadata_record = getattr(project, 'manuscript_metadata', None)
        owner = project.owner
        author_name = f"{owner.first_name} {owner.last_name}".strip() if owner else "Researcher"
        if not author_name and owner:
            author_name = owner.email.split('@')[0]

        inst_name = ""
        dept_name = ""
        faculty_name = ""
        if template:
            if template.institution:
                inst_name = template.institution.name
            if template.department:
                dept_name = template.department.name
                if template.department.faculty:
                    faculty_name = template.department.faculty.name

        c_style = citation_style or rules.get('citation_reference', {}).get('citation_style', 'apa-7th')

        metadata_ir = DocumentMetadataIR(
            project_id=str(project.id),
            title=project.title or "Untitled Research Document",
            subtitle=getattr(project, 'subtitle', '') or '',
            document_category=str(project.document_category),
            academic_level=str(project.academic_level),
            author_name=author_name,
            author_email=owner.email if owner else "",
            affiliations=metadata_record.affiliations if metadata_record else [],
            institution_name=inst_name,
            faculty_name=faculty_name,
            department_name=dept_name,
            degree_title=f"{project.academic_level.replace('_', ' ').title()}",
            graduation_year=timezone.now().year,
            submission_date=timezone.now().strftime('%B %Y'),
            keywords=metadata_record.author_contributions.get('keywords', []) if metadata_record else [],
            citation_style=c_style,
            template_name=template.name if template else "Standard Academic Format",
            template_version=str(active_version.version_number) if active_version else "1.0",
        )

        # 4. Generate Preliminary Pages IR
        prelim_pages_ir: List[PreliminaryPageIR] = []
        try:
            prelim_data = PreliminaryPagesService.generate_preliminary_pages(project, template)
            raw_prelims = prelim_data.get('preliminary_pages', {})
            order = prelim_data.get('order', list(raw_prelims.keys()))

            for key in order:
                p_info = raw_prelims.get(key)
                if not p_info:
                    continue
                content_html = p_info.get('html') or p_info.get('content_html', '')
                clean_paragraphs = [
                    re.sub(r'<[^>]+>', '', p).strip()
                    for p in re.findall(r'<p[^>]*>(.*?)</p>', content_html, re.DOTALL)
                    if re.sub(r'<[^>]+>', '', p).strip()
                ]
                prelim_pages_ir.append(PreliminaryPageIR(
                    page_key=key,
                    title=p_info.get('title', key.replace('_', ' ').title()),
                    content_html=content_html,
                    paragraphs=clean_paragraphs,
                    suppress_page_number=(key == 'title_page'),
                    metadata=p_info,
                ))
        except Exception:
            # Fallback title page if preliminary generation encounters an error
            prelim_pages_ir.append(PreliminaryPageIR(
                page_key='title_page',
                title="TITLE PAGE",
                content_html=f"<h1>{project.title}</h1><p>{author_name}</p>",
                paragraphs=[project.title, author_name],
                suppress_page_number=True,
            ))

        # 5. Build Body Sections IR
        body_sections_ir: List[SectionIR] = []
        document = project.documents.first()
        raw_sections = []

        if document_version and document_version.snapshot_data and 'sections' in document_version.snapshot_data:
            raw_sections = document_version.snapshot_data['sections']
        elif document:
            raw_sections = [
                {
                    'id': str(sec.id),
                    'order_index': sec.order_index,
                    'title': sec.title,
                    'content': sec.content or '',
                    'word_count': sec.word_count,
                }
                for sec in document.sections.all().order_by('order_index')
            ]

        total_words = 0
        total_tables = 0
        total_figures = 0
        total_equations = 0

        for idx, sec_dict in enumerate(raw_sections):
            content = sec_dict.get('content', '') or ''
            sec_title = sec_dict.get('title', f"Section {idx+1}")
            word_count = sec_dict.get('word_count', 0)
            total_words += word_count

            # Parse HTML into blocks
            extractor = HTMLContentExtractor()
            try:
                extractor.feed(content)
            except Exception:
                # If HTML parse fails, create fallback paragraph
                extractor.blocks = [ParagraphBlockIR(
                    runs=[TextRunIR(text=re.sub(r'<[^>]+>', ' ', content).strip())],
                    raw_text=re.sub(r'<[^>]+>', ' ', content).strip()
                )]

            blocks = extractor.blocks

            # Detect equations written as $$ ... $$ in raw text runs
            for block in blocks:
                if isinstance(block, ParagraphBlockIR):
                    eq_matches = re.findall(r'\$\$(.*?)\$\$', block.raw_text)
                    for eq in eq_matches:
                        total_equations += 1

            total_tables += len([b for b in blocks if isinstance(b, TableBlockIR)])
            total_figures += len([b for b in blocks if isinstance(b, FigureBlockIR)])
            total_equations += len([b for b in blocks if isinstance(b, EquationBlockIR)])

            section_ir = SectionIR(
                id=str(sec_dict.get('id', idx)),
                order_index=sec_dict.get('order_index', idx),
                title=sec_title,
                section_type='CHAPTER',
                blocks=blocks,
                word_count=word_count,
                page_break_before=True,
            )
            body_sections_ir.append(section_ir)

        # 6. Build Bibliography IR
        bib_entries_ir: List[BibliographyEntryIR] = []
        citations = project.citations.select_related('source').all()
        for c in citations:
            src = c.source
            if not src:
                continue
            bib_text = CitationService.format_bibliography_entry(source=src, style=c_style)
            bib_entries_ir.append(BibliographyEntryIR(
                id=str(c.id),
                citation_text=bib_text,
                sort_key=f"{src.authors[0] if src.authors else 'Unknown'} {src.publication_year or 0}",
                doi=src.doi or "",
                url=src.url or "",
            ))
        # Sort bibliography alphabetically by author/sort_key
        bib_entries_ir.sort(key=lambda e: e.sort_key.lower())

        return DocumentIR(
            metadata=metadata_ir,
            layout=layout,
            preliminary_pages=prelim_pages_ir,
            body_sections=body_sections_ir,
            bibliography_entries=bib_entries_ir,
            appendices=[],
            total_word_count=total_words,
            total_tables_count=total_tables,
            total_figures_count=total_figures,
            total_equations_count=total_equations,
        )

