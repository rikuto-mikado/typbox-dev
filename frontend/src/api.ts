/**
 * TypBox API Client
 * Handles JWT authentication, token refreshing, and REST API communication with Django backend.
 */

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const API_BASE_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const TOKEN_KEY = 'typbox_access_token';
const REFRESH_KEY = 'typbox_refresh_token';

export const getAccessToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requiresAuth = true, headers = {}, ...rest } = options;
  const token = getAccessToken();

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (requiresAuth && token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let response = await fetch(url, {
    ...rest,
    headers: reqHeaders,
  });

  // If token expired (401), try refreshing token once
  if (response.status === 401 && requiresAuth && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      reqHeaders['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(url, {
        ...rest,
        headers: reqHeaders,
      });
    } else {
      clearTokens();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access) {
      localStorage.setItem(TOKEN_KEY, data.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ==========================================
// API Methods
// ==========================================

export const api = {
  auth: {
    login: async (username: string, password: string) => {
      const data = await apiFetch<{ access: string; refresh: string }>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        requiresAuth: false,
      });
      setTokens(data.access, data.refresh);
      return data;
    },
    register: async (username: string, email: string, password: string) => {
      return apiFetch<{ id: number; username: string; email: string }>('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
        requiresAuth: false,
      });
    },
    getMe: async () => {
      return apiFetch<{ id: number; username: string; email: string }>('/auth/me/');
    },
    logout: () => {
      clearTokens();
    },
    deleteAccount: async () => {
      await apiFetch('/auth/me/', {
        method: 'DELETE',
      });
      clearTokens();
    },
  },
  categories: {
    list: async () => {
      return apiFetch<Array<{
        id: string | number;
        name: string;
        code: string;
        color: string;
        monthly_target_hours: number;
        created_at: string;
      }>>('/categories/');
    },
    create: async (data: { name: string; code: string; color: string; monthly_target_hours: number }) => {
      return apiFetch('/categories/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number) => {
      return apiFetch(`/categories/${id}/`, {
        method: 'DELETE',
      });
    },
  },
  logs: {
    list: async (params?: { category?: string | number; is_public?: boolean }) => {
      let query = '';
      if (params) {
        const q = new URLSearchParams();
        if (params.category) q.set('category', String(params.category));
        if (params.is_public !== undefined) q.set('is_public', String(params.is_public));
        query = `?${q.toString()}`;
      }
      return apiFetch<Array<{
        id: string | number;
        category: string | number | null;
        category_code: string;
        category_name: string;
        category_color: string;
        date: string;
        duration_minutes: number;
        duration_hours: number;
        topic: string;
        is_public_to_hub: boolean;
        created_at: string;
      }>>(`/logs/${query}`);
    },
    create: async (data: {
      category: string | number | null;
      date: string;
      duration_minutes: number;
      topic: string;
      is_public_to_hub: boolean;
    }) => {
      return apiFetch('/logs/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<{
      category: string | number | null;
      date: string;
      duration_minutes: number;
      topic: string;
      is_public_to_hub: boolean;
    }>) => {
      return apiFetch(`/logs/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number) => {
      return apiFetch(`/logs/${id}/`, {
        method: 'DELETE',
      });
    },
  },
  hub: {
    getTelemetry: async (username?: string) => {
      const query = username ? `?username=${encodeURIComponent(username)}` : '';
      return apiFetch<{
        source: string;
        timestamp: string;
        user?: string;
        summary: { total_hours: number; weekly_hours: number; monthly_hours: number };
        categories: Array<{ code: string; name: string; monthly_hours: number; target_hours: number }>;
        recent_public_logs: Array<{
          id: string | number;
          date: string;
          category_code: string;
          duration_minutes: number;
          topic: string;
        }>;
      }>(`/hub/telemetry/${query}`, { requiresAuth: false });
    },
  },
};
