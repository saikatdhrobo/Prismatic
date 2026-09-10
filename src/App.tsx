import * as React from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { FilterBar } from "./features/analytics/components/FilterBar";
import { KpiCards } from "./features/analytics/components/KpiCards";
import { RevenueTimeChart, RevenueByCategoryChart, OrdersByRegionChart } from "./features/analytics/components/Charts";
import { RecordsTable } from "./features/records/RecordsTable";
import { RecordDrawer } from "./features/records/RecordDrawer";
import { useAnalysisStore, DEFAULT_ANALYSIS } from "./features/analytics/state/analysisStore";
import { WorkerClient } from "./lib/workerClient";
import type { AnalyticsResult, CommerceRecord, DatasetMeta } from "./engine/contracts/types";
import { deserializeFromUrl, serializeToUrl } from "./lib/url-state";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./components/ui/dialog";
import { Sheet } from "./components/ui/sheet";
import { db } from "./lib/persistence/db";
import { buildTemplateCsv } from "./lib/csv/template";
import { validateAndMapRows, MAX_FILE_SIZE, MAX_ROWS } from "./lib/csv/validate";
import Papa from "papaparse";
import { Moon, Sun, Share2, BookmarkPlus, Database, Upload, Trash2, AlertTriangle, Check, Copy, FileDown, Menu, X } from "lucide-react";
import { CommandPalette } from "./components/CommandPalette";
import { formatCurrencyCents } from "./lib/formatting";

// Worker singleton hook
function useWorker() {
  const ref = React.useRef<WorkerClient | null>(null);
  if (!ref.current) {
    ref.current = new WorkerClient(()=> new Worker(new URL("./workers/analytics.worker.ts", import.meta.url), { type:"module" }));
  }
  React.useEffect(()=> ()=> ref.current?.terminate(), []);
  return ref.current;
}

