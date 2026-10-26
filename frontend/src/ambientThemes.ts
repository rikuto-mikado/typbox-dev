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

/** A fading comet tail laid along the orbit behind a body. */
function trail(f: OrbitFrame, b: OrbitBody, span: number, width: number, alpha = 0.6, color = b.color) {
  const { ctx } = f;
  const steps = 20;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let k = 0; k < steps; k++) {
    const fade = 1 - k / steps;
    ctx.globalAlpha = alpha * fade * fade;
    ctx.lineWidth = Math.max(0.6, width * (0.35 + 0.65 * fade));
    orbitPath(f, b.r, b.a - (span * (k + 1)) / steps, b.a - (span * k) / steps);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
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

const rainOrbit: SceneFactory = (w, h) => {
  const drops = Array.from({ length: density(w, h, 70, 30, 150) }, () => ({
    x: rnd(-w * 0.2, w), y: rnd(-h, h), len: rnd(10, 24), v: rnd(650, 1000), a: rnd(0.06, 0.16),
  }));
  const ripples: Array<{ x: number; y: number; age: number; max: number; size: number; color: string }> = [];
  let frame: OrbitFrame | null = null;
  const tick = everySecond((s) => {
    if (!frame) return;
    const [, m, sec] = frame.bodies;
    ripples.push({ x: sec.x, y: sec.y, age: 0, max: 1.8, size: frame.base * 0.32, color: sec.color });
    if (s === 0) ripples.push({ x: m.x, y: m.y, age: 0, max: 3, size: frame.base * 0.6, color: m.color });
  });
  return orbital(w, h, {
    colors: ['#a5b4fc', '#7dd3fc', '#e0f2fe'],
    back: (f) => {
      const { ctx } = f;
      ctx.strokeStyle = '#b4d2ff';
      ctx.lineWidth = 1;
      for (const d of drops) {
        d.y += d.v * f.dt;
        d.x += d.v * 0.12 * f.dt;
        if (d.y > h + 30) { d.y = rnd(-80, -10); d.x = rnd(-w * 0.2, w); }
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.12, d.y - d.len);
        ctx.stroke();
      }
    },
    rings: (f) => plainRings(f, { ring: 0.14, arc: 0.42, width: 1.5 }),
    front: (f) => {
      frame = f;
      tick(f.now);
      const { ctx } = f;
      ctx.lineWidth = 1.1;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += f.dt;
        if (r.age > r.max) { ripples.splice(i, 1); continue; }
        const k = r.age / r.max;
        const ease = 1 - (1 - k) * (1 - k);
        ctx.strokeStyle = r.color;
        for (const [scale, a] of [[1, 0.5], [0.55, 0.3]]) {
          const rr = r.size * ease * scale;
          if (rr < 1) continue;
          ctx.globalAlpha = a * (1 - k);
          ctx.beginPath();
          // Flattened like a ring on a water surface seen at an angle.
          ctx.ellipse(r.x, r.y, rr, rr * 0.42, 0, 0, TAU);
          ctx.stroke();
        }
      }
    },
  });
};

function snowflake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    ctx.rotate(TAU / 6);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.24, -r * 0.78);
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(-r * 0.24, -r * 0.78);
  }
  ctx.stroke();
  ctx.restore();
}

const frost: SceneFactory = (w, h) => {
  const flakes = Array.from({ length: density(w, h, 60, 24, 130) }, () => ({
    x: rnd(0, w), y: rnd(-h, h), r: rnd(0.7, 2.4), v: rnd(14, 40), ph: rnd(0, TAU), sway: rnd(8, 24),
  }));
  return orbital(w, h, {
    colors: ['#e0f2fe', '#bae6fd', '#f8fafc'],
    back: (f) => {
      const { ctx } = f;
      ctx.fillStyle = '#fff';
      for (const p of flakes) {
        p.y += p.v * f.dt;
        if (p.y > h + 5) { p.y = -5; p.x = rnd(0, w); }
        ctx.globalAlpha = 0.18 + p.r * 0.1;
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(f.t * 0.6 + p.ph) * p.sway, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    },
    rings: (f) => {
      plainRings(f, { ring: 0.14, arc: 0.45, width: 1.5 });
      // Twelve ice crystals mark the hours on the outer orbit.
      const { ctx } = f;
      const outer = f.bodies[2].r + f.base * 0.16;
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 0.8;
      for (let k = 0; k < 12; k++) {
        const [x, y] = onOrbit(f, outer, (k / 12) * TAU + TOP);
        ctx.globalAlpha = k % 3 === 0 ? 0.45 : 0.22;
        snowflake(ctx, x, y, f.base * (k % 3 === 0 ? 0.07 : 0.045), f.t * 0.05);
      }
    },
    bodies: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        const s = f.px * (3.1 - b.i * 0.45);
        glow(ctx, b.x, b.y, s * 3.2, hexTint('#bae6fd'), 0.7);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.1;
        ctx.globalAlpha = 0.95;
        snowflake(ctx, b.x, b.y, s, f.t * (0.15 + b.i * 0.12));
      }
    },
  });
};

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
}

