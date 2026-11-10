import { AcademicLevel } from './auth';

export type DocumentCategory = 'ACADEMIC_PROJECT' | 'RESEARCH_PAPER' | 'JOURNAL_ARTICLE';

export type CitationStyle =
  | 'APA'
  | 'MLA'
  | 'CHICAGO'
  | 'HARVARD'
  | 'IEEE'
  | 'VANCOUVER'
  | 'APA_7TH'
  | 'MLA_9TH'
  | 'CHICAGO_17TH';

export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface AcademicDiscipline {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  is_active: boolean;
}

export interface ResearchRequirements {
  id: string;
  research_methodology?: string;
  research_objectives?: string;
  supervisor_requirements?: string;
  target_word_count?: number;
  deadline?: string;
  custom_parameters?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  order_index: number;
  section_type: string;
  content: string;
  word_count: number;
  parent_section?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchDocument {
  id: string;
  title: string;
  document_type: string;
  current_version_number: number;
  sections: DocumentSection[];
  created_at: string;
  updated_at: string;
}

export interface ResearchProject {
  id: string;
  title: string;
  document_category: DocumentCategory;
  document_subtype: string;
  academic_level: AcademicLevel;
  status: ProjectStatus;
  discipline: string;
  discipline_name?: string;
  discipline_category?: string;
  discipline_details?: AcademicDiscipline;
  institution?: string;
  country: string;
  preferred_language: string;
  citation_style: CitationStyle;
  requirements?: ResearchRequirements;
  documents?: ResearchDocument[];
  owner_name?: string;
  workspace_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  draft_projects: number;
  archived_projects: number;
  recently_updated: ResearchProject[];
}

export interface CreateProjectPayload {
  title: string;
  document_category: DocumentCategory;
  document_subtype: string;
  academic_level: AcademicLevel;
  discipline_id: string;
  institution?: string;
  country: string;
  preferred_language: string;
  citation_style: CitationStyle;
  requirements?: {
    research_methodology?: string;
    research_objectives?: string;
    supervisor_requirements?: string;
    target_word_count?: number;
    deadline?: string;
  };
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  snapshot_data: {
    document_title?: string;
    version_number?: number;
    sections?: Array<{
      id: string;
      title: string;
      section_type: string;
      order_index: number;
      content: string;
      word_count: number;
      parent_section_id?: string | null;
    }>;
  };
  created_by?: string;
  created_by_name?: string;
  change_summary?: string;
  created_at: string;
}

export type ConsistencyType = 'WARNING' | 'SUGGESTION' | 'GOOD';

export interface ConsistencyDiagnostic {
  id: string;
  type: ConsistencyType;
  category: string;
  title: string;
  message: string;
  recommendation: string;
}

export interface ConsistencyReport {
  project_id: string;
  consistency_score: number;
  diagnostics: ConsistencyDiagnostic[];
  total_checks: number;
  warnings_count: number;
  suggestions_count: number;
  status: 'HEALTHY' | 'ATTENTION_RECOMMENDED';
}

export type AIAction =
  | 'GENERATE_SECTION'
  | 'IMPROVE_WRITING'
  | 'EXPAND_WRITING'
  | 'SUMMARIZE_CONTENT'
  | 'REWRITE_CONTENT'
  | 'SUGGEST_OBJECTIVES'
  | 'SUGGEST_QUESTIONS'
  | 'SUGGEST_HYPOTHESES'
  | 'SUGGEST_FRAMEWORK'
  | 'SUGGEST_OUTLINE';

export interface AIGeneratePayload {
  project_id: string;
  action: AIAction;
  section_id?: string;
  selected_text?: string;
  instructions?: string;
  rewrite_style?: 'formal' | 'concise' | 'detailed' | 'clearer' | 'flow';
}

export interface AIGenerateResponse {
  job_id: string;
  status: 'COMPLETED' | 'FAILED';
  action: string;
  suggestion?: string | null;
  model?: string;
  error?: string;
  integrity_notice?: string;
}

export interface StructureTemplate {
  id: string;
  name: string;
  disciplines: string[];
  categories: string[];
  description: string;
  preview: string[];
}

// ============================================================================
// STAGE 3: SCHOLARLY DISCOVERY, CITATIONS & LITERATURE INTELLIGENCE
// ============================================================================

export type VerificationStatus =
  | 'METADATA_VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'METADATA_CONFLICT'
  | 'WITHDRAWN_OR_RETRACTED';

export type SourceType =
  | 'JOURNAL'
  | 'BOOK'
  | 'CONFERENCE'
  | 'THESIS'
  | 'REPORT'
  | 'WEBSITE'
  | 'OTHER';

export interface SourceVerification {
  id: string;
  verification_status: VerificationStatus;
  verified_by_provider: string;
  comparison_details: {
    title_similarity?: number;
    author_overlap?: number;
    year_match?: boolean;
    year_difference?: number | null;
    registry_title?: string;
    registry_doi?: string;
    registry_year?: number;
    registry_venue?: string;
    retraction_detected?: boolean;
    retraction_details?: string;
  };
  retraction_detected: boolean;
  error_details?: string;
  verified_at: string;
}

export interface ResearchSource {
  id: string;
  title: string;
  authors: string[];
  publication_year?: number | null;
  source_type: SourceType;
  journal_or_publisher?: string;
  journal_name?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  verification_status: VerificationStatus;
  is_open_access: boolean;
  citation_count: number;
  provenance: string[];
  retracted: boolean;
  retraction_details?: string;
  external_id?: string;
  openalex_id?: string;
  crossref_doi?: string;
  semantic_scholar_id?: string;
  reading_status?: string;
  tags?: string[];
  bibtex?: string;
  keywords?: string[];
  verifications?: SourceVerification[];
  created_at?: string;
  updated_at?: string;
}

export interface ProjectSource {
  id: string;
  project: string;
  source: ResearchSource;
  notes?: string;
  relevance_score: number;
  is_annotated: boolean;
  tags?: string[];
  is_favorite: boolean;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  id: string;
  project: string;
  source: string;
  source_title?: string;
  citation_style: CitationStyle;
  in_text_format: string;
  in_text_narrative?: string;
  citation_number?: number | null;
  page_reference?: string;
  full_reference: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchCollectionItem {
  id: string;
  collection: string;
  source: ResearchSource;
  notes?: string;
  tags?: string[];
  is_favorite: boolean;
  is_read: boolean;
  added_at: string;
}

export interface ResearchCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  color_tag?: string;
  item_count?: number;
  items_count?: number;
  items?: ResearchCollectionItem[];
  created_at: string;
  updated_at: string;
}

export interface SourceDocument {
  id: string;
  file_name: string;
  original_filename?: string;
  file_type: 'PDF' | 'DOCX' | 'BIBTEX' | 'RIS';
  file_size: number;
  word_count?: number;
  extraction_status: 'PENDING' | 'EXTRACTED' | 'FAILED' | 'UNSUPPORTED';
  extracted_text?: string;
  extracted_text_preview?: string;
  page_count: number;
  is_machine_readable: boolean;
  metadata?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type ReviewType = 'CONCEPTUAL' | 'THEORETICAL' | 'EMPIRICAL' | 'SYSTEMATIC';

export interface LiteratureReviewNote {
  id: string;
  project: string;
  review_type: ReviewType;
  title: string;
  content: Record<string, unknown>;
  sources_details?: ResearchSource[];
  created_at: string;
  updated_at: string;
}

export interface CitationAuditDiagnostic {
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  issue: string;
  issue_type?: string;
  message?: string;
  affected_section: string;
  source_id?: string;
  source_title?: string;
  suggested_correction: string;
  suggestion?: string;
}

export interface CitationAuditReport {
  integrity_score: number;
  total_citations?: number;
  in_text_count?: number;
  bibliography_count?: number;
  discrepancies_count?: number;
  total_in_text_citations: number;
  total_bibliography_entries: number;
  uncited_bibliography_count: number;
  missing_bibliography_count: number;
  unverified_count: number;
  retracted_count: number;
  conflict_count: number;
  diagnostics: CitationAuditDiagnostic[];
  disclaimer: string;
}

export interface DiscoveryResult {
  id?: string;
  title: string;
  authors: string[];
  publication_year?: number | null;
  source_type: SourceType;
  publication_type?: string;
  journal_or_publisher?: string;
  journal_or_venue?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  landing_page_url?: string;
  abstract?: string;
  citation_count: number;
  is_open_access: boolean;
  provenance: string[];
  metadata_provenance?: string;
  verification_status?: VerificationStatus;
  retracted: boolean;
  retraction_details?: string;
  external_id?: string;
  openalex_id?: string;
  semantic_scholar_id?: string;
}

export interface DiscoverySearchResponse {
  query: string;
  provider: string;
  page: number;
  per_page: number;
  total_count: number;
  results: DiscoveryResult[];
}

export type LiteratureTaskType =
  | 'SUMMARIZE_PUBLICATION'
  | 'EXTRACT_OBJECTIVES'
  | 'IDENTIFY_METHODOLOGY'
  | 'SUMMARIZE_FINDINGS'
  | 'IDENTIFY_LIMITATIONS'
  | 'COMPARE_STUDIES'
  | 'ORGANIZE_LITERATURE'
  | 'SUGGEST_RESEARCH_GAPS'
  | 'CREATE_LITERATURE_SYNTHESIS'
  | 'EVIDENCE_ALIGNMENT';

export interface LiteratureAnalyzeResponse {
  job_id: string;
  task_type: string;
  status: 'COMPLETED' | 'FAILED';
  evidence_basis: 'FULL_TEXT' | 'ABSTRACT' | 'METADATA_ONLY' | 'INSUFFICIENT';
  content: string;
  sources_analyzed: string[];
  academic_integrity_verified: boolean;
  error?: string;
}

// ============================================================================
// STAGE 4: METHODOLOGY, INSTRUMENTS, DATA, STATISTICS, QUALITATIVE
// ============================================================================

export type MethodologyType = 'QUANTITATIVE' | 'QUALITATIVE' | 'MIXED_METHODS' | 'DISCIPLINE_SPECIFIC';

export interface ResearchMethodology {
  id: string;
  project: string;
  methodology_type: MethodologyType;
  design_category: string;
  design_name: string;
  epistemological_stance?: string;
  justification?: string;
  assumptions: string[];
  limitations: string[];
  sampling_strategy?: string;
  target_population?: string;
  sample_size?: number;
  unit_of_analysis?: string;
  data_collection_method?: string;
  planned_analyses: string[];
  ethical_considerations?: string;
  approved_by_researcher: boolean;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export type VariableRole = 'INDEPENDENT' | 'DEPENDENT' | 'MEDIATING' | 'MODERATING' | 'CONTROL';
export type VariableType = 'NOMINAL' | 'ORDINAL' | 'INTERVAL' | 'RATIO';

export interface ResearchVariable {
  id: string;
  project: string;
  name: string;
  variable_role: VariableRole;
  variable_type: VariableType;
  conceptual_definition?: string;
  operational_definition?: string;
  measurement_scale?: string;
  unit_of_measurement?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface SamplingCalculationResult {
  formula: string;
  calculated_sample_size: number;
  inflated_sample_size: number;
  population_size?: number;
  margin_of_error?: number;
  confidence_level?: number;
  estimated_proportion?: number;
  nonresponse_inflation_rate?: number;
  rejection_of_statistical_formulas?: string;
  recommended_sample_range?: [number, number];
  saturation_guidelines?: string[];
  formula_details?: Record<string, unknown>;
}

export interface InstrumentItem {
  id: string;
  instrument: string;
  order_index: number;
  item_code: string;
  construct: string;
  construct_name?: string;
  dimension?: string;
  text: string;
  item_text?: string;
  item_type: string;
  scale_type: string;
  options: Array<{ value: number | string; label: string } | string>;
  is_reverse_coded: boolean;
  polarity: 'POSITIVE' | 'NEGATIVE';
  help_text?: string;
  created_at: string;
  updated_at: string;
}

export interface ResearchInstrument {
  id: string;
  project: string;
  title: string;
  instrument_type: string;
  instructions: string;
  description?: string;
  confidentiality_notice: string;
  is_validated: boolean;
  reliability_estimate?: number;
  validation_notes?: string;
  items: InstrumentItem[];
  created_at: string;
  updated_at: string;
}

export interface DatasetColumnProfile {
  name: string;
  inferred_type: string;
  total_count: number;
  valid_count: number;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  sample_values: string[];
  type?: string;
  mean?: number;
  median?: number;
  mode?: string | number;
  min?: number;
  max?: number;
  stats?: {
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    std_dev?: number;
    variance?: number;
    q1?: number;
    q3?: number;
    iqr?: number;
  };
}

export interface DatasetVersion {
  id: string;
  dataset: string;
  version_number: number;
  is_current: boolean;
  row_count: number;
  column_count: number;
  columns: string[];
  schema_summary: Record<string, DatasetColumnProfile>;
  data_payload: Array<Record<string, unknown>>;
  transformation_applied?: string;
  created_at: string;
}

export interface ResearchDataset {
  id: string;
  project: string;
  name: string;
  file_format: string;
  original_filename: string;
  file_size_bytes: number;
  row_count: number;
  column_count: number;
  has_formula_sanitized: boolean;
  formula_sanitization_count: number;
  current_version_number?: number;
  columns_schema?: {
    columns: string[];
    profiles: Record<string, any>;
    has_formula_sanitized?: boolean;
    sanitized_cells_count?: number;
  };
  versions: DatasetVersion[];
  current_version?: DatasetVersion | null;
  created_at: string;
  updated_at: string;
}

export interface StatisticalResult {
  id: string;
  project: string;
  dataset?: string;
  test_type: string;
  analysis_type?: string;
  test_name: string;
  label?: string;
  parameters: Record<string, unknown>;
  output_data: Record<string, unknown>;
  metrics?: Record<string, any>;
  sample_size?: number;
  p_value?: number;
  p_values?: Record<string, number>;
  is_significant?: boolean;
  effect_sizes?: Record<string, any>;
  apa_table_html?: string;
  apa_summary?: string;
  apa_format_string?: string;
  interpretation_notes?: string;
  computed_at: string;
}

export interface HypothesisTest {
  id: string;
  project: string;
  statistical_result?: string;
  statistical_result_details?: StatisticalResult;
  hypothesis_statement: string;
  hypothesis_type: string;
  test_type?: string;
  decision: 'REJECT_NULL' | 'FAIL_TO_REJECT_NULL' | 'INCONCLUSIVE';
  test_statistic?: number;
  test_statistic_value?: number;
  p_value?: number;
  degrees_of_freedom?: string;
  effect_size?: number;
  effect_size_value?: number;
  effect_size_type?: string;
  findings_summary?: string;
  apa_format_string?: string;
  substantive_interpretation?: string;
  evaluated_at: string;
}

export interface QualitativeTranscript {
  id: string;
  project: string;
  title: string;
  participant_identifier: string;
  interview_date?: string;
  transcript_type: string;
  content: string;
  word_count: number;
  excerpts: EvidenceExcerpt[];
  created_at: string;
}

export interface QualitativeCode {
  id: string;
  project: string;
  name: string;
  description?: string;
  color: string;
  category: string;
  parent_code?: string | null;
  excerpt_count: number;
  created_at: string;
}

export interface EvidenceExcerpt {
  id: string;
  transcript: string;
  code: string;
  code_name?: string;
  code_color?: string;
  transcript_title?: string;
  start_char: number;
  end_char: number;
  quote_text: string;
  speaker?: string;
  researcher_memo?: string;
  is_verified_verbatim: boolean;
  created_at: string;
}

export interface QualitativeTheme {
  id: string;
  project: string;
  name: string;
  description: string;
  narrative_summary?: string;
  saturation_level: string;
  excerpts_details: EvidenceExcerpt[];
  created_at: string;
  updated_at: string;
}

export interface ResearchVisualization {
  id: string;
  project: string;
  title: string;
  visualization_type: string;
  config: Record<string, unknown>;
  notes?: string;
  created_at: string;
}





// ==========================================
// STAGE 5 WORKFLOW, ASSEMBLY, QA & REVIEW TYPES
// ==========================================

export type WorkflowStageKey =
  | 'SETUP'
  | 'PLANNING'
  | 'LITERATURE'
  | 'FRAMEWORK'
  | 'METHODOLOGY'
  | 'INSTRUMENT'
  | 'DATA_COLLECTION'
  | 'DATA_ANALYSIS'
  | 'RESULTS'
  | 'MANUSCRIPT'
  | 'QUALITY_ASSURANCE'
  | 'REVIEW';

export type WorkflowStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface WorkflowStep {
  id: string;
  stage_key: WorkflowStageKey;
  title: string;
  description: string;
  status: WorkflowStatus;
  progress_pct: number;
  order_index: number;
  is_required: boolean;
  notes?: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchWorkflow {
  id: string;
  project: string;
  overall_progress: number;
  current_stage: WorkflowStageKey;
  stages: WorkflowStep[];
  created_at: string;
  updated_at: string;
}

export type DecisionType =
  | 'PROBLEM_STATEMENT'
  | 'RESEARCH_AIM'
  | 'RESEARCH_OBJECTIVE'
  | 'RESEARCH_QUESTION'
  | 'HYPOTHESIS'
  | 'VARIABLE'
  | 'METHODOLOGY_CHOICE'
  | 'SAMPLING_DESIGN'
  | 'INSTRUMENT_DESIGN'
  | 'STATISTICAL_TEST'
  | 'SCOPE_BOUNDARY'
  | 'LIMITATION';

export interface ResearchDecision {
  id: string;
  project: string;
  decision_type: DecisionType;
  title: string;
  statement: string;
  rationalization: string;
  is_approved: boolean;
  approved_by_name?: string;
  approved_at?: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AlignmentIssue {
  id: string;
  node_source: string;
  node_target: string;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  description: string;
  recommendation: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ResearchAlignmentMatrix {
  id: string;
  project: string;
  alignment_score: number;
  matrix_data: Record<string, unknown>;
  issues: AlignmentIssue[];
  unresolved_count: number;
  created_at: string;
  updated_at: string;
}

export interface ManuscriptAssembly {
  id: string;
  project: string;
  version_number: number;
  citation_style: CitationStyle;
  options: {
    include_preliminary_pages?: boolean;
    include_table_of_contents?: boolean;
    include_list_of_tables?: boolean;
    include_list_of_figures?: boolean;
    include_references?: boolean;
    include_appendices?: boolean;
  };
  total_words: number;
  reference_count: number;
  table_count: number;
  figure_count: number;
  status: 'PENDING' | 'COMPILING' | 'COMPLETED' | 'FAILED';
  compiled_html: string;
  error_message?: string;
  created_at: string;
}

export interface ValidationIssue {
  id: string;
  category:
    | 'STRUCTURAL_QUALITY'
    | 'RESEARCH_CONSISTENCY'
    | 'CITATION_INTEGRITY'
    | 'EVIDENCE_VALIDITY'
    | 'WRITING_QUALITY'
    | 'MANUSCRIPT_COMPLETENESS';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  section_name?: string;
  message: string;
  academic_suggestion: string;
  created_at: string;
}

export interface ManuscriptValidation {
  id: string;
  project: string;
  overall_score: number;
  readiness_rating: 'NOT_READY' | 'NEEDS_REVISION' | 'SUBMISSION_READY' | 'EXEMPLARY';
  category_scores: {
    STRUCTURAL_QUALITY?: number;
    RESEARCH_CONSISTENCY?: number;
    CITATION_INTEGRITY?: number;
    EVIDENCE_VALIDITY?: number;
    WRITING_QUALITY?: number;
    MANUSCRIPT_COMPLETENESS?: number;
    [key: string]: number | undefined;
  };
  issues: ValidationIssue[];
  total_issues_count: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  disclaimer: string;
  created_at: string;
}

export type ReviewTaskType =
  | 'REVIEW_FULL_MANUSCRIPT'
  | 'REVIEW_CHAPTER'
  | 'CHECK_RESEARCH_ALIGNMENT'
  | 'IDENTIFY_MISSING_SECTIONS'
  | 'REVIEW_ARGUMENT_COHERENCE'
  | 'REVIEW_LITERATURE_INTEGRATION'
  | 'REVIEW_RESULTS_DISCUSSION'
  | 'SUGGEST_ABSTRACT'
  | 'SUGGEST_CONCLUSION'
  | 'PREPARE_REVIEW_CHECKLIST';

export interface ReviewRecord {
  id: string;
  project: string;
  reviewer_name: string;
  review_stage: 'DRAFT' | 'READY_FOR_INTERNAL_REVIEW' | 'REVISIONS_REQUIRED' | 'APPROVED_DRAFT';
  feedback: string;
  checklist_results: Record<string, boolean>;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProvenanceTrace {
  project_id: string;
  tables_to_datasets: Array<{
    table_id: string;
    section: string;
    dataset_id?: string;
    dataset_name?: string;
  }>;
  citations_to_sources: Array<{
    citation_text: string;
    source_id?: string;
    source_title?: string;
    doi?: string;
    is_verified?: boolean;
  }>;
  stale_sections: Array<{
    section_id: string;
    section_title: string;
    reason: string;
  }>;
}

// ==============================================================================
// STAGE 6: ACADEMIC COLLABORATION & SUPERVISOR REVIEW TYPES
// ==============================================================================

export type CollaboratorRole =
  | 'PROJECT_OWNER'
  | 'SUPERVISOR'
  | 'CO_AUTHOR'
  | 'ACADEMIC_REVIEWER'
  | 'VIEWER';

export interface ProjectCollaborator {
  id: string;
  project: string;
  user: string;
  user_email: string;
  user_name: string;
  role: CollaboratorRole;
  assigned_sections: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectInvitation {
  id: string;
  project: string;
  invited_by: string;
  invited_by_name: string;
  invitee_email: string;
  role: CollaboratorRole;
  assigned_sections: string[];
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
  expires_at: string;
  accepted_at?: string;
  is_expired: boolean;
  created_at: string;
}

export type CommentStatus = 'OPEN' | 'RESOLVED' | 'ORPHANED';

export interface CommentReply {
  id: string;
  comment: string;
  author: string;
  author_name: string;
  author_email: string;
  content: string;
  created_at: string;
}

export interface ManuscriptComment {
  id: string;
  project: string;
  document: string;
  section?: string;
  section_title?: string;
  author: string;
  author_name: string;
  author_email: string;
  content: string;
  anchor_text: string;
  anchor_prefix?: string;
  anchor_suffix?: string;
  start_offset: number;
  end_offset: number;
  status: CommentStatus;
  replies: CommentReply[];
  created_at: string;
  updated_at: string;
}

export type FeedbackSourceType =
  | 'MANUAL_ENTRY'
  | 'DOCX_UPLOAD'
  | 'PDF_UPLOAD'
  | 'INLINE_THREAD_IMPORT';

export interface SupervisorFeedback {
  id: string;
  project: string;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
  title?: string;
  source_type: FeedbackSourceType;
  raw_content: string;
  file_attachment?: string;
  extracted_comments: Array<{
    author?: string;
    text: string;
    index?: number;
    source?: string;
  }>;
  has_unextracted_annotations: boolean;
  created_at: string;
}

export type CorrectionCategory =
  | 'THEORETICAL_FRAMEWORK'
  | 'CONCEPTUAL_REVIEW'
  | 'EMPIRICAL_LITERATURE'
  | 'RESEARCH_METHODOLOGY'
  | 'STATISTICAL_INTERPRETATION'
  | 'RESEARCH_OBJECTIVES'
  | 'RESEARCH_QUESTIONS'
  | 'HYPOTHESIS_FORMULATION'
  | 'CITATION_CORRECTION'
  | 'ACADEMIC_TONE'
  | 'GRAMMAR_AND_CLARITY'
  | 'MANUSCRIPT_STRUCTURE'
  | 'FORMATTING'
  | 'UNSUPPORTED_CLAIMS'
  | 'OTHER';

export type CorrectionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CorrectionTaskStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PROPOSED'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESOLVED'
  | 'REOPENED';

export interface CorrectionTask {
  id: string;
  project: string;
  feedback_source?: string;
  linked_comment?: string;
  section?: string;
  section_title?: string;
  category: CorrectionCategory;
  priority: CorrectionPriority;
  status: CorrectionTaskStatus;
  title?: string;
  supervisor_instruction?: string;
  instruction?: string;
  original_text: string;
  proposed_text: string;
  expected_base_version?: number;
  is_stale_after_subsequent_edit: boolean;
  created_at: string;
  updated_at: string;
}

export type RevisionCategory = 'MAJOR' | 'MINOR' | 'CLARIFICATION' | 'REJECT_REQUEST';

export interface JournalReviewerResponse {
  id: string;
  project: string;
  reviewer_label: string;
  comment_number: number;
  original_comment: string;
  revision_category: RevisionCategory;
  target_section?: string;
  section_title?: string;
  linked_correction_task?: string;
  author_response: string;
  is_verified_applied: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiffChunk {
  type: 'equal' | 'added' | 'deleted';
  text: string;
}

export interface WordDiffResult {
  chunks: DiffChunk[];
  words_added: number;
  words_deleted: number;
  words_unchanged: number;
  net_word_change: number;
  old_total_words: number;
  new_total_words: number;
}

export interface ParagraphDiffItem {
  type: 'equal' | 'added' | 'deleted';
  content: string;
}

export interface VersionDiffComparison {
  document_id: string;
  base_version: number;
  target_version: number;
  word_diff: WordDiffResult;
  paragraph_diff: ParagraphDiffItem[];
}

export interface JournalResponseMatrixDoc {
  project_id: string;
  total_comments: number;
  verified_applied_count: number;
  compliance_rate_percent: number;
  matrix_by_reviewer: Record<string, Array<{
    id: string;
    comment_number: number;
    original_comment: string;
    revision_category: string;
    target_section: string;
    author_response: string;
    is_verified_applied: boolean;
  }>>;
  formatted_markdown: string;
}

export interface SupervisorProjectItem {
  project_id: string;
  title: string;
  role: string;
  student_name: string;
  student_email: string;
  discipline: string;
  academic_level: string;
  pending_tasks_count: number;
  open_comments_count: number;
  last_active?: string;
}

export interface CollaborationAuditEvent {
  id: string;
  project: string;
  actor: string;
  actor_name: string;
  event_type: string;
  details: Record<string, unknown>;
  timestamp: string;
}

