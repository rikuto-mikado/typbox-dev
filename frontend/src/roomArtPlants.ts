// MY ROOM art pack: plants. Pots and planters use the S slots (roomPaint.ts)
// so catalog variants can swap them; the greens stay green.
import { C, disc, S, type Art, type Painter } from './roomPaint';

/** A tapered pot standing on the bottom edge, in slot b (terracotta by default). */
const pot = (p: Painter, x: number, top: number, w: number, bottom: number) => {
  p.rect(x, top, w, 1, S.b3);
  p.rect(x, top + 1, w, bottom - top - 1, S.b);
  p.rect(x + 1, bottom - 1, w - 2, 1, S.b2);
  p.rect(x + w - 2, top + 1, 1, bottom - top - 2, S.b2);
};

/** A single leaf blade from (x, y) leaning dx per row, `len` rows tall. */
const blade = (p: Painter, x: number, y: number, len: number, dx: number, color: string) => {
  for (let i = 0; i < len; i++) p.px(Math.round(x + dx * i), y - i, color);
};

export const PLANTS_ART: Record<string, Art> = {
  fern: (p) => {
    const fronds: Array<[number, number]> = [[-0.9, 7], [-0.5, 9], [0, 10], [0.5, 9], [0.9, 7]];
    fronds.forEach(([dx, len], i) => {
      blade(p, 4, 9, len, dx, i % 2 ? C.leaf : C.leaf2);
      for (let j = 2; j < len; j += 2) p.px(Math.round(4 + dx * j) + (dx < 0 ? -1 : 1), 9 - j, C.leaf3);
    });
    pot(p, 1, 10, 6, 16);
  },
  palm: (p) => {
    p.rect(7, 6, 2, 13, C.wood2);
    for (let y = 8; y < 19; y += 3) p.px(8, y, C.wood);
    const leaves: Array<[number, number]> = [[-1.6, 6], [-1, 7], [-0.3, 7], [0.3, 7], [1, 7], [1.6, 6]];
    leaves.forEach(([dx, len], i) => {
      for (let j = 0; j < len; j++) {
        const x = Math.round(8 + dx * j);
        const y = 7 - Math.round(j * (1 - Math.abs(dx) * 0.35)) + (j > len - 3 ? j - (len - 3) : 0);
        p.rect(x - 1, y, 2, 1, i % 2 ? C.leaf : C.leaf2);
      }
    });
    pot(p, 4, 19, 8, 24);
  },
  succulents: (p) => {
    disc(p, 2, 4, 1.6, C.teal3);
    p.px(2, 4, C.teal);
    disc(p, 5.5, 3, 2, C.leaf3);
    p.px(5, 3, C.leaf);
    p.px(6, 2, C.pink);
    p.rect(0, 5, 8, 1, S.b3);
    p.rect(0, 6, 8, 2, S.b);
    p.rect(1, 7, 6, 1, S.b2);
  },
  orchid: (p) => {
    p.rect(3, 2, 1, 10, C.leaf2);
    p.rect(4, 2, 2, 1, C.leaf2);
    for (const [x, y] of [[5, 3], [2, 4], [5, 6], [2, 7]] as const) {
      p.rect(x, y, 2, 2, C.pink);
      p.px(x, y, C.white);
    }
    p.rect(1, 11, 2, 2, C.leaf);
    p.rect(4, 11, 3, 1, C.leaf);
    p.rect(1, 12, 6, 4, S.b);
    p.rect(1, 12, 6, 1, S.b3);
  },
  sunflower: (p) => {
    p.rect(3, 4, 1, 8, C.leaf2);
    p.rect(1, 7, 2, 1, C.leaf);
    p.rect(4, 9, 2, 1, C.leaf);
    disc(p, 3.5, 2.5, 2.5, C.amber);
    disc(p, 3.5, 2.5, 1.2, C.wood2);
    p.rect(1, 11, 6, 5, S.a);
    p.rect(1, 11, 6, 1, S.a3);
    p.rect(5, 12, 1, 4, S.a2);
  },
  tulip_vase: (p) => {
    for (const [x, c] of [[1, C.red], [3, C.pink], [5, C.amber]] as const) {
      p.rect(x, 0, 2, 2, c);
      p.px(x, 0, C.white);
    }
    p.rect(2, 2, 1, 2, C.leaf2);
    p.rect(4, 2, 1, 2, C.leaf2);
    p.rect(5, 2, 1, 2, C.leaf2);
    p.rect(2, 4, 4, 1, S.a2);
    p.rect(1, 5, 6, 3, S.a);
    p.px(2, 5, S.a3);
  },
  bamboo: (p) => {
    for (const [x, top] of [[1, 2], [3, 0], [5, 3]] as const) {
      p.rect(x, top, 1, 18 - top, C.leaf);
      for (let y = top + 3; y < 18; y += 4) p.px(x, y, C.leaf2);
      p.rect(x + 1, top + 1, 2, 1, C.leaf2);
      p.rect(x - 1, top + 5, 1, 2, C.leaf3);
    }
    p.rect(0, 18, 8, 1, S.b3);
    p.rect(1, 19, 6, 5, S.b);
    p.rect(1, 23, 6, 1, S.b2);
  },
  olive_tree: (p) => {
    p.rect(7, 12, 2, 13, C.wood2);
    p.px(6, 16, C.wood2);
    p.px(9, 14, C.wood2);
    for (const [x, y, r] of [[5, 7, 4], [11, 6, 4], [8, 3, 3], [4, 12, 2], [12, 11, 3]] as const) {
      disc(p, x, y, r, '#6b8e4e');
      disc(p, x - 0.5, y - 0.5, r - 1.3, '#8aab69');
    }
    for (const [x, y] of [[4, 6], [10, 4], [12, 9], [6, 10]] as const) p.px(x, y, C.ink3);
    pot(p, 3, 25, 10, 32);
  },
  hanging_ivy: (p) => {
    p.rect(3, 0, 1, 3, C.metal3);
    p.rect(1, 3, 6, 1, S.b3);
    p.rect(1, 4, 6, 3, S.b);
    for (const [x, len] of [[1, 9], [3, 6], [5, 10], [6, 7]] as const) {
      for (let y = 5; y < 5 + len; y++) p.px(x + ((y >> 1) % 2), y, y % 3 ? C.leaf : C.leaf2);
    }
  },
  moss_frame: (p) => {
    p.rect(0, 0, 16, 16, S.w2);
    p.rect(1, 1, 14, 14, C.moss2);
    for (let y = 1; y < 15; y++) {
      for (let x = 1; x < 15; x++) {
        const n = Math.sin(x * 12.9 + y * 78.2) * 43758.5;
        const r = n - Math.floor(n);
        if (r > 0.55) p.px(x, y, r > 0.85 ? C.leaf3 : C.moss);
      }
    }
    p.rect(1, 1, 14, 1, S.w);
  },
  terrarium: (p) => {
    disc(p, 4, 4, 3.6, C.sky);
    p.rect(1, 5, 6, 2, C.wood);
    p.rect(2, 4, 2, 1, C.leaf);
    p.px(3, 3, C.leaf3);
    p.px(5, 4, C.amber);
    p.px(2, 1, C.white);
    p.rect(1, 7, 6, 1, S.m);
  },
  rubber_plant: (p) => {
    p.rect(4, 3, 1, 15, C.wood2);
    for (const [x, y, flip] of [[1, 2, 0], [5, 4, 1], [1, 8, 0], [5, 10, 1], [2, 13, 0]] as const) {
      p.rect(x, y, 3, 2, '#2f6b47');
      p.px(flip ? x + 2 : x, y, C.leaf2);
      p.px(x + 1, y, '#3f6b4b');
    }
    p.rect(4, 0, 1, 3, '#2f6b47');
    pot(p, 1, 18, 6, 24);
  },
  bird_of_paradise: (p) => {
    const leaves: Array<[number, number, number]> = [[3, -0.4, 13], [6, -0.1, 16], [9, 0.2, 15], [12, 0.5, 12]];
    leaves.forEach(([x, dx, len]) => {
      for (let j = 0; j < len; j++) {
        const cx = Math.round(x + dx * j);
        p.rect(cx, 18 - j, j > len - 6 ? 3 : 1, 1, j > len - 6 ? C.leaf : C.leaf2);
      }
    });
    p.rect(7, 4, 3, 1, C.orange);
    p.rect(8, 3, 2, 1, C.amber);
    p.px(10, 5, C.blue);
    pot(p, 3, 18, 10, 24);
  },
  aloe: (p) => {
    for (const [x, dx, len] of [[2, -0.5, 4], [3, 0, 5], [4, 0, 6], [5, 0.5, 4]] as const) blade(p, x, 5, len, dx, '#6aa58a');
    p.px(3, 1, '#8fc2aa');
    p.rect(1, 5, 6, 3, S.b);
    p.rect(1, 5, 6, 1, S.b3);
  },
  lemon_tree: (p) => {
    p.rect(7, 12, 2, 7, C.wood2);
    disc(p, 8, 7, 6, C.leaf2);
    disc(p, 7.5, 6.5, 4.5, C.leaf);
    for (const [x, y] of [[4, 6], [9, 3], [11, 8], [6, 10], [8, 7]] as const) {
      p.rect(x, y, 2, 2, C.amber);
      p.px(x, y, '#fde68a');
    }
    pot(p, 3, 19, 10, 24);
  },
  cherry_blossom: (p) => {
    p.rect(9, 16, 3, 15, C.walnut);
    p.rect(6, 12, 1, 5, C.walnut);
    p.rect(7, 16, 2, 1, C.walnut);
    p.rect(13, 13, 1, 4, C.walnut);
    p.rect(12, 16, 1, 1, C.walnut);
    for (const [x, y, r] of [[5, 9, 4.5], [11, 6, 5], [17, 10, 4], [9, 12, 3.5], [15, 4, 3]] as const) {
      disc(p, x, y, r, C.pink);
      disc(p, x - 1, y - 1, r - 1.8, '#fbcfe8');
    }
    for (const [x, y] of [[3, 20], [16, 22], [6, 26], [19, 18]] as const) p.px(x, y, '#fbcfe8');
    p.rect(4, 30, 15, 2, C.moss);
    p.rect(5, 29, 13, 1, C.moss2);
  },
  flower_box: (p) => {
    const blooms = [C.red, C.amber, C.purple, C.pink, C.white, C.orange];
    for (let i = 0; i < 6; i++) {
      const x = 1 + i * 2.5;
      p.rect(Math.round(x) + 1, 3, 1, 3, C.leaf2);
      p.rect(Math.round(x), 1 + (i % 2), 2, 2, blooms[i]);
    }
    p.rect(0, 5, 16, 1, C.leaf);
    p.rect(0, 6, 16, 1, S.w3);
    p.rect(0, 7, 16, 1, S.w);
    p.rect(1, 7, 1, 1, S.w2);
  },
  saguaro: (p) => {
    p.rect(3, 1, 3, 18, C.leaf2);
    p.rect(4, 0, 1, 1, C.leaf2);
    p.rect(4, 2, 1, 16, C.leaf);
    p.rect(0, 6, 1, 5, C.leaf2);
    p.rect(1, 10, 2, 1, C.leaf2);
    p.rect(7, 4, 1, 6, C.leaf2);
    p.rect(6, 9, 1, 1, C.leaf2);
    p.px(4, 0, C.pink);
    pot(p, 1, 18, 7, 24);
  },
  money_tree: (p) => {
    p.rect(3, 7, 2, 4, C.wood3);
    p.px(2, 6, C.wood3);
    p.px(5, 6, C.wood3);
    for (const [x, y] of [[1, 2], [5, 1], [3, 0], [0, 5], [6, 4], [3, 4]] as const) {
      p.rect(x, y, 2, 2, C.leaf);
      p.px(x, y, C.leaf3);
    }
    pot(p, 1, 11, 6, 16);
  },
  hanging_basket: (p) => {
    p.px(3, 0, C.metal3);
    p.px(2, 1, C.metal3);
    p.px(4, 1, C.metal3);
    p.px(1, 2, C.metal3);
    p.px(5, 2, C.metal3);
    p.rect(0, 3, 7, 2, C.leaf);
    p.px(1, 3, C.pink);
    p.px(4, 3, C.amber);
    p.px(6, 3, C.pink);
    p.rect(1, 5, 5, 2, S.w);
    p.rect(1, 5, 5, 1, S.w3);
    for (const x of [0, 2, 5, 6]) p.rect(x, 7, 1, 3 + (x % 3), C.leaf2);
  },
  cactus_trio: (p) => {
    p.rect(1, 2, 2, 4, C.leaf2);
    p.px(1, 1, C.pink);
    p.rect(4, 0, 2, 6, C.leaf);
    p.px(3, 3, C.leaf);
    p.rect(6, 3, 1, 3, C.leaf3);
    p.rect(0, 6, 8, 2, S.b);
    p.rect(0, 6, 8, 1, S.b3);
  },
  venus_flytrap: (p) => {
    for (const [x, y] of [[1, 2], [4, 1], [5, 4]] as const) {
      p.rect(x, y, 3, 2, C.leaf);
      p.rect(x, y + 1, 3, 1, C.red);
      p.px(x, y, C.leaf3);
    }
    p.rect(2, 4, 1, 2, C.leaf2);
    p.rect(1, 6, 6, 2, S.b);
    p.rect(1, 6, 6, 1, S.b3);
  },
};
