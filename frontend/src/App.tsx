import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Plus,
  Play,
  Square,
  FolderPlus,
  BarChart3,
  Calendar,
  Moon,
  Sun,
  LogIn,
  LogOut,
  Trash2,
  Terminal,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Flame,
  Activity,
  Grid3x3,
  Download,
  Pencil,
  Settings,
  Upload,
  KeyRound,
  Save,
  Mail,
  CheckCircle2,
  Cpu,
  Code2,
  Zap,
  Globe,
  Compass,
  Layers,
  Database,
  Camera,
  Share2,
  Palette,
  Briefcase,
  CheckCheck,
  Undo2,
  ArrowUpRight,
} from 'lucide-react';
import { api, apiFetch, ApiError, getAccessToken } from './api';
import { TypboxLogo } from './TypboxLogo';
import { resolveSurfaceThemeId } from './surfaceThemes';
import { CategoryTrendTable } from './CategoryTrendTable';
import { CategorySelect } from './CategorySelect';
import { SaveButton, useSaveState } from './SaveButton';
import { inactiveHatch, segmentStyle, swatchStyle } from './categoryStyle';
import {
  I18nContext,
  LEGACY_LANG_STORAGE_KEY,
  TZ_STORAGE_KEY,
  buildI18nValue,
  formatDateTimeInZone,
  formatUtcOffset,
  getDeviceTimeZone,
  getZoneOffsetMinutes,
  getZonedParts,
  isValidTimeZone,
  listTimeZones,
  nowInZone,
  setActiveTimeZone,
  tf,
  useI18n,
  type Dict,
} from './i18n';
import {
  getClearanceStatus,
  AmbientSoundControl,
  ClearanceBrowserPanel,
  StatusCardModal,
  CommandPaletteModal,
  SurfaceThemeSelectorPanel,
  getSurfaceThemeById,
  getSurfaceBackgroundStyle,
  SURFACE_THEME_PAIRS,
  isThemeUnlocked,
  getPrestigeBadge,
  Award,
  type AnalyticsHorizonMode,
} from './telemetryFeatures';
import {
  DEFAULT_WEEK_START,
  WEEK_START_STORAGE_KEY,
  addDays,
  isWeekStart,
  orderedWeekdayLabels,
  parseDateStr,
  setActiveWeekStart,
  startOfWeek,
  startOfWeekStr,
  toDateStr,
  weekDates,
  weekdayPosition,
  weeksBetween,
  type WeekStart,
} from './week';
import {
  MAX_USER_STATUSES,
  USER_STATUS_GROUPS,
  USER_STATUS_OPTIONS,
  getUserStatusOption,
  matchesStatusQuery,
  sanitizeUserStatuses,
  type UserStatusGroup,
} from './userStatus';
import {
  CHRONO_THEME_STORAGE_KEY,
  DEFAULT_CHRONO_THEME_ID,
  getChronoThemeById,
  isChronoThemeUnlocked,
  type ChronoProgress,
} from './chronometerThemes';
import { ChronoDisplay, ChronometerThemePicker } from './ChronometerFace';
import { SurfaceFxLayer } from './SurfaceFx';
import { WeatherBadge, WeatherPanel, isWeatherThemeUnlocked, useWeather, type SyncedWeatherPrefs } from './Weather';
import { DEFAULT_WEATHER_THEME, WEATHER_THEMES, type WeatherThemeId } from './weatherThemes';
import { AmbientOverlay, AmbientSettingsPanel, isAmbientThemeUnlocked } from './AmbientOverlay';
import {
  AMBIENT_CLOCK_STORAGE_KEY,
  AMBIENT_DIM_LEVELS,
  AMBIENT_DIM_STORAGE_KEY,
  AMBIENT_THEME_STORAGE_KEY,
  AMBIENT_THEMES,
  DEFAULT_AMBIENT_DIM,
  DEFAULT_AMBIENT_THEME_ID,
  getAmbientThemeById,
  isAmbientDim,
  isAmbientThemeId,
  type AmbientDim,
} from './ambientThemes';
import { UiFontPicker, isUiFontUnlocked } from './UiFontPicker';
import { DEFAULT_UI_FONT_ID, UI_FONTS, UI_FONT_STORAGE_KEY, applyUiFont, getUiFontById, isUiFontId } from './uiFonts';
import { useKeepAwake } from './keepAwake';
import { Forecast } from './Forecast';
import { MoonPhaseCalendar } from './MoonPhaseCalendar';

// ==========================================
// Types & Interfaces
// ==========================================

export interface Category {
  id: string | number;
  name: string;
  code: string;
  color: string;
  /** Target per calendar week (from the user's week-start day, in their time zone). */
  weeklyTargetHours: number;
  /** Inactive = parked: history stays, no weekly target is tracked. */
  isActive: boolean;
  /**
   * UTC ISO timestamp when marked DONE (a finished one-off goal), else null.
   * DONE categories leave the registry and the log form but their logs
   * still count everywhere in analytics.
   */
  completedAt: string | null;
}

export interface StudyLog {
  id: string | number;
  categoryId: string | number | null;
  categoryCode?: string;
  categoryName?: string;
  categoryColor?: string;
  date: string;
  durationMinutes: number;
  durationHours?: number;
  topic: string;
  isPublicToHub: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatar_color?: string;
  avatar_preset?: string;
  avatar_image?: string;
  surface_theme?: string;
  language?: string;
  timezone?: string;
  week_start?: string;
  chrono_theme?: string;
  user_statuses?: string[];
  weather_theme?: string;
  weather_unit?: string;
  weather_hidden?: boolean | null;
  surface_fx?: boolean | null;
  ui_font?: string;
  ambient_theme?: string;
  ambient_clock?: boolean | null;
}

/** Account-synced UI prefs that go through the debounced PATCH queue. */
type UiPrefsPatch = SyncedWeatherPrefs & { surface_fx?: boolean; ui_font?: string; ambient_theme?: string; ambient_clock?: boolean };

type Theme = 'dark' | 'light';
type PeriodView = 'weekly' | 'weekly_agg' | 'monthly_agg' | 'monthly';
type AuthModalMode = 'login' | 'register' | 'forgot' | 'reset_confirm';
// Sign-ups are closed unless the build opts in (mirrors the backend's ALLOW_REGISTRATION).
const REGISTRATION_OPEN = import.meta.env.VITE_ALLOW_REGISTRATION === 'true';
type SettingsTab = 'profile' | 'themes' | 'fonts' | 'ambient' | 'clearance' | 'security' | 'data';
// Surface themes, UI fonts and ambient overlays share the single 02 / APPEARANCE tab.
const APPEARANCE_TABS: SettingsTab[] = ['themes', 'fonts', 'ambient'];
const CATEGORY_PREVIEW_COUNT = 5;

const AVATAR_PRESET_OPTIONS = [
  { id: 'initial', label: 'Initial' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'cpu', label: 'CPU' },
  { id: 'code', label: 'Code' },
  { id: 'zap', label: 'Zap' },
  { id: 'shield', label: 'Shield' },
  { id: 'globe', label: 'Globe' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'flame', label: 'Flame' },
  { id: 'compass', label: 'Compass' },
  { id: 'layers', label: 'Layers' },
  { id: 'database', label: 'Database' },
] as const;

