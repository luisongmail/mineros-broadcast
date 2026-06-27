/**
 * lifecycleRouter — Spec 23: Overlay Lifecycle
 * Endpoints REST para operar la máquina de estados de overlays.
 * Estado compartido: singleton OverlayLifecycle por proceso del servidor.
 */
import { Router } from 'express';
import { OverlayLifecycle } from '@mineros/overlay-manager';

export const lifecycle = new OverlayLifecycle();

// Pre-registrar todos los overlays del sistema con prioridades del spec 23
const OVERLAY_REGISTRY: Array<{ id: string; priority: number; zone: string }> = [
  { id: 'scorebug',            priority: 90, zone: 'A' },
  { id: 'substitution',        priority: 90, zone: 'B' },
  { id: 'batter',              priority: 70, zone: 'B' },
  { id: 'pitcher',             priority: 70, zone: 'C' },
  { id: 'lineup',              priority: 70, zone: 'B' },
  { id: 'next_batters',        priority: 70, zone: 'B' },
  { id: 'game_event',          priority: 80, zone: 'D' },
  { id: 'final_score',         priority: 80, zone: 'D' },
  { id: 'inning_transition',   priority: 60, zone: 'D' },
  { id: 'countdown',           priority: 60, zone: 'D' },
  { id: 'announcement',        priority: 50, zone: 'E' },
  { id: 'social_lower_third',  priority: 50, zone: 'E' },
  { id: 'sponsor_break',       priority: 40, zone: 'D' },
];

for (const entry of OVERLAY_REGISTRY) {
  lifecycle.register(entry.id, entry.priority, entry.zone);
}

const router = Router();

/** GET /api/v1/lifecycle — lista todos los overlays con su estado actual */
router.get('/', (_req, res) => {
  const states = OVERLAY_REGISTRY.map(({ id }) => lifecycle.getEntry(id)).filter(Boolean);
  res.json({ apiVersion: 'v1', status: states.length, data: states });
});

/** GET /api/v1/lifecycle/:overlayId — estado de un overlay específico */
router.get('/:overlayId', (req, res) => {
  const entry = lifecycle.getEntry(req.params.overlayId);
  if (!entry) {
    res.status(404).json({ error: { message: `Overlay '${req.params.overlayId}' no registrado.` } });
    return;
  }
  res.json({ apiVersion: 'v1', data: entry });
});

/**
 * POST /api/v1/lifecycle/:overlayId/request
 * Body: { payload: {}, holdSeconds?: number }
 * Solicita mostrar el overlay (ready → validated)
 */
router.post('/:overlayId/request', (req, res) => {
  try {
    const payload = req.body.payload ?? req.body;
    const entry = lifecycle.request(req.params.overlayId, payload);
    res.json({ apiVersion: 'v1', data: entry });
  } catch (err) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

/** POST /api/v1/lifecycle/:overlayId/preview — validated → preview */
router.post('/:overlayId/preview', (req, res) => {
  try {
    const entry = lifecycle.toPreview(req.params.overlayId);
    res.json({ apiVersion: 'v1', data: entry });
  } catch (err) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

/**
 * POST /api/v1/lifecycle/:overlayId/program
 * Body: { holdSeconds?: number }
 * Preview/validated → program. Soporta auto-hide por holdSeconds.
 */
router.post('/:overlayId/program', (req, res) => {
  try {
    const holdSeconds = typeof req.body.holdSeconds === 'number' ? req.body.holdSeconds : undefined;
    const entry = lifecycle.toProgram(req.params.overlayId, holdSeconds);
    res.json({ apiVersion: 'v1', data: entry });
  } catch (err) {
    res.status(409).json({ error: { message: (err as Error).message } });
  }
});

/** POST /api/v1/lifecycle/:overlayId/hide — program/preview → hidden */
router.post('/:overlayId/hide', (req, res) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason : undefined;
    const entry = lifecycle.hide(req.params.overlayId, reason);
    res.json({ apiVersion: 'v1', data: entry });
  } catch (err) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

/** POST /api/v1/lifecycle/:overlayId/archive — hidden → archived */
router.post('/:overlayId/archive', (req, res) => {
  try {
    const entry = lifecycle.archive(req.params.overlayId);
    res.json({ apiVersion: 'v1', data: entry });
  } catch (err) {
    res.status(400).json({ error: { message: (err as Error).message } });
  }
});

export default router;