function useTheme() {
  const [theme, setTheme] = React.useState<"light"|"dark">(()=> (localStorage.getItem("prismatic-theme") as any) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light"));
  React.useEffect(()=>{
    document.documentElement.classList.toggle("dark", theme==="dark");
    localStorage.setItem("prismatic-theme", theme);
  },[theme]);
  return { theme, toggle:()=> setTheme(t=> t==="dark"?"light":"dark") };
}

const MobileNavContext = React.createContext<{ open:boolean; toggle:()=>void }>({ open:false, toggle:()=>{} });
function useMobileNav(){ return React.useContext(MobileNavContext); }

function TopHeader({ meta, workerLoading, onShare, onSaveView, onToggleMobile }: { meta:DatasetMeta | null; workerLoading:boolean; onShare:()=>void; onSaveView:()=>void; onToggleMobile:()=>void }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="h-[56px] border-b bg-card flex items-center gap-3 px-3 md:px-4 sticky top-0 z-20">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleMobile} aria-label="Open navigation"><Menu className="h-5 w-5"/></Button>
      <div className="hidden md:flex items-center gap-2 text-sm">
        <Badge variant="outline" className="gap-1">{meta?.source==="synthetic" ? "Synthetic demo" : meta?.source==="imported" ? "Imported — local only" : "Loading…" } {workerLoading && "• Loading…"}</Badge>
        {meta && <span className="text-xs text-muted-foreground hidden lg:inline">{meta.recordCount.toLocaleString()} records • {meta.dateRange[0]} → {meta.dateRange[1]} • {meta.schemaVersion} • {meta.id}</span>}
      </div>
      <div className="md:hidden flex-1 min-w-0"><div className="font-semibold text-sm leading-none">PRISMATIC</div><div className="text-[10px] tracking-widest text-muted-foreground uppercase truncate">Turn complex data into clear decisions.</div></div>
      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={onSaveView} className="hidden sm:flex"><BookmarkPlus className="h-4 w-4"/>Save view</Button>
        <Button variant="outline" size="sm" onClick={onShare}><Share2 className="h-4 w-4"/><span className="hidden sm:inline">Share</span></Button>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${theme==="dark"?"light":"dark"} theme`}>{theme==="dark"? <Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}</Button>
      </div>
    </header>
  );
}

function ExplorePage({ workerClient, onToggleMobile }: { workerClient: WorkerClient; onToggleMobile?:()=>void }) {
  const analysis = useAnalysisStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [meta, setMeta] = React.useState<DatasetMeta | null>(null);
  const [analytics, setAnalytics] = React.useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [workerReady, setWorkerReady] = React.useState(false);
  const [rows, setRows] = React.useState<CommerceRecord[]>([]);
  const [totalRows, setTotalRows] = React.useState(0);
  const [rowsOffset, setRowsOffset] = React.useState(0);
  const [rowsLoading, setRowsLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<CommerceRecord | null>(null);
  const [shareFeedback, setShareFeedback] = React.useState<string | null>(null);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [importedDatasets, setImportedDatasets] = React.useState<DatasetMeta[]>([]);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const isApplyingUrl = React.useRef(false);
  const lastAnalysisRef = React.useRef<string>("");
  const rowCacheRef = React.useRef<Map<string, { rows:CommerceRecord[]; total:number; offset:number }>>(new Map());

  // Load meta for display; handle URL init
  React.useEffect(()=>{
    const urlState = deserializeFromUrl(location.search);
    if (urlState) {
      isApplyingUrl.current = true;
      analysis.setAll(urlState);
      setTimeout(()=> isApplyingUrl.current=false, 100);
    }
    // eslint-disable-next-line
  },[]);

  // Init worker demo
  React.useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    workerClient.initializeDemo().then(m=>{
      if (cancelled) return;
      setMeta(m);
      setWorkerReady(true);
      // If analysis datasetId mismatched, keep demo
      // Load imported datasets meta
      db.datasets.toArray().then(arr=> setImportedDatasets(arr.map(a=> a.meta)));
      // If analysis had imported datasetId but not present, show warning later
    }).catch(e=> console.error(e));
    return ()=> { cancelled=true };
  },[workerClient]);

  // Handle analysis → analytics query + URL sync
  React.useEffect(()=>{
    if (!workerReady) return;
    const analysisState = {
      datasetId: analysis.datasetId,
      filters: analysis.filters,
      sort: analysis.sort,
      timeGrouping: analysis.timeGrouping,
      columnVisibility: analysis.columnVisibility,
    };
    const hash = JSON.stringify(analysisState);
    if (hash === lastAnalysisRef.current) return;
    lastAnalysisRef.current = hash;

    // URL sync (avoid loop)
    if (!isApplyingUrl.current) {
      const url = serializeToUrl(analysisState);
      const current = location.search;
      if (url !== current) {
        // use replace for typing (search), push for intentional? Simplified: replace for search diff, push otherwise
        const isSearchChange = analysis.filters.search !== deserializeFromUrl(current)?.filters.search;
        if (isSearchChange) navigate(url, { replace:true });
        else navigate(url, { replace:false });
      }
    }

    // Dataset missing handling
    if (meta && analysis.datasetId !== meta.id) {
      // check if imported dataset exists in dexie
      const trySwitch = async()=>{
        const found = await db.datasets.get(analysis.datasetId);
        if (found) {
          // load into worker
          try {
            const m = await workerClient.importDataset(found.meta, found.records);
            setMeta(m);
          } catch {}
        } else {
          // missing dataset state
          // keep analytics null and show missing UI
          setAnalytics(null);
          setLoading(false);
          return;
        }
      };
      // if not found, we already handled; else switch
      // Fire and continue to query after switch? For now if not demo, attempt switch
      if (analysis.datasetId.startsWith("imported:")) {
        trySwitch();
        return;
      }
    }

    rowCacheRef.current.clear();
    const t0 = performance.now();
    setLoading(true);
    workerClient.queryAnalytics(analysisState).then(({result, durationMs})=>{
      // stale check via revision: workerClient.currentRevision should equal requested? we already guard
      setAnalytics(result);
      setTotalRows(result.totalMatching);
      setLoading(false);
      const t1 = performance.now();
      // optional performance log
      console.debug(`[perf] query analytics worker ${durationMs.toFixed(1)}ms, e2e ${(t1-t0).toFixed(1)}ms`);
      // Auto-switch grouping based on date range if user hasn't manually set? Keep manual.
      // Fetch initial rows window
      fetchRows(0, 100);
    }).catch(err=>{
      console.error(err);
      setLoading(false);
    });
  }, [analysis.datasetId, analysis.filters.dateRange, analysis.filters.regions, analysis.filters.categories, analysis.filters.channels, analysis.filters.segments, analysis.filters.statuses, analysis.filters.search, analysis.sort.column, analysis.sort.direction, analysis.timeGrouping, JSON.stringify(analysis.columnVisibility), workerReady, meta?.id]);

  const fetchRows = React.useCallback((offset:number, limit:number)=>{
    if (!workerReady) return;
    const a = {
      datasetId: analysis.datasetId,
      filters: analysis.filters,
      sort: analysis.sort,
      timeGrouping: analysis.timeGrouping,
      columnVisibility: analysis.columnVisibility,
    };
    const key = `${JSON.stringify(a)}::${offset}-${limit}`;
    const cached = rowCacheRef.current.get(key);
    if (cached) {
      setRows(cached.rows);
      setTotalRows(cached.total);
      setRowsOffset(cached.offset);
      return;
    }
    setRowsLoading(true);
    workerClient.getRows(a, offset, limit).then(({rows: newRows, total, offset: off})=>{
      // bounded cache: keep last 20 windows
      if (rowCacheRef.current.size > 20) {
        const firstKey = rowCacheRef.current.keys().next().value;
        if (firstKey) rowCacheRef.current.delete(firstKey);
      }
      rowCacheRef.current.set(key, { rows: newRows, total, offset: off });
      setRows(newRows);
      setTotalRows(total);
      setRowsOffset(off);
      setRowsLoading(false);
    }).catch(()=> setRowsLoading(false));
  }, [workerClient, analysis.datasetId, analysis.filters, analysis.sort, analysis.timeGrouping, analysis.columnVisibility, workerReady]);

  const handleSort = (col: import("./engine/contracts/types").ColumnId)=>{
    const cur = analysis.sort;
    if (cur.column===col) analysis.setSort(col, cur.direction==="asc"?"desc":"asc");
    else analysis.setSort(col, "asc");
  };

  const handleOpenRecord = async(id:string, e?: React.MouseEvent)=>{
    if (e) triggerRef.current = e.currentTarget as any;
    setSelectedId(id);
    setDrawerOpen(true);
    try {
      const rec = await workerClient.getRecord(id);
      setSelectedRecord(rec);
    } catch { setSelectedRecord(null); }
  };

  const handleShare = async()=>{
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setShareFeedback("Link copied!"); }
    catch {
      // fallback
      const inp = document.createElement("input"); inp.value=url; document.body.appendChild(inp); inp.select(); document.execCommand("copy"); document.body.removeChild(inp);
      setShareFeedback("Link copied (fallback)!");
    }
    setTimeout(()=> setShareFeedback(null), 2500);
  };

  const handleExport = async()=>{
    const a = { datasetId: analysis.datasetId, filters: analysis.filters, sort: analysis.sort, timeGrouping: analysis.timeGrouping, columnVisibility: analysis.columnVisibility };
    try {
      const {csv, count} = await workerClient.exportFiltered(a);
      const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const filename = `prismatic-export-${new Date().toISOString().slice(0,10)}-${count}-rows.csv`;
      const link = document.createElement("a"); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); document.body.removeChild(link);
      setTimeout(()=> URL.revokeObjectURL(url), 5000);
    } catch(e){ alert("Export failed: "+ (e as Error).message); }
  };

  React.useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setPaletteOpen(v=>!v); } };
    const onSave=()=> setSaveOpen(true);
    const onExport=()=> handleExport();
    window.addEventListener("keydown", onKey);
    document.addEventListener("prismatic:open-save", onSave as any);
    document.addEventListener("prismatic:export", onExport as any);
    return ()=>{ window.removeEventListener("keydown", onKey); document.removeEventListener("prismatic:open-save", onSave as any); document.removeEventListener("prismatic:export", onExport as any); };
  },[]);

  // Missing dataset UI
  const missingDataset = meta && analysis.datasetId !== meta.id && !importedDatasets.find(m=> m.id===analysis.datasetId);

  const sparkline = analytics?.timeSeries.map(b=> b.revenueCents/100) ?? [];

  return (
    <>
      <TopHeader meta={meta} workerLoading={!workerReady} onShare={handleShare} onSaveView={()=> setSaveOpen(true)} onToggleMobile={onToggleMobile ?? (()=>{})} />
      <div id="main" className="flex-1 p-3 md:p-4 space-y-4 max-w-[1600px] mx-auto w-full">
        {missingDataset && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5"/>
              <div className="flex-1">
                <div className="font-medium text-sm">Dataset not found — local file may have been removed</div>
                <div className="text-xs text-muted-foreground">This shared link references an imported dataset (<code>{analysis.datasetId}</code>) that isn't available on this device. Imported files are stored locally only and cannot be shared via URL. Switch back to the demo dataset or re-import the file.</div>
                <div className="flex gap-2 mt-2"><Button size="sm" variant="outline" onClick={()=> { analysis.setDatasetId("demo-v2"); if(meta?.id!=="demo-v2") workerClient.initializeDemo().then(setMeta); }}>Switch to demo</Button><Button size="sm" variant="ghost" onClick={()=> window.location.href = window.location.pathname}>Clear filters</Button></div>
              </div>
            </CardContent>
          </Card>
        )}

        <FilterBar totalMatching={analytics?.totalMatching ?? 0} onOpenMobileFilters={()=> setMobileFiltersOpen(true)} />

        <KpiCards kpi={analytics?.kpi ?? null} sparklineData={sparkline} loading={loading || !workerReady} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-3"><RevenueTimeChart data={analytics?.timeSeries ?? []} loading={loading}/></div>
          <RevenueByCategoryChart data={analytics?.byCategory ?? []} loading={loading}/>
          <OrdersByRegionChart data={analytics?.byRegion ?? []} loading={loading}/>
          <Card className="flex flex-col">
            <CardHeader className="pb-2"><CardTitle>Status breakdown</CardTitle><CardDescription>Counts include all statuses; revenue KPIs Completed only.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {analytics ? Object.entries(analytics.statusBreakdown).map(([s,c])=> (
                <div key={s} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${s==="Completed"?"bg-emerald-500": s==="Pending"?"bg-amber-500": s==="Cancelled"?"bg-slate-400":"bg-red-500"}`}/>{s}</span><span className="tabular-nums font-medium">{(c as number).toLocaleString()} ({analytics.totalMatching? ((c as number)/analytics.totalMatching*100).toFixed(1):"0"}%)</span></div>
              )) : <div className="text-sm text-muted-foreground">Loading…</div>}
              <div className="text-xs text-muted-foreground pt-2 border-t">Dataset: {meta?.name ?? "—"} • {meta?.source==="synthetic" && "Synthetic demo data — not real financial results"}</div>
            </CardContent>
          </Card>
        </div>

        <RecordsTable total={totalRows} rows={rows} offset={rowsOffset} loading={rowsLoading || loading} onFetchWindow={fetchRows} onSort={handleSort} onOpenRecord={handleOpenRecord} onExport={handleExport} />

        {/* Mobile filter sheet */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen} side="bottom">
          <div className="p-4 border-b flex items-center justify-between"><span className="font-semibold">Filters</span><button onClick={()=> setMobileFiltersOpen(false)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent"><X className="h-4 w-4"/></button></div>
          <div className="p-4 space-y-3 overflow-auto">
            <FilterBar totalMatching={analytics?.totalMatching ?? 0} />
            <Button className="w-full" onClick={()=> setMobileFiltersOpen(false)}>Done</Button>
          </div>
        </Sheet>

        <RecordDrawer open={drawerOpen} onOpenChange={setDrawerOpen} record={selectedRecord} />

        <SaveViewDialog open={saveOpen} onOpenChange={setSaveOpen} analysis={analysis} meta={meta} />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        {shareFeedback && <div role="status" aria-live="polite" className="fixed bottom-4 right-4 bg-foreground text-background px-3 py-2 rounded-md text-sm shadow-lg">{shareFeedback}</div>}
      </div>
    </>
  );
}

