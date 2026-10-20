// Weather widget themes: how the SYSTEM CHRONOMETER weather badge and panel
// draw the current conditions. Pure data + mapping tables; rendering lives
// in Weather.tsx (WeatherFace). Unlocks reuse the Chronometer Theme rule set
// (level / streak / logs / hours / session / ascension).
import type { ChronoUnlock } from './chronometerThemes';

export type WeatherKind = 'clear' | 'mostly-clear' | 'partly' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

export type WeatherThemeId =
  | 'line'
  | 'minimal'
  | 'pixel'
  | 'ascii'
  | 'emoji'
  | 'cyber'
  | 'metar'
  | 'kanji'
  | 'glyph'
  | 'thermo'
  | 'led'
  | 'neon'
  | 'sticker'
  | 'terminal'
  | 'lcd'
  | 'calendar'
  | 'flap'
  | 'dotmatrix'
  | 'scale'
  | 'beaufort'
  | 'jma'
  | 'haiku'
  | 'windsock'
  | 'barometer'
  | 'morse'
  | 'broadcast'
  | 'nixie'
  | 'station'
  | 'radar'
  | 'binary'
  | 'braille'
  | 'barcode'
  | 'aura';

export interface WeatherTheme {
  id: WeatherThemeId;
  code: string;
  name: string;
  desc: string;
  unlock: ChronoUnlock;
}

export const DEFAULT_WEATHER_THEME: WeatherThemeId = 'line';

const FREE: ChronoUnlock = { type: 'default' };

