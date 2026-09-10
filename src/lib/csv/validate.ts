import { z } from "zod";
import type { CommerceRecord } from "../../engine/contracts/types";

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_ROWS = 250_000;

export const requiredFields = ["id","orderDate","region","category","channel","quantity","revenue","cost"] as const;

function parseMoneyToCents(raw: string): number | null {
  let s = raw.trim().replace(/[$,]/g, "");
  if (!s) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) {
    // also handle integer cents string
    if (/^-?\d+$/.test(s)) return parseInt(s,10);
    return null;
  }
  const n = parseFloat(s);
  if (!isFinite(n)) return null;
  // If input had decimal, treat as dollars; if integer and large? we treat as dollars consistently, then convert to cents.
  // But to allow cents integer, we check if string contained '.' — dollars; else dollars too? spec says accept monetary formats and convert to cents.
  // Simpler: always treat as dollars, convert to cents.
  return Math.round(n*100);
}

export type ImportRowError = { row:number; field:string; message:string; raw:string };
export type ValidationResult = {
  valid: CommerceRecord[];
  errors: ImportRowError[];
  validCount:number;
  invalidCount:number;
  duplicateIds: string[];
};

export function validateAndMapRows(rows: Record<string,string>[]): ValidationResult {
  const valid: CommerceRecord[] = [];
  const errors: ImportRowError[] = [];
  const seen = new Set<string>();
  const dupes = new Set<string>();

  rows.forEach((r, idx) => {
    const rowNum = idx+2; // header is 1
    const get = (k:string)=> (r[k] ?? r[k.toLowerCase()] ?? "").toString().trim();
    const id = get("id");
    if (!id) { errors.push({row:rowNum, field:"id", message:"Missing id", raw:""}); return; }
    if (seen.has(id)) { dupes.add(id); errors.push({row:rowNum, field:"id", message:"Duplicate id", raw:id}); return; }
    seen.add(id);

    const orderDate = get("orderDate");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate) || isNaN(new Date(orderDate+"T12:00:00Z").getTime())) {
      errors.push({row:rowNum, field:"orderDate", message:"Invalid date (expected YYYY-MM-DD)", raw:orderDate}); return;
    }
    const region = get("region") || "Unknown";
    const category = get("category");
    if (!category) { errors.push({row:rowNum, field:"category", message:"Missing category", raw:""}); return; }
    const channel = get("channel") as any;
    if (!["Web","Mobile","Marketplace","Retail"].includes(channel)) { errors.push({row:rowNum, field:"channel", message:"Invalid channel", raw:channel}); return; }
    const quantityRaw = get("quantity");
    const quantity = parseInt(quantityRaw,10);
    if (!Number.isFinite(quantity) || quantity <=0 || !Number.isInteger(quantity)) { errors.push({row:rowNum, field:"quantity", message:"Invalid quantity", raw:quantityRaw}); return; }

    // revenue / cost
    const revenueRaw = get("revenue") || get("revenueCents");
    const costRaw = get("cost") || get("costCents");
    const revCents = parseMoneyToCents(revenueRaw);
    const costCents = parseMoneyToCents(costRaw);
    if (revCents===null || !isFinite(revCents)) { errors.push({row:rowNum, field:"revenue", message:"Invalid revenue", raw:revenueRaw}); return; }
    if (costCents===null || !isFinite(costCents)) { errors.push({row:rowNum, field:"cost", message:"Invalid cost", raw:costRaw}); return; }

    // optional fields
    const country = get("country") || "Unknown";
    const subcategory = get("subcategory") || "General";
    const productName = get("productName") || `${category} Product`;
    const customerSegment = (get("customerSegment") as any) || "Consumer";
    const status = (get("status") as any) || "Completed";
    const discountPercent = parseFloat(get("discountPercent") || "0") || 0;
    const unitPriceCentsRaw = get("unitPriceCents");
    const unitPriceCents = unitPriceCentsRaw ? (parseMoneyToCents(unitPriceCentsRaw) ?? Math.round(revCents/quantity)) : Math.round(revCents/quantity);

    const profitCents = revCents - costCents;

    valid.push({
      id,
      orderDate,
      region,
      country,
      category,
      subcategory,
      productName,
      channel,
      customerSegment: ["Consumer","Small Business","Enterprise"].includes(customerSegment) ? customerSegment : "Consumer",
      quantity,
      unitPriceCents: unitPriceCents ?? 0,
      discountPercent: isFinite(discountPercent) ? discountPercent : 0,
      revenueCents: revCents,
      costCents,
      profitCents,
      status: ["Completed","Pending","Cancelled","Refunded"].includes(status) ? status : "Completed",
    });
  });

  return { valid, errors, validCount: valid.length, invalidCount: errors.length, duplicateIds: Array.from(dupes) };
}

export function sanitizeForExport(value: string, isNumeric: boolean): string {
  if (isNumeric) return value;
  if (/^[=+\-@|%]/.test(value)) return `'${value}`;
  return value;
}
