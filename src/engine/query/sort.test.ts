import { describe, it, expect } from "vitest";
import { sortRecords } from "./sort";
import type { CommerceRecord } from "../contracts/types";

function rec(id:string, date:string, rev:number): CommerceRecord {
  return { id, orderDate: date, region:"North America", country:"US", category:"Electronics", subcategory:"Phones", productName:"P", channel:"Web", customerSegment:"Consumer", quantity:1, unitPriceCents: rev, discountPercent:0, revenueCents: rev, costCents: rev-1000, profitCents:1000, status:"Completed" } as CommerceRecord;
}

describe("stable sorting", ()=>{
  it("secondary sort by id", ()=>{
    const data = [rec("b","2024-02-01",100), rec("a","2024-02-01",100), rec("c","2024-02-01",100)];
    const sorted = sortRecords(data, { column:"revenueCents", direction:"asc"});
    expect(sorted.map(r=>r.id)).toEqual(["a","b","c"]);
  });
  it("asc vs desc", ()=>{
    const data = [rec("1","2024-01-01",100), rec("2","2024-01-02",200), rec("3","2024-01-03",150)];
    expect(sortRecords(data, {column:"revenueCents", direction:"asc"}).map(r=>r.revenueCents)).toEqual([100,150,200]);
    expect(sortRecords(data, {column:"revenueCents", direction:"desc"}).map(r=>r.revenueCents)).toEqual([200,150,100]);
  });
  it("sorting by date", ()=>{
    const data = [rec("2","2024-02-15",100), rec("1","2024-01-10",100), rec("3","2024-03-01",100)];
    expect(sortRecords(data,{column:"orderDate", direction:"asc"}).map(r=>r.id)).toEqual(["1","2","3"]);
  });
  it("string column localeCompare", ()=>{
    const data = [rec("1","2024-02-01",100), rec("2","2024-02-01",100)];
    data[0]!.productName="Beta"; data[1]!.productName="Alpha";
    const sorted = sortRecords(data,{column:"productName", direction:"asc"});
    expect(sorted[0]!.productName).toBe("Alpha");
  });
});
