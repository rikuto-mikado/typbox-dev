// Pixel cursor themes: what stands in for the everyday arrow (chess pieces,
// arrows, tools, sky objects, the solar system, glyphs, creatures). Every
// theme shares the pointing hand (pixel-hand.svg) over clickable things, so
// only the default cursor changes. The SVGs in public/cursors are drawn from
// the pixel maps inside each file; the emerald pixel marks the hotspot (the
// point that actually clicks), except on the arrows, which click with their
// very tip. Unlocks work like the Surface Themes: reaching a Clearance level
// (spread evenly up to LV.3000) opens a cursor; one is an Ascension reward.
import type { ChronoUnlock } from './chronometerThemes';

export type CursorKind = 'chess' | 'arrow' | 'tool' | 'sky' | 'solar' | 'glyph' | 'creature';

export interface CursorTheme {
  id: string;
  code: string;
  name: string;
  kind: CursorKind;
  /** Path under public/ (served from the site root). */
  src: string;
  /** Hotspot in SVG pixels. */
  hotspot: [x: number, y: number];
  unlock: ChronoUnlock;
  desc: string;
}

export const CURSOR_KINDS: Array<{ id: CursorKind; label: string }> = [
  { id: 'chess', label: 'CHESS' },
  { id: 'arrow', label: 'ARROW' },
  { id: 'tool', label: 'TOOL' },
  { id: 'sky', label: 'SKY' },
  { id: 'solar', label: 'SOLAR' },
  { id: 'glyph', label: 'GLYPH' },
  { id: 'creature', label: 'CREATURE' },
];

const FREE: ChronoUnlock = { type: 'default' };
const lv = (value: number): ChronoUnlock => ({ type: 'level', value });
const asc = (value: number): ChronoUnlock => ({ type: 'ascension', value });

type Row = [id: string, name: string, kind: CursorKind, hotspot: [number, number], unlock: ChronoUnlock, desc: string];

