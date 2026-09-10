import { describe, it, expect } from "vitest";
import { serializeToUrl, deserializeFromUrl, analysisToUrlState, urlStateToAnalysis } from "./index";
import type { AnalysisState } from "../../engine/contracts/types";
import { DEFAULT_ANALYSIS } from "../../features/analytics/state/analysisStore";

describe("URL round trips", ()=>{
  it("round trips default analysis", ()=>{
    const url = serializeToUrl(DEFAULT_ANALYSIS);
    const parsed = deserializeFromUrl(url);
    expect(parsed).not.toBeNull();
    expect(parsed!.filters.dateRange).toEqual(DEFAULT_ANALYSIS.filters.dateRange);
    expect(parsed!.sort).toEqual(DEFAULT_ANALYSIS.sort);
  });
  it("round trips complex filters", ()=>{
    const state: AnalysisState = {
      datasetId:"demo-v2",
      filters:{ dateRange:["2024-01-01","2024-02-01"], regions:["North America"], categories:["Electronics","Books"], channels:["Web"], segments:["Consumer"], statuses:["Completed"], search:"Quantum" },
      sort:{ column:"revenueCents", direction:"asc"},
      timeGrouping:"week",
      columnVisibility: DEFAULT_ANALYSIS.columnVisibility,
    };
    const url = serializeToUrl(state);
    const parsed = deserializeFromUrl(url)!;
    expect(parsed.filters.regions).toEqual(["North America"]);
    expect(parsed.filters.categories).toEqual(["Electronics","Books"]);
    expect(parsed.filters.search).toBe("Quantum");
    expect(parsed.sort.column).toBe("revenueCents");
    expect(parsed.timeGrouping).toBe("week");
  });
  it("recovers from malformed URL", ()=>{
    const bad = "?v=999&dr=invalid&r=,,&sort=bad-format&g=unknown";
    const parsed = deserializeFromUrl(bad);
    // should not throw, fallback to defaults or null
    expect(parsed === null || parsed.datasetId === "demo-v2").toBe(true);
  });
  it("handles missing version gracefully", ()=>{
    const parsed = deserializeFromUrl("?r=Europe&c=Books");
    expect(parsed!.filters.regions).toEqual(["Europe"]);
  });
  it("compact serialization does not include defaults", ()=>{
    const url = serializeToUrl(DEFAULT_ANALYSIS);
    expect(url).not.toContain("ch=");
    expect(url).toContain("dr=");
  });
  it("deserializes search safely with length limit", ()=>{
    const long = "a".repeat(200);
    const url = `?q=${encodeURIComponent(long)}`;
    const parsed = deserializeFromUrl(url)!;
    expect(parsed.filters.search.length).toBeLessThanOrEqual(100);
  });
});
