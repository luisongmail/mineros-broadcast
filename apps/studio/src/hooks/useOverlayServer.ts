import { useEffect, useMemo, useReducer, useRef } from 'react';

import {
  buildOverlaySnapshot,
  buildOverlayWsUrl,
  isRecord,
  type OverlayConnectionStatus,
  type OverlayResponseEnvelope,
  type OverlaySnapshotEnvelope,
  type OverlaySnapshotPayload,
} from '../types/overlay';

interface OverlayServerState {
  connectionStatus: OverlayConnectionStatus;
  latencyMs: number;
  previewState: OverlaySnapshotPayload['previewState'];
  programState: OverlaySnapshotPayload['programState'];
  revision: number;
  snapshot: OverlaySnapshotPayload | null;
}

export type OverlayServerDispatchAction =
  | { type: 'connection-status'; status: OverlayConnectionStatus }
  | { type: 'snapshot-received'; snapshot: OverlaySnapshotPayload }
  | { type: 'sync-from-response'; snapshot: OverlaySnapshotPayload };

interface UseOverlayServerResult extends OverlayServerState {
  dispatch: React.Dispatch<OverlayServerDispatchAction>;
}

const INITIAL_STATE: OverlayServerState = {
  connectionStatus: 'connecting',
  latencyMs: 0,
  previewState: null,
  programState: null,
  revision: 0,
  snapshot: null,
};

function reducer(state: OverlayServerState, action: OverlayServerDispatchAction): OverlayServerState {
  switch (action.type) {
    case 'connection-status':
      return {
        ...state,
        connectionStatus: action.status,
      };
    case 'snapshot-received':
    case 'sync-from-response':
      if (action.snapshot.revision < state.revision) {
        return state;
      }

      return {
        connectionStatus: action.snapshot.connectionStatus ?? state.connectionStatus,
        latencyMs: action.snapshot.latencyMs,
        previewState: action.snapshot.previewState,
        programState: action.snapshot.programState,
        revision: action.snapshot.revision,
        snapshot: action.snapshot,
      };
    default:
      return state;
  }
}

function extractSnapshot(message: unknown): OverlaySnapshotPayload | null {
  if (!isRecord(message)) {
    return null;
  }

  if (message.messageType === 'snapshot' && isRecord(message.payload)) {
    return buildOverlaySnapshot(message.payload);
  }

  if (message.messageType === 'response' && isRecord(message.payload)) {
    return buildOverlaySnapshot({
      revision: message.payload.revision as number | undefined,
      previewState: message.payload.previewState as OverlaySnapshotPayload['previewState'],
      programState: message.payload.programState as OverlaySnapshotPayload['programState'],
      conflicts: message.payload.conflicts as OverlaySnapshotPayload['conflicts'],
      latencyMs: message.payload.latencyMs as number | undefined,
      locks: message.payload.locks as OverlaySnapshotPayload['locks'],
    });
  }

  if (message.messageType === 'error' && isRecord(message.payload)) {
    const details = isRecord(message.payload.details) ? message.payload.details : null;
    if (details && isRecord(details.currentSnapshot)) {
      return buildOverlaySnapshot(details.currentSnapshot);
    }
  }

  return null;
}

export function useOverlayServer(): UseOverlayServerResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const wsUrl = useMemo(() => buildOverlayWsUrl(), []);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);

  useEffect(() => {
    let active = true;

    const connect = () => {
      if (!active) {
        return;
      }

      if (typeof WebSocket === 'undefined') {
        console.warn('[overlay-server] WebSocket no disponible en este entorno.');
        dispatch({ type: 'connection-status', status: 'disconnected' });
        return;
      }

      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        return;
      }

      dispatch({ type: 'connection-status', status: 'connecting' });

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!active) {
          return;
        }

        reconnectDelayRef.current = 1000;
        dispatch({ type: 'connection-status', status: 'connected' });
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as OverlaySnapshotEnvelope | OverlayResponseEnvelope | unknown;
          const snapshot = extractSnapshot(parsed);

          if (snapshot) {
            dispatch({ type: 'snapshot-received', snapshot: { ...snapshot, connectionStatus: 'connected' } });
          }
        } catch {
          console.warn('[overlay-server] Mensaje WS inválido ignorado.');
        }
      };

      socket.onerror = () => {
        if (!active) {
          return;
        }

        dispatch({ type: 'connection-status', status: 'error' });
        socket.close();
      };

      socket.onclose = () => {
        if (!active) {
          return;
        }

        dispatch({ type: 'connection-status', status: 'disconnected' });
        const delay = Math.min(reconnectDelayRef.current, 30_000);
        reconnectDelayRef.current = delay * 2;
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [wsUrl]);

  return {
    ...state,
    dispatch,
  };
}
