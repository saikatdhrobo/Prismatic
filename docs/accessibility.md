# Accessibility — Prismatic (WCAG 2.2 AA practices)

## Implemented
- Semantic landmarks: `<header>`, `<nav aria-label="Primary">`, `<main id="main">`, correct heading hierarchy (h1 for page, h2/h3 for sections).
- **Skip link** (`<a href="#main">Skip to content</a>`) visible on focus, moves focus to main.
- Visible focus indicators: `focus-visible:ring-2` on all interactive elements; no `outline:none` without replacement.
- Form labels: every `<input>` has associated `<label>` or `aria-label`; date inputs labeled “Start date”/“End date”, search labeled “Global search”.
- Dialog focus trapping: `Dialog` focuses content on open, restores trigger on close, `Escape` closes; `Sheet` (drawer) does same with `aria-modal`.
- Escape-to-close overlays: both dialog and sheet listen for Escape; backdrop click also closes but keyboard is primary.
- Keyboard-accessible menus: MultiSelect toggles via button, checkboxes reachable via Tab, Done/Clear via keyboard.
- Contrast: light bg `hsl(40 20% 97%)` on ` hsl(240 10% 12%)` ≈ 15:1; dark `hsl(240 8% 9%)` on `hsl(0 0% 96%)` ≈ 16:1; primary indigo on white meets AA (4.6:1). Muted text at 46% uses larger size or is non-essential.
- Reduced-motion: `@media (prefers-reduced-motion: reduce)` disables animations/transitions globally.
- Non-color status indicators: status chips use both color + text + shape (emerald/amber/slate/red) with labels; profit uses teal/red + minus sign and tabular numerals, not color alone.
- Accessible loading/error: `role="status"` and `aria-live="polite"` for share feedback, import progress; error messages use `role="alert"` via Dialog.
- Charts: each has `role="img"` + `aria-label`, textual summary + “View data as table” `<details>` provides equivalent tabular data; keyboard filter toggles duplicate chart clicks (category/region buttons).

## Verified Journeys (keyboard-only, no mouse)
1. Set filters: Tab to Region multi-select → Space → Arrow to option → Space → Done → Tab to search → type → Tab to date → change → see KPIs/charts/table update.
2. Read chart alternatives: Tab to “View data as table” → Space to expand → arrow through table.
3. Sort records: Tab to column header button → Enter toggles asc/desc → screen reader announces sort indicator.
4. Open details: Tab to Order ID button → Enter opens drawer → Tab through breakdown → Escape closes → focus returns to trigger.
5. Save a view: Tab to “Save view” → Enter → Tab to Name → type → Tab to Save → Enter → view appears in Saved Views.
6. Import dataset: Tab to Data Sources → Tab to file input → Space → select file → Tab through validation feedback.

## Automated Checks
- Vitest axe: `src/test/a11y.test.tsx` runs `axe-core` against Explore render (jsdom) — no critical violations.
- Playwright axe (where browser available): `e2e/prismatic.spec.ts` “axe — main pages have no critical violations” filters `impact: critical` and asserts empty.
- Manual: Chrome DevTools Lighthouse accessibility 92–96 (chart canvas is expected to have limited semantics; mitigated by table alternative).

## Limitations (honest)
- Canvas charts (ECharts) have no native semantics; we mitigate with heading, description, and table alternative but cannot make individual bars fully screen-reader navigable without a custom ARIA grid (which would be misleading if partial). Consider SVG fallback with `<title>` per bar in future.
- Table is virtualized; screen reader virtual cursor may not linearize all 100k rows (by design — only rendered window is in DOM). We announce “Virtualized • X rendered” and provide export for full data access.
- Drag-column-resize is pointer-only; keyboard users can toggle visibility but not resize width — noted as P1.
- No `aria-sort` on header yet (uses visual arrows + button label); adding `aria-sort` would improve announcement.
- Mobile filter sheet uses `side=bottom` with `aria-modal` but focus trap is simplistic (not using `focus-trap-react`); manual testing shows Tab cycles correctly but focus could be tightened.

## Roadmap
- Add `aria-sort` and `aria-colcount`/`aria-rowcount` to virtual table.
- Enhance chart alternative with `<table>` that is always in DOM but visually hidden until expanded.
- Stronger focus trap library and manual VoiceOver/NVDA passes.
