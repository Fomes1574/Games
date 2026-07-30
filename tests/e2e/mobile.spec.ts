import { expect, test, type Page } from '@playwright/test';

const startExpedition = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Preparar expedição' }).click();
  await page.getByRole('button', { name: 'Assinar contrato e partir' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__GAME_TEST_API__?.getState().scene ?? 'loading'),
    )
    .toBe('expedition');
};

const expectNoHorizontalOverflow = async (page: Page): Promise<void> => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
};

test('mantém menus utilizáveis em celular sem rolagem horizontal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('');
  await expect(page.getByRole('heading', { name: /A Última Companhia/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Preparar expedição' }).click();
  await expect(
    page.getByRole('button', { name: 'Assinar contrato e partir' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('move pelo analógico virtual e pausa por toque', async ({ page }) => {
  await page.goto('');
  await startExpedition(page);

  const controls = page.locator('#touch-controls');
  const joystick = page.locator('#touch-joystick');
  await expect(controls).toBeVisible();
  await expect(controls).toHaveAttribute('data-suspended', 'false');

  const bounds = await joystick.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) {
    return;
  }
  const pointerId = 41;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const before = await page.evaluate(() => window.__GAME_TEST_API__?.getState());

  await joystick.dispatchEvent('pointerdown', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: centerX,
    clientY: centerY,
    buttons: 1,
  });
  await joystick.dispatchEvent('pointermove', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: bounds.x + bounds.width,
    clientY: centerY,
    buttons: 1,
  });
  await page.waitForTimeout(650);
  await joystick.dispatchEvent('pointerup', {
    pointerId,
    pointerType: 'touch',
    isPrimary: true,
    clientX: bounds.x + bounds.width,
    clientY: centerY,
  });
  const after = await page.evaluate(() => window.__GAME_TEST_API__?.getState());

  if (before?.scene === 'expedition' && after?.scene === 'expedition') {
    expect(after.playerPosition.x).toBeGreaterThan(before.playerPosition.x);
    expect(after.inputMode).toBe('touch');
  }

  await page.getByRole('button', { name: 'Pausa' }).click();
  await expect(page.getByRole('heading', { name: 'Pausa' })).toBeVisible();
  await expect(controls).toHaveAttribute('data-suspended', 'true');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Pausa' })).toBeHidden();
  await expect(controls).toHaveAttribute('data-suspended', 'false');
});

test('acomoda HUD, escolhas e analógico em retrato e paisagem', async ({ page }) => {
  await page.goto('');
  await startExpedition(page);
  await expectNoHorizontalOverflow(page);

  await page.evaluate(() => window.__GAME_TEST_API__?.grantExperience(40));
  await expect(page.getByRole('heading', { name: 'Escolha uma melhoria' })).toBeVisible();
  await expect(page.locator('#touch-controls')).toHaveAttribute(
    'data-suspended',
    'true',
  );
  await expectNoHorizontalOverflow(page);

  await page.locator('.upgrade-card').first().click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#touch-joystick')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const [joystick, hudBottom] = await Promise.all([
    page.locator('#touch-joystick').boundingBox(),
    page.locator('.hud-bottom').boundingBox(),
  ]);
  expect(joystick).not.toBeNull();
  expect(hudBottom).not.toBeNull();
  if (joystick && hudBottom) {
    expect(joystick.x + joystick.width).toBeLessThanOrEqual(hudBottom.x + 2);
  }
});
