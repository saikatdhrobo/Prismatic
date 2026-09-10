import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { formatCurrencyCents, formatNumber, formatPercent } from "../../../lib/formatting";
import type { KpiResult } from "../../../engine/contracts/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v,i)=>{
    const x = (i/(data.length-1))*100;
    const y = 100 - ((v - min)/range)*100;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" aria-hidden="true" preserveAspectRatio="none">
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" points={points} strokeLinejoin="round" strokeLinecap="round" opacity={0.9}/>
    </svg>
  );
}

function Delta({ current, previous }: { current: number | null; previous: number | null }) {
  if (previous===null || previous===0) return <span className="text-xs text-muted-foreground">— vs prior</span>;
  if (current===null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = (current - previous)/Math.abs(previous);
  const positive = pct > 0;
  const Icon = pct > 0.005 ? TrendingUp : pct < -0.005 ? TrendingDown : Minus;
  const color = pct > 0.005 ? "text-[hsl(var(--positive))]" : pct < -0.005 ? "text-[hsl(var(--negative))]" : "text-muted-foreground";
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}><Icon className="h-3 w-3"/>{pct>0?"+":""}{(pct*100).toFixed(1)}%<span className="font-normal text-muted-foreground ml-1">vs prior</span></span>;
}

export function KpiCards({ kpi, sparklineData, loading }: { kpi: KpiResult | null; sparklineData: number[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0,1,2,3].map(i=> <Card key={i} className="animate-pulse"><CardHeader><div className="h-3 w-20 bg-muted rounded"/></CardHeader><CardContent><div className="h-7 w-24 bg-muted rounded mb-2"/><div className="h-3 w-16 bg-muted rounded"/></CardContent></Card>)}
      </div>
    );
  }
  if (!kpi) return <div className="text-sm text-muted-foreground p-4">No data</div>;

  const cards = [
    { title:"Net revenue", value: formatCurrencyCents(kpi.netRevenueCents), tip:"Sum of Completed-order revenue (net after discount)", delta: <Delta current={kpi.netRevenueCents} previous={kpi.previous.netRevenueCents} />, avail:kpi.availableComparison },
    { title:"Completed orders", value: formatNumber(kpi.completedOrders), tip:"Count of Completed records", delta:<Delta current={kpi.completedOrders} previous={kpi.previous.completedOrders ?? null} />, avail:kpi.availableComparison },
    { title:"Avg order value", value: kpi.aovCents!==null ? formatCurrencyCents(kpi.aovCents) : "—", tip:"Completed revenue / Completed orders", delta:<Delta current={kpi.aovCents} previous={kpi.previous.aovCents} />, avail:kpi.availableComparison },
    { title:"Profit margin", value: kpi.profitMargin!==null ? `${(kpi.profitMargin*100).toFixed(1)}%` : "—", tip:"Completed profit / Completed revenue", delta: <Delta current={kpi.profitMargin} previous={kpi.previous.profitMargin} />, avail:kpi.availableComparison },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c=> (
        <Card key={c.title} className="relative overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-[11px] tracking-widest uppercase text-muted-foreground font-semibold flex items-center gap-1.5">
              {c.title}
              <span title={c.tip} aria-label={c.tip} className="h-4 w-4 rounded-full border grid place-items-center text-[10px] cursor-help">?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[22px] font-semibold tracking-tight tabular-nums leading-none">{c.value}</div>
            <div className="mt-1.5">{c.avail ? c.delta : <span className="text-xs text-muted-foreground">N/A — prior out of range</span>}</div>
            <div className="mt-3 opacity-60"><Sparkline data={sparklineData} /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
