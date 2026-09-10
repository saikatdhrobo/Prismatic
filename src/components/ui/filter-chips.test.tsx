import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterBar } from "../../features/analytics/components/FilterBar";
import { useAnalysisStore } from "../../features/analytics/state/analysisStore";

describe("FilterBar", ()=>{
  it("shows matching count and clear", ()=>{
    // set some filters
    useAnalysisStore.setState({ filters:{ dateRange:["2024-01-01","2024-01-31"], regions:[], categories:[], channels:[], segments:[], statuses:[], search:"" }, datasetId:"demo-v2", sort:{column:"orderDate", direction:"desc"}, timeGrouping:"month", columnVisibility: useAnalysisStore.getState().columnVisibility });
    const { container } = render(<FilterBar totalMatching={12345} />);
    expect(screen.getByText(/12,345 matching/)).toBeInTheDocument();
  });
  it("shows no matches explanation when chips clear", ()=>{
    const { container } = render(<FilterBar totalMatching={0} />);
    expect(screen.getByText(/0 matching/)).toBeInTheDocument();
  });
});
