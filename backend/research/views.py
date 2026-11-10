import os

from research.models import (
    DocumentExport,
    ExportJob,
    ExportValidation,
    ExportIssue,
    RenderedAsset,
    DocumentExportFormat,
)
from research.serializers import (
    DocumentExportSerializer,
    ExportJobSerializer,
    ExportValidationSerializer,
    ExportIssueSerializer,
)
from research.document_ir import DocumentIRBuilder
from research.export_job_service import ExportJobService
from research.export_qa_service import ExportQAService
from documents.models import ResearchDocument, DocumentSection, DocumentVersion
import uuid
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, FileResponse
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from projects.models import ResearchProject
from projects.permissions import IsProjectOwnerOrWorkspaceMember
from projects.access import (
    VIEW,
    COMMENT,
    EDIT,
    APPROVE,
    MANAGE,
    has_project_access,
    require_project_access,
    require_section_access,
    require_full_manuscript_access,
)
from workspaces.models import AuditEvent

from research.models import (
    ResearchSource,
    ProjectSource,
    Citation,
    ResearchCollection,
    ResearchCollectionItem,
    SourceVerification,
    SourceDocument,
    LiteratureExtraction,
    LiteratureReviewNote,
    CitationAudit,
    ResearchSearchJob,
    AIJob,
    AIJobStatus,
    TemplateVerificationStatus as VerificationStatus,
    # Stage 4 Models
    ResearchMethodology,
    ResearchVariable,
    ResearchInstrument,
    InstrumentItem,
    ResearchDataset,
    DatasetVersion,
    DataTransformation,
    StatisticalResult,
    HypothesisTest,
    QualitativeTranscript,
    QualitativeCode,
    QualitativeTheme,
    EvidenceExcerpt,
    ResearchVisualization,
    SamplingPlan,
    AnalysisJob,
    # Stage 5 Models
    ResearchWorkflow,
    WorkflowStep,
    ResearchDecision,
    ResearchAlignmentMatrix,
    AlignmentIssue,
    ManuscriptAssembly,
    ManuscriptValidation,
    ValidationIssue,
    ReviewRecord,
    # Stage 6 Models
    ProjectCollaborator,
    CollaboratorRole,
    ProjectInvitation,
    InvitationStatus,
    ManuscriptComment,
    CommentReply,
    CommentStatus,
    SupervisorFeedback,
    FeedbackSourceType,
    CorrectionTask,
    CorrectionCategory,
    CorrectionTaskStatus,
    JournalReviewerResponse,
    RevisionCategory,
    CollaborationAuditEvent,
)

from research.serializers import (
    ResearchSourceSerializer,
    ProjectSourceSerializer,
    CitationSerializer,
    ResearchCollectionSerializer,
    ResearchCollectionItemSerializer,
    SourceDocumentSerializer,
    SourceVerificationSerializer,
    LiteratureExtractionSerializer,
    LiteratureReviewNoteSerializer,
    CitationAuditSerializer,
    # Stage 4 Serializers
    ResearchMethodologySerializer,
    ResearchVariableSerializer,
    ResearchInstrumentSerializer,
    InstrumentItemSerializer,
    ResearchDatasetSerializer,
    DatasetVersionSerializer,
    DataTransformationSerializer,
    StatisticalResultSerializer,
    HypothesisTestSerializer,
    QualitativeTranscriptSerializer,
    QualitativeCodeSerializer,
    QualitativeThemeSerializer,
    EvidenceExcerptSerializer,
    ResearchVisualizationSerializer,
    SamplingPlanSerializer,
    AnalysisJobSerializer,
    # Stage 5 Serializers
    WorkflowStepSerializer,
    ResearchWorkflowSerializer,
    ResearchDecisionSerializer,
    AlignmentIssueSerializer,
    ResearchAlignmentMatrixSerializer,
    ManuscriptAssemblySerializer,
    ValidationIssueSerializer,
    ManuscriptValidationSerializer,
    ReviewRecordSerializer,
    # Stage 6 Serializers
    ProjectCollaboratorSerializer,
    ProjectInvitationSerializer,
    ManuscriptCommentSerializer,
    CommentReplySerializer,
    SupervisorFeedbackSerializer,
    CorrectionTaskSerializer,
    JournalReviewerResponseSerializer,
    CollaborationAuditEventSerializer,
)

# Stage 6 Services & Permissions
from projects.permissions import (
    IsProjectSupervisorOrOwner,
    CanEditProjectManuscript,
)
from research.collaboration_service import CollaborationService
from research.comment_service import CommentService
from research.supervisor_feedback_service import SupervisorFeedbackService
from research.correction_service import CorrectionService
from research.diff_service import RevisionDiffService
from research.journal_review_service import JournalReviewService

# Stage 2 & 3 Services
from research.context_engine import extract_research_context, get_authorized_project
from research.ai_service import execute_ai_task
from research.consistency_engine import analyze_academic_consistency
from research.discovery_service import ScholarlyDiscoveryService, normalize_doi
from research.verification_service import PublicationVerificationEngine
from research.importers.parsers import parse_bibtex, parse_ris, import_source_from_doi
from research.document_service import DocumentProcessingService
from research.literature_intelligence import LiteratureIntelligenceService
from research.citation_service import CitationService
from research.citation_audit_service import CitationAuditService

# Stage 4 Services
from research.methodology_service import MethodologyService
from research.instrument_service import InstrumentService
from research.dataset_service import DatasetService
from research.statistics_service import StatisticsService
from research.hypothesis_service import HypothesisService
from research.qualitative_service import QualitativeService
from research.interpretation_service import InterpretationService

# Stage 5 Services
from research.workflow_service import WorkflowService
from research.planning_service import PlanningService
from research.alignment_service import AlignmentService
from research.assembly_service import AssemblyService
from research.quality_assurance_service import QualityAssuranceService
from research.review_service import ReviewService
from research.provenance_service import ProvenanceService


# ============================================================================
# STAGE 2: AI WRITING ASSISTANT & CONSISTENCY VIEWS
# ============================================================================

class AIGenerateView(views.APIView):
    """
    Submits a request to the AI Writing Assistant with full project research context.
    AI suggestions NEVER automatically overwrite manuscript text.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        project_id = request.data.get("project_id")
        action = request.data.get("action")
        section_id = request.data.get("section_id")
        selected_text = request.data.get("selected_text", "")
        instructions = request.data.get("instructions", "")
        rewrite_style = request.data.get("rewrite_style", "formal")

        if not project_id or not action:
            return Response(
                {"error": "Both 'project_id' and 'action' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_actions = [
            "GENERATE_SECTION",
            "IMPROVE_WRITING",
            "EXPAND_WRITING",
            "SUMMARIZE_CONTENT",
            "REWRITE_CONTENT",
            "SUGGEST_OBJECTIVES",
            "SUGGEST_QUESTIONS",
            "SUGGEST_HYPOTHESES",
            "SUGGEST_FRAMEWORK",
            "SUGGEST_OUTLINE"
        ]
        if action not in valid_actions:
            return Response(
                {"error": f"Invalid action '{action}'. Must be one of: {', '.join(valid_actions)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        project = get_authorized_project(project_id, request.user)
        if not project or not has_project_access(request.user, project, EDIT):
            return Response(
                {"error": "Project not found or you lack authorization to access it."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            context = extract_research_context(project_id, request.user, section_id=section_id)
        except PermissionError:
            return Response(
                {"error": "Access denied to project context."},
                status=status.HTTP_403_FORBIDDEN
            )

        result = execute_ai_task(
            user=request.user,
            project=project,
            action=action,
            context=context,
            selected_text=selected_text,
            instructions=instructions,
            rewrite_style=rewrite_style
        )

        status_code = status.HTTP_200_OK if result.get("status") == "COMPLETED" else status.HTTP_400_BAD_REQUEST
        return Response(result, status=status_code)


class AIJobDetailView(views.APIView):
    """
    Retrieves status and output of a specific AI job.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        job = get_object_or_404(AIJob, pk=pk)
        if job.user != request.user and not has_project_access(request.user, job.project, VIEW):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        return Response({
            "id": str(job.id),
            "project_id": str(job.project_id),
            "job_type": job.job_type,
            "status": job.status,
            "input_payload": job.input_payload,
            "output_payload": job.output_payload,
            "error_message": job.error_message,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
        }, status=status.HTTP_200_OK)


class AIJobFeedbackView(views.APIView):
    """
    Records user feedback (ACCEPT, REJECT, EDIT) on an AI suggestion for audit and transparency.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        job = get_object_or_404(AIJob, pk=pk)
        if not has_project_access(request.user, job.project, EDIT):
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        feedback_action = request.data.get("action", "").upper()
        final_text = request.data.get("final_text", "")

        if feedback_action not in ["ACCEPT", "REJECT", "EDIT"]:
            return Response(
                {"error": "Action must be one of: ACCEPT, REJECT, EDIT"},
                status=status.HTTP_400_BAD_REQUEST
            )

        output = job.output_payload or {}
        output["user_feedback"] = feedback_action
        output["is_applied"] = (feedback_action in ["ACCEPT", "EDIT"])
        if final_text:
            output["applied_text"] = final_text

        job.output_payload = output
        job.save()

        AuditEvent.objects.create(
            workspace=job.project.workspace,
            user=request.user,
            action=f"AI_SUGGESTION_{feedback_action}",
            entity_type="AI_JOB",
            entity_id=str(job.id),
            ip_address="127.0.0.1",
            details={
                "job_id": str(job.id),
                "project_id": str(job.project_id),
                "job_type": job.job_type,
                "feedback": feedback_action
            }
        )

        return Response({
            "message": f"Recorded feedback '{feedback_action}' for AI Job {job.id}",
            "is_applied": output["is_applied"]
        }, status=status.HTTP_200_OK)


class AcademicConsistencyCheckView(views.APIView):
    """
    Runs automated consistency checks on the project's objectives, questions, hypotheses, and outline.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        report = analyze_academic_consistency(project)
        return Response(report, status=status.HTTP_200_OK)

    def get(self, request, project_id):
        return self.post(request, project_id)


class ResearchContextDetailView(views.APIView):
    """
    Retrieves full research context for a project and optional section.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        section_id = request.query_params.get("section_id")
        context = extract_research_context(str(project.id), request.user, section_id=section_id)
        return Response(context, status=status.HTTP_200_OK)


# ============================================================================
# STAGE 3: SCHOLARLY DISCOVERY & VERIFICATION VIEWS
# ============================================================================

class ResearchDiscoverySearchView(views.APIView):
    """
    Discovers scholarly publications across OpenAlex, Crossref, and Semantic Scholar
    with deduplication, filtering, and normalization.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        query = request.data.get("query", "").strip()
        if not query:
            return Response({"error": "Search query is required."}, status=status.HTTP_400_BAD_REQUEST)

        discipline = request.data.get("discipline")
        year_from = request.data.get("year_from")
        year_to = request.data.get("year_to")
        is_oa = request.data.get("is_open_access")
        pub_type = request.data.get("publication_type")
        provider = request.data.get("provider", "ALL").upper()
        sort = request.data.get("sort")
        page = int(request.data.get("page", 1))
        per_page = int(request.data.get("per_page", 10))

        try:
            year_from = int(year_from) if year_from else None
            year_to = int(year_to) if year_to else None
        except ValueError:
            year_from, year_to = None, None

        results = ScholarlyDiscoveryService.search(
            query=query,
            discipline=discipline,
            year_from=year_from,
            year_to=year_to,
            is_oa=is_oa,
            pub_type=pub_type,
            provider=provider,
            page=page,
            per_page=per_page,
            sort=sort
        )

        ResearchSearchJob.objects.create(
            user=request.user,
            query=query,
            filters=request.data,
            provider=provider,
            results_count=results.get("total_count", 0)
        )

        return Response(results, status=status.HTTP_200_OK)