// Grouped by kind, lowest unlock level first inside each (the solar system
// runs outward from the Sun, which is also its unlock order); codes follow
// this order.
const ROWS: Row[] = [
  ['rook', 'ROOK', 'chess', [1, 1], FREE, 'The original TYPBOX cursor. Points with its top-left battlement.'],
  ['pawn', 'PAWN', 'chess', [6, 1], lv(234), 'Small and steady. Points with the top of its head.'],
  ['knight', 'KNIGHT', 'chess', [4, 1], lv(506), 'A horse’s head facing left. Points with the tip of its ear.'],
  ['pawn-noir', 'NOIR PAWN', 'chess', [6, 1], lv(779), 'The pawn in ink with a paper outline.'],
  ['rook-noir', 'NOIR ROOK', 'chess', [1, 1], lv(1052), 'The rook in ink with a paper outline.'],
  ['bishop', 'BISHOP', 'chess', [6, 1], lv(1325), 'Slotted mitre. Points with its finial.'],
  ['knight-noir', 'NOIR KNIGHT', 'chess', [4, 1], lv(1714), 'The knight in ink with a paper outline.'],
  ['queen', 'QUEEN', 'chess', [6, 1], lv(1987), 'Five-point coronet. Points with the jewel on top.'],
  ['bishop-noir', 'NOIR BISHOP', 'chess', [6, 1], lv(2260), 'The bishop in ink with a paper outline.'],
  ['king', 'KING', 'chess', [6, 1], lv(2532), 'Crowned with a cross. Points with the top of the cross.'],
  ['queen-noir', 'NOIR QUEEN', 'chess', [6, 1], lv(2805), 'The queen in ink with a paper outline.'],
  ['king-noir', 'NOIR KING', 'chess', [6, 1], asc(1), 'The king in ink with a paper outline.'],
  ['pointer', 'POINTER', 'arrow', [0, 0], FREE, 'The classic pixel arrow, with a shaded tail.'],
  ['emerald', 'EMERALD', 'arrow', [0, 0], lv(195), 'The classic arrow cast in TYPBOX emerald, with a paper glint.'],
  ['mini', 'MINI', 'arrow', [0, 0], lv(468), 'A compact arrow, about two-thirds the usual size.'],
  ['nocturne', 'NOCTURNE', 'arrow', [0, 0], lv(740), 'An ink arrow outlined in paper: the pointer in negative.'],
  ['rose', 'ROSE', 'arrow', [0, 0], lv(1013), 'The classic arrow in rose pink.'],
  ['amber', 'AMBER', 'arrow', [0, 0], lv(1247), 'The classic arrow in warm amber.'],
  ['checker', 'CHECKER', 'arrow', [0, 0], lv(1519), 'The classic arrow filled with a chessboard.'],
  ['glacier', 'GLACIER', 'arrow', [0, 0], lv(1792), 'The classic arrow in cold sky blue.'],
  ['iris', 'IRIS', 'arrow', [0, 0], lv(2026), 'The classic arrow in soft violet.'],
  ['wireframe', 'WIREFRAME', 'arrow', [0, 0], lv(2299), 'Just an emerald outline; the page shows through.'],
  ['prism', 'PRISM', 'arrow', [0, 0], lv(2571), 'The classic arrow split into diagonal spectrum bands.'],
  ['scanline', 'SCANLINE', 'arrow', [0, 0], lv(2844), 'An ink arrow striped with emerald CRT scanlines.'],
  ['pencil', 'PENCIL', 'tool', [1, 1], lv(39), 'Emerald pencil with a rose eraser. Points with the lead.'],
  ['fountain', 'FOUNTAIN PEN', 'tool', [1, 1], lv(312), 'Gold nib on an emerald barrel. Points with the nib.'],
  ['quill', 'QUILL', 'tool', [1, 1], lv(584), 'A white feather with an emerald spine. Points with its gold nib.'],
  ['hammer', 'HAMMER', 'tool', [4, 1], lv(818), 'Steel head on a wooden handle. Points with the corner of the head.'],
  ['brush', 'BRUSH', 'tool', [1, 1], lv(1091), 'Emerald-dipped bristles on a red lacquer handle. Points with the tip.'],
  ['wrench', 'WRENCH', 'tool', [4, 1], lv(1364), 'An open-ended steel wrench. Points with the jaw.'],
  ['match', 'MATCH', 'tool', [1, 1], lv(1558), 'A lit matchstick. Points with the tip of the flame.'],
  ['screwdriver', 'SCREWDRIVER', 'tool', [1, 1], lv(1831), 'Steel shaft, ribbed amber grip. Points with the blade.'],
  ['sword', 'SWORD', 'tool', [1, 1], lv(2104), 'Steel blade, gilded crossguard, emerald grip. Points with the blade tip.'],
  ['pickaxe', 'PICKAXE', 'tool', [3, 2], lv(2338), 'Curved steel pick on a wooden handle. Points with the pick.'],
  ['wand', 'WAND', 'tool', [4, 4], lv(2610), 'A violet wand. Points with the centre of its star.'],
  ['key', 'KEY', 'tool', [2, 1], lv(2883), 'Gold key with an emerald set in the bow. Points with the bit.'],
  ['cloud', 'CLOUD', 'sky', [8, 5], lv(78), 'A soft white cloud. Points with the centre.'],
  ['plane', 'PAPER PLANE', 'sky', [1, 1], lv(351), 'A folded paper plane. Points with its nose.'],
  ['kite', 'KITE', 'sky', [1, 1], lv(623), 'A diamond kite with a ribboned tail. Points with its top corner.'],
  ['crescent', 'CRESCENT', 'sky', [5, 1], lv(857), 'A pale crescent moon. Points with its upper horn.'],
  ['rocket', 'ROCKET', 'sky', [1, 1], lv(1130), 'Engine lit, porthole glowing. Points with its nose cone.'],
  ['bolt', 'BOLT', 'sky', [2, 1], lv(1403), 'An amber lightning bolt. Points with its top-left corner.'],
  ['star', 'STAR', 'sky', [7, 1], lv(1597), 'A five-point amber star. Points with its top point.'],
  ['satellite', 'SATELLITE', 'sky', [8, 5], lv(1870), 'Solar panels spread wide. Points with its centre.'],
  ['planet', 'PLANET', 'sky', [9, 5], lv(2143), 'A violet planet with an amber ring. Points with the centre.'],
  ['comet', 'COMET', 'sky', [3, 3], lv(2377), 'An emerald tail behind a bright head. Points with the centre of the head.'],
  ['sun', 'SUN', 'sky', [8, 8], lv(2649), 'An amber sun with eight rays. Points with the centre.'],
  ['ufo', 'UFO', 'sky', [8, 5], lv(2922), 'A flying saucer with a glass dome. Points with its centre.'],
  ['mercury', 'MERCURY', 'solar', [5, 5], lv(273), 'Small, grey and cratered. The innermost planet. Points with the centre.'],
  ['venus', 'VENUS', 'solar', [6, 6], lv(545), 'Wrapped in pale, swirling cloud. Points with the centre.'],
  ['earth', 'EARTH', 'solar', [6, 6], lv(974), 'Blue oceans, green land, drifting cloud. Points with the centre.'],
  ['mars', 'MARS', 'solar', [6, 6], lv(1286), 'Rust-red, with a white polar cap. Points with the centre.'],
  ['jupiter', 'JUPITER', 'solar', [8, 8], lv(1753), 'Banded giant with the Great Red Spot. Points with the centre.'],
  ['saturn', 'SATURN', 'solar', [11, 6], lv(2065), 'The ringed planet, rings in amber. Points with the centre.'],
  ['uranus', 'URANUS', 'solar', [6, 9], lv(2494), 'Pale cyan, its rings standing almost upright. Points with the centre.'],
  ['neptune', 'NEPTUNE', 'solar', [6, 6], lv(2766), 'Deep blue, with the Great Dark Spot. Points with the centre.'],
  ['block', 'BLOCK CARET', 'glyph', [1, 1], lv(117), 'An emerald terminal block cursor. Points with its top-left corner.'],
  ['heart', 'HEART', 'glyph', [7, 5], lv(390), 'A rose heart with a glint. Points with the centre.'],
  ['leaf', 'LEAF', 'glyph', [1, 1], lv(662), 'A green leaf on a short stem. Points with its tip.'],
  ['reticle', 'RETICLE', 'glyph', [7, 7], lv(896), 'Viewfinder brackets around a small cross. Points with the centre.'],
  ['target', 'TARGET', 'glyph', [7, 7], lv(1169), 'Rose and white rings. Points with the bullseye.'],
  ['spade', 'SPADE', 'glyph', [7, 1], lv(1442), 'The card suit in ink. Points with its tip.'],
  ['club', 'CLUB', 'glyph', [6, 1], lv(1636), 'The card suit in ink. Points with the top leaf.'],
  ['diamond', 'DIAMOND', 'glyph', [6, 1], lv(1909), 'The card suit in rose. Points with its top point.'],
  ['sakura', 'SAKURA', 'glyph', [7, 7], lv(2182), 'A cherry blossom with notched petals. Points with the centre.'],
  ['sparkle', 'SPARKLE', 'glyph', [7, 7], lv(2416), 'A four-point star with a small companion. Points with the centre.'],
  ['snowflake', 'SNOWFLAKE', 'glyph', [6, 7], lv(2688), 'A six-armed snowflake. Points with the centre.'],
  ['amethyst', 'AMETHYST', 'glyph', [1, 1], lv(2961), 'A violet crystal shard. Points with its tip.'],
  ['cat', 'BLACK CAT', 'creature', [2, 1], lv(156), 'An emerald-eyed black cat. Points with its left ear.'],
  ['mouse', 'MOUSE', 'creature', [1, 5], lv(429), 'A mouse, as a mouse cursor should be. Points with its nose.'],
  ['bird', 'BLUEBIRD', 'creature', [1, 4], lv(701), 'A round bluebird. Points with its beak.'],
  ['goldfish', 'GOLDFISH', 'creature', [1, 1], lv(935), 'Swimming toward the top-left. Points with its mouth.'],
  ['ghost', 'GHOST', 'creature', [5, 1], lv(1208), 'A friendly white ghost. Points with the top of its head.'],
  ['slime', 'SLIME', 'creature', [7, 1], lv(1481), 'A glossy emerald slime. Points with its peak.'],
  ['bee', 'BEE', 'creature', [1, 6], lv(1675), 'A striped bumblebee. Points with its head.'],
  ['snail', 'SNAIL', 'creature', [1, 1], lv(1948), 'A spiral amber shell. Points with its eye stalk.'],
  ['butterfly', 'BUTTERFLY', 'creature', [7, 4], lv(2221), 'Rose and violet wings. Points with its body.'],
  ['bat', 'BAT', 'creature', [8, 4], lv(2455), 'A violet bat, wings spread. Points with its head.'],
  ['jellyfish', 'JELLYFISH', 'creature', [4, 1], lv(2727), 'Pink bell, violet tentacles. Points with the top of its bell.'],
  ['owl', 'OWL', 'creature', [2, 1], lv(3000), 'A wide-eyed brown owl. Points with its left ear tuft.'],
];