// WX-01..11 stay free forever (accounts already use them); WX-12..33 unlock
// along the same effort ladder as Chronometer Themes, interleaving rule
// types so something new lands every few study sessions early on and every
// few hundred levels later.
export const WEATHER_THEMES: WeatherTheme[] = [
  { id: 'line', code: 'WX-01', name: 'LINE ICONS', desc: 'Thin animated line icons: turning sun rays, drifting clouds, falling rain.', unlock: FREE },
  { id: 'minimal', code: 'WX-02', name: 'MINIMAL TEXT', desc: 'Just the temperature and one quiet word.', unlock: FREE },
  { id: 'pixel', code: 'WX-03', name: 'PIXEL ART', desc: '11×11 pixel sprites straight out of a handheld weather app.', unlock: FREE },
  { id: 'ascii', code: 'WX-04', name: 'ASCII ART', desc: 'Terminal-style ASCII weather, like curl wttr.in.', unlock: FREE },
  { id: 'emoji', code: 'WX-05', name: 'EMOJI', desc: 'Full-color emoji weather at a glance.', unlock: FREE },
  { id: 'cyber', code: 'WX-06', name: 'CYBER HUD', desc: 'Neon heads-up readout: WX::PCLD +18.0°C.', unlock: FREE },
  { id: 'metar', code: 'WX-07', name: 'AVIATION METAR', desc: 'Pilot-style sky cover and wind in knots: SCT 18 03KT.', unlock: FREE },
  { id: 'kanji', code: 'WX-08', name: 'KANJI SEAL', desc: 'One kanji (晴・曇・雨・雪…) stamped in a red seal.', unlock: FREE },
  { id: 'glyph', code: 'WX-09', name: 'UNICODE GLYPH', desc: 'Monochrome Unicode weather symbols ☀ ☁ ☂ ❄.', unlock: FREE },
  { id: 'thermo', code: 'WX-10', name: 'THERMOMETER', desc: 'A tiny thermometer whose fill and color follow the temperature.', unlock: FREE },
  { id: 'led', code: 'WX-11', name: 'SIGNAL LED', desc: 'A status LED color-coded by condition, beside the reading.', unlock: FREE },
  { id: 'neon', code: 'WX-12', name: 'NEON SIGN', desc: 'A glowing glass-tube sign that flickers on in the condition color.', unlock: { type: 'level', value: 25 } },
  { id: 'sticker', code: 'WX-13', name: 'STICKER', desc: 'A chunky die-cut sticker with a pastel backing.', unlock: { type: 'sessions', value: 10 } },
  { id: 'terminal', code: 'WX-14', name: 'TERMINAL', desc: 'A shell prompt reading the sky, cursor blinking: $ wx → RAIN 12°C', unlock: { type: 'level', value: 60 } },
  { id: 'lcd', code: 'WX-15', name: 'LCD SEGMENT', desc: 'A grey-green pocket-gadget LCD, with ghost 88s behind the digits.', unlock: { type: 'hours', value: 10 } },
  { id: 'calendar', code: 'WX-16', name: 'TEAR-OFF CALENDAR', desc: 'A daily calendar page: red header, big temperature.', unlock: { type: 'streak', value: 3 } },
  { id: 'flap', code: 'WX-17', name: 'SPLIT-FLAP', desc: 'Departure-board flaps, one character per tile.', unlock: { type: 'level', value: 150 } },
  { id: 'dotmatrix', code: 'WX-18', name: 'DOT MATRIX', desc: 'Amber LED dot-matrix digits, like a station platform sign.', unlock: { type: 'sessions', value: 50 } },
  { id: 'scale', code: 'WX-19', name: 'TEMP SCALE', desc: 'A cold-to-hot gradient rule with a marker at the current temperature.', unlock: { type: 'level', value: 250 } },
  { id: 'beaufort', code: 'WX-20', name: 'BEAUFORT', desc: 'Wind on the Beaufort scale (0–12), with its official name.', unlock: { type: 'session', value: 90 } },
  { id: 'jma', code: 'WX-21', name: 'JMA MAP SYMBOL', desc: 'Japan Meteorological Agency map symbols: ○ clear, ⦶ fair, ◎ cloudy, ● rain…', unlock: { type: 'hours', value: 50 } },
  { id: 'haiku', code: 'WX-22', name: 'HAIKU', desc: 'One quiet line of verse for the sky right now.', unlock: { type: 'streak', value: 7 } },
  { id: 'windsock', code: 'WX-23', name: 'WINDSOCK', desc: 'An airfield windsock that fills out as the wind picks up.', unlock: { type: 'level', value: 400 } },
  { id: 'barometer', code: 'WX-24', name: 'BAROMETER', desc: 'A brass aneroid dial pointing at STORMY · RAIN · CHANGE · FAIR · VERY DRY.', unlock: { type: 'level', value: 600 } },
  { id: 'morse', code: 'WX-25', name: 'MORSE CODE', desc: 'The condition tapped out in dots and dashes.', unlock: { type: 'sessions', value: 150 } },
  { id: 'broadcast', code: 'WX-26', name: 'LOCAL FORECAST', desc: 'A 90s cable-TV weather crawl: blue gradient, bold yellow numerals.', unlock: { type: 'hours', value: 150 } },
  { id: 'nixie', code: 'WX-27', name: 'NIXIE TUBE', desc: 'Orange neon numerals glowing inside glass tubes.', unlock: { type: 'level', value: 900 } },
  { id: 'station', code: 'WX-28', name: 'STATION PLOT', desc: 'A meteorologist’s station model: sky cover in oktas plus a wind barb.', unlock: { type: 'streak', value: 21 } },
  { id: 'radar', code: 'WX-29', name: 'DOPPLER RADAR', desc: 'A sweeping radar scope, echoes colored by precipitation.', unlock: { type: 'level', value: 1300 } },
  { id: 'binary', code: 'WX-30', name: 'BINARY', desc: 'The temperature as eight lit bits. For the very committed.', unlock: { type: 'session', value: 180 } },
  { id: 'braille', code: 'WX-31', name: 'BRAILLE', desc: 'Condition and temperature in Unicode braille cells.', unlock: { type: 'hours', value: 400 } },
  { id: 'barcode', code: 'WX-32', name: 'BARCODE', desc: 'Today’s sky printed as a scannable-looking label.', unlock: { type: 'level', value: 2000 } },
  { id: 'aura', code: 'WX-33', name: 'AURA', desc: 'A soft glowing orb whose colors shift with the sky. Ascension reward.', unlock: { type: 'ascension', value: 1 } },
];

