import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n, tf } from './i18n';
import { swatchStyle } from './categoryStyle';

interface TrendCategory {
  id: string | number;
  name: string;
  code: string;
  color: string;
  isActive?: boolean;
}

export interface TrendColumn {
  id: string;
  label: string; // short axis label (e.g. "10/13", "OCT")
  title: string; // full label for the header tooltip
  totalMinutes: number;
  byCategory: Array<{ category: TrendCategory; minutes: number }>;
}

export interface CategoryTrendTableProps {
  columns: TrendColumn[];
  categories: TrendCategory[];
  unitLabel: string; // "DAY" | "WEEK" | "MONTH"
  isDark: boolean;
  borderCol: string;
  textMuted: string;
  highlightIdx: number | null;
  onHighlight: (idx: number | null) => void;
}

// The table is a fixed-size block: TOP 5 rows, a "+N" row for the rest (it
// reads +0 when there is nothing to fold) and TOTAL, always, so switching
// windows, adding categories or signing out never changes its height.
// Fewer than five busy categories leave blank rows; SHOW ALL scrolls the
// full list inside the same box instead of growing it.
const COLLAPSED_ROW_LIMIT = 5;
const EXPANDED_STORAGE_KEY = 'typbox_trend_expanded';
/** One body row; header + 6 rows + total fit the box exactly. */
const ROW_PX = 26;
const BOX_PX = ROW_PX * 8 + 2;

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (key: string, value: boolean) => {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // storage unavailable — state still toggles for this session
  }
};

const formatHours = (minutes: number) => (minutes > 0 ? (minutes / 60).toFixed(1) : '·');

/**
 * CategoryTrendTable: color legend + numeric companion to the stacked bar
 * charts. One row per category with time in the window, one column per bar,
 * so "which category, how many hours, in which period" can be read directly
 * instead of guessed from segment heights. Each cell is heat-tinted with the
 * category color relative to that row's peak, and the hovered bar's column
 * is highlighted.
 */
