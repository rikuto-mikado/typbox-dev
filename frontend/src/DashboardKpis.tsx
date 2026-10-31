import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tf, useI18n } from './i18n';
import { weekDates } from './week';

// The four headline numbers at the top of the dashboard. Each cell keeps
// its number and adds one small, specific picture under it:
//   01 TOTAL       — how far into the current 1,000h cycle
//   02 THIS WEEK   — one bar per day, vs last week, and a LIVE chip while
//                    the stopwatch runs
//   03 THIS MONTH  — one tick per day of the month, lit on study days
//   04 CATEGORIES  — the share of all hours, in category colours
// Numbers count up when they change (not under prefers-reduced-motion).

interface KpiLog {
  date: string;
  durationMinutes: number;
  categoryId: string | number | null;
}

interface KpiCategory {
  id: string | number;
  code: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface DashboardKpisProps {
  signedIn: boolean;
  logs: KpiLog[];
  openCategories: KpiCategory[];
  activeCategoryCount: number;
  todayStr: string;
  weekStartStr: string;
  monthPrefix: string;
  cycleNumber: number;
  cycleHours: number;
  cycleSpan: number;
  liveSeconds: number;
  borderCol: string;
  bgCard: string;
  textMuted: string;
  isDark: boolean;
  /** Fill for a category's slice of the share bar (hatched when inactive). */
  categoryFill: (c: KpiCategory) => React.CSSProperties;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Eases from the last shown value to `target` (from 0 on first mount). */
const useCountUp = (target: number, ms = 700) => {
  const reduce = reduceMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const v = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return reduce ? target : shown;
};

/** 4,712.7 with the decimals small and dim. */
const BigNum: React.FC<{ value: number; decimals?: number; textMuted: string }> = ({ value, decimals = 1, textMuted }) => {
  const shown = useCountUp(value);
  const [int, dec] = shown.toFixed(decimals).split('.');
  return (
    <span className="font-mono font-light tracking-tight whitespace-nowrap tabular-nums">
      <span className="text-2xl sm:text-4xl">{Number(int).toLocaleString('en-US')}</span>
      {dec !== undefined && <span className={`text-base sm:text-2xl ${textMuted}`}>.{dec}</span>}
    </span>
  );
};

const daysInMonth = (prefix: string) => {
  const [y, m] = prefix.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

export const DashboardKpis: React.FC<DashboardKpisProps> = ({
  signedIn,
  logs,
  openCategories,
  activeCategoryCount,
  todayStr,
  weekStartStr,
  monthPrefix,
  cycleNumber,
  cycleHours,
  cycleSpan,
  liveSeconds,
  borderCol,
  bgCard,
  textMuted,
  isDark,
  categoryFill,
}) => {
  const { t } = useI18n();
  const data = useMemo(() => {
    const byDate = new Map<string, number>();
    const byCat = new Map<string, number>();
    let total = 0;
    for (const l of logs) {
      byDate.set(l.date, (byDate.get(l.date) ?? 0) + l.durationMinutes);
      const key = String(l.categoryId ?? '');
      byCat.set(key, (byCat.get(key) ?? 0) + l.durationMinutes);
      total += l.durationMinutes;
    }
    const week = weekDates(weekStartStr).map((d) => ({ date: d, min: byDate.get(d) ?? 0, future: d > todayStr, today: d === todayStr }));
    const weekMin = week.reduce((s, d) => s + d.min, 0);
    // Last week up to the same weekday, so a Tuesday compares with last Tuesday.
    const todayIdx = Math.max(0, week.findIndex((d) => d.today));
    const lastWeek = weekDates(
      (() => {
        const d = new Date(weekStartStr + 'T00:00:00');
        d.setDate(d.getDate() - 7);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })()
    );
    const lastWeekSoFar = lastWeek.slice(0, todayIdx + 1).reduce((s, d) => s + (byDate.get(d) ?? 0), 0);
    const days = daysInMonth(monthPrefix);
    const month = Array.from({ length: days }, (_, i) => {
      const date = `${monthPrefix}-${String(i + 1).padStart(2, '0')}`;
      return { date, on: (byDate.get(date) ?? 0) > 0, future: date > todayStr, today: date === todayStr };
    });
    const monthMin = month.reduce((s, d) => s + (byDate.get(d.date) ?? 0), 0);
    const shares = openCategories
      .map((c) => ({ c, min: byCat.get(String(c.id)) ?? 0 }))
      .filter((s) => s.min > 0)
      .sort((a, b) => b.min - a.min);
    const shareTotal = shares.reduce((s, x) => s + x.min, 0);
    return { total, week, weekMin, lastWeekSoFar, month, monthMin, shares, shareTotal };
  }, [logs, openCategories, weekStartStr, todayStr, monthPrefix]);

  const cell = `p-3.5 sm:p-5 border-r border-b ${borderCol} ${bgCard} flex flex-col gap-2 min-w-0`;
  const label = `font-mono text-[10px] sm:text-[11px] uppercase tracking-wider truncate ${textMuted}`;
  const sub = `font-mono text-[9px] sm:text-[10px] uppercase tracking-wider truncate ${textMuted}`;
  const track = isDark ? 'bg-zinc-800/80' : 'bg-zinc-200';
  const weekMax = Math.max(60, ...data.week.map((d) => d.min));
  const delta = data.lastWeekSoFar > 0 ? Math.round(((data.weekMin - data.lastWeekSoFar) / data.lastWeekSoFar) * 100) : null;
  // Minutes for the first hour (+12m), then hours (+1.4h).
  const liveLabel = liveSeconds < 3600 ? `${Math.floor(liveSeconds / 60)}m` : `${(liveSeconds / 3600).toFixed(1)}h`;
  const studyDays = data.month.filter((d) => d.on).length;
  const top = data.shares[0];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 border-t border-l ${borderCol}`}>
      {/* 01 TOTAL */}
      <div className={cell}>
        <div className={label}>01 / {t.totalHours}</div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <BigNum value={signedIn ? data.total / 60 : 0} textMuted={textMuted} />
          <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>{t.unitHrs}</span>
        </div>
        <div className="mt-auto flex flex-col gap-1">
          <div className={`h-1 ${track}`} aria-hidden>
            <div className="h-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${Math.min(100, (cycleHours / cycleSpan) * 100)}%` }} />
          </div>
          <span className={sub}>{tf(t.kpiCycle, { n: String(cycleNumber).padStart(2, '0'), h: cycleHours.toFixed(1), max: cycleSpan.toLocaleString('en-US') })}</span>
        </div>
      </div>

      {/* 02 THIS WEEK */}
      <div className={cell}>
        <div className="flex items-center justify-between gap-2">
          <div className={label}>02 / {t.weeklyHours}</div>
          {liveSeconds > 0 && (
            <span className="shrink-0 flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-emerald-400" title={t.kpiLiveTitle}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              +{liveLabel} {t.kpiLive}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <BigNum value={signedIn ? data.weekMin / 60 : 0} textMuted={textMuted} />
          <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>{t.unitHrs7d}</span>
        </div>
        <div className="mt-auto flex flex-col gap-1">
          <div className="flex items-end gap-[3px] h-5" aria-hidden>
            {data.week.map((d) => (
              <div key={d.date} className={`flex-1 h-full flex items-end ${d.future ? 'opacity-30' : ''} ${track}`}>
                <div
                  className={`w-full transition-[height] duration-700 ${d.today ? 'bg-emerald-400' : 'bg-emerald-500/70'}`}
                  style={{ height: `${signedIn ? (d.min / weekMax) * 100 : 0}%` }}
                />
              </div>
            ))}
          </div>
          <span className={sub}>
            {delta === null ? (
              t.kpiNoLastWeek
            ) : (
              <span className={delta >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {tf(t.kpiVsLastWeek, { d: `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%` })}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* 03 THIS MONTH */}
      <div className={cell}>
        <div className={label}>03 / {t.monthlyHours}</div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <BigNum value={signedIn ? data.monthMin / 60 : 0} textMuted={textMuted} />
          <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>
            {t.unitHrs} ({monthPrefix})
          </span>
        </div>
        <div className="mt-auto flex flex-col gap-1">
          <div className="flex gap-[2px] h-2" aria-hidden>
            {data.month.map((d) => (
              <span
                key={d.date}
                className={`flex-1 ${signedIn && d.on ? 'bg-emerald-500' : track} ${d.future ? 'opacity-35' : ''} ${
                  d.today ? 'outline outline-1 outline-emerald-300 outline-offset-1' : ''
                }`}
              />
            ))}
          </div>
          <span className={sub}>{tf(t.kpiStudyDays, { a: signedIn ? studyDays : 0, b: data.month.length })}</span>
        </div>
      </div>

      {/* 04 CATEGORIES */}
      <div className={cell}>
        <div className={label}>04 / {t.activeCategories}</div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <BigNum value={signedIn ? activeCategoryCount : 0} decimals={0} textMuted={textMuted} />
          <span className={`font-mono text-[10px] sm:text-xs ${textMuted}`}>
            {signedIn && activeCategoryCount !== openCategories.length ? tf(t.unitActiveOf, { n: openCategories.length }) : t.unitUnits}
          </span>
        </div>
        <div className="mt-auto flex flex-col gap-1">
          <div className={`flex h-2 gap-px ${track}`} aria-hidden>
            {signedIn &&
              data.shares.map(({ c, min }) => (
                <span
                  key={c.id}
                  className="h-full transition-[flex-grow] duration-700"
                  style={{ ...categoryFill(c), flexGrow: min, flexBasis: 0, minWidth: 2 }}
                  title={`[${c.code}] ${c.name} · ${(min / 60).toFixed(1)}h`}
                />
              ))}
          </div>
          <span className={sub}>
            {signedIn && top
              ? tf(t.kpiTopShare, { code: top.c.code, pct: Math.round((top.min / Math.max(1, data.shareTotal)) * 100) })
              : t.kpiNoShare}
          </span>
        </div>
      </div>
    </div>
  );
};
