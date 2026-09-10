import { describe, it, expect } from "vitest";
import { aggregateTimeSeries } from "./timeSeries";
import type { CommerceRecord } from "../contracts/types";

function rec(date:string, rev:number): CommerceRecord {
  return { id:date, orderDate:date, region:"North America", country:"US", category:"Electronics", subcategory:"Phones", productName:"P", channel:"Web", customerSegment:"Consumer", quantity:1, unitPriceCents:rev, discountPercent:0, revenueCents:rev, costCents:rev-1000, profitCents:1000, status:"Completed" } as CommerceRecord;
}

describe("timeSeries missing buckets", ()=>{
  it("fills missing daily buckets with zero", ()=>{
    const data = [rec("2024-02-10",10000), rec("2024-02-12",20000)];
    const buckets = aggregateTimeSeries(data, "day", ["2024-02-10","2024-02-12"]);
    expect(buckets.length).toBe(3);
    expect(buckets[1]!.revenueCents).toBe(0);
    expect(buckets[1]!.date).toBe("2024-02-11");
  });
  it("weekly buckets fill", ()=>{
    const data = [rec("2024-02-12",10000), rec("2024-02-26",5000)]; // Mondays
    const buckets = aggregateTimeSeries(data, "week", ["2024-02-12","2024-02-26"]);
    // From Monday 2024-02-12 to Monday 2024-02-26 inclusive = 3 weeks
    expect(buckets.length).toBe(3);
    expect(buckets[1]!.revenueCents).toBe(0);
  });
  it("monthly buckets", ()=>{
    const data = [rec("2024-01-15",10000), rec("2024-03-10",5000)];
    const buckets = aggregateTimeSeries(data, "month", ["2024-01-01","2024-03-31"]);
    expect(buckets.map(b=>b.date)).toEqual(["2024-01-01","2024-02-01","2024-03-01"]);
    expect(buckets[1]!.revenueCents).toBe(0);
  });
  it("completed only", ()=>{
    const data: CommerceRecord[] = [rec("2024-02-10",10000), {...rec("2024-02-10",9999), status:"Pending"} as any];
    const buckets = aggregateTimeSeries(data, "day", ["2024-02-10","2024-02-10"]);
    expect(buckets[0]!.revenueCents).toBe(10000);
  });
  it("stable chronological ordering", ()=>{
    const data = [rec("2024-02-12",100), rec("2024-02-10",200)];
    const buckets = aggregateTimeSeries(data, "day", ["2024-02-10","2024-02-12"]);
    expect(buckets[0]!.date < buckets[1]!.date).toBe(true);
  });
});
