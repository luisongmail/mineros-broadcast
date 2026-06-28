import type { Envelope } from '@playflow/core';

import {
  IC003_SCHEMA_VERSION,
  OVERLAY_SERVER_SOURCE,
  OVERLAY_SERVER_TARGET,
  buildOverlayApiBaseUrl,
  buildOverlaySnapshot,
  isRecord,
  type OverlayCommandEnvelope,
  type OverlayCommandPayload,
  type OverlayConflictState,
  type OverlayErrorDetails,
  type OverlayResponseEnvelope,
  type OverlaySnapshotPayload,
  type OverlayTarget,
} from '../types/overlay';

interface OverlayRequestOptions {
  accessToken?: string | null;
  expectedRevision?: number;
  operatorId: string;
  overridePolicy?: string;
  payloadRef?: string;
  priority?: number;
  reason?: string;
  role?: string;
}

interface PreviewOverlayOptions extends OverlayRequestOptions {
  holdSeconds?: number;
}

interface HideOverlayOptions extends OverlayRequestOptions {
  target?: OverlayTarget;
}

interface ForceShowOptions extends PreviewOverlayOptions {}

export interface OverlayServerErrorSnapshot {
  conflicts: OverlayConflictState[];
  occupyingOverlayId: string | null;
  snapshot: OverlaySnapshotPayload | null;
  zoneId: string | null;
}

