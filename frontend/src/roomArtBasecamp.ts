// MY ROOM art pack: OUTDOOR BASECAMP — a campsite indoors: wood stove,
// campfire, tent, hammock and lanterns. Fires and lanterns burn while the
// stopwatch runs or at night (`on || night`). Recolourable parts use the S
// slots (roomPaint.ts): b = canvas / fabric, a = gear accent, w = wood,
// m = metal.
import { box, C, disc, hash, S, type Art, type Painter } from './roomPaint';

/** A small flame (3 wide) with its tip at (x, y). */
const flame = (p: Painter, x: number, y: number, tall: number) => {
  p.px(x + 1, y, C.amber);
  p.rect(x, y + 1, 3, tall, C.orange);
  p.rect(x + 1, y + 1, 1, tall, C.glow);
};

export const BASECAMP_ART: Record<string, Art> = {
  camp_wood_stove: (p, { on, night }) => {
    const lit = on || night;
    p.rect(6, 0, 3, 9, S.m2);
    p.rect(6, 0, 1, 9, S.m3);
    box(p, 1, 9, 14, 12, S.m, S.m2);
    p.rect(2, 10, 12, 1, S.m3);
    box(p, 4, 12, 8, 6, lit ? C.ink : C.ink2, C.ink);
    if (lit) {
      flame(p, 5, 13, 4);
      flame(p, 8, 14, 3);
    } else {
      p.rect(5, 16, 6, 1, C.wood2);
    }
    p.rect(2, 21, 2, 3, S.m2);
    p.rect(12, 21, 2, 3, S.m2);
  },
  camp_cactus_giant: (p) => {
    p.rect(6, 2, 4, 20, C.leaf2);
    p.rect(7, 2, 1, 20, C.leaf);
    p.rect(6, 1, 4, 1, C.leaf);
    p.rect(1, 8, 2, 8, C.leaf2);
    p.rect(3, 13, 3, 2, C.leaf2);
    p.rect(13, 5, 2, 8, C.leaf2);
    p.rect(10, 10, 3, 2, C.leaf2);
    for (let y = 4; y < 20; y += 3) p.px(9, y, C.paper);
    p.px(2, 7, C.pink);
    p.px(14, 4, C.pink);
    p.rect(3, 22, 10, 10, S.b);
    p.rect(2, 22, 12, 2, S.b2);
    p.rect(3, 24, 10, 1, S.b3);
  },
  camp_lantern_stand: (p, { on, night }) => {
    const lit = on || night;
    p.rect(3, 2, 1, 22, S.m2);
    p.rect(3, 2, 4, 1, S.m2);
    p.rect(5, 3, 3, 1, S.m);
    p.rect(5, 4, 3, 5, lit ? C.glow : C.ink3);
    p.rect(5, 4, 3, 1, S.a);
    p.rect(5, 9, 3, 1, S.a);
    p.rect(1, 23, 5, 1, S.m2);
  },
  camp_hammock_stand: (p) => {
    // base on the floor, arms curving up and outward to the hooks
    p.rect(3, 14, 26, 2, S.w2);
    p.rect(3, 14, 26, 1, S.w);
    for (let i = 0; i < 12; i++) {
      const out = Math.round((i / 11) ** 2 * 3);
      p.rect(4 - out, 13 - i, 2, 1, S.w);
      p.rect(26 + out, 13 - i, 2, 1, S.w);
    }
    for (let x = 3; x < 29; x++) {
      const sag = Math.round(Math.sin(((x - 3) / 26) * Math.PI) * 6);
      p.rect(x, 3 + sag, 1, 2, Math.floor(x / 3) % 2 ? S.b : S.b3);
      p.px(x, 5 + sag, S.b2);
    }
  },
  camp_campfire: (p, { on, night }) => {
    const lit = on || night;
    for (let i = 0; i < 4; i++) p.rect(1 + i * 4, 6, 3, 2, C.paper2);
    p.rect(3, 4, 10, 2, S.w2);
    p.rect(5, 5, 6, 1, S.w);
    if (lit) {
      flame(p, 5, 0, 4);
      flame(p, 7, 1, 3);
      flame(p, 9, 2, 2);
    } else {
      p.px(7, 3, C.ink3);
      p.px(8, 2, C.ink3);
    }
  },
  camp_tent: (p, { on, night }) => {
    const lit = on || night;
    for (let y = 2; y < 23; y++) {
      const half = Math.round((y - 1) * 0.72);
      p.rect(16 - half, y, half * 2, 1, S.b);
      p.px(16 - half, y, S.b2);
      p.px(15 + half, y, S.b2);
    }
    for (let y = 9; y < 23; y++) {
      const half = Math.round((y - 8) * 0.45);
      p.rect(16 - half, y, half * 2, 1, lit ? C.amber : C.ink2);
    }
    p.rect(15, 0, 2, 3, S.m2);
    p.rect(1, 23, 30, 1, C.ink3);
    p.rect(14, 16, 4, 1, S.b3);
  },
  camp_folding_chair: (p) => {
    p.rect(0, 1, 1, 15, S.m2);
    p.rect(7, 1, 1, 15, S.m2);
    p.rect(1, 1, 6, 6, S.b);
    p.rect(1, 1, 6, 1, S.b3);
    p.rect(0, 8, 8, 3, S.b);
    p.rect(1, 11, 1, 1, S.m2);
    for (let i = 0; i < 5; i++) {
      p.px(1 + i, 11 + i, S.m);
      p.px(6 - i, 11 + i, S.m);
    }
  },
  camp_cooler: (p) => {
    box(p, 0, 1, 16, 7, S.a, S.a2);
    p.rect(1, 2, 14, 2, C.white);
    p.rect(6, 0, 4, 1, S.m2);
    p.rect(5, 1, 1, 1, S.m2);
    p.rect(10, 1, 1, 1, S.m2);
  },
  camp_backpack: (p) => {
    p.rect(1, 1, 6, 13, S.b);
    p.rect(1, 1, 6, 2, S.b2);
    p.rect(2, 7, 4, 5, S.b2);
    p.rect(3, 9, 2, 1, S.m);
    p.rect(0, 14, 8, 2, S.a);
    p.rect(1, 13, 6, 1, S.a2);
    p.px(7, 4, S.m);
  },
  camp_log_pile: (p) => {
    const logs: Array<[number, number]> = [
      [2, 5],
      [7, 5],
      [12, 5],
      [4.5, 2],
      [9.5, 2],
    ];
    logs.forEach(([x, y]) => {
      disc(p, x, y + 0.5, 2.6, S.w2);
      disc(p, x, y + 0.5, 1.6, S.w3);
      p.px(Math.floor(x), Math.floor(y), S.w);
    });
  },
  camp_canoe: (p) => {
    for (let x = 0; x < 32; x++) {
      const t = Math.abs(x - 15.5) / 16;
      const depth = Math.max(1, Math.round(5 * (1 - t * t)));
      p.rect(x, 1, 1, depth, S.a);
      p.px(x, 1, S.a3);
      if (depth > 2) p.px(x, depth, S.a2);
    }
    p.rect(8, 1, 1, 3, S.w);
    p.rect(23, 1, 1, 3, S.w);
    p.rect(14, 1, 4, 1, S.w);
    p.rect(4, 6, 1, 2, C.ink2);
    p.rect(27, 6, 1, 2, C.ink2);
  },
  camp_trail_map: (p) => {
    box(p, 0, 0, 16, 14, S.w, S.w2);
    p.rect(1, 1, 14, 12, '#d9cba3');
    for (let y = 2; y < 12; y++) for (let x = 2; x < 14; x++) if (hash(x, y) > 0.8) p.px(x, y, '#8fa98b');
    for (let i = 0; i < 12; i++) p.px(2 + i, 10 - Math.round(Math.sin(i / 2) * 2 + i * 0.5), C.red);
    p.px(13, 3, C.red2);
    p.rect(7, 14, 2, 2, S.w2);
  },
  camp_axe_wall: (p) => {
    p.rect(0, 0, 16, 2, S.w2);
    p.rect(2, 2, 12, 1, S.w);
    p.rect(4, 3, 9, 1, S.w3);
    p.rect(12, 2, 3, 4, S.m);
    p.rect(12, 5, 3, 1, S.m3);
    p.rect(3, 3, 1, 1, S.a);
  },
  camp_folding_table: (p, { on, night }) => {
    const lit = on || night;
    // little stove with a kettle
    p.rect(3, 0, 4, 3, S.m);
    p.rect(4, 3, 2, 1, S.m2);
    p.rect(2, 4, 6, 1, S.m2);
    if (lit) p.rect(3, 3, 4, 1, C.blue);
    p.rect(10, 2, 3, 3, S.a);
    p.rect(0, 5, 16, 1, S.w3);
    p.rect(0, 6, 16, 1, S.w2);
    p.px(1, 7, S.m2);
    p.px(14, 7, S.m2);
  },
  camp_forest_floor: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.b);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = hash(x, y * 2);
        if (r > 0.9) p.px(x, y, S.b3);
        else if (r < 0.12) p.px(x, y, S.b2);
        else if (r > 0.86) p.px(x, y, C.leaf2);
      }
    }
  },
  camp_log_wall: (p, { w, h }) => {
    for (let y = 0; y < h; y += 6) {
      p.rect(0, y, w, 6, S.w);
      p.rect(0, y, w, 1, S.w3);
      p.rect(0, y + 5, w, 1, S.w2);
      for (let x = (y * 7) % 23; x < w; x += 23) p.px(x, y + 2, S.w2);
    }
  },
};
