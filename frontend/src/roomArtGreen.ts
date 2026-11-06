// MY ROOM art pack: GREEN & PETS: house plants of every size (pots in the
// S.b slot so variants change the pot) and the animals that share the room,
// with their beds, bowls and climbing shelves. Pets curl up at night.
import { C, disc, S, type Art, type Painter } from './roomPaint';

/** A plant pot (slot b) of width w standing at the bottom of an h-pixel piece. */
const pot = (p: Painter, x: number, w: number, h: number, ph: number) => {
  p.rect(x, h - ph, w, 1, S.b3);
  p.rect(x, h - ph + 1, w, ph - 1, S.b);
  p.rect(x + w - 1, h - ph + 1, 1, ph - 1, S.b2);
  p.rect(x, h - ph + 1, w, 1, S.b2);
};

/** A broad leaf centred at (x, y) leaning one way. */
const leaf = (p: Painter, x: number, y: number, dir: number, c: string = C.leaf2, vein: string = C.leaf) => {
  p.rect(x - 1, y, 3, 2, c);
  p.px(x + dir, y - 1, c);
  p.px(x, y, vein);
};

export const GREEN_ART: Record<string, Art> = {
  // --------------------------------------------------------------- plants
  fiddle_leaf: (p) => {
    p.rect(7, 4, 2, 15, C.wood2);
    const leaves: [number, number, number][] = [
      [5, 1, -1], [10, 2, 1], [4, 5, -1], [11, 6, 1], [5, 9, -1], [10, 10, 1], [6, 13, -1], [10, 14, 1], [8, 0, 1],
    ];
    for (const [x, y, d] of leaves) {
      p.rect(x - 2, y, 4, 3, C.leaf2);
      p.rect(x - 1, y - 1, 2, 1, C.leaf2);
      p.px(x - 1 + (d > 0 ? 1 : 0), y + 1, C.leaf);
    }
    pot(p, 4, 8, 24, 5);
  },
  pothos_hanging: (p) => {
    p.rect(2, 0, 1, 3, C.paper2);
    p.rect(5, 0, 1, 3, C.paper2);
    pot(p, 1, 6, 7, 4);
    for (const [x, len] of [
      [1, 8],
      [3, 6],
      [6, 9],
    ] as const) {
      for (let y = 5; y < 5 + len; y++) p.px(x + ((y >> 1) % 2), y, C.leaf2);
      for (let y = 6; y < 5 + len; y += 2) p.px(x + 1 - ((y >> 1) % 2), y, C.leaf3);
    }
  },
  zz_plant: (p) => {
    for (const [x, top] of [
      [2, 2],
      [4, 0],
      [6, 3],
    ] as const) {
      p.rect(x, top, 1, 11 - top, C.leaf2);
      for (let y = top + 1; y < 10; y += 2) {
        p.px(x - 1, y, '#166534');
        p.px(x + 1, y, '#166534');
      }
    }
    pot(p, 1, 7, 16, 5);
  },
  calathea: (p) => {
    const blade = (x: number, y: number) => {
      p.rect(x, y, 3, 4, '#3f6212');
      p.rect(x + 1, y, 1, 4, '#a3e635');
      p.px(x, y + 3, '#7f1d1d');
    };
    blade(0, 4);
    blade(5, 3);
    blade(2, 0);
    blade(3, 6);
    pot(p, 1, 6, 16, 5);
  },
  string_of_pearls: (p) => {
    p.rect(3, 0, 1, 2, C.paper2);
    pot(p, 1, 6, 6, 4);
    for (const x of [1, 3, 5, 6]) {
      const len = 6 + ((x * 3) % 5);
      for (let y = 6; y < 6 + len; y += 2) p.px(x, y, '#86efac');
      for (let y = 7; y < 6 + len; y += 2) p.px(x, y, '#166534');
    }
  },
  staghorn_fern: (p) => {
    p.rect(2, 2, 12, 12, S.w);
    p.rect(2, 2, 12, 1, S.w3);
    disc(p, 8, 9, 3, '#65a30d');
    const prong = (x: number, y: number, dx: number) => {
      for (let i = 0; i < 5; i++) p.rect(x + dx * i, y - Math.floor(i / 2), 2, 1, C.leaf2);
      p.px(x + dx * 5, y - 3, C.leaf2);
      p.px(x + dx * 5, y - 1, C.leaf2);
    };
    prong(8, 7, -1);
    prong(8, 7, 1);
    prong(7, 11, -1);
    p.px(8, 12, '#3f6212');
  },
  jade_plant: (p) => {
    p.rect(3, 2, 1, 3, C.wood2);
    p.rect(4, 3, 2, 1, C.wood2);
    for (const [x, y] of [
      [1, 1], [3, 0], [5, 1], [6, 3], [2, 3],
    ] as const) {
      p.rect(x, y, 2, 2, C.leaf);
      p.px(x, y, C.leaf3);
    }
    pot(p, 1, 6, 8, 3);
  },
  peace_lily: (p) => {
    for (const [x, y, d] of [
      [1, 6, -1], [6, 5, 1], [3, 8, -1], [5, 9, 1],
    ] as const)
      leaf(p, x + 1, y, d, '#166534', C.leaf2);
    for (const [x, y] of [
      [2, 1],
      [5, 2],
    ] as const) {
      p.rect(x, y, 2, 3, C.white);
      p.px(x, y + 1, '#fde68a');
      p.rect(x, y + 3, 1, 4, C.leaf2);
    }
    pot(p, 1, 6, 16, 5);
  },
  pilea: (p) => {
    for (const [x, y] of [
      [1, 1], [5, 0], [0, 4], [6, 3], [3, 2],
    ] as const) {
      disc(p, x + 1, y + 1, 1.2, C.leaf);
      p.px(x + 1, y + 1, C.leaf2);
    }
    p.rect(3, 3, 1, 2, C.leaf2);
    pot(p, 1, 6, 8, 3);
  },
  cactus_barrel: (p) => {
    disc(p, 4, 3.5, 3, '#15803d');
    for (const x of [2, 4, 6]) p.rect(x, 1, 1, 4, '#166534');
    p.rect(3, 0, 2, 1, '#f472b6');
    pot(p, 1, 6, 8, 2);
  },
  air_plants: (p) => {
    p.rect(0, 2, 16, 1, S.m);
    for (const x of [2, 7, 12]) {
      p.rect(x, 3, 1, 1, S.m2);
      p.rect(x - 1, 4, 3, 1, S.m);
      for (let i = 0; i < 3; i++) {
        p.px(x - 1 - i, 5 - i + 2, '#a3e635');
        p.px(x + 1 + i, 5 - i + 2, '#a3e635');
      }
      p.rect(x, 5, 1, 3, '#65a30d');
    }
  },
  plant_stand_trio: (p) => {
    p.rect(0, 15, 16, 1, S.w2);
    for (const [x, top] of [
      [1, 9],
      [6, 3],
      [11, 7],
    ] as const) {
      p.rect(x + 1, top + 4, 1, 15 - top - 4, S.w2);
      p.rect(x + 2, top + 4, 1, 15 - top - 4, S.w2);
      p.rect(x, top + 3, 4, 1, S.w);
    }
    p.rect(1, 9, 4, 3, S.b);
    p.rect(0, 6, 6, 3, C.leaf2);
    p.rect(6, 3, 4, 3, S.b);
    p.rect(6, 0, 4, 3, '#4d7c0f');
    p.px(5, 1, '#4d7c0f');
    p.rect(11, 7, 4, 3, S.b);
    p.rect(11, 4, 4, 3, C.leaf);
    p.px(13, 3, '#f472b6');
  },
  herb_garden_led: (p, { on }) => {
    p.rect(1, 0, 14, 1, S.m);
    p.rect(2, 1, 12, 1, on ? '#e9d5ff' : '#c4b5fd');
    p.rect(7, 1, 2, 3, S.m2);
    for (const x of [2, 6, 10]) {
      p.rect(x, 3, 4, 2, x === 6 ? '#65a30d' : C.leaf);
      p.px(x + 1, 2, C.leaf3);
    }
    p.rect(0, 5, 16, 3, S.m);
    p.rect(0, 5, 16, 1, S.m3);
  },
  kokedama: (p) => {
    p.rect(3, 0, 1, 6, C.paper2);
    disc(p, 3.5, 9, 2.8, '#4d7c0f');
    p.px(2, 8, '#65a30d');
    p.px(4, 10, '#3f6212');
    for (const [x, y] of [
      [1, 5], [4, 4], [6, 6],
    ] as const)
      p.rect(x, y, 2, 2, C.leaf);
  },
  ficus_tree: (p) => {
    p.rect(7, 12, 2, 13, C.wood2);
    p.px(6, 14, C.wood2);
    p.px(9, 16, C.wood2);
    disc(p, 8, 7, 7, C.leaf2);
    disc(p, 4, 10, 4, C.leaf2);
    disc(p, 12, 11, 3.5, C.leaf2);
    for (let i = 0; i < 18; i++) p.px(2 + ((i * 7) % 13), 1 + ((i * 5) % 13), C.leaf);
    for (let i = 0; i < 8; i++) p.px(3 + ((i * 5) % 11), 3 + ((i * 3) % 10), C.leaf3);
    pot(p, 3, 10, 32, 7);
  },
  maple_bonsai: (p) => {
    p.rect(7, 6, 2, 5, C.wood2);
    p.rect(5, 6, 2, 1, C.wood2);
    p.rect(9, 5, 3, 1, C.wood2);
    disc(p, 5, 4, 3, '#dc2626');
    disc(p, 11, 3, 3, '#ea580c');
    disc(p, 8, 2, 2.5, '#b91c1c');
    p.px(4, 3, '#fca5a5');
    p.px(11, 2, '#fdba74');
    p.rect(2, 11, 12, 1, '#65a30d');
    p.rect(1, 12, 14, 3, S.b);
    p.rect(1, 12, 14, 1, S.b3);
    p.rect(2, 15, 2, 1, S.b2);
    p.rect(12, 15, 2, 1, S.b2);
  },
  lucky_bamboo: (p) => {
    for (const [x, top] of [
      [2, 0],
      [4, 1],
      [5, 2],
    ] as const) {
      p.rect(x, top + 1, 1, 7 - top - 1, '#65a30d');
      p.px(x, top + 3, '#3f6212');
      p.px(x + 1, top, C.leaf);
      p.px(x - 1, top + 1, C.leaf);
    }
    p.rect(1, 5, 6, 3, '#bae6fd');
    p.rect(1, 6, 6, 2, '#7dd3fc');
  },
  propagation_wall: (p) => {
    p.rect(0, 1, 16, 7, S.w);
    p.rect(0, 1, 16, 1, S.w3);
    for (const x of [2, 7, 12]) {
      p.rect(x, 3, 2, 4, '#e0f2fe');
      p.rect(x, 5, 2, 2, '#bae6fd');
      p.px(x, 6, C.cork2);
      p.rect(x, 1, 1, 2, C.leaf2);
      p.px(x + 1, 0, C.leaf);
    }
  },
  tomato_planter: (p) => {
    p.rect(3, 0, 1, 11, C.cork);
    p.rect(4, 2, 1, 9, C.leaf2);
    for (const [x, y] of [
      [1, 3], [5, 5], [2, 7], [5, 9],
    ] as const)
      p.rect(x, y, 2, 1, C.leaf);
    for (const [x, y] of [
      [5, 3], [2, 5], [6, 7],
    ] as const)
      p.rect(x, y, 2, 2, '#ef4444');
    pot(p, 0, 8, 16, 5);
  },
  hanging_terrarium: (p) => {
    p.rect(3, 0, 1, 4, C.metal2);
    disc(p, 3.5, 9, 3.6, '#e0f2fe');
    p.rect(1, 10, 6, 2, C.cork);
    p.rect(2, 9, 2, 1, '#65a30d');
    p.rect(4, 8, 1, 2, C.leaf2);
    p.px(5, 9, '#f472b6');
    p.px(2, 6, C.white);
  },
  pampas_vase: (p) => {
    for (const [x, top] of [
      [2, 0],
      [4, 1],
      [6, 0],
    ] as const) {
      p.rect(x, top + 3, 1, 7 - top, '#d6c08a');
      p.rect(x - 1, top, 2, 4, '#efe6d2');
      p.px(x, top, '#faf5ea');
    }
    p.rect(2, 9, 4, 1, S.b3);
    p.rect(1, 10, 6, 6, S.b);
    p.rect(1, 10, 1, 6, S.b3);
    p.rect(6, 10, 1, 6, S.b2);
  },
  flower_buckets: (p) => {
    for (const [x, c] of [
      [0, '#facc15'],
      [5, '#f472b6'],
      [10, '#f97316'],
    ] as const) {
      for (let i = 0; i < 3; i++) {
        p.rect(x + 1 + i * 2 - 1, 1 + (i % 2), 2, 2, c);
        p.px(x + 1 + i * 2 - 1, 1 + (i % 2), '#7c2d12');
      }
      p.rect(x + 1, 3, 4, 1, C.leaf2);
      p.rect(x + 1, 4, 4, 4, S.m);
      p.rect(x + 1, 4, 4, 1, S.m3);
    }
  },
  // --------------------------------------------------------------- pets
  cat_shelves: (p, { night }) => {
    for (const [x, y] of [
      [0, 13],
      [9, 9],
      [2, 4],
    ] as const) {
      p.rect(x, y, 7, 2, S.w);
      p.rect(x, y, 7, 1, S.w3);
      p.rect(x + 1, y, 5, 1, '#d6c08a');
    }
    // a cat on the top shelf: sitting by day, a loaf at night
    if (night) {
      p.rect(3, 2, 5, 2, '#f97316');
      p.px(3, 1, '#f97316');
      p.px(5, 1, '#f97316');
      p.rect(3, 2, 2, 1, '#c2410c');
    } else {
      p.rect(3, 0, 3, 2, '#f97316');
      p.px(3, -1, '#f97316');
      p.px(4, 1, C.ink);
      p.rect(3, 2, 4, 2, '#f97316');
      p.rect(7, 1, 1, 3, '#c2410c');
    }
  },
  cat_bed_round: (p, { night }) => {
    p.rect(0, 4, 8, 4, S.a);
    p.rect(0, 4, 8, 1, S.a3);
    p.rect(1, 7, 6, 1, S.a2);
    p.rect(1, 3, 6, 2, '#a3a3a3');
    p.px(1, 2, '#a3a3a3');
    p.px(3, 2, '#a3a3a3');
    if (!night) {
      p.px(2, 3, C.amber);
      p.px(4, 3, C.amber);
    } else {
      p.rect(2, 3, 3, 1, '#737373');
    }
    p.rect(5, 4, 2, 1, '#737373');
  },
  cat_scratcher: (p) => {
    p.rect(0, 2, 8, 1, S.a);
    p.rect(0, 1, 8, 1, S.a3);
    p.rect(3, 3, 3, 11, C.cork);
    for (let y = 4; y < 14; y += 2) p.rect(3, y, 3, 1, C.cork2);
    p.rect(0, 14, 8, 2, S.a);
    p.rect(0, 14, 8, 1, S.a3);
    p.rect(1, 3, 1, 3, C.red);
    p.px(1, 6, '#fde047');
  },
  kitten_box: (p, { night }) => {
    p.rect(0, 3, 8, 5, C.cork);
    p.rect(0, 3, 8, 1, '#d8b483');
    p.rect(0, 2, 2, 1, C.cork2);
    p.rect(6, 2, 2, 1, C.cork2);
    if (night) {
      p.rect(2, 2, 4, 1, C.white);
    } else {
      p.rect(2, 0, 4, 3, C.white);
      p.px(2, -1, C.white);
      p.px(5, -1, C.white);
      p.px(3, 1, '#22c55e');
      p.px(5, 1, '#22c55e');
      p.px(2, 0, '#fbcfe8');
    }
  },
  dog_crate: (p, { night }) => {
    p.rect(0, 2, 16, 14, S.m);
    p.rect(1, 3, 14, 12, C.ink2);
    p.rect(2, 13, 12, 2, '#c46a4a');
    // the dog: head up by day, curled at night
    if (night) {
      p.rect(4, 10, 8, 3, '#a16207');
      p.rect(4, 10, 3, 2, '#713f12');
    } else {
      p.rect(5, 9, 7, 4, '#a16207');
      p.rect(9, 6, 4, 4, '#a16207');
      p.px(9, 5, '#713f12');
      p.px(12, 5, '#713f12');
      p.px(11, 7, C.ink);
      p.px(13, 8, C.ink);
    }
    for (let x = 3; x < 15; x += 2) p.rect(x, 3, 1, 12, S.m);
    p.rect(0, 2, 16, 1, S.m3);
  },
  dog_toys: (p) => {
    p.rect(1, 1, 2, 3, '#ef4444');
    disc(p, 4.5, 2.5, 1.3, '#a3e635');
    p.rect(5, 0, 1, 2, C.white);
    p.rect(6, 1, 2, 1, C.white);
    p.rect(0, 4, 8, 4, C.oak);
    for (let y = 4; y < 8; y += 2) p.rect(0, y, 8, 1, C.oak3);
  },
  guinea_pigs: (p) => {
    p.rect(0, 2, 16, 6, '#d6c08a');
    for (let x = 0; x < 16; x += 2) p.rect(x, 0, 1, 8, C.metal);
    p.rect(0, 0, 16, 1, C.metal);
    p.rect(2, 4, 4, 3, '#a16207');
    p.rect(2, 4, 2, 2, C.white);
    p.px(5, 5, C.ink);
    p.rect(9, 5, 4, 2, '#f5f5f4');
    p.rect(11, 5, 2, 1, '#78350f');
    p.px(12, 5, C.ink);
    p.rect(13, 6, 2, 1, '#65a30d');
    p.rect(7, 6, 2, 1, C.cork);
  },
  gecko_tank: (p, { on }) => {
    p.rect(0, 0, 16, 2, C.ink3);
    p.rect(2, 1, 4, 2, on ? '#fb923c' : '#9a3412');
    p.rect(0, 2, 16, 11, '#e0f2fe');
    p.rect(1, 10, 14, 3, '#d6c08a');
    p.rect(9, 7, 5, 3, '#a16207');
    p.rect(9, 7, 5, 1, '#ca8a04');
    p.rect(3, 9, 4, 1, '#facc15');
    p.rect(2, 10, 1, 1, '#facc15');
    p.px(6, 9, C.ink);
    p.rect(12, 4, 1, 6, C.leaf2);
    p.px(11, 4, C.leaf);
    p.rect(0, 2, 1, 11, C.ink3);
    p.rect(15, 2, 1, 11, C.ink3);
    p.rect(0, 13, 16, 3, S.w);
    p.rect(0, 13, 16, 1, S.w3);
  },
  shrimp_tank: (p) => {
    p.rect(0, 1, 8, 6, '#bae6fd');
    p.rect(0, 1, 8, 1, '#e0f2fe');
    p.rect(0, 5, 8, 2, '#65a30d');
    p.rect(2, 2, 1, 3, C.leaf2);
    p.rect(5, 3, 1, 2, C.leaf2);
    p.rect(3, 4, 2, 1, '#ef4444');
    p.px(6, 2, '#ef4444');
    p.rect(0, 7, 8, 1, C.ink3);
  },
  pet_fountain: (p) => {
    p.rect(1, 3, 6, 4, S.m);
    p.rect(1, 3, 6, 1, S.m3);
    p.rect(3, 1, 2, 2, '#7dd3fc');
    p.px(4, 0, '#bae6fd');
    p.rect(2, 4, 4, 1, '#38bdf8');
    p.rect(0, 7, 8, 1, S.m2);
  },
  feed_station: (p) => {
    for (const x of [0, 4]) {
      p.rect(x, 5, 4, 3, S.b);
      p.rect(x, 5, 4, 1, S.b3);
    }
    p.rect(1, 4, 2, 1, '#a16207');
    p.rect(5, 4, 2, 1, '#7dd3fc');
    p.rect(1, 1, 2, 3, C.white);
    p.px(2, 2, C.red);
  },
  betta_vase: (p) => {
    disc(p, 4, 4.5, 3.4, '#bae6fd');
    p.rect(1, 1, 6, 1, '#e0f2fe');
    p.rect(3, 4, 2, 2, '#dc2626');
    p.rect(5, 3, 1, 3, '#b91c1c');
    p.rect(2, 7, 4, 1, C.leaf2);
    p.px(2, 5, C.leaf);
  },
  pet_corgi: (p, { night }) => {
    if (night) {
      p.rect(2, 4, 11, 4, '#ea8c3c');
      p.rect(2, 6, 11, 2, C.white);
      p.rect(11, 3, 4, 4, '#ea8c3c');
      p.rect(12, 5, 3, 2, C.white);
      p.rect(12, 4, 2, 1, '#9a4a2c');
      p.px(11, 2, '#ea8c3c');
      return;
    }
    p.rect(2, 3, 10, 3, '#ea8c3c');
    p.rect(3, 5, 9, 1, C.white);
    p.rect(11, 0, 4, 4, '#ea8c3c');
    p.px(11, -1, '#ea8c3c');
    p.px(11, 0, '#9a4a2c');
    p.px(14, 0, '#9a4a2c');
    p.rect(13, 2, 3, 2, C.white);
    p.px(13, 1, C.ink);
    p.px(15, 2, C.ink);
    for (const x of [3, 5, 9, 11]) p.rect(x, 6, 1, 2, '#ea8c3c');
    p.px(1, 3, '#ea8c3c');
  },
  pet_black_cat: (p, { night }) => {
    const c = '#27272a';
    if (night) {
      p.rect(1, 5, 6, 3, c);
      p.rect(0, 6, 8, 2, c);
      p.px(1, 4, c);
      p.px(3, 4, c);
      p.rect(5, 6, 2, 1, '#3f3f46');
      return;
    }
    p.px(1, 0, c);
    p.px(4, 0, c);
    p.rect(1, 1, 4, 3, c);
    p.px(2, 2, '#facc15');
    p.px(4, 2, '#facc15');
    p.rect(2, 4, 4, 3, c);
    p.rect(1, 7, 6, 1, c);
    p.rect(6, 3, 1, 4, c);
    p.px(7, 2, c);
  },
};
