import {
  DocumentExport,
  ExportJob,
  ExportValidation,
  ExportPreview,
  InitiateExportPayload,
} from '@/types/export';
import {
  User,
  RegisterPayload,
  LoginPayload,
  ProfileUpdatePayload,
  ChangePasswordPayload,
} from '@/types/auth';
import {
  AcademicDiscipline,
  ResearchProject,
  DashboardStats,
  CreateProjectPayload,
  ResearchDocument,
  DocumentSection,
  DocumentVersion,
  StructureTemplate,
  AIGeneratePayload,
  AIGenerateResponse,
  ConsistencyReport,
  ResearchSource,
  ProjectSource,
  Citation,
  ResearchCollection,
  ResearchCollectionItem,
  SourceDocument,
  LiteratureReviewNote,
  CitationAuditReport,
  DiscoverySearchResponse,
  LiteratureTaskType,
  LiteratureAnalyzeResponse,
  ReviewType,
  VerificationStatus,
  ResearchMethodology,
  ResearchVariable,
  SamplingCalculationResult,
  ResearchInstrument,
  InstrumentItem,
  ResearchDataset,
  DatasetVersion,
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
  ManuscriptAssembly,
  ManuscriptValidation,
  ReviewRecord,
  ProvenanceTrace,
  ReviewTaskType,
  ProjectCollaborator,
  ProjectInvitation,
  InvitationSummary,
  ManuscriptComment,
  CommentReply,
  SupervisorFeedback,
  CorrectionTask,
  JournalReviewerResponse,
  VersionDiffComparison,
  JournalResponseMatrixDoc,
  SupervisorProjectItem,
  CollaborationAuditEvent,
  CollaboratorRole,
  FeedbackSourceType,
  CorrectionCategory,
  CorrectionPriority,
  RevisionCategory,
} from '@/types/project';
import {
  AcademicInstitution,
  AcademicDepartment,
  FormattingTemplate,
  TemplateVersion,
  JournalProfile,
  ManuscriptMetadata,
  FormattingValidation,
  PreliminaryPagesResult,
  AutoformatPreviewResult,
  AutoformatApplyResult,
  AutoformatRollbackResult,
  SubmissionReadinessResult,
  GuidelineIngestionResponse,
  RulesConfig,
} from '@/types/formatting';

// Base URL of the Django API, inlined at build time.
//   unset        -> http://127.0.0.1:8000 (local `npm run dev` against `manage.py runserver`)
//   "" (empty)   -> same origin, e.g. behind infrastructure/Caddyfile, which routes /api/ to Django
//   any URL      -> that origin (it must be same-site with the app for session cookies to work)
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

let cachedCsrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<string> {
  // First check if cookie already exists in browser
  const cookieToken = getCookie('scholarforge_csrftoken');
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/csrf/`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken;
      return data.csrfToken;
    }
  } catch {
    // fallback
  }
  return cachedCsrfToken || '';
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers = {}, ...restOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const method = (restOptions.method || 'GET').toUpperCase();
  const requestHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!(restOptions.body instanceof FormData) && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  // Include CSRF Token on state-modifying requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = await fetchCsrfToken();
    if (csrfToken) {
      requestHeaders['X-CSRFToken'] = csrfToken;
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'include', // Always send HttpOnly session cookie
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred.';
    if (isJson && typeof data === 'object') {
      if (data.detail) {
        errorMessage = data.detail;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (data.message) {
        errorMessage = data.message;
      } else {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        errorMessage = Array.isArray(val) ? `${firstKey}: ${val[0]}` : String(val);
      }
    }
    const error = new Error(errorMessage) as Error & { status: number; data: unknown };
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// Authentication API
export const authApi = {
  getCsrf: () => fetchCsrfToken(),
  register: (payload: RegisterPayload) =>
    apiRequest<{ message: string; user: User }>('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    apiRequest<{ message: string; user: User }>('/api/v1/auth/login/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiRequest<{ message: string }>('/api/v1/auth/logout/', {
      method: 'POST',
    }),
  getMe: () => apiRequest<User>('/api/v1/auth/me/'),
  updateProfile: (payload: ProfileUpdatePayload) =>
    apiRequest<User>('/api/v1/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: ChangePasswordPayload) =>
    apiRequest<{ message: string }>('/api/v1/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  requestPasswordReset: (email: string) =>
    apiRequest<{ message: string; dev_reset_data?: { uid: string; token: string } }>(
      '/api/v1/auth/password-reset/',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    ),
  confirmPasswordReset: (payload: { uid: string; token: string; new_password: string }) =>
    apiRequest<{ message: string }>('/api/v1/auth/password-reset-confirm/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// Academic Disciplines API
export const disciplinesApi = {
  list: (params?: { search?: string; category?: string }) =>
    apiRequest<{ count: number; results: AcademicDiscipline[] } | AcademicDiscipline[]>(
      '/api/v1/disciplines/',
      { params }
    ).then((res) => (Array.isArray(res) ? res : res.results || [])),
};

// Research Projects API
export const projectsApi = {
  list: (params?: {
    category?: string;
    status?: string;
    discipline?: string;
    search?: string;
    page?: number;
  }) =>
    apiRequest<{ count: number; results: ResearchProject[] } | ResearchProject[]>(
      '/api/v1/projects/',
      { params }
    ).then((res) => {
      if (Array.isArray(res)) {
        return { count: res.length, results: res };
      }
      return res;
    }),
  getById: (id: string) => apiRequest<ResearchProject>(`/api/v1/projects/${id}/`),
  create: (payload: CreateProjectPayload) =>
    apiRequest<ResearchProject>('/api/v1/projects/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<CreateProjectPayload>) =>
    apiRequest<ResearchProject>(`/api/v1/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  archive: (id: string) =>
    apiRequest<{ message: string; status: string; project_id: string }>(
      `/api/v1/projects/${id}/archive/`,
      { method: 'POST' }
    ),
  delete: (id: string) =>
    apiRequest<void>(`/api/v1/projects/${id}/`, { method: 'DELETE' }),
  getDashboardStats: () =>
    apiRequest<DashboardStats>('/api/v1/projects/dashboard-stats/'),
};

