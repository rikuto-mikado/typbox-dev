// MY ROOM art pack: LAMPS: more light for the LIGHTS dimmer. Floor and
// table lamps, wall sconces and neon, and what hangs from the ceiling.
// Every piece here is in furniture.LIGHTS; lamps and neon are lit while the
// room's lights are on (`on`), and a lit shade is drawn in its glow colours.
import { C, disc, S, text, type Art, type Painter } from './roomPaint';

/** A neon tube along a list of points, bright when on and a dull glass tube when off. */
const neon = (p: Painter, pts: [number, number][], on: boolean, color: string, core = '#ffffff') => {
  for (const [x, y] of pts) p.px(x, y, on ? color : C.ink3);
  if (on) pts.forEach(([x, y], i) => i % 3 === 1 && p.px(x, y, core));
};

/** Points along straight segments joining the corners. */
const path = (...corners: [number, number][]) => {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < corners.length; i++) {
    const [x0, y0] = corners[i];
    const [x1, y1] = corners[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s < n; s++) out.push([Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n)]);
  }
  out.push(corners[corners.length - 1]);
  return out;
};

const WARM = '#fef3c7';

export const LAMPS_ART: Record<string, Art> = {
  // ------------------------------------------------------------- floor
  lamp_paper_floor: (p, { on }) => {
    p.rect(1, 0, 6, 11, on ? WARM : C.paper);
    for (let y = 1; y < 11; y += 2) p.rect(1, y, 6, 1, on ? '#fde68a' : C.paper2);
    p.rect(0, 1, 1, 9, on ? WARM : C.paper);
    p.rect(7, 1, 1, 9, on ? WARM : C.paper);
    p.rect(3, 11, 2, 11, C.wood2);
    p.rect(1, 22, 6, 2, C.wood);
  },
  lamp_torchiere: (p, { on }) => {
    if (on) p.rect(1, 0, 6, 1, '#fffbeb');
    p.rect(0, 1, 8, 1, S.m3);
    p.rect(1, 2, 6, 1, S.m);
    p.rect(2, 3, 4, 1, S.m2);
    p.rect(3, 4, 2, 18, S.m2);
    p.rect(3, 12, 2, 1, S.m);
    p.rect(1, 22, 6, 2, S.m);
  },
  lamp_tree: (p, { on }) => {
    p.rect(7, 4, 2, 18, S.m2);
    for (let i = 0; i < 4; i++) p.px(6 - i, 8 - i, S.m2);
    for (let i = 0; i < 4; i++) p.px(9 + i, 6 - i, S.m2);
    const head = (x: number, y: number) => {
      p.rect(x, y, 4, 3, S.m);
      p.rect(x, y, 4, 1, S.m3);
      p.rect(x + 1, y + 3, 2, 1, on ? C.glow : C.ink3);
    };
    head(0, 2);
    head(11, 0);
    head(6, 1);
    p.rect(4, 22, 8, 2, S.m);
  },
  lamp_globe_floor: (p, { on }) => {
    disc(p, 4, 4, 3.6, on ? '#fffbeb' : C.paper);
    if (on) disc(p, 3.4, 3.4, 1.5, '#ffffff');
    else p.px(2, 2, C.white);
    p.rect(3, 8, 2, 1, S.m);
    p.rect(3, 9, 2, 13, S.m2);
    p.rect(3, 9, 1, 13, S.m);
    p.rect(1, 22, 6, 2, S.m);
  },
  lamp_mushroom_floor: (p, { on }) => {
    p.rect(1, 0, 6, 1, S.a);
    p.rect(0, 1, 8, 4, S.a);
    p.rect(0, 1, 8, 1, S.a3);
    p.rect(0, 5, 8, 1, S.a2);
    p.rect(1, 6, 6, 1, on ? '#fde68a' : C.ink3);
    p.rect(3, 7, 2, 15, S.a);
    p.rect(3, 7, 1, 15, S.a3);
    p.rect(1, 22, 6, 2, S.a);
    p.rect(1, 22, 6, 1, S.a3);
  },
  lamp_shelf_floor: (p, { on }) => {
    p.rect(1, 0, 6, 1, C.paper2);
    p.rect(0, 1, 8, 5, on ? WARM : C.paper);
    p.rect(0, 5, 8, 1, on ? C.glow : C.paper2);
    p.rect(3, 6, 2, 17, S.w2);
    for (const y of [10, 15]) {
      p.rect(0, y, 8, 1, S.w);
      p.rect(0, y + 1, 8, 1, S.w2);
    }
    p.rect(1, 8, 2, 2, C.leaf2);
    p.rect(5, 13, 2, 2, C.red);
    p.rect(0, 22, 8, 2, S.w);
  },
  lamp_rattan_floor: (p, { on }) => {
    p.rect(3, 0, 2, 1, S.w2);
    for (let i = 0; i < 8; i++) {
      const w = 2 + Math.floor(i * 0.8);
      p.rect(4 - Math.ceil(w / 2), 1 + i, w, 1, i % 2 ? S.w2 : S.w);
    }
    p.rect(1, 9, 6, 1, on ? C.glow : C.ink3);
    p.rect(3, 10, 2, 12, S.w2);
    p.rect(1, 22, 6, 2, S.w);
  },
  lamp_neon_tube: (p, { on }) => {
    p.rect(2, 0, 4, 1, C.ink3);
    p.rect(3, 1, 2, 21, on ? S.a3 : C.ink3);
    if (on) p.rect(3, 2, 1, 19, '#ffffff');
    p.rect(2, 22, 4, 2, C.ink3);
  },
  lamp_bubble: (p, { on }) => {
    p.rect(1, 0, 6, 2, C.metal2);
    p.rect(2, 2, 4, 18, on ? '#7dd3fc' : '#93c5fd');
    p.rect(2, 2, 1, 18, on ? '#bae6fd' : '#bfdbfe');
    const bubbles: [number, number][] = [
      [4, 4],
      [3, 7],
      [5, 10],
      [4, 13],
      [3, 16],
    ];
    for (const [x, y] of bubbles) p.px(x, y, C.white);
    p.rect(3, 9, 2, 1, '#f97316');
    p.rect(0, 20, 8, 4, C.metal2);
    p.rect(0, 20, 8, 1, C.metal);
  },
  lamp_star_projector: (p, { on }) => {
    disc(p, 4, 3.5, 3.2, S.m);
    for (const [x, y] of [
      [2, 2],
      [5, 2],
      [4, 4],
      [2, 5],
      [6, 4],
    ] as const)
      p.px(x, y, on ? '#c7d2fe' : C.ink3);
    p.rect(1, 6, 6, 2, S.m2);
    p.rect(1, 6, 6, 1, S.m);
  },
  lamp_dome: (p, { on }) => {
    p.rect(2, 0, 4, 1, S.m3);
    p.rect(1, 1, 6, 2, S.m);
    p.rect(0, 3, 8, 1, S.m);
    p.rect(1, 4, 6, 1, on ? C.glow : C.ink3);
    p.rect(3, 5, 2, 2, S.m2);
    p.rect(1, 7, 6, 1, S.m);
  },
  lamp_tiffany: (p, { on }) => {
    const glass = on ? ['#fbbf24', '#f87171', '#4ade80', '#60a5fa'] : ['#b45309', '#991b1b', '#166534', '#1e40af'];
    p.rect(3, 0, 2, 1, C.ink3);
    p.rect(2, 1, 4, 1, glass[0]);
    for (let x = 0; x < 8; x++) {
      p.px(x, 2 + (x === 0 || x === 7 ? 1 : 0), glass[x % 4]);
      p.rect(x, 3, 1, 2, glass[(x + 2) % 4]);
    }
    p.rect(0, 5, 8, 1, C.ink3);
    p.rect(3, 6, 2, 3, C.ink3);
    p.rect(2, 9, 4, 1, C.ink3);
    // a little round table under it
    p.rect(0, 10, 8, 1, C.walnut3);
    p.rect(3, 11, 2, 4, C.walnut);
    p.rect(1, 15, 6, 1, C.walnut);
  },
  lamp_cloud: (p, { on }) => {
    const c = on ? '#f8fafc' : C.paper2;
    disc(p, 2.5, 4, 2, c);
    disc(p, 5, 3.5, 2.5, c);
    p.rect(1, 4, 6, 2, c);
    if (on) p.rect(3, 3, 3, 1, '#ffffff');
    p.rect(3, 6, 2, 1, C.metal2);
    p.rect(2, 7, 4, 1, C.metal3);
  },
  lamp_paper_cube: (p, { on }) => {
    p.rect(1, 1, 6, 6, on ? WARM : C.paper);
    p.rect(1, 1, 6, 1, C.wood2);
    p.rect(1, 1, 1, 6, C.wood2);
    p.rect(6, 1, 1, 6, C.wood2);
    p.rect(4, 2, 1, 5, C.wood2);
    p.rect(1, 7, 6, 1, C.wood2);
  },
  lamp_edison: (p, { on }) => {
    p.rect(3, 0, 2, 1, C.metal2);
    disc(p, 4, 2.7, 1.8, on ? '#fde68a' : '#e7e5e4');
    p.px(4, 3, on ? '#fb923c' : C.metal2);
    p.rect(3, 4, 2, 1, C.amber2);
    p.rect(3, 5, 2, 1, C.metal2);
    p.rect(1, 6, 6, 2, S.w);
    p.rect(1, 6, 6, 1, S.w3);
  },
  lamp_planet: (p, { on }) => {
    disc(p, 4, 3.5, 2.6, on ? '#fde68a' : '#d6c08a');
    p.rect(0, 4, 8, 1, on ? '#fbbf24' : '#a16207');
    p.px(3, 2, on ? '#fffbeb' : '#e7d7a8');
    p.rect(3, 6, 2, 1, C.ink3);
    p.rect(2, 7, 4, 1, C.ink2);
  },
  lamp_led_candles: (p, { on }) => {
    for (const [x, h] of [
      [0, 5],
      [3, 7],
      [6, 4],
    ] as const) {
      p.rect(x, 8 - h, 2, h, C.white);
      p.rect(x, 8 - h, 2, 1, C.paper2);
      p.px(x + (x === 6 ? 0 : 1), 7 - h, on ? '#fdba74' : C.ink3);
    }
  },
  lamp_oil: (p, { on }) => {
    p.rect(2, 0, 4, 1, S.m);
    p.rect(2, 1, 4, 4, on ? '#fef3c7' : '#e0f2fe');
    p.rect(3, 2, 2, 2, on ? '#fb923c' : '#cbd5e1');
    if (on) p.px(3, 2, '#fde68a');
    p.rect(1, 5, 6, 1, S.m);
    p.rect(2, 6, 4, 2, S.m2);
    p.rect(1, 7, 6, 1, S.m);
  },
  // ------------------------------------------------------------ the wall
  sconce_swing: (p, { on }) => {
    p.rect(0, 2, 2, 5, S.m2);
    p.rect(2, 4, 4, 1, S.m);
    p.rect(5, 4, 1, 2, S.m);
    p.rect(3, 6, 5, 3, S.m);
    p.rect(3, 6, 5, 1, S.m3);
    p.rect(4, 9, 3, 1, on ? C.glow : C.ink3);
  },
  sconce_pair: (p, { on }) => {
    for (const x of [3, 17]) {
      p.rect(x + 1, 3, 2, 4, S.m);
      p.rect(x, 7, 4, 1, S.m2);
      p.rect(x + 1, 0, 2, 3, on ? '#fde68a' : C.paper);
      p.px(x + 1, 0, on ? '#ffffff' : C.paper2);
    }
  },
  neon_wave: (p, { on }) => {
    const pts: [number, number][] = [];
    for (let x = 1; x < 23; x++) pts.push([x, 4 + Math.round(Math.sin((x / 22) * Math.PI * 2) * 2)]);
    neon(p, pts, on, '#38bdf8');
  },
  neon_star: (p, { on }) => {
    neon(p, path([8, 1], [10, 6], [15, 6], [11, 9], [13, 14], [8, 11], [3, 14], [5, 9], [1, 6], [6, 6], [8, 1]), on, '#fde047');
  },
  neon_bolt: (p, { on }) => {
    neon(p, path([5, 1], [2, 8], [5, 8], [2, 15], [6, 6], [3, 6], [5, 1]), on, '#facc15');
  },
  neon_plant: (p, { on }) => {
    neon(p, path([8, 15], [8, 6]), on, '#4ade80');
    neon(p, path([8, 9], [3, 6], [2, 3], [5, 2], [8, 6]), on, '#4ade80');
    neon(p, path([8, 7], [12, 3], [14, 5], [12, 9], [8, 10]), on, '#4ade80');
    neon(p, path([5, 13], [11, 13], [10, 15], [6, 15], [5, 13]), on, '#f472b6');
  },
  neon_smile: (p, { on }) => {
    const ring: [number, number][] = [];
    for (let a = 0; a < 40; a++) ring.push([Math.round(8 + Math.cos((a / 40) * Math.PI * 2) * 6.5), Math.round(8 + Math.sin((a / 40) * Math.PI * 2) * 6.5)]);
    neon(p, ring, on, '#fde047');
    neon(p, [[6, 6], [6, 7], [10, 6], [10, 7]], on, '#fde047');
    neon(p, path([5, 10], [7, 12], [9, 12], [11, 10]), on, '#fde047');
  },
  neon_study: (p, { on }) => {
    if (on) p.rect(1, 1, 22, 7, '#2a0f1f');
    text(p, 2, 2, 'STUDY', on ? '#f472b6' : C.ink3);
  },
  marquee_letters: (p, { on }) => {
    // three big bulb letters, each glyph pixel a 2x2 cell with a bulb in it
    ['J', 'O', 'Y'].forEach((ch, i) => {
      const ox = 1 + i * 8;
      const big: Painter = {
        rect: (x, y, w, h, c) => p.rect(ox + x * 2, 3 + y * 2, w * 2, h * 2, c),
        px: (x, y) => {
          p.rect(ox + x * 2, 3 + y * 2, 2, 2, C.red2);
          p.px(ox + x * 2, 3 + y * 2, on ? ((x + y) % 2 ? C.glow : '#fffbeb') : C.paper2);
        },
      };
      text(big, 0, 0, ch, C.red2);
    });
  },
  fairy_curtain: (p, { on }) => {
    p.rect(0, 0, 24, 1, C.ink3);
    for (let x = 1; x < 24; x += 3) {
      const len = 10 + ((x * 7) % 5);
      p.rect(x, 1, 1, len, C.ink3);
      for (let y = 2; y < len; y += 3) p.px(x, y, on ? (y % 2 ? C.glow : '#fffbeb') : C.paper2);
    }
  },
  paper_lanterns: (p, { on }) => {
    for (let x = 0; x < 24; x++) p.px(x, 1 + Math.round(Math.sin((x / 24) * Math.PI) * 1.5), C.ink3);
    const colors = on ? ['#fca5a5', '#fde68a', '#a7f3d0', '#bfdbfe', '#f9a8d4'] : ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];
    for (let i = 0; i < 5; i++) {
      const x = 2 + i * 5;
      disc(p, x + 0.5, 5, 2, colors[i]);
      p.rect(x, 2, 1, 1, C.ink3);
    }
  },
  // -------------------------------------------------------- the ceiling
  pendant_single: (p, { on }) => {
    p.rect(2, 0, 4, 1, S.m2);
    p.rect(4, 1, 1, 8, C.ink3);
    p.rect(3, 9, 2, 1, S.m);
    p.rect(1, 10, 6, 2, S.m);
    p.rect(0, 12, 8, 2, S.m);
    p.rect(1, 10, 6, 1, S.m3);
    p.rect(2, 14, 4, 1, on ? '#fffbeb' : C.ink3);
  },
  pendant_rattan: (p, { on }) => {
    p.rect(6, 0, 4, 1, C.ink3);
    p.rect(8, 1, 1, 5, C.ink3);
    disc(p, 8, 11, 5.6, S.w);
    for (let y = 6; y < 17; y += 2) for (let x = 3 + (y % 4 ? 1 : 0); x < 14; x += 2) if ((x - 8) ** 2 + (y - 11) ** 2 < 28) p.px(x, y, on ? C.glow : S.w2);
    p.rect(4, 15, 9, 1, on ? '#fde68a' : S.w2);
  },
  pendant_globe: (p, { on }) => {
    p.rect(3, 0, 2, 1, C.ink3);
    p.rect(4, 1, 1, 7, C.ink3);
    p.rect(3, 8, 2, 1, C.brick2);
    disc(p, 4, 12, 3.6, on ? '#fffbeb' : C.white);
    if (on) disc(p, 4, 12, 2, '#fef9c3');
    else p.px(2, 10, C.paper2);
  },
  track_lights: (p, { on }) => {
    p.rect(0, 0, 24, 2, S.m);
    p.rect(0, 0, 24, 1, S.m3);
    for (const x of [2, 10, 18]) {
      p.rect(x + 1, 2, 1, 1, S.m2);
      p.rect(x, 3, 4, 3, S.m);
      p.rect(x, 3, 4, 1, S.m3);
      p.rect(x + 1, 6, 2, 1, on ? C.glow : C.ink3);
    }
  },
  paper_pendant: (p, { on }) => {
    p.rect(8, 0, 1, 4, C.ink3);
    disc(p, 8, 10, 6, on ? WARM : C.paper);
    for (let y = 6; y < 16; y += 2) {
      const half = Math.floor(Math.sqrt(Math.max(0, 36 - (y - 10) ** 2)));
      p.rect(8 - half, y, half * 2, 1, on ? '#fde68a' : C.paper2);
    }
  },
  ceiling_fan: (p, { on }) => {
    p.rect(11, 0, 2, 3, C.ink3);
    p.rect(1, 3, 22, 1, S.w);
    p.rect(0, 4, 9, 1, S.w2);
    p.rect(15, 4, 9, 1, S.w2);
    p.rect(9, 2, 6, 3, C.ink3);
    p.rect(10, 5, 4, 2, on ? '#fffbeb' : C.paper);
    p.rect(11, 7, 2, 1, on ? C.glow : C.paper2);
  },
  lamp_arc_marble: (p, { on }) => {
    // a long arc from a marble block to a shade over the room
    const arc: [number, number][] = [];
    for (let t = 0; t <= 80; t++) {
      const a = (t / 80) * Math.PI * 0.6;
      arc.push([Math.round(2 + Math.sin(a) * 10), Math.round(21 - Math.sin(a + 0.25) * 19 + 2)]);
    }
    for (const [x, y] of arc) p.px(x, y, S.m);
    p.rect(9, 3, 6, 1, S.m3);
    p.rect(8, 4, 8, 3, S.m);
    p.rect(9, 7, 6, 1, on ? C.glow : C.ink3);
    p.rect(0, 20, 6, 4, '#e7e5e4');
    p.rect(0, 20, 6, 1, C.white);
    p.px(2, 22, C.metal);
    p.px(4, 21, C.metal);
  },
};
