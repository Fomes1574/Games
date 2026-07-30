import { expect, test } from '@playwright/test';

test('carrega a tela inicial sem erros críticos', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  await page.goto('');

  await expect(page.getByRole('heading', { name: /A Última Companhia/i })).toBeVisible();
  await expect(page.locator('#game-root canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preparar expedição' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a ação principal responde ao teclado', async ({ page }) => {
  await page.goto('');

  const action = page.getByRole('button', { name: 'Preparar expedição' });
  await action.focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#primary-action')).toHaveAttribute(
    'data-acknowledged',
    'true',
  );
  await expect(
    page.getByRole('heading', { name: 'Antes de cruzar os portões' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Brutamontes', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Charneca dos Sinos', { exact: true })).toBeVisible();
  await expect(page.locator('.preparation-steps')).toHaveCount(0);
});

test('inicia uma partida real e o cenário acompanha o personagem', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Preparar expedição' }).click();

  const departure = page.getByRole('button', {
    name: 'Assinar contrato e partir',
  });
  await expect(departure).toBeEnabled();
  await page.getByLabel('Semente opcional').fill('1574');
  await departure.click();

  await expect(page.locator('#hud')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.__GAME_TEST_API__?.getState().scene ?? 'loading'),
    )
    .toBe('expedition');

  const before = await page.evaluate(() => window.__GAME_TEST_API__?.getState());
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(650);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.__GAME_TEST_API__?.getState());

  expect(before?.scene).toBe('expedition');
  expect(after?.scene).toBe('expedition');
  if (before?.scene === 'expedition' && after?.scene === 'expedition') {
    expect(after.seed).toBe(1574);
    expect(after.playerPosition.x).toBeGreaterThan(before.playerPosition.x);
    expect(after.parallaxOffset.x).not.toBe(before.parallaxOffset.x);
  }
});

test('remapeia o movimento e preserva a escolha no navegador', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Configurações' }).click();

  await page.getByRole('button', { name: 'Configurar tecla para cima' }).click();
  await page.keyboard.press('KeyI');
  await expect(page.locator('#keybinding-up')).toHaveText('I');

  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Preparar expedição' }).click();
  await page.getByLabel('Semente opcional').fill('1574');
  await page.getByRole('button', { name: 'Assinar contrato e partir' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__GAME_TEST_API__?.getState().scene ?? 'loading'),
    )
    .toBe('expedition');

  const before = await page.evaluate(() => window.__GAME_TEST_API__?.getState());
  await page.keyboard.down('KeyI');
  await page.waitForTimeout(650);
  await page.keyboard.up('KeyI');
  await page.waitForTimeout(120);
  const after = await page.evaluate(() => window.__GAME_TEST_API__?.getState());

  if (before?.scene === 'expedition' && after?.scene === 'expedition') {
    expect(after.playerPosition.y).toBeLessThan(before.playerPosition.y);
  }

  await page.reload();
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.locator('#keybinding-up')).toHaveText('I');
});

test('anima a morte antes de mostrar o game over e o relatório', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Preparar expedição' }).click();
  await page.getByRole('button', { name: 'Assinar contrato e partir' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__GAME_TEST_API__?.getState().scene ?? 'loading'),
    )
    .toBe('expedition');

  const alive = await page.evaluate(() => window.__GAME_TEST_API__?.getState());
  await page.evaluate(() => window.__GAME_TEST_API__?.forceDefeat());
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window.__GAME_TEST_API__?.getState();
        return state?.scene === 'expedition' ? state.phase : 'menu';
      }),
    )
    .toBe('dying');

  await page.waitForTimeout(420);
  const dying = await page.evaluate(() => window.__GAME_TEST_API__?.getState());
  if (alive?.scene === 'expedition' && dying?.scene === 'expedition') {
    expect(dying.playerVisual.scaleY).toBeLessThan(alive.playerVisual.scaleY);
    expect(dying.playerVisual.alpha).toBeLessThan(alive.playerVisual.alpha);
  }

  await expect(page.getByRole('heading', { name: 'Game Over' })).toBeVisible({
    timeout: 4_000,
  });
  await expect(page.locator('#result-panel')).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Expedição perdida' }),
  ).toBeVisible();
});
