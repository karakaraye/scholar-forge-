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
} from '@/types/project';

// In Next.js client, requests can use direct origin or backend port
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
