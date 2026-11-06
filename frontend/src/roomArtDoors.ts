// MY ROOM art pack: DOORS & WINDOWS: the way in and the view out. Doors and
// windows hang on the wall rows; windows show the hour and the weather
// (night, rain, snow) like the other windows. Also the things by the door:
// a bench, a mat, a key box, the intercom. Recolourable parts use S slots.
import { C, disc, S, type Art, type ArtEnv, type Painter } from './roomPaint';

/** A patch of sky that follows the hour and the CHRONOMETER weather. */
const view = (p: Painter, env: ArtEnv, x: number, y: number, w: number, h: number) => {
  p.rect(x, y, w, h, env.night ? C.night : '#bfe6ff');
  p.rect(x, y + Math.floor(h * 0.6), w, Math.ceil(h * 0.4), env.night ? C.night2 : '#dff3e0');
  if (env.night && !env.weather) for (let i = 0; i < 4; i++) p.px(x + ((i * 5 + 1) % w), y + ((i * 3 + 1) % Math.max(1, h - 3)), C.star);
  if (env.weather === 'rain') for (let i = 0; i < Math.floor((w * h) / 12); i++) p.rect(x + ((i * 5 + 1) % w), y + ((i * 7) % Math.max(1, h - 1)), 1, 2, C.sky);
  else if (env.weather === 'snow') for (let i = 0; i < Math.floor((w * h) / 10); i++) p.px(x + ((i * 5 + 2) % w), y + ((i * 9 + 1) % h), C.white);
};

