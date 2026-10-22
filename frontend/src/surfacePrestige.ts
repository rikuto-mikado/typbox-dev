// PRESTIGE Surface Themes: the twelve Ascension rewards. Unlike every other
// series these are not palettes over a plain field — each one carries a
// hand-composed SVG backdrop per polarity (kintsugi seams, an eclipse
// corona, an accretion disk...). The SVG is inlined as a data URI and
// painted with `background-size: cover`; App pins it to the viewport
// (background-attachment: fixed) so it frames the dashboard instead of
// stretching down a long page. Cards stay opaque on top, so the art only
// ever shows in the gutters around them and never behind text.
import type { SurfaceFx, SurfacePolarityPalette, SurfaceThemePair } from './telemetryFeatures';


const W = 1600;
const H = 1000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function svgUrl(bg: string, defs: string, body: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMin slice'>` +
    `<defs>${defs}</defs><rect width='${W}' height='${H}' fill='${bg}'/>${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const radial = (id: string, stops: Array<[number, string, number]>, extra = '') =>
  `<radialGradient id='${id}' ${extra}>${stops
    .map(([o, c, a]) => `<stop offset='${o}' stop-color='${c}' stop-opacity='${a}'/>`)
    .join('')}</radialGradient>`;

const linear = (id: string, stops: Array<[number, string, number]>, attrs = "x1='0' y1='0' x2='1' y2='0'") =>
  `<linearGradient id='${id}' ${attrs}>${stops
    .map(([o, c, a]) => `<stop offset='${o}' stop-color='${c}' stop-opacity='${a}'/>`)
    .join('')}</linearGradient>`;

// ---------- I. KINTSUGI — gold seams mended into black lacquer / porcelain ----------
const KINTSUGI_SEAMS = [
  'M -20 140 L 180 210 L 260 190 L 420 300 L 470 290 L 610 420 L 700 400 L 860 520',
  'M 420 300 L 400 380 L 450 470 L 430 560',
  'M 1620 80 L 1450 160 L 1390 150 L 1260 260 L 1300 330 L 1180 420 L 1100 410 L 980 540',
  'M 1260 260 L 1180 230 L 1090 270',
  'M -20 760 L 120 720 L 230 780 L 330 760 L 380 830 L 520 860 L 560 1020',
  'M 1620 690 L 1500 740 L 1460 820 L 1340 850 L 1300 940 L 1220 1020',
];

function kintsugi(dark: boolean): string {
  const gold = dark ? ['#8a6418', '#f3d27a', '#b8862b'] : ['#8a5f12', '#c99a35', '#7a5410'];
  const defs =
    linear('g', [[0, gold[0], 1], [0.5, gold[1], 1], [1, gold[2], 1]], "x1='0' y1='0' x2='1' y2='1' gradientUnits='objectBoundingBox'") +
    radial('v', dark ? [[0, '#2a1f12', 0.55], [1, '#0b0907', 0]] : [[0, '#ffffff', 0.9], [1, '#f3ede1', 0]], "cx='0.5' cy='0.15' r='0.7'");
  const seams = KINTSUGI_SEAMS.map(
    (d) =>
      `<path d='${d}' fill='none' stroke='url(#g)' stroke-width='${dark ? 10 : 7}' stroke-opacity='0.12' stroke-linejoin='round'/>` +
      `<path d='${d}' fill='none' stroke='url(#g)' stroke-width='${dark ? 2.6 : 2.2}' stroke-linejoin='round'/>`
  ).join('');
  return svgUrl(dark ? '#0b0907' : '#f4efe4', defs, `<rect width='${W}' height='${H}' fill='url(#v)'/>${seams}`);
}

// ---------- II. NEON HALO — a magenta/cyan ring hanging over the page ----------
function neonHalo(dark: boolean): string {
  // Concentric halos centred above the page: their arcs sweep down through
  // the side gutters and the gaps between cards, so the rings stay legible
  // even though the cards cover the middle of the composition.
  const defs =
    linear('ring', dark ? [[0, '#ff3dce', 1], [0.5, '#9b5cff', 1], [1, '#2ee6ff', 1]] : [[0, '#e879c9', 1], [0.5, '#a78bfa', 1], [1, '#5ccfe6', 1]]) +
    radial('bloom', dark ? [[0, '#7c3aed', 0.35], [1, '#0a0612', 0]] : [[0, '#ede9fe', 0.9], [1, '#fbf8ff', 0]], "cx='0.5' cy='0' r='0.6'");
  const rings = [
    [560, 3.2, 1],
    [820, 2.2, 0.75],
    [1080, 1.6, 0.5],
  ]
    .map(
      ([r, w, o]) =>
        `<circle cx='800' cy='-260' r='${r}' fill='none' stroke='url(#ring)' stroke-width='${w * 12}' stroke-opacity='${r1(o * (dark ? 0.1 : 0.12) * 100) / 100}'/>` +
        `<circle cx='800' cy='-260' r='${r}' fill='none' stroke='url(#ring)' stroke-width='${w}' stroke-opacity='${o}'/>`
    )
    .join('');
  return svgUrl(dark ? '#0a0612' : '#fbf8ff', defs, `<rect width='${W}' height='${H}' fill='url(#bloom)'/>${rings}`);
}

// ---------- III. MOONLIT PLATINUM — brushed metal under a crescent ----------
function platinum(dark: boolean): string {
  const lines = Array.from({ length: 125 }, (_, i) => {
    const y = i * 8 + 2;
    const o = 0.02 + ((i * 37) % 11) / 400;
    return `<rect x='0' y='${y}' width='${W}' height='1' fill='${dark ? '#ffffff' : '#0f172a'}' fill-opacity='${r1(o * 100) / 100}'/>`;
  }).join('');
  const defs =
    linear('spec', dark ? [[0, '#ffffff', 0], [0.45, '#e2e8f0', 0.09], [0.55, '#ffffff', 0.13], [0.7, '#ffffff', 0]] : [[0, '#ffffff', 0], [0.5, '#ffffff', 0.85], [0.75, '#ffffff', 0]], "x1='0' y1='0' x2='1' y2='0.6'") +
    radial('moonGlow', dark ? [[0, '#cbd5e1', 0.28], [1, '#cbd5e1', 0]] : [[0, '#94a3b8', 0.25], [1, '#94a3b8', 0]]) +
    `<mask id='crescent'><rect width='${W}' height='${H}' fill='black'/><circle cx='1530' cy='150' r='78' fill='white'/><circle cx='1560' cy='128' r='69' fill='black'/></mask>`;
  const body =
    lines +
    `<rect width='${W}' height='${H}' fill='url(#spec)'/>` +
    `<circle cx='1530' cy='150' r='260' fill='url(#moonGlow)'/>` +
    `<rect width='${W}' height='${H}' fill='${dark ? '#e2e8f0' : '#64748b'}' mask='url(#crescent)'/>`;
  return svgUrl(dark ? '#0e1013' : '#eef0f3', defs, body);
}

