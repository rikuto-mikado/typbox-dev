/**
 * TYPBOX Status Card Renderer
 * Pure Canvas 2D drawing for the TELEMETRY STATUS CARD GENERATOR. Kept free
 * of React so every layout variant (wide / square / portrait / story) shares
 * the same building blocks and can be rendered off-screen.
 */
import type { Category, StudyLog } from './App';
import type { UserClearanceStatus } from './telemetryFeatures';
import { nowInActiveZone } from './i18n';

export type StatusCardLayout = 'wide' | 'square' | 'portrait' | 'story';

export interface StatusCardLayoutSpec {
  id: StatusCardLayout;
  label: string;
  ratio: string;
  width: number;
  height: number;
  hint: string;
}

export const STATUS_CARD_LAYOUTS: StatusCardLayoutSpec[] = [
  { id: 'wide', label: 'WIDE', ratio: '16:9', width: 1200, height: 675, hint: 'Desktop / timeline' },
  { id: 'square', label: 'SQUARE', ratio: '1:1', width: 1080, height: 1080, hint: 'Feeds & chat' },
  { id: 'portrait', label: 'PORTRAIT', ratio: '4:5', width: 1080, height: 1350, hint: 'Mobile feed' },
  { id: 'story', label: 'STORY', ratio: '9:16', width: 1080, height: 1920, hint: 'Stories / wallpaper' },
];

export interface StatusCardData {
  username: string;
  avatarColor: string;
  avatarImg: CanvasImageSource | null;
  clearance: UserClearanceStatus;
  totalHours: string;
  weeklyHours: string;
  monthlyHours: string;
  currentStreak: number;
  longestStreak: number;
  activeDaysCount: number;
  categories: Category[];
  logs: StudyLog[];
  theme: 'dark' | 'light';
  showCategories: boolean;
}

interface Palette {
  dark: boolean;
  bg: string;
  panelBg: string;
  stroke: string;
  textPrimary: string;
  textSub: string;
  track: string;
  cellEmpty: string;
  accent: string;
}

interface CategoryStat {
  code: string;
  name: string;
  color: string;
  hours: string;
  pct: number;
  min: number;
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const font = (px: number, bold = false) => `${bold ? 'bold ' : ''}${Math.round(px * 10) / 10}px ${MONO}`;

// Truncates `text` with an ellipsis so it fits within `maxWidth` using the
// context's current font.
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? `${text.slice(0, lo)}…` : '';
}

const padLv = (lv: number) => String(lv).padStart(4, '0');

function buildPalette(data: StatusCardData): Palette {
  const dark = data.theme === 'dark';
  return {
    dark,
    bg: dark ? '#09090b' : '#fafafa',
    panelBg: dark ? '#111113' : '#ffffff',
    stroke: dark ? '#27272a' : '#e4e4e7',
    textPrimary: dark ? '#f4f4f5' : '#18181b',
    textSub: '#71717a',
    track: dark ? '#27272a' : '#e4e4e7',
    cellEmpty: dark ? '#1f1f23' : '#e4e4e7',
    accent: data.clearance.current.color || data.avatarColor || '#10b981',
  };
}

function computeCategoryStats(data: StatusCardData): CategoryStat[] {
  const totalMin = Math.max(
    1,
    data.logs.reduce((acc, l) => acc + l.durationMinutes, 0)
  );
  return data.categories
    .map((cat) => {
      const min = data.logs
        .filter((l) => String(l.categoryId) === String(cat.id))
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      return {
        code: cat.code,
        name: cat.name,
        color: cat.color,
        hours: (min / 60).toFixed(1),
        pct: Math.round((min / totalMin) * 100),
        min,
      };
    })
    .sort((a, b) => b.min - a.min);
}

function buildMetrics(data: StatusCardData) {
  return [
    { label: '01 / TOTAL ARCHIVED', val: `${data.totalHours}`, unit: 'HRS' },
    { label: '02 / CURRENT STREAK', val: `${data.currentStreak}`, unit: 'DAYS' },
    { label: '03 / PEAK STREAK', val: `${data.longestStreak}`, unit: 'DAYS' },
    { label: '04 / 7D & 30D OUTPUT', val: `${data.weeklyHours}h`, unit: `/ ${data.monthlyHours}h (MO)` },
  ];
}

