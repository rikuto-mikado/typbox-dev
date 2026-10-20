// UI Font themes: swap the typeface behind TYPBOX's mono readouts (and, for
// fonts that read well at paragraph length, the rest of the UI too). Every
// family is served by Google Fonts; unlocks reuse the Chronometer Theme rule
// set (level / streak / logs / hours / session / ascension).
import type { ChronoUnlock } from './chronometerThemes';

export type UiFontKind = 'code' | 'humanist' | 'retro' | 'display';

export interface UiFont {
  id: string;
  code: string;
  name: string;
  /** Google Fonts family name; null = the system monospace stack. */
  family: string | null;
  kind: UiFontKind;
  /**
   * Also used for body text (`--font-sans`). Display faces stay on the
   * mono readouts only, so long descriptions remain readable.
   */
  body: boolean;
  desc: string;
  unlock: ChronoUnlock;
}

export const UI_FONT_KINDS: Array<{ id: UiFontKind; label: string }> = [
  { id: 'code', label: 'CODE' },
  { id: 'humanist', label: 'HUMANIST' },
  { id: 'retro', label: 'RETRO' },
  { id: 'display', label: 'DISPLAY' },
];

const FREE: ChronoUnlock = { type: 'default' };
const lv = (value: number): ChronoUnlock => ({ type: 'level', value });
const logs = (value: number): ChronoUnlock => ({ type: 'sessions', value });
const hours = (value: number): ChronoUnlock => ({ type: 'hours', value });
const streak = (value: number): ChronoUnlock => ({ type: 'streak', value });
const session = (value: number): ChronoUnlock => ({ type: 'session', value });

type Row = [id: string, name: string, family: string | null, kind: UiFontKind, body: boolean, unlock: ChronoUnlock, desc: string];

