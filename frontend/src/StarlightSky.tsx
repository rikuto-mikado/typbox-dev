import React, { useEffect, useRef, useState } from 'react';
import { tf, useI18n } from './i18n';
import type { Starlight, StarWish } from './api';

// STARLIGHT drawn as a real night sky: each guard is one of the two seven-star
// dippers, lit star by star. The sky behind them is painted once onto a canvas
// from a fixed seed, so it looks the same on every visit. It is night in both
// themes, so its colors are fixed.

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
  /** The line that closes the figure's bowl, once all seven are lit. */
  closes: readonly [from: number, to: number];
}

// Laid out after the sky itself, with each star's real relative brightness.
const FIGURES: readonly Figure[] = [
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
      className="relative w-full overflow-hidden border border-slate-400/15 font-mono bg-[#02040b]"
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}`, maxHeight: 248 }}
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

        {FIGURES.map((figure, f) => {
          const offset = f * cost;
          const litHere = Math.max(0, Math.min(cost, stars - offset));
          const complete = litHere === cost;
          const line = figure.stars.slice(0, litHere).map((s) => `${s.x},${s.y}`).join(' ');
          const [from, to] = figure.closes;
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
              {complete && (
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
        <span className="tabular-nums tracking-widest text-slate-300/60">
          {stars} / {max}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-3 pb-2 text-[10px] uppercase tracking-widest pointer-events-none">
        <span className={guardOn ? 'text-[#f6dcae]' : 'text-slate-300/60'}>
          {guardOn ? tf(t.starlightGuardOn, { n: guards }) : tf(t.starlightGuardOff, { n: cost - stars })}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- wishes

/** A falling star, an eye of stars and a sun on the horizon: the three wishes. */
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
  dawn: (
    <>
      <path d="M8 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3 21 L29 21" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M16 6v4M6.5 10.5l2.8 2.8M25.5 10.5l-2.8 2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
};

const WISHES: Array<{ use: StarWish; name: 'starWishReroll' | 'starWishOmen' | 'starWishDawn'; line: 'starWishRerollLine' | 'starWishOmenLine' | 'starWishDawnLine' }> = [
  { use: 'reroll', name: 'starWishReroll', line: 'starWishRerollLine' },
  { use: 'omen', name: 'starWishOmen', line: 'starWishOmenLine' },
  { use: 'dawn', name: 'starWishDawn', line: 'starWishDawnLine' },
];

/** What stars can buy besides a save, on the same night as the sky above. Two
 *  taps each, like everything that spends. */
export const StarWishes: React.FC<{
  starlight: Starlight;
  coolingDown: boolean;
  onWish: (use: StarWish) => Promise<void>;
}> = ({ starlight, coolingDown, onWish }) => {
  const { t } = useI18n();
  const [armed, setArmed] = useState<StarWish | null>(null);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <div className="space-y-1.5 font-mono">
      <div className="text-[10px] uppercase tracking-[0.28em] text-amber-400/90">{t.starWishes}</div>
      <div className="grid grid-cols-3 gap-1">
        {WISHES.map(({ use, name, line }) => {
          const cost = starlight.uses?.[use] ?? 0;
          const told = use === 'omen' ? starlight.omen : null;
          const short = starlight.stars < cost;
          const dawnSpent = use === 'dawn' && Boolean(starlight.dawn_used) && coolingDown;
          const noCooldown = use === 'dawn' && !coolingDown;
          const blocked = short || Boolean(told) || noCooldown || dawnSpent;
          const isArmed = armed === use;
          return (
            <button
              key={use}
              type="button"
              disabled={blocked}
              onClick={() => {
                if (!isArmed) {
                  setArmed(use);
                  return;
                }
                setArmed(null);
                void onWish(use);
              }}
              className={`star-wish relative min-w-0 min-h-[116px] px-1.5 pt-2 pb-1.5 flex flex-col items-center gap-1 text-center border overflow-hidden ${
                blocked ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${isArmed ? 'star-wish-armed' : ''} ${blocked && !told ? 'star-wish-off' : ''}`}
            >
              <svg viewBox="0 0 32 32" className="w-8 h-8 shrink-0" aria-hidden="true">
                {WISH_ICONS[use]}
              </svg>
              <span className="text-[10px] font-semibold tracking-wider uppercase leading-tight">{name && t[name]}</span>
              <span className="text-[9px] font-sans leading-tight opacity-70">
                {told ?? (noCooldown ? t.starWishNeedCooldown : dawnSpent ? t.starWishDawnSpent : t[line])}
              </span>
              <span className="mt-auto flex items-center justify-center gap-0.5 min-h-3">
                {isArmed ? (
                  <span className="text-[9px] font-bold tracking-wider">{t.starWishConfirm}</span>
                ) : (
                  Array.from({ length: cost }, (_, i) => <Glint key={i} className="w-2 h-2" />)
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
