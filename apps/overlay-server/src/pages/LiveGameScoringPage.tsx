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

type PitchType =
  | 'Recta'
  | 'Sinker'
  | 'Cutter'
  | 'Slider'
  | 'Curva'
  | 'Cambio'
  | 'Splitter'
  | 'Nudillo'
  | 'Otro'
  | 'Riseball'
  | 'Dropball'
  | 'Screwball';
type PitchResult = 'ball' | 'called_strike' | 'swinging_strike' | 'foul' | 'in_play' | 'hit_by_pitch' | 'wild_pitch' | 'passed_ball';
type ContactType = 'line_drive' | 'fly_ball' | 'ground_ball' | 'bunt' | 'pop_up';
type HitDirection = 'LF' | 'LCF' | 'CF' | 'RCF' | 'RF' | '3B' | 'SS' | '2B' | '1B' | 'P' | 'C';
type BatterSide = 'R' | 'L' | 'S' | 'unknown';
type ActiveBatterSide = 'R' | 'L' | null;
type CatcherTargetMode = 'quick_3x3' | 'advanced_7x7' | 'same_as_location' | 'unknown';
type HitQuality = 'weak' | 'medium' | 'hard' | 'barrel';
type RunnerBase = '1B' | '2B' | '3B' | 'HOME' | 'OUT';

interface CatcherTarget {
  mode: CatcherTargetMode;
  col?: number;
  row?: number;
}

interface PitchMetrics {
  velocityMph: string;
  umpireId: string;
  videoTimestamp: string;
  note: string;
}

interface RunnerDetail {
  runner: 'BR' | 'R1' | 'R2' | 'R3';
  from: string;
  to: RunnerBase;
  runScored: boolean;
  rbiCredited: boolean;
}

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



const SERVER_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

const RESULT_OPTIONS: ResultOption[] = [
  { value: 'single', label: 'Sencillo', tone: 'hit' },
  { value: 'double', label: 'Doble', tone: 'hit' },
  { value: 'triple', label: 'Triple', tone: 'hit' },
  { value: 'home_run', label: 'Jonrón', tone: 'hit' },
  { value: 'walk', label: 'Base por bolas', tone: 'base' },
  { value: 'hbp', label: 'Golpeado por lanzamiento', tone: 'base' },
  { value: 'error', label: 'Error defensivo', tone: 'base' },
  { value: 'strikeout', label: 'Ponche', tone: 'outs' },
  { value: 'groundout', label: 'Rodado out', tone: 'outs' },
  { value: 'flyout', label: 'Elevado out', tone: 'outs' },
  { value: 'sacrifice_fly', label: 'Fly de sacrificio', tone: 'outs' },
  { value: 'sacrifice_bunt', label: 'Toque de sacrificio', tone: 'outs' },
  { value: 'fielders_choice', label: 'Elección del fildeador', tone: 'base' },
  { value: 'double_play', label: 'Doble play', tone: 'outs' },
];

const PITCH_TYPES_BASEBALL: PitchType[] = ['Recta', 'Sinker', 'Cutter', 'Slider', 'Curva', 'Cambio', 'Splitter', 'Nudillo', 'Otro'];
const PITCH_TYPES_SOFTBALL: PitchType[] = ['Recta', 'Cambio', 'Riseball', 'Dropball', 'Curva', 'Screwball', 'Otro'];

interface PitchResultOption {
  value: PitchResult;
  label: string;
  group: 'count' | 'special';
  countsAs: 'ball' | 'strike' | 'foul' | 'none';
}

const PITCH_RESULT_OPTIONS: PitchResultOption[] = [
  { value: 'ball', label: 'Bola', group: 'count', countsAs: 'ball' },
  { value: 'called_strike', label: 'Strike cantado', group: 'count', countsAs: 'strike' },
  { value: 'swinging_strike', label: 'Swing strike', group: 'count', countsAs: 'strike' },
  { value: 'foul', label: 'Foul', group: 'count', countsAs: 'foul' },
  { value: 'in_play', label: 'En juego', group: 'count', countsAs: 'none' },
  { value: 'hit_by_pitch', label: 'Golpeado por lanzamiento', group: 'special', countsAs: 'none' },
  { value: 'wild_pitch', label: 'Wild pitch', group: 'special', countsAs: 'none' },
  { value: 'passed_ball', label: 'Passed ball', group: 'special', countsAs: 'none' },
];

const CONTACT_OPTIONS: ContactOption[] = [
  { value: 'ground_ball', label: 'Rolling' },
  { value: 'line_drive', label: 'Línea' },
  { value: 'fly_ball', label: 'Fly' },
  { value: 'pop_up', label: 'Pop' },
  { value: 'bunt', label: 'Toque' },
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
  'groundout',
  'flyout',
]);

// Contacto inferido automáticamente del resultado
const RESULT_AUTO_CONTACT: Partial<Record<AtBatResult, ContactType>> = {
  groundout: 'ground_ball',
  double_play: 'ground_ball',
  flyout: 'fly_ball',
  sacrifice_fly: 'fly_ball',
  sacrifice_bunt: 'bunt',
  home_run: 'fly_ball',
};

const QUICK_3X3_ZONES = [
  { label: 'A-Ad', col: 1, row: 1 },
  { label: 'A-C', col: 3, row: 1 },
  { label: 'A-Af', col: 5, row: 1 },
  { label: 'M-Ad', col: 1, row: 3 },
  { label: 'M-C', col: 3, row: 3 },
  { label: 'M-Af', col: 5, row: 3 },
  { label: 'B-Ad', col: 1, row: 5 },
  { label: 'B-C', col: 3, row: 5 },
  { label: 'B-Af', col: 5, row: 5 },
] as const;

