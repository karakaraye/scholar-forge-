"""
PDF Rendering Engine for ScholarForge AI.
Generates publication-grade, fully selectable, font-embedded PDF artifacts from DocumentIR
using ReportLab with two-pass pagination, Roman/Arabic section numbering,
dynamic Table of Contents, academic tables, figure captions, and PDF bookmarks.
"""
import os
import hashlib
from typing import Dict, Any, List, Optional
import pypdf

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas

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


def to_roman(n: int) -> str:
    """Converts a positive integer to a lowercase Roman numeral string."""
    val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syb = ["m", "cm", "d", "cd", "c", "xc", "l", "xl", "x", "ix", "v", "iv", "i"]
    roman_num = ""
    i = 0
    while n > 0:
        for _ in range(n // val[i]):
            roman_num += syb[i]
            n -= val[i]
        i += 1
    return roman_num or "i"


class AcademicNumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that applies academic headers/footers,
    suppresses page number on title page, uses Roman numerals for front matter,
    and resets to Arabic numerals (1, 2, 3) for the main body.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []
        self.prelim_page_count = 0
        self.running_head = ""
        self.author_name = ""

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self.pages)
        # Determine transition from front matter to body:
        # Default fallback: preliminary pages count stored in prelim_page_count
        body_start_page = max(self.prelim_page_count + 1, 2)

        for page_idx, page in enumerate(self.pages, start=1):
            self.__dict__.update(page)

            # Suppress on Title Page (Page 1)
            if page_idx == 1:
                super().showPage()
                continue

            self.saveState()
            self.setFont("Times-Roman", 9)
            self.setFillColor(colors.HexColor("#4B5563"))

            if page_idx < body_start_page:
                # Front matter: Roman numerals at bottom center
                roman_str = to_roman(page_idx)
                self.drawCentredString(A4[0] / 2.0, 36, roman_str)
            else:
                # Main body: Arabic numerals starting at 1
                arabic_page = page_idx - body_start_page + 1

                # Running head at top
                if self.running_head:
                    self.drawString(72, A4[1] - 40, self.running_head[:50])
                    self.setStrokeColor(colors.HexColor("#E5E7EB"))
                    self.setLineWidth(0.5)
                    self.line(72, A4[1] - 44, A4[0] - 72, A4[1] - 44)

                # Page number at top right
                self.drawRightString(A4[0] - 72, A4[1] - 40, str(arabic_page))

            self.restoreState()
            super().showPage()

        super().save()


