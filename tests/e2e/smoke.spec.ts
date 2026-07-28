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
});
