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

// ROOM TOUR, part 2: one room for each of the six packs added in November.
export const NEW_PACK_ROOMS: TourRoom[] = [
  tour(
    'DATA CENTER VAULT',
    'THE VAULT',
    'Steel panels and a raised floor: racks blinking in rows, a transformer humming, the vault door shut. LEDs wake while the stopwatch runs.',
    'dc_wall_panels__black',
    'dc_raised_floor',
    `dc_warning_beacon__red@0,0 dc_cooling_pipes@1,0 dc_vault_door@5,0 dc_status_wall@9,0 dc_cable_tray@12,0
     dc_patch_panel@12,2 dc_warning_beacon__orange@15,2 dc_server_rack__black@0,4 dc_server_rack__red_alert@2,4
     dc_server_rack__black@4,4 dc_breaker_cabinet@6,5 dc_crash_cart@8,6 dc_ups__black@10,6 dc_transformer__grey@13,5
     dc_fire_extinguisher__crimson@0,10 dc_control_desk__black@1,10 dc_ups__white@6,10 dc_crash_cart__white@9,10
     dc_server_rack__white@11,8 dc_server_rack__white@13,8 dc_fire_extinguisher__lemon@15,10`
  ),
  tour(
    'HARDWARE LAB',
    'MAKERSPACE',
    'OSB walls and a rubber floor: a CNC mill, a robot arm, a drone on the bench and a tool wall with everything in its place.',
    'hw_wall_osb',
    'hw_rubber_floor__charcoal',
    `hw_tool_wall@0,0 hw_breaker_panel@5,0 hw_spool_rack@8,1 dc_warning_beacon__orange@12,0 hw_tool_wall__whitewash@12,1
     hw_cnc_mill@0,5 hw_oscilloscope_bench@2,6 hw_3d_printer@5,6 hw_drone_bench@7,6 hw_robot_arm@10,5
     hw_magnifier_lamp@13,6 hw_parts_drawers@14,6 hw_workbench@0,10 hw_lab_stool@4,10 hw_solder_station@6,11
     hw_power_supply@7,11 hw_lab_stool__black@8,10 hw_parts_drawers__lemon@10,10 hw_cnc_mill__orange@12,9
     hw_3d_printer__white@14,10`
  ),
  tour(
    'ORBITAL HABITAT',
    'DECK 7 CABIN',
    'Hull panels and a station deck: the Earth rising in one window, a nebula in the next, hydroponics, sleep capsules and a hologram table.',
    'orb_hull_wall__white',
    'orb_deck_floor__white',
    `orb_window_earth@0,0 orb_porthole@5,0 orb_window_nebula@8,0 orb_porthole__brass@12,0 orb_handrail__lemon@4,3
     orb_handrail@12,3 orb_airlock_door@0,4 orb_eva_locker@3,4 orb_hydro_pod@5,5 orb_hydro_pod__black@7,5
     orb_control_console@9,6 orb_food_dispenser@12,6 orb_oxygen_tank@13,6 orb_oxygen_tank__orange@14,6
     orb_floating_plant@15,7 orb_sleep_capsule@0,10 orb_holo_table@5,10 orb_rover_model@9,11 orb_floating_plant@11,11
     orb_sleep_capsule__red@12,10`
  ),
  tour(
    'INTELLIGENCE ARCHIVE',
    'SAFEHOUSE',
    'Damask and a Persian carpet: a library with one book out of place, a globe bar, a brass telescope and the operations map.',
    'intel_damask_wall__crimson',
    'intel_persian_floor__navy',
    `intel_portrait@0,1 intel_map_wall@3,0 intel_portrait__brass@7,1 intel_bookcase@10,2 intel_bookcase__cherry@13,2
     intel_telescope@0,5 intel_globe_bar@3,6 intel_record_player@5,6 intel_safe@7,6 intel_file_cabinet@9,6
     intel_wingback@11,6 intel_decanter@13,7 intel_banker_lamp@14,7 intel_cipher_machine@15,7
     intel_chesterfield@0,10 intel_wingback__forest@4,10 intel_desk@7,10 intel_wingback__crimson@11,10
     intel_safe__brass@14,10 intel_file_cabinet__sage@6,10`
  ),
  tour(
    'OUTDOOR BASECAMP',
    'CABIN FEVER',
    'Log walls and a forest floor: a dome tent, a wood stove, giant cacti and a campfire. The fires burn while the stopwatch runs and at night.',
    'camp_log_wall',
    'camp_forest_floor__brown',
    `camp_canoe@0,0 camp_trail_map@5,0 camp_axe_wall@8,1 camp_canoe__forest@11,0 camp_cactus_giant@0,4
     camp_wood_stove@2,5 camp_log_pile@4,7 camp_tent@6,5 camp_lantern_stand@10,5 camp_backpack@11,6 camp_cooler@12,7
     camp_cactus_giant__charcoal@14,4 camp_hammock_stand@0,10 camp_folding_chair@4,10 camp_campfire@6,11
     camp_folding_chair__red@9,10 camp_folding_table@10,11 camp_lantern_stand__black@12,9 camp_log_pile__birch@13,11
     camp_backpack__forest@15,10`
  ),
  tour(
    'CYBER STREET',
    'AFTER THE RAIN',
    'Graffiti brick over wet asphalt: a noodle stall, hologram vending, an arcade cabinet and neon. Best seen with NIGHT on.',
    'cyber_graffiti_wall',
    'cyber_wet_asphalt',
    `cyber_neon_sign@0,0 cyber_ac_unit@4,0 cyber_ac_unit__grey@4,2 cyber_cable_mess@6,0 cyber_lantern_string@6,2
     cyber_neon_sign__teal@11,0 cyber_lantern_string__pink@12,3 cyber_holo_vending@0,4 cyber_steam_duct@2,5
     cyber_food_stall@4,5 cyber_stall_stool@8,7 cyber_arcade_cab@9,4 cyber_holo_ad@11,5 cyber_power_box@13,6
     cyber_trash_bin@14,6 cyber_trash_bin__blue@15,6 cyber_hover_scooter@0,10 cyber_crates@3,10
     cyber_stall_stool__blue@6,11 cyber_stall_stool__lemon@7,11 cyber_food_stall__navy@8,9 cyber_crates__blue@12,10
     cyber_holo_vending__teal@14,8`
  ),
];

// Chairs tucked into desks (furniture.CHAIR_BASES / DESK_BASES).
const TUCK_ROOMS: ShowcaseRoom[] = [
  room(
    'TUCKED IN',
    'Every chair pushed in at its desk: a study desk, a corner desk with a gaming chair, a kotatsu with a cushion and stools at the dining table.',
    'wall_panel',
    'floor_herringbone',
    `frame_mountain@2,1 wall_clock@7,1 poster_grid@11,1 kotatsu@1,6 zabuton@2,7 corner_desk@10,6
     gaming_chair@12,6 starter_desk@0,10 starter_chair@1,10 writing_desk@5,10 office_chair@6,10
     dining_table@11,10 bar_stool@11,10 bar_stool@13,10`
  ),
];

