import { describe, it, expect, vi } from "vitest";
import { WorkerClient } from "./workerClient";
import type { WorkerRequest, WorkerResponse } from "../engine/contracts/types";

// Minimal fake worker
function createFakeWorkerFactory() {
  let onmessage: ((e: MessageEvent)=>void) | null = null;
  const fakeWorker: any = {
    postMessage: vi.fn((req: WorkerRequest)=>{
      // echo back after tick
      setTimeout(()=>{
        if (req.type==="INITIALIZE_DEMO") {
          const res: WorkerResponse = { requestId:req.requestId, type:"READY", payload:{ meta:{ id:"demo-v2", name:"Demo", source:"synthetic", recordCount:100000, dateRange:["2022-01-01","2024-12-31"], schemaVersion:"2.0.0", createdAt: new Date().toISOString() } } };
          onmessage?.({ data: res } as MessageEvent);
        }
        if (req.type==="QUERY_ANALYTICS") {
          const res: WorkerResponse = { requestId:req.requestId, type:"ANALYTICS_RESULT", revision:(req as any).payload.revision, payload:{kpi:{netRevenueCents:100, completedOrders:1, aovCents:100, profitMargin:0.1, previous:{netRevenueCents:null, completedOrders:null, aovCents:null, profitMargin:null}, availableComparison:false}, timeSeries:[], byCategory:[], byRegion:[], totalMatching:1, statusBreakdown:{Completed:1, Pending:0, Cancelled:0, Refunded:0}, filteredCountLabel:"1" } as any, durationMs:5 };
          onmessage?.({ data: res } as MessageEvent);
        }
      }, 10);
    }),
    set onmessage(fn:any){ onmessage=fn; },
    get onmessage(){ return onmessage; },
    terminate: vi.fn(),
    onerror: null as any,
    addEventListener: vi.fn(),
  };
  return ()=> fakeWorker as unknown as Worker;
}

describe("WorkerClient stale protection", ()=>{
  it("resolves initialize", async()=>{
    const client = new WorkerClient(createFakeWorkerFactory());
    const meta = await client.initializeDemo();
    expect(meta.id).toBe("demo-v2");
    client.terminate();
  });
  it("handles revision increment", async()=>{
    const client = new WorkerClient(createFakeWorkerFactory());
    // fire two queries quickly
    const p1 = client.queryAnalytics({ datasetId:"demo-v2", filters:{ dateRange:["2024-01-01","2024-01-31"], regions:[], categories:[], channels:[], segments:[], statuses:[], search:""}, sort:{column:"orderDate", direction:"desc"}, timeGrouping:"month", columnVisibility: { id:true, orderDate:true, productName:true, category:true, region:true, channel:true, status:true, quantity:true, revenueCents:true, profitCents:true } as any });
    const p2 = client.queryAnalytics({ datasetId:"demo-v2", filters:{ dateRange:["2024-02-01","2024-02-28"], regions:[], categories:[], channels:[], segments:[], statuses:[], search:""}, sort:{column:"orderDate", direction:"desc"}, timeGrouping:"month", columnVisibility: { id:true, orderDate:true, productName:true, category:true, region:true, channel:true, status:true, quantity:true, revenueCents:true, profitCents:true } as any });
    const r2 = await p2;
    expect(r2.result.totalMatching).toBe(1);
    // p1 may be stale and ignored
    client.terminate();
  });
});
