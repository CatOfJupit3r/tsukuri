import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { openPage, reloadPage } from '#~/playwright/open-page';

test.use({ colorScheme: 'dark' });

async function chooseTheme(page: Page, themeName: string) {
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('menuitem', { name: themeName }).click();
}

/** The choice is stored in the background, so a reload right after the click may still show the previous theme. */
async function expectThemeAfterReload(page: Page, themeClass: string) {
  await expect(async () => {
    await reloadPage(page);
    await expect(page.locator('html')).toHaveAttribute('class', themeClass, { timeout: 1_000 });
  }).toPass();
}

test('a chosen theme applies at once and survives a reload', async ({ page }) => {
  await openPage(page, '/');
  const html = page.locator('html');
  const darkClass = (await html.getAttribute('class')) ?? '';

  await chooseTheme(page, 'Light');
  await expect(html).not.toHaveAttribute('class', darkClass);
  const lightClass = (await html.getAttribute('class')) ?? '';
  await expectThemeAfterReload(page, lightClass);

  await chooseTheme(page, 'Dark');
  await expect(html).toHaveAttribute('class', darkClass);
  await expectThemeAfterReload(page, darkClass);
});
