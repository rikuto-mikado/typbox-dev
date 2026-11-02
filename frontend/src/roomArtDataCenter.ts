// MY ROOM art pack: DATA CENTER VAULT — server racks, heavy power gear and
// warning lights. LEDs blink and screens wake while the stopwatch runs
// (`on`); beacons also glow at night. Recolourable parts use the S slots
// (roomPaint.ts): m = chassis metal, a = accent / LEDs, b = painted body.
import { box, C, disc, hash, S, text, type Art, type Painter } from './roomPaint';

/** A small yellow hazard triangle with an exclamation mark, 5 x 5. */
const hazard = (p: Painter, x: number, y: number) => {
  p.rect(x + 2, y, 1, 1, C.amber);
  p.rect(x + 1, y + 1, 3, 2, C.amber);
  p.rect(x, y + 3, 5, 2, C.amber);
  p.px(x + 2, y + 1, C.ink);
  p.px(x + 2, y + 2, C.ink);
  p.px(x + 2, y + 4, C.ink);
};

/** A blinking LED: lit colour while running, dark otherwise. */
const led = (p: Painter, x: number, y: number, on: boolean, color: string, seed: number) =>
  p.px(x, y, on && hash(seed, x + y) > 0.25 ? color : C.ink3);

export const DATA_CENTER_ART: Record<string, Art> = {
  dc_server_rack: (p, { on }) => {
    box(p, 0, 0, 16, 32, S.m, S.m2);
    p.rect(1, 1, 14, 1, S.m3);
    p.rect(2, 3, 12, 26, C.ink);
    for (let y = 4; y < 28; y += 3) {
      p.rect(2, y, 12, 2, C.ink2);
      p.rect(3, y, 6, 1, C.ink3);
      led(p, 11, y, on, S.a3, y);
      led(p, 12, y, on, C.leaf3, y + 7);
    }
    p.rect(7, 29, 2, 1, S.m3);
    p.rect(1, 31, 3, 1, C.ink);
    p.rect(12, 31, 3, 1, C.ink);
  },
  dc_transformer: (p) => {
    // three ceramic bushings on the lid
    for (const x of [5, 11, 17]) {
      p.rect(x, 1, 2, 7, C.paper2);
      for (let y = 2; y < 8; y += 2) p.rect(x - 1, y, 4, 1, C.paper);
      p.rect(x, 0, 2, 1, C.metal2);
    }
    box(p, 1, 8, 22, 16, S.b, S.b2);
    p.rect(2, 9, 20, 1, S.b3);
    for (let x = 3; x < 22; x += 2) p.rect(x, 11, 1, 11, S.b2);
    p.rect(8, 13, 8, 7, S.b);
    hazard(p, 9, 14);
    p.rect(2, 23, 20, 1, C.ink2);
  },
  dc_ups: (p, { on }) => {
    box(p, 0, 1, 16, 15, S.m, S.m2);
    p.rect(1, 2, 14, 1, S.m3);
    box(p, 3, 4, 10, 4, on ? C.screenOn : C.screenOff, C.ink);
    if (on) for (let x = 4; x < 11; x += 2) p.rect(x, 5, 1, 2, C.leaf3);
    p.px(12, 5, on ? S.a3 : C.ink3);
    disc(p, 8, 10.5, 1.4, S.a);
    for (let y = 12; y < 15; y++) p.rect(3, y, 10, 1, y % 2 ? S.m2 : S.m);
  },
  dc_warning_beacon: (p, { on, night }) => {
    const lit = on || night;
    p.rect(2, 6, 4, 2, C.metal2);
    p.rect(1, 7, 6, 1, C.ink3);
    disc(p, 4, 4, 2.6, lit ? S.a3 : S.a2);
    p.px(3, 3, lit ? C.white : S.a);
    if (lit) {
      p.px(0, 2, S.a3);
      p.px(7, 2, S.a3);
      p.px(4, 0, S.a3);
    }
  },
  dc_cooling_pipes: (p) => {
    for (const [y, c, c2] of [
      [2, S.a, S.a2],
      [9, S.b, S.b2],
    ] as const) {
      p.rect(0, y, 32, 4, c);
      p.rect(0, y, 32, 1, c2);
      p.rect(0, y + 3, 32, 1, c2);
      for (let x = 3; x < 32; x += 9) p.rect(x, y - 1, 2, 6, S.m);
    }
    // valve wheel between the pipes
    disc(p, 16, 8, 3, S.m2);
    disc(p, 16, 8, 1.5, S.m3);
    p.rect(15, 5, 2, 7, S.m);
    p.rect(13, 7, 7, 2, S.m);
  },
  dc_raised_floor: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m);
    for (let y = 0; y < h; y += 8) p.rect(0, y, w, 1, S.m2);
    for (let x = 0; x < w; x += 8) p.rect(x, 0, 1, h, S.m2);
    for (let ty = 0; ty < h; ty += 8) {
      for (let tx = 0; tx < w; tx += 8) {
        if (hash(tx, ty) > 0.65) {
          for (let y = ty + 2; y < ty + 7 && y < h; y += 2) for (let x = tx + 2; x < tx + 7; x += 2) p.px(x, y, S.m3);
        }
      }
    }
  },
  dc_cable_tray: (p) => {
    // hangers from the ceiling side
    for (const x of [3, 28]) p.rect(x, 0, 1, 3, S.m2);
    // bundled cables in the tray
    p.rect(0, 2, 32, 1, S.a2);
    p.rect(0, 3, 32, 1, S.a);
    p.rect(0, 4, 32, 1, C.amber2);
    p.rect(9, 2, 1, 3, C.ink3);
    p.rect(21, 2, 1, 3, C.ink3);
    // ventilated ladder tray
    p.rect(0, 5, 32, 2, S.m);
    p.rect(0, 5, 32, 1, S.m3);
    for (let x = 1; x < 32; x += 3) p.px(x, 6, S.m2);
    // a cable dropping out of it
    p.rect(26, 7, 1, 1, S.a);
  },
  dc_control_desk: (p, { on }) => {
    for (const x of [1, 11, 21]) {
      box(p, x, 0, 10, 7, on ? C.term : C.screenOff, C.ink);
      if (on) {
        for (let i = 0; i < 6; i++) p.px(x + 2 + i, 4 - Math.round(hash(x, i) * 2), C.leaf3);
        p.rect(x + 2, 5, 3, 1, S.a3);
      }
      p.rect(x + 4, 7, 2, 2, C.ink2);
    }
    p.rect(0, 9, 32, 2, S.m3);
    p.rect(0, 11, 32, 1, S.m2);
    p.rect(10, 10, 12, 1, C.ink2);
    box(p, 1, 12, 8, 4, S.m, S.m2);
    box(p, 23, 12, 8, 4, S.m, S.m2);
    p.px(5, 13, on ? S.a3 : C.ink3);
  },
  dc_fire_extinguisher: (p) => {
    p.rect(3, 1, 3, 2, C.ink);
    p.rect(1, 2, 3, 1, C.ink2);
    p.rect(0, 3, 1, 6, C.ink2);
    p.rect(2, 3, 5, 12, S.b);
    p.rect(2, 3, 1, 12, S.b3);
    p.rect(6, 3, 1, 12, S.b2);
    p.rect(2, 8, 5, 3, C.white);
    p.rect(3, 9, 3, 1, S.b2);
    p.rect(2, 15, 5, 1, C.ink2);
  },
  dc_patch_panel: (p, { on }) => {
    box(p, 0, 0, 16, 5, S.m2, C.ink);
    for (let x = 2; x < 14; x += 2) {
      p.px(x, 2, C.ink);
      p.px(x, 3, on && hash(x, 3) > 0.4 ? C.leaf3 : C.ink3);
    }
    const colors = [S.a, C.amber2, C.red, S.a3, C.leaf2, C.white];
    colors.forEach((c, i) => {
      const x = 2 + i * 2;
      p.rect(x, 5, 1, 1 + (i % 3), c);
      p.px(x + 1, 6 + (i % 3), c);
    });
  },
  dc_breaker_cabinet: (p, { on }) => {
    box(p, 0, 0, 16, 24, S.m, S.m2);
    p.rect(1, 1, 14, 1, S.m3);
    p.rect(8, 2, 1, 20, S.m2);
    p.rect(6, 10, 1, 4, C.ink2);
    p.rect(10, 10, 1, 4, C.ink2);
    hazard(p, 2, 3);
    for (const [x, y] of [
      [11, 3],
      [13, 3],
    ])
      p.px(x, y, on ? (x === 11 ? C.leaf3 : S.a3) : C.ink3);
    for (let y = 17; y < 22; y += 2) p.rect(2, y, 5, 1, S.m2);
    p.rect(1, 23, 14, 1, C.ink);
  },
  dc_crash_cart: (p, { on }) => {
    box(p, 1, 0, 6, 5, on ? C.term : C.screenOff, C.ink);
    if (on) p.rect(2, 2, 3, 1, C.leaf3);
    p.rect(3, 5, 2, 2, C.ink2);
    p.rect(0, 7, 8, 1, S.m);
    p.rect(1, 8, 6, 1, C.ink3);
    p.rect(0, 11, 8, 1, S.m);
    p.rect(0, 7, 1, 7, S.m2);
    p.rect(7, 7, 1, 7, S.m2);
    p.rect(2, 9, 4, 2, S.a);
    p.px(1, 15, C.ink);
    p.px(6, 15, C.ink);
    p.rect(0, 14, 8, 1, S.m2);
  },
  dc_hazard_floor: (p, { w, h }) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.px(x, y, (x + y) % 10 < 5 ? S.a : C.ink2);
    for (let x = 0; x < w; x += 16) p.rect(x, 0, 1, h, C.ink);
  },
  dc_vault_door: (p) => {
    p.rect(0, 2, 3, 6, S.m2);
    p.rect(0, 16, 3, 6, S.m2);
    disc(p, 12.5, 12, 11, C.ink);
    disc(p, 12.5, 12, 10, S.m2);
    disc(p, 12.5, 12, 8.5, S.m);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.px(Math.round(12 + Math.cos(a) * 9.4), Math.round(11.5 + Math.sin(a) * 9.4), S.m3);
    }
    disc(p, 12.5, 12, 4, S.m3);
    disc(p, 12.5, 12, 2, S.m2);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      for (let r = 2; r < 7; r++) p.px(Math.round(12 + Math.cos(a) * r), Math.round(11.5 + Math.sin(a) * r), S.m3);
    }
  },
  dc_status_wall: (p, { on }) => {
    box(p, 0, 0, 24, 15, C.ink2, S.m2);
    p.rect(1, 1, 22, 13, on ? C.term : C.screenOff);
    if (on) {
      text(p, 2, 2, 'OK', C.leaf3);
      for (let i = 0; i < 6; i++) p.rect(3 + i * 3, 13 - Math.round(2 + hash(i, 4) * 5), 2, Math.round(2 + hash(i, 4) * 5), S.a3);
      for (let x = 12; x < 22; x++) p.px(x, 4 + Math.round(Math.sin(x / 2) * 1.5), C.amber);
    } else {
      p.rect(2, 2, 6, 1, C.ink3);
    }
    p.rect(10, 15, 4, 1, S.m2);
  },
  dc_wall_panels: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m);
    for (let y = 0; y < h; y += 12) p.rect(0, y, w, 1, S.m2);
    for (let x = 0; x < w; x += 16) {
      p.rect(x, 0, 1, h, S.m2);
      p.rect(x + 1, 0, 1, h, S.m3);
      for (let y = 3; y < h; y += 12) {
        p.px(x + 3, y, S.m2);
        p.px(x + 13, y, S.m2);
      }
    }
  },
};