export const DOORS_ART: Record<string, Art> = {
  door_wood: (p) => {
    p.rect(0, 0, 16, 32, S.w2);
    p.rect(1, 1, 14, 31, S.w);
    p.rect(3, 3, 10, 11, S.w3);
    p.rect(4, 4, 8, 9, S.w);
    p.rect(3, 17, 10, 12, S.w3);
    p.rect(4, 18, 8, 10, S.w);
    p.rect(12, 15, 2, 1, C.amber2);
    p.px(13, 16, C.amber2);
  },
  door_fusuma: (p) => {
    p.rect(0, 0, 24, 32, C.walnut);
    for (const x of [1, 12]) {
      p.rect(x, 1, 11, 30, '#efe6d2');
      for (let i = 0; i < 4; i++) p.px(x + 2 + i * 2, 12 - i, '#8fa98b');
      p.rect(x + 1, 22, 9, 1, '#d9cdb2');
      disc(p, x + 5, 5, 2, '#e8c252');
    }
    disc(p, 10, 17, 1, C.walnut2);
    disc(p, 14, 17, 1, C.walnut2);
    p.rect(11, 0, 2, 32, C.walnut2);
  },
  door_glass: (p, env) => {
    p.rect(0, 0, 16, 32, S.m);
    view(p, env, 2, 2, 12, 28);
    p.rect(7, 2, 2, 28, S.m);
    for (const y of [10, 20]) p.rect(2, y, 12, 1, S.m);
    p.rect(9, 16, 1, 3, C.metal);
  },
  window_small: (p, env) => {
    p.rect(0, 0, 16, 14, S.w);
    view(p, env, 2, 2, 12, 10);
    p.rect(7, 2, 2, 10, S.w);
    p.rect(0, 13, 16, 3, S.w2);
    p.rect(0, 13, 16, 1, S.w3);
  },
  window_tall: (p, env) => {
    p.rect(0, 0, 16, 32, S.w);
    view(p, env, 2, 2, 12, 28);
    p.rect(7, 2, 2, 28, S.w);
    for (const y of [9, 16, 23]) p.rect(2, y, 12, 1, S.w);
    p.rect(6, 17, 1, 2, C.amber2);
    p.rect(9, 17, 1, 2, C.amber2);
  },
  window_shoji: (p, env) => {
    p.rect(0, 0, 24, 16, C.walnut);
    p.rect(1, 1, 22, 14, env.night ? '#c9b98f' : '#f6f1e3');
    for (let x = 1; x < 23; x += 4) p.rect(x, 1, 1, 14, C.walnut3);
    for (let y = 1; y < 15; y += 4) p.rect(1, y, 22, 1, C.walnut3);
    p.rect(11, 0, 2, 16, C.walnut);
  },
  light_switch: (p, { on }) => {
    p.rect(2, 1, 4, 6, C.white);
    p.rect(2, 1, 4, 1, '#ffffff');
    p.rect(2, 6, 4, 1, C.paper2);
    p.rect(3, on ? 2 : 4, 2, 2, C.paper2);
  },
  intercom: (p) => {
    p.rect(1, 0, 6, 8, C.white);
    p.rect(2, 1, 4, 3, C.ink2);
    p.rect(2, 1, 4, 1, '#334155');
    for (let x = 2; x < 6; x += 2) p.px(x, 5, C.metal2);
    p.rect(2, 6, 4, 1, C.metal);
    p.px(5, 5, '#4ade80');
  },
  genkan_bench: (p) => {
    p.rect(0, 2, 16, 2, S.w3);
    p.rect(0, 3, 16, 1, S.w);
    p.rect(1, 4, 1, 4, S.w2);
    p.rect(14, 4, 1, 4, S.w2);
    p.rect(2, 6, 12, 1, S.w2);
    p.rect(3, 5, 4, 1, '#3f3f46');
    p.rect(9, 5, 4, 1, '#c2483b');
    p.rect(3, 1, 4, 1, C.ink3);
  },
  door_mat: (p) => {
    p.rect(0, 5, 16, 3, S.a);
    p.rect(0, 5, 16, 1, S.a3);
    for (let x = 1; x < 16; x += 2) p.px(x, 6, S.a2);
    p.rect(3, 6, 10, 1, S.a2);
  },
  shoe_bench: (p) => {
    p.rect(0, 4, 16, 2, S.w3);
    p.rect(0, 5, 16, 1, S.w);
    for (const y of [9, 13]) p.rect(1, y, 14, 1, S.w);
    p.rect(1, 6, 1, 10, S.w2);
    p.rect(14, 6, 1, 10, S.w2);
    const shoes = ['#f1f1f1', '#3f3f46', '#c2483b', '#d4a017'];
    shoes.forEach((c, i) => {
      p.rect(2 + (i % 2) * 6, 7 + Math.floor(i / 2) * 4, 5, 2, c);
      p.rect(2 + (i % 2) * 6, 8 + Math.floor(i / 2) * 4, 5, 1, C.ink3);
    });
    p.rect(3, 2, 4, 2, C.cork);
  },
  key_cabinet: (p) => {
    p.rect(1, 0, 6, 8, S.w);
    p.rect(1, 0, 6, 1, S.w3);
    p.rect(2, 1, 4, 6, S.w2);
    p.px(5, 4, C.amber2);
    p.rect(3, 2, 1, 3, C.amber);
  },
  radiator: (p) => {
    for (let x = 1; x < 23; x += 2) {
      p.rect(x, 1, 1, 6, S.m);
      p.rect(x + 1, 1, 1, 6, S.m2);
    }
    p.rect(0, 0, 24, 1, S.m3);
    p.rect(1, 2, 22, 1, S.m3);
    p.rect(1, 6, 22, 1, S.m2);
    p.rect(2, 7, 2, 1, S.m2);
    p.rect(20, 7, 2, 1, S.m2);
  },
  loft_ladder: (p) => {
    p.rect(1, 0, 1, 32, S.w2);
    p.rect(6, 0, 1, 32, S.w2);
    for (let y = 2; y < 32; y += 4) {
      p.rect(1, y, 6, 1, S.w);
      p.rect(1, y, 6, 1, S.w3);
    }
    p.rect(0, 0, 3, 1, C.metal2);
    p.rect(5, 0, 3, 1, C.metal2);
  },
  wall_phone: (p) => {
    p.rect(1, 1, 6, 12, S.a);
    p.rect(1, 1, 6, 1, S.a3);
    p.rect(1, 2, 2, 10, S.a2);
    p.rect(3, 4, 3, 4, C.white);
    for (let y = 5; y < 8; y++) p.px(4, y, C.ink3);
    p.rect(0, 13, 1, 1, C.ink3);
    for (let y = 13; y < 16; y++) p.px(1 + (y % 2), y, C.ink3);
  },
  window_round: (p, env) => {
    disc(p, 8, 8, 7.6, S.w);
    view(p, env, 3, 3, 10, 10);
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) if ((x + 0.5 - 8) ** 2 + (y + 0.5 - 8) ** 2 > 30) p.px(x, y, S.w);
    p.rect(7, 2, 2, 12, S.w);
    p.rect(2, 7, 12, 2, S.w);
  },
};
