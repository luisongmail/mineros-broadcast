/**
 * Tests e2e — Panel de control (studio UI)
 * Cubre el flujo mínimo de operación:
 *   1. Carga de la aplicación (ruta /)
 *   2. Navegación a /control (panel de overlays)
 *   3. Panel de datos de juego visible
 *   4. Navegación a /live-game-scoring
 *   5. API de salud del studio
 */

import { expect, test } from '@playwright/test';

// ── Helpers ────────────────────────────────────────────────────────────────
const API = 'http://localhost:5173';

// ── 1. Carga inicial ───────────────────────────────────────────────────────
test('la app carga y muestra la UI principal', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Mineros|Broadcast|Control/i);
  // Al menos un elemento visible en la raíz
  const body = page.locator('body');
  await expect(body).not.toBeEmpty();
});

// ── 2. Ruta /control ────────────────────────────────────────────────────────
test('/control muestra el panel de overlays', async ({ page }) => {
  await page.goto('/control');
  // El panel tiene algún botón de overlay o sección reconocible
  await expect(page.locator('body')).toContainText(/overlay|scorebug|control/i);
});

// ── 3. Navegación entre vistas ──────────────────────────────────────────────
test('navegar a /live-game-scoring muestra el panel de anotación', async ({ page }) => {
  await page.goto('/live-game-scoring');
  // La página tiene bateador / pitcher / conteo o mensaje de "sin partido activo"
  const body = page.locator('body');
  await expect(body).toContainText(/bateador|batter|scorer|partido|game/i);
});

// ── 4. API REST: estado activo ───────────────────────────────────────────────
test('GET /api/state devuelve estado del juego', async ({ request }) => {
  const res = await request.get(`${API}/api/state`);
  expect(res.ok()).toBe(true);
  const body = await res.json() as Record<string, unknown>;
  // El estado siempre tiene gameId (aunque sea vacío)
  expect(body).toHaveProperty('gameId');
});

// ── 5. API v1: juego activo ─────────────────────────────────────────────────
test('GET /api/v1/games/:id/live con juego no activo devuelve 404 limpio', async ({ request }) => {
  const res = await request.get(`${API}/api/v1/games/game-inexistente/live`);
  expect(res.status()).toBe(404);
  const body = await res.json() as Record<string, unknown>;
  expect(body).toHaveProperty('error');
});

// ── 6. Lifecycle API ────────────────────────────────────────────────────────
test('GET /api/v1/lifecycle devuelve lista de overlays registrados', async ({ request }) => {
  const res = await request.get(`${API}/api/v1/lifecycle`);
  expect(res.ok()).toBe(true);
  const body = await res.json() as { data: { overlays: unknown[] } };
  expect(Array.isArray(body.data.overlays)).toBe(true);
  expect(body.data.overlays.length).toBeGreaterThan(0);
});

// ── 7. Box score: overlay no activo ─────────────────────────────────────────
test('GET /api/v1/games/:id/box-score con juego sin datos responde 200 con estructura', async ({ request }) => {
  // Este test usa el juego activo en memoria — si no hay BD, puede devolver estructura vacía
  const stateRes = await request.get(`${API}/api/state`);
  const state = await stateRes.json() as { gameId?: string };
  const gameId = state.gameId ?? 'game-test';

  const res = await request.get(`${API}/api/v1/games/${gameId}/box-score`);
  // Puede ser 200 (con datos vacíos) o 503 si no hay BD disponible — ambos son válidos
  expect([200, 503]).toContain(res.status());

  if (res.status() === 200) {
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('data');
    const data = body['data'] as Record<string, unknown>;
    expect(data).toHaveProperty('linescore');
    expect(data).toHaveProperty('batting');
    expect(data).toHaveProperty('pitching');
  }
});
