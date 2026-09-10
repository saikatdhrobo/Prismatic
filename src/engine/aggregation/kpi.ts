import type { CommerceRecord, KpiResult } from "../contracts/types";

export function computeKpi(filtered: CommerceRecord[]): Omit<KpiResult, "previous" | "availableComparison"> {
  let netRevenueCents = 0;
  let profitCents = 0;
  let completedOrders = 0;
  for (const r of filtered) {
    if (r.status !== "Completed") continue;
    netRevenueCents += r.revenueCents;
    profitCents += r.profitCents;
    completedOrders++;
  }
  const aovCents = completedOrders > 0 ? Math.round(netRevenueCents / completedOrders) : null;
  const profitMargin = netRevenueCents > 0 ? profitCents / netRevenueCents : (completedOrders>0 ? (netRevenueCents===0? null : profitCents/netRevenueCents) : null);
  // If no completed orders, margin null; if revenue zero but profit zero? handle
  let margin: number | null = null;
  if (completedOrders>0 && netRevenueCents !== 0) margin = profitCents / netRevenueCents;
  else if (completedOrders>0 && netRevenueCents===0) margin = profitCents===0 ? 0 : null;
  else margin = null;

  return { netRevenueCents, completedOrders, aovCents, profitMargin: margin };
}

export function computeComparison(
  allRecords: CommerceRecord[],
  filteredForKpi: ReturnType<typeof computeKpi>,
  currentRange: [string,string] | null,
  analysisFiltersWithoutDate: Omit<import("../contracts/types").AnalysisState["filters"], "dateRange">,
  datasetRange: [string,string]
): KpiResult["previous"] & { availableComparison: boolean } {
  if (!currentRange) return { netRevenueCents: null, completedOrders: null, aovCents: null, profitMargin: null, availableComparison: false };
  const [start, end] = currentRange;
  const s = new Date(start + "T00:00:00Z").getTime();
  const e = new Date(end + "T00:00:00Z").getTime();
  const lenDays = Math.round((e - s)/86400000) + 1;
  // prior end = day before start
  const priorEnd = new Date(s - 86400000);
  const priorStart = new Date(priorEnd.getTime() - (lenDays-1)*86400000);
  const priorRange: [string,string] = [priorStart.toISOString().slice(0,10), priorEnd.toISOString().slice(0,10)];
  // check coverage
  if (priorRange[0] < datasetRange[0]) {
    return { netRevenueCents: null, completedOrders: null, aovCents: null, profitMargin: null, availableComparison: false };
  }
  // Filter all records for prior range with same non-date filters
  let netRevenueCents = 0;
  let profitCents = 0;
  let completedOrders = 0;
  const q = analysisFiltersWithoutDate.search?.toLowerCase() || null;
  const regionSet = analysisFiltersWithoutDate.regions.length ? new Set(analysisFiltersWithoutDate.regions) : null;
  const catSet = analysisFiltersWithoutDate.categories.length ? new Set(analysisFiltersWithoutDate.categories) : null;
  const channelSet = analysisFiltersWithoutDate.channels.length ? new Set(analysisFiltersWithoutDate.channels) : null;
  const segmentSet = analysisFiltersWithoutDate.segments.length ? new Set(analysisFiltersWithoutDate.segments) : null;
  const statusSet = analysisFiltersWithoutDate.statuses.length ? new Set(analysisFiltersWithoutDate.statuses) : null;

  for (const r of allRecords) {
    if (r.orderDate < priorRange[0] || r.orderDate > priorRange[1]) continue;
    if (regionSet && !regionSet.has(r.region)) continue;
    if (catSet && !catSet.has(r.category)) continue;
    if (channelSet && !channelSet.has(r.channel)) continue;
    if (segmentSet && !segmentSet.has(r.customerSegment)) continue;
    if (statusSet && !statusSet.has(r.status)) continue;
    if (q && !(r.id.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q) || r.country.toLowerCase().includes(q))) continue;
    if (r.status !== "Completed") continue;
    netRevenueCents += r.revenueCents;
    profitCents += r.profitCents;
    completedOrders++;
  }
  const aovCents = completedOrders>0 ? Math.round(netRevenueCents/completedOrders) : null;
  let profitMargin: number | null = null;
  if (completedOrders>0 && netRevenueCents!==0) profitMargin = profitCents / netRevenueCents;
  else if (completedOrders>0 && netRevenueCents===0) profitMargin = profitCents===0 ? 0 : null;

  // If prior period had zero data, treat as null comparison? But spec: if previous value zero avoid Infinity.
  // We return values even if zero; UI will show N/A for pct change when zero.
  return { netRevenueCents, completedOrders, aovCents, profitMargin, availableComparison: true };
}
