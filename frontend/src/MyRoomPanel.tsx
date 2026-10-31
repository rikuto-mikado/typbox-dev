import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Grid3x3,
  Lightbulb,
  Loader2,
  Moon,
  Redo2,
  ShoppingBag,
  Sun,
  SunMoon,
  Trash2,
  Undo2,
} from 'lucide-react';
import { api, type RoomState } from './api';
import { BitShard } from './BitsBadge';
import { tf, useI18n } from './i18n';
import {
  anchorAt,
  canPlace,
  pieceAt,
  renderRoom,
  ROOM_H,
  ROOM_W,
  snapshotRoom,
  thumbnail,
  type FurnitureSpec,
  type Ghost,
  type RoomLayout,
} from './roomRender';

// 04 / MY ROOM: arrange owned furniture in a 16 x 12 pixel room.
// Pick a piece in the inventory, then tap (or drag and release) where it
// should stand; drag a placed piece to move it, select it to store it.
// Paints swap the whole wall / floor. Changes save on their own shortly
// after the last edit (the server re-validates every layout); every edit
// can be undone. With the room focused, arrows nudge the selected piece,
// Delete stores it and Cmd/Ctrl+Z / Shift+Cmd/Ctrl+Z undo and redo.

const SAVE_DELAY_MS = 700;
const HISTORY_LIMIT = 50;
const MAX_PLACED = 64;
const CATEGORIES = ['all', 'desk', 'seating', 'storage', 'decor', 'lighting', 'tech', 'wall', 'surfaces'] as const;
type Category = (typeof CATEGORIES)[number];
type Scene = 'auto' | 'day' | 'night';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Drag {
  index: number;
  offX: number;
  offY: number;
  moved: boolean;
}

interface MyRoomPanelProps {
  isRunning: boolean;
  timeZone: string;
  borderCol: string;
  textMuted: string;
  onOpenShop: () => void;
}

const localHour = (timeZone: string) => {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date()));
  } catch {
    return new Date().getHours();
  }
};

// View preferences are per-device conveniences: storage may be unavailable.
const PREF_KEY = 'typbox.room.view';
const readPrefs = (): { scene: Scene; lamps: boolean; grid: boolean } => {
  const fallback = { scene: 'auto' as Scene, lamps: false, grid: false };
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? '{}');
    return {
      scene: raw.scene === 'day' || raw.scene === 'night' ? raw.scene : 'auto',
      lamps: raw.lamps === true,
      grid: raw.grid === true,
    };
  } catch {
    return fallback;
  }
};

/** Integer zoom that fits a piece's sprite into `box` px (keeps pixels square). */
const zoomFor = (spec: FurnitureSpec, box: number) => {
  const paint = spec.layer === 'wall_paint' || spec.layer === 'floor_paint';
  const px = paint ? 16 : Math.max(spec.w, spec.h) * 8;
  return Math.max(1, Math.floor(box / px));
};

const Thumb: React.FC<{ spec: FurnitureSpec; box: number; className?: string }> = ({ spec, box, className = '' }) => {
  const paint = spec.layer === 'wall_paint' || spec.layer === 'floor_paint';
  const z = zoomFor(spec, box);
  return (
    <img
      src={thumbnail(spec)}
      alt=""
      draggable={false}
      className={className}
      style={{
        imageRendering: 'pixelated',
        width: (paint ? 16 : spec.w * 8) * z,
        height: (paint ? 16 : spec.h * 8) * z,
      }}
    />
  );
};

const fmt = (n: number) => n.toLocaleString('en-US');

