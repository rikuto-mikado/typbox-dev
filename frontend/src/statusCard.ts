/**
 * TYPBOX Status Card Renderer
 * Pure Canvas 2D drawing for the STATUS CARD GENERATOR: one 1080×1080 card
 * painted over the user's active Surface Theme (same palette, corner wash
 * and PRESTIGE art as the dashboard). Kept free of React so it can render
 * off-screen.
 */
import type { Category, StudyLog } from './App';
import type { SurfaceThemePair, UserClearanceStatus } from './telemetryFeatures';
import { nowInActiveZone } from './i18n';
import { getActiveWeekStart, weekdayPosition } from './week';
import { ensureReadable } from './surfaceColor';

export const STATUS_CARD_SIZE = 1080;

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
  categories: Category[];
  logs: StudyLog[];
  surface: SurfaceThemePair;
  isDark: boolean;
  /** Decoded PRESTIGE backdrop for `surface`, if it has one. */
  surfaceArt: CanvasImageSource | null;
  showCategories: boolean;
  /** The open MY ROOM room, already drawn (renderRoom at 1 px per art
   *  pixel), or null to leave the room off the card. */
  room: { image: CanvasImageSource; name: string; pieces: number; value: number } | null;
}

interface Palette {
  dark: boolean;
  bgMain: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  /** Accent nudged until it reads as text on the panels. */
  accentText: string;
  track: string;
}

interface CategoryStat {
  code: string;
  name: string;
  color: string;
  min: number;
  pct: number;
}

const SANS = '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
const sans = (px: number, weight = 400) => `${weight} ${px}px ${SANS}`;
const mono = (px: number, weight = 400) => `${weight} ${px}px ${MONO}`;

const PAD = 72;

// ------------------------------------------
// Color helpers
// ------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number];
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
};

function mix(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0'));
  return `#${out.join('')}`;
}

function buildPalette(data: StatusCardData): Palette {
  const pal = data.isDark ? data.surface.dark : data.surface.light;
  const accent = data.surface.accentHex;
  return {
    dark: data.isDark,
    bgMain: pal.bgMain,
    panel: pal.bgCard,
    border: pal.border,
    text: pal.textMain,
    muted: pal.textMuted,
    accent,
    accentText: ensureReadable(accent, [pal.bgCard, pal.bgMain], 3),
    track: mix(pal.bgCard, pal.textMain, data.isDark ? 0.1 : 0.08),
  };
}

// ------------------------------------------
// Drawing primitives
// ------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// letterSpacing is not in every canvas implementation yet; tracking is a
// nicety, so it silently falls back to none.
function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

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

