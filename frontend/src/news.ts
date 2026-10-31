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

/** A showcase room tagged with the furniture pack it shows off. */
export interface TourRoom extends ShowcaseRoom {
  pack: string;
}

export type NewsBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'stats'; items: Array<[label: string, value: string]> }
  | { type: 'rooms'; rooms: ShowcaseRoom[] }
  /** Rooms shown one at a time with paging (ROOM TOUR). */
  | { type: 'tour'; rooms: TourRoom[] }
  /** A link that opens another article. */
  | { type: 'link'; article: string; text: string }
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

const tour = (pack: string, ...args: Parameters<typeof room>): TourRoom => ({ pack, ...room(...args) });

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

// Rooms built from the furniture packs added in November.
const PACK_ROOMS: ShowcaseRoom[] = [
  room(
    'KISSA CAFÉ',
    'Mint subway tile and a black-and-white checker floor: a retro fridge, an espresso bar, a vending machine and a cat under the table.',
    'wall_subway__mint',
    'floor_checker_big__black',
    `cafe_board@0,1 pendant_lights__brass@4,0 dish_shelf@8,1 spice_rack@11,2 herb_planter@11,3 neon_open@13,0
     fridge_tall__mint@0,4 kitchen_counter__sage@2,6 stove__white@5,6 espresso_machine@7,6
     water_dispenser__white@8,5 microwave_cart@9,6 vending_machine__red@14,4 tea_cart__pink@1,9
     bar_stool__red@4,9 dining_table__walnut@6,9 bar_stool__red@10,9 gumball_machine@12,8 fern@15,9 cat@12,11`
  ),
  room(
    'ZEN STUDY',
    'Whitewashed planks over tatami: a kotatsu with mikan, a hanging scroll, a folding screen and a paper lantern that glows at night.',
    'wall_plank__whitewash',
    'floor_tatami',
    `kakejiku@1,1 noren__forest@6,1 wave_print@9,1 furin@13,1 chochin@14,0 chochin__white@15,0 tansu@0,6
     andon@3,6 kotatsu__forest@5,7 zabuton__red@4,8 zabuton__red@8,8 bonsai_pine@10,6 ikebana__black@12,6
     byobu@13,5 futon__forest@0,10 daruma@5,11 maneki_neko@6,11 chabudai@9,10 hedgehog@12,11 kadomatsu@14,9`
  ),
  room(
    'GREENHOUSE',
    'Sage shiplap and terrazzo, an egg chair among an olive tree, a lemon tree, a sakura and a lot of smaller green.',
    'wall_shiplap__sage',
    'floor_terrazzo',
    `moss_frame@0,1 hanging_ivy@3,0 hanging_basket@5,0 botanical_print@7,1 floating_plants__white@10,2
     hanging_ivy__white@14,0 olive_tree@0,5 palm__white@2,6 plant_ladder@4,6 egg_chair@6,5
     bird_of_paradise@9,6 lemon_tree@11,6 cherry_blossom@13,5 flower_box@0,10 succulents@2,10
     cactus_trio@3,11 bench@4,10 terrarium@7,11 bunny@9,11 tulip_vase__pink@11,11 sunflower@12,10
     saguaro@15,9`
  ),
];

