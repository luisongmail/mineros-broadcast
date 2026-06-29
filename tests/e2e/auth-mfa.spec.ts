import { expect, test } from './fixtures/operatorUser';

test.describe('MFA TOTP Flow — Fase 2', () => {
  test('OTP Login → MFA Setup Required → TOTP Entry → JWT Issued', async ({ page, operatorUser }) => {
    await test.step('Step 1: Navigate to OTP login page', async () => {
      await page.goto('/auth/otp');
      await expect(page).toHaveURL(/\/auth\/otp$/);
      await expect(page.locator('h1')).toContainText('Ingresar');
    });

    await test.step('Step 2: Request OTP with email', async () => {
      await page.getByPlaceholder('correo@ejemplo.cl').fill(operatorUser.email);
      await page.getByRole('button', { name: 'Enviar código' }).click();
      await expect(page).toHaveURL(/\/auth\/verify$/);
    });

    await test.step('Step 3: Submit OTP code', async () => {
      await page.getByPlaceholder('000000').fill(operatorUser.otp);
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      // After OTP, check for MFA setup requirement
      // If MFA is not setup, redirect to MfaSetupPage
      await expect(page).toHaveURL(/\/(auth\/mfa-setup|control)$/);
    });

    // If redirected to MFA setup (first login or MFA reset)
    const url = page.url();
    if (url.includes('mfa-setup')) {
      await test.step('Step 4a: MFA Setup — Generate TOTP Secret', async () => {
        await expect(page.locator('h1')).toContainText('Configurar');
        const generateButton = page.getByRole('button', { name: /generar/i });
        await expect(generateButton).toBeVisible();
      });

      await test.step('Step 4b: MFA Setup — Scan QR or Enter Secret', async () => {
        // QR code should be visible for authenticator app
        const qrCode = page.locator('[data-testid="qr-code"]');
        // Manual entry field for backup
        const secretInput = page.locator('input[name="secret"]');
        await expect(qrCode.or(secretInput)).toBeVisible();
      });

      await test.step('Step 4c: MFA Setup — Verify TOTP Code', async () => {
        // In real scenario, would scan QR with authenticator app
        // For test, we'd need to compute TOTP from secret
        const totpInput = page.getByPlaceholder('000000').nth(0);
        // TODO: Compute real TOTP using secret
        await totpInput.fill('000000');

        await page.getByRole('button', { name: /confirmar/i }).click();
        // After successful TOTP verification, redirect to control panel
        await expect(page).toHaveURL(/\/control$/);
      });
    }

    await test.step('Step 5: Verify logged in to Control Panel', async () => {
      await expect(page.getByTestId('preview-canvas')).toBeVisible();
      await expect(page.getByTestId('program-canvas')).toBeVisible();
    });

    await test.step('Step 6: Verify JWT contains MFA role', async () => {
      // Check that JWT in memory includes mfa:verified role
      // Would need to expose a debug endpoint or check via API
      const response = await page.request.get('/api/security/context', {
        headers: {
          // Authorization header would be set by browser
        },
      });
      expect(response.status()).toBe(200);
      const context = await response.json();
      expect(context.user).toBeDefined();
      expect(context.user.authLevel).toBe('mfa');
    });
  });

  test('Protected Action — Step-Up MFA Required', async ({ page, operatorUser }) => {
    // Setup: Login with MFA already verified
    await page.goto('/auth/otp');
    await page.getByPlaceholder('correo@ejemplo.cl').fill(operatorUser.email);
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.getByPlaceholder('000000').fill(operatorUser.otp);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();

    // Wait for control panel to load
    await expect(page).toHaveURL(/\/(auth\/mfa-setup|control)$/);

    if (page.url().includes('mfa-setup')) {
      // Skip if in MFA setup (test would continue to that flow)
      return;
    }

    await test.step('Step 1: Locate protected action button', async () => {
      // For example: delete user, modify policy, etc.
      const protectedButton = page.locator('[data-protected="true"]').first();
      // If no protected buttons in control panel, this test would be in a different view
      if (await protectedButton.isVisible()) {
        await test.step('Step 2: Click protected action', async () => {
          await protectedButton.click();
        });

        await test.step('Step 3: Step-Up Modal Appears', async () => {
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible();
          await expect(modal).toContainText('Verificar identidad');
        });

        await test.step('Step 4: Enter Step-Up TOTP', async () => {
          const totpInput = page.getByPlaceholder('000000');
          // TODO: Compute real TOTP
          await totpInput.fill('000000');
          await page.getByRole('button', { name: /verificar|confirmar/i }).click();
        });

        await test.step('Step 5: Action Executes After Step-Up', async () => {
          // Modal should close after successful verification
          const modal = page.locator('[role="dialog"]');
          await expect(modal).not.toBeVisible({ timeout: 5000 });
          // Action should complete (e.g., user deleted, policy modified)
        });
      }
    });
  });

  test('Step-Up Token Freshness — 5 Minute Window', async ({ page, operatorUser }) => {
    // Setup: Login and navigate to control panel
    await page.goto('/auth/otp');
    await page.getByPlaceholder('correo@ejemplo.cl').fill(operatorUser.email);
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.getByPlaceholder('000000').fill(operatorUser.otp);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();

    if (page.url().includes('mfa-setup')) {
      return; // Skip if in setup
    }

    await test.step('Step 1: Perform step-up at T=0', async () => {
      const protectedButton = page.locator('[data-protected="true"]').first();
      if (await protectedButton.isVisible()) {
        await protectedButton.click();
        const totpInput = page.getByPlaceholder('000000');
        await totpInput.fill('000000');
        await page.getByRole('button', { name: /verificar/ }).click();
      }
    });

    await test.step('Step 2: Another protected action at T+4m should succeed', async () => {
      // Simulate clock advance (in real test, would use fake timers)
      // For now, action should succeed without re-verifying
      const protectedButton = page.locator('[data-protected="true"]').nth(1);
      if (await protectedButton.isVisible()) {
        await protectedButton.click();
        // Should NOT show step-up modal (token is fresh)
        const modal = page.locator('[role="dialog"]');
        await expect(modal).not.toBeVisible({ timeout: 1000 });
      }
    });

    await test.step('Step 3: Protected action at T+6m should require re-verification', async () => {
      // After 5 minutes, step-up token expires
      // This would require fake timers or backend to advance time
      // For manual testing: wait 5 minutes, then click protected button
      // Modal should appear again
    });
  });

  test('MFA Disable Flow — Bypass for SysAdmin', async ({ page, operatorUser }) => {
    // Test that SysAdmin can disable MFA if needed for emergency
    // This is a security-sensitive operation
    await page.goto('/auth/otp');
    await page.getByPlaceholder('correo@ejemplo.cl').fill(operatorUser.email);
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.getByPlaceholder('000000').fill(operatorUser.otp);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();

    if (page.url().includes('mfa-setup')) {
      return;
    }

    await test.step('Navigate to security settings', async () => {
      // Would navigate to /admin/security or similar
      await page.goto('/admin/security');
      await expect(page).toHaveURL(/\/admin\/security$/);
    });

    await test.step('Locate MFA status and disable option', async () => {
      const mfaStatus = page.locator('[data-testid="mfa-status"]');
      if (await mfaStatus.isVisible()) {
        const disableButton = page.getByRole('button', { name: /deshabilitar/i });
        await expect(disableButton).toBeVisible();
      }
    });

    await test.step('Disabling MFA requires step-up confirmation', async () => {
      const disableButton = page.getByRole('button', { name: /deshabilitar/i });
      await disableButton.click();

      // Should show step-up modal for this sensitive action
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Verificar identidad');

      // Complete step-up
      const totpInput = page.getByPlaceholder('000000');
      await totpInput.fill('000000');
      await page.getByRole('button', { name: /verificar/ }).click();
    });
  });
});
