// MY ROOM art pack: kitchen & café. Recolourable parts use the S slots
// (roomPaint.ts) so catalog variants can swap them.
import { box, C, disc, S, text, type Art } from './roomPaint';

export const KITCHEN_ART: Record<string, Art> = {
  kitchen_counter: (p) => {
    // tap, dish rack and a herb pot on the worktop
    p.rect(5, 0, 1, 5, C.metal2);
    p.rect(5, 0, 4, 1, C.metal2);
    p.px(8, 1, C.metal3);
    p.rect(14, 2, 1, 3, C.white);
    p.rect(15, 1, 1, 4, C.white);
    p.rect(13, 4, 4, 1, C.metal3);
    p.rect(19, 3, 3, 2, C.pot);
    p.px(20, 2, C.leaf);
    p.px(19, 1, C.leaf2);
    p.px(21, 1, C.leaf);
    p.rect(0, 5, 24, 2, C.paper);
    p.rect(0, 6, 24, 1, C.paper2);
    p.rect(3, 5, 7, 1, C.metal3);
    p.rect(0, 7, 24, 8, S.a2);
    box(p, 1, 8, 7, 7, S.a, S.a2);
    box(p, 8, 8, 8, 7, S.a, S.a2);
    box(p, 16, 8, 7, 3, S.a, S.a2);
    box(p, 16, 11, 7, 4, S.a, S.a2);
    p.rect(6, 10, 1, 2, C.metal);
    p.rect(9, 10, 1, 2, C.metal);
    p.rect(18, 9, 3, 1, C.metal);
    p.rect(18, 12, 3, 1, C.metal);
    p.rect(0, 15, 24, 1, C.ink2);
  },
  stove: (p, { on }) => {
    // kettle and pot on the burners
    p.rect(3, 0, 2, 1, C.ink);
    p.rect(2, 1, 4, 3, C.red);
    p.px(6, 2, C.red2);
    p.px(2, 1, C.red2);
    p.rect(9, 1, 6, 3, C.metal);
    p.rect(9, 1, 6, 1, C.metal2);
    p.px(15, 2, C.metal3);
    if (on) {
      p.px(7, 0, C.white);
      p.px(12, 0, C.white);
    }
    p.rect(0, 4, 16, 1, C.ink2);
    p.rect(0, 5, 16, 10, S.m);
    p.rect(0, 5, 16, 1, S.m3);
    for (const x of [2, 5, 10, 13]) p.px(x, 6, C.ink);
    p.rect(2, 8, 12, 1, S.m2);
    box(p, 2, 9, 12, 5, on ? C.amber2 : C.ink2, C.ink);
    if (on) p.rect(4, 11, 8, 1, C.orange);
    p.rect(0, 15, 16, 1, C.ink);
  },
  fridge_tall: (p) => {
    p.rect(1, 0, 14, 31, S.a2);
    p.rect(2, 1, 12, 9, S.a);
    p.rect(2, 11, 12, 19, S.a);
    p.rect(2, 1, 12, 1, S.a3);
    p.rect(2, 11, 12, 1, S.a3);
    p.rect(12, 4, 1, 4, C.metal);
    p.rect(12, 13, 1, 7, C.metal);
    // a note, magnets and a photo
    p.rect(4, 14, 4, 5, C.white);
    p.rect(5, 15, 2, 1, C.paper2);
    p.rect(5, 17, 2, 1, C.paper2);
    p.px(5, 14, C.red);
    p.rect(8, 22, 3, 3, C.sky);
    p.px(9, 23, C.leaf2);
    p.px(4, 24, C.amber);
    p.px(6, 5, C.leaf2);
    p.rect(2, 31, 2, 1, C.ink);
    p.rect(12, 31, 2, 1, C.ink);
  },
  microwave_cart: (p, { on }) => {
    box(p, 0, 0, 8, 5, S.m, S.m2);
    box(p, 1, 1, 5, 3, on ? C.amber : C.ink2, C.ink);
    p.px(6, 1, on ? C.leaf3 : C.ink);
    p.px(6, 3, C.ink);
    p.rect(0, 5, 8, 1, S.w3);
    p.rect(0, 6, 8, 1, S.w2);
    p.rect(0, 6, 1, 10, S.w2);
    p.rect(7, 6, 1, 10, S.w2);
    p.rect(2, 9, 2, 2, C.white);
    p.rect(4, 10, 2, 1, C.red);
    p.rect(1, 11, 6, 1, S.w);
    p.rect(1, 14, 6, 1, S.w);
    p.rect(2, 12, 3, 2, C.amber2);
  },
  espresso_machine: (p, { on }) => {
    box(p, 0, 0, 8, 7, S.m, S.m2);
    p.rect(1, 1, 6, 1, S.m3);
    p.rect(2, 3, 4, 1, C.ink);
    p.px(5, 2, on ? C.leaf3 : C.ink3);
    p.rect(3, 4, 2, 1, C.ink);
    p.rect(3, 5, 2, 2, C.white);
    if (on) p.px(3, 4, C.white);
    // stand
    p.rect(0, 7, 8, 1, S.w3);
    p.rect(0, 8, 8, 1, S.w2);
    p.rect(1, 9, 1, 7, S.w2);
    p.rect(6, 9, 1, 7, S.w2);
    p.rect(2, 11, 4, 2, C.walnut);
    p.rect(2, 11, 4, 1, C.walnut3);
    p.rect(1, 14, 6, 1, S.w);
  },
  dining_table: (p) => {
    // vase with flowers and two plates
    p.rect(11, 3, 2, 3, C.white);
    p.px(10, 1, C.pink);
    p.px(12, 0, C.amber);
    p.px(13, 2, C.red);
    p.px(11, 2, C.leaf2);
    p.px(12, 2, C.leaf);
    p.rect(3, 5, 5, 1, C.white);
    p.rect(16, 5, 5, 1, C.white);
    p.rect(4, 4, 3, 1, C.orange);
    p.rect(0, 6, 24, 2, S.w3);
    p.rect(0, 7, 24, 1, S.w);
    p.rect(1, 8, 22, 1, S.w2);
    p.rect(2, 9, 2, 7, S.w2);
    p.rect(20, 9, 2, 7, S.w2);
  },
  bar_stool: (p) => {
    p.rect(1, 3, 6, 2, S.a);
    p.rect(1, 3, 6, 1, S.a3);
    p.rect(1, 5, 6, 1, S.a2);
    p.rect(3, 6, 2, 8, S.m);
    p.rect(1, 10, 6, 1, S.m2);
    p.rect(1, 14, 6, 2, S.m2);
  },
  spice_rack: (p) => {
    p.rect(0, 0, 16, 1, S.w2);
    p.rect(0, 6, 16, 2, S.w2);
    p.rect(0, 6, 16, 1, S.w);
    const caps = [C.red, C.amber2, C.leaf2, C.orange2, C.ink3, C.pot2, C.leaf];
    caps.forEach((cap, i) => {
      const x = 1 + i * 2;
      p.rect(x, 3, 2, 3, i % 2 ? C.paper : C.white);
      p.rect(x, 2, 2, 1, cap);
      p.px(x, 4, cap);
    });
  },
  pot_rack: (p) => {
    p.rect(0, 0, 24, 1, S.m2);
    p.rect(0, 1, 24, 1, S.m);
    for (const x of [3, 8, 14, 20]) p.px(x, 2, S.m3);
    // pan, ladle, pot, whisk
    disc(p, 3.5, 5.5, 2.5, C.ink2);
    p.rect(3, 3, 1, 1, C.ink2);
    p.rect(8, 3, 1, 3, C.metal);
    p.rect(7, 6, 3, 2, C.metal);
    p.rect(12, 4, 5, 4, C.orange2);
    p.rect(12, 4, 5, 1, C.orange);
    p.px(14, 3, C.orange2);
    p.rect(20, 3, 1, 2, C.metal3);
    p.rect(19, 5, 3, 3, C.metal);
    p.px(20, 6, C.metal3);
  },
  herb_planter: (p) => {
    // basil, rosemary and chives in a wall box
    p.rect(1, 1, 3, 3, C.leaf);
    p.px(2, 0, C.leaf3);
    p.rect(6, 0, 1, 4, C.leaf2);
    p.rect(8, 1, 1, 3, C.leaf2);
    p.px(7, 1, C.leaf);
    p.rect(11, 1, 1, 3, C.leaf3);
    p.rect(13, 0, 1, 4, C.leaf3);
    p.rect(12, 2, 1, 2, C.leaf);
    p.px(13, 0, C.purple);
    box(p, 0, 4, 16, 4, S.w, S.w2);
    p.rect(1, 5, 14, 1, S.w3);
  },
  tea_cart: (p) => {
    // teapot and cups on top
    p.rect(3, 2, 5, 4, S.a);
    p.rect(4, 1, 3, 1, S.a2);
    p.px(5, 0, S.a2);
    p.px(8, 3, S.a);
    p.px(9, 2, S.a);
    p.px(2, 3, S.a2);
    p.rect(10, 4, 2, 2, C.white);
    p.rect(13, 4, 2, 2, C.white);
    p.rect(0, 6, 16, 1, S.m3);
    p.rect(0, 7, 16, 1, S.w);
    p.rect(1, 8, 1, 6, S.m);
    p.rect(14, 8, 1, 6, S.m);
    p.rect(2, 10, 3, 2, C.amber);
    p.rect(9, 9, 4, 3, C.paper);
    p.rect(1, 12, 14, 1, S.w);
    disc(p, 2, 14.5, 1.5, C.ink);
    disc(p, 14, 14.5, 1.5, C.ink);
  },
  vending_machine: (p, { on }) => {
    p.rect(0, 0, 16, 32, S.a2);
    p.rect(1, 1, 14, 3, S.a);
    text(p, 2, 1, 'COLA', on ? C.white : S.a3);
    box(p, 1, 5, 10, 19, on ? C.sky : C.night, C.ink);
    const cans = [C.red, C.amber2, C.leaf, C.blue, C.pink];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) p.rect(2 + c * 2, 7 + r * 4, 1, 3, cans[(r + c) % cans.length]);
      p.rect(2, 10 + r * 4, 8, 1, C.metal3);
    }
    p.rect(12, 6, 2, 3, C.ink);
    p.px(12, 10, C.red);
    p.px(13, 10, C.leaf2);
    p.rect(12, 12, 2, 1, C.metal);
    p.rect(2, 26, 8, 3, C.ink);
    p.rect(1, 31, 2, 1, C.ink);
    p.rect(13, 31, 2, 1, C.ink);
  },
  gumball_machine: (p) => {
    disc(p, 4, 4, 3.5, C.sky);
    const balls = [C.red, C.amber, C.leaf, C.blue, C.pink, C.white, C.orange];
    let i = 0;
    for (let y = 3; y < 8; y += 2) for (let x = 2; x < 7; x += 2) p.px(x, y, balls[i++ % balls.length]);
    p.px(2, 2, C.white);
    p.rect(1, 8, 6, 3, S.b);
    p.rect(3, 9, 2, 1, C.metal);
    p.rect(3, 11, 2, 3, S.b2);
    p.rect(1, 14, 6, 2, S.b);
  },
  cafe_board: (p) => {
    box(p, 0, 0, 16, 16, C.term, S.w2);
    text(p, 2, 2, 'MENU', C.white);
    p.rect(2, 8, 7, 1, C.paper2);
    p.rect(2, 10, 5, 1, C.paper2);
    p.rect(2, 12, 6, 1, C.paper2);
    p.rect(11, 9, 3, 3, C.white);
    p.px(14, 10, C.white);
    p.px(12, 8, C.paper2);
  },
  water_dispenser: (p) => {
    p.rect(1, 0, 6, 8, C.sky);
    p.rect(2, 1, 1, 6, C.white);
    p.rect(1, 2, 6, 1, C.sky2);
    p.rect(3, 8, 2, 1, C.sky2);
    p.rect(0, 9, 8, 15, S.m3);
    p.rect(0, 9, 8, 1, S.m);
    p.px(2, 12, C.blue);
    p.px(5, 12, C.red);
    p.rect(1, 13, 6, 3, C.ink2);
    p.rect(2, 15, 4, 1, C.metal);
    p.rect(1, 18, 6, 5, S.m);
    p.rect(0, 23, 8, 1, C.ink2);
  },
  dish_shelf: (p) => {
    p.rect(0, 0, 16, 16, S.w2);
    p.rect(1, 1, 14, 14, C.wood4);
    p.rect(1, 7, 14, 1, S.w);
    p.rect(1, 14, 14, 1, S.w);
    // plates on edge, then cups and a jar
    for (const x of [2, 4, 6]) p.rect(x, 2, 1, 5, C.white);
    p.rect(9, 4, 2, 3, C.paper);
    p.rect(12, 3, 2, 4, C.amber2);
    p.rect(12, 3, 2, 1, C.wood3);
    p.rect(2, 11, 3, 3, C.blue);
    p.rect(6, 11, 3, 3, C.red);
    p.rect(10, 10, 4, 4, C.white);
    p.rect(11, 11, 2, 2, C.paper2);
  },
};
