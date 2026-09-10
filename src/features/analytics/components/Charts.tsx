import * as React from "react";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent, DatasetComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { TimeBucket, CategoryBucket, RegionBucket } from "../../../engine/contracts/types";
import { useAnalysisStore } from "../state/analysisStore";
import { formatCurrencyCents } from "../../../lib/formatting";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, DatasetComponent, CanvasRenderer]);

function useECharts(containerRef: React.RefObject<HTMLDivElement | null>, option: EChartsOption, deps: any[]) {
  const chartRef = React.useRef<echarts.ECharts | null>(null);
  React.useEffect(()=>{
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, undefined, { renderer:"canvas" });
    chartRef.current = chart;
    const ro = new ResizeObserver(()=> chart.resize());
    ro.observe(containerRef.current);
    return ()=> { ro.disconnect(); chart.dispose(); chartRef.current=null; };
  },[]);
  React.useEffect(()=>{
    if (chartRef.current) chartRef.current.setOption(option as any, { notMerge:true });
  },deps);
  // theme aware: update on class change
  React.useEffect(()=>{
    const observer = new MutationObserver(()=> chartRef.current?.resize());
    observer.observe(document.documentElement, { attributes:true, attributeFilter:["class"] });
    return ()=> observer.disconnect();
  },[]);
  return chartRef;
}

