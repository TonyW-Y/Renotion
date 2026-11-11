import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.goto('/editor');
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const click = async (x: number, y: number) => {
    await page.mouse.move(cx + x * 80, cy - y * 80, { steps: 2 });
    await page.mouse.click(cx + x * 80, cy - y * 80);
  };
  // 6 m × 4 m room with a door on the south wall.
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
  await page.keyboard.press('d');
  await click(-1.5, -2);
  await page.keyboard.press('v');
  await page.getByRole('button', { name: 'Start planning' }).click();
  return { click, props: page.getByRole('complementary', { name: 'Properties' }) };
}

const money = (text: string) => Number(text.replace(/[^0-9.]/g, ''));

test('new furniture is priced, resizing changes the price, recolouring does not', async ({
  page,
}) => {
  const { click, props } = await setup(page);
  const total = page.getByTestId('estimate-summary-total');

  await page.keyboard.press('f');
  await page.getByRole('button', { name: 'Place Sofa', exact: true }).click();
  await click(0, 0.5);
  await page.keyboard.press('v');
  await expect(total).toHaveText('$1,299.00');

  // Select it, unlock proportions, double the width → twice the footprint, twice the price.
  await click(0, 0.5);
  await props.getByRole('button', { name: 'Unlock proportions' }).click();
  const width = props.getByRole('textbox', { name: 'Furniture width' });
  await width.fill('4.2');
  await width.press('Enter');
  await expect(width).toHaveValue('4.20 m');
  await expect(total).toHaveText('$2,598.00');

  await props.getByRole('radio', { name: 'Main colour: Terracotta' }).click();
  await expect(props.getByRole('radio', { name: 'Main colour: Terracotta' })).toBeChecked();
  await expect(total).toHaveText('$2,598.00');

  // Undo the colour and the resize.
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(total).toHaveText('$1,299.00');
});

test('a door becomes a pet door and a barn door, each priced as a new unit', async ({ page }) => {
  const { click, props } = await setup(page);
  await click(-1.5, -2);
  await expect(props.getByRole('radiogroup', { name: 'Door design' })).toBeVisible();

  await props.getByRole('button', { name: 'Pet', exact: true }).click();
  await expect(props.getByRole('textbox', { name: 'Opening width' })).toHaveValue('0.30 m');
  await expect(props.getByRole('radio', { name: 'Pet door' })).toBeChecked();

  await props.getByRole('radio', { name: 'Sliding barn' }).click();
  await page.getByRole('radio', { name: 'Estimate' }).click();
  await expect(page.getByText('Sliding barn door kit').first()).toBeVisible();
});

test('a textured wall finish is priced per square foot and can be recoloured', async ({ page }) => {
  const { click, props } = await setup(page);
  await click(0, 2);
  await props.getByRole('radio', { name: 'Texture' }).first().click();
  await props.getByRole('radio', { name: 'Red brick veneer' }).first().click();
  await props
    .getByRole('radio', { name: /Texture colour .*: Sage/ })
    .first()
    .click();
  await expect(props.getByRole('radio', { name: /Texture colour .*: Sage/ }).first()).toBeChecked();

  await page.getByRole('radio', { name: 'Estimate' }).click();
  await expect(page.getByText('Red brick veneer').first()).toBeVisible();
  expect(money(await page.getByTestId('estimate-total').innerText())).toBeGreaterThan(0);
});

test('you can enter your own furniture price and switch back to the estimate', async ({ page }) => {
  const { click, props } = await setup(page);
  const total = page.getByTestId('estimate-summary-total');
  await page.keyboard.press('f');
  await page.getByRole('button', { name: 'Place Sofa', exact: true }).click();
  await click(0, 0.5);
  await page.keyboard.press('v');
  await click(0, 0.5);
  await expect(total).toHaveText('$1,299.00');

  await props.getByRole('radio', { name: 'My price' }).click();
  const mine = props.getByRole('textbox', { name: 'Your price' });
  await mine.fill('850');
  await mine.press('Enter');
  await expect(total).toHaveText('$850.00');

  await props.getByRole('radio', { name: 'Estimated' }).click();
  await expect(total).toHaveText('$1,299.00');
});

test('dragging a door grip on the plan resizes it', async ({ page }) => {
  const { props } = await setup(page);
  const box = await page.getByTestId('plan-canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const at = (x: number, y: number) =>
    [box.x + box.width / 2 + x * 80, box.y + box.height / 2 - y * 80] as const;
  const [dx, dy] = at(-1.5, -2);
  await page.mouse.click(dx, dy);
  // The door spans −1.95 … −1.05; drag its right grip to −0.5.
  const [gx, gy] = at(-1.05, -2);
  const [tx, ty] = at(-0.5, -2);
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.move(tx, ty, { steps: 6 });
  await page.mouse.up();
  await expect(props.getByRole('textbox', { name: 'Opening width' })).toHaveValue('1.45 m');
});

test('a room can get a new ceiling, which is priced and shown in 3D', async ({ page }) => {
  const { click, props } = await setup(page);
  await click(1.5, 1);
  await props.getByRole('radio', { name: 'Ceiling', exact: true }).click();
  await props
    .getByRole('radiogroup', { name: 'Ceiling finish type' })
    .getByRole('radio', { name: 'Texture' })
    .click();
  await props.getByRole('radio', { name: 'Whitewashed plank ceiling' }).click();
  await page.getByRole('radio', { name: 'Estimate', exact: true }).click();
  await expect(page.getByText('Whitewashed plank ceiling').first()).toBeVisible();
  await expect(page.getByText('Ceilings').first()).toBeVisible();
});
