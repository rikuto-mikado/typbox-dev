/**
 * TypBox API Client
 * Handles JWT authentication, token refreshing, and REST API communication with Django backend.
 */

import { blockedByDemo, demoAnswer, isDemo } from './demo';
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

export const getAccessToken = (): string | null => (isDemo() ? 'demo' : localStorage.getItem(TOKEN_KEY));
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

  if (isDemo()) {
    const answer = demoAnswer(endpoint, rest.method ?? 'GET', rest.body);
    if (answer !== undefined) return answer as T;
    blockedByDemo();
    throw new ApiError('This is a read-only demo: nothing can be saved.', 403);
  }
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
    // The address and the advice are for whoever runs the server, not its users.
    throw new Error(
      import.meta.env.DEV
        ? `Unable to connect to backend (${url}): ${error.message}. Please verify CORS and backend status.`
        : 'Could not reach the server. Check your connection and try again.',
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
  /** Weather widget prefs (blank / null = never synced). */
  weather_theme?: string;
  weather_unit?: string;
  weather_hidden?: boolean | null;
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
  /** When the server stops accepting edits and deletes of this log. */
  editable_until?: string;
  /** The stars on the gauge, when this log lit today's star (new logs only). */
  star_lit?: number;
  /** What the log did to the running BOSS RAID / RIVAL duel (new logs only). */
  challenge_hit?: ChallengeHit;
}

// ---------------------------------------------------------------- CHALLENGES
// BOSS RAID and RIVAL (backend tracker/challenges.py): a second slot next to
// the buff, one challenge at a time.

export type RaidHitKind = 'hit' | 'crit' | 'block' | 'miss' | 'nohead';

export interface ActiveRaid {
  kind: 'raid';
  id: number;
  item_id: string;
  /** The boss id (golem, nightmare, ...): art and colour (challengeArt.ts). */
  key: string;
  price: number;
  started_at: string;
  expires_at: string;
  name: string;
  title: string;
  trait: string;
  trait_line: string;
  /** Minutes of damage still needed. */
  hp: number;
  max_hp: number;
  days: number;
  loot: number;
  /** Part of the loot that only the first clear pays. */
  first_bonus?: number;
  inverted_of?: string | null;
  /** BITS its attacks have taken so far. */
  struck?: number;
  /** Null for a raid started before bosses hit back. */
  attack?: BossAttack | null;
  /** HYDRA only: one head per category. */
  heads: Array<{ code: string; color: string; hp: number; max: number }> | null;
  /** The latest hits, newest first. */
  events: Array<{ at: string; minutes: number; damage: number; hit: RaidHitKind; head: string | null }>;
  /** The latest heals (NIGHTMARE's midnights, WARDEN's empty days). */
  heals: Array<{ at: string; minutes: number }>;
}

export interface BossAttack {
  name: string;
  dmg: number;
  /** Hours between attacks. */
  every: number;
  /** The damage since its last attack that parries the next one. */
  parry: number;
  next_at: string | null;
  dealt: number;
  log: Array<{ at: string; parried: boolean; dmg: number }>;
}

/** Where a regular challenger's other side stands: absent until beaten once. */
export interface Inversion<Offer> {
  wins: number;
  need: number;
  offer: Offer | null;
}

export interface ActiveRival {
  kind: 'rival';
  id: number;
  item_id: string;
  /** The rival id (orion, nova, rush). */
  key: string;
  price: number;
  started_at: string;
  expires_at: string;
  name: string;
  tag: string;
  motto: string;
  prize: number;
  first_bonus?: number;
  inverted_of?: string | null;
  /** INVERTED: which of your logs count. */
  rule_line?: string | null;
  /** INVERTED MIKA: every round must be won. */
  sweep?: boolean;
  /** The duel runs the 72 hours from the purchase. */
  starts_at: string;
  /** Older servers omit it (their duels end at expires_at). */
  ends_at?: string;
  /** Three 24-hour rounds. */
  days: Array<{ start: string; end: string; mine: number; theirs: number; state: 'pending' | 'live' | 'done' }>;
  mine: number;
  theirs: number;
  /** The rival's sessions from the purchase day to the last duel day. */
  plan: Array<{ start: string; end: string; topic: string }>;
  sleep: Array<{ start: string; end: string }>;
  /** What they do away from the desk. Older servers omit it. */
  life?: Array<{ start: string; end: string; label: string }>;
}

