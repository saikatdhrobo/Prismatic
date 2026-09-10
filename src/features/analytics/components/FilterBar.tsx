import * as React from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { useAnalysisStore } from "../state/analysisStore";
import { CHANNELS, SEGMENTS, STATUSES, REGIONS, CATEGORIES } from "../../../engine/contracts/types";
import { X, Search, SlidersHorizontal } from "lucide-react";

function MultiSelect({ label, options, value, onToggle, onClear }: { label:string; options: readonly string[]; value:string[]; onToggle:(v:string)=>void; onClear:()=>void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    const onDoc=(e:MouseEvent)=>{ if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc); return ()=> document.removeEventListener("mousedown", onDoc);
  },[]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(v=>!v)} className="h-8 px-2.5 rounded-md border bg-card text-sm flex items-center gap-1.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        {label} {value.length? <span className="bg-primary text-primary-foreground rounded-full h-5 min-w-5 px-1 grid place-items-center text-xs">{value.length}</span>:null}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-56 rounded-md border bg-popover shadow-lg p-2">
          <div className="max-h-60 overflow-auto space-y-1">
            {options.map(opt=>(
              <label key={opt} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm cursor-pointer">
                <input type="checkbox" checked={value.includes(opt)} onChange={()=>onToggle(opt)} className="rounded border-input" />
                <span className="flex-1">{opt}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between pt-2 border-t mt-2">
            <button onClick={()=>{ onClear(); setOpen(false); }} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            <button onClick={()=>setOpen(false)} className="text-xs font-medium text-primary">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({ totalMatching, onOpenMobileFilters }: { totalMatching:number; onOpenMobileFilters?:()=>void }) {
  const { filters, setDateRange, toggleRegion, toggleCategory, toggleChannel, setSegments, setStatuses, setSearch, clearAllFilters } = useAnalysisStore();
  const [localSearch, setLocalSearch] = React.useState(filters.search);
  React.useEffect(()=> setLocalSearch(filters.search), [filters.search]);
  // debounced search
  React.useEffect(()=>{
    const t=setTimeout(()=> { if (localSearch!==filters.search) setSearch(localSearch); }, 300);
    return ()=> clearTimeout(t);
  },[localSearch]);

  const hasActive = filters.regions.length || filters.categories.length || filters.channels.length || filters.segments.length || filters.statuses.length || filters.search;

  const chips: Array<{label:string; onRemove:()=>void}> = [];
  filters.regions.forEach(r=> chips.push({label:`Region: ${r}`, onRemove:()=> toggleRegion(r)}));
  filters.categories.forEach(c=> chips.push({label:`Category: ${c}`, onRemove:()=> toggleCategory(c)}));
  filters.channels.forEach(ch=> chips.push({label:`Channel: ${ch}`, onRemove:()=> toggleChannel(ch as any)}));
  filters.segments.forEach(s=> chips.push({label:`Segment: ${s}`, onRemove:()=> setSegments(filters.segments.filter(x=>x!==s))}));
  filters.statuses.forEach(s=> chips.push({label:`Status: ${s}`, onRemove:()=> setStatuses(filters.statuses.filter(x=>x!==s))}));
  if (filters.search) chips.push({label:`Search: “${filters.search}”`, onRemove:()=> setSearch("")});
  if (filters.dateRange) chips.push({label:`${filters.dateRange[0]} → ${filters.dateRange[1]}`, onRemove:()=> setDateRange(null)});

  return (
    <div className="border rounded-xl bg-card p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-muted-foreground hidden sm:block">Date</label>
          <input type="date" value={filters.dateRange?.[0] ?? ""} onChange={e=>{
            const v=e.target.value;
            if (!v) setDateRange(null);
            else setDateRange([v, filters.dateRange?.[1] ?? v]);
          }} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="Start date" />
          <span className="text-muted-foreground text-sm">—</span>
          <input type="date" value={filters.dateRange?.[1] ?? ""} onChange={e=>{
            const v=e.target.value;
            if (!v) setDateRange(null);
            else setDateRange([filters.dateRange?.[0] ?? v, v]);
          }} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="End date" />
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <MultiSelect label="Region" options={REGIONS as unknown as string[]} value={filters.regions} onToggle={toggleRegion} onClear={()=> useAnalysisStore.getState().setRegions([])} />
          <MultiSelect label="Category" options={CATEGORIES as unknown as string[]} value={filters.categories} onToggle={toggleCategory} onClear={()=> useAnalysisStore.getState().setCategories([])} />
          <MultiSelect label="Channel" options={CHANNELS as unknown as string[]} value={filters.channels} onToggle={(v)=> toggleChannel(v as any)} onClear={()=> useAnalysisStore.getState().setChannels([])} />
          <MultiSelect label="Segment" options={SEGMENTS as unknown as string[]} value={filters.segments} onToggle={(v)=> {
            const cur=filters.segments;
            const next= cur.includes(v as any) ? cur.filter(x=>x!==v) : [...cur, v as any];
            setSegments(next as any);
          }} onClear={()=> setSegments([])} />
          <MultiSelect label="Status" options={STATUSES as unknown as string[]} value={filters.statuses} onToggle={(v)=>{
            const cur=filters.statuses;
            const next= cur.includes(v as any) ? cur.filter(x=>x!==v) : [...cur, v as any];
            setStatuses(next as any);
          }} onClear={()=> setStatuses([])} />
        </div>

        {/* Search */}
        <div className="relative ml-auto flex-1 min-w-[180px] max-w-[320px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={localSearch} onChange={e=> setLocalSearch(e.target.value)} placeholder="Search order, product, country" className="pl-8 h-8" aria-label="Global search" />
          {localSearch && <button onClick={()=> setLocalSearch("")} className="absolute right-2 top-1.5 h-5 w-5 grid place-items-center rounded hover:bg-accent" aria-label="Clear search"><X className="h-3 w-3"/></button>}
        </div>

        <Button variant="outline" size="sm" className="lg:hidden" onClick={onOpenMobileFilters}><SlidersHorizontal className="h-4 w-4"/>Filters</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{totalMatching.toLocaleString()} matching</span>
        <span className="text-muted-foreground text-xs">•</span>
        <span className="text-xs text-muted-foreground">{hasActive? "Filtered":"No filters"}</span>
        {hasActive && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs ml-auto">Clear all</Button>}
      </div>

      {chips.length>0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Active filters">
          {chips.map((chip,i)=> (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {chip.label}
              <button onClick={chip.onRemove} aria-label={`Remove ${chip.label}`} className="h-4 w-4 rounded-full hover:bg-black/10 grid place-items-center"><X className="h-3 w-3"/></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
