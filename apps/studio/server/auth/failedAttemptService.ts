/**
 * failedAttemptService.ts
 * Gestiona intentos fallidos de autenticación y bloqueos de sesión.
 * Rastrean intentos fallidos de MFA, OTP, etc. para implementar lockout.
 */

import { logAuditEvent } from '../audit/auditService';

const MAX_MFA_ATTEMPTS = 5;
const MFA_ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MFA_LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutos

// En memoria: { userId → { attempts: number, firstAttemptTime: number, lockedUntil: number } }
const mfaAttempts = new Map<string, { attempts: number; firstAttemptTime: number; lockedUntil?: number }>();

/**
 * Registra un intento fallido de MFA para un usuario.
 * Si se alcanza el límite, bloquea al usuario.
 */
export async function recordMfaFailedAttempt(
  userId: string,
  requestContext: Record<string, unknown>
): Promise<{ blocked: boolean; remainingAttempts: number }> {
  const now = Date.now();
  let attempts = mfaAttempts.get(userId);

  // Si está bloqueado, verifica si ya se puede desbloquear
  if (attempts?.lockedUntil && now < attempts.lockedUntil) {
    await logAuditEvent(
      userId,
      'MFA_ATTEMPT_WHILE_LOCKED',
      'User',
      userId,
      'denied',
      {},
      requestContext
    );
    return { blocked: true, remainingAttempts: 0 };
  }

  // Si expiró el window de intentos, resetea
  if (attempts && now - attempts.firstAttemptTime > MFA_ATTEMPT_WINDOW_MS) {
    attempts = undefined;
  }

  // Inicializa o incrementa contador
  if (!attempts) {
    attempts = { attempts: 1, firstAttemptTime: now };
    mfaAttempts.set(userId, attempts);
    await logAuditEvent(
      userId,
      'MFA_ATTEMPT_FAILED',
      'User',
      userId,
      'denied',
      {},
      requestContext
    );
    return { blocked: false, remainingAttempts: MAX_MFA_ATTEMPTS - 1 };
  }

  attempts.attempts++;

  // Si se alcanza el límite, bloquea
  if (attempts.attempts >= MAX_MFA_ATTEMPTS) {
    attempts.lockedUntil = now + MFA_LOCKOUT_DURATION_MS;
    await logAuditEvent(
      userId,
      'MFA_LOCKOUT_TRIGGERED',
      'User',
      userId,
      'denied',
      { reason: 'Max failed attempts reached', lockoutDuration: MFA_LOCKOUT_DURATION_MS },
      requestContext
    );
    return { blocked: true, remainingAttempts: 0 };
  }

  mfaAttempts.set(userId, attempts);

  await logAuditEvent(
    userId,
    'MFA_ATTEMPT_FAILED',
    'User',
    userId,
    'denied',
    { attemptCount: attempts.attempts, maxAttempts: MAX_MFA_ATTEMPTS },
    requestContext
  );

  return { blocked: false, remainingAttempts: MAX_MFA_ATTEMPTS - attempts.attempts };
}

/**
 * Registra un intento exitoso de MFA y limpia el contador.
 */
export async function clearMfaAttempts(userId: string): Promise<void> {
  mfaAttempts.delete(userId);
}

/**
 * Verifica si el usuario está bloqueado por intentos fallidos de MFA.
 */
export function isMfaBlocked(userId: string): boolean {
  const attempts = mfaAttempts.get(userId);
  if (!attempts?.lockedUntil) return false;
  return Date.now() < attempts.lockedUntil;
}

/**
 * Obtiene el tiempo restante de bloqueo en milisegundos.
 */
export function getMfaLockoutTimeRemaining(userId: string): number {
  const attempts = mfaAttempts.get(userId);
  if (!attempts?.lockedUntil) return 0;
  const remaining = attempts.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Obtiene el número de intentos fallidos actuales.
 */
export function getMfaFailedAttempts(userId: string): number {
  const attempts = mfaAttempts.get(userId);
  if (!attempts) return 0;

  const now = Date.now();
  // Si expiró el window, resetea
  if (now - attempts.firstAttemptTime > MFA_ATTEMPT_WINDOW_MS) {
    return 0;
  }

  return attempts.attempts;
}

/**
 * Resetea manualmente los intentos fallidos de un usuario (para admin/debug).
 */
export function resetMfaAttempts(userId: string): void {
  mfaAttempts.delete(userId);
}
