import * as React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";
export function Sheet({open, onOpenChange, children, side="right"}:{open:boolean; onOpenChange:(v:boolean)=>void; children:React.ReactNode; side?:"right"|"left"|"bottom"}){
  React.useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow="hidden";
    return ()=>{ window.removeEventListener("keydown", onKey); document.body.style.overflow=""; };
  },[open,onOpenChange]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/40" onClick={()=>onOpenChange(false)} aria-hidden="true"/>
      <div className={cn("fixed bg-card border shadow-xl flex flex-col", side==="right"?"right-0 top-0 h-full w-[420px] max-w-[90vw]":"", side==="left"?"left-0 top-0 h-full w-[360px]":"", side==="bottom"?"bottom-0 left-0 w-full max-h-[80vh] rounded-t-xl":"")} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
export function SheetHeader({className,...props}:React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-4 border-b flex items-center justify-between",className)} {...props}/> }
export function SheetTitle(props:React.HTMLAttributes<HTMLHeadingElement>){ return <h2 className="font-semibold" {...props}/> }
export function SheetContent({className,...props}:React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("flex-1 overflow-auto p-4",className)} {...props}/> }