// ---------- IV. CIPHER CROWN — gold cipher columns under a crown of light ----------
function cipherCrown(dark: boolean): string {
  const rand = mulberry32(2);
  const ink = dark ? '#e7b84a' : '#8a6418';
  const cols: string[] = [];
  for (let x = 24; x < W; x += 48) {
    const len = 6 + Math.floor(rand() * 14);
    for (let k = 0; k < len; k++) {
      const y = 20 + k * 26;
      const w = 6 + Math.floor(rand() * 3) * 5;
      cols.push(`<rect x='${x}' y='${y}' width='${w}' height='3' fill='${ink}' fill-opacity='${r1((1 - k / len) * 0.22 * 100) / 100}'/>`);
    }
  }
  const defs =
    radial('crown', dark ? [[0, '#fde68a', 0.3], [0.5, '#b45309', 0.08], [1, '#0b0904', 0]] : [[0, '#fef3c7', 1], [1, '#f7f1e1', 0]], "cx='0.5' cy='0' r='0.55'") +
    `<path id='peak' d='M 0 0 L 22 -40 L 44 0 Z'/>`;
  const crown = [-2, -1, 0, 1, 2]
    .map((i) => `<use href='#peak' x='${778 + i * 70}' y='${118 - (2 - Math.abs(i)) * 14}' fill='${ink}' fill-opacity='${dark ? 0.35 : 0.3}'/>`)
    .join('');
  return svgUrl(dark ? '#0b0904' : '#f7f1e1', defs, `<rect width='${W}' height='${H}' fill='url(#crown)'/>${cols.join('')}${crown}`);
}

