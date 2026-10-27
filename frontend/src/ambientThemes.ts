// Ambient Mode overlays: what drifts across the screen while the stopwatch
// runs unattended. Every theme is a variation on ORBITAL CLOCK (three
// planets on orbits for the real hour, minute and second) built on one
// orbital engine below. Each is a tiny canvas "scene" — a factory that owns
// its particle state and returns a per-frame draw function — so the whole
// catalog shares one renderer (AmbientOverlay.tsx) that caps the frame rate
// and pauses with the tab. Unlocks reuse the Chronometer Theme rule set.
import type { ChronoUnlock } from './chronometerThemes';

export interface AmbientTheme {
  id: string;
  code: string;
  name: string;
  desc: string;
  unlock: ChronoUnlock;
}

/** Draws one frame. `t` = seconds since start, `dt` = seconds since last frame. */
export type AmbientFrame = (ctx: CanvasRenderingContext2D, t: number, dt: number) => void;
type SceneFactory = (w: number, h: number) => AmbientFrame;

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
/** Particle count scaled to screen area, so phones and 4K both look right. */
const density = (w: number, h: number, perMegapixel: number, min: number, max: number) =>
  Math.round(Math.max(min, Math.min(max, ((w * h) / 1_000_000) * perMegapixel)));


// ==========================================
// Orbital engine
// ==========================================
// Every scene is a variation on ORBITAL CLOCK: three bodies riding
// concentric orbits for the real hour, minute and second, each trailing a
// progress arc from 12 o'clock. A spec swaps the palette, the orbit
// geometry (radii, perspective tilt) and how the rings, bodies and the
// atmosphere around them are drawn; the engine owns the clock math, the
// layout and the slow drift that keeps a long session from burning the
// same pixels into an OLED panel.

const TOP = -Math.PI / 2;

/** '#rrggbb' → rgba() at the given alpha. */
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
type Tint = (alpha: number) => string;
const hexTint = (hex: string): Tint => (a) => hexA(hex, a);

interface OrbitBody {
  /** 0 = hour, 1 = minute, 2 = second. */
  i: number;
  r: number;
  /** Progress through the hand's cycle, 0..1. */
  frac: number;
  /** Angle on the orbit, 0 = 12 o'clock at TOP. */
  a: number;
  x: number;
  y: number;
  color: string;
}

interface OrbitFrame {
  ctx: CanvasRenderingContext2D;
  t: number;
  dt: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** Radius unit: the hour orbit is `base` × radii[0]. */
  base: number;
  /** Vertical squash of every orbit (1 = seen face-on). */
  tilt: number;
  /** Body size unit that stays legible from a 192px thumbnail up to 4K. */
  px: number;
  now: Date;
  bodies: OrbitBody[];
}

interface OrbitSpec {
  colors: [string, string, string];
  radii?: [number, number, number];
  tilt?: number;
  /** Multiplier on the default layout size (tilted orbits can afford more width). */
  scale?: number;
  /** Where the orbit center sits, as fractions of the canvas. */
  anchor?: [number, number];
  back?: (f: OrbitFrame) => void;
  rings?: (f: OrbitFrame) => void;
  bodies?: (f: OrbitFrame) => void;
  front?: (f: OrbitFrame) => void;
}

function orbital(w: number, h: number, spec: OrbitSpec): AmbientFrame {
  const tilt = spec.tilt ?? 1;
  const radii = spec.radii ?? [1, 1.8, 2.6];
  // Same footprint as ORBITAL CLOCK, but never wider than the screen allows.
  const base = Math.min(Math.min(w, h) * 0.13 * (spec.scale ?? 1), (w * 0.44) / radii[2]);
  const px = Math.max(2, Math.min(4.5, base * 0.035));
  const [ax, ay] = spec.anchor ?? [0.5, 0.5];
  const drift = base * 0.22;
  const rings = spec.rings ?? ((f: OrbitFrame) => plainRings(f));
  const bodies = spec.bodies ?? ((f: OrbitFrame) => planets(f));
  return (ctx, t, dt) => {
    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    // Wall-clock drift, so the overlay and its preview sit in the same place.
    const wall = now.getTime() / 1000;
    const cx = w * ax + Math.sin(wall / 173) * drift;
    const cy = h * ay + Math.cos(wall / 241) * drift * tilt;
    const f: OrbitFrame = {
      ctx, t, dt, w, h, cx, cy, base, tilt, px, now,
      bodies: [hr / 12, min / 60, sec / 60].map((frac, i) => {
        const r = base * radii[i];
        const a = frac * TAU + TOP;
        return { i, r, frac, a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * tilt, color: spec.colors[i] };
      }),
    };
    spec.back?.(f);
    rings(f);
    bodies(f);
    spec.front?.(f);
  };
}

/** Point on an orbit of radius r at angle a. */
const onOrbit = (f: OrbitFrame, r: number, a: number): [number, number] => [f.cx + Math.cos(a) * r, f.cy + Math.sin(a) * r * f.tilt];

function orbitPath(f: OrbitFrame, r: number, from = 0, to = TAU) {
  f.ctx.beginPath();
  if (f.tilt === 1) f.ctx.arc(f.cx, f.cy, r, from, to);
  else f.ctx.ellipse(f.cx, f.cy, r, r * f.tilt, 0, from, to);
}

/** The ORBITAL CLOCK look: a faint full orbit plus a brighter progress arc. */
function plainRings(f: OrbitFrame, o: { ring?: number; arc?: number; width?: number } = {}) {
  const { ctx } = f;
  for (const b of f.bodies) {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = o.ring ?? 0.16;
    orbitPath(f, b.r);
    ctx.stroke();
    ctx.lineWidth = o.width ?? 2;
    ctx.globalAlpha = o.arc ?? 0.5;
    orbitPath(f, b.r, TOP, b.a);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/** Soft radial halo. */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tint: Tint, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, tint(0.5 * alpha));
  g.addColorStop(0.3, tint(0.16 * alpha));
  g.addColorStop(1, tint(0));
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.9) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Default bodies: a glowing planet per hand, the hour planet largest. */
function planets(f: OrbitFrame, halo = 6) {
  for (const b of f.bodies) {
    const s = f.px * (1.25 - b.i * 0.15);
    glow(f.ctx, b.x, b.y, s * halo, hexTint(b.color), 0.9);
    dot(f.ctx, b.x, b.y, s, b.color);
  }
}

/** Radial tick marks around an orbit (every `major`-th one is longer). */
function ticks(f: OrbitFrame, r: number, count: number, len: number, color: string, alpha: number, major = 0) {
  const { ctx } = f;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU + TOP;
    const l = major && k % major === 0 ? len * 2.2 : len;
    const [x0, y0] = onOrbit(f, r, a);
    const [x1, y1] = onOrbit(f, r + l, a);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();
}

interface Star { x: number; y: number; r: number; f: number; ph: number; a: number }
const makeStars = (w: number, h: number, perMegapixel: number, min: number, max: number): Star[] =>
  Array.from({ length: density(w, h, perMegapixel, min, max) }, () => ({
    x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.3), f: rnd(0.5, 2), ph: rnd(0, TAU), a: rnd(0.25, 0.8),
  }));
