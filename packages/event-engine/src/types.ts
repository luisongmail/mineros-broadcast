import type { GameEvent as ImportedGameEvent } from '@playflow/game-engine';

export type GameEvent = ImportedGameEvent;

export const SUPPORTED_EVENT_TYPES = [
  'batter_changed',
  'pitcher_changed',
  'inning_started',
  'inning_ended',
  'home_run',
] as const;

export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];

export type EventAction =
  | 'showOverlay'
  | 'hideOverlay'
  | 'requestScene'
  | 'requestSponsor'
  | 'updateTicker'
  | 'noAction';

export type EventMode = 'preview' | 'program' | 'silent' | 'blocked';

export interface OverlayRequest {
  requestId: string;
  source: 'EventEngine';
  eventId: string;
  action: 'showOverlay' | 'hideOverlay';
  overlay: string;
  preferredZone?: string;
  mode: EventMode;
  priority: number;
  payload?: Record<string, unknown>;
}

export interface SceneRequest {
  requestId: string;
  source: 'EventEngine';
  eventId: string;
  action: 'requestScene';
  sceneId: string;
  mode: EventMode;
  priority: number;
}

export interface SponsorRequest {
  requestId: string;
  source: 'EventEngine';
  eventId: string;
  action: 'requestSponsor';
  placement: string;
  preferredZone?: string;
  mode: EventMode;
  context?: Record<string, unknown>;
}

export interface EventAudit {
  auditId: string;
  eventId: string;
  eventType: string;
  receivedAt: string;
  processedAt: string;
  result: 'request_sent' | 'no_action' | 'rejected';
  target?: string;
  action?: EventAction;
  mode?: EventMode;
  rejectionReason?: string;
}

export type EventEngineRequest = OverlayRequest | SceneRequest | SponsorRequest;

export interface EventEngineOutput {
  eventId: string;
  eventType: string;
  requests: EventEngineRequest[];
  audit: EventAudit;
}

export type EventEngineListener = (requests: EventEngineOutput) => void;