const THEME_IDS = new Set<string>(WEATHER_THEMES.map((t) => t.id));
export const isWeatherThemeId = (v: unknown): v is WeatherThemeId => typeof v === 'string' && THEME_IDS.has(v);

// WMO weather interpretation codes -> condition.
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if (code === 1) return 'mostly-clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'overcast';
}

export const SHORT_WORD: Record<WeatherKind, string> = {
  clear: 'CLEAR',
  'mostly-clear': 'FAIR',
  partly: 'CLOUDS',
  overcast: 'OVERCAST',
  fog: 'FOG',
  drizzle: 'DRIZZLE',
  rain: 'RAIN',
  snow: 'SNOW',
  thunder: 'STORM',
};

export const CYBER_CODE: Record<WeatherKind, string> = {
  clear: 'CLR',
  'mostly-clear': 'MCLR',
  partly: 'PCLD',
  overcast: 'OVC',
  fog: 'FOG',
  drizzle: 'DRZL',
  rain: 'RAIN',
  snow: 'SNOW',
  thunder: 'STRM',
};

// METAR sky cover / present-weather groups.
export const METAR_CODE: Record<WeatherKind, string> = {
  clear: 'SKC',
  'mostly-clear': 'FEW',
  partly: 'SCT',
  overcast: 'OVC',
  fog: 'FG',
  drizzle: 'DZ',
  rain: 'RA',
  snow: 'SN',
  thunder: 'TS',
};

export const KANJI: Record<WeatherKind, string> = {
  clear: '晴',
  'mostly-clear': '晴',
  partly: '曇',
  overcast: '曇',
  fog: '霧',
  drizzle: '雨',
  rain: '雨',
  snow: '雪',
  thunder: '雷',
};

export const EMOJI: Record<WeatherKind, [day: string, night: string]> = {
  clear: ['☀️', '🌙'],
  'mostly-clear': ['🌤️', '🌙'],
  partly: ['⛅', '☁️'],
  overcast: ['☁️', '☁️'],
  fog: ['🌫️', '🌫️'],
  drizzle: ['🌦️', '🌧️'],
  rain: ['🌧️', '🌧️'],
  snow: ['🌨️', '🌨️'],
  thunder: ['⛈️', '⛈️'],
};

// U+FE0E forces the monochrome text presentation.
const T = '︎';
export const GLYPH: Record<WeatherKind, [day: string, night: string]> = {
  clear: [`☀${T}`, `☾${T}`],
  'mostly-clear': [`☼${T}`, `☾${T}`],
  partly: [`⛅${T}`, `☁${T}`],
  overcast: [`☁${T}`, `☁${T}`],
  fog: ['≋', '≋'],
  drizzle: [`☂${T}`, `☂${T}`],
  rain: [`☔${T}`, `☔${T}`],
  snow: [`❄${T}`, `❄${T}`],
  thunder: [`☈${T}`, `☈${T}`],
};

export const LED_COLOR: Record<WeatherKind, string> = {
  clear: '#fbbf24',
  'mostly-clear': '#fcd34d',
  partly: '#a3e635',
  overcast: '#a1a1aa',
  fog: '#94a3b8',
  drizzle: '#7dd3fc',
  rain: '#38bdf8',
  snow: '#e0f2fe',
  thunder: '#c084fc',
};