const ACCENT_PALETTE = [
  // Row 1: Original 6 Core Accents
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  // Row 2: Original Distinct Bright & Pastel Accents
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Sky', hex: '#7dd3fc' },
  { name: 'Yellow', hex: '#fde047' },
  { name: 'Lavender', hex: '#c4b5fd' },
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Orange', hex: '#ea580c' },
  // Row 3: Original Distinct Deep, Earthy & Neutral Tones
  { name: 'Forest', hex: '#166534' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Bronze', hex: '#92400e' },
  { name: 'Crimson', hex: '#991b1b' },
  { name: 'Teal', hex: '#115e59' },
  { name: 'Slate', hex: '#64748b' },
  // Row 4: High-Clarity Vivid & Electric Spectrum
  { name: 'Mint', hex: '#2dd4bf' },
  { name: 'Cobalt', hex: '#2563eb' },
  { name: 'Tangerine', hex: '#fb923c' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Scarlet', hex: '#ef4444' },
  // Row 5: Soft Architectural Pastels & Tints
  { name: 'Pistachio', hex: '#bef264' },
  { name: 'Aquamarine', hex: '#67e8f9' },
  { name: 'Peach', hex: '#fdba74' },
  { name: 'Periwinkle', hex: '#93c5fd' },
  { name: 'Blush', hex: '#fda4af' },
  { name: 'Champagne', hex: '#fef08a' },
  // Row 6: Rich Earthy, Jewel & Industrial Monochrome
  { name: 'Olive', hex: '#4d7c0f' },
  { name: 'Plum', hex: '#6b21a8' },
  { name: 'Burgundy', hex: '#881337' },
  { name: 'Ochre', hex: '#ca8a04' },
  { name: 'Coffee', hex: '#78350f' },
  { name: 'Silver', hex: '#a1a1aa' },
];

// Default log-form category: the first active in-progress one, else any
// in-progress one. DONE categories are never picked.
const pickDefaultCategory = (cats: Category[]): Category | undefined => {
  const open = cats.filter((c) => !c.completedAt);
  return open.find((c) => c.isActive) ?? open[0];
};

const formatLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// "Today" is the user's calendar day in their account time zone (see
// nowInZone), not necessarily the device's.
const getRecentDateString = (daysAgo: number, timeZone: string): string => {
  const d = nowInZone(timeZone);
  d.setDate(d.getDate() - daysAgo);
  return formatLocalDateString(d);
};

const THEME_STORAGE_KEY = 'typbox_theme';
const SURFACE_THEME_STORAGE_KEY = 'typbox_surface_theme';
// Motion FX for PRESTIGE Surface Themes: a device-local comfort setting (like
// polarity), so it isn't synced to the account.
const SURFACE_FX_STORAGE_KEY = 'typbox_surface_fx';
const ASCENSION_STORAGE_PREFIX = 'typbox_ascension_';

// Ascension (Prestige) claims are device-local, same as polarity/sound prefs —
// there is no dedicated backend field for this yet, so a claim made on one
// device won't sync to another. Nothing destructive happens either way:
// worst case is being re-prompted to claim an already-claimed cycle.
const getStoredAscensions = (username: string | undefined): number => {
  if (typeof window === 'undefined' || !username) return 0;
  const raw = localStorage.getItem(`${ASCENSION_STORAGE_PREFIX}${username}`);
  const parsed = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const PrestigeChip: React.FC<{ totalAscensions: number; className?: string }> = ({
  totalAscensions,
  className = '',
}) => {
  const { t } = useI18n();
  const badge = getPrestigeBadge(totalAscensions);
  if (!badge) return null;
  return (
    <span
      className={`px-1.5 py-0.5 text-[10px] font-bold border tracking-wider shrink-0 ${
        badge.isPrism ? 'prestige-prism-text border-white/30' : ''
      } ${className}`}
      style={badge.isPrism ? undefined : { color: badge.colorHex, borderColor: `${badge.colorHex}80` }}
      title={tf(t.ascendedTimes, { n: totalAscensions })}
    >
      {badge.label}
    </span>
  );
};

// ==========================================
// Toast Notifications
// ==========================================

type ToastKind = 'success' | 'error';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  /** Optional inline button, e.g. UNDO; clicking it also dismisses the toast. */
  action?: ToastAction;
}

const TOAST_DURATION_MS = 3600;

const ToastStack: React.FC<{
  toasts: ToastItem[];
  isDark: boolean;
  onDismiss: (id: number) => void;
}> = ({ toasts, isDark, onDismiss }) => {
  const { t } = useI18n();
  return (
  <div
    className="fixed z-[70] bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-[360px] flex flex-col gap-2 pointer-events-none"
    role="status"
    aria-live="polite"
  >
    {toasts.map((toast) => {
      const ok = toast.kind === 'success';
      return (
        <div
          key={toast.id}
          className={`typbox-toast pointer-events-auto relative overflow-hidden border font-mono shadow-2xl ${
            ok ? 'border-emerald-500/70' : 'border-rose-500/70'
          } ${isDark ? 'bg-zinc-950/95 text-zinc-100' : 'bg-white/95 text-zinc-900'}`}
        >
          <div className="flex items-start gap-3 p-3 pr-2">
            <span
              className={`mt-0.5 w-7 h-7 shrink-0 flex items-center justify-center ${
                ok ? 'bg-emerald-500 text-zinc-950 typbox-toast-pop' : 'bg-rose-500 text-white'
              }`}
            >
              {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className={`text-[11px] font-bold uppercase tracking-widest ${
                  ok ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {toast.title}
              </div>
              {toast.message && (
                <div className={`text-[11px] mt-0.5 break-words ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {toast.message}
                </div>
              )}
            </div>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className="self-center text-[10px] font-bold uppercase tracking-widest px-2 py-1 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shrink-0"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className={`text-[10px] px-1.5 py-0.5 cursor-pointer ${isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-800'}`}
              aria-label={t.dismissNotification}
            >
              [X]
            </button>
          </div>
          <span
            className={`typbox-toast-timer absolute left-0 bottom-0 h-0.5 w-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
          />
        </div>
      );
    })}
  </div>
  );
};

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'dark';
};

const getInitialTimeZone = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(TZ_STORAGE_KEY);
    if (isValidTimeZone(saved)) return saved;
  }
  return getDeviceTimeZone();
};

const getInitialWeekStart = (): WeekStart => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(WEEK_START_STORAGE_KEY);
    if (isWeekStart(saved)) return saved;
  }
  return DEFAULT_WEEK_START;
};

const getInitialChronoTheme = (): string => {
  if (typeof window !== 'undefined') {
    return getChronoThemeById(localStorage.getItem(CHRONO_THEME_STORAGE_KEY)).id;
  }
  return DEFAULT_CHRONO_THEME_ID;
};

const readLocal = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};
const getInitialUiFont = (): string => {
  const saved = readLocal(UI_FONT_STORAGE_KEY);
  return isUiFontId(saved) ? saved : DEFAULT_UI_FONT_ID;
};
const getInitialAmbientTheme = (): string => {
  const saved = readLocal(AMBIENT_THEME_STORAGE_KEY);
  return isAmbientThemeId(saved) ? saved : DEFAULT_AMBIENT_THEME_ID;
};
const getInitialAmbientDim = (): AmbientDim => {
  const saved = readLocal(AMBIENT_DIM_STORAGE_KEY);
  return isAmbientDim(saved) ? saved : DEFAULT_AMBIENT_DIM;
};

const STATUS_GROUP_LABEL_KEY: Record<UserStatusGroup, keyof Dict> = {
  major: 'statusGroupMajor',
  school: 'statusGroupSchool',
  mission: 'statusGroupMission',
  rhythm: 'statusGroupRhythm',
  method: 'statusGroupMethod',
  archetype: 'statusGroupArchetype',
  fuel: 'statusGroupFuel',
  hobbies: 'statusGroupHobbies',
  sports: 'statusGroupSports',
};

const getInitialSurfaceTheme = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(SURFACE_THEME_STORAGE_KEY);
    if (saved) return resolveSurfaceThemeId(saved);
  }
  return 'monolith';
};

const compressAvatarFile = (file: File, t: Dict): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(t.errInvalidImage));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(t.errReadImage));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(t.errDecodeImage));
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error(t.errCanvas));
          return;
        }
        // Center-crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        // Try WebP first for compact size, fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', 0.82);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const AvatarBadge = ({
  username,
  color = '#10b981',
  preset = 'initial',
  image = '',
  size = 'sm',
}: {
  username: string;
  color?: string;
  preset?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const dimClass =
    size === 'lg'
      ? 'w-14 h-14 text-lg'
      : size === 'md'
      ? 'w-9 h-9 text-xs'
      : 'w-6 h-6 text-[11px]';
  const iconClass =
    size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  if (image && image.startsWith('data:image/')) {
    return (
      <div
        className={`${dimClass} rounded-full overflow-hidden border shrink-0 flex items-center justify-center bg-zinc-900`}
        style={{ borderColor: color }}
      >
        <img src={image} alt={username} className="w-full h-full object-cover" />
      </div>
    );
  }

  const renderPresetIcon = () => {
    switch (preset) {
      case 'terminal':
        return <Terminal className={iconClass} />;
      case 'cpu':
        return <Cpu className={iconClass} />;
      case 'code':
        return <Code2 className={iconClass} />;
      case 'zap':
        return <Zap className={iconClass} />;
      case 'shield':
        return <Shield className={iconClass} />;
      case 'globe':
        return <Globe className={iconClass} />;
      case 'sparkles':
        return <Sparkles className={iconClass} />;
      case 'flame':
        return <Flame className={iconClass} />;
      case 'compass':
        return <Compass className={iconClass} />;
      case 'layers':
        return <Layers className={iconClass} />;
      case 'database':
        return <Database className={iconClass} />;
      default:
        return <span>{(username || 'U').charAt(0).toUpperCase()}</span>;
    }
  };

  return (
    <div
      className={`${dimClass} rounded-full border shrink-0 flex items-center justify-center font-mono font-bold uppercase select-none`}
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}88`,
        color: color,
      }}
    >
      {renderPresetIcon()}
    </div>
  );
};

// ==========================================
// Main Component
// ==========================================

export default function App() {
  // UI Preferences (Persisted across reloads and responsive to OS preferences)
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [surfaceThemeId, setSurfaceThemeId] = useState<string>(getInitialSurfaceTheme);
  const [surfaceFxEnabled, setSurfaceFxEnabled] = useState<boolean>(
    () => typeof window === 'undefined' || localStorage.getItem(SURFACE_FX_STORAGE_KEY) !== 'off'
  );

  useEffect(() => {
    localStorage.setItem(SURFACE_FX_STORAGE_KEY, surfaceFxEnabled ? 'on' : 'off');
  }, [surfaceFxEnabled]);
  const [periodView, setPeriodView] = useState<PeriodView>('weekly');

  // Time zone: account-synced (UserProfile.timezone), cached in
  // localStorage for first paint and signed-out visits.
  const [timeZone, setTimeZone] = useState<string>(getInitialTimeZone);
  // Idempotent module sync so date helpers used during this render already
  // see the selected zone.
  setActiveTimeZone(timeZone);
  const i18n = useMemo(() => buildI18nValue(timeZone), [timeZone]);
  const { t, formatDateTime, locale } = i18n;
  const deviceTimeZone = useMemo(() => getDeviceTimeZone(), []);

  // First day of the calendar week (account-synced, UserProfile.week_start).
  // Weekly totals, category targets and the analytics week axis restart at
  // 00:00 on this day.
  const [weekStart, setWeekStart] = useState<WeekStart>(getInitialWeekStart);
  setActiveWeekStart(weekStart);

  useEffect(() => {
    localStorage.setItem(WEEK_START_STORAGE_KEY, weekStart);
  }, [weekStart]);

  // Chronometer Theme (collectible clock face, account-synced like the
  // Surface Theme; see handleSelectChronoTheme).
  const [chronoThemeId, setChronoThemeId] = useState<string>(getInitialChronoTheme);
  const [showChronoPicker, setShowChronoPicker] = useState<boolean>(false);
  const [showWeatherPanel, setShowWeatherPanel] = useState<boolean>(false);
  // UI font + Ambient overlay: account-synced through the UI prefs queue
  // (dim level is a per-device comfort setting and stays local).
  const [uiFontId, setUiFontId] = useState<string>(getInitialUiFont);
  const [ambientThemeId, setAmbientThemeId] = useState<string>(getInitialAmbientTheme);
  const [ambientClock, setAmbientClock] = useState<boolean>(() => readLocal(AMBIENT_CLOCK_STORAGE_KEY) !== 'off');
  const [ambientDim, setAmbientDim] = useState<AmbientDim>(getInitialAmbientDim);
  const [ambientPreviewId, setAmbientPreviewId] = useState<string | null>(null);
  // Debounced account sync for small UI prefs (weather widget, motion FX):
  // clicking through options sends one PATCH. Pending local changes always
  // win over a server value pulled in the meantime (see applyServerSurfaceTheme).
  const pendingUiPrefsRef = React.useRef<UiPrefsPatch>({});
  const uiPrefsTimerRef = React.useRef<number | null>(null);

  const flushUiPrefsSave = useCallback((keepalive = false) => {
    if (uiPrefsTimerRef.current !== null) {
      window.clearTimeout(uiPrefsTimerRef.current);
      uiPrefsTimerRef.current = null;
    }
    const body = pendingUiPrefsRef.current;
    if (Object.keys(body).length === 0) return;
    pendingUiPrefsRef.current = {};
    apiFetch('/auth/me/', { method: 'PATCH', body: JSON.stringify(body), keepalive }).catch((err: unknown) => {
      console.warn('TYPBOX: failed to sync UI preferences to account', err);
    });
  }, []);

  const queueUiPrefsSave = useCallback(
    (patch: UiPrefsPatch) => {
      if (!getAccessToken()) return; // signed out: device-local only
      pendingUiPrefsRef.current = { ...pendingUiPrefsRef.current, ...patch };
      if (uiPrefsTimerRef.current !== null) window.clearTimeout(uiPrefsTimerRef.current);
      uiPrefsTimerRef.current = window.setTimeout(() => flushUiPrefsSave(), 600);
    },
    [flushUiPrefsSave]
  );

  const weather = useWeather(timeZone, queueUiPrefsSave);
  const applyServerWeatherPrefs = weather.applyServerPrefs;

  useEffect(() => {
    localStorage.setItem(CHRONO_THEME_STORAGE_KEY, chronoThemeId);
  }, [chronoThemeId]);

  useEffect(() => {
    try {
      localStorage.setItem(UI_FONT_STORAGE_KEY, uiFontId);
      localStorage.setItem(AMBIENT_THEME_STORAGE_KEY, ambientThemeId);
      localStorage.setItem(AMBIENT_CLOCK_STORAGE_KEY, ambientClock ? 'on' : 'off');
      localStorage.setItem(AMBIENT_DIM_STORAGE_KEY, ambientDim);
    } catch {
      // Storage unavailable (private mode): prefs last for this tab only.
    }
  }, [uiFontId, ambientThemeId, ambientClock, ambientDim]);

  useEffect(() => {
    // English-only now: drop the retired language setting from this device.
    try {
      localStorage.removeItem(LEGACY_LANG_STORAGE_KEY);
    } catch {
      // Storage unavailable — nothing to clean up.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TZ_STORAGE_KEY, timeZone);
  }, [timeZone]);

  // Synchronize with OS system preferences when not explicitly pinned
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const explicit = localStorage.getItem(THEME_STORAGE_KEY);
      if (!explicit) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Authentication State (including initial detection of ?reset_uid=...&reset_token=... URL params)
  const initialResetParams = useMemo(() => {
    if (typeof window === 'undefined') return { uid: '', token: '', hasReset: false };
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('reset_uid') || '';
    const token = params.get('reset_token') || '';
    return { uid, token, hasReset: Boolean(uid && token) };
  }, []);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Prestige / Ascension cycle claim count (device-local, see getStoredAscensions).
  // Re-synced from localStorage during render (not an Effect) whenever the
  // signed-in username changes, following React's "adjusting state when a
  // prop changes" pattern — the guard prevents any re-render loop.
  const [claimedCycles, setClaimedCycles] = useState<number>(0);
  const [ascensionSyncedUsername, setAscensionSyncedUsername] = useState<string | undefined>(
    undefined
  );
  const [showAscensionModal, setShowAscensionModal] = useState<boolean>(false);
  if (user?.username !== ascensionSyncedUsername) {
    setAscensionSyncedUsername(user?.username);
    setClaimedCycles(getStoredAscensions(user?.username));
  }
  // Full-Screen Site Access Splash Screen
  const [isSiteLoading, setIsSiteLoading] = useState<boolean>(true);
  const [fadeLoader, setFadeLoader] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(initialResetParams.hasReset);
  const [authMode, setAuthMode] = useState<AuthModalMode>(
    initialResetParams.hasReset ? 'reset_confirm' : 'login'
  );
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState<string>('');
  const [resetUid, setResetUid] = useState<string>(initialResetParams.uid);
  const [resetToken, setResetToken] = useState<string>(initialResetParams.token);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Authentication Modal Controls with fresh input state reset
  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthMode(mode === 'register' && !REGISTRATION_OPEN ? 'login' : mode);
    setAuthError(null);
    setAuthSuccessMsg(null);
    setDebugResetUrl(null);
    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setAuthError(null);
    setAuthSuccessMsg(null);
    setDebugResetUrl(null);
    setAuthUsername('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setResetUid('');
    setResetToken('');
  }, []);

  // Clean password reset query parameters (?reset_uid=...&reset_token=...) from address bar on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !initialResetParams.hasReset) return;
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [initialResetParams.hasReset]);

  // Data State (Directly synchronized with Django Backend)
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  // The log stream starts with 5 logs; SHOW MORE adds 10 at a time on top of that.
  const INITIAL_VISIBLE_LOGS = 5;
  const [extraVisibleLogs, setExtraVisibleLogs] = useState<number>(0);
  const visibleLogCount = INITIAL_VISIBLE_LOGS + extraVisibleLogs;

  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // On desktop the log list stays as tall as its collapsed (5-log) height:
  // SHOW MORE / SHOW ALL scroll inside it, so the right column (and the lunar
  // calendar stretched to match it) doesn't grow with every expansion. The cap
  // is measured, not fixed, since rows change height (e.g. the inline editor).
  const logListRef = React.useRef<HTMLDivElement>(null);
  const [logListCap, setLogListCap] = useState<number | null>(null);
  const logStreamExpanded = extraVisibleLogs > 0;
  useEffect(() => {
    const el = logListRef.current;
    if (!el || logStreamExpanded || typeof ResizeObserver === 'undefined') return;
    // Fires once on observe, then on every content resize while collapsed.
    const observer = new ResizeObserver(() => setLogListCap(el.scrollHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [logStreamExpanded, logs.length, dataLoading]);

  // After SHOW MORE / SHOW ALL, bring the first newly shown row into view
  // inside the capped list (a no-op on phones, where the list isn't capped).
  const prevExtraVisibleLogsRef = React.useRef(0);
  useEffect(() => {
    const el = logListRef.current;
    const firstNewRow = INITIAL_VISIBLE_LOGS + prevExtraVisibleLogsRef.current;
    const grew = extraVisibleLogs > prevExtraVisibleLogsRef.current;
    prevExtraVisibleLogsRef.current = extraVisibleLogs;
    if (!el || !grew || el.scrollHeight <= el.clientHeight) return;
    const row = el.children[firstNewRow] as HTMLElement | undefined;
    if (row) el.scrollTo({ top: row.offsetTop, behavior: 'smooth' });
  }, [extraVisibleLogs]);

  // Timeline Navigation State for Analytics Module
  const [weeklyOffset, setWeeklyOffset] = useState<number>(0); // weeks ago (0 = current week)
  const [monthlyOffset, setMonthlyOffset] = useState<number>(0); // months ago (0 = current month)

  // Telemetry Cadence Matrix State (7 rows x dynamic W columns, auto-expanding in 1x/2x blocks)
  const [matrixColorMode, setMatrixColorMode] = useState<'intensity' | 'binary'>('intensity');
  const [matrixSpanMultiplier, setMatrixSpanMultiplier] = useState<1 | 2>(1);
  const [matrixPageOffset, setMatrixPageOffset] = useState<number>(0); // 0 = latest block
  const [baseFitWeeks, setBaseFitWeeks] = useState<number>(28);
  const [hoveredMatrixCell, setHoveredMatrixCell] = useState<{
    date: string;
    minutes: number;
    count: number;
    topics: string[];
  } | null>(null);
  const matrixGridContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = matrixGridContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 100) {
          // Each column is 13px wide + 4px gap = 17px
          const cols = Math.max(12, Math.min(52, Math.floor((w + 4) / 17)));
          setBaseFitWeeks(cols);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // System Chronometer (Real-Time Digital Clock) State
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const clockReadout = useMemo(() => {
    const p = getZonedParts(currentTime, timeZone);
    const hh = String(p.hour).padStart(2, '0');
    const mm = String(p.minute).padStart(2, '0');
    const ss = String(p.second).padStart(2, '0');
    const yyyy = p.year;
    const mo = String(p.month).padStart(2, '0');
    const dd = String(p.day).padStart(2, '0');
    const dayNames = t.weekdaysShortSun.split(',');
    const dayStr = dayNames[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()];

    const tzLabel = `${i18n.tzAbbr(currentTime)} ${formatUtcOffset(getZoneOffsetMinutes(currentTime, timeZone))}`;

    return {
      hh,
      mm,
      ss,
      hour: p.hour,
      minute: p.minute,
      second: p.second,
      dateDot: `${yyyy}.${mo}.${dd}`,
      dayStr,
      tzLabel,
    };
  }, [currentTime, timeZone, t, i18n]);

  // The user's calendar day, re-derived from the ticking clock so every
  // day/week window below rolls over at local midnight (e.g. weekly totals
  // restart at 00:00 on the week-start day) without a reload. The string
  // only changes once a day, so dependent memos don't recompute per tick.
  const todayStr = useMemo(() => {
    const p = getZonedParts(currentTime, timeZone);
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }, [currentTime, timeZone]);
  const currentWeekStartStr = useMemo(() => startOfWeekStr(todayStr, weekStart), [todayStr, weekStart]);

  // User Dropdown, Account Settings Modal & Account Deletion State
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [profileAvatarColor, setProfileAvatarColor] = useState<string>('#10b981');
  const [profileAvatarPreset, setProfileAvatarPreset] = useState<string>('initial');
  const [profileAvatarImage, setProfileAvatarImage] = useState<string>('');
  const [profileStatuses, setProfileStatuses] = useState<string[]>([]);
  const [statusLimitHit, setStatusLimitHit] = useState<boolean>(false);
  const [statusQuery, setStatusQuery] = useState<string>('');
  const [openStatusGroups, setOpenStatusGroups] = useState<UserStatusGroup[]>([]);
  const profileSave = useSaveState();
  // Save failures are shown next to the save button (the form is long, so
  // the status box at its top is usually scrolled out of view).
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [regionStatus, setRegionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [passwordSaving, setPasswordSaving] = useState<boolean>(false);
  const passwordSave = useSaveState();
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [clearLogsConfirmText, setClearLogsConfirmText] = useState<string>('');
  const [clearingLogs, setClearingLogs] = useState<boolean>(false);
  const [importingBackup, setImportingBackup] = useState<boolean>(false);
  const [dataStatus, setDataStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showStatusCardModal, setShowStatusCardModal] = useState<boolean>(false);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);
  const backupFileInputRef = React.useRef<HTMLInputElement>(null);

  // Global Command Palette Hotkey (Cmd + K on macOS / Ctrl + K on Windows & Linux)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const openSettingsModal = useCallback(
    (tab: SettingsTab = 'profile') => {
      if (user) {
        setProfileUsername(user.username || '');
        setProfileEmail(user.email || '');
        setProfileAvatarColor(user.avatar_color || '#10b981');
        setProfileAvatarPreset(user.avatar_preset || 'initial');
        setProfileAvatarImage(user.avatar_image || '');
        const statuses = sanitizeUserStatuses(user.user_statuses);
        setProfileStatuses(statuses);
        // ~200 options: open only the groups that already hold a pick.
        setOpenStatusGroups(
          USER_STATUS_GROUPS.filter((g) => statuses.some((id) => getUserStatusOption(id)?.group === g))
        );
      }
      setStatusLimitHit(false);
      setStatusQuery('');
      setProfileStatus(null);
      setProfileSaveError(null);
      setRegionStatus(null);
      setPasswordStatus(null);
      setDataStatus(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setClearLogsConfirmText('');
      setSettingsTab(tab);
      setShowUserMenu(false);
      setShowSettingsModal(true);
    },
    [user]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Log Form State
  const [inputMode, setInputMode] = useState<'manual' | 'timer'>('manual');
  const [selectedCatId, setSelectedCatId] = useState<string | number>('');
  const [logDate, setLogDate] = useState<string>(getRecentDateString(0, timeZone));
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Log Edit State
  // Commit (log submit) feedback: button state machine + toast + row flash
  const [commitState, setCommitState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [flashLogId, setFlashLogId] = useState<string | number | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeqRef = React.useRef<number>(0);
  const commitResetTimerRef = React.useRef<number | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (kind: ToastKind, title: string, message?: string, action?: ToastAction) => {
      toastSeqRef.current += 1;
      const id = toastSeqRef.current;
      // Keep at most 3 on screen; newest at the bottom.
      setToasts((prev) => [...prev.slice(-2), { id, kind, title, message, action }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  // Shared success feedback for every path that commits a new log.
  const announceLogCommitted = useCallback(
    (logId: string | number, catCode: string | undefined, minutes: number, date: string) => {
      pushToast(
        'success',
        t.toastLogCommitted,
        `[${catCode ?? 'MISC'}] ${minutes}m → ${date.replace(/-/g, '.')}`
      );
      setFlashLogId(logId);
      window.setTimeout(() => setFlashLogId((cur) => (cur === logId ? null : cur)), 2400);
    },
    [pushToast, t]
  );

  useEffect(
    () => () => {
      if (commitResetTimerRef.current !== null) window.clearTimeout(commitResetTimerRef.current);
    },
    []
  );

  const [editingLogId, setEditingLogId] = useState<string | number | null>(null);
  const [editLogCatId, setEditLogCatId] = useState<string | number>('');
  const [editLogDate, setEditLogDate] = useState<string>('');
  const [editLogDuration, setEditLogDuration] = useState<number>(60);

  // Drift-free Stopwatch State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerStartTimestampRef = React.useRef<number | null>(null);
  const accumulatedSecondsRef = React.useRef<number>(0);

  useEffect(() => {
    if (!isRunning) {
      timerStartTimestampRef.current = null;
      return;
    }
    timerStartTimestampRef.current = Date.now();
    const baseSec = accumulatedSecondsRef.current;

    const interval = setInterval(() => {
      if (timerStartTimestampRef.current !== null) {
        const deltaSec = Math.floor((Date.now() - timerStartTimestampRef.current) / 1000);
        setElapsedSeconds(baseSec + deltaSec);
      }
    }, 250);

    return () => {
      if (timerStartTimestampRef.current !== null) {
        const deltaSec = Math.floor((Date.now() - timerStartTimestampRef.current) / 1000);
        accumulatedSecondsRef.current = baseSec + deltaSec;
      }
      clearInterval(interval);
    };
  }, [isRunning]);

  // Keep the display awake while the stopwatch runs (and during an Ambient
  // preview) so Ambient Mode stays visible instead of the OS dimming and
  // sleeping the screen; see keepAwake.ts for the Wake Lock / video fallback.
  const keepAwakeMode = useKeepAwake(isRunning || ambientPreviewId !== null);

  // Ambient Mode: after a stretch of no user interaction while the stopwatch
  // is running, dim the UI and switch to a low-key decorative "still
  // working" presentation instead of leaving the full-brightness dashboard
  // lit (and the mouse/keyboard untouched) for long unattended stretches.
  const AMBIENT_IDLE_MS = 45000;
  const [isAmbientMode, setIsAmbientMode] = useState<boolean>(false);
  useEffect(() => {
    if (!isRunning) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    const scheduleAmbient = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setIsAmbientMode(true), AMBIENT_IDLE_MS);
    };
    const handleActivity = () => {
      setIsAmbientMode(false);
      scheduleAmbient();
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'wheel',
    ];
    activityEvents.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    scheduleAmbient();

    return () => {
      setIsAmbientMode(false);
      clearTimeout(idleTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [isRunning]);

  // Category Form State (Create & Edit)
  const [showCatForm, setShowCatForm] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatCode, setNewCatCode] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>(ACCENT_PALETTE[0].hex);
  const [newCatTarget, setNewCatTarget] = useState<number>(5);

  // Category Edit State
  const [editingCatId, setEditingCatId] = useState<string | number | null>(null);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [showDoneCategories, setShowDoneCategories] = useState<boolean>(false);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatCode, setEditCatCode] = useState<string>('');
  const [editCatColor, setEditCatColor] = useState<string>(ACCENT_PALETTE[0].hex);
  const [editCatTarget, setEditCatTarget] = useState<number>(5);
  const [editCatActive, setEditCatActive] = useState<boolean>(true);

  // ==========================================
  // Data Fetching: Categories & Logs
  // ==========================================

  const loadUserData = useCallback(async () => {
    setDataLoading(true);
    setApiError(null);
    try {
      const [fetchedCats, fetchedLogs] = await Promise.all([
        api.categories.list(),
        api.logs.list(),
      ]);

      const formattedCats: Category[] = fetchedCats.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        color: c.color,
        // Fallbacks keep this build working against a backend that hasn't
        // been migrated to weekly targets yet (frontend/backend deploy separately).
        weeklyTargetHours:
          c.weekly_target_hours ??
          (c.monthly_target_hours ? Math.max(1, Math.round((c.monthly_target_hours * 12) / 52)) : 5),
        isActive: c.is_active !== false,
        completedAt: c.completed_at ?? null,
      }));

      const formattedLogs: StudyLog[] = fetchedLogs.map((l) => ({
        id: l.id,
        categoryId: l.category,
        categoryCode: l.category_code,
        categoryName: l.category_name,
        categoryColor: l.category_color,
        date: l.date,
        durationMinutes: l.duration_minutes,
        durationHours: l.duration_hours,
        topic: l.topic,
        isPublicToHub: l.is_public_to_hub,
        createdAt: l.created_at,
      }));

      setCategories(formattedCats);
      setLogs(formattedLogs);
      // Functional update keeps this callback free of selectedCatId, so
      // picking a category doesn't re-run the initial auth effect below.
      const fallbackCat = pickDefaultCategory(formattedCats);
      if (fallbackCat) {
        setSelectedCatId((prev) => {
          const current = formattedCats.find((c) => String(c.id) === String(prev));
          return current && !current.completedAt ? prev : fallbackCat.id;
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error.message || 'Failed to load data from backend');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ==========================================
  // Account-Synced Surface Theme
  // ==========================================
  // The selected Surface Theme lives on the account (UserProfile.surface_theme)
  // so it follows the user across devices. localStorage is kept only as a
  // fast first-paint cache / signed-out fallback. Selections are debounced
  // before PATCHing so rapidly browsing themes doesn't spam the API, and a
  // pending local change always wins over a server value fetched meanwhile.
  const pendingSurfaceThemeRef = React.useRef<string | null>(null);
  const pendingChronoThemeRef = React.useRef<string | null>(null);
  const chronoThemeSaveTimerRef = React.useRef<number | null>(null);
  const surfaceThemeSaveTimerRef = React.useRef<number | null>(null);
  const lastSurfaceThemePullRef = React.useRef<number>(0);

  const applyServerSurfaceTheme = useCallback((me: AuthUser) => {
    lastSurfaceThemePullRef.current = Date.now();

    // Time zone rides along with the same account sync. A blank server value
    // means this account never chose one: adopt the device zone so the
    // backend has the user's zone from the first sign-in onward.
    const firstSync: { timezone?: string } = {};
    if (isValidTimeZone(me.timezone)) {
      setTimeZone(me.timezone);
    } else {
      const localTz = localStorage.getItem(TZ_STORAGE_KEY);
      firstSync.timezone = isValidTimeZone(localTz) ? localTz : getDeviceTimeZone();
    }
    if (firstSync.timezone) {
      api.auth.updateProfile(firstSync).catch(() => {});
    }
    if (isWeekStart(me.week_start)) setWeekStart(me.week_start);

    // Weather widget + motion FX: same rules — account wins, unless this
    // device has an unsent change, or the account has never stored a value
    // (then this device's value is pushed up instead of being reset).
    const pendingUi = pendingUiPrefsRef.current;
    const firstUiSync: UiPrefsPatch = {};
    if (!('weather_theme' in pendingUi || 'weather_unit' in pendingUi || 'weather_hidden' in pendingUi)) {
      const push = applyServerWeatherPrefs(me);
      if (push) Object.assign(firstUiSync, push);
    }
    if (!('surface_fx' in pendingUi) && me.surface_fx !== undefined) {
      if (me.surface_fx === null) {
        firstUiSync.surface_fx = localStorage.getItem(SURFACE_FX_STORAGE_KEY) !== 'off';
      } else {
        setSurfaceFxEnabled(me.surface_fx);
      }
    }
    // UI font / Ambient overlay: blank (or null) on the account = never
    // synced, so push this device's pick up instead of resetting it.
    if (!('ui_font' in pendingUi) && me.ui_font !== undefined) {
      if (isUiFontId(me.ui_font)) setUiFontId(me.ui_font);
      else if (!me.ui_font) firstUiSync.ui_font = readLocal(UI_FONT_STORAGE_KEY) ?? DEFAULT_UI_FONT_ID;
    }
    if (!('ambient_theme' in pendingUi) && me.ambient_theme !== undefined) {
      if (isAmbientThemeId(me.ambient_theme)) setAmbientThemeId(me.ambient_theme);
      else if (!me.ambient_theme) firstUiSync.ambient_theme = readLocal(AMBIENT_THEME_STORAGE_KEY) ?? DEFAULT_AMBIENT_THEME_ID;
    }
    if (!('ambient_clock' in pendingUi) && me.ambient_clock !== undefined) {
      if (me.ambient_clock === null) firstUiSync.ambient_clock = readLocal(AMBIENT_CLOCK_STORAGE_KEY) !== 'off';
      else setAmbientClock(me.ambient_clock);
    }
    if (Object.keys(firstUiSync).length > 0) {
      api.auth.updateProfile(firstUiSync).catch(() => {});
    }

    if (pendingChronoThemeRef.current === null) {
      if (me.chrono_theme) {
        setChronoThemeId(getChronoThemeById(me.chrono_theme).id);
      } else {
        const localChrono = localStorage.getItem(CHRONO_THEME_STORAGE_KEY);
        if (localChrono && localChrono !== DEFAULT_CHRONO_THEME_ID) {
          api.auth.updateProfile({ chrono_theme: localChrono }).catch(() => {});
        }
      }
    }

    if (pendingSurfaceThemeRef.current !== null) return;
    if (me.surface_theme) {
      setSurfaceThemeId(resolveSurfaceThemeId(me.surface_theme));
      return;
    }
    // First sync for this account: adopt the theme this device already uses
    // instead of resetting it, so existing users keep their current look.
    const local = localStorage.getItem(SURFACE_THEME_STORAGE_KEY);
    if (local) {
      api.auth.updateProfile({ surface_theme: local }).catch(() => {});
    }
  }, [applyServerWeatherPrefs]);

  const flushSurfaceThemeSave = useCallback((keepalive = false) => {
    if (surfaceThemeSaveTimerRef.current !== null) {
      window.clearTimeout(surfaceThemeSaveTimerRef.current);
      surfaceThemeSaveTimerRef.current = null;
    }
    const target = pendingSurfaceThemeRef.current;
    if (target === null) return;
    apiFetch('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify({ surface_theme: target }),
      keepalive,
    })
      .catch((err: unknown) => {
        console.warn('TYPBOX: failed to sync surface theme to account', err);
      })
      .finally(() => {
        if (pendingSurfaceThemeRef.current === target) {
          pendingSurfaceThemeRef.current = null;
        }
      });
  }, []);

  const handleSelectSurfaceTheme = useCallback(
    (id: string) => {
      setSurfaceThemeId(id);
      if (!user) return;
      pendingSurfaceThemeRef.current = id;
      if (surfaceThemeSaveTimerRef.current !== null) {
        window.clearTimeout(surfaceThemeSaveTimerRef.current);
      }
      surfaceThemeSaveTimerRef.current = window.setTimeout(() => flushSurfaceThemeSave(), 600);
    },
    [user, flushSurfaceThemeSave]
  );

  // Chronometer Theme: same debounced account sync as the Surface Theme, so
  // clicking through faces in the picker sends a single PATCH.
  const flushChronoThemeSave = useCallback((keepalive = false) => {
    if (chronoThemeSaveTimerRef.current !== null) {
      window.clearTimeout(chronoThemeSaveTimerRef.current);
      chronoThemeSaveTimerRef.current = null;
    }
    const target = pendingChronoThemeRef.current;
    if (target === null) return;
    apiFetch('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify({ chrono_theme: target }),
      keepalive,
    })
      .catch((err: unknown) => {
        console.warn('TYPBOX: failed to sync chronometer theme to account', err);
      })
      .finally(() => {
        if (pendingChronoThemeRef.current === target) {
          pendingChronoThemeRef.current = null;
        }
      });
  }, []);

  const handleSelectChronoTheme = useCallback(
    (id: string) => {
      setChronoThemeId(id);
      if (!user) return;
      pendingChronoThemeRef.current = id;
      if (chronoThemeSaveTimerRef.current !== null) {
        window.clearTimeout(chronoThemeSaveTimerRef.current);
      }
      chronoThemeSaveTimerRef.current = window.setTimeout(() => flushChronoThemeSave(), 600);
    },
    [user, flushChronoThemeSave]
  );

  // Flush a pending save when the tab is hidden/closed, and pull the latest
  // account theme when the tab regains focus (picks up changes made on
  // another device without needing a full reload).
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushSurfaceThemeSave(true);
        flushChronoThemeSave(true);
        flushUiPrefsSave(true);
        return;
      }
      if (Date.now() - lastSurfaceThemePullRef.current < 30_000) return;
      api.auth
        .getMe()
        .then(applyServerSurfaceTheme)
        .catch(() => {});
    };
    const handlePageHide = () => {
      flushSurfaceThemeSave(true);
      flushChronoThemeSave(true);
      flushUiPrefsSave(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [user, applyServerSurfaceTheme, flushSurfaceThemeSave, flushChronoThemeSave, flushUiPrefsSave]);

  // Initial Auth Check and Splash Loader on site access
  useEffect(() => {
    const initAuth = async () => {
      const startTime = Date.now();
      const token = getAccessToken();
      try {
        if (token) {
          const me = await api.auth.getMe();
          setUser(me);
          applyServerSurfaceTheme(me);
          await loadUserData();
        }
      } catch (err: unknown) {
        // Only a rejected token signs the user out; a network failure or a
        // cold-starting backend keeps the stored tokens for the next load.
        if (err instanceof ApiError && err.status === 401) {
          api.auth.logout();
        } else {
          setApiError((err as Error).message || 'Failed to load data from backend');
        }
        setUser(null);
      } finally {
        setAuthLoading(false);
        // Ensure clean minimum animation playback time (~650ms)
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 650 - elapsed);
        setTimeout(() => {
          setFadeLoader(true);
          setTimeout(() => setIsSiteLoading(false), 450);
        }, delay);
      }
    };
    initAuth();
  }, [loadUserData, applyServerSurfaceTheme]);

  // ==========================================
  // Auth & Account Settings Handlers
  // ==========================================

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setDebugResetUrl(null);

    if (authMode === 'forgot') {
      if (!authEmail.trim()) {
        setAuthError(t.errEnterEmail);
        return;
      }
      setAuthSubmitting(true);
      try {
        const res = await api.auth.requestPasswordReset(authEmail.trim());
        setAuthSuccessMsg(res.detail || t.msgResetLinkSent);
        if (res.debug_reset_url) {
          setDebugResetUrl(res.debug_reset_url);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setAuthError(error.message || t.errSendResetEmail);
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    if (authMode === 'reset_confirm') {
      if (authPassword.length < 8) {
        setAuthError(t.errPasswordMin);
        return;
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError(t.errPasswordMismatch);
        return;
      }
      setAuthSubmitting(true);
      try {
        const res = await api.auth.confirmPasswordReset(resetUid, resetToken, authPassword);
        setAuthMode('login');
        setAuthPassword('');
        setAuthConfirmPassword('');
        setAuthSuccessMsg(res.detail || t.msgResetComplete);
      } catch (err: unknown) {
        const error = err as Error;
        setAuthError(error.message || t.errResetLink);
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    if (authMode === 'register' && (!authEmail || !authEmail.trim())) {
      setAuthError(t.errEmailRequired);
      return;
    }

    setAuthSubmitting(true);

    try {
      if (authMode === 'register') {
        await api.auth.register(authUsername.trim(), authEmail.trim(), authPassword);
        // Automatically login after registration
        await api.auth.login(authUsername.trim(), authPassword);
      } else {
        await api.auth.login(authUsername.trim(), authPassword);
      }

      const me = await api.auth.getMe();
      setUser(me);
      applyServerSurfaceTheme(me);
      closeAuthModal();
      await loadUserData();
    } catch (err: unknown) {
      const error = err as Error;
      setAuthError(error.message || t.errAuthFailed);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    profileSave.begin();
    setProfileStatus(null);
    setProfileSaveError(null);
    try {
      const username = profileUsername.trim();
      const email = profileEmail.trim();
      const updated = await api.auth.updateProfile({
        // Only send identity fields that changed, so unrelated edits never
        // re-run the server's uniqueness checks.
        ...(username !== user.username ? { username } : {}),
        ...(email.toLowerCase() !== (user.email || '').toLowerCase() ? { email } : {}),
        avatar_color: profileAvatarColor,
        avatar_preset: profileAvatarPreset,
        avatar_image: profileAvatarImage,
        user_statuses: profileStatuses,
      });
      setUser(updated);
      profileSave.succeed();
    } catch (err: unknown) {
      const error = err as Error;
      profileSave.fail();
      setProfileSaveError(error.message || t.errProfileUpdate);
    }
  };

  // Time zone / week start apply instantly and are PATCHed to the account so
  // they follow the user to every device and the next sign-in.
  const handleUpdateRegion = async (patch: { timezone?: string; week_start?: WeekStart }) => {
    if (patch.week_start) setWeekStart(patch.week_start);
    if (patch.timezone) {
      if (!isValidTimeZone(patch.timezone)) return;
      setTimeZone(patch.timezone);
    }
    if (!user) return;
    setRegionStatus(null);
    try {
      const updated = await api.auth.updateProfile(patch);
      setUser(updated);
      setRegionStatus({ type: 'success', text: t.msgRegionSaved });
    } catch (err: unknown) {
      const error = err as Error;
      setRegionStatus({ type: 'error', text: error.message || t.errRegionSave });
    }
  };

  // ~400 IANA zones; only built while the profile tab is actually open.
  const timeZoneOptions = useMemo(() => {
    if (!showSettingsModal || settingsTab !== 'profile') return [];
    const now = new Date();
    return listTimeZones(timeZone).map((tz) => ({
      id: tz,
      label: `${tz.replace(/_/g, ' ')} (${formatUtcOffset(getZoneOffsetMinutes(now, tz))})`,
    }));
  }, [showSettingsModal, settingsTab, timeZone]);

  const toggleProfileStatus = (id: string) => {
    if (profileStatuses.includes(id)) {
      setProfileStatuses(profileStatuses.filter((s) => s !== id));
      setStatusLimitHit(false);
      return;
    }
    if (profileStatuses.length >= MAX_USER_STATUSES) {
      setStatusLimitHit(true);
      return;
    }
    setProfileStatuses([...profileStatuses, id]);
    setStatusLimitHit(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileStatus(null);
    try {
      const compressedDataUrl = await compressAvatarFile(file, t);
      setProfileAvatarImage(compressedDataUrl);
    } catch (err: unknown) {
      const error = err as Error;
      setProfileStatus({ type: 'error', text: error.message || t.errProcessImage });
    } finally {
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: t.errPasswordMin });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({ type: 'error', text: t.errNewPasswordMismatch });
      return;
    }
    passwordSave.begin();
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      passwordSave.succeed();
      setPasswordStatus({ type: 'success', text: t.msgPasswordUpdated });
    } catch (err: unknown) {
      const error = err as Error;
      passwordSave.fail();
      setPasswordStatus({ type: 'error', text: error.message || t.errChangePassword });
    }
  };

  const handleSendResetEmailFromSettings = async () => {
    if (!user?.email) return;
    setPasswordStatus(null);
    setPasswordSaving(true);
    try {
      const res = await api.auth.requestPasswordReset(user.email);
      setPasswordStatus({
        type: 'success',
        text: `${tf(t.msgResetDispatched, { email: user.email })}${
          res.debug_reset_url ? t.msgDevUrlLogged : ''
        }`,
      });
      if (res.debug_reset_url) {
        console.info('TYPBOX Dev Password Reset Link:', res.debug_reset_url);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setPasswordStatus({ type: 'error', text: error.message || t.errSendReset });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDataStatus(null);
    setImportingBackup(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.logs)) {
        throw new Error(t.errBackupNoLogs);
      }
      const res = await api.logs.importBackup({
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        logs: parsed.logs,
      });
      await loadUserData();
      setDataStatus({
        type: 'success',
        text: tf(t.msgImported, {
          logs: res.imported_logs,
          cats: res.created_categories,
          skipped: res.skipped_logs ?? 0,
        }),
      });
    } catch (err: unknown) {
      const error = err as Error;
      setDataStatus({ type: 'error', text: error.message || t.errImport });
    } finally {
      setImportingBackup(false);
      e.target.value = '';
    }
  };

  const handleClearAllLogs = async () => {
    if (clearLogsConfirmText !== 'CLEAR') return;
    setClearingLogs(true);
    setDataStatus(null);
    try {
      const res = await api.logs.clearAll();
      setLogs([]);
      setCategories([]);
      setSelectedCatId('');
      setClearLogsConfirmText('');
      setDataStatus({
        type: 'success',
        text: tf(t.msgCleared, { n: res.deleted, cats: res.deleted_categories ?? 0 }),
      });
    } catch (err: unknown) {
      const error = err as Error;
      setDataStatus({ type: 'error', text: error.message || t.errClearLogs });
    } finally {
      setClearingLogs(false);
    }
  };

  const handleSignOut = () => {
    // Send any debounced theme change while the access token still exists.
    flushSurfaceThemeSave(true);
    flushChronoThemeSave(true);
    flushUiPrefsSave(true);
    api.auth.logout();
    setUser(null);
    setCategories([]);
    setLogs([]);
    setSelectedCatId('');
    setShowUserMenu(false);
    setShowSettingsModal(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await api.auth.deleteAccount();
      setUser(null);
      setCategories([]);
      setLogs([]);
      setSelectedCatId('');
      setShowDeleteModal(false);
      setShowSettingsModal(false);
      setShowUserMenu(false);
      setDeleteConfirmUsername('');
      alert(t.msgAccountDeleted);
    } catch (err: unknown) {
      const error = err as Error;
      alert(tf(t.errDeleteAccount, { msg: error.message }));
    } finally {
      setDeletingAccount(false);
    }
  };

  // ==========================================
  // Tracker Handlers (Direct API Calls)
  // ==========================================

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    const finalMinutes =
      inputMode === 'timer' ? Math.max(1, Math.round(elapsedSeconds / 60)) : durationMinutes;

    if (!selectedCatId || finalMinutes <= 0) return;
    if (commitState === 'submitting') return;

    setCommitState('submitting');
    if (commitResetTimerRef.current !== null) {
      window.clearTimeout(commitResetTimerRef.current);
      commitResetTimerRef.current = null;
    }

    try {
      const created = await api.logs.create({
        category: selectedCatId,
        date: logDate,
        duration_minutes: Number(finalMinutes),
        topic: '',
        is_public_to_hub: true,
      });

      const cat = categories.find((c) => String(c.id) === String(selectedCatId));
      const newLogItem: StudyLog = {
        id: (created as { id: number | string }).id,
        categoryId: selectedCatId,
        categoryCode: cat?.code,
        categoryName: cat?.name,
        categoryColor: cat?.color,
        date: logDate,
        durationMinutes: Number(finalMinutes),
        topic: '',
        isPublicToHub: true,
        createdAt: new Date().toISOString(),
      };

      setLogs((prev) => [newLogItem, ...prev]);
      if (inputMode === 'timer') {
        setIsRunning(false);
        setElapsedSeconds(0);
        accumulatedSecondsRef.current = 0;
        timerStartTimestampRef.current = null;
      }
      announceLogCommitted(newLogItem.id, cat?.code, Number(finalMinutes), logDate);
      setCommitState('success');
      commitResetTimerRef.current = window.setTimeout(() => {
        setCommitState('idle');
        commitResetTimerRef.current = null;
      }, 1800);
    } catch (err: unknown) {
      const error = err as Error;
      setCommitState('idle');
      pushToast('error', t.toastCommitFailed, error.message || t.errSaveLog);
    }
  };

  const handleQuickLogFromPalette = useCallback(
    async (categoryId: string | number, minutes: number) => {
      if (!user || minutes <= 0) return false;
      const todayDate = getRecentDateString(0, timeZone);
      try {
        const created = await api.logs.create({
          category: categoryId,
          date: todayDate,
          duration_minutes: Number(minutes),
          topic: '',
          is_public_to_hub: true,
        });

        const cat = categories.find((c) => String(c.id) === String(categoryId));
        const newLogItem: StudyLog = {
          id: (created as { id: number | string }).id,
          categoryId,
          categoryCode: cat?.code,
          categoryName: cat?.name,
          categoryColor: cat?.color,
          date: todayDate,
          durationMinutes: Number(minutes),
          topic: '',
          isPublicToHub: true,
          createdAt: new Date().toISOString(),
        };

        setLogs((prev) => [newLogItem, ...prev]);
        announceLogCommitted(newLogItem.id, cat?.code, Number(minutes), todayDate);
        return true;
      } catch (err: unknown) {
        const error = err as Error;
        pushToast('error', t.toastQuickLogFailed, error.message || t.errSaveLog);
        return false;
      }
    },
    [user, categories, announceLogCommitted, pushToast, t, timeZone]
  );

  const handleStartEditLog = (log: StudyLog) => {
    setEditingLogId(log.id);
    setEditLogCatId(log.categoryId ?? (categories[0]?.id ?? ''));
    setEditLogDate(log.date);
    setEditLogDuration(log.durationMinutes);
  };

  const handleCancelEditLog = () => {
    setEditingLogId(null);
  };

  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || editingLogId === null) return;
    if (!editLogCatId || editLogDuration <= 0) return;

    const updatedDuration = Number(editLogDuration) || 60;

    try {
      await api.logs.update(editingLogId, {
        category: editLogCatId,
        date: editLogDate,
        duration_minutes: updatedDuration,
        topic: '',
      });

      const cat = categories.find((c) => String(c.id) === String(editLogCatId));
      setLogs((prev) =>
        prev.map((l) =>
          String(l.id) === String(editingLogId)
            ? {
                ...l,
                categoryId: editLogCatId,
                categoryCode: cat?.code,
                categoryName: cat?.name,
                categoryColor: cat?.color,
                date: editLogDate,
                durationMinutes: updatedDuration,
                durationHours: +(updatedDuration / 60).toFixed(2),
                topic: '',
              }
            : l
        )
      );
      setEditingLogId(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert(tf(t.errUpdateLog, { msg: error.message }));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!newCatName.trim() || !newCatCode.trim()) return;

    try {
      const created = await api.categories.create({
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase().slice(0, 4),
        color: newCatColor,
        weekly_target_hours: Number(newCatTarget) || 5,
      });

      const newCat: Category = {
        id: (created as { id: number | string }).id,
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase().slice(0, 4),
        color: newCatColor,
        weeklyTargetHours: Number(newCatTarget) || 5,
        isActive: true,
        completedAt: null,
      };

      setCategories([...categories, newCat]);
      setSelectedCatId(newCat.id);
      setNewCatName('');
      setNewCatCode('');
      setShowCatForm(false);
    } catch (err: unknown) {
      const error = err as Error;
      alert(tf(t.errCreateCategory, { msg: error.message }));
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatCode(cat.code);
    setEditCatColor(cat.color);
    setEditCatTarget(cat.weeklyTargetHours);
    setEditCatActive(cat.isActive);
    setShowCatForm(false);
  };

  const handleCancelEditCategory = () => {
    setEditingCatId(null);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || editingCatId === null) return;
    if (!editCatName.trim() || !editCatCode.trim()) return;

    const updatedName = editCatName.trim();
    const updatedCode = editCatCode.trim().toUpperCase().slice(0, 4);
    const updatedColor = editCatColor;
    // While inactive the target input is locked, so the last target is kept
    // as-is and comes back when the category is reactivated.
    const updatedTarget = Number(editCatTarget) || 5;
    const updatedActive = editCatActive;

    try {
      await api.categories.update(editingCatId, {
        name: updatedName,
        code: updatedCode,
        color: updatedColor,
        weekly_target_hours: updatedTarget,
        is_active: updatedActive,
      });

      setCategories((prev) =>
        prev.map((c) =>
          String(c.id) === String(editingCatId)
            ? {
                ...c,
                name: updatedName,
                code: updatedCode,
                color: updatedColor,
                weeklyTargetHours: updatedTarget,
                isActive: updatedActive,
              }
            : c
        )
      );

      setLogs((prev) =>
        prev.map((l) =>
          String(l.categoryId) === String(editingCatId)
            ? {
                ...l,
                categoryName: updatedName,
                categoryCode: updatedCode,
                categoryColor: updatedColor,
              }
            : l
        )
      );

      setEditingCatId(null);
    } catch (err: unknown) {
      const error = err as Error;
      alert(tf(t.errUpdateCategory, { msg: error.message }));
    }
  };

  const handleDeleteCategory = async (id: string | number, name: string) => {
    if (categories.length <= 1) {
      alert(t.errLastCategory);
      return;
    }
    const target = categories.find((c) => String(c.id) === String(id));
    if (target && !target.completedAt && !categories.some((c) => !c.completedAt && String(c.id) !== String(id))) {
      alert(t.errLastOpenCategory);
      return;
    }
    const hasLogs = logs.some((l) => String(l.categoryId) === String(id));
    const confirmMsg = hasLogs
      ? tf(t.confirmDeleteCategoryLogs, { name })
      : tf(t.confirmDeleteCategory, { name });

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.categories.delete(id);
      const remaining = categories.filter((c) => c.id !== id);
      setCategories(remaining);

      if (String(editingCatId) === String(id)) {
        setEditingCatId(null);
      }

      const nextCat = pickDefaultCategory(remaining);
      if (String(selectedCatId) === String(id) && nextCat) {
        setSelectedCatId(nextCat.id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(tf(t.errDeleteCategory, { msg: error.message }));
    }
  };

  // DONE <-> in progress. Marking DONE hides the category from the registry
  // and the log form (its logs keep counting in analytics) and offers UNDO.
  const handleSetCategoryDone = async (cat: Category, done: boolean, offerUndo = true) => {
    if (!user) return;
    if (done) {
      if (!categories.some((c) => !c.completedAt && String(c.id) !== String(cat.id))) {
        alert(t.errLastOpenCategory);
        return;
      }
      const isTiming = (isRunning || elapsedSeconds > 0) && String(selectedCatId) === String(cat.id);
      if (isTiming && !window.confirm(tf(t.confirmDoneWhileTiming, { code: cat.code }))) return;
    }

    try {
      const updated = await api.categories.update(cat.id, { completed: done });
      const completedAt = updated.completed_at ?? null;
      // A backend without DONE support ignores `completed`; don't claim success.
      if (done && !completedAt) throw new Error(t.errDoneUnsupported);
      setCategories((prev) =>
        prev.map((c) => (String(c.id) === String(cat.id) ? { ...c, completedAt } : c))
      );
      if (String(editingCatId) === String(cat.id)) setEditingCatId(null);

      if (done) {
        if (String(selectedCatId) === String(cat.id)) {
          const nextCat = pickDefaultCategory(
            categories.filter((c) => String(c.id) !== String(cat.id))
          );
          if (nextCat) setSelectedCatId(nextCat.id);
        }
        pushToast(
          'success',
          tf(t.toastCategoryDone, { code: cat.code }),
          t.toastCategoryDoneHint,
          offerUndo ? { label: t.undo, onClick: () => void handleSetCategoryDone(cat, false, false) } : undefined
        );
      } else if (offerUndo) {
        pushToast('success', tf(t.toastCategoryRestored, { code: cat.code }));
      }
    } catch (err: unknown) {
      const error = err as Error;
      pushToast('error', t.errCategoryDone, error.message);
    }
  };

  const handleDeleteLog = async (id: string | number) => {
    if (!window.confirm(t.confirmDeleteLog)) return;
    try {
      await api.logs.delete(id);
      setLogs(logs.filter((l) => l.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      alert(tf(t.errDeleteLog, { msg: error.message }));
    }
  };

  // ==========================================
  // Computed Analytics & Timeline Navigation
  // ==========================================

  const maxWeeksAgo = useMemo(() => {
    if (logs.length === 0) return 12;
    const oldest = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
    return Math.max(12, weeksBetween(startOfWeekStr(oldest, weekStart), currentWeekStartStr));
  }, [logs, weekStart, currentWeekStartStr]);

  const maxMonthsAgo = useMemo(() => {
    if (logs.length === 0) return 4;
    const now = nowInZone(timeZone);
    const oldest = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
    const oldestDate = new Date(oldest + 'T00:00:00');
    const diffMonths = (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth());
    return Math.max(4, Math.max(0, diffMonths));
  }, [logs, timeZone]);

  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM in the user's zone

  const stats = useMemo(() => {
    const totalMin = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    // Current calendar week: restarts at 00:00 on the week-start day.
    const thisWeek = new Set(weekDates(currentWeekStartStr));
    const weeklyMin = logs
      .filter((l) => thisWeek.has(l.date))
      .reduce((acc, l) => acc + l.durationMinutes, 0);
    const monthlyMin = logs
      .filter((l) => l.date.startsWith(currentMonthPrefix))
      .reduce((acc, l) => acc + l.durationMinutes, 0);

    return {
      totalMin,
      totalHours: (totalMin / 60).toFixed(1),
      weeklyHours: (weeklyMin / 60).toFixed(1),
      monthlyHours: (monthlyMin / 60).toFixed(1),
    };
  }, [logs, currentMonthPrefix, currentWeekStartStr]);

  const clearanceStatus = useMemo(() => {
    return getClearanceStatus(user ? stats.totalMin : 0, claimedCycles);
  }, [user, stats.totalMin, claimedCycles]);

  // Claims one pending Ascension: persists the new cycle count (device-local)
  // and shows the celebration modal. Safe to call repeatedly — it's a no-op
  // once `ascensionAvailable` goes false.
  const claimAscension = useCallback(() => {
    if (!user?.username || !clearanceStatus.ascensionAvailable) return;
    const nextClaimed = claimedCycles + 1;
    localStorage.setItem(`${ASCENSION_STORAGE_PREFIX}${user.username}`, String(nextClaimed));
    setClaimedCycles(nextClaimed);
    setShowAscensionModal(true);
  }, [user?.username, clearanceStatus.ascensionAvailable, claimedCycles]);

  // Enforce Clearance/Ascension unlock restriction on active Surface Theme Pair
  const activeSurfacePair = useMemo(() => {
    const candidate = getSurfaceThemeById(surfaceThemeId);
    if (!authLoading && !dataLoading && !isThemeUnlocked(candidate, clearanceStatus)) {
      return getSurfaceThemeById('monolith');
    }
    return candidate;
  }, [surfaceThemeId, authLoading, dataLoading, clearanceStatus]);

  // Sync theme polarity & Dual-Polarity Surface Theme CSS variables with DOM and localStorage
  useEffect(() => {
    const isDarkMode = theme === 'dark';
    const pal = isDarkMode ? activeSurfacePair.dark : activeSurfacePair.light;
    const root = document.documentElement;

    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    root.style.setProperty('--tb-bg-main', pal.bgMain);
    root.style.setProperty('--tb-bg-card', pal.bgCard);
    root.style.setProperty('--tb-bg-input', pal.bgInput);
    root.style.setProperty('--tb-border', pal.border);
    root.style.setProperty('--tb-text-main', pal.textMain);
    root.style.setProperty('--tb-text-muted', pal.textMuted);

    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(SURFACE_THEME_STORAGE_KEY, surfaceThemeId);
  }, [theme, surfaceThemeId, activeSurfacePair]);

  // In-progress categories feed the registry, the log form and the command
  // palette; DONE ones only live on in analytics (and the DONE fold).
  const openCategories = useMemo(() => categories.filter((c) => !c.completedAt), [categories]);
  // Analytics keeps every category's history but draws DONE ones like
  // parked ones: hatched, no weekly target.
  const analyticsCategories = useMemo(
    () => categories.map((c) => (c.completedAt ? { ...c, isActive: false } : c)),
    [categories]
  );

  // Weekly Navigation Data: one calendar week, left edge pinned to its
  // first day (Monday or Sunday per the user's setting).
  const selectedWeeklyDays = useMemo(
    () => weekDates(addDays(currentWeekStartStr, -7 * weeklyOffset)),
    [weeklyOffset, currentWeekStartStr]
  );

  const weeklyWindowLabel = useMemo(() => {
    if (selectedWeeklyDays.length < 7) return '';
    return `${selectedWeeklyDays[0]} — ${selectedWeeklyDays[6]}`;
  }, [selectedWeeklyDays]);

  const weeklyChartData = useMemo(() => {
    const weekdayNames = t.weekdaysShortSun.split(',');
    return selectedWeeklyDays.map((dateStr) => {
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const totalDayMin = dayLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      const byCategory = analyticsCategories.map((cat) => {
        const catMin = dayLogs
          .filter((l) => String(l.categoryId) === String(cat.id))
          .reduce((acc, l) => acc + l.durationMinutes, 0);
        return { category: cat, minutes: catMin };
      });
      return {
        date: dateStr,
        label: dateStr.slice(5),
        weekday: weekdayNames[parseDateStr(dateStr).getDay()],
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
        totalMinutes: totalDayMin,
        byCategory,
      };
    });
  }, [logs, analyticsCategories, selectedWeeklyDays, todayStr, t]);

  const weeklyPeriodTotalMinutes = useMemo(() => {
    return weeklyChartData.reduce((acc, d) => acc + d.totalMinutes, 0);
  }, [weeklyChartData]);

  const maxScaleMinutes = useMemo(() => {
    const maxDay = Math.max(...weeklyChartData.map((d) => d.totalMinutes), 0);
    return Math.max(240, maxDay);
  }, [weeklyChartData]);

  // Monthly Navigation Data
  const targetMonthDate = useMemo(() => {
    const d = nowInZone(timeZone);
    d.setDate(1); // prevent month rollover bug
    d.setMonth(d.getMonth() - monthlyOffset);
    return d;
  }, [monthlyOffset, timeZone]);

  const targetMonthPrefix = useMemo(() => {
    const y = targetMonthDate.getFullYear();
    const m = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [targetMonthDate]);

  const targetMonthName = useMemo(() => {
    return targetMonthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();
  }, [targetMonthDate, locale]);

  const daysInTargetMonth = useMemo(() => {
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const rawDay = new Date(year, month, 1).getDay();
    const startDayOfWeek = weekdayPosition(rawDay, weekStart); // leading blanks before day 1

    const days = Array.from({ length: numDays }, (_, i) => {
      const dayNum = String(i + 1).padStart(2, '0');
      const dateStr = `${targetMonthPrefix}-${dayNum}`;
      const dayMin = logs
        .filter((l) => l.date === dateStr)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      return { date: dateStr, day: i + 1, minutes: dayMin };
    });

    return { days, startDayOfWeek, numDays };
  }, [targetMonthDate, targetMonthPrefix, logs, weekStart]);

  const monthlyPeriodTotalMinutes = useMemo(() => {
    return daysInTargetMonth.days.reduce((acc, d) => acc + d.minutes, 0);
  }, [daysInTargetMonth]);

  // Current calendar week in the user's zone (week-start day 00:00 through
  // the 7th day): the window weekly category targets are measured against,
  // same as the "this week" stat. Progress starts from zero on the first day
  // of each week; earlier weeks stay available in Analytics.
  const currentWeekDates = useMemo(() => weekDates(currentWeekStartStr), [currentWeekStartStr]);

  const weeklyBreakdown = useMemo(() => {
    const weekSet = new Set(currentWeekDates);
    const weekLogs = logs.filter((l) => weekSet.has(l.date));
    // DONE categories are left out here: they have their own fold below.
    const rows = openCategories.map((cat) => {
      const catLogs = weekLogs.filter((l) => String(l.categoryId) === String(cat.id));
      const minutes = catLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      const hours = +(minutes / 60).toFixed(1);
      const progress = cat.isActive
        ? Math.min(100, Math.round((hours / Math.max(1, cat.weeklyTargetHours)) * 100))
        : 0;
      return {
        ...cat,
        hours,
        minutes,
        progress,
        targetMet: cat.isActive && hours >= cat.weeklyTargetHours,
      };
    });
    // Active categories first; original order is kept within each group.
    return [...rows.filter((r) => r.isActive), ...rows.filter((r) => !r.isActive)];
  }, [logs, openCategories, currentWeekDates]);

  const activeCategoryCount = useMemo(() => openCategories.filter((c) => c.isActive).length, [openCategories]);

  // DONE fold: all-time hours per finished category, most recently finished first.
  const doneCategories = useMemo(
    () =>
      categories
        .filter((c) => c.completedAt)
        .map((cat) => ({
          ...cat,
          minutes: logs
            .filter((l) => String(l.categoryId) === String(cat.id))
            .reduce((acc, l) => acc + l.durationMinutes, 0),
        }))
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [categories, logs]
  );

  // The registry lists the first CATEGORY_PREVIEW_COUNT rows; the rest fold
  // behind SHOW MORE. A row being edited always stays visible.
  const hiddenCategories = useMemo(
    () =>
      showAllCategories
        ? []
        : weeklyBreakdown.slice(CATEGORY_PREVIEW_COUNT).filter((c) => String(c.id) !== String(editingCatId)),
    [weeklyBreakdown, showAllCategories, editingCatId]
  );
  const visibleCategories = useMemo(
    () => weeklyBreakdown.filter((c) => !hiddenCategories.includes(c)),
    [weeklyBreakdown, hiddenCategories]
  );

  // Same pattern as the log stream: on desktop the registry keeps its
  // collapsed (CATEGORY_PREVIEW_COUNT-row) height and SHOW MORE scrolls
  // inside it instead of stretching the column. Measured while collapsed,
  // since rows change height (inline editor, hints).
  const categoryListRef = React.useRef<HTMLDivElement>(null);
  const [categoryListCap, setCategoryListCap] = useState<number | null>(null);
  useEffect(() => {
    const el = categoryListRef.current;
    if (!el || showAllCategories || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setCategoryListCap(el.scrollHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [showAllCategories, weeklyBreakdown.length, dataLoading]);

  // Expanding brings the first newly shown row into view; collapsing
  // resets the scroll so the next expansion starts from the top.
  useEffect(() => {
    const el = categoryListRef.current;
    if (!el) return;
    if (!showAllCategories) {
      el.scrollTop = 0;
      return;
    }
    if (el.scrollHeight <= el.clientHeight) return;
    const row = el.children[CATEGORY_PREVIEW_COUNT] as HTMLElement | undefined;
    if (row) el.scrollTo({ top: row.offsetTop - el.offsetTop, behavior: 'smooth' });
  }, [showAllCategories]);

  // 12-Week Aggregation Data (1 Bar = 1 Calendar Week Bucket, ending at weeklyOffset)
  const weeklyAggBuckets = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, idx) => {
      const weeksBackFromSelected = 11 - idx;
      const totalWeeksAgo = weeklyOffset + weeksBackFromSelected;
      const bucketDates = weekDates(addDays(currentWeekStartStr, -7 * totalWeeksAgo));
      const startStr = bucketDates[0];
      const endStr = bucketDates[6];
      const dateSet = new Set(bucketDates);
      const weekLogs = logs.filter((l) => dateSet.has(l.date));
      const totalMinutes = weekLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      const byCategory = analyticsCategories.map((cat) => {
        const catMin = weekLogs
          .filter((l) => String(l.categoryId) === String(cat.id))
          .reduce((acc, l) => acc + l.durationMinutes, 0);
        return { category: cat, minutes: catMin };
      });
      return {
        id: `${startStr}_${endStr}`,
        startStr,
        endStr,
        shortLabel: startStr.slice(5).replace('-', '/'),
        totalMinutes,
        byCategory,
      };
    });

    const total12WMinutes = buckets.reduce((acc, b) => acc + b.totalMinutes, 0);
    const maxWeekMinutes = Math.max(600, ...buckets.map((b) => b.totalMinutes));
    const windowLabel =
      buckets.length > 0 ? `${buckets[0].startStr} — ${buckets[buckets.length - 1].endStr}` : '';

    return {
      buckets,
      total12WMinutes,
      maxWeekMinutes,
      windowLabel,
    };
  }, [weeklyOffset, logs, analyticsCategories, currentWeekStartStr]);

  // 12-Month Aggregation Data (1 Bar = 1 Full Calendar Month Bucket, ending at monthlyOffset)
  const monthlyAggBuckets = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, idx) => {
      const monthsBackFromSelected = 11 - idx;
      const totalMonthsAgo = monthlyOffset + monthsBackFromSelected;
      const d = nowInZone(timeZone);
      d.setDate(1);
      d.setMonth(d.getMonth() - totalMonthsAgo);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthPrefix = `${y}-${m}`;
      const shortMonth = d.toLocaleDateString(locale, { month: 'short' }).toUpperCase();
      const fullLabel = d.toLocaleDateString(locale, { month: 'short', year: 'numeric' }).toUpperCase();

      const monthLogs = logs.filter((l) => l.date.startsWith(monthPrefix));
      const totalMinutes = monthLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      const byCategory = analyticsCategories.map((cat) => {
        const catMin = monthLogs
          .filter((l) => String(l.categoryId) === String(cat.id))
          .reduce((acc, l) => acc + l.durationMinutes, 0);
        return { category: cat, minutes: catMin };
      });

      return {
        id: monthPrefix,
        monthPrefix,
        shortLabel: shortMonth,
        fullLabel,
        yearSuffix: String(y).slice(2),
        totalMinutes,
        byCategory,
      };
    });

    const total12MMinutes = buckets.reduce((acc, b) => acc + b.totalMinutes, 0);
    const maxMonthMinutes = Math.max(1800, ...buckets.map((b) => b.totalMinutes));
    const windowLabel =
      buckets.length > 0
        ? `${buckets[0].monthPrefix} — ${buckets[buckets.length - 1].monthPrefix}`
        : '';

    return {
      buckets,
      total12MMinutes,
      maxMonthMinutes,
      windowLabel,
    };
  }, [monthlyOffset, logs, analyticsCategories, locale, timeZone]);

  // Category Trend Matrix columns (one per bar in each stacked chart view)
  const weeklyTrendColumns = useMemo(
    () =>
      weeklyChartData.map((day) => ({
        id: day.date,
        label: day.label.replace('-', '/'),
        title: day.date,
        totalMinutes: day.totalMinutes,
        byCategory: day.byCategory,
      })),
    [weeklyChartData]
  );

  const weeklyAggTrendColumns = useMemo(
    () =>
      weeklyAggBuckets.buckets.map((wk) => ({
        id: wk.id,
        label: wk.shortLabel,
        title: `${wk.startStr} — ${wk.endStr}`,
        totalMinutes: wk.totalMinutes,
        byCategory: wk.byCategory,
      })),
    [weeklyAggBuckets]
  );

  const monthlyAggTrendColumns = useMemo(
    () =>
      monthlyAggBuckets.buckets.map((mo) => ({
        id: mo.id,
        label: mo.shortLabel,
        title: mo.fullLabel,
        totalMinutes: mo.totalMinutes,
        byCategory: mo.byCategory,
      })),
    [monthlyAggBuckets]
  );

  // Bar <-> table column cross-highlight. Scoped to the view it was set in so
  // switching horizons never carries a stale index over.
  const [trendHighlight, setTrendHighlightState] = useState<{ view: PeriodView; idx: number } | null>(null);
  const trendHighlightIdx = trendHighlight?.view === periodView ? trendHighlight.idx : null;
  const setTrendHighlight = useCallback(
    (idx: number | null) => setTrendHighlightState(idx === null ? null : { view: periodView, idx }),
    [periodView]
  );
  const trendBarProps = (idx: number) => ({
    onMouseEnter: () => setTrendHighlight(idx),
    onMouseLeave: () => setTrendHighlight(null),
    onClick: () => setTrendHighlight(trendHighlightIdx === idx ? null : idx),
  });
  const trendBarRing = (idx: number) =>
    trendHighlightIdx === idx ? 'bg-emerald-500/10' : '';

  // ==========================================
  // Telemetry Cadence Matrix (7 Days x Dynamic W Weeks, Epoch Expansion)
  // ==========================================
  const cadenceMatrixData = useMemo(() => {
    const dayMap = new Map<string, { minutes: number; count: number; topics: string[] }>();
    logs.forEach((l) => {
      const existing = dayMap.get(l.date) || { minutes: 0, count: 0, topics: [] };
      existing.minutes += l.durationMinutes;
      existing.count += 1;
      if (l.topic && existing.topics.length < 2) {
        existing.topics.push(l.topic);
      }
      dayMap.set(l.date, existing);
    });

    const currentWeekStartDate = parseDateStr(currentWeekStartStr);

    let originWeekStart = new Date(currentWeekStartDate);
    if (logs.length > 0) {
      const oldestStr = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
      const oldestDate = new Date(oldestStr + 'T00:00:00');
      if (!isNaN(oldestDate.getTime())) {
        originWeekStart = startOfWeek(oldestDate, weekStart);
      }
    }

    const weeksElapsed = Math.max(
      0,
      Math.round((currentWeekStartDate.getTime() - originWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    );
    const totalActiveWeeks = weeksElapsed + 1;

    // 1 screen capacity = baseFitWeeks; when filled, auto-unlocks next block (or displays 2x capacity when toggled)
    const unitWeeks = Math.max(12, baseFitWeeks);
    const totalEpochs = Math.max(1, Math.ceil(totalActiveWeeks / unitWeeks));
    const displayWeeksCount = unitWeeks * matrixSpanMultiplier;

    const clampedOffset = Math.min(matrixPageOffset, Math.max(0, totalEpochs - 1));
    const targetEpochIndex = Math.max(0, totalEpochs - 1 - clampedOffset);

    const startWeekIndex =
      matrixSpanMultiplier === 2
        ? Math.max(0, (targetEpochIndex - 1) * unitWeeks)
        : targetEpochIndex * unitWeeks;

    const blockStartDate = new Date(originWeekStart);
    blockStartDate.setDate(blockStartDate.getDate() + startWeekIndex * 7);

    const weeks: Array<{
      weekIndex: number;
      weekStartDate: string;
      monthLabel: string | null;
      days: Array<{
        date: string;
        dayOfWeek: number;
        minutes: number;
        count: number;
        topics: string[];
        isFuture: boolean;
        isToday: boolean;
      }>;
    }> = [];

    let lastMonth = -1;
    let activeDaysInBlock = 0;
    let totalMinutesInBlock = 0;

    for (let w = 0; w < displayWeeksCount; w++) {
      const weekFirstDay = new Date(blockStartDate);
      weekFirstDay.setDate(weekFirstDay.getDate() + w * 7);
      const m = weekFirstDay.getMonth();
      let monthLabel: string | null = null;
      if (m !== lastMonth) {
        if (w === 0 || weekFirstDay.getDate() <= 7) {
          monthLabel = weekFirstDay.toLocaleDateString(locale, { month: 'short' }).toUpperCase();
          lastMonth = m;
        }
      }

      const days = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekFirstDay);
        cellDate.setDate(cellDate.getDate() + d);
        const dateStr = formatLocalDateString(cellDate);
        const info = dayMap.get(dateStr);
        const minutes = info?.minutes || 0;
        const count = info?.count || 0;
        const topics = info?.topics || [];
        const isFuture = dateStr > todayStr;
        const isToday = dateStr === todayStr;

        if (minutes > 0) {
          activeDaysInBlock += 1;
          totalMinutesInBlock += minutes;
        }

        days.push({
          date: dateStr,
          dayOfWeek: d,
          minutes,
          count,
          topics,
          isFuture,
          isToday,
        });
      }

      weeks.push({
        weekIndex: startWeekIndex + w,
        weekStartDate: toDateStr(weekFirstDay),
        monthLabel,
        days,
      });
    }

    const startLabel = weeks[0]?.days[0]?.date || todayStr;
    const endLabel = weeks[weeks.length - 1]?.days[6]?.date || todayStr;

    return {
      weeks,
      totalEpochs,
      targetEpochIndex: targetEpochIndex + 1,
      clampedOffset,
      unitWeeks,
      displayWeeksCount,
      totalActiveWeeks,
      activeDaysInBlock,
      totalMinutesInBlock,
      startLabel,
      endLabel,
    };
  }, [logs, baseFitWeeks, matrixSpanMultiplier, matrixPageOffset, locale, todayStr, currentWeekStartStr, weekStart]);

  // ==========================================
  // Study Insights & Streak Calculations
  // ==========================================

  const streakStats = useMemo(() => {
    if (logs.length === 0) {
      return { currentStreak: 0, longestStreak: 0, activeDaysInLast30: 0, activeDayRatio: 0 };
    }

    const uniqueDates = Array.from(new Set(logs.map((l) => l.date))).sort().reverse();
    const dateSet = new Set(uniqueDates);

    const todayStr = getRecentDateString(0, timeZone);
    const yesterdayStr = getRecentDateString(1, timeZone);

    let current = 0;
    const checkDate = nowInZone(timeZone);

    if (!dateSet.has(todayStr) && dateSet.has(yesterdayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    if (dateSet.has(todayStr) || dateSet.has(yesterdayStr)) {
      while (true) {
        const dStr = formatLocalDateString(checkDate);
        if (dateSet.has(dStr)) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest streak across full history
    let longest = 0;
    if (uniqueDates.length > 0) {
      const ascDates = [...uniqueDates].sort();
      let tempStreak = 1;
      longest = 1;
      for (let i = 1; i < ascDates.length; i++) {
        const prev = new Date(ascDates[i - 1] + 'T00:00:00');
        const curr = new Date(ascDates[i] + 'T00:00:00');
        const diffTime = curr.getTime() - prev.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longest) longest = tempStreak;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
    }

    const last30Days = Array.from({ length: 30 }, (_, i) => getRecentDateString(i, timeZone));
    const activeDaysInLast30 = last30Days.filter((d) => dateSet.has(d)).length;
    const activeDayRatio = Math.round((activeDaysInLast30 / 30) * 100);

    return {
      currentStreak: current,
      longestStreak: Math.max(longest, current),
      activeDaysInLast30,
      activeDayRatio,
    };
  }, [logs, timeZone]);

  const habitInsights = useMemo(() => {
    if (logs.length === 0) {
      return { topCategory: null, topCatPct: 0, avgSessionMin: 0, peakDayName: 'N/A' };
    }

    const totalMin = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const avgSessionMin = Math.round(totalMin / logs.length);

    const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = t.weekdaysLong.split(',');
    logs.forEach((l) => {
      const d = new Date(l.date + 'T00:00:00');
      const dayIdx = d.getDay();
      dayMinutes[dayIdx] += l.durationMinutes;
    });
    let maxDayIdx = 0;
    for (let i = 1; i < 7; i++) {
      if (dayMinutes[i] > dayMinutes[maxDayIdx]) maxDayIdx = i;
    }
    const peakDayName = dayNames[maxDayIdx];

    const catTotals: Record<string, number> = {};
    logs.forEach((l) => {
      if (l.categoryId) {
        catTotals[String(l.categoryId)] = (catTotals[String(l.categoryId)] || 0) + l.durationMinutes;
      }
    });
    let topCatId: string | number | null = null;
    let topCatMin = 0;
    Object.entries(catTotals).forEach(([cid, min]) => {
      if (min > topCatMin) {
        topCatMin = min;
        topCatId = cid;
      }
    });
    const topCategory = categories.find((c) => String(c.id) === String(topCatId));
    const topCatPct = totalMin > 0 ? Math.round((topCatMin / totalMin) * 100) : 0;

    return {
      topCategory,
      topCatPct,
      avgSessionMin,
      peakDayName,
    };
  }, [logs, categories, t]);

  // Chronometer Theme unlocks: Clearance level (like Surface Themes / Noise),
  // plus achievement-style rules on streaks, log count and Ascensions.
  const chronoProgress = useMemo<ChronoProgress>(
    () => ({
      rewardUnlockLevel: clearanceStatus.rewardUnlockLevel,
      totalAscensions: clearanceStatus.totalAscensions,
      longestStreak: user ? streakStats.longestStreak : 0,
      sessionCount: user ? logs.length : 0,
      totalHours: user ? clearanceStatus.totalHours : 0,
      longestSessionMinutes: user ? logs.reduce((mx, l) => Math.max(mx, l.durationMinutes), 0) : 0,
    }),
    [clearanceStatus.rewardUnlockLevel, clearanceStatus.totalAscensions, clearanceStatus.totalHours, user, streakStats.longestStreak, logs]
  );

  // A face that is (no longer) unlocked falls back to the default without
  // forgetting the saved pick, mirroring activeSurfacePair.
  const activeChronoTheme = useMemo(() => {
    const candidate = getChronoThemeById(chronoThemeId);
    if (!authLoading && !dataLoading && !isChronoThemeUnlocked(candidate, chronoProgress)) {
      return getChronoThemeById(DEFAULT_CHRONO_THEME_ID);
    }
    return candidate;
  }, [chronoThemeId, authLoading, dataLoading, chronoProgress]);

  // Weather themes share the Chronometer unlock rules; a locked pick shows
  // the default face without overwriting the saved (account-synced) choice.
  const activeWeatherTheme = useMemo<WeatherThemeId>(() => {
    const candidate = WEATHER_THEMES.find((wt) => wt.id === weather.theme);
    if (!candidate) return DEFAULT_WEATHER_THEME;
    if (!authLoading && !dataLoading && !isWeatherThemeUnlocked(candidate, chronoProgress)) return DEFAULT_WEATHER_THEME;
    return candidate.id;
  }, [weather.theme, authLoading, dataLoading, chronoProgress]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // UI font + Ambient overlay follow the same rule: a locked pick shows the
  // default without forgetting the saved choice.
  const activeUiFont = useMemo(() => {
    const candidate = getUiFontById(uiFontId);
    if (!authLoading && !dataLoading && !isUiFontUnlocked(candidate, chronoProgress)) return getUiFontById(DEFAULT_UI_FONT_ID);
    return candidate;
  }, [uiFontId, authLoading, dataLoading, chronoProgress]);
  useEffect(() => {
    applyUiFont(activeUiFont);
  }, [activeUiFont]);

  const activeAmbientTheme = useMemo(() => {
    const candidate = getAmbientThemeById(ambientThemeId);
    if (!authLoading && !dataLoading && !isAmbientThemeUnlocked(candidate, chronoProgress)) {
      return getAmbientThemeById(DEFAULT_AMBIENT_THEME_ID);
    }
    return candidate;
  }, [ambientThemeId, authLoading, dataLoading, chronoProgress]);
  const ambientDimAlpha = AMBIENT_DIM_LEVELS.find((d) => d.id === ambientDim)?.alpha ?? 0;
  const ambientClockReadout = ambientClock
    ? {
        main: formatTimer(elapsedSeconds),
        sub: categories.find((c) => c.id === selectedCatId)?.code,
      }
    : null;

  const handleSelectUiFont = useCallback(
    (id: string) => {
      setUiFontId(id);
      queueUiPrefsSave({ ui_font: id });
    },
    [queueUiPrefsSave]
  );
  const handleSelectAmbientTheme = useCallback(
    (id: string) => {
      setAmbientThemeId(id);
      queueUiPrefsSave({ ambient_theme: id });
    },
    [queueUiPrefsSave]
  );
  const exitAmbientPreview = useCallback(() => setAmbientPreviewId(null), []);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert(t.errNoLogsExport);
      return;
    }
    const headers = [
      'ID',
      'Date',
      'Category Code',
      'Category Name',
      'Duration (Min)',
      'Topic',
      'Public To Hub',
      'Created At (UTC)',
      `Created At (${timeZone})`,
    ];
    const rows = logs.map((l) => [
      l.id,
      l.date,
      `"${l.categoryCode || ''}"`,
      `"${l.categoryName || ''}"`,
      l.durationMinutes,
      `"${(l.topic || '').replace(/"/g, '""')}"`,
      l.isPublicToHub ? 'TRUE' : 'FALSE',
      l.createdAt,
      `"${formatDateTime(l.createdAt)}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `typbox_telemetry_${formatLocalDateString(nowInZone(timeZone))}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (logs.length === 0) {
      alert(t.errNoLogsExport);
      return;
    }
    const exportData = {
      user: user?.username || 'anonymous',
      exportedAt: new Date().toISOString(),
      timezone: timeZone,
      categories,
      logs,
    };
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `typbox_telemetry_${formatLocalDateString(nowInZone(timeZone))}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Timeline Navigation Derived State & Handlers
  const isWeekly = periodView === 'weekly' || periodView === 'weekly_agg';
  const currentOffset = isWeekly ? weeklyOffset : monthlyOffset;
  const maxRange = isWeekly ? maxWeeksAgo : maxMonthsAgo;
  const currentSliderVal = maxRange - currentOffset;
  const isAtOldest = currentOffset >= maxRange;
  const isAtPresent = currentOffset === 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value);
    const newOffset = maxRange - rawVal;
    if (isWeekly) {
      setWeeklyOffset(newOffset);
    } else {
      setMonthlyOffset(newOffset);
    }
  };

  const handlePrevStep = () => {
    if (isWeekly) {
      setWeeklyOffset((prev) => Math.min(prev + 1, maxWeeksAgo));
    } else {
      setMonthlyOffset((prev) => Math.min(prev + 1, maxMonthsAgo));
    }
  };

  const handleNextStep = () => {
    if (isWeekly) {
      setWeeklyOffset((prev) => Math.max(prev - 1, 0));
    } else {
      setMonthlyOffset((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleResetToPresent = () => {
    if (isWeekly) {
      setWeeklyOffset(0);
    } else {
      setMonthlyOffset(0);
    }
  };

  const handleSetAnalyticsModeFromPalette = useCallback((mode: AnalyticsHorizonMode) => {
    if (mode === 'daily7d') setPeriodView('weekly');
    else if (mode === 'weekly12w') setPeriodView('weekly_agg');
    else if (mode === 'monthly12m') setPeriodView('monthly_agg');
    else if (mode === 'monthlyCal') setPeriodView('monthly');
  }, []);

  // Theme Classes (Driven by Dual-Polarity Surface Theme Pairs via CSS variables)
  const isDark = theme === 'dark';
  const bgMain = 'bg-[var(--tb-bg-main)] text-[var(--tb-text-main)]';
  const bgCard = 'bg-[var(--tb-bg-card)] text-[var(--tb-text-main)]';
  const borderCol = 'border-[var(--tb-border)]';
  const textMuted = 'text-[var(--tb-text-muted)]';
  const inputBg =
    'bg-[var(--tb-bg-input)] border-[var(--tb-border)] text-[var(--tb-text-main)] focus:border-emerald-500';
  // PRESTIGE art is pinned to the viewport so the composition frames the
  // dashboard instead of being stretched down the full page height.
  const surfaceBgStyle = useMemo(
    () => ({
      ...getSurfaceBackgroundStyle(activeSurfacePair, isDark),
      ...(activeSurfacePair.art ? { backgroundAttachment: 'fixed' } : {}),
    }),
    [activeSurfacePair, isDark]
  );

  return (
    <I18nContext.Provider value={i18n}>
    <div
      className={`isolate min-h-screen font-sans antialiased transition-colors duration-200 ${bgMain}`}
      style={surfaceBgStyle}
    >
      {/* PRESTIGE Surface Theme motion layer (behind everything; see SurfaceFx.tsx) */}
      {surfaceFxEnabled && activeSurfacePair.fx && (
        <SurfaceFxLayer
          key={`${activeSurfacePair.id}-${isDark ? 'd' : 'l'}`}
          fx={activeSurfacePair.fx}
          accentHex={activeSurfacePair.accentHex}
          isDark={isDark}
        />
      )}

      {/* Ambient Mode: the chosen overlay while the stopwatch runs
          unattended (screen kept awake by useKeepAwake above), or a
          preview launched from Settings > Ambient. */}
      {isAmbientMode && ambientPreviewId === null && (
        <AmbientOverlay themeId={activeAmbientTheme.id} dimAlpha={ambientDimAlpha} clock={ambientClockReadout} />
      )}
      {ambientPreviewId !== null && (
        <AmbientOverlay
          themeId={ambientPreviewId}
          dimAlpha={ambientDimAlpha}
          preview
          onExit={exitAmbientPreview}
        />
      )}

      {/* ==========================================
          FULL-SCREEN SITE ACCESS SPLASH LOADER
      ========================================== */}
      {isSiteLoading && (
        <div
          className={`fixed inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center space-y-8 select-none transition-opacity duration-500 ${
            fadeLoader ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="loader" />
          <div className="flex flex-col items-center space-y-2 text-center font-mono">
            <span className="text-xs uppercase tracking-[0.25em] text-zinc-300 font-semibold">
              TYPBOX // TELEMETRY ARCHIVE
            </span>
            <span className="text-[10px] tracking-widest text-emerald-400 animate-pulse">
              {t.splashBooting}
            </span>
          </div>
        </div>
      )}

      {/* ==========================================
          TOP NAVIGATION BAR (Compact on Mobile/iPad)
      ========================================== */}
      <header
        className={`sticky top-0 z-30 border-b ${borderCol} backdrop-blur-md`}
        style={{
          backgroundColor: isDark
            ? `${activeSurfacePair.dark.bgMain}e6`
            : `${activeSurfacePair.light.bgMain}e6`,
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <div className="flex items-center space-x-2 min-w-0">
            <TypboxLogo className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" isDark={isDark} isRunning={isRunning} />
            <span className="font-mono text-base sm:text-lg font-bold tracking-tighter">TYPBOX</span>
            <span className={`font-mono text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
              .me
            </span>
          </div>

          {/* Right Controls (Streamlined on Mobile/iPad to prevent top bar crowding) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Command Palette Button (Shown from md+ in header; always in User Menu on mobile) */}
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className={`hidden md:flex h-9 lg:h-auto px-2.5 py-1.5 lg:py-2 border ${borderCol} hover:border-emerald-500/60 transition-colors items-center space-x-1.5 font-mono text-[11px] cursor-pointer`}
              aria-label={t.openCmdPalette}
              title={t.openCmdPalette}
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline font-semibold">CMD</span>
              <span className={`text-[10px] px-1 py-0.2 border ${borderCol} ${textMuted}`}>
                ⌘K
              </span>
            </button>

            {/* Status Card Snapshot / Share Button (Shown from sm+ in header; also in Clearance bar & User Menu) */}
            <button
              type="button"
              onClick={() => setShowStatusCardModal(true)}
              className={`hidden sm:flex h-9 lg:h-auto px-2.5 py-1.5 lg:py-2 border ${borderCol} hover:border-emerald-500/60 transition-colors items-center space-x-1.5 font-mono text-[11px] cursor-pointer`}
              aria-label={t.genStatusCard}
              title={t.genStatusCard}
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline font-semibold">{t.cardShort}</span>
            </button>

            {/* Ambient Focus Sound / White Noise Generator */}
            <AmbientSoundControl
              isDark={isDark}
              borderCol={borderCol}
              bgCard={bgCard}
              textMuted={textMuted}
              userClearanceLevel={clearanceStatus.rewardUnlockLevel}
              userTotalHours={clearanceStatus.totalHours}
            />

            {/* Theme Polarity Toggle (Dark ⇄ Light of active Surface Theme Pair) */}
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className={`h-9 w-9 lg:h-auto lg:w-auto lg:p-2 border ${borderCol} hover:opacity-80 flex items-center justify-center cursor-pointer`}
              aria-label={t.togglePolarity}
              title={
                isDark
                  ? tf(t.switchToLight, { label: activeSurfacePair.light.label })
                  : tf(t.switchToDark, { label: activeSurfacePair.dark.label })
              }
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth Action Button */}
            {authLoading ? (
              <div className={`h-9 w-9 flex items-center justify-center border ${borderCol}`}>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              </div>
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                {/* User Avatar Button */}
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`h-9 lg:h-auto flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 border ${borderCol} ${bgCard} hover:border-zinc-400 transition-colors cursor-pointer select-none`}
                  aria-label={t.userMenu}
                >
                  <AvatarBadge
                    username={user.username}
                    color={user.avatar_color}
                    preset={user.avatar_preset}
                    image={user.avatar_image}
                    size="sm"
                  />
                  <span className="hidden sm:inline font-mono text-xs font-semibold max-w-[110px] truncate">
                    {user.username}
                  </span>
                  <span
                    className="hidden lg:inline-block px-1.5 py-0.2 font-mono text-[10px] font-bold text-zinc-950"
                    style={{ backgroundColor: clearanceStatus.current.color }}
                  >
                    LV.{String(clearanceStatus.current.level).padStart(4, '0')}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu (Centered cleanly on mobile, right-aligned on sm+) */}
                {showUserMenu && (
                  <div
                    className={`fixed left-3 right-3 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 border ${borderCol} ${bgCard} shadow-2xl z-50 py-1 font-mono text-xs divide-y ${
                      isDark ? 'divide-zinc-800/80' : 'divide-zinc-200'
                    }`}
                  >
                    {/* User Info Header */}
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center space-x-3">
                        <AvatarBadge
                          username={user.username}
                          color={user.avatar_color}
                          preset={user.avatar_preset}
                          image={user.avatar_image}
                          size="md"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{t.activeAccount}</span>
                          </div>
                          <div className="font-bold text-sm truncate">{user.username}</div>
                          <div className={`text-[11px] truncate ${textMuted}`}>
                            {user.email || t.noEmail}
                          </div>
                        </div>
                      </div>
                      {/* Clearance Badge inside Dropdown */}
                      <div className={`pt-2 border-t ${borderCol} flex items-center justify-between text-[10px]`}>
                        <span
                          className="px-1.5 py-0.5 font-bold text-zinc-950 shrink-0"
                          style={{ backgroundColor: clearanceStatus.current.color }}
                        >
                          LV.{String(clearanceStatus.current.level).padStart(4, '0')}
                        </span>
                        <PrestigeChip totalAscensions={clearanceStatus.totalAscensions} className="ml-1.5" />
                        <span className="font-bold truncate ml-2 flex-1">
                          {clearanceStatus.current.title}
                        </span>
                        <span className={textMuted}>{clearanceStatus.progressPct}%</span>
                      </div>
                      {clearanceStatus.ascensionAvailable && (
                        <button
                          type="button"
                          onClick={claimAscension}
                          className="mt-1.5 w-full py-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer animate-pulse"
                        >
                          {tf(t.ascendToCycle, { n: String(clearanceStatus.cycleNumber + 1).padStart(2, '0') })}
                        </button>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => openSettingsModal('themes')}
                        className="w-full px-4 py-2.5 lg:py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{tf(t.menuSurfaceThemes, { n: SURFACE_THEME_PAIRS.length })}</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>{activeSurfacePair.code}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openSettingsModal('clearance')}
                        className="w-full px-4 py-2.5 lg:py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>{tf(t.menuClearanceRanks, { n: clearanceStatus.totalRanks.toLocaleString() })}</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>
                          LV.{String(clearanceStatus.current.level).padStart(4, '0')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowStatusCardModal(true);
                        }}
                        className="w-full px-4 py-2.5 lg:py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t.menuShareCard}</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowCommandPalette(true);
                        }}
                        className="w-full px-4 py-2.5 lg:py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t.menuCmdPalette}</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>⌘K</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openSettingsModal('profile')}
                        className="w-full px-4 py-2.5 lg:py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Settings className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t.menuAccountSettings}</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>CFG</span>
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleSignOut();
                        }}
                        className="w-full px-4 py-2.5 text-left flex items-center space-x-2.5 hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{t.signOut}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className={`h-9 lg:h-auto flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 hover:bg-zinc-300'
                    : 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.signIn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT CONTAINER
      ========================================== */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8">
        {/* GUEST BANNER (Rendered only when not authenticated) */}
        {!user && !authLoading && (
          <section className={`border ${borderCol} ${bgCard} p-5 sm:p-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-3xl space-y-3.5 sm:space-y-4">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 text-[11px] font-mono border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.guestBadge}</span>
              </div>
              <h1 className="font-mono text-xl sm:text-3xl font-bold tracking-tight">
                {t.guestTitle}
              </h1>
              <p className={`text-xs sm:text-sm leading-relaxed ${textMuted}`}>
                {t.guestBody}
              </p>
              <div className="pt-1 sm:pt-2 flex flex-wrap gap-2.5 sm:gap-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className={`px-4 sm:px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 cursor-pointer ${
                    isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t.guestSignIn}</span>
                </button>
                {REGISTRATION_OPEN && (
                  <button
                    onClick={() => openAuthModal('register')}
                    className={`px-4 sm:px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider border ${borderCol} hover:border-emerald-500/60 transition-colors cursor-pointer`}
                  >
                    <span>{t.createAccount}</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* API Error Notification */}
        {apiError && (
          <div className="p-4 border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{apiError} {t.apiErrorHint}</span>
            </div>
            <button
              onClick={loadUserData}
              className="px-3 py-1.5 border border-rose-500/40 hover:bg-rose-500/20 text-xs"
            >
              {t.retry}
            </button>
          </div>
        )}

        {/* 1. TOP METRICS STRIP + TELEMETRY CLEARANCE BAR */}
        <section className="space-y-0">
          <div className={`grid grid-cols-2 lg:grid-cols-4 border-t border-l ${borderCol}`}>
            <div className={`p-3.5 sm:p-5 border-r border-b ${borderCol} ${bgCard}`}>
              <div className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-wider truncate ${textMuted}`}>
                01 / {t.totalHours}
              </div>
              <div className="mt-1 sm:mt-2 flex items-baseline space-x-1.5 sm:space-x-2">
                <span className="font-mono text-2xl sm:text-4xl font-light tracking-tight">
                  {user ? stats.totalHours : '0.0'}
                </span>
                <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>{t.unitHrs}</span>
              </div>
            </div>

            <div className={`p-3.5 sm:p-5 border-r border-b ${borderCol} ${bgCard}`}>
              <div className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-wider truncate ${textMuted}`}>
                02 / {t.weeklyHours}
              </div>
              <div className="mt-1 sm:mt-2 flex items-baseline space-x-1.5 sm:space-x-2">
                <span className="font-mono text-2xl sm:text-4xl font-light tracking-tight">
                  {user ? stats.weeklyHours : '0.0'}
                </span>
                <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>{t.unitHrs7d}</span>
              </div>
            </div>

            <div className={`p-3.5 sm:p-5 border-r border-b ${borderCol} ${bgCard}`}>
              <div className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-wider truncate ${textMuted}`}>
                03 / {t.monthlyHours}
              </div>
              <div className="mt-1 sm:mt-2 flex items-baseline space-x-1.5 sm:space-x-2">
                <span className="font-mono text-2xl sm:text-4xl font-light tracking-tight">
                  {user ? stats.monthlyHours : '0.0'}
                </span>
                <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>{t.unitHrs} ({currentMonthPrefix})</span>
              </div>
            </div>

            <div className={`p-3.5 sm:p-5 border-r border-b ${borderCol} ${bgCard} flex flex-col justify-between`}>
              <div className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-wider truncate ${textMuted}`}>
                04 / {t.activeCategories}
              </div>
              <div className="mt-1 sm:mt-2 flex items-baseline justify-between gap-2 min-w-0">
                <div className="flex items-baseline space-x-1.5 sm:space-x-2 shrink-0">
                  <span className="font-mono text-2xl sm:text-4xl font-light tracking-tight">
                    {user ? activeCategoryCount : '0'}
                  </span>
                  <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>
                    {user && activeCategoryCount !== openCategories.length
                      ? tf(t.unitActiveOf, { n: openCategories.length })
                      : t.unitUnits}
                  </span>
                </div>
                {user && openCategories.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-1 max-w-[84px] sm:max-w-[148px]">
                    {openCategories.slice(0, 12).map((c) => (
                      <span
                        key={c.id}
                        className="w-2 h-2 rounded-full shrink-0"
                        style={swatchStyle(c.color, c.isActive)}
                        title={`[${c.code}] ${c.name}${c.isActive ? '' : ` (${t.inactive})`}`}
                      />
                    ))}
                    {openCategories.length > 12 && (
                      <span
                        className={`font-mono text-[9px] leading-none px-1 py-0.5 border ${borderCol} ${textMuted} shrink-0`}
                        title={openCategories
                          .slice(12)
                          .map((c) => `[${c.code}] ${c.name}`)
                          .join(', ')}
                      >
                        +{openCategories.length - 12}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TELEMETRY CLEARANCE LEVEL BAR (3,000 RANKS // 0H-1,000H PER CYCLE) */}
          <div className={`border-x border-b ${borderCol} ${bgCard} px-3.5 sm:px-5 py-2.5 sm:py-3.5 font-mono text-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3`}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center space-x-2 shrink-0">
                <span className={`text-[10px] uppercase tracking-widest ${textMuted}`}>
                  {t.clearanceLabel}
                </span>
                <span
                  className="px-2 py-0.5 text-xs font-bold text-zinc-950"
                  style={{ backgroundColor: clearanceStatus.current.color }}
                >
                  LV.{String(clearanceStatus.current.level).padStart(4, '0')}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 border ${borderCol} ${textMuted}`}>
                  {tf(t.cycleN, { n: String(clearanceStatus.cycleNumber).padStart(2, '0') })}
                </span>
                <PrestigeChip totalAscensions={clearanceStatus.totalAscensions} />
              </div>

              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-bold tracking-wider truncate">
                  {clearanceStatus.current.title}
                </span>
              </div>
            </div>

            {/* Progress Bar & Sub-Phases */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-end gap-2.5 sm:gap-4 flex-1 max-w-2xl">
              <div className="flex-1 min-w-[180px] space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((pip) => (
                      <span
                        key={pip}
                        className={`w-2 h-2 border ${
                          pip <= clearanceStatus.subPhase
                            ? 'bg-emerald-400 border-emerald-400'
                            : `${borderCol} opacity-40`
                        }`}
                        title={tf(t.subPhaseN, { n: pip })}
                      />
                    ))}
                    <span className="ml-1 text-emerald-400 font-bold">
                      {tf(t.phaseN, { n: clearanceStatus.subPhase })}
                    </span>
                  </div>
                  {clearanceStatus.ascensionAvailable ? (
                    <button
                      type="button"
                      onClick={claimAscension}
                      className="text-amber-400 font-bold uppercase tracking-wider animate-pulse cursor-pointer hover:text-amber-300"
                    >
                      {t.ascensionClaim}
                    </button>
                  ) : (
                    <span className={textMuted}>
                      {clearanceStatus.next
                        ? tf(t.nextLevel, {
                            lv: String(clearanceStatus.next.level).padStart(4, '0'),
                            h: clearanceStatus.hoursRemainingToNext,
                            pct: clearanceStatus.progressPct,
                          })
                        : t.cycleComplete}
                    </span>
                  )}
                </div>
                <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${clearanceStatus.progressPct}%`,
                      backgroundColor: clearanceStatus.current.color,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      openSettingsModal('clearance');
                    } else {
                      openAuthModal('login');
                    }
                  }}
                  className={`min-h-[36px] lg:min-h-0 px-3 py-1.5 lg:px-2.5 lg:py-1.5 border ${borderCol} hover:border-emerald-500/60 text-xs lg:text-[10px] font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors`}
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>{tf(t.nRanks, { n: clearanceStatus.totalRanks.toLocaleString() })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusCardModal(true)}
                  className={`min-h-[36px] lg:min-h-0 px-3 py-1.5 lg:px-2.5 lg:py-1.5 border ${borderCol} hover:border-emerald-500/60 text-xs lg:text-[10px] font-semibold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors`}
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.shareCard}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. MAIN WORKSPACE: two columns that end on the same line (the last panel of
            the shorter one stretches; the lunar calendar's day cells absorb it). On
            phones both wrappers are `contents`, so the panels form one column in their
            order-N sequence, log stream last. */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Chronometer, Recording, Categories, Insights, Lunar Calendar */}
          <div className="contents lg:flex lg:flex-col lg:gap-8 lg:col-span-5 lg:[&>*:last-child]:grow">
            {/* SYSTEM CHRONOMETER (DIGITAL CLOCK PANEL) */}
            <div className={`border ${borderCol} ${bgCard} p-5 relative overflow-hidden order-1 lg:order-none`}>
              {/* Wraps instead of overflowing on narrow phones: weather badges
                  can be wide (e.g. the CYBER HUD theme), so the right-hand
                  controls drop to a second line when they don't fit. From sm
                  up it stays one line and the SYNC label truncates instead. */}
              <div
                className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-2 pb-3 mb-3.5 border-b ${
                  isDark ? 'border-zinc-800/60' : 'border-zinc-200'
                } font-mono text-[10px] tracking-widest uppercase`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="font-semibold whitespace-nowrap">{t.chronometer}</span>
                  <WeatherBadge
                    wx={weather}
                    theme={activeWeatherTheme}
                    open={showWeatherPanel}
                    onToggle={() => {
                      setShowWeatherPanel((prev) => !prev);
                      setShowChronoPicker(false);
                    }}
                    textMuted={textMuted}
                  />
                </div>
                <div className="flex items-center gap-2 min-w-0 ml-auto">
                  {/* The date block below already shows the zone, so phones skip this. */}
                  <span className={`${textMuted} truncate hidden sm:inline`}>SYNC // {clockReadout.tzLabel}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChronoPicker((prev) => !prev);
                      setShowWeatherPanel(false);
                    }}
                    aria-expanded={showChronoPicker}
                    aria-label={t.chronoThemesOpen}
                    title={`${t.chronoThemesOpen} — ${activeChronoTheme.name}`}
                    className={`shrink-0 min-h-[28px] lg:min-h-0 px-1.5 py-0.5 border flex items-center space-x-1 cursor-pointer transition-colors ${
                      showChronoPicker
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                        : `${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50`
                    }`}
                  >
                    <Palette className="w-3 h-3" />
                    <span className="tabular-nums">{activeChronoTheme.code}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <ChronoDisplay
                  theme={activeChronoTheme}
                  hh={clockReadout.hour}
                  mm={clockReadout.minute}
                  ss={clockReadout.second}
                  isDark={isDark}
                />

                <div className="text-right font-mono shrink-0">
                  <div className="text-xs sm:text-sm font-semibold tracking-wider tabular-nums">
                    {clockReadout.dateDot}
                  </div>
                  <div className={`text-[10px] uppercase tracking-widest ${textMuted}`}>
                    {clockReadout.dayStr} // {clockReadout.tzLabel}
                  </div>
                </div>
              </div>

              {showWeatherPanel && (
                <WeatherPanel
                  wx={weather}
                  theme={activeWeatherTheme}
                  progress={chronoProgress}
                  isDark={isDark}
                  borderCol={borderCol}
                  textMuted={textMuted}
                />
              )}

              {showChronoPicker && (
                <ChronometerThemePicker
                  activeThemeId={activeChronoTheme.id}
                  onSelect={handleSelectChronoTheme}
                  progress={chronoProgress}
                  hh={clockReadout.hour}
                  mm={clockReadout.minute}
                  isDark={isDark}
                  borderCol={borderCol}
                  textMuted={textMuted}
                />
              )}
            </div>

            {/* SESSION LOGGER PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-6 relative order-2 lg:order-none`}>
              {/* Overlay if not authenticated */}
              {!user && (
                <div
                  className={`absolute inset-0 z-20 backdrop-blur-[2px] ${
                    isDark ? 'bg-black/60 text-zinc-100' : 'bg-white/80 text-zinc-900'
                  } flex flex-col items-center justify-center p-6 text-center space-y-3`}
                >
                  <div
                    className={`w-10 h-10 rounded-full border ${
                      isDark ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-300 bg-zinc-100'
                    } flex items-center justify-center`}
                  >
                    <Lock className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">
                      {t.authRequired}
                    </h3>
                    <p className={`text-xs mt-1 max-w-[260px] ${textMuted}`}>
                      {t.authRequiredBody}
                    </p>
                  </div>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="px-4 py-2.5 font-mono text-xs font-semibold bg-emerald-500 text-zinc-950 uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    {t.signInNow}
                  </button>
                </div>
              )}

              <div className={`flex items-center justify-between pb-4 mb-5 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.recordSession}
                  </h2>
                </div>
                <div className={`flex border ${borderCol} text-xs lg:text-[11px] font-mono`}>
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`min-h-[38px] lg:min-h-0 px-3.5 py-2 lg:px-2.5 lg:py-1 cursor-pointer transition-colors ${
                      inputMode === 'manual'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    {t.manualMode}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('timer')}
                    className={`min-h-[38px] lg:min-h-0 px-3.5 py-2 lg:px-2.5 lg:py-1 cursor-pointer transition-colors ${
                      inputMode === 'timer'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    {t.timerMode}
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddLog} className="space-y-4">
                {inputMode === 'timer' && (
                  <div className={`p-5 border ${borderCol} text-center space-y-4`}>
                    <div className="font-mono text-4xl font-light tracking-widest">
                      {formatTimer(elapsedSeconds)}
                    </div>
                    <div className="flex justify-center space-x-3">
                      {!isRunning ? (
                        <button
                          type="button"
                          onClick={() => setIsRunning(true)}
                          className="min-h-[42px] lg:min-h-0 flex items-center space-x-1.5 px-5 py-2.5 lg:px-4 lg:py-1.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{t.start}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsRunning(false)}
                          className="min-h-[42px] lg:min-h-0 flex items-center space-x-1.5 px-5 py-2.5 lg:px-4 lg:py-1.5 bg-amber-500 text-zinc-950 font-mono text-xs font-semibold cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>{t.pause}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsRunning(false);
                          setElapsedSeconds(0);
                          accumulatedSecondsRef.current = 0;
                          timerStartTimestampRef.current = null;
                        }}
                        className={`min-h-[42px] lg:min-h-0 px-4 py-2.5 lg:px-3 lg:py-1.5 border ${borderCol} font-mono text-xs ${textMuted} cursor-pointer`}
                      >
                        {t.reset}
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className={`block font-mono text-[11px] uppercase mb-1.5 ${textMuted}`}>
                    {t.category}
                  </label>
                  {openCategories.length === 0 ? (
                    <div className={`p-2.5 text-xs font-mono border ${borderCol} ${textMuted}`}>
                      {t.noCategoriesYet}
                    </div>
                  ) : (
                    <CategorySelect
                      categories={openCategories}
                      value={selectedCatId}
                      onChange={setSelectedCatId}
                      borderCol={borderCol}
                      inputBg={inputBg}
                      textMuted={textMuted}
                    />
                  )}
                </div>

                {/* Duration & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inputMode === 'manual' && (
                    <div>
                      <label className={`block font-mono text-[11px] uppercase mb-1.5 ${textMuted}`}>
                        {t.durationMin}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className={`w-full min-h-[42px] lg:min-h-0 px-3 py-2.5 lg:py-2 text-base sm:text-sm font-mono border outline-none ${inputBg}`}
                      />
                    </div>
                  )}
                  <div className={inputMode === 'timer' ? 'sm:col-span-2' : ''}>
                    <label className={`block font-mono text-[11px] uppercase mb-1.5 ${textMuted}`}>
                      {t.date}
                    </label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className={`w-full min-h-[42px] lg:min-h-0 px-3 py-2.5 lg:py-2 text-base sm:text-sm font-mono border outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Touch-Friendly Quick Duration Preset Chips (Manual Mode) */}
                {inputMode === 'manual' && (
                  <div className="grid grid-cols-6 gap-1.5 font-mono text-[11px]">
                    {[15, 30, 60, 90, 120].map((presetMin) => (
                      <button
                        key={presetMin}
                        type="button"
                        onClick={() => setDurationMinutes(presetMin)}
                        className={`min-h-[36px] lg:min-h-0 py-1.5 border transition-colors cursor-pointer ${
                          durationMinutes === presetMin
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                            : `${borderCol} ${textMuted} hover:border-zinc-500`
                        }`}
                      >
                        {presetMin}m
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDurationMinutes((prev) => Math.min(1440, (Number(prev) || 0) + 15))}
                      className={`min-h-[36px] lg:min-h-0 py-1.5 border ${borderCol} text-emerald-400 hover:bg-emerald-500/10 font-bold transition-colors cursor-pointer`}
                      title={t.add15m}
                    >
                      +15m
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={openCategories.length === 0 || commitState === 'submitting'}
                  aria-busy={commitState === 'submitting'}
                  className={`w-full min-h-[46px] lg:min-h-0 py-3.5 lg:py-2.5 px-4 font-mono text-xs uppercase tracking-widest font-semibold transition-colors duration-300 flex items-center justify-center space-x-2 ${
                    commitState === 'success'
                      ? 'bg-emerald-500 text-zinc-950 commit-success-flash cursor-default'
                      : commitState === 'submitting'
                      ? `${isDark ? 'bg-zinc-300 text-zinc-700' : 'bg-zinc-700 text-zinc-200'} cursor-wait`
                      : isDark
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300 cursor-pointer'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer'
                  }`}
                >
                  {commitState === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.committing}</span>
                    </>
                  ) : commitState === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 typbox-toast-pop" />
                      <span>{t.committed}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{t.saveLog}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* CATEGORY REGISTRY PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-6 relative order-6 lg:order-none`}>
              {!user && (
                <div
                  className={`absolute inset-0 z-20 backdrop-blur-[2px] ${
                    isDark ? 'bg-black/60 text-zinc-100' : 'bg-white/80 text-zinc-900'
                  } flex flex-col items-center justify-center p-6 text-center space-y-2`}
                >
                  <Lock className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className="font-mono text-xs uppercase tracking-wider font-semibold">
                    {t.signInCategories}
                  </p>
                </div>
              )}

              <div className={`flex items-center justify-between pb-4 mb-5 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <FolderPlus className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.categoriesTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCatForm(!showCatForm);
                    setEditingCatId(null);
                  }}
                  className={`min-h-[38px] lg:min-h-0 px-3.5 py-2 lg:px-2.5 lg:py-1 text-xs lg:text-[11px] font-mono border ${borderCol} hover:opacity-80 cursor-pointer`}
                >
                  {showCatForm ? t.close : `+ ${t.addCategory}`}
                </button>
              </div>

              {/* Add Category Form */}
              {showCatForm && (
                <form onSubmit={handleAddCategory} className={`mb-6 p-4 border ${borderCol} space-y-3`}>
                  <div>
                    <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                      {t.catName}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.catNamePlaceholder}
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs border outline-none ${inputBg}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                        {t.catCode}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        placeholder="MATH"
                        value={newCatCode}
                        onChange={(e) => setNewCatCode(e.target.value)}
                        className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs font-mono uppercase border outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                        {t.catTarget}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={newCatTarget}
                        onChange={(e) => setNewCatTarget(Number(e.target.value))}
                        className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs font-mono border outline-none ${inputBg}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block font-mono text-[10px] uppercase ${textMuted}`}>
                        {t.indicatorAccent}
                      </label>
                      <span className="font-mono text-[10px] text-zinc-400">
                        {ACCENT_PALETTE.find((c) => c.hex === newCatColor)?.name} ({newCatColor})
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-2.5 pt-0.5">
                      {ACCENT_PALETTE.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setNewCatColor(col.hex)}
                          title={`${col.name} (${col.hex})`}
                          aria-label={tf(t.selectColor, { name: col.name })}
                          className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border transition-all cursor-pointer ${
                            newCatColor === col.hex
                              ? isDark
                                ? 'ring-2 ring-offset-2 ring-offset-[#111111] ring-zinc-200 scale-110 border-white/40'
                                : 'ring-2 ring-offset-2 ring-offset-white ring-zinc-800 scale-110 border-black/20'
                              : 'opacity-65 hover:opacity-100 hover:scale-105 border-transparent'
                          }`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`w-full min-h-[42px] lg:min-h-0 py-2.5 lg:py-2 font-mono text-xs uppercase font-semibold cursor-pointer ${
                      isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                    }`}
                  >
                    {t.create}
                  </button>
                </form>
              )}

              {/* Category List */}
              <div className="space-y-3">
                {categories.length > 0 && (
                  <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider ${textMuted}`}>
                    <span>
                      {t.thisWeek} //{' '}
                      <span className="text-emerald-400 tabular-nums">
                        {currentWeekDates[0].slice(5).replace('-', '.')} — {currentWeekDates[6].slice(5).replace('-', '.')}
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {tf(t.weekResetsOn, { date: addDays(currentWeekStartStr, 7).slice(5).replace('-', '.') })}
                    </span>
                    <span>
                      {tf(t.activeOfTotal, { a: activeCategoryCount, b: openCategories.length })}
                    </span>
                    <span className="basis-full normal-case tracking-normal">
                      {tf(t.weekWindowHint, {
                        tz: timeZone,
                        day: t.weekdaysLong.split(',')[weekStart === 'sun' ? 0 : 1],
                      })}
                    </span>
                  </div>
                )}
                {openCategories.length === 0 ? (
                  <div className={`py-6 text-center font-mono text-xs ${textMuted}`}>
                    {t.noCategoriesConfigured}
                  </div>
                ) : (
                  // -mx-2/px-2 leaves room for the rows' hover bleed once
                  // the expanded list becomes a scroll box (desktop).
                  <div
                    ref={categoryListRef}
                    className={`space-y-3 -mx-2 px-2 ${
                      showAllCategories && categoryListCap
                        ? 'lg:max-h-[var(--category-list-cap)] lg:overflow-y-auto lg:[scrollbar-width:thin]'
                        : ''
                    }`}
                    style={
                      showAllCategories && categoryListCap
                        ? ({ '--category-list-cap': `${categoryListCap}px` } as React.CSSProperties)
                        : undefined
                    }
                  >
                  {visibleCategories.map((cat) => {
                    const isEditing = String(editingCatId) === String(cat.id);
                    return (
                      <div
                        key={cat.id}
                        className="group space-y-2 p-2 -mx-2 rounded transition-colors hover:bg-zinc-500/5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className={`flex items-center space-x-2 min-w-0 ${cat.isActive ? '' : 'opacity-60'}`}>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={swatchStyle(cat.color, cat.isActive)}
                            />
                            <span className="font-mono font-semibold text-[11px] shrink-0">
                              [{cat.code}]
                            </span>
                            <span className="truncate max-w-[115px] sm:max-w-[155px] font-medium" title={cat.name}>
                              {cat.name}
                            </span>
                            {!cat.isActive && (
                              <span className={`shrink-0 px-1 py-px border border-dashed ${borderCol} font-mono text-[9px] uppercase tracking-wider`}>
                                {t.inactive}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 lg:space-x-1.5 shrink-0 ml-2">
                            <span className="font-mono text-[11px] mr-0.5 tabular-nums">
                              {cat.isActive ? (
                                <>
                                  {cat.targetMet && <span className="text-emerald-400 mr-1" title={t.targetMet}>✓</span>}
                                  <span className={cat.targetMet ? 'text-emerald-400 font-semibold' : ''}>{cat.hours}h</span>{' '}
                                  <span className={textMuted}>/ {cat.weeklyTargetHours}h</span>
                                </>
                              ) : (
                                <span className={textMuted}>{cat.hours}h</span>
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleSetCategoryDone(cat, true)}
                              disabled={openCategories.length <= 1}
                              className={`p-2 lg:p-1.5 border ${borderCol} ${textMuted} transition-all ${
                                openCategories.length <= 1
                                  ? 'opacity-20 cursor-not-allowed'
                                  : 'opacity-80 lg:opacity-45 lg:group-hover:opacity-100 hover:text-emerald-400 hover:border-emerald-500/50 cursor-pointer'
                              }`}
                              title={
                                openCategories.length <= 1
                                  ? t.errLastOpenCategory
                                  : tf(t.markDoneCode, { code: cat.code })
                              }
                              aria-label={tf(t.markDoneName, { name: cat.name })}
                            >
                              <CheckCheck className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                isEditing ? handleCancelEditCategory() : handleStartEditCategory(cat)
                              }
                              className={`p-2 lg:p-1.5 border transition-all cursor-pointer ${
                                isEditing
                                  ? 'border-emerald-500/60 text-emerald-400 opacity-100'
                                  : `${borderCol} ${textMuted} opacity-80 lg:opacity-45 lg:group-hover:opacity-100 hover:text-emerald-400 hover:border-emerald-500/50`
                              }`}
                              title={isEditing ? t.closeEditor : tf(t.editCategoryCode, { code: cat.code })}
                              aria-label={tf(t.editCategoryName, { name: cat.name })}
                            >
                              <Pencil className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              disabled={openCategories.length <= 1}
                              className={`p-2 lg:p-1.5 border ${borderCol} ${textMuted} transition-all ${
                                openCategories.length <= 1
                                  ? 'opacity-20 cursor-not-allowed'
                                  : 'opacity-80 lg:opacity-45 lg:group-hover:opacity-100 hover:text-rose-500 hover:border-rose-500/50 cursor-pointer'
                              }`}
                              title={
                                openCategories.length <= 1
                                  ? t.needOneCategory
                                  : tf(t.deleteCategoryCode, { code: cat.code })
                              }
                              aria-label={tf(t.deleteCategoryName, { name: cat.name })}
                            >
                              <Trash2 className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                            </button>
                          </div>
                        </div>

                        {cat.isActive ? (
                          <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${cat.progress}%`,
                                backgroundColor: cat.color,
                                boxShadow: cat.targetMet ? `0 0 6px ${cat.color}` : undefined,
                              }}
                            />
                          </div>
                        ) : (
                          // Parked: no target to fill, just a faint hatch in the category color.
                          <div className="w-full h-1.5 opacity-35" style={{ backgroundImage: inactiveHatch(cat.color) }} />
                        )}

                        {/* Inline Category Edit Form */}
                        {isEditing && (
                          <form
                            onSubmit={handleUpdateCategory}
                            className={`mt-2 p-3.5 border ${borderCol} ${
                              isDark ? 'bg-[#0a0a0a]/90' : 'bg-zinc-50/90'
                            } space-y-3`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                                {tf(t.editCategoryHeader, { code: cat.code })}
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelEditCategory}
                                className={`font-mono text-xs lg:text-[10px] py-1 px-2 uppercase ${textMuted} hover:underline cursor-pointer`}
                              >
                                {t.cancelBracket}
                              </button>
                            </div>

                            {/* Status: active categories carry a weekly target; inactive ones are parked. */}
                            <div>
                              <span className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                                {t.catStatus}
                              </span>
                              <div className={`grid grid-cols-2 border ${borderCol} font-mono text-xs`} role="radiogroup" aria-label={t.catStatus}>
                                {([true, false] as const).map((active) => (
                                  <button
                                    key={String(active)}
                                    type="button"
                                    role="radio"
                                    aria-checked={editCatActive === active}
                                    onClick={() => setEditCatActive(active)}
                                    className={`min-h-[38px] lg:min-h-0 py-2 lg:py-1.5 flex items-center justify-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
                                      active ? '' : `border-l ${borderCol}`
                                    } ${
                                      editCatActive === active
                                        ? active
                                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                                          : `${isDark ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-300 text-zinc-900'} font-bold`
                                        : `${textMuted} hover:opacity-100`
                                    }`}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={swatchStyle(active ? '#10b981' : '#a1a1aa', active)}
                                    />
                                    {active ? t.active : t.inactive}
                                  </button>
                                ))}
                              </div>
                              {!editCatActive && (
                                <p className={`mt-1.5 text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.inactiveHint}</p>
                              )}
                            </div>

                            <div>
                              <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                                {t.catName}
                              </label>
                              <input
                                type="text"
                                required
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs border outline-none ${inputBg}`}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                                  {t.catCode}
                                </label>
                                <input
                                  type="text"
                                  required
                                  maxLength={4}
                                  value={editCatCode}
                                  onChange={(e) => setEditCatCode(e.target.value)}
                                  className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs font-mono uppercase border outline-none ${inputBg}`}
                                />
                              </div>
                              <div>
                                <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                                  {t.catTarget}
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={168}
                                  required={editCatActive}
                                  disabled={!editCatActive}
                                  title={editCatActive ? undefined : t.targetLockedTitle}
                                  value={editCatTarget}
                                  onChange={(e) => setEditCatTarget(Number(e.target.value))}
                                  className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs font-mono border outline-none ${inputBg} disabled:opacity-35 disabled:cursor-not-allowed disabled:line-through`}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className={`block font-mono text-[10px] uppercase ${textMuted}`}>
                                  {t.indicatorAccent}
                                </label>
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {ACCENT_PALETTE.find((c) => c.hex === editCatColor)?.name || t.custom} ({editCatColor})
                                </span>
                              </div>
                              <div className="grid grid-cols-6 gap-2.5 pt-0.5">
                                {ACCENT_PALETTE.map((col) => (
                                  <button
                                    key={col.hex}
                                    type="button"
                                    onClick={() => setEditCatColor(col.hex)}
                                    title={`${col.name} (${col.hex})`}
                                    aria-label={tf(t.selectColor, { name: col.name })}
                                    className={`w-7 h-7 lg:w-6 lg:h-6 rounded-full border transition-all cursor-pointer ${
                                      editCatColor === col.hex
                                        ? isDark
                                          ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0a] ring-zinc-200 scale-110 border-white/40'
                                          : 'ring-2 ring-offset-2 ring-offset-zinc-50 ring-zinc-800 scale-110 border-black/20'
                                        : 'opacity-65 hover:opacity-100 hover:scale-105 border-transparent'
                                    }`}
                                    style={{ backgroundColor: col.hex }}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={handleCancelEditCategory}
                                className={`flex-1 min-h-[40px] lg:min-h-0 py-2 lg:py-1.5 font-mono text-xs uppercase border ${borderCol} hover:opacity-80 cursor-pointer`}
                              >
                                {t.cancel}
                              </button>
                              <button
                                type="submit"
                                className={`flex-1 min-h-[40px] lg:min-h-0 py-2 lg:py-1.5 font-mono text-xs uppercase font-semibold cursor-pointer ${
                                  isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                }`}
                              >
                                {t.saveChanges}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                  </div>
                )}

                {weeklyBreakdown.length > CATEGORY_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllCategories((v) => !v)}
                    aria-expanded={showAllCategories}
                    className={`group w-full min-h-[38px] lg:min-h-0 flex items-center justify-between gap-3 px-2.5 py-2 border ${borderCol} font-mono text-[10px] uppercase tracking-wider ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer`}
                  >
                    <span className="flex items-center gap-1.5 shrink-0">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
                      {showAllCategories
                        ? t.showLessCategories
                        : tf(t.showMoreCategories, { n: hiddenCategories.length })}
                    </span>
                    {showAllCategories ? (
                      <span className="tabular-nums">
                        {weeklyBreakdown.length} / {weeklyBreakdown.length}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                          {hiddenCategories.map((cat) => (
                            <span
                              key={cat.id}
                              className="w-2 h-2 rounded-full shrink-0"
                              style={swatchStyle(cat.color, cat.isActive)}
                              title={`[${cat.code}] ${cat.name}`}
                            />
                          ))}
                        </span>
                        <span className="tabular-nums normal-case shrink-0">
                          {+(hiddenCategories.reduce((acc, c) => acc + c.minutes, 0) / 60).toFixed(1)}h
                        </span>
                      </span>
                    )}
                  </button>
                )}

                {/* DONE fold: finished one-off categories, out of the way but restorable */}
                {doneCategories.length > 0 && (
                  <div className={`border border-dashed ${borderCol}`}>
                    <button
                      type="button"
                      onClick={() => setShowDoneCategories((v) => !v)}
                      aria-expanded={showDoneCategories}
                      className={`w-full min-h-[38px] lg:min-h-0 flex items-center justify-between gap-3 px-2.5 py-2 font-mono text-[10px] uppercase tracking-wider ${textMuted} hover:text-emerald-400 transition-colors cursor-pointer`}
                    >
                      <span className="flex items-center gap-1.5 shrink-0">
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDoneCategories ? 'rotate-180' : ''}`} />
                        {tf(t.doneCategoriesFold, { n: doneCategories.length })}
                      </span>
                      <span className="tabular-nums normal-case shrink-0">
                        {+(doneCategories.reduce((acc, c) => acc + c.minutes, 0) / 60).toFixed(1)}h
                      </span>
                    </button>

                    {showDoneCategories && (
                      <div className={`border-t border-dashed ${borderCol} px-2.5 py-1`}>
                        {doneCategories.map((cat) => (
                          <div key={cat.id} className="group flex items-center justify-between gap-2 py-1.5 text-xs">
                            <div className="flex items-center space-x-2 min-w-0 opacity-70">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={swatchStyle(cat.color, false)} />
                              <span className="font-mono font-semibold text-[11px] shrink-0">[{cat.code}]</span>
                              <span className="truncate max-w-[100px] sm:max-w-[140px] font-medium" title={cat.name}>
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 lg:space-x-1.5 shrink-0">
                              <span
                                className={`font-mono text-[10px] tabular-nums ${textMuted}`}
                                title={tf(t.doneAtTitle, { stamp: formatDateTime(cat.completedAt ?? '') })}
                              >
                                {+(cat.minutes / 60).toFixed(1)}h · {formatDateTimeInZone(cat.completedAt ?? '', timeZone).slice(0, 10).replace(/-/g, '.')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSetCategoryDone(cat, false)}
                                className={`p-2 lg:p-1.5 border ${borderCol} ${textMuted} opacity-80 lg:opacity-45 lg:group-hover:opacity-100 hover:text-emerald-400 hover:border-emerald-500/50 transition-all cursor-pointer`}
                                title={tf(t.restoreCategoryCode, { code: cat.code })}
                                aria-label={tf(t.restoreCategoryName, { name: cat.name })}
                              >
                                <Undo2 className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                disabled={categories.length <= 1}
                                className={`p-2 lg:p-1.5 border ${borderCol} ${textMuted} opacity-80 lg:opacity-45 lg:group-hover:opacity-100 hover:text-rose-500 hover:border-rose-500/50 transition-all cursor-pointer`}
                                title={tf(t.deleteCategoryCode, { code: cat.code })}
                                aria-label={tf(t.deleteCategoryName, { name: cat.name })}
                              >
                                <Trash2 className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* STUDY INSIGHTS & TELEMETRY VAULT PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-5 sm:p-6 space-y-3 relative order-5 lg:order-none`}>
              {!user && (
                <div className={`absolute inset-0 z-20 backdrop-blur-[2px] ${isDark ? 'bg-black/60 text-zinc-100' : 'bg-white/80 text-zinc-900'} flex flex-col items-center justify-center p-6 text-center space-y-2`}>
                  <Lock className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className="font-mono text-xs uppercase tracking-wider font-semibold">
                    {t.signInInsights}
                  </p>
                </div>
              )}

              {/* Panel Header */}
              <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <Activity className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.insightsTitle}
                  </h2>
                </div>
                <span className={`font-mono text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'} flex items-center space-x-1`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t.liveArchive}</span>
                </span>
              </div>

              {/* Section 1: Streak & Consistency (stat strip + 30-day cell strip) */}
              <div className="space-y-2.5 font-mono">
                <div className={`flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider ${textMuted}`}>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Flame className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>{t.streakTitle}</span>
                  </span>
                  <span className="tabular-nums">
                    {tf(t.activeDaysOf30, { n: streakStats.activeDaysInLast30, pct: streakStats.activeDayRatio })}
                  </span>
                </div>

                <div className={`grid grid-cols-2 sm:grid-cols-4 border-t border-l ${borderCol}`}>
                  {(
                    [
                      [t.currentStreak, streakStats.currentStreak, t.unitDaysShort, isDark ? 'text-amber-400' : 'text-amber-600'],
                      [t.allTimeRecord, streakStats.longestStreak, t.unitDaysShort, isDark ? 'text-emerald-400' : 'text-emerald-600'],
                      [t.peakDay, logs.length ? habitInsights.peakDayName.slice(0, 3) : '—', '', ''],
                      [t.avgSession, habitInsights.avgSessionMin, t.unitMin, ''],
                    ] as Array<[string, string | number, string, string]>
                  ).map(([label, value, unit, tone]) => (
                    <div key={label} className={`px-2.5 py-2 border-r border-b ${borderCol} min-w-0`}>
                      <span className={`block text-[9px] uppercase tracking-wider truncate ${textMuted}`}>{label}</span>
                      <span className="mt-0.5 flex items-baseline gap-1">
                        <span className={`text-lg leading-tight font-light tabular-nums ${tone}`}>{value}</span>
                        {unit && <span className={`text-[9px] ${textMuted}`}>{unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  {/* 30 segments filling left -> right: one per active day in the last 30. */}
                  <div
                    className="flex gap-[2px] h-3.5"
                    role="progressbar"
                    aria-label={t.streakTitle}
                    aria-valuemin={0}
                    aria-valuemax={30}
                    aria-valuenow={streakStats.activeDaysInLast30}
                  >
                    {Array.from({ length: 30 }, (_, idx) => (
                      <span
                        key={idx}
                        className={`flex-1 transition-colors duration-500 ${
                          idx < streakStats.activeDaysInLast30 ? 'bg-emerald-500' : isDark ? 'bg-zinc-800/70' : 'bg-zinc-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className={`mt-0.5 flex justify-between text-[9px] uppercase tracking-wider ${textMuted}`}>
                    <span>0</span>
                    <span>{t.strip30d}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Data Vault & Export Actions */}
              <div className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'} font-mono`}>
                <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${textMuted}`}>
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.dataVault}</span>
                </span>
                <div className={`grid grid-cols-2 border ${borderCol} text-[10px] uppercase tracking-wider`}>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={logs.length === 0}
                    className={`min-h-[36px] lg:min-h-0 px-3 py-1.5 flex items-center justify-center gap-1.5 ${isDark ? 'text-zinc-200 hover:bg-zinc-800/50' : 'text-zinc-800 hover:bg-zinc-100'} hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={t.exportCsvTitle}
                  >
                    <Download className="w-3 h-3" />
                    <span>{t.exportCsv}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    disabled={logs.length === 0}
                    className={`min-h-[36px] lg:min-h-0 px-3 py-1.5 border-l ${borderCol} flex items-center justify-center gap-1.5 ${isDark ? 'text-zinc-200 hover:bg-zinc-800/50' : 'text-zinc-800 hover:bg-zinc-100'} hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={t.exportJsonTitle}
                  >
                    <Download className="w-3 h-3" />
                    <span>{t.exportJson}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* LUNAR CALENDAR PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-5 sm:p-6 relative flex flex-col order-7 lg:order-none`}>
              <MoonPhaseCalendar timeZone={timeZone} weekStart={weekStart} textMuted={textMuted} isDark={isDark} />
            </div>
          </div>

          {/* RIGHT COLUMN: Analytics, Cadence, Chronological Stream, Forecast */}
          <div className="contents lg:flex lg:flex-col lg:gap-8 lg:col-span-7 lg:[&>*:last-child]:grow">
            {/* ANALYTICS MODULE */}
            <div className={`border ${borderCol} ${bgCard} p-6 order-4 lg:order-none`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.analyticsTitle}
                  </h2>
                </div>

                {/* 4-Mode Analytics Horizon Selector (Day Breakdown vs Week/Month Bucket Aggregation) */}
                <div className={`grid grid-cols-2 sm:grid-cols-4 border ${borderCol} text-xs lg:text-[11px] font-mono w-full sm:w-auto`}>
                  <button
                    type="button"
                    onClick={() => setPeriodView('weekly')}
                    title={t.hzDaysTitle}
                    className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                      periodView === 'weekly'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    <BarChart3 className="w-3 h-3 shrink-0" />
                    <span>{t.hzDays}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodView('weekly_agg')}
                    title={t.hzWeeksTitle}
                    className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 border-l ${borderCol} flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                      periodView === 'weekly_agg'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    <BarChart3 className="w-3 h-3 shrink-0" />
                    <span>{t.hzWeeks}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodView('monthly_agg')}
                    title={t.hzMonthsTitle}
                    className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 border-t sm:border-t-0 sm:border-l ${borderCol} flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                      periodView === 'monthly_agg'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    <BarChart3 className="w-3 h-3 shrink-0" />
                    <span>{t.hzMonths}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodView('monthly')}
                    title={t.hzCalTitle}
                    className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 border-t sm:border-t-0 border-l ${borderCol} flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                      periodView === 'monthly'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>{t.hzCal}</span>
                  </button>
                </div>
              </div>

              {/* View A: 7D Daily Chart (1 Bar = 1 Day) */}
              {periodView === 'weekly' && (
                <div className="space-y-4">
                  {/* Active Window Info Banner */}
                  <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 border-b ${isDark ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={textMuted}>{t.windowDay}</span>
                      <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{weeklyWindowLabel}</span>
                      {weeklyOffset === 0 ? (
                        <span className="px-1.5 py-0.5 text-[10px] border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold">
                          {t.currentWeek}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] border border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                          {tf(t.weeksAgo, { n: weeklyOffset })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={textMuted}>{t.total7d}</span>
                      <span className="font-semibold text-emerald-400">
                        {(weeklyPeriodTotalMinutes / 60).toFixed(1)}h
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Stacked Bar Chart */}
                  <div className={`h-52 flex items-end justify-between gap-3 pt-6 px-2 border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                    {weeklyChartData.map((day, idx) => {
                      return (
                        <div
                          key={day.date}
                          {...trendBarProps(idx)}
                          className={`flex-1 flex flex-col items-center h-full justify-end group ${trendBarRing(idx)} ${
                            day.isFuture ? 'opacity-45' : ''
                          }`}
                        >
                          <span className={`font-mono text-[10px] mb-1.5 ${textMuted}`}>
                            {day.totalMinutes > 0 ? `${(day.totalMinutes / 60).toFixed(1)}h` : '-'}
                          </span>

                          <div
                            className={`w-full max-w-[38px] h-36 flex flex-col-reverse justify-start overflow-hidden ${
                              isDark ? 'bg-zinc-900/60' : 'bg-zinc-100'
                            }`}
                          >
                            {day.byCategory.map((seg) => {
                              if (seg.minutes === 0) return null;
                              const heightPct = Math.min(
                                100,
                                Math.round((seg.minutes / maxScaleMinutes) * 100)
                              );
                              return (
                                <div
                                  key={seg.category.id}
                                  style={{
                                    height: `${heightPct}%`,
                                    ...segmentStyle(seg.category.color, seg.category.isActive),
                                  }}
                                  className="w-full transition-all duration-300 opacity-90 group-hover:opacity-100"
                                  title={`${seg.category.name}: ${seg.minutes} min (${(seg.minutes / 60).toFixed(1)}h)`}
                                />
                              );
                            })}
                          </div>

                          <span
                            className={`font-mono text-[9px] mt-2 tracking-wider ${
                              day.isToday ? 'text-emerald-400 font-bold' : textMuted
                            }`}
                          >
                            {day.weekday}
                          </span>
                          <span className={`font-mono text-[11px] mt-0.5 ${day.isToday ? 'text-emerald-400 font-semibold' : ''}`}>
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Trend Matrix (numeric breakdown + color legend) */}
                  <CategoryTrendTable
                    columns={weeklyTrendColumns}
                    categories={analyticsCategories}
                    unitLabel={t.unitDay}
                    isDark={isDark}
                    borderCol={borderCol}
                    textMuted={textMuted}
                    highlightIdx={trendHighlightIdx}
                    onHighlight={setTrendHighlight}
                  />
                </div>
              )}

              {/* View B: 12-Week Bucket Aggregation (1 Bar = 1 Full Week) */}
              {periodView === 'weekly_agg' && (
                <div className="space-y-4">
                  <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 border-b ${isDark ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={textMuted}>{t.window12w}</span>
                      <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                        {weeklyAggBuckets.windowLabel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className={textMuted}>{t.total12w}</span>
                        <span className="font-semibold text-emerald-400">
                          {(weeklyAggBuckets.total12WMinutes / 60).toFixed(1)}h
                        </span>
                      </div>
                      <div>
                        <span className={textMuted}>{t.avgWk}</span>
                        <span className="font-semibold">
                          {(weeklyAggBuckets.total12WMinutes / 60 / 12).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Week Stacked Bar Chart */}
                  <div className={`h-52 flex items-end justify-between gap-1.5 sm:gap-2.5 pt-6 px-1 border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                    {weeklyAggBuckets.buckets.map((wk, idx) => (
                      <div
                        key={wk.id}
                        {...trendBarProps(idx)}
                        className={`flex-1 flex flex-col items-center h-full justify-end group min-w-0 ${trendBarRing(idx)}`}
                        title={`Week ${wk.startStr} — ${wk.endStr}: ${(wk.totalMinutes / 60).toFixed(1)}h (${wk.totalMinutes} min)`}
                      >
                        <span className={`font-mono text-[9px] sm:text-[10px] mb-1.5 truncate ${textMuted}`}>
                          {wk.totalMinutes > 0 ? `${(wk.totalMinutes / 60).toFixed(1)}h` : '-'}
                        </span>

                        <div
                          className={`w-full max-w-[30px] h-36 flex flex-col-reverse justify-start overflow-hidden ${
                            isDark ? 'bg-zinc-900/60' : 'bg-zinc-100'
                          }`}
                        >
                          {wk.byCategory.map((seg) => {
                            if (seg.minutes === 0) return null;
                            const heightPct = Math.min(
                              100,
                              Math.round((seg.minutes / weeklyAggBuckets.maxWeekMinutes) * 100)
                            );
                            return (
                              <div
                                key={seg.category.id}
                                style={{
                                  height: `${heightPct}%`,
                                  ...segmentStyle(seg.category.color, seg.category.isActive),
                                }}
                                className="w-full transition-all duration-300 opacity-90 group-hover:opacity-100"
                                title={`[${seg.category.code}] ${seg.category.name}: ${(seg.minutes / 60).toFixed(1)}h`}
                              />
                            );
                          })}
                        </div>

                        <span className="font-mono text-[9px] sm:text-[10px] mt-2.5 truncate">
                          {wk.shortLabel}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Category Trend Matrix (numeric breakdown + color legend) */}
                  <CategoryTrendTable
                    columns={weeklyAggTrendColumns}
                    categories={analyticsCategories}
                    unitLabel={t.unitWeek}
                    isDark={isDark}
                    borderCol={borderCol}
                    textMuted={textMuted}
                    highlightIdx={trendHighlightIdx}
                    onHighlight={setTrendHighlight}
                  />
                </div>
              )}

              {/* View C: 12-Month Bucket Aggregation (1 Bar = 1 Full Month) */}
              {periodView === 'monthly_agg' && (
                <div className="space-y-4">
                  <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 border-b ${isDark ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={textMuted}>{t.window12m}</span>
                      <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                        {monthlyAggBuckets.windowLabel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div>
                        <span className={textMuted}>{t.total12m}</span>
                        <span className="font-semibold text-emerald-400">
                          {(monthlyAggBuckets.total12MMinutes / 60).toFixed(1)}h
                        </span>
                      </div>
                      <div>
                        <span className={textMuted}>{t.avgMo}</span>
                        <span className="font-semibold">
                          {(monthlyAggBuckets.total12MMinutes / 60 / 12).toFixed(1)}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Month Stacked Bar Chart */}
                  <div className={`h-52 flex items-end justify-between gap-1.5 sm:gap-2.5 pt-6 px-1 border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                    {monthlyAggBuckets.buckets.map((mo, idx) => (
                      <div
                        key={mo.id}
                        {...trendBarProps(idx)}
                        className={`flex-1 flex flex-col items-center h-full justify-end group min-w-0 ${trendBarRing(idx)}`}
                        title={`${mo.fullLabel}: ${(mo.totalMinutes / 60).toFixed(1)}h (${mo.totalMinutes} min)`}
                      >
                        <span className={`font-mono text-[9px] sm:text-[10px] mb-1.5 truncate ${textMuted}`}>
                          {mo.totalMinutes > 0 ? `${(mo.totalMinutes / 60).toFixed(1)}h` : '-'}
                        </span>

                        <div
                          className={`w-full max-w-[30px] h-36 flex flex-col-reverse justify-start overflow-hidden ${
                            isDark ? 'bg-zinc-900/60' : 'bg-zinc-100'
                          }`}
                        >
                          {mo.byCategory.map((seg) => {
                            if (seg.minutes === 0) return null;
                            const heightPct = Math.min(
                              100,
                              Math.round((seg.minutes / monthlyAggBuckets.maxMonthMinutes) * 100)
                            );
                            return (
                              <div
                                key={seg.category.id}
                                style={{
                                  height: `${heightPct}%`,
                                  ...segmentStyle(seg.category.color, seg.category.isActive),
                                }}
                                className="w-full transition-all duration-300 opacity-90 group-hover:opacity-100"
                                title={`[${seg.category.code}] ${seg.category.name}: ${(seg.minutes / 60).toFixed(1)}h`}
                              />
                            );
                          })}
                        </div>

                        <span className="font-mono text-[9px] sm:text-[10px] mt-2.5 truncate">
                          {mo.shortLabel}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Category Trend Matrix (numeric breakdown + color legend) */}
                  <CategoryTrendTable
                    columns={monthlyAggTrendColumns}
                    categories={analyticsCategories}
                    unitLabel={t.unitMonth}
                    isDark={isDark}
                    borderCol={borderCol}
                    textMuted={textMuted}
                    highlightIdx={trendHighlightIdx}
                    onHighlight={setTrendHighlight}
                  />
                </div>
              )}

              {/* View D: Monthly Activity Calendar Matrix (1 Cell = 1 Day) */}
              {periodView === 'monthly' && (
                <div className="space-y-6">
                  <div>
                    {/* Active Month Info Banner */}
                    <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 mb-3 border-b ${isDark ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={textMuted}>{t.monthCalendar}</span>
                        <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{targetMonthName}</span>
                        {monthlyOffset === 0 ? (
                          <span className="px-1.5 py-0.5 text-[10px] border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold">
                            {t.currentMonth}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] border border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                            {tf(t.monthsAgo, { n: monthlyOffset })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={textMuted}>{t.monthTotal}</span>
                        <span className="font-semibold text-emerald-400">
                          {(monthlyPeriodTotalMinutes / 60).toFixed(1)}h
                        </span>
                      </div>
                    </div>

                    {/* Weekday Labels (Mon to Sun, or Sun to Sat per week-start setting) */}
                    <div className="grid grid-cols-7 gap-1.5 mb-2 text-center font-mono text-[10px] text-zinc-500">
                      {orderedWeekdayLabels(t.weekdaysShortSun, weekStart).map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>

                    {/* Calendar Month Matrix Grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {/* Leading offset placeholders */}
                      {Array.from({ length: daysInTargetMonth.startDayOfWeek }).map((_, idx) => (
                        <div
                          key={`empty-lead-${idx}`}
                          className="h-12 border border-transparent opacity-0 pointer-events-none"
                        />
                      ))}

                      {/* Day Cells */}
                      {daysInTargetMonth.days.map((cell) => {
                        const intensity =
                          cell.minutes === 0
                            ? isDark
                              ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-500'
                              : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                            : cell.minutes < 60
                            ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                            : cell.minutes < 120
                            ? 'bg-emerald-500/50 border-emerald-500/60 text-emerald-200'
                            : 'bg-emerald-500 border-emerald-400 text-zinc-950 font-semibold';

                        return (
                          <div
                            key={cell.date}
                            onClick={() => setLogDate(cell.date)}
                            className={`p-2 border font-mono text-[10px] flex flex-col justify-between h-12 transition-colors cursor-pointer ${intensity}`}
                            title={tf(t.calCellTitle, { date: cell.date, min: cell.minutes, h: (cell.minutes / 60).toFixed(1) })}
                          >
                            <span className="opacity-70 text-[9px]">{cell.date.slice(8)}</span>
                            <span className="text-right font-medium">
                              {cell.minutes > 0 ? `${(cell.minutes / 60).toFixed(1)}h` : '-'}
                            </span>
                          </div>
                        );
                      })}

                      {/* Trailing padding cells to guarantee a fixed 6-row (42-cell) calendar height */}
                      {Array.from({
                        length: Math.max(
                          0,
                          42 - (daysInTargetMonth.startDayOfWeek + daysInTargetMonth.days.length)
                        ),
                      }).map((_, idx) => (
                        <div
                          key={`empty-trail-${idx}`}
                          className="h-12 border border-transparent opacity-0 pointer-events-none"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TIMELINE SCRUBBER & SLIDER (BOTTOM NAVIGATION) */}
              <div className={`mt-6 pt-5 border-t ${borderCol} space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-semibold tracking-wider uppercase text-[11px] shrink-0">
                      {t.timelineScrubber}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] border shrink-0 ${
                        isAtPresent
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold'
                          : 'border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold'
                      }`}
                    >
                      {isWeekly
                        ? weeklyOffset === 0
                          ? t.currentWeek
                          : tf(t.minusWeeks, { n: weeklyOffset })
                        : monthlyOffset === 0
                        ? t.currentMonth
                        : tf(t.minusMonths, { n: monthlyOffset })}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isAtOldest}
                      className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 border text-xs lg:text-[11px] flex items-center justify-center space-x-1 transition-colors ${
                        isAtOldest
                          ? 'opacity-30 cursor-not-allowed border-zinc-800/40'
                          : `${borderCol} hover:border-zinc-400 ${isDark ? 'hover:bg-zinc-800/40 text-zinc-200' : 'hover:bg-zinc-100 text-black'} cursor-pointer`
                      }`}
                      title={isWeekly ? t.rewindWeek : t.rewindMonth}
                    >
                      <ChevronLeft className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                      <span>{isWeekly ? t.minus1Wk : t.minus1Mo}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isAtPresent}
                      className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 border text-xs lg:text-[11px] flex items-center justify-center space-x-1 transition-colors ${
                        isAtPresent
                          ? 'opacity-30 cursor-not-allowed border-zinc-800/40'
                          : `${borderCol} hover:border-zinc-400 ${isDark ? 'hover:bg-zinc-800/40 text-zinc-200' : 'hover:bg-zinc-100 text-black'} cursor-pointer`
                      }`}
                      title={isWeekly ? t.advanceWeek : t.advanceMonth}
                    >
                      <span>{isWeekly ? t.plus1Wk : t.plus1Mo}</span>
                      <ChevronRight className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetToPresent}
                      disabled={isAtPresent}
                      className={`min-h-[38px] lg:min-h-0 px-2.5 py-2 lg:py-1 border text-xs lg:text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors ${
                        isAtPresent
                          ? 'opacity-30 cursor-not-allowed border-zinc-800/40'
                          : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 cursor-pointer'
                      }`}
                      title={t.resetPresentTitle}
                    >
                      <RotateCcw className="w-3.5 h-3.5 lg:w-3 lg:h-3" />
                      <span>{t.present}</span>
                    </button>
                  </div>
                </div>

                {/* Range Slider Track */}
                <div className="space-y-1.5 pt-1">
                  <div className="relative flex items-center py-1">
                    <input
                      type="range"
                      min={0}
                      max={maxRange}
                      step={1}
                      value={currentSliderVal}
                      onChange={handleSliderChange}
                      className="w-full h-3 lg:h-2 bg-zinc-800 rounded-none appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
                      aria-label={t.timelineSlider}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono select-none">
                    <span className={textMuted}>
                      {isWeekly ? tf(t.pastWeeks, { n: maxWeeksAgo }) : tf(t.pastMonths, { n: maxMonthsAgo })}
                    </span>
                    <span className="text-zinc-500 hidden sm:inline">
                      {t.dragToRewind}
                    </span>
                    <span className={isAtPresent ? 'text-emerald-400 font-semibold' : textMuted}>
                      {t.todayPresent}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TELEMETRY CADENCE MATRIX (7 DAYS VERTICAL x DYNAMIC WEEKS HORIZONTAL) */}
            <div className={`border ${borderCol} ${bgCard} p-6 space-y-4 order-3 lg:order-none`}>
              {/* Header & Mode Controls */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b ${
                  isDark ? 'border-zinc-800/60' : 'border-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Grid3x3 className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.cadenceTitle}
                  </h2>
                  <span
                    className={`px-1.5 py-0.5 font-mono text-[10px] border ${
                      isDark
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                        : 'border-emerald-600/40 text-emerald-700 bg-emerald-500/10'
                    }`}
                  >
                    {tf(t.epochN, { a: cadenceMatrixData.targetEpochIndex, b: cadenceMatrixData.totalEpochs })}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs lg:text-[11px]">
                  {/* Color Mode Toggle: INTENSITY (Shaded) vs BINARY (Single Signal) */}
                  <div className={`flex border ${borderCol}`}>
                    <button
                      type="button"
                      onClick={() => setMatrixColorMode('intensity')}
                      className={`min-h-[36px] lg:min-h-0 px-3 py-1.5 lg:px-2.5 lg:py-1 cursor-pointer transition-colors ${
                        matrixColorMode === 'intensity'
                          ? isDark
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'bg-zinc-900 text-white font-semibold'
                          : textMuted
                      }`}
                      title={t.shadedTitle}
                    >
                      {t.shaded}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixColorMode('binary')}
                      className={`min-h-[36px] lg:min-h-0 px-3 py-1.5 lg:px-2.5 lg:py-1 cursor-pointer transition-colors ${
                        matrixColorMode === 'binary'
                          ? isDark
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'bg-zinc-900 text-white font-semibold'
                          : textMuted
                      }`}
                      title={t.binaryTitle}
                    >
                      {t.binary}
                    </button>
                  </div>

                  {/* Capacity Span Toggle: 1X (Fit Screen) vs 2X (Double Capacity Expansion) */}
                  <div className={`flex border ${borderCol}`}>
                    <button
                      type="button"
                      onClick={() => setMatrixSpanMultiplier(1)}
                      className={`min-h-[36px] lg:min-h-0 px-2.5 py-1.5 lg:px-2 lg:py-1 cursor-pointer transition-colors ${
                        matrixSpanMultiplier === 1
                          ? isDark
                            ? 'bg-emerald-500 text-zinc-950 font-semibold'
                            : 'bg-emerald-600 text-white font-semibold'
                          : textMuted
                      }`}
                      title={t.span1xTitle}
                    >
                      1X ({cadenceMatrixData.unitWeeks}W)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixSpanMultiplier(2)}
                      className={`min-h-[36px] lg:min-h-0 px-2.5 py-1.5 lg:px-2 lg:py-1 cursor-pointer transition-colors ${
                        matrixSpanMultiplier === 2
                          ? isDark
                            ? 'bg-emerald-500 text-zinc-950 font-semibold'
                            : 'bg-emerald-600 text-white font-semibold'
                          : textMuted
                      }`}
                      title={t.span2xTitle}
                    >
                      2X ({cadenceMatrixData.unitWeeks * 2}W)
                    </button>
                  </div>

                  {/* Epoch Pagination when history spans multiple blocks */}
                  {cadenceMatrixData.totalEpochs > 1 && (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={cadenceMatrixData.clampedOffset >= cadenceMatrixData.totalEpochs - 1}
                        onClick={() =>
                          setMatrixPageOffset((p) => Math.min(p + 1, cadenceMatrixData.totalEpochs - 1))
                        }
                        className={`min-h-[36px] min-w-[36px] lg:min-h-0 lg:min-w-0 p-1.5 lg:p-1 border ${borderCol} flex items-center justify-center disabled:opacity-30 cursor-pointer`}
                        title={t.prevEpoch}
                      >
                        <ChevronLeft className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={cadenceMatrixData.clampedOffset === 0}
                        onClick={() => setMatrixPageOffset((p) => Math.max(0, p - 1))}
                        className={`min-h-[36px] min-w-[36px] lg:min-h-0 lg:min-w-0 p-1.5 lg:p-1 border ${borderCol} flex items-center justify-center disabled:opacity-30 cursor-pointer`}
                        title={t.nextEpoch}
                      >
                        <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-header Telemetry Readout */}
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className={textMuted}>{t.spanLabel}</span>
                  <span className="font-semibold">
                    {cadenceMatrixData.startLabel} — {cadenceMatrixData.endLabel}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <span className={textMuted}>{t.activeDaysLabel}</span>
                    <span className="font-semibold text-emerald-400">
                      {cadenceMatrixData.activeDaysInBlock}D
                    </span>
                  </div>
                  <div>
                    <span className={textMuted}>{t.blockVolume}</span>
                    <span className="font-semibold">
                      {(cadenceMatrixData.totalMinutesInBlock / 60).toFixed(1)}H
                    </span>
                  </div>
                </div>
              </div>

              {/* Matrix Grid Container (7 Vertical Days x Dynamic Horizontal Weeks) */}
              <div className="flex items-start space-x-2.5 pt-1">
                {/* 7-Day Vertical Axis Labels (first day of week at the top) */}
                <div
                  className={`flex flex-col justify-between pt-[18px] font-mono text-[9px] leading-none select-none shrink-0 h-[133px] ${textMuted}`}
                >
                  {orderedWeekdayLabels(t.weekdaysShortSun, weekStart).map((d, i) => (
                    <span key={d} className={`h-[13px] flex items-center ${i % 2 === 1 ? 'opacity-50' : ''}`}>
                      {d}
                    </span>
                  ))}
                </div>

                {/* Auto-Measured Horizontal Weeks Stream */}
                <div
                  ref={matrixGridContainerRef}
                  className="flex-1 min-w-0 overflow-x-auto pb-1"
                  onMouseLeave={() => setHoveredMatrixCell(null)}
                >
                  <div className="inline-flex flex-col min-w-full">
                    {/* Month Markers Row */}
                    <div className="flex gap-[4px] h-[14px] mb-[4px] font-mono text-[9px] leading-none select-none">
                      {cadenceMatrixData.weeks.map((wk) => (
                        <div key={`month-${wk.weekStartDate}`} className="w-[13px] shrink-0 relative">
                          {wk.monthLabel && (
                            <span className={`absolute left-0 top-0 whitespace-nowrap ${textMuted}`}>
                              {wk.monthLabel}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Week Columns x 7 Day Cells */}
                    <div className="flex gap-[4px] justify-between">
                      {cadenceMatrixData.weeks.map((wk) => (
                        <div key={wk.weekStartDate} className="flex flex-col gap-[4px] shrink-0">
                          {wk.days.map((cell) => {
                            const hasCommit = cell.minutes > 0;
                            let cellStyle: string;

                            if (!hasCommit) {
                              if (cell.isFuture) {
                                // Unfilled future capacity slot (dashed/subtle architectural blueprint)
                                cellStyle = isDark
                                  ? 'bg-[#0c0c0c] border-zinc-800/50 border-dashed opacity-65'
                                  : 'bg-zinc-50/70 border-zinc-200/80 border-dashed opacity-75';
                              } else {
                                cellStyle = isDark
                                  ? 'bg-zinc-900/70 border-zinc-800/90'
                                  : 'bg-zinc-100 border-zinc-200';
                              }
                            } else if (matrixColorMode === 'binary') {
                              // Binary mode: uniform crisp signal whenever any commit log is recorded
                              cellStyle = isDark
                                ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.25)]'
                                : 'bg-emerald-600 border-emerald-700';
                            } else {
                              // Shaded intensity mode: 4 architectural telemetry tiers
                              if (cell.minutes < 45) {
                                cellStyle = isDark
                                  ? 'bg-emerald-500/30 border-emerald-500/50'
                                  : 'bg-emerald-200 border-emerald-300';
                              } else if (cell.minutes < 90) {
                                cellStyle = isDark
                                  ? 'bg-emerald-500/55 border-emerald-500/70'
                                  : 'bg-emerald-400 border-emerald-500';
                              } else if (cell.minutes < 180) {
                                cellStyle = isDark
                                  ? 'bg-emerald-500/80 border-emerald-400'
                                  : 'bg-emerald-500 border-emerald-600';
                              } else {
                                cellStyle = isDark
                                  ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_6px_rgba(52,211,153,0.35)]'
                                  : 'bg-emerald-700 border-emerald-900';
                              }
                            }

                            const todayHighlight = cell.isToday
                              ? isDark
                                ? 'ring-1 ring-amber-400 ring-offset-1 ring-offset-[#111111]'
                                : 'ring-1 ring-amber-600 ring-offset-1 ring-offset-white'
                              : '';
                            // Ambient Mode: the cell actively being recorded
                            // into breathes slowly instead of sitting static.
                            const ambientPulse = cell.isToday && isAmbientMode ? 'cadence-cell-pulse' : '';

                            return (
                              <div
                                key={cell.date}
                                onMouseEnter={() =>
                                  setHoveredMatrixCell({
                                    date: cell.date,
                                    minutes: cell.minutes,
                                    count: cell.count,
                                    topics: cell.topics,
                                  })
                                }
                                onClick={() => {
                                  setLogDate(cell.date);
                                }}
                                className={`w-[13px] h-[13px] border rounded-none transition-all duration-150 cursor-pointer hover:scale-125 hover:z-10 ${cellStyle} ${todayHighlight} ${ambientPulse}`}
                                title={`${cell.date}: ${
                                  cell.minutes > 0
                                    ? tf(t.cellCommits, { min: cell.minutes, h: (cell.minutes / 60).toFixed(1), n: cell.count })
                                    : cell.isFuture
                                    ? t.cellFuture
                                    : t.cellEmpty
                                }`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Matrix Footer: Live Inspector Readout & Scale Key */}
              <div
                className={`pt-3 border-t ${
                  isDark ? 'border-zinc-800/60' : 'border-zinc-200'
                } flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]`}
              >
                <div className="truncate max-w-md">
                  {hoveredMatrixCell ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-semibold">[{hoveredMatrixCell.date}]</span>
                      {hoveredMatrixCell.minutes > 0 ? (
                        <span>
                          {tf(t.inspectCommits, {
                            min: hoveredMatrixCell.minutes,
                            h: (hoveredMatrixCell.minutes / 60).toFixed(1),
                            n: hoveredMatrixCell.count,
                          })}
                        </span>
                      ) : (
                        <span className={textMuted}>{t.inspectEmpty}</span>
                      )}
                    </div>
                  ) : (
                    <span className={textMuted}>
                      {t.inspectHint}
                    </span>
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center space-x-2 shrink-0 select-none">
                  <span className={textMuted}>{t.idle}</span>
                  <span
                    className={`w-2.5 h-2.5 border inline-block ${
                      isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                    }`}
                  />
                  {matrixColorMode === 'intensity' ? (
                    <>
                      <span
                        className={`w-2.5 h-2.5 border inline-block ${
                          isDark ? 'bg-emerald-500/30 border-emerald-500/50' : 'bg-emerald-200 border-emerald-300'
                        }`}
                      />
                      <span
                        className={`w-2.5 h-2.5 border inline-block ${
                          isDark ? 'bg-emerald-500/55 border-emerald-500/70' : 'bg-emerald-400 border-emerald-500'
                        }`}
                      />
                      <span
                        className={`w-2.5 h-2.5 border inline-block ${
                          isDark ? 'bg-emerald-500/80 border-emerald-400' : 'bg-emerald-500 border-emerald-600'
                        }`}
                      />
                      <span
                        className={`w-2.5 h-2.5 border inline-block ${
                          isDark ? 'bg-emerald-400 border-emerald-200' : 'bg-emerald-700 border-emerald-900'
                        }`}
                      />
                    </>
                  ) : (
                    <span
                      className={`w-2.5 h-2.5 border inline-block ${
                        isDark ? 'bg-emerald-500 border-emerald-400' : 'bg-emerald-600 border-emerald-700'
                      }`}
                    />
                  )}
                  <span className={textMuted}>{t.committed}</span>
                </div>
              </div>
            </div>

            {/* CHRONOLOGICAL LOG STREAM (always last on phones) */}
            <div className={`border ${borderCol} ${bgCard} p-6 order-9 lg:order-none`}>
              <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <Terminal className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.recentLogs}
                  </h2>
                </div>
                <span className={`font-mono text-[11px] ${textMuted}`}>
                  {user ? tf(t.nRecords, { n: logs.length }) : t.standby}
                </span>
              </div>

              {dataLoading ? (
                <div className="py-12 flex items-center justify-center space-x-2 font-mono text-xs text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.loadingRecords}</span>
                </div>
              ) : logs.length === 0 ? (
                <div className={`py-12 text-center font-mono text-xs ${textMuted}`}>
                  {user ? t.noLogs : t.authToViewLogs}
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    ref={logListRef}
                    className={`relative divide-y ${isDark ? 'divide-zinc-800/70' : 'divide-zinc-200'} ${
                      logStreamExpanded && logListCap
                        ? 'lg:max-h-[var(--log-list-cap)] lg:overflow-y-auto lg:pr-2 lg:[scrollbar-width:thin]'
                        : ''
                    }`}
                    style={
                      logStreamExpanded && logListCap
                        ? ({ '--log-list-cap': `${logListCap}px` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {logs.slice(0, visibleLogCount).map((log) => {
                      const cat = categories.find((c) => String(c.id) === String(log.categoryId));
                      const isEditingLog = String(editingLogId) === String(log.id);
                      return (
                        <div
                          key={log.id}
                          className={`py-3 space-y-3 group ${
                            String(flashLogId) === String(log.id) ? 'log-row-flash' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Line 1: category identity. Line 2: when + how long. */}
                            <div className="flex-1 min-w-0 space-y-1.5 font-mono text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={swatchStyle(cat?.color || log.categoryColor || '#71717a', cat?.isActive !== false)}
                                />
                                <span className="font-bold shrink-0">
                                  [{cat?.code || log.categoryCode || 'LOG'}]
                                </span>
                                <span className="truncate font-medium">
                                  {cat?.name || log.categoryName || t.studySession}
                                </span>
                              </div>
                              <div className="pl-5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                <span className={`tabular-nums ${textMuted}`}>// {log.date}</span>
                                {log.createdAt && (
                                  <span
                                    className={`text-[10px] tabular-nums ${textMuted}`}
                                    title={tf(t.loggedAtTitle, { stamp: formatDateTime(log.createdAt), utc: log.createdAt })}
                                  >
                                    {t.loggedAt} {formatDateTime(log.createdAt)}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 text-[10px] border border-zinc-700/60 font-semibold tabular-nums">
                                  {tf(t.logDurationChip, { min: log.durationMinutes, h: (log.durationMinutes / 60).toFixed(1) })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 lg:space-x-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditingLog ? handleCancelEditLog() : handleStartEditLog(log)
                                }
                                className={`p-2.5 lg:p-1.5 border transition-colors cursor-pointer ${
                                  isEditingLog
                                    ? 'border-emerald-500/60 text-emerald-400'
                                    : `${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50`
                                }`}
                                title={isEditingLog ? t.closeEditor : t.editLog}
                                aria-label={t.editLog}
                              >
                                <Pencil className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className={`p-2.5 lg:p-1.5 border ${borderCol} ${textMuted} hover:text-rose-500 hover:border-rose-500/50 transition-colors cursor-pointer`}
                                title={t.deleteLog}
                                aria-label={t.deleteLog}
                              >
                                <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Inline Log Editor */}
                          {isEditingLog && (
                            <form
                              onSubmit={handleUpdateLog}
                              className={`p-3.5 border ${borderCol} ${
                                isDark ? 'bg-[#0a0a0a]/90' : 'bg-zinc-50/90'
                              } space-y-3 font-mono text-xs`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                                  {tf(t.editRecordHeader, { id: log.id })}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleCancelEditLog}
                                  className={`text-xs lg:text-[10px] py-1 px-2 uppercase ${textMuted} hover:underline cursor-pointer`}
                                >
                                  {t.cancelBracket}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                                    {t.category}
                                  </label>
                                  <CategorySelect
                                    categories={categories}
                                    value={editLogCatId}
                                    onChange={setEditLogCatId}
                                    borderCol={borderCol}
                                    inputBg={inputBg}
                                    textMuted={textMuted}
                                  />
                                </div>

                                <div>
                                  <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                                    {t.durationMin}
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={1440}
                                    required
                                    value={editLogDuration}
                                    onChange={(e) => setEditLogDuration(Number(e.target.value))}
                                    className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs border outline-none ${inputBg}`}
                                  />
                                </div>

                                <div>
                                  <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                                    {t.date}
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={editLogDate}
                                    onChange={(e) => setEditLogDate(e.target.value)}
                                    className={`w-full min-h-[40px] lg:min-h-0 px-2.5 py-2 lg:py-1.5 text-base sm:text-xs border outline-none ${inputBg}`}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleCancelEditLog}
                                  className={`min-h-[38px] lg:min-h-0 px-3.5 py-2 lg:px-3 lg:py-1.5 text-xs uppercase border ${borderCol} hover:opacity-80 cursor-pointer`}
                                >
                                  {t.cancel}
                                </button>
                                <button
                                  type="submit"
                                  className={`min-h-[38px] lg:min-h-0 px-4 py-2 lg:px-3.5 lg:py-1.5 text-xs uppercase font-semibold cursor-pointer ${
                                    isDark
                                      ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300'
                                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                  }`}
                                >
                                  {t.saveChanges}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {logs.length > INITIAL_VISIBLE_LOGS && (
                    <div className={`pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} font-mono text-xs`}>
                      <span className={`text-[11px] ${textMuted}`}>
                        {tf(t.displayingOf, { a: Math.min(visibleLogCount, logs.length), b: logs.length })}
                      </span>
                      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                        {visibleLogCount < logs.length && (
                          <>
                            <button
                              type="button"
                              onClick={() => setExtraVisibleLogs((prev) => prev + Math.min(10, logs.length - visibleLogCount))}
                              className={`flex-1 sm:flex-initial min-h-[40px] lg:min-h-0 px-4 py-2 lg:px-3.5 lg:py-1.5 border ${borderCol} ${
                                isDark
                                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                                  : 'text-emerald-700 border-emerald-600/40 bg-emerald-50 hover:bg-emerald-100'
                              } font-bold transition-colors cursor-pointer`}
                            >
                              {tf(t.showMore, { n: Math.min(10, logs.length - visibleLogCount) })}
                            </button>
                            {logs.length - visibleLogCount > 10 && (
                              <button
                                type="button"
                                onClick={() => setExtraVisibleLogs(logs.length - INITIAL_VISIBLE_LOGS)}
                                className={`flex-1 sm:flex-initial min-h-[40px] lg:min-h-0 px-3.5 py-2 lg:px-3 lg:py-1.5 border ${borderCol} ${
                                  isDark
                                    ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/40'
                                    : 'text-black hover:bg-zinc-100 hover:border-zinc-800'
                                } hover:border-zinc-500 transition-colors cursor-pointer`}
                              >
                                {tf(t.showAll, { n: logs.length })}
                              </button>
                            )}
                          </>
                        )}
                        {visibleLogCount > INITIAL_VISIBLE_LOGS && (
                          <button
                            type="button"
                            onClick={() => setExtraVisibleLogs(0)}
                            className={`flex-1 sm:flex-initial min-h-[40px] lg:min-h-0 px-3.5 py-2 lg:px-3 lg:py-1.5 border ${borderCol} ${
                              isDark
                                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                                : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
                            } transition-colors cursor-pointer`}
                          >
                            {t.collapse}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FORECAST PANEL (Clearance projection from recent pace, computed client-side) */}
            <div className={`border ${borderCol} ${bgCard} p-5 sm:p-6 relative flex flex-col order-8 lg:order-none`}>
              <Forecast
                logs={user ? logs : []}
                todayStr={todayStr}
                clearance={clearanceStatus}
                textMuted={textMuted}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ==========================================
          7. FOOTER SECTION (Standard Theme Polarity)
      ========================================== */}
      <footer
        className={`relative w-full py-12 sm:py-14 px-6 border-t transition-colors duration-300 ${bgMain} ${borderCol}`}
      >
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          {/* Brand sign-off: same TYPBOX .me lockup as the header, the
              author credit, then the copyright / mark notice. The notice is
              split where it reads naturally so each half stays on one line
              on desktop and phones only wrap inside a half. */}
          <div className="w-full flex flex-col items-center gap-3 font-mono text-center">
            <div className="flex items-center space-x-2">
              <TypboxLogo className="w-4 h-4" isDark={isDark} />
              <span className="text-base font-bold tracking-tighter">TYPBOX</span>
              <span className={`text-[10px] px-1 py-0.5 border ${borderCol} ${textMuted}`}>.me</span>
            </div>
            <a
              href="https://rikutomikado.tech"
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center gap-1 text-[11px] tracking-widest uppercase ${textMuted} hover:text-emerald-400 transition-colors`}
            >
              {t.builtBy}
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <div className="flex flex-col items-center gap-1.5 mt-1">
              <div className={`text-[10px] sm:text-[11px] tracking-[0.2em] uppercase sm:whitespace-nowrap ${textMuted}`}>
                {t.copyrightLine}
              </div>
              <div
                className={`flex items-center gap-2 text-[9px] sm:text-[10px] tracking-widest uppercase opacity-75 leading-relaxed sm:whitespace-nowrap ${textMuted}`}
              >
                <span className="w-1 h-1 bg-emerald-500 shrink-0" aria-hidden="true" />
                <span>{t.copyrightRights}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ==========================================
          MODAL 1: AUTHENTICATION GATEWAY (LOGIN / REGISTER / PASSWORD RESET)
      ========================================== */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeAuthModal}
        >
          <div
            className={`w-full max-w-md border ${borderCol} ${bgCard} p-6 space-y-5 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b ${borderCol} pb-3`}>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">
                  {authMode === 'forgot'
                    ? t.authTitleForgot
                    : authMode === 'reset_confirm'
                    ? t.authTitleReset
                    : t.authTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAuthModal}
                className="font-mono text-xs hover:underline cursor-pointer"
              >
                {t.closeBracket}
              </button>
            </div>

            {/* Mode Switcher Tabs (Shown for Login / Register while sign-ups are open) */}
            {REGISTRATION_OPEN && (authMode === 'login' || authMode === 'register') && (
              <div className={`flex border ${borderCol} text-xs font-mono`}>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                    setAuthPassword('');
                  }}
                  className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
                    authMode === 'login'
                      ? isDark
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-white font-bold'
                      : textMuted
                  }`}
                >
                  {t.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                    setAuthPassword('');
                  }}
                  className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
                    authMode === 'register'
                      ? isDark
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-white font-bold'
                      : textMuted
                  }`}
                >
                  {t.createAccount}
                </button>
              </div>
            )}

            {authError && (
              <div className="p-3 border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMsg && (
              <div className="p-3 border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-mono space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{authSuccessMsg}</span>
                </div>
                {debugResetUrl && (
                  <div className="pt-2 border-t border-emerald-500/20">
                    <a
                      href={debugResetUrl}
                      className="inline-block px-2.5 py-1 bg-emerald-500 text-zinc-950 font-bold text-[11px] uppercase hover:bg-emerald-400 transition-colors"
                    >
                      {t.devResetLink}
                    </a>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {/* Login & Register: Username */}
              {(authMode === 'login' || authMode === 'register') && (
                <div>
                  <label htmlFor="auth-username" className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                    {t.username}
                  </label>
                  <input
                    id="auth-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder={t.usernamePlaceholder}
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono border outline-none ${inputBg}`}
                  />
                </div>
              )}

              {/* Register or Forgot Password: Email */}
              {(authMode === 'register' || authMode === 'forgot') && (
                <div>
                  <label htmlFor="auth-email" className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                    {authMode === 'forgot' ? t.registeredEmail : t.emailRequiredLabel}
                  </label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="user@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono border outline-none ${inputBg}`}
                  />
                </div>
              )}

              {/* Login, Register, or Reset Confirm: Password */}
              {authMode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-password" className={`block font-mono text-[10px] uppercase ${textMuted}`}>
                      {authMode === 'reset_confirm' ? t.newPasswordMin : t.password}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setAuthError(null);
                          setAuthSuccessMsg(null);
                        }}
                        className="text-[10px] font-mono text-emerald-400 hover:underline cursor-pointer"
                      >
                        {t.forgotPassword}
                      </button>
                    )}
                    {authMode === 'register' && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {t.min8}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={authMode === 'login' ? 1 : 8}
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="••••••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className={`w-full pl-3 pr-10 py-2 text-xs font-mono border outline-none ${inputBg}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                      title={showPassword ? t.hidePassword : t.showPassword}
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Reset Confirm: Confirm New Password */}
              {authMode === 'reset_confirm' && (
                <div>
                  <label htmlFor="auth-confirm-password" className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                    {t.confirmNewPassword}
                  </label>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono border outline-none ${inputBg}`}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {authSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.processing}</span>
                  </>
                ) : authMode === 'forgot' ? (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>{t.sendResetLink}</span>
                  </>
                ) : authMode === 'reset_confirm' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{t.saveNewPassword}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{authMode === 'login' ? t.authorizeSignIn : t.registerInit}</span>
                  </>
                )}
              </button>

              {(authMode === 'forgot' || authMode === 'reset_confirm') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`w-full py-2 font-mono text-xs border ${borderCol} hover:opacity-80 cursor-pointer`}
                >
                  {t.backToSignIn}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: ACCOUNT & SECURITY SETTINGS
      ========================================== */}
      {showSettingsModal && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-colors bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className={`w-full max-w-2xl border ${borderCol} ${bgCard} p-3.5 sm:p-6 shadow-2xl h-[88vh] sm:h-[670px] max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b ${borderCol} pb-3.5 shrink-0`}>
              <div className="flex items-center space-x-2.5">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">
                  {t.settingsTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="font-mono text-xs hover:underline cursor-pointer"
              >
                {t.closeBracket}
              </button>
            </div>

            {/* Settings Navigation Tabs */}
            <div className={`flex flex-wrap border-l border-t ${borderCol} text-[10px] sm:text-[11px] font-mono mt-2.5 sm:mt-3.5 shrink-0`}>
              {(
                [
                  ['profile', t.tabProfile],
                  ['themes', t.tabAppearance],
                  ['clearance', t.tabClearance],
                  ['security', t.tabPassword],
                  ['data', t.tabData],
                ] as Array<[SettingsTab, string]>
              ).map(([tab, label]) => {
                const active = tab === 'themes' ? APPEARANCE_TABS.includes(settingsTab) : settingsTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => !active && setSettingsTab(tab)}
                    className={`grow basis-1/3 sm:basis-0 px-1.5 py-2 text-center border-r border-b ${borderCol} whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-950 font-bold'
                          : 'bg-zinc-900 text-white font-bold'
                        : textMuted
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Fixed-Height Scrollable Tab Body (Prevents Modal Height Jumping) */}
            <div className="flex-1 min-h-0 overflow-y-auto mt-2.5 sm:mt-5 pr-1">
              {/* TAB 2: APPEARANCE // SURFACE (900 PAIRS) · TYPE · AMBIENT */}
              {APPEARANCE_TABS.includes(settingsTab) && (
                <div className={`flex flex-col gap-3 sm:gap-4 ${settingsTab === 'themes' ? 'h-full' : ''}`}>
                  <div
                    className={`grid grid-cols-3 border-l border-t ${borderCol} text-[10px] font-mono uppercase tracking-wider shrink-0`}
                    role="tablist"
                    aria-label={t.tabAppearance}
                  >
                    {(
                      [
                        ['themes', t.appearanceSurface, SURFACE_THEME_PAIRS.length],
                        ['fonts', t.appearanceType, UI_FONTS.length],
                        ['ambient', t.appearanceAmbient, AMBIENT_THEMES.length],
                      ] as Array<[SettingsTab, string, number]>
                    ).map(([tab, label, count], idx) => (
                      <button
                        key={tab}
                        type="button"
                        role="tab"
                        aria-selected={settingsTab === tab}
                        onClick={() => setSettingsTab(tab)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-r border-b ${borderCol} transition-colors cursor-pointer ${
                          settingsTab === tab
                            ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                            : `${textMuted} hover:text-emerald-400`
                        }`}
                      >
                        <span className="truncate">
                          <span className="hidden sm:inline opacity-60">02.{idx + 1} </span>
                          {label}
                        </span>
                        <span className="tabular-nums opacity-70">{count}</span>
                      </button>
                    ))}
                  </div>

                  <div className={settingsTab === 'themes' ? 'flex-1 min-h-0' : ''}>
                    {settingsTab === 'themes' && (
                      <SurfaceThemeSelectorPanel
                        activeThemeId={surfaceThemeId}
                        onSelectThemeId={handleSelectSurfaceTheme}
                        isDark={isDark}
                        onTogglePolarity={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                        userClearanceLevel={clearanceStatus.rewardUnlockLevel}
                        userTotalAscensions={clearanceStatus.totalAscensions}
                        userTotalHours={clearanceStatus.totalHours}
                        borderCol={borderCol}
                        textMuted={textMuted}
                        fxEnabled={surfaceFxEnabled}
                        onToggleFx={() => {
                          const next = !surfaceFxEnabled;
                          setSurfaceFxEnabled(next);
                          queueUiPrefsSave({ surface_fx: next });
                        }}
                      />
                    )}

                    {settingsTab === 'fonts' && (
                      <UiFontPicker
                        activeFontId={activeUiFont.id}
                        onSelect={handleSelectUiFont}
                        progress={chronoProgress}
                        borderCol={borderCol}
                        textMuted={textMuted}
                      />
                    )}

                    {settingsTab === 'ambient' && (
                      <AmbientSettingsPanel
                        activeThemeId={activeAmbientTheme.id}
                        onSelect={handleSelectAmbientTheme}
                        onPreview={setAmbientPreviewId}
                        progress={chronoProgress}
                        showClock={ambientClock}
                        onToggleClock={() => {
                          const next = !ambientClock;
                          setAmbientClock(next);
                          queueUiPrefsSave({ ambient_clock: next });
                        }}
                        dim={ambientDim}
                        onChangeDim={setAmbientDim}
                        keepAwakeMode={keepAwakeMode}
                        borderCol={borderCol}
                        textMuted={textMuted}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TELEMETRY CLEARANCE LEVEL (3,000 RANKS // 0H-1,000H PER CYCLE) */}
              {settingsTab === 'clearance' && (
                <ClearanceBrowserPanel
                  clearance={clearanceStatus}
                  isDark={isDark}
                  borderCol={borderCol}
                  textMuted={textMuted}
                  onClaimAscension={claimAscension}
                />
              )}

              {/* TAB 1: PROFILE & AVATAR */}
              {settingsTab === 'profile' && (
                <div className="space-y-5 font-mono text-xs">
                {/* Region: UI Language & Time Zone (account-synced, applied instantly) */}
                <div className={`p-4 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-3.5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.regionTitle}</span>
                    </div>
                    <span className={`text-[10px] ${textMuted}`}>{t.regionAutoSave}</span>
                  </div>

                  {regionStatus && (
                    <div
                      className={`p-2 border text-[11px] flex items-center space-x-2 ${
                        regionStatus.type === 'success'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {regionStatus.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      )}
                      <span>{regionStatus.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="settings-timezone" className={`block text-[10px] uppercase mb-1.5 ${textMuted}`}>
                        {t.timezoneLabel}
                      </label>
                      <select
                        id="settings-timezone"
                        value={timeZone}
                        onChange={(e) => handleUpdateRegion({ timezone: e.target.value })}
                        className={`w-full min-h-[38px] px-2.5 py-2 text-base sm:text-xs border outline-none ${inputBg}`}
                      >
                        {timeZoneOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px]">
                        <span className="text-emerald-400 tabular-nums">
                          {tf(t.timezoneNow, { time: formatDateTime(currentTime) })}
                        </span>
                        {timeZone !== deviceTimeZone && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRegion({ timezone: deviceTimeZone })}
                            className={`${textMuted} hover:text-emerald-400 underline underline-offset-2 cursor-pointer`}
                          >
                            {tf(t.useDeviceTz, { tz: deviceTimeZone })}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className={`block text-[10px] uppercase mb-1.5 ${textMuted}`}>{t.weekStartLabel}</span>
                      <div className={`grid grid-cols-2 border ${borderCol}`} role="radiogroup" aria-label={t.weekStartLabel}>
                        {(['mon', 'sun'] as const).map((opt, idx) => (
                          <button
                            key={opt}
                            type="button"
                            role="radio"
                            aria-checked={weekStart === opt}
                            onClick={() => weekStart !== opt && handleUpdateRegion({ week_start: opt })}
                            className={`min-h-[38px] px-3 py-2 transition-colors cursor-pointer ${
                              idx > 0 ? `border-l ${borderCol}` : ''
                            } ${
                              weekStart === opt
                                ? 'bg-emerald-500 text-zinc-950 font-bold'
                                : `${textMuted} hover:text-emerald-400`
                            }`}
                          >
                            {opt === 'mon' ? t.weekStartMon : t.weekStartSun}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className={`self-end text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.weekStartHint}</p>
                  </div>

                  <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>{t.timezoneHint}</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                {profileStatus && (
                  <div
                    className={`p-3 border flex items-center space-x-2 ${
                      profileStatus.type === 'success'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {profileStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{profileStatus.text}</span>
                  </div>
                )}

                {/* Avatar Preview & Upload Box */}
                <div className={`p-4 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      <AvatarBadge
                        username={profileUsername || user.username}
                        color={profileAvatarColor}
                        preset={profileAvatarPreset}
                        image={profileAvatarImage}
                        size="lg"
                      />
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider">
                          {t.avatarTitle}
                        </div>
                        <p className={`text-[10px] ${textMuted} font-sans`}>
                          {t.avatarBody}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        ref={avatarFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => avatarFileInputRef.current?.click()}
                        className={`px-3 py-1.5 border ${borderCol} hover:border-emerald-500/60 flex items-center space-x-1.5 cursor-pointer`}
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t.uploadImage}</span>
                      </button>
                      {profileAvatarImage && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarImage('')}
                          className={`px-2.5 py-1.5 border ${borderCol} text-rose-400 hover:bg-rose-500/10 cursor-pointer`}
                        >
                          {t.usePreset}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset Icon Selector */}
                  <div>
                    <label className={`block text-[10px] uppercase mb-1.5 ${textMuted}`}>
                      {t.presetIcon} {profileAvatarImage ? t.presetIconHint : ''}
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                      {AVATAR_PRESET_OPTIONS.map((opt) => {
                        const isSelected = !profileAvatarImage && profileAvatarPreset === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setProfileAvatarImage('');
                              setProfileAvatarPreset(opt.id);
                            }}
                            className={`px-2 py-1.5 border text-[10px] flex items-center justify-center space-x-1 transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                                : `${borderCol} ${textMuted} hover:opacity-100`
                            }`}
                          >
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 36 Accent Color Swatches for Avatar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-[10px] uppercase ${textMuted}`}>
                        {t.avatarColor}
                      </label>
                      <span className="text-[10px] text-zinc-400">{profileAvatarColor}</span>
                    </div>
                    <div className="grid grid-cols-9 sm:grid-cols-12 gap-2 pt-0.5">
                      {ACCENT_PALETTE.map((col) => (
                        <button
                          key={`avatar-col-${col.hex}`}
                          type="button"
                          onClick={() => setProfileAvatarColor(col.hex)}
                          title={`${col.name} (${col.hex})`}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            profileAvatarColor === col.hex
                              ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white scale-110'
                              : 'opacity-65 hover:opacity-100 hover:scale-105 border-transparent'
                          }`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Username & Email Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                      {t.accountUsername}
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={30}
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border outline-none ${inputBg}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                      {t.emailForRecovery}
                    </label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                {/* User Status / Learner Profile (multi-select, max MAX_USER_STATUSES) */}
                <div className={`p-4 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-[11px] font-bold uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.statusTitle}</span>
                    </div>
                    <span className={`text-[10px] tabular-nums ${profileStatuses.length > 0 ? 'text-emerald-400' : textMuted}`}>
                      {tf(t.statusCount, { n: profileStatuses.length, max: MAX_USER_STATUSES })}
                    </span>
                  </div>

                  {/* Current selection (in pick order) */}
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[26px]">
                    {profileStatuses.length === 0 ? (
                      <span className={`text-[10px] ${textMuted}`}>{t.statusNone}</span>
                    ) : (
                      <>
                        {profileStatuses.map((id) => (
                          <button
                            key={`sel-${id}`}
                            type="button"
                            onClick={() => toggleProfileStatus(id)}
                            className="px-2 py-1 border border-emerald-500 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold flex items-center space-x-1.5 cursor-pointer hover:bg-emerald-500/25"
                          >
                            <span>{getUserStatusOption(id)?.label ?? id}</span>
                            <span aria-hidden>×</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setProfileStatuses([]);
                            setStatusLimitHit(false);
                          }}
                          className={`px-1.5 py-1 text-[10px] ${textMuted} hover:text-rose-400 underline underline-offset-2 cursor-pointer`}
                        >
                          {t.statusClear}
                        </button>
                      </>
                    )}
                  </div>

                  {statusLimitHit && (
                    <div className="p-2 border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center space-x-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{tf(t.statusMaxReached, { max: MAX_USER_STATUSES })}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="search"
                      value={statusQuery}
                      onChange={(e) => setStatusQuery(e.target.value)}
                      placeholder={tf(t.statusSearch, { n: USER_STATUS_OPTIONS.length })}
                      aria-label={tf(t.statusSearch, { n: USER_STATUS_OPTIONS.length })}
                      className={`flex-1 min-h-[34px] px-2.5 py-1.5 text-base sm:text-xs border outline-none ${inputBg}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenStatusGroups(
                          openStatusGroups.length === USER_STATUS_GROUPS.length ? [] : [...USER_STATUS_GROUPS]
                        )
                      }
                      className={`px-2.5 py-1.5 border ${borderCol} ${textMuted} text-[10px] hover:text-emerald-400 cursor-pointer shrink-0`}
                    >
                      {openStatusGroups.length === USER_STATUS_GROUPS.length ? t.statusCollapseAll : t.statusExpandAll}
                    </button>
                  </div>

                  <div className={`border ${borderCol} divide-y divide-[var(--tb-border)]`}>
                    {(() => {
                      const searching = statusQuery.trim().length > 0;
                      const groups = USER_STATUS_GROUPS.map((group) => ({
                        group,
                        options: USER_STATUS_OPTIONS.filter(
                          (o) => o.group === group && matchesStatusQuery(o, statusQuery)
                        ),
                        picked: profileStatuses.filter((id) => getUserStatusOption(id)?.group === group).length,
                      })).filter((g) => g.options.length > 0);
                      if (groups.length === 0) {
                        return (
                          <div className={`p-3 text-[10px] ${textMuted}`}>{tf(t.statusNoMatch, { q: statusQuery.trim() })}</div>
                        );
                      }
                      return groups.map(({ group, options, picked }) => {
                        // A search shows every matching group expanded.
                        const isOpen = searching || openStatusGroups.includes(group);
                        return (
                          <div key={group}>
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              onClick={() =>
                                setOpenStatusGroups(
                                  openStatusGroups.includes(group)
                                    ? openStatusGroups.filter((g) => g !== group)
                                    : [...openStatusGroups, group]
                                )
                              }
                              className="w-full px-2.5 py-2 flex items-center justify-between text-[10px] uppercase cursor-pointer hover:bg-emerald-500/5"
                            >
                              <span className="flex items-center space-x-1.5">
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform ${isOpen ? '' : '-rotate-90'} ${textMuted}`}
                                />
                                <span className="font-semibold tracking-wider">{t[STATUS_GROUP_LABEL_KEY[group]]}</span>
                                <span className={textMuted}>({options.length})</span>
                              </span>
                              {picked > 0 && (
                                <span className="text-emerald-400 normal-case">{tf(t.statusGroupPicked, { n: picked })}</span>
                              )}
                            </button>
                            {isOpen && (
                              <div className="px-2.5 pb-2.5 flex flex-wrap gap-1.5">
                                {options.map((opt) => {
                                  const selected = profileStatuses.includes(opt.id);
                                  const atLimit = !selected && profileStatuses.length >= MAX_USER_STATUSES;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() => toggleProfileStatus(opt.id)}
                                      className={`px-2 py-1 border text-[10px] transition-colors cursor-pointer ${
                                        selected
                                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold'
                                          : atLimit
                                          ? `${borderCol} ${textMuted} opacity-45`
                                          : `${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50`
                                      }`}
                                    >
                                      {selected ? '✓ ' : ''}
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  <p className={`text-[10px] font-sans leading-relaxed ${textMuted}`}>
                    {tf(t.statusHint, { max: MAX_USER_STATUSES })}
                  </p>
                </div>

                {profileSaveError && (
                  <div className="p-3 border flex items-center space-x-2 border-rose-500/40 bg-rose-500/10 text-rose-300" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{profileSaveError}</span>
                  </div>
                )}
                <SaveButton
                  state={profileSave.state}
                  isDark={isDark}
                  idleLabel={t.saveProfile}
                  savingLabel={t.savingProfile}
                  savedLabel={t.profileSaved}
                  icon={<Save className="w-4 h-4" />}
                />
              </form>
                </div>
            )}

            {/* TAB 2: PASSWORD & SECURITY */}
            {settingsTab === 'security' && (
              <div className="space-y-5 font-mono text-xs">
                {passwordStatus && (
                  <div
                    className={`p-3 border flex items-center space-x-2 ${
                      passwordStatus.type === 'success'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {passwordStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{passwordStatus.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div>
                    <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                      {t.currentPassword}
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border outline-none ${inputBg}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                        {t.newPasswordMin}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={`w-full px-3 py-2 text-xs border outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                        {t.confirmNewPassword}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className={`w-full px-3 py-2 text-xs border outline-none ${inputBg}`}
                      />
                    </div>
                  </div>

                  <SaveButton
                    state={passwordSave.state}
                    isDark={isDark}
                    idleLabel={t.updatePassword}
                    savingLabel={t.updatingPassword}
                    savedLabel={t.passwordUpdated}
                    icon={<KeyRound className="w-4 h-4" />}
                    disabled={passwordSaving}
                  />
                </form>

                {/* Email Recovery Dispatch */}
                <div className={`p-4 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-2.5`}>
                  <div className="flex items-center space-x-2 text-[11px] font-semibold">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.emailRecoveryTitle}</span>
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    {tf(t.emailRecoveryBody, { email: user.email })}
                  </p>
                  <button
                    type="button"
                    disabled={passwordSaving || passwordSave.state === 'saving'}
                    onClick={handleSendResetEmailFromSettings}
                    className={`px-3.5 py-2 border ${borderCol} hover:border-emerald-500/60 text-xs font-semibold cursor-pointer`}
                  >
                    {t.sendResetEmail}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: DATA ARCHIVE & DANGER ZONE */}
            {settingsTab === 'data' && (
              <div className="space-y-5 font-mono text-xs">
                {dataStatus && (
                  <div
                    className={`p-3 border flex items-center space-x-2 ${
                      dataStatus.type === 'success'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {dataStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span>{dataStatus.text}</span>
                  </div>
                )}

                {/* Backup & Restore */}
                <div className={`p-4 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-3`}>
                  <div className="flex items-center space-x-2 font-semibold text-[11px]">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.backupTitle}</span>
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    {t.backupBody}
                  </p>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackupFile}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={importingBackup}
                      onClick={() => backupFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-emerald-500 text-zinc-950 font-semibold flex items-center space-x-1.5 hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{importingBackup ? t.importing : t.importJson}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportJSON}
                      disabled={logs.length === 0}
                      className={`px-3 py-2 border ${borderCol} flex items-center space-x-1.5 cursor-pointer disabled:opacity-40`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.exportJson}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={logs.length === 0}
                      className={`px-3 py-2 border ${borderCol} flex items-center space-x-1.5 cursor-pointer disabled:opacity-40`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.exportCsv}</span>
                    </button>
                  </div>
                </div>

                {/* Reset All Study Logs & Categories (Keep Account) */}
                <div className="p-4 border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    {t.resetLogsTitle}
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    {tf(t.resetLogsBody, { n: logs.length })}{' '}
                    <span className="font-mono font-bold text-amber-400">CLEAR</span> {t.resetLogsBodyTail}
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder={t.typeClear}
                      value={clearLogsConfirmText}
                      onChange={(e) => setClearLogsConfirmText(e.target.value)}
                      className={`flex-1 px-3 py-1.5 text-xs border ${borderCol} outline-none ${inputBg}`}
                    />
                    <button
                      type="button"
                      disabled={clearLogsConfirmText !== 'CLEAR' || clearingLogs || (logs.length === 0 && categories.length === 0)}
                      onClick={handleClearAllLogs}
                      className="px-3.5 py-1.5 bg-amber-500 text-zinc-950 font-bold uppercase disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {clearingLogs ? t.clearing : t.clearLogs}
                    </button>
                  </div>
                </div>

                {/* Danger Zone: Permanent Account Deletion */}
                <div className="p-4 border border-rose-500/40 bg-rose-500/5 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-[11px] uppercase tracking-wider">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.dangerZone}</span>
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    {tf(t.dangerBody, { name: user.username })}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmUsername('');
                      setShowDeleteModal(true);
                    }}
                    className="px-4 py-2 border border-rose-500/60 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors font-bold uppercase cursor-pointer"
                  >
                    {t.proceedDelete}
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: ACCOUNT DELETION CONFIRMATION
      ========================================== */}
      {showDeleteModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md border border-rose-500/50 ${bgCard} p-6 space-y-5 shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-bold">
                  {t.deleteTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="font-mono text-xs hover:underline cursor-pointer"
              >
                {t.cancelBracket}
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-rose-200/90">
                {t.deleteWarnPre} <strong className="text-rose-400 uppercase">{t.deleteWarnStrong}</strong>
                {t.deleteWarnPost}
              </p>

              <div className="p-3 border border-rose-500/20 bg-rose-500/5 font-mono text-xs space-y-2">
                <label className="block text-[11px] text-zinc-400">
                  {t.typeUsernamePre} <span className="text-white font-bold">"{user.username}"</span> {t.typeUsernamePost}
                </label>
                <input
                  type="text"
                  placeholder={user.username}
                  value={deleteConfirmUsername}
                  onChange={(e) => setDeleteConfirmUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-rose-500/40 outline-none bg-black/50 text-rose-200 focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 py-2.5 font-mono text-xs border ${borderCol} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={deleteConfirmUsername !== user.username || deletingAccount}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.deleting}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t.confirmDelete}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 4: TELEMETRY STATUS CARD GENERATOR
      ========================================== */}
      <StatusCardModal
        isOpen={showStatusCardModal}
        onClose={() => setShowStatusCardModal(false)}
        username={user?.username || 'GUEST_OPERATOR'}
        avatarColor={user?.avatar_color || '#10b981'}
        avatarImage={user?.avatar_image || ''}
        clearance={clearanceStatus}
        totalHours={user ? stats.totalHours : '0.0'}
        weeklyHours={user ? stats.weeklyHours : '0.0'}
        monthlyHours={user ? stats.monthlyHours : '0.0'}
        currentStreak={user ? streakStats.currentStreak : 0}
        longestStreak={user ? streakStats.longestStreak : 0}
        categories={user ? categories : []}
        logs={user ? logs : []}
        surfacePair={activeSurfacePair}
        isDark={isDark}
        borderCol={borderCol}
        bgCard={bgCard}
        textMuted={textMuted}
      />

      {/* ==========================================
          MODAL: ASCENSION CELEBRATION (Prestige cycle claimed)
      ========================================== */}
      {showAscensionModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setShowAscensionModal(false)}
        >
          <div
            className={`w-full max-w-md border ${borderCol} ${bgCard} p-6 shadow-2xl text-center space-y-4 font-mono`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-amber-400 text-[10px] uppercase tracking-[0.2em] font-bold">
              {t.ascensionComplete}
            </div>
            <div className="text-2xl font-bold tracking-wider">
              {tf(t.welcomeCycle, { n: String(clearanceStatus.cycleNumber).padStart(2, '0') })}
            </div>
            <div className="flex justify-center">
              <PrestigeChip totalAscensions={clearanceStatus.totalAscensions} />
            </div>
            <p className={`text-xs leading-relaxed ${textMuted}`}>
              {t.ascensionBody}
            </p>
            {clearanceStatus.totalAscensions >= 1 && (
              <div className="text-[11px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                {t.ascensionPrestigeHint}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAscensionModal(false)}
              className="w-full py-2.5 bg-amber-500 text-zinc-950 font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-amber-400"
            >
              {t.continue}
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 5: COMMAND PALETTE (Cmd + K / Ctrl + K)
      ========================================== */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        isDark={isDark}
        borderCol={borderCol}
        bgCard={bgCard}
        textMuted={textMuted}
        isAuthenticated={!!user}
        categories={openCategories}
        selectedCatId={selectedCatId}
        isRunning={isRunning}
        onQuickLog={handleQuickLogFromPalette}
        onToggleTimer={() => setIsRunning((prev) => !prev)}
        onResetTimer={() => {
          setIsRunning(false);
          accumulatedSecondsRef.current = 0;
          setElapsedSeconds(0);
        }}
        onSetInputMode={(mode) => setInputMode(mode)}
        onSetAnalyticsMode={handleSetAnalyticsModeFromPalette}
        onToggleMatrixColorMode={() =>
          setMatrixColorMode((prev) => (prev === 'intensity' ? 'binary' : 'intensity'))
        }
        onToggleMatrixSpan={() =>
          setMatrixSpanMultiplier((prev) => (prev === 1 ? 2 : 1))
        }
        onOpenStatusCard={() => setShowStatusCardModal(true)}
        onOpenClearance={() => {
          if (user) {
            openSettingsModal('clearance');
          } else {
            openAuthModal('login');
          }
        }}
        onOpenSettings={() => {
          if (user) {
            openSettingsModal('profile');
          } else {
            openAuthModal('login');
          }
        }}
        onOpenAuth={() => openAuthModal('login')}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onExportJSON={handleExportJSON}
        onExportCSV={handleExportCSV}
      />

      <ToastStack toasts={toasts} isDark={isDark} onDismiss={dismissToast} />
    </div>
    </I18nContext.Provider>
  );
}