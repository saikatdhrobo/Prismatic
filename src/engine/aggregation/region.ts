import type { CommerceRecord, RegionBucket } from "../contracts/types";

export function aggregateByRegion(filtered: CommerceRecord[]): RegionBucket[] {
  const map = new Map<string, { orders:number; revenueCents:number }>();
  // Orders by region includes all? Spec says "Orders by region" — likely counts all orders or completed? We'll count all statuses for orders but also revenue completed.
  // To be consistent with KPI, let's count orders as completed only? Spec: "Record counts and status breakdowns can include all statuses." For region orders, spec says "Orders by region" — ambiguous.
  // We'll count total records matching (all statuses) for orders, and revenue from completed for context, but primary metric is orders.
  // Tests expect consistent with implementation; we document choice.
  for (const r of filtered) {
    // Count all statuses for orders
    const cur = map.get(r.region);
    if (cur) { cur.orders += 1; if (r.status==="Completed") cur.revenueCents += r.revenueCents; }
    else map.set(r.region, { orders: 1, revenueCents: r.status==="Completed"? r.revenueCents:0 });
  }
  const arr: RegionBucket[] = Array.from(map.entries()).map(([region,v])=>({ region, orders: v.orders, revenueCents: v.revenueCents }));
  arr.sort((a,b)=> b.orders - a.orders);
  return arr;
}
