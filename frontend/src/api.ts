/**
 * TypBox API Client
 * Handles JWT authentication, token refreshing, and REST API communication with Django backend.
 */

const getApiBaseUrl = (): string => {
  // 1. Explicit environment variable takes precedence
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return raw.endsWith('/api') ? raw : `${raw}/api`;
  }

  // 2. Production or public web deployment (phone, laptop, Render static site)
  const isBrowser = typeof window !== 'undefined';
  const isLocalHost = isBrowser && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  );

  if (import.meta.env.PROD || (isBrowser && !isLocalHost)) {
    return 'https://typbox-dev.onrender.com/api';
  }

  // 3. Local development fallback
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

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

/** Error for a non-2xx API response, carrying its HTTP status. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Flattens DRF field errors ({"email": ["..."]}) into a readable line. */
function formatFieldErrors(errJson: unknown): string {
  if (!errJson || typeof errJson !== 'object' || Array.isArray(errJson)) return JSON.stringify(errJson);
  const parts = Object.entries(errJson as Record<string, unknown>).map(([field, msgs]) => {
    const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
    return field === 'non_field_errors' ? text : `${field}: ${text}`;
  });
  return parts.join(' / ') || JSON.stringify(errJson);
}

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
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: reqHeaders,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`TypBox API fetch error to [${url}]:`, error);
    throw new Error(
      `Unable to connect to backend (${url}): ${error.message}. Please verify CORS and backend status.`,
      { cause: err }
    );
  }

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
      throw new ApiError('Session expired. Please sign in again.', 401);
    }
  }

  if (!response.ok) {
    let errorDetail: string;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || formatFieldErrors(errJson);
    } catch {
      errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new ApiError(errorDetail, response.status);
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

export interface AuthUserResponse {
  id: number;
  username: string;
  email: string;
  avatar_color?: string;
  avatar_preset?: string;
  avatar_image?: string;
  surface_theme?: string;
  language?: string;
  timezone?: string;
  /** 'mon' | 'sun' — first day of the calendar week. */
  week_start?: string;
  chrono_theme?: string;
  user_statuses?: string[];
  /** Weather widget + motion FX prefs (blank / null = never synced). */
  weather_theme?: string;
  weather_unit?: string;
  weather_hidden?: boolean | null;
  surface_fx?: boolean | null;
  ui_font?: string;
  ambient_theme?: string;
  ambient_clock?: boolean | null;
}

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
      return apiFetch<AuthUserResponse>('/auth/me/');
    },
    updateProfile: async (
      data: Partial<{
        username: string;
        email: string;
        avatar_color: string;
        avatar_preset: string;
        avatar_image: string;
        surface_theme: string;
        language: string;
        timezone: string;
        week_start: string;
        chrono_theme: string;
        user_statuses: string[];
        weather_theme: string;
        weather_unit: string;
        weather_hidden: boolean | null;
        surface_fx: boolean | null;
        ui_font: string;
        ambient_theme: string;
        ambient_clock: boolean | null;
      }>
    ) => {
      return apiFetch<AuthUserResponse>('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    changePassword: async (current_password: string, new_password: string) => {
      return apiFetch<{ detail: string }>('/auth/password-change/', {
        method: 'POST',
        body: JSON.stringify({ current_password, new_password }),
      });
    },
    requestPasswordReset: async (email: string) => {
      return apiFetch<{ detail: string; debug_reset_url?: string }>('/auth/password-reset/', {
        method: 'POST',
        body: JSON.stringify({ email }),
        requiresAuth: false,
      });
    },
    confirmPasswordReset: async (uid: string, token: string, new_password: string) => {
      return apiFetch<{ detail: string }>('/auth/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({ uid, token, new_password }),
        requiresAuth: false,
      });
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
        weekly_target_hours?: number;
        is_active?: boolean;
        /** UTC ISO timestamp when marked DONE; null while in progress. */
        completed_at?: string | null;
        /** Legacy (pre-weekly) field; only used as a fallback during rollout. */
        monthly_target_hours?: number;
        created_at: string;
      }>>('/categories/');
    },
    create: async (data: {
      name: string;
      code: string;
      color: string;
      weekly_target_hours: number;
      is_active?: boolean;
    }) => {
      return apiFetch('/categories/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (
      id: string | number,
      data: Partial<{
        name: string;
        code: string;
        color: string;
        weekly_target_hours: number;
        is_active: boolean;
        /** true = mark DONE (server stamps completed_at), false = back to in progress. */
        completed: boolean;
      }>
    ) => {
      return apiFetch<{ id: number | string; completed_at: string | null }>(`/categories/${id}/`, {
        method: 'PATCH',
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
    clearAll: async () => {
      return apiFetch<{ deleted: number; deleted_categories?: number }>('/logs/clear-all/', {
        method: 'DELETE',
      });
    },
    importBackup: async (payload: { categories?: unknown[]; logs: unknown[] }) => {
      return apiFetch<{ imported_logs: number; skipped_logs?: number; created_categories: number }>('/logs/import-backup/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
  planetary: {
    // Public (no auth) proxy for USGS earthquakes + NASA DONKI space weather.
    // Always the last `windowDays` days; the panel narrows it client-side.
    signal: async () => {
      return apiFetch<PlanetarySignal>('/planetary/signal/', { requiresAuth: false });
    },
  },
};

/** "ok" = fresh, "stale" = upstream down so the last good copy is served, "unavailable" = no data. */
export type PlanetarySourceStatus = 'ok' | 'stale' | 'unavailable';

export interface PlanetarySignal {
  generatedAt: string;
  windowDays: number;
  seismic: {
    status: PlanetarySourceStatus;
    events: Array<{ id: string; time: string; mag: number; place: string; tsunami: boolean; url: string | null }>;
  };
  solar: {
    status: PlanetarySourceStatus;
    flares: Array<{ id: string; time: string; classType: string; region: number | null; url: string | null }>;
    cmes: Array<{
      id: string;
      time: string;
      speed: number | null;
      earthArrival: string | null;
      glancing: boolean;
      url: string | null;
    }>;
    storms: Array<{ id: string; time: string; maxKp: number; url: string | null }>;
  };
}

