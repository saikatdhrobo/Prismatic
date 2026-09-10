import Dexie, { type Table } from "dexie";
import type { DatasetMeta, CommerceRecord } from "../../engine/contracts/types";

export type SavedView = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  datasetId: string;
  analysis: import("../../engine/contracts/types").AnalysisState;
};

export type StoredDataset = {
  id: string;
  meta: DatasetMeta;
  records: CommerceRecord[];
};

class PrismaticDB extends Dexie {
  savedViews!: Table<SavedView, string>;
  datasets!: Table<StoredDataset, string>;
  constructor() {
    super("prismatic-db");
    this.version(1).stores({
      savedViews: "id, datasetId, updatedAt",
      datasets: "id",
    });
  }
}
export const db = new PrismaticDB();
