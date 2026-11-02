import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  CloudLightning,
  CloudRain,
  CornerDownLeft,
  Snowflake,
  Sun,
  Terminal,
  VolumeX,
  Zap,
} from 'lucide-react';
import { AMBIENT_THEMES } from './ambientThemes';
import { useAmbientCanvas } from './useAmbientCanvas';
import { api } from './api';
import { BitsBadge, BitShard } from './BitsBadge';
import { BUFF_ART, lookOf } from './buffArt';
import { BOSS_ART, RIVAL_ART, challengeAccent, type PixelArt } from './challengeArt';
import { HpCells, Pixel } from './ChallengePanel';
import { BuffIcon } from './BuffIcon';
import { PACK_ART } from './roomArtPacks';
import { thumbnail, type FurnitureSpec } from './roomRender';
import { ChronoDisplay } from './ChronometerFace';
import { getChronoThemeById } from './chronometerThemes';
import { CURSOR_THEMES } from './cursorThemes';
import { MoonPhaseCalendar } from './MoonPhaseCalendar';
import { SegmentIndicator } from './SegmentIndicator';
import { StarlightSky } from './StarlightSky';
import { StatusRankList } from './StatusRankList';
import { CLEARANCE_LEVELS, NOISE_PROFILES, SURFACE_THEME_PAIRS } from './telemetryFeatures';
import { ThemeToggleIcon } from './ThemeToggleIcon';
import { getZonedParts, tf, useI18n } from './i18n';
import { getUserStatusOption } from './userStatus';
import { startOfWeekStr, type WeekStart } from './week';
import { DashboardKpis } from './DashboardKpis';
import { StudyRhythm } from './StudyRhythm';
import { segmentStyle } from './categoryStyle';

// Lead images for NEWS articles, drawn live from the app's own parts and
// assets (real cursors, real chronometer faces, real theme colours, the
// real ambient scenes) rather than screenshots, so they always match the
// app. Motion pauses under prefers-reduced-motion.

export type FigureKind =
  | 'pairs'
  | 'challenges'
  | 'starlight'
  | 'festivals'
  | 'fest-newyear'
  | 'fest-setsubun'
  | 'fest-valentine'
  | 'fest-hanami'
  | 'fest-tanabata'
  | 'fest-summer'
  | 'fest-tsukimi'
  | 'fest-halloween'
  | 'fest-culture'
  | 'fest-christmas'
  | 'buffguide'
  | 'packs6'
  | 'newbuffs'
  | 'kpis'
  | 'rhythm'
  | 'bitsreset'
  | 'bitsbutton'
  | 'furniture'
  | 'buffs'
  | 'bits'
  | 'profile'
  | 'interface'
  | 'cursors'
  | 'terminal'
  | 'chrono'
  | 'forecast'
  | 'ambient'
  | 'surfaces'
  | 'clearance'
  | 'launch';

export interface FigureContext {
  borderCol: string;
  textMuted: string;
  bgCard: string;
  isDark: boolean;
  timeZone: string;
  weekStart: WeekStart;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Re-renders every `ms` (unless the viewer prefers reduced motion) and returns a tick counter. */
const useTicker = (ms: number) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
};

// ------------------------------------------------------------ dashboard
// The redesigned dashboard's own panels (DashboardKpis, StudyRhythm), fed a
// made-up but plausible six weeks of study so the figure always has data.
const SAMPLE_CATS = [
  { id: 'dev', code: 'DEV', name: 'Development', color: '#10b981', isActive: true },
  { id: 'math', code: 'MATH', name: 'Mathematics', color: '#3b82f6', isActive: true },
  { id: 'lang', code: 'LANG', name: 'English', color: '#f59e0b', isActive: true },
];
const zonedToday = (timeZone: string) => {
  const p = getZonedParts(new Date(), timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};
const sampleLogs = (todayStr: string) => {
  const [y, m, d] = todayStr.split('-').map(Number);
  const logs: Array<{ date: string; createdAt: string; durationMinutes: number; categoryId: string }> = [];
  for (let i = 0; i < 42; i++) {
    if (i % 6 === 5) continue; // a rest day now and then
    const day = new Date(y, m - 1, d - i);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    // Evenings mostly, an early start every few days.
    const hours = i % 4 === 0 ? [6, 21] : i % 3 === 0 ? [23] : [20, 22];
    hours.forEach((hour, k) => {
      const stamp = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 30);
      logs.push({
        date,
        createdAt: stamp.toISOString(),
        durationMinutes: 45 + ((i * 37 + k * 23) % 100),
        categoryId: SAMPLE_CATS[(i + k) % SAMPLE_CATS.length].id,
      });
    });
  }
  return logs;
};

const KpisFigure: React.FC<FigureContext> = ({ borderCol, bgCard, textMuted, isDark, timeZone, weekStart }) => {
  const todayStr = useMemo(() => zonedToday(timeZone), [timeZone]);
  const logs = useMemo(() => sampleLogs(todayStr), [todayStr]);
  const total = logs.reduce((a, l) => a + l.durationMinutes, 0) / 60;
  return (
    <div className="p-3 pointer-events-none select-none" aria-hidden>
      <DashboardKpis
        signedIn
        logs={logs}
        openCategories={SAMPLE_CATS}
        activeCategoryCount={SAMPLE_CATS.length}
        todayStr={todayStr}
        weekStartStr={startOfWeekStr(todayStr, weekStart)}
        monthPrefix={todayStr.slice(0, 7)}
        cycleNumber={1}
        cycleHours={total}
        cycleSpan={1000}
        liveSeconds={1500}
        borderCol={borderCol}
        bgCard={bgCard}
        textMuted={textMuted}
        isDark={isDark}
        categoryFill={(c) => segmentStyle(c.color, c.isActive)}
      />
    </div>
  );
};

const RhythmFigure: React.FC<FigureContext> = ({ borderCol, textMuted, isDark, timeZone, weekStart }) => {
  const todayStr = useMemo(() => zonedToday(timeZone), [timeZone]);
  const logs = useMemo(() => sampleLogs(todayStr), [todayStr]);
  return (
    <div className="p-4 sm:h-72 flex flex-col pointer-events-none select-none" aria-hidden>
      <StudyRhythm logs={logs} todayStr={todayStr} timeZone={timeZone} weekStart={weekStart} textMuted={textMuted} isDark={isDark} borderCol={borderCol} />
    </div>
  );
};

