from research.orcid_utils import validate_orcid_checksum
import re
from typing import Dict, Any, List, Optional
from django.utils import timezone
from projects.models import ResearchProject
from documents.models import ResearchDocument, DocumentSection
from research.models import (
    FormattingTemplate,
    TemplateVersion,
    ProjectTemplateAssignment,
    FormattingValidation,
    FormattingIssue,
    ManuscriptMetadata,
    IssueSeverity,
    RuleCategory,
)
from research.institutional_template_service import InstitutionalTemplateService


class ComplianceEngine:
    """
    Deterministic academic manuscript formatting and compliance validator.
    Audits document against institutional or journal template rules, categorizing
    issues across CRITICAL, MAJOR, MINOR, and INFORMATIONAL tiers.
    """

    ORCID_REGEX = r'^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'

    @classmethod
    def audit_project_compliance(
        cls,
        project: ResearchProject,
        template_version: Optional[TemplateVersion] = None,
    ) -> FormattingValidation:
        """
        Executes a comprehensive formatting compliance audit of the research project.
        """
        # Determine active template rules
        assignment = getattr(project, 'template_assignment', None)
        active_version = template_version or (assignment.template_version if assignment else None)

        if not active_version:
            # Fallback to default APA standard version if no assignment
            default_rules = InstitutionalTemplateService.get_default_rules_config()
        else:
            default_rules = active_version.rules_config

        document = project.documents.first()
        sections = list(document.sections.all().order_by('order_index')) if document else []
        metadata = getattr(project, 'manuscript_metadata', None)

        issues: List[Dict[str, Any]] = []

        # 1. Audit Preliminary Pages
        cls._audit_preliminary_pages(project, default_rules, issues)

        # 2. Audit Typography & Spacing
        cls._audit_typography(sections, default_rules, issues)

        # 3. Audit Heading Hierarchy & Chapter Structure
        cls._audit_heading_structure(sections, default_rules, issues)

        # 4. Audit Tables & Figures
        cls._audit_tables_and_figures(project, sections, default_rules, issues)

        # 5. Audit Citations & References
        cls._audit_citations(project, default_rules, issues)

        # 6. Audit Word Limits & Abstract
        cls._audit_word_limits(project, sections, default_rules, issues)

        # 7. Audit Author & Publication Metadata
        cls._audit_metadata(project, metadata, default_rules, issues)

        # 8. Physical Page Settings Notice (Truthful verification guard)
        cls._audit_page_settings(default_rules, issues)

        # Tally severities
        critical_count = sum(1 for i in issues if i['severity'] == IssueSeverity.CRITICAL)
        major_count = sum(1 for i in issues if i['severity'] == IssueSeverity.MAJOR)
        minor_count = sum(1 for i in issues if i['severity'] == IssueSeverity.MINOR)
        info_count = sum(1 for i in issues if i['severity'] == IssueSeverity.INFORMATIONAL)

        if critical_count > 0:
            overall_status = 'NON_COMPLIANT'
        elif major_count > 0:
            overall_status = 'NON_COMPLIANT'
        elif minor_count > 0:
            overall_status = 'PARTIALLY_VERIFIED'
        else:
            overall_status = 'COMPLIANT'

        # Persist validation record
        validation = FormattingValidation.objects.create(
            project=project,
            template_version=active_version,
            overall_status=overall_status,
            total_issues=len(issues),
            critical_count=critical_count,
            major_count=major_count,
            minor_count=minor_count,
            info_count=info_count,
            summary={
                'checked_at': timezone.now().isoformat(),
                'template_name': active_version.template.name if active_version else 'Default Standard',
                'sections_analyzed': len(sections),
                'status_label': overall_status,
            }
        )

        # Create individual issue records
        for issue_data in issues:
            FormattingIssue.objects.create(
                validation=validation,
                rule_key=issue_data['rule_key'],
                rule_category=issue_data['rule_category'],
                severity=issue_data['severity'],
                current_value=str(issue_data.get('current_value', '')),
                expected_value=str(issue_data.get('expected_value', '')),
                location=issue_data.get('location', ''),
                suggested_fix=issue_data.get('suggested_fix', ''),
                fix_available=issue_data.get('fix_available', False),
            )

        return validation

    @classmethod
    def _audit_preliminary_pages(
        cls,
        project: ResearchProject,
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        prelim_rules = rules.get('preliminary_pages', {})
        req_pages = prelim_rules.get('required_pages', ['title_page', 'certification', 'declaration', 'abstract', 'table_of_contents'])

        # Abstract check
        abstract = getattr(project, 'description', '') or project.problem_statement or ''
        if 'abstract' in req_pages:
            if not abstract or len(abstract.strip()) < 50:
                issues.append({
                    'rule_key': 'PRELIM_ABSTRACT_MISSING',
                    'rule_category': RuleCategory.PRELIMINARY_PAGES,
                    'severity': IssueSeverity.CRITICAL,
                    'current_value': 'Abstract is empty or under 50 characters',
                    'expected_value': 'Structured research abstract summarizing background, methods, results, and conclusion',
                    'location': 'Preliminary Pages -> Abstract',
                    'suggested_fix': 'Provide a concise abstract in the project overview or Preliminary Pages tab.',
                    'fix_available': False,
                })

        # Title check
        if 'title_page' in req_pages:
            if not project.title or len(project.title.strip()) < 10:
                issues.append({
                    'rule_key': 'PRELIM_TITLE_TOO_SHORT',
                    'rule_category': RuleCategory.PRELIMINARY_PAGES,
                    'severity': IssueSeverity.CRITICAL,
                    'current_value': project.title,
                    'expected_value': 'Descriptive research title of at least 10 characters',
                    'location': 'Preliminary Pages -> Title Page',
                    'suggested_fix': 'Specify a full academic title for the project.',
                    'fix_available': False,
                })

    @classmethod
    def _audit_typography(
        cls,
        sections: List[DocumentSection],
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        typo = rules.get('typography', {})
        expected_line_spacing = typo.get('line_spacing', 2.0)
        expected_font = typo.get('primary_font', 'Times New Roman')

        for sec in sections:
            content = sec.content or ""
            # Check for font anomalies in inline HTML styles
            if 'font-family:' in content:
                found_fonts = re.findall(r'font-family:\s*([^;"]+)', content)
                for f in found_fonts:
                    if expected_font.lower() not in f.lower() and 'inherit' not in f.lower():
                        issues.append({
                            'rule_key': 'TYPOGRAPHY_FONT_FAMILY_MISMATCH',
                            'rule_category': RuleCategory.TYPOGRAPHY,
                            'severity': IssueSeverity.MINOR,
                            'current_value': f.strip(),
                            'expected_value': expected_font,
                            'location': f"Section: '{sec.title}'",
                            'suggested_fix': f"Normalize text font to {expected_font}.",
                            'fix_available': True,
                        })
                        break

    @classmethod
    def _audit_heading_structure(
        cls,
        sections: List[DocumentSection],
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        chapter_rules = rules.get('chapter_structure', {})
        numbering_style = chapter_rules.get('numbering_style', 'ARABIC_DECIMAL')
        max_depth = chapter_rules.get('max_heading_depth', 3)

        for sec in sections:
            content = sec.content or ""
            # Check heading depth (e.g. h4, h5 when max is 3)
            if max_depth == 3 and ('<h4' in content or '<h5' in content or '<h6' in content):
                issues.append({
                    'rule_key': 'HEADING_DEPTH_EXCEEDED',
                    'rule_category': RuleCategory.CHAPTER_STRUCTURE,
                    'severity': IssueSeverity.MINOR,
                    'current_value': 'Headings deeper than H3 detected (H4/H5)',
                    'expected_value': f'Maximum heading depth is H{max_depth}',
                    'location': f"Section: '{sec.title}'",
                    'suggested_fix': 'Demote deep headings or format as run-in paragraph headings.',
                    'fix_available': True,
                })

            # Check numbering format if ARABIC_DECIMAL required
            if numbering_style == 'ARABIC_DECIMAL':
                # Heading titles like "1.Introduction" or missing chapter prefix
                if re.match(r'^[A-Z]\.\s+', sec.title):  # Alphabetic when decimal expected
                    issues.append({
                        'rule_key': 'HEADING_NUMBERING_STYLE_MISMATCH',
                        'rule_category': RuleCategory.CHAPTER_STRUCTURE,
                        'severity': IssueSeverity.MAJOR,
                        'current_value': sec.title[:15],
                        'expected_value': 'Arabic decimal numbering (e.g., 1.1, 1.2)',
                        'location': f"Section: '{sec.title}'",
                        'suggested_fix': 'Renumber headings using Arabic numerals.',
                        'fix_available': True,
                    })

    @classmethod
    def _audit_tables_and_figures(
        cls,
        project: ResearchProject,
        sections: List[DocumentSection],
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        tf_rules = rules.get('tables_figures', {})
        table_placement = tf_rules.get('table_caption_placement', 'ABOVE')
        fig_placement = tf_rules.get('figure_caption_placement', 'BELOW')

        for sec in sections:
            content = sec.content or ""
            # Check for uncaptioned tables
            if '<table' in content and not re.search(r'(Table\s+\d+|caption)', content, re.IGNORECASE):
                issues.append({
                    'rule_key': 'TABLE_MISSING_CAPTION',
                    'rule_category': RuleCategory.TABLES_FIGURES,
                    'severity': IssueSeverity.MAJOR,
                    'current_value': 'Table element found without title or caption',
                    'expected_value': 'Standardized Table Number and Descriptive Title above the table',
                    'location': f"Section: '{sec.title}'",
                    'suggested_fix': 'Add a numbered table caption (e.g., "Table 1: Descriptive Statistics").',
                    'fix_available': True,
                })

            # Check for uncaptioned figures or img tags
            if '<img' in content and not re.search(r'(Figure\s+\d+|figcaption)', content, re.IGNORECASE):
                issues.append({
                    'rule_key': 'FIGURE_MISSING_CAPTION',
                    'rule_category': RuleCategory.TABLES_FIGURES,
                    'severity': IssueSeverity.MAJOR,
                    'current_value': 'Image/Figure found without caption',
                    'expected_value': 'Figure caption below the figure (e.g., "Figure 1: Conceptual Framework")',
                    'location': f"Section: '{sec.title}'",
                    'suggested_fix': 'Add a standardized figure caption beneath the image.',
                    'fix_available': True,
                })

    @classmethod
    def _audit_citations(
        cls,
        project: ResearchProject,
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        cite_rules = rules.get('citation_reference', {})
        expected_style = cite_rules.get('citation_style', 'apa-7th').lower()

        # Check project citations
        citations = project.citations.all()
        for c in citations:
            if c.citation_style and c.citation_style.lower() != expected_style:
                issues.append({
                    'rule_key': 'CITATION_STYLE_INCONSISTENCY',
                    'rule_category': RuleCategory.CITATIONS,
                    'severity': IssueSeverity.MAJOR,
                    'current_value': f"Citation #{c.id} formatted in '{c.citation_style}'",
                    'expected_value': f"Template requires '{expected_style}' format",
                    'location': f"Citation: '{c.in_text_format}'",
                    'suggested_fix': f"Re-format citation using the {expected_style.upper()} CSL engine.",
                    'fix_available': True,
                })
                break

    @classmethod
    def _audit_word_limits(
        cls,
        project: ResearchProject,
        sections: List[DocumentSection],
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        w_rules = rules.get('word_limits', {})
        abs_min = w_rules.get('abstract_min_words', 150)
        abs_max = w_rules.get('abstract_max_words', 350)
        ms_max = w_rules.get('manuscript_max_words')

        abstract = getattr(project, 'description', '') or project.problem_statement or ''
        if abstract:
            words = len(re.findall(r'\b\w+\b', abstract))
            if words > abs_max:
                issues.append({
                    'rule_key': 'ABSTRACT_EXCEEDS_WORD_LIMIT',
                    'rule_category': RuleCategory.WORD_LIMITS,
                    'severity': IssueSeverity.CRITICAL,
                    'current_value': f"{words} words",
                    'expected_value': f"Maximum of {abs_max} words",
                    'location': 'Preliminary Pages -> Abstract',
                    'suggested_fix': f"Shorten abstract by {words - abs_max} words to satisfy submission guidelines.",
                    'fix_available': False,
                })
            elif words < abs_min:
                issues.append({
                    'rule_key': 'ABSTRACT_BELOW_MINIMUM_WORDS',
                    'rule_category': RuleCategory.WORD_LIMITS,
                    'severity': IssueSeverity.MINOR,
                    'current_value': f"{words} words",
                    'expected_value': f"Minimum of {abs_min} words",
                    'location': 'Preliminary Pages -> Abstract',
                    'suggested_fix': f"Expand abstract with summary of methodology and substantive implications.",
                    'fix_available': False,
                })

        # Total manuscript word count check
        total_words = sum(sec.word_count for sec in sections)
        if ms_max and total_words > ms_max:
            issues.append({
                'rule_key': 'MANUSCRIPT_EXCEEDS_MAX_WORDS',
                'rule_category': RuleCategory.WORD_LIMITS,
                'severity': IssueSeverity.CRITICAL,
                'current_value': f"{total_words} words",
                'expected_value': f"Maximum {ms_max} words allowed",
                'location': 'Full Manuscript',
                'suggested_fix': f"Condense manuscript prose to meet the {ms_max}-word institutional ceiling.",
                'fix_available': False,
            })

    @classmethod
    def _audit_metadata(
        cls,
        project: ResearchProject,
        metadata: Optional[ManuscriptMetadata],
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        ethics_stmt = metadata.ethics_approval_statement if metadata else ""
        category = getattr(project, 'document_category', '') or getattr(project, 'category', '')
        subtype = getattr(project, 'document_subtype', '')

        # Remediation C: Contextual Ethics Review Check
        study_design = (getattr(metadata, 'study_design_type', '') or '').upper() if metadata else ''
        involves_subjects = getattr(metadata, 'involves_human_or_animal_subjects', False) if metadata else False
        exemption_reason = (getattr(metadata, 'ethics_exemption_reason', '') or '').strip() if metadata else ''

        non_irb_designs = [
            'COMPUTATIONAL', 'SIMULATION', 'SYSTEMATIC_REVIEW', 'LITERATURE_REVIEW',
            'THEORETICAL', 'CONCEPTUAL', 'SECONDARY_DATA', 'SECONDARY_OPEN_DATA'
        ]
        is_non_irb_design = any(d in study_design for d in non_irb_designs)
        is_theoretical_project = any(
            t in str(category).upper() or t in str(subtype).upper()
            for t in ['THEORETICAL', 'CONCEPTUAL', 'SYSTEMATIC', 'REVIEW']
        )
        is_empirical = (
            'EMPIRICAL' in str(category).upper()
            or 'empirical' in project.title.lower()
            or 'empirical' in str(subtype).lower()
        )

        requires_ethics = (
            involves_subjects
            or (is_empirical and not is_non_irb_design and not is_theoretical_project)
        )

        if requires_ethics and not ethics_stmt and not exemption_reason:
            issues.append({
                'rule_key': 'METADATA_ETHICS_STATEMENT_MISSING',
                'rule_category': RuleCategory.METADATA,
                'severity': IssueSeverity.CRITICAL,
                'current_value': 'Ethics approval statement is empty',
                'expected_value': 'Formal institutional ethics board approval reference or exemption statement',
                'location': 'Publication Metadata -> Ethics Approval',
                'suggested_fix': 'Provide IRB/Ethics committee approval reference number or institutional exemption statement.',
                'fix_available': False,
            })

        if not metadata:
            issues.append({
                'rule_key': 'METADATA_RECORD_MISSING',
                'rule_category': RuleCategory.METADATA,
                'severity': IssueSeverity.MAJOR,
                'current_value': 'No publication metadata record configured',
                'expected_value': 'Configured author affiliations, ethics, and statements',
                'location': 'Publication Metadata Tab',
                'suggested_fix': 'Complete the author affiliations, ORCIDs, and ethics declarations in the Metadata tab.',
                'fix_available': False,
            })
            return

        # Check ORCIDs regex format and ISO 7064 Mod 11-2 checksum
        orcids = metadata.orcid_identifiers or []
        for item in orcids:
            orcid_val = item.get('orcid', '').strip()
            if orcid_val:
                if not re.match(cls.ORCID_REGEX, orcid_val):
                    issues.append({
                        'rule_key': 'METADATA_INVALID_ORCID_FORMAT',
                        'rule_category': RuleCategory.METADATA,
                        'severity': IssueSeverity.MAJOR,
                        'current_value': orcid_val,
                        'expected_value': 'Valid 16-character ORCID (e.g., 0000-0002-1825-0097)',
                        'location': f"Author ORCID: {item.get('name', 'Author')}",
                        'suggested_fix': 'Provide a standard 16-digit hyphenated ORCID identifier.',
                        'fix_available': False,
                    })
                elif not validate_orcid_checksum(orcid_val):
                    issues.append({
                        'rule_key': 'METADATA_INVALID_ORCID_CHECKSUM',
                        'rule_category': RuleCategory.METADATA,
                        'severity': IssueSeverity.MAJOR,
                        'current_value': orcid_val,
                        'expected_value': 'Valid ISO 7064 Mod 11-2 ORCID check digit',
                        'location': f"Author ORCID: {item.get('name', 'Author')}",
                        'suggested_fix': 'Check the ORCID digits; the final check digit does not match the ISO 7064 Mod 11-2 algorithm.',
                        'fix_available': False,
                    })

        # Conflict of Interest check
        if not metadata.conflict_of_interest_statement:
            issues.append({
                'rule_key': 'METADATA_COI_STATEMENT_MISSING',
                'rule_category': RuleCategory.METADATA,
                'severity': IssueSeverity.MINOR,
                'current_value': 'Conflict of interest statement empty',
                'expected_value': 'Explicit conflict of interest declaration (or declaration of no conflict)',
                'location': 'Publication Metadata -> Conflict of Interest',
                'suggested_fix': 'Add an explicit declaration such as "The authors declare no competing interests."',
                'fix_available': False,
            })

    @classmethod
    def _audit_page_settings(
        cls,
        rules: Dict[str, Any],
        issues: List[Dict[str, Any]]
    ):
        """
        Truthful verification guard: reports INFORMATIONAL status that exact physical margins
        cannot be guaranteed in the web preview until compiled to PDF/DOCX.
        """
        margins = rules.get('page_settings', {}).get('margins_inches', {})
        left = margins.get('left', 1.5)
        top = margins.get('top', 1.0)
        paper = rules.get('page_settings', {}).get('paper_size', 'A4')

        issues.append({
            'rule_key': 'PAGE_LAYOUT_WEB_PREVIEW_NOTICE',
            'rule_category': RuleCategory.PAGE_SETTINGS,
            'severity': IssueSeverity.INFORMATIONAL,
            'current_value': f"Web viewport render (Paper: {paper})",
            'expected_value': f"Physical print margins: Left {left}in (binding gutter), Top/Bottom/Right {top}in",
            'location': 'Full Document Page Layout',
            'suggested_fix': 'Exact millimeter margins and page breaks will be enforced during PDF/DOCX export.',
            'fix_available': False,
        })
