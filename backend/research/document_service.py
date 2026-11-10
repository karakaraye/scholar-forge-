"""
ScholarForge AI - Document Upload & Secure Extraction Pipeline
Handles validation, storage, and text extraction for research documents (PDF, DOCX, BibTeX, RIS)
with explicit detection of scanned PDFs, prompt injection defense, and excerpt indexing.
"""

import os
import re
import zipfile
import logging
from typing import Dict, Any, List, Tuple
from xml.etree import ElementTree
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from research.models import SourceDocument, SourceExcerpt, ResearchSource
from research.importers.parsers import parse_bibtex, parse_ris

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 Megabytes
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".bib", ".bibtex", ".ris"}

PROMPT_INJECTION_PATTERNS = [
    r"(?i)\bignore\s+(all\s+)?(previous|prior)\s+instructions\b",
    r"(?i)\byou\s+are\s+now\s+(an?\s+)?unrestricted\b",
    r"(?i)\bsystem\s*:\s*you\s+must\b",
    r"(?i)\bdisregard\s+all\s+safety\s+guidelines\b",
    r"(?i)\bdo\s+not\s+follow\s+the\s+system\s+prompt\b"
]


def sanitize_extracted_text(text: str) -> str:
    """
    Sanitizes untrusted text extracted from external research documents
    to defend against prompt injection vectors.
    """
    cleaned = text
    for pattern in PROMPT_INJECTION_PATTERNS:
        cleaned = re.sub(pattern, "[FILTERED_INSTRUCTION_REMOVED]", cleaned)
    return cleaned


