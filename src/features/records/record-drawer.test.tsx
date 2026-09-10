import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecordDrawer } from "./RecordDrawer";
import type { CommerceRecord } from "../../engine/contracts/types";

const rec: CommerceRecord = { id:"ORD-000001", orderDate:"2024-02-15", region:"North America", country:"US", category:"Electronics", subcategory:"Phones", productName:"QuantumPhone", channel:"Web", customerSegment:"Consumer", quantity:1, unitPriceCents:10000, discountPercent:0, revenueCents:10000, costCents:6000, profitCents:4000, status:"Completed" };

describe("RecordDrawer", ()=>{
  it("shows breakdown and copy action", async()=>{
    Object.assign(navigator, { clipboard:{ writeText: vi.fn().mockResolvedValue(undefined) }});
    const { container } = render(<RecordDrawer open={true} onOpenChange={()=>{}} record={rec} />);
    expect(screen.getByText(/ORD-000001/)).toBeInTheDocument();
    expect(screen.getAllByText(/Profit/).length).toBeGreaterThan(0);
    const btn = screen.getByText(/Copy order ID/);
    await fireEvent.click(btn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ORD-000001");
  });
});