function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], t: number, gain = 1) {
  ctx.fillStyle = '#fff';
  for (const s of stars) {
    ctx.globalAlpha = gain * s.a * (0.55 + 0.45 * Math.sin(t * s.f + s.ph));
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
}

// Fires `fn` once per new wall-clock second (not on the very first frame).
function everySecond(fn: (sec: number) => void) {
  let last = -1;
  return (now: Date) => {
    const s = now.getSeconds();
    if (s !== last && last !== -1) fn(s);
    last = s;
  };
}

// ==========================================
// Scenes: ORBITAL CLOCK and its derivatives
// ==========================================

const accretion: SceneFactory = (w, h) => {
  const motes = Array.from({ length: density(w, h, 150, 60, 240) }, () => ({
    ring: Math.floor(Math.random() * 3), th: rnd(0, TAU), off: rnd(-1, 1), sp: rnd(0.02, 0.06), s: rnd(0.6, 1.6), a: rnd(0.15, 0.5),
  }));
  return orbital(w, h, {
    colors: ['#fcd34d', '#fdba74', '#e7e5e4'],
    back: (f) => {
      const { ctx } = f;
      for (const p of motes) {
        const b = f.bodies[p.ring];
        // Inner orbits turn faster, like a real disc.
        p.th += p.sp * (1.6 - p.ring * 0.45) * f.dt;
        const r = b.r + f.base * 0.17 * p.off * Math.abs(p.off);
        // Grains gather in the wake just behind each planet.
        const behind = (((b.a - p.th) % TAU) + TAU) % TAU;
        const [x, y] = onOrbit(f, r, p.th);
        dot(ctx, x, y, p.s, b.color, Math.min(0.85, p.a + 0.55 * Math.exp(-behind * 2.4)));
      }
    },
  });
};


// ------------------------------------------
// Shared refined pieces
// ------------------------------------------
// The redesigned scenes share one visual grammar with ORBITAL CLOCK,
// ACCRETION DISK and VECTOR SCOPE: hairline orbits, a progress arc that
// brightens toward its planet, small precise bodies with a soft halo, and
// one atmosphere per theme drawn with geometry (no emoji-like sprites, no
// faked perspective).

/** Progress arc that brightens toward the body, like light trailing it. */
function fadeArc(f: OrbitFrame, b: OrbitBody, color: string, width: number, alpha: number) {
  const span = b.frac * TAU;
  if (span < 0.01) return;
  const { ctx } = f;
  const segs = Math.max(4, Math.ceil(span / 0.08));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (let k = 0; k < segs; k++) {
    const p = (k + 1) / segs;
    ctx.globalAlpha = alpha * (0.14 + 0.86 * p * p);
    // A hair of overlap so segment joins never show as gaps.
    orbitPath(f, b.r, TOP + (span * k) / segs, TOP + (span * (k + 1)) / segs + 0.004);
    ctx.stroke();
  }
}

/** Hairline orbits plus fading progress arcs, in each body's color. */
function fineRings(f: OrbitFrame, o: { ring?: number; arc?: number; width?: number; ringColor?: string } = {}) {
  const { ctx } = f;
  for (const b of f.bodies) {
    ctx.strokeStyle = o.ringColor ?? b.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = o.ring ?? 0.13;
    orbitPath(f, b.r);
    ctx.stroke();
    fadeArc(f, b, b.color, o.width ?? 1.6, o.arc ?? 0.6);
  }
  ctx.lineWidth = 1;
}

/** A planet: soft halo, solid core and a pin-point highlight. */
function core(f: OrbitFrame, b: OrbitBody, o: { halo?: number; glowColor?: string; size?: number; alpha?: number } = {}) {
  const s = f.px * (o.size ?? 1.2 - b.i * 0.18);
  glow(f.ctx, b.x, b.y, s * (o.halo ?? 6), hexTint(o.glowColor ?? b.color), o.alpha ?? 0.9);
  dot(f.ctx, b.x, b.y, s, b.color, 0.95);
  dot(f.ctx, b.x - s * 0.25, b.y - s * 0.25, s * 0.38, '#ffffff', 0.55);
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ------------------------------------------
// Scenes
// ------------------------------------------

const rainOrbit: SceneFactory = (w, h) => {
  // Depth z drives length, speed, width and brightness together, so the
  // rain reads as layers rather than one flat sheet.
  const spawn = (init: boolean) => {
    const z = Math.random();
    return { x: rnd(-w * 0.1, w * 1.05), y: init ? rnd(-h, h) : rnd(-h * 0.3, -20), z, len: 8 + z * 24, v: 420 + z * 680, a: 0.025 + z * 0.1 };
  };
  const drops = Array.from({ length: density(w, h, 90, 40, 200) }, () => spawn(true));
  const splashes: Array<{ x: number; y: number; age: number; life: number; size: number; color: string }> = [];
  let frame: OrbitFrame | null = null;
  const tick = everySecond((s) => {
    if (!frame) return;
    const [, m, sec] = frame.bodies;
    splashes.push({ x: sec.x, y: sec.y, age: 0, life: 1.6, size: frame.base * 0.28, color: sec.color });
    if (s === 0) splashes.push({ x: m.x, y: m.y, age: 0, life: 2.6, size: frame.base * 0.5, color: m.color });
  });
  return orbital(w, h, {
    colors: ['#a5b4fc', '#7dd3fc', '#e0f2fe'],
    back: (f) => {
      const { ctx } = f;
      ctx.strokeStyle = '#c7dcff';
      ctx.lineCap = 'round';
      for (const d of drops) {
        d.y += d.v * f.dt;
        d.x += d.v * 0.07 * f.dt;
        if (d.y - d.len > h) Object.assign(d, spawn(false));
        ctx.globalAlpha = d.a;
        ctx.lineWidth = 0.5 + d.z * 0.7;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.07, d.y - d.len);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
    rings: (f) => fineRings(f, { ring: 0.12, arc: 0.55, width: 1.4 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 5.5 });
    },
    front: (f) => {
      frame = f;
      tick(f.now);
      const { ctx } = f;
      ctx.lineWidth = 1;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const sp = splashes[i];
        sp.age += f.dt;
        const k = sp.age / sp.life;
        if (k >= 1) { splashes.splice(i, 1); continue; }
        const ease = 1 - (1 - k) ** 3;
        ctx.strokeStyle = sp.color;
        for (const [scale, a] of [[1, 0.42], [0.62, 0.26], [0.32, 0.16]] as const) {
          ctx.globalAlpha = a * (1 - k) ** 1.4;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, Math.max(0.5, sp.size * ease * scale), 0, TAU);
          ctx.stroke();
        }
      }
    },
  });
};

const frost: SceneFactory = (w, h) => {
  const flakes = Array.from({ length: density(w, h, 70, 30, 150) }, () => {
    const z = Math.random();
    return { x: rnd(0, w), y: rnd(0, h), z, ph: rnd(0, TAU), v: 7 + z * 26, s: 0.5 + z * 1.9 };
  });
  return orbital(w, h, {
    colors: ['#c7d2fe', '#bae6fd', '#f0f9ff'],
    back: (f) => {
      const { ctx } = f;
      for (const p of flakes) {
        p.y += p.v * f.dt;
        p.x += Math.sin(f.t * 0.5 + p.ph) * (4 + p.z * 10) * f.dt;
        if (p.y > h + 6) { p.y = -6; p.x = rnd(0, w); }
        if (p.z > 0.82) glow(ctx, p.x, p.y, p.s * 4, hexTint('#e0f2fe'), 0.35);
        dot(ctx, p.x, p.y, p.s, '#f0f9ff', 0.18 + p.z * 0.45);
      }
    },
    rings: (f) => {
      fineRings(f, { ring: 0.13, arc: 0.6, width: 1.4 });
      // Precision frost scale on the outer orbit: 60 hairlines, every fifth longer.
      ticks(f, f.bodies[2].r + f.base * 0.06, 60, f.base * 0.03, '#e0f2fe', 0.2, 5);
    },
    bodies: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        core(f, b, { halo: 6 });
        // A hexagonal ice crystal around each planet, turning very slowly.
        const R = f.px * (3.4 - b.i * 0.6);
        const rot = f.t * 0.12 * (b.i % 2 ? -1 : 1);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = rot + (k / 6) * TAU;
          const x = b.x + Math.cos(a) * R;
          const y = b.y + Math.sin(a) * R;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.25;
        for (let k = 0; k < 6; k++) {
          const a = rot + (k / 6) * TAU;
          ctx.moveTo(b.x + Math.cos(a) * R, b.y + Math.sin(a) * R);
          ctx.lineTo(b.x + Math.cos(a) * R * 1.45, b.y + Math.sin(a) * R * 1.45);
        }
        ctx.stroke();
      }
    },
  });
};

