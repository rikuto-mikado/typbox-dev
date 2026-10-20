// Ambient Mode overlays: what drifts across the screen while the stopwatch
// runs unattended. Each theme is a tiny canvas "scene" — a factory that
// owns its particle state and returns a per-frame draw function — so the
// whole catalog shares one renderer (AmbientOverlay.tsx) that caps the
// frame rate and pauses with the tab. Unlocks reuse the Chronometer Theme
// rule set.
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
// Scenes
// ==========================================

const dust: SceneFactory = (w, h) => {
  const ps = Array.from({ length: density(w, h, 40, 20, 70) }, () => ({
    x: rnd(0, w), y: rnd(0, h), r: rnd(0.6, 1.6), vx: rnd(-6, 6), vy: rnd(-14, -4), a: rnd(0.15, 0.45), ph: rnd(0, TAU),
  }));
  return (ctx, t, dt) => {
    ctx.fillStyle = '#fff';
    for (const p of ps) {
      p.x += (p.vx + Math.sin(t * 0.4 + p.ph) * 5) * dt;
      p.y += p.vy * dt;
      if (p.y < -5) { p.y = h + 5; p.x = rnd(0, w); }
      if (p.x < -5) p.x = w + 5;
      if (p.x > w + 5) p.x = -5;
      ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 0.7 + p.ph));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  };
};

const rain: SceneFactory = (w, h) => {
  const drops = Array.from({ length: density(w, h, 110, 60, 260) }, () => ({
    x: rnd(-w * 0.2, w), y: rnd(-h, h), len: rnd(10, 26), v: rnd(700, 1100), a: rnd(0.15, 0.4),
  }));
  return (ctx, _t, dt) => {
    ctx.strokeStyle = '#b4d2ff';
    ctx.lineWidth = 1;
    for (const d of drops) {
      d.y += d.v * dt;
      d.x += d.v * 0.12 * dt;
      if (d.y > h + 30) { d.y = rnd(-80, -10); d.x = rnd(-w * 0.2, w); }
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.12, d.y - d.len);
      ctx.stroke();
    }
  };
};

const snow: SceneFactory = (w, h) => {
  const flakes = Array.from({ length: density(w, h, 80, 40, 180) }, () => ({
    x: rnd(0, w), y: rnd(-h, h), r: rnd(0.8, 3), v: rnd(18, 55), ph: rnd(0, TAU), sway: rnd(8, 26),
  }));
  return (ctx, t, dt) => {
    ctx.fillStyle = '#fff';
    for (const f of flakes) {
      f.y += f.v * dt;
      if (f.y > h + 5) { f.y = -5; f.x = rnd(0, w); }
      const x = f.x + Math.sin(t * 0.6 + f.ph) * f.sway;
      ctx.globalAlpha = 0.35 + f.r * 0.15;
      ctx.beginPath();
      ctx.arc(x, f.y, f.r, 0, TAU);
      ctx.fill();
    }
  };
};

interface Meteor { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number }
function meteorField(w: number, h: number, every: [number, number], colored: boolean): AmbientFrame {
  const stars = Array.from({ length: density(w, h, 160, 80, 400) }, () => ({
    x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.3), f: rnd(0.5, 2), ph: rnd(0, TAU), a: rnd(0.3, 0.9),
  }));
  const meteors: Meteor[] = [];
  let next = rnd(...every);
  return (ctx, t, dt) => {
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(t * s.f + s.ph));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    next -= dt;
    if (next <= 0) {
      next = rnd(...every);
      const speed = rnd(600, 1000);
      const ang = rnd(0.35, 0.65);
      meteors.push({ x: rnd(w * 0.1, w * 1.1), y: rnd(-20, h * 0.4), vx: -Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 0, max: rnd(0.6, 1.2), hue: colored ? rnd(160, 320) : 0 });
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.life > m.max) { meteors.splice(i, 1); continue; }
      const fade = 1 - m.life / m.max;
      const tail = 0.14;
      const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
      const head = colored ? `hsla(${m.hue}, 90%, 80%, ${fade})` : `rgba(255,255,255,${fade})`;
      g.addColorStop(0, head);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
      ctx.stroke();
    }
  };
}
const starfield: SceneFactory = (w, h) => meteorField(w, h, [4, 9], false);
const meteors: SceneFactory = (w, h) => meteorField(w, h, [0.35, 1.2], true);

