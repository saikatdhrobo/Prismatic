import { describe, it, expect } from "vitest";
import { formatCurrencyCents, formatPercent } from "./index";
describe("formatting", ()=>{
  it("formats currency cents", ()=>{
    expect(formatCurrencyCents(123456)).toContain("1,235");
  });
  it("handles percent null", ()=>{
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(0.123)).toContain("12.3%");
  });
});
