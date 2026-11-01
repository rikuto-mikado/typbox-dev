// MY ROOM art pack: ORBITAL HABITAT — a space-station cabin with hull
// windows, hydroponics and sleep capsules. Panels and holograms wake while
// the stopwatch runs (`on`). Recolourable parts use the S slots
// (roomPaint.ts): m = hull metal, a = accent lights / trim, b = fabric.
import { box, C, disc, hash, S, type Art, type Painter } from './roomPaint';

const SPACE = '#05060f';

/** Starfield inside a rectangle. */
const stars = (p: Painter, x: number, y: number, w: number, h: number, seed: number) => {
  p.rect(x, y, w, h, SPACE);
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const r = hash(xx + seed, yy * 3 + seed);
      if (r > 0.94) p.px(xx, yy, r > 0.985 ? C.white : '#94a3b8');
    }
  }
};

/** Thick rounded hull frame around a window opening. */
const hullFrame = (p: Painter, w: number, h: number) => {
  p.rect(0, 0, w, h, S.m2);
  p.rect(1, 1, w - 2, h - 2, S.m);
  for (const [x, y] of [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
  ])
    p.px(x, y, S.m3);
};

export const ORBITAL_ART: Record<string, Art> = {
  orb_window_earth: (p) => {
    hullFrame(p, 32, 24);
    stars(p, 4, 4, 24, 16, 3);
    // the Earth's limb rising from the bottom right
    for (let y = 4; y < 20; y++) {
      for (let x = 4; x < 28; x++) {
        const d = Math.hypot(x + 0.5 - 30, y + 0.5 - 26);
        if (d < 16) {
          const land = hash(Math.floor(x / 2), Math.floor(y / 2)) > 0.62;
          const cloud = hash(x * 5, y) > 0.86;
          p.px(x, y, cloud ? C.white : land ? '#4d7c0f' : d > 15 ? '#7dd3fc' : '#1d4ed8');
        } else if (d < 17) p.px(x, y, '#38bdf8');
      }
    }
    disc(p, 9, 8, 1.6, '#e2e8f0');
    p.rect(4, 4, 24, 1, S.m2);
  },
  orb_window_nebula: (p) => {
    hullFrame(p, 24, 24);
    stars(p, 4, 4, 16, 16, 11);
    for (let y = 4; y < 20; y++) {
      for (let x = 4; x < 20; x++) {
        const v = Math.sin(x / 2.5 + y / 4) + Math.cos(y / 3 - x / 5);
        if (v > 1.1) p.px(x, y, hash(x, y) > 0.5 ? S.a : S.a3);
        else if (v > 0.6 && hash(x, y) > 0.55) p.px(x, y, S.a2);
      }
    }
    p.px(14, 8, C.white);
    p.px(7, 15, C.white);
  },
  orb_hydro_pod: (p, { on }) => {
    box(p, 0, 0, 16, 24, S.m, S.m2);
    p.rect(2, 2, 12, 17, on ? '#1e1b4b' : C.ink2);
    // three shelves of greens under grow lights
    for (const y of [3, 9, 15]) {
      p.rect(2, y, 12, 1, on ? '#c026d3' : C.ink3);
      for (let x = 3; x < 13; x += 2) {
        p.rect(x, y + 2, 1, 2, C.leaf2);
        p.px(x, y + 1, C.leaf3);
      }
      p.rect(2, y + 4, 12, 1, S.m3);
    }
    p.rect(2, 20, 12, 2, S.a);
    p.px(12, 21, on ? C.leaf3 : C.ink3);
  },
  orb_airlock_door: (p, { on }) => {
    p.rect(0, 0, 24, 32, S.m2);
    p.rect(1, 1, 22, 31, S.m);
    p.rect(4, 4, 16, 26, S.m3);
    p.rect(11, 4, 2, 26, S.m2);
    // hazard band and round porthole
    for (let x = 4; x < 20; x++) p.px(x, 20, x % 4 < 2 ? C.amber : C.ink);
    for (let x = 4; x < 20; x++) p.px(x, 21, (x + 2) % 4 < 2 ? C.amber : C.ink);
    disc(p, 12, 11, 4, S.m2);
    disc(p, 12, 11, 3, SPACE);
    p.px(11, 10, C.white);
    p.rect(20, 14, 2, 4, C.ink2);
    p.px(20, 15, on ? C.leaf3 : C.red);
    p.rect(0, 31, 24, 1, C.ink);
  },
  orb_sleep_capsule: (p, { on }) => {
    p.rect(1, 3, 30, 12, S.m2);
    p.rect(2, 4, 28, 10, S.m);
    p.rect(4, 5, 24, 7, S.m3);
    // occupant-free bed inside, blanket in the fabric slot
    p.rect(5, 9, 22, 3, S.b);
    p.rect(5, 9, 22, 1, S.b3);
    p.rect(5, 8, 4, 2, C.paper);
    p.rect(4, 5, 24, 1, on ? S.a3 : S.a2);
    p.rect(1, 15, 30, 1, C.ink2);
    p.rect(3, 15, 3, 1, S.m2);
    p.rect(26, 15, 3, 1, S.m2);
  },
  orb_control_console: (p, { on }) => {
    p.rect(2, 0, 20, 6, S.m2);
    box(p, 3, 1, 18, 5, on ? '#0b1530' : C.screenOff, C.ink);
    if (on) {
      disc(p, 7, 3.5, 1.5, S.a3);
      for (let x = 11; x < 20; x++) p.px(x, 3 + Math.round(Math.sin(x) * 1), C.leaf3);
    }
    p.rect(0, 6, 24, 3, S.m);
    for (let x = 2; x < 22; x += 3) p.px(x, 7, on && hash(x, 7) > 0.3 ? [S.a3, C.amber, C.red][x % 3] : C.ink3);
    p.rect(4, 9, 16, 7, S.m2);
    p.rect(5, 10, 14, 5, S.m);
  },
  orb_oxygen_tank: (p) => {
    p.rect(2, 0, 3, 2, S.m2);
    p.rect(1, 2, 6, 13, S.a);
    p.rect(1, 2, 1, 13, S.a3);
    p.rect(6, 2, 1, 13, S.a2);
    p.rect(1, 7, 6, 2, C.white);
    p.rect(1, 15, 6, 1, C.ink2);
  },
  orb_floating_plant: (p) => {
    disc(p, 4, 5, 3.4, '#cbd5e1');
    disc(p, 4, 5, 2.6, '#e0f2fe');
    p.rect(3, 4, 3, 3, C.leaf2);
    p.px(3, 3, C.leaf3);
    p.px(5, 3, C.leaf3);
    p.px(4, 2, C.leaf);
    p.px(2, 4, C.white);
  },
  orb_eva_locker: (p, { on }) => {
    box(p, 0, 0, 16, 32, S.m, S.m2);
    p.rect(2, 2, 12, 26, C.ink2);
    // EVA suit on its rack
    disc(p, 8, 7, 3.2, C.white);
    disc(p, 8, 7, 2, on ? S.a3 : '#1e293b');
    p.rect(4, 11, 8, 9, C.white);
    p.rect(3, 12, 1, 6, C.paper2);
    p.rect(12, 12, 1, 6, C.paper2);
    p.rect(6, 13, 4, 2, S.a);
    p.rect(5, 20, 2, 7, C.paper);
    p.rect(9, 20, 2, 7, C.paper);
    p.rect(1, 29, 14, 2, S.m2);
  },
  orb_handrail: (p) => {
    for (const x of [1, 30]) p.rect(x, 2, 1, 5, S.m2);
    p.rect(1, 2, 30, 2, S.a);
    p.rect(1, 2, 30, 1, S.a3);
  },
  orb_porthole: (p) => {
    disc(p, 8, 8, 7.5, S.m2);
    disc(p, 8, 8, 6.4, S.m);
    disc(p, 8, 8, 4.8, SPACE);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.px(Math.round(7.5 + Math.cos(a) * 5.6), Math.round(7.5 + Math.sin(a) * 5.6), S.m3);
    }
    p.px(6, 6, C.white);
    p.px(9, 9, '#94a3b8');
    p.px(10, 5, C.white);
    disc(p, 6, 10, 1.2, S.a);
  },
  orb_food_dispenser: (p, { on }) => {
    box(p, 0, 0, 8, 16, S.m, S.m2);
    box(p, 1, 2, 6, 3, on ? S.a3 : C.screenOff, C.ink);
    p.rect(2, 7, 4, 4, C.ink2);
    p.rect(3, 9, 2, 2, C.amber2);
    for (let y = 12; y < 15; y++) p.px(2 + (y % 2) * 3, y, S.m3);
  },
  orb_holo_table: (p, { on }) => {
    // hologram planet above a round table
    if (on) {
      disc(p, 12, 6, 5, S.a3);
      disc(p, 12, 6, 3.8, S.a);
      for (let x = 7; x < 18; x++) p.px(x, 6, S.a3);
      p.rect(11, 1, 2, 1, S.a3);
    } else {
      disc(p, 12, 6, 4, C.ink3);
      disc(p, 12, 6, 3, C.ink2);
    }
    p.rect(9, 11, 6, 1, on ? S.a3 : C.ink3);
    p.rect(2, 12, 20, 2, S.m);
    p.rect(2, 12, 20, 1, S.m3);
    p.rect(9, 14, 6, 2, S.m2);
  },
  orb_rover_model: (p) => {
    box(p, 3, 1, 10, 3, S.a, S.a2);
    p.rect(7, 0, 1, 1, S.m3);
    p.rect(2, 4, 12, 1, S.m2);
    for (const x of [3, 7, 11]) disc(p, x + 0.5, 6, 1.6, C.ink2);
  },
  orb_deck_floor: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m);
    for (let y = 0; y < h; y += 8) {
      p.rect(0, y, w, 1, S.m2);
      for (let x = (y / 8) % 2 ? 0 : 8; x < w; x += 16) {
        for (let yy = y + 2; yy < y + 7 && yy < h; yy += 2) p.rect(x + 2, yy, 12, 1, S.m3);
      }
    }
    for (let x = 0; x < w; x += 32) p.rect(x, 0, 1, h, S.a);
  },
  orb_hull_wall: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m);
    for (let x = 0; x < w; x += 24) {
      p.rect(x, 0, 2, h, S.m2);
      for (let y = 4; y < h; y += 8) p.px(x + 4, y, S.m3);
    }
    for (let y = 0; y < h; y += 20) p.rect(0, y, w, 1, S.m2);
    p.rect(0, h - 3, w, 1, S.a);
  },
};