// ---------- V. HOLOGRAPHIC FOIL — iridescent sweeps across a void / pearl ----------
function holoFoil(dark: boolean): string {
  const spectrum: Array<[number, string, number]> = [
    [0, '#ff5fa2', 0],
    [0.18, '#ff5fa2', 1],
    [0.34, '#ffb15c', 1],
    [0.5, '#e8f55c', 1],
    [0.64, '#5cf5b5', 1],
    [0.8, '#5cc8ff', 1],
    [0.92, '#a77bff', 1],
    [1, '#a77bff', 0],
  ];
  const a = dark ? 0.2 : 0.3;
  const defs =
    linear('foil', spectrum, "x1='0' y1='0' x2='1' y2='0.35'") +
    linear('fade', [[0, '#ffffff', 1], [1, '#ffffff', 0]], "x1='0' y1='0' x2='0' y2='1'") +
    `<mask id='m'><rect width='${W}' height='${H}' fill='url(#fade)'/></mask>`;
  const body =
    `<g mask='url(#m)'>` +
    `<path d='M -100 260 C 300 80, 700 420, 1100 180 S 1600 40, 1700 120 L 1700 380 C 1400 300, 1150 520, 800 470 S 200 360, -100 520 Z' fill='url(#foil)' fill-opacity='${a}'/>` +
    `<path d='M -100 40 C 400 -40, 900 220, 1700 -20 L 1700 70 C 1000 300, 500 60, -100 150 Z' fill='url(#foil)' fill-opacity='${a * 0.7}'/>` +
    `</g>`;
  return svgUrl(dark ? '#07070a' : '#fbfbfd', defs, body);
}

// ---------- VI. CROWN AURORA — curtains of light over a polar night / dawn ----------
function aurora(dark: boolean): string {
  const curtain = (id: string, top: string) =>
    linear(id, [[0, top, dark ? 0.55 : 0.4], [0.55, top, dark ? 0.12 : 0.1], [1, top, 0]], "x1='0' y1='0' x2='0' y2='1'");
  const defs =
    curtain('a1', dark ? '#34d399' : '#6ee7b7') +
    curtain('a2', dark ? '#22d3ee' : '#7dd3fc') +
    curtain('a3', dark ? '#a78bfa' : '#f0abfc') +
    linear('sky', dark ? [[0, '#0b1a24', 1], [1, '#04080c', 1]] : [[0, '#fde7ef', 1], [0.6, '#eef7f6', 1], [1, '#f4f7fb', 1]], "x1='0' y1='0' x2='0' y2='1'");
  const body =
    `<rect width='${W}' height='${H}' fill='url(#sky)'/>` +
    `<path d='M 80 0 C 240 120, 160 260, 340 420 L 520 430 C 380 280, 470 140, 360 0 Z' fill='url(#a1)'/>` +
    `<path d='M 420 0 C 600 160, 520 300, 760 480 L 980 470 C 780 300, 860 140, 760 0 Z' fill='url(#a2)'/>` +
    `<path d='M 860 0 C 1020 120, 980 300, 1180 440 L 1360 420 C 1180 280, 1240 120, 1140 0 Z' fill='url(#a1)'/>` +
    `<path d='M 1180 0 C 1330 140, 1300 280, 1500 380 L 1640 360 C 1480 240, 1540 110, 1460 0 Z' fill='url(#a3)'/>`;
  return svgUrl(dark ? '#04080c' : '#f4f7fb', defs, body);
}

// ---------- VII. SINGULARITY — an accretion disk bending light around nothing ----------
function singularity(dark: boolean): string {
  // The disk is drawn wider than the page so its bright limbs cross both
  // side gutters; the black core sits behind the header area at the top.
  const disk = dark ? ['#ff8a3d', '#ffe3b0', '#ff5a1f'] : ['#b45309', '#f59e0b', '#9a3412'];
  const defs =
    linear('disk', [[0, disk[0], 0.35], [0.25, disk[0], 0.9], [0.5, disk[1], 1], [0.75, disk[2], 0.9], [1, disk[2], 0.35]]) +
    radial('lens', dark ? [[0, '#000000', 1], [0.3, '#000000', 1], [0.36, '#ffb070', 0.5], [0.5, '#ff7a2f', 0.12], [1, '#040306', 0]] : [[0, '#ffffff', 1], [0.3, '#ffffff', 1], [0.34, '#b45309', 0.6], [0.5, '#f59e0b', 0.12], [1, '#f7f5f2', 0]], "cx='0.5' cy='0.5' r='0.5'");
  const body =
    `<circle cx='800' cy='190' r='520' fill='url(#lens)'/>` +
    `<ellipse cx='800' cy='190' rx='880' ry='120' fill='none' stroke='url(#disk)' stroke-width='34' stroke-opacity='0.4'/>` +
    `<ellipse cx='800' cy='190' rx='880' ry='120' fill='none' stroke='url(#disk)' stroke-width='5'/>` +
    `<ellipse cx='800' cy='190' rx='1040' ry='170' fill='none' stroke='url(#disk)' stroke-width='1.5' stroke-opacity='0.5'/>` +
    `<circle cx='800' cy='190' r='150' fill='${dark ? '#000000' : '#ffffff'}'/>` +
    `<path d='M -80 190 A 880 120 0 0 0 1680 190' fill='none' stroke='url(#disk)' stroke-width='6'/>` +
    `<circle cx='800' cy='190' r='154' fill='none' stroke='${disk[1]}' stroke-width='2' stroke-opacity='0.9'/>`;
  return svgUrl(dark ? '#040306' : '#f7f5f2', defs, body);
}