export class OverlayServerClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly serverSnapshot: OverlayServerErrorSnapshot;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    serverSnapshot: OverlayServerErrorSnapshot;
  }) {
    super(params.message);
    this.name = 'OverlayServerClientError';
    this.code = params.code;
    this.status = params.status;
    this.serverSnapshot = params.serverSnapshot;
  }
}

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEnvelope(payload: OverlayCommandPayload): OverlayCommandEnvelope {
  const correlationId = createCorrelationId();

  return {
    schemaVersion: IC003_SCHEMA_VERSION,
    messageType: 'command',
    correlationId,
    requestId: correlationId,
    source: OVERLAY_SERVER_SOURCE,
    target: OVERLAY_SERVER_TARGET,
    timestamp: new Date().toISOString(),
    payload,
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function normalizeSnapshot(body: unknown): OverlaySnapshotPayload | null {
  if (!isRecord(body)) {
    return null;
  }

  if (body.messageType === 'snapshot' && isRecord(body.payload)) {
    return buildOverlaySnapshot(body.payload);
  }

  if (body.messageType === 'response' && isRecord(body.payload)) {
    return buildOverlaySnapshot({
      revision: body.payload.revision as number | undefined,
      previewState: body.payload.previewState as OverlaySnapshotPayload['previewState'],
      programState: body.payload.programState as OverlaySnapshotPayload['programState'],
      conflicts: body.payload.conflicts as OverlaySnapshotPayload['conflicts'],
      latencyMs: body.payload.latencyMs as number | undefined,
      locks: body.payload.locks as OverlaySnapshotPayload['locks'],
    });
  }

  if (isRecord(body.currentSnapshot)) {
    return buildOverlaySnapshot(body.currentSnapshot);
  }

  if (typeof body.revision === 'number') {
    return buildOverlaySnapshot({
      revision: body.revision,
      previewState: body.previewState as OverlaySnapshotPayload['previewState'],
      programState: body.programState as OverlaySnapshotPayload['programState'],
      conflicts: body.conflicts as OverlaySnapshotPayload['conflicts'],
      latencyMs: body.latencyMs as number | undefined,
      locks: body.locks as OverlaySnapshotPayload['locks'],
    });
  }

  return null;
}

function normalizeErrorBody(body: unknown, status: number): OverlayServerClientError {
  const defaultCode = status === 423
    ? 'LOCKED_RESOURCE'
    : status === 403
      ? 'UNAUTHORIZED'
      : status === 409
        ? 'CONFLICT'
        : 'UNKNOWN_ERROR';

  const envelopePayload = isRecord(body) && body.messageType === 'error' && isRecord(body.payload)
    ? body.payload
    : null;

  const legacyPayload = isRecord(body) && isRecord(body.error) ? body.error : null;
  const payload = envelopePayload ?? legacyPayload;
  const details = (payload?.details ?? null) as OverlayErrorDetails | null;
  const snapshot = normalizeSnapshot(details?.currentSnapshot ?? body);
  const conflicts = details?.conflicts ?? snapshot?.conflicts ?? [];
  const occupyingOverlayId = details?.occupyingOverlayId
    ?? conflicts[0]?.occupyingOverlayId
    ?? conflicts[0]?.overlayId
    ?? null;
  const zoneId = details?.zoneId ?? conflicts[0]?.zoneId ?? null;

  return new OverlayServerClientError({
    code: typeof payload?.code === 'string' ? payload.code : defaultCode,
    message: typeof payload?.message === 'string'
      ? payload.message
      : 'No fue posible completar la acción contra Overlay Server.',
    status,
    serverSnapshot: {
      snapshot,
      conflicts,
      occupyingOverlayId,
      zoneId,
    },
  });
}

function isResponseEnvelope(body: unknown): body is OverlayResponseEnvelope {
  return isRecord(body)
    && body.messageType === 'response'
    && typeof body.schemaVersion === 'string'
    && typeof body.correlationId === 'string'
    && typeof body.source === 'string'
    && typeof body.target === 'string'
    && typeof body.timestamp === 'string'
    && isRecord(body.payload)
    && typeof body.payload.revision === 'number';
}

function buildFallbackResponseEnvelope(
  body: Record<string, unknown>,
  requestEnvelope: OverlayCommandEnvelope,
): OverlayResponseEnvelope {
  return {
    schemaVersion: IC003_SCHEMA_VERSION,
    messageType: 'response',
    correlationId: requestEnvelope.correlationId,
    requestId: requestEnvelope.requestId,
    source: OVERLAY_SERVER_TARGET,
    target: OVERLAY_SERVER_SOURCE,
    timestamp: new Date().toISOString(),
    payload: {
      accepted: body.accepted === true,
      revision: body.revision as number,
      previewState: (body.previewState as OverlaySnapshotPayload['previewState']) ?? null,
      programState: (body.programState as OverlaySnapshotPayload['programState']) ?? null,
      auditId: typeof body.auditId === 'string' ? body.auditId : undefined,
      latencyMs: typeof body.latencyMs === 'number' ? body.latencyMs : undefined,
      locks: body.locks as OverlaySnapshotPayload['locks'] | undefined,
      conflicts: body.conflicts as OverlaySnapshotPayload['conflicts'] | undefined,
    },
  };
}

async function postControlAction(path: string, payload: OverlayCommandPayload, accessToken?: string | null): Promise<OverlayResponseEnvelope> {
  const envelope = createEnvelope(payload);
  const response = await fetch(`${buildOverlayApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(envelope satisfies Envelope<OverlayCommandPayload>),
  });

  const body = await parseJson(response);

  if (!response.ok) {
    throw normalizeErrorBody(body, response.status);
  }

  if (isResponseEnvelope(body)) {
    return body;
  }

  if (isRecord(body) && typeof body.revision === 'number') {
    return buildFallbackResponseEnvelope(body, envelope);
  }

  throw new OverlayServerClientError({
    code: 'INVALID_RESPONSE',
    message: 'Overlay Server respondió sin envelope IC-003 válido.',
    status: response.status,
    serverSnapshot: {
      snapshot: normalizeSnapshot(body),
      conflicts: [],
      occupyingOverlayId: null,
      zoneId: null,
    },
  });
}

export async function previewOverlay(
  overlayId: string,
  zoneId: string,
  options: PreviewOverlayOptions,
): Promise<OverlayResponseEnvelope> {
  return postControlAction('/actions/preview-overlay', {
    action: 'preview_overlay',
    overlayId,
    zoneId,
    operatorId: options.operatorId,
    role: options.role,
    expectedRevision: options.expectedRevision,
    priority: options.priority,
    holdSeconds: options.holdSeconds,
    payloadRef: options.payloadRef,
    reason: options.reason ?? 'preview_manual',
    targetState: 'preview',
  }, options.accessToken);
}

export async function takeOverlay(
  overlayId: string,
  options: OverlayRequestOptions,
): Promise<OverlayResponseEnvelope> {
  return postControlAction('/actions/take-overlay', {
    action: 'take_overlay',
    overlayId,
    operatorId: options.operatorId,
    role: options.role,
    expectedRevision: options.expectedRevision,
    reason: options.reason ?? 'take_manual',
    targetState: 'program',
  }, options.accessToken);
}

export async function hideOverlay(
  overlayId: string,
  options: HideOverlayOptions,
): Promise<OverlayResponseEnvelope> {
  return postControlAction('/actions/hide-overlay', {
    action: 'hide_overlay',
    overlayId,
    operatorId: options.operatorId,
    role: options.role,
    target: options.target ?? 'auto',
    expectedRevision: options.expectedRevision,
    reason: options.reason ?? 'hide_manual',
  }, options.accessToken);
}

export async function hideAll(options: OverlayRequestOptions): Promise<OverlayResponseEnvelope> {
  return postControlAction('/actions/hide-all', {
    action: 'hide_all',
    operatorId: options.operatorId,
    role: options.role,
    expectedRevision: options.expectedRevision,
    reason: options.reason ?? 'hide_all_manual',
    scope: 'non_persistent',
  }, options.accessToken);
}

export async function clearPreview(options: OverlayRequestOptions): Promise<OverlayResponseEnvelope> {
  return postControlAction('/actions/clear-preview', {
    action: 'clear_preview',
    operatorId: options.operatorId,
    role: options.role,
    expectedRevision: options.expectedRevision,
    reason: options.reason ?? 'clear_preview_manual',
    target: 'preview',
  }, options.accessToken);
}

export async function forceShow(
  overlayId: string,
  zoneId: string,
  options: ForceShowOptions,
): Promise<OverlayResponseEnvelope> {
  return postControlAction('/actions/force-show', {
    action: 'force_show',
    overlayId,
    zoneId,
    operatorId: options.operatorId,
    role: options.role,
    expectedRevision: options.expectedRevision,
    priority: options.priority,
    holdSeconds: options.holdSeconds,
    payloadRef: options.payloadRef,
    reason: options.reason ?? 'force_show_manual',
    overridePolicy: options.overridePolicy ?? 'manual_override',
    targetState: 'program',
  }, options.accessToken);
}
