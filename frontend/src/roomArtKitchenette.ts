// MY ROOM art pack: KITCHENETTE: the corner of a one-room flat where meals
// happen. Counters and fridges, the small machines on them (they hum and
// glow while the stopwatch runs, `on`), a cafe table to eat at, and the
// shelves and rails on the wall above. Recolourable parts use the S slots.
import { box, C, disc, S, text, type Art, type Painter } from './roomPaint';

/** A fridge door seam and handle. */
const handle = (p: Painter, x: number, y: number, h: number) => {
  p.rect(x, y, 1, h, C.metal2);
  p.px(x, y, C.metal);
};

export const KITCHENETTE_ART: Record<string, Art> = {
  // ------------------------------------------------------------ counters
  sink_counter: (p) => {
    // tap, a draining rack with plates
    p.rect(7, 1, 1, 6, C.metal);
    p.rect(7, 1, 4, 1, C.metal);
    p.px(10, 2, C.metal2);
    p.rect(15, 2, 7, 5, C.metal);
    p.rect(16, 2, 1, 4, C.white);
    p.rect(18, 1, 1, 5, '#dbeafe');
    p.rect(20, 3, 1, 3, C.white);
    p.rect(0, 7, 24, 2, C.metal);
    p.rect(0, 7, 24, 1, C.paper);
    p.rect(4, 7, 9, 1, C.metal2);
    box(p, 0, 9, 24, 7, S.w, S.w2);
    p.rect(12, 9, 1, 7, S.w2);
    p.rect(9, 11, 2, 1, C.metal);
    p.rect(14, 11, 2, 1, C.metal);
    p.rect(17, 12, 6, 3, S.w3);
  },
  kitchen_island: (p) => {
    p.rect(3, 4, 4, 3, C.white);
    p.rect(4, 3, 2, 1, C.leaf);
    p.rect(14, 5, 6, 2, C.pot);
    p.rect(14, 4, 6, 1, C.amber2);
    p.rect(0, 7, 24, 2, S.m);
    p.rect(0, 7, 24, 1, S.m3);
    p.rect(1, 9, 22, 7, S.w);
    for (let x = 1; x < 23; x += 3) p.rect(x, 9, 1, 7, S.w2);
    p.rect(1, 9, 22, 1, S.w3);
  },
  fridge_retro: (p) => {
    p.rect(1, 0, 14, 2, S.m3);
    p.rect(0, 1, 16, 23, S.m);
    p.rect(0, 1, 1, 23, S.m3);
    p.rect(15, 1, 1, 23, S.m2);
    p.rect(1, 8, 14, 1, S.m2);
    handle(p, 12, 3, 4);
    handle(p, 12, 10, 6);
    p.rect(3, 3, 4, 1, C.white);
    p.rect(3, 12, 3, 3, '#fde047');
    p.rect(7, 13, 2, 2, C.red);
    p.rect(1, 22, 14, 1, C.metal);
    p.rect(2, 23, 2, 1, C.ink3);
    p.rect(12, 23, 2, 1, C.ink3);
  },
  fridge_two_door: (p) => {
    p.rect(0, 0, 16, 32, S.m);
    p.rect(0, 0, 16, 1, S.m3);
    p.rect(0, 0, 1, 32, S.m3);
    p.rect(15, 0, 1, 32, S.m2);
    p.rect(1, 11, 14, 1, S.m2);
    p.rect(7, 12, 1, 19, S.m2);
    handle(p, 12, 3, 6);
    handle(p, 5, 14, 9);
    handle(p, 9, 14, 9);
    // a magnet calendar and a photo on the door
    p.rect(2, 2, 5, 6, C.white);
    p.rect(2, 2, 5, 1, C.red);
    p.rect(10, 16, 4, 4, '#fef3c7');
    p.px(11, 16, C.blue);
    p.rect(1, 31, 14, 1, S.m2);
  },
  // ------------------------------------------------------- small machines
  rice_cooker: (p, { on }) => {
    p.rect(2, 1, 4, 1, S.m3);
    p.rect(1, 2, 6, 2, S.m);
    p.rect(3, 1, 2, 1, C.ink3);
    p.rect(0, 4, 8, 4, S.m);
    p.rect(0, 4, 8, 1, S.m3);
    p.rect(2, 5, 4, 2, C.ink2);
    p.px(5, 6, on ? '#fb923c' : C.ink3);
    p.rect(3, 5, 1, 1, '#60a5fa');
  },
  electric_kettle: (p) => {
    p.rect(2, 1, 4, 1, S.m3);
    p.rect(1, 2, 5, 5, S.m);
    p.rect(1, 2, 1, 5, S.m3);
    p.rect(0, 2, 1, 2, S.m);
    p.rect(6, 3, 2, 1, S.m2);
    p.rect(7, 3, 1, 3, S.m2);
    p.rect(2, 4, 1, 2, '#bae6fd');
    p.rect(0, 7, 7, 1, C.ink3);
  },
  toaster: (p, { on }) => {
    if (on) {
      p.rect(2, 0, 1, 2, '#fde68a');
      p.rect(5, 0, 1, 2, '#fde68a');
    } else {
      p.rect(2, 1, 1, 1, C.cork);
      p.rect(5, 1, 1, 1, C.cork);
    }
    p.rect(1, 2, 6, 5, S.m);
    p.rect(1, 2, 6, 1, S.m3);
    p.rect(2, 2, 1, 1, C.ink2);
    p.rect(5, 2, 1, 1, C.ink2);
    p.rect(7, 3, 1, 2, C.ink3);
    p.rect(2, 5, 4, 1, on ? '#fb923c' : S.m2);
    p.rect(1, 7, 1, 1, C.ink3);
    p.rect(6, 7, 1, 1, C.ink3);
  },
  microwave_box: (p, { on }) => {
    p.rect(0, 0, 16, 8, S.m);
    p.rect(0, 0, 16, 1, S.m3);
    p.rect(1, 2, 10, 5, on ? '#fde68a' : C.ink2);
    p.rect(2, 3, 8, 3, on ? '#fbbf24' : C.ink3);
    if (on) p.rect(4, 5, 4, 1, C.white);
    p.rect(12, 2, 3, 1, C.ink2);
    p.px(13, 2, on ? C.leaf3 : C.leaf2);
    for (let y = 4; y < 7; y++) p.rect(12, y, 3, 1, y % 2 ? S.m2 : S.m3);
    p.rect(11, 1, 1, 7, S.m2);
  },
  kitchen_rack: (p, { on }) => {
    p.rect(0, 0, 1, 24, S.m2);
    p.rect(15, 0, 1, 24, S.m2);
    for (const y of [0, 7, 15, 22]) p.rect(0, y, 16, 1, S.m);
    // microwave, rice cooker, a toaster oven, baskets
    p.rect(1, 2, 10, 5, C.white);
    p.rect(2, 3, 6, 3, on ? '#fbbf24' : C.ink3);
    p.rect(9, 3, 1, 3, C.metal);
    p.rect(11, 3, 4, 4, C.paper);
    p.rect(12, 2, 2, 1, C.paper2);
    p.rect(1, 10, 7, 5, C.ink3);
    p.rect(2, 11, 5, 2, on ? '#fb923c' : C.ink2);
    p.rect(9, 11, 5, 4, C.cork);
    p.rect(9, 11, 5, 1, C.cork2);
    p.rect(2, 18, 5, 4, C.cork);
    p.rect(9, 18, 5, 4, C.cork);
    p.rect(3, 17, 3, 1, C.leaf);
    p.rect(10, 17, 2, 1, C.orange);
  },
  slim_wagon: (p) => {
    p.rect(0, 0, 8, 14, S.m);
    p.rect(0, 0, 8, 1, S.m3);
    for (const y of [4, 9]) p.rect(1, y, 6, 1, S.m2);
    p.rect(1, 1, 2, 3, C.red);
    p.rect(4, 2, 2, 2, C.amber);
    p.rect(1, 6, 6, 3, C.white);
    p.rect(2, 11, 4, 2, '#7dd3fc');
    p.rect(0, 14, 8, 1, S.m2);
    p.px(0, 15, C.ink2);
    p.px(7, 15, C.ink2);
  },
  water_case: (p) => {
    for (let x = 0; x < 8; x += 2) {
      p.rect(x, 1, 2, 3, '#bae6fd');
      p.px(x, 0, '#60a5fa');
      p.rect(x, 2, 2, 1, '#38bdf8');
    }
    p.rect(0, 4, 8, 4, C.cork);
    p.rect(0, 4, 8, 1, C.cork2);
    p.rect(2, 5, 4, 2, C.sky2);
  },
  rice_bag: (p) => {
    p.rect(1, 0, 6, 1, C.paper2);
    p.rect(0, 1, 8, 7, C.white);
    p.rect(0, 1, 1, 7, C.paper);
    p.rect(2, 3, 4, 3, C.red);
    p.rect(3, 4, 2, 1, C.white);
    p.rect(1, 7, 6, 1, C.paper2);
  },
  veggie_crate: (p) => {
    p.rect(1, 1, 2, 2, C.orange);
    p.px(2, 0, C.leaf);
    p.rect(3, 2, 3, 2, C.paper);
    p.rect(5, 0, 2, 3, C.leaf2);
    p.rect(0, 3, 8, 5, S.w);
    p.rect(0, 3, 8, 1, S.w3);
    p.rect(0, 5, 8, 1, S.w2);
    p.rect(3, 6, 2, 1, S.w2);
  },
  recycle_bins: (p) => {
    for (const [x, c, c2] of [
      [0, '#3b82f6', '#1d4ed8'],
      [5, '#22c55e', '#15803d'],
      [10, '#fbbf24', '#d97706'],
    ] as const) {
      p.rect(x, 2, 5, 1, c2);
      p.rect(x, 3, 5, 5, c);
      p.rect(x + 1, 4, 3, 1, C.white);
      p.rect(x + 4, 3, 1, 5, c2);
    }
    p.rect(1, 1, 2, 1, C.white);
    p.rect(11, 1, 2, 1, '#7dd3fc');
  },
  trash_sorter: (p) => {
    p.rect(1, 2, 6, 2, S.m3);
    p.rect(2, 1, 4, 1, S.m);
    p.rect(1, 4, 6, 11, S.m);
    p.rect(1, 4, 1, 11, S.m3);
    p.rect(6, 4, 1, 11, S.m2);
    p.rect(3, 15, 3, 1, C.ink3);
  },
  step_stool: (p) => {
    p.rect(0, 2, 8, 2, S.a);
    p.rect(0, 2, 8, 1, S.a3);
    p.rect(1, 4, 6, 4, S.a2);
    p.rect(2, 5, 4, 2, S.a);
    p.rect(2, 7, 4, 1, S.a3);
  },
  bar_cart: (p) => {
    p.rect(1, 2, 1, 3, '#16a34a');
    p.rect(3, 1, 1, 4, '#ef4444');
    p.rect(5, 3, 2, 2, C.white);
    p.rect(8, 2, 3, 3, '#fde047');
    p.rect(12, 3, 2, 2, '#bae6fd');
    p.rect(0, 5, 16, 1, S.m);
    p.rect(0, 0, 1, 15, S.m2);
    p.rect(15, 0, 1, 15, S.m2);
    p.rect(14, 0, 2, 1, S.m2);
    p.rect(2, 9, 3, 2, C.white);
    p.rect(7, 8, 6, 3, '#f97316');
    p.rect(0, 11, 16, 1, S.m);
    disc(p, 2.5, 14, 1.6, C.ink2);
    disc(p, 13.5, 14, 1.6, C.ink2);
  },
  cafe_table: (p) => {
    p.rect(4, 4, 3, 3, C.white);
    p.rect(7, 5, 1, 1, C.white);
    p.rect(9, 5, 3, 2, C.pink);
    p.rect(9, 4, 3, 1, C.white);
    p.rect(0, 7, 16, 1, S.w3);
    p.rect(1, 8, 14, 1, S.w);
    p.rect(7, 9, 2, 5, S.m);
    p.rect(4, 14, 8, 1, S.m);
    p.rect(3, 15, 10, 1, S.m2);
  },
  cafe_chair: (p) => {
    p.rect(1, 0, 6, 1, S.m);
    p.rect(1, 1, 1, 8, S.m);
    p.rect(6, 1, 1, 8, S.m);
    for (let x = 2; x < 6; x += 2) p.rect(x, 2, 1, 6, S.m2);
    p.rect(0, 9, 8, 2, C.walnut3);
    p.rect(0, 9, 8, 1, C.oak);
    p.rect(1, 11, 1, 5, S.m);
    p.rect(6, 11, 1, 5, S.m);
    p.rect(1, 13, 6, 1, S.m2);
  },
  high_table: (p) => {
    p.rect(2, 1, 2, 3, '#fde047');
    p.rect(11, 2, 3, 2, C.white);
    p.rect(0, 4, 16, 2, S.w3);
    p.rect(0, 5, 16, 1, S.w);
    p.rect(1, 6, 1, 10, C.ink3);
    p.rect(14, 6, 1, 10, C.ink3);
    p.rect(1, 12, 14, 1, C.ink3);
  },
  coffee_station: (p, { on }) => {
    // the machine, a grinder, mugs
    p.rect(1, 0, 6, 7, C.ink3);
    p.rect(1, 0, 6, 1, C.metal2);
    p.rect(2, 2, 4, 1, on ? '#86efac' : C.ink2);
    p.rect(3, 4, 2, 1, C.metal);
    p.rect(3, 5, 2, 2, C.white);
    p.rect(9, 1, 3, 3, '#7c4a2d');
    p.rect(9, 4, 3, 3, C.metal2);
    p.rect(13, 4, 2, 3, C.white);
    p.rect(14, 5, 1, 1, C.red);
    p.rect(0, 7, 16, 1, S.w3);
    box(p, 0, 8, 16, 8, S.w, S.w2);
    p.rect(8, 8, 1, 8, S.w2);
    p.rect(6, 11, 1, 2, C.metal);
    p.rect(9, 11, 1, 2, C.metal);
  },
  pantry_shelf: (p) => {
    p.rect(0, 0, 1, 24, S.w2);
    p.rect(15, 0, 1, 24, S.w2);
    for (const y of [0, 7, 14, 21]) p.rect(0, y, 16, 1, S.w);
    // jars of pasta, beans and rice; cans; a box of cereal
    for (const [x, c] of [
      [1, '#fde68a'],
      [5, '#b45309'],
      [9, C.white],
    ] as const) {
      p.rect(x, 2, 3, 5, '#dbeafe');
      p.rect(x, 4, 3, 3, c);
      p.rect(x, 1, 3, 1, C.metal2);
    }
    p.rect(13, 3, 2, 4, C.red);
    for (let x = 1; x < 9; x += 3) {
      p.rect(x, 11, 2, 3, C.metal);
      p.rect(x, 12, 2, 1, ['#ef4444', '#22c55e', '#f97316'][x % 3]);
    }
    p.rect(9, 9, 5, 5, '#fbbf24');
    p.rect(10, 10, 3, 2, C.red);
    p.rect(1, 17, 6, 4, C.cork);
    p.rect(8, 18, 6, 3, C.white);
    p.rect(9, 19, 4, 1, C.leaf2);
    p.rect(0, 23, 2, 1, S.w2);
    p.rect(14, 23, 2, 1, S.w2);
  },
  // ------------------------------------------------------------- the wall
  jar_shelf: (p) => {
    for (const [x, c] of [
      [1, '#fde68a'],
      [5, '#7c4a2d'],
      [9, '#f87171'],
      [13, '#86efac'],
    ] as const) {
      p.rect(x, 1, 2, 1, C.metal2);
      p.rect(x, 2, 2, 4, '#e0f2fe');
      p.rect(x, 3, 2, 3, c);
    }
    p.rect(0, 6, 16, 2, S.w);
    p.rect(0, 6, 16, 1, S.w3);
  },
  utensil_rail: (p) => {
    p.rect(0, 1, 16, 1, S.m);
    p.px(0, 2, S.m2);
    p.px(15, 2, S.m2);
    // ladle, spatula, whisk, tongs
    p.rect(2, 2, 1, 4, C.ink3);
    p.rect(1, 6, 3, 2, C.ink3);
    p.rect(6, 2, 1, 3, C.walnut);
    p.rect(5, 5, 3, 3, C.walnut);
    p.rect(10, 2, 1, 2, C.metal2);
    p.rect(9, 4, 3, 4, C.metal);
    p.rect(10, 5, 1, 2, C.metal2);
    p.rect(13, 2, 1, 6, C.metal2);
    p.rect(14, 2, 1, 6, C.metal2);
  },
  teapot_clock: (p) => {
    p.rect(3, 0, 2, 1, S.a2);
    disc(p, 4, 4.5, 3.4, S.a);
    p.rect(0, 3, 1, 3, S.a);
    p.rect(7, 3, 1, 2, S.a2);
    disc(p, 4, 4.5, 2.2, C.white);
    p.rect(4, 3, 1, 2, C.ink);
    p.px(5, 4, C.ink);
  },
  mug_rack: (p) => {
    p.rect(0, 1, 16, 2, S.w);
    p.rect(0, 1, 16, 1, S.w3);
    for (const [x, c] of [
      [1, C.white],
      [5, '#c2483b'],
      [9, '#3d5a80'],
      [13, '#d4a017'],
    ] as const) {
      p.px(x + 1, 3, C.metal2);
      p.rect(x, 4, 2, 3, c);
      p.px(x + 2, 5, c);
    }
  },
  recipe_board: (p) => {
    box(p, 0, 0, 16, 16, '#2f3a33', S.w);
    text(p, 2, 2, 'EAT', C.white);
    for (let y = 9; y < 14; y += 2) p.rect(2, y, 6 + (y % 3) * 2, 1, C.paper2);
    p.rect(11, 9, 3, 3, C.amber);
  },
  plate_wall: (p) => {
    const plates: [number, number, number][] = [
      [5, 5, 4.5],
      [14, 4, 3.5],
      [20, 8, 3.5],
      [11, 11, 3.5],
      [4, 13, 2.5],
    ];
    for (const [x, y, r] of plates) {
      disc(p, x, y, r, C.white);
      disc(p, x, y, r - 1, S.a);
      disc(p, x, y, r - 2, C.white);
      p.px(Math.floor(x), Math.floor(y), S.a2);
    }
  },
  range_hood: (p, { on }) => {
    p.rect(5, 0, 6, 3, S.m2);
    p.rect(1, 3, 14, 3, S.m);
    p.rect(1, 3, 14, 1, S.m3);
    p.rect(0, 6, 16, 1, S.m2);
    p.rect(2, 4, 3, 1, C.ink3);
    p.rect(3, 7, 3, 1, on ? C.glow : C.ink3);
    p.rect(10, 7, 3, 1, on ? C.glow : C.ink3);
  },
  dried_herbs: (p) => {
    p.rect(0, 0, 16, 1, C.wood2);
    for (const [x, c, c2] of [
      [2, '#65a30d', '#3f6212'],
      [7, '#a3a35a', '#7a7a3a'],
      [12, '#7c3a78', '#5c2a59'],
    ] as const) {
      p.rect(x + 1, 1, 1, 2, C.cork2);
      p.rect(x, 3, 3, 3, c);
      p.rect(x, 5, 3, 1, c2);
      p.px(x + 1, 6, c2);
      p.px(x - 1 < 0 ? 0 : x - 1, 4, c);
    }
  },
  wall_cabinet: (p) => {
    p.rect(0, 0, 24, 7, S.w);
    p.rect(0, 0, 24, 1, S.w3);
    for (const x of [1, 9, 17]) p.rect(x, 1, 6, 5, S.w3);
    for (const x of [6, 9, 22]) p.rect(x, 3, 1, 2, C.metal);
    p.rect(0, 7, 24, 1, S.w2);
  },
  tea_shelf: (p) => {
    for (const [x, c, h] of [
      [1, '#2f5d3a', 5],
      [4, '#c2483b', 4],
      [8, '#d4a017', 5],
      [11, '#1e3a6e', 3],
    ] as const) {
      p.rect(x, 6 - h, 3, h, c);
      p.rect(x, 6 - h, 3, 1, C.metal);
      p.rect(x + 1, 7 - h + 1, 1, 1, C.white);
    }
    p.rect(14, 4, 2, 2, C.white);
    p.rect(0, 6, 16, 2, S.w);
    p.rect(0, 6, 16, 1, S.w3);
  },
  // -------------------------------------------------------------- floor
  pickle_crock: (p) => {
    p.rect(2, 0, 4, 1, C.cork);
    p.rect(1, 1, 6, 1, '#7c4a2d');
    p.rect(0, 2, 8, 6, '#a16207');
    p.rect(0, 2, 8, 1, '#ca8a04');
    p.rect(1, 3, 1, 4, '#ca8a04');
    p.rect(3, 4, 3, 2, C.paper);
    p.rect(4, 4, 1, 2, C.red);
  },
  picnic_basket: (p) => {
    p.rect(2, 0, 4, 1, C.wood2);
    p.px(1, 1, C.wood2);
    p.px(6, 1, C.wood2);
    p.rect(0, 2, 8, 2, S.b);
    for (let x = 0; x < 8; x += 2) p.px(x, 2, C.white);
    for (let x = 1; x < 8; x += 2) p.px(x, 3, C.white);
    p.rect(0, 4, 8, 4, C.oak);
    for (let x = 1; x < 8; x += 2) p.rect(x, 4, 1, 4, C.oak3);
  },
  drinks_fridge: (p, { on }) => {
    p.rect(0, 0, 8, 16, S.m);
    p.rect(0, 0, 8, 1, S.m3);
    p.rect(1, 1, 6, 13, on ? '#e0f2fe' : '#1f2937');
    for (const y of [5, 9, 13]) p.rect(1, y, 6, 1, S.m2);
    const cans = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#fde047', '#a855f7'];
    for (let i = 0; i < 9; i++) p.rect(1 + (i % 3) * 2, 2 + Math.floor(i / 3) * 4, 1, 3, cans[i % cans.length]);
    p.rect(6, 4, 1, 4, C.metal);
    p.rect(0, 14, 8, 2, S.m2);
  },
  popcorn_cart: (p, { on }) => {
    p.rect(1, 0, 6, 1, S.m);
    p.rect(1, 1, 6, 7, on ? '#fef3c7' : '#e7e5e4');
    p.rect(1, 1, 1, 7, S.m);
    p.rect(6, 1, 1, 7, S.m);
    for (let i = 0; i < 6; i++) p.px(2 + (i % 4), 4 + Math.floor(i / 2), C.white);
    p.rect(2, 6, 4, 2, '#fde68a');
    p.rect(0, 8, 8, 5, S.m);
    p.rect(0, 8, 8, 1, S.m3);
    p.rect(2, 10, 4, 1, C.white);
    p.rect(0, 13, 8, 1, S.m2);
    disc(p, 1.5, 14.5, 1.3, C.ink2);
    disc(p, 6.5, 14.5, 1.3, C.ink2);
  },
  bread_maker: (p, { on }) => {
    p.rect(0, 1, 8, 7, S.m);
    p.rect(0, 1, 8, 1, S.m3);
    p.rect(1, 2, 4, 2, C.ink2);
    p.rect(2, 2, 2, 1, on ? '#fbbf24' : C.ink3);
    p.rect(5, 5, 2, 1, on ? C.leaf3 : C.ink3);
    p.rect(1, 5, 3, 2, S.m2);
  },
  blender: (p) => {
    p.rect(2, 0, 4, 1, C.ink3);
    p.rect(2, 1, 4, 4, '#e0f2fe');
    p.rect(2, 3, 4, 2, '#f472b6');
    p.rect(6, 2, 1, 2, '#e0f2fe');
    p.rect(1, 5, 6, 3, S.m);
    p.rect(1, 5, 6, 1, S.m3);
    p.px(4, 6, C.ink3);
  },
  stand_mixer: (p) => {
    p.rect(1, 0, 6, 3, S.m);
    p.rect(1, 0, 6, 1, S.m3);
    p.rect(0, 1, 1, 2, S.m2);
    p.rect(1, 3, 1, 4, S.m);
    p.rect(3, 3, 1, 1, C.metal2);
    p.rect(3, 4, 4, 3, C.metal);
    p.rect(3, 4, 4, 1, C.white);
    p.rect(0, 7, 8, 1, S.m2);
  },
  kitchen_mat: (p) => {
    p.rect(0, 5, 24, 3, S.a);
    p.rect(0, 5, 24, 1, S.a3);
    for (let x = 1; x < 24; x += 4) p.rect(x, 6, 2, 1, S.a2);
  },
};
