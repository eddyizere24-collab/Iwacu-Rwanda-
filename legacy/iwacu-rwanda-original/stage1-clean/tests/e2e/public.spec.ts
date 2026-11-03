import { test, expect } from "@playwright/test";

/**
 * Critical public journeys.
 * These tests exercise the UI shell and health endpoint without requiring
 * a fully seeded database.
 */

test.describe("public shell", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("health returns JSON", async ({ request }) => {
    const res = await request.get("/api/health");
    const ct = res.headers()["content-type"] || "";
    expect(ct).toContain("json");
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });
});