const starChart: SceneFactory = (w, h) => {
  const stars = makeStars(w, h, 200, 70, 360);
  const shooting: Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number }> = [];
  let next = rnd(4, 9);
  return orbital(w, h, {
    colors: ['#fde68a', '#c7d2fe', '#f9fafb'],
    back: (f) => {
      const { ctx } = f;
      drawStars(ctx, stars, f.t);
      next -= f.dt;
      if (next <= 0) {
        next = rnd(5, 11);
        const speed = rnd(600, 950);
        const ang = rnd(0.35, 0.65);
        shooting.push({ x: rnd(w * 0.2, w * 1.1), y: rnd(-20, h * 0.35), vx: -Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 0, max: rnd(0.6, 1.1) });
      }
      for (let i = shooting.length - 1; i >= 0; i--) {
        const m = shooting[i];
        m.life += f.dt;
        m.x += m.vx * f.dt;
        m.y += m.vy * f.dt;
        if (m.life > m.max) { shooting.splice(i, 1); continue; }
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.14, m.y - m.vy * 0.14);
        g.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - m.life / m.max)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 0.14, m.y - m.vy * 0.14);
        ctx.stroke();
      }
    },
    rings: (f) => {
      const { ctx } = f;
      ctx.setLineDash([1.5, 5]);
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.3;
        orbitPath(f, b.r);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.5;
        orbitPath(f, b.r, TOP, b.a);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      // A planisphere bezel: minute ticks outside the second orbit, hour ticks inside the hour orbit.
      ticks(f, f.bodies[2].r + f.base * 0.1, 60, f.base * 0.035, '#e0e7ff', 0.3, 5);
      ticks(f, f.bodies[0].r - f.base * 0.14, 12, f.base * 0.06, '#fde68a', 0.3);
    },
    bodies: (f) => {
      const { ctx } = f;
      const [hb, mb, sb] = f.bodies;
      // The three planets drawn as one constellation.
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = '#e0e7ff';
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.moveTo(hb.x, hb.y);
      ctx.lineTo(mb.x, mb.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const b of f.bodies) {
        const s = f.px * (1.2 - b.i * 0.15);
        glow(ctx, b.x, b.y, s * 5, hexTint(b.color), 0.8);
        sparkle(ctx, b.x, b.y, s * 3.4, b.color, 0.7 + 0.3 * Math.sin(f.t * 2 + b.i));
        dot(ctx, b.x, b.y, s * 0.8, '#fff');
      }
    },
  });
};

const fireflyOrbit: SceneFactory = (w, h) => {
  const flies = Array.from({ length: density(w, h, 36, 15, 60) }, () => ({
    ring: Math.floor(Math.random() * 3), th: rnd(0, TAU), sp: rnd(0.04, 0.12) * (Math.random() < 0.5 ? -1 : 1),
    ph: rnd(0, TAU), wob: rnd(0.4, 1.1), pulse: rnd(0.6, 1.4), off: rnd(-0.15, 0.15),
  }));
  return orbital(w, h, {
    colors: ['#fde047', '#bef264', '#d9f99d'],
    back: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of flies) {
        const b = f.bodies[p.ring];
        p.th += p.sp * f.dt;
        const r = b.r + f.base * (p.off + 0.1 * Math.sin(f.t * p.wob + p.ph));
        const [x, y] = onOrbit(f, r, p.th + 0.05 * Math.sin(f.t * 0.9 + p.ph));
        const lit = Math.max(0, Math.sin(f.t * p.pulse + p.ph));
        if (lit < 0.02) continue;
        glow(ctx, x, y, f.px * 4.5, (a) => `rgba(210,250,110,${a})`, lit);
        dot(ctx, x, y, 0.9, '#f7fee7', lit * 0.9);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => plainRings(f, { ring: 0.1, arc: 0.36, width: 1.5 }),
    bodies: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of f.bodies) {
        const s = f.px * (1.3 - b.i * 0.15);
        const breathe = 0.7 + 0.3 * Math.sin(f.t * (1.2 + b.i * 0.5) + b.i * 2);
        glow(ctx, b.x, b.y, s * 9 * breathe, hexTint(b.color), 1);
        dot(ctx, b.x, b.y, s, '#fefce8');
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  });
};

/** A gently wobbling orbit, as if drawn on the surface of a bubble. */
function wobblePath(f: OrbitFrame, r: number, from: number, to: number, phase: number) {
  const { ctx } = f;
  const steps = Math.max(8, Math.ceil(((to - from) / TAU) * 120));
  ctx.beginPath();
  for (let k = 0; k <= steps; k++) {
    const a = from + ((to - from) * k) / steps;
    const rr = r * (1 + 0.005 * Math.sin(a * 6 + f.t * 0.8 + phase));
    const [x, y] = onOrbit(f, rr, a);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.7, -2.5, -1.5);
  ctx.stroke();
  dot(ctx, x + r * 0.35, y + r * 0.4, Math.max(0.6, r * 0.09), '#fff', 0.6);
}

const bubbleOrrery: SceneFactory = (w, h) => {
  const rising = Array.from({ length: density(w, h, 16, 8, 32) }, () => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(2, 9), v: rnd(14, 40), ph: rnd(0, TAU) }));
  return orbital(w, h, {
    colors: ['#99f6e4', '#a5f3fc', '#e0e7ff'],
    back: (f) => {
      const { ctx } = f;
      ctx.lineWidth = 1;
      for (const b of rising) {
        b.y -= b.v * f.dt;
        if (b.y < -b.r - 5) { b.y = h + b.r; b.x = rnd(0, w); }
        const x = b.x + Math.sin(f.t * 1.2 + b.ph) * 6;
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, TAU);
        ctx.stroke();
      }
    },
    rings: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.16;
        wobblePath(f, b.r, 0, TAU, b.i * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.45;
        wobblePath(f, b.r, TOP, b.a, b.i * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
    bodies: (f) => {
      for (const b of f.bodies) {
        const rr = b.r * (1 + 0.005 * Math.sin(b.a * 6 + f.t * 0.8 + b.i * 2));
        const [x, y] = onOrbit(f, rr, b.a);
        const s = f.px * (3.4 - b.i * 0.5) * (1 + 0.04 * Math.sin(f.t * 2.4 + b.i));
        bubble(f.ctx, x, y, s, b.color);
      }
    },
  });
};

function petal(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.75, -s * 0.15, 0, s);
  ctx.quadraticCurveTo(-s * 0.75, -s * 0.15, 0, -s);
  ctx.fill();
}

function blossom(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.92;
  for (let k = 0; k < 5; k++) {
    ctx.save();
    ctx.rotate((k / 5) * TAU);
    ctx.translate(0, -s * 0.62);
    petal(ctx, s * 0.62);
    ctx.restore();
  }
  ctx.restore();
  dot(ctx, x, y, s * 0.24, '#fde68a', 0.95);
}

