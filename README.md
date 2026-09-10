# Prismatic — Turn complex data into clear decisions.

Local-first, browser-only commerce analytics explorer. No signup, no backend, no upload. All analysis happens in your browser via a Web Worker.

![Synthetic demo data • 100k records • 2022-01-01 → 2024-12-31](https://img.shields.io/badge/demo-100k_synthetic-blue) ![Local--first](https://img.shields.io/badge/storage-IndexedDB_%2B_URL-green) ![TypeScript](https://img.shields.io/badge/TS-strict-3178C6)

> **“As an operations analyst, I want to understand how revenue, order volume, and profitability vary across time, regions, categories, and sales channels without downloading a spreadsheet.”**

---

## ✨ Implemented Features (P0 complete)

- **Application shell** — compact left nav (Explore / Saved Views / Data Sources), top workspace header, persistent filter toolbar, KPI row, chart grid, virtualized records, right drawer. Responsive: desktop (3-col charts), tablet (collapsed nav, 2-col), mobile (stacked charts, filter sheet, table horizontal scroll without page overflow).
- **Deterministic demo dataset** — 100,000 records, seed `0x50524953`, 2022-01-01 → 2024-12-31 (36 months), seasonal Q4 boost, channel/category deltas, ~12% loss-makers, integer cents, `profit = revenue - cost`. Generated inside the Worker.
- **Worker-based analytics engine** — Worker owns full dataset; main thread holds only `AnalysisState` + windowed rows. Typed contracts (`WorkerRequest`/`WorkerResponse`), `revision` stale-result protection, chunked yielding, termination cleanup.
- **KPI cards** — Net revenue, Completed orders, AOV, Profit margin (Completed only), prior-period comparison (immediately preceding equal-length range), sparklines, tooltips with definitions, zero-denominator handling.
- **Three linked charts** — Revenue over time (line, day/week/month auto-fill zeros), Revenue by category (bar, click toggles category), Orders by region (bar, click toggles region). Same filter semantics, responsive ResizeObserver, disposal, theme-aware, keyboard-operable filter buttons + textual “View data” table.
- **Global filtering** — Date range (inclusive), Region/Category/Channel/Segment/Status multi-select (OR within field, AND between fields), debounced global search (id, product, country, case-insensitive, AND with others), active filter chips, clear individual / clear all, matching count, no-matches explanation.
- **Virtualized records table** — TanStack Table + TanStack Virtual, worker-backed sorting (stable secondary on id), column visibility, sticky header, right-aligned numeric cells, currency formatting, bounded 100-row windows, query-keyed cache (bounded 20 windows), placeholders, matching count/visible range, export filtered, details drawer (focus restore, copy ID).
- **Saved views** — IndexedDB (Dexie) persistence: create/open/rename/delete (with confirm), empty state, dataset reference handling.
- **URL-based analysis state** — Versioned (`v=2`) Zod-validated, compact serialization (`?dr=2024-01-01_2024-03-31&r=Europe&c=Books`), `replaceState` for typing, `pushState` for committed changes, reload restores, back/forward restores, no raw dataset in URL, missing-imported-dataset warning.
- **CSV import/export** — Template download, drop/select, size 25 MB / 250k rows limits, header/row validation, Papa Parse off main thread, preview, column mapping, valid/invalid counts, error examples, confirm valid-only import, progress/cancel/quota handling, local-only warning. Export respects filters/sorting, proper escaping, meaningful filename, progress, revoke, formula-injection sanitization (`'=` prefix for text fields).
- **Themes** — light (warm neutral) / dark (deep charcoal), indigo primary, teal/ muted red indicators, categorical palette, persisted in localStorage, respects `prefers-reduced-motion` and `prefers-color-scheme`.
- **Tests** — Vitest + RTL + Playwright (15 E2E cases) + axe-core (jsdom + playwright).

---

## 🏗️ Architecture

```
UI (React + Zustand) → canonical AnalysisState → WorkerClient (revision guard) → Worker (engine)
        │                     │                           │
        │                     ├── URL sync (Zod, push/replace, loop guard)
        │                     └── Dexie (savedViews, imported datasets)
        └── Rendering: KPI/Chart/Table (virtualized, theme-aware)
```

- **Why Vite not SSR** — No server needed; static host sufficient, faster build, no hydration complexity.
- **Why Web Workers** — Keep controls responsive while scanning 100k–250k rows; avoid main-thread full scans.
- **Windowing** — Worker returns 100-row pages; main caches by `hash(analysis+sort)::offset-limit`; evicts oldest; TanStack Virtual renders ~12 DOM rows with overscan 10.
- **URL vs IndexedDB** — URL stores configuration only (filters, sort, grouping, cols, datasetId). Dataset contents never in URL. Imported links share config only; if local file missing, show helpful “dataset not found” rather than silently switching.

See `docs/architecture.md` for module layout and contracts.

---

## 🚀 Local Setup

```bash
# Node 20+ required, npm 10+
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build  → dist/
npm run preview  # serve dist on http://localhost:4173
```

Available scripts:

| Script | Description |
|--------|-------------|
| `dev` | Vite dev server (HMR, worker) |
| `build` | Production build (typecheck + vite) |
| `preview` | Preview production build |
| `typecheck` | `tsc -b --noEmit` |
| `test` | `vitest run` (52 tests) |
| `test:watch` | `vitest` watch |
| `test:e2e` | `playwright test` (requires browser) |

---

## 📊 Data Semantics

- **One record = one order** (demo).
- `revenueCents` = net order value after discount, before tax/shipping (integer cents).
- `profitCents = revenueCents - costCents` (can be negative).
- **Financial KPIs include `Completed` only**; counts/status breakdown include all statuses. Refund accounting out of scope.
- **Dataset metadata shown**: name, synthetic/imported, count, date range, ID, schema version. Demo default view is `2024-01-01 → 2024-03-31` (useful 3-month window, not relative to today).
- **Synthetic label** everywhere: “Synthetic demo data — not real financial results.” Imported: “Imported — local only.”

Full semantics in `docs/data-semantics.md`. Generator version `v2-mulberry-100k-36mo`, schema `2.0.0`, seed `0x50524953`.

---

## 🔒 Local-Only Privacy Model

- All data stays in this browser (Worker memory + IndexedDB). No upload, no telemetry, no backend.
- Imported CSVs are stored locally; shared URLs cannot reproduce imported data elsewhere (warning shown).
- Export sanitization prefixes `= + - @ | %` with `'` in text fields to prevent spreadsheet formula injection; numeric fields stay numbers.
- No secrets in frontend, no `dangerouslySetInnerHTML`, Zod validation on all external inputs.

---

## 🧪 Testing

```bash
npm test               # unit + component + integration (Vitest, jsdom)
npm run test:e2e       # Playwright (needs browsers, see below)
```

- **Unit** — deterministic generation, filter AND/OR, date boundaries, search, stable sort, aggregation (KPI, timeSeries missing buckets), comparison edge cases, URL round trips, malformed recovery, CSV validation/escaping/sanitization (small hand-authored dataset).
- **Component** — filter chips, clear, KPI zero states, saved-view validation, import errors, drawer interactions.
- **Integration** — worker client stale-rejection, dataset switching, cache invalidation.
- **Playwright** — 14 required journeys + axe critical checks:
  1. Demo loads 2. Filter updates KPIs/charts/table 3. Category selection filters 4. Sorting changes order 5. Drawer open/close 6. Saved view survives reload 7. Share URL restores 8. Back/forward restores 9. Valid CSV imports 10. Invalid CSV errors 11. Export all matching 12. Theme persists 13. Mobile no overflow 14. Keyboard journey + axe.

Playwright browsers need network to download (sandbox may block). In CI, run `npx playwright install --with-deps chromium` before `npm run test:e2e`. In this repo, unit tests run in CI without browser; e2e is browser-workflow.

---

## ⚡ Performance (honest, reproducible)

See `docs/performance.md` for full methodology and table. Summary on reference device (Linux sandbox, 100k demo):

- Warm filter→render median ~130 ms (target <500 ms ✅)
- Worker query 12–25 ms; table window 8–12 ms; initial generate ~45 ms + first query ~18 ms
- Virtualized rendering bounds DOM to ~12 rows; no full-dataset React render; no main-thread scans.

To reproduce: `npm run dev`, open console (look for `[perf]` logs), use Performance panel while filtering.

If target missed on constrained device: likely 250k imported + search + sort approaching 400 ms; mitigation is indexing and stronger yielding.

---

## ♿ Accessibility

WCAG 2.2 AA practices: landmarks, skip link, focus rings, labeled forms, dialog focus trap + Escape, keyboard menus, contrast, reduced-motion, non-color indicators, chart table alternative.

Test the core journey using only a keyboard (see `docs/accessibility.md` for steps and limitations). Automated checks via `axe-core` (jsdom + Playwright) on main pages/dialogs.

---

## 📦 Deployment

- **Static host**: `dist/` is static. Deploy to Vercel, Netlify, Cloudflare Pages, or GitHub Pages:
  - Vercel: `vercel --prod` (or connect repo, build `npm run build`, output `dist`)
  - Netlify: `netlify deploy --prod --dir dist`
  - GH Pages: `npm run build && gh-pages -d dist` (if `gh-pages` added)
- **Preview**: `npm run preview -- --host 0.0.0.0 --port 4173` — set `allowedHosts: true` already in `vite.config.ts` for proxied previews.
- **Env**: No secrets required. If you add env, copy `.env.example` (empty) — none needed by default.

---

## 🐛 Known Limitations

- Bundle ~1.15 MB (368 KB gz) due to ECharts; not code-split (future: lazy-load charts).
- Canvas charts not fully screen-reader navigable; mitigated by table alternative but not perfect.
- Virtual table’s full row count not in DOM (by design); export required for full data.
- No `aria-sort` on headers yet; column resize is pointer-only.
- Import quota errors surfaced but recovery is manual (delete datasets).
- Playwright browsers require network to install; unit tests cover correctness without browser.

---

## 🛣️ Future Improvements (highest value)

1. Code-split ECharts + table via `React.lazy` to cut initial JS ~40%.
2. `aria-sort` + `aria-rowcount` + stronger focus trap (`focus-trap-react`).
3. Indexed lookup for region/category to keep 250k under 300 ms.
4. Command palette (⌘K) for quick filter/save actions.
5. Benchmark mode toggle (100k ↔ 250k synthetic).
6. Screenshot automation for README (Playwright with browser).

---

## 📄 License

Apache-2.0 (see `LICENSE`).

## 🤝 Contributing

Local-first only — no auth, billing, or data upload. Keep every visible control working; hide incomplete features rather than dead buttons. Run `npm run build && npm test` before PR.

---

## Contributors

- **Jakaria Saikat Dhrobo** — owner ([@saikatdhrobo](https://github.com/saikatdhrobo))
- **Arena AI Agent (Prismatic Builder)** — principal frontend engineer, product designer & QA who built the complete application (see [`CONTRIBUTORS.md`](CONTRIBUTORS.md)).

---

Made with Vite + React + TypeScript (strict) + Tailwind + Radix + TanStack Table/Virtual + ECharts (modular) + Zustand + Zod + Dexie + Papa Parse + date-fns + Lucide.