const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/** Four-point star: two thin tapered diamonds. */
function starPoint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.12, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.12, y);
  ctx.closePath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x, y + r * 0.12);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y - r * 0.12);
  ctx.closePath();
  ctx.fill();
}

const starChart: SceneFactory = (w, h) => {
  const stars = makeStars(w, h, 120, 50, 260);
  const INK = '#d9c48f';
  return orbital(w, h, {
    colors: ['#f2d58a', '#e9e2cf', '#bcd4ff'],
    back: (f) => {
      const { ctx } = f;
      drawStars(ctx, stars, f.t, 0.55);
      const R = f.bodies[2].r + f.base * 0.34;
      // Hour-angle lines and the planisphere's graduated rim.
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + TOP;
        ctx.moveTo(f.cx + Math.cos(a) * f.bodies[0].r * 0.35, f.cy + Math.sin(a) * f.bodies[0].r * 0.35);
        ctx.lineTo(f.cx + Math.cos(a) * R, f.cy + Math.sin(a) * R);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(f.cx, f.cy, R, 0, TAU);
      ctx.stroke();
      ticks(f, R, 72, f.base * 0.03, INK, 0.22, 6);
      ctx.fillStyle = INK;
      ctx.globalAlpha = 0.4;
      ctx.font = `${Math.max(8, f.px * 2.4)}px Georgia, "Times New Roman", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + TOP;
        const rr = R + f.base * 0.16;
        ctx.fillText(ROMAN[k], f.cx + Math.cos(a) * rr, f.cy + Math.sin(a) * rr);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
    rings: (f) => {
      const { ctx } = f;
      ctx.setLineDash([2, 5]);
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.24;
        orbitPath(f, b.r);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const b of f.bodies) fadeArc(f, b, b.color, 1.3, 0.6);
    },
    bodies: (f) => {
      const { ctx } = f;
      // The three planets drawn as one constellation.
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      f.bodies.forEach((b, k) => (k === 0 ? ctx.moveTo(b.x, b.y) : ctx.lineTo(b.x, b.y)));
      ctx.stroke();
      for (const b of f.bodies) {
        glow(ctx, b.x, b.y, f.px * 5, hexTint(b.color), 0.7);
        starPoint(ctx, b.x, b.y, f.px * (3.6 - b.i * 0.6), b.color, 0.9);
        dot(ctx, b.x, b.y, f.px * 0.7, '#ffffff', 0.95);
      }
    },
  });
};

const fireflyOrbit: SceneFactory = (w, h) => {
  const flies = Array.from({ length: density(w, h, 40, 16, 70) }, () => ({
    x: rnd(0, w), y: rnd(0, h), ax: rnd(20, 60), ay: rnd(14, 40), f1: rnd(0.08, 0.22), f2: rnd(0.11, 0.3),
    p1: rnd(0, TAU), p2: rnd(0, TAU), fb: rnd(0.35, 0.9), pb: rnd(0, TAU), s: rnd(0.8, 1.6),
  }));
  return orbital(w, h, {
    colors: ['#facc15', '#bef264', '#fef9c3'],
    back: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of flies) {
        const x = p.x + Math.sin(f.t * p.f1 + p.p1) * p.ax + Math.sin(f.t * p.f2 * 1.7 + p.p2) * p.ax * 0.4;
        const y = p.y + Math.cos(f.t * p.f2 + p.p2) * p.ay + Math.sin(f.t * p.f1 * 1.3 + p.p1) * p.ay * 0.4;
        // Slow blink: mostly dark, a soft swell of light now and then.
        const on = Math.max(0, Math.sin(f.t * p.fb + p.pb)) ** 3;
        if (on < 0.02) continue;
        glow(ctx, x, y, f.px * 6 * p.s, hexTint('#d9f99d'), on * 0.7);
        dot(ctx, x, y, p.s * 0.9, '#f7fee7', on * 0.9);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => fineRings(f, { ring: 0.1, arc: 0.5, width: 1.4 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 6.5 + 1.5 * Math.sin(f.t * 1.1 + b.i * 2), glowColor: '#d9f99d' });
    },
  });
};

/** Glass sphere: faint body, bright rim and a curved specular highlight. */
function glassBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, hexA(color, 0));
  g.addColorStop(0.75, hexA(color, 0.06 * alpha));
  g.addColorStop(1, hexA(color, 0.24 * alpha));
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.5 * alpha;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(0.8, r * 0.11);
  ctx.globalAlpha = 0.6 * alpha;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, -2.55, -1.95);
  ctx.stroke();
  ctx.lineCap = 'butt';
  dot(ctx, x + r * 0.38, y + r * 0.42, Math.max(0.5, r * 0.06), '#ffffff', 0.25 * alpha);
}

const bubbleOrrery: SceneFactory = (w, h) => {
  const spawn = (init: boolean) => {
    const z = Math.random();
    return { x: rnd(0, w), y: init ? rnd(0, h) : h + 20, z, r: 2 + z * 9, v: 8 + z * 22, ph: rnd(0, TAU) };
  };
  const rising = Array.from({ length: density(w, h, 14, 6, 26) }, () => spawn(true));
  return orbital(w, h, {
    colors: ['#5eead4', '#67e8f9', '#e0f2fe'],
    back: (f) => {
      for (const p of rising) {
        p.y -= p.v * f.dt;
        p.x += Math.sin(f.t * 0.7 + p.ph) * 6 * f.dt;
        if (p.y < -20) Object.assign(p, spawn(false));
        glassBubble(f.ctx, p.x, p.y, p.r, '#a5f3fc', 0.35 + p.z * 0.4);
      }
    },
    rings: (f) => fineRings(f, { ring: 0.13, arc: 0.55, width: 1.4 }),
    bodies: (f) => {
      for (const b of f.bodies) {
        const r = f.px * (4.4 - b.i * 0.8);
        glow(f.ctx, b.x, b.y, r * 2.4, hexTint(b.color), 0.45);
        glassBubble(f.ctx, b.x, b.y, r, b.color, 1);
        dot(f.ctx, b.x, b.y, f.px * 0.55, b.color, 0.9);
      }
    },
  });
};

/** Cherry-blossom petal (notched tip), centered, pointing up, length s. */
function petalPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.5);
  ctx.bezierCurveTo(s * 0.55, s * 0.18, s * 0.42, -s * 0.42, s * 0.13, -s * 0.5);
  ctx.lineTo(0, -s * 0.36);
  ctx.lineTo(-s * 0.13, -s * 0.5);
  ctx.bezierCurveTo(-s * 0.42, -s * 0.42, -s * 0.55, s * 0.18, 0, s * 0.5);
  ctx.closePath();
}

const sakuraOrbit: SceneFactory = (w, h) => {
  const spawn = (init: boolean) => {
    const z = Math.random();
    return {
      x: rnd(-w * 0.1, w), y: init ? rnd(0, h) : -12, z, s: 3.5 + z * 6, vy: 14 + z * 26, vx: 6 + z * 14,
      rot: rnd(0, TAU), spin: rnd(-0.8, 0.8), flip: rnd(0.6, 1.6), ph: rnd(0, TAU),
    };
  };
  const petals = Array.from({ length: density(w, h, 26, 12, 48) }, () => spawn(true));
  const drawPetal = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, flip: number, color: string, alpha: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // Tumbling: the petal turns edge-on and back as it falls.
    ctx.scale(Math.max(0.15, Math.abs(flip)), 1);
    petalPath(ctx, s);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };
  return orbital(w, h, {
    colors: ['#f472b6', '#f9a8d4', '#fde2ec'],
    back: (f) => {
      for (const p of petals) {
        p.y += p.vy * f.dt;
        p.x += (p.vx + Math.sin(f.t * 0.9 + p.ph) * 12) * f.dt;
        p.rot += p.spin * f.dt;
        if (p.y > h + 14 || p.x > w + 14) Object.assign(p, spawn(false));
        drawPetal(f.ctx, p.x, p.y, p.s, p.rot, Math.cos(f.t * p.flip + p.ph), p.z > 0.5 ? '#fbcfe8' : '#f9a8d4', 0.25 + p.z * 0.45);
      }
    },
    rings: (f) => fineRings(f, { ring: 0.13, arc: 0.55, width: 1.4 }),
    bodies: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        const s = f.px * (2.6 - b.i * 0.45);
        glow(ctx, b.x, b.y, s * 4.5, hexTint('#f9a8d4'), 0.7);
        // Five-petal blossom, turning slowly.
        for (let k = 0; k < 5; k++) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(f.t * 0.15 + (k / 5) * TAU);
          ctx.translate(0, -s * 0.55);
          petalPath(ctx, s);
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = k % 2 ? '#fce7f3' : '#fbcfe8';
          ctx.fill();
          ctx.restore();
        }
        dot(ctx, b.x, b.y, s * 0.22, '#db2777', 0.9);
      }
    },
  });
};

const emberOrbit: SceneFactory = (w, h) => {
  const sparks: Array<{ x: number; y: number; vx: number; vy: number; age: number; life: number; ph: number }> = [];
  const rates = [2.5, 3.5, 5];
  const acc = [0, 0, 0];
  const heat = (k: number): string => (k < 0.25 ? '#fef3c7' : k < 0.55 ? '#fdba74' : '#f97316');
  // Loose embers drifting up across the whole screen, far from the fire.
  const spawnDrift = (init: boolean) => ({ x: rnd(0, w), y: init ? rnd(0, h) : h + 10, v: rnd(10, 26), ph: rnd(0, TAU), s: rnd(0.6, 1.4) });
  const drift = Array.from({ length: density(w, h, 22, 10, 40) }, () => spawnDrift(true));
  return orbital(w, h, {
    colors: ['#fb923c', '#f97316', '#fde68a'],
    back: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of drift) {
        p.y -= p.v * f.dt;
        p.x += Math.sin(f.t * 0.8 + p.ph) * 10 * f.dt;
        if (p.y < -10) Object.assign(p, spawnDrift(false));
        const on = 0.5 + 0.5 * Math.sin(f.t * 2.2 + p.ph);
        glow(ctx, p.x, p.y, p.s * 5, hexTint('#f97316'), 0.35 * on);
        dot(ctx, p.x, p.y, p.s * 0.7, '#fed7aa', 0.3 + 0.4 * on);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => fineRings(f, { ring: 0.14, arc: 0.6, width: 1.5, ringColor: '#c2410c' }),
    bodies: (f) => {
      for (const b of f.bodies) {
        acc[b.i] += rates[b.i] * f.dt;
        while (acc[b.i] >= 1) {
          acc[b.i] -= 1;
          sparks.push({ x: b.x, y: b.y, vx: rnd(-14, 14), vy: rnd(-34, -14), age: 0, life: rnd(1.1, 2.2), ph: rnd(0, TAU) });
        }
        const flicker = 0.85 + 0.15 * Math.sin(f.t * 9 + b.i * 2) * Math.sin(f.t * 3.3 + b.i);
        glow(f.ctx, b.x, b.y, f.px * 7.5, hexTint('#f97316'), flicker);
        dot(f.ctx, b.x, b.y, f.px * (1.25 - b.i * 0.18), '#fdba74', 0.95);
        dot(f.ctx, b.x, b.y, f.px * (0.6 - b.i * 0.08), '#fff7ed', 1);
      }
    },
    front: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.age += f.dt;
        const k = p.age / p.life;
        if (k >= 1) { sparks.splice(i, 1); continue; }
        p.vy -= 10 * f.dt;
        p.vx += Math.sin(f.t * 2.3 + p.ph) * 18 * f.dt;
        p.x += p.vx * f.dt;
        p.y += p.vy * f.dt;
        ctx.strokeStyle = heat(k);
        ctx.globalAlpha = 0.85 * (1 - k);
        ctx.lineWidth = 1.3 * (1 - k) + 0.3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'source-over';
    },
  });
};

const HEX = '0123456789ABCDEF';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const glyphOrbit: SceneFactory = (w, h) => {
  // Each orbit is a ring of hex digits; the stretch the hand has covered is
  // lit, brightest just behind the planet. A few digits re-roll each second.
  let ringChars: string[][] | null = null;
  const cols = Array.from({ length: density(w, h, 26, 10, 46) }, () => ({
    x: rnd(0, w), y: rnd(-h, h), v: rnd(22, 60), n: Math.floor(rnd(5, 14)), chars: Array.from({ length: 14 }, () => pick([...HEX])),
  }));
  return orbital(w, h, {
    colors: ['#6ee7b7', '#34d399', '#d1fae5'],
    back: (f) => {
      const { ctx } = f;
      const fs = Math.max(8, f.px * 2.4);
      ctx.font = `${fs}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#34d399';
      for (const c of cols) {
        c.y += c.v * f.dt;
        if (c.y - c.n * fs > h) { c.y = rnd(-h * 0.4, 0); c.x = rnd(0, w); }
        if (Math.random() < f.dt * 2) c.chars[Math.floor(Math.random() * c.chars.length)] = pick([...HEX]);
        for (let k = 0; k < c.n; k++) {
          ctx.globalAlpha = 0.09 * (1 - k / c.n);
          ctx.fillText(c.chars[k], c.x, c.y - k * fs * 1.1);
        }
      }
    },
    rings: (f) => {
      const { ctx } = f;
      const fs = Math.max(8, f.px * 2.5);
      const step = fs * 1.05;
      if (!ringChars) ringChars = f.bodies.map((b) => Array.from({ length: Math.max(12, Math.floor((TAU * b.r) / step)) }, () => pick([...HEX])));
      ctx.font = `${fs}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      f.bodies.forEach((b, i) => {
        const chars = ringChars![i];
        const n = chars.length;
        if (Math.random() < f.dt * 3) chars[Math.floor(Math.random() * n)] = pick([...HEX]);
        for (let k = 0; k < n; k++) {
          const p = k / n;
          const a = p * TAU + TOP;
          const [x, y] = onOrbit(f, b.r, a);
          const lit = p <= b.frac;
          const behind = (b.frac - p) * n;
          ctx.fillStyle = lit && behind < 1 ? '#ffffff' : b.color;
          ctx.globalAlpha = lit ? 0.2 + 0.6 * Math.exp(-behind / 6) : 0.07;
          ctx.fillText(chars[k], x, y);
        }
      });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
    bodies: (f) => {
      for (const b of f.bodies) {
        const s = f.px * (2 - b.i * 0.3);
        glow(f.ctx, b.x, b.y, s * 5, hexTint(b.color), 0.8);
        f.ctx.globalAlpha = 0.95;
        f.ctx.fillStyle = b.color;
        f.ctx.fillRect(b.x - s / 2, b.y - s * 0.7, s, s * 1.4);
      }
    },
  });
};

const constellationOrbit: SceneFactory = (w, h) => {
  const nodes = Array.from({ length: density(w, h, 55, 26, 100) }, () => ({
    x: rnd(0, w), y: rnd(0, h), vx: rnd(-5, 5), vy: rnd(-5, 5), r: rnd(0.6, 1.4), ph: rnd(0, TAU),
  }));
  return orbital(w, h, {
    colors: ['#c4b5fd', '#a5b4fc', '#e0e7ff'],
    back: (f) => {
      const { ctx } = f;
      const L = Math.min(w, h) * 0.21;
      for (const n of nodes) {
        n.x += n.vx * f.dt;
        n.y += n.vy * f.dt;
        if (n.x < -10) n.x = w + 10;
        if (n.x > w + 10) n.x = -10;
        if (n.y < -10) n.y = h + 10;
        if (n.y > h + 10) n.y = -10;
      }
      const pts = [...nodes.map((n) => [n.x, n.y] as const), ...f.bodies.map((b) => [b.x, b.y] as const)];
      ctx.strokeStyle = '#c7d2fe';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
          const lim = i >= nodes.length || j >= nodes.length ? L * 1.3 : L;
          if (d > lim) continue;
          ctx.globalAlpha = 0.3 * (1 - d / lim) ** 1.3;
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
      for (const n of nodes) dot(ctx, n.x, n.y, n.r, '#e0e7ff', 0.35 + 0.25 * Math.sin(f.t * 0.8 + n.ph));
    },
    rings: (f) => fineRings(f, { ring: 0.11, arc: 0.55, width: 1.3 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 6 });
    },
  });
};

/** One aurora curtain: thin vertical rays with a bright lower hem. */
function curtain(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  o: { color: string; top: number; drift: number; seed: number; alpha: number }
) {
  const g = ctx.createLinearGradient(0, 0, 0, 1);
  g.addColorStop(0, hexA(o.color, 0));
  g.addColorStop(0.75, hexA(o.color, 0.55));
  g.addColorStop(0.92, hexA(o.color, 1));
  g.addColorStop(1, hexA(o.color, 0));
  ctx.fillStyle = g;
  const step = 2;
  for (let x = 0; x < w; x += step) {
    const u = x + o.seed;
    const hem = h * o.top + Math.sin(u * 0.0032 + t * o.drift) * h * 0.06 + Math.sin(u * 0.009 - t * o.drift * 1.6) * h * 0.022;
    const len = h * (0.16 + 0.12 * (0.5 + 0.5 * Math.sin(u * 0.006 + t * 0.09)));
    const rays = (0.5 + 0.5 * Math.sin(u * 0.05 + t * 0.35 + Math.sin(u * 0.004) * 4)) ** 3;
    const fade = Math.sin((x / w) * Math.PI) ** 0.6;
    ctx.globalAlpha = o.alpha * (0.3 + 1.1 * rays) * fade;
    ctx.save();
    ctx.translate(x, hem - len);
    ctx.scale(1, len);
    ctx.fillRect(0, 0, step, 1);
    ctx.restore();
  }
}

const auroraOrbit: SceneFactory = (w, h) => {
  const stars = makeStars(w, h, 60, 25, 120);
  return orbital(w, h, {
    colors: ['#5eead4', '#a7f3d0', '#ddd6fe'],
    back: (f) => {
      const { ctx } = f;
      drawStars(ctx, stars, f.t, 0.45);
      ctx.globalCompositeOperation = 'lighter';
      curtain(ctx, w, h, f.t, { color: '#34d399', top: 0.42, drift: 0.07, seed: 0, alpha: 0.16 });
      curtain(ctx, w, h, f.t, { color: '#8b5cf6', top: 0.3, drift: 0.05, seed: 900, alpha: 0.1 });
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => fineRings(f, { ring: 0.13, arc: 0.6, width: 1.5 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 6 });
    },
  });
};

const rippleClock: SceneFactory = (w, h) => {
  const rings: Array<{ x: number; y: number; age: number; life: number; max: number; color: string }> = [];
  const every = [3.6, 2.2, 1.1];
  const life = [7, 5, 3.2];
  const acc = [0, 0, 0];
  return orbital(w, h, {
    colors: ['#93c5fd', '#67e8f9', '#e0f2fe'],
    back: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        acc[b.i] += f.dt;
        if (acc[b.i] >= every[b.i]) {
          acc[b.i] = 0;
          rings.push({ x: b.x, y: b.y, age: 0, life: life[b.i], max: f.base * (1 - b.i * 0.22), color: b.color });
        }
      }
      ctx.lineWidth = 1;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.age += f.dt;
        const k = r.age / r.life;
        if (k >= 1) { rings.splice(i, 1); continue; }
        ctx.strokeStyle = r.color;
        // A leading ring and two softer followers, like a real ripple train.
        for (const [lag, a] of [[0, 0.38], [0.12, 0.2], [0.24, 0.1]] as const) {
          const kk = k - lag;
          if (kk <= 0) continue;
          ctx.globalAlpha = a * (1 - kk) ** 1.6;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.max * (1 - (1 - kk) ** 2), 0, TAU);
          ctx.stroke();
        }
      }
    },
    rings: (f) => fineRings(f, { ring: 0.12, arc: 0.55, width: 1.4 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 5 });
    },
  });
};

const synthwaveOrbit: SceneFactory = (w, h) => {
  // Flat retro poster: a banded sunset disc behind the dial and neon
  // orbits, all face-on (no perspective grid).
  const stars = makeStars(w, h, 50, 20, 100);
  return orbital(w, h, {
    colors: ['#f472b6', '#22d3ee', '#fde047'],
    back: (f) => {
      const { ctx, cx, cy } = f;
      drawStars(ctx, stars, f.t, 0.4);
      const R = f.bodies[0].r * 0.72;
      glow(ctx, cx, cy, R * 2.6, hexTint('#f472b6'), 0.35);
      const g = ctx.createLinearGradient(0, cy - R, 0, cy + R);
      g.addColorStop(0, '#fde68a');
      g.addColorStop(0.45, '#fb7185');
      g.addColorStop(1, '#a21caf');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.clip();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = g;
      // Solid top half, then bands that thin out toward the bottom.
      ctx.fillRect(cx - R, cy - R, R * 2, R * 1.05);
      let y = cy + R * 0.05;
      let band = R * 0.11;
      let gap = R * 0.025;
      while (y < cy + R) {
        ctx.fillRect(cx - R, y + gap, R * 2, Math.max(0.5, band));
        y += gap + band;
        gap *= 1.35;
        band *= 0.78;
      }
      ctx.restore();
    },
    rings: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.18;
        orbitPath(f, b.r);
        ctx.stroke();
        // Neon tube: a wide soft stroke under the crisp arc.
        fadeArc(f, b, b.color, 6, 0.12);
        fadeArc(f, b, b.color, 1.6, 0.9);
      }
    },
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 7 });
    },
  });
};

const cometClock: SceneFactory = (w, h) => {
  const stars = makeStars(w, h, 90, 40, 180);
  return orbital(w, h, {
    colors: ['#fde68a', '#a5f3fc', '#e0e7ff'],
    back: (f) => drawStars(f.ctx, stars, f.t, 0.6),
    rings: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.1;
        orbitPath(f, b.r);
        ctx.stroke();
      }
    },
    bodies: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of f.bodies) {
        // Dust tail: a tapered ribbon laid along the orbit behind the head.
        const span = Math.min(1.6, (f.base * 1.3) / b.r);
        const steps = 22;
        const W0 = f.px * (2.2 - b.i * 0.35);
        for (let k = 0; k < steps; k++) {
          const k0 = k / steps;
          const k1 = (k + 1) / steps;
          const a0 = b.a - span * k0;
          const a1 = b.a - span * k1;
          const w0 = W0 * (1 - k0) ** 1.3;
          const w1 = W0 * (1 - k1) ** 1.3;
          const [x0o, y0o] = onOrbit(f, b.r + w0, a0);
          const [x0i, y0i] = onOrbit(f, b.r - w0, a0);
          const [x1o, y1o] = onOrbit(f, b.r + w1, a1);
          const [x1i, y1i] = onOrbit(f, b.r - w1, a1);
          ctx.globalAlpha = 0.5 * (1 - k0) ** 2;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.moveTo(x0o, y0o);
          ctx.lineTo(x1o, y1o);
          ctx.lineTo(x1i, y1i);
          ctx.lineTo(x0i, y0i);
          ctx.closePath();
          ctx.fill();
        }
        // Ion tail: a straight, faint streak pointing away from the center.
        const dx = b.x - f.cx;
        const dy = b.y - f.cy;
        const d = Math.hypot(dx, dy) || 1;
        const L = f.base * 0.7;
        const g = ctx.createLinearGradient(b.x, b.y, b.x + (dx / d) * L, b.y + (dy / d) * L);
        g.addColorStop(0, hexA('#bfdbfe', 0.35));
        g.addColorStop(1, hexA('#bfdbfe', 0));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + (dx / d) * L, b.y + (dy / d) * L);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const b of f.bodies) core(f, b, { halo: 5, size: 1.1 - b.i * 0.15 });
    },
  });
};

const lavaOrbit: SceneFactory = (w, h) => {
  const blobs = Array.from({ length: 9 }, (_, i) => ({
    ring: i % 3, th: rnd(0, TAU), sp: rnd(0.03, 0.08) * (i % 2 ? 1 : -1), ph: rnd(0, TAU), s: rnd(0.32, 0.55),
    color: pick(['#f43f5e', '#f97316', '#d946ef', '#fb7185']),
  }));
  return orbital(w, h, {
    colors: ['#fb7185', '#fb923c', '#fde68a'],
    back: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of blobs) {
        p.th += p.sp * f.dt;
        const b = f.bodies[p.ring];
        const r = b.r + Math.sin(f.t * 0.2 + p.ph) * f.base * 0.25;
        const [x, y] = onOrbit(f, r, p.th);
        const R = f.base * p.s * (0.85 + 0.15 * Math.sin(f.t * 0.35 + p.ph));
        glow(ctx, x, y, R, hexTint(p.color), 0.5);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => fineRings(f, { ring: 0.12, arc: 0.55, width: 1.5 }),
    bodies: (f) => {
      f.ctx.globalCompositeOperation = 'lighter';
      for (const b of f.bodies) glow(f.ctx, b.x, b.y, f.base * 0.3, hexTint(b.color), 0.6);
      f.ctx.globalCompositeOperation = 'source-over';
      for (const b of f.bodies) core(f, b, { halo: 4 });
    },
  });
};

/** Almond leaf with a center vein, centered, pointing up, length s. */
function leafShape(ctx: CanvasRenderingContext2D, s: number, color: string, alpha: number) {
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.36, -s * 0.3, s * 0.3, s * 0.25, 0, s * 0.5);
  ctx.bezierCurveTo(-s * 0.3, s * 0.25, -s * 0.36, -s * 0.3, 0, -s * 0.5);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#451a03';
  ctx.globalAlpha = alpha * 0.45;
  ctx.lineWidth = Math.max(0.5, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.4);
  ctx.lineTo(0, s * 0.62);
  ctx.stroke();
}

const autumnOrbit: SceneFactory = (w, h) => {
  const COLORS = ['#d97706', '#b45309', '#ea580c', '#ca8a04', '#c2410c'];
  const spawn = (init: boolean) => {
    const z = Math.random();
    return {
      x: rnd(0, w), y: init ? rnd(0, h) : -14, z, s: 7 + z * 10, vy: 16 + z * 26, ph: rnd(0, TAU),
      rock: rnd(0.8, 1.5), flip: rnd(0.4, 1.1), base: rnd(-0.6, 0.6), color: pick(COLORS),
    };
  };
  const leaves = Array.from({ length: density(w, h, 18, 8, 34) }, () => spawn(true));
  return orbital(w, h, {
    colors: ['#f59e0b', '#ea580c', '#fde68a'],
    back: (f) => {
      const { ctx } = f;
      for (const p of leaves) {
        p.y += p.vy * f.dt;
        p.x += Math.sin(f.t * 0.7 + p.ph) * 22 * f.dt;
        if (p.y > h + 16) Object.assign(p, spawn(false));
        ctx.save();
        ctx.translate(p.x, p.y);
        // Rocking like a falling leaf, not spinning like a propeller.
        ctx.rotate(p.base + Math.sin(f.t * p.rock + p.ph) * 0.8);
        ctx.scale(Math.max(0.25, Math.abs(Math.cos(f.t * p.flip + p.ph))), 1);
        leafShape(ctx, p.s, p.color, 0.3 + p.z * 0.4);
        ctx.restore();
      }
    },
    rings: (f) => fineRings(f, { ring: 0.13, arc: 0.55, width: 1.5 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 6 });
    },
  });
};

const warpOrbit: SceneFactory = (w, h) => {
  const SPEED = 0.16;
  const spawn = (init: boolean) => ({ x: rnd(-1, 1), y: rnd(-1, 1), z: init ? rnd(0.05, 1) : 1 });
  const stars = Array.from({ length: density(w, h, 110, 60, 220) }, () => spawn(true));
  return orbital(w, h, {
    colors: ['#c7d2fe', '#a5b4fc', '#e0f2fe'],
    back: (f) => {
      const { ctx } = f;
      const k = Math.max(w, h) * 0.5;
      ctx.strokeStyle = '#dbeafe';
      ctx.lineCap = 'round';
      for (const s of stars) {
        const z0 = s.z;
        s.z -= SPEED * f.dt;
        if (s.z <= 0.03) { Object.assign(s, spawn(false)); continue; }
        const x1 = f.cx + (s.x / s.z) * k;
        const y1 = f.cy + (s.y / s.z) * k;
        if (x1 < -20 || x1 > w + 20 || y1 < -20 || y1 > h + 20) { Object.assign(s, spawn(false)); continue; }
        // Streak length grows as the star nears, from the last few frames.
        const zt = Math.min(1, z0 + SPEED * 0.25);
        const x0 = f.cx + (s.x / zt) * k;
        const y0 = f.cy + (s.y / zt) * k;
        const near = 1 - s.z;
        ctx.globalAlpha = 0.08 + near * 0.5;
        ctx.lineWidth = 0.4 + near * 1.1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
    rings: (f) => fineRings(f, { ring: 0.14, arc: 0.6, width: 1.5 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 6 });
    },
  });
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Paper lantern: warm glow, translucent body, dark caps. */
function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number, flicker: number) {
  glow(ctx, x, y, s * 2.6, hexTint('#f59e0b'), 0.55 * alpha * flicker);
  const bw = s * 0.72;
  roundedRect(ctx, x - bw / 2, y - s / 2, bw, s, bw * 0.38);
  const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.6);
  g.addColorStop(0, hexA('#fef3c7', 0.95 * alpha * flicker));
  g.addColorStop(1, hexA('#ea580c', 0.75 * alpha));
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 0.7 * alpha;
  ctx.fillStyle = '#431407';
  ctx.fillRect(x - bw * 0.3, y - s / 2 - s * 0.06, bw * 0.6, s * 0.08);
  ctx.fillRect(x - bw * 0.3, y + s / 2 - s * 0.02, bw * 0.6, s * 0.08);
}

const lanternOrbit: SceneFactory = (w, h) => {
  const spawn = (init: boolean) => {
    const z = Math.random();
    return { x: rnd(0, w), y: init ? rnd(0, h) : h + 30, z, s: 8 + z * 15, v: 5 + z * 13, ph: rnd(0, TAU) };
  };
  const lanterns = Array.from({ length: density(w, h, 9, 5, 16) }, () => spawn(true)).sort((a, b) => a.z - b.z);
  return orbital(w, h, {
    colors: ['#fbbf24', '#fb923c', '#fde68a'],
    back: (f) => {
      for (const p of lanterns) {
        p.y -= p.v * f.dt;
        p.x += Math.sin(f.t * 0.35 + p.ph) * 4 * f.dt;
        if (p.y < -40) Object.assign(p, spawn(false));
        const flicker = 0.88 + 0.12 * Math.sin(f.t * 5 + p.ph) * Math.sin(f.t * 1.7 + p.ph);
        lantern(f.ctx, p.x, p.y, p.s, 0.35 + p.z * 0.5, flicker);
      }
    },
    rings: (f) => fineRings(f, { ring: 0.13, arc: 0.55, width: 1.5 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 7, glowColor: '#f59e0b' });
    },
  });
};

const galacticOrbit: SceneFactory = (w, h) => {
  // Face-on two-armed spiral; points keep their place on the arms and the
  // whole disc turns slowly as one.
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const inner = [253, 230, 138];
  const outer = [165, 180, 252];
  const tone = (u: number) => `rgb(${inner.map((v, i) => Math.round(lerp(v, outer[i], u))).join(',')})`;
  const stars = Array.from({ length: density(w, h, 900, 700, 1600) }, () => {
    const u = Math.random() ** 0.75;
    // A quarter of the points are disc haze; the rest sit tightly on the arms.
    const haze = Math.random() < 0.25;
    const arm = Math.random() < 0.5 ? 0 : Math.PI;
    const th = haze ? rnd(0, TAU) : arm + u * 2.4 * Math.PI + gauss() * 0.22;
    return { u, th, dr: gauss() * (haze ? 0.08 : 0.025), s: rnd(0.7, 1.6), a: haze ? rnd(0.12, 0.35) : rnd(0.35, 0.9), color: tone(u) };
  });
  return orbital(w, h, {
    colors: ['#fde68a', '#c4b5fd', '#bfdbfe'],
    back: (f) => {
      const { ctx } = f;
      const R = f.bodies[2].r * 1.4;
      const spin = f.t * 0.012;
      glow(ctx, f.cx, f.cy, R * 0.35, hexTint('#fde68a'), 0.55);
      ctx.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        const r = R * (0.06 + 0.94 * s.u + s.dr);
        const a = s.th + spin;
        ctx.globalAlpha = s.a * (1 - s.u * 0.55);
        ctx.fillStyle = s.color;
        ctx.fillRect(f.cx + Math.cos(a) * r, f.cy + Math.sin(a) * r, s.s, s.s);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => fineRings(f, { ring: 0.14, arc: 0.6, width: 1.5 }),
    bodies: (f) => {
      for (const b of f.bodies) core(f, b, { halo: 6 });
    },
  });
};

const CODE_LINES = [
  'const focus = await session.start();',
  'for (const minute of hour) commit(minute);',
  'if (streak > best) best = streak;',
  'while (studying) knowledge++;',
  'export function deepWork(hours) {',
  'return notes.filter((n) => n.reviewed);',
  'let progress = elapsed / target;',
  'queue.push({ topic, minutes: 25 });',
  'try { learn(next) } finally { rest() }',
];

const codeOrbit: SceneFactory = (w, h) => {
  // Each orbit is a line of code wrapped around the dial and typed out as
  // the hand advances; a caret blinks at the planet.
  let texts: string[] | null = null;
  return orbital(w, h, {
    colors: ['#c4b5fd', '#93c5fd', '#86efac'],
    rings: (f) => {
      const { ctx } = f;
      const fs = Math.max(8, f.px * 2.5);
      const step = fs * 0.66;
      if (!texts) {
        texts = f.bodies.map((b, i) => {
          const n = Math.max(16, Math.floor((TAU * b.r) / step));
          let s = '';
          let k = i * 3;
          while (s.length < n) s += `${CODE_LINES[k++ % CODE_LINES.length]}  `;
          return s.slice(0, n);
        });
      }
      ctx.font = `${fs}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      f.bodies.forEach((b, i) => {
        const text = texts![i];
        const n = text.length;
        for (let k = 0; k < n; k++) {
          const ch = text[k];
          if (ch === ' ') continue;
          const p = k / n;
          const a = p * TAU + TOP;
          const [x, y] = onOrbit(f, b.r, a);
          const typed = p <= b.frac;
          const behind = (b.frac - p) * n;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = b.color;
          ctx.globalAlpha = typed ? 0.3 + 0.55 * Math.exp(-behind / 10) : 0.06;
          ctx.fillText(ch, 0, 0);
          ctx.restore();
        }
      });
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
    bodies: (f) => {
      const { ctx } = f;
      const on = Math.floor(f.t * 1.6) % 2 === 0;
      for (const b of f.bodies) {
        glow(ctx, b.x, b.y, f.px * 5, hexTint(b.color), 0.6);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a + Math.PI / 2);
        ctx.globalAlpha = on ? 0.95 : 0.35;
        ctx.fillStyle = b.color;
        const s = f.px * 2.4;
        ctx.fillRect(-s * 0.3, -s * 0.6, s * 0.6, s * 1.2);
        ctx.restore();
      }
    },
  });
};

