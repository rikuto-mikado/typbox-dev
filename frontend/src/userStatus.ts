// Learner-profile status tags shown on the profile (multi-select, max 4).
// Ids must stay in sync with USER_STATUS_IDS in backend/tracker/serializers.py.
// Ids are stored on accounts: never rename one. Removing an id is safe (the
// server and sanitizeUserStatuses() silently drop unknown ids), but it does
// clear that pick from every account that had it.

// A profile reads best as a short self-portrait: three or four picks.
export const MAX_USER_STATUSES = 4;

export type UserStatusGroup = 'rhythm' | 'method' | 'archetype' | 'fuel';

export interface UserStatusOption {
  id: string;
  group: UserStatusGroup;
  label: string;
}

// Display order is deliberate (not alphabetical): when you study, how a
// session runs, what kind of learner you are, then what keeps you going.
// Each group stays around seven options so the whole catalog fits on one
// screen; within a group the broadest / most common option leads.
export const USER_STATUS_GROUPS: UserStatusGroup[] = [
  'rhythm',
  'method',
  'archetype',
  'fuel',
];

type Row = [id: string, label: string];

const GROUP_ROWS: Record<UserStatusGroup, Row[]> = {
  // When you study and how you pace it.
  rhythm: [
    ['style_early_bird', 'Early Bird (Morning Person)'],
    ['rhythm_daytime', 'Daytime Steady'],
    ['style_night_owl', 'Night Owl'],
    ['rhythm_routine', 'Same Time, Every Day'],
    ['style_weekend', 'Weekend Warrior'],
    ['rhythm_deadline', 'Deadline-Driven Sprinter'],
    ['style_streak', 'Streak Chaser'],
  ],
  // How a session actually runs, and where.
  method: [
    ['style_pomodoro', 'Pomodoro Devotee'],
    ['style_deep_work', 'Deep Work / Long Sessions'],
    ['method_spaced_repetition', 'Flashcards / Spaced Repetition'],
    ['method_active_recall', 'Active Recall / Self-Testing'],
    ['method_handwritten', 'Handwritten Notes'],
    ['style_study_group', 'Study Group / Co-working'],
    ['style_cafe_studier', 'Café Studier'],
  ],
  // A playful self-portrait of the kind of learner you are.
  archetype: [
    ['arch_generalist', 'The Generalist (A Bit of Everything)'],
    ['arch_specialist', 'The Specialist (One Thing, All the Way Down)'],
    ['arch_completionist', 'The Completionist (Finishes Every Chapter)'],
    ['arch_rabbit_holer', 'The Rabbit-Holer (Follows Every Tangent)'],
    ['arch_tinkerer', 'The Tinkerer (Breaks It to Understand It)'],
    ['arch_perfectionist', 'The Perfectionist (100% or Retry)'],
    ['arch_phoenix', 'The Phoenix (Always Starts Again)'],
  ],
  // What keeps a session going: drinks, sound, rituals.
  fuel: [
    ['fuel_coffee', 'Coffee-Powered'],
    ['fuel_tea', 'Tea / Matcha'],
    ['fuel_energy_drink', 'Energy Drinks'],
    ['fuel_snacks', 'Snacks Within Reach'],
    ['style_lofi', 'Lo-fi / Music While Studying'],
    ['fuel_noise', 'Brown / White Noise'],
    ['style_silence', 'Silence Only'],
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
