"""
ScholarForge AI - Research Serializers (Stage 3)
Serializers for ResearchSource, ProjectSource, Citation, Collections, Documents,
Literature Extractions, Literature Review Notes, and Citation Audits.
"""

from rest_framework import serializers
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
)


class SourceVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceVerification
        fields = [
            'id',
            'verification_status',
            'verified_by_provider',
            'comparison_details',
            'retraction_detected',
            'error_details',
            'verified_at'
        ]
        read_only_fields = ['id', 'verified_at']


class ResearchSourceSerializer(serializers.ModelSerializer):
    verifications = SourceVerificationSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchSource
        fields = [
            'id',
            'title',
            'authors',
            'publication_year',
            'source_type',
            'journal_or_publisher',
            'doi',
            'url',
            'abstract',
            'verification_status',
            'is_open_access',
            'citation_count',
            'provenance',
            'retracted',
            'retraction_details',
            'external_id',
            'bibtex',
            'keywords',
            'verifications',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectSourceSerializer(serializers.ModelSerializer):
    source = ResearchSourceSerializer(read_only=True)
    source_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ProjectSource
        fields = [
            'id',
            'project',
            'source',
            'source_id',
            'notes',
            'relevance_score',
            'is_annotated',
            'tags',
            'is_favorite',
            'is_read',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'project', 'created_at', 'updated_at']


class CitationSerializer(serializers.ModelSerializer):
    source_title = serializers.CharField(source='source.title', read_only=True)

    class Meta:
        model = Citation
        fields = [
            'id',
            'project',
            'source',
            'source_title',
            'citation_style',
            'in_text_format',
            'in_text_narrative',
            'citation_number',
            'page_reference',
            'full_reference',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResearchCollectionItemSerializer(serializers.ModelSerializer):
    source = ResearchSourceSerializer(read_only=True)
    source_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ResearchCollectionItem
        fields = [
            'id',
            'collection',
            'source',
            'source_id',
            'notes',
            'tags',
            'is_favorite',
            'is_read',
            'added_at'
        ]
        read_only_fields = ['id', 'collection', 'added_at']


class ResearchCollectionSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    items = ResearchCollectionItemSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchCollection
        fields = [
            'id',
            'name',
            'description',
            'color',
            'items_count',
            'items',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SourceExcerptSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceExcerpt
        fields = [
            'id',
            'page_number',
            'section_heading',
            'content',
            'created_at'
        ]


class SourceDocumentSerializer(serializers.ModelSerializer):
    excerpts = SourceExcerptSerializer(many=True, read_only=True)

    class Meta:
        model = SourceDocument
        fields = [
            'id',
            'file_name',
            'file_type',
            'file_size',
            'extraction_status',
            'extracted_text',
            'page_count',
            'is_machine_readable',
            'metadata',
            'error_message',
            'excerpts',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'file_name',
            'file_type',
            'file_size',
            'extraction_status',
            'extracted_text',
            'page_count',
            'is_machine_readable',
            'metadata',
            'error_message',
            'created_at',
            'updated_at'
        ]


class LiteratureExtractionSerializer(serializers.ModelSerializer):
    source_title = serializers.CharField(source='source.title', read_only=True)

    class Meta:
        model = LiteratureExtraction
        fields = [
            'id',
            'source',
            'source_title',
            'extraction_type',
            'content',
            'evidence_basis',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LiteratureReviewNoteSerializer(serializers.ModelSerializer):
    sources_details = ResearchSourceSerializer(source='sources', many=True, read_only=True)
    source_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = LiteratureReviewNote
        fields = [
            'id',
            'project',
            'review_type',
            'title',
            'content',
            'sources_details',
            'source_ids',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'project', 'created_at', 'updated_at']

    def create(self, validated_data):
        source_ids = validated_data.pop('source_ids', [])
        note = LiteratureReviewNote.objects.create(**validated_data)
        if source_ids:
            sources = ResearchSource.objects.filter(id__in=source_ids)
            note.sources.set(sources)
        return note

    def update(self, instance, validated_data):
        source_ids = validated_data.pop('source_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if source_ids is not None:
            sources = ResearchSource.objects.filter(id__in=source_ids)
            instance.sources.set(sources)
        return instance


class CitationAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = CitationAudit
        fields = [
            'id',
            'project',
            'document',
            'total_in_text_citations',
            'total_bibliography_entries',
            'uncited_bibliography_count',
            'missing_bibliography_count',
            'unverified_count',
            'retracted_count',
            'conflict_count',
            'audit_report',
            'audited_at'
        ]
        read_only_fields = ['id', 'audited_at']


# ==============================================================================
# STAGE 4 SERIALIZERS: Methodology, Instruments, Data, Statistics, Qualitative
# ==============================================================================

class ResearchMethodologySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchMethodology
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResearchVariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchVariable
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class SamplingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SamplingPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class InstrumentItemSerializer(serializers.ModelSerializer):
    text = serializers.CharField(source='item_text', required=False)
    construct = serializers.CharField(source='construct_name', required=False)

    class Meta:
        model = InstrumentItem
        fields = '__all__'
        read_only_fields = ['id']


class ResearchInstrumentSerializer(serializers.ModelSerializer):
    items = InstrumentItemSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchInstrument
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DataTransformationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataTransformation
        fields = '__all__'
        read_only_fields = ['id', 'applied_at']


class DatasetVersionSerializer(serializers.ModelSerializer):
    columns = serializers.SerializerMethodField()
    data_payload = serializers.SerializerMethodField()
    schema_summary = serializers.SerializerMethodField()

    class Meta:
        model = DatasetVersion
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_columns(self, obj):
        return obj.summary_statistics.get('columns', []) if isinstance(obj.summary_statistics, dict) else []

    def get_data_payload(self, obj):
        return obj.summary_statistics.get('data_payload', []) if isinstance(obj.summary_statistics, dict) else []

    def get_schema_summary(self, obj):
        return obj.summary_statistics.get('schema_summary', {}) if isinstance(obj.summary_statistics, dict) else {}


class ResearchDatasetSerializer(serializers.ModelSerializer):
    versions = DatasetVersionSerializer(many=True, read_only=True)
    current_version = serializers.SerializerMethodField()
    has_formula_sanitized = serializers.SerializerMethodField()
    formula_sanitization_count = serializers.SerializerMethodField()

    class Meta:
        model = ResearchDataset
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_current_version(self, obj):
        curr = obj.versions.filter(version_number=obj.current_version_number).first() or obj.versions.first()
        if curr:
            return DatasetVersionSerializer(curr).data
        return None

    def get_has_formula_sanitized(self, obj):
        return bool(obj.columns_schema.get('has_formula_sanitized', False)) if isinstance(obj.columns_schema, dict) else False

    def get_formula_sanitization_count(self, obj):
        return obj.columns_schema.get('formula_sanitization_count', 0) if isinstance(obj.columns_schema, dict) else 0


class StatisticalResultSerializer(serializers.ModelSerializer):
    output_data = serializers.JSONField(source='metrics', read_only=True)
    test_type = serializers.CharField(source='analysis_type', read_only=True)
    p_value = serializers.SerializerMethodField()

    class Meta:
        model = StatisticalResult
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_p_value(self, obj):
        if isinstance(obj.p_values, dict):
            return obj.p_values.get('p_value')
        return None


class AnalysisJobSerializer(serializers.ModelSerializer):
    result = StatisticalResultSerializer(source='statistical_result', read_only=True)

    class Meta:
        model = AnalysisJob
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'completed_at']


class HypothesisTestSerializer(serializers.ModelSerializer):
    statistical_result_details = StatisticalResultSerializer(source='statistical_result', read_only=True)
    hypothesis_statement = serializers.CharField(source='hypothesis_text', read_only=True)
    findings_summary = serializers.CharField(source='substantive_interpretation', read_only=True)

    class Meta:
        model = HypothesisTest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class EvidenceExcerptSerializer(serializers.ModelSerializer):
    code_name = serializers.CharField(source='code.name', read_only=True)
    code_color = serializers.CharField(source='code.color', read_only=True)
    transcript_title = serializers.CharField(source='transcript.title', read_only=True)

    class Meta:
        model = EvidenceExcerpt
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class QualitativeCodeSerializer(serializers.ModelSerializer):
    excerpt_count = serializers.SerializerMethodField()

    class Meta:
        model = QualitativeCode
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_excerpt_count(self, obj):
        return obj.excerpts.count()


class QualitativeTranscriptSerializer(serializers.ModelSerializer):
    excerpts = EvidenceExcerptSerializer(many=True, read_only=True)

    class Meta:
        model = QualitativeTranscript
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class QualitativeThemeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='title', required=False)

    class Meta:
        model = QualitativeTheme
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResearchVisualizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchVisualization
        fields = '__all__'
        read_only_fields = ['id', 'created_at']




# ============================================================================
# STAGE 5: WORKFLOW, PLANNING, ASSEMBLY, ALIGNMENT & QUALITY SERIALIZERS
# ============================================================================

class WorkflowStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowStep
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResearchWorkflowSerializer(serializers.ModelSerializer):
    steps = WorkflowStepSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchWorkflow
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ResearchDecisionSerializer(serializers.ModelSerializer):
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)

    class Meta:
        model = ResearchDecision
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_at', 'approved_by']


class AlignmentIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlignmentIssue
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ResearchAlignmentMatrixSerializer(serializers.ModelSerializer):
    issues = AlignmentIssueSerializer(many=True, read_only=True)

    class Meta:
        model = ResearchAlignmentMatrix
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'last_calculated_at']


class ManuscriptAssemblySerializer(serializers.ModelSerializer):
    assembled_by_name = serializers.CharField(source='assembled_by.get_full_name', read_only=True)
    version_number = serializers.IntegerField(read_only=True)
    total_words = serializers.IntegerField(source='total_word_count', read_only=True)
    table_count = serializers.IntegerField(source='total_tables_count', read_only=True)
    figure_count = serializers.IntegerField(source='total_figures_count', read_only=True)
    reference_count = serializers.IntegerField(source='total_citations_count', read_only=True)

    class Meta:
        model = ManuscriptAssembly
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ValidationIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValidationIssue
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ManuscriptValidationSerializer(serializers.ModelSerializer):
    issues = ValidationIssueSerializer(many=True, read_only=True)

    class Meta:
        model = ManuscriptValidation
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ReviewRecordSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_email = serializers.EmailField(source='reviewer.email', read_only=True)
    feedback = serializers.CharField(source='comments', read_only=True)
    review_stage = serializers.CharField(source='status', read_only=True)
    is_approved = serializers.SerializerMethodField()

    class Meta:
        model = ReviewRecord
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_reviewer_name(self, obj):
        if isinstance(obj.review_checklist, dict) and obj.review_checklist.get('reviewer_name'):
            return obj.review_checklist['reviewer_name']
        return obj.reviewer.get_full_name() or obj.reviewer.email

    def get_is_approved(self, obj):
        return obj.status == 'APPROVED_DRAFT'


# ==============================================================================
# STAGE 6: ACADEMIC COLLABORATION & SUPERVISOR REVIEW SERIALIZERS
# ==============================================================================

class ProjectCollaboratorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCollaborator
        fields = [
            'id', 'project', 'user', 'user_email', 'user_name',
            'role', 'assigned_sections', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class ProjectInvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProjectInvitation
        fields = [
            'id', 'project', 'invited_by', 'invited_by_name',
            'invitee_email', 'role', 'assigned_sections',
            'token', 'status', 'expires_at', 'accepted_at',
            'is_expired', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'expires_at', 'accepted_at', 'created_at']

    def get_invited_by_name(self, obj):
        return obj.invited_by.get_full_name() or obj.invited_by.username


class CommentReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source='author.email', read_only=True)

    class Meta:
        model = CommentReply
        fields = [
            'id', 'comment', 'author', 'author_name', 'author_email',
            'content', 'created_at'
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        if not obj.author:
            return 'Collaborator'
        return obj.author.get_full_name() or obj.author.username


class ManuscriptCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source='author.email', read_only=True)
    replies = CommentReplySerializer(many=True, read_only=True)
    section_title = serializers.CharField(source='section.title', read_only=True)

    class Meta:
        model = ManuscriptComment
        fields = [
            'id', 'project', 'document', 'section', 'section_title',
            'author', 'author_name', 'author_email', 'content',
            'anchor_text', 'anchor_prefix', 'anchor_suffix',
            'start_offset', 'end_offset', 'status',
            'replies', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        if not obj.author:
            return 'Collaborator'
        return obj.author.get_full_name() or obj.author.username


class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = SupervisorFeedback
        fields = [
            'id', 'project', 'uploaded_by', 'uploaded_by_name', 'uploaded_by_email',
            'source_type', 'raw_content', 'file_attachment', 'extracted_comments',
            'has_unextracted_annotations', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'extracted_comments', 'has_unextracted_annotations', 'created_at']

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return 'Supervisor'
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username


class CorrectionTaskSerializer(serializers.ModelSerializer):
    section_title = serializers.CharField(source='section.title', read_only=True)

    class Meta:
        model = CorrectionTask
        fields = [
            'id', 'project', 'feedback_source', 'linked_comment',
            'section', 'section_title', 'category', 'priority', 'status',
            'supervisor_instruction', 'original_text', 'proposed_text',
            'expected_base_version', 'is_stale_after_subsequent_edit',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class JournalReviewerResponseSerializer(serializers.ModelSerializer):
    section_title = serializers.CharField(source='target_section.title', read_only=True)

    class Meta:
        model = JournalReviewerResponse
        fields = [
            'id', 'project', 'reviewer_label', 'comment_number',
            'original_comment', 'revision_category',
            'target_section', 'section_title', 'linked_correction_task',
            'author_response', 'is_verified_applied',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CollaborationAuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = CollaborationAuditEvent
        fields = ['id', 'project', 'actor', 'actor_name', 'event_type', 'details', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def get_actor_name(self, obj):
        if not obj.actor:
            return 'System'
        return obj.actor.get_full_name() or obj.actor.username



# ==============================================================================
# STAGE 6: ACADEMIC COLLABORATION & SUPERVISOR REVIEW SERIALIZERS
# ==============================================================================

class ProjectCollaboratorSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectCollaborator
        fields = [
            'id', 'project', 'user', 'user_email', 'user_name',
            'role', 'assigned_sections', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class ProjectInvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProjectInvitation
        fields = [
            'id', 'project', 'invited_by', 'invited_by_name',
            'invitee_email', 'role', 'assigned_sections',
            'token', 'status', 'expires_at', 'accepted_at',
            'is_expired', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'expires_at', 'accepted_at', 'created_at']

    def get_invited_by_name(self, obj):
        return obj.invited_by.get_full_name() or obj.invited_by.username


class SupervisorFeedbackSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    uploaded_by_email = serializers.EmailField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = SupervisorFeedback
        fields = [
            'id', 'project', 'uploaded_by', 'uploaded_by_name', 'uploaded_by_email',
            'source_type', 'raw_content', 'file_attachment', 'extracted_comments',
            'has_unextracted_annotations', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'extracted_comments', 'has_unextracted_annotations', 'created_at']

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return 'Supervisor'
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username


class CorrectionTaskSerializer(serializers.ModelSerializer):
    section_title = serializers.CharField(source='section.title', read_only=True)

    class Meta:
        model = CorrectionTask
        fields = [
            'id', 'project', 'feedback_source', 'linked_comment',
            'section', 'section_title', 'category', 'priority', 'status',
            'supervisor_instruction', 'original_text', 'proposed_text',
            'expected_base_version', 'is_stale_after_subsequent_edit',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class JournalReviewerResponseSerializer(serializers.ModelSerializer):
    section_title = serializers.CharField(source='target_section.title', read_only=True)

    class Meta:
        model = JournalReviewerResponse
        fields = [
            'id', 'project', 'reviewer_label', 'comment_number',
            'original_comment', 'revision_category',
            'target_section', 'section_title', 'linked_correction_task',
            'author_response', 'is_verified_applied',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CollaborationAuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = CollaborationAuditEvent
        fields = ['id', 'project', 'actor', 'actor_name', 'event_type', 'details', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def get_actor_name(self, obj):
        if not obj.actor:
            return 'System'
        return obj.actor.get_full_name() or obj.actor.username



# ==============================================================================
# STAGE 7: UNIVERSITY ACADEMIC FORMATTING & COMPLIANCE SERIALIZERS
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
    DocumentExport,
    ExportJob,
    ExportValidation,
    ExportIssue,
    RenderedAsset,
)


class AcademicDepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicDepartment
        fields = ['id', 'faculty', 'name', 'code', 'created_at']
        read_only_fields = ['id', 'created_at']


class AcademicFacultySerializer(serializers.ModelSerializer):
    departments = AcademicDepartmentSerializer(many=True, read_only=True)

    class Meta:
        model = AcademicFaculty
        fields = ['id', 'institution', 'name', 'code', 'departments', 'created_at']
        read_only_fields = ['id', 'created_at']


class AcademicInstitutionSerializer(serializers.ModelSerializer):
    faculties = AcademicFacultySerializer(many=True, read_only=True)
    template_count = serializers.SerializerMethodField()

    class Meta:
        model = AcademicInstitution
        fields = [
            'id', 'name', 'country', 'code', 'website',
            'is_verified', 'verification_source', 'metadata',
            'faculties', 'template_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_template_count(self, obj):
        return obj.templates.count()


class TemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateVersion
        fields = ['id', 'template', 'version_number', 'changelog', 'rules_config', 'is_active', 'created_at']
        read_only_fields = ['id', 'version_number', 'created_at']


class FormattingTemplateSerializer(serializers.ModelSerializer):
    versions = TemplateVersionSerializer(many=True, read_only=True)
    active_version = serializers.SerializerMethodField()
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    country = serializers.CharField(source='institution.country', read_only=True)

    class Meta:
        model = FormattingTemplate
        fields = [
            'id', 'name', 'description', 'template_type',
            'institution', 'institution_name', 'country',
            'department', 'department_name',
            'degree_level', 'document_type',
            'verification_status', 'guideline_version', 'verification_evidence_summary',
            'verification_source_url', 'verification_notes', 'verification_date', 'verified_by',
            'is_shared', 'created_by', 'versions', 'active_version',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'verification_date', 'created_at', 'updated_at']

    def get_active_version(self, obj):
        v = obj.versions.filter(is_active=True).first() or obj.versions.order_by('-version_number').first()
        return TemplateVersionSerializer(v).data if v else None


class TemplateGuidelineSourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TemplateGuidelineSource
        fields = [
            'id', 'template', 'title', 'file_attachment',
            'extracted_text', 'prompt_injection_sanitized',
            'extracted_rules', 'review_status',
            'uploaded_by', 'uploaded_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'extracted_text', 'prompt_injection_sanitized', 'created_at']

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return 'Researcher'
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username


class JournalProfileSerializer(serializers.ModelSerializer):
    article_structure = serializers.SerializerMethodField()

    class Meta:
        model = JournalProfile
        fields = [
            'id', 'name', 'publisher', 'issn', 'scope',
            'submission_url', 'author_guidelines_url', 'article_type',
            'article_structure', 'word_limit', 'abstract_word_limit',
            'keyword_min', 'keyword_max', 'reference_limit',
            'required_sections', 'required_statements', 'citation_style',
            'verification_status', 'guideline_version', 'verification_evidence_summary', 'last_reviewed_date',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_article_structure(self, obj):
        from research.journal_publication_service import JournalPublicationService
        return JournalPublicationService.get_article_structure(obj.article_type)


class ManuscriptMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManuscriptMetadata
        fields = [
            'id', 'project', 'running_title',
            'corresponding_author_name', 'corresponding_author_email',
            'orcid_identifiers', 'affiliations',
            'funding_statement', 'conflict_of_interest_statement',
            'data_availability_statement', 'ethics_approval_statement',
            'study_design_type', 'involves_human_or_animal_subjects', 'ethics_exemption_reason',
            'author_contributions', 'is_complete', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectTemplateAssignmentSerializer(serializers.ModelSerializer):
    template_details = FormattingTemplateSerializer(source='template', read_only=True)
    template_version_details = TemplateVersionSerializer(source='template_version', read_only=True)

    class Meta:
        model = ProjectTemplateAssignment
        fields = [
            'id', 'project', 'template', 'template_details',
            'template_version', 'template_version_details',
            'assigned_by', 'assigned_at'
        ]
        read_only_fields = ['id', 'assigned_at']


class FormattingIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormattingIssue
        fields = [
            'id', 'validation', 'rule_key', 'rule_category',
            'severity', 'current_value', 'expected_value',
            'location', 'suggested_fix', 'fix_available',
            'is_resolved', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FormattingValidationSerializer(serializers.ModelSerializer):
    issues = FormattingIssueSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source='template_version.template.name', read_only=True)
    template_version_number = serializers.IntegerField(source='template_version.version_number', read_only=True)

    class Meta:
        model = FormattingValidation
        fields = [
            'id', 'project', 'template_version', 'template_name',
            'template_version_number', 'overall_status', 'total_issues',
            'critical_count', 'major_count', 'minor_count', 'info_count',
            'summary', 'issues', 'validated_at'
        ]
        read_only_fields = ['id', 'validated_at']


class FormattingChangeSerializer(serializers.ModelSerializer):
    applied_by_name = serializers.SerializerMethodField()
    section_title = serializers.CharField(source='section.title', read_only=True)

    class Meta:
        model = FormattingChange
        fields = [
            'id', 'project', 'section', 'section_title',
            'change_type', 'before_state', 'after_state',
            'snapshot_version', 'applied_by', 'applied_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_applied_by_name(self, obj):
        if not obj.applied_by:
            return 'System'
        return obj.applied_by.get_full_name() or obj.applied_by.username


# =====================================================================
# STAGE 8: Document Export, Layout Verification & QA Serializers
# =====================================================================

class ExportIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportIssue
        fields = [
            'id', 'validation', 'category', 'severity',
            'message', 'page_number', 'location',
            'suggested_action', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExportValidationSerializer(serializers.ModelSerializer):
    issues = ExportIssueSerializer(many=True, read_only=True)

    class Meta:
        model = ExportValidation
        fields = [
            'id', 'document_export', 'structure_valid', 'layout_valid',
            'citations_valid', 'total_issues', 'overall_rating',
            'summary_notes', 'cross_check_diffs', 'metrics',
            'issues', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class RenderedAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenderedAsset
        fields = [
            'id', 'document_export', 'page_number',
            'asset_type', 'image_file', 'image_data_uri', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DocumentExportSerializer(serializers.ModelSerializer):
    validation_report = ExportValidationSerializer(read_only=True)
    rendered_assets = RenderedAssetSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DocumentExport
        fields = [
            'id', 'project', 'document_version', 'export_format',
            'template_version', 'citation_style', 'file_artifact',
            'file_name', 'file_checksum', 'file_size_bytes',
            'page_count', 'heading_count', 'table_count',
            'figure_count', 'reference_count', 'word_count',
            'metadata_snapshot', 'is_verified',
            'created_by', 'created_by_name',
            'validation_report', 'rendered_assets',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'file_checksum', 'file_size_bytes', 'page_count',
            'heading_count', 'table_count', 'figure_count',
            'reference_count', 'word_count', 'is_verified',
            'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'System'
        return obj.created_by.get_full_name() or obj.created_by.email


class ExportJobSerializer(serializers.ModelSerializer):
    document_export_details = DocumentExportSerializer(source='document_export', read_only=True)

    class Meta:
        model = ExportJob
        fields = [
            'id', 'project', 'export_format', 'template',
            'status', 'progress_pct', 'status_message', 'error_message',
            'idempotency_key', 'document_export', 'document_export_details',
            'export_options', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
