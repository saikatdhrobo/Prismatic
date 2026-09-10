import * as React from "react";
import { Sheet, SheetHeader, SheetTitle, SheetContent } from "../../components/ui/sheet";
import type { CommerceRecord } from "../../engine/contracts/types";
import { formatCurrencyCents } from "../../lib/formatting";
import { Button } from "../../components/ui/button";
import { Copy, Check } from "lucide-react";

export function RecordDrawer({ open, onOpenChange, record, triggerRef }: { open:boolean; onOpenChange:(v:boolean)=>void; record: CommerceRecord | null; triggerRef?: React.RefObject<HTMLElement | null> }) {
  const [copied, setCopied] = React.useState(false);
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(()=>{
    if (open) {
      setTimeout(()=> closeBtnRef.current?.focus(), 50);
    } else {
      // restore focus
      if (triggerRef?.current) triggerRef.current.focus();
    }
  },[open]);

  if (!record) return <Sheet open={open} onOpenChange={onOpenChange}><SheetHeader><SheetTitle>No record</SheetTitle></SheetHeader></Sheet>;

  const copyId = async()=>{
    try { await navigator.clipboard.writeText(record.id); setCopied(true); setTimeout(()=>setCopied(false),1500); } catch {}
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="right">
      <SheetHeader>
        <SheetTitle className="text-left">Order {record.id}</SheetTitle>
        <button ref={closeBtnRef} onClick={()=> onOpenChange(false)} className="h-8 w-8 rounded-full border grid place-items-center hover:bg-accent ml-auto" aria-label="Close details">×</button>
      </SheetHeader>
      <SheetContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${record.status==="Completed"?"bg-emerald-100 text-emerald-800":"bg-secondary"}`}>{record.status}</span>
          <span className="text-xs text-muted-foreground">{record.orderDate} • {record.region} • {record.country}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Product</div><div className="font-medium">{record.productName}</div><div className="text-xs text-muted-foreground">{record.category} / {record.subcategory}</div></div>
          <div><div className="text-xs text-muted-foreground">Channel</div><div>{record.channel}</div><div className="text-xs text-muted-foreground">{record.customerSegment}</div></div>
          <div><div className="text-xs text-muted-foreground">Quantity</div><div className="tabular-nums font-medium">{record.quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Unit price</div><div className="tabular-nums">{formatCurrencyCents(record.unitPriceCents)}</div><div className="text-xs text-muted-foreground">Discount {record.discountPercent}%</div></div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Revenue (net)</span><span className="font-semibold tabular-nums">{formatCurrencyCents(record.revenueCents)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cost</span><span className="tabular-nums">{formatCurrencyCents(record.costCents)}</span></div>
          <div className="h-px bg-border"/>
          <div className="flex justify-between text-sm"><span className="font-medium">Profit</span><span className={`font-semibold tabular-nums ${record.profitCents<0?"text-[hsl(var(--negative))]":"text-[hsl(var(--positive))]"}`}>{formatCurrencyCents(record.profitCents)}</span></div>
          <div className="text-xs text-muted-foreground">Profit = revenue − cost. Loss-makers appear in red. Financial KPIs include Completed orders only; this drawer shows the individual record regardless of status.</div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyId} className="gap-1.5">{copied? <Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}{copied? "Copied":"Copy order ID"}</Button>
          <Button variant="ghost" size="sm" onClick={()=> onOpenChange(false)}>Close</Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          Synthetic demo data • One record = one order • Revenue is net after discount, before tax/shipping • Refund accounting outside demo scope.
        </div>
      </SheetContent>
    </Sheet>
  );
}
