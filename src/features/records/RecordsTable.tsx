import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { flexRender, createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { CommerceRecord, ColumnId } from "../../engine/contracts/types";
import { ALL_COLUMNS } from "../../engine/contracts/types";
import { useAnalysisStore } from "../analytics/state/analysisStore";
import { formatCurrencyCents, formatNumber } from "../../lib/formatting";
import { Button } from "../../components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, Download } from "lucide-react";

type Props = {
  total:number;
  rows: CommerceRecord[]; // currently loaded window rows
  offset:number;
  loading:boolean;
  onFetchWindow:(offset:number, limit:number)=>void;
  onSort:(col:ColumnId)=>void;
  onOpenRecord:(id:string)=>void;
  onExport:()=>void;
  exportProgress?: string;
};

const colHelper = createColumnHelper<CommerceRecord>();

export function RecordsTable({ total, rows, offset, loading, onFetchWindow, onSort, onOpenRecord, onExport }: Props) {
  const { columnVisibility, setColumnVisibility, sort } = useAnalysisStore();
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Build columns dynamically based on visibility but keep order ALL_COLUMNS
  const visibleCols = ALL_COLUMNS.filter(c=> columnVisibility[c]);

  const columns = React.useMemo(()=>{
    const defs: any[] = [];
    const colMap: Record<ColumnId, any> = {
      id: colHelper.accessor("id", { header:"Order ID", size:140, cell: info=> <button onClick={()=> onOpenRecord(info.getValue())} className="font-mono text-xs text-primary hover:underline">{info.getValue()}</button> }),
      orderDate: colHelper.accessor("orderDate", { header:"Date", size:110, cell: info=> <span className="tabular-nums text-xs">{info.getValue()}</span> }),
      productName: colHelper.accessor("productName", { header:"Product", size:180, cell: info=> <span className="text-sm truncate block max-w-[180px]">{info.getValue()}</span> }),
      category: colHelper.accessor("category", { header:"Category", size:120 }),
      region: colHelper.accessor("region", { header:"Region", size:130 }),
      channel: colHelper.accessor("channel", { header:"Channel", size:100, cell: info=> <span className="text-xs px-1.5 py-0.5 rounded bg-secondary">{info.getValue()}</span> }),
      status: colHelper.accessor("status", { header:"Status", size:100, cell: info=>{
        const v=info.getValue(); const color = v==="Completed"? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100" : v==="Pending"? "bg-amber-100 text-amber-800" : v==="Cancelled"? "bg-slate-100 text-slate-600":"bg-red-100 text-red-700";
        return <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>{v}</span>
      }}),
      quantity: colHelper.accessor("quantity", { header:"Qty", size:70, meta:{ align:"right" }, cell: info=> <span className="tabular-nums text-right block">{info.getValue()}</span> }),
      revenueCents: colHelper.accessor("revenueCents", { header:"Revenue", size:110, meta:{ align:"right" }, cell: info=> <span className="tabular-nums text-right block font-medium">{formatCurrencyCents(info.getValue())}</span> }),
      profitCents: colHelper.accessor("profitCents", { header:"Profit", size:110, meta:{ align:"right" }, cell: info=> <span className={`tabular-nums text-right block ${info.getValue()<0 ? "text-[hsl(var(--negative))]" : "text-[hsl(var(--positive))]"}`}>{formatCurrencyCents(info.getValue())}</span> }),
    };
    for (const id of visibleCols) defs.push(colMap[id]);
    return defs;
  },[visibleCols, onOpenRecord]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  // Virtualizer over total rows
  const rowVirtualizer = useVirtualizer({
    count: total,
    getScrollElement: ()=> parentRef.current,
    estimateSize: ()=> 40,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Detect missing windows and fetch
  React.useEffect(()=>{
    if (total===0) return;
    const first = virtualItems[0]?.index ?? 0;
    const last = virtualItems[virtualItems.length-1]?.index ?? 0;
    // We have rows for offset..offset+rows.length-1
    const hasData = (idx:number)=> idx>=offset && idx < offset+rows.length;
    const missingStart = virtualItems.find(v=> !hasData(v.index));
    if (missingStart) {
      // fetch window centered around missing
      const targetOffset = Math.max(0, missingStart.index - 20);
      const limit = 100;
      onFetchWindow(targetOffset, limit);
    }
  },[virtualItems, offset, rows.length, total]);

  const endIdx = Math.min(total, offset+rows.length);

  return (
    <div className="border rounded-xl bg-card overflow-hidden flex flex-col">
      <div className="p-3 border-b flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-sm">Records</h3>
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} matching • showing {rows.length? `${(offset+1).toLocaleString()}–${endIdx.toLocaleString()}`:"—"}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">• Click Order ID for details • Shift-click header to sort</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Columns</span>
            {ALL_COLUMNS.map(col=> (
              <button key={col} onClick={()=> setColumnVisibility(col, !columnVisibility[col])} className={`h-7 px-2 rounded text-xs border ${columnVisibility[col]? "bg-primary text-primary-foreground border-primary":"bg-card"}`} aria-pressed={columnVisibility[col]} title={col}>
                {columnVisibility[col]? <Eye className="h-3 w-3 inline mr-1"/>:<EyeOff className="h-3 w-3 inline mr-1"/>}{col}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={onExport} disabled={loading || total===0}><Download className="h-4 w-4"/>Export filtered</Button>
        </div>
      </div>

      <div ref={parentRef} className="overflow-auto flex-1 max-h-[520px] relative" style={{ contain:"strict" }}>
        <div className="sticky top-0 z-10 bg-card border-b flex text-xs font-medium">
          {table.getHeaderGroups().map(hg=> hg.headers.map(header=> {
            const colId = (header.column.id as ColumnId);
            const isSorted = sort.column===colId;
            return (
              <div key={header.id} className="px-3 py-2 border-r last:border-r-0 flex items-center gap-1 shrink-0 bg-card" style={{ width: (header.column.columnDef.size as number) ?? 120, flex: header.column.columnDef.size? `0 0 ${header.column.columnDef.size}px`:"1 1 auto" }}>
                <button onClick={()=> onSort(colId)} className="flex items-center gap-1 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring rounded px-1 -ml-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {isSorted ? (sort.direction==="asc"? <ArrowUp className="h-3 w-3"/>:<ArrowDown className="h-3 w-3"/>): <ArrowUpDown className="h-3 w-3 opacity-40"/>}
                </button>
                <span className={`ml-auto w-1 h-6 cursor-col-resize hover:bg-primary/30 ${(header.column.getCanResize?.()??false) ? "":"hidden"}`} />
              </div>
            );
          }))}
        </div>

        {total===0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-sm font-medium">No matching records</div>
            <div className="text-xs text-muted-foreground">Try clearing filters or adjusting the date range.</div>
            <Button size="sm" variant="outline" onClick={()=> useAnalysisStore.getState().clearAllFilters()}>Clear filters</Button>
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position:"relative" }}>
            {virtualItems.map(virtualRow=>{
              const dataIndex = virtualRow.index - offset;
              const rowData = (dataIndex>=0 && dataIndex < rows.length) ? rows[dataIndex] : undefined;
              return (
                <div key={virtualRow.key} data-index={virtualRow.index} ref={rowVirtualizer.measureElement} className="absolute left-0 top-0 w-full flex border-b hover:bg-muted/50 text-sm" style={{ transform:`translateY(${virtualRow.start}px)` }}>
                  {rowData ? table.getRowModel().rows[dataIndex]!.getVisibleCells().map(cell=> {
                    const align = (cell.column.columnDef.meta as any)?.align === "right" ? "justify-end" : "justify-start";
                    return <div key={cell.id} className={`px-3 py-2 border-r last:border-r-0 flex items-center ${align} shrink-0 truncate`} style={{ width: (cell.column.columnDef.size as number) ?? 120, flex: cell.column.columnDef.size? `0 0 ${cell.column.columnDef.size}px`:"1 1 auto" }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                  }) : <div className="px-3 py-2 w-full text-xs text-muted-foreground animate-pulse">Loading...</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>Virtualized • {rowVirtualizer.getVirtualItems().length} rendered • overscan 10</span>
        {loading && <span className="animate-pulse">Loading…</span>}
      </div>
    </div>
  );
}
