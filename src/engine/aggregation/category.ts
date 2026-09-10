import type { CommerceRecord, CategoryBucket } from "../contracts/types";

export function aggregateByCategory(filtered: CommerceRecord[]): CategoryBucket[] {
  const map = new Map<string, { revenueCents:number; orders:number }>();
  for (const r of filtered) {
    if (r.status !== "Completed") continue;
    const cur = map.get(r.category);
    if (cur) { cur.revenueCents += r.revenueCents; cur.orders += 1; }
    else map.set(r.category, { revenueCents: r.revenueCents, orders: 1 });
  }
  const arr: CategoryBucket[] = Array.from(map.entries()).map(([category, v])=>({ category, revenueCents: v.revenueCents, orders: v.orders }));
  arr.sort((a,b)=> b.revenueCents - a.revenueCents);
  return arr;
}