// ROOM TOUR: one room per furniture pack, shown one at a time.
const TOUR_ROOMS: TourRoom[] = [
  tour(
    'KITCHEN & CAFÉ',
    'LATE-NIGHT DINER',
    'White subway tile over a red checker floor: a red fridge, a chrome stove, an espresso machine and stools at the table.',
    'wall_subway__white',
    'floor_checker_big__red',
    `neon_open@0,0 herb_planter__terracotta@0,2 pot_rack__copper@4,1 spice_rack__ebony@4,2 dish_shelf__ebony@8,1
     cafe_board__black@11,1 wall_clock@14,1 fridge_tall__red@0,4 kitchen_counter__black@2,6 stove__chrome@5,6
     espresso_machine__red@7,6 microwave_cart__black@8,6 water_dispenser__white@10,5 vending_machine__orange@14,4
     gumball_machine__mint@11,8 cat@1,10 bar_stool__red@5,9 dining_table__ebony@6,9 bar_stool__red@9,9
     tea_cart__white@12,9 trash_bin@15,9`
  ),
  tour(
    'STUDY & OFFICE',
    'EXAM SEASON',
    'A chalkboard, the periodic table and a wall of sticky notes above lockers, a standing desk and a drafting table.',
    'wall_plain__sky',
    'floor_parquet__birch',
    `chalkboard__black@0,1 periodic_table__white@4,1 timetable__red@8,1 sticky_wall@11,1 mail_sorter__walnut@14,2
     locker__red@0,4 locker__green@1,4 school_desk__green@2,6 standing_desk__birch@4,6 card_catalog__mint@7,6
     cubby_tower__white@9,4 drafting_table__oak@10,6 laser_printer__white@13,6 cube_shelf__birch@14,6
     office_chair@5,8 shredder@13,9 magazine_rack__brass@3,10 archive_boxes__sky@0,11 archive_boxes__white@1,11
     bookends__brass@12,11`
  ),
  tour(
    'PLANTS',
    'SUNROOM',
    'Pine planks and a cobbled floor between two windows: an olive tree, a lemon tree, a bird of paradise and a rocking chair.',
    'wall_plank__pine',
    'floor_cobble__tan',
    `window@0,1 hanging_basket@4,0 hanging_ivy__sage@6,0 moss_frame__brass@8,1 hanging_basket__ebony@11,0 window@12,1
     hanging_ivy@15,0 rubber_plant__sage@0,5 palm__blush@1,5 bamboo__white@3,5 olive_tree__cream@4,4
     orchid__navy@6,6 money_tree__blush@7,6 rocking_chair@8,6 bird_of_paradise__charcoal@10,5 lemon_tree__navy@12,5
     saguaro__sage@14,5 fern__sage@15,6 terrarium__copper@7,9 flower_box__walnut@0,10 coffee_table@6,10
     sunflower__mustard@11,10 venus_flytrap@2,11 aloe__sage@3,11 succulents__blush@4,11 tulip_vase__lilac@10,11
     cactus_trio__blush@12,11 bunny@14,11`
  ),
  tour(
    'JAPANESE ROOM',
    'RYOKAN NIGHT',
    'Dark planks and tatami: a red kotatsu between two zabuton, a folding screen, a tansu and futons laid out for the night.',
    'wall_plank__walnut',
    'floor_tatami',
    `chochin__mustard@0,0 wave_print__brass@2,1 kakejiku__red@6,1 noren__red@8,1 kakejiku__charcoal@11,1 furin@13,1
     chochin__white@15,0 byobu__cherry@0,5 tansu__cherry@3,6 andon__cherry@6,6 bonsai_pine__terracotta@11,6
     ikebana__forest@13,6 kadomatsu@14,6 kadomatsu@15,6 kotatsu__red@7,7 zabuton__purple@6,8 zabuton__purple@10,8
     futon__sky@0,10 cat@13,10 futon__charcoal@0,11 daruma__gold@5,11 chabudai__birch@6,11 daruma__blue@9,11
     maneki_neko__blue@12,11`
  ),
  tour(
    'MUSIC',
    'REHEARSAL GARAGE',
    'Grey brick and concrete: a sparkle drum kit, a synth, a cello, a harp and a jukebox, with a gramophone for the quiet hours.',
    'wall_brick__gray',
    'floor_concrete',
    `poster_gig__mustard@0,1 cassette_wall__black@3,1 gold_record__black@6,1 violin_wall__cherry@9,1 guitar_wall@10,1
     neon_heart@12,1 vinyl_wall@13,3 jukebox__mint@0,4 drum_kit__gold_sparkle@2,5 guitar_amp__teal@6,6 mic_stand@8,5
     synth_stand__orange@9,6 cello__black@12,4 harp__whitewash@13,4 bass_guitar__teal@15,5 gramophone__brass@0,9
     vinyl_crate__red@2,10 boombox__lemon@5,10 bookshelf_speakers__red@10,10 headphone_stand__pink@8,11
     metronome__red@9,11 beanbag@12,11 dog@14,11`
  ),
  tour(
    'TECH & GAMES',
    'ARCADE BASEMENT',
    'Circuit walls and a diamond-plate floor: a claw machine, pinball, an arcade cabinet, a CRT and a projector screen.',
    'wall_circuit__purple',
    'floor_diamond__black',
    `hex_lights@0,1 game_poster__red@4,1 projector_screen@7,0 handheld_shelf__ebony@12,1 keyboard_display__ebony@12,2
     neon_code@12,3 claw_machine__pink@0,4 pinball__purple@2,5 arcade_cabinet@4,4 crt_tv__walnut@6,6
     game_shelf__ebony@8,6 retro_computer__cream@11,6 pc_tower__pink@13,6 vr_stand__black@14,6 ring_light@15,5
     retro_console__purple@6,8 gaming_chair@9,9 robot@15,10 oscilloscope__mint@0,10 holo_globe__black@3,10
     robot_vacuum__pink@6,11 drone_dock__red@7,11 smart_speaker__blush@8,11 beanbag@11,11 wifi_router__black@14,11`
  ),
  tour(
    'FITNESS, SPORT & PETS',
    'HOME GYM',
    'A climbing wall, a punching bag, a treadmill and a bike, plus a cat tree, a turtle tank and a dog who does not train.',
    'wall_plain__slate',
    'floor_rug__charcoal',
    `climbing_holds__white@0,1 basketball_hoop__red@4,1 tennis_rackets__green@7,1 skateboard_wall__lemon@10,1
     skateboard_wall__purple@11,1 banner_flags__mint@12,0 dartboard__green@13,2 punching_bag__red@0,4
     treadmill__black@2,6 exercise_bike__red@5,6 dumbbell_rack__black@7,7 surfboard__coral@9,4
     trophy_cabinet__walnut@10,6 cat_tree__sage@13,4 bird_cage__brass@15,5 bicycle__mint@6,9 turtle_tank__walnut@14,9
     yoga_mat__lilac@1,10 kettlebell__pink@4,10 kettlebell__mint@5,10 dog_bed__mustard@10,10 dog__golden@12,10
     plush_bear__panda@0,11 fishbowl@1,11 bunny@2,11 hedgehog@3,11 soccer_ball@9,11`
  ),
  tour(
    'LIGHTING',
    'AFTER HOURS',
    'A starry wall full of neon, a chandelier and a disco ball. Switch it to night: almost everything here lights up.',
    'wall_stars__purple',
    'floor_carpet__navy',
    `neon_moon@0,0 disco_ball@4,0 chandelier__black@6,0 neon_cat@10,1 pendant_lights__copper@12,0 wall_sconce__brass@13,2
     wall_sconce__brass@15,2 neon_focus@2,3 neon_code@6,3 arc_lamp__brass@0,5 sofa__navy@2,6 tripod_lamp__mustard@6,5
     lava_tall__gold@7,6 sunset_lamp__gold@8,6 bookshelf@9,4 moon_lamp__white@11,7 salt_lamp__walnut@12,7
     floor_lamp@13,5 fairy_jar__brass@14,7 camping_lantern__green@15,6 coffee_table@3,9 candles__cream@6,9
     lava_lamp@11,9 mushroom_lamp__lilac@0,10 mushroom_lamp__mint@1,10 beanbag__pink@8,10 cat__black@12,11
     candles__red@15,11`
  ),
  tour(
    'WALL DECOR',
    'GALLERY FLAT',
    'Navy wainscot hung edge to edge: prints, a city map, a sunburst mirror, a cuckoo clock and a string of polaroids.',
    'wall_wainscot__navy',
    'floor_herringbone',
    `poster_abstract__mono@0,1 city_map__oak@2,1 polaroid_string__mint@2,3 sunburst_mirror__gold@5,1 barometer__gold@5,3
     botanical_print__gold@7,1 cuckoo_clock__red@9,1 film_poster__teal@10,1 moon_phases__brass@12,0
     poster_pixel_heart__mint@12,1 macrame__white@14,1 dreamcatcher__white@15,1 dresser@0,6 armchair@3,6
     side_table@5,6 easel@6,5 tall_plant@8,5 bookcase_wide@9,4 globe@13,6 fan@14,6 snake_plant@15,6
     floor_cushion@1,10 coffee_table@4,10 cat@8,11 book_stack@11,11 monstera@13,10`
  ),
  tour(
    'SEATING & STORAGE',
    'LOFT SLEEPOVER',
    'Navy plaid and walnut parquet: a loft bed, a terracotta sectional, a papasan, poufs and every kind of shelf and trunk.',
    'wall_plaid__navy',
    'floor_parquet__walnut',
    `string_lights@0,0 photo_frames@1,2 window@5,1 coat_hooks@9,2 wall_shelf@12,1 mirror@12,2 loft_bed__charcoal@0,4
     hall_tree__walnut@4,5 apothecary__cherry@6,5 crate_shelf__whitewash@9,6 display_cabinet__ebony@11,4
     suitcase_stack__mustard@13,6 plant_ladder__black@14,5 drawer_tower__lemon@15,6 sectional__terracotta@1,9
     papasan__cream@8,9 pouf__mustard@5,10 pouf__sage@6,10 steamer_trunk__navy@12,10 safe_box__gold@0,11
     toy_box__red@10,11 shoe_rack__walnut@14,11`
  ),
  tour(
    'EXTRAS',
    'CURIOSITY CABINET',
    'Floral wallpaper over black marble: a dinosaur skeleton, a suit of armour, a spacesuit, a fireplace and three jack-o-lanterns.',
    'wall_floral__navy',
    'floor_marble__black',
    `balloon_model__teal@0,0 world_map@3,1 world_clocks__gold@7,1 certificate@11,1 wall_clock@12,1 dino_skeleton@0,5
     knight_armor__gold@4,4 astronaut_suit@5,4 grandfather_clock__ebony@7,4 fireplace__ebony@8,5 bust_statue__gold@11,6
     telescope@12,5 mannequin__mustard@14,4 rocket_model__blue@15,6 chess_table__walnut@1,9 fountain__white@4,9
     pottery_wheel@7,9 microscope__white@10,10 chemistry_set@11,10 crystal_ball__ebony@14,10 hourglass__brass@15,10
     jack_o_lantern@0,11 jack_o_lantern@3,11 jack_o_lantern@9,11 ship_bottle@14,11 snow_globe__gold@15,11`
  ),
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'dashboard-redesign',
    date: 'EARLY NOV 2026',
    tag: 'REDESIGN',
    title: 'A calmer dashboard: every panel keeps its size',
    lede: 'The dashboard was rebuilt around fixed-size panels. Switching modes, expanding lists or signing out no longer makes anything jump, and a few panels were merged, moved or added.',
    blocks: [
      { type: 'figure', kind: 'kpis', caption: 'The top four numbers, each with a small picture of its own (sample data).' },
      { type: 'h', text: 'Panels that stay put' },
      {
        type: 'list',
        items: [
          'Every panel has a fixed size. Switching MANUAL and STOPWATCH crossfades in place, and analytics views fade in.',
          'SHOW MORE, SHOW ALL and new rows scroll inside the panel instead of stretching it.',
          'Pickers and forms (clock faces, weather, a new or edited category) open over their panel and close with [CLOSE] or Esc.',
          'Signed out, every panel keeps the size it has signed in; empty tables keep their rows.',
        ],
      },
      { type: 'h', text: 'What moved where' },
      {
        type: 'list',
        items: [
          'The system chronometer and LOG SESSION are one console. The clock is larger, and in STOPWATCH mode the readout beside it is the running session.',
          'The top four numbers count up and carry a picture each: the cycle bar, this week by day (with a LIVE chip while the stopwatch runs), the study days of the month and the share of hours by category.',
          'STUDY INSIGHTS is gone as a panel: the streak, record, peak day and average session sit at the top of the cadence matrix, and CSV / JSON export moved next to SHARE CARD.',
          'The category trend table always shows five rows, a +N row and TOTAL. The log stream shows four logs; the registry four categories.',
          'FORECAST // TRAJECTORY is half the height, with gridlines, daily bars, the current value and where the pace lands.',
          'Each panel has corner brackets in your surface theme\'s accent colour; they reach further when you point at the panel.',
        ],
      },
      { type: 'figure', kind: 'rhythm', caption: 'STUDY RHYTHM: hours by the hour you commit and by weekday (sample data).' },
      { type: 'h', text: 'New: STUDY RHYTHM' },
      {
        type: 'p',
        text: 'A new panel shows when you study over the last eight weeks: hours by the hour of day each log was committed, with the NIGHT SHIFT and EARLY BIRD buff windows drawn behind the bars, and hours by weekday. It uses the same clock the buffs check, so it shows which buff suits how you already work.',
      },
      { type: 'h', text: 'Categories' },
      {
        type: 'list',
        items: [
          'Creating and editing a category share one editor with a live preview of the row, a code that fills itself from the name, a weekly-target stepper with quick picks and a warning when a code is taken.',
          'A new category is revealed and flashed in the list, even when it lands past the first four.',
          'Colours are picked from square swatches, here and for the avatar in 01 / PROFILE.',
        ],
      },
    ],
  },
  {
    id: 'room-tour',
    date: 'EARLY NOV 2026',
    tag: 'SHOWCASE',
    title: 'ROOM TOUR: one room for every pack',
    lede: 'Eleven rooms, one for each furniture pack, to page through one at a time: a diner, a ryokan, a garage band, an arcade, a home gym and more.',
    blocks: [
      {
        type: 'p',
        text: 'A thousand pieces are hard to picture from a list, so here is each pack furnished as a whole room. Page with the arrows or the dots, swipe on a phone, or use ← → on a keyboard. The DAY / NIGHT switch stays as you page: try AFTER HOURS at night.',
      },
      { type: 'tour', rooms: TOUR_ROOMS },
      {
        type: 'p',
        text: 'Under each room is its piece count and what it would cost at shop prices, with the study hours that takes at 100 BITS/h. Every room follows the same placement rules as your own MY ROOM, so any of them can be rebuilt piece by piece from the weekly shop.',
      },
      { type: 'link', article: 'furniture-packs', text: 'What is in the eleven packs' },
    ],
  },
  {
    id: 'bits-reset',
    date: 'EARLY NOV 2026',
    tag: 'IMPROVEMENT',
    title: 'Start BITS over and keep every log',
    lede: 'A new reset in ACCOUNT puts BITS and MY ROOM back to the start while your study logs and categories stay exactly as they are.',
    blocks: [
      { type: 'figure', kind: 'bitsreset', caption: 'The ledger before and after: buff bonuses and purchases go, the hours you logged stay.' },
      { type: 'h', text: 'RESET BITS & MY ROOM // KEEP LOGS' },
      {
        type: 'list',
        items: [
          'Every buff and furniture piece you bought is removed, and a running buff ends with no refund.',
          'BITS that buffs added to your logs come off; the logs themselves, with their dates, times and categories, are untouched.',
          'MY ROOM goes back to the starter room.',
          'Your balance becomes the base rate for the hours already logged (100 BITS/h), ready to spend again.',
          'Type RESET to unlock it. Use it to start the economy over, or to put things right straight away if BITS ever look wrong.',
        ],
      },
      { type: 'h', text: 'Which reset to use' },
      {
        type: 'list',
        items: [
          'RESET BITS & MY ROOM (new): clears BITS and the room. Logs and categories stay.',
          'RESET STUDY LOGS, CATEGORIES & BITS: clears logs, categories, BITS and the room. Only the account stays, ready for a backup import, which pays its hours out again at the base rate.',
          'DELETE ACCOUNT: removes everything, the account included.',
        ],
      },
      { type: 'h', text: 'Also in this update' },
      {
        type: 'list',
        items: [
          'Prices now show the study they stand for: a 1,200 BITS piece reads (~12h). Buffs, the weekly shop and the value of your room all show it.',
          'MY ROOM has separate DAY and NIGHT buttons instead of one button that cycled through AUTO, DAY and NIGHT. The room remembers the one you pick.',
          'Both reset buttons now answer like a log commit: the button turns to DONE, a SUCCESS toast pops up and a receipt prints under the button, listing what was removed, what was kept and the time it went through.',
          'ROOM TOUR: a room for each of the eleven furniture packs, in NEWS.',
        ],
      },
      { type: 'link', article: 'room-tour', text: 'Take the ROOM TOUR' },
    ],
  },
  {
    id: 'bits-button',
    date: 'EARLY NOV 2026',
    tag: 'IMPROVEMENT',
    title: 'One BITS mark, and a button that shows your buff',
    lede: 'BITS now use the same amber diamond everywhere, and the header button lights up in the colour of the buff you are running.',
    blocks: [
      { type: 'figure', kind: 'bitsbutton', caption: 'The header button without a buff, and with each buff running in turn.' },
      {
        type: 'list',
        items: [
          'The pixel shard is gone: the header button, balances and prices all use the diamond from the BITS // EXCHANGE title.',
          'While a buff runs, the button glows in its colour and carries its icon in the corner. It switches back on its own when the buff runs out, is used up or is cancelled.',
          'The button stays icon-only, so the header never shifts as your balance grows. Hover it for the balance and the running buff.',
          'The weekly furniture shop now shows twelve pieces instead of six.',
        ],
      },
    ],
  },
  {
    id: 'furniture-packs',
    date: 'EARLY NOV 2026',
    tag: 'NEW FEATURE',
    title: 'Over a thousand pieces of furniture',
    lede: 'MY ROOM went from 222 pieces to 1,243: 262 new designs in eleven themed packs, most of them in several colours.',
    blocks: [
      { type: 'figure', kind: 'furniture', caption: 'A shelf of the new designs, a page at a time, and one piece in every colour.' },
      {
        type: 'stats',
        items: [
          ['Pieces', '1,243'],
          ['Designs', '349'],
          ['New wall & floor', '22'],
        ],
      },
      { type: 'h', text: 'Eleven packs' },
      {
        type: 'list',
        items: [
          'Kitchen & café: a retro fridge in six colours, an espresso bar, a stove and a vending machine.',
          'Study & office: standing and corner desks, a drafting table, chalkboards, lockers and a card catalog.',
          'Plants: ferns, palms, an olive tree, a lemon tree, a venus flytrap and a sakura tree.',
          'Japanese room: kotatsu, tansu, a folding screen, scrolls, lanterns, a daruma and a lucky cat.',
          'Music: a drum kit, a synth, DJ decks, a cello, a harp and a jukebox.',
          'Tech & games: a CRT TV, a home computer, hex light panels, pinball and a claw machine.',
          'Fitness, sport and pets: a treadmill, a climbing wall, a bicycle, a bunny, a parrot and an owl.',
          'Lighting: neon signs, an arc lamp, a moon lamp, a chandelier and a disco ball.',
          'Wall decor: thirty-one posters, prints, clocks, mirrors and shelves.',
          'Seating & storage: a sectional, a hanging egg chair, a loft bed with a desk underneath and a throne.',
          'Extras: a fireplace, a dinosaur skeleton, a spacesuit, a suit of armour and 22 new walls and floors.',
        ],
      },
      {
        type: 'p',
        text: 'The weekly shop now offers twelve pieces instead of six: five small, four medium, two large and one featured, drawn from the whole catalog. A piece you missed comes back in months instead of more than a year. Lamps, screens and neon light up while the stopwatch runs or at night, as before.',
      },
      { type: 'h', text: 'Three rooms from the new packs' },
      { type: 'rooms', rooms: PACK_ROOMS },
      { type: 'link', article: 'room-tour', text: 'ROOM TOUR: a room for every pack' },
    ],
  },
  {
    id: 'buffs-wave-2',
    date: 'EARLY NOV 2026',
    tag: 'NEW FEATURE',
    title: 'Five new buffs, and every buff gets an icon',
    lede: 'The exchange now stocks eleven buffs, each with its own pixel icon, and a crate for the ones who like to gamble.',
    blocks: [
      { type: 'figure', kind: 'buffs', caption: 'All eleven buff icons, with their class letters.' },
      {
        type: 'stats',
        items: [
          ['Buffs in the exchange', '11'],
          ['Cheapest', 'WARM-UP · 400'],
          ['Buffs running at once', 'Still 1'],
        ],
      },
      {
        type: 'list',
        items: [
          'WARM-UP (400): ×2 on your next 5 study hours. A cheap first buff.',
          'EARLY BIRD (650): ×2 for logs committed between 05:00 and 09:00. NIGHT SHIFT for mornings.',
          'MYSTERY CRATE (700): opens into one of nine buffs at random. HYPERDRIVE is in there, rarely.',
          'CATEGORY LOCK (900): pick a category and its logs earn ×2 for up to 12 hours.',
          'DEEP DIVE (1,200): +250 for each single session of two hours or more.',
        ],
      },
      {
        type: 'p',
        text: 'Logs a buff paid out on now carry its icon and the bonus next to the duration, so you can see which sessions it covered.',
      },
      {
        type: 'p',
        text: 'Changed your mind? A running buff can be cancelled from its card. Two thirds of what is left of it comes back (all of it unused: two thirds of the price), and bonuses it already paid stay on your logs.',
      },
      {
        type: 'p',
        text: 'Resetting your study logs now resets BITS too: buffs, furniture and MY ROOM start over, and a backup imported afterwards pays its hours out again at the base rate only.',
      },
    ],
  },
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
          ['On sale each week', '6 (12 since Nov)'],
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
          'Six pieces went on sale each week at launch: one featured, one large, two medium and two small (twelve since November). Everyone sees the same lineup, and it changes when your week starts.',
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
      { type: 'figure', kind: 'bits', caption: 'Each committed log floats the gain out of the BITS button in the header.' },
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
      { type: 'figure', kind: 'ambient', caption: 'Six of the ambient scenes, running live.' },
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
