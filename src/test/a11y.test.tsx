import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import App from "../App";
import axe from "axe-core";

describe("a11y — automated checks (jsdom)", () => {
  it("explore page has no critical axe violations (basic)", async () => {
    const { container } = render(<App />);
    // allow effects to run
    await new Promise(r => setTimeout(r, 200));
    const results = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    });
    const critical = results.violations.filter(v => v.impact === "critical");
    // In jsdom, some color-contrast checks are unreliable; we assert no critical
    expect(critical).toEqual([]);
    if (results.violations.length) {
      console.warn("axe violations", results.violations.map(v => `${v.id}: ${v.description}`));
    }
  });
});