const sakuraOrbit: SceneFactory = (w, h) => {
  const PER = 8;
  // Fixed scatter per trailing petal so the wake reads as a stable drift.
  const wake = Array.from({ length: 3 * PER }, () => ({ off: rnd(-1, 1), s: rnd(0.6, 1.1), rot: rnd(0, TAU), spin: rnd(-1.2, 1.2), lag: rnd(0, 1) }));
  const falling = Array.from({ length: density(w, h, 16, 8, 34) }, () => ({
    x: rnd(0, w), y: rnd(-h, h), s: rnd(2.5, 5), v: rnd(18, 40), vx: rnd(10, 30), rot: rnd(0, TAU), vr: rnd(-1.2, 1.2), ph: rnd(0, TAU),
  }));
  return orbital(w, h, {
    colors: ['#f9a8d4', '#fbcfe8', '#fce7f3'],
    back: (f) => {
      const { ctx } = f;
      ctx.fillStyle = '#fbcfe8';
      for (const p of falling) {
        p.y += p.v * f.dt;
        p.x += (p.vx + Math.sin(f.t + p.ph) * 20) * f.dt;
        p.rot += p.vr * f.dt;
        if (p.y > h + 20 || p.x > w + 20) { p.y = rnd(-40, -10); p.x = rnd(-w * 0.3, w); }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(f.t * 1.3 + p.ph)));
        ctx.globalAlpha = 0.4;
        petal(ctx, p.s);
        ctx.restore();
      }
    },
    rings: (f) => plainRings(f, { ring: 0.14, arc: 0.4, width: 1.5 }),
    bodies: (f) => {
      const { ctx } = f;
      const spans = [0.35, 0.5, 0.85];
      for (const b of f.bodies) {
        for (let k = 0; k < PER; k++) {
          const p = wake[b.i * PER + k];
          const back = spans[b.i] * ((k + p.lag) / PER);
          const [x, y] = onOrbit(f, b.r + p.off * f.base * 0.09 * (k / PER + 0.3), b.a - back);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.rot + f.t * p.spin);
          ctx.globalAlpha = 0.9 * (1 - k / PER) ** 1.2;
          ctx.fillStyle = b.color;
          petal(ctx, f.px * 2.3 * p.s);
          ctx.restore();
        }
        glow(ctx, b.x, b.y, f.px * 7, hexTint(b.color), 0.55);
        blossom(ctx, b.x, b.y, f.px * (3.6 - b.i * 0.5), f.t * (0.2 + b.i * 0.15), b.color);
      }
    },
  });
};

const emberOrbit: SceneFactory = (w, h) => {
  const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }> = [];
  const rates = [2, 4, 9];
  const owed = [0, 0, 0];
  return orbital(w, h, {
    colors: ['#fb923c', '#f97316', '#fde047'],
    rings: (f) => {
      plainRings(f, { ring: 0.12, arc: 0.32, width: 1.5 });
      const spans = [0.25, 0.45, 1];
      for (const b of f.bodies) trail(f, b, spans[b.i], f.px * 0.9, 0.55);
    },
    bodies: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of f.bodies) {
        owed[b.i] += rates[b.i] * f.dt;
        while (owed[b.i] >= 1 && sparks.length < 160) {
          owed[b.i] -= 1;
          sparks.push({ x: b.x, y: b.y, vx: rnd(-14, 14), vy: rnd(-48, -16), life: 0, max: rnd(1.2, 2.6), r: rnd(0.6, 1.5) });
        }
        const s = f.px * (1.35 - b.i * 0.15);
        const flicker = 0.85 + 0.15 * Math.sin(f.t * 13 + b.i * 2) * Math.sin(f.t * 7.3 + b.i);
        glow(ctx, b.x, b.y, s * 8 * flicker, hexTint(b.color), 1);
        dot(ctx, b.x, b.y, s, '#fff7ed');
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const e = sparks[i];
        e.life += f.dt;
        if (e.life > e.max) { sparks.splice(i, 1); continue; }
        e.x += (e.vx + Math.sin(f.t * 2 + e.y * 0.02) * 10) * f.dt;
        e.y += e.vy * f.dt;
        const k = 1 - e.life / e.max;
        ctx.globalAlpha = k * (0.6 + 0.4 * Math.sin(f.t * 13 + e.x));
        ctx.fillStyle = `hsl(${20 + 25 * k}, 100%, ${50 + 20 * k}%)`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  });
};

