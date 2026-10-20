import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Lock, MapPin } from 'lucide-react';
import { tf, useI18n } from './i18n';
import type { Dict } from './i18n';
import {
  ASCII,
  AURA,
  BAROMETER_ANGLE,
  BEAUFORT_NAME,
  CYBER_CODE,
  DEFAULT_WEATHER_THEME,
  DOT_FONT,
  EMOJI,
  GLYPH,
  HAIKU,
  KANJI,
  LED_COLOR,
  METAR_CODE,
  OKTAS,
  PIXEL_COLORS,
  PRESENT_WX,
  RADAR_ECHO,
  SHORT_WORD,
  STICKER_BG,
  WEATHER_THEMES,
  barcodeBars,
  barometerWord,
  beaufortForce,
  isWeatherThemeId,
  pixelSprite,
  thermoReading,
  toBraille,
  toMorse,
  weatherKind,
  type WeatherKind,
  type WeatherTheme,
  type WeatherThemeId,
} from './weatherThemes';
import { isUnlockRuleMet, unlockRuleRank, type ChronoProgress } from './chronometerThemes';
import { unlockLockedMessage, unlockRequirementLabel } from './ChronometerFace';

// Weather badge for the SYSTEM CHRONOMETER header.
//
// Data: Open-Meteo (https://open-meteo.com, free, no API key, CC BY 4.0 —
// attribution shown in the panel). Location, in order of preference:
//   1. precise coordinates the user explicitly opted into (rounded to ~1 km),
//   2. a representative city for the account time zone (no prompt at all).
// Results are cached per location for 20 minutes in localStorage.
//
// Theme, unit and show/hide are account-synced (UserProfile.weather_*), like
// the Surface Theme; App owns the PATCH queue. Precise coordinates are never
// synced — they describe this device, not the account.

const PREFS_KEY = 'typbox_weather_prefs';
const CACHE_KEY = 'typbox_weather_cache';
const REFRESH_MS = 20 * 60 * 1000;

type Unit = 'c' | 'f';

interface WeatherPrefs {
  hidden?: boolean;
  unit?: Unit;
  precise?: { lat: number; lon: number };
  theme?: WeatherThemeId;
}

interface WeatherReading {
  key: string;
  at: number;
  tempC: number;
  code: number;
  isDay: boolean;
  windKmh: number;
}

// Representative city per common IANA zone: [lat, lon, city].
const ZONE_CITIES: Record<string, [number, number, string]> = {
  'Asia/Tokyo': [35.68, 139.69, 'Tokyo'],
  'Asia/Seoul': [37.57, 126.98, 'Seoul'],
  'Asia/Shanghai': [31.23, 121.47, 'Shanghai'],
  'Asia/Hong_Kong': [22.32, 114.17, 'Hong Kong'],
  'Asia/Taipei': [25.03, 121.57, 'Taipei'],
  'Asia/Singapore': [1.35, 103.82, 'Singapore'],
  'Asia/Bangkok': [13.76, 100.5, 'Bangkok'],
  'Asia/Ho_Chi_Minh': [10.82, 106.63, 'Ho Chi Minh City'],
  'Asia/Jakarta': [-6.2, 106.85, 'Jakarta'],
  'Asia/Manila': [14.6, 120.98, 'Manila'],
  'Asia/Kuala_Lumpur': [3.14, 101.69, 'Kuala Lumpur'],
  'Asia/Kolkata': [28.61, 77.21, 'New Delhi'],
  'Asia/Calcutta': [28.61, 77.21, 'New Delhi'],
  'Asia/Dhaka': [23.81, 90.41, 'Dhaka'],
  'Asia/Kathmandu': [27.72, 85.32, 'Kathmandu'],
  'Asia/Karachi': [24.86, 67.01, 'Karachi'],
  'Asia/Dubai': [25.2, 55.27, 'Dubai'],
  'Asia/Riyadh': [24.71, 46.68, 'Riyadh'],
  'Asia/Tehran': [35.69, 51.39, 'Tehran'],
  'Asia/Jerusalem': [31.77, 35.21, 'Jerusalem'],
  'Europe/Istanbul': [41.01, 28.98, 'Istanbul'],
  'Europe/London': [51.51, -0.13, 'London'],
  'Europe/Dublin': [53.35, -6.26, 'Dublin'],
  'Europe/Lisbon': [38.72, -9.14, 'Lisbon'],
  'Europe/Madrid': [40.42, -3.7, 'Madrid'],
  'Europe/Paris': [48.86, 2.35, 'Paris'],
  'Europe/Brussels': [50.85, 4.35, 'Brussels'],
  'Europe/Amsterdam': [52.37, 4.9, 'Amsterdam'],
  'Europe/Berlin': [52.52, 13.4, 'Berlin'],
  'Europe/Zurich': [47.38, 8.54, 'Zurich'],
  'Europe/Rome': [41.9, 12.5, 'Rome'],
  'Europe/Vienna': [48.21, 16.37, 'Vienna'],
  'Europe/Prague': [50.08, 14.44, 'Prague'],
  'Europe/Warsaw': [52.23, 21.01, 'Warsaw'],
  'Europe/Stockholm': [59.33, 18.07, 'Stockholm'],
  'Europe/Oslo': [59.91, 10.75, 'Oslo'],
  'Europe/Copenhagen': [55.68, 12.57, 'Copenhagen'],
  'Europe/Helsinki': [60.17, 24.94, 'Helsinki'],
  'Europe/Athens': [37.98, 23.73, 'Athens'],
  'Europe/Kyiv': [50.45, 30.52, 'Kyiv'],
  'Europe/Kiev': [50.45, 30.52, 'Kyiv'],
  'Europe/Moscow': [55.76, 37.62, 'Moscow'],
  'Africa/Cairo': [30.04, 31.24, 'Cairo'],
  'Africa/Lagos': [6.52, 3.38, 'Lagos'],
  'Africa/Nairobi': [-1.29, 36.82, 'Nairobi'],
  'Africa/Johannesburg': [-26.2, 28.05, 'Johannesburg'],
  'Africa/Casablanca': [33.57, -7.59, 'Casablanca'],
  'America/New_York': [40.71, -74.01, 'New York'],
  'America/Toronto': [43.65, -79.38, 'Toronto'],
  'America/Halifax': [44.65, -63.58, 'Halifax'],
  'America/Chicago': [41.88, -87.63, 'Chicago'],
  'America/Denver': [39.74, -104.99, 'Denver'],
  'America/Phoenix': [33.45, -112.07, 'Phoenix'],
  'America/Los_Angeles': [34.05, -118.24, 'Los Angeles'],
  'America/Vancouver': [49.28, -123.12, 'Vancouver'],
  'America/Anchorage': [61.22, -149.9, 'Anchorage'],
  'Pacific/Honolulu': [21.31, -157.86, 'Honolulu'],
  'America/Mexico_City': [19.43, -99.13, 'Mexico City'],
  'America/Bogota': [4.71, -74.07, 'Bogotá'],
  'America/Lima': [-12.05, -77.04, 'Lima'],
  'America/Santiago': [-33.45, -70.67, 'Santiago'],
  'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo'],
  'America/Argentina/Buenos_Aires': [-34.6, -58.38, 'Buenos Aires'],
  'Australia/Sydney': [-33.87, 151.21, 'Sydney'],
  'Australia/Melbourne': [-37.81, 144.96, 'Melbourne'],
  'Australia/Brisbane': [-27.47, 153.03, 'Brisbane'],
  'Australia/Adelaide': [-34.93, 138.6, 'Adelaide'],
  'Australia/Perth': [-31.95, 115.86, 'Perth'],
  'Pacific/Auckland': [-36.85, 174.76, 'Auckland'],
};

