// Pixel trophies for the COLLECTION, in the same format as the challengers'
// sprites (challengeArt.ts): 24 x 24, the left half drawn and mirrored. One form
// for each group, one metal for each grade; the higher grades add sparkles and
// then a laurel. What isn't earned yet is the same form in dull grey.
import type { PixelArt } from './challengeArt';

const K = '#0b0b0e';

const sym = (half: string[]): string[] => half.map((row) => row + [...row].reverse().join(''));

const FORMS: Record<string, string[]> = {
  // A cup with two handles, on a plaque.
  hours: sym([
    '............',
    '............',
    '....kkkkkkkk',
    '.kkkkddddddd',
    'k..khslllmmm',
    'k..khslllmmm',
    'k..khslllmmm',
    '.k.khllllmmm',
    '..kkkhlllmmm',
    '....khlllmmd',
    '....kdlllmmd',
    '.....kdllmmd',
    '......kkdmmd',
    '........kkmd',
    '.........kmd',
    '.........kmd',
    '........kkld',
    '.......klmmd',
    '......kkkkkk',
    '.....kddddsl',
    '.....kddddsl',
    '....kkkkkkkk',
    '....khlmmmmd',
    '....kkkkkkkk',
  ]),
  // A medal on a striped ribbon.
  logs: sym([
    '.....kkkkkkk',
    '.....krrwwbb',
    '.....krrwwbb',
    '......krwwbb',
    '......krwwbb',
    '.......kwwbb',
    '.......kbbbb',
    '.......kkkkk',
    '.....kkkhhhh',
    '....khhlllll',
    '...khlllmmmm',
    '...khlmmmmms',
    '..khlmmmmmss',
    '..khlmssssss',
    '..khlmmsssss',
    '..kllmmmssss',
    '..kllmmsssms',
    '...klmmssmms',
    '...kmmmmmmmm',
    '....kmmmmmmd',
    '.....kkmmmdd',
    '.......kkkkk',
    '............',
    '............',
  ]),
  // An hourglass, the sand running.
  days: sym([
    '............',
    '...kkkkkkkkk',
    '...khllmmmmd',
    '...kkkkkkkkk',
    '....kmkccccc',
    '....kmkcyyyy',
    '....kmkcyyyy',
    '....kmk.cyyy',
    '....kmk..cyy',
    '....kmk...cy',
    '....kmk....c',
    '....kmk....y',
    '....kmk...cy',
    '....kmk..c.y',
    '....kmk.c..y',
    '....kmkc..yy',
    '....kmkc.yyy',
    '....kmkcyyyy',
    '...kkkkkkkkk',
    '...khllmmmmd',
    '...kkkkkkkkk',
    '............',
    '............',
    '............',
  ]),
  // A flame that hasn't gone out, in a bowl on a stand.
  streak: sym([
    '...........f',
    '..........kf',
    '.........kff',
    '.......f.kff',
    '.......fkfFF',
    '......kffFFF',
    '.....kffFFFy',
    '.....kffFFyy',
    '.....kfFFyyy',
    '.....kfFyyww',
    '......kFyyww',
    '...kkkkkkkkk',
    '...kdddddddd',
    '...khllllmmm',
    '....khlllmmm',
    '.....khllmmm',
    '......kkkkmd',
    '.........kmd',
    '.........kmd',
    '.......kkkmd',
    '......khlmmd',
    '.....kkkkkkk',
    '............',
    '............',
  ]),
  // Two swords behind a shield.
  beaten: sym([
    '..k.........',
    '.ksk........',
    '..kss.......',
    '...kss..kkkk',
    '....kkkkhhhh',
    '..kkkhhllllm',
    '..khhllllmmm',
    '..khlllmmmmm',
    '..khllmmmmms',
    '..khlmmmmmss',
    '..khlmmsssss',
    '..khlmmmssss',
    '...khlmmmsss',
    '...khlmmssms',
    '....klmmmmmd',
    '....kmmmmmdd',
    '.....kmmmddd',
    '......kmmddd',
    '.......kmddd',
    '........kmdd',
    '.........kdd',
    '..........kk',
    '............',
    '............',
  ]),
  // A crown hung upside down, its points dripping.
  inverted: sym([
    '............',
    '............',
    '..kkkkkkkkkk',
    '..khhlllmmmm',
    '..kddddddddd',
    '..khlmmmmmmm',
    '..khlmmrmmmr',
    '..khlmmmmmrr',
    '...khlmmmmmr',
    '...khllmmmmm',
    '...khlmmmkmm',
    '...khlmk.kmm',
    '...kmmk..kmm',
    '...kmk...kmm',
    '...kmk....km',
    '...kk.....km',
    '...rr.....kk',
    '...rr.....rr',
    '..........rr',
    '............',
    '............',
    '............',
    '............',
    '............',
  ]),
  // A paper lantern, lit from inside.
  festival: sym([
    '...........k',
    '...........k',
    '.......kkkkk',
    '.......kddmm',
    '.....kkkkkkk',
    '....khllmmmm',
    '...khllmmmmm',
    '..kddddddddd',
    '..khllywwwww',
    '..khllywwwww',
    '..kddddddddd',
    '..khllyywwww',
    '..khllyywwww',
    '..kddddddddd',
    '...khlmmmmmm',
    '....khlmmmmm',
    '.....kkkkkkk',
    '.......kddmm',
    '.......kkkkk',
    '..........kr',
    '..........kr',
    '...........r',
    '............',
    '............',
  ]),
};