export const CURSOR_THEMES: CursorTheme[] = ROWS.map(([id, name, kind, hotspot, unlock, desc], i) => ({
  id,
  code: `CR-${String(i + 1).padStart(2, '0')}`,
  name,
  kind,
  src: `/cursors/pixel-${id}.svg`,
  hotspot,
  unlock,
  desc,
}));

export const DEFAULT_CURSOR_THEME_ID = 'rook';
export const CURSOR_THEME_STORAGE_KEY = 'typbox_cursor_theme';

const CURSOR_BY_ID = new Map(CURSOR_THEMES.map((c) => [c.id, c]));
export const isCursorThemeId = (v: unknown): v is string => typeof v === 'string' && CURSOR_BY_ID.has(v);
export const getCursorThemeById = (id: string | null | undefined): CursorTheme =>
  (id && CURSOR_BY_ID.get(id)) || (CURSOR_BY_ID.get(DEFAULT_CURSOR_THEME_ID) as CursorTheme);

// Cursor size: a per-device comfort setting (like the ambient dim level), so
// it stays in localStorage. S is the pixel art at its native size; M and L
// redraw the same SVG larger (crisp on 2x displays), the hand included.
export type CursorSize = 's' | 'm' | 'l';
export const CURSOR_SIZES: Array<{ id: CursorSize; label: string; scale: number }> = [
  { id: 's', label: 'S', scale: 1 },
  { id: 'm', label: 'M', scale: 1.5 },
  { id: 'l', label: 'L', scale: 2 },
];
export const DEFAULT_CURSOR_SIZE: CursorSize = 's';
export const CURSOR_SIZE_STORAGE_KEY = 'typbox_cursor_size';
export const isCursorSize = (v: unknown): v is CursorSize => v === 's' || v === 'm' || v === 'l';

