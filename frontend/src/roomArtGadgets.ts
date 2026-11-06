// MY ROOM art pack: GADGETS: the machines a room collects. Consoles and a
// racing rig, a creator's corner (camera, softbox, green screen), hi-fi and
// radios, and the small boxes with status lights. Screens and machines
// light up while the stopwatch runs (`on`); recolourable parts use S slots.
import { box, C, disc, S, type Art, type Painter } from './roomPaint';

/** A screen of w x h at (x, y) with a frame, showing a scene while on. */
const screen = (p: Painter, x: number, y: number, w: number, h: number, on: boolean, frame: string, tint: string = C.screenOn) => {
  box(p, x, y, w, h, on ? tint : C.screenOff, frame);
  if (on) {
    p.rect(x + 2, y + 2, Math.max(1, w - 5), 1, C.leaf3);
    if (h > 5) p.rect(x + 2, y + h - 3, Math.max(1, w - 7), 1, C.sky);
  }
};

const LED = (on: boolean) => (on ? C.leaf3 : C.leaf2);

export const GADGETS_ART: Record<string, Art> = {
  console_setup: (p, { on }) => {
    screen(p, 4, 0, 16, 9, on, C.ink, '#1e3a8a');
    if (on) {
      p.rect(6, 6, 12, 1, '#22c55e');
      p.rect(9, 4, 2, 2, '#ef4444');
      p.rect(14, 3, 2, 3, '#fde047');
    }
    p.rect(11, 9, 2, 1, C.ink2);
    p.rect(0, 10, 24, 1, S.w3);
    p.rect(0, 11, 24, 5, S.w);
    p.rect(2, 12, 7, 2, C.white);
    p.px(3, 12, LED(on));
    p.rect(15, 12, 3, 2, C.ink3);
    p.rect(19, 12, 3, 2, '#ef4444');
    p.rect(0, 15, 24, 1, S.w2);
  },
  handheld_dock: (p, { on }) => {
    p.rect(0, 2, 1, 4, '#ef4444');
    p.rect(7, 2, 1, 4, '#3b82f6');
    box(p, 1, 2, 6, 4, on ? C.screenOn : C.screenOff, C.ink);
    if (on) p.rect(2, 3, 3, 1, C.leaf3);
    p.rect(1, 5, 6, 3, C.ink2);
    p.px(6, 7, LED(true));
  },
  racing_rig: (p, { on }) => {
    screen(p, 18, 0, 14, 9, on, C.ink, '#334155');
    if (on) {
      p.rect(19, 6, 12, 2, '#52525b');
      p.rect(24, 4, 2, 4, '#fde047');
    }
    p.rect(24, 9, 2, 6, C.ink3);
    // seat
    p.rect(1, 6, 5, 11, S.a);
    p.rect(1, 6, 5, 1, S.a3);
    p.rect(2, 8, 3, 3, S.a2);
    p.rect(4, 15, 9, 3, S.a);
    p.rect(4, 15, 9, 1, S.a3);
    // wheel and pedals
    p.rect(14, 12, 2, 6, C.ink3);
    disc(p, 15, 11, 2.5, C.ink2);
    disc(p, 15, 11, 1.2, C.ink3);
    p.rect(20, 19, 4, 2, C.metal2);
    // frame
    p.rect(0, 18, 32, 2, C.ink3);
    p.rect(0, 18, 32, 1, C.metal3);
    p.rect(1, 20, 2, 4, C.ink3);
    p.rect(29, 20, 2, 4, C.ink3);
  },
  desk_triple: (p, { on }) => {
    screen(p, 0, 1, 10, 7, on, C.ink);
    screen(p, 11, 0, 10, 8, on, C.ink);
    screen(p, 22, 1, 10, 7, on, C.ink);
    p.rect(15, 8, 2, 1, C.ink2);
    p.rect(10, 9, 12, 1, C.ink3);
    p.rect(3, 9, 4, 1, C.ink3);
    p.rect(0, 10, 32, 2, S.w3);
    p.rect(0, 11, 32, 1, S.w);
    p.rect(1, 12, 2, 4, S.w2);
    p.rect(29, 12, 2, 4, S.w2);
    p.rect(24, 12, 5, 4, C.ink3);
    p.px(25, 13, LED(on));
  },
  laptop_stand_floor: (p, { on }) => {
    box(p, 1, 0, 6, 4, on ? C.screenOn : C.screenOff, C.ink3);
    if (on) p.rect(2, 1, 3, 1, C.leaf3);
    p.rect(0, 4, 8, 1, C.metal);
    p.rect(0, 5, 8, 1, S.m);
    p.rect(3, 6, 2, 8, S.m2);
    p.rect(1, 14, 6, 1, S.m);
    p.px(1, 15, C.ink2);
    p.px(6, 15, C.ink2);
  },
  gaming_pc_glass: (p, { on }) => {
    p.rect(0, 0, 8, 16, S.m);
    p.rect(1, 1, 5, 14, on ? '#1e1b4b' : C.ink2);
    if (on) {
      disc(p, 3.5, 3.5, 1.5, '#c084fc');
      disc(p, 3.5, 8.5, 1.5, '#22d3ee');
      p.rect(1, 12, 5, 1, '#f472b6');
    } else {
      disc(p, 3.5, 3.5, 1.5, C.ink3);
      disc(p, 3.5, 8.5, 1.5, C.ink3);
    }
    p.rect(2, 5, 3, 1, C.metal3);
    p.rect(6, 1, 1, 14, S.m3);
    p.rect(0, 15, 8, 1, S.m2);
  },
  home_server: (p, { on }) => {
    p.rect(0, 0, 8, 16, S.m);
    p.rect(0, 0, 8, 1, S.m3);
    for (let y = 2; y < 15; y += 3) {
      p.rect(1, y, 6, 2, S.m2);
      p.px(5, y, (y + (on ? 1 : 0)) % 2 ? C.leaf3 : C.amber);
      p.px(6, y, C.leaf3);
    }
  },
  smart_display: (p) => {
    p.rect(0, 1, 8, 6, S.m);
    box(p, 1, 1, 6, 5, '#1e293b', S.m);
    p.rect(2, 2, 1, 2, '#fde68a');
    p.rect(4, 2, 1, 2, '#fde68a');
    p.px(3, 3, '#fde68a');
    p.rect(2, 4, 4, 1, C.sky);
    p.rect(1, 7, 6, 1, S.m2);
  },
  hifi_stack: (p, { on }) => {
    p.rect(0, 0, 16, 24, S.w);
    p.rect(0, 0, 16, 1, S.w3);
    for (const y of [2, 9, 16]) {
      p.rect(1, y, 14, 6, C.ink2);
      p.rect(1, y, 14, 1, C.metal3);
    }
    // VU meters, a tape deck, knobs
    for (const x of [2, 9]) {
      p.rect(x, 3, 5, 3, on ? '#fbbf24' : '#78350f');
      p.px(x + 2 + (on ? 1 : 0), 4, C.ink);
    }
    p.rect(2, 10, 5, 3, C.ink);
    p.rect(9, 10, 5, 3, C.ink);
    p.rect(3, 11, 3, 1, C.metal2);
    p.rect(10, 11, 3, 1, C.metal2);
    for (let x = 3; x < 14; x += 3) disc(p, x, 19, 1, C.metal);
    p.rect(2, 21, 8, 1, on ? '#38bdf8' : C.ink3);
    p.rect(1, 23, 2, 1, S.w2);
    p.rect(13, 23, 2, 1, S.w2);
  },
  radio_retro: (p) => {
    p.rect(3, 0, 2, 1, C.metal);
    p.rect(1, 1, 6, 1, S.w2);
    p.rect(0, 2, 8, 6, S.w);
    p.rect(0, 2, 8, 1, S.w3);
    for (let y = 3; y < 7; y++) p.rect(1, y, 3, 1, y % 2 ? C.paper : C.paper2);
    p.rect(5, 3, 2, 2, '#fde68a');
    disc(p, 5.5, 6, 0.8, C.ink3);
  },
  clock_radio: (p, { on }) => {
    p.rect(0, 2, 8, 6, S.m);
    p.rect(0, 2, 8, 1, S.m3);
    p.rect(1, 3, 6, 3, C.ink);
    for (const x of [1, 3, 5]) p.rect(x, 4, 1, 2, '#f43f5e');
    p.px(2, 4, '#f43f5e');
    p.rect(1, 6, 6, 1, S.m2);
    if (on) p.px(6, 3, '#fde68a');
  },
  camera_tripod: (p, { on }) => {
    p.rect(1, 1, 6, 4, S.m);
    p.rect(1, 1, 6, 1, S.m3);
    disc(p, 3, 3, 1.4, C.ink);
    p.px(3, 3, '#60a5fa');
    p.px(6, 2, on ? '#ef4444' : '#7f1d1d');
    p.rect(5, 0, 2, 1, S.m2);
    p.rect(3, 5, 2, 3, S.m2);
    p.rect(3, 8, 2, 4, S.m);
    for (let i = 0; i < 12; i++) {
      p.px(3 - Math.floor(i / 4), 12 + i, S.m2);
      p.px(4 + Math.floor(i / 4), 12 + i, S.m2);
      if (i % 2 === 0) p.px(3 + (i % 4 ? 1 : 0), 12 + i, S.m2);
    }
  },
  softbox_light: (p, { on }) => {
    p.rect(0, 0, 8, 1, S.m);
    p.rect(0, 1, 8, 8, S.m);
    p.rect(1, 1, 6, 7, on ? '#ffffff' : C.paper2);
    if (on) p.rect(2, 2, 4, 5, '#fefce8');
    p.rect(3, 9, 2, 1, S.m2);
    p.rect(3, 10, 2, 9, S.m2);
    for (let i = 0; i < 5; i++) {
      p.px(3 - Math.floor(i / 2), 19 + i, S.m);
      p.px(4 + Math.floor(i / 2), 19 + i, S.m);
    }
  },
  green_screen: (p) => {
    p.rect(0, 0, 24, 1, C.ink3);
    p.rect(1, 1, 22, 19, '#16a34a');
    p.rect(1, 1, 22, 1, '#22c55e');
    for (let x = 4; x < 22; x += 6) p.rect(x, 2, 1, 17, '#15803d');
    p.rect(1, 20, 22, 1, '#15803d');
    p.rect(0, 0, 1, 24, C.ink3);
    p.rect(23, 0, 1, 24, C.ink3);
    p.rect(0, 23, 3, 1, C.ink3);
    p.rect(21, 23, 3, 1, C.ink3);
  },
  podcast_desk: (p, { on }) => {
    // an ON AIR light, two mics on arms, a mixer
    p.rect(9, 0, 7, 3, on ? '#ef4444' : '#7f1d1d');
    p.rect(10, 1, 5, 1, on ? '#fecaca' : '#991b1b');
    for (const x of [3, 19]) {
      p.rect(x, 3, 2, 3, C.ink2);
      p.rect(x, 3, 2, 1, C.metal);
      p.rect(x + 1, 6, 1, 3, C.metal2);
    }
    p.rect(9, 6, 7, 3, C.ink3);
    for (let x = 10; x < 16; x += 2) p.px(x, 7, on ? C.leaf3 : C.metal);
    p.rect(0, 9, 24, 2, S.w3);
    p.rect(0, 10, 24, 1, S.w);
    p.rect(1, 11, 2, 5, S.w2);
    p.rect(21, 11, 2, 5, S.w2);
  },
  rc_car: (p) => {
    p.rect(1, 3, 6, 2, S.a);
    p.rect(2, 2, 3, 1, S.a3);
    p.rect(3, 2, 2, 1, '#bae6fd');
    p.rect(0, 4, 8, 1, S.a2);
    p.rect(6, 1, 1, 2, C.ink3);
    disc(p, 1.5, 6, 1.4, C.ink);
    disc(p, 6, 6, 1.4, C.ink);
  },
  robot_dog: (p, { on }) => {
    p.rect(5, 1, 3, 3, S.m);
    p.px(7, 2, on ? '#7dd3fc' : '#38bdf8');
    p.rect(1, 3, 6, 3, S.m);
    p.rect(1, 3, 6, 1, S.m3);
    p.px(0, 3, S.m2);
    for (const x of [1, 3, 5]) p.rect(x, 6, 1, 2, S.m2);
    p.rect(2, 4, 3, 1, C.ink3);
  },
  air_fryer: (p, { on }) => {
    p.rect(1, 0, 6, 2, S.m);
    p.rect(1, 0, 6, 1, S.m3);
    p.rect(2, 1, 3, 1, on ? '#fb923c' : C.ink3);
    p.rect(0, 2, 8, 6, S.m);
    p.rect(1, 4, 6, 3, S.m2);
    p.rect(3, 5, 2, 1, C.metal);
    p.rect(0, 7, 8, 1, C.ink3);
  },
  charging_station: (p, { on }) => {
    p.rect(1, 1, 2, 4, C.ink2);
    p.rect(1, 1, 2, 1, C.ink3);
    p.rect(4, 2, 3, 3, C.ink2);
    p.px(5, 3, on ? '#93c5fd' : C.ink3);
    p.rect(0, 5, 8, 3, S.w);
    p.rect(0, 5, 8, 1, S.w3);
    p.px(6, 6, '#4ade80');
  },
  ups_battery: (p) => {
    p.rect(1, 0, 6, 8, C.ink2);
    p.rect(1, 0, 6, 1, C.ink3);
    p.rect(2, 2, 4, 2, C.ink);
    p.rect(2, 2, 3, 1, '#4ade80');
    p.px(5, 5, '#4ade80');
    p.rect(2, 6, 2, 1, C.metal3);
  },
  projector_mount: (p, { on }) => {
    p.rect(7, 0, 2, 3, C.ink3);
    p.rect(1, 3, 14, 4, S.m);
    p.rect(1, 3, 14, 1, S.m3);
    disc(p, 4, 5, 1.6, C.ink2);
    p.px(4, 5, on ? '#e0f2fe' : C.ink3);
    p.rect(9, 5, 4, 1, S.m2);
    p.px(13, 4, on ? C.leaf3 : C.ink3);
  },
  speaker_wall: (p) => {
    p.rect(1, 0, 6, 8, S.m);
    p.rect(1, 0, 6, 1, S.m3);
    disc(p, 4, 2.5, 1, C.ink2);
    disc(p, 4, 5.5, 1.8, C.ink2);
  },
  wall_dashboard: (p) => {
    box(p, 0, 0, 16, 8, '#0f172a', S.m);
    p.rect(2, 2, 2, 3, '#fde68a');
    p.rect(5, 2, 2, 3, '#fde68a');
    p.rect(9, 2, 5, 1, C.sky);
    p.rect(9, 4, 3, 1, '#4ade80');
    p.rect(2, 6, 12, 1, '#1e293b');
    p.rect(2, 6, 7, 1, '#38bdf8');
  },
  dehumidifier: (p) => {
    p.rect(0, 1, 8, 15, S.m);
    p.rect(0, 1, 8, 1, S.m3);
    for (let y = 3; y < 8; y++) p.rect(1, y, 6, 1, y % 2 ? S.m2 : S.m);
    p.rect(2, 9, 4, 1, '#38bdf8');
    p.rect(1, 11, 6, 4, '#bae6fd');
    p.rect(1, 13, 6, 2, '#7dd3fc');
    p.rect(0, 15, 8, 1, S.m2);
  },
  foot_massager: (p) => {
    p.rect(0, 3, 8, 5, S.m);
    p.rect(0, 3, 8, 1, S.m3);
    p.rect(1, 4, 2, 3, C.ink3);
    p.rect(5, 4, 2, 3, C.ink3);
    p.px(4, 5, '#60a5fa');
  },
  arcade_mini: (p, { on }) => {
    p.rect(0, 0, 8, 2, S.a);
    p.rect(1, 1, 6, 1, on ? '#fde047' : S.a2);
    p.rect(0, 2, 8, 6, S.a2);
    box(p, 1, 2, 6, 5, on ? '#4c1d95' : C.screenOff, C.ink);
    if (on) {
      p.px(3, 4, '#f472b6');
      p.px(5, 3, '#fde047');
    }
    p.rect(0, 8, 8, 2, C.ink3);
    p.px(2, 8, '#ef4444');
    p.px(5, 8, '#3b82f6');
    p.rect(1, 10, 6, 6, S.a);
    p.rect(1, 10, 6, 1, S.a3);
    p.rect(3, 12, 2, 2, C.ink3);
  },
  crt_stack: (p, { on }) => {
    const tv = (x: number, y: number, w: number, h: number, tint: string) => {
      p.rect(x, y, w, h, C.metal3);
      p.rect(x, y, w, 1, C.metal2);
      box(p, x + 1, y + 1, w - 4, h - 2, on ? tint : C.screenOff, C.ink);
      p.rect(x + w - 2, y + 2, 1, 1, C.metal);
      p.rect(x + w - 2, y + 4, 1, 1, C.metal);
    };
    tv(0, 12, 16, 12, '#1e3a8a');
    tv(1, 3, 9, 9, '#14532d');
    tv(10, 5, 6, 7, '#7c2d12');
    p.rect(4, 1, 1, 2, C.metal2);
    p.rect(6, 0, 1, 3, C.metal2);
  },
  vcr_shelf: (p, { on }) => {
    p.rect(0, 0, 16, 16, S.w);
    p.rect(1, 1, 14, 6, S.w2);
    p.rect(1, 9, 14, 6, S.w2);
    p.rect(1, 3, 14, 4, C.ink2);
    p.rect(3, 4, 6, 1, C.ink);
    p.rect(11, 4, 3, 1, on ? '#22d3ee' : C.ink3);
    for (let x = 1; x < 15; x += 2) p.rect(x, 10, 2, 5, x % 4 === 1 ? C.ink3 : C.ink2);
    for (let x = 1; x < 15; x += 2) p.px(x, 11, C.white);
  },
  ham_radio: (p, { on }) => {
    p.rect(9, 0, 1, 4, C.metal);
    p.rect(0, 4, 16, 6, S.m);
    p.rect(0, 4, 16, 1, S.m3);
    p.rect(1, 5, 6, 3, on ? '#fbbf24' : '#78350f');
    p.rect(2, 6, 4, 1, C.ink);
    for (let x = 9; x < 15; x += 2) disc(p, x, 7, 0.9, C.metal);
    p.rect(0, 10, 16, 6, S.m2);
    p.rect(2, 11, 3, 3, C.ink2);
    p.rect(3, 11, 1, 1, C.metal);
    p.rect(8, 12, 6, 2, C.ink2);
    p.rect(0, 15, 16, 1, C.ink3);
  },
  weather_station: (p) => {
    box(p, 0, 0, 8, 8, '#e0f2fe', S.m);
    disc(p, 3, 3, 1.5, '#fbbf24');
    p.rect(3, 3, 3, 2, C.white);
    p.rect(1, 6, 6, 1, '#0284c7');
  },
  digital_frame: (p) => {
    p.rect(0, 0, 8, 8, S.w);
    p.rect(1, 1, 6, 5, '#7dd3fc');
    p.rect(1, 4, 6, 2, '#16a34a');
    disc(p, 5, 2.5, 1, '#fde68a');
    p.rect(1, 6, 6, 1, S.w2);
  },
  racing_chair: (p) => {
    p.rect(1, 0, 6, 9, S.a);
    p.rect(1, 0, 6, 1, S.a3);
    p.rect(3, 1, 2, 2, C.ink2);
    p.rect(1, 3, 1, 6, C.ink2);
    p.rect(6, 3, 1, 6, C.ink2);
    p.rect(2, 4, 4, 1, C.white);
    p.rect(0, 9, 8, 2, S.a2);
    p.rect(0, 9, 8, 1, S.a);
    p.rect(3, 11, 2, 2, C.metal2);
    p.rect(0, 13, 8, 1, C.ink3);
    p.px(0, 14, C.ink2);
    p.px(4, 14, C.ink2);
    p.px(7, 14, C.ink2);
    p.rect(0, 15, 2, 1, C.ink2);
    p.rect(6, 15, 2, 1, C.ink2);
  },
  light_bar_wall: (p, { on }) => {
    p.rect(0, 3, 24, 2, C.ink3);
    p.rect(1, 3, 22, 1, on ? S.a3 : S.a2);
    if (on) p.rect(3, 3, 18, 1, '#ffffff');
    p.rect(1, 4, 22, 1, on ? S.a : S.a2);
    p.px(0, 5, C.ink3);
    p.px(23, 5, C.ink3);
  },
  controller_wall: (p) => {
    p.rect(0, 0, 16, 1, C.wood2);
    const pad = (x: number, c: string, c2: string) => {
      p.px(x + 3, 1, C.metal2);
      p.rect(x, 2, 7, 3, c);
      p.rect(x + 1, 5, 2, 1, c);
      p.rect(x + 4, 5, 2, 1, c);
      p.px(x + 1, 3, c2);
      p.px(x + 5, 3, '#ef4444');
      p.px(x + 4, 2, '#22c55e');
    };
    pad(0, C.ink2, C.metal);
    pad(8, C.white, C.ink3);
  },
  external_drives: (p, { on }) => {
    for (let i = 0; i < 3; i++) {
      const y = 2 + i * 2;
      p.rect(0, y, 7 - (i % 2), 2, [C.ink2, C.metal3, C.ink3][i]);
      p.px(5 - (i % 2), y, on || i === 0 ? '#60a5fa' : C.ink);
    }
  },
  headphone_wall: (p) => {
    p.rect(0, 0, 16, 2, S.w);
    p.rect(0, 0, 16, 1, S.w3);
    for (const [x, c] of [
      [1, C.ink2],
      [9, '#f1f1f1'],
    ] as const) {
      p.rect(x + 2, 2, 1, 1, C.metal2);
      p.rect(x, 3, 6, 1, c);
      p.rect(x, 4, 1, 2, c);
      p.rect(x + 5, 4, 1, 2, c);
      p.rect(x, 5, 2, 3, x === 1 ? C.ink3 : '#d4d4d4');
      p.rect(x + 4, 5, 2, 3, x === 1 ? C.ink3 : '#d4d4d4');
    }
  },
  fitness_mirror: (p, { on }) => {
    p.rect(0, 0, 8, 22, S.m);
    p.rect(1, 1, 6, 20, on ? '#1e293b' : '#cfe8f3');
    if (on) {
      p.rect(3, 4, 2, 2, '#fde68a');
      p.rect(3, 6, 2, 5, '#38bdf8');
      p.px(2, 7, '#38bdf8');
      p.px(5, 7, '#38bdf8');
      p.rect(3, 11, 1, 4, '#38bdf8');
      p.rect(4, 11, 1, 4, '#38bdf8');
      p.rect(2, 17, 4, 1, '#4ade80');
    } else {
      p.rect(2, 2, 1, 6, C.white);
    }
    p.rect(1, 22, 6, 2, S.m2);
  },
  e_scooter: (p) => {
    p.rect(6, 0, 2, 1, C.ink3);
    for (let i = 0; i < 12; i++) p.px(6 - Math.floor(i / 4), 1 + i, S.m);
    p.rect(1, 13, 7, 1, S.m);
    p.rect(1, 12, 6, 1, S.m2);
    disc(p, 2, 14.5, 1.4, C.ink);
    disc(p, 6.5, 14.5, 1.4, C.ink);
  },
  bluetooth_speaker: (p) => {
    p.rect(1, 3, 6, 5, S.a);
    p.rect(1, 3, 6, 1, S.a3);
    for (let y = 4; y < 7; y++) for (let x = 2; x < 6; x += 2) p.px(x + (y % 2), y, S.a2);
    p.rect(0, 4, 1, 3, C.ink3);
    p.rect(7, 4, 1, 3, C.ink3);
  },
  karaoke_machine: (p, { on }) => {
    p.rect(1, 0, 1, 4, C.ink3);
    p.rect(0, 0, 3, 2, C.ink2);
    p.rect(0, 4, 8, 12, S.m);
    p.rect(0, 4, 8, 1, S.m3);
    p.rect(1, 5, 6, 2, on ? '#f0abfc' : C.ink3);
    disc(p, 4, 11, 2.6, C.ink2);
    if (on) {
      p.px(2, 9, '#22d3ee');
      p.px(6, 13, '#fde047');
      p.px(5, 9, '#f472b6');
    }
    disc(p, 4, 11, 1, C.metal3);
    p.rect(0, 15, 8, 1, C.ink3);
  },
};
