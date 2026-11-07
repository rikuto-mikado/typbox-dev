import React, { useEffect, useRef, useState } from 'react';
import { BuffIcon } from './BuffIcon';
import { isDemo } from './demo';
import { tf, useI18n } from './i18n';
import type { CharmId, Starlight, StarWish } from './api';
import { WISH_TEXT } from './wishText';

// STARLIGHT drawn as a real night sky: each guard's worth of stars is one real
// constellation, lit star by star, and each charm has a sky of its own (not
// the figure on its medallion): ASTRA the two dippers, NOVA the summer's
// Scorpius and the Sickle of Leo, NEBULA Cassiopeia's W and the Pleiades. The
// sky behind them is painted once onto a canvas from a fixed seed, so it looks
// the same on every visit. It is night in both themes, so its colors are fixed.

const VIEW_W = 360;
const VIEW_H = 190;

interface SkyStar {
  x: number;
  y: number;
  /** Apparent size: the brighter, the larger its glow. */
  size: number;
  /** Warm stars read orange-white, the others blue-white. */
  warm?: boolean;
}

interface Figure {
  /** In lighting order; neighbours are joined as they light. */
  stars: readonly SkyStar[];
  /** A line that closes the figure (a bowl, a loop), once all its stars are lit. */
  closes?: readonly [from: number, to: number];
}

// Laid out after the sky itself, with each star's real relative brightness.
const DIPPERS: readonly Figure[] = [
  {
    // The Big Dipper, handle first: Alkaid, Mizar, Alioth, Megrez, Phecda, Merak, Dubhe.
    stars: [
      { x: 24, y: 76, size: 1.05 },
      { x: 53, y: 62, size: 1 },
      { x: 79, y: 66, size: 1.12 },
      { x: 105, y: 77, size: 0.7 },
      { x: 113, y: 108, size: 0.86 },
      { x: 155, y: 112, size: 0.95 },
      { x: 159, y: 74, size: 1.14, warm: true },
    ],
    closes: [3, 6],
  },
  {
    // The Little Dipper from Polaris: Yildun, Epsilon, Zeta, Eta, Pherkad, Kochab.
    stars: [
      { x: 332, y: 46, size: 1.02 },
      { x: 307, y: 60, size: 0.52 },
      { x: 286, y: 76, size: 0.6, warm: true },
      { x: 264, y: 90, size: 0.72 },
      { x: 232, y: 96, size: 0.62 },
      { x: 224, y: 128, size: 0.78 },
      { x: 258, y: 132, size: 1.02, warm: true },
    ],
    closes: [3, 6],
  },
];

const SUMMER: readonly Figure[] = [
  {
    // Scorpius from its red heart down the tail: Antares, Tau, Epsilon, Mu, Zeta, Eta.
    stars: [
      { x: 58, y: 46, size: 1.18, warm: true },
      { x: 70, y: 62, size: 0.62 },
      { x: 78, y: 86, size: 0.86, warm: true },
      { x: 80, y: 110, size: 0.72 },
      { x: 94, y: 128, size: 0.68 },
      { x: 118, y: 134, size: 0.74 },
    ],
  },
  {
    // The Sickle of Leo, handle to blade: Regulus, Eta, Algieba, Adhafera, Rasalas, Epsilon.
    stars: [
      { x: 266, y: 132, size: 1.1 },
      { x: 260, y: 106, size: 0.66 },
      { x: 270, y: 82, size: 1.0, warm: true },
      { x: 288, y: 68, size: 0.6 },
      { x: 308, y: 72, size: 0.62 },
      { x: 316, y: 96, size: 0.86, warm: true },
    ],
  },
];

const CLOUDED: readonly Figure[] = [
  {
    // Cassiopeia's W, in the Milky Way: Caph, Schedar, Gamma, Ruchbah, Segin.
    stars: [
      { x: 36, y: 58, size: 0.9 },
      { x: 60, y: 84, size: 1.05, warm: true },
      { x: 84, y: 64, size: 1.0 },
      { x: 106, y: 88, size: 0.86 },
      { x: 132, y: 72, size: 0.7 },
    ],
  },
  {
    // The Pleiades, a little dipper of their own: Electra, Maia, Alcyone, Atlas, Merope.
    stars: [
      { x: 238, y: 92, size: 0.76 },
      { x: 256, y: 72, size: 0.72 },
      { x: 268, y: 98, size: 0.98 },
      { x: 296, y: 106, size: 0.76 },
      { x: 276, y: 126, size: 0.7 },
    ],
    closes: [4, 2],
  },
];

