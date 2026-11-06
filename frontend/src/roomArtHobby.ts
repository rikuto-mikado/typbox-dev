// MY ROOM art pack: HOBBIES: what a room is for when the books are shut.
// Instruments, art and craft, table games, training kit and collections.
// Recolourable parts use the S slots (roomPaint.ts).
import { box, C, disc, S, type Art, type Painter } from './roomPaint';

/** Piano keys along y, w wide. */
const keys = (p: Painter, x: number, y: number, w: number) => {
  p.rect(x, y, w, 2, C.white);
  for (let k = x + 1; k < x + w; k += 2) if ((k - x) % 7 !== 5) p.px(k, y, C.ink);
};

export const HOBBY_ART: Record<string, Art> = {
  // --------------------------------------------------------------- music
  keyboard_stand: (p) => {
    p.rect(9, 0, 6, 3, C.white);
    p.rect(10, 1, 4, 1, C.ink3);
    p.rect(0, 3, 24, 2, S.m);
    p.rect(0, 3, 24, 1, S.m3);
    p.px(2, 4, '#ef4444');
    keys(p, 1, 5, 22);
    for (let i = 0; i < 9; i++) {
      p.px(6 + i, 7 + i, C.ink3);
      p.px(17 - i, 7 + i, C.ink3);
    }
  },
  ukulele_wall: (p) => {
    p.rect(3, 0, 2, 4, S.w2);
    p.px(2, 0, C.metal);
    p.px(5, 1, C.metal);
    p.rect(3, 4, 2, 4, S.w2);
    disc(p, 4, 9.5, 2.6, S.w);
    disc(p, 4, 13, 3.2, S.w);
    disc(p, 4, 11, 1, C.ink2);
    p.rect(3, 14, 3, 1, S.w2);
    for (let y = 4; y < 14; y++) p.px(4, y, y > 9 && y < 12 ? C.ink2 : C.paper);
  },
  trumpet_stand: (p) => {
    p.rect(0, 3, 6, 1, S.m);
    p.rect(1, 4, 4, 1, S.m2);
    p.px(0, 2, S.m2);
    for (const x of [2, 3, 4]) p.rect(x, 1, 1, 2, S.m3);
    p.rect(5, 2, 1, 3, S.m);
    p.rect(6, 0, 2, 7, S.m);
    p.rect(6, 0, 1, 7, S.m3);
    p.rect(2, 5, 3, 2, C.ink3);
    p.rect(3, 7, 1, 7, C.ink3);
    p.rect(1, 14, 5, 2, C.ink3);
  },
  sax_stand: (p) => {
    p.rect(3, 0, 3, 1, S.m2);
    p.rect(5, 1, 1, 3, S.m);
    p.rect(3, 4, 3, 13, S.m);
    p.rect(3, 4, 1, 13, S.m3);
    for (let y = 6; y < 15; y += 2) p.px(5, y, C.white);
    p.rect(1, 16, 5, 3, S.m);
    p.rect(0, 13, 3, 4, S.m);
    p.rect(0, 13, 3, 1, S.m3);
    p.rect(2, 19, 4, 1, C.ink3);
    p.rect(1, 20, 1, 4, C.ink3);
    p.rect(6, 20, 1, 4, C.ink3);
    p.rect(1, 23, 6, 1, C.ink3);
  },
  cajon: (p) => {
    p.rect(1, 0, 6, 8, S.w);
    p.rect(1, 0, 6, 1, S.w3);
    disc(p, 4, 4.5, 1.4, C.ink2);
    p.rect(6, 0, 1, 8, S.w2);
  },
  music_stand: (p) => {
    p.rect(0, 1, 8, 7, S.m);
    p.rect(1, 2, 3, 5, C.white);
    p.rect(4, 2, 3, 5, C.white);
    for (let y = 3; y < 7; y++) {
      p.px(2, y, C.ink3);
      p.px(5, y, C.ink3);
    }
    p.rect(0, 8, 8, 1, S.m2);
    p.rect(3, 9, 2, 12, S.m2);
    for (let i = 0; i < 3; i++) {
      p.px(3 - i, 21 + i, S.m);
      p.px(4 + i, 21 + i, S.m);
    }
    p.rect(3, 21, 2, 3, S.m);
  },
  dtm_desk: (p, { on }) => {
    box(p, 7, 0, 10, 6, on ? C.screenOn : C.screenOff, C.ink);
    if (on) for (let x = 9; x < 15; x++) p.px(x, 2 + ((x * 3) % 3), C.leaf3);
    p.rect(0, 2, 4, 6, C.ink2);
    disc(p, 2, 5, 1.2, C.metal3);
    p.rect(20, 2, 4, 6, C.ink2);
    disc(p, 22, 5, 1.2, C.metal3);
    p.rect(6, 7, 12, 1, C.ink3);
    keys(p, 7, 6, 10);
    p.rect(0, 8, 24, 2, S.w3);
    p.rect(0, 9, 24, 1, S.w);
    p.rect(1, 10, 2, 6, S.w2);
    p.rect(21, 10, 2, 6, S.w2);
    p.rect(4, 11, 16, 1, S.w2);
    for (let x = 6; x < 18; x += 3) p.rect(x, 12, 2, 1, on ? '#f97316' : C.ink3);
  },
  accordion: (p) => {
    p.rect(0, 1, 2, 7, S.a);
    p.rect(6, 1, 2, 7, S.a);
    for (let x = 2; x < 6; x++) p.rect(x, 1, 1, 7, x % 2 ? C.white : C.ink3);
    p.rect(0, 2, 1, 5, C.white);
    p.px(7, 3, C.white);
    p.px(7, 5, C.white);
  },
  electric_drums: (p) => {
    p.rect(11, 3, 1, 18, C.metal2);
    p.rect(3, 4, 18, 1, C.metal2);
    const pad = (x: number, y: number, w: number) => {
      p.rect(x, y, w, 2, C.ink2);
      p.rect(x, y, w, 1, C.ink3);
    };
    pad(1, 2, 5);
    pad(17, 1, 6);
    pad(5, 8, 5);
    pad(13, 8, 5);
    pad(18, 12, 5);
    p.rect(4, 13, 6, 3, C.ink2);
    p.rect(4, 13, 6, 1, C.ink3);
    p.rect(13, 13, 2, 3, C.ink3);
    p.px(13, 13, '#ef4444');
    p.rect(1, 20, 22, 1, C.metal3);
    p.rect(3, 21, 1, 3, C.metal3);
    p.rect(20, 21, 1, 3, C.metal3);
    p.rect(8, 21, 4, 3, C.ink3);
  },
  // ------------------------------------------------------------- art, craft
  paint_cart: (p) => {
    p.rect(0, 0, 1, 14, S.m2);
    p.rect(7, 0, 1, 14, S.m2);
    for (const y of [4, 9, 13]) p.rect(0, y, 8, 1, S.m);
    const tubes = ['#ef4444', '#3b82f6', '#fde047', '#22c55e', C.white];
    tubes.forEach((c, i) => p.rect(1 + i, 1 + (i % 2), 1, 3 - (i % 2), c));
    p.rect(1, 6, 2, 3, '#7c4a2d');
    p.rect(1, 5, 1, 1, '#a16207');
    p.rect(4, 5, 1, 4, C.wood);
    p.px(4, 4, C.ink);
    p.rect(5, 6, 2, 3, C.white);
    p.rect(1, 10, 6, 3, C.paper);
    p.px(0, 15, C.ink2);
    p.px(7, 15, C.ink2);
  },
  canvas_stack: (p) => {
    p.rect(0, 2, 7, 14, C.oak);
    p.rect(1, 3, 5, 12, C.white);
    p.rect(2, 5, 3, 3, '#38bdf8');
    p.rect(2, 9, 3, 4, '#fbbf24');
    p.rect(4, 6, 4, 10, C.oak2);
    p.rect(5, 7, 3, 9, '#f5f5f4');
    p.rect(1, 0, 3, 2, C.oak3);
  },
  yarn_basket: (p) => {
    disc(p, 2.5, 2.5, 2, '#f472b6');
    disc(p, 5.5, 2, 1.8, '#38bdf8');
    p.px(2, 2, '#f9a8d4');
    p.px(5, 1, '#bae6fd');
    p.rect(6, 0, 1, 3, C.paper2);
    p.rect(7, 0, 1, 1, C.paper2);
    p.rect(0, 4, 8, 4, C.oak);
    for (let y = 4; y < 8; y += 2) p.rect(0, y, 8, 1, C.oak3);
  },
  loom: (p) => {
    p.rect(0, 0, 16, 2, S.w);
    p.rect(0, 0, 2, 16, S.w2);
    p.rect(14, 0, 2, 16, S.w2);
    for (let x = 3; x < 13; x++) p.rect(x, 2, 1, 7, C.paper);
    for (let y = 6; y < 10; y++) p.rect(2, y, 12, 1, ['#c2483b', '#d4a017', '#0d9488', '#c2483b'][y - 6]);
    p.rect(2, 10, 12, 2, S.w);
    p.rect(2, 13, 12, 1, S.w2);
  },
  craft_table: (p) => {
    p.rect(2, 4, 5, 3, '#22c55e');
    for (let x = 2; x < 7; x += 2) p.px(x, 4, '#86efac');
    p.rect(9, 5, 1, 2, '#ef4444');
    p.rect(10, 4, 1, 3, '#3b82f6');
    p.rect(13, 3, 4, 4, '#fbcfe8');
    p.rect(19, 5, 3, 2, C.metal);
    p.rect(0, 7, 24, 2, S.w3);
    p.rect(0, 8, 24, 1, S.w);
    for (const x of [1, 21]) p.rect(x, 9, 2, 7, S.w2);
    p.rect(4, 10, 6, 5, S.w);
    p.rect(4, 12, 6, 1, S.w2);
  },
  jigsaw_table: (p) => {
    for (let x = 2; x < 22; x += 2) for (let y = 0; y < 2; y++) p.px(x + (y % 2), y + 1, ['#38bdf8', '#22c55e', '#fbbf24', '#f472b6'][(x + y) % 4]);
    p.rect(4, 1, 5, 1, '#0ea5e9');
    p.rect(14, 1, 3, 1, '#16a34a');
    p.rect(0, 3, 24, 2, S.w3);
    p.rect(0, 4, 24, 1, S.w);
    p.rect(1, 5, 2, 3, S.w2);
    p.rect(21, 5, 2, 3, S.w2);
  },
  brick_city: (p) => {
    p.rect(0, 6, 24, 2, '#16a34a');
    p.rect(1, 2, 5, 4, '#ef4444');
    p.rect(1, 1, 5, 1, '#b91c1c');
    p.rect(3, 4, 1, 2, C.ink3);
    p.rect(7, 0, 4, 6, '#3b82f6');
    for (let y = 1; y < 6; y += 2) p.px(8, y, '#bfdbfe');
    p.rect(12, 3, 6, 3, '#fbbf24');
    p.rect(13, 2, 4, 1, '#f97316');
    p.rect(19, 4, 4, 2, C.white);
    p.px(20, 3, '#22c55e');
    for (let x = 0; x < 24; x += 2) p.px(x, 6, '#22c55e');
  },
  train_set: (p) => {
    p.rect(0, 6, 32, 1, C.walnut);
    for (let x = 0; x < 32; x += 3) p.px(x, 7, C.walnut2);
    p.rect(0, 5, 32, 1, C.metal2);
    p.rect(2, 1, 8, 4, '#ef4444');
    p.rect(3, 0, 3, 1, C.ink2);
    p.rect(7, 2, 2, 2, '#bae6fd');
    p.rect(11, 2, 7, 3, '#22c55e');
    p.rect(19, 2, 7, 3, '#3b82f6');
    p.rect(27, 3, 4, 2, '#fbbf24');
    for (const x of [3, 8, 12, 16, 20, 24, 28]) p.px(x, 5, C.ink);
  },
  dollhouse: (p) => {
    for (let i = 0; i < 4; i++) p.rect(7 - i * 2, i, 2 + i * 4, 1, S.a2);
    p.rect(0, 4, 16, 12, S.a);
    p.rect(1, 5, 6, 5, '#fef3c7');
    p.rect(9, 5, 6, 5, '#e0f2fe');
    p.rect(1, 11, 6, 4, '#fce7f3');
    p.rect(9, 11, 6, 4, '#ecfccb');
    p.rect(2, 8, 3, 2, '#ef4444');
    p.rect(11, 7, 2, 3, C.walnut);
    p.rect(3, 13, 2, 2, '#3b82f6');
    p.rect(10, 13, 4, 1, C.oak);
    p.rect(0, 10, 16, 1, S.a2);
    p.rect(8, 4, 1, 12, S.a2);
  },
  // ------------------------------------------------------------- games
  game_table: (p) => {
    p.rect(3, 5, 8, 2, '#16a34a');
    p.rect(4, 4, 2, 1, '#ef4444');
    p.rect(8, 4, 1, 1, '#3b82f6');
    p.rect(13, 4, 3, 3, C.white);
    p.px(14, 5, C.ink);
    p.rect(18, 5, 3, 2, '#fbbf24');
    p.rect(0, 7, 24, 2, S.w3);
    p.rect(0, 8, 24, 1, S.w);
    p.rect(1, 9, 2, 7, S.w2);
    p.rect(21, 9, 2, 7, S.w2);
  },
  foosball: (p) => {
    p.rect(0, 2, 24, 6, S.w);
    p.rect(0, 2, 24, 1, S.w3);
    p.rect(2, 3, 20, 4, '#16a34a');
    for (let x = 4; x < 21; x += 4) {
      p.rect(x, 0, 1, 10, C.metal);
      p.px(x, 4 + (x % 8 ? 0 : 1), x % 8 ? '#ef4444' : '#3b82f6');
    }
    p.px(12, 5, C.white);
    p.rect(1, 8, 22, 2, S.w2);
    p.rect(2, 10, 2, 6, S.w2);
    p.rect(20, 10, 2, 6, S.w2);
  },
  air_hockey: (p) => {
    p.rect(14, 0, 4, 2, C.ink2);
    p.rect(15, 0, 1, 1, '#ef4444');
    p.rect(16, 0, 1, 1, '#ef4444');
    p.rect(0, 2, 32, 4, C.white);
    p.rect(0, 2, 32, 1, '#3b82f6');
    p.rect(15, 3, 2, 3, '#fca5a5');
    disc(p, 6, 4, 1.4, '#ef4444');
    disc(p, 25, 4, 1.4, '#3b82f6');
    p.px(11, 4, C.ink);
    p.rect(0, 6, 32, 3, '#1e3a8a');
    p.rect(1, 9, 30, 1, C.ink3);
    p.rect(2, 10, 3, 6, C.ink3);
    p.rect(27, 10, 3, 6, C.ink3);
  },
  table_tennis: (p) => {
    p.rect(1, 0, 14, 20, S.a);
    p.rect(1, 0, 14, 1, S.a3);
    p.rect(1, 0, 1, 20, C.white);
    p.rect(14, 0, 1, 20, C.white);
    p.rect(1, 19, 14, 1, C.white);
    p.rect(7, 0, 2, 20, C.white);
    p.rect(1, 20, 14, 1, C.ink3);
    p.rect(2, 21, 1, 3, C.ink3);
    p.rect(13, 21, 1, 3, C.ink3);
    disc(p, 4, 22, 1, C.ink2);
    disc(p, 12, 22, 1, C.ink2);
  },
  mahjong_table: (p) => {
    for (let x = 2; x < 22; x += 2) {
      p.rect(x, 4, 2, 3, C.white);
      p.px(x, 4, '#16a34a');
    }
    p.rect(0, 7, 24, 2, '#15803d');
    p.rect(0, 7, 24, 1, '#16a34a');
    p.rect(0, 9, 24, 1, S.w);
    p.rect(1, 10, 2, 6, S.w2);
    p.rect(21, 10, 2, 6, S.w2);
    p.rect(3, 10, 18, 1, S.w2);
  },
  go_board: (p) => {
    p.rect(0, 1, 16, 4, S.w);
    p.rect(0, 1, 16, 1, S.w3);
    for (let x = 2; x < 15; x += 3) p.px(x, 2, C.ink3);
    p.px(5, 1, C.ink);
    p.px(8, 1, C.white);
    p.px(11, 1, C.ink);
    p.rect(0, 5, 16, 1, S.w2);
    for (const x of [1, 13]) p.rect(x, 6, 2, 2, S.w2);
    p.rect(6, 6, 4, 2, S.w2);
  },
  // ------------------------------------------------------------- sport
  skateboard: (p) => {
    p.rect(1, 4, 6, 1, S.b);
    p.px(0, 3, S.b);
    p.px(7, 3, S.b);
    p.rect(1, 5, 6, 1, C.ink3);
    disc(p, 2, 6.5, 0.9, C.white);
    disc(p, 6, 6.5, 0.9, C.white);
  },
  snowboard_rack: (p) => {
    p.rect(0, 2, 8, 2, C.ink3);
    p.rect(0, 20, 8, 2, C.ink3);
    p.rect(2, 0, 4, 1, S.a);
    p.rect(1, 1, 6, 22, S.a);
    p.rect(2, 23, 4, 1, S.a);
    p.rect(1, 1, 1, 22, S.a3);
    p.rect(3, 6, 2, 12, S.a2);
    p.rect(2, 8, 4, 2, C.ink2);
    p.rect(2, 14, 4, 2, C.ink2);
  },
  rowing_machine: (p) => {
    p.rect(0, 5, 32, 1, S.m);
    p.rect(0, 6, 32, 1, S.m2);
    disc(p, 27, 3.5, 3.4, S.m);
    disc(p, 27, 3.5, 2, C.ink3);
    p.rect(12, 3, 5, 2, C.ink2);
    p.rect(21, 3, 3, 2, C.ink3);
    p.rect(23, 1, 1, 2, C.metal2);
    p.rect(0, 7, 3, 1, C.ink3);
    p.rect(29, 7, 3, 1, C.ink3);
  },
  weight_bench: (p) => {
    // a bar on its rack over a padded bench
    p.rect(0, 2, 24, 1, C.metal);
    p.rect(1, 0, 2, 5, C.ink2);
    p.rect(21, 0, 2, 5, C.ink2);
    p.rect(19, 3, 1, 13, C.ink3);
    p.rect(4, 3, 1, 13, C.ink3);
    p.rect(2, 8, 20, 2, S.a);
    p.rect(2, 8, 20, 1, S.a3);
    p.rect(8, 10, 2, 6, C.ink3);
    p.rect(14, 10, 2, 6, C.ink3);
    p.rect(3, 15, 18, 1, C.ink3);
  },
  pull_up_bar: (p) => {
    p.rect(0, 2, 2, 5, S.m2);
    p.rect(14, 2, 2, 5, S.m2);
    p.rect(1, 3, 14, 1, S.m3);
    p.rect(3, 3, 2, 1, C.ink2);
    p.rect(11, 3, 2, 1, C.ink2);
  },
  foam_rollers: (p) => {
    p.rect(0, 5, 8, 3, '#38bdf8');
    p.rect(0, 5, 8, 1, '#7dd3fc');
    for (let x = 1; x < 8; x += 2) p.px(x, 6, '#0284c7');
    p.rect(1, 2, 6, 3, '#f472b6');
    p.rect(1, 2, 6, 1, '#f9a8d4');
  },
  balance_board: (p) => {
    p.rect(0, 4, 8, 1, S.w3);
    p.rect(0, 5, 8, 1, S.w);
    disc(p, 4, 7, 1.6, S.w2);
  },
  boxing_gloves: (p) => {
    p.rect(3, 0, 2, 2, C.paper2);
    p.px(4, 2, C.paper2);
    for (const x of [0, 4]) {
      p.rect(x, 3, 4, 8, S.b);
      p.rect(x, 3, 4, 1, S.b3);
      p.rect(x, 11, 4, 3, C.white);
      p.px(x + 3, 6, S.b2);
    }
  },
  golf_bag: (p) => {
    p.rect(2, 0, 1, 4, C.metal);
    p.rect(4, 0, 1, 3, C.metal2);
    p.rect(5, 1, 1, 3, C.metal);
    p.rect(1, 0, 2, 1, C.ink2);
    p.rect(4, 0, 2, 1, C.ink2);
    p.rect(1, 3, 6, 19, S.a);
    p.rect(1, 3, 6, 1, S.a3);
    p.rect(1, 3, 1, 19, S.a3);
    p.rect(1, 9, 6, 1, C.white);
    p.rect(6, 11, 2, 6, S.a2);
    p.rect(1, 22, 6, 2, C.ink3);
  },
  baseball_set: (p) => {
    p.rect(5, 0, 2, 14, C.oak);
    p.rect(5, 0, 1, 14, C.oak3);
    p.rect(5, 14, 2, 1, C.walnut);
    p.rect(0, 10, 5, 5, '#a16207');
    p.rect(1, 9, 3, 1, '#a16207');
    p.rect(1, 11, 3, 2, '#ca8a04');
    disc(p, 2, 15, 0.9, C.white);
  },
  yoga_blocks: (p) => {
    p.rect(0, 4, 8, 4, S.a);
    p.rect(0, 4, 8, 1, S.a3);
    p.rect(1, 1, 6, 3, S.a2);
    p.rect(1, 1, 6, 1, S.a);
  },
  rock_collection: (p) => {
    p.rect(0, 2, 16, 1, S.w2);
    p.rect(0, 3, 16, 3, S.w);
    for (let x = 1; x < 16; x += 3) {
      p.rect(x, 0, 2, 2, ['#a78bfa', '#f472b6', '#94a3b8', '#fbbf24', '#34d399'][Math.floor(x / 3)]);
      p.px(x, 0, C.white);
    }
    p.rect(1, 4, 14, 1, S.w2);
    p.rect(1, 6, 2, 2, S.w2);
    p.rect(13, 6, 2, 2, S.w2);
  },
  camera_shelf: (p) => {
    const cam = (x: number, w: number, body: string) => {
      p.rect(x, 2, w, 4, body);
      p.rect(x, 2, w, 1, C.metal);
      disc(p, x + w / 2, 4, 1.4, C.ink);
      p.px(Math.floor(x + w / 2), 4, '#60a5fa');
    };
    cam(1, 6, C.ink2);
    cam(9, 5, '#a16207');
    cam(16, 6, C.metal2);
    p.rect(0, 6, 24, 2, S.w);
    p.rect(0, 6, 24, 1, S.w3);
  },
  orrery: (p) => {
    p.rect(7, 8, 2, 6, S.m);
    p.rect(4, 14, 8, 2, S.m2);
    p.rect(4, 14, 8, 1, S.m);
    disc(p, 8, 7, 2, '#fbbf24');
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      p.px(Math.round(8 + Math.cos(t) * 6.5), Math.round(7 + Math.sin(t) * 2.5), S.m3);
    }
    disc(p, 2, 6, 1, '#3b82f6');
    disc(p, 13, 8, 1.2, '#ef4444');
    p.px(10, 4, '#a3a3a3');
  },
  rc_plane_wall: (p) => {
    p.rect(2, 3, 18, 2, S.a);
    p.rect(2, 3, 18, 1, S.a3);
    p.rect(8, 1, 6, 1, S.a2);
    p.rect(6, 2, 10, 1, S.a);
    p.rect(8, 5, 6, 1, S.a2);
    p.rect(18, 1, 3, 2, S.a);
    p.rect(19, 0, 2, 1, S.a2);
    p.rect(0, 3, 2, 2, C.ink3);
    p.rect(0, 1, 1, 6, C.metal2);
    p.px(4, 3, '#bae6fd');
  },
  card_display: (p) => {
    p.rect(0, 0, 16, 16, S.w);
    p.rect(1, 1, 14, 14, C.ink2);
    const colors = ['#fbbf24', '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316'];
    for (let i = 0; i < 6; i++) {
      const x = 2 + (i % 3) * 4;
      const y = 2 + Math.floor(i / 3) * 6;
      p.rect(x, y, 3, 5, colors[i]);
      p.rect(x, y + 1, 3, 2, C.white);
      p.px(x + 1, y + 1, colors[(i + 2) % 6]);
    }
  },
  fishing_rods: (p) => {
    p.rect(0, 1, 8, 1, C.wood2);
    p.rect(0, 26, 8, 1, C.wood2);
    p.rect(2, 0, 1, 30, '#78716c');
    p.rect(5, 0, 1, 31, '#a16207');
    p.rect(2, 22, 1, 6, C.ink3);
    p.rect(5, 22, 1, 7, C.ink3);
    p.rect(3, 20, 2, 2, C.metal);
    p.rect(6, 18, 2, 2, C.metal);
  },
  sewing_machine: (p) => {
    p.rect(0, 0, 7, 2, S.m);
    p.rect(0, 0, 7, 1, S.m3);
    p.rect(5, 2, 2, 4, S.m);
    p.rect(1, 2, 1, 3, C.metal2);
    p.rect(0, 5, 8, 2, S.m);
    p.rect(0, 7, 8, 1, S.m2);
    p.rect(2, 2, 3, 1, '#f472b6');
    disc(p, 6, 3, 0.8, C.metal2);
  },
  pedalboard: (p, { on }) => {
    p.rect(0, 4, 16, 4, C.ink2);
    p.rect(0, 4, 16, 1, C.ink3);
    for (const [x, c] of [
      [1, '#f97316'],
      [5, '#22c55e'],
      [9, '#3b82f6'],
      [13, '#fde047'],
    ] as const) {
      p.rect(x, 1, 3, 4, c);
      p.px(x + 1, 2, on ? '#ef4444' : C.ink3);
      p.px(x + 1, 4, C.metal);
    }
  },
  ballet_barre: (p) => {
    p.rect(1, 0, 22, 9, '#cfe8f3');
    p.rect(1, 0, 22, 1, C.metal);
    p.rect(3, 2, 1, 5, C.white);
    p.rect(4, 2, 1, 2, C.white);
    p.rect(1, 8, 22, 1, '#b8dcea');
    p.rect(0, 11, 24, 2, S.w);
    p.rect(0, 11, 24, 1, S.w3);
    for (const x of [3, 20]) p.rect(x, 13, 1, 3, C.metal2);
  },
};
