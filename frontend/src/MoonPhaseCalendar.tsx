import React, { useId, useMemo } from 'react';
import { Moon } from 'lucide-react';
import { getZonedParts, tf, useI18n, type Dict } from './i18n';
import { orderedWeekdayLabels, weekdayPosition, type WeekStart } from './week';

// Pure client-side moon-phase math (no API, no key, nothing to go stale):
// a synodic month is ~29.53 days, so the phase at any date is just how far
// that date sits past a known reference new moon, wrapped into one cycle.
const SYNODIC_MONTH_DAYS = 29.530588853;
const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

/** 0 = new moon, 0.5 = full moon, wrapping back to 1 = next new moon. */
function moonFraction(date: Date): number {
  const diffDays = (date.getTime() - REF_NEW_MOON_MS) / 86_400_000;
  const age = diffDays % SYNODIC_MONTH_DAYS;
  return (age < 0 ? age + SYNODIC_MONTH_DAYS : age) / SYNODIC_MONTH_DAYS;
}

/** Buckets the continuous phase into the 8 traditional phases, centered on New/Full. */
function moonPhaseIndex(fraction: number): number {
  return Math.floor(((fraction + 1 / 16) % 1) * 8);
}

/** Illuminated-fraction approximation (0-100%) from the phase angle. */
function moonIllumination(fraction: number): number {
  return Math.round((1 - Math.cos(2 * Math.PI * fraction)) * 50);
}

// The lit silhouette for a given phase is the classic two-arc SVG trick:
// an outer half-circle (right side lit while waxing, left while waning —
// flips at the new/full midpoint) joined to an inner ellipse arc whose
// x-radius shrinks to 0 at the quarters and back out to the full radius at
// new/full moon. That inner arc's bulge side flips at the *quarters*, not
// at the half-cycle point — it tracks the sign of cos(theta), so it stays
// on the outer arc's side while carving a crescent out of it (new moon ->
// first/third quarter) and flips to the far side once more than half the
// disk is lit (quarter -> full/new), continuing to grow the shape past a
// half circle toward a full one.
function moonLitPath(fraction: number, r: number): string {
  const theta = fraction * 2 * Math.PI;
  const cosTheta = Math.cos(theta);
  const rx = Math.abs(r * cosTheta);
  const outerRight = fraction < 0.5;
  const innerRight = cosTheta >= 0 ? outerRight : !outerRight;
  const outerSweep = outerRight ? 1 : 0;
  const innerSweep = innerRight ? 0 : 1;
  return `M ${r} 0 A ${r} ${r} 0 0 ${outerSweep} ${r} ${2 * r} A ${rx} ${r} 0 0 ${innerSweep} ${r} 0 Z`;
}

// A hand-drawn disk instead of the Unicode moon emoji: the emoji is a fixed
// bitmap glyph (same colors in light or dark mode), which is why it reads
// as a sticker dropped onto an otherwise flat, line-icon dashboard. This
// draws the shadow as a real (non-transparent, non-background-matched)
// muted fill, so it looks correct over any background — the calendar's
// plain cells, the emerald "today" highlight, or the panel headline — in
// both themes, the same way every other themed color in this file works.
// The lit side is a radial gradient (limb darkening) so the disk reads as a
// sphere.

const MoonIcon: React.FC<{ fraction: number; size: number; isDark: boolean; glow?: boolean; className?: string }> = ({
  fraction,
  size,
  isDark,
  glow,
  className,
}) => {
  const id = useId().replace(/:/g, '');
  const r = size / 2;
  // The lit side stays the lighter tone in both themes — inverting it for
  // light mode made a full moon read as a dark disk (i.e. a new moon). The
  // light-mode ring is what separates a white full moon from the pale cells.
  const litHi = isDark ? '#fafafa' : '#ffffff';
  const litLo = isDark ? '#b4b4bb' : '#d4d4d8';
  const shadowColor = isDark ? '#3f3f46' : '#a1a1aa';
  const ringColor = isDark ? '#52525b' : '#71717a';
  const litPath = moonLitPath(fraction, r);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 overflow-visible ${className ?? ''}`}
      style={glow ? { filter: `drop-shadow(0 0 ${Math.max(3, size / 5)}px ${isDark ? 'rgba(250,250,250,0.35)' : 'rgba(245,158,11,0.35)'})` } : undefined}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-lit`} cx="42%" cy="40%" r="65%">
          <stop offset="0%" stopColor={litHi} />
          <stop offset="70%" stopColor={litHi} stopOpacity={0.94} />
          <stop offset="100%" stopColor={litLo} />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 0.5} fill={shadowColor} />
      <path d={litPath} fill={`url(#${id}-lit)`} />
      <circle cx={r} cy={r} r={r - 0.5} fill="none" stroke={ringColor} strokeOpacity={isDark ? 0.7 : 1} strokeWidth={1} />
    </svg>
  );
};