function cycleTag(c: UserClearanceStatus): string {
  return c.totalAscensions > 0
    ? `CYCLE ${String(c.cycleNumber).padStart(2, '0')} (✦${c.totalAscensions})`
    : `CYCLE ${String(c.cycleNumber).padStart(2, '0')}`;
}

function progressLabel(c: UserClearanceStatus): string {
  if (c.ascensionAvailable) return 'CLEARANCE PROGRESS // ASCENSION AVAILABLE';
  if (c.next) return `CLEARANCE PROGRESS // NEXT: LV.${padLv(c.next.level)} (${c.next.requiredHours}H)`;
  return 'CLEARANCE STATUS // CYCLE COMPLETE';
}

// ------------------------------------------
// Shared building blocks
// ------------------------------------------

function paintBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number, pal: Palette) {
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = pal.dark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.fillStyle = pal.accent;
  ctx.fillRect(28, 28, W - 56, 5);
}

function paintDivider(ctx: CanvasRenderingContext2D, W: number, y: number, pal: Palette) {
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, y);
  ctx.lineTo(W - 28, y);
  ctx.stroke();
}

function paintAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  data: StatusCardData
) {
  ctx.fillStyle = `${data.avatarColor}22`;
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = data.avatarColor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, size, size);

  if (data.avatarImg) {
    ctx.drawImage(data.avatarImg, x + 2, y + 2, size - 4, size - 4);
    return;
  }
  ctx.fillStyle = data.avatarColor;
  ctx.font = font(size * 0.447, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((data.username || 'U').slice(0, 2).toUpperCase(), x + size / 2, y + size / 2 + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Accent pill with the current rank; returns its width.
function paintLevelPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  maxWidth: number,
  data: StatusCardData,
  pal: Palette
): number {
  const c = data.clearance;
  ctx.font = font(14 * s, true);
  const padX = 12 * s;
  const tag = fitText(ctx, `LV.${padLv(c.current.level)} // ${c.current.title}`, maxWidth - padX * 2);
  const pillWidth = ctx.measureText(tag).width + padX * 2;
  ctx.fillStyle = pal.accent;
  ctx.fillRect(x, y, pillWidth, 28 * s);
  ctx.fillStyle = '#09090b';
  ctx.fillText(tag, x + padX, y + 19 * s);
  return pillWidth;
}

function paintProgress(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  s: number,
  data: StatusCardData,
  pal: Palette
) {
  const c = data.clearance;
  ctx.font = font(13 * s, true);
  const pctText = `${c.progressPct}%`;
  const pctWidth = ctx.measureText(pctText).width;
  ctx.textAlign = 'right';
  ctx.fillStyle = pal.accent;
  ctx.fillText(pctText, x + w, y);
  ctx.textAlign = 'left';

  ctx.fillStyle = pal.textSub;
  ctx.font = font(12 * s);
  ctx.fillText(fitText(ctx, progressLabel(c), w - pctWidth - 12 * s), x, y);

  const barH = 10 * s;
  ctx.fillStyle = pal.track;
  ctx.fillRect(x, y + 12 * s, w, barH);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(x, y + 12 * s, (w * c.progressPct) / 100, barH);

  const pipGap = 4 * s;
  const pipW = (w - pipGap * 4) / 5;
  for (let p = 0; p < 5; p++) {
    ctx.fillStyle = p < c.subPhase ? '#10b981' : pal.track;
    ctx.fillRect(x + p * (pipW + pipGap), y + 28 * s, pipW, 4 * s);
  }
}

function paintMetricCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  m: { label: string; val: string; unit: string },
  pal: Palette
) {
  ctx.fillStyle = pal.panelBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  const inset = 18 * s;
  ctx.fillStyle = pal.textSub;
  ctx.font = font(11 * s);
  ctx.fillText(fitText(ctx, m.label, w - inset * 2), x + inset, y + 28 * s);

  // Shrink the big value (never below ~55%) so value + unit always fit.
  const unitGap = 6 * s;
  ctx.font = font(13 * s, true);
  const unitWidth = ctx.measureText(m.unit).width;
  let valPx = 38 * s;
  ctx.font = font(valPx, true);
  const avail = w - inset * 2 - unitGap - unitWidth;
  const valWidthAtFull = ctx.measureText(m.val).width;
  if (valWidthAtFull > avail) {
    valPx = Math.max(21 * s, (valPx * avail) / valWidthAtFull);
    ctx.font = font(valPx, true);
  }
  const baseline = y + h - 36 * s;
  ctx.fillStyle = pal.textPrimary;
  ctx.fillText(m.val, x + inset, baseline);

  const valWidth = ctx.measureText(m.val).width;
  ctx.fillStyle = pal.accent;
  ctx.font = font(13 * s, true);
  ctx.fillText(fitText(ctx, m.unit, w - inset * 2 - valWidth - unitGap), x + inset + unitGap + valWidth, baseline);
}

