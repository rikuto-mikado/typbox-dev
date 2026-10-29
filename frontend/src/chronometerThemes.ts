// Chronometer Themes: collectible faces for the SYSTEM CHRONOMETER readout.
// The catalog lives in chronometerThemes.json; this module types it, turns
// numbers into each theme's numeral system, decides unlocks, and lazily
// loads the (glyph-subset) web font a theme needs.
import catalog from './chronometerThemes.json';

export type ChronoUnlock =
  | { type: 'default' }
  | { type: 'level'; value: number }
  | { type: 'streak'; value: number }
  | { type: 'sessions'; value: number }
  | { type: 'ascension'; value: number }
  /** Lifetime study hours. */
  | { type: 'hours'; value: number }
  /** Longest single logged session, in minutes. */
  | { type: 'session'; value: number };

export type ChronoNumeral =
  | 'arabic'
  | 'digits'
  | 'roman'
  | 'cjk'
  | 'radix'
  | 'greek'
  | 'morse'
  | 'words'
  | 'egyptian'
  | 'cuneiform'
  | 'icao'
  /** Letter numerals (Hebrew, Armenian, Ge'ez, ...): one sign per ten and per unit. */
  | 'additive'
  /** One code point per value: `glyph.start + n` (Braille cells, I Ching hexagrams). */
  | 'glyph'
  // Whole-time systems: computed from the full time of day, not per field.
  | 'decimal'
  | 'swatch'
  | 'daypct'
  | 'unix'
  | 'shichen'
  | 'utc'
  | 'hexday'
  | 'mars'
  | 'julian'
  | 'sidereal'
  | 'kilosec'
  | 'countdown'
  | 'ghati'
  | 'ke';
export type ChronoFx =
  | 'neon'
  | 'matrix'
  | 'crt'
  | 'outline'
  | 'glitch'
  | 'nixie'
  | 'sunset'
  | 'holo'
  | 'gold'
  | 'quantum'
  | 'chrome'
  | 'fire'
  | 'ice'
  | 'emboss'
  | 'extrude'
  | 'spray'
  | 'flicker'
  | 'ink'
  | 'aurora'
  | 'vapor'
  | 'longshadow'
  | 'pulse'
  | 'chalk'
  | 'stamp'
  | 'ocean'
  | 'rosegold';

export interface ChronoFont {
  family?: string;
  stack?: string;
  weight?: number;
  google?: boolean;
}

export interface ChronoPanel {
  bg: string;
  border: string;
}

export interface ChronoRender {
  kind:
    | 'text'
    | 'segment'
    | 'dotmatrix'
    | 'mayan'
    | 'bcd'
    // Instrument faces (ChronometerFace.tsx)
    | 'analog'
    | 'rings'
    | 'gauges'
    | 'soroban'
    | 'rods'
    | 'tape'
    | 'pips'
    | 'wordgrid'
    | 'arc'
    | 'pie'
    | 'pendulum';
  /** Dial style for kind 'analog'. */
  dial?: 'swiss' | 'minimal' | 'bauhaus' | 'radar' | 'roman' | 'chrono' | 'regulator' | 'h24' | 'skeleton' | 'pilot' | 'arabic' | 'diver' | 'moonphase' | 'square' | 'single';
  numeral?: ChronoNumeral;
  digits?: string[];
  numberPrefix?: string;
  cjk?: { digits: string[]; ten: string; units?: [string, string, string] };
  /** `digits` replaces 0-9A-Z (e.g. dozenal ↊↋, DNA bases ACGT). */
  radix?: { base: number; pad: number; prefix?: string; digits?: string; gray?: boolean };
  /**
   * For numeral 'additive': `units[1..9]` and `tens[1..5]` signs, `zero` for an
   * empty field. `teensUnitsFirst` writes 11-19 unit-then-ten (Church Slavonic);
   * `overrides` replaces specific values (Hebrew 15/16).
   */
  additive?: {
    units: string[];
    tens: string[];
    zero: string;
    teensUnitsFirst?: boolean;
    overrides?: Record<string, string>;
    mark?: string;
  };
  glyph?: { start: number };
  /** 12-hour clock: hours 1-12 plus [AM, PM] labels (after the seconds, or before the hour). */
  meridiem?: { labels: [string, string]; before?: boolean };
  font?: ChronoFont;
  fx?: ChronoFx;
  cells?: 'nixie' | 'flap';
  /** Font-size multiplier for long numeral systems (binary, words, ...). */
  scale?: number;
  sep?: string;
  color?: string;
  colorLight?: string;
  // Graphic kinds (segment / dotmatrix / mayan / bcd)
  on?: string;
  off?: string;
  glow?: boolean;
  slant?: boolean;
  shape?: 'round' | 'square';
  panel?: ChronoPanel;
}

