import { Router, type Request, type Response } from 'express';
import type {
  ApiErrorBody,
  OverlayActionEnvelope,
  OverlayActionResponseEnvelope,
  OverlayOperatorAction,
} from '../types';
import { authorizeAction } from '../middleware/authorizeAction';
import {
  buildResponseEnvelope,
  getValidatedEnvelope,
  sendIc003Error,
  validateIC003Envelope,
} from '../middleware/validateIC003';
import { validateExpectedRevision } from '../middleware/validateExpectedRevision';
import { OverlayStateError, type OverlayStateService } from '../services/overlayStateService';

interface OverlayRouterDependencies {
  stateService: OverlayStateService;
  publishSnapshot: (correlationId: string) => Promise<void>;
}

interface ActionRouteOptions {
  path: string;
  expectedAction: OverlayOperatorAction;
  successStatus: number;
  requiresOverlayId?: boolean;
  requiresZoneId?: boolean;
  successLog: (envelope: OverlayActionEnvelope) => string;
  execute: (envelope: OverlayActionEnvelope, latencyMs: number) => Promise<{
    actionId: string;
    auditId: string;
    snapshot: {
      correlationId: string;
      payload: {
        revision: number;
        previewState: OverlayActionResponseEnvelope['payload']['previewState'];
        programState: OverlayActionResponseEnvelope['payload']['programState'];
      };
    };
  }>;
}

const actionPathMap: Partial<Record<OverlayOperatorAction, string>> = {
  preview_overlay: '/actions/preview-overlay',
  take_overlay: '/actions/take-overlay',
  force_show: '/actions/force-show',
  hide_all: '/actions/hide-all',
  clear_preview: '/actions/clear-preview',
  hide_overlay: '/actions/hide-overlay',
};

function ensureAction(
  req: Request,
  res: Response<OverlayActionResponseEnvelope | ApiErrorBody>,
  expectedAction: OverlayActionEnvelope['payload']['action'],
): OverlayActionEnvelope | null {
  const envelope = getValidatedEnvelope(req);

  if (!envelope) {
    sendIc003Error(res, {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'No se encontró el envelope IC-003 validado.',
    });
    return null;
  }

  if (envelope.payload.action !== expectedAction) {
    sendIc003Error(res, {
      status: 422,
      requestEnvelope: envelope,
      code: 'VALIDATION_ERROR',
      message: `La ruta requiere action=${expectedAction}.`,
      details: { recibido: envelope.payload.action },
    });
    return null;
  }

  return envelope;
}