const NORTH: readonly Figure[] = [
  {
    // Cepheus, the house round the pole: Alderamin, Alfirk, Errai, Iota, Zeta.
    stars: [
      { x: 44, y: 120, size: 1.0 },
      { x: 62, y: 84, size: 0.86 },
      { x: 92, y: 56, size: 0.9, warm: true },
      { x: 120, y: 88, size: 0.66, warm: true },
      { x: 98, y: 122, size: 0.7, warm: true },
    ],
    closes: [4, 0],
  },
  {
    // Draco from its head down the neck: Eltanin, Rastaban, Grumium, Altais, Aldhibah, Thuban, Edasich.
    stars: [
      { x: 316, y: 128, size: 1.08, warm: true },
      { x: 300, y: 112, size: 0.84 },
      { x: 330, y: 104, size: 0.62 },
      { x: 284, y: 76, size: 0.78 },
      { x: 254, y: 60, size: 0.72 },
      { x: 226, y: 80, size: 0.76 },
      { x: 206, y: 108, size: 0.7, warm: true },
    ],
    closes: [2, 0],
  },
];

const WINTER: readonly Figure[] = [
  {
    // Auriga's pentagon from Capella: Capella, Menkalinan, Theta, Elnath, Hassaleh, and the Kids.
    stars: [
      { x: 52, y: 58, size: 1.2, warm: true },
      { x: 104, y: 54, size: 0.92 },
      { x: 118, y: 96, size: 0.78 },
      { x: 90, y: 128, size: 0.98 },
      { x: 40, y: 104, size: 0.82, warm: true },
      { x: 30, y: 74, size: 0.6 },
    ],
    closes: [5, 0],
  },
  {
    // The Northern Cross: Deneb, Sadr, Albireo along the beam, Gienah and Delta across.
    stars: [
      { x: 252, y: 44, size: 1.14 },
      { x: 268, y: 78, size: 0.92, warm: true },
      { x: 284, y: 112, size: 0.7 },
      { x: 300, y: 146, size: 0.84, warm: true },
      { x: 236, y: 94, size: 0.86, warm: true },
      { x: 304, y: 64, size: 0.8 },
    ],
  },
];

const HUNTER: readonly Figure[] = [
  {
    // Orion, belt first: Alnitak, Alnilam, Mintaka, Bellatrix, Betelgeuse, Saiph, Rigel.
    stars: [
      { x: 92, y: 102, size: 0.96 },
      { x: 104, y: 96, size: 1.0 },
      { x: 116, y: 90, size: 0.92 },
      { x: 138, y: 52, size: 0.98 },
      { x: 70, y: 46, size: 1.2, warm: true },
      { x: 80, y: 146, size: 0.94 },
      { x: 146, y: 140, size: 1.18 },
    ],
  },
  {
    // At his heel, the great dog: Sirius, Mirzam, Adhara.
    stars: [
      { x: 252, y: 100, size: 1.3 },
      { x: 236, y: 82, size: 0.86 },
      { x: 270, y: 148, size: 0.98 },
    ],
  },
];

const SKIES: Record<CharmId, readonly Figure[]> = {
  astra: DIPPERS,
  polaris: NORTH,
  nova: SUMMER,
  aurora: WINTER,
  nebula: CLOUDED,
  orion: HUNTER,
};

/** A fixed stream of numbers in [0, 1), so the sky never reshuffles. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const STAR_TINTS = ['207,217,255', '233,238,255', '255,255,255', '255,240,222', '255,216,184'];

/** A few box blurs over the small band, which would otherwise show its pixels
 *  once scaled up. Done by hand: Safari's canvas has no blur filter. */
function softenBand(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const image = ctx.getImageData(0, 0, w, h);
  const channels = [0, 1, 2, 3].map((c) => Float32Array.from({ length: w * h }, (_, i) => image.data[i * 4 + c]));
  const RADIUS = 2;
  const blur = (from: Float32Array, step: number, lines: number, length: number, across: number) => {
    const to = new Float32Array(from.length);
    for (let line = 0; line < lines; line++) {
      for (let i = 0; i < length; i++) {
        let sum = 0;
        for (let k = -RADIUS; k <= RADIUS; k++) {
          sum += from[line * across + Math.max(0, Math.min(length - 1, i + k)) * step];
        }
        to[line * across + i * step] = sum / (RADIUS * 2 + 1);
      }
    }
    return to;
  };
  channels.forEach((channel, c) => {
    let out = channel;
    for (let pass = 0; pass < 2; pass++) {
      out = blur(out, 1, h, w, w);
      out = blur(out, w, w, h, 1);
    }
    for (let i = 0; i < w * h; i++) image.data[i * 4 + c] = out[i];
  });
  ctx.putImageData(image, 0, 0);
}

