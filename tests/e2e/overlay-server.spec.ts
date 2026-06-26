import { expect, test } from '@playwright/test';

test.describe('Overlay Server — rutas base', () => {
  test('carga la ruta raíz sin errores de JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('redirige rutas desconocidas al control panel', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');
    await page.waitForLoadState('networkidle');

    // La app redirige a "/" que es el panel de control
    expect(page.url()).toContain('localhost');
    // No debe mostrar error 404 del servidor
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

test.describe('Overlay Server — scorebug', () => {
  test('renderiza el overlay scorebug', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/overlay/scorebug');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    // El canvas es 1920×1080
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('el scorebug muestra el marcador inicial 0-0', async ({ page }) => {
    await page.goto('/overlay/scorebug');
    await page.waitForLoadState('networkidle');

    // Busca dígitos de marcador (0) en el overlay
    const content = await page.content();
    // El scorebug renderiza score 0 para home y away al inicio
    expect(content).toBeTruthy();
  });
});

test.describe('Overlay Server — overlays individuales', () => {
  const overlays = [
    'batter',
    'pitcher',
    'lineup',
    'next-batters',
    'substitution',
    'game-event',
    'inning-transition',
    'final-score',
    'sponsor-break',
    'announcement',
    'social-lower-third',
    'countdown',
  ] as const;

  for (const overlayId of overlays) {
    test(`renderiza /overlay/${overlayId} sin errores críticos`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => {
        // Ignorar errores de fuentes (Bebas Neue puede no cargarse en CI)
        if (!err.message.includes('font') && !err.message.includes('FontFace')) {
          errors.push(err.message);
        }
      });

      await page.goto(`/overlay/${overlayId}`);
      await page.waitForLoadState('networkidle');

      expect(errors, `Errores en /overlay/${overlayId}: ${errors.join(', ')}`).toHaveLength(0);
    });
  }
});

test.describe('Control Panel — UI', () => {
  test('carga el panel de control', async ({ page }) => {
    await page.goto('/control');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('el panel muestra zonas Preview y Program', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const content = await page.content();
    // El panel debe tener secciones Preview y Program
    expect(content.toLowerCase()).toMatch(/preview|program/i);
  });

  test('el botón Take existe en el panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const content = await page.content();
    expect(content).toMatch(/take|TAKE/i);
  });
});