class DocumentProcessingService:
    """
    Validates, stores, and extracts structured text from research documents.
    """

    @classmethod
    def validate_upload(cls, file: UploadedFile) -> Tuple[bool, str, str]:
        """
        Validates size, extension, and header signatures.
        Returns: (is_valid, file_type, error_message)
        """
        if file.size > MAX_FILE_SIZE_BYTES:
            return False, "", f"File size exceeds 20MB limit (size: {file.size / 1024 / 1024:.1f}MB)."

        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, "", f"Unsupported file extension '{ext}'. Supported formats: PDF, DOCX, BibTeX, RIS."

        # Map to FileType enum
        if ext == ".pdf":
            file_type = SourceDocument.FileType.PDF
        elif ext == ".docx":
            file_type = SourceDocument.FileType.DOCX
        elif ext in (".bib", ".bibtex"):
            file_type = SourceDocument.FileType.BIBTEX
        elif ext == ".ris":
            file_type = SourceDocument.FileType.RIS
        else:
            return False, "", "Unsupported file type."

        return True, file_type, ""

    @classmethod
    def process_document(
        cls,
        user,
        file: UploadedFile,
        project=None,
        source=None
    ) -> SourceDocument:
        """
        Validates, saves file to storage, and runs text extraction pipeline.
        """
        is_valid, file_type, error_msg = cls.validate_upload(file)
        if not is_valid:
            raise ValueError(error_msg)

        # Ensure upload storage directory exists
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads", "documents", str(user.id))
        os.makedirs(upload_dir, exist_ok=True)

        clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.name)
        file_path = os.path.join(upload_dir, clean_name)

        # Write file bytes to disk
        file.seek(0)
        with open(file_path, "wb") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        # Create pending SourceDocument
        doc = SourceDocument.objects.create(
            user=user,
            project=project,
            source=source,
            file_name=clean_name,
            file_type=file_type,
            file_size=file.size,
            file_path=file_path,
            extraction_status=SourceDocument.ExtractionStatus.PENDING
        )

        # Execute extraction based on format
        try:
            if file_type == SourceDocument.FileType.PDF:
                cls._extract_pdf(doc)
            elif file_type == SourceDocument.FileType.DOCX:
                cls._extract_docx(doc)
            elif file_type in (SourceDocument.FileType.BIBTEX, SourceDocument.FileType.RIS):
                cls._extract_bibliographic(doc)
        except Exception as e:
            logger.error(f"Extraction failed for document {doc.id}: {e}", exc_info=True)
            doc.extraction_status = SourceDocument.ExtractionStatus.FAILED
            doc.error_message = f"Text extraction failed: {str(e)}"
            doc.save()

        return doc

    @classmethod
    def _extract_pdf(cls, doc: SourceDocument):
        """
        Extracts machine-readable text page by page from PDF.
        Explicitly detects scanned / image-only PDFs.
        """
        pages_text: List[str] = []
        page_count = 0

        try:
            with open(doc.file_path, "rb") as f:
                content = f.read()

            # Attempt stream extraction for text blocks
            # Match stream / endstream blocks containing text tokens (Tj / TJ / etc.)
            stream_matches = re.findall(rb"stream[\r\n]+(.*?)[\r\n]+endstream", content, re.DOTALL)
            extracted_tokens = []

            for stream in stream_matches:
                # Look for string literals: (Text) Tj or [(T) (ext)] TJ
                text_literals = re.findall(rb"\((.*?)\)\s*Tj", stream)
                for lit in text_literals:
                    try:
                        decoded = lit.decode("latin1", errors="ignore")
                        if len(decoded.strip()) > 1:
                            extracted_tokens.append(decoded.strip())
                    except Exception:
                        pass

            if extracted_tokens:
                full_text = " ".join(extracted_tokens)
                pages_text.append(full_text)
                page_count = max(1, len(re.findall(rb"/Type\s*/Page\b", content)))
            else:
                # No text streams found: PDF lacks machine-readable text stream (e.g. raster scan)
                page_count = max(1, len(re.findall(rb"/Type\s*/Page\b", content)))

        except Exception as e:
            logger.warning(f"Error parsing PDF stream: {e}")

        total_extracted = " ".join(pages_text).strip()
        doc.page_count = max(page_count, 1)

        # Check machine readability threshold
        if len(total_extracted) < 50:
            doc.is_machine_readable = False
            doc.extraction_status = SourceDocument.ExtractionStatus.UNSUPPORTED
            doc.error_message = (
                "Scanned or image-only PDF detected. Machine-readable text could not be extracted. "
                "Optical Character Recognition (OCR) is required to parse this document."
            )
            doc.extracted_text = ""
            doc.save()
            return

        # Sanitize against prompt injections
        clean_text = sanitize_extracted_text(total_extracted)
        doc.is_machine_readable = True
        doc.extraction_status = SourceDocument.ExtractionStatus.EXTRACTED
        doc.extracted_text = clean_text
        doc.save()

        # Create SourceExcerpts for first few pages / chunks
        chunks = [clean_text[i:i + 1500] for i in range(0, min(len(clean_text), 9000), 1500)]
        for idx, chunk in enumerate(chunks, start=1):
            SourceExcerpt.objects.create(
                source_document=doc,
                source=doc.source,
                page_number=idx,
                section_heading=f"Page {idx} Excerpt",
                content=chunk
            )

    @classmethod
    def _extract_docx(cls, doc: SourceDocument):
        """
        Extracts structured paragraphs from Word .docx file via XML extraction.
        """
        paragraphs = []
        try:
            with zipfile.ZipFile(doc.file_path, "r") as z:
                xml_content = z.read("word/document.xml")
                tree = ElementTree.fromstring(xml_content)
                # Word namespaces
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                for p in tree.iterfind(".//w:p", namespaces):
                    texts = [node.text for node in p.iterfind(".//w:t", namespaces) if node.text]
                    if texts:
                        para_text = "".join(texts).strip()
                        if para_text:
                            paragraphs.append(para_text)
        except Exception as e:
            raise ValueError(f"Failed to read Word document XML: {e}")

        full_text = "\n\n".join(paragraphs).strip()
        if not full_text:
            doc.is_machine_readable = False
            doc.extraction_status = SourceDocument.ExtractionStatus.UNSUPPORTED
            doc.error_message = "Document contains no readable text paragraphs."
            doc.save()
            return

        clean_text = sanitize_extracted_text(full_text)
        doc.is_machine_readable = True
        doc.extraction_status = SourceDocument.ExtractionStatus.EXTRACTED
        doc.extracted_text = clean_text
        doc.page_count = max(1, len(clean_text) // 2500)
        doc.save()

        # Create excerpts
        for idx, p in enumerate(paragraphs[:10], start=1):
            if len(p) > 60:
                SourceExcerpt.objects.create(
                    source_document=doc,
                    source=doc.source,
                    page_number=idx,
                    section_heading=f"Section {idx}",
                    content=p
                )

    @classmethod
    def _extract_bibliographic(cls, doc: SourceDocument):
        """
        Parses BibTeX or RIS file and creates linked ResearchSources.
        """
        with open(doc.file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()

        if doc.file_type == SourceDocument.FileType.BIBTEX:
            parsed_entries = parse_bibtex(raw_text)
        else:
            parsed_entries = parse_ris(raw_text)

        doc.is_machine_readable = True
        doc.extracted_text = raw_text
        doc.extraction_status = SourceDocument.ExtractionStatus.EXTRACTED
        doc.metadata = {
            "parsed_records_count": len(parsed_entries),
            "titles": [e.get("title") for e in parsed_entries[:5]]
        }
        doc.save()

        # If a project is attached, automatically create/link ResearchSources
        for entry in parsed_entries:
            source, _ = ResearchSource.objects.get_or_create(
                title=entry.get("title"),
                defaults={
                    "created_by": doc.user,
                    "authors": entry.get("authors", []),
                    "publication_year": entry.get("publication_year"),
                    "source_type": entry.get("source_type", "JOURNAL"),
                    "journal_or_publisher": entry.get("journal_or_publisher", ""),
                    "doi": entry.get("doi", ""),
                    "url": entry.get("url", ""),
                    "abstract": entry.get("abstract", ""),
                    "provenance": entry.get("provenance", [])
                }
            )
            if not doc.source:
                doc.source = source
                doc.save(update_fields=["source"])