export interface ChronoTheme {
  id: string;
  code: string;
  name: string;
  desc: string;
  family: string;
  render: ChronoRender;
  unlock: ChronoUnlock;
}

export interface ChronoFamily {
  id: string;
  label: string;
  color: string;
}

/** Everything a theme's unlock rule can look at. */
export interface ChronoProgress {
  rewardUnlockLevel: number;
  totalAscensions: number;
  longestStreak: number;
  sessionCount: number;
  totalHours: number;
  longestSessionMinutes: number;
}

export const CHRONO_THEMES = catalog.themes as ChronoTheme[];
export const CHRONO_FAMILIES = catalog.families as ChronoFamily[];
export const DEFAULT_CHRONO_THEME_ID = 'system-mono';
export const CHRONO_THEME_STORAGE_KEY = 'typbox_chrono_theme';

const THEME_BY_ID = new Map(CHRONO_THEMES.map((t) => [t.id, t]));

export function getChronoThemeById(id: string | null | undefined): ChronoTheme {
  return (id && THEME_BY_ID.get(id)) || THEME_BY_ID.get(DEFAULT_CHRONO_THEME_ID) || CHRONO_THEMES[0];
}

/** Whether progress satisfies one unlock rule (shared with weather themes). */
export function isUnlockRuleMet(u: ChronoUnlock, p: ChronoProgress): boolean {
  switch (u.type) {
    case 'default':
      return true;
    case 'level':
      return p.rewardUnlockLevel >= u.value;
    case 'streak':
      return p.longestStreak >= u.value;
    case 'sessions':
      return p.sessionCount >= u.value;
    case 'ascension':
      return p.totalAscensions >= u.value;
    case 'hours':
      return p.totalHours >= u.value;
    case 'session':
      return p.longestSessionMinutes >= u.value;
  }
}

export function isChronoThemeUnlocked(theme: ChronoTheme, p: ChronoProgress): boolean {
  return isUnlockRuleMet(theme.unlock, p);
}

// Sort key that places every unlock rule on one rough "effort" ladder so a
// picker reads from easiest to hardest regardless of unlock type.
export function unlockRuleRank(u: ChronoUnlock): number {
  switch (u.type) {
    case 'default':
      return 0;
    case 'level':
      return u.value;
    case 'streak':
      return u.value * 20;
    case 'sessions':
      return u.value * 4;
    case 'ascension':
      return 3000 + u.value;
    case 'hours':
      return u.value * 3;
    case 'session':
      return u.value * 4;
  }
}

export function chronoUnlockRank(theme: ChronoTheme): number {
  return unlockRuleRank(theme.unlock);
}

// ==========================================
// Numeral systems
// ==========================================

