import React, { useMemo } from 'react';
import { Clock3 } from 'lucide-react';
import { getZonedParts, tf, useI18n } from './i18n';
import { addDays, orderedWeekdayLabels, parseDateStr, weekdayPosition, type WeekStart } from './week';

// STUDY RHYTHM: when you study, over the last 8 weeks.
//   - hours by the hour of day the log was committed, in your time zone
//     (the same clock the BITS buffs check: NIGHT SHIFT pays on commits at
//     22:00-01:59, EARLY BIRD on 05:00-08:59, both drawn as bands);
//   - hours by weekday (the log's study date);
//   - peak hour, the night / morning share and sessions per week.
// The charts take whatever height the panel has (on desktop it is the
// panel that lines the two dashboard columns up).

const WINDOW_DAYS = 56;
const NIGHT_HOURS = new Set([22, 23, 0, 1]);
const MORNING_HOURS = new Set([5, 6, 7, 8]);

interface RhythmLog {
  date: string;
  createdAt: string;
  durationMinutes: number;
}

interface StudyRhythmProps {
  logs: RhythmLog[];
  todayStr: string;
  timeZone: string;
  weekStart: WeekStart;
  textMuted: string;
  isDark: boolean;
  borderCol: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export const StudyRhythm: React.FC<StudyRhythmProps> = ({ logs, todayStr, timeZone, weekStart, textMuted, isDark, borderCol }) => {
  const { t } = useI18n();

  const data = useMemo(() => {
    const from = addDays(todayStr, -(WINDOW_DAYS - 1));
    const byHour = Array<number>(24).fill(0);
    const byDay = Array<number>(7).fill(0);
    let total = 0;
    let sessions = 0;
    for (const l of logs) {
      if (l.date < from || l.date > todayStr) continue;
      const h = l.durationMinutes / 60;
      total += h;
      sessions += 1;
      byDay[weekdayPosition(parseDateStr(l.date).getDay(), weekStart)] += h;
      if (l.createdAt) {
        const stamp = new Date(l.createdAt);
        if (!Number.isNaN(stamp.getTime())) byHour[getZonedParts(stamp, timeZone).hour] += h;
      }
    }
    const hourTotal = byHour.reduce((a, b) => a + b, 0);
    const share = (set: Set<number>) =>
      hourTotal > 0 ? Math.round((byHour.reduce((a, v, i) => a + (set.has(i) ? v : 0), 0) / hourTotal) * 100) : 0;
    const peakHour = hourTotal > 0 ? byHour.indexOf(Math.max(...byHour)) : null;
    return {
      byHour,
      byDay,
      total,
      sessionsPerWeek: sessions / (WINDOW_DAYS / 7),
      night: share(NIGHT_HOURS),
      morning: share(MORNING_HOURS),
      peakHour,
      hourMax: Math.max(0.01, ...byHour),
      dayMax: Math.max(0.01, ...byDay),
    };
  }, [logs, todayStr, timeZone, weekStart]);

  const accent = isDark ? '#34d399' : '#059669';
  const nightTint = isDark ? 'rgba(167, 139, 250, 0.14)' : 'rgba(139, 92, 246, 0.12)';
  const morningTint = isDark ? 'rgba(251, 191, 36, 0.13)' : 'rgba(245, 158, 11, 0.13)';
  const idleTint = isDark ? 'rgba(63, 63, 70, 0.35)' : 'rgba(228, 228, 231, 0.7)';
  const strong = isDark ? 'text-zinc-200' : 'text-zinc-900';
  const cellBorder = isDark ? 'border-zinc-800/80' : 'border-zinc-200';
  const dayLabels = orderedWeekdayLabels(t.weekdaysShortSun, weekStart);
  const empty = data.total === 0;

  const stats: Array<{ label: string; value: string; tone?: string }> = [
    { label: t.rhythmPeak, value: data.peakHour === null ? '—' : `${pad2(data.peakHour)}:00` },
    { label: t.rhythmNight, value: `${data.night}%`, tone: isDark ? 'text-violet-300' : 'text-violet-700' },
    { label: t.rhythmMorning, value: `${data.morning}%`, tone: isDark ? 'text-amber-300' : 'text-amber-700' },
    { label: t.rhythmSessions, value: data.sessionsPerWeek.toFixed(1) },
  ];

  return (
    <>
      <div className={`flex items-center justify-between gap-3 pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
        <div className="flex items-center space-x-2">
          <Clock3 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">{t.rhythmTitle}</h2>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider ${textMuted}`}>{tf(t.rhythmWindow, { n: WINDOW_DAYS / 7 })}</span>
      </div>

      <div className="pt-3 flex-1 flex flex-col gap-3 font-mono min-h-0">
        <div className={`grid grid-cols-2 sm:grid-cols-4 border ${cellBorder}`}>
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`px-3 py-1.5 min-w-0 ${cellBorder} ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t sm:border-t-0' : ''} ${i === 2 ? 'sm:border-l' : ''}`}
            >
              <div className={`text-[9px] uppercase tracking-widest truncate ${textMuted}`}>{s.label}</div>
              <div className={`text-base font-semibold tabular-nums ${s.tone ?? strong}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-[5.5rem] grid grid-cols-1 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] gap-4">
          {/* Hour of day, with the buff windows behind the bars */}
          <div className="flex flex-col min-h-[4.5rem]">
            <div className="relative flex-1 flex items-end gap-[2px]" role="img" aria-label={t.rhythmHourAria}>
              {data.byHour.map((h, hour) => (
                <div
                  key={hour}
                  className="relative flex-1 h-full flex items-end"
                  style={{ backgroundColor: NIGHT_HOURS.has(hour) ? nightTint : MORNING_HOURS.has(hour) ? morningTint : idleTint }}
                  title={`${pad2(hour)}:00 — ${h.toFixed(1)}h`}
                >
                  <div
                    className="w-full transition-[height] duration-700"
                    style={{
                      height: `${(h / data.hourMax) * 100}%`,
                      backgroundColor: accent,
                      opacity: hour === data.peakHour ? 1 : 0.55,
                    }}
                  />
                </div>
              ))}
              {empty && (
                <span className={`absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-wider ${textMuted}`}>
                  {t.rhythmEmpty}
                </span>
              )}
            </div>
            <div className={`mt-1 grid grid-cols-4 text-[9px] tabular-nums ${textMuted}`}>
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span className="flex justify-between">
                18<span>24</span>
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5" style={{ backgroundColor: nightTint, boxShadow: 'inset 0 0 0 1px rgba(167,139,250,0.5)' }} />
                <span className={textMuted}>{t.rhythmNightBand}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5" style={{ backgroundColor: morningTint, boxShadow: 'inset 0 0 0 1px rgba(251,191,36,0.5)' }} />
                <span className={textMuted}>{t.rhythmMorningBand}</span>
              </span>
            </div>
          </div>

          {/* Weekday */}
          <div className={`flex flex-col min-h-[4.5rem] sm:border-l sm:pl-4 ${borderCol}`}>
            <div className="flex-1 flex items-end gap-1.5" role="img" aria-label={t.rhythmDayAria}>
              {data.byDay.map((h, i) => (
                <div key={dayLabels[i]} className={`flex-1 h-full flex items-end ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`} title={`${dayLabels[i]} — ${h.toFixed(1)}h`}>
                  <div className="w-full transition-[height] duration-700" style={{ height: `${(h / data.dayMax) * 100}%`, backgroundColor: accent, opacity: 0.75 }} />
                </div>
              ))}
            </div>
            <div className={`mt-1 grid grid-cols-7 gap-1.5 text-center text-[9px] uppercase ${textMuted}`}>
              {dayLabels.map((d) => (
                <span key={d}>{d.slice(0, 2)}</span>
              ))}
            </div>
            <div className={`mt-1.5 text-[9px] uppercase tracking-wider ${textMuted}`}>{tf(t.rhythmTotal, { h: data.total.toFixed(1) })}</div>
          </div>
        </div>
      </div>
    </>
  );
};
