import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState, LineupEntry } from '@mineros/game-engine';

type AtBatResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'home_run'
  | 'walk'
  | 'hbp'
  | 'error'
  | 'strikeout'
  | 'groundout'
  | 'flyout'
  | 'sacrifice_fly'
  | 'sacrifice_bunt'
  | 'fielders_choice'
  | 'double_play';

interface PitcherStats {
  pitcherId: string;
  outs: number;
  ip: string;
  pitches: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  runsAllowed: number;
}

interface PitcherChangeEntry {
  oldPitcherId: string | null;
  newPitcherId: string;
  inning: number;
  inningHalf: 'top' | 'bottom';
  inheritedRunners: number;
  timestamp: string;
}

interface ScorerContextPayload {
  gameState: GameState;
  currentInning: number;
  inningHalf: 'top' | 'bottom';
  currentBatter: LineupEntry | null;
  currentPitcher: LineupEntry | null;
  battingLineup: LineupEntry[];
  pitchingLineup: LineupEntry[];
  atBatsThisInning: number;
  pitcherStats: Record<string, PitcherStats>;
  pitcherChangeLog: PitcherChangeEntry[];
}


interface AtBatHistoryItem {
  id: string;
  game_id: string;
  player_id: string;
  batter_player_id: string | null;
  inning: number;
  inning_half: 'top' | 'bottom' | null;
  result: AtBatResult;
  rbi: number;
  runs: number;
  batter_name: string | null;
  batter_number: string | null;
  recorded_at: string;
}

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

type ResultTone = 'hit' | 'outs' | 'base';

interface ResultOption {
  value: AtBatResult;
  label: string;
  tone: ResultTone;
}

const SERVER_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

const RESULT_OPTIONS: ResultOption[] = [
  { value: 'single', label: 'Single', tone: 'hit' },
  { value: 'double', label: 'Doble', tone: 'hit' },
  { value: 'triple', label: 'Triple', tone: 'hit' },
  { value: 'home_run', label: 'HR', tone: 'hit' },
  { value: 'walk', label: 'Walk', tone: 'base' },
  { value: 'hbp', label: 'HBP', tone: 'base' },
  { value: 'error', label: 'Error', tone: 'base' },
  { value: 'strikeout', label: 'K', tone: 'outs' },
  { value: 'groundout', label: 'Out-G', tone: 'outs' },
  { value: 'flyout', label: 'Out-F', tone: 'outs' },
  { value: 'sacrifice_fly', label: 'SF', tone: 'outs' },
  { value: 'sacrifice_bunt', label: 'SB', tone: 'outs' },
  { value: 'fielders_choice', label: 'FC', tone: 'base' },
  { value: 'double_play', label: 'DP', tone: 'outs' },
];

