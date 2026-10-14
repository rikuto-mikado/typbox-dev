import React, { useState, useEffect, useMemo } from 'react';
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
  Share2,
  Check,
  Trash2,
  Terminal,
  ArrowUpRight,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

// ==========================================
// Types & Interfaces (Django API Schema Ready)
// ==========================================

export interface Category {
  id: string;
  name: string;
  code: string; // e.g., "SYS", "DEV", "ENG"
  color: string; // Hex color used sparingly as an indicator
  monthlyTargetHours: number;
}

export interface StudyLog {
  id: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  topic: string;
  isPublicToHub: boolean; // Flag for Django Hub Aggregator
  createdAt: string;
}

type Theme = 'dark' | 'light';
type PeriodView = 'weekly' | 'monthly';

// ==========================================
// Initial Mock Data
// ==========================================

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Backend & Architecture', code: 'BACK', color: '#10b981', monthlyTargetHours: 40 },
  { id: 'cat-2', name: 'Electrical & Facility Eng', code: 'ELEC', color: '#3b82f6', monthlyTargetHours: 35 },
  { id: 'cat-3', name: 'Network & Infrastructure', code: 'NET', color: '#f59e0b', monthlyTargetHours: 25 },
  { id: 'cat-4', name: 'English / Academic Writing', code: 'LANG', color: '#a855f7', monthlyTargetHours: 20 },
];

const getRecentDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const INITIAL_LOGS: StudyLog[] = [
  {
    id: 'log-1',
    categoryId: 'cat-1',
    date: getRecentDateString(0),
    durationMinutes: 120,
    topic: 'Django Hub API designing & model serialization',
    isPublicToHub: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'log-2',
    categoryId: 'cat-2',
    date: getRecentDateString(1),
    durationMinutes: 95,
    topic: 'Power distribution & circuit calculations',
    isPublicToHub: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'log-3',
    categoryId: 'cat-4',
    date: getRecentDateString(1),
    durationMinutes: 60,
    topic: 'Essay structure analysis and timed writing task',
    isPublicToHub: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'log-4',
    categoryId: 'cat-3',
    date: getRecentDateString(2),
    durationMinutes: 110,
    topic: 'VLAN routing & Docker container networking',
    isPublicToHub: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'log-5',
    categoryId: 'cat-1',
    date: getRecentDateString(3),
    durationMinutes: 80,
    topic: 'React + TypeScript state architecture for typbox.com',
    isPublicToHub: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'log-6',
    categoryId: 'cat-2',
    date: getRecentDateString(5),
    durationMinutes: 140,
    topic: 'Three-phase AC power theory & Past exam review',
    isPublicToHub: true,
    createdAt: new Date().toISOString(),
  },
];

const ACCENT_PALETTE = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
];

// ==========================================
// ==========================================
// UI Dictionary
// ==========================================

const DICT = {
  subtitle: 'QUANTIFIED STUDY & TELEMETRY ARCHIVE',
  hubStatus: 'HUB SYNC: STANDBY',
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
  publicToPortfolio: 'Expose to Portfolio Hub (Public)',
  saveLog: 'COMMIT LOG',
  categoriesTitle: 'CATEGORY REGISTRY',
  addCategory: 'NEW CATEGORY',
  catName: 'Category Name',
  catCode: 'Code (Max 4 chars)',
  catTarget: 'Monthly Target (Hrs)',
  create: 'CREATE',
  analyticsTitle: 'TELEMETRY & ANALYTICS',
  weeklyView: 'WEEKLY (7D)',
  monthlyView: 'MONTHLY (30D)',
  recentLogs: 'CHRONOLOGICAL LOG STREAM',
  hubPreviewBtn: 'INSPECT HUB PAYLOAD',
  authModalTitle: 'AUTHENTICATION GATEWAY (PLACEHOLDER)',
  authModalDesc: 'Connect your Django authentication endpoint (JWT / Session) here.',
  mockLoginBtn: 'Simulate Authenticated State',
  noLogs: 'No study logs recorded yet.',
};

