import { beforeEach, describe, expect, it } from 'vitest';
import { createEnvelope, createErrorEnvelope } from './index';

describe('helpers de envelope', () => {
  let source: string;
  let target: string;
  let payload: { gameId: string };
  let correlationId: string;

  beforeEach(() => {
    source = 'GameEngine';
    target = 'OverlayManager';
    payload = { gameId: 'GAME-001' };
    correlationId = 'corr-externo-001';
  });

  describe('createEnvelope', () => {
    it("genera schemaVersion '1.0.0'", () => {
      expect(createEnvelope('event', source, target, payload).schemaVersion).toBe('1.0.0');
    });

    it('asigna messageType correcto', () => {
      expect(createEnvelope('command', source, target, payload).messageType).toBe('command');
    });

    it('asigna source y target', () => {
      const envelope = createEnvelope('event', source, target, payload);

      expect(envelope.source).toBe(source);
      expect(envelope.target).toBe(target);
    });

    it('genera timestamp ISO válido', () => {
      const envelope = createEnvelope('event', source, target, payload);

      expect(Number.isNaN(Date.parse(envelope.timestamp))).toBe(false);
      expect(new Date(envelope.timestamp).toISOString()).toBe(envelope.timestamp);
    });

    it('genera correlationId automático si no se provee', () => {
      const envelope = createEnvelope('event', source, target, payload);

      expect(envelope.correlationId).toMatch(/^corr-/);
    });

    it('acepta correlationId externo', () => {
      expect(createEnvelope('event', source, target, payload, correlationId).correlationId).toBe(correlationId);
    });
  });

  describe('createErrorEnvelope', () => {
    it("genera messageType='error'", () => {
      expect(createErrorEnvelope(source, target, 'VALIDATION_ERROR', 'Payload inválido').messageType).toBe('error');
    });

    it('incluye code y message en payload', () => {
      expect(createErrorEnvelope(source, target, 'NOT_FOUND', 'No existe')).toMatchObject({
        payload: {
          code: 'NOT_FOUND',
          message: 'No existe',
        },
      });
    });
  });

  describe('contrato IC-005', () => {
    it('todo envelope tiene todos los campos obligatorios de IC-005', () => {
      const envelope = createEnvelope('response', source, target, payload);

      expect(envelope).toEqual(
        expect.objectContaining({
          schemaVersion: expect.any(String),
          messageType: 'response',
          correlationId: expect.any(String),
          source: expect.any(String),
          target: expect.any(String),
          timestamp: expect.any(String),
          payload,
        }),
      );
    });
  });
});
