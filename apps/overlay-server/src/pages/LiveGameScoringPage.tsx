import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameState, LineupEntry } from '@mineros/game-engine';

import { PitchGrid, type PitchGridCell } from '../components/scorer/PitchGrid';

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

type PitchType = 'Recta' | 'Curva' | 'Slider' | 'Cambio' | 'Sinker' | 'Cortada' | 'Knuckle';
type ContactType = 'line_drive' | 'fly_ball' | 'ground_ball' | 'bunt' | 'home_run';
type HitDirection = 'LF' | 'CF' | 'RF' | '3B' | 'SS' | '2B' | '1B' | 'P' | 'C';
type BatterSide = 'R' | 'L' | 'S' | 'unknown';
type ActiveBatterSide = 'R' | 'L' | null;

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

interface PlayerMeta {
  bats?: 'R' | 'L' | 'S';
  throws?: string;
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
  playerMeta: Record<string, PlayerMeta>;
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

interface ContactOption {
  value: ContactType;
  label: string;
}

interface DirectionOption {
  value: HitDirection;
  label: string;
  className: string;
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
  { value: 'strikeout', label: 'Strikeout', tone: 'outs' },
  { value: 'groundout', label: 'Groundout', tone: 'outs' },
  { value: 'flyout', label: 'Flyout', tone: 'outs' },
  { value: 'sacrifice_fly', label: 'Sacrifice Fly', tone: 'outs' },
  { value: 'sacrifice_bunt', label: 'Sacrifice Bunt', tone: 'outs' },
  { value: 'fielders_choice', label: "Fielder's Choice", tone: 'base' },
  { value: 'double_play', label: 'Doble Play', tone: 'outs' },
];

const PITCH_TYPES: PitchType[] = ['Recta', 'Curva', 'Slider', 'Cambio', 'Sinker', 'Cortada', 'Knuckle'];

const CONTACT_OPTIONS: ContactOption[] = [
  { value: 'line_drive', label: 'Línea' },
  { value: 'fly_ball', label: 'Elevado' },
  { value: 'ground_ball', label: 'Rodado' },
  { value: 'bunt', label: 'Bunt' },
  { value: 'home_run', label: 'Cuadrangular' },
];

const DIRECTION_OPTIONS: DirectionOption[] = [
  { value: 'LF', label: 'LF', className: 'col-start-1 row-start-1' },
  { value: 'CF', label: 'CF', className: 'col-start-2 row-start-1' },
  { value: 'RF', label: 'RF', className: 'col-start-3 row-start-1' },
  { value: '3B', label: '3B', className: 'col-start-1 row-start-2' },
  { value: 'SS', label: 'SS', className: 'col-start-2 row-start-2' },
  { value: '2B', label: '2B', className: 'col-start-3 row-start-2' },
  { value: '1B', label: '1B', className: 'col-start-3 row-start-3' },
  { value: 'P', label: 'P', className: 'col-start-2 row-start-3' },
  { value: 'C', label: 'C', className: 'col-start-2 row-start-4' },
];

const CONTACT_REQUIRED_RESULTS = new Set<AtBatResult>([
  'single',
  'double',
  'triple',
  'home_run',
  'error',
  'fielders_choice',
  'sacrifice_fly',
  'sacrifice_bunt',
  'double_play',
]);

function resultToneClass(tone: ResultTone, active: boolean): string {
  if (tone === 'hit') {
    return active ? 'border-emerald-300 bg-emerald-500 text-white' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
  }

  if (tone === 'outs') {
    return active ? 'border-white bg-mineros-red text-white' : 'border-mineros-red/40 bg-mineros-red/10 text-red-100';
  }

  return active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-mineros-gold/40 bg-mineros-gold/10 text-amber-100';
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

function normalizeBatterSide(value: string | undefined): BatterSide {
  return value === 'R' || value === 'L' || value === 'S' ? value : 'unknown';
}

function formatBatterSideLabel(value: BatterSide | ActiveBatterSide): string {
  if (value === 'R') return 'Derecho';
  if (value === 'L') return 'Zurdo';
  if (value === 'S') return 'Ambidiestro';
  return 'Sin definir';
}

function isStrikeCell(cell: PitchGridCell | null): boolean {
  return cell !== null && cell.col >= 2 && cell.col <= 4 && cell.row >= 2 && cell.row <= 4;
}

function getTacticalReading(cell: PitchGridCell | null, side: ActiveBatterSide, batterSide: BatterSide): string {
  if (!cell) return 'Selecciona ubicación';
  if (batterSide === 'S' && side === null) return 'Selecciona el lado activo';
  if (side === null) return 'Define la mano activa';
  if (cell.col === 3) return 'Centro';

  if (side === 'R') {
    if (cell.col <= 2) return 'Adentro';
    if (cell.col >= 4) return 'Afuera';
  }

  if (side === 'L') {
    if (cell.col >= 4) return 'Adentro';
    if (cell.col <= 2) return 'Afuera';
  }

  return 'Centro';
}

function StepBadge({ active, index, title }: { active: boolean; index: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-full border font-bebas text-lg ${active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/15 bg-white/5 text-white/60'}`}>
        {index}
      </span>
      <span className={`font-bebas text-xl uppercase tracking-[0.18em] ${active ? 'text-mineros-gold' : 'text-white/60'}`}>{title}</span>
    </div>
  );
}

export function LiveGameScoringPage() {
  const [context, setContext] = useState<ScorerContextPayload | null>(null);
  const [history, setHistory] = useState<AtBatHistoryItem[]>([]);
  const [selectedBatterId, setSelectedBatterId] = useState('');
  const [selectedPitcherId, setSelectedPitcherId] = useState('');
  const [selectedPitchCell, setSelectedPitchCell] = useState<PitchGridCell | null>(null);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType | ''>('');
  const [selectedResult, setSelectedResult] = useState<AtBatResult | null>(null);
  const [selectedContactType, setSelectedContactType] = useState<ContactType | null>(null);
  const [selectedHitDirection, setSelectedHitDirection] = useState<HitDirection | null>(null);
  const [battingSideOverride, setBattingSideOverride] = useState<ActiveBatterSide>(null);
  const [rbi, setRbi] = useState(0);
  const [runs, setRuns] = useState(0);
  const [savingBase, setSavingBase] = useState<string | null>(null);
  const [savingPitch, setSavingPitch] = useState(false);
  const [savingPitcher, setSavingPitcher] = useState(false);
  const [savingAtBat, setSavingAtBat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pitchFeedback, setPitchFeedback] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const loadHistory = useCallback(async (gameId: string) => {
    const payload = await requestJson<AtBatHistoryItem[]>(`/at-bats/${encodeURIComponent(gameId)}`);
    setHistory(payload);
  }, []);

  const loadContext = useCallback(async (forceUpdateBatter = false) => {
    const payload = await requestJson<ScorerContextPayload>('/scorer/context');
    setContext(payload);
    setSelectedBatterId((current) => {
      if (forceUpdateBatter || !current || !payload.battingLineup.some((player) => player.playerId === current)) {
        return payload.currentBatter?.playerId || payload.battingLineup[0]?.playerId || '';
      }
      return current;
    });
    setSelectedPitcherId((current) => {
      if (!payload.gameState.rules.hasPitcher) {
        return '';
      }
      if (!current || !payload.pitchingLineup.some((player) => player.playerId === current)) {
        return payload.currentPitcher?.playerId || payload.pitchingLineup[0]?.playerId || '';
      }
      return current;
    });
    await loadHistory(payload.gameState.gameId);
  }, [loadHistory]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadContext();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el live scoring');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadContext]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = import.meta.env.DEV ? 'ws://localhost:3001' : `${protocol}://${window.location.host}`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(wsUrl);
      ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data as string) as { type?: string };
          if (message.type === 'state' || message.type === 'state_update') {
            void loadContext();
          }
        } catch {
          // ignore non-json payloads
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
    if (!selectedResult || !CONTACT_REQUIRED_RESULTS.has(selectedResult)) {
      setSelectedContactType(null);
      setSelectedHitDirection(null);
      if (selectedResult) {
        setCurrentStep(2);
      }
    } else {
      setCurrentStep(3);
    }
  }, [selectedResult]);

  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  const selectedBatter = useMemo(
    () => context?.battingLineup.find((player) => player.playerId === selectedBatterId) ?? context?.currentBatter ?? null,
    [context, selectedBatterId],
  );

  const selectedPitcher = useMemo(
    () => context?.pitchingLineup.find((player) => player.playerId === selectedPitcherId) ?? context?.currentPitcher ?? null,
    [context, selectedPitcherId],
  );

  const batterSide = normalizeBatterSide(selectedBatter ? context?.playerMeta[selectedBatter.playerId]?.bats : undefined);
  const inferredActiveBattingSide: ActiveBatterSide = batterSide === 'R' || batterSide === 'L' ? batterSide : null;
  const activeBattingSide = battingSideOverride ?? inferredActiveBattingSide;
  const shouldPromptBattingSide = batterSide === 'unknown' || batterSide === 'S';
  const selectedPitchCall = isStrikeCell(selectedPitchCell) ? 'strike' : 'ball';
  const selectedPitchReading = getTacticalReading(selectedPitchCell, activeBattingSide, batterSide);
  const canRegisterPitch = Boolean(selectedPitchCell && selectedPitchType);
  const canSubmitAtBat = Boolean(
    context &&
      selectedBatterId &&
      selectedResult &&
      (!CONTACT_REQUIRED_RESULTS.has(selectedResult) || (selectedContactType && selectedHitDirection)),
  );

  const resetAtBatWorkflow = useCallback(() => {
    setSelectedPitchCell(null);
    setSelectedPitchType('');
    setSelectedResult(null);
    setSelectedContactType(null);
    setSelectedHitDirection(null);
    setRbi(0);
    setRuns(0);
    setCurrentStep(1);
  }, []);

  const handleToggleBase = useCallback(async (base: 'first' | 'second' | 'third') => {
    if (!context) return;
    const currentValue = context.gameState.bases[base];
    setSavingBase(base);

    try {
      await requestJson('/command', {
        method: 'PUT',
        body: JSON.stringify({ command: 'SetBase', value: `${base}:${String(!currentValue)}` }),
      });
      await loadContext();
    } catch {
      // sync handled by websocket
    } finally {
      setSavingBase(null);
    }
  }, [context, loadContext]);

  const showPitchFeedback = useCallback((message: string) => {
    setPitchFeedback(message);
    window.setTimeout(() => {
      setPitchFeedback(null);
    }, 2200);
  }, []);

  const handleRegisterPitch = useCallback(async () => {
    if (!context || !selectedPitchCell || !selectedPitchType || savingPitch) {
      return;
    }

    setSavingPitch(true);
    setError(null);

    try {
      const result = await requestJson<{ action: string }>('/pitch', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedPitchCall,
          col: selectedPitchCell.col,
          row: selectedPitchCell.row,
          pitchType: selectedPitchType,
        }),
      });

      const labels: Record<string, string> = {
        ball_added: 'Bola registrada',
        strike_added: 'Strike registrado',
        auto_walk: 'Walk automático',
        auto_strikeout: 'Ponche automático',
      };

      showPitchFeedback(labels[result.action] ?? result.action);
      setSelectedPitchCell(null);
      setSelectedPitchType('');
      await loadContext(result.action === 'auto_walk' || result.action === 'auto_strikeout');

      if (result.action === 'auto_walk' || result.action === 'auto_strikeout') {
        resetAtBatWorkflow();
      }
    } catch (pitchError) {
      setError(pitchError instanceof Error ? pitchError.message : 'No se pudo registrar el pitcheo');
    } finally {
      setSavingPitch(false);
    }
  }, [context, loadContext, resetAtBatWorkflow, savingPitch, selectedPitchCall, selectedPitchCell, selectedPitchType, showPitchFeedback]);

  const handleQuickFoul = useCallback(async () => {
    if (!context || savingPitch) {
      return;
    }

    setSavingPitch(true);
    setError(null);

    try {
      const result = await requestJson<{ action: string }>('/pitch', {
        method: 'POST',
        body: JSON.stringify({
          type: 'foul',
          col: selectedPitchCell?.col,
          row: selectedPitchCell?.row,
          pitchType: selectedPitchType || undefined,
        }),
      });

      showPitchFeedback(result.action === 'no_op' ? 'Foul sin cambio de conteo' : 'Foul registrado');
      setSelectedPitchCell(null);
      setSelectedPitchType('');
      await loadContext();
    } catch (pitchError) {
      setError(pitchError instanceof Error ? pitchError.message : 'No se pudo registrar el foul');
    } finally {
      setSavingPitch(false);
    }
  }, [context, loadContext, savingPitch, selectedPitchCell, selectedPitchType, showPitchFeedback]);

  const handleApplyPitcherChange = useCallback(async () => {
    if (!selectedPitcherId || savingPitcher) {
      return;
    }

    setSavingPitcher(true);
    setError(null);
    try {
      await requestJson('/command', {
        method: 'PUT',
        body: JSON.stringify({ command: 'SetPitcher', value: `playerId:${selectedPitcherId}` }),
      });
      await loadContext();
    } catch (pitcherError) {
      setError(pitcherError instanceof Error ? pitcherError.message : 'No se pudo cambiar el pitcher');
    } finally {
      setSavingPitcher(false);
    }
  }, [loadContext, savingPitcher, selectedPitcherId]);

  const handleSubmitAtBat = useCallback(async () => {
    if (!context || !selectedBatterId || !selectedResult) {
      setError('Selecciona bateador y resultado antes de confirmar.');
      return;
    }

    if (CONTACT_REQUIRED_RESULTS.has(selectedResult) && (!selectedContactType || !selectedHitDirection)) {
      setError('Completa el tipo de contacto y la dirección al campo.');
      return;
    }

    setSavingAtBat(true);
    setError(null);

    try {
      await requestJson('/at-bats', {
        method: 'POST',
        body: JSON.stringify({
          gameId: context.gameState.gameId,
          batterPlayerId: selectedBatterId,
          pitcherPlayerId: context.gameState.rules.hasPitcher ? selectedPitcherId || undefined : undefined,
          result: selectedResult,
          rbi,
          runs,
          contactType: selectedContactType ?? undefined,
          hitDirection: selectedHitDirection ?? undefined,
        }),
      });

      resetAtBatWorkflow();
      await loadContext(true);
      showPitchFeedback('Turno al bate registrado');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo registrar el turno al bate');
    } finally {
      setSavingAtBat(false);
    }
  }, [context, loadContext, resetAtBatWorkflow, rbi, runs, selectedBatterId, selectedContactType, selectedHitDirection, selectedPitcherId, selectedResult, showPitchFeedback]);

  if (loading && !context) {
    return <div className="min-h-screen bg-broadcast-black px-4 py-4 text-white">Cargando live scoring…</div>;
  }

  if (!context) {
    return (
      <div className="min-h-screen bg-broadcast-black px-4 py-4 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-mineros-red/40 bg-mineros-red/10 p-4">
          <p className="font-bebas text-2xl tracking-wide text-red-200">Live scoring no disponible</p>
          <p className="mt-2 text-sm text-white/80">{error ?? 'No se pudo cargar el contexto actual.'}</p>
        </div>
      </div>
    );
  }

  const gs = context.gameState;
  const awayName = gs.awayTeam.shortName ?? gs.awayTeam.name;
  const homeName = gs.homeTeam.shortName ?? gs.homeTeam.name;
  const currentPitcherStats = selectedPitcher ? context.pitcherStats[selectedPitcher.playerId] : null;

  return (
    <div className="flex h-screen min-w-[768px] flex-col overflow-hidden bg-broadcast-black text-white">
      <header className="flex-none border-b border-white/10 bg-mineros-navy px-4 py-3">
        <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bebas text-2xl uppercase tracking-[0.22em] text-mineros-gold">Live Game Scoring</span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-white/70">
              {awayName} @ {homeName}
            </span>
            <span className="rounded-full border border-mineros-gold/30 bg-mineros-gold/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-mineros-gold">
              {formatInningLabel(context.currentInning, context.inningHalf)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_1fr] xl:justify-end">
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Marcador</p>
              <p className="mt-1 font-bebas text-3xl text-white">
                {awayName} <span className="text-mineros-gold">{gs.score.away}</span>
                <span className="mx-2 text-white/25">·</span>
                {homeName} <span className="text-mineros-gold">{gs.score.home}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Outs / Bases</p>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className={`h-3.5 w-3.5 rounded-full border ${index < gs.outs ? 'border-mineros-red bg-mineros-red' : 'border-white/25 bg-transparent'}`}
                    />
                  ))}
                </div>
                <div className="relative h-9 w-9">
                  <span className={`absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border ${gs.bases.second ? 'border-mineros-gold bg-mineros-gold' : 'border-white/30 bg-transparent'}`} />
                  <span className={`absolute bottom-0 left-0 h-3.5 w-3.5 rotate-45 border ${gs.bases.third ? 'border-mineros-gold bg-mineros-gold' : 'border-white/30 bg-transparent'}`} />
                  <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rotate-45 border ${gs.bases.first ? 'border-mineros-gold bg-mineros-gold' : 'border-white/30 bg-transparent'}`} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Bateador actual</p>
              <p className="mt-1 truncate font-bebas text-2xl text-white">
                {selectedBatter ? `#${selectedBatter.number} ${selectedBatter.name}` : '—'}
              </p>
              <p className="text-xs text-white/65">
                Mano: <span className="text-mineros-gold">{formatBatterSideLabel(activeBattingSide ?? batterSide)}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Lanzador / Conteo</p>
              <p className="mt-1 truncate font-bebas text-2xl text-white">
                {selectedPitcher ? `#${selectedPitcher.number} ${selectedPitcher.name}` : '—'}
              </p>
              <p className="text-xs text-white/65">
                Conteo: <span className="text-blue-300">{gs.count.balls}</span> - <span className="text-red-300">{gs.count.strikes}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="flex-none px-4 pt-3">
          <div className="rounded-xl border border-mineros-red/40 bg-mineros-red/10 px-3 py-2 text-sm text-red-100">{error}</div>
        </div>
      ) : null}

      <main className="grid flex-1 gap-3 overflow-hidden p-3 md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Bateador ofensivo</p>
            <select
              className="w-full rounded-xl border border-white/10 bg-broadcast-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-mineros-gold"
              onChange={(event) => {
                setSelectedBatterId(event.target.value);
                setBattingSideOverride(null);
              }}
              value={selectedBatterId}
            >
              <option value="">Seleccionar…</option>
              {context.battingLineup.map((player) => {
                const side = normalizeBatterSide(context.playerMeta[player.playerId]?.bats);
                return (
                  <option key={player.playerId} value={player.playerId}>
                    #{player.number} {player.name} {side !== 'unknown' ? `· ${side}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {gs.rules.hasPitcher ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Pitcher</p>
              <div className="flex gap-2">
                <select
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-broadcast-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-mineros-gold"
                  onChange={(event) => setSelectedPitcherId(event.target.value)}
                  value={selectedPitcherId}
                >
                  <option value="">Seleccionar…</option>
                  {context.pitchingLineup.map((player) => (
                    <option key={player.playerId} value={player.playerId}>
                      #{player.number} {player.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-xl border border-mineros-gold/40 bg-mineros-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-mineros-gold transition hover:bg-mineros-gold/20 disabled:opacity-40"
                  disabled={savingPitcher || !selectedPitcherId || selectedPitcherId === context.currentPitcher?.playerId}
                  onClick={() => void handleApplyPitcherChange()}
                  type="button"
                >
                  {savingPitcher ? '...' : 'Cambio'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Bases manuales</p>
            <div className="grid grid-cols-3 gap-2">
              {(['first', 'second', 'third'] as const).map((base) => {
                const label = base === 'first' ? '1ª' : base === 'second' ? '2ª' : '3ª';
                return (
                  <button
                    key={base}
                    className={`rounded-xl border py-2 text-sm font-bold transition ${
                      gs.bases[base]
                        ? 'border-mineros-gold bg-mineros-gold text-mineros-navy'
                        : 'border-white/15 bg-black/20 text-white/60 hover:border-white/35'
                    }`}
                    disabled={savingBase !== null}
                    onClick={() => void handleToggleBase(base)}
                    type="button"
                  >
                    {savingBase === base ? '...' : label}
                  </button>
                );
              })}
            </div>
          </div>

          {currentPitcherStats ? (
            <div className="space-y-2 rounded-2xl border border-mineros-gold/20 bg-mineros-gold/5 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-mineros-gold">Stats del pitcher actual</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/80">
                <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-white/40">IP</span>{currentPitcherStats.ip}</div>
                <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-white/40">P</span>{currentPitcherStats.pitches}</div>
                <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-white/40">K</span>{currentPitcherStats.strikeouts}</div>
                <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-white/40">BB</span>{currentPitcherStats.walks}</div>
                <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-white/40">H</span>{currentPitcherStats.hitsAllowed}</div>
                <div className="rounded-xl bg-black/20 px-3 py-2"><span className="block text-white/40">R</span>{currentPitcherStats.runsAllowed}</div>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Conteo actual</p>
                <p className="font-bebas text-4xl text-white">
                  <span className="text-blue-300">{gs.count.balls}</span>
                  <span className="mx-2 text-white/25">-</span>
                  <span className="text-red-300">{gs.count.strikes}</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">Lectura seleccionada</p>
                <p className="font-bebas text-2xl text-mineros-gold">{selectedPitchReading}</p>
              </div>
            </div>
            {pitchFeedback ? (
              <div className="rounded-full border border-mineros-gold/30 bg-mineros-gold/10 px-4 py-2 text-sm font-semibold text-mineros-gold">
                {pitchFeedback}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <StepBadge active={currentStep === 1} index={1} title="Captura de lanzamiento" />

            {shouldPromptBattingSide ? (
              <div className="rounded-2xl border border-mineros-gold/20 bg-mineros-gold/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mineros-gold">Corregir lado</p>
                <p className="mt-1 text-sm text-white/70">
                  {batterSide === 'S' ? 'Bateador ambidiestro: selecciona el lado activo del turno.' : 'La mano del bateador no está informada. Selecciona un lado para calcular adentro/afuera.'}
                </p>
                <div className="mt-3 flex gap-2">
                  {(['R', 'L'] as const).map((side) => (
                    <button
                      key={side}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${activeBattingSide === side ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/15 bg-white/5 text-white/75 hover:border-white/35'}`}
                      onClick={() => setBattingSideOverride(side)}
                      type="button"
                    >
                      {side === 'R' ? 'Derecho' : 'Zurdo'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70">
                <span>Mano detectada: <span className="font-semibold text-mineros-gold">{formatBatterSideLabel(batterSide)}</span></span>
                <div className="flex gap-2">
                  {(['R', 'L'] as const).map((side) => (
                    <button
                      key={side}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${activeBattingSide === side ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/15 bg-black/20 text-white/65 hover:border-white/35'}`}
                      onClick={() => setBattingSideOverride(side === inferredActiveBattingSide ? null : side)}
                      type="button"
                    >
                      {side === 'R' ? 'Corregir a R' : 'Corregir a L'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <PitchGrid
              activeBattingSide={activeBattingSide}
              batterSide={batterSide}
              onSelect={setSelectedPitchCell}
              selectedCell={selectedPitchCell}
            />

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Tipo de lanzamiento</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PITCH_TYPES.map((pitchType) => {
                  const active = selectedPitchType === pitchType;
                  return (
                    <button
                      key={pitchType}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-white/5 text-white/75 hover:border-white/35'}`}
                      onClick={() => setSelectedPitchType(pitchType)}
                      type="button"
                    >
                      {pitchType}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="flex-1 rounded-2xl bg-mineros-red px-5 py-3 font-bebas text-xl uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canRegisterPitch || savingPitch}
                onClick={() => void handleRegisterPitch()}
                type="button"
              >
                {savingPitch ? 'Registrando...' : `Registrar pitcheo · ${selectedPitchCall === 'strike' ? 'Strike' : 'Bola'}`}
              </button>
              <button
                className="rounded-2xl border border-mineros-gold/40 bg-mineros-gold/10 px-5 py-3 font-bebas text-xl uppercase tracking-[0.18em] text-mineros-gold transition hover:bg-mineros-gold/20 disabled:opacity-50"
                disabled={savingPitch}
                onClick={() => void handleQuickFoul()}
                type="button"
              >
                Foul
              </button>
              <button
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:border-white/35 hover:bg-white/10"
                onClick={() => setCurrentStep(2)}
                type="button"
              >
                Registrar resultado directo
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <StepBadge active={currentStep === 2} index={2} title="Resultado del turno" />

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {RESULT_OPTIONS.map((option) => {
                const active = selectedResult === option.value;
                return (
                  <button
                    key={option.value}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${resultToneClass(option.tone, active)}`}
                    onClick={() => {
                      setSelectedResult(option.value);
                      setCurrentStep(CONTACT_REQUIRED_RESULTS.has(option.value) ? 3 : 2);
                    }}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Bateador</p>
                <select
                  className="w-full rounded-xl border border-white/10 bg-broadcast-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-mineros-gold"
                  onChange={(event) => setSelectedBatterId(event.target.value)}
                  value={selectedBatterId}
                >
                  <option value="">Seleccionar…</option>
                  {context.battingLineup.map((player) => (
                    <option key={player.playerId} value={player.playerId}>
                      #{player.number} {player.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">RBI</p>
                <div className="flex items-center gap-2">
                  <button className="h-10 w-10 rounded-xl border border-white/10 bg-black/30 text-white hover:border-white/35" onClick={() => setRbi(Math.max(0, rbi - 1))} type="button">-</button>
                  <span className="flex-1 rounded-xl bg-black/30 py-2 text-center font-bebas text-3xl">{rbi}</span>
                  <button className="h-10 w-10 rounded-xl border border-white/10 bg-black/30 text-white hover:border-white/35" onClick={() => setRbi(rbi + 1)} type="button">+</button>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Carreras</p>
                <div className="flex items-center gap-2">
                  <button className="h-10 w-10 rounded-xl border border-white/10 bg-black/30 text-white hover:border-white/35" onClick={() => setRuns(Math.max(0, runs - 1))} type="button">-</button>
                  <span className="flex-1 rounded-xl bg-black/30 py-2 text-center font-bebas text-3xl">{runs}</span>
                  <button className="h-10 w-10 rounded-xl border border-white/10 bg-black/30 text-white hover:border-white/35" onClick={() => setRuns(runs + 1)} type="button">+</button>
                </div>
              </div>
            </div>
          </div>

          {selectedResult && CONTACT_REQUIRED_RESULTS.has(selectedResult) ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <StepBadge active={currentStep === 3} index={3} title="Captura ofensiva" />

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Tipo de contacto</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  {CONTACT_OPTIONS.map((option) => {
                    const active = selectedContactType === option.value;
                    return (
                      <button
                        key={option.value}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-white/5 text-white/75 hover:border-white/35'}`}
                        onClick={() => setSelectedContactType(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Dirección al campo</p>
                <div className="mx-auto grid max-w-md grid-cols-3 grid-rows-4 gap-2">
                  {DIRECTION_OPTIONS.map((option) => {
                    const active = selectedHitDirection === option.value;
                    return (
                      <button
                        key={option.value}
                        className={`${option.className} rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          active ? 'border-mineros-red bg-mineros-red text-white' : 'border-white/10 bg-white/5 text-white/75 hover:border-white/35'
                        }`}
                        onClick={() => setSelectedHitDirection(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="flex-1 rounded-2xl bg-mineros-red px-5 py-3 font-bebas text-xl uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSubmitAtBat || savingAtBat}
                  onClick={() => void handleSubmitAtBat()}
                  type="button"
                >
                  {savingAtBat ? 'Confirmando...' : 'Confirmar'}
                </button>
                <button
                  className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:border-white/35 hover:bg-white/10"
                  onClick={() => {
                    setSelectedContactType(null);
                    setSelectedHitDirection(null);
                    setCurrentStep(2);
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                className="rounded-2xl bg-mineros-red px-5 py-3 font-bebas text-xl uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmitAtBat || savingAtBat}
                onClick={() => void handleSubmitAtBat()}
                type="button"
              >
                {savingAtBat ? 'Registrando...' : 'Confirmar resultado'}
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3 md:col-span-2 xl:col-span-1">
          <p className="font-bebas text-2xl uppercase tracking-[0.18em] text-mineros-gold">Historial</p>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-white/45">Sin at-bats registrados.</p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <p className="truncate text-sm font-semibold text-white">
                    {item.batter_name ?? item.batter_player_id ?? item.player_id} · {formatHistoryResult(item.result)}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {item.inning_half === 'top' ? 'Alta' : 'Baja'} {item.inning}
                    {item.rbi > 0 ? ` · ${item.rbi} RBI` : ''}
                    {item.runs > 0 ? ` · ${item.runs} R` : ''}
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
