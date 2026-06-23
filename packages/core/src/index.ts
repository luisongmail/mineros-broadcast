/**
 * @mineros/core
 * Contratos de integración, tipos compartidos y utilidades
 * Ref: 09-integration-contracts.md
 */

// ─── Envelope estándar (IC-003) ─────────────────────────────────────────────

export type MessageType = 'command' | 'event' | 'query' | 'response' | 'snapshot' | 'error';

export interface Envelope<T = unknown> {
  schemaVersion: string;
  messageType: MessageType;
  correlationId: string;
  requestId?: string;
  eventId?: string;
  source: string;
  target: string;
  timestamp: string; // ISO 8601
  payload: T;
}

// ─── Códigos de error estándar (IC-006) ─────────────────────────────────────

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'LOCKED_RESOURCE'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'UNSUPPORTED_EVENT'
  | 'ASSET_NOT_APPROVED'
  | 'SCENE_NOT_AVAILABLE';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// ─── Estado del partido (GE-003) ────────────────────────────────────────────

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

export interface BasesState {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface CountState {
  balls: number;
  strikes: number;
}

export interface ScoreState {
  home: number;
  away: number;
}

export interface TeamState {
  id: string;
  name: string;
  shortName: string;
  logoAssetId: string;
  role: 'home' | 'away';
}

export interface LineupEntry {
  order: number;
  playerId: string;
  name: string;
  number: string;
  position: string;
  status: 'active' | 'substituted';
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  homeTeam: TeamState;
  awayTeam: TeamState;
  inning: number;
  inningHalf: InningHalf;
  outs: number; // 0..2
  bases: BasesState;
  count: CountState;
  score: ScoreState;
  currentBatterId: string | null;
  currentPitcherId: string | null;
  lineup: {
    home: LineupEntry[];
    away: LineupEntry[];
  };
  eventLog: GameEvent[];
}

// ─── Eventos del Game Engine (GE-015) ───────────────────────────────────────

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

export interface GameEvent {
  eventId: string;
  eventType: GameEventType;
  gameId: string;
  timestamp: string;
  source: 'GameEngine';
  payload: Record<string, unknown>;
}

// ─── Asset Manager (AM-008) ──────────────────────────────────────────────────

export type AssetType =
  | 'logo'
  | 'player_photo'
  | 'sponsor_asset'
  | 'background'
  | 'icon'
  | 'template'
  | 'lower_third'
  | 'broadcast_graphic';

export type AssetStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'archived' | 'expired';

export interface AssetMetadata {
  assetId: string;
  name: string;
  type: AssetType;
  owner: string;
  brand: string;
  status: AssetStatus;
  usage: string[];
  file: string;
  format: 'png' | 'svg' | 'jpg' | 'webp' | 'json';
  protected: boolean;
  checksum: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Overlay Manager (OM-004, OM-005) ────────────────────────────────────────

export type OverlayState = 'hidden' | 'preview' | 'live' | 'transitioning' | 'error';

export type OverlayId =
  | 'scorebug'
  | 'batter'
  | 'pitcher'
  | 'lineup'
  | 'next_batters'
  | 'substitution'
  | 'game_event'
  | 'inning_transition'
  | 'final_score'
  | 'sponsor_break'
  | 'announcement'
  | 'social_lower_third'
  | 'countdown';

export interface OverlayRenderContract {
  overlayId: OverlayId;
  zoneId: string;
  state: OverlayState;
  data: Record<string, unknown>;
  assets: string[];
  designTokens: Record<string, unknown>;
  animation: {
    in: string;
    out: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function createEnvelope<T>(
  messageType: MessageType,
  source: string,
  target: string,
  payload: T,
  correlationId?: string,
): Envelope<T> {
  return {
    schemaVersion: '1.0.0',
    messageType,
    correlationId: correlationId ?? `corr-${Date.now()}`,
    source,
    target,
    timestamp: new Date().toISOString(),
    payload,
  };
}

export function createErrorEnvelope(
  source: string,
  target: string,
  code: ErrorCode,
  message: string,
): Envelope<ErrorPayload> {
  return createEnvelope<ErrorPayload>('error', source, target, { code, message });
}