const FAHRENHEIT_ZONES = new Set([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]);

const KIND_LABEL_KEY: Record<WeatherKind, keyof Dict> = {
  clear: 'wxClear',
  'mostly-clear': 'wxMostlyClear',
  partly: 'wxPartly',
  overcast: 'wxOvercast',
  fog: 'wxFog',
  drizzle: 'wxDrizzle',
  rain: 'wxRain',
  snow: 'wxSnow',
  thunder: 'wxThunder',
};

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

// ==========================================
// Animated line icons (currentColor strokes + one warm/cool accent)
// ==========================================

const SUN = '#fbbf24';
const MOON = '#c4b5fd';
const DROP = '#38bdf8';

const Cloud: React.FC<{ x?: number; y?: number; drift?: boolean }> = ({ x = 0, y = 0, drift = true }) => (
  <g className={drift ? 'wx-drift' : undefined} transform={`translate(${x} ${y})`}>
    <path
      d="M7 17.5h10.2a3.6 3.6 0 0 0 .4-7.2A5.2 5.2 0 0 0 7.6 9.2 4.1 4.1 0 0 0 7 17.5Z"
      style={{ fill: 'var(--tb-bg-card)' }}
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
  </g>
);

const Sun: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <g>
    <g className="wx-spin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * (r + 2)}
            y1={cy + Math.sin(a) * (r + 2)}
            x2={cx + Math.cos(a) * (r + 4.2)}
            y2={cy + Math.sin(a) * (r + 4.2)}
            stroke={SUN}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        );
      })}
    </g>
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={SUN} strokeWidth={1.5} />
  </g>
);

const Moon: React.FC<{ cx: number; cy: number; r: number; stars?: boolean }> = ({ cx, cy, r, stars }) => (
  <g>
    <path
      d={`M${cx + r * 0.35} ${cy - r}A${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.35}A${r * 0.78} ${r * 0.78} 0 0 1 ${cx + r * 0.35} ${cy - r}Z`}
      fill="none"
      stroke={MOON}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    {stars && (
      <>
        <circle className="wx-twinkle" cx={cx + r + 3.5} cy={cy - r + 0.5} r={0.9} fill={MOON} />
        <circle className="wx-twinkle wx-delay" cx={cx + r + 1} cy={cy + r + 3} r={0.7} fill={MOON} />
      </>
    )}
  </g>
);

export const WeatherIcon: React.FC<{ kind: WeatherKind; isDay: boolean; size?: number }> = ({ kind, isDay, size = 18 }) => {
  const celestial = (cx: number, cy: number, r: number, stars = false) =>
    isDay ? <Sun cx={cx} cy={cy} r={r} /> : <Moon cx={cx} cy={cy} r={r} stars={stars} />;
  const drops = (cls: string, color: string, dash: boolean) =>
    [8, 12, 16].map((x, i) =>
      dash ? (
        <line key={x} className={`${cls} wx-d${i}`} x1={x} y1={19} x2={x - 1} y2={22} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      ) : (
        <circle key={x} className={`${cls} wx-d${i}`} cx={x} cy={20.5} r={1} fill={color} />
      )
    );
  let body: React.ReactNode;
  switch (kind) {
    case 'clear':
      body = celestial(12, 12, 4.4, true);
      break;
    case 'mostly-clear':
      body = (
        <>
          {celestial(10, 10, 4, true)}
          <g transform="translate(5 4) scale(0.62)">
            <Cloud />
          </g>
        </>
      );
      break;
    case 'partly':
      body = (
        <>
          {celestial(9, 8.5, 3.6)}
          <Cloud x={1} y={1} />
        </>
      );
      break;
    case 'overcast':
      body = (
        <>
          <g opacity={0.5} transform="translate(3 -3) scale(0.8)">
            <Cloud drift={false} />
          </g>
          <Cloud y={1} />
        </>
      );
      break;
    case 'fog':
      body = (
        <>
          <Cloud y={-3} drift={false} />
          {[17, 20].map((y, i) => (
            <line key={y} className={`wx-fog wx-d${i}`} x1={4} y1={y} x2={20} y2={y} stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" opacity={0.75} />
          ))}
        </>
      );
      break;
    case 'drizzle':
    case 'rain':
      body = (
        <>
          <Cloud y={-3} />
          {drops(kind === 'rain' ? 'wx-rain' : 'wx-drizzle', DROP, kind === 'rain')}
        </>
      );
      break;
    case 'snow':
      body = (
        <>
          <Cloud y={-3} />
          {drops('wx-snow', 'currentColor', false)}
        </>
      );
      break;
    case 'thunder':
      body = (
        <>
          <Cloud y={-3} />
          <path className="wx-bolt" d="M12.5 15l-2.5 4h2.6l-1.6 4 4.4-5.6h-2.7l1.8-2.4Z" fill={SUN} />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ overflow: 'visible', flexShrink: 0 }} aria-hidden>
      {body}
    </svg>
  );
};

// ==========================================
// Hook: location resolution, fetching, caching, prefs
// ==========================================

/** The account-synced subset of the weather prefs, in API field names. */
export interface SyncedWeatherPrefs {
  weather_theme?: string;
  weather_unit?: string;
  weather_hidden?: boolean | null;
}

