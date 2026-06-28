import type { Envelope } from '@playflow/core';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface OtpRequestBody {
  email: string;
}

export interface OtpRequestResponse {
  message: string;
  expiresAt: string;
}

export interface OtpVerifyBody {
  email: string;
  code: string;
}

export interface OtpVerifyResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  sessionId: string;
}

export type OverlayTarget = 'preview' | 'program';
export type OverlayMessageTarget = 'OverlayServer' | 'OverlayClients' | 'OperatorControlPanel';
export type OverlayConnectionStatus = 'connected' | 'degraded';
export type OverlayOperatorRole = 'admin' | 'director' | 'operator' | 'revisor' | 'invitado';

export type OverlayOperatorAction =
  | 'preview_overlay'
  | 'take_overlay'
  | 'hide_overlay'
  | 'hide_all'
  | 'lock_scorebug'
  | 'force_show'
  | 'clear_preview'
  | 'reload_assets';

export interface OverlayActionPayload {
  action: OverlayOperatorAction;
  overlayId?: string;
  operatorId?: string;
  role?: OverlayOperatorRole;
  target?: OverlayTarget | 'auto';
  targetState?: OverlayTarget;
  fromState?: 'preview';
  zoneId?: string;
  priority?: number;
  holdSeconds?: number;
  payloadRef?: string;
  payload?: Record<string, unknown>;
  reason?: string;
  expectedRevision?: number;
}

export type OverlayActionEnvelope = Envelope<OverlayActionPayload>;

export interface OverlayStateRecord {
  overlayId: string;
  zoneId: string;
  state: OverlayTarget;
  revision: number;
  operatorId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
  payloadRef?: string;
  priority?: number;
  holdSeconds?: number;
  reason?: string;
  correlationId?: string;
}

export interface OverlayLockRecord {
  overlayId: string;
  lockedBy: string;
  lockedUntil: string;
  reason: string;
}

export interface OverlaySnapshotPayload {
  revision: number;
  previewState: OverlayStateRecord | null;
  programState: OverlayStateRecord | null;
  locks: {
    overlays: OverlayLockRecord[];
    zones: string[];
    scorebugLocked: boolean;
  };
  conflicts: string[];
  latencyMs: number;
  connectionStatus: OverlayConnectionStatus;
}

export type OverlaySnapshotEnvelope = Envelope<OverlaySnapshotPayload>;

export interface OverlayActionResponsePayload {
  accepted: boolean;
  revision: number;
  previewState: OverlayStateRecord | null;
  programState: OverlayStateRecord | null;
  auditId: string;
  actionId: string;
}

export type OverlayActionResponseEnvelope = Envelope<OverlayActionResponsePayload>;

export interface OverlayActionResult {
  actionId: string;
  auditId: string;
  snapshot: OverlaySnapshotEnvelope;
}

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  email: string;
  authLevel: 'otp';
  role?: OverlayOperatorRole;
  scope?: string[] | string;
}

export interface AuthorizedOverlayUser {
  userId: string;
  sessionId: string;
  email: string;
  authLevel: 'otp';
  role: OverlayOperatorRole;
  scope: string[];
}
