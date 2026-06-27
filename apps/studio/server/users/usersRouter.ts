import { Router } from 'express';
import type { AuthenticatedRequest } from '../auth/authMiddleware';
import { requireAuth } from '../auth/authMiddleware';
import { authorize } from '../authorization/authorizationService';
import { listUsers, getUserById, inviteUser, suspendUser, reactivateUser } from './userService';
import { assignRole, revokeRole, getUserRoles, getResourceMembers } from './roleAssignmentService';

export const usersRouter = Router();

// GET /api/users — solo SysAdmin puede listar todos los usuarios
usersRouter.get('/', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'System',
    resourceId: 'global' ,
    action: 'user.list',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const page = Number(req.query.page) || 1;
  const users = await listUsers(page, 50);
  res.json({ users });
});

// GET /api/users/:userId
usersRouter.get('/:userId', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'User',
    resourceId: req.params.userId ,
    action: 'user.view',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const user = await getUserById(req.params.userId);
  if (!user) return void res.status(404).json({ error: 'not_found' });
  res.json({ user });
});

// POST /api/users/invite
usersRouter.post('/invite', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'System',
    resourceId: 'global' ,
    action: 'user.invite',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const { email } = req.body as { email?: string };
  if (!email) return void res.status(400).json({ error: 'email_required' });
  const result = await inviteUser(email, authReq.user!.sub);
  res.json({ userId: result.userId });
});

// POST /api/users/:userId/suspend
usersRouter.post('/:userId/suspend', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'User',
    resourceId: req.params.userId ,
    action: 'user.suspend',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  if (check.requiresStepUp && authReq.user!.authLevel !== 'step_up') {
    return void res.status(403).json({ error: 'step_up_required', hint: 'POST /api/security/step-up/request' });
  }
  const { reason = '' } = req.body as { reason?: string };
  await suspendUser(req.params.userId, authReq.user!.sub, reason);
  res.json({ ok: true });
});

// POST /api/users/:userId/reactivate
usersRouter.post('/:userId/reactivate', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'User',
    resourceId: req.params.userId ,
    action: 'user.suspend',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  await reactivateUser(req.params.userId, authReq.user!.sub);
  res.json({ ok: true });
});

// GET /api/users/:userId/roles
usersRouter.get('/:userId/roles', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'User',
    resourceId: req.params.userId ,
    action: 'user.view',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const roles = await getUserRoles(req.params.userId);
  res.json({ roles });
});

// POST /api/users/:userId/roles
usersRouter.post('/:userId/roles', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { resourceType, resourceId, role } = req.body as {
    resourceType?: string;
    resourceId?: string;
    role?: string;
  };
  if (!resourceType || !resourceId || !role) {
    return void res.status(400).json({ error: 'resourceType, resourceId, role required' });
  }
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType,
    resourceId,
    action: 'role.assign',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const assignment = await assignRole(
    req.params.userId,
    resourceType as 'Tournament',
    resourceId,
    role as 'Owner',
    authReq.user!.sub,
  );
  res.json({ assignment });
});

// DELETE /api/users/roles/:assignmentId
usersRouter.delete('/roles/:assignmentId', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: 'System',
    resourceId: 'global',
    action: 'role.revoke',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  await revokeRole(req.params.assignmentId, authReq.user!.sub);
  res.json({ ok: true });
});

// GET /api/users/resource/:resourceType/:resourceId/members
usersRouter.get('/resource/:resourceType/:resourceId/members', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const check = await authorize({
    userId: authReq.user!.sub,
    sessionId: authReq.user!.sid,
    authLevel: authReq.user!.authLevel,
    resourceType: req.params.resourceType,
    resourceId: req.params.resourceId,
    action: 'user.view',
  });
  if (check.decision !== 'allow') return void res.status(403).json({ error: 'forbidden' });
  const members = await getResourceMembers(
    req.params.resourceType as 'Tournament',
    req.params.resourceId,
  );
  res.json({ members });
});
