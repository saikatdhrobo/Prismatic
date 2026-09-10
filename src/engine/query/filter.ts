import type { AnalysisState, CommerceRecord } from "../contracts/types";

export function recordMatchesFilters(r: CommerceRecord, analysis: AnalysisState): boolean {
  const f = analysis.filters;
  // Date inclusive
  if (f.dateRange) {
    const [start, end] = f.dateRange;
    if (r.orderDate < start || r.orderDate > end) return false;
  }
  if (f.regions.length && !f.regions.includes(r.region)) return false;
  if (f.categories.length && !f.categories.includes(r.category)) return false;
  if (f.channels.length && !f.channels.includes(r.channel)) return false;
  if (f.segments.length && !f.segments.includes(r.customerSegment)) return false;
  if (f.statuses.length && !f.statuses.includes(r.status)) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${r.id} ${r.productName} ${r.country}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function filterRecords(records: CommerceRecord[], analysis: AnalysisState): CommerceRecord[] {
  // For worker: efficient loop
  const f = analysis.filters;
  const hasDate = !!f.dateRange;
  const start = f.dateRange?.[0];
  const end = f.dateRange?.[1];
  const regionSet = f.regions.length ? new Set(f.regions) : null;
  const catSet = f.categories.length ? new Set(f.categories) : null;
  const channelSet = f.channels.length ? new Set(f.channels) : null;
  const segmentSet = f.segments.length ? new Set(f.segments) : null;
  const statusSet = f.statuses.length ? new Set(f.statuses) : null;
  const q = f.search ? f.search.toLowerCase() : null;

  const out: CommerceRecord[] = [];
  for (let i=0;i<records.length;i++) {
    const r = records[i]!;
    if (hasDate && (r.orderDate < start! || r.orderDate > end!)) continue;
    if (regionSet && !regionSet.has(r.region)) continue;
    if (catSet && !catSet.has(r.category)) continue;
    if (channelSet && !channelSet.has(r.channel)) continue;
    if (segmentSet && !segmentSet.has(r.customerSegment)) continue;
    if (statusSet && !statusSet.has(r.status)) continue;
    if (q) {
      // search targets id, productName, country
      // avoid per-record string concatenation overhead? simple check:
      if (!(r.id.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q) || r.country.toLowerCase().includes(q))) continue;
    }
    out.push(r);
  }
  return out;
}

// Chunked version for cooperative cancellation
export async function filterRecordsChunked(
  records: CommerceRecord[],
  analysis: AnalysisState,
  shouldCancel: () => boolean,
  chunkSize = 5000
): Promise<CommerceRecord[]> {
  const f = analysis.filters;
  const hasDate = !!f.dateRange;
  const start = f.dateRange?.[0];
  const end = f.dateRange?.[1];
  const regionSet = f.regions.length ? new Set(f.regions) : null;
  const catSet = f.categories.length ? new Set(f.categories) : null;
  const channelSet = f.channels.length ? new Set(f.channels) : null;
  const segmentSet = f.segments.length ? new Set(f.segments) : null;
  const statusSet = f.statuses.length ? new Set(f.statuses) : null;
  const q = f.search ? f.search.toLowerCase() : null;

  const out: CommerceRecord[] = [];
  for (let i=0;i<records.length;i++) {
    if (i % chunkSize === 0) {
      if (shouldCancel()) throw new Error("CANCELLED");
      // yield to event loop
      if (i !== 0) await new Promise<void>(res => setTimeout(res, 0));
    }
    const r = records[i]!;
    if (hasDate && (r.orderDate < start! || r.orderDate > end!)) continue;
    if (regionSet && !regionSet.has(r.region)) continue;
    if (catSet && !catSet.has(r.category)) continue;
    if (channelSet && !channelSet.has(r.channel)) continue;
    if (segmentSet && !segmentSet.has(r.customerSegment)) continue;
    if (statusSet && !statusSet.has(r.status)) continue;
    if (q && !(r.id.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q) || r.country.toLowerCase().includes(q))) continue;
    out.push(r);
  }
  return out;
}
