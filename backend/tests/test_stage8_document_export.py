import os
import uuid
import pytest
import docx
import pypdf
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from workspaces.models import Workspace, WorkspaceMembership
from projects.models import ResearchProject, DocumentCategory, AcademicLevel, CitationStyle
from documents.models import ResearchDocument, DocumentSection, DocumentVersion
from disciplines.models import AcademicDiscipline
from research.models import (
    FormattingTemplate,
    TemplateVersion,
    TemplateType,
    TemplateDegreeLevel,
    TemplateDocumentType,
    TemplateVerificationStatus as VerificationStatus,
    DocumentExport,
    ExportJob,
    ExportValidation,
    ExportIssue,
    DocumentExportFormat,
    ExportJobStatus,
    ExportOverallRating,
    ManuscriptMetadata,
    ProjectTemplateAssignment,
    ResearchSource,
    Citation,
)
from research.institutional_template_service import InstitutionalTemplateService
from research.document_ir import DocumentIRBuilder, DocumentIR
from research.docx_export_service import DocxExportService
from research.pdf_export_service import PdfExportService
from research.export_qa_service import ExportQAService
from research.export_job_service import ExportJobService

User = get_user_model()


@pytest.fixture
def export_setup(db, tmp_path):
    owner = User.objects.create_user(
        email="stage8_author@scholarforge.edu",
        password="TestPassword123!",
        first_name="Ada",
        last_name="Lovelace",
    )
    collaborator = User.objects.create_user(
        email="stage8_collab@scholarforge.edu",
        password="TestPassword123!",
        first_name="Charles",
        last_name="Babbage",
    )
    intruder = User.objects.create_user(
        email="stage8_intruder@scholarforge.edu",
        password="TestPassword123!",
        first_name="Lord",
        last_name="Byron",
    )

    workspace = Workspace.objects.create(name="Analytical Engine Lab", owner=owner)
    WorkspaceMembership.objects.create(workspace=workspace, user=owner, role="OWNER")
    WorkspaceMembership.objects.create(workspace=workspace, user=collaborator, role="MEMBER")

    discipline, _ = AcademicDiscipline.objects.get_or_create(
        name="Computer Science & Informatics",
        slug="comp-sci"
    )

    project = ResearchProject.objects.create(
        workspace=workspace,
        owner=owner,
        title="Computational Mechanics and Algorithmic Analysis of Analytical Engines",
        document_category=DocumentCategory.ACADEMIC_PROJECT,
        document_subtype="PhD Dissertation",
        academic_level=AcademicLevel.PHD,
        citation_style=CitationStyle.APA,
        discipline=discipline,
    )

    # Document & Structured Sections
    doc = ResearchDocument.objects.create(
        project=project,
        title="Full Dissertation Manuscript",
        current_version_number=1,
    )

    sec1 = DocumentSection.objects.create(
        document=doc,
        title="Chapter 1: Foundations of Mechanical Computation",
        order_index=0,
        content=(
            "<h2>1.1 Historical Precedents</h2>"
            "<p>The analytical engine weaves algebraical patterns just as the Jacquard-loom weaves flowers.</p>"
            "<p>Significant differences exist between mere calculating machinery and general-purpose symbolic engines.</p>"
        ),
        word_count=24,
    )

    sec2 = DocumentSection.objects.create(
        document=doc,
        title="Chapter 2: Mathematical Framework and Experimental Results",
        order_index=1,
        content=(
            "<h2>2.1 Cycle Time and Gear Train Ratio Analysis</h2>"
            "<p>Below we present the observed execution cycles across different barrel configurations:</p>"
            "<table data-caption='Engine Operating Parameters across Gear Ratios'>"
            "<tr><th>Gear Configuration</th><th>Cycle Time (s)</th><th>Error Margin (%)</th></tr>"
            "<tr><td>Standard 40-Column</td><td>1.45</td><td>0.02</td></tr>"
            "<tr><td>Enhanced High-Torque</td><td>0.85</td><td>0.01</td></tr>"
            "</table>"
            "<p>Mathematical derivation of mechanical latency is formalized in Eq. (1):</p>"
            "<span class='equation display' data-latex='L_m = \\sum_{i=1}^{n} \\frac{\\theta_i}{\\omega_i} + \\delta_c'>$$L_m = \\sum_{i=1}^{n} \\frac{\\theta_i}{\\omega_i} + \\delta_c$$</span>"
            "<img src='test_gear_diagram.png' alt='Gear Ratio Diagram' data-caption='Mechanical Train Diagram' />"
        ),
        word_count=45,
    )

    # Academic Source & Project Citation
    source = ResearchSource.objects.create(
        title="Sketch of the Analytical Engine Invented by Charles Babbage",
        authors=["Menabrea, L. F.", "Lovelace, A. A."],
        publication_year=1842,
        journal_or_publisher="Bibliotheque Universelle de Geneve",
        doi="10.1000/1842.engine.sketch",
        verification_status="METADATA_VERIFIED",
    )
    Citation.objects.create(
        project=project,
        source=source,
        citation_style="apa-7th",
        in_text_format="(Menabrea & Lovelace, 1842)",
        full_reference="Menabrea, L. F., & Lovelace, A. A. (1842). Sketch of the analytical engine invented by Charles Babbage. Bibliotheque Universelle de Geneve.",
    )

    # Manuscript Metadata
    meta = ManuscriptMetadata.objects.create(
        project=project,
        corresponding_author_name="Ada Lovelace",
        corresponding_author_email="ada@analytical-engine.org",
        study_design_type="THEORETICAL",
        involves_human_or_animal_subjects=False,
        ethics_approval_statement="",
        conflict_of_interest_statement="The author declares no financial competing interests.",
        data_availability_statement="All mathematical derivations are contained within the manuscript.",
        orcid_identifiers=[{"name": "Ada Lovelace", "orcid": "0000-0002-1825-0097"}]
    )

    # Seed and Assign Institutional Template
    InstitutionalTemplateService.seed_authoritative_templates()
    template = FormattingTemplate.objects.filter(name__icontains="Oxford").first()
    active_version = template.versions.filter(is_active=True).first()
    ProjectTemplateAssignment.objects.create(
        project=project,
        template=template,
        template_version=active_version,
        assigned_by=owner,
    )

    return {
        "owner": owner,
        "collaborator": collaborator,
        "intruder": intruder,
        "workspace": workspace,
        "project": project,
        "document": doc,
        "sections": [sec1, sec2],
        "template": template,
        "template_version": active_version,
        "tmp_path": tmp_path,
    }


