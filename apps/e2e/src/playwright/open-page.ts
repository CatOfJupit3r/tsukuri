import type { Page } from '@playwright/test';

/**
 * Opens a page and waits until its scripts stopped loading, so the server-rendered markup is hydrated and reacts to
 * clicks.
 */
export async function openPage(page: Page, pagePath: string) {
  await page.goto(pagePath, { waitUntil: 'networkidle' });
}

export async function reloadPage(page: Page) {
  await page.reload({ waitUntil: 'networkidle' });
}
