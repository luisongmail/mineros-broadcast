import crypto from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  createSessionId,
  createUserIdFromEmail,
  findValidOtpChallenge,
  generateOtpCode,
  getJwtConfig,
  storeOtpChallenge,
  storeUserSession,
} from '../lib/db';
import type { ApiErrorBody, OtpRequestBody, OtpRequestResponse, OtpVerifyBody, OtpVerifyResponse } from '../types';

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 10);

function requireJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required and must be set in .env or Key Vault');
  }

  return jwtSecret;
}
const JWT_SECRET = requireJwtSecret();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post(
    '/otp/request',
    async (req: Request<unknown, OtpRequestResponse | ApiErrorBody, OtpRequestBody>, res: Response): Promise<void> => {
      const email = req.body?.email?.trim().toLowerCase();

      if (!email || !isValidEmail(email)) {
        res.status(400).json({
          error: {
            code: 'INVALID_EMAIL',
            message: 'Debes enviar un correo electrónico válido.',
          },
        });
        return;
      }

      const code = generateOtpCode();
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

      await storeOtpChallenge(email, code, expiresAt);

      console.log(`[overlay-server] OTP solicitado para ${email}.`);

      res.status(202).json({
        message: 'Código OTP generado correctamente.',
        expiresAt: expiresAt.toISOString(),
      });
    },
  );

  router.post(
    '/otp/verify',
    async (req: Request<unknown, OtpVerifyResponse | ApiErrorBody, OtpVerifyBody>, res: Response): Promise<void> => {
      const email = req.body?.email?.trim().toLowerCase();
      const code = req.body?.code?.trim();

      if (!email || !code) {
        res.status(400).json({
          error: {
            code: 'INVALID_OTP_PAYLOAD',
            message: 'Debes enviar email y code.',
          },
        });
        return;
      }

      const challenge = await findValidOtpChallenge(email, code);

      if (!challenge) {
        res.status(401).json({
          error: {
            code: 'INVALID_OTP',
            message: 'Código inválido o expirado.',
          },
        });
        return;
      }

      const sessionId = createSessionId();
      const { issuer, audience, expiresInSeconds } = getJwtConfig();
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = new Date((issuedAt + expiresInSeconds) * 1000);
      const userId = challenge.userId || createUserIdFromEmail(email);
      const accessToken = jwt.sign(
        {
          sub: userId,
          sid: sessionId,
          email,
          authLevel: 'otp',
          jti: crypto.randomUUID(),
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          issuer,
          audience,
          expiresIn: expiresInSeconds,
        },
      );

      await storeUserSession(userId, accessToken, expiresAt, sessionId);

      console.log(`[overlay-server] Sesión OTP validada para ${email}.`);

      res.status(200).json({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: expiresInSeconds,
        sessionId,
      });
    },
  );

  return router;
}
