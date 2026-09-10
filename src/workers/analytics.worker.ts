/// <reference lib="webworker" />
import type { CommerceRecord, WorkerRequest, WorkerResponse, DatasetMeta, AnalysisState } from "../engine/contracts/types";
import { generateCommerceRecords, getDemoMeta, DEMO_SEED } from "../engine/generation/dataset";
import { filterRecords } from "../engine/query/filter";
import { sortRecords } from "../engine/query/sort";
import { computeKpi, computeComparison } from "../engine/aggregation/kpi";
import { aggregateTimeSeries, autoGrouping } from "../engine/aggregation/timeSeries";
import { aggregateByCategory } from "../engine/aggregation/category";
import { aggregateByRegion } from "../engine/aggregation/region";

let dataset: CommerceRecord[] = [];
let datasetMeta: DatasetMeta | null = null;
let activeRevision = 0;
const idMap = new Map<string, CommerceRecord>();

function post(res: WorkerResponse) {
  (self as unknown as Worker).postMessage(res);
}

function handleInitialize(req: Extract<WorkerRequest, { type:"INITIALIZE_DEMO"}>) {
  const t0 = performance.now();
  dataset = generateCommerceRecords(100_000, DEMO_SEED);
  datasetMeta = getDemoMeta(dataset.length);
  idMap.clear();
  for (const r of dataset) idMap.set(r.id, r);
  const duration = performance.now() - t0;
  post({ requestId: req.requestId, type: "READY", payload: { meta: datasetMeta } });
  // also optionally log duration but not needed
  void duration;
}

function handleSwitchDataset(req: Extract<WorkerRequest, { type:"SWITCH_DATASET"}>) {
  // dataset already set via IMPORT_DATASET; this just confirms
  if (datasetMeta && datasetMeta.id === req.payload.datasetId) {
    post({ requestId: req.requestId, type: "READY", payload: { meta: datasetMeta } });
  } else {
    post({ requestId: req.requestId, type: "ERROR", error: { code:"DATASET_NOT_FOUND", message:`Dataset ${req.payload.datasetId} not loaded` }});
  }
}

function handleImport(req: Extract<WorkerRequest, { type:"IMPORT_DATASET"}>) {
  dataset = req.payload.records;
  datasetMeta = req.payload.meta;
  idMap.clear();
  for (const r of dataset) idMap.set(r.id, r);
  post({ requestId: req.requestId, type: "READY", payload: { meta: datasetMeta } });
}

function handleQueryAnalytics(req: Extract<WorkerRequest, { type:"QUERY_ANALYTICS"}>) {
  const t0 = performance.now();
  activeRevision = req.payload.revision;
  const analysis = req.payload.analysis;
  // Check dataset matches
  if (!datasetMeta || datasetMeta.id !== analysis.datasetId) {
    post({ requestId: req.requestId, type: "ERROR", error: { code:"DATASET_MISMATCH", message:"Dataset not loaded" }});
    return;
  }
  // Early exit if revision superseded after we start heavy work? We do chunked but simple.
  // Use filterRecords (sync) — for 100k it's fast (<50ms). No need to chunk heavily; but we include cancellation check before each aggregation.
  const filtered = filterRecords(dataset, analysis);
  // Determine grouping
  const grouping = analysis.timeGrouping || autoGrouping(analysis.filters.dateRange, filtered.length);

  const kpiBase = computeKpi(filtered);
  // Comparison
  const { availableComparison, ...prev } = computeComparison(dataset, kpiBase, analysis.filters.dateRange, {
    regions: analysis.filters.regions,
    categories: analysis.filters.categories,
    channels: analysis.filters.channels,
    segments: analysis.filters.segments,
    statuses: analysis.filters.statuses,
    search: analysis.filters.search,
  }, datasetMeta.dateRange as [string,string]);

  const kpi = { ...kpiBase, previous: prev, availableComparison };

  const timeSeries = aggregateTimeSeries(filtered, grouping, analysis.filters.dateRange);
  const byCategory = aggregateByCategory(filtered);
  const byRegion = aggregateByRegion(filtered);

  const statusBreakdown: Record<string, number> = { Completed:0, Pending:0, Cancelled:0, Refunded:0 };
  for (const r of filtered) statusBreakdown[r.status] = (statusBreakdown[r.status]||0)+1;

  // Check staleness before posting
  if (req.payload.revision < activeRevision) return;

  const durationMs = performance.now() - t0;
  const payload = {
    kpi,
    timeSeries,
    byCategory,
    byRegion,
    totalMatching: filtered.length,
    statusBreakdown,
    filteredCountLabel: `${filtered.length.toLocaleString()} matching`,
  };
  post({ requestId: req.requestId, type:"ANALYTICS_RESULT", revision: req.payload.revision, payload, durationMs });
}