const PHASE_KEYS = [
  'moonPhaseNew',
  'moonPhaseWaxingCrescent',
  'moonPhaseFirstQuarter',
  'moonPhaseWaxingGibbous',
  'moonPhaseFull',
  'moonPhaseWaningGibbous',
  'moonPhaseLastQuarter',
  'moonPhaseWaningCrescent',
] as const satisfies readonly (keyof Dict)[];

const FULL_IDX = 4;
const NEW_IDX = 0;

const daysInMonth = (year: number, month1to12: number): number => new Date(year, month1to12, 0).getDate();

/** First day (1+ days out) whose phase bucket matches `targetIdx`. */
function nextPhaseDate(fromYear: number, fromMonth1to12: number, fromDay: number, targetIdx: number): Date {
  for (let i = 1; i <= 35; i++) {
    const d = new Date(fromYear, fromMonth1to12 - 1, fromDay + i, 12, 0, 0);
    if (moonPhaseIndex(moonFraction(d)) === targetIdx) return d;
  }
  // Unreachable in practice (a synodic month is ~29.5 days), but keeps the
  // return type total.
  return new Date(fromYear, fromMonth1to12 - 1, fromDay + 29, 12, 0, 0);
}

interface MoonPhaseCalendarProps {
  timeZone: string;
  weekStart: WeekStart;
  textMuted: string;
  isDark: boolean;
}

