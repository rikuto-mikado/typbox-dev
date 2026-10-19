import React, { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { tf, useI18n } from './i18n';
import type { Dict } from './i18n';

// Weather badge for the SYSTEM CHRONOMETER header.
//
// Data: Open-Meteo (https://open-meteo.com, free, no API key, CC BY 4.0 —
// attribution shown in the panel). Location, in order of preference:
//   1. precise coordinates the user explicitly opted into (rounded to ~1 km),
//   2. a representative city for the account time zone (no prompt at all).
// Results are cached per location for 20 minutes in localStorage.

const PREFS_KEY = 'typbox_weather_prefs';
const CACHE_KEY = 'typbox_weather_cache';
const REFRESH_MS = 20 * 60 * 1000;

type Unit = 'c' | 'f';

interface WeatherPrefs {
  hidden?: boolean;
  unit?: Unit;
  precise?: { lat: number; lon: number };
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

export type WeatherKind = 'clear' | 'mostly-clear' | 'partly' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

// WMO weather interpretation codes -> icon/condition.
function weatherKind(code: number): WeatherKind {
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

// eslint-disable-next-line react-refresh/only-export-components
export function useWeather(timeZone: string) {
  const [prefs, setPrefs] = useState<WeatherPrefs>(() => readJson<WeatherPrefs>(PREFS_KEY) ?? {});
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
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); prefs then last for this tab only.
      }
      return next;
    });
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
  return { prefs, updatePrefs, coords, reading: current, error, unit, requestPrecise };
}

export type WeatherState = ReturnType<typeof useWeather>;

const formatTemp = (tempC: number, unit: Unit) =>
  unit === 'f' ? `${Math.round((tempC * 9) / 5 + 32)}°F` : `${Math.round(tempC)}°C`;

// ==========================================
// Badge (header) + panel (expands inside the chronometer card)
// ==========================================

export const WeatherBadge: React.FC<{ wx: WeatherState; open: boolean; onToggle: () => void; textMuted: string }> = ({
  wx,
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
      className={`wx-badge flex items-center gap-1 px-1 py-0.5 -my-0.5 cursor-pointer transition-opacity ${
        prefs.hidden ? 'opacity-40 hover:opacity-80' : 'hover:opacity-80'
      } ${open ? 'text-emerald-400' : ''}`}
    >
      {prefs.hidden || !reading || !kind ? (
        <span className={textMuted}>
          <WeatherIcon kind="partly" isDay size={15} />
        </span>
      ) : (
        <>
          <WeatherIcon kind={kind} isDay={reading.isDay} size={16} />
          <span className="tabular-nums normal-case tracking-normal font-semibold">{formatTemp(reading.tempC, unit)}</span>
        </>
      )}
    </button>
  );
};

export const WeatherPanel: React.FC<{ wx: WeatherState; isDark: boolean; borderCol: string; textMuted: string }> = ({
  wx,
  isDark,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  const { reading, prefs, updatePrefs, coords, unit, error, requestPrecise } = wx;
  const kind = reading ? weatherKind(reading.code) : null;
  const chip = `px-2 py-1 border ${borderCol} text-[10px] cursor-pointer hover:text-emerald-400 hover:border-emerald-500/50`;

  return (
    <div className={`mt-4 pt-3.5 border-t ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'} space-y-3 font-mono`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
        <span className="font-semibold">{tf(t.wxTitle, { place: coords?.label ?? (coords ? t.wxHere : '—') })}</span>
        <span className={textMuted}>{coords?.precise ? t.wxSourcePrecise : coords ? t.wxSourceZone : ''}</span>
      </div>

      {prefs.hidden ? (
        <p className={`text-[11px] ${textMuted}`}>{t.wxHiddenNote}</p>
      ) : reading && kind ? (
        <div className="flex items-center gap-4">
          <WeatherIcon kind={kind} isDay={reading.isDay} size={44} />
          <div className="space-y-1">
            <div className="text-2xl font-light tabular-nums">{formatTemp(reading.tempC, unit)}</div>
            <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>
              {t[KIND_LABEL_KEY[kind]]} · {tf(t.wxWind, { v: Math.round(reading.windKmh) })}
            </div>
          </div>
        </div>
      ) : (
        <p className={`text-[11px] ${textMuted}`}>{coords ? t.wxLoading : t.wxNoZoneCity}</p>
      )}

      {error && (
        <p className="text-[10px] text-amber-400">{error === 'denied' ? t.wxDenied : t.wxUnavailable}</p>
      )}

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

      <p className={`text-[9px] font-sans leading-relaxed ${textMuted}`}>
        {t.wxPrivacy}{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Weather data by Open-Meteo.com
        </a>
      </p>
    </div>
  );
};
