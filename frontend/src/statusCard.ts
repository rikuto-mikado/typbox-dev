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

// Identity row; returns the bottom edge.
function paintIdentity(ctx: CanvasRenderingContext2D, S: number, top: number, data: StatusCardData, pal: Palette): number {
  const c = data.clearance;
  const size = 112;
  paintAvatar(ctx, PAD, top, size, data, pal);

  const x = PAD + size + 32;
  const w = S - PAD - x;
  ctx.fillStyle = pal.text;
  ctx.font = sans(52, 700);
  ctx.fillText(fitText(ctx, data.username || 'Operator', w), x, top + 54);

  // Rank chip
  const chip = `LV.${String(c.current.level).padStart(4, '0')}`;
  ctx.font = mono(17, 700);
  setTracking(ctx, 1.5);
  const chipW = ctx.measureText(chip).width + 28;
  roundRect(ctx, x, top + 74, chipW, 34, 17);
  ctx.fillStyle = rgba(pal.accent, pal.dark ? 0.18 : 0.14);
  ctx.fill();
  ctx.strokeStyle = rgba(pal.accent, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = pal.accentText;
  ctx.fillText(chip, x + 14, top + 97);
  setTracking(ctx, 0);

  ctx.font = sans(20, 500);
  ctx.fillStyle = pal.muted;
  const cycle = c.totalAscensions > 0 ? ` · Cycle ${c.cycleNumber} ✦${c.totalAscensions}` : '';
  ctx.fillText(fitText(ctx, `${c.current.title}${cycle}`, w - chipW - 16), x + chipW + 16, top + 98);
  return top + size;
}

// Hero: lifetime hours + clearance ring. Returns the bottom edge.
function paintHero(ctx: CanvasRenderingContext2D, S: number, top: number, data: StatusCardData, pal: Palette): number {
  const c = data.clearance;
  const h = 220;
  panel(ctx, PAD, top, S - PAD * 2, h, pal);

  const ix = PAD + 44;
  caption(ctx, 'Total focus time', ix, top + 58, pal.muted);
  ctx.font = sans(132, 700);
  setTracking(ctx, -4);
  ctx.fillStyle = pal.text;
  const ringR = 78;
  const ringCx = S - PAD - 44 - ringR;
  const numW = ringCx - ringR - 40 - ix;
  const num = fitText(ctx, data.totalHours, numW - 90);
  ctx.fillText(num, ix, top + 180);
  const nw = ctx.measureText(num).width;
  setTracking(ctx, 0);
  ctx.font = sans(34, 600);
  ctx.fillStyle = pal.accentText;
  ctx.fillText('hrs', ix + nw + 14, top + 180);

  // Clearance progress ring
  const cy = top + h / 2;
  ctx.lineCap = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = pal.track;
  ctx.beginPath();
  ctx.arc(ringCx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  const pct = Math.floor(Math.max(0, Math.min(100, c.progressPct)));
  if (pct > 0) {
    ctx.strokeStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(ringCx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  ctx.textAlign = 'center';
  ctx.fillStyle = pal.text;
  ctx.font = sans(40, 700);
  ctx.fillText(`${pct}%`, ringCx, cy + 6);
  ctx.font = mono(13, 500);
  setTracking(ctx, 1.6);
  ctx.fillStyle = pal.muted;
  const sub = c.ascensionAvailable ? 'ASCEND' : c.next ? `TO LV.${c.next.level}` : 'COMPLETE';
  ctx.fillText(sub, ringCx, cy + 32);
  setTracking(ctx, 0);
  ctx.textAlign = 'left';
  return top + h;
}

// Four evenly split metrics separated by hairlines. Returns the bottom edge.
function paintMetrics(ctx: CanvasRenderingContext2D, S: number, top: number, data: StatusCardData, pal: Palette): number {
  const h = 140;
  const w = S - PAD * 2;
  panel(ctx, PAD, top, w, h, pal);
  const metrics = [
    { label: 'This week', val: data.weeklyHours, unit: 'h' },
    { label: 'This month', val: data.monthlyHours, unit: 'h' },
    { label: 'Streak', val: String(data.currentStreak), unit: 'd' },
    { label: 'Best streak', val: String(data.longestStreak), unit: 'd' },
  ];
  const colW = w / metrics.length;
  metrics.forEach((m, i) => {
    const x = PAD + i * colW;
    if (i > 0) {
      ctx.strokeStyle = rgba(pal.border, 0.9);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, top + 30);
      ctx.lineTo(x, top + h - 30);
      ctx.stroke();
    }
    const ix = x + 32;
    caption(ctx, m.label, ix, top + 50, pal.muted, colW - 48);
    ctx.font = sans(54, 700);
    setTracking(ctx, -1.5);
    ctx.fillStyle = pal.text;
    const val = fitText(ctx, m.val, colW - 80);
    ctx.fillText(val, ix, top + 110);
    const vw = ctx.measureText(val).width;
    setTracking(ctx, 0);
    ctx.font = sans(24, 600);
    ctx.fillStyle = pal.muted;
    ctx.fillText(m.unit, ix + vw + 6, top + 110);
  });
  return top + h;
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

// Activity heatmap. Mirrors the dashboard's TELEMETRY CADENCE MATRIX: the
// grid starts (top-left) at the user's first logged week and fills toward
// the bottom-right; once a grid's worth of weeks is used up, the next block
// starts fresh, so the current week is always on the card. Days not yet
// reached are drawn as faint placeholders. Cell intensity follows minutes
// logged that day.
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
  const gridTop = y + 76;
  const cell = Math.floor((h - 76 - 28 - gap * 6) / 7);
  const weeks = Math.max(1, Math.floor((innerW + gap) / (cell + gap)));
  const gx = ix;

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
  let origin = currentWeek;
  if (data.logs.length > 0) {
    const oldest = data.logs.reduce((acc, l) => (l.date < acc ? l.date : acc), data.logs[0].date);
    const oldestDate = new Date(`${oldest}T00:00:00`);
    if (!isNaN(oldestDate.getTime()) && oldestDate < currentWeek) origin = startOfWeek(oldestDate);
  }
  const weeksElapsed = Math.round((currentWeek.getTime() - origin.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const blockStart = new Date(origin);
  blockStart.setDate(origin.getDate() + Math.floor(weeksElapsed / weeks) * weeks * 7);

  caption(ctx, `Activity · from ${shortDate(blockStart)}`, ix, y + 52, pal.muted, innerW - 170);

  // Legend: less → more
  const levels = [0, 0.3, 0.55, 0.8, 1];
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

  const stats = computeCategoryStats(data).slice(0, 4);
  if (stats.length === 0) {
    ctx.font = sans(18, 500);
    ctx.fillStyle = pal.muted;
    ctx.fillText('No sessions logged yet', ix, y + 110);
    return;
  }

  const rowTop = y + 84;
  const rowH = Math.min(62, (h - 84 - 28) / stats.length);
  stats.forEach((s, i) => {
    const ry = rowTop + i * rowH;
    roundRect(ctx, ix, ry + 4, 12, 12, 3);
    ctx.fillStyle = s.color;
    ctx.fill();

    ctx.textAlign = 'right';
    ctx.font = sans(18, 600);
    ctx.fillStyle = pal.text;
    const pct = `${s.pct}%`;
    ctx.fillText(pct, x + w - 32, ry + 16);
    const pctW = ctx.measureText(pct).width;
    ctx.textAlign = 'left';

    ctx.font = sans(18, 500);
    ctx.fillStyle = pal.text;
    ctx.fillText(fitText(ctx, s.name || s.code, innerW - 24 - pctW - 12), ix + 22, ry + 16);

    roundRect(ctx, ix, ry + 28, innerW, 6, 3);
    ctx.fillStyle = pal.track;
    ctx.fill();
    roundRect(ctx, ix, ry + 28, Math.max(6, (innerW * s.pct) / 100), 6, 3);
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
  paintBackdrop(ctx, S, data, pal);
  paintHeader(ctx, S, pal);
  let cursor = paintIdentity(ctx, S, PAD + 76, data, pal);
  cursor = paintHero(ctx, S, cursor + 40, data, pal);
  cursor = paintMetrics(ctx, S, cursor + 20, data, pal);

  const top = cursor + 20;
  const h = S - PAD - 44 - top;
  const w = S - PAD * 2;
  if (data.showCategories) {
    const actW = Math.round(w * 0.6);
    paintActivity(ctx, PAD, top, actW, h, data, pal);
    paintCategories(ctx, PAD + actW + 20, top, w - actW - 20, h, data, pal);
  } else {
    paintActivity(ctx, PAD, top, w, h, data, pal);
  }
  paintFooter(ctx, S, data, pal);
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
