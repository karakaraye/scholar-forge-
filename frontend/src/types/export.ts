/**
 * Stage 8 Document Export, Rendering, Pagination & QA Types
 */

export type DocumentExportFormat = 'DOCX' | 'PDF';

export type ExportJobStatus = 'PENDING' | 'PROCESSING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';

export type ExportOverallRating = 'EXCELLENT' | 'ACCEPTABLE' | 'NEEDS_ATTENTION' | 'FAILED';

export type ExportIssueCategory = 'STRUCTURE' | 'LAYOUT' | 'CONTENT' | 'INTEGRITY';

export type ExportIssueSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFORMATIONAL' | 'NOT_VERIFIED';

export interface ExportIssue {
  id: string;
  category: ExportIssueCategory;
  severity: ExportIssueSeverity;
  message: string;
  page_number?: number;
  location?: string;
  suggested_action?: string;
  created_at: string;
}

export interface ExportValidation {
  id: string;
  document_export: string;
  structure_valid: boolean;
  layout_valid: boolean;
  citations_valid: boolean;
  total_issues: number;
  overall_rating: ExportOverallRating;
  summary_notes: string;
  cross_check_diffs: Record<string, any>;
  metrics: Record<string, any>;
  issues: ExportIssue[];
  created_at: string;
}

export interface RenderedAsset {
  id: string;
  document_export: string;
  page_number: number;
  asset_type: string;
  image_file?: string;
  image_data_uri?: string;
  created_at: string;
}

export interface DocumentExport {
  id: string;
  project: string;
  document_version?: string;
  export_format: DocumentExportFormat;
  template_version?: string;
  citation_style: string;
  file_artifact?: string;
  file_name: string;
  file_checksum: string;
  file_size_bytes: number;
  page_count: number;
  heading_count: number;
  table_count: number;
  figure_count: number;
  reference_count: number;
  word_count: number;
  metadata_snapshot: Record<string, any>;
  is_verified: boolean;
  created_by?: string;
  created_by_name?: string;
  validation_report?: ExportValidation;
  rendered_assets?: RenderedAsset[];
  created_at: string;
  updated_at: string;
}

export interface ExportJob {
  id: string;
  project: string;
  export_format: DocumentExportFormat;
  template?: string;
  status: ExportJobStatus;
  progress_pct: number;
  status_message: string;
  error_message?: string;
  idempotency_key: string;
  document_export?: string;
  document_export_details?: DocumentExport;
  export_options: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ExportPreviewLayout {
  paper_size: string;
  primary_font: string;
  base_font_size_pt: number;
  line_spacing: number;
  binding_gutter_inches: number;
  prelim_page_num_format: string;
  main_page_num_format: string;
}

export interface ExportPreviewPrelimPage {
  page_key: string;
  title: string;
  suppress_page_number: boolean;
  paragraphs_count: number;
}

export interface ExportPreviewChapter {
  id: string;
  title: string;
  order_index: number;
  word_count: number;
  blocks_count: number;
}

export interface ExportPreview {
  project_id: string;
  title: string;
  author: string;
  institution: string;
  degree: string;
  citation_style: string;
  template_name: string;
  layout: ExportPreviewLayout;
  preliminary_pages: ExportPreviewPrelimPage[];
  chapters: ExportPreviewChapter[];
  bibliography_count: number;
  estimated_pages: number;
  total_words: number;
  total_tables: number;
  total_figures: number;
  total_equations: number;
}

export interface InitiateExportPayload {
  export_format: DocumentExportFormat;
  template_id?: string;
  citation_style?: string;
  idempotency_key?: string;
  document_version_id?: string;
}

