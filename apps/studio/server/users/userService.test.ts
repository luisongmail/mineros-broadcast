import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({ pool: null }));

describe('userService — sin DB', () => {
  it('listUsers devuelve array vacío sin pool', async () => {
    const { listUsers } = await import('./userService');
    const users = await listUsers();
    expect(users).toEqual([]);
  });

  it('getUserById devuelve null sin pool', async () => {
    const { getUserById } = await import('./userService');
    const user = await getUserById('usr_1');
    expect(user).toBeNull();
  });

  it('inviteUser devuelve userId dummy sin pool', async () => {
    const { inviteUser } = await import('./userService');
    const result = await inviteUser('test@example.com', 'actor_1');
    expect(result.userId).toMatch(/^usr_dev_/);
  });

  it('suspendUser no lanza sin pool', async () => {
    const { suspendUser } = await import('./userService');
    await expect(suspendUser('usr_1', 'actor_1', 'test')).resolves.toBeUndefined();
  });
});

describe('roleAssignmentService — sin DB', () => {
  it('getUserRoles devuelve array vacío sin pool', async () => {
    const { getUserRoles } = await import('./roleAssignmentService');
    const roles = await getUserRoles('usr_1');
    expect(roles).toEqual([]);
  });

  it('assignRole devuelve objeto dummy sin pool', async () => {
    const { assignRole } = await import('./roleAssignmentService');
    const result = await assignRole('usr_1', 'Game', 'game_1', 'Admin', 'actor_1');
    expect(result.assignmentId).toMatch(/^ra_dev_/);
    expect(result.role).toBe('Admin');
  });

  it('revokeRole no lanza sin pool', async () => {
    const { revokeRole } = await import('./roleAssignmentService');
    await expect(revokeRole('ra_1', 'actor_1')).resolves.toBeUndefined();
  });
});