export function RevenueTimeChart({ data, loading }: { data: TimeBucket[]; loading?:boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const setDateRange = useAnalysisStore(s=> s.setDateRange);
  const dates = data.map(d=> d.date);
  const revenues = data.map(d=> d.revenueCents/100);
  const option: EChartsOption = {
    tooltip:{ trigger:"axis", formatter:(params:any)=>{
      const p=params[0];
      return `${p.axisValue}<br/>Revenue: ${formatCurrencyCents(data[p.dataIndex]!.revenueCents)}<br/>Orders: ${data[p.dataIndex]!.orders}`;
    }},
    grid:{ left:48, right:16, top:8, bottom:24, containLabel:false },
    xAxis:{ type:"category", data:dates, axisLabel:{ fontSize:10, color:"hsl(var(--muted-foreground))" }, axisLine:{ show:false }, axisTick:{ show:false } },
    yAxis:{ type:"value", axisLabel:{ formatter:(v:number)=> `$${(v/1000).toFixed(0)}k`, fontSize:10, color:"hsl(var(--muted-foreground))" }, splitLine:{ lineStyle:{ color:"hsl(var(--border))", opacity:0.6}}},
    series:[{ type:"line", data:revenues, smooth:true, lineStyle:{ color:"hsl(var(--primary))", width:2 }, areaStyle:{ color:"rgba(99,102,241,0.12)" }, symbol:"none" }],
  };
  const chart = useECharts(ref, option, [JSON.stringify(data)]);
  React.useEffect(()=>{
    if (!chart.current) return;
    const handler = (params:any)=>{
      // click on time bucket: set date range to that bucket period
      // For day/week/month we map to range. Simplify: for day, set same day; week, monday to sunday; month, month.
      const idx = params.dataIndex;
      const d = data[idx];
      if (!d) return;
      // Already grouped: if data grouping is month, d.date is yyyy-mm-01 => set range to month
      // For day, same. For week, monday; set week.
      const grouping = useAnalysisStore.getState().timeGrouping;
      if (grouping==="day") setDateRange([d.date, d.date]);
      else if (grouping==="week") {
        const monday = new Date(d.date+"T12:00:00Z");
        const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate()+6);
        setDateRange([d.date, sunday.toISOString().slice(0,10)]);
      } else {
        const start = d.date;
        const y = parseInt(start.slice(0,4)), m=parseInt(start.slice(5,7));
        const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0,10);
        setDateRange([start, end]);
      }
    };
    chart.current.off("click"); chart.current.on("click", handler);
  },[data, chart]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle>Revenue over time</CardTitle>
        <div className="flex items-center gap-1">
          {(["day","week","month"] as const).map(g=>{
            const active = useAnalysisStore.getState().timeGrouping===g;
            return <Button key={g} variant={active?"secondary":"ghost"} size="sm" className="h-6 px-2 text-xs capitalize" onClick={()=> useAnalysisStore.getState().setTimeGrouping(g)}>{g}</Button>
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-muted-foreground mb-2">Click a point to filter by that period. Completed orders only. Zero-filled missing buckets.</div>
        {loading ? <div className="h-[220px] animate-pulse bg-muted rounded"/> : data.length===0 ? <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">No data for selected filters</div> : <div ref={ref} className="h-[220px] w-full" role="img" aria-label="Revenue over time line chart"/>}
        <details className="mt-2"><summary className="text-xs text-muted-foreground cursor-pointer">View data as table</summary>
          <div className="max-h-40 overflow-auto mt-2 border rounded">
            <table className="w-full text-xs"><thead><tr className="bg-muted"><th className="p-1 text-left">Date</th><th className="p-1 text-right">Revenue</th><th className="p-1 text-right">Orders</th></tr></thead><tbody>{data.map(d=> <tr key={d.date} className="border-t"><td className="p-1">{d.date}</td><td className="p-1 text-right tabular-nums">{formatCurrencyCents(d.revenueCents)}</td><td className="p-1 text-right">{d.orders}</td></tr>)}</tbody></table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export function RevenueByCategoryChart({ data, loading }: { data: CategoryBucket[]; loading?:boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { filters, toggleCategory } = useAnalysisStore();
  const cats = data.map(d=> d.category);
  const vals = data.map(d=> d.revenueCents/100);
  const option: EChartsOption = {
    tooltip:{ trigger:"axis", formatter:(params:any)=>{
      const p=params[0]; const row=data[p.dataIndex]; return `${row.category}<br/>Revenue: ${formatCurrencyCents(row.revenueCents)}<br/>Orders: ${row.orders}`;
    }},
    grid:{ left:96, right:16, top:8, bottom:16 },
    xAxis:{ type:"value", axisLabel:{ fontSize:10, color:"hsl(var(--muted-foreground))", formatter:(v:number)=> `$${(v/1000).toFixed(0)}k`}, splitLine:{ lineStyle:{ color:"hsl(var(--border))"}}},
    yAxis:{ type:"category", data:cats, axisLabel:{ fontSize:11, color:"hsl(var(--foreground))"}, axisTick:{show:false}, axisLine:{show:false} },
    series:[{ type:"bar", data: vals.map((v,i)=> ({ value:v, itemStyle:{ color: filters.categories.includes(cats[i]!) ? "hsl(var(--primary))" : "hsl(var(--chart-2))", borderRadius:4 } })), barWidth:18 }],
  };
  const chart = useECharts(ref, option, [JSON.stringify(data), JSON.stringify(filters.categories)]);
  React.useEffect(()=>{
    if (!chart.current) return;
    const h=(params:any)=>{ const cat=cats[params.dataIndex]; if(cat) toggleCategory(cat); };
    chart.current.off("click"); chart.current.on("click", h);
  },[cats, chart]);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle>Revenue by category</CardTitle><p className="text-xs text-muted-foreground">Click a bar to toggle that category filter. Completed revenue only.</p></CardHeader>
      <CardContent className="pt-0">
        {loading ? <div className="h-[220px] bg-muted animate-pulse rounded"/> : data.length===0 ? <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">No data</div> : <div ref={ref} className="h-[220px] w-full" role="img" aria-label="Revenue by category bar chart"/>}
        <div className="flex flex-wrap gap-1 mt-2">
          {data.map(d=> <Button key={d.category} variant={filters.categories.includes(d.category)?"default":"outline"} size="sm" className="h-7 text-xs" onClick={()=> toggleCategory(d.category)}>{d.category}</Button>)}
          {filters.categories.length>0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=> useAnalysisStore.getState().setCategories([])}>Clear</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export function OrdersByRegionChart({ data, loading }: { data: RegionBucket[]; loading?:boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { filters, toggleRegion } = useAnalysisStore();
  const regions = data.map(d=> d.region);
  const orders = data.map(d=> d.orders);
  const option: EChartsOption = {
    tooltip:{ trigger:"axis" },
    grid:{ left:120, right:16, top:8, bottom:16 },
    xAxis:{ type:"value", splitLine:{ lineStyle:{ color:"hsl(var(--border))"}}, axisLabel:{ fontSize:10, color:"hsl(var(--muted-foreground))"}},
    yAxis:{ type:"category", data:regions, axisLabel:{ fontSize:11}, axisTick:{show:false}, axisLine:{show:false} },
    series:[{ type:"bar", data: orders.map((v,i)=> ({ value:v, itemStyle:{ color: filters.regions.includes(regions[i]!) ? "hsl(var(--primary))" : "hsl(var(--chart-5))", borderRadius:4 } })), barWidth:18 }],
  };
  const chart = useECharts(ref, option, [JSON.stringify(data), JSON.stringify(filters.regions)]);
  React.useEffect(()=>{
    if (!chart.current) return;
    const h=(params:any)=>{ const r=regions[params.dataIndex]; if(r) toggleRegion(r); };
    chart.current.off("click"); chart.current.on("click", h);
  },[regions, chart]);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle>Orders by region</CardTitle><p className="text-xs text-muted-foreground">Click a bar to toggle that region. Counts include all statuses; revenue shown in tooltip is Completed only.</p></CardHeader>
      <CardContent className="pt-0">
        {loading ? <div className="h-[220px] bg-muted animate-pulse rounded"/> : data.length===0 ? <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">No data</div> : <div ref={ref} className="h-[220px] w-full" role="img" aria-label="Orders by region bar chart"/>}
        <div className="flex flex-wrap gap-1 mt-2">
          {data.map(d=> <Button key={d.region} variant={filters.regions.includes(d.region)?"default":"outline"} size="sm" className="h-7 text-xs" onClick={()=> toggleRegion(d.region)}>{d.region} ({d.orders})</Button>)}
          {filters.regions.length>0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=> useAnalysisStore.getState().setRegions([])}>Clear</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
