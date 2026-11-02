// What the FESTIVAL PASS has opened (backend festival_pass.unlocks): Surface
// Themes and cursors kept for good. The server sends it with the shop state; it
// is remembered on the device so a festival theme doesn't blink away on reload
// before that answer arrives.
const KEY = 'typbox_festival_unlocks';

const read = (): Set<string> => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
};

let unlocked = read();

export const isFestivalRewardUnlocked = (id: string): boolean => unlocked.has(id);

/** Returns whether anything changed. */
export const setFestivalUnlocks = (ids: string[]): boolean => {
  const next = new Set(ids);
  const same = next.size === unlocked.size && ids.every((id) => unlocked.has(id));
  if (same) return false;
  unlocked = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable: it is sent again next time
  }
  return true;
};
