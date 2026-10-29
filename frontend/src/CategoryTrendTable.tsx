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

// Collapsed view shows this many top categories; the remainder is folded
// into a single OTHER row so column totals still add up.
const COLLAPSED_ROW_LIMIT = 5;
const EXPANDED_STORAGE_KEY = 'typbox_trend_expanded';
// The legend lists every category, which with a dozen-plus of them ran to
// six-odd lines and stretched the whole analytics panel (and, through the
// column alignment, the lunar calendar beside it). Collapsed it keeps the
// first few (about two lines); the rest fold behind a SHOW MORE row.
const COLLAPSED_LEGEND_LIMIT = 4;
const LEGEND_EXPANDED_STORAGE_KEY = 'typbox_trend_legend_expanded';

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
  const [legendExpanded, setLegendExpanded] = useState<boolean>(() => readFlag(LEGEND_EXPANDED_STORAGE_KEY));

  const toggleExpanded = () => {
    setExpanded((prev) => {
      writeFlag(EXPANDED_STORAGE_KEY, !prev);
      return !prev;
    });
  };

  const toggleLegendExpanded = () => {
    setLegendExpanded((prev) => {
      writeFlag(LEGEND_EXPANDED_STORAGE_KEY, !prev);
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

  const canCollapse = activeRows.length > COLLAPSED_ROW_LIMIT + 1;
  const visibleRows = canCollapse && !expanded ? activeRows.slice(0, COLLAPSED_ROW_LIMIT) : activeRows;
  const foldedRows = canCollapse && !expanded ? activeRows.slice(COLLAPSED_ROW_LIMIT) : [];
  const foldedCells = columns.map((_, idx) => foldedRows.reduce((acc, row) => acc + row.cells[idx], 0));
  const foldedPeak = Math.max(0, ...foldedCells);
  const idleCount = categories.length - activeRows.length;

  // Legend order: the categories drawn in this window's bars (busiest first,
  // same as the table) lead, so the collapsed legend still decodes the chart;
  // idle ones keep their registry order after them.
  const legendCategories = useMemo(() => {
    const activeIds = new Set(activeRows.map((row) => String(row.cat.id)));
    return [...activeRows.map((row) => row.cat), ...categories.filter((cat) => !activeIds.has(String(cat.id)))];
  }, [activeRows, categories]);
  const canCollapseLegend = legendCategories.length > COLLAPSED_LEGEND_LIMIT + 1;
  const visibleLegend =
    canCollapseLegend && !legendExpanded ? legendCategories.slice(0, COLLAPSED_LEGEND_LIMIT) : legendCategories;
  const hiddenLegend = canCollapseLegend && !legendExpanded ? legendCategories.slice(COLLAPSED_LEGEND_LIMIT) : [];

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
      {/* Category Legend */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {visibleLegend.map((cat) => {
            const active = cat.isActive !== false;
            return (
              <div
                key={cat.id}
                className={`flex items-center space-x-1.5 text-xs font-mono ${active ? '' : 'opacity-50'}`}
                title={active ? undefined : t.inactiveLegendTitle}
              >
                <span className="w-2.5 h-2.5 inline-block" style={swatchStyle(cat.color, active)} />
                <span className={textMuted}>{cat.code}:</span>
                <span className={active ? '' : 'line-through decoration-dotted'}>{cat.name}</span>
              </div>
            );
          })}
        </div>

        {canCollapseLegend && (
          <button
            type="button"
            onClick={toggleLegendExpanded}
            aria-expanded={legendExpanded}
            className={`w-full min-h-[38px] lg:min-h-0 flex items-center justify-between gap-3 px-2.5 py-1.5 border ${borderCol} font-mono text-[10px] uppercase tracking-wider ${textMuted} hover:text-emerald-400 hover:border-emerald-500/50 transition-colors cursor-pointer`}
          >
            <span className="flex items-center gap-1.5 shrink-0">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${legendExpanded ? 'rotate-180' : ''}`} />
              {legendExpanded ? t.showLessCategories : tf(t.showMoreCategories, { n: hiddenLegend.length })}
            </span>
            {legendExpanded ? (
              <span className="tabular-nums">
                {legendCategories.length} / {legendCategories.length}
              </span>
            ) : (
              <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                {hiddenLegend.map((cat) => (
                  <span
                    key={cat.id}
                    className="w-2 h-2 shrink-0"
                    style={swatchStyle(cat.color, cat.isActive !== false)}
                    title={`[${cat.code}] ${cat.name}`}
                  />
                ))}
              </span>
            )}
          </button>
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
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{expanded ? tf(t.trendTop, { n: COLLAPSED_ROW_LIMIT }) : tf(t.trendAll, { n: activeRows.length })}</span>
              </button>
            )}
          </span>
        </div>

        {activeRows.length === 0 ? (
          <div className={`border border-dashed ${borderCol} px-3 py-4 text-center font-mono text-[10px] uppercase tracking-widest ${textMuted}`}>
            {t.trendNoActivity}
          </div>
        ) : (
          <div className={`overflow-x-auto border ${borderCol}`} onMouseLeave={() => onHighlight(null)}>
            <table className="w-full border-collapse font-mono text-[10px] sm:text-[11px] tabular-nums">
              <thead>
                <tr className={`border-b ${rowBorder}`}>
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
                  <tr key={cat.id} className={`border-b ${rowBorder}`}>
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
                {foldedRows.length > 0 && (
                  <tr
                    className={`border-b ${rowBorder} cursor-pointer`}
                    onClick={toggleExpanded}
                    title={tf(t.trendClickExpand, { codes: foldedRows.map((r) => r.cat.code).join(', ') })}
                  >
                    <th
                      scope="row"
                      style={stickyBg}
                      className={`sticky left-0 z-10 px-2 py-1 text-left font-normal ${textMuted}`}
                    >
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="flex w-2 h-2 shrink-0">
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
              <tfoot>
                <tr className="font-semibold">
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
        )}
      </div>
    </div>
  );
};

export default CategoryTrendTable;