const fireflies: SceneFactory = (w, h) => {
  const flies = Array.from({ length: density(w, h, 18, 12, 40) }, () => ({
    x: rnd(0, w), y: rnd(h * 0.2, h), vx: 0, vy: 0, ph: rnd(0, TAU), f: rnd(0.4, 1.1), r: rnd(1.5, 3),
  }));
  return (ctx, t, dt) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of flies) {
      p.vx += rnd(-30, 30) * dt;
      p.vy += rnd(-30, 30) * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x = (p.x + p.vx * dt + w) % w;
      p.y = Math.max(h * 0.1, Math.min(h, p.y + p.vy * dt));
      const glow = Math.max(0, Math.sin(t * p.f + p.ph));
      const R = p.r * 6;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      g.addColorStop(0, `rgba(220,255,120,${0.9 * glow})`);
      g.addColorStop(0.25, `rgba(190,240,80,${0.35 * glow})`);
      g.addColorStop(1, 'rgba(190,240,80,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2);
    }
  };
};

const bubbles: SceneFactory = (w, h) => {
  const bs = Array.from({ length: density(w, h, 22, 14, 50) }, () => ({
    x: rnd(0, w), y: rnd(0, h), r: rnd(4, 20), v: rnd(20, 60), ph: rnd(0, TAU),
  }));
  return (ctx, t, dt) => {
    for (const b of bs) {
      b.y -= b.v * dt;
      if (b.y < -b.r - 5) { b.y = h + b.r; b.x = rnd(0, w); }
      const x = b.x + Math.sin(t * 1.2 + b.ph) * 6;
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, b.y, b.r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.18, 0, TAU);
      ctx.fill();
    }
  };
};

function fallingShapes(w: number, h: number, colors: string[], size: [number, number], leaf: boolean): AmbientFrame {
  const ps = Array.from({ length: density(w, h, leaf ? 22 : 34, leaf ? 12 : 20, leaf ? 45 : 70) }, () => ({
    x: rnd(0, w), y: rnd(-h, h), s: rnd(...size), v: rnd(25, 60), vx: rnd(15, 45), rot: rnd(0, TAU), vr: rnd(-1.5, 1.5), ph: rnd(0, TAU), c: pick(colors),
  }));
  return (ctx, t, dt) => {
    for (const p of ps) {
      p.y += p.v * dt;
      p.x += (p.vx + Math.sin(t + p.ph) * 25) * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 20 || p.x > w + 20) { p.y = rnd(-40, -10); p.x = rnd(-w * 0.3, w); }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      // A tumbling flat shape: squash one axis with a slow cosine.
      ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * 1.4 + p.ph)));
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      if (leaf) {
        ctx.moveTo(0, -p.s);
        ctx.quadraticCurveTo(p.s * 0.8, 0, 0, p.s);
        ctx.quadraticCurveTo(-p.s * 0.8, 0, 0, -p.s);
      } else {
        ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU);
      }
      ctx.fill();
      ctx.restore();
    }
  };
}
const sakura: SceneFactory = (w, h) => fallingShapes(w, h, ['#fbcfe8', '#f9a8d4', '#fce7f3'], [3, 6], false);
const leaves: SceneFactory = (w, h) => fallingShapes(w, h, ['#f59e0b', '#ea580c', '#b45309', '#dc2626', '#facc15'], [6, 11], true);

const embers: SceneFactory = (w, h) => {
  const spawn = () => ({ x: rnd(0, w), y: h + rnd(0, 40), vx: rnd(-15, 15), vy: rnd(-90, -40), life: 0, max: rnd(3, 7), r: rnd(0.8, 2.2) });
  const es = Array.from({ length: density(w, h, 45, 25, 90) }, () => ({ ...spawn(), life: rnd(0, 5) }));
  return (ctx, t, dt) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const e of es) {
      e.life += dt;
      if (e.life > e.max) Object.assign(e, spawn());
      e.x += (e.vx + Math.sin(t * 2 + e.y * 0.01) * 12) * dt;
      e.y += e.vy * dt;
      const k = 1 - e.life / e.max;
      ctx.globalAlpha = Math.max(0, k) * (0.6 + 0.4 * Math.sin(t * 13 + e.x));
      ctx.fillStyle = `hsl(${20 + 25 * k}, 100%, ${50 + 20 * k}%)`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, TAU);
      ctx.fill();
    }
  };
};

