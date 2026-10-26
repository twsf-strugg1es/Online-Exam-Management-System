# 4. UI and UX Design Brief: TestKori

Purpose: give the app a consistent, usable visual direction.
Status: living document · Last updated 2026-10-12 · Implemented in `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/src/components/ui.js`.

> **The short version:** quiet, clear, fast. One obvious next step on every screen. Nothing moves unless it has to. It must feel instant on a 5-year-old Android phone on 3G.

## Audience and tone

- **Audience:** global, launching in Bangladesh. Students (mostly 15–25), teachers, trainers and HR teams, **on desktop and laptop browsers** (v1 is desktop only; phones get the landing page). Many use old, low-spec PCs and slow connections. **Design for the weakest PC, the slowest connection and a stressed user first.**
- **Three adjectives:** **calm · clear · trustworthy.**
- **Voice:** plain, specific, sentence case, short. Say what happens and why ("Leaving fullscreen hides the questions. It's recorded."). No hype, exclamation marks, emoji or jokes. Never claim cheating is impossible.
- **Avoid the "AI template" look:** purple/blue gradients, glassmorphism and blur, glowing shadows, oversized hero illustrations, decorative blobs, rows of identical cards with icons, gradient text, everything rounded to 24 px.

## Design principles

1. **One primary action per screen.** Exactly one filled (brand) button is visible at a time; everything else is secondary or ghost.
2. **Content over chrome.** No decorative containers. A card exists only to group things that belong together. Prefer whitespace and a 1 px line to boxes inside boxes.
3. **Sensible defaults, progressive disclosure.** Integrity protections are on by default; advanced settings sit behind "More options". A new examiner can publish an exam by touching only title, time and questions.
4. **Say it once.** No subtitles that repeat the title, and no helper text that states the obvious.
5. **Feedback without fuss.** Every action shows a result within 100 ms (pressed state, then a spinner if needed). Success is a quiet state change, not a celebration.
6. **Stillness by default.** Motion is used only to explain a change of state (a dialog opening), never for decoration.
7. **Fast is a feature.** If a design choice costs performance on a cheap phone (blur, large shadows, big images, web fonts in many weights), drop it.

## Reference products

| Product | Borrow | Avoid |
|---|---|---|
| Linear | Quiet density, restrained color, crisp lists | Dark-only look, tiny text |
| Stripe Dashboard | Tables, status badges, stat rows, empty states | Marketing gradients |
| Google Forms | Question layouts students already know | Weak hierarchy, no time/status feedback |
| Notion | Calm typography, generous line height | Too-hidden controls |
| Paper answer sheets | Green "official" color, ruled-line motif (login panel only) | Paper textures, skeuomorphism |

## Color palette

Colors are CSS variables in RGB channels (`--brand: 11 110 79`) so Tailwind can apply opacity (`bg-brand/10`). **Components use token names only, never hex.**

| Token | Role | Light | Dark |
|---|---|---|---|
| `paper` | Page background | `#F7F6F2` | `#0E1012` |
| `surface` | Cards, dialogs | `#FFFFFF` | `#16191D` |
| `sunken` | Inputs, table headers, wells | `#F1F0EB` | `#1D2126` |
| `ink` | Primary text | `#16181D` | `#ECEDEE` |
| `muted` | Secondary text | `#5F6570` | `#9AA0AA` |
| `line` | Borders, dividers | `#E3E1DA` | `#2C3037` |
| `brand` | The one primary action, active state | `#0B6E4F` | `#34B98A` |
| `brand-strong` / `-soft` / `-ink` | Hover / tint / text on the tint | `#08573F` / `#E2F1EA` / `#064E38` | `#52CCA0` / `#123429` / `#8CE1C0` |
| `danger` (+ soft/ink) | Destructive, high risk, violations | `#BE2732` | `#F0626A` |
| `warn` (+ soft/ink) | Needs review, time running low | `#B56A00` | `#E6A53C` |
| `info` (+ soft/ink) | Scheduled, neutral notices | `#2563C7` | `#6EA0F5` |
| `on-brand` | Text on brand buttons | `#FFFFFF` | `#06261C` |

