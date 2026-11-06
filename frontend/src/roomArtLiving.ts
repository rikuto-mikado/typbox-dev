// MY ROOM art pack: pieces that live with the room. Windows look out on the
// real hour and weather, curtains, a bathroom and bedroom, rugs, pets that
// settle down at night, and the trophies study earns.
import { C, disc, S, type Art, type ArtEnv, type Painter } from './roomPaint';

/** Sky shared by the view windows: time of day and rain or snow. */
const sky = (p: Painter, env: ArtEnv, x: number, y: number, w: number, h: number, day: string, day2: string) => {
  p.rect(x, y, w, h, env.night ? C.night : day);
  p.rect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2), env.night ? C.night2 : day2);
  if (env.night && !env.weather) {
    for (let i = 0; i < 7; i++) p.px(x + ((i * 7 + 2) % w), y + ((i * 5 + 1) % Math.max(1, h - 4)), C.star);
  }
};

/** Rain or snow falling over a view, drawn last. */
const weatherOver = (p: Painter, env: ArtEnv, x: number, y: number, w: number, h: number) => {
  if (env.weather === 'rain') {
    for (let i = 0; i < 12; i++) {
      const px = x + ((i * 5 + 1) % w);
      const py = y + ((i * 7) % Math.max(1, h - 2));
      p.rect(px, py, 1, 2, C.sky);
    }
  } else if (env.weather === 'snow') {
    for (let i = 0; i < 14; i++) p.px(x + ((i * 5 + 2) % w), y + ((i * 9 + 1) % h), C.white);
  }
};

const frame = (p: Painter, w: number, h: number) => {
  p.rect(0, 0, w, 2, S.w2);
  p.rect(0, h - 3, w, 3, S.w2);
  p.rect(0, 0, 2, h, S.w2);
  p.rect(w - 2, 0, 2, h, S.w2);
  p.rect(0, 0, w, 1, S.w3);
  p.rect(0, h - 3, w, 1, S.w3);
  p.rect(Math.floor(w / 2), 2, 1, h - 5, S.w2);
  p.rect(2, Math.floor(h / 2) - 1, w - 4, 1, S.w2);
};

const curtain = (p: Painter, env: ArtEnv, a: string, a2: string, a3: string) => {
  p.rect(0, 0, 8, 2, C.ink3);
  p.px(0, 0, C.amber2);
  p.px(7, 0, C.amber2);
  for (let x = 0; x < 8; x += 2) {
    p.rect(x, 2, 1, 27, a);
    p.rect(x + 1, 2, 1, 27, a2);
  }
  p.rect(0, 2, 1, 27, a3);
  p.rect(1, 18, 6, 2, env.night ? a2 : a3);
  for (let x = 0; x < 8; x += 2) p.px(x, 29, a2);
};

