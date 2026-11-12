import { expect, test, type Page } from '@playwright/test';

/*
 * Accounts and cloud projects, end to end. Needs the app built against a
 * local Supabase (see README → "Cloud"), so it only runs with E2E_CLOUD=1.
 */
test.skip(!process.env.E2E_CLOUD, 'set E2E_CLOUD=1 with a local Supabase running');

async function signUp(page: Page): Promise<string> {
  const email = `e2e-${crypto.randomUUID().slice(0, 8)}@renotion.test`;
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Sign in or create account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Create account' }).click();
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Password').fill('correct-horse-battery');
  await dialog.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
  return email;
}

async function drawRoom(page: Page) {
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.keyboard.press('w');
  for (const [x, y] of [
    [-2, -1.5],
    [2, -1.5],
    [2, 1.5],
    [-2, 1.5],
    [-2, -1.5],
  ] as const) {
    await page.mouse.click(cx + x * 80, cy - y * 80);
  }
  await page.keyboard.press('v');
}

test('a signed-in user’s project saves to the cloud, stays private, and can be shared', async ({
  page,
  browser,
}) => {
  await signUp(page);

  // A new project goes to the account.
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page).toHaveURL(/\/editor$/);
  await page.getByLabel('Project name').fill('Cloud kitchen');
  await page.getByLabel('Project name').blur();
  await drawRoom(page);
  await expect(page.getByTestId('save-status')).toHaveText('Saved to cloud');

  // It survives a reload (loaded back from Postgres).
  await page.reload();
  await expect(page.getByLabel('Project name')).toHaveValue('Cloud kitchen');
  await expect(page.getByTestId('save-status')).toHaveText(/Cloud|Saved to cloud/);

  // It is listed under "In the cloud".
  await page.goto('/projects');
  await expect(page.getByTestId('cloud-projects').getByText('Cloud kitchen')).toBeVisible();

  // Share it.
  await page.getByRole('button', { name: 'Actions for Cloud kitchen' }).click();
  await page.getByRole('menuitem', { name: 'Copy share link' }).click();
  const toast = page.getByText(/\/share\/[0-9a-f-]{36}/);
  await expect(toast).toBeVisible();
  const url = ((await toast.textContent()) ?? '').trim();

  // Someone else, signed out, opens a copy through the link.
  const stranger = await browser.newPage();
  await stranger.goto(url);
  await expect(stranger).toHaveURL(/\/editor$/);
  await expect(stranger.getByLabel('Project name')).toHaveValue('Cloud kitchen');
  await expect(stranger.getByTestId('save-status')).not.toHaveText(/cloud/i);

  // A second account cannot see the first user's project.
  const other = await browser.newPage();
  await signUp(other);
  await expect(other.getByTestId('cloud-projects').getByText('Cloud kitchen')).toHaveCount(0);
});
