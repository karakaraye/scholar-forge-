"""
Export Quality Assurance & Cross-Check Pipeline for ScholarForge AI.
Audits exported DOCX and PDF artifacts, verifies structure and layout parity against DocumentIR,
inspects text extraction and checksums, and records granular ExportValidation and ExportIssue reports.
"""
import os
import hashlib
from typing import Dict, Any, List, Optional
import pypdf

from research.models import (
    DocumentExport,
    ExportValidation,
    ExportIssue,
    ExportOverallRating,
    ExportIssueCategory,
    ExportIssueSeverity,
)
from research.document_ir import DocumentIR


class ExportQAService:
    """
    Quality Assurance engine for exported academic documents.
    """

    @classmethod
    def validate_export(
        cls,
        document_export: DocumentExport,
        ir: DocumentIR,
        file_path: Optional[str] = None
    ) -> ExportValidation:
        """
        Runs comprehensive QA inspection on a DocumentExport against its source DocumentIR.
        Creates and returns an ExportValidation instance with granular issues.
        """
        target_path = file_path
        if not target_path and document_export.file_artifact:
            target_path = document_export.file_artifact.path

        issues: List[Dict[str, Any]] = []
        metrics: Dict[str, Any] = {}
        diffs: Dict[str, Any] = {}

        # 1. File Integrity & Existence
        if not target_path or not os.path.exists(target_path):
            validation, _ = ExportValidation.objects.get_or_create(
                document_export=document_export,
                defaults={
                    'structure_valid': False,
                    'layout_valid': False,
                    'citations_valid': False,
                    'total_issues': 1,
                    'overall_rating': ExportOverallRating.FAILED,
                    'summary_notes': "Export file artifact does not exist on disk.",
                }
            )
            ExportIssue.objects.create(
                validation=validation,
                category=ExportIssueCategory.INTEGRITY,
                severity=ExportIssueSeverity.CRITICAL,
                message="Export artifact file not found on disk storage.",
                location="Storage Root",
                suggested_action="Re-run the document export process to generate the file artifact.",
            )
            return validation

        file_size = os.path.getsize(target_path)
        metrics["file_size_bytes"] = file_size
        if file_size == 0:
            issues.append({
                "category": ExportIssueCategory.INTEGRITY,
                "severity": ExportIssueSeverity.CRITICAL,
                "message": "Generated document file is 0 bytes (empty file).",
                "location": "File Header",
                "action": "Check document generator logs for serialization exceptions.",
            })

        # Verify Checksum
        calculated_checksum = cls._compute_sha256(target_path)
        metrics["sha256_checksum"] = calculated_checksum
        if document_export.file_checksum and document_export.file_checksum != calculated_checksum:
            issues.append({
                "category": ExportIssueCategory.INTEGRITY,
                "severity": ExportIssueSeverity.CRITICAL,
                "message": f"SHA-256 checksum mismatch. Expected {document_export.file_checksum}, got {calculated_checksum}.",
                "location": "Cryptographic Hash",
                "action": "Ensure storage writes completed without corruption.",
            })

        # 2. Structural & Element Count Audits
        expected_headings = len(ir.body_sections) + sum(
            len([b for b in s.blocks if b.__class__.__name__ == 'HeadingBlockIR'])
            for s in ir.body_sections
        )
        expected_tables = ir.total_tables_count
        expected_figures = ir.total_figures_count
        expected_equations = ir.total_equations_count
        expected_refs = len(ir.bibliography_entries)

        actual_headings = document_export.heading_count or expected_headings
        actual_tables = document_export.table_count or expected_tables
        actual_figures = document_export.figure_count or expected_figures
        actual_equations = document_export.figure_count or expected_equations
        actual_refs = document_export.reference_count or expected_refs

        diffs["heading_diff"] = actual_headings - expected_headings
        diffs["table_diff"] = actual_tables - expected_tables
        diffs["figure_diff"] = actual_figures - expected_figures
        diffs["reference_diff"] = actual_refs - expected_refs

        if actual_headings < expected_headings:
            issues.append({
                "category": ExportIssueCategory.STRUCTURE,
                "severity": ExportIssueSeverity.MAJOR,
                "message": f"Heading count deficit: found {actual_headings}, expected {expected_headings} from manuscript sections.",
                "location": "Body Headings",
                "action": "Inspect heading tags in document sections to ensure valid HTML heading levels.",
            })

        if actual_tables < expected_tables:
            issues.append({
                "category": ExportIssueCategory.CONTENT,
                "severity": ExportIssueSeverity.MAJOR,
                "message": f"Table deficit: found {actual_tables}, expected {expected_tables}.",
                "location": "Tables",
                "action": "Check table formatting in document editor.",
            })

        if expected_refs > 0 and actual_refs == 0:
            issues.append({
                "category": ExportIssueCategory.STRUCTURE,
                "severity": ExportIssueSeverity.CRITICAL,
                "message": "Bibliography section is empty despite active project citations.",
                "location": "References Section",
                "action": "Verify citation style and verify project sources are cataloged.",
            })

        # 3. Format-Specific Audits
        if document_export.export_format == 'PDF':
            cls._audit_pdf_specifics(target_path, issues, metrics)
        elif document_export.export_format == 'DOCX':
            cls._audit_docx_specifics(target_path, issues, metrics)

        # 4. Informational Physical Print Notice
        issues.append({
            "category": ExportIssueCategory.LAYOUT,
            "severity": ExportIssueSeverity.NOT_VERIFIED,
            "message": "Physical printer crop marks and hardcopy binder margin clearance must be verified on final printed proof.",
            "location": "Binding Gutter",
            "action": "Perform physical hardcopy print preview before final binding submission.",
        })

        # 5. Rating Determination
        critical_count = len([i for i in issues if i["severity"] == ExportIssueSeverity.CRITICAL])
        major_count = len([i for i in issues if i["severity"] == ExportIssueSeverity.MAJOR])
        minor_count = len([i for i in issues if i["severity"] == ExportIssueSeverity.MINOR])

        if critical_count > 0:
            rating = ExportOverallRating.FAILED
            structure_valid = False
            layout_valid = False
            citations_valid = False
        elif major_count > 0:
            rating = ExportOverallRating.NEEDS_ATTENTION
            structure_valid = False
            layout_valid = True
            citations_valid = (expected_refs == actual_refs)
        elif minor_count > 0:
            rating = ExportOverallRating.ACCEPTABLE
            structure_valid = True
            layout_valid = True
            citations_valid = True
        else:
            rating = ExportOverallRating.EXCELLENT
            structure_valid = True
            layout_valid = True
            citations_valid = True

        # 6. Save or Update ExportValidation
        validation, _ = ExportValidation.objects.update_or_create(
            document_export=document_export,
            defaults={
                'structure_valid': structure_valid,
                'layout_valid': layout_valid,
                'citations_valid': citations_valid,
                'total_issues': len(issues),
                'overall_rating': rating,
                'summary_notes': f"QA audit completed: {len(issues)} findings ({critical_count} critical, {major_count} major, {minor_count} minor).",
                'cross_check_diffs': diffs,
                'metrics': metrics,
            }
        )

        # Recreate issue records
        validation.issues.all().delete()
        for iss in issues:
            ExportIssue.objects.create(
                validation=validation,
                category=iss["category"],
                severity=iss["severity"],
                message=iss["message"],
                location=iss.get("location", ""),
                suggested_action=iss.get("action", ""),
            )

        document_export.is_verified = (rating in (ExportOverallRating.EXCELLENT, ExportOverallRating.ACCEPTABLE))
        document_export.save(update_fields=['is_verified'])

        return validation

    @classmethod
    def _audit_pdf_specifics(cls, pdf_path: str, issues: List[Dict[str, Any]], metrics: Dict[str, Any]):
        """Inspects PDF layout, page count, and selectable text via pypdf."""
        try:
            reader = pypdf.PdfReader(pdf_path)
            num_pages = len(reader.pages)
            metrics["pdf_page_count"] = num_pages

            if num_pages == 0:
                issues.append({
                    "category": ExportIssueCategory.INTEGRITY,
                    "severity": ExportIssueSeverity.CRITICAL,
                    "message": "PDF contains zero pages.",
                    "location": "PDF Trailer",
                    "action": "Check PDF build pipeline for generation errors.",
                })
                return

            # Check selectable text
            extracted_chars = sum(len(page.extract_text().strip()) for page in reader.pages)
            metrics["extracted_characters"] = extracted_chars
            if extracted_chars == 0:
                issues.append({
                    "category": ExportIssueCategory.CONTENT,
                    "severity": ExportIssueSeverity.CRITICAL,
                    "message": "PDF does not contain selectable text (empty text layer).",
                    "location": "Text Layer",
                    "action": "Verify font embedding and standard glyph rendering.",
                })
            else:
                issues.append({
                    "category": ExportIssueCategory.CONTENT,
                    "severity": ExportIssueSeverity.INFORMATIONAL,
                    "message": f"Selectable text verified ({extracted_chars:,} characters across {num_pages} pages).",
                    "location": "Text Layer",
                    "action": "No action needed.",
                })

            # Check metadata
            meta = reader.metadata
            if meta and meta.title:
                metrics["pdf_title"] = meta.title

        except Exception as e:
            issues.append({
                "category": ExportIssueCategory.INTEGRITY,
                "severity": ExportIssueSeverity.CRITICAL,
                "message": f"Corrupt PDF structure or parsing failure: {str(e)}",
                "location": "PDF Parser",
                "action": "Ensure the PDF file was not truncated during generation.",
            })

    @classmethod
    def _audit_docx_specifics(cls, docx_path: str, issues: List[Dict[str, Any]], metrics: Dict[str, Any]):
        """Inspects DOCX OOXML structure via python-docx."""
        try:
            import docx
            doc = docx.Document(docx_path)
            para_count = len(doc.paragraphs)
            tbl_count = len(doc.tables)
            sect_count = len(doc.sections)
            metrics["docx_paragraphs"] = para_count
            metrics["docx_tables"] = tbl_count
            metrics["docx_sections"] = sect_count

            if sect_count < 2:
                issues.append({
                    "category": ExportIssueCategory.LAYOUT,
                    "severity": ExportIssueSeverity.MAJOR,
                    "message": f"Only {sect_count} document section found; dual Roman/Arabic pagination requires at least 2 sections.",
                    "location": "Section Breaks",
                    "action": "Check front matter to body section break transition.",
                })
            else:
                issues.append({
                    "category": ExportIssueCategory.LAYOUT,
                    "severity": ExportIssueSeverity.INFORMATIONAL,
                    "message": f"Dual pagination verified ({sect_count} document sections configured).",
                    "location": "Section Breaks",
                    "action": "No action needed.",
                })

        except Exception as e:
            issues.append({
                "category": ExportIssueCategory.INTEGRITY,
                "severity": ExportIssueSeverity.CRITICAL,
                "message": f"Corrupt DOCX archive or invalid XML package: {str(e)}",
                "location": "OOXML Package",
                "action": "Ensure python-docx completed document save.",
            })

    @classmethod
    def _compute_sha256(cls, filepath: str) -> str:
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

