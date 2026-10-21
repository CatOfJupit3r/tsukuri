import { expect, test } from '@playwright/test';

test('the home page reaches the API and reports it live', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Service is live')).toBeVisible();
});
