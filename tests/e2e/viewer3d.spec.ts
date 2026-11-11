import { expect, test } from '@playwright/test';

test('3D view mirrors the plan and syncs selection with 2D', async ({ page }) => {
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
    [-2, -2],
    [2, -2],
    [2, 2],
    [-2, 2],
    [-2, -2],
  ] as const) {
    await click(x, y);
  }
  await page.keyboard.press('v');

  // Select a wall in 2D, then open 3D: the selection is kept.
  await click(2, 0);
  await expect(page.locator('aside')).toContainText('Wall');
  await page.keyboard.press('3');
  const viewer = page.getByTestId('viewer-3d');
  await expect(viewer.locator('canvas')).toBeVisible();
  await expect(page.locator('aside')).toContainText('Wall');

  // In top-down view the centre of the screen is the room's floor: clicking it selects the room.
  await page.getByRole('radio', { name: 'Top-down camera' }).click();
  await page.waitForTimeout(1500);
  const vb = await viewer.boundingBox();
  if (!vb) throw new Error('viewer not visible');
  await page.mouse.click(vb.x + vb.width / 2, vb.y + vb.height / 2);
  await expect(page.getByLabel('Room name')).toBeVisible();

  // Walk mode offers pointer lock.
  await page.getByRole('radio', { name: 'Walk camera' }).click();
  await expect(page.getByText('Click to walk around')).toBeVisible();
});
