// Learner-profile status tags shown on the profile (multi-select, max 12).
// Ids must stay in sync with USER_STATUS_IDS in backend/tracker/serializers.py.
// Ids are stored on accounts: never rename one. Removing an id is safe (the
// server and sanitizeUserStatuses() silently drop unknown ids), but it does
// clear that pick from every account that had it.

// Roomy enough for one or two picks per group; the cap only guards against
// an unbounded list being stored on the profile.
export const MAX_USER_STATUSES = 12;

export type UserStatusGroup =
  | 'major'
  | 'school'
  | 'mission'
  | 'rhythm'
  | 'method'
  | 'archetype'
  | 'fuel'
  | 'hobbies'
  | 'sports';

export interface UserStatusOption {
  id: string;
  group: UserStatusGroup;
  label: string;
}

// Display order is deliberate (not alphabetical): who you are as a student,
// what you're working toward, then how you study (rhythm, method, learner
// archetype, study fuel), then life outside the desk (hobbies, sports).
// Groups stay short so each pick says something; within a group the
// broadest / most common option leads.
export const USER_STATUS_GROUPS: UserStatusGroup[] = [
  'major',
  'school',
  'mission',
  'rhythm',
  'method',
  'archetype',
  'fuel',
  'hobbies',
  'sports',
];

type Row = [id: string, label: string];