export const LIVING_ART: Record<string, Art> = {
  // --------------------------------------------------------------- windows
  win_city: (p, env) => {
    sky(p, env, 2, 2, 20, 19, '#bfe6ff', '#fde2c4');
    const lit = env.night || env.on;
    for (const [x, w, top] of [[2, 4, 12], [6, 5, 8], [11, 3, 13], [14, 5, 6], [19, 3, 11]]) {
      p.rect(x, top, w, 21 - top, env.night ? C.ink2 : C.metal3);
      for (let wy = top + 1; wy < 20; wy += 2) {
        for (let wx = x + 1; wx < x + w - 1; wx += 2) p.px(wx, wy, lit && (wx + wy) % 3 ? C.amber : C.ink3);
      }
    }
    weatherOver(p, env, 2, 2, 20, 19);
    frame(p, 24, 24);
  },
  win_forest: (p, env) => {
    sky(p, env, 2, 2, 20, 19, '#b9e8ff', '#d9f5d0');
    for (const [x, top, c] of [[4, 8, C.leaf2], [10, 5, C.moss], [16, 9, C.leaf2], [20, 6, C.moss]] as const) {
      p.rect(x - 1, top + 9, 2, 21 - top - 9, C.wood2);
      for (let i = 0; i < 9; i++) p.rect(x - 1 - Math.floor(i / 2), top + i, 2 + i - (i % 2), 1, env.night ? C.ink3 : c);
    }
    p.rect(2, 19, 20, 2, env.night ? C.ink3 : C.moss2);
    weatherOver(p, env, 2, 2, 20, 19);
    frame(p, 24, 24);
  },
  win_sea: (p, env) => {
    sky(p, env, 2, 2, 20, 10, '#9fd8ff', '#ffe6c2');
    if (env.night) disc(p, 17, 6, 2.5, C.paper);
    else disc(p, 17, 8, 3, C.amber);
    p.rect(2, 12, 20, 9, env.night ? C.navy : C.sky2);
    for (let y = 13; y < 21; y += 2) {
      for (let x = 2 + (y % 4); x < 22; x += 6) p.rect(x, y, 3, 1, env.night ? C.navy2 : C.sky);
    }
    p.rect(5, 10, 1, 2, C.white);
    p.rect(3, 12, 5, 1, C.white);
    weatherOver(p, env, 2, 2, 20, 19);
    frame(p, 24, 24);
  },
  win_peak: (p, env) => {
    sky(p, env, 2, 2, 20, 19, '#a5d8ff', '#dff1ff');
    for (let i = 0; i < 11; i++) p.rect(11 - i, 8 + i, 2 + i * 2, 1, env.night ? C.ink3 : C.metal2);
    for (let i = 0; i < 4; i++) p.rect(11 - i, 8 + i, 2 + i * 2, 1, C.white);
    p.rect(2, 19, 20, 2, env.night ? C.ink2 : C.leaf2);
    weatherOver(p, env, 2, 2, 20, 19);
    frame(p, 24, 24);
  },
  win_arched: (p, env) => {
    p.rect(4, 0, 8, 1, S.w3);
    p.rect(2, 1, 12, 2, S.w2);
    p.rect(1, 3, 14, 21, S.w2);
    sky(p, env, 3, 3, 10, 18, '#c6ebff', '#fff0cc');
    p.rect(7, 3, 2, 18, S.w2);
    p.rect(3, 11, 10, 1, S.w2);
    p.rect(3, 19, 10, 2, env.night ? C.ink3 : C.leaf2);
    weatherOver(p, env, 3, 3, 10, 16);
    p.rect(0, 21, 16, 3, S.w);
    p.rect(0, 21, 16, 1, S.w3);
  },
  // -------------------------------------------------------------- curtains
  curtain_linen: (p, env) => curtain(p, env, C.paper, C.paper2, C.white),
  curtain_velvet: (p, env) => curtain(p, env, S.b, S.b2, S.b3),
  curtain_sheer: (p, env) => curtain(p, env, S.a3, S.a, C.white),
  blinds_slat: (p, env) => {
    p.rect(0, 0, 16, 2, S.m2);
    for (let y = 2; y < 15; y += 2) {
      p.rect(1, y, 14, 1, env.night ? S.m : C.paper);
      p.rect(1, y + 1, 14, 1, env.night ? C.ink2 : C.sky);
    }
    p.rect(1, 15, 14, 1, S.m2);
    p.rect(13, 2, 1, 11, C.ink3);
    p.px(13, 13, S.m3);
  },
  washing_machine: (p, env) => {
    p.rect(0, 0, 16, 15, C.fridge);
    p.rect(0, 0, 16, 1, C.white);
    p.rect(0, 4, 16, 1, C.fridge2);
    p.rect(2, 2, 5, 1, C.ink3);
    p.rect(10, 1, 3, 3, C.metal3);
    p.px(14, 2, env.on ? C.leaf3 : C.metal2);
    disc(p, 8, 10, 4.5, C.metal3);
    disc(p, 8, 10, 3.5, env.on ? C.sky2 : C.ink3);
    p.rect(6, 8, 2, 1, C.white);
    p.rect(1, 15, 3, 1, C.ink3);
    p.rect(12, 15, 3, 1, C.ink3);
  },
  // -------------------------------------------------------------- bedroom
  bed_platform: (p) => {
    p.rect(0, 2, 32, 7, S.w2);
    p.rect(1, 3, 30, 5, S.w);
    for (const x of [8, 16, 24]) p.rect(x, 3, 1, 5, S.w2);
    p.rect(1, 8, 30, 4, C.white);
    p.rect(2, 5, 7, 4, C.paper);
    p.rect(2, 5, 7, 1, C.white);
    p.rect(11, 5, 7, 4, S.a3);
    p.rect(11, 5, 7, 1, C.white);
    p.rect(20, 7, 11, 5, S.a);
    p.rect(20, 7, 11, 1, S.a3);
    p.rect(0, 12, 32, 3, S.w);
    p.rect(0, 12, 32, 1, S.w3);
    p.rect(2, 15, 28, 1, C.ink2);
  },
  bed_round: (p) => {
    p.rect(9, 0, 14, 1, S.b2);
    p.rect(5, 1, 22, 2, S.b2);
    p.rect(2, 3, 28, 7, S.b);
    p.rect(4, 3, 24, 1, S.b3);
    p.rect(0, 9, 32, 4, C.white);
    p.rect(2, 8, 28, 1, C.paper);
    p.rect(8, 5, 7, 4, C.white);
    p.rect(17, 5, 7, 4, S.a3);
    p.rect(2, 13, 28, 1, C.paper2);
    p.rect(4, 14, 24, 2, S.b2);
  },
  vanity_table: (p) => {
    // tri-fold mirror
    p.rect(3, 1, 3, 11, S.w2);
    p.rect(6, 0, 12, 12, S.w2);
    p.rect(18, 1, 3, 11, S.w2);
    p.rect(4, 2, 1, 9, C.sky);
    p.rect(7, 1, 10, 10, C.sky);
    p.rect(19, 2, 1, 9, C.sky);
    p.rect(9, 2, 2, 6, C.white);
    // top with bottles
    p.rect(9, 11, 1, 1, C.pink);
    p.rect(14, 10, 2, 2, C.amber);
    p.rect(0, 12, 24, 2, S.w);
    p.rect(0, 12, 24, 1, S.w3);
    // drawers and legs
    p.rect(1, 14, 6, 5, S.w2);
    p.rect(17, 14, 6, 5, S.w2);
    p.px(4, 16, C.amber2);
    p.px(20, 16, C.amber2);
    p.rect(1, 19, 2, 5, S.w2);
    p.rect(21, 19, 2, 5, S.w2);
  },
  swing_chair: (p) => {
    p.rect(2, 0, 12, 1, C.wood2);
    p.rect(4, 1, 1, 12, C.oak3);
    p.rect(11, 1, 1, 12, C.oak3);
    p.rect(3, 12, 10, 1, C.oak);
    p.rect(3, 13, 10, 8, S.a);
    p.rect(3, 13, 10, 1, S.a3);
    for (const x of [5, 8, 11]) p.rect(x, 14, 1, 7, S.a2);
    p.rect(2, 21, 12, 3, C.oak);
    p.rect(2, 21, 12, 1, S.w3);
    p.rect(5, 19, 4, 3, S.b);
  },
  // ----------------------------------------------------------------- rugs
  rug_persian: (p) => {
    p.rect(1, 3, 30, 5, S.b2);
    p.rect(2, 4, 28, 3, S.b);
    p.rect(3, 4, 26, 3, S.a2);
    for (let x = 5; x < 28; x += 5) {
      p.px(x, 5, C.amber);
      p.px(x + 1, 4, S.b3);
      p.px(x + 1, 6, S.b3);
    }
    for (let x = 0; x < 32; x += 2) {
      p.px(x, 3, C.paper);
      p.px(x, 7, C.paper);
    }
  },
  rug_round: (p) => {
    p.rect(5, 3, 14, 1, S.a2);
    p.rect(2, 4, 20, 1, S.a);
    p.rect(0, 5, 24, 1, S.a2);
    p.rect(2, 6, 20, 1, S.a);
    p.rect(5, 7, 14, 1, S.a2);
    p.rect(8, 5, 8, 1, C.white);
    p.rect(10, 4, 4, 1, S.a3);
    p.rect(10, 6, 4, 1, S.a3);
  },
  rug_tatami: (p) => {
    p.rect(0, 3, 32, 5, C.oak);
    for (let y = 3; y < 8; y++) if (y % 2) p.rect(0, y, 32, 1, C.oak2);
    p.rect(0, 3, 2, 5, C.moss2);
    p.rect(30, 3, 2, 5, C.moss2);
    p.rect(15, 3, 1, 5, C.oak3);
  },
  // ----------------------------------------------------------------- pets
  pet_cat_loaf: (p, env) => {
    const c = S.a;
    const c2 = S.a2;
    if (env.night) {
      // curled up asleep
      p.rect(1, 4, 6, 3, c);
      p.rect(0, 5, 8, 2, c);
      p.rect(1, 7, 6, 1, c2);
      p.rect(1, 4, 2, 1, c2);
      p.px(1, 3, c);
      p.px(3, 3, c);
      p.rect(1, 5, 2, 1, c2);
      p.px(6, 6, c2);
    } else {
      p.px(1, 1, c);
      p.px(4, 1, c);
      p.rect(1, 2, 4, 3, c);
      p.px(2, 3, C.amber);
      p.px(4, 3, C.amber);
      p.px(3, 4, C.pink);
      p.rect(1, 5, 6, 2, c);
      p.rect(1, 7, 6, 1, c2);
      p.rect(7, 4, 1, 3, c2);
    }
  },
  pet_dog_nap: (p, env) => {
    p.rect(0, 6, 16, 2, S.a2);
    p.rect(1, 5, 14, 1, S.a);
    if (env.night) {
      p.rect(3, 2, 9, 3, S.w);
      p.rect(3, 2, 9, 1, S.w3);
      p.rect(9, 3, 4, 2, S.w3);
      p.px(13, 4, C.ink);
      p.rect(9, 2, 2, 2, S.w2);
      p.rect(2, 3, 1, 2, S.w2);
    } else {
      p.rect(3, 3, 7, 2, S.w);
      p.rect(9, 0, 5, 4, S.w);
      p.rect(13, 2, 2, 2, S.w3);
      p.px(14, 2, C.ink);
      p.px(11, 1, C.ink);
      p.rect(9, 0, 1, 3, S.w2);
      p.px(2, 2, S.w2);
      p.px(2, 3, S.w2);
      p.rect(4, 5, 1, 1, S.w2);
      p.rect(11, 4, 1, 1, S.w2);
    }
  },
  pet_rabbit: (p, env) => {
    p.rect(1, 0, 1, 3, C.white);
    p.rect(3, 0, 1, 3, C.white);
    p.px(1, 1, C.pink);
    p.px(3, 1, C.pink);
    p.rect(0, 3, 5, 3, C.white);
    p.px(1, 4, env.night ? C.metal2 : C.ink);
    p.px(3, 4, env.night ? C.metal2 : C.ink);
    p.rect(2, 3, 5, 5, C.white);
    p.rect(0, 6, 7, 2, C.paper);
    p.px(7, 6, C.white);
    p.px(2, 5, C.pink);
  },
  // ---------------------------------------------------------------- study
  study_carrel: (p, env) => {
    p.rect(0, 2, 2, 22, S.w2);
    p.rect(22, 2, 2, 22, S.w2);
    p.rect(2, 2, 20, 12, S.w2);
    p.rect(3, 3, 18, 10, S.w3);
    p.rect(3, 3, 18, 1, S.w);
    // shelf of books and a small lamp
    for (let i = 0; i < 6; i++) p.rect(4 + i * 2, 5, 1, 4, [C.red, C.blue, C.amber2, C.leaf2, C.purple, C.teal][i]);
    p.rect(3, 9, 12, 1, S.w);
    p.rect(17, 5, 3, 1, C.metal2);
    p.rect(18, 6, 1, 7, C.metal2);
    p.rect(16, 6, 4, 1, env.on || env.night ? C.glow : C.metal);
    p.rect(2, 14, 20, 2, S.w);
    p.rect(2, 14, 20, 1, S.w3);
    p.rect(6, 13, 7, 1, C.white);
    p.rect(3, 16, 2, 8, S.w2);
    p.rect(19, 16, 2, 8, S.w2);
  },
  exam_countdown: (p) => {
    p.rect(0, 0, 16, 16, C.white);
    p.rect(0, 0, 16, 4, C.red);
    p.px(3, 1, C.white);
    p.px(12, 1, C.white);
    p.rect(3, 6, 3, 1, C.ink);
    p.rect(3, 6, 1, 6, C.ink);
    p.rect(5, 7, 1, 4, C.ink);
    p.rect(3, 11, 3, 1, C.ink);
    p.rect(7, 8, 2, 1, C.red);
    p.rect(10, 6, 3, 1, C.ink);
    p.rect(12, 6, 1, 6, C.ink);
    p.rect(10, 8, 3, 1, C.ink);
    p.rect(10, 11, 3, 1, C.ink);
    p.rect(1, 14, 14, 1, C.paper2);
  },
  kanban_board: (p) => {
    p.rect(0, 0, 24, 16, C.white);
    p.rect(0, 0, 24, 1, C.metal);
    p.rect(0, 15, 24, 1, C.metal);
    p.rect(8, 1, 1, 14, C.paper2);
    p.rect(16, 1, 1, 14, C.paper2);
    p.rect(1, 2, 6, 1, C.metal3);
    p.rect(10, 2, 5, 1, C.metal3);
    p.rect(18, 2, 5, 1, C.metal3);
    for (const [x, y, c] of [[2, 4, C.amber], [2, 8, C.pink], [2, 12, C.sky], [10, 5, C.leaf3], [10, 10, C.amber], [18, 4, C.sky], [18, 8, C.leaf3]] as const) {
      p.rect(x, y, 4, 3, c);
      p.rect(x + 1, y + 1, 2, 1, C.metal2);
    }
  },
  book_cart: (p) => {
    p.rect(1, 2, 14, 1, C.metal2);
    p.rect(1, 2, 1, 11, C.metal2);
    p.rect(14, 2, 1, 11, C.metal2);
    p.rect(1, 7, 14, 1, C.metal2);
    p.rect(1, 12, 14, 1, C.metal2);
    for (let i = 0; i < 6; i++) p.rect(2 + i * 2, 3, 2, 4, [C.red, C.teal, C.amber2, C.indigo, C.leaf2, C.orange][i]);
    for (let i = 0; i < 6; i++) p.rect(2 + i * 2, 8, 2, 4, [C.blue, C.pink, C.paper2, C.moss, C.red2, C.sky2][i]);
    disc(p, 3, 14, 1.5, C.ink3);
    disc(p, 13, 14, 1.5, C.ink3);
  },
  abacus: (p) => {
    p.rect(0, 1, 8, 7, S.w2);
    p.rect(1, 2, 6, 5, S.w3);
    p.rect(1, 3, 6, 1, S.w2);
    for (const x of [1, 3, 5]) {
      p.px(x, 2, S.b);
      p.rect(x, 5, 1, 1, S.b);
      p.px(x + 1, 6, S.b2);
    }
  },
  pencil_cup: (p) => {
    p.rect(2, 3, 4, 5, S.a);
    p.rect(2, 3, 1, 5, S.a3);
    p.rect(2, 7, 4, 1, S.a2);
    p.rect(2, 0, 1, 3, C.amber);
    p.rect(4, 1, 1, 2, C.red);
    p.rect(5, 0, 1, 3, C.metal);
    p.px(2, 0, C.pink);
  },
};
