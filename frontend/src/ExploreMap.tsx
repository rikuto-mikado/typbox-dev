import React, { useMemo, useState } from 'react';
import { Castle, Coins, Compass, Lock, X } from 'lucide-react';
import { useI18n, tf } from './i18n';
import { CENTER, EXPLORE_MAPS, GRID_SIZE, TOTAL_CELLS, cellCost, type ExploreMapDef } from './exploreMaps';
import { renderScene } from './surfaceSceneArt';
import { IS_DEMO_MODE } from './telemetryFeatures';
import type { ExploreMapProgressResponse } from './api';

// Every cell unlocked, computed once — reused for every map when
// IS_DEMO_MODE force-reveals the whole catalog (mirrors how
// isThemeUnlocked() force-unlocks every Surface Theme in demo mode).
const ALL_CELLS_UNLOCKED: [number, number][] = Array.from({ length: GRID_SIZE }, (_, y) =>
  Array.from({ length: GRID_SIZE }, (_, x): [number, number] => [x, y])
).flat();

interface ExploreMapProps {
  walletBalance: number;
  mapProgress: ExploreMapProgressResponse[];
  onUnlockCell: (mapId: string, x: number, y: number) => Promise<void>;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
}

const REGION_ORDER = Array.from(new Set(EXPLORE_MAPS.map((m) => m.regionCode)));

