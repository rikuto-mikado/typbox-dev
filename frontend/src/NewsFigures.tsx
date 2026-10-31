import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CornerDownLeft, Terminal, VolumeX, Zap } from 'lucide-react';
import { AMBIENT_THEMES } from './ambientThemes';
import { useAmbientCanvas } from './useAmbientCanvas';
import { api } from './api';
import { BitsBadge, BitShard } from './BitsBadge';
import { BUFF_ART, lookOf } from './buffArt';
import { BuffIcon } from './BuffIcon';
import { PACK_ART } from './roomArtPacks';
import { thumbnail, type FurnitureSpec } from './roomRender';
import { ChronoDisplay } from './ChronometerFace';
import { getChronoThemeById } from './chronometerThemes';
import { CURSOR_THEMES } from './cursorThemes';
import { MoonPhaseCalendar } from './MoonPhaseCalendar';
import { SegmentIndicator } from './SegmentIndicator';
import { StatusRankList } from './StatusRankList';
import { CLEARANCE_LEVELS, NOISE_PROFILES, SURFACE_THEME_PAIRS } from './telemetryFeatures';
import { ThemeToggleIcon } from './ThemeToggleIcon';
import { tf, useI18n } from './i18n';
import { getUserStatusOption } from './userStatus';
import type { WeekStart } from './week';

// Lead images for NEWS articles, drawn live from the app's own parts and
// assets (real cursors, real chronometer faces, real theme colours, the
// real ambient scenes) rather than screenshots, so they always match the
// app. Motion pauses under prefers-reduced-motion.

export type FigureKind =
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
        <BitsBadge balance={0} ready={false} borderCol={borderCol} onOpen={() => {}} />
        <BitsBadge
          balance={0}
          ready={false}
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
const SWATCH_BASE = 'fridge_tall';
const FurnitureFigure: React.FC<FigureContext> = ({ borderCol, textMuted, isDark }) => {
  const tick = useTicker(2600);
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
  if (!catalog) return <div className="h-64" />;
  const byId = new Map(catalog.map((spec) => [spec.id, spec]));
  const designs = Object.keys(PACK_ART)
    .map((id) => byId.get(id))
    .filter((spec): spec is FurnitureSpec => spec !== undefined && spec.layer !== 'wall_paint' && spec.layer !== 'floor_paint');
  const pages = Math.max(1, Math.ceil(designs.length / SHELF_SIZE));
  const page = designs.slice((tick % pages) * SHELF_SIZE, (tick % pages) * SHELF_SIZE + SHELF_SIZE);
  const swatches = catalog.filter((spec) => spec.id === SWATCH_BASE || spec.base === SWATCH_BASE);
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

// ----------------------------------------------------------------- buffs
const BuffsFigure: React.FC<FigureContext> = ({ borderCol, isDark }) => {
  const ids = Object.keys(BUFF_ART);
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
        <BitsBadge balance={balance} ready borderCol={borderCol} onOpen={() => {}} />
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
