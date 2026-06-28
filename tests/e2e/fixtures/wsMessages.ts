export type MockOverlayId = 'scorebug' | 'game_event' | 'batter' | 'announcement';
export type MockConnectionStatus = 'connected' | 'disconnected';

export type SnapshotState = {
  revision: number;
  previewOverlayId: MockOverlayId | null;
  programOverlayId: MockOverlayId;
  latencyMs: number;
  connectionStatus: MockConnectionStatus;
  conflicts: Array<{
    overlayId: MockOverlayId;
    zoneId: string;
    code?: string;
    message: string;
  }>;
};

export function createSnapshotEnvelope(state: SnapshotState) {
  return {
    schemaVersion: '1.0.0',
    messageType: 'snapshot',
    correlationId: `corr-snapshot-${state.revision}`,
    source: 'OverlayServer',
    target: 'OverlayClients',
    timestamp: new Date().toISOString(),
    payload: {
      revision: state.revision,
      previewState: state.previewOverlayId
        ? {
            overlayId: state.previewOverlayId,
            zoneId: getZoneId(state.previewOverlayId),
            state: 'preview' as const,
          }
        : null,
      programState: {
        overlayId: state.programOverlayId,
        zoneId: getZoneId(state.programOverlayId),
        state: 'live' as const,
      },
      locks: {
        zones: [getZoneId(state.programOverlayId)],
        scorebugLocked: true,
      },
      conflicts: state.conflicts,
      latencyMs: state.latencyMs,
      connectionStatus: state.connectionStatus,
    },
  };
}

export function createConflictResponse(state: SnapshotState) {
  return {
    schemaVersion: '1.0.0',
    messageType: 'error',
    correlationId: `corr-error-${state.revision}`,
    source: 'OverlayServer',
    target: 'OperatorControlPanel',
    timestamp: new Date().toISOString(),
    payload: {
      code: 'CONFLICT',
      message: 'Error 409 — conflicto de zona con Scorebug en Program.',
      details: {
        currentSnapshot: createSnapshotEnvelope(state).payload,
        conflicts: state.conflicts,
        zoneId: state.conflicts[0]?.zoneId ?? 'A',
        occupyingOverlayId: state.programOverlayId,
      },
    },
  };
}

export function createResponseEnvelope(state: SnapshotState) {
  return {
    schemaVersion: '1.0.0',
    messageType: 'response',
    correlationId: `corr-response-${state.revision}`,
    requestId: `req-response-${state.revision}`,
    source: 'OverlayServer',
    target: 'OperatorControlPanel',
    timestamp: new Date().toISOString(),
    payload: {
      accepted: true,
      revision: state.revision,
      previewState: createSnapshotEnvelope(state).payload.previewState,
      programState: createSnapshotEnvelope(state).payload.programState,
      latencyMs: state.latencyMs,
      locks: createSnapshotEnvelope(state).payload.locks,
      conflicts: state.conflicts,
    },
  };
}

export function getZoneId(overlayId: MockOverlayId): string {
  if (overlayId === 'scorebug' || overlayId === 'game_event') {
    return 'A';
  }

  if (overlayId === 'batter') {
    return 'B';
  }

  return 'E';
}
