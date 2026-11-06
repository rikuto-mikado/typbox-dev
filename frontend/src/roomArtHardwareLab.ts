// MY ROOM art pack: HARDWARE LAB — benches, scopes, soldering and tools.
// Scopes, supplies and printers wake while the stopwatch runs (`on`).
// Recolourable parts use the S slots (roomPaint.ts): w = bench wood,
// m = instrument metal, a = accent / casing, b = second accent.
import { box, C, disc, hash, S, type Art, type Painter } from './roomPaint';

/** Bench: top at y, legs down to the bottom of an h-tall piece. */
const bench = (p: Painter, w: number, y: number, h: number) => {
  p.rect(0, y, w, 2, S.w3);
  p.rect(0, y + 2, w, 1, S.w2);
  p.rect(1, y + 3, 2, h - y - 3, S.w2);
  p.rect(w - 3, y + 3, 2, h - y - 3, S.w2);
  p.rect(1, h - 3, w - 2, 1, S.w);
};

const scopeScreen = (p: Painter, x: number, y: number, on: boolean) => {
  box(p, x, y, 8, 6, on ? C.term : C.screenOff, C.ink);
  if (on) for (let i = 0; i < 6; i++) p.px(x + 1 + i, y + 3 + Math.round(Math.sin(i * 1.3) * 1.4), C.leaf3);
};

