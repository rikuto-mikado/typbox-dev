import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';
import { api, type RoomState } from './api';
import { tf, useI18n } from './i18n';
import {
  anchorAt,
  canPlace,
  pieceAt,
  renderRoom,
  ROOM_H,
  ROOM_W,
  thumbnail,
  type FurnitureSpec,
  type Ghost,
  type RoomLayout,
} from './roomRender';

// 04 / MY ROOM: arrange owned furniture in a 16 x 12 pixel room.
// Pick a piece in the inventory, then tap (or drag and release) where it
// should stand; drag a placed piece to move it, select it to store it.
// Paints swap the whole wall / floor. Changes save on their own shortly
// after the last edit (the server re-validates every layout).

const SAVE_DELAY_MS = 700;
const CATEGORIES = ['all', 'desk', 'seating', 'storage', 'decor', 'lighting', 'tech', 'wall', 'surfaces'] as const;
type Category = (typeof CATEGORIES)[number];

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

export const MyRoomPanel: React.FC<MyRoomPanelProps> = ({ isRunning, timeZone, borderCol, textMuted, onOpenShop }) => {
  const { t } = useI18n();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [layout, setLayout] = useState<RoomLayout | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState(-1);
  const [armed, setArmed] = useState<string | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [category, setCategory] = useState<Category>('all');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [night, setNight] = useState(() => {
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
      setNight(h >= 19 || h < 6);
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [timeZone]);

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

  useEffect(() => {
    if (!canvasRef.current || !layout || !room) return;
    renderRoom(canvasRef.current, layout, catalog, {
      env: { on: isRunning, night },
      selected,
      lifted: drag?.moved ? drag.index : -1,
      ghost,
    });
  }, [layout, room, catalog, isRunning, night, selected, drag, ghost]);

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
        setLayout({ ...layout, items: [...layout.items, { id: ghost.id, x: ghost.x, y: ghost.y }] });
        setSelected(layout.items.length);
        setArmed(null);
      }
      setGhost(null);
      return;
    }
    if (drag) {
      if (drag.moved && ghost?.valid) {
        setLayout({
          ...layout,
          items: layout.items.map((it, i) => (i === drag.index ? { ...it, x: ghost.x, y: ghost.y } : it)),
        });
      }
      setDrag(null);
      setGhost(null);
    }
  };

  const storeSelected = () => {
    if (selected < 0) return;
    setLayout({ ...layout, items: layout.items.filter((_, i) => i !== selected) });
    setSelected(-1);
  };

  const pickItem = (spec: FurnitureSpec) => {
    if (spec.layer === 'wall_paint') {
      setLayout({ ...layout, wall: spec.id });
      return;
    }
    if (spec.layer === 'floor_paint') {
      setLayout({ ...layout, floor: spec.id });
      return;
    }
    setSelected(-1);
    setArmed(armed === spec.id ? null : spec.id);
    setGhost(null);
  };

  const owned = Object.entries(room.inventory)
    .map(([id, count]) => ({ spec: catalog[id], count }))
    .filter((e) => e.spec && e.count > 0 && (category === 'all' || e.spec.category === category))
    .sort((a, b) => a.spec.category.localeCompare(b.spec.category) || a.spec.tier - b.spec.tier);

  const selectedSpec = selected >= 0 ? catalog[layout.items[selected]?.id] : undefined;
  const armedSpec = armed ? catalog[armed] : undefined;

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`text-[10px] ${textMuted}`}>{t.roomHint}</div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] uppercase tracking-wider ${
              saveState === 'error' ? 'text-rose-400' : saveState === 'saved' ? 'text-emerald-400' : textMuted
            }`}
          >
            {saveState === 'saving' ? t.roomSaving : saveState === 'saved' ? t.roomSaved : saveState === 'error' ? t.roomSaveError : ''}
          </span>
          <button
            type="button"
            onClick={onOpenShop}
            className="px-2.5 py-1.5 border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {t.roomOpenShop}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
        <div className="space-y-2 min-w-0">
          <canvas
            ref={canvasRef}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onPointerLeave={() => !pressed.current && armed && setGhost(null)}
            aria-label={t.roomCanvasLabel}
            className={`block w-full aspect-4/3 border ${borderCol} touch-none select-none ${
              armed ? 'cursor-crosshair' : drag ? 'cursor-grabbing' : 'cursor-pointer'
            }`}
            style={{ imageRendering: 'pixelated' }}
          />
          <div className={`min-h-7.5 flex flex-wrap items-center justify-between gap-2 px-2 py-1.5 border ${borderCol} text-[10px]`}>
            {armedSpec ? (
              <>
                <span>
                  <span className="text-emerald-400 font-bold">{armedSpec.name}</span>{' '}
                  <span className={textMuted}>{t.roomPlaceHint}</span>
                </span>
                <button type="button" onClick={() => setArmed(null)} className="underline cursor-pointer">
                  {t.roomCancel}
                </button>
              </>
            ) : selectedSpec ? (
              <>
                <span>
                  <span className="text-emerald-400 font-bold">{selectedSpec.name}</span>{' '}
                  <span className={textMuted}>{t.roomDragHint}</span>
                </span>
                <button
                  type="button"
                  onClick={storeSelected}
                  className="px-2 py-0.5 border border-rose-500/50 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  {t.roomStore}
                </button>
              </>
            ) : (
              <span className={textMuted}>{t.roomIdleHint}</span>
            )}
          </div>
          {saveError && <div className="text-[10px] text-rose-400">{saveError}</div>}
        </div>

        <div className="space-y-2 min-w-0">
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
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:max-h-75 sm:overflow-y-auto sm:pr-1">
            {owned.map(({ spec, count }) => {
              const isPaint = spec.layer === 'wall_paint' || spec.layer === 'floor_paint';
              const inUse = isPaint && (layout.wall === spec.id || layout.floor === spec.id);
              const left = count - (placedCount[spec.id] ?? 0);
              const disabled = !isPaint && left <= 0;
              const active = armed === spec.id || inUse;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => pickItem(spec)}
                  disabled={disabled}
                  className={`flex items-center gap-2 p-1.5 border text-left transition-colors ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : disabled
                      ? `${borderCol} opacity-40 cursor-not-allowed`
                      : `${borderCol} hover:border-emerald-500/50 cursor-pointer`
                  }`}
                >
                  <span className={`w-9 h-9 shrink-0 flex items-center justify-center border ${borderCol} bg-black/5`}>
                    <img
                      src={thumbnail(spec)}
                      alt=""
                      className="max-w-8 max-h-8"
                      style={{ imageRendering: 'pixelated', width: spec.w >= spec.h || isPaint ? 32 : undefined, height: spec.h > spec.w ? 32 : undefined }}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold truncate">{spec.name}</span>
                    <span className={`block text-[9px] ${inUse ? 'text-emerald-400' : textMuted}`}>
                      {isPaint ? (inUse ? t.roomInUse : t.roomPaint) : tf(t.roomPlaced, { a: count - left, b: count })}
                    </span>
                  </span>
                </button>
              );
            })}
            {owned.length === 0 && <div className={`text-[10px] ${textMuted} p-2`}>{t.roomEmptyCategory}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