const ROMAN: Array<[number, string]> = [
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(n: number): string {
  // Classical Latin had no zero glyph; medieval computists wrote N (nulla).
  if (n === 0) return 'N';
  let rest = n;
  let out = '';
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

const GREEK_TENS = ['', 'ι', 'κ', 'λ', 'μ', 'ν'];
const GREEK_UNITS = ['', 'α', 'β', 'γ', 'δ', 'ε', 'ϛ', 'ζ', 'η', 'θ'];

export function toGreek(n: number): string {
  // Ptolemy's astronomical tables used a small omicron for an empty place.
  if (n === 0) return 'ο';
  return `${GREEK_TENS[Math.floor(n / 10)]}${GREEK_UNITS[n % 10]}ʹ`;
}

export function toCjk(n: number, digits: string[], ten: string): string {
  if (n < 10) return digits[n];
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return `${tens === 1 ? '' : digits[tens]}${ten}${units ? digits[units] : ''}`;
}

const MORSE = ['−−−−−', '·−−−−', '··−−−', '···−−', '····−', '·····', '−····', '−−···', '−−−··', '−−−−·'];

const WORD_ONES = [
  'ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];
const WORD_TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY'];

export function toWords(n: number): string {
  if (n < 20) return WORD_ONES[n];
  const units = n % 10;
  return `${WORD_TENS[Math.floor(n / 10)]}${units ? `-${WORD_ONES[units]}` : ''}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const mapDigits = (s: string, digits: string[]) => s.replace(/[0-9]/g, (d) => digits[Number(d)]);

// Egyptian: single-sign tens (heel bones) and units (strokes); zero is
// 𓄤 (nfr), which scribes used for a zero balance in bookkeeping.
const EGYPT_TENS = ['', '𓎆', '𓎇', '𓎈', '𓎉', '𓎊'];
const EGYPT_UNITS = ['', '𓏺', '𓏻', '𓏼', '𓏽', '𓏾', '𓏿', '𓐀', '𓐁', '𓐂'];
export const toEgyptian = (n: number): string => (n === 0 ? '𓄤' : `${EGYPT_TENS[Math.floor(n / 10)]}${EGYPT_UNITS[n % 10]}`);

// Babylonian sexagesimal: one base-60 "digit" per field, written as tens
// wedges (𒌋) followed by unit wedges (𒁹). Empty places were left blank.
export const toCuneiform = (n: number): string =>
  n === 0 ? '·' : `${'𒌋'.repeat(Math.floor(n / 10))}${'𒁹'.repeat(n % 10)}`;

const ICAO = ['ZE-RO', 'WUN', 'TOO', 'TREE', 'FOW-ER', 'FIFE', 'SIX', 'SEV-EN', 'AIT', 'NIN-ER'];

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const KE = ['初刻', '一刻', '二刻', '三刻'];
const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// Letter numerals: units sign after tens sign (ΚΑ = 21), Hebrew-style
// overrides for values a script avoids writing literally.
export function toAdditive(n: number, a: NonNullable<ChronoRender['additive']>): string {
  const override = a.overrides?.[String(n)];
  if (override !== undefined) return `${override}${a.mark ?? ''}`;
  if (n === 0) return a.zero;
  const tens = a.tens[Math.floor(n / 10)] ?? '';
  const units = a.units[n % 10] ?? '';
  const body = a.teensUnitsFirst && n > 10 && n < 20 ? `${units}${tens}` : `${tens}${units}`;
  return `${body}${a.mark ?? ''}`;
}

export type ChronoPart = 'hour' | 'minute' | 'second';

/** One clock field (0-59) rendered in a text theme's numeral system. */
export function formatChronoNumber(r: ChronoRender, n: number, part: ChronoPart): string {
  switch (r.numeral ?? 'arabic') {
    case 'digits':
      return `${r.numberPrefix ?? ''}${mapDigits(pad2(n), r.digits ?? [])}`;
    case 'roman':
      return toRoman(n);
    case 'greek':
      return toGreek(n);
    case 'cjk':
      return r.cjk ? toCjk(n, r.cjk.digits, r.cjk.ten) : pad2(n);
    case 'radix': {
      const { base, pad, prefix = '', digits } = r.radix ?? { base: 10, pad: 2 };
      const value = r.radix?.gray ? n ^ (n >> 1) : n;
      const raw = value.toString(base).toUpperCase().padStart(pad, '0');
      const mapped = digits ? Array.from(raw, (ch) => Array.from(digits)[parseInt(ch, 36)] ?? ch).join('') : raw;
      return `${prefix}${mapped}`;
    }
    case 'additive':
      return r.additive ? toAdditive(n, r.additive) : pad2(n);
    case 'glyph':
      return String.fromCodePoint((r.glyph?.start ?? 0x30) + n);
    case 'egyptian':
      return toEgyptian(n);
    case 'cuneiform':
      return toCuneiform(n);
    case 'icao':
      return pad2(n)
        .split('')
        .map((d) => ICAO[Number(d)])
        .join(' ');
    case 'morse':
      return pad2(n)
        .split('')
        .map((d) => MORSE[Number(d)])
        .join(' ');
    case 'words':
      if (part === 'minute' && n === 0) return "O'CLOCK";
      if (part === 'minute' && n < 10) return `OH-${WORD_ONES[n]}`;
      return toWords(n);
    default:
      return pad2(n);
  }
}

/** The "HH:MM" and ":SS" strings for a text theme. */
export function formatChronoText(r: ChronoRender, hh: number, mm: number, ss: number): { main: string; sec: string } {
  const daySeconds = hh * 3600 + mm * 60 + ss;
  switch (r.numeral) {
    case 'decimal': {
      // French Republican time: 10 hours × 100 minutes × 100 seconds per day.
      const d = Math.floor((daySeconds / 86400) * 100000);
      return { main: `${Math.floor(d / 10000)}:${pad2(Math.floor(d / 100) % 100)}`, sec: `:${pad2(d % 100)}` };
    }
    case 'swatch': {
      // Internet Time: 1,000 .beats per day on Biel Mean Time (UTC+1).
      const now = new Date();
      const bmt = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds() + 3600) % 86400;
      const beats = bmt / 86.4;
      return { main: `@${String(Math.floor(beats)).padStart(3, '0')}`, sec: `.${pad2(Math.floor((beats % 1) * 100))}` };
    }
    case 'daypct': {
      const pct = (daySeconds / 86400) * 100;
      return { main: `${pct.toFixed(2).padStart(5, '0')}%`, sec: ` ${pad2(ss)}` };
    }
    case 'unix': {
      const epoch = Math.floor(Date.now() / 1000);
      return { main: String(Math.floor(epoch / 100)), sec: pad2(epoch % 100) };
    }
    case 'shichen': {
      // Twelve double-hours: 子 starts at 23:00 (子初) with its "proper"
      // hour (子正) at 00:00; each half is split into four 15-minute 刻.
      const branch = BRANCHES[Math.floor(((hh + 1) % 24) / 2)];
      const half = hh % 2 === 1 ? '初' : '正';
      return { main: `${branch}${half}${KE[Math.floor(mm / 15)]}`, sec: `${toCjk(ss, KANJI_DIGITS, '十')}秒` };
    }
    case 'utc': {
      const now = new Date();
      return { main: `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}`, sec: `:${pad2(now.getUTCSeconds())}Z` };
    }
    case 'hexday': {
      // Hexadecimal time: the day split into 16 hex-hours × 256 hex-minutes × 16 hex-seconds.
      const hex = Math.floor((daySeconds / 86400) * 65536)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0');
      return { main: `${hex[0]}_${hex.slice(1, 3)}`, sec: `_${hex[3]}` };
    }
    case 'mars': {
      // Coordinated Mars Time (Allison & McEwen 2000): mean solar time at the Martian prime meridian.
      const jdTT = Date.now() / 86400000 + 2440587.5 + 69.184 / 86400;
      const msd = (jdTT - 2405522.0028779) / 1.0274912517;
      const sol = Math.floor((((msd % 1) + 1) % 1) * 86400);
      return { main: `${pad2(Math.floor(sol / 3600))}:${pad2(Math.floor(sol / 60) % 60)}`, sec: `:${pad2(sol % 60)}` };
    }
    case 'julian': {
      const jd = Date.now() / 86400000 + 2440587.5;
      const [whole, frac] = jd.toFixed(5).split('.');
      return { main: whole, sec: `.${frac}` };
    }
    case 'sidereal': {
      // Greenwich Mean Sidereal Time: the sky's clock, ~3m56s faster per day than the Sun's.
      const d = Date.now() / 86400000 + 2440587.5 - 2451545.0;
      const gmst = Math.floor((((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24 * 3600);
      return { main: `${pad2(Math.floor(gmst / 3600))}:${pad2(Math.floor(gmst / 60) % 60)}`, sec: `:${pad2(gmst % 60)}` };
    }
    case 'kilosec':
      return { main: (daySeconds / 1000).toFixed(3).padStart(6, '0'), sec: 'ks' };
    case 'countdown': {
      const left = 86400 - daySeconds;
      return { main: `−${pad2(Math.floor(left / 3600) % 24)}:${pad2(Math.floor(left / 60) % 60)}`, sec: `:${pad2(left % 60)}` };
    }
    case 'ghati': {
      // Vedic time from a nominal 06:00 sunrise: 60 ghaṭī × 60 pala × 60 vipala per day.
      const vipala = Math.floor((((daySeconds - 21600 + 86400) % 86400) / 86400) * 216000);
      return {
        main: `${pad2(Math.floor(vipala / 3600))}:${pad2(Math.floor(vipala / 60) % 60)}`,
        sec: `:${pad2(vipala % 60)}`,
      };
    }
    case 'ke': {
      // Classical Chinese 百刻: 100 刻 per day, 100 分 per 刻.
      const fen = Math.floor((daySeconds / 86400) * 10000);
      return { main: `${toCjk(Math.floor(fen / 100), KANJI_DIGITS, '十')}刻`, sec: `${toCjk(fen % 100, KANJI_DIGITS, '十')}分` };
    }
  }
  const hour = r.meridiem ? ((hh + 11) % 12) + 1 : hh;
  const h = formatChronoNumber(r, hour, 'hour');
  const m = formatChronoNumber(r, mm, 'minute');
  const s = formatChronoNumber(r, ss, 'second');
  const units = r.numeral === 'cjk' ? r.cjk?.units : undefined;
  const label = r.meridiem ? r.meridiem.labels[hh < 12 ? 0 : 1] : '';
  const before = r.meridiem?.before ? label : '';
  const after = r.meridiem && !r.meridiem.before ? ` ${label}` : '';
  if (units) return { main: `${before}${h}${units[0]}${m}${units[1]}`, sec: `${s}${units[2]}${after}` };
  const sep = r.sep ?? ':';
  return { main: `${before}${h}${sep}${m}`, sec: `${sep.trim() ? sep : ' '}${s}${after}` };
}

// Every glyph a text theme can ever print, used to request a tiny subset of
// its web font (Google Fonts `text=`) instead of the whole family.
export function chronoGlyphSet(theme: ChronoTheme): string {
  // Clock-of-the-world systems read Date.now(), so the loop below can't
  // enumerate their digits; seed every digit they may print.
  const chars = new Set<string>(Array.from('0123456789ABCDEF'));
  for (let n = 0; n < 60; n++) {
    const parts = formatChronoText(theme.render, n % 24, n, n);
    for (const ch of parts.main + parts.sec) chars.add(ch);
  }
  return Array.from(chars).join('');
}

// ==========================================
// Lazy web-font loading
// ==========================================

const loadedFontHrefs = new Set<string>();

export function ensureChronoFont(theme: ChronoTheme): void {
  const font = theme.render.font;
  if (typeof document === 'undefined' || !font?.google || !font.family) return;
  const family = font.family.replace(/ /g, '+');
  const weight = font.weight ? `:wght@${font.weight}` : '';
  const text = encodeURIComponent(chronoGlyphSet(theme));
  const href = `https://fonts.googleapis.com/css2?family=${family}${weight}&text=${text}&display=swap`;
  if (loadedFontHrefs.has(href)) return;
  loadedFontHrefs.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function chronoFontStack(font: ChronoFont | undefined): string | undefined {
  if (!font) return undefined;
  if (font.stack) return font.stack;
  if (font.family) return `'${font.family}', ui-monospace, SFMono-Regular, Menlo, monospace`;
  return undefined;
}
