import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAnalysisStore } from "../features/analytics/state/analysisStore";
import { Search, Trash2, BookmarkPlus, Download, Database } from "lucide-react";

type Action = { id:string; label:string; hint?:string; icon?: React.ReactNode; run:()=>void };

export function CommandPalette({ open, onOpenChange }: { open:boolean; onOpenChange:(v:boolean)=>void }) {
  const analysis = useAnalysisStore();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(()=> { if(open) setTimeout(()=> inputRef.current?.focus(), 50); else setQuery(""); },[open]);

  const actions: Action[] = [
    { id:"clear", label:"Clear all filters", icon:<Trash2 className="h-4 w-4"/>, run:()=> { analysis.clearAllFilters(); onOpenChange(false); } },
    { id:"save", label:"Save current view", icon:<BookmarkPlus className="h-4 w-4"/>, run:()=> { onOpenChange(false); document.dispatchEvent(new CustomEvent("prismatic:open-save")); } },
    { id:"export", label:"Export filtered CSV", icon:<Download className="h-4 w-4"/>, run:()=> { onOpenChange(false); document.dispatchEvent(new CustomEvent("prismatic:export")); } },
    { id:"demo", label:"Switch to demo dataset", icon:<Database className="h-4 w-4"/>, run:()=> { analysis.setDatasetId("demo-v2"); onOpenChange(false); } },
    { id:"search", label:"Focus search", hint:"Type to filter products", icon:<Search className="h-4 w-4"/>, run:()=> { onOpenChange(false); setTimeout(()=> (document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()), 100); } },
  ];
  const filtered = query ? actions.filter(a=> a.label.toLowerCase().includes(query.toLowerCase())) : actions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-3 pb-0"><DialogTitle className="text-sm">Command palette <span className="text-xs font-normal text-muted-foreground ml-2">⌘K</span></DialogTitle></DialogHeader>
        <div className="p-3 pt-2">
          <input ref={inputRef} value={query} onChange={e=> setQuery(e.target.value)} placeholder="Type a command…" className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="mt-2 space-y-1 max-h-60 overflow-auto">
            {filtered.map(a=> (
              <button key={a.id} onClick={a.run} className="w-full text-left flex items-center gap-2 px-2 py-2 rounded hover:bg-accent text-sm">
                {a.icon}<span className="flex-1">{a.label}</span>{a.hint && <span className="text-xs text-muted-foreground">{a.hint}</span>}
              </button>
            ))}
            {filtered.length===0 && <div className="text-sm text-muted-foreground p-2">No commands found</div>}
          </div>
          <div className="text-xs text-muted-foreground mt-2">Press <kbd className="border px-1 rounded">Esc</kbd> to close • <kbd className="border px-1 rounded">Enter</kbd> to run</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
