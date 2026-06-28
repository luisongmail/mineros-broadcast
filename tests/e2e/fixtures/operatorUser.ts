import { expect } from '@playwright/test';

import {
  overlayServerTest,
  primaryOperator,
  secondaryOperator,
  type MockOperator,
} from './overlayServerMock';

type OperatorFixtures = {
  operatorUser: MockOperator;
  secondaryOperatorUser: MockOperator;
  studioReady: void;
};

export const test = overlayServerTest.extend<OperatorFixtures>({
  operatorUser: async ({}, use) => {
    await use(primaryOperator);
  },

  secondaryOperatorUser: async ({}, use) => {
    await use(secondaryOperator);
  },

  studioReady: [async ({ page }, use) => {
    await page.goto('/auth/otp');
    await expect(page).toHaveURL(/\/auth\/otp$/);
    await use();
  }, { auto: true }],
});

export async function authenticateOperator(page: import('@playwright/test').Page, operator: MockOperator) {
  await page.context().addCookies([
    {
      name: 'pf_refresh',
      value: operator.refreshToken,
      url: 'http://localhost:5173',
      httpOnly: false,
      sameSite: 'Lax',
    },
  ]);
}

export { expect };
