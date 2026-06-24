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
  currentBatterId?: string;
  currentPitcherId?: string;
  lineup: GameLineup;
  eventLog: GameEvent[];
  auditLog: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}