// Small uppercase caption used for every section / metric label.
function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, maxW = 1e4) {
  ctx.font = mono(15, 500);
  setTracking(ctx, 2.4);
  ctx.fillStyle = color;
  ctx.fillText(fitText(ctx, text.toUpperCase(), maxW), x, y);
  setTracking(ctx, 0);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pal: Palette) {
  roundRect(ctx, x, y, w, h, 22);
  ctx.fillStyle = rgba(pal.panel, 0.94);
  ctx.fill();
  ctx.strokeStyle = rgba(pal.border, 0.9);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ------------------------------------------
// Backdrop: the active Surface Theme
// ------------------------------------------

function paintBackdrop(ctx: CanvasRenderingContext2D, S: number, data: StatusCardData, pal: Palette) {
  ctx.fillStyle = pal.bgMain;
  ctx.fillRect(0, 0, S, S);

  if (data.surfaceArt) {
    // `cover`, anchored top-center like the dashboard.
    const img = data.surfaceArt as HTMLImageElement;
    const iw = img.naturalWidth || img.width || S;
    const ih = img.naturalHeight || img.height || S;
    const scale = Math.max(S / iw, S / ih);
    ctx.drawImage(img, (S - iw * scale) / 2, 0, iw * scale, ih * scale);
    return;
  }

  // Mirrors getSurfaceBackgroundStyle(): accent corner washes in dark mode
  // plus a soft glow from the top edge.
  const radial = (cx: number, cy: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, color);
    g.addColorStop(1, rgba(pal.bgMain, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  };
  const wash = { classic: [0.34, 0.14], chroma: [0.16, 0.06], complement: [0.26, 0.1], prestige: [0, 0] }[
    data.surface.series
  ];
  if (pal.dark) {
    radial(S, 0, S * 1.1, mix(pal.bgMain, pal.accent, wash[0]));
    radial(0, 0, S * 1.1, mix(pal.bgMain, pal.accent, wash[1]));
  }
  const glow = (data.isDark ? data.surface.dark : data.surface.light).glowTint;
  const g = ctx.createRadialGradient(S / 2, 0, 0, S / 2, 0, S * 0.85);
  g.addColorStop(0, glow);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
}

// ------------------------------------------
// Sections
// ------------------------------------------

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const shortDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

function snapshotDate(): string {
  return shortDate(nowInActiveZone());
}

function paintHeader(ctx: CanvasRenderingContext2D, S: number, pal: Palette) {
  const y = PAD + 22;
  // Brand mark: accent square + wordmark.
  roundRect(ctx, PAD, y - 20, 24, 24, 6);
  ctx.fillStyle = pal.accent;
  ctx.fill();
  ctx.font = sans(24, 700);
  setTracking(ctx, 3);
  ctx.fillStyle = pal.text;
  ctx.fillText('TYPBOX', PAD + 38, y);
  setTracking(ctx, 0);

  ctx.textAlign = 'right';
  caption(ctx, `Study Report · ${snapshotDate()}`, S - PAD, y - 2, pal.muted);
  ctx.textAlign = 'left';
}

function paintAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, data: StatusCardData, pal: Palette) {
  ctx.save();
  roundRect(ctx, x, y, size, size, size * 0.24);
  ctx.clip();
  ctx.fillStyle = mix(pal.panel, data.avatarColor, 0.22);
  ctx.fillRect(x, y, size, size);
  if (data.avatarImg) {
    ctx.drawImage(data.avatarImg, x, y, size, size);
  } else {
    ctx.fillStyle = data.avatarColor;
    ctx.font = sans(size * 0.4, 700);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((data.username || 'U').slice(0, 2).toUpperCase(), x + size / 2, y + size / 2 + 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  roundRect(ctx, x, y, size, size, size * 0.24);
  ctx.strokeStyle = rgba(data.avatarColor, 0.9);
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Identity row with the lifetime total on the right; returns the bottom edge.
function paintIdentity(ctx: CanvasRenderingContext2D, S: number, top: number, data: StatusCardData, pal: Palette): number {
  const c = data.clearance;
  const size = 104;
  paintAvatar(ctx, PAD, top, size, data, pal);

  // Total focus time, right-aligned: measured first so the name fits beside it.
  ctx.font = sans(92, 700);
  setTracking(ctx, -3);
  const total = fitText(ctx, data.totalHours, 360);
  const totalW = ctx.measureText(total).width;
  setTracking(ctx, 0);
  ctx.font = sans(30, 600);
  const hrsW = ctx.measureText('hrs').width;
  const heroW = totalW + 10 + hrsW;
  const right = S - PAD;
  ctx.textAlign = 'right';
  caption(ctx, 'Total focus time', right, top + 18, pal.muted);
  ctx.fillStyle = pal.accentText;
  ctx.font = sans(30, 600);
  ctx.fillText('hrs', right, top + 100);
  ctx.font = sans(92, 700);
  setTracking(ctx, -3);
  ctx.fillStyle = pal.text;
  ctx.fillText(total, right - hrsW - 10, top + 100);
  setTracking(ctx, 0);
  ctx.textAlign = 'left';

  const x = PAD + size + 28;
  const w = right - heroW - 32 - x;
  ctx.fillStyle = pal.text;
  ctx.font = sans(46, 700);
  ctx.fillText(fitText(ctx, data.username || 'Operator', w), x, top + 50);

  // Rank chip and title
  const chip = `LV.${String(c.current.level).padStart(4, '0')}`;
  ctx.font = mono(16, 700);
  setTracking(ctx, 1.5);
  const chipW = ctx.measureText(chip).width + 26;
  roundRect(ctx, x, top + 68, chipW, 32, 16);
  ctx.fillStyle = rgba(pal.accent, pal.dark ? 0.18 : 0.14);
  ctx.fill();
  ctx.strokeStyle = rgba(pal.accent, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = pal.accentText;
  ctx.fillText(chip, x + 13, top + 90);
  setTracking(ctx, 0);
  ctx.font = sans(19, 500);
  ctx.fillStyle = pal.muted;
  const cycle = c.totalAscensions > 0 ? ` · Cycle ${c.cycleNumber} ✦${c.totalAscensions}` : '';
  ctx.fillText(fitText(ctx, `${c.current.title}${cycle}`, w - chipW - 14), x + chipW + 14, top + 91);
  return top + size;
}

// Five cells: the clearance ring, then week, month, streak, best streak.
// Returns the bottom edge.
function paintMetrics(ctx: CanvasRenderingContext2D, S: number, top: number, data: StatusCardData, pal: Palette): number {
  const c = data.clearance;
  const h = 128;
  const w = S - PAD * 2;
  panel(ctx, PAD, top, w, h, pal);
  const ringW = 268;
  const colW = (w - ringW) / 4;

  // Clearance ring cell
  const ringR = 36;
  const rcx = PAD + 30 + ringR;
  const rcy = top + h / 2;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = pal.track;
  ctx.beginPath();
  ctx.arc(rcx, rcy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  const pct = Math.floor(Math.max(0, Math.min(100, c.progressPct)));
  if (pct > 0) {
    ctx.strokeStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(rcx, rcy, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.textAlign = 'center';
  ctx.font = sans(22, 700);
  ctx.fillStyle = pal.text;
  ctx.fillText(`${pct}%`, rcx, rcy + 8);
  ctx.textAlign = 'left';
  const tx = rcx + ringR + 20;
  const tw = ringW - (tx - PAD) - 12;
  caption(ctx, 'Clearance', tx, top + 54, pal.muted, tw);
  ctx.font = sans(22, 700);
  ctx.fillStyle = pal.accentText;
  const sub = c.ascensionAvailable ? 'Ascend' : c.next ? `To LV.${c.next.level}` : 'Complete';
  ctx.fillText(fitText(ctx, sub, tw), tx, top + 86);

  const metrics = [
    { label: 'This week', val: data.weeklyHours, unit: 'h' },
    { label: 'This month', val: data.monthlyHours, unit: 'h' },
    { label: 'Streak', val: String(data.currentStreak), unit: 'd' },
    { label: 'Best streak', val: String(data.longestStreak), unit: 'd' },
  ];
  metrics.forEach((m, i) => {
    const x = PAD + ringW + i * colW;
    ctx.strokeStyle = rgba(pal.border, 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top + 28);
    ctx.lineTo(x, top + h - 28);
    ctx.stroke();
    const ix = x + 26;
    caption(ctx, m.label, ix, top + 50, pal.muted, colW - 40);
    ctx.font = sans(46, 700);
    setTracking(ctx, -1.5);
    ctx.fillStyle = pal.text;
    const val = fitText(ctx, m.val, colW - 70);
    ctx.fillText(val, ix, top + 102);
    const vw = ctx.measureText(val).width;
    setTracking(ctx, 0);
    ctx.font = sans(22, 600);
    ctx.fillStyle = pal.muted;
    ctx.fillText(m.unit, ix + vw + 5, top + 102);
  });
  return top + h;
}

// MY ROOM: the open room with crisp pixels, its name in a small label
// above and its piece count / shop value below.
function paintRoom(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, data: StatusCardData, pal: Palette) {
  const room = data.room;
  if (!room) return;
  panel(ctx, x, y, w, h, pal);
  const ix = x + 24;
  const innerW = w - 48;
  caption(ctx, 'My room', ix, y + 44, pal.muted);
  ctx.font = mono(15, 700);
  setTracking(ctx, 1.5);
  ctx.fillStyle = pal.accentText;
  ctx.textAlign = 'right';
  ctx.fillText(fitText(ctx, room.name.toUpperCase(), innerW - 120), x + w - 24, y + 44);
  ctx.textAlign = 'left';
  setTracking(ctx, 0);

  // 4:3 picture, as large as fits between the label and the footer line;
  // picture and footer line together sit centred in the space below the label.
  const availH = h - 64 - 52;
  const picW = Math.min(innerW, Math.round((availH * 4) / 3));
  const picH = Math.round((picW * 3) / 4);
  const px = x + (w - picW) / 2;
  const py = y + 64 + Math.max(0, Math.floor((availH - picH) / 2));
  ctx.save();
  roundRect(ctx, px, py, picW, picH, 10);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(room.image, px, py, picW, picH);
  ctx.restore();
  roundRect(ctx, px, py, picW, picH, 10);
  ctx.strokeStyle = rgba(pal.border, 0.9);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = mono(15, 500);
  setTracking(ctx, 1.4);
  ctx.fillStyle = pal.muted;
  ctx.fillText(`${room.pieces} PIECES`, px, py + picH + 34);
  ctx.textAlign = 'right';
  ctx.fillStyle = pal.text;
  ctx.fillText(`${room.value.toLocaleString('en-US')} BITS`, px + picW, py + picH + 34);
  ctx.textAlign = 'left';
  setTracking(ctx, 0);
}

function minutesByDate(logs: StudyLog[]): Map<string, number> {
  const out = new Map<string, number>();
  logs.forEach((l) => {
    if (l.durationMinutes > 0) out.set(l.date, (out.get(l.date) ?? 0) + l.durationMinutes);
  });
  return out;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Activity heatmap: the most recent weeks (as many as fit), oldest on the
// left and this week in the last column. Days not yet reached are drawn as
// faint placeholders; cell intensity follows minutes logged that day.
function paintActivity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: StatusCardData,
  pal: Palette
) {
  panel(ctx, x, y, w, h, pal);
  const ix = x + 32;
  const innerW = w - 64;
  const gap = 5;
  // Cells are capped so a tall panel doesn't blow them up. When that
  // leaves room, a row of window totals sits at the bottom; the grid is
  // centred in what is left under the caption.
  const availH = h - 76 - 28;
  const cell = Math.min(36, Math.floor((availH - gap * 6) / 7));
  const gridH = cell * 7 + gap * 6;
  const STATS_H = 78;
  const withStats = availH - gridH >= STATS_H + 24;
  const gridSpace = withStats ? availH - STATS_H : availH;
  const gridTop = y + 76 + Math.max(0, Math.floor((gridSpace - gridH) / 2));
  const weeks = Math.max(1, Math.floor((innerW + gap) / (cell + gap)));
  // Grid centred across the panel (whole cells only, so a sliver is left).
  const gx = ix + Math.floor((innerW - (weeks * (cell + gap) - gap)) / 2);

  const perDay = minutesByDate(data.logs);
  const now = nowInActiveZone();
  const weekStart = getActiveWeekStart();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = (d: Date) => {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    out.setDate(out.getDate() - weekdayPosition(out.getDay(), weekStart));
    return out;
  };
  const currentWeek = startOfWeek(today);
  // The last `weeks` weeks, ending with this one: the newest column is
  // always today's week, however wide the panel is.
  const blockStart = new Date(currentWeek);
  blockStart.setDate(currentWeek.getDate() - (weeks - 1) * 7);

  const legendFits = innerW >= 520;
  caption(ctx, `Activity · last ${weeks} weeks`, ix, y + 52, pal.muted, legendFits ? innerW - 170 : innerW);

  // Legend: less → more (left out when the panel is narrow)
  const levels = [0, 0.3, 0.55, 0.8, 1];
  if (legendFits) {
  const lg = 14;
  ctx.textAlign = 'right';
  ctx.font = mono(13, 500);
  ctx.fillStyle = pal.muted;
  const legendRight = x + w - 32;
  ctx.fillText('MORE', legendRight, y + 51);
  const moreW = ctx.measureText('MORE').width;
  let lx = legendRight - moreW - 10 - levels.length * (lg + 4) + 4;
  ctx.fillText('LESS', lx - 10, y + 51);
  ctx.textAlign = 'left';
  levels.forEach((a) => {
    roundRect(ctx, lx, y + 39, lg, lg, 3);
    ctx.fillStyle = a === 0 ? pal.track : rgba(pal.accent, a);
    ctx.fill();
    lx += lg + 4;
  });
  }

  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(blockStart);
      d.setDate(blockStart.getDate() + col * 7 + row);
      roundRect(ctx, gx + col * (cell + gap), gridTop + row * (cell + gap), cell, cell, Math.max(2, cell * 0.2));
      if (d > today) {
        ctx.fillStyle = rgba(pal.track, 0.4);
        ctx.fill();
        continue;
      }
      const min = perDay.get(ymd(d)) ?? 0;
      const a = min === 0 ? 0 : min < 30 ? 0.3 : min < 60 ? 0.55 : min < 120 ? 0.8 : 1;
      ctx.fillStyle = a === 0 ? pal.track : rgba(pal.accent, a);
      ctx.fill();
    }
  }

  if (withStats) {
    // Totals over the days shown (up to today).
    let days = 0;
    let active = 0;
    let total = 0;
    let best = 0;
    for (const d = new Date(blockStart); d <= today; d.setDate(d.getDate() + 1)) {
      const min = perDay.get(ymd(d)) ?? 0;
      days += 1;
      total += min;
      if (min > 0) active += 1;
      best = Math.max(best, min);
    }
    const sy = y + h - 28 - STATS_H + 14;
    ctx.strokeStyle = rgba(pal.border, 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ix, sy);
    ctx.lineTo(ix + innerW, sy);
    ctx.stroke();
    const cw = innerW / 3;
    const narrow = cw < 150;
    const cells = [
      { label: narrow ? 'Active' : 'Active days', val: `${active}`, unit: `/${days}` },
      { label: narrow ? 'Avg/day' : 'Daily avg', val: (total / 60 / Math.max(1, days)).toFixed(1), unit: 'h' },
      { label: narrow ? 'Best' : 'Best day', val: (best / 60).toFixed(1), unit: 'h' },
    ];
    cells.forEach((c, i) => {
      const cx = ix + i * cw;
      caption(ctx, c.label, cx, sy + 30, pal.muted, cw - 12);
      ctx.font = sans(28, 700);
      ctx.fillStyle = pal.text;
      ctx.fillText(c.val, cx, sy + 66);
      const vw = ctx.measureText(c.val).width;
      ctx.font = sans(17, 600);
      ctx.fillStyle = pal.muted;
      ctx.fillText(c.unit, cx + vw + 4, sy + 66);
    });
  }
}

function computeCategoryStats(data: StatusCardData): CategoryStat[] {
  const totalMin = Math.max(1, data.logs.reduce((acc, l) => acc + l.durationMinutes, 0));
  return data.categories
    .map((cat) => {
      const min = data.logs
        .filter((l) => String(l.categoryId) === String(cat.id))
        .reduce((acc, l) => acc + l.durationMinutes, 0);
      return { code: cat.code, name: cat.name, color: cat.color, min, pct: Math.round((min / totalMin) * 100) };
    })
    .filter((s) => s.min > 0)
    .sort((a, b) => b.min - a.min);
}

function paintCategories(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: StatusCardData,
  pal: Palette
) {
  panel(ctx, x, y, w, h, pal);
  const ix = x + 32;
  const innerW = w - 64;
  caption(ctx, 'Focus split', ix, y + 52, pal.muted);

  const ROW = 40;
  const fits = Math.max(1, Math.min(7, Math.floor((h - 76 - 20) / ROW)));
  const stats = computeCategoryStats(data).slice(0, fits);
  if (stats.length === 0) {
    ctx.font = sans(18, 500);
    ctx.fillStyle = pal.muted;
    ctx.fillText('No sessions logged yet', ix, y + 110);
    return;
  }

  const rowTop = y + 76;
  const rowH = Math.max(ROW, Math.min(62, (h - 76 - 28) / stats.length));
  stats.forEach((s, i) => {
    const ry = rowTop + i * rowH;
    roundRect(ctx, ix, ry + 4, 12, 12, 3);
    ctx.fillStyle = s.color;
    ctx.fill();

    ctx.textAlign = 'right';
    ctx.font = sans(17, 600);
    ctx.fillStyle = pal.text;
    const pct = `${s.pct}%`;
    ctx.fillText(pct, x + w - 32, ry + 16);
    const pctW = ctx.measureText(pct).width;
    ctx.textAlign = 'left';

    ctx.font = sans(17, 500);
    ctx.fillStyle = pal.text;
    ctx.fillText(fitText(ctx, s.name || s.code, innerW - 24 - pctW - 12), ix + 22, ry + 16);

    roundRect(ctx, ix, ry + 25, innerW, 6, 3);
    ctx.fillStyle = pal.track;
    ctx.fill();
    roundRect(ctx, ix, ry + 25, Math.max(6, (innerW * s.pct) / 100), 6, 3);
    ctx.fillStyle = s.color;
    ctx.fill();
  });
}

function paintFooter(ctx: CanvasRenderingContext2D, S: number, data: StatusCardData, pal: Palette) {
  const y = S - PAD + 8;
  caption(ctx, `${data.surface.name} · ${(data.isDark ? data.surface.dark : data.surface.light).label}`, PAD, y, pal.muted, S / 2);
  ctx.textAlign = 'right';
  ctx.font = sans(18, 600);
  setTracking(ctx, 1);
  ctx.fillStyle = pal.text;
  ctx.fillText('typbox.me', S - PAD, y);
  setTracking(ctx, 0);
  ctx.textAlign = 'left';
}

export function drawStatusCard(
  canvas: { width: number; height: number; getContext(id: '2d'): CanvasRenderingContext2D | null },
  data: StatusCardData
) {
  const S = STATUS_CARD_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pal = buildPalette(data);
  // An ID badge: rounded corners (transparent outside, so the PNG keeps
  // its shape when pasted) and a lanyard slot punched through the top.
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  roundRect(ctx, 0, 0, S, S, CARD_RADIUS);
  ctx.clip();
  paintBackdrop(ctx, S, data, pal);
  paintHeader(ctx, S, pal);
  let cursor = paintIdentity(ctx, S, PAD + 72, data, pal);
  cursor = paintMetrics(ctx, S, cursor + 28, data, pal);

  // Lower half: MY ROOM (when included) on the left, activity and the
  // focus split (when included) on the right.
  const top = cursor + 20;
  const h = S - PAD - 44 - top;
  const w = S - PAD * 2;
  const gap = 20;
  if (data.room) {
    const roomW = Math.round(w * 0.58);
    paintRoom(ctx, PAD, top, roomW, h, data, pal);
    const rx = PAD + roomW + gap;
    const rw = w - roomW - gap;
    if (data.showCategories) {
      const actH = Math.round(h * 0.55);
      paintActivity(ctx, rx, top, rw, actH, data, pal);
      paintCategories(ctx, rx, top + actH + gap, rw, h - actH - gap, data, pal);
    } else {
      paintActivity(ctx, rx, top, rw, h, data, pal);
    }
  } else if (data.showCategories) {
    const actW = Math.round(w * 0.6);
    paintActivity(ctx, PAD, top, actW, h, data, pal);
    paintCategories(ctx, PAD + actW + gap, top, w - actW - gap, h, data, pal);
  } else {
    paintActivity(ctx, PAD, top, w, h, data, pal);
  }
  paintFooter(ctx, S, data, pal);
  paintSlot(ctx, S, pal);
  ctx.restore();
  // Fine edge so the card reads on any background.
  roundRect(ctx, 1, 1, S - 2, S - 2, CARD_RADIUS - 1);
  ctx.strokeStyle = rgba(pal.border, 0.95);
  ctx.lineWidth = 2;
  ctx.stroke();
}

const CARD_RADIUS = 56;

// The lanyard slot: a pill punched clean through (destination-out), with a
// metal eyelet around it.
function paintSlot(ctx: CanvasRenderingContext2D, S: number, pal: Palette) {
  const w = 132;
  const h = 26;
  const x = (S - w) / 2;
  const y = 30;
  // eyelet
  roundRect(ctx, x - 9, y - 9, w + 18, h + 18, (h + 18) / 2);
  const g = ctx.createLinearGradient(0, y - 9, 0, y + h + 9);
  g.addColorStop(0, mix(pal.panel, '#ffffff', pal.dark ? 0.32 : 0.75));
  g.addColorStop(0.5, mix(pal.panel, '#9ca3af', 0.55));
  g.addColorStop(1, mix(pal.panel, '#000000', pal.dark ? 0.35 : 0.2));
  ctx.fillStyle = g;
  ctx.fill();
  roundRect(ctx, x - 9, y - 9, w + 18, h + 18, (h + 18) / 2);
  ctx.strokeStyle = rgba('#000000', 0.25);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // the hole
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.restore();
  // inner rim shading on the hole's top edge
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.clip();
  ctx.strokeStyle = rgba('#000000', 0.35);
  ctx.lineWidth = 4;
  roundRect(ctx, x, y + 1, w, h, h / 2);
  ctx.stroke();
  ctx.restore();
}

/** Decodes a PRESTIGE `url("data:…")` backdrop so the card can paint it. */
export function loadSurfaceArt(pair: SurfaceThemePair, isDark: boolean): Promise<HTMLImageElement | null> {
  const css = pair.art ? (isDark ? pair.art.dark : pair.art.light) : '';
  const m = /^url\("(.*)"\)$/.exec(css);
  if (!m) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = m[1];
  });
}
