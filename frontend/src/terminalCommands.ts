// Terminal namespaces for the command palette: "font jetbrains", "noise vol 40",
// "goto forecast"… Typing a namespace word swaps the palette's list for that
// namespace's catalog (filtered by the rest of the line), so the palette reads
// like a small shell instead of one flat list of buttons. The catalogs and the
// "apply" callbacks come from App, which owns the settings state and the
// unlock rules; this file only turns them into palette rows.
import { tf, type Dict } from './i18n';

export interface PaletteCommandItem {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  badge: string;
  accentColor?: string;
  keywords: string;
  action: () => void | Promise<void>;
  /** Tab (and Enter, for pure hint rows) fills the input with this text. */
  complete?: string;
  /** Drawn muted: a locked catalog entry. */
  dim?: boolean;
}

export interface TerminalEntry {
  id: string;
  code: string;
  name: string;
  desc: string;
  /** null when usable; otherwise the short requirement ("LV.0030", "7-DAY STREAK"). */
  locked: string | null;
  /** Full sentence shown when a locked entry is run. */
  lockedMessage?: string;
  current?: boolean;
  color?: string;
}

export const PANEL_IDS = ['chrono', 'log', 'registry', 'insights', 'lunar', 'analytics', 'cadence', 'stream', 'forecast'] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export interface TerminalContext {
  fonts: TerminalEntry[];
  faces: TerminalEntry[];
  surfaces: TerminalEntry[];
  ambients: TerminalEntry[];
  cursors: TerminalEntry[];
  noises: TerminalEntry[];
  /** The noise engine's sleep-timer cap; longer requests are refused, not clamped silently. */
  maxSleepMinutes: number;
  onSelectFont: (id: string) => void;
  onSelectFace: (id: string) => void;
  onSelectSurface: (id: string) => void;
  /** Saves the ambient theme (when given) and starts it full-screen now. */
  onLaunchAmbient: (id: string | null) => void;
  onSelectCursor: (id: string) => void;
}

/** What a terminal row can do to the palette around it. */
export interface TerminalIO {
  /** Success: print the line in the banner, then close. */
  done: (message: string) => void;
  /** Refusal (locked, bad argument): print the line and stay open. */
  fail: (message: string) => void;
  /** Replace the input text (autocomplete). */
  complete: (text: string) => void;
  close: () => void;
}

type Namespace = 'font' | 'noise' | 'face' | 'surface' | 'ambient' | 'cursor' | 'goto' | 'help';

const ALIASES: Record<string, Namespace> = {
  font: 'font',
  fonts: 'font',
  typeface: 'font',
  noise: 'noise',
  sound: 'noise',
  audio: 'noise',
  face: 'face',
  chrono: 'face',
  clock: 'face',
  surface: 'surface',
  skin: 'surface',
  ambient: 'ambient',
  screensaver: 'ambient',
  cursor: 'cursor',
  pointer: 'cursor',
  piece: 'cursor',
  goto: 'goto',
  go: 'goto',
  cd: 'goto',
  help: 'help',
  man: 'help',
  '?': 'help',
};

const NAMESPACE_ORDER: Namespace[] = ['font', 'noise', 'face', 'surface', 'ambient', 'cursor', 'goto'];

/** "font jet" -> { ns: 'font', args: ['jet'] }; null when the line isn't a namespace. */
export function resolveNamespace(query: string): { ns: Namespace; args: string[] } | null {
  const [head, ...args] = query.trim().toLowerCase().split(/\s+/);
  const ns = head ? ALIASES[head] : undefined;
  return ns ? { ns, args } : null;
}

export const dispatchNoise = (detail: { action: 'play' | 'stop' | 'toggle' | 'volume' | 'sleep'; mode?: string; value?: number }) => {
  window.dispatchEvent(new CustomEvent('typbox:ambient-sound', { detail }));
};

const matches = (entry: TerminalEntry, tokens: string[]) => {
  const hay = `${entry.code} ${entry.name} ${entry.id} ${entry.desc}`.toLowerCase();
  return tokens.every((tok) => hay.includes(tok));
};

/** "30", "30m", "1h", "1.5h", "1h30m" -> minutes (null if unreadable). */
function parseMinutes(raw: string): number | null {
  const m = raw.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m?)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  const total = Math.round((m[1] ? parseFloat(m[1]) * 60 : 0) + (m[2] ? parseInt(m[2], 10) : 0));
  return total > 0 ? total : null;
}

interface CatalogSpec {
  ns: Namespace;
  group: string;
  verb: string;
  entries: TerminalEntry[];
  apply: (entry: TerminalEntry) => string;
}

