import { describe, it, expect } from "vitest";
import { filterRecords } from "./filter";
import type { CommerceRecord, AnalysisState } from "../contracts/types";
import { DEFAULT_ANALYSIS } from "../../features/analytics/state/analysisStore";

function makeRecord(overrides: Partial<CommerceRecord>): CommerceRecord {
  return {
    id: "ORD-000001-100",
    orderDate: "2024-02-15",
    region: "North America",
    country: "United States",
    category: "Electronics",
    subcategory: "Phones",
    productName: "QuantumPhone X",
    channel: "Web",
    customerSegment: "Consumer",
    quantity: 1,
    unitPriceCents: 99900,
    discountPercent: 0,
    revenueCents: 99900,
    costCents: 70000,
    profitCents: 29900,
    status: "Completed",
    ...overrides,
  } as CommerceRecord;
}

function baseAnalysis(overrides?: Partial<AnalysisState["filters"]>): AnalysisState {
  return {
    datasetId:"demo-v2",
    filters:{ ...DEFAULT_ANALYSIS.filters, ...overrides, dateRange: overrides?.dateRange ?? null, regions: overrides?.regions ?? [], categories: overrides?.categories ?? [], channels: overrides?.channels ?? [], segments: overrides?.segments ?? [], statuses: overrides?.statuses ?? [], search: overrides?.search ?? "" },
    sort: DEFAULT_ANALYSIS.sort,
    timeGrouping:"month",
    columnVisibility: DEFAULT_ANALYSIS.columnVisibility,
  };
}

describe("filter AND/OR semantics", ()=>{
  const records: CommerceRecord[] = [
    makeRecord({ id:"1", region:"North America", category:"Electronics", channel:"Web", status:"Completed", orderDate:"2024-02-10", productName:"Alpha", country:"United States" }),
    makeRecord({ id:"2", region:"Europe", category:"Apparel", channel:"Mobile", status:"Pending", orderDate:"2024-02-11", productName:"Beta", country:"Germany" }),
    makeRecord({ id:"3", region:"North America", category:"Apparel", channel:"Web", status:"Completed", orderDate:"2024-02-12", productName:"Gamma", country:"Canada" }),
    makeRecord({ id:"4", region:"Asia Pacific", category:"Electronics", channel:"Marketplace", status:"Completed", orderDate:"2024-01-01", productName:"Delta", country:"Japan" }),
  ];

  it("OR within one multi-select field", ()=>{
    const filtered = filterRecords(records, baseAnalysis({ regions:["North America","Europe"] }));
    expect(filtered.map(r=>r.id).sort()).toEqual(["1","2","3"]);
  });
  it("AND between different fields", ()=>{
    const filtered = filterRecords(records, baseAnalysis({ regions:["North America"], categories:["Electronics"] }));
    expect(filtered.map(r=>r.id)).toEqual(["1"]);
  });
  it("inclusive date boundaries", ()=>{
    const filtered = filterRecords(records, baseAnalysis({ dateRange:["2024-02-10","2024-02-11"] }));
    expect(filtered.map(r=>r.id).sort()).toEqual(["1","2"]);
  });
  it("case-insensitive search on id, product, country", ()=>{
    const f1 = filterRecords(records, baseAnalysis({ search:"alpha"}));
    expect(f1.map(r=>r.id)).toEqual(["1"]);
    const f2 = filterRecords(records, baseAnalysis({ search:"GERMANY"}));
    expect(f2.map(r=>r.id)).toEqual(["2"]);
    const f3 = filterRecords(records, baseAnalysis({ search:"ord-000"}));
    // no ids match that search (ids are 1,2,3)
    expect(f3.length).toBe(0);
    const f4 = filterRecords(records, baseAnalysis({ search:"1"}));
    expect(f4.map(r=>r.id)).toEqual(["1"]);
  });
  it("search combines with other filters using AND", ()=>{
    const filtered = filterRecords(records, baseAnalysis({ regions:["North America"], search:"Gamma"}));
    expect(filtered.map(r=>r.id)).toEqual(["3"]);
    const filtered2 = filterRecords(records, baseAnalysis({ regions:["Europe"], search:"Gamma"}));
    expect(filtered2.length).toBe(0);
  });
  it("empty filters returns all", ()=>{
    const filtered = filterRecords(records, baseAnalysis({}));
    expect(filtered.length).toBe(4);
  });
});