const GLYPHS = [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロワン0123456789'];
const glyphOrbit: SceneFactory = (w, h) => {
  const counts = [12, 60, 60];
  const rings = counts.map((n) => Array.from({ length: n }, () => pick(GLYPHS)));
  const rainSize = w < 600 ? 12 : 14;
  const cols = Array.from({ length: Math.min(36, Math.ceil(w / (rainSize * 3))) }, (_, i) => ({
    x: (i + rnd(0, 1)) * rainSize * 3, y: rnd(-h, h), v: rnd(30, 90), chars: Array.from({ length: 8 }, () => pick(GLYPHS)),
  }));
  return orbital(w, h, {
    colors: ['#bbf7d0', '#4ade80', '#22c55e'],
    back: (f) => {
      const { ctx } = f;
      ctx.font = `${rainSize}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#22c55e';
      for (const c of cols) {
        c.y += c.v * f.dt;
        if (c.y - 8 * rainSize > h) { c.y = rnd(-200, 0); c.v = rnd(30, 90); }
        if (Math.random() < 0.04) c.chars[Math.floor(Math.random() * 8)] = pick(GLYPHS);
        for (let k = 0; k < 8; k++) {
          ctx.globalAlpha = 0.09 * (1 - k / 8);
          ctx.fillText(c.chars[k], c.x, c.y - k * rainSize);
        }
      }
    },
    // The orbits are made of glyphs, so there are no stroked rings.
    rings: (f) => {
      const { ctx } = f;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sizes = [0.2, 0.11, 0.14];
      for (const b of f.bodies) {
        const n = counts[b.i];
        const glyphs = rings[b.i];
        if (Math.random() < f.dt * 3) glyphs[Math.floor(Math.random() * n)] = pick(GLYPHS);
        ctx.font = `${Math.max(6, f.base * sizes[b.i])}px ui-monospace, monospace`;
        const head = Math.floor(b.frac * n);
        for (let k = 0; k < n; k++) {
          const [x, y] = onOrbit(f, b.r, (k / n) * TAU + TOP);
          if (k === head) continue;
          const lit = k < head;
          ctx.globalAlpha = lit ? 0.5 + 0.15 * (k / Math.max(1, head)) : 0.1;
          ctx.fillStyle = lit ? b.color : '#14532d';
          ctx.fillText(glyphs[k], x, y);
        }
      }
    },
    bodies: (f) => {
      const { ctx } = f;
      const sizes = [0.2, 0.11, 0.14];
      for (const b of f.bodies) {
        const n = counts[b.i];
        const head = Math.floor(b.frac * n);
        const [x, y] = onOrbit(f, b.r, (head / n) * TAU + TOP);
        glow(ctx, x, y, f.base * sizes[b.i] * 1.8, hexTint('#86efac'), 0.9);
        ctx.font = `${Math.max(6, f.base * sizes[b.i])}px ui-monospace, monospace`;
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#f0fdf4';
        ctx.fillText(rings[b.i][head], x, y);
      }
    },
  });
};

const constellationOrbit: SceneFactory = (w, h) => {
  const drifters = Array.from({ length: density(w, h, 32, 14, 56) }, () => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-10, 10), vy: rnd(-10, 10) }));
  const pts: Array<[number, number]> = [];
  return orbital(w, h, {
    colors: ['#c4b5fd', '#a5b4fc', '#f0abfc'],
    back: (f) => {
      const { ctx } = f;
      for (const n of drifters) {
        n.x += n.vx * f.dt;
        n.y += n.vy * f.dt;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      // Nodes: drifting stars, the twelve hour marks, and the three planets.
      pts.length = 0;
      for (const n of drifters) pts.push([n.x, n.y]);
      for (let k = 0; k < 12; k++) pts.push(onOrbit(f, f.bodies[2].r + f.base * 0.25, (k / 12) * TAU + TOP));
      for (const b of f.bodies) pts.push([b.x, b.y]);
      const link = Math.max(24, f.base * 1.1);
      ctx.strokeStyle = '#a5b4fc';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
          if (d > link) continue;
          ctx.globalAlpha = 0.28 * (1 - d / link);
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#e0e7ff';
      for (let i = 0; i < pts.length - 3; i++) {
        const marker = i >= drifters.length;
        ctx.globalAlpha = marker ? 0.55 : 0.4;
        const s = marker ? 2.2 : 1.6;
        ctx.fillRect(pts[i][0] - s / 2, pts[i][1] - s / 2, s, s);
      }
    },
    rings: (f) => plainRings(f, { ring: 0.08, arc: 0.36, width: 1.3 }),
  });
};

const AURORA_STOPS: Array<[number, string]> = [[0, '#34d399'], [0.33, '#22d3ee'], [0.66, '#a78bfa'], [1, '#34d399']];
const auroraOrbit: SceneFactory = (w, h) => {
  const bands = [
    { hue: 150, y: 0.26, amp: 0.07, k: 2.1, s: 0.18, ph: rnd(0, TAU) },
    { hue: 175, y: 0.34, amp: 0.06, k: 3.2, s: -0.13, ph: rnd(0, TAU) },
    { hue: 275, y: 0.2, amp: 0.05, k: 1.6, s: 0.1, ph: rnd(0, TAU) },
  ];
  const stars = makeStars(w, h, 50, 25, 120);
  return orbital(w, h, {
    colors: ['#6ee7b7', '#67e8f9', '#c4b5fd'],
    back: (f) => {
      const { ctx } = f;
      drawStars(ctx, stars, f.t, 0.6);
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bands) {
        const steps = 40;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w;
          const y = h * (b.y + b.amp * Math.sin((i / steps) * TAU * b.k * 0.5 + f.t * b.s + b.ph) + 0.02 * Math.sin(f.t * 0.7 + i));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h * (b.y + 0.35));
        ctx.lineTo(0, h * (b.y + 0.35));
        ctx.closePath();
        const g = ctx.createLinearGradient(0, h * (b.y - b.amp), 0, h * (b.y + 0.35));
        g.addColorStop(0, `hsla(${b.hue}, 90%, 60%, 0)`);
        g.addColorStop(0.15, `hsla(${b.hue}, 90%, 60%, 0.1)`);
        g.addColorStop(1, `hsla(${b.hue}, 90%, 50%, 0)`);
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(f.t * 0.3 + b.ph);
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => {
      const { ctx } = f;
      // Polar light flowing around the orbits (solid fallback where conic gradients are missing).
      let paint: CanvasGradient | string = '#67e8f9';
      if (typeof ctx.createConicGradient === 'function') {
        const g = ctx.createConicGradient(f.t * 0.08, f.cx, f.cy);
        for (const [stop, color] of AURORA_STOPS) g.addColorStop(stop, color);
        paint = g;
      }
      ctx.strokeStyle = paint;
      for (const b of f.bodies) {
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.22;
        orbitPath(f, b.r);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.6;
        orbitPath(f, b.r, TOP, b.a);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
  });
};

const rippleClock: SceneFactory = (w, h) => {
  const ripples: Array<{ x: number; y: number; age: number; max: number; size: number; color: string }> = [];
  const every = [6, 3, 1];
  const owed = [0, 0, 0];
  return orbital(w, h, {
    colors: ['#5eead4', '#67e8f9', '#a5b4fc'],
    rings: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.1;
        orbitPath(f, b.r - f.base * 0.035);
        ctx.stroke();
        orbitPath(f, b.r + f.base * 0.035);
        ctx.stroke();
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.42;
        orbitPath(f, b.r, TOP, b.a);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
    bodies: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        owed[b.i] += f.dt;
        if (owed[b.i] >= every[b.i]) {
          owed[b.i] = 0;
          ripples.push({ x: b.x, y: b.y, age: 0, max: 2.4 + b.i * -0.3, size: f.base * [0.75, 0.55, 0.38][b.i], color: b.color });
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += f.dt;
        if (r.age > r.max) { ripples.splice(i, 1); continue; }
        const k = r.age / r.max;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 1;
        for (const [scale, a] of [[1, 0.45], [0.62, 0.28], [0.3, 0.16]]) {
          const rr = r.size * (1 - (1 - k) * (1 - k)) * scale;
          if (rr < 1) continue;
          ctx.globalAlpha = a * (1 - k);
          ctx.beginPath();
          ctx.arc(r.x, r.y, rr, 0, TAU);
          ctx.stroke();
        }
      }
      planets(f, 5);
    },
  });
};

const synthwaveOrbit: SceneFactory = (w, h) => {
  const horizon = h * 0.6;
  // Orbit halves above the center pass behind the sun, the rest in front of it.
  const half = (f: OrbitFrame, front: boolean, draw: () => void) => {
    f.ctx.save();
    f.ctx.beginPath();
    if (front) f.ctx.rect(0, f.cy, w, h - f.cy);
    else f.ctx.rect(0, 0, w, f.cy);
    f.ctx.clip();
    draw();
    f.ctx.restore();
  };
  const neonRings = (f: OrbitFrame) => {
    const { ctx } = f;
    for (const b of f.bodies) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.28;
      orbitPath(f, b.r);
      ctx.stroke();
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = 0.7;
      orbitPath(f, b.r, TOP, b.a);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  };
  const neonBodies = (f: OrbitFrame, front: boolean) => {
    for (const b of f.bodies) {
      if (Math.sin(b.a) >= 0 !== front) continue;
      const s = f.px * (1.3 - b.i * 0.15);
      glow(f.ctx, b.x, b.y, s * 7, hexTint(b.color), 1);
      dot(f.ctx, b.x, b.y, s, '#fff');
    }
  };
  return orbital(w, h, {
    colors: ['#fde047', '#f472b6', '#22d3ee'],
    tilt: 0.36,
    scale: 1.45,
    anchor: [0.5, 0.42],
    back: (f) => {
      const { ctx } = f;
      // Perspective grid floor.
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 1;
      const rows = 14;
      const scroll = (f.t * 0.3) % 1;
      for (let i = 0; i < rows; i++) {
        const z = (i + scroll) / rows;
        const y = horizon + (h - horizon) * z * z;
        ctx.globalAlpha = 0.32 * z;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      const lines = 22;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      for (let i = -lines; i <= lines; i++) {
        ctx.moveTo(w / 2 + i * (w / lines) * 0.08, horizon);
        ctx.lineTo(w / 2 + i * (w / lines) * 1.6, h);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(w, horizon);
      ctx.stroke();
      half(f, false, () => {
        neonRings(f);
        neonBodies(f, false);
      });
      // The striped sun sits at the center of the orbits.
      const r = f.base * 0.62;
      const sun = ctx.createLinearGradient(0, f.cy - r, 0, f.cy + r);
      sun.addColorStop(0, '#fde047');
      sun.addColorStop(1, '#ec4899');
      glow(ctx, f.cx, f.cy, r * 2.4, (a) => `rgba(244,114,182,${a})`, 0.6);
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.cx, f.cy, r, 0, TAU);
      ctx.clip();
      ctx.fillStyle = sun;
      ctx.globalAlpha = 0.8;
      // Bands that thin out toward the bottom, the classic cut-stripe sun.
      let y = f.cy - r;
      while (y < f.cy + r) {
        const gap = y < f.cy - r * 0.1 ? 0 : 1 + (y - f.cy) / (r * 0.18);
        const band = Math.max(1.5, r * 0.16 - gap * 0.6);
        ctx.fillRect(f.cx - r, y, r * 2, band);
        y += band + gap;
      }
      ctx.restore();
    },
    rings: (f) => half(f, true, () => neonRings(f)),
    bodies: (f) => neonBodies(f, true),
  });
};

const cometClock: SceneFactory = (w, h) => {
  const stars = makeStars(w, h, 120, 50, 260);
  const meteors: Array<{ x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number }> = [];
  let next = rnd(1, 3);
  return orbital(w, h, {
    colors: ['#fca5a5', '#fcd34d', '#93c5fd'],
    back: (f) => {
      const { ctx } = f;
      drawStars(ctx, stars, f.t, 0.8);
      next -= f.dt;
      if (next <= 0) {
        next = rnd(1.5, 4);
        const speed = rnd(600, 1000);
        const ang = rnd(0.35, 0.65);
        meteors.push({ x: rnd(w * 0.1, w * 1.1), y: rnd(-20, h * 0.4), vx: -Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 0, max: rnd(0.5, 1), hue: rnd(160, 320) });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += f.dt;
        m.x += m.vx * f.dt;
        m.y += m.vy * f.dt;
        if (m.life > m.max) { meteors.splice(i, 1); continue; }
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.12, m.y - m.vy * 0.12);
        g.addColorStop(0, `hsla(${m.hue}, 90%, 80%, ${0.7 * (1 - m.life / m.max)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12);
        ctx.stroke();
      }
    },
    rings: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = 0.12;
        orbitPath(f, b.r);
        ctx.stroke();
      }
      // The dust tail is the progress marker here: long, curved, fading.
      const spans = [0.6, 1, 1.9];
      for (const b of f.bodies) trail(f, b, spans[b.i], f.px * (1.7 - b.i * 0.25), 0.8);
    },
    bodies: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        // The ion tail always points away from the "sun" at the center.
        const len = f.base * (0.35 + b.i * 0.12);
        const ux = (b.x - f.cx) / Math.max(1, Math.hypot(b.x - f.cx, b.y - f.cy));
        const uy = (b.y - f.cy) / Math.max(1, Math.hypot(b.x - f.cx, b.y - f.cy));
        const g = ctx.createLinearGradient(b.x, b.y, b.x + ux * len, b.y + uy * len);
        g.addColorStop(0, 'rgba(191,219,254,0.4)');
        g.addColorStop(1, 'rgba(191,219,254,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + ux * len, b.y + uy * len);
        ctx.stroke();
        const s = f.px * (1.3 - b.i * 0.15);
        glow(ctx, b.x, b.y, s * 6, hexTint(b.color), 1);
        dot(ctx, b.x, b.y, s * 0.9, '#fff');
      }
    },
  });
};

