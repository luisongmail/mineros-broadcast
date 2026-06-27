import { Router } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { authorize } from '../authorization/authorizationService';
import { queryAudit, verifyChainIntegrity } from './auditService';

export const auditRouter = Router();

// GET /api/audit
auditRouter.get('/', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'System',
    resourceId: 'global' ,
    action: 'audit.view',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });

  const entries = await queryAudit({
    actorUserId: req.query.actorUserId as string | undefined,
    resourceType: req.query.resourceType as string | undefined,
    resourceId: req.query.resourceId as string | undefined,
    action: req.query.action as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 50, 200),
  });
  res.json({ entries });
});

// GET /api/audit/integrity — verifica la cadena de hash
auditRouter.get('/integrity', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'System',
    resourceId: 'global' ,
    action: 'audit.integrity',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });

  const result = await verifyChainIntegrity(
    req.query.from as string | undefined,
    req.query.to as string | undefined,
  );
  res.json(result);
});