// ASCII art: 3-line panel art + a one-line badge form.
export const ASCII: Record<WeatherKind, { day: [string[], string]; night: [string[], string] }> = {
  clear: {
    day: [[' \\ | / ', ' - O - ', ' / | \\ '], '-O-'],
    night: [['  .--. ', ' (  (  ', "  `--' "], '(('],
  },
  'mostly-clear': {
    day: [[' \\ |   ', ' -O .-.', '  (   )'], '-O.-'],
    night: [['  .--  ', ' ( .-. ', "  (   )"], '((.-'],
  },
  partly: {
    day: [['  \\ .-. ', ' -O(   ).', '  (___._)'], 'O(~)'],
    night: [['   .-.  ', ' ((   ).', '  (___._)'], '((~)'],
  },
  overcast: {
    day: [['   .--.  ', ' .(    ).', '(___.__) '], '(~~)'],
    night: [['   .--.  ', ' .(    ).', '(___.__) '], '(~~)'],
  },
  fog: {
    day: [[' _ - _ - ', '  _ - _  ', ' _ - _ - '], '=-='],
    night: [[' _ - _ - ', '  _ - _  ', ' _ - _ - '], '=-='],
  },
  drizzle: {
    day: [['  .-.   ', ' (   ). ', "  ' ' ' "], "(~)'"],
    night: [['  .-.   ', ' (   ). ', "  ' ' ' "], "(~)'"],
  },
  rain: {
    day: [['  .-.   ', ' (   ). ', " ','.',' "], '(~)/'],
    night: [['  .-.   ', ' (   ). ', " ','.',' "], '(~)/'],
  },
  snow: {
    day: [['  .-.   ', ' (   ). ', '  * * * '], '(~)*'],
    night: [['  .-.   ', ' (   ). ', '  * * * '], '(~)*'],
  },
  thunder: {
    day: [['  .-.   ', ' (   ). ', '  /_ /_ '], '(~)/_'],
    night: [['  .-.   ', ' (   ). ', '  /_ /_ '], '(~)/_'],
  },
};

// 11×11 pixel sprites. y=yellow, p=moon violet, c=ink, b=rain blue, w=snow.
const SUN = [
  '.....y.....',
  '.y...y...y.',
  '..y.....y..',
  '....yyy....',
  '...yyyyy...',
  'yy.yyyyy.yy',
  '...yyyyy...',
  '....yyy....',
  '..y.....y..',
  '.y...y...y.',
  '.....y.....',
];
const MOON = [
  '...pppp....',
  '..pp.......',
  '.pp........',
  '.pp........',
  'pp.........',
  'pp.........',
  'pp.........',
  '.pp......p.',
  '.ppp....pp.',
  '..ppppppp..',
  '....ppp....',
];
const PARTLY = [
  '.y...y.....',
  '...yyy.....',
  'y.yyyyy....',
  '..yyyccc...',
  '.y.yc...c..',
  '...cc....cc',
  '..c.......c',
  '.c........c',
  '.c........c',
  '..cccccccc.',
  '...........',
];
const CLOUD = [
  '...........',
  '...........',
  '....ccc....',
  '...c...c...',
  '..cc....cc.',
  '.c........c',
  'c.........c',
  'c.........c',
  '.ccccccccc.',
  '...........',
  '...........',
];
const FOG = [
  '...........',
  '...........',
  'cccccccc...',
  '...........',
  '..ccccccccc',
  '...........',
  'cccccccc...',
  '...........',
  '...ccccccc.',
  '...........',
  '...........',
];
const precip = (ch: string) => [
  '....ccc....',
  '...c...c...',
  '..cc....cc.',
  '.c........c',
  'c.........c',
  '.ccccccccc.',
  '...........',
  `..${ch}..${ch}..${ch}..`,
  `.${ch}..${ch}..${ch}...`,
  '...........',
  `${ch}..${ch}..${ch}....`,
];
const THUNDER = [
  '....ccc....',
  '...c...c...',
  '..cc....cc.',
  '.c........c',
  'c.........c',
  '.cccc.cccc.',
  '.....yy....',
  '....yy.....',
  '...yyyy....',
  '.....yy....',
  '....y......',
];

