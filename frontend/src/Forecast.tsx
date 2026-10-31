import React, { useMemo } from 'react';
import { Info, Telescope } from 'lucide-react';
import { tf, useI18n } from './i18n';
import { addDays, parseDateStr } from './week';
import { CLEARANCE_LEVELS, CYCLE_HOURS, type ClearanceLevel, type UserClearanceStatus } from './telemetryFeatures';

// Pure client-side projection (no API): the last 28 days of logs set a pace,
// and the slowest / fastest of those four weeks bound how far it might
// drift. Everything is measured in hours of the displayed Clearance cycle,
// so the targets line up with the ranks, milestones and divisions.

const PACE_DAYS = 28;
const PAST_DAYS = 56;
const MIN_FUTURE_DAYS = 14;
const MAX_FUTURE_DAYS = 120;
const DEFAULT_FUTURE_DAYS = 28;
// Past this the ETA stops being a date anyone can plan around.
const MAX_ETA_DAYS = 3650;

interface ForecastLog {
  date: string;
  durationMinutes: number;
}

interface ForecastProps {
  logs: ForecastLog[];
  todayStr: string;
  clearance: UserClearanceStatus;
  textMuted: string;
  isDark: boolean;
}

type TargetKind = 'rank' | 'milestone' | 'division' | 'cycle';

interface Target {
  kind: TargetKind;
  level: ClearanceLevel;
  hoursLeft: number;
}

const daysToCover = (hours: number, perDay: number): number | null =>
  perDay > 0 ? Math.max(1, Math.ceil(hours / perDay)) : null;

const pad4 = (n: number) => String(n).padStart(4, '0');

