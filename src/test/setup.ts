import "@testing-library/jest-dom";

// Mock Worker for jsdom tests (vitest) — App expects Worker to exist
class MockWorker {
  onmessage: any = null;
  onerror: any = null;
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}
if (typeof globalThis.Worker === "undefined") {
  // @ts-ignore
  globalThis.Worker = MockWorker as any;
}
// Also mock ResizeObserver, matchMedia for jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  // @ts-ignore
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof window !== "undefined" && !window.matchMedia) {
  // @ts-ignore
  window.matchMedia = () => ({ matches: false, addListener:()=>{}, removeListener:()=>{}, addEventListener:()=>{}, removeEventListener:()=>{} });
}
// Mock URL.createObjectURL
if (typeof URL !== "undefined" && !URL.createObjectURL) {
  // @ts-ignore
  URL.createObjectURL = () => "blob:mock";
  // @ts-ignore
  URL.revokeObjectURL = () => {};
}