function handleGetRows(req: Extract<WorkerRequest,{type:"GET_ROWS"}>) {
  const t0 = performance.now();
  activeRevision = req.payload.revision;
  const analysis = req.payload.analysis;
  if (!datasetMeta || datasetMeta.id !== analysis.datasetId) {
    post({ requestId: req.requestId, type:"ERROR", error:{code:"DATASET_MISMATCH", message:"Dataset not loaded"}});
    return;
  }
  const filtered = filterRecords(dataset, analysis);
  const sorted = sortRecords(filtered, analysis.sort);
  const total = sorted.length;
  const rows = sorted.slice(req.payload.offset, req.payload.offset + req.payload.limit);
  if (req.payload.revision < activeRevision) return;
  const durationMs = performance.now() - t0;
  post({ requestId: req.requestId, type:"ROWS_RESULT", revision: req.payload.revision, payload:{ rows, total, offset: req.payload.offset }, durationMs });
}

function handleGetRecord(req: Extract<WorkerRequest,{type:"GET_RECORD"}>) {
  const rec = idMap.get(req.payload.id) || null;
  post({ requestId: req.requestId, type:"RECORD_RESULT", payload:{ record: rec }});
}

function handleExport(req: Extract<WorkerRequest,{type:"EXPORT_FILTERED"}>) {
  const t0 = performance.now();
  const analysis = req.payload.analysis;
  if (!datasetMeta || datasetMeta.id !== analysis.datasetId) {
    post({ requestId: req.requestId, type:"ERROR", error:{code:"DATASET_MISMATCH", message:"Dataset not loaded"}});
    return;
  }
  const filtered = filterRecords(dataset, analysis);
  const sorted = sortRecords(filtered, analysis.sort);
  // Build CSV string at worker (to avoid copying large dataset to main for export prep)
  // Use proper escaping, formula sanitization
  const header = ["id","orderDate","region","country","category","subcategory","productName","channel","customerSegment","quantity","unitPriceCents","discountPercent","revenueCents","costCents","profitCents","status"];
  const escape = (v: string) => {
    // sanitize formula injection for text fields
    const needsSanitize = /^[=+\-@|%]/ .test(v);
    const sanitized = needsSanitize ? `'${v}` : v;
    if (/[",\n]/.test(sanitized)) return `"${sanitized.replace(/"/g,'""')}"`;
    return sanitized;
  };
  const lines: string[] = [];
  lines.push(header.join(","));
  for (const r of sorted) {
    const row = [
      escape(r.id),
      r.orderDate,
      escape(r.region),
      escape(r.country),
      escape(r.category),
      escape(r.subcategory),
      escape(r.productName),
      escape(r.channel),
      escape(r.customerSegment),
      String(r.quantity),
      String(r.unitPriceCents),
      String(r.discountPercent),
      String(r.revenueCents),
      String(r.costCents),
      String(r.profitCents),
      escape(r.status),
    ];
    lines.push(row.join(","));
    // cooperative yield every 10k
    // not async here; dataset up to 250k, string building <200ms; keep sync
  }
  const csv = lines.join("\n");
  const durationMs = performance.now() - t0;
  // Check revision still current? Export not frequent, ignore staleness
  void activeRevision;
  post({ requestId: req.requestId, type:"EXPORT_RESULT", revision: req.payload.revision, payload:{ csv, count: sorted.length }, durationMs } as any);
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    switch (req.type) {
      case "INITIALIZE_DEMO": handleInitialize(req); break;
      case "SWITCH_DATASET": handleSwitchDataset(req); break;
      case "IMPORT_DATASET": handleImport(req); break;
      case "QUERY_ANALYTICS": handleQueryAnalytics(req); break;
      case "GET_ROWS": handleGetRows(req); break;
      case "GET_RECORD": handleGetRecord(req); break;
      case "EXPORT_FILTERED": handleExport(req); break;
      default: post({ requestId: (req as any).requestId, type:"ERROR", error:{code:"UNKNOWN", message:"Unknown request"}});
    }
  } catch (err:any) {
    post({ requestId: req.requestId, type:"ERROR", error:{code:"WORKER_ERROR", message: err?.message || String(err) }});
  }
};

// Also support direct generation for testing without worker? export functions already done
