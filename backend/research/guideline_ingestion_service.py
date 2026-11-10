import re
import logging
from typing import Dict, Any, List, Optional
from django.core.files.uploadedfile import UploadedFile
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from research.models import (
    FormattingTemplate,
    TemplateGuidelineSource,
    TemplateVersion,
    TemplateType,
    TemplateVerificationStatus as VerificationStatus,
)
from research.institutional_template_service import InstitutionalTemplateService

logger = logging.getLogger(__name__)
User = get_user_model()


class GuidelineIngestionService:
    """
    Ingests PDF/DOCX/text institutional author guidelines with prompt-injection defense,
    extracts structured candidate formatting rules, and manages human review approval.
    """

    PROMPT_INJECTION_PATTERNS = [
        r'(?i)ignore\s+(all\s+)?(previous|prior|above)\s+instructions',
        r'(?i)disregard\s+(the\s+)?(previous|system|above)\s+(prompt|instructions)',
        r'(?i)you\s+are\s+now\s+(an?\s+)?(ai|dan|jailbreak|unrestricted)',
        r'(?i)<script[^>]*>.*?</script>',
        r'(?i)drop\s+table\s+',
        r'(?i)delete\s+from\s+',
        r'(?i)system\s*:\s*you\s+must',
    ]

    @classmethod
    def sanitize_guideline_text(cls, raw_text: str) -> str:
        """
        Detects and neutralizes prompt-injection payloads and hostile script injections.
        """
        sanitized = raw_text
        for pattern in cls.PROMPT_INJECTION_PATTERNS:
            sanitized = re.sub(pattern, '[REDACTED_HOSTILE_INPUT]', sanitized)
        return sanitized.strip()

    @classmethod
    def extract_text_from_file(cls, file: UploadedFile) -> str:
        """
        Extracts plain text safely from uploaded DOCX, PDF, or TXT file.
        """
        filename = file.name.lower()

        if filename.endswith('.txt'):
            try:
                content = file.read()
                return content.decode('utf-8', errors='replace')
            except Exception as e:
                raise ValidationError(f"Failed to read text file: {str(e)}")

        elif filename.endswith('.docx'):
            try:
                import docx
                doc = docx.Document(file)
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                        if row_text:
                            paragraphs.append(row_text)
                return "\n\n".join(paragraphs)
            except Exception as e:
                raise ValidationError(f"Failed to extract text from DOCX: {str(e)}")

        elif filename.endswith('.pdf'):
            try:
                import pypdf
                reader = pypdf.PdfReader(file)
                text_pages = []
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text_pages.append(extracted)
                if not text_pages:
                    return "[PDF scanned image — textual content could not be extracted directly. Please review manually.]"
                return "\n\n".join(text_pages)
            except Exception as e:
                raise ValidationError(f"Failed to extract text from PDF: {str(e)}")

        else:
            raise ValidationError("Unsupported file format. Please upload a PDF, DOCX, or TXT guideline document.")

    @classmethod
    def ingest_guidelines(
        cls,
        title: str,
        user: User,
        file: Optional[UploadedFile] = None,
        raw_text: Optional[str] = None,
        template: Optional[FormattingTemplate] = None,
    ) -> TemplateGuidelineSource:
        """
        Ingests guideline source, sanitizes input, extracts candidate rules,
        and saves a TemplateGuidelineSource record for human review.
        """
        if not file and not raw_text:
            raise ValidationError("Either a guideline document file or raw text must be provided.")

        if file:
            extracted = cls.extract_text_from_file(file)
        else:
            extracted = raw_text or ""

        # Sanitize against prompt injection
        clean_text = cls.sanitize_guideline_text(extracted)

        # Analyze and extract candidate rules
        candidate_rules = cls.extract_candidate_rules(clean_text)

        source = TemplateGuidelineSource.objects.create(
            template=template,
            title=title.strip(),
            file_attachment=file if file else None,
            extracted_text=clean_text[:50000],   # Limit stored size
            prompt_injection_sanitized=True,
            extracted_rules=candidate_rules,
            review_status='PENDING_REVIEW',
            uploaded_by=user,
        )

        return source

    @classmethod
    def extract_candidate_rules(cls, text: str) -> Dict[str, Any]:
        """
        Deterministic rule extractor parsing guideline text for margins, fonts,
        spacing, heading levels, citation styles, and word limits.
        """
        rules = InstitutionalTemplateService.get_default_rules_config()
        confidence: Dict[str, float] = {}

        # 1. Margins detection
        # e.g., "margins: 1.5 inch left, 1 inch top, bottom, right" or "3.8cm left, 2.5cm"
        margin_match = re.search(r'(?i)(left\s*(margin)?\s*(is|of|:)?\s*([1-2](\.\d+)?)\s*(inch|in|cm)?)', text)
        if margin_match:
            try:
                val = float(margin_match.group(4))
                unit = margin_match.group(6) or "inch"
                if "cm" in unit.lower():
                    val = round(val / 2.54, 2)
                rules["page_settings"]["margins_inches"]["left"] = val
                confidence["margins_left"] = 0.85
            except Exception:
                pass

        # 2. Typography / Font
        # e.g. "Times New Roman, 12pt" or "Arial 11 point"
        font_match = re.search(r'(?i)(Times New Roman|Arial|Calibri|Georgia|Garamond|Computer Modern)', text)
        if font_match:
            rules["typography"]["primary_font"] = font_match.group(1).title()
            confidence["primary_font"] = 0.90

        size_match = re.search(r'(?i)(font\s*size|size\s*of)\s*(is|:)?\s*(1[0-4])\s*(pt|point)?', text)
        if size_match:
            rules["typography"]["base_font_size_pt"] = int(size_match.group(3))
            confidence["base_font_size"] = 0.85

        # 3. Line spacing
        # e.g. "double space", "1.5 line spacing", "single spaced"
        if re.search(r'(?i)(double\s*space|double-spaced|2\.0\s*line)', text):
            rules["typography"]["line_spacing"] = 2.0
            confidence["line_spacing"] = 0.95
        elif re.search(r'(?i)(1\.5\s*line\s*spacing|one\s*and\s*a\s*half\s*spac)', text):
            rules["typography"]["line_spacing"] = 1.5
            confidence["line_spacing"] = 0.95
        elif re.search(r'(?i)(single\s*space|1\.0\s*line)', text):
            rules["typography"]["line_spacing"] = 1.0
            confidence["line_spacing"] = 0.95

        # 4. Citation style
        # e.g. "APA 7th", "IEEE", "Chicago", "Harvard", "Vancouver", "MLA"
        if re.search(r'(?i)apa\s*(7|7th)?', text):
            rules["citation_reference"]["citation_style"] = "apa-7th"
            confidence["citation_style"] = 0.95
        elif re.search(r'(?i)ieee', text):
            rules["citation_reference"]["citation_style"] = "ieee"
            confidence["citation_style"] = 0.95
        elif re.search(r'(?i)chicago', text):
            rules["citation_reference"]["citation_style"] = "chicago-author-date"
            confidence["citation_style"] = 0.90
        elif re.search(r'(?i)harvard', text):
            rules["citation_reference"]["citation_style"] = "harvard"
            confidence["citation_style"] = 0.90
        elif re.search(r'(?i)vancouver', text):
            rules["citation_reference"]["citation_style"] = "vancouver"
            confidence["citation_style"] = 0.90
        elif re.search(r'(?i)mla\s*(9|9th)?', text):
            rules["citation_reference"]["citation_style"] = "mla-9th"
            confidence["citation_style"] = 0.90

        # 5. Abstract word limits
        # e.g. "abstract should not exceed 300 words" or "maximum of 250 words"
        abstract_limit_match = re.search(r'(?i)abstract[^\.\n]{0,60}?(not\s*exceed|maximum\s*of|up\s*to|limit\s*of)\s*(\d{2,4})\s*words', text)
        if abstract_limit_match:
            try:
                limit = int(abstract_limit_match.group(2))
                rules["word_limits"]["abstract_max_words"] = limit
                confidence["abstract_max_words"] = 0.90
            except Exception:
                pass

        # 6. Manuscript word limit
        ms_limit_match = re.search(r'(?i)(thesis|dissertation|manuscript|paper)[^\.\n]{0,60}?(not\s*exceed|maximum\s*of|limit\s*of)\s*(\d{2,6})\s*words', text)
        if ms_limit_match:
            try:
                limit = int(ms_limit_match.group(3))
                rules["word_limits"]["manuscript_max_words"] = limit
                confidence["manuscript_max_words"] = 0.85
            except Exception:
                pass

        return {
            "candidate_rules": rules,
            "confidence_scores": confidence,
            "detected_keywords": list(confidence.keys()),
            "human_review_required": True,
        }

    @classmethod
    def approve_guideline_rules(
        cls,
        source: TemplateGuidelineSource,
        approved_rules: Dict[str, Any],
        user: User,
        template_name: Optional[str] = None,
        institution_id: Optional[str] = None,
        degree_level: str = "GENERAL",
        document_type: str = "GENERAL",
    ) -> FormattingTemplate:
        """
        Human review gate: user approves candidate rules, creating a versioned FormattingTemplate.
        """
        name = template_name or f"Template from {source.title}"

        inst = None
        if institution_id:
            from research.models import AcademicInstitution
            inst = AcademicInstitution.objects.filter(pk=institution_id).first()

        # Create template with USER_CUSTOMIZED or OFFICIALLY_VERIFIED if source is confirmed
        template = InstitutionalTemplateService.create_template(
            name=name,
            template_type=TemplateType.CUSTOM,
            institution=inst,
            degree_level=degree_level,
            document_type=document_type,
            verification_status=VerificationStatus.USER_CUSTOMIZED,
            verification_notes=f"Created via guideline ingestion from '{source.title}'",
            rules_config=approved_rules,
            changelog=f"Candidate rules reviewed and approved by {user.email}",
            created_by=user,
            is_shared=False,
            description=f"Template derived from uploaded guideline document: {source.title}",
        )

        source.template = template
        source.review_status = 'APPROVED'
        source.save(update_fields=['template', 'review_status'])

        return template
