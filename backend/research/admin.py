from django.contrib import admin
from research.models import (
    ResearchSource,
    ProjectSource,
    Citation,
    ResearchCollection,
    ResearchCollectionItem,
    SourceVerification,
    SourceDocument,
    SourceExcerpt,
    LiteratureExtraction,
    LiteratureReviewNote,
    CitationAudit,
    ResearchSearchJob,
    AIJob,
    ResearchMethodology,
    ResearchVariable,
    SamplingPlan,
    ResearchInstrument,
    InstrumentItem,
    ResearchDataset,
    DatasetVersion,
    DataTransformation,
    AnalysisJob,
    StatisticalResult,
    HypothesisTest,
    QualitativeTranscript,
    QualitativeCode,
    EvidenceExcerpt,
    QualitativeTheme,
    ResearchVisualization,
    ResearchWorkflow,
    WorkflowStep,
    ResearchDecision,
    ResearchAlignmentMatrix,
    AlignmentIssue,
    ManuscriptAssembly,
    ManuscriptValidation,
    ValidationIssue,
    ReviewRecord,
    ProjectCollaborator,
    ProjectInvitation,
    ManuscriptComment,
    CommentReply,
    SupervisorFeedback,
    CorrectionTask,
    JournalReviewerResponse,
    CollaborationAuditEvent,
    DocumentExport,
    ExportJob,
    ExportValidation,
    ExportIssue,
    RenderedAsset,
)


@admin.register(ResearchSource)
class ResearchSourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'source_type', 'publication_year', 'verification_status', 'is_open_access', 'retracted', 'created_at')
    list_filter = ('source_type', 'verification_status', 'retracted', 'publication_year')
    search_fields = ('title', 'doi', 'abstract')


@admin.register(ProjectSource)
class ProjectSourceAdmin(admin.ModelAdmin):
    list_display = ('project', 'source', 'relevance_score', 'is_favorite', 'is_read')
    list_filter = ('is_favorite', 'is_read')


@admin.register(Citation)
class CitationAdmin(admin.ModelAdmin):
    list_display = ('project', 'source', 'citation_style', 'in_text_format')
    list_filter = ('citation_style',)


@admin.register(ResearchCollection)
class ResearchCollectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'color', 'created_at')
    search_fields = ('name', 'description')


@admin.register(ResearchCollectionItem)
class ResearchCollectionItemAdmin(admin.ModelAdmin):
    list_display = ('collection', 'source', 'is_favorite', 'is_read', 'added_at')


@admin.register(SourceVerification)
class SourceVerificationAdmin(admin.ModelAdmin):
    list_display = ('source', 'verification_status', 'verified_by_provider', 'retraction_detected', 'verified_at')
    list_filter = ('verification_status', 'verified_by_provider', 'retraction_detected')


@admin.register(SourceDocument)
class SourceDocumentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'file_type', 'extraction_status', 'is_machine_readable', 'user', 'created_at')
    list_filter = ('file_type', 'extraction_status', 'is_machine_readable')


@admin.register(SourceExcerpt)
class SourceExcerptAdmin(admin.ModelAdmin):
    list_display = ('source_document', 'page_number', 'section_heading', 'created_at')


@admin.register(LiteratureExtraction)
class LiteratureExtractionAdmin(admin.ModelAdmin):
    list_display = ('source', 'project', 'extraction_type', 'evidence_basis', 'created_at')
    list_filter = ('extraction_type', 'evidence_basis')


@admin.register(LiteratureReviewNote)
class LiteratureReviewNoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'review_type', 'user', 'updated_at')
    list_filter = ('review_type',)


@admin.register(CitationAudit)
class CitationAuditAdmin(admin.ModelAdmin):
    list_display = ('project', 'uncited_bibliography_count', 'missing_bibliography_count', 'retracted_count', 'audited_at')


@admin.register(ResearchSearchJob)
class ResearchSearchJobAdmin(admin.ModelAdmin):
    list_display = ('query', 'user', 'provider', 'results_count', 'created_at')


