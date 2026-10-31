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

/**
 * A BITS amount as the study it takes to earn at the base rate, for the
 * "(~12h)" next to prices: "0h" for nothing, minutes under an hour, one
 * decimal under ten hours, whole hours above that.
 */
export const studyTimeFor = (bits: number): string => {
  if (bits <= 0) return '0h';
  const minutes = (bits * 60) / BITS_PER_HOUR;
  if (minutes < 60) return `~${Math.max(1, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 10) return `~${Number(hours.toFixed(1))}h`;
  return `~${Math.round(hours).toLocaleString('en-US')}h`;
};
