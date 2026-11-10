import { expect, test } from '@playwright/test';

test('landing → editor → tools respond to shortcuts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan your renovation');

  await page.getByRole('link', { name: 'Start planning' }).click();
  await expect(page).toHaveURL(/\/editor$/);

  const tools = page.getByRole('navigation', { name: 'Tools' });
  await expect(tools).toBeVisible();

  await page.keyboard.press('w');
  await expect(tools.getByRole('button', { name: 'Wall' })).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('3');
  await expect(page.getByTestId('viewer-3d')).toBeVisible();

  expect(errors).toEqual([]);
});
