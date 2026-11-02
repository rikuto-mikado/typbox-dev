import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArchiveRestore,
  Camera,
  ChevronDown,
  Grid3x3,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Moon,
  Redo2,
  Save,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  Undo2,
} from 'lucide-react';
import { api, type RoomState } from './api';
import { BitShard, StudyTime } from './BitsBadge';
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
//
// ROOMS: five rooms, each arranged on its own from the same inventory (a
// piece can stand in all of them). The strip switches rooms; SAVE keeps a
// save point of the open room on the server and LOAD SAVE puts it back as
// an ordinary, undoable edit (the safety net after an accidental CLEAR).

const SAVE_DELAY_MS = 700;
const HISTORY_LIMIT = 50;
const MAX_PLACED = 64;
const CATEGORIES = ['all', 'desk', 'seating', 'storage', 'decor', 'lighting', 'tech', 'wall', 'surfaces'] as const;
type Category = (typeof CATEGORIES)[number];
type Scene = 'day' | 'night';

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
  /** Keys the "seen" list for NEW badges per account on this device. */
  userId?: number;
  /** What is falling outside right now, for the view windows. */
  weather?: 'rain' | 'snow' | null;
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
// Before the operator picks DAY or NIGHT (or for a stored "auto" from older
// builds) the scene starts from the local clock once, then stays put.
const clockScene = (timeZone: string): Scene => {
  const h = localHour(timeZone);
  return h >= 19 || h < 6 ? 'night' : 'day';
};
const readPrefs = (timeZone: string): { scene: Scene; lamps: boolean; grid: boolean } => {
  const fallback = { scene: clockScene(timeZone), lamps: false, grid: false };
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? '{}');
    return {
      scene: raw.scene === 'day' || raw.scene === 'night' ? raw.scene : fallback.scene,
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

// NEW badges: furniture ids the operator has already seen in YOUR
// FURNITURE (a per-device convenience). The first visit takes everything
// owned as seen, so only later purchases show NEW; tapping one clears it.
const seenKey = (userId?: number) => `typbox.room.seen.${userId ?? 'anon'}`;
const readSeen = (userId?: number): Set<string> | null => {
  try {
    const raw = window.localStorage.getItem(seenKey(userId));
    const ids: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(ids) ? new Set(ids.filter((id): id is string => typeof id === 'string')) : null;
  } catch {
    return null;
  }
};
const writeSeen = (userId: number | undefined, seen: Set<string>) => {
  try {
    window.localStorage.setItem(seenKey(userId), JSON.stringify([...seen]));
  } catch {
    /* storage unavailable: badges just last for this visit */
  }
};

export const MyRoomPanel: React.FC<MyRoomPanelProps> = ({ isRunning, timeZone, borderCol, textMuted, onOpenShop, userId, weather }) => {
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
  const [prefs, setPrefs] = useState(() => readPrefs(timeZone));
  const [slotBusy, setSlotBusy] = useState<'save' | 'switch' | null>(null);
  const [slotNote, setSlotNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [nameDraft, setNameDraft] = useState<{ slot: number; value: string } | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [seen, setSeen] = useState<Set<string> | null>(() => readSeen(userId));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedJson = useRef<string>('');
  const pressed = useRef(false);
  // Bumped on every room switch: an autosave answered after the switch
  // belongs to the previous room and must not overwrite the new one.
  const roomEpoch = useRef(0);

  useEffect(() => {
    let cancelled = false;
    api.room
      .get()
      .then((state) => {
        if (cancelled) return;
        setRoom(state);
        setLayout(state.layout);
        savedJson.current = JSON.stringify(state.layout);
        // First visit on this device: what is owned now is not "new".
        if (!readSeen(userId)) {
          const baseline = new Set(Object.keys(state.inventory));
          writeSeen(userId, baseline);
          setSeen(baseline);
        }
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message || t.roomLoadFailed));
    return () => {
      cancelled = true;
    };
  }, [t.roomLoadFailed, userId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode etc.: the view just resets next time */
    }
  }, [prefs]);

  // Debounced save of every change (held while a room switch / SAVE is in
  // flight: those send the current layout themselves).
  useEffect(() => {
    if (!layout || slotBusy) return;
    const json = JSON.stringify(layout);
    if (json === savedJson.current) return;
    const epoch = roomEpoch.current;
    const id = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        const state = await api.room.save(layout);
        if (epoch !== roomEpoch.current) return;
        savedJson.current = JSON.stringify(state.layout);
        setRoom(state);
        setSaveState('saved');
        setSaveError(null);
      } catch (err: unknown) {
        if (epoch !== roomEpoch.current) return;
        setSaveState('error');
        setSaveError((err as Error).message || t.roomSaveFailed);
      }
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [layout, slotBusy, t.roomSaveFailed]);

  useEffect(() => {
    if (!slotNote) return;
    const id = window.setTimeout(() => setSlotNote(null), 4000);
    return () => window.clearTimeout(id);
  }, [slotNote]);

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

  // Small pictures of the five rooms for the strip (the open one live).
  const activeRoom = room?.active_room ?? 0;
  const roomPreviews = useMemo(() => {
    if (!roomsOpen || !room?.rooms || !layout || room.catalog.length === 0) return [];
    return room.rooms.map((slot, i) => snapshotRoom(i === activeRoom ? layout : slot.layout, catalog, { on: false, night: false }, 1));
  }, [roomsOpen, room, layout, catalog, activeRoom]);

  const night = prefs.scene === 'night';
  const lit = isRunning || prefs.lamps;
  const showGrid = prefs.grid || Boolean(armed) || Boolean(drag?.moved);

  useEffect(() => {
    if (!canvasRef.current || !layout || !room) return;
    renderRoom(canvasRef.current, layout, catalog, {
      env: { on: lit, night, weather },
      selected,
      lifted: drag?.moved ? drag.index : -1,
      ghost,
      grid: showGrid,
    });
  }, [layout, room, catalog, lit, night, weather, selected, drag, ghost, showGrid]);

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

  const markSeen = (id: string) => {
    if (!seen || seen.has(id)) return;
    const next = new Set(seen);
    next.add(id);
    writeSeen(userId, next);
    setSeen(next);
  };

  const pickItem = (spec: FurnitureSpec) => {
    markSeen(spec.id);
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

  // ---------------------------------------------------------------- rooms
  const stamp = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    try {
      return new Intl.DateTimeFormat('en-GB', { timeZone, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .format(d)
        .replace(',', '');
    } catch {
      return d.toISOString().slice(5, 16).replace('T', ' ');
    }
  };
  const slots = room.rooms ?? [];
  const openSlot = slots[activeRoom];

  // An autosave already on the wire must land first (it is for this room).
  const slotLocked = Boolean(slotBusy) || saveState === 'saving';

  const switchRoom = async (slot: number) => {
    if (slot === activeRoom || slotLocked) return;
    setSlotBusy('switch');
    roomEpoch.current += 1;
    try {
      const state = await api.room.rooms({ action: 'switch', slot, layout });
      roomEpoch.current += 1;
      savedJson.current = JSON.stringify(state.layout);
      setRoom(state);
      setLayout(state.layout);
      setPast([]);
      setFuture([]);
      setSelected(-1);
      setArmed(null);
      setGhost(null);
      setSaveState('idle');
      setSaveError(null);
      setNameDraft(null);
    } catch (err: unknown) {
      setSlotNote({ text: (err as Error).message || t.roomSwitchFailed, tone: 'error' });
    } finally {
      setSlotBusy(null);
    }
  };

  const saveSlot = async () => {
    if (slotLocked) return;
    setSlotBusy('save');
    roomEpoch.current += 1;
    try {
      const state = await api.room.rooms({ action: 'save', layout });
      roomEpoch.current += 1;
      savedJson.current = JSON.stringify(state.layout);
      setRoom(state);
      setSaveState('saved');
      setSaveError(null);
      const at = state.rooms?.[state.active_room ?? 0]?.saved_at ?? null;
      setSlotNote({ text: tf(t.roomSavePointMade, { time: stamp(at) }), tone: 'ok' });
    } catch (err: unknown) {
      setSlotNote({ text: (err as Error).message || t.roomSlotSaveFailed, tone: 'error' });
    } finally {
      setSlotBusy(null);
    }
  };

  const loadSave = () => {
    if (!openSlot?.saved) return;
    if (JSON.stringify(openSlot.saved) !== JSON.stringify(layout)) commit(openSlot.saved);
    setSelected(-1);
    setArmed(null);
    setSlotNote({ text: t.roomSaveLoaded, tone: 'ok' });
  };

  const commitName = async () => {
    if (!nameDraft) return;
    const { slot, value } = nameDraft;
    setNameDraft(null);
    if (value.trim() === (slots[slot]?.name ?? '')) return;
    try {
      const state = await api.room.rooms({ action: 'rename', slot, name: value });
      // Only the names: the layouts in this answer may trail the editor.
      setRoom((prev) =>
        prev && prev.rooms && state.rooms ? { ...prev, rooms: prev.rooms.map((r, i) => ({ ...r, name: state.rooms![i].name })) } : prev
      );
    } catch (err: unknown) {
      setSlotNote({ text: (err as Error).message, tone: 'error' });
    }
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
  const needle = query.trim().toLowerCase();
  const isNew = (id: string) => Boolean(seen) && !seen!.has(id) && (catalog[id]?.tier ?? 0) > 0;
  const newCount = Object.keys(room.inventory).filter((id) => (room.inventory[id] ?? 0) > 0 && isNew(id)).length;
  const owned = Object.entries(room.inventory)
    .map(([id, count]) => ({ spec: catalog[id], count }))
    .filter((e) => e.spec && e.count > 0 && (category === 'all' || e.spec.category === category))
    .filter((e) => !needle || e.spec.name.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        Number(isNew(b.spec.id)) - Number(isNew(a.spec.id)) ||
        a.spec.category.localeCompare(b.spec.category) ||
        a.spec.tier - b.spec.tier
    );

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

  /** One icon button of the stage dock (label as tooltip and for screen readers). */
  const dockBtn = (
    onClick: () => void,
    Icon: typeof Sun,
    label: string,
    { on = false, disabled = false, danger = false }: { on?: boolean; disabled?: boolean; danger?: boolean } = {}
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on || undefined}
      title={label}
      className={`w-9 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        on ? 'bg-emerald-500/15 text-emerald-400' : danger ? 'hover:text-rose-400 hover:bg-rose-500/10' : 'hover:text-emerald-400 hover:bg-white/5'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="space-y-3 font-mono text-xs" onKeyDown={handleKey}>
      {/* Rooms: one slim bar (numbered chips switch rooms, SAVE / LOAD SAVE
          for the open one); ROOMS opens a drawer with a picture of each
          room, renaming and the save time. */}
      {slots.length > 0 && (
        <div className={`border ${borderCol}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 p-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setRoomsOpen((v) => !v)}
                aria-expanded={roomsOpen}
                title={t.roomRoomsHint}
                className={toolBtn(roomsOpen)}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {t.roomRooms}
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${roomsOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className="flex items-center gap-1" role="tablist" aria-label={t.roomRooms}>
                {slots.map((slot, i) => {
                  const on = i === activeRoom;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => switchRoom(i)}
                      disabled={slotLocked && !on}
                      title={tf(t.roomOpenRoom, { name: slot.name })}
                      className={`relative w-7 h-7 border text-[10px] font-bold tabular-nums transition-colors ${
                        on
                          ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                          : `${borderCol} ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-wait`
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <span className="hidden sm:inline min-w-0 truncate text-[11px] font-bold text-emerald-400">{openSlot?.name}</span>
              {slotBusy === 'switch' && <Loader2 className={`w-3 h-3 shrink-0 animate-spin ${textMuted}`} />}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={saveSlot}
                disabled={slotLocked}
                className={toolBtn(false)}
                title={tf(t.roomSaveSlotTitle, { name: openSlot?.name ?? '' })}
              >
                {slotBusy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {t.roomSaveSlot}
              </button>
              <button
                type="button"
                onClick={loadSave}
                disabled={!openSlot?.saved || Boolean(slotBusy)}
                className={toolBtn(false)}
                title={openSlot?.saved ? tf(t.roomLoadSaveTitle, { name: openSlot.name, time: stamp(openSlot.saved_at) }) : t.roomNoSave}
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                {t.roomLoadSave}
              </button>
              <button
                type="button"
                onClick={onOpenShop}
                title={t.roomOpenShop}
                className="h-7 px-2 border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.roomShopShort}</span>
              </button>
            </div>
          </div>
          {slotNote && (
            <div
              className={`px-2 pb-1.5 text-[9px] uppercase tracking-wider ${slotNote.tone === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}
              aria-live="polite"
            >
              {slotNote.text}
            </div>
          )}
          {/* Drawer: opens with a height slide (grid rows 0fr → 1fr). */}
          <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${roomsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden min-h-0" inert={!roomsOpen}>
              <div className={`p-2 border-t ${borderCol} space-y-2`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={nameDraft?.slot === activeRoom ? nameDraft.value : openSlot?.name ?? ''}
                    maxLength={20}
                    onChange={(e) => setNameDraft({ slot: activeRoom, value: e.target.value })}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setNameDraft(null);
                      }
                    }}
                    aria-label={t.roomRename}
                    title={t.roomRename}
                    className={`w-40 h-7 px-1.5 border ${borderCol} bg-transparent text-[11px] font-bold text-emerald-400 outline-none focus:border-emerald-500/70`}
                  />
                  <span className={`text-[9px] uppercase tracking-wider ${openSlot?.saved ? 'text-amber-400' : textMuted}`}>
                    {openSlot?.saved ? tf(t.roomSlotSaved, { time: stamp(openSlot.saved_at) }) : t.roomNoSave}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {slots.map((slot, i) => {
                    const on = i === activeRoom;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => switchRoom(i)}
                        disabled={slotLocked && !on}
                        title={tf(t.roomOpenRoom, { name: slot.name })}
                        className={`group relative min-w-0 border text-left transition-colors ${
                          on ? 'border-emerald-500 bg-emerald-500/10' : `${borderCol} hover:border-emerald-500/50 cursor-pointer disabled:opacity-50 disabled:cursor-wait`
                        }`}
                      >
                        <span className="block overflow-hidden">
                          {roomPreviews[i] ? (
                            <img
                              src={roomPreviews[i]}
                              alt=""
                              draggable={false}
                              className={`block w-full aspect-4/3 transition-transform duration-300 ${on ? '' : 'group-hover:scale-105'}`}
                              style={{ imageRendering: 'pixelated' }}
                            />
                          ) : (
                            <span className="block w-full aspect-4/3 bg-zinc-500/10" />
                          )}
                        </span>
                        <span className={`flex items-center gap-1 px-1 py-0.5 border-t ${borderCol} text-[8px] sm:text-[9px] leading-tight`}>
                          <span className={`shrink-0 tabular-nums ${on ? 'text-emerald-400 font-bold' : textMuted}`}>{i + 1}</span>
                          <span className={`truncate ${on ? 'text-emerald-400 font-bold' : textMuted}`}>{slot.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        {/* Stage: the room in a dark frame, its tools docked underneath */}
        <div className="space-y-2 min-w-0">
          <div className={`border ${borderCol} bg-zinc-950`}>
          <div className="relative p-1.5">
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
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 px-1.5 py-0.5 bg-zinc-950/75 text-[9px] uppercase tracking-widest text-zinc-300 max-w-[70%]">
              <span className={`w-1.5 h-1.5 shrink-0 ${lit ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} aria-hidden />
              {openSlot && <span className="truncate font-bold text-emerald-300">{openSlot.name}</span>}
              {openSlot && <span className="text-zinc-500">·</span>}
              <span className="shrink-0">{tf(t.roomPiecesPlaced, { a: layout.items.length, b: MAX_PLACED })}</span>
            </div>
          </div>
          {/* Dock: history · view · output, then the autosave state */}
          <div className="flex items-stretch h-8 border-t border-zinc-800 text-zinc-400" role="toolbar" aria-label={t.roomToolsLabel}>
            {dockBtn(undo, Undo2, t.roomUndo, { disabled: past.length === 0 })}
            {dockBtn(redo, Redo2, t.roomRedo, { disabled: future.length === 0 })}
            <span className="w-px bg-zinc-800" aria-hidden />
            {dockBtn(() => setPrefs((p) => ({ ...p, grid: !p.grid })), Grid3x3, t.roomGridTitle, { on: prefs.grid })}
            {dockBtn(() => setPrefs((p) => ({ ...p, scene: 'day' })), Sun, t.roomSceneDay, { on: prefs.scene === 'day' })}
            {dockBtn(() => setPrefs((p) => ({ ...p, scene: 'night' })), Moon, t.roomSceneNight, { on: prefs.scene === 'night' })}
            {dockBtn(() => setPrefs((p) => ({ ...p, lamps: !p.lamps })), Lightbulb, t.roomLampsTitle, { on: lit })}
            <span className="w-px bg-zinc-800" aria-hidden />
            {dockBtn(saveSnapshot, Camera, t.roomSnapshotTitle)}
            {dockBtn(clearRoom, Trash2, t.roomClearAllTitle, { disabled: layout.items.length === 0, danger: true })}
            <span
              className={`ml-auto self-center px-2 text-[9px] uppercase tracking-wider truncate ${
                saveState === 'error' ? 'text-rose-400' : saveState === 'saved' ? 'text-emerald-400' : 'text-zinc-500'
              }`}
              aria-live="polite"
            >
              {saveState === 'saving' ? t.roomSaving : saveState === 'saved' ? t.roomSaved : saveState === 'error' ? t.roomSaveError : ''}
            </span>
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
          <div className={`hidden sm:block text-[9px] tracking-wider ${textMuted}`}>{t.roomKeysHint}</div>
          {saveError && <div className="text-[10px] text-rose-400">{saveError}</div>}
        </div>

        {/* Inventory: as tall as the stage on wide screens (the list scrolls) */}
        <div className="relative min-w-0 min-h-64">
          <div className="sm:absolute sm:inset-0 flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[10px] uppercase tracking-wider truncate ${textMuted}`}>{t.roomInventory}</span>
              {newCount > 0 && (
                <span className="shrink-0 px-1 text-[8px] font-bold leading-3.5 bg-amber-400 text-zinc-950" title={t.roomNewTitle}>
                  {tf(t.roomNewCount, { n: newCount })}
                </span>
              )}
            </span>
            <span className={`shrink-0 text-[9px] tabular-nums ${textMuted}`}>{tf(t.roomInventoryCount, { n: owned.length })}</span>
          </div>
          <label className={`flex items-center gap-1.5 h-7 px-2 border ${borderCol} focus-within:border-emerald-500/60`}>
            <Search className={`w-3.5 h-3.5 shrink-0 ${textMuted}`} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.roomSearch}
              aria-label={t.roomSearch}
              className="min-w-0 flex-1 bg-transparent outline-none text-[11px] uppercase placeholder:normal-case"
            />
          </label>
          {/* One row of categories that scrolls sideways */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t.roomInventory}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-1.5 py-0.5 text-[9px] uppercase border whitespace-nowrap cursor-pointer transition-colors ${
                  category === c ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-bold' : `${borderCol} ${textMuted} hover:text-emerald-400`
                }`}
              >
                {t[`roomCat_${c}` as const]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-3 gap-1.5 max-h-72 sm:max-h-none sm:flex-1 sm:min-h-0 overflow-y-auto pr-1 content-start [scrollbar-width:thin]">
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
                  {isNew(spec.id) ? (
                    <span className="absolute top-0.5 left-0.5 px-0.5 text-[7px] font-bold leading-3 bg-amber-400 text-zinc-950" aria-label={t.roomNewTitle}>
                      {t.roomNew}
                    </span>
                  ) : (
                    (inUse || (!isPaint && left <= 0)) && <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-emerald-400" aria-hidden />
                  )}
                </button>
              );
            })}
            {owned.length === 0 && (
              <div className={`col-span-full text-[10px] ${textMuted} p-2`}>{query.trim() ? t.roomNoMatch : t.roomEmptyCategory}</div>
            )}
          </div>
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
            <StudyTime bits={roomValue} className={`block ${textMuted}`} />
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
