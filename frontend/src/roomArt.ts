// Pixel art for every MY ROOM piece, keyed by the catalog ids in
// backend/tracker/furniture.py (sizes come from there: w x h tiles, drawn
// into w*8 x h*8 pixels). backend RoomTests checks every catalog id has an
// entry here, so add the art in the same change as a new piece.
// Paints ('surfaces') fill the whole wall / floor area they are given.
import { books, box, C, foliage, hash, text, type Art } from './roomPaint';

export const ROOM_ART: Record<string, Art> = {
  // ---------------------------------------------------------------- paints
  wall_plain: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.wallBase);
    for (let x = 3; x < w; x += 8) p.rect(x, 0, 1, h, C.wallBase2);
  },
  wall_brick: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.mortar);
    for (let row = 0; row * 4 < h; row++) {
      const off = row % 2 ? 4 : 0;
      for (let x = -off; x < w; x += 8) {
        const shade = hash(x, row) > 0.7 ? C.brick2 : C.brick;
        p.rect(x + 1, row * 4 + 1, 7, 3, shade);
      }
    }
  },
  wall_navy: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.navy);
    for (let x = 0; x < w; x += 8) p.rect(x, 0, 2, h, C.navy2);
  },
  wall_terminal: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.term);
    for (let y = 1; y < h; y += 2) p.rect(0, y, w, 1, C.term2);
    for (let y = 2; y < h - 2; y += 5) {
      for (let x = 2; x < w - 2; x += 2) {
        const r = hash(x, y);
        if (r > 0.55) p.px(x, y, r > 0.9 ? C.leaf3 : C.emerald2);
      }
    }
  },
  floor_wood: (p, { w, h }) => {
    // Long boards: seams far apart and staggered so the floor never reads as brick.
    for (let row = 0; row * 4 < h; row++) {
      p.rect(0, row * 4, w, 4, row % 2 ? C.oak2 : C.oak);
      p.rect(0, row * 4 + 3, w, 1, C.oak3);
      const seam = (row * 53) % 64;
      for (let x = seam; x < w; x += 64) p.rect(x, row * 4, 1, 3, C.oak3);
    }
  },
  floor_tile: (p, { w, h }) => {
    for (let y = 0; y < h; y += 8) {
      for (let x = 0; x < w; x += 8) p.rect(x, y, 8, 8, (x + y) % 16 ? C.ink3 : C.paper);
    }
  },
  floor_carpet: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.moss);
    for (let y = 0; y < h; y++) {
      for (let x = (y % 2) * 2; x < w; x += 4) if (hash(x, y) > 0.4) p.px(x, y, C.moss2);
    }
  },
  floor_dark: (p, { w, h }) => {
    for (let row = 0; row * 4 < h; row++) {
      p.rect(0, row * 4, w, 4, row % 2 ? C.walnut2 : C.walnut);
      p.rect(0, row * 4, w, 1, C.walnut3);
      const seam = (row * 47) % 64;
      for (let x = seam; x < w; x += 64) p.rect(x, row * 4, 1, 4, C.walnut2);
    }
  },

  // -------------------------------------------------------------- starters
  starter_desk: (p) => {
    // mug and books on top
    p.rect(4, 1, 3, 3, C.white);
    p.px(7, 2, C.white);
    p.rect(14, 2, 7, 2, C.blue);
    p.rect(15, 0, 5, 2, C.red);
    p.rect(1, 4, 22, 2, C.wood3);
    p.rect(1, 5, 22, 1, C.wood);
    p.rect(2, 6, 2, 10, C.wood2);
    p.rect(20, 6, 2, 10, C.wood2);
    box(p, 4, 6, 8, 5, C.wood, C.wood2);
    p.px(7, 8, C.metal);
    p.px(8, 8, C.metal);
  },
  starter_chair: (p) => {
    p.rect(1, 1, 1, 9, C.wood2);
    p.rect(6, 1, 1, 9, C.wood2);
    p.rect(2, 2, 4, 2, C.wood);
    p.rect(2, 5, 4, 1, C.wood);
    p.rect(0, 9, 8, 2, C.wood3);
    p.rect(1, 11, 1, 5, C.wood2);
    p.rect(6, 11, 1, 5, C.wood2);
  },

  // ----------------------------------------------------------------- small
  plant_pot: (p) => {
    foliage(p, 4, 3, 3);
    p.rect(1, 4, 6, 1, C.pot2);
    p.rect(2, 5, 4, 3, C.pot);
  },
  cactus: (p) => {
    p.px(3, 0, C.pink);
    p.rect(3, 1, 2, 5, C.leaf2);
    p.px(3, 2, C.leaf);
    p.rect(1, 2, 1, 2, C.leaf2);
    p.px(2, 3, C.leaf2);
    p.rect(6, 1, 1, 2, C.leaf2);
    p.px(5, 2, C.leaf2);
    p.rect(2, 6, 4, 2, C.pot);
  },
  trash_bin: (p) => {
    p.px(3, 0, C.white);
    p.px(4, 1, C.paper2);
    p.rect(0, 2, 8, 1, C.metal);
    p.rect(1, 3, 6, 5, C.metal3);
    p.rect(2, 3, 1, 5, C.metal2);
    p.rect(5, 3, 1, 5, C.metal2);
  },
  book_stack: (p) => {
    p.rect(1, 1, 5, 2, C.amber2);
    p.rect(0, 3, 7, 2, C.leaf2);
    p.rect(1, 5, 6, 1, C.blue);
    p.rect(0, 6, 8, 2, C.red);
    p.rect(6, 6, 1, 2, C.paper);
    p.rect(5, 3, 1, 2, C.paper);
  },
  stool: (p) => {
    p.rect(0, 2, 8, 2, C.wood3);
    p.rect(0, 3, 8, 1, C.wood);
    p.rect(1, 4, 1, 4, C.wood2);
    p.rect(6, 4, 1, 4, C.wood2);
    p.rect(2, 6, 4, 1, C.wood2);
  },
  wall_clock: (p) => {
    p.rect(2, 0, 4, 8, C.rim);
    p.rect(0, 2, 8, 4, C.rim);
    p.rect(1, 1, 6, 6, C.rim);
    p.rect(2, 1, 4, 6, C.white);
    p.rect(1, 2, 6, 4, C.white);
    p.rect(4, 2, 1, 2, C.ink);
    p.rect(4, 4, 2, 1, C.red);
  },
  pennant: (p) => {
    p.rect(0, 1, 16, 1, C.wood2);
    for (let y = 2; y < 8; y++) p.rect(2, y, 13 - (y - 2) * 2, 1, y % 2 ? C.emerald : C.emerald2);
    p.rect(4, 3, 3, 1, C.white);
  },
  poster_grid: (p) => {
    box(p, 1, 1, 14, 14, C.paper, C.ink2);
    for (let i = 4; i < 14; i += 3) {
      p.rect(i, 2, 1, 12, C.paper2);
      p.rect(2, i, 12, 1, C.paper2);
    }
    [12, 10, 11, 7, 8, 4, 3].forEach((y, i) => p.px(3 + i * 1.5, y, C.emerald2));
    p.rect(3, 12, 2, 1, C.emerald);
    p.rect(12, 3, 2, 1, C.red);
  },
  frame_mountain: (p) => {
    box(p, 0, 0, 16, 8, C.sky, C.wood2);
    p.px(12, 2, C.amber);
    for (let i = 0; i < 4; i++) p.rect(5 - i, 3 + i, 1 + i * 2, 1, i === 0 ? C.white : C.metal2);
    for (let i = 0; i < 3; i++) p.rect(10 - i, 4 + i, 1 + i * 2, 1, C.metal3);
  },
  wall_shelf: (p) => {
    books(p, 1, 6, 9, 2);
    p.rect(12, 4, 3, 2, C.pot);
    p.px(13, 3, C.leaf);
    p.px(12, 2, C.leaf2);
    p.px(14, 2, C.leaf);
    p.rect(0, 6, 16, 1, C.wood3);
    p.rect(0, 7, 16, 1, C.wood2);
  },
  floor_lamp: (p, { on, night }) => {
    const lit = on || night;
    p.rect(1, 0, 6, 1, lit ? C.glow : C.paper2);
    p.rect(0, 1, 8, 4, lit ? C.amber : C.paper);
    p.rect(1, 5, 6, 1, lit ? C.amber2 : C.paper2);
    p.rect(3, 6, 2, 16, C.metal3);
    p.rect(1, 22, 6, 2, C.ink2);
  },
  beanbag: (p) => {
    p.rect(3, 1, 10, 1, C.orange);
    p.rect(1, 2, 14, 6, C.orange);
    p.rect(0, 4, 16, 4, C.orange);
    p.rect(0, 7, 16, 1, C.orange2);
    p.rect(4, 2, 3, 1, C.amber);
    p.rect(6, 4, 4, 1, C.orange2);
  },

  // ---------------------------------------------------------------- medium
  office_chair: (p) => {
    box(p, 1, 0, 6, 7, C.ink2, C.ink);
    p.rect(2, 1, 1, 4, C.ink3);
    p.rect(0, 8, 8, 2, C.ink);
    p.rect(1, 8, 6, 1, C.ink3);
    p.rect(3, 10, 2, 3, C.metal3);
    p.rect(0, 13, 8, 1, C.metal2);
    p.px(0, 14, C.ink);
    p.px(3, 14, C.ink);
    p.px(7, 14, C.ink);
  },
  writing_desk: (p, { on }) => {
    // laptop
    box(p, 6, 0, 8, 5, on ? C.screenOn : C.screenOff, C.ink);
    if (on) {
      p.rect(8, 2, 3, 1, C.leaf3);
      p.rect(8, 3, 2, 1, C.emerald);
    }
    p.rect(5, 5, 10, 1, C.metal);
    p.rect(17, 3, 2, 3, C.white);
    p.rect(0, 6, 24, 2, C.walnut3);
    p.rect(0, 7, 24, 1, C.walnut);
    p.rect(1, 8, 2, 8, C.walnut2);
    box(p, 14, 8, 9, 4, C.walnut, C.walnut2);
    box(p, 14, 11, 9, 4, C.walnut, C.walnut2);
    p.rect(18, 9, 2, 1, C.amber);
    p.rect(18, 12, 2, 1, C.amber);
    p.rect(21, 15, 2, 1, C.walnut2);
  },
  side_table: (p, { on, night }) => {
    const lit = on || night;
    p.rect(1, 1, 6, 3, lit ? C.amber : C.paper);
    p.rect(2, 0, 4, 1, lit ? C.glow : C.paper2);
    p.rect(3, 4, 2, 4, C.metal3);
    p.rect(0, 8, 8, 2, C.wood3);
    p.rect(1, 10, 6, 4, C.wood);
    p.px(4, 12, C.metal);
    p.rect(1, 14, 1, 2, C.wood2);
    p.rect(6, 14, 1, 2, C.wood2);
  },
  tall_plant: (p) => {
    foliage(p, 4, 4, 4);
    foliage(p, 2, 10, 2);
    foliage(p, 6, 12, 2);
    p.rect(3, 7, 2, 12, C.wood2);
    p.rect(1, 18, 6, 1, C.ink2);
    p.rect(2, 19, 4, 5, C.ink3);
  },
  window: (p, { night }) => {
    p.rect(0, 0, 24, 22, C.frame);
    p.rect(2, 2, 20, 18, night ? C.night : C.sky);
    if (night) {
      [[5, 4], [16, 6], [9, 9], [19, 13], [4, 15]].forEach(([x, y]) => p.px(x, y, C.star));
      p.rect(15, 3, 3, 3, C.star);
      p.px(17, 3, C.night);
    } else {
      p.rect(2, 14, 20, 6, C.sky2);
      p.rect(4, 5, 5, 2, C.white);
      p.rect(14, 8, 6, 2, C.white);
    }
    p.rect(11, 2, 2, 18, C.frame);
    p.rect(2, 10, 20, 2, C.frame);
    p.rect(0, 22, 24, 2, C.wood3);
  },
  corkboard: (p) => {
    box(p, 0, 0, 24, 16, C.cork, C.wood2);
    for (let i = 0; i < 12; i++) p.px(2 + ((i * 7) % 20), 2 + ((i * 5) % 12), C.cork2);
    p.rect(3, 3, 6, 5, C.amber);
    p.px(5, 3, C.red);
    p.rect(12, 2, 7, 6, C.white);
    p.rect(13, 4, 5, 1, C.paper2);
    p.rect(13, 6, 3, 1, C.paper2);
    p.px(15, 2, C.blue);
    p.rect(6, 9, 6, 5, C.sky);
    p.px(8, 9, C.leaf2);
    p.rect(15, 10, 5, 4, C.pink);
    p.px(17, 10, C.ink);
  },
  bookshelf: (p) => {
    p.rect(0, 0, 16, 32, C.wood2);
    p.rect(1, 1, 14, 30, C.wood4);
    for (let s = 0; s < 4; s++) {
      const bottom = 8 + s * 7;
      books(p, 1, bottom, 14, s * 5 + 1);
      p.rect(1, bottom, 14, 1, C.wood);
    }
    p.rect(0, 30, 16, 2, C.wood);
  },
  armchair: (p) => {
    p.rect(2, 1, 12, 8, C.teal2);
    p.rect(3, 2, 10, 6, C.teal);
    p.rect(0, 5, 3, 8, C.teal2);
    p.rect(13, 5, 3, 8, C.teal2);
    p.rect(3, 9, 10, 4, C.teal);
    p.rect(3, 9, 10, 1, C.teal3);
    p.rect(1, 13, 14, 1, C.teal2);
    p.rect(1, 14, 1, 2, C.wood2);
    p.rect(14, 14, 1, 2, C.wood2);
  },
  neon_sign: (p, { on, night }) => {
    p.rect(0, 0, 24, 8, C.ink);
    text(p, 2, 1, 'STUDY', on || night ? C.pink : '#9d4a7a');
    p.rect(0, 7, 24, 1, C.ink2);
  },

  // ----------------------------------------------------------------- large
  bed: (p) => {
    p.rect(0, 0, 3, 16, C.wood2);
    p.rect(1, 1, 1, 14, C.wood);
    p.rect(3, 7, 29, 5, C.white);
    p.rect(4, 4, 6, 4, C.paper);
    p.rect(4, 4, 6, 1, C.white);
    p.rect(10, 6, 22, 6, C.indigo);
    p.rect(10, 6, 22, 1, C.indigo2);
    p.rect(10, 11, 22, 1, C.indigo2);
    p.rect(3, 12, 29, 2, C.wood);
    p.rect(3, 14, 2, 2, C.wood2);
    p.rect(29, 14, 2, 2, C.wood2);
  },
  sofa: (p) => {
    p.rect(1, 2, 30, 8, C.teal2);
    p.rect(2, 3, 28, 6, C.teal);
    p.rect(0, 5, 4, 9, C.teal2);
    p.rect(28, 5, 4, 9, C.teal2);
    p.rect(4, 9, 12, 4, C.teal);
    p.rect(16, 9, 12, 4, C.teal);
    p.rect(4, 9, 12, 1, C.teal3);
    p.rect(16, 9, 12, 1, C.teal3);
    p.rect(16, 9, 1, 4, C.teal2);
    p.rect(8, 5, 5, 4, C.amber);
    p.rect(1, 13, 30, 1, C.teal2);
    p.rect(2, 14, 1, 2, C.wood2);
    p.rect(29, 14, 1, 2, C.wood2);
  },
  bookcase_wide: (p) => {
    p.rect(0, 0, 32, 32, C.wood2);
    p.rect(1, 1, 30, 30, C.wood4);
    p.rect(15, 1, 2, 30, C.wood2);
    for (let s = 0; s < 4; s++) {
      const bottom = 8 + s * 7;
      books(p, 1, bottom, 14, s * 3 + 2);
      books(p, 17, bottom, 14, s * 3 + 5);
      p.rect(1, bottom, 30, 1, C.wood);
    }
    p.rect(0, 30, 32, 2, C.wood);
  },
  server_rack: (p, { on }) => {
    p.rect(0, 0, 16, 32, C.ink);
    p.rect(1, 1, 14, 29, C.ink2);
    for (let u = 0; u < 6; u++) {
      const y = 2 + u * 4;
      p.rect(2, y, 12, 3, C.ink3);
      for (let v = 5; v < 12; v += 2) p.rect(v, y + 1, 1, 1, C.ink);
      const blink = (u * 3 + 1) % 4 !== 0;
      p.px(3, y + 1, on && blink ? C.leaf3 : C.emerald2);
      p.px(4, y + 1, on && u % 2 ? C.amber : C.metal3);
    }
    p.rect(1, 30, 2, 2, C.metal3);
    p.rect(13, 30, 2, 2, C.metal3);
  },
  battlestation: (p, { on }) => {
    const screen = (x: number) => {
      box(p, x, 1, 11, 8, on ? C.screenOn : C.screenOff, C.ink);
      if (on) {
        p.rect(x + 2, 3, 5, 1, C.leaf3);
        p.rect(x + 2, 5, 7, 1, C.emerald);
        p.rect(x + 2, 7, 3, 1, C.leaf3);
      }
      p.rect(x + 5, 9, 1, 2, C.metal3);
      p.rect(x + 3, 11, 5, 1, C.metal3);
    };
    screen(1);
    screen(13);
    p.rect(4, 11, 12, 1, C.ink3);
    p.rect(18, 11, 2, 1, C.white);
    p.rect(0, 12, 25, 2, C.ink2);
    p.rect(0, 12, 25, 1, C.ink3);
    p.rect(1, 14, 2, 10, C.ink);
    p.rect(22, 14, 2, 10, C.ink);
    // tower
    box(p, 26, 9, 6, 15, C.ink2, C.ink);
    p.rect(27, 11, 1, 10, on ? C.indigo : C.ink3);
    p.rect(29, 11, 2, 2, C.metal3);
    p.px(30, 15, on ? C.leaf3 : C.metal3);
  },
  piano: (p) => {
    p.rect(1, 0, 30, 12, C.ink);
    p.rect(2, 1, 28, 1, C.ink3);
    p.rect(10, 4, 12, 4, C.ink2);
    p.rect(11, 5, 4, 2, C.paper);
    p.rect(17, 5, 4, 2, C.paper);
    p.rect(0, 12, 32, 4, C.white);
    for (let x = 2; x < 31; x += 4) p.rect(x, 12, 1, 2, C.ink);
    for (let x = 0; x < 32; x += 2) p.px(x, 15, C.paper2);
    p.rect(0, 16, 32, 2, C.ink);
    p.rect(2, 18, 2, 6, C.ink);
    p.rect(28, 18, 2, 6, C.ink);
    p.rect(14, 22, 4, 1, C.amber2);
  },

  // -------------------------------------------------------------- featured
  telescope: (p, { night }) => {
    for (let i = 0; i < 11; i++) p.rect(2 + i, 12 - i, 3, 3, i > 8 ? C.ink : C.white);
    p.rect(2, 12, 2, 3, C.metal3);
    if (night) p.px(15, 0, C.star);
    p.rect(7, 13, 2, 2, C.metal3);
    for (let i = 0; i < 9; i++) {
      p.px(7 - Math.floor(i * 0.6), 15 + i, C.metal2);
      p.px(8 + Math.floor(i * 0.6), 15 + i, C.metal2);
      p.px(8, 15 + i, C.metal3);
    }
  },
  aquarium: (p, { on }) => {
    p.rect(0, 0, 24, 16, C.metal3);
    p.rect(1, 1, 22, 14, C.sky2);
    p.rect(1, 1, 22, 3, C.sky);
    p.rect(1, 12, 22, 3, C.amber2);
    for (const x of [3, 4, 19]) p.rect(x, 7, 1, 5, C.leaf2);
    p.rect(18, 8, 1, 4, C.leaf);
    const fx = on ? 12 : 7;
    p.rect(fx, 6, 3, 2, C.orange);
    p.px(fx + 3, 6, C.orange2);
    p.px(fx + 3, 7, C.orange2);
    p.px(fx, 6, C.ink);
    p.rect(15, 10, 2, 1, C.red);
    p.px(9, 4, C.white);
    p.px(10, 2, C.white);
    p.rect(0, 16, 24, 2, C.wood);
    p.rect(1, 18, 22, 6, C.wood2);
    p.rect(3, 19, 8, 4, C.wood);
    p.rect(13, 19, 8, 4, C.wood);
  },
  arcade_cabinet: (p, { on }) => {
    p.rect(1, 0, 14, 32, C.purple2);
    p.rect(2, 1, 12, 4, C.amber);
    p.rect(4, 2, 8, 2, C.amber2);
    box(p, 2, 6, 12, 10, on ? '#0b1021' : C.ink, C.ink);
    if (on) {
      p.rect(5, 8, 1, 1, C.leaf3);
      p.rect(9, 9, 2, 1, C.pink);
      p.rect(4, 13, 8, 1, C.sky);
      p.rect(7, 11, 2, 2, C.amber);
    }
    p.rect(0, 16, 16, 4, C.purple);
    p.rect(3, 15, 1, 2, C.ink);
    p.rect(2, 14, 3, 1, C.red);
    p.px(9, 17, C.red);
    p.px(11, 17, C.blue);
    p.px(13, 17, C.amber);
    p.rect(2, 20, 12, 12, C.purple2);
    p.rect(6, 24, 4, 3, C.ink);
    p.rect(7, 25, 2, 1, C.amber);
  },
  cat: (p) => {
    p.rect(3, 3, 10, 5, C.amber2);
    p.rect(2, 4, 12, 4, C.amber2);
    p.rect(5, 3, 1, 4, C.orange);
    p.rect(8, 3, 1, 4, C.orange);
    p.rect(11, 4, 1, 3, C.orange);
    p.rect(11, 2, 4, 4, C.amber2);
    p.px(11, 1, C.amber2);
    p.px(14, 1, C.amber2);
    p.px(12, 4, C.ink);
    p.px(14, 4, C.ink);
    p.rect(1, 6, 10, 2, C.amber);
    p.rect(1, 7, 6, 1, C.orange);
    p.px(15, 0, C.metal2);
    p.px(14, 0, C.metal3);
  },

  // ---------------------------------------------------- more paints (bases)
  wall_stripes: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.stripeA);
    for (let x = 0; x < w; x += 8) p.rect(x, 0, 3, h, C.stripeB);
  },
  wall_dots: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.stripeA);
    for (let y = 2; y < h; y += 6) for (let x = (y / 6) % 2 ? 5 : 2; x < w; x += 6) p.rect(x, y, 2, 2, C.dot);
  },
  wall_check: (p, { w, h }) => {
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) p.rect(x, y, 4, 4, (x + y) % 8 ? C.stripeA : C.stripeB);
  },
  wall_wainscot: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.stripeA);
    const top = Math.floor(h * 0.55);
    p.rect(0, top, w, h - top, C.panel);
    p.rect(0, top, w, 1, C.panel2);
    for (let x = 4; x < w; x += 12) p.rect(x, top + 3, 8, h - top - 5, C.panel2);
  },
  wall_panel: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.panel);
    for (let x = 0; x < w; x += 6) p.rect(x, 0, 1, h, C.panel2);
    for (let y = 9; y < h; y += 13) for (let x = 2; x < w; x += 18) p.px(x, y, C.panel2);
  },
  floor_concrete: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.concrete);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 3) if (hash(x, y) > 0.82) p.px(x, y, C.concrete2);
    for (let x = 31; x < w; x += 32) p.rect(x, 0, 1, h, C.concrete2);
  },
  floor_tatami: (p, { w, h }) => {
    p.rect(0, 0, w, h, C.tatami);
    for (let y = 1; y < h; y += 2) p.rect(0, y, w, 1, C.tatami2);
    for (let x = 0; x < w; x += 32) p.rect(x, 0, 2, h, C.ink2);
    p.rect(0, 0, w, 1, C.ink2);
  },
  floor_herringbone: (p, { w, h }) => {
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 8) {
        const flip = ((x + y) / 4) % 2;
        p.rect(x, y, 8, 4, flip ? C.hbone : C.hbone2);
        p.rect(x + (flip ? 0 : 7), y, 1, 4, C.walnut3);
      }
    }
  },

  // ------------------------------------------------- more furniture (bases)
  rocking_chair: (p) => {
    p.rect(2, 0, 1, 10, C.wood2);
    p.rect(3, 1, 1, 8, C.wood2);
    for (let y = 2; y < 9; y += 2) p.rect(4, y, 5, 1, C.wood);
    p.rect(2, 9, 12, 2, C.wood3);
    p.rect(12, 6, 2, 3, C.wood2);
    p.rect(3, 11, 1, 3, C.wood2);
    p.rect(12, 11, 1, 3, C.wood2);
    p.rect(1, 14, 14, 1, C.wood2);
    p.px(0, 13, C.wood2);
    p.px(15, 13, C.wood2);
  },
  floor_cushion: (p) => {
    p.rect(1, 3, 14, 4, C.teal);
    p.rect(0, 4, 16, 3, C.teal);
    p.rect(1, 3, 14, 1, C.teal3);
    p.rect(0, 7, 16, 1, C.teal2);
    p.px(7, 5, C.teal2);
    p.px(8, 5, C.teal2);
  },
  gaming_chair: (p) => {
    p.rect(1, 0, 6, 8, C.ink);
    p.rect(1, 0, 1, 8, C.racing);
    p.rect(6, 0, 1, 8, C.racing);
    p.rect(3, 1, 2, 2, C.ink3);
    p.rect(0, 8, 8, 2, C.ink);
    p.rect(0, 8, 8, 1, C.racing);
    p.rect(3, 10, 2, 3, C.metal3);
    p.rect(0, 13, 8, 1, C.metal2);
    p.px(0, 14, C.ink);
    p.px(4, 14, C.ink);
    p.px(7, 14, C.ink);
  },
  dresser: (p) => {
    p.rect(14, 0, 6, 4, C.paper);
    p.rect(15, 1, 4, 2, C.sky);
    box(p, 0, 4, 24, 12, C.wood, C.wood2);
    for (let r = 0; r < 3; r++) {
      p.rect(1, 7 + r * 3, 22, 1, C.wood2);
      p.rect(7, 5 + r * 3, 2, 1, C.metal);
      p.rect(15, 5 + r * 3, 2, 1, C.metal);
    }
    p.rect(1, 4, 22, 1, C.wood3);
  },
  wardrobe: (p) => {
    box(p, 0, 0, 16, 31, C.wood, C.wood2);
    p.rect(1, 1, 14, 1, C.wood3);
    p.rect(8, 2, 1, 27, C.wood2);
    p.rect(6, 13, 1, 3, C.metal);
    p.rect(10, 13, 1, 3, C.metal);
    p.rect(2, 4, 4, 6, C.wood3);
    p.rect(11, 4, 4, 6, C.wood3);
    p.rect(1, 31, 2, 1, C.wood2);
    p.rect(13, 31, 2, 1, C.wood2);
  },
  nightstand: (p, { on }) => {
    box(p, 1, 2, 6, 4, C.ink, C.ink2);
    p.rect(2, 3, 4, 2, on ? C.red : C.red2);
    box(p, 0, 6, 8, 8, C.wood, C.wood2);
    p.rect(1, 9, 6, 1, C.wood2);
    p.px(4, 8, C.metal);
    p.px(4, 11, C.metal);
    p.rect(1, 14, 1, 2, C.wood2);
    p.rect(6, 14, 1, 2, C.wood2);
  },
  ladder_shelf: (p) => {
    for (let y = 0; y < 32; y++) {
      p.px(2 + Math.floor(y / 8), y, C.wood2);
      p.px(13 - Math.floor(y / 16), y, C.wood2);
    }
    for (const [y, x0, x1] of [[7, 3, 13], [15, 4, 13], [23, 5, 12], [30, 5, 12]]) p.rect(x0, y, x1 - x0, 1, C.wood3);
    foliage(p, 8, 4, 2);
    p.rect(7, 5, 3, 2, C.pot);
    books(p, 5, 15, 7, 4);
    p.rect(7, 19, 4, 4, C.white);
    p.rect(8, 20, 2, 2, C.sky);
    books(p, 6, 30, 6, 1);
  },
  file_cabinet: (p) => {
    box(p, 0, 0, 8, 24, C.metal2, C.metal3);
    for (let r = 0; r < 3; r++) {
      p.rect(1, 7 + r * 8, 6, 1, C.metal3);
      p.rect(3, 3 + r * 8, 2, 1, C.white);
      p.rect(2, 2 + r * 8, 4, 1, C.metal);
    }
  },
  string_lights: (p, { on, night }) => {
    const lit = on || night;
    const bulbs = [C.red, C.amber, C.leaf3, C.sky, C.pink];
    for (let x = 0; x < 32; x++) {
      const y = 1 + Math.round(2.5 * Math.sin((x / 32) * Math.PI));
      p.px(x, y, C.ink3);
      if (x % 4 === 2) {
        p.rect(x, y + 1, 1, 2, lit ? bulbs[(x / 4) % 5 | 0] : C.metal2);
        if (lit) p.px(x, y + 3, C.glow);
      }
    }
  },
  lava_lamp: (p, { on }) => {
    p.rect(3, 0, 2, 1, C.metal2);
    p.rect(2, 1, 4, 8, '#3b0764');
    p.rect(3, on ? 2 : 6, 2, 2, C.pink);
    p.rect(3, on ? 6 : 3, 1, 1, C.pink);
    p.rect(4, 7, 1, 1, C.pink);
    p.rect(1, 9, 6, 2, C.metal2);
    p.rect(2, 11, 4, 2, C.metal3);
    p.rect(1, 13, 6, 3, C.metal2);
  },
  monstera: (p) => {
    foliage(p, 5, 5, 4);
    foliage(p, 11, 4, 4);
    foliage(p, 8, 9, 3);
    for (const [x, y] of [[4, 5], [11, 3], [12, 6], [7, 9]]) p.px(x, y, C.leaf2);
    p.rect(4, 11, 8, 1, C.pot2);
    p.rect(5, 12, 6, 4, C.pot);
  },
  snake_plant: (p) => {
    for (const [x, top] of [[2, 1], [3, 4], [4, 0], [5, 3]]) {
      p.rect(x, top, 1, 11 - top, C.leaf2);
      p.px(x, top + 2, C.leaf3);
    }
    p.rect(1, 11, 6, 5, C.white);
    p.rect(1, 11, 6, 1, C.paper2);
  },
  bonsai: (p) => {
    p.rect(1, 1, 6, 2, C.leaf2);
    p.rect(2, 0, 3, 1, C.leaf);
    p.rect(4, 3, 1, 2, C.wood2);
    p.rect(3, 4, 1, 1, C.wood2);
    p.rect(0, 5, 8, 1, C.ink3);
    p.rect(1, 6, 6, 2, C.pot2);
  },
  fan: (p, { on }) => {
    p.rect(1, 0, 6, 6, C.metal);
    p.rect(2, 1, 4, 4, C.metal3);
    if (on) {
      p.rect(2, 3, 4, 1, C.white);
      p.rect(3, 1, 1, 4, C.white);
    } else {
      p.rect(3, 2, 2, 2, C.white);
    }
    p.rect(3, 6, 2, 8, C.metal2);
    p.rect(1, 14, 6, 2, C.metal3);
  },
  globe: (p) => {
    p.rect(2, 0, 4, 7, C.sky2);
    p.rect(1, 1, 6, 5, C.sky2);
    p.rect(2, 1, 2, 2, C.leaf2);
    p.rect(4, 4, 2, 2, C.leaf2);
    p.rect(0, 2, 1, 4, C.amber2);
    p.rect(3, 7, 2, 6, C.amber2);
    p.rect(1, 13, 6, 3, C.wood2);
  },
  mini_fridge: (p) => {
    box(p, 0, 0, 8, 16, C.fridge, C.fridge2);
    p.rect(1, 5, 6, 1, C.fridge2);
    p.rect(6, 2, 1, 2, C.metal2);
    p.rect(6, 7, 1, 3, C.metal2);
    p.px(2, 2, C.red);
    p.px(3, 8, C.blue);
  },
  easel: (p) => {
    p.rect(2, 1, 12, 10, C.white);
    p.rect(3, 2, 10, 4, C.sky);
    p.rect(3, 6, 10, 4, C.leaf2);
    p.rect(9, 3, 2, 2, C.amber);
    p.rect(1, 11, 14, 1, C.wood2);
    for (let y = 0; y < 24; y++) {
      p.px(4 - Math.floor(y / 8), y, C.wood);
      p.px(11 + Math.floor(y / 8), y, C.wood);
    }
    p.rect(7, 0, 2, 24, C.wood2);
  },
  guitar_stand: (p) => {
    p.rect(3, 0, 2, 9, C.wood4);
    p.rect(2, 0, 4, 2, C.ink);
    p.rect(1, 9, 6, 5, C.amber2);
    p.rect(0, 13, 8, 8, C.amber2);
    p.rect(3, 15, 2, 2, C.ink);
    p.rect(1, 20, 6, 1, C.wood2);
    p.rect(2, 21, 1, 3, C.ink3);
    p.rect(5, 21, 1, 3, C.ink3);
  },
  dog: (p) => {
    p.rect(1, 3, 11, 5, C.dog);
    p.rect(0, 5, 13, 3, C.dog);
    p.rect(10, 2, 5, 5, C.dog);
    p.rect(14, 4, 2, 2, C.dog2);
    p.rect(10, 2, 2, 4, C.dog2);
    p.px(13, 4, C.ink);
    p.rect(2, 4, 4, 2, C.dog2);
    p.rect(0, 7, 16, 1, C.dog2);
    p.px(15, 0, C.metal2);
  },
  hamster_cage: (p, { on }) => {
    p.rect(0, 13, 16, 3, C.blue);
    for (let x = 0; x < 16; x += 3) p.rect(x, 2, 1, 11, C.metal);
    p.rect(0, 1, 16, 1, C.metal);
    p.rect(2, 0, 12, 1, C.metal);
    p.rect(8, 6, 6, 6, C.metal2);
    p.rect(9, 7, 4, 4, C.ink2);
    p.rect(on ? 10 : 3, on ? 8 : 10, 3, 2, C.amber);
    p.rect(2, 12, 5, 1, C.glow);
  },
  xmas_tree: (p, { on, night }) => {
    for (let i = 0; i < 6; i++) p.rect(7 - i - 1, 3 + i * 4, (i + 1) * 2 + 2, 4, i % 2 ? C.leaf2 : C.leaf);
    p.rect(6, 0, 4, 3, C.amber);
    p.px(7, 0, C.glow);
    const lit = on || night;
    for (const [x, y, c] of [[7, 6, C.red], [5, 11, C.blue], [10, 14, C.amber], [3, 19, C.pink], [12, 22, C.red], [8, 24, C.sky]] as const) {
      p.px(x, y, lit ? c : C.metal2);
    }
    p.rect(6, 27, 4, 2, C.wood2);
    p.rect(4, 29, 8, 3, C.red2);
  },
  coffee_table: (p) => {
    p.rect(14, 0, 3, 3, C.white);
    p.px(17, 1, C.white);
    p.rect(3, 1, 6, 2, C.amber2);
    p.rect(0, 3, 24, 2, C.wood3);
    p.rect(0, 4, 24, 1, C.wood);
    p.rect(1, 5, 2, 3, C.wood2);
    p.rect(21, 5, 2, 3, C.wood2);
  },
  tv_stand: (p, { on }) => {
    box(p, 1, 0, 22, 13, on ? '#1e3a8a' : C.screenOff, C.ink);
    if (on) {
      p.rect(4, 3, 8, 4, C.sky);
      p.rect(13, 7, 6, 3, C.amber);
    }
    p.rect(10, 13, 4, 2, C.ink3);
    box(p, 0, 15, 24, 9, C.wood, C.wood2);
    p.rect(12, 16, 1, 7, C.wood2);
    p.rect(3, 18, 6, 2, C.ink);
  },
  record_player: (p, { on }) => {
    p.rect(0, 2, 16, 2, C.wood4);
    p.rect(3, 0, 8, 2, C.ink);
    p.rect(5, 0, 4, 1, on ? C.red : C.ink3);
    p.rect(12, 0, 1, 2, C.metal);
    box(p, 0, 4, 16, 12, C.wood, C.wood2);
    books(p, 2, 14, 12, 7);
  },
  printer_3d: (p, { on }) => {
    p.rect(0, 0, 16, 2, C.ink);
    p.rect(0, 0, 2, 16, C.ink);
    p.rect(14, 0, 2, 16, C.ink);
    p.rect(on ? 9 : 5, 2, 3, 3, C.metal);
    p.px(on ? 10 : 6, 5, C.amber);
    p.rect(5, 10, 6, 2, C.orange);
    p.rect(6, 8, 4, 2, C.orange);
    p.rect(2, 12, 12, 1, C.metal2);
    p.rect(0, 13, 16, 3, C.ink2);
    p.px(3, 14, on ? C.leaf3 : C.metal3);
  },
  robot: (p, { on }) => {
    p.px(4, 0, C.red);
    p.rect(4, 1, 1, 2, C.metal2);
    box(p, 1, 3, 7, 5, C.metal, C.metal3);
    p.px(3, 5, on ? C.leaf3 : C.ink);
    p.px(5, 5, on ? C.leaf3 : C.ink);
    box(p, 0, 8, 8, 6, C.metal, C.metal3);
    p.rect(3, 10, 2, 2, on ? C.sky : C.metal2);
    p.rect(1, 14, 2, 2, C.metal3);
    p.rect(5, 14, 2, 2, C.metal3);
  },
  wall_tv: (p, { on }) => {
    box(p, 0, 0, 24, 15, on ? '#1e3a8a' : C.screenOff, C.ink);
    if (on) {
      p.rect(3, 3, 9, 5, C.sky);
      p.rect(14, 9, 7, 3, C.leaf3);
    }
    p.rect(10, 15, 4, 1, C.ink3);
  },
  calendar: (p) => {
    p.rect(1, 1, 14, 15, C.white);
    p.rect(1, 1, 14, 4, C.red);
    p.rect(4, 0, 1, 2, C.ink3);
    p.rect(11, 0, 1, 2, C.ink3);
    for (let y = 7; y < 15; y += 2) for (let x = 3; x < 14; x += 2) p.px(x, y, C.paper2);
    p.rect(8, 10, 2, 2, C.red);
  },
  mirror: (p) => {
    p.rect(4, 0, 8, 16, C.amber2);
    p.rect(0, 4, 16, 8, C.amber2);
    p.rect(2, 2, 12, 12, C.amber2);
    p.rect(5, 2, 6, 12, C.sky);
    p.rect(2, 5, 12, 6, C.sky);
    p.rect(3, 3, 10, 10, C.sky);
    p.rect(5, 4, 2, 4, C.white);
  },
  world_map: (p) => {
    box(p, 0, 0, 24, 16, C.sky2, C.wood2);
    p.rect(3, 3, 5, 4, C.leaf2);
    p.rect(5, 7, 2, 5, C.leaf2);
    p.rect(11, 3, 4, 3, C.leaf2);
    p.rect(12, 6, 3, 5, C.leaf2);
    p.rect(16, 3, 6, 4, C.leaf2);
    p.rect(18, 10, 3, 2, C.leaf2);
    p.px(19, 5, C.red);
  },
  whiteboard: (p) => {
    box(p, 0, 0, 24, 15, C.white, C.metal2);
    p.rect(2, 3, 9, 1, C.blue);
    p.rect(2, 5, 6, 1, C.blue);
    p.rect(13, 3, 1, 7, C.red);
    p.rect(13, 9, 8, 1, C.red);
    p.rect(14, 7, 2, 1, C.leaf2);
    p.rect(16, 5, 2, 1, C.leaf2);
    p.rect(18, 4, 2, 1, C.leaf2);
    p.rect(4, 15, 16, 1, C.metal3);
  },
  vinyl_wall: (p) => {
    for (let i = 0; i < 3; i++) {
      const x = i * 8;
      box(p, x, 0, 8, 8, C.ink, C.ink3);
      p.rect(x + 2, 2, 4, 4, C.ink2);
      p.rect(x + 3, 3, 2, 2, [C.red, C.amber, C.sky][i]);
    }
  },
  guitar_wall: (p) => {
    p.rect(3, 0, 2, 2, C.ink);
    p.rect(3, 2, 2, 9, C.wood4);
    p.rect(1, 11, 6, 4, C.guitar);
    p.rect(0, 15, 8, 7, C.guitar);
    p.rect(1, 15, 2, 1, C.guitar2);
    p.rect(2, 17, 4, 1, C.white);
    p.rect(3, 19, 2, 1, C.ink);
  },
  tapestry: (p) => {
    p.rect(0, 0, 16, 1, C.wood2);
    p.rect(1, 1, 14, 21, C.cloth);
    for (let y = 4; y < 20; y += 5) p.rect(2, y, 12, 1, C.cloth3);
    p.rect(6, 8, 4, 4, C.cloth3);
    p.rect(7, 9, 2, 2, C.cloth2);
    for (let x = 1; x < 15; x += 2) p.rect(x, 22, 1, 2, C.cloth2);
  },
  photo_frames: (p) => {
    box(p, 0, 1, 6, 6, C.sky, C.ink);
    box(p, 7, 0, 5, 7, C.amber, C.wood2);
    box(p, 13, 2, 3, 4, C.pink, C.ink);
    p.px(2, 4, C.leaf2);
    p.px(9, 3, C.white);
  },
  ac_unit: (p, { on }) => {
    box(p, 0, 1, 24, 6, C.white, C.paper2);
    p.rect(2, 5, 20, 1, C.paper2);
    p.px(21, 3, on ? C.leaf3 : C.metal2);
    if (on) for (let x = 4; x < 20; x += 4) p.px(x, 7, C.sky);
  },
  coat_hooks: (p) => {
    p.rect(0, 0, 16, 2, C.wood);
    for (const x of [2, 7, 12]) p.px(x, 2, C.metal3);
    p.rect(1, 3, 4, 5, C.navy);
    p.rect(2, 3, 2, 1, C.navy2);
    p.rect(11, 3, 3, 4, C.amber2);
    p.rect(11, 3, 1, 1, C.wood2);
  },
  certificate: (p) => {
    box(p, 0, 0, 8, 7, C.paper, C.amber2);
    p.rect(2, 2, 4, 1, C.metal2);
    p.rect(2, 4, 3, 1, C.metal2);
    p.px(5, 5, C.red);
  },
};