@admin.register(AIJob)
class AIJobAdmin(admin.ModelAdmin):
    list_display = ('job_type', 'project', 'user', 'status', 'created_at')
    list_filter = ('job_type', 'status')


@admin.register(ResearchMethodology)
class ResearchMethodologyAdmin(admin.ModelAdmin):
    list_display = ('project', 'approach', 'design_type', 'sample_size_planned', 'is_approved')
    list_filter = ('approach', 'is_approved')


@admin.register(ResearchVariable)
class ResearchVariableAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'variable_type', 'scale_of_measurement')
    list_filter = ('variable_type', 'scale_of_measurement')


@admin.register(SamplingPlan)
class SamplingPlanAdmin(admin.ModelAdmin):
    list_display = ('project', 'formula_type', 'population_size', 'adjusted_sample_size', 'created_at')
    list_filter = ('formula_type',)


@admin.register(ResearchInstrument)
class ResearchInstrumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'instrument_type', 'is_validated_scale')
    list_filter = ('instrument_type', 'is_validated_scale')


@admin.register(InstrumentItem)
class InstrumentItemAdmin(admin.ModelAdmin):
    list_display = ('instrument', 'construct_name', 'item_type', 'is_reverse_coded', 'order_index')
    list_filter = ('item_type', 'is_reverse_coded')


@admin.register(ResearchDataset)
class ResearchDatasetAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'file_format', 'row_count', 'column_count', 'current_version_number')
    list_filter = ('file_format', 'is_sensitive')


@admin.register(DatasetVersion)
class DatasetVersionAdmin(admin.ModelAdmin):
    list_display = ('dataset', 'version_number', 'row_count', 'column_count', 'created_at')


@admin.register(DataTransformation)
class DataTransformationAdmin(admin.ModelAdmin):
    list_display = ('dataset', 'transformation_type', 'from_version', 'to_version', 'is_approved')
    list_filter = ('transformation_type', 'is_approved')


@admin.register(AnalysisJob)
class AnalysisJobAdmin(admin.ModelAdmin):
    list_display = ('analysis_type', 'project', 'dataset', 'status', 'created_at')
    list_filter = ('analysis_type', 'status')


@admin.register(StatisticalResult)
class StatisticalResultAdmin(admin.ModelAdmin):
    list_display = ('analysis_type', 'project', 'sample_size', 'created_at')
    list_filter = ('analysis_type',)


@admin.register(HypothesisTest)
class HypothesisTestAdmin(admin.ModelAdmin):
    list_display = ('decision', 'project', 'test_type', 'p_value', 'is_approved')
    list_filter = ('decision', 'is_approved')


@admin.register(QualitativeTranscript)
class QualitativeTranscriptAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'transcript_type', 'word_count')
    list_filter = ('transcript_type',)


@admin.register(QualitativeCode)
class QualitativeCodeAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'color', 'is_ai_suggested', 'is_approved')
    list_filter = ('is_ai_suggested', 'is_approved')


@admin.register(EvidenceExcerpt)
class EvidenceExcerptAdmin(admin.ModelAdmin):
    list_display = ('transcript', 'code', 'start_char', 'end_char', 'created_at')


@admin.register(QualitativeTheme)
class QualitativeThemeAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'is_ai_suggested', 'is_approved')
    list_filter = ('is_ai_suggested', 'is_approved')


@admin.register(ResearchVisualization)
class ResearchVisualizationAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'chart_type', 'created_at')
    list_filter = ('chart_type',)


# --- Stage 5 Admin Registrations ---

@admin.register(ResearchWorkflow)
class ResearchWorkflowAdmin(admin.ModelAdmin):
    list_display = ('project', 'document_category', 'overall_progress_percentage', 'current_stage', 'is_completed')
    list_filter = ('document_category', 'is_completed')


@admin.register(WorkflowStep)
class WorkflowStepAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'order', 'title', 'stage_id', 'status', 'progress_percentage')
    list_filter = ('status', 'stage_id')
    ordering = ('workflow', 'order')


