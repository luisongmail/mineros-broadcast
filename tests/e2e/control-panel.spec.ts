import { expect, test } from './fixtures/operatorUser';

async function abrirControlAutenticado(
  page: import('@playwright/test').Page,
  operator: import('./fixtures/overlayServerMock').MockOperator,
) {
  await page.goto('/auth/otp');
  await page.getByPlaceholder('correo@ejemplo.cl').fill(operator.email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await expect(page).toHaveURL(/\/auth\/verify$/);
  await page.getByPlaceholder('000000').fill(operator.otp);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/control$/);
  await expect(page.getByTestId('preview-canvas')).toBeVisible();
  await expect(page.getByTestId('program-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: /Scorebug/i })).toBeEnabled();
}

test.describe('Control Panel — flujos E2E básicos', () => {
  test('OTP Login → Control Panel Visible', async ({ page, operatorUser }) => {
    await page.goto('/auth/otp');

    await test.step('Solicitar OTP mock', async () => {
      await page.getByPlaceholder('correo@ejemplo.cl').fill(operatorUser.email);
      await page.getByRole('button', { name: 'Enviar código' }).click();
      await expect(page).toHaveURL(/\/auth\/verify$/);
    });

    await test.step('Ingresar código OTP y validar redirect', async () => {
      await page.getByPlaceholder('000000').fill(operatorUser.otp);
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await expect(page).toHaveURL(/\/control$/);
    });

    await test.step('Verificar canvases Preview y Program', async () => {
      await expect(page.getByTestId('preview-canvas')).toContainText('Preview');
      await expect(page.getByTestId('program-canvas')).toContainText('Program');
    });
  });

  test('Preview Overlay → Take Overlay', async ({ page, operatorUser }) => {
    await abrirControlAutenticado(page, operatorUser);

    const latencyBar = page.getByTestId('ws-latency-bar');
    const latencyInicial = await latencyBar.getAttribute('aria-valuenow');

    await test.step('Preparar Scorebug en Preview', async () => {
      await page.getByRole('button', { name: /Scorebug/i }).click();
      await expect(page.getByTestId('preview-canvas')).toContainText('Scorebug');
    });

    await test.step('Enviar overlay a Program', async () => {
      await page.getByRole('button', { name: 'Take' }).click();
      await expect(page.getByTestId('program-canvas')).toContainText('Scorebug');
    });

    await test.step('Verificar actualización de latencia WS', async () => {
      await expect.poll(async () => latencyBar.getAttribute('aria-valuenow')).not.toBe(latencyInicial);
    });
  });

  test('Hide All (sin romper Scorebug)', async ({ page, operatorUser }) => {
    await abrirControlAutenticado(page, operatorUser);

    await test.step('Confirmar Scorebug en Program', async () => {
      await page.getByRole('button', { name: /Scorebug/i }).click();
      await page.getByRole('button', { name: 'Take' }).click();
      await expect(page.getByTestId('program-canvas')).toContainText('Scorebug');
    });

    await test.step('Ejecutar Hide All y preservar Scorebug', async () => {
      await page.getByRole('button', { name: 'Hide All' }).click();
      await expect(page.getByTestId('program-active-overlays')).toContainText('Scorebug');
      await expect(page.getByTestId('program-active-overlays')).not.toContainText('Game Event');
      await expect(page.getByTestId('program-active-overlays').locator('span')).toHaveCount(1);
    });
  });

  test('Conflicto Zona → Error + Snapshot Actualizada', async ({ browser, page, operatorUser, secondaryOperatorUser }) => {
    await abrirControlAutenticado(page, operatorUser);

    await test.step('Operador 1 confirma Scorebug en Program', async () => {
      await page.getByRole('button', { name: /Scorebug/i }).click();
      await page.getByRole('button', { name: 'Take' }).click();
      await expect(page.getByTestId('program-canvas')).toContainText('Scorebug');
    });

    const operator2Context = await browser.newContext({ baseURL: 'http://localhost:4173' });
    const operator2Page = await operator2Context.newPage();

    try {
      await abrirControlAutenticado(operator2Page, secondaryOperatorUser);

      await test.step('Operador 2 intenta Take conflictivo en la misma zona', async () => {
        await operator2Page.getByRole('button', { name: /Game Event/i }).click();
        await expect(operator2Page.getByTestId('preview-canvas')).toContainText('Game Event');

        await operator2Page.getByRole('button', { name: 'Take' }).click();
        await expect(operator2Page.getByTestId('control-error-banner')).toContainText('409');
        await expect(operator2Page.getByTestId('control-error-banner')).toContainText('revisión');
      });

      await test.step('El snapshot visible mantiene Scorebug en Program', async () => {
        await expect(operator2Page.getByTestId('program-canvas')).toContainText('Scorebug');
        await expect(operator2Page.getByTestId('program-active-overlays')).toContainText('Scorebug');
      });
    } finally {
      await operator2Context.close();
    }
  });
});