@pytest.mark.django_db
class TestDocumentIRBuilder:
    def test_builds_complete_canonical_ir(self, export_setup):
        project = export_setup["project"]
        template = export_setup["template"]

        ir = DocumentIRBuilder.build_ir(project=project, template=template)

        assert isinstance(ir, DocumentIR)
        assert ir.metadata.title == project.title
        assert ir.metadata.author_name == "Ada Lovelace"
        assert ir.layout.paper_size in ("A4", "LETTER")
        assert ir.layout.binding_gutter_inches == 0.0 or ir.layout.binding_gutter_inches >= 0.0

        # Preliminary pages present
        assert len(ir.preliminary_pages) >= 4
        title_page = next((p for p in ir.preliminary_pages if p.page_key == 'title_page'), None)
        assert title_page is not None
        assert title_page.suppress_page_number is True

        # Body sections and blocks
        assert len(ir.body_sections) == 2
        sec1 = ir.body_sections[0]
        assert "Chapter 1" in sec1.title
        sec2 = ir.body_sections[1]
        assert any(b.__class__.__name__ == 'TableBlockIR' for b in sec2.blocks)
        assert any(b.__class__.__name__ == 'EquationBlockIR' for b in sec2.blocks)
        assert any(b.__class__.__name__ == 'FigureBlockIR' for b in sec2.blocks)

        # Bibliography
        assert len(ir.bibliography_entries) >= 1
        assert "Menabrea" in ir.bibliography_entries[0].citation_text


