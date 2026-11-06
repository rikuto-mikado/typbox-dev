// MY ROOM art pack: STUDY DESK: more desks and the chairs that tuck into
// them, the shelves that fill up over a school year, and what goes on the
// wall above a desk (plans, formulas, a progress chart). Screens light up
// while the stopwatch runs (`on`). Recolourable parts use the S slots.
import { books, box, C, disc, S, text, type Art, type Painter } from './roomPaint';

const screen = (p: Painter, x: number, y: number, w: number, h: number, on: boolean, frame: string) => {
  box(p, x, y, w, h, on ? C.screenOn : C.screenOff, frame);
  if (on) {
    p.rect(x + 2, y + 2, Math.max(1, w - 6), 1, C.leaf3);
    if (h > 5) p.rect(x + 2, y + 4, Math.max(1, w - 8), 1, C.sky);
  }
};

const SPINES = ['#c2483b', '#3d5a80', '#d4a017', '#2f5d3a', '#efe6d2', '#7c3a78', '#0d9488', '#f97362'];

export const STUDY_DESK_ART: Record<string, Art> = {
  // --------------------------------------------------------------- desks
  desk_simple: (p, { on }) => {
    screen(p, 8, 1, 8, 6, on, C.ink3);
    p.rect(6, 7, 12, 1, C.metal);
    p.rect(19, 4, 3, 3, C.white);
    p.rect(22, 5, 1, 1, C.white);
    p.rect(0, 8, 24, 2, S.w3);
    p.rect(0, 9, 24, 1, S.w);
    p.rect(1, 10, 2, 6, S.w2);
    p.rect(21, 10, 2, 6, S.w2);
  },
  desk_drawers: (p) => {
    books(p, 15, 7, 6, 2);
    p.rect(2, 5, 6, 2, C.white);
    p.rect(3, 4, 4, 1, C.paper2);
    p.rect(0, 7, 24, 2, S.w3);
    p.rect(0, 8, 24, 1, S.w);
    box(p, 1, 9, 8, 7, S.w, S.w2);
    p.rect(1, 12, 8, 1, S.w2);
    p.rect(4, 10, 2, 1, C.metal);
    p.rect(4, 14, 2, 1, C.metal);
    p.rect(21, 9, 2, 7, S.w2);
  },
  desk_trestle: (p, { on }) => {
    screen(p, 11, 0, 11, 7, on, S.m2);
    p.rect(16, 7, 1, 1, S.m);
    p.rect(14, 8, 5, 1, S.m);
    p.rect(4, 7, 6, 1, C.ink3);
    p.rect(26, 4, 3, 4, C.pot);
    p.rect(25, 1, 5, 3, C.leaf2);
    p.rect(26, 1, 2, 1, C.leaf);
    p.rect(0, 9, 32, 2, S.w3);
    p.rect(0, 10, 32, 1, S.w);
    for (const x of [3, 24]) {
      for (let i = 0; i < 5; i++) {
        p.px(x + 2 - Math.floor(i / 2), 11 + i, S.m);
        p.px(x + 3 + Math.floor(i / 2), 11 + i, S.m);
      }
      p.rect(x, 13, 6, 1, S.m2);
    }
  },
  desk_rgb: (p, { on }) => {
    screen(p, 4, 0, 16, 7, on, C.ink);
    p.rect(11, 7, 2, 1, C.ink2);
    p.rect(9, 8, 6, 1, C.ink2);
    p.rect(3, 8, 5, 1, C.ink3);
    p.rect(16, 8, 3, 1, C.ink3);
    p.rect(0, 9, 24, 2, S.m);
    p.rect(0, 9, 24, 1, S.m3);
    const rgb = ['#f43f5e', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6'];
    for (let x = 0; x < 24; x++) p.px(x, 11, on ? rgb[Math.floor(x / 5) % rgb.length] : S.m2);
    p.rect(1, 12, 2, 4, S.m2);
    p.rect(21, 12, 2, 4, S.m2);
    p.rect(0, 15, 5, 1, S.m2);
    p.rect(19, 15, 5, 1, S.m2);
  },
  desk_bureau: (p) => {
    // roll-top hood with pigeonholes
    p.rect(2, 1, 20, 1, S.w2);
    p.rect(1, 2, 22, 10, S.w);
    p.rect(1, 2, 22, 1, S.w3);
    p.rect(3, 4, 18, 7, S.w2);
    for (let x = 4; x < 20; x += 4) {
      p.rect(x, 5, 3, 2, C.walnut2);
      p.rect(x, 8, 3, 2, C.walnut2);
    }
    p.rect(4, 5, 2, 2, C.paper);
    p.rect(12, 8, 2, 2, C.white);
    p.rect(16, 5, 1, 2, C.red);
    // writing surface
    p.rect(0, 11, 24, 2, S.w3);
    p.rect(6, 10, 7, 1, C.white);
    p.rect(14, 10, 3, 1, C.ink3);
    // pedestals
    for (const x of [1, 16]) {
      box(p, x, 13, 7, 11, S.w, S.w2);
      p.rect(x, 17, 7, 1, S.w2);
      p.rect(x, 21, 7, 1, S.w2);
      p.px(x + 3, 15, C.amber2);
      p.px(x + 3, 19, C.amber2);
    }
    p.rect(8, 13, 8, 2, S.w2);
  },
  desk_low: (p) => {
    p.rect(3, 0, 5, 2, C.white);
    p.rect(3, 1, 5, 1, C.paper2);
    p.rect(10, 1, 4, 1, C.red);
    p.rect(14, 0, 4, 2, C.blue);
    p.rect(19, 1, 2, 1, C.ink3);
    p.rect(0, 2, 24, 2, S.w3);
    p.rect(0, 3, 24, 1, S.w);
    p.rect(1, 4, 2, 4, S.w2);
    p.rect(21, 4, 2, 4, S.w2);
  },
  // -------------------------------------------------------------- chairs
  chair_mesh: (p) => {
    p.rect(1, 0, 6, 8, S.a2);
    for (let y = 1; y < 8; y += 2) p.rect(2, y, 4, 1, S.a);
    for (let x = 2; x < 6; x += 2) p.rect(x, 1, 1, 7, S.a3);
    p.rect(0, 8, 8, 2, S.a);
    p.rect(0, 8, 8, 1, S.a3);
    p.rect(0, 6, 1, 3, C.ink3);
    p.rect(7, 6, 1, 3, C.ink3);
    p.rect(3, 10, 2, 3, C.metal2);
    p.rect(0, 13, 8, 1, C.ink3);
    p.px(0, 14, C.ink2);
    p.px(4, 14, C.ink2);
    p.px(7, 14, C.ink2);
    p.rect(0, 15, 2, 1, C.ink2);
    p.rect(6, 15, 2, 1, C.ink2);
  },
  chair_wood: (p) => {
    p.rect(1, 0, 1, 15, S.w2);
    p.rect(6, 0, 1, 9, S.w2);
    for (const y of [1, 4, 7]) p.rect(2, y, 4, 1, S.w);
    p.rect(0, 9, 8, 2, S.w3);
    p.rect(0, 10, 8, 1, S.w);
    p.rect(6, 11, 1, 5, S.w2);
    p.rect(1, 13, 6, 1, S.w2);
  },
  chair_ball: (p) => {
    disc(p, 4, 3.5, 3.5, S.a);
    p.rect(2, 1, 2, 1, S.a3);
    p.px(1, 2, S.a3);
    p.rect(0, 6, 8, 1, C.ink3);
    p.px(0, 7, C.ink2);
    p.px(7, 7, C.ink2);
  },
  chair_zaisu: (p) => {
    p.rect(1, 0, 5, 1, S.a3);
    p.rect(1, 1, 5, 5, S.a);
    p.rect(5, 1, 1, 5, S.a2);
    p.rect(0, 5, 8, 2, S.a);
    p.rect(0, 5, 8, 1, S.a3);
    p.rect(0, 7, 8, 1, C.ink3);
  },
  chair_kneeling: (p) => {
    p.rect(0, 1, 5, 2, S.a);
    p.rect(0, 1, 5, 1, S.a3);
    p.rect(4, 5, 4, 2, S.a);
    p.rect(4, 5, 4, 1, S.a3);
    for (let i = 0; i < 5; i++) p.px(1 + i, 3 + i, S.w2);
    p.rect(2, 3, 1, 1, S.w);
    p.rect(0, 7, 3, 1, S.w);
    p.rect(5, 7, 3, 1, S.w);
  },
  // ------------------------------------------------------------- shelves
  book_tower: (p) => {
    p.rect(0, 0, 8, 1, S.w3);
    for (const y of [1, 7, 13, 19]) {
      books(p, 1, y + 5, 6, y);
      p.rect(0, y + 5, 8, 1, S.w);
    }
    p.rect(0, 1, 1, 23, S.w2);
    p.rect(7, 1, 1, 23, S.w2);
  },
  bookcase_low: (p) => {
    p.rect(0, 0, 24, 1, S.w3);
    box(p, 0, 1, 24, 7, S.w2, S.w);
    books(p, 1, 7, 7, 1);
    books(p, 9, 7, 6, 4);
    p.rect(17, 5, 5, 2, C.white);
    p.rect(17, 4, 4, 1, C.paper2);
    p.rect(8, 1, 1, 7, S.w);
    p.rect(16, 1, 1, 7, S.w);
  },
  bookcase_glass: (p) => {
    p.rect(0, 0, 16, 2, S.w3);
    p.rect(0, 1, 16, 1, S.w);
    p.rect(0, 2, 16, 28, S.w);
    for (let i = 0; i < 4; i++) {
      p.rect(1, 3 + i * 6, 14, 6, S.w2);
      books(p, 2, 9 + i * 6, 12, i * 3 + 1);
      p.rect(1, 8 + i * 6, 14, 1, S.w);
    }
    // glass doors: a glint on each pane
    p.rect(7, 2, 2, 25, S.w);
    for (const x of [3, 11]) for (let y = 4; y < 26; y += 7) p.px(x, y, '#dff2fb');
    p.rect(6, 15, 1, 2, C.amber2);
    p.rect(9, 15, 1, 2, C.amber2);
    p.rect(0, 27, 16, 3, S.w2);
    p.rect(1, 30, 2, 2, S.w2);
    p.rect(13, 30, 2, 2, S.w2);
  },
  rolling_cart: (p) => {
    p.rect(0, 0, 1, 14, S.m2);
    p.rect(7, 0, 1, 14, S.m2);
    for (const y of [3, 8, 13]) {
      p.rect(0, y, 8, 1, S.m);
      p.rect(1, y - 1, 6, 1, S.m3);
    }
    p.rect(1, 0, 2, 2, C.red);
    p.rect(4, 1, 2, 1, C.amber);
    p.rect(1, 5, 3, 2, C.white);
    p.rect(5, 4, 1, 3, C.leaf2);
    p.rect(2, 10, 4, 2, C.sky2);
    p.px(1, 15, C.ink2);
    p.px(6, 15, C.ink2);
  },
  file_boxes: (p) => {
    for (let i = 0; i < 4; i++) {
      const x = i * 4;
      p.rect(x, 2 + (i % 2), 3, 6 - (i % 2), S.a);
      p.rect(x, 2 + (i % 2), 1, 6 - (i % 2), S.a3);
      p.rect(x + 1, 5, 1, 2, C.white);
      p.rect(x + 1, 1 + (i % 2), 2, 1, SPINES[i * 2]);
    }
  },
  printer_cabinet: (p, { on }) => {
    p.rect(0, 2, 8, 4, C.paper);
    p.rect(0, 2, 8, 1, C.white);
    p.rect(1, 1, 6, 1, C.white);
    p.rect(2, 4, 4, 1, C.ink3);
    p.px(6, 3, on ? C.leaf3 : C.leaf2);
    box(p, 0, 6, 8, 10, S.w, S.w2);
    p.rect(1, 10, 6, 1, S.w2);
    p.rect(3, 8, 2, 1, C.metal);
    p.rect(3, 12, 2, 1, C.metal);
  },
  plastic_drawers: (p) => {
    p.rect(0, 0, 8, 1, C.white);
    for (let i = 0; i < 4; i++) {
      const y = 1 + i * 3 + (i > 0 ? 0 : 0);
      p.rect(0, y, 8, 3, S.a3);
      p.rect(1, y + 1, 6, 1, S.a);
      p.rect(3, y + 1, 2, 1, C.white);
    }
    p.rect(0, 13, 8, 1, C.white);
    p.px(0, 14, C.ink3);
    p.px(7, 14, C.ink3);
    p.rect(1, 3, 2, 1, C.red);
    p.rect(4, 6, 2, 1, C.amber);
  },
  manga_shelf: (p) => {
    p.rect(0, 0, 16, 24, S.w);
    p.rect(0, 0, 16, 1, S.w3);
    for (let r = 0; r < 4; r++) {
      const y = 1 + r * 6;
      p.rect(1, y, 14, 5, S.w2);
      for (let x = 1; x < 15; x++) {
        const c = SPINES[(x * 3 + r * 5) % SPINES.length];
        p.rect(x, y + 1 + ((x + r) % 3 === 0 ? 1 : 0), 1, 4 - ((x + r) % 3 === 0 ? 1 : 0), c);
      }
      p.rect(0, y + 5, 16, 1, S.w);
    }
  },
  // ------------------------------------------------------------- the wall
  wall_books: (p) => {
    books(p, 1, 6, 9, 3);
    p.rect(11, 3, 3, 3, C.pot);
    p.rect(10, 1, 5, 2, C.leaf2);
    p.rect(11, 0, 2, 1, C.leaf);
    p.rect(16, 4, 2, 2, C.amber);
    p.px(17, 3, C.amber2);
    books(p, 19, 6, 4, 7);
    p.rect(0, 6, 24, 2, S.w);
    p.rect(0, 6, 24, 1, S.w3);
  },
  study_plan: (p) => {
    box(p, 0, 0, 16, 16, C.white, C.ink3);
    p.rect(1, 1, 14, 2, S.a);
    for (let x = 1; x < 15; x += 2) p.px(x, 4, C.metal);
    for (let i = 0; i < 5; i++) {
      p.rect(2 + (i % 2) * 6, 6 + i * 2, 4 + (i % 3), 1, [S.a, S.a2, C.amber, S.a3, C.red][i]);
    }
    p.rect(2, 14, 3, 1, C.leaf);
  },
  formula_poster: (p) => {
    box(p, 0, 0, 16, 16, '#24392f', C.walnut);
    text(p, 2, 2, 'E=M', C.white);
    p.rect(14, 2, 1, 1, C.white);
    p.rect(2, 9, 5, 1, C.paper2);
    p.rect(3, 10, 3, 1, C.paper2);
    p.rect(9, 8, 1, 5, C.paper2);
    p.rect(9, 12, 5, 1, C.paper2);
    for (let i = 0; i < 4; i++) p.px(10 + i, 11 - i, C.amber);
  },
  vocab_cards: (p) => {
    for (let x = 0; x < 16; x++) p.px(x, 1 + (x % 8 === 4 ? 1 : 0), C.ink3);
    for (const [x, c] of [
      [1, C.white],
      [5, '#fef3c7'],
      [9, C.white],
      [13, '#dbeafe'],
    ] as const) {
      p.px(x + 1, 2, C.red);
      p.rect(x, 3, 3, 4, c);
      p.rect(x, 4, 2, 1, C.ink3);
    }
  },
  grade_chart: (p) => {
    box(p, 0, 0, 16, 16, C.white, C.ink3);
    for (let y = 3; y < 14; y += 3) p.rect(2, y, 12, 1, C.paper);
    p.rect(2, 2, 1, 12, C.ink3);
    p.rect(2, 13, 12, 1, C.ink3);
    const pts = [11, 10, 11, 8, 7, 7, 5, 4, 4, 2];
    pts.forEach((y, i) => {
      p.px(3 + i, y, S.a);
      p.px(3 + i, y + 1, S.a2);
    });
    p.rect(12, 1, 2, 2, C.amber);
  },
  reading_sconce: (p, { on }) => {
    p.rect(0, 1, 2, 4, S.m2);
    p.rect(2, 2, 3, 1, S.m);
    p.rect(4, 2, 1, 2, S.m);
    p.rect(3, 4, 4, 2, S.m);
    p.rect(3, 4, 4, 1, S.m3);
    p.rect(4, 6, 2, 1, on ? C.glow : C.ink3);
  },
  wall_monitor: (p, { on }) => {
    p.rect(0, 6, 4, 4, C.ink3);
    p.rect(4, 7, 2, 2, C.metal2);
    box(p, 4, 1, 12, 13, on ? C.screenOn : C.screenOff, S.m2);
    p.rect(4, 13, 12, 1, S.m);
    if (on) {
      p.rect(6, 3, 6, 1, C.leaf3);
      p.rect(6, 5, 8, 1, C.sky);
      p.rect(6, 7, 4, 1, C.leaf3);
      p.rect(6, 9, 7, 1, C.emerald);
    }
  },
  acoustic_panels: (p) => {
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const x = c * 8;
        const y = r * 8;
        p.rect(x, y, 7, 7, S.a);
        for (let i = 1; i < 7; i += 2) p.rect(x + ((r + c) % 2 ? i : 0), y + ((r + c) % 2 ? 0 : i), (r + c) % 2 ? 1 : 7, (r + c) % 2 ? 7 : 1, S.a2);
        p.rect(x, y, 7, 1, S.a3);
      }
    }
  },
  goal_banner: (p) => {
    p.rect(0, 0, 8, 1, C.wood2);
    p.rect(1, 1, 6, 21, S.b);
    p.rect(1, 1, 1, 21, S.b3);
    [...'GOAL'].forEach((ch, i) => text(p, 3, 3 + i * 5, ch, C.white));
    p.px(1, 22, S.b2);
    p.px(3, 23, S.b2);
    p.px(5, 22, S.b2);
  },
  clipboard_row: (p) => {
    for (const x of [0, 8, 16]) {
      p.rect(x + 1, 1, 6, 7, S.w);
      p.rect(x + 2, 2, 4, 5, C.white);
      p.rect(x + 3, 0, 2, 2, C.metal);
      p.rect(x + 2, 3 + (x % 3), 3, 1, C.ink3);
      p.rect(x + 2, 5, 4, 1, C.metal);
    }
  },
  diploma_row: (p) => {
    for (const x of [0, 9, 17]) {
      const w = x === 9 ? 6 : 7;
      p.rect(x, 1, w, 6, S.w);
      p.rect(x + 1, 2, w - 2, 4, C.paper);
      p.rect(x + 2, 3, w - 4, 1, C.ink3);
      p.px(x + w - 2, 5, C.red);
    }
  },
  cork_strip: (p) => {
    p.rect(0, 1, 24, 6, C.cork);
    p.rect(0, 1, 24, 1, C.cork2);
    p.rect(0, 6, 24, 1, C.cork2);
    p.rect(1, 2, 4, 4, '#fef3c7');
    p.px(3, 2, C.red);
    p.rect(6, 2, 5, 4, C.white);
    p.rect(7, 3, 3, 2, C.sky2);
    p.px(8, 2, C.blue);
    p.rect(12, 2, 4, 3, '#fbcfe8');
    p.px(13, 2, C.leaf);
    p.rect(17, 2, 6, 4, C.white);
    p.rect(18, 3, 4, 1, C.ink3);
    p.rect(18, 4, 3, 1, C.metal);
    p.px(20, 2, C.red);
  },
  // ------------------------------------------------------------ the floor
  paper_bin: (p) => {
    p.rect(2, 1, 2, 2, C.white);
    p.rect(4, 2, 2, 1, C.paper);
    p.rect(1, 3, 6, 5, S.m);
    p.rect(1, 3, 6, 1, S.m3);
    p.rect(2, 4, 1, 4, S.m2);
    p.rect(5, 4, 1, 4, S.m2);
    p.px(6, 6, C.white);
    p.px(7, 7, C.paper);
  },
  paper_stack: (p) => {
    p.rect(0, 3, 4, 5, C.white);
    for (let y = 4; y < 8; y += 2) p.rect(0, y, 4, 1, C.paper2);
    p.rect(4, 5, 4, 3, C.paper);
    p.rect(4, 6, 4, 1, C.white);
    p.rect(1, 3, 2, 1, C.ink2);
    p.rect(5, 4, 2, 1, '#fde047');
  },
  textbook_pile: (p) => {
    const piles = [
      [0, 13, 8, '#3d5a80'],
      [1, 10, 7, '#c2483b'],
      [0, 7, 7, '#2f5d3a'],
      [1, 5, 6, '#d4a017'],
      [2, 3, 5, '#efe6d2'],
    ] as const;
    for (const [x, y, w, c] of piles) {
      const h = y === 13 ? 3 : y === 10 ? 3 : 2;
      p.rect(x, y, w, h, c);
      p.rect(x, y + h - 1, 1, 1, C.white);
      p.rect(x + w - 1, y, 1, h, C.paper);
    }
    p.rect(3, 1, 3, 2, '#fde047');
  },
  inkjet_printer: (p, { on }) => {
    p.rect(2, 0, 4, 2, C.white);
    p.rect(0, 2, 8, 4, S.m);
    p.rect(0, 2, 8, 1, S.m3);
    p.rect(1, 4, 6, 1, C.ink3);
    p.px(6, 3, on ? C.leaf3 : C.leaf2);
    p.rect(1, 6, 6, 1, C.white);
    p.rect(0, 7, 8, 1, S.m2);
  },
  rolling_whiteboard: (p) => {
    p.rect(0, 0, 16, 1, S.m);
    p.rect(0, 0, 1, 21, S.m);
    p.rect(15, 0, 1, 21, S.m);
    p.rect(1, 1, 14, 13, C.white);
    p.rect(3, 3, 6, 1, C.blue);
    p.rect(3, 5, 9, 1, C.ink3);
    p.rect(3, 7, 4, 1, C.ink3);
    p.rect(9, 8, 4, 4, C.red);
    p.rect(10, 9, 2, 2, C.white);
    p.rect(1, 14, 14, 1, S.m2);
    p.rect(3, 13, 2, 1, C.red);
    p.rect(6, 13, 2, 1, C.blue);
    p.rect(1, 21, 14, 1, S.m2);
    p.px(1, 23, C.ink2);
    p.px(14, 23, C.ink2);
    p.rect(0, 22, 2, 1, S.m2);
    p.rect(14, 22, 2, 1, S.m2);
  },
  flipchart: (p) => {
    p.rect(1, 0, 6, 1, S.m);
    p.rect(1, 1, 6, 12, C.white);
    p.rect(2, 3, 4, 1, C.blue);
    p.rect(2, 5, 3, 1, C.ink3);
    p.rect(2, 7, 4, 1, C.ink3);
    p.rect(2, 9, 2, 2, C.red);
    p.rect(1, 13, 6, 1, C.paper2);
    p.rect(3, 13, 2, 9, S.m2);
    for (let i = 0; i < 9; i++) {
      p.px(2 - Math.floor(i / 4), 14 + i, S.m);
      p.px(5 + Math.floor(i / 4), 14 + i, S.m);
    }
    p.rect(0, 23, 2, 1, S.m2);
    p.rect(6, 23, 2, 1, S.m2);
  },
  task_floor_lamp: (p, { on }) => {
    p.rect(1, 0, 5, 1, S.m3);
    p.rect(0, 1, 6, 3, S.m);
    p.rect(1, 4, 4, 1, on ? C.glow : C.ink3);
    p.rect(6, 2, 1, 1, S.m2);
    for (let i = 0; i < 6; i++) p.px(6 - Math.floor(i / 3), 3 + i, S.m2);
    p.rect(4, 9, 1, 13, S.m2);
    p.rect(1, 22, 7, 2, S.m);
    p.rect(1, 22, 7, 1, S.m3);
  },
  nas_box: (p, { on }) => {
    p.rect(1, 1, 6, 7, S.m);
    p.rect(1, 1, 6, 1, S.m3);
    for (let y = 2; y < 7; y += 2) {
      p.rect(2, y, 3, 1, S.m2);
      p.px(5, y, on || y < 5 ? C.leaf3 : C.leaf2);
    }
    p.px(6, 7, C.sky);
  },
  book_crate: (p) => {
    for (const y of [0, 8]) {
      p.rect(0, y + 1, 8, 7, S.w);
      p.rect(0, y + 1, 8, 1, S.w3);
      p.rect(0, y + 4, 8, 1, S.w2);
      p.rect(0, y + 7, 8, 1, S.w2);
    }
    for (let x = 1; x < 7; x++) p.rect(x, 0 + (x % 3 === 0 ? 1 : 0), 1, 3 - (x % 3 === 0 ? 1 : 0), SPINES[x]);
    for (let x = 1; x < 7; x++) p.rect(x, 9, 1, 2, SPINES[x + 2]);
  },
};
