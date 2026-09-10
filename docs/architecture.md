# Prismatic — Architecture Plan

## Stack Rationale
- **Vite + React + TypeScript (strict)** — Vite chosen over SSR frameworks (Next/Nuxt) because Prismatic is frontend-only, local-first, with no server rendering benefit; keeps build simple and deployable to any static host. Strict TS required.
- **Tailwind CSS** — design tokens via CSS variables; rapid iteration on dense data UI.
- **Radix primitives / shadcn** — accessible primitives without heavy design lock-in.
- **Zustand** — minimal shared UI state (analysis state, theme, dataset ref, UI ephemeral). Full dataset never lives in React/Zustand.
- **TanStack Table + Virtual** — column control + windowed rendering; avoids DOM explosion for 100k rows.
- **ECharts (modular imports)** — performant, feature-rich; modular imports keep bundle lean vs Recharts/Victory bloat.
- **Dexie (IndexedDB)** — saved views + imported datasets persistence.
- **Papa Parse** — battle-tested CSV parsing (worker-friendly).
- **date-fns** — lightweight date ops.
- **Zod** — runtime validation for URL state + CSV rows.
- **Vitest + RTL + Playwright + axe-core** — required test tiers.

## High-Level Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│ React UI                                                        │
│  Layout (Nav/Header/FilterBar/KPI/ChartGrid/Table/Drawer)       │
│  Zustand analysisStore (filters, search, sort, grouping, cols) │
│        │                                                        │
│        ├──> useUrlSync  ── Zod schema ── History API           │
│        ├──> useWorkerAnalytics (requestId, revision)            │
│        └───────────────┐                                        │
├────────────────────────┼────────────────────────────────────────┤
│ Persistence Boundary   │  Dexie (savedViews, datasetsMeta,   │
│ IndexedDB              │         importedRowsBlob)              │
│                        │  localStorage (theme)                  │
├────────────────────────┴────────────────────────────────────────┤
│ Worker Client (main thread)                                     │
│  workerClient.ts — typed request/response, revision guard,      │
│                     chunk yield, termination cleanup            │
│                        │  postMessage                           │
├────────────────────────┼────────────────────────────────────────┤
│ Web Worker (engine)    │  Owns full dataset (Array<CommerceRecord>)│
│  generation.ts         │  query/filter/search/sort/aggregation  │
│  query.ts (pure)       │  contracts.ts (WorkerRequest/Response) │
│  aggregation.ts        │  CSV export builder                    │
└────────────────────────┴────────────────────────────────────────┘
```

## Module Layout
```
src/
  app/App.tsx, main.tsx, router
  components/ui/*  (button, badge, dialog, sheet, select, etc.)
  components/layout/* (Shell, TopHeader, FilterBar)
  features/analytics/components/* (KpiCards, Charts)
  features/records/* (RecordsTable, RecordDrawer)
  features/datasets/* (DataSourcesPage)
  features/saved-views/*
  engine/generation/* (seeded.ts, dataset.ts)
  engine/query/* (filter.ts, sort.ts, search.ts, paginate.ts)
  engine/aggregation/* (kpi.ts, timeSeries.ts, category.ts, region.ts)
  engine/contracts/* (types.ts, schemas.ts)
  workers/analytics.worker.ts
  lib/workerClient.ts
  lib/persistence/db.ts
  lib/url-state/*
  lib/csv/*
  lib/formatting/*
  styles/tokens.css
  test/*
docs/
```

## Canonical Analysis State
Single source of truth — every chart/KPI/table subscribes to the same filtered result.
```ts
type AnalysisState = {
  datasetId: string; // "demo-v1" | imported:<id>
  filters: {
    dateRange: [string, string] | null; // ISO inclusive
    regions: string[]; categories: string[]; channels: Channel[]; segments: CustomerSegment[]; statuses: Status[];
    search: string;
  };
  sort: { column: ColumnId; direction: "asc"|"desc" };
  timeGrouping: "day"|"week"|"month"; // derived/auto but storable
  columnVisibility: Record<ColumnId, boolean>;
};
```
- Filtering: OR within a multi-select field, AND across fields, inclusive dates, case-insensitive search on id/productName/country.
- Search combines as AND with other filters.
- Sorting: stable secondary sort on `id`.

## Worker Contracts
```ts
type WorkerRequest =
 | { requestId:string; type:"INITIALIZE_DEMO"; payload:{ seed:number; schemaVersion:string } }
 | { requestId:string; type:"QUERY_ANALYTICS"; payload:{ revision:number; analysis:AnalysisState; timeGrouping:TimeGrouping } }
 | { requestId:string; type:"GET_ROWS"; payload:{ revision:number; analysis:AnalysisState; offset:number; limit:number } }
 | { requestId:string; type:"GET_RECORD"; payload:{ id:string } }
 | { requestId:string; type:"IMPORT_DATASET"; payload:{ datasetMeta:DatasetMeta; records:CommerceRecord[] } }
 | { requestId:string; type:"EXPORT_FILTERED"; payload:{ revision:number; analysis:AnalysisState } }
type WorkerResponse = { requestId:string; revision?:number; type:"READY"|"ANALYTICS_RESULT"|"ROWS_RESULT"|"RECORD_RESULT"|"EXPORT_RESULT"|"ERROR"; payload:any; error?:{code:string; message:string} }
```
- Client attaches monotonically increasing `revision`; ignores responses with older revision (stale protection).
- Expensive loops chunked (yield via `setTimeout(0)` / cooperative cancellation flag) so superseded jobs stop early.

## Persistence Boundaries
- **IndexedDB (Dexie):** `savedViews`, `datasets` (meta + blob for imported up to 250k rows). Demo dataset never persisted — regenerated deterministically.
- **URL:** versioned `v=2` schema; Zod validates; compact serialization (e.g., `r=NA-EU&c=Electronics...`). `replaceState` for debounced search; `pushState` for committed filter commits. Loop guard: `isApplyingUrl` flag.
- **localStorage:** theme only.

## Data Generation (deterministic)
- Mulberry32 seeded PRNG; fixed seed per schema version.
- Date range: 2022-01-01 to 2024-12-31 (36 months) to satisfy ≥24 months; seasonal multipliers (Q4 boost, summer dip), channel/category margins, Regional composition aligned to country lists.
- 100k records, integer cents, profit = revenue - cost, occasional loss-makers (cost > revenue).
- Generator runs inside worker; main thread shows progress.

## Table Windowing
- Worker returns bounded pages (e.g., 100-row windows). Main caches by `queryKey = hash(analysis+sort)`.
- Invalidates cache on filter/sort change; cancels inflight window fetches.
- TanStack Virtual renders only visible rows (overscan 10); placeholders for uncached windows trigger fetch.
- Never one request per row.

## Chart Integration
- ECharts modular import (`echarts/core` + bar/line + tooltip/grid). ResizeObserver + dispose on unmount. Theme-aware colors via CSS variables. Provide `View data` accessible table + textual summary + keyboard filter toggles duplicate chart interactions.

## Security / Privacy
- No data leaves browser. Import warning in UI.
- CSV export sanitizes leading `= + - @ | %` in text fields; numeric fields preserved.
- No `dangerouslySetInnerHTML`, no secrets, strict Zod on external inputs.

## Testing Strategy
- Unit: pure query/aggregation with hand-authored dataset.
- Component: chips, clear filters, KPI zero states, saved-view validation, import errors.
- Integration: worker client stale-rejection, dataset switching, cache invalidation.
- E2E (Playwright): 14 prescribed scenarios + axe on main pages/dialogs.

## Performance Instrumentation
- `performance.mark/measure` around generation, worker query, filter→render. Overlay panel exposes median/p95 when benchmark mode enabled.

## Trade-offs Documented
- Worker over main-thread scans to keep controls responsive.
- Windowing over full dataset copy to bound memory/render cost.
- Vite over SSR — no SEO requirement, static hosting preferred.