// ---------- VIII. PHOENIX — wings of flame unfolding from the top edge ----------
function phoenix(dark: boolean): string {
  const defs =
    linear('wing', dark ? [[0, '#fbbf24', 0.5], [0.45, '#f97316', 0.3], [1, '#dc2626', 0]] : [[0, '#f59e0b', 0.4], [0.5, '#fb7185', 0.2], [1, '#fb7185', 0]], "x1='0.5' y1='0' x2='0.5' y2='1'") +
    radial('heart', dark ? [[0, '#fde68a', 0.55], [1, '#f97316', 0]] : [[0, '#fde68a', 0.9], [1, '#fff6ee', 0]]);
  const feathers = [0, 1, 2, 3, 4]
    .map((i) => {
      const spread = 220 + i * 160;
      const drop = 360 + i * 110;
      const left = `M 800 40 C ${800 - spread * 0.4} ${80 + i * 20}, ${800 - spread} ${drop - 120}, ${800 - spread - 60} ${drop} C ${800 - spread + 40} ${drop - 60}, ${800 - spread * 0.5} ${120 + i * 30}, 800 60 Z`;
      const right = left.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (_m, x: string, y: string) => `${1600 - Number(x)} ${y}`);
      return `<path d='${left}' fill='url(#wing)'/><path d='${right}' fill='url(#wing)'/>`;
    })
    .join('');
  return svgUrl(dark ? '#0d0505' : '#fff6ee', defs, `${feathers}<circle cx='800' cy='60' r='190' fill='url(#heart)'/>`);
}

// ---------- IX. OMEGA — a total eclipse (dark) / an annular ring (light) ----------
function omega(dark: boolean): string {
  // Long coronal streamers reach the edges of the frame, so the eclipse
  // reads through the gutters even though its disk sits behind the header.
  const rays = Array.from({ length: 48 }, (_, i) => {
    const angle = (i / 48) * Math.PI * 2 + (i % 2 ? 0.035 : 0);
    const inner = 150;
    const outer = 380 + ((i * 53) % 9) * 110;
    const x1 = 800 + Math.cos(angle) * inner;
    const y1 = 150 + Math.sin(angle) * inner;
    const x2 = 800 + Math.cos(angle) * outer;
    const y2 = 150 + Math.sin(angle) * outer;
    return `<line x1='${r1(x1)}' y1='${r1(y1)}' x2='${r1(x2)}' y2='${r1(y2)}' stroke='${dark ? '#ffffff' : '#000000'}' stroke-opacity='${dark ? 0.12 : 0.09}' stroke-width='${i % 3 ? 1 : 1.8}'/>`;
  }).join('');
  if (dark) {
    const defs = radial('corona', [[0, '#ffffff', 1], [0.2, '#ffffff', 0.9], [0.24, '#e2e8f0', 0.35], [0.5, '#94a3b8', 0.08], [1, '#000000', 0]], "cx='0.5' cy='0.5' r='0.5'");
    const body =
      `<circle cx='800' cy='150' r='620' fill='url(#corona)'/>${rays}` +
      `<circle cx='800' cy='150' r='124' fill='#000000'/>` +
      `<circle cx='893' cy='68' r='7' fill='#ffffff'/><circle cx='893' cy='68' r='22' fill='#ffffff' fill-opacity='0.25'/>`;
    return svgUrl('#000000', defs, body);
  }
  const body = `${rays}<circle cx='800' cy='150' r='124' fill='none' stroke='#000000' stroke-width='3'/><circle cx='800' cy='150' r='108' fill='none' stroke='#000000' stroke-width='1' stroke-opacity='0.35'/>`;
  return svgUrl('#ffffff', '', body);
}

