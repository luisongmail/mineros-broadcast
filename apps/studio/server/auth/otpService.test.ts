import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de la DB para tests sin MySQL
vi.mock('../db', () => ({ pool: undefined, hasDatabaseConfigured: () => false }));

describe('otpService — sin DB (dev mode)', () => {
  beforeEach(() => {
    process.env.OTP_TTL_MINUTES = '10';
    process.env.OTP_MAX_ATTEMPTS = '5';
    process.env.OTP_RESEND_SECONDS = '60';
    process.env.OTP_RATE_LIMIT_PER_IP = '10';
    process.env.OTP_RATE_WINDOW_MINUTES = '15';
  });

  it('requestOtp sin DB retorna ok con challengeId dev_nodb', async () => {
    const { requestOtp } = await import('./otpService');
    const result = await requestOtp('test@playflow.cl', '127.0.0.1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challengeId).toBe('dev_nodb');
  });

  it('verifyOtp sin DB acepta código 000000', async () => {
    const { verifyOtp } = await import('./otpService');
    const result = await verifyOtp('test@playflow.cl', '000000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('dev_user');
      expect(result.email).toBe('test@playflow.cl');
    }
  });

  it('verifyOtp sin DB rechaza código incorrecto', async () => {
    const { verifyOtp } = await import('./otpService');
    const result = await verifyOtp('test@playflow.cl', '123456');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_otp');
  });

  it('consumeOtpPlaintext retorna null para challengeId desconocido', async () => {
    const { consumeOtpPlaintext } = await import('./otpService');
    const otp = consumeOtpPlaintext('otp_unknown_challenge');
    expect(otp).toBeNull();
  });
});
