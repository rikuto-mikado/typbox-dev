// NEWS (settings tab 06): a short log of the big additions and changes to
// TYPBOX, newest first. Dates are deliberately loose (month and part of
// the month); the point is to keep a record of what arrived, not when to
// the hour. Add a new article at the top of NEWS_ARTICLES.
import type { FigureKind } from './NewsFigures';
import type { RoomLayout } from './roomRender';

export interface ShowcaseRoom {
  name: string;
  desc: string;
  layout: RoomLayout;
}

export type NewsBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'stats'; items: Array<[label: string, value: string]> }
  | { type: 'rooms'; rooms: ShowcaseRoom[] }
  /** A lead image drawn live from the app's own parts (NewsFigures.tsx). */
  | { type: 'figure'; kind: FigureKind; caption: string };

export interface NewsArticle {
  id: string;
  /** Loose date, e.g. "LATE OCT 2026". */
  date: string;
  tag: string;
  title: string;
  lede: string;
  blocks: NewsBlock[];
}

/** "id@x,y id@x,y …" → placed pieces (keeps the showcase layouts readable). */
const room = (name: string, desc: string, wall: string, floor: string, pieces: string): ShowcaseRoom => ({
  name,
  desc,
  layout: {
    wall,
    floor,
    items: pieces
      .trim()
      .split(/\s+/)
      .map((token) => {
        const [id, pos] = token.split('@');
        const [x, y] = pos.split(',').map(Number);
        return { id, x, y };
      }),
  },
});