const prismOrbit: SceneFactory = (w, h) => {
  const SPECTRUM = ['#ff4d6d', '#ff9f43', '#ffd93d', '#6bff95', '#4dd4ff', '#6c7bff', '#c06bff'];
  return orbital(w, h, {
    colors: ['#ffffff', '#ffffff', '#ffffff'],
    rings: (f) => {
      const { ctx } = f;
      const segs = 96;
      for (const b of f.bodies) {
        for (let k = 0; k < segs; k++) {
          const p0 = k / segs;
          const hue = (p0 * 360 + f.t * 6 + b.i * 50) % 360;
          const lit = p0 < b.frac;
          ctx.strokeStyle = `hsl(${hue} 85% 72%)`;
          ctx.lineWidth = lit ? 1.6 : 1;
          ctx.globalAlpha = lit ? 0.25 + 0.55 * ((p0 / Math.max(b.frac, 0.001)) ** 2) : 0.1;
          orbitPath(f, b.r, TOP + p0 * TAU, TOP + (p0 + 1 / segs) * TAU + 0.004);
          ctx.stroke();
        }
      }
    },
    bodies: (f) => {
      const { ctx } = f;
      // White light from the center, split into a spectrum by the seconds planet.
      const s = f.bodies[2];
      const dx = s.x - f.cx;
      const dy = s.y - f.cy;
      const g = ctx.createLinearGradient(f.cx, f.cy, s.x, s.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.22)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f.cx, f.cy);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      const base = Math.atan2(dy, dx);
      const L = f.base * 0.9;
      SPECTRUM.forEach((c, k) => {
        const a = base + (k - 3) * 0.06;
        const lg = ctx.createLinearGradient(s.x, s.y, s.x + Math.cos(a) * L, s.y + Math.sin(a) * L);
        lg.addColorStop(0, hexA(c, 0.6));
        lg.addColorStop(1, hexA(c, 0));
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(a) * L, s.y + Math.sin(a) * L);
        ctx.stroke();
      });
      // Slight chromatic fringe on every planet.
      for (const b of f.bodies) {
        const off = f.px * 0.45;
        glow(ctx, b.x - off, b.y, f.px * 4.5, hexTint('#ff4d6d'), 0.35);
        glow(ctx, b.x, b.y + off * 0.6, f.px * 4.5, hexTint('#6bff95'), 0.35);
        glow(ctx, b.x + off, b.y, f.px * 4.5, hexTint('#4d7cff'), 0.35);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const b of f.bodies) dot(ctx, b.x, b.y, f.px * (1.1 - b.i * 0.15), '#ffffff', 0.95);
    },
  });
};

