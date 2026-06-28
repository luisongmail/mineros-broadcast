import type { NextFunction, Request, Response } from 'express';
import type { OverlayStateService } from '../services/overlayStateService';
import { getValidatedEnvelope, sendIc003Error } from './validateIC003';

interface ValidateExpectedRevisionOptions {
  service: OverlayStateService;
  required?: boolean;
}

export function validateExpectedRevision(options: ValidateExpectedRevisionOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const envelope = getValidatedEnvelope(req);

      if (!envelope) {
        sendIc003Error(res, {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'No se encontró un envelope IC-003 validado.',
        });
        return;
      }

      const { expectedRevision } = envelope.payload;

      if (typeof expectedRevision !== 'number') {
        if (options.required) {
          sendIc003Error(res, {
            status: 400,
            requestEnvelope: envelope,
            code: 'VALIDATION_ERROR',
            message: 'expectedRevision es obligatorio para esta acción.',
          });
          return;
        }

        next();
        return;
      }

      const snapshot = await options.service.getSnapshot();

      if (snapshot.revision !== expectedRevision) {
        sendIc003Error(res, {
          status: 409,
          requestEnvelope: envelope,
          code: 'CONFLICT',
          message: 'La revisión esperada no coincide con el snapshot global actual.',
          details: { expectedRevision, currentRevision: snapshot.revision, snapshot },
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