function sendActionError(
  res: Response<OverlayActionResponseEnvelope | ApiErrorBody>,
  envelope: OverlayActionEnvelope,
  error: unknown,
  fallbackMessage: string,
): void {
  if (error instanceof OverlayStateError) {
    sendIc003Error(res, {
      status: error.status,
      requestEnvelope: envelope,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  sendIc003Error(res, {
    status: 500,
    requestEnvelope: envelope,
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : fallbackMessage,
  });
}

export function createOverlayRouter(dependencies: OverlayRouterDependencies): Router {
  const router = Router();

  const registerActionRoute = (options: ActionRouteOptions): void => {
    router.post(
      options.path,
      validateIC003Envelope,
      authorizeAction,
      validateExpectedRevision({ service: dependencies.stateService, required: true }),
      async (
        req: Request<unknown, OverlayActionResponseEnvelope | ApiErrorBody>,
        res: Response<OverlayActionResponseEnvelope | ApiErrorBody>,
      ): Promise<void> => {
        const startedAt = Date.now();
        const envelope = ensureAction(req as Request, res, options.expectedAction);

        if (!envelope) {
          return;
        }

        if (options.requiresOverlayId && !envelope.payload.overlayId?.trim()) {
          sendIc003Error(res, {
            status: 400,
            requestEnvelope: envelope,
            code: 'VALIDATION_ERROR',
            message: 'overlayId es obligatorio para esta acción.',
          });
          return;
        }

        if (options.requiresZoneId && !envelope.payload.zoneId?.trim()) {
          sendIc003Error(res, {
            status: 400,
            requestEnvelope: envelope,
            code: 'VALIDATION_ERROR',
            message: 'zoneId es obligatorio para esta acción.',
          });
          return;
        }

        try {
          const result = await options.execute(envelope, Date.now() - startedAt);
          await dependencies.publishSnapshot(result.snapshot.correlationId);

          console.info(options.successLog(envelope));
          res.status(options.successStatus).json(buildResponseEnvelope(envelope, {
            accepted: true,
            revision: result.snapshot.payload.revision,
            previewState: result.snapshot.payload.previewState,
            programState: result.snapshot.payload.programState,
            auditId: result.auditId,
            actionId: result.actionId,
          }));
        } catch (error) {
          sendActionError(res, envelope, error, `No se pudo ejecutar ${options.expectedAction}.`);
        }
      },
    );
  };

  registerActionRoute({
    path: '/actions/preview-overlay',
    expectedAction: 'preview_overlay',
    successStatus: 202,
    requiresOverlayId: true,
    successLog: (envelope) => `[overlay-server] Preview actualizado para ${envelope.payload.overlayId}.`,
    execute: (envelope, latencyMs) => dependencies.stateService.previewOverlay(envelope, latencyMs),
  });

  registerActionRoute({
    path: '/actions/take-overlay',
    expectedAction: 'take_overlay',
    successStatus: 200,
    requiresOverlayId: true,
    successLog: (envelope) => `[overlay-server] Overlay ${envelope.payload.overlayId} promovido a program.`,
    execute: (envelope, latencyMs) => dependencies.stateService.takeOverlay(envelope, latencyMs),
  });

  registerActionRoute({
    path: '/actions/force-show',
    expectedAction: 'force_show',
    successStatus: 200,
    requiresOverlayId: true,
    requiresZoneId: true,
    successLog: (envelope) => `[overlay-server] Overlay ${envelope.payload.overlayId} forzado a live.`,
    execute: (envelope, latencyMs) => dependencies.stateService.forceShowOverlay(envelope, latencyMs),
  });

  registerActionRoute({
    path: '/actions/hide-all',
    expectedAction: 'hide_all',
    successStatus: 200,
    successLog: () => '[overlay-server] Hide all aplicado (scorebug protegido).',
    execute: (envelope, latencyMs) => dependencies.stateService.hideAllOverlays(envelope, latencyMs),
  });

  registerActionRoute({
    path: '/actions/clear-preview',
    expectedAction: 'clear_preview',
    successStatus: 200,
    successLog: () => '[overlay-server] Preview limpiado.',
    execute: (envelope, latencyMs) => dependencies.stateService.clearPreview(envelope, latencyMs),
  });

  registerActionRoute({
    path: '/actions/hide-overlay',
    expectedAction: 'hide_overlay',
    successStatus: 200,
    requiresOverlayId: true,
    successLog: (envelope) => `[overlay-server] Overlay ${envelope.payload.overlayId} ocultado.`,
    execute: (envelope, latencyMs) => dependencies.stateService.hideOverlay(envelope, latencyMs),
  });

  router.post(
    '/action',
    validateIC003Envelope,
    authorizeAction,
    validateExpectedRevision({ service: dependencies.stateService, required: true }),
    async (
      req: Request<unknown, OverlayActionResponseEnvelope | ApiErrorBody>,
      res: Response<OverlayActionResponseEnvelope | ApiErrorBody>,
    ): Promise<void> => {
      const envelope = getValidatedEnvelope(req as Request);

      if (!envelope) {
        sendIc003Error(res, {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'No se encontró un envelope IC-003 validado.',
        });
        return;
      }

      const redirectPath = actionPathMap[envelope.payload.action];

      if (redirectPath) {
        req.url = redirectPath;
        res.redirect(307, req.baseUrl + redirectPath);
        return;
      }

      sendIc003Error(res, {
        status: 422,
        requestEnvelope: envelope,
        code: 'VALIDATION_ERROR',
        message: `La acción ${envelope.payload.action} todavía no está implementada.`,
      });
    },
  );

  return router;
}
