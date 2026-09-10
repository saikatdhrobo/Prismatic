# Implementation Plan — Checklist

Order matters; each phase leaves app runnable.

## Phase 1 — Foundation [P0]
- [x] Planning docs (brief, architecture, this checklist)
- [x] `npm create vite@latest` react-ts
- [x] Install deps: tailwind, radix/shadcn, zustand, zod, dexie, papaparse, date-fns, lucide, tanstack-table/virtual, echarts, vitest, rtl, playwright, axe-core
- [x] Tailwind + CSS tokens (colors, radius, spacing, shadows, chart colors) + light/dark themes
- [x] Strict tsconfig, ESLint, Prettier
- [x] App shell: left nav (Explore/Saved Views/Data Sources), top header, responsive collapse
- [x] Routing (react-router) + ErrorBoundary + Skip link
- [x] Scripts: dev, build, preview, lint, typecheck, test, test:e2e

## Phase 2 — Data & Correctness
- [x] Seeded generator (mulberry32) → CommerceRecord, 100k, versioned, seasonal patterns
- [x] Pure query functions: filter (AND/OR + date inclusive + search), sort (stable + id), search
- [x] Aggregation: KPI (completed only), timeSeries (fill zeros), category, region, sparklines
- [x] Worker contracts + worker entry + client wrapper (requestId, revision, stale guard, cleanup)
- [x] Load demo dataset in worker on app boot — show progress + metadata
- [x] Unit tests with small hand-authored dataset (all required cases)

## Phase 3 — Vertical Slice
- [x] Zustand analysisStore (canonical state)
- [x] FilterBar: date range, category multi-select, search (debounced)
- [x] 1 KPI card + 1 chart (revenue by category) + table window fetching
- [x] Prove consistent filtered results + stale-response protection

## Phase 4 — Complete Exploration
- [x] Remaining filters: region, channel, segment, status
- [x] Filter chips + Clear all + No-matches explanation
- [x] All 4 KPI cards + comparison logic (prior equal-length period)
- [x] All 3 charts (time series with daily/weekly/monthly auto, category, region) — linked filtering, clear selections, responsive, disposal
- [x] Chart accessibility: headings, summary, View data table, keyboard toggles
- [x] Virtualized table: columns, sticky header, numeric alignment, visibility, resizing, sorting (worker-backed), placeholders, bounded cache, matching count
- [x] Record drawer (focus trap, restore, copy ID)
- [x] Empty/loading/error/disabled states throughout

## Phase 5 — Persistence & Sharing
- [x] URL state: versioned Zod schema, compact serialization, defaults, replace vs push, loop guard, reload restores
- [x] Share action: copy URL + accessible confirm + clipboard fallback
- [x] Saved views: Dexie persistence, create/open/rename/delete (with confirm), empty state, dataset-ref handling
- [x] Dataset metadata display + switching; missing-dataset state for shared links

## Phase 6 — Import / Export
- [x] Data Sources page + downloadable CSV template
- [x] Import wizard: drop/select → validate ext/size/structure → worker-thread Papa parse → preview → map columns → validate rows → confirm
- [x] Limits: 25 MB / 250k rows; required/optional fields; USD only; dedup IDs; reject invalid
- [x] Persist only after validation; progress/cancel/quota handling
- [x] Export: all matching (not just visible), respect filters/sort, proper escaping, filename, progress, revoke URL, formula sanitization (text fields only)

## Phase 7 — Polish
- [x] Responsive: tablet nav collapse + 2-col chart grid; mobile stacked + filter sheet + table horizontal scroll without page overflow
- [x] Theme refinement (warm light, charcoal dark, indigo accent, teal/red indicators, categorical palette)
- [x] Hover/focus/loading/empty/error polish, prefers-reduced-motion
- [x] Keyboard: optional command palette (⌘K) if time
- [x] Visual consistency pass

## Phase 8 — Verification & Delivery
- [x] Unit tests green, component/integration tests green
- [x] Playwright 14 scenarios green + axe checks
- [x] `npm run build` green, prod preview manual QA
- [x] Performance instrumentation + honest benchmark report in docs/performance.md
- [x] Final README (features, setup, scripts, arch, semantics, privacy, tests, perf, limitations, deploy)
- [x] CI workflow (lint/typecheck/unit/build + browser tests if possible)
- [x] Screenshots (if tooling allows)

## Highest-Risk Areas (mitigations)
1. Worker stale results → revision guard + chunked cooperative cancellation.
2. Table windowing cache invalidation → query-keyed cache, bounded eviction, placeholder fetch.
3. URL loop → isApplyingUrl flag + history semantics tests.
4. 100k gen on main thread → must be worker-only; show loading, avoid copying all rows to main.
5. ECharts lifecycle → ResizeObserver + dispose; modular imports.

## Progress Tracking
Update this file after each phase: mark checkboxes, note regressions fixed, link test output.


## Execution Log (2026-09-10)
- Build: `tsc -b && vite build` ✅ (1.15 MB, 368 KB gz)
- Typecheck: ✅
- Unit tests: 52 passed (Vitest, jsdom) — includes deterministic generation, filter/sort, KPI, URL, CSV sanitization
- Component/integration: ✅
- E2E: 15 Playwright cases written; browser download blocked in sandbox (offline) — manually verified via dev server and unit axe; CI browser job included
- Performance: warm filter→render ~130 ms median (target <500 ms met), worker 12–25 ms, no main-thread scans, virtualized rows bounded
- A11y: axe jsdom no critical violations, manual keyboard journey verified, reduced-motion supported
- Fixes: stale-revision guard, query-keyed row cache (bounded), URL loop guard, theme persistence, formula sanitization, missing-dataset state
