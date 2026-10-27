# TYPBOX Features

A complete inventory of what TYPBOX does today, so a rebuild can reproduce it feature for feature.
Look and intent: [`DESIGN.md`](./DESIGN.md). Numbers: [`tokens.json`](./tokens.json).

Counts below were measured by running the catalogs in `frontend/src` on 2026-10-27, not copied from code comments.

---

## 0. At a glance

| System | Size |
|---|---|
| Clearance ranks | **3,000** per cycle, 10 divisions, 1,000 hours per cycle, repeatable via Ascension |
| Surface Themes | **900** dark/light pairs in 3 series, plus **12** illustrated prestige themes |
| Chronometer faces | **336** in 11 families |
| UI fonts | **44** monospace faces in 4 kinds |
| Ambient noise | **60** procedurally synthesized profiles in 8 families, mix up to 5 |
| Ambient overlay scenes | **23** |
| Weather display styles | **33** |
| Profile statuses | **206** options in 9 groups, pick up to 12 |
| Status card | 1 square card (1080×1080), painted over the active Surface Theme |
| Avatar presets | 12 icons + initial, 36 accent colors, or uploaded image |

---

### Workspace layout
- **Desktop (lg+)**: two columns that end on the same line — left: chronometer, session logger, category registry, insights & vault, lunar calendar; right: analytics, cadence matrix, log stream, planetary signal. The last panel of the shorter column stretches (the lunar calendar's day cells absorb the height).
- **Phones**: one column (chronometer, logger, cadence, analytics, insights, registry, lunar, planetary), with the log stream always last.

## 1. Study logging

### Session Logger
- Two input modes: **MANUAL** (category, date, duration in minutes) and **TIMER** (stopwatch → commit).
- Commit feedback: button state `idle → submitting → success`, an emerald ring flash on the button, a toast, and the new row flashing in the log stream.
- Requires sign-in; guests see an auth prompt in place of the form.

### System Chronometer
- Live clock in the user's timezone with `SYNC // <zone>` readout, plus the stopwatch used by TIMER mode.
- Status dot: emerald pulse when idle, amber ping and `REC // ACTIVE` while recording.
- 336 selectable faces (see §4.2) and an inline weather badge (see §6).
- **Keep awake**: while the stopwatch runs (or an ambient preview is open) the screen is kept from sleeping — Screen Wake Lock API with re-acquire on return/tap/watchdog, falling back to a tiny muted looping video (`public/keep-awake.mp4/.webm`).

### Command Palette (⌘K / Ctrl+K)
- Fuzzy search over every action; ↑ / ↓ / Enter / Esc.
- **Natural-language quick log**: typing `log 90m math`, `45m cs`, `1h30m`, `1.5h` parses duration + category and commits directly. An unknown category name logs nothing (it never falls back to the default category), and a commit can't be fired twice by a double Enter.
- Category quick-log presets for each active category.
- Sound: play brown / pink / white / 40Hz drone, stop.
- Analytics horizon: 7D / 12W / 12M / calendar.
- Timer: start/pause, reset.
- System: status card, clearance browser, settings, light/dark toggle, matrix shading toggle, matrix span toggle.
- Vault: export JSON, export CSV.
- Sign in / register when logged out.

### Chronological Log Stream
- Newest-first list, 5 rows initially, with load-more (+10) and collapse. On desktop the list keeps its 5-row height once expanded and scrolls inside it (jumping to the first newly shown row), so the page and the stretched left column don't grow with it.
- Inline edit (category, date, duration) and delete per row.
- Each log carries `is_public_to_hub` and `is_public_to_portfolio` flags (see §9).

---

## 2. Categories

- Fields: **name**, short **code** (e.g. `BACK`, `ELEC`, `NET`), **color**, **weekly target hours**, **active / inactive**.
- Create, edit, delete (the server refuses to delete the last remaining category).
- Weekly progress against the target with a "target met" state.
- **Inactive ("parked") categories** are never hidden: hollow ring swatches and diagonal-hatch bars keep history readable.
- **DONE categories** (finished one-off goals, e.g. a driving-licence exam): the ✓✓ button on a registry row marks it DONE (server-stamped `completed_at`, with an UNDO toast). DONE categories leave the registry, the log form and the command palette, and fold into a dashed `DONE (n)` section under the registry showing all-time hours and completion date, with restore and delete. Their logs keep counting everywhere in analytics, drawn hatched like parked ones. The last in-progress category can't be marked DONE. JSON backups carry `completedAt` and imports restore it.
- **Category Trend Table**: per-category hours across day / week / month columns; collapsed view shows the top categories and folds the rest into OTHER so totals still add up; shows `N ACTIVE · N IDLE`, click to expand.

---

## 3. Analytics and review

### Metrics strip
`01 / TOTAL LOGGED`, `THIS WEEK`, `THIS MONTH` and more, followed by the Clearance bar.

### Analytics module
- Four horizons: **7D** (daily bars), **12W** (weekly buckets), **12M** (monthly buckets), **CAL** (month calendar grid).
- Averages per week / month, current-period totals.
- **Timeline scrubber**: drag to rewind weeks/months, one-tap return to the present.

### Telemetry Cadence Matrix
- 7 days (vertical) × N weeks (horizontal), fit to the available width.
- Two shading modes: **SHADED** (intensity by volume) and **BINARY** (studied / not).
- Span ×1 / ×2, paging to previous / next epochs.
- Hover/tap a cell to inspect that day; today's cell pulses in ambient mode.
- Respects the user's week start (Monday / Sunday).

### Study Insights & Vault
- Current streak, longest streak, active days.
- Primary focus (top category), average session, peak day, all-time record, habit patterns.
- Data vault shortcuts: export JSON / CSV.

### Discovery panels
- **Lunar Calendar**: the month's moon phases computed client-side, today's illumination, and the next full / new moon.
- **Planetary Signal** (under the log stream on desktop; after the lunar calendar on phones): what the Earth and Sun did since the last study session (or the last 24h, minimum 24h, maximum 7 days). Four strips on one time axis: M2.5+ earthquakes (USGS), solar flares, coronal mass ejections with Earth-arrival ETA, and geomagnetic storms on a 9-cell Kp meter (NASA DONKI). A ticker rotates notable events with links. Each feed degrades on its own (`CACHED` / `FEED OFFLINE`).

---

## 4. Progression and unlocks

### 4.1 Telemetry Clearance (rank system)
- **3,000 ranks per cycle**, spanning **0 → 1,000 hours**.
- **10 divisions** × 300 ranks, each with its own color:

  | Div | Name | Hours (per cycle) | Color |
  |---|---|---|---|
  | 01 | INITIATE | 0–50 | `#a1a1aa` |
  | 02 | CADET | 50–150 | `#38bdf8` |
  | 03 | OPERATOR | 150–250 | `#10b981` |
  | 04 | SPECIALIST | 250–350 | `#06b6d4` |
  | 05 | VANGUARD | 350–450 | `#6366f1` |
  | 06 | ARCHITECT | 450–550 | `#a855f7` |
  | 07 | OVERSEER | 550–650 | `#ec4899` |
  | 08 | SENTINEL | 650–750 | `#f97316` |
  | 09 | SOVEREIGN | 750–875 | `#eab308` |
  | 10 | MONOLITH | 875–1,000 | `#f43f5e` |

- Each division has **15 archetypes × 20 grades (I–XX)** = 300 hand-authored titles (e.g. `BOOT NODE II`, `PULSE LISTENER I`, `CADET PROBATION I`).
- **41 major milestones** override titles at exact hours (`ZERO-HOUR INITIALIZATION`, `CENTURY LOCK // 100H`, `HALF-CYCLE MERIDIAN // 500H`, each `<DIVISION> SUMMIT`, `OMEGA MONOLITH // CYCLE COMPLETE` at 1,000H).
- Within a rank: progress %, hours to next rank, **5 sub-phase pips**.
- **Clearance Browser**: browse all 3,000 ranks and what each unlocks.
- **Ascension (prestige)**: at LV.3000 the user may Ascend — the display resets to LV.1 under a new cycle number; nothing is deleted. Badges: ✦×1 gold, ✦×2 platinum, ✦×3+ animated prism. A celebration modal plays on claim.
- Unlocks never regress: after the first Ascension, every rank-gated reward stays unlocked even if hours later drop.
- ⚠ Claimed Ascensions are stored in `localStorage` per username (`typbox_ascension_<username>`), not on the server.

### 4.2 Unlock tracks
Rewards unlock by **level**, **total hours**, **session count**, **longest single session**, **streak**, or **Ascension count**.

| Track | Free at start | Unlocked by |
|---|---|---|
| Surface Themes | 1 (MONOLITH STANDARD) | Clearance level, spread across all 3,000 ranks; 12 prestige themes by Ascension count |
| Chronometer faces | 6 | 330 gated: 258 by level, 25 by streak, 16 by session count, 16 by total hours, 10 by single-session length, 5 by Ascension |
| Ambient noise | 4 (brown, pink, white, 40Hz drone) | ~1 new profile every ~50 ranks |
| UI fonts | several code fonts | level, sessions, hours, streak, single session |

---

## 5. Personalization

### 5.1 Surface Themes (900 pairs + 12 prestige)
- Every theme is a **dark/light pair** (e.g. `CARBON BLACK ⇄ ALABASTER WHITE`) with a code, name, description, division, unlock level and accent color.
- Three plain series (no background patterns; a soft top glow and, in dark mode, an accent wash in the top corners) plus prestige:

  | Series | Code | Pairs | Character |
  |---|---|---|---|
  | CLASSIC | `CLS-001` | 300 | The most distinct palettes kept from the former archive and NEO SIGNAL waves |
  | CHROMA | `CHR-001` | 300 | Saturation contrast: a saturated layer (cards, page field, or edges only) against near-grey layers of the same hue |
  | COMPLEMENT | `HUE-001` | 300 | Hue contrast: a field hue answered by its opposite (180°) or near-opposite (±150°) hue, far apart in lightness |
  | PRESTIGE | `PRS-01` | 12 | Hand-composed SVG backdrops per polarity (kintsugi, neon halo, eclipse, accretion disk, aurora, monolith…), gated by Ascension count |

- Distribution: 90 pairs per division (30 of each series, interleaved so the unlock track alternates series).
- CHROMA / COMPLEMENT palettes are generated in OKLCH so every hue sits at the same perceived lightness; text is solved for contrast (main ≥ 8:1, muted ≥ 4.5:1 on every surface).
- Ids from retired themes are mapped to the closest CLASSIC palette (`aliases` in `surfaceThemeCatalog.json`).
- **Motion FX** (prestige only, switchable off): dust, stars, embers, glitch, pulse, matrix, aurora, sweep.
- Readability rules: art and FX sit behind everything (z-index −1), only visible through gutters; panels are always opaque. Prestige art is pinned to the viewport.
- Light/dark toggle switches polarity within the chosen pair.

### 5.2 Chronometer faces (336)
Families: CORE 18, DEVICE 40, PIXEL 29, CYBER 41, CODE 24, SCRIPT 46, CLASSIC 59, SIGNAL 27, DIAL 14, HAND 30, PRESTIGE 8.
Effects include neon, matrix, CRT scanlines, outline, glitch, nixie tubes, split-flap cells, sunset / holo / gold / quantum / chrome / fire / ice / aurora / ocean / rose-gold gradients, emboss, extrude, spray, ink, flicker, vapor, long shadow, pulse, chalk, stamp.
Numeral systems also cover letter numerals (Hebrew, Armenian, Georgian, Geʽez, Coptic, Gothic, Church Slavonic, Aegean, Brahmi), one-glyph-per-value sets (Braille cells, I Ching hexagrams, Tai Xuan tetragrams), a 12-hour clock, UTC, Mars time, Julian date, sidereal time and more.
Unlocks are spread across cycle 1 (LV.1–3000) and weighted toward the later divisions so new faces keep arriving all the way to LV.3000.

### 5.3 UI fonts (44)
Kinds: CODE 19, HUMANIST 10, RETRO 7, DISPLAY 8. Default is the system monospace; others load from Google Fonts (JetBrains Mono, IBM Plex Mono, Fira Code, Geist Mono, Atkinson Hyperlegible Mono…). Display faces apply to readouts only, never to long prose.

### 5.4 Profile
- Username, email, avatar: 12 icon presets (initial, terminal, cpu, code, zap, shield, globe, sparkles, flame, compass, layers, database) × 36 accent colors, or an uploaded image.
- **Statuses** (STATUS // LEARNER PROFILE): up to 12 from 206 options in 9 groups (field of study, school & pathway, current mission, study rhythm & planning, study method & setting, learner archetype, study fuel, hobbies, sports). Ids are never renamed; a removed id is silently dropped from accounts. `tracker/tests.py` checks the backend allowlist matches `userStatus.ts`.
- Timezone and week start (Mon/Sun); all week/month math follows them.

### 5.5 Settings modal tabs
`PROFILE` · `THEMES` · `FONTS` · `AMBIENT` · `CLEARANCE` · `SECURITY` · `DATA`

Preferences (theme, chronometer face, font, weather style/unit/visibility, surface FX, ambient scene/clock/dim, statuses) sync to the server via the user profile, so they follow the account across devices.

---

## 6. Weather

- Live weather from **Open-Meteo** (no API key), shown as a badge in the chronometer header with an expandable panel.
- °C / °F, can be hidden.
- **33 display styles**: line icons, minimal text, pixel art, ASCII art, emoji, cyber HUD, aviation METAR, kanji seal, Unicode glyph, thermometer, signal LED, neon sign, sticker, terminal, LCD segment, tear-off calendar, split-flap, dot matrix, temperature scale, Beaufort, JMA map symbol, haiku, windsock, barometer, Morse code, local forecast, nixie tube, station plot, Doppler radar, binary, Braille, barcode, aura.

---

## 7. Focus environment

### 7.1 Ambient noise (60 profiles, Web Audio)
- Fully synthesized in the browser (no audio files): colored noise + filters + optional LFO and oscillator drone layers.
- 8 families: **Brown / Rumble** 10, **Pink / Rain** 10, **White / Static** 10, **Blue / Shimmer** 6, **Violet / Sizzle** 6, **Nature / LFO** 8, **Mechanical** 6, **Drone / Pad** 4. Examples: submarine engine hum, tin roof rainfall, server room, satellite uplink, ocean wave swell, coffee shop murmur, Tibetan singing bowl.
- **Soundscape mixer**: up to 5 layers, each with its own fader, into one master.
- **Sleep timer**: 15 / 30 / 45 / 60 / 90 / 120 / 180 min (max 12h), with a 20s fade scheduled on the audio clock so it lands even when the tab is throttled.
- Mobile hardening: iOS `audioSession = 'playback'`; Android audio wake-lock workaround so sound survives screen-off.

### 7.2 Ambient overlay (23 scenes)
- Full-screen canvas scene with an optional clock and 5 dim levels (from NONE upward).
- Every scene is a variation on **ORBITAL CLOCK**: three planets on concentric orbits tracking the real hour, minute and second, each with a progress arc from 12 o'clock. One orbital engine (`ambientThemes.ts`) owns the clock math and layout; the orbit center drifts slowly so a long session never burns the same pixels into an OLED panel.
- Scenes: accretion disk, rain orbit, frost orbit, star chart, firefly orbit, bubble orrery, sakura orbit, ember orbit, glyph orbit, constellation orbit, aurora orbit, ripple clock, synthwave orbit, comet clock, lava orbit, vector scope, autumn orbit, warp orbit, lantern orbit, galactic orbit, code orbit, orbital clock, prism orbit.
- Keeps the screen awake while shown.

---

## 8. Sharing

### Status Card generator
- Renders one 1:1 share image (1080×1080) on a canvas: username, avatar, clearance rank and progress ring, total / week / month hours, current & longest streak, an activity heatmap shaded by minutes per day, optional category split.
- The background and colors follow the user's active Surface Theme and polarity (palette, accent wash, PRESTIGE art).
- Download PNG or copy to clipboard.

---

## 9. Data, account and public APIs

### Data archive
- **Export** JSON (full backup) and CSV.
- **Import** a JSON backup: merges categories by code and skips duplicate logs (matched on category, date, duration, created_at).
- **Reset study logs & categories** (type `CLEAR` to confirm; only the account is kept, so a backup can be imported cleanly afterwards).
- **Delete account** (type username to confirm).

### Account
- Register, log in (JWT, 1-day access / 7-day refresh), password change, password reset by email.
- Rate-limited register / login / reset endpoints.
- Guest mode: a landing banner (`PUBLIC GUEST MODE // STANDBY`) with sign-in / create-account.

### Public endpoints (backend)
| Endpoint | Purpose |
|---|---|
| `GET /api/hub/telemetry/` | Aggregate totals, per-category week/month hours and 5 recent logs, for logs with `is_public_to_hub` |
| `GET /api/portfolio/feed/` | Read-only feed for rikutomikado.tech: only `PORTFOLIO_USERNAME`'s logs, last `PORTFOLIO_FEED_DAYS` days, `is_public_to_portfolio=True` |
| `GET /api/planetary/signal/` | USGS + NASA DONKI proxy for Planetary Signal: 7-day window, per-source cache with stale fallback; DONKI key in `NASA_API_KEY` |

### Platform details
- Frontend: React 19 + Vite + Tailwind 4 + lucide-react. Backend: Django + DRF + SimpleJWT, PostgreSQL in production.
- Splash loader (geometric origami) on first load, toast system, `prefers-reduced-motion` respected throughout.
- Logo is protected from casual copying (no select / drag / long-press save).
- UI strings are centralized in `i18n.strings.ts` (currently English only).

---

## 10. Retired

- **EXPLORE MAP** (removed in migration 0011): its 100 region rewards became the pixel-art "region" Surface Themes.
- **Archive / NEO SIGNAL / pixel-art Surface Themes** (2026-10): 900 themes with background patterns, motion FX and scene art, replaced by CLASSIC (300 curated from them, made plain), CHROMA and COMPLEMENT. Saved ids map to the closest CLASSIC theme.
