// MY ROOM art pack: SHELVES & CLOSETS: everywhere things are kept. Racks,
// wardrobes and closets, chests and boxes, and the small organisers that
// go up on the wall by the door. Recolourable parts use the S slots.
import { books, box, C, disc, S, type Art, type Painter } from './roomPaint';

const SPINES = ['#c2483b', '#3d5a80', '#d4a017', '#2f5d3a', '#efe6d2', '#7c3a78', '#0d9488', '#f97362'];

/** A clothes run hanging from a rail at y: shirts and jackets of set colours. */
const hanging = (p: Painter, x: number, y: number, w: number, seed: number) => {
  const cloth = ['#3d5a80', '#efe6d2', '#c2483b', '#3f3f46', '#8fa98b', '#d4a017', '#f1f1f1'];
  for (let cx = x, i = seed; cx < x + w - 1; cx += 3, i++) {
    const len = 8 + ((i * 5) % 6);
    p.rect(cx, y + 1, 2, len, cloth[i % cloth.length]);
    p.px(cx, y, C.metal2);
  }
};

export const SHELVES_ART: Record<string, Art> = {
  shelf_steel: (p) => {
    p.rect(0, 0, 1, 32, S.m2);
    p.rect(15, 0, 1, 32, S.m2);
    for (const y of [0, 8, 16, 24, 31]) p.rect(0, y, 16, 1, S.m);
    p.rect(1, 3, 6, 5, C.cork);
    p.rect(1, 3, 6, 1, C.cork2);
    p.rect(8, 4, 6, 4, C.white);
    p.rect(9, 5, 4, 1, C.sky2);
    books(p, 1, 16, 8, 3);
    p.rect(10, 12, 4, 4, '#3b82f6');
    p.rect(1, 19, 13, 5, C.cork);
    p.rect(1, 19, 13, 1, C.cork2);
    p.rect(7, 19, 1, 5, C.cork2);
    p.rect(2, 27, 5, 4, C.ink3);
    p.rect(9, 28, 5, 3, C.paper);
  },
  shelf_wire: (p) => {
    p.rect(0, 0, 1, 24, S.m);
    p.rect(15, 0, 1, 24, S.m);
    for (const y of [0, 8, 16, 23]) {
      p.rect(0, y, 16, 1, S.m);
      for (let x = 1; x < 15; x += 2) p.px(x, y + 1, S.m2);
    }
    for (const [y, c] of [
      [3, C.oak],
      [11, C.paper],
      [18, C.oak],
    ] as const) {
      p.rect(1, y, 6, 5, c);
      p.rect(8, y + 1, 6, 4, c);
      for (let x = 1; x < 15; x += 2) p.px(x, y + 2, C.oak3);
    }
  },
  bookcase_arch: (p) => {
    p.rect(3, 0, 10, 1, S.w);
    p.rect(1, 1, 14, 2, S.w);
    p.rect(0, 3, 16, 29, S.w);
    p.rect(2, 2, 12, 1, S.w2);
    p.rect(1, 3, 14, 26, S.w2);
    for (let r = 0; r < 4; r++) {
      const y = 3 + r * 6;
      books(p, 2, y + 6, 12, r * 2 + 1);
      p.rect(1, y + 6, 14, 1, S.w);
    }
    p.rect(9, 3, 4, 3, C.leaf2);
    p.rect(10, 5, 2, 1, C.pot);
    p.rect(0, 29, 16, 3, S.w3);
    p.rect(1, 31, 14, 1, S.w2);
  },
  sideboard: (p) => {
    p.rect(3, 1, 3, 4, '#efe6d2');
    p.rect(4, 0, 1, 1, C.leaf);
    books(p, 12, 5, 5, 2);
    p.rect(22, 2, 6, 3, C.ink3);
    p.rect(23, 3, 4, 1, C.metal);
    p.rect(0, 5, 32, 1, S.w3);
    p.rect(0, 6, 32, 7, S.w);
    for (let i = 0; i < 4; i++) {
      p.rect(1 + i * 8, 7, 6, 5, S.w2);
      p.rect(2 + i * 8, 8, 4, 3, S.w3);
    }
    p.rect(0, 13, 32, 1, S.w2);
    for (const x of [2, 29]) {
      p.px(x, 14, S.w2);
      p.px(x + (x < 10 ? -1 : 1), 15, S.w2);
    }
  },
  wardrobe_wide: (p) => {
    p.rect(0, 0, 24, 2, S.w3);
    p.rect(0, 2, 24, 28, S.w);
    for (const x of [1, 9, 17]) {
      p.rect(x, 3, 6, 25, S.w3);
      p.rect(x + 1, 4, 4, 23, S.w);
    }
    for (const x of [7, 9, 15]) p.rect(x, 13, 1, 4, C.metal);
    p.rect(0, 29, 24, 1, S.w2);
    p.rect(1, 30, 2, 2, S.w2);
    p.rect(21, 30, 2, 2, S.w2);
  },
  armoire: (p) => {
    p.rect(0, 0, 16, 1, S.w2);
    p.rect(1, 1, 14, 2, S.w3);
    p.rect(6, 0, 4, 1, S.w3);
    p.rect(0, 3, 16, 24, S.w);
    for (const x of [1, 8]) {
      p.rect(x, 4, 7, 22, S.w2);
      p.rect(x + 1, 5, 5, 9, S.w3);
      p.rect(x + 1, 16, 5, 9, S.w3);
      p.rect(x + 2, 6, 3, 7, S.w);
      p.rect(x + 2, 17, 3, 7, S.w);
    }
    p.px(7, 14, C.amber2);
    p.px(8, 14, C.amber2);
    p.rect(0, 27, 16, 3, S.w2);
    p.rect(1, 30, 2, 2, S.w2);
    p.rect(13, 30, 2, 2, S.w2);
  },
  closet_open: (p) => {
    p.rect(0, 0, 24, 32, S.w);
    p.rect(1, 1, 22, 30, S.w2);
    p.rect(1, 1, 22, 1, S.w);
    // hats and boxes, a rail of clothes, shoes
    p.rect(2, 3, 5, 3, C.cork);
    p.rect(8, 3, 5, 3, C.white);
    p.rect(15, 4, 6, 2, C.ink3);
    p.rect(1, 6, 22, 1, S.w);
    p.rect(1, 8, 15, 1, C.metal);
    hanging(p, 2, 8, 14, 0);
    p.rect(16, 7, 1, 24, S.w);
    for (const y of [11, 16, 21]) {
      p.rect(17, y, 6, 1, S.w);
      p.rect(18, y - 3, 4, 3, SPINES[y % SPINES.length]);
      p.rect(18, y - 3, 4, 1, C.white);
    }
    p.rect(1, 26, 15, 1, S.w);
    for (let x = 2; x < 15; x += 4) {
      p.rect(x, 28, 3, 2, ['#f1f1f1', '#c2483b', '#3f3f46', '#d4a017'][(x >> 2) % 4]);
      p.rect(x, 29, 3, 1, C.ink3);
    }
    p.rect(0, 31, 24, 1, S.w2);
  },
  shoe_cabinet: (p) => {
    p.rect(2, 1, 3, 3, C.cork);
    p.rect(3, 0, 1, 1, C.metal);
    p.rect(9, 2, 5, 2, C.metal2);
    p.rect(10, 1, 3, 1, C.metal);
    p.rect(0, 4, 16, 1, S.w3);
    p.rect(0, 5, 16, 11, S.w);
    p.rect(1, 6, 6, 8, S.w3);
    p.rect(9, 6, 6, 8, S.w3);
    for (let y = 7; y < 14; y += 2) {
      p.rect(2, y, 4, 1, S.w2);
      p.rect(10, y, 4, 1, S.w2);
    }
    p.px(7, 10, C.metal);
    p.px(8, 10, C.metal);
  },
  cube_shelf_wide: (p) => {
    p.rect(0, 0, 32, 16, S.w);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) p.rect(1 + c * 8, 1 + r * 7, 7, 6, S.w2);
    const fill: [number, number, string][] = [
      [0, 0, 'books'],
      [1, 0, '#8fa98b'],
      [2, 0, 'plant'],
      [3, 0, '#efe6d2'],
      [0, 1, '#3f3f46'],
      [1, 1, 'books'],
      [2, 1, '#d4a017'],
      [3, 1, 'vinyl'],
    ];
    for (const [c, r, what] of fill) {
      const x = 1 + c * 8;
      const y = 1 + r * 7;
      if (what === 'books') books(p, x, y + 6, 7, c + r * 3);
      else if (what === 'plant') {
        p.rect(x + 2, y + 3, 3, 3, C.pot);
        p.rect(x + 1, y + 1, 5, 2, C.leaf2);
      } else if (what === 'vinyl') {
        for (let i = 0; i < 6; i++) p.rect(x + i, y + 1, 1, 5, SPINES[i]);
      } else {
        p.rect(x, y + 1, 7, 5, what);
        p.rect(x + 2, y + 2, 3, 1, C.white);
      }
    }
  },
  fabric_drawers: (p) => {
    p.rect(0, 0, 8, 24, C.ink3);
    p.rect(0, 0, 8, 1, C.metal2);
    for (let i = 0; i < 4; i++) {
      const y = 1 + i * 6;
      p.rect(1, y, 6, 5, i % 2 ? S.a2 : S.a);
      p.rect(1, y, 6, 1, S.a3);
      p.rect(3, y + 2, 2, 1, C.ink3);
    }
    p.rect(0, 23, 1, 1, C.ink2);
    p.rect(7, 23, 1, 1, C.ink2);
  },
  blanket_chest: (p) => {
    p.rect(0, 0, 24, 2, S.w3);
    p.rect(0, 1, 24, 1, S.w);
    p.rect(1, 2, 22, 5, S.w);
    p.rect(2, 3, 9, 3, S.w2);
    p.rect(13, 3, 9, 3, S.w2);
    p.rect(11, 2, 2, 2, C.amber2);
    p.rect(1, 7, 2, 1, S.w2);
    p.rect(21, 7, 2, 1, S.w2);
  },
  tool_cabinet: (p) => {
    p.rect(0, 0, 16, 2, S.m3);
    p.rect(0, 2, 16, 11, S.m);
    for (let i = 0; i < 4; i++) {
      p.rect(1, 3 + i * 3 - (i > 0 ? 0 : 0), 14, 2, S.m2);
      p.rect(5, 3 + i * 3, 6, 1, C.metal);
    }
    p.rect(14, 0, 2, 1, C.metal);
    p.rect(0, 13, 16, 1, S.m2);
    disc(p, 2, 14.5, 1.3, C.ink2);
    disc(p, 13.5, 14.5, 1.3, C.ink2);
  },
  cardboard_boxes: (p) => {
    const carton = (x: number, y: number, w: number, h: number) => {
      p.rect(x, y, w, h, C.cork);
      p.rect(x, y, w, 1, '#d8b483');
      p.rect(x + Math.floor(w / 2) - 1, y, 2, h, '#e0d0a8');
      p.rect(x + w - 1, y + 1, 1, h - 1, C.cork2);
    };
    carton(0, 7, 9, 9);
    carton(9, 9, 7, 7);
    carton(2, 1, 7, 6);
    p.rect(1, 12, 3, 2, C.ink3);
    p.rect(11, 12, 3, 1, C.red);
  },
  plastic_crates: (p) => {
    for (const y of [0, 8]) {
      p.rect(0, y, 8, 8, S.a);
      p.rect(0, y, 8, 1, S.a3);
      for (let x = 1; x < 7; x += 2) p.rect(x, y + 2, 1, 4, S.a2);
      p.rect(2, y + 1, 4, 1, S.a2);
    }
  },
  // --------------------------------------------------------------- wall
  wall_pockets: (p) => {
    p.rect(1, 0, 14, 1, C.wood2);
    p.rect(1, 1, 14, 15, S.a);
    p.rect(1, 1, 1, 15, S.a3);
    for (const y of [3, 8, 12]) {
      p.rect(2, y, 12, 3, S.a2);
      p.rect(2, y, 12, 1, S.a3);
      p.rect(7, y, 1, 3, S.a);
    }
    p.rect(3, 2, 1, 2, C.red);
    p.rect(9, 6, 3, 2, C.white);
    p.rect(4, 11, 2, 1, C.amber);
  },
  wall_cubes: (p) => {
    for (const [x, y] of [
      [0, 0],
      [8, 4],
      [1, 9],
    ] as const) {
      p.rect(x, y, 7, 7, S.w);
      p.rect(x + 1, y + 1, 5, 5, S.w2);
    }
    p.rect(2, 3, 2, 3, C.pot);
    p.rect(1, 1, 4, 2, C.leaf2);
    books(p, 9, 10, 5, 2);
    p.rect(3, 12, 3, 3, C.amber);
  },
  key_shelf: (p) => {
    p.rect(2, 2, 4, 2, C.white);
    p.rect(3, 1, 3, 1, C.paper);
    p.rect(10, 1, 3, 3, C.leaf2);
    p.rect(10, 3, 3, 1, C.pot);
    p.rect(0, 4, 16, 2, S.w);
    p.rect(0, 4, 16, 1, S.w3);
    for (const [x, c] of [
      [3, C.amber],
      [7, C.metal],
      [11, '#c2483b'],
    ] as const) {
      p.px(x, 6, C.metal2);
      p.rect(x, 7, 1, 1, c);
    }
  },
  wall_cd_rack: (p) => {
    p.rect(0, 0, 8, 24, S.w);
    p.rect(1, 1, 6, 22, S.w2);
    for (let y = 1; y < 23; y += 2) p.rect(1, y, 6, 1, SPINES[(y * 3) % SPINES.length]);
    for (let y = 2; y < 23; y += 2) p.rect(1, y, 6, 1, C.ink3);
    p.rect(0, 0, 8, 1, S.w3);
  },
  bag_hooks: (p) => {
    p.rect(0, 0, 24, 2, S.w);
    p.rect(0, 0, 24, 1, S.w3);
    for (const x of [3, 11, 19]) p.px(x, 2, C.metal2);
    p.rect(2, 2, 1, 2, C.ink3);
    p.rect(0, 4, 6, 4, C.ink3);
    p.rect(1, 5, 4, 1, C.ink2);
    p.rect(10, 2, 1, 3, C.cork2);
    p.rect(8, 4, 6, 4, '#efe6d2');
    p.rect(9, 5, 3, 2, C.leaf);
    p.rect(19, 3, 1, 4, C.metal2);
    p.rect(17, 6, 5, 2, '#c2483b');
  },
  wall_magazine: (p) => {
    p.rect(0, 0, 16, 16, S.m);
    p.rect(1, 1, 14, 14, S.m2);
    const covers = ['#fde047', '#f472b6', '#38bdf8', '#22c55e'];
    for (let i = 0; i < 4; i++) {
      const x = 1 + (i % 2) * 7;
      const y = 1 + Math.floor(i / 2) * 7;
      p.rect(x + 1, y, 5, 6, covers[i]);
      p.rect(x + 2, y + 1, 3, 1, C.white);
      p.rect(x, y + 5, 7, 2, S.m);
    }
  },
  curio_shelf: (p) => {
    p.rect(0, 0, 16, 24, S.w);
    for (let r = 0; r < 3; r++) p.rect(1, 1 + r * 7, 14, 6, S.w2);
    // figures, mugs, a globe, a trophy, little things
    p.rect(2, 3, 2, 4, '#f87171');
    p.rect(2, 2, 2, 1, '#fde68a');
    p.rect(6, 4, 3, 3, C.white);
    p.px(9, 5, C.white);
    disc(p, 12.5, 4.5, 2, C.sky2);
    p.rect(12, 6, 1, 1, S.w);
    p.rect(2, 11, 3, 3, C.amber);
    p.rect(3, 10, 1, 1, C.amber);
    books(p, 7, 14, 7, 5);
    p.rect(2, 17, 4, 4, '#a7f3d0');
    p.rect(8, 18, 2, 3, '#c4b5fd');
    p.rect(11, 17, 3, 4, C.paper);
    p.rect(0, 22, 16, 2, S.w2);
  },
  vinyl_cabinet: (p) => {
    p.rect(2, 2, 8, 3, C.ink2);
    disc(p, 6, 2.5, 2, C.ink);
    p.px(6, 2, C.red);
    p.rect(14, 1, 7, 4, C.amber2);
    p.rect(15, 2, 5, 2, '#fde68a');
    p.rect(0, 5, 24, 1, S.w3);
    p.rect(0, 6, 24, 9, S.w);
    p.rect(1, 7, 22, 7, S.w2);
    for (let x = 1; x < 23; x++) p.rect(x, 8 + (x % 4 === 0 ? 1 : 0), 1, 6 - (x % 4 === 0 ? 1 : 0), SPINES[(x * 5) % SPINES.length]);
    p.rect(0, 15, 2, 1, S.w2);
    p.rect(22, 15, 2, 1, S.w2);
  },
  comic_rack: (p) => {
    p.rect(3, 0, 2, 1, S.m);
    p.rect(1, 1, 6, 17, S.m2);
    const covers = ['#fde047', '#ef4444', '#38bdf8', '#22c55e', '#f472b6', '#f97316'];
    for (let i = 0; i < 6; i++) {
      const y = 1 + Math.floor(i / 2) * 6;
      const x = 1 + (i % 2) * 3;
      p.rect(x, y + 1, 3, 4, covers[i]);
      p.px(x + 1, y + 2, C.white);
    }
    p.rect(3, 18, 2, 4, S.m);
    p.rect(0, 22, 8, 2, S.m);
  },
  file_lateral: (p) => {
    p.rect(0, 0, 16, 16, S.m);
    p.rect(0, 0, 16, 1, S.m3);
    for (const y of [2, 9]) {
      p.rect(1, y, 14, 6, S.m3);
      p.rect(6, y + 2, 4, 1, C.ink3);
      p.rect(7, y + 4, 2, 1, C.white);
    }
  },
  linen_cabinet: (p) => {
    p.rect(0, 0, 8, 32, S.w);
    p.rect(0, 0, 8, 1, S.w3);
    p.rect(1, 1, 6, 12, S.w2);
    for (const [y, c] of [
      [3, C.white],
      [6, '#bae6fd'],
      [9, '#f9a8d4'],
    ] as const) {
      p.rect(1, y, 6, 3, c);
      p.rect(1, y, 6, 1, C.white);
    }
    p.rect(1, 14, 6, 16, S.w3);
    p.rect(2, 15, 4, 14, S.w);
    p.px(6, 21, C.metal);
    p.rect(0, 30, 8, 2, S.w2);
  },
  bookshelf_tree: (p) => {
    p.rect(7, 0, 2, 32, S.w);
    p.rect(0, 30, 16, 2, S.w);
    for (const [x, y, w] of [
      [1, 6, 6],
      [9, 11, 6],
      [1, 17, 6],
      [9, 23, 6],
    ] as const) {
      books(p, x, y, w, x + y);
      p.rect(x - 1, y, w + 1, 1, S.w);
      if (x < 7) p.px(x - 1, y - 1, S.w);
      else p.px(x + w - 1, y - 1, S.w);
    }
    p.rect(9, 3, 3, 2, C.leaf2);
    p.rect(10, 5, 2, 1, S.w);
  },
  stair_shelf: (p) => {
    p.rect(0, 0, 8, 24, S.w);
    p.rect(8, 8, 8, 16, S.w);
    p.rect(16, 16, 8, 8, S.w);
    p.rect(1, 1, 6, 6, S.w2);
    p.rect(1, 9, 6, 6, S.w2);
    p.rect(9, 9, 6, 6, S.w2);
    p.rect(1, 17, 6, 6, S.w2);
    p.rect(9, 17, 6, 6, S.w2);
    p.rect(17, 17, 6, 6, S.w2);
    books(p, 1, 7, 6, 1);
    p.rect(2, 11, 3, 4, C.pot);
    p.rect(1, 10, 5, 2, C.leaf2);
    books(p, 9, 15, 6, 4);
    p.rect(2, 19, 4, 4, C.cork);
    p.rect(10, 19, 4, 4, C.white);
    p.rect(11, 20, 2, 2, C.sky2);
    books(p, 17, 23, 6, 7);
  },
  media_tower: (p) => {
    p.rect(0, 0, 8, 24, S.w);
    p.rect(1, 1, 6, 22, S.w2);
    for (let y = 1; y < 23; y += 4) {
      for (let x = 1; x < 7; x++) p.rect(x, y + 1, 1, 3, SPINES[(x + y) % SPINES.length]);
      p.rect(1, y + 4, 6, 1, S.w);
    }
  },
  figure_case: (p, { on }) => {
    p.rect(0, 0, 16, 24, S.m);
    p.rect(1, 1, 14, 21, on ? '#f1f5f9' : '#c7d2db');
    p.rect(1, 1, 14, 1, on ? '#ffffff' : C.metal);
    for (const y of [8, 15]) p.rect(1, y, 14, 1, '#e0f2fe');
    // figures on three glass shelves
    p.rect(3, 4, 2, 4, '#ef4444');
    p.rect(3, 3, 2, 1, '#fde68a');
    p.rect(7, 5, 3, 3, '#22c55e');
    p.rect(12, 3, 2, 5, '#6366f1');
    p.rect(3, 11, 3, 4, '#f472b6');
    p.rect(8, 10, 2, 5, '#fbbf24');
    p.rect(11, 12, 3, 3, C.ink3);
    p.rect(2, 18, 4, 4, '#38bdf8');
    p.rect(7, 19, 2, 3, '#a855f7');
    p.rect(11, 18, 3, 4, '#f97316');
    p.rect(7, 1, 1, 21, S.m3);
    p.rect(0, 22, 16, 2, S.m2);
  },
  dresser_mirror: (p) => {
    p.rect(5, 0, 14, 1, S.w);
    p.rect(4, 1, 16, 10, S.w);
    p.rect(5, 2, 14, 8, '#cfe8f3');
    p.rect(7, 3, 1, 4, C.white);
    p.rect(8, 3, 1, 2, C.white);
    p.rect(2, 9, 3, 2, '#f9a8d4');
    p.rect(20, 8, 2, 3, '#fde68a');
    p.rect(0, 11, 24, 2, S.w3);
    p.rect(0, 12, 24, 1, S.w);
    p.rect(1, 13, 22, 9, S.w);
    for (const y of [14, 18]) {
      box(p, 2, y, 9, 3, S.w, S.w2);
      box(p, 13, y, 9, 3, S.w, S.w2);
      p.px(6, y + 1, C.amber2);
      p.px(17, y + 1, C.amber2);
    }
    p.rect(1, 22, 2, 2, S.w2);
    p.rect(21, 22, 2, 2, S.w2);
  },
  wicker_baskets: (p) => {
    for (const [x, w, h] of [
      [0, 7, 6],
      [7, 9, 5],
    ] as const) {
      p.rect(x, 8 - h, w, h, C.oak);
      for (let y = 8 - h + 1; y < 8; y += 2) p.rect(x, y, w, 1, C.oak3);
      p.rect(x, 8 - h, w, 1, C.oak2);
    }
    p.rect(1, 1, 4, 2, '#efe6d2');
    p.rect(9, 2, 5, 2, '#8fa98b');
  },
  crate_wall: (p) => {
    for (const [x, y] of [
      [0, 0],
      [9, 6],
      [17, 1],
    ] as const) {
      p.rect(x, y, 7, 8, S.w);
      p.rect(x + 1, y + 1, 5, 6, S.w2);
      p.rect(x, y + 3, 7, 1, S.w);
    }
    p.rect(2, 4, 3, 3, C.pot);
    p.rect(1, 1, 5, 2, C.leaf2);
    books(p, 10, 13, 5, 3);
    p.rect(18, 4, 4, 4, C.white);
    p.rect(19, 5, 2, 1, C.sky2);
  },
  bookshelf_narrow: (p) => {
    p.rect(0, 0, 8, 32, S.w);
    p.rect(0, 0, 8, 1, S.w3);
    for (let r = 0; r < 5; r++) {
      const y = 1 + r * 6;
      p.rect(1, y, 6, 5, S.w2);
      books(p, 1, y + 5, 6, r * 3);
      p.rect(0, y + 5, 8, 1, S.w);
    }
    p.rect(0, 31, 8, 1, S.w2);
  },
  map_drawers: (p) => {
    p.rect(3, 2, 10, 3, C.paper);
    p.rect(4, 3, 6, 1, C.sky2);
    p.rect(0, 5, 24, 1, S.w3);
    p.rect(0, 6, 24, 8, S.w);
    for (let y = 6; y < 14; y += 2) {
      p.rect(1, y, 22, 1, S.w2);
      p.rect(11, y + 1, 2, 1, C.amber2);
    }
    p.rect(1, 14, 2, 2, S.w2);
    p.rect(21, 14, 2, 2, S.w2);
  },
  shelf_bracket: (p) => {
    for (const y of [6, 14]) {
      p.rect(0, y, 24, 1, S.w);
      p.rect(0, y, 24, 1, S.w3);
      p.rect(0, y + 1, 24, 1, S.w);
      p.rect(3, y + 2, 1, 2, S.m);
      p.rect(20, y + 2, 1, 2, S.m);
    }
    books(p, 1, 6, 8, 1);
    p.rect(12, 2, 3, 4, C.pot);
    p.rect(11, 0, 5, 2, C.leaf2);
    p.rect(18, 3, 4, 3, C.white);
    p.rect(3, 11, 4, 3, C.amber);
    books(p, 10, 14, 6, 5);
    p.rect(18, 12, 3, 2, C.cork);
  },
  pallet_shelf: (p) => {
    for (const y of [0, 7, 14]) {
      p.rect(0, y, 16, 2, S.w);
      p.rect(0, y, 16, 1, S.w3);
    }
    for (const x of [0, 7, 14]) {
      p.rect(x, 2, 2, 5, S.w2);
      p.rect(x, 9, 2, 5, S.w2);
    }
    p.rect(2, 3, 4, 4, C.leaf2);
    p.rect(3, 5, 2, 2, C.pot);
    books(p, 9, 7, 5, 2);
    p.rect(3, 11, 3, 3, C.white);
    p.rect(9, 10, 4, 4, C.cork);
  },
};