@pytest.mark.django_db
class TestDocxExportService:
    def test_generates_valid_docx_with_dual_pagination_and_styles(self, export_setup):
        project = export_setup["project"]
        template = export_setup["template"]
        tmp_path = export_setup["tmp_path"]

        ir = DocumentIRBuilder.build_ir(project=project, template=template)
        output_file = str(tmp_path / "test_dissertation.docx")

        stats = DocxExportService.generate_docx(ir, output_file)

        assert os.path.exists(output_file)
        assert stats["file_size_bytes"] > 0
        assert len(stats["file_checksum"]) == 64
        assert stats["heading_count"] >= 3
        assert stats["table_count"] >= 1
        assert stats["figure_count"] >= 1

        # Inspect generated DOCX with python-docx
        doc = docx.Document(output_file)

        # 1. Dual section breaks verification
        assert len(doc.sections) >= 2
        prelim_sect = doc.sections[0]
        body_sect = doc.sections[1]

        # Section 1: Different first page to suppress page number on title page
        assert prelim_sect.different_first_page_header_footer is True

        # Section 2: Unlinked headers/footers
        assert body_sect.header.is_linked_to_previous is False
        assert body_sect.footer.is_linked_to_previous is False

        # 2. XML check for Table of Contents field code
        xml_content = "".join([p._p.xml for p in doc.paragraphs])
        assert 'TOC \\o "1-3"' in xml_content or 'TOC' in xml_content

        # 3. Table verification
        assert len(doc.tables) >= 1
        first_table = doc.tables[0]
        assert len(first_table.rows) >= 2
        # Check header repetition in table row XML
        header_tr_xml = first_table.rows[0]._tr.xml
        assert 'tblHeader' in header_tr_xml or 'cantSplit' in header_tr_xml

        # 4. References verification
        ref_paras = [p for p in doc.paragraphs if "Menabrea" in p.text]
        assert len(ref_paras) >= 1
        assert ref_paras[0].paragraph_format.left_indent is not None


@pytest.mark.django_db
class TestPdfExportService:
    def test_generates_valid_selectable_pdf(self, export_setup):
        project = export_setup["project"]
        template = export_setup["template"]
        tmp_path = export_setup["tmp_path"]

        ir = DocumentIRBuilder.build_ir(project=project, template=template)
        output_file = str(tmp_path / "test_dissertation.pdf")

        stats = PdfExportService.generate_pdf(ir, output_file)

        assert os.path.exists(output_file)
        assert stats["file_size_bytes"] > 0
        assert stats["page_count"] >= 2
        assert stats["has_selectable_text"] is True
        assert len(stats["file_checksum"]) == 64

        # Inspect generated PDF with pypdf
        reader = pypdf.PdfReader(output_file)
        assert len(reader.pages) >= 2

        all_text = " ".join([page.extract_text() for page in reader.pages])
        assert "MECHANICS" in all_text.upper() or "ANALYTICAL" in all_text.upper()
        assert "Ada Lovelace" in all_text or "ADA LOVELACE" in all_text.upper()
        assert "Table 1" in all_text or "Operating Parameters" in all_text


@pytest.mark.django_db
class TestExportQAService:
    def test_qa_validation_pipeline_and_cross_check(self, export_setup):
        project = export_setup["project"]
        template = export_setup["template"]
        tmp_path = export_setup["tmp_path"]

        ir = DocumentIRBuilder.build_ir(project=project, template=template)
        output_file = str(tmp_path / "qa_manuscript.docx")
        stats = DocxExportService.generate_docx(ir, output_file)

        doc_export = DocumentExport.objects.create(
            project=project,
            export_format=DocumentExportFormat.DOCX,
            file_name="qa_manuscript.docx",
            file_checksum=stats["file_checksum"],
            file_size_bytes=stats["file_size_bytes"],
            heading_count=stats["heading_count"],
            table_count=stats["table_count"],
            figure_count=stats["figure_count"],
            reference_count=stats["reference_count"],
        )

        validation = ExportQAService.validate_export(doc_export, ir, file_path=output_file)

        assert isinstance(validation, ExportValidation)
        assert validation.overall_rating in (ExportOverallRating.EXCELLENT, ExportOverallRating.ACCEPTABLE)
        assert validation.structure_valid is True
        assert validation.layout_valid is True
        assert doc_export.is_verified is True

        # Check recorded issues
        assert validation.issues.count() >= 1
        not_verified_issue = validation.issues.filter(severity="NOT_VERIFIED").first()
        assert not_verified_issue is not None
        assert "printer crop marks" in not_verified_issue.message.lower() or "hardcopy" in not_verified_issue.message.lower()


