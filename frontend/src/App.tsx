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
  TrendingUp,
  Activity,
  Download,
  Pencil,
  Settings,
  Upload,
  KeyRound,
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
} from 'lucide-react';
import { api, getAccessToken } from './api';
import { TypboxLogo } from './TypboxLogo';
import {
  getClearanceStatus,
  AmbientSoundControl,
  ClearanceBrowserPanel,
  StatusCardModal,
  Award,
} from './telemetryFeatures';

// ==========================================
// Types & Interfaces
// ==========================================

export interface Category {
  id: string | number;
  name: string;
  code: string;
  color: string;
  monthlyTargetHours: number;
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
}

type Theme = 'dark' | 'light';
type PeriodView = 'weekly' | 'monthly';
type AuthModalMode = 'login' | 'register' | 'forgot' | 'reset_confirm';
type SettingsTab = 'profile' | 'clearance' | 'security' | 'data';

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

const DICT = {
  subtitle: 'QUANTIFIED STUDY & ARCHIVE',
  signIn: 'SIGN IN',
  signOut: 'SIGN OUT',
  totalHours: 'TOTAL LOGGED',
  weeklyHours: 'LAST 7 DAYS',
  monthlyHours: 'THIS MONTH',
  activeCategories: 'CATEGORIES',
  recordSession: 'LOG SESSION',
  manualMode: 'MANUAL',
  timerMode: 'STOPWATCH',
  category: 'CATEGORY',
  durationMin: 'DURATION (MIN)',
  date: 'DATE',
  topicMemo: 'TOPIC / LOG NOTE',
  saveLog: 'COMMIT LOG',
  categoriesTitle: 'CATEGORY REGISTRY',
  addCategory: 'NEW CATEGORY',
  catName: 'Category Name',
  catCode: 'Code (Max 4 chars)',
  catTarget: 'Monthly Target (Hrs)',
  create: 'CREATE',
  analyticsTitle: 'ANALYTICS',
  weeklyView: 'WEEKLY (7D)',
  monthlyView: 'MONTHLY (30D)',
  recentLogs: 'CHRONOLOGICAL LOG STREAM',
  noLogs: 'No study logs recorded yet.',
};

// Social Icon Components for Footer
const GithubIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const LinkedinIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.37 9.74V9.93H5.09v8.57h2.74z" />
  </svg>
);

const InstagramIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const SpotifyIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.793-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.722 1.115.294.18.386.562.207.855zm1.226-2.727c-.227.37-.711.487-1.08.26-2.69-1.654-6.79-2.134-9.97-1.168-.415.126-.857-.11-1.002-.524-.127-.416.11-.858.524-1.003 3.633-1.103 8.147-.568 11.267 1.354.37.227.488.712.261 1.081zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.496.15-1.022-.134-1.173-.63-.15-.495.134-1.022.63-1.172 3.535-1.073 9.404-.868 13.115 1.334.446.265.592.845.327 1.291-.265.446-.845.592-1.291.328z" />
  </svg>
);

const socialLinks = [
  {
    name: 'GitHub',
    url: 'https://github.com/rikuto-mikado',
    icon: GithubIcon,
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/in/rikuto-mikado',
    icon: LinkedinIcon,
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/rikuto_jpn/',
    icon: InstagramIcon,
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/user/31ziidnuokqdfrdhwhyug37jxbli?si=4996df09eae84262',
    icon: SpotifyIcon,
  },
];

const ui = {
  footerContact: 'Direct Contact',
  copyright: '© 2026 Rikuto Mikado. All rights reserved.',
};

const formatLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRecentDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatLocalDateString(d);
};

const THEME_STORAGE_KEY = 'typbox_theme';

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

const compressAvatarFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPEG, WebP, GIF).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
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
  const [periodView, setPeriodView] = useState<PeriodView>('weekly');
  const t = DICT;

  // Sync theme with DOM and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

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
    setAuthMode(mode);
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
  const INITIAL_VISIBLE_LOGS = 6;
  const [categories, setCategories] = useState<Category[]>([]);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [visibleLogCount, setVisibleLogCount] = useState<number>(INITIAL_VISIBLE_LOGS);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
    const hh = String(currentTime.getHours()).padStart(2, '0');
    const mm = String(currentTime.getMinutes()).padStart(2, '0');
    const ss = String(currentTime.getSeconds()).padStart(2, '0');
    const yyyy = currentTime.getFullYear();
    const mo = String(currentTime.getMonth() + 1).padStart(2, '0');
    const dd = String(currentTime.getDate()).padStart(2, '0');
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayStr = dayNames[currentTime.getDay()];

    const offsetMin = -currentTime.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const tzH = String(Math.floor(absMin / 60)).padStart(2, '0');
    const tzM = String(absMin % 60).padStart(2, '0');
    const tzLabel = `UTC${sign}${tzH}:${tzM}`;

    return {
      hh,
      mm,
      ss,
      dateDot: `${yyyy}.${mo}.${dd}`,
      dayStr,
      tzLabel,
    };
  }, [currentTime]);

  // User Dropdown, Account Settings Modal & Account Deletion State
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profile');
  const [profileUsername, setProfileUsername] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [profileAvatarColor, setProfileAvatarColor] = useState<string>('#10b981');
  const [profileAvatarPreset, setProfileAvatarPreset] = useState<string>('initial');
  const [profileAvatarImage, setProfileAvatarImage] = useState<string>('');
  const [profileSaving, setProfileSaving] = useState<boolean>(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [passwordSaving, setPasswordSaving] = useState<boolean>(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [clearLogsConfirmText, setClearLogsConfirmText] = useState<string>('');
  const [clearingLogs, setClearingLogs] = useState<boolean>(false);
  const [importingBackup, setImportingBackup] = useState<boolean>(false);
  const [dataStatus, setDataStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showStatusCardModal, setShowStatusCardModal] = useState<boolean>(false);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);
  const backupFileInputRef = React.useRef<HTMLInputElement>(null);

  const openSettingsModal = useCallback(
    (tab: SettingsTab = 'profile') => {
      if (user) {
        setProfileUsername(user.username || '');
        setProfileEmail(user.email || '');
        setProfileAvatarColor(user.avatar_color || '#10b981');
        setProfileAvatarPreset(user.avatar_preset || 'initial');
        setProfileAvatarImage(user.avatar_image || '');
      }
      setProfileStatus(null);
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
  const [logDate, setLogDate] = useState<string>(getRecentDateString(0));
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Log Edit State
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

  // Category Form State (Create & Edit)
  const [showCatForm, setShowCatForm] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatCode, setNewCatCode] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>(ACCENT_PALETTE[0].hex);
  const [newCatTarget, setNewCatTarget] = useState<number>(20);

  // Category Edit State
  const [editingCatId, setEditingCatId] = useState<string | number | null>(null);
  const [editCatName, setEditCatName] = useState<string>('');
  const [editCatCode, setEditCatCode] = useState<string>('');
  const [editCatColor, setEditCatColor] = useState<string>(ACCENT_PALETTE[0].hex);
  const [editCatTarget, setEditCatTarget] = useState<number>(20);

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
        monthlyTargetHours: c.monthly_target_hours,
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
      if (formattedCats.length > 0 && !selectedCatId) {
        setSelectedCatId(formattedCats[0].id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setApiError(error.message || 'Failed to load data from backend');
    } finally {
      setDataLoading(false);
    }
  }, [selectedCatId]);

  // Initial Auth Check and Splash Loader on site access
  useEffect(() => {
    const initAuth = async () => {
      const startTime = Date.now();
      const token = getAccessToken();
      try {
        if (token) {
          const me = await api.auth.getMe();
          setUser(me);
          await loadUserData();
        }
      } catch {
        api.auth.logout();
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
  }, [loadUserData]);

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
        setAuthError('Please enter your registered email address.');
        return;
      }
      setAuthSubmitting(true);
      try {
        const res = await api.auth.requestPasswordReset(authEmail.trim());
        setAuthSuccessMsg(res.detail || 'If an account with that email exists, a reset link has been sent.');
        if (res.debug_reset_url) {
          setDebugResetUrl(res.debug_reset_url);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setAuthError(error.message || 'Failed to send password reset email.');
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    if (authMode === 'reset_confirm') {
      if (authPassword.length < 8) {
        setAuthError('New password must be at least 8 characters.');
        return;
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
      setAuthSubmitting(true);
      try {
        const res = await api.auth.confirmPasswordReset(resetUid, resetToken, authPassword);
        setAuthMode('login');
        setAuthPassword('');
        setAuthConfirmPassword('');
        setAuthSuccessMsg(res.detail || 'Password reset complete! Please sign in with your new password.');
      } catch (err: unknown) {
        const error = err as Error;
        setAuthError(error.message || 'Invalid or expired password reset link.');
      } finally {
        setAuthSubmitting(false);
      }
      return;
    }

    if (authMode === 'register' && (!authEmail || !authEmail.trim())) {
      setAuthError('Email address is required for registration.');
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
      closeAuthModal();
      await loadUserData();
    } catch (err: unknown) {
      const error = err as Error;
      setAuthError(error.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    setProfileStatus(null);
    try {
      const updated = await api.auth.updateProfile({
        username: profileUsername.trim(),
        email: profileEmail.trim(),
        avatar_color: profileAvatarColor,
        avatar_preset: profileAvatarPreset,
        avatar_image: profileAvatarImage,
      });
      setUser(updated);
      setProfileStatus({ type: 'success', text: 'Profile and avatar settings updated successfully.' });
    } catch (err: unknown) {
      const error = err as Error;
      setProfileStatus({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileStatus(null);
    try {
      const compressedDataUrl = await compressAvatarFile(file);
      setProfileAvatarImage(compressedDataUrl);
    } catch (err: unknown) {
      const error = err as Error;
      setProfileStatus({ type: 'error', text: error.message || 'Could not process image.' });
    } finally {
      e.target.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordStatus({ type: 'success', text: 'Password updated successfully.' });
    } catch (err: unknown) {
      const error = err as Error;
      setPasswordStatus({ type: 'error', text: error.message || 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
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
        text: `Password reset email dispatched to ${user.email}.${
          res.debug_reset_url ? ` (Dev URL logged to console)` : ''
        }`,
      });
      if (res.debug_reset_url) {
        console.info('TYPBOX Dev Password Reset Link:', res.debug_reset_url);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setPasswordStatus({ type: 'error', text: error.message || 'Failed to send reset email.' });
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
        throw new Error('Invalid backup JSON file: missing "logs" array.');
      }
      const res = await api.logs.importBackup({
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        logs: parsed.logs,
      });
      await loadUserData();
      setDataStatus({
        type: 'success',
        text: `Imported ${res.imported_logs} log(s) and ${res.created_categories} new category(s).`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setDataStatus({ type: 'error', text: error.message || 'Failed to import JSON backup.' });
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
      setClearLogsConfirmText('');
      setDataStatus({
        type: 'success',
        text: `Cleared ${res.deleted} study log record(s). Categories and account remain intact.`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      setDataStatus({ type: 'error', text: error.message || 'Failed to clear study logs.' });
    } finally {
      setClearingLogs(false);
    }
  };

  const handleSignOut = () => {
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
      alert('Your account and all associated study telemetry data have been permanently deleted.');
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Failed to delete account: ${error.message}`);
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

      setLogs([newLogItem, ...logs]);
      if (inputMode === 'timer') {
        setIsRunning(false);
        setElapsedSeconds(0);
        accumulatedSecondsRef.current = 0;
        timerStartTimestampRef.current = null;
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error saving log: ${error.message}`);
    }
  };

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
      alert(`Failed to update log: ${error.message}`);
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
        monthly_target_hours: Number(newCatTarget) || 10,
      });

      const newCat: Category = {
        id: (created as { id: number | string }).id,
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase().slice(0, 4),
        color: newCatColor,
        monthlyTargetHours: Number(newCatTarget) || 10,
      };

      setCategories([...categories, newCat]);
      setSelectedCatId(newCat.id);
      setNewCatName('');
      setNewCatCode('');
      setShowCatForm(false);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error creating category: ${error.message}`);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatCode(cat.code);
    setEditCatColor(cat.color);
    setEditCatTarget(cat.monthlyTargetHours);
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
    const updatedTarget = Number(editCatTarget) || 10;

    try {
      await api.categories.update(editingCatId, {
        name: updatedName,
        code: updatedCode,
        color: updatedColor,
        monthly_target_hours: updatedTarget,
      });

      setCategories((prev) =>
        prev.map((c) =>
          String(c.id) === String(editingCatId)
            ? {
                ...c,
                name: updatedName,
                code: updatedCode,
                color: updatedColor,
                monthlyTargetHours: updatedTarget,
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
      alert(`Failed to update category: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (id: string | number, name: string) => {
    if (categories.length <= 1) {
      alert('At least one category is required for study logging.');
      return;
    }
    const hasLogs = logs.some((l) => String(l.categoryId) === String(id));
    const confirmMsg = hasLogs
      ? `Delete category "${name}"? Existing logs associated with this category will remain preserved.`
      : `Delete category "${name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.categories.delete(id);
      const remaining = categories.filter((c) => c.id !== id);
      setCategories(remaining);

      if (String(editingCatId) === String(id)) {
        setEditingCatId(null);
      }

      if (String(selectedCatId) === String(id) && remaining.length > 0) {
        setSelectedCatId(remaining[0].id);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Failed to delete category: ${error.message}`);
    }
  };

  const handleDeleteLog = async (id: string | number) => {
    if (!window.confirm('Delete this study log entry?')) return;
    try {
      await api.logs.delete(id);
      setLogs(logs.filter((l) => l.id !== id));
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Failed to delete log: ${error.message}`);
    }
  };

  // ==========================================
  // Computed Analytics & Timeline Navigation
  // ==========================================

  const maxWeeksAgo = useMemo(() => {
    if (logs.length === 0) return 12;
    const now = new Date();
    const oldest = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
    const oldestDate = new Date(oldest + 'T00:00:00');
    const diffDays = Math.max(0, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.max(12, Math.ceil(diffDays / 7));
  }, [logs]);

  const maxMonthsAgo = useMemo(() => {
    if (logs.length === 0) return 4;
    const now = new Date();
    const oldest = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
    const oldestDate = new Date(oldest + 'T00:00:00');
    const diffMonths = (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth());
    return Math.max(4, Math.max(0, diffMonths));
  }, [logs]);

  const currentMonthPrefix = useMemo(() => {
    return formatLocalDateString(new Date()).slice(0, 7); // YYYY-MM in local timezone
  }, []);

  const stats = useMemo(() => {
    const totalMin = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const recent7Days = Array.from({ length: 7 }, (_, i) => getRecentDateString(6 - i));
    const weeklyMin = logs
      .filter((l) => recent7Days.includes(l.date))
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
  }, [logs, currentMonthPrefix]);

  const clearanceStatus = useMemo(() => {
    return getClearanceStatus(user ? stats.totalMin : 0);
  }, [user, stats.totalMin]);

  // Weekly Navigation Data
  const selectedWeeklyDays = useMemo(() => {
    const baseDaysAgo = weeklyOffset * 7;
    return Array.from({ length: 7 }, (_, i) => getRecentDateString(baseDaysAgo + 6 - i));
  }, [weeklyOffset]);

  const weeklyWindowLabel = useMemo(() => {
    if (selectedWeeklyDays.length < 7) return '';
    return `${selectedWeeklyDays[0]} — ${selectedWeeklyDays[6]}`;
  }, [selectedWeeklyDays]);

  const weeklyChartData = useMemo(() => {
    return selectedWeeklyDays.map((dateStr) => {
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const totalDayMin = dayLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      const byCategory = categories.map((cat) => {
        const catMin = dayLogs
          .filter((l) => String(l.categoryId) === String(cat.id))
          .reduce((acc, l) => acc + l.durationMinutes, 0);
        return { category: cat, minutes: catMin };
      });
      return {
        date: dateStr,
        label: dateStr.slice(5),
        totalMinutes: totalDayMin,
        byCategory,
      };
    });
  }, [logs, categories, selectedWeeklyDays]);

  const weeklyPeriodTotalMinutes = useMemo(() => {
    return weeklyChartData.reduce((acc, d) => acc + d.totalMinutes, 0);
  }, [weeklyChartData]);

  const maxScaleMinutes = useMemo(() => {
    const maxDay = Math.max(...weeklyChartData.map((d) => d.totalMinutes), 0);
    return Math.max(240, maxDay);
  }, [weeklyChartData]);

  // Monthly Navigation Data
  const targetMonthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1); // prevent month rollover bug
    d.setMonth(d.getMonth() - monthlyOffset);
    return d;
  }, [monthlyOffset]);

  const targetMonthPrefix = useMemo(() => {
    const y = targetMonthDate.getFullYear();
    const m = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [targetMonthDate]);

  const targetMonthName = useMemo(() => {
    return targetMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [targetMonthDate]);

  const daysInTargetMonth = useMemo(() => {
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const rawDay = new Date(year, month, 1).getDay();
    const startDayOfWeek = (rawDay + 6) % 7; // Monday = 0, Sunday = 6

    const days = Array.from({ length: numDays }, (_, i) => {
      const dayNum = String(i + 1).padStart(2, '0');
      const dateStr = `${targetMonthPrefix}-${dayNum}`;
      const dayMin = logs
        .filter((l) => l.date === dateStr)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      return { date: dateStr, day: i + 1, minutes: dayMin };
    });

    return { days, startDayOfWeek, numDays };
  }, [targetMonthDate, targetMonthPrefix, logs]);

  const monthlyPeriodTotalMinutes = useMemo(() => {
    return daysInTargetMonth.days.reduce((acc, d) => acc + d.minutes, 0);
  }, [daysInTargetMonth]);

  const monthlyBreakdown = useMemo(() => {
    const monthLogs = logs.filter((l) => l.date.startsWith(currentMonthPrefix));
    return categories.map((cat) => {
      const minutes = monthLogs
        .filter((l) => String(l.categoryId) === String(cat.id))
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      const hours = +(minutes / 60).toFixed(1);
      const progress = Math.min(100, Math.round((hours / cat.monthlyTargetHours) * 100));
      return { ...cat, hours, minutes, progress };
    });
  }, [logs, categories, currentMonthPrefix]);

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

    const getMonday = (d: Date) => {
      const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = copy.getDay();
      const diff = (day + 6) % 7; // Monday = 0, Sunday = 6
      copy.setDate(copy.getDate() - diff);
      return copy;
    };

    const today = new Date();
    const todayStr = formatLocalDateString(today);
    const currentMonday = getMonday(today);

    let originMonday = new Date(currentMonday);
    if (logs.length > 0) {
      const oldestStr = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
      const oldestDate = new Date(oldestStr + 'T00:00:00');
      if (!isNaN(oldestDate.getTime())) {
        originMonday = getMonday(oldestDate);
      }
    }

    const weeksElapsed = Math.max(
      0,
      Math.round((currentMonday.getTime() - originMonday.getTime()) / (7 * 24 * 60 * 60 * 1000))
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

    const blockStartMonday = new Date(originMonday);
    blockStartMonday.setDate(blockStartMonday.getDate() + startWeekIndex * 7);

    const weeks: Array<{
      weekIndex: number;
      mondayDate: string;
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
      const weekMonday = new Date(blockStartMonday);
      weekMonday.setDate(weekMonday.getDate() + w * 7);
      const m = weekMonday.getMonth();
      let monthLabel: string | null = null;
      if (m !== lastMonth) {
        if (w === 0 || weekMonday.getDate() <= 7) {
          monthLabel = weekMonday.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          lastMonth = m;
        }
      }

      const days = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(weekMonday);
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
        mondayDate: formatLocalDateString(weekMonday),
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
  }, [logs, baseFitWeeks, matrixSpanMultiplier, matrixPageOffset]);

  // ==========================================
  // Study Insights & Streak Calculations
  // ==========================================

  const streakStats = useMemo(() => {
    if (logs.length === 0) {
      return { currentStreak: 0, longestStreak: 0, activeDaysInLast30: 0, activeDayRatio: 0 };
    }

    const uniqueDates = Array.from(new Set(logs.map((l) => l.date))).sort().reverse();
    const dateSet = new Set(uniqueDates);

    const todayStr = getRecentDateString(0);
    const yesterdayStr = getRecentDateString(1);

    let current = 0;
    const checkDate = new Date();

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

    const last30Days = Array.from({ length: 30 }, (_, i) => getRecentDateString(i));
    const activeDaysInLast30 = last30Days.filter((d) => dateSet.has(d)).length;
    const activeDayRatio = Math.round((activeDaysInLast30 / 30) * 100);

    return {
      currentStreak: current,
      longestStreak: Math.max(longest, current),
      activeDaysInLast30,
      activeDayRatio,
    };
  }, [logs]);

  const habitInsights = useMemo(() => {
    if (logs.length === 0) {
      return { topCategory: null, topCatPct: 0, avgSessionMin: 0, peakDayName: 'N/A' };
    }

    const totalMin = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const avgSessionMin = Math.round(totalMin / logs.length);

    const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
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
  }, [logs, categories]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('No logs available to export.');
      return;
    }
    const headers = ['ID', 'Date', 'Category Code', 'Category Name', 'Duration (Min)', 'Topic', 'Public To Hub', 'Created At'];
    const rows = logs.map((l) => [
      l.id,
      l.date,
      `"${l.categoryCode || ''}"`,
      `"${l.categoryName || ''}"`,
      l.durationMinutes,
      `"${(l.topic || '').replace(/"/g, '""')}"`,
      l.isPublicToHub ? 'TRUE' : 'FALSE',
      l.createdAt,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `typbox_telemetry_${formatLocalDateString(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (logs.length === 0) {
      alert('No logs available to export.');
      return;
    }
    const exportData = {
      user: user?.username || 'anonymous',
      exportedAt: new Date().toISOString(),
      categories,
      logs,
    };
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `typbox_telemetry_${formatLocalDateString(new Date())}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Timeline Navigation Derived State & Handlers
  const isWeekly = periodView === 'weekly';
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

  // Theme Classes
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#0a0a0a] text-zinc-100' : 'bg-[#fafafa] text-zinc-900';
  const bgCard = isDark ? 'bg-[#111111]' : 'bg-white';
  const borderCol = isDark ? 'border-zinc-800' : 'border-zinc-200';
  const textMuted = isDark ? 'text-zinc-500' : 'text-zinc-500';
  const inputBg = isDark
    ? 'bg-[#0a0a0a] border-zinc-800 text-zinc-100 focus:border-zinc-400'
    : 'bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-800';

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${bgMain}`}>
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
              BOOTING ENVIRONMENT...
            </span>
          </div>
        </div>
      )}

      {/* ==========================================
          TOP NAVIGATION BAR
      ========================================== */}
      <header className={`sticky top-0 z-30 border-b ${borderCol} ${bgMain}/90 backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <TypboxLogo className="w-5 h-5" isDark={isDark} isRunning={isRunning} />
              <span className="font-mono text-lg font-bold tracking-tighter">TYPBOX</span>
              <span className={`font-mono text-xs px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                .me
              </span>
            </div>
            <span className={`hidden md:inline-block font-mono text-[11px] tracking-widest ${textMuted}`}>
              // {t.subtitle}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Status Card Snapshot / Share Button */}
            <button
              type="button"
              onClick={() => setShowStatusCardModal(true)}
              className={`px-2.5 py-2 border ${borderCol} hover:border-emerald-500/60 transition-colors flex items-center space-x-1.5 font-mono text-[11px] cursor-pointer`}
              aria-label="Generate Telemetry Status Card"
              title="Generate & Share Status Card Image"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline font-semibold">CARD</span>
            </button>

            {/* Ambient Focus Sound / White Noise Generator (Left of Theme Toggle) */}
            <AmbientSoundControl
              isDark={isDark}
              borderCol={borderCol}
              bgCard={bgCard}
              textMuted={textMuted}
            />

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className={`p-2 border ${borderCol} hover:opacity-80 cursor-pointer`}
              aria-label="Toggle Theme"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth Action Button */}
            {authLoading ? (
              <div className={`p-2 border ${borderCol}`}>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              </div>
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                {/* User Avatar Button */}
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center space-x-2 px-2 py-1.5 sm:px-3 border ${borderCol} ${bgCard} hover:border-zinc-400 transition-colors cursor-pointer select-none`}
                  aria-label="User Account Menu"
                >
                  <AvatarBadge
                    username={user.username}
                    color={user.avatar_color}
                    preset={user.avatar_preset}
                    image={user.avatar_image}
                    size="sm"
                  />
                  <span className="hidden sm:inline font-mono text-xs font-semibold">{user.username}</span>
                  <span
                    className="hidden lg:inline-block px-1.5 py-0.2 font-mono text-[10px] font-bold text-zinc-950"
                    style={{ backgroundColor: clearanceStatus.current.color }}
                  >
                    LV.{String(clearanceStatus.current.level).padStart(3, '0')}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div
                    className={`absolute right-0 top-full mt-2 w-68 border ${borderCol} ${bgCard} shadow-2xl z-50 py-1 font-mono text-xs divide-y ${
                      isDark ? 'divide-zinc-800' : 'divide-zinc-200'
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
                            <span>ACTIVE ACCOUNT</span>
                          </div>
                          <div className="font-bold text-sm truncate">{user.username}</div>
                          <div className={`text-[11px] truncate ${textMuted}`}>
                            {user.email || 'No email registered'}
                          </div>
                        </div>
                      </div>
                      {/* Clearance Badge inside Dropdown */}
                      <div className={`pt-2 border-t ${borderCol} flex items-center justify-between text-[10px]`}>
                        <span
                          className="px-1.5 py-0.5 font-bold text-zinc-950"
                          style={{ backgroundColor: clearanceStatus.current.color }}
                        >
                          LV.{String(clearanceStatus.current.level).padStart(3, '0')}
                        </span>
                        <span className="font-bold truncate ml-2 flex-1">
                          {clearanceStatus.current.title}
                        </span>
                        <span className={textMuted}>{clearanceStatus.progressPct}%</span>
                      </div>
                    </div>

                    {/* Clearance & Share Actions */}
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => openSettingsModal('clearance')}
                        className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>CLEARANCE RANKS (500)</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>
                          LV.{String(clearanceStatus.current.level).padStart(3, '0')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowStatusCardModal(true);
                        }}
                        className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>SHARE STATUS CARD</span>
                        </span>
                        <span className={`text-[10px] ${textMuted}`}>PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openSettingsModal('profile')}
                        className="w-full px-4 py-2 text-left flex items-center justify-between hover:bg-zinc-500/10 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center space-x-2.5">
                          <Settings className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ACCOUNT SETTINGS</span>
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
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-mono font-semibold border transition-colors cursor-pointer ${
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* GUEST BANNER (Rendered only when not authenticated) */}
        {!user && !authLoading && (
          <section className={`border ${borderCol} ${bgCard} p-6 sm:p-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 text-[11px] font-mono border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PUBLIC GUEST MODE // STANDBY</span>
              </div>
              <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight">
                Quantified Study &amp; Archive
              </h1>
              <p className={`text-sm leading-relaxed ${textMuted}`}>
                TYPBOX is a minimal workspace to log study sessions, track time across categories, and archive your daily learning progress.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className={`px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider flex items-center space-x-2 cursor-pointer ${
                    isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>SIGN IN TO START TRACKING</span>
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className={`px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider border ${borderCol} hover:border-emerald-500/60 transition-colors cursor-pointer`}
                >
                  <span>CREATE ACCOUNT</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* API Error Notification */}
        {apiError && (
          <div className="p-4 border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{apiError} (Ensure Django backend is running at http://localhost:8000)</span>
            </div>
            <button
              onClick={loadUserData}
              className="px-2.5 py-1 border border-rose-500/40 hover:bg-rose-500/20 text-xs"
            >
              RETRY
            </button>
          </div>
        )}

        {/* 1. TOP METRICS STRIP + TELEMETRY CLEARANCE BAR */}
        <section className="space-y-0">
          <div className={`grid grid-cols-2 lg:grid-cols-4 border-t border-l ${borderCol}`}>
            <div className={`p-5 border-r border-b ${borderCol} ${bgCard}`}>
              <div className={`font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
                01 / {t.totalHours}
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="font-mono text-3xl sm:text-4xl font-light tracking-tight">
                  {user ? stats.totalHours : '0.0'}
                </span>
                <span className={`font-mono text-xs ${textMuted}`}>HRS</span>
              </div>
            </div>

            <div className={`p-5 border-r border-b ${borderCol} ${bgCard}`}>
              <div className={`font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
                02 / {t.weeklyHours}
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="font-mono text-3xl sm:text-4xl font-light tracking-tight">
                  {user ? stats.weeklyHours : '0.0'}
                </span>
                <span className={`font-mono text-xs ${textMuted}`}>HRS / 7D</span>
              </div>
            </div>

            <div className={`p-5 border-r border-b ${borderCol} ${bgCard}`}>
              <div className={`font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
                03 / {t.monthlyHours}
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="font-mono text-3xl sm:text-4xl font-light tracking-tight">
                  {user ? stats.monthlyHours : '0.0'}
                </span>
                <span className={`font-mono text-xs ${textMuted}`}>HRS ({currentMonthPrefix})</span>
              </div>
            </div>

            <div className={`p-5 border-r border-b ${borderCol} ${bgCard} flex flex-col justify-between`}>
              <div className={`font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
                04 / {t.activeCategories}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2 min-w-0">
                <div className="flex items-baseline space-x-2 shrink-0">
                  <span className="font-mono text-3xl sm:text-4xl font-light tracking-tight">
                    {user ? categories.length : '0'}
                  </span>
                  <span className={`font-mono text-xs ${textMuted}`}>UNITS</span>
                </div>
                {user && categories.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-1 max-w-[96px] sm:max-w-[148px]">
                    {categories.slice(0, 12).map((c) => (
                      <span
                        key={c.id}
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                        title={`[${c.code}] ${c.name}`}
                      />
                    ))}
                    {categories.length > 12 && (
                      <span
                        className={`font-mono text-[9px] leading-none px-1 py-0.5 border ${borderCol} ${textMuted} shrink-0`}
                        title={categories
                          .slice(12)
                          .map((c) => `[${c.code}] ${c.name}`)
                          .join(', ')}
                      >
                        +{categories.length - 12}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TELEMETRY CLEARANCE LEVEL BAR (500 RANKS // 0H TO 10,000H) */}
          <div className={`border-x border-b ${borderCol} ${bgCard} px-5 py-3.5 font-mono text-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3`}>
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="flex items-center space-x-2 shrink-0">
                <span className={`text-[10px] uppercase tracking-widest ${textMuted}`}>
                  CLEARANCE
                </span>
                <span
                  className="px-2 py-0.5 text-xs font-bold text-zinc-950"
                  style={{ backgroundColor: clearanceStatus.current.color }}
                >
                  LV.{String(clearanceStatus.current.level).padStart(3, '0')}
                </span>
              </div>

              <div className="flex items-center space-x-2 min-w-0">
                <span className="font-bold tracking-wider truncate">
                  {clearanceStatus.current.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 border ${borderCol} ${textMuted} shrink-0`}>
                  {clearanceStatus.current.division}
                </span>
                <span className={`hidden sm:inline text-[11px] font-mono ${textMuted} truncate`}>
                  // {clearanceStatus.current.subtitle}
                </span>
              </div>
            </div>

            {/* Progress Bar & Sub-Phases */}
            <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 flex-1 max-w-2xl">
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
                        title={`Sub-Phase ${pip}/5`}
                      />
                    ))}
                    <span className="ml-1 text-emerald-400 font-bold">
                      PHASE {clearanceStatus.subPhase}/5
                    </span>
                  </div>
                  <span className={textMuted}>
                    {clearanceStatus.next
                      ? `NEXT: LV.${String(clearanceStatus.next.level).padStart(3, '0')} IN ${clearanceStatus.hoursRemainingToNext}H (${clearanceStatus.progressPct}%)`
                      : 'OMEGA MONOLITH (10,000H+)'}
                  </span>
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

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      openSettingsModal('clearance');
                    } else {
                      openAuthModal('login');
                    }
                  }}
                  className={`px-2.5 py-1.5 border ${borderCol} hover:border-emerald-500/60 text-[10px] font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors`}
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>500 RANKS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusCardModal(true)}
                  className={`px-2.5 py-1.5 border ${borderCol} hover:border-emerald-500/60 text-[10px] font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors`}
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SHARE CARD</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. MAIN WORKSPACE */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: Chronometer, Recording & Category Creation */}
          <div className="contents lg:block lg:col-span-5 lg:space-y-8">
            {/* SYSTEM CHRONOMETER (DIGITAL CLOCK PANEL) */}
            <div className={`border ${borderCol} ${bgCard} p-5 relative overflow-hidden order-1 lg:order-none`}>
              <div
                className={`flex items-center justify-between pb-3 mb-3.5 border-b ${
                  isDark ? 'border-zinc-800/60' : 'border-zinc-200'
                } font-mono text-[10px] tracking-widest uppercase`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <span className="font-semibold">SYSTEM CHRONOMETER</span>
                </div>
                <div className="flex items-center space-x-2">
                  {isRunning ? (
                    <span className="px-1.5 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold">
                      REC // ACTIVE
                    </span>
                  ) : (
                    <span className={textMuted}>SYNC // {clockReadout.tzLabel}</span>
                  )}
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <div className="font-mono tracking-tight flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-light tabular-nums">
                    {clockReadout.hh}:{clockReadout.mm}
                  </span>
                  <span className="text-lg sm:text-xl font-mono text-emerald-500 ml-1 tabular-nums font-medium">
                    :{clockReadout.ss}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs sm:text-sm font-semibold tracking-wider tabular-nums">
                    {clockReadout.dateDot}
                  </div>
                  <div className={`text-[10px] uppercase tracking-widest ${textMuted}`}>
                    {clockReadout.dayStr} // {clockReadout.tzLabel}
                  </div>
                </div>
              </div>
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
                      AUTHENTICATION REQUIRED
                    </h3>
                    <p className={`text-xs mt-1 max-w-[260px] ${textMuted}`}>
                      Sign in to your account to record study sessions and commit telemetry.
                    </p>
                  </div>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="px-4 py-2 font-mono text-xs font-semibold bg-emerald-500 text-zinc-950 uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    SIGN IN NOW
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
                <div className={`flex border ${borderCol} text-[11px] font-mono`}>
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`px-2.5 py-1 ${
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
                    className={`px-2.5 py-1 ${
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
                          className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>START</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsRunning(false)}
                          className="flex items-center space-x-1.5 px-4 py-1.5 bg-amber-500 text-zinc-950 font-mono text-xs font-semibold cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>PAUSE</span>
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
                        className={`px-3 py-1.5 border ${borderCol} font-mono text-xs ${textMuted} cursor-pointer`}
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className={`block font-mono text-[11px] uppercase mb-1.5 ${textMuted}`}>
                    {t.category}
                  </label>
                  {categories.length === 0 ? (
                    <div className={`p-2.5 text-xs font-mono border ${borderCol} ${textMuted}`}>
                      No categories registered yet.
                    </div>
                  ) : (
                    <select
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(e.target.value)}
                      className={`w-full px-3 py-2 text-sm font-mono border outline-none ${inputBg}`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.code}] {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Duration & Date */}
                <div className="grid grid-cols-2 gap-4">
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
                        className={`w-full px-3 py-2 text-sm font-mono border outline-none ${inputBg}`}
                      />
                    </div>
                  )}
                  <div className={inputMode === 'timer' ? 'col-span-2' : ''}>
                    <label className={`block font-mono text-[11px] uppercase mb-1.5 ${textMuted}`}>
                      {t.date}
                    </label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className={`w-full px-3 py-2 text-sm font-mono border outline-none ${inputBg}`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={categories.length === 0}
                  className={`w-full py-2.5 px-4 font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer ${
                    isDark
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.saveLog}</span>
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
                    Sign in to configure categories
                  </p>
                </div>
              )}

              <div className={`flex items-center justify-between pb-4 mb-5 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <FolderPlus className="w-4 h-4" />
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
                  className={`px-2.5 py-1 text-[11px] font-mono border ${borderCol} hover:opacity-80 cursor-pointer`}
                >
                  {showCatForm ? 'CLOSE' : `+ ${t.addCategory}`}
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
                      placeholder="e.g., Mathematics & Physics"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs border outline-none ${inputBg}`}
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
                        className={`w-full px-2.5 py-1.5 text-xs font-mono uppercase border outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                        {t.catTarget}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={newCatTarget}
                        onChange={(e) => setNewCatTarget(Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 text-xs font-mono border outline-none ${inputBg}`}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block font-mono text-[10px] uppercase ${textMuted}`}>
                        Indicator Accent
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
                          aria-label={`Select ${col.name} color`}
                          className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
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
                    className={`w-full py-2 font-mono text-xs uppercase font-semibold cursor-pointer ${
                      isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                    }`}
                  >
                    {t.create}
                  </button>
                </form>
              )}

              {/* Category List */}
              <div className="space-y-3">
                {categories.length === 0 ? (
                  <div className={`py-6 text-center font-mono text-xs ${textMuted}`}>
                    No categories configured yet.
                  </div>
                ) : (
                  monthlyBreakdown.map((cat) => {
                    const isEditing = String(editingCatId) === String(cat.id);
                    return (
                      <div
                        key={cat.id}
                        className="group space-y-2 p-2 -mx-2 rounded transition-colors hover:bg-zinc-500/5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-mono font-semibold text-[11px] shrink-0">
                              [{cat.code}]
                            </span>
                            <span className="truncate max-w-[115px] sm:max-w-[155px] font-medium" title={cat.name}>
                              {cat.name}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                            <span className="font-mono text-[11px] mr-0.5">
                              {cat.hours}h <span className={textMuted}>/ {cat.monthlyTargetHours}h</span>
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                isEditing ? handleCancelEditCategory() : handleStartEditCategory(cat)
                              }
                              className={`p-1 border transition-all cursor-pointer ${
                                isEditing
                                  ? 'border-emerald-500/60 text-emerald-400 opacity-100'
                                  : `${borderCol} ${textMuted} opacity-40 group-hover:opacity-100 hover:text-emerald-400 hover:border-emerald-500/50`
                              }`}
                              title={isEditing ? 'Close editor' : `Edit category [${cat.code}]`}
                              aria-label={`Edit category ${cat.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              disabled={categories.length <= 1}
                              className={`p-1 border ${borderCol} ${textMuted} transition-all ${
                                categories.length <= 1
                                  ? 'opacity-20 cursor-not-allowed'
                                  : 'opacity-40 group-hover:opacity-100 hover:text-rose-500 hover:border-rose-500/50 cursor-pointer'
                              }`}
                              title={
                                categories.length <= 1
                                  ? 'At least one category is required'
                                  : `Delete category [${cat.code}]`
                              }
                              aria-label={`Delete category ${cat.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${cat.progress}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>

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
                                EDIT CATEGORY // [{cat.code}]
                              </span>
                              <button
                                type="button"
                                onClick={handleCancelEditCategory}
                                className={`font-mono text-[10px] uppercase ${textMuted} hover:underline cursor-pointer`}
                              >
                                [CANCEL]
                              </button>
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
                                className={`w-full px-2.5 py-1.5 text-xs border outline-none ${inputBg}`}
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
                                  className={`w-full px-2.5 py-1.5 text-xs font-mono uppercase border outline-none ${inputBg}`}
                                />
                              </div>
                              <div>
                                <label className={`block font-mono text-[10px] uppercase mb-1 ${textMuted}`}>
                                  {t.catTarget}
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={editCatTarget}
                                  onChange={(e) => setEditCatTarget(Number(e.target.value))}
                                  className={`w-full px-2.5 py-1.5 text-xs font-mono border outline-none ${inputBg}`}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className={`block font-mono text-[10px] uppercase ${textMuted}`}>
                                  Indicator Accent
                                </label>
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {ACCENT_PALETTE.find((c) => c.hex === editCatColor)?.name || 'Custom'} ({editCatColor})
                                </span>
                              </div>
                              <div className="grid grid-cols-6 gap-2.5 pt-0.5">
                                {ACCENT_PALETTE.map((col) => (
                                  <button
                                    key={col.hex}
                                    type="button"
                                    onClick={() => setEditCatColor(col.hex)}
                                    title={`${col.name} (${col.hex})`}
                                    aria-label={`Select ${col.name} color`}
                                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
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
                                className={`flex-1 py-1.5 font-mono text-xs uppercase border ${borderCol} hover:opacity-80 cursor-pointer`}
                              >
                                CANCEL
                              </button>
                              <button
                                type="submit"
                                className={`flex-1 py-1.5 font-mono text-xs uppercase font-semibold cursor-pointer ${
                                  isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                }`}
                              >
                                SAVE CHANGES
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* STUDY INSIGHTS & TELEMETRY VAULT PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-6 space-y-5 relative order-5 lg:order-none`}>
              {!user && (
                <div className={`absolute inset-0 z-20 backdrop-blur-[2px] ${isDark ? 'bg-black/60 text-zinc-100' : 'bg-white/80 text-zinc-900'} flex flex-col items-center justify-center p-6 text-center space-y-2`}>
                  <Lock className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <p className="font-mono text-xs uppercase tracking-wider font-semibold">
                    Sign in to view telemetry insights &amp; vault
                  </p>
                </div>
              )}

              {/* Panel Header */}
              <div className={`flex items-center justify-between pb-3.5 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <Activity className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    STUDY INSIGHTS &amp; VAULT
                  </h2>
                </div>
                <span className={`font-mono text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'} flex items-center space-x-1`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE ARCHIVE</span>
                </span>
              </div>

              {/* Section 1: Streak & Consistency */}
              <div className="space-y-2.5">
                <div className={`font-mono text-[10px] uppercase tracking-wider ${textMuted} flex items-center space-x-1.5`}>
                  <Flame className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span>STREAK &amp; CONSISTENCY</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className={`p-3 border ${borderCol} ${isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'}`}>
                    <span className={`block font-mono text-[10px] ${textMuted}`}>CURRENT STREAK</span>
                    <div className="mt-1 flex items-baseline space-x-1.5">
                      <span className={`font-mono text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {streakStats.currentStreak}
                      </span>
                      <span className={`font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>DAYS</span>
                    </div>
                  </div>
                  <div className={`p-3 border ${borderCol} ${isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'}`}>
                    <span className={`block font-mono text-[10px] ${textMuted}`}>ALL-TIME RECORD</span>
                    <div className="mt-1 flex items-baseline space-x-1.5">
                      <span className={`font-mono text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {streakStats.longestStreak}
                      </span>
                      <span className={`font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>DAYS</span>
                    </div>
                  </div>
                </div>

                {/* Consistency Bar */}
                <div className={`p-3 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-1.5 font-mono text-xs`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={textMuted}>30-DAY ACTIVE RATIO:</span>
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      {streakStats.activeDaysInLast30} / 30 DAYS ({streakStats.activeDayRatio}%)
                    </span>
                  </div>
                  <div className={`w-full h-1.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} overflow-hidden`}>
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${streakStats.activeDayRatio}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Habit Patterns & Focus Velocity */}
              <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${textMuted} flex items-center space-x-1.5`}>
                  <TrendingUp className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span>HABIT PATTERNS</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className={`p-3 border ${borderCol} ${isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'}`}>
                    <span className={`block font-mono text-[10px] ${textMuted}`}>PEAK PRODUCTIVE DAY</span>
                    <div className={`mt-1 font-mono text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {habitInsights.peakDayName}
                    </div>
                  </div>
                  <div className={`p-3 border ${borderCol} ${isDark ? 'bg-zinc-900/40' : 'bg-zinc-50'}`}>
                    <span className={`block font-mono text-[10px] ${textMuted}`}>AVG SESSION LENGTH</span>
                    <div className="mt-1 flex items-baseline space-x-1 font-mono">
                      <span className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {habitInsights.avgSessionMin}
                      </span>
                      <span className={`text-[10px] ${textMuted}`}>MIN</span>
                    </div>
                  </div>
                </div>

                {habitInsights.topCategory && (
                  <div className={`p-3 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} flex items-center justify-between font-mono text-xs`}>
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: habitInsights.topCategory.color }}
                      />
                      <span className={textMuted}>PRIMARY FOCUS:</span>
                      <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        [{habitInsights.topCategory.code}] {habitInsights.topCategory.name}
                      </span>
                    </div>
                    <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{habitInsights.topCatPct}%</span>
                  </div>
                )}
              </div>

              {/* Section 3: Data Vault & Export Actions */}
              <div className={`space-y-2.5 pt-2 border-t ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${textMuted} flex items-center space-x-1.5`}>
                  <Download className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                  <span>DATA VAULT &amp; EXPORT</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={logs.length === 0}
                    className={`p-2.5 border ${borderCol} ${isDark ? 'hover:bg-zinc-800/40 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'} transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    title="Export study telemetry logs to CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORT CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    disabled={logs.length === 0}
                    className={`p-2.5 border ${borderCol} ${isDark ? 'hover:bg-zinc-800/40 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'} transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
                    title="Export full telemetry archive as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORT JSON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Analytics & Chronological Stream */}
          <div className="contents lg:block lg:col-span-7 lg:space-y-8">
            {/* ANALYTICS MODULE */}
            <div className={`border ${borderCol} ${bgCard} p-6 order-4 lg:order-none`}>
              <div className={`flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.analyticsTitle}
                  </h2>
                </div>

                <div className={`flex border ${borderCol} text-[11px] font-mono`}>
                  <button
                    type="button"
                    onClick={() => setPeriodView('weekly')}
                    className={`px-3 py-1 flex items-center space-x-1.5 cursor-pointer ${
                      periodView === 'weekly'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>{t.weeklyView}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodView('monthly')}
                    className={`px-3 py-1 flex items-center space-x-1.5 cursor-pointer ${
                      periodView === 'monthly'
                        ? isDark
                          ? 'bg-zinc-100 text-zinc-900 font-semibold'
                          : 'bg-zinc-900 text-white font-semibold'
                        : textMuted
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{t.monthlyView}</span>
                  </button>
                </div>
              </div>

              {/* View A: Weekly Chart */}
              {periodView === 'weekly' ? (
                <div className="space-y-4">
                  {/* Active Window Info Banner */}
                  <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 border-b ${isDark ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                    <div className="flex items-center space-x-2">
                      <span className={textMuted}>WINDOW:</span>
                      <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{weeklyWindowLabel}</span>
                      {weeklyOffset === 0 ? (
                        <span className="px-1.5 py-0.5 text-[10px] border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold">
                          CURRENT WEEK
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] border border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                          {weeklyOffset} WEEKS AGO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={textMuted}>7D TOTAL:</span>
                      <span className="font-semibold text-emerald-400">
                        {(weeklyPeriodTotalMinutes / 60).toFixed(1)}h
                      </span>
                    </div>
                  </div>

                  {/* 7-Day Stacked Bar Chart */}
                  <div className={`h-52 flex items-end justify-between gap-3 pt-6 px-2 border-b ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
                    {weeklyChartData.map((day) => {
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center h-full justify-end group"
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
                                    backgroundColor: seg.category.color,
                                  }}
                                  className="w-full transition-all duration-300 opacity-90 group-hover:opacity-100"
                                  title={`${seg.category.name}: ${seg.minutes} min (${(seg.minutes / 60).toFixed(1)}h)`}
                                />
                              );
                            })}
                          </div>

                          <span className="font-mono text-[11px] mt-2.5">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Category Legend */}
                  <div className="flex flex-wrap gap-4 pt-2">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-1.5 text-xs font-mono">
                        <span
                          className="w-2.5 h-2.5 inline-block"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className={textMuted}>{cat.code}:</span>
                        <span>{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* View B: Monthly Activity Matrix */
                <div className="space-y-6">
                  <div>
                    {/* Active Month Info Banner */}
                    <div className={`flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 mb-3 border-b ${isDark ? 'border-zinc-800/40' : 'border-zinc-200'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={textMuted}>MONTH:</span>
                        <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{targetMonthName}</span>
                        {monthlyOffset === 0 ? (
                          <span className="px-1.5 py-0.5 text-[10px] border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold">
                            CURRENT MONTH
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] border border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                            {monthlyOffset} MONTHS AGO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={textMuted}>MONTH TOTAL:</span>
                        <span className="font-semibold text-emerald-400">
                          {(monthlyPeriodTotalMinutes / 60).toFixed(1)}h
                        </span>
                      </div>
                    </div>

                    {/* Weekday Labels (Mon to Sun) */}
                    <div className="grid grid-cols-7 gap-1.5 mb-2 text-center font-mono text-[10px] text-zinc-500">
                      <span>MON</span>
                      <span>TUE</span>
                      <span>WED</span>
                      <span>THU</span>
                      <span>FRI</span>
                      <span>SAT</span>
                      <span>SUN</span>
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
                            className={`p-2 border font-mono text-[10px] flex flex-col justify-between h-12 transition-colors ${intensity}`}
                            title={`${cell.date}: ${cell.minutes} min (${(cell.minutes / 60).toFixed(1)}h)`}
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
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-semibold tracking-wider uppercase text-[11px] shrink-0">
                      TIMELINE SCRUBBER
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
                          ? 'CURRENT 7D'
                          : `-${weeklyOffset} WEEKS`
                        : monthlyOffset === 0
                        ? 'CURRENT MONTH'
                        : `-${monthlyOffset} MONTHS`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={isAtOldest}
                      className={`px-2.5 py-1 border text-[11px] flex items-center space-x-1 transition-colors ${
                        isAtOldest
                          ? 'opacity-30 cursor-not-allowed border-zinc-800/40'
                          : `${borderCol} hover:border-zinc-400 ${isDark ? 'hover:bg-zinc-800/40 text-zinc-200' : 'hover:bg-zinc-100 text-black'} cursor-pointer`
                      }`}
                      title={isWeekly ? 'Rewind 1 week into past' : 'Rewind 1 month into past'}
                    >
                      <ChevronLeft className="w-3 h-3" />
                      <span>{isWeekly ? '-1 WEEK' : '-1 MONTH'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isAtPresent}
                      className={`px-2.5 py-1 border text-[11px] flex items-center space-x-1 transition-colors ${
                        isAtPresent
                          ? 'opacity-30 cursor-not-allowed border-zinc-800/40'
                          : `${borderCol} hover:border-zinc-400 ${isDark ? 'hover:bg-zinc-800/40 text-zinc-200' : 'hover:bg-zinc-100 text-black'} cursor-pointer`
                      }`}
                      title={isWeekly ? 'Advance 1 week forward' : 'Advance 1 month forward'}
                    >
                      <span>{isWeekly ? '+1 WEEK' : '+1 MONTH'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetToPresent}
                      disabled={isAtPresent}
                      className={`px-2.5 py-1 border text-[11px] font-semibold flex items-center space-x-1 transition-colors ${
                        isAtPresent
                          ? 'opacity-30 cursor-not-allowed border-zinc-800/40'
                          : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 cursor-pointer'
                      }`}
                      title="Reset to Present / Today"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>PRESENT</span>
                    </button>
                  </div>
                </div>

                {/* Range Slider Track */}
                <div className="space-y-1.5 pt-1">
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={maxRange}
                      step={1}
                      value={currentSliderVal}
                      onChange={handleSliderChange}
                      className="w-full h-2 bg-zinc-800 rounded-none appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
                      aria-label="Timeline navigation slider"
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono select-none">
                    <span className={textMuted}>
                      ◀ PAST ({isWeekly ? `-${maxWeeksAgo} WEEKS` : `-${maxMonthsAgo} MONTHS`})
                    </span>
                    <span className="text-zinc-500 hidden sm:inline">
                      ◀ DRAG LEFT TO REWIND TIMELINE ▶
                    </span>
                    <span className={isAtPresent ? 'text-emerald-400 font-semibold' : textMuted}>
                      TODAY (PRESENT) ▶
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
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    TELEMETRY CADENCE MATRIX
                  </h2>
                  <span
                    className={`px-1.5 py-0.5 font-mono text-[10px] border ${
                      isDark
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                        : 'border-emerald-600/40 text-emerald-700 bg-emerald-500/10'
                    }`}
                  >
                    EPOCH {cadenceMatrixData.targetEpochIndex} / {cadenceMatrixData.totalEpochs}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  {/* Color Mode Toggle: INTENSITY (Shaded) vs BINARY (Single Signal) */}
                  <div className={`flex border ${borderCol}`}>
                    <button
                      type="button"
                      onClick={() => setMatrixColorMode('intensity')}
                      className={`px-2.5 py-1 cursor-pointer transition-colors ${
                        matrixColorMode === 'intensity'
                          ? isDark
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'bg-zinc-900 text-white font-semibold'
                          : textMuted
                      }`}
                      title="4-tier study duration shade mode"
                    >
                      SHADED
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixColorMode('binary')}
                      className={`px-2.5 py-1 cursor-pointer transition-colors ${
                        matrixColorMode === 'binary'
                          ? isDark
                            ? 'bg-zinc-100 text-zinc-950 font-semibold'
                            : 'bg-zinc-900 text-white font-semibold'
                          : textMuted
                      }`}
                      title="Single-tone commit log signal mode"
                    >
                      BINARY
                    </button>
                  </div>

                  {/* Capacity Span Toggle: 1X (Fit Screen) vs 2X (Double Capacity Expansion) */}
                  <div className={`flex border ${borderCol}`}>
                    <button
                      type="button"
                      onClick={() => setMatrixSpanMultiplier(1)}
                      className={`px-2 py-1 cursor-pointer transition-colors ${
                        matrixSpanMultiplier === 1
                          ? isDark
                            ? 'bg-emerald-500 text-zinc-950 font-semibold'
                            : 'bg-emerald-600 text-white font-semibold'
                          : textMuted
                      }`}
                      title="1x screen-fitted week columns"
                    >
                      1X ({cadenceMatrixData.unitWeeks}W)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixSpanMultiplier(2)}
                      className={`px-2 py-1 cursor-pointer transition-colors ${
                        matrixSpanMultiplier === 2
                          ? isDark
                            ? 'bg-emerald-500 text-zinc-950 font-semibold'
                            : 'bg-emerald-600 text-white font-semibold'
                          : textMuted
                      }`}
                      title="2x expanded horizon (double columns)"
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
                        className={`p-1 border ${borderCol} disabled:opacity-30 cursor-pointer`}
                        title="Previous Epoch Block"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={cadenceMatrixData.clampedOffset === 0}
                        onClick={() => setMatrixPageOffset((p) => Math.max(0, p - 1))}
                        className={`p-1 border ${borderCol} disabled:opacity-30 cursor-pointer`}
                        title="Next Epoch Block"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-header Telemetry Readout */}
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className={textMuted}>SPAN:</span>
                  <span className="font-semibold">
                    {cadenceMatrixData.startLabel} — {cadenceMatrixData.endLabel}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <span className={textMuted}>ACTIVE DAYS: </span>
                    <span className="font-semibold text-emerald-400">
                      {cadenceMatrixData.activeDaysInBlock}D
                    </span>
                  </div>
                  <div>
                    <span className={textMuted}>BLOCK VOLUME: </span>
                    <span className="font-semibold">
                      {(cadenceMatrixData.totalMinutesInBlock / 60).toFixed(1)}H
                    </span>
                  </div>
                </div>
              </div>

              {/* Matrix Grid Container (7 Vertical Days x Dynamic Horizontal Weeks) */}
              <div className="flex items-start space-x-2.5 pt-1">
                {/* 7-Day Vertical Axis Labels (MON - SUN) */}
                <div
                  className={`flex flex-col justify-between pt-[18px] font-mono text-[9px] leading-none select-none shrink-0 h-[133px] ${textMuted}`}
                >
                  <span className="h-[13px] flex items-center">MON</span>
                  <span className="h-[13px] flex items-center opacity-50">TUE</span>
                  <span className="h-[13px] flex items-center">WED</span>
                  <span className="h-[13px] flex items-center opacity-50">THU</span>
                  <span className="h-[13px] flex items-center">FRI</span>
                  <span className="h-[13px] flex items-center opacity-50">SAT</span>
                  <span className="h-[13px] flex items-center">SUN</span>
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
                        <div key={`month-${wk.mondayDate}`} className="w-[13px] shrink-0 relative">
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
                        <div key={wk.mondayDate} className="flex flex-col gap-[4px] shrink-0">
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
                                className={`w-[13px] h-[13px] border rounded-none transition-all duration-150 cursor-pointer hover:scale-125 hover:z-10 ${cellStyle} ${todayHighlight}`}
                                title={`${cell.date}: ${
                                  cell.minutes > 0
                                    ? `${cell.minutes} min (${(cell.minutes / 60).toFixed(1)}h) across ${cell.count} log(s)`
                                    : cell.isFuture
                                    ? 'Unfilled future slot (Click to set date)'
                                    : 'No commits logged (Click to set date)'
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
                          {hoveredMatrixCell.minutes} MIN ({(hoveredMatrixCell.minutes / 60).toFixed(1)}H) //{' '}
                          {hoveredMatrixCell.count} COMMIT(S)
                        </span>
                      ) : (
                        <span className={textMuted}>0 MIN // STANDBY SLOT (CLICK CELL TO SELECT DATE)</span>
                      )}
                    </div>
                  ) : (
                    <span className={textMuted}>
                      TAP OR HOVER ANY CELL TO INSPECT DAILY TELEMETRY // AUTO-EXPANDS WHEN EPOCH FILLS
                    </span>
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center space-x-2 shrink-0 select-none">
                  <span className={textMuted}>IDLE</span>
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
                  <span className={textMuted}>COMMITTED</span>
                </div>
              </div>
            </div>

            {/* CHRONOLOGICAL LOG STREAM */}
            <div className={`border ${borderCol} ${bgCard} p-6 order-7 lg:order-none`}>
              <div className={`flex items-center justify-between pb-4 mb-4 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.recentLogs}
                  </h2>
                </div>
                <span className={`font-mono text-[11px] ${textMuted}`}>
                  {user ? `${logs.length} RECORDS` : 'STANDBY'}
                </span>
              </div>

              {dataLoading ? (
                <div className="py-12 flex items-center justify-center space-x-2 font-mono text-xs text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading records from Django backend...</span>
                </div>
              ) : logs.length === 0 ? (
                <div className={`py-12 text-center font-mono text-xs ${textMuted}`}>
                  {user ? t.noLogs : 'Authenticate to view and manage your chronological study log stream.'}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`divide-y ${isDark ? 'divide-zinc-800/70' : 'divide-zinc-200'}`}>
                    {logs.slice(0, visibleLogCount).map((log) => {
                      const cat = categories.find((c) => String(c.id) === String(log.categoryId));
                      const isEditingLog = String(editingLogId) === String(log.id);
                      return (
                        <div key={log.id} className="py-3 space-y-3 group">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs flex-1 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat?.color || log.categoryColor || '#71717a' }}
                              />
                              <span className="font-bold">
                                [{cat?.code || log.categoryCode || 'LOG'}]
                              </span>
                              <span className="truncate font-medium">
                                {cat?.name || log.categoryName || 'Study Session'}
                              </span>
                              <span className={textMuted}>// {log.date}</span>
                              <span className="px-1.5 py-0.5 text-[10px] border border-zinc-700/60 font-semibold">
                                {log.durationMinutes} MIN ({(log.durationMinutes / 60).toFixed(1)}H)
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditingLog ? handleCancelEditLog() : handleStartEditLog(log)
                                }
                                className={`p-1.5 border transition-colors cursor-pointer ${
                                  isEditingLog
                                    ? 'border-emerald-500/60 text-emerald-400'
                                    : `${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50`
                                }`}
                                title={isEditingLog ? 'Close Editor' : 'Edit Log'}
                                aria-label="Edit Log"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className={`p-1.5 border ${borderCol} ${textMuted} hover:text-rose-500 hover:border-rose-500/50 transition-colors cursor-pointer`}
                                title="Delete Log"
                                aria-label="Delete Log"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
                                  EDIT TELEMETRY RECORD // #{log.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleCancelEditLog}
                                  className={`text-[10px] uppercase ${textMuted} hover:underline cursor-pointer`}
                                >
                                  [CANCEL]
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                  <label className={`block text-[10px] uppercase mb-1 ${textMuted}`}>
                                    {t.category}
                                  </label>
                                  <select
                                    value={editLogCatId}
                                    onChange={(e) => setEditLogCatId(e.target.value)}
                                    className={`w-full px-2.5 py-1.5 text-xs border outline-none ${inputBg}`}
                                  >
                                    {categories.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        [{c.code}] {c.name}
                                      </option>
                                    ))}
                                  </select>
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
                                    className={`w-full px-2.5 py-1.5 text-xs border outline-none ${inputBg}`}
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
                                    className={`w-full px-2.5 py-1.5 text-xs border outline-none ${inputBg}`}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-end space-x-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleCancelEditLog}
                                  className={`px-3 py-1.5 text-xs uppercase border ${borderCol} hover:opacity-80 cursor-pointer`}
                                >
                                  CANCEL
                                </button>
                                <button
                                  type="submit"
                                  className={`px-3.5 py-1.5 text-xs uppercase font-semibold cursor-pointer ${
                                    isDark
                                      ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300'
                                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                  }`}
                                >
                                  SAVE CHANGES
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
                        DISPLAYING {Math.min(visibleLogCount, logs.length)} OF {logs.length} RECORDS
                      </span>
                      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                        {visibleLogCount < logs.length && (
                          <>
                            <button
                              type="button"
                              onClick={() => setVisibleLogCount((prev) => Math.min(prev + 10, logs.length))}
                              className={`px-3.5 py-1.5 border ${borderCol} ${
                                isDark
                                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
                                  : 'text-emerald-700 border-emerald-600/40 bg-emerald-50 hover:bg-emerald-100'
                              } font-bold transition-colors cursor-pointer`}
                            >
                              SHOW MORE (+{Math.min(10, logs.length - visibleLogCount)})
                            </button>
                            {logs.length - visibleLogCount > 10 && (
                              <button
                                type="button"
                                onClick={() => setVisibleLogCount(logs.length)}
                                className={`px-3 py-1.5 border ${borderCol} ${
                                  isDark
                                    ? 'text-zinc-300 hover:text-white hover:bg-zinc-800/40'
                                    : 'text-black hover:bg-zinc-100 hover:border-zinc-800'
                                } hover:border-zinc-500 transition-colors cursor-pointer`}
                              >
                                SHOW ALL ({logs.length})
                              </button>
                            )}
                          </>
                        )}
                        {visibleLogCount > INITIAL_VISIBLE_LOGS && (
                          <button
                            type="button"
                            onClick={() => setVisibleLogCount(INITIAL_VISIBLE_LOGS)}
                            className={`px-3 py-1.5 border ${borderCol} ${
                              isDark
                                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                                : 'text-zinc-700 hover:text-black hover:bg-zinc-100'
                            } transition-colors cursor-pointer`}
                          >
                            COLLAPSE
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==========================================
          7. FOOTER SECTION (Inverted Monochrome)
      ========================================== */}
      <footer
        id="contact"
        className={`relative w-full py-20 px-6 scroll-mt-6 border-t transition-colors duration-300 ${
          isDark
            ? 'bg-white text-zinc-950 border-zinc-200'
            : 'bg-[#0a0a0a] text-white border-zinc-800'
        }`}
      >
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-10">
          <div
            className={`flex flex-col md:flex-row items-center justify-between w-full border-b pb-10 gap-6 ${
              isDark ? 'border-zinc-200' : 'border-zinc-800'
            }`}
          >
            <div>
              <span
                className={`text-xs uppercase tracking-widest font-sans block mb-1 font-medium ${
                  isDark ? 'text-zinc-500' : 'text-zinc-400'
                }`}
              >
                {ui.footerContact}
              </span>
              <a
                href="mailto:mikadorikuto@gmail.com"
                className={`font-serif text-2xl sm:text-3xl hover:underline underline-offset-4 transition-colors ${
                  isDark ? 'text-zinc-950 hover:text-zinc-700' : 'text-white hover:text-zinc-300'
                }`}
              >
                mikadorikuto@gmail.com
              </a>
            </div>

            {/* Social media links */}
            <div className="flex items-center space-x-3">
              {socialLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.name}
                    className={`p-3 rounded-full transition-all transform hover:scale-110 border ${
                      isDark
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950 border-zinc-200'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          <div
            className={`text-center font-sans text-xs tracking-wide ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            {ui.copyright}
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
                    ? 'PASSWORD RECOVERY // EMAIL DISPATCH'
                    : authMode === 'reset_confirm'
                    ? 'SET NEW PASSWORD // TOKEN VERIFIED'
                    : 'AUTHENTICATION GATEWAY'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAuthModal}
                className="font-mono text-xs hover:underline cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            {/* Mode Switcher Tabs (Shown for Login / Register) */}
            {(authMode === 'login' || authMode === 'register') && (
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
                  SIGN IN
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
                  CREATE ACCOUNT
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
                      [DEV MODE: OPEN PASSWORD RESET LINK]
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
                    Username
                  </label>
                  <input
                    id="auth-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="e.g., engineer"
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
                    {authMode === 'forgot' ? 'Registered Email Address' : 'Email Address *'}
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
                      {authMode === 'reset_confirm' ? 'New Password (Min 8 chars)' : 'Password'}
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
                        Forgot password?
                      </button>
                    )}
                    {authMode === 'register' && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        Min 8 characters
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
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                    Confirm New Password
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
                    <span>PROCESSING...</span>
                  </>
                ) : authMode === 'forgot' ? (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>SEND PASSWORD RESET LINK</span>
                  </>
                ) : authMode === 'reset_confirm' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>SAVE NEW PASSWORD</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{authMode === 'login' ? 'AUTHORIZE & SIGN IN' : 'REGISTER & INITIALIZE'}</span>
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
                  ← BACK TO SIGN IN
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className={`w-full max-w-xl border ${borderCol} ${bgCard} p-6 shadow-2xl h-[650px] max-h-[88vh] flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b ${borderCol} pb-3.5 shrink-0`}>
              <div className="flex items-center space-x-2.5">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">
                  ACCOUNT &amp; SECURITY SETTINGS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="font-mono text-xs hover:underline cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            {/* Settings Navigation Tabs */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 border ${borderCol} text-[10px] sm:text-[11px] font-mono mt-4 shrink-0`}>
              <button
                type="button"
                onClick={() => setSettingsTab('profile')}
                className={`py-2 text-center transition-colors cursor-pointer ${
                  settingsTab === 'profile'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                01 / PROFILE
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('clearance')}
                className={`py-2 text-center border-l ${borderCol} transition-colors cursor-pointer ${
                  settingsTab === 'clearance'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                02 / CLEARANCE (500)
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('security')}
                className={`py-2 text-center border-t sm:border-t-0 sm:border-l ${borderCol} transition-colors cursor-pointer ${
                  settingsTab === 'security'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                03 / PASSWORD
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('data')}
                className={`py-2 text-center border-t sm:border-t-0 border-l ${borderCol} transition-colors cursor-pointer ${
                  settingsTab === 'data'
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-bold'
                    : textMuted
                }`}
              >
                04 / DATA &amp; DANGER
              </button>
            </div>

            {/* Fixed-Height Scrollable Tab Body (Prevents Modal Height Jumping) */}
            <div className="flex-1 min-h-0 overflow-y-auto mt-5 pr-1">
              {/* TAB 2: TELEMETRY CLEARANCE LEVEL (500 RANKS) */}
              {settingsTab === 'clearance' && (
                <ClearanceBrowserPanel
                  clearance={clearanceStatus}
                  isDark={isDark}
                  borderCol={borderCol}
                  textMuted={textMuted}
                />
              )}

              {/* TAB 1: PROFILE & AVATAR */}
              {settingsTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-5 font-mono text-xs">
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
                          ACCOUNT AVATAR // HYBRID BADGE
                        </div>
                        <p className={`text-[10px] ${textMuted} font-sans`}>
                          Upload a custom photo (auto-resized to 128×128 in DB) or choose a preset icon &amp; accent color.
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
                        <span>UPLOAD IMAGE</span>
                      </button>
                      {profileAvatarImage && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarImage('')}
                          className={`px-2.5 py-1.5 border ${borderCol} text-rose-400 hover:bg-rose-500/10 cursor-pointer`}
                        >
                          USE PRESET
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset Icon Selector */}
                  <div>
                    <label className={`block text-[10px] uppercase mb-1.5 ${textMuted}`}>
                      Preset Badge Icon {profileAvatarImage ? '(Clear uploaded image to display)' : ''}
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
                        Avatar Accent Ring / Badge Color (36 Colors)
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
                      Account Username
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
                      Email Address (For Password Recovery)
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

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-2.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {profileSaving ? 'SAVING PROFILE...' : 'SAVE PROFILE & AVATAR'}
                </button>
              </form>
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
                      Current Password
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
                        New Password (Min 8 chars)
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
                        Confirm New Password
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

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full py-2.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {passwordSaving ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}
                  </button>
                </form>

                {/* Email Recovery Dispatch */}
                <div className={`p-4 border ${borderCol} ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-50'} space-y-2.5`}>
                  <div className="flex items-center space-x-2 text-[11px] font-semibold">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>FORGOT CURRENT PASSWORD? // EMAIL RECOVERY</span>
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    Send a one-time password reset link to your registered email address (
                    <span className="font-mono">{user.email}</span>).
                  </p>
                  <button
                    type="button"
                    disabled={passwordSaving}
                    onClick={handleSendResetEmailFromSettings}
                    className={`px-3.5 py-2 border ${borderCol} hover:border-emerald-500/60 text-xs font-semibold cursor-pointer`}
                  >
                    SEND PASSWORD RESET EMAIL
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
                    <span>BACKUP &amp; RESTORE TELEMETRY</span>
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    Restore study logs and categories from a previously exported TYPBOX JSON archive, or download a fresh snapshot.
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
                      <span>{importingBackup ? 'IMPORTING...' : 'IMPORT JSON BACKUP'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportJSON}
                      disabled={logs.length === 0}
                      className={`px-3 py-2 border ${borderCol} flex items-center space-x-1.5 cursor-pointer disabled:opacity-40`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>EXPORT JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={logs.length === 0}
                      className={`px-3 py-2 border ${borderCol} flex items-center space-x-1.5 cursor-pointer disabled:opacity-40`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>EXPORT CSV</span>
                    </button>
                  </div>
                </div>

                {/* Reset All Study Logs (Keep Account) */}
                <div className="p-4 border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    RESET STUDY LOGS // KEEP ACCOUNT &amp; CATEGORIES
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    Wipe all recorded study sessions ({logs.length} records) while preserving your account and category settings. Type{' '}
                    <span className="font-mono font-bold text-amber-400">CLEAR</span> to unlock:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Type CLEAR"
                      value={clearLogsConfirmText}
                      onChange={(e) => setClearLogsConfirmText(e.target.value)}
                      className={`flex-1 px-3 py-1.5 text-xs border ${borderCol} outline-none ${inputBg}`}
                    />
                    <button
                      type="button"
                      disabled={clearLogsConfirmText !== 'CLEAR' || clearingLogs || logs.length === 0}
                      onClick={handleClearAllLogs}
                      className="px-3.5 py-1.5 bg-amber-500 text-zinc-950 font-bold uppercase disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {clearingLogs ? 'CLEARING...' : 'CLEAR LOGS'}
                    </button>
                  </div>
                </div>

                {/* Danger Zone: Permanent Account Deletion */}
                <div className="p-4 border border-rose-500/40 bg-rose-500/5 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-[11px] uppercase tracking-wider">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DANGER ZONE // PERMANENT ACCOUNT DELETION</span>
                  </div>
                  <p className={`text-[11px] font-sans leading-relaxed ${textMuted}`}>
                    Permanently delete your account (<span className="font-mono">{user.username}</span>), categories, and all study telemetry. This cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmUsername('');
                      setShowDeleteModal(true);
                    }}
                    className="px-4 py-2 border border-rose-500/60 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors font-bold uppercase cursor-pointer"
                  >
                    PROCEED TO DELETE ACCOUNT...
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
                  PERMANENT ACCOUNT DELETION
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="font-mono text-xs hover:underline cursor-pointer"
              >
                [CANCEL]
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-rose-200/90">
                Warning: This operation is <strong className="text-rose-400 uppercase">strictly irreversible</strong>.
                All of your recorded study sessions, time metrics, and custom categories will be wiped permanently from the database.
              </p>

              <div className="p-3 border border-rose-500/20 bg-rose-500/5 font-mono text-xs space-y-2">
                <label className="block text-[11px] text-zinc-400">
                  Type your username <span className="text-white font-bold">"{user.username}"</span> to confirm:
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
                CANCEL
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
                    <span>DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>CONFIRM &amp; DELETE</span>
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
        activeDaysCount={user ? new Set(logs.map((l) => l.date)).size : 0}
        categories={user ? categories : []}
        logs={user ? logs : []}
        isDark={isDark}
        borderCol={borderCol}
        bgCard={bgCard}
        textMuted={textMuted}
      />
    </div>
  );
}