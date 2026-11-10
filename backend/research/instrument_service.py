"""
Instrument Design Service for ScholarForge AI.

Handles:
- Questionnaire, Interview Guide, and Observation Checklist generation from research variables and objectives.
- Psychometric scale configuration (5-point/7-point Likert, Semantic Differential, Multiple Choice).
- Reverse coding and polarity flagging.
- Instrument quality validation (double-barreled question detection, construct coverage, scale consistency).
- Clean Microsoft Word (.docx) export using standard OpenXML packaging without external binary dependencies.
"""

import io
import re
import html
import zipfile
from typing import Dict, List, Any, Optional
from django.utils import timezone


class InstrumentService:
    """Service for creating, validating, and exporting academic research instruments."""

    LIKERT_5_OPTIONS = [
        {"value": 1, "label": "Strongly Disagree"},
        {"value": 2, "label": "Disagree"},
        {"value": 3, "label": "Neutral / Undecided"},
        {"value": 4, "label": "Agree"},
        {"value": 5, "label": "Strongly Agree"}
    ]

    LIKERT_7_OPTIONS = [
        {"value": 1, "label": "Strongly Disagree"},
        {"value": 2, "label": "Disagree"},
        {"value": 3, "label": "Somewhat Disagree"},
        {"value": 4, "label": "Neither Agree nor Disagree"},
        {"value": 5, "label": "Somewhat Agree"},
        {"value": 6, "label": "Agree"},
        {"value": 7, "label": "Strongly Agree"}
    ]

    DEMOGRAPHIC_DEFAULTS = [
        {
            "code": "DEM_01",
            "text": "What is your gender identity?",
            "item_type": "MULTIPLE_CHOICE",
            "scale_type": "NOMINAL",
            "options": ["Female", "Male", "Non-binary / Third gender", "Prefer not to say"]
        },
        {
            "code": "DEM_02",
            "text": "What is your age bracket?",
            "item_type": "MULTIPLE_CHOICE",
            "scale_type": "ORDINAL",
            "options": ["Under 20 years", "20-29 years", "30-39 years", "40-49 years", "50 years and above"]
        },
        {
            "code": "DEM_03",
            "text": "What is your highest level of completed education?",
            "item_type": "MULTIPLE_CHOICE",
            "scale_type": "ORDINAL",
            "options": ["High School / Diploma", "Bachelor's Degree", "Master's Degree", "Doctorate (PhD/DBA)", "Other Professional Qualification"]
        },
        {
            "code": "DEM_04",
            "text": "How many years of relevant professional experience do you have?",
            "item_type": "MULTIPLE_CHOICE",
            "scale_type": "ORDINAL",
            "options": ["Less than 1 year", "1-3 years", "4-7 years", "8-10 years", "More than 10 years"]
        }
    ]

    @classmethod
    def generate_draft_items_for_variable(
        cls, variable_name: str, variable_role: str, variable_type: str, conceptual_definition: str = ""
    ) -> List[Dict[str, Any]]:
        """
        Generates 3 to 4 standardized, psychometrically grounded Likert items for a given research variable.
        Includes positive and reverse-coded statements for construct validity.
        """
        clean_name = variable_name.strip()
        items = []

        # Item 1: Direct positive operationalization
        items.append({
            "construct": clean_name,
            "dimension": "Core Manifestation",
            "text": f"In our day-to-day operations, {clean_name} is clearly evident and consistently practiced.",
            "item_type": "LIKERT",
            "scale_type": "LIKERT_5",
            "options": cls.LIKERT_5_OPTIONS,
            "is_reverse_coded": False,
            "polarity": "POSITIVE",
            "help_text": f"Measures the visible presence and consistency of {clean_name}."
        })

        # Item 2: Perceived efficacy / performance impact
        items.append({
            "construct": clean_name,
            "dimension": "Efficacy & Influence",
            "text": f"The level of {clean_name} significantly contributes to meeting our overall research and operational objectives.",
            "item_type": "LIKERT",
            "scale_type": "LIKERT_5",
            "options": cls.LIKERT_5_OPTIONS,
            "is_reverse_coded": False,
            "polarity": "POSITIVE",
            "help_text": f"Measures perceived utility and institutional contribution of {clean_name}."
        })

        # Item 3: Reverse-coded item (tests for acquiescence bias)
        items.append({
            "construct": clean_name,
            "dimension": "Constraint & Deficit",
            "text": f"Obstacles or inadequacies related to {clean_name} are frequently ignored or left unresolved.",
            "item_type": "LIKERT",
            "scale_type": "LIKERT_5",
            "options": cls.LIKERT_5_OPTIONS,
            "is_reverse_coded": True,
            "polarity": "NEGATIVE",
            "help_text": f"Reverse-scored item designed to mitigate respondent acquiescence bias regarding {clean_name}."
        })

        # Item 4: Future sustainability / institutionalization
        items.append({
            "construct": clean_name,
            "dimension": "Institutional Commitment",
            "text": f"There are adequate resources and leadership commitment dedicated to sustaining {clean_name}.",
            "item_type": "LIKERT",
            "scale_type": "LIKERT_5",
            "options": cls.LIKERT_5_OPTIONS,
            "is_reverse_coded": False,
            "polarity": "POSITIVE",
            "help_text": f"Evaluates structural support and commitment toward {clean_name}."
        })

        return items

    @classmethod
    def generate_interview_questions_for_variable(cls, variable_name: str, variable_role: str) -> List[Dict[str, Any]]:
        """Generates semi-structured qualitative interview prompts for a variable."""
        clean_name = variable_name.strip()
        return [
            {
                "construct": clean_name,
                "dimension": "Lived Experience",
                "text": f"Could you describe your personal experience with {clean_name} in your organization or setting?",
                "item_type": "OPEN_ENDED",
                "scale_type": "QUALITATIVE",
                "options": [],
                "is_reverse_coded": False,
                "polarity": "POSITIVE",
                "help_text": "Main open probe to elicit narrative description."
            },
            {
                "construct": clean_name,
                "dimension": "Challenges & Barriers",
                "text": f"What major challenges or unexpected complications have you observed when dealing with {clean_name}?",
                "item_type": "OPEN_ENDED",
                "scale_type": "QUALITATIVE",
                "options": [],
                "is_reverse_coded": False,
                "polarity": "POSITIVE",
                "help_text": "Probe focused on friction points and context-specific difficulties."
            },
            {
                "construct": clean_name,
                "dimension": "Strategic Solutions",
                "text": f"In your opinion, what interventions or adaptations would most effectively enhance {clean_name}?",
                "item_type": "OPEN_ENDED",
                "scale_type": "QUALITATIVE",
                "options": [],
                "is_reverse_coded": False,
                "polarity": "POSITIVE",
                "help_text": "Evaluative probe inviting respondent's forward-looking insights."
            }
        ]

    @classmethod
    def validate_instrument(cls, items_data: List[Dict[str, Any]], expected_variables: List[str] = None) -> Dict[str, Any]:
        """
        Validates instrument quality, psychometric structure, and item phrasing.
        Checks:
        1. Construct coverage against project variables.
        2. Detection of double-barreled questions (questions asking two things at once).
        3. Detection of leading or absolute language.
        4. Reverse coding presence for acquiescence bias control.
        """
        issues = []
        warnings = []
        constructs_found = set()
        has_reverse_coded = False

        double_barreled_patterns = [
            (r"\b(and also|as well as|and at the same time)\b", "Compound conjunction detected. Ensure the item assesses only one distinct cognitive attribute."),
            (r"\b(both\s+\w+\s+and\s+\w+)\b", "Dual concept reference ('both ... and'). Consider separating into two distinct items.")
        ]

        leading_language_patterns = [
            (r"\b(obviously|clearly|undeniably|without doubt|naturally)\b", "Leading or presumptive tone detected. Rephrase neutrally."),
            (r"\b(always|never|completely|impossible)\b", "Extreme absolute phrasing detected. Respondents rarely endorse absolute extremes.")
        ]

        for idx, item in enumerate(items_data):
            text = item.get("text", "")
            construct = item.get("construct", "General")
            if construct:
                constructs_found.add(construct.strip())

            if item.get("is_reverse_coded"):
                has_reverse_coded = True

            # Double barreled check
            for pattern, msg in double_barreled_patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    warnings.append({
                        "item_index": idx + 1,
                        "item_code": item.get("item_code", f"ITEM_{idx+1}"),
                        "type": "DOUBLE_BARRELED",
                        "text": text,
                        "message": msg
                    })

            # Leading words check
            for pattern, msg in leading_language_patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    warnings.append({
                        "item_index": idx + 1,
                        "item_code": item.get("item_code", f"ITEM_{idx+1}"),
                        "type": "LEADING_OR_ABSOLUTE",
                        "text": text,
                        "message": msg
                    })

            # Minimum length check
            if len(text.strip().split()) < 4:
                issues.append({
                    "item_index": idx + 1,
                    "type": "TOO_SHORT",
                    "message": "Question text is too brief to provide clear psychometric measurement."
                })

        # Check coverage
        missing_constructs = []
        if expected_variables:
            for ev in expected_variables:
                ev_clean = ev.strip()
                if not any(ev_clean.lower() in c.lower() for c in constructs_found):
                    missing_constructs.append(ev_clean)

            if missing_constructs:
                warnings.append({
                    "type": "MISSING_CONSTRUCTS",
                    "message": f"The instrument is missing items for variables: {', '.join(missing_constructs)}."
                })

        if not has_reverse_coded and len(items_data) >= 6:
            warnings.append({
                "type": "ACQUIESCENCE_BIAS_RISK",
                "message": "No reverse-coded items detected. Including 1-2 reverse-coded items helps detect and control for agreement bias."
            })

        is_valid = len(issues) == 0
        return {
            "is_valid": is_valid,
            "total_items": len(items_data),
            "constructs_covered": sorted(list(constructs_found)),
            "missing_variables": missing_constructs,
            "has_reverse_coded_items": has_reverse_coded,
            "issue_count": len(issues),
            "warning_count": len(warnings),
            "issues": issues,
            "warnings": warnings,
            "health_score": max(100 - (len(issues) * 20 + len(warnings) * 5), 20)
        }

    @classmethod
    def export_instrument_docx(
        cls,
        title: str,
        project_title: str,
        researcher_name: str,
        instructions: str,
        demographic_items: List[Dict[str, Any]],
        construct_sections: Dict[str, List[Dict[str, Any]]],
        confidentiality_statement: str = ""
    ) -> bytes:
        """
        Generates a professionally formatted, standard Microsoft Word (.docx) document
        using pure Python OpenXML packaging (zipfile + XML).
        """
        output_stream = io.BytesIO()

        # Build document body paragraphs
        body_parts = []

        # Document Header / Title
        body_parts.append(cls._docx_heading(title, level=1))
        body_parts.append(cls._docx_paragraph(f"Research Project: {project_title}", italic=True, space_after=100))
        body_parts.append(cls._docx_paragraph(f"Principal Investigator / Researcher: {researcher_name}", space_after=200))

        # Confidentiality & Consent Notice
        if not confidentiality_statement:
            confidentiality_statement = (
                "CONFIDENTIALITY AND ETHICAL ASSURANCE: Your participation in this research study is entirely voluntary. "
                "All responses gathered through this instrument will be treated with strict academic confidentiality and will "
                "be analyzed strictly in aggregate form. No individual response will be disclosed or identified in any publication."
            )
        body_parts.append(cls._docx_callout_box("ETHICAL DISCLOSURE & INFORMED CONSENT", confidentiality_statement))

        # Instructions
        if instructions:
            body_parts.append(cls._docx_heading("General Instructions", level=2))
            body_parts.append(cls._docx_paragraph(instructions, space_after=240))

        # Section A: Demographic Information
        if demographic_items:
            body_parts.append(cls._docx_heading("Section A: Demographic & Background Information", level=2))
            body_parts.append(cls._docx_paragraph("Please select or specify the option that most accurately describes you:", space_after=120))
            for i, dem in enumerate(demographic_items, start=1):
                body_parts.append(cls._docx_paragraph(f"{i}. {dem.get('text', '')}", bold=True, space_after=60))
                opts = dem.get("options", [])
                for opt in opts:
                    body_parts.append(cls._docx_paragraph(f"    [   ]  {opt}", space_after=40))
                body_parts.append(cls._docx_paragraph("", space_after=80))

        # Section B+: Construct Measurement Items
        sec_char = ord("B")
        for construct_name, items in construct_sections.items():
            section_letter = chr(sec_char)
            body_parts.append(cls._docx_heading(f"Section {section_letter}: Construct Evaluation — {construct_name}", level=2))
            body_parts.append(cls._docx_paragraph(
                "Please indicate your degree of agreement or disagreement with each statement below using the scale provided: "
                "(1 = Strongly Disagree [SD], 2 = Disagree [D], 3 = Neutral [N], 4 = Agree [A], 5 = Strongly Agree [SA]).",
                space_after=140
            ))

            # Table for Likert statements
            table_xml = cls._docx_likert_table(items)
            body_parts.append(table_xml)
            body_parts.append(cls._docx_paragraph("", space_after=200))
            sec_char += 1

        # Closing Appreciation
        body_parts.append(cls._docx_paragraph("Thank you very much for your time, effort, and valuable contribution to this academic study.", bold=True, center=True, space_after=200))

        document_xml = cls._wrap_docx_document("".join(body_parts))
        styles_xml = cls._docx_styles()
        rels_xml = cls._docx_rels()
        core_xml = cls._docx_core_properties(title)
        content_types_xml = cls._docx_content_types()

        # Package into ZIP archive (.docx)
        with zipfile.ZipFile(output_stream, "w", zipfile.ZIP_DEFLATED) as docx_zip:
            docx_zip.writestr("[Content_Types].xml", content_types_xml)
            docx_zip.writestr("_rels/.rels", cls._docx_global_rels())
            docx_zip.writestr("word/document.xml", document_xml)
            docx_zip.writestr("word/styles.xml", styles_xml)
            docx_zip.writestr("word/_rels/document.xml.rels", rels_xml)
            docx_zip.writestr("docProps/core.xml", core_xml)

        return output_stream.getvalue()

    # --- Internal DOCX OpenXML Helpers ---

    @staticmethod
    def _docx_escape(text: str) -> str:
        return html.escape(str(text or ""), quote=False)

    @classmethod
    def _docx_paragraph(cls, text: str, bold: bool = False, italic: bool = False, center: bool = False, space_after: int = 120) -> str:
        safe_text = cls._docx_escape(text)
        align = '<w:jc w:val="center"/>' if center else ''
        b_tag = '<w:b/>' if bold else ''
        i_tag = '<w:i/>' if italic else ''
        return (
            f'<w:p><w:pPr>{align}<w:spacing w:after="{space_after}"/></w:pPr>'
            f'<w:r><w:rPr>{b_tag}{i_tag}</w:rPr><w:t xml:space="preserve">{safe_text}</w:t></w:r></w:p>'
        )

    @classmethod
    def _docx_heading(cls, text: str, level: int = 1) -> str:
        safe_text = cls._docx_escape(text)
        size = 32 if level == 1 else (26 if level == 2 else 22)
        color = "1E3A8A" if level == 1 else "1F2937"
        space = 240 if level == 1 else 180
        return (
            f'<w:p><w:pPr><w:spacing w:before="240" w:after="{space}"/></w:pPr>'
            f'<w:r><w:rPr><w:b/><w:color w:val="{color}"/><w:sz w:val="{size}"/></w:rPr>'
            f'<w:t>{safe_text}</w:t></w:r></w:p>'
        )

    @classmethod
    def _docx_callout_box(cls, heading: str, body: str) -> str:
        safe_heading = cls._docx_escape(heading)
        safe_body = cls._docx_escape(body)
        return (
            '<w:tbl><w:tblPr><w:tblW w:w="9200" w:type="dxa"/><w:tblBorders>'
            '<w:top w:val="single" w:sz="12" w:space="0" w:color="3B82F6"/>'
            '<w:left w:val="single" w:sz="24" w:space="0" w:color="1D4ED8"/>'
            '<w:bottom w:val="single" w:sz="12" w:space="0" w:color="3B82F6"/>'
            '<w:right w:val="single" w:sz="12" w:space="0" w:color="3B82F6"/>'
            '</w:tblBorders><w:tblCellMar><w:top w:w="140" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/>'
            '<w:left w:w="200" w:type="dxa"/><w:right w:w="200" w:type="dxa"/></w:tblCellMar></w:tblPr>'
            f'<w:tr><w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F0F7FF"/></w:tcPr>'
            f'<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1E40AF"/><w:sz w:val="20"/></w:rPr>'
            f'<w:t>{safe_heading}</w:t></w:r></w:p>'
            f'<w:p><w:pPr><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="374151"/></w:rPr>'
            f'<w:t>{safe_body}</w:t></w:r></w:p>'
            '</w:tc></w:tr></w:tbl>'
        )

    @classmethod
    def _docx_likert_table(cls, items: List[Dict[str, Any]]) -> str:
        rows = []
        # Header row
        header = (
            '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
            '<w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>#</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="4900" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Survey Item / Statement</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:t>SD</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:t>D</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:t>N</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:t>A</w:t></w:r></w:p></w:tc>'
            '<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>'
            '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="16"/></w:rPr><w:t>SA</w:t></w:r></w:p></w:tc>'
            '</w:tr>'
        )
        rows.append(header)

        for i, item in enumerate(items, start=1):
            text = cls._docx_escape(item.get("text", ""))
            fill = "F9FAFB" if i % 2 == 0 else "FFFFFF"
            r_tag = " (R)" if item.get("is_reverse_coded") else ""
            row = (
                f'<w:tr>'
                f'<w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>{i}</w:t></w:r></w:p></w:tc>'
                f'<w:tc><w:tcPr><w:tcW w:w="4900" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">{text}{r_tag}</w:t></w:r></w:p></w:tc>'
                f'<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>[  ]</w:t></w:r></w:p></w:tc>'
                f'<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>[  ]</w:t></w:r></w:p></w:tc>'
                f'<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>[  ]</w:t></w:r></w:p></w:tc>'
                f'<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>[  ]</w:t></w:r></w:p></w:tc>'
                f'<w:tc><w:tcPr><w:tcW w:w="700" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="{fill}"/></w:tcPr>'
                f'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>[  ]</w:t></w:r></w:p></w:tc>'
                f'</w:tr>'
            )
            rows.append(row)

        table_body = "".join(rows)
        return (
            '<w:tbl><w:tblPr><w:tblW w:w="9200" w:type="dxa"/><w:tblBorders>'
            '<w:top w:val="single" w:sz="6" w:space="0" w:color="D1D5DB"/>'
            '<w:left w:val="single" w:sz="6" w:space="0" w:color="D1D5DB"/>'
            '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="D1D5DB"/>'
            '<w:right w:val="single" w:sz="6" w:space="0" w:color="D1D5DB"/>'
            '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>'
            '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>'
            '</w:tblBorders><w:tblCellMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>'
            '<w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr>'
            f'{table_body}</w:tbl>'
        )

    @classmethod
    def _wrap_docx_document(cls, body_content: str) -> str:
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            f'<w:body>{body_content}'
            '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
            '</w:body></w:document>'
        )

    @classmethod
    def _docx_styles(cls) -> str:
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="1F2937"/></w:rPr></w:rPrDefault></w:docDefaults>'
            '</w:styles>'
        )

    @classmethod
    def _docx_global_rels(cls) -> str:
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            '</Relationships>'
        )

    @classmethod
    def _docx_rels(cls) -> str:
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '</Relationships>'
        )

    @classmethod
    def _docx_core_properties(cls, title: str) -> str:
        now = timezone.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        safe_title = cls._docx_escape(title)
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">'
            f'<dc:title>{safe_title}</dc:title>'
            '<dc:creator>ScholarForge AI</dc:creator>'
            f'<dcterms:created>{now}</dcterms:created>'
            '</cp:coreProperties>'
        )

    @classmethod
    def _docx_content_types(cls) -> str:
        return (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
            '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            '</Types>'
        )

