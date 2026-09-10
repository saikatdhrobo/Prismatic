# Prismatic — Product Brief

## Elevator Pitch
**Prismatic** — *Turn complex data into clear decisions.*  
A local-first, browser-only commerce analytics explorer for operations analysts who need to slice revenue, order volume, and profitability across time, region, category, and channel without leaving the browser or downloading a spreadsheet.

## Problem
Analysts routinely export large CSVs to answer “how did revenue/profit shift across regions/categories/channels over time?” Spreadsheets are slow, error-prone, and opaque about data provenance. Cloud BI tools require auth, ingestion pipelines, and governance overhead before a single chart appears.

## Audience
- **Primary:** Operations analyst (needs fast slicing, accurate KPIs, shareable views).
- **Secondary:** Founder / PM exploring demo data; student learning analytics concepts.

## Core User Story
> “As an operations analyst, I want to understand how revenue, order volume, and profitability vary across time, regions, categories, and sales channels without downloading a spreadsheet.”

## Key Journeys
1. Open app → see 100k-record synthetic demo (no signup).
2. Drag date range, toggle category/region/channel → KPIs + 3 linked charts + table update together.
3. Click chart bar/region → filters that dimension; see active filter chips.
4. Search product/order, sort table, open record drawer.
5. Save view (IndexedDB), reload, view persists.
6. Copy share URL → recipient opens identical filtered demo view.
7. Import own CSV (validated, local-only), switch dataset, export filtered results.

## Scope — P0 (must ship)
- App shell (nav, header, filter bar, KPI row, chart grid, virtualized table, drawer).
- Deterministic 100k synthetic dataset (seeded, 24+ months, seasonal, channel/category deltas, loss-makers).
- Web Worker analytics engine (typed contracts, stale-result protection, chunked yield).
- KPI cards (net revenue, completed orders, AOV, profit margin) + sparklines + prior-period comparison.
- 3 linked charts: revenue over time, revenue by category, orders by region.
- Global filtering (date, region, category, channel, segment, status, search) — OR within field, AND between fields.
- Virtualized records table (TanStack Table + Virtual), worker-backed sorting, column controls, export.
- Record details drawer.
- Saved views (IndexedDB/Dexie).
- URL-based analysis state (Zod, versioned, push/replace semantics).
- CSV import/export (25 MB / 250k rows, validation, formula-injection sanitization).
- Light/dark themes, responsive layouts (desktop/tablet/mobile).

## P1 (only after P0 stable)
- Chart/table focus mode, command palette (⌘K), larger benchmark mode, extra chart modes.

## Explicit Non-Goals
No auth, billing, AI chat, fake collaboration, fake prod data, generic dashboard builder, or nonfunctional settings.

## Success Criteria
- `npm run dev` launches; `npm run build` succeeds.
- Filter-to-render <500 ms warm on documented desktop for 100k rows.
- All P0 workflows keyboard-accessible; axe checks pass on main pages/dialogs.
- Tests cover generation, filter semantics, aggregation, sorting, KPI edges, URL round-trips, CSV escaping/sanitization.
- Playwright covers 14 prescribed E2E scenarios.
- Docs + README match implementation; no dead buttons.

## Risks (highest first)
1. Worker ↔ UI synchronization & stale-result handling.
2. Virtualized table performance + cache invalidation (bounded windows vs per-row requests).
3. URL state versioning + history loop prevention + imported-dataset missing-state.
4. Deterministic 100k generation without blocking main thread.
5. ECharts modular imports + ResizeObserver lifecycle + theming.
6. CSV parsing/mapping/validation off main thread with quota handling.

## Metrics (how we claim performance honestly)
- Instrument: generation/load, worker query duration, end-to-end filter→render, import duration, rendered row count.
- Report cold vs warm, worker vs visible completion, median/p95 over repeatable scenarios, with device/browser details.
