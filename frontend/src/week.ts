// Calendar-week helpers. Weekly totals, category targets and the analytics
// week axis all follow the user's calendar week (starting Monday or Sunday,
// UserProfile.week_start) rather than a rolling 7-day window, so they
// restart at 00:00 on the first day of each week. Dates are 'YYYY-MM-DD'
// strings already expressed in the user's time zone.

export type WeekStart = 'mon' | 'sun';

export const WEEK_START_STORAGE_KEY = 'typbox_week_start';
export const DEFAULT_WEEK_START: WeekStart = 'mon';

export const isWeekStart = (value: unknown): value is WeekStart => value === 'mon' || value === 'sun';

const pad2 = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Local-midnight Date for a 'YYYY-MM-DD' string (date-only math; DST-safe
// because setDate() works in calendar days).
export const parseDateStr = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (dateStr: string, days: number): string => {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

/** Position of a JS weekday (0 = Sunday) within the week: 0 = first day. */
export const weekdayPosition = (jsDay: number, weekStart: WeekStart): number =>
  weekStart === 'sun' ? jsDay : (jsDay + 6) % 7;

/** First day (inclusive) of the calendar week containing `d`. */
export const startOfWeek = (d: Date, weekStart: WeekStart): Date => {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - weekdayPosition(copy.getDay(), weekStart));
  return copy;
};

export const startOfWeekStr = (dateStr: string, weekStart: WeekStart): string =>
  toDateStr(startOfWeek(parseDateStr(dateStr), weekStart));

/** The 7 dates of the week that starts on `weekStartStr`. */
export const weekDates = (weekStartStr: string): string[] =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStartStr, i));

/** Whole weeks between two week-start dates (b - a). */
export const weeksBetween = (aWeekStartStr: string, bWeekStartStr: string): number =>
  Math.round((parseDateStr(bWeekStartStr).getTime() - parseDateStr(aWeekStartStr).getTime()) / (7 * 86_400_000));

/** Short weekday labels in week order, from the Sunday-first CSV dictionary entry. */
export const orderedWeekdayLabels = (weekdaysShortSunCsv: string, weekStart: WeekStart): string[] => {
  const sunFirst = weekdaysShortSunCsv.split(',');
  return weekStart === 'sun' ? sunFirst : [...sunFirst.slice(1), sunFirst[0]];
};

// Module-level mirror of the selected week start for non-React helpers
// (status card canvas renderer), same pattern as setActiveTimeZone.
let activeWeekStart: WeekStart = DEFAULT_WEEK_START;

export function setActiveWeekStart(weekStart: WeekStart): void {
  activeWeekStart = weekStart;
}

export function getActiveWeekStart(): WeekStart {
  return activeWeekStart;
}