// ---------- X. GLITCH SOVEREIGN — chromatic tearing across the frame ----------
function glitch(dark: boolean): string {
  const rand = mulberry32(6);
  const colors = dark ? ['#ff2bd6', '#22e6ff', '#f4f4f5'] : ['#f472b6', '#38bdf8', '#18181b'];
  const bars: string[] = [];
  for (let i = 0; i < 26; i++) {
    const y = Math.floor(rand() * H);
    const h = 2 + Math.floor(rand() * 18);
    const x = Math.floor(rand() * 1200) - 200;
    const w = 200 + Math.floor(rand() * 900);
    const c = colors[i % 3];
    const o = (i % 3 === 2 ? 0.06 : 0.16) * (dark ? 1 : 0.9);
    bars.push(`<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${c}' fill-opacity='${r1(o * 100) / 100}'/>`);
    if (i % 3 !== 2) bars.push(`<rect x='${x + 14}' y='${y + h + 2}' width='${w * 0.6}' height='1' fill='${c}' fill-opacity='0.3'/>`);
  }
  const scan = Array.from({ length: 250 }, (_, i) => `<rect y='${i * 4}' width='${W}' height='1' fill='${dark ? '#ffffff' : '#000000'}' fill-opacity='0.025'/>`).join('');
  return svgUrl(dark ? '#08060b' : '#faf9fc', '', bars.join('') + scan);
}

// ---------- XI. ETERNAL CONSTELLATION — a private star chart ----------
const CONSTELLATION: Array<[number, number]> = [
  [1080, 120],
  [1180, 190],
  [1300, 170],
  [1390, 250],
  [1330, 340],
  [1210, 330],
  [1390, 250],
  [1500, 300],
];

function constellation(dark: boolean): string {
  const rand = mulberry32(8);
  const ink = dark ? '#ffffff' : '#1e2a5a';
  const stars = Array.from({ length: 170 }, () => {
    const r = rand() < 0.08 ? 1.8 + rand() * 1.2 : 0.6 + rand() * 1.1;
    return `<circle cx='${r1(rand() * W)}' cy='${r1(rand() * H)}' r='${r1(r)}' fill='${ink}' fill-opacity='${r1((0.25 + rand() * 0.6) * 100) / 100}'/>`;
  }).join('');
  const line = `<polyline points='${CONSTELLATION.map(([x, y]) => `${x},${y}`).join(' ')}' fill='none' stroke='${dark ? '#fcd34d' : '#b45309'}' stroke-opacity='0.45' stroke-width='1.2'/>`;
  const nodes = CONSTELLATION.map(([x, y]) => `<circle cx='${x}' cy='${y}' r='3.2' fill='${dark ? '#fde68a' : '#b45309'}'/>`).join('');
  const defs =
    radial('neb1', dark ? [[0, '#6d28d9', 0.35], [1, '#050816', 0]] : [[0, '#c7d2fe', 0.7], [1, '#f5f7fc', 0]]) +
    radial('neb2', dark ? [[0, '#0e7490', 0.3], [1, '#050816', 0]] : [[0, '#bae6fd', 0.6], [1, '#f5f7fc', 0]]);
  const rings = dark
    ? ''
    : [180, 320, 460].map((r) => `<circle cx='800' cy='-60' r='${r * 2}' fill='none' stroke='#1e2a5a' stroke-opacity='0.06'/>`).join('');
  const body =
    `<ellipse cx='380' cy='200' rx='520' ry='260' fill='url(#neb1)'/>` +
    `<ellipse cx='1250' cy='640' rx='560' ry='300' fill='url(#neb2)'/>` +
    rings +
    stars +
    line +
    nodes;
  return svgUrl(dark ? '#050816' : '#f5f7fc', defs, body);
}