// Five rooms of one operator, for the five-rooms article: mixed packs,
// each with a chair tucked in somewhere.
const SLOT_ROOMS: ShowcaseRoom[] = [
  room(
    'STUDY DEN',
    'Panelled and quiet: the partner\'s desk with its chair pushed in, a globe bar, the record console and the library case.',
    'wall_panel',
    'floor_herringbone',
    `intel_map_wall@1,1 intel_portrait@6,1 camp_trail_map@10,1 intel_bookcase@13,2 intel_desk@1,6 office_chair@3,6
     intel_globe_bar@6,6 intel_file_cabinet@9,6 intel_wingback@11,6 intel_chesterfield@0,10 intel_decanter@5,11
     intel_record_player@8,10 intel_safe@13,10 intel_cipher_machine@15,11`
  ),
  room(
    'NIGHT OWL',
    'Neon, a server rack and an arcade cabinet over wet asphalt, with the gaming chair tucked into the NOC desk.',
    'cyber_graffiti_wall__teal',
    'cyber_wet_asphalt__purple',
    `cyber_neon_sign__pink@0,0 cyber_lantern_string__lemon@4,0 dc_status_wall@9,0 cyber_ac_unit@13,0 cyber_cable_mess@4,2
     cyber_arcade_cab@0,4 dc_server_rack__black@2,4 dc_control_desk__black@4,6 gaming_chair@5,6 cyber_crates@10,6
     cyber_trash_bin@12,6 cyber_holo_vending__teal@14,4 cyber_hover_scooter__black@1,10 cyber_stall_stool__pink@6,11
     cyber_power_box@8,10 cyber_steam_duct@12,9`
  ),
  room(
    'WEEKEND CAMP',
    'Log walls, a dome tent and a wood stove; a camp chair pulled up to the stove table by the fire.',
    'camp_log_wall__pine',
    'camp_forest_floor__forest',
    `camp_canoe__red@0,0 camp_axe_wall@5,1 camp_trail_map__pine@8,0 cyber_lantern_string__white@11,1
     camp_cactus_giant__blush@0,4 camp_tent__forest@3,5 camp_wood_stove__black@8,5 camp_log_pile@10,7
     camp_lantern_stand__brass@13,5 camp_backpack__orange@14,6 camp_hammock_stand__teal@0,10 camp_campfire@6,11
     camp_folding_table__pine@9,11 camp_folding_chair__navy@10,10 camp_cooler__red@12,11`
  ),
  room(
    'ZERO-G NAP',
    'Black hull panels, a nebula outside, sleep capsules and a lab stool at the flight console.',
    'orb_hull_wall__black',
    'orb_deck_floor__chrome',
    `orb_porthole@0,0 orb_window_nebula__teal@3,0 orb_porthole__copper@7,1 orb_handrail__orange@10,1 orb_handrail@10,3
     orb_eva_locker__black@0,4 orb_hydro_pod__chrome@2,5 orb_control_console__black@6,6 hw_lab_stool@7,6
     orb_oxygen_tank__green@10,6 orb_food_dispenser@11,6 orb_floating_plant@13,7 orb_sleep_capsule__lilac@0,10
     orb_holo_table__purple@6,10 orb_rover_model__gold@10,11 orb_sleep_capsule__mint@12,10`
  ),
  room(
    "MAKER'S CORNER",
    'A tool wall and a breaker panel over two benches, a stool tucked in at each, the robot arm and the CNC mill.',
    'hw_wall_osb__greywash',
    'hw_rubber_floor__navy',
    `hw_tool_wall__pine@0,0 hw_breaker_panel__white@5,0 hw_spool_rack__navy@8,1 dc_cable_tray@12,0 hw_cnc_mill__green@0,5
     hw_workbench__birch@2,6 hw_lab_stool__mint@4,6 hw_3d_printer__copper@7,6 hw_robot_arm__lemon@10,5
     hw_parts_drawers__red@14,6 hw_drone_bench__red@0,10 hw_lab_stool@1,10 hw_oscilloscope_bench__ebony@5,10
     hw_magnifier_lamp@9,10 hw_power_supply@10,11 hw_solder_station@11,11 dc_fire_extinguisher__crimson@15,10`
  ),
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'buff-rests',
    date: 'EARLY NOV 2026',
    tag: 'GUIDE',
    title: 'How long each buff rests',
    lede: 'Every buff has a rest of its own, and the rest of the shop stays open while it waits. Here is the full list, and how MYSTERY CRATE now changes every 6 hours.',
    blocks: [
      {
        type: 'stats',
        items: [
          ['WARM-UP', '6h'],
          ['STORM RUNNER', '8h'],
          ['OVERCLOCK', '12h'],
          ['LUNAR TIDE', '12h'],
          ['WEEKEND SURGE', '12h'],
          ['LUCKY BYTE', '12h'],
          ['MYSTERY CRATE', '14h'],
          ['FOCUS CHIP', '16h'],
          ['CATEGORY LOCK', '16h'],
          ['NIGHT SHIFT', '18h'],
          ['EARLY BIRD', '20h'],
          ['DEEP DIVE', '24h'],
          ['IRON CONTRACT', '24h'],
          ['HYPERDRIVE', '36h'],
        ],
      },
      {
        type: 'p',
        text: 'The rest starts when the buff ends, however it ended, and only holds back that one buff. Only one buff can run at a time, but as soon as it is over you can start any other that is ready. A buff you cancel before it has paid on any log does not rest at all.',
      },
      {
        type: 'p',
        text: 'A MYSTERY CRATE rests for 14 hours, and the buff it opened into rests for its own time as well. Every buff card shows its rest, and READY IN on the button counts down what is left.',
      },
      {
        type: 'p',
        text: 'The crate itself now changes every 6 hours: at 00:00, 06:00, 12:00 and 18:00 your time. OMEN shows what is inside this crate, on the wish card and on the crate\'s own card in place of the odds. When the crate changes, what the stars saw is gone and OMEN can be used again. If the crate would still be resting when it changes, OMEN stays off so no stars are wasted.',
      },
    ],
  },
  {
    id: 'festival-bar',
    date: 'EARLY NOV 2026',
    tag: 'NEW',
    title: 'The festival bar',
    lede: 'Every hour you log during a festival now fills a bar, and the bar pays out along the way: BITS, a cursor of that festival\'s own, and the biggest BITS at the very end.',
    blocks: [
      { type: 'figure', kind: 'festbar', caption: 'The bar during the Culture Festival, and the ten cursors the festivals give out.' },
      {
        type: 'stats',
        items: [
          ['Festivals with a bar', '10'],
          ['Steps on each bar', '5'],
          ['Goal', '5 hours per festival day'],
        ],
      },
      {
        type: 'p',
        text: 'While a festival runs, a line at the top of the dashboard shows how far you have come, and the banner under CHALLENGES shows what is next. The goal follows the length of the festival: five hours for each of its days, so Setsubun asks for 15 hours and the whole of August for 155. Only what you commit during the festival counts, plus a session that runs past its last midnight. The bar starts with this Culture Festival; earlier festivals have none.',
      },
      {
        type: 'p',
        text: 'The five steps are BITS, the festival\'s cursor, BITS, BITS, and three times the BITS for finishing. The cursor stays yours for good, and the BITS come round again next year. It is all worked out from your logs, so a BITS reset or a backup of nothing but logs brings every step back. Delete the logs that reached a step while the festival is still running, and the step goes too.',
      },
    ],
  },
  {
    id: 'cooldown-price',
    date: 'EARLY NOV 2026',
    tag: 'BALANCE',
    title: 'Every way of playing, on equal terms',
    lede: 'Buff cooldowns no longer last 24 hours for everything. Each buff now has a timer of its own, so another can run while one rests, and seven buffs that only paid off in a narrow case got cheaper.',
    blocks: [
      { type: 'figure', kind: 'cooldowns', caption: 'How long each buff rests after it ends. The others stay on sale meanwhile.' },
      {
        type: 'p',
        text: 'With one cooldown for all, WARM-UP was hardly worth buying: gone in a few hours, then a whole day with no buff at all. Now only the buff you just used has to rest, and for as long as suits it: 6 hours for WARM-UP, 8 for STORM RUNNER, 36 for HYPERDRIVE. Run WARM-UP after WARM-UP, go straight from it into NIGHT SHIFT, or rotate through the shop. One buff still runs at a time. A MYSTERY CRATE rests for 14 hours, and so does whichever buff it opened into, for that buff\'s own time.',
      },
      {
        type: 'stats',
        items: [
          ['OVERCLOCK', '800 → 600'],
          ['STORM RUNNER', '800 → 600'],
          ['LUNAR TIDE', '900 → 500'],
          ['WEEKEND SURGE', '1,000 → 600'],
          ['LUCKY BYTE', '1,000 → 600'],
          ['DEEP DIVE', '1,500 → 1,200'],
          ['HYPERDRIVE', '1,800 → 1,200'],
        ],
      },
      {
        type: 'p',
        text: 'DEEP DIVE also pays +300 for a two-hour log, up from +250, so it no longer loses money for someone who studies in two-hour blocks. A buff already running keeps the price it was bought at.',
      },
    ],
  },
  {
    id: 'fewer-themes',
    date: 'EARLY NOV 2026',
    tag: 'CHANGE',
    title: 'Fewer Surface Themes, drawn by hand',
    lede: 'There were 912, and too many of them were nearly the same. Now there are 61, every one chosen by hand, and you get one every 50 ranks.',
    blocks: [
      { type: 'figure', kind: 'themes', caption: 'A few of the 61: blacks, whites and paper colours, then a deep field against one signal colour.' },
      {
        type: 'stats',
        items: [
          ['SIMPLE', '31'],
          ['DUOTONE', '30'],
          ['A new one every', '50 ranks'],
          ['Ranks', '3,000, as before'],
        ],
      },
      {
        type: 'p',
        text: 'SIMPLE themes keep to blacks, whites and paper colours, so only the accent has any colour. DUOTONE themes set one deep colour against one signal colour: navy and orange, forest and gold, black and red.',
      },
      {
        type: 'p',
        text: 'Themes now arrive on the round numbers: LV.0050, LV.0100, LV.0150 and so on, so the next one is always easy to work out. They alternate between the two series, and the last rank of every division, from INITIATE to MONOLITH, is always a DUOTONE. That is about 8 hours of study apart at first, then 17, and 21 near the end of a cycle.',
      },
      {
        type: 'p',
        text: 'If you were using a theme that has gone, you have been moved to the closest one that is left. The illustrated Ascension themes and their motion switch went with the rest. Ascension itself stays, with its badge and its cursors and chronometer faces.',
      },
    ],
  },
  {
    id: 'trophies',
    date: 'EARLY NOV 2026',
    tag: 'NEW',
    title: 'COLLECTION: 52 trophies',
    lede: 'Trophies have moved out of your room and into a tab of their own, and there are a lot more of them.',
    blocks: [
      { type: 'figure', kind: 'trophies', caption: 'Seven kinds, in six metals from BRONZE to MYTHIC.' },
      {
        type: 'stats',
        items: [
          ['Trophies', '52'],
          ['Study hours', 'up to 10,000'],
          ['Longest streak', 'up to 365 days'],
        ],
      },
      {
        type: 'p',
        text: 'A new tab beside FURNITURE keeps study hours, sessions logged, days studied, your longest streak, challengers beaten, other sides beaten and festival bars finished. Pick a kind, scroll along the row, and choose any piece to put it on the stage. Below them is your record against every challenger. Trophies and medals used to be furniture; any that were standing in a room have moved here.',
      },
    ],
  },
  {
    id: 'inverted',
    date: 'EARLY NOV 2026',
    tag: 'NEW',
    title: 'The other side',
    lede: 'Bosses hit back now. Beat one three times and a new button appears on its card: press it, and it turns around. And backups now bring back everything.',
    blocks: [
      { type: 'figure', kind: 'inverted', caption: 'The twelve regulars, and what is on the other side of each.' },
      {
        type: 'stats',
        items: [
          ['Wins to open it', '3'],
          ['Inverted challengers', '12'],
          ['First clear bonus', 'up to +4,000'],
        ],
      },
      { type: 'h', text: 'BOSSES HIT BACK' },
      {
        type: 'p',
        text: 'Every boss now attacks once a day, on a clock that starts when the raid does. If you have dealt an hour of damage since its last attack, you parry it. If not, it takes BITS: 50 to 170 depending on the boss. A blow that bounced or missed parries nothing. A session running across the moment still counts, so committing it afterwards gives those BITS back. An attack never takes your balance below zero, and giving up stops it. Loot went up by about 15% to pay for the danger.',
      },
      { type: 'h', text: 'INVERT' },
      {
        type: 'p',
        text: 'Your first win over a regular boss or rival puts a small 1/3 on its card. At 3/3 it becomes a button. Press INVERT and it turns around, with its own rules, fee and prize. Press again to turn it back. Once a fight has started, the side is fixed. Being studious is not enough here: the rules have turned over, so each of these asks you to study differently.',
      },
      {
        type: 'stats',
        items: [
          ['GOLEM', 'Logs of 60 min or more bounce off'],
          ['NIGHTMARE', 'Heals 2h at midnight and at noon'],
          ['HYDRA', 'A head falls, the others heal a quarter'],
          ['WARDEN', 'A day under 2h heals it 4h'],
          ['PHANTOM', 'The same category twice misses'],
          ['TITAN', 'No criticals. 75 hours of HP'],
        ],
      },
      {
        type: 'p',
        text: 'Inverted bosses have 2.5 times the HP (WARDEN 3 times), attack every 12 hours, and take 3 hours of damage to parry.',
      },
      {
        type: 'stats',
        items: [
          ['ORION', 'Only sessions started 04:00-11:59 count'],
          ['NOVA', 'Only sessions started 20:00-03:59 count'],
          ['RUSH', 'Your last 24 hours against their 72'],
          ['KAI', 'Only logs of 30 min or less count'],
          ['MIKA', 'About 11 hours a day. Win all three rounds'],
          ['ACE', 'Fourteen hours a day. No tricks'],
        ],
      },
      { type: 'h', text: 'BACKUPS BRING IT ALL BACK' },
      {
        type: 'p',
        text: 'A JSON backup now also holds your purchases, buff bonuses, wins, rooms, STARLIGHT and settings, so export, clear and import puts your balance and furniture back where they were. Two things cannot come back as they were: a challenge still running gives back its entry fee instead, and a running buff ends with the usual refund. Backups made before this change still work, and pay at the base rate as they always did.',
      },
    ],
  },
  {
    id: 'festival-year',
    date: 'EARLY NOV 2026',
    tag: 'GUIDE',
    title: 'The festival year',
    lede: 'Ten festivals, on the same dates every year. Each one brings its own challengers, its own furniture and a rule you will not meet anywhere else. Here is who to expect, and when.',
    blocks: [
      { type: 'figure', kind: 'festyear', caption: 'The whole year: ten festivals, on the same dates every year.' },
      {
        type: 'stats',
        items: [
          ['Festivals', '10'],
          ['Bosses', '10'],
          ['Rivals', '10, three of them hidden'],
          ['Limited furniture', '38 pieces'],
        ],
      },
      { type: 'p', text: 'See what is on under EVENTS in the LUNAR CALENDAR. Tap a marked day to read about its festival. Limited furniture is on sale in the BITS // EXCHANGE while its festival runs, and it comes back the next year, so nothing is gone for good. 5 STARLIGHT will wish for a piece outright.' },
      { type: 'h', text: "NEW YEAR \u00b7 DEC 31 TO JAN 3" },
      { type: 'figure', kind: 'fest-newyear', caption: "The offering woke up, and the shrine maiden has seen worse." },
      { type: 'p', text: "KAGAMI is the New Year offering come to life, and it only feels one long sitting: logs under an hour bounce off. MIKO spends the holiday sweeping the shrine and selling charms, and studies before anyone else is up." },
      {
        type: 'rooms',
        rooms: [
          room("THE FIRST MORNING", "Lion dance, an offering and a paddle on the wall.", 'wall_plain', 'floor_wood', 'ny_hagoita@2,1 ny_kagami@6,5 ny_shishi@9,5 kotatsu@3,8'),
        ],
      },
      { type: 'h', text: "SETSUBUN \u00b7 FEB 1 TO 3" },
      { type: 'figure', kind: 'fest-setsubun', caption: "Three days, and it hates small things thrown often." },
      { type: 'p', text: "For once, short sessions are the weapon. ONI takes double damage from logs of 30 minutes or less, so this is the festival for a day of quick sittings. It is only here for three days." },
      {
        type: 'rooms',
        rooms: [
          room("DEMONS OUT", "A mask on the wall and beans ready to throw.", 'wall_plain', 'floor_wood', 'st_oni_mask@7,1 st_bean_box@5,6 st_ehomaki@8,6'),
        ],
      },
      { type: 'h', text: "VALENTINE \u00b7 FEB 10 TO 14" },
      { type: 'figure', kind: 'fest-valentine', caption: "One of them has a very specific reason to study." },
      { type: 'p', text: "BITTER is everything left in the box, and it dodges one hit in four. CHOCO splits the evening between mathematics and tempering chocolate, and is not going to lose to you." },
      {
        type: 'rooms',
        rooms: [
          room("SOMETHING SWEET", "A fountain, a box and letters that may never be sent.", 'wall_plain', 'floor_wood', 'vt_letters@7,2 vt_fountain@3,3 vt_gift@8,4'),
        ],
      },
      { type: 'h', text: "HANAMI \u00b7 MAR 25 TO APR 10" },
      { type: 'figure', kind: 'fest-hanami', caption: "The storm, and the transfer student who came with it." },
      { type: 'p', text: "FUBUKI is the storm that strips the trees, and every full day without a log it grows back. SAKURA transferred in with the blossoms and spends her afternoons under them. She leaves when they do." },
      {
        type: 'rooms',
        rooms: [
          room("UNDER THE TREES", "A full-grown tree that fills the room, and somewhere to sit.", 'wall_plain', 'floor_wood', 'hn_lantern@7,1 hn_sakura_tree@1,3 hn_blue_sheet@6,7'),
        ],
      },
      { type: 'h', text: "TANABATA \u00b7 JUL 1 TO 7" },
      { type: 'figure', kind: 'fest-tanabata', caption: "A dragon of stars, and the weaver on her one night off." },
      { type: 'p', text: "The RIVER OF HEAVEN is a dragon with one head for every subject you take it on with, and a log only reaches its own. ORIHIME works the loom through the day and looks at the river at night." },
      {
        type: 'rooms',
        rooms: [
          room("ONE NIGHT A YEAR", "Wishes on the bamboo and magpies across the wall.", 'wall_plain', 'floor_wood', 'tb_magpie@6,1 tb_tanzaku@11,1 tb_bamboo@2,1 kotatsu@7,6'),
        ],
      },
      { type: 'h', text: "SUMMER BREAK \u00b7 AUGUST" },
      { type: 'figure', kind: 'fest-summer', caption: "The deadline itself, and someone who has not started." },
      { type: 'p', text: "AUGUST 31 grows back two hours on every empty day, so an early start pays. Late in the month, someone else shows up asking to see your homework." },
      {
        type: 'rooms',
        rooms: [
          room("THERE IS PLENTY OF TIME", "A mosquito net, shaved ice and a watermelon.", 'wall_plain', 'floor_wood', 'sm_uchiwa@8,1 sm_mosquito_net@1,3 sm_kakigori@7,6 sm_watermelon@9,6 sm_bug_cage@12,6'),
        ],
      },
      { type: 'h', text: "TSUKIMI \u00b7 SEP 15 TO 25" },
      { type: 'figure', kind: 'fest-tsukimi', caption: "Look up. Someone up there is keeping count." },
      { type: 'p', text: "TSUKUYOMI rules the night and heals an hour at every midnight, so it takes steady work over eight days. USAGI studies orbital mechanics and pounds rice cakes on the moon between lessons." },
      {
        type: 'rooms',
        rooms: [
          room("THE HARVEST MOON", "A window with the moon in it, dumplings and pampas grass.", 'wall_plain', 'floor_wood', 'tk_moon_window@6,0 tk_dango@4,4 tk_susuki@10,3'),
        ],
      },
      { type: 'h', text: "HALLOWEEN \u00b7 OCT 25 TO 31" },
      { type: 'figure', kind: 'fest-halloween', caption: "It only comes out after dark, and it is not alone." },
      { type: 'p', text: "JACK can only be hit at night: logs committed from 05:00 to 17:59 pass right through him. If you are awake in the small hours, something else may show itself." },
      {
        type: 'rooms',
        rooms: [
          room("AFTER DARK", "Switch it to night. The cauldron has been waiting.", 'wall_plain', 'floor_wood', 'hw_web@1,0 hw_tombstone@3,4 hw_cauldron@7,4 hw_ghost@11,4'),
        ],
      },
      { type: 'h', text: "CULTURE FESTIVAL \u00b7 NOV 1 TO 7" },
      { type: 'figure', kind: 'fest-culture', caption: "The night before you go on, and the person holding the schedule." },
      { type: 'p', text: "STAGE FRIGHT only shows itself after dark: daytime logs pass right through. IINCHO, the class president, is running the whole festival from a laminated schedule, and still finds time to study." },
      {
        type: 'rooms',
        rooms: [
          room("NOTHING IS READY", "A stall, a stage and a banner someone painted last night.", 'wall_plain', 'floor_wood', 'bk_banner@6,0 bk_curtain@10,1 bk_stall@1,2 bk_sign@6,3'),
        ],
      },
      { type: 'h', text: "CHRISTMAS \u00b7 DEC 20 TO 25" },
      { type: 'figure', kind: 'fest-christmas', caption: "He has one night, and he has not started. There is also the other list." },
      { type: 'p', text: "SANTA barely works until the 24th, then studies route optimization, world geography and reindeer husbandry all night. KRAMPUS keeps the other list and dodges one hit in four. Log 5 hours from the 20th to the 24th and a present opens on the 25th, with a limited piece inside, free. Beat SANTA and someone else comes looking for you." },
      {
        type: 'rooms',
        rooms: [
          room("CHRISTMAS EVE", "The tree, the fireplace and a sleigh parked inside.", 'wall_plain', 'floor_wood', 'xmas_wreath@7,1 xmas_grand_tree@1,1 xmas_mantle@3,3 xmas_sleigh@8,4 xmas_sack@13,4'),
        ],
      },
    ],
  },
  {
    id: 'festivals',
    date: 'EARLY NOV 2026',
    tag: 'NEW',
    title: 'FESTIVALS, and a room that lives through the day',
    lede: 'Ten festivals now pass through TYPBOX, each with its own challengers, limited furniture and one rule of its own. Your room gets darker at night, and its windows look out on the real weather.',
    blocks: [
      { type: 'figure', kind: 'festivals', caption: 'The boss waiting at each festival. More are coming with them, and three of those are hidden.' },
      {
        type: 'stats',
        items: [
          ['Festivals', '10, the same dates every year'],
          ['Limited pieces', '38, back again next year'],
          ['Challengers', '20, three of them hidden'],
          ['New designs', '73, with 22 old ones redrawn'],
        ],
      },
      { type: 'link', article: 'festival-year', text: 'The festival year: who to expect, and when' },
      { type: 'h', text: 'YOUR ROOM' },
      {
        type: 'rooms',
        rooms: [
          room(
            'LIVES THROUGH THE DAY',
            'Switch it to night: the lamps take over, the cat curls up and the city lights come on.',
            'wall_plain',
            'floor_wood',
            'curtain_velvet@0,0 win_city@1,0 curtain_velvet@4,0 moon_phases@6,0 win_sea@10,0 chandelier@13,1 bed_platform@0,5 floor_lamp@5,5 pet_cat_loaf@6,6 sofa@8,5 desk_lamp@13,5 trophy_500h@15,4 rug_persian@2,8 pet_dog_nap@8,8 bathtub@11,9 xmas_candy_cane@0,8 pet_rabbit@6,10'
          ),
        ],
      },
      {
        type: 'list',
        items: [
          'At night the room falls dark, and only what gives light pushes back.',
          'Five new windows look out on a city, a forest, the sea and a peak, with the real time of day and whatever is falling outside.',
          'Curtains, a bathroom, a bedroom, rugs, a study carrel and more. Pets settle down to sleep at night.',
        ],
      },
    ],
  },
  {
    id: 'starlight',
    date: 'EARLY NOV 2026',
    tag: 'NEW',
    title: 'STARLIGHT, a buff cooldown and logs that settle',
    lede: 'Days without a buff now light a night sky that can save your next big run. Buffs take a breath between them, logs settle after three days, and a commit asks you to look before it lands.',
    blocks: [
      { type: 'figure', kind: 'starlight', caption: 'Each dipper is seven stars. A finished one covers one failure.' },
      {
        type: 'stats',
        items: [
          ['One star', 'A day with a log no buff paid on'],
          ['A save', '7 stars · once per buff'],
          ['Buff cooldown', 'One timer per buff'],
          ['Logs lock', '3 days after their commit'],
        ],
      },
      { type: 'h', text: 'STARLIGHT' },
      {
        type: 'p',
        text: 'Every day with a log no buff paid on is a star, up to 14, and that goes for the logs you already have. A log only counts if it was committed within two days of its date. With 7 or more, a buff that fails its condition keeps running in exchange for 7 of them. Stars can also re-deal the furniture shop (2) or show what MYSTERY CRATE holds (3). The crate changes every 6 hours (00:00, 06:00, 12:00 and 18:00 your time), and what the stars saw goes with it.',
      },
      {
        type: 'list',
        items: [
          'HYPERDRIVE: covers one short day.',
          'EARLY BIRD: covers one missed morning.',
          'FOCUS CHIP: covers one short log.',
          'IRON CONTRACT: covers one missed day, except the last, since the payout needs the log that completes it.',
          'Two failures at once are past saving, and no stars are spent on them.',
        ],
      },
      { type: 'h', text: 'BUFF COOLDOWN' },
      {
        type: 'p',
        text: 'After a buff ends, however it ended, that buff rests on its own timer, from 6 hours for WARM-UP to 36 for HYPERDRIVE. Other buffs stay on sale. A buff cancelled before it paid on any log leaves no cooldown. Challenges and furniture are not affected.',
      },
      { type: 'h', text: 'LOGS' },
      {
        type: 'list',
        items: [
          'COMMIT LOG takes two taps, and the second shows what is about to land.',
          'A log can be edited or deleted for 3 days after its commit, then it is sealed.',
          'A buff bonus is settled at commit: editing a log no longer trims it.',
          'Deleting a log hands back what it drew from a buff that is still running, so committing it again costs nothing extra. LUCKY BYTE rolls stay spent.',
          'A session running past a morning, midnight or a buff\'s end counts from when it started, if committed within 3 hours.',
        ],
      },
      { type: 'h', text: 'CHALLENGES' },
      {
        type: 'list',
        items: [
          'Fixing a typo on a log restores its hit on the boss, up to what it dealt at commit.',
          'Editing a log up to the goal on the last day of IRON CONTRACT now pays out.',
          'A HYDRA head whose category was deleted or marked DONE falls once another head has been cut down by real hits.',
        ],
      },
      { type: 'h', text: 'BACKUPS' },
      {
        type: 'p',
        text: 'Stars come from your logs, so a clear takes them with the logs, and importing a backup counts them again from its oldest log to its newest.',
      },
    ],
  },
  {
    id: 'challenges',
    date: 'EARLY NOV 2026',
    tag: 'NEW',
    title: 'CHALLENGES: boss raids and rivals',
    lede: 'A second slot opens next to your buff. Fight a boss with your study hours, or take on a rival who studies on their own schedule, and see what they are doing right now.',
    blocks: [
      { type: 'figure', kind: 'challenges', caption: 'A raid boss taking hits, and the three rivals at their desks (or not).' },
      {
        type: 'stats',
        items: [
          ['Bosses', '6'],
          ['Rivals', '6'],
          ['Runs with a buff', 'Yes · one challenge at a time'],
        ],
      },
      { type: 'h', text: 'BOSS RAID' },
      {
        type: 'p',
        text: 'Pay the entry fee and a boss appears. Every log you commit hits it for its minutes (up to 3 hours of one log), and a log of 90 minutes or more is a critical for ×1.5. Bring it down before its days run out and the loot is yours; if it gets away, you still get a share for the damage you dealt. HYDRA asks you to pick the two or three categories that become its heads.',
      },
      {
        type: 'list',
        items: [
          'GOLEM: logs under 60 minutes bounce off.',
          'NIGHTMARE: heals an hour at every midnight.',
          'HYDRA: one head per category, and a log only hits its own head.',
          'WARDEN: heals two hours after a full day without a log.',
          'PHANTOM: dodges one hit in four.',
          'TITAN: 30 hours of HP, a week to bring it down, and loot to match.',
        ],
      },
      { type: 'h', text: 'RIVAL' },
      {
        type: 'p',
        text: 'A 72-hour duel that starts the moment you buy it, just like a raid. Six rivals, six ways of studying: ORION every morning, NOVA through the night, RUSH little all week and then the whole weekend (so RUSH\'s prize follows the hours the duel will cover), KAI in 25-minute blocks all day, MIKA on the train to and from work (the easy one), and ACE, eight hours a day, every day (the hard one). Each keeps a real daily schedule: open the duel any time to see whether they are studying, on a break or asleep, and the race between their hours and yours. The hours still to come stay under fog. Win and you take the prize; a tie gives the entry fee back.',
      },
      {
        type: 'p',
        text: 'Find both under CHALLENGES in the BITS // EXCHANGE. Giving up ends a challenge at once and refunds nothing.',
      },
    ],
  },
  {
    id: 'buff-guide',
    date: 'EARLY NOV 2026',
    tag: 'GUIDE',
    title: 'Which buff fits the way you study?',
    lede: 'Fourteen buffs, and no single best one: each pays most for a different way of studying. Find the line that sounds like you, then see which CHALLENGE to run next to it. (Numbers as of November 2026; "pays back" is the most a buff can return, as a multiple of its price.)',
    blocks: [
      { type: 'figure', kind: 'buffguide', caption: 'Every buff by how much it can pay back and what you stand to lose. Pick a study style to see what fits.' },
      {
        type: 'stats',
        items: [
          ['LUNAR TIDE · DEEP DIVE', '2.3–2.4×'],
          ['HYPERDRIVE · IRON CONTRACT · WEEKEND SURGE', '2.0–2.1×'],
          ['OVERCLOCK · STORM RUNNER', '1.67×'],
          ['NIGHT SHIFT · EARLY BIRD · FOCUS CHIP', '1.5×'],
          ['CATEGORY LOCK · WARM-UP', '1.25–1.33×'],
          ['LUCKY BYTE · MYSTERY CRATE', 'Luck'],
        ],
      },
      { type: 'h', text: 'You put in 5+ hours every day' },
      {
        type: 'p',
        text: 'IRON CONTRACT (1,500) is the biggest sure payout in the shop: three calendar days of 5 hours each, starting the midnight after you sign, and the log that completes day 3 pays +3,000. Miss one day and the stake is gone, and cancelling refunds nothing. Only sign when the next three days are clear.',
      },
      { type: 'h', text: 'You study in long sittings' },
      {
        type: 'p',
        text: 'DEEP DIVE (1,200) pays by the length of a single log: 2h +300, 3h +450, 4h +700, up to four logs (+2,800). Shorter logs neither pay nor use anything up, so there is nothing to lose by mixing them in. HYPERDRIVE (1,200) also suits long days, but it needs 3 hours on every full day it runs.',
      },
      { type: 'h', text: 'You keep a fixed rhythm' },
      {
        type: 'list',
        items: [
          'Night owl: NIGHT SHIFT (900). Logs committed 22:00–02:00 earn +100, then +150, then +200 BITS/h on back-to-back nights, up to 3 hours a night (+1,350). Skipping a night only drops the rate back to +100.',
          'Early riser: EARLY BIRD (800). Logs committed 05:00–09:00 earn +200 BITS/h, 2 hours a morning, three mornings (+1,200). A morning with no log ends it. Bought before 09:00, today is the first morning, so buy it the evening before rather than at 08:30.',
        ],
      },
      { type: 'h', text: 'You work in 50-minute blocks' },
      {
        type: 'p',
        text: 'FOCUS CHIP (800) pays +100 for each log of 50 minutes or more, up to 12 (+1,200). A log of 25–49 minutes pays nothing and costs nothing, but a single log under 25 minutes burns the chip out. The stopwatch rounds to the nearest minute, so 49:30 counts as 50 and 49:29 does not. Skip it on days you log lots of short sessions.',
      },
      { type: 'h', text: 'You have one exam to focus on' },
      {
        type: 'p',
        text: 'CATEGORY LOCK (900) doubles one category you pick for 72 hours, up to 12 hours (+1,200). Logs in other categories simply earn the usual rate and never end it.',
      },
      { type: 'h', text: 'A lighter week, or your first buff' },
      {
        type: 'p',
        text: 'WARM-UP (400) is the safest: ×2 on 5 hours spread over 48 hours (+500). OVERCLOCK (600) is the same ×2 squeezed into 24 hours, up to 10 hours (+1,000); it pays for itself from 6 hours in a day.',
      },
      { type: 'h', text: 'Timing and luck' },
      {
        type: 'list',
        items: [
          'LUNAR TIDE (500): the rate follows the moon at the moment each log is committed, from +100 BITS/h at full moon to almost nothing at new moon, and dim-moon logs still use up its 12 hours. Check MOON NOW on the card and buy it in the days before a full moon.',
          'STORM RUNNER (600): pays on logs committed in rain, snow, a storm or below 0°C, for 5 days. The weather is read at commit time from the CHRONOMETER readout, which uses your time zone\'s city unless you switch on PRECISE LOCATION in the weather settings. In a snowy winter that can make it pay on most logs.',
          'WEEKEND SURGE (600): +50 BITS/h over Saturday and Sunday. It needs 12 hours of weekend study to break even; buy it for a weekend you plan to spend at the desk.',
          'LUCKY BYTE (600): each log has a 1-in-5 chance to pay triple. On average that is +40% of each log\'s base BITS (the first 3 hours of it count), on up to 20 logs; even very short logs use one up. It breaks even at about 15 hours of logs in its 72 hours, and pays well above that if you log long sessions.',
          'MYSTERY CRATE (700): a fair gamble. About half the rolls (49%) are a buff that costs more than 700, and the average roll is worth 701 at shop prices, so you get what you pay for and the fun is in the draw. It never rolls CATEGORY LOCK, STORM RUNNER, LUNAR TIDE or IRON CONTRACT. The crate changes every 6 hours, and an OMEN (3 stars) shows what is inside this one before you buy.',
        ],
      },
      { type: 'h', text: 'Pair it with a challenge' },
      { type: 'figure', kind: 'pairs', caption: 'A buff and a challenge for each way of studying, with the most the two can add up to together, and the pair to skip.' },
      {
        type: 'p',
        text: 'A buff and a CHALLENGE (a BOSS RAID or a RIVAL duel) run side by side, one of each, and every log you commit counts for both: the buff pays its bonus and the same minutes hit the boss or add to your side of the duel. The best pairs are the ones that reward the same habit twice.',
      },
      {
        type: 'stats',
        items: [
          ['Raids · net', '+700 – +1,900'],
          ['Duels · net', '+400 – +1,800'],
          ['INVERTED · net', '+1,000 – +3,400'],
          ['At once', '1 buff + 1 challenge'],
        ],
      },
      {
        type: 'list',
        items: [
          '5+ hours every day: IRON CONTRACT + ORION (~13.5h over the 72 hours, +800), or ACE (~24h, +1,800) if you really mean it. Buy the duel around midnight so its 72 hours line up with the contract\'s three days. The riskiest pair in the shop: one short day and you likely lose both.',
          'Long sittings: DEEP DIVE + GOLEM, or TITAN for the long haul. A 4-hour log earns DEEP DIVE\'s +700 and hits for 270 (3 hours counted, ×1.5 critical), and GOLEM ignores exactly the short logs you were not going to commit anyway.',
          'Night owl: NIGHT SHIFT + NOVA. You study when NOVA does, so the duel stays close every night. Skip NIGHTMARE: it heals at midnight, right in the middle of your hours.',
          'Early riser: EARLY BIRD + ORION, the other morning person (~4.5h a day). Get your two morning hours in before ORION finishes the first block.',
          '50-minute blocks: FOCUS CHIP + KAI. KAI works in 25-minute pomodoros all day (~12.5h over the duel); you keep committing 50-minute logs. Do not copy KAI\'s 25-minute logs: under 25 minutes burns the chip out.',
          'One exam: CATEGORY LOCK + WARDEN or GOLEM. Not HYDRA: its heads want two or three categories, while the lock pays on one.',
          'A lighter week, or a first try: WARM-UP + MIKA. MIKA studies on the train (~5.5h over the duel), the cheapest duel at 400.',
          'Weekends: WEEKEND SURGE + RUSH, bought on Thursday or Friday so the duel covers the weekend. RUSH crams it too, but RUSH\'s prize grows with those hours.',
          'Luck: LUCKY BYTE or MYSTERY CRATE + PHANTOM, if you like your odds twice: PHANTOM dodges one hit in four.',
          'Past all of these: beat a challenger three times and you can flip it to its INVERTED side, with harder rules, a bigger prize and an extra +2,000 to +4,000 the first time you beat it.',
        ],
      },
      { type: 'h', text: 'Rules that apply to every buff' },
      {
        type: 'list',
        items: [
          'Hour-based buffs count at most 3 hours of any one log. A 5-hour log earns the bonus on 3 of them.',
          'Windows go by when a log is committed, not the date it is filed under: entering last night\'s session the next afternoon will not count for NIGHT SHIFT.',
          'A buff that fails its condition (EARLY BIRD, HYPERDRIVE, FOCUS CHIP, IRON CONTRACT) ends on the spot and whatever was left of it is lost, unless you hold 7 stars: STARLIGHT then keeps it running for 7 of them, once per buff (not on the last day of IRON CONTRACT). Cancelling instead refunds two thirds of the unused part (IRON CONTRACT excepted).',
          'A buff rests after it ends, from 6 to 36 hours, but any other buff that is ready can start at once. The full list is in How long each buff rests.',
          'Deleting a log takes its bonus back and returns the hours or uses it drew to a buff that is still running, though LUCKY BYTE rolls stay spent. A deleted log takes its hit off a raid boss too.',
          'Challenges count at most 3 hours of one log against a boss; a duel counts every minute you commit inside its 72 hours.',
        ],
      },
    ],
  },
  {
    id: 'shop-rotation',
    date: 'EARLY NOV 2026',
    tag: 'MY ROOM',
    title: 'The furniture shop turns over faster',
    lede: 'A whole week was a long wait for twelve pieces. Small pieces now change every day and medium ones every two days, while large and featured pieces still stay a week, so there is time to save up for them. And one piece can be put on hold.',
    blocks: [
      {
        type: 'stats',
        items: [
          ['Small ×5', 'Daily'],
          ['Medium ×4', 'Every 2 days'],
          ['Large ×2 · Featured ×1', 'Weekly'],
        ],
      },
      { type: 'h', text: 'How the lineup works' },
      {
        type: 'list',
        items: [
          'Every lineup changes at midnight in your time zone, and everyone on the same date sees the same pieces.',
          'Each tier deals its designs out from a shuffled deck, so a design never comes back until the rest of its tier has been shown: small pieces return within about a month, medium within about three, large and featured within about eight.',
          'One of each piece to own, as before.',
        ],
      },
      { type: 'h', text: 'RESERVE' },
      {
        type: 'p',
        text: 'Tap RESERVE on any piece in the lineup to put it on hold. It stays buyable after it rotates out, until you buy it or release it. One piece at a time: reserving another replaces the hold, and the shop asks for a second tap before dropping one that has already left the lineup.',
      },
    ],
  },
  {
    id: 'buffs-rework',
    date: 'EARLY NOV 2026',
    tag: 'BALANCE',
    title: 'Every buff plays differently now',
    lede: 'Most buffs used to be the same deal: pay, cover the hours, come out a little ahead. Six of them were reworked so each one rewards a different way of studying, and most carry a risk to match.',
    blocks: [
      {
        type: 'stats',
        items: [
          ['Reworked', '6'],
          ['Unchanged', 'WARM-UP & 7 more'],
          ['Running buffs', 'Keep their old rules'],
        ],
      },
      { type: 'h', text: 'What changed' },
      {
        type: 'list',
        items: [
          'EARLY BIRD (800): ×3 at dawn. The next three mornings, logs committed 05:00–09:00 earn +200 BITS/h, up to 2 hours a morning (+1,200). Miss a morning and the buff ends; what is left of it is lost.',
          'NIGHT SHIFT (900): climbs on back-to-back nights. +100 BITS/h the first night, +150 the next, +200 the third, up to 3 hours a night (+1,350). Skip a night and the rate falls back to +100.',
          'OVERCLOCK (600): a one-day sprint. ×2 for 24 hours, up to 10 hours (+1,000). Whatever is left after the day is gone.',
          'HYPERDRIVE (1,200): ×2 on 25 hours over 96 hours (+2,500), but every full day it runs needs 3 hours of logs, or the drive shuts down.',
          'FOCUS CHIP (800): +100 for each session of 50 minutes or more (up to 12). A log under 25 minutes burns the chip out and ends it.',
          'DEEP DIVE (1,200): pays by session length. 2h earns +300, 3h +450, 4h +700, up to four sessions (+2,800).',
        ],
      },
      { type: 'h', text: 'Unchanged' },
      {
        type: 'p',
        text: 'WARM-UP stays the cheap, safe first buff. WEEKEND SURGE, CATEGORY LOCK, LUCKY BYTE, MYSTERY CRATE, STORM RUNNER, LUNAR TIDE and IRON CONTRACT were already their own thing and stay as they are.',
      },
      {
        type: 'p',
        text: 'A buff you were already running when this arrived finishes on the rules you bought it under. The running buff\'s card now shows a live line for the reworked ones: which morning you are on and how much of it is used, tonight\'s rate, today\'s hours against the daily minimum, or the FOCUS CHIP warning.',
      },
    ],
  },
  {
    id: 'room-tuck',
    date: 'EARLY NOV 2026',
    tag: 'IMPROVEMENT',
    title: 'Chairs tuck into desks, and a slimmer room switcher',
    lede: 'Chairs and stools can now stand at a desk or table instead of beside it, and the five rooms fold away into one slim bar.',
    blocks: [
      { type: 'rooms', rooms: TUCK_ROOMS },
      { type: 'h', text: 'Tucking chairs in' },
      {
        type: 'list',
        items: [
          'Drop a chair onto a desk or table on the same floor row and it is pushed in, drawn in front of the desk.',
          'Chairs: study, office, gaming and director\'s chairs, stools, bar stools, lab and stall stools, camp chairs, zabuton and poufs.',
          'Desks and tables: every desk and workbench, the dining, coffee and chess tables, the kitchen counter, kotatsu, chabudai, the holo-star table, the flight console and the noodle stall.',
          'One chair per spot. Tap the chair to pick it up first; tap the desk around it to pick up the desk.',
        ],
      },
      { type: 'h', text: 'Also in MY ROOM' },
      {
        type: 'list',
        items: [
          'The rooms sit in one slim bar: numbered chips switch rooms, with SAVE and LOAD SAVE beside them. ROOMS opens a drawer with a picture of each room, the name and the save time.',
          'ROOM VALUE shows the study time under the BITS instead of beside it.',
          'Clock faces with a dial (railway clocks, rings, arcs) are drawn a size smaller, so the SYSTEM CHRONOMETER keeps one height whatever face you pick.',
        ],
      },
    ],
  },
  {
    id: 'six-packs',
    date: 'EARLY NOV 2026',
    tag: 'NEW FEATURE',
    title: 'Six new furniture packs: 535 more pieces',
    lede: 'MY ROOM grows to 1,778 pieces: a data center, a hardware lab, a space station, a spy\'s study, a basecamp and a cyberpunk alley, 96 new designs in all.',
    blocks: [
      { type: 'figure', kind: 'packs6', caption: 'The 96 new designs, a shelf at a time, and the hologram vending machine in every colour.' },
      {
        type: 'stats',
        items: [
          ['New pieces', '535'],
          ['New designs', '96'],
          ['Catalog', '1,778'],
        ],
      },
      { type: 'h', text: 'The six packs' },
      {
        type: 'list',
        items: [
          'DATA CENTER VAULT: blade server racks, a high-voltage transformer, cooling pipes, a UPS, a NOC desk, warning beacons, hazard stripes and a vault door.',
          'HARDWARE LAB: a scope bench, a soldering station, an open breaker panel, a tool wall, a drone repair bench, a 3D printer, a CNC mill and a robot arm.',
          'ORBITAL HABITAT: an Earthrise window, a nebula window, hydroponic pods, an airlock bulkhead, sleep capsules, an EVA suit locker and a holo-star table.',
          'INTELLIGENCE ARCHIVE: a globe bar, a brass telescope, a chesterfield, a classified safe, a record console, a library case and an operations map.',
          'OUTDOOR BASECAMP: a wood stove, a giant cactus, a lantern stand, a hammock, an indoor campfire, a dome tent and a canoe for the wall.',
          'CYBER STREET: neon signs, a steam duct, hologram vending, a noodle stall, stall stools, an arcade cabinet, a hover scooter and wet asphalt.',
        ],
      },
      {
        type: 'p',
        text: 'Each pack brings its own wall and floor. LEDs, screens and holograms come on while the stopwatch runs; fires, lanterns, beacons and neon also glow at night. The new pieces join the weekly shop\'s draw alongside the rest, so a few of them turn up every week.',
      },
      { type: 'h', text: 'ROOM TOUR, part 2' },
      { type: 'tour', rooms: NEW_PACK_ROOMS },
      { type: 'link', article: 'room-slots', text: 'Five rooms to build them in' },
    ],
  },
  {
    id: 'buffs-wave-3',
    date: 'EARLY NOV 2026',
    tag: 'NEW FEATURE',
    title: 'IRON CONTRACT, STORM RUNNER and LUNAR TIDE',
    lede: 'Three new buffs: a hardcore three-day contract that pays double or keeps your stake, one that pays when the weather turns, and one that follows the moon.',
    blocks: [
      { type: 'figure', kind: 'newbuffs', caption: 'Each new buff with its rule at work: IRON CONTRACT\'s three days, STORM RUNNER reading the weather, LUNAR TIDE following the moon.' },
      { type: 'h', text: 'IRON CONTRACT · 1,500' },
      {
        type: 'list',
        items: [
          'Starts at the next midnight and runs three calendar days.',
          'Commit at least 5 hours on each of the three days. The log that completes day 3 pays twice the stake: +3,000.',
          'Miss a single day and the contract ends there. The stake is gone, and the buff slot is free again.',
          'It counts the hours you commit on each day, by commit time, so hours can\'t be back-dated into a day. Cancelling refunds nothing.',
          'The exchange shows each day\'s hours toward its 5-hour goal while the contract runs.',
        ],
      },
      { type: 'h', text: 'STORM RUNNER · 800' },
      {
        type: 'p',
        text: 'For five days, logs committed while the CHRONOMETER weather reads rain, drizzle, snow, a storm or below 0°C earn +100 BITS/h, up to 10 hours. Clear skies pay the usual rate. It reads the same weather as the chronometer header, so the weather readout needs to be on; a reading more than three hours old doesn\'t count.',
      },
      { type: 'h', text: 'LUNAR TIDE · 900' },
      {
        type: 'p',
        text: 'For 96 hours, each log earns extra BITS in step with the moon: +100 BITS/h at full moon, about +50 at a half moon, close to nothing at new moon, up to 12 hours. Its card shows what it would pay right now, and the LUNAR CALENDAR shows when the next full moon is.',
      },
      {
        type: 'p',
        text: 'All three show their icon and bonus on the logs they pay out on, like every other buff, and none of them can come out of the MYSTERY CRATE.',
      },
    ],
  },
  {
    id: 'room-slots',
    date: 'EARLY NOV 2026',
    tag: 'NEW FEATURE',
    title: 'Five rooms, and a SAVE button',
    lede: 'MY ROOM now holds five rooms you can switch between at any time, each with a save point you can go back to.',
    blocks: [
      { type: 'rooms', rooms: SLOT_ROOMS },
      {
        type: 'list',
        items: [
          'Pick a room from the strip at the top of MY ROOM. Each one keeps its own walls, floor and furniture, and saves itself as you edit, as before.',
          'The furniture is shared: everything you own can stand in every room at once. Placing a piece in ROOM 2 doesn\'t take it out of ROOM 1.',
          'SAVE keeps the open room as its save point. LOAD SAVE puts it back. That works after a CLEAR you didn\'t mean, and UNDO reverses the load too.',
          'Rename a room in the box next to ROOMS (up to 20 characters).',
          'RESET BITS & MY ROOM and RESET STUDY LOGS clear all five rooms and their saves, since they hold furniture that is no longer owned.',
        ],
      },
      { type: 'link', article: 'six-packs', text: 'Six new packs to fill them with' },
    ],
  },
  {
    id: 'polish-nov',
    date: 'EARLY NOV 2026',
    tag: 'IMPROVEMENT',
    title: 'Fixes: the clock, the BITS popup on phones, BITS in exports',
    lede: 'A round of fixes from use: the chronometer sits better, the +BITS popup shows on phones, and exports record what each log earned.',
    blocks: [
      {
        type: 'list',
        items: [
          'Round clock faces (dials, rings, arcs) stand in the middle of the SYSTEM CHRONOMETER, with the date on the left and the week or the stopwatch on the right. Digital faces no longer leave an empty band above them.',
          'On phones, the +BITS popup after a commit drops below the BITS button instead of rising off the top of the screen.',
          'The popup now only appears for a commit. Resets, imports, edits and refunds change the balance quietly.',
          'CSV export adds three columns: the base BITS, the buff bonus and the buff for each log. The JSON backup already carried the bonus and now adds a BITS summary too. Importing a backup still never restores a bonus, so a file can\'t create BITS.',
          'The ℹ hints beside the registry\'s ACTIVE count and FORECAST // TRAJECTORY are gone.',
          'A log committed at the exact moment of a BITS reset is saved normally (just without a bonus) instead of failing.',
        ],
      },
    ],
  },
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
          'DEEP DIVE (1,200): pays by the length of a session, from +300 for two hours.',
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