export const Forecast: React.FC<ForecastProps> = ({ logs, todayStr, clearance, textMuted, isDark }) => {
  const { t } = useI18n();

  const pace = useMemo(() => {
    const byDate = new Map<string, number>();
    let firstDate: string | null = null;
    for (const l of logs) {
      byDate.set(l.date, (byDate.get(l.date) ?? 0) + l.durationMinutes);
      if (!firstDate || l.date < firstDate) firstDate = l.date;
    }
    const minutesOn = (offset: number) => byDate.get(addDays(todayStr, -offset)) ?? 0;
    // Days of history that actually exist, so a two-week-old account isn't
    // averaged over 28 days it never had.
    const historyDays = firstDate
      ? Math.round((parseDateStr(todayStr).getTime() - parseDateStr(firstDate).getTime()) / 86_400_000) + 1
      : 0;

    const spanDays = Math.min(PACE_DAYS, Math.max(1, historyDays));
    let recentMin = 0;
    for (let i = 0; i < spanDays; i++) recentMin += minutesOn(i);
    const perDay = recentMin / 60 / spanDays;

    // The four 7-day blocks ending today (fewer on a young account); a
    // partial block is scaled by the days it covers.
    const weekRates: number[] = [];
    for (let block = 0; block < PACE_DAYS / 7 && block * 7 < historyDays; block++) {
      const days = Math.min(7, historyDays - block * 7);
      let min = 0;
      for (let i = 0; i < days; i++) min += minutesOn(block * 7 + i);
      weekRates.push(min / 60 / days);
    }
    const slowPerDay = weekRates.length ? Math.min(...weekRates) : 0;
    const fastPerDay = weekRates.length ? Math.max(...weekRates) : 0;

    let previousMin = 0;
    for (let i = PACE_DAYS; i < PACE_DAYS * 2; i++) previousMin += minutesOn(i);
    const trendPct =
      historyDays >= PACE_DAYS * 2 && previousMin > 0 ? Math.round(((recentMin - previousMin) / previousMin) * 100) : null;

    // Cycle hours at the end of each past day: today's total minus whatever
    // was logged after that day.
    const cycleStart = (clearance.cycleNumber - 1) * CYCLE_HOURS;
    const totalMin = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const history: number[] = [];
    let after = logs.reduce((acc, l) => (l.date > todayStr ? acc + l.durationMinutes : acc), 0);
    for (let i = 0; i <= PAST_DAYS; i++) {
      history.unshift((totalMin - after) / 60 - cycleStart);
      after += minutesOn(i);
    }

    // Hours studied on each of the past PAST_DAYS days (oldest first), drawn
    // as faint bars under the trajectory.
    const daily: number[] = [];
    for (let i = PAST_DAYS - 1; i >= 0; i--) daily.push(minutesOn(i) / 60);
    const recentHours = recentMin / 60;
    const bestWeek = weekRates.length ? Math.max(...weekRates) * 7 : 0;

    return { perDay, slowPerDay, fastPerDay, trendPct, history, daily, recentHours, bestWeek, hasLogs: logs.length > 0 };
  }, [logs, todayStr, clearance.cycleNumber]);

  const targets = useMemo(() => {
    if (clearance.ascensionAvailable) return [];
    const now = clearance.cycleHours;
    const cur = clearance.current;
    const ahead = CLEARANCE_LEVELS.filter((l) => l.requiredHours > now);
    const picks: Array<[TargetKind, ClearanceLevel | undefined]> = [
      ['rank', clearance.next ?? undefined],
      ['milestone', ahead.find((l) => l.isNamedMilestone)],
      ['division', ahead.find((l) => l.divisionIndex > cur.divisionIndex)],
      ['cycle', CLEARANCE_LEVELS[CLEARANCE_LEVELS.length - 1]],
    ];
    const seen = new Set<number>();
    const list: Target[] = [];
    // Later picks win a tie (the next rank *is* the milestone, say), so walk
    // them in reverse and keep the broader label.
    for (const [kind, level] of picks.slice().reverse()) {
      if (!level || level.requiredHours <= now || seen.has(level.level)) continue;
      seen.add(level.level);
      list.unshift({ kind, level, hoursLeft: +(level.requiredHours - now).toFixed(1) });
    }
    return list;
  }, [clearance]);

  const chart = useMemo(() => {
    const now = pace.history[pace.history.length - 1];
    const soonest = targets
      .filter((tg) => tg.kind === 'milestone' || tg.kind === 'division')
      .map((tg) => daysToCover(tg.hoursLeft, pace.perDay))
      .filter((d): d is number => d !== null);
    const futureDays = soonest.length
      ? Math.min(MAX_FUTURE_DAYS, Math.max(MIN_FUTURE_DAYS, Math.ceil(Math.min(...soonest) * 1.15)))
      : DEFAULT_FUTURE_DAYS;
    const showCone = !clearance.ascensionAvailable && pace.perDay > 0;

    const meanEnd = now + pace.perDay * futureDays;
    const fastEnd = now + pace.fastPerDay * futureDays;
    const slowEnd = now + pace.slowPerDay * futureDays;
    let yMin = Math.min(...pace.history);
    let yMax = showCone ? Math.max(fastEnd, now) : now;
    // Pull the nearest target line into view when it's only a little above.
    const nearest = targets.find((tg) => tg.kind !== 'rank');
    if (nearest && nearest.level.requiredHours <= yMax + (yMax - yMin) * 0.35) {
      yMax = Math.max(yMax, nearest.level.requiredHours);
    }
    if (yMax - yMin < 1) yMax = yMin + 1;
    const pad = (yMax - yMin) * 0.12;
    // Don't dip below zero unless the window really starts in a previous cycle.
    yMin = yMin >= 0 ? Math.max(0, yMin - pad) : yMin - pad;
    yMax += pad;

    const totalDays = PAST_DAYS + futureDays;
    const x = (day: number) => ((day + PAST_DAYS) / totalDays) * 1000;
    const y = (h: number) => 100 - ((h - yMin) / (yMax - yMin)) * 100;

    const pastPts = pace.history.map((h, i) => `${x(i - PAST_DAYS).toFixed(1)},${y(h).toFixed(2)}`);

    // Gridlines on a "nice" step (1/2/5 x 10^n), two or three of them (the
    // chart is short).
    const rawStep = (yMax - yMin) / 2;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rawStep, 0.1))));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= rawStep) ?? 10 * mag;
    const ticks: Array<{ value: number; top: number }> = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) ticks.push({ value: v, top: y(v) });

    // Daily bars along the bottom (up to a quarter of the height), scaled to
    // the busiest day in the window.
    const dayMax = Math.max(1, ...pace.daily);
    const barW = (1000 / totalDays) * 0.62;
    const bars = pace.daily.map((h, i) => {
      const height = (h / dayMax) * 24;
      return { key: i, x: x(i - PAST_DAYS + 1) - barW / 2, y: 100 - height, h: height, w: barW };
    });
    const weekLines = Array.from({ length: PAST_DAYS / 7 - 1 }, (_, i) => x(-PAST_DAYS + (i + 1) * 7));

    return {
      futureDays,
      showCone,
      ticks,
      bars,
      weekLines,
      nowValue: now,
      meanEnd,
      slowEnd,
      fastEnd,
      nowX: x(0),
      nowY: y(now),
      line: pastPts.join(' '),
      area: `${x(-PAST_DAYS)},100 ${pastPts.join(' ')} ${x(0)},100`,
      cone: `${x(0)},${y(now)} ${x(futureDays)},${y(fastEnd)} ${x(futureDays)},${y(slowEnd)}`,
      mean: { x2: x(futureDays), y2: y(meanEnd) },
    };
  }, [pace, targets, clearance.ascensionAvailable]);

  const accent = isDark ? '#34d399' : '#059669';
  const strongText = isDark ? 'text-zinc-200' : 'text-zinc-900';
  const divider = isDark ? 'border-zinc-800/50' : 'border-zinc-200';
  const etaDate = (days: number) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
      parseDateStr(addDays(todayStr, days))
    );
  const kindLabel: Record<TargetKind, string> = {
    rank: t.forecastNextRank,
    milestone: t.forecastNextMilestone,
    division: t.forecastNextDivision,
    cycle: t.forecastCycleEnd,
  };
  const weekly = pace.perDay * 7;

  return (
    <>
      <div className={`flex items-center justify-between gap-3 pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
        <div className="flex items-center space-x-2">
          <Telescope className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">{t.forecastTitle}</h2>
        </div>
        <span className={`flex items-center gap-2 font-mono text-[10px] uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {tf(t.forecastCycle, { n: clearance.cycleNumber })}
          {/* How the projection is made, on hover / focus */}
          <Info tabIndex={0} role="img" aria-label={t.forecastSource} className={`w-3.5 h-3.5 cursor-help outline-none ${textMuted} hover:text-emerald-400 focus:text-emerald-400`}>
            <title>{`${t.forecastSource} · ${etaDate(0)}`}</title>
          </Info>
        </span>
      </div>

      {!pace.hasLogs ? (
        <div className={`flex-1 flex items-center justify-center py-10 font-mono text-[11px] uppercase tracking-wider ${textMuted}`}>
          {t.forecastEmpty}
        </div>
      ) : (
        <div className="pt-3 flex-1 flex flex-col gap-3 font-mono min-w-0">
          {/* Pace readouts */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 border ${isDark ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
            {[
              { label: t.forecastPace, value: `${weekly.toFixed(1)}H`, unit: t.forecastPerWeek },
              {
                label: t.forecastTrend,
                value: pace.trendPct === null ? '—' : `${pace.trendPct > 0 ? '+' : ''}${pace.trendPct}%`,
                unit: t.forecastVsPrev,
                tone:
                  pace.trendPct === null || pace.trendPct === 0
                    ? undefined
                    : pace.trendPct > 0
                    ? isDark
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : isDark
                    ? 'text-amber-400'
                    : 'text-amber-600',
              },
              { label: t.forecastLast28, value: `${pace.recentHours.toFixed(1)}H`, unit: tf(t.forecastBestWeek, { h: pace.bestWeek.toFixed(1) }) },
              { label: t.forecastCycleHours, value: `${Math.floor(clearance.cycleHours)}`, unit: `/ ${CYCLE_HOURS}H` },
            ].map((cell, i) => (
              <div
                key={cell.label}
                className={`px-3 py-1.5 min-w-0 ${isDark ? 'border-zinc-800/80' : 'border-zinc-200'} ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}
              >
                <div className={`text-[9px] uppercase tracking-widest truncate ${textMuted}`}>{cell.label}</div>
                <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                  <span className={`shrink-0 text-base font-semibold tabular-nums whitespace-nowrap ${cell.tone ?? strongText}`}>{cell.value}</span>
                  <span className={`text-[9px] uppercase truncate ${textMuted}`}>{cell.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Trajectory: actual cycle hours for 8 weeks, then the projected cone */}
          {/* Compact, fixed-height chart (the panel no longer stretches; the
              STUDY RHYTHM panel below takes the column's slack). */}
          <div>
            <div className="relative h-20" role="img" aria-label={t.forecastAria}>
              <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                {/* The future half is tinted so past and projection read apart */}
                <rect x={chart.nowX} y={0} width={1000 - chart.nowX} height={100} fill={accent} fillOpacity={0.035} />
                {chart.ticks.map((tk) => (
                  <line key={`tick-${tk.value}`} x1={0} x2={1000} y1={tk.top} y2={tk.top} stroke="var(--tb-border)" strokeOpacity={0.45} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
                {chart.weekLines.map((wx) => (
                  <line key={`wk-${wx}`} x1={wx} x2={wx} y1={0} y2={100} stroke="var(--tb-border)" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="1 3" vectorEffect="non-scaling-stroke" />
                ))}
                {chart.bars.map((b) => (
                  <rect key={`bar-${b.key}`} x={b.x} y={b.y} width={b.w} height={b.h} fill={accent} fillOpacity={0.28} />
                ))}
                <line x1={chart.nowX} y1={0} x2={chart.nowX} y2={100} stroke="var(--tb-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <polygon points={chart.area} fill={accent} fillOpacity={0.08} />
                <polyline points={chart.line} fill="none" stroke={accent} strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {chart.showCone && (
                  <>
                    <polygon points={chart.cone} fill={accent} fillOpacity={0.12} />
                    <line
                      x1={chart.nowX}
                      y1={chart.nowY}
                      x2={chart.mean.x2}
                      y2={chart.mean.y2}
                      stroke={accent}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </svg>
              {/* Labels and the "now" marker live in HTML so the stretched SVG doesn't distort them. */}
              {chart.ticks.map((tk) => (
                <span
                  key={`tl-${tk.value}`}
                  className={`absolute left-0 -translate-y-full pb-0.5 text-[9px] leading-none tabular-nums ${textMuted}`}
                  style={{ top: `${tk.top}%` }}
                >
                  {Math.round(tk.value)}H
                </span>
              ))}
              <span
                className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: `${chart.nowX / 10}%`, top: `${chart.nowY}%`, backgroundColor: accent, boxShadow: `0 0 0 3px ${accent}33` }}
              />
              {/* Where you are now, and where the mean pace lands at the right edge */}
              <span
                className={`absolute -translate-x-full -translate-y-1/2 pr-2.5 text-[10px] font-semibold tabular-nums whitespace-nowrap ${strongText}`}
                style={{ left: `${chart.nowX / 10}%`, top: `${chart.nowY}%` }}
              >
                {chart.nowValue.toFixed(1)}H
              </span>
              {chart.showCone && (
                <span
                  className="absolute right-0 -translate-y-1/2 px-1.5 py-0.5 border text-[9px] leading-tight text-right tabular-nums whitespace-nowrap bg-[var(--tb-bg-card)]"
                  style={{ top: `${chart.mean.y2}%`, borderColor: `${accent}66`, color: accent }}
                >
                  <span className="block font-bold">≈ {chart.meanEnd.toFixed(0)}H</span>
                  <span className={`block ${textMuted}`}>
                    {chart.slowEnd.toFixed(0)}–{chart.fastEnd.toFixed(0)}H
                  </span>
                </span>
              )}
            </div>
            <div className={`relative h-4 mt-1.5 text-[9px] uppercase tracking-wider ${textMuted}`}>
              <span className="absolute left-0">{tf(t.forecastWeeksAgo, { n: PAST_DAYS / 7 })}</span>
              <span className={`absolute -translate-x-1/2 ${strongText}`} style={{ left: `${chart.nowX / 10}%` }}>
                {t.forecastNow}
              </span>
              <span className="absolute right-0">{tf(t.forecastDaysAhead, { n: chart.futureDays })}</span>
            </div>
          </div>

          {/* ETAs */}
          {clearance.ascensionAvailable ? (
            <div className={`border px-3 py-3 text-[11px] uppercase tracking-wider ${isDark ? 'border-amber-400/40 text-amber-300' : 'border-amber-500/50 text-amber-700'}`}>
              {t.forecastAscensionReady}
            </div>
          ) : (
            // Two across on desktop: stacked, the four ETAs made this the tallest
            // panel of the right column, and the lunar calendar opposite had to
            // stretch to match it.
            <ul className={`grid lg:grid-cols-2 lg:gap-x-6 border-t ${divider}`}>
              {targets.map((tg) => {
                const mean = daysToCover(tg.hoursLeft, pace.perDay);
                const fast = daysToCover(tg.hoursLeft, pace.fastPerDay);
                const slow = daysToCover(tg.hoursLeft, pace.slowPerDay);
                const reachable = mean !== null && mean <= MAX_ETA_DAYS;
                const name =
                  tg.kind === 'division'
                    ? `DIV-${String(tg.level.divisionIndex).padStart(2, '0')} ${tg.level.division}`
                    : tg.kind === 'rank'
                    ? `LV.${pad4(tg.level.level)} ${tg.level.title}`
                    : tg.level.title;
                return (
                  <li key={tg.kind} className={`grid grid-cols-[0.5rem_minmax(0,1fr)_auto] gap-x-2.5 items-center py-1 border-b ${divider}`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tg.level.color }} />
                    {/* Line 1: what and when. Line 2: how far and the ETA range. */}
                    <span className="min-w-0 flex items-baseline gap-2">
                      <span className={`shrink-0 text-[9px] uppercase tracking-widest ${textMuted}`}>{kindLabel[tg.kind]}</span>
                      <span className={`text-[11px] uppercase truncate ${strongText}`} title={tg.level.subtitle}>
                        {name}
                      </span>
                    </span>
                    <span className={`text-[11px] text-right tabular-nums font-semibold ${strongText}`}>
                      {reachable ? etaDate(mean) : t.forecastNoSignal}
                    </span>
                    <span />
                    <span className={`text-[10px] tabular-nums truncate ${textMuted}`}>{tf(t.forecastHoursLeft, { n: tg.hoursLeft })}</span>
                    <span className={`text-[10px] text-right uppercase tabular-nums whitespace-nowrap ${textMuted}`}>
                      {reachable
                        ? fast !== null && slow !== null && fast !== slow
                          ? tf(t.forecastInRange, { n: mean, lo: fast, hi: slow })
                          : fast !== null && slow === null
                          ? tf(t.forecastInFrom, { n: mean, lo: fast })
                          : tf(t.forecastIn, { n: mean })
                        : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

    </>
  );
};
