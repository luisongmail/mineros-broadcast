import type { ErrorCode } from '@playflow/core';
import type { NextFunction, Request, Response } from 'express';
import type { ApiErrorBody } from '../types';
import { sendIc003Error } from './validateIC003';

interface Ic003ErrorShape {
  status?: number;
  code?: ErrorCode;
  details?: unknown;
  message?: string;
}

function toIc003Error(error: unknown): Ic003ErrorShape {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  return error as Ic003ErrorShape;
}

export function notFoundHandler(req: Request, res: Response<ApiErrorBody>): void {
  sendIc003Error(res, {
    status: 404,
    requestEnvelope: req.overlayEnvelope,
    code: 'NOT_FOUND',
    message: 'Ruta no encontrada.',
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response<ApiErrorBody>,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error('[overlay-server] Error no controlado.', error);

  const ic003Error = toIc003Error(error);
  sendIc003Error(res, {
    status: ic003Error.status ?? 500,
    requestEnvelope: req.overlayEnvelope,
    code: ic003Error.code ?? 'INTERNAL_SERVER_ERROR',
    message: ic003Error.message ?? 'Ocurrió un error interno en el servidor.',
    details: ic003Error.details,
  });
}
