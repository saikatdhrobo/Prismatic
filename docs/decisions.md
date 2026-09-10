# Decisions Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-09-10 | Vite over Next.js | Local-first, static host, no SSR need; simpler build. | Next — rejected: unused SSR, heavier config. |
| 2026-09-10 | Zustand over Redux | Minimal shared UI state; less boilerplate; worker owns data. | Redux Toolkit — heavier for this shape. |
| 2026-09-10 | ECharts modular | Large-data perf + rich interactions; modular imports keep bundle <500k gz. | Recharts (SVG perf), Victory — less suited to 100k bucket aggregation. |
| 2026-09-10 | Worker cooperative cancellation | Chunked loops yield every N records; checks revision flag. | AbortController — not sufficient inside tight loops. |
| 2026-09-10 | Windowing 100-row pages + query-keyed cache | Bounds memory/render; avoids per-row requests. | Infinite full-dataset to main — OOM risk. |
| 2026-09-10 | Zod for URL + CSV | Runtime safety at boundaries; versioned schema tolerates future links. | Manual parsing — error-prone. |
| 2026-09-10 | No React Query | No async data-source abstraction benefit; worker client suffices. | Adding RQ would duplicate caching semantics. |

Add entries as trade-offs emerge.
