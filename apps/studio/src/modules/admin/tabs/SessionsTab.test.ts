import { describe, expect, it } from 'vitest';
import type { AdminSession } from '../../../hooks/useAdmin';
import { isSessionActive, normalizeSessionSearchTerm } from './SessionsTab';

function buildSession(overrides: Partial<AdminSession> = {}): AdminSession {
  return {
    id: 'sess_1',
    userId: 'usr_1',
    ipAddress: '127.0.0.1',
    userAgent: 'ua',
    createdAt: '2026-06-30T00:00:00.000Z',
    lastActivity: '2026-06-30T01:00:00.000Z',
    expiresAt: '',
    ...overrides,
  };
}

describe('SessionsTab activity logic', () => {
  it('trata sesiones con expiresAt vacío como activas (payload real)', () => {
    const session = buildSession({ expiresAt: '' });
    expect(isSessionActive(session, new Date('2026-06-30T03:00:00.000Z'))).toBe(true);
  });

  it('trata sesiones con expiresAt inválido como activas', () => {
    const session = buildSession({ expiresAt: 'invalid-date' });
    expect(isSessionActive(session, new Date('2026-06-30T03:00:00.000Z'))).toBe(true);
  });

  it('respeta expiración válida cuando existe', () => {
    const session = buildSession({ expiresAt: '2026-06-30T02:00:00.000Z' });
    expect(isSessionActive(session, new Date('2026-06-30T03:00:00.000Z'))).toBe(false);
  });

  it('normaliza búsqueda: requiere mínimo 3 caracteres', () => {
    expect(normalizeSessionSearchTerm('ab')).toBe('');
    expect(normalizeSessionSearchTerm('  ab ')).toBe('');
    expect(normalizeSessionSearchTerm('abc')).toBe('abc');
    expect(normalizeSessionSearchTerm('  usr_001 ')).toBe('usr_001');
  });
});
