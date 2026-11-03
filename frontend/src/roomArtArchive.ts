// MY ROOM art pack: INTELLIGENCE ARCHIVE — a spy's hideaway study: globe
// bar, brass telescope, chesterfield, document safe and a record player.
// Lamps glow while the stopwatch runs or at night. Recolourable parts use
// the S slots (roomPaint.ts): w = wood, b = leather / fabric, m = brass /
// metal, a = accent (globe seas, record label, wallpaper).
import { books, box, C, disc, hash, S, type Art } from './roomPaint';

export const ARCHIVE_ART: Record<string, Art> = {
  intel_globe_bar: (p) => {
    // globe split open on a wooden stand, bottles inside
    disc(p, 8, 7, 6.5, S.w2);
    disc(p, 8, 7, 5.6, S.a);
    for (let y = 2; y < 13; y++) for (let x = 3; x < 14; x++) if (hash(Math.floor(x / 2), Math.floor(y / 2)) > 0.6 && Math.hypot(x + 0.5 - 8, y + 0.5 - 7) < 5.4) p.px(x, y, '#a3b18a');
    p.rect(2, 7, 13, 2, S.m);
    p.rect(4, 4, 1, 3, C.leaf2);
    p.rect(6, 3, 1, 4, C.red2);
    p.rect(10, 4, 1, 3, C.amber2);
    p.rect(7, 13, 2, 1, S.w);
    p.rect(3, 14, 10, 1, S.w);
    p.rect(3, 15, 1, 1, S.w2);
    p.rect(12, 15, 1, 1, S.w2);
  },
  intel_telescope: (p, { night }) => {
    // brass tube angled up toward the window
    for (let i = 0; i < 14; i++) p.rect(3 + i, 12 - Math.round(i * 0.7), 3, 3, S.m);
    for (let i = 0; i < 14; i++) p.px(3 + i, 12 - Math.round(i * 0.7), S.m3);
    p.rect(16, 1, 3, 4, S.m2);
    disc(p, 18.5, 2.5, 1.4, night ? C.sky : C.ink2);
    p.rect(9, 9, 3, 3, S.m2);
    // tripod
    p.rect(10, 12, 1, 12, S.w);
    for (let i = 0; i < 11; i++) {
      p.px(10 - Math.round(i * 0.6), 12 + i, S.w);
      p.px(11 + Math.round(i * 0.6), 12 + i, S.w2);
    }
  },
  intel_chesterfield: (p) => {
    p.rect(1, 2, 30, 7, S.b);
    for (let x = 3; x < 30; x += 3) for (let y = 4; y < 8; y += 2) p.px(x + ((y / 2) % 2), y, S.b2);
    p.rect(1, 2, 30, 1, S.b3);
    p.rect(0, 3, 4, 10, S.b2);
    p.rect(28, 3, 4, 10, S.b2);
    p.rect(0, 3, 4, 1, S.b3);
    p.rect(28, 3, 4, 1, S.b3);
    p.rect(4, 9, 24, 4, S.b);
    p.rect(4, 9, 24, 1, S.b3);
    p.rect(15, 9, 1, 4, S.b2);
    p.rect(1, 13, 30, 1, S.b2);
    for (const x of [2, 28]) p.rect(x, 14, 2, 2, S.w2);
  },
  intel_safe: (p) => {
    box(p, 0, 0, 16, 16, S.m2, C.ink);
    p.rect(2, 2, 12, 11, S.m);
    disc(p, 8, 7, 3, S.m3);
    disc(p, 8, 7, 1.6, S.m2);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.px(Math.round(7.5 + Math.cos(a) * 3.6), Math.round(6.5 + Math.sin(a) * 3.6), C.ink2);
    }
    p.rect(12, 5, 1, 4, S.m3);
    p.rect(3, 11, 5, 1, C.red);
    p.rect(1, 14, 3, 2, C.ink2);
    p.rect(12, 14, 3, 2, C.ink2);
  },
  intel_record_player: (p, { on }) => {
    box(p, 0, 3, 16, 5, S.w, S.w2);
    disc(p, 6.5, 4.5, 4.5, C.ink);
    disc(p, 6.5, 4.5, 1.4, S.a);
    p.rect(12, 3, 1, 2, S.m);
    p.rect(9, 4, 4, 1, S.m);
    if (on) p.px(3, 3, C.ink3);
    box(p, 1, 8, 14, 8, S.w, S.w2);
    p.rect(2, 9, 12, 1, S.w3);
    for (let x = 3; x < 14; x += 2) p.rect(x, 10, 1, 5, [C.red, C.amber2, C.ink, C.leaf2, C.blue, C.paper][x % 6]);
  },
  intel_bookcase: (p) => {
    box(p, 0, 0, 24, 32, S.w, S.w2);
    p.rect(1, 1, 22, 1, S.w3);
    for (const y of [9, 17, 25]) p.rect(1, y, 22, 2, S.w2);
    books(p, 2, 9, 20, 3);
    books(p, 2, 17, 20, 7);
    books(p, 2, 25, 14, 11);
    // the one book that opens the secret door
    p.rect(18, 20, 2, 5, C.red);
    p.px(18, 20, C.amber);
    p.rect(2, 27, 20, 4, S.w2);
    p.rect(11, 28, 2, 1, S.m);
  },
  intel_wingback: (p) => {
    p.rect(2, 0, 12, 10, S.b);
    p.rect(2, 0, 12, 1, S.b3);
    p.rect(0, 2, 3, 7, S.b2);
    p.rect(13, 2, 3, 7, S.b2);
    p.rect(0, 8, 16, 4, S.b);
    p.rect(1, 8, 14, 1, S.b3);
    p.rect(0, 12, 16, 1, S.b2);
    for (const x of [1, 13]) p.rect(x, 13, 2, 3, S.w2);
  },
  intel_desk: (p, { on, night }) => {
    const lit = on || night;
    // banker's lamp, papers and a blotter
    p.rect(22, 3, 1, 4, S.m);
    p.rect(19, 1, 7, 2, C.leaf2);
    p.rect(20, 0, 5, 1, C.leaf3);
    if (lit) p.rect(19, 3, 7, 1, C.glow);
    p.rect(20, 7, 5, 1, S.m);
    p.rect(4, 6, 8, 2, C.paper);
    p.px(6, 6, C.red);
    p.rect(13, 7, 5, 1, S.b);
    p.rect(0, 8, 32, 2, S.w3);
    p.rect(0, 10, 32, 1, S.w2);
    box(p, 1, 11, 9, 5, S.w, S.w2);
    box(p, 22, 11, 9, 5, S.w, S.w2);
    p.rect(4, 13, 3, 1, S.m);
    p.rect(25, 13, 3, 1, S.m);
  },
  intel_file_cabinet: (p) => {
    box(p, 0, 0, 8, 16, S.m, S.m2);
    for (const y of [1, 6, 11]) {
      p.rect(1, y, 6, 4, S.m3);
      p.rect(3, y + 1, 2, 1, C.ink2);
    }
    p.rect(1, 3, 6, 1, C.red);
  },
  intel_map_wall: (p) => {
    box(p, 0, 0, 24, 16, S.w2, C.ink2);
    p.rect(1, 1, 22, 14, '#e8dcc0');
    for (let y = 2; y < 14; y++) for (let x = 2; x < 22; x++) if (hash(Math.floor(x / 3), Math.floor(y / 2)) > 0.58) p.px(x, y, '#b9a77f');
    const pins: Array<[number, number]> = [
      [5, 4],
      [12, 9],
      [18, 5],
      [8, 11],
    ];
    pins.forEach(([x, y]) => p.px(x, y, C.red));
    for (let i = 0; i < pins.length - 1; i++) {
      const [x0, y0] = pins[i];
      const [x1, y1] = pins[i + 1];
      for (let t = 1; t < 8; t++) p.px(Math.round(x0 + ((x1 - x0) * t) / 8), Math.round(y0 + ((y1 - y0) * t) / 8), C.red2);
    }
  },
  intel_portrait: (p) => {
    box(p, 0, 0, 16, 16, S.m, S.m2);
    p.rect(2, 2, 12, 12, S.a2);
    disc(p, 8, 6, 2.5, '#e0b48c');
    p.rect(6, 4, 5, 1, C.ink2);
    p.rect(4, 10, 8, 4, C.ink2);
    p.rect(7, 10, 2, 3, C.white);
    p.px(8, 11, C.red);
  },
  intel_decanter: (p) => {
    p.rect(3, 0, 2, 1, S.m);
    p.rect(3, 1, 2, 2, '#cbd5e1');
    p.rect(1, 3, 6, 4, '#cbd5e1');
    p.rect(2, 4, 4, 3, C.amber2);
    p.px(2, 4, C.glow);
    p.rect(0, 7, 8, 1, S.w2);
  },
  intel_banker_lamp: (p, { on, night }) => {
    const lit = on || night;
    p.rect(1, 1, 6, 2, S.a);
    p.rect(2, 0, 4, 1, S.a3);
    if (lit) p.rect(1, 3, 6, 1, C.glow);
    p.rect(3, 4, 2, 2, S.m);
    p.rect(1, 6, 6, 2, S.m);
    p.rect(1, 6, 6, 1, S.m3);
  },
  intel_cipher_machine: (p, { on }) => {
    box(p, 0, 1, 8, 7, S.w, S.w2);
    p.rect(1, 2, 6, 2, C.ink2);
    for (let x = 1; x < 7; x += 2) p.px(x + 1, 2, on && hash(x, 2) > 0.5 ? C.glow : C.ink3);
    for (let x = 1; x < 7; x++) {
      p.px(x, 5, x % 2 ? C.paper : C.paper2);
      p.px(x, 6, x % 2 ? C.paper2 : C.paper);
    }
  },
  intel_persian_floor: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cx = (x % 16) - 7.5;
        const cy = (y % 12) - 5.5;
        const d = Math.abs(cx) + Math.abs(cy);
        if (d < 3) p.px(x, y, S.a3);
        else if (d > 6.5 && d < 7.5) p.px(x, y, S.a);
        else if ((x + y) % 7 === 0) p.px(x, y, S.a);
      }
    }
    p.rect(0, 0, w, 1, S.a3);
  },
  intel_damask_wall: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a2);
    // A fleur motif in a half-drop repeat, the way damask is woven.
    const motif = ['...#...', '..###..', '.#.#.#.', '#..#..#', '##.#.##', '.#####.', '...#...', '..###..'];
    for (let row = 0; row * 7 < h + 8; row++) {
      for (let x = (row % 2) * 7 - 7; x < w; x += 14) {
        motif.forEach((line, dy) => {
          for (let dx = 0; dx < line.length; dx++) if (line[dx] === '#') p.px(x + dx, row * 7 - 4 + dy, S.a);
        });
      }
    }
  },
};
