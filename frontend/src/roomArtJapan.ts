// MY ROOM art pack: Japanese room. Recolourable parts use the S slots
// (roomPaint.ts) so catalog variants can swap them.
import { box, C, disc, S, type Art } from './roomPaint';

export const JAPAN_ART: Record<string, Art> = {
  kotatsu: (p, { on }) => {
    // mikan on the top board
    p.rect(9, 1, 3, 3, C.orange);
    p.px(10, 0, C.leaf2);
    p.rect(13, 2, 3, 2, C.orange);
    p.rect(1, 4, 22, 2, S.w3);
    p.rect(1, 5, 22, 1, S.w);
    // quilt
    p.rect(0, 6, 24, 9, S.a);
    p.rect(0, 6, 24, 1, S.a3);
    for (let x = 2; x < 24; x += 5) p.rect(x, 8, 2, 2, S.a2);
    for (let x = 4; x < 24; x += 5) p.rect(x, 11, 2, 2, S.a2);
    if (on) p.rect(6, 14, 12, 1, C.orange);
    p.rect(0, 15, 24, 1, S.a2);
  },
  zabuton: (p) => {
    p.rect(0, 5, 8, 3, S.a);
    p.rect(1, 4, 6, 1, S.a);
    p.rect(1, 4, 6, 1, S.a3);
    p.px(4, 5, S.a2);
    p.rect(0, 7, 8, 1, S.a2);
  },
  byobu: (p) => {
    for (let i = 0; i < 4; i++) {
      const x = i * 6;
      p.rect(x, 0, 6, 22, S.w2);
      p.rect(x + 1, 1, 4, 20, i % 2 ? '#e8d9b0' : '#efe3c0');
    }
    // a gold cloud and a pine branch across the panels
    p.rect(2, 4, 9, 2, C.amber);
    p.rect(14, 3, 7, 2, C.amber);
    p.rect(4, 13, 12, 1, C.walnut);
    p.rect(13, 11, 1, 2, C.walnut);
    for (const [x, y] of [[5, 11], [9, 12], [14, 9], [17, 12]] as const) p.rect(x, y, 3, 2, C.leaf2);
    p.rect(0, 22, 24, 2, S.w2);
  },
  noren: (p) => {
    p.rect(0, 0, 16, 1, S.w2);
    p.rect(1, 1, 14, 12, S.a);
    p.rect(7, 4, 1, 9, S.a2);
    p.rect(1, 1, 14, 1, S.a2);
    disc(p, 4, 6, 1.8, C.white);
    disc(p, 11, 6, 1.8, C.white);
    p.rect(1, 13, 6, 1, S.a2);
    p.rect(8, 13, 7, 1, S.a2);
  },
  kakejiku: (p) => {
    p.rect(0, 0, 8, 1, S.w2);
    p.px(4, 0, C.ink);
    p.rect(1, 1, 6, 21, S.a);
    p.rect(2, 3, 4, 16, C.paper);
    // ink mountain and moon
    p.rect(3, 5, 2, 2, C.red);
    p.rect(2, 13, 4, 1, C.ink3);
    p.rect(3, 12, 2, 1, C.ink3);
    p.px(4, 11, C.ink2);
    p.rect(2, 16, 1, 2, C.ink2);
    p.rect(0, 22, 8, 2, S.w2);
  },
  chochin: (p, { on, night }) => {
    const lit = on || night;
    p.rect(3, 0, 2, 2, C.ink);
    p.rect(1, 2, 6, 1, C.ink);
    disc(p, 4, 7.5, 3.6, lit ? '#fb7185' : S.b);
    p.rect(1, 5, 6, 1, lit ? '#fda4af' : S.b2);
    p.rect(1, 8, 6, 1, lit ? '#fda4af' : S.b2);
    p.rect(1, 11, 6, 1, lit ? '#fda4af' : S.b2);
    p.rect(1, 12, 6, 1, C.ink);
    p.rect(3, 13, 2, 3, C.ink);
  },
  andon: (p, { on, night }) => {
    const lit = on || night;
    p.rect(1, 0, 6, 1, S.w2);
    box(p, 1, 1, 6, 11, lit ? C.glow : C.paper, S.w2);
    p.rect(4, 1, 1, 11, S.w2);
    p.rect(1, 6, 6, 1, S.w2);
    p.rect(1, 12, 1, 4, S.w2);
    p.rect(6, 12, 1, 4, S.w2);
  },
  daruma: (p) => {
    disc(p, 4, 4.5, 3.6, S.b);
    disc(p, 4, 3.6, 2, C.white);
    p.px(3, 3, C.ink);
    p.px(5, 3, C.ink);
    p.rect(3, 6, 3, 1, C.amber);
    p.rect(1, 7, 6, 1, S.b2);
  },
  maneki_neko: (p) => {
    p.rect(1, 2, 6, 6, C.white);
    p.px(1, 1, C.white);
    p.px(5, 1, C.white);
    p.rect(6, 0, 2, 3, C.white);
    p.px(2, 3, C.ink);
    p.px(4, 3, C.ink);
    p.rect(2, 5, 3, 1, S.b);
    p.px(3, 6, C.amber);
    p.px(5, 1, C.pink);
    p.rect(1, 7, 6, 1, C.paper2);
  },
  tansu: (p) => {
    // step chest: tall left, short right
    p.rect(0, 0, 13, 16, S.w2);
    p.rect(13, 7, 11, 9, S.w2);
    for (let r = 0; r < 4; r++) {
      box(p, 1, 1 + r * 4, 11, 3, S.w, S.w2);
      p.rect(5, 2 + r * 4, 3, 1, C.ink);
    }
    for (let r = 0; r < 2; r++) {
      box(p, 14, 8 + r * 4, 9, 3, S.w, S.w2);
      p.rect(17, 9 + r * 4, 3, 1, C.ink);
    }
    p.rect(15, 5, 3, 2, C.paper);
    p.rect(19, 4, 3, 3, C.leaf2);
  },
  futon: (p) => {
    p.rect(0, 2, 6, 3, C.white);
    p.rect(0, 2, 6, 1, C.paper2);
    p.rect(5, 1, 27, 5, S.a);
    p.rect(5, 1, 27, 1, S.a3);
    for (let x = 8; x < 32; x += 6) p.rect(x, 3, 3, 1, S.a2);
    p.rect(0, 6, 32, 2, C.paper);
    p.rect(0, 7, 32, 1, C.paper2);
  },
  chabudai: (p) => {
    // teapot and two cups on a low round table
    p.rect(9, 0, 5, 4, S.a);
    p.px(14, 1, S.a);
    p.rect(10, 0, 3, 1, S.a2);
    p.rect(4, 2, 2, 2, C.paper);
    p.rect(17, 2, 2, 2, C.paper);
    p.rect(1, 4, 22, 1, S.w3);
    p.rect(0, 5, 24, 1, S.w);
    p.rect(3, 6, 2, 2, S.w2);
    p.rect(19, 6, 2, 2, S.w2);
  },
  ikebana: (p) => {
    p.rect(3, 0, 1, 10, C.leaf2);
    p.rect(1, 3, 2, 1, C.leaf2);
    p.px(1, 2, C.leaf2);
    p.rect(4, 4, 2, 1, C.leaf);
    p.rect(2, 0, 3, 2, C.pink);
    p.rect(5, 6, 2, 2, C.white);
    p.px(5, 6, C.amber);
    p.rect(1, 10, 6, 1, S.a3);
    p.rect(1, 11, 6, 5, S.a);
    p.rect(2, 15, 4, 1, S.a2);
  },
  wave_print: (p) => {
    box(p, 0, 0, 24, 16, '#efe3c0', S.w2);
    // a curling wave, foam and a small mountain
    p.rect(2, 10, 20, 5, '#1e3a6e');
    for (const [x, y, r] of [[7, 8, 4.5], [15, 10, 3.5]] as const) {
      disc(p, x, y, r, '#2f5597');
      disc(p, x + 1, y + 1, r - 1.6, '#efe3c0');
    }
    for (const [x, y] of [[4, 4], [6, 4], [8, 4], [10, 5], [13, 7], [16, 7], [18, 8]] as const) p.px(x, y, C.white);
    p.rect(18, 6, 3, 1, C.metal2);
    p.px(19, 5, C.white);
    p.rect(3, 2, 2, 2, C.red);
  },
  furin: (p) => {
    p.px(4, 0, C.ink3);
    disc(p, 4, 3, 2.4, C.sky);
    p.px(3, 2, C.white);
    p.px(5, 3, C.red);
    p.rect(4, 5, 1, 1, C.ink3);
    p.rect(3, 6, 3, 2, C.white);
    p.px(4, 7, C.red);
  },
  kadomatsu: (p) => {
    for (const [x, top] of [[1, 2], [3, 0], [5, 3]] as const) {
      p.rect(x, top, 2, 10 - top, C.leaf);
      p.px(x, top, '#bef264');
      p.px(x + 1, top + 1, C.leaf2);
    }
    p.rect(0, 7, 8, 2, C.leaf2);
    p.px(1, 8, C.red);
    p.px(6, 8, C.red);
    p.rect(0, 9, 8, 7, '#c9a77c');
    for (let y = 10; y < 16; y += 2) p.rect(0, y, 8, 1, '#a8865b');
  },
  bonsai_pine: (p) => {
    p.rect(7, 8, 2, 5, C.walnut);
    p.rect(5, 7, 3, 1, C.walnut);
    p.rect(9, 5, 2, 1, C.walnut);
    p.rect(4, 4, 7, 3, C.leaf2);
    p.rect(9, 2, 6, 3, C.leaf2);
    p.rect(1, 6, 6, 2, C.leaf2);
    p.rect(5, 4, 4, 1, C.leaf);
    p.rect(10, 2, 3, 1, C.leaf);
    p.rect(2, 6, 3, 1, C.leaf);
    p.rect(2, 13, 12, 1, S.a3);
    p.rect(3, 14, 10, 2, S.a);
  },
};