export const MoonPhaseCalendar: React.FC<MoonPhaseCalendarProps> = ({ timeZone, weekStart, textMuted, isDark }) => {
  const { t } = useI18n();
  const { year, month, day: today } = useMemo(() => getZonedParts(new Date(), timeZone), [timeZone]);

  const todayFraction = useMemo(() => moonFraction(new Date(year, month - 1, today, 12, 0, 0)), [year, month, today]);
  const todayPhaseIdx = moonPhaseIndex(todayFraction);
  const illuminated = moonIllumination(todayFraction);

  const nextFull = useMemo(() => nextPhaseDate(year, month, today, FULL_IDX), [year, month, today]);
  const nextNew = useMemo(() => nextPhaseDate(year, month, today, NEW_IDX), [year, month, today]);
  const shortDate = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
  const daysUntil = (d: Date) => Math.round((d.getTime() - new Date(year, month - 1, today, 12, 0, 0).getTime()) / 86_400_000);

  const cells = useMemo(
    () =>
      Array.from({ length: daysInMonth(year, month) }, (_, i) => {
        const dayNum = i + 1;
        const fraction = moonFraction(new Date(year, month - 1, dayNum, 12, 0, 0));
        return { day: dayNum, fraction, phaseIdx: moonPhaseIndex(fraction) };
      }),
    [year, month]
  );
  const leadingBlanks = weekdayPosition(new Date(year, month - 1, 1).getDay(), weekStart);
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)),
    [year, month]
  );

  return (
    <>
      <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
        <div className="flex items-center space-x-2">
          <Moon className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">{t.moonCalendarTitle}</h2>
        </div>
        <span className={`font-mono text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{monthLabel}</span>
      </div>

      {/* flex-1 down to the grid: when the panel is stretched to line up with the
          other column (desktop), the extra height goes into taller day cells. */}
      <div className="pt-3 space-y-3 font-mono flex-1 flex flex-col">
        <div className="flex items-center gap-4">
          <MoonIcon fraction={todayFraction} size={40} isDark={isDark} glow={illuminated >= 40} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-sm font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{t[PHASE_KEYS[todayPhaseIdx]]}</span>
              <span className={`text-[10px] uppercase tracking-wider tabular-nums shrink-0 ${textMuted}`}>
                {tf(t.moonAge, { n: (todayFraction * SYNODIC_MONTH_DAYS).toFixed(1) })}
              </span>
            </div>
            {/* Where today sits in the lunation: new → full → new */}
            <div className="relative h-2.5 mx-[5px]">
              <div className={`absolute inset-x-0 top-1/2 h-px ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
              <div
                className={`absolute left-0 top-1/2 h-px ${isDark ? 'bg-emerald-400/70' : 'bg-emerald-600/70'}`}
                style={{ width: `${todayFraction * 100}%` }}
              />
              {[0, 0.5, 1].map((at) => (
                <span key={at} className="absolute top-1/2 flex w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2" style={{ left: `${at * 100}%` }}>
                  <MoonIcon fraction={at % 1} size={10} isDark={isDark} />
                </span>
              ))}
              <span
                className={`absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rotate-45 ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`}
                style={{ left: `${todayFraction * 100}%` }}
              />
            </div>
            <div className={`text-[10px] uppercase tracking-wider tabular-nums ${textMuted}`}>{tf(t.moonIlluminated, { pct: illuminated })}</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className={`grid grid-cols-7 gap-1 mb-1 text-center text-[9px] uppercase tracking-widest ${textMuted}`}>
            {orderedWeekdayLabels(t.weekdaysShortSun, weekStart).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1">
            {Array.from({ length: leadingBlanks }).map((_, idx) => (
              <div key={`empty-lead-${idx}`} className="min-h-8 pointer-events-none" />
            ))}
            {cells.map((cell) => {
              const isToday = cell.day === today;
              const isPast = cell.day < today;
              const isFull = cell.phaseIdx === FULL_IDX;
              return (
                <div
                  key={cell.day}
                  title={`${t[PHASE_KEYS[cell.phaseIdx]]} · ${moonIllumination(cell.fraction)}%`}
                  className={`relative flex items-center justify-center pt-2 pb-0.5 min-h-8 transition-colors ${
                    isToday
                      ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/60'
                      : isDark
                      ? isPast
                        ? 'bg-zinc-900/30 hover:bg-zinc-800/50'
                        : 'bg-zinc-900/60 hover:bg-zinc-800/60'
                      : isPast
                      ? 'bg-zinc-50 hover:bg-zinc-100'
                      : 'bg-zinc-100 hover:bg-zinc-200/70'
                  }`}
                  style={
                    isFull && !isToday
                      ? {
                          backgroundImage: `radial-gradient(circle at 50% 60%, ${
                            isDark ? 'rgba(250,250,250,0.08)' : 'rgba(245,158,11,0.12)'
                          }, transparent 70%)`,
                        }
                      : undefined
                  }
                >
                  <span
                    className={`absolute top-0.5 left-1 text-[8px] leading-none tabular-nums ${
                      isToday
                        ? `font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`
                        : isPast
                        ? isDark
                          ? 'text-zinc-600'
                          : 'text-zinc-400'
                        : isDark
                        ? 'text-zinc-400'
                        : 'text-zinc-600'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <MoonIcon
                    fraction={cell.fraction}
                    size={14}
                    isDark={isDark}
                    glow={isFull}
                    className={isPast && !isToday ? 'opacity-50' : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-2.5 mt-3 border-t text-[10px] font-mono ${
          isDark ? 'border-zinc-800/50' : 'border-zinc-200'
        }`}
      >
        <span className={`flex items-center gap-1.5 ${textMuted}`}>
          <MoonIcon fraction={0.5} size={13} isDark={isDark} />
          <span className="uppercase tracking-wider">{t.moonNextFull}</span>
          <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{shortDate(nextFull)}</span>
          <span className="tabular-nums">· {daysUntil(nextFull)}D</span>
        </span>
        <span className={`flex items-center gap-1.5 ${textMuted}`}>
          <MoonIcon fraction={0} size={13} isDark={isDark} />
          <span className="uppercase tracking-wider">{t.moonNextNew}</span>
          <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{shortDate(nextNew)}</span>
          <span className="tabular-nums">· {daysUntil(nextNew)}D</span>
        </span>
      </div>
    </>
  );
};
