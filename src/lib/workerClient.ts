import type { WorkerRequest, WorkerResponse, AnalysisState, DatasetMeta, CommerceRecord, AnalyticsResult } from "../engine/contracts/types";

type Pending = { resolve:(v:any)=>void; reject:(e:any)=>void; revision?: number };

export class WorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  private revision = 0;
  private nextId = 0;

  constructor(workerFactory: () => Worker) {
    this.worker = workerFactory();
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      const p = this.pending.get(res.requestId);
      if (!p) return;
      // stale check for analytics/rows via revision
      if ((res.type === "ANALYTICS_RESULT" || res.type === "ROWS_RESULT") && p.revision !== undefined) {
        if ((res as any).revision !== p.revision) {
          // ignore stale but still resolve? We reject stale to allow caller to ignore.
          // Instead, we just don't resolve and clean up; caller will have started newer request.
          // But to avoid hanging, we resolve only if latest revision matches current.
          // We'll check if revision is less than current global revision -> ignore
          if ((res as any).revision < this.revision) {
            this.pending.delete(res.requestId);
            return;
          }
        }
      }
      this.pending.delete(res.requestId);
      if (res.type === "ERROR") p.reject(new Error(res.error.message));
      else p.resolve(res);
    };
    this.worker.onerror = (e) => {
      for (const [,p] of this.pending) p.reject(e);
      this.pending.clear();
    };
  }

  private genId(): string { return `r-${++this.nextId}-${Date.now()}`; }

  private send<T extends WorkerResponse>(req: WorkerRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const revision = (req as any).payload?.revision;
      this.pending.set(req.requestId, { resolve, reject, revision });
      this.worker!.postMessage(req);
      // timeout? 30s
      setTimeout(()=> {
        if (this.pending.has(req.requestId)) {
          this.pending.delete(req.requestId);
          reject(new Error("Worker timeout"));
        }
      }, 30000);
    });
  }

  initializeDemo(): Promise<DatasetMeta> {
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"READY"}>>({ requestId, type:"INITIALIZE_DEMO", payload:{} as any }).then(r => r.payload.meta);
  }

  switchDataset(datasetId: string): Promise<DatasetMeta> {
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"READY"}>>({ requestId, type:"SWITCH_DATASET", payload:{ datasetId } }).then(r => r.payload.meta);
  }

  importDataset(meta: DatasetMeta, records: CommerceRecord[]): Promise<DatasetMeta> {
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"READY"}>>({ requestId, type:"IMPORT_DATASET", payload:{ meta, records }}).then(r=> r.payload.meta);
  }

  queryAnalytics(analysis: AnalysisState): Promise<{ result: AnalyticsResult; durationMs:number; revision:number }> {
    this.revision++;
    const revision = this.revision;
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"ANALYTICS_RESULT"}>>({ requestId, type:"QUERY_ANALYTICS", payload:{ revision, analysis } }).then(r=> ({ result: r.payload, durationMs: r.durationMs, revision: r.revision }));
  }

  getRows(analysis: AnalysisState, offset:number, limit:number): Promise<{ rows: CommerceRecord[]; total:number; offset:number; durationMs:number }> {
    // rows share same revision as analytics but we don't bump revision for pagination; use current
    const revision = this.revision;
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"ROWS_RESULT"}>>({ requestId, type:"GET_ROWS", payload:{ revision, analysis, offset, limit } }).then(r=> ({ rows: r.payload.rows, total: r.payload.total, offset: r.payload.offset, durationMs: r.durationMs }));
  }

  getRecord(id:string): Promise<CommerceRecord | null> {
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"RECORD_RESULT"}>>({ requestId, type:"GET_RECORD", payload:{ id } }).then(r=> r.payload.record);
  }

  exportFiltered(analysis: AnalysisState): Promise<{ csv:string; count:number; durationMs:number }> {
    const revision = this.revision;
    const requestId = this.genId();
    return this.send<Extract<WorkerResponse,{type:"EXPORT_RESULT"}>>({ requestId, type:"EXPORT_FILTERED", payload:{ revision, analysis } }).then(r=> ({ csv: r.payload.csv, count: r.payload.count, durationMs: (r as any).durationMs }));
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    for (const [,p] of this.pending) p.reject(new Error("Worker terminated"));
    this.pending.clear();
  }

  get currentRevision() { return this.revision; }
}
