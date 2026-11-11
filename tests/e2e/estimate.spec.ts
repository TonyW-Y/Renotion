import { expect, test } from '@playwright/test';

test('changing a floor updates the estimate with correct quantities', async ({ page }) => {
  await page.goto('/editor');
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const click = async (x: number, y: number) => {
    await page.mouse.move(cx + x * 80, cy - y * 80, { steps: 2 });
    await page.mouse.click(cx + x * 80, cy - y * 80);
  };

  // A 4 m × 3 m room.
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

  /*
   * 12 m² × 1.10 × 10.7639 = 142.08 → 143 sq ft × $9.50 = $1,358.50
   * Baseboard 14 m × 1.1 = 15.4 m → 51 lin ft × $2.60 = $132.60
   * Total $1,491.10
   */
  const total = page.getByTestId('estimate-summary-total');
  await expect(total).toHaveText('$1,491.10');

  // Laminate: 12 × 1.1 / 2.2 = 6 boxes × $72 = $432 → $564.60
  await page.getByRole('radio', { name: 'Natural laminate' }).click();
  await expect(total).toHaveText('$564.60');

  // Override the laminate price on the estimate page: 6 × $60 = $360 → $492.60
  await page.getByRole('radio', { name: 'Estimate' }).click();
  await expect(page.getByTestId('estimate-total')).toHaveText('$564.60');
  await expect(page.getByText('6 boxes').last()).toBeVisible();
  const price = page.getByLabel('Natural laminate unit price');
  await price.click();
  await price.fill('60');
  await price.press('Enter');
  await expect(page.getByTestId('estimate-total')).toHaveText('$492.60');
});
