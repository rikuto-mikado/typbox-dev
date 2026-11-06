// MY ROOM art pack: LIVED-IN: what a room looks like once someone lives in
// it: the round ceiling light every room has, laundry hung up to dry, and
// the heap of clothes on the floor. The ceiling light is the room's main
// light (furniture.LIGHTS): its diffuser glows while the room's lights are
// on (`on`).
import { C, type Art } from './roomPaint';

const SHIRT = '#3b6fb6';
const SHIRT2 = '#2c5590';
const TOWEL = '#f1efe9';
const TOWEL2 = '#d8d3c8';
const HOODIE = '#c2483b';
const HOODIE2 = '#963229';
const JEANS = '#3d5a80';
const JEANS2 = '#2b4362';
const GREY = '#a3a3a3';
const GREY2 = '#7a7a7a';

export const LIVED_ART: Record<string, Art> = {
  // A flush round ceiling light hugging the top of the wall.
  ceiling_light: (p, { on }) => {
    p.rect(9, 0, 6, 1, C.metal2);
    p.rect(5, 1, 14, 1, C.paper2);
    p.rect(3, 2, 18, 2, on ? '#fffbeb' : C.paper);
    p.rect(4, 4, 16, 1, on ? C.glow : C.paper2);
    p.rect(6, 5, 12, 1, on ? C.amber : C.metal);
    if (on) p.rect(6, 2, 12, 1, '#ffffff');
  },
  // A folding drying rack: a T-shirt, a towel and a pair of socks.
  laundry_rack: (p) => {
    // frame
    p.rect(1, 5, 14, 1, C.metal);
    p.rect(1, 6, 14, 1, C.metal2);
    for (const [x, dir] of [[2, -1], [13, 1]] as const) {
      for (let y = 7; y < 23; y++) p.px(x + Math.round(((y - 7) / 16) * dir), y, C.metal2);
    }
    p.rect(0, 23, 3, 1, C.metal3);
    p.rect(13, 23, 3, 1, C.metal3);
    p.rect(2, 16, 12, 1, C.metal);
    // T-shirt
    p.rect(2, 6, 6, 1, SHIRT2);
    p.rect(1, 7, 8, 2, SHIRT);
    p.rect(2, 9, 6, 6, SHIRT);
    p.rect(2, 14, 6, 1, SHIRT2);
    p.rect(4, 7, 2, 1, SHIRT2);
    // towel
    p.rect(10, 6, 4, 9, TOWEL);
    p.rect(10, 11, 4, 1, C.sky2);
    p.rect(13, 6, 1, 9, TOWEL2);
    // socks on the low bar
    p.rect(4, 17, 2, 3, GREY);
    p.rect(4, 19, 3, 1, GREY2);
    p.rect(8, 17, 2, 3, GREY);
    p.rect(8, 19, 3, 1, GREY2);
  },
  // A heap of clothes that never quite made it to the wardrobe.
  clothes_pile: (p) => {
    p.rect(2, 5, 13, 3, JEANS);
    p.rect(3, 7, 11, 1, JEANS2);
    p.rect(9, 4, 5, 2, JEANS);
    p.rect(0, 4, 8, 4, HOODIE);
    p.rect(1, 3, 5, 1, HOODIE);
    p.rect(0, 7, 8, 1, HOODIE2);
    p.rect(2, 5, 3, 1, HOODIE2);
    p.rect(6, 2, 5, 3, GREY);
    p.rect(6, 4, 5, 1, GREY2);
    p.rect(12, 6, 4, 2, TOWEL);
    p.rect(12, 7, 4, 1, TOWEL2);
  },
};