const HIT_QUALITY_OPTIONS = [
  { value: 'weak' as HitQuality, label: 'Débil' },
  { value: 'medium' as HitQuality, label: 'Normal' },
  { value: 'hard' as HitQuality, label: 'Fuerte' },
  { value: 'barrel' as HitQuality, label: 'Muy fuerte' },
];

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

function getPitchWarning(
  result: PitchResult | null,
  cell: PitchGridCell | null,
  gs: GameState | null,
): string | null {
  if (!result || !cell) return null;
  const inZone = cell.col >= 2 && cell.col <= 4 && cell.row >= 2 && cell.row <= 4;
  if (result === 'called_strike' && !inZone) return '⚠ Strike cantado fuera de zona';
  if (result === 'ball' && inZone) return '⚠ Bola dentro de la zona de strike';
  if ((result === 'wild_pitch' || result === 'passed_ball') && gs) {
    const hasRunners = gs.bases.first || gs.bases.second || gs.bases.third;
    if (hasRunners) return '⚠ WP/PB con corredores — confirma si avanzan';
  }
  return null;
}


export function LiveGameScoringPage() {
  const [context, setContext] = useState<ScorerContextPayload | null>(null);
  const [history, setHistory] = useState<AtBatHistoryItem[]>([]);
  const [selectedBatterId, setSelectedBatterId] = useState('');
  const [selectedPitcherId, setSelectedPitcherId] = useState('');
  const [selectedPitchCell, setSelectedPitchCell] = useState<PitchGridCell | null>(null);
  const [selectedPitchResult, setSelectedPitchResult] = useState<PitchResult | null>(null);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType | ''>('');
  const [selectedResult, setSelectedResult] = useState<AtBatResult | null>(null);
  const [selectedContactType, setSelectedContactType] = useState<ContactType | null>(null);
  const [selectedHitDirection, setSelectedHitDirection] = useState<HitDirection | null>(null);
  const [selectedHitQuality, setSelectedHitQuality] = useState<HitQuality | null>(null);
  const [runnerDetails, setRunnerDetails] = useState<RunnerDetail[]>([]);
  const [outSequence, setOutSequence] = useState('');
  const [catcherTarget, setCatcherTarget] = useState<CatcherTarget>({ mode: 'unknown' });
  const [pitchMetrics, setPitchMetrics] = useState<PitchMetrics>({ velocityMph: '', umpireId: '', videoTimestamp: '', note: '' });
  const [showMetrics, setShowMetrics] = useState(false);
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
      setSelectedHitQuality(null);
      setRunnerDetails([]);
      if (selectedResult) {
        setCurrentStep(2);
      }
    } else {
      setCurrentStep(3);
    }
  }, [selectedResult]);

  useEffect(() => {
    if (!selectedPitchType) {
      return;
    }

    const sport = (context?.gameState.rules as { sport?: string } | undefined)?.sport;
    const currentPitchTypes = sport === 'softball' ? PITCH_TYPES_SOFTBALL : PITCH_TYPES_BASEBALL;
    if (!currentPitchTypes.includes(selectedPitchType)) {
      setSelectedPitchType('');
    }
  }, [context, selectedPitchType]);

  useEffect(() => {
    if (catcherTarget.mode !== 'same_as_location' || !selectedPitchCell) {
      return;
    }

    setCatcherTarget({ mode: 'same_as_location', col: selectedPitchCell.col, row: selectedPitchCell.row });
  }, [catcherTarget.mode, selectedPitchCell]);

  useEffect(() => {
    if (currentStep !== 3 || !context) return;
    const gs = context.gameState;
    const initial: RunnerDetail[] = [];
    initial.push({ runner: 'BR', from: 'HOME', to: '1B', runScored: false, rbiCredited: false });
    if (gs.bases.first) initial.push({ runner: 'R1', from: '1B', to: '2B', runScored: false, rbiCredited: false });
    if (gs.bases.second) initial.push({ runner: 'R2', from: '2B', to: '3B', runScored: false, rbiCredited: false });
    if (gs.bases.third) initial.push({ runner: 'R3', from: '3B', to: 'HOME', runScored: false, rbiCredited: false });
    setRunnerDetails(initial);
  }, [currentStep, context]);

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
  const pitchTypes = (context?.gameState.rules as { sport?: string } | undefined)?.sport === 'softball'
    ? PITCH_TYPES_SOFTBALL
    : PITCH_TYPES_BASEBALL;
  const pitchResultOption = PITCH_RESULT_OPTIONS.find((o) => o.value === selectedPitchResult) ?? null;
  const selectedPitchReading = getTacticalReading(selectedPitchCell, activeBattingSide, batterSide);
  const pitchWarning = getPitchWarning(selectedPitchResult, selectedPitchCell, context?.gameState ?? null);
  const canRegisterPitch = Boolean(selectedPitchCell && selectedPitchResult && selectedPitchType && selectedPitchResult !== 'in_play');
  const canSubmitAtBat = Boolean(
    context &&
      selectedBatterId &&
      selectedResult &&
      (!CONTACT_REQUIRED_RESULTS.has(selectedResult) || (selectedContactType && selectedHitDirection)),
  );

  const resetAtBatWorkflow = useCallback(() => {
    setSelectedPitchCell(null);
    setSelectedPitchResult(null);
    setSelectedPitchType('');
    setSelectedResult(null);
    setSelectedContactType(null);
    setSelectedHitDirection(null);
    setSelectedHitQuality(null);
    setRunnerDetails([]);
    setOutSequence('');
    setCatcherTarget({ mode: 'unknown' });
    setPitchMetrics({ velocityMph: '', umpireId: '', videoTimestamp: '', note: '' });
    setShowMetrics(false);
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
    if (!context || !selectedPitchCell || !selectedPitchResult || !selectedPitchType || savingPitch) {
      return;
    }

    setSavingPitch(true);
    setError(null);

    try {
      const velocityMph = pitchMetrics.velocityMph ? Number.parseFloat(pitchMetrics.velocityMph) : undefined;

      if (selectedPitchResult === 'in_play') {
        // Registrar el pitcheo sin modificar conteo, luego pasar a captura ofensiva
        await requestJson<{ action: string }>('/pitch', {
          method: 'POST',
          body: JSON.stringify({
            type: 'in_play',
            col: selectedPitchCell.col,
            row: selectedPitchCell.row,
            pitchType: selectedPitchType,
            velocityMph: Number.isFinite(velocityMph) ? velocityMph : undefined,
            umpireId: pitchMetrics.umpireId || undefined,
            videoTimestamp: pitchMetrics.videoTimestamp || undefined,
            note: pitchMetrics.note || undefined,
            catcherTargetMode: catcherTarget.mode,
            catcherTargetCol: catcherTarget.col,
            catcherTargetRow: catcherTarget.row,
          }),
        });
        showPitchFeedback('En juego — captura ofensiva');
        setCurrentStep(3);
        return;
      }

      const result = await requestJson<{ action: string }>('/pitch', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedPitchResult,
          col: selectedPitchCell.col,
          row: selectedPitchCell.row,
          pitchType: selectedPitchType,
          velocityMph: Number.isFinite(velocityMph) ? velocityMph : undefined,
          umpireId: pitchMetrics.umpireId || undefined,
          videoTimestamp: pitchMetrics.videoTimestamp || undefined,
          note: pitchMetrics.note || undefined,
          catcherTargetMode: catcherTarget.mode,
          catcherTargetCol: catcherTarget.col,
          catcherTargetRow: catcherTarget.row,
        }),
      });

      const labels: Record<string, string> = {
        ball_added: 'Bola registrada',
        strike_added: 'Strike registrado',
        auto_walk: 'Base por bolas automática',
        auto_strikeout: 'Ponche automático',
        hbp: 'Golpeado — avanza a 1ª',
        recorded: 'Lanzamiento registrado',
      };

      showPitchFeedback(labels[result.action] ?? result.action);
      setSelectedPitchCell(null);
      setSelectedPitchResult(null);
      setSelectedPitchType('');
      const autoAdvance = result.action === 'auto_walk' || result.action === 'auto_strikeout' || result.action === 'hbp';
      await loadContext(autoAdvance);

      if (autoAdvance) {
        resetAtBatWorkflow();
      }
    } catch (pitchError) {
      setError(pitchError instanceof Error ? pitchError.message : 'No se pudo registrar el pitcheo');
    } finally {
      setSavingPitch(false);
    }
  }, [catcherTarget, context, loadContext, pitchMetrics, resetAtBatWorkflow, savingPitch, selectedPitchCell, selectedPitchResult, selectedPitchType, showPitchFeedback]);

  const handleQuickFoul = useCallback(async () => {
    if (!context || savingPitch) {
      return;
    }

    setSavingPitch(true);
    setError(null);

    try {
      const velocityMph = pitchMetrics.velocityMph ? Number.parseFloat(pitchMetrics.velocityMph) : undefined;
      const result = await requestJson<{ action: string }>('/pitch', {
        method: 'POST',
        body: JSON.stringify({
          type: 'foul',
          col: selectedPitchCell?.col,
          row: selectedPitchCell?.row,
          pitchType: selectedPitchType || undefined,
          velocityMph: Number.isFinite(velocityMph) ? velocityMph : undefined,
          umpireId: pitchMetrics.umpireId || undefined,
          videoTimestamp: pitchMetrics.videoTimestamp || undefined,
          note: pitchMetrics.note || undefined,
          catcherTargetMode: catcherTarget.mode,
          catcherTargetCol: catcherTarget.col,
          catcherTargetRow: catcherTarget.row,
        }),
      });

      showPitchFeedback(result.action === 'no_op' ? 'Foul sin cambio de conteo' : 'Foul registrado');
      setSelectedPitchCell(null);
      setSelectedPitchResult(null);
      setSelectedPitchType('');
      await loadContext();
    } catch (pitchError) {
      setError(pitchError instanceof Error ? pitchError.message : 'No se pudo registrar el foul');
    } finally {
      setSavingPitch(false);
    }
  }, [catcherTarget, context, loadContext, pitchMetrics, savingPitch, selectedPitchCell, selectedPitchType, showPitchFeedback]);

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
      // El pitcheo in_play ya fue registrado en handleRegisterPitch
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
          hitQuality: selectedHitQuality ?? undefined,
          outSequence: outSequence || undefined,
          runnersJson: runnerDetails.length > 0 ? JSON.stringify(runnerDetails) : undefined,
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
  }, [catcherTarget, context, loadContext, pitchMetrics, resetAtBatWorkflow, rbi, runnerDetails, outSequence, runs, selectedBatterId, selectedContactType, selectedHitDirection, selectedHitQuality, selectedPitchCell, selectedPitcherId, selectedPitchResult, selectedPitchType, selectedResult, showPitchFeedback]);

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
    <div className="flex h-screen min-w-[900px] flex-col overflow-hidden bg-broadcast-black text-white">
      {/* ── HEADER COMPACTO: 1 sola fila ──────────────────────────────── */}
      <header className="flex h-12 flex-none items-center gap-3 border-b border-white/10 bg-mineros-navy px-4">
        <span className="font-bebas text-xl uppercase tracking-[0.22em] text-mineros-gold">Live Scoring</span>
        <span className="text-white/20">·</span>
        <span className="text-xs uppercase tracking-wider text-white/55 whitespace-nowrap">{awayName} @ {homeName}</span>
        <span className="rounded-full border border-mineros-gold/30 bg-mineros-gold/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-mineros-gold">
          {formatInningLabel(context.currentInning, context.inningHalf)}
        </span>
        <div className="flex-1" />
        <span className="text-[10px] uppercase tracking-wider text-white/35">Conteo</span>
        <span className="font-bebas text-2xl leading-none text-blue-300">{gs.count.balls}</span>
        <span className="text-white/25">–</span>
        <span className="font-bebas text-2xl leading-none text-red-300">{gs.count.strikes}</span>
        <span className="text-white/20">·</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full border ${i < gs.outs ? 'border-mineros-red bg-mineros-red' : 'border-white/25 bg-transparent'}`} />
          ))}
        </div>
        <div className="relative h-[22px] w-[22px]">
          <span className={`absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border ${gs.bases.second ? 'border-mineros-gold bg-mineros-gold' : 'border-white/30 bg-transparent'}`} />
          <span className={`absolute bottom-0 left-0 h-2.5 w-2.5 rotate-45 border ${gs.bases.third ? 'border-mineros-gold bg-mineros-gold' : 'border-white/30 bg-transparent'}`} />
          <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rotate-45 border ${gs.bases.first ? 'border-mineros-gold bg-mineros-gold' : 'border-white/30 bg-transparent'}`} />
        </div>
        <span className="text-white/20">·</span>
        <span className="font-bebas text-sm text-white/70 whitespace-nowrap">
          {awayName} <span className="text-mineros-gold">{gs.score.away}</span>
          <span className="mx-1 text-white/30">–</span>
          {homeName} <span className="text-mineros-gold">{gs.score.home}</span>
        </span>
        <span className="text-white/20">·</span>
        <span className="max-w-[130px] truncate text-xs text-white/60">
          {selectedBatter ? `#${selectedBatter.number} ${selectedBatter.name}` : '—'}
        </span>
        {pitchFeedback ? (
          <span className="ml-1 rounded-full border border-mineros-gold/30 bg-mineros-gold/10 px-3 py-0.5 text-[11px] font-semibold text-mineros-gold whitespace-nowrap">
            {pitchFeedback}
          </span>
        ) : null}
      </header>


      {/* ERROR BAR */}
      {error ? (
        <div className="flex-none px-3 pt-1.5">
          <div className="rounded-lg border border-mineros-red/40 bg-mineros-red/10 px-3 py-1.5 text-xs text-red-100">{error}</div>
        </div>
      ) : null}

      {/* ── MAIN 3 COLUMNS ──────────────────────────────────────────────── */}
      <main className="grid flex-1 gap-2 overflow-hidden p-2 grid-cols-[200px_minmax(0,1fr)_180px]">

        {/* ── COLUMNA IZQUIERDA ───────────────────────────────────────── */}
        <aside className="flex flex-col gap-2 overflow-y-auto">
          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Bateador</p>
            <select
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none transition focus:border-mineros-gold"
              onChange={(e) => { setSelectedBatterId(e.target.value); setBattingSideOverride(null); }}
              value={selectedBatterId}
            >
              <option value="">Seleccionar…</option>
              {context.battingLineup.map((player) => {
                const side = normalizeBatterSide(context.playerMeta[player.playerId]?.bats);
                return (
                  <option key={player.playerId} value={player.playerId}>
                    #{player.number} {player.name}{side !== 'unknown' ? ` · ${side}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {gs.rules.hasPitcher ? (
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Pitcher</p>
              <div className="flex gap-1.5">
                <select
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none transition focus:border-mineros-gold"
                  onChange={(e) => setSelectedPitcherId(e.target.value)}
                  value={selectedPitcherId}
                >
                  <option value="">Seleccionar…</option>
                  {context.pitchingLineup.map((player) => (
                    <option key={player.playerId} value={player.playerId}>#{player.number} {player.name}</option>
                  ))}
                </select>
                <button
                  className="rounded-lg border border-mineros-gold/40 bg-mineros-gold/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-mineros-gold transition hover:bg-mineros-gold/20 disabled:opacity-40"
                  disabled={savingPitcher || !selectedPitcherId || selectedPitcherId === context.currentPitcher?.playerId}
                  onClick={() => void handleApplyPitcherChange()}
                  type="button"
                >
                  {savingPitcher ? '…' : 'Cambio'}
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Bases</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['first', 'second', 'third'] as const).map((base) => {
                const label = base === 'first' ? '1ª' : base === 'second' ? '2ª' : '3ª';
                return (
                  <button
                    key={base}
                    className={`rounded-lg border py-1.5 text-xs font-bold transition ${gs.bases[base] ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/15 bg-black/20 text-white/60 hover:border-white/35'}`}
                    disabled={savingBase !== null}
                    onClick={() => void handleToggleBase(base)}
                    type="button"
                  >
                    {savingBase === base ? '…' : label}
                  </button>
                );
              })}
            </div>
          </div>

          {currentPitcherStats ? (
            <div className="rounded-lg border border-mineros-gold/20 bg-mineros-gold/5 p-2">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-mineros-gold">Stats pitcher</p>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-white/75">
                {([['IP', currentPitcherStats.ip], ['P', String(currentPitcherStats.pitches)], ['K', String(currentPitcherStats.strikeouts)], ['BB', String(currentPitcherStats.walks)], ['H', String(currentPitcherStats.hitsAllowed)], ['R', String(currentPitcherStats.runsAllowed)]] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="rounded bg-black/20 px-1.5 py-1 text-center">
                    <span className="block text-[9px] text-white/35">{label}</span>
                    {value}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </aside>

        {/* ── COLUMNA CENTRAL — PASOS ──────────────────────────────────── */}
        <section className="flex flex-col gap-2 overflow-y-auto">

          {/* Tabs de paso */}
          <div className="flex flex-none gap-1 rounded-xl bg-black/25 p-1">
            {([
              [1, '① Lanzamiento'],
              [2, '② Resultado'],
              [3, '③ En juego'],
            ] as const).map(([step, label]) => (
              <button
                key={step}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold uppercase tracking-wider transition ${currentStep === step ? 'bg-mineros-navy text-mineros-gold shadow' : 'text-white/40 hover:text-white/70'}`}
                onClick={() => setCurrentStep(step)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {/* ─ PASO 1: CAPTURA DE LANZAMIENTO ─ */}
          {currentStep === 1 ? (
            <div className="flex flex-col gap-2">

              {/* Mano / Corregir lado */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5">
                {shouldPromptBattingSide ? (
                  <>
                    <span className="text-[11px] font-semibold text-mineros-gold">Corregir lado</span>
                    <div className="flex gap-1.5">
                      {(['R', 'L'] as const).map((side) => (
                        <button
                          key={side}
                          className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${activeBattingSide === side ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/15 bg-white/5 text-white/75 hover:border-white/35'}`}
                          onClick={() => setBattingSideOverride(side)}
                          type="button"
                        >
                          {side === 'R' ? 'Derecho' : 'Zurdo'}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-white/55">
                      Mano: <span className="font-semibold text-mineros-gold">{formatBatterSideLabel(batterSide)}</span>
                      <span className="mx-2 text-white/25">·</span>
                      <span className="text-white/70">{selectedPitchReading}</span>
                    </span>
                    <div className="flex gap-1">
                      {(['R', 'L'] as const).map((side) => (
                        <button
                          key={side}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${activeBattingSide === side ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/15 bg-black/20 text-white/50 hover:border-white/30'}`}
                          onClick={() => setBattingSideOverride(side === inferredActiveBattingSide ? null : side)}
                          type="button"
                        >
                          {side}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Objetivo receptor + grilla: 2 columnas */}
              <div className="grid grid-cols-[auto_1fr] gap-2 items-start">

                {/* Grilla de lanzamiento */}
                <PitchGrid
                  activeBattingSide={activeBattingSide}
                  batterSide={batterSide}
                  onSelect={setSelectedPitchCell}
                  selectedCell={selectedPitchCell}
                />

                {/* Panel derecho del paso 1 */}
                <div className="flex flex-col gap-2">

                  {/* Objetivo receptor compacto */}
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-mineros-gold/70">Objetivo receptor</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        { mode: 'quick_3x3' as const, label: 'Rápido 3×3' },
                        { mode: 'advanced_7x7' as const, label: 'Avanzado' },
                        { mode: 'same_as_location' as const, label: '= Ubicación' },
                        { mode: 'unknown' as const, label: 'Desconocido' },
                      ]).map((option) => {
                        const active = catcherTarget.mode === option.mode;
                        return (
                          <button
                            key={option.mode}
                            className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold transition ${active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-black/20 text-white/50 hover:border-white/25'}`}
                            onClick={() => {
                              if (option.mode === 'same_as_location') {
                                setCatcherTarget({ mode: 'same_as_location', col: selectedPitchCell?.col, row: selectedPitchCell?.row });
                              } else if (option.mode === 'unknown') {
                                setCatcherTarget({ mode: 'unknown' });
                              } else {
                                setCatcherTarget({ mode: option.mode });
                              }
                            }}
                            type="button"
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    {catcherTarget.mode === 'quick_3x3' ? (
                      <div className="mt-1.5 grid grid-cols-3 gap-1">
                        {QUICK_3X3_ZONES.map((zone) => {
                          const active = catcherTarget.col === zone.col && catcherTarget.row === zone.row;
                          return (
                            <button
                              key={zone.label}
                              className={`rounded-md border py-1 text-[10px] font-semibold transition ${active ? 'border-mineros-red bg-mineros-red text-white' : 'border-white/10 bg-black/20 text-white/55 hover:border-white/25'}`}
                              onClick={() => setCatcherTarget({ mode: 'quick_3x3', col: zone.col, row: zone.row })}
                              type="button"
                            >
                              {zone.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {/* Resultado del lanzamiento */}
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Resultado</p>
                    <div className="grid grid-cols-2 gap-1">
                      {PITCH_RESULT_OPTIONS.map((option) => {
                        const active = selectedPitchResult === option.value;
                        const colorClass = option.countsAs === 'ball'
                          ? (active ? 'border-blue-400 bg-blue-500 text-white' : 'border-blue-400/30 bg-blue-500/10 text-blue-200')
                          : option.countsAs === 'strike'
                            ? (active ? 'border-mineros-red bg-mineros-red text-white' : 'border-mineros-red/30 bg-mineros-red/10 text-red-200')
                            : option.value === 'in_play'
                              ? (active ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200')
                              : (active ? 'border-white/60 bg-white/15 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/25');
                        return (
                          <button
                            key={option.value}
                            className={`rounded-lg border py-1.5 text-[10px] font-semibold leading-tight transition ${colorClass}`}
                            onClick={() => {
                              setSelectedPitchResult(option.value);
                              if (option.value === 'in_play') setCurrentStep(3);
                            }}
                            type="button"
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Warning */}
                  {pitchWarning ? (
                    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-2 py-1 text-[10px] font-semibold text-yellow-200">
                      {pitchWarning}
                    </div>
                  ) : null}

                  {/* Tipo de lanzamiento */}
                  <div>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Tipo de lanzamiento</p>
                    <div className="grid grid-cols-3 gap-1">
                      {pitchTypes.map((pitchType) => {
                        const active = selectedPitchType === pitchType;
                        return (
                          <button
                            key={pitchType}
                            className={`rounded-lg border py-1.5 text-[10px] font-semibold transition ${active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-white/5 text-white/65 hover:border-white/30'}`}
                            onClick={() => setSelectedPitchType(pitchType)}
                            type="button"
                          >
                            {pitchType}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Métricas opcionales */}
                  <div>
                    <button
                      className="text-[9px] font-semibold text-white/35 transition hover:text-white/60"
                      onClick={() => setShowMetrics((v) => !v)}
                      type="button"
                    >
                      {showMetrics ? '▴' : '▾'} Métricas
                    </button>
                    {showMetrics ? (
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        <input className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white outline-none focus:border-mineros-gold" max="120" min="0" placeholder="km/h" type="number" onChange={(e) => setPitchMetrics((c) => ({ ...c, velocityMph: e.target.value }))} value={pitchMetrics.velocityMph} />
                        <input className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white outline-none focus:border-mineros-gold" placeholder="HP-01" type="text" onChange={(e) => setPitchMetrics((c) => ({ ...c, umpireId: e.target.value }))} value={pitchMetrics.umpireId} />
                        <input className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white outline-none focus:border-mineros-gold" placeholder="00:42:18" type="text" onChange={(e) => setPitchMetrics((c) => ({ ...c, videoTimestamp: e.target.value }))} value={pitchMetrics.videoTimestamp} />
                        <input className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white outline-none focus:border-mineros-gold" placeholder="Nota…" type="text" onChange={(e) => setPitchMetrics((c) => ({ ...c, note: e.target.value }))} value={pitchMetrics.note} />
                      </div>
                    ) : null}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex flex-col gap-1.5 mt-auto">
                    {selectedPitchResult === 'in_play' ? (
                      <button
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 font-bebas text-base uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        disabled={!selectedPitchCell || !selectedPitchType}
                        onClick={() => setCurrentStep(3)}
                        type="button"
                      >
                        En juego → Captura ofensiva
                      </button>
                    ) : (
                      <button
                        className="rounded-xl bg-mineros-red px-4 py-2.5 font-bebas text-base uppercase tracking-[0.16em] text-white transition hover:bg-red-700 disabled:opacity-50"
                        disabled={!canRegisterPitch || savingPitch}
                        onClick={() => void handleRegisterPitch()}
                        type="button"
                      >
                        {savingPitch ? 'Registrando…' : selectedPitchResult ? `Registrar · ${pitchResultOption?.label ?? ''}` : 'Registrar pitcheo'}
                      </button>
                    )}
                    <div className="flex gap-1.5">
                      <button
                        className="flex-1 rounded-xl border border-mineros-gold/40 bg-mineros-gold/10 px-3 py-2 font-bebas text-base uppercase tracking-[0.16em] text-mineros-gold transition hover:bg-mineros-gold/20 disabled:opacity-50"
                        disabled={savingPitch}
                        onClick={() => void handleQuickFoul()}
                        type="button"
                      >
                        Foul
                      </button>
                      <button
                        className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/55 transition hover:border-white/30"
                        onClick={() => setCurrentStep(2)}
                        type="button"
                      >
                        Resultado directo
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          ) : null}

          {/* ─ PASO 2: RESULTADO DEL TURNO ─ */}
          {currentStep === 2 ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-4 gap-1.5">
                {RESULT_OPTIONS.map((option) => {
                  const active = selectedResult === option.value;
                  return (
                    <button
                      key={option.value}
                      className={`rounded-lg border py-2 text-[11px] font-semibold uppercase tracking-wider transition ${resultToneClass(option.tone, active)}`}
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

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Bateador</p>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none transition focus:border-mineros-gold"
                    onChange={(e) => setSelectedBatterId(e.target.value)}
                    value={selectedBatterId}
                  >
                    <option value="">Seleccionar…</option>
                    {context.battingLineup.map((player) => (
                      <option key={player.playerId} value={player.playerId}>#{player.number} {player.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">RBI</p>
                  <div className="flex items-center gap-1">
                    <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRbi(Math.max(0, rbi - 1))} type="button">−</button>
                    <span className="w-8 rounded-lg bg-black/30 py-1 text-center font-bebas text-2xl">{rbi}</span>
                    <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRbi(rbi + 1)} type="button">+</button>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Carreras</p>
                  <div className="flex items-center gap-1">
                    <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRuns(Math.max(0, runs - 1))} type="button">−</button>
                    <span className="w-8 rounded-lg bg-black/30 py-1 text-center font-bebas text-2xl">{runs}</span>
                    <button className="h-8 w-8 rounded-lg border border-white/10 bg-black/30 text-sm text-white hover:border-white/30" onClick={() => setRuns(runs + 1)} type="button">+</button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  className="rounded-xl bg-mineros-red px-6 py-2.5 font-bebas text-lg uppercase tracking-[0.16em] text-white transition hover:bg-red-700 disabled:opacity-50"
                  disabled={!canSubmitAtBat || savingAtBat}
                  onClick={() => void handleSubmitAtBat()}
                  type="button"
                >
                  {savingAtBat ? 'Registrando…' : 'Confirmar resultado'}
                </button>
              </div>
            </div>
          ) : null}

          {/* ─ PASO 3: CAPTURA OFENSIVA ─ */}
          {currentStep === 3 ? (
            <div className="flex flex-col gap-2">

              {/* Resultado del turno — requerido para in_play */}
              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                  Resultado del turno
                  {!selectedResult ? <span className="ml-2 text-mineros-red">← requerido</span> : null}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {RESULT_OPTIONS.filter((o) =>
                    !['walk', 'hbp', 'strikeout'].includes(o.value)
                  ).map((option) => {
                    const active = selectedResult === option.value;
                    return (
                      <button
                        key={option.value}
                        className={`rounded-lg border py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${resultToneClass(option.tone, active)}`}
                        onClick={() => {
                          setSelectedResult(option.value);
                          const autoContact = RESULT_AUTO_CONTACT[option.value];
                          if (autoContact) setSelectedContactType(autoContact);
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RBI + Carreras inline */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">RBI</span>
                  <button className="h-7 w-7 rounded-lg border border-white/10 bg-black/30 text-xs text-white hover:border-white/30" onClick={() => setRbi(Math.max(0, rbi - 1))} type="button">−</button>
                  <span className="w-7 rounded-lg bg-black/30 py-0.5 text-center font-bebas text-xl">{rbi}</span>
                  <button className="h-7 w-7 rounded-lg border border-white/10 bg-black/30 text-xs text-white hover:border-white/30" onClick={() => setRbi(rbi + 1)} type="button">+</button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Carreras</span>
                  <button className="h-7 w-7 rounded-lg border border-white/10 bg-black/30 text-xs text-white hover:border-white/30" onClick={() => setRuns(Math.max(0, runs - 1))} type="button">−</button>
                  <span className="w-7 rounded-lg bg-black/30 py-0.5 text-center font-bebas text-xl">{runs}</span>
                  <button className="h-7 w-7 rounded-lg border border-white/10 bg-black/30 text-xs text-white hover:border-white/30" onClick={() => setRuns(runs + 1)} type="button">+</button>
                </div>
              </div>

              {/* Contacto + Calidad en 2 columnas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Contacto</p>
                  <div className="grid grid-cols-3 gap-1">
                    {CONTACT_OPTIONS.map((option) => {
                      const active = selectedContactType === option.value;
                      return (
                        <button
                          key={option.value}
                          className={`rounded-lg border py-1.5 text-[11px] font-semibold transition ${active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-white/5 text-white/65 hover:border-white/30'}`}
                          onClick={() => setSelectedContactType(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Calidad</p>
                  <div className="grid grid-cols-2 gap-1">
                    {HIT_QUALITY_OPTIONS.map((option) => {
                      const active = selectedHitQuality === option.value;
                      const colorClass =
                        option.value === 'weak' ? (active ? 'border-slate-200 bg-slate-500 text-white' : 'border-slate-400/30 bg-slate-500/10 text-slate-200')
                        : option.value === 'medium' ? (active ? 'border-blue-300 bg-blue-500 text-white' : 'border-blue-400/30 bg-blue-500/10 text-blue-200')
                        : option.value === 'hard' ? (active ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-mineros-gold/30 bg-mineros-gold/10 text-amber-200')
                        : (active ? 'border-mineros-red bg-mineros-red text-white' : 'border-mineros-red/30 bg-mineros-red/10 text-red-200');
                      return (
                        <button
                          key={option.value}
                          className={`rounded-lg border py-1.5 text-[11px] font-semibold transition ${colorClass}`}
                          onClick={() => setSelectedHitQuality(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Campo + Corredores + Via del out */}
              <div className="grid grid-cols-2 gap-2 items-start">

                {/* Diagrama de campo con referencia visual */}
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Dirección al campo</p>
                  {/* Outfield: fila 1 */}
                  <div className="grid grid-cols-5 gap-1 mb-0.5">
                    {(['LF','LCF','CF','RCF','RF'] as const).map((z) => {
                      const active = selectedHitDirection === z;
                      return (
                        <button key={z} className={`rounded-t-full border py-2 text-[10px] font-bold transition ${active ? 'border-mineros-red bg-mineros-red text-white' : 'border-white/10 bg-white/5 text-white/55 hover:border-white/30'}`}
                          onClick={() => setSelectedHitDirection(z)} type="button">{z}
                        </button>
                      );
                    })}
                  </div>
                  {/* Infield: fila 2 */}
                  <div className="grid grid-cols-5 gap-1 mb-0.5">
                    {(['3B','SS',null,'2B','1B'] as const).map((z, i) =>
                      z ? (
                        <button key={z} className={`rounded-lg border py-2 text-[10px] font-bold transition ${selectedHitDirection === z ? 'border-mineros-red bg-mineros-red text-white' : 'border-white/10 bg-white/5 text-white/55 hover:border-white/30'}`}
                          onClick={() => setSelectedHitDirection(z)} type="button">{z}
                        </button>
                      ) : (
                        <div key={`gap-${i}`} className="rounded-lg border border-white/5 bg-white/2 py-2 text-center text-[9px] text-white/20">◆</div>
                      )
                    )}
                  </div>
                  {/* Pitcher + Home: fila 3 */}
                  <div className="grid grid-cols-5 gap-1">
                    <div className="col-span-2" />
                    {(['P','C'] as const).map((z) => {
                      const active = selectedHitDirection === z;
                      return (
                        <button key={z} className={`rounded-lg border py-2 text-[10px] font-bold transition ${active ? 'border-mineros-red bg-mineros-red text-white' : 'border-white/10 bg-white/5 text-white/55 hover:border-white/30'}`}
                          onClick={() => setSelectedHitDirection(z)} type="button">{z === 'P' ? 'Lanz.' : 'C'}</button>
                      );
                    })}
                    <div />
                  </div>

                  {/* Via del out / secuencia de fildeadores */}
                  <div className="mt-2">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                      Vía del out <span className="text-white/25 normal-case">(ej: 6-4-3, 5-3, 1-3)</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder-white/25 focus:border-mineros-gold"
                        placeholder="6-4-3"
                        type="text"
                        value={outSequence}
                        onChange={(e) => setOutSequence(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {['6-3','5-3','4-3','6-4-3','5-4-3','1-3'].map((seq) => (
                          <button key={seq} className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold transition ${outSequence === seq ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-black/30 text-white/45 hover:border-white/25'}`}
                            onClick={() => setOutSequence(outSequence === seq ? '' : seq)} type="button">{seq}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corredores */}
                <div>
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    Corredores
                    <span className="ml-1 text-[8px] text-white/25 normal-case">— ajusta destino si difiere</span>
                  </p>
                  {runnerDetails.length === 0 ? (
                    <p className="text-[10px] text-white/30">Sin corredores en base.</p>
                  ) : (
                    <div className="space-y-1">
                      {runnerDetails.map((detail, index) => {
                        const runnerLabel = detail.runner === 'BR' ? 'BR (bateador)' : `${detail.runner} (${detail.from})`;
                        return (
                          <div key={`${detail.runner}-${detail.from}`} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] font-bold text-mineros-gold w-[90px] truncate">{runnerLabel}</span>
                              <span className="text-[9px] text-white/30">→</span>
                              <div className="flex gap-0.5 flex-1">
                                {(['1B','2B','3B','HOME','OUT'] as const).map((base) => (
                                  <button
                                    key={base}
                                    className={`flex-1 rounded border py-0.5 text-[9px] font-bold transition ${detail.to === base ? (base === 'OUT' ? 'border-mineros-red bg-mineros-red text-white' : base === 'HOME' ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-mineros-gold bg-mineros-gold text-mineros-navy') : 'border-white/10 bg-black/20 text-white/40 hover:border-white/25'}`}
                                    onClick={() => setRunnerDetails((cur) => cur.map((r, i) => i === index ? { ...r, to: base, runScored: base === 'HOME' } : r))}
                                    type="button"
                                  >{base}</button>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <label className="flex items-center gap-1 text-[9px] text-white/50 cursor-pointer">
                                <input checked={detail.runScored} className="h-3 w-3" type="checkbox"
                                  onChange={(e) => setRunnerDetails((cur) => cur.map((r, i) => i === index ? { ...r, runScored: e.target.checked } : r))} />
                                Anotó (R)
                              </label>
                              <label className="flex items-center gap-1 text-[9px] text-white/50 cursor-pointer">
                                <input checked={detail.rbiCredited} className="h-3 w-3" type="checkbox"
                                  onChange={(e) => setRunnerDetails((cur) => cur.map((r, i) => i === index ? { ...r, rbiCredited: e.target.checked } : r))} />
                                RBI
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-xl bg-mineros-red px-4 py-2.5 font-bebas text-lg uppercase tracking-[0.16em] text-white transition hover:bg-red-700 disabled:opacity-50"
                  disabled={!canSubmitAtBat || savingAtBat}
                  onClick={() => void handleSubmitAtBat()}
                  type="button"
                >
                  {savingAtBat ? 'Confirmando…' : 'Confirmar jugada'}
                </button>
                <button
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/55 transition hover:border-white/30"
                  onClick={() => { setSelectedContactType(null); setSelectedHitDirection(null); setSelectedHitQuality(null); setRunnerDetails([]); setOutSequence(''); setCurrentStep(2); }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>

            </div>
          ) : null}

        </section>

        {/* ── COLUMNA DERECHA — HISTORIAL ──────────────────────────────── */}
        <aside className="flex flex-col gap-2 overflow-y-auto rounded-xl border border-white/8 bg-white/3 p-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-mineros-gold/70">Historial</p>
          {recentHistory.length === 0 ? (
            <p className="text-[10px] text-white/30">Sin at-bats.</p>
          ) : (
            <div className="space-y-1">
              {recentHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5">
                  <p className="truncate text-[11px] font-semibold text-white">
                    {item.batter_name ?? item.player_id} · {formatHistoryResult(item.result)}
                  </p>
                  <p className="mt-0.5 text-[9px] text-white/40">
                    {item.inning_half === 'top' ? 'A' : 'B'}{item.inning}{item.rbi > 0 ? ` · ${item.rbi}RBI` : ''}{item.runs > 0 ? ` · ${item.runs}R` : ''}
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