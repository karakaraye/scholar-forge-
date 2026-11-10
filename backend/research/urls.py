from django.urls import path
from research.views import (
    # Stage 2 Views
    AIGenerateView,
    AIJobDetailView,
    AIJobFeedbackView,
    AcademicConsistencyCheckView,
    ResearchContextDetailView,
    # Stage 3 Views: Discovery & Sources
    ResearchDiscoverySearchView,
    ResearchSourceListCreateView,
    ResearchSourceDetailView,
    VerifySourceView,
    ImportDOIView,
    ImportBibTeXView,
    ImportRISView,
    # Stage 3 Views: Collections
    ResearchCollectionListView,
    ResearchCollectionDetailView,
    CollectionItemView,
    # Stage 3 Views: Project Sources
    ProjectSourcesView,
    ProjectSourceDetailView,
    # Stage 3 Views: Document Uploads & Extraction
    DocumentUploadView,
    DocumentDetailView,
    # Stage 3 Views: Literature Intelligence & Review Workspace
    LiteratureIntelligenceAnalyzeView,
    LiteratureReviewNoteListView,
    LiteratureReviewNoteDetailView,
    # Stage 3 Views: Citations & Audits
    ProjectBibliographyView,
    FormatCitationView,
    CitationAuditView,
    # Stage 4 Views: Methodology & Sampling
    MethodologyRecommendationView,
    ProjectMethodologyDetailView,
    SamplingCalculatorView,
    ProjectVariablesView,
    VariableDetailView,
    # Stage 4 Views: Instruments
    ProjectInstrumentsView,
    InstrumentDetailView,
    InstrumentGenerateDraftView,
    InstrumentValidateView,
    InstrumentExportDocxView,
    # Stage 4 Views: Datasets & Cleaning
    ProjectDatasetsView,
    DatasetDetailView,
    DatasetTransformView,
    DatasetRollbackView,
    # Stage 4 Views: Statistical Analysis
    RunStatisticalAnalysisView,
    ProjectStatisticalResultsView,
    StatisticalResultDetailView,
    # Stage 4 Views: Hypothesis Testing
    EvaluateHypothesisView,
    ProjectHypothesisTestsView,
    # Stage 4 Views: Qualitative Research
    ProjectTranscriptsView,
    TranscriptDetailView,
    ProjectQualitativeCodesView,
    QualitativeCodeDetailView,
    SuggestCandidateCodesView,
    TagExcerptView,
    ProjectQualitativeThemesView,
    # Stage 4 Views: Visualizations & AI Results Interpretation
    ProjectVisualizationsView,
    VisualizationDetailView,
    ResultsInterpretationView,
    # Stage 5 Views: Workflow, Planning, Alignment, Assembly, QA & Review
    ResearchWorkflowView,
    WorkflowStepUpdateView,
    ResearchDecisionView,
    ResearchDecisionApproveView,
    ResearchAlignmentView,
    ManuscriptAssemblyView,
    ManuscriptAssemblyDetailView,
    ManuscriptValidationView,
    AIReviewAssistantView,
    DataProvenanceView,
    ReviewRecordView,
    # Stage 6 Views: Academic Collaboration, Comments, Feedback, Revisions & Journal Matrix
    ProjectCollaboratorsView,
    CollaboratorDetailView,
    ProjectInvitationActionView,
    MyInvitationsView,
    InvitationDetailView,
    ProjectInvitationRevokeView,
    ProjectCollaborationAuditView,
    ManuscriptCommentsView,
    CommentReplyView,
    CommentStatusView,
    DocumentRecalculateAnchorsView,
    SupervisorFeedbackView,
    SupervisorFeedbackAnalyzeView,
    CorrectionTasksView,
    CorrectionTaskApplyView,
    CorrectionTaskReviewView,
    DocumentDiffView,
    DocumentVersionRestoreView,
    JournalReviewMatrixView,
    JournalReviewDetailView,
    JournalReviewMatrixDocumentView,
    SupervisorProjectsOverviewView,
    InstitutionListView,
    DepartmentListView,
    FormattingTemplateListView,
    FormattingTemplateDetailView,
    FormattingTemplateCloneView,
    ProjectTemplateAssignmentView,
    PreliminaryPagesView,
    GuidelineIngestView,
    GuidelineApproveView,
    ComplianceAuditView,
    AutoformatPreviewView,
    AutoformatApplyView,
    AutoformatRollbackView,
    JournalProfileListView,
    ManuscriptMetadataView,
    SubmissionReadinessView,
    # Stage 8 Views: Professional Word & PDF Export & QA
    ProjectExportInitiateView,
    ExportJobStatusView,
    ProjectExportListView,
    DocumentExportDetailView,
    DocumentExportDownloadView,
    DocumentExportValidationView,
    ProjectExportPreviewView,
)

