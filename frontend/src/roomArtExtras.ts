// MY ROOM art pack: seasonal pieces, curiosities and new wall / floor
// surfaces. Recolourable parts use the S slots (roomPaint.ts); paints fill
// the whole wall or floor area they are given (w x h).
import { C, disc, hash, S, type Art } from './roomPaint';

export const EXTRAS_ART: Record<string, Art> = {
  // -------------------------------------------------------------- seasonal
  fireplace: (p, { on, night }) => {
    const lit = on || night;
    p.rect(0, 0, 24, 3, S.w);
    p.rect(0, 2, 24, 1, S.w2);
    p.rect(1, 3, 22, 21, S.b);
    for (let y = 4; y < 24; y += 3) for (let x = 1 + ((y / 3) % 2) * 2; x < 23; x += 4) p.rect(x, y, 3, 2, S.b2);
    p.rect(5, 9, 14, 15, C.ink);
    p.rect(6, 10, 12, 13, C.ink2);
    if (lit) {
      p.rect(8, 16, 8, 6, C.orange);
      p.rect(9, 13, 2, 4, C.amber);
      p.rect(13, 12, 2, 5, C.amber);
      p.rect(11, 15, 2, 3, C.glow);
      p.px(10, 12, C.orange);
    }
    p.rect(7, 21, 10, 2, C.walnut);
    p.rect(4, 23, 16, 1, C.ink3);
  },
  jack_o_lantern: (p, { on, night }) => {
    const lit = on || night;
    p.rect(3, 0, 2, 2, C.leaf2);
    disc(p, 4, 5, 3.6, C.orange);
    p.rect(2, 2, 1, 6, C.orange2);
    p.rect(5, 2, 1, 6, C.orange2);
    const face = lit ? C.glow : C.ink;
    p.px(2, 4, face);
    p.px(5, 4, face);
    p.rect(2, 6, 4, 1, face);
    p.px(3, 7, face);
  },
  snowman: (p) => {
    disc(p, 4, 12, 3.8, C.white);
    disc(p, 4, 5.5, 2.8, C.white);
    p.rect(2, 1, 4, 2, C.ink);
    p.rect(1, 3, 6, 1, C.ink);
    p.px(3, 5, C.ink);
    p.px(5, 5, C.ink);
    p.px(4, 6, C.orange);
    p.rect(1, 8, 6, 1, S.b);
    p.rect(5, 8, 1, 3, S.b);
    p.px(4, 11, C.ink);
    p.px(4, 13, C.ink);
  },
  gift_pile: (p) => {
    const gifts: Array<[number, number, number, number, string, string]> = [
      [0, 3, 7, 5, S.b, C.amber], [6, 1, 5, 7, S.a, C.white], [10, 4, 6, 4, C.leaf2, C.red],
    ];
    gifts.forEach(([x, y, w, h, c, ribbon]) => {
      p.rect(x, y, w, h, c);
      p.rect(x + Math.floor(w / 2), y, 1, h, ribbon);
      p.rect(x, y + 1, w, 1, ribbon);
      p.px(x + Math.floor(w / 2) - 1, y - 1, ribbon);
      p.px(x + Math.floor(w / 2) + 1, y - 1, ribbon);
    });
  },
  grandfather_clock: (p) => {
    p.rect(1, 0, 6, 1, S.w2);
    p.rect(0, 1, 8, 10, S.w);
    disc(p, 4, 5.5, 3, C.paper);
    p.px(4, 4, C.ink);
    p.px(4, 5, C.ink);
    p.px(5, 6, C.ink);
    p.rect(1, 11, 6, 15, S.w2);
    p.rect(2, 12, 4, 12, C.wood4);
    p.rect(4, 12, 1, 8, C.amber2);
    disc(p, 4.5, 21, 1.4, C.amber);
    p.rect(0, 26, 8, 6, S.w);
    p.rect(0, 26, 8, 1, S.w3);
  },
  balloon_model: (p) => {
    disc(p, 8, 6, 6, S.b);
    for (let x = 3; x < 14; x += 3) p.rect(x, 1, 1, 10, S.b2);
    p.rect(2, 6, 12, 1, S.a);
    p.px(5, 3, S.b3);
    for (let i = 0; i < 3; i++) {
      p.px(5 + i, 11 + i, C.ink3);
      p.px(11 - i, 11 + i, C.ink3);
    }
    p.rect(6, 13, 4, 3, C.wood);
  },
  rocket_model: (p) => {
    p.rect(3, 0, 2, 1, S.b);
    p.rect(2, 1, 4, 2, S.b);
    p.rect(2, 3, 4, 8, C.white);
    p.rect(3, 4, 2, 2, C.sky);
    p.rect(1, 9, 1, 3, S.b);
    p.rect(6, 9, 1, 3, S.b);
    p.rect(3, 11, 2, 1, C.ink3);
    p.rect(1, 12, 6, 4, S.w);
    p.rect(1, 12, 6, 1, S.w3);
  },
  dino_skeleton: (p) => {
    const bone = '#efe6d2';
    const shade = '#cdbf9f';
    // skull, neck, spine, ribs, tail and legs on a plinth
    p.rect(24, 2, 6, 4, bone);
    p.rect(28, 5, 3, 1, bone);
    p.px(26, 3, C.ink);
    for (let i = 0; i < 6; i++) p.px(23 - i, 6 + Math.round(i * 0.5), bone);
    for (let x = 4; x < 18; x++) p.px(x, 9 + Math.round(Math.sin((x - 4) / 4)), bone);
    for (let x = 0; x < 6; x++) p.px(x, 10 + Math.round(x * 0.2), shade);
    for (let x = 8; x < 18; x += 2) p.rect(x, 10, 1, 5, shade);
    p.rect(9, 15, 2, 6, bone);
    p.rect(16, 15, 2, 6, bone);
    p.rect(8, 20, 3, 1, bone);
    p.rect(15, 20, 3, 1, bone);
    p.rect(20, 10, 1, 4, shade);
    p.rect(0, 21, 32, 3, S.m);
    p.rect(0, 21, 32, 1, S.m3);
  },
  ship_bottle: (p) => {
    p.rect(0, 3, 7, 4, '#cfe8f3');
    p.rect(7, 4, 1, 2, S.w);
    p.rect(1, 5, 5, 1, C.walnut);
    p.rect(3, 2, 1, 3, C.paper2);
    p.rect(2, 3, 1, 2, C.white);
    p.rect(4, 3, 1, 2, C.white);
    p.rect(1, 7, 6, 1, S.w2);
  },
  hourglass: (p) => {
    p.rect(1, 0, 6, 1, S.w);
    p.rect(1, 7, 6, 1, S.w);
    p.rect(2, 1, 4, 2, '#cfe8f3');
    p.rect(3, 3, 2, 1, '#cfe8f3');
    p.rect(2, 4, 4, 3, '#cfe8f3');
    p.rect(3, 2, 2, 1, C.amber);
    p.rect(2, 5, 4, 2, C.amber);
    p.px(4, 4, C.amber);
  },
  chess_table: (p) => {
    p.rect(5, 1, 1, 2, C.white);
    p.rect(9, 1, 1, 2, C.ink);
    p.px(11, 2, C.ink);
    p.rect(0, 3, 16, 2, C.paper);
    for (let x = 0; x < 16; x += 2) p.rect(x, 3, 1, 1, C.ink2);
    for (let x = 1; x < 16; x += 2) p.rect(x, 4, 1, 1, C.ink2);
    p.rect(0, 5, 16, 1, S.w);
    p.rect(7, 6, 2, 8, S.w2);
    p.rect(4, 14, 8, 2, S.w2);
  },
  snow_globe: (p) => {
    disc(p, 4, 3.5, 3.4, '#e0f2fe');
    p.rect(3, 3, 2, 3, C.leaf2);
    p.px(4, 2, C.leaf2);
    for (const [x, y] of [[2, 1], [6, 2], [1, 4], [5, 1]] as const) p.px(x, y, C.white);
    p.rect(1, 6, 6, 2, S.b);
    p.rect(1, 6, 6, 1, S.b3);
  },
  crystal_ball: (p) => {
    disc(p, 4, 3.5, 3.3, '#a78bfa');
    disc(p, 3.5, 3, 1.6, '#ddd6fe');
    p.px(2, 2, C.white);
    p.rect(1, 6, 6, 2, S.w);
  },
  astronaut_suit: (p) => {
    disc(p, 8, 5, 4.6, C.white);
    disc(p, 8, 5.5, 3, C.amber2);
    p.px(7, 4, C.glow);
    p.rect(3, 10, 10, 11, C.white);
    p.rect(5, 12, 6, 3, C.paper2);
    p.px(6, 13, C.red);
    p.px(8, 13, C.blue);
    p.rect(0, 11, 3, 9, C.paper);
    p.rect(13, 11, 3, 9, C.paper);
    p.rect(4, 21, 3, 7, C.paper);
    p.rect(9, 21, 3, 7, C.paper);
    p.rect(3, 26, 4, 2, C.metal3);
    p.rect(9, 26, 4, 2, C.metal3);
    p.rect(2, 28, 12, 4, S.m);
    p.rect(2, 28, 12, 1, S.m3);
  },
  knight_armor: (p) => {
    p.rect(2, 0, 4, 6, S.m3);
    p.rect(3, 3, 2, 1, C.ink);
    p.rect(3, 0, 2, 1, S.b);
    p.rect(1, 6, 6, 9, S.m3);
    p.rect(2, 7, 4, 1, S.m);
    p.rect(0, 7, 1, 8, S.m);
    p.rect(7, 7, 1, 8, S.m);
    p.rect(7, 2, 1, 14, C.metal);
    p.rect(2, 15, 2, 11, S.m3);
    p.rect(4, 15, 2, 11, S.m);
    p.rect(1, 26, 6, 1, S.m2);
    p.rect(0, 27, 8, 5, S.w2);
  },
  mannequin: (p) => {
    p.rect(3, 0, 2, 2, '#e0c59f');
    p.rect(1, 2, 6, 10, S.a);
    p.rect(1, 2, 6, 1, S.a3);
    p.rect(3, 4, 2, 6, S.a2);
    p.rect(2, 12, 4, 2, S.a2);
    p.rect(3, 14, 2, 14, C.walnut);
    p.rect(1, 28, 6, 4, C.walnut);
  },
  sewing_table: (p) => {
    p.rect(3, 2, 9, 2, S.a);
    p.rect(3, 4, 2, 4, S.a);
    p.rect(9, 4, 3, 4, S.a);
    p.rect(5, 4, 4, 1, S.a2);
    p.px(7, 6, C.metal);
    disc(p, 13.5, 2.5, 1.4, S.b);
    p.rect(0, 8, 16, 2, S.w3);
    p.rect(0, 9, 16, 1, S.w);
    p.rect(1, 10, 1, 6, C.ink2);
    p.rect(14, 10, 1, 6, C.ink2);
    p.rect(2, 14, 12, 1, C.ink2);
  },
  pottery_wheel: (p) => {
    p.rect(5, 0, 4, 1, S.b3);
    p.rect(4, 1, 6, 4, S.b);
    p.rect(5, 1, 2, 1, S.b3);
    p.rect(1, 5, 12, 2, C.metal);
    p.rect(1, 5, 12, 1, C.paper);
    p.rect(0, 7, 16, 5, S.m);
    p.rect(0, 7, 16, 1, S.m3);
    p.rect(2, 12, 2, 4, S.m2);
    p.rect(12, 12, 2, 4, S.m2);
  },
  microscope: (p) => {
    p.rect(3, 0, 2, 4, C.ink2);
    p.rect(2, 4, 3, 1, C.metal);
    p.rect(5, 2, 1, 4, S.m);
    p.rect(1, 5, 4, 1, C.ink3);
    p.rect(1, 6, 6, 1, S.m);
    p.rect(1, 7, 6, 1, S.m2);
  },
  chemistry_set: (p) => {
    p.rect(1, 3, 2, 5, C.white);
    p.rect(1, 5, 2, 3, C.leaf3);
    p.rect(4, 4, 1, 2, '#cfe8f3');
    disc(p, 4.5, 6.5, 1.6, C.pink);
    p.rect(7, 2, 1, 4, '#cfe8f3');
    p.rect(6, 5, 4, 3, C.sky);
    p.rect(11, 3, 2, 5, C.white);
    p.rect(11, 6, 2, 2, C.amber);
    p.px(13, 1, C.leaf3);
    p.px(2, 1, C.white);
  },
  bust_statue: (p) => {
    disc(p, 4, 2.5, 2.4, C.paper);
    p.rect(3, 2, 1, 1, C.paper2);
    p.rect(2, 5, 4, 2, C.paper);
    p.rect(1, 7, 6, 2, C.paper2);
    p.rect(1, 9, 6, 1, S.m);
    p.rect(2, 10, 4, 5, S.m3);
    p.rect(1, 15, 6, 1, S.m);
  },
  play_tent: (p) => {
    for (let y = 0; y < 22; y++) {
      const half = Math.round((y / 21) * 14);
      p.rect(16 - half, y + 2, half * 2, 1, (y >> 2) % 2 ? S.a : S.a3);
    }
    for (let y = 9; y < 24; y++) {
      const half = Math.round(((y - 9) / 14) * 4);
      p.rect(16 - half, y, half * 2, 1, C.wood4);
    }
    p.rect(15, 0, 1, 3, S.w2);
    p.rect(17, 0, 1, 3, S.w2);
    p.rect(8, 4, 4, 2, C.amber);
    p.rect(20, 6, 3, 2, S.b);
  },
  fountain: (p, { on }) => {
    p.rect(7, 0, 2, 1, on ? '#bae6fd' : C.paper2);
    p.rect(6, 1, 1, 3, on ? '#bae6fd' : C.paper2);
    p.rect(9, 1, 1, 3, on ? '#bae6fd' : C.paper2);
    p.rect(5, 4, 6, 2, S.m3);
    p.rect(7, 6, 2, 4, S.m3);
    p.rect(1, 10, 14, 2, C.sky);
    p.rect(0, 10, 16, 1, S.m3);
    p.rect(1, 12, 14, 4, S.m);
    p.rect(1, 12, 14, 1, S.m3);
  },

  // -------------------------------------------------------------- surfaces
  wall_subway: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a2);
    for (let row = 0; row * 3 < h; row++) {
      const off = row % 2 ? 3 : 0;
      for (let x = -off; x < w; x += 6) p.rect(x, row * 3, 5, 2, S.a);
    }
  },
  wall_hex: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a2);
    for (let y = 0; y < h; y += 6) {
      for (let x = (y / 6) % 2 ? 4 : 0; x < w; x += 8) {
        p.rect(x + 1, y, 4, 1, S.a);
        p.rect(x, y + 1, 6, 3, S.a);
        p.rect(x + 1, y + 4, 4, 1, S.a);
        p.px(x + 1, y + 1, S.a3);
      }
    }
  },
  wall_stone: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m2);
    for (let row = 0; row * 5 < h; row++) {
      let x = -((row * 7) % 9);
      while (x < w) {
        const sw = 6 + Math.floor(hash(x, row) * 6);
        p.rect(x + 1, row * 5 + 1, sw - 1, 4, hash(row, x) > 0.5 ? S.m : S.m3);
        x += sw;
      }
    }
  },
  wall_plank: (p, { w, h }) => {
    for (let y = 0; y < h; y += 4) {
      p.rect(0, y, w, 4, (y / 4) % 2 ? S.w : S.w3);
      p.rect(0, y + 3, w, 1, S.w2);
    }
  },
  wall_stars: (p, { w, h, night }) => {
    p.rect(0, 0, w, h, S.a2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = hash(x * 3, y * 7);
        if (r > 0.985) p.px(x, y, night ? C.star : S.a3);
        else if (r > 0.975) p.px(x, y, S.a);
      }
    }
  },
  wall_sunset: (p, { w, h }) => {
    const bands = [S.b2, S.b, S.b3, '#fde68a'];
    bands.forEach((c, i) => p.rect(0, Math.floor((i * h) / 4), w, Math.ceil(h / 4), c));
    for (let x = 0; x < w; x += 2) p.px(x, Math.floor(h / 4), S.b);
  },
  wall_blueprint: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a2);
    for (let x = 0; x < w; x += 8) p.rect(x, 0, 1, h, S.a);
    for (let y = 0; y < h; y += 8) p.rect(0, y, w, 1, S.a);
    for (let x = 12; x < w; x += 40) {
      p.rect(x, 8, 14, 1, S.a3);
      p.rect(x, 8, 1, 10, S.a3);
      p.rect(x + 14, 8, 1, 10, S.a3);
    }
  },
  wall_plaid: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.b);
    for (let x = 0; x < w; x += 10) p.rect(x, 0, 3, h, S.b2);
    for (let y = 0; y < h; y += 10) p.rect(0, y, w, 3, S.b2);
    for (let x = 6; x < w; x += 10) p.rect(x, 0, 1, h, S.a);
    for (let y = 6; y < h; y += 10) p.rect(0, y, w, 1, S.a);
  },
  wall_chevron: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x++) p.rect(x, y + Math.abs((x % 8) - 4) / 2, 1, 2, S.a);
  },
  wall_floral: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 3; y < h; y += 8) {
      for (let x = (y >> 3) % 2 ? 7 : 2; x < w; x += 10) {
        p.px(x, y - 1, S.b);
        p.px(x - 1, y, S.b);
        p.px(x + 1, y, S.b);
        p.px(x, y + 1, S.b);
        p.px(x, y, C.amber);
        p.px(x + 2, y + 2, C.leaf2);
      }
    }
  },
  wall_shiplap: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let y = 5; y < h; y += 6) p.rect(0, y, w, 1, S.a);
  },
  wall_circuit: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a2);
    for (let i = 0; i < Math.floor((w * h) / 120); i++) {
      const x = Math.floor(hash(i, 1) * w);
      const y = Math.floor(hash(i, 2) * h);
      const len = 4 + Math.floor(hash(i, 3) * 10);
      if (i % 2) p.rect(x, y, len, 1, S.a);
      else p.rect(x, y, 1, Math.min(len, 6), S.a);
      p.px(x, y, S.b3);
    }
  },
  floor_marble: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.a3);
    for (let i = 0; i < Math.floor(w / 6); i++) {
      let x = Math.floor(hash(i, 4) * w);
      for (let y = 0; y < h; y++) {
        x += hash(i, y) > 0.5 ? 1 : -1;
        p.px(x, y, S.a);
      }
    }
    for (let x = 31; x < w; x += 32) p.rect(x, 0, 1, h, S.a);
  },
  floor_parquet: (p, { w, h }) => {
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) {
        const flip = ((x + y) / 8) % 2;
        for (let i = 0; i < 4; i++) {
          if (flip) p.rect(x + i * 2, y, 2, 8, i % 2 ? S.w : S.w3);
          else p.rect(x, y + i * 2, 8, 2, i % 2 ? S.w : S.w3);
        }
        p.rect(x, y, 8, 1, S.w2);
      }
    }
  },
  floor_terrazzo: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.paper);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const r = hash(x, y);
        if (r > 0.94) p.px(x, y, S.b);
        else if (r > 0.9) p.px(x, y, S.a);
        else if (r > 0.87) p.px(x, y, C.metal3);
      }
    }
  },
  floor_grass: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.leaf2);
    for (let y = 0; y < h; y++) for (let x = (y % 2) * 2; x < w; x += 3) if (hash(x, y) > 0.5) p.px(x, y, hash(y, x) > 0.7 ? C.leaf3 : C.leaf);
  },
  floor_cobble: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m2);
    for (let row = 0; row * 4 < h; row++) {
      for (let x = row % 2 ? -3 : 0; x < w; x += 6) {
        p.rect(x + 1, row * 4 + 1, 4, 3, hash(x, row) > 0.5 ? S.m : S.m3);
      }
    }
  },
  floor_diamond: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m);
    for (let y = 1; y < h; y += 4) for (let x = (y >> 2) % 2 ? 3 : 1; x < w; x += 4) p.rect(x, y, 2, 1, S.m3);
  },
  floor_checker_big: (p, { w, h }) => {
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) p.rect(x, y, 8, 8, (x + y) % 16 ? S.a : C.paper);
  },
  floor_rug: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.w3);
    const x0 = 8;
    const x1 = w - 8;
    p.rect(x0, 2, x1 - x0, h - 4, S.b);
    p.rect(x0 + 2, 4, x1 - x0 - 4, h - 8, S.b3);
    for (let x = x0 + 6; x < x1 - 6; x += 10) {
      p.rect(x, Math.floor(h / 2) - 2, 4, 4, S.a);
      p.px(x + 1, Math.floor(h / 2) - 1, S.b);
    }
    for (let x = x0; x < x1; x += 2) {
      p.px(x, 1, C.paper);
      p.px(x, h - 2, C.paper);
    }
  },
  floor_bamboo: (p, { w, h }) => {
    for (let y = 0; y < h; y += 3) {
      p.rect(0, y, w, 3, (y / 3) % 2 ? S.w : S.w3);
      for (let x = ((y / 3) * 13) % 20; x < w; x += 20) p.rect(x, y, 1, 3, S.w2);
    }
  },
  floor_slate: (p, { w, h }) => {
    p.rect(0, 0, w, h, S.m2);
    for (let y = 0; y < h; y += 8) {
      for (let x = (y / 8) % 2 ? 6 : 0; x < w; x += 12) p.rect(x + 1, y + 1, 11, 7, hash(x, y) > 0.5 ? S.m : S.m3);
    }
  },
};

