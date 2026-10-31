// MY ROOM art pack: seating, beds and storage. Upholstery uses slot a,
// wood slot w and metal slot m (roomPaint.ts) so catalog variants can swap them.
import { books, box, C, disc, S, type Art } from './roomPaint';

export const HOME_ART: Record<string, Art> = {
  // --------------------------------------------------------------- seating
  loveseat: (p) => {
    p.rect(1, 2, 22, 8, S.a2);
    p.rect(2, 3, 20, 6, S.a);
    p.rect(0, 5, 3, 9, S.a2);
    p.rect(21, 5, 3, 9, S.a2);
    p.rect(3, 9, 9, 4, S.a);
    p.rect(12, 9, 9, 4, S.a);
    p.rect(3, 9, 18, 1, S.a3);
    p.rect(12, 9, 1, 4, S.a2);
    p.rect(15, 5, 4, 4, S.b);
    p.rect(1, 13, 22, 1, S.a2);
    p.rect(2, 14, 1, 2, S.w2);
    p.rect(21, 14, 1, 2, S.w2);
  },
  sectional: (p) => {
    p.rect(0, 2, 32, 8, S.a2);
    p.rect(1, 3, 30, 6, S.a);
    for (const x of [1, 11, 21]) {
      p.rect(x, 9, 10, 4, S.a);
      p.rect(x, 9, 10, 1, S.a3);
      p.rect(x + 9, 9, 1, 4, S.a2);
    }
    // chaise end
    p.rect(22, 6, 10, 7, S.a);
    p.rect(22, 6, 10, 1, S.a3);
    p.rect(4, 5, 4, 4, S.b);
    p.rect(9, 5, 4, 4, C.paper);
    p.rect(0, 13, 32, 1, S.a2);
    p.rect(1, 14, 2, 2, C.ink2);
    p.rect(29, 14, 2, 2, C.ink2);
  },
  daybed: (p) => {
    p.rect(0, 2, 2, 14, S.w2);
    p.rect(30, 2, 2, 14, S.w2);
    p.rect(2, 3, 28, 1, S.w2);
    for (let x = 4; x < 30; x += 3) p.rect(x, 4, 1, 4, S.w2);
    p.rect(2, 8, 28, 4, S.a);
    p.rect(2, 8, 28, 1, S.a3);
    p.rect(4, 5, 6, 3, C.white);
    p.rect(22, 6, 5, 2, S.b);
    p.rect(2, 12, 28, 2, S.w);
  },
  egg_chair: (p) => {
    p.rect(14, 0, 2, 24, S.m);
    p.rect(8, 0, 7, 1, S.m);
    p.rect(8, 1, 1, 3, S.m2);
    disc(p, 8.5, 12, 7, S.w);
    disc(p, 9, 12.5, 5.2, C.wood4);
    p.rect(4, 13, 10, 4, S.a);
    p.rect(4, 13, 10, 1, S.a3);
    p.rect(9, 20, 12, 3, S.m);
    p.rect(9, 23, 12, 1, S.m2);
  },
  pouf: (p) => {
    p.rect(1, 2, 6, 1, S.a3);
    p.rect(0, 3, 8, 4, S.a);
    p.rect(0, 6, 8, 1, S.a2);
    p.px(4, 4, S.a2);
    p.px(2, 5, S.a2);
    p.px(6, 5, S.a2);
  },
  bench: (p) => {
    p.rect(0, 2, 24, 2, S.w3);
    p.rect(0, 3, 24, 1, S.w);
    p.rect(1, 4, 2, 4, S.w2);
    p.rect(21, 4, 2, 4, S.w2);
    p.rect(3, 6, 18, 1, S.w2);
    p.rect(5, 0, 6, 2, S.a);
    p.rect(14, 1, 4, 1, S.b);
  },
  papasan: (p) => {
    disc(p, 8, 7, 7.5, S.w);
    disc(p, 8, 7.5, 5.8, S.a);
    disc(p, 8, 8, 3.4, S.a3);
    p.rect(0, 8, 16, 1, S.w2);
    p.rect(3, 12, 10, 4, S.w2);
    p.rect(4, 12, 8, 1, S.w);
  },
  hammock: (p) => {
    p.rect(0, 0, 2, 16, S.w2);
    p.rect(30, 0, 2, 16, S.w2);
    p.rect(0, 14, 32, 2, S.w2);
    for (let x = 2; x < 30; x++) {
      const sag = Math.round(Math.sin(((x - 2) / 27) * Math.PI) * 6);
      p.rect(x, 2 + sag, 1, 3, (x >> 1) % 2 ? S.a : S.b);
    }
    p.rect(9, 5, 5, 3, C.white);
  },
  director_chair: (p) => {
    p.rect(1, 1, 6, 4, S.a);
    p.rect(1, 1, 6, 1, S.a3);
    p.rect(0, 1, 1, 15, S.w2);
    p.rect(7, 1, 1, 15, S.w2);
    p.rect(0, 7, 8, 2, S.a);
    for (let i = 0; i < 6; i++) {
      p.px(1 + i, 10 + i, S.w2);
      p.px(6 - i, 10 + i, S.w2);
    }
  },
  lounge_chair: (p) => {
    // mid-century lounge chair with an ottoman
    p.rect(1, 0, 7, 9, S.w2);
    p.rect(2, 1, 5, 8, S.a);
    p.rect(2, 1, 5, 1, S.a3);
    p.rect(1, 8, 10, 4, S.w2);
    p.rect(2, 8, 9, 3, S.a);
    p.rect(5, 12, 1, 3, C.ink);
    p.rect(2, 15, 8, 1, C.ink);
    p.rect(12, 10, 4, 3, S.w2);
    p.rect(12, 10, 4, 2, S.a);
    p.rect(13, 13, 2, 3, C.ink);
  },
  bunk_bed: (p) => {
    p.rect(0, 0, 2, 32, S.w2);
    p.rect(30, 0, 2, 32, S.w2);
    for (const y of [6, 22]) {
      p.rect(2, y, 28, 4, S.a);
      p.rect(2, y, 28, 1, S.a3);
      p.rect(3, y - 2, 6, 3, C.white);
      p.rect(2, y + 4, 28, 2, S.w);
    }
    p.rect(2, 2, 28, 1, S.w2);
    // ladder
    p.rect(24, 12, 1, 10, S.w2);
    p.rect(28, 12, 1, 10, S.w2);
    for (let y = 13; y < 22; y += 3) p.rect(24, y, 5, 1, S.w2);
  },
  loft_bed: (p) => {
    p.rect(0, 0, 2, 32, S.m);
    p.rect(30, 0, 2, 32, S.m);
    p.rect(2, 7, 28, 4, S.a);
    p.rect(2, 7, 28, 1, S.a3);
    p.rect(3, 5, 6, 3, C.white);
    p.rect(2, 11, 28, 2, S.m2);
    p.rect(2, 3, 28, 1, S.m);
    // desk and screen underneath
    box(p, 8, 16, 10, 7, C.screenOff, C.ink);
    p.rect(12, 23, 2, 2, C.metal3);
    p.rect(4, 25, 24, 2, S.w);
    p.rect(26, 21, 2, 4, C.amber);
    p.rect(5, 27, 1, 5, S.w2);
    p.rect(26, 27, 1, 5, S.w2);
  },
  canopy_bed: (p) => {
    p.rect(0, 0, 2, 24, S.w2);
    p.rect(30, 0, 2, 24, S.w2);
    p.rect(0, 0, 32, 2, S.w2);
    p.rect(2, 2, 4, 12, C.paper);
    p.rect(26, 2, 4, 12, C.paper);
    p.rect(2, 2, 28, 2, C.paper);
    p.rect(3, 13, 6, 3, C.white);
    p.rect(2, 15, 28, 5, S.a);
    p.rect(2, 15, 28, 1, S.a3);
    p.rect(2, 20, 28, 2, S.w);
  },
  massage_chair: (p) => {
    p.rect(2, 0, 8, 10, S.a2);
    p.rect(3, 1, 6, 8, S.a);
    p.rect(3, 1, 6, 2, S.a3);
    p.rect(0, 6, 3, 6, S.a2);
    p.rect(9, 6, 3, 6, S.a2);
    p.rect(3, 9, 10, 3, S.a);
    p.rect(11, 11, 4, 4, S.a2);
    p.rect(1, 12, 10, 3, S.m);
    p.rect(1, 15, 14, 1, S.m2);
  },
  throne: (p) => {
    p.rect(2, 0, 12, 1, C.amber);
    for (const x of [2, 7, 13]) p.rect(x, 0, 1, 3, C.amber);
    p.rect(2, 2, 12, 12, C.amber2);
    p.rect(4, 3, 8, 11, S.a);
    p.rect(4, 3, 8, 1, S.a3);
    disc(p, 8, 6, 1.2, C.red);
    p.rect(0, 12, 16, 4, C.amber2);
    p.rect(2, 13, 12, 3, S.a);
    p.rect(1, 16, 14, 2, C.amber);
    p.rect(1, 18, 2, 6, C.amber2);
    p.rect(13, 18, 2, 6, C.amber2);
  },

  // --------------------------------------------------------------- storage
  crate_shelf: (p) => {
    for (const [x, y] of [[0, 8], [8, 8], [2, 0]] as const) {
      box(p, x, y, 8, 8, S.w, S.w2);
      p.rect(x + 1, y + 3, 6, 1, S.w2);
    }
    books(p, 9, 15, 6, 7);
    p.rect(3, 4, 3, 3, C.leaf);
    p.rect(11, 4, 3, 4, C.pot);
    p.rect(11, 2, 3, 2, C.leaf);
  },
  toy_box: (p) => {
    p.rect(2, 0, 2, 2, C.red);
    p.rect(6, 0, 3, 2, C.amber);
    p.rect(11, 0, 2, 2, C.blue);
    box(p, 0, 2, 16, 6, S.a, S.a2);
    p.rect(0, 2, 16, 1, S.a3);
    p.rect(6, 4, 4, 2, C.white);
    p.px(7, 4, S.b);
  },
  suitcase_stack: (p) => {
    box(p, 0, 9, 8, 7, S.b, S.b2);
    box(p, 1, 3, 6, 6, S.a, S.a2);
    p.rect(3, 1, 2, 2, C.ink2);
    p.rect(3, 12, 2, 1, C.amber);
    p.rect(2, 5, 4, 1, S.a3);
    p.rect(1, 15, 1, 1, C.ink);
    p.rect(6, 15, 1, 1, C.ink);
  },
  steamer_trunk: (p) => {
    p.rect(0, 1, 16, 7, S.w);
    p.rect(0, 1, 16, 2, S.w3);
    for (const x of [3, 12]) p.rect(x, 1, 1, 7, S.m);
    p.rect(0, 3, 16, 1, S.m);
    p.rect(7, 3, 2, 2, C.amber);
    p.rect(0, 7, 16, 1, S.w2);
  },
  display_cabinet: (p) => {
    p.rect(0, 0, 16, 32, S.w2);
    p.rect(1, 1, 14, 22, '#d8ebf2');
    for (const y of [8, 15]) p.rect(1, y, 14, 1, S.w);
    // ceramics, a model ship and a trophy
    p.rect(3, 4, 3, 4, C.white);
    p.rect(9, 3, 4, 5, C.blue);
    p.rect(3, 10, 9, 3, C.walnut);
    p.rect(5, 9, 1, 1, C.paper);
    p.rect(8, 10, 1, 1, C.paper);
    p.rect(4, 17, 3, 4, C.amber);
    p.rect(9, 18, 3, 4, C.pink);
    p.rect(1, 23, 14, 8, S.w);
    p.rect(7, 26, 2, 1, C.amber);
  },
  shoe_rack: (p) => {
    p.rect(0, 0, 16, 1, S.w2);
    p.rect(0, 4, 16, 1, S.w2);
    p.rect(0, 0, 1, 8, S.w2);
    p.rect(15, 0, 1, 8, S.w2);
    const shoes = [C.red, C.white, C.ink2, S.a];
    shoes.forEach((c, i) => {
      p.rect(1 + i * 4, 2, 3, 2, c);
      p.rect(2 + ((i + 1) % 4) * 4 - 1, 6, 3, 2, shoes[(i + 2) % 4]);
    });
  },
  plant_ladder: (p) => {
    for (let y = 0; y < 24; y++) {
      p.px(Math.round(1 + y * 0.12), y, S.w2);
      p.px(Math.round(6 - y * 0.12), y, S.w2);
    }
    for (const y of [6, 14, 22]) p.rect(1, y, 6, 1, S.w);
    p.rect(2, 3, 3, 3, C.pot);
    p.rect(2, 1, 3, 2, C.leaf);
    p.rect(2, 11, 4, 3, C.white);
    p.rect(1, 9, 6, 2, C.leaf2);
    p.rect(3, 19, 3, 3, C.pot);
    p.px(4, 18, C.leaf);
  },
  drawer_tower: (p) => {
    p.rect(0, 0, 8, 14, C.paper2);
    for (let r = 0; r < 4; r++) {
      const y = 1 + r * 3;
      p.rect(1, y, 6, 3, r % 2 ? S.a : S.b);
      p.rect(1, y, 6, 1, r % 2 ? S.a3 : S.b3);
      p.rect(3, y + 1, 2, 1, C.white);
    }
    p.rect(0, 13, 8, 1, C.metal3);
    disc(p, 1.5, 14.5, 1, C.ink);
    disc(p, 6.5, 14.5, 1, C.ink);
  },
  safe_box: (p) => {
    box(p, 0, 0, 8, 8, S.m, S.m2);
    disc(p, 3.5, 4, 1.6, S.m3);
    p.px(3, 4, C.ink);
    p.rect(6, 3, 1, 3, S.m3);
  },
  pantry: (p) => {
    p.rect(0, 0, 16, 32, S.w2);
    box(p, 1, 1, 7, 30, S.w, S.w2);
    box(p, 8, 1, 7, 30, S.w, S.w2);
    p.rect(6, 14, 1, 4, C.metal);
    p.rect(9, 14, 1, 4, C.metal);
    for (let y = 4; y < 30; y += 3) {
      p.rect(2, y, 5, 1, S.w2);
      p.rect(9, y, 5, 1, S.w2);
    }
  },
  apothecary: (p) => {
    p.rect(0, 0, 24, 24, S.w2);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        const x = 1 + c * 5.75;
        const y = 1 + r * 4.4;
        box(p, Math.round(x), Math.round(y), 5, 4, S.w, S.w2);
        p.px(Math.round(x) + 2, Math.round(y) + 2, C.amber);
        p.px(Math.round(x) + 1, Math.round(y) + 1, C.paper);
      }
    }
    p.rect(1, 23, 3, 1, C.ink);
    p.rect(20, 23, 3, 1, C.ink);
  },
  hall_tree: (p) => {
    p.rect(0, 0, 16, 2, S.w2);
    for (const x of [2, 7, 12]) {
      p.rect(x, 2, 2, 1, S.m);
      p.rect(x + 1, 3, 1, 1, S.m);
    }
    p.rect(1, 3, 4, 8, S.a);
    p.rect(1, 3, 4, 1, S.a3);
    p.rect(11, 3, 3, 6, S.b);
    p.rect(6, 4, 4, 3, C.amber2);
    p.rect(0, 2, 1, 22, S.w2);
    p.rect(15, 2, 1, 22, S.w2);
    p.rect(0, 15, 16, 3, S.w);
    p.rect(0, 15, 16, 1, S.w3);
    p.rect(2, 21, 4, 3, C.ink2);
    p.rect(9, 21, 4, 3, C.white);
  },
};
