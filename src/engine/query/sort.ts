import type { CommerceRecord, ColumnId } from "../contracts/types";

type SortSpec = { column: ColumnId; direction: "asc" | "desc" };

function compareValues(a: any, b: any): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return a < b ? -1 : 1;
}

export function sortRecords(records: CommerceRecord[], spec: SortSpec): CommerceRecord[] {
  const dir = spec.direction === "asc" ? 1 : -1;
  const col = spec.column;
  // Stable sort via id tie-breaker
  const copy = records.slice();
  copy.sort((ra, rb) => {
    let av: any, bv: any;
    switch (col) {
      case "id": av = ra.id; bv = rb.id; break;
      case "orderDate": av = ra.orderDate; bv = rb.orderDate; break;
      case "productName": av = ra.productName; bv = rb.productName; break;
      case "category": av = ra.category; bv = rb.category; break;
      case "region": av = ra.region; bv = rb.region; break;
      case "channel": av = ra.channel; bv = rb.channel; break;
      case "status": av = ra.status; bv = rb.status; break;
      case "quantity": av = ra.quantity; bv = rb.quantity; break;
      case "revenueCents": av = ra.revenueCents; bv = rb.revenueCents; break;
      case "profitCents": av = ra.profitCents; bv = rb.profitCents; break;
      default: av = (ra as any)[col]; bv = (rb as any)[col];
    }
    const cmp = compareValues(av, bv);
    if (cmp !== 0) return cmp * dir;
    // secondary stable sort by id asc
    return ra.id.localeCompare(rb.id);
  });
  return copy;
}