const vectorScope: SceneFactory = (w, h) => {
  const PH = '#4ade80';
  return orbital(w, h, {
    colors: [PH, PH, '#86efac'],
    rings: (f) => {
      const { ctx } = f;
      const flicker = 0.92 + 0.08 * Math.sin(f.t * 47) * Math.sin(f.t * 3.1);
      ctx.strokeStyle = PH;
      ctx.lineWidth = 1;
      for (const b of f.bodies) {
        ctx.globalAlpha = 0.22 * flicker;
        orbitPath(f, b.r);
        ctx.stroke();
      }
      ticks(f, f.bodies[2].r, 60, f.base * 0.05, PH, 0.35 * flicker, 5);
      ticks(f, f.bodies[1].r, 12, f.base * 0.07, PH, 0.3 * flicker);
      // Crosshair through the center, like a scope graticule.
      const R = f.bodies[2].r + f.base * 0.2;
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(f.cx - R, f.cy);
      ctx.lineTo(f.cx + R, f.cy);
      ctx.moveTo(f.cx, f.cy - R);
      ctx.lineTo(f.cx, f.cy + R);
      ctx.stroke();
      // Radar sweep: a phosphor wedge fading behind the seconds hand.
      const sb = f.bodies[2];
      const steps = 30;
      const span = 1.1;
      for (let k = 0; k < steps; k++) {
        ctx.globalAlpha = 0.2 * (1 - k / steps) ** 2 * flicker;
        ctx.fillStyle = PH;
        ctx.beginPath();
        ctx.moveTo(f.cx, f.cy);
        ctx.arc(f.cx, f.cy, sb.r, sb.a - (span * (k + 1)) / steps, sb.a - (span * k) / steps);
        ctx.closePath();
        ctx.fill();
      }
    },
    bodies: (f) => {
      const { ctx } = f;
      ctx.strokeStyle = PH;
      ctx.lineCap = 'round';
      for (const b of f.bodies) {
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2.6 - b.i * 0.8;
        ctx.beginPath();
        ctx.moveTo(f.cx, f.cy);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        glow(ctx, b.x, b.y, f.px * 5, hexTint('#86efac'), 1);
        dot(ctx, b.x, b.y, f.px * (1.2 - b.i * 0.2), '#dcfce7');
      }
      ctx.lineCap = 'butt';
      dot(ctx, f.cx, f.cy, f.px * 0.9, PH, 0.8);
    },
    front: (f) => {
      const { ctx } = f;
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.16;
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      const bandY = ((f.t * 0.12) % 1.2) * h - h * 0.1;
      const g = ctx.createLinearGradient(0, bandY - 60, 0, bandY + 60);
      g.addColorStop(0, 'rgba(160,255,200,0)');
      g.addColorStop(0.5, 'rgba(160,255,200,0.06)');
      g.addColorStop(1, 'rgba(160,255,200,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, bandY - 60, w, 120);
    },
  });
};

const orbit: SceneFactory = (w, h) => {
  return (ctx) => {
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h) * 0.13;
    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    const rings: Array<[number, number, string]> = [
      [base, hr / 12, '#fbbf24'],
      [base * 1.8, min / 60, '#34d399'],
      [base * 2.6, sec / 60, '#60a5fa'],
    ];
    ctx.lineWidth = 1;
    for (const [r, frac, color] of rings) {
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      const a = frac * TAU - Math.PI / 2;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, a);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.5, 0, TAU);
      ctx.fill();
    }
  };
};

