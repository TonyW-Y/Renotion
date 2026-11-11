import { expect, test, type Page } from '@playwright/test';

/** Clicks plan coordinates (metres) on a fresh canvas at 100% zoom (80 px/m, origin centred). */
async function planClicker(page: Page) {
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return async (x: number, y: number) => {
    await page.mouse.move(cx + x * 80, cy - y * 80, { steps: 2 });
    await page.mouse.click(cx + x * 80, cy - y * 80);
  };
}

const overview = (page: Page, label: string) =>
  page.locator('aside').getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');

test('draw a two-room apartment, undo/redo, and keep it after reload', async ({ page }) => {
  await page.goto('/editor');
  await expect(page.getByTestId('plan-canvas')).toBeVisible();
  const click = await planClicker(page);

  // 6 m × 4 m outline, closed back on its first corner.
  await page.keyboard.press('w');
  for (const [x, y] of [
    [-3, -2],
    [3, -2],
    [3, 2],
    [-3, 2],
    [-3, -2],
  ] as const) {
    await click(x, y);
  }
  await expect(overview(page, 'Rooms')).toHaveText('1');
  await expect(overview(page, 'Floor area')).toHaveText('24.0 m²');

  // Divider makes two 12 m² rooms.
  await click(0, -2);
  await click(0, 2);
  await expect(overview(page, 'Rooms')).toHaveText('2');

  // A door in the divider and a window in the top wall.
  await page.keyboard.press('d');
  await click(0, 0);
  await page.keyboard.press('n');
  await click(-1.5, 2);
  await expect(overview(page, 'Doors · windows')).toHaveText('1 · 1');

  // Undo / redo.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(overview(page, 'Doors · windows')).toHaveText('1 · 0');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(overview(page, 'Doors · windows')).toHaveText('1 · 1');

  // Select a room and rename it.
  await page.keyboard.press('v');
  await click(-1.5, 0);
  const name = page.getByLabel('Room name');
  await name.fill('Living room');
  await name.press('Enter');
  await expect(page.locator('aside')).toContainText('Living room');

  // Wait for the debounced save, then reload.
  await expect(page.getByTestId('save-status')).toHaveText('Saved locally');
  await page.reload();
  await expect(overview(page, 'Walls')).toHaveText('5');
  await expect(overview(page, 'Rooms')).toHaveText('2');
  await expect(overview(page, 'Doors · windows')).toHaveText('1 · 1');
});

test('units toggle switches displayed measurements', async ({ page }) => {
  await page.goto('/editor');
  const click = await planClicker(page);
  await page.keyboard.press('w');
  for (const [x, y] of [
    [0, 0],
    [3, 0],
    [3, 3],
    [0, 3],
    [0, 0],
  ] as const) {
    await click(x, y);
  }
  await expect(overview(page, 'Floor area')).toHaveText('9.0 m²');
  await page.getByRole('radio', { name: 'Imperial units' }).click();
  // 9 m² × 10.7639 = 96.9 ft²
  await expect(overview(page, 'Floor area')).toHaveText('96.9 ft²');
});
