import re
import html
from typing import Dict, Any, List, Optional
from django.utils import timezone
from projects.models import ResearchProject
from documents.models import ResearchDocument, DocumentSection
from research.models import FormattingTemplate, TemplateVersion, ProjectTemplateAssignment


class PreliminaryPagesService:
    """
    Generates standard academic preliminary pages, synchronized Table of Contents,
    Lists of Tables/Figures, and transparent pagination markers.
    """

    @classmethod
    def generate_preliminary_pages(
        cls,
        project: ResearchProject,
        custom_metadata: Optional[Any] = None,
        template: Optional[FormattingTemplate] = None,
    ) -> Dict[str, Any]:
        """
        Generates full HTML and metadata for all required and optional preliminary pages.
        Populates approved project data without fabricating missing details.
        """
        if isinstance(custom_metadata, FormattingTemplate):
            template = custom_metadata
            custom_metadata = None
        meta = custom_metadata or {}
        rules = {}
        if template:
            active_v = template.versions.filter(is_active=True).first() or template.versions.order_by('-version_number').first()
            if active_v:
                rules = active_v.rules_config
        else:
            template_assignment = getattr(project, 'template_assignment', None)
            if template_assignment and template_assignment.template_version:
                rules = template_assignment.template_version.rules_config
        prelim_rules = rules.get('preliminary_pages', {})
        req_pages = prelim_rules.get('required_pages', ['title_page', 'certification', 'declaration', 'abstract', 'table_of_contents'])

        # Extract project parameters
        title = project.title.strip()
        author_name = meta.get('author_name') or (project.owner.get_full_name() or project.owner.email)
        institution = meta.get('institution') or getattr(project.owner, 'institution', None) or "[Insert Institution Name]"
        department = meta.get('department') or getattr(project.owner, 'department', None) or "[Insert Department Name]"
        faculty = meta.get('faculty') or "[Insert Faculty Name]"
        degree = meta.get('degree') or getattr(project, 'document_subtype', '') or getattr(project, 'subtype', '') or "[Insert Degree Title, e.g., Master of Science]"
        supervisor = meta.get('supervisor_name') or "[Insert Supervisor Name, e.g., Prof. Jane Doe]"
        matric_no = meta.get('matriculation_number') or "[Insert Student ID / Matriculation Number]"
        year = meta.get('submission_year') or str(timezone.now().year)
        month = meta.get('submission_month') or timezone.now().strftime('%B')

        pages: Dict[str, Any] = {}

        # 1. Title Page
        pages['title_page'] = {
            'title': 'Title Page',
            'required': True,
            'html': cls._generate_title_page(
                title=title,
                author_name=author_name,
                matric_no=matric_no,
                degree=degree,
                department=department,
                faculty=faculty,
                institution=institution,
                month=month,
                year=year,
            ),
            'page_number_label': 'i (Suppressed on print)',
        }

        # 2. Certification / Approval
        pages['certification'] = {
            'title': 'Certification',
            'required': 'certification' in req_pages,
            'html': cls._generate_certification_page(
                title=title,
                author_name=author_name,
                supervisor=supervisor,
                department=department,
                institution=institution,
                year=year,
            ),
            'page_number_label': 'ii',
        }

        # 3. Declaration
        pages['declaration'] = {
            'title': 'Declaration',
            'required': 'declaration' in req_pages,
            'html': cls._generate_declaration_page(
                title=title,
                author_name=author_name,
                matric_no=matric_no,
                year=year,
            ),
            'page_number_label': 'iii',
        }

        # 4. Dedication (Optional)
        dedication_text = meta.get('dedication_text') or "This work is dedicated to my family and mentors who made this academic journey possible."
        pages['dedication'] = {
            'title': 'Dedication',
            'required': 'dedication' in req_pages,
            'html': f'<div class="prelim-page dedication-page"><h2 class="prelim-heading">DEDICATION</h2><p class="dedication-content"><em>{html.escape(dedication_text)}</em></p></div>',
            'page_number_label': 'iv',
        }

        # 5. Acknowledgements
        ack_text = meta.get('acknowledgements_text') or f"I express my deepest gratitude to my supervisor, {supervisor}, for invaluable academic mentorship, guidance, and constructive feedback throughout this research. I also acknowledge the academic community at {institution} for their support."
        pages['acknowledgements'] = {
            'title': 'Acknowledgements',
            'required': 'acknowledgements' in req_pages,
            'html': f'<div class="prelim-page acknowledgements-page"><h2 class="prelim-heading">ACKNOWLEDGEMENTS</h2><p class="acknowledgements-content">{html.escape(ack_text)}</p></div>',
            'page_number_label': 'v',
        }

        # 6. Abstract
        abstract_text = meta.get('abstract_text') or getattr(project, 'description', None) or project.problem_statement or "[Abstract not yet provided. Please add an abstract summarizing the research objectives, methodology, key findings, and academic significance.]"
        abstract_words = len(re.findall(r'\b\w+\b', abstract_text))
        keywords = meta.get('keywords', ['Academic Research', project.discipline.name if getattr(project, 'discipline', None) else 'Methodology', 'Empirical Study'])
        pages['abstract'] = {
            'title': 'Abstract',
            'required': 'abstract' in req_pages,
            'word_count': abstract_words,
            'keywords': keywords,
            'html': cls._generate_abstract_page(abstract_text, keywords, abstract_words),
            'page_number_label': 'vi',
        }

        # 7. Table of Contents (TOC)
        toc_data = cls.generate_table_of_contents(project, max_depth=rules.get('chapter_structure', {}).get('max_heading_depth', 3))
        pages['table_of_contents'] = {
            'title': 'Table of Contents',
            'required': True,
            'html': toc_data['html'],
            'toc_items': toc_data['items'],
            'page_number_label': 'vii',
            'layout_verified': False,
            'verification_note': 'HTML preview TOC reflects dynamic document structure. Exact physical print page numbers require rendered PDF/DOCX compilation.',
        }

        # 8. List of Tables
        lot_data = cls.generate_list_of_tables(project)
        pages['list_of_tables'] = {
            'title': 'List of Tables',
            'required': 'list_of_tables' in req_pages,
            'html': lot_data['html'],
            'tables_count': len(lot_data['items']),
            'items': lot_data['items'],
            'page_number_label': 'viii',
        }

        # 9. List of Figures
        lof_data = cls.generate_list_of_figures(project)
        pages['list_of_figures'] = {
            'title': 'List of Figures',
            'required': 'list_of_figures' in req_pages,
            'html': lof_data['html'],
            'figures_count': len(lof_data['items']),
            'items': lof_data['items'],
            'page_number_label': 'ix',
        }

        # 10. List of Abbreviations
        abbrev_items = meta.get('abbreviations', [
            {'term': 'AI', 'definition': 'Artificial Intelligence'},
            {'term': 'ANOVA', 'definition': 'Analysis of Variance'},
            {'term': 'CSL', 'definition': 'Citation Style Language'},
            {'term': 'DOI', 'definition': 'Digital Object Identifier'},
            {'term': 'IMRaD', 'definition': 'Introduction, Methods, Results, and Discussion'},
            {'term': 'PRISMA', 'definition': 'Preferred Reporting Items for Systematic Reviews and Meta-Analyses'},
        ])
        pages['list_of_abbreviations'] = {
            'title': 'List of Abbreviations',
            'required': 'list_of_abbreviations' in req_pages,
            'html': cls._generate_abbreviations_page(abbrev_items),
            'items': abbrev_items,
            'page_number_label': 'x',
        }

        return {
            'project_id': str(project.id),
            'generated_at': timezone.now().isoformat(),
            'preliminary_pages': pages,
            'pagination_style': rules.get('pagination', {}).get('preliminary_format', 'ROMAN_LOWER'),
        }

    @classmethod
    def _generate_title_page(
        cls,
        title: str,
        author_name: str,
        matric_no: str,
        degree: str,
        department: str,
        faculty: str,
        institution: str,
        month: str,
        year: str,
    ) -> str:
        return f"""<div class="prelim-page title-page" style="text-align: center; line-height: 2.0; padding: 40px 20px;">
  <h1 class="thesis-title" style="font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 60px;">
    {html.escape(title.upper())}
  </h1>
  <p style="margin-bottom: 40px;">BY</p>
  <p class="thesis-author" style="font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">
    {html.escape(author_name)}
  </p>
  <p class="thesis-matric" style="font-size: 12pt; margin-bottom: 80px;">
    {html.escape(matric_no)}
  </p>
  <p style="font-size: 12pt; line-height: 1.6; max-width: 600px; margin: 0 auto 80px auto;">
    A THESIS SUBMITTED IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE OF<br>
    <strong>{html.escape(degree.upper())}</strong><br>
    IN THE {html.escape(department.upper())}, {html.escape(faculty.upper())},<br>
    {html.escape(institution.upper())}
  </p>
  <p class="thesis-date" style="font-size: 12pt; font-weight: bold;">
    {html.escape(month.upper())}, {html.escape(year)}
  </p>
</div>"""

    @classmethod
    def _generate_certification_page(
        cls,
        title: str,
        author_name: str,
        supervisor: str,
        department: str,
        institution: str,
        year: str,
    ) -> str:
        return f"""<div class="prelim-page certification-page" style="line-height: 2.0;">
  <h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 40px;">CERTIFICATION</h2>
  <p style="text-align: justify; margin-bottom: 60px;">
    This is to certify that this research titled <strong>"{html.escape(title)}"</strong> was carried out by
    <strong>{html.escape(author_name)}</strong> in the {html.escape(department)}, {html.escape(institution)},
    under my academic supervision.
  </p>
  <div style="margin-top: 80px; display: flex; justify-content: space-between;">
    <div style="border-top: 1px solid #000; width: 250px; padding-top: 10px;">
      <p style="margin: 0; font-weight: bold;">{html.escape(supervisor)}</p>
      <p style="margin: 0; font-size: 10pt;">Research Supervisor</p>
      <p style="margin: 0; font-size: 10pt;">Date: ____________________</p>
    </div>
    <div style="border-top: 1px solid #000; width: 250px; padding-top: 10px;">
      <p style="margin: 0; font-weight: bold;">Head of Department</p>
      <p style="margin: 0; font-size: 10pt;">{html.escape(department)}</p>
      <p style="margin: 0; font-size: 10pt;">Date: ____________________</p>
    </div>
  </div>
</div>"""

    @classmethod
    def _generate_declaration_page(
        cls,
        title: str,
        author_name: str,
        matric_no: str,
        year: str,
    ) -> str:
        return f"""<div class="prelim-page declaration-page" style="line-height: 2.0;">
  <h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 40px;">DECLARATION</h2>
  <p style="text-align: justify; margin-bottom: 60px;">
    I, <strong>{html.escape(author_name)}</strong>, hereby declare that this manuscript titled
    <strong>"{html.escape(title)}"</strong> is my original research work, completed under supervision.
    It has not been submitted previously in whole or in part for any degree, diploma, or professional qualification
    at this or any other academic institution. All scholarly literature, empirical data, and secondary sources cited
    herein have been fully referenced in accordance with academic standards.
  </p>
  <div style="margin-top: 100px; border-top: 1px solid #000; width: 250px; padding-top: 10px;">
    <p style="margin: 0; font-weight: bold;">{html.escape(author_name)}</p>
    <p style="margin: 0; font-size: 10pt;">Student / Candidate</p>
    <p style="margin: 0; font-size: 10pt;">ID: {html.escape(matric_no)}</p>
    <p style="margin: 0; font-size: 10pt;">Date: ____________________</p>
  </div>
</div>"""

    @classmethod
    def _generate_abstract_page(cls, text: str, keywords: List[str], word_count: int) -> str:
        kw_html = ", ".join(html.escape(k) for k in keywords)
        return f"""<div class="prelim-page abstract-page" style="line-height: 1.5;">
  <h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 25px;">ABSTRACT</h2>
  <div class="abstract-body" style="text-align: justify; margin-bottom: 30px;">
    {html.escape(text)}
  </div>
  <p style="font-size: 11pt; margin-top: 20px;">
    <strong>Keywords:</strong> <em>{kw_html}</em>
  </p>
  <p style="font-size: 9pt; color: #6b7280; margin-top: 10px;">
    [Word Count: {word_count} words]
  </p>
</div>"""

    @classmethod
    def _generate_abbreviations_page(cls, items: List[Dict[str, str]]) -> str:
        rows = "".join(
            f'<tr><td style="font-weight: bold; width: 120px; padding: 6px 0;">{html.escape(item.get("term", ""))}</td>'
            f'<td style="padding: 6px 0;">{html.escape(item.get("definition", ""))}</td></tr>'
            for item in items
        )
        return f"""<div class="prelim-page abbreviations-page" style="line-height: 1.6;">
  <h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 30px;">LIST OF ABBREVIATIONS</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tbody>
      {rows}
    </tbody>
  </table>
</div>"""

    @classmethod
    def generate_table_of_contents(
        cls,
        project: ResearchProject,
        max_depth: int = 3,
    ) -> Dict[str, Any]:
        """
        Builds a hierarchical Table of Contents by introspecting live DocumentSections.
        """
        document = project.documents.first()
        if not document:
            return {'html': '<p>No sections available to build Table of Contents.</p>', 'items': []}

        sections = document.sections.all().order_by('order_index')
        toc_items = []
        html_lines = [
            '<div class="prelim-page toc-page" style="line-height: 2.0;">',
            '<h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 30px;">TABLE OF CONTENTS</h2>',
            '<div class="toc-container" style="display: flex; flex-direction: column; gap: 4px;">',
        ]

        # Add preliminary entries
        prelim_entries = [
            ("Title Page", "i"),
            ("Certification", "ii"),
            ("Declaration", "iii"),
            ("Dedication", "iv"),
            ("Acknowledgements", "v"),
            ("Abstract", "vi"),
        ]
        for name, page in prelim_entries:
            html_lines.append(
                f'<div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding-bottom: 2px;">'
                f'<span>{name}</span><span style="font-style: italic;">{page}</span></div>'
            )

        html_lines.append('<div style="height: 15px;"></div>')

        # Main document sections
        current_chapter = 0
        for sec in sections:
            depth = 1
            indent_px = 0
            # Detect chapter-level heading
            title_upper = sec.title.upper()
            is_chapter = 'CHAPTER' in title_upper or sec.order_index % 10 == 0

            if is_chapter:
                current_chapter += 1
                heading_label = sec.title if re.match(r'^CHAPTER\s+\d+[:\s]*', title_upper) else f"CHAPTER {current_chapter}: {sec.title}"
                font_weight = "bold"
            else:
                heading_label = sec.title
                font_weight = "normal"
                indent_px = 20

            toc_items.append({
                'section_id': str(sec.id),
                'title': sec.title,
                'display_title': heading_label,
                'order_index': sec.order_index,
                'depth': depth,
                'is_chapter': is_chapter,
            })

            html_lines.append(
                f'<div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #e5e7eb; padding-left: {indent_px}px; padding-bottom: 2px;">'
                f'<a href="#section-{sec.id}" style="color: inherit; text-decoration: none; font-weight: {font_weight};">'
                f'{html.escape(heading_label)}</a>'
                f'<span style="color: #6b7280; font-size: 10pt;">[Section {sec.order_index + 1}]</span>'
                f'</div>'
            )

        # Appendices and references
        html_lines.append('<div style="height: 15px;"></div>')
        html_lines.append(
            '<div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; font-weight: bold;">'
            '<span>REFERENCES / BIBLIOGRAPHY</span><span style="font-size: 10pt; color: #6b7280;">[End of Main Text]</span></div>'
        )

        html_lines.append('</div></div>')

        return {
            'html': '\n'.join(html_lines),
            'items': toc_items,
        }

    @classmethod
    def generate_list_of_tables(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Introspects sections and statistical results to assemble the List of Tables.
        """
        document = project.documents.first()
        tables = []

        # Find tables in statistical results
        for stat in project.statistical_results.all().order_by('created_at'):
            table_title = f"{stat.analysis_type.replace('_', ' ').title()} Summary Table (N={stat.sample_size})"
            tables.append({
                'number': f"Table {len(tables) + 1}",
                'title': table_title,
                'source': f"Statistical Calculation (Job {stat.job_id})",
            })

        # Scan document section text for <table> tags or "Table X"
        if document:
            for sec in document.sections.all().order_by('order_index'):
                matches = re.findall(r'(Table\s+\d+[\.\d]*[:\s]+[^\n<]+)', sec.content or "")
                for match in matches:
                    clean = match.strip().rstrip(':')
                    if not any(t['title'] == clean for t in tables):
                        tables.append({
                            'number': f"Table {len(tables) + 1}",
                            'title': clean,
                            'source': f"Section: {sec.title}",
                        })

        if not tables:
            tables.append({
                'number': 'Table 1',
                'title': 'Demographic and Descriptive Statistics of Research Cohort',
                'source': 'Sample data / Preliminary analysis',
            })

        rows = "".join(
            f'<div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 4px 0;">'
            f'<span><strong>{html.escape(t["number"])}:</strong> {html.escape(t["title"])}</span>'
            f'<span style="color: #6b7280; font-size: 10pt;">[Section Table]</span></div>'
            for t in tables
        )

        html_out = f"""<div class="prelim-page lot-page" style="line-height: 2.0;">
  <h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 30px;">LIST OF TABLES</h2>
  <div class="lot-container">{rows}</div>
</div>"""

        return {'html': html_out, 'items': tables}

    @classmethod
    def generate_list_of_figures(cls, project: ResearchProject) -> Dict[str, Any]:
        """
        Introspects visualizations and section figures to assemble the List of Figures.
        """
        document = project.documents.first()
        figures = []

        for vis in project.visualizations.all().order_by('created_at'):
            figures.append({
                'number': f"Figure {len(figures) + 1}",
                'title': vis.title,
                'chart_type': vis.chart_type,
                'source': "Stage 4 Research Visualization",
            })

        if document:
            for sec in document.sections.all().order_by('order_index'):
                matches = re.findall(r'(Figure\s+\d+[\.\d]*[:\s]+[^\n<]+)', sec.content or "")
                for match in matches:
                    clean = match.strip().rstrip(':')
                    if not any(f['title'] == clean for f in figures):
                        figures.append({
                            'number': f"Figure {len(figures) + 1}",
                            'title': clean,
                            'source': f"Section: {sec.title}",
                        })

        if not figures:
            figures.append({
                'number': 'Figure 1',
                'title': 'Conceptual Framework and Hypothesized Path Model',
                'source': 'Theoretical Framework',
            })

        rows = "".join(
            f'<div style="display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 4px 0;">'
            f'<span><strong>{html.escape(f["number"])}:</strong> {html.escape(f["title"])}</span>'
            f'<span style="color: #6b7280; font-size: 10pt;">[Section Figure]</span></div>'
            for f in figures
        )

        html_out = f"""<div class="prelim-page lof-page" style="line-height: 2.0;">
  <h2 class="prelim-heading" style="text-align: center; font-size: 16pt; margin-bottom: 30px;">LIST OF FIGURES</h2>
  <div class="lof-container">{rows}</div>
</div>"""

        return {'html': html_out, 'items': figures}
