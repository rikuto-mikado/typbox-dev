// MY ROOM art pack: HOMELAB: a patch panel for the home network and a fire
// extinguisher by the door. LEDs blink while the stopwatch runs (`on`).
// Recolourable parts use the S slots (roomPaint.ts): m = chassis metal,
// a = accent / LEDs, b = painted body.
import { box, C, hash, S, type Art } from './roomPaint';

export const DATA_CENTER_ART: Record<string, Art> = {
  dc_fire_extinguisher: (p) => {
    p.rect(3, 1, 3, 2, C.ink);
    p.rect(1, 2, 3, 1, C.ink2);
    p.rect(0, 3, 1, 6, C.ink2);
    p.rect(2, 3, 5, 12, S.b);
    p.rect(2, 3, 1, 12, S.b3);
    p.rect(6, 3, 1, 12, S.b2);
    p.rect(2, 8, 5, 3, C.white);
    p.rect(3, 9, 3, 1, S.b2);
    p.rect(2, 15, 5, 1, C.ink2);
  },
  dc_patch_panel: (p, { on }) => {
    box(p, 0, 0, 16, 5, S.m2, C.ink);
    for (let x = 2; x < 14; x += 2) {
      p.px(x, 2, C.ink);
      p.px(x, 3, on && hash(x, 3) > 0.4 ? C.leaf3 : C.ink3);
    }
    const colors = [S.a, C.amber2, C.red, S.a3, C.leaf2, C.white];
    colors.forEach((c, i) => {
      const x = 2 + i * 2;
      p.rect(x, 5, 1, 1 + (i % 3), c);
      p.px(x + 1, 6 + (i % 3), c);
    });
  },
};
