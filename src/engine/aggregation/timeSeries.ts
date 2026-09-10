import type { CommerceRecord, TimeBucket, TimeGrouping } from "../contracts/types";

function toDate(s: string) { return new Date(s + "T12:00:00Z"); }
function fmt(d: Date) { return d.toISOString().slice(0,10); }

function getMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0 Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return monday;
}

function bucketKey(dateStr: string, grouping: TimeGrouping): string {
  const d = toDate(dateStr);
  if (grouping === "day") return dateStr;
  if (grouping === "week") return fmt(getMonday(d));
  // month: yyyy-mm-01
  return dateStr.slice(0,7) + "-01";
}

export function autoGrouping(dateRange: [string,string] | null, totalMatching: number): TimeGrouping {
  if (!dateRange) return "month";
  const s = toDate(dateRange[0]).getTime();
  const e = toDate(dateRange[1]).getTime();
  const days = Math.round((e-s)/86400000)+1;
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

export function aggregateTimeSeries(filtered: CommerceRecord[], grouping: TimeGrouping, dateRange: [string,string] | null): TimeBucket[] {
  const map = new Map<string, { revenueCents:number; orders:number; profitCents:number }>();

  // Aggregate completed-only? Spec: time series is revenue over time. Likely completed only like KPIs.
  // But spec says filtering rules consistent; KPIs are completed only. Charts should reflect same? For revenue we use completed.
  // We'll aggregate completed only for revenue/profit, but orders count completed as well to stay consistent.
  for (const r of filtered) {
    if (r.status !== "Completed") continue;
    const k = bucketKey(r.orderDate, grouping);
    const cur = map.get(k);
    if (cur) { cur.revenueCents += r.revenueCents; cur.orders += 1; cur.profitCents += r.profitCents; }
    else map.set(k, { revenueCents: r.revenueCents, orders: 1, profitCents: r.profitCents });
  }

  if (!dateRange) {
    // Return sorted by key
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,v])=>({date, revenueCents:v.revenueCents, orders:v.orders, profitCents:v.profitCents}));
  }

  // Fill missing buckets with zero (chronological)
  const buckets: TimeBucket[] = [];
  const start = toDate(dateRange[0]);
  const end = toDate(dateRange[1]);

  if (grouping === "day") {
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate()+1)) {
      const k = fmt(d);
      const v = map.get(k);
      buckets.push({ date: k, revenueCents: v?.revenueCents ?? 0, orders: v?.orders ?? 0, profitCents: v?.profitCents ?? 0 });
    }
  } else if (grouping === "week") {
    let cur = getMonday(start);
    const endMon = getMonday(end);
    for (; cur <= endMon; cur.setUTCDate(cur.getUTCDate()+7)) {
      const k = fmt(cur);
      // Check if week bucket overlaps range — include if week start <= end and week end >= start
      // For simplicity, include all weeks whose Monday within expanded range; but we need to align to range extents.
      // We'll generate weeks from Monday of start to Monday of end inclusive.
      const v = map.get(k);
      buckets.push({ date: k, revenueCents: v?.revenueCents ?? 0, orders: v?.orders ?? 0, profitCents: v?.profitCents ?? 0 });
    }
  } else {
    // month
    let y = start.getUTCFullYear(), m = start.getUTCMonth();
    const ey = end.getUTCFullYear(), em = end.getUTCMonth();
    while (y < ey || (y===ey && m <= em)) {
      const k = `${String(y).padStart(4,"0")}-${String(m+1).padStart(2,"0")}-01`;
      const v = map.get(k);
      buckets.push({ date: k, revenueCents: v?.revenueCents ?? 0, orders: v?.orders ?? 0, profitCents: v?.profitCents ?? 0 });
      m++; if (m>11){m=0;y++}
    }
  }
  return buckets;
}
