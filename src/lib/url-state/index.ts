import { z } from "zod";
import type { AnalysisState, Channel, CustomerSegment, Status, ColumnId, TimeGrouping } from "../../engine/contracts/types";
import { ALL_COLUMNS, CHANNELS, SEGMENTS, STATUSES } from "../../engine/contracts/types";

const channelEnum = z.enum(["Web","Mobile","Marketplace","Retail"] as const);
const segmentEnum = z.enum(["Consumer","Small Business","Enterprise"] as const);
const statusEnum = z.enum(["Completed","Pending","Cancelled","Refunded"] as const);
const colEnum = z.enum(["id","orderDate","productName","category","region","channel","status","quantity","revenueCents","profitCents"] as const);
const groupingEnum = z.enum(["day","week","month"] as const);

export const analysisUrlSchema = z.object({
  v: z.literal(2).default(2),
  ds: z.string().default("demo-v2"),
  dr: z.tuple([z.string(), z.string()]).nullable().default(null), // date range
  r: z.array(z.string()).default([]),
  c: z.array(z.string()).default([]),
  ch: z.array(channelEnum).default([]),
  seg: z.array(segmentEnum).default([]),
  st: z.array(statusEnum).default([]),
  q: z.string().max(100).default(""),
  sort: z.object({ col: colEnum, dir: z.enum(["asc","desc"]) }).default({ col:"orderDate", dir:"desc" }),
  g: groupingEnum.default("month"),
  cols: z.array(colEnum).optional(), // visible columns encoded as list of visible
});

export type UrlState = z.infer<typeof analysisUrlSchema>;

export function analysisToUrlState(a: AnalysisState): UrlState {
  return {
    v:2,
    ds: a.datasetId,
    dr: a.filters.dateRange,
    r: a.filters.regions,
    c: a.filters.categories,
    ch: a.filters.channels,
    seg: a.filters.segments,
    st: a.filters.statuses,
    q: a.filters.search,
    sort: { col: a.sort.column, dir: a.sort.direction },
    g: a.timeGrouping,
    cols: ALL_COLUMNS.filter(col=> a.columnVisibility[col]),
  };
}

export function urlStateToAnalysis(u: UrlState, fallbackDatasetId="demo-v2"): AnalysisState {
  const cols = u.cols;
  const visibility: Record<ColumnId, boolean> = {} as any;
  for (const col of ALL_COLUMNS) visibility[col] = cols ? cols.includes(col as any) : true;
  // minimal validation for date strings: must match yyyy-mm-dd
  let dr: [string,string] | null = null;
  if (u.dr && /^\d{4}-\d{2}-\d{2}$/.test(u.dr[0]) && /^\d{4}-\d{2}-\d{2}$/.test(u.dr[1]) && u.dr[0] <= u.dr[1]) dr = u.dr;

  return {
    datasetId: u.ds || fallbackDatasetId,
    filters: {
      dateRange: dr,
      regions: Array.isArray(u.r) ? u.r.slice(0,20) : [],
      categories: Array.isArray(u.c) ? u.c.slice(0,20) : [],
      channels: Array.isArray(u.ch) ? u.ch as Channel[] : [],
      segments: Array.isArray(u.seg) ? u.seg as CustomerSegment[] : [],
      statuses: Array.isArray(u.st) ? u.st as Status[] : [],
      search: typeof u.q === "string" ? u.q.slice(0,100) : "",
    },
    sort: { column: (u.sort?.col as ColumnId) || "orderDate", direction: (u.sort?.dir as any) || "desc"},
    timeGrouping: (u.g as TimeGrouping) || "month",
    columnVisibility: visibility,
  };
}

// Compact serialization: use URLSearchParams with JSON where needed
export function serializeToUrl(state: AnalysisState): string {
  const u = analysisToUrlState(state);
  const params = new URLSearchParams();
  params.set("v", String(u.v));
  if (u.ds !== "demo-v2") params.set("ds", u.ds);
  if (u.dr) params.set("dr", `${u.dr[0]}_${u.dr[1]}`);
  if (u.r.length) params.set("r", u.r.join(","));
  if (u.c.length) params.set("c", u.c.join(","));
  if (u.ch.length) params.set("ch", u.ch.join(","));
  if (u.seg.length) params.set("seg", u.seg.join(","));
  if (u.st.length) params.set("st", u.st.join(","));
  if (u.q) params.set("q", u.q);
  // sort: col-dir
  if (!(u.sort.col==="orderDate" && u.sort.dir==="desc")) params.set("sort", `${u.sort.col}-${u.sort.dir}`);
  if (u.g !== "month") params.set("g", u.g);
  if (u.cols && u.cols.length !== ALL_COLUMNS.length) params.set("cols", u.cols.join(","));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function deserializeFromUrl(search: string): AnalysisState | null {
  try {
    const params = new URLSearchParams(search);
    if (!search || search==="?") return null;
    const v = params.get("v");
    if (v && v!=="2") {
      // version mismatch → attempt to still parse but warn; treat as invalid and return null to use defaults
      // we will try parse anyway if v missing
    }
    const ds = params.get("ds") || "demo-v2";
    const drRaw = params.get("dr");
    let dr: [string,string] | null = null;
    if (drRaw) {
      const parts = drRaw.split("_");
      if (parts.length===2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]!) && /^\d{4}-\d{2}-\d{2}$/.test(parts[1]!)) dr = [parts[0]!, parts[1]!] as [string,string];
    }
    const r = params.get("r") ? params.get("r")!.split(",").filter(Boolean) : [];
    const c = params.get("c") ? params.get("c")!.split(",").filter(Boolean) : [];
    const ch = params.get("ch") ? params.get("ch")!.split(",").filter(Boolean) as Channel[] : [];
    const seg = params.get("seg") ? params.get("seg")!.split(",").filter(Boolean) as CustomerSegment[] : [];
    const st = params.get("st") ? params.get("st")!.split(",").filter(Boolean) as Status[] : [];
    const q = params.get("q") || "";
    const sortRaw = params.get("sort");
    let sort: { col: ColumnId; dir:"asc"|"desc"} = { col:"orderDate", dir:"desc"};
    if (sortRaw) {
      const [col,dir] = sortRaw.split("-");
      if (col && dir && (dir==="asc"||dir==="desc") && ALL_COLUMNS.includes(col as ColumnId)) sort = { col: col as ColumnId, dir };
    }
    const g = (params.get("g") as TimeGrouping) || "month";
    const colsRaw = params.get("cols");
    let cols: ColumnId[] | undefined;
    if (colsRaw) cols = colsRaw.split(",").filter(Boolean).filter(c=> ALL_COLUMNS.includes(c as ColumnId)) as ColumnId[];

    const urlState: UrlState = {
      v:2,
      ds,
      dr,
      r,c, ch, seg, st,
      q: q.slice(0,100),
      sort,
      g: (["day","week","month"].includes(g) ? g : "month") as TimeGrouping,
      cols,
    };
    // validate with zod
    const parsed = analysisUrlSchema.safeParse(urlState);
    if (!parsed.success) return null;
    return urlStateToAnalysis(parsed.data);
  } catch { return null; }
}