@admin.register(ResearchDecision)
class ResearchDecisionAdmin(admin.ModelAdmin):
    list_display = ('project', 'is_approved', 'approved_by', 'approved_at', 'created_at')
    list_filter = ('is_approved',)


@admin.register(ResearchAlignmentMatrix)
class ResearchAlignmentMatrixAdmin(admin.ModelAdmin):
    list_display = ('project', 'overall_alignment_score', 'unaligned_count', 'last_calculated_at')


@admin.register(AlignmentIssue)
class AlignmentIssueAdmin(admin.ModelAdmin):
    list_display = ('matrix', 'issue_type', 'severity', 'is_resolved', 'created_at')
    list_filter = ('severity', 'is_resolved')


@admin.register(ManuscriptAssembly)
class ManuscriptAssemblyAdmin(admin.ModelAdmin):
    list_display = ('document_title', 'project', 'assembled_by', 'total_word_count', 'citation_style', 'created_at')
    list_filter = ('citation_style',)


@admin.register(ManuscriptValidation)
class ManuscriptValidationAdmin(admin.ModelAdmin):
    list_display = ('project', 'readiness_score', 'total_issues_count', 'error_count', 'warning_count', 'created_at')


@admin.register(ValidationIssue)
class ValidationIssueAdmin(admin.ModelAdmin):
    list_display = ('validation', 'category', 'severity', 'section_name', 'is_resolved')
    list_filter = ('category', 'severity', 'is_resolved')


@admin.register(ReviewRecord)
class ReviewRecordAdmin(admin.ModelAdmin):
    list_display = ('project', 'reviewer', 'status', 'created_at')
    list_filter = ('status',)


# --- Stage 6 Admin Registrations ---

@admin.register(ProjectCollaborator)
class ProjectCollaboratorAdmin(admin.ModelAdmin):
    list_display = ('project', 'user', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('user__email', 'project__title')


@admin.register(ProjectInvitation)
class ProjectInvitationAdmin(admin.ModelAdmin):
    list_display = ('project', 'invitee_email', 'role', 'status', 'expires_at', 'created_at')
    list_filter = ('role', 'status')
    search_fields = ('invitee_email', 'project__title')


@admin.register(ManuscriptComment)
class ManuscriptCommentAdmin(admin.ModelAdmin):
    list_display = ('project', 'section', 'author', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('author__email', 'anchor_text', 'content')


@admin.register(CommentReply)
class CommentReplyAdmin(admin.ModelAdmin):
    list_display = ('comment', 'author', 'created_at')
    search_fields = ('author__email', 'content')


@admin.register(SupervisorFeedback)
class SupervisorFeedbackAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'source_type', 'uploaded_by', 'is_analyzed', 'created_at')
    list_filter = ('source_type', 'is_analyzed')
    search_fields = ('title', 'project__title')


@admin.register(CorrectionTask)
class CorrectionTaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'category', 'priority', 'status', 'assigned_to', 'created_at')
    list_filter = ('category', 'priority', 'status')
    search_fields = ('title', 'instruction', 'project__title')


@admin.register(JournalReviewerResponse)
class JournalReviewerResponseAdmin(admin.ModelAdmin):
    list_display = ('reviewer_label', 'comment_number', 'project', 'revision_category', 'is_verified_applied')
    list_filter = ('revision_category', 'is_verified_applied')
    search_fields = ('reviewer_label', 'original_comment', 'author_response')


@admin.register(CollaborationAuditEvent)
class CollaborationAuditEventAdmin(admin.ModelAdmin):
    list_display = ('project', 'actor', 'event_type', 'timestamp')
    list_filter = ('event_type',)
    search_fields = ('project__title', 'actor__email', 'event_type')


# ==============================================================================
# STAGE 7 ADMIN REGISTRATIONS
# ==============================================================================
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


