import type { StarWish } from './api';
import type { Dict } from './i18n.strings';

type DictKey = keyof Dict;

/** Each wish's name and line in the dictionary (wishes.py). */
export const WISH_TEXT: Record<StarWish, { name: DictKey; line: DictKey }> = {
  reroll: { name: 'starWishReroll', line: 'starWishRerollLine' },
  omen: { name: 'starWishOmen', line: 'starWishOmenLine' },
  starchart: { name: 'wishStarchart', line: 'wishStarchartLine' },
  hush: { name: 'wishHush', line: 'wishHushLine' },
  supernova: { name: 'wishSupernova', line: 'wishSupernovaLine' },
  blaze: { name: 'wishBlaze', line: 'wishBlazeLine' },
  wildfire: { name: 'wishWildfire', line: 'wishWildfireLine' },
  scatter: { name: 'wishScatter', line: 'wishScatterLine' },
  veil: { name: 'wishVeil', line: 'wishVeilLine' },
  drift: { name: 'wishDrift', line: 'wishDriftLine' },
  mist: { name: 'wishMist', line: 'wishMistLine' },
  silver: { name: 'wishSilver', line: 'wishSilverLine' },
  ember: { name: 'wishEmber', line: 'wishEmberLine' },
  afterglow: { name: 'wishAfterglow', line: 'wishAfterglowLine' },
  aim: { name: 'wishAim', line: 'wishAimLine' },
  volley: { name: 'wishVolley', line: 'wishVolleyLine' },
  quarry: { name: 'wishQuarry', line: 'wishQuarryLine' },
};

/** A wish's name, for lists outside the wish grid (the charm picker). */
export const wishName = (t: Dict, use: StarWish): string => t[WISH_TEXT[use].name];