const GROUP_ROWS: Record<UserStatusGroup, Row[]> = {
  major: [
    ['student_cs', 'Student (Computer Science)'],
    ['student_data_science', 'Student (Data Science / AI)'],
    ['student_information_systems', 'Student (Information Systems)'],
    ['student_engineering', 'Student (Engineering)'],
    ['student_electrical', 'Student (Electrical / Electronic Eng.)'],
    ['student_mechanical', 'Student (Mechanical / Aerospace Eng.)'],
    ['student_civil', 'Student (Civil / Environmental Eng.)'],
    ['student_science', 'Student (Science / Math)'],
    ['student_mathematics', 'Student (Mathematics / Statistics)'],
    ['student_physics', 'Student (Physics / Astronomy)'],
    ['student_chemistry', 'Student (Chemistry / Materials)'],
    ['student_biology', 'Student (Biology / Life Sciences)'],
    ['student_business', 'Student (Business / Economics)'],
    ['student_law', 'Student (Law / Policy)'],
    ['student_international', 'Student (International Relations)'],
    ['student_medicine', 'Student (Medicine / Health)'],
    ['student_nursing', 'Student (Nursing)'],
    ['student_pharmacy', 'Student (Pharmacy)'],
    ['student_dentistry', 'Student (Dentistry)'],
    ['student_veterinary', 'Student (Veterinary)'],
    ['student_psychology', 'Student (Psychology / Cognitive Sci.)'],
    ['student_education', 'Student (Education)'],
    ['student_humanities', 'Student (Humanities / Social Sci.)'],
    ['student_languages', 'Student (Languages / Linguistics)'],
    ['student_media', 'Student (Media / Communication)'],
    ['student_design_arts', 'Student (Design / Fine Arts)'],
    ['student_music', 'Student (Music / Performing Arts)'],
    ['student_architecture', 'Student (Architecture)'],
    ['student_agriculture', 'Student (Agriculture / Food Science)'],
    ['student_other', 'Student (Other)'],
  ],
  school: [
    ['exam_prep', 'Entrance Exam Prep'],
    ['ronin', 'Retaking Entrance Exams (Gap Year)'],
    ['middle_school_student', 'Middle School Student'],
    ['high_school_student', 'High School Student'],
    ['college_of_technology', 'College of Technology'],
    ['junior_college', 'Junior College Student'],
    ['vocational_student', 'Vocational / Technical School'],
    ['university_freshman', 'University Freshman'],
    ['university_senior', 'University Senior / Final Year'],
    ['masters_student', "Master's Student"],
    ['mba_student', 'MBA Student'],
    ['law_school', 'Law School Student'],
    ['medical_school', 'Medical School Student'],
    ['online_degree', 'Online Degree Student'],
    ['night_school', 'Night School / Evening Classes'],
    ['mature_student', 'Working Adult Student'],
    ['bootcamp_self_taught', 'Bootcamp / Self-Taught'],
    ['homeschool', 'Homeschool / Unschooled'],
    ['international_student', 'International Student'],
    ['exchange_student', 'Exchange / Study Abroad'],
  ],
  // What the studying is for right now.
  mission: [
    ['certification_prep', 'Certification / License Prep'],
    ['mission_grad_school', 'Aiming for Grad School'],
    ['mission_study_abroad', 'Preparing to Study Abroad'],
    ['job_seeking', 'Job Hunting / Career Change'],
    ['reskilling', 'Reskilling / Upskilling'],
    ['studying_while_working', 'Studying Alongside Work'],
    ['mission_portfolio', 'Building a Portfolio'],
    ['mission_ship_project', 'Shipping a Side Project'],
    ['mission_fluency', 'Chasing Fluency in a Language'],
    ['mission_fundamentals', 'Relearning the Fundamentals'],
    ['building_habits', 'Building a Study Habit'],
    ['gap_year', 'Gap Year'],
    ['hobbyist', 'Learning for Fun'],
    ['lifelong_learner', 'Lifelong Learner'],
  ],
  // When you study and how far ahead you plan it.
  rhythm: [
    ['style_early_bird', 'Early Bird (Morning Person)'],
    ['rhythm_daytime', 'Daytime Steady'],
    ['style_night_owl', 'Night Owl'],
    ['rhythm_routine', 'Same Time, Every Day'],
    ['style_weekend', 'Weekend Warrior'],
    ['style_commute', 'Commute Learner'],
    ['rhythm_long_range', 'Long-Range Planner (Months Ahead)'],
    ['rhythm_backward', 'Backward Planner (From the Exam Date)'],
    ['rhythm_weekly', 'Weekly Planner'],
    ['rhythm_daily_list', 'Daily To-Do List'],
    ['rhythm_flow', 'Go With the Flow'],
    ['rhythm_deadline', 'Deadline-Driven Sprinter'],
    ['style_streak', 'Streak Chaser'],
  ],
  // How a session actually runs, and where.
  method: [
    ['style_pomodoro', 'Pomodoro Devotee'],
    ['style_deep_work', 'Deep Work / Long Sessions'],
    ['style_short_bursts', 'Short Bursts'],
    ['method_spaced_repetition', 'Flashcards / Spaced Repetition'],
    ['method_active_recall', 'Active Recall / Self-Testing'],
    ['method_past_papers', 'Past Papers First'],
    ['method_handwritten', 'Handwritten Notes'],
    ['method_second_brain', 'Digital Notes / Second Brain'],
    ['method_teach', 'Learn by Teaching'],
    ['method_build', 'Learn by Building'],
    ['method_video', 'Video Lectures'],
    ['style_study_group', 'Study Group / Co-working'],
    ['style_library', 'Library Regular'],
    ['style_cafe_studier', 'Café Studier'],
    ['method_home_desk', 'Home Desk Setup'],
  ],
  // A playful self-portrait of the kind of learner you are.
  archetype: [
    ['arch_generalist', 'The Generalist (A Bit of Everything)'],
    ['arch_specialist', 'The Specialist (One Thing, All the Way Down)'],
    ['arch_t_shaped', 'T-Shaped (Broad, One Deep Spike)'],
    ['arch_completionist', 'The Completionist (Finishes Every Chapter)'],
    ['arch_rabbit_holer', 'The Rabbit-Holer (Follows Every Tangent)'],
    ['arch_tinkerer', 'The Tinkerer (Breaks It to Understand It)'],
    ['arch_questioner', 'The Questioner (Must Know Why)'],
    ['arch_archivist', 'The Archivist (Notes for Everything)'],
    ['arch_marathoner', 'The Marathoner (Slow, Steady, Never Stops)'],
    ['arch_perfectionist', 'The Perfectionist (100% or Retry)'],
    ['arch_course_collector', 'The Course Collector (Enrolls in Everything)'],
    ['arch_phoenix', 'The Phoenix (Always Starts Again)'],
  ],
  // What keeps a session going: drinks, sound, rituals.
  fuel: [
    ['fuel_coffee', 'Coffee-Powered'],
    ['fuel_tea', 'Tea / Matcha'],
    ['fuel_energy_drink', 'Energy Drinks'],
    ['fuel_snacks', 'Snacks Within Reach'],
    ['style_lofi', 'Lo-fi / Music While Studying'],
    ['fuel_instrumental', 'Classical / Instrumental'],
    ['fuel_soundtracks', 'Game & Film Soundtracks'],
    ['fuel_noise', 'Brown / White Noise'],
    ['fuel_nature', 'Rain & Nature Sounds'],
    ['fuel_study_with_me', 'Study-With-Me Streams'],
    ['style_silence', 'Silence Only'],
    ['fuel_desk_ritual', 'Desk Lamp & Candle Ritual'],
  ],
  hobbies: [
    ['hobby_reading', 'Reading'],
    ['hobby_writing', 'Creative Writing'],
    ['hobby_journaling', 'Journaling'],
    ['hobby_drawing', 'Drawing / Sketching'],
    ['hobby_painting', 'Painting'],
    ['hobby_calligraphy', 'Calligraphy'],
    ['hobby_photography', 'Photography'],
    ['hobby_film', 'Movies / Film Buff'],
    ['hobby_anime_manga', 'Anime / Manga'],
    ['hobby_gaming', 'Video Games'],
    ['hobby_board_games', 'Board Games'],
    ['hobby_tcg', 'Trading Card Games'],
    ['hobby_chess', 'Chess'],
    ['hobby_shogi', 'Shogi'],
    ['hobby_go', 'Go (Board Game)'],
    ['hobby_puzzles', 'Puzzles / Sudoku'],
    ['hobby_speedcubing', 'Speedcubing'],
    ['hobby_math_for_fun', 'Math for Fun'],
    ['hobby_history', 'History'],
    ['hobby_philosophy', 'Philosophy'],
    ['hobby_astronomy', 'Astronomy / Stargazing'],
    ['hobby_music_listening', 'Music Listening'],
    ['hobby_instrument', 'Playing an Instrument'],
    ['hobby_singing', 'Singing / Karaoke'],
    ['hobby_djing', 'DJing'],
    ['hobby_live_music', 'Concerts / Live Music'],
    ['hobby_theater', 'Theater / Musicals'],
    ['hobby_podcasts', 'Podcasts'],
    ['hobby_idols', 'Idols / Fandom'],
    ['hobby_cosplay', 'Cosplay'],
    ['hobby_fashion', 'Fashion'],
    ['hobby_cooking', 'Cooking'],
    ['hobby_baking', 'Baking'],
    ['hobby_coffee', 'Coffee'],
    ['hobby_tea', 'Tea'],
    ['hobby_wine_sake', 'Wine / Sake'],
    ['hobby_cafe_hopping', 'Café Hopping'],
    ['hobby_gardening', 'Gardening / Plants'],
    ['hobby_crafts', 'Knitting / Crafts'],
    ['hobby_origami', 'Origami'],
    ['hobby_models', 'Model Building / Gunpla'],
    ['hobby_collecting', 'Collecting'],
    ['hobby_diy', 'DIY / Woodworking'],
    ['hobby_electronics', 'Electronics / Arduino'],
    ['hobby_3d_printing', '3D Printing'],
    ['hobby_keyboards', 'Mechanical Keyboards'],
    ['hobby_homelab', 'Homelab / Self-Hosting'],
    ['hobby_retro_computing', 'Retro Computing'],
    ['hobby_ham_radio', 'Ham Radio'],
    ['hobby_cars', 'Cars / Motorsport'],
    ['hobby_trains', 'Trains'],
    ['hobby_travel', 'Travel'],
    ['hobby_camping', 'Camping'],
    ['hobby_fishing', 'Fishing'],
    ['hobby_birdwatching', 'Birdwatching'],
    ['hobby_museums', 'Museums / Galleries'],
    ['hobby_pets', 'Pets'],
    ['hobby_meditation', 'Meditation / Mindfulness'],
    ['hobby_investing', 'Investing as a Hobby'],
    ['hobby_volunteering', 'Volunteering'],
  ],
  sports: [
    ['sport_running', 'Running'],
    ['sport_marathon', 'Marathon / Trail Running'],
    ['sport_walking', 'Walking / Hiking'],
    ['sport_mountaineering', 'Mountaineering'],
    ['sport_climbing', 'Bouldering / Climbing'],
    ['sport_gym', 'Gym / Weight Training'],
    ['sport_calisthenics', 'Calisthenics'],
    ['sport_yoga', 'Yoga / Pilates'],
    ['sport_cycling', 'Cycling'],
    ['sport_swimming', 'Swimming'],
    ['sport_triathlon', 'Triathlon'],
    ['sport_soccer', 'Soccer / Football'],
    ['sport_baseball', 'Baseball'],
    ['sport_basketball', 'Basketball'],
    ['sport_volleyball', 'Volleyball'],
    ['sport_rugby', 'Rugby'],
    ['sport_tennis', 'Tennis'],
    ['sport_table_tennis', 'Table Tennis'],
    ['sport_badminton', 'Badminton'],
    ['sport_golf', 'Golf'],
    ['sport_martial_arts', 'Martial Arts'],
    ['sport_kendo_judo', 'Kendo / Judo / Karate'],
    ['sport_boxing', 'Boxing / Kickboxing'],
    ['sport_skiing', 'Skiing / Snowboarding'],
    ['sport_surfing', 'Surfing'],
    ['sport_skateboarding', 'Skateboarding'],
    ['sport_dance', 'Dance'],
    ['sport_esports', 'Esports'],
    ['sport_coach', 'Coach / Trainer'],
    ['sport_watching', 'Sports Fan / Spectator'],
  ],
};

export const USER_STATUS_OPTIONS: UserStatusOption[] = USER_STATUS_GROUPS.flatMap((group) =>
  GROUP_ROWS[group].map(([id, label]) => ({ id, group, label }))
);

const KNOWN_STATUS_IDS = new Set(USER_STATUS_OPTIONS.map((o) => o.id));

/** Known ids only, de-duplicated, capped at MAX_USER_STATUSES, order kept. */
export function sanitizeUserStatuses(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && KNOWN_STATUS_IDS.has(item) && !out.includes(item)) out.push(item);
    if (out.length >= MAX_USER_STATUSES) break;
  }
  return out;
}

export const getUserStatusOption = (id: string): UserStatusOption | undefined =>
  USER_STATUS_OPTIONS.find((o) => o.id === id);

/** Case-insensitive match against the label and the id. */
export const matchesStatusQuery = (opt: UserStatusOption, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    opt.label.toLowerCase().includes(q) || opt.id.includes(q)
  );
};
