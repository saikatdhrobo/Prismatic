import { describe, it, expect } from "vitest";
import { generateCommerceRecords, DEMO_SEED } from "./dataset";

describe("dataset generation deterministic", ()=>{
  it("produces 100k records deterministically with same seed", ()=>{
    const a = generateCommerceRecords(100, DEMO_SEED);
    const b = generateCommerceRecords(100, DEMO_SEED);
    expect(a).toEqual(b);
  });
  it("different seed produces different data", ()=>{
    const a = generateCommerceRecords(50, 1);
    const b = generateCommerceRecords(50, 2);
    expect(a[0]!.id).not.toEqual(b[0]!.id);
  });
  it("generates within date range and correct schema", ()=>{
    const recs = generateCommerceRecords(1000, 123);
    for (const r of recs) {
      expect(r.orderDate >= "2022-01-01" && r.orderDate <= "2024-12-31").toBe(true);
      expect(typeof r.revenueCents).toBe("number");
      expect(Number.isInteger(r.revenueCents)).toBe(true);
      expect(r.profitCents).toBe(r.revenueCents - r.costCents);
    }
  });
  it("includes seasonal pattern and loss-makers", ()=>{
    const recs = generateCommerceRecords(10000, DEMO_SEED);
    const losses = recs.filter(r=> r.profitCents < 0).length;
    expect(losses).toBeGreaterThan(800); // ~12%
    expect(losses).toBeLessThan(2000);
    // Q4 should have more revenue than Q2 roughly
    const q4 = recs.filter(r=> r.orderDate.slice(5,7)==="12").length;
    const q6 = recs.filter(r=> r.orderDate.slice(5,7)==="06").length;
    expect(q4).toBeGreaterThan(0);
    expect(q6).toBeGreaterThan(0);
  });
  it("maintains integer cents and monotonic sorting by date", ()=>{
    const recs = generateCommerceRecords(500, DEMO_SEED);
    for (let i=1;i<recs.length;i++) {
      expect(recs[i]!.orderDate >= recs[i-1]!.orderDate).toBe(true);
    }
  });
});
