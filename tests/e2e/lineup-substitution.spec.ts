import { expect, test } from './fixtures/operatorUser';

async function loginAndOpenLiveScoring(
  page: import('@playwright/test').Page,
  operator: import('./fixtures/overlayServerMock').MockOperator,
) {
  await page.goto('/auth/otp');
  await page.getByPlaceholder('correo@ejemplo.cl').fill(operator.email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await expect(page).toHaveURL(/\/auth\/verify$/);
  await page.getByPlaceholder('000000').fill(operator.otp);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/select-scope$/);
  await page.getByRole('button', { name: 'Juego de prueba' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/live-game-scoring');
  await expect(page).toHaveURL(/\/live-game-scoring$/);
  await expect(page.getByRole('button', { name: 'Sustitución' })).toBeVisible();
}

test.describe('Phase 5 — lineup workflows', () => {
  test('asigna una jugadora de banca al lineup activo y refresca el bateador actual', async ({ page, operatorUser, overlayServer }) => {
    await overlayServer.setLineupScenario({ emptyBench: false, failNextSubstitution: false, failTeamPlayers: false });
    await loginAndOpenLiveScoring(page, operatorUser);

    await page.getByRole('button', { name: 'Sustitución' }).click();
    const dialog = page.getByRole('dialog', { name: 'Registrar sustitución' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Bateador emergente' }).click();
    await dialog.getByLabel('Jugador que sale').selectOption('player-away-01');
    await dialog.getByLabel('Jugador que entra').selectOption('player-away-12');
    await dialog.getByLabel('Orden al bate').fill('1');
    await dialog.getByLabel('Notas').fill('E2E pinch hitter');

    const requestPromise = page.waitForRequest((request) =>
      request.url().includes('/api/scorer/substitutions/game-001')
      && request.method() === 'POST',
    );

    await dialog.getByTestId('substitution-submit').click();

    const request = await requestPromise;
    expect(request.postDataJSON()).toMatchObject({
      gameId: 'game-001',
      substitutionType: 'pinch_hitter',
      outgoingPlayerId: 'player-away-01',
      incomingPlayerId: 'player-away-12',
      battingOrder: 1,
      notes: 'E2E pinch hitter',
    });

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Sustitución registrada')).toBeVisible();

    const batterSelect = page.locator('select').first();
    await expect(batterSelect).toHaveValue('player-away-12');
    await expect(batterSelect.locator('option[value=\"player-away-12\"]')).toContainText('#12 Merly Rodríguez');

    const historyResponse = await page.request.get('http://localhost:3101/api/games/game-001/lineup/changes');
    expect(historyResponse.ok()).toBeTruthy();
    const historyBody = await historyResponse.json();
    expect(historyBody.payload.changes).toHaveLength(1);
    expect(historyBody.payload.changes[0]).toMatchObject({
      substitutionType: 'pinch_hitter',
      incoming: { playerId: 'player-away-12' },
      outgoing: { playerId: 'player-away-01' },
      battingOrder: 1,
    });
  });

  test('muestra estado vacío cuando no hay roster disponible fuera de la alineación activa', async ({ page, operatorUser, overlayServer }) => {
    await overlayServer.setLineupScenario({ emptyBench: true, failNextSubstitution: false, failTeamPlayers: false });
    await loginAndOpenLiveScoring(page, operatorUser);

    await page.getByRole('button', { name: 'Sustitución' }).click();
    const dialog = page.getByRole('dialog', { name: 'Registrar sustitución' });
    await dialog.getByRole('button', { name: 'Bateador emergente' }).click();

    await expect(dialog.getByText('No hay jugadores disponibles fuera de la alineación activa.')).toBeVisible();
    await expect(dialog.getByLabel('Jugador que entra')).toBeDisabled();
  });
});

test.describe('Phase 5 — substitution modal QA', () => {
  test('preserva datos ingresados y muestra error cuando falla la red', async ({ page, operatorUser, overlayServer }) => {
    await overlayServer.setLineupScenario({ emptyBench: false, failNextSubstitution: false, failTeamPlayers: false });
    await loginAndOpenLiveScoring(page, operatorUser);
    await page.setViewportSize({ width: 1024, height: 768 });

    await page.getByRole('button', { name: 'Sustitución' }).click();
    const dialog = page.getByRole('dialog', { name: 'Registrar sustitución' });
    await expect(dialog).toBeVisible();

    await expect(dialog.getByLabel('Jugador que sale')).toBeVisible();
    await expect(dialog.getByLabel('Jugador que entra')).toBeVisible();
    await expect(dialog.getByLabel('Orden al bate')).toBeVisible();
    await expect(dialog.getByLabel('Notas')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cambio defensivo' }).click();
    await dialog.getByLabel('Jugador que sale').selectOption('player-home-01');
    await dialog.getByLabel('Jugador que entra').selectOption('player-home-12');
    await dialog.getByLabel('Posición defensiva').selectOption('RF');
    await dialog.getByLabel('Orden al bate').fill('5');
    await dialog.getByLabel('Notas').fill('Mantener estos datos');

    await overlayServer.setLineupScenario({ failNextSubstitution: true });
    await dialog.getByTestId('substitution-submit').click();

    await expect(page.getByText('No se pudo registrar la sustitución')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Orden al bate')).toHaveValue('5');
    await expect(dialog.getByLabel('Notas')).toHaveValue('Mantener estos datos');
  });

  test('registra cambio defensivo y lo persiste en el historial de lineup', async ({ page, operatorUser, overlayServer }) => {
    await overlayServer.setLineupScenario({ emptyBench: false, failNextSubstitution: false, failTeamPlayers: false });
    await loginAndOpenLiveScoring(page, operatorUser);

    await page.getByRole('button', { name: 'Sustitución' }).click();
    const dialog = page.getByRole('dialog', { name: 'Registrar sustitución' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cambio defensivo' }).click();
    await dialog.getByLabel('Jugador que sale').selectOption('player-home-01');
    await dialog.getByLabel('Jugador que entra').selectOption('player-home-12');
    await dialog.getByLabel('Posición defensiva').selectOption('RF');
    await dialog.getByLabel('Orden al bate').fill('1');
    await dialog.getByLabel('Notas').fill('Cambio defensivo probado por Playwright');
    await dialog.getByTestId('substitution-submit').click();

    await expect(dialog).not.toBeVisible();

    const lineupResponse = await page.request.get('http://localhost:3101/api/games/game-001/lineup');
    const lineupBody = await lineupResponse.json();
    expect(lineupBody.payload.lineup.home[0]).toMatchObject({
      playerId: 'player-home-12',
      order: 1,
      position: 'RF',
    });

    const historyResponse = await page.request.get('http://localhost:3101/api/games/game-001/lineup/changes');
    const historyBody = await historyResponse.json();
    expect(historyBody.payload.changes.at(-1)).toMatchObject({
      substitutionType: 'defensive_change',
      incoming: { playerId: 'player-home-12' },
      outgoing: { playerId: 'player-home-01' },
      position: 'RF',
      notes: 'Cambio defensivo probado por Playwright',
    });
  });
});
