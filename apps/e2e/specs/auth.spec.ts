import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { openPage, reloadPage } from '#~/playwright/open-page';

const PASSWORD = 'e2e-password-123';

/** A new account per run: a reused stack keeps the accounts of earlier runs. */
function createAccount() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { username: `e2e_${id}`, name: `E2E ${id}`, email: `e2e-${id}@example.com` };
}

async function signIn(page: Page, username: string) {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel('Password').press('Enter');
}

test('a visitor signs up, stays signed in across reloads, signs out and signs back in', async ({ page }) => {
  const account = createAccount();
  const userMenu = page.getByRole('button', { name: account.name });

  await openPage(page, '/auth');
  await page.getByRole('button', { name: 'Need an account? Sign Up' }).click();
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Name', { exact: true }).fill(account.name);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(userMenu).toBeVisible();

  await reloadPage(page);
  await expect(userMenu).toBeVisible();

  await userMenu.click();
  await page.getByRole('menuitem', { name: 'Sign Out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await expect(userMenu).toBeHidden();

  await signIn(page, account.username);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(userMenu).toBeVisible();
});
