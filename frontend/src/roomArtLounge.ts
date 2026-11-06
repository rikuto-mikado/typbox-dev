// MY ROOM art pack: LOUNGE: the half of the room for doing nothing. Sofas
// and chairs, tables to put a cup on, rugs, the TV and speakers (lit while
// the stopwatch runs, `on`), and the frames that go up on the wall above
// the sofa. Recolourable parts use the S slots (roomPaint.ts).
import { books, box, C, disc, S, type Art, type Painter } from './roomPaint';

/** A fabric couch w px wide, 16 high: back, cushions, rolled arms, legs. */
const couch = (p: Painter, w: number, seats: number, legs: string) => {
  p.rect(2, 2, w - 4, 7, S.a2);
  p.rect(2, 2, w - 4, 1, S.a);
  const cw = Math.floor((w - 8) / seats);
  for (let i = 0; i < seats; i++) {
    p.rect(4 + i * cw, 3, cw - 1, 6, S.a);
    p.rect(4 + i * cw, 3, cw - 1, 1, S.a3);
    p.rect(4 + i * cw, 9, cw - 1, 3, S.a);
    p.rect(4 + i * cw, 9, cw - 1, 1, S.a3);
  }
  for (const x of [0, w - 4]) {
    p.rect(x, 6, 4, 8, S.a);
    p.rect(x, 6, 4, 1, S.a3);
    p.rect(x + (x ? 0 : 3), 7, 1, 7, S.a2);
  }
  p.rect(4, 12, w - 8, 2, S.a2);
  p.rect(1, 14, 2, 2, legs);
  p.rect(w - 3, 14, 2, 2, legs);
};