// ------------------------------------------------------------- bitsreset
// The ledger before and after RESET BITS & MY ROOM: bonuses and purchases
// go, the hours (and the BITS they pay) stay.
const RESET_SAMPLE = { hours: 102, bonus: 1350, spent: 4800, pieces: 14, logs: 128, cats: 6 };
const BitsResetFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => {
  const after = useTicker(1900) % 2 === 1;
  const s = RESET_SAMPLE;
  const base = s.hours * 100;
  const n = (v: number) => v.toLocaleString('en-US');
  const row = (label: string, detail: string, before: string, now: string, kept = false) => (
    <div className={`flex items-baseline justify-between gap-3 py-1 border-b ${borderCol}`}>
      <span className="min-w-0">
        <span className="font-bold">{label}</span> <span className={textMuted}>{detail}</span>
      </span>
      <span className="shrink-0 tabular-nums flex items-center gap-1.5">
        {kept ? (
          <>
            {before}
            <span className="text-[9px] px-1 border border-emerald-500/60 text-emerald-400">KEPT</span>
          </>
        ) : (
          <span className={`transition-colors duration-500 ${after ? 'text-sky-400 font-bold' : ''}`}>{after ? now : before}</span>
        )}
      </span>
    </div>
  );
  return (
    <div className="p-4 flex justify-center pointer-events-none select-none" aria-hidden>
      <div className="w-full max-w-sm font-mono text-[11px]">
        <div className="flex items-center justify-between gap-2 pb-1.5 text-[10px] tracking-wider">
          <span className="text-sky-400 font-bold">RESET BITS &amp; MY ROOM</span>
          <span className={`px-1.5 border transition-colors duration-500 ${after ? 'border-sky-500/60 text-sky-400' : `${borderCol} ${textMuted}`}`}>
            {after ? 'AFTER' : 'BEFORE'}
          </span>
        </div>
        {row('STUDY', `${s.hours}h`, `+${n(base)}`, `+${n(base)}`, true)}
        {row('BUFF BONUSES', '', `+${n(s.bonus)}`, '+0')}
        {row('PURCHASES', '', `\u2212${n(s.spent)}`, '0')}
        {row('MY ROOM', '', `${s.pieces} PIECES`, 'STARTER')}
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className="font-bold">BALANCE</span>
          <span className="flex items-center gap-1.5 text-sm font-bold tabular-nums text-amber-400">
            <BitShard className="w-3 h-3" />
            {n(after ? base : base + s.bonus - s.spent)}
          </span>
        </div>
        <div className={`pt-1.5 flex items-center gap-1.5 text-[10px] ${textMuted}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {s.logs} LOGS · {s.cats} CATEGORIES KEPT
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------ bitsbutton
// The real header button with each buff running in turn.
const BitsButtonFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => {
  const ids = Object.keys(BUFF_ART);
  const tick = useTicker(1800);
  const id = ids[tick % ids.length];
  const name = id === 'warm_up' ? 'WARM-UP' : id.replace(/_/g, ' ').toUpperCase();
  return (
    <div className="h-36 flex flex-col items-center justify-center gap-5" aria-hidden>
      <div className="flex items-center gap-8 pointer-events-none">
        <BitsBadge balance={0} ready={false} gainSeq={0} borderCol={borderCol} onOpen={() => {}} />
        <BitsBadge
          balance={0}
          ready={false}
          gainSeq={0}
          borderCol={borderCol}
          onOpen={() => {}}
          activeBuff={{ item_id: id, name, expires_at: '' }}
        />
      </div>
      <div className={`flex items-center gap-8 font-mono text-[9px] tracking-wider ${textMuted}`}>
        <span>NO BUFF</span>
        <span style={{ color: lookOf(id).accent }}>{name}</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------- furniture
// A shelf of the new designs (the art packs), a page at a time, and one
// piece in every colour it comes in.
const SHELF_SIZE = 24;
// The six packs added in November carry these id prefixes (roomArtPacks.ts).
const NEW_PACK_PREFIXES = ['dc_', 'hw_', 'orb_', 'intel_', 'camp_', 'cyber_'];
const isNewPackId = (id: string) => NEW_PACK_PREFIXES.some((prefix) => id.startsWith(prefix));

/** The furniture catalog for figures (null while loading, [] on failure). */
const useCatalog = () => {
  const [catalog, setCatalog] = useState<FurnitureSpec[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.room
      .get()
      .then((state) => !cancelled && setCatalog(state.catalog))
      .catch(() => !cancelled && setCatalog([]));
    return () => {
      cancelled = true;
    };
  }, []);
  return catalog;
};

const FurnitureFigure: React.FC<FigureContext & { pick?: (id: string) => boolean; swatchBase?: string }> = ({
  borderCol,
  textMuted,
  isDark,
  pick = (id) => !isNewPackId(id),
  swatchBase = 'fridge_tall',
}) => {
  const tick = useTicker(2600);
  const catalog = useCatalog();
  if (!catalog) return <div className="h-64" />;
  const byId = new Map(catalog.map((spec) => [spec.id, spec]));
  const designs = Object.keys(PACK_ART)
    .filter(pick)
    .map((id) => byId.get(id))
    .filter((spec): spec is FurnitureSpec => spec !== undefined && spec.layer !== 'wall_paint' && spec.layer !== 'floor_paint');
  const pages = Math.max(1, Math.ceil(designs.length / SHELF_SIZE));
  const page = designs.slice((tick % pages) * SHELF_SIZE, (tick % pages) * SHELF_SIZE + SHELF_SIZE);
  const swatches = catalog.filter((spec) => spec.id === swatchBase || spec.base === swatchBase);
  const shelf = isDark ? 'linear-gradient(#1c1c20 0 78%, #141417 78%)' : 'linear-gradient(#f4f4f5 0 78%, #e4e4e7 78%)';
  return (
    <div className="p-3 flex flex-col gap-3" aria-hidden>
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
        {page.map((spec) => {
          const z = Math.max(1, Math.floor(32 / (Math.max(spec.w, spec.h) * 8)));
          return (
            <span key={spec.id} className={`h-14 flex items-end justify-center pb-1 border ${borderCol}`} style={{ background: shelf }}>
              <img src={thumbnail(spec)} alt="" style={{ imageRendering: 'pixelated', width: spec.w * 8 * z, height: spec.h * 8 * z }} />
            </span>
          );
        })}
      </div>
      {swatches.length > 1 && (
        <div className={`flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3 px-1 pt-2 border-t ${borderCol}`}>
          {/* The colours wrap on narrow screens; the label gets its own line there. */}
          <div className="flex flex-wrap items-end gap-1.5 sm:gap-3">
            {swatches.map((spec) => (
              <img
                key={spec.id}
                src={thumbnail(spec)}
                alt=""
                className="shrink-0"
                style={{ imageRendering: 'pixelated', width: spec.w * 16, height: spec.h * 16 }}
              />
            ))}
          </div>
          <span className={`sm:ml-auto font-mono text-[9px] tracking-wider sm:text-right whitespace-nowrap ${textMuted}`}>
            {swatches[0].name} × {swatches.length} COLOURS
          </span>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------- newbuffs
// The three new buffs, each card with its own rule running right under it:
// IRON CONTRACT's three days filling up, STORM RUNNER reading the weather,
// LUNAR TIDE's rate following the moon.

/** The lit part of a moon `p` of the way through its cycle (0 new, 0.5 full). */
const moonLitPath = (p: number, r: number, cx: number, cy: number) => {
  const waxing = p < 0.5;
  const k = Math.cos(2 * Math.PI * p); // 1 new … -1 full
  const rx = Math.abs(k) * r;
  const outer = waxing ? 1 : 0; // the lit limb: right while waxing
  const terminator = k > 0 === waxing ? 0 : 1; // crescent bulges toward the limb, gibbous away
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${outer} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${terminator} ${cx} ${cy - r} Z`;
};

const STORM_STEPS: Array<{ Icon: React.FC<{ className?: string }>; sky: string; temp: string; pays: boolean }> = [
  { Icon: Sun, sky: 'CLEAR', temp: '14°C', pays: false },
  { Icon: CloudRain, sky: 'RAIN', temp: '9°C', pays: true },
  { Icon: Cloud, sky: 'CLOUDY', temp: '3°C', pays: false },
  { Icon: Snowflake, sky: 'SNOW', temp: '−2°C', pays: true },
  { Icon: Sun, sky: 'CLEAR', temp: '−4°C', pays: true },
  { Icon: CloudLightning, sky: 'STORM', temp: '18°C', pays: true },
];

/** A buff card with its live demo hanging directly beneath it. */
const BuffDemoCard: React.FC<{ id: string; name: string; line: string; textMuted: string; children: React.ReactNode }> = ({
  id,
  name,
  line,
  textMuted,
  children,
}) => {
  const l = lookOf(id);
  return (
    <div className="flex flex-col border min-w-0" style={{ borderColor: `${l.accent}88` }}>
      <div className="flex items-center gap-2.5 p-2" style={{ background: l.tint }}>
        <BuffIcon itemId={id} className="w-9 h-9 shrink-0" />
        <span className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider truncate" style={{ color: l.accent }}>
            {name}
          </span>
          <span className={`block text-[9px] tracking-wider truncate ${textMuted}`}>{line}</span>
        </span>
      </div>
      <div className="flex-1 p-2 border-t flex flex-col justify-center gap-1.5" style={{ borderColor: `${l.accent}44` }}>
        {children}
      </div>
    </div>
  );
};

const NewBuffsFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => {
  const tick = useTicker(500);
  // IRON CONTRACT: 0-35 three days of 12 steps each, then a beat on the payout.
  const step = tick % 44;
  const iron = lookOf('iron_contract');
  const storm = STORM_STEPS[Math.floor(tick / 4) % STORM_STEPS.length];
  const stormLook = lookOf('storm_runner');
  // LUNAR TIDE: one lunation every 16 s, starting just past new moon.
  const phase = ((tick % 32) + 1) / 32;
  const lit = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const rate = Math.round(100 * lit);
  const lunar = lookOf('lunar_tide');
  return (
    // Three across only when the figure itself is wide enough (container
    // query): the demos need room, wherever the article is shown.
    <div className="@container p-3 font-mono" aria-hidden>
      <div className="grid grid-cols-1 @xl:grid-cols-3 gap-2">
        <BuffDemoCard id="iron_contract" name="IRON CONTRACT" line="3 DAYS × 5H · PAYS ×2" textMuted={textMuted}>
          {[0, 1, 2].map((d) => {
            const filled = Math.max(0, Math.min(12, step - d * 12));
            const done = filled >= 12;
            return (
              <div key={d} className="flex items-center gap-2 text-[8px] uppercase tracking-wider">
                <span className="w-9 shrink-0 font-bold">DAY {d + 1}</span>
                <span className="flex-1 h-1.5 bg-zinc-500/15">
                  <span
                    className="block h-full transition-[width] duration-300"
                    style={{ width: `${(filled / 12) * 100}%`, background: done ? '#34d399' : iron.accent }}
                  />
                </span>
                <span className="w-7 shrink-0 text-right tabular-nums" style={{ color: done ? '#34d399' : iron.accent }}>
                  {done ? '✓' : `${((filled / 12) * 5).toFixed(1)}h`}
                </span>
              </div>
            );
          })}
          <div className={`pt-1 border-t ${borderCol} flex items-center justify-between text-[8px] uppercase tracking-wider`}>
            <span className={textMuted}>STAKE 1,500</span>
            <span className={step >= 36 ? 'text-amber-400 font-bold' : textMuted}>{step >= 36 ? 'SEALED · +3,000' : 'DAY 3 PAYS +3,000'}</span>
          </div>
        </BuffDemoCard>

        <BuffDemoCard id="storm_runner" name="STORM RUNNER" line="RAIN · SNOW · <0°C · ×2" textMuted={textMuted}>
          <div className="flex items-center gap-3">
            <span
              className="w-11 h-11 shrink-0 flex items-center justify-center border transition-colors duration-300"
              style={{ borderColor: storm.pays ? stormLook.accent : undefined, color: storm.pays ? stormLook.accent : undefined }}
            >
              <storm.Icon className={`w-6 h-6 ${storm.pays ? '' : textMuted}`} />
            </span>
            <span className="min-w-0 text-[10px] uppercase tracking-wider">
              <span className="block font-bold">
                {storm.sky} · {storm.temp}
              </span>
              <span className="block text-[9px] font-bold" style={{ color: storm.pays ? stormLook.accent : undefined }}>
                {storm.pays ? '+100 BITS/H' : <span className={textMuted}>+0 · USUAL RATE</span>}
              </span>
            </span>
          </div>
          <div className="flex gap-1">
            {STORM_STEPS.map((w, i) => (
              <span
                key={i}
                className="flex-1 h-1"
                style={{ background: w.pays ? stormLook.accent : 'rgba(113,113,122,0.35)', opacity: w === storm ? 1 : 0.35 }}
              />
            ))}
          </div>
        </BuffDemoCard>

        <BuffDemoCard id="lunar_tide" name="LUNAR TIDE" line="UP TO ×2 AT FULL MOON" textMuted={textMuted}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 28 28" className="w-11 h-11 shrink-0">
              <circle cx="14" cy="14" r="12" fill="rgba(113,113,122,0.25)" />
              <path d={moonLitPath(phase, 12, 14, 14)} fill={lunar.accent} />
            </svg>
            <span className="min-w-0 text-[10px] uppercase tracking-wider">
              <span className="block font-bold">{lit > 0.97 ? 'FULL MOON' : lit < 0.03 ? 'NEW MOON' : phase < 0.5 ? 'WAXING' : 'WANING'}</span>
              <span className="block text-[9px] font-bold tabular-nums" style={{ color: rate > 2 ? lunar.accent : undefined }}>
                {rate > 2 ? `+${rate} BITS/H` : <span className={textMuted}>+{rate} BITS/H</span>}
              </span>
            </span>
          </div>
          <span className="block h-1 bg-zinc-500/15">
            <span className="block h-full transition-[width] duration-300" style={{ width: `${rate}%`, background: lunar.accent }} />
          </span>
        </BuffDemoCard>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------- buffs
// The buffs added after this figure's article (they have their own).
const LATER_BUFFS = ['storm_runner', 'lunar_tide', 'iron_contract'];
const BuffsFigure: React.FC<FigureContext> = ({ borderCol, isDark }) => {
  const ids = Object.keys(BUFF_ART).filter((id) => !LATER_BUFFS.includes(id));
  const tick = useTicker(900);
  const lit = ids[tick % ids.length];
  return (
    <div className="p-3 grid grid-cols-4 sm:grid-cols-6 gap-2 bg-zinc-950" aria-hidden>
      {ids.map((id) => {
        const look = lookOf(id);
        const on = id === lit;
        return (
          <span
            key={id}
            className={`relative aspect-square flex items-center justify-center border transition-colors duration-300 ${on ? '' : borderCol}`}
            style={{ background: on ? look.tint : isDark ? '#111114' : '#18181b', borderColor: on ? look.accent : undefined }}
          >
            <BuffIcon itemId={id} className={`w-3/5 h-3/5 transition-transform duration-300 ${on ? 'scale-110' : ''}`} />
            <span className="absolute -top-px -left-px px-1 text-[8px] font-bold leading-3.5 text-zinc-950" style={{ background: look.accent }}>
              {look.rank}
            </span>
          </span>
        );
      })}
    </div>
  );
};

// ----------------------------------------------------------------- pairs
// The buff + challenge pairs from the guide: a study style, the buff, the
// challenge next to it and the best case of the two together. One lights up
// at a time; the last card is the pair to avoid.
const PAIRS: Array<{ style: string; buff: string; buffName: string; ch: string; chName: string; kind: 'raid' | 'rival'; best: string; avoid?: boolean }> = [
  { style: '5H+ DAILY', buff: 'iron_contract', buffName: 'IRON CONTRACT', ch: 'orion', chName: 'ORION', kind: 'rival', best: '+2,300' },
  { style: 'LONG SITTINGS', buff: 'deep_dive', buffName: 'DEEP DIVE', ch: 'golem', chName: 'GOLEM', kind: 'raid', best: '+1,800' },
  { style: 'NIGHT OWL', buff: 'night_shift', buffName: 'NIGHT SHIFT', ch: 'nova', chName: 'NOVA', kind: 'rival', best: '+1,150' },
  { style: 'EARLY RISER', buff: 'early_bird', buffName: 'EARLY BIRD', ch: 'orion', chName: 'ORION', kind: 'rival', best: '+1,200' },
  { style: '50-MIN BLOCKS', buff: 'focus_chip', buffName: 'FOCUS CHIP', ch: 'kai', chName: 'KAI', kind: 'rival', best: '+1,100' },
  { style: 'ONE EXAM', buff: 'category_lock', buffName: 'CATEGORY LOCK', ch: 'warden', chName: 'WARDEN', kind: 'raid', best: '+900' },
  { style: 'LIGHT WEEK', buff: 'warm_up', buffName: 'WARM-UP', ch: 'mika', chName: 'MIKA', kind: 'rival', best: '+500' },
  { style: 'AVOID', buff: 'category_lock', buffName: 'CATEGORY LOCK', ch: 'hydra', chName: 'HYDRA', kind: 'raid', best: 'ONE CATEGORY VS THREE HEADS', avoid: true },
];
const PairsFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => {
  const tick = useTicker(1700);
  const lit = tick % PAIRS.length;
  return (
    <div className="@container p-3 font-mono" aria-hidden>
      <div className="grid grid-cols-2 @xl:grid-cols-4 gap-2">
        {PAIRS.map((p, i) => {
          const look = lookOf(p.buff);
          const accent = challengeAccent(p.ch);
          const on = i === lit;
          const art = p.kind === 'raid' ? BOSS_ART[p.ch] : RIVAL_ART[p.ch];
          const edge = p.avoid ? '#f43f5e' : look.accent;
          return (
            <div
              key={`${p.style}-${p.ch}`}
              className={`relative p-2 border flex flex-col gap-1.5 transition-all duration-500 ${on ? '' : borderCol}`}
              style={on ? { borderColor: edge, boxShadow: `0 0 0 1px ${edge}55, 0 0 16px ${edge}33`, background: p.avoid ? 'rgba(244,63,94,0.06)' : look.tint } : undefined}
            >
              <span className={`text-[8px] tracking-[0.25em] ${p.avoid ? 'text-rose-400 font-bold' : textMuted}`}>{p.style}</span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-10 h-10 flex items-center justify-center border" style={{ borderColor: `${look.accent}66`, background: look.tint }}>
                  <BuffIcon itemId={p.buff} className="w-7 h-7" />
                </span>
                <span className={`text-sm font-bold ${p.avoid ? 'text-rose-400' : textMuted}`}>{p.avoid ? '✕' : '+'}</span>
                <span className="w-10 h-10 flex items-end justify-center border bg-zinc-950" style={{ borderColor: `${accent}66` }}>
                  {art && <Pixel art={art} className={`w-9 h-9 ${on && !p.avoid ? 'ch-bob' : ''}`} />}
                </span>
              </div>
              <div className="text-center leading-tight">
                <div className="text-[8px] font-bold tracking-wider truncate" style={{ color: look.accent }}>
                  {p.buffName}
                </div>
                <div className="text-[8px] font-bold tracking-wider truncate" style={{ color: accent }}>
                  {p.kind === 'raid' ? 'RAID' : 'VS'} {p.chName}
                </div>
              </div>
              <div className={`mt-auto text-center text-[9px] font-bold tabular-nums ${p.avoid ? 'text-rose-400 text-[8px]' : 'text-amber-400'}`}>
                {p.avoid ? p.best : `BEST ${p.best}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------ challenges
// BOSS RAID on the left: each boss takes five hits (one a critical), goes
// down, and the next steps up. RIVAL on the right: the three rivals with
// what they might be doing right now.
const RAID_DEMO = ['golem', 'nightmare', 'hydra', 'warden', 'phantom', 'titan'];
const RAID_DEMO_NAMES: Record<string, string> = {
  golem: 'GOLEM',
  nightmare: 'NIGHTMARE',
  hydra: 'HYDRA',
  warden: 'WARDEN',
  phantom: 'PHANTOM',
  titan: 'TITAN',
};
const RAID_DEMO_HITS = [
  { share: 0.15, text: '−90' },
  { share: 0.3, text: 'CRIT −180' },
  { share: 0.12, text: '−75' },
  { share: 0.28, text: 'CRIT −165' },
  { share: 0.15, text: '−90' },
];
const RIVAL_DEMO = [
  { key: 'orion', name: 'ORION', tag: 'EARLY RISER', lines: ['STUDYING · LINEAR ALGEBRA · 0:42', 'ON A BREAK · ENGLISH IN 12M'] },
  { key: 'nova', name: 'NOVA', tag: 'NIGHT OWL', lines: ['ASLEEP · UP AT 11:00', 'STUDYING · ALGORITHMS · 1:05'] },
  { key: 'rush', name: 'RUSH', tag: 'CRAMMER', lines: ['OFF THE DESK · BACK AT 20:30', 'STUDYING · MOCK EXAM · 2:10'] },
];
type CastMember = { name: string; role: string; art: PixelArt; key: string };
const boss = (key: string, name: string): CastMember => ({ key, name, role: 'BOSS', art: BOSS_ART[key] });
const rival = (key: string, name: string, role = 'RIVAL'): CastMember => ({ key, name, role, art: RIVAL_ART[key] });

const FESTIVAL_CAST: Record<string, CastMember[]> = {
  newyear: [boss('kagami', 'KAGAMI'), rival('miko', 'MIKO')],
  setsubun: [boss('oni', 'ONI')],
  valentine: [boss('bitter', 'BITTER'), rival('choco', 'CHOCO')],
  hanami: [boss('fubuki', 'FUBUKI'), rival('sakura', 'SAKURA')],
  tanabata: [boss('river', 'RIVER OF HEAVEN'), rival('orihime', 'ORIHIME')],
  summer: [boss('august', 'AUGUST 31'), rival('copycat', '???', 'HIDDEN')],
  tsukimi: [boss('tsukuyomi', 'TSUKUYOMI'), rival('usagi', 'USAGI')],
  halloween: [boss('jack', 'JACK'), rival('ghost', '???', 'HIDDEN')],
  culture: [boss('stagefright', 'STAGE FRIGHT'), rival('iincho', 'IINCHO')],
  christmas: [boss('krampus', 'KRAMPUS'), rival('santa', 'SANTA'), rival('rudolph', '???', 'HIDDEN')],
};

/** One festival's challengers, as they appear in the exchange. */
const FestivalCastFigure: React.FC<FigureContext & { festival: string }> = ({ festival, borderCol, textMuted }) => {
  const cast = FESTIVAL_CAST[festival] ?? [];
  return (
    <div className="grid gap-px font-mono" style={{ gridTemplateColumns: `repeat(${cast.length}, minmax(0, 1fr))` }} aria-hidden>
      {cast.map((c, i) => {
        const accent = challengeAccent(c.key);
        const hidden = c.role === 'HIDDEN';
        return (
          <div key={c.key} className={`min-w-0 p-2 border ${borderCol} flex flex-col items-center gap-1`}>
            <div
              className="w-full h-28 flex items-end justify-center"
              style={{ background: `radial-gradient(ellipse 60% 60% at 50% 62%, ${hidden ? '#71717a' : accent}38, transparent 72%)` }}
            >
              <div className="ch-bob" style={{ animationDelay: `${i * -0.5}s` }}>
                <Pixel
                  art={c.art}
                  className="w-24 h-24"
                  style={hidden ? { filter: 'brightness(0) opacity(0.65)' } : { filter: `drop-shadow(0 0 8px ${accent}66)` }}
                />
              </div>
            </div>
            <div className="text-[11px] font-bold tracking-wider truncate max-w-full" style={{ color: hidden ? undefined : accent }}>
              {c.name}
            </div>
            <div className={`text-[10px] tracking-widest ${textMuted}`}>{c.role}</div>
          </div>
        );
      })}
    </div>
  );
};

const FESTIVAL_FACES: Array<[name: string, dates: string, art: PixelArt, key: string]> = [
  ['NEW YEAR', 'DEC 31 - JAN 3', BOSS_ART.kagami, 'kagami'],
  ['SETSUBUN', 'FEB 1 - 3', BOSS_ART.oni, 'oni'],
  ['VALENTINE', 'FEB 10 - 14', BOSS_ART.bitter, 'bitter'],
  ['HANAMI', 'MAR 25 - APR 10', BOSS_ART.fubuki, 'fubuki'],
  ['TANABATA', 'JUL 1 - 7', BOSS_ART.river, 'river'],
  ['SUMMER BREAK', 'AUGUST', BOSS_ART.august, 'august'],
  ['TSUKIMI', 'SEP 15 - 25', BOSS_ART.tsukuyomi, 'tsukuyomi'],
  ['HALLOWEEN', 'OCT 25 - 31', BOSS_ART.jack, 'jack'],
  ['CULTURE FESTIVAL', 'NOV 1 - 7', BOSS_ART.stagefright, 'stagefright'],
  ['CHRISTMAS', 'DEC 20 - 25', BOSS_ART.krampus, 'krampus'],
];

const FestivalsFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => (
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-px font-mono" aria-hidden>
    {FESTIVAL_FACES.map(([name, dates, art, key], i) => {
      const accent = challengeAccent(key);
      return (
        <div key={name} className={`min-w-0 p-2 border ${borderCol} flex flex-col items-center gap-1`}>
          <div
            className="w-full h-24 flex items-end justify-center"
            style={{ background: `radial-gradient(ellipse 60% 60% at 50% 62%, ${accent}33, transparent 72%)` }}
          >
            <div className="ch-bob" style={{ animationDelay: `${i * -0.4}s` }}>
              <Pixel art={art} className="w-20 h-20" style={{ filter: `drop-shadow(0 0 8px ${accent}55)` }} />
            </div>
          </div>
          <div className="text-[10px] font-bold tracking-wider truncate max-w-full" style={{ color: accent }}>
            {name}
          </div>
          <div className={`text-[10px] tabular-nums truncate max-w-full ${textMuted}`}>{dates}</div>
        </div>
      );
    })}
  </div>
);

const ChallengesFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => {
  const tick = useTicker(900);
  const per = RAID_DEMO_HITS.length + 2; // five hits, a beat down, a beat to swap
  const boss = RAID_DEMO[Math.floor(tick / per) % RAID_DEMO.length];
  const step = tick % per;
  const accent = challengeAccent(boss);
  const dealt = RAID_DEMO_HITS.slice(0, Math.min(step, RAID_DEMO_HITS.length)).reduce((s, h) => s + h.share, 0);
  const hp = Math.max(0, 1 - dealt);
  const hit = step >= 1 && step <= RAID_DEMO_HITS.length ? RAID_DEMO_HITS[step - 1] : null;
  const down = step > RAID_DEMO_HITS.length;
  const phase = Math.floor(tick / 6) % 2;
  return (
    <div className="@container font-mono" aria-hidden>
      <div className="grid @xl:grid-cols-[1fr_15rem]">
        <div
          className="relative h-56 flex flex-col items-center justify-end overflow-hidden"
          style={{ background: `radial-gradient(ellipse 60% 55% at 50% 58%, ${accent}26, transparent 70%), linear-gradient(#0c0c10, #050507)` }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ background: 'repeating-linear-gradient(transparent 0 2px, #fff 2px 3px)' }} />
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold text-zinc-950" style={{ background: accent }}>
            RAID
          </span>
          <span className="absolute top-2 right-2 text-[10px] font-bold tracking-[0.2em]" style={{ color: accent }}>
            {RAID_DEMO_NAMES[boss]}
          </span>
          <div className="relative mb-2">
            <div key={`${boss}-${step}`} className={hit ? 'ch-hit' : ''}>
              <div className={`ch-bob transition-opacity duration-500 ${down ? 'opacity-0' : ''}`}>
                <Pixel art={BOSS_ART[boss]} className="w-32 h-32" style={{ filter: `drop-shadow(0 0 16px ${accent}55)` }} />
              </div>
            </div>
            {hit && (
              <span
                key={`f-${tick}`}
                className="absolute left-1/2 top-4 ch-float font-bold tabular-nums whitespace-nowrap"
                style={{ color: hit.text.startsWith('CRIT') ? '#fde047' : '#fafafa', fontSize: hit.text.startsWith('CRIT') ? 20 : 15, textShadow: '0 2px 0 #000' }}
              >
                {hit.text}
              </span>
            )}
            {down && (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.4em] text-zinc-200 ch-in">TARGET DOWN</span>
            )}
          </div>
          <div className="w-full px-3 pb-3">
            <HpCells hp={hp * 100} max={100} accent={accent} cells={30} />
          </div>
        </div>
        <div className={`p-3 space-y-2 border-t @xl:border-t-0 @xl:border-l ${borderCol}`}>
          <div className={`text-[9px] uppercase tracking-[0.3em] ${textMuted}`}>RIVALS · RIGHT NOW</div>
          {RIVAL_DEMO.map((r, i) => {
            const a = challengeAccent(r.key);
            const line = r.lines[(phase + i) % 2];
            const studying = line.startsWith('STUDYING');
            const asleep = line.startsWith('ASLEEP');
            return (
              <div key={r.key} className="flex items-center gap-2 min-w-0">
                <span className="w-10 h-10 shrink-0 flex items-end justify-center border bg-zinc-950" style={{ borderColor: `${a}66` }}>
                  <Pixel art={RIVAL_ART[r.key]} className={`w-9 h-9 ${asleep ? 'opacity-40 grayscale' : ''}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold tracking-[0.15em]" style={{ color: a }}>
                    {r.name} <span className={`font-normal text-[8px] tracking-wider ${textMuted}`}>{r.tag}</span>
                  </span>
                  <span className="flex items-baseline gap-1.5 text-[9px] tracking-wider tabular-nums min-w-0">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${studying ? 'ch-pulse' : ''}`}
                      style={{ background: studying ? a : 'rgba(113,113,122,0.5)', color: a }}
                    />
                    <span className={`leading-snug ${studying ? '' : textMuted}`}>{line}</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------- buffguide
// Every buff on one map: up = the most it can pay back (a multiple of its
// price, read live from the shop so it follows any rebalance), right = what
// you stand to lose. The study styles from the guide cycle along the top
// and light up the buffs that fit; tap one to stop on it.

/** What a buff can cost you beyond its price; LUCK has no fixed payback. */
const GUIDE_RISKS = ['SAFE', 'TIMING', 'CAN END EARLY', 'ALL OR NOTHING', 'LUCK'] as const;
const GUIDE_BUFFS: Array<{ id: string; name: string; risk: number; line: string }> = [
  { id: 'warm_up', name: 'WARM-UP', risk: 0, line: '×2 ON 5H OVER 48H' },
  { id: 'category_lock', name: 'CATEGORY LOCK', risk: 0, line: '×2 ON ONE CATEGORY FOR 72H' },
  { id: 'deep_dive', name: 'DEEP DIVE', risk: 0, line: '2H +250 · 3H +450 · 4H +700' },
  { id: 'overclock', name: 'OVERCLOCK', risk: 1, line: '×2 ON 10H — WITHIN 24H' },
  { id: 'weekend_surge', name: 'WEEKEND SURGE', risk: 1, line: '+50/H · SAT + SUN ONLY' },
  { id: 'storm_runner', name: 'STORM RUNNER', risk: 1, line: 'RAIN · SNOW · STORM · <0°C' },
  { id: 'lunar_tide', name: 'LUNAR TIDE', risk: 1, line: 'THE RATE FOLLOWS THE MOON' },
  { id: 'night_shift', name: 'NIGHT SHIFT', risk: 1, line: '22–02 · +100 → +150 → +200' },
  { id: 'focus_chip', name: 'FOCUS CHIP', risk: 2, line: '+100 PER 50-MIN LOG · <25 MIN ENDS IT' },
  { id: 'early_bird', name: 'EARLY BIRD', risk: 2, line: '05–09 · ×3 · MISS A MORNING, IT ENDS' },
  { id: 'hyperdrive', name: 'HYPERDRIVE', risk: 2, line: '×2 ON 25H · 3H EVERY FULL DAY' },
  { id: 'iron_contract', name: 'IRON CONTRACT', risk: 3, line: '3 DAYS × 5H · MISS ONE, LOSE THE STAKE' },
  { id: 'lucky_byte', name: 'LUCKY BYTE', risk: 4, line: '1 LOG IN 5 PAYS TRIPLE' },
  { id: 'mystery_crate', name: 'MYSTERY CRATE', risk: 4, line: 'ONE RANDOM BUFF · AVG WORTH 822' },
];
// Paybacks as of November 2026, used until (or unless) the shop answers.
const GUIDE_PAYBACK_FALLBACK: Record<string, number> = {
  warm_up: 1.25, category_lock: 1.33, deep_dive: 1.87, overclock: 1.25, weekend_surge: 1.2, storm_runner: 1.25,
  lunar_tide: 1.33, night_shift: 1.5, focus_chip: 1.5, early_bird: 1.5, hyperdrive: 1.39, iron_contract: 2,
};
const GUIDE_STYLES: Array<{ label: string; ids: string[] }> = [
  { label: '5H+ DAILY', ids: ['iron_contract'] },
  { label: 'LONG SITTINGS', ids: ['deep_dive', 'hyperdrive'] },
  { label: 'NIGHT OWL', ids: ['night_shift'] },
  { label: 'EARLY RISER', ids: ['early_bird'] },
  { label: '50-MIN BLOCKS', ids: ['focus_chip'] },
  { label: 'ONE EXAM', ids: ['category_lock'] },
  { label: 'LIGHT WEEK', ids: ['warm_up', 'overclock'] },
  { label: 'TIMING & LUCK', ids: ['lunar_tide', 'storm_runner', 'weekend_surge', 'lucky_byte', 'mystery_crate'] },
];
const GUIDE_Y_MIN = 1;
const GUIDE_Y_MAX = 2.1;

const BuffGuideFigure: React.FC<FigureContext> = ({ borderCol, textMuted, isDark }) => {
  const [payback, setPayback] = useState<Record<string, number>>(GUIDE_PAYBACK_FALLBACK);
  useEffect(() => {
    let cancelled = false;
    api.bits
      .get()
      .then((state) => {
        if (cancelled) return;
        const live: Record<string, number> = {};
        for (const b of state.buffs) if (b.max_bonus && b.price) live[b.item_id] = b.max_bonus / b.price;
        if (Object.keys(live).length) setPayback((prev) => ({ ...prev, ...live }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const tick = useTicker(2600);
  const [picked, setPicked] = useState<number | null>(null);
  const styleIndex = picked ?? tick % GUIDE_STYLES.length;
  const style = GUIDE_STYLES[styleIndex];

  // Place each buff: its risk column, its payback height. Buffs that would
  // overlap (close paybacks in one column) are fanned out sideways, two rows
  // deep once there are more than two, so a cluster fits a narrow column.
  const spots = useMemo(() => {
    const out: Record<string, { col: number; y: number; offset: number; row: number }> = {};
    for (let col = 0; col < GUIDE_RISKS.length; col++) {
      const inCol = GUIDE_BUFFS.filter((b) => b.risk === col)
        .map((b) => ({ id: b.id, y: col === 4 ? 1.6 : payback[b.id] ?? GUIDE_Y_MIN }))
        .sort((a, b) => a.y - b.y);
      let cluster: typeof inCol = [];
      const flush = () => {
        const n = cluster.length;
        const perRow = n > 2 ? Math.ceil(n / 2) : n;
        const meanY = cluster.reduce((sum, c) => sum + c.y, 0) / Math.max(1, n);
        cluster.forEach((c, i) => {
          const inRow = Math.min(perRow, n - Math.floor(i / perRow) * perRow);
          out[c.id] =
            n > 2
              ? { col, y: meanY, offset: (i % perRow) - (inRow - 1) / 2, row: Math.floor(i / perRow) - 0.5 }
              : { col, y: c.y, offset: i - (n - 1) / 2, row: 0 };
        });
        cluster = [];
      };
      for (const item of inCol) {
        if (cluster.length && item.y - cluster[cluster.length - 1].y > 0.1) flush();
        cluster.push(item);
      }
      flush();
    }
    return out;
  }, [payback]);
  const yPct = (y: number) => 100 - ((Math.min(GUIDE_Y_MAX, y) - GUIDE_Y_MIN) / (GUIDE_Y_MAX - GUIDE_Y_MIN)) * 100;
  const colPct = (col: number) => ((col + 0.5) / GUIDE_RISKS.length) * 100;
  const ink = isDark ? '#a1a1aa' : '#71717a';

  return (
    <div className="@container p-3 space-y-2.5 font-mono">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Study styles">
        {GUIDE_STYLES.map((st, i) => (
          <button
            key={st.label}
            type="button"
            onClick={() => setPicked(picked === i ? null : i)}
            aria-pressed={i === styleIndex}
            className={`px-1.5 py-0.5 border text-[9px] tracking-wider cursor-pointer transition-colors ${
              i === styleIndex ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted} hover:text-emerald-400`
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5" aria-hidden>
        {/* Payback axis: as tall as the map itself, so the ticks line up. */}
        <div className={`relative w-7 shrink-0 h-52 sm:h-60 text-[8px] tabular-nums ${textMuted}`}>
          {[1, 1.5, 2].map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${yPct(v)}%` }}>
              {v.toFixed(1)}×
            </span>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`relative h-52 sm:h-60 border ${borderCol} overflow-hidden`}>
            {/* Risk columns */}
            {GUIDE_RISKS.map((r, col) => (
              <span
                key={r}
                className="absolute inset-y-0"
                style={{
                  left: `${(col / GUIDE_RISKS.length) * 100}%`,
                  width: `${100 / GUIDE_RISKS.length}%`,
                  background: col === 4 ? 'repeating-linear-gradient(135deg, rgba(113,113,122,0.08) 0 6px, transparent 6px 12px)' : col % 2 ? 'rgba(113,113,122,0.05)' : undefined,
                }}
              />
            ))}
            {/* Gridlines; 1.0× is break-even. */}
            {[1.5, 2].map((v) => (
              <span key={v} className="absolute inset-x-0 border-t border-dashed" style={{ top: `${yPct(v)}%`, borderColor: `${ink}33` }} />
            ))}
            <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: '#f43f5e88' }} />
            <span className="absolute left-1 bottom-0.5 text-[7px] tracking-wider text-rose-400/80">BREAK-EVEN</span>
            {GUIDE_BUFFS.map((b) => {
              const spot = spots[b.id];
              if (!spot) return null;
              const look = lookOf(b.id);
              const on = style.ids.includes(b.id);
              return (
                <span
                  key={b.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                  style={{
                    left: `calc(${colPct(spot.col)}% + ${spot.offset * 26}px)`,
                    top: `calc(${yPct(spot.y)}% + ${spot.row * 26}px)`,
                    zIndex: on ? 2 : 1,
                  }}
                >
                  <span
                    className={`flex items-center justify-center border transition-all duration-500 ${on ? 'w-7 h-7 @lg:w-9 @lg:h-9' : 'w-6 h-6 @lg:w-7 @lg:h-7'}`}
                    style={{
                      borderColor: on ? look.accent : `${look.accent}55`,
                      background: on ? look.tint : isDark ? '#111114' : '#fafafa',
                      boxShadow: on ? `0 0 12px ${look.accent}66` : undefined,
                      opacity: on ? 1 : 0.55,
                    }}
                  >
                    <BuffIcon itemId={b.id} className="w-4/5 h-4/5" />
                  </span>
                </span>
              );
            })}
          </div>
          {/* Risk axis */}
          <div className="flex mt-1">
            {GUIDE_RISKS.map((r) => (
              <span key={r} className={`flex-1 text-center text-[7px] sm:text-[8px] tracking-wider leading-tight ${textMuted}`}>
                {r}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 @lg:grid-cols-2 gap-1.5 min-h-[3.75rem]">
        {style.ids.map((id) => {
          const b = GUIDE_BUFFS.find((g) => g.id === id)!;
          const look = lookOf(id);
          const x = payback[id];
          return (
            <div key={id} className="flex items-center gap-2 p-1.5 border min-w-0" style={{ borderColor: `${look.accent}66`, background: look.tint }}>
              <BuffIcon itemId={id} className="w-7 h-7 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-wider truncate" style={{ color: look.accent }}>
                    {b.name}
                  </span>
                  <span className="text-[10px] font-bold tabular-nums shrink-0">{b.risk === 4 || !x ? 'LUCK' : `${x.toFixed(2)}×`}</span>
                </span>
                <span className={`block text-[8px] tracking-wider truncate ${textMuted}`}>{b.line}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ BITS
// The real header button (BitsBadge) between copies of its neighbours: the
// balance climbs each tick, so the "+N" floats exactly as it does live.
const BITS_GAINS = [100, 150, 75, 200, 50];
const BitsFigure: React.FC<FigureContext> = ({ borderCol, textMuted }) => {
  const tick = useTicker(1600);
  let balance = 4200;
  for (let i = 0; i < tick; i++) balance += BITS_GAINS[i % BITS_GAINS.length];
  const chip = `h-9 px-3 border ${borderCol} flex items-center gap-2 font-mono text-[11px]`;
  return (
    <div className="relative h-40 overflow-hidden flex flex-col items-center justify-center gap-4" aria-hidden>
      <div className="flex items-center gap-2 pointer-events-none">
        <span className={`${chip} hidden sm:flex`}>
          <Terminal className="w-4 h-4 text-emerald-400" />
          CMD
        </span>
        <span className={`${chip} ${textMuted}`}>
          <VolumeX className="w-4 h-4" />
          NOISE
        </span>
        {/* Each tick stands for one commit, so the gain floats like it does live. */}
        <BitsBadge balance={balance} ready gainSeq={tick} borderCol={borderCol} onOpen={() => {}} />
        <span className={`h-9 w-9 border ${borderCol} flex items-center justify-center`}>
          <ThemeToggleIcon showSun className="w-4 h-4" />
        </span>
      </div>
      <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-amber-400">
        <BitShard className="w-2.5 h-2.5" />
        100 BITS / HOUR · {balance.toLocaleString('en-US')} BITS
      </span>
    </div>
  );
};

// --------------------------------------------------------------- profile
const PROFILE_SAMPLE = ['style_night_owl', 'style_pomodoro', 'fuel_coffee', 'arch_tinkerer'];
const ProfileFigure: React.FC<FigureContext> = ({ borderCol, textMuted, bgCard }) => (
  <div className="p-3 pointer-events-none select-none" aria-hidden>
    <StatusRankList
      statuses={PROFILE_SAMPLE}
      onReorder={() => {}}
      onRemove={() => {}}
      groupLabelOf={(id) => getUserStatusOption(id)?.group.toUpperCase()}
      borderCol={borderCol}
      textMuted={textMuted}
      bgCard={bgCard}
    />
  </div>
);

// ------------------------------------------------------------- interface
const InterfaceFigure: React.FC<FigureContext> = ({ borderCol, textMuted, isDark }) => {
  const tick = useTicker(1300);
  const mode = tick % 2 ? 'timer' : 'manual';
  const range = ['week', '12w', '12m'][tick % 3];
  const seg = (keys: Array<[string, string]>, active: string) => (
    <div className={`relative flex border ${borderCol} text-[11px] font-mono`}>
      <SegmentIndicator activeKey={active} colorClass={isDark ? 'bg-zinc-100' : 'bg-zinc-900'} />
      {keys.map(([k, label]) => (
        <span
          key={k}
          data-seg-active={active === k}
          className={`px-3 py-1.5 seg-btn ${
            active === k ? (isDark ? 'text-zinc-900 font-semibold' : 'text-white font-semibold') : textMuted
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
  return (
    <div className="p-5 flex flex-wrap items-center justify-center gap-5" aria-hidden>
      {seg(
        [
          ['manual', 'MANUAL'],
          ['timer', 'STOPWATCH'],
        ],
        mode
      )}
      {seg(
        [
          ['week', 'WEEK'],
          ['12w', '12W'],
          ['12m', '12M'],
        ],
        range
      )}
      <span className={`h-9 w-9 border ${borderCol} flex items-center justify-center`}>
        <ThemeToggleIcon showSun={tick % 2 === 0} className="w-4 h-4" />
      </span>
    </div>
  );
};

// --------------------------------------------------------------- cursors
const CursorsFigure: React.FC = () => (
  <div className="p-3 grid grid-cols-8 sm:grid-cols-12 gap-1.5 bg-zinc-100" aria-hidden>
    {CURSOR_THEMES.filter((_, i) => i % 2 === 0)
      .slice(0, 36)
      .map((c) => (
        <span key={c.id} className="aspect-square flex items-center justify-center bg-white border border-zinc-200">
          <img src={c.src} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
        </span>
      ))}
  </div>
);

// -------------------------------------------------------------- terminal
// A replay of the real ⌘K palette (telemetryFeatures CommandPalette): the
// same input bar, quick-log strip, result rows and footer, with titles and
// descriptions taken from the live catalogs. Each scene types a command,
// lets the list narrow, then shows the green confirmation banner.
interface PaletteRow {
  tag: string;
  title: string;
  subtitle: string;
  badge: string;
  dim?: boolean;
}
interface PaletteScene {
  query: string;
  rows: PaletteRow[];
  banner: string;
}
const TYPE_TICKS_HOLD = 9;
const TYPE_TICKS_BANNER = 14;
const TYPE_TICKS_IDLE = 5;

const TerminalFigure: React.FC<FigureContext> = ({ borderCol, bgCard, textMuted, isDark }) => {
  const { t } = useI18n();
  const scenes = useMemo<PaletteScene[]>(() => {
    const face = getChronoThemeById('swiss-railway');
    const noise = NOISE_PROFILES.find((n) => n.id === 'brown');
    const knight = CURSOR_THEMES.find((c) => c.id === 'knight');
    const noir = CURSOR_THEMES.find((c) => c.id === 'knight-noir');
    const out: PaletteScene[] = [
      {
        query: 'face swiss',
        rows: [{ tag: 'CHRONOMETER', title: `${face.code} · ${face.name}`, subtitle: face.desc, badge: `face ${face.id}` }],
        banner: tf(t.tmFaceDone, { name: face.name }),
      },
    ];
    if (noise) {
      out.push({
        query: 'noise brown',
        rows: [{ tag: 'NOISE', title: `${noise.code} · ${noise.name}`, subtitle: noise.desc, badge: `noise ${noise.id}` }],
        banner: tf(t.tmNoiseDone, { name: noise.name }),
      });
    }
    if (knight) {
      const rows: PaletteRow[] = [{ tag: 'CURSOR', title: `${knight.code} · ${knight.name}`, subtitle: knight.desc, badge: `cursor ${knight.id}` }];
      if (noir) rows.push({ tag: 'CURSOR', title: `${noir.code} · ${noir.name}`, subtitle: noir.desc, badge: 'LOCKED', dim: true });
      out.push({ query: 'cursor knight', rows, banner: tf(t.tmCursorDone, { name: knight.name }) });
    }
    return out;
  }, [t]);

  const tick = useTicker(110);
  // Where the replay is: which scene, how much is typed, banner or not.
  const lengths = scenes.map((sc) => sc.query.length + TYPE_TICKS_HOLD + TYPE_TICKS_BANNER + TYPE_TICKS_IDLE);
  const cycle = lengths.reduce((a, b) => a + b, 0);
  let at = prefersReducedMotion() ? lengths[0] - TYPE_TICKS_IDLE - 1 : tick % cycle;
  let index = 0;
  while (at >= lengths[index]) {
    at -= lengths[index];
    index += 1;
  }
  const scene = scenes[index];
  const typed = scene.query.slice(0, Math.min(scene.query.length, at));
  const done = at >= scene.query.length;
  const banner = at >= scene.query.length + TYPE_TICKS_HOLD && at < scene.query.length + TYPE_TICKS_HOLD + TYPE_TICKS_BANNER;
  const rows = done ? scene.rows : [];

  return (
    <div className="p-3 sm:p-4 bg-black/60" aria-hidden>
      <div className={`border ${borderCol} ${bgCard} shadow-2xl font-mono overflow-hidden`}>
        <div className={`flex items-center px-4 py-3 border-b ${borderCol} gap-3`}>
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 min-w-0 text-xs sm:text-sm truncate">
            {typed ? (
              <>
                {typed}
                {!done && <span className="inline-block w-1.5 h-3.5 bg-emerald-400 align-middle ml-px animate-pulse" />}
              </>
            ) : (
              <span className="text-zinc-500">{tf(t.pcPlaceholder, { code: 'dev' })}</span>
            )}
          </span>
          {typed && <span className={`text-[10px] px-1.5 py-0.5 border ${borderCol} ${textMuted} shrink-0`}>{t.clearShort}</span>}
          <span className={`text-[10px] px-2 py-0.5 border ${borderCol} ${textMuted} shrink-0`}>ESC</span>
        </div>
        <div
          className={`px-4 py-2 border-b ${borderCol} ${
            isDark ? 'bg-zinc-900/50' : 'bg-zinc-100/80'
          } flex flex-wrap items-center justify-between gap-2 text-[10px]`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {t.pcCliQuickLog}
            </span>
            <span className={`px-1.5 py-0.5 border ${borderCol}`}>log 60m dev</span>
            <span className={`px-1.5 py-0.5 border ${borderCol}`}>help</span>
          </div>
          <span className={`hidden sm:inline ${textMuted}`}>{t.pcNavigate}</span>
        </div>
        {/* Fixed height for banner + up to two rows, so the replay never resizes the figure. */}
        <div className="h-[164px] overflow-hidden">
        {banner && (
          <div className="px-4 py-2.5 text-xs font-bold flex items-center gap-2 bg-emerald-500 text-zinc-950">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{scene.banner}</span>
          </div>
        )}
        <div className="divide-y divide-zinc-800/40">
          {rows.map((row, i) => (
            <div
              key={row.title}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${
                i === 0 ? (isDark ? 'bg-zinc-800/80 border-l-2 border-l-emerald-400' : 'bg-zinc-100 border-l-2 border-l-emerald-600') : ''
              }`}
            >
              <div className={`min-w-0 flex-1 space-y-0.5 ${row.dim ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1 border border-zinc-700 text-zinc-400 shrink-0">{row.tag}</span>
                  <span className="text-xs font-bold truncate">{row.title}</span>
                </div>
                <div className={`text-[10px] truncate ${textMuted}`}>{row.subtitle}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`hidden sm:inline text-[10px] px-2 py-0.5 border ${borderCol} ${textMuted}`}>{row.badge}</span>
                {i === 0 && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
            </div>
          ))}
        </div>
        </div>
        <div
          className={`px-4 py-2 border-t ${borderCol} ${
            isDark ? 'bg-zinc-950' : 'bg-zinc-50'
          } flex items-center justify-between gap-2 text-[10px] ${textMuted}`}
        >
          <span className="truncate">{t.pcFooter}</span>
          <span className="shrink-0">CMD+K / CTRL+K</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- chrono
const CHRONO_SAMPLE = ['swiss-railway', 'bauhaus-dial', 'radar-dial', 'roman-dial'];
const ChronoFigure: React.FC<FigureContext> = ({ isDark, borderCol }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-hidden>
      {CHRONO_SAMPLE.map((id) => (
        <div key={id} className={`border ${borderCol} p-2 flex items-center justify-center min-h-36 overflow-hidden`}>
          <ChronoDisplay
            theme={getChronoThemeById(id)}
            hh={now.getHours()}
            mm={now.getMinutes()}
            ss={now.getSeconds()}
            isDark={isDark}
          />
        </div>
      ))}
    </div>
  );
};

// --------------------------------------------------------------- ambient
// Drawn by the overlay's own renderer, so a tile looks exactly like the
// scene does in Ambient mode. The picks are chosen to look different from
// each other (the catalog's first / middle / last are all ring scenes).
const AMBIENT_SAMPLE = ['rain', 'sakura', 'synthwave', 'aurora', 'galaxy', 'crt'];
const AmbientTile: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useAmbientCanvas(ref, id, { fullscreen: false, animate: !prefersReducedMotion(), backdrop: '#0b0b10' });
  return (
    <figure className="m-0 relative bg-black">
      <canvas ref={ref} className="block w-full aspect-video" />
      <figcaption className="absolute left-1.5 bottom-1 text-[9px] font-mono tracking-wider text-white/80">{name}</figcaption>
    </figure>
  );
};
const AmbientFigure: React.FC = () => {
  const picks = AMBIENT_SAMPLE.map((id) => AMBIENT_THEMES.find((th) => th.id === id)).filter((th) => th !== undefined);
  return (
    <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2" aria-hidden>
      {picks.map((th) => (
        <AmbientTile key={th.id} id={th.id} name={th.name} />
      ))}
    </div>
  );
};

// -------------------------------------------------------------- surfaces
const SurfacesFigure: React.FC = () => {
  const step = Math.max(1, Math.floor(SURFACE_THEME_PAIRS.length / 48));
  const picks = SURFACE_THEME_PAIRS.filter((_, i) => i % step === 0).slice(0, 48);
  return (
    <div className="p-3 grid grid-cols-8 sm:grid-cols-12 gap-1" aria-hidden>
      {picks.map((pair) => (
        <span key={pair.id} className="aspect-square relative overflow-hidden" title={pair.name}>
          <span className="absolute inset-0" style={{ background: pair.dark.bgMain }} />
          <span className="absolute inset-0" style={{ background: pair.light.bgMain, clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
          <span className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2" style={{ background: pair.accentHex }} />
        </span>
      ))}
    </div>
  );
};

// ------------------------------------------------------------- clearance
const ClearanceFigure: React.FC<FigureContext> = ({ textMuted }) => {
  const bars = CLEARANCE_LEVELS.filter((_, i) => i % 25 === 0);
  return (
    <div className="p-4 space-y-2" aria-hidden>
      <div className="flex items-end gap-px h-32">
        {bars.map((lvl, i) => (
          <span
            key={lvl.level}
            className="flex-1"
            style={{ background: lvl.color, height: `${12 + (i / (bars.length - 1)) * 88}%` }}
          />
        ))}
      </div>
      <div className={`flex justify-between font-mono text-[9px] tracking-wider ${textMuted}`}>
        <span>LV.0001</span>
        <span>LV.{CLEARANCE_LEVELS.length.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- launch
const LaunchFigure: React.FC<FigureContext> = ({ textMuted }) => {
  const cols = 24;
  const level = (x: number, y: number) => {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const r = n - Math.floor(n);
    const ramp = x / cols;
    return r < 0.25 - ramp * 0.15 ? 0 : Math.min(4, Math.floor(r * 3 + ramp * 2));
  };
  const shades = ['bg-zinc-500/15', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-300'];
  return (
    <div className="p-4 space-y-2" aria-hidden>
      <div className="grid gap-0.75" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: 7 * cols }, (_, i) => {
          const x = Math.floor(i / 7);
          const y = i % 7;
          return <span key={i} className={`aspect-square ${shades[level(x, y)]}`} style={{ gridColumn: x + 1, gridRow: y + 1 }} />;
        })}
      </div>
      <div className={`font-mono text-[9px] tracking-wider ${textMuted}`}>STUDY CADENCE · 24 WEEKS</div>
    </div>
  );
};

// ---------------------------------------------------------------- frame
export const NewsFigure: React.FC<{ kind: FigureKind; caption?: string } & FigureContext> = ({ kind, caption, ...ctx }) => {
  const body = (() => {
    switch (kind) {
      case 'pairs':
        return <PairsFigure {...ctx} />;
      case 'festivals':
        return <FestivalsFigure {...ctx} />;
      case 'fest-newyear':
      case 'fest-setsubun':
      case 'fest-valentine':
      case 'fest-hanami':
      case 'fest-tanabata':
      case 'fest-summer':
      case 'fest-tsukimi':
      case 'fest-halloween':
      case 'fest-culture':
      case 'fest-christmas':
        return <FestivalCastFigure {...ctx} festival={kind.slice(5)} />;
      case 'starlight':
        return <StarlightSky starlight={{ stars: 9, max: 14, cost: 7, guard_on: true, days: [], last_guard: null }} />;
      case 'challenges':
        return <ChallengesFigure {...ctx} />;
      case 'buffguide':
        return <BuffGuideFigure {...ctx} />;
      case 'packs6':
        return <FurnitureFigure {...ctx} pick={isNewPackId} swatchBase="cyber_holo_vending" />;
      case 'newbuffs':
        return <NewBuffsFigure {...ctx} />;
      case 'kpis':
        return <KpisFigure {...ctx} />;
      case 'rhythm':
        return <RhythmFigure {...ctx} />;
      case 'bitsreset':
        return <BitsResetFigure {...ctx} />;
      case 'bitsbutton':
        return <BitsButtonFigure {...ctx} />;
      case 'furniture':
        return <FurnitureFigure {...ctx} />;
      case 'buffs':
        return <BuffsFigure {...ctx} />;
      case 'bits':
        return <BitsFigure {...ctx} />;
      case 'profile':
        return <ProfileFigure {...ctx} />;
      case 'interface':
        return <InterfaceFigure {...ctx} />;
      case 'cursors':
        return <CursorsFigure />;
      case 'terminal':
        return <TerminalFigure {...ctx} />;
      case 'chrono':
        return <ChronoFigure {...ctx} />;
      case 'forecast':
        return (
          <div className="p-3 max-w-md mx-auto">
            <MoonPhaseCalendar timeZone={ctx.timeZone} weekStart={ctx.weekStart} textMuted={ctx.textMuted} isDark={ctx.isDark} />
          </div>
        );
      case 'ambient':
        return <AmbientFigure />;
      case 'surfaces':
        return <SurfacesFigure />;
      case 'clearance':
        return <ClearanceFigure {...ctx} />;
      case 'launch':
        return <LaunchFigure {...ctx} />;
    }
  })();
  return (
    <figure className={`m-0 border ${ctx.borderCol} overflow-hidden`}>
      {body}
      {caption && (
        <figcaption className={`px-3 py-1.5 border-t ${ctx.borderCol} text-[10px] font-sans ${ctx.textMuted}`}>{caption}</figcaption>
      )}
    </figure>
  );
};
