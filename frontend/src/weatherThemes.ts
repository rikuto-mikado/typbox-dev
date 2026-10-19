// Weather widget themes: how the SYSTEM CHRONOMETER weather badge and panel
// draw the current conditions. Pure data + mapping tables; rendering lives
// in Weather.tsx (WeatherFace).

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
  | 'led';

export interface WeatherTheme {
  id: WeatherThemeId;
  code: string;
  name: string;
  desc: string;
}

export const DEFAULT_WEATHER_THEME: WeatherThemeId = 'line';

export const WEATHER_THEMES: WeatherTheme[] = [
  { id: 'line', code: 'WX-01', name: 'LINE ICONS', desc: 'Thin animated line icons: turning sun rays, drifting clouds, falling rain.' },
  { id: 'minimal', code: 'WX-02', name: 'MINIMAL TEXT', desc: 'Just the temperature and one quiet word.' },
  { id: 'pixel', code: 'WX-03', name: 'PIXEL ART', desc: '11×11 pixel sprites straight out of a handheld weather app.' },
  { id: 'ascii', code: 'WX-04', name: 'ASCII ART', desc: 'Terminal-style ASCII weather, like curl wttr.in.' },
  { id: 'emoji', code: 'WX-05', name: 'EMOJI', desc: 'Full-color emoji weather at a glance.' },
  { id: 'cyber', code: 'WX-06', name: 'CYBER HUD', desc: 'Neon heads-up readout: WX::PCLD +18.0°C.' },
  { id: 'metar', code: 'WX-07', name: 'AVIATION METAR', desc: 'Pilot-style sky cover and wind in knots: SCT 18 03KT.' },
  { id: 'kanji', code: 'WX-08', name: 'KANJI SEAL', desc: 'One kanji (晴・曇・雨・雪…) stamped in a red seal.' },
  { id: 'glyph', code: 'WX-09', name: 'UNICODE GLYPH', desc: 'Monochrome Unicode weather symbols ☀ ☁ ☂ ❄.' },
  { id: 'thermo', code: 'WX-10', name: 'THERMOMETER', desc: 'A tiny thermometer whose fill and color follow the temperature.' },
  { id: 'led', code: 'WX-11', name: 'SIGNAL LED', desc: 'A status LED color-coded by condition, beside the reading.' },
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

export const SHORT_WORD: Record<'en' | 'ja', Record<WeatherKind, string>> = {
  en: {
    clear: 'CLEAR',
    'mostly-clear': 'FAIR',
    partly: 'CLOUDS',
    overcast: 'OVERCAST',
    fog: 'FOG',
    drizzle: 'DRIZZLE',
    rain: 'RAIN',
    snow: 'SNOW',
    thunder: 'STORM',
  },
  ja: {
    clear: '快晴',
    'mostly-clear': '晴れ',
    partly: '晴曇',
    overcast: '曇り',
    fog: '霧',
    drizzle: '霧雨',
    rain: '雨',
    snow: '雪',
    thunder: '雷雨',
  },
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