// ==========================================
// Main Component
// ==========================================

export default function App() {
  // UI Preferences
  const [theme, setTheme] = useState<Theme>('dark');
  const [periodView, setPeriodView] = useState<PeriodView>('weekly');
  const t = DICT;

  // Auth Placeholder State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showHubModal, setShowHubModal] = useState<boolean>(false);

  // Data State (with LocalStorage persistence)
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('typbox_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [logs, setLogs] = useState<StudyLog[]>(() => {
    const saved = localStorage.getItem('typbox_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('typbox_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('typbox_logs', JSON.stringify(logs));
  }, [logs]);

  // Log Form State
  const [inputMode, setInputMode] = useState<'manual' | 'timer'>('manual');
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const [logDate, setLogDate] = useState<string>(getRecentDateString(0));
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [topic, setTopic] = useState<string>('');
  const [isPublicToHub, setIsPublicToHub] = useState<boolean>(true);

  // Stopwatch State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Category Form State
  const [showCatForm, setShowCatForm] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatCode, setNewCatCode] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>(ACCENT_PALETTE[0].hex);
  const [newCatTarget, setNewCatTarget] = useState<number>(20);

  // ==========================================
  // Handlers
  // ==========================================

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMinutes =
      inputMode === 'timer' ? Math.max(1, Math.round(elapsedSeconds / 60)) : durationMinutes;

    if (!selectedCatId || finalMinutes <= 0) return;

    const newLog: StudyLog = {
      id: `log-${Date.now()}`,
      categoryId: selectedCatId,
      date: logDate,
      durationMinutes: Number(finalMinutes),
      topic: topic.trim() || 'Focused study session',
      isPublicToHub,
      createdAt: new Date().toISOString(),
    };

    setLogs([newLog, ...logs]);
    setTopic('');
    if (inputMode === 'timer') {
      setIsRunning(false);
      setElapsedSeconds(0);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatCode.trim()) return;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      code: newCatCode.trim().toUpperCase().slice(0, 4),
      color: newCatColor,
      monthlyTargetHours: Number(newCatTarget) || 10,
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    setSelectedCatId(newCat.id);
    setNewCatName('');
    setNewCatCode('');
    setShowCatForm(false);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (categories.length <= 1) {
      alert('At least one category is required for study logging.');
      return;
    }
    const hasLogs = logs.some((l) => l.categoryId === id);
    const confirmMsg = hasLogs
      ? `Delete category "${name}"? Existing logs under this category will be preserved, but the category itself will be removed.`
      : `Delete category "${name}"?`;

    if (!window.confirm(confirmMsg)) return;

    const remaining = categories.filter((c) => c.id !== id);
    setCategories(remaining);

    if (selectedCatId === id && remaining.length > 0) {
      setSelectedCatId(remaining[0].id);
    }
  };

  const handleDeleteLog = (id: string) => {
    setLogs(logs.filter((l) => l.id !== id));
  };

  const toggleLogPublic = (id: string) => {
    setLogs(
      logs.map((l) => (l.id === id ? { ...l, isPublicToHub: !l.isPublicToHub } : l))
    );
  };

  // ==========================================
  // Computed Analytics (Weekly & Monthly)
  // ==========================================

  const currentMonthPrefix = useMemo(() => {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }, []);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => getRecentDateString(6 - i));
  }, []);

  const stats = useMemo(() => {
    const totalMin = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const weeklyMin = logs
      .filter((l) => last7Days.includes(l.date))
      .reduce((acc, l) => acc + l.durationMinutes, 0);
    const monthlyMin = logs
      .filter((l) => l.date.startsWith(currentMonthPrefix))
      .reduce((acc, l) => acc + l.durationMinutes, 0);

    return {
      totalHours: (totalMin / 60).toFixed(1),
      weeklyHours: (weeklyMin / 60).toFixed(1),
      monthlyHours: (monthlyMin / 60).toFixed(1),
    };
  }, [logs, last7Days, currentMonthPrefix]);

  // Weekly Chart Data (Last 7 days stacked by category)
  const weeklyChartData = useMemo(() => {
    return last7Days.map((dateStr) => {
      const dayLogs = logs.filter((l) => l.date === dateStr);
      const totalDayMin = dayLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
      const byCategory = categories.map((cat) => {
        const catMin = dayLogs
          .filter((l) => l.categoryId === cat.id)
          .reduce((acc, l) => acc + l.durationMinutes, 0);
        return { category: cat, minutes: catMin };
      });
      return {
        date: dateStr,
        label: dateStr.slice(5), // MM-DD
        totalMinutes: totalDayMin,
        byCategory,
      };
    });
  }, [logs, categories, last7Days]);

  // Monthly Category Breakdown & 30-Day Heatmap Grid
  const monthlyBreakdown = useMemo(() => {
    const monthLogs = logs.filter((l) => l.date.startsWith(currentMonthPrefix));
    return categories.map((cat) => {
      const minutes = monthLogs
        .filter((l) => l.categoryId === cat.id)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      const hours = +(minutes / 60).toFixed(1);
      const progress = Math.min(100, Math.round((hours / cat.monthlyTargetHours) * 100));
      return { ...cat, hours, minutes, progress };
    });
  }, [logs, categories, currentMonthPrefix]);

  const last28DaysHeatmap = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const dateStr = getRecentDateString(27 - i);
      const dayMin = logs
        .filter((l) => l.date === dateStr)
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      return { date: dateStr, minutes: dayMin };
    });
  }, [logs]);

  // Payload for Django Hub Aggregator
  const hubPayloadPreview = useMemo(() => {
    const publicLogs = logs.filter((l) => l.isPublicToHub);
    return {
      source: 'typbox.com',
      timestamp: new Date().toISOString(),
      summary: {
        total_hours: Number(stats.totalHours),
        weekly_hours: Number(stats.weeklyHours),
        monthly_hours: Number(stats.monthlyHours),
      },
      categories: monthlyBreakdown.map((c) => ({
        code: c.code,
        name: c.name,
        monthly_hours: c.hours,
        target_hours: c.monthlyTargetHours,
      })),
      recent_public_logs: publicLogs.slice(0, 5).map((l) => {
        const cat = categories.find((c) => c.id === l.categoryId);
        return {
          id: l.id,
          date: l.date,
          category_code: cat?.code || 'MISC',
          duration_minutes: l.durationMinutes,
          topic: l.topic,
        };
      }),
    };
  }, [logs, stats, monthlyBreakdown, categories]);

  const formatTimer = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Theme Classes (Strict Monochrome + Sharp Borders)
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
          TOP NAVIGATION BAR (Editorial Header)
      ========================================== */}
      <header className={`sticky top-0 z-30 border-b ${borderCol} ${bgMain}/90 backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div
                className={`w-3 h-3 ${
                  isRunning ? 'bg-emerald-500 animate-pulse' : isDark ? 'bg-zinc-100' : 'bg-zinc-900'
                }`}
              />
              <span className="font-mono text-lg font-bold tracking-tighter">TYPBOX</span>
              <span className={`font-mono text-xs px-1.5 py-0.5 border ${borderCol} ${textMuted}`}>
                .com
              </span>
            </div>
            <span className={`hidden md:inline-block font-mono text-[11px] tracking-widest ${textMuted}`}>
              // {t.subtitle}
            </span>
          </div>

          {/* Right Controls: Hub Sync, Lang, Theme, Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Hub API Payload Inspector Button */}
            <button
              onClick={() => setShowHubModal(true)}
              className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 text-xs font-mono border ${borderCol} hover:border-emerald-500/60 transition-colors`}
              title="Inspect JSON payload for Django Hub"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t.hubStatus}</span>
              <Share2 className="w-3.5 h-3.5 ml-1 opacity-70" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 border ${borderCol} hover:opacity-80`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Auth Button (For user's custom implementation) */}
            <button
              onClick={() => setShowAuthModal(true)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs font-mono font-medium border transition-colors ${
                isAuthenticated
                  ? `border-emerald-500/50 text-emerald-400 bg-emerald-500/10`
                  : isDark
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 hover:bg-zinc-300'
                  : 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {isAuthenticated ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>ADMIN</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t.signIn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN CONTENT CONTAINER
      ========================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* 1. TOP METRICS STRIP (4-Column Sharp Grid) */}
        <section className={`grid grid-cols-2 lg:grid-cols-4 border-t border-l ${borderCol}`}>
          <div className={`p-5 border-r border-b ${borderCol} ${bgCard}`}>
            <div className={`font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
              01 / {t.totalHours}
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="font-mono text-3xl sm:text-4xl font-light tracking-tight">
                {stats.totalHours}
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
                {stats.weeklyHours}
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
                {stats.monthlyHours}
              </span>
              <span className={`font-mono text-xs ${textMuted}`}>HRS ({currentMonthPrefix})</span>
            </div>
          </div>

          <div className={`p-5 border-r border-b ${borderCol} ${bgCard}`}>
            <div className={`font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
              04 / {t.activeCategories}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="flex items-baseline space-x-2">
                <span className="font-mono text-3xl sm:text-4xl font-light tracking-tight">
                  {categories.length}
                </span>
                <span className={`font-mono text-xs ${textMuted}`}>UNITS</span>
              </div>
              <div className="flex space-x-1">
                {categories.map((c) => (
                  <span
                    key={c.id}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. MAIN WORKSPACE: LEFT (Log Input & Categories) / RIGHT (Analytics & Stream) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN (5 Cols): Recording & Category Creation */}
          <div className="lg:col-span-5 space-y-8">
            {/* SESSION LOGGER PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-6`}>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800/60">
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
                {/* Stopwatch UI if in timer mode */}
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
                          className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>START</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsRunning(false)}
                          className="flex items-center space-x-1.5 px-4 py-1.5 bg-amber-500 text-zinc-950 font-mono text-xs font-semibold"
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
                        }}
                        className={`px-3 py-1.5 border ${borderCol} font-mono text-xs ${textMuted}`}
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

                {/* Topic / Memo */}
                <div>
                  <label className={`block font-mono text-[11px] uppercase mb-1.5 ${textMuted}`}>
                    {t.topicMemo}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Django REST Framework serializer implementation..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border outline-none ${inputBg}`}
                  />
                </div>

                {/* Hub Visibility Toggle */}
                <div className="pt-1 flex items-center justify-between">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPublicToHub}
                      onChange={(e) => setIsPublicToHub(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                        isPublicToHub
                          ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                          : borderCol
                      }`}
                    >
                      {isPublicToHub && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-mono">{t.publicToPortfolio}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className={`w-full py-2.5 px-4 font-mono text-xs uppercase tracking-widest font-semibold transition-colors flex items-center justify-center space-x-2 ${
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

            {/* CATEGORY REGISTRY & CREATION PANEL */}
            <div className={`border ${borderCol} ${bgCard} p-6`}>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800/60">
                <div className="flex items-center space-x-2">
                  <FolderPlus className="w-4 h-4" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.categoriesTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCatForm(!showCatForm)}
                  className={`px-2.5 py-1 text-[11px] font-mono border ${borderCol} hover:opacity-80`}
                >
                  {showCatForm ? 'CLOSE' : `+ ${t.addCategory}`}
                </button>
              </div>

              {/* Add Category Form */}
              {showCatForm && (
                <form
                  onSubmit={handleAddCategory}
                  className={`mb-6 p-4 border ${borderCol} space-y-3`}
                >
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
                    <label className={`block font-mono text-[10px] uppercase mb-1.5 ${textMuted}`}>
                      Indicator Accent
                    </label>
                    <div className="flex space-x-2">
                      {ACCENT_PALETTE.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setNewCatColor(col.hex)}
                          className={`w-5 h-5 rounded-full border ${
                            newCatColor === col.hex ? 'ring-2 ring-offset-2 ring-zinc-400' : 'opacity-60'
                          }`}
                          style={{ backgroundColor: col.hex }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-2 font-mono text-xs uppercase font-semibold ${
                      isDark ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-white'
                    }`}
                  >
                    {t.create}
                  </button>
                </form>
              )}

              {/* Category List with Monthly Progress */}
              <div className="space-y-3">
                {monthlyBreakdown.map((cat) => (
                  <div
                    key={cat.id}
                    className="group space-y-1.5 p-2 -mx-2 rounded transition-colors hover:bg-zinc-500/5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-mono font-semibold text-[11px] shrink-0">[{cat.code}]</span>
                        <span className="truncate max-w-[130px] sm:max-w-[170px] font-medium" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="font-mono text-[11px]">
                          {cat.hours}h{' '}
                          <span className={textMuted}>/ {cat.monthlyTargetHours}h</span>
                        </span>

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
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (7 Cols): Weekly/Monthly Analytics & Log Stream */}
          <div className="lg:col-span-7 space-y-8">
            {/* ANALYTICS MODULE (Weekly Bar Chart & Monthly Heatmap) */}
            <div className={`border ${borderCol} ${bgCard} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-zinc-800/60">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.analyticsTitle}
                  </h2>
                </div>

                {/* Period Switcher */}
                <div className={`flex border ${borderCol} text-[11px] font-mono`}>
                  <button
                    type="button"
                    onClick={() => setPeriodView('weekly')}
                    className={`px-3 py-1 flex items-center space-x-1.5 ${
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
                    className={`px-3 py-1 flex items-center space-x-1.5 ${
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

              {/* VIEW A: WEEKLY STACKED BAR CHART */}
              {periodView === 'weekly' ? (
                <div className="space-y-4">
                  <div className="h-52 flex items-end justify-between gap-3 pt-6 px-2 border-b border-zinc-800/50">
                    {weeklyChartData.map((day) => {
                      const maxScaleMinutes = 240; // 4 hours full height reference
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center h-full justify-end group"
                        >
                          {/* Total Day Hours Label */}
                          <span className={`font-mono text-[10px] mb-1.5 ${textMuted}`}>
                            {day.totalMinutes > 0 ? `${(day.totalMinutes / 60).toFixed(1)}h` : '-'}
                          </span>

                          {/* Stacked Bar Container */}
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
                                  title={`${seg.category.name}: ${seg.minutes} min`}
                                />
                              );
                            })}
                          </div>

                          {/* X-Axis Date Label */}
                          <span className="font-mono text-[11px] mt-2.5">{day.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
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
                /* VIEW B: MONTHLY DENSITY HEATMAP & SHARE */
                <div className="space-y-6">
                  <div>
                    <div className={`font-mono text-[11px] mb-3 ${textMuted}`}>
                      28-DAY ACTIVITY MATRIX (DENSITY BY MINUTES)
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {last28DaysHeatmap.map((cell) => {
                        const intensity =
                          cell.minutes === 0
                            ? isDark
                              ? 'bg-zinc-900 border-zinc-800/80'
                              : 'bg-zinc-100 border-zinc-200'
                            : cell.minutes < 60
                            ? 'bg-emerald-500/30 border-emerald-500/40'
                            : cell.minutes < 120
                            ? 'bg-emerald-500/60 border-emerald-500/70'
                            : 'bg-emerald-500 border-emerald-400 text-zinc-950 font-semibold';

                        return (
                          <div
                            key={cell.date}
                            className={`p-2.5 border font-mono text-[10px] flex flex-col justify-between h-14 ${intensity}`}
                          >
                            <span className="opacity-70">{cell.date.slice(5)}</span>
                            <span className="text-right">
                              {cell.minutes > 0 ? `${cell.minutes}m` : '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CHRONOLOGICAL LOG STREAM */}
            <div className={`border ${borderCol} ${bgCard} p-6`}>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800/60">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4" />
                  <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">
                    {t.recentLogs}
                  </h2>
                </div>
                <button
                  onClick={() => setShowHubModal(true)}
                  className="font-mono text-[11px] text-emerald-500 hover:underline flex items-center space-x-1"
                >
                  <span>{t.hubPreviewBtn}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {logs.length === 0 ? (
                <div className={`py-12 text-center font-mono text-xs ${textMuted}`}>
                  {t.noLogs}
                </div>
              ) : (
                <div className={`divide-y ${isDark ? 'divide-zinc-800/70' : 'divide-zinc-200'}`}>
                  {logs.map((log) => {
                    const cat = categories.find((c) => c.id === log.categoryId);
                    return (
                      <div
                        key={log.id}
                        className="py-3.5 flex items-start sm:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center space-x-2.5 font-mono text-xs">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat?.color || '#71717a' }}
                            />
                            <span className="font-semibold">[{cat?.code || 'LOG'}]</span>
                            <span className={textMuted}>{log.date}</span>
                            <span className="px-1.5 py-0.5 text-[10px] border border-zinc-700/60">
                              {log.durationMinutes} MIN
                            </span>
                          </div>
                          <p className="text-sm truncate pl-4">{log.topic}</p>
                        </div>

                        {/* Actions: Hub Public Toggle & Delete */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleLogPublic(log.id)}
                            className={`px-2 py-1 border text-[10px] font-mono flex items-center space-x-1 transition-colors ${
                              log.isPublicToHub
                                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                                : `${borderCol}${textMuted}`
                            }`}
                            title="Toggle Portfolio Hub visibility"
                          >
                            {log.isPublicToHub ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>PUBLIC</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>PRIVATE</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className={`p-1.5 border ${borderCol} ${textMuted} hover:text-rose-500 hover:border-rose-500/50 transition-colors`}
                            title="Delete Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ==========================================
          MODAL 1: DJANGO HUB PAYLOAD INSPECTOR
      ========================================== */}
      {showHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className={`w-full max-w-2xl border ${borderCol} ${bgCard} p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">
                  DJANGO HUB AGGREGATOR // JSON PAYLOAD PREVIEW
                </h3>
              </div>
              <button
                onClick={() => setShowHubModal(false)}
                className="font-mono text-xs hover:underline"
              >
                [ESC / CLOSE]
              </button>
            </div>

            <p className={`text-xs ${textMuted}`}>
              Data payload structure ready for Django ingestion via `GET /api/v1/telemetry/summary` or webhook dispatch. Contains only logs flagged as `PUBLIC`.
            </p>

            <pre className="p-4 bg-[#080808] text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800 max-h-80">
              {JSON.stringify(hubPayloadPreview, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 2: AUTHENTICATION PLACEHOLDER
      ========================================== */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className={`w-full max-w-md border ${borderCol} ${bgCard} p-6 space-y-5`}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <h3 className="font-mono text-xs uppercase tracking-widest font-semibold">
                  {t.authModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="font-mono text-xs hover:underline"
              >
                [CLOSE]
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${textMuted}`}>{t.authModalDesc}</p>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="admin@typbox.com"
                disabled
                className={`w-full px-3 py-2 text-xs font-mono border opacity-60 ${inputBg}`}
              />
              <input
                type="password"
                placeholder="••••••••••••"
                disabled
                className={`w-full px-3 py-2 text-xs font-mono border opacity-60 ${inputBg}`}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAuthenticated(!isAuthenticated);
                setShowAuthModal(false);
              }}
              className="w-full py-2.5 bg-emerald-500 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center space-x-2"
            >
              {isAuthenticated ? (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.signOut}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t.mockLoginBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}