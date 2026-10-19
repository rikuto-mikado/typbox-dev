import { createContext, useContext } from 'react';
import { EN, JA, type Dict } from './i18n.strings';

export type { Dict };
export type Lang = 'en' | 'ja';

export const LANG_OPTIONS: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
];

export const STRINGS: Record<Lang, Dict> = { en: EN, ja: JA };

export const LANG_STORAGE_KEY = 'typbox_lang';
export const TZ_STORAGE_KEY = 'typbox_timezone';

export const isLang = (value: unknown): value is Lang => value === 'en' || value === 'ja';

/** Fills `{name}` placeholders in a dictionary template. */
export function tf(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}

// ==========================================
// Time Zones
// ==========================================
// Timestamps are stored in UTC by the backend (Django USE_TZ=True) and only
// ever converted to the user's chosen IANA zone at render time, so changing
// the setting re-labels every past and future log without touching data.

export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

let cachedZoneList: string[] | null = null;

/** Every IANA zone the browser knows, always including UTC and `ensure`. */
export function listTimeZones(ensure?: string): string[] {
  if (!cachedZoneList) {
    let zones: string[];
    try {
      const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
      zones = supported ? supported('timeZone') : [];
    } catch {
      zones = [];
    }
    if (zones.length === 0) {
      zones = ['Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Kolkata', 'Europe/London',
        'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'Australia/Sydney', 'Pacific/Auckland'];
    }
    cachedZoneList = Array.from(new Set(['UTC', ...zones]));
  }
  if (ensure && !cachedZoneList.includes(ensure)) return [ensure, ...cachedZoneList];
  return cachedZoneList;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string, timeZone: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone}|${JSON.stringify(opts)}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { ...opts, timeZone });
    formatterCache.set(key, fmt);
  }
  return fmt;
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = getFormatter('en-US', timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour') % 24,
    minute: pick('minute'),
    second: pick('second'),
  };
}

/** Minutes east of UTC for `timeZone` at `date` (DST-aware). */
export function getZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

export function formatUtcOffset(offsetMin: number): string {
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Zones whose English short names Intl only renders as "GMT+9"-style
// offsets; these are the abbreviations people actually use.
const TZ_ABBR_FALLBACK: Record<string, string> = {
  'Asia/Tokyo': 'JST',
  'Asia/Seoul': 'KST',
  'Asia/Pyongyang': 'KST',
  'Asia/Shanghai': 'CST',
  'Asia/Taipei': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Macau': 'CST',
  'Asia/Singapore': 'SGT',
  'Asia/Kuala_Lumpur': 'MYT',
  'Asia/Manila': 'PHT',
  'Asia/Jakarta': 'WIB',
  'Asia/Bangkok': 'ICT',
  'Asia/Ho_Chi_Minh': 'ICT',
  'Asia/Saigon': 'ICT',
  'Asia/Kolkata': 'IST',
  'Asia/Calcutta': 'IST',
  'Asia/Karachi': 'PKT',
  'Asia/Dhaka': 'BST',
  'Asia/Dubai': 'GST',
  'Asia/Jerusalem': 'IST',
  'Europe/Moscow': 'MSK',
  'Europe/Istanbul': 'TRT',
  'America/Sao_Paulo': 'BRT',
  'America/Argentina/Buenos_Aires': 'ART',
};

/** Short zone label for display, e.g. JST / PDT / CEST / UTC+05:45. */
export function getTimeZoneAbbr(timeZone: string, date: Date = new Date()): string {
  if (timeZone === 'UTC' || timeZone === 'Etc/UTC') return 'UTC';
  let lastName = '';
  for (const locale of ['en-US', 'en-GB', 'en-AU']) {
    try {
      const name =
        getFormatter(locale, timeZone, { timeZoneName: 'short' })
          .formatToParts(date)
          .find((p) => p.type === 'timeZoneName')?.value ?? '';
      lastName = name;
      if (name && !/^(GMT|UTC)([+-]|$)/.test(name)) return name;
      if (name === 'GMT' && locale === 'en-GB') return name;
    } catch {
      break;
    }
  }
  if (TZ_ABBR_FALLBACK[timeZone]) return TZ_ABBR_FALLBACK[timeZone];
  return lastName ? formatUtcOffset(getZoneOffsetMinutes(date, timeZone)) : timeZone;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD HH:mm` wall-clock time of an instant in `timeZone`. */
export function formatDateTimeInZone(value: string | number | Date, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** `HH:mm` wall-clock time of an instant in `timeZone`. */
export function formatTimeInZone(value: string | number | Date, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  const p = getZonedParts(date, timeZone);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

// The calendar math across the app (today / this week / this month buckets)
// runs on plain Date objects. Instead of rewriting all of it, "now" is
// re-anchored so its *local* fields equal the wall-clock time in the user's
// zone; every getFullYear()/getDate()-based computation then lands on the
// user's calendar day even when the device sits in another zone.
let activeTimeZone = getDeviceTimeZone();

export function setActiveTimeZone(timeZone: string): void {
  activeTimeZone = isValidTimeZone(timeZone) ? timeZone : getDeviceTimeZone();
}

export function getActiveTimeZone(): string {
  return activeTimeZone;
}

export function nowInZone(timeZone: string): Date {
  const p = getZonedParts(new Date(), timeZone);
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** nowInZone() for non-React modules (e.g. the status card renderer). */
export function nowInActiveZone(): Date {
  return nowInZone(activeTimeZone);
}

// ==========================================
// React context
// ==========================================

export interface I18nValue {
  lang: Lang;
  t: Dict;
  /** Locale tag for Intl date/number formatting. */
  locale: string;
  timeZone: string;
  /** `YYYY-MM-DD HH:mm (JST)` */
  formatDateTime: (value: string | number | Date) => string;
  /** `HH:mm` in the user's zone */
  formatTime: (value: string | number | Date) => string;
  tzAbbr: (at?: Date) => string;
}

export function buildI18nValue(lang: Lang, timeZone: string): I18nValue {
  return {
    lang,
    t: STRINGS[lang],
    locale: lang === 'ja' ? 'ja-JP' : 'en-US',
    timeZone,
    formatDateTime: (value) => {
      const date = value instanceof Date ? value : new Date(value);
      const stamp = formatDateTimeInZone(date, timeZone);
      return stamp ? `${stamp} (${getTimeZoneAbbr(timeZone, date)})` : '';
    },
    formatTime: (value) => formatTimeInZone(value, timeZone),
    tzAbbr: (at) => getTimeZoneAbbr(timeZone, at ?? new Date()),
  };
}

export const I18nContext = createContext<I18nValue>(buildI18nValue('en', getDeviceTimeZone()));

export const useI18n = (): I18nValue => useContext(I18nContext);