const writePrefs = (next: WeatherPrefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); prefs then last for this tab only.
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export function useWeather(timeZone: string, onSyncChange?: (patch: SyncedWeatherPrefs) => void) {
  const [prefs, setPrefs] = useState<WeatherPrefs>(() => readJson<WeatherPrefs>(PREFS_KEY) ?? {});
  const prefsRef = useRef(prefs);
  const onSyncRef = useRef(onSyncChange);
  useEffect(() => {
    prefsRef.current = prefs;
    onSyncRef.current = onSyncChange;
  });
  const [reading, setReading] = useState<WeatherReading | null>(() => readJson<WeatherReading>(CACHE_KEY));
  const [error, setError] = useState<'denied' | 'unavailable' | null>(null);

  const zoneCity = ZONE_CITIES[timeZone];
  const coords = prefs.precise
    ? { lat: prefs.precise.lat, lon: prefs.precise.lon, label: null as string | null, precise: true }
    : zoneCity
    ? { lat: zoneCity[0], lon: zoneCity[1], label: zoneCity[2], precise: false }
    : null;
  const key = coords ? `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}` : '';
  const unit: Unit = prefs.unit ?? (FAHRENHEIT_ZONES.has(timeZone) ? 'f' : 'c');

  const updatePrefs = useCallback((patch: Partial<WeatherPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(next);
      return next;
    });
    const sync: SyncedWeatherPrefs = {};
    if ('theme' in patch) sync.weather_theme = patch.theme ?? '';
    if ('unit' in patch) sync.weather_unit = patch.unit ?? '';
    if ('hidden' in patch) sync.weather_hidden = Boolean(patch.hidden);
    if (Object.keys(sync).length > 0) onSyncRef.current?.(sync);
  }, []);

  // Applies the account's values. Returns this device's values instead when
  // the account has never stored any (first sync), so the caller can push
  // them up rather than resetting the user's current look.
  const applyServerPrefs = useCallback((server: SyncedWeatherPrefs): SyncedWeatherPrefs | null => {
    if (server.weather_theme === undefined) return null; // backend without weather sync
    if (!server.weather_theme && server.weather_hidden == null) {
      const local = prefsRef.current;
      return {
        weather_theme: local.theme ?? DEFAULT_WEATHER_THEME,
        weather_unit: local.unit ?? '',
        weather_hidden: Boolean(local.hidden),
      };
    }
    setPrefs((prev) => {
      const next: WeatherPrefs = {
        ...prev,
        theme: isWeatherThemeId(server.weather_theme) ? server.weather_theme : prev.theme,
        unit: server.weather_unit === 'c' || server.weather_unit === 'f' ? server.weather_unit : undefined,
        hidden: Boolean(server.weather_hidden),
      };
      writePrefs(next);
      return next;
    });
    return null;
  }, []);

  useEffect(() => {
    if (!coords || prefs.hidden) return;
    let cancelled = false;
    const load = async () => {
      const cached = readJson<WeatherReading>(CACHE_KEY);
      if (cached && cached.key === key && Date.now() - cached.at < REFRESH_MS) {
        setReading(cached);
        return;
      }
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat.toFixed(2)}&longitude=${coords.lon.toFixed(2)}` +
          '&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=auto';
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const cur = data.current;
        const next: WeatherReading = {
          key,
          at: Date.now(),
          tempC: Number(cur.temperature_2m),
          code: Number(cur.weather_code),
          isDay: Number(cur.is_day) === 1,
          windKmh: Number(cur.wind_speed_10m),
        };
        if (cancelled) return;
        setReading(next);
        setError(null);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // Cache is best-effort.
        }
      } catch {
        if (!cancelled) setError('unavailable');
      }
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // coords is derived from key; re-run only when the location key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, prefs.hidden]);

  const requestPrecise = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // ~1 km is plenty for weather and keeps the shared location coarse.
        updatePrefs({ precise: { lat: +pos.coords.latitude.toFixed(2), lon: +pos.coords.longitude.toFixed(2) } });
        setError(null);
      },
      () => setError('denied'),
      { maximumAge: 60 * 60 * 1000, timeout: 10000 }
    );
  }, [updatePrefs]);

  const current = reading && reading.key === key ? reading : null;
  const theme: WeatherThemeId = isWeatherThemeId(prefs.theme) ? prefs.theme : DEFAULT_WEATHER_THEME;
  return { prefs, updatePrefs, applyServerPrefs, coords, reading: current, error, unit, requestPrecise, theme };
}

export type WeatherState = ReturnType<typeof useWeather>;

const formatTemp = (tempC: number, unit: Unit) =>
  unit === 'f' ? `${Math.round((tempC * 9) / 5 + 32)}°F` : `${Math.round(tempC)}°C`;

// METAR writes temperatures as whole °C with M for minus (e.g. M03).
const metarTemp = (tempC: number) => {
  const r = Math.round(tempC);
  return r < 0 ? `M${String(-r).padStart(2, '0')}` : String(r).padStart(2, '0');
};

// ==========================================
// WeatherFace: one reading drawn in a weather theme, at three sizes
// ('badge' = chronometer header, 'large' = panel, 'tile' = theme picker).
// ==========================================

type FaceSize = 'badge' | 'large' | 'tile';

interface FaceProps {
  theme: WeatherThemeId;
  kind: WeatherKind;
  isDay: boolean;
  tempC: number;
  windKmh: number;
  unit: Unit;
  size: FaceSize;
}

const PixelSprite: React.FC<{ kind: WeatherKind; isDay: boolean; px: number }> = ({ kind, isDay, px }) => {
  const rows = pixelSprite(kind, isDay);
  return (
    <svg viewBox="0 0 11 11" width={px} height={px} shapeRendering="crispEdges" style={{ flexShrink: 0 }} aria-hidden>
      {rows.flatMap((row, y) =>
        row.split('').map((ch, x) =>
          ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PIXEL_COLORS[ch]} />
        )
      )}
    </svg>
  );
};

// Glyph-subset web fonts for faces that need one (loaded once, on demand).
const ASCII_TEXT = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '°▋';
const gf = (family: string, text: string) =>
  `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}&display=swap`;
const WEATHER_FONTS: Partial<Record<WeatherThemeId, string>> = {
  pixel: gf('Press+Start+2P', '0123456789°CF-'),
  kanji: gf('Noto+Serif+JP:wght@700', '晴曇霧雨雪雷月'),
  neon: gf('Tilt+Neon', ASCII_TEXT),
  terminal: gf('VT323', ASCII_TEXT),
  lcd: gf('Share+Tech+Mono', ASCII_TEXT),
  nixie: gf('Nixie+One', '0123456789-CF'),
};

// ==========================================
// SVG pieces for WX-12..33
// ==========================================

// JMA weather-map symbols: 快晴 ○, 晴 ⦶, 曇 ◎, 雨 ●; fog / snow / thunder
// marks inside the ring are stylized.
const JmaSymbol: React.FC<{ kind: WeatherKind; px: number }> = ({ kind, px }) => {
  const ink = 'currentColor';
  const filled = kind === 'rain' || kind === 'drizzle';
  let inner: React.ReactNode = null;
  if (kind === 'mostly-clear' || kind === 'partly') inner = <line x1={12} y1={3} x2={12} y2={21} stroke={ink} strokeWidth={1.6} />;
  if (kind === 'overcast') inner = <circle cx={12} cy={12} r={4.5} fill="none" stroke={ink} strokeWidth={1.6} />;
  if (kind === 'drizzle') inner = <circle cx={12} cy={12} r={2.2} fill="var(--tb-bg-card)" />;
  if (kind === 'fog') inner = [9, 12, 15].map((y) => <line key={y} x1={7} y1={y} x2={17} y2={y} stroke={ink} strokeWidth={1.3} />);
  if (kind === 'snow')
    inner = [0, 60, 120].map((a) => (
      <line key={a} x1={12} y1={7} x2={12} y2={17} stroke={ink} strokeWidth={1.3} transform={`rotate(${a} 12 12)`} />
    ));
  if (kind === 'thunder') inner = <path d="M13.5 6l-4 6.5h3l-1.5 5.5 4.5-7h-3l1.8-5Z" fill={ink} />;
  return (
    <svg viewBox="0 0 24 24" width={px} height={px} style={{ flexShrink: 0 }} aria-hidden>
      <circle cx={12} cy={12} r={9} fill={filled ? ink : 'none'} stroke={ink} strokeWidth={1.6} />
      {inner}
    </svg>
  );
};

const Windsock: React.FC<{ windKmh: number; px: number }> = ({ windKmh, px }) => {
  // Limp at calm, fully horizontal from ~30 km/h.
  const fill = Math.max(0, Math.min(1, windKmh / 30));
  const droop = (1 - fill) * 65;
  const segs = 5;
  const len = 18;
  return (
    <svg viewBox="0 0 26 24" width={(px * 26) / 24} height={px} style={{ overflow: 'visible', flexShrink: 0 }} aria-hidden>
      <line x1={3} y1={3} x2={3} y2={23} stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <g transform={`rotate(${droop} 3 5)`}>
        <g className="wx-sway" style={{ transformOrigin: '3px 5px' }}>
          {Array.from({ length: segs }, (_, i) => {
            const x0 = 3 + (i * len) / segs;
            const x1 = 3 + ((i + 1) * len) / segs;
            const h0 = 3.2 - i * 0.35;
            const h1 = 3.2 - (i + 1) * 0.35;
            return (
              <polygon
                key={i}
                points={`${x0},${5 - h0} ${x1},${5 - h1} ${x1},${5 + h1} ${x0},${5 + h0}`}
                fill={i % 2 === 0 ? '#f97316' : '#fafafa'}
                stroke="#f97316"
                strokeWidth={0.4}
              />
            );
          })}
        </g>
      </g>
    </svg>
  );
};

const Barometer: React.FC<{ kind: WeatherKind; px: number }> = ({ kind, px }) => (
  <svg viewBox="0 0 32 32" width={px} height={px} style={{ flexShrink: 0 }} aria-hidden>
    <circle cx={16} cy={16} r={15} fill="#fef3c7" stroke="#b45309" strokeWidth={2} />
    {Array.from({ length: 11 }, (_, i) => {
      const a = ((-120 + i * 24) * Math.PI) / 180;
      return (
        <line key={i} x1={16 + Math.sin(a) * 11.5} y1={16 - Math.cos(a) * 11.5} x2={16 + Math.sin(a) * 13.5} y2={16 - Math.cos(a) * 13.5} stroke="#78350f" strokeWidth={0.6} />
      );
    })}
    <g transform={`rotate(${BAROMETER_ANGLE[kind]} 16 16)`}>
      <line x1={16} y1={19} x2={16} y2={4.5} stroke="#18181b" strokeWidth={1} strokeLinecap="round" />
    </g>
    <circle cx={16} cy={16} r={1.4} fill="#b45309" />
  </svg>
);

// Station model: sky-cover circle (oktas), present-weather mark, wind barb.
const StationPlot: React.FC<{ kind: WeatherKind; windKmh: number; px: number }> = ({ kind, windKmh, px }) => {
  const cx = 14;
  const cy = 14;
  const r = 4.5;
  const oktas = OKTAS[kind];
  const frac = oktas === 9 ? 0 : oktas / 8;
  let cover: React.ReactNode = null;
  if (oktas === 9) {
    cover = (
      <g stroke="currentColor" strokeWidth={1}>
        <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} />
        <line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} />
      </g>
    );
  } else if (frac >= 1) {
    cover = <circle cx={cx} cy={cy} r={r} fill="currentColor" />;
  } else if (frac > 0) {
    const a = frac * 2 * Math.PI;
    cover = <path d={`M${cx} ${cy}L${cx} ${cy - r}A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)}Z`} fill="currentColor" />;
  }
  const kt = Math.round(windKmh / 1.852);
  const ux = Math.SQRT1_2;
  const uy = -Math.SQRT1_2;
  const end = { x: cx + ux * (r + 10), y: cy + uy * (r + 10) };
  const barbs: React.ReactNode[] = [];
  let rest = kt;
  let at = 0;
  const along = (d: number) => ({ x: end.x - ux * d, y: end.y - uy * d });
  while (rest >= 50) {
    const a = along(at);
    const b = along(at + 2);
    barbs.push(<polygon key={`p${at}`} points={`${a.x},${a.y} ${a.x + 3},${a.y + 3} ${b.x},${b.y}`} fill="currentColor" />);
    rest -= 50;
    at += 2.6;
  }
  while (rest >= 10) {
    const a = along(at);
    barbs.push(<line key={`f${at}`} x1={a.x} y1={a.y} x2={a.x + 3} y2={a.y + 3} stroke="currentColor" strokeWidth={0.9} />);
    rest -= 10;
    at += 1.6;
  }
  if (rest >= 5) {
    const a = along(at === 0 ? 1.6 : at);
    barbs.push(<line key="h" x1={a.x} y1={a.y} x2={a.x + 1.6} y2={a.y + 1.6} stroke="currentColor" strokeWidth={0.9} />);
  }
  return (
    <svg viewBox="0 0 30 24" width={(px * 30) / 24} height={px} style={{ overflow: 'visible', flexShrink: 0 }} aria-hidden>
      {kt < 3 ? (
        <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="currentColor" strokeWidth={0.7} />
      ) : (
        <>
          <line x1={cx + ux * r} y1={cy + uy * r} x2={end.x} y2={end.y} stroke="currentColor" strokeWidth={0.9} />
          {barbs}
        </>
      )}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={1} />
      {cover}
      {PRESENT_WX[kind] && (
        <text x={4.5} y={cy + 2.2} fontSize={6.5} textAnchor="middle" fill="currentColor" fontWeight={700}>
          {PRESENT_WX[kind]}
        </text>
      )}
    </svg>
  );
};

const Radar: React.FC<{ kind: WeatherKind; px: number }> = ({ kind, px }) => {
  const [count, color] = RADAR_ECHO[kind];
  // Fixed pseudo-random echo positions so the scope doesn't jump per render.
  const echoes = Array.from({ length: count }, (_, i) => {
    const a = (i * 137.5 * Math.PI) / 180;
    const d = 3 + ((i * 53) % 6);
    return { x: 12 + Math.cos(a) * d, y: 12 + Math.sin(a) * d, r: 0.9 + ((i * 7) % 4) * 0.25 };
  });
  return (
    <svg viewBox="0 0 24 24" width={px} height={px} style={{ flexShrink: 0 }} aria-hidden>
      <circle cx={12} cy={12} r={11} fill="#052e16" stroke="#16a34a" strokeWidth={0.8} />
      {[3.7, 7.4].map((rr) => (
        <circle key={rr} cx={12} cy={12} r={rr} fill="none" stroke="#16a34a" strokeWidth={0.35} opacity={0.7} />
      ))}
      <line x1={1} y1={12} x2={23} y2={12} stroke="#16a34a" strokeWidth={0.3} opacity={0.6} />
      <line x1={12} y1={1} x2={12} y2={23} stroke="#16a34a" strokeWidth={0.3} opacity={0.6} />
      {echoes.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={e.r} fill={color} opacity={0.85} />
      ))}
      <g className="wx-sweep" style={{ transformOrigin: '12px 12px' }}>
        <path d="M12 12L12 1A11 11 0 0 1 21.5 6.5Z" fill="#4ade80" opacity={0.28} />
        <line x1={12} y1={12} x2={12} y2={1} stroke="#4ade80" strokeWidth={0.6} />
      </g>
    </svg>
  );
};
const loadedWeatherFonts = new Set<string>();

const WeatherFace: React.FC<FaceProps> = ({ theme, kind, isDay, tempC, windKmh, unit, size }) => {
  const { t } = useI18n();
  useEffect(() => {
    const href = WEATHER_FONTS[theme];
    if (!href || loadedWeatherFonts.has(href)) return;
    loadedWeatherFonts.add(href);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [theme]);
  const temp = formatTemp(tempC, unit);
  const big = size === 'large';
  const iconPx = big ? 44 : size === 'tile' ? 22 : 16;
  const word = SHORT_WORD[kind];
  const label = t[KIND_LABEL_KEY[kind]];
  const tempCls = big ? 'text-2xl font-light' : 'font-semibold';
  const sub = big ? <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{label} · {tf(t.wxWind, { v: Math.round(windKmh) })}</div> : null;
  const tile = size === 'tile';
  const unitChar = unit === 'f' ? 'F' : 'C';
  const whole = Math.round(unit === 'f' ? (tempC * 9) / 5 + 32 : tempC);
  // Self-backed faces (neon, LCD, ...) carry their own plate so they read
  // the same on light and dark surfaces.
  const plate = big ? 'px-3 py-2 rounded' : tile ? 'px-1.5 py-0.5 rounded-sm' : 'px-1 rounded-sm';
  const withTemp = (icon: React.ReactNode) => (
    <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
      {icon}
      <span>
        <span className={`tabular-nums ${tempCls}`}>{temp}</span>
        {sub}
      </span>
    </span>
  );

  switch (theme) {
    case 'minimal':
      return (
        <span className={`inline-flex items-baseline gap-1.5 ${big ? 'flex-col items-start gap-0' : ''}`}>
          <span className={`tabular-nums ${big ? 'text-4xl font-extralight' : 'font-light'}`}>{temp.replace(/[CF]$/, '')}</span>
          <span className={`tracking-widest ${big ? 'text-[11px] mt-1' : 'text-[9px]'} opacity-75`}>{big ? label : word}</span>
        </span>
      );
    case 'pixel':
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <PixelSprite kind={kind} isDay={isDay} px={iconPx} />
          <span>
            <span className={`tabular-nums ${tempCls}`} style={{ fontFamily: "'Press Start 2P', ui-monospace, monospace", fontSize: big ? 18 : 8 }}>
              {temp}
            </span>
            {sub}
          </span>
        </span>
      );
    case 'ascii': {
      const [art, line] = ASCII[kind][isDay ? 'day' : 'night'];
      return big ? (
        <span className="inline-flex items-center gap-4">
          <pre className="text-[11px] leading-[1.15] m-0 text-emerald-400">{art.join('\n')}</pre>
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {sub}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 whitespace-pre">
          <span className="text-emerald-400">{line}</span>
          <span className="tabular-nums font-semibold">{temp}</span>
        </span>
      );
    }
    case 'emoji':
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <span style={{ fontSize: big ? 40 : size === 'tile' ? 18 : 13, lineHeight: 1 }}>{EMOJI[kind][isDay ? 0 : 1]}</span>
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {sub}
          </span>
        </span>
      );
    case 'cyber': {
      const sign = tempC >= 0 ? '+' : '−';
      const value = unit === 'f' ? (tempC * 9) / 5 + 32 : tempC;
      return (
        <span
          className={`inline-flex flex-col ${big ? 'gap-1' : ''}`}
          style={{ color: '#22d3ee', textShadow: '0 0 6px rgba(34,211,238,0.65)' }}
        >
          <span className={`tabular-nums tracking-wider ${big ? 'text-xl' : 'font-semibold'}`}>
            {big ? '[ ' : ''}WX::{CYBER_CODE[kind]} {sign}
            {Math.abs(value).toFixed(1)}°{unit === 'f' ? 'F' : 'C'}
            {big ? ' ]' : ''}
          </span>
          {big && <span className="text-[10px] opacity-70 tracking-widest">WIND {Math.round(windKmh)}KM/H // {isDay ? 'DAY' : 'NIGHT'} CYCLE</span>}
        </span>
      );
    }
    case 'metar': {
      const kt = String(Math.round(windKmh / 1.852)).padStart(2, '0');
      return (
        <span className={`inline-flex flex-col tabular-nums ${big ? 'gap-1' : ''}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          <span className={big ? 'text-xl tracking-wider' : 'font-semibold'}>
            {METAR_CODE[kind]} {metarTemp(tempC)} {kt}KT
          </span>
          {big && <span className="text-[10px] opacity-70 tracking-widest">{label.toUpperCase()} · {temp}</span>}
        </span>
      );
    }
    case 'kanji':
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <span
            className="inline-flex items-center justify-center font-bold"
            style={{
              width: big ? 44 : size === 'tile' ? 22 : 16,
              height: big ? 44 : size === 'tile' ? 22 : 16,
              fontSize: big ? 26 : size === 'tile' ? 13 : 10,
              color: '#ef4444',
              border: `${big ? 2 : 1.2}px solid #ef4444`,
              borderRadius: big ? 6 : 3,
              fontFamily: "'Noto Serif JP', serif",
            }}
          >
            {isDay || kind !== 'clear' ? KANJI[kind] : '月'}
          </span>
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp.replace('°C', '℃')}</span>
            {sub}
          </span>
        </span>
      );
    case 'glyph':
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <span style={{ fontSize: big ? 40 : size === 'tile' ? 18 : 14, lineHeight: 1 }}>{GLYPH[kind][isDay ? 0 : 1]}</span>
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {sub}
          </span>
        </span>
      );
    case 'thermo': {
      const { fill, color } = thermoReading(tempC);
      const h = big ? 44 : size === 'tile' ? 22 : 16;
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <svg viewBox="0 0 10 24" width={h * 0.42} height={h} style={{ flexShrink: 0 }} aria-hidden>
            <rect x={3} y={1} width={4} height={17} rx={2} fill="none" stroke="currentColor" strokeWidth={0.9} opacity={0.6} />
            <rect x={4} y={2 + 15 * (1 - fill)} width={2} height={15 * fill + 2} fill={color} />
            <circle cx={5} cy={20} r={3.2} fill={color} />
          </svg>
          <span>
            <span className={`tabular-nums ${tempCls}`} style={{ color }}>
              {temp}
            </span>
            {sub}
          </span>
        </span>
      );
    }
    case 'led': {
      const color = LED_COLOR[kind];
      const dot = big ? 14 : 7;
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1.5'}`}>
          <span
            className="wx-led rounded-full shrink-0"
            style={{ width: dot, height: dot, backgroundColor: color, boxShadow: `0 0 ${big ? 10 : 5}px ${color}` }}
          />
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {big ? sub : <span className="ml-1 text-[9px] tracking-widest opacity-70">{word}</span>}
          </span>
        </span>
      );
    }
    case 'neon': {
      const color = LED_COLOR[kind];
      return (
        <span
          className={`wx-flicker inline-flex ${big ? 'flex-col gap-1' : 'items-baseline gap-1.5'} ${plate}`}
          style={{ background: '#0b0b12', color: '#fff', fontFamily: "'Tilt Neon', ui-sans-serif, sans-serif", textShadow: `0 0 2px #fff, 0 0 ${big ? 8 : 4}px ${color}, 0 0 ${big ? 18 : 8}px ${color}` }}
        >
          <span className={`tabular-nums ${big ? 'text-3xl' : ''}`}>{temp}</span>
          <span className={big ? 'text-[11px] tracking-[0.3em]' : 'text-[9px] tracking-widest'} style={{ color, textShadow: `0 0 4px ${color}` }}>
            {big ? label.toUpperCase() : word}
          </span>
        </span>
      );
    }
    case 'sticker':
      return withTemp(
        <span
          className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{
            width: iconPx + (big ? 14 : 2),
            height: iconPx + (big ? 14 : 2),
            background: STICKER_BG[kind],
            border: `${big ? 3 : 1.5}px solid #fff`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
            transform: 'rotate(-8deg)',
            fontSize: big ? 30 : tile ? 13 : 10,
            lineHeight: 1,
          }}
        >
          {EMOJI[kind][isDay ? 0 : 1]}
        </span>
      );
    case 'terminal':
      return (
        <span
          className={`inline-flex flex-col ${plate}`}
          style={{ background: '#0c0c0c', color: '#4ade80', fontFamily: "'VT323', ui-monospace, monospace", fontSize: big ? 20 : tile ? 14 : 13, lineHeight: 1.1 }}
        >
          {big && <span style={{ color: '#a1a1aa' }}>$ wx --now</span>}
          <span className="whitespace-pre">
            {big ? '> ' : '$ '}
            {CYBER_CODE[kind]} {temp}
            <span className="wx-blink">▋</span>
          </span>
          {big && <span style={{ color: '#a1a1aa', fontSize: 15 }}>{`wind=${Math.round(windKmh)}km/h cycle=${isDay ? 'day' : 'night'}`}</span>}
        </span>
      );
    case 'lcd': {
      const digits = String(whole);
      return (
        <span
          className={`inline-flex items-center gap-1.5 ${plate}`}
          style={{ background: '#9fae88', color: '#1c2617', fontFamily: "'Share Tech Mono', ui-monospace, monospace", boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)' }}
        >
          <span className="relative tabular-nums" style={{ fontSize: big ? 34 : tile ? 15 : 12, lineHeight: 1 }}>
            <span className="absolute inset-0" style={{ opacity: 0.13 }}>
              {digits.replace(/./g, '8')}
            </span>
            <span className="relative">{digits}</span>
          </span>
          <span className="flex flex-col leading-none" style={{ fontSize: big ? 11 : 7 }}>
            <span>°{unitChar}</span>
            <span>{CYBER_CODE[kind]}</span>
          </span>
        </span>
      );
    }
    case 'calendar': {
      const w = big ? 64 : tile ? 26 : 20;
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <span
            className="inline-flex flex-col overflow-hidden shrink-0"
            style={{ width: w, borderRadius: big ? 4 : 2, background: '#fafafa', color: '#18181b', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            <span className="text-center font-bold text-white truncate" style={{ background: '#dc2626', fontSize: big ? 10 : 5, lineHeight: big ? '16px' : '4px', minHeight: big ? 16 : 4 }}>
              {big || tile ? word : ''}
            </span>
            <span className="text-center font-bold tabular-nums" style={{ fontSize: big ? 24 : tile ? 11 : 9, lineHeight: big ? '34px' : tile ? '14px' : '11px' }}>
              {whole}°
            </span>
          </span>
          {big && sub}
        </span>
      );
    }
    case 'flap': {
      const chars = (big ? `${word} ${temp}` : temp).split('');
      const h = big ? 30 : tile ? 18 : 14;
      const w = big ? 20 : tile ? 11 : 9;
      return (
        <span className="inline-flex flex-col">
          <span className="inline-flex gap-px">
            {chars.map((ch, i) => (
              <span
                key={i}
                className="relative inline-flex items-center justify-center font-bold"
                style={{ width: ch === ' ' ? w / 2 : w, height: h, background: ch === ' ' ? 'transparent' : '#18181b', color: '#fafafa', borderRadius: 2, fontSize: h * 0.62, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                {ch}
                {ch !== ' ' && <span className="absolute left-0 right-0 top-1/2 h-px" style={{ background: 'rgba(0,0,0,0.75)' }} />}
              </span>
            ))}
          </span>
          {sub}
        </span>
      );
    }
    case 'dotmatrix': {
      const str = `${whole}°${unitChar}`;
      const pitch = big ? 4 : tile ? 2.4 : 2;
      const cols = str.length * 4 - 1;
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <span className={`inline-flex ${plate}`} style={{ background: '#0a0a0a' }}>
            <svg width={cols * pitch} height={5 * pitch} viewBox={`0 0 ${cols} 5`} aria-hidden>
              {str.split('').flatMap((ch, ci) =>
                (DOT_FONT[ch] ?? DOT_FONT['-']).flatMap((row, y) =>
                  row.split('').map((c, x) => (
                    <circle key={`${ci}-${x}-${y}`} cx={ci * 4 + x + 0.5} cy={y + 0.5} r={0.38} fill={c === '#' ? '#fbbf24' : 'rgba(251,191,36,0.12)'} />
                  ))
                )
              )}
            </svg>
          </span>
          {big && sub}
        </span>
      );
    }
    case 'scale': {
      const pct = Math.max(0, Math.min(1, (tempC + 10) / 50));
      const w = big ? 160 : tile ? 40 : 30;
      const barH = big ? 8 : 4;
      const ticks = unit === 'f' ? ['14°', '59°', '104°'] : ['-10°', '15°', '40°'];
      return (
        <span className={`inline-flex ${big ? 'flex-col items-start gap-1' : 'items-center gap-1.5'}`}>
          <span className="relative shrink-0" style={{ width: w, height: barH + (big ? 6 : 3) }}>
            <span className="absolute left-0 right-0 bottom-0 rounded-full" style={{ height: barH, background: 'linear-gradient(90deg,#93c5fd,#38bdf8,#34d399,#fbbf24,#ef4444)' }} />
            <span className="absolute bottom-0" style={{ left: `calc(${pct * 100}% - ${big ? 1.5 : 1}px)`, width: big ? 3 : 2, height: barH + (big ? 6 : 3), background: 'currentColor', borderRadius: 1 }} />
          </span>
          {big && (
            <span className="flex justify-between text-[9px] opacity-60 tabular-nums" style={{ width: w }}>
              {ticks.map((tk) => (
                <span key={tk}>{tk}</span>
              ))}
            </span>
          )}
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {sub}
          </span>
        </span>
      );
    }
    case 'beaufort': {
      const f = beaufortForce(windKmh);
      const color = `hsl(${140 - f * 11} 75% 50%)`;
      return (
        <span className={`inline-flex ${big ? 'flex-col gap-1.5' : 'items-center gap-1'}`}>
          <span className={`font-semibold tabular-nums ${big ? 'text-2xl' : ''}`} style={{ color }}>
            B{f}
          </span>
          {!(size === 'badge') && (
            <span className="inline-flex items-end gap-px">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} style={{ width: big ? 4 : 1.5, height: (big ? 4 : 2) + i * (big ? 1.6 : 0.6), background: i < f ? color : 'currentColor', opacity: i < f ? 1 : 0.18 }} />
              ))}
            </span>
          )}
          {big ? (
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              {BEAUFORT_NAME[f]} · {Math.round(windKmh)} KM/H · {temp}
            </span>
          ) : (
            <span className="tabular-nums font-semibold">{temp}</span>
          )}
        </span>
      );
    }
    case 'jma':
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <JmaSymbol kind={kind} px={iconPx} />
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {big && <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</div>}
          </span>
        </span>
      );
    case 'haiku': {
      const line = HAIKU[kind][isDay ? 0 : 1];
      const verse: React.CSSProperties = { fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic' };
      return big ? (
        <span className="inline-flex flex-col gap-1.5">
          <span style={{ ...verse, fontSize: 18 }}>{line}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">
            — {label} · {temp}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-baseline gap-1.5 min-w-0">
          <span className={`truncate opacity-80 ${tile ? 'max-w-32' : 'hidden sm:inline max-w-24'}`} style={verse}>
            {line}
          </span>
          <span className="tabular-nums font-semibold">{temp}</span>
        </span>
      );
    }
    case 'windsock':
      return withTemp(<Windsock windKmh={windKmh} px={iconPx} />);
    case 'barometer':
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <Barometer kind={kind} px={big ? 56 : iconPx} />
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {big && (
              <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">
                ▸ {barometerWord(kind)} · {label}
              </div>
            )}
          </span>
        </span>
      );
    case 'morse': {
      const code = toMorse(SHORT_WORD[kind]).replace(/\./g, '·').replace(/-/g, '−');
      return big ? (
        <span className="inline-flex flex-col gap-1">
          <span className="text-lg tracking-[0.2em] leading-tight">{code}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">
            {SHORT_WORD[kind]} · {temp} · {tf(t.wxWind, { v: Math.round(windKmh) })}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className={`truncate opacity-80 tracking-wider ${tile ? 'max-w-20' : 'max-w-16'}`}>{code}</span>
          <span className="tabular-nums font-semibold">{temp}</span>
        </span>
      );
    }
    case 'broadcast':
      return (
        <span
          className={`inline-flex items-center ${big ? 'gap-3' : 'gap-1'} ${plate}`}
          style={{ background: 'linear-gradient(180deg,#1e3a8a,#1d4ed8 60%,#1e40af)', color: '#fff', fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif", textShadow: '1px 1px 0 #0b1a4a' }}
        >
          <span style={{ fontSize: big ? 32 : tile ? 13 : 11, lineHeight: 1 }}>{EMOJI[kind][isDay ? 0 : 1]}</span>
          <span className="inline-flex flex-col leading-none">
            {big && <span className="text-[9px] tracking-widest mb-1" style={{ color: '#bfdbfe' }}>{label.toUpperCase()}</span>}
            <span className={`tabular-nums ${big ? 'text-3xl' : ''}`} style={{ color: '#fde047' }}>
              {temp}
            </span>
            {big && <span className="text-[9px] tracking-widest mt-1">{tf(t.wxWind, { v: Math.round(windKmh) })}</span>}
          </span>
        </span>
      );
    case 'nixie': {
      const h = big ? 44 : tile ? 20 : 15;
      const w = h * 0.62;
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <span className="inline-flex gap-[2px]">
            {[...String(whole).split(''), unitChar].map((ch, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center"
                style={{
                  width: w,
                  height: h,
                  borderRadius: `${w / 2}px ${w / 2}px 3px 3px`,
                  background: 'radial-gradient(ellipse at 50% 40%, rgba(255,140,40,0.18), rgba(20,10,5,0.95) 70%)',
                  border: '1px solid rgba(255,200,150,0.25)',
                  color: '#ff9a3c',
                  textShadow: '0 0 4px #ff7a00, 0 0 10px #ff5500',
                  fontFamily: "'Nixie One', ui-monospace, monospace",
                  fontSize: h * 0.7,
                  lineHeight: 1,
                }}
              >
                {ch}
              </span>
            ))}
          </span>
          {big && sub}
        </span>
      );
    }
    case 'station':
      return withTemp(<StationPlot kind={kind} windKmh={windKmh} px={iconPx} />);
    case 'radar':
      return withTemp(<Radar kind={kind} px={iconPx} />);
    case 'binary': {
      const bits = Math.min(255, Math.abs(whole)).toString(2).padStart(8, '0');
      const dot = big ? 10 : tile ? 4 : 3.5;
      return (
        <span className={`inline-flex ${big ? 'flex-col gap-1.5' : 'items-center gap-1'}`}>
          <span className="inline-flex items-center" style={{ gap: big ? 4 : 1.5 }}>
            <span className="tabular-nums" style={{ fontSize: big ? 14 : 9 }}>
              {whole < 0 ? '−' : '+'}
            </span>
            {bits.split('').map((b, i) => (
              <span
                key={i}
                className="rounded-full shrink-0"
                style={{ width: dot, height: dot, background: b === '1' ? '#22d3ee' : 'transparent', border: `1px solid ${b === '1' ? '#22d3ee' : 'currentColor'}`, opacity: b === '1' ? 1 : 0.3, boxShadow: b === '1' ? `0 0 ${big ? 6 : 2}px #22d3ee` : undefined }}
              />
            ))}
          </span>
          {big && (
            <span className="text-[10px] uppercase tracking-widest opacity-70 tabular-nums">
              0b{bits} = {whole}°{unitChar} · {label}
            </span>
          )}
        </span>
      );
    }
    case 'braille': {
      const n = `${whole}`;
      return (
        <span className={`inline-flex ${big ? 'flex-col gap-1' : 'items-center gap-1'}`}>
          <span style={{ fontSize: big ? 30 : tile ? 16 : 14, lineHeight: 1 }}>{toBraille(big ? `${SHORT_WORD[kind]} ${n}` : n)}</span>
          {big ? (
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              {label} · {temp}
            </span>
          ) : (
            <span className="tabular-nums font-semibold">{temp}</span>
          )}
        </span>
      );
    }
    case 'barcode': {
      const bars = barcodeBars(`${kind}${Math.round(tempC)}`, big ? 28 : tile ? 16 : 12);
      const h = big ? 34 : tile ? 16 : 12;
      const unitW = big ? 1.5 : 0.75;
      let x = 0;
      const rects: React.ReactNode[] = [];
      bars.forEach((bw, i) => {
        if (i % 2 === 0) rects.push(<rect key={i} x={x} y={0} width={bw * unitW} height={h} fill="#09090b" />);
        x += bw * unitW;
      });
      return withTemp(
        <span className="inline-flex flex-col items-center shrink-0" style={{ background: '#fafafa', padding: big ? '4px 6px 2px' : '1px 2px', borderRadius: 2 }}>
          <svg width={x} height={h} aria-hidden>
            {rects}
          </svg>
          {big && (
            <span style={{ color: '#09090b', fontSize: 9, letterSpacing: '0.2em', fontFamily: 'ui-monospace, monospace' }}>
              {CYBER_CODE[kind]}-{metarTemp(tempC)}
            </span>
          )}
        </span>
      );
    }
    case 'aura': {
      const [a, b] = AURA[kind][isDay ? 0 : 1];
      const d = big ? 48 : tile ? 20 : 14;
      return withTemp(
        <span className="wx-breathe rounded-full shrink-0" style={{ width: d, height: d, background: `radial-gradient(circle at 35% 35%, ${a}, ${b} 75%)`, boxShadow: `0 0 ${big ? 18 : 6}px ${a}` }} />
      );
    }
    default:
      return (
        <span className={`inline-flex items-center ${big ? 'gap-4' : 'gap-1'}`}>
          <WeatherIcon kind={kind} isDay={isDay} size={iconPx} />
          <span>
            <span className={`tabular-nums ${tempCls}`}>{temp}</span>
            {sub}
          </span>
        </span>
      );
  }
};