@admin.register(AcademicInstitution)
class AcademicInstitutionAdmin(admin.ModelAdmin):
    list_display = ('name', 'country', 'code', 'is_verified', 'created_at')
    list_filter = ('is_verified', 'country')
    search_fields = ('name', 'country', 'code')


@admin.register(AcademicFaculty)
class AcademicFacultyAdmin(admin.ModelAdmin):
    list_display = ('name', 'institution', 'code', 'created_at')
    list_filter = ('institution',)
    search_fields = ('name', 'code')


@admin.register(AcademicDepartment)
class AcademicDepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'faculty', 'code', 'created_at')
    list_filter = ('faculty',)
    search_fields = ('name', 'code')


@admin.register(FormattingTemplate)
class FormattingTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'template_type', 'institution', 'degree_level', 'document_type', 'verification_status', 'is_shared')
    list_filter = ('template_type', 'verification_status', 'degree_level', 'document_type', 'is_shared')
    search_fields = ('name', 'description')


@admin.register(TemplateVersion)
class TemplateVersionAdmin(admin.ModelAdmin):
    list_display = ('template', 'version_number', 'is_active', 'created_at')
    list_filter = ('is_active',)


@admin.register(TemplateGuidelineSource)
class TemplateGuidelineSourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'template', 'review_status', 'uploaded_by', 'created_at')
    list_filter = ('review_status',)


@admin.register(JournalProfile)
class JournalProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'publisher', 'issn', 'article_type', 'verification_status', 'guideline_version')
    list_filter = ('article_type', 'verification_status')
    search_fields = ('name', 'publisher', 'issn')


@admin.register(ManuscriptMetadata)
class ManuscriptMetadataAdmin(admin.ModelAdmin):
    list_display = ('project', 'running_title', 'corresponding_author_name', 'is_complete')
    list_filter = ('is_complete',)


@admin.register(ProjectTemplateAssignment)
class ProjectTemplateAssignmentAdmin(admin.ModelAdmin):
    list_display = ('project', 'template', 'template_version', 'assigned_by', 'assigned_at')


@admin.register(FormattingValidation)
class FormattingValidationAdmin(admin.ModelAdmin):
    list_display = ('project', 'template_version', 'overall_status', 'total_issues', 'critical_count', 'validated_at')
    list_filter = ('overall_status',)


@admin.register(FormattingIssue)
class FormattingIssueAdmin(admin.ModelAdmin):
    list_display = ('validation', 'rule_category', 'rule_key', 'severity', 'fix_available', 'is_resolved')
    list_filter = ('rule_category', 'severity', 'fix_available', 'is_resolved')


@admin.register(FormattingChange)
class FormattingChangeAdmin(admin.ModelAdmin):
    list_display = ('project', 'section', 'change_type', 'snapshot_version', 'applied_by', 'created_at')


@admin.register(DocumentExport)
class DocumentExportAdmin(admin.ModelAdmin):
    list_display = ('project', 'export_format', 'citation_style', 'page_count', 'is_verified', 'created_by', 'created_at')
    list_filter = ('export_format', 'is_verified', 'citation_style')
    search_fields = ('project__title', 'file_name', 'file_checksum')


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'export_format', 'status', 'progress_pct', 'created_at')
    list_filter = ('status', 'export_format')
    search_fields = ('project__title', 'idempotency_key')


@admin.register(ExportValidation)
class ExportValidationAdmin(admin.ModelAdmin):
    list_display = ('document_export', 'overall_rating', 'structure_valid', 'layout_valid', 'citations_valid', 'total_issues', 'created_at')
    list_filter = ('overall_rating', 'structure_valid', 'layout_valid', 'citations_valid')


@admin.register(ExportIssue)
class ExportIssueAdmin(admin.ModelAdmin):
    list_display = ('validation', 'category', 'severity', 'page_number', 'message', 'created_at')
    list_filter = ('category', 'severity')


@admin.register(RenderedAsset)
class RenderedAssetAdmin(admin.ModelAdmin):
    list_display = ('document_export', 'page_number', 'asset_type', 'created_at')
    list_filter = ('asset_type',)
