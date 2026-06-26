import type { MessageType as CoreMessageType } from '@mineros/core';

export type GameStatus =
  | 'scheduled'
  | 'pre_game'
  | 'live'
  | 'paused'
  | 'between_innings'
  | 'final'
  | 'cancelled'
  | 'suspended';

export type InningHalf = 'top' | 'bottom';
export type MessageType = CoreMessageType;
export type TeamRole = 'home' | 'away';
export type LineupStatus = 'active' | 'substituted' | 'ejected';
export type GameEventType =
  | 'game_started'
  | 'game_paused'
  | 'game_resumed'
  | 'game_finalized'
  | 'inning_started'
  | 'inning_ended'
  | 'batter_changed'
  | 'pitcher_changed'
  | 'run_scored'
  | 'home_run'
  | 'bases_changed'
  | 'outs_changed'
  | 'count_changed'
  | 'score_corrected'
  | 'lineup_changed';

export interface GameTeam {
  id: string;
  name: string;
  shortName: string;
  logoAssetId: string;
  role: TeamRole;
}

export interface GameScore {
  home: number;
  away: number;
}

export interface GameBases {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface GameCount {
  balls: number;
  strikes: number;
}

export interface LineupEntry {
  order: number;
  playerId: string;
  name: string;
  number: string;
  position: string;
  status: LineupStatus;
  photoAssetId?: string;
}

export interface GameLineup {
  home: LineupEntry[];
  away: LineupEntry[];
}

export interface GameEvent {
  eventId: string;
  eventType: GameEventType;
  gameId: string;
  timestamp: string;
  source: 'GameEngine';
  payload: Record<string, unknown>;
}

export interface AuditEntry {
  auditId: string;
  timestamp: string;
  operatorId: string;
  command: string;
  reason?: string;
  previousState: Record<string, unknown>;
  newState: Record<string, unknown>;
}

export interface MercyRuleThreshold {
  afterInning: number;
  runDiff: number;
}

export interface ExtraInningsRule {
  type: 'standard' | 'runner_on_second' | 'b5_escalating';
  starterBase?: 'second' | 'third';
}

export interface GameRules {
  inningsCount: number;
  maxOuts: number;
  maxBalls: number | null;
  maxStrikes: number;
  batterAttempts: number | null;
  hasPitcher: boolean;
  timeLimitMinutes: number | null;
  mercyRule: MercyRuleThreshold[];
  extraInnings: ExtraInningsRule;
  continuousBatting: boolean;
  buntsAllowed: boolean;
  dpFlexAllowed: boolean;
  pitchClockSeconds: number | null;
}

export const DEFAULT_BASEBALL_RULES: GameRules = {
  inningsCount: 9,
  maxOuts: 3,
  maxBalls: 4,
  maxStrikes: 3,
  batterAttempts: null,
  hasPitcher: true,
  timeLimitMinutes: null,
  mercyRule: [],
  extraInnings: { type: 'standard' },
  continuousBatting: false,
  buntsAllowed: true,
  dpFlexAllowed: false,
  pitchClockSeconds: null,
};

export const SOFTBALL_FAST_RULES: GameRules = {
  inningsCount: 7,
  maxOuts: 3,
  maxBalls: 4,
  maxStrikes: 3,
  batterAttempts: null,
  hasPitcher: true,
  timeLimitMinutes: null,
  mercyRule: [{ afterInning: 5, runDiff: 10 }],
  extraInnings: { type: 'runner_on_second' },
  continuousBatting: false,
  buntsAllowed: true,
  dpFlexAllowed: true,
  pitchClockSeconds: null,
};

export const SOFTBALL_SLOW_RULES: GameRules = {
  inningsCount: 7,
  maxOuts: 3,
  maxBalls: 4,
  maxStrikes: 3,
  batterAttempts: null,
  hasPitcher: true,
  timeLimitMinutes: null,
  mercyRule: [{ afterInning: 5, runDiff: 10 }],
  extraInnings: { type: 'runner_on_second' },
  continuousBatting: true,
  buntsAllowed: false,
  dpFlexAllowed: false,
  pitchClockSeconds: null,
};

export const BASEBALL5_RULES: GameRules = {
  inningsCount: 5,
  maxOuts: 3,
  maxBalls: null,
  maxStrikes: 3,
  batterAttempts: 1,
  hasPitcher: false,
  timeLimitMinutes: null,
  mercyRule: [{ afterInning: 3, runDiff: 10 }],
  extraInnings: { type: 'b5_escalating' },
  continuousBatting: true,
  buntsAllowed: false,
  dpFlexAllowed: false,
  pitchClockSeconds: null,
};

export interface GameState {
  gameId: string;
  status: GameStatus;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  inning: number;
  inningHalf: InningHalf;
  outs: number;
  bases: GameBases;
  count: GameCount;
  score: GameScore;
  rules: GameRules;
  currentBatterId?: string;
  currentPitcherId?: string;
  lineup: GameLineup;
  eventLog: GameEvent[];
  auditLog: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}
