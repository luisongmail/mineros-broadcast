import { createEnvelope, type ErrorCode, type ErrorPayload } from '@playflow/core';
import type { NextFunction, Request, Response } from 'express';
import type {
  OverlayActionEnvelope,
  OverlayActionResponseEnvelope,
  OverlayActionResponsePayload,
  OverlayMessageTarget,
  OverlaySnapshotEnvelope,
} from '../types';

const SUPPORTED_SCHEMA_VERSION = '1.0.0';
const OVERLAY_SERVER_SOURCE = 'OverlayServer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function getValidatedEnvelope(req: Request): OverlayActionEnvelope | null {
  return req.overlayEnvelope ?? null;
}

export function buildSnapshotEnvelope(snapshot: OverlaySnapshotEnvelope['payload'], correlationId?: string): OverlaySnapshotEnvelope {
  return {
    ...createEnvelope('snapshot', OVERLAY_SERVER_SOURCE, 'OverlayClients', snapshot, correlationId),
    messageType: 'snapshot',
  };
}

export function buildResponseEnvelope(
  requestEnvelope: OverlayActionEnvelope,
  payload: OverlayActionResponsePayload,
): OverlayActionResponseEnvelope {
  return {
    ...createEnvelope('response', OVERLAY_SERVER_SOURCE, requestEnvelope.source, payload, requestEnvelope.correlationId),
    messageType: 'response',
    requestId: requestEnvelope.requestId,
  };
}

export function buildErrorEnvelope(
  target: OverlayMessageTarget,
  correlationId: string,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  return {
    ...createEnvelope<ErrorPayload>(
      'error',
      OVERLAY_SERVER_SOURCE,
      target,
      { code, message, details },
      correlationId,
    ),
    messageType: 'error' as const,
  };
}

export function sendIc003Error(
  res: Response,
  options: {
    status: number;
    requestEnvelope?: OverlayActionEnvelope | null;
    target?: OverlayMessageTarget;
    code: ErrorCode;
    message: string;
    details?: unknown;
  },
): void {
  const correlationId = options.requestEnvelope?.correlationId ?? `corr-overlay-error-${Date.now()}`;
  const requestTarget = options.requestEnvelope?.source;
  const target = (requestTarget as OverlayMessageTarget | undefined) ?? options.target ?? 'OperatorControlPanel';

  res.status(options.status).json(
    buildErrorEnvelope(target, correlationId, options.code, options.message, options.details),
  );
}

export function validateIC003Envelope(req: Request, res: Response, next: NextFunction): void {
  const body = req.body;

  if (!isRecord(body)) {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'El body debe ser un objeto JSON con envelope IC-003.',
    });
    return;
  }

  const candidate = body as Record<string, unknown>;

  if (candidate.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'schemaVersion debe ser 1.0.0.',
      details: { recibido: candidate.schemaVersion },
    });
    return;
  }

  if (candidate.messageType !== 'command') {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'messageType debe ser command.',
      details: { recibido: candidate.messageType },
    });
    return;
  }

  if (typeof candidate.correlationId !== 'string' || candidate.correlationId.trim().length === 0) {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'correlationId es obligatorio y debe ser texto no vacío.',
    });
    return;
  }

  if (typeof candidate.source !== 'string' || typeof candidate.target !== 'string') {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'source y target son obligatorios en IC-003.',
    });
    return;
  }

  if (typeof candidate.timestamp !== 'string' || !isValidIsoTimestamp(candidate.timestamp)) {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'timestamp debe ser un ISO 8601 válido.',
    });
    return;
  }

  if (!isRecord(candidate.payload)) {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'payload debe ser un objeto.',
    });
    return;
  }

  req.overlayEnvelope = candidate as unknown as OverlayActionEnvelope;
  next();
}
