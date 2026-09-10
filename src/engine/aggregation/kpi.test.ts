import { describe, it, expect } from "vitest";
import { computeKpi, computeComparison } from "./kpi";
import type { CommerceRecord } from "../contracts/types";

function rec(overrides: Partial<CommerceRecord>): CommerceRecord {
  return { id:"1", orderDate:"2024-02-15", region:"North America", country:"US", category:"Electronics", subcategory:"Phones", productName:"P", channel:"Web", customerSegment:"Consumer", quantity:1, unitPriceCents:10000, discountPercent:0, revenueCents:10000, costCents:7000, profitCents:3000, status:"Completed", ...overrides } as CommerceRecord;
}

describe("KPI aggregation", ()=>{
  it("sums completed only", ()=>{
    const data = [rec({revenueCents:10000, costCents:6000, profitCents:4000, status:"Completed"}), rec({revenueCents:5000, costCents:3000, profitCents:2000, status:"Pending"}), rec({revenueCents:2000, costCents:2500, profitCents:-500, status:"Completed"})];
    const kpi = computeKpi(data);
    expect(kpi.netRevenueCents).toBe(12000);
    expect(kpi.completedOrders).toBe(2);
    expect(kpi.aovCents).toBe(6000);
    expect(kpi.profitMargin).toBeCloseTo(3500/12000);
  });
  it("handles zero denominators", ()=>{
    const data: CommerceRecord[] = [rec({status:"Pending"})];
    const kpi = computeKpi(data);
    expect(kpi.netRevenueCents).toBe(0);
    expect(kpi.completedOrders).toBe(0);
    expect(kpi.aovCents).toBeNull();
    expect(kpi.profitMargin).toBeNull();
  });
  it("loss-maker reduces margin", ()=>{
    const data = [rec({revenueCents:10000, profitCents:-2000, status:"Completed"}), rec({revenueCents:10000, profitCents:3000, status:"Completed"})];
    const kpi = computeKpi(data as any);
    expect(kpi.profitMargin).toBeCloseTo(1000/20000);
  });
  it("comparison uses prior equal-length period", ()=>{
    const all: CommerceRecord[] = [
      rec({orderDate:"2024-02-04", revenueCents:10000, profitCents:2000, status:"Completed"}),
      rec({orderDate:"2024-02-10", revenueCents:20000, profitCents:5000, status:"Completed"}),
      rec({orderDate:"2024-02-15", revenueCents:30000, profitCents:6000, status:"Completed"}),
    ];
    const kpiBase = computeKpi(all.filter(r=> r.orderDate >= "2024-02-10"));
    const comp = computeComparison(all, kpiBase, ["2024-02-10","2024-02-15"], { regions:[], categories:[], channels:[], segments:[], statuses:[], search:"" }, ["2024-01-01","2024-12-31"]);
    expect(comp.availableComparison).toBe(true);
    expect(comp.netRevenueCents).toBe(10000);
  });
  it("comparison out of coverage returns N/A", ()=>{
    const all: CommerceRecord[] = [rec({orderDate:"2022-01-10", revenueCents:10000, status:"Completed"})];
    const kpiBase = computeKpi(all);
    const comp = computeComparison(all, kpiBase, ["2022-01-01","2022-01-31"], { regions:[], categories:[], channels:[], segments:[], statuses:[], search:"" }, ["2022-01-01","2024-12-31"]);
    expect(comp.availableComparison).toBe(false);
    expect(comp.netRevenueCents).toBeNull();
  });
  it("previous zero avoids Infinity", ()=>{
    const all: CommerceRecord[] = [rec({orderDate:"2024-02-10", revenueCents:10000, status:"Completed"})];
    const kpiBase = computeKpi(all);
    const comp = computeComparison(all, kpiBase, ["2024-02-10","2024-02-15"], { regions:[], categories:[], channels:[], segments:[], statuses:[], search:"" }, ["2024-01-01","2024-12-31"]);
    // prior period has 0 matching (no data), so netRevenue 0 but availableComparison true (since prior in coverage)
    // UI should avoid Infinity when calculating pct change from 0
    expect(comp.netRevenueCents).toBe(0);
  });
});