urlpatterns = [
    # Stage 2 AI Endpoints
    path('ai/generate/', AIGenerateView.as_view(), name='ai-generate'),
    path('ai/jobs/<uuid:pk>/', AIJobDetailView.as_view(), name='ai-job-detail'),
    path('ai/jobs/<uuid:pk>/feedback/', AIJobFeedbackView.as_view(), name='ai-job-feedback'),
    path('projects/<uuid:project_id>/consistency-check/', AcademicConsistencyCheckView.as_view(), name='project-consistency-check'),
    path('projects/<uuid:project_id>/context/', ResearchContextDetailView.as_view(), name='project-research-context'),

    # Stage 3 Discovery & Verification
    path('discovery/search/', ResearchDiscoverySearchView.as_view(), name='discovery-search'),
    path('sources/', ResearchSourceListCreateView.as_view(), name='source-list-create'),
    path('sources/<uuid:pk>/', ResearchSourceDetailView.as_view(), name='source-detail'),
    path('sources/<uuid:pk>/verify/', VerifySourceView.as_view(), name='source-verify'),
    path('sources/import-doi/', ImportDOIView.as_view(), name='source-import-doi'),
    path('sources/import-bibtex/', ImportBibTeXView.as_view(), name='source-import-bibtex'),
    path('sources/import-ris/', ImportRISView.as_view(), name='source-import-ris'),

    # Stage 3 Collections & Folders
    path('collections/', ResearchCollectionListView.as_view(), name='collection-list-create'),
    path('collections/<uuid:pk>/', ResearchCollectionDetailView.as_view(), name='collection-detail'),
    path('collections/<uuid:pk>/items/', CollectionItemView.as_view(), name='collection-item-add'),
    path('collections/<uuid:pk>/items/<uuid:source_id>/', CollectionItemView.as_view(), name='collection-item-detail'),

    # Stage 3 Project Sources Attachment
    path('projects/<uuid:project_id>/sources/', ProjectSourcesView.as_view(), name='project-sources'),
    path('projects/<uuid:project_id>/sources/<uuid:source_id>/', ProjectSourceDetailView.as_view(), name='project-source-detail'),

    # Stage 3 Document Uploads & Extraction
    path('documents/upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('documents/<uuid:pk>/', DocumentDetailView.as_view(), name='document-detail'),

    # Stage 3 Literature Intelligence & Review Workspace
    path('projects/<uuid:project_id>/literature-analyze/', LiteratureIntelligenceAnalyzeView.as_view(), name='literature-analyze'),
    path('projects/<uuid:project_id>/literature-notes/', LiteratureReviewNoteListView.as_view(), name='literature-notes-list'),
    path('literature-notes/<uuid:pk>/', LiteratureReviewNoteDetailView.as_view(), name='literature-note-detail'),

    # Stage 3 Citations, Bibliography & Audit
    path('projects/<uuid:project_id>/bibliography/', ProjectBibliographyView.as_view(), name='project-bibliography'),
    path('projects/<uuid:project_id>/format-citation/', FormatCitationView.as_view(), name='format-citation'),
    path('projects/<uuid:project_id>/citation-audit/', CitationAuditView.as_view(), name='project-citation-audit'),

    # =========================================================================
    # STAGE 4 ENDPOINTS
    # =========================================================================

    # Methodology & Sampling
    path('methodology/recommend/', MethodologyRecommendationView.as_view(), name='methodology-recommend'),
    path('projects/<uuid:project_id>/methodology/', ProjectMethodologyDetailView.as_view(), name='project-methodology'),
    path('sampling/calculate/', SamplingCalculatorView.as_view(), name='sampling-calculate'),
    path('projects/<uuid:project_id>/variables/', ProjectVariablesView.as_view(), name='project-variables'),
    path('variables/<uuid:pk>/', VariableDetailView.as_view(), name='variable-detail'),

    # Research Instruments
    path('projects/<uuid:project_id>/instruments/', ProjectInstrumentsView.as_view(), name='project-instruments'),
    path('instruments/<uuid:pk>/', InstrumentDetailView.as_view(), name='instrument-detail'),
    path('instruments/<uuid:pk>/generate-items/', InstrumentGenerateDraftView.as_view(), name='instrument-generate-items'),
    path('instruments/<uuid:pk>/validate/', InstrumentValidateView.as_view(), name='instrument-validate'),
    path('instruments/<uuid:pk>/export-docx/', InstrumentExportDocxView.as_view(), name='instrument-export-docx'),

    # Datasets & Cleaning
    path('projects/<uuid:project_id>/datasets/', ProjectDatasetsView.as_view(), name='project-datasets'),
    path('datasets/<uuid:pk>/', DatasetDetailView.as_view(), name='dataset-detail'),
    path('datasets/<uuid:pk>/transform/', DatasetTransformView.as_view(), name='dataset-transform'),
    path('datasets/<uuid:pk>/rollback/', DatasetRollbackView.as_view(), name='dataset-rollback'),

    # Statistical Analysis
    path('projects/<uuid:project_id>/run-analysis/', RunStatisticalAnalysisView.as_view(), name='project-run-analysis'),
    path('projects/<uuid:project_id>/statistical-results/', ProjectStatisticalResultsView.as_view(), name='project-statistical-results'),
    path('statistical-results/<uuid:pk>/', StatisticalResultDetailView.as_view(), name='statistical-result-detail'),

    # Hypothesis Testing
    path('projects/<uuid:project_id>/evaluate-hypothesis/', EvaluateHypothesisView.as_view(), name='project-evaluate-hypothesis'),
    path('projects/<uuid:project_id>/hypothesis-tests/', ProjectHypothesisTestsView.as_view(), name='project-hypothesis-tests'),

    # Qualitative Research
    path('projects/<uuid:project_id>/transcripts/', ProjectTranscriptsView.as_view(), name='project-transcripts'),
    path('transcripts/<uuid:pk>/', TranscriptDetailView.as_view(), name='transcript-detail'),
    path('projects/<uuid:project_id>/qualitative-codes/', ProjectQualitativeCodesView.as_view(), name='project-qualitative-codes'),
    path('qualitative-codes/<uuid:pk>/', QualitativeCodeDetailView.as_view(), name='qualitative-code-detail'),
    path('transcripts/<uuid:pk>/suggest-codes/', SuggestCandidateCodesView.as_view(), name='transcript-suggest-codes'),
    path('transcripts/<uuid:pk>/tag-excerpt/', TagExcerptView.as_view(), name='transcript-tag-excerpt'),
    path('projects/<uuid:project_id>/qualitative-themes/', ProjectQualitativeThemesView.as_view(), name='project-qualitative-themes'),

    # Visualizations & AI Results Interpretation
    path('projects/<uuid:project_id>/visualizations/', ProjectVisualizationsView.as_view(), name='project-visualizations'),
    path('visualizations/<uuid:pk>/', VisualizationDetailView.as_view(), name='visualization-detail'),
    path('projects/<uuid:project_id>/interpret-results/', ResultsInterpretationView.as_view(), name='project-interpret-results'),

    # =========================================================================
    # STAGE 5 ENDPOINTS: WORKFLOW, PLANNING, ASSEMBLY, ALIGNMENT & QUALITY
    # =========================================================================
    path('projects/<uuid:project_id>/workflow/', ResearchWorkflowView.as_view(), name='project-workflow'),
    path('workflow-steps/<uuid:step_id>/', WorkflowStepUpdateView.as_view(), name='workflow-step-update'),
    path('projects/<uuid:project_id>/planning/', ResearchDecisionView.as_view(), name='project-planning'),
    path('projects/<uuid:project_id>/planning/approve/', ResearchDecisionApproveView.as_view(), name='project-planning-approve'),
    path('projects/<uuid:project_id>/alignment/', ResearchAlignmentView.as_view(), name='project-alignment'),
    path('projects/<uuid:project_id>/assemblies/', ManuscriptAssemblyView.as_view(), name='project-assemblies'),
    path('assemblies/<uuid:assembly_id>/', ManuscriptAssemblyDetailView.as_view(), name='assembly-detail'),
    path('projects/<uuid:project_id>/validation/', ManuscriptValidationView.as_view(), name='project-validation'),
    path('projects/<uuid:project_id>/review-assistant/', AIReviewAssistantView.as_view(), name='project-review-assistant'),
    path('projects/<uuid:project_id>/provenance/', DataProvenanceView.as_view(), name='project-provenance'),
    path('projects/<uuid:project_id>/reviews/', ReviewRecordView.as_view(), name='project-reviews'),

    # =========================================================================
    # STAGE 6 ENDPOINTS: COLLABORATION, SUPERVISOR REVIEW, REVISIONS & JOURNAL
    # =========================================================================
    path('projects/<uuid:project_id>/collaborators/', ProjectCollaboratorsView.as_view(), name='project-collaborators'),
    path('projects/<uuid:project_id>/collaborators/<uuid:collaborator_id>/', CollaboratorDetailView.as_view(), name='collaborator-detail'),
    path('collaborations/invitations/', MyInvitationsView.as_view(), name='my-invitations'),
    path('collaborations/invitations/<str:token>/', InvitationDetailView.as_view(), name='invitation-detail'),
    path('collaborations/invitations/<str:token>/<str:action>/', ProjectInvitationActionView.as_view(), name='invitation-action'),
    path('projects/<uuid:project_id>/invitations/<uuid:invitation_id>/', ProjectInvitationRevokeView.as_view(), name='invitation-revoke'),
    path('projects/<uuid:project_id>/collaborators-audit/', ProjectCollaborationAuditView.as_view(), name='project-collaborators-audit'),

    # Inline Manuscript Comments & Relocation
    path('projects/<uuid:project_id>/comments/', ManuscriptCommentsView.as_view(), name='manuscript-comments'),
    path('comments/<uuid:comment_id>/reply/', CommentReplyView.as_view(), name='comment-reply'),
    path('comments/<uuid:comment_id>/status/', CommentStatusView.as_view(), name='comment-status'),
    path('documents/<uuid:document_id>/recalculate-anchors/', DocumentRecalculateAnchorsView.as_view(), name='document-recalculate-anchors'),

    # Supervisor Feedback Ingestion & AI Correction Analysis
    path('projects/<uuid:project_id>/feedback/', SupervisorFeedbackView.as_view(), name='supervisor-feedback'),
    path('feedback/<uuid:feedback_id>/analyze/', SupervisorFeedbackAnalyzeView.as_view(), name='supervisor-feedback-analyze'),

    # Revision & Correction Tasks Workflow
    path('projects/<uuid:project_id>/corrections/', CorrectionTasksView.as_view(), name='correction-tasks'),
    path('corrections/<uuid:task_id>/apply/', CorrectionTaskApplyView.as_view(), name='correction-task-apply'),
    path('corrections/<uuid:task_id>/review/', CorrectionTaskReviewView.as_view(), name='correction-task-review'),

    # Document Version Diffing & Safe Restoration
    path('documents/<uuid:document_id>/diff/', DocumentDiffView.as_view(), name='document-diff'),
    path('documents/<uuid:document_id>/restore-version/', DocumentVersionRestoreView.as_view(), name='document-restore-version'),

    # Journal Reviewer Point-by-Point Matrix
    path('projects/<uuid:project_id>/journal-responses/', JournalReviewMatrixView.as_view(), name='journal-review-responses'),
    path('journal-responses/<uuid:response_id>/', JournalReviewDetailView.as_view(), name='journal-review-detail'),
    path('projects/<uuid:project_id>/journal-responses/matrix-document/', JournalReviewMatrixDocumentView.as_view(), name='journal-matrix-document'),

    # Supervisor Projects Dashboard
    path('supervisor/projects/', SupervisorProjectsOverviewView.as_view(), name='supervisor-projects-overview'),
# =========================================================================
    # STAGE 7: UNIVERSITY ACADEMIC FORMATTING, TEMPLATES & COMPLIANCE
    # =========================================================================
    path('institutions/', InstitutionListView.as_view(), name='institution-list'),
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('templates/', FormattingTemplateListView.as_view(), name='template-list'),
    path('templates/<uuid:pk>/', FormattingTemplateDetailView.as_view(), name='template-detail'),
    path('templates/<uuid:pk>/clone/', FormattingTemplateCloneView.as_view(), name='template-clone'),
    path('projects/<uuid:project_id>/template/', ProjectTemplateAssignmentView.as_view(), name='project-template-assignment'),
    path('projects/<uuid:project_id>/preliminary-pages/', PreliminaryPagesView.as_view(), name='project-preliminary-pages'),
    path('guidelines/ingest/', GuidelineIngestView.as_view(), name='guideline-ingest'),
    path('guidelines/<uuid:source_id>/approve/', GuidelineApproveView.as_view(), name='guideline-approve'),
    path('projects/<uuid:project_id>/compliance/', ComplianceAuditView.as_view(), name='project-compliance-audit'),
    path('projects/<uuid:project_id>/autoformat/preview/', AutoformatPreviewView.as_view(), name='project-autoformat-preview'),
    path('projects/<uuid:project_id>/autoformat/apply/', AutoformatApplyView.as_view(), name='project-autoformat-apply'),
    path('projects/<uuid:project_id>/autoformat/rollback/', AutoformatRollbackView.as_view(), name='project-autoformat-rollback'),
    path('journals/', JournalProfileListView.as_view(), name='journal-profile-list'),
    path('projects/<uuid:project_id>/metadata/', ManuscriptMetadataView.as_view(), name='project-manuscript-metadata'),
    path('projects/<uuid:project_id>/submission-readiness/', SubmissionReadinessView.as_view(), name='project-submission-readiness'),

    # =========================================================================
    # STAGE 8: PROFESSIONAL WORD & PDF EXPORT, PAGINATION & EXPORT QA
    # =========================================================================
    path('projects/<uuid:project_id>/export/', ProjectExportInitiateView.as_view(), name='project-export-initiate'),
    path('projects/<uuid:project_id>/exports/', ProjectExportListView.as_view(), name='project-export-list'),
    path('projects/<uuid:project_id>/export-preview/', ProjectExportPreviewView.as_view(), name='project-export-preview'),
    path('export-jobs/<uuid:job_id>/', ExportJobStatusView.as_view(), name='export-job-status'),
    path('exports/<uuid:export_id>/', DocumentExportDetailView.as_view(), name='document-export-detail'),
    path('exports/<uuid:export_id>/download/', DocumentExportDownloadView.as_view(), name='document-export-download'),
    path('exports/<uuid:export_id>/validate/', DocumentExportValidationView.as_view(), name='document-export-validate'),
]