// Cadence window. Mirrors the live dashboard's adaptive window: the grid
// starts at the Monday of the user's FIRST logged week (not a fixed lookback
// ending today), so a newer account's cadence visibly fills in from the
// top-left instead of being squeezed into the right-hand columns of an
// otherwise-empty fixed-size grid.
function cadenceWindow(logs: StudyLog[]): { currentMon: Date; weeksOfHistory: number } {
  const now = nowInActiveZone();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const currentMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

  let originMon = new Date(currentMon);
  if (logs.length > 0) {
    const oldestStr = logs.reduce((acc, l) => (l.date < acc ? l.date : acc), logs[0].date);
    const oldestDate = new Date(`${oldestStr}T00:00:00`);
    if (!isNaN(oldestDate.getTime())) {
      const oldestDow = (oldestDate.getDay() + 6) % 7;
      originMon = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), oldestDate.getDate() - oldestDow);
    }
  }
  const weeksOfHistory =
    Math.round((currentMon.getTime() - originMon.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return { currentMon, weeksOfHistory: Math.max(1, weeksOfHistory) };
}

// Weeks run left→right; on tall cards the timeline wraps into `bands`
// stacked 7-row strips (oldest strip on top) to show more history.
function paintCadenceMatrix(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  grid: { cellSize: number; maxCols: number; bands?: number },
  data: StatusCardData,
  pal: Palette
) {
  ctx.fillStyle = pal.panelBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  const inset = 20 * s;
  ctx.fillStyle = pal.textSub;
  ctx.font = font(12 * s, true);
  ctx.fillText(
    fitText(ctx, `TELEMETRY CADENCE MATRIX // ${data.activeDaysCount} ACTIVE DAYS LOGGED`, w - inset * 2),
    x + inset,
    y + 28 * s
  );

  const { logs } = data;
  const activeDateSet = new Set(logs.filter((l) => l.durationMinutes > 0).map((l) => l.date));
  const { cellSize } = grid;
  const bands = Math.max(1, grid.bands ?? 1);
  const cellGap = Math.max(3, cellSize / 4);
  const bandGap = cellSize;
  const bandH = 7 * (cellSize + cellGap) - cellGap;
  const gridStartX = x + inset;
  const gridStartY = y + 50 * s;

  const { currentMon, weeksOfHistory } = cadenceWindow(logs);
  const fitCols = Math.floor((w - inset * 2 + cellGap) / (cellSize + cellGap));
  const cols = Math.max(1, Math.min(grid.maxCols, fitCols));
  const totalWeeks = Math.min(cols * bands, weeksOfHistory);

  for (let k = 0; k < totalWeeks; k++) {
    const weekOffset = totalWeeks - 1 - k;
    const band = Math.floor(k / cols);
    const col = k % cols;
    for (let r = 0; r < 7; r++) {
      const cellDate = new Date(currentMon);
      cellDate.setDate(currentMon.getDate() - weekOffset * 7 + r);
      const yyyy = cellDate.getFullYear();
      const mm = String(cellDate.getMonth() + 1).padStart(2, '0');
      const dd = String(cellDate.getDate()).padStart(2, '0');
      const dStr = `${yyyy}-${mm}-${dd}`;

      ctx.fillStyle = activeDateSet.has(dStr) ? '#10b981' : pal.cellEmpty;
      ctx.fillRect(
        gridStartX + col * (cellSize + cellGap),
        gridStartY + band * (bandH + bandGap) + r * (cellSize + cellGap),
        cellSize,
        cellSize
      );
    }
  }
}

function paintCategoryPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: number,
  maxRows: number,
  stats: CategoryStat[],
  pal: Palette,
  rowH = 40 * s
) {
  ctx.fillStyle = pal.panelBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = pal.stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  const inset = 20 * s;
  ctx.fillStyle = pal.textSub;
  ctx.font = font(12 * s, true);
  ctx.fillText('TOP CATEGORY ALLOCATION', x + inset, y + 28 * s);

  const rows = stats.slice(0, maxRows);
  if (rows.length === 0) {
    ctx.font = font(12 * s);
    ctx.fillText('No category telemetry recorded yet.', x + inset, y + 70 * s);
    return;
  }

  rows.forEach((cs, idx) => {
    const rowY = y + 58 * s + idx * rowH;
    ctx.fillStyle = cs.color;
    ctx.fillRect(x + inset, rowY - 10 * s, 8 * s, 8 * s);

    ctx.font = font(12 * s);
    const right = `${cs.hours}h (${cs.pct}%)`;
    const rightWidth = ctx.measureText(right).width;
    ctx.textAlign = 'right';
    ctx.fillStyle = pal.textSub;
    ctx.fillText(right, x + w - inset, rowY - 2 * s);
    ctx.textAlign = 'left';

    ctx.fillStyle = pal.textPrimary;
    ctx.font = font(12 * s, true);
    const labelX = x + inset + 16 * s;
    ctx.fillText(fitText(ctx, `[${cs.code}] ${cs.name}`, x + w - inset - rightWidth - 12 * s - labelX), labelX, rowY - 2 * s);

    const barW = w - inset * 2;
    ctx.fillStyle = pal.track;
    ctx.fillRect(x + inset, rowY + 6 * s, barW, 6 * s);
    ctx.fillStyle = cs.color;
    ctx.fillRect(x + inset, rowY + 6 * s, Math.max(4, (barW * cs.pct) / 100), 6 * s);
  });
}

