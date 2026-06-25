import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '@mineros/game-engine';

interface UseBroadcastWSResult {
  gameState: GameState | null;
  connected: boolean;
  lastMessage: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function looksLikeGameState(value: unknown): value is GameState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.gameId === 'string' &&
    typeof value.status === 'string' &&
    isRecord(value.homeTeam) &&
    isRecord(value.awayTeam) &&
    typeof value.inning === 'number' &&
    isRecord(value.bases) &&
    isRecord(value.count) &&
    isRecord(value.score) &&
    isRecord(value.lineup)
  );
}

function extractGameState(message: unknown): GameState | null {
  if (!isRecord(message)) {
    return null;
  }

  if (message.type === 'state' && looksLikeGameState(message.payload)) {
    return message.payload;
  }

  if (message.messageType === 'GAME_STATE_UPDATE') {
    if (isRecord(message.payload) && looksLikeGameState(message.payload.state)) {
      return message.payload.state;
    }

    if (looksLikeGameState(message.payload)) {
      return message.payload;
    }
  }

  if (isRecord(message.payload)) {
    if (looksLikeGameState(message.payload.gameState)) {
      return message.payload.gameState;
    }

    if (looksLikeGameState(message.payload.state)) {
      return message.payload.state;
    }
  }

  return null;
}

export function useBroadcastWS(url: string): UseBroadcastWSResult {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelayRef.current = 1000;
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(reconnectDelayRef.current, 30000);
      reconnectDelayRef.current = delay * 2;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as unknown;
        setLastMessage(message);

        const nextGameState = extractGameState(message);
        if (nextGameState) {
          setGameState(nextGameState);
        }
      } catch {
        // ignore malformed messages
      }
    };
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { gameState, connected, lastMessage };
}
