import { expect, test, type Page } from '@playwright/test';

/** A 4 m × 3 m room whose floor is changed to oak in the renovation plan. */
async function renovateFloor(page: Page) {
  await page.goto('/editor');
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const click = async (x: number, y: number) => {
    await page.mouse.move(cx + x * 80, cy - y * 80, { steps: 2 });
    await page.mouse.click(cx + x * 80, cy - y * 80);
  };
  await page.keyboard.press('w');
  for (const [x, y] of [
    [-2, -1.5],
    [2, -1.5],
    [2, 1.5],
    [-2, 1.5],
    [-2, -1.5],
  ] as const) {
    await click(x, y);
  }
  await page.keyboard.press('v');
  await page.getByRole('button', { name: 'Start planning' }).click();
  await click(0, 0);
  await page.getByRole('radio', { name: 'Oak hardwood' }).click();
  // Oak floor + baseboard (see estimate.spec.ts for the hand calculation).
  await expect(page.getByTestId('estimate-summary-total')).toHaveText('$1,491.10');
}

test('the schedule lists ordered tasks, tracks progress and follows the start date', async ({
  page,
}) => {
  await renovateFloor(page);
  await page.getByRole('radio', { name: 'Schedule', exact: true }).click();
  const view = page.getByTestId('schedule-view');

  // Remove old flooring → prep → install → baseboard.
  await expect(view.getByText('0 / 4', { exact: true })).toBeVisible();
  const titles = view.getByText(
    /^(Remove old flooring|Prep & level subfloor|Install new flooring|Install baseboard)$/,
  );
  await expect(titles.first()).toHaveText('Remove old flooring');

  // Monday start, weekends skipped.
  await view.getByLabel('Project start date').fill('2026-01-05');
  await expect(view.getByText('Jan 5', { exact: true })).toBeVisible();

  // Cycle a task: to do → in progress → done.
  const status = (state: string) =>
    view.getByRole('button', { name: `Remove old flooring: ${state}` });
  await status('To do').click();
  await status('In progress').click();
  await expect(status('Done')).toBeVisible();
  await expect(view.getByText('1 / 4', { exact: true })).toBeVisible();
});

test('the budget compares logged expenses with the estimate', async ({ page }) => {
  await renovateFloor(page);
  await page.getByRole('radio', { name: 'Budget', exact: true }).click();
  const view = page.getByTestId('budget-view');
  await expect(view.getByText('No expenses yet')).toBeVisible();

  // An empty description is refused.
  await view.getByLabel('Amount').fill('1600');
  await view.getByRole('button', { name: 'Add' }).click();
  await expect(view.getByText('Add a short description.')).toBeVisible();

  await view.getByLabel('Description').fill('Oak boards');
  await view.getByRole('combobox', { name: 'Category', exact: true }).selectOption('flooring');
  await view.getByRole('button', { name: 'Add' }).click();

  await expect(view.getByRole('cell', { name: 'Oak boards', exact: true })).toBeVisible();
  await expect(view.getByText('$1,600.00').first()).toBeVisible();
  // $1,600 spent − $1,491.10 estimated.
  await expect(view.getByText('Over budget')).toBeVisible();
  await expect(view.getByText('$108.90')).toBeVisible();
});