const GLYPHS = [...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモラリルレロワン0123456789'];
const matrix: SceneFactory = (w, h) => {
  const size = w < 600 ? 13 : 16;
  const trail = 14;
  const cols = Array.from({ length: Math.ceil(w / size) }, () => ({
    y: rnd(-h, h), v: rnd(40, 140), chars: Array.from({ length: trail }, () => pick(GLYPHS)),
  }));
  return (ctx, _t, dt) => {
    ctx.font = `${size}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    cols.forEach((c, i) => {
      c.y += c.v * dt;
      if (c.y - trail * size > h) { c.y = rnd(-200, 0); c.v = rnd(40, 140); }
      if (Math.random() < 0.05) c.chars[Math.floor(Math.random() * trail)] = pick(GLYPHS);
      for (let k = 0; k < trail; k++) {
        const y = c.y - k * size;
        if (y < -size || y > h) continue;
        ctx.globalAlpha = k === 0 ? 0.85 : 0.5 * (1 - k / trail);
        ctx.fillStyle = k === 0 ? '#d1fae5' : '#22c55e';
        ctx.fillText(c.chars[k], i * size, y);
      }
    });
  };
};

const constellation: SceneFactory = (w, h) => {
  const ns = Array.from({ length: density(w, h, 40, 25, 70) }, () => ({ x: rnd(0, w), y: rnd(0, h), vx: rnd(-12, 12), vy: rnd(-12, 12) }));
  const link = Math.min(160, Math.max(100, w / 9));
  return (ctx, _t, dt) => {
    for (const n of ns) {
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const dx = ns[i].x - ns[j].x;
        const dy = ns[i].y - ns[j].y;
        const d = Math.hypot(dx, dy);
        if (d > link) continue;
        ctx.globalAlpha = 0.35 * (1 - d / link);
        ctx.beginPath();
        ctx.moveTo(ns[i].x, ns[i].y);
        ctx.lineTo(ns[j].x, ns[j].y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#e0f2fe';
    for (const n of ns) ctx.fillRect(n.x - 1, n.y - 1, 2, 2);
  };
};

const aurora: SceneFactory = (w, h) => {
  const bands = [
    { hue: 150, y: 0.28, amp: 0.07, k: 2.1, s: 0.18, ph: rnd(0, TAU) },
    { hue: 175, y: 0.36, amp: 0.06, k: 3.2, s: -0.13, ph: rnd(0, TAU) },
    { hue: 275, y: 0.22, amp: 0.05, k: 1.6, s: 0.1, ph: rnd(0, TAU) },
  ];
  const stars = Array.from({ length: density(w, h, 60, 30, 140) }, () => ({ x: rnd(0, w), y: rnd(0, h * 0.7), a: rnd(0.2, 0.7) }));
  return (ctx, t) => {
    ctx.fillStyle = '#fff';
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bands) {
      const steps = 48;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const y = h * (b.y + b.amp * Math.sin((i / steps) * TAU * b.k * 0.5 + t * b.s + b.ph) + 0.02 * Math.sin(t * 0.7 + i));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h * (b.y + 0.35));
      ctx.lineTo(0, h * (b.y + 0.35));
      ctx.closePath();
      const top = h * (b.y - b.amp);
      const g = ctx.createLinearGradient(0, top, 0, h * (b.y + 0.35));
      g.addColorStop(0, `hsla(${b.hue}, 90%, 60%, 0)`);
      g.addColorStop(0.15, `hsla(${b.hue}, 90%, 60%, 0.2)`);
      g.addColorStop(1, `hsla(${b.hue}, 90%, 50%, 0)`);
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 0.3 + b.ph);
      ctx.fillStyle = g;
      ctx.fill();
    }
  };
};

const ripples: SceneFactory = (w, h) => {
  const rings: Array<{ x: number; y: number; age: number; max: number; size: number }> = [];
  let next = 0;
  return (ctx, _t, dt) => {
    next -= dt;
    while (next <= 0) {
      next += rnd(0.12, 0.45);
      rings.push({ x: rnd(0, w), y: rnd(h * 0.15, h), age: 0, max: rnd(1.8, 3), size: rnd(40, 110) });
    }
    ctx.strokeStyle = '#bfdbfe';
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.age += dt;
      if (r.age > r.max) { rings.splice(i, 1); continue; }
      const k = r.age / r.max;
      const rad = r.size * k;
      for (const [off, a] of [[0, 1], [0.55, 0.5]]) {
        const rr = rad * (1 - off * 0.5);
        if (rr <= 1) continue;
        ctx.globalAlpha = 0.45 * (1 - k) * a;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Flattened ellipses read as rings on a water surface seen at an angle.
        ctx.ellipse(r.x, r.y, rr, rr * 0.38, 0, 0, TAU);
        ctx.stroke();
      }
    }
  };
};

const synthwave: SceneFactory = (w, h) => {
  const horizon = h * 0.58;
  return (ctx, t) => {
    // Sun with cut stripes.
    const cx = w / 2;
    const r = Math.min(w, h) * 0.16;
    const sun = ctx.createLinearGradient(0, horizon - r * 2, 0, horizon);
    sun.addColorStop(0, '#fde047');
    sun.addColorStop(1, '#ec4899');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, horizon - r * 0.15, r, Math.PI, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 6; i++) {
      const y = horizon - r * 0.15 - r * (i / 7) * 0.9;
      ctx.fillRect(cx - r, y - (6 - i) * 0.6, r * 2, (6 - i) * 0.9 + 1);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Perspective grid.
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 1;
    const rows = 14;
    const scroll = (t * 0.35) % 1;
    for (let i = 0; i < rows; i++) {
      const z = (i + scroll) / rows;
      const y = horizon + (h - horizon) * z * z;
      ctx.globalAlpha = 0.5 * z;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const lines = 22;
    for (let i = -lines; i <= lines; i++) {
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + i * (w / lines) * 0.08, horizon);
      ctx.lineTo(cx + i * (w / lines) * 1.6, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();
  };
};

const lava: SceneFactory = (w, h) => {
  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x: rnd(0, w), y: rnd(0, h), r: rnd(0.18, 0.32) * Math.min(w, h), vx: rnd(-14, 14), vy: rnd(-22, 22), hue: [10, 25, 330, 290, 40, 350, 15][i],
  }));
  return (ctx, t, dt) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      b.x += b.vx * dt;
      b.y += (b.vy + Math.sin(t * 0.2 + b.hue) * 8) * dt;
      if (b.x < -b.r || b.x > w + b.r) b.vx *= -1;
      if (b.y < -b.r || b.y > h + b.r) b.vy *= -1;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, `hsla(${b.hue}, 95%, 58%, 0.38)`);
      g.addColorStop(0.6, `hsla(${b.hue}, 95%, 50%, 0.12)`);
      g.addColorStop(1, `hsla(${b.hue}, 95%, 45%, 0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
  };
};

const crt: SceneFactory = (w, h) => {
  return (ctx, t) => {
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.18;
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    // Rolling refresh band.
    const bandY = ((t * 0.12) % 1.2) * h - h * 0.1;
    const g = ctx.createLinearGradient(0, bandY - 60, 0, bandY + 60);
    g.addColorStop(0, 'rgba(160,255,200,0)');
    g.addColorStop(0.5, 'rgba(160,255,200,0.07)');
    g.addColorStop(1, 'rgba(160,255,200,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0, bandY - 60, w, 120);
    // Phosphor specks.
    ctx.fillStyle = '#a7f3d0';
    for (let i = 0; i < 40; i++) {
      ctx.globalAlpha = Math.random() * 0.35;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  };
};

const warp: SceneFactory = (w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const reach = Math.hypot(cx, cy);
  const spawn = () => ({ a: rnd(0, TAU), d: rnd(2, 40), v: rnd(40, 120) });
  const ss = Array.from({ length: density(w, h, 90, 60, 200) }, () => ({ ...spawn(), d: rnd(2, reach) }));
  return (ctx, _t, dt) => {
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineCap = 'round';
    for (const s of ss) {
      const prev = s.d;
      s.v *= 1 + 1.6 * dt;
      s.d += s.v * dt;
      if (s.d > reach) Object.assign(s, spawn());
      const k = s.d / reach;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.lineWidth = 0.5 + k * 1.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(s.a) * prev, cy + Math.sin(s.a) * prev);
      ctx.lineTo(cx + Math.cos(s.a) * s.d, cy + Math.sin(s.a) * s.d);
      ctx.stroke();
    }
  };
};

const lanterns: SceneFactory = (w, h) => {
  const spawn = (y = h + rnd(20, 200)) => ({ x: rnd(0, w), y, s: rnd(0.5, 1.3), v: rnd(10, 26), ph: rnd(0, TAU) });
  const ls = Array.from({ length: density(w, h, 12, 8, 22) }, () => spawn(rnd(0, h)));
  ls.sort((a, b) => a.s - b.s);
  return (ctx, t, dt) => {
    for (const l of ls) {
      l.y -= l.v * l.s * dt;
      if (l.y < -60) Object.assign(l, spawn());
      const x = l.x + Math.sin(t * 0.5 + l.ph) * 10;
      const bw = 14 * l.s;
      const bh = 18 * l.s;
      const flicker = 0.85 + 0.15 * Math.sin(t * 7 + l.ph);
      const R = bh * 2.6;
      const glow = ctx.createRadialGradient(x, l.y, 0, x, l.y, R);
      glow.addColorStop(0, `rgba(255,170,60,${0.35 * flicker})`);
      glow.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.fillRect(x - R, l.y - R, R * 2, R * 2);
      const body = ctx.createLinearGradient(0, l.y - bh / 2, 0, l.y + bh / 2);
      body.addColorStop(0, '#fb923c');
      body.addColorStop(1, '#fde68a');
      ctx.globalAlpha = 0.85 * flicker;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x - bw * 0.42, l.y - bh / 2);
      ctx.lineTo(x + bw * 0.42, l.y - bh / 2);
      ctx.lineTo(x + bw * 0.5, l.y + bh / 2);
      ctx.lineTo(x - bw * 0.5, l.y + bh / 2);
      ctx.closePath();
      ctx.fill();
    }
  };
};

const galaxy: SceneFactory = (w, h) => {
  const R = Math.min(w, h) * 0.42;
  const arms = 3;
  const ps = Array.from({ length: density(w, h, 450, 300, 800) }, () => {
    const r = Math.pow(Math.random(), 0.6) * R;
    const arm = Math.floor(Math.random() * arms);
    const a = (arm / arms) * TAU + r * 0.012 + rnd(-0.35, 0.35) * (1 - r / R + 0.3);
    return { r, a, hue: r < R * 0.2 ? rnd(30, 50) : pick([210, 230, 280, 320]), s: rnd(0.6, 1.6) };
  });
  return (ctx, _t, dt) => {
    const cx = w / 2;
    const cy = h / 2;
    for (const p of ps) {
      // Inner stars orbit faster, like a real disc.
      p.a += (0.25 / Math.sqrt(1 + p.r / 30)) * dt;
      const x = cx + Math.cos(p.a) * p.r;
      const y = cy + Math.sin(p.a) * p.r * 0.55;
      ctx.globalAlpha = 0.25 + 0.5 * (1 - p.r / R);
      ctx.fillStyle = `hsl(${p.hue}, 80%, 80%)`;
      ctx.fillRect(x, y, p.s, p.s);
    }
  };
};

const CODE_LINES = [
  'const focus = await session.start();', 'for (const block of today) log(block);', 'if (streak > best) best = streak;',
  'git commit -m "deep work"', 'SELECT SUM(minutes) FROM logs;', 'def study(topic): return mastery(topic)', 'while (!done) { learn(); }',
  'export const goal = 1000 * HOURS;', '>> compiling knowledge ...', 'assert(progress > yesterday)', 'curl -s typbox.me/api/telemetry',
  'npm run build && ./ship', 'let lv = clearance(totalHours);', '// TODO: keep going', 'fn rest() -> Energy { recharge() }',
];
const code: SceneFactory = (w, h) => {
  const size = w < 600 ? 11 : 13;
  const lineH = size * 1.6;
  const cols = Math.max(1, Math.floor(w / 420));
  const streams = Array.from({ length: cols }, (_, i) => ({
    x: 24 + (i * w) / cols, offset: rnd(0, 400), lines: Array.from({ length: Math.ceil(h / lineH) + 2 }, () => pick(CODE_LINES)), typed: 0,
  }));
  return (ctx, _t, dt) => {
    ctx.font = `${size}px ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    for (const s of streams) {
      s.offset += 9 * dt;
      if (s.offset >= lineH) {
        s.offset -= lineH;
        s.lines.shift();
        s.lines.push(pick(CODE_LINES));
        s.typed = 0;
      }
      s.typed += 22 * dt;
      s.lines.forEach((line, i) => {
        const y = h - (s.lines.length - i) * lineH + lineH - s.offset;
        const last = i === s.lines.length - 1;
        ctx.globalAlpha = 0.12 + 0.3 * (y / h);
        ctx.fillStyle = last ? '#86efac' : '#d4d4d8';
        ctx.fillText(last ? line.slice(0, Math.floor(s.typed)) + '▋' : line, s.x, y);
      });
    }
  };
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

const prism: SceneFactory = (w, h) => {
  const beams = 7;
  return (ctx, t) => {
    const cx = w / 2;
    const cy = h * 1.1;
    const reach = Math.hypot(w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < beams; i++) {
      const a = -Math.PI / 2 + Math.sin(t * 0.07 + i * 0.9) * 0.9;
      const spread = 0.06 + 0.03 * Math.sin(t * 0.3 + i);
      const hue = (t * 12 + (i * 360) / beams) % 360;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
      g.addColorStop(0, `hsla(${hue}, 95%, 65%, 0.22)`);
      g.addColorStop(1, `hsla(${hue}, 95%, 65%, 0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, reach, a - spread, a + spread);
      ctx.closePath();
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
  ['dust', 'SENSOR DUST', dust, FREE, 'Slow motes drifting upward — the original Ambient Mode.'],
  ['rain', 'NIGHT RAIN', rain, FREE, 'Fine diagonal rain streaking past the glass.'],
  ['snow', 'SNOWFALL', snow, FREE, 'Soft flakes swaying down at their own pace.'],
  ['starfield', 'STARFIELD', starfield, { type: 'level', value: 20 }, 'Twinkling stars and the occasional shooting star.'],
  ['fireflies', 'FIREFLIES', fireflies, { type: 'sessions', value: 10 }, 'Wandering green-gold glows on a summer night.'],
  ['bubbles', 'BUBBLES', bubbles, { type: 'level', value: 50 }, 'Glassy bubbles wobbling up to the surface.'],
  ['sakura', 'SAKURA', sakura, { type: 'streak', value: 3 }, 'Cherry-blossom petals tumbling on a spring breeze.'],
  ['embers', 'EMBERS', embers, { type: 'hours', value: 10 }, 'Sparks rising from an unseen campfire.'],
  ['matrix', 'DIGITAL RAIN', matrix, { type: 'level', value: 120 }, 'Falling columns of green glyphs.'],
  ['constellation', 'CONSTELLATION', constellation, { type: 'sessions', value: 40 }, 'Drifting nodes that link up when they pass close.'],
  ['aurora', 'AURORA', aurora, { type: 'streak', value: 7 }, 'Curtains of northern light rippling over a starry sky.'],
  ['ripples', 'RAIN ON WATER', ripples, { type: 'level', value: 250 }, 'Raindrop rings spreading across a still pond.'],
  ['synthwave', 'SYNTHWAVE', synthwave, { type: 'hours', value: 50 }, 'An endless neon grid rolling toward a striped sun.'],
  ['meteors', 'METEOR SHOWER', meteors, { type: 'level', value: 400 }, 'A busy night: colored meteors crossing every few seconds.'],
  ['lava', 'LAVA LAMP', lava, { type: 'session', value: 90 }, 'Big soft blobs of warm light drifting and merging.'],
  ['crt', 'CRT MONITOR', crt, { type: 'level', value: 600 }, 'Scanlines, a rolling refresh band and phosphor flicker.'],
  ['leaves', 'AUTUMN LEAVES', leaves, { type: 'sessions', value: 100 }, 'Amber and crimson leaves tumbling down.'],
  ['warp', 'HYPERSPACE', warp, { type: 'level', value: 900 }, 'Stars stretching into lines as you jump to lightspeed.'],
  ['lanterns', 'SKY LANTERNS', lanterns, { type: 'streak', value: 14 }, 'Paper lanterns floating up into the night.'],
  ['galaxy', 'GALAXY', galaxy, { type: 'hours', value: 150 }, 'A slowly turning spiral galaxy.'],
  ['code', 'LIVE CODE', code, { type: 'level', value: 1300 }, 'Faint lines of code typing themselves out.'],
  ['orbit', 'ORBITAL CLOCK', orbit, { type: 'session', value: 180 }, 'Three orbits tracking the real hour, minute and second.'],
  ['prism', 'PRISM', prism, { type: 'ascension', value: 1 }, 'Slow, color-shifting beams of light. An Ascension reward.'],
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
  return (SCENES.get(id) ?? dust)(w, h);
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