const lavaOrbit: SceneFactory = (w, h) => {
  const satellites = Array.from({ length: 6 }, (_, i) => ({ ring: i % 3, th: rnd(0, TAU), sp: rnd(0.03, 0.08), size: rnd(0.35, 0.6), hue: [10, 330, 40, 25, 300, 350][i], ph: rnd(0, TAU) }));
  const blob = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue}, 95%, 60%, ${0.42 * a})`);
    g.addColorStop(0.55, `hsla(${hue}, 95%, 52%, ${0.14 * a})`);
    g.addColorStop(1, `hsla(${hue}, 95%, 45%, 0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  return orbital(w, h, {
    colors: ['#f97316', '#ec4899', '#facc15'],
    back: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      for (const s of satellites) {
        s.th += s.sp * f.dt;
        const b = f.bodies[s.ring];
        const [x, y] = onOrbit(f, b.r + Math.sin(f.t * 0.3 + s.ph) * f.base * 0.12, s.th);
        blob(ctx, x, y, f.base * s.size * (1 + 0.15 * Math.sin(f.t * 0.5 + s.ph)), s.hue, 0.7);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => {
      const { ctx } = f;
      ctx.lineCap = 'round';
      plainRings(f, { ring: 0.08, arc: 0.3, width: 3 });
      ctx.lineCap = 'butt';
    },
    bodies: (f) => {
      const { ctx } = f;
      const hues = [25, 330, 48];
      ctx.globalCompositeOperation = 'lighter';
      for (const b of f.bodies) {
        const r = f.base * [0.85, 0.65, 0.48][b.i] * (1 + 0.1 * Math.sin(f.t * (0.6 + b.i * 0.3) + b.i));
        blob(ctx, b.x, b.y, r, hues[b.i], 1);
        blob(ctx, b.x, b.y, r * 0.4, hues[b.i] + 15, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const b of f.bodies) dot(ctx, b.x, b.y, f.px * (1.1 - b.i * 0.15), '#fff7ed', 0.85);
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

function leaf(ctx: CanvasRenderingContext2D, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.8, 0, 0, s);
  ctx.quadraticCurveTo(-s * 0.8, 0, 0, -s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.85);
  ctx.lineTo(0, s * 1.25);
  ctx.stroke();
}

const autumnOrbit: SceneFactory = (w, h) => {
  const palette = ['#f59e0b', '#ea580c', '#b45309', '#dc2626', '#facc15'];
  const falling = Array.from({ length: density(w, h, 14, 6, 28) }, () => ({
    x: rnd(0, w), y: rnd(-h, h), s: rnd(5, 9), v: rnd(22, 50), vx: rnd(12, 36), rot: rnd(0, TAU), vr: rnd(-1.4, 1.4), ph: rnd(0, TAU), c: pick(palette),
  }));
  return orbital(w, h, {
    colors: ['#f59e0b', '#ea580c', '#dc2626'],
    back: (f) => {
      const { ctx } = f;
      for (const p of falling) {
        p.y += p.v * f.dt;
        p.x += (p.vx + Math.sin(f.t + p.ph) * 22) * f.dt;
        p.rot += p.vr * f.dt;
        if (p.y > h + 20 || p.x > w + 20) { p.y = rnd(-40, -10); p.x = rnd(-w * 0.3, w); }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(f.t * 1.4 + p.ph)));
        ctx.globalAlpha = 0.42;
        leaf(ctx, p.s, p.c);
        ctx.restore();
      }
    },
    rings: (f) => plainRings(f, { ring: 0.14, arc: 0.45, width: 1.6 }),
    bodies: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        const s = f.px * (3 - b.i * 0.4);
        glow(ctx, b.x, b.y, s * 3, hexTint(b.color), 0.6);
        ctx.save();
        ctx.translate(b.x, b.y);
        // Leaves point along their orbit, rocking a little in the wind.
        ctx.rotate(b.a + Math.sin(f.t * 1.3 + b.i) * 0.35);
        ctx.globalAlpha = 0.95;
        leaf(ctx, s, b.color);
        ctx.restore();
      }
    },
  });
};

const warpOrbit: SceneFactory = (w, h) => {
  const reach = Math.hypot(w, h) / 2;
  const spawn = () => ({ a: rnd(0, TAU), d: rnd(2, 40), v: rnd(40, 120) });
  const streaks = Array.from({ length: density(w, h, 80, 50, 180) }, () => ({ ...spawn(), d: rnd(2, reach) }));
  return orbital(w, h, {
    colors: ['#a5b4fc', '#67e8f9', '#f5d0fe'],
    back: (f) => {
      const { ctx } = f;
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineCap = 'round';
      for (const s of streaks) {
        const prev = s.d;
        s.v *= 1 + 1.6 * f.dt;
        s.d += s.v * f.dt;
        if (s.d > reach) Object.assign(s, spawn());
        const k = s.d / reach;
        ctx.globalAlpha = Math.min(0.55, k * 1.1);
        ctx.lineWidth = 0.5 + k * 1.6;
        ctx.beginPath();
        ctx.moveTo(f.cx + Math.cos(s.a) * prev, f.cy + Math.sin(s.a) * prev);
        ctx.lineTo(f.cx + Math.cos(s.a) * s.d, f.cy + Math.sin(s.a) * s.d);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
    rings: (f) => {
      plainRings(f, { ring: 0.2, arc: 0.6, width: 2 });
      const spans = [0.2, 0.35, 0.75];
      for (const b of f.bodies) trail(f, b, spans[b.i], f.px * 1.2, 0.5, '#fff');
    },
  });
};

const lanternOrbit: SceneFactory = (w, h) => {
  const spawn = (y = h + rnd(20, 200)) => ({ x: rnd(0, w), y, s: rnd(0.4, 0.9), v: rnd(10, 24), ph: rnd(0, TAU) });
  const rising = Array.from({ length: density(w, h, 9, 5, 16) }, () => spawn(rnd(0, h)));
  const lantern = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flicker: number, alpha: number) => {
    const bw = s * 1.5;
    const bh = s * 1.9;
    glow(ctx, x, y, bh * 2.8, (a) => `rgba(255,170,60,${a})`, 0.9 * flicker * alpha);
    const body = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
    body.addColorStop(0, '#fb923c');
    body.addColorStop(1, '#fde68a');
    ctx.globalAlpha = 0.9 * flicker * alpha;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.42, y - bh / 2);
    ctx.lineTo(x + bw * 0.42, y - bh / 2);
    ctx.lineTo(x + bw * 0.5, y + bh / 2);
    ctx.lineTo(x - bw * 0.5, y + bh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(x - bw * 0.3, y - bh / 2 - Math.max(1, s * 0.18), bw * 0.6, Math.max(1, s * 0.18));
  };
  return orbital(w, h, {
    colors: ['#fdba74', '#fb923c', '#fde68a'],
    back: (f) => {
      for (const l of rising) {
        l.y -= l.v * l.s * f.dt;
        if (l.y < -60) Object.assign(l, spawn());
        lantern(f.ctx, l.x + Math.sin(f.t * 0.5 + l.ph) * 10, l.y, 9 * l.s, 0.85 + 0.15 * Math.sin(f.t * 7 + l.ph), 0.45);
      }
    },
    rings: (f) => plainRings(f, { ring: 0.12, arc: 0.4, width: 1.6 }),
    bodies: (f) => {
      for (const b of f.bodies) {
        const s = f.px * (2.6 - b.i * 0.35);
        lantern(f.ctx, b.x, b.y + Math.sin(f.t * 0.9 + b.i) * s * 0.3, s, 0.85 + 0.15 * Math.sin(f.t * 7 + b.i * 2), 1);
      }
    },
  });
};

const galacticOrbit: SceneFactory = (w, h) => {
  const R = Math.min(w, h) * 0.6;
  const arms = 3;
  const stars = Array.from({ length: density(w, h, 380, 260, 700) }, () => {
    const r = Math.pow(Math.random(), 0.6) * R;
    const arm = Math.floor(Math.random() * arms);
    const a = (arm / arms) * TAU + r * 0.012 + rnd(-0.35, 0.35) * (1 - r / R + 0.3);
    return { r, a, hue: r < R * 0.2 ? rnd(30, 50) : pick([210, 230, 280, 320]), s: rnd(0.6, 1.5) };
  });
  return orbital(w, h, {
    colors: ['#fde68a', '#f0abfc', '#93c5fd'],
    tilt: 0.55,
    scale: 1.3,
    back: (f) => {
      const { ctx } = f;
      for (const p of stars) {
        p.a += (0.22 / Math.sqrt(1 + p.r / 30)) * f.dt;
        ctx.globalAlpha = 0.12 + 0.4 * (1 - p.r / R);
        ctx.fillStyle = `hsl(${p.hue}, 80%, 80%)`;
        ctx.fillRect(f.cx + Math.cos(p.a) * p.r, f.cy + Math.sin(p.a) * p.r * f.tilt, p.s, p.s);
      }
      glow(ctx, f.cx, f.cy, f.base * 0.7, (a) => `rgba(253,230,138,${a})`, 0.8);
    },
    rings: (f) => {
      plainRings(f, { ring: 0.18, arc: 0.55, width: 1.8 });
      const spans = [0.15, 0.3, 0.6];
      for (const b of f.bodies) trail(f, b, spans[b.i], f.px * 0.9, 0.4);
    },
  });
};

const codeOrbit: SceneFactory = (w, h) => {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const texts = (now: Date) => [
    `// HOUR ${pad2(now.getHours())} `,
    'while (studying) { minutes++; } ',
    `const t = "${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}"; focus.tick(); `,
  ];
  return orbital(w, h, {
    colors: ['#f9a8d4', '#93c5fd', '#86efac'],
    // Each orbit is a line of code wrapped around the circle; the typed part is lit.
    rings: (f) => {
      const { ctx } = f;
      const lines = texts(f.now);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const b of f.bodies) {
        const size = Math.max(6, f.base * [0.13, 0.1, 0.1][b.i]);
        ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const n = Math.max(12, Math.floor((TAU * b.r) / (size * 0.72)));
        const head = Math.floor(b.frac * n);
        const line = lines[b.i];
        for (let k = 0; k < n; k++) {
          if (k === head) continue;
          const a = (k / n) * TAU + TOP;
          const [x, y] = onOrbit(f, b.r, a);
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a + Math.PI / 2);
          ctx.globalAlpha = k < head ? 0.55 : 0.1;
          ctx.fillStyle = k < head ? b.color : '#d4d4d8';
          ctx.fillText(line[k % line.length], 0, 0);
          ctx.restore();
        }
      }
    },
    bodies: (f) => {
      const { ctx } = f;
      // A blinking block cursor marks where each line is being typed.
      const on = f.now.getMilliseconds() < 550;
      for (const b of f.bodies) {
        const size = Math.max(6, f.base * [0.13, 0.1, 0.1][b.i]);
        const n = Math.max(12, Math.floor((TAU * b.r) / (size * 0.72)));
        const a = (Math.floor(b.frac * n) / n) * TAU + TOP;
        const [x, y] = onOrbit(f, b.r, a);
        glow(ctx, x, y, size * 1.6, hexTint(b.color), 0.8);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = on ? 0.95 : 0.35;
        ctx.fillStyle = b.color;
        ctx.fillRect(-size * 0.3, -size * 0.5, size * 0.6, size);
        ctx.restore();
      }
    },
  });
};

