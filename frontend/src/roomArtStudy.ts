// MY ROOM art pack: study & office. Recolourable parts use the S slots
// (roomPaint.ts) so catalog variants can swap them.
import { books, box, C, disc, hash, S, text, type Art } from './roomPaint';

export const STUDY_ART: Record<string, Art> = {
  standing_desk: (p, { on }) => {
    box(p, 7, 0, 11, 7, on ? C.screenOn : C.screenOff, C.ink);
    if (on) {
      p.rect(9, 2, 6, 1, C.leaf3);
      p.rect(9, 4, 4, 1, C.emerald);
    }
    p.rect(12, 7, 1, 2, C.metal3);
    p.rect(10, 9, 5, 1, C.metal3);
    p.rect(3, 8, 3, 1, C.ink3);
    p.rect(19, 6, 2, 3, S.a);
    p.rect(0, 10, 24, 2, S.w3);
    p.rect(0, 11, 24, 1, S.w);
    p.rect(3, 12, 2, 3, S.m);
    p.rect(19, 12, 2, 3, S.m);
    p.rect(3, 12, 2, 1, S.m3);
    p.rect(19, 12, 2, 1, S.m3);
    p.rect(1, 15, 6, 1, S.m2);
    p.rect(17, 15, 6, 1, S.m2);
  },
  corner_desk: (p, { on }) => {
    // two screens, a lamp and a long L-shaped top
    box(p, 3, 1, 9, 6, on ? C.screenOn : C.screenOff, C.ink);
    box(p, 13, 1, 9, 6, on ? C.screenOn : C.screenOff, C.ink);
    if (on) {
      p.rect(5, 3, 4, 1, C.leaf3);
      p.rect(15, 3, 5, 1, C.sky);
      p.rect(15, 5, 3, 1, C.leaf3);
    }
    p.rect(7, 7, 1, 2, C.metal3);
    p.rect(17, 7, 1, 2, C.metal3);
    p.rect(26, 2, 1, 7, C.ink2);
    p.rect(25, 1, 4, 2, on ? C.amber : C.ink3);
    p.rect(0, 9, 32, 2, S.w3);
    p.rect(0, 10, 32, 1, S.w);
    p.rect(1, 11, 2, 5, S.w2);
    box(p, 22, 11, 9, 5, S.w, S.w2);
    p.rect(25, 13, 3, 1, C.metal);
  },
  drafting_table: (p) => {
    // tilted board with a sheet, ruler and lamp
    for (let i = 0; i < 6; i++) p.rect(2 + i, 3 + i, 18, 1, i === 0 ? S.w2 : C.white);
    p.rect(5, 5, 9, 1, C.paper2);
    p.rect(6, 7, 6, 1, C.sky2);
    p.rect(3, 8, 20, 1, S.w2);
    p.rect(20, 0, 1, 7, C.ink2);
    p.rect(18, 0, 4, 2, C.amber2);
    p.rect(11, 9, 2, 4, S.m);
    p.rect(4, 13, 16, 1, S.m);
    p.rect(4, 13, 1, 3, S.m2);
    p.rect(19, 13, 1, 3, S.m2);
  },
  school_desk: (p) => {
    p.rect(1, 0, 1, 9, S.m2);
    p.rect(2, 2, 4, 4, S.w);
    p.rect(1, 8, 6, 2, S.w3);
    p.rect(2, 10, 1, 6, S.m2);
    p.rect(6, 10, 1, 6, S.m2);
    // desk with a notebook
    p.rect(9, 4, 4, 1, C.red);
    p.rect(13, 4, 2, 1, C.white);
    p.rect(8, 5, 8, 2, S.w3);
    p.rect(8, 6, 8, 1, S.w);
    p.rect(9, 7, 6, 3, S.m);
    p.rect(9, 10, 1, 6, S.m2);
    p.rect(14, 10, 1, 6, S.m2);
  },
  typewriter_table: (p) => {
    p.rect(4, 0, 8, 1, C.white);
    p.rect(5, 1, 6, 3, C.white);
    p.rect(6, 2, 4, 1, C.paper2);
    p.rect(2, 3, 12, 2, S.a2);
    p.rect(3, 5, 10, 3, S.a);
    for (let x = 4; x < 12; x += 2) p.px(x, 6, C.white);
    p.rect(1, 3, 1, 1, C.metal);
    p.rect(0, 8, 16, 2, S.w3);
    p.rect(0, 9, 16, 1, S.w);
    p.rect(1, 10, 1, 6, S.w2);
    p.rect(14, 10, 1, 6, S.w2);
    p.rect(2, 13, 12, 1, S.w2);
  },
  desk_lamp: (p, { on, night }) => {
    const lit = on || night;
    p.rect(4, 0, 4, 2, S.a);
    p.rect(3, 1, 1, 2, S.a2);
    if (lit) p.rect(4, 2, 3, 1, C.glow);
    p.px(3, 3, S.m);
    p.px(2, 4, S.m);
    p.rect(1, 5, 1, 2, S.m);
    p.rect(0, 7, 4, 1, S.a2);
  },
  archive_boxes: (p) => {
    box(p, 0, 4, 8, 4, S.w3, S.w2);
    box(p, 1, 0, 7, 4, S.w3, S.w2);
    p.rect(2, 5, 3, 1, C.white);
    p.rect(3, 1, 3, 1, C.white);
    p.rect(3, 2, 2, 1, C.ink3);
  },
  laser_printer: (p, { on }) => {
    p.rect(1, 2, 6, 1, C.white);
    box(p, 0, 3, 8, 5, S.m3, S.m2);
    p.rect(1, 4, 4, 1, S.m2);
    p.px(6, 4, on ? C.leaf3 : C.ink3);
    p.rect(0, 8, 8, 1, S.w3);
    p.rect(1, 9, 1, 7, S.w2);
    p.rect(6, 9, 1, 7, S.w2);
    p.rect(2, 11, 4, 3, C.white);
    p.rect(1, 14, 6, 1, S.w);
  },
  shredder: (p) => {
    p.rect(1, 0, 6, 2, C.ink2);
    p.rect(2, 0, 4, 1, C.ink);
    box(p, 1, 2, 6, 6, S.m, S.m2);
    for (let x = 2; x < 6; x++) p.px(x, 4 + (x % 2), C.white);
    p.rect(2, 6, 4, 1, S.m2);
  },
  chalkboard: (p) => {
    box(p, 0, 0, 24, 15, C.term2, S.w2);
    text(p, 2, 2, 'E=MC', C.white);
    p.px(18, 1, C.white);
    p.px(19, 1, C.white);
    p.px(19, 2, C.white);
    p.rect(3, 9, 9, 1, C.paper2);
    p.rect(14, 8, 7, 1, C.amber);
    p.px(14, 9, C.amber);
    p.px(20, 9, C.amber);
    p.rect(15, 11, 4, 1, C.pink);
    p.rect(0, 15, 24, 1, S.w3);
    p.rect(4, 14, 2, 1, C.white);
  },
  evidence_board: (p) => {
    box(p, 0, 0, 24, 16, C.cork, S.w2);
    const notes: Array<[number, number, string]> = [
      [2, 2, C.white], [10, 3, C.amber], [17, 2, C.white], [4, 10, C.sky], [13, 10, C.white], [19, 9, C.pink],
    ];
    notes.forEach(([x, y, c]) => {
      p.rect(x, y, 4, 4, c);
      p.px(x + 1, y, C.red);
    });
    const lines: Array<[number, number, number, number]> = [[4, 4, 12, 5], [12, 5, 19, 4], [12, 5, 15, 12], [6, 12, 15, 12], [15, 12, 21, 11]];
    lines.forEach(([x0, y0, x1, y1]) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) p.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), C.red);
    });
  },
  periodic_table: (p) => {
    box(p, 0, 0, 24, 16, C.white, S.m2);
    const cols = [C.red, C.orange, C.amber, C.leaf, C.sky, C.indigo, C.pink];
    for (let y = 2; y < 11; y += 2) {
      for (let x = 2; x < 22; x += 2) {
        if (y < 6 && x > 3 && x < 18) continue;
        p.px(x, y, cols[(x + y) % cols.length]);
      }
    }
    for (let x = 6; x < 20; x += 2) {
      p.px(x, 12, C.purple);
      p.px(x, 14, C.teal);
    }
  },
  sticky_wall: (p) => {
    const cols = [C.amber, C.pink, C.sky, C.leaf3, C.orange, C.white];
    for (let i = 0; i < 9; i++) {
      const x = 1 + (i % 3) * 5 + Math.round(hash(i, 1) * 1);
      const y = 1 + Math.floor(i / 3) * 5 + Math.round(hash(i, 2) * 1);
      p.rect(x, y, 4, 4, cols[i % cols.length]);
      p.rect(x + 1, y + 1, 2, 1, C.ink3);
    }
  },
  timetable: (p) => {
    box(p, 0, 0, 16, 16, C.white, S.a2);
    p.rect(1, 1, 14, 2, S.a);
    for (let x = 4; x < 15; x += 3) p.rect(x, 3, 1, 12, C.paper2);
    for (let y = 6; y < 15; y += 3) p.rect(1, y, 14, 1, C.paper2);
    const fills: Array<[number, number, string]> = [[2, 4, C.amber], [5, 7, C.pink], [8, 4, C.leaf3], [11, 10, C.sky], [5, 13, C.amber], [11, 4, C.pink]];
    fills.forEach(([x, y, c]) => p.rect(x, y, 2, 2, c));
  },
  pegboard: (p) => {
    p.rect(0, 0, 24, 16, S.w3);
    for (let y = 2; y < 16; y += 3) for (let x = 2; x < 24; x += 3) p.px(x, y, S.w2);
    // scissors, ruler, tape, cup of pens, headphones
    p.rect(2, 3, 1, 6, C.amber2);
    p.rect(5, 3, 3, 3, C.red);
    p.rect(6, 4, 1, 1, S.w3);
    disc(p, 12.5, 5.5, 2.5, C.ink2);
    disc(p, 12.5, 5.5, 1.2, S.w3);
    p.rect(17, 3, 4, 1, C.ink3);
    p.rect(17, 3, 1, 4, C.ink3);
    p.rect(20, 3, 1, 4, C.ink3);
    p.rect(16, 6, 2, 2, C.ink);
    p.rect(20, 6, 2, 2, C.ink);
    p.rect(3, 11, 4, 4, C.blue);
    p.px(4, 10, C.red);
    p.px(5, 9, C.amber);
    p.rect(9, 12, 12, 2, C.metal);
    for (let x = 10; x < 21; x += 2) p.px(x, 12, C.ink3);
  },
  magazine_rack: (p) => {
    p.rect(1, 2, 1, 4, C.red);
    p.rect(2, 1, 3, 5, C.amber);
    p.rect(5, 3, 2, 3, C.sky);
    p.rect(2, 2, 2, 1, C.white);
    p.rect(0, 6, 8, 1, S.m);
    p.rect(0, 6, 1, 8, S.m);
    p.rect(7, 6, 1, 8, S.m);
    p.rect(1, 9, 6, 4, C.pink);
    p.rect(1, 9, 6, 1, C.white);
    p.rect(0, 13, 8, 1, S.m2);
    p.rect(0, 14, 1, 2, S.m2);
    p.rect(7, 14, 1, 2, S.m2);
  },
  locker: (p) => {
    p.rect(0, 0, 8, 32, S.a2);
    box(p, 1, 1, 6, 30, S.a, S.a2);
    for (let y = 3; y < 9; y += 2) p.rect(2, y, 4, 1, S.a2);
    p.rect(5, 14, 1, 3, C.metal);
    p.rect(2, 22, 3, 3, C.white);
    p.px(3, 23, C.red);
    p.rect(1, 31, 1, 1, C.ink);
    p.rect(6, 31, 1, 1, C.ink);
  },
  cube_shelf: (p) => {
    p.rect(0, 0, 16, 16, S.w2);
    p.rect(1, 1, 14, 14, S.w);
    p.rect(1, 1, 6, 6, C.wood4);
    p.rect(9, 1, 6, 6, C.wood4);
    p.rect(1, 9, 6, 6, C.wood4);
    p.rect(9, 9, 6, 6, C.wood4);
    // a bin, books, a plant, a box
    p.rect(2, 2, 4, 5, S.a);
    p.rect(3, 3, 2, 1, S.a3);
    books(p, 9, 7, 6, 3);
    p.rect(2, 12, 4, 3, C.pot);
    p.rect(2, 10, 4, 2, C.leaf);
    p.px(3, 9, C.leaf2);
    p.rect(10, 10, 5, 5, S.a);
    p.rect(11, 11, 3, 1, S.a3);
  },
  cubby_tower: (p) => {
    p.rect(0, 0, 8, 32, S.w2);
    for (let i = 0; i < 4; i++) {
      const y = 1 + i * 8;
      p.rect(1, y, 6, 7, C.wood4);
      if (i === 0) books(p, 1, y + 7, 6, 4);
      if (i === 1) {
        p.rect(2, y + 3, 4, 4, C.pot);
        p.rect(2, y + 1, 4, 2, C.leaf);
      }
      if (i === 2) p.rect(1, y + 1, 6, 6, S.a);
      if (i === 3) {
        p.rect(2, y + 4, 4, 3, C.white);
        p.rect(3, y + 2, 2, 2, C.amber);
      }
    }
  },
  mail_sorter: (p) => {
    box(p, 0, 0, 16, 8, S.w, S.w2);
    for (let i = 0; i < 3; i++) {
      const x = 1 + i * 5;
      p.rect(x, 3, 4, 4, S.w2);
      p.rect(x, 1, 3, 3, i === 1 ? C.amber : C.white);
      p.rect(x + 1, 2, 1, 1, i === 0 ? C.red : C.ink3);
    }
  },
  bookends: (p) => {
    p.rect(0, 1, 1, 7, S.m);
    p.rect(0, 7, 3, 1, S.m);
    p.rect(7, 1, 1, 7, S.m);
    p.rect(5, 7, 3, 1, S.m);
    books(p, 1, 7, 6, 6);
  },
  card_catalog: (p) => {
    p.rect(0, 0, 16, 14, S.w2);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const x = 1 + c * 5;
        const y = 1 + r * 3;
        p.rect(x, y, 4, 2, S.w);
        p.px(x + 1, y, C.white);
        p.px(x + 2, y + 1, S.m3);
      }
    }
    p.rect(1, 14, 2, 2, S.w2);
    p.rect(13, 14, 2, 2, S.w2);
  },
};
