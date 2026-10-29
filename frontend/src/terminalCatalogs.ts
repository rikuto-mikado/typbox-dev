// Turns the settings catalogs (fonts, chronometer faces, surface themes,
// ambient scenes, noise profiles) into terminal rows for the command palette,
// applying the same unlock rules the Settings pickers use. Kept apart from
// terminalCommands.ts so the palette module doesn't import the catalogs back.
import type { Dict } from './i18n';
import { CHRONO_THEMES, isUnlockRuleMet, unlockRuleRank, type ChronoProgress, type ChronoUnlock } from './chronometerThemes';
import { unlockLockedMessage, unlockRequirementLabel } from './ChronometerFace';
import { UI_FONTS } from './uiFonts';
import { AMBIENT_THEMES } from './ambientThemes';
import { MAX_SLEEP_TIMER_MIN, NOISE_PROFILES, SURFACE_THEME_PAIRS, isRewardUnlocked, isThemeUnlocked } from './telemetryFeatures';
import type { TerminalEntry } from './terminalCommands';

interface CatalogInputs {
  progress: ChronoProgress;
  activeFontId: string;
  activeFaceId: string;
  activeSurfaceId: string;
  activeAmbientId: string;
}

const byUnlockRank = <T extends { unlock: ChronoUnlock }>(list: T[]) =>
  [...list].sort((a, b) => unlockRuleRank(a.unlock) - unlockRuleRank(b.unlock));

function ruleEntry(
  item: { id: string; code: string; name: string; desc: string; unlock: ChronoUnlock },
  activeId: string,
  progress: ChronoProgress,
  t: Dict
): TerminalEntry {
  const open = isUnlockRuleMet(item.unlock, progress);
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    desc: item.desc,
    locked: open ? null : unlockRequirementLabel(item.unlock, t),
    lockedMessage: open ? undefined : unlockLockedMessage(item.unlock, item.name, progress, t),
    current: item.id === activeId,
  };
}

const levelLabel = (lv: number) => `LV.${String(lv).padStart(4, '0')}`;

export function buildTerminalCatalogs({ progress, activeFontId, activeFaceId, activeSurfaceId, activeAmbientId }: CatalogInputs, t: Dict) {
  const status = { rewardUnlockLevel: progress.rewardUnlockLevel, totalAscensions: progress.totalAscensions };
  return {
    fonts: byUnlockRank(UI_FONTS).map((f) => ruleEntry(f, activeFontId, progress, t)),
    faces: byUnlockRank(CHRONO_THEMES).map((f) => ruleEntry(f, activeFaceId, progress, t)),
    ambients: byUnlockRank(AMBIENT_THEMES).map((a) => ruleEntry(a, activeAmbientId, progress, t)),
    surfaces: SURFACE_THEME_PAIRS.map<TerminalEntry>((pair) => {
      const req = pair.requiredAscensions ? `ASCENSION ×${pair.requiredAscensions}` : levelLabel(pair.clearanceHintLv);
      return {
        id: pair.id,
        code: pair.code,
        name: pair.name,
        desc: pair.description,
        locked: isThemeUnlocked(pair, status) ? null : req,
        current: pair.id === activeSurfaceId,
        color: pair.accentHex,
      };
    }),
    noises: NOISE_PROFILES.map<TerminalEntry>((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      desc: p.desc,
      locked: isRewardUnlocked(progress.rewardUnlockLevel, p.clearanceHintLv) ? null : levelLabel(p.clearanceHintLv),
    })),
    maxSleepMinutes: MAX_SLEEP_TIMER_MIN,
  };
}
