// MY ROOM art pack: tech & games. Screens and LEDs react to the stopwatch
// (`on`); recolourable parts use the S slots (roomPaint.ts).
import { box, C, disc, S, text, type Art } from './roomPaint';

export const TECH_ART: Record<string, Art> = {
  crt_tv: (p, { on }) => {
    p.rect(5, 0, 1, 2, C.metal3);
    p.rect(10, 0, 1, 2, C.metal3);
    box(p, 0, 2, 16, 12, S.w, S.w2);
    box(p, 1, 3, 11, 9, on ? C.sky : C.ink2, C.ink);
    if (on) {
      p.rect(3, 9, 7, 1, C.leaf2);
      p.rect(4, 6, 2, 2, C.red);
      p.rect(8, 5, 2, 1, C.white);
    }
    p.px(13, 5, C.ink);
    p.px(13, 8, C.ink);
    p.rect(13, 10, 2, 1, C.metal);
    p.rect(2, 14, 2, 2, S.w2);
    p.rect(12, 14, 2, 2, S.w2);
  },
  retro_console: (p, { on }) => {
    box(p, 2, 1, 10, 4, S.a, S.a2);
    p.rect(3, 2, 4, 1, S.a2);
    p.px(10, 2, on ? C.red : C.ink3);
    p.rect(9, 3, 2, 1, C.ink2);
    // two controllers and their cables
    p.rect(0, 6, 4, 2, S.a3);
    p.px(1, 6, C.ink);
    p.px(3, 7, C.red);
    p.rect(11, 6, 4, 2, S.a3);
    p.px(12, 6, C.ink);
    p.px(14, 7, C.red);
    p.rect(2, 5, 1, 1, C.ink3);
    p.rect(12, 5, 1, 1, C.ink3);
  },
  pc_tower: (p, { on }) => {
    box(p, 0, 0, 8, 16, S.m, S.m2);
    p.rect(1, 1, 4, 14, on ? '#0b1021' : C.ink2);
    if (on) {
      disc(p, 3, 4, 1.4, C.pink);
      disc(p, 3, 8.5, 1.4, C.indigo);
      disc(p, 3, 13, 1.4, C.sky);
    }
    p.px(6, 2, on ? C.leaf3 : C.ink3);
    p.rect(6, 4, 1, 2, C.ink);
  },
  retro_computer: (p, { on }) => {
    box(p, 3, 0, 10, 9, S.w3, S.w2);
    box(p, 4, 1, 8, 6, on ? C.term : C.ink2, C.ink);
    if (on) {
      p.rect(5, 2, 4, 1, C.leaf3);
      p.rect(5, 4, 2, 1, C.leaf3);
      p.px(7, 4, C.white);
    }
    p.rect(5, 9, 6, 1, S.w2);
    p.rect(1, 10, 14, 3, S.w3);
    for (let x = 2; x < 14; x += 2) p.px(x, 11, S.w2);
    p.rect(1, 13, 14, 1, S.w2);
    p.rect(12, 14, 3, 2, S.w3);
    p.rect(0, 15, 16, 1, C.ink3);
  },
  wifi_router: (p, { on }) => {
    p.rect(1, 1, 1, 4, C.ink2);
    p.rect(6, 1, 1, 4, C.ink2);
    box(p, 0, 4, 8, 4, S.m, S.m2);
    for (let x = 2; x < 6; x++) p.px(x, 5, on && x % 2 ? C.leaf3 : C.ink3);
  },
  robot_vacuum: (p, { on }) => {
    p.rect(1, 4, 6, 1, S.m3);
    p.rect(0, 5, 8, 2, S.m);
    p.px(4, 4, on ? C.leaf3 : C.ink3);
    p.rect(0, 7, 8, 1, S.m2);
  },
  vr_stand: (p) => {
    p.rect(1, 1, 6, 3, S.m);
    p.rect(1, 1, 6, 1, S.m3);
    p.rect(2, 2, 1, 1, C.indigo);
    p.rect(5, 2, 1, 1, C.indigo);
    p.rect(0, 2, 1, 2, C.ink2);
    p.rect(7, 2, 1, 2, C.ink2);
    p.rect(3, 4, 2, 10, C.ink2);
    p.rect(1, 14, 6, 2, C.ink2);
    p.rect(0, 8, 2, 3, S.m);
    p.rect(6, 7, 2, 3, S.m);
  },
  hex_lights: (p, { on, night }) => {
    const lit = on || night;
    const hexes: Array<[number, number, string, string]> = [
      [1, 2, C.pink, '#5b2140'], [7, 0, C.indigo, '#2b2a5c'], [13, 2, C.sky, '#1f3a4f'],
      [7, 6, C.teal3, '#174540'], [13, 8, C.purple, '#33204f'], [19, 6, C.amber, '#4a3a15'],
    ];
    hexes.forEach(([x, y, onC, offC]) => {
      const c = lit ? onC : offC;
      p.rect(x + 1, y, 3, 1, c);
      p.rect(x, y + 1, 5, 3, c);
      p.rect(x + 1, y + 4, 3, 1, c);
    });
  },
  oscilloscope: (p, { on }) => {
    box(p, 0, 1, 16, 9, S.m3, S.m2);
    box(p, 1, 2, 9, 7, C.term, C.ink);
    for (let x = 2; x < 9; x++) p.px(x, 5 + Math.round(Math.sin(x * 1.3) * 2), on ? C.leaf3 : C.emerald2);
    for (const [x, y] of [[11, 3], [14, 3], [11, 6], [14, 6]] as const) disc(p, x + 0.5, y + 0.5, 1, C.ink2);
    p.rect(0, 10, 16, 1, S.m2);
    p.rect(1, 11, 1, 3, C.ink2);
    p.rect(14, 11, 1, 3, C.ink2);
    disc(p, 1.5, 14.5, 1.3, C.ink);
    disc(p, 14.5, 14.5, 1.3, C.ink);
  },
  smart_speaker: (p, { on }) => {
    p.rect(2, 2, 4, 6, S.m);
    p.rect(2, 2, 4, 1, on ? C.sky : S.m3);
    for (let y = 4; y < 8; y += 2) p.rect(2, y, 4, 1, S.m2);
  },
  projector_screen: (p, { on }) => {
    p.rect(0, 0, 32, 2, C.ink2);
    p.rect(1, 2, 30, 20, on ? '#1f2a44' : C.white);
    if (on) {
      p.rect(5, 6, 22, 12, C.sky2);
      p.rect(5, 14, 22, 4, C.leaf2);
      disc(p, 22, 9, 2, C.amber);
      p.rect(9, 9, 6, 2, C.white);
    }
    p.rect(1, 22, 30, 1, C.metal);
    p.rect(15, 23, 2, 1, C.ink2);
  },
  keyboard_display: (p) => {
    p.rect(0, 6, 16, 1, S.w);
    p.rect(0, 7, 16, 1, S.w2);
    p.rect(1, 1, 14, 5, C.ink2);
    for (let y = 2; y < 5; y++) for (let x = 2; x < 14; x += 2) p.px(x, y, (x + y) % 5 ? C.paper : C.pink);
    p.rect(5, 4, 5, 1, C.paper);
  },
  handheld_shelf: (p) => {
    p.rect(0, 6, 16, 1, S.w);
    p.rect(0, 7, 16, 1, S.w2);
    const shells = [C.metal, C.red, C.sky, C.leaf3];
    shells.forEach((c, i) => {
      const x = i * 4;
      p.rect(x, 1, 3, 5, c);
      p.rect(x + 1, 2, 1, 1, C.term);
      p.px(x + 1, 4, C.ink2);
    });
  },
  pinball: (p, { on }) => {
    // backbox
    box(p, 1, 0, 14, 8, S.a2, C.ink);
    p.rect(2, 1, 12, 6, on ? C.amber : S.a);
    text(p, 3, 1, 'WIN', on ? C.red : S.a3);
    // playfield and legs
    box(p, 0, 9, 16, 9, S.a, C.ink);
    p.rect(2, 10, 12, 7, on ? '#1e1b4b' : C.ink2);
    disc(p, 6, 13, 1, on ? C.pink : C.ink3);
    disc(p, 10, 12, 1, on ? C.sky : C.ink3);
    p.rect(5, 16, 2, 1, C.white);
    p.rect(9, 16, 2, 1, C.white);
    p.rect(1, 18, 1, 6, C.ink);
    p.rect(14, 18, 1, 6, C.ink);
    p.rect(0, 23, 3, 1, C.ink);
    p.rect(13, 23, 3, 1, C.ink);
  },
  claw_machine: (p, { on, night }) => {
    const lit = on || night;
    box(p, 0, 0, 16, 5, S.b, S.b2);
    text(p, 2, 0, 'TOYS', lit ? C.white : S.b3);
    box(p, 0, 5, 16, 15, lit ? '#e0f2fe' : C.sky, C.ink3);
    p.rect(7, 6, 1, 4, C.metal3);
    p.rect(5, 10, 5, 1, C.metal);
    p.px(5, 11, C.metal);
    p.px(9, 11, C.metal);
    const toys = [C.pink, C.amber, C.leaf3, C.white, C.purple, C.orange];
    toys.forEach((c, i) => disc(p, 3 + (i % 3) * 4.5, 16 + Math.floor(i / 3) * 2, 1.6, c));
    p.rect(0, 20, 16, 12, S.b);
    p.rect(2, 21, 5, 3, C.ink2);
    p.px(4, 22, C.red);
    p.rect(10, 22, 4, 3, C.ink);
    p.rect(0, 30, 16, 2, S.b2);
  },
  streaming_setup: (p, { on }) => {
    // ring light, screen with chat, mic arm, chair-height desk
    disc(p, 4, 5, 4.5, on ? C.white : C.metal);
    disc(p, 4, 5, 3, C.ink2);
    p.rect(4, 10, 1, 14, C.ink2);
    p.rect(2, 23, 5, 1, C.ink2);
    box(p, 10, 2, 14, 9, on ? '#1e1b4b' : C.screenOff, C.ink);
    if (on) {
      p.rect(11, 3, 8, 6, C.indigo2);
      for (let y = 3; y < 9; y += 2) p.rect(20, y, 3, 1, y % 4 ? C.pink : C.leaf3);
      p.px(12, 3, C.red);
    }
    p.rect(16, 11, 2, 2, C.metal3);
    p.rect(26, 3, 1, 6, C.ink2);
    p.rect(26, 3, 4, 1, C.ink2);
    p.rect(29, 4, 2, 3, C.ink);
    p.rect(8, 13, 24, 2, S.m);
    p.rect(8, 13, 24, 1, S.m3);
    p.rect(9, 15, 2, 9, S.m2);
    p.rect(29, 15, 2, 9, S.m2);
    p.rect(13, 12, 8, 1, C.ink3);
    p.rect(22, 11, 3, 2, S.a);
  },
  ring_light: (p, { on }) => {
    disc(p, 4, 4, 4, on ? C.white : C.metal);
    disc(p, 4, 4, 2.6, C.ink2);
    p.rect(3, 4, 2, 2, C.ink);
    p.rect(4, 8, 1, 14, C.ink2);
    p.px(1, 22, C.ink2);
    p.px(2, 21, C.ink2);
    p.px(6, 21, C.ink2);
    p.px(7, 22, C.ink2);
    p.rect(3, 22, 3, 1, C.ink2);
  },
  holo_globe: (p, { on }) => {
    if (on) {
      disc(p, 8, 6, 5.5, '#164e63');
      for (let y = 2; y < 11; y += 3) p.rect(4, y, 9, 1, C.sky);
      for (let x = 5; x < 12; x += 3) p.rect(x, 1, 1, 10, C.sky2);
      disc(p, 7, 5, 1.5, C.leaf3);
    } else {
      disc(p, 8, 6, 5, C.ink3);
      disc(p, 8, 6, 3.6, C.ink2);
    }
    p.rect(6, 12, 4, 1, C.metal3);
    box(p, 3, 13, 10, 3, S.m, S.m2);
    p.rect(5, 14, 6, 1, on ? C.sky : C.ink3);
  },
  drone_dock: (p, { on }) => {
    p.rect(0, 1, 3, 1, C.ink3);
    p.rect(5, 1, 3, 1, C.ink3);
    p.px(1, 2, C.ink2);
    p.px(6, 2, C.ink2);
    p.rect(1, 3, 6, 2, S.m);
    p.px(4, 4, on ? C.leaf3 : C.red);
    p.rect(0, 6, 8, 2, C.ink2);
    p.rect(1, 6, 6, 1, C.amber);
  },
  game_shelf: (p) => {
    p.rect(0, 0, 24, 16, S.w2);
    p.rect(1, 1, 22, 6, C.wood4);
    p.rect(1, 8, 22, 7, C.wood4);
    p.rect(1, 7, 22, 1, S.w);
    // game cases and a console
    const cases = [C.red, C.blue, C.leaf2, C.white, C.purple, C.amber, C.ink3, C.sky, C.pink];
    cases.forEach((c, i) => p.rect(2 + i * 2, 2, 2, 5, c));
    p.rect(2, 11, 8, 4, C.ink);
    p.px(8, 12, C.leaf3);
    p.rect(13, 12, 4, 3, C.white);
    p.rect(18, 10, 4, 5, C.ink2);
    p.px(19, 11, C.pink);
  },
};
