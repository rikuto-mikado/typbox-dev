// MY ROOM art pack: STREET FINDS, brought home: plastic crates, a stall
// stool, a string of lanterns and the cables everyone ends up with.
// Recolourable parts use the S slots (roomPaint.ts): a = lantern colour,
// b = plastic, m = metal casing.
import { box, C, S, type Art } from './roomPaint';

export const CYBER_STREET_ART: Record<string, Art> = {
  cyber_stall_stool: (p) => {
    p.rect(0, 1, 8, 2, S.b);
    p.rect(0, 1, 8, 1, S.b3);
    p.rect(1, 3, 1, 5, S.b2);
    p.rect(6, 3, 1, 5, S.b2);
    p.rect(2, 5, 4, 1, S.b2);
  },
  cyber_cable_mess: (p) => {
    // cable clamp on the wall
    p.rect(3, 0, 26, 2, C.ink3);
    p.rect(3, 0, 26, 1, C.metal3);
    // thick loops hanging from it
    const loop = (x: number, w: number, depth: number, c: string) => {
      p.rect(x, 2, 1, depth, c);
      p.rect(x + w, 2, 1, depth, c);
      p.rect(x + 1, 2 + depth, w - 1, 1, c);
    };
    loop(2, 10, 3, S.a);
    loop(9, 12, 5, S.b);
    loop(18, 9, 2, S.a2);
    loop(24, 6, 4, S.b2);
    // connectors and a warning tag
    p.rect(13, 7, 2, 1, C.amber);
    p.rect(1, 4, 2, 2, C.ink2);
    p.px(1, 5, C.leaf3);
    p.rect(28, 5, 2, 2, C.amber);
  },
  cyber_crates: (p) => {
    for (const [x, y, w, h] of [
      [0, 8, 9, 8],
      [8, 9, 8, 7],
      [3, 1, 9, 7],
    ] as const) {
      box(p, x, y, w, h, S.b, S.b2);
      p.rect(x + 1, y + 1, w - 2, 1, S.b3);
      for (let i = 1; i < w - 1; i++) p.px(x + i, y + Math.round((i / (w - 1)) * (h - 1)), S.b2);
    }
  },
  cyber_lantern_string: (p, { on, night }) => {
    const lit = on || night;
    for (let x = 0; x < 32; x++) p.px(x, 1 + Math.round(Math.sin((x / 32) * Math.PI) * 1.5), C.ink3);
    for (let x = 2; x < 32; x += 6) {
      const y = 2 + Math.round(Math.sin((x / 32) * Math.PI) * 1.5);
      p.rect(x, y, 3, 4, lit ? (x % 12 === 2 ? S.a3 : C.red) : x % 12 === 2 ? S.a2 : C.red2);
      p.rect(x, y + 4, 3, 1, C.ink2);
    }
  },
};