export const LOUNGE_ART: Record<string, Art> = {
  // -------------------------------------------------------------- sofas
  sofa_bed: (p) => {
    couch(p, 32, 3, C.ink3);
    p.rect(5, 10, 22, 1, S.a2);
    p.rect(22, 7, 6, 4, C.paper);
    p.rect(22, 7, 6, 1, C.white);
  },
  sofa_cord: (p) => {
    couch(p, 32, 2, C.walnut);
    for (let x = 5; x < 28; x += 2) {
      p.rect(x, 4, 1, 4, S.a2);
      p.rect(x, 10, 1, 2, S.a2);
    }
    p.rect(6, 5, 4, 4, '#efe6d2');
    p.rect(6, 5, 4, 1, C.white);
  },
  floor_sofa: (p) => {
    p.rect(0, 0, 24, 4, S.a2);
    p.rect(0, 0, 24, 1, S.a);
    for (let x = 1; x < 24; x += 8) {
      p.rect(x, 1, 6, 3, S.a);
      p.rect(x, 1, 6, 1, S.a3);
    }
    p.rect(0, 4, 24, 3, S.a);
    p.rect(0, 4, 24, 1, S.a3);
    p.rect(0, 7, 24, 1, S.a2);
  },
  chaise: (p) => {
    p.rect(0, 1, 4, 13, S.a2);
    p.rect(0, 1, 4, 1, S.a);
    p.rect(1, 2, 2, 1, S.a3);
    p.rect(4, 6, 19, 3, S.a);
    p.rect(4, 6, 19, 1, S.a3);
    p.rect(2, 4, 4, 3, S.a3);
    p.rect(4, 9, 19, 3, S.a2);
    for (let x = 7; x < 23; x += 5) p.px(x, 7, S.a2);
    p.rect(1, 12, 1, 4, C.walnut);
    p.rect(21, 12, 1, 4, C.walnut);
    p.rect(1, 12, 21, 1, C.walnut3);
  },
  armchair_retro: (p) => {
    p.rect(2, 0, 12, 9, S.a);
    p.rect(2, 0, 12, 1, S.a3);
    for (let x = 4; x < 13; x += 3) p.px(x, 3, S.a2);
    for (let x = 5; x < 12; x += 3) p.px(x, 6, S.a2);
    p.rect(0, 7, 3, 4, S.w);
    p.rect(13, 7, 3, 4, S.w);
    p.rect(0, 7, 3, 1, S.w3);
    p.rect(13, 7, 3, 1, S.w3);
    p.rect(3, 9, 10, 3, S.a);
    p.rect(3, 9, 10, 1, S.a3);
    p.rect(1, 12, 14, 1, S.w2);
    p.rect(2, 13, 1, 3, S.w2);
    p.rect(13, 13, 1, 3, S.w2);
    p.px(1, 15, S.w2);
    p.px(14, 15, S.w2);
  },
  recliner: (p) => {
    p.rect(1, 1, 5, 11, S.a);
    p.rect(1, 1, 5, 1, S.a3);
    p.rect(2, 4, 3, 1, S.a2);
    p.rect(5, 8, 7, 3, S.a);
    p.rect(5, 8, 7, 1, S.a3);
    p.rect(12, 9, 4, 2, S.a);
    p.rect(12, 9, 4, 1, S.a3);
    p.rect(3, 6, 8, 3, S.a2);
    p.rect(3, 6, 8, 1, S.a);
    p.rect(1, 11, 11, 3, S.a2);
    p.rect(13, 11, 1, 2, C.ink3);
    p.rect(2, 14, 9, 2, C.ink3);
  },
  bean_lounger: (p) => {
    p.rect(1, 1, 6, 6, S.a);
    p.rect(2, 0, 4, 1, S.a);
    p.rect(1, 1, 1, 5, S.a3);
    p.rect(5, 3, 10, 4, S.a);
    p.rect(6, 3, 8, 1, S.a3);
    p.rect(0, 6, 16, 2, S.a2);
    p.rect(3, 4, 3, 1, S.a2);
  },
  pouf_knit: (p) => {
    p.rect(1, 2, 6, 1, S.a3);
    p.rect(0, 3, 8, 5, S.a);
    for (let x = 0; x < 8; x += 2) for (let y = 3; y < 8; y += 2) p.px(x + ((y >> 1) % 2), y, S.a2);
    p.rect(0, 7, 8, 1, S.a2);
  },
  ottoman_box: (p) => {
    p.rect(0, 1, 16, 3, S.a);
    p.rect(0, 1, 16, 1, S.a3);
    for (let x = 3; x < 16; x += 4) p.px(x, 2, S.a2);
    p.rect(0, 4, 16, 1, S.a2);
    p.rect(1, 5, 14, 2, S.a);
    p.rect(1, 7, 2, 1, C.walnut);
    p.rect(13, 7, 2, 1, C.walnut);
  },
  floor_pillows: (p) => {
    p.rect(0, 4, 9, 4, S.a);
    p.rect(0, 4, 9, 1, S.a3);
    p.rect(4, 5, 1, 3, S.a2);
    p.rect(7, 2, 9, 6, '#efe6d2');
    p.rect(7, 2, 9, 1, '#faf5ea');
    for (let x = 8; x < 16; x += 2) p.px(x, 7, '#d9cdb2');
    p.rect(10, 4, 3, 2, S.a2);
  },
  rattan_chair: (p) => {
    // a round rattan back fanning out, a cushion
    disc(p, 8, 6, 6.5, S.w);
    disc(p, 8, 6, 5, S.w3);
    for (let a = 0; a < 7; a++) p.rect(3 + a * 2, 2, 1, 7, S.w2);
    p.rect(2, 9, 12, 3, S.a);
    p.rect(2, 9, 12, 1, S.a3);
    p.rect(3, 12, 10, 1, S.w2);
    p.rect(3, 13, 1, 3, S.w2);
    p.rect(12, 13, 1, 3, S.w2);
    p.rect(5, 15, 6, 1, S.w2);
  },
  butterfly_chair: (p) => {
    p.rect(0, 0, 1, 3, C.ink3);
    p.rect(7, 0, 1, 3, C.ink3);
    p.rect(1, 1, 6, 6, S.b);
    p.rect(1, 1, 6, 1, S.b3);
    p.rect(2, 7, 4, 4, S.b);
    p.rect(2, 10, 4, 1, S.b2);
    p.rect(1, 6, 1, 2, S.b2);
    p.rect(6, 6, 1, 2, S.b2);
    for (let i = 0; i < 5; i++) {
      p.px(1 + i, 11 + i, C.ink3);
      p.px(6 - i, 11 + i, C.ink3);
    }
  },
  sofa_modular: (p) => {
    for (let i = 0; i < 4; i++) {
      const x = i * 8;
      p.rect(x, 3, 8, 5, S.a2);
      p.rect(x + 1, 3, 6, 1, S.a);
      p.rect(x, 8, 8, 6, S.a);
      p.rect(x, 8, 8, 1, S.a3);
      p.rect(x + 7, 8, 1, 6, S.a2);
    }
    p.rect(0, 14, 32, 2, S.a2);
    p.rect(4, 5, 5, 4, C.white);
    p.rect(22, 5, 5, 4, '#d4a017');
  },
  // -------------------------------------------------------------- tables
  coffee_table_round: (p) => {
    p.rect(5, 0, 3, 2, C.white);
    p.rect(9, 1, 3, 1, C.red);
    p.rect(1, 2, 14, 2, S.w3);
    p.rect(0, 3, 16, 1, S.w);
    p.rect(2, 4, 12, 1, S.w2);
    p.rect(3, 5, 1, 3, S.w2);
    p.rect(12, 5, 1, 3, S.w2);
    p.rect(7, 5, 2, 3, S.w2);
  },
  coffee_table_glass: (p) => {
    books(p, 3, 3, 5, 2);
    p.rect(14, 1, 3, 2, C.leaf2);
    p.rect(15, 0, 1, 1, C.leaf);
    p.rect(0, 3, 24, 1, '#cfe8f3');
    p.rect(2, 3, 4, 1, C.white);
    p.rect(0, 4, 24, 1, S.m);
    p.rect(1, 5, 1, 3, S.m);
    p.rect(22, 5, 1, 3, S.m);
    p.rect(2, 6, 20, 1, '#cfe8f3');
    p.rect(1, 7, 22, 1, S.m2);
  },
  side_table_c: (p) => {
    p.rect(2, 0, 2, 2, C.white);
    p.rect(0, 2, 7, 1, S.m);
    p.rect(6, 2, 1, 6, S.m);
    p.rect(0, 7, 7, 1, S.m);
    p.rect(0, 2, 7, 1, S.m3);
  },
  nesting_tables: (p) => {
    p.rect(0, 2, 10, 1, S.w3);
    p.rect(0, 3, 10, 1, S.w);
    p.rect(1, 4, 1, 4, S.w2);
    p.rect(8, 4, 1, 4, S.w2);
    p.rect(6, 4, 10, 1, S.w);
    p.rect(6, 4, 10, 1, S.w3);
    p.rect(7, 5, 1, 3, S.w2);
    p.rect(14, 5, 1, 3, S.w2);
    p.rect(2, 0, 3, 2, '#fbcfe8');
  },
  console_table: (p) => {
    p.rect(2, 3, 3, 4, '#efe6d2');
    p.rect(3, 0, 1, 3, C.leaf2);
    p.rect(2, 1, 1, 1, C.leaf);
    books(p, 9, 7, 6, 4);
    p.rect(17, 2, 5, 5, C.amber);
    p.rect(18, 3, 3, 3, '#cfe8f3');
    p.rect(0, 7, 24, 2, S.w3);
    p.rect(0, 8, 24, 1, S.w);
    p.rect(1, 9, 1, 7, S.w2);
    p.rect(22, 9, 1, 7, S.w2);
    p.rect(1, 13, 22, 1, S.w2);
    p.rect(5, 11, 6, 2, C.cork);
  },
  tv_board: (p) => {
    p.rect(3, 0, 6, 2, C.ink3);
    p.rect(4, 1, 1, 1, C.leaf3);
    p.rect(20, 0, 4, 2, C.white);
    p.rect(0, 2, 32, 5, S.w);
    p.rect(0, 2, 32, 1, S.w3);
    p.rect(1, 3, 9, 3, S.w2);
    box(p, 11, 3, 10, 3, S.w, S.w2);
    box(p, 22, 3, 9, 3, S.w, S.w2);
    p.rect(15, 4, 2, 1, C.metal);
    books(p, 2, 6, 7, 1);
    p.rect(1, 7, 2, 1, S.w2);
    p.rect(29, 7, 2, 1, S.w2);
  },
  tv_wide: (p, { on }) => {
    box(p, 1, 0, 30, 15, on ? '#0b3b4f' : C.screenOff, C.ink);
    if (on) {
      p.rect(2, 1, 28, 6, '#38bdf8');
      p.rect(2, 7, 28, 6, '#15803d');
      disc(p, 24, 4, 2, '#fde68a');
      for (let x = 2; x < 30; x += 5) p.rect(x, 6, 3, 1, '#22c55e');
    } else {
      p.rect(3, 2, 6, 1, C.ink3);
      p.rect(3, 3, 3, 1, C.ink3);
    }
    p.rect(14, 15, 4, 1, C.ink2);
    p.rect(0, 16, 32, 5, S.w);
    p.rect(0, 16, 32, 1, S.w3);
    box(p, 2, 17, 13, 4, S.w, S.w2);
    box(p, 17, 17, 13, 4, S.w, S.w2);
    p.rect(5, 18, 6, 2, C.ink3);
    p.px(6, 18, C.leaf3);
    p.rect(1, 21, 2, 3, S.w2);
    p.rect(29, 21, 2, 3, S.w2);
  },
  speakers_floor: (p) => {
    p.rect(0, 0, 8, 24, S.w);
    p.rect(0, 0, 8, 1, S.w3);
    p.rect(7, 0, 1, 24, S.w2);
    disc(p, 3.5, 4, 1.8, C.ink2);
    disc(p, 3.5, 11, 2.6, C.ink2);
    disc(p, 3.5, 11, 1.2, C.metal3);
    disc(p, 3.5, 18, 2.6, C.ink2);
    disc(p, 3.5, 18, 1.2, C.metal3);
    p.rect(0, 23, 8, 1, C.ink3);
  },
  subwoofer: (p) => {
    p.rect(0, 0, 8, 8, S.w);
    p.rect(0, 0, 8, 1, S.w3);
    disc(p, 4, 4.5, 2.8, C.ink2);
    disc(p, 4, 4.5, 1.4, C.metal3);
    p.rect(7, 0, 1, 8, S.w2);
  },
  // -------------------------------------------------------------- rugs
  rug_berber: (p) => {
    p.rect(0, 5, 32, 3, S.a);
    p.rect(0, 5, 32, 1, S.a3);
    for (let x = 2; x < 32; x += 6) {
      p.px(x, 6, C.ink3);
      p.px(x + 1, 7, C.ink3);
      p.px(x + 2, 6, C.ink3);
    }
  },
  rug_stripe: (p) => {
    p.rect(0, 5, 32, 3, C.paper);
    for (let x = 0; x < 32; x += 6) p.rect(x, 5, 3, 3, S.a);
    p.rect(0, 5, 32, 1, C.white);
    for (let x = 0; x < 32; x += 6) p.rect(x, 5, 3, 1, S.a3);
  },
  rug_checker: (p) => {
    for (let x = 0; x < 32; x += 4) {
      p.rect(x, 5, 4, 3, (x / 4) % 2 ? S.a : C.paper);
      p.rect(x, 7, 4, 1, (x / 4) % 2 ? C.paper : S.a);
    }
    p.rect(0, 5, 32, 1, C.white);
  },
  rug_braided: (p) => {
    p.rect(2, 5, 20, 1, S.a);
    p.rect(0, 6, 24, 2, S.a2);
    for (let x = 0; x < 24; x += 2) p.px(x, 6, S.a3);
    for (let x = 1; x < 24; x += 3) p.px(x, 7, '#efe6d2');
  },
  // ----------------------------------------------------------- small things
  throw_basket: (p) => {
    p.rect(1, 0, 6, 3, S.a);
    p.rect(1, 0, 6, 1, S.a3);
    p.rect(2, 1, 1, 2, S.a2);
    p.rect(5, 1, 2, 2, C.paper);
    p.rect(0, 3, 8, 5, C.oak);
    for (let y = 3; y < 8; y += 2) p.rect(0, y, 8, 1, C.oak3);
  },
  board_games: (p) => {
    p.rect(0, 5, 8, 3, '#1e3a6e');
    p.rect(1, 6, 4, 1, C.white);
    p.rect(1, 3, 7, 2, C.red);
    p.rect(2, 3, 3, 1, '#fde047');
    p.rect(0, 1, 6, 2, '#16a34a');
    p.rect(1, 1, 2, 1, C.white);
    p.rect(2, 0, 4, 1, C.paper);
  },
  divider_shelf: (p) => {
    p.rect(0, 0, 16, 24, S.w);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) p.rect(1 + c * 7, 1 + r * 7, 7 - c, 6, S.w2);
    p.rect(8, 0, 1, 22, S.w);
    books(p, 2, 7, 5, 2);
    p.rect(10, 4, 3, 3, C.pot);
    p.rect(10, 2, 4, 2, C.leaf2);
    p.rect(2, 10, 4, 4, C.white);
    p.rect(3, 11, 2, 2, C.sky2);
    books(p, 10, 14, 5, 6);
    p.rect(2, 17, 5, 4, C.cork);
    p.rect(10, 18, 4, 3, '#fde68a');
    p.rect(0, 22, 16, 2, S.w2);
  },
  rattan_screen: (p) => {
    for (let i = 0; i < 3; i++) {
      const x = i * 8;
      p.rect(x, 0, 8, 22, S.w);
      p.rect(x + 1, 1, 6, 20, S.w3);
      for (let y = 2; y < 20; y += 2) for (let xx = x + 1 + ((y / 2) % 2); xx < x + 7; xx += 2) p.px(xx, y, S.w2);
      p.rect(x, 22, 1, 2, S.w2);
      p.rect(x + 7, 22, 1, 2, S.w2);
    }
  },
  upright_piano: (p) => {
    p.rect(0, 0, 24, 2, S.w2);
    p.rect(1, 2, 22, 9, S.w);
    p.rect(3, 4, 18, 5, S.w2);
    p.rect(8, 1, 6, 1, C.white);
    p.rect(9, 0, 4, 1, C.white);
    p.rect(0, 11, 24, 1, S.w2);
    p.rect(1, 12, 22, 2, C.white);
    for (let x = 2; x < 22; x += 3) p.rect(x, 12, 1, 1, C.ink);
    p.rect(1, 14, 22, 1, S.w2);
    p.rect(2, 15, 20, 7, S.w);
    p.rect(2, 15, 2, 9, S.w2);
    p.rect(20, 15, 2, 9, S.w2);
    p.rect(10, 22, 1, 1, C.amber2);
    p.rect(13, 22, 1, 1, C.amber2);
  },
  fan_tower: (p) => {
    p.rect(2, 0, 4, 1, S.m3);
    p.rect(1, 1, 6, 18, S.m);
    p.rect(1, 1, 1, 18, S.m3);
    for (let y = 4; y < 17; y += 2) p.rect(3, y, 3, 1, S.m2);
    p.px(4, 2, C.leaf3);
    p.rect(3, 19, 2, 3, S.m2);
    p.rect(0, 22, 8, 2, S.m);
  },
  kerosene_heater: (p, { on }) => {
    p.rect(2, 0, 4, 1, C.metal2);
    p.rect(1, 1, 6, 3, C.metal);
    p.rect(0, 4, 8, 7, S.m);
    p.rect(0, 4, 8, 1, S.m3);
    p.rect(1, 5, 6, 4, C.ink2);
    for (let x = 1; x < 7; x += 2) p.rect(x, 5, 1, 4, on ? '#f97316' : C.ink3);
    if (on) p.rect(2, 7, 4, 1, '#fde68a');
    p.rect(0, 11, 8, 4, S.m2);
    p.rect(2, 12, 4, 1, '#60a5fa');
    p.rect(0, 15, 8, 1, C.ink3);
  },
  window_bench: (p) => {
    p.rect(1, 2, 6, 5, '#efe6d2');
    p.rect(17, 3, 5, 4, S.a2);
    p.rect(0, 7, 24, 3, S.a);
    p.rect(0, 7, 24, 1, S.a3);
    box(p, 0, 10, 24, 6, S.w, S.w2);
    p.rect(8, 10, 1, 6, S.w2);
    p.rect(16, 10, 1, 6, S.w2);
    p.rect(3, 12, 2, 1, C.metal);
    p.rect(11, 12, 2, 1, C.metal);
    p.rect(19, 12, 2, 1, C.metal);
  },
  // -------------------------------------------------------------- wall
  photo_ledge: (p) => {
    p.rect(1, 1, 5, 5, C.ink3);
    p.rect(2, 2, 3, 3, C.sky2);
    p.rect(2, 4, 3, 1, C.leaf2);
    p.rect(7, 2, 4, 4, C.white);
    p.rect(8, 3, 2, 2, '#f472b6');
    p.rect(12, 0, 6, 6, C.paper);
    p.rect(13, 1, 4, 4, '#fde68a');
    p.rect(14, 2, 2, 1, C.orange);
    p.rect(19, 3, 4, 3, C.walnut);
    p.rect(20, 4, 2, 1, C.white);
    p.rect(0, 6, 24, 2, S.w);
    p.rect(0, 6, 24, 1, S.w3);
  },
  art_canvas: (p) => {
    p.rect(0, 0, 24, 16, '#f6f3ee');
    p.rect(0, 15, 24, 1, '#cfc9bd');
    disc(p, 8, 7, 5, S.a);
    p.rect(13, 3, 8, 10, '#1e3a6e');
    p.rect(3, 11, 12, 3, '#d4a017');
    disc(p, 17, 6, 2, '#efe6d2');
    p.rect(2, 2, 1, 6, C.ink);
  },
  family_photos: (p) => {
    const frames: [number, number, number, number, string][] = [
      [0, 0, 7, 8, C.sky2],
      [8, 1, 8, 5, '#fde68a'],
      [1, 9, 6, 6, '#86efac'],
      [8, 7, 7, 8, '#f9a8d4'],
    ];
    for (const [x, y, w, h, c] of frames) {
      p.rect(x, y, w, h, S.w);
      p.rect(x + 1, y + 1, w - 2, h - 2, c);
      disc(p, x + w / 2, y + h / 2, 1.3, C.ink3);
    }
  },
  projector_mini: (p, { on }) => {
    p.rect(0, 3, 8, 4, S.m);
    p.rect(0, 3, 8, 1, S.m3);
    disc(p, 2.5, 5, 1.6, C.ink2);
    p.px(2, 5, on ? '#e0f2fe' : C.ink3);
    p.px(6, 4, on ? C.leaf3 : C.ink3);
    p.rect(1, 7, 1, 1, C.ink3);
    p.rect(6, 7, 1, 1, C.ink3);
  },
  tray_table: (p) => {
    p.rect(2, 0, 2, 2, C.white);
    p.rect(5, 1, 2, 1, C.amber);
    p.rect(0, 2, 8, 1, S.w);
    p.rect(0, 2, 8, 1, S.w3);
    for (let i = 0; i < 5; i++) {
      p.px(1 + i, 3 + i, S.w2);
      p.px(6 - i, 3 + i, S.w2);
    }
  },
  aroma_diffuser: (p, { on }) => {
    p.px(4, 0, '#e0f2fe');
    p.rect(3, 1, 2, 1, '#e0f2fe');
    p.rect(2, 3, 4, 1, S.w2);
    p.rect(1, 4, 6, 3, S.w);
    p.rect(1, 4, 6, 1, S.w3);
    p.rect(2, 7, 4, 1, on ? '#c4b5fd' : S.w2);
  },
};