// Ordered roughly by unlock effort; codes follow this order.
const ROWS: Row[] = [
  ['system', 'SYSTEM MONO', null, 'code', true, FREE, 'Your device’s own monospace (SF Mono, Consolas, Menlo…). The original TYPBOX look.'],
  ['jetbrains-mono', 'JETBRAINS MONO', 'JetBrains Mono', 'code', true, FREE, 'Tall x-height and clear 0/O, built for long sessions in an editor.'],
  ['ibm-plex-mono', 'IBM PLEX MONO', 'IBM Plex Mono', 'code', true, FREE, 'IBM’s corporate mono: engineered, slightly warm, very legible.'],
  ['fira-code', 'FIRA CODE', 'Fira Code', 'code', true, FREE, 'Mozilla’s Fira Mono, extended with programming ligatures.'],
  ['source-code-pro', 'SOURCE CODE PRO', 'Source Code Pro', 'code', true, FREE, 'Adobe’s open-source mono: light, airy and neutral.'],
  ['roboto-mono', 'ROBOTO MONO', 'Roboto Mono', 'code', true, lv(10), 'Android’s Roboto, squared off into fixed-width.'],
  ['inconsolata', 'INCONSOLATA', 'Inconsolata', 'humanist', true, logs(5), 'A humanist take on Consolas: compact and friendly.'],
  ['space-mono', 'SPACE MONO', 'Space Mono', 'retro', true, lv(30), 'Geometric grotesque mono with a 1960s editorial edge.'],
  ['dm-mono', 'DM MONO', 'DM Mono', 'humanist', true, hours(5), 'Soft, low-contrast mono from Colophon for DeepMind.'],
  ['ubuntu-mono', 'UBUNTU MONO', 'Ubuntu Mono', 'humanist', true, streak(2), 'Narrow, rounded terminal face from the Ubuntu family.'],
  ['red-hat-mono', 'RED HAT MONO', 'Red Hat Mono', 'code', true, lv(60), 'Crisp corporate mono from the Red Hat type system.'],
  ['geist-mono', 'GEIST MONO', 'Geist Mono', 'code', true, logs(20), 'Vercel’s Swiss-inspired mono: precise and minimal.'],
  ['courier-prime', 'COURIER PRIME', 'Courier Prime', 'retro', true, lv(90), 'Courier, redrawn properly — the screenwriter’s typewriter.'],
  ['noto-sans-mono', 'NOTO SANS MONO', 'Noto Sans Mono', 'code', true, hours(20), 'Google’s Noto: dependable, neutral, huge character set.'],
  ['overpass-mono', 'OVERPASS MONO', 'Overpass Mono', 'humanist', true, lv(130), 'Inspired by US highway signage (Highway Gothic).'],
  ['cousine', 'COUSINE', 'Cousine', 'code', true, streak(4), 'Metric-compatible with Courier New, but cleaner.'],
  ['anonymous-pro', 'ANONYMOUS PRO', 'Anonymous Pro', 'retro', true, lv(180), 'A classic coder’s face with slab-ish character.'],
  ['reddit-mono', 'REDDIT MONO', 'Reddit Mono', 'humanist', true, logs(40), 'Rounded, upbeat mono from Reddit’s own type family.'],
  ['atkinson-mono', 'ATKINSON HYPERLEGIBLE', 'Atkinson Hyperlegible Mono', 'humanist', true, lv(230), 'Braille Institute’s face, designed for maximum legibility.'],
  ['pt-mono', 'PT MONO', 'PT Mono', 'code', true, hours(40), 'Part of ParaType’s public PT superfamily.'],
  ['fira-mono', 'FIRA MONO', 'Fira Mono', 'code', true, lv(290), 'The original Fira Mono, without ligatures.'],
  ['google-sans-code', 'GOOGLE SANS CODE', 'Google Sans Code', 'code', true, session(60), 'Google’s product sans, tuned for code.'],
  ['sometype-mono', 'SOMETYPE MONO', 'Sometype Mono', 'humanist', true, lv(350), 'Quirky, hand-tuned curves in a fixed grid.'],
  ['spline-sans-mono', 'SPLINE SANS MONO', 'Spline Sans Mono', 'humanist', true, streak(7), 'Grotesque mono with a confident, modern stance.'],
  ['chivo-mono', 'CHIVO MONO', 'Chivo Mono', 'code', true, lv(420), 'Sturdy grotesque mono from Omnibus-Type.'],
  ['b612-mono', 'B612 MONO', 'B612 Mono', 'code', true, logs(75), 'Designed by Airbus for aircraft cockpit displays.'],
  ['ubuntu-sans-mono', 'UBUNTU SANS MONO', 'Ubuntu Sans Mono', 'humanist', true, hours(75), 'The modern successor to Ubuntu Mono.'],
  ['azeret-mono', 'AZERET MONO', 'Azeret Mono', 'code', true, lv(500), 'Square, technical, made for dashboards like this one.'],
  ['victor-mono', 'VICTOR MONO', 'Victor Mono', 'code', true, streak(10), 'Narrow and crisp, with a famous cursive italic.'],
  ['fragment-mono', 'FRAGMENT MONO', 'Fragment Mono', 'code', true, lv(600), 'Helvetica-like grotesque, pressed into monospace.'],
  ['martian-mono', 'MARTIAN MONO', 'Martian Mono', 'display', true, logs(120), 'Wide, futuristic proportions from Evil Martians.'],
  ['sono', 'SONO', 'Sono', 'humanist', true, lv(720), 'Variable-width-feeling mono with lively curves.'],
  ['oxygen-mono', 'OXYGEN MONO', 'Oxygen Mono', 'code', true, hours(120), 'Clean KDE-era mono with simple geometry.'],
  ['lekton', 'LEKTON', 'Lekton', 'retro', true, lv(850), 'Inspired by vintage Olivetti typewriter faces.'],
  ['cutive-mono', 'CUTIVE MONO', 'Cutive Mono', 'retro', true, session(120), 'Light, airy typewriter face based on IBM’s Selectric.'],
  ['kode-mono', 'KODE MONO', 'Kode Mono', 'display', true, lv(1000), 'Angular, cut-corner mono with sci-fi energy.'],
  ['share-tech-mono', 'SHARE TECH MONO', 'Share Tech Mono', 'display', true, streak(14), 'Condensed techno mono, like a ship’s computer.'],
  ['xanh-mono', 'XANH MONO', 'Xanh Mono', 'retro', true, lv(1200), 'A serif monospace with calligraphic contrast.'],
  ['syne-mono', 'SYNE MONO', 'Syne Mono', 'display', false, hours(200), 'Off-kilter, art-school mono. Readouts only.'],
  ['nova-mono', 'NOVA MONO', 'Nova Mono', 'display', false, lv(1450), 'Rounded, geometric, distinctly 2000s web. Readouts only.'],
  ['vt323', 'VT323', 'VT323', 'retro', false, logs(200), 'The DEC VT320 terminal’s bitmap font. Readouts only.'],
  ['doto', 'DOTO', 'Doto', 'display', false, lv(1800), 'Dot-matrix mono built from round pixels. Readouts only.'],
  ['silkscreen', 'SILKSCREEN', 'Silkscreen', 'display', false, streak(30), 'Tiny pixel caps, straight off a handheld screen. Readouts only.'],
  ['major-mono', 'MAJOR MONO DISPLAY', 'Major Mono Display', 'display', false, { type: 'ascension', value: 1 }, 'Geometric display mono. An Ascension reward. Readouts only.'],
];

