// BITS: the study currency. 1 hour of logged study = 100 BITS, stopwatch or
// manual. Mirrors backend/tracker/economy.py (BITS_PER_HOUR and the
// floor-once-over-the-total rounding): the server is the source of truth,
// this copy only lets the header balance move the instant a log commits.

export const BITS_PER_HOUR = 100;

export interface BitsSummary {
  balance: number;
  earned: number;
  spent: number;
  per_hour: number;
}

/** Whole BITS for a span of study, floored once over the total. */
export const bitsForMinutes = (minutes: number): number =>
  Math.floor((Math.max(0, minutes) * BITS_PER_HOUR) / 60);
