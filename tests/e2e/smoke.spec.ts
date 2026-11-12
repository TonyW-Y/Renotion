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

test('try the demo opens a finished, editable renovation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('link', { name: 'Try the demo' }).click();
  // The ?demo flag is dropped so a refresh keeps the visitor's edits.
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByLabel('Project name')).toHaveValue('Demo: open-plan refresh');

  const total = page.getByTestId('estimate-summary-total');
  await expect(total).not.toHaveText('$0.00');

  await page.getByRole('radio', { name: 'Schedule', exact: true }).click();
  await expect(
    page.getByTestId('schedule-view').getByText('Kitchen & living').first(),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Project name')).toHaveValue('Demo: open-plan refresh');
  expect(errors).toEqual([]);
});