// ==========================================
// Catalog
// ==========================================

const FREE: ChronoUnlock = { type: 'default' };

type Row = [id: string, name: string, scene: SceneFactory, unlock: ChronoUnlock, desc: string];
const ROWS: Row[] = [
  ['dust', 'ACCRETION DISK', accretion, FREE, 'Dust grains circling the three orbits and gathering in the wake of each planet.'],
  ['rain', 'RAIN ORBIT', rainOrbit, FREE, 'Layered night rain behind fine orbits; every second lands as a ripple.'],
  ['snow', 'FROST ORBIT', frost, FREE, 'Soft snowfall around icy orbits, each planet set in a slowly turning ice crystal.'],
  ['starfield', 'STAR CHART', starChart, { type: 'level', value: 20 }, 'A planisphere with Roman hour marks and dashed orbits, the planets linked as one constellation.'],
  ['fireflies', 'FIREFLY ORBIT', fireflyOrbit, { type: 'sessions', value: 10 }, 'Fireflies drifting and blinking in the dark while the planets breathe green-gold.'],
  ['bubbles', 'BUBBLE ORRERY', bubbleOrrery, { type: 'level', value: 50 }, 'Glass-bubble planets with real highlights, more bubbles rising slowly behind them.'],
  ['sakura', 'SAKURA ORBIT', sakuraOrbit, { type: 'streak', value: 3 }, 'Five-petal blossom planets as cherry petals tumble down the screen.'],
  ['embers', 'EMBER ORBIT', emberOrbit, { type: 'hours', value: 10 }, 'Glowing coals for planets, shedding sparks that rise, curl and cool.'],
  ['matrix', 'GLYPH ORBIT', glyphOrbit, { type: 'level', value: 120 }, 'Orbits made of hex digits that light up as the hands pass, with faint data columns behind.'],
  ['constellation', 'CONSTELLATION ORBIT', constellationOrbit, { type: 'sessions', value: 40 }, 'Drifting stars that link up with each other and with the planets whenever they pass close.'],
  ['aurora', 'AURORA ORBIT', auroraOrbit, { type: 'streak', value: 7 }, 'Fine orbits under rayed curtains of green and violet polar light.'],
  ['ripples', 'RIPPLE CLOCK', rippleClock, { type: 'level', value: 250 }, 'Each planet sends rings across still water as it moves.'],
  ['synthwave', 'SYNTHWAVE ORBIT', synthwaveOrbit, { type: 'hours', value: 50 }, 'Neon orbits around a banded retro sunset, drawn flat like a poster.'],
  ['meteors', 'COMET CLOCK', cometClock, { type: 'level', value: 400 }, 'Three comets with tapered dust tails and faint ion streaks.'],
  ['lava', 'LAVA ORBIT', lavaOrbit, { type: 'session', value: 90 }, 'Soft blobs of warm light orbiting and melting into each other.'],
  ['crt', 'VECTOR SCOPE', vectorScope, { type: 'level', value: 600 }, 'A phosphor radar scope sweeping the seconds, scanlines and all.'],
  ['leaves', 'AUTUMN ORBIT', autumnOrbit, { type: 'sessions', value: 100 }, 'Leaves rocking as they fall past amber orbits.'],
  ['warp', 'WARP ORBIT', warpOrbit, { type: 'level', value: 900 }, 'Orbits holding steady while the stars stream past at lightspeed.'],
  ['lanterns', 'LANTERN ORBIT', lanternOrbit, { type: 'streak', value: 14 }, 'Paper lanterns floating upward around warm, glowing orbits.'],
  ['galaxy', 'GALACTIC ORBIT', galacticOrbit, { type: 'hours', value: 150 }, 'Orbits laid over a slowly turning two-armed spiral galaxy.'],
  ['code', 'CODE ORBIT', codeOrbit, { type: 'level', value: 1300 }, 'Lines of code wrapped around the orbits and typed out as time passes.'],
  ['orbit', 'ORBITAL CLOCK', orbit, { type: 'session', value: 180 }, 'Three orbits tracking the real hour, minute and second.'],
  ['prism', 'PRISM ORBIT', prismOrbit, { type: 'ascension', value: 1 }, 'Spectral orbits; the seconds planet splits a beam of white light into color. An Ascension reward.'],
];

