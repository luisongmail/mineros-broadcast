import { describe, it, expect, vi } from 'vitest';

vi.mock('../db', () => ({ pool: null }));

describe('scoringAssignmentService — sin DB', () => {
  it('assignScorer devuelve objeto dummy sin pool', async () => {
    const { assignScorer } = await import('./scoringAssignmentService');
    const result = await assignScorer('game_1', 'usr_1', 'official_scorer', 'actor_1');
    expect(result.assignmentId).toMatch(/^sa_dev_/);
    expect(result.role).toBe('official_scorer');
    expect(result.status).toBe('active');
  });

  it('getGameScorers devuelve array vacío sin pool', async () => {
    const { getGameScorers } = await import('./scoringAssignmentService');
    const scorers = await getGameScorers('game_1');
    expect(scorers).toEqual([]);
  });

  it('canScore devuelve true en development sin pool', async () => {
    process.env.NODE_ENV = 'development';
    const { canScore } = await import('./scoringAssignmentService');
    const result = await canScore('usr_1', 'game_1');
    expect(result).toBe(true);
  });

  it('revokeScorer no lanza sin pool', async () => {
    const { revokeScorer } = await import('./scoringAssignmentService');
    await expect(revokeScorer('sa_1', 'actor_1')).resolves.toBeUndefined();
  });
});
