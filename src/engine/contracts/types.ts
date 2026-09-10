export const SCHEMA_VERSION = "2.0.0";
export const DATASET_VERSION = "demo-v2";
export const DATASET_ID_DEMO = "demo-v2";
export const DEMO_RECORD_COUNT = 100_000;

export type Channel = "Web" | "Mobile" | "Marketplace" | "Retail";
export type CustomerSegment = "Consumer" | "Small Business" | "Enterprise";
export type Status = "Completed" | "Pending" | "Cancelled" | "Refunded";

export const CHANNELS: Channel[] = ["Web", "Mobile", "Marketplace", "Retail"];
export const SEGMENTS: CustomerSegment[] = ["Consumer", "Small Business", "Enterprise"];
export const STATUSES: Status[] = ["Completed", "Pending", "Cancelled", "Refunded"];

export const REGIONS = ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"] as const;
export type Region = typeof REGIONS[number];

export const CATEGORIES = ["Electronics", "Apparel", "Home & Garden", "Sports", "Beauty", "Books"] as const;
export type Category = typeof CATEGORIES[number];

export type CommerceRecord = {
  id: string;
  orderDate: string; // ISO yyyy-mm-dd
  region: string;
  country: string;
  category: string;
  subcategory: string;
  productName: string;
  channel: Channel;
  customerSegment: CustomerSegment;
  quantity: number;
  unitPriceCents: number;
  discountPercent: number;
  revenueCents: number;
  costCents: number;
  profitCents: number;
  status: Status;
};

export type DatasetMeta = {
  id: string;
  name: string;
  source: "synthetic" | "imported";
  recordCount: number;
  dateRange: [string, string];
  schemaVersion: string;
  generatorVersion?: string;
  createdAt: string;
};

export type ColumnId = "id" | "orderDate" | "productName" | "category" | "region" | "channel" | "status" | "quantity" | "revenueCents" | "profitCents";
export const ALL_COLUMNS: ColumnId[] = ["id","orderDate","productName","category","region","channel","status","quantity","revenueCents","profitCents"];

export type TimeGrouping = "day" | "week" | "month";

export type AnalysisState = {
  datasetId: string;
  filters: {
    dateRange: [string, string] | null;
    regions: string[];
    categories: string[];
    channels: Channel[];
    segments: CustomerSegment[];
    statuses: Status[];
    search: string;
  };
  sort: { column: ColumnId; direction: "asc" | "desc" };
  timeGrouping: TimeGrouping;
  columnVisibility: Record<ColumnId, boolean>;
};

export type KpiResult = {
  netRevenueCents: number;
  completedOrders: number;
  aovCents: number | null;
  profitMargin: number | null; // 0-1
  // comparison
  previous: {
    netRevenueCents: number | null;
    completedOrders: number | null;
    aovCents: number | null;
    profitMargin: number | null;
  };
  // null when prior range out of coverage or incomplete
  availableComparison: boolean;
};

export type TimeBucket = { date: string; revenueCents: number; orders: number; profitCents: number };
export type CategoryBucket = { category: string; revenueCents: number; orders: number };
export type RegionBucket = { region: string; orders: number; revenueCents: number };

export type AnalyticsResult = {
  kpi: KpiResult;
  timeSeries: TimeBucket[];
  byCategory: CategoryBucket[];
  byRegion: RegionBucket[];
  totalMatching: number;
  statusBreakdown: Record<Status, number>;
  filteredCountLabel: string;
};

export type WorkerRequest =
  | { requestId: string; type: "INITIALIZE_DEMO"; payload: { seed?: number } }
  | { requestId: string; type: "QUERY_ANALYTICS"; payload: { revision: number; analysis: AnalysisState } }
  | { requestId: string; type: "GET_ROWS"; payload: { revision: number; analysis: AnalysisState; offset: number; limit: number } }
  | { requestId: string; type: "GET_RECORD"; payload: { id: string } }
  | { requestId: string; type: "IMPORT_DATASET"; payload: { meta: DatasetMeta; records: CommerceRecord[] } }
  | { requestId: string; type: "EXPORT_FILTERED"; payload: { revision: number; analysis: AnalysisState } }
  | { requestId: string; type: "SWITCH_DATASET"; payload: { datasetId: string } };

export type WorkerResponse =
  | { requestId: string; type: "READY"; payload: { meta: DatasetMeta } }
  | { requestId: string; type: "ANALYTICS_RESULT"; revision: number; payload: AnalyticsResult; durationMs: number }
  | { requestId: string; type: "ROWS_RESULT"; revision: number; payload: { rows: CommerceRecord[]; total: number; offset: number } ; durationMs: number}
  | { requestId: string; type: "RECORD_RESULT"; payload: { record: CommerceRecord | null } }
  | { requestId: string; type: "EXPORT_RESULT"; revision: number; payload: { csv: string; count: number } }
  | { requestId: string; type: "ERROR"; error: { code: string; message: string } };