const SCENES = new Map<string, SceneFactory>(ROWS.map(([id, , scene]) => [id, scene]));

export const AMBIENT_THEMES: AmbientTheme[] = ROWS.map(([id, name, , unlock, desc], i) => ({
  id,
  code: `AM-${String(i + 1).padStart(2, '0')}`,
  name,
  unlock,
  desc,
}));

export const DEFAULT_AMBIENT_THEME_ID = 'dust';
export const AMBIENT_THEME_STORAGE_KEY = 'typbox_ambient_theme';
export const AMBIENT_CLOCK_STORAGE_KEY = 'typbox_ambient_clock';
export const AMBIENT_DIM_STORAGE_KEY = 'typbox_ambient_dim';

const THEME_BY_ID = new Map(AMBIENT_THEMES.map((th) => [th.id, th]));
export const isAmbientThemeId = (v: unknown): v is string => typeof v === 'string' && THEME_BY_ID.has(v);
export const getAmbientThemeById = (id: string | null | undefined): AmbientTheme =>
  (id && THEME_BY_ID.get(id)) || (THEME_BY_ID.get(DEFAULT_AMBIENT_THEME_ID) as AmbientTheme);

export function createAmbientScene(id: string, w: number, h: number): AmbientFrame {
  return (SCENES.get(id) ?? accretion)(w, h);
}

/** How much the overlay darkens the dashboard underneath (device-local). */
export type AmbientDim = 'none' | 'low' | 'medium' | 'high';
export const AMBIENT_DIM_LEVELS: Array<{ id: AmbientDim; label: string; alpha: number }> = [
  { id: 'none', label: 'NONE', alpha: 0 },
  { id: 'low', label: 'LOW', alpha: 0.18 },
  { id: 'medium', label: 'MED', alpha: 0.35 },
  { id: 'high', label: 'HIGH', alpha: 0.55 },
];
export const DEFAULT_AMBIENT_DIM: AmbientDim = 'low';
export const isAmbientDim = (v: unknown): v is AmbientDim => AMBIENT_DIM_LEVELS.some((d) => d.id === v);
