import React, { useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { useI18n } from './i18n';
import { getUserStatusOption } from './userStatus';

// Ranked list of the picked learner-profile statuses. Order is priority
// (#1 = headline). Each row ends with two controls: × removes the status,
// and the grip beside it lifts the row on press so it can be dragged to a
// new rank. Keyboard: ↑/↓ on the grip moves the row.

interface DragState {
  id: string;
  pointerId: number;
  startY: number;
  startIndex: number;
  rowH: number;
  dy: number;
}

interface StatusRankListProps {
  statuses: string[];
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
  groupLabelOf: (id: string) => string | undefined;
  borderCol: string;
  textMuted: string;
  bgCard: string;
}

const moveItem = (list: string[], from: number, to: number): string[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export const StatusRankList: React.FC<StatusRankListProps> = ({
  statuses,
  onReorder,
  onRemove,
  groupLabelOf,
  borderCol,
  textMuted,
  bgCard,
}) => {
  const { t } = useI18n();
  const [drag, setDrag] = useState<DragState | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      id,
      pointerId: e.pointerId,
      startY: e.clientY,
      startIndex: index,
      rowH: rowRefs.current.get(id)?.offsetHeight || 32,
      dy: 0,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dy = e.clientY - drag.startY;
    const current = statuses.indexOf(drag.id);
    const target = Math.max(0, Math.min(statuses.length - 1, drag.startIndex + Math.round(dy / drag.rowH)));
    if (current !== -1 && target !== current) onReorder(moveItem(statuses, current, target));
    setDrag({ ...drag, dy });
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    e.preventDefault();
    const target = index + delta;
    if (target < 0 || target >= statuses.length) return;
    onReorder(moveItem(statuses, index, target));
  };

  return (
    <ol className={`relative border-l border-t ${borderCol} select-none`}>
      {statuses.map((id, idx) => {
        const isFirst = idx === 0;
        const isLifted = drag?.id === id;
        // Keep the lifted row under the finger while its slot jumps rank by rank.
        const offset = isLifted ? drag.dy - (idx - drag.startIndex) * drag.rowH : 0;
        const groupLabel = groupLabelOf(id);
        return (
          <li
            key={id}
            ref={(el) => {
              if (el) rowRefs.current.set(id, el);
              else rowRefs.current.delete(id);
            }}
            style={isLifted ? { transform: `translateY(${offset}px)` } : undefined}
            className={`flex items-stretch border-r border-b text-[10px] ${
              isLifted
                ? `relative z-10 ${bgCard} border-emerald-500 outline outline-emerald-500 shadow-[0_8px_24px_rgba(0,0,0,0.45)]`
                : `${borderCol} transition-colors ${isFirst ? 'bg-emerald-500/15' : ''}`
            }`}
          >
            <span
              className={`w-8 shrink-0 flex items-center justify-center font-bold tabular-nums border-r ${borderCol} ${
                isFirst ? 'bg-emerald-500 text-zinc-950' : 'text-emerald-400'
              }`}
            >
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span className="flex-1 min-w-0 px-2 py-1.5 flex items-center gap-2">
              <span className={`truncate font-bold ${isFirst ? 'text-emerald-400' : ''}`}>
                {getUserStatusOption(id)?.label ?? id}
              </span>
              {isFirst && (
                <span className="shrink-0 px-1 border border-emerald-500/60 text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                  {t.statusPrimary}
                </span>
              )}
              {groupLabel && (
                <span className={`hidden sm:inline ml-auto shrink-0 text-[9px] uppercase ${textMuted}`}>
                  {groupLabel}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onRemove(id)}
              aria-label={t.statusRemove}
              title={t.statusRemove}
              className={`w-8 shrink-0 flex items-center justify-center border-l ${borderCol} ${textMuted} cursor-pointer transition-colors hover:text-rose-400 hover:bg-rose-500/10`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => handlePointerDown(e, id, idx)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              aria-label={t.statusDragHandle}
              title={t.statusDragHandle}
              className={`w-8 shrink-0 flex items-center justify-center border-l ${borderCol} touch-none transition-colors ${
                isLifted
                  ? 'bg-emerald-500 text-zinc-950 cursor-grabbing'
                  : `${textMuted} cursor-grab hover:text-emerald-400 hover:bg-emerald-500/10`
              }`}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          </li>
        );
      })}
    </ol>
  );
};
