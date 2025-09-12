import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('/');
  
  // Example: Check if the page loads
  await expect(page).toHaveTitle(/.*raiken.*/i);
  
  // Add your test steps here
  // await page.click('button[data-testid="my-button"]');
  // await expect(page.getByText('Success!')).toBeVisible();
});
