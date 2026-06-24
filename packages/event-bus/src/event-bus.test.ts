import { describe, expect, it, vi } from 'vitest';
import type { Envelope } from '@mineros/core';

import { EventBus } from './EventBus';

function createEnvelope(overrides: Partial<Envelope<{ value: number }>> = {}): Envelope<{ value: number }> {
  return {
    schemaVersion: '1.0.0',
    messageType: 'event',
    correlationId: 'corr-001',
    source: 'LayoutManager',
    target: 'OverlayManager',
    timestamp: new Date().toISOString(),
    payload: { value: 1 },
    ...overrides,
  };
}

describe('@mineros/event-bus', () => {
  it('publica y entrega mensajes al handler suscrito', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const envelope = createEnvelope();

    const unsubscribe = bus.subscribe(envelope.target, envelope.messageType, handler);
    bus.publish(envelope);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(envelope);

    unsubscribe();
  });

  it('unsubscribe elimina el handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const envelope = createEnvelope();

    const unsubscribe = bus.subscribe(envelope.target, envelope.messageType, handler);
    unsubscribe();
    bus.publish(envelope);

    expect(handler).not.toHaveBeenCalled();
  });

  it('rechaza envelopes con campos obligatorios faltantes', () => {
    const bus = new EventBus();

    expect(() =>
      bus.publish(
        createEnvelope({
          schemaVersion: '',
        }),
      ),
    ).toThrow(/schemaVersion/);

    expect(() =>
      bus.publish({
        ...createEnvelope(),
        payload: undefined,
      } as unknown as Envelope<{ value: number }>),
    ).toThrow(/payload/);
  });

  it('subscribeAll recibe todos los mensajes publicados', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const first = createEnvelope();
    const second = createEnvelope({
      messageType: 'command',
      correlationId: 'corr-002',
      target: 'LayoutManager',
    });

    const unsubscribe = bus.subscribeAll(handler);
    bus.publish(first);
    bus.publish(second);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, first);
    expect(handler).toHaveBeenNthCalledWith(2, second);

    unsubscribe();
  });
});
