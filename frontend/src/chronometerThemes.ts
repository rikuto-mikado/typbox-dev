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
  | { type: 'ascension'; value: number };

export type ChronoNumeral = 'arabic' | 'digits' | 'roman' | 'cjk' | 'radix' | 'greek' | 'morse' | 'words';
export type ChronoFx = 'neon' | 'matrix' | 'crt' | 'outline' | 'glitch' | 'nixie' | 'sunset' | 'holo' | 'gold' | 'quantum';

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
  kind: 'text' | 'segment' | 'dotmatrix' | 'mayan' | 'bcd';
  numeral?: ChronoNumeral;
  digits?: string[];
  numberPrefix?: string;
  cjk?: { digits: string[]; ten: string; units?: [string, string, string] };
  radix?: { base: number; pad: number; prefix?: string };
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
}

export const CHRONO_THEMES = catalog.themes as ChronoTheme[];
export const CHRONO_FAMILIES = catalog.families as ChronoFamily[];
export const DEFAULT_CHRONO_THEME_ID = 'system-mono';
export const CHRONO_THEME_STORAGE_KEY = 'typbox_chrono_theme';

const THEME_BY_ID = new Map(CHRONO_THEMES.map((t) => [t.id, t]));

export function getChronoThemeById(id: string | null | undefined): ChronoTheme {
  return (id && THEME_BY_ID.get(id)) || THEME_BY_ID.get(DEFAULT_CHRONO_THEME_ID) || CHRONO_THEMES[0];
}

export function isChronoThemeUnlocked(theme: ChronoTheme, p: ChronoProgress): boolean {
  const u = theme.unlock;
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
  }
}

// Sort key that places every theme on one rough "effort" ladder so the
// picker reads from easiest to hardest regardless of unlock type.
export function chronoUnlockRank(theme: ChronoTheme): number {
  const u = theme.unlock;
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
  }
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
      const { base, pad, prefix = '' } = r.radix ?? { base: 10, pad: 2 };
      return `${prefix}${n.toString(base).toUpperCase().padStart(pad, '0')}`;
    }
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
  const h = formatChronoNumber(r, hh, 'hour');
  const m = formatChronoNumber(r, mm, 'minute');
  const s = formatChronoNumber(r, ss, 'second');
  const units = r.numeral === 'cjk' ? r.cjk?.units : undefined;
  if (units) return { main: `${h}${units[0]}${m}${units[1]}`, sec: `${s}${units[2]}` };
  const sep = r.sep ?? ':';
  return { main: `${h}${sep}${m}`, sec: `${sep.trim() ? sep : ' '}${s}` };
}

// Every glyph a text theme can ever print, used to request a tiny subset of
// its web font (Google Fonts `text=`) instead of the whole family.
export function chronoGlyphSet(theme: ChronoTheme): string {
  const chars = new Set<string>();
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