export const ExploreMap: React.FC<ExploreMapProps> = ({
  walletBalance,
  mapProgress,
  onUnlockCell,
  isDark,
  borderCol,
  textMuted,
}) => {
  const { t } = useI18n();
  // Default to the first map in the catalog — only the currently selected
  // map's board is ever shown inline; every other map lives behind the
  // "change map" modal (see MapSwitchModal below) so the panel never has to
  // scroll through all 64 at once.
  const [selectedMapId, setSelectedMapId] = useState<string>(EXPLORE_MAPS[0].id);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const progressByMapId = useMemo(() => {
    const map: Record<string, ExploreMapProgressResponse> = {};
    if (IS_DEMO_MODE) {
      // Preview-only: every map renders as fully cleared so every scene's
      // art is visible without real credits/progress. Never calls the
      // unlock API — DEMO mode must stay false for any real build/deploy.
      EXPLORE_MAPS.forEach((m) => {
        map[m.id] = {
          map_id: m.id,
          grid_size: GRID_SIZE,
          unlocked_cells: ALL_CELLS_UNLOCKED,
          unlocked_count: TOTAL_CELLS,
          total_cells: TOTAL_CELLS,
          is_cleared: true,
          cleared_at: null,
        };
      });
      return map;
    }
    mapProgress.forEach((p) => {
      map[p.map_id] = p;
    });
    return map;
  }, [mapProgress]);

  const selectedMap = EXPLORE_MAPS.find((m) => m.id === selectedMapId) ?? EXPLORE_MAPS[0];
  const selectedProgress = progressByMapId[selectedMap.id];

  const handleUnlock = async (mapId: string, x: number, y: number, isFrontier: boolean, cost: number) => {
    if (busy) return;
    if (!isFrontier) {
      setNotice(t.exploreMapUnlockFailedAdjacent);
      return;
    }
    if (walletBalance < cost) {
      setNotice(tf(t.exploreMapInsufficientCredits, { have: walletBalance, need: cost }));
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      await onUnlockCell(mapId, x, y);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="font-bold text-[13px] tracking-wide">{t.exploreMapTitle}</div>
            <div className={`text-[10px] ${textMuted}`}>{t.exploreMapSubtitle}</div>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 border ${borderCol} shrink-0`}>
          <Coins className="w-4 h-4 text-amber-400" />
          <div className="leading-tight">
            <div className={`text-[9px] uppercase tracking-wide ${textMuted}`}>{t.dataCreditsLabel}</div>
            <div className="font-mono font-bold text-base tabular-nums">{walletBalance.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="px-2.5 py-1.5 border border-amber-400/40 text-amber-300 text-[10px]">{notice}</div>
      )}

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase truncate">{selectedMap.name}</div>
            <div className={`text-[9px] ${textMuted} truncate`}>{selectedMap.desc}</div>
          </div>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className={`px-2.5 py-1.5 border ${borderCol} hover:border-zinc-500 cursor-pointer text-[10px] uppercase shrink-0 flex items-center gap-1.5`}
          >
            <Compass className="w-3 h-3" />
            {t.exploreMapChangeButton}
          </button>
        </div>

        <MapBoard
          map={selectedMap}
          progress={selectedProgress}
          walletBalance={walletBalance}
          busy={busy}
          isDark={isDark}
          onUnlock={handleUnlock}
          t={t}
        />

        <div className={`text-[9px] ${textMuted}`}>
          {selectedProgress &&
            tf(t.exploreMapProgress, { unlocked: selectedProgress.unlocked_count, total: TOTAL_CELLS })}
        </div>
      </div>

      {switcherOpen && (
        <MapSwitchModal
          progressByMapId={progressByMapId}
          selectedMapId={selectedMap.id}
          isDark={isDark}
          borderCol={borderCol}
          textMuted={textMuted}
          onSelect={(id) => {
            setSelectedMapId(id);
            setSwitcherOpen(false);
            setNotice(null);
          }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
    </div>
  );
};

// ==========================================
// The 25x25 fog-of-war board for a single map
// ==========================================
interface MapBoardProps {
  map: ExploreMapDef;
  progress: ExploreMapProgressResponse | undefined;
  walletBalance: number;
  busy: boolean;
  isDark: boolean;
  onUnlock: (mapId: string, x: number, y: number, isFrontier: boolean, cost: number) => void;
  t: ReturnType<typeof useI18n>['t'];
}

const MapBoard: React.FC<MapBoardProps> = ({ map, progress, walletBalance, busy, isDark, onUnlock, t }) => {
  if (!progress) {
    return <div className="p-6 text-center opacity-60">{t.exploreMapLoading}</div>;
  }

  const unlockedSet = new Set((progress.unlocked_cells ?? []).map(([x, y]) => `${x},${y}`));
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`;
      const isCenter = x === CENTER[0] && y === CENTER[1];
      const unlocked = unlockedSet.has(key);
      if (unlocked) {
        cells.push(
          <div
            key={key}
            className="relative pointer-events-none flex items-center justify-center"
            style={isCenter ? undefined : { animation: 'cell-reveal 0.35s ease' }}
          >
            {isCenter && <Castle className="w-3.5 h-3.5 text-amber-300 drop-shadow" />}
          </div>
        );
        continue;
      }
      const isFrontier =
        !progress.is_cleared &&
        [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(([nx, ny]) => unlockedSet.has(`${nx},${ny}`));
      const cost = cellCost(x, y);
      const affordable = walletBalance >= cost;
      cells.push(
        <button
          key={key}
          type="button"
          disabled={busy || !isFrontier}
          title={isFrontier ? tf(t.exploreMapCellCost, { cost }) : undefined}
          onClick={() => onUnlock(map.id, x, y, isFrontier, cost)}
          className={`fog-cell ${isFrontier ? (affordable ? 'fog-cell-frontier' : 'fog-cell-frontier-poor') : 'fog-cell-deep'}`}
        >
          {isFrontier && <Lock className="w-2 h-2 opacity-70" />}
        </button>
      );
    }
  }

  return (
    <div className="relative w-full aspect-square border border-zinc-700 overflow-hidden">
      <div className="absolute inset-0">
        {renderScene({ silhouette: map.silhouette, seed: map.seed, hueDay: map.hueDay, hueNight: map.hueNight }, isDark)}
      </div>
      <div
        className="absolute inset-0 grid"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {cells}
      </div>
    </div>
  );
};

// ==========================================
// "Change map" modal — the grouped-by-region browser for all 64 maps,
// tucked away behind a button so the main panel only ever shows one board.
// ==========================================
interface MapSwitchModalProps {
  progressByMapId: Record<string, ExploreMapProgressResponse>;
  selectedMapId: string;
  isDark: boolean;
  borderCol: string;
  textMuted: string;
  onSelect: (mapId: string) => void;
  onClose: () => void;
}

const MapSwitchModal: React.FC<MapSwitchModalProps> = ({
  progressByMapId,
  selectedMapId,
  isDark,
  borderCol,
  textMuted,
  onSelect,
  onClose,
}) => {
  const { t } = useI18n();
  const mapsByRegion = useMemo(() => {
    const groups: Record<string, ExploreMapDef[]> = {};
    EXPLORE_MAPS.forEach((m) => {
      (groups[m.regionCode] ??= []).push(m);
    });
    return groups;
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl max-h-[85vh] flex flex-col border ${borderCol} bg-[var(--tb-bg-card)] text-[var(--tb-text-main)] shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between gap-2 p-4 border-b ${borderCol} shrink-0`}>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-xs uppercase tracking-widest font-bold">{t.exploreMapSelectPrompt}</h3>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {REGION_ORDER.map((regionCode) => {
            const maps = mapsByRegion[regionCode];
            return (
              <div key={regionCode} className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                  {maps[0].regionName}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {maps.map((m) => {
                    const prog = progressByMapId[m.id];
                    const unlockedCount = prog?.unlocked_count ?? 1;
                    const cleared = prog?.is_cleared ?? false;
                    const pct = Math.round((unlockedCount / TOTAL_CELLS) * 100);
                    const isActive = m.id === selectedMapId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onSelect(m.id)}
                        className={`p-2.5 border text-left space-y-1.5 cursor-pointer transition-colors ${
                          isActive
                            ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-emerald-500/5'
                            : cleared
                            ? 'border-emerald-500/50 bg-emerald-500/5'
                            : `${borderCol} hover:border-zinc-500`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-[10px] truncate">{m.name}</span>
                          {cleared && (
                            <span className="px-1 py-0.2 bg-emerald-500 text-zinc-950 text-[8px] font-bold uppercase shrink-0">
                              {t.exploreMapClearBadge}
                            </span>
                          )}
                        </div>
                        {cleared ? (
                          <div className="h-14 overflow-hidden border border-emerald-500/30">
                            {renderScene({ silhouette: m.silhouette, seed: m.seed, hueDay: m.hueDay, hueNight: m.hueNight }, isDark)}
                          </div>
                        ) : (
                          <>
                            <div className={`h-1 w-full ${borderCol} border bg-transparent`}>
                              <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className={`text-[9px] ${textMuted}`}>
                              {tf(t.exploreMapProgress, { unlocked: unlockedCount, total: TOTAL_CELLS })}
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
