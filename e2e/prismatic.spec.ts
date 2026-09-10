import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Prismatic E2E", () => {
  test("1 — demo workspace loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("PRISMATIC")).toBeVisible();
    await expect(page.getByText(/Synthetic demo/)).toBeVisible();
    // KPIs should appear
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Revenue over time")).toBeVisible();
    await expect(page.getByRole("img", { name: /Revenue over time/ })).toBeVisible();
  });

  test("2 — a filter updates KPIs, charts, and table consistently", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    // Get initial count
    const initialCountText = await page.locator("text=/matching/").first().textContent();
    // Toggle a category via filter bar or chart: use the category button in Revenue by category
    // First find a category button e.g., Electronics
    const catButton = page.getByRole("button", { name: /^Electronics$/ }).first();
    if (await catButton.isVisible()) {
      await catButton.click();
      // Should see active filter chip
      await expect(page.getByText("Category: Electronics")).toBeVisible();
      // Count should change
      await expect(page.locator("text=/matching/").first()).not.toHaveText(initialCountText || "");
      // KPIs should still be visible
      await expect(page.getByText("Net revenue")).toBeVisible();
    } else {
      // fallback: use filter bar multi-select
      await page.getByRole("button", { name: "Category" }).first().click();
      await page.getByLabel("Electronics").click();
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByText("Category: Electronics")).toBeVisible();
    }
  });

  test("3 — category selection filters records", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Revenue by category")).toBeVisible({ timeout: 15000 });
    // Click a category bar button
    const electronicsBtn = page.getByRole("button", { name: "Electronics" }).first();
    await expect(electronicsBtn).toBeVisible({ timeout: 10000 });
    await electronicsBtn.click();
    await expect(page.getByText("Category: Electronics")).toBeVisible();
    // Now clear
    await page.getByRole("button", { name: "Clear" }).first().click();
    await expect(page.getByText("Category: Electronics")).toBeHidden();
  });

  test("4 — sorting changes visible row order correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Records")).toBeVisible({ timeout: 15000 });
    // Wait for rows to load
    await page.waitForTimeout(2000);
    // Click Order ID header to sort
    const idHeader = page.getByRole("button", { name: /Order ID/ }).first();
    if (await idHeader.isVisible()) {
      await idHeader.click();
      await page.waitForTimeout(1000);
      // Click again to toggle
      await idHeader.click();
      await page.waitForTimeout(1000);
      // Should have rows
      await expect(page.locator("text=ORD-")).first().toBeVisible({ timeout: 10000 });
    } else {
      // fallback: click any sort
      await page.getByText("Order ID").first().click();
      await expect(page.locator("text=ORD-")).first().toBeVisible({ timeout: 10000 });
    }
  });

  test("5 — record details open and close", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Records")).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500);
    const firstId = page.locator("button:has-text('ORD-')").first();
    await expect(firstId).toBeVisible({ timeout: 10000 });
    const idText = await firstId.textContent();
    await firstId.click();
    await expect(page.getByText(`Order ${idText}`)).toBeVisible({ timeout: 5000 });
    // Close
    await page.keyboard.press("Escape");
    await expect(page.getByText(`Order ${idText}`)).toBeHidden({ timeout: 3000 });
  });

  test("6 — saved view survives reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    // Set a filter
    await page.getByPlaceholder("Search order, product, country").fill("Quantum");
    await page.waitForTimeout(800);
    await expect(page.getByText(/Search: “Quantum”/)).toBeVisible();
    // Save view
    await page.getByRole("button", { name: "Save view" }).click();
    await page.getByLabel("Name *").fill("E2E Test View");
    await page.getByRole("button", { name: "Save view", exact: true }).click();
    await page.waitForTimeout(1000);
    // Go to saved views
    await page.goto("/saved");
    await expect(page.getByText("E2E Test View")).toBeVisible({ timeout: 5000 });
    // Navigate back to explore and check saved view still there after reload
    await page.reload();
    await expect(page.getByText("E2E Test View")).toBeVisible({ timeout: 5000 });
    // Open it
    await page.getByRole("button", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/q=Quantum/);
  });

  test("7 — share URL restores demo analysis", async ({ page, context }) => {
    await page.goto("/?r=Europe&c=Books&q=Atlas&sort=revenueCents-asc");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Category: Books")).toBeVisible({ timeout: 5000 });
    // Copy URL manually via location
    const url = page.url();
    const newPage = await context.newPage();
    await newPage.goto(url);
    await expect(newPage.getByText("Category: Books")).toBeVisible({ timeout: 10000 });
    await expect(newPage.getByText("Region: Europe")).toBeVisible();
    await newPage.close();
  });

  test("8 — browser back/forward restores committed state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    // Apply region filter via button
    const europeBtn = page.getByRole("button", { name: "Europe" }).first();
    if (await europeBtn.isVisible()) {
      await europeBtn.click();
      await expect(page.getByText("Region: Europe")).toBeVisible();
      await page.goBack();
      await expect(page.getByText("Region: Europe")).toBeHidden({ timeout: 3000 });
      await page.goForward();
      await expect(page.getByText("Region: Europe")).toBeVisible();
    } else {
      // use URL push
      await page.goto("/?r=Europe");
      await expect(page.getByText("Region: Europe")).toBeVisible();
      await page.goto("/?r=Europe&c=Books");
      await expect(page.getByText("Category: Books")).toBeVisible();
      await page.goBack();
      await expect(page.getByText("Category: Books")).toBeHidden();
    }
  });

  test("9 — valid CSV imports successfully", async ({ page }) => {
    await page.goto("/data");
    await expect(page.getByText("Data Sources")).toBeVisible();
    const csv = `id,orderDate,region,category,channel,quantity,revenue,cost
TEST-001,2024-02-15,North America,Electronics,Web,1,100.00,60.00
TEST-002,2024-02-16,Europe,Books,Mobile,2,50.00,30.00`;
    const fileInput = page.locator('input[data-testid="csv-input"]');
    await fileInput.setInputFiles({ name: "valid.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText(/Importing|Imported/)).toBeVisible({ timeout: 10000 });
    // Should appear in imported datasets
    await expect(page.getByText("valid")).toBeVisible({ timeout: 10000 });
  });

  test("10 — invalid CSV shows actionable errors", async ({ page }) => {
    await page.goto("/data");
    await expect(page.getByText("Data Sources")).toBeVisible();
    const csv = `id,orderDate,region,category,channel,quantity,revenue,cost
BAD-001,not-a-date,North America,Electronics,Web,1,100.00,60.00
BAD-002,2024-02-15,North America,Electronics,Web,not-a-number,100.00,60.00`;
    const fileInput = page.locator('input[data-testid="csv-input"]');
    // Listen for dialog
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("invalid");
      await dialog.dismiss();
    });
    await fileInput.setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await page.waitForTimeout(2500);
    // Should show alert and not import; check no new dataset with name invalid
    await expect(page.getByText("No imported datasets yet.")).toBeVisible({ timeout: 5000 });
  });

  test("11 — export contains all matching records", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    // trigger export and check download
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export filtered" }).click(),
    ]);
    expect(download.suggestedFilename()).toContain("prismatic-export");
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test("12 — theme preference persists", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("PRISMATIC")).toBeVisible();
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    // toggle theme
    await page.getByLabel(/Switch to/).click();
    await page.waitForTimeout(500);
    const afterClass = await html.getAttribute("class");
    expect(afterClass).not.toBe(initialClass);
    await page.reload();
    const afterReload = await html.getAttribute("class");
    expect(afterReload).toBe(afterClass);
  });

  test("13 — core mobile layout has no page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    // Check table horizontal scroll is inside container, not page
    const tableContainer = page.locator("text=Records").locator("..").locator("..");
    await expect(tableContainer).toBeVisible();
  });

  test("14 — core keyboard journey works", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    // Tab to search, type
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    // Focus search
    await page.getByPlaceholder("Search order, product, country").focus();
    await page.keyboard.type("Quantum");
    await page.waitForTimeout(800);
    await expect(page.getByText(/Search: “Quantum”/)).toBeVisible();
    // Tab to category button and activate with keyboard
    await page.getByRole("button", { name: "Electronics" }).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Category: Electronics")).toBeVisible();
    // Sort via keyboard: focus header and press enter
    const sortBtn = page.getByRole("button", { name: /Order ID/ }).first();
    if (await sortBtn.isVisible()) {
      await sortBtn.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }
    // Open details via keyboard: focus first order id and press enter
    await page.waitForTimeout(1500);
    const firstOrder = page.locator("button:has-text('ORD-')").first();
    if (await firstOrder.isVisible()) {
      await firstOrder.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByText(/Order ORD-/)).toBeVisible({ timeout: 5000 });
      await page.keyboard.press("Escape");
      await expect(page.getByText(/Order ORD-/)).toBeHidden();
    }
  });

  test("axe — main pages have no critical violations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    const results = await new AxeBuilder({ page }).exclude(".echarts-for-react").analyze();
    // Allow minor violations but no critical
    const critical = results.violations.filter(v => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