export const MyRoomPanel: React.FC<MyRoomPanelProps> = ({ isRunning, timeZone, borderCol, textMuted, onOpenShop }) => {
  const { t } = useI18n();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [layout, setLayout] = useState<RoomLayout | null>(null);
  const [past, setPast] = useState<RoomLayout[]>([]);
  const [future, setFuture] = useState<RoomLayout[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState(-1);
  const [armed, setArmed] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [category, setCategory] = useState<Category>('all');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(readPrefs);
  const [autoNight, setAutoNight] = useState(() => {
    const h = localHour(timeZone);
    return h >= 19 || h < 6;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedJson = useRef<string>('');
  const pressed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.room
      .get()
      .then((state) => {
        if (cancelled) return;
        setRoom(state);
        setLayout(state.layout);
        savedJson.current = JSON.stringify(state.layout);
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message || t.roomLoadFailed));
    return () => {
      cancelled = true;
    };
  }, [t.roomLoadFailed]);

  useEffect(() => {
    const tick = () => {
      const h = localHour(timeZone);
      setAutoNight(h >= 19 || h < 6);
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode etc.: the view just resets next time */
    }
  }, [prefs]);

  // Debounced save of every change.
  useEffect(() => {
    if (!layout) return;
    const json = JSON.stringify(layout);
    if (json === savedJson.current) return;
    const id = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        const state = await api.room.save(layout);
        savedJson.current = JSON.stringify(state.layout);
        setRoom(state);
        setSaveState('saved');
        setSaveError(null);
      } catch (err: unknown) {
        setSaveState('error');
        setSaveError((err as Error).message || t.roomSaveFailed);
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [layout, t.roomSaveFailed]);

  const catalog = useMemo(() => {
    const map: Record<string, FurnitureSpec> = {};
    room?.catalog.forEach((spec) => {
      map[spec.id] = spec;
    });
    return map;
  }, [room]);

  const placedCount = useMemo(() => {
    const counts: Record<string, number> = {};
    layout?.items.forEach((it) => {
      counts[it.id] = (counts[it.id] ?? 0) + 1;
    });
    return counts;
  }, [layout]);

  const night = prefs.scene === 'auto' ? autoNight : prefs.scene === 'night';
  const lit = isRunning || prefs.lamps;
  const showGrid = prefs.grid || Boolean(armed) || Boolean(drag?.moved);

  useEffect(() => {
    if (!canvasRef.current || !layout || !room) return;
    renderRoom(canvasRef.current, layout, catalog, {
      env: { on: lit, night },
      selected,
      lifted: drag?.moved ? drag.index : -1,
      ghost,
      grid: showGrid,
    });
  }, [layout, room, catalog, lit, night, selected, drag, ghost, showGrid]);

  if (loadError) {
    return <div className="p-3 border border-rose-500/40 text-rose-400 font-mono text-[11px]">{loadError}</div>;
  }
  if (!room || !layout) {
    return (
      <div className={`p-10 flex justify-center ${textMuted}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  // ---------------------------------------------------------------- history
  const commit = (next: RoomLayout) => {
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), layout]);
    setFuture([]);
    setLayout(next);
  };
  const undo = () => {
    if (past.length === 0) return;
    setFuture((f) => [layout, ...f].slice(0, HISTORY_LIMIT));
    setLayout(past[past.length - 1]);
    setPast(past.slice(0, -1));
    setSelected(-1);
    setArmed(null);
  };
  const redo = () => {
    if (future.length === 0) return;
    setPast((p) => [...p, layout].slice(-HISTORY_LIMIT));
    setLayout(future[0]);
    setFuture(future.slice(1));
    setSelected(-1);
    setArmed(null);
  };

  // ---------------------------------------------------------------- pointer
  const tileAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      tx: Math.max(0, Math.min(ROOM_W - 1, Math.floor(((e.clientX - r.left) / r.width) * ROOM_W))),
      ty: Math.max(0, Math.min(ROOM_H - 1, Math.floor(((e.clientY - r.top) / r.height) * ROOM_H))),
    };
  };

  const aimGhost = (id: string, tx: number, ty: number, ignore = -1, offX?: number, offY?: number) => {
    const spec = catalog[id];
    const pos =
      offX === undefined || offY === undefined
        ? anchorAt(spec, tx, ty)
        : {
            x: Math.max(0, Math.min(ROOM_W - spec.w, tx - offX)),
            y: Math.max(0, Math.min(ROOM_H - spec.h, ty - offY)),
          };
    const next = { id, ...pos, valid: canPlace(spec, pos.x, pos.y, layout.items, catalog, ignore) };
    setGhost(next);
    return next;
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    pressed.current = true;
    const { tx, ty } = tileAt(e);
    if (armed) {
      aimGhost(armed, tx, ty);
      return;
    }
    const index = pieceAt(layout.items, catalog, tx, ty);
    setSelected(index);
    if (index >= 0) {
      const it = layout.items[index];
      setDrag({ index, offX: tx - it.x, offY: ty - it.y, moved: false });
    }
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { tx, ty } = tileAt(e);
    if (armed && (pressed.current || e.pointerType === 'mouse')) {
      aimGhost(armed, tx, ty);
      return;
    }
    if (drag) {
      const it = layout.items[drag.index];
      const g = aimGhost(it.id, tx, ty, drag.index, drag.offX, drag.offY);
      if (!drag.moved && (g.x !== it.x || g.y !== it.y)) setDrag({ ...drag, moved: true });
    }
  };

  const handleUp = () => {
    pressed.current = false;
    if (armed && ghost) {
      if (ghost.valid) {
        commit({ ...layout, items: [...layout.items, { id: ghost.id, x: ghost.x, y: ghost.y }] });
        setSelected(layout.items.length);
        // Keep the piece armed while more copies are left to place.
        const left = (room.inventory[ghost.id] ?? 0) - (placedCount[ghost.id] ?? 0) - 1;
        if (left <= 0) setArmed(null);
      }
      setGhost(null);
      return;
    }
    if (drag) {
      if (drag.moved && ghost?.valid) {
        commit({
          ...layout,
          items: layout.items.map((it, i) => (i === drag.index ? { ...it, x: ghost.x, y: ghost.y } : it)),
        });
      }
      setDrag(null);
      setGhost(null);
    }
  };

  // ---------------------------------------------------------------- actions
  const storeSelected = () => {
    if (selected < 0) return;
    commit({ ...layout, items: layout.items.filter((_, i) => i !== selected) });
    setSelected(-1);
  };

  const clearRoom = () => {
    if (layout.items.length === 0) return;
    commit({ ...layout, items: [] });
    setSelected(-1);
  };

  const nudge = (dx: number, dy: number) => {
    const it = layout.items[selected];
    const spec = it && catalog[it.id];
    if (!spec) return;
    if (!canPlace(spec, it.x + dx, it.y + dy, layout.items, catalog, selected)) return;
    commit({
      ...layout,
      items: layout.items.map((p, i) => (i === selected ? { ...p, x: p.x + dx, y: p.y + dy } : p)),
    });
  };

  const pickItem = (spec: FurnitureSpec) => {
    if (spec.layer === 'wall_paint') {
      if (layout.wall !== spec.id) commit({ ...layout, wall: spec.id });
      return;
    }
    if (spec.layer === 'floor_paint') {
      if (layout.floor !== spec.id) commit({ ...layout, floor: spec.id });
      return;
    }
    setSelected(-1);
    setArmed(armed === spec.id ? null : spec.id);
    setGhost(null);
  };

  const saveSnapshot = () => {
    const url = snapshotRoom(layout, catalog, { on: lit, night });
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `typbox-room-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, select')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === 'Escape' && (armed || selected >= 0)) {
      e.stopPropagation();
      setArmed(null);
      setGhost(null);
      setSelected(-1);
      return;
    }
    if (selected < 0) return;
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (step[e.key]) {
      e.preventDefault();
      nudge(...step[e.key]);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      storeSelected();
    }
  };

  // ---------------------------------------------------------------- derived
  const owned = Object.entries(room.inventory)
    .map(([id, count]) => ({ spec: catalog[id], count }))
    .filter((e) => e.spec && e.count > 0 && (category === 'all' || e.spec.category === category))
    .sort((a, b) => a.spec.category.localeCompare(b.spec.category) || a.spec.tier - b.spec.tier);

  const selectedSpec = selected >= 0 ? catalog[layout.items[selected]?.id] : undefined;
  const armedSpec = armed ? catalog[armed] : undefined;
  const ownedKinds = Object.values(room.inventory).filter((n) => n > 0).length;
  const roomValue =
    layout.items.reduce((sum, it) => sum + (catalog[it.id]?.price ?? 0), 0) +
    (catalog[layout.wall]?.price ?? 0) +
    (catalog[layout.floor]?.price ?? 0);

  const toolBtn = (active: boolean) =>
    `h-7 px-2 border flex items-center gap-1.5 text-[10px] uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
      active ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted} hover:text-emerald-400`
    }`;

  const SceneIcon = prefs.scene === 'day' ? Sun : prefs.scene === 'night' ? Moon : SunMoon;
  const nextScene: Record<Scene, Scene> = { auto: 'day', day: 'night', night: 'auto' };
  const sceneLabel = { auto: t.roomSceneAuto, day: t.roomSceneDay, night: t.roomSceneNight }[prefs.scene];

  return (
    <div className="space-y-3 font-mono text-xs" onKeyDown={handleKey}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={undo} disabled={past.length === 0} className={toolBtn(false)} title={t.roomUndo}>
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.roomUndo}</span>
          </button>
          <button type="button" onClick={redo} disabled={future.length === 0} className={toolBtn(false)} title={t.roomRedo}>
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.roomRedo}</span>
          </button>
          <span className="w-px h-5 mx-0.5 bg-zinc-500/30" aria-hidden />
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, grid: !p.grid }))}
            className={toolBtn(prefs.grid)}
            title={t.roomGridTitle}
            aria-pressed={prefs.grid}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.roomGrid}</span>
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, scene: nextScene[p.scene] }))}
            className={toolBtn(prefs.scene !== 'auto')}
            title={t.roomSceneTitle}
          >
            <SceneIcon className="w-3.5 h-3.5" />
            {sceneLabel}
          </button>
          <button
            type="button"
            onClick={() => setPrefs((p) => ({ ...p, lamps: !p.lamps }))}
            className={toolBtn(lit)}
            title={t.roomLampsTitle}
            aria-pressed={prefs.lamps}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.roomLamps}</span>
          </button>
          <button type="button" onClick={saveSnapshot} className={toolBtn(false)} title={t.roomSnapshotTitle}>
            <Camera className="w-3.5 h-3.5" />
            {t.roomSnapshot}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase tracking-wider ${
              saveState === 'error' ? 'text-rose-400' : saveState === 'saved' ? 'text-emerald-400' : textMuted
            }`}
            aria-live="polite"
          >
            {saveState === 'saving' ? t.roomSaving : saveState === 'saved' ? t.roomSaved : saveState === 'error' ? t.roomSaveError : ''}
          </span>
          <button
            type="button"
            onClick={onOpenShop}
            className="h-7 px-2.5 border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {t.roomOpenShop}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_196px]">
        {/* Stage */}
        <div className="space-y-2 min-w-0">
          <div className={`relative border ${borderCol} p-1.5 bg-zinc-950`}>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              onPointerDown={handleDown}
              onPointerMove={handleMove}
              onPointerUp={handleUp}
              onPointerCancel={handleUp}
              onPointerLeave={() => !pressed.current && armed && setGhost(null)}
              aria-label={t.roomCanvasLabel}
              className={`block w-full aspect-4/3 touch-none select-none outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                armed ? 'cursor-crosshair' : drag ? 'cursor-grabbing' : 'cursor-pointer'
              }`}
              style={{ imageRendering: 'pixelated' }}
            />
            {/* Caption plate, like a diorama label. */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 px-1.5 py-0.5 bg-zinc-950/75 text-[9px] uppercase tracking-widest text-zinc-300">
              <span className={`w-1.5 h-1.5 ${lit ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} aria-hidden />
              {tf(t.roomPiecesPlaced, { a: layout.items.length, b: MAX_PLACED })}
            </div>
          </div>

          {/* Inspector */}
          <div className={`min-h-9 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 border ${borderCol} text-[10px]`}>
            {armedSpec ? (
              <>
                <span className="flex items-center gap-2 min-w-0">
                  <Thumb spec={armedSpec} box={20} className="shrink-0" />
                  <span className="min-w-0">
                    <span className="text-emerald-400 font-bold">{armedSpec.name}</span>{' '}
                    <span className={textMuted}>{t.roomPlaceHint}</span>
                  </span>
                </span>
                <button type="button" onClick={() => setArmed(null)} className="underline cursor-pointer">
                  {t.roomCancel}
                </button>
              </>
            ) : selectedSpec ? (
              <>
                <span className="flex items-center gap-2 min-w-0">
                  <Thumb spec={selectedSpec} box={20} className="shrink-0" />
                  <span className="text-emerald-400 font-bold truncate">{selectedSpec.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  {(
                    [
                      [ArrowLeft, -1, 0],
                      [ArrowUp, 0, -1],
                      [ArrowDown, 0, 1],
                      [ArrowRight, 1, 0],
                    ] as const
                  ).map(([Icon, dx, dy]) => (
                    <button
                      key={`${dx},${dy}`}
                      type="button"
                      onClick={() => nudge(dx, dy)}
                      className={`w-6 h-6 flex items-center justify-center border ${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50 cursor-pointer`}
                      aria-label={t.roomNudge}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={storeSelected}
                    className="ml-1 h-6 px-2 border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    {t.roomStore}
                  </button>
                </span>
              </>
            ) : (
              <span className={textMuted}>{t.roomIdleHint}</span>
            )}
          </div>
          <div className={`hidden sm:flex items-center justify-between gap-2 text-[9px] tracking-wider ${textMuted}`}>
            <span>{t.roomKeysHint}</span>
            <button
              type="button"
              onClick={clearRoom}
              disabled={layout.items.length === 0}
              title={t.roomClearAllTitle}
              className="flex items-center gap-1 uppercase hover:text-rose-400 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3 h-3" />
              {t.roomClearAll}
            </button>
          </div>
          {saveError && <div className="text-[10px] text-rose-400">{saveError}</div>}
        </div>

        {/* Inventory */}
        <div className="space-y-2 min-w-0">
          <div className={`text-[10px] uppercase tracking-wider ${textMuted}`}>{t.roomInventory}</div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-1.5 py-0.5 text-[9px] uppercase border cursor-pointer ${
                  category === c ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted}`
                }`}
              >
                {t[`roomCat_${c}` as const]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-3 gap-1.5 sm:max-h-78 sm:overflow-y-auto sm:pr-1 content-start">
            {owned.map(({ spec, count }) => {
              const isPaint = spec.layer === 'wall_paint' || spec.layer === 'floor_paint';
              const inUse = isPaint && (layout.wall === spec.id || layout.floor === spec.id);
              const left = count - (placedCount[spec.id] ?? 0);
              const disabled = !isPaint && left <= 0;
              const active = armed === spec.id || inUse;
              const status = isPaint ? (inUse ? t.roomInUse : t.roomPaint) : tf(t.roomPlaced, { a: count - left, b: count });
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => pickItem(spec)}
                  disabled={disabled}
                  title={`${spec.name} — ${status}`}
                  className={`relative flex flex-col items-stretch border text-left transition-colors ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : disabled
                      ? `${borderCol} opacity-40 cursor-not-allowed`
                      : `${borderCol} hover:border-emerald-500/50 cursor-pointer`
                  }`}
                >
                  <span className="h-12 flex items-end justify-center pb-1 bg-black/5">
                    <Thumb spec={spec} box={36} />
                  </span>
                  <span className={`block px-1 py-0.5 text-[8px] leading-tight truncate border-t ${borderCol}`}>{spec.name}</span>
                  {!isPaint && count > 1 && (
                    <span className="absolute top-0.5 right-0.5 px-0.5 text-[8px] font-bold tabular-nums bg-zinc-950/80 text-zinc-200">
                      ×{left}
                    </span>
                  )}
                  {(inUse || (!isPaint && left <= 0)) && (
                    <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-emerald-400" aria-hidden />
                  )}
                </button>
              );
            })}
            {owned.length === 0 && <div className={`col-span-full text-[10px] ${textMuted} p-2`}>{t.roomEmptyCategory}</div>}
          </div>
        </div>
      </div>

      {/* Footer: collection, room value and this week's drop */}
      <div className={`grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] border-t ${borderCol} pt-3`}>
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 border ${borderCol} space-y-1.5`}>
            <div className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{t.roomCollection}</div>
            <div className="text-sm font-bold tabular-nums">
              {ownedKinds}
              <span className={`text-[10px] font-normal ${textMuted}`}> / {room.catalog.length}</span>
            </div>
            <div className={`h-1 border ${borderCol}`}>
              <div className="h-full bg-emerald-500" style={{ width: `${(ownedKinds / Math.max(1, room.catalog.length)) * 100}%` }} />
            </div>
          </div>
          <div className={`p-2 border ${borderCol} space-y-1.5`}>
            <div className={`text-[9px] uppercase tracking-wider ${textMuted}`}>{t.roomValue}</div>
            <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
              <BitShard className="w-3 h-3" />
              {fmt(roomValue)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenShop}
          className={`p-2 border ${borderCol} text-left space-y-1.5 hover:border-amber-500/60 transition-colors cursor-pointer group`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] uppercase tracking-wider text-amber-400">{t.roomWeeklyDrop}</span>
            <ShoppingBag className={`w-3 h-3 ${textMuted} group-hover:text-amber-400`} />
          </div>
          <div className="grid grid-cols-6 gap-1">
            {room.weekly.items.map((id) => {
              const spec = catalog[id];
              if (!spec) return null;
              const have = (room.inventory[id] ?? 0) > 0;
              return (
                <span
                  key={id}
                  className={`h-8 flex items-end justify-center pb-0.5 border ${have ? 'border-emerald-500/40' : borderCol} bg-black/5`}
                >
                  <Thumb spec={spec} box={24} className={have ? 'opacity-40' : ''} />
                </span>
              );
            })}
          </div>
          <div className={`text-[9px] font-sans ${textMuted}`}>{t.roomWeeklyDropHint}</div>
        </button>
      </div>
    </div>
  );
};
