# TYPBOX Design

A blueprint for rebuilding TYPBOX with the same character.
Numbers live in [`tokens.json`](./tokens.json), the full feature inventory in [`FEATURES.md`](./FEATURES.md), and the **intent** here.

> A rebuild brief should fit in one line:
> "Read the three things in `design/` and build it in this spirit."

---

## 1. The core preference

**Simple, and densely packed with data.**

Fill the screen with information, not decoration. Whitespace exists to separate data, not to let the page breathe.
Many numbers can share one screen without feeling cluttered because the visual rules are few and strictly kept.

In practice:

- **One color, one typeface, one line.** Emerald (`#10b981`) is the only accent, monospace is the only face, and structure is drawn with 1px lines only.
- **No rounded corners.** Panels, buttons, inputs, chips and modals are all square. Only status dots and avatars are round.
- **Lines, not shadows.** Panels never cast drop shadows. Only floating layers (modals) do.
- **Don't fear small text.** Labels are 9–11px uppercase; numbers are large and light (24–36px, font-light). That contrast is what lets density and legibility coexist.
- **Instrument / telemetry vocabulary.** The screen looks like an observation console, not a study app (SYSTEM CHRONOMETER, TELEMETRY CADENCE MATRIX, REC // ACTIVE).

## 2. Mood

| Is                                                                     | Is not                                |
| ---------------------------------------------------------------------- | ------------------------------------- |
| Instrument panel, terminal, drafting table, control room               | Cute, bubbly, illustration-led        |
| Numbers are the hero                                                   | Prose is the hero                     |
| Quiet, with an occasional glow                                         | Constantly moving                     |
| The game-like joy of unlocking things                                  | Ad-like flash, notifications that nag |
| Black (CARBON BLACK) by default, white (ALABASTER) treated as an equal | Polishing only one mode               |

## 3. Visual rules

### Color

- One accent: emerald. Text uses `emerald-400` on dark and `emerald-700` on light.
- Three status colors only: **emerald = ok / done**, **amber = recording / in progress**, **rose = error**.
- Tinted chips always follow one recipe: **40% border + 10% fill + strong text** (e.g. `border-emerald-500/40 bg-emerald-500/10 text-emerald-400`).
- Category colors are user-chosen. Parked categories are never hidden; they show as a **hollow ring (swatch) or diagonal hatch (bar)** so history stays readable.
- Every theme is a dark/light pair with exactly nine keys (`label` `bgMain` `bgCard` `bgInput` `border` `textMain` `textMuted` `patternTint` `glowTint`). Components read only these keys, so changing theme never moves layout.

### Type

- Monospace by default (the system mono stack). Sans only for prose (descriptions, help).
- Labels, headings and buttons are **uppercase with open tracking** (`tracking-wider` / `tracking-widest`).
- Every changing number uses `tabular-nums`. Digits never jitter.
- Users can pick from 44 fonts, but all of them are monospace. Monospace is non-negotiable.

### Shape and line

- 1px lines. Cell grids draw top+left on the wrapper and right+bottom on each cell so lines never double up.
- Dividers inside a panel are one step fainter than the panel border (`zinc-800/60` on dark).
- Glows are accent-colored rings or blurred circles at ~5% opacity, never drop shadows.

### Notation

- Separator: `//` (`REC // ACTIVE`, `SYNC // Asia/Tokyo`).
- Number the metrics (`01 / TOTAL LOGGED`).
- Put machine-style codes next to names (`THM-01`, `DIV-03`, `LV.1,240`).
- Icons are lucide at 14–16px. Only the icon that names a panel is accent-colored.

## 4. Layout

```
┌ HEADER (sticky · bottom rule · blur)  TYPBOX [ver]        [CMD ⌘K] [...] ┐
├──────────────────────────────────────────────────────────────────────────┤
│ 01 / TOTAL │ 02 / THIS WEEK │ 03 / THIS MONTH │ 04 / ...  ← metrics strip │
│ CLEARANCE LV.xxxx ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  [SHARE]    │
├────────────── 5 ──────────────┬───────────────── 7 ──────────────────────┤
│ SYSTEM CHRONOMETER            │ ANALYTICS                                │
│ SESSION LOGGER                │ TELEMETRY CADENCE MATRIX (7 days × weeks)│
│ CATEGORY REGISTRY             │ CHRONOLOGICAL LOG STREAM                 │
│ STUDY INSIGHTS & VAULT        │                                          │
└───────────────────────────────┴──────────────────────────────────────────┘
  FOOTER
```

- Max width 1280px. On desktop, a 12-column grid split 5:7 (left = input and control, right = review).
- On mobile, a single column reordered so **the clock and logger come first**.
- One panel pattern: `1px border + bgCard + p-5/p-6`, a header row of icon + uppercase title + right-aligned meta, then a divider.
- Touch-sized targets (min 36–42px) on phone/tablet only; desktop collapses them to keep density.

## 5. Key components

| Component                | Role                                 | What makes it TYPBOX                                                                                                                                                         |
| ------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SYSTEM CHRONOMETER       | Clock and stopwatch                  | 112 faces (neon, nixie, split-flap, CRT…). Status dot: emerald pulse when idle, amber ping when recording                                                                    |
| Metrics strip            | Totals at a glance                   | Numbered labels, large light digits, small units                                                                                                                             |
| CLEARANCE                | 3,000 ranks over 1,000 hours         | Color shifts across 10 divisions; prism gradient after an Ascension                                                                                                          |
| TELEMETRY CADENCE MATRIX | Daily volume grid                    | 7 days × weeks; only today's cell pulses, quietly                                                                                                                            |
| LOG STREAM               | Session list                         | Rows separated by rules only; a new row flashes emerald and fades                                                                                                            |
| COMMAND PALETTE          | Every action via ⌘K / Ctrl+K         | Fully keyboard-drivable                                                                                                                                                      |
| STATUS CARD              | Shareable image                      | WIDE / SQUARE / PORTRAIT / STORY; preview height stays fixed when switching                                                                                                  |
| AMBIENT / NOISE          | Focus environment                    | Up to 5 layers across 8 noise families, sleep timer                                                                                                                          |
| PLANETARY SIGNAL         | Earth and Sun since the last session | Four strips on one time axis (quakes, flares, CMEs, Kp meter); quiet unless something happened                                                                               |
| SURFACE THEMES           | Background and palette               | 900 plain dark/light pairs (CLASSIC / CHROMA saturation contrast / COMPLEMENT hue contrast) + 12 illustrated prestige; art shows **only through gutters**, never behind text |

## 6. Motion

- Motion only signals that something happened. The only constant motion is the status dot and today's cell.
- On commit: an emerald ring expands from the button (700ms) and the new row flashes then fades (2.4s).
- Toasts enter with a slight overshoot (220ms).
- Under `prefers-reduced-motion`, all decorative motion stops.

## 7. Unlocking as reward

Themes, chronometer faces, fonts and noises are not all available on day one. They unlock with **hours, sessions, streaks and level**.
Customizing the look is itself the reward for keeping going. Keep that relationship in any rebuild.

## 8. Rules for a rebuild

1. No rounded corners. No shadows for separation.
2. One accent. At most three status colors.
3. Labels small, uppercase, monospace; numbers large and light, `tabular-nums`.
4. Themes are nine-key dark/light pairs; components read only the keys.
5. Never put background decoration behind text.
6. Mobile puts actions first; desktop prioritizes density.
7. Every new component fits the "1px-bordered panel + uppercase title + divider" pattern.

## 9. My notes (likes / dislikes / undecided)

<!-- Fill in yourself. e.g.
- Like:
- Dislike:
- Would change next time:
-->

## 10. Source files

| What                                                   | File                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Animations, chronometer effects, background motion     | `frontend/src/index.css`                                                                                                   |
| Page layout, panels                                    | `frontend/src/App.tsx`                                                                                                     |
| Themes, clearance, noise, status card, command palette | `frontend/src/telemetryFeatures.tsx`                                                                                       |
| Chronometer faces                                      | `frontend/src/chronometerThemes.json`, `ChronometerFace.tsx`                                                               |
| Fonts                                                  | `frontend/src/uiFonts.ts`                                                                                                  |
| Category color handling                                | `frontend/src/categoryStyle.ts`                                                                                            |
| Weather display                                        | `frontend/src/weatherThemes.ts`, `Weather.tsx`                                                                             |
| Surface Themes                                         | `frontend/src/surfaceThemeCatalog.json`, `surfaceThemes.ts`, `surfacePalettes.ts`, `surfaceColor.ts`, `surfacePrestige.ts` |
