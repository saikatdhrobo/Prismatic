import { create } from "zustand";
import type { AnalysisState, ColumnId, TimeGrouping } from "../../../engine/contracts/types";
import { ALL_COLUMNS } from "../../../engine/contracts/types";

export const DEFAULT_ANALYSIS: AnalysisState = {
  datasetId: "demo-v2",
  filters: {
    dateRange: ["2024-01-01", "2024-03-31"],
    regions: [],
    categories: [],
    channels: [],
    segments: [],
    statuses: [],
    search: "",
  },
  sort: { column: "orderDate", direction: "desc" },
  timeGrouping: "month",
  columnVisibility: Object.fromEntries(ALL_COLUMNS.map(c=>[c,true])) as Record<ColumnId, boolean>,
};

type Actions = {
  setDateRange: (r:[string,string]|null)=>void;
  setRegions: (v:string[])=>void;
  toggleRegion: (r:string)=>void;
  setCategories: (v:string[])=>void;
  toggleCategory: (c:string)=>void;
  setChannels: (v:AnalysisState["filters"]["channels"])=>void;
  toggleChannel: (c:AnalysisState["filters"]["channels"][number])=>void;
  setSegments: (v:AnalysisState["filters"]["segments"])=>void;
  setStatuses: (v:AnalysisState["filters"]["statuses"])=>void;
  setSearch: (q:string)=>void;
  setSort: (col:ColumnId, dir:"asc"|"desc")=>void;
  setTimeGrouping: (g:TimeGrouping)=>void;
  setColumnVisibility: (col:ColumnId, visible:boolean)=>void;
  setAll: (s:AnalysisState)=>void;
  clearAllFilters: ()=>void;
  setDatasetId: (id:string)=>void;
};

export const useAnalysisStore = create<AnalysisState & Actions>((set, get)=> ({
  ...structuredClone(DEFAULT_ANALYSIS),
  setDateRange: (dateRange)=> set(s=> ({ filters: { ...s.filters, dateRange }})),
  setRegions: (regions)=> set(s=> ({ filters: { ...s.filters, regions }})),
  toggleRegion: (r)=> set(s=> {
    const regions = s.filters.regions.includes(r) ? s.filters.regions.filter(x=>x!==r) : [...s.filters.regions, r];
    return { filters: { ...s.filters, regions } };
  }),
  setCategories: (categories)=> set(s=> ({ filters: { ...s.filters, categories }})),
  toggleCategory: (c)=> set(s=> {
    const categories = s.filters.categories.includes(c) ? s.filters.categories.filter(x=>x!==c) : [...s.filters.categories, c];
    return { filters: { ...s.filters, categories } };
  }),
  setChannels: (channels)=> set(s=> ({ filters:{...s.filters, channels}})),
  toggleChannel: (ch)=> set(s=> {
    const channels = s.filters.channels.includes(ch) ? s.filters.channels.filter(x=>x!==ch) : [...s.filters.channels, ch];
    return { filters:{...s.filters, channels }};
  }),
  setSegments: (segments)=> set(s=> ({ filters:{...s.filters, segments}})),
  setStatuses: (statuses)=> set(s=> ({ filters:{...s.filters, statuses}})),
  setSearch: (search)=> set(s=> ({ filters:{...s.filters, search }})),
  setSort: (column, direction)=> set({ sort:{column, direction}}),
  setTimeGrouping: (timeGrouping)=> set({ timeGrouping }),
  setColumnVisibility: (col, visible)=> set(s=> ({ columnVisibility: { ...s.columnVisibility, [col]: visible }})),
  setAll: (analysis)=> set({...analysis}),
  clearAllFilters: ()=> set(()=> ({
    filters: {
      dateRange: null,
      regions: [], categories:[], channels:[], segments:[], statuses:[], search:""
    }
  })),
  setDatasetId: (datasetId)=> set({ datasetId }),
}));