export type ActiveChallenge = ActiveRaid | ActiveRival;

export interface RaidOffer {
  item_id: string;
  key: string;
  name: string;
  title: string;
  price: number;
  hp: number;
  days: number;
  loot: number;
  trait: string;
  trait_line: string;
  /** HYDRA needs two categories in progress. */
  available: boolean;
  /** The festival it came with, for those only here while one runs. */
  event?: string | null;
  /** HYDRA: [fewest, most] heads to pick, and the category ids suggested. */
  heads?: [number, number];
  suggested?: number[];
  first_bonus?: number;
  attack?: Pick<BossAttack, 'name' | 'dmg' | 'every' | 'parry'>;
  wins?: number;
  inversion?: Inversion<RaidOffer> | null;
}

export interface RivalOffer {
  item_id: string;
  key: string;
  name: string;
  tag: string;
  motto: string;
  price: number;
  prize: number;
  /** Minutes the rival's schedule puts into a duel bought now. */
  projected: number;
  /** When a duel bought now would end (72 hours on). */
  ends_at: string;
  event?: string | null;
  first_bonus?: number;
  rule_line?: string | null;
  wins?: number;
  inversion?: Inversion<RivalOffer> | null;
}

/** What study and the challenges have earned (backend collection.py). */
export interface CollectionState {
  invert_at: number;
  groups: Array<{ id: string; name: string; progress: number }>;
  trophies: Array<{ id: string; group: string; need: number; grade: number; earned: boolean }>;
  records: Array<{
    kind: 'raid' | 'rival';
    key: string;
    name: string;
    event: string | null;
    wins: number;
    inverted: { key: string; name: string; unlocked: boolean; wins: number } | null;
  }>;
}

export interface ChallengeResult {
  id: number;
  item_id: string;
  kind: 'raid' | 'rival';
  key: string;
  name: string;
  outcome: 'down' | 'escaped' | 'won' | 'lost' | 'tie' | 'forfeit';
  payout: number;
  price: number;
  struck?: number;
  first_clear?: boolean;
  finished_at: string;
}

export type ChallengeHit =
  | { kind: 'raid'; name: string; boss: string; hit: RaidHitKind; damage: number; hp: number; max_hp: number; down: boolean; payout: number }
  | { kind: 'rival'; name: string; mine: number; theirs: number };

export interface BitsBuff {
  item_id: string;
  name: string;
  tagline: string;
  detail: string;
  price: number;
  /** Hours before it can be bought again, once it ends. */
  cooldown_hours?: number;
  /** What it takes for its bonus to cover its price. */
  break_even?: string;
  /** If bought right now: when it would start paying, and until when. */
  timing?: {
    state: 'now' | 'later' | 'waiting';
    starts: string;
    note: string;
    ends_at: string | null;
  };
  /** Older servers omit the fields below; cards then show the text alone. */
  window?: 'any' | 'night' | 'morning' | 'weekend' | 'weather';
  expires?: 'hours' | 'weekend' | 'contract' | 'mornings';
  /** EARLY BIRD: how many mornings it runs. */
  mornings?: number | null;
  hours?: number | null;
  minutes?: number | null;
  uses?: number | null;
  /** Best-case payout; null when it is down to luck (LUCKY BYTE). */
  max_bonus?: number | null;
  /** CATEGORY LOCK: buying needs a category. */
  needs_category?: boolean;
  /** MYSTERY CRATE: what it can open into. */
  odds?: Array<{ item_id: string; name: string; chance: number }> | null;
  /** IRON CONTRACT's terms. */
  contract?: BitsContractTerms | null;
  /** LUNAR TIDE: extra BITS per hour if a log were committed now. */
  rate_now?: number | null;
}

