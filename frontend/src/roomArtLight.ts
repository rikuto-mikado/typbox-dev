// MY ROOM art pack: lighting and neon. Lamps light up while the stopwatch
// runs or at night (`on || night`); recolourable parts use the S slots.
import { C, disc, S, text, textWidth, type Art, type Painter } from './roomPaint';

/** A neon word on a dark backing, glowing when lit. */
const neonWord = (p: Painter, w: number, word: string, color: string, dim: string, lit: boolean) => {
  p.rect(0, 0, w, 8, C.ink);
  p.rect(0, 7, w, 1, C.ink2);
  text(p, Math.floor((w - textWidth(word)) / 2), 1, word, lit ? color : dim);
};

export const LIGHT_ART: Record<string, Art> = {
  arc_lamp: (p, { on, night }) => {
    const lit = on || night;
    // pole up the left, then a half-circle arc over to the hanging shade
    p.rect(2, 8, 1, 15, S.m);
    for (let a = 0; a <= 20; a++) {
      const t = Math.PI - (a / 20) * Math.PI;
      p.px(Math.round(7 + Math.cos(t) * 5), Math.round(8 - Math.sin(t) * 6), S.m);
    }
    p.rect(12, 8, 1, 2, S.m);
    p.rect(10, 10, 5, 2, S.m);
    p.rect(11, 9, 3, 1, S.m3);
    if (lit) {
      p.rect(10, 12, 5, 1, C.glow);
      p.rect(11, 13, 3, 1, C.amber);
    }
    p.rect(0, 22, 6, 2, C.ink2);
  },
  moon_lamp: (p, { on, night }) => {
    const lit = on || night;
    disc(p, 4, 3.5, 3.5, lit ? '#fef3c7' : C.paper);
    p.px(2, 2, lit ? '#fde68a' : C.paper2);
    p.px(5, 4, lit ? '#fde68a' : C.paper2);
    p.px(4, 1, lit ? '#fde68a' : C.paper2);
    p.rect(2, 7, 4, 1, S.w2);
  },
  salt_lamp: (p, { on, night }) => {
    const lit = on || night;
    p.rect(3, 0, 2, 1, lit ? '#fdba74' : '#e8b4a0');
    p.rect(2, 1, 4, 2, lit ? '#fb923c' : '#e8a080');
    p.rect(1, 3, 6, 3, lit ? '#f97316' : '#d98b6c');
    p.px(3, 2, lit ? C.glow : '#f2c4b0');
    p.rect(1, 6, 6, 2, S.w2);
  },
  candles: (p, { on, night }) => {
    const lit = on || night;
    for (const [x, h] of [[1, 5], [4, 7], [6, 4]] as const) {
      p.rect(x, 8 - h, 2, h, S.a);
      p.px(x, 8 - h, S.a3);
      p.px(x, 7 - h, lit ? C.amber : C.ink3);
      if (lit) p.px(x, 6 - h, C.glow);
    }
  },
  tripod_lamp: (p, { on, night }) => {
    const lit = on || night;
    p.rect(0, 0, 8, 6, lit ? C.glow : S.a);
    p.rect(1, 0, 6, 1, lit ? C.white : S.a3);
    p.rect(0, 5, 8, 1, lit ? C.amber : S.a2);
    p.rect(3, 6, 2, 3, S.w2);
    for (let i = 0; i < 14; i++) {
      p.px(3 - Math.floor(i / 5), 9 + i, S.w2);
      p.px(4 + Math.floor(i / 5), 9 + i, S.w2);
    }
    p.rect(3, 9, 2, 14, S.w);
  },
  pendant_lights: (p, { on, night }) => {
    const lit = on || night;
    for (const [x, len] of [[3, 3], [11, 1], [19, 4]] as const) {
      p.rect(x, 0, 1, len, C.ink2);
      p.rect(x - 2, len, 5, 1, S.m2);
      p.rect(x - 3, len + 1, 7, 2, S.m);
      if (lit) p.rect(x - 1, len + 3, 3, 1, C.glow);
    }
  },
  wall_sconce: (p, { on, night }) => {
    const lit = on || night;
    p.rect(3, 3, 2, 4, S.m);
    p.rect(1, 6, 4, 1, S.m);
    p.rect(0, 0, 4, 4, lit ? C.glow : C.paper);
    p.rect(0, 3, 4, 1, lit ? C.amber : C.paper2);
  },
  neon_moon: (p, { on, night }) => {
    const lit = on || night;
    const c = lit ? '#fde047' : '#6b5f2a';
    for (let a = 0; a < 26; a++) {
      const t = (a / 25) * Math.PI * 1.3 + Math.PI * 0.35;
      p.px(Math.round(8 + Math.cos(t) * 6), Math.round(8 + Math.sin(t) * 6), c);
    }
    for (let a = 0; a < 18; a++) {
      const t = (a / 17) * Math.PI * 1.1 + Math.PI * 0.45;
      p.px(Math.round(10 + Math.cos(t) * 4.5), Math.round(7 + Math.sin(t) * 4.5), c);
    }
    p.px(13, 12, lit ? C.pink : '#5b2a42');
    p.px(14, 3, lit ? C.sky : '#24485b');
  },
  neon_heart: (p, { on, night }) => {
    const c = on || night ? C.pink : '#5b2a42';
    const pts = [
      [4, 3], [5, 2], [6, 2], [7, 3], [8, 4], [9, 3], [10, 2], [11, 2], [12, 3], [13, 4], [13, 5], [13, 6],
      [12, 7], [11, 8], [10, 9], [9, 10], [8, 11], [7, 10], [6, 9], [5, 8], [4, 7], [3, 6], [3, 5], [3, 4],
    ];
    pts.forEach(([x, y]) => p.px(x, y + 2, c));
  },
  neon_code: (p, { on, night }) => neonWord(p, 24, '</>', C.leaf3, '#2a4a33', on || night),
  neon_focus: (p, { on, night }) => neonWord(p, 24, 'FOCUS', C.sky, '#24485b', on || night),
  neon_open: (p, { on, night }) => neonWord(p, 24, 'OPEN', C.red, '#5b2222', on || night),
  neon_cat: (p, { on, night }) => {
    const lit = on || night;
    const c = lit ? '#c4b5fd' : '#3a3058';
    // round face, two ears, glowing eyes and whiskers
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5 - 8, (y + 0.5 - 9.5) * 1.15);
        if (Math.abs(d - 5) < 0.55) p.px(x, y, c);
      }
    }
    for (let i = 0; i < 4; i++) {
      p.px(3 + i, 1 + i, c);
      p.px(3, 1 + i, c);
      p.px(12 - i, 1 + i, c);
      p.px(12, 1 + i, c);
    }
    p.px(6, 9, lit ? C.amber : '#4a3a15');
    p.px(10, 9, lit ? C.amber : '#4a3a15');
    p.rect(1, 11, 3, 1, c);
    p.rect(12, 11, 3, 1, c);
    p.px(8, 11, lit ? C.pink : '#5b2a42');
  },
  mushroom_lamp: (p, { on, night }) => {
    const lit = on || night;
    p.rect(1, 1, 6, 1, lit ? '#fca5a5' : S.b3);
    p.rect(0, 2, 8, 2, lit ? '#f87171' : S.b);
    p.px(2, 2, C.white);
    p.px(5, 3, C.white);
    p.rect(3, 4, 2, 3, lit ? C.glow : C.paper);
    p.rect(2, 7, 4, 1, C.paper2);
  },
  fairy_jar: (p, { on, night }) => {
    const lit = on || night;
    p.rect(2, 0, 4, 1, S.w2);
    p.rect(1, 1, 6, 7, lit ? '#3f3a2a' : '#c8dde6');
    p.rect(2, 1, 4, 1, C.paper);
    for (const [x, y] of [[2, 3], [5, 2], [3, 5], [5, 6], [2, 6]] as const) p.px(x, y, lit ? C.glow : C.metal);
  },
  camping_lantern: (p, { on, night }) => {
    const lit = on || night;
    p.rect(2, 0, 4, 1, C.ink2);
    p.rect(1, 1, 1, 2, C.ink2);
    p.rect(6, 1, 1, 2, C.ink2);
    p.rect(1, 3, 6, 2, S.a);
    p.rect(2, 5, 4, 7, lit ? C.glow : C.paper);
    p.rect(1, 5, 1, 7, S.a2);
    p.rect(6, 5, 1, 7, S.a2);
    if (lit) p.rect(3, 7, 2, 3, C.amber);
    p.rect(1, 12, 6, 4, S.a);
    p.rect(1, 12, 6, 1, S.a3);
  },
  sunset_lamp: (p, { on, night }) => {
    const lit = on || night;
    if (lit) {
      disc(p, 4, 4, 4, '#fb923c');
      disc(p, 4, 4, 2.6, '#f43f5e');
    }
    p.rect(3, 6, 2, 1, S.m);
    p.rect(2, 7, 4, 3, S.m);
    p.rect(3, 10, 2, 5, S.m2);
    p.rect(1, 15, 6, 1, S.m2);
  },
  chandelier: (p, { on, night }) => {
    const lit = on || night;
    p.rect(11, 0, 2, 4, S.m);
    p.rect(5, 4, 14, 1, S.m);
    p.rect(2, 7, 20, 1, S.m);
    for (const x of [5, 11, 18]) p.rect(x, 4, 1, 4, S.m);
    for (const x of [2, 7, 12, 16, 21]) {
      p.rect(x, 5, 1, 2, C.white);
      p.px(x, 4, lit ? C.amber : C.paper2);
    }
    for (let x = 3; x < 22; x += 3) {
      p.px(x, 9, lit ? '#e0f2fe' : C.paper);
      p.px(x, 11, lit ? C.white : C.paper2);
    }
    p.rect(10, 8, 4, 4, lit ? C.glow : S.m3);
    p.px(11, 13, lit ? C.white : C.paper2);
  },
  disco_ball: (p, { on, night }) => {
    const lit = on || night;
    p.rect(3, 0, 1, 2, C.ink2);
    disc(p, 3.5, 5, 3.5, C.metal);
    for (let y = 2; y < 9; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) p.px(x, y, (x * y) % 3 ? C.metal3 : C.white);
    if (lit) {
      p.px(0, 2, C.pink);
      p.px(7, 7, C.sky);
    }
  },
  lava_tall: (p, { on, night }) => {
    const lit = on || night;
    p.rect(2, 0, 4, 2, S.m);
    p.rect(2, 2, 4, 9, lit ? '#a855f7' : '#6d4a8a');
    disc(p, 3.5, 4, 1.2, lit ? '#fde047' : '#9b8a4a');
    disc(p, 4.5, 8, 1.4, lit ? '#fde047' : '#9b8a4a');
    p.rect(1, 11, 6, 5, S.m);
    p.rect(1, 11, 6, 1, S.m3);
  },
};