// ---------- XII. INFINITE MONOLITH — the slab beneath an aligned sky ----------
function monolith(dark: boolean): string {
  // An endless avenue of slabs receding toward a horizon, under an aligned
  // sun and moon. The slabs run the full width of the frame, so the gaps
  // between cards keep catching their lit edges.
  const defs =
    radial('sun', dark ? [[0, '#fff7e0', 1], [0.25, '#fde68a', 0.6], [1, '#050505', 0]] : [[0, '#ffffff', 1], [0.3, '#fef3c7', 0.9], [1, '#f6f6f4', 0]], "cx='0.5' cy='0.5' r='0.5'") +
    linear('edge', dark ? [[0, '#fde68a', 0.55], [1, '#fde68a', 0]] : [[0, '#000000', 0.35], [1, '#000000', 0]], "x1='0' y1='0' x2='0' y2='1'") +
    linear('horizon', dark ? [[0, '#fde68a', 0], [0.5, '#fde68a', 0.4], [1, '#fde68a', 0]] : [[0, '#a16207', 0], [0.5, '#a16207', 0.35], [1, '#a16207', 0]]);
  const slab = dark ? '#000000' : '#0a0a0a';
  const slabs: string[] = [];
  // Mirrored pairs: nearest (outermost, tallest) first, shrinking toward the vanishing point.
  for (let k = 0; k < 9; k++) {
    const depth = 1 - k / 9;
    const offset = 60 + (1 - depth ** 1.6) * 640;
    const w = 26 + depth * 74;
    const top = 640 - depth * 520;
    const h = (640 - top) * 1.18;
    [800 - offset - w, 800 + offset].forEach((x) => {
      slabs.push(`<rect x='${r1(x)}' y='${r1(top)}' width='${r1(w)}' height='${r1(h)}' fill='${slab}' fill-opacity='${r1((0.55 + depth * 0.45) * 100) / 100}'/>`);
      slabs.push(`<rect x='${r1(x)}' y='${r1(top)}' width='1.5' height='${r1(h)}' fill='url(#edge)'/>`);
      slabs.push(`<rect x='${r1(x + w - 1.5)}' y='${r1(top)}' width='1.5' height='${r1(h)}' fill='url(#edge)'/>`);
    });
  }
  const body =
    `<circle cx='800' cy='90' r='300' fill='url(#sun)'/>` +
    `<circle cx='800' cy='90' r='58' fill='${dark ? '#050505' : '#d6d3d1'}' fill-opacity='${dark ? 0.85 : 0.5}'/>` +
    `<rect x='0' y='640' width='${W}' height='1.5' fill='url(#horizon)'/>` +
    slabs.join('');
  return svgUrl(dark ? '#050505' : '#f6f6f4', defs, body);
}

interface PrestigeSpec {
  id: string;
  name: string;
  darkLabel: string;
  lightLabel: string;
  description: string;
  requiredAscensions: number;
  accentHex: string;
  fx?: SurfaceFx;
  art: (dark: boolean) => string;
  // bgMain, bgCard, bgInput, border, textMain, textMuted, glowTint
  dark: [string, string, string, string, string, string, string];
  light: [string, string, string, string, string, string, string];
}

