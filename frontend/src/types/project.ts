import { AcademicLevel } from './auth';

export type DocumentCategory = 'ACADEMIC_PROJECT' | 'RESEARCH_PAPER' | 'JOURNAL_ARTICLE';

export type CitationStyle = 'APA' | 'MLA' | 'CHICAGO' | 'HARVARD' | 'IEEE' | 'VANCOUVER';

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