function SaveViewDialog({ open, onOpenChange, analysis, meta }: { open:boolean; onOpenChange:(v:boolean)=>void; analysis:any; meta:DatasetMeta|null }) {
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const handleSave = async()=>{
    if (!name.trim()) { setError("Name is required"); return; }
    if (name.trim().length < 3) { setError("Name must be at least 3 characters"); return; }
    setSaving(true);
    try {
      const id = `view-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      await db.savedViews.add({ id, name: name.trim(), description: desc.trim() || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), datasetId: analysis.datasetId, analysis: { datasetId: analysis.datasetId, filters: analysis.filters, sort: analysis.sort, timeGrouping: analysis.timeGrouping, columnVisibility: analysis.columnVisibility }});
      setName(""); setDesc(""); onOpenChange(false);
    } catch(e:any){ setError(e.message); }
    finally{ setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={()=> onOpenChange(false)}>
        <DialogHeader><DialogTitle>Save current view</DialogTitle><DialogDescription>Save filters, search, sorting, and column preferences for this dataset. Stored locally in your browser.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="view-name">Name *</Label><Input id="view-name" value={name} onChange={e=> setName(e.target.value)} placeholder="Q4 North America — Web only" maxLength={60} /><div className="text-xs text-muted-foreground">{name.length}/60</div></div>
          <div><Label htmlFor="view-desc">Description (optional)</Label><Input id="view-desc" value={desc} onChange={e=> setDesc(e.target.value)} placeholder="For ops review" maxLength={120} /></div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="text-xs text-muted-foreground">Dataset: {meta?.name ?? analysis.datasetId} • URL state will be saved.</div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=> onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save view"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SavedViewsPage({ workerClient }: { workerClient: WorkerClient }) {
  const [views, setViews] = React.useState<any[]>([]);
  const [meta, setMeta] = React.useState<DatasetMeta | null>(null);
  const navigate = useNavigate();
  const analysis = useAnalysisStore();
  const load = React.useCallback(()=> db.savedViews.toArray().then(setViews), []);
  React.useEffect(()=>{ load(); workerClient.initializeDemo().then(setMeta).catch(()=>{}); },[load, workerClient]);
  const handleOpen = (v:any)=>{
    analysis.setAll(v.analysis);
    navigate(`/${serializeToUrl(v.analysis)}`);
  };
  const handleDelete = async(id:string)=>{
    if (!confirm("Delete this saved view?")) return;
    await db.savedViews.delete(id); load();
  };
  const handleRename = async(v:any)=>{
    const newName = prompt("Rename view", v.name);
    if (!newName || newName.trim().length<3) return;
    await db.savedViews.update(v.id, { name: newName.trim(), updatedAt: new Date().toISOString() }); load();
  };
  return (
    <>
      <div className="h-[56px] border-b bg-card flex items-center px-4 gap-2">
        <h1 className="font-semibold">Saved Views</h1>
        <span className="text-xs text-muted-foreground">{views.length} saved</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={()=> navigate("/")}>Back to Explore</Button>
      </div>
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {views.length===0 ? (
          <Card className="p-12 text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center"><BookmarkPlus className="h-6 w-6 text-muted-foreground"/></div>
            <div className="font-medium">No saved views yet</div>
            <div className="text-sm text-muted-foreground">Explore your data, then save the current filters as a view. Views are stored locally in IndexedDB.</div>
            <Button onClick={()=> navigate("/")}>Go to Explore</Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {views.map(v=> (
              <Card key={v.id} className="p-4 flex flex-col md:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{v.name}</div>
                  {v.description && <div className="text-sm text-muted-foreground truncate">{v.description}</div>}
                  <div className="text-xs text-muted-foreground mt-1">Dataset: {v.datasetId} • Created {new Date(v.createdAt).toLocaleString()} • Updated {new Date(v.updatedAt).toLocaleString()}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {v.analysis.filters?.regions?.map((r:string)=><Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
                    {v.analysis.filters?.categories?.map((c:string)=><Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                    {v.analysis.filters?.search && <Badge variant="outline" className="text-xs">Search: {v.analysis.filters.search}</Badge>}
                  </div>
                </div>
                <div className="flex md:flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={()=> handleOpen(v)}>Open</Button>
                  <Button size="sm" variant="outline" onClick={()=> handleRename(v)}>Rename</Button>
                  <Button size="sm" variant="ghost" onClick={()=> handleDelete(v.id)}><Trash2 className="h-4 w-4"/></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function DataSourcesPage({ workerClient }: { workerClient: WorkerClient }) {
  const [meta, setMeta] = React.useState<DatasetMeta | null>(null);
  const [datasets, setDatasets] = React.useState<any[]>([]);
  const [activeId, setActiveId] = React.useState<string>("demo-v2");
  const [importProgress, setImportProgress] = React.useState<string | null>(null);
  const analysis = useAnalysisStore();
  const navigate = useNavigate();

  const reload = React.useCallback(async()=>{
    try { const m = await workerClient.initializeDemo(); setMeta(m); } catch {}
    const all = await db.datasets.toArray();
    setDatasets(all);
    setActiveId(analysis.datasetId);
  },[workerClient, analysis.datasetId]);

  React.useEffect(()=>{ reload(); },[reload]);

  const handleSwitch = async(id:string)=>{
    analysis.setDatasetId(id);
    if (id==="demo-v2") {
      const m = await workerClient.initializeDemo();
      setMeta(m);
    } else {
      const found = await db.datasets.get(id);
      if (found) {
        const m = await workerClient.importDataset(found.meta, found.records);
        setMeta(m);
      }
    }
    navigate(`/${serializeToUrl({ ...analysis, datasetId:id } as any)}`);
    setActiveId(id);
  };

  const handleDownloadTemplate = ()=>{
    const csv = buildTemplateCsv();
    const blob = new Blob([csv], {type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="prismatic-template.csv"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  };

  const handleFile = async(e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if (!file) return;
    setImportProgress(null);
    if (file.size > MAX_FILE_SIZE) { alert(`File too large: ${(file.size/1024/1024).toFixed(1)}MB > 25MB`); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { alert("Please select a CSV file"); return; }
    setImportProgress("Parsing…");
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string,string>>(text, { header:true, skipEmptyLines:true });
      if (parsed.errors.length) console.warn(parsed.errors);
      const rows = parsed.data as Record<string,string>[];
      if (rows.length > MAX_ROWS) { alert(`Too many rows: ${rows.length.toLocaleString()} > ${MAX_ROWS.toLocaleString()}`); return; }
      setImportProgress(`Validating ${rows.length.toLocaleString()} rows…`);
      // preview first 5
      const sample = rows.slice(0,5);
      console.debug("Sample", sample);
      const result = validateAndMapRows(rows);
      if (result.errors.length>0 && result.valid.length===0) {
        const examples = result.errors.slice(0,5).map(err=> `Row ${err.row}: ${err.field} — ${err.message} (“${err.raw}”)`).join("\n");
        alert(`All rows invalid. Examples:\n${examples}\n\nValid: ${result.validCount}, Invalid: ${result.invalidCount}`);
        setImportProgress(null);
        return;
      }
      if (result.errors.length>0) {
        const proceed = confirm(`Found ${result.invalidCount} invalid rows and ${result.validCount} valid rows. Proceed to import valid rows only?\n\nExamples:\n${result.errors.slice(0,3).map(e=>`Row ${e.row}: ${e.message}`).join("\n")}`);
        if (!proceed) { setImportProgress(null); return; }
      }
      setImportProgress(`Importing ${result.validCount.toLocaleString()} rows…`);
      if (result.valid.length===0) { alert("No valid rows to import"); setImportProgress(null); return; }
      // Check storage quota roughly
      const id = `imported:${Date.now()}-${file.name.replace(/[^a-z0-9]/gi,"-").slice(0,12)}`;
      const dateRange: [string,string] = (()=> {
        const dates = result.valid.map(r=> r.orderDate).sort();
        return [dates[0]!, dates[dates.length-1]!] as [string,string];
      })();
      const metaObj: DatasetMeta = { id, name: file.name.replace(/\.csv$/i,""), source:"imported", recordCount: result.valid.length, dateRange, schemaVersion:"2.0.0", createdAt: new Date().toISOString() };
      await db.datasets.add({ id, meta: metaObj, records: result.valid });
      const m = await workerClient.importDataset(metaObj, result.valid);
      setMeta(m);
      analysis.setDatasetId(id);
      // Reset filters to useful range (full range)
      analysis.setDateRange(dateRange);
      analysis.setRegions([]); analysis.setCategories([]); analysis.setChannels([]); analysis.setSegments([]); analysis.setStatuses([]); analysis.setSearch("");
      navigate(`/${serializeToUrl({ ...analysis, datasetId:id, filters:{...analysis.filters, dateRange }} as any)}`);
      setActiveId(id);
      reload();
      setImportProgress(`Imported ${result.validCount.toLocaleString()} rows`);
      setTimeout(()=> setImportProgress(null), 3000);
    } catch(err:any){ alert("Import failed: "+ err.message); setImportProgress(null); }
    finally { e.target.value=""; }
  };

  const handleDeleteDataset = async(id:string)=>{
    if (!confirm("Delete this imported dataset and all its saved views referencing it?")) return;
    await db.datasets.delete(id);
    const relatedViews = await db.savedViews.where("datasetId").equals(id).toArray();
    for (const v of relatedViews) await db.savedViews.delete(v.id);
    if (activeId===id) {
      analysis.setDatasetId("demo-v2");
      const m = await workerClient.initializeDemo(); setMeta(m); setActiveId("demo-v2");
      navigate(`/${serializeToUrl({ ...analysis, datasetId:"demo-v2"} as any)}`);
    }
    reload();
  };

  return (
    <>
      <div className="h-[56px] border-b bg-card flex items-center px-4 gap-2">
        <h1 className="font-semibold">Data Sources</h1>
        <Badge variant="secondary" className="ml-2">Local-only • No upload</Badge>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={()=> navigate("/")}>Back to Explore</Button>
      </div>
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        <Card className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200">
          <div className="flex gap-3">
            <Database className="h-5 w-5 text-amber-700 mt-0.5"/>
            <div className="text-sm">
              <div className="font-medium">Your data stays in this browser</div>
              <div className="text-muted-foreground">Imported CSVs are stored in IndexedDB on this device. They are never uploaded. Shared URLs only share filter configuration — recipients need the same file locally to reproduce an imported view. Demo data is synthetic.</div>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2">Demo dataset <Badge variant="outline">Synthetic</Badge></CardTitle><CardDescription>Deterministic 100,000 records spanning 2022-01-01 → 2024-12-31. Regenerated in the worker.</CardDescription></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Records:</span> <span className="font-medium tabular-nums">{meta?.recordCount.toLocaleString() ?? "100,000"}</span> • <span className="text-muted-foreground">Schema</span> v2.0.0 • <span className="text-muted-foreground">Gen</span> v2-mulberry</div>
              <div><span className="text-muted-foreground">Range:</span> {meta?.dateRange[0] ?? "2022-01-01"} → {meta?.dateRange[1] ?? "2024-12-31"}</div>
              <div className="flex gap-2 pt-2"><Button size="sm" variant={activeId==="demo-v2"?"default":"outline"} onClick={()=> handleSwitch("demo-v2")}>{activeId==="demo-v2"?"Active":"Switch to demo"}</Button><Button size="sm" variant="outline" onClick={handleDownloadTemplate}><FileDown className="h-4 w-4"/>Template CSV</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Import CSV</CardTitle><CardDescription>Drop a file or click to select. Max 25 MB / 250,000 rows. USD only.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 hover:bg-accent cursor-pointer">
                <Upload className="h-6 w-6 text-muted-foreground mb-2"/>
                <span className="text-sm font-medium">Select or drop CSV</span>
                <span className="text-xs text-muted-foreground">Required: id, orderDate, region, category, channel, quantity, revenue, cost</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} data-testid="csv-input" />
              </label>
              {importProgress && <div className="text-sm text-muted-foreground" role="status">{importProgress}</div>}
              <div className="text-xs text-muted-foreground">Optional: country, subcategory, productName, customerSegment, status, discountPercent, unitPriceCents. Money as 1234.56 or $1,234.56 → cents. Profit derived.</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Imported datasets</h2>
          {datasets.length===0 ? <div className="text-sm text-muted-foreground border rounded-xl p-8 text-center">No imported datasets yet. Use the importer above.</div> : (
            <div className="grid gap-3">
              {datasets.map(ds=> (
                <Card key={ds.id} className={`p-4 flex flex-col md:flex-row gap-3 ${activeId===ds.id?"ring-2 ring-primary":""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{ds.meta.name} <Badge variant={activeId===ds.id?"default":"secondary"} className="ml-2">{activeId===ds.id?"Active":""}{ds.meta.id}</Badge></div>
                    <div className="text-sm text-muted-foreground">{ds.meta.recordCount.toLocaleString()} records • {ds.meta.dateRange[0]} → {ds.meta.dateRange[1]} • {ds.meta.id}</div>
                    <div className="text-xs text-muted-foreground">Schema {ds.meta.schemaVersion} • Created {new Date(ds.meta.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant={activeId===ds.id?"default":"outline"} onClick={()=> handleSwitch(ds.id)}>{activeId===ds.id?"Active":"Switch"}</Button>
                    <Button size="sm" variant="ghost" onClick={()=> handleDeleteDataset(ds.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="p-4">
          <h3 className="font-medium text-sm mb-2">CSV requirements & sanitization</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            <li>Header row required; column names case-insensitive; required fields validated.</li>
            <li>Dates must be YYYY-MM-DD and valid; quantities positive integers; money finite.</li>
            <li>Duplicate IDs rejected; invalid rows shown with examples — you must confirm to import valid-only.</li>
            <li>On export, text fields starting with = + - @ | % are prefixed with a single quote to prevent spreadsheet formula injection. Numeric fields remain numbers.</li>
            <li>25 MB / 250k row limits enforced; storage quota errors surfaced with recovery guidance.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function AppShell() {
  const workerClient = useWorker();
  const [mobileNav, setMobileNav] = React.useState(false);
  const toggleMobile = React.useCallback(()=> setMobileNav(v=>!v), []);
  const ctx = React.useMemo(()=> ({ open: mobileNav, toggle: toggleMobile }), [mobileNav, toggleMobile]);
  return (
    <BrowserRouter>
      <MobileNavContext.Provider value={ctx}>
      <Shell mobileOpen={mobileNav} onToggleMobile={toggleMobile}>
        <Routes>
          <Route path="/" element={<ExplorePage workerClient={workerClient} onToggleMobile={toggleMobile} />} />
          <Route path="/saved" element={<SavedViewsPage workerClient={workerClient} />} />
          <Route path="/data" element={<DataSourcesPage workerClient={workerClient} />} />
          <Route path="*" element={<ExplorePage workerClient={workerClient} onToggleMobile={toggleMobile} />} />
        </Routes>
      </Shell>
      </MobileNavContext.Provider>
    </BrowserRouter>
  );
}

export default AppShell;