export interface Grade {
  name: string;
  /** The metal's main colour: labels, meters. */
  color: string;
  sub: string;
  h: string;
  l: string;
  m: string;
  d: string;
}

export const GRADES: Grade[] = [
  { name: 'BRONZE', color: '#d8935a', sub: 'First steps.', h: '#f0c39a', l: '#d8935a', m: '#a8642f', d: '#6f3d18' },
  { name: 'SILVER', color: '#c7ced8', sub: 'Becoming a habit.', h: '#ffffff', l: '#d8dee6', m: '#a4adb8', d: '#69727e' },
  { name: 'GOLD', color: '#fbd24a', sub: 'Serious now.', h: '#fff4b0', l: '#fbd24a', m: '#d89c16', d: '#8f6209' },
  { name: 'PLATINUM', color: '#8fe3e0', sub: 'Rare company.', h: '#f0ffff', l: '#b9f1ee', m: '#74c4c6', d: '#3f7f86' },
  { name: 'DIAMOND', color: '#7cc2ff', sub: 'Very few get here.', h: '#eaf6ff', l: '#9ad4ff', m: '#4f93f0', d: '#2a4db0' },
  { name: 'MYTHIC', color: '#e68bff', sub: 'Almost a rumour.', h: '#ffe6fb', l: '#e68bff', m: '#a24df0', d: '#571ea8' },
];

// Added around the form on a free pixel: [x, y], in the 24 x 24 grid.
const SPARKLES: Array<[number, number]> = [
  [2, 1], [1, 2], [3, 2], [2, 3],
  [21, 0], [20, 1], [22, 1], [21, 2],
];
const LAUREL: Array<[number, number]> = [
  [0, 9], [1, 11], [0, 13], [1, 15], [1, 17], [2, 19], [3, 21], [5, 22],
  [23, 9], [22, 11], [23, 13], [22, 15], [22, 17], [21, 19], [20, 21], [18, 22],
];

const dress = (rows: string[], points: Array<[number, number]>, c: string) => {
  const out = [...rows];
  for (const [x, y] of points) {
    if (out[y]?.[x] === '.') out[y] = out[y].slice(0, x) + c + out[y].slice(x + 1);
  }
  return out;
};

const LOCKED: Record<string, string> = {
  k: '#000000', h: '#46464e', s: '#46464e', l: '#393940', m: '#2d2d33', d: '#202024',
  r: '#2d2d33', b: '#393940', w: '#46464e', c: '#393940', y: '#2d2d33', f: '#2d2d33', F: '#393940',
};

const cache = new Map<string, PixelArt>();

export function trophyArt(group: string, grade: number, earned: boolean): PixelArt {
  const key = `${group}-${grade}-${earned}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const metal = GRADES[grade - 1] ?? GRADES[0];
  let rows = FORMS[group] ?? FORMS.hours;
  if (earned && grade >= 3) rows = dress(rows, SPARKLES, 'x');
  if (earned && grade >= 5) rows = dress(rows, LAUREL, 'z');
  const art: PixelArt = {
    rows,
    palette: earned
      ? {
          k: K,
          s: '#ffffff',
          x: '#ffffff',
          z: metal.l,
          h: metal.h,
          l: metal.l,
          m: metal.m,
          d: metal.d,
          r: '#ef4444',
          b: '#3b82f6',
          w: '#fafafa',
          c: '#bae6fd',
          y: '#fde047',
          f: '#ea580c',
          F: '#fb923c',
        }
      : LOCKED,
  };
  cache.set(key, art);
  return art;
}