Usage rules:
- **About 90% of any screen is neutral** (paper, surface, ink, muted, line). Brand green marks the primary action and the current location only. Status colors appear only where there is a status.
- Semantic mapping: Live = brand · Scheduled = info · Draft/Closed = neutral · Clean = brand · Review = warn · High risk = danger.
- Status is never shown by color alone: badges always carry text.
- The login side panel is the only large area of color (`#0B3D2E`, faint ruled lines).

## Typography

| Use | Style |
|---|---|
| Page title | 24 px / semibold / tight tracking |
| Section / card title | 15 px / semibold |
| Body | 14 px / regular / 1.5 line height |
| Exam question text | **17 px** (mobile) – 18 px / 1.6 line height: the most important text in the product |
| Secondary, hints | 12–13 px / muted |
| Eyebrow label | 12 px / medium / uppercase / 0.08em |
| Numbers (stats, timer, scores, codes) | Tabular figures; IBM Plex Mono for join codes |

- **Fonts:** IBM Plex Sans (Latin), Hind Siliguri (Bengali), IBM Plex Mono (codes). Self-hosted, `font-display: swap`, **only weights 400 / 500 / 600**, subset per script. Add Noto fallbacks only when a new script ships.
- At most **two type sizes per component** and **three per screen** (excluding the page title).
- Max line length about 70 characters for reading text (questions, descriptions).

## Components

Use `src/components/ui.js`. Don't hand-roll alternatives, and don't add new variants without updating this brief.

| Component | Rules |
|---|---|
| `Button` | `primary` (one per view), `secondary`, `ghost`, `danger` (inside confirm dialogs only), `danger-ghost`. Heights: 32 / 36 / **44 px on touch screens for primary exam actions**. Label = verb ("Publish exam", not "OK") |
| `Input`, `Select`, `Textarea`, `Field` | Label above, never placeholder-only. Hint below; the error replaces the hint. Native `<select>` and date inputs (lighter and familiar on mobile) |
| `Switch` | Settings with a one-line description (integrity options) |
| `Checkbox` | Multi-select lists (groups, multiple-choice answers) |
| `Card` | 12 px radius, 1 px `line` border, near-invisible shadow. No nested cards |
| `Badge` | Status only; short text; one badge per row where possible |
| `Alert` | Inline, at the top of the area it concerns; dismissible unless it's blocking |
| `Tabs` | Max 4; counts optional |
| `Modal` / `useConfirm()` | Only for confirmation or a short focused task. No multi-step flows in modals |
| `EmptyState` | Icon, one-line title, one sentence, one action |
| `PageHeader`, `Stat`, `Spinner`, `PageLoader` | Standard scaffolding |

Tailwind rule: class names written literally (lookup objects like `BUTTON_VARIANTS`), never built as `` `bg-${x}` ``.

## Layout rules

- **Desktop first, 1024 px minimum.** Design at 1280 × 800 (the most common laptop), check at 1024 × 768 and 1920 × 1080. Narrower than 1024 px the app shows the `DesktopOnly` screen; only the landing page, login and signup are responsive down to 360 px.
- **Widths:** content `max-w-6xl`; forms and reading `max-w-3xl`; the exam question column `max-w-2xl`.
- **Spacing scale (4 px base):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Page gutter 32 px. 24–32 px between sections; 16–20 px inside cards.
- **Staff screens:** lists and tables over card grids; use the width (side-by-side panels, sticky filters) instead of stacking.
- **Exam screen:** question column centered at reading width, question map in a fixed right rail, timer and violation chip in a slim top bar. Everything works by keyboard (number keys pick answers, arrow keys move between questions).
- **Pointer and keyboard first:** hover states behind `@media (hover: hover)`, shortcuts shown in tooltips, click targets at least 32 px.