export function pixelSprite(kind: WeatherKind, isDay: boolean): string[] {
  switch (kind) {
    case 'clear':
      return isDay ? SUN : MOON;
    case 'mostly-clear':
    case 'partly':
      return isDay ? PARTLY : PARTLY.map((row) => row.replace(/y/g, 'p'));
    case 'overcast':
      return CLOUD;
    case 'fog':
      return FOG;
    case 'drizzle':
    case 'rain':
      return precip('b');
    case 'snow':
      return precip('w');
    case 'thunder':
      return THUNDER;
  }
}

export const PIXEL_COLORS: Record<string, string> = {
  y: '#fbbf24',
  p: '#c4b5fd',
  c: 'currentColor',
  b: '#38bdf8',
  w: '#e0f2fe',
};

/** Thermometer fill (0..1) and color for a temperature in °C. */
export function thermoReading(tempC: number): { fill: number; color: string } {
  const fill = Math.max(0.05, Math.min(1, (tempC + 10) / 50));
  const color = tempC < 0 ? '#93c5fd' : tempC < 10 ? '#38bdf8' : tempC < 20 ? '#34d399' : tempC < 28 ? '#fbbf24' : '#ef4444';
  return { fill, color };
}

// ==========================================
// Tables for WX-12..33
// ==========================================

const MORSE_TABLE: Record<string, string> = {
  A: '.-', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', I: '..', L: '.-..', M: '--', N: '-.',
  O: '---', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', Z: '--..',
};
/** Morse for an A–Z word, letters separated by spaces (unknown letters dropped). */
export const toMorse = (word: string): string =>
  word
    .toUpperCase()
    .split('')
    .map((ch) => MORSE_TABLE[ch])
    .filter(Boolean)
    .join(' ');

// Grade-1 braille: letters, plus the number sign ⠼ before digits (a–j = 1–0).
const BRAILLE_LETTERS = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵';
export function toBraille(text: string): string {
  let out = '';
  let inNumber = false;
  for (const ch of text.toUpperCase()) {
    if (ch >= '0' && ch <= '9') {
      if (!inNumber) out += '⠼';
      inNumber = true;
      out += BRAILLE_LETTERS['1234567890'.indexOf(ch)];
      continue;
    }
    inNumber = false;
    if (ch >= 'A' && ch <= 'Z') out += BRAILLE_LETTERS[ch.charCodeAt(0) - 65];
    else if (ch === '-') out += '⠤';
    else if (ch === ' ') out += '⠀';
  }
  return out;
}

// Beaufort force from wind speed (km/h, upper bounds of forces 0..11).
const BEAUFORT_MAX_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
export const beaufortForce = (kmh: number): number => {
  const i = BEAUFORT_MAX_KMH.findIndex((max) => kmh < max);
  return i === -1 ? 12 : i;
};
// Official WMO names.
export const BEAUFORT_NAME: string[] = ['CALM', 'LIGHT AIR', 'LIGHT BREEZE', 'GENTLE BREEZE', 'MODERATE BREEZE', 'FRESH BREEZE', 'STRONG BREEZE', 'NEAR GALE', 'GALE', 'STRONG GALE', 'STORM', 'VIOLENT STORM', 'HURRICANE'];

// Aneroid barometer: needle angle in degrees (−120 = far left .. 120).
export const BAROMETER_ANGLE: Record<WeatherKind, number> = {
  thunder: -100,
  rain: -55,
  drizzle: -45,
  snow: -60,
  fog: -10,
  overcast: -5,
  partly: 10,
  'mostly-clear': 55,
  clear: 100,
};
export const BAROMETER_LABELS = ['STORMY', 'RAIN', 'CHANGE', 'FAIR', 'VERY DRY'];
/** The dial word the needle points at. */
export const barometerWord = (kind: WeatherKind): string =>
  BAROMETER_LABELS[Math.max(0, Math.min(4, Math.round((BAROMETER_ANGLE[kind] + 100) / 50)))];

