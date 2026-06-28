import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'PLAYFLOW_E2E_MOCK_SERVER=1 PLAYFLOW_E2E_MOCK_PORT=3101 pnpm --filter @playflow/studio exec node --import tsx ../../tests/e2e/fixtures/overlayServerMock.ts',
      url: 'http://localhost:3101/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'PLAYFLOW_WEB_PORT=4173 PLAYFLOW_API_PORT=3101 VITE_API_URL=http://localhost:3101/api VITE_WS_URL=ws://localhost:3101/ws pnpm --filter @playflow/studio dev',
      url: 'http://localhost:4173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
