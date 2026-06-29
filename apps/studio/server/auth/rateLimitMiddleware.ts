/**
 * rateLimitMiddleware.ts
 * Middleware de rate limiting para endpoints sensibles.
 * Implementa protección contra brute-force attacks usando ventanas de tiempo.
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitWindow {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil?: number;
}

// En memoria: { key → RateLimitWindow }
const rateLimitStore = new Map<string, RateLimitWindow>();

// Configuración de límites por endpoint
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Ventana de tiempo en ms
  blockDurationMs: number; // Duración del bloqueo en ms
  keyGenerator?: (req: Request) => string; // Función para generar la clave
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 30 * 60 * 1000, // 30 minutos
  keyGenerator: (req: Request) => `${req.ip}-${req.path}`,
};

/**
 * Crea un middleware de rate limiting con configuración personalizada.
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = finalConfig.keyGenerator!(req);
    const now = Date.now();
    let window = rateLimitStore.get(key);

    // Si está bloqueado, verifica si puede desbloquearse
    if (window?.blockedUntil && now < window.blockedUntil) {
      const retryAfter = Math.ceil((window.blockedUntil - now) / 1000);
      res.status(429).set('Retry-After', retryAfter.toString()).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos. Intenta en ${retryAfter} segundos.`,
          retryAfter: retryAfter * 1000,
        },
      });
      return;
    }

    // Si expiró la ventana de tiempo, resetea
    if (window && now - window.firstAttemptTime > finalConfig.windowMs) {
      window = undefined;
    }

    // Inicializa o incrementa contador
    if (!window) {
      window = { attempts: 0, firstAttemptTime: now };
      rateLimitStore.set(key, window);
    }

    // Incrementa intentos
    window.attempts++;

    // Si se alcanza el límite, bloquea
    if (window.attempts >= finalConfig.maxAttempts) {
      window.blockedUntil = now + finalConfig.blockDurationMs;

      const retryAfter = Math.ceil(finalConfig.blockDurationMs / 1000);
      res.status(429).set('Retry-After', retryAfter.toString()).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos. Está bloqueado por ${retryAfter} segundos.`,
          retryAfter: finalConfig.blockDurationMs,
        },
      });
      return;
    }

    // Continúa normalmente
    res.set('X-RateLimit-Limit', finalConfig.maxAttempts.toString());
    res.set('X-RateLimit-Remaining', (finalConfig.maxAttempts - window.attempts).toString());

    next();
  };
}

/**
 * Resetea el contador de rate limit para una clave específica.
 * Útil para casos de éxito (login exitoso, etc.)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Obtiene la clave de rate limit por IP y usuario (si está autenticado).
 */
export function getRateLimitKey(req: Request, userId?: string): string {
  return userId ? `${req.ip}-${userId}` : `${req.ip}`;
}

/**
 * Verifica si una clave está actualmente bloqueada.
 */
export function isRateLimited(key: string): boolean {
  const window = rateLimitStore.get(key);
  if (!window?.blockedUntil) return false;
  return Date.now() < window.blockedUntil;
}

/**
 * Obtiene el tiempo restante de bloqueo en milisegundos.
 */
export function getRateLimitBlockTimeRemaining(key: string): number {
  const window = rateLimitStore.get(key);
  if (!window?.blockedUntil) return 0;
  const remaining = window.blockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Limpia almacenamiento antiguo de rate limit (para mantenimiento).
 * Llama periódicamente para evitar memory leaks.
 */
export function cleanupRateLimit(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, window] of rateLimitStore.entries()) {
    // Limpia entradas que:
    // 1. Expiraron la ventana de tiempo Y no están bloqueadas
    // 2. El bloqueo expiró hace más de 1 hora
    const windowExpired = now - window.firstAttemptTime > 60 * 60 * 1000;
    const blockExpired = window.blockedUntil && now - window.blockedUntil > 60 * 60 * 1000;

    if (windowExpired || blockExpired) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
  return cleaned;
}

/**
 * Ejecuta cleanup automático cada 10 minutos.
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startRateLimitCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => cleanupRateLimit(), 10 * 60 * 1000);
  console.log('[RateLimit] Automatic cleanup started (every 10 minutes)');
}

export function stopRateLimitCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[RateLimit] Automatic cleanup stopped');
  }
}