export interface BitsContractTerms {
  days: number;
  min_minutes: number;
  multiplier: number;
}

export interface BitsContractDay {
  date: string;
  minutes: number;
  state: 'pending' | 'live' | 'done' | 'failed';
  /** STARLIGHT paid for this day. */
  covered?: boolean;
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
  /** IRON CONTRACT: its terms, payout and each day's progress. */
  contract?: (Omit<BitsContractTerms, 'days'> & { payout: number; days: BitsContractDay[] }) | null;
  /** STARLIGHT can cover this buff failing its condition / already has. */
  guardable?: boolean;
  guarded?: boolean;
  /** LUNAR TIDE: extra BITS per hour right now. */
  rate_now?: number | null;
  /** A live line for the reworked buffs (mornings, night level, daily minimum…). */
  status?: string | null;
}

/** STARLIGHT (backend tracker/economy.py): the gauge and the days a star was lit. */
export interface Starlight {
  stars: number;
  max: number;
  cost: number;
  guard_on: boolean;
  /** Local days a star was lit, 'YYYY-MM-DD', oldest first. */
  days: string[];
  last_guard: { at: string; name: string } | null;
  /** What each wish costs. */
  uses?: Record<StarWish | 'festival', number>;
  /** What the next MYSTERY CRATE holds, if the stars were asked. */
  omen?: string | null;
  omen_id?: string | null;
  /** When the crate next changes, and what the stars saw goes with it. */
  crate_turns_at?: string;
  /** The crate is resting past that change: an omen would be wasted. */
  omen_too_late?: boolean;
}

export type StarWish = 'reroll' | 'omen';

/** A festival (backend tracker/festivals.py); dates are 'MM-DD', every year. */
export interface Festival {
  id: string;
  name: string;
  tagline: string;
  rule: string;
  accent: string;
  challengers: string[];
  start: string;
  end: string;
}

export interface FestivalPass {
  minutes: number;
  goal: number;
  steps: Array<{ at: number; kind: 'bits' | 'cursor'; bits?: number; cursor?: string; reached: boolean }>;
}

export interface BitsShopState {
  bits: BitsSummary;
  active_buff: BitsActiveBuff | null;
  /** When the next buff can be bought, while it cools down. */
  /** Buffs still cooling down, by id: when each can be bought again. */
  buff_cooldowns?: Record<string, string>;
  starlight?: Starlight;
  festival?: {
    active: Festival | null;
    calendar: Festival[];
    /** The running festival's bar. */
    pass?: FestivalPass | null;
    /** What the bars have opened, for good. */
    unlocks?: { cursors: string[] };
  };
  buffs: BitsBuff[];
  /** Older servers omit the challenge fields. */
  active_challenge?: ActiveChallenge | null;
  challenges?: { raids: RaidOffer[]; rivals: RivalOffer[] };
  last_challenge?: ChallengeResult | null;
  collection?: CollectionState;
}

/** One tier of the shop lineup (furniture.SHOP_ROTATION). */
export interface ShopGroup {
  tier: number;
  /** How many days each lineup of this tier lasts (1, 2 or 7). */
  every_days: number;
  /** The festival behind a limited group (every_days 0). */
  event?: Festival;
  items: string[];
  resets_at: string;
}

export interface ShopLineup {
  /** Every piece on show, featured first. */
  items: string[];
  /** The soonest change of any group. */
  resets_at: string;
  /** Older servers (one weekly lineup) omit groups and reserve. */
  groups?: ShopGroup[];
  /** The piece on hold: buyable even after it rotates out. */
  reserve?: string | null;
}

/** One of MY ROOM's five rooms (furniture.ROOM_SLOTS). */
export interface RoomSlot {
  name: string;
  /** Its arrangement (for the active room, the same as RoomState.layout). */
  layout: RoomLayout;
  /** The SAVE checkpoint, if one was made. */
  saved: RoomLayout | null;
  saved_at: string | null;
}

export interface StarterPack {
  id: string;
  name: string;
  line: string;
  price: number;
  /** What its pieces cost one by one. */
  value: number;
  layout: RoomLayout;
  pieces: string[];
}