// Title row + `rows` rows (the last one only needs its bar + padding).
function categoryPanelHeight(s: number, rows: number, rowH = 40 * s): number {
  return 58 * s + (Math.max(1, rows) - 1) * rowH + 40 * s;
}

function paintFooter(ctx: CanvasRenderingContext2D, W: number, H: number, s: number, data: StatusCardData, pal: Palette) {
  const c = data.clearance;
  ctx.fillStyle = pal.textSub;
  ctx.font = font(11 * s);
  const brand = 'typbox.me';
  const brandWidth = ctx.measureText(brand).width;
  ctx.fillText(
    fitText(ctx, `VERIFIED TELEMETRY // CLEARANCE LV.${padLv(c.current.level)} (${c.current.title})`, W - 120 - brandWidth - 24),
    60,
    H - 42
  );
  ctx.textAlign = 'right';
  ctx.fillText(brand, W - 60, H - 42);
  ctx.textAlign = 'left';
}

const snapshotDate = () => {
  const d = nowInActiveZone();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// ------------------------------------------
// Layout: WIDE 16:9 (original desktop card)
// ------------------------------------------

function drawWide(ctx: CanvasRenderingContext2D, W: number, H: number, data: StatusCardData, pal: Palette) {
  const c = data.clearance;

  ctx.fillStyle = pal.textPrimary;
  ctx.font = font(22, true);
  ctx.fillText('TYPBOX.ME', 60, 78);

  ctx.fillStyle = pal.textSub;
  ctx.font = font(13);
  ctx.fillText('// QUANTIFIED STUDY & TELEMETRY ARCHIVE', 200, 78);
  ctx.textAlign = 'right';
  ctx.fillText(`SNAPSHOT // ${snapshotDate()}`, W - 60, 78);
  ctx.textAlign = 'left';

  paintDivider(ctx, W, 102, pal);
  paintAvatar(ctx, 60, 130, 76, data);

  const progX = 760;
  ctx.fillStyle = pal.textPrimary;
  ctx.font = font(32, true);
  ctx.fillText(fitText(ctx, data.username || 'OPERATOR', progX - 20 - 156), 156, 162);

  const pillWidth = paintLevelPill(ctx, 156, 176, 1, progX - 20 - 156, data, pal);

  ctx.fillStyle = pal.textSub;
  ctx.font = font(13);
  const tagX = 156 + pillWidth + 16;
  ctx.fillText(
    fitText(ctx, `${cycleTag(c)}  •  DIVISION: ${c.current.division}  •  PHASE ${c.subPhase}/5`, W - 60 - tagX),
    tagX,
    195
  );

  paintProgress(ctx, progX, 142, W - 60 - progX, 1, data, pal);

  const metricY = 232;
  const metricH = 118;
  const metricW = (W - 120 - 36) / 4;
  buildMetrics(data).forEach((m, idx) => {
    paintMetricCard(ctx, 60 + idx * (metricW + 12), metricY, metricW, metricH, 1, m, pal);
  });

  const bottomY = 374;
  const bottomH = 228;
  const matrixBoxW = data.showCategories ? 660 : W - 120;
  paintCadenceMatrix(
    ctx,
    60,
    bottomY,
    matrixBoxW,
    bottomH,
    1,
    { cellSize: 16, maxCols: data.showCategories ? 28 : 48 },
    data,
    pal
  );

  if (data.showCategories) {
    const catBoxX = 60 + matrixBoxW + 16;
    paintCategoryPanel(ctx, catBoxX, bottomY, W - 60 - catBoxX, bottomH, 1, 4, computeCategoryStats(data), pal);
  }

  paintFooter(ctx, W, H, 1, data, pal);
}

// ------------------------------------------
// Layouts: SQUARE 1:1 / PORTRAIT 4:5 / STORY 9:16 (stacked, phone-first)
// ------------------------------------------

const STACKED_SCALE: Record<Exclude<StatusCardLayout, 'wide'>, number> = {
  square: 1.05,
  portrait: 1.15,
  story: 1.3,
};

function drawStacked(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layout: Exclude<StatusCardLayout, 'wide'>,
  data: StatusCardData,
  pal: Palette
) {
  const s = STACKED_SCALE[layout];
  const c = data.clearance;
  const left = 60;
  const innerW = W - 120;

  // Header: brand + date on one line, tagline below (too narrow for both).
  const headerY = 28 + 52 * s;
  ctx.fillStyle = pal.textPrimary;
  ctx.font = font(22 * s, true);
  ctx.fillText('TYPBOX.ME', left, headerY);
  ctx.fillStyle = pal.textSub;
  ctx.font = font(13 * s);
  ctx.textAlign = 'right';
  ctx.fillText(`SNAPSHOT // ${snapshotDate()}`, W - 60, headerY);
  ctx.textAlign = 'left';
  ctx.font = font(12 * s);
  ctx.fillText('// QUANTIFIED STUDY & TELEMETRY ARCHIVE', left, headerY + 26 * s);
  const dividerY = headerY + 48 * s;
  paintDivider(ctx, W, dividerY, pal);

  // Identity block
  const profileTop = dividerY + 32 * s;
  const avatarSize = 104 * s;
  paintAvatar(ctx, left, profileTop, avatarSize, data);
  const idX = left + avatarSize + 24 * s;
  const idW = W - 60 - idX;
  ctx.fillStyle = pal.textPrimary;
  ctx.font = font(34 * s, true);
  ctx.fillText(fitText(ctx, data.username || 'OPERATOR', idW), idX, profileTop + 34 * s);
  paintLevelPill(ctx, idX, profileTop + 50 * s, s, idW, data, pal);
  ctx.fillStyle = pal.textSub;
  ctx.font = font(12.5 * s);
  ctx.fillText(
    fitText(ctx, `${cycleTag(c)}  •  ${c.current.division}  •  PHASE ${c.subPhase}/5`, idW),
    idX,
    profileTop + 102 * s
  );
  let cursor = profileTop + Math.max(avatarSize, 102 * s) + 40 * s;

  // Clearance progress
  paintProgress(ctx, left, cursor, innerW, s, data, pal);
  cursor += 32 * s + 34 * s;

  // Metrics: 2 × 2 grid
  const gap = 12 * s;
  const metricW = (innerW - gap) / 2;
  const metricH = (layout === 'story' ? 150 : 118) * s;
  buildMetrics(data).forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    paintMetricCard(ctx, left + col * (metricW + gap), cursor + row * (metricH + gap), metricW, metricH, s, m, pal);
  });
  cursor += metricH * 2 + gap + 20 * s;

  // Remaining space (above the footer) goes to the cadence matrix and,
  // optionally, the category breakdown. Cells and category rows grow to use
  // the free height; whatever is still left becomes even spacing.
  const bottomLimit = H - 76;
  const avail = bottomLimit - cursor;
  const stats = data.showCategories ? computeCategoryStats(data) : [];
  const matrixInset = 20 * s;
  const matrixChrome = 50 * s + 20 * s; // title row + bottom padding
  const matrixHeightFor = (cell: number) => matrixChrome + cell * 1.25 * 7 - cell * 0.25;
  const colsFor = (w: number, cell: number) => Math.floor((w - matrixInset * 2 + cell * 0.25) / (cell * 1.25));

  if (data.showCategories && layout === 'square') {
    const matrixW = Math.round(innerW * 0.56);
    const catX = left + matrixW + 16;
    const cellSize = Math.max(10, Math.min(26 * s, (avail - matrixChrome) / 7 / 1.25));
    paintCadenceMatrix(ctx, left, cursor, matrixW, avail, s, { cellSize, maxCols: colsFor(matrixW, cellSize) }, data, pal);
    const rows = Math.min(4, Math.max(1, stats.length));
    const rowH = Math.min(54 * s, (avail - 58 * s - 40 * s) / Math.max(1, rows - 1));
    paintCategoryPanel(ctx, catX, cursor, W - 60 - catX, avail, s, rows, stats, pal, rows > 1 ? rowH : 40 * s);
    paintFooter(ctx, W, H, s, data, pal);
    return;
  }

  const catRows = data.showCategories ? Math.min(layout === 'story' ? 6 : 4, Math.max(1, stats.length)) : 0;
  const catMinH = catRows > 0 ? categoryPanelHeight(s, catRows) : 0;
  const sectionGap = catRows > 0 ? gap : 0;
  const cellCap = (layout === 'story' ? 30 : 22) * s;
  const matrixAvail = avail - catMinH - sectionGap;
  const cellSize = Math.max(10, Math.min(cellCap, (matrixAvail - matrixChrome) / 7 / 1.25));
  const matrixCols = colsFor(innerW, cellSize);
  const bandH = matrixHeightFor(cellSize) - matrixChrome;
  const bandsFit = Math.max(1, Math.floor((matrixAvail - matrixChrome + cellSize) / (bandH + cellSize)));
  const bands = Math.min(bandsFit, Math.ceil(cadenceWindow(data.logs).weeksOfHistory / matrixCols));
  const matrixH = matrixChrome + bands * bandH + (bands - 1) * cellSize;

  let slack = avail - matrixH - sectionGap - catMinH;
  let catRowH = 40 * s;
  if (catRows > 1 && slack > 0) {
    catRowH = Math.min(56 * s, 40 * s + slack / (catRows - 1));
  }
  const catH = catRows > 0 ? categoryPanelHeight(s, catRows, catRowH) : 0;
  slack = Math.max(0, avail - matrixH - sectionGap - catH);
  const spacer = slack / (catRows > 0 ? 3 : 2);

  const matrixY = cursor + spacer;
  paintCadenceMatrix(ctx, left, matrixY, innerW, matrixH, s, { cellSize, maxCols: matrixCols, bands }, data, pal);
  if (catRows > 0) {
    paintCategoryPanel(ctx, left, matrixY + matrixH + sectionGap + spacer, innerW, catH, s, catRows, stats, pal, catRowH);
  }

  paintFooter(ctx, W, H, s, data, pal);
}

export function drawStatusCard(
  canvas: { width: number; height: number; getContext(id: '2d'): CanvasRenderingContext2D | null },
  layout: StatusCardLayout,
  data: StatusCardData
) {
  const spec = STATUS_CARD_LAYOUTS.find((l) => l.id === layout) ?? STATUS_CARD_LAYOUTS[0];
  const W = spec.width;
  const H = spec.height;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pal = buildPalette(data);
  paintBackdrop(ctx, W, H, pal);
  if (spec.id === 'wide') drawWide(ctx, W, H, data, pal);
  else drawStacked(ctx, W, H, spec.id, data, pal);
}