class ResearchSourceListCreateView(views.APIView):
    """
    Lists user's saved research sources or manually creates a new source.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("search", "").strip()
        pub_type = request.query_params.get("publication_type")
        verification_status = request.query_params.get("verification_status")

        sources = ResearchSource.objects.filter(
            Q(created_by=request.user) |
            Q(project_associations__project__owner=request.user) |
            Q(collection_memberships__collection__user=request.user)
        ).distinct()

        if query:
            sources = sources.filter(
                Q(title__icontains=query) |
                Q(abstract__icontains=query) |
                Q(journal_or_publisher__icontains=query) |
                Q(doi__icontains=query)
            )

        if pub_type:
            sources = sources.filter(source_type=pub_type)

        if verification_status:
            sources = sources.filter(verification_status=verification_status)

        serializer = ResearchSourceSerializer(sources, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ResearchSourceSerializer(data=request.data)
        if serializer.is_valid():
            source = serializer.save(created_by=request.user)
            PublicationVerificationEngine.verify_source(source)
            source.refresh_from_db()
            return Response(ResearchSourceSerializer(source).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResearchSourceDetailView(views.APIView):
    """
    Retrieves, updates, or deletes an individual ResearchSource record.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(ResearchSource, pk=pk)

    @staticmethod
    def _can_modify(source, user):
        # Sources are a shared, de-duplicated catalog; only the creator (or staff) may alter them.
        return user.is_staff or (source.created_by_id is not None and source.created_by_id == user.id)

    def get(self, request, pk):
        source = self.get_object(pk, request.user)
        serializer = ResearchSourceSerializer(source)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        source = self.get_object(pk, request.user)
        if not self._can_modify(source, request.user):
            return Response({"error": "Only the user who added this source can modify it."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ResearchSourceSerializer(source, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        source = self.get_object(pk, request.user)
        if not self._can_modify(source, request.user):
            return Response({"error": "Only the user who added this source can delete it."}, status=status.HTTP_403_FORBIDDEN)
        source.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VerifySourceView(views.APIView):
    """
    Triggers explicit publication verification check against Crossref / OpenAlex.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        source = get_object_or_404(ResearchSource, pk=pk)
        verification = PublicationVerificationEngine.verify_source(source)
        source.refresh_from_db()
        return Response({
            "source_id": str(source.id),
            "verification_status": source.verification_status,
            "retracted": source.retracted,
            "verification_details": SourceVerificationSerializer(verification).data
        }, status=status.HTTP_200_OK)


class ImportDOIView(views.APIView):
    """
    Directly resolves a DOI and saves the verified publication into the user's library.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        doi = request.data.get("doi", "").strip()
        if not doi:
            return Response({"error": "DOI is required."}, status=status.HTTP_400_BAD_REQUEST)

        record = import_source_from_doi(doi)
        if not record:
            return Response(
                {"error": f"Could not resolve metadata for DOI '{doi}' in Crossref or OpenAlex registries."},
                status=status.HTTP_404_NOT_FOUND
            )

        clean_doi = normalize_doi(record.get("doi", doi))
        source, created = ResearchSource.objects.get_or_create(
            doi=clean_doi,
            defaults={
                "created_by": request.user,
                "title": record.get("title", ""),
                "authors": record.get("authors", []),
                "publication_year": record.get("publication_year"),
                "source_type": record.get("source_type", "JOURNAL"),
                "journal_or_publisher": record.get("journal_or_publisher", ""),
                "url": record.get("url", ""),
                "abstract": record.get("abstract", ""),
                "is_open_access": record.get("is_open_access", False),
                "citation_count": record.get("citation_count", 0),
                "provenance": record.get("provenance", []),
                "retracted": record.get("retracted", False),
                "retraction_details": record.get("retraction_details", "")
            }
        )

        PublicationVerificationEngine.verify_source(source)
        source.refresh_from_db()

        return Response(ResearchSourceSerializer(source).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ImportBibTeXView(views.APIView):
    """
    Imports publications from a BibTeX text snippet or file content.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        bibtex_content = request.data.get("bibtex", "").strip()
        if not bibtex_content:
            return Response({"error": "BibTeX content is required."}, status=status.HTTP_400_BAD_REQUEST)

        parsed_records = parse_bibtex(bibtex_content)
        if not parsed_records:
            return Response({"error": "No valid BibTeX entries found."}, status=status.HTTP_400_BAD_REQUEST)

        created_sources = []
        for rec in parsed_records:
            doi = normalize_doi(rec.get("doi"))
            source, _ = ResearchSource.objects.get_or_create(
                title=rec["title"],
                defaults={
                    "created_by": request.user,
                    "authors": rec.get("authors", []),
                    "publication_year": rec.get("publication_year"),
                    "source_type": rec.get("source_type", "JOURNAL"),
                    "journal_or_publisher": rec.get("journal_or_publisher", ""),
                    "doi": doi,
                    "url": rec.get("url", ""),
                    "abstract": rec.get("abstract", ""),
                    "bibtex": rec.get("bibtex", ""),
                    "provenance": ["BibTeX Import"]
                }
            )
            if doi:
                PublicationVerificationEngine.verify_source(source)
                source.refresh_from_db()
            created_sources.append(source)

        return Response(
            ResearchSourceSerializer(created_sources, many=True).data,
            status=status.HTTP_201_CREATED
        )


class ImportRISView(views.APIView):
    """
    Imports publications from a RIS text snippet.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ris_content = request.data.get("ris", "").strip()
        if not ris_content:
            return Response({"error": "RIS content is required."}, status=status.HTTP_400_BAD_REQUEST)

        parsed_records = parse_ris(ris_content)
        if not parsed_records:
            return Response({"error": "No valid RIS entries found."}, status=status.HTTP_400_BAD_REQUEST)

        created_sources = []
        for rec in parsed_records:
            doi = normalize_doi(rec.get("doi"))
            source, _ = ResearchSource.objects.get_or_create(
                title=rec["title"],
                defaults={
                    "created_by": request.user,
                    "authors": rec.get("authors", []),
                    "publication_year": rec.get("publication_year"),
                    "source_type": rec.get("source_type", "JOURNAL"),
                    "journal_or_publisher": rec.get("journal_or_publisher", ""),
                    "doi": doi,
                    "url": rec.get("url", ""),
                    "abstract": rec.get("abstract", ""),
                    "provenance": ["RIS Import"]
                }
            )
            if doi:
                PublicationVerificationEngine.verify_source(source)
                source.refresh_from_db()
            created_sources.append(source)

        return Response(
            ResearchSourceSerializer(created_sources, many=True).data,
            status=status.HTTP_201_CREATED
        )


# ============================================================================
# STAGE 3: COLLECTIONS & FOLDERS VIEWS
# ============================================================================

class ResearchCollectionListView(views.APIView):
    """
    Lists all collections for the current user or creates a new collection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        collections = ResearchCollection.objects.filter(user=request.user)
        serializer = ResearchCollectionSerializer(collections, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ResearchCollectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResearchCollectionDetailView(views.APIView):
    """
    Retrieves, updates, or deletes a ResearchCollection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        return get_object_or_404(ResearchCollection, pk=pk, user=user)

    def get(self, request, pk):
        collection = self.get_object(pk, request.user)
        serializer = ResearchCollectionSerializer(collection)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        collection = self.get_object(pk, request.user)
        serializer = ResearchCollectionSerializer(collection, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        collection = self.get_object(pk, request.user)
        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollectionItemView(views.APIView):
    """
    Adds, updates, or removes sources from a ResearchCollection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        collection = get_object_or_404(ResearchCollection, pk=pk, user=request.user)
        source_id = request.data.get("source_id")
        if not source_id:
            return Response({"error": "source_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        source = get_object_or_404(ResearchSource, pk=source_id)
        item, created = ResearchCollectionItem.objects.get_or_create(
            collection=collection,
            source=source,
            defaults={
                "notes": request.data.get("notes", ""),
                "tags": request.data.get("tags", []),
                "is_favorite": request.data.get("is_favorite", False),
                "is_read": request.data.get("is_read", False)
            }
        )
        return Response(
            ResearchCollectionItemSerializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    def patch(self, request, pk, source_id):
        collection = get_object_or_404(ResearchCollection, pk=pk, user=request.user)
        item = get_object_or_404(ResearchCollectionItem, collection=collection, source_id=source_id)
        serializer = ResearchCollectionItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, source_id):
        collection = get_object_or_404(ResearchCollection, pk=pk, user=request.user)
        item = get_object_or_404(ResearchCollectionItem, collection=collection, source_id=source_id)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# STAGE 3: PROJECT SOURCES ATTACHMENT VIEWS
# ============================================================================

class ProjectSourcesView(views.APIView):
    """
    Lists sources attached to a specific project or attaches a new source.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        ps_list = project.project_sources.select_related("source").all()
        serializer = ProjectSourceSerializer(ps_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        source_id = request.data.get("source_id")
        if not source_id:
            return Response({"error": "source_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        source = get_object_or_404(ResearchSource, pk=source_id)
        ps, created = ProjectSource.objects.get_or_create(
            project=project,
            source=source,
            defaults={
                "notes": request.data.get("notes", ""),
                "relevance_score": request.data.get("relevance_score", 5),
                "is_annotated": bool(request.data.get("notes")),
                "tags": request.data.get("tags", []),
                "is_favorite": request.data.get("is_favorite", False),
                "is_read": request.data.get("is_read", False)
            }
        )

        return Response(
            ProjectSourceSerializer(ps).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class ProjectSourceDetailView(views.APIView):
    """
    Updates or removes a source from a project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def patch(self, request, project_id, source_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        ps = get_object_or_404(ProjectSource, project=project, source_id=source_id)
        serializer = ProjectSourceSerializer(ps, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, project_id, source_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        ps = get_object_or_404(ProjectSource, project=project, source_id=source_id)
        ps.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# STAGE 3: DOCUMENT UPLOAD & EXTRACTION VIEWS
# ============================================================================

class DocumentUploadView(views.APIView):
    """
    Uploads a research file (PDF, DOCX, BibTeX, RIS) and runs text extraction.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        project_id = request.data.get("project_id")
        source_id = request.data.get("source_id")

        project = None
        if project_id:
            project = get_object_or_404(ResearchProject, pk=project_id)
            if not has_project_access(request.user, project, EDIT):
                return Response({"error": "Unauthorized project."}, status=status.HTTP_403_FORBIDDEN)

        source = None
        if source_id:
            source = get_object_or_404(ResearchSource, pk=source_id)

        try:
            doc = DocumentProcessingService.process_document(
                user=request.user,
                file=file_obj,
                project=project,
                source=source
            )
            serializer = SourceDocumentSerializer(doc)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as ve:
            return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentDetailView(views.APIView):
    """
    Retrieves document extraction details and indexed excerpts.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        doc = get_object_or_404(SourceDocument, pk=pk, user=request.user)
        serializer = SourceDocumentSerializer(doc)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================================================
# STAGE 3: AI LITERATURE INTELLIGENCE & REVIEW WORKSPACE VIEWS
# ============================================================================

class LiteratureIntelligenceAnalyzeView(views.APIView):
    """
    Executes grounded AI analysis on literature sources (summaries, findings, methodology,
    comparisons, gaps, evidence alignment).
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        task_type = request.data.get("task_type", "").upper()
        source_ids = request.data.get("source_ids", [])
        query_claim = request.data.get("query_claim", "")
        custom_instructions = request.data.get("custom_instructions", "")

        valid_tasks = [
            "SUMMARIZE_PUBLICATION",
            "EXTRACT_OBJECTIVES",
            "IDENTIFY_METHODOLOGY",
            "SUMMARIZE_FINDINGS",
            "IDENTIFY_LIMITATIONS",
            "COMPARE_STUDIES",
            "ORGANIZE_LITERATURE",
            "SUGGEST_RESEARCH_GAPS",
            "CREATE_LITERATURE_SYNTHESIS",
            "EVIDENCE_ALIGNMENT"
        ]
        if task_type not in valid_tasks:
            return Response(
                {"error": f"Invalid task_type '{task_type}'. Must be one of: {', '.join(valid_tasks)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not source_ids:
            return Response(
                {"error": "At least one source_id must be selected for literature analysis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = LiteratureIntelligenceService.analyze_literature(
            user=request.user,
            project=project,
            task_type=task_type,
            source_ids=source_ids,
            query_claim=query_claim,
            custom_instructions=custom_instructions
        )

        return Response(result, status=status.HTTP_200_OK)


class LiteratureReviewNoteListView(views.APIView):
    """
    Lists and creates structured literature review notes (Conceptual, Theoretical, Empirical, Systematic).
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        review_type = request.query_params.get("review_type")
        notes = project.literature_notes.all()
        if review_type:
            notes = notes.filter(review_type=review_type.upper())
        serializer = LiteratureReviewNoteSerializer(notes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        serializer = LiteratureReviewNoteSerializer(data=request.data)
        if serializer.is_valid():
            note = serializer.save(project=project, user=request.user)
            return Response(LiteratureReviewNoteSerializer(note).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LiteratureReviewNoteDetailView(views.APIView):
    """
    Updates or deletes a structured LiteratureReviewNote.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        note = get_object_or_404(LiteratureReviewNote, pk=pk)
        if not has_project_access(user, note.project, EDIT):
            return None
        return note

    def patch(self, request, pk):
        note = self.get_object(pk, request.user)
        if not note:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        serializer = LiteratureReviewNoteSerializer(note, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        note = self.get_object(pk, request.user)
        if not note:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# STAGE 3: CITATIONS, BIBLIOGRAPHY & AUDIT VIEWS
# ============================================================================

class ProjectBibliographyView(views.APIView):
    """
    Generates and returns the complete formatted bibliography for a project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        style = request.query_params.get("style")
        entries = CitationService.generate_project_bibliography(project=project, style=style)
        return Response({
            "project_id": str(project.id),
            "citation_style": (style or project.citation_style or "APA").upper(),
            "total_references": len(entries),
            "references": entries
        }, status=status.HTTP_200_OK)


class FormatCitationView(views.APIView):
    """
    Formats in-text citation strings for single or multiple sources.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': VIEW}

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        source_ids = request.data.get("source_ids", [])
        if not source_ids and request.data.get("source_id"):
            source_ids = [request.data.get("source_id")]

        if not source_ids:
            return Response({"error": "source_ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        style = (request.data.get("style") or project.citation_style or "APA").upper()
        format_type = request.data.get("format_type", "parenthetical")
        page_num = request.data.get("page_number", "")

        sources = list(ResearchSource.objects.filter(id__in=source_ids))
        if not sources:
            return Response({"error": "No matching sources found."}, status=status.HTTP_404_NOT_FOUND)

        attached_source_ids = set(str(sid) for sid in ProjectSource.objects.filter(project=project, source_id__in=source_ids).values_list('source_id', flat=True))
        for sid in source_ids:
            if str(sid) not in attached_source_ids:
                return Response({
                    "error": "One or more requested citation sources are not attached to this project.",
                    "rejection_reason": "FABRICATED_OR_UNATTACHED_SOURCE_ID"
                }, status=status.HTTP_400_BAD_REQUEST)

        if len(sources) == 1:
            in_text = CitationService.format_in_text_citation(
                source=sources[0],
                style=style,
                format_type=format_type,
                numeric_index=int(request.data.get("numeric_index", 1)),
                page_num=page_num
            )
            bib_entry = CitationService.format_bibliography_entry(
                source=sources[0],
                style=style,
                numeric_index=int(request.data.get("numeric_index", 1))
            )
        else:
            in_text = CitationService.format_multiple_in_text_citations(
                sources=sources,
                style=style
            )
            bib_entry = ""

        return Response({
            "citation_style": style,
            "format_type": format_type,
            "in_text_citation": in_text,
            "bibliography_entry": bib_entry,
            "sources": [{"id": str(s.id), "title": s.title} for s in sources]
        }, status=status.HTTP_200_OK)


class CitationAuditView(views.APIView):
    """
    Executes academic citation validation audit on the project's manuscript and library.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        report = CitationAuditService.audit_project_citations(project)
        return Response(report, status=status.HTTP_200_OK)

    def get(self, request, project_id):
        return self.post(request, project_id)

# STAGE 4: METHODOLOGY, INSTRUMENTS, DATA, STATISTICS, QUALITATIVE VIEWS
# ============================================================================

class MethodologyRecommendationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        discipline = request.data.get('discipline', request.data.get('discipline_name', 'Multidisciplinary'))
        objectives = request.data.get('objectives', request.data.get('objectives_text', ''))
        hypotheses = request.data.get('hypotheses', request.data.get('hypotheses_text', ''))
        category = request.data.get('category', request.data.get('document_category', ''))
        methodology_type = request.data.get('methodology_type')

        recommendations = MethodologyService.recommend_methodology(
            discipline_name=discipline,
            document_category=category,
            objectives_text=objectives,
            hypotheses_text=hypotheses,
            study_type_hint=methodology_type
        )
        return Response({'recommendations': recommendations}, status=status.HTTP_200_OK)


class ProjectMethodologyDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        methodology = getattr(project, 'methodology_design', None)
        if not methodology:
            return Response({'methodology': None}, status=status.HTTP_200_OK)
        return Response({'methodology': ResearchMethodologySerializer(methodology).data}, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        data = request.data.copy()
        data['project'] = str(project.id)

        methodology = getattr(project, 'methodology_design', None)
        if methodology:
            serializer = ResearchMethodologySerializer(methodology, data=data, partial=True)
        else:
            serializer = ResearchMethodologySerializer(data=data)

        if serializer.is_valid():
            saved = serializer.save()
            return Response(ResearchMethodologySerializer(saved).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, project_id):
        return self.post(request, project_id)


class SamplingCalculatorView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        formula = request.data.get('formula', 'YAMANE').upper()
        pop_size = request.data.get('population_size')
        pop_size_int = int(pop_size) if pop_size not in (None, '', 'null') else None
        margin_error = float(request.data.get('margin_of_error', 0.05))
        confidence = float(request.data.get('confidence_level', 0.95))
        nonresponse = float(request.data.get('nonresponse_inflation_rate', request.data.get('nonresponse_rate', 0.10)))

        if formula == 'COCHRAN':
            prop = float(request.data.get('estimated_proportion', 0.50))
            result = MethodologyService.calculate_cochran(
                margin_of_error=margin_error,
                confidence_level=confidence,
                estimated_proportion=prop,
                population_size=pop_size_int,
                nonresponse_rate=nonresponse
            )
        elif formula == 'YAMANE':
            if not pop_size_int:
                return Response({'error': 'Yamane formula requires a known finite population size.'}, status=status.HTTP_400_BAD_REQUEST)
            result = MethodologyService.calculate_yamane(
                population_size=pop_size_int,
                margin_of_error=margin_error,
                nonresponse_rate=nonresponse
            )
        elif formula in ('KREJCIE_MORGAN', 'KREJCIE-MORGAN'):
            if not pop_size_int:
                return Response({'error': 'Krejcie & Morgan requires a known finite population size.'}, status=status.HTTP_400_BAD_REQUEST)
            result = MethodologyService.calculate_krejcie_morgan(
                population_size=pop_size_int,
                margin_of_error=margin_error,
                confidence_level=confidence,
                nonresponse_rate=nonresponse
            )
        elif formula == 'POWER_ANALYSIS':
            power = float(request.data.get('power', 0.80))
            effect = float(request.data.get('effect_size', 0.50))
            test_type = request.data.get('test_type', 'T_TEST')
            result = MethodologyService.calculate_power_analysis(
                effect_size=effect,
                alpha=margin_error,
                power=power,
                test_type=test_type,
                nonresponse_rate=nonresponse
            )
        elif formula == 'QUALITATIVE':
            design = request.data.get('qualitative_design', request.data.get('strategy', 'PURPOSIVE'))
            result = MethodologyService.get_qualitative_sampling_guidance(strategy=design)
        else:
            return Response({'error': f'Unknown sampling formula {formula}'}, status=status.HTTP_400_BAD_REQUEST)

        if 'adjusted_sample_size' in result and 'inflated_sample_size' not in result:
            result['inflated_sample_size'] = result['adjusted_sample_size']
        if 'calculated_sample_size' not in result and 'adjusted_sample_size' in result:
            result['calculated_sample_size'] = result['adjusted_sample_size']

        return Response(result, status=status.HTTP_200_OK)


class ProjectVariablesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        vars_qs = project.variables.all().order_by('created_at')
        return Response(ResearchVariableSerializer(vars_qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        name = request.data.get('name', 'Variable')
        v_type = request.data.get('variable_type', 'INTERVAL')
        v_role = request.data.get('variable_role', 'INDEPENDENT')
        op_def = request.data.get('operational_definition', '')
        v = ResearchVariable.objects.create(
            project=project,
            name=name,
            variable_type=v_type,
            scale_of_measurement=v_role,
            operational_definition=op_def
        )
        return Response(ResearchVariableSerializer(v).data, status=status.HTTP_201_CREATED)


class VariableDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        var_obj = get_object_or_404(ResearchVariable, pk=pk)
        require_project_access(request.user, var_obj.project, EDIT)
        if 'name' in request.data:
            var_obj.name = request.data['name']
        if 'variable_type' in request.data:
            var_obj.variable_type = request.data['variable_type']
        if 'variable_role' in request.data:
            var_obj.scale_of_measurement = request.data['variable_role']
        if 'operational_definition' in request.data:
            var_obj.operational_definition = request.data['operational_definition']
        var_obj.save()
        return Response(ResearchVariableSerializer(var_obj).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        var_obj = get_object_or_404(ResearchVariable, pk=pk)
        require_project_access(request.user, var_obj.project, EDIT)
        var_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectInstrumentsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        instruments = project.instruments.all().order_by('-created_at')
        return Response(ResearchInstrumentSerializer(instruments, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        data = request.data.copy()
        data['project'] = str(project.id)
        serializer = ResearchInstrumentSerializer(data=data)
        if serializer.is_valid():
            inst = serializer.save()
            return Response(ResearchInstrumentSerializer(inst).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InstrumentDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        inst = get_object_or_404(ResearchInstrument, pk=pk)
        require_project_access(request.user, inst.project, VIEW)
        return Response(ResearchInstrumentSerializer(inst).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        inst = get_object_or_404(ResearchInstrument, pk=pk)
        require_project_access(request.user, inst.project, EDIT)
        data = request.data.copy()
        data.pop('project', None)  # instruments cannot be moved to another project
        serializer = ResearchInstrumentSerializer(inst, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        inst = get_object_or_404(ResearchInstrument, pk=pk)
        require_project_access(request.user, inst.project, EDIT)
        inst.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InstrumentGenerateDraftView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        inst = get_object_or_404(ResearchInstrument, pk=pk)
        project = require_project_access(request.user, inst.project, EDIT)
        variables = list(project.variables.all())

        if not variables:
            v_name = 'Core Construct'
            generated_items = InstrumentService.generate_draft_items_for_variable(v_name, 'DEPENDENT', 'INTERVAL')
        else:
            generated_items = []
            for v in variables:
                if inst.instrument_type == 'INTERVIEW_GUIDE':
                    items = InstrumentService.generate_interview_questions_for_variable(v.name, v.scale_of_measurement)
                else:
                    items = InstrumentService.generate_draft_items_for_variable(v.name, v.scale_of_measurement, v.variable_type)
                generated_items.extend(items)

        saved_items = []
        for idx, item_data in enumerate(generated_items, start=inst.items.count() + 1):
            item = InstrumentItem.objects.create(
                instrument=inst,
                order_index=idx,
                construct_name=item_data.get('construct', ''),
                dimension=item_data.get('dimension', ''),
                item_text=item_data.get('text', ''),
                item_type='LIKERT_5' if '5' in str(item_data.get('scale_type', '')) else 'LIKERT_7',
                options=item_data.get('options', []),
                is_reverse_coded=item_data.get('is_reverse_coded', False)
            )
            saved_items.append(item)

        return Response({
            'message': f'Successfully generated and added {len(saved_items)} items.',
            'items': InstrumentItemSerializer(saved_items, many=True).data
        }, status=status.HTTP_201_CREATED)


class InstrumentValidateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        inst = get_object_or_404(ResearchInstrument, pk=pk)
        require_project_access(request.user, inst.project, VIEW)
        items_data = [
            {
                'item_code': f'ITEM_{i.order_index:02d}',
                'text': i.item_text,
                'construct': i.construct_name,
                'is_reverse_coded': i.is_reverse_coded
            }
            for i in inst.items.all()
        ]
        expected_vars = [v.name for v in inst.project.variables.all()]
        report = InstrumentService.validate_instrument(items_data, expected_vars)
        return Response(report, status=status.HTTP_200_OK)


class InstrumentExportDocxView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        inst = get_object_or_404(ResearchInstrument, pk=pk)
        project = require_project_access(request.user, inst.project, VIEW)

        construct_map = {}
        for item in inst.items.all().order_by('order_index'):
            c_name = item.construct_name or 'General Construct Items'
            if c_name not in construct_map:
                construct_map[c_name] = []
            construct_map[c_name].append({
                'text': item.item_text,
                'is_reverse_coded': item.is_reverse_coded
            })

        instructions = getattr(inst, 'description', '') or 'Please complete all items carefully.'
        docx_bytes = InstrumentService.export_instrument_docx(
            title=inst.title,
            project_title=project.title,
            researcher_name=project.owner.get_full_name() or project.owner.email,
            instructions=instructions,
            demographic_items=InstrumentService.DEMOGRAPHIC_DEFAULTS,
            construct_sections=construct_map,
            confidentiality_statement=''
        )

        response = HttpResponse(
            docx_bytes,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        safe_filename = f'{inst.title.replace(" ", "_")[:30]}_Instrument.docx'
        response['Content-Disposition'] = f'attachment; filename=\"{safe_filename}\"'
        return response


class ProjectDatasetsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        datasets = project.datasets.all().order_by('-created_at')
        return Response(ResearchDatasetSerializer(datasets, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No dataset file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        name = request.data.get('name', uploaded_file.name)
        file_format = request.data.get('file_format', 'CSV').upper()
        if not file_format or file_format not in ('CSV', 'XLSX', 'JSON'):
            ext = uploaded_file.name.split('.')[-1].upper()
            file_format = ext if ext in ('CSV', 'XLSX', 'JSON') else 'CSV'

        try:
            parsed = DatasetService.parse_uploaded_file(uploaded_file, file_format)
        except Exception as e:
            return Response({'error': f'Failed to parse dataset file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        profile = DatasetService.profile_dataset(parsed['columns'], parsed['rows'])

        dataset = ResearchDataset.objects.create(
            project=project,
            user=request.user,
            name=name,
            file_format=file_format,
            original_filename=uploaded_file.name,
            file_size_bytes=uploaded_file.size,
            row_count=parsed['row_count'],
            column_count=parsed['column_count'],
            current_version_number=1,
            columns_schema={
                'columns': parsed['columns'],
                'profiles': profile.get('columns', {}),
                'formula_sanitization_count': parsed['sanitized_count'],
                'has_formula_sanitized': parsed['sanitized_count'] > 0
            }
        )

        DatasetVersion.objects.create(
            dataset=dataset,
            version_number=1,
            row_count=parsed['row_count'],
            column_count=parsed['column_count'],
            summary_statistics={
                'columns': parsed['columns'],
                'schema_summary': profile.get('columns', {}),
                'data_payload': parsed['rows'],
                'sanitization_count': parsed['sanitized_count']
            },
            change_summary='Initial raw dataset upload.'
        )

        return Response(ResearchDatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)


class DatasetDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        ds = get_object_or_404(ResearchDataset, pk=pk)
        require_project_access(request.user, ds.project, VIEW)
        return Response(ResearchDatasetSerializer(ds).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        ds = get_object_or_404(ResearchDataset, pk=pk)
        require_project_access(request.user, ds.project, EDIT)
        ds.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DatasetTransformView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ds = get_object_or_404(ResearchDataset, pk=pk)
        require_project_access(request.user, ds.project, EDIT)
        current_version =ds.versions.filter(version_number=ds.current_version_number).first() or ds.versions.first()
        if not current_version:
            return Response({'error': 'No active dataset version found.'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        stats = current_version.summary_statistics or {}
        rows = list(stats.get('data_payload', []))
        cols = list(stats.get('columns', []))
        params = request.data.get('parameters', {})

        affected_count = 0
        new_rows = rows
        new_cols = cols

        if action == 'IMPUTE_MISSING':
            col = params.get('column')
            strategy = params.get('strategy', 'MEAN')
            constant = params.get('constant_value')
            new_rows, affected_count = DatasetService.apply_imputation(rows, col, strategy, constant)

        elif action == 'DROP_DUPLICATES':
            subset = params.get('subset')
            new_rows, affected_count = DatasetService.drop_duplicates(rows, subset)

        elif action == 'HANDLE_OUTLIERS':
            col = params.get('column')
            method = params.get('method', 'IQR')
            out_action = params.get('outlier_action', 'WINSORIZE')
            new_rows, affected_count = DatasetService.handle_outliers(rows, col, method, out_action)

        elif action == 'REVERSE_CODE':
            col = params.get('column')
            min_v = int(params.get('min_val', 1))
            max_v = int(params.get('max_val', 5))
            new_col = params.get('new_column_name') or f'{col}_rev'
            new_rows = DatasetService.reverse_code_item(rows, col, min_v, max_v, new_col)
            if new_col not in new_cols:
                new_cols.append(new_col)
            affected_count = len(new_rows)

        elif action == 'COMPOSITE_SCALE':
            source_cols = params.get('source_columns', [])
            target_col = params.get('target_column')
            method = params.get('method', 'MEAN')
            new_rows = DatasetService.compute_composite_scale(rows, source_cols, target_col, method)
            if target_col not in new_cols:
                new_cols.append(target_col)
            affected_count = len(new_rows)

        else:
            return Response({'error': f'Unknown transformation action {action}'}, status=status.HTTP_400_BAD_REQUEST)

        new_profile = DatasetService.profile_dataset(new_cols, new_rows)

        new_version_num = ds.versions.count() + 1
        new_ver = DatasetVersion.objects.create(
            dataset=ds,
            version_number=new_version_num,
            row_count=len(new_rows),
            column_count=len(new_cols),
            summary_statistics={
                'columns': new_cols,
                'schema_summary': new_profile.get('columns', {}),
                'data_payload': new_rows
            },
            change_summary=f'Applied {action} on version {current_version.version_number}.'
        )

        DataTransformation.objects.create(
            dataset=ds,
            resulting_version=new_ver,
            transformation_type=action,
            parameters=params,
            rows_affected=affected_count,
            description=f'Applied {action} on version {current_version.version_number}.'
        )

        ds.row_count = len(new_rows)
        ds.column_count = len(new_cols)
        ds.current_version_number = new_version_num
        ds.save()

        return Response(ResearchDatasetSerializer(ds).data, status=status.HTTP_200_OK)


class DatasetRollbackView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        ds = get_object_or_404(ResearchDataset, pk=pk)
        require_project_access(request.user, ds.project, EDIT)
        target_version_num =request.data.get('version_number')
        if not target_version_num:
            return Response({'error': 'Target version_number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        target_ver = ds.versions.filter(version_number=target_version_num).first()
        if not target_ver:
            return Response({'error': f'Version {target_version_num} not found.'}, status=status.HTTP_404_NOT_FOUND)

        ds.current_version_number = int(target_version_num)
        ds.row_count = target_ver.row_count
        ds.column_count = target_ver.column_count
        ds.save()

        return Response(ResearchDatasetSerializer(ds).data, status=status.HTTP_200_OK)


class RunStatisticalAnalysisView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        dataset_id = request.data.get('dataset_id')
        test_type = request.data.get('test_type', '').upper()
        params = request.data.get('parameters', {})
        label = request.data.get('label', f'{test_type} Analysis')

        if not dataset_id:
            dataset = project.datasets.first()
            if not dataset:
                return Response({'error': 'No dataset found. Please upload a dataset first.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            dataset = get_object_or_404(ResearchDataset, pk=dataset_id, project=project)

        curr_ver = dataset.versions.filter(version_number=dataset.current_version_number).first() or dataset.versions.first()
        stats = curr_ver.summary_statistics if curr_ver else {}
        rows = stats.get('data_payload', [])
        if not rows:
            return Response({'error': 'Current dataset version is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if test_type == 'DESCRIPTIVE':
                col = params.get('column')
                out = StatisticsService.calculate_descriptive_statistics(rows, col)
            elif test_type == 'FREQUENCY':
                col = params.get('column')
                out = StatisticsService.calculate_frequency_distribution(rows, col)
            elif test_type == 'CROSSTAB':
                r_col = params.get('row_column')
                c_col = params.get('col_column')
                out = StatisticsService.calculate_crosstabulation(rows, r_col, c_col)
            elif test_type == 'CRONBACH_ALPHA':
                items = params.get('items', [])
                out = StatisticsService.calculate_cronbach_alpha(rows, items)
            elif test_type == 'PEARSON_CORRELATION':
                v1 = params.get('variable_1')
                v2 = params.get('variable_2')
                out = StatisticsService.calculate_pearson_correlation(rows, v1, v2)
            elif test_type == 'SPEARMAN_CORRELATION':
                v1 = params.get('variable_1')
                v2 = params.get('variable_2')
                out = StatisticsService.calculate_spearman_correlation(rows, v1, v2)
            elif test_type == 'CHI_SQUARE':
                v1 = params.get('variable_1')
                v2 = params.get('variable_2')
                out = StatisticsService.calculate_chi_square(rows, v1, v2)
            elif test_type == 'INDEPENDENT_T_TEST':
                dv = params.get('dv')
                group = params.get('group')
                out = StatisticsService.calculate_independent_t_test(rows, dv, group)
            elif test_type == 'PAIRED_T_TEST':
                pre = params.get('pre')
                post = params.get('post')
                out = StatisticsService.calculate_paired_t_test(rows, pre, post)
            elif test_type == 'ONE_WAY_ANOVA':
                dv = params.get('dv')
                group = params.get('group')
                out = StatisticsService.calculate_one_way_anova(rows, dv, group)
            elif test_type == 'MANN_WHITNEY_U':
                dv = params.get('dv')
                group = params.get('group')
                out = StatisticsService.calculate_mann_whitney_u(rows, dv, group)
            elif test_type == 'LINEAR_REGRESSION':
                dv = params.get('dv')
                ivs = params.get('ivs', [])
                out = StatisticsService.calculate_linear_regression(rows, dv, ivs)
            elif test_type == 'LOGISTIC_REGRESSION':
                dv = params.get('dv')
                ivs = params.get('ivs', [])
                out = StatisticsService.calculate_logistic_regression(rows, dv, ivs)
            else:
                return Response({'error': f'Unsupported statistical test {test_type}'}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({'error': f'Statistical calculation error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        job = AnalysisJob.objects.create(
            project=project,
            dataset=dataset,
            user=request.user,
            analysis_type=test_type,
            parameters=params,
            status='COMPLETED',
            completed_at=timezone.now()
        )

        p_val = out.get('p_value', out.get('f_p_value'))
        eff = out.get('r_squared') or out.get('cohens_d') or out.get('eta_squared') or out.get('cramers_v')

        stat_result = StatisticalResult.objects.create(
            job=job,
            project=project,
            dataset=dataset,
            analysis_type=test_type,
            sample_size=out.get('sample_size', dataset.row_count),
            metrics=out,
            p_values={'p_value': p_val} if p_val is not None else {},
            effect_sizes={'effect_size': eff} if eff is not None else {}
        )

        return Response(StatisticalResultSerializer(stat_result).data, status=status.HTTP_201_CREATED)


class ProjectStatisticalResultsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        results = project.statistical_results.all().order_by('-created_at')
        return Response(StatisticalResultSerializer(results, many=True).data, status=status.HTTP_200_OK)


class StatisticalResultDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        res = get_object_or_404(StatisticalResult, pk=pk)
        require_project_access(request.user, res.project, VIEW)
        return Response(StatisticalResultSerializer(res).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        res = get_object_or_404(StatisticalResult, pk=pk)
        require_project_access(request.user, res.project, EDIT)
        res.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EvaluateHypothesisView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        hyp_statement = request.data.get('hypothesis_statement', '')
        hyp_type = request.data.get('hypothesis_type', 'DIRECTIONAL')
        result_id = request.data.get('statistical_result_id')

        if not hyp_statement or not result_id:
            return Response({'error': 'Both hypothesis_statement and statistical_result_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        stat_result = get_object_or_404(StatisticalResult, pk=result_id, project=project)

        evaluation = HypothesisService.evaluate_hypothesis(
            hypothesis_statement=hyp_statement,
            hypothesis_type=hyp_type,
            test_type=stat_result.analysis_type,
            statistical_result_data=stat_result.metrics
        )

        hyp_test = HypothesisTest.objects.create(
            project=project,
            statistical_result=stat_result,
            hypothesis_text=hyp_statement,
            test_type=stat_result.analysis_type,
            decision=evaluation['decision'],
            test_statistic_value=evaluation.get('test_statistic'),
            p_value=evaluation.get('p_value'),
            effect_size=str(evaluation.get('effect_size') or ''),
            substantive_interpretation=evaluation.get('substantive_interpretation', ''),
            is_approved=True
        )

        return Response(HypothesisTestSerializer(hyp_test).data, status=status.HTTP_201_CREATED)


class ProjectHypothesisTestsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        tests = project.hypothesis_tests.all().order_by('-created_at')
        return Response(HypothesisTestSerializer(tests, many=True).data, status=status.HTTP_200_OK)


class ProjectTranscriptsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        transcripts = project.qualitative_transcripts.all().order_by('-created_at')
        return Response(QualitativeTranscriptSerializer(transcripts, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        title = request.data.get('title', 'Transcript')
        content = request.data.get('content', '')
        pseudonym = request.data.get('participant_identifier', request.data.get('participant_pseudonym', 'Participant'))
        t_type = request.data.get('transcript_type', 'INTERVIEW')

        t = QualitativeTranscript.objects.create(
            project=project,
            user=request.user,
            title=title,
            content=content,
            participant_pseudonym=pseudonym,
            transcript_type=t_type,
            word_count=len(content.split())
        )
        return Response(QualitativeTranscriptSerializer(t).data, status=status.HTTP_201_CREATED)


class TranscriptDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        t = get_object_or_404(QualitativeTranscript, pk=pk)
        require_project_access(request.user, t.project, VIEW)
        return Response(QualitativeTranscriptSerializer(t).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        t = get_object_or_404(QualitativeTranscript, pk=pk)
        require_project_access(request.user, t.project, EDIT)
        if 'title' in request.data:
            t.title = request.data['title']
        if 'content' in request.data:
            t.content = request.data['content']
            t.word_count = len(t.content.split())
        t.save()
        return Response(QualitativeTranscriptSerializer(t).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        t = get_object_or_404(QualitativeTranscript, pk=pk)
        require_project_access(request.user, t.project, EDIT)
        t.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectQualitativeCodesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        codes = project.qualitative_codes.all().order_by('name')
        return Response(QualitativeCodeSerializer(codes, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        name = request.data.get('name', 'Code')
        desc = request.data.get('description', '')
        color = request.data.get('color', '#2563EB')
        code = QualitativeCode.objects.create(
            project=project,
            name=name,
            description=desc,
            color=color,
            is_approved=True
        )
        return Response(QualitativeCodeSerializer(code).data, status=status.HTTP_201_CREATED)


class QualitativeCodeDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        c = get_object_or_404(QualitativeCode, pk=pk)
        require_project_access(request.user, c.project, EDIT)
        if 'name' in request.data:
            c.name = request.data['name']
        if 'description' in request.data:
            c.description = request.data['description']
        if 'color' in request.data:
            c.color = request.data['color']
        c.save()
        return Response(QualitativeCodeSerializer(c).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        c = get_object_or_404(QualitativeCode, pk=pk)
        require_project_access(request.user, c.project, EDIT)
        c.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuggestCandidateCodesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        t = get_object_or_404(QualitativeTranscript, pk=pk)
        require_project_access(request.user, t.project, EDIT)
        discipline = t.project.discipline.name if t.project.discipline else 'Social Sciences'
        candidates = QualitativeService.suggest_candidate_codes(t.content, discipline)
        return Response({'candidate_codes': candidates}, status=status.HTTP_200_OK)


class TagExcerptView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        t = get_object_or_404(QualitativeTranscript, pk=pk)
        require_project_access(request.user, t.project, EDIT)
        code_id = request.data.get('code_id')
        start_char = int(request.data.get('start_char', 0))
        end_char = int(request.data.get('end_char', 0))
        quote_text = request.data.get('quote_text', '')
        memo = request.data.get('memo', '')

        code = get_object_or_404(QualitativeCode, pk=code_id, project=t.project)

        try:
            verified = QualitativeService.verify_and_create_excerpt(
                transcript_content=t.content,
                start_char=start_char,
                end_char=end_char,
                quote_text=quote_text
            )
        except Exception as e:
            return Response({'error': f'Quotation verification failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        excerpt = EvidenceExcerpt.objects.create(
            project=t.project,
            transcript=t,
            code=code,
            quote_text=verified['quote_text'],
            start_char=start_char,
            end_char=end_char,
            researcher_memo=memo
        )

        return Response(EvidenceExcerptSerializer(excerpt).data, status=status.HTTP_201_CREATED)


class ProjectQualitativeThemesView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        themes = project.qualitative_themes.all().order_by('-created_at')
        return Response(QualitativeThemeSerializer(themes, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        title = request.data.get('name', request.data.get('title', 'Qualitative Theme'))
        desc = request.data.get('description', '')
        summary = request.data.get('narrative_summary', '')
        code_ids = request.data.get('code_ids', [])

        theme = QualitativeTheme.objects.create(
            project=project,
            title=title,
            description=desc,
            summary_narrative=summary,
            is_approved=True
        )
        if code_ids:
            codes = QualitativeCode.objects.filter(id__in=code_ids, project=project)
            theme.codes.set(codes)

        return Response(QualitativeThemeSerializer(theme).data, status=status.HTTP_201_CREATED)


class ProjectVisualizationsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        vis = project.visualizations.all().order_by('-created_at')
        return Response(ResearchVisualizationSerializer(vis, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        data = request.data.copy()
        data['project'] = str(project.id)
        serializer = ResearchVisualizationSerializer(data=data)
        if serializer.is_valid():
            v = serializer.save()
            return Response(ResearchVisualizationSerializer(v).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VisualizationDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        v = get_object_or_404(ResearchVisualization, pk=pk)
        require_project_access(request.user, v.project, VIEW)
        return Response(ResearchVisualizationSerializer(v).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        v = get_object_or_404(ResearchVisualization, pk=pk)
        require_project_access(request.user, v.project, EDIT)
        v.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResultsInterpretationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        task_type = request.data.get('task_type')
        user_prompt = request.data.get('prompt', '')

        stat_results = [
            {
                'test_name': r.analysis_type,
                'test_type': r.analysis_type,
                'output_data': r.metrics
            }
            for r in project.statistical_results.all()
        ]

        qual_themes = [
            {
                'name': t.title,
                'description': t.description,
                'excerpts': []
            }
            for t in project.qualitative_themes.all()
        ]

        lit_sources = [
            {
                'title': ps.source.title,
                'authors': ps.source.authors,
                'year': ps.source.publication_year
            }
            for ps in project.project_sources.all()
        ]

        project_ctx = {
            'title': project.title,
            'discipline': project.discipline.name if project.discipline else 'Academic Research',
            'document_category': project.document_category
        }

        try:
            result = InterpretationService.execute_interpretation_task(
                task_type=task_type,
                project_context=project_ctx,
                statistical_results=stat_results,
                qualitative_themes=qual_themes,
                literature_sources=lit_sources,
                user_prompt=user_prompt
            )
        except Exception as e:
            return Response({'error': f'Interpretation failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        if result.get('refusal'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)

# ============================================================================
# STAGE 5: WORKFLOW, PLANNING, ASSEMBLY, ALIGNMENT & QUALITY ASSURANCE VIEWS
# ============================================================================

class ResearchWorkflowView(views.APIView):
    """Retrieves and computes dynamic 12-stage research workflow progress."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        progress = WorkflowService.calculate_project_progress(project)
        return Response(progress, status=status.HTTP_200_OK)


class WorkflowStepUpdateView(views.APIView):
    """Updates status or progress of a specific workflow step."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, step_id):
        step = get_object_or_404(WorkflowStep, pk=step_id)
        # Check permissions on parent project
        project = step.workflow.project
        require_project_access(request.user, project, EDIT)

        new_status = request.data.get('status')
        if new_status:
            if new_status not in [c[0] for c in WorkflowStep.STATUS_CHOICES]:
                return Response({'error': f'Invalid status: {new_status}'}, status=status.HTTP_400_BAD_REQUEST)
            if new_status == 'APPROVED':
                require_project_access(request.user, project, APPROVE)
            step.status = new_status
            if new_status == 'COMPLETED':
                step.progress_percentage = 100.0
                step.completed_at = timezone.now()
            elif new_status == 'APPROVED':
                step.approved_by = request.user

        progress = request.data.get('progress_percentage')
        if progress is not None:
            step.progress_percentage = max(0.0, min(100.0, float(progress)))

        step.save()
        return Response(WorkflowStepSerializer(step).data, status=status.HTTP_200_OK)


class ResearchDecisionView(views.APIView):
    """Retrieves and updates structured research planning decisions."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        decision = PlanningService.get_or_create_decision(project)
        return Response(ResearchDecisionSerializer(decision).data, status=status.HTTP_200_OK)

    def put(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        decision = PlanningService.update_decision(project, request.data, request.user)
        return Response(ResearchDecisionSerializer(decision).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        if 'title' in request.data:
            cat = request.data.get('decision_type', request.data.get('category', 'RESEARCH_OBJECTIVE'))
            title = request.data.get('title', '')
            rationale = request.data.get('rationalization', request.data.get('rationale', ''))
            statement = request.data.get('statement', request.data.get('impact', ''))
            decision = PlanningService.create_decision(
                project=project,
                user=request.user,
                decision_category=cat,
                title=title,
                rationale=rationale,
                impact_description=statement
            )
            return Response({
                'id': str(decision.id),
                'decision_type': cat,
                'title': title,
                'statement': statement,
                'rationalization': rationale,
                'is_approved': decision.is_approved,
                'created_at': timezone.now().isoformat(),
            }, status=status.HTTP_201_CREATED)
        return self.put(request, project_id)


class ResearchDecisionApproveView(views.APIView):
    """Formally approves research plan, enforcing explicit research governance gate."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': APPROVE}

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        try:
            res = PlanningService.approve_decision(project, request.user)
            if isinstance(res, ResearchDecision):
                return Response(ResearchDecisionSerializer(res).data, status=status.HTTP_200_OK)
            return Response(res, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ResearchAlignmentView(views.APIView):
    """Evaluates alignment across 13 dimensions, returns score, issues, and grid."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        result = AlignmentService.evaluate_project_alignment(project)
        return Response(result, status=status.HTTP_200_OK)


class ManuscriptAssemblyView(views.APIView):
    """Lists compiled manuscript assemblies and triggers new full assembly."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        assemblies = project.assemblies.all().order_by('-created_at')
        return Response(ManuscriptAssemblySerializer(assemblies, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        assembly = AssemblyService.assemble_manuscript(project, request.user, request.data)
        return Response(ManuscriptAssemblySerializer(assembly).data, status=status.HTTP_201_CREATED)


class ManuscriptAssemblyDetailView(views.APIView):
    """Retrieves full compiled HTML and structure manifest for a manuscript assembly."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, assembly_id):
        assembly = get_object_or_404(ManuscriptAssembly, pk=assembly_id)
        require_project_access(request.user, assembly.project, VIEW)
        return Response(ManuscriptAssemblySerializer(assembly).data, status=status.HTTP_200_OK)


class ManuscriptValidationView(views.APIView):
    """Runs or retrieves academic document checker audit across 6 categories."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        latest = project.validations.order_by('-created_at').first()
        if not latest:
            # Run audit on demand if none exists
            report = QualityAssuranceService.audit_manuscript(project)
            return Response(report, status=status.HTTP_200_OK)
        return Response(ManuscriptValidationSerializer(latest).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        report = QualityAssuranceService.audit_manuscript(project)
        return Response(report, status=status.HTTP_200_OK)


class AIReviewAssistantView(views.APIView):
    """Executes 10 bounded AI academic review tasks with zero-hallucination guard."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        task_type = request.data.get('task_type')
        section_id = request.data.get('section_id')
        user_prompt = request.data.get('prompt') or request.data.get('user_prompt') or ''

        try:
            result = ReviewService.execute_review_task(
                project=project,
                task_type=task_type,
                section_id=section_id,
                user_prompt=user_prompt
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Review task failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if result.get('refusal'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class DataProvenanceView(views.APIView):
    """Audits data provenance, links tables to datasets, and flags stale sections."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        report = ProvenanceService.audit_project_provenance(project)
        return Response(report, status=status.HTTP_200_OK)


class ReviewRecordView(views.APIView):
    """Manages formal internal review status checkpoints and reviewer comments."""
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}
    # Sign-off outcomes are reserved for owners and supervisors.
    APPROVAL_STATUSES = ('REVISIONS_REQUIRED', 'APPROVED_DRAFT')

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        reviews = project.reviews.all().order_by('-created_at')
        return Response(ReviewRecordSerializer(reviews, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        new_status = request.data.get('status', request.data.get('review_stage', 'DRAFT'))
        if new_status not in [c[0] for c in ReviewRecord.STATUS_CHOICES]:
            new_status = 'DRAFT'
        if new_status in self.APPROVAL_STATUSES:
            require_project_access(request.user, project, APPROVE)

        checklist = dict(request.data.get('review_checklist', request.data.get('checklist_results', {})) or {})
        if 'reviewer_name' in request.data:
            checklist['reviewer_name'] = request.data['reviewer_name']

        review = ReviewRecord.objects.create(
            project=project,
            reviewer=request.user,
            status=new_status,
            comments=request.data.get('comments', request.data.get('feedback', '')),
            review_checklist=checklist,
            action_items=request.data.get('action_items', []),
        )
        return Response(ReviewRecordSerializer(review).data, status=status.HTTP_201_CREATED)


# ==============================================================================
# STAGE 6: ACADEMIC COLLABORATION & SUPERVISOR REVIEW VIEWS
# ==============================================================================

class ProjectCollaboratorsView(views.APIView):
    """
    Lists active collaborators or invites a new collaborator.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': MANAGE}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        collaborators = ProjectCollaborator.objects.filter(project=project, is_active=True).select_related('user')
        invitations = ProjectInvitation.objects.filter(project=project, status=InvitationStatus.PENDING).select_related('invited_by')
        return Response({
            'collaborators': ProjectCollaboratorSerializer(collaborators, many=True).data,
            'pending_invitations': ProjectInvitationSerializer(invitations, many=True).data,
            'current_user_role': CollaborationService.get_user_role(project, request.user),
        }, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        email = request.data.get('email') or request.data.get('invitee_email')
        role = request.data.get('role', CollaboratorRole.VIEWER)
        assigned_sections = request.data.get('assigned_sections', [])

        if not email:
            return Response({'error': 'Email address is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invitation = CollaborationService.invite_collaborator(
                project=project,
                invited_by=request.user,
                invitee_email=email,
                role=role,
                assigned_sections=assigned_sections,
            )
            data = ProjectInvitationSerializer(invitation).data
            data['email_sent'] = bool(getattr(invitation, 'email_sent', False))
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CollaboratorDetailView(views.APIView):
    """
    Updates role/sections or removes a collaborator from the project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'PATCH': MANAGE, 'DELETE': MANAGE}

    def patch(self, request, project_id, collaborator_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        new_role = request.data.get('role')
        assigned_sections = request.data.get('assigned_sections')

        try:
            collab = CollaborationService.update_collaborator_role(
                project=project,
                collaborator_id=collaborator_id,
                new_role=new_role,
                assigned_sections=assigned_sections,
                actor=request.user,
            )
            return Response(ProjectCollaboratorSerializer(collab).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, project_id, collaborator_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        try:
            CollaborationService.remove_collaborator(
                project=project,
                collaborator_id=collaborator_id,
                actor=request.user,
            )
            return Response({'message': 'Collaborator removed successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def _invitation_summary(invitation):
    inviter = invitation.invited_by
    owner = invitation.project.owner
    return {
        'token': invitation.token,
        'project_id': str(invitation.project_id),
        'project_title': invitation.project.title,
        'project_owner_name': (owner.get_full_name() or owner.email) if owner else '',
        'invited_by_name': (inviter.get_full_name() or inviter.email) if inviter else '',
        'invitee_email': invitation.invitee_email,
        'role': invitation.role,
        'role_label': invitation.get_role_display(),
        'assigned_sections_count': len(invitation.assigned_sections or []),
        'status': invitation.status,
        'is_expired': invitation.is_expired,
        'expires_at': invitation.expires_at,
        'created_at': invitation.created_at,
    }


class MyInvitationsView(views.APIView):
    """
    Lists pending, unexpired project invitations addressed to the signed-in user's email.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        invitations = (
            ProjectInvitation.objects
            .select_related('project', 'project__owner', 'invited_by')
            .filter(
                invitee_email__iexact=request.user.email,
                status=InvitationStatus.PENDING,
                expires_at__gt=timezone.now(),
            )
            .order_by('-created_at')
        )
        return Response([_invitation_summary(inv) for inv in invitations], status=status.HTTP_200_OK)


class InvitationDetailView(views.APIView):
    """
    Shows a single invitation to its addressee so they can decide whether to accept it.
    Tokens addressed to someone else return the same 404 as unknown tokens.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, token):
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            invitation = CollaborationService.get_invitation_for_user(token=token, user=request.user)
        except DjangoValidationError:
            return Response({'error': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(_invitation_summary(invitation), status=status.HTTP_200_OK)


class ProjectInvitationActionView(views.APIView):
    """
    Accepts or rejects a collaborator invitation token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token, action):
        action = action.lower()
        try:
            if action == 'accept':
                collab = CollaborationService.accept_invitation(token=token, user=request.user)
                return Response({
                    'message': 'Invitation accepted.',
                    'collaborator': ProjectCollaboratorSerializer(collab).data
                }, status=status.HTTP_200_OK)
            elif action == 'reject':
                invitation = CollaborationService.reject_invitation(token=token, user=request.user)
                return Response({'message': 'Invitation rejected.'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': f"Invalid action '{action}'. Use accept or reject."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProjectInvitationRevokeView(views.APIView):
    """
    Revokes a pending project invitation.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'DELETE': MANAGE}

    def delete(self, request, project_id, invitation_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        if not ProjectInvitation.objects.filter(pk=invitation_id, project=project).exists():
            return Response({'error': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            CollaborationService.revoke_invitation(invitation_id=invitation_id, actor=request.user)
            return Response({'message': 'Invitation revoked.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProjectCollaborationAuditView(views.APIView):
    """
    Lists collaboration audit trail events for a project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        events = CollaborationAuditEvent.objects.filter(project=project).order_by('-timestamp')[:100]
        return Response(CollaborationAuditEventSerializer(events, many=True).data, status=status.HTTP_200_OK)


class ManuscriptCommentsView(views.APIView):
    """
    Retrieves or creates inline manuscript comments with anchor metadata.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        qs = ManuscriptComment.objects.filter(project=project).select_related('author', 'section').prefetch_related('replies', 'replies__author').order_by('created_at')

        doc_id = request.query_params.get('document_id')
        if doc_id:
            qs = qs.filter(document_id=doc_id)
        section_id = request.query_params.get('section_id')
        if section_id:
            qs = qs.filter(section_id=section_id)
        comment_status = request.query_params.get('status')
        if comment_status:
            qs = qs.filter(status=comment_status)

        return Response(ManuscriptCommentSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        document_id = request.data.get('document_id')
        section_id = request.data.get('section_id')
        content = request.data.get('content')
        anchor_text = request.data.get('anchor_text', '')
        anchor_prefix = request.data.get('anchor_prefix', '')
        anchor_suffix = request.data.get('anchor_suffix', '')
        start_offset = request.data.get('start_offset')
        end_offset = request.data.get('end_offset')

        document = ResearchDocument.objects.filter(pk=document_id, project=project).first() if document_id else None
        section = DocumentSection.objects.filter(pk=section_id, document__project=project).first() if section_id else None
        if section is not None:
            require_section_access(request.user, section, COMMENT)

        try:
            comment = CommentService.create_comment(
                project=project,
                author=request.user,
                content=content,
                document=document,
                section=section,
                anchor_text=anchor_text,
                anchor_prefix=anchor_prefix,
                anchor_suffix=anchor_suffix,
                start_offset=start_offset,
                end_offset=end_offset,
            )
            return Response(ManuscriptCommentSerializer(comment).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CommentReplyView(views.APIView):
    """
    Appends a reply to an existing manuscript comment thread.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(ManuscriptComment, pk=comment_id)
        require_project_access(request.user, comment.project, COMMENT)
        if comment.section_id:
            require_section_access(request.user, comment.section, COMMENT)
        content = request.data.get('content')
        try:
            reply = CommentService.add_reply(comment=comment, author=request.user, content=content)
            return Response(CommentReplySerializer(reply).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CommentStatusView(views.APIView):
    """
    Updates the status of a manuscript comment (OPEN, RESOLVED, REOPENED).
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, comment_id):
        comment = get_object_or_404(ManuscriptComment, pk=comment_id)
        require_project_access(request.user, comment.project, COMMENT)
        if comment.section_id:
            require_section_access(request.user, comment.section, COMMENT)
        new_status = request.data.get('status')
        try:
            updated = CommentService.update_status(comment=comment, new_status=new_status, actor=request.user)
            return Response(ManuscriptCommentSerializer(updated).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentRecalculateAnchorsView(views.APIView):
    """
    Recalibrates comment offsets against current document text and flags orphaned comments.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        require_project_access(request.user, document.project, EDIT)
        current_text = request.data.get('content', document.content or '')
        result = CommentService.check_and_relocate_anchors(document, current_text)
        return Response(result, status=status.HTTP_200_OK)


class SupervisorFeedbackView(views.APIView):
    """
    Lists or ingests supervisor feedback from manual text, DOCX, PDF, or inline threads.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        feedback_list = SupervisorFeedback.objects.filter(project=project).order_by('-created_at')
        return Response(SupervisorFeedbackSerializer(feedback_list, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        source_type = request.data.get('source_type', FeedbackSourceType.MANUAL)
        raw_content = request.data.get('raw_content', '')
        file_obj = request.FILES.get('file_attachment')

        try:
            feedback = SupervisorFeedbackService.ingest_feedback(
                project=project,
                user=request.user,
                source_type=source_type,
                raw_content=raw_content,
                file_attachment=file_obj,
            )
            return Response(SupervisorFeedbackSerializer(feedback).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SupervisorFeedbackAnalyzeView(views.APIView):
    """
    Performs AI correction analysis on ingested supervisor feedback,
    categorizing into 15 disciplines, detecting conflicts, and generating CorrectionTasks.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def post(self, request, feedback_id):
        feedback = get_object_or_404(SupervisorFeedback, pk=feedback_id)
        self.check_object_permissions(request, feedback.project)
        auto_create = request.data.get('auto_create_tasks', True)

        try:
            report = CorrectionService.analyze_feedback(
                feedback=feedback,
                actor=request.user,
                auto_create_tasks=auto_create,
            )
            # Serialize created tasks
            report['tasks'] = CorrectionTaskSerializer(report['tasks'], many=True).data
            return Response(report, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CorrectionTasksView(views.APIView):
    """
    Lists or manually creates revision correction tasks.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        qs = CorrectionTask.objects.filter(project=project).select_related('section').order_by('-created_at')

        task_status = request.query_params.get('status')
        if task_status:
            qs = qs.filter(status=task_status)
        category = request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        priority = request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)
        section_id = request.query_params.get('section_id')
        if section_id:
            qs = qs.filter(section_id=section_id)

        return Response(CorrectionTaskSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        section_id = request.data.get('section_id')
        section = DocumentSection.objects.filter(pk=section_id, document__project=project).first() if section_id else None
        if section is not None:
            require_section_access(request.user, section, COMMENT)
        doc_version =section.document.current_version_number if section and section.document else 1

        task = CorrectionTask.objects.create(
            project=project,
            section=section,
            category=request.data.get('category', CorrectionCategory.ACADEMIC_TONE),
            priority=request.data.get('priority', 'MEDIUM'),
            status=CorrectionTaskStatus.OPEN,
            supervisor_instruction=request.data.get('supervisor_instruction', ''),
            original_text=request.data.get('original_text', ''),
            proposed_text=request.data.get('proposed_text', ''),
            expected_base_version=doc_version,
        )
        return Response(CorrectionTaskSerializer(task).data, status=status.HTTP_201_CREATED)


class CorrectionTaskApplyView(views.APIView):
    """
    Applies proposed correction text with optimistic concurrency verification
    and automated snapshot versioning.
    """
    permission_classes = [permissions.IsAuthenticated, CanEditProjectManuscript]

    def post(self, request, task_id):
        task = get_object_or_404(CorrectionTask, pk=task_id)
        self.check_object_permissions(request, task.project)
        if task.section_id:
            require_section_access(request.user, task.section, EDIT)
        else:
            require_full_manuscript_access(request.user, task.project, EDIT)
        new_content = request.data.get('content')
        force = request.data.get('force_override', False)

        try:
            result = CorrectionService.apply_correction(
                task=task,
                actor=request.user,
                new_content=new_content,
                force_override=force,
            )
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CorrectionTaskReviewView(views.APIView):
    """
    Approves, rejects, resolves, or reopens a correction task.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectSupervisorOrOwner]

    def post(self, request, task_id):
        task = get_object_or_404(CorrectionTask, pk=task_id)
        self.check_object_permissions(request, task.project)
        decision = request.data.get('decision', 'APPROVE')
        notes = request.data.get('notes', '')

        try:
            updated = CorrectionService.review_task(
                task=task,
                actor=request.user,
                decision=decision,
                notes=notes,
            )
            return Response(CorrectionTaskSerializer(updated).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentDiffView(views.APIView):
    """
    Calculates high-precision word and paragraph diffs between two document versions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        require_project_access(request.user, document.project, VIEW)
        curr_v = getattr(document, 'current_version_number', 1)
        base_v = int(request.query_params.get('base_version', max(1, curr_v - 1)))
        target_v = int(request.query_params.get('target_version', curr_v))

        try:
            diff_result = RevisionDiffService.compare_versions(
                document=document,
                base_version_number=base_v,
                target_version_number=target_v,
            )
            return Response(diff_result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DocumentVersionRestoreView(views.APIView):
    """
    Safely restores a previous version by creating a new version snapshot.
    """
    permission_classes = [permissions.IsAuthenticated, CanEditProjectManuscript]

    def post(self, request, document_id):
        document = get_object_or_404(ResearchDocument, pk=document_id)
        self.check_object_permissions(request, document.project)
        require_full_manuscript_access(request.user, document.project, EDIT)
        target_version = request.data.get('target_version_number')

        if not target_version:
            return Response({'error': 'target_version_number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            res = RevisionDiffService.restore_version_safely(
                document=document,
                target_version_number=int(target_version),
                actor=request.user,
            )
            return Response(res, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class JournalReviewMatrixView(views.APIView):
    """
    Lists or creates point-by-point journal reviewer response matrix items.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        items = JournalReviewerResponse.objects.filter(project=project).select_related('target_section', 'linked_correction_task').order_by('reviewer_label', 'comment_number')
        return Response(JournalReviewerResponseSerializer(items, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        reviewer_label = request.data.get('reviewer_label', 'Reviewer 1')
        comment_number = int(request.data.get('comment_number', 1))
        original_comment = request.data.get('original_comment', '')
        revision_category = request.data.get('revision_category', RevisionCategory.MINOR)
        target_section_id = request.data.get('target_section_id')
        linked_task_id = request.data.get('linked_correction_task_id')
        author_response = request.data.get('author_response', '')

        target_section = DocumentSection.objects.filter(pk=target_section_id, document__project=project).first() if target_section_id else None
        linked_task = CorrectionTask.objects.filter(pk=linked_task_id, project=project).first() if linked_task_id else None

        try:
            item = JournalReviewService.create_response_item(
                project=project,
                reviewer_label=reviewer_label,
                comment_number=comment_number,
                original_comment=original_comment,
                revision_category=revision_category,
                target_section=target_section,
                linked_correction_task=linked_task,
                author_response=author_response,
                actor=request.user,
            )
            return Response(JournalReviewerResponseSerializer(item).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class JournalReviewDetailView(views.APIView):
    """
    Updates author response, revision category, and checks verified applied status.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def patch(self, request, response_id):
        item = get_object_or_404(JournalReviewerResponse, pk=response_id)
        self.check_object_permissions(request, item.project)

        author_response = request.data.get('author_response', item.author_response)
        revision_category = request.data.get('revision_category')
        target_section_id = request.data.get('target_section_id')
        linked_task_id = request.data.get('linked_correction_task_id')

        target_section = DocumentSection.objects.filter(pk=target_section_id, document__project=item.project).first() if target_section_id else None
        linked_task = CorrectionTask.objects.filter(pk=linked_task_id, project=item.project).first() if linked_task_id else None

        try:
            updated = JournalReviewService.update_author_response(
                response_item=item,
                author_response=author_response,
                revision_category=revision_category,
                target_section=target_section,
                linked_correction_task=linked_task,
                actor=request.user,
            )
            return Response(JournalReviewerResponseSerializer(updated).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class JournalReviewMatrixDocumentView(views.APIView):
    """
    Generates a structured, formatted markdown document of the response matrix.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        doc = JournalReviewService.generate_response_matrix_document(project)
        return Response(doc, status=status.HTTP_200_OK)


class SupervisorProjectsOverviewView(views.APIView):
    """
    Overview of all academic projects supervised or reviewed by the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        overview = JournalReviewService.get_supervisor_overview(request.user)
        return Response(overview, status=status.HTTP_200_OK)


# ==============================================================================
# STAGE 7: UNIVERSITY ACADEMIC FORMATTING & COMPLIANCE VIEWS
# ==============================================================================
from research.institutional_template_service import InstitutionalTemplateService
from research.preliminary_pages_service import PreliminaryPagesService
from research.guideline_ingestion_service import GuidelineIngestionService
from research.compliance_engine import ComplianceEngine
from research.safe_autoformat_service import SafeAutoformatService
from research.journal_publication_service import JournalPublicationService
from research.models import (
    AcademicInstitution,
    AcademicFaculty,
    AcademicDepartment,
    FormattingTemplate,
    TemplateVersion,
    TemplateGuidelineSource,
    JournalProfile,
    ManuscriptMetadata,
    ProjectTemplateAssignment,
    FormattingValidation,
    FormattingIssue,
    FormattingChange,
)
from research.serializers import (
    AcademicInstitutionSerializer,
    AcademicFacultySerializer,
    AcademicDepartmentSerializer,
    FormattingTemplateSerializer,
    TemplateVersionSerializer,
    TemplateGuidelineSourceSerializer,
    JournalProfileSerializer,
    ManuscriptMetadataSerializer,
    ProjectTemplateAssignmentSerializer,
    FormattingValidationSerializer,
    FormattingIssueSerializer,
    FormattingChangeSerializer,
)


class InstitutionListView(views.APIView):
    """
    Lists all supported academic institutions with hierarchical filtering, or creates one.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = AcademicInstitution.objects.all().prefetch_related('faculties', 'faculties__departments')
        country = request.query_params.get('country')
        if country:
            qs = qs.filter(country__iexact=country.strip())
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search.strip())
        is_verified = request.query_params.get('is_verified')
        if is_verified is not None:
            qs = qs.filter(is_verified=is_verified.lower() in ('true', '1'))

        return Response(AcademicInstitutionSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name')
        country = request.data.get('country', 'United States')
        code = request.data.get('code', '')
        website = request.data.get('website', '')
        if not name:
            return Response({'error': 'Institution name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        inst = InstitutionalTemplateService.get_or_create_institution(
            name=name,
            country=country,
            code=code,
            website=website,
            is_verified=False,
        )
        return Response(AcademicInstitutionSerializer(inst).data, status=status.HTTP_201_CREATED)


class DepartmentListView(views.APIView):
    """
    Lists departments within a faculty or institution.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = AcademicDepartment.objects.all().select_related('faculty', 'faculty__institution')
        faculty_id = request.query_params.get('faculty_id')
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        institution_id = request.query_params.get('institution_id')
        if institution_id:
            qs = qs.filter(faculty__institution_id=institution_id)

        return Response(AcademicDepartmentSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class FormattingTemplateListView(views.APIView):
    """
    Hierarchical resolution of institutional, journal, or disciplinary formatting templates.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        country = request.query_params.get('country')
        institution_id = request.query_params.get('institution_id')
        department_id = request.query_params.get('department_id')
        degree_level = request.query_params.get('degree_level')
        document_type = request.query_params.get('document_type')
        template_type = request.query_params.get('template_type')
        include_drafts = request.query_params.get('include_drafts', 'false').lower() in ('true', '1')

        templates = InstitutionalTemplateService.resolve_template_hierarchy(
            country=country,
            institution_id=institution_id,
            department_id=department_id,
            degree_level=degree_level,
            document_type=document_type,
            template_type=template_type,
            include_drafts=include_drafts,
        )
        return Response(FormattingTemplateSerializer(templates, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Template name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        inst_id = request.data.get('institution_id')
        dept_id = request.data.get('department_id')
        institution = AcademicInstitution.objects.filter(pk=inst_id).first() if inst_id else None
        department = AcademicDepartment.objects.filter(pk=dept_id).first() if dept_id else None

        verification_status = request.data.get('verification_status', 'DRAFT')
        verification_source_url = request.data.get('verification_source_url', '')

        try:
            template = InstitutionalTemplateService.create_template(
                name=name,
                template_type=request.data.get('template_type', 'CUSTOM'),
                institution=institution,
                department=department,
                degree_level=request.data.get('degree_level', 'GENERAL'),
                document_type=request.data.get('document_type', 'GENERAL'),
                verification_status=verification_status,
                verification_source_url=verification_source_url,
                verification_notes=request.data.get('verification_notes', ''),
                rules_config=request.data.get('rules_config'),
                changelog=request.data.get('changelog', 'Created via API'),
                created_by=request.user,
                is_shared=request.data.get('is_shared', False),
                description=request.data.get('description', ''),
            )
            return Response(FormattingTemplateSerializer(template).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FormattingTemplateDetailView(views.APIView):
    """
    Retrieves, updates, or adds a new version to an academic formatting template.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        template = get_object_or_404(FormattingTemplate, pk=pk)
        return Response(FormattingTemplateSerializer(template).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        template = get_object_or_404(FormattingTemplate, pk=pk)
        if template.created_by and template.created_by != request.user and not request.user.is_staff:
            return Response({'error': 'Only the template creator or an administrator can update this template.'}, status=status.HTTP_403_FORBIDDEN)

        rules_config = request.data.get('rules_config')
        changelog = request.data.get('changelog', 'Rules update')

        if rules_config:
            new_version = InstitutionalTemplateService.create_new_version(
                template=template,
                rules_config=rules_config,
                changelog=changelog,
                user=request.user,
            )
            return Response({
                'message': f"Created template version {new_version.version_number}.",
                'template': FormattingTemplateSerializer(template).data,
                'version': TemplateVersionSerializer(new_version).data,
            }, status=status.HTTP_200_OK)

        # Basic metadata updates
        if 'name' in request.data:
            template.name = request.data['name']
        if 'description' in request.data:
            template.description = request.data['description']
        template.save(update_fields=['name', 'description', 'updated_at'])

        return Response(FormattingTemplateSerializer(template).data, status=status.HTTP_200_OK)


class FormattingTemplateCloneView(views.APIView):
    """
    Clones an existing template into a researcher-customized copy.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        template = get_object_or_404(FormattingTemplate, pk=pk)
        custom_name = request.data.get('custom_name')
        clone = InstitutionalTemplateService.clone_template_for_user(
            template=template,
            user=request.user,
            custom_name=custom_name,
        )
        return Response(FormattingTemplateSerializer(clone).data, status=status.HTTP_201_CREATED)


class ProjectTemplateAssignmentView(views.APIView):
    """
    Retrieves or binds an active formatting template and rules version to a project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        assignment = getattr(project, 'template_assignment', None)
        if not assignment:
            return Response({'assignment': None, 'active_rules': InstitutionalTemplateService.get_default_rules_config()}, status=status.HTTP_200_OK)
        return Response({
            'assignment': ProjectTemplateAssignmentSerializer(assignment).data,
            'active_rules': assignment.template_version.rules_config,
        }, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        template_id = request.data.get('template_id')
        version_id = request.data.get('version_id')

        if not template_id:
            return Response({'error': 'template_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        template = get_object_or_404(FormattingTemplate, pk=template_id)
        version = TemplateVersion.objects.filter(pk=version_id, template=template).first() if version_id else None

        try:
            assignment = InstitutionalTemplateService.assign_template_to_project(
                project=project,
                template=template,
                version=version,
                assigned_by=request.user,
            )
            return Response(ProjectTemplateAssignmentSerializer(assignment).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PreliminaryPagesView(views.APIView):
    """
    Generates academic preliminary pages, Table of Contents, Lists of Tables/Figures.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        result = PreliminaryPagesService.generate_preliminary_pages(project)
        return Response(result, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        custom_metadata = request.data.get('custom_metadata', {})
        result = PreliminaryPagesService.generate_preliminary_pages(project, custom_metadata=custom_metadata)
        return Response(result, status=status.HTTP_200_OK)


class GuidelineIngestView(views.APIView):
    """
    Ingests PDF/DOCX or text guidelines, neutralizes prompt-injections, extracts candidate rules.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        title = request.data.get('title', 'Institutional Author Guidelines')
        uploaded_file = request.FILES.get('file')
        raw_text = request.data.get('text')

        try:
            source = GuidelineIngestionService.ingest_guidelines(
                title=title,
                user=request.user,
                file=uploaded_file,
                raw_text=raw_text,
            )
            return Response(TemplateGuidelineSourceSerializer(source).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class GuidelineApproveView(views.APIView):
    """
    Human review gate: approves candidate rules from uploaded guideline, creating versioned template.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, source_id):
        source = get_object_or_404(TemplateGuidelineSource, pk=source_id)
        if source.uploaded_by_id != request.user.id and not request.user.is_staff:
            return Response({'error': 'Only the user who uploaded these guidelines can approve them.'}, status=status.HTTP_403_FORBIDDEN)
        approved_rules = request.data.get('approved_rules')
        if not approved_rules:
            return Response({'error': 'Approved rules configuration is required.'}, status=status.HTTP_400_BAD_REQUEST)

        template_name = request.data.get('template_name')
        institution_id = request.data.get('institution_id')
        degree_level = request.data.get('degree_level', 'GENERAL')
        document_type = request.data.get('document_type', 'GENERAL')

        try:
            template = GuidelineIngestionService.approve_guideline_rules(
                source=source,
                approved_rules=approved_rules,
                user=request.user,
                template_name=template_name,
                institution_id=institution_id,
                degree_level=degree_level,
                document_type=document_type,
            )
            return Response(FormattingTemplateSerializer(template).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ComplianceAuditView(views.APIView):
    """
    Runs or retrieves deterministic compliance audit across 8 rule categories.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        latest = project.formatting_validations.order_by('-validated_at').first()
        if not latest:
            latest = ComplianceEngine.audit_project_compliance(project)
        return Response(FormattingValidationSerializer(latest).data, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        validation = ComplianceEngine.audit_project_compliance(project)
        return Response(FormattingValidationSerializer(validation).data, status=status.HTTP_201_CREATED)


class AutoformatPreviewView(views.APIView):
    """
    Previews candidate safe auto-formatting changes without mutating data.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        proposals = SafeAutoformatService.preview_autoformat_changes(project)
        return Response({'proposed_changes': proposals}, status=status.HTTP_200_OK)


class AutoformatApplyView(views.APIView):
    """
    Creates automated pre-execution snapshot and safely applies non-destructive formatting.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        require_full_manuscript_access(request.user, project, EDIT)
        selected_sections = request.data.get('selected_section_ids')

        result = SafeAutoformatService.apply_autoformat(
            project=project,
            user=request.user,
            selected_section_ids=selected_sections,
        )
        return Response(result, status=status.HTTP_200_OK)


class AutoformatRollbackView(views.APIView):
    """
    Restores document sections to pre-autoformat baseline snapshot.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        require_full_manuscript_access(request.user, project, EDIT)
        snapshot_id = request.data.get('snapshot_id')

        if not snapshot_id:
            return Response({'error': 'snapshot_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = SafeAutoformatService.rollback_autoformat(
            project=project,
            snapshot_id=snapshot_id,
            user=request.user,
        )
        return Response(result, status=status.HTTP_200_OK)


class JournalProfileListView(views.APIView):
    """
    Lists scholarly journal profiles and specifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = JournalProfile.objects.all().order_by('name')
        article_type = request.query_params.get('article_type')
        if article_type:
            qs = qs.filter(article_type=article_type)
        return Response(JournalProfileSerializer(qs, many=True).data, status=status.HTTP_200_OK)


class ManuscriptMetadataView(views.APIView):
    """
    Manages author publication metadata, verified ORCIDs, and mandatory ethics declarations.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        meta, _ = ManuscriptMetadata.objects.get_or_create(project=project)
        return Response(ManuscriptMetadataSerializer(meta).data, status=status.HTTP_200_OK)

    def put(self, request, project_id):
        return self._update_metadata(request, project_id)

    def patch(self, request, project_id):
        return self._update_metadata(request, project_id)

    def _update_metadata(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        meta, _ = ManuscriptMetadata.objects.get_or_create(project=project)

        fields = [
            'running_title', 'corresponding_author_name', 'corresponding_author_email',
            'orcid_identifiers', 'affiliations', 'funding_statement',
            'conflict_of_interest_statement', 'data_availability_statement',
            'ethics_approval_statement', 'author_contributions'
        ]
        for f in fields:
            if f in request.data:
                setattr(meta, f, request.data[f])

        meta.save()
        return Response(ManuscriptMetadataSerializer(meta).data, status=status.HTTP_200_OK)


class SubmissionReadinessView(views.APIView):
    """
    Audits submission readiness against a target journal profile.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)
        journal_id = request.query_params.get('journal_id')
        journal = JournalProfile.objects.filter(pk=journal_id).first() if journal_id else None

        report = JournalPublicationService.audit_submission_readiness(project, journal)
        return Response(report, status=status.HTTP_200_OK)


# =====================================================================
# STAGE 8: Professional Document Export & QA Views
# =====================================================================

class ProjectExportInitiateView(views.APIView):
    """
    Initiates an asynchronous academic document export job (DOCX or PDF).
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]
    project_capabilities = {'POST': COMMENT}

    def post(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        export_format = request.data.get('export_format', 'DOCX')
        template_id = request.data.get('template_id')
        citation_style = request.data.get('citation_style')
        idempotency_key = request.data.get('idempotency_key')
        document_version_id = request.data.get('document_version_id')

        job = ExportJobService.initiate_export_job(
            project=project,
            user=request.user,
            export_format=export_format,
            template_id=template_id,
            citation_style=citation_style,
            idempotency_key=idempotency_key,
            document_version_id=document_version_id,
        )

        return Response(ExportJobSerializer(job).data, status=status.HTTP_201_CREATED)


class ExportJobStatusView(views.APIView):
    """
    Retrieves status, progress, and result artifact for an export job.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, job_id):
        job = get_object_or_404(ExportJob, pk=job_id)
        require_project_access(request.user, job.project, VIEW)

        return Response(ExportJobSerializer(job).data, status=status.HTTP_200_OK)


class ProjectExportListView(views.APIView):
    """
    Lists all exported artifacts generated for a project.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        exports = DocumentExport.objects.filter(project=project).order_by('-created_at')
        return Response(DocumentExportSerializer(exports, many=True).data, status=status.HTTP_200_OK)


class DocumentExportDetailView(views.APIView):
    """
    Retrieves detailed export metadata, QA report, or deletes an export.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, export_id):
        doc_export = get_object_or_404(DocumentExport, pk=export_id)
        require_project_access(request.user, doc_export.project, VIEW)

        return Response(DocumentExportSerializer(doc_export).data, status=status.HTTP_200_OK)

    def delete(self, request, export_id):
        doc_export = get_object_or_404(DocumentExport, pk=export_id)
        require_project_access(request.user, doc_export.project, EDIT)

        # Remove physical file if present
        if doc_export.file_artifact:
            try:
                if os.path.exists(doc_export.file_artifact.path):
                    os.remove(doc_export.file_artifact.path)
            except Exception:
                pass

        doc_export.delete()
        return Response({"detail": "Export artifact deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class DocumentExportDownloadView(views.APIView):
    """
    Securely serves the private exported file artifact to authorized users.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, export_id):
        doc_export = get_object_or_404(DocumentExport, pk=export_id)
        require_project_access(request.user, doc_export.project, VIEW)

        if not doc_export.file_artifact:
            return Response({"detail": "Artifact file not recorded."}, status=status.HTTP_404_NOT_FOUND)

        file_path = doc_export.file_artifact.path
        if not os.path.exists(file_path):
            return Response({"detail": "Artifact file does not exist on disk."}, status=status.HTTP_404_NOT_FOUND)

        content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' if doc_export.export_format == 'DOCX' else 'application/pdf'
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{doc_export.file_name or os.path.basename(file_path)}"'
        return response


class DocumentExportValidationView(views.APIView):
    """
    Triggers on-demand re-validation of export quality assurance (QA).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, export_id):
        doc_export = get_object_or_404(DocumentExport, pk=export_id)
        project = require_project_access(request.user, doc_export.project, COMMENT)

        ir = DocumentIRBuilder.build_ir(
            project=project,
            template=doc_export.template_version.template if doc_export.template_version else None,
            document_version=doc_export.document_version,
            citation_style=doc_export.citation_style,
        )

        validation = ExportQAService.validate_export(doc_export, ir)
        return Response(ExportValidationSerializer(validation).data, status=status.HTTP_200_OK)


class ProjectExportPreviewView(views.APIView):
    """
    Provides a real-time structural document preview and layout metrics
    without initiating a physical binary export job.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectOwnerOrWorkspaceMember]

    def get(self, request, project_id):
        project = get_object_or_404(ResearchProject, pk=project_id)
        self.check_object_permissions(request, project)

        template_id = request.query_params.get('template_id')
        template = FormattingTemplate.objects.filter(pk=template_id).first() if template_id else None

        ir = DocumentIRBuilder.build_ir(
            project=project,
            template=template,
        )

        preview_data = {
            "project_id": str(project.id),
            "title": ir.metadata.title,
            "author": ir.metadata.author_name,
            "institution": ir.metadata.institution_name,
            "degree": ir.metadata.degree_title,
            "citation_style": ir.metadata.citation_style,
            "template_name": ir.metadata.template_name,
            "layout": {
                "paper_size": ir.layout.paper_size,
                "primary_font": ir.layout.primary_font,
                "base_font_size_pt": ir.layout.base_font_size_pt,
                "line_spacing": ir.layout.line_spacing,
                "binding_gutter_inches": ir.layout.binding_gutter_inches,
                "prelim_page_num_format": ir.layout.prelim_page_num_format,
                "main_page_num_format": ir.layout.main_page_num_format,
            },
            "preliminary_pages": [
                {
                    "page_key": p.page_key,
                    "title": p.title,
                    "suppress_page_number": p.suppress_page_number,
                    "paragraphs_count": len(p.paragraphs),
                }
                for p in ir.preliminary_pages
            ],
            "chapters": [
                {
                    "id": s.id,
                    "title": s.title,
                    "order_index": s.order_index,
                    "word_count": s.word_count,
                    "blocks_count": len(s.blocks),
                }
                for s in ir.body_sections
            ],
            "bibliography_count": len(ir.bibliography_entries),
            "estimated_pages": max(1, (ir.total_word_count // 250) + len(ir.preliminary_pages) + 1),
            "total_words": ir.total_word_count,
            "total_tables": ir.total_tables_count,
            "total_figures": ir.total_figures_count,
            "total_equations": ir.total_equations_count,
        }

        return Response(preview_data, status=status.HTTP_200_OK)