export interface RoomState {
  layout: RoomLayout;
  /** No furniture yet: an empty room, the shop locked, a pack to choose. */
  starter_required?: boolean;
  starter_packs?: StarterPack[];
  inventory: Record<string, number>;
  /** Older servers omit the rooms; the editor then shows a single room. */
  rooms?: RoomSlot[];
  active_room?: number;
  catalog: FurnitureSpec[];
  catalog_version?: string;
  /** The furniture shop (named for when it turned over weekly). */
  weekly: ShopLineup;
  grid: { w: number; h: number; wall_rows: number };
}

/** What /room/ sends: the catalog only when the client lacks this version. */
type RoomPayload = Omit<RoomState, 'catalog'> & { catalog?: FurnitureSpec[] };

// The furniture catalog (~1,800 pieces) is static per deploy, so it is
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
    /** SAVE checkpoint / switch room / rename. `layout` (save, switch) is
     *  the editor's current arrangement, stored first. */
    rooms: async (
      body:
        | { action: 'save'; layout?: RoomLayout }
        | { action: 'switch'; slot: number; layout?: RoomLayout }
        | { action: 'rename'; slot: number; name: string }
    ): Promise<RoomState> => {
      const held = catalogCache ? `?catalog=${encodeURIComponent(catalogCache.version)}` : '';
      return withCatalog(
        await apiFetch<RoomPayload>(`/room/rooms/${held}`, {
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    },
    /** Puts one lineup piece on hold (replacing any other); null clears it. */
    reserve: async (item_id: string | null): Promise<RoomState> => {
      const held = catalogCache ? `?catalog=${encodeURIComponent(catalogCache.version)}` : '';
      return withCatalog(
        await apiFetch<RoomPayload>(`/room/reserve/${held}`, {
          method: 'POST',
          body: JSON.stringify({ item_id }),
        })
      );
    },
  },
  bits: {
    get: async () => apiFetch<BitsShopState>('/bits/'),
    /** Spends stars on a wish. */
    starlight: async (use: StarWish | 'festival', itemId?: string) =>
      apiFetch<BitsShopState>('/bits/starlight/', {
        method: 'POST',
        body: JSON.stringify({ use, item_id: itemId }),
      }),
    /** Ends the running buff early; `refunded` is what came back. */
    cancel: async () =>
      apiFetch<BitsShopState & { refunded: number }>('/bits/cancel/', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    /** Gives up the running BOSS RAID / RIVAL duel (nothing comes back). */
    forfeitChallenge: async () =>
      apiFetch<BitsShopState>('/bits/challenge/forfeit/', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    /** Starts BITS and MY ROOM over; study logs and categories stay. */
    reset: async () =>
      apiFetch<BitsShopState & { deleted_purchases: number; cleared_bonus_logs: number }>('/bits/reset/', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    /** `category`: CATEGORY LOCK's target (ignored by every other item). */
    /** `category`: CATEGORY LOCK's target; `categories`: HYDRA's 2-3 heads. */
    buy: async (item_id: string, category?: string | number, categories?: Array<string | number>) =>
      apiFetch<BitsShopState>('/bits/buy/', {
        method: 'POST',
        body: JSON.stringify({
          item_id,
          ...(category === undefined ? {} : { category }),
          ...(categories === undefined ? {} : { categories }),
        }),
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
        editable_until?: string;
      }>>(`/logs/${query}`);
    },
    create: async (data: {
      category: string | number | null;
      date: string;
      duration_minutes: number;
      topic: string;
      is_public_to_hub: boolean;
      /** The CHRONOMETER weather at commit time (STORM RUNNER); optional. */
      weather?: { code: number; temp_c: number; at: number };
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
    exportEconomy: async () => apiFetch<Record<string, unknown>>('/logs/export-economy/'),
    importBackup: async (payload: { categories?: unknown[]; logs: unknown[]; economy?: unknown }) => {
      return apiFetch<{ imported_logs: number; skipped_logs?: number; created_categories: number; restored_purchases?: number }>('/logs/import-backup/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
};