function resultToneClass(tone: ResultTone, active: boolean): string {
  if (tone === 'hit') {
    return active ? 'border-emerald-300 bg-emerald-500 text-white' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
  }

  if (tone === 'outs') {
    return active ? 'border-red-200 bg-[#D71920] text-white' : 'border-[#D71920]/40 bg-[#D71920]/10 text-red-100';
  }

  return active ? 'border-amber-200 bg-[#D4AF37] text-[#1B2F5B]' : 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-amber-100';
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${SERVER_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const body = (await response.json()) as ApiResponse<T>;

  if (body.result !== 'ok') {
    throw new Error(body.payload.message);
  }

  return body.payload;
}

function formatInningLabel(inning: number, half: 'top' | 'bottom'): string {
  return `${half === 'top' ? 'Alta' : 'Baja'} ${inning}`;
}

function formatHistoryResult(result: AtBatResult): string {
  return RESULT_OPTIONS.find((option) => option.value === result)?.label ?? result;
}

export function ScorerPage() {
  const [context, setContext] = useState<ScorerContextPayload | null>(null);
  const [history, setHistory] = useState<AtBatHistoryItem[]>([]);
  const [selectedBatterId, setSelectedBatterId] = useState('');
  const [selectedPitcherId, setSelectedPitcherId] = useState('');
  const [selectedResult, setSelectedResult] = useState<AtBatResult | null>(null);
  const [rbi, setRbi] = useState(0);
  const [runs, setRuns] = useState(0);
  const [savingBase, setSavingBase] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPitch, setSavingPitch] = useState(false);
  const [savingPitcher, setSavingPitcher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pitchFeedback, setPitchFeedback] = useState<string | null>(null);

  const loadHistory = useCallback(async (gameId: string) => {
    const payload = await requestJson<AtBatHistoryItem[]>(`/at-bats/${encodeURIComponent(gameId)}`);
    setHistory(payload);
  }, []);

  const loadContext = useCallback(async (forceUpdateBatter = false) => {
    const payload = await requestJson<ScorerContextPayload>('/scorer/context');
    setContext(payload);
    setSelectedBatterId((current) => {
      // Después de registrar un at-bat, forzamos la actualización al nuevo bateador en turno
      if (forceUpdateBatter || !current) {
        return payload.currentBatter?.playerId || payload.battingLineup[0]?.playerId || '';
      }
      return current;
    });
    setSelectedPitcherId((current) => {
      if (!payload.gameState.rules.hasPitcher) {
        return '';
      }
      // Si el pitcher seleccionado no está en el lineup del equipo que lanza ahora,
      // sincronizar con el servidor (ocurre al cambiar de media entrada)
      const isCurrentInLineup = payload.pitchingLineup.some((p) => p.playerId === current);
      if (!isCurrentInLineup) {
        return payload.currentPitcher?.playerId || payload.pitchingLineup[0]?.playerId || '';
      }
      return current || payload.currentPitcher?.playerId || payload.pitchingLineup[0]?.playerId || '';
    });
    await loadHistory(payload.gameState.gameId);
  }, [loadHistory]);

  // Sincronización vía WebSocket — recarga contexto cuando el estado del servidor cambia
  useEffect(() => {
    const WS_URL = import.meta.env.DEV ? 'ws://localhost:3001' : `ws://${window.location.host}`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(WS_URL);

      ws.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type?: string };
          // El servidor emite 'state' en cada cambio de GameState
          if (msg.type === 'state' || msg.type === 'state_update') {
            void loadContext();
          }
        } catch {
          // ignorar mensajes no JSON
        }
      });

      ws.addEventListener('close', () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [loadContext]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadContext();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el scorer');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
  }, [loadContext]);

  const recentHistory = useMemo(() => history.slice(-5).reverse(), [history]);

  const handleToggleBase = useCallback(async (base: 'first' | 'second' | 'third') => {
    if (!context) return;
    const currentValue = context.gameState.bases[base];
    const newValue = !currentValue;
    setSavingBase(base);
    try {
      await requestJson('/command', {
        method: 'PUT',
        body: JSON.stringify({ command: 'SetBase', value: `${base}:${String(newValue)}` }),
      });
      await loadContext();
    } catch {
      // ignorar error silencioso — el estado se re-sincronizará vía WS
    } finally {
      setSavingBase(null);
    }
  }, [context, loadContext]);

  const handlePitch = useCallback(async (type: 'ball' | 'strike' | 'foul') => {
    if (!context || savingPitch) return;
    setSavingPitch(true);
    setPitchFeedback(null);
    try {
      const result = await requestJson<{ action: string }>('/pitch', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      // Mostrar feedback breve
      const labels: Record<string, string> = {
        ball_added: 'Bola',
        strike_added: 'Strike',
        auto_walk: '⚾ WALK automático',
        auto_strikeout: '✕ PONCHE automático',
        no_op: 'Foul (2 strikes — sin efecto)',
      };
      setPitchFeedback(labels[result.action] ?? result.action);
      setTimeout(() => { setPitchFeedback(null); }, 2000);
      await loadContext(result.action === 'auto_walk' || result.action === 'auto_strikeout');
    } catch (pitchError) {
      setError(pitchError instanceof Error ? pitchError.message : 'Error al registrar pitcheo');
    } finally {
      setSavingPitch(false);
    }
  }, [context, savingPitch, loadContext]);

  const handleApplyPitcherChange = useCallback(async () => {
    if (!context || !selectedPitcherId || savingPitcher) return;
    setSavingPitcher(true);
    try {
      await requestJson('/command', {
        method: 'PUT',
        body: JSON.stringify({ command: 'SetPitcher', value: `playerId:${selectedPitcherId}` }),
      });
      await loadContext();
    } catch (pitcherError) {
      setError(pitcherError instanceof Error ? pitcherError.message : 'Error al cambiar pitcher');
    } finally {
      setSavingPitcher(false);
    }
  }, [context, selectedPitcherId, savingPitcher, loadContext]);

  const handleSubmit = useCallback(async () => {
    if (!context || !selectedBatterId || !selectedResult) {
      setError('Selecciona bateador y resultado antes de registrar.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await requestJson('/at-bats', {
        method: 'POST',
        body: JSON.stringify({
          gameId: context.gameState.gameId,
          batterPlayerId: selectedBatterId,
          pitcherPlayerId: context.gameState.rules.hasPitcher ? selectedPitcherId || undefined : undefined,
          result: selectedResult,
          rbi,
          runs,
        }),
      });
      setSelectedResult(null);
      setRbi(0);
      setRuns(0);
      // Forzar actualización al nuevo bateador en turno después del at-bat
      await loadContext(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo registrar el at-bat');
    } finally {
      setSaving(false);
    }
  }, [context, loadContext, rbi, runs, selectedBatterId, selectedPitcherId, selectedResult]);

  if (loading && !context) {
    return <div className="min-h-screen bg-broadcast-black px-4 py-4 text-white">Cargando scorer…</div>;
  }

  if (!context) {
    return (
      <div className="min-h-screen bg-broadcast-black px-4 py-4 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="font-bebas text-2xl tracking-wide text-red-200">Scorer no disponible</p>
          <p className="mt-2 text-sm text-white/80">{error ?? 'No se pudo cargar el contexto actual.'}</p>
        </div>
      </div>
    );
  }

  const gs = context.gameState;
  const awayName = gs.awayTeam.shortName ?? gs.awayTeam.name;
  const homeName = gs.homeTeam.shortName ?? gs.homeTeam.name;

  return (
    <div className="h-screen overflow-hidden bg-broadcast-black text-white flex flex-col">
      {/* ── HEADER COMPACTO ── */}
      <header className="flex-none border-b border-white/10 bg-[#1B2F5B] px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Identidad */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-bebas text-xl uppercase tracking-widest text-white/90">Scorer</span>
            <span className="hidden text-xs text-white/50 sm:block truncate">
              {awayName} @ {homeName}
            </span>
          </div>

          {/* Marcador + entrada */}
          <div className="flex items-center gap-3">
            <span className="font-bebas text-2xl text-white">
              {awayName} <span className="text-[#D4AF37]">{gs.score.away}</span>
              <span className="mx-2 text-white/30">·</span>
              {homeName} <span className="text-[#D4AF37]">{gs.score.home}</span>
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white/70">
              {formatInningLabel(context.currentInning, context.inningHalf)}
            </span>
          </div>

          {/* Outs + Bases */}
          <div className="flex items-center gap-3">
            {/* Outs */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/40 uppercase tracking-widest">Outs</span>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border ${i < gs.outs ? 'border-[#D71920] bg-[#D71920]' : 'border-white/30 bg-transparent'}`}
                />
              ))}
            </div>
            {/* Bases (diamante) */}
            <div className="relative h-8 w-8">
              {/* Segunda */}
              <span className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rotate-45 border ${gs.bases.second ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/30 bg-transparent'}`} />
              {/* Tercera */}
              <span className={`absolute bottom-0 left-0 h-3 w-3 rotate-45 border ${gs.bases.third ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/30 bg-transparent'}`} />
              {/* Primera */}
              <span className={`absolute bottom-0 right-0 h-3 w-3 rotate-45 border ${gs.bases.first ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-white/30 bg-transparent'}`} />
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="flex-none px-4 pt-2">
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</div>
        </div>
      ) : null}

      {/* ── CUERPO PRINCIPAL: 3 columnas ── */}
      <main className="flex-1 overflow-hidden grid grid-cols-[260px_1fr_260px] gap-0 divide-x divide-white/10">

        {/* ── COLUMNA IZQUIERDA: Bateador · Pitcher · Bases · Stats ── */}
        <aside className="overflow-y-auto p-3 space-y-3">
          {/* Bateador */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Bateador</p>
            <select
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
              onChange={(e) => setSelectedBatterId(e.target.value)}
              value={selectedBatterId}
            >
              <option value="">Seleccionar…</option>
              {context.battingLineup.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  #{p.number} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pitcher */}
          {gs.rules.hasPitcher ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Pitcher</p>
              <div className="flex gap-1.5">
                <select
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none focus:border-[#D4AF37]"
                  onChange={(e) => setSelectedPitcherId(e.target.value)}
                  value={selectedPitcherId}
                >
                  <option value="">Seleccionar…</option>
                  {context.pitchingLineup.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      #{p.number} {p.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-2 py-1.5 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/20 disabled:opacity-40"
                  disabled={savingPitcher || !selectedPitcherId || selectedPitcherId === context.currentPitcher?.playerId}
                  onClick={() => void handleApplyPitcherChange()}
                  title="Cambio de pitcher"
                  type="button"
                >
                  {savingPitcher ? '…' : '⇄'}
                </button>
              </div>
              {context.currentPitcher && (
                <p className="text-[10px] text-white/40 truncate">
                  ▶ #{context.currentPitcher.number} {context.currentPitcher.name}
                  {context.pitcherStats[context.currentPitcher.playerId] && (() => {
                    const ps = context.pitcherStats[context.currentPitcher.playerId];
                    return ` · IP ${ps.ip} · ${ps.pitches}P · ${ps.strikeouts}K`;
                  })()}
                </p>
              )}
            </div>
          ) : null}

          {/* Bases — control manual */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Bases <span className="text-white/25">(toca para ajustar)</span></p>
            <div className="flex gap-2">
              {(['first', 'second', 'third'] as const).map((base) => {
                const label = base === 'first' ? '1ª' : base === 'second' ? '2ª' : '3ª';
                return (
                  <button
                    key={base}
                    type="button"
                    disabled={savingBase !== null}
                    onClick={() => void handleToggleBase(base)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-bold transition ${
                      gs.bases[base]
                        ? 'border-[#D4AF37] bg-[#D4AF37] text-[#1B2F5B]'
                        : 'border-white/20 bg-white/5 text-white/50 hover:border-white/40'
                    } disabled:cursor-wait`}
                  >
                    {savingBase === base ? '…' : label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats pitchers (compacto) */}
          {gs.rules.hasPitcher && Object.keys(context.pitcherStats).length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Stats Pitchers</p>
              <div className="space-y-1">
                {context.pitchingLineup.map((player) => {
                  const ps = context.pitcherStats[player.playerId];
                  if (!ps) return null;
                  const isCurrent = player.playerId === context.currentPitcher?.playerId;
                  return (
                    <div key={player.playerId} className={`rounded-lg p-2 text-[11px] ${isCurrent ? 'border border-[#D4AF37]/30 bg-[#D4AF37]/5' : 'bg-white/5'}`}>
                      <p className="font-semibold text-white truncate">{isCurrent ? '▶ ' : ''}#{player.number} {player.name}</p>
                      <p className="text-white/50 mt-0.5">IP {ps.ip} · {ps.pitches}P · {ps.strikeouts}K · {ps.walks}BB · {ps.hitsAllowed}H</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* ── COLUMNA CENTRAL: Conteo + Resultado + RBI/Carreras + Registrar ── */}
        <div className="overflow-y-auto p-3 space-y-3">
          {/* Conteo */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Conteo</p>
              <div className="flex items-center gap-3">
                <span className="font-bebas text-3xl text-blue-400">{gs.count.balls}</span>
                <span className="text-white/30">·</span>
                <span className="font-bebas text-3xl text-red-400">{gs.count.strikes}</span>
              </div>
              {pitchFeedback && <span className="text-xs font-semibold text-[#D4AF37] animate-pulse">{pitchFeedback}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                className="rounded-lg border border-blue-500/50 bg-blue-500/15 py-2.5 font-bebas text-lg tracking-wider text-blue-400 transition hover:bg-blue-500/25 disabled:opacity-40"
                disabled={savingPitch}
                onClick={() => void handlePitch('ball')}
                type="button"
              >
                B — Bola
              </button>
              <button
                className="rounded-lg border border-red-500/50 bg-red-500/15 py-2.5 font-bebas text-lg tracking-wider text-red-400 transition hover:bg-red-500/25 disabled:opacity-40"
                disabled={savingPitch}
                onClick={() => void handlePitch('strike')}
                type="button"
              >
                S — Strike
              </button>
              <button
                className="rounded-lg border border-amber-500/50 bg-amber-500/15 py-2.5 font-bebas text-lg tracking-wider text-amber-400 transition hover:bg-amber-500/25 disabled:opacity-40"
                disabled={savingPitch || gs.count.strikes >= 2}
                onClick={() => void handlePitch('foul')}
                title={gs.count.strikes >= 2 ? 'Foul con 2 strikes no suma' : 'Foul (+strike)'}
                type="button"
              >
                F — Foul
              </button>
            </div>
          </div>

          {/* Resultado del at-bat */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Resultado del turno al bate</p>
            <div className="grid grid-cols-4 gap-1.5">
              {RESULT_OPTIONS.map((option) => {
                const active = selectedResult === option.value;
                return (
                  <button
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold uppercase tracking-wide transition hover:scale-[1.02] ${resultToneClass(option.tone, active)}`}
                    key={option.value}
                    onClick={() => setSelectedResult(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RBI y Carreras en línea */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">RBI</p>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRbi(Math.max(0, rbi - 1))} type="button">-</button>
                <span className="flex-1 rounded-lg bg-black/30 py-1.5 text-center font-bebas text-2xl text-white">{rbi}</span>
                <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRbi(rbi + 1)} type="button">+</button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">Carreras</p>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRuns(Math.max(0, runs - 1))} type="button">-</button>
                <span className="flex-1 rounded-lg bg-black/30 py-1.5 text-center font-bebas text-2xl text-white">{runs}</span>
                <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRuns(runs + 1)} type="button">+</button>
              </div>
            </div>
          </div>

          {/* Botón registrar */}
          <button
            className="flex w-full items-center justify-center rounded-xl bg-[#D71920] px-5 py-3.5 font-bebas text-xl uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || !selectedBatterId || !selectedResult}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {saving ? 'Registrando…' : '✓ Registrar at-bat'}
          </button>
        </div>

        {/* ── COLUMNA DERECHA: Historial ── */}
        <aside className="overflow-y-auto p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Historial</p>
          {recentHistory.length === 0 ? (
            <p className="text-xs text-white/40">Sin at-bats registrados.</p>
          ) : (
            <div className="space-y-1.5">
              {recentHistory.map((item) => (
                <div className="rounded-lg bg-white/5 px-3 py-2" key={item.id}>
                  <p className="text-xs font-semibold text-white truncate">
                    {item.batter_name ?? item.batter_player_id ?? item.player_id} — {formatHistoryResult(item.result)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/50">
                    {item.inning_half === 'top' ? 'Alta' : 'Baja'} {item.inning}
                    {item.rbi > 0 ? ` · ${item.rbi} RBI` : ''}
                    {item.runs > 0 ? ` · ${item.runs}R` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
