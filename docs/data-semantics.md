# Data Semantics — Prismatic

## One Record = One Order (demo)
The synthetic demo models individual commerce orders, not line items or customers.

## Schema
See `src/engine/contracts/types.ts` — `CommerceRecord` with `id, orderDate, region, country, category, subcategory, productName, channel, customerSegment, quantity, unitPriceCents, discountPercent, revenueCents, costCents, profitCents, status`.

## Financial Definitions
- `revenueCents`: net order value after `discountPercent`, before tax/shipping. Integer cents. `Math.round(quantity * unitPriceCents * (1 - discountPercent/100))`.
- `costCents`: cost of goods sold for that order (integer cents).
- `profitCents = revenueCents - costCents` (can be negative → loss-maker).
- **Financial KPIs include `Completed` orders only** (net revenue, completed orders, AOV, profit margin).
- Record counts / status breakdowns include all statuses (`Completed`, `Pending`, `Cancelled`, `Refunded`).
- Refund accounting outside demo scope — refunded orders appear as status only, no separate reversal entries.

## Dataset Metadata (shown in UI)
- Name, synthetic/imported source label, record count, date range, dataset ID, schema version (e.g., `demo-v1 | gen v2 | 100,000 | 2022-01-01 → 2024-12-31`).

## Generation Guarantees (demo-v1)
- Deterministic Mulberry32 PRNG with fixed seed `0xPRISM1` + schema version string.
- Date range: 2022-01-01 → 2024-12-31 inclusive (36 months, ≥24 required). Default initial view: 2024-01-01 → 2024-03-31 (useful 3-month window, not relative to today).
- Regions/countries consistent (e.g., North America: United States, Canada; Europe: Germany, France, UK, ...; APAC: Japan, Singapore, Australia; LATAM: Brazil, Mexico; etc.)
- Categories: Electronics, Apparel, Home & Garden, Sports, Beauty, Books — each with 3-4 subcategories and 8-12 product names.
- Seasonal: Q4 revenue multiplier ~1.35, Q2 ~0.9, Dec peak; channel deltas (Marketplace lower AOV, Retail higher cost); category deltas (Electronics higher revenue variance).
- ~12% loss-makers; discount 0-30%; status mix: Completed 82%, Pending 7%, Cancelled 6%, Refunded 5%.
- Avoid uniform distributions: quantity/unitPrice drawn from weighted buckets, skewed log-normal-like.

## Imported Data Semantics
- USD only (this version).
- Required: id, orderDate, region, category, channel, quantity, revenue, cost.
- Optional: country, subcategory, productName, customerSegment, status, discountPercent, unitPriceCents.
- Monetary inputs accepted as `1234.56`, `$1,234.56`, `123456` cents string — converted to integer cents.
- `profitCents` derived.
- Rows with invalid dates, non-finite numbers, invalid quantities, duplicate IDs rejected and surfaced.
- Text fields sanitized on export against formula injection (leading `= + - @ | %`).

## Labeling
Every view prominently shows “Synthetic demo data” (demo) or “Imported — local only” (imported). Never implies verified financial results.