// Workspaces API
export const workspaceApi = {
  getCurrent: () =>
    apiRequest<{
      id: string;
      name: string;
      slug: string;
      owner_email: string;
      description: string;
      is_personal: boolean;
      member_count: number;
    }>('/api/v1/workspaces/current/'),
};

// Documents & Outline API
export const documentsApi = {
  getById: (id: string) => apiRequest<ResearchDocument>(`/api/v1/documents/${id}/`),
  getSections: (documentId: string) =>
    apiRequest<DocumentSection[]>(`/api/v1/documents/${documentId}/sections/`),
  getSection: (sectionId: string) =>
    apiRequest<DocumentSection>(`/api/v1/documents/sections/${sectionId}/`),
  createSection: (
    documentId: string,
    payload: {
      title: string;
      section_type?: string;
      parent_section?: string | null;
      content?: string;
      order_index?: number;
    }
  ) =>
    apiRequest<DocumentSection>(`/api/v1/documents/${documentId}/sections/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateSection: (
    sectionId: string,
    payload: {
      title?: string;
      content?: string;
      section_type?: string;
      order_index?: number;
      parent_section?: string | null;
    }
  ) =>
    apiRequest<DocumentSection>(`/api/v1/documents/sections/${sectionId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteSection: (sectionId: string) =>
    apiRequest<void>(`/api/v1/documents/sections/${sectionId}/`, {
      method: 'DELETE',
    }),
  reorderSections: (
    documentId: string,
    sections: Array<{ id: string; order_index: number; parent_section_id?: string | null }>
  ) =>
    apiRequest<DocumentSection[]>(`/api/v1/documents/${documentId}/sections/reorder/`, {
      method: 'POST',
      body: JSON.stringify({ sections }),
    }),
  getVersions: (documentId: string) =>
    apiRequest<DocumentVersion[]>(`/api/v1/documents/${documentId}/versions/`),
  createVersion: (documentId: string, change_summary = 'Manual snapshot') =>
    apiRequest<DocumentVersion>(`/api/v1/documents/${documentId}/versions/`, {
      method: 'POST',
      body: JSON.stringify({ change_summary }),
    }),
  restoreVersion: (documentId: string, versionId: string) =>
    apiRequest<{ message: string; document: ResearchDocument }>(
      `/api/v1/documents/${documentId}/versions/${versionId}/restore/`,
      { method: 'POST' }
    ),
  getTemplates: () =>
    apiRequest<StructureTemplate[]>('/api/v1/documents/templates/'),
  applyTemplate: (
    documentId: string,
    payload: {
      discipline_name?: string;
      document_category?: string;
      document_subtype?: string;
      preserve_content?: boolean;
    }
  ) =>
    apiRequest<{ message: string; document: ResearchDocument }>(
      `/api/v1/documents/${documentId}/apply-template/`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};

// AI Writing Assistant & Consistency API
export const researchApi = {
  generateAi: (payload: AIGeneratePayload) =>
    apiRequest<AIGenerateResponse>('/api/v1/research/ai/generate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAiJob: (jobId: string) =>
    apiRequest<{
      id: string;
      status: string;
      job_type: string;
      output_payload: Record<string, unknown>;
      error_message?: string;
    }>(`/api/v1/research/ai/jobs/${jobId}/`),
  feedbackAiJob: (
    jobId: string,
    action: 'ACCEPT' | 'REJECT' | 'EDIT',
    finalText?: string
  ) =>
    apiRequest<{ message: string; is_applied: boolean }>(
      `/api/v1/research/ai/jobs/${jobId}/feedback/`,
      {
        method: 'POST',
        body: JSON.stringify({ action, final_text: finalText }),
      }
    ),
  getConsistencyReport: (projectId: string) =>
    apiRequest<ConsistencyReport>(`/api/v1/research/projects/${projectId}/consistency-check/`),
  getContext: (projectId: string, sectionId?: string) =>
    apiRequest<Record<string, unknown>>(
      `/api/v1/research/projects/${projectId}/context/`,
      { params: sectionId ? { section_id: sectionId } : undefined }
    ),
};

// ============================================================================
// STAGE 3: DISCOVERY, SOURCES, COLLECTIONS & CITATIONS API
// ============================================================================

export const discoveryApi = {
  search: (payload: {
    query: string;
    discipline?: string;
    year_from?: number;
    year_to?: number;
    is_open_access?: boolean;
    publication_type?: string;
    provider?: string;
    sort?: string;
    sort_by?: string;
    page?: number;
    per_page?: number;
  }) =>
    apiRequest<DiscoverySearchResponse>('/api/v1/research/discovery/search/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const sourcesApi = {
  list: (params?: { search?: string; publication_type?: string; verification_status?: string }) =>
    apiRequest<ResearchSource[]>('/api/v1/research/sources/', { params }),
  getById: (id: string) => apiRequest<ResearchSource>(`/api/v1/research/sources/${id}/`),
  create: (data: Partial<ResearchSource>) =>
    apiRequest<ResearchSource>('/api/v1/research/sources/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ResearchSource>) =>
    apiRequest<ResearchSource>(`/api/v1/research/sources/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiRequest<void>(`/api/v1/research/sources/${id}/`, { method: 'DELETE' }),
  verify: (id: string) =>
    apiRequest<{
      source_id: string;
      verification_status: VerificationStatus;
      retracted: boolean;
      verification_details: Record<string, unknown>;
    }>(`/api/v1/research/sources/${id}/verify/`, { method: 'POST' }),
  importDoi: (doi: string) =>
    apiRequest<ResearchSource>('/api/v1/research/sources/import-doi/', {
      method: 'POST',
      body: JSON.stringify({ doi }),
    }),
  importBibtex: (bibtex: string) =>
    apiRequest<ResearchSource[]>('/api/v1/research/sources/import-bibtex/', {
      method: 'POST',
      body: JSON.stringify({ bibtex }),
    }),
  importRis: (ris: string) =>
    apiRequest<ResearchSource[]>('/api/v1/research/sources/import-ris/', {
      method: 'POST',
      body: JSON.stringify({ ris }),
    }),
};

export const collectionsApi = {
  list: () => apiRequest<ResearchCollection[]>('/api/v1/research/collections/'),
  create: (data: { name: string; description?: string; color?: string }) =>
    apiRequest<ResearchCollection>('/api/v1/research/collections/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getById: (id: string) => apiRequest<ResearchCollection>(`/api/v1/research/collections/${id}/`),
  update: (id: string, data: Partial<ResearchCollection>) =>
    apiRequest<ResearchCollection>(`/api/v1/research/collections/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => apiRequest<void>(`/api/v1/research/collections/${id}/`, { method: 'DELETE' }),
  addItem: (
    collectionId: string,
    payload: { source_id: string; notes?: string; tags?: string[]; is_favorite?: boolean; is_read?: boolean }
  ) =>
    apiRequest<ResearchCollectionItem>(`/api/v1/research/collections/${collectionId}/items/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateItem: (collectionId: string, sourceId: string, payload: Partial<ResearchCollectionItem>) =>
    apiRequest<ResearchCollectionItem>(`/api/v1/research/collections/${collectionId}/items/${sourceId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  removeItem: (collectionId: string, sourceId: string) =>
    apiRequest<void>(`/api/v1/research/collections/${collectionId}/items/${sourceId}/`, { method: 'DELETE' }),
};

export const projectSourcesApi = {
  list: (projectId: string) =>
    apiRequest<ProjectSource[]>(`/api/v1/research/projects/${projectId}/sources/`),
  attach: (
    projectId: string,
    payload: { source_id: string; relevance_score?: number; notes?: string; tags?: string[] }
  ) =>
    apiRequest<ProjectSource>(`/api/v1/research/projects/${projectId}/sources/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (projectId: string, sourceId: string, payload: Partial<ProjectSource>) =>
    apiRequest<ProjectSource>(`/api/v1/research/projects/${projectId}/sources/${sourceId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  detach: (projectId: string, sourceId: string) =>
    apiRequest<void>(`/api/v1/research/projects/${projectId}/sources/${sourceId}/`, {
      method: 'DELETE',
    }),
};

export const documentsUploadApi = {
  upload: async (file: File, projectId?: string, sourceId?: string): Promise<SourceDocument> => {
    const token = await fetchCsrfToken();
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('project_id', projectId);
    if (sourceId) formData.append('source_id', sourceId);

    const res = await fetch(`${API_BASE_URL}/api/v1/research/documents/upload/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': token,
      },
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Document upload failed.');
    }
    return res.json();
  },
  getById: (id: string) => apiRequest<SourceDocument>(`/api/v1/research/documents/${id}/`),
};

export const literatureApi = {
  analyze: (
    projectId: string,
    payload: {
      task_type: LiteratureTaskType;
      source_ids: string[];
      query_claim?: string;
      custom_instructions?: string;
    }
  ) =>
    apiRequest<LiteratureAnalyzeResponse>(
      `/api/v1/research/projects/${projectId}/literature-analyze/`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  getNotes: (projectId: string, reviewType?: ReviewType) =>
    apiRequest<LiteratureReviewNote[]>(
      `/api/v1/research/projects/${projectId}/literature-notes/`,
      { params: reviewType ? { review_type: reviewType } : undefined }
    ),
  createNote: (
    projectId: string,
    payload: {
      review_type: ReviewType;
      title: string;
      content: Record<string, unknown>;
      source_ids?: string[];
    }
  ) =>
    apiRequest<LiteratureReviewNote>(
      `/api/v1/research/projects/${projectId}/literature-notes/`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  updateNote: (id: string, payload: Partial<LiteratureReviewNote>) =>
    apiRequest<LiteratureReviewNote>(`/api/v1/research/literature-notes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteNote: (id: string) =>
    apiRequest<void>(`/api/v1/research/literature-notes/${id}/`, {
      method: 'DELETE',
    }),
};

export const citationsApi = {
  getBibliography: (projectId: string, style?: string) =>
    apiRequest<{
      project_id: string;
      citation_style: string;
      total_references: number;
      references: Array<{
        source_id: string;
        title: string;
        citation_number: number;
        in_text_parenthetical: string;
        in_text_narrative: string;
        full_reference: string;
        verification_status: VerificationStatus;
        retracted: boolean;
      }>;
    }>(`/api/v1/research/projects/${projectId}/bibliography/`, {
      params: style ? { style } : undefined,
    }),
  formatCitation: (
    projectId: string,
    payload: {
      source_ids: string[];
      style?: string;
      format_type?: 'parenthetical' | 'narrative';
      numeric_index?: number;
      page_number?: string;
    }
  ) =>
    apiRequest<{
      citation_style: string;
      format_type: string;
      in_text_citation: string;
      bibliography_entry: string;
      sources: Array<{ id: string; title: string }>;
    }>(`/api/v1/research/projects/${projectId}/format-citation/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runAudit: (projectId: string) =>
    apiRequest<CitationAuditReport>(`/api/v1/research/projects/${projectId}/citation-audit/`, {
      method: 'POST',
    }),
};

// ============================================================================
// STAGE 4 APIS: METHODOLOGY, INSTRUMENTS, DATA, STATISTICS, QUALITATIVE
// ============================================================================

export const methodologyApi = {
  recommend: (payload: {
    discipline?: string;
    objectives?: string;
    hypotheses?: string;
    category?: string;
    methodology_type?: string;
  }) =>
    apiRequest<{ recommendations: Array<Record<string, unknown>> }>(
      '/api/v1/research/methodology/recommend/',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getProjectMethodology: (projectId: string) =>
    apiRequest<{ methodology: ResearchMethodology | null }>(
      `/api/v1/research/projects/${projectId}/methodology/`
    ),

  saveProjectMethodology: (projectId: string, payload: Partial<ResearchMethodology>) =>
    apiRequest<ResearchMethodology>(
      `/api/v1/research/projects/${projectId}/methodology/`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  calculateSampling: (payload: {
    formula: string;
    population_size?: number;
    margin_of_error?: number;
    confidence_level?: number;
    estimated_proportion?: number;
    nonresponse_inflation_rate?: number;
    power?: number;
    effect_size?: number;
    test_type?: string;
    strategy?: string;
  }) =>
    apiRequest<SamplingCalculationResult>('/api/v1/research/sampling/calculate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getVariables: (projectId: string) =>
    apiRequest<ResearchVariable[]>(`/api/v1/research/projects/${projectId}/variables/`),

  createVariable: (projectId: string, payload: Partial<ResearchVariable>) =>
    apiRequest<ResearchVariable>(`/api/v1/research/projects/${projectId}/variables/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateVariable: (variableId: string, payload: Partial<ResearchVariable>) =>
    apiRequest<ResearchVariable>(`/api/v1/research/variables/${variableId}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteVariable: (variableId: string) =>
    apiRequest<void>(`/api/v1/research/variables/${variableId}/`, {
      method: 'DELETE',
    }),
};

export const instrumentsApi = {
  list: (projectId: string) =>
    apiRequest<ResearchInstrument[]>(`/api/v1/research/projects/${projectId}/instruments/`),

  create: (projectId: string, payload: { title: string; instrument_type: string; description?: string; instructions?: string }) =>
    apiRequest<ResearchInstrument>(`/api/v1/research/projects/${projectId}/instruments/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  get: (instrumentId: string) =>
    apiRequest<ResearchInstrument>(`/api/v1/research/instruments/${instrumentId}/`),

  update: (instrumentId: string, payload: Partial<ResearchInstrument>) =>
    apiRequest<ResearchInstrument>(`/api/v1/research/instruments/${instrumentId}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (instrumentId: string) =>
    apiRequest<void>(`/api/v1/research/instruments/${instrumentId}/`, {
      method: 'DELETE',
    }),

  addItem: (instrumentId: string, payload: { item_text: string; construct_name?: string; item_type?: string; is_reverse_coded?: boolean }) =>
    apiRequest<InstrumentItem>(`/api/v1/research/instruments/${instrumentId}/items/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removeItem: (instrumentId: string, itemId: string) =>
    apiRequest<void>(`/api/v1/research/instruments/${instrumentId}/items/${itemId}/`, {
      method: 'DELETE',
    }),

  generateItems: (instrumentId: string) =>
    apiRequest<{ message: string; items: InstrumentItem[]; generated_items?: InstrumentItem[] }>(
      `/api/v1/research/instruments/${instrumentId}/generate-items/`,
      { method: 'POST' }
    ),

  validate: (instrumentId: string) =>
    apiRequest<Record<string, unknown>>(
      `/api/v1/research/instruments/${instrumentId}/validate/`,
      { method: 'POST' }
    ),

  getDocxDownloadUrl: (instrumentId: string) =>
    `${API_BASE_URL}/api/v1/research/instruments/${instrumentId}/export-docx/`,
};

export const datasetsApi = {
  list: (projectId: string) =>
    apiRequest<ResearchDataset[]>(`/api/v1/research/projects/${projectId}/datasets/`),

  upload: async (projectId: string, file: File, name?: string, format?: string): Promise<ResearchDataset> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (format) formData.append('file_format', format);

    const csrfToken = await fetchCsrfToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/research/projects/${projectId}/datasets/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload dataset');
    }
    return res.json();
  },

  get: (datasetId: string) =>
    apiRequest<ResearchDataset>(`/api/v1/research/datasets/${datasetId}/`),

  delete: (datasetId: string) =>
    apiRequest<void>(`/api/v1/research/datasets/${datasetId}/`, {
      method: 'DELETE',
    }),

  transform: (datasetId: string, action: string, parameters: Record<string, unknown>) =>
    apiRequest<ResearchDataset>(`/api/v1/research/datasets/${datasetId}/transform/`, {
      method: 'POST',
      body: JSON.stringify({ action, parameters }),
    }),

  rollback: (datasetId: string, versionNumber: number) =>
    apiRequest<ResearchDataset>(`/api/v1/research/datasets/${datasetId}/rollback/`, {
      method: 'POST',
      body: JSON.stringify({ version_number: versionNumber }),
    }),
};

export const statisticsApi = {
  runAnalysis: (projectId: string, payload: {
    dataset_id?: string;
    test_type: string;
    parameters: Record<string, unknown>;
    label?: string;
  }) =>
    apiRequest<StatisticalResult>(`/api/v1/research/projects/${projectId}/run-analysis/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listResults: (projectId: string) =>
    apiRequest<StatisticalResult[]>(`/api/v1/research/projects/${projectId}/statistical-results/`),

  getResult: (resultId: string) =>
    apiRequest<StatisticalResult>(`/api/v1/research/statistical-results/${resultId}/`),

  deleteResult: (resultId: string) =>
    apiRequest<void>(`/api/v1/research/statistical-results/${resultId}/`, {
      method: 'DELETE',
    }),

  evaluateHypothesis: (projectId: string, payload: {
    hypothesis_statement: string;
    statistical_result_id: string;
    hypothesis_type?: string;
  }) =>
    apiRequest<HypothesisTest>(`/api/v1/research/projects/${projectId}/evaluate-hypothesis/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listHypothesisTests: (projectId: string) =>
    apiRequest<HypothesisTest[]>(`/api/v1/research/projects/${projectId}/hypothesis-tests/`),
};

export const qualitativeApi = {
  listTranscripts: (projectId: string) =>
    apiRequest<QualitativeTranscript[]>(`/api/v1/research/projects/${projectId}/transcripts/`),

  createTranscript: (projectId: string, payload: {
    title: string;
    content: string;
    participant_identifier?: string;
    transcript_type?: string;
  }) =>
    apiRequest<QualitativeTranscript>(`/api/v1/research/projects/${projectId}/transcripts/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTranscript: (transcriptId: string) =>
    apiRequest<QualitativeTranscript>(`/api/v1/research/transcripts/${transcriptId}/`),

  deleteTranscript: (transcriptId: string) =>
    apiRequest<void>(`/api/v1/research/transcripts/${transcriptId}/`, {
      method: 'DELETE',
    }),

  suggestCandidateCodes: (transcriptId: string) =>
    apiRequest<{ candidate_codes: Array<Record<string, unknown>> }>(
      `/api/v1/research/transcripts/${transcriptId}/suggest-codes/`,
      { method: 'POST' }
    ),

  tagExcerpt: (transcriptId: string, payload: {
    code_id: string;
    start_char: number;
    end_char: number;
    quote_text: string;
    memo?: string;
  }) =>
    apiRequest<EvidenceExcerpt>(`/api/v1/research/transcripts/${transcriptId}/tag-excerpt/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listCodes: (projectId: string) =>
    apiRequest<QualitativeCode[]>(`/api/v1/research/projects/${projectId}/qualitative-codes/`),

  createCode: (projectId: string, payload: { name: string; description?: string; color?: string }) =>
    apiRequest<QualitativeCode>(`/api/v1/research/projects/${projectId}/qualitative-codes/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteCode: (codeId: string) =>
    apiRequest<void>(`/api/v1/research/qualitative-codes/${codeId}/`, {
      method: 'DELETE',
    }),

  listThemes: (projectId: string) =>
    apiRequest<QualitativeTheme[]>(`/api/v1/research/projects/${projectId}/qualitative-themes/`),

  createTheme: (projectId: string, payload: {
    name: string;
    description?: string;
    narrative_summary?: string;
    code_ids?: string[];
  }) =>
    apiRequest<QualitativeTheme>(`/api/v1/research/projects/${projectId}/qualitative-themes/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const visualizationsApi = {
  list: (projectId: string) =>
    apiRequest<ResearchVisualization[]>(`/api/v1/research/projects/${projectId}/visualizations/`),

  create: (projectId: string, payload: { title: string; visualization_type: string; config: Record<string, unknown> }) =>
    apiRequest<ResearchVisualization>(`/api/v1/research/projects/${projectId}/visualizations/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  delete: (visualizationId: string) =>
    apiRequest<void>(`/api/v1/research/visualizations/${visualizationId}/`, {
      method: 'DELETE',
    }),
};

export const interpretationApi = {
  interpret: (projectId: string, payload: {
    task_type: string;
    prompt?: string;
  }) =>
    apiRequest<{
      success: boolean;
      refusal?: boolean;
      message?: string;
      data?: {
        title?: string;
        content?: string;
        variables_interpreted?: number;
      };
    }>(`/api/v1/research/projects/${projectId}/interpret-results/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};




// ==========================================
// STAGE 5 WORKFLOW, ASSEMBLY, QA & REVIEW APIS
// ==========================================

export const workflowApi = {
  get: (projectId: string) =>
    apiRequest<ResearchWorkflow>(`/api/v1/research/projects/${projectId}/workflow/`),

  updateStep: (stepId: string, payload: Partial<WorkflowStep>) =>
    apiRequest<WorkflowStep>(`/api/v1/research/workflow-steps/${stepId}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

export const planningApi = {
  list: (projectId: string) =>
    apiRequest<ResearchDecision | ResearchDecision[]>(`/api/v1/research/projects/${projectId}/planning/`),

  create: (projectId: string, payload: Partial<ResearchDecision>) =>
    apiRequest<ResearchDecision>(`/api/v1/research/projects/${projectId}/planning/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  approve: (projectId: string) =>
    apiRequest<ResearchDecision>(`/api/v1/research/projects/${projectId}/planning/approve/`, {
      method: 'POST',
    }),
};

export const alignmentApi = {
  get: (projectId: string) =>
    apiRequest<ResearchAlignmentMatrix>(`/api/v1/research/projects/${projectId}/alignment/`),
};

export const assemblyApi = {
  list: (projectId: string) =>
    apiRequest<ManuscriptAssembly[]>(`/api/v1/research/projects/${projectId}/assemblies/`),

  compile: (
    projectId: string,
    payload: {
      citation_style?: string;
      options?: {
        include_preliminary_pages?: boolean;
        include_table_of_contents?: boolean;
        include_list_of_tables?: boolean;
        include_list_of_figures?: boolean;
        include_references?: boolean;
        include_appendices?: boolean;
      };
    }
  ) =>
    apiRequest<ManuscriptAssembly>(`/api/v1/research/projects/${projectId}/assemblies/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDetail: (assemblyId: string) =>
    apiRequest<ManuscriptAssembly>(`/api/v1/research/assemblies/${assemblyId}/`),
};

export const qaApi = {
  get: (projectId: string) =>
    apiRequest<ManuscriptValidation>(`/api/v1/research/projects/${projectId}/validation/`),

  audit: (projectId: string) =>
    apiRequest<ManuscriptValidation>(`/api/v1/research/projects/${projectId}/validation/`, {
      method: 'POST',
    }),
};

export const reviewAssistantApi = {
  execute: (
    projectId: string,
    payload: {
      task_type: ReviewTaskType;
      user_prompt?: string;
    }
  ) =>
    apiRequest<{
      success: boolean;
      refusal?: boolean;
      message?: string;
      data?: Record<string, unknown>;
    }>(`/api/v1/research/projects/${projectId}/review-assistant/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const provenanceApi = {
  get: (projectId: string) =>
    apiRequest<ProvenanceTrace>(`/api/v1/research/projects/${projectId}/provenance/`),
};

export const reviewsApi = {
  list: (projectId: string) =>
    apiRequest<ReviewRecord[]>(`/api/v1/research/projects/${projectId}/reviews/`),

  create: (
    projectId: string,
    payload: {
      reviewer_name: string;
      review_stage: string;
      feedback: string;
      checklist_results?: Record<string, boolean>;
      is_approved?: boolean;
    }
  ) =>
    apiRequest<ReviewRecord>(`/api/v1/research/projects/${projectId}/reviews/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ==============================================================================
// STAGE 6: ACADEMIC COLLABORATION & SUPERVISOR REVIEW API CLIENTS
// ==============================================================================

export const collaborationApi = {
  list: (projectId: string) =>
    apiRequest<{
      collaborators: ProjectCollaborator[];
      pending_invitations: ProjectInvitation[];
      current_user_role: CollaboratorRole | null;
    }>(`/api/v1/research/projects/${projectId}/collaborators/`),

  invite: (
    projectId: string,
    payload: {
      email: string;
      role: CollaboratorRole;
      assigned_sections?: string[];
    }
  ) =>
    apiRequest<ProjectInvitation>(`/api/v1/research/projects/${projectId}/collaborators/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRole: (
    projectId: string,
    collaboratorId: string,
    payload: { role?: CollaboratorRole; assigned_sections?: string[] }
  ) =>
    apiRequest<ProjectCollaborator>(
      `/api/v1/research/projects/${projectId}/collaborators/${collaboratorId}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  remove: (projectId: string, collaboratorId: string) =>
    apiRequest<{ message: string }>(
      `/api/v1/research/projects/${projectId}/collaborators/${collaboratorId}/`,
      { method: 'DELETE' }
    ),

  myInvitations: () =>
    apiRequest<InvitationSummary[]>('/api/v1/research/collaborations/invitations/'),

  getInvitation: (token: string) =>
    apiRequest<InvitationSummary>(
      `/api/v1/research/collaborations/invitations/${encodeURIComponent(token)}/`
    ),

  acceptInvitation: (token: string) =>
    apiRequest<{ message: string; collaborator: ProjectCollaborator }>(
      `/api/v1/research/collaborations/invitations/${token}/accept/`,
      { method: 'POST' }
    ),

  rejectInvitation: (token: string) =>
    apiRequest<{ message: string }>(
      `/api/v1/research/collaborations/invitations/${token}/reject/`,
      { method: 'POST' }
    ),

  revokeInvitation: (projectId: string, invitationId: string) =>
    apiRequest<{ message: string }>(
      `/api/v1/research/projects/${projectId}/invitations/${invitationId}/`,
      { method: 'DELETE' }
    ),

  auditEvents: (projectId: string) =>
    apiRequest<CollaborationAuditEvent[]>(
      `/api/v1/research/projects/${projectId}/collaborators-audit/`
    ),
};

export const commentsApi = {
  list: (
    projectId: string,
    params?: { document_id?: string; section_id?: string; status?: string }
  ) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `/api/v1/research/projects/${projectId}/comments/${query ? `?${query}` : ''}`;
    return apiRequest<ManuscriptComment[]>(endpoint);
  },

  create: (
    projectId: string,
    payload: {
      document_id?: string;
      section_id?: string;
      content: string;
      anchor_text?: string;
      anchor_prefix?: string;
      anchor_suffix?: string;
      start_offset?: number;
      end_offset?: number;
    }
  ) =>
    apiRequest<ManuscriptComment>(`/api/v1/research/projects/${projectId}/comments/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  reply: (commentId: string, content: string) =>
    apiRequest<CommentReply>(`/api/v1/research/comments/${commentId}/reply/`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  updateStatus: (commentId: string, status: 'OPEN' | 'RESOLVED' | 'ORPHANED') =>
    apiRequest<ManuscriptComment>(`/api/v1/research/comments/${commentId}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  recalculateAnchors: (documentId: string, content?: string) =>
    apiRequest<{ relocated_count: number; orphaned_count: number }>(
      `/api/v1/research/documents/${documentId}/recalculate-anchors/`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    ),
};

export const supervisorFeedbackApi = {
  list: (projectId: string) =>
    apiRequest<SupervisorFeedback[]>(`/api/v1/research/projects/${projectId}/feedback/`),

  ingest: (
    projectId: string,
    payload: FormData | { source_type: FeedbackSourceType; raw_content?: string; title?: string }
  ) => {
    if (payload instanceof FormData) {
      return apiRequest<SupervisorFeedback>(`/api/v1/research/projects/${projectId}/feedback/`, {
        method: 'POST',
        body: payload,
      });
    }
    return apiRequest<SupervisorFeedback>(`/api/v1/research/projects/${projectId}/feedback/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  analyze: (feedbackId: string, autoCreateTasks: boolean = true) =>
    apiRequest<{
      tasks_count: number;
      tasks: CorrectionTask[];
      conflicts: Array<{ type: string; message: string; items: string[] }>;
      category_breakdown: Record<string, number>;
      has_unextracted_annotations: boolean;
    }>(`/api/v1/research/feedback/${feedbackId}/analyze/`, {
      method: 'POST',
      body: JSON.stringify({ auto_create_tasks: autoCreateTasks }),
    }),
};

export const correctionTasksApi = {
  list: (
    projectId: string,
    params?: { status?: string; category?: string; priority?: string; section_id?: string }
  ) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `/api/v1/research/projects/${projectId}/corrections/${query ? `?${query}` : ''}`;
    return apiRequest<CorrectionTask[]>(endpoint);
  },

  create: (
    projectId: string,
    payload: {
      section_id?: string;
      category?: CorrectionCategory;
      priority?: CorrectionPriority;
      instruction: string;
      original_text?: string;
      proposed_text?: string;
    }
  ) =>
    apiRequest<CorrectionTask>(`/api/v1/research/projects/${projectId}/corrections/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  apply: (taskId: string, payload?: { content?: string; force_override?: boolean }) =>
    apiRequest<{ status: string; task_id: string; new_document_version: number }>(
      `/api/v1/research/corrections/${taskId}/apply/`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }
    ),

  review: (
    taskId: string,
    payload: { decision: 'APPROVE' | 'REJECT' | 'RESOLVE' | 'REOPEN'; notes?: string }
  ) =>
    apiRequest<CorrectionTask>(`/api/v1/research/corrections/${taskId}/review/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export const documentDiffApi = {
  getDiff: (documentId: string, baseVersion?: number, targetVersion?: number) => {
    const query = new URLSearchParams();
    if (baseVersion !== undefined) query.set('base_version', String(baseVersion));
    if (targetVersion !== undefined) query.set('target_version', String(targetVersion));
    return apiRequest<VersionDiffComparison>(
      `/api/v1/research/documents/${documentId}/diff/?${query.toString()}`
    );
  },

  restoreVersion: (documentId: string, targetVersionNumber: number) =>
    apiRequest<{ status: string; from_version: number; new_version: number; version_id: string }>(
      `/api/v1/research/documents/${documentId}/restore-version/`,
      {
        method: 'POST',
        body: JSON.stringify({ target_version_number: targetVersionNumber }),
      }
    ),
};

export const journalReviewApi = {
  list: (projectId: string) =>
    apiRequest<JournalReviewerResponse[]>(
      `/api/v1/research/projects/${projectId}/journal-responses/`
    ),

  create: (
    projectId: string,
    payload: {
      reviewer_label: string;
      comment_number: number;
      original_comment: string;
      revision_category?: RevisionCategory;
      target_section_id?: string;
      linked_correction_task_id?: string;
      author_response?: string;
    }
  ) =>
    apiRequest<JournalReviewerResponse>(
      `/api/v1/research/projects/${projectId}/journal-responses/`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  update: (
    responseId: string,
    payload: {
      author_response?: string;
      revision_category?: RevisionCategory;
      target_section_id?: string;
      linked_correction_task_id?: string;
    }
  ) =>
    apiRequest<JournalReviewerResponse>(
      `/api/v1/research/journal-responses/${responseId}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  getMatrixDocument: (projectId: string) =>
    apiRequest<JournalResponseMatrixDoc>(
      `/api/v1/research/projects/${projectId}/journal-responses/matrix-document/`
    ),
};

export const supervisorApi = {
  getProjects: () =>
    apiRequest<SupervisorProjectItem[]>('/api/v1/research/supervisor/projects/'),
};

export const formattingApi = {
  listInstitutions: (country?: string) => {
    const query = country ? `?country=${encodeURIComponent(country)}` : '';
    return apiRequest<AcademicInstitution[]>(`/api/v1/research/institutions/${query}`);
  },

  listDepartments: (facultyId?: string) => {
    const query = facultyId ? `?faculty_id=${encodeURIComponent(facultyId)}` : '';
    return apiRequest<AcademicDepartment[]>(`/api/v1/research/departments/${query}`);
  },

  listTemplates: (params?: {
    institution?: string;
    degree_level?: string;
    document_type?: string;
    template_type?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.institution) searchParams.set('institution', params.institution);
    if (params?.degree_level) searchParams.set('degree_level', params.degree_level);
    if (params?.document_type) searchParams.set('document_type', params.document_type);
    if (params?.template_type) searchParams.set('template_type', params.template_type);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest<FormattingTemplate[]>(`/api/v1/research/templates/${query}`);
  },

  getTemplate: (id: string) =>
    apiRequest<FormattingTemplate>(`/api/v1/research/templates/${id}/`),

  createTemplate: (payload: Partial<FormattingTemplate>) =>
    apiRequest<FormattingTemplate>('/api/v1/research/templates/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cloneTemplate: (id: string, customName?: string) =>
    apiRequest<FormattingTemplate>(`/api/v1/research/templates/${id}/clone/`, {
      method: 'POST',
      body: JSON.stringify({ custom_name: customName }),
    }),

  getProjectTemplate: (projectId: string) =>
    apiRequest<{
      project_id: string;
      assignment_id?: string;
      template: FormattingTemplate | null;
      active_version: TemplateVersion | null;
      assigned_at?: string;
    }>(`/api/v1/research/projects/${projectId}/template/`),

  assignProjectTemplate: (
    projectId: string,
    templateId: string,
    templateVersionId?: string
  ) =>
    apiRequest<{
      id: string;
      project: string;
      template: string;
      template_version?: string;
      assigned_at: string;
    }>(`/api/v1/research/projects/${projectId}/template/`, {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        template_version_id: templateVersionId,
      }),
    }),
};

export const preliminaryPagesApi = {
  getPreliminaryPages: (projectId: string) =>
    apiRequest<PreliminaryPagesResult>(
      `/api/v1/research/projects/${projectId}/preliminary-pages/`
    ),

  generatePreliminaryPages: (projectId: string, metadata?: Record<string, any>) =>
    apiRequest<PreliminaryPagesResult>(
      `/api/v1/research/projects/${projectId}/preliminary-pages/`,
      {
        method: 'POST',
        body: JSON.stringify(metadata || {}),
      }
    ),
};

export const complianceApi = {
  getCompliance: (projectId: string) =>
    apiRequest<FormattingValidation>(
      `/api/v1/research/projects/${projectId}/compliance/`
    ),

  runComplianceAudit: (projectId: string) =>
    apiRequest<FormattingValidation>(
      `/api/v1/research/projects/${projectId}/compliance/`,
      {
        method: 'POST',
      }
    ),
};

export const autoformatApi = {
  previewAutoformat: (projectId: string) =>
    apiRequest<AutoformatPreviewResult>(
      `/api/v1/research/projects/${projectId}/autoformat/preview/`
    ),

  applyAutoformat: (projectId: string, sectionIds?: string[]) =>
    apiRequest<AutoformatApplyResult>(
      `/api/v1/research/projects/${projectId}/autoformat/apply/`,
      {
        method: 'POST',
        body: JSON.stringify(sectionIds ? { section_ids: sectionIds } : {}),
      }
    ),

  rollbackAutoformat: (projectId: string, snapshotVersionId: string) =>
    apiRequest<AutoformatRollbackResult>(
      `/api/v1/research/projects/${projectId}/autoformat/rollback/`,
      {
        method: 'POST',
        body: JSON.stringify({ snapshot_version_id: snapshotVersionId }),
      }
    ),
};

export const journalsApi = {
  listJournals: (articleType?: string, search?: string) => {
    const params = new URLSearchParams();
    if (articleType) params.set('article_type', articleType);
    if (search) params.set('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<JournalProfile[]>(`/api/v1/research/journals/${query}`);
  },

  getSubmissionReadiness: (projectId: string, journalId: string) =>
    apiRequest<SubmissionReadinessResult>(
      `/api/v1/research/projects/${projectId}/submission-readiness/?journal_id=${journalId}`
    ),
};

export const publicationMetadataApi = {
  getMetadata: (projectId: string) =>
    apiRequest<ManuscriptMetadata>(
      `/api/v1/research/projects/${projectId}/metadata/`
    ),

  updateMetadata: (projectId: string, data: Partial<ManuscriptMetadata>) =>
    apiRequest<ManuscriptMetadata>(
      `/api/v1/research/projects/${projectId}/metadata/`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),
};

export const guidelineIngestionApi = {
  uploadAndIngest: async (formData: FormData): Promise<GuidelineIngestionResponse> => {
    const token = await fetchCsrfToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['X-CSRFToken'] = token;
    }
    const response = await fetch(`${API_BASE_URL}/api/v1/research/guidelines/ingest/`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || err.detail || 'Guideline upload failed');
    }
    return response.json();
  },

  approveGuidelines: (
    sourceId: string,
    payload: {
      name: string;
      degree_level?: string;
      rules_config: Partial<RulesConfig>;
    }
  ) =>
    apiRequest<FormattingTemplate>(`/api/v1/research/guidelines/${sourceId}/approve/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};


export const exportApi = {
  getPreview: (projectId: string, templateId?: string) => {
    const q = templateId ? `?template_id=${templateId}` : '';
    return apiRequest<ExportPreview>(`/api/v1/research/projects/${projectId}/export-preview/${q}`);
  },

  initiateExport: (projectId: string, payload: InitiateExportPayload) =>
    apiRequest<ExportJob>(`/api/v1/research/projects/${projectId}/export/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getJobStatus: (jobId: string) =>
    apiRequest<ExportJob>(`/api/v1/research/export-jobs/${jobId}/`),

  getProjectExports: (projectId: string) =>
    apiRequest<DocumentExport[]>(`/api/v1/research/projects/${projectId}/exports/`),

  getExportDetail: (exportId: string) =>
    apiRequest<DocumentExport>(`/api/v1/research/exports/${exportId}/`),

  deleteExport: (exportId: string) =>
    apiRequest<{ detail: string }>(`/api/v1/research/exports/${exportId}/`, {
      method: 'DELETE',
    }),

  triggerValidation: (exportId: string) =>
    apiRequest<ExportValidation>(`/api/v1/research/exports/${exportId}/validate/`, {
      method: 'POST',
    }),

  getDownloadUrl: (exportId: string) =>
    `${API_BASE_URL}/api/v1/research/exports/${exportId}/download/`,
};

export const institutionalTemplateApi = {
  getTemplates: (params?: { institution?: string; degree_level?: string; document_type?: string }) =>
    formattingApi.listTemplates(params),
};
