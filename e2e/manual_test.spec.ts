import { test, expect } from "@playwright/test";

test.describe("Manual Test", () => {
  test("should pass", async ({ page }) => {
    await page.goto("https://example.com");
    await expect(page).toHaveTitle(/Example/);
  });
});