## Screen notes

| Screen | Hierarchy (top → bottom) |
|---|---|
| Login / signup | Logo · title · 2–3 fields · primary button · one line of links. Desktop only: dark-green panel with the value proposition and a static integrity preview |
| Staff · Exams | Title + **New exam** · list rows: title, status badge, window, question count, protection icons, ⋯ menu |
| Staff · New exam | Details & schedule → Questions (searchable picker, selected count) → Who can take it → Integrity (defaults on, collapsed under "More options" except the violation limit) → sticky **Publish** / Save draft |
| Staff · Exam results | Stat row (Started · Submitted · Average · Need review) → tabs → search → table (student, score, risk, violations, Report · Grade) |
| Staff · Integrity report | Summary → protections in effect → timeline → note that events are signals, not proof |
| Candidate · Exams | Continue where you left off (warn) → Open now → Upcoming → Done. Each card: title, time left / opens at, one button |
| Candidate · Rules | Exam title · duration · question count · each protection in one plain sentence · **Start exam** (bottom) |
| Candidate · Exam | Slim top bar (title, violation chip, timer) · question · answers as large tap rows · bottom bar: Previous · question map · Next/Submit. The question map opens as a sheet on phones |
| Candidate · Blocked | Full-screen plain panel: what happened, that it was recorded, one button to return |
| Candidate · Finished | Outcome first (score or "Awaiting grading") · submit reason if not the student · View results |

## Flow rules

- **Candidate: two taps from the dashboard to the first question** (Start → Start exam). Never ask for anything else at exam time.
- **Examiner: create → publish in one screen.** No wizards.
- **Never lose input:** forms keep their values after an error; the exam saves continuously; leaving a page with unsaved changes asks first.
- **Undo over confirm** where it's cheap (removing a group member); **confirm** only for destructive or irreversible actions (delete exam, submit exam), and the confirm button repeats the verb ("Delete exam").
- **Errors explain the fix:** "This exam opens at 10:00 (Asia/Dhaka)", not "Bad request".
- Back always works; every screen has a URL.

## Motion

| Allowed | Duration | Where |
|---|---|---|
| Fade | 150 ms ease-out | Dialog/sheet backdrop, toasts |
| Short rise (6 px) | 150–200 ms | Dialog/sheet panel only |
| Color/opacity transition | 150 ms | Hover, pressed, focus |

- **Landing page exception:** restrained scroll-driven reveals and one signature scroll moment are allowed there (see `scroll-craft`), `transform` and `opacity` only, fully static under reduced motion. The app itself stays still.
- **Not allowed in the app:** page-load animations, staggered lists, parallax, bouncing, skeleton shimmer loops, animated gradients, looping or decorative animation.
- Spinners only after 300 ms of waiting (avoid flicker).
- The timer's last minute changes **color** (warn → danger); it does not pulse. The "Live" badge is static.
- Only `opacity` and `transform` are animated (GPU-cheap). Never animate layout, shadows or blur.
- `prefers-reduced-motion: reduce` turns all motion off.

## Performance budget (low-end PCs and slow connections)

Target device: an old office or lab PC (dual-core, 4 GB RAM, integrated graphics), Chrome or Edge, on a slow connection (throttled "Fast 3G": 1.6 Mbps, 150 ms RTT). The landing page is also budgeted for a mid-range phone.

| Metric | Budget |
|---|---|
| Initial JS for candidate routes | ≤ 170 KB gzipped (staff screens are code-split and loaded separately) |
| CSS | ≤ 30 KB gzipped |
| Fonts on first load | ≤ 3 files, ≤ 120 KB total (Latin subset; Bengali loaded only when needed) |
| Exam page: Largest Contentful Paint | ≤ 2.5 s on the target device/network |
| Interaction to Next Paint (tap an answer) | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.05 |
| Images | None in the UI chrome; question images lazy-loaded, sized, compressed (WebP) |