// Ordered by Ascension requirement, so the PRESTIGE row reads as a ladder.
const PRESTIGE_SPECS: PrestigeSpec[] = [
  {
    id: 'prestige-aurum',
    name: 'KINTSUGI AURUM // CYCLE I',
    darkLabel: 'URUSHI LACQUER',
    lightLabel: 'MENDED PORCELAIN',
    description: 'Black lacquer and porcelain mended with seams of gold: the first Ascension, where the breaks become the ornament.',
    requiredAscensions: 1,
    accentHex: '#e9c46a',
    art: kintsugi,
    dark: ['#0b0907', '#15110c', '#080605', '#4a3a1e', '#f6efe0', '#b8a782', 'rgba(233,196,106,0.12)'],
    light: ['#f4efe4', '#fffdf8', '#ece5d6', '#d8c49a', '#1f1810', '#6f5d3e', 'rgba(184,134,43,0.08)'],
  },
  {
    id: 'prestige-neon-halo',
    name: 'NEON HALO // CYCLE I',
    darkLabel: 'HALO VOID',
    lightLabel: 'HALO WHITE',
    description: 'A single neon ring suspended above the dashboard, magenta bleeding into cyan, for every operator who has Ascended once.',
    requiredAscensions: 1,
    accentHex: '#e879f9',
    fx: 'pulse',
    art: neonHalo,
    dark: ['#0a0612', '#130c20', '#07040d', '#3b2463', '#f7f2ff', '#a99bc8', 'rgba(217,70,239,0.14)'],
    light: ['#fbf8ff', '#ffffff', '#f2ecfd', '#dccdf7', '#1a1029', '#6b5a8a', 'rgba(168,85,247,0.08)'],
  },
  {
    id: 'prestige-argentum',
    name: 'MOONLIT PLATINUM // CYCLE II',
    darkLabel: 'BRUSHED PLATINUM NIGHT',
    lightLabel: 'BRUSHED SILVER',
    description: 'Brushed platinum catching a crescent moon: a specular sheen that only appears after two full Ascensions.',
    requiredAscensions: 2,
    accentHex: '#cbd5e1',
    art: platinum,
    dark: ['#0e1013', '#171a1f', '#0a0c0e', '#3a414c', '#f1f5f9', '#a3adba', 'rgba(203,213,225,0.1)'],
    light: ['#eef0f3', '#fbfcfd', '#e4e7ec', '#c9cfd8', '#111827', '#5b6575', 'rgba(100,116,139,0.08)'],
  },
  {
    id: 'prestige-cipher-crown',
    name: 'CIPHER CROWN // CYCLE II',
    darkLabel: 'CIPHER VOID',
    lightLabel: 'CIPHER PARCHMENT',
    description: 'Columns of gold cipher falling beneath a crown of light, reserved for the twice-Ascended.',
    requiredAscensions: 2,
    accentHex: '#facc15',
    fx: 'matrix',
    art: cipherCrown,
    dark: ['#0b0904', '#15110a', '#080603', '#4d3c13', '#fbf3dc', '#bba574', 'rgba(250,204,21,0.12)'],
    light: ['#f7f1e1', '#fffcf3', '#efe6cf', '#dcc88f', '#211a08', '#6e5c2c', 'rgba(202,138,4,0.08)'],
  },
  {
    id: 'prestige-prism',
    name: 'HOLOGRAPHIC FOIL // CYCLE III',
    darkLabel: 'FOIL VOID',
    lightLabel: 'PEARL FOIL',
    description: 'Iridescent foil sweeping across the top of the page, every hue at once: the only spectrum in the archive.',
    requiredAscensions: 3,
    accentHex: '#f0abfc',
    art: holoFoil,
    dark: ['#07070a', '#101016', '#050507', '#2e2e3a', '#fafafa', '#a3a3b2', 'rgba(255,255,255,0.08)'],
    light: ['#fbfbfd', '#ffffff', '#f1f1f6', '#dedee8', '#0f0f14', '#5f5f6e', 'rgba(167,123,255,0.07)'],
  },
  {
    id: 'prestige-crown-aurora',
    name: 'CROWN AURORA // CYCLE III',
    darkLabel: 'POLAR NIGHT',
    lightLabel: 'POLAR DAWN',
    description: 'Curtains of green, cyan and violet hanging over a polar night (or a pink polar dawn) for three completed cycles.',
    requiredAscensions: 3,
    accentHex: '#6ee7b7',
    fx: 'aurora',
    art: aurora,
    dark: ['#04080c', '#0b141b', '#030609', '#1f3a44', '#effcf8', '#93b3b0', 'rgba(52,211,153,0.12)'],
    light: ['#f4f7fb', '#ffffff', '#e9f0f5', '#cddde6', '#0b1a22', '#4f6672', 'rgba(52,211,153,0.08)'],
  },
  {
    id: 'prestige-singularity',
    name: 'SINGULARITY // CYCLE IV',
    darkLabel: 'EVENT HORIZON',
    lightLabel: 'WHITE HOLE',
    description: 'An accretion disk bending light around a perfect black core (a white one by day): four cycles deep.',
    requiredAscensions: 4,
    accentHex: '#fb923c',
    fx: 'sweep',
    art: singularity,
    dark: ['#040306', '#0d0a0f', '#020103', '#3b2a22', '#fff6ee', '#b9a596', 'rgba(251,146,60,0.12)'],
    light: ['#f7f5f2', '#ffffff', '#efebe6', '#dccfc2', '#1c120a', '#6d5847', 'rgba(217,119,6,0.08)'],
  },
  {
    id: 'prestige-phoenix',
    name: 'PHOENIX REBIRTH // CYCLE IV',
    darkLabel: 'PHOENIX NIGHT',
    lightLabel: 'PHOENIX DAWN',
    description: 'Wings of flame unfolding from the top of the page, and embers rising: every Ascension is a rebirth.',
    requiredAscensions: 4,
    accentHex: '#fb7185',
    fx: 'embers',
    art: phoenix,
    dark: ['#0d0505', '#180b0a', '#090303', '#4a1f1a', '#fff1ec', '#c09a90', 'rgba(249,115,22,0.14)'],
    light: ['#fff6ee', '#fffdfb', '#fbe9dc', '#f1cdb6', '#2a0f08', '#7a4b3c', 'rgba(251,113,133,0.08)'],
  },
  {
    id: 'prestige-omega',
    name: 'OMEGA ECLIPSE // CYCLE V',
    darkLabel: 'TOTALITY',
    lightLabel: 'ANNULUS',
    description: 'Absolute black and absolute white: a total eclipse with its diamond ring by night, a single annular ring by day.',
    requiredAscensions: 5,
    accentHex: '#ffffff',
    art: omega,
    dark: ['#000000', '#0a0a0a', '#000000', '#3f3f3f', '#ffffff', '#a3a3a3', 'rgba(255,255,255,0.1)'],
    light: ['#ffffff', '#ffffff', '#f4f4f4', '#1a1a1a', '#000000', '#5a5a5a', 'rgba(0,0,0,0.05)'],
  },
  {
    id: 'prestige-glitch-sovereign',
    name: 'GLITCH SOVEREIGN // CYCLE VI',
    darkLabel: 'TORN SIGNAL',
    lightLabel: 'TORN PAPER',
    description: 'Magenta and cyan tearing across the frame like a corrupted broadcast: reality bending for a six-cycle operator.',
    requiredAscensions: 6,
    accentHex: '#22d3ee',
    fx: 'glitch',
    art: glitch,
    dark: ['#08060b', '#110e16', '#050407', '#382a46', '#f8f5ff', '#a9a0b8', 'rgba(255,43,214,0.12)'],
    light: ['#faf9fc', '#ffffff', '#f0eef5', '#dcd6e8', '#120d1a', '#5f566e', 'rgba(56,189,248,0.08)'],
  },
  {
    id: 'prestige-eternal-constellation',
    name: 'ETERNAL CONSTELLATION // CYCLE VIII',
    darkLabel: 'DEEP SKY',
    lightLabel: 'STAR CHART',
    description: 'A field of stars and two nebulae with one constellation drawn in gold: yours, written after eight cycles.',
    requiredAscensions: 8,
    accentHex: '#fcd34d',
    fx: 'stars',
    art: constellation,
    dark: ['#050816', '#0c1124', '#03050f', '#25305a', '#f3f5ff', '#9ea7c8', 'rgba(99,102,241,0.12)'],
    light: ['#f5f7fc', '#ffffff', '#eaeef8', '#cfd6ea', '#0d1430', '#4f5a7d', 'rgba(30,42,90,0.07)'],
  },
  {
    id: 'prestige-infinite-monolith',
    name: 'INFINITE MONOLITH // CYCLE X',
    darkLabel: 'ALIGNMENT NIGHT',
    lightLabel: 'ALIGNMENT DAY',
    description: 'A black slab standing under an aligned sun and moon. Ten cycles: the archive has nothing left to teach, only to admire.',
    requiredAscensions: 10,
    accentHex: '#fde68a',
    fx: 'dust',
    art: monolith,
    dark: ['#050505', '#0d0d0c', '#030303', '#34312b', '#faf8f2', '#a8a396', 'rgba(253,230,138,0.1)'],
    light: ['#f6f6f4', '#ffffff', '#ecebe7', '#d4d2cb', '#0a0a0a', '#5c5a52', 'rgba(161,98,7,0.06)'],
  },
];

const toPalette = (label: string, c: PrestigeSpec['dark']): SurfacePolarityPalette => ({
  label,
  bgMain: c[0],
  bgCard: c[1],
  bgInput: c[2],
  border: c[3],
  textMain: c[4],
  textMuted: c[5],
  glowTint: c[6],
});

export const PRESTIGE_THEME_PAIRS: SurfaceThemePair[] = PRESTIGE_SPECS.map((spec, i) => ({
  id: spec.id,
  code: `PRS-${String(i + 1).padStart(2, '0')}`,
  name: spec.name,
  pairLabel: `${spec.darkLabel} ⇄ ${spec.lightLabel}`,
  description: spec.description,
  accentHex: spec.accentHex,
  divisionCode: 'PRESTIGE',
  clearanceHintLv: 3000,
  requiredAscensions: spec.requiredAscensions,
  series: 'prestige',
  art: { dark: spec.art(true), light: spec.art(false) },
  ...(spec.fx ? { fx: spec.fx } : {}),
  dark: toPalette(spec.darkLabel, spec.dark),
  light: toPalette(spec.lightLabel, spec.light),
}));
