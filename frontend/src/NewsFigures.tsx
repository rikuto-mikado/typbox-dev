import React, { useEffect, useRef, useState } from 'react';
import { AMBIENT_THEMES, createAmbientScene } from './ambientThemes';
import { BitShard } from './BitsBadge';
import { ChronoDisplay } from './ChronometerFace';
import { getChronoThemeById } from './chronometerThemes';
import { CURSOR_THEMES } from './cursorThemes';
import { MoonPhaseCalendar } from './MoonPhaseCalendar';
import { SegmentIndicator } from './SegmentIndicator';
import { StatusRankList } from './StatusRankList';
import { CLEARANCE_LEVELS, SURFACE_THEME_PAIRS } from './telemetryFeatures';
import { ThemeToggleIcon } from './ThemeToggleIcon';
import { tf, useI18n } from './i18n';
import { getUserStatusOption } from './userStatus';
import type { WeekStart } from './week';

// Lead images for NEWS articles, drawn live from the app's own parts and
// assets (real cursors, real chronometer faces, real theme colours, the
// real ambient scenes) rather than screenshots, so they always match the
// app. Motion pauses under prefers-reduced-motion.

export type FigureKind =
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

// ------------------------------------------------------------------ BITS
const BitsFigure: React.FC = () => {
  const tick = useTicker(1400);
  const gains = [100, 150, 75, 200, 50];
  return (
    <div className="relative h-44 bg-zinc-950 overflow-hidden flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="relative">
          <BitShard key={tick} className="w-16 h-16 bits-shard-pop" />
          <span
            key={`g-${tick}`}
            className="bits-gain absolute left-1/2 -top-2 -translate-x-1/2 whitespace-nowrap text-amber-400 font-bold text-sm tabular-nums"
          >
            +{gains[tick % gains.length]}
          </span>
        </span>
        <span className="font-mono text-[10px] tracking-[0.2em] text-amber-400">100 BITS / HOUR</span>
      </div>
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
// Replies use the terminal's own strings (tm*Done), so the figure reads like the real thing.
const TerminalFigure: React.FC = () => {
  const { t } = useI18n();
  const TERMINAL_LINES: Array<[cmd: string, out: string]> = [
    ['help', 'font · noise · face · surface · ambient · cursor · goto'],
    ['face swiss railway', tf(t.tmFaceDone, { name: 'SWISS RAILWAY' })],
    ['noise brown', tf(t.tmNoiseDone, { name: 'DEEP BROWN NOISE' })],
    ['cursor knight', tf(t.tmCursorDone, { name: 'KNIGHT' })],
  ];
  const tick = useTicker(900);
  const shown = prefersReducedMotion() ? TERMINAL_LINES.length : (tick % (TERMINAL_LINES.length + 2)) + 1;
  return (
    <div className="bg-zinc-950 text-zinc-200 font-mono text-[11px] p-4 h-44 overflow-hidden" aria-hidden>
      <div className="flex gap-1.5 mb-3">
        <span className="w-2 h-2 bg-rose-500" />
        <span className="w-2 h-2 bg-amber-400" />
        <span className="w-2 h-2 bg-emerald-500" />
      </div>
      {TERMINAL_LINES.slice(0, shown).map(([cmd, out]) => (
        <div key={cmd} className="space-y-0.5 mb-1.5">
          <div>
            <span className="text-emerald-400">typbox ❯ </span>
            {cmd}
          </div>
          <div className="text-zinc-500">{out}</div>
        </div>
      ))}
      <span className="inline-block w-2 h-3 bg-emerald-400 animate-pulse align-middle" />
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
const AmbientTile: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = (canvas.width = canvas.clientWidth || 200);
    const h = (canvas.height = canvas.clientHeight || 120);
    const frame = createAmbientScene(id, w, h);
    let raf = 0;
    let last = performance.now();
    const start = last;
    const loop = (now: number) => {
      frame(ctx, (now - start) / 1000, (now - last) / 1000);
      last = now;
      raf = requestAnimationFrame(loop);
    };
    if (prefersReducedMotion()) frame(ctx, 2, 0);
    else raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return (
    <figure className="m-0 relative bg-black">
      <canvas ref={ref} className="block w-full h-28" />
      <figcaption className="absolute left-1.5 bottom-1 text-[9px] font-mono tracking-wider text-white/80">{name}</figcaption>
    </figure>
  );
};
const AmbientFigure: React.FC = () => {
  const picks = [0, Math.floor(AMBIENT_THEMES.length / 2), AMBIENT_THEMES.length - 1].map((i) => AMBIENT_THEMES[i]);
  return (
    <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2" aria-hidden>
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
      case 'bits':
        return <BitsFigure />;
      case 'profile':
        return <ProfileFigure {...ctx} />;
      case 'interface':
        return <InterfaceFigure {...ctx} />;
      case 'cursors':
        return <CursorsFigure />;
      case 'terminal':
        return <TerminalFigure />;
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