export const UI_FONTS: UiFont[] = ROWS.map(([id, name, family, kind, body, unlock, desc], i) => ({
  id,
  code: `FN-${String(i + 1).padStart(2, '0')}`,
  name,
  family,
  kind,
  body,
  unlock,
  desc,
}));

export const DEFAULT_UI_FONT_ID = 'system';
export const UI_FONT_STORAGE_KEY = 'typbox_ui_font';

const FONT_BY_ID = new Map(UI_FONTS.map((f) => [f.id, f]));
export const isUiFontId = (v: unknown): v is string => typeof v === 'string' && FONT_BY_ID.has(v);
export const getUiFontById = (id: string | null | undefined): UiFont =>
  (id && FONT_BY_ID.get(id)) || (FONT_BY_ID.get(DEFAULT_UI_FONT_ID) as UiFont);

// Fallback stacks mirror Tailwind's defaults so an unloaded web font
// degrades to exactly what the app used before.
const MONO_FALLBACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const SANS_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif';

const gfUrl = (family: string, text?: string) =>
  `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;500;600;700${
    text ? `&text=${encodeURIComponent(text)}` : ''
  }&display=swap`;

const injected = new Set<string>();
function injectStylesheet(href: string): void {
  if (typeof document === 'undefined' || injected.has(href)) return;
  injected.add(href);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/** Loads the full font (all four weights) for use across the UI. */
export function ensureUiFont(font: UiFont): void {
  if (font.family) injectStylesheet(gfUrl(font.family));
}

/** Sample shown on picker tiles; previews load only these glyphs. */
export const UI_FONT_SAMPLE = 'Study 42.5H · LV.0420';

/** Loads a glyph subset for a picker preview (tiny request per font). */
export function ensureUiFontPreview(font: UiFont): void {
  if (font.family) injectStylesheet(gfUrl(font.family, `${UI_FONT_SAMPLE}${font.name}`));
}

export const uiFontStack = (font: UiFont): string =>
  font.family ? `"${font.family}", ${MONO_FALLBACK}` : MONO_FALLBACK;

/**
 * Points Tailwind's `font-mono` / `font-sans` theme variables at the font
 * (both read `var(--font-*)`, so every utility follows without touching
 * markup). The system default removes the overrides entirely.
 */
export function applyUiFont(font: UiFont): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  if (!font.family) {
    root.removeProperty('--font-mono');
    root.removeProperty('--font-sans');
    return;
  }
  ensureUiFont(font);
  root.setProperty('--font-mono', uiFontStack(font));
  if (font.body) root.setProperty('--font-sans', `"${font.family}", ${SANS_FALLBACK}`);
  else root.removeProperty('--font-sans');
}
