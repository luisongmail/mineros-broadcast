import type { Envelope, ErrorPayload } from '@playflow/core';

export const IC003_SCHEMA_VERSION = '1.0.0';
export const OVERLAY_SERVER_SOURCE = 'OperatorControlPanel';
export const OVERLAY_SERVER_TARGET = 'OverlayServer';

export type OverlayConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';
export type OverlayTarget = 'preview' | 'program' | 'auto';
export type OverlayRuntimeState = 'hidden' | 'preview' | 'program' | 'live' | 'transitioning' | 'error';
export type OverlayOperatorRole = 'admin' | 'director' | 'operator' | 'reviewer' | 'guest' | 'operador' | 'revisor' | 'invitado';

export type OverlayControlAction =
  | 'preview_overlay'
  | 'take_overlay'
  | 'hide_overlay'
  | 'hide_all'
  | 'lock_scorebug'
  | 'force_show'
  | 'clear_preview'
  | 'reload_assets';

export interface OverlayStageState {
  overlayId: string;
  zoneId: string;
  state: OverlayRuntimeState;
  priority?: number;
  holdSeconds?: number;
  payloadRef?: string;
}

export interface OverlayConflictState {
  zoneId?: string;
  overlayId?: string;
  occupyingOverlayId?: string;
  code?: string;
  message?: string;
}

export interface OverlayLocksState {
  zones: string[];
  scorebugLocked: boolean;
}

export interface OverlaySnapshotPayload {
  revision: number;
  previewState: OverlayStageState | null;
  programState: OverlayStageState | null;
  locks: OverlayLocksState;
  conflicts: OverlayConflictState[];
  latencyMs: number;
  connectionStatus?: OverlayConnectionStatus;
}

export interface OverlayResponsePayload {
  accepted: boolean;
  revision: number;
  previewState: OverlayStageState | null;
  programState: OverlayStageState | null;
  auditId?: string;
  latencyMs?: number;
  locks?: OverlayLocksState;
  conflicts?: OverlayConflictState[];
}

export interface OverlayCommandPayload {
  action: OverlayControlAction;
  overlayId?: string;
  operatorId: string;
  role?: string;
  zoneId?: string;
  target?: OverlayTarget;
  targetState?: OverlayTarget;
  expectedRevision?: number;
  priority?: number;
  holdSeconds?: number;
  payloadRef?: string;
  reason?: string;
  scope?: 'non_persistent';
  overridePolicy?: string;
}

export interface OverlayErrorDetails {
  revision?: number;
  previewState?: OverlayStageState | null;
  programState?: OverlayStageState | null;
  locks?: OverlayLocksState;
  conflicts?: OverlayConflictState[];
  currentSnapshot?: Partial<OverlaySnapshotPayload>;
  occupyingOverlayId?: string;
  zoneId?: string;
}

export type OverlaySnapshotEnvelope = Envelope<OverlaySnapshotPayload>;
export type OverlayResponseEnvelope = Envelope<OverlayResponsePayload>;
export type OverlayCommandEnvelope = Envelope<OverlayCommandPayload>;
export type OverlayErrorEnvelope = Envelope<ErrorPayload & { details?: OverlayErrorDetails }>;

export const UI_TO_CANONICAL_OVERLAY_ID: Record<string, string> = {
  scorebug: 'scorebug',
  batter: 'batter',
  pitcher: 'pitcher',
  lineup: 'lineup',
  'next-batters': 'next_batters',
  'inning-transition': 'inning_transition',
  'final-score': 'final_score',
  substitution: 'substitution',
  'game-event': 'game_event',
  announcement: 'announcement',
  'social-lower-third': 'social_lower_third',
  countdown: 'countdown',
  'sponsor-break': 'sponsor_break',
};

export const CANONICAL_TO_UI_OVERLAY_ID = Object.fromEntries(
  Object.entries(UI_TO_CANONICAL_OVERLAY_ID).map(([uiId, canonicalId]) => [canonicalId, uiId]),
) as Record<string, string>;

export const OVERLAY_DEFAULT_ZONE_ID: Record<string, string> = {
  scorebug: 'A',
  substitution: 'B',
  batter: 'B',
  lineup: 'B',
  next_batters: 'B',
  pitcher: 'C',
  game_event: 'D',
  final_score: 'D',
  inning_transition: 'D',
  countdown: 'D',
  sponsor_break: 'D',
  announcement: 'E',
  social_lower_third: 'E',
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function toCanonicalOverlayId(overlayId: string): string {
  return UI_TO_CANONICAL_OVERLAY_ID[overlayId] ?? overlayId;
}

export function toUiOverlayId(overlayId: string): string {
  return CANONICAL_TO_UI_OVERLAY_ID[overlayId] ?? overlayId;
}

export function getDefaultZoneIdForOverlay(overlayId: string): string {
  return OVERLAY_DEFAULT_ZONE_ID[toCanonicalOverlayId(overlayId)] ?? 'D';
}

export function canForceShowForRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'director';
}

export function buildOverlayApiBaseUrl(): string {
  const apiBase = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
  return `${apiBase.replace(/\/$/, '')}/v1/control`;
}

export function buildOverlayWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) {
    return configured.endsWith('/ws') ? configured : `${configured.replace(/\/$/, '')}/ws`;
  }

  if (import.meta.env.DEV) {
    return 'ws://localhost:3001/ws';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function buildOverlaySnapshot(payload: Partial<OverlaySnapshotPayload>): OverlaySnapshotPayload | null {
  if (typeof payload.revision !== 'number') {
    return null;
  }

  return {
    revision: payload.revision,
    previewState: payload.previewState ?? null,
    programState: payload.programState ?? null,
    locks: payload.locks ?? { zones: [], scorebugLocked: false },
    conflicts: payload.conflicts ?? [],
    latencyMs: typeof payload.latencyMs === 'number' ? payload.latencyMs : 0,
    connectionStatus: payload.connectionStatus,
  };
}
