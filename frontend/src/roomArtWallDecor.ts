// MY ROOM art pack: WALL DECOR: what goes up on the wall over the years.
// Posters and prints, handmade things (hoops, weaving, pressed flowers),
// clocks and boards, and a fold-down desk. Frames that variants recolour use
// the S slots (roomPaint.ts).
import { C, disc, S, text, type Art, type Painter } from './roomPaint';

/** A plain poster sheet with a thin white border. */
const sheet = (p: Painter, w: number, h: number, fill: string) => {
  p.rect(0, 0, w, h, C.white);
  p.rect(1, 1, w - 2, h - 2, fill);
};

/** A frame of colour S.w around a w x h picture. */
const framed = (p: Painter, w: number, h: number, fill: string) => {
  p.rect(0, 0, w, h, S.w);
  p.rect(0, 0, w, 1, S.w3);
  p.rect(1, 1, w - 2, h - 2, C.white);
  p.rect(2, 2, w - 4, h - 4, fill);
};

export const WALL_DECOR_ART: Record<string, Art> = {
  // --------------------------------------------------------------- posters
  poster_mountain: (p) => {
    framed(p, 16, 24, '#bfe3f5');
    for (let i = 0; i < 9; i++) p.rect(8 - i, 6 + i, 1 + i * 2, 1, '#64748b');
    for (let i = 0; i < 3; i++) p.rect(8 - i, 6 + i, 1 + i * 2, 1, C.white);
    for (let i = 0; i < 6; i++) p.rect(12 - i, 11 + i, 1 + i * 2, 1, '#475569');
    p.rect(2, 16, 12, 6, '#2f5d3a');
    p.rect(2, 16, 12, 1, '#4a7d56');
    disc(p, 11, 4, 1.5, '#fde68a');
  },
  poster_rocket: (p) => {
    sheet(p, 16, 24, '#1e1b4b');
    for (const [x, y] of [
      [3, 3],
      [12, 5],
      [4, 13],
      [13, 17],
    ] as const)
      p.px(x, y, C.star);
    p.rect(7, 3, 2, 1, '#ef4444');
    p.rect(6, 4, 4, 9, C.white);
    p.rect(7, 6, 2, 2, '#38bdf8');
    p.rect(4, 11, 2, 3, '#ef4444');
    p.rect(10, 11, 2, 3, '#ef4444');
    p.rect(7, 13, 2, 3, '#fbbf24');
    p.rect(7, 16, 2, 2, '#f97316');
    text(p, 3, 19, 'GO', '#fde047');
  },
  poster_mecha: (p) => {
    sheet(p, 16, 24, '#fef3c7');
    p.rect(1, 16, 14, 7, '#f97316');
    p.rect(6, 3, 4, 3, C.white);
    p.rect(7, 4, 2, 1, '#22d3ee');
    p.rect(5, 6, 6, 6, '#3b82f6');
    p.rect(6, 7, 4, 2, '#ef4444');
    p.rect(3, 6, 2, 6, C.white);
    p.rect(11, 6, 2, 6, C.white);
    p.rect(5, 12, 2, 7, C.white);
    p.rect(9, 12, 2, 7, C.white);
    p.rect(5, 19, 2, 1, '#3b82f6');
    p.rect(9, 19, 2, 1, '#3b82f6');
    p.rect(7, 2, 2, 1, '#fde047');
  },
  poster_ramen: (p) => {
    sheet(p, 16, 16, '#fca5a5');
    p.rect(3, 9, 10, 4, '#b91c1c');
    p.rect(2, 8, 12, 2, C.white);
    p.rect(3, 7, 10, 1, '#fde68a');
    p.rect(5, 6, 3, 2, '#fde68a');
    disc(p, 10, 7, 1.4, '#fef3c7');
    p.px(10, 7, '#f59e0b');
    for (let i = 0; i < 5; i++) p.px(9 + i, 1 + i, C.walnut);
    for (let i = 0; i < 5; i++) p.px(11 + i, 1 + i, C.walnut);
  },
  poster_bauhaus: (p) => {
    framed(p, 16, 24, '#f5efe0');
    disc(p, 6, 7, 3.5, '#dc2626');
    p.rect(8, 10, 6, 6, '#1e3a6e');
    for (let i = 0; i < 6; i++) p.rect(2, 15 + i, 6 - i, 1, '#d4a017');
    p.rect(2, 20, 12, 1, C.ink);
  },
  poster_retro_car: (p) => {
    sheet(p, 24, 16, '#fdba74');
    p.rect(1, 10, 22, 5, '#78716c');
    disc(p, 17, 6, 3, '#fde68a');
    p.rect(4, 7, 12, 3, '#0d9488');
    p.rect(7, 5, 6, 2, '#0d9488');
    p.rect(8, 6, 4, 1, '#bae6fd');
    disc(p, 6.5, 10.5, 1.5, C.ink);
    disc(p, 13.5, 10.5, 1.5, C.ink);
    p.rect(1, 12, 22, 1, '#fef3c7');
  },
  poster_whale: (p) => {
    framed(p, 24, 16, '#dbeafe');
    p.rect(2, 9, 20, 5, '#93c5fd');
    p.rect(5, 6, 12, 5, '#1e3a6e');
    p.rect(4, 7, 1, 3, '#1e3a6e');
    p.rect(17, 7, 2, 2, '#1e3a6e');
    p.rect(19, 5, 2, 3, '#1e3a6e');
    p.rect(6, 9, 10, 2, '#cbd5e1');
    p.px(7, 7, C.white);
    p.rect(9, 3, 1, 2, '#93c5fd');
    p.rect(8, 2, 3, 1, '#93c5fd');
  },
  poster_city_night: (p) => {
    sheet(p, 16, 24, '#312e81');
    disc(p, 11, 5, 2.2, '#fef3c7');
    for (const [x, w, top] of [
      [1, 4, 12],
      [5, 3, 8],
      [8, 4, 14],
      [12, 3, 10],
    ] as const) {
      p.rect(x, top, w, 23 - top, '#1e1b4b');
      for (let y = top + 1; y < 22; y += 2) for (let xx = x + 1; xx < x + w - 1; xx += 1) if ((xx + y) % 3) p.px(xx, y, '#fbbf24');
    }
    text(p, 2, 1, 'TKY', '#f472b6');
  },
  poster_dream: (p) => {
    sheet(p, 24, 16, '#faf5ea');
    p.rect(2, 2, 20, 1, S.a);
    text(p, 2, 5, 'DREAM', C.ink);
    p.rect(2, 12, 12, 1, S.a);
    p.rect(2, 13, 7, 1, S.a2);
    disc(p, 19, 12, 1.5, S.a);
  },
  poster_dino: (p) => {
    sheet(p, 16, 16, '#a7f3d0');
    p.rect(3, 6, 8, 5, '#15803d');
    p.rect(10, 3, 4, 4, '#15803d');
    p.px(12, 4, C.white);
    p.rect(1, 7, 3, 2, '#15803d');
    p.rect(4, 11, 2, 3, '#15803d');
    p.rect(8, 11, 2, 3, '#15803d');
    for (let x = 4; x < 11; x += 2) p.px(x, 5, '#fbbf24');
    p.rect(1, 14, 14, 1, '#65a30d');
  },
  poster_coffee: (p) => {
    sheet(p, 16, 16, '#fde68a');
    p.rect(4, 6, 7, 7, '#7c4a2d');
    p.rect(4, 6, 7, 1, '#a16207');
    p.rect(11, 8, 2, 3, '#7c4a2d');
    p.rect(3, 13, 10, 1, C.white);
    p.rect(6, 2, 1, 3, C.white);
    p.rect(8, 3, 1, 2, C.white);
    p.rect(5, 8, 5, 1, '#fef3c7');
  },
  poster_vaporwave: (p) => {
    sheet(p, 16, 24, '#f0abfc');
    p.rect(1, 1, 14, 6, '#c084fc');
    disc(p, 8, 10, 4.5, '#fde047');
    for (let y = 8; y < 14; y += 2) p.rect(3, y, 10, 1, '#f472b6');
    p.rect(1, 14, 14, 9, '#4c1d95');
    for (let x = 1; x < 15; x += 3) p.rect(x, 14, 1, 9, '#22d3ee');
    for (let y = 16; y < 23; y += 3) p.rect(1, y, 14, 1, '#22d3ee');
  },
  poster_runner: (p) => {
    sheet(p, 16, 24, S.a);
    disc(p, 9, 5, 1.6, C.white);
    p.rect(8, 7, 2, 6, C.white);
    for (let i = 0; i < 4; i++) {
      p.px(7 - i, 8 + i, C.white);
      p.px(10 + i, 10 - i, C.white);
      p.px(8 - i, 13 + i, C.white);
      p.px(10 + Math.floor(i / 2), 13 + i, C.white);
    }
    p.rect(2, 19, 12, 1, S.a2);
    text(p, 2, 20, 'RUN', S.a3);
  },
  // ------------------------------------------------------------ art
  canvas_trio: (p) => {
    for (let i = 0; i < 3; i++) {
      const x = i * 8;
      p.rect(x, 1, 7, 14, '#f6f3ee');
      p.rect(x, 14, 7, 1, '#cfc9bd');
    }
    disc(p, 3.5, 9, 4, S.a);
    p.rect(8, 6, 7, 3, S.a2);
    disc(p, 11.5, 11, 2, S.a3);
    disc(p, 19.5, 4, 4, S.a);
    p.rect(16, 10, 7, 5, S.a2);
  },
  line_art_face: (p) => {
    framed(p, 16, 16, '#f6f3ee');
    const line: [number, number][] = [
      [8, 3], [6, 4], [5, 6], [5, 8], [6, 10], [7, 11], [8, 12], [9, 11], [10, 9], [9, 8], [10, 6], [10, 4], [9, 3],
    ];
    for (const [x, y] of line) p.px(x, y, C.ink);
    p.px(7, 7, C.ink);
    p.rect(11, 9, 2, 3, '#f4b6c2');
  },
  embroidery_hoops: (p) => {
    const hoop = (cx: number, r: number, art: (x: number, y: number) => void) => {
      disc(p, cx, 4, r, C.oak);
      disc(p, cx, 4, r - 1, '#faf5ea');
      p.rect(Math.floor(cx), 0, 1, 1, C.oak2);
      art(Math.floor(cx), 4);
    };
    hoop(4, 3.6, (x, y) => {
      p.px(x, y - 1, '#ef4444');
      p.px(x - 1, y, '#ef4444');
      p.px(x + 1, y, '#ef4444');
      p.px(x, y + 1, '#16a34a');
    });
    hoop(12, 3.6, (x, y) => {
      p.rect(x - 1, y - 1, 3, 2, '#38bdf8');
      p.px(x, y + 1, '#16a34a');
    });
    hoop(20, 3.6, (x, y) => {
      p.px(x - 1, y - 1, '#f472b6');
      p.px(x + 1, y - 1, '#f472b6');
      p.rect(x - 1, y, 3, 1, '#f472b6');
      p.px(x, y + 1, '#f472b6');
    });
  },
  woven_hanging: (p) => {
    p.rect(0, 0, 16, 2, C.wood2);
    p.rect(1, 2, 14, 12, '#efe6d2');
    for (let y = 3; y < 14; y += 2) p.rect(1, y, 14, 1, '#d9cdb2');
    for (let i = 0; i < 4; i++) p.rect(3 + i, 5 + i, 10 - i * 2, 1, S.a);
    p.rect(2, 11, 12, 2, S.a2);
    for (let x = 1; x < 15; x += 2) p.rect(x, 14, 1, 6 + ((x * 3) % 4), x % 4 === 1 ? S.a : '#efe6d2');
  },
  pressed_flowers: (p) => {
    p.rect(0, 0, 8, 16, S.w);
    p.rect(1, 1, 6, 14, '#eaf6fb');
    p.rect(4, 6, 1, 8, '#65a30d');
    p.px(3, 9, '#65a30d');
    p.px(5, 11, '#65a30d');
    disc(p, 4, 4, 1.6, '#f472b6');
    p.px(4, 4, '#fde047');
    p.px(2, 8, '#a78bfa');
    p.px(6, 10, '#a78bfa');
  },
  butterfly_box: (p) => {
    p.rect(0, 0, 16, 16, S.w);
    p.rect(1, 1, 14, 14, '#faf5ea');
    const fly = (x: number, y: number, c: string, c2: string) => {
      p.rect(x, y, 2, 2, c);
      p.rect(x + 3, y, 2, 2, c);
      p.px(x + 1, y + 2, c2);
      p.px(x + 3, y + 2, c2);
      p.rect(x + 2, y, 1, 3, C.ink);
    };
    fly(2, 2, '#38bdf8', '#0284c7');
    fly(9, 3, '#f97316', '#c2410c');
    fly(3, 9, '#facc15', '#ca8a04');
    fly(9, 10, '#a855f7', '#7e22ce');
  },
  album_frames: (p) => {
    const covers: [string, (x: number, y: number) => void][] = [
      ['#1e1b4b', (x, y) => disc(p, x + 3.5, y + 3.5, 2, '#f472b6')],
      ['#fde047', (x, y) => p.rect(x + 1, y + 3, 5, 1, C.ink)],
      ['#0d9488', (x, y) => p.rect(x + 2, y + 1, 3, 5, '#f97316')],
    ];
    covers.forEach(([c, art], i) => {
      const x = i * 8;
      p.rect(x, 3, 8, 9, S.w);
      p.rect(x + 1, 4, 6, 7, c);
      art(x, 4);
    });
  },
  comic_panels: (p) => {
    p.rect(0, 0, 24, 16, C.white);
    const panels: [number, number, number, number, string][] = [
      [1, 1, 10, 6, '#fde68a'],
      [12, 1, 11, 6, '#bae6fd'],
      [1, 8, 7, 7, '#fecaca'],
      [9, 8, 14, 7, '#bbf7d0'],
    ];
    for (const [x, y, w, h, c] of panels) {
      p.rect(x, y, w, h, C.ink);
      p.rect(x + 1, y + 1, w - 2, h - 2, c);
    }
    p.rect(3, 2, 5, 3, C.white);
    p.px(5, 5, C.white);
    disc(p, 17, 4, 1.5, C.ink3);
    p.rect(3, 11, 3, 3, '#ef4444');
    p.rect(12, 10, 8, 2, C.white);
    p.rect(14, 12, 2, 2, C.ink3);
  },
  kids_drawings: (p) => {
    sheet(p, 11, 15, '#fffbeb');
    disc(p, 3, 3, 1.5, '#facc15');
    p.rect(3, 8, 5, 4, '#ef4444');
    for (let i = 0; i < 3; i++) p.rect(5 - i, 5 + i, 1 + i * 2, 1, '#3b82f6');
    p.rect(1, 12, 9, 2, '#22c55e');
    p.rect(12, 2, 11, 12, C.white);
    p.rect(13, 3, 9, 10, '#eff6ff');
    disc(p, 17, 7, 2.5, '#f97316');
    p.px(16, 6, C.ink);
    p.px(18, 6, C.ink);
    p.rect(16, 8, 3, 1, C.ink);
    p.px(12, 2, '#ef4444');
    p.px(22, 2, '#ef4444');
  },
  star_chart: (p) => {
    p.rect(0, 0, 24, 16, S.w);
    p.rect(1, 1, 22, 14, '#0f172a');
    disc(p, 12, 8, 6, '#1e293b');
    const stars: [number, number][] = [
      [4, 3], [7, 5], [10, 4], [13, 6], [16, 3], [19, 6], [9, 10], [12, 12], [15, 10], [5, 12], [20, 12],
    ];
    for (const [x, y] of stars) p.px(x, y, '#fde68a');
    for (let x = 4; x < 10; x++) p.px(x, 3 + Math.round((x - 4) / 3), '#334155');
    p.rect(7, 5, 6, 1, '#334155');
    p.px(10, 4, '#fde68a');
    p.px(7, 5, '#fde68a');
    p.px(13, 6, '#fde68a');
  },
  // ------------------------------------------------------- mirrors, clocks
  mirror_arch: (p) => {
    disc(p, 8, 7, 7.5, S.m);
    p.rect(0, 7, 16, 17, S.m);
    disc(p, 8, 7, 6.2, '#cfe8f3');
    p.rect(2, 7, 12, 15, '#cfe8f3');
    p.rect(4, 4, 1, 8, C.white);
    p.rect(5, 3, 1, 3, C.white);
    p.rect(2, 17, 12, 5, '#b8dcea');
    p.rect(0, 23, 16, 1, S.m2);
  },
  clock_big: (p) => {
    disc(p, 8, 8, 7.5, S.m);
    disc(p, 8, 8, 6.3, C.white);
    for (const [x, y] of [
      [8, 2],
      [14, 8],
      [8, 13],
      [2, 8],
    ] as const)
      p.px(x, y, C.ink);
    p.rect(8, 4, 1, 5, C.ink);
    p.rect(8, 8, 4, 1, C.ink);
    p.px(8, 8, '#ef4444');
  },
  flip_clock: (p) => {
    p.rect(0, 0, 16, 8, S.m);
    p.rect(0, 0, 16, 1, S.m3);
    for (const x of [1, 5, 9, 12]) {
      p.rect(x, 2, 3, 5, C.ink);
      p.rect(x, 4, 3, 1, C.ink3);
    }
    text(p, 1, 2, '1', C.white);
    text(p, 5, 2, '0', C.white);
    text(p, 9, 2, '3', C.white);
    p.rect(12, 2, 3, 5, C.ink);
    text(p, 12, 2, '0', C.white);
    p.px(8, 3, C.white);
    p.px(8, 5, C.white);
  },
  pendulum_clock: (p) => {
    p.rect(1, 0, 6, 1, S.w2);
    p.rect(0, 1, 8, 22, S.w);
    p.rect(0, 1, 8, 1, S.w3);
    disc(p, 4, 5, 2.8, C.white);
    p.rect(4, 3, 1, 3, C.ink);
    p.px(5, 5, C.ink);
    p.rect(1, 9, 6, 12, '#2b2522');
    p.rect(4, 9, 1, 8, C.amber2);
    disc(p, 4.5, 17, 1.4, C.amber);
    p.rect(1, 9, 6, 1, S.w2);
    p.rect(2, 23, 4, 1, S.w2);
  },
  tear_calendar: (p) => {
    p.rect(1, 0, 6, 2, '#ef4444');
    p.rect(1, 2, 6, 6, C.white);
    p.rect(1, 7, 6, 1, C.paper2);
    text(p, 2, 2, '7', C.ink);
    p.rect(6, 2, 1, 1, C.paper2);
  },
  letter_board: (p) => {
    p.rect(0, 0, 16, 16, S.w);
    p.rect(1, 1, 14, 14, C.ink2);
    for (let y = 2; y < 15; y += 2) p.rect(1, y, 14, 1, C.ink);
    text(p, 2, 3, 'HI', C.white);
    text(p, 2, 9, 'YOU', C.white);
  },
  magnet_board: (p) => {
    p.rect(0, 0, 16, 16, S.m);
    p.rect(1, 1, 14, 14, '#e5e7eb');
    p.rect(2, 2, 5, 6, C.white);
    p.px(4, 2, '#ef4444');
    p.rect(9, 3, 5, 4, '#fef3c7');
    p.px(11, 3, '#3b82f6');
    p.rect(3, 10, 6, 4, '#bae6fd');
    p.px(5, 10, '#22c55e');
    p.rect(11, 9, 3, 3, '#fde047');
    p.rect(11, 13, 2, 1, '#f472b6');
  },
  wire_grid: (p) => {
    for (let x = 0; x < 16; x += 3) p.rect(x, 0, 1, 16, S.m);
    for (let y = 0; y < 16; y += 3) p.rect(0, y, 16, 1, S.m);
    p.rect(1, 1, 5, 6, C.white);
    p.rect(2, 2, 3, 3, '#7dd3fc');
    p.rect(8, 4, 6, 5, C.white);
    p.rect(9, 5, 4, 3, '#fca5a5');
    p.rect(2, 10, 5, 5, C.white);
    p.rect(3, 11, 3, 2, '#86efac');
    p.rect(11, 11, 2, 3, C.leaf2);
    p.px(4, 1, C.ink3);
    p.px(10, 4, C.ink3);
  },
  skate_decks: (p) => {
    const deck = (x: number, c: string, c2: string) => {
      p.rect(x + 1, 0, 4, 1, c);
      p.rect(x, 1, 6, 14, c);
      p.rect(x + 1, 15, 4, 1, c);
      p.rect(x + 1, 4, 4, 6, c2);
      p.px(x + 1, 2, C.ink3);
      p.px(x + 4, 2, C.ink3);
      p.px(x + 1, 13, C.ink3);
      p.px(x + 4, 13, C.ink3);
    };
    deck(1, '#f97316', '#fde047');
    deck(9, '#1e1b4b', '#f472b6');
    deck(17, '#16a34a', C.white);
  },
  fold_desk: (p) => {
    p.rect(1, 0, 22, 8, S.w);
    p.rect(2, 1, 20, 6, S.w2);
    p.rect(3, 2, 4, 4, C.white);
    p.rect(4, 3, 2, 1, '#fca5a5');
    p.rect(9, 3, 1, 4, '#3b82f6');
    p.rect(10, 4, 1, 3, '#f97316');
    p.rect(12, 2, 8, 2, C.cork);
    p.rect(1, 8, 22, 2, S.w3);
    p.rect(1, 9, 22, 1, S.w);
    p.rect(6, 7, 10, 1, C.white);
    p.rect(17, 6, 2, 2, C.ink3);
    p.px(2, 10, C.metal2);
    for (let i = 0; i < 4; i++) p.px(2 + i, 10 + i, C.metal2);
    for (let i = 0; i < 4; i++) p.px(21 - i, 10 + i, C.metal2);
  },
  // ------------------------------------------------------- textiles, fun
  bunting: (p) => {
    for (let x = 0; x < 32; x++) p.px(x, 1 + Math.round(Math.sin((x / 32) * Math.PI) * 1.5), C.ink3);
    const flags = ['#ef4444', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#f472b6', '#f97316'];
    for (let i = 0; i < 7; i++) {
      const x = 1 + i * 4 + (i > 3 ? 1 : 0);
      const y = 2 + Math.round(Math.sin(((x + 1.5) / 32) * Math.PI) * 1.5);
      for (let r = 0; r < 4; r++) p.rect(x + Math.floor(r / 2), y + r, 3 - Math.floor(r / 2) * 2 + (r < 2 ? 0 : 1), 1, flags[i]);
    }
  },
  tie_dye: (p) => {
    p.rect(0, 0, 24, 1, C.wood2);
    const ring = ['#f472b6', '#fbbf24', '#22c55e', '#38bdf8', '#a855f7', '#f97316'];
    for (let y = 1; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const d = Math.sqrt((x - 11.5) ** 2 + (y - 12) ** 2) + Math.sin(Math.atan2(y - 12, x - 11.5) * 3) * 1.8;
        p.px(x, y, ring[Math.floor(d / 2.2) % ring.length]);
      }
    }
  },
  bead_curtain: (p) => {
    p.rect(0, 0, 8, 2, C.wood2);
    const beads = ['#f472b6', '#fbbf24', '#38bdf8', '#a855f7'];
    for (let x = 0; x < 8; x += 2) for (let y = 2; y < 31; y += 2) p.px(x + ((y >> 1) % 2), y, beads[(x + y) % beads.length]);
  },
  medal_hanger: (p) => {
    p.rect(1, 0, 22, 2, S.m);
    p.rect(1, 0, 22, 1, S.m3);
    for (const [x, c, r] of [
      [4, '#ef4444', '#fbbf24'],
      [10, '#3b82f6', '#cbd5e1'],
      [16, '#22c55e', '#b45309'],
    ] as const) {
      p.rect(x, 2, 2, 3, c);
      disc(p, x + 1, 6, 1.6, r);
    }
  },
  license_plates: (p) => {
    for (const [x, c, t] of [
      [0, '#fef3c7', 'NY'],
      [8, '#e0f2fe', 'CA'],
      [16, C.white, 'TX'],
    ] as const) {
      p.rect(x, 0, 8, 8, C.ink3);
      p.rect(x, 1, 8, 6, c);
      text(p, x + 1, 1, t, '#1e3a6e');
      p.rect(x, 7, 8, 1, C.metal2);
    }
  },
  plush_head: (p) => {
    p.rect(4, 13, 8, 3, C.walnut);
    p.rect(3, 12, 10, 2, C.walnut3);
    p.rect(5, 5, 6, 8, S.b);
    p.rect(6, 4, 4, 1, S.b);
    p.rect(6, 10, 4, 3, S.b3);
    p.px(6, 7, C.ink);
    p.px(9, 7, C.ink);
    p.rect(7, 10, 2, 1, C.ink2);
    p.rect(3, 5, 2, 2, S.b);
    p.rect(11, 5, 2, 2, S.b);
    for (const x of [4, 11]) {
      p.rect(x, 0, 1, 4, C.cork);
      p.px(x + (x < 8 ? -1 : 1), 1, C.cork);
    }
    p.rect(6, 4, 4, 1, S.b2);
  },
  postcard_rack: (p) => {
    const cards: [number, number, string, string][] = [
      [0, 1, '#7dd3fc', '#fde68a'],
      [8, 0, '#fca5a5', C.white],
      [1, 9, '#86efac', '#16a34a'],
      [9, 8, '#c4b5fd', '#fde047'],
    ];
    for (const [x, y, c, c2] of cards) {
      p.rect(x, y, 7, 6, C.white);
      p.rect(x + 1, y + 1, 5, 4, c);
      p.rect(x + 1, y + 3, 5, 2, c2);
      p.px(x + 3, y, '#ef4444');
    }
  },
  ticket_stubs: (p) => {
    for (const [x, y, c] of [
      [0, 1, '#fde68a'],
      [5, 3, '#fca5a5'],
      [10, 1, '#a7f3d0'],
    ] as const) {
      p.rect(x, y, 5, 3, c);
      p.px(x + 3, y, C.wallBase);
      p.px(x + 3, y + 2, C.wallBase);
      p.rect(x + 1, y + 1, 2, 1, C.ink3);
    }
    p.rect(2, 5, 3, 2, '#bae6fd');
    p.rect(12, 5, 3, 2, C.white);
  },
  glow_stars: (p, { night }) => {
    const c = night ? '#bef264' : '#ecfccb';
    const stars: [number, number][] = [
      [2, 2], [8, 1], [14, 3], [20, 2], [5, 7], [11, 6], [18, 8], [3, 12], [9, 11], [15, 13], [21, 12],
    ];
    for (const [x, y] of stars) {
      p.px(x, y, c);
      p.px(x - 1, y, c);
      p.px(x + 1, y, c);
      p.px(x, y - 1, c);
      p.px(x, y + 1, c);
    }
    disc(p, 12, 9, 1.5, c);
  },
  cat_decals: (p) => {
    p.rect(3, 9, 8, 4, S.b);
    p.rect(2, 6, 4, 4, S.b);
    p.px(2, 5, S.b);
    p.px(5, 5, S.b);
    for (let i = 0; i < 5; i++) p.px(11 + Math.floor(i / 2), 12 - i, S.b);
    p.rect(4, 13, 1, 2, S.b);
    p.rect(9, 13, 1, 2, S.b);
    for (const [x, y] of [
      [12, 2],
      [14, 4],
      [10, 4],
    ] as const)
      p.px(x, y, S.b);
  },
  growth_chart: (p) => {
    p.rect(1, 0, 6, 32, S.w);
    p.rect(1, 0, 1, 32, S.w3);
    for (let y = 2; y < 32; y += 2) p.rect(5, y, 2, 1, S.w2);
    for (let y = 4; y < 32; y += 6) p.rect(3, y, 4, 1, C.ink3);
    p.rect(1, 9, 6, 1, '#ef4444');
    p.rect(1, 15, 6, 1, '#3b82f6');
    p.rect(1, 21, 6, 1, '#22c55e');
  },
  paper_fan: (p) => {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 7.5);
        if (d > 7.5 || d < 1.5) continue;
        const a = Math.atan2(7.5 - (y + 0.5), x + 0.5 - 8);
        p.px(x, y, Math.floor((a / Math.PI) * 9) % 2 ? S.a : S.a3);
      }
    }
    p.rect(7, 6, 2, 2, C.walnut);
  },
  wreath: (p) => {
    for (let a = 0; a < 48; a++) {
      const t = (a / 48) * Math.PI * 2;
      const x = Math.round(8 + Math.cos(t) * 5.5);
      const y = Math.round(8 + Math.sin(t) * 5.5);
      p.rect(x - 1, y - 1, 2, 2, a % 3 ? '#a3a35a' : '#7a7a3a');
    }
    for (const [x, y, c] of [
      [4, 4, '#f9a8d4'],
      [12, 5, '#fde68a'],
      [13, 11, '#f9a8d4'],
      [3, 11, '#fde68a'],
      [8, 13, '#fca5a5'],
    ] as const)
      p.rect(x, y, 2, 2, c);
    p.rect(7, 0, 2, 2, C.cork2);
  },
  macrame_shelf: (p) => {
    p.rect(2, 0, 12, 1, C.wood2);
    for (let i = 0; i < 9; i++) {
      p.px(3 + Math.floor(i / 3), 1 + i, '#efe6d2');
      p.px(12 - Math.floor(i / 3), 1 + i, '#efe6d2');
    }
    p.rect(6, 4, 4, 1, '#efe6d2');
    p.rect(2, 10, 12, 2, C.oak);
    p.rect(2, 10, 12, 1, C.oak2);
    p.rect(4, 6, 4, 4, C.pot);
    p.rect(3, 3, 6, 3, C.leaf2);
    p.rect(4, 2, 2, 1, C.leaf);
    p.rect(10, 8, 3, 2, C.white);
    for (let i = 0; i < 6; i++) p.px(3 + Math.floor(i / 3), 12 + i, '#efe6d2');
    for (let i = 0; i < 6; i++) p.px(12 - Math.floor(i / 3), 12 + i, '#efe6d2');
    p.rect(4, 18, 8, 1, '#efe6d2');
    for (let x = 4; x < 12; x += 2) p.rect(x, 19, 1, 3 + (x % 3), '#efe6d2');
  },
  photo_strip: (p) => {
    p.rect(1, 0, 6, 24, C.white);
    const tints = ['#fca5a5', '#fde68a', '#a7f3d0', '#bfdbfe'];
    for (let i = 0; i < 4; i++) {
      const y = 1 + i * 5;
      p.rect(2, y, 4, 4, tints[i]);
      disc(p, 3, y + 2, 0.9, C.ink3);
      disc(p, 5, y + 2, 0.9, C.ink3);
    }
    p.rect(2, 21, 4, 1, C.ink3);
    p.px(4, 0, '#ef4444');
  },
};
