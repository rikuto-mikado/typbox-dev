// MY ROOM art pack: wall decor — posters, prints, clocks, shelves and
// mirrors. Frames use slot w and accents slot a/b (roomPaint.ts) so
// catalog variants can swap them.
import { box, C, disc, S, text, textWidth, type Art, type Painter } from './roomPaint';

/** A framed print: frame in slot w, the picture drawn inside by `inner`. */
const framed = (p: Painter, w: number, h: number, bg: string, inner: (x: number, y: number, iw: number, ih: number) => void) => {
  p.rect(0, 0, w, h, S.w2);
  p.rect(1, 1, w - 2, h - 2, bg);
  inner(1, 1, w - 2, h - 2);
};

export const WALL_ART: Record<string, Art> = {
  poster_planet: (p) =>
    framed(p, 16, 16, C.night, () => {
      for (const [x, y] of [[3, 3], [12, 2], [2, 11], [13, 12], [8, 13]] as const) p.px(x, y, C.star);
      disc(p, 8, 8, 4, S.b);
      p.rect(4, 7, 8, 1, S.b2);
      p.rect(5, 9, 6, 1, S.b3);
      p.rect(2, 8, 12, 1, C.paper2);
      p.px(1, 8, C.paper2);
      p.px(14, 8, C.paper2);
    }),
  poster_wave: (p) =>
    framed(p, 16, 16, '#e0f2fe', () => {
      disc(p, 11, 5, 2.5, C.amber);
      p.rect(1, 9, 14, 6, S.a);
      for (let x = 1; x < 15; x++) p.px(x, 9 + Math.round(Math.sin(x * 0.9) * 1.2), S.a3);
      p.rect(1, 13, 14, 2, S.a2);
    }),
  poster_abstract: (p) =>
    framed(p, 16, 24, C.paper, () => {
      disc(p, 6, 7, 4, S.b);
      p.rect(8, 10, 6, 8, S.a);
      p.rect(2, 16, 7, 2, C.ink2);
      disc(p, 11, 5, 1.5, C.amber);
    }),
  poster_code: (p) =>
    framed(p, 16, 24, C.term, () => {
      const lines: Array<[number, number, string]> = [
        [2, 3, C.pink], [4, 6, C.sky], [4, 4, C.leaf3], [6, 7, C.amber], [6, 5, C.white], [4, 3, C.leaf3], [2, 2, C.pink], [2, 9, C.paper2],
      ];
      lines.forEach(([x, w], i) => p.rect(x, 3 + i * 2, w, 1, lines[i][2]));
      p.rect(2, 20, 2, 1, C.leaf3);
    }),
  poster_cat: (p) =>
    framed(p, 16, 16, S.a3, () => {
      p.rect(4, 6, 8, 7, C.ink2);
      p.rect(4, 4, 2, 2, C.ink2);
      p.rect(10, 4, 2, 2, C.ink2);
      p.px(6, 8, C.amber);
      p.px(9, 8, C.amber);
      p.px(7, 10, C.pink);
      p.rect(12, 11, 2, 1, C.ink2);
      p.rect(13, 9, 1, 2, C.ink2);
    }),
  moon_phases: (p) => {
    p.rect(0, 3, 24, 1, S.w2);
    const phases = [0, 0.4, 1, 0.4, 0];
    phases.forEach((f, i) => {
      const cx = 2.5 + i * 4.75;
      disc(p, cx, 4, 2, C.paper);
      if (f < 1) disc(p, cx + (i < 2 ? -1 : 1) * (1 + (1 - f) * 1.6), 4, 2, C.ink2);
    });
  },
  poster_sunset: (p) =>
    framed(p, 16, 24, '#fde68a', () => {
      p.rect(1, 1, 14, 6, '#fb923c');
      p.rect(1, 7, 14, 4, '#fdba74');
      disc(p, 8, 11, 3.5, '#fef3c7');
      p.rect(1, 12, 14, 11, S.a2);
      for (let x = 1; x < 15; x++) p.px(x, 12 - Math.round(Math.abs(Math.sin(x * 0.6)) * 3), S.a2);
      p.rect(1, 18, 14, 5, S.a);
    }),
  poster_gig: (p) =>
    framed(p, 16, 24, S.b, () => {
      text(p, 2, 2, 'LIVE', C.white);
      disc(p, 8, 13, 4, C.ink);
      disc(p, 8, 13, 1.2, C.amber);
      p.rect(2, 19, 12, 1, C.white);
      p.rect(4, 21, 8, 1, C.paper2);
    }),
  poster_pixel_heart: (p) =>
    framed(p, 16, 16, C.white, () => {
      const rows = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
      rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && p.rect(2 + x * 2 - 1, 3 + y * 2 - 1, 2, 2, S.b)));
      p.px(3, 3, C.white);
    }),
  botanical_print: (p) =>
    framed(p, 16, 24, '#f5f0e1', () => {
      p.rect(7, 4, 1, 17, C.leaf2);
      for (let i = 0; i < 5; i++) {
        const y = 6 + i * 3;
        p.rect(3, y, 4, 2, C.leaf);
        p.rect(8, y + 1, 4, 2, C.leaf);
      }
      disc(p, 7.5, 3.5, 1.6, S.b);
    }),
  city_map: (p) =>
    framed(p, 24, 16, '#f1ede4', () => {
      for (let x = 4; x < 23; x += 5) p.rect(x, 1, 1, 14, C.paper2);
      for (let y = 4; y < 15; y += 4) p.rect(1, y, 22, 1, C.paper2);
      for (let i = 0; i < 22; i++) p.px(1 + i, 9 + Math.round(Math.sin(i / 3) * 2), S.a);
      p.rect(6, 2, 3, 2, C.leaf3);
      p.rect(15, 11, 4, 3, C.leaf3);
      p.px(12, 6, C.red);
      p.px(12, 5, C.red);
    }),
  film_poster: (p) =>
    framed(p, 16, 24, C.ink, () => {
      disc(p, 8, 9, 5, S.b);
      disc(p, 8, 9, 3, C.ink2);
      p.rect(3, 16, 10, 1, C.amber);
      p.rect(4, 18, 8, 1, C.paper2);
      p.rect(5, 20, 6, 1, C.paper2);
    }),
  game_poster: (p) =>
    framed(p, 16, 24, '#1e1b4b', () => {
      for (const [x, y] of [[3, 3], [12, 5], [5, 9]] as const) p.px(x, y, C.white);
      p.rect(6, 7, 4, 1, C.leaf3);
      p.rect(5, 8, 6, 2, C.leaf3);
      p.px(5, 10, C.leaf3);
      p.px(10, 10, C.leaf3);
      p.px(6, 8, C.ink);
      p.px(9, 8, C.ink);
      p.rect(3, 14, 2, 1, C.white);
      p.rect(7, 14, 2, 1, C.white);
      p.rect(11, 14, 2, 1, C.white);
      text(p, 2, 17, 'GO', S.b);
    }),
  dartboard: (p) => {
    disc(p, 8, 8, 7.5, C.ink);
    disc(p, 8, 8, 6.2, C.paper);
    for (let a = 0; a < 20; a++) {
      const t = (a / 20) * Math.PI * 2;
      if (a % 2) for (let r = 1; r < 6; r++) p.px(Math.round(7.5 + Math.cos(t) * r), Math.round(7.5 + Math.sin(t) * r), C.ink2);
    }
    disc(p, 8, 8, 4.2, S.b);
    disc(p, 8, 8, 3.2, C.paper);
    disc(p, 8, 8, 1.3, S.b);
    p.rect(11, 4, 3, 1, C.amber2);
  },
  cuckoo_clock: (p) => {
    p.rect(0, 2, 8, 1, S.w2);
    p.rect(1, 1, 6, 1, S.w2);
    p.rect(3, 0, 2, 1, S.w2);
    p.rect(1, 3, 6, 8, S.w);
    disc(p, 4, 7, 2.2, C.paper);
    p.px(4, 6, C.ink);
    p.px(5, 7, C.ink);
    p.rect(3, 3, 2, 2, C.ink2);
    p.px(3, 3, C.amber);
    p.rect(2, 11, 1, 3, C.amber2);
    p.rect(5, 11, 1, 4, C.amber2);
    p.rect(2, 14, 1, 2, C.amber);
    p.rect(5, 15, 1, 1, C.amber);
  },
  digital_clock: (p, { on }) => {
    box(p, 0, 0, 24, 8, S.m2, C.ink);
    text(p, Math.floor((24 - textWidth('12:34')) / 2), 1, '12:34', on ? '#f43f5e' : '#7a2a35');
  },
  world_clocks: (p) => {
    p.rect(0, 0, 24, 8, S.w2);
    for (let i = 0; i < 3; i++) {
      const cx = 4 + i * 8;
      disc(p, cx, 4, 3, C.paper);
      p.px(cx, 3 - (i % 2), C.ink);
      p.px(cx, 4, C.ink);
      p.px(cx + 1 - i, 4 + (i === 2 ? 1 : 0), C.ink);
    }
  },
  checkered_flag: (p) => {
    p.rect(0, 0, 1, 16, C.metal3);
    for (let y = 1; y < 12; y += 2) for (let x = 1; x < 22; x += 2) p.rect(x, y, 2, 2, ((x + y) / 2) % 2 ? C.white : C.ink);
    for (let x = 1; x < 23; x++) p.px(x, 12 + Math.round(Math.sin(x / 3)), C.ink3);
  },
  floating_plants: (p) => {
    p.rect(0, 6, 24, 1, S.w);
    p.rect(0, 7, 24, 1, S.w2);
    p.rect(2, 3, 4, 3, S.b);
    p.rect(2, 1, 4, 2, C.leaf);
    p.px(3, 0, C.leaf2);
    p.rect(10, 4, 3, 2, C.white);
    p.rect(10, 2, 1, 2, C.leaf2);
    p.rect(12, 1, 1, 3, C.leaf2);
    p.rect(17, 3, 5, 3, S.b);
    for (const x of [16, 18, 21, 23]) p.rect(x, 6, 1, 2 + (x % 3), C.leaf);
    p.rect(18, 1, 3, 2, C.leaf);
  },
  figure_shelf: (p) => {
    p.rect(0, 6, 24, 1, S.w);
    p.rect(0, 7, 24, 1, S.w2);
    // a robot, a duck and a rocket
    p.rect(2, 1, 4, 3, C.metal);
    p.px(3, 2, C.sky);
    p.px(4, 2, C.sky);
    p.rect(2, 4, 4, 2, C.metal3);
    p.rect(9, 3, 4, 3, C.amber);
    p.rect(11, 1, 2, 2, C.amber);
    p.px(13, 2, C.orange);
    p.rect(17, 1, 2, 4, C.white);
    p.px(17, 0, C.red);
    p.px(18, 0, C.red);
    p.rect(16, 4, 4, 1, C.red);
    p.rect(21, 3, 2, 3, S.a);
  },
  macrame: (p) => {
    p.rect(0, 0, 8, 1, S.w2);
    for (let y = 1; y < 12; y++) {
      for (let x = 1; x < 7; x++) if ((x + y) % 3 === 0 || (y > 4 && y < 9 && (x - y + 20) % 3 === 0)) p.px(x, y, C.paper);
    }
    for (const x of [1, 3, 4, 6]) p.rect(x, 12, 1, 4 - (x % 2), C.paper2);
  },
  dreamcatcher: (p) => {
    p.px(4, 0, C.ink3);
    disc(p, 4, 4, 3.4, S.w);
    disc(p, 4, 4, 2.4, C.paper);
    p.px(4, 4, S.b);
    p.px(3, 3, C.ink3);
    p.px(5, 5, C.ink3);
    p.px(3, 5, C.ink3);
    p.px(5, 3, C.ink3);
    for (const x of [2, 4, 6]) {
      p.rect(x, 8, 1, 4, C.paper2);
      p.rect(x, 12, 1, 3, x === 4 ? S.b : S.a);
    }
  },
  kilim: (p) => {
    p.rect(0, 0, 24, 16, S.b);
    p.rect(1, 1, 22, 14, S.b3);
    for (let i = 0; i < 3; i++) {
      const cx = 4 + i * 8;
      for (let d = 0; d < 4; d++) {
        p.rect(cx - d, 4 + d, d * 2 + 1, 1, i === 1 ? S.a : S.b2);
        p.rect(cx - d, 11 - d, d * 2 + 1, 1, i === 1 ? S.a : S.b2);
      }
    }
    for (let x = 0; x < 24; x += 2) p.px(x, 15, C.paper);
  },
  mirror_tall: (p) => {
    p.rect(0, 0, 8, 24, S.w2);
    p.rect(1, 1, 6, 22, '#cfe3ec');
    p.rect(2, 2, 1, 6, C.white);
    p.rect(4, 4, 1, 3, C.white);
    p.rect(1, 18, 6, 5, '#b9d3df');
  },
  sunburst_mirror: (p) => {
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      for (let r = 4; r < 8; r++) p.px(Math.round(7.5 + Math.cos(t) * r), Math.round(7.5 + Math.sin(t) * r), S.w);
    }
    disc(p, 8, 8, 4, S.w2);
    disc(p, 8, 8, 3.2, '#cfe3ec');
    p.px(6, 6, C.white);
  },
  gold_record: (p) => {
    box(p, 0, 0, 16, 16, C.ink, S.w2);
    disc(p, 8, 7, 5, C.amber);
    disc(p, 8, 7, 3.4, C.amber2);
    disc(p, 8, 7, 1.2, C.red);
    p.rect(4, 13, 8, 1, C.paper2);
  },
  polaroid_string: (p) => {
    for (let x = 0; x < 24; x++) p.px(x, Math.round(1 + Math.sin((x / 23) * Math.PI) * 2), C.ink3);
    const colours = [C.sky, C.amber, C.leaf3, C.pink];
    colours.forEach((c, i) => {
      const x = 1 + i * 6;
      const y = 2 + Math.round(Math.sin(((x + 2) / 23) * Math.PI) * 2);
      p.rect(x, y, 5, 6, C.white);
      p.rect(x + 1, y + 1, 3, 3, c);
      p.px(x + 2, y - 1, S.b);
    });
  },
  vision_board: (p) => {
    box(p, 0, 0, 24, 16, C.white, S.w2);
    p.rect(2, 2, 7, 5, C.sky);
    p.rect(2, 5, 7, 2, C.leaf2);
    p.rect(11, 2, 5, 6, C.pink);
    p.rect(18, 2, 4, 4, C.amber);
    text(p, 2, 9, 'GOAL', S.b);
    p.rect(18, 8, 4, 6, C.leaf3);
    p.rect(12, 10, 4, 4, C.purple);
  },
  sign_board: (p) => {
    p.rect(0, 0, 24, 8, S.a);
    p.rect(0, 0, 24, 1, S.a3);
    p.rect(0, 7, 24, 1, S.a2);
    text(p, Math.floor((24 - textWidth('HOME')) / 2), 1, 'HOME', C.white);
  },
  banner_flags: (p) => {
    for (let x = 0; x < 32; x++) p.px(x, Math.round(Math.sin((x / 31) * Math.PI) * 2), C.ink3);
    const flags = [S.a, S.b, C.amber, C.leaf3, S.a, S.b, C.amber];
    flags.forEach((c, i) => {
      const x = 1 + i * 4.3;
      const y = 1 + Math.round(Math.sin(((x + 1) / 31) * Math.PI) * 2);
      for (let d = 0; d < 4; d++) p.rect(Math.round(x) + Math.floor(d / 2), y + d, 3 - d, 1, c);
    });
  },
  barometer: (p) => {
    disc(p, 4, 4, 3.8, S.w);
    disc(p, 4, 4, 2.8, C.paper);
    p.px(4, 4, C.ink);
    p.px(5, 3, C.ink);
    p.px(6, 2, C.red);
    p.rect(3, 8, 2, 1, S.w2);
  },
};