Rules that follow from the budget:
- **No `backdrop-blur`** anywhere (expensive on low-end GPUs); use solid or semi-opaque backgrounds.
- Shadows: only the two tokens (`card`, `pop`). Prefer borders.
- Route-level code splitting (`React.lazy`) so candidates never download staff screens.
- No heavy libraries for small jobs (date pickers, charts, animation libs). Native inputs and `Intl` first. Charts, when needed, load on demand.
- Lists over ~100 rows paginate or virtualize.
- Measure with Lighthouse (mobile) in CI once deployed. A PR that breaks the budget needs a written reason.

## Accessibility

- WCAG 2.2 AA: text contrast 4.5:1, UI elements 3:1, in both themes.
- Every input has a visible `<label>`; errors are announced (`role="alert"`); dialogs trap and restore focus; Esc closes.
- Full keyboard use with a visible focus ring (`:focus-visible`, 2 px brand).
- Click targets at least 32 × 32 px; answers are full-width rows. Landing page touch targets at least 44 × 44 px.
- Text scales to 200% without breaking layout; no text in images.
- Theme follows `prefers-color-scheme` on first visit; the choice is remembered.

## Internationalization rules (global audience)

- **No hardcoded copy.** Every visible string goes through the translation function once i18n lands. Keep sentences whole (no concatenation); plurals via i18n rules.
- **Allow ~40% text expansion.** No fixed widths on text; buttons wrap gracefully.
- **Right-to-left ready.** Logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`); directional icons flip.
- **Fonts per script**, loaded only when that language is used.
- **Locale formatting** via `Intl` for dates, times, numbers and currency; show the timezone for exam windows when it differs from the viewer's.
- **Neutral sample data** (names, places) in empty states, previews and marketing.

## Interaction states

| State | Treatment |
|---|---|
| Hover (pointer only) | Background `sunken` or `brand-strong`; no movement |
| Pressed | Slightly darker immediately (the 100 ms feedback rule) |
| Focus | 2 px brand ring with offset, keyboard only |
| Disabled | 50% opacity, no pointer events, with a reason nearby when not obvious |
| Loading | Button: spinner replaces the icon, label kept. Page: `PageLoader` after 300 ms. Never a blank screen |
| Error | Inline `Alert` with a server message that says how to fix it; field errors under the field |
| Success | Quiet inline state change or a short toast; no success dialogs |
| Empty | `EmptyState` with one action |
| Offline *(planned)* | Thin banner "Offline. Your answers are saved on this device and will sync." |
| Time running low | Timer color warn (5 min) → danger (1 min); no animation |

## Assets needed

| Asset | Status |
|---|---|
| **TestKori logo mark + wordmark** | **Needed (owner decision).** The current `Logo` in `ui.js` is the old PorikkhaKori mark (Bengali "প"). Direction: simple geometric mark on the brand green (a "T" or an answer-bubble/check motif), legible at 16 px, one color; wordmark "TestKori" in IBM Plex Sans semibold. SVG only |
| Favicon, PWA icons, `index.html` title, `manifest.json` | Update to TestKori (from the SVG mark) |
| Icons | Lucide via `react-icons/lu`, 16–18 px, stroke 1.75–2; only icons that add meaning |
| Illustrations | None by design |
| Email templates | Plain HTML: logo, one heading, one paragraph, one button; works without images |
| Marketing screenshots | After the pilot UI is final |

## Current code vs. this brief (to fix)

- `AppShell` mobile header and `Modal` backdrop use `backdrop-blur` → replace with solid/semi-opaque backgrounds.
- The timer pulses in the last 60 s and the "Live" badge pulses → change to static color states.
- Page-level `animate-rise-in` on auth forms → remove (keep it for dialogs only).
- No route-level code splitting yet → add `React.lazy` for staff routes.
- Fonts load the full families → subset, and load Bengali only when needed.

These are tracked as task 5.4 in the Implementation Plan.
