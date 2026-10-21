import React, { useMemo } from 'react';
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
const MoonIcon: React.FC<{ fraction: number; size: number; isDark: boolean; className?: string }> = ({
  fraction,
  size,
  isDark,
  className,
}) => {
  const r = size / 2;
  const litColor = isDark ? '#e4e4e7' : '#52525b';
  const shadowColor = isDark ? '#52525b' : '#d4d4d8';
  const ringColor = isDark ? '#27272a' : '#a1a1aa';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`shrink-0 ${className ?? ''}`} aria-hidden="true">
      <circle cx={r} cy={r} r={r - 0.5} fill={shadowColor} />
      <path d={moonLitPath(fraction, r)} fill={litColor} />
      <circle cx={r} cy={r} r={r - 0.5} fill="none" stroke={ringColor} strokeWidth={1} />
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

      <div className="pt-3 space-y-3 font-mono">
        <div className={`flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider ${textMuted}`}>
          <span className="flex items-center gap-2 text-sm normal-case tracking-normal">
            <MoonIcon fraction={todayFraction} size={26} isDark={isDark} />
            <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{t[PHASE_KEYS[todayPhaseIdx]]}</span>
          </span>
          <span className="tabular-nums">{tf(t.moonIlluminated, { pct: illuminated })}</span>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[10px] text-zinc-500">
            {orderedWeekdayLabels(t.weekdaysShortSun, weekStart).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }).map((_, idx) => (
              <div key={`empty-lead-${idx}`} className="h-11 border border-transparent opacity-0 pointer-events-none" />
            ))}
            {cells.map((cell) => {
              const isToday = cell.day === today;
              return (
                <div
                  key={cell.day}
                  title={t[PHASE_KEYS[cell.phaseIdx]]}
                  className={`p-1.5 border text-[9px] flex flex-col items-center justify-between h-11 transition-colors ${
                    isToday
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400 font-semibold'
                      : isDark
                      ? 'bg-zinc-900/50 border-zinc-800/80 text-zinc-500'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                  }`}
                >
                  <span className="opacity-80 self-start">{cell.day}</span>
                  <MoonIcon fraction={cell.fraction} size={16} isDark={isDark} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-3 mt-3 border-t text-[10px] font-mono ${
          isDark ? 'border-zinc-800/50' : 'border-zinc-200'
        }`}
      >
        <span className={`flex items-center gap-1.5 ${textMuted}`}>
          <MoonIcon fraction={0.5} size={13} isDark={isDark} />
          <span className="uppercase tracking-wider">{t.moonNextFull}</span>
          <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{shortDate(nextFull)}</span>
        </span>
        <span className={`flex items-center gap-1.5 ${textMuted}`}>
          <MoonIcon fraction={0} size={13} isDark={isDark} />
          <span className="uppercase tracking-wider">{t.moonNextNew}</span>
          <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{shortDate(nextNew)}</span>
        </span>
      </div>
    </>
  );
};