export const CategoryTrendTable: React.FC<CategoryTrendTableProps> = ({
  columns,
  categories,
  unitLabel,
  isDark,
  borderCol,
  textMuted,
  highlightIdx,
  onHighlight,
}) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<boolean>(() => readFlag(EXPANDED_STORAGE_KEY));

  const toggleExpanded = () => {
    setExpanded((prev) => {
      writeFlag(EXPANDED_STORAGE_KEY, !prev);
      return !prev;
    });
  };

  // Idle categories are left out (the legend above still lists every one);
  // the busiest categories in this window come first.
  const activeRows = useMemo(() => {
    return categories
      .map((cat) => {
        const cells = columns.map(
          (col) =>
            col.byCategory.find((seg) => String(seg.category.id) === String(cat.id))?.minutes ?? 0
        );
        const total = cells.reduce((acc, m) => acc + m, 0);
        return { cat, cells, total, peak: Math.max(0, ...cells) };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, columns]);

  const canCollapse = activeRows.length > COLLAPSED_ROW_LIMIT;
  const showAll = canCollapse && expanded;
  const visibleRows = showAll ? activeRows : activeRows.slice(0, COLLAPSED_ROW_LIMIT);
  const foldedRows = showAll ? [] : activeRows.slice(COLLAPSED_ROW_LIMIT);
  const foldedCells = columns.map((_, idx) => foldedRows.reduce((acc, row) => acc + row.cells[idx], 0));
  const foldedPeak = Math.max(0, ...foldedCells);
  const idleCount = categories.length - activeRows.length;
  // Blank rows keep the box at five rows when fewer categories were busy.
  const blankRows = showAll ? 0 : Math.max(0, COLLAPSED_ROW_LIMIT - visibleRows.length);

  // Legend order: the categories drawn in this window's bars (busiest first,
  // same as the table) lead; idle ones keep their registry order after them.
  // One line that scrolls sideways, so it never adds height.
  const legendCategories = useMemo(() => {
    const activeIds = new Set(activeRows.map((row) => String(row.cat.id)));
    return [...activeRows.map((row) => row.cat), ...categories.filter((cat) => !activeIds.has(String(cat.id)))];
  }, [activeRows, categories]);

  const stickyBg = { backgroundColor: 'var(--tb-bg-card)' };
  const rowBorder = isDark ? 'border-zinc-800/60' : 'border-zinc-200';
  const colHighlight = 'bg-emerald-500/10';

  const renderCells = (cells: number[], peak: number, color: string, code: string) =>
    cells.map((minutes, idx) => {
      const ratio = peak > 0 ? minutes / peak : 0;
      return (
        <td
          key={columns[idx].id}
          onMouseEnter={() => onHighlight(idx)}
          title={`[${code}] ${columns[idx].title}: ${(minutes / 60).toFixed(1)}h (${minutes} min)`}
          className={`relative px-1.5 py-1 text-right whitespace-nowrap ${highlightIdx === idx ? colHighlight : ''}`}
        >
          {minutes > 0 && (
            <span
              aria-hidden
              className="absolute inset-0.5 pointer-events-none"
              style={{ backgroundColor: color, opacity: 0.1 + ratio * 0.35 }}
            />
          )}
          <span className={`relative ${minutes > 0 ? '' : textMuted}`}>{formatHours(minutes)}</span>
        </td>
      );
    });

  return (
    <div className="space-y-4 pt-2">
      {/* Category Legend: one line, scrolls sideways */}
      <div className="h-5 flex items-center gap-x-4 overflow-x-auto overflow-y-hidden whitespace-nowrap [scrollbar-width:none]">
        {legendCategories.length === 0 ? (
          <span className={`font-mono text-[10px] uppercase tracking-wider ${textMuted}`}>{t.trendNoActivity}</span>
        ) : (
          legendCategories.map((cat) => {
            const active = cat.isActive !== false;
            return (
              <div
                key={cat.id}
                className={`flex items-center space-x-1.5 text-xs font-mono shrink-0 ${active ? '' : 'opacity-50'}`}
                title={active ? undefined : t.inactiveLegendTitle}
              >
                <span className="w-2.5 h-2.5 inline-block" style={swatchStyle(cat.color, active)} />
                <span className={textMuted}>{cat.code}:</span>
                <span className={active ? '' : 'line-through decoration-dotted'}>{cat.name}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-widest">
          <span className="font-semibold">
            <span className="text-emerald-400">▍</span>{tf(t.trendTitle, { unit: unitLabel })}
          </span>
          <span className="flex items-center gap-2">
            <span className={textMuted}>
              {tf(t.trendActive, { n: activeRows.length })}
              {idleCount > 0 ? tf(t.trendIdle, { n: idleCount }) : ''}
            </span>
            {canCollapse && (
              <button
                type="button"
                onClick={toggleExpanded}
                className={`flex items-center gap-1 px-1.5 py-0.5 border ${borderCol} hover:border-emerald-500/60 hover:text-emerald-400 transition-colors cursor-pointer`}
              >
                {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showAll ? tf(t.trendTop, { n: COLLAPSED_ROW_LIMIT }) : tf(t.trendAll, { n: activeRows.length })}</span>
              </button>
            )}
          </span>
        </div>

        <div
          className={`overflow-auto border ${borderCol} [scrollbar-width:thin]`}
          style={{ height: BOX_PX }}
          onMouseLeave={() => onHighlight(null)}
        >
            <table className="w-full border-collapse font-mono text-[10px] sm:text-[11px] tabular-nums">
              <thead>
                <tr className={`border-b ${rowBorder} sticky top-0 z-20`} style={{ ...stickyBg, height: ROW_PX }}>
                  <th
                    scope="col"
                    style={stickyBg}
                    className={`sticky left-0 z-10 px-2 py-1.5 text-left font-semibold ${textMuted}`}
                  >
                    {t.trendCat}
                  </th>
                  {columns.map((col, idx) => (
                    <th
                      key={col.id}
                      scope="col"
                      title={col.title}
                      onMouseEnter={() => onHighlight(idx)}
                      onClick={() => onHighlight(highlightIdx === idx ? null : idx)}
                      className={`px-1.5 py-1.5 text-right font-normal whitespace-nowrap cursor-default ${
                        highlightIdx === idx ? `${colHighlight} text-emerald-400 font-semibold` : textMuted
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ cat, cells, peak }) => (
                  <tr key={cat.id} className={`border-b ${rowBorder}`} style={{ height: ROW_PX }}>
                    <th
                      scope="row"
                      style={stickyBg}
                      title={cat.name}
                      className="sticky left-0 z-10 px-2 py-1 text-left font-normal"
                    >
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="w-2 h-2 shrink-0" style={swatchStyle(cat.color, cat.isActive !== false)} />
                        <span className={`font-semibold ${cat.isActive === false ? 'opacity-50' : ''}`}>{cat.code}</span>
                      </span>
                    </th>
                    {renderCells(cells, peak, cat.color, cat.code)}
                  </tr>
                ))}
                {Array.from({ length: blankRows }, (_, i) => (
                  <tr key={`blank-${i}`} className={`border-b ${rowBorder}`} style={{ height: ROW_PX }} aria-hidden>
                    <th scope="row" style={stickyBg} className={`sticky left-0 z-10 px-2 py-1 text-left font-normal ${textMuted} opacity-40`}>
                      —
                    </th>
                    {columns.map((col) => (
                      <td key={col.id} className={`px-1.5 py-1 text-right ${textMuted} opacity-40`}>
                        ·
                      </td>
                    ))}
                  </tr>
                ))}
                {!showAll && (
                  <tr
                    className={`border-b ${rowBorder} ${foldedRows.length > 0 ? 'cursor-pointer' : ''}`}
                    style={{ height: ROW_PX }}
                    onClick={foldedRows.length > 0 ? toggleExpanded : undefined}
                    title={
                      foldedRows.length > 0
                        ? tf(t.trendClickExpand, { codes: foldedRows.map((r) => r.cat.code).join(', ') })
                        : undefined
                    }
                  >
                    <th
                      scope="row"
                      style={stickyBg}
                      className={`sticky left-0 z-10 px-2 py-1 text-left font-normal ${textMuted}`}
                    >
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="flex w-2 h-2 shrink-0 border border-zinc-500/40">
                          {foldedRows.slice(0, 4).map((r) => (
                            <span key={r.cat.id} className="flex-1" style={{ backgroundColor: r.cat.color }} />
                          ))}
                        </span>
                        <span className="font-semibold">+{foldedRows.length}</span>
                      </span>
                    </th>
                    {renderCells(foldedCells, foldedPeak, 'rgb(113 113 122)', tf(t.trendOther, { n: foldedRows.length }))}
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20" style={stickyBg}>
                <tr className={`font-semibold border-t ${rowBorder}`} style={{ height: ROW_PX }}>
                  <th
                    scope="row"
                    style={stickyBg}
                    className="sticky left-0 z-10 px-2 py-1.5 text-left text-emerald-400"
                  >
                    {t.total}
                  </th>
                  {columns.map((col, idx) => (
                    <td
                      key={col.id}
                      onMouseEnter={() => onHighlight(idx)}
                      className={`px-1.5 py-1.5 text-right whitespace-nowrap ${
                        highlightIdx === idx ? `${colHighlight} text-emerald-400` : ''
                      }`}
                    >
                      {formatHours(col.totalMinutes)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
        </div>
      </div>
    </div>
  );
};

export default CategoryTrendTable;