const HAND = { src: '/cursors/pixel-hand.svg', hotspot: [5, 0] as [number, number] };

// Scaled copies as data URLs: the SVG's width/height are multiplied and the
// viewBox is left alone, so the art just draws bigger.
const scaledCache = new Map<string, Promise<string>>();
function scaledUrl(src: string, scale: number): Promise<string> {
  const key = `${src}@${scale}`;
  let hit = scaledCache.get(key);
  if (!hit) {
    hit = fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${src}`);
        return res.text();
      })
      .then((svg) => {
        const sized = svg.replace(/width="(\d+)" height="(\d+)"/, (_, w: string, h: string) => `width="${Number(w) * scale}" height="${Number(h) * scale}"`);
        return `data:image/svg+xml,${encodeURIComponent(sized)}`;
      });
    hit.catch(() => scaledCache.delete(key));
    scaledCache.set(key, hit);
  }
  return hit;
}

// The hotspot lands on the centre of the same art pixel at any scale.
const cursorValue = (url: string, [x, y]: [number, number], scale: number, fallback: string) =>
  `url("${url}") ${Math.floor((x + 0.5) * scale)} ${Math.floor((y + 0.5) * scale)}, ${fallback}`;

let applyToken = 0;

/**
 * Points the `--tb-cursor-default` / `--tb-cursor-hand` variables (index.css)
 * at the theme and size. The rook at size S is the stylesheet's own default,
 * so that combination removes the overrides. The variables are only read
 * inside the `pointer: fine` block, so touch devices are unaffected.
 */
export function applyCursorTheme(theme: CursorTheme, size: CursorSize = DEFAULT_CURSOR_SIZE): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  const token = ++applyToken;
  const scale = CURSOR_SIZES.find((s) => s.id === size)?.scale ?? 1;
  const setNative = () => {
    root.removeProperty('--tb-cursor-hand');
    if (theme.id === DEFAULT_CURSOR_THEME_ID) root.removeProperty('--tb-cursor-default');
    else root.setProperty('--tb-cursor-default', cursorValue(theme.src, theme.hotspot, 1, 'default'));
  };
  if (scale === 1) {
    setNative();
    return;
  }
  Promise.all([scaledUrl(theme.src, scale), scaledUrl(HAND.src, scale)])
    .then(([pieceUrl, handUrl]) => {
      if (token !== applyToken) return; // a newer pick already landed
      root.setProperty('--tb-cursor-default', cursorValue(pieceUrl, theme.hotspot, scale, 'default'));
      root.setProperty('--tb-cursor-hand', cursorValue(handUrl, HAND.hotspot, scale, 'pointer'));
    })
    .catch(() => {
      if (token === applyToken) setNative(); // offline or missing file: native size still works
    });
}