const prismOrbit: SceneFactory = (w, h) => {
  const hue = (t: number, i: number) => (t * 18 + i * 120) % 360;
  return orbital(w, h, {
    colors: ['#ffffff', '#ffffff', '#ffffff'],
    back: (f) => {
      const { ctx } = f;
      ctx.globalCompositeOperation = 'lighter';
      // Each planet casts a beam of colored light out from the center.
      for (const b of f.bodies) {
        const reach = b.r * 2.4;
        const hh = hue(f.t, b.i);
        const g = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, reach);
        g.addColorStop(0, `hsla(${hh}, 95%, 65%, 0.2)`);
        g.addColorStop(1, `hsla(${hh}, 95%, 65%, 0)`);
        const spread = 0.07 + 0.025 * Math.sin(f.t * 0.4 + b.i);
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(f.cx, f.cy);
        ctx.arc(f.cx, f.cy, reach, b.a - spread, b.a + spread);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    rings: (f) => {
      const { ctx } = f;
      for (const b of f.bodies) {
        const hh = hue(f.t, b.i);
        ctx.strokeStyle = `hsl(${hh}, 95%, 70%)`;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        orbitPath(f, b.r);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        orbitPath(f, b.r, TOP, b.a);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
    bodies: (f) => {
      for (const b of f.bodies) {
        const hh = hue(f.t, b.i);
        const s = f.px * (1.3 - b.i * 0.15);
        glow(f.ctx, b.x, b.y, s * 7, (a) => `hsla(${hh}, 95%, 70%, ${a})`, 1);
        dot(f.ctx, b.x, b.y, s, '#fff');
      }
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
  ['rain', 'RAIN ORBIT', rainOrbit, FREE, 'Night rain behind the orbits; every second lands as a ripple.'],
  ['snow', 'FROST ORBIT', frost, FREE, 'Snowflake planets on icy orbits, the hours marked with crystals.'],
  ['starfield', 'STAR CHART', starChart, { type: 'level', value: 20 }, 'A planisphere of dashed orbits, the three planets linked like a constellation.'],
  ['fireflies', 'FIREFLY ORBIT', fireflyOrbit, { type: 'sessions', value: 10 }, 'Fireflies drifting along the orbits while the planets breathe green-gold.'],
  ['bubbles', 'BUBBLE ORRERY', bubbleOrrery, { type: 'level', value: 50 }, 'Glassy bubble planets riding gently wobbling orbits.'],
  ['sakura', 'SAKURA ORBIT', sakuraOrbit, { type: 'streak', value: 3 }, 'Blossom planets scattering petals along their orbits.'],
  ['embers', 'EMBER ORBIT', emberOrbit, { type: 'hours', value: 10 }, 'Smouldering planets shedding sparks as they burn around the dial.'],
  ['matrix', 'GLYPH ORBIT', glyphOrbit, { type: 'level', value: 120 }, 'Orbits made of digital-rain glyphs that light up as time fills them.'],
  ['constellation', 'CONSTELLATION ORBIT', constellationOrbit, { type: 'sessions', value: 40 }, 'Planets, hour marks and drifting stars linking up whenever they pass close.'],
  ['aurora', 'AURORA ORBIT', auroraOrbit, { type: 'streak', value: 7 }, 'Orbits painted in flowing polar light over soft auroral curtains.'],
  ['ripples', 'RIPPLE CLOCK', rippleClock, { type: 'level', value: 250 }, 'Each planet sends rings across still water as it moves.'],
  ['synthwave', 'SYNTHWAVE ORBIT', synthwaveOrbit, { type: 'hours', value: 50 }, 'Tilted neon orbits around a striped sun above an endless grid.'],
  ['meteors', 'COMET CLOCK', cometClock, { type: 'level', value: 400 }, 'Three comets with curved tails chasing the hour, minute and second.'],
  ['lava', 'LAVA ORBIT', lavaOrbit, { type: 'session', value: 90 }, 'Soft blobs of warm light orbiting and melting into each other.'],
  ['crt', 'VECTOR SCOPE', vectorScope, { type: 'level', value: 600 }, 'A phosphor radar scope sweeping the seconds, scanlines and all.'],
  ['leaves', 'AUTUMN ORBIT', autumnOrbit, { type: 'sessions', value: 100 }, 'Leaf planets rocking around amber orbits as more leaves fall.'],
  ['warp', 'WARP ORBIT', warpOrbit, { type: 'level', value: 900 }, 'Orbits holding steady while the stars stretch past at lightspeed.'],
  ['lanterns', 'LANTERN ORBIT', lanternOrbit, { type: 'streak', value: 14 }, 'Paper-lantern planets glowing on warm orbits.'],
  ['galaxy', 'GALACTIC ORBIT', galacticOrbit, { type: 'hours', value: 150 }, 'Tilted orbits set inside a slowly turning spiral galaxy.'],
  ['code', 'CODE ORBIT', codeOrbit, { type: 'level', value: 1300 }, 'Lines of code wrapped around the orbits, typed out as time passes.'],
  ['orbit', 'ORBITAL CLOCK', orbit, { type: 'session', value: 180 }, 'Three orbits tracking the real hour, minute and second.'],
  ['prism', 'PRISM ORBIT', prismOrbit, { type: 'ascension', value: 1 }, 'Color-shifting orbits casting beams of light. An Ascension reward.'],
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
