/**
 * TypBox API Client
 * Handles JWT authentication, token refreshing, and REST API communication with Django backend.
 */

import type { BitsSummary } from './bits';
import type { FurnitureSpec, RoomLayout } from './roomRender';

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
  /** Study currency, derived from logged time (see bits.ts). */
  bits?: BitsSummary;
}

/** Fields read back from a created / updated log. */
interface LogWriteResponse {
  id: number | string;
  bonus_bits?: number;
  bonus_item?: string;
}

export interface BitsBuff {
  item_id: string;
  name: string;
  tagline: string;
  detail: string;
  price: number;
  /** Older servers omit the fields below; cards then show the text alone. */
  window?: 'any' | 'night' | 'weekend';
  expires?: 'hours' | 'weekend';
  hours?: number | null;
  minutes?: number | null;
  uses?: number | null;
  /** Best-case payout; null when it is down to luck (LUCKY BYTE). */
  max_bonus?: number | null;
  /** CATEGORY LOCK: buying needs a category. */
  needs_category?: boolean;
  /** MYSTERY CRATE: what it can open into. */
  odds?: Array<{ item_id: string; name: string; chance: number }> | null;
}

export interface BitsActiveBuff {
  item_id: string;
  name: string;
  expires_at: string;
  remaining_minutes: number | null;
  total_minutes: number | null;
  remaining_uses: number | null;
  total_uses: number | null;
  bonus_earned: number;
  /** BITS a cancel would hand back right now (two thirds of the unused share). */
  refund?: number;
  /** 'mystery_crate' when the buff was rolled from a crate. */
  via?: string;
  /** CATEGORY LOCK's category. */
  category?: { id: number; code: string; name: string; color: string } | null;
}

export interface BitsShopState {
  bits: BitsSummary;
  active_buff: BitsActiveBuff | null;
  buffs: BitsBuff[];
}

export interface RoomState {
  layout: RoomLayout;
  inventory: Record<string, number>;
  catalog: FurnitureSpec[];
  catalog_version?: string;
  weekly: { items: string[]; resets_at: string };
  grid: { w: number; h: number; wall_rows: number };
}

/** What /room/ sends: the catalog only when the client lacks this version. */
type RoomPayload = Omit<RoomState, 'catalog'> & { catalog?: FurnitureSpec[] };

// The furniture catalog (~1,200 pieces) is static per deploy, so it is
// fetched once per page load and reused until the server's version changes.
let catalogCache: { version: string; items: FurnitureSpec[] } | null = null;

const withCatalog = (payload: RoomPayload): RoomState => {
  if (payload.catalog) {
    catalogCache = payload.catalog_version ? { version: payload.catalog_version, items: payload.catalog } : null;
    return payload as RoomState;
  }
  if (catalogCache && catalogCache.version === payload.catalog_version) return { ...payload, catalog: catalogCache.items };
  // A save answered against a catalog this page never loaded (or an older
  // server): an empty list keeps the UI up until the next load refreshes it.
  return { ...payload, catalog: catalogCache?.items ?? [] };
};

export const api = {
  room: {
    /** Asks for the catalog only when the cached copy is missing or stale. */
    get: async (): Promise<RoomState> => {
      const held = catalogCache ? `?catalog=${encodeURIComponent(catalogCache.version)}` : '';
      return withCatalog(await apiFetch<RoomPayload>(`/room/${held}`));
    },
    /** Like get: the answer skips the catalog when the cached copy is current. */
    save: async (layout: RoomLayout): Promise<RoomState> => {
      const held = catalogCache ? `?catalog=${encodeURIComponent(catalogCache.version)}` : '';
      return withCatalog(
        await apiFetch<RoomPayload>(`/room/${held}`, {
          method: 'PUT',
          body: JSON.stringify({ layout }),
        })
      );
    },
  },
  bits: {
    get: async () => apiFetch<BitsShopState>('/bits/'),
    /** `category`: CATEGORY LOCK's target (ignored by every other item). */
    /** Ends the running buff early; `refunded` is what came back. */
    cancel: async () =>
      apiFetch<BitsShopState & { refunded: number }>('/bits/cancel/', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    buy: async (item_id: string, category?: string | number) =>
      apiFetch<BitsShopState>('/bits/buy/', {
        method: 'POST',
        body: JSON.stringify(category === undefined ? { item_id } : { item_id, category }),
      }),
  },
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
        bonus_bits?: number;
        bonus_item?: string;
      }>>(`/logs/${query}`);
    },
    create: async (data: {
      category: string | number | null;
      date: string;
      duration_minutes: number;
      topic: string;
      is_public_to_hub: boolean;
    }) => {
      return apiFetch<LogWriteResponse>('/logs/', {
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
      return apiFetch<LogWriteResponse>(`/logs/${id}/`, {
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
      return apiFetch<{ deleted: number; deleted_categories?: number; deleted_purchases?: number }>('/logs/clear-all/', {
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
};

