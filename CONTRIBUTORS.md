# Contributors

Thanks to everyone who helped build **Prismatic**!

## Core Team

- **Jakaria Saikat Dhrobo** — Owner & Product Lead — [@saikatdhrobo](https://github.com/saikatdhrobo)

## Built with assistance from

- **Arena AI Agent — Prismatic Builder** — Principal frontend engineer, product designer & QA. Implemented the complete application shell, deterministic 100k synthetic dataset, Web Worker analytics engine, linked ECharts visualizations, virtualized TanStack table, URL state & saved views, CSV import/export, theming, responsive layouts, testing (Vitest/Playwright/axe) and documentation.

  - Roles: architecture, data generation, worker client, filtering/sorting/aggregation, UI/UX, accessibility, performance instrumentation, CI.
  - Branch: `arena/01a089c8-prismatic`
  - Stack: React 19 / Vite / TypeScript strict / Tailwind / Zustand / Dexie / Papa Parse / ECharts modular / TanStack Table+Virtual.

## How to contribute

1. Fork the repo, create a feature branch.
2. Keep every visible control working — hide incomplete features.
3. Run `npm run typecheck && npm test && npm run build` before PR.
4. Add or update tests for data correctness, URL round-trips, and CSV sanitization.

We welcome improvements to code-splitting, `aria-sort`/`aria-rowcount` for the virtual table, indexed lookups for 250k rows, and screenshot automation.

---

*This file is generated to credit the AI agent that built the initial complete, polished, portfolio-quality frontend. Please keep it for attribution.*