export const HARDWARE_LAB_ART: Record<string, Art> = {
  hw_oscilloscope_bench: (p, { on }) => {
    box(p, 1, 0, 13, 9, S.m, S.m2);
    scopeScreen(p, 2, 1, on);
    for (let y = 2; y < 7; y += 2) {
      disc(p, 12, y + 0.5, 0.9, C.ink2);
    }
    p.rect(2, 8, 3, 1, S.a);
    box(p, 16, 4, 6, 5, S.m3, S.m2);
    p.px(18, 6, on ? C.red : C.ink3);
    p.px(20, 6, on ? C.leaf3 : C.ink3);
    bench(p, 24, 9, 16);
  },
  hw_solder_station: (p, { on }) => {
    box(p, 0, 4, 5, 4, S.a, S.a2);
    p.px(2, 5, on ? C.red : C.ink3);
    p.rect(1, 6, 3, 1, on ? C.amber : C.ink3);
    // iron in its coil holder
    p.rect(5, 6, 3, 2, S.m2);
    p.px(6, 5, S.m);
    p.px(6, 4, S.m);
    p.px(7, 3, C.ink2);
    p.px(7, 2, C.ink2);
    p.px(7, 1, on ? C.orange : C.metal);
    p.rect(0, 1, 2, 2, C.leaf2);
    p.rect(1, 3, 1, 1, C.leaf2);
  },
  hw_tool_wall: (p) => {
    p.rect(0, 0, 32, 15, S.w3);
    for (let y = 2; y < 15; y += 3) for (let x = 2; x < 32; x += 3) p.px(x, y, S.w2);
    // hammer, wrenches, screwdrivers, pliers, saw
    p.rect(2, 2, 1, 9, S.w);
    p.rect(1, 2, 3, 2, S.m2);
    for (let i = 0; i < 3; i++) {
      p.rect(7 + i * 3, 3, 1, 7 + i, S.m);
      p.rect(6 + i * 3, 2, 3, 2, S.m);
    }
    for (let i = 0; i < 3; i++) {
      p.rect(17 + i * 2, 2, 1, 4, [S.a, S.b, C.amber2][i]);
      p.rect(17 + i * 2, 6, 1, 5, S.m3);
    }
    p.rect(24, 2, 6, 3, S.m);
    p.rect(24, 5, 6, 1, S.m2);
    p.rect(28, 1, 3, 2, S.a);
    p.rect(23, 9, 8, 4, S.m2);
    p.rect(23, 9, 8, 1, S.m3);
    p.rect(0, 15, 32, 1, S.w2);
  },
  hw_drone_bench: (p, { on }) => {
    // quad drone on the bench
    p.rect(3, 4, 18, 1, S.m2);
    for (const x of [2, 18]) {
      p.rect(x, 2, 5, 1, C.ink3);
      p.rect(x + 2, 3, 1, 2, C.ink2);
    }
    box(p, 8, 3, 8, 4, S.a, S.a2);
    p.px(11, 4, on ? C.leaf3 : C.ink3);
    p.px(12, 4, on ? C.red : C.ink3);
    p.rect(9, 7, 6, 1, C.ink2);
    p.rect(20, 5, 3, 3, S.b);
    bench(p, 24, 8, 16);
  },
  hw_parts_drawers: (p) => {
    box(p, 0, 0, 16, 16, S.a, S.a2);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 2 + col * 4;
        const y = 2 + row * 3;
        p.rect(x, y, 3, 2, C.paper);
        p.px(x + 1, y + 1, [C.red, C.amber2, C.leaf2, C.blue][(row + col) % 4]);
      }
    }
    p.rect(1, 15, 14, 1, S.a2);
  },
  hw_workbench: (p, { on }) => {
    // vice, a lamp and a laptop on a long bench
    p.rect(2, 4, 6, 2, S.m);
    p.rect(3, 2, 2, 2, S.m2);
    p.rect(1, 6, 8, 1, S.m2);
    box(p, 12, 3, 8, 4, on ? C.screenOn : C.screenOff, C.ink);
    p.rect(11, 7, 10, 1, S.m3);
    p.rect(26, 1, 1, 6, S.m2);
    p.rect(24, 0, 5, 2, S.a);
    if (on) p.rect(24, 2, 5, 1, C.glow);
    bench(p, 32, 8, 16);
    p.rect(4, 12, 24, 1, S.w2);
  },
  hw_spool_rack: (p) => {
    p.rect(0, 1, 24, 1, S.m2);
    p.rect(0, 2, 1, 6, S.m2);
    p.rect(23, 2, 1, 6, S.m2);
    const spools = [S.a, S.b, C.white, C.leaf2, C.amber2];
    spools.forEach((c, i) => {
      const x = 2 + i * 4;
      p.rect(x, 2, 3, 6, C.ink3);
      p.rect(x, 3, 3, 4, c);
      p.px(x + 1, 4, C.ink2);
    });
  },
  hw_lab_stool: (p) => {
    p.rect(0, 0, 8, 2, S.a);
    p.rect(1, 2, 6, 1, S.a2);
    p.rect(3, 3, 2, 8, S.m2);
    p.rect(1, 11, 6, 1, S.m);
    p.rect(1, 12, 1, 3, S.m2);
    p.rect(6, 12, 1, 3, S.m2);
    p.rect(0, 15, 8, 1, C.ink2);
  },
  hw_power_supply: (p, { on }) => {
    box(p, 0, 2, 8, 6, S.a, S.a2);
    box(p, 1, 3, 4, 2, on ? C.ink : C.screenOff, C.ink);
    if (on) {
      p.px(2, 4, C.red);
      p.px(3, 4, C.red);
    }
    disc(p, 6.5, 4, 0.8, C.ink2);
    p.px(2, 6, C.red);
    p.px(4, 6, C.ink);
    p.rect(2, 0, 1, 2, C.red);
    p.rect(4, 1, 1, 1, C.ink);
  },
  hw_magnifier_lamp: (p, { on }) => {
    p.rect(2, 13, 4, 3, S.m2);
    p.rect(3, 6, 1, 7, S.m);
    p.rect(3, 6, 3, 1, S.m);
    disc(p, 5.5, 3.5, 2.6, S.a);
    disc(p, 5.5, 3.5, 1.6, on ? C.glow : C.sky);
  },
  hw_rubber_floor: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a);
    for (let y = 1; y < h; y += 3) for (let x = (y % 2) * 2; x < w; x += 4) p.px(x, y, S.a2);
    for (let x = 0; x < w; x += 32) p.rect(x, 0, 1, h, S.a3);
  },
  hw_wall_osb: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.w);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = hash(x * 3, y * 7);
        if (r > 0.82) p.px(x, y, S.w3);
        else if (r < 0.12) p.px(x, y, S.w2);
      }
    }
    for (let x = 0; x < w; x += 32) p.rect(x, 0, 1, h, S.w2);
  },
};