function catalogRows(spec: CatalogSpec, tokens: string[], io: TerminalIO, t: Dict): PaletteCommandItem[] {
  const hits = spec.entries.filter((e) => matches(e, tokens));
  // Usable entries first; the catalog's own order is kept inside each half.
  const ordered = [...hits.filter((e) => !e.locked), ...hits.filter((e) => e.locked)];
  return ordered.map((entry) => ({
    id: `${spec.ns}-${entry.id}`,
    group: spec.group,
    title: `${entry.code} · ${entry.name}`,
    subtitle: entry.locked ? tf(t.tmLockedSub, { req: entry.locked, desc: entry.desc }) : entry.desc,
    badge: entry.current ? t.tmCurrent : entry.locked ? entry.locked : `${spec.verb} ${entry.id}`,
    accentColor: entry.color,
    keywords: `${spec.ns} ${entry.code} ${entry.name} ${entry.id}`,
    dim: !!entry.locked,
    action: () => {
      if (entry.locked) {
        io.fail(entry.lockedMessage ?? tf(t.tmLocked, { name: entry.name, req: entry.locked }));
        return;
      }
      io.done(spec.apply(entry));
    },
  }));
}

function noiseRows(args: string[], ctx: TerminalContext, io: TerminalIO, t: Dict): PaletteCommandItem[] {
  const [sub, value] = args;
  const group = t.tmGroupNoise;

  if (sub === 'off' || sub === 'stop' || sub === 'mute') {
    return [
      {
        id: 'noise-off',
        group,
        title: t.tmNoiseOff,
        subtitle: t.pcStopSub,
        badge: 'noise off',
        keywords: 'noise off',
        action: () => {
          dispatchNoise({ action: 'stop' });
          io.done(t.tmNoiseOffDone);
        },
      },
    ];
  }

  if (sub === 'vol' || sub === 'volume') {
    const pct = value !== undefined && /^\d{1,3}%?$/.test(value) ? parseInt(value, 10) : null;
    if (pct === null || pct > 100) {
      return [
        {
          id: 'noise-vol-hint',
          group,
          title: t.tmNoiseVolHint,
          subtitle: t.tmNoiseVolHintSub,
          badge: 'noise vol 40',
          keywords: 'noise volume',
          complete: 'noise vol ',
          action: () => io.complete('noise vol '),
        },
      ];
    }
    return [
      {
        id: `noise-vol-${pct}`,
        group,
        title: tf(t.tmNoiseVol, { n: pct }),
        subtitle: t.tmNoiseVolSub,
        badge: t.pcEnterToCommit,
        keywords: 'noise volume',
        action: () => {
          dispatchNoise({ action: 'volume', value: pct / 100 });
          io.done(tf(t.tmNoiseVolDone, { n: pct }));
        },
      },
    ];
  }

  if (sub === 'sleep') {
    const minutes = value ? parseMinutes(value) : null;
    if (minutes === null || minutes > ctx.maxSleepMinutes) {
      return [
        {
          id: 'noise-sleep-hint',
          group,
          title: t.tmNoiseSleepHint,
          subtitle: tf(t.tmNoiseSleepHintSub, { max: ctx.maxSleepMinutes }),
          badge: 'noise sleep 30m',
          keywords: 'noise sleep timer',
          complete: 'noise sleep ',
          action: () => io.complete('noise sleep '),
        },
      ];
    }
    return [
      {
        id: `noise-sleep-${minutes}`,
        group,
        title: tf(t.tmNoiseSleep, { n: minutes }),
        subtitle: t.tmNoiseSleepSub,
        badge: t.pcEnterToCommit,
        keywords: 'noise sleep timer',
        action: () => {
          dispatchNoise({ action: 'sleep', value: minutes });
          io.done(tf(t.tmNoiseSleepDone, { n: minutes }));
        },
      },
    ];
  }

  const rows = catalogRows(
    {
      ns: 'noise',
      group,
      verb: 'noise',
      entries: ctx.noises,
      apply: (entry) => {
        dispatchNoise({ action: 'play', mode: entry.id });
        return tf(t.tmNoiseDone, { name: entry.name });
      },
    },
    args,
    io,
    t
  );
  if (args.length > 0) return rows;
  // Bare "noise": the controls first, then every profile.
  const controls = ['off', 'vol', 'sleep'].map((s) => noiseRows([s], ctx, io, t)[0]);
  return [...controls, ...rows];
}