// Every showcase layout passes the server's room rules (furniture.validate_layout).
const SHOWCASE_ROOMS: ShowcaseRoom[] = [
  room(
    'NIGHT CODER',
    'Terminal wall, dark concrete, a rack humming in the corner. Screens light up while the stopwatch runs.',
    'wall_terminal',
    'floor_concrete__dark',
    `ac_unit@0,0 neon_sign__emerald@5,0 wall_clock__emerald@9,1 poster_grid@11,1 server_rack@0,4 printer_3d@2,6
     battlestation@4,5 gaming_chair@8,6 robot@10,6 arcade_cabinet@13,4 trash_bin@4,11 beanbag__black@6,10
     cat__black@9,11 lava_lamp@12,10`
  ),
  room(
    'COZY LIBRARY',
    'Wood panelling, herringbone, a wall of books and a cat by the armchair.',
    'wall_panel',
    'floor_herringbone',
    `window__wood@6,1 frame_mountain@10,2 wall_clock__wood@12,1 certificate@14,2 bookcase_wide@0,4 floor_lamp@4,5
     armchair__mustard@5,6 side_table@7,6 ladder_shelf@12,4 bookshelf@14,4 floor_cushion__crimson@1,11
     coffee_table@4,10 rocking_chair@9,9 cat@9,11 book_stack@12,11 globe@14,10`
  ),
  room(
    'SCANDI MINIMAL',
    'Cream walls, birch boards, white wood and a lot of green.',
    'wall_plain__cream',
    'floor_wood__birch',
    `window@2,1 mirror@7,1 photo_frames@11,2 bookshelf__white@0,4 tall_plant@2,5 writing_desk__white@6,6
     office_chair__white@9,6 dresser__white@12,6 snake_plant@15,6 monstera__white@11,9 sofa__sage@3,10
     plant_pot__white@1,11 coffee_table__white@8,11 dog__white@13,11`
  ),
  room(
    "MUSICIAN'S DEN",
    'Brick, dark walnut, an upright piano, records on the wall.',
    'wall_brick',
    'floor_dark',
    `vinyl_wall@1,1 guitar_wall@5,1 guitar_wall__sunburst@6,1 neon_sign__amber@8,0 tapestry@12,1 record_player@0,6
     guitar_stand@3,5 piano@7,5 floor_lamp@11,5 armchair__crimson@2,9 beanbag@6,11 stool@9,10 cat__gray@12,11
     fan@14,10`
  ),
  room(
    'TATAMI STUDY',
    'Sand walls and tatami: a low table, a cushion, a bonsai and a calendar.',
    'wall_plain__sand',
    'floor_tatami',
    `calendar@1,1 window__black@6,1 certificate@11,2 tapestry__ochre@13,0 wall_shelf@11,3 bonsai@1,7
     book_stack@2,7 nightstand@10,6 snake_plant@14,6 coffee_table@5,9 floor_cushion__navy@5,10 cat__calico@9,10`
  ),
  room(
    'AQUARIUM LOUNGE',
    'Navy walls under string lights, a big tank, a sofa and a sleepy dog.',
    'wall_navy',
    'floor_carpet__sand',
    `string_lights@0,0 world_map@6,1 wall_tv@11,1 aquarium@0,5 tall_plant@4,5 sofa__navy@6,6 floor_lamp@10,5
     mini_fridge__mint@14,6 dog__golden@1,11 coffee_table@6,10 beanbag__pink@10,11 hamster_cage@13,9`
  ),
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'my-room',
    date: 'LATE OCT 2026',
    tag: 'NEW FEATURE',
    title: 'MY ROOM and the weekly furniture shop',
    lede: 'Your study hours now furnish a room of your own: a 16 × 12 pixel cross-section you arrange piece by piece.',
    blocks: [
      {
        type: 'stats',
        items: [
          ['Pieces in the catalog', '222'],
          ['On sale each week', '6'],
          ['Copies you can own', '1 of each'],
        ],
      },
      { type: 'h', text: 'Six rooms you can build' },
      {
        type: 'p',
        text: 'Every room below is drawn by the same renderer as your own room, from real catalog pieces, and follows the same placement rules. Switch any of them to night to see the windows, lamps and screens change.',
      },
      { type: 'rooms', rooms: SHOWCASE_ROOMS },
      { type: 'h', text: 'How the shop works' },
      {
        type: 'list',
        items: [
          'Six pieces go on sale each week: one featured, one large, two medium and two small. Everyone sees the same lineup, and it changes when your week starts.',
          'A lineup never shows the same piece twice in different colours, and each piece can be owned once.',
          'Missed something? Lineups rotate, so it comes back in a later week.',
          'Walls and floors are pieces too: buy a wallpaper or flooring and the whole room changes.',
        ],
      },
      { type: 'h', text: 'Arranging your room' },
      {
        type: 'list',
        items: [
          'Open Account Settings → 04 / MY ROOM, pick a piece and tap where it should stand. Green means it fits.',
          'Drag a placed piece to move it, or select it and STORE it. Your room saves on its own.',
          'Screens and LEDs switch on while the stopwatch runs, and windows show the night sky in the evening.',
        ],
      },
    ],
  },
  {
    id: 'bits',
    date: 'LATE OCT 2026',
    tag: 'NEW FEATURE',
    title: 'BITS: a currency you earn by studying',
    lede: 'Every hour you log now pays 100 BITS, whether you timed it with the stopwatch or entered it by hand.',
    blocks: [
      { type: 'figure', kind: 'bits', caption: 'Each committed log pops the header shard and floats the gain.' },
      {
        type: 'stats',
        items: [
          ['Rate', '100 BITS / hour'],
          ['Past logs', 'Paid in full'],
          ['Buffs running at once', '1'],
        ],
      },
      {
        type: 'p',
        text: 'Your balance sits in the header. Commit a log and the gain floats up out of it. Logs written before BITS existed count too, and editing or deleting a log moves the balance with it.',
      },
      { type: 'h', text: 'The BITS exchange' },
      {
        type: 'p',
        text: 'Tap the balance to open the exchange. Buffs cost about a day of study and pay out on the logs you commit while they run, so they only pay off if you put the hours in.',
      },
      {
        type: 'list',
        items: [
          'OVERCLOCK: ×1.5 on your next 20 study hours.',
          'FOCUS CHIP: a flat bonus for every session of 50 minutes or more.',
          'NIGHT SHIFT: ×2 for logs committed between 22:00 and 02:00.',
          'WEEKEND SURGE: ×1.5 on everything you log on Saturday and Sunday.',
          'LUCKY BYTE: each log has a one-in-five chance to pay triple.',
          'HYPERDRIVE: ×2 on your next 25 study hours.',
        ],
      },
    ],
  },
  {
    id: 'learner-profile',
    date: 'LATE OCT 2026',
    tag: 'CHANGE',
    title: 'A shorter learner profile',
    lede: 'STATUS // LEARNER PROFILE now asks for three or four picks that say how you study, ranked by priority.',
    blocks: [
      { type: 'figure', kind: 'profile', caption: 'A ranked profile: the first pick is PRIMARY, and the grip reorders.' },
      {
        type: 'list',
        items: [
          'The list went from about 200 tags to 28 in four groups: study rhythm, study method, learner archetype and study fuel.',
          'Pick up to four. Your first pick is marked PRIMARY.',
          'Reorder by dragging the grip beside each pick; × removes it.',
          'Every group is shown open, with no searching or expanding needed.',
        ],
      },
    ],
  },
  {
    id: 'interface-pass',
    date: 'LATE OCT 2026',
    tag: 'IMPROVEMENT',
    title: 'Smoother controls everywhere',
    lede: 'A round of polish on how the interface moves and fits on a phone.',
    blocks: [
      { type: 'figure', kind: 'interface', caption: 'Segmented controls slide between options; the theme switch morphs.' },
      {
        type: 'list',
        items: [
          'Segmented controls (MANUAL / STOPWATCH, the analytics ranges) now slide between options, and every button presses in a pixel when held.',
          'The light / dark switch in the header morphs between a sun and a crescent moon.',
          'The theme and Clearance lists in settings keep their search and filters in view while you scroll the list.',
          'Clearance reward tags no longer overlap the hours column on narrow screens.',
          'The cadence matrix became a scroll strip covering your full history.',
        ],
      },
    ],
  },
  {
    id: 'cursors',
    date: 'LATE OCT 2026',
    tag: 'NEW FEATURE',
    title: '80 pixel cursors',
    lede: 'Chess pieces, arrows, tools, sky objects and creatures can stand in for the everyday arrow.',
    blocks: [
      { type: 'figure', kind: 'cursors', caption: '36 of the 80 cursors, drawn from the files the app uses.' },
      {
        type: 'list',
        items: [
          'Choose one in Account Settings → 02 / APPEARANCE → CURSOR, in small, medium or large.',
          'New cursors unlock as you climb Clearance levels; one is an Ascension reward.',
          'The pointing hand over clickable things stays the same for every cursor.',
        ],
      },
    ],
  },
  {
    id: 'terminal',
    date: 'LATE OCT 2026',
    tag: 'NEW FEATURE',
    title: 'The command palette is now a terminal',
    lede: 'Press ⌘K and type commands to change fonts, noise, chronometer faces, surfaces, ambient scenes and cursors, or jump around the app.',
    blocks: [
      { type: 'figure', kind: 'terminal', caption: 'A short session in the ⌘K terminal.' },
      {
        type: 'list',
        items: [
          'Namespaces: font, noise, face, surface, ambient, cursor and goto. Type help to list them.',
          'Locked items say what unlocks them instead of disappearing.',
        ],
      },
    ],
  },
  {
    id: 'chronometer-faces',
    date: 'LATE OCT 2026',
    tag: 'NEW FEATURE',
    title: 'Dial chronometer faces',
    lede: 'Twenty-one new dial faces for the system chronometer, unlocked by streaks, logs and hours.',
    blocks: [
      { type: 'figure', kind: 'chrono', caption: 'Four of the dial faces, running on your clock.' },
      {
        type: 'list',
        items: [
          'Instrument faces now stand on their own, without a digital readout beside them.',
          'The stopwatch freezes on the committed time while a log saves.',
        ],
      },
    ],
  },
  {
    id: 'forecast',
    date: 'LATE OCT 2026',
    tag: 'CHANGE',
    title: 'Clearance forecast and a new lunar calendar',
    lede: 'A forecast of when you will reach your next Clearance levels replaced the orrery, and the lunar calendar was restyled.',
    blocks: [
      { type: 'figure', kind: 'forecast', caption: 'The restyled lunar calendar, live for this month.' },
    ],
  },
  {
    id: 'ambient',
    date: 'LATE OCT 2026',
    tag: 'IMPROVEMENT',
    title: 'Ambient scenes and a rebuilt status card',
    lede: 'Ambient mode got new scenes, and the shareable status card was rebuilt from scratch.',
    blocks: [
      { type: 'figure', kind: 'ambient', caption: 'Three ambient scenes, running live.' },
    ],
  },
  {
    id: 'surface-themes',
    date: 'MID OCT 2026',
    tag: 'NEW FEATURE',
    title: 'Surface themes',
    lede: 'Hundreds of paired light and dark palettes for the whole app, unlocked along the Clearance track.',
    blocks: [
      { type: 'figure', kind: 'surfaces', caption: '48 surface pairs: dark side, light side and accent.' },
      {
        type: 'list',
        items: [
          'Each theme is a pair: switch polarity at any time to see its other side.',
          'Prestige themes add optional motion effects.',
        ],
      },
    ],
  },
  {
    id: 'clearance',
    date: 'MID OCT 2026',
    tag: 'NEW FEATURE',
    title: 'Clearance levels',
    lede: 'Logged hours now climb a 3,000-rank Clearance track, split into divisions, with rewards along the way.',
    blocks: [
      { type: 'figure', kind: 'clearance', caption: 'The colours of the Clearance track, from the first level to the last.' },
    ],
  },
  {
    id: 'launch',
    date: 'MID OCT 2026',
    tag: 'LAUNCH',
    title: 'TYPBOX goes live',
    lede: 'A study tracker for logging sessions by category, with weekly targets, analytics and a study cadence matrix.',
    blocks: [
      { type: 'figure', kind: 'launch', caption: 'Example study cadence matrix (sample data).' },
      {
        type: 'list',
        items: [
          'Log time manually or with the stopwatch, by category.',
          'Weekly targets per category, and analytics across weeks and months.',
          'The screen stays awake while the stopwatch runs.',
        ],
      },
    ],
  },
];
