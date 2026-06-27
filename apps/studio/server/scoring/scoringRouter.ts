import { Router } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { authorize } from '../authorization/authorizationService';
import { assignScorer, revokeScorer, getGameScorers } from './scoringAssignmentService';

export const scoringRouter = Router();

// GET /api/scoring/games/:gameId/scorers
scoringRouter.get('/games/:gameId/scorers', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'Game',
    resourceId: req.params.gameId,
    action: 'game.view',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const scorers = await getGameScorers(req.params.gameId);
  res.json({ scorers });
});

// POST /api/scoring/games/:gameId/scorers
scoringRouter.post('/games/:gameId/scorers', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'Game',
    resourceId: req.params.gameId,
    action: 'game.assignScorer',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const { userId, role } = req.body as { userId?: string; role?: string };
  if (!userId || !role) return void res.status(400).json({ error: 'userId and role required' });
  const assignment = await assignScorer(
    req.params.gameId,
    userId,
    role as 'official_scorer',
    authReq.user!.sub,
  );
  res.json({ assignment });
});

// DELETE /api/scoring/assignments/:assignmentId
scoringRouter.delete('/assignments/:assignmentId', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'System',
    resourceId: 'global',
    action: 'game.assignScorer',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  await revokeScorer(req.params.assignmentId, authReq.user!.sub);
  res.json({ ok: true });
});
