import { EventEmitter } from 'events';
import type { Envelope, MessageType } from '@playflow/core';

const REQUIRED_STRING_FIELDS = [
  'schemaVersion',
  'correlationId',
  'source',
  'target',
  'timestamp',
] as const satisfies ReadonlyArray<keyof Envelope>;

const MESSAGE_TYPES: ReadonlySet<MessageType> = new Set([
  'command',
  'event',
  'query',
  'response',
  'snapshot',
  'error',
]);

const GLOBAL_CHANNEL = '*';

type Handler<T = unknown> = (envelope: Envelope<T>) => void;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export class EventBus {
  private readonly emitter = new EventEmitter();

  publish<T>(envelope: Envelope<T>): void {
    this.validateEnvelope(envelope);

    const channel = this.getChannel(envelope.target, envelope.messageType);

    this.emitter.emit(channel, envelope);
    this.emitter.emit(GLOBAL_CHANNEL, envelope);
  }

  subscribe<T>(target: string, messageType: Envelope['messageType'], handler: Handler<T>): () => void {
    const channel = this.getChannel(target, messageType);
    const typedHandler = handler as Handler;

    this.emitter.on(channel, typedHandler);

    return () => {
      this.emitter.off(channel, typedHandler);
    };
  }

  subscribeAll(handler: Handler): () => void {
    this.emitter.on(GLOBAL_CHANNEL, handler);

    return () => {
      this.emitter.off(GLOBAL_CHANNEL, handler);
    };
  }

  private getChannel(target: string, messageType: Envelope['messageType']): string {
    return `${target}:${messageType}`;
  }

  private validateEnvelope<T>(envelope: Envelope<T>): void {
    for (const field of REQUIRED_STRING_FIELDS) {
      if (!isNonEmptyString(envelope[field])) {
        throw new Error(`Envelope invlido: falta el campo obligatorio '${field}'.`);
      }
    }

    if (!MESSAGE_TYPES.has(envelope.messageType)) {
      throw new Error(`Envelope invlido: messageType desconocido '${String(envelope.messageType)}'.`);
    }

    if (envelope.payload === undefined) {
      throw new Error("Envelope invlido: falta el campo obligatorio 'payload'.");
    }

    if (Number.isNaN(Date.parse(envelope.timestamp))) {
      throw new Error("Envelope invlido: 'timestamp' debe ser una fecha ISO vlida.");
    }
  }
}

export type { Handler };
export const globalBus = new EventBus();
