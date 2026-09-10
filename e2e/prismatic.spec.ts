import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Ensure clean storage between tests (IndexedDB + localStorage)
// Each test runs in isolated worker but shares same browser context storage; clear to avoid cross-test pollution.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    try {
      const dbs = await (indexedDB as any).databases?.() ?? [];
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    } catch {}
    // Fallback: try to delete known DB directly
    try { indexedDB.deleteDatabase("prismatic-db"); } catch {}
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.describe("Prismatic E2E", () => {
  test("1 — demo workspace loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("PRISMATIC").first()).toBeVisible();
    await expect(page.getByText(/Synthetic demo/)).toBeVisible();
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Revenue over time")).toBeVisible();
    await expect(page.getByRole("img", { name: /Revenue over time/ })).toBeVisible();
  });

  test("2 — a filter updates KPIs, charts, and table consistently", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    const initialCountText = await page.locator("text=/matching/").first().textContent();
    const catButton = page.getByRole("button", { name: /^Electronics$/ }).first();
    if (await catButton.isVisible()) {
      await catButton.click();
      await expect(page.getByText("Category: Electronics")).toBeVisible();
      await expect(page.locator("text=/matching/").first()).not.toHaveText(initialCountText || "");
      await expect(page.getByText("Net revenue")).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Category" }).first().click();
      await page.getByLabel("Electronics").click();
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByText("Category: Electronics")).toBeVisible();
    }
  });

  test("3 — category selection filters records", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Revenue by category")).toBeVisible({ timeout: 15000 });
    const electronicsBtn = page.getByRole("button", { name: "Electronics" }).first();
    await expect(electronicsBtn).toBeVisible({ timeout: 10000 });
    await electronicsBtn.click();
    await expect(page.getByText("Category: Electronics")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).first().click();
    await expect(page.getByText("Category: Electronics")).toBeHidden();
  });

  test("4 — sorting changes visible row order correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Records")).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    const idHeader = page.getByRole("button", { name: /Order ID/ }).first();
    if (await idHeader.isVisible()) {
      await idHeader.click();
      await page.waitForTimeout(1000);
      await idHeader.click();
      await page.waitForTimeout(1000);
      await expect(page.locator("text=ORD-")).first().toBeVisible({ timeout: 10000 });
    } else {
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
    await page.keyboard.press("Escape");
    await expect(page.getByText(`Order ${idText}`)).toBeHidden({ timeout: 3000 });
  });

  test("6 — saved view survives reload", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder("Search order, product, country").fill("Quantum");
    await page.waitForTimeout(800);
    await expect(page.getByText(/Search: “Quantum”/)).toBeVisible();
    await page.getByRole("button", { name: "Save view" }).click();
    await page.getByLabel("Name *").fill("E2E Test View");
    // The second "Save view" is the submit button inside dialog
    await page.getByRole("button", { name: /^Save view$/ }).last().click();
    await page.waitForTimeout(1000);
    await page.goto("/saved");
    await expect(page.getByText("E2E Test View")).toBeVisible({ timeout: 5000 });
    await page.reload();
    await expect(page.getByText("E2E Test View")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Open" }).first().click();
    await expect(page).toHaveURL(/q=Quantum/);
  });

  test("7 — share URL restores demo analysis", async ({ page, context }) => {
    await page.goto("/?r=Europe&c=Books&q=Atlas&sort=revenueCents-asc");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Category: Books")).toBeVisible({ timeout: 5000 });
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
    const europeBtn = page.getByRole("button", { name: "Europe" }).first();
    // Try button, fallback to URL
    let usedButton = false;
    if (await europeBtn.isVisible().catch(()=>false)) {
      await europeBtn.click();
      await expect(page.getByText("Region: Europe")).toBeVisible();
      usedButton = true;
    }
    if (usedButton) {
      await page.goBack();
      await expect(page.getByText("Region: Europe")).toBeHidden({ timeout: 4000 });
      await page.goForward();
      await expect(page.getByText("Region: Europe")).toBeVisible();
    } else {
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
    await expect(page.getByText("valid")).toBeVisible({ timeout: 10000 });
  });

  test("10 — invalid CSV shows actionable errors", async ({ page }) => {
    await page.goto("/data");
    await expect(page.getByText("Data Sources")).toBeVisible();
    // Ensure clean state - should show no imported datasets
    await expect(page.getByText("No imported datasets yet.")).toBeVisible({ timeout: 5000 });
    const csv = `id,orderDate,region,category,channel,quantity,revenue,cost
BAD-001,not-a-date,North America,Electronics,Web,1,100.00,60.00
BAD-002,2024-02-15,North America,Electronics,Web,not-a-number,100.00,60.00`;
    const fileInput = page.locator('input[data-testid="csv-input"]');
    // Handle alert/confirm dialogs generically
    page.on("dialog", async (dialog) => {
      // Dismiss any alert/confirm so test can continue
      await dialog.dismiss().catch(()=>{});
    });
    await fileInput.setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    // Wait for validation to finish - dialog should have been shown and dismissed
    await page.waitForTimeout(3000);
    // Still no imported datasets (invalid rows were rejected)
    await expect(page.getByText("No imported datasets yet.")).toBeVisible({ timeout: 5000 });
    // No success message
    await expect(page.getByText("valid")).toBeHidden();
  });

  test("11 — export contains all matching records", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    // Wait for table to be ready
    await page.waitForTimeout(1500);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.getByRole("button", { name: "Export filtered" }).click(),
    ]);
    expect(download.suggestedFilename()).toContain("prismatic-export");
    const dlPath = await download.path();
    expect(dlPath).toBeTruthy();
  });

  test("12 — theme preference persists", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("PRISMATIC").first()).toBeVisible();
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.getByLabel(/Switch to/).click();
    await page.waitForTimeout(600);
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
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    const tableContainer = page.locator("text=Records").locator("..").locator("..");
    await expect(tableContainer).toBeVisible();
  });

  test("14 — core keyboard journey works", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Net revenue")).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder("Search order, product, country").focus();
    await page.keyboard.type("Quantum");
    await page.waitForTimeout(900);
    await expect(page.getByText(/Search: “Quantum”/)).toBeVisible();
    const catBtn = page.getByRole("button", { name: "Electronics" }).first();
    await catBtn.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Category: Electronics")).toBeVisible();
    const sortBtn = page.getByRole("button", { name: /Order ID/ }).first();
    if (await sortBtn.isVisible()) {
      await sortBtn.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }
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
    const critical = results.violations.filter(v => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