/** The night behind the constellations: air, Milky Way, thousands of stars, a ridge. */
function paintSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rnd = seeded(20261102);
  const normal = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;

  const air = ctx.createLinearGradient(0, 0, 0, h);
  air.addColorStop(0, '#02040b');
  air.addColorStop(0.5, '#050a18');
  air.addColorStop(0.8, '#0a1424');
  air.addColorStop(1, '#16222f');
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, w, h);

  // The Milky Way, a diagonal of overlapping glows with dark lanes through it.
  // Painted small and scaled up: hundreds of barely-there layers at full size
  // round off into a visible mesh, but scaled up they stay smooth.
  const bandAt = (t: number, off: number): [number, number] => [
    -0.1 * w + t * 1.2 * w + off * 0.42 * h,
    1.02 * h - t * 1.04 * h + off * h,
  ];
  const SCALE = 0.25;
  const small = document.createElement('canvas');
  small.width = Math.max(1, Math.round(w * SCALE));
  small.height = Math.max(1, Math.round(h * SCALE));
  const band = small.getContext('2d');
  if (band) {
    band.scale(SCALE, SCALE);
    band.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 240; i++) {
      const t = rnd();
      const [x, y] = bandAt(t, normal() * 0.2);
      const r = (0.04 + rnd() * 0.17) * h;
      const core = 1 - Math.abs(t - 0.5) * 2;
      const tint = rnd() < core * 0.6 ? '188,168,150' : '132,148,190';
      const glow = band.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, `rgba(${tint},${0.03 + rnd() * 0.05})`);
      glow.addColorStop(1, `rgba(${tint},0)`);
      band.fillStyle = glow;
      band.fillRect(x - r, y - r, r * 2, r * 2);
    }
    band.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 70; i++) {
      const [x, y] = bandAt(rnd(), normal() * 0.05);
      const r = (0.018 + rnd() * 0.06) * h;
      const lane = band.createRadialGradient(x, y, 0, x, y, r);
      lane.addColorStop(0, `rgba(0,0,0,${0.16 + rnd() * 0.3})`);
      lane.addColorStop(1, 'rgba(0,0,0,0)');
      band.fillStyle = lane;
      band.fillRect(x - r, y - r, r * 2, r * 2);
    }
    softenBand(band, small.width, small.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, w, h);
  }

  // Dust of stars too faint to pick out, then the ones you can: most are barely
  // there and only a rare few are bright, thickest along the band.
  const dust = Math.min(9000, Math.round(w * h * 0.05));
  for (let i = 0; i < dust; i++) {
    const [x, y] = i % 2 === 0 ? bandAt(rnd(), normal() * 0.22) : [rnd() * w, rnd() * h];
    ctx.fillStyle = `rgba(214,222,255,${0.05 + rnd() * 0.16})`;
    ctx.fillRect(x, y, 0.5, 0.5);
  }
  const count = Math.round(w * h * 0.0075);
  for (let i = 0; i < count; i++) {
    const [x, y] = i % 3 === 0 ? bandAt(rnd(), normal() * 0.22) : [rnd() * w, rnd() * h];
    const brightness = Math.pow(rnd(), 7);
    const tint = STAR_TINTS[Math.floor(rnd() * STAR_TINTS.length)];
    ctx.fillStyle = `rgba(${tint},${0.2 + brightness * 0.75 + rnd() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.28 + brightness * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Thick air low down, then two ridges against it.
  const haze = ctx.createLinearGradient(0, h * 0.68, 0, h);
  haze.addColorStop(0, 'rgba(66,88,108,0)');
  haze.addColorStop(1, 'rgba(84,104,118,0.3)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  const ridge = (base: number, height: number, phase: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 2) {
      const u = x / w;
      const rise =
        Math.sin(u * 7 + phase) * 0.5 +
        Math.sin(u * 17 + phase * 2.3) * 0.25 +
        Math.sin(u * 41 + phase * 1.7) * 0.1 +
        Math.sin(u * 97 + phase) * 0.04;
      ctx.lineTo(x, h * (base - rise * height));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  };
  ridge(0.9, 0.035, 1.2, '#070d17');
  ridge(0.96, 0.03, 4.1, '#02040a');
}

/** A small mark in the same language, for calendar days and the buff card. */
export const Glint: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="-5 -5 10 10" className={className} fill="currentColor" aria-hidden="true">
    <path d="M0-5Q0 0 5 0Q0 0 0 5Q0 0-5 0Q0 0 0-5Z" />
  </svg>
);

export const StarlightSky: React.FC<{ starlight: Starlight }> = ({ starlight }) => {
  const { t } = useI18n();
  const { stars, max, cost, guard_on: guardOn } = starlight;
  const guards = Math.floor(stars / cost);
  const hasGuard = starlight.has_guard !== false;
  // No charm worn: the night is there, but no figure is drawn on it.
  const bare = starlight.worn === false;
  const figures = bare ? [] : SKIES[starlight.charm ?? 'astra'];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      const ctx = canvas.getContext('2d');
      if (!ctx || w === 0 || h === 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintSky(ctx, w, h);
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      // Its own shape when stacked; beside the charm (sm and up) it fills the
      // row the charm card sets, so the two always stand the same height.
      className="relative w-full overflow-hidden border border-slate-400/15 font-mono bg-[#02040b] aspect-[360/190] max-h-[248px] sm:aspect-auto sm:max-h-none sm:h-full"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="absolute inset-0 w-full h-full"
        role="img"
        aria-label={`${t.starlightTitle} ${stars} / ${max}`}
      >
        <defs>
          <radialGradient id="sl-cool">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="7%" stopColor="#f4f7ff" />
            <stop offset="17%" stopColor="#c9d8ff" stopOpacity="0.5" />
            <stop offset="42%" stopColor="#9db4ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#9db4ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sl-warm">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="7%" stopColor="#fff4e4" />
            <stop offset="17%" stopColor="#ffd9ad" stopOpacity="0.5" />
            <stop offset="42%" stopColor="#ffb98a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffb98a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sl-meteor" gradientUnits="userSpaceOnUse" x1="244" y1="20" x2="206" y2="42">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <path className="sky-shoot" d="M244 20 L206 42" stroke="url(#sl-meteor)" strokeWidth="0.6" strokeLinecap="round" fill="none" />

        {figures.map((figure, f) => {
          const size = figure.stars.length;
          const offset = figures.slice(0, f).reduce((n, g) => n + g.stars.length, 0);
          const litHere = Math.max(0, Math.min(size, stars - offset));
          const complete = litHere === size;
          const line = figure.stars.slice(0, litHere).map((s) => `${s.x},${s.y}`).join(' ');
          const [from, to] = figure.closes ?? [0, 0];
          return (
            <g key={f}>
              {/* A chart's hairline: drawn only as far as the stars are lit. */}
              {litHere > 1 && (
                <polyline
                  points={line}
                  fill="none"
                  stroke={complete ? '#ffe6bf' : '#c8d3f2'}
                  strokeOpacity={complete ? 0.34 : 0.2}
                  strokeWidth="0.45"
                />
              )}
              {complete && figure.closes && (
                <line
                  x1={figure.stars[from].x}
                  y1={figure.stars[from].y}
                  x2={figure.stars[to].x}
                  y2={figure.stars[to].y}
                  stroke="#ffe6bf"
                  strokeOpacity="0.34"
                  strokeWidth="0.45"
                />
              )}
              {figure.stars.map((star, i) => {
                const index = offset + i;
                if (i >= litHere) {
                  // Waiting stars are simply too faint to make out yet.
                  return (
                    <circle
                      key={i}
                      cx={star.x}
                      cy={star.y}
                      r={index === stars ? 0.75 : 0.5}
                      fill="#dfe6ff"
                      opacity={index === stars ? undefined : 0.3}
                      className={index === stars ? 'sky-next' : undefined}
                    />
                  );
                }
                return (
                  <circle
                    key={i}
                    className="sky-twinkle"
                    style={{ animationDelay: `${index * -1.3}s`, animationDuration: `${6 + (index % 5)}s` }}
                    cx={star.x}
                    cy={star.y}
                    r={star.size * 12}
                    fill={star.warm ? 'url(#sl-warm)' : 'url(#sl-cool)'}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Words stay crisp HTML over the sky, whatever its scale. */}
      <div className="absolute inset-x-0 top-0 flex items-baseline justify-between gap-2 px-3 pt-2.5 text-[10px] uppercase pointer-events-none">
        <span className="font-semibold tracking-[0.28em] text-slate-100/85">{t.starlightTitle}</span>
        {!bare && (
          <span className="tabular-nums tracking-widest text-slate-300/60">
            {stars} / {max}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 px-3 pb-2 text-[10px] uppercase tracking-widest pointer-events-none">
        <span className={guardOn ? 'text-[#f6dcae]' : 'text-slate-300/60'}>
          {bare ? t.starlightBare : !hasGuard ? t.starlightNoGuard : guardOn ? tf(t.starlightGuardOn, { n: guards }) : tf(t.starlightGuardOff, { n: cost - stars })}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- wishes

/** Each wish's sign, in the night sky's line. */
const WISH_ICONS: Record<StarWish, React.ReactNode> = {
  reroll: (
    <>
      <path d="M28 4 L19 12" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
      <path d="M19 12 L13 17" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 15Q10 20 15 20Q10 20 10 25Q10 20 5 20Q10 20 10 15Z" fill="currentColor" />
    </>
  ),
  omen: (
    <>
      <path d="M3 16Q16 3 29 16Q16 29 3 16Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="16" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M16 13.6Q16 16 18.4 16Q16 16 16 18.4Q16 16 13.6 16Q16 16 16 13.6Z" fill="currentColor" />
    </>
  ),
  starchart: (
    <>
      <rect x="5" y="6" width="22" height="20" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 21 L14 13 L19 17 L24 10" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
      {[[9, 21], [14, 13], [19, 17], [24, 10]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="currentColor" />
      ))}
    </>
  ),
  hush: (
    <>
      <path d="M20 5A11 11 0 1 0 27 21A8.5 8.5 0 1 1 20 5Z" fill="currentColor" fillOpacity="0.85" />
      <path d="M22 9h4M24 7v4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  supernova: (
    <>
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        const r = i % 2 ? 9 : 13;
        return <path key={i} d={`M${16 + Math.cos(a) * 6} ${16 + Math.sin(a) * 6}L${16 + Math.cos(a) * r} ${16 + Math.sin(a) * r}`} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />;
      })}
    </>
  ),
  blaze: (
    <path d="M16 3C18 9 24 11 24 19A8 8 0 0 1 8 19C8 14 11 12 12 8C13 12 15 13 16 13C16 9 15 6 16 3Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  ),
  wildfire: (
    <>
      <path d="M11 8C12 12 16 13 16 18A5 5 0 0 1 6 18C6 15 8 14 8.5 11.5C9.5 13 11 12 11 8Z" fill="currentColor" fillOpacity="0.85" />
      <path d="M22 10C23 14 27 15 27 20A5 5 0 0 1 17 20C17 17 19 16 19.5 13.5C20.5 15 22 14 22 10Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 27h17" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 2" />
    </>
  ),
  scatter: (
    <>
      {[[8, 9, 2.2], [22, 7, 1.5], [15, 15, 2.6], [25, 20, 2], [9, 23, 1.6], [19, 26, 1.2]].map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="currentColor" fillOpacity={r > 2 ? 1 : 0.6} />
      ))}
    </>
  ),
  veil: (
    <>
      <path d="M5 8Q16 2 27 8V18Q16 30 5 18Z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M9 11Q16 7 23 11M9 16Q16 12 23 16M10 21Q16 17 22 21" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" fill="none" />
    </>
  ),
  drift: (
    <>
      <path d="M4 12Q10 8 16 12T28 12M4 19Q10 15 16 19T28 19" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M21 25h6l-6 0M22 23l5 0-5 4h5" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="0.9" />
    </>
  ),
  mist: (
    <>
      <path d="M3 16Q16 3 29 16Q16 29 3 16Z" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.1" strokeDasharray="2 1.5" />
      <path d="M8 13h16M6 17h20M9 21h14" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  silver: (
    <>
      <path d="M7 10Q7 5 13 5Q15 2 19 4Q25 4 25 10Z" fill="currentColor" fillOpacity="0.8" />
      {[[9, 14], [14, 17], [19, 14], [24, 17], [11, 22], [21, 23]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y}l-1.2 3`} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ))}
      <path d="M14 27.5Q16 25.5 18 27.5Q16 29.5 14 27.5Z" fill="currentColor" />
    </>
  ),
  ember: (
    <>
      <path d="M16 5C17.5 10 22 11.5 22 17.5A6 6 0 0 1 10 17.5C10 14 12 12.5 12.8 10C13.6 12.5 15 13 16 13C16 10 15 8 16 5Z" fill="currentColor" fillOpacity="0.85" />
      <path d="M6 26h20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M22 23l4 3-4 3" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),
  afterglow: (
    <>
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.1" />
      <path d="M16 16V9M16 16l5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 16A10 10 0 0 1 16 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 9l2-3 3 2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </>
  ),
  aim: (
    <>
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
      <path d="M16 3v6M16 23v6M3 16h6M23 16h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" />
    </>
  ),
  volley: (
    <>
      {[9, 16, 23].map((y) => (
        <g key={y}>
          <path d={`M5 ${y}H24`} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d={`M21 ${y - 3}L26 ${y}L21 ${y + 3}`} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={`M5 ${y}l-2 -2M5 ${y}l-2 2`} stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
        </g>
      ))}
    </>
  ),
  quarry: (
    <>
      <path d="M8 27C8 18 12 14 16 14S24 18 24 27" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 9l2 4M21 9l-2 4M16 6v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="16" cy="21" r="2.2" fill="currentColor" />
      <path d="M4 20h4M24 20h4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="1.5 1.5" />
    </>
  ),
};


