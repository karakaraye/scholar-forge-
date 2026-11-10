export type TemplateType = 'INSTITUTIONAL' | 'JOURNAL' | 'STANDARD';

export type TemplateDegreeLevel =
  | 'UNDERGRADUATE'
  | 'MASTERS'
  | 'PHD'
  | 'POSTDOC'
  | 'FACULTY';

export type TemplateDocumentType =
  | 'THESIS'
  | 'DISSERTATION'
  | 'RESEARCH_PROJECT'
  | 'RESEARCH_PAPER'
  | 'JOURNAL_ARTICLE'
  | 'SEMINAR_PAPER'
  | 'CONFERENCE_PAPER';

export type VerificationStatus =
  | 'OFFICIALLY_VERIFIED'
  | 'COMMUNITY_VERIFIED'
  | 'USER_CUSTOMIZED'
  | 'DRAFT'
  | 'ARCHIVED';

export type IssueSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFORMATIONAL';

export type RuleCategory =
  | 'PAGE_SETTINGS'
  | 'TYPOGRAPHY'
  | 'CHAPTER_STRUCTURE'
  | 'PAGINATION'
  | 'PRELIMINARY_PAGES'
  | 'TABLES_FIGURES'
  | 'CITATIONS_REFERENCES'
  | 'WORD_LIMITS'
  | 'METADATA';

export type JournalArticleType =
  | 'ORIGINAL_RESEARCH'
  | 'REVIEW_ARTICLE'
  | 'SYSTEMATIC_REVIEW'
  | 'CONCEPTUAL_THEORETICAL';

export interface AcademicInstitution {
  id: string;
  name: string;
  country: string;
  city?: string;
  code?: string;
  website?: string;
  is_verified: boolean;
  verification_source?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicFaculty {
  id: string;
  institution: string;
  institution_name: string;
  name: string;
  code?: string;
  created_at: string;
}

export interface AcademicDepartment {
  id: string;
  faculty?: string;
  faculty_name?: string;
  institution_id: string;
  institution_name: string;
  name: string;
  code?: string;
  created_at: string;
}

export interface PageSettingsConfig {
  paper_size: string;
  orientation: string;
  margins_inches: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    gutter: number;
  };
}

export interface HeadingTypographyConfig {
  font_size_pt: number;
  bold: boolean;
  italic: boolean;
  case: 'UPPERCASE' | 'TITLE_CASE' | 'SENTENCE_CASE';
  alignment: 'LEFT' | 'CENTER' | 'JUSTIFY';
  space_before_pt: number;
  space_after_pt: number;
}

export interface TypographyConfig {
  primary_font: string;
  fallback_fonts: string[];
  base_font_size_pt: number;
  line_spacing: number;
  paragraph_spacing_pt: number;
  first_line_indent_inches: number;
  blockquote_indent_inches: number;
  heading_1: HeadingTypographyConfig;
  heading_2: HeadingTypographyConfig;
  heading_3: HeadingTypographyConfig;
}

export interface ChapterStructureConfig {
  chapter_numbering_style: 'ARABIC' | 'ROMAN' | 'WORDS';
  section_numbering_depth: number;
  heading_case: 'UPPERCASE' | 'TITLE_CASE';
  page_break_before_chapter: boolean;
}

export interface PaginationConfig {
  preliminary_format: 'ROMAN_LOWER' | 'ROMAN_UPPER';
  main_format: 'ARABIC';
  prelim_position: 'BOTTOM_CENTER' | 'TOP_RIGHT' | 'BOTTOM_RIGHT';
  main_position: 'BOTTOM_CENTER' | 'TOP_RIGHT' | 'BOTTOM_RIGHT';
  show_on_first_page: boolean;
}

export interface PreliminaryPagesConfig {
  required_pages: string[];
  order: string[];
}

export interface TablesFiguresConfig {
  table_caption_placement: 'ABOVE' | 'BELOW';
  figure_caption_placement: 'ABOVE' | 'BELOW';
  numbering_format: 'SEQUENTIAL' | 'CHAPTER_BASED';
  notes_placement: 'BELOW';
}

export interface CitationsConfig {
  style: string;
  hanging_indent_inches: number;
  doi_required: boolean;
  url_format: string;
}

export interface WordLimitsConfig {
  abstract_min_words: number;
  abstract_max_words: number;
  manuscript_max_words?: number;
}

export interface RulesConfig {
  page_settings: PageSettingsConfig;
  typography: TypographyConfig;
  chapter_structure: ChapterStructureConfig;
  pagination: PaginationConfig;
  preliminary_pages: PreliminaryPagesConfig;
  tables_figures: TablesFiguresConfig;
  citations: CitationsConfig;
  word_limits: WordLimitsConfig;
}