// ==========================================
// Badge (header) + panel (expands inside the chronometer card)
// ==========================================

// `theme` is the face actually shown: the saved pick, or the default while
// that pick is locked (App resolves this, like the Chronometer Theme).
export const WeatherBadge: React.FC<{ wx: WeatherState; theme: WeatherThemeId; open: boolean; onToggle: () => void; textMuted: string }> = ({
  wx,
  theme,
  open,
  onToggle,
  textMuted,
}) => {
  const { t } = useI18n();
  const { reading, prefs, unit, coords } = wx;
  const kind = reading ? weatherKind(reading.code) : null;
  const where = coords?.label ?? t.wxHere;
  const title = reading && kind ? `${where} · ${t[KIND_LABEL_KEY[kind]]} · ${formatTemp(reading.tempC, unit)}` : t.wxOpen;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={title}
      title={title}
      className={`wx-badge shrink-0 flex items-center px-1 py-0.5 -my-0.5 normal-case tracking-normal cursor-pointer transition-opacity ${
        prefs.hidden ? 'opacity-40 hover:opacity-80' : 'hover:opacity-80'
      } ${open ? 'text-emerald-400' : ''}`}
    >
      {prefs.hidden || !reading || !kind ? (
        <span className={textMuted}>
          <WeatherIcon kind="partly" isDay size={15} />
        </span>
      ) : (
        <WeatherFace theme={theme} kind={kind} isDay={reading.isDay} tempC={reading.tempC} windKmh={reading.windKmh} unit={unit} size="badge" />
      )}
    </button>
  );
};

