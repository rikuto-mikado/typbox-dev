import React, { useEffect, useMemo, useState } from 'react';
import { Orbit } from 'lucide-react';
import { formatTimeInZone, tf, useI18n, type Dict } from './i18n';

// Pure client-side planet positions (no API, no key, nothing to go stale):
// JPL's "Approximate Positions of the Planets" Keplerian elements, valid
// 1800-2050 to well under a degree, which is plenty for a sign and a
// retrograde flag. Each planet's heliocentric position comes from solving
// Kepler's equation; subtracting Earth's gives what the sky shows from here.

const DAY_MS = 86_400_000;
const J2000_JD = 2451545.0;
const UNIX_EPOCH_JD = 2440587.5;
const DEG = Math.PI / 180;
// General precession in longitude: shifts J2000 ecliptic longitudes to the
// equinox of date, so the tropical signs line up with today's sky.
const PRECESSION_DEG_PER_CENTURY = 1.3969713;
const CLOCK_TICK_MS = 10 * 60_000;
const TICKER_ROTATE_MS = 6_000;
// Mars only turns retrograde every ~26 months, so stations are searched
// that far ahead for every planet.
const STATION_SEARCH_DAYS = 800;

type PlanetKey = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
type BodyKey = Exclude<PlanetKey, 'earth'> | 'sun';

