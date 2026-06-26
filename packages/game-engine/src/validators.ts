import type { GameBases, GameCount, GameLineup, GameScore, GameTeam, TeamRole } from './types';

function assertCondition(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function validateNonNegativeInteger(value: number, fieldName: string): void {
  assertCondition(Number.isInteger(value), `${fieldName} must be an integer`);
  assertCondition(value >= 0, `${fieldName} cannot be negative`);
}

function validateRequiredString(value: string, fieldName: string): void {
  assertCondition(value.trim().length > 0, `${fieldName} is required`);
}

export function validateTeam(team: GameTeam, expectedRole: TeamRole): void {
  validateRequiredString(team.id, 'team.id');
  validateRequiredString(team.name, 'team.name');
  validateRequiredString(team.shortName, 'team.shortName');
  validateRequiredString(team.logoAssetId, 'team.logoAssetId');
  assertCondition(team.role === expectedRole, `team.role must be ${expectedRole}`);
}

export function validateScore(score: Partial<GameScore>): void {
  if (score.home !== undefined) {
    validateNonNegativeInteger(score.home, 'score.home');
  }

  if (score.away !== undefined) {
    validateNonNegativeInteger(score.away, 'score.away');
  }
}

export function validateOuts(outs: number): void {
  assertCondition(Number.isInteger(outs), 'outs must be an integer');
  assertCondition(outs >= 0, 'outs cannot be negative');
  assertCondition(outs <= 2, 'outs cannot be greater than 2 in persisted state');
}

export function validateBases(bases: Partial<GameBases>): void {
  for (const key of ['first', 'second', 'third'] as const) {
    const val = bases[key];
    if (val !== undefined) {
      assertCondition(
        val === null || (typeof val === 'object' && typeof val.id === 'string'),
        `bases.${key} must be null or a RunnerOnBase object`,
      );
    }
  }
}

export function validateCount(count: Partial<GameCount>): void {
  if (count.balls !== undefined) {
    validateNonNegativeInteger(count.balls, 'count.balls');
  }

  if (count.strikes !== undefined) {
    validateNonNegativeInteger(count.strikes, 'count.strikes');
  }
}

export function validateIdentifier(value: string, fieldName: string): void {
  validateRequiredString(value, fieldName);
}

export function validateLineup(lineup: GameLineup): void {
  const validateEntries = (entries: GameLineup['home'], side: 'home' | 'away') => {
    const seenOrders = new Set<number>();

    for (const entry of entries) {
      validateNonNegativeInteger(entry.order, `${side}.lineup.order`);
      assertCondition(entry.order > 0, `${side}.lineup.order must be greater than 0`);
      validateRequiredString(entry.playerId, `${side}.lineup.playerId`);
      validateRequiredString(entry.name, `${side}.lineup.name`);
      validateRequiredString(entry.number, `${side}.lineup.number`);
      validateRequiredString(entry.position, `${side}.lineup.position`);
      assertCondition(
        ['active', 'substituted', 'ejected'].includes(entry.status),
        `${side}.lineup.status must be active, substituted or ejected`,
      );
      assertCondition(!seenOrders.has(entry.order), `${side}.lineup.order must be unique`);
      seenOrders.add(entry.order);
    }
  };

  validateEntries(lineup.home, 'home');
  validateEntries(lineup.away, 'away');
}
