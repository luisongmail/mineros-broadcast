import type { Response } from 'express';
import { Router } from 'express';
import { initTotpSetup, verifyAndActivateTotp, verifyTotpLogin } from './totpService';
import { requireAuth, type AuthenticatedRequest } from './authMiddleware';

const router = Router();

// ─────────────────────────────────────────────
// POST /api/auth/mfa/setup/init
// Inicia la configuración de MFA TOTP
// ─────────────────────────────────────────────
router.post('/mfa/setup/init', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const email = req.user?.email;

    if (!userId || !email) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } });
      return;
    }

    console.log(`[MFA] POST /mfa/setup/init → userId=${userId}`);

    const { qrUri, secretBase32, credentialId } = await initTotpSetup(userId, email);

    res.json({
      qrUri,
      secretBase32,
      credentialId,
      message: 'Escanea el código QR con tu autenticador y confirma el código.',
    });
  } catch (error) {
    console.error('[MFA] /mfa/setup/init ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al iniciar configuración de MFA.' } });
    }
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/mfa/setup/verify
// Verifica el primer código TOTP y activa la credential
// ─────────────────────────────────────────────
router.post('/mfa/setup/verify', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;
    const { code } = req.body as { code?: string };

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } });
      return;
    }

    if (!code) {
      res.status(400).json({ error: { code: 'INVALID_CODE', message: 'Código requerido.' } });
      return;
    }

    console.log(`[MFA] POST /mfa/setup/verify → userId=${userId}`);

    const result = await verifyAndActivateTotp(userId, code.trim());

    if (!result.ok) {
      res.status(401).json({ error: { code: 'INVALID_CODE', message: 'Código inválido o expirado.' } });
      return;
    }

    res.json({ success: true, message: 'MFA TOTP activado correctamente.' });
  } catch (error) {
    console.error('[MFA] /mfa/setup/verify ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al verificar MFA.' } });
    }
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/mfa/verify
// Verifica el código TOTP en el flujo de login
// Devuelve JWT si el código es correcto
// ─────────────────────────────────────────────
router.post('/mfa/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId, code } = req.body as { userId?: string; code?: string };

    if (!userId || !code) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'userId y code requeridos.' } });
      return;
    }

    console.log(`[MFA] POST /mfa/verify → userId=${userId}`);

    const isValid = await verifyTotpLogin(userId, code.trim());

    if (!isValid) {
      res.status(401).json({ error: { code: 'INVALID_CODE', message: 'Código TOTP inválido o expirado.' } });
      return;
    }

    // En un flujo real, aquí se crearía la sesión y se emitiría el JWT
    // Por ahora, devolvemos confirmación
    res.json({ success: true, message: 'TOTP verificado correctamente.' });
  } catch (error) {
    console.error('[MFA] /mfa/verify ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al verificar TOTP.' } });
    }
  }
});

// ─────────────────────────────────────────────
// DELETE /api/auth/mfa
// Revoca la credencial MFA (requiere step-up)
// ─────────────────────────────────────────────
router.delete('/mfa', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no autenticado.' } });
      return;
    }

    console.log(`[MFA] DELETE /mfa → userId=${userId}`);

    // TODO: Implementar revocación de MFA (requiere step-up token en headers)
    // Por ahora solo confirmamos

    res.json({ success: true, message: 'MFA desactivado (implementación pendiente).' });
  } catch (error) {
    console.error('[MFA] DELETE /mfa ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error al desactivar MFA.' } });
    }
  }
});

export default router;
