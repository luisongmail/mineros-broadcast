import { useEffect, useState } from 'react';
import type { GameState } from '@mineros/game-engine';

import type { GameConfigDetail, GameConfigSource, GameConfigSummary } from '../gameConfig';

const API_BASE_URL = 'http://localhost:3001/api';

type ApiSuccess<T> = {
  result: 'ok';
  payload: T;
};

type ApiError = {
  result: 'error';
  payload: {
    message: string;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

type GamesResponsePayload = {
  games: GameConfigSummary[];
  source: GameConfigSource;
  usingDemo: boolean;
};

type GameDetailResponsePayload = {
  game: GameConfigDetail;
  source: GameConfigSource;
  usingDemo: boolean;
};

type LoadGameResponsePayload = {
  game: GameConfigDetail;
  state: GameState;
  source: GameConfigSource;
  usingDemo: boolean;
  message: string;
};

export interface GameConfigPanelProps {
  onGameLoaded: (payload: LoadGameResponsePayload) => void;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const body = (await response.json()) as ApiResponse<T>;

  if (body.result !== 'ok') {
    throw new Error(body.payload.message);
  }

  return body.payload;
}

function formatSchedule(value: string): string {
  return new Date(value).toLocaleString('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function GameConfigPanel({ onGameLoaded }: GameConfigPanelProps) {
  const [games, setGames] = useState<GameConfigSummary[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameConfigDetail | null>(null);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadGames = async () => {
      setLoadingGames(true);
      setErrorMessage(null);

      try {
        const payload = await requestJson<GamesResponsePayload>('/games');
        if (cancelled) {
          return;
        }

        setGames(payload.games);
        setSelectedGameId((current) => current || payload.games[0]?.id || '');
        if (payload.usingDemo) {
          setFeedback('Usando datos demo');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar la lista de partidos.');
        }
      } finally {
        if (!cancelled) {
          setLoadingGames(false);
        }
      }
    };

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedGameId) {
      setSelectedGame(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoadingDetail(true);
      setErrorMessage(null);

      try {
        const payload = await requestJson<GameDetailResponsePayload>(`/games/${selectedGameId}`);
        if (cancelled) {
          return;
        }

        setSelectedGame(payload.game);
        if (payload.usingDemo) {
          setFeedback('Usando datos demo');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el detalle del partido.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedGameId]);

  const handleLoadGame = async () => {
    if (!selectedGameId) {
      return;
    }

    setLoadingAction(true);
    setErrorMessage(null);

    try {
      const payload = await requestJson<LoadGameResponsePayload>(`/games/${selectedGameId}/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setSelectedGame(payload.game);
      setFeedback(payload.usingDemo ? `${payload.message} · Usando datos demo` : payload.message);
      onGameLoaded(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el partido.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetGame = async () => {
    if (!selectedGameId) {
      return;
    }

    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    if (!selectedGameId) return;

    setShowResetConfirm(false);
    setLoadingAction(true);
    setErrorMessage(null);

    try {
      const payload = await requestJson<LoadGameResponsePayload>(`/games/${selectedGameId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setSelectedGame(payload.game);
      setFeedback(`🔄 ${payload.message}`);
      onGameLoaded(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo reiniciar el partido.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selector de partido */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">Partido</p>
        <select
          value={selectedGameId}
          onChange={(event) => setSelectedGameId(event.target.value)}
          disabled={loadingGames || games.length === 0}
          className="w-full rounded border border-white/15 bg-broadcast-black px-2 py-1.5 text-xs text-white outline-none transition focus:border-mineros-gold disabled:opacity-50"
        >
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.label}
            </option>
          ))}
        </select>
      </div>

      {/* Detalle del partido seleccionado */}
      {(loadingDetail || selectedGame) && (
        <div className="rounded border border-white/10 bg-broadcast-black/40 px-2.5 py-2 text-xs">
          {loadingDetail ? (
            <p className="text-white/40">Cargando…</p>
          ) : selectedGame ? (
            <>
              <p className="font-semibold text-white">
                {selectedGame.awayTeam.shortName} vs {selectedGame.homeTeam.shortName}
                {selectedGame.isDemo && (
                  <span className="ml-2 rounded border border-mineros-gold/40 bg-mineros-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-mineros-gold">
                    Demo
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[10px] text-white/50">{formatSchedule(selectedGame.scheduledAt)}</p>
              <p className="mt-0.5 text-[10px] text-white/50">{selectedGame.venue ?? 'Sede por confirmar'} · {selectedGame.status}</p>
            </>
          ) : null}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { void handleLoadGame(); }}
          disabled={!selectedGameId || loadingAction || loadingGames || loadingDetail}
          className="flex-1 rounded bg-mineros-red px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loadingAction ? 'Cargando…' : 'Cargar partido'}
        </button>
        <button
          type="button"
          onClick={() => { void handleResetGame(); }}
          disabled={!selectedGameId || loadingAction || loadingGames || loadingDetail}
          title="Reinicia el partido borrando at-bats e historial"
          className="rounded border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold uppercase text-white/70 transition hover:border-orange-400/50 hover:bg-orange-400/10 hover:text-orange-200 disabled:opacity-50"
        >
          ↺ Reset
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-2 text-[10px] text-emerald-200">
          ✅ {feedback}
        </div>
      )}
      {errorMessage && (
        <div className="rounded border border-mineros-red/40 bg-mineros-red/10 px-2.5 py-2 text-[10px] text-red-200">
          {errorMessage}
        </div>
      )}

      {/* Confirmación de reset */}
      {showResetConfirm && (
        <div className="rounded border border-orange-400/40 bg-orange-400/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-200">⚠️ ¿Reiniciar el partido?</p>
          <p className="text-[10px] text-white/60">Se borrarán todos los at-bats e historial. Esta acción no se puede deshacer.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { void confirmReset(); }}
              className="flex-1 rounded bg-orange-500 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-orange-600"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-[10px] font-semibold text-white/60 transition hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