/** Wishes that deal a new furniture lineup. */
const DEALS: StarWish[] = ['reroll', 'scatter'];

export const StarWishes: React.FC<{
  starlight: Starlight;
  now: number;
  /** "3h 12m": how the shop writes time left. */
  formatLeft: (ms: number) => string;
  onWish: (use: StarWish) => Promise<void>;
  /** A furniture piece's name, for a STARCHART. */
  pieceName?: (id: string) => string;
  /** After a FALLING STAR or SCATTER: set (to when it was granted) while its
   *  card offers the way to FURNITURE; the shop clears it after `grantMs`. */
  granted?: number | null;
  grantedUse?: StarWish | null;
  grantMs?: number;
  onGo?: () => void;
}> = ({ starlight, now, formatLeft, onWish, pieceName = (id) => id, granted = null, grantedUse = null, grantMs = 10_000, onGo }) => {
  const { t } = useI18n();
  const [armed, setArmed] = useState<StarWish | null>(null);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);
  const wishes = starlight.wishes;
  if (!wishes || !wishes.charm) {
    return (
      <div className="space-y-1.5 font-mono">
        <div className="text-[10px] uppercase tracking-[0.28em] text-amber-400/90">{t.starWishes}</div>
        <div className="p-3 border border-dashed border-slate-500/40 text-[10px] text-slate-400">{t.wishWearFirst}</div>
      </div>
    );
  }
  const running = wishes.running;
  const turnsAt = starlight.crate_turns_at ? new Date(starlight.crate_turns_at).getTime() : 0;
  const crateLive = now < turnsAt;
  const until = (iso?: string | null) => (iso && Date.parse(iso) > now ? Date.parse(iso) - now : 0);
  /** What a wish has going: a line under its name, and whether that blocks another. */
  const going = (use: StarWish): { text: string; blocks: boolean } | null => {
    switch (use) {
      case 'omen':
      case 'mist':
        if (!crateLive || !starlight.omen_live) return null;
        return { text: '', blocks: true };
      case 'hush':
      case 'veil':
      case 'supernova':
      case 'aim':
      case 'volley':
      case 'silver': {
        const n = running[use] ?? 0;
        return n > 0 ? { text: tf(t.wishWaiting, { n }), blocks: true } : null;
      }
      case 'blaze':
      case 'wildfire':
      case 'quarry':
      case 'drift': {
        const ms = until(running[use]);
        return ms > 0 ? { text: tf(t.wishBurning, { t: formatLeft(ms) }), blocks: true } : null;
      }
      case 'starchart':
        return running.starchart && until(running.starchart.until) > 0 ? { text: '', blocks: true } : null;
      default:
        return null;
    }
  };
  return (
    <div className="space-y-1.5 font-mono">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.28em] text-amber-400/90">{t.starWishes}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-400 truncate">{tf(t.wishFestivalCost, { n: wishes.festival })}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {wishes.list.map(({ id: use, cost, base }) => {
          const text = WISH_TEXT[use];
          const isCrate = use === 'omen' || use === 'mist';
          const told = isCrate && crateLive && starlight.omen_live ? (starlight.omen ?? (starlight.omen_hint ? (starlight.omen_hint === 'rare' ? t.wishMistRare : t.wishMistCommon) : null)) : null;
          const tooLate = isCrate && crateLive && !starlight.omen_live && Boolean(starlight.omen_too_late);
          const run = going(use);
          const chart = use === 'starchart' && run ? running.starchart : null;
          const dealt = DEALS.includes(use) && granted !== null && grantedUse === use;
          const short = starlight.stars < cost;
          const blocked = !dealt && (isDemo() || short || Boolean(run?.blocks) || tooLate);
          const stopsGuard = !blocked && starlight.guard_on && starlight.has_guard !== false && starlight.stars - cost < starlight.cost;
          const isArmed = armed === use;
          const lit = Boolean(told || dealt || chart || (run && run.text));
          return (
            <button
              key={use}
              type="button"
              disabled={blocked}
              onClick={() => {
                if (dealt) {
                  onGo?.();
                  return;
                }
                if (!isArmed) {
                  setArmed(use);
                  return;
                }
                setArmed(null);
                void onWish(use);
              }}
              className={`star-wish relative min-w-0 min-h-[124px] px-1.5 pt-2 pb-1.5 flex flex-col items-center gap-1 text-center border overflow-hidden ${
                blocked ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${isArmed ? 'star-wish-armed' : ''} ${blocked && !lit ? 'star-wish-off' : ''} ${lit ? 'star-wish-told' : ''}`}
            >
              {dealt && (
                <span
                  key={granted}
                  className="wish-countdown absolute left-0 bottom-0 h-0.5 w-full bg-amber-300"
                  style={{ animationDuration: `${grantMs}ms` }}
                  aria-hidden
                />
              )}
              {told && use === 'omen' && starlight.omen_id ? (
                <BuffIcon itemId={starlight.omen_id} className="star-omen-reveal w-8 h-8 shrink-0" />
              ) : (
                <svg viewBox="0 0 32 32" className="w-8 h-8 shrink-0" aria-hidden="true">
                  {WISH_ICONS[use]}
                </svg>
              )}
              {dealt ? (
                <>
                  <span className="text-[8px] tracking-wider uppercase leading-tight opacity-80">{t.wishGrantedTitle}</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase leading-tight">{t.wishGrantedGo}</span>
                </>
              ) : told ? (
                <>
                  <span className="text-[8px] tracking-wider uppercase leading-tight opacity-80">{t.starWishOmenNext}</span>
                  <span className="text-[11px] font-bold tracking-wider uppercase leading-tight">{told}</span>
                </>
              ) : chart ? (
                <>
                  <span className="text-[8px] tracking-wider uppercase leading-tight opacity-80">{t.wishStarchartNext}</span>
                  {chart.items.map((id) => (
                    <span key={id} className="w-full text-[9px] font-bold tracking-wider uppercase leading-tight truncate">
                      {pieceName(id)}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span className="text-[10px] font-semibold tracking-wider uppercase leading-tight">{t[text.name]}</span>
                  <span className="text-[9px] font-sans leading-tight opacity-70">{tooLate ? t.starWishOmenLate : t[text.line]}</span>
                  {run?.text && <span className="text-[9px] font-bold tracking-wider uppercase leading-tight text-amber-300">{run.text}</span>}
                </>
              )}
              {isCrate && crateLive && (
                <span className="text-[8px] tracking-wider uppercase tabular-nums leading-tight opacity-70">
                  {tf(t.starWishChangesIn, { t: formatLeft(turnsAt - now) })}
                </span>
              )}
              {stopsGuard && <span className="text-[9px] font-bold leading-tight text-amber-300">{t.starWishStopsGuard}</span>}
              <span className="mt-auto flex items-center justify-center gap-0.5 min-h-3">
                {dealt ? (
                  <span className="text-[9px] font-bold tracking-wider">{t.wishGrantedTap}</span>
                ) : isArmed ? (
                  <span className="text-[9px] font-bold tracking-wider">{t.starWishConfirm}</span>
                ) : (
                  <>
                    {Array.from({ length: cost }, (_, i) => <Glint key={i} className="w-2 h-2" />)}
                    {cost < base && <Glint className="w-2 h-2 opacity-25" />}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
