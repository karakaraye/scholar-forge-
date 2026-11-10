"""
Microsoft Word DOCX Generation Engine for ScholarForge AI.
Constructs genuine, fully-editable Office Open XML documents from DocumentIR
with strict academic typography, dual Roman/Arabic pagination, section breaks,
refreshable TOC field codes, APA/IEEE academic tables, and hanging-indent bibliographies.
"""
import os
import hashlib
from typing import Dict, Any, Optional, List
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from research.document_ir import (
    DocumentIR,
    ParagraphBlockIR,
    HeadingBlockIR,
    TableBlockIR,
    FigureBlockIR,
    EquationBlockIR,
    BlockquoteIR,
    TextRunIR,
    PreliminaryPageIR,
    SectionIR,
    BibliographyEntryIR,
)


class DocxExportService:
    """
    Renders a canonical DocumentIR into a valid, compliant Microsoft Word .docx artifact.
    """

    @classmethod
    def generate_docx(cls, ir: DocumentIR, output_path: str) -> Dict[str, Any]:
        """
        Main entry point: renders DocumentIR to a .docx file at output_path.
        Returns document statistics and file integrity checksum.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        doc = Document()

        # 1. Configure Global Document Styles
        cls._configure_styles(doc, ir)

        # 2. Section 1: Front Matter / Preliminary Pages (Roman Pagination)
        prelim_section = doc.sections[0]
        cls._apply_page_dimensions(prelim_section, ir)
        cls._setup_preliminary_pagination(prelim_section, ir)

        # Render preliminary pages
        cls._render_preliminary_pages(doc, ir)

        # 3. Section 2: Main Body (Arabic Pagination Starting at 1)
        body_section = doc.add_section(WD_SECTION.NEW_PAGE)
        cls._apply_page_dimensions(body_section, ir)
        cls._setup_body_pagination(body_section, ir)

        # Render body chapters and content blocks
        heading_count, table_count, figure_count, equation_count = cls._render_body_sections(doc, ir)

        # 4. Render Bibliography / References
        cls._render_bibliography(doc, ir)

        # 5. Save Document & Compute Integrity Metrics
        doc.save(output_path)
        file_size = os.path.getsize(output_path)
        checksum = cls._compute_sha256(output_path)

        return {
            "output_path": output_path,
            "file_name": os.path.basename(output_path),
            "file_size_bytes": file_size,
            "file_checksum": checksum,
            "heading_count": heading_count,
            "table_count": table_count,
            "figure_count": figure_count,
            "equation_count": equation_count,
            "reference_count": len(ir.bibliography_entries),
            "total_word_count": ir.total_word_count,
        }

    # =========================================================================
    # Page Setup & Styling
    # =========================================================================

    @classmethod
    def _apply_page_dimensions(cls, section, ir: DocumentIR):
        layout = ir.layout
        if layout.paper_size.upper() == 'LETTER':
            section.page_width = Inches(8.5)
            section.page_height = Inches(11.0)
        else:  # Default A4
            section.page_width = Inches(8.27)
            section.page_height = Inches(11.69)

        section.top_margin = Inches(layout.margin_top_inches)
        section.bottom_margin = Inches(layout.margin_bottom_inches)
        section.left_margin = Inches(layout.margin_left_inches)
        section.right_margin = Inches(layout.margin_right_inches)
        section.gutter = Inches(layout.binding_gutter_inches)

    @classmethod
    def _configure_styles(cls, doc: Document, ir: DocumentIR):
        layout = ir.layout
        styles = doc.styles

        # Normal Style (Body text)
        normal = styles['Normal']
        normal.font.name = layout.primary_font
        normal.font.size = Pt(layout.base_font_size_pt)
        normal.font.color.rgb = RGBColor(0x1A, 0x1A, 0x1A)
        pf = normal.paragraph_format
        pf.line_spacing = layout.line_spacing
        pf.space_after = Pt(layout.paragraph_spacing_pt)
        pf.space_before = Pt(0)

        # Heading 1 (Chapter Title)
        h1 = styles['Heading 1']
        h1.font.name = layout.primary_font
        h1.font.size = Pt(layout.base_font_size_pt + 4)
        h1.font.bold = True
        h1.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
        h1.paragraph_format.space_before = Pt(12)
        h1.paragraph_format.space_after = Pt(6)
        h1.paragraph_format.keep_with_next = True

        # Heading 2 (Major Section 1.1)
        h2 = styles['Heading 2']
        h2.font.name = layout.primary_font
        h2.font.size = Pt(layout.base_font_size_pt + 2)
        h2.font.bold = True
        h2.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
        h2.paragraph_format.space_before = Pt(10)
        h2.paragraph_format.space_after = Pt(4)
        h2.paragraph_format.keep_with_next = True

        # Heading 3 (Subsection 1.1.1)
        h3 = styles['Heading 3']
        h3.font.name = layout.primary_font
        h3.font.size = Pt(layout.base_font_size_pt)
        h3.font.bold = True
        h3.font.italic = True
        h3.font.color.rgb = RGBColor(0x37, 0x41, 0x51)
        h3.paragraph_format.space_before = Pt(8)
        h3.paragraph_format.space_after = Pt(2)
        h3.paragraph_format.keep_with_next = True

    # =========================================================================
    # Pagination & Section Breaks
    # =========================================================================

    @classmethod
    def _setup_preliminary_pagination(cls, section, ir: DocumentIR):
        """
        Front matter section: Roman numerals (i, ii, iii), with page number
        suppressed on the Title Page via different_first_page_header_footer.
        """
        section.different_first_page_header_footer = True

        # Set section page number format to Roman in OOXML
        sectPr = section._sectPr
        pgNumType = parse_xml(r'<w:pgNumType %s w:fmt="roman"/>' % nsdecls('w'))
        sectPr.append(pgNumType)

        # Bottom-center page number on subsequent prelim pages
        footer = section.footer
        p = footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cls._add_page_number_field(p)

    @classmethod
    def _setup_body_pagination(cls, section, ir: DocumentIR):
        """
        Main body section: Arabic numerals starting at 1 (w:start="1"),
        unlinked headers/footers, and running header.
        """
        section.different_first_page_header_footer = False
        section.header.is_linked_to_previous = False
        section.footer.is_linked_to_previous = False

        # Set section page number format to Decimal starting at 1
        sectPr = section._sectPr
        pgNumType = parse_xml(r'<w:pgNumType %s w:fmt="decimal" w:start="1"/>' % nsdecls('w'))
        sectPr.append(pgNumType)

        layout = ir.layout
        # Header setup: Running title and/or page number
        if layout.main_page_num_position == 'TOP_RIGHT':
            header_p = section.header.paragraphs[0]
            header_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            # Add running head on left if desired, page number on right
            if ir.metadata.title:
                run_title = header_p.add_run(f"{ir.metadata.title[:45]}...    ")
                run_title.font.name = layout.primary_font
                run_title.font.size = Pt(9)
                run_title.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)
            cls._add_page_number_field(header_p)
        else:
            # Bottom Center
            footer_p = section.footer.paragraphs[0]
            footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cls._add_page_number_field(footer_p)

    @classmethod
    def _add_page_number_field(cls, paragraph):
        """Inserts a dynamic Word PAGE field code into a paragraph."""
        fldSimple = parse_xml(r'<w:fldSimple %s w:instr="PAGE"/>' % nsdecls('w'))
        paragraph._p.append(fldSimple)

    @classmethod
    def _add_toc_field(cls, paragraph):
        """Inserts a native refreshable Word Table of Contents field code."""
        p_elm = paragraph._p
        run = paragraph.add_run()
        fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
        instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> TOC \o "1-3" \h \z \u </w:instrText>' % nsdecls('w'))
        fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
        fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))
        run._r.append(fldChar1)
        run._r.append(instrText)
        run._r.append(fldChar2)
        run._r.append(fldChar3)

    # =========================================================================
    # Preliminary Pages Rendering
    # =========================================================================

    @classmethod
    def _render_preliminary_pages(cls, doc: Document, ir: DocumentIR):
        layout = ir.layout
        meta = ir.metadata

        for idx, page in enumerate(ir.preliminary_pages):
            if idx > 0:
                doc.add_page_break()

            if page.page_key == 'title_page':
                cls._render_title_page(doc, meta, layout)
            elif page.page_key == 'table_of_contents':
                cls._render_toc_page(doc, page, layout)
            else:
                cls._render_generic_prelim_page(doc, page, layout)

    @classmethod
    def _render_title_page(cls, doc: Document, meta, layout):
        # Spacing at top
        p_top = doc.add_paragraph()
        p_top.paragraph_format.space_before = Pt(36)

        # Title
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p_title.add_run(meta.title.upper())
        run.bold = True
        run.font.name = layout.primary_font
        run.font.size = Pt(layout.base_font_size_pt + 4)

        if meta.subtitle:
            p_sub = doc.add_paragraph()
            p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run_sub = p_sub.add_run(meta.subtitle)
            run_sub.italic = True
            run_sub.font.name = layout.primary_font
            run_sub.font.size = Pt(layout.base_font_size_pt + 1)

        # Institutional statement
        p_stmt = doc.add_paragraph()
        p_stmt.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_stmt.paragraph_format.space_before = Pt(48)
        degree_text = meta.degree_title or "Doctor of Philosophy"
        p_stmt.add_run(f"A dissertation submitted in partial fulfillment of the requirements for the degree of\n{degree_text}")

        # Author
        p_auth = doc.add_paragraph()
        p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_auth.paragraph_format.space_before = Pt(48)
        run_by = p_auth.add_run("By\n")
        run_name = p_auth.add_run(meta.author_name.upper())
        run_name.bold = True

        # Department / Institution
        p_inst = doc.add_paragraph()
        p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_inst.paragraph_format.space_before = Pt(48)
        dept_str = f"{meta.department_name}\n" if meta.department_name else ""
        inst_str = meta.institution_name or "Academic Institution"
        p_inst.add_run(f"{dept_str}{inst_str}\n{meta.submission_date}")

    @classmethod
    def _render_toc_page(cls, doc: Document, page: PreliminaryPageIR, layout):
        p_head = doc.add_paragraph()
        p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p_head.add_run("TABLE OF CONTENTS")
        run.bold = True
        run.font.size = Pt(layout.base_font_size_pt + 2)

        # Dynamic TOC Field
        p_toc = doc.add_paragraph()
        p_toc.paragraph_format.space_before = Pt(12)
        p_toc.paragraph_format.space_after = Pt(12)
        cls._add_toc_field(p_toc)

    @classmethod
    def _render_generic_prelim_page(cls, doc: Document, page: PreliminaryPageIR, layout):
        p_head = doc.add_paragraph()
        p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p_head.add_run(page.title.upper())
        run.bold = True
        run.font.size = Pt(layout.base_font_size_pt + 2)
        p_head.paragraph_format.space_after = Pt(18)

        for text in page.paragraphs:
            p = doc.add_paragraph()
            p.paragraph_format.first_line_indent = Inches(layout.first_line_indent_inches)
            p.paragraph_format.line_spacing = layout.line_spacing
            p.add_run(text)

    # =========================================================================
    # Body Sections & Blocks Rendering
    # =========================================================================

    @classmethod
    def _render_body_sections(cls, doc: Document, ir: DocumentIR):
        layout = ir.layout
        heading_count = 0
        table_count = 0
        figure_count = 0
        equation_count = 0

        for sec_idx, section in enumerate(ir.body_sections):
            # Page break before new chapter
            if sec_idx > 0 and section.page_break_before:
                doc.add_page_break()

            # Chapter Heading
            p_chap = doc.add_paragraph(style='Heading 1')
            run_chap = p_chap.add_run(section.title)
            heading_count += 1

            for block in section.blocks:
                if isinstance(block, HeadingBlockIR):
                    style_name = f'Heading {min(block.level, 4)}'
                    p_head = doc.add_paragraph(style=style_name)
                    cls._render_runs(p_head, block.runs, default_text=block.title)
                    heading_count += 1

                elif isinstance(block, ParagraphBlockIR):
                    p_para = doc.add_paragraph()
                    p_para.paragraph_format.first_line_indent = Inches(layout.first_line_indent_inches)
                    p_para.paragraph_format.line_spacing = layout.line_spacing
                    p_para.paragraph_format.space_after = Pt(layout.paragraph_spacing_pt)
                    cls._render_runs(p_para, block.runs, default_text=block.raw_text)

                elif isinstance(block, TableBlockIR):
                    cls._render_table_block(doc, block, layout)
                    table_count += 1

                elif isinstance(block, FigureBlockIR):
                    cls._render_figure_block(doc, block, layout)
                    figure_count += 1

                elif isinstance(block, EquationBlockIR):
                    cls._render_equation_block(doc, block, layout)
                    equation_count += 1

                elif isinstance(block, BlockquoteIR):
                    p_quote = doc.add_paragraph()
                    p_quote.paragraph_format.left_indent = Inches(block.left_indent_inches)
                    p_quote.paragraph_format.line_spacing = 1.0  # Blockquotes usually single-spaced
                    p_quote.paragraph_format.space_before = Pt(6)
                    p_quote.paragraph_format.space_after = Pt(6)
                    cls._render_runs(p_quote, block.runs, default_text=block.text)

        return heading_count, table_count, figure_count, equation_count

    @classmethod
    def _render_runs(cls, paragraph, runs: List[TextRunIR], default_text: str = ""):
        if runs:
            for r in runs:
                run = paragraph.add_run(r.text)
                if r.bold:
                    run.bold = True
                if r.italic:
                    run.italic = True
                if r.underline:
                    run.underline = True
                if r.superscript:
                    run.font.superscript = True
                if r.subscript:
                    run.font.subscript = True
        elif default_text:
            paragraph.add_run(default_text)

    # =========================================================================
    # Tables, Figures & Equations
    # =========================================================================

    @classmethod
    def _render_table_block(cls, doc: Document, table_block: TableBlockIR, layout):
        # 1. Caption ABOVE table (APA style: Table X bold, title italic)
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(12)
        p_cap.paragraph_format.space_after = Pt(4)
        run_num = p_cap.add_run(f"Table {table_block.table_number}\n")
        run_num.bold = True
        run_title = p_cap.add_run(table_block.caption)
        run_title.italic = True

        # 2. Table creation
        num_cols = len(table_block.headers) if table_block.headers else (len(table_block.rows[0]) if table_block.rows else 1)
        num_rows = len(table_block.rows) + (1 if table_block.headers else 0)
        table = doc.add_table(rows=num_rows, cols=num_cols)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Configure APA borders (horizontal lines only at top, bottom, and header)
        cls._apply_apa_table_borders(table)

        row_idx = 0
        if table_block.headers:
            header_row = table.rows[0]
            # Repeat header on page break & prevent row split
            cls._set_repeat_table_header(header_row)
            for c_idx, cell_data in enumerate(table_block.headers):
                cell = header_row.cells[c_idx]
                cell.text = cell_data.text
                cell.paragraphs[0].runs[0].bold = True
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            row_idx = 1

        for r_idx, row_data in enumerate(table_block.rows):
            target_row = table.rows[row_idx + r_idx]
            cls._prevent_row_split(target_row)
            for c_idx, cell_data in enumerate(row_data):
                if c_idx < num_cols:
                    cell = target_row.cells[c_idx]
                    cell.text = cell_data.text

        # 3. Notes BELOW table
        if table_block.notes or table_block.source_attribution:
            p_notes = doc.add_paragraph()
            p_notes.paragraph_format.space_before = Pt(4)
            p_notes.paragraph_format.space_after = Pt(12)
            run_note_lbl = p_notes.add_run("Note. ")
            run_note_lbl.italic = True
            run_note_lbl.font.size = Pt(layout.base_font_size_pt - 2)
            note_text = table_block.notes
            if table_block.source_attribution:
                note_text += f" Adapted from {table_block.source_attribution}."
            run_note_body = p_notes.add_run(note_text)
            run_note_body.font.size = Pt(layout.base_font_size_pt - 2)

    @classmethod
    def _apply_apa_table_borders(cls, table):
        """Applies formal academic 3-line table borders (top, bottom, and header bottom) in OOXML."""
        tblPr = table._tbl.tblPr
        tblBorders = parse_xml(
            r'''<w:tblBorders %s>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
                <w:left w:val="none"/>
                <w:right w:val="none"/>
                <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>
                <w:insideV w:val="none"/>
            </w:tblBorders>''' % nsdecls('w')
        )
        tblPr.append(tblBorders)

    @classmethod
    def _set_repeat_table_header(cls, row):
        """Enforces row repetition across page breaks (<w:tblHeader/>)."""
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(r'<w:tblHeader %s/>' % nsdecls('w')))
        trPr.append(parse_xml(r'<w:cantSplit %s/>' % nsdecls('w')))

    @classmethod
    def _prevent_row_split(cls, row):
        """Prevents row from breaking across pages (<w:cantSplit/>)."""
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(r'<w:cantSplit %s/>' % nsdecls('w')))

    @classmethod
    def _render_figure_block(cls, doc: Document, fig_block: FigureBlockIR, layout):
        p_fig = doc.add_paragraph()
        p_fig.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_fig.paragraph_format.space_before = Pt(12)

        # Image embedding if valid path exists, else high-fidelity placeholder box
        if fig_block.image_path and os.path.isfile(fig_block.image_path):
            try:
                p_fig.add_run().add_picture(fig_block.image_path, width=Inches(fig_block.width_inches))
            except Exception:
                p_fig.add_run(f"[{fig_block.alt_text or 'Figure Illustration'}]")
        else:
            # Fallback styled illustration frame
            run_frame = p_fig.add_run(f"[ {fig_block.caption} — Academic Illustration ]")
            run_frame.italic = True
            run_frame.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

        # Caption BELOW figure
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(4)
        p_cap.paragraph_format.space_after = Pt(12)
        run_num = p_cap.add_run(f"Figure {fig_block.figure_number}. ")
        run_num.italic = True
        run_title = p_cap.add_run(fig_block.caption)
        run_title.font.size = Pt(layout.base_font_size_pt - 1)

    @classmethod
    def _render_equation_block(cls, doc: Document, eq_block: EquationBlockIR, layout):
        p_eq = doc.add_paragraph()
        p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_eq.paragraph_format.space_before = Pt(8)
        p_eq.paragraph_format.space_after = Pt(8)

        # Centered formula with right-tab for equation number
        expr = eq_block.latex_expr or eq_block.raw_text or "E = mc^2"
        run_math = p_eq.add_run(f"    {expr}    ")
        run_math.italic = True
        run_math.font.name = "Cambria Math" if "Cambria Math" in [layout.primary_font] else layout.primary_font

        if eq_block.equation_number:
            run_num = p_eq.add_run(f"    ({eq_block.equation_number})")
            run_num.bold = False

    # =========================================================================
    # Bibliography
    # =========================================================================

    @classmethod
    def _render_bibliography(cls, doc: Document, ir: DocumentIR):
        if not ir.bibliography_entries:
            return

        doc.add_page_break()
        layout = ir.layout

        p_head = doc.add_paragraph(style='Heading 1')
        p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_head.add_run("REFERENCES" if "apa" in ir.metadata.citation_style.lower() else "BIBLIOGRAPHY")

        for entry in ir.bibliography_entries:
            p_ref = doc.add_paragraph()
            # 0.5 in hanging indent standard across all academic styles
            p_ref.paragraph_format.left_indent = Inches(0.5)
            p_ref.paragraph_format.first_line_indent = Inches(-0.5)
            p_ref.paragraph_format.line_spacing = layout.line_spacing
            p_ref.paragraph_format.space_after = Pt(layout.paragraph_spacing_pt)
            p_ref.add_run(entry.citation_text)

    @classmethod
    def _compute_sha256(cls, filepath: str) -> str:
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

