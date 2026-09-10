import * as React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

type DialogProps = { open:boolean; onOpenChange:(v:boolean)=>void; children:React.ReactNode };
export function Dialog({open, onOpenChange, children}: DialogProps){
  React.useEffect(()=>{
    if(!open) return;
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  },[open, onOpenChange]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>onOpenChange(false)} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto m-4">
        {children}
      </div>
    </div>
  );
}
export function DialogContent({className, children, onClose}:{className?:string; children:React.ReactNode; onClose?:()=>void}){
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return ()=> prev?.focus();
  },[]);
  return (
    <div ref={ref} tabIndex={-1} className={cn("bg-card text-card-foreground rounded-xl border shadow-lg p-6 outline-none", className)}>
      {onClose && <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 hover:bg-accent" aria-label="Close"><X className="h-4 w-4"/></button>}
      {children}
    </div>
  );
}
export function DialogHeader({className,...props}: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props}/> }
export function DialogTitle({className,...props}: React.HTMLAttributes<HTMLHeadingElement>){ return <h2 className={cn("text-lg font-semibold", className)} {...props}/> }
export function DialogDescription({className,...props}: React.HTMLAttributes<HTMLParagraphElement>){ return <p className={cn("text-sm text-muted-foreground", className)} {...props}/> }