// Easiest unlock first, matching the Chronometer Theme picker.
const SORTED_WEATHER_THEMES = [...WEATHER_THEMES].sort((a, b) => unlockRuleRank(a.unlock) - unlockRuleRank(b.unlock));

// eslint-disable-next-line react-refresh/only-export-components
export const isWeatherThemeUnlocked = (wt: WeatherTheme, progress: ChronoProgress) => isUnlockRuleMet(wt.unlock, progress);

export const WeatherPanel: React.FC<{
  wx: WeatherState;
  theme: WeatherThemeId;
  progress: ChronoProgress;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
}> = ({ wx, theme, progress, isDark, borderCol, textMuted }) => {
  const { t } = useI18n();
  const { reading, prefs, updatePrefs, coords, unit, error, requestPrecise } = wx;
  const [notice, setNotice] = useState<string | null>(null);
  const unlockedCount = useMemo(() => WEATHER_THEMES.filter((wt) => isWeatherThemeUnlocked(wt, progress)).length, [progress]);
  const kind = reading ? weatherKind(reading.code) : null;
  const chip = `px-2 py-1 border ${borderCol} text-[10px] cursor-pointer hover:text-emerald-400 hover:border-emerald-500/50`;
  // Theme previews use the live reading, or a sample when nothing is loaded.
  const sample = reading && kind ? { kind, isDay: reading.isDay, tempC: reading.tempC, windKmh: reading.windKmh } : { kind: 'partly' as WeatherKind, isDay: true, tempC: 18, windKmh: 6 };

  return (
    <div className={`mt-4 pt-3.5 border-t ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} space-y-3 font-mono`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] uppercase tracking-widest">
        <span className="font-semibold">{tf(t.wxTitle, { place: coords?.label ?? (coords ? t.wxHere : '—') })}</span>
        <span className={textMuted}>{coords?.precise ? t.wxSourcePrecise : coords ? t.wxSourceZone : ''}</span>
      </div>

      {prefs.hidden ? (
        <p className={`text-[11px] ${textMuted}`}>{t.wxHiddenNote}</p>
      ) : reading && kind ? (
        <WeatherFace theme={theme} kind={kind} isDay={reading.isDay} tempC={reading.tempC} windKmh={reading.windKmh} unit={unit} size="large" />
      ) : (
        <p className={`text-[11px] ${textMuted}`}>{coords ? t.wxLoading : t.wxNoZoneCity}</p>
      )}

      {error && <p className="text-[10px] text-amber-400">{error === 'denied' ? t.wxDenied : t.wxUnavailable}</p>}

      <div className="flex flex-wrap gap-1.5">
        {!prefs.hidden && (
          <button type="button" onClick={() => updatePrefs({ unit: unit === 'c' ? 'f' : 'c' })} className={chip}>
            °C / °F
          </button>
        )}
        {!prefs.hidden &&
          (prefs.precise ? (
            <button type="button" onClick={() => updatePrefs({ precise: undefined })} className={chip}>
              {t.wxUseZone}
            </button>
          ) : (
            <button type="button" onClick={requestPrecise} className={`${chip} flex items-center gap-1`}>
              <MapPin className="w-3 h-3" />
              {t.wxUsePrecise}
            </button>
          ))}
        <button type="button" onClick={() => updatePrefs({ hidden: !prefs.hidden })} className={chip}>
          {prefs.hidden ? t.wxShow : t.wxHide}
        </button>
      </div>

      {!prefs.hidden && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="font-semibold">{tf(t.wxThemesTitle, { n: WEATHER_THEMES.length })}</span>
            <span className="text-emerald-400 tabular-nums">{tf(t.chronoUnlocked, { a: unlockedCount, b: WEATHER_THEMES.length })}</span>
          </div>
          {notice && (
            <div className="p-2 border border-amber-500/50 bg-amber-500/10 text-amber-300 text-[10px] flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{notice}</span>
              </span>
              <button type="button" onClick={() => setNotice(null)} className="text-[9px] underline ml-2 cursor-pointer">
                {t.dismiss}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
            {SORTED_WEATHER_THEMES.map((wt) => {
              const active = wt.id === theme;
              const unlocked = isWeatherThemeUnlocked(wt, progress);
              return (
                <button
                  key={wt.id}
                  type="button"
                  onClick={() => {
                    if (!unlocked) {
                      setNotice(unlockLockedMessage(wt.unlock, wt.name, progress, t));
                      return;
                    }
                    setNotice(null);
                    updatePrefs({ theme: wt.id });
                  }}
                  aria-pressed={active}
                  title={wt.desc}
                  className={`p-2 border text-left cursor-pointer transition-colors flex flex-col gap-1.5 min-w-0 ${
                    active ? 'border-emerald-500/70 bg-emerald-500/10' : unlocked ? `${borderCol} hover:border-zinc-500` : `${borderCol} hover:opacity-90`
                  }`}
                >
                  <span className={`h-6 flex items-center overflow-hidden text-[11px] pointer-events-none ${unlocked ? '' : 'opacity-30 blur-[1.5px]'}`}>
                    <WeatherFace theme={wt.id} {...sample} unit={unit} size="tile" />
                  </span>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] px-1 border shrink-0 ${active ? 'border-emerald-500 text-emerald-400 font-bold' : `${borderCol} ${textMuted}`}`}>
                      {wt.code}
                    </span>
                    <span className={`text-[10px] font-bold truncate ${active ? 'text-emerald-400' : ''}`}>{wt.name}</span>
                    {active && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                  </span>
                  {!unlocked && (
                    <span className={`self-start text-[9px] px-1 border ${borderCol} text-amber-400 flex items-center space-x-1`}>
                      <Lock className="w-2.5 h-2.5" />
                      <span>{unlockRequirementLabel(wt.unlock, t)}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className={`text-[9px] font-sans leading-relaxed ${textMuted}`}>
        {t.wxPrivacy}{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Weather data by Open-Meteo.com
        </a>
      </p>
    </div>
  );
};