function gotoRows(args: string[], io: TerminalIO, t: Dict): PaletteCommandItem[] {
  const labels: Record<PanelId, string> = {
    chrono: t.tmPanelChrono,
    log: t.tmPanelLog,
    registry: t.tmPanelRegistry,
    insights: t.tmPanelInsights,
    lunar: t.tmPanelLunar,
    analytics: t.tmPanelAnalytics,
    cadence: t.tmPanelCadence,
    stream: t.tmPanelStream,
    forecast: t.tmPanelForecast,
  };
  return PANEL_IDS.filter((id) => args.every((tok) => `${id} ${labels[id]}`.toLowerCase().includes(tok))).map((id) => ({
    id: `goto-${id}`,
    group: t.tmGroupGoto,
    title: labels[id],
    subtitle: t.tmGotoSub,
    badge: `goto ${id}`,
    keywords: `goto ${id}`,
    action: () => {
      io.close();
      // After the palette unmounts, so focus and scroll land on the page.
      window.setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-panel="${id}"]`);
        if (!el) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        el.classList.remove('tb-panel-ping');
        void el.offsetWidth; // restart the highlight if the same panel is hit twice
        el.classList.add('tb-panel-ping');
      }, 30);
    },
  }));
}

/** Rows for a namespace line, or null when the query isn't one. */
export function buildNamespaceRows(query: string, ctx: TerminalContext, io: TerminalIO, t: Dict): PaletteCommandItem[] | null {
  const parsed = resolveNamespace(query);
  if (!parsed) return null;
  const { ns, args } = parsed;
  switch (ns) {
    case 'font':
      return catalogRows(
        {
          ns,
          group: t.tmGroupFont,
          verb: 'font',
          entries: ctx.fonts,
          apply: (entry) => {
            ctx.onSelectFont(entry.id);
            return tf(t.tmFontDone, { name: entry.name });
          },
        },
        args,
        io,
        t
      );
    case 'face':
      return catalogRows(
        {
          ns,
          group: t.tmGroupFace,
          verb: 'face',
          entries: ctx.faces,
          apply: (entry) => {
            ctx.onSelectFace(entry.id);
            return tf(t.tmFaceDone, { name: entry.name });
          },
        },
        args,
        io,
        t
      );
    case 'surface':
      return catalogRows(
        {
          ns,
          group: t.tmGroupSurface,
          verb: 'surface',
          entries: ctx.surfaces,
          apply: (entry) => {
            ctx.onSelectSurface(entry.id);
            return tf(t.tmSurfaceDone, { name: entry.name });
          },
        },
        args,
        io,
        t
      );
    case 'ambient': {
      const rows = catalogRows(
        {
          ns,
          group: t.tmGroupAmbient,
          verb: 'ambient',
          entries: ctx.ambients,
          apply: (entry) => {
            ctx.onLaunchAmbient(entry.id);
            return tf(t.tmAmbientDone, { name: entry.name });
          },
        },
        args,
        io,
        t
      );
      if (args.length > 0) return rows;
      const current = ctx.ambients.find((a) => a.current);
      return [
        {
          id: 'ambient-now',
          group: t.tmGroupAmbient,
          title: t.tmAmbientNow,
          subtitle: tf(t.tmAmbientNowSub, { name: current?.name ?? '—' }),
          badge: 'ambient',
          keywords: 'ambient now',
          action: () => {
            ctx.onLaunchAmbient(null);
            io.done(tf(t.tmAmbientDone, { name: current?.name ?? '—' }));
          },
        },
        ...rows,
      ];
    }
    case 'cursor':
      return catalogRows(
        {
          ns,
          group: t.tmGroupCursor,
          verb: 'cursor',
          entries: ctx.cursors,
          apply: (entry) => {
            ctx.onSelectCursor(entry.id);
            return tf(t.tmCursorDone, { name: entry.name });
          },
        },
        args,
        io,
        t
      );
    case 'noise':
      return noiseRows(args, ctx, io, t);
    case 'goto':
      return gotoRows(args, io, t);
    case 'help':
      return buildHintRows(ctx, io, t);
  }
}

/** One row per namespace: running it types "<namespace> " into the input. */
export function buildHintRows(ctx: TerminalContext, io: TerminalIO, t: Dict): PaletteCommandItem[] {
  const unlocked = (list: TerminalEntry[]) => `${list.filter((e) => !e.locked).length}/${list.length}`;
  const meta: Record<Exclude<Namespace, 'help'>, { usage: string; desc: string }> = {
    font: { usage: 'font <name>', desc: tf(t.tmHelpFont, { n: unlocked(ctx.fonts) }) },
    noise: { usage: 'noise <name> | vol <0-100> | sleep <30m> | off', desc: tf(t.tmHelpNoise, { n: unlocked(ctx.noises) }) },
    face: { usage: 'face <name>', desc: tf(t.tmHelpFace, { n: unlocked(ctx.faces) }) },
    surface: { usage: 'surface <name>', desc: tf(t.tmHelpSurface, { n: unlocked(ctx.surfaces) }) },
    ambient: { usage: 'ambient [name]', desc: tf(t.tmHelpAmbient, { n: unlocked(ctx.ambients) }) },
    cursor: { usage: 'cursor <name>', desc: tf(t.tmHelpCursor, { n: unlocked(ctx.cursors) }) },
    goto: { usage: 'goto <panel>', desc: t.tmHelpGoto },
  };
  return NAMESPACE_ORDER.map((ns) => ({
    id: `help-${ns}`,
    group: t.tmGroupTerminal,
    title: meta[ns as Exclude<Namespace, 'help'>].usage,
    subtitle: meta[ns as Exclude<Namespace, 'help'>].desc,
    badge: t.tmTab,
    keywords: `help terminal ${ns}`,
    complete: `${ns} `,
    action: () => io.complete(`${ns} `),
  }));
}