// Station model: sky cover in oktas (9 = sky obscured) and the
// present-weather mark drawn to the left of the circle.
export const OKTAS: Record<WeatherKind, number> = {
  clear: 0,
  'mostly-clear': 2,
  partly: 4,
  overcast: 8,
  fog: 9,
  drizzle: 8,
  rain: 8,
  snow: 8,
  thunder: 8,
};
export const PRESENT_WX: Record<WeatherKind, string> = {
  clear: '',
  'mostly-clear': '',
  partly: '',
  overcast: '',
  fog: '≡',
  drizzle: ',',
  rain: '•',
  snow: '✱',
  thunder: 'ϟ',
};

// One line of verse per condition.
export const HAIKU: Record<WeatherKind, [day: string, night: string]> = {
  clear: ['the sky, wide open', 'a moon with nowhere to hide'],
  'mostly-clear': ['one cloud, idling by', 'thin cloud across the moon'],
  partly: ['sun, then shade, then sun', 'stars slip between the clouds'],
  overcast: ['a grey lid on the town', 'no stars tonight, just hum'],
  fog: ['the world, erased softly', 'streetlights wrapped in cotton'],
  drizzle: ['rain too shy to fall', 'a whisper on the window'],
  rain: ['the gutters are singing', 'rain keeps the night company'],
  snow: ['every sound, muffled', 'snow falling on snow'],
  thunder: ['the sky clears its throat', 'lightning writes, then erases'],
};

// 3×5 dot-matrix glyphs ('#' = lit).
export const DOT_FONT: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  '-': ['...', '...', '###', '...', '...'],
  '°': ['##.', '##.', '...', '...', '...'],
  C: ['###', '#..', '#..', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
};

// Pastel sticker backings and aura gradients per condition.
export const STICKER_BG: Record<WeatherKind, string> = {
  clear: '#fde68a',
  'mostly-clear': '#fef3c7',
  partly: '#d9f99d',
  overcast: '#e4e4e7',
  fog: '#e2e8f0',
  drizzle: '#bae6fd',
  rain: '#93c5fd',
  snow: '#f0f9ff',
  thunder: '#ddd6fe',
};
export const AURA: Record<WeatherKind, [day: [string, string], night: [string, string]]> = {
  clear: [['#fde047', '#f97316'], ['#a5b4fc', '#312e81']],
  'mostly-clear': [['#fef08a', '#38bdf8'], ['#c4b5fd', '#1e3a8a']],
  partly: [['#fef9c3', '#94a3b8'], ['#cbd5e1', '#334155']],
  overcast: [['#e5e7eb', '#6b7280'], ['#9ca3af', '#1f2937']],
  fog: [['#f1f5f9', '#cbd5e1'], ['#cbd5e1', '#475569']],
  drizzle: [['#bae6fd', '#64748b'], ['#7dd3fc', '#1e293b']],
  rain: [['#7dd3fc', '#1d4ed8'], ['#60a5fa', '#172554']],
  snow: [['#ffffff', '#bae6fd'], ['#e0f2fe', '#334155']],
  thunder: [['#f0abfc', '#4c1d95'], ['#e879f9', '#2e1065']],
};

// Radar echoes: [count, color] — none for dry skies.
export const RADAR_ECHO: Record<WeatherKind, [number, string]> = {
  clear: [0, ''],
  'mostly-clear': [0, ''],
  partly: [2, '#a1a1aa'],
  overcast: [3, '#a1a1aa'],
  fog: [4, '#94a3b8'],
  drizzle: [5, '#4ade80'],
  rain: [7, '#facc15'],
  snow: [6, '#e0f2fe'],
  thunder: [8, '#ef4444'],
};

/** Deterministic bar widths (1–3) for the barcode face. */
export function barcodeBars(seed: string, count: number): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Array.from({ length: count }, () => {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    return 1 + ((h >>> 0) % 3);
  });
}