@pytest.mark.django_db
class TestExportJobService:
    def test_idempotent_job_lifecycle(self, export_setup):
        project = export_setup["project"]
        owner = export_setup["owner"]
        template = export_setup["template"]

        key = f"idempotent-test-{uuid.uuid4()}"

        # 1. First invocation creates and completes job
        job1 = ExportJobService.initiate_export_job(
            project=project,
            user=owner,
            export_format="DOCX",
            template_id=str(template.id),
            idempotency_key=key,
        )

        assert job1.status == ExportJobStatus.COMPLETED
        assert job1.progress_pct == 100
        assert job1.document_export is not None
        assert job1.document_export.file_size_bytes > 0

        # 2. Second invocation with same key returns existing completed job
        job2 = ExportJobService.initiate_export_job(
            project=project,
            user=owner,
            export_format="DOCX",
            template_id=str(template.id),
            idempotency_key=key,
        )

        assert job1.id == job2.id


@pytest.mark.django_db
class TestExportAPIEndpoints:
    def test_export_endpoints_workflow(self, export_setup):
        client = APIClient()
        owner = export_setup["owner"]
        intruder = export_setup["intruder"]
        project = export_setup["project"]
        template = export_setup["template"]

        client.force_authenticate(user=owner)

        # 1. GET /projects/<id>/export-preview/
        res = client.get(f"/api/v1/research/projects/{project.id}/export-preview/?template_id={template.id}")
        assert res.status_code == status.HTTP_200_OK
        assert "layout" in res.data
        assert "chapters" in res.data
        assert res.data["estimated_pages"] >= 2

        # 2. POST /projects/<id>/export/ (DOCX)
        res = client.post(
            f"/api/v1/research/projects/{project.id}/export/",
            {
                "export_format": "DOCX",
                "template_id": str(template.id),
                "citation_style": "apa-7th",
                "idempotency_key": f"api-docx-{uuid.uuid4()}",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        job_id = res.data["id"]
        assert res.data["status"] == "COMPLETED"
        assert res.data["document_export"] is not None
        export_id = res.data["document_export"]

        # 3. GET /export-jobs/<job_id>/
        res = client.get(f"/api/v1/research/export-jobs/{job_id}/")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["progress_pct"] == 100

        # 4. GET /projects/<id>/exports/
        res = client.get(f"/api/v1/research/projects/{project.id}/exports/")
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) >= 1

        # 5. GET /exports/<export_id>/
        res = client.get(f"/api/v1/research/exports/{export_id}/")
        assert res.status_code == status.HTTP_200_OK
        assert "validation_report" in res.data
        assert res.data["validation_report"]["overall_rating"] in ("EXCELLENT", "ACCEPTABLE")

        # 6. GET /exports/<export_id>/download/ (Authorized Download)
        res = client.get(f"/api/v1/research/exports/{export_id}/download/")
        assert res.status_code == status.HTTP_200_OK
        assert "attachment" in res.headers["Content-Disposition"]

        # 7. POST /exports/<export_id>/validate/ (On-demand re-QA)
        res = client.post(f"/api/v1/research/exports/{export_id}/validate/")
        assert res.status_code == status.HTTP_200_OK
        assert "overall_rating" in res.data

        # 8. Security test: Intruder without workspace membership cannot download
        intruder_client = APIClient()
        intruder_client.force_authenticate(user=intruder)
        res_intruder = intruder_client.get(f"/api/v1/research/exports/{export_id}/download/")
        assert res_intruder.status_code == status.HTTP_403_FORBIDDEN

        # 9. POST /projects/<id>/export/ (PDF)
        res = client.post(
            f"/api/v1/research/projects/{project.id}/export/",
            {
                "export_format": "PDF",
                "template_id": str(template.id),
                "citation_style": "apa-7th",
                "idempotency_key": f"api-pdf-{uuid.uuid4()}",
            },
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["export_format"] == "PDF"
        assert res.data["status"] == "COMPLETED"

        # 10. DELETE /exports/<export_id>/
        res = client.delete(f"/api/v1/research/exports/{export_id}/")
        assert res.status_code == status.HTTP_204_NO_CONTENT