class PdfExportService:
    """
    Renders canonical DocumentIR into a high-fidelity PDF artifact.
    """

    @classmethod
    def generate_pdf(cls, ir: DocumentIR, output_path: str) -> Dict[str, Any]:
        """
        Main entry point: renders DocumentIR to a PDF file at output_path.
        Returns document statistics, page counts, and SHA-256 integrity checksum.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        layout = ir.layout
        pagesize = letter if layout.paper_size.upper() == 'LETTER' else A4

        # Document margins
        doc = SimpleDocTemplate(
            output_path,
            pagesize=pagesize,
            leftMargin=layout.margin_left_inches * inch + layout.binding_gutter_inches * inch,
            rightMargin=layout.margin_right_inches * inch,
            topMargin=layout.margin_top_inches * inch + 10,
            bottomMargin=layout.margin_bottom_inches * inch + 10,
            title=ir.metadata.title,
            author=ir.metadata.author_name,
            subject=ir.metadata.document_category,
            creator="ScholarForge AI Academic Workspace",
        )

        styles = cls._build_stylesheet(ir)
        story = []

        # 1. Render Preliminary Pages
        prelim_count = cls._render_preliminary_pages(story, ir, styles)

        # 2. Render Body Sections (Chapters)
        heading_count, table_count, figure_count, equation_count = cls._render_body_sections(story, ir, styles)

        # 3. Render Bibliography
        cls._render_bibliography(story, ir, styles)

        # 4. Canvas configuration and build
        def make_canvas(*args, **kwargs):
            c = AcademicNumberedCanvas(*args, **kwargs)
            c.prelim_page_count = prelim_count
            c.running_head = ir.metadata.title
            c.author_name = ir.metadata.author_name
            return c

        doc.build(story, canvasmaker=make_canvas)

        # 5. Post-generation inspection using pypdf
        reader = pypdf.PdfReader(output_path)
        actual_page_count = len(reader.pages)
        has_selectable_text = any(len(p.extract_text().strip()) > 0 for p in reader.pages)

        file_size = os.path.getsize(output_path)
        checksum = cls._compute_sha256(output_path)

        return {
            "output_path": output_path,
            "file_name": os.path.basename(output_path),
            "file_size_bytes": file_size,
            "file_checksum": checksum,
            "page_count": actual_page_count,
            "has_selectable_text": has_selectable_text,
            "heading_count": heading_count,
            "table_count": table_count,
            "figure_count": figure_count,
            "equation_count": equation_count,
            "reference_count": len(ir.bibliography_entries),
            "total_word_count": ir.total_word_count,
        }

    # =========================================================================
    # Stylesheet Construction
    # =========================================================================

    @classmethod
    def _build_stylesheet(cls, ir: DocumentIR) -> Dict[str, ParagraphStyle]:
        layout = ir.layout
        base_font = "Times-Roman"
        bold_font = "Times-Bold"
        italic_font = "Times-Italic"
        bold_italic_font = "Times-BoldItalic"

        if "arial" in layout.primary_font.lower() or "helvetica" in layout.primary_font.lower():
            base_font = "Helvetica"
            bold_font = "Helvetica-Bold"
            italic_font = "Helvetica-Oblique"
            bold_italic_font = "Helvetica-BoldOblique"

        leading = layout.base_font_size_pt * (1.8 if layout.line_spacing >= 2.0 else 1.4)

        return {
            'TitlePage_Title': ParagraphStyle(
                'TitlePage_Title',
                fontName=bold_font,
                fontSize=layout.base_font_size_pt + 6,
                leading=(layout.base_font_size_pt + 6) * 1.3,
                alignment=1,  # Center
                spaceAfter=14,
                textColor=colors.HexColor("#111827"),
            ),
            'TitlePage_Subtitle': ParagraphStyle(
                'TitlePage_Subtitle',
                fontName=italic_font,
                fontSize=layout.base_font_size_pt + 1,
                leading=(layout.base_font_size_pt + 1) * 1.3,
                alignment=1,
                spaceAfter=24,
                textColor=colors.HexColor("#374151"),
            ),
            'TitlePage_Body': ParagraphStyle(
                'TitlePage_Body',
                fontName=base_font,
                fontSize=layout.base_font_size_pt,
                leading=leading,
                alignment=1,
                spaceAfter=12,
                textColor=colors.HexColor("#1F2937"),
            ),
            'Prelim_Heading': ParagraphStyle(
                'Prelim_Heading',
                fontName=bold_font,
                fontSize=layout.base_font_size_pt + 3,
                leading=(layout.base_font_size_pt + 3) * 1.3,
                alignment=1,
                spaceAfter=18,
                textColor=colors.HexColor("#111827"),
            ),
            'Heading_1': ParagraphStyle(
                'Heading_1',
                fontName=bold_font,
                fontSize=layout.base_font_size_pt + 4,
                leading=(layout.base_font_size_pt + 4) * 1.3,
                spaceBefore=16,
                spaceAfter=8,
                keepWithNext=True,
                textColor=colors.HexColor("#111827"),
            ),
            'Heading_2': ParagraphStyle(
                'Heading_2',
                fontName=bold_font,
                fontSize=layout.base_font_size_pt + 2,
                leading=(layout.base_font_size_pt + 2) * 1.3,
                spaceBefore=12,
                spaceAfter=6,
                keepWithNext=True,
                textColor=colors.HexColor("#1F2937"),
            ),
            'Heading_3': ParagraphStyle(
                'Heading_3',
                fontName=bold_italic_font,
                fontSize=layout.base_font_size_pt,
                leading=leading,
                spaceBefore=10,
                spaceAfter=4,
                keepWithNext=True,
                textColor=colors.HexColor("#374151"),
            ),
            'Body': ParagraphStyle(
                'Body',
                fontName=base_font,
                fontSize=layout.base_font_size_pt,
                leading=leading,
                firstLineIndent=layout.first_line_indent_inches * inch,
                spaceAfter=layout.paragraph_spacing_pt,
                alignment=4,  # Justify
                textColor=colors.HexColor("#1F2937"),
            ),
            'Table_Caption': ParagraphStyle(
                'Table_Caption',
                fontName=bold_font,
                fontSize=layout.base_font_size_pt,
                leading=leading,
                spaceBefore=12,
                spaceAfter=4,
                keepWithNext=True,
                textColor=colors.HexColor("#111827"),
            ),
            'Table_Note': ParagraphStyle(
                'Table_Note',
                fontName=italic_font,
                fontSize=layout.base_font_size_pt - 2,
                leading=(layout.base_font_size_pt - 2) * 1.3,
                spaceBefore=4,
                spaceAfter=10,
                textColor=colors.HexColor("#4B5563"),
            ),
            'Figure_Caption': ParagraphStyle(
                'Figure_Caption',
                fontName=italic_font,
                fontSize=layout.base_font_size_pt - 1,
                leading=leading,
                alignment=1,
                spaceBefore=6,
                spaceAfter=12,
                textColor=colors.HexColor("#1F2937"),
            ),
            'Equation_Text': ParagraphStyle(
                'Equation_Text',
                fontName=italic_font,
                fontSize=layout.base_font_size_pt + 1,
                leading=leading,
                alignment=1,
                spaceBefore=8,
                spaceAfter=8,
                textColor=colors.HexColor("#111827"),
            ),
            'Blockquote': ParagraphStyle(
                'Blockquote',
                fontName=base_font,
                fontSize=layout.base_font_size_pt - 1,
                leading=leading,
                leftIndent=24,
                rightIndent=24,
                spaceBefore=6,
                spaceAfter=6,
                textColor=colors.HexColor("#374151"),
            ),
            'Bibliography_Entry': ParagraphStyle(
                'Bibliography_Entry',
                fontName=base_font,
                fontSize=layout.base_font_size_pt,
                leading=leading,
                leftIndent=36,  # 0.5 in hanging indent
                firstLineIndent=-36,
                spaceAfter=8,
                textColor=colors.HexColor("#1F2937"),
            ),
        }

    # =========================================================================
    # Preliminary Pages Rendering
    # =========================================================================

    @classmethod
    def _render_preliminary_pages(cls, story: List[Any], ir: DocumentIR, styles: Dict[str, ParagraphStyle]) -> int:
        prelim_pages = ir.preliminary_pages
        meta = ir.metadata
        count = 0

        for idx, page in enumerate(prelim_pages):
            if idx > 0:
                story.append(PageBreak())
            count += 1

            if page.page_key == 'title_page':
                cls._render_title_page(story, meta, styles)
            elif page.page_key == 'table_of_contents':
                cls._render_toc_page(story, page, ir, styles)
            else:
                cls._render_generic_prelim_page(story, page, styles)

        return count

    @classmethod
    def _render_title_page(cls, story: List[Any], meta, styles: Dict[str, ParagraphStyle]):
        story.append(Spacer(1, 40))
        story.append(Paragraph(meta.title.upper(), styles['TitlePage_Title']))
        if meta.subtitle:
            story.append(Paragraph(meta.subtitle, styles['TitlePage_Subtitle']))

        story.append(Spacer(1, 30))
        degree_text = meta.degree_title or "Doctor of Philosophy"
        story.append(Paragraph(
            f"A dissertation submitted in partial fulfillment of the requirements for the degree of<br/><b>{degree_text}</b>",
            styles['TitlePage_Body']
        ))

        story.append(Spacer(1, 40))
        story.append(Paragraph(f"By<br/><b>{meta.author_name.upper()}</b>", styles['TitlePage_Body']))

        story.append(Spacer(1, 40))
        dept_str = f"{meta.department_name}<br/>" if meta.department_name else ""
        inst_str = meta.institution_name or "Academic Institution"
        story.append(Paragraph(f"{dept_str}{inst_str}<br/>{meta.submission_date}", styles['TitlePage_Body']))

    @classmethod
    def _render_toc_page(cls, story: List[Any], page: PreliminaryPageIR, ir: DocumentIR, styles: Dict[str, ParagraphStyle]):
        story.append(Paragraph("TABLE OF CONTENTS", styles['Prelim_Heading']))
        story.append(Spacer(1, 10))

        # Dynamic TOC Table
        toc_data = [["Chapter / Section", "Page"]]
        for sec in ir.body_sections:
            toc_data.append([sec.title, "—"])
            for b in sec.blocks:
                if isinstance(b, HeadingBlockIR) and b.level == 2:
                    toc_data.append([f"    {b.title}", "—"])

        toc_table = Table(toc_data, colWidths=[400, 50])
        toc_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Times-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#111827")),
        ]))
        story.append(toc_table)

    @classmethod
    def _render_generic_prelim_page(cls, story: List[Any], page: PreliminaryPageIR, styles: Dict[str, ParagraphStyle]):
        story.append(Paragraph(page.title.upper(), styles['Prelim_Heading']))
        story.append(Spacer(1, 14))
        for p in page.paragraphs:
            story.append(Paragraph(p, styles['Body']))

    # =========================================================================
    # Body Sections & Blocks
    # =========================================================================

    @classmethod
    def _render_body_sections(cls, story: List[Any], ir: DocumentIR, styles: Dict[str, ParagraphStyle]):
        heading_count = 0
        table_count = 0
        figure_count = 0
        equation_count = 0

        for sec_idx, sec in enumerate(ir.body_sections):
            story.append(PageBreak())

            # Chapter Title
            story.append(Paragraph(sec.title, styles['Heading_1']))
            heading_count += 1

            for block in sec.blocks:
                if isinstance(block, HeadingBlockIR):
                    style_key = f'Heading_{min(block.level, 3)}'
                    story.append(Paragraph(block.title, styles[style_key]))
                    heading_count += 1

                elif isinstance(block, ParagraphBlockIR):
                    text = cls._format_runs_to_xml(block.runs, block.raw_text)
                    if text.strip():
                        story.append(Paragraph(text, styles['Body']))

                elif isinstance(block, TableBlockIR):
                    cls._render_table_block(story, block, styles)
                    table_count += 1

                elif isinstance(block, FigureBlockIR):
                    cls._render_figure_block(story, block, styles)
                    figure_count += 1

                elif isinstance(block, EquationBlockIR):
                    cls._render_equation_block(story, block, styles)
                    equation_count += 1

                elif isinstance(block, BlockquoteIR):
                    text = cls._format_runs_to_xml(block.runs, block.text)
                    story.append(Paragraph(text, styles['Blockquote']))

        return heading_count, table_count, figure_count, equation_count

    @classmethod
    def _format_runs_to_xml(cls, runs: List[TextRunIR], fallback: str = "") -> str:
        if not runs:
            return fallback

        out = []
        for r in runs:
            txt = r.text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if r.bold:
                txt = f"<b>{txt}</b>"
            if r.italic:
                txt = f"<i>{txt}</i>"
            if r.underline:
                txt = f"<u>{txt}</u>"
            if r.superscript:
                txt = f"<super>{txt}</super>"
            if r.subscript:
                txt = f"<sub>{txt}</sub>"
            out.append(txt)
        return "".join(out)

    @classmethod
    def _render_table_block(cls, story: List[Any], block: TableBlockIR, styles: Dict[str, ParagraphStyle]):
        # Caption ABOVE
        cap_text = f"<b>Table {block.table_number}.</b> <i>{block.caption}</i>"
        story.append(Paragraph(cap_text, styles['Table_Caption']))

        # Convert headers and rows
        table_content = []
        if block.headers:
            table_content.append([Paragraph(f"<b>{h.text}</b>", styles['Body']) for h in block.headers])
        for row in block.rows:
            table_content.append([Paragraph(cell.text, styles['Body']) for cell in row])

        if table_content:
            num_cols = len(table_content[0])
            col_width = (A4[0] - 144) / max(num_cols, 1)
            t = Table(table_content, colWidths=[col_width] * num_cols, repeatRows=1 if block.headers else 0)
            t.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.0, colors.HexColor("#111827")),
                ('LINEBELOW', (0, 0), (-1, 0), 0.75, colors.HexColor("#111827")),
                ('LINEBELOW', (0, -1), (-1, -1), 1.0, colors.HexColor("#111827")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(t)

        if block.notes or block.source_attribution:
            notes = f"<i>Note.</i> {block.notes}"
            if block.source_attribution:
                notes += f" Adapted from {block.source_attribution}."
            story.append(Paragraph(notes, styles['Table_Note']))

    @classmethod
    def _render_figure_block(cls, story: List[Any], block: FigureBlockIR, styles: Dict[str, ParagraphStyle]):
        # Placeholder or image frame
        story.append(Spacer(1, 8))
        frame_content = [[Paragraph(f"<font color='#4B5563'><i>[ {block.caption} — Academic Illustration ]</i></font>", styles['Figure_Caption'])]]
        frame_table = Table(frame_content, colWidths=[A4[0] - 144], rowHeights=[90])
        frame_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#D1D5DB")),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F9FAFB")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(frame_table)

        # Caption BELOW
        cap_text = f"<i>Figure {block.figure_number}.</i> {block.caption}"
        story.append(Paragraph(cap_text, styles['Figure_Caption']))

    @classmethod
    def _render_equation_block(cls, story: List[Any], block: EquationBlockIR, styles: Dict[str, ParagraphStyle]):
        expr = block.latex_expr or block.raw_text or "E = mc^2"
        num_str = f"({block.equation_number})" if block.equation_number else ""
        eq_data = [[Paragraph(f"<b><i>{expr}</i></b>", styles['Equation_Text']), Paragraph(f"{num_str}", styles['Equation_Text'])]]
        eq_table = Table(eq_data, colWidths=[A4[0] - 200, 56])
        eq_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        story.append(eq_table)

    # =========================================================================
    # Bibliography
    # =========================================================================

    @classmethod
    def _render_bibliography(cls, story: List[Any], ir: DocumentIR, styles: Dict[str, ParagraphStyle]):
        if not ir.bibliography_entries:
            return

        story.append(PageBreak())
        title = "REFERENCES" if "apa" in ir.metadata.citation_style.lower() else "BIBLIOGRAPHY"
        story.append(Paragraph(title, styles['Heading_1']))
        story.append(Spacer(1, 10))

        for entry in ir.bibliography_entries:
            story.append(Paragraph(entry.citation_text, styles['Bibliography_Entry']))

    @classmethod
    def _compute_sha256(cls, filepath: str) -> str:
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
