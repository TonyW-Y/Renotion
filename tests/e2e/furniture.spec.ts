import { expect, test, type Page } from '@playwright/test';

const overview = (page: Page, label: string) =>
  page
    .getByRole('complementary', { name: 'Properties' })
    .getByText(label, { exact: true })
    .locator('xpath=following-sibling::*[1]');

test('furnish a room: place, block wall collisions, rotate, duplicate', async ({ page }) => {
  await page.goto('/editor');
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const click = async (x: number, y: number) => {
    await page.mouse.move(cx + x * 80, cy - y * 80, { steps: 2 });
    await page.mouse.click(cx + x * 80, cy - y * 80);
  };

  // 5 m × 4 m room.
  await page.keyboard.press('w');
  for (const [x, y] of [
    [-2.5, -2],
    [2.5, -2],
    [2.5, 2],
    [-2.5, 2],
    [-2.5, -2],
  ] as const) {
    await click(x, y);
  }

  // Furniture tool + catalogue.
  await page.keyboard.press('f');
  await expect(page.getByRole('complementary', { name: 'Furniture catalogue' })).toBeVisible();
  await page.getByRole('button', { name: 'Place Sofa' }).click();

  // Straddling the south wall → blocked.
  await click(0, -2);
  await expect(overview(page, 'Furniture')).toHaveText('0');

  // Inside the room → placed.
  await click(0, 0);
  await expect(overview(page, 'Furniture')).toHaveText('1');

  // Select it, rotate with R, duplicate with Cmd/Ctrl+D.
  await page.keyboard.press('Escape');
  await page.keyboard.press('v');
  await click(0, 0);
  await expect(page.getByRole('complementary', { name: 'Properties' })).toContainText('Sofa');
  await page.keyboard.press('r');
  await expect(page.getByLabel('Rotation in degrees')).toHaveValue('90°');
  await page.keyboard.press('ControlOrMeta+d');
  await expect(overview(page, 'Furniture')).toHaveText('2');

  // Undo the duplicate.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(overview(page, 'Furniture')).toHaveText('1');
});