// [a (AU), e, I, L, ϖ (long. of perihelion), Ω (long. of node)] at J2000,
// then the same six as rates per Julian century (JPL table 1).
const ELEMENTS: Record<PlanetKey, readonly [readonly number[], readonly number[]]> = {
  mercury: [
    [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  ],
  venus: [
    [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  ],
  earth: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  ],
  mars: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  ],
  jupiter: [
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  ],
  saturn: [
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  ],
  uranus: [
    [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  ],
  neptune: [
    [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  ],
};

const ORBIT_ORDER: PlanetKey[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const LIST_ORDER: BodyKey[] = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const BODY_NAME_KEYS = {
  sun: 'orrerySun',
  mercury: 'orreryMercury',
  venus: 'orreryVenus',
  earth: 'orreryEarth',
  mars: 'orreryMars',
  jupiter: 'orreryJupiter',
  saturn: 'orrerySaturn',
  uranus: 'orreryUranus',
  neptune: 'orreryNeptune',
} as const satisfies Record<PlanetKey | BodyKey, keyof Dict>;

const SIGNS = ['ARI', 'TAU', 'GEM', 'CAN', 'LEO', 'VIR', 'LIB', 'SCO', 'SAG', 'CAP', 'AQU', 'PIS'] as const;

// Hex rather than Tailwind classes because they're used as SVG fills.
const BODY_COLORS: Record<PlanetKey | BodyKey, { dark: string; light: string }> = {
  sun: { dark: '#fbbf24', light: '#f59e0b' },
  mercury: { dark: '#a1a1aa', light: '#71717a' },
  venus: { dark: '#fde68a', light: '#d97706' },
  earth: { dark: '#34d399', light: '#059669' },
  mars: { dark: '#f87171', light: '#dc2626' },
  jupiter: { dark: '#fdba74', light: '#ea580c' },
  saturn: { dark: '#fde047', light: '#ca8a04' },
  uranus: { dark: '#67e8f9', light: '#0891b2' },
  neptune: { dark: '#60a5fa', light: '#2563eb' },
};

// Schematic, not to scale: true radii would put Mercury through Mars inside
// a few pixels of the Sun, so orbits are evenly spaced and only the angles
// are real.
const ORBIT_RADIUS = (index: number) => 15 + index * 11;
const BODY_RADIUS: Record<PlanetKey, number> = {
  mercury: 2,
  venus: 2.6,
  earth: 2.8,
  mars: 2.3,
  jupiter: 4,
  saturn: 3.5,
  uranus: 3,
  neptune: 3,
};

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const centuriesSinceJ2000 = (ms: number) => (ms / DAY_MS + UNIX_EPOCH_JD - J2000_JD) / 36525;

const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;
const wrap180 = (deg: number) => wrap360(deg + 180) - 180;

/** Heliocentric ecliptic (J2000) position in AU. */
function heliocentric(key: PlanetKey, T: number): Vec3 {
  const [base, rate] = ELEMENTS[key];
  const [a, e, inc, L, peri, node] = base.map((v, i) => v + rate[i] * T);
  const M = wrap180(L - peri) * DEG;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));

  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * DEG;
  const O = node * DEG;
  const I = inc * DEG;
  const [cw, sw, cO, sO, cI, sI] = [Math.cos(w), Math.sin(w), Math.cos(O), Math.sin(O), Math.cos(I), Math.sin(I)];
  return {
    x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    z: sw * sI * xp + cw * sI * yp,
  };
}

/** Earth-centred position in AU; the Sun is just Earth's position flipped. */
function geocentric(key: BodyKey, T: number): Vec3 {
  const earth = heliocentric('earth', T);
  if (key === 'sun') return { x: -earth.x, y: -earth.y, z: -earth.z };
  const p = heliocentric(key, T);
  return { x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z };
}

const longitude = (v: Vec3) => wrap360(Math.atan2(v.y, v.x) / DEG);

/** Apparent motion in degrees/day; negative means retrograde. */
function dailyMotion(key: BodyKey, ms: number): number {
  const before = longitude(geocentric(key, centuriesSinceJ2000(ms - DAY_MS / 2)));
  const after = longitude(geocentric(key, centuriesSinceJ2000(ms + DAY_MS / 2)));
  return wrap180(after - before);
}

/** Whole days until the planet's direction flips (a station), or null past the horizon. */
function daysToStation(key: BodyKey, ms: number, retrograde: boolean): number | null {
  for (let d = 1; d <= STATION_SEARCH_DAYS; d++) {
    if (dailyMotion(key, ms + d * DAY_MS) < 0 !== retrograde) return d;
  }
  return null;
}

interface OrreryProps {
  timeZone: string;
  textMuted: string;
  isDark: boolean;
}

export const Orrery: React.FC<OrreryProps> = ({ timeZone, textMuted, isDark }) => {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const [focus, setFocus] = useState<BodyKey | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerPaused, setTickerPaused] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const color = (key: PlanetKey | BodyKey) => BODY_COLORS[key][isDark ? 'dark' : 'light'];

  const view = useMemo(() => {
    const T = centuriesSinceJ2000(now);
    const precession = PRECESSION_DEG_PER_CENTURY * T;

    const orbits = ORBIT_ORDER.map((key, index) => {
      const lon = longitude(heliocentric(key, T)) * DEG;
      const r = ORBIT_RADIUS(index);
      return { key, r, x: r * Math.cos(lon), y: -r * Math.sin(lon) };
    });

    const bodies = LIST_ORDER.map((key) => {
      const geo = geocentric(key, T);
      const lon = wrap360(longitude(geo) + precession);
      const retrograde = key !== 'sun' && dailyMotion(key, now) < 0;
      return {
        key,
        sign: SIGNS[Math.floor(lon / 30)],
        degree: Math.floor(lon % 30),
        distance: Math.hypot(geo.x, geo.y, geo.z),
        retrograde,
        station: key === 'sun' ? null : daysToStation(key, now, retrograde),
      };
    });

    // Retrogrades in progress first, then whichever planet turns next.
    const ticker = bodies
      .filter((b) => b.station !== null)
      .sort((a, b) => Number(b.retrograde) - Number(a.retrograde) || a.station! - b.station!);

    return { orbits, bodies, ticker };
  }, [now]);

  const tickerLength = view.ticker.length;
  useEffect(() => {
    if (tickerLength <= 1 || tickerPaused) return;
    const id = window.setInterval(() => setTickerIndex((i) => i + 1), TICKER_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [tickerLength, tickerPaused]);

  const tickerItem = tickerLength > 0 ? view.ticker[tickerIndex % tickerLength] : null;
  const earth = view.orbits.find((o) => o.key === 'earth')!;
  const focusTarget =
    focus === 'sun' ? { x: 0, y: 0 } : focus ? view.orbits.find((o) => o.key === focus) ?? null : null;
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone }).format(now),
    [now, timeZone]
  );
  const retroTone = isDark ? 'text-amber-400' : 'text-amber-600';
  const strongText = isDark ? 'text-zinc-200' : 'text-zinc-900';

  return (
    <>
      <div className={`flex items-center justify-between gap-3 pb-3 border-b ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
        <div className="flex items-center space-x-2">
          <Orbit className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <h2 className="font-mono text-xs uppercase tracking-widest font-semibold">{t.orreryTitle}</h2>
        </div>
        <span className={`font-mono text-[10px] uppercase ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{dateLabel}</span>
      </div>

      <div className="pt-4 flex-1 grid gap-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-center">
        <svg viewBox="-100 -100 200 200" className="w-full max-w-[14rem] mx-auto aspect-square" role="img" aria-label={t.orreryAria}>
          {/* Zodiac boundaries every 30°, the vernal-equinox (0°) tick drawn longer */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = i * 30 * DEG;
            const inner = i === 0 ? 92 : 95;
            return (
              <line
                key={i}
                x1={inner * Math.cos(a)}
                y1={-inner * Math.sin(a)}
                x2={99 * Math.cos(a)}
                y2={-99 * Math.sin(a)}
                stroke="var(--tb-border)"
                strokeWidth={i === 0 ? 1 : 0.6}
              />
            );
          })}
          {view.orbits.map((o) => (
            <circle
              key={o.key}
              r={o.r}
              fill="none"
              stroke={o.key === 'earth' ? color('earth') : 'var(--tb-border)'}
              strokeOpacity={o.key === 'earth' ? 0.35 : 1}
              strokeWidth={0.6}
            />
          ))}
          {/* Line of sight from Earth to the focused body: its direction is the sign shown in the list */}
          {focusTarget && (
            <line
              x1={earth.x}
              y1={earth.y}
              x2={focusTarget.x}
              y2={focusTarget.y}
              stroke={color(focus!)}
              strokeWidth={0.8}
              strokeDasharray="2 2"
            />
          )}
          <circle r={5.5} fill={color('sun')} />
          {view.orbits.map((o) => {
            const focused = focus === o.key;
            return (
              <g key={o.key} transform={`translate(${o.x} ${o.y})`}>
                {o.key === 'saturn' && (
                  <ellipse rx={BODY_RADIUS.saturn * 1.9} ry={BODY_RADIUS.saturn * 0.7} fill="none" stroke={color('saturn')} strokeWidth={0.7} />
                )}
                <circle r={BODY_RADIUS[o.key]} fill={color(o.key)} />
                {(focused || o.key === 'earth') && (
                  <circle r={BODY_RADIUS[o.key] + 2.5} fill="none" stroke={color(o.key)} strokeWidth={0.7} />
                )}
              </g>
            );
          })}
        </svg>

        <div className="font-mono min-w-0">
          <div className={`grid grid-cols-[0.5rem_minmax(0,1fr)_4rem_3.5rem_0.75rem] gap-x-2.5 pb-1.5 text-[9px] uppercase tracking-widest ${textMuted}`}>
            <span />
            <span>{t.orreryFromEarth}</span>
            <span>{t.orrerySign}</span>
            <span className="text-right">{t.orreryDistance}</span>
            <span />
          </div>
          <ul>
            {view.bodies.map((b) => (
              <li key={b.key}>
                <button
                  type="button"
                  onMouseEnter={() => setFocus(b.key)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(b.key)}
                  onBlur={() => setFocus(null)}
                  onClick={() => setFocus((f) => (f === b.key ? null : b.key))}
                  aria-pressed={focus === b.key}
                  title={b.retrograde ? t.orreryRetrograde : undefined}
                  className={`w-full grid grid-cols-[0.5rem_minmax(0,1fr)_4rem_3.5rem_0.75rem] gap-x-2.5 items-center py-1 text-left text-[11px] cursor-pointer transition-colors ${
                    focus === b.key ? (isDark ? 'bg-zinc-800/50' : 'bg-zinc-100') : ''
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color(b.key) }} />
                  <span className={`truncate uppercase tracking-wider ${strongText}`}>{t[BODY_NAME_KEYS[b.key]]}</span>
                  <span className={`tabular-nums ${textMuted}`}>
                    {b.sign} {String(b.degree).padStart(2, '0')}°
                  </span>
                  <span className={`text-right tabular-nums ${textMuted}`}>{b.distance.toFixed(2)}</span>
                  <span className={`text-center ${retroTone}`}>{b.retrograde ? '℞' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={`mt-4 pt-3 border-t min-h-[2.25rem] flex items-center ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}
        onMouseEnter={() => setTickerPaused(true)}
        onMouseLeave={() => setTickerPaused(false)}
      >
        {tickerItem && (
          <div key={tickerItem.key} className="orrery-ticker-in w-full flex items-center gap-2 font-mono text-[11px] min-w-0">
            <span className={tickerItem.retrograde ? retroTone : textMuted}>▸</span>
            <span className={`truncate uppercase ${strongText}`}>
              {tf(tickerItem.retrograde ? t.orreryRetroNow : t.orreryRetroNext, { body: t[BODY_NAME_KEYS[tickerItem.key]] })}
            </span>
            <span className={`ml-auto shrink-0 text-[10px] uppercase tracking-wider ${textMuted}`}>
              {tf(tickerItem.retrograde ? t.orreryEndsIn : t.orreryStartsIn, { n: tickerItem.station! })}
            </span>
          </div>
        )}
      </div>

      <div
        className={`flex items-center justify-between gap-2 pt-3 mt-3 border-t font-mono text-[10px] uppercase tracking-wider ${textMuted} ${
          isDark ? 'border-zinc-800/50' : 'border-zinc-200'
        }`}
      >
        <span>{t.orrerySource}</span>
        <span>{formatTimeInZone(now, timeZone)}</span>
      </div>
    </>
  );
};
