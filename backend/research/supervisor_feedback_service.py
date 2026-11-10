import io
import re
import zipfile
import xml.etree.ElementTree as ET
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from projects.models import ResearchProject
from research.models import (
    SupervisorFeedback,
    FeedbackSourceType,
    ManuscriptComment,
    CollaborationAuditEvent,
)
import pypdf
import docx

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"(?i)(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)"),
    re.compile(r"(?i)system\s*prompt\s*(override|injection|reset)"),
    re.compile(r"(?i)you\s+are\s+now\s+(an|a|unrestricted|in\s+developer\s+mode|dan)"),
    re.compile(r"(?i)<\s*/?\s*system\s*>"),
    re.compile(r"(?i)jailbreak"),
]


class SupervisorFeedbackService:
    """
    Ingests and processes supervisor feedback from multiple sources:
    manual text entry, DOCX (with tracked changes and comments),
    PDF (with margin annotation warnings), and inline manuscript threads.
    """

    @classmethod
    def sanitize_feedback_content(cls, content: str) -> str:
        if not content:
            return ""
        sanitized = content
        for pattern in PROMPT_INJECTION_PATTERNS:
            sanitized = pattern.sub("[REDACTED_SECURITY_RISK]", sanitized)
        return sanitized.strip()

    @classmethod
    def extract_docx_details(cls, file_bytes: bytes) -> dict:
        """
        Parses DOCX body paragraphs, comments from word/comments.xml,
        and tracked changes from word/document.xml.
        """
        doc_stream = io.BytesIO(file_bytes)
        doc = docx.Document(doc_stream)
        full_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

        extracted_comments = []
        tracked_changes = []

        # Parse internal XML via zipfile
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                # 1. Parse comments.xml if it exists
                if "word/comments.xml" in z.namelist():
                    comments_xml = z.read("word/comments.xml")
                    tree = ET.fromstring(comments_xml)
                    namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    for comment_elem in tree.findall(".//w:comment", namespaces):
                        author = comment_elem.attrib.get(
                            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author", "Supervisor"
                        )
                        date = comment_elem.attrib.get(
                            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}date", ""
                        )
                        text_parts = [
                            node.text for node in comment_elem.findall(".//w:t", namespaces) if node.text
                        ]
                        comment_text = "".join(text_parts).strip()
                        if comment_text:
                            extracted_comments.append({
                                "author": author,
                                "date": date,
                                "text": cls.sanitize_feedback_content(comment_text),
                                "source": "docx_comment",
                            })

                # 2. Parse tracked changes in document.xml
                if "word/document.xml" in z.namelist():
                    doc_xml = z.read("word/document.xml")
                    tree = ET.fromstring(doc_xml)
                    namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    for ins in tree.findall(".//w:ins", namespaces):
                        author = ins.attrib.get(
                            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author", "Supervisor"
                        )
                        text_parts = [node.text for node in ins.findall(".//w:t", namespaces) if node.text]
                        ins_text = "".join(text_parts).strip()
                        if ins_text:
                            tracked_changes.append({
                                "type": "insertion",
                                "author": author,
                                "text": cls.sanitize_feedback_content(ins_text),
                            })
                    for del_elem in tree.findall(".//w:del", namespaces):
                        author = del_elem.attrib.get(
                            "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}author", "Supervisor"
                        )
                        text_parts = [
                            node.text for node in del_elem.findall(".//w:delText", namespaces) if node.text
                        ]
                        del_text = "".join(text_parts).strip()
                        if del_text:
                            tracked_changes.append({
                                "type": "deletion",
                                "author": author,
                                "text": cls.sanitize_feedback_content(del_text),
                            })
        except Exception:
            pass

        return {
            "text": cls.sanitize_feedback_content(full_text),
            "comments": extracted_comments,
            "tracked_changes": tracked_changes,
        }

    @classmethod
    def extract_pdf_details(cls, file_bytes: bytes) -> dict:
        """
        Parses PDF page text with pypdf and explicitly flags margin annotation limits.
        """
        stream = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(stream)
        pages_text = []
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                pages_text.append(extracted)

        full_text = "\n\n".join(pages_text)
        disclaimer = (
            "PDF text extraction completed. Note: Graphical margin annotations, highlights, "
            "or handwritten supervisor notes in PDFs cannot be automatically extracted and require manual review."
        )

        return {
            "text": cls.sanitize_feedback_content(full_text),
            "comments": [],
            "has_unextracted_annotations": True,
            "disclaimer": disclaimer,
        }

    @classmethod
    def ingest_feedback(
        cls,
        project: ResearchProject,
        user,
        source_type: str,
        title: str = "",
        raw_content: str = "",
        file_attachment=None,
    ) -> SupervisorFeedback:
        type_map = {
            "MANUAL": FeedbackSourceType.MANUAL_ENTRY,
            "MANUAL_ENTRY": FeedbackSourceType.MANUAL_ENTRY,
            "DOCX": FeedbackSourceType.DOCX_UPLOAD,
            "DOCX_UPLOAD": FeedbackSourceType.DOCX_UPLOAD,
            "PDF": FeedbackSourceType.PDF_UPLOAD,
            "PDF_UPLOAD": FeedbackSourceType.PDF_UPLOAD,
            "INLINE_THREAD": FeedbackSourceType.INLINE_THREAD_IMPORT,
            "INLINE_THREAD_IMPORT": FeedbackSourceType.INLINE_THREAD_IMPORT,
        }
        source_type = type_map.get(source_type, source_type)
        if source_type not in FeedbackSourceType.values:
            raise ValidationError(f"Invalid source type '{source_type}'.")

        extracted_comments = []
        has_unextracted_annotations = False
        final_content = raw_content or ""

        if source_type in (FeedbackSourceType.MANUAL_ENTRY, 'MANUAL'):
            if not final_content.strip():
                raise ValidationError("Raw content cannot be empty for manual supervisor feedback.")
            final_content = cls.sanitize_feedback_content(final_content)
            # Split items if structured by numbers or bullets
            lines = [line.strip() for line in final_content.splitlines() if line.strip()]
            for idx, line in enumerate(lines):
                extracted_comments.append({
                    "author": "Supervisor",
                    "text": line,
                    "index": idx + 1,
                    "source": "manual",
                })

        elif source_type in (FeedbackSourceType.DOCX_UPLOAD, 'DOCX'):
            if not file_attachment:
                raise ValidationError("DOCX file is required for DOCX source type.")
            file_bytes = file_attachment.read()
            # Reset seek pointer for model saving
            file_attachment.seek(0)
            parsed = cls.extract_docx_details(file_bytes)
            final_content = parsed["text"]
            extracted_comments = parsed["comments"] + parsed["tracked_changes"]

        elif source_type in (FeedbackSourceType.PDF_UPLOAD, 'PDF'):
            if not file_attachment:
                raise ValidationError("PDF file is required for PDF source type.")
            file_bytes = file_attachment.read()
            file_attachment.seek(0)
            parsed = cls.extract_pdf_details(file_bytes)
            final_content = parsed["text"]
            has_unextracted_annotations = True
            extracted_comments = [{
                "author": "System Notice",
                "text": parsed["disclaimer"],
                "source": "pdf_disclaimer",
            }]

        elif source_type in (FeedbackSourceType.INLINE_THREAD_IMPORT, 'INLINE_THREAD'):
            # Aggregate open manuscript comments from the project
            comments = ManuscriptComment.objects.filter(project=project).order_by("created_at")
            thread_items = []
            for c in comments:
                thread_items.append({
                    "comment_id": str(c.id),
                    "author": c.author.email if c.author else "Collaborator",
                    "anchor_text": c.anchor_text,
                    "text": c.content,
                    "status": c.status,
                    "replies": [
                        {"author": r.author.email if r.author else "Collaborator", "text": r.content}
                        for r in c.replies.all()
                    ],
                })
            extracted_comments = thread_items
            final_content = f"Aggregated {len(comments)} manuscript inline comments and replies."

        feedback = SupervisorFeedback.objects.create(
            project=project,
            uploaded_by=user,
            title=title or f"Supervisor Review ({source_type})",
            source_type=source_type,
            raw_content=final_content,
            file_attachment=file_attachment,
            extracted_comments=extracted_comments,
            has_unextracted_annotations=has_unextracted_annotations,
        )

        CollaborationAuditEvent.objects.create(
            project=project,
            actor=user,
            event_type="SUPERVISOR_FEEDBACK_INGESTED",
            details={
                "feedback_id": str(feedback.id),
                "source_type": source_type,
                "comments_count": len(extracted_comments),
                "has_unextracted_annotations": has_unextracted_annotations,
            }
        )

        return feedback
