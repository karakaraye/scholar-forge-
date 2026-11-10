"""
Export Job Service for ScholarForge AI.
Coordinates asynchronous export jobs, private file storage, idempotency,
and orchestrates DocumentIR, DocxExportService, PdfExportService, and ExportQAService.
"""
import os
import uuid
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone
from django.core.files import File

from projects.models import ResearchProject
from documents.models import DocumentVersion
from research.models import (
    DocumentExport,
    ExportJob,
    ExportJobStatus,
    DocumentExportFormat,
    FormattingTemplate,
    TemplateVersion,
    ProjectTemplateAssignment,
)
from research.document_ir import DocumentIRBuilder, DocumentIR
from research.docx_export_service import DocxExportService
from research.pdf_export_service import PdfExportService
from research.export_qa_service import ExportQAService


class ExportJobService:
    """
    Manages end-to-end execution of academic document export jobs.
    """

    @classmethod
    def initiate_export_job(
        cls,
        project: ResearchProject,
        user,
        export_format: str = DocumentExportFormat.DOCX,
        template_id: Optional[str] = None,
        citation_style: Optional[str] = None,
        idempotency_key: Optional[str] = None,
        document_version_id: Optional[str] = None,
    ) -> ExportJob:
        """
        Creates or retrieves an existing idempotent ExportJob and launches generation.
        """
        format_val = export_format.upper()
        if format_val not in (DocumentExportFormat.DOCX, DocumentExportFormat.PDF):
            format_val = DocumentExportFormat.DOCX

        # Check idempotency
        if idempotency_key:
            existing = ExportJob.objects.filter(
                project=project,
                idempotency_key=idempotency_key,
                status__in=[ExportJobStatus.PENDING, ExportJobStatus.PROCESSING, ExportJobStatus.COMPLETED]
            ).first()
            if existing:
                return existing

        template = None
        if template_id:
            template = FormattingTemplate.objects.filter(id=template_id).first()
        if not template:
            assignment = ProjectTemplateAssignment.objects.filter(project=project).first()
            if assignment:
                template = assignment.template

        job = ExportJob.objects.create(
            project=project,
            export_format=format_val,
            template=template,
            status=ExportJobStatus.PENDING,
            progress_pct=5,
            status_message="Export job queued for processing.",
            idempotency_key=idempotency_key or str(uuid.uuid4()),
            created_by=user,
            export_options={
                "citation_style": citation_style or "apa-7th",
                "document_version_id": document_version_id,
            }
        )

        # Execute job
        cls.process_job(job)
        return job

    @classmethod
    def process_job(cls, job: ExportJob):
        """
        Processes document generation, QA inspection, and storage.
        """
        try:
            job.status = ExportJobStatus.PROCESSING
            job.progress_pct = 20
            job.status_message = "Assembling semantic Intermediate Document Representation (IR)..."
            job.save(update_fields=['status', 'progress_pct', 'status_message', 'updated_at'])

            project = job.project
            options = job.export_options or {}
            c_style = options.get("citation_style", "apa-7th")
            doc_version_id = options.get("document_version_id")

            doc_version = None
            if doc_version_id:
                doc_version = DocumentVersion.objects.filter(id=doc_version_id).first()

            # 1. Build Canonical DocumentIR
            ir = DocumentIRBuilder.build_ir(
                project=project,
                template=job.template,
                document_version=doc_version,
                citation_style=c_style,
            )

            job.progress_pct = 50
            job.status_message = f"Rendering {job.export_format} academic document artifact..."
            job.save(update_fields=['progress_pct', 'status_message', 'updated_at'])

            # 2. Determine Private Storage Path
            year_month = timezone.now().strftime('%Y/%m')
            storage_dir = os.path.join(settings.MEDIA_ROOT, 'exports', 'artifacts', year_month)
            os.makedirs(storage_dir, exist_ok=True)

            ext = 'docx' if job.export_format == DocumentExportFormat.DOCX else 'pdf'
            safe_title = "".join(c for c in project.title[:30] if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
            filename = f"{safe_title or 'Manuscript'}_{job.id}.{ext}"
            artifact_full_path = os.path.join(storage_dir, filename)

            # 3. Generate Artifact
            if job.export_format == DocumentExportFormat.DOCX:
                stats = DocxExportService.generate_docx(ir, artifact_full_path)
            else:
                stats = PdfExportService.generate_pdf(ir, artifact_full_path)

            job.progress_pct = 80
            job.status_message = "Running automated Export Quality Assurance (QA) inspection..."
            job.save(update_fields=['progress_pct', 'status_message', 'updated_at'])

            # 4. Resolve TemplateVersion
            template_version = None
            if job.template:
                template_version = job.template.versions.filter(is_active=True).first()

            # 5. Create DocumentExport Record
            rel_media_path = os.path.join('exports', 'artifacts', year_month, filename).replace('\\', '/')
            doc_export = DocumentExport.objects.create(
                project=project,
                document_version=doc_version,
                export_format=job.export_format,
                template_version=template_version,
                citation_style=c_style,
                file_artifact=rel_media_path,
                file_name=filename,
                file_checksum=stats.get('file_checksum', ''),
                file_size_bytes=stats.get('file_size_bytes', 0),
                page_count=stats.get('page_count', 0),
                heading_count=stats.get('heading_count', 0),
                table_count=stats.get('table_count', 0),
                figure_count=stats.get('figure_count', 0),
                reference_count=stats.get('reference_count', 0),
                word_count=stats.get('total_word_count', 0),
                metadata_snapshot={
                    "title": ir.metadata.title,
                    "author": ir.metadata.author_name,
                    "institution": ir.metadata.institution_name,
                    "degree": ir.metadata.degree_title,
                    "paper_size": ir.layout.paper_size,
                    "font": ir.layout.primary_font,
                },
                created_by=job.created_by,
            )

            # 6. Execute Export QA Validation
            ExportQAService.validate_export(doc_export, ir, file_path=artifact_full_path)

            # 7. Finalize Job
            job.document_export = doc_export
            job.status = ExportJobStatus.COMPLETED
            job.progress_pct = 100
            job.status_message = f"Document exported and verified successfully as {job.export_format}."
            job.save(update_fields=['document_export', 'status', 'progress_pct', 'status_message', 'updated_at'])

        except Exception as e:
            job.status = ExportJobStatus.FAILED
            job.error_message = str(e)
            job.status_message = f"Document export failed: {str(e)}"
            job.save(update_fields=['status', 'error_message', 'status_message', 'updated_at'])

