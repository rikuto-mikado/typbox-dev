// MY ROOM art pack: CYBER STREET — a rain-slick back alley at night: neon
// signs, steaming ducts, hologram vending and plastic stall stools. Neon
// and holograms glow while the stopwatch runs or at night (`on || night`).
// Recolourable parts use the S slots (roomPaint.ts): a = neon / hologram
// colour, b = plastic / awning, m = metal casing.
import { box, C, disc, hash, S, text, textWidth, type Art, type Painter } from './roomPaint';

/** Neon word on a dark backing; dim tube colour when unlit. */
const neon = (p: Painter, x: number, y: number, w: number, word: string, lit: boolean) => {
  p.rect(x, y, w, 9, C.ink);
  p.rect(x, y + 8, w, 1, C.ink2);
  text(p, x + Math.floor((w - textWidth(word)) / 2), y + 2, word, lit ? S.a3 : S.a2);
  if (lit) {
    p.px(x, y, S.a);
    p.px(x + w - 1, y, S.a);
  }
};

const puff = (p: Painter, x: number, y: number) => {
  disc(p, x, y, 1.8, '#cbd5e1');
  disc(p, x + 2, y - 1, 1.4, '#e2e8f0');
};

export const CYBER_STREET_ART: Record<string, Art> = {
  cyber_neon_sign: (p, { on, night }) => {
    const lit = on || night;
    p.rect(2, 0, 1, 2, C.ink3);
    p.rect(21, 0, 1, 2, C.ink3);
    neon(p, 0, 2, 24, 'RAMEN', lit);
    neon(p, 4, 11, 16, '24H', lit);
  },
  cyber_steam_duct: (p, { on }) => {
    p.rect(3, 6, 6, 18, S.m);
    p.rect(3, 6, 1, 18, S.m3);
    p.rect(8, 6, 1, 18, S.m2);
    for (let y = 9; y < 24; y += 5) p.rect(2, y, 8, 1, S.m2);
    p.rect(2, 4, 8, 3, S.m2);
    p.rect(9, 18, 5, 4, S.m);
    p.rect(13, 17, 2, 6, S.m2);
    puff(p, 5, 2);
    if (on) puff(p, 10, 0.5);
    puff(p, 14, 14);
  },
  cyber_holo_vending: (p, { on, night }) => {
    const lit = on || night;
    box(p, 0, 0, 16, 32, S.m, S.m2);
    p.rect(2, 2, 12, 4, lit ? S.a : C.ink2);
    if (lit) text(p, 3, 2, 'DRK', C.white);
    box(p, 2, 7, 9, 16, lit ? '#0b1021' : C.ink2, C.ink);
    for (let y = 9; y < 22; y += 4) {
      for (let x = 3; x < 10; x += 2) p.rect(x, y, 1, 2, [S.a3, C.pink, C.amber, C.leaf3][(x + y) % 4]);
      p.rect(3, y + 2, 7, 1, C.ink3);
    }
    // hologram mascot floating by the glass
    if (lit) {
      disc(p, 13, 11, 1.6, S.a3);
      p.rect(12, 13, 3, 3, S.a3);
    }
    box(p, 11, 18, 4, 4, C.ink2, C.ink);
    p.rect(3, 25, 10, 4, C.ink);
    p.rect(1, 31, 14, 1, C.ink);
  },
  cyber_stall_stool: (p) => {
    p.rect(0, 1, 8, 2, S.b);
    p.rect(0, 1, 8, 1, S.b3);
    p.rect(1, 3, 1, 5, S.b2);
    p.rect(6, 3, 1, 5, S.b2);
    p.rect(2, 5, 4, 1, S.b2);
  },
  cyber_food_stall: (p, { on, night }) => {
    const lit = on || night;
    // striped awning with a neon edge
    for (let x = 0; x < 32; x++) p.rect(x, 0, 1, 5, Math.floor(x / 4) % 2 ? S.b : C.white);
    for (let x = 0; x < 32; x += 4) disc(p, x + 2, 5, 1.6, Math.floor(x / 4) % 2 ? S.b : C.white);
    p.rect(0, 7, 32, 1, lit ? S.a3 : S.a2);
    p.rect(1, 8, 1, 14, C.ink3);
    p.rect(30, 8, 1, 14, C.ink3);
    // lanterns, steaming pot and the counter
    for (const x of [6, 25]) {
      p.rect(x, 8, 1, 1, C.ink3);
      p.rect(x - 1, 9, 3, 3, lit ? C.red : C.red2);
    }
    p.rect(11, 12, 7, 4, C.metal2);
    p.rect(11, 12, 7, 1, C.metal);
    if (on || night) puff(p, 14, 10);
    p.rect(0, 16, 32, 2, S.m);
    p.rect(0, 16, 32, 1, S.m3);
    p.rect(2, 18, 28, 6, C.wood2);
    for (let x = 4; x < 28; x += 4) p.rect(x, 19, 1, 4, C.wood4);
    p.rect(13, 19, 6, 3, C.ink2);
  },
  cyber_trash_bin: (p) => {
    p.rect(0, 2, 8, 2, S.b2);
    p.rect(1, 4, 6, 12, S.b);
    p.rect(1, 4, 1, 12, S.b3);
    p.rect(2, 7, 4, 1, S.b2);
    p.rect(2, 12, 4, 1, S.b2);
    p.rect(2, 0, 3, 2, C.paper2);
    p.px(5, 1, C.amber);
  },
  cyber_ac_unit: (p, { on }) => {
    box(p, 0, 0, 16, 7, S.m, S.m2);
    disc(p, 5, 3.5, 2.6, C.ink2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + (on ? 0.6 : 0);
      p.px(Math.round(4.5 + Math.cos(a) * 1.6), Math.round(3 + Math.sin(a) * 1.6), S.m3);
    }
    for (let y = 1; y < 6; y += 2) p.rect(10, y, 4, 1, S.m2);
    p.rect(2, 7, 1, 1, S.m2);
    p.rect(13, 7, 1, 1, S.m2);
  },
  cyber_cable_mess: (p) => {
    // cable clamp on the wall
    p.rect(3, 0, 26, 2, C.ink3);
    p.rect(3, 0, 26, 1, C.metal3);
    // thick loops hanging from it
    const loop = (x: number, w: number, depth: number, c: string) => {
      p.rect(x, 2, 1, depth, c);
      p.rect(x + w, 2, 1, depth, c);
      p.rect(x + 1, 2 + depth, w - 1, 1, c);
    };
    loop(2, 10, 3, S.a);
    loop(9, 12, 5, S.b);
    loop(18, 9, 2, S.a2);
    loop(24, 6, 4, S.b2);
    // connectors and a warning tag
    p.rect(13, 7, 2, 1, C.amber);
    p.rect(1, 4, 2, 2, C.ink2);
    p.px(1, 5, C.leaf3);
    p.rect(28, 5, 2, 2, C.amber);
  },
  cyber_arcade_cab: (p, { on, night }) => {
    const lit = on || night;
    p.rect(1, 0, 14, 5, lit ? S.a : S.a2);
    if (lit) text(p, 2, 0, 'GO!', C.white);
    box(p, 0, 5, 16, 27, S.b, S.b2);
    box(p, 2, 7, 12, 9, lit ? '#0b1021' : C.screenOff, C.ink);
    if (lit) {
      p.rect(4, 13, 3, 1, S.a3);
      p.px(9, 10, C.pink);
      p.px(11, 9, C.amber);
    }
    p.rect(1, 17, 14, 4, C.ink2);
    p.rect(3, 18, 1, 2, C.ink);
    disc(p, 3.5, 17.5, 1, C.red);
    p.px(9, 19, S.a3);
    p.px(11, 19, C.pink);
    p.rect(5, 23, 6, 3, C.ink);
    p.rect(1, 31, 14, 1, C.ink);
  },
  cyber_wet_asphalt: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#18181f');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = hash(x, y);
        if (r > 0.93) p.px(x, y, '#27272f');
        // neon reflections in puddles
        if (Math.sin(x / 9) + Math.cos(y / 3) > 1.55 && r > 0.25) p.px(x, y, r > 0.6 ? S.a : S.a2);
      }
    }
  },
  cyber_graffiti_wall: (p, { w, h }) => {
    p.rect(0, 0, w, h, '#3a3540');
    for (let row = 0; row * 4 < h; row++) {
      const off = row % 2 ? 4 : 0;
      for (let x = -off; x < w; x += 8) p.rect(x + 1, row * 4 + 1, 7, 3, hash(x, row) > 0.7 ? '#4a4452' : '#433d4a');
    }
    // Spray-painted: a word with a hard shadow and a run or two of paint, an
    // arrow under it and a crown beside it.
    for (let x = 4; x < w; x += 62) {
      text(p, x + 1, 13, 'LOG ON', C.ink);
      text(p, x, 12, 'LOG ON', S.b3);
      p.rect(x + 2, 18, 1, 4, S.b3);
      p.rect(x + 24, 18, 1, 3, S.b3);
      p.rect(x, 25, 24, 2, S.a);
      for (let i = 0; i < 5; i++) p.rect(x + 24 + i, 22 + i, 1, 8 - 2 * i, S.a);
      const cx = x + 42;
      p.rect(cx, 19, 12, 3, S.a3);
      for (const tip of [0, 5, 10]) p.rect(cx + tip, 15, 2, 4, S.a3);
      p.rect(cx + 1, 22, 10, 1, S.a2);
    }
  },
  cyber_holo_ad: (p, { on, night }) => {
    const lit = on || night;
    p.rect(7, 0, 2, 24, C.ink3);
    box(p, 0, 2, 16, 18, C.ink, C.ink2);
    if (lit) {
      for (let y = 3; y < 19; y += 2) p.rect(1, y, 14, 1, S.a2);
      disc(p, 8, 8, 3.4, S.a3);
      p.rect(5, 12, 7, 5, S.a);
      p.rect(6, 7, 1, 1, C.ink);
      p.rect(9, 7, 1, 1, C.ink);
    } else {
      p.rect(2, 4, 12, 14, C.ink2);
    }
  },
  cyber_crates: (p) => {
    for (const [x, y, w, h] of [
      [0, 8, 9, 8],
      [8, 9, 8, 7],
      [3, 1, 9, 7],
    ] as const) {
      box(p, x, y, w, h, S.b, S.b2);
      p.rect(x + 1, y + 1, w - 2, 1, S.b3);
      for (let i = 1; i < w - 1; i++) p.px(x + i, y + Math.round((i / (w - 1)) * (h - 1)), S.b2);
    }
  },
  cyber_hover_scooter: (p, { on, night }) => {
    const lit = on || night;
    p.rect(17, 1, 2, 9, S.m2);
    p.rect(15, 0, 6, 2, S.m);
    p.rect(2, 8, 20, 4, S.b);
    p.rect(2, 8, 20, 1, S.b3);
    p.rect(4, 6, 8, 2, C.ink2);
    p.rect(20, 9, 3, 2, lit ? C.glow : C.metal);
    p.rect(3, 12, 18, 1, S.m2);
    if (lit) for (let x = 4; x < 20; x += 2) p.px(x, 14, S.a3);
    p.rect(4, 13, 16, 1, lit ? S.a : C.ink3);
  },
  cyber_lantern_string: (p, { on, night }) => {
    const lit = on || night;
    for (let x = 0; x < 32; x++) p.px(x, 1 + Math.round(Math.sin((x / 32) * Math.PI) * 1.5), C.ink3);
    for (let x = 2; x < 32; x += 6) {
      const y = 2 + Math.round(Math.sin((x / 32) * Math.PI) * 1.5);
      p.rect(x, y, 3, 4, lit ? (x % 12 === 2 ? S.a3 : C.red) : x % 12 === 2 ? S.a2 : C.red2);
      p.rect(x, y + 4, 3, 1, C.ink2);
    }
  },
  cyber_power_box: (p, { on }) => {
    box(p, 0, 0, 8, 12, S.m, S.m2);
    p.rect(2, 3, 4, 3, C.amber);
    p.px(4, 4, C.ink);
    p.rect(3, 8, 2, 2, C.ink2);
    p.rect(1, 12, 6, 4, C.ink2);
    if (on) {
      p.px(7, 1, C.glow);
      p.px(6, 0, C.white);
    }
  },
};
