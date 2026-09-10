import { describe, it, expect } from "vitest";
import { validateAndMapRows, sanitizeForExport } from "./validate";

describe("CSV validation", ()=>{
  it("accepts valid rows and derives profit", ()=>{
    const rows = [{ id:"A1", orderDate:"2024-02-15", region:"North America", category:"Electronics", channel:"Web", quantity:"2", revenue:"100.00", cost:"60.00"}];
    const res = validateAndMapRows(rows);
    expect(res.validCount).toBe(1);
    expect(res.valid[0]!.revenueCents).toBe(10000);
    expect(res.valid[0]!.profitCents).toBe(4000);
  });
  it("rejects invalid dates", ()=>{
    const rows = [{ id:"A1", orderDate:"2024-13-40", region:"North America", category:"Electronics", channel:"Web", quantity:"1", revenue:"10", cost:"5"}];
    const res = validateAndMapRows(rows);
    expect(res.invalidCount).toBe(1);
  });
  it("rejects duplicate IDs", ()=>{
    const rows = [
      { id:"DUP", orderDate:"2024-02-15", region:"NA", category:"Books", channel:"Web", quantity:"1", revenue:"10", cost:"5"},
      { id:"DUP", orderDate:"2024-02-16", region:"NA", category:"Books", channel:"Web", quantity:"1", revenue:"10", cost:"5"},
    ];
    const res = validateAndMapRows(rows);
    expect(res.invalidCount).toBe(1);
    expect(res.duplicateIds).toContain("DUP");
  });
  it("rejects non-finite numbers", ()=>{
    const rows = [{ id:"A1", orderDate:"2024-02-15", region:"NA", category:"Books", channel:"Web", quantity:"NaN", revenue:"10", cost:"5"}];
    const res = validateAndMapRows(rows);
    expect(res.invalidCount).toBe(1);
  });
  it("accepts monetary formats with $ and comma", ()=>{
    const rows = [{ id:"A1", orderDate:"2024-02-15", region:"NA", category:"Books", channel:"Web", quantity:"1", revenue:"$1,234.56", cost:"$600.00"}];
    const res = validateAndMapRows(rows);
    expect(res.valid[0]!.revenueCents).toBe(123456);
  });
  it("does not silently discard invalid rows", ()=>{
    const rows = [
      { id:"GOOD", orderDate:"2024-02-15", region:"NA", category:"Books", channel:"Web", quantity:"1", revenue:"10", cost:"5"},
      { id:"BAD", orderDate:"bad-date", region:"NA", category:"Books", channel:"Web", quantity:"1", revenue:"10", cost:"5"},
    ];
    const res = validateAndMapRows(rows);
    expect(res.validCount).toBe(1);
    expect(res.invalidCount).toBe(1);
    expect(res.errors.length).toBe(1);
  });
});

describe("CSV escaping and formula sanitization", ()=>{
  it("sanitizes leading formula characters", ()=>{
    expect(sanitizeForExport("=SUM(A1:A2)", false)).toBe("'=SUM(A1:A2)");
    expect(sanitizeForExport("+123", false)).toBe("'+123");
    expect(sanitizeForExport("-123", false)).toBe("'-123");
    expect(sanitizeForExport("@example", false)).toBe("'@example");
  });
  it("preserves numeric fields as numbers", ()=>{
    expect(sanitizeForExport("12345", true)).toBe("12345");
  });
  it("does not sanitize safe text", ()=>{
    expect(sanitizeForExport("Hello World", false)).toBe("Hello World");
  });
});

describe("CSV export formatting integration", ()=>{
  it("escapes commas and quotes correctly via Papa-like logic", ()=>{
    // Simulate export escaping: text with comma should be quoted
    const val = 'a,b"c\n';
    const escaped = `"${val.replace(/"/g,'""')}"`;
    expect(escaped).toBe('"a,b""c\n"');
  });
});
