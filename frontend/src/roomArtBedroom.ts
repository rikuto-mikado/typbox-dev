// MY ROOM art pack: BEDROOM: where the day ends. Beds of every kind, what
// gets worn and taken off (rails, hooks, slippers, the laundry), and the
// small machines that keep a bedroom liveable. Recolourable parts use the S
// slots (roomPaint.ts) so catalog variants can swap them.
import { box, C, disc, S, type Art } from './roomPaint';

const QUILT = ['#c2483b', '#d4a017', '#8fa98b', '#3d5a80', '#efe6d2', '#c46a4a'];

export const BEDROOM_ART: Record<string, Art> = {
  // ---------------------------------------------------------------- beds
  bed_single: (p) => {
    p.rect(0, 2, 3, 14, S.w2);
    p.rect(0, 2, 3, 1, S.w3);
    p.rect(1, 4, 1, 8, S.w);
    p.rect(3, 8, 26, 3, C.white);
    p.rect(3, 10, 26, 1, C.paper2);
    p.rect(4, 5, 7, 3, C.white);
    p.rect(4, 7, 7, 1, C.paper2);
    p.rect(10, 7, 19, 5, S.b);
    p.rect(10, 7, 19, 1, S.b3);
    p.rect(10, 11, 19, 1, S.b2);
    p.rect(10, 7, 3, 4, C.white);
    p.rect(10, 10, 3, 1, C.paper2);
    p.rect(29, 6, 3, 10, S.w2);
    p.rect(29, 6, 3, 1, S.w3);
    p.rect(3, 12, 26, 2, S.w);
    p.rect(3, 12, 26, 1, S.w3);
    p.rect(4, 14, 2, 2, S.w2);
    p.rect(26, 14, 2, 2, S.w2);
  },
  bed_iron: (p) => {
    p.rect(3, 9, 26, 3, C.white);
    p.rect(3, 11, 26, 1, C.paper2);
    p.rect(4, 6, 7, 3, C.white);
    p.rect(4, 8, 7, 1, C.paper2);
    p.rect(11, 8, 18, 5, S.a);
    p.rect(11, 8, 18, 1, S.a3);
    p.rect(11, 12, 18, 1, S.a2);
    for (let x = 13; x < 29; x += 4) p.rect(x, 9, 1, 3, S.a2);
    // head and foot, tubular
    p.rect(0, 1, 2, 15, S.m);
    p.rect(0, 1, 2, 1, S.m3);
    p.rect(2, 2, 2, 1, S.m);
    p.rect(2, 7, 2, 1, S.m);
    p.rect(2, 3, 1, 4, S.m2);
    p.rect(30, 5, 2, 11, S.m);
    p.rect(30, 5, 2, 1, S.m3);
    p.rect(26, 6, 4, 1, S.m);
    p.rect(27, 7, 1, 1, S.m2);
    p.rect(2, 13, 28, 1, S.m2);
    p.px(2, 15, S.m2);
    p.px(29, 15, S.m2);
  },
  bed_patchwork: (p) => {
    // tall carved headboard
    p.rect(0, 0, 4, 16, S.w2);
    p.rect(0, 0, 4, 1, S.w3);
    p.rect(1, 2, 2, 5, S.w);
    p.px(1, 2, S.w3);
    p.rect(4, 8, 25, 3, C.white);
    p.rect(5, 5, 7, 3, C.white);
    p.rect(5, 7, 7, 1, C.paper2);
    p.rect(6, 4, 5, 1, C.paper);
    // the quilt: squares in six cloths
    for (let i = 0; i < 6; i++) {
      for (let r = 0; r < 2; r++) p.rect(12 + i * 3, 7 + r * 3, 3, 3, QUILT[(i + r * 3) % QUILT.length]);
    }
    p.rect(12, 13, 18, 1, C.paper2);
    for (let x = 13; x < 30; x += 3) p.px(x, 13, QUILT[x % 6]);
    p.rect(29, 5, 3, 11, S.w2);
    p.rect(29, 5, 3, 1, S.w3);
    p.rect(4, 13, 25, 1, S.w);
    p.rect(4, 14, 25, 1, S.w2);
    p.rect(5, 15, 2, 1, S.w2);
    p.rect(26, 15, 2, 1, S.w2);
  },
  bed_tatami: (p) => {
    p.rect(0, 12, 32, 3, C.walnut);
    p.rect(0, 12, 32, 1, C.walnut3);
    p.rect(1, 15, 30, 1, C.walnut2);
    p.rect(1, 10, 30, 2, C.tatami);
    p.rect(1, 11, 30, 1, C.tatami2);
    p.rect(2, 8, 28, 2, C.white);
    p.rect(3, 6, 6, 2, C.cork);
    p.rect(3, 7, 6, 1, C.cork2);
    p.rect(9, 6, 21, 4, S.a);
    p.rect(9, 6, 21, 1, S.a3);
    p.rect(9, 9, 21, 1, S.a2);
    for (let x = 12; x < 30; x += 5) p.rect(x, 7, 2, 1, S.a3);
  },
  futon_folded: (p) => {
    for (let i = 0; i < 3; i++) {
      const y = 15 - (i + 1) * 3;
      p.rect(1, y, 14, 3, i === 1 ? C.white : S.a);
      p.rect(1, y, 14, 1, i === 1 ? '#ffffff' : S.a3);
      p.rect(14, y, 1, 3, i === 1 ? C.paper2 : S.a2);
    }
    p.rect(1, 15, 14, 1, S.a2);
    p.rect(3, 4, 9, 2, S.a);
    p.rect(3, 4, 9, 1, S.a3);
    p.rect(4, 2, 7, 2, C.white);
    p.rect(4, 3, 7, 1, C.paper2);
  },
  bed_bench: (p) => {
    p.rect(0, 1, 24, 3, S.a);
    p.rect(0, 1, 24, 1, S.a3);
    for (let x = 3; x < 24; x += 5) p.px(x, 2, S.a2);
    p.rect(0, 4, 24, 1, S.w);
    p.rect(1, 5, 2, 3, S.w2);
    p.rect(21, 5, 2, 3, S.w2);
    p.rect(3, 5, 18, 1, S.w2);
  },
  blanket_ladder: (p) => {
    p.rect(1, 0, 1, 24, S.w2);
    p.rect(6, 0, 1, 24, S.w2);
    for (const y of [3, 10, 17]) p.rect(1, y, 6, 1, S.w);
    // a knit throw and a check blanket hung over the rungs
    p.rect(0, 3, 8, 6, C.paper);
    for (let y = 5; y < 9; y += 2) p.rect(0, y, 8, 1, C.paper2);
    p.rect(1, 10, 6, 5, C.red);
    p.rect(1, 12, 6, 1, C.red2);
    p.rect(3, 10, 1, 5, C.red2);
    p.rect(0, 23, 2, 1, S.w2);
    p.rect(6, 23, 2, 1, S.w2);
  },
  clothes_rail: (p) => {
    p.rect(1, 1, 14, 1, S.m);
    p.rect(1, 1, 1, 21, S.m2);
    p.rect(14, 1, 1, 21, S.m2);
    p.rect(0, 22, 4, 2, S.m);
    p.rect(12, 22, 4, 2, S.m);
    p.rect(2, 19, 12, 1, S.m2);
    // hanging clothes
    const hung = [
      [2, '#3d5a80', 13],
      [5, '#efe6d2', 9],
      [8, '#c2483b', 11],
      [11, '#3f3f46', 14],
    ] as const;
    for (const [x, c, len] of hung) {
      p.px(x + 1, 2, C.metal);
      p.rect(x, 3, 3, 1, C.metal2);
      p.rect(x, 4, 3, len, c);
    }
    // shoes and a box below
    p.rect(3, 17, 3, 2, C.paper);
    p.rect(3, 18, 3, 1, C.ink3);
    p.rect(9, 16, 4, 3, C.cork);
    p.rect(9, 16, 4, 1, C.cork2);
  },
  laundry_basket: (p) => {
    p.rect(1, 1, 3, 2, '#3d5a80');
    p.rect(4, 0, 2, 3, C.white);
    p.rect(5, 2, 2, 1, '#c2483b');
    p.rect(0, 3, 8, 5, S.w);
    p.rect(0, 3, 8, 1, S.w3);
    for (let y = 4; y < 8; y += 2) for (let x = (y / 2) % 2; x < 8; x += 2) p.px(x, y, S.w2);
    p.rect(2, 4, 4, 1, S.w2);
  },
  hamper: (p) => {
    p.rect(0, 2, 8, 2, S.a2);
    p.rect(1, 1, 6, 1, S.a);
    p.rect(3, 0, 2, 1, S.a2);
    p.rect(1, 4, 6, 12, S.a);
    p.rect(1, 4, 1, 12, S.a3);
    p.rect(6, 4, 1, 12, S.a2);
    p.rect(1, 9, 6, 1, C.white);
    p.rect(2, 6, 4, 1, S.a2);
    p.rect(1, 15, 6, 1, S.a2);
  },
  cheval_mirror: (p) => {
    p.rect(1, 0, 6, 18, S.w2);
    p.rect(2, 1, 4, 16, '#cfe8f3');
    p.rect(2, 1, 4, 1, '#eaf6fb');
    p.rect(3, 3, 1, 6, '#ffffff');
    p.px(4, 4, '#ffffff');
    p.rect(2, 12, 4, 5, '#b8dcea');
    p.rect(0, 8, 1, 2, S.w);
    p.rect(7, 8, 1, 2, S.w);
    p.rect(0, 9, 1, 13, S.w2);
    p.rect(7, 9, 1, 13, S.w2);
    p.rect(0, 22, 3, 2, S.w);
    p.rect(5, 22, 3, 2, S.w);
  },
  vanity_stool: (p) => {
    p.rect(0, 2, 8, 3, S.a);
    p.rect(1, 1, 6, 1, S.a3);
    p.rect(0, 4, 8, 1, S.a2);
    p.rect(1, 5, 1, 3, C.amber2);
    p.rect(6, 5, 1, 3, C.amber2);
    p.rect(1, 6, 6, 1, C.amber2);
  },
  chest_tall: (p) => {
    p.rect(0, 0, 16, 2, S.w3);
    p.rect(1, 2, 14, 20, S.w);
    for (let i = 0; i < 4; i++) {
      const y = 3 + i * 5;
      box(p, 2, y, 12, 4, S.w, S.w2);
      p.rect(7, y + 1, 2, 1, C.amber2);
    }
    p.rect(1, 22, 2, 2, S.w2);
    p.rect(13, 22, 2, 2, S.w2);
  },
  storage_bins: (p) => {
    for (const x of [0, 8]) {
      p.rect(x, 1, 8, 1, S.a2);
      p.rect(x + 1, 2, 6, 6, S.a);
      p.rect(x + 1, 2, 6, 1, S.a3);
      p.rect(x + 2, 4, 4, 2, C.white);
      p.rect(x + 3, 5, 2, 1, C.metal);
    }
  },
  alarm_clock: (p) => {
    p.rect(1, 0, 2, 2, S.m3);
    p.rect(5, 0, 2, 2, S.m3);
    p.rect(3, 0, 2, 1, S.m2);
    disc(p, 4, 4.5, 3, S.m);
    disc(p, 4, 4.5, 2.1, C.white);
    p.rect(4, 3, 1, 2, C.ink);
    p.rect(4, 4, 2, 1, C.ink);
    p.px(1, 7, S.m2);
    p.px(6, 7, S.m2);
  },
  slippers: (p) => {
    for (const [x, y] of [
      [0, 5],
      [3, 6],
    ]) {
      p.rect(x, y, 5, 2, S.b);
      p.rect(x + 2, y - 1, 3, 1, S.b3);
      p.rect(x, y + 1, 5, 1, S.b2);
      p.px(x, y, C.white);
    }
  },
  robe_hook: (p) => {
    p.rect(3, 0, 2, 1, C.metal2);
    p.px(4, 1, C.metal2);
    p.rect(2, 2, 4, 2, S.b2);
    p.rect(1, 3, 6, 12, S.b);
    p.rect(1, 3, 1, 12, S.b3);
    p.rect(3, 3, 2, 6, S.b2);
    p.rect(0, 8, 8, 1, S.b2);
    p.rect(2, 9, 1, 3, S.b2);
    p.rect(1, 15, 6, 1, S.b2);
  },
  coat_stand: (p) => {
    p.rect(3, 1, 2, 22, S.w2);
    p.rect(1, 2, 6, 1, S.w);
    p.rect(0, 23, 8, 1, S.w2);
    p.rect(1, 22, 6, 1, S.w);
    // coat, scarf, cap
    p.rect(0, 3, 4, 11, '#3d5a80');
    p.rect(0, 3, 1, 11, '#5b7aa3');
    p.rect(1, 5, 1, 1, '#2b4362');
    p.rect(5, 3, 2, 8, C.red);
    p.rect(5, 9, 2, 1, C.red2);
    p.rect(4, 0, 4, 2, C.ink3);
    p.rect(7, 1, 1, 1, C.ink2);
  },
  sneakers: (p) => {
    for (const [x, y] of [
      [0, 4],
      [3, 5],
    ]) {
      p.rect(x + 1, y, 3, 2, S.b);
      p.rect(x, y + 1, 5, 1, S.b);
      p.rect(x, y + 2, 5, 1, C.white);
      p.px(x + 2, y, C.ink3);
      p.px(x + 3, y + 1, S.b2);
    }
  },
  umbrella_stand: (p) => {
    p.rect(2, 0, 1, 7, C.ink2);
    p.rect(1, 0, 1, 1, C.ink2);
    p.rect(5, 2, 1, 5, C.wood);
    p.rect(5, 1, 2, 1, C.wood);
    p.rect(3, 3, 2, 5, C.red);
    p.rect(1, 6, 6, 1, S.m3);
    p.rect(1, 7, 6, 9, S.m);
    p.rect(1, 7, 1, 9, S.m3);
    p.rect(6, 7, 1, 9, S.m2);
    p.rect(1, 11, 6, 1, S.m2);
  },
  tote_bag: (p) => {
    p.rect(2, 0, 1, 3, S.b2);
    p.rect(5, 0, 1, 3, S.b2);
    p.rect(2, 0, 4, 1, S.b2);
    p.rect(0, 3, 8, 5, S.b);
    p.rect(0, 3, 8, 1, S.b3);
    p.rect(2, 5, 4, 2, C.ink3);
    p.px(3, 5, C.amber);
    p.rect(6, 1, 2, 2, C.leaf);
  },
  school_bag: (p) => {
    p.rect(1, 0, 6, 2, S.a2);
    p.rect(1, 1, 6, 7, S.a);
    p.rect(1, 1, 6, 1, S.a3);
    p.rect(1, 4, 6, 1, S.a2);
    p.rect(3, 4, 2, 2, C.metal);
    p.rect(2, 6, 4, 2, S.a2);
    p.px(7, 3, C.amber);
  },
  // ---------------------------------------------------------- machines
  humidifier: (p, { on }) => {
    if (on) {
      p.rect(3, 0, 2, 1, '#e0f2fe');
      p.rect(4, 1, 1, 1, '#bae6fd');
      p.px(2, 1, '#e0f2fe');
    }
    p.rect(3, 2, 2, 1, S.a2);
    p.rect(1, 3, 6, 5, S.a);
    p.rect(1, 3, 1, 5, S.a3);
    p.rect(2, 4, 4, 2, '#bae6fd');
    p.rect(2, 5, 4, 1, '#7dd3fc');
    p.px(4, 7, '#7dd3fc');
  },
  oil_heater: (p, { on }) => {
    p.rect(1, 1, 6, 1, S.m2);
    for (let x = 1; x < 7; x += 2) {
      p.rect(x, 2, 2, 11, S.m);
      p.rect(x, 2, 1, 11, S.m3);
    }
    p.rect(0, 4, 1, 3, S.m2);
    p.px(6, 3, on ? '#fb923c' : C.ink3);
    p.rect(1, 13, 6, 1, S.m2);
    p.rect(0, 14, 2, 2, C.ink3);
    p.rect(6, 14, 2, 2, C.ink3);
  },
  desk_fan: (p) => {
    disc(p, 4, 3, 3, S.m);
    disc(p, 4, 3, 2.2, C.ink3);
    p.rect(3, 1, 2, 4, S.m3);
    p.rect(2, 2, 4, 2, S.m3);
    p.px(4, 3, S.m2);
    p.rect(3, 6, 2, 1, S.m2);
    p.rect(1, 7, 6, 1, S.m);
  },
  air_purifier: (p, { on }) => {
    p.rect(1, 1, 6, 15, S.m);
    p.rect(1, 1, 6, 1, S.m3);
    p.rect(2, 2, 4, 1, on ? '#7dd3fc' : '#38bdf8');
    for (let y = 5; y < 14; y += 2) p.rect(2, y, 4, 1, S.m2);
    p.rect(6, 1, 1, 15, S.m2);
  },
  ironing_board: (p) => {
    p.rect(1, 6, 14, 1, S.a);
    p.rect(0, 7, 15, 1, S.a);
    p.rect(14, 6, 2, 1, S.a);
    for (let x = 2; x < 15; x += 4) p.px(x, 7, S.a3);
    p.rect(0, 8, 15, 1, C.metal2);
    for (let i = 0; i < 7; i++) {
      p.px(4 + i, 9 + i, C.metal);
      p.px(10 - i, 9 + i, C.metal);
    }
    // the iron
    p.rect(3, 4, 5, 2, C.white);
    p.rect(2, 5, 1, 1, C.white);
    p.rect(4, 3, 3, 1, C.sky2);
  },
  stick_vacuum: (p) => {
    p.rect(3, 0, 3, 2, C.ink3);
    p.rect(4, 2, 1, 11, C.metal);
    p.rect(2, 3, 4, 4, S.m);
    p.rect(2, 3, 1, 4, S.m3);
    p.rect(3, 4, 2, 2, S.m3);
    p.rect(2, 13, 5, 2, C.ink3);
    p.rect(2, 15, 6, 1, C.ink2);
    p.px(7, 14, S.m);
  },
  hug_pillow: (p) => {
    p.rect(1, 3, 14, 4, S.a);
    p.rect(0, 4, 16, 3, S.a);
    p.rect(1, 3, 14, 1, S.a3);
    p.rect(0, 6, 16, 1, S.a2);
    p.px(5, 4, C.ink);
    p.px(9, 4, C.ink);
    p.rect(6, 5, 3, 1, C.pink);
  },
  blanket_pile: (p) => {
    p.rect(1, 5, 14, 3, S.a);
    p.rect(1, 5, 14, 1, S.a3);
    p.rect(14, 5, 1, 3, S.a2);
    p.rect(2, 2, 12, 3, S.b);
    p.rect(2, 2, 12, 1, S.b3);
    for (let x = 3; x < 14; x += 3) p.px(x, 3, S.b2);
    p.rect(3, 0, 9, 2, C.paper);
    p.rect(3, 1, 9, 1, C.paper2);
  },
  bed_tray: (p) => {
    p.rect(3, 1, 3, 3, C.white);
    p.rect(6, 2, 1, 1, C.white);
    p.rect(4, 1, 1, 1, C.wood4);
    p.rect(8, 2, 5, 2, C.cork);
    p.rect(8, 2, 5, 1, '#e8c088');
    p.rect(0, 4, 16, 1, S.w3);
    p.rect(0, 5, 16, 1, S.w);
    p.rect(1, 6, 1, 2, S.w2);
    p.rect(14, 6, 1, 2, S.w2);
  },
  // ---------------------------------------------------------- lights
  nightlight: (p, { on }) => {
    p.rect(2, 1, 4, 1, on ? S.a3 : S.a);
    p.rect(1, 2, 6, 3, on ? S.a3 : S.a);
    p.rect(1, 4, 6, 1, S.a2);
    if (on) p.rect(2, 2, 3, 1, '#ffffff');
    p.rect(3, 5, 2, 2, C.paper);
    p.rect(1, 7, 6, 1, C.paper2);
  },
  bedside_lamp: (p, { on }) => {
    p.rect(1, 0, 6, 1, S.b3);
    p.rect(0, 1, 8, 4, on ? C.glow : S.b);
    p.rect(0, 4, 8, 1, on ? C.amber : S.b2);
    if (on) p.rect(1, 1, 6, 1, '#fffbeb');
    p.rect(3, 5, 2, 3, C.paper2);
    p.rect(2, 8, 4, 1, C.paper);
    // the little round side table it stands on
    p.rect(0, 9, 8, 1, C.oak);
    p.rect(1, 10, 6, 1, C.oak2);
    p.rect(3, 11, 2, 4, C.oak3);
    p.rect(1, 15, 6, 1, C.oak2);
  },
  // ---------------------------------------------------------- small things
  pillow_stack: (p) => {
    p.rect(0, 5, 8, 3, S.a);
    p.rect(0, 5, 8, 1, S.a3);
    p.rect(0, 7, 8, 1, S.a2);
    p.rect(1, 2, 6, 3, C.white);
    p.rect(1, 4, 6, 1, C.paper2);
    p.px(0, 3, C.white);
    p.px(7, 3, C.white);
  },
  night_clutter: (p) => {
    // tissues, glasses, a phone charging
    p.rect(0, 4, 4, 4, C.sky);
    p.rect(0, 4, 4, 1, '#bae6fd');
    p.rect(1, 2, 2, 2, C.white);
    p.rect(5, 6, 3, 2, C.ink2);
    p.px(7, 6, C.leaf3);
    p.rect(4, 5, 4, 1, C.ink);
    p.px(5, 4, C.ink);
    p.px(7, 4, C.ink);
  },
  shag_rug: (p) => {
    p.rect(1, 5, 22, 2, S.a);
    p.rect(0, 6, 24, 2, S.a);
    for (let x = 0; x < 24; x += 2) p.px(x, 4 + (x % 4 === 0 ? 1 : 0), S.a3);
    for (let x = 1; x < 24; x += 3) p.px(x, 6, S.a3);
    for (let x = 2; x < 24; x += 3) p.px(x, 7, S.a2);
  },
  hat_hooks: (p) => {
    p.rect(0, 1, 16, 1, C.wood);
    p.rect(0, 2, 16, 1, C.wood2);
    for (const x of [3, 8, 13]) p.px(x, 3, C.metal2);
    // a cap, a beanie, a bucket hat
    p.rect(1, 3, 4, 3, S.b);
    p.rect(1, 3, 4, 1, S.b3);
    p.rect(0, 5, 2, 1, S.b2);
    p.rect(6, 3, 4, 4, '#3f3f46');
    p.rect(6, 6, 4, 1, '#5a5a63');
    p.px(8, 2, C.white);
    p.rect(12, 3, 3, 2, C.paper);
    p.rect(11, 5, 5, 1, C.paper2);
  },
  mirror_round: (p) => {
    disc(p, 8, 8, 7.5, S.m);
    disc(p, 8, 8, 6.2, '#cfe8f3');
    p.rect(4, 5, 1, 4, '#ffffff');
    p.rect(5, 4, 1, 2, '#ffffff');
    p.rect(3, 11, 10, 2, '#b8dcea');
    p.px(8, 0, S.m3);
  },
  jewelry_box: (p) => {
    p.rect(1, 1, 6, 3, S.w2);
    p.rect(2, 2, 4, 2, C.red2);
    p.rect(0, 4, 8, 4, S.w);
    p.rect(0, 4, 8, 1, S.w3);
    p.rect(3, 5, 2, 1, C.amber);
    p.px(2, 3, C.amber);
    p.px(4, 2, C.white);
    p.px(5, 3, C.amber);
  },
  suitcase_open: (p) => {
    p.rect(0, 0, 16, 3, S.a2);
    p.rect(1, 1, 14, 2, C.ink3);
    p.rect(0, 3, 16, 5, S.a);
    p.rect(0, 3, 16, 1, S.a3);
    p.rect(1, 3, 5, 2, '#3d5a80');
    p.rect(6, 3, 4, 2, C.white);
    p.rect(10, 3, 5, 2, '#c2483b');
    p.rect(2, 4, 3, 1, '#2b4362');
    p.rect(0, 7, 16, 1, S.a2);
  },
};