export interface TemplateVersion {
  id: string;
  template: string;
  version_number: number;
  rules_config: RulesConfig;
  changelog: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface FormattingTemplate {
  id: string;
  name: string;
  description: string;
  template_type: TemplateType;
  institution?: string;
  institution_name?: string;
  faculty?: string;
  faculty_name?: string;
  department?: string;
  department_name?: string;
  degree_level: TemplateDegreeLevel;
  document_type: TemplateDocumentType;
  citation_style: string;
  verification_status: VerificationStatus;
  guideline_version?: string;
  verification_evidence_summary?: string;
  verification_source_url?: string;
  verification_date?: string;
  is_default: boolean;
  is_shared: boolean;
  version_count: number;
  active_version?: TemplateVersion;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalProfile {
  id: string;
  journal_name: string;
  publisher: string;
  issn_print?: string;
  issn_electronic?: string;
  submission_url?: string;
  author_guidelines_url?: string;
  article_type: JournalArticleType;
  guideline_version?: string;
  verification_evidence_summary?: string;
  word_limit?: number;
  abstract_word_limit?: number;
  keywords_limit?: number;
  reference_limit?: number;
  double_blind_review: boolean;
  requires_highlights: boolean;
  ethics_statement_required: boolean;
  conflict_of_interest_required: boolean;
  data_availability_required: boolean;
  funding_statement_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthorAffiliation {
  author_name: string;
  email?: string;
  affiliation: string;
  department?: string;
  country?: string;
  is_corresponding?: boolean;
}

export interface OrcidIdentifier {
  name: string;
  orcid: string;
}

export interface ManuscriptMetadata {
  id: string;
  project: string;
  corresponding_author_name?: string;
  corresponding_author_email?: string;
  corresponding_author_phone?: string;
  affiliations: AuthorAffiliation[];
  orcid_identifiers: OrcidIdentifier[];
  conflict_of_interest_statement?: string;
  data_availability_statement?: string;
  ethics_approval_statement?: string;
  study_design_type?: string;
  involves_human_or_animal_subjects?: boolean;
  ethics_exemption_reason?: string;
  funding_grant_details?: string;
  acknowledgements_text?: string;
  submission_readiness_score: number;
  created_at: string;
  updated_at: string;
}

export interface FormattingIssue {
  id: string;
  rule_key: string;
  rule_category: RuleCategory;
  severity: IssueSeverity;
  current_value: string;
  expected_value: string;
  location: string;
  suggested_fix: string;
  fix_available: boolean;
  resolved_at?: string;
  is_resolved: boolean;
}

export interface FormattingValidation {
  id: string;
  project: string;
  template_version?: string;
  audited_by?: string;
  total_issues: number;
  critical_count: number;
  major_count: number;
  minor_count: number;
  info_count: number;
  overall_status: 'COMPLIANT' | 'NEEDS_CORRECTION' | 'NON_COMPLIANT';
  layout_verified: boolean;
  audited_at: string;
  issues: FormattingIssue[];
}

export interface FormattingChange {
  id: string;
  section: string;
  rule_key: string;
  field_modified: string;
  previous_value: string;
  new_value: string;
  is_reverted: boolean;
  created_at: string;
}

export interface PrelimPageDetail {
  title: string;
  html: string;
  is_required: boolean;
  roman_page: string;
}

export interface PreliminaryPagesResult {
  project_id: string;
  generated_at: string;
  preliminary_pages: Record<string, PrelimPageDetail>;
  pagination_style: string;
}

export interface AutoformatProposalChange {
  rule_key: string;
  field: string;
  description: string;
  before: string;
  after: string;
}

export interface AutoformatProposal {
  section_id: string;
  section_title: string;
  order_index: number;
  changes: AutoformatProposalChange[];
}

export interface AutoformatPreviewResult {
  project_id: string;
  total_sections_analyzed: number;
  sections_needing_formatting: number;
  total_proposed_changes: number;
  proposed_changes: AutoformatProposal[];
}

export interface AutoformatApplyResult {
  status: string;
  sections_formatted: number;
  changes_applied: number;
  snapshot_version_number: number;
  message: string;
}

export interface AutoformatRollbackResult {
  status: string;
  restored_version_number: number;
  new_current_version_number: number;
  message: string;
}

export interface ReadinessCheck {
  name: string;
  passed: boolean;
  severity: IssueSeverity;
  message: string;
  fix_route: string;
}

export interface SubmissionReadinessResult {
  project_id: string;
  journal_name: string;
  publisher: string;
  article_type: JournalArticleType;
  readiness_score: number;
  is_ready: boolean;
  checks: ReadinessCheck[];
}

export interface CandidateRule {
  category: RuleCategory;
  rule_key: string;
  parameter: string;
  extracted_value: any;
  confidence: number;
  source_excerpt: string;
}

export interface GuidelineIngestionResponse {
  source_id: string;
  institution_detected?: string;
  degree_level?: string;
  confidence_score: number;
  candidate_rules: CandidateRule[];
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}



// =====================================================================
// ISO 7064 Mod 11-2 ORCID Checksum Algorithm
// =====================================================================

export function validateOrcidChecksum(orcid: string): boolean {
  if (!orcid || typeof orcid !== 'string') return false;
  const cleaned = orcid.trim().replace(/-/g, '');
  if (cleaned.length !== 16) return false;
  const digits = cleaned.slice(0, 15);
  if (!/^\d{15}$/.test(digits)) return false;
  const checkChar = cleaned[15].toUpperCase();
  let total = 0;
  for (let i = 0; i < 15; i++) {
    total = (total + parseInt(digits[i], 10)) * 2;
  }
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const expected = result === 10 ? 'X' : String(result);
  return checkChar === expected;
}

export function isValidOrcid(orcid: string): boolean {
  if (!orcid || typeof orcid !== 'string') return false;
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid.trim())) return false;
  return validateOrcidChecksum(orcid);
}
