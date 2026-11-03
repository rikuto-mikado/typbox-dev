// The guest demo: a read-only look at a lived-in account, with no server and no
// database. public/demo/snapshot.json is what a real account's API answers looked
// like on one day (`python manage.py make_demo`); here its dates are moved up to
// today, and anything the app stores goes to memory, so a reload starts clean.

type Json = Record<string, unknown>;

let snapshot: Json | null = null;

export const isDemo = () => snapshot !== null;

const DATE = /^(\d{4})-(\d{2})-(\d{2})(?=$|[T ])/;

const moveDate = (text: string, days: number): string => {
  const match = DATE.exec(text);
  if (!match) return text;
  const moved = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3] + days));
  return moved.toISOString().slice(0, 10) + text.slice(10);
};

/** Every date in the data, values and keys alike, `days` later. */
const moveDates = (value: unknown, days: number): unknown => {
  if (typeof value === 'string') return moveDate(value, days);
  if (Array.isArray(value)) return value.map((item) => moveDates(item, days));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [moveDate(key, days), moveDates(item, days)])
    );
  }
  return value;
};

const localToday = () => {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
};

/** What the app saves on this device stays in memory: a reload forgets it. */
const keepStorageInMemory = () => {
  const memory = new Map<string, string | null>();
  const proto = Storage.prototype;
  const { getItem, setItem, removeItem } = proto;
  proto.getItem = function (key) {
    if (this !== window.localStorage) return getItem.call(this, key);
    return memory.has(key) ? memory.get(key) ?? null : getItem.call(this, key);
  };
  proto.setItem = function (key, value) {
    if (this !== window.localStorage) return setItem.call(this, key, value);
    memory.set(key, String(value));
  };
  proto.removeItem = function (key) {
    if (this !== window.localStorage) return removeItem.call(this, key);
    memory.set(key, null);
  };
};

export const enterDemo = async () => {
  const res = await fetch(`${import.meta.env.BASE_URL}demo/snapshot.json`);
  if (!res.ok) throw new Error('Could not load the demo. Try again in a moment.');
  const raw = (await res.json()) as Json;
  const [y, m, d] = String(raw.taken_on).split('-').map(Number);
  const days = Math.round((localToday() - Date.UTC(y, m - 1, d)) / 86_400_000);
  const moved = moveDates(raw, days) as Json;
  // Its clock follows whoever is looking.
  const me = moved['/auth/me/'] as Json;
  me.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  keepStorageInMemory();
  snapshot = moved;
};

export const DEMO_BLOCKED_EVENT = 'typbox-demo-blocked';

/** Says why nothing happened; true when in the demo. */
export const blockedByDemo = () => {
  if (!isDemo()) return false;
  window.dispatchEvent(new Event(DEMO_BLOCKED_EVENT));
  return true;
};

/**
 * The demo's answer to an API call: reads come from the snapshot, and settings
 * and room moves stay in memory. Everything else needs an account: undefined.
 */
export const demoAnswer = (endpoint: string, method: string, body: unknown): unknown => {
  if (!snapshot) return undefined;
  const path = endpoint.split('?')[0];
  const parsed = typeof body === 'string' ? (JSON.parse(body) as Json) : null;
  if (method === 'PATCH' && path === '/auth/me/' && parsed) {
    snapshot[path] = { ...(snapshot[path] as Json), ...parsed };
  } else if (method === 'PUT' && path === '/room/' && parsed) {
    snapshot[path] = { ...(snapshot[path] as Json), layout: parsed.layout };
  } else if (method !== 'GET' || !(path in snapshot)) {
    return undefined;
  }
  return structuredClone(snapshot[path]);
};
