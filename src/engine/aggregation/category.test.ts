import { describe, it, expect } from "vitest";
import { aggregateByCategory } from "./category";
import type { CommerceRecord } from "../../engine/contracts/types";
function rec(cat:string, rev:number): CommerceRecord {
  return { id:cat, orderDate:"2024-02-10", region:"NA", country:"US", category:cat, subcategory:"S", productName:"P", channel:"Web", customerSegment:"Consumer", quantity:1, unitPriceCents:rev, discountPercent:0, revenueCents:rev, costCents:rev-1000, profitCents:1000, status:"Completed" } as CommerceRecord;
}
describe("category aggregation", ()=>{
  it("sums revenue and sorts desc", ()=>{
    const data = [rec("Electronics",10000), rec("Books",5000), rec("Electronics",20000)];
    const res = aggregateByCategory(data);
    expect(res[0]!.category).toBe("Electronics");
    expect(res[0]!.revenueCents).toBe(30000);
  });
  it("completed only", ()=>{
    const data: CommerceRecord[] = [{...rec("Books",10000), status:"Pending"} as any, rec("Books",5000)];
    const res = aggregateByCategory(data);
    expect(res[0]!.revenueCents).toBe(5000);
  });
});
