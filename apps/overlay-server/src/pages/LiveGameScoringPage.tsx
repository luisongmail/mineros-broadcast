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

function applyResultAutoLogic(
  result: AtBatResult,
  bases: { first: boolean; second: boolean; third: boolean },
): { runners: RunnerDetail[]; rbi: number; runs: number; contactType: ContactType | null } {
  const runners: RunnerDetail[] = [];
  const r1 = bases.first;
  const r2 = bases.second;
  const r3 = bases.third;

  const mk = (runner: RunnerDetail['runner'], from: string, to: RunnerBase, rbiCredited = false): RunnerDetail =>
    ({ runner, from, to, runScored: to === 'HOME', rbiCredited });

  switch (result) {
    case 'home_run': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', true));
      if (r2) runners.push(mk('R2', '2B', 'HOME', true));
      if (r1) runners.push(mk('R1', '1B', 'HOME', true));
      runners.push(mk('BR', 'HOME', 'HOME', true));
      const scored = (r1 ? 1 : 0) + (r2 ? 1 : 0) + (r3 ? 1 : 0) + 1;
      return { runners, rbi: scored, runs: scored, contactType: 'fly_ball' };
    }
    case 'triple': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', true));
      if (r2) runners.push(mk('R2', '2B', 'HOME', true));
      if (r1) runners.push(mk('R1', '1B', 'HOME', true));
      runners.push(mk('BR', 'HOME', '3B'));
      const scored = (r1 ? 1 : 0) + (r2 ? 1 : 0) + (r3 ? 1 : 0);
      return { runners, rbi: scored, runs: scored, contactType: null };
    }
    case 'double': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', true));
      if (r2) runners.push(mk('R2', '2B', 'HOME', true));
      if (r1) runners.push(mk('R1', '1B', '3B'));
      runners.push(mk('BR', 'HOME', '2B'));
      const scored = (r2 ? 1 : 0) + (r3 ? 1 : 0);
      return { runners, rbi: scored, runs: scored, contactType: null };
    }
    case 'single': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', true));
      if (r2) runners.push(mk('R2', '2B', '3B'));
      if (r1) runners.push(mk('R1', '1B', '2B'));
      runners.push(mk('BR', 'HOME', '1B'));
      const scored = r3 ? 1 : 0;
      return { runners, rbi: scored, runs: scored, contactType: null };
    }
    case 'walk':
    case 'hbp': {
      const loaded = r1 && r2 && r3;
      const r1r2 = r1 && r2 && !r3;
      if (loaded) { runners.push(mk('R3', '3B', 'HOME', true)); runners.push(mk('R2', '2B', '3B')); runners.push(mk('R1', '1B', '2B')); }
      else if (r1r2) { runners.push(mk('R2', '2B', '3B')); runners.push(mk('R1', '1B', '2B')); }
      else if (r1) { runners.push(mk('R1', '1B', '2B')); }
      runners.push(mk('BR', 'HOME', '1B'));
      return { runners, rbi: loaded ? 1 : 0, runs: loaded ? 1 : 0, contactType: null };
    }
    case 'sacrifice_fly': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', true));
      if (r2) runners.push(mk('R2', '2B', '2B'));
      if (r1) runners.push(mk('R1', '1B', '1B'));
      runners.push(mk('BR', 'HOME', 'OUT'));
      return { runners, rbi: r3 ? 1 : 0, runs: r3 ? 1 : 0, contactType: 'fly_ball' };
    }
    case 'sacrifice_bunt': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', true));
      if (r2) runners.push(mk('R2', '2B', '3B'));
      if (r1) runners.push(mk('R1', '1B', '2B'));
      runners.push(mk('BR', 'HOME', 'OUT'));
      const scored = r3 ? 1 : 0;
      return { runners, rbi: scored, runs: scored, contactType: 'bunt' };
    }
    case 'double_play': {
      if (r1) runners.push(mk('R1', '1B', 'OUT'));
      if (r2) runners.push(mk('R2', '2B', '2B'));
      if (r3) runners.push(mk('R3', '3B', '3B'));
      runners.push(mk('BR', 'HOME', 'OUT'));
      return { runners, rbi: 0, runs: 0, contactType: 'ground_ball' };
    }
    case 'groundout': {
      if (r1) runners.push(mk('R1', '1B', '1B'));
      if (r2) runners.push(mk('R2', '2B', '2B'));
      if (r3) runners.push(mk('R3', '3B', '3B'));
      runners.push(mk('BR', 'HOME', 'OUT'));
      return { runners, rbi: 0, runs: 0, contactType: 'ground_ball' };
    }
    case 'flyout': {
      if (r1) runners.push(mk('R1', '1B', '1B'));
      if (r2) runners.push(mk('R2', '2B', '2B'));
      if (r3) runners.push(mk('R3', '3B', '3B'));
      runners.push(mk('BR', 'HOME', 'OUT'));
      return { runners, rbi: 0, runs: 0, contactType: 'fly_ball' };
    }
    case 'fielders_choice': {
      if (r1) runners.push(mk('R1', '1B', 'OUT'));
      if (r2) runners.push(mk('R2', '2B', '2B'));
      if (r3) runners.push(mk('R3', '3B', '3B'));
      runners.push(mk('BR', 'HOME', '1B'));
      return { runners, rbi: 0, runs: 0, contactType: 'ground_ball' };
    }
    case 'error': {
      if (r3) runners.push(mk('R3', '3B', 'HOME', false));
      if (r2) runners.push(mk('R2', '2B', '3B'));
      if (r1) runners.push(mk('R1', '1B', '2B'));
      runners.push(mk('BR', 'HOME', '1B'));
      return { runners, rbi: 0, runs: r3 ? 1 : 0, contactType: null };
    }
    default:
      return { runners: [], rbi: 0, runs: 0, contactType: null };
  }
}



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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showEventsPanel, setShowEventsPanel] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventFeedback, setEventFeedback] = useState<string | null>(null);
  const [legendKey, setLegendKey] = useState<string | null>(null);

  // Builder para jugadas con múltiples corredores (E tiro, SB+E)
  type CompoundDest = '2B' | '3B' | 'HOME' | 'OUT' | 'same';
  interface CompoundEventBuilder {
    triggerRunner: 'R1' | 'R2' | 'R3';
    from: string;
    eventType: 'throwing_error' | 'sb_error';
    primaryDest: '2B' | '3B' | 'HOME' | null;
    sideRunners: { label: 'R1' | 'R2' | 'R3'; from: string; dest: CompoundDest }[];
  }
  const [compoundEvent, setCompoundEvent] = useState<CompoundEventBuilder | null>(null);

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

  // Auto-populate runners, rbi, runs, contactType when result is chosen in step 3
  useEffect(() => {
    if (!selectedResult || !context) return;
    const isContactResult = CONTACT_REQUIRED_RESULTS.has(selectedResult);
    if (!isContactResult) {
      setSelectedContactType(null);
      setSelectedHitDirection(null);
      setSelectedHitQuality(null);
      setRunnerDetails([]);
      return;
    }
    const auto = applyResultAutoLogic(selectedResult, context.gameState.bases);
    setRunnerDetails(auto.runners);
    setRbi(auto.rbi);
    setRuns(auto.runs);
    if (auto.contactType) setSelectedContactType(auto.contactType);
  }, [selectedResult, context]);

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
        setCurrentStep(2);
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

  // ── BASERUNNING EVENT HANDLER ────────────────────────────────────────
  type BaserunningEventType =
    | 'stolen_base' | 'caught_stealing' | 'wild_pitch_advance' | 'passed_ball_advance'
    | 'balk' | 'throwing_error' | 'receiving_error' | 'pickoff_out' | 'pickoff_error';

  type BaserunningRunnerMove = {
    runnerLabel: 'R1' | 'R2' | 'R3';
    fromBase: string;
    toBase: '1B' | '2B' | '3B' | 'HOME' | 'OUT';
    runScored: boolean;
    earnedRun: boolean;
  };

  const handleBaserunningEvent = useCallback(async (
    eventType: BaserunningEventType,
    moves: BaserunningRunnerMove[],
  ) => {
    if (!context || savingEvent) return;
    setSavingEvent(true);
    setEventFeedback(null);
    try {
      const resp = await fetch(`${SERVER_BASE_URL}/baserunning-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: context.gameState.gameId, eventType, runners: moves }),
      });
      const json = (await resp.json()) as { runsScored?: number; error?: string };
      if (!resp.ok) throw new Error(json.error ?? 'Error al registrar evento');
      setEventFeedback(`✓ ${eventType.replace(/_/g, ' ')}${json.runsScored ? ` · ${json.runsScored}R` : ''}`);
      setTimeout(() => setEventFeedback(null), 3000);
      await loadContext();
    } catch (evtErr) {
      setError(evtErr instanceof Error ? evtErr.message : 'Error al registrar evento');
    } finally {
      setSavingEvent(false);
    }
  }, [context, loadContext, savingEvent]);

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

  const BASERUNNING_LEGEND: Record<string, { title: string; emoji: string; description: string; consequence: string; earnedRun: boolean }> = {
    stolen_base: {
      title: 'Stolen Base (SB)',
      emoji: '🏃',
      description: 'El corredor intenta avanzar a la siguiente base mientras el pitcher lanza, sin acción del bateador.',
      consequence: 'El corredor avanza 1 base. Si llega a HOME anota carrera limpia. No se registra error ni hit — la responsabilidad es del corredor.',
      earnedRun: true,
    },
    caught_stealing: {
      title: 'Caught Stealing (CS)',
      emoji: '🛑',
      description: 'El corredor intentó robar base pero fue puesto out por el receptor u otro fildeador.',
      consequence: 'Se registra 1 out. El corredor sale del juego. Carrera no anotada.',
      earnedRun: false,
    },
    wild_pitch_advance: {
      title: 'Wild Pitch — Avance (WP)',
      emoji: '🌀',
      description: 'El pitcher lanza un pitcheo tan descontrolado que el receptor no puede detenerlo razonablemente.',
      consequence: 'Corredor avanza 1 base. La carrera que anota por WP se considera LIMPIA (responsabilidad del pitcher). Se registra error al pitcher.',
      earnedRun: true,
    },
    passed_ball_advance: {
      title: 'Passed Ball — Avance (PB)',
      emoji: '🥎',
      description: 'El receptor falla en detener un pitcheo que debía haber controlado razonablemente.',
      consequence: 'Corredor avanza 1 base. La carrera que anota por PB es SUCIA (responsabilidad del receptor, no del pitcher). Se registra error al catcher.',
      earnedRun: false,
    },
    throwing_error: {
      title: 'Error de Tiro (E tiro)',
      emoji: '💥',
      description: 'Un fildeador hace un tiro errado que permite al corredor avanzar más allá de lo esperado.',
      consequence: 'Corredor avanza 1 base adicional. La carrera anotada por error es SUCIA. No se carga como earned run al pitcher.',
      earnedRun: false,
    },
    pickoff_out: {
      title: 'Pickoff — Out (PO out)',
      emoji: '🎯',
      description: 'El pitcher o receptor tira a la base para sorprender y poner out al corredor que está demasiado lejos.',
      consequence: 'Se registra 1 out. El corredor sale del juego. No hay carrera ni avance.',
      earnedRun: false,
    },
    balk: {
      title: 'Balk',
      emoji: '🚨',
      description: 'Movimiento ilegal del pitcher mientras hay corredores en base. Lo decreta el árbitro.',
      consequence: 'TODOS los corredores avanzan 1 base automáticamente. Si R3 anota, es carrera LIMPIA. No se puede evitar — es penalidad al pitcher.',
      earnedRun: true,
    },
  };

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
        {eventFeedback ? (
          <span className="ml-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-0.5 text-[11px] font-semibold text-blue-200 whitespace-nowrap">
            {eventFeedback}
          </span>
        ) : null}
        <button
          className="ml-1 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200 transition hover:bg-blue-500/20"
          onClick={() => setShowEventsPanel((v) => !v)}
          type="button"
        >
          Eventos
        </button>
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
              [2, '② Jugada'],
            ] as [1|2, string][]).map(([step, label]) => (
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
                      Mano: <span className="font-semibold text-mineros-gold">{formatBatterSideLabel(activeBattingSide)}</span>
                      {battingSideOverride !== null ? <span className="ml-1 text-[10px] text-white/35">(manual)</span> : null}
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
                              if (option.value === 'in_play') setCurrentStep(2);
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
                        onClick={() => setCurrentStep(2)}
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

          {/* ─ PASO 2: JUGADA ─ */}
          {currentStep === 2 ? (
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

              {/* ── CAMPO VISUAL + VIA DEL OUT — solo cuando hay contacto ─── */}
              {selectedResult && CONTACT_REQUIRED_RESULTS.has(selectedResult) ? (<>
              <div className="flex gap-3 items-start">

                {/* SVG Baseball Field con botones superpuestos */}
                <div className="flex-shrink-0">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    Dirección al campo
                    {!selectedHitDirection ? <span className="ml-2 text-mineros-red">← requerido</span> : null}
                  </p>
                  <div className="relative" style={{ width: 224, height: 204 }}>
                    {/* SVG del campo */}
                    <svg viewBox="0 0 224 204" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      {/* Fondo general */}
                      <rect width="224" height="204" fill="#0d1f0a" rx="6"/>
                      {/* Outfield grass */}
                      <path d="M 112,194 L 4,12 Q 112,-8 220,12 Z" fill="#1a5c0f"/>
                      {/* Infield dirt */}
                      <path d="M 112,194 L 182,128 L 112,62 L 42,128 Z" fill="#7a5512" opacity="0.9"/>
                      {/* Infield inner grass */}
                      <circle cx="112" cy="130" r="42" fill="#1d6b10" opacity="0.8"/>
                      {/* Foul lines */}
                      <line x1="112" y1="194" x2="4" y2="12" stroke="white" strokeWidth="1.2" opacity="0.35"/>
                      <line x1="112" y1="194" x2="220" y2="12" stroke="white" strokeWidth="1.2" opacity="0.35"/>
                      {/* Outfield fence */}
                      <path d="M 4,12 Q 112,-6 220,12" stroke="#666" strokeWidth="2" fill="none" opacity="0.5"/>
                      {/* Warning track */}
                      <path d="M 10,22 Q 112,5 214,22" stroke="#8B6914" strokeWidth="5" fill="none" opacity="0.35"/>
                      {/* Base paths */}
                      <path d="M 112,194 L 182,128 L 112,62 L 42,128 L 112,194" stroke="white" strokeWidth="1.2" fill="none" opacity="0.4"/>
                      {/* Pitcher mound */}
                      <ellipse cx="112" cy="126" rx="10" ry="7" fill="#9c7820"/>
                      {/* Bases */}
                      <rect x="108.5" y="58.5" width="7" height="7" fill="white" opacity="0.85" transform="rotate(45 112 62)"/>
                      <rect x="178.5" y="124.5" width="7" height="7" fill="white" opacity="0.85" transform="rotate(45 182 128)"/>
                      <rect x="38.5" y="124.5" width="7" height="7" fill="white" opacity="0.85" transform="rotate(45 42 128)"/>
                      {/* Home plate */}
                      <polygon points="112,188 118,194 118,200 106,200 106,194" fill="white" opacity="0.8"/>
                    </svg>

                    {/* Botones de zona superpuestos (centrados en sus coordenadas) */}
                    {([
                      { z: 'LF'  as HitDirection, x: 22,  y: 52,  label: 'LF'   },
                      { z: 'LCF' as HitDirection, x: 62,  y: 24,  label: 'LCF'  },
                      { z: 'CF'  as HitDirection, x: 112, y: 10,  label: 'CF'   },
                      { z: 'RCF' as HitDirection, x: 162, y: 24,  label: 'RCF'  },
                      { z: 'RF'  as HitDirection, x: 202, y: 52,  label: 'RF'   },
                      { z: '3B'  as HitDirection, x: 34,  y: 120, label: '3B'   },
                      { z: 'SS'  as HitDirection, x: 72,  y: 92,  label: 'SS'   },
                      { z: '2B'  as HitDirection, x: 130, y: 68,  label: '2B'   },
                      { z: '1B'  as HitDirection, x: 190, y: 120, label: '1B'   },
                      { z: 'P'   as HitDirection, x: 112, y: 118, label: 'P'    },
                      { z: 'C'   as HitDirection, x: 112, y: 164, label: 'C'    },
                    ] as const).map(({ z, x, y, label }) => {
                      const active = selectedHitDirection === z;
                      return (
                        <button
                          key={z}
                          className={`absolute rounded-md border text-[10px] font-bold leading-none transition px-1.5 py-1 ${active ? 'border-mineros-red bg-mineros-red text-white shadow-lg shadow-red-900/50' : 'border-white/25 bg-black/50 text-white/75 hover:border-white/60 hover:bg-black/70'}`}
                          style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                          onClick={() => setSelectedHitDirection(z)}
                          type="button"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Vía del out */}
                  <div className="mt-1.5">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                      Vía del out <span className="text-white/20 normal-case">(ej: 6-4-3)</span>
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {['6-3','5-3','4-3','6-4-3','5-4-3','1-3','3U','4U'].map((seq) => (
                        <button key={seq} className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold transition ${outSequence === seq ? 'border-mineros-gold bg-mineros-gold text-mineros-navy' : 'border-white/10 bg-black/25 text-white/45 hover:border-white/25'}`}
                          onClick={() => setOutSequence(outSequence === seq ? '' : seq)} type="button">{seq}</button>
                      ))}
                      <input
                        className="w-14 rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-white outline-none placeholder-white/25 focus:border-mineros-gold"
                        placeholder="otro…"
                        type="text"
                        value={['6-3','5-3','4-3','6-4-3','5-4-3','1-3','3U','4U'].includes(outSequence) ? '' : outSequence}
                        onChange={(e) => setOutSequence(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Corredores — ajustar si difiere del auto */}
                <div className="flex-1 min-w-0">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    Corredores <span className="text-white/20 normal-case">— ajusta si difiere</span>
                  </p>
                  {runnerDetails.length === 0 ? (
                    <p className="mt-2 text-[10px] text-white/30">Sin corredores.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {runnerDetails.map((detail, index) => {
                        const labels: Record<string, string> = { BR: 'Bateador', R1: 'Corredor 1B', R2: 'Corredor 2B', R3: 'Corredor 3B' };
                        return (
                          <div key={`${detail.runner}-${detail.from}`} className={`rounded-lg border px-2 py-1.5 ${detail.to === 'OUT' ? 'border-mineros-red/30 bg-mineros-red/5' : detail.to === 'HOME' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-black/20'}`}>
                            <div className="flex items-center gap-1 mb-1">
                              <span className={`text-[10px] font-bold ${detail.to === 'OUT' ? 'text-red-300' : detail.to === 'HOME' ? 'text-emerald-300' : 'text-mineros-gold'}`}>
                                {labels[detail.runner] ?? detail.runner}
                              </span>
                              <span className="text-[8px] text-white/25 ml-auto">{detail.from}</span>
                              <span className="text-[9px] text-white/30">→</span>
                            </div>
                            <div className="flex gap-0.5">
                              {(['1B','2B','3B','HOME','OUT'] as const).map((base) => (
                                <button
                                  key={base}
                                  className={`flex-1 rounded border py-1 text-[9px] font-bold transition ${detail.to === base
                                    ? base === 'OUT' ? 'border-mineros-red bg-mineros-red text-white'
                                    : base === 'HOME' ? 'border-emerald-400 bg-emerald-500 text-white'
                                    : 'border-mineros-gold bg-mineros-gold text-mineros-navy'
                                    : 'border-white/10 bg-black/20 text-white/40 hover:border-white/25'}`}
                                  onClick={() => {
                                    setRunnerDetails((cur) => cur.map((r, i) => i === index ? { ...r, to: base, runScored: base === 'HOME', rbiCredited: base === 'HOME' && r.runner !== 'BR' ? detail.rbiCredited : r.rbiCredited } : r));
                                    if (base === 'HOME') setRuns((v) => v + (detail.to === 'HOME' ? 0 : 1));
                                    if (base !== 'HOME' && detail.to === 'HOME') setRuns((v) => Math.max(0, v - 1));
                                  }}
                                  type="button"
                                >{base}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              </>) : null}

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
                  onClick={() => { setSelectedContactType(null); setSelectedHitDirection(null); setSelectedHitQuality(null); setRunnerDetails([]); setOutSequence(''); setSelectedResult(null); setCurrentStep(1); }}
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

      {/* ── PANEL EVENTOS BASERUNNING ─────────────────────────────────── */}
      {showEventsPanel ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end">
          {/* Overlay backdrop */}
          <button
            aria-label="Cerrar panel"
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowEventsPanel(false)}
            type="button"
          />
          <aside className="relative z-10 flex w-[320px] flex-col overflow-y-auto border-l border-white/10 bg-mineros-navy p-3 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bebas text-lg uppercase tracking-[0.18em] text-blue-200">Eventos Baserunning</span>
              <div className="flex items-center gap-1.5">
                <button
                  className={`rounded-lg border px-2 py-1 text-[11px] transition ${legendKey !== null ? 'border-mineros-gold/50 bg-mineros-gold/10 text-mineros-gold' : 'border-white/15 text-white/40 hover:border-white/35'}`}
                  onClick={() => setLegendKey((k) => (k !== null ? null : 'stolen_base'))}
                  title="Ver descripción y consecuencias de cada tipo de evento"
                  type="button"
                >? Leyenda</button>
                <button
                  className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/50 hover:border-white/35"
                  onClick={() => { setShowEventsPanel(false); setLegendKey(null); }}
                  type="button"
                >✕</button>
              </div>
            </div>

            {/* ── PANEL LEYENDA ── */}
            {legendKey !== null ? (
              <div className="mb-3 rounded-xl border border-mineros-gold/25 bg-mineros-gold/5 p-3">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-mineros-gold/70">Leyenda de acciones</p>
                {/* Tabs de selección */}
                <div className="mb-2 flex flex-wrap gap-1">
                  {Object.entries(BASERUNNING_LEGEND).map(([key, info]) => (
                    <button
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${legendKey === key ? 'bg-mineros-gold text-mineros-navy' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                      key={key}
                      onClick={() => setLegendKey(key)}
                      type="button"
                    >{info.emoji} {info.title.split(' ')[0]}</button>
                  ))}
                </div>
                {/* Contenido del item seleccionado */}
                {(() => {
                  const item = BASERUNNING_LEGEND[legendKey];
                  if (!item) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-[13px] font-semibold text-white">{item.emoji} {item.title}</p>
                      <p className="text-[11px] leading-relaxed text-white/70">{item.description}</p>
                      <div className="rounded-lg border border-blue-400/20 bg-blue-400/8 p-2">
                        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-300/70">Consecuencia</p>
                        <p className="text-[11px] leading-relaxed text-blue-100/80">{item.consequence}</p>
                      </div>
                      <p className={`text-[10px] font-semibold ${item.earnedRun ? 'text-red-300' : 'text-emerald-300'}`}>
                        {item.earnedRun ? '🔴 Carrera LIMPIA (earned run) — carga al pitcher' : '🟢 Carrera SUCIA (unearned) — no carga al pitcher'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {/* Corredores activos */}
            {(() => {
              const activeRunners: { label: 'R1' | 'R2' | 'R3'; from: string; next: '2B' | '3B' | 'HOME' }[] = [];
              if (gs.bases.first) activeRunners.push({ label: 'R1', from: '1B', next: '2B' });
              if (gs.bases.second) activeRunners.push({ label: 'R2', from: '2B', next: '3B' });
              if (gs.bases.third) activeRunners.push({ label: 'R3', from: '3B', next: 'HOME' });

              if (activeRunners.length === 0) {
                return <p className="mb-3 text-center text-xs text-white/40">Sin corredores en base.</p>;
              }

              // Destinos válidos para un corredor según su base de origen
              const validDestsFor = (from: string): ('2B' | '3B' | 'HOME')[] => {
                const all: ('2B' | '3B' | 'HOME')[] = ['2B', '3B', 'HOME'];
                if (from === '1B') return all;
                if (from === '2B') return ['3B', 'HOME'];
                return ['HOME'];
              };

              // ── BUILDER ACTIVO: compound event con múltiples corredores ──────
              if (compoundEvent !== null) {
                const isSbError = compoundEvent.eventType === 'sb_error';
                return (
                  <div className="mb-3 rounded-xl border border-yellow-400/25 bg-yellow-400/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-yellow-200">
                        {isSbError ? '🏃 SB + E tiro' : '💥 E tiro'} — {compoundEvent.triggerRunner} ({compoundEvent.from})
                      </p>
                      <button className="text-[11px] text-white/35 hover:text-white/60" onClick={() => setCompoundEvent(null)} type="button">✕</button>
                    </div>

                    {/* Destino del corredor principal */}
                    <div>
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-yellow-200/60">
                        {compoundEvent.triggerRunner} llega a:
                      </p>
                      <div className="flex gap-1.5">
                        {validDestsFor(compoundEvent.from).map((dest) => (
                          <button
                            key={dest}
                            className={`rounded-md border px-3 py-1.5 text-[12px] font-bold transition ${compoundEvent.primaryDest === dest ? 'border-yellow-300 bg-yellow-300/30 text-white' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20'}`}
                            onClick={() => setCompoundEvent((prev) => prev ? { ...prev, primaryDest: dest } : null)}
                            type="button"
                          >{dest}</button>
                        ))}
                      </div>
                    </div>

                    {/* Otros corredores afectados */}
                    {compoundEvent.sideRunners.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Otros corredores en la jugada:</p>
                        {compoundEvent.sideRunners.map((sr) => {
                          const sideDests: ('same' | '2B' | '3B' | 'HOME' | 'OUT')[] = ['same', ...validDestsFor(sr.from), 'OUT'];
                          const destLabel = (d: string) => d === 'same' ? `Se queda (${sr.from})` : d;
                          return (
                            <div key={sr.label}>
                              <p className="mb-1 text-[10px] text-white/55">{sr.label} · {sr.from}:</p>
                              <div className="flex flex-wrap gap-1">
                                {sideDests.map((dest) => (
                                  <button
                                    key={dest}
                                    className={`rounded-md border px-2 py-1 text-[11px] transition ${sr.dest === dest ? 'border-blue-300 bg-blue-300/20 text-white font-semibold' : 'border-white/15 bg-white/3 text-white/55 hover:border-white/30'}`}
                                    onClick={() => setCompoundEvent((prev) => {
                                      if (!prev) return null;
                                      return {
                                        ...prev,
                                        sideRunners: prev.sideRunners.map((s) => s.label === sr.label ? { ...s, dest } : s),
                                      };
                                    })}
                                    type="button"
                                  >{destLabel(dest)}</button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Confirmar jugada */}
                    <button
                      className="w-full rounded-lg border border-yellow-300/50 bg-yellow-400/15 px-3 py-2 text-[12px] font-semibold text-yellow-100 transition hover:bg-yellow-400/25 disabled:opacity-40"
                      disabled={savingEvent || compoundEvent.primaryDest === null}
                      onClick={() => {
                        if (!compoundEvent.primaryDest) return;
                        const moves: { runnerLabel: 'R1' | 'R2' | 'R3'; fromBase: string; toBase: '2B' | '3B' | 'HOME' | 'OUT'; runScored: boolean; earnedRun: boolean }[] = [];
                        // Corredor principal
                        moves.push({
                          runnerLabel: compoundEvent.triggerRunner,
                          fromBase: compoundEvent.from,
                          toBase: compoundEvent.primaryDest,
                          runScored: compoundEvent.primaryDest === 'HOME',
                          earnedRun: false,
                        });
                        // Corredores secundarios
                        for (const sr of compoundEvent.sideRunners) {
                          if (sr.dest === 'same') continue;
                          moves.push({
                            runnerLabel: sr.label,
                            fromBase: sr.from,
                            toBase: sr.dest as '2B' | '3B' | 'HOME' | 'OUT',
                            runScored: sr.dest === 'HOME',
                            earnedRun: false,
                          });
                        }
                        void handleBaserunningEvent('throwing_error', moves);
                        setCompoundEvent(null);
                      }}
                      type="button"
                    >{savingEvent ? 'Registrando…' : '✓ Confirmar jugada'}</button>

                    <p className="text-[9px] leading-relaxed text-white/30">
                      {isSbError ? 'SB se acredita al corredor · ' : ''}Carreras anotadas en esta jugada son SUCIAS (unearned — no cargan al pitcher).
                    </p>
                  </div>
                );
              }

              // ── LISTA NORMAL de corredores ──────────────────────────────────
              return (
                <div className="mb-3 space-y-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Por corredor</p>
                  {activeRunners.map((r) => (
                    <div key={r.label} className="rounded-lg border border-white/8 bg-white/3 p-2">
                      <p className="mb-1.5 text-[10px] font-semibold text-white/70">{r.label} · {r.from}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => void handleBaserunningEvent('stolen_base', [{ runnerLabel: r.label, fromBase: r.from, toBase: r.next, runScored: r.next === 'HOME', earnedRun: true }])}
                          title={`Stolen Base — ${r.label} roba ${r.next}. Carrera LIMPIA si anota.`}
                          type="button"
                        >SB → {r.next}</button>
                        <button
                          className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => void handleBaserunningEvent('caught_stealing', [{ runnerLabel: r.label, fromBase: r.from, toBase: 'OUT', runScored: false, earnedRun: false }])}
                          title={`Caught Stealing — ${r.label} fue puesto out en intento de robo. +1 out.`}
                          type="button"
                        >CS</button>
                        <button
                          className="rounded-md border border-blue-400/40 bg-blue-400/10 px-2 py-1 text-[11px] text-blue-200 transition hover:bg-blue-400/20 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => void handleBaserunningEvent('wild_pitch_advance', [{ runnerLabel: r.label, fromBase: r.from, toBase: r.next, runScored: r.next === 'HOME', earnedRun: true }])}
                          title={`Wild Pitch — el pitcher lanzó descontrolado y ${r.label} avanza a ${r.next}. Carrera LIMPIA (carga al pitcher).`}
                          type="button"
                        >WP → {r.next}</button>
                        <button
                          className="rounded-md border border-purple-400/40 bg-purple-400/10 px-2 py-1 text-[11px] text-purple-200 transition hover:bg-purple-400/20 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => void handleBaserunningEvent('passed_ball_advance', [{ runnerLabel: r.label, fromBase: r.from, toBase: r.next, runScored: r.next === 'HOME', earnedRun: false }])}
                          title={`Passed Ball — el receptor no detuvo un pitch que debía controlar y ${r.label} avanza a ${r.next}. Carrera SUCIA (error del catcher, no carga al pitcher).`}
                          type="button"
                        >PB → {r.next}</button>
                        <button
                          className="rounded-md border border-orange-400/40 bg-orange-400/10 px-2 py-1 text-[11px] text-orange-200 transition hover:bg-orange-400/20 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => void handleBaserunningEvent('pickoff_out', [{ runnerLabel: r.label, fromBase: r.from, toBase: 'OUT', runScored: false, earnedRun: false }])}
                          title={`Pickoff Out — el pitcher o receptor tira a ${r.from} y pone out a ${r.label} que estaba muy lejos de la base. +1 out.`}
                          type="button"
                        >PO out</button>
                        {/* E tiro y SB+E abren el compound builder */}
                        <button
                          className="rounded-md border border-yellow-400/40 bg-yellow-400/10 px-2 py-1 text-[11px] text-yellow-200 transition hover:bg-yellow-400/20 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => {
                            const others = activeRunners.filter((ar) => ar.label !== r.label);
                            setCompoundEvent({
                              triggerRunner: r.label, from: r.from,
                              eventType: 'throwing_error', primaryDest: null,
                              sideRunners: others.map((o) => ({ label: o.label, from: o.from, dest: 'same' })),
                            });
                          }}
                          title={`Error de tiro — un fildeador tira mal y ${r.label} avanza más de lo esperado. Permite definir destino y el efecto sobre otros corredores. Carrera SUCIA.`}
                          type="button"
                        >E tiro ▾</button>
                        <button
                          className="rounded-md border border-emerald-400/30 bg-emerald-400/5 px-2 py-1 text-[11px] text-emerald-300/70 transition hover:bg-emerald-400/15 disabled:opacity-40"
                          disabled={savingEvent}
                          onClick={() => {
                            const others = activeRunners.filter((ar) => ar.label !== r.label);
                            setCompoundEvent({
                              triggerRunner: r.label, from: r.from,
                              eventType: 'sb_error', primaryDest: null,
                              sideRunners: others.map((o) => ({ label: o.label, from: o.from, dest: 'same' })),
                            });
                          }}
                          title={`SB + Error de tiro — ${r.label} intenta robar, el receptor tira y comete error. Se acredita el robo (SB) y se define hasta dónde llega el corredor y qué pasa con los demás. Carrera SUCIA.`}
                          type="button"
                        >SB+E ▾</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Eventos globales */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">Global</p>
              {/* Balk: todos los corredores avanzan 1 base */}
              <button
                className="w-full rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-left text-[12px] font-semibold text-yellow-200 transition hover:bg-yellow-400/20 disabled:opacity-40"
                disabled={savingEvent || (!gs.bases.first && !gs.bases.second && !gs.bases.third)}
                title="Balk — movimiento ilegal del pitcher con corredores en base. Todos los corredores avanzan 1 base automáticamente. Carreras LIMPIAS (carga al pitcher)."
                onClick={() => {
                  const moves: { runnerLabel: 'R1' | 'R2' | 'R3'; fromBase: string; toBase: '1B' | '2B' | '3B' | 'HOME' | 'OUT'; runScored: boolean; earnedRun: boolean }[] = [];
                  if (gs.bases.third) moves.push({ runnerLabel: 'R3', fromBase: '3B', toBase: 'HOME', runScored: true, earnedRun: true });
                  if (gs.bases.second) moves.push({ runnerLabel: 'R2', fromBase: '2B', toBase: '3B', runScored: false, earnedRun: true });
                  if (gs.bases.first) moves.push({ runnerLabel: 'R1', fromBase: '1B', toBase: '2B', runScored: false, earnedRun: true });
                  void handleBaserunningEvent('balk', moves);
                }}
                type="button"
              >🚨 Balk — todos avanzan</button>

              <button
                className="w-full rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-[11px] text-white/50 transition hover:border-white/20"
                onClick={() => { setShowEventsPanel(false); setLegendKey(null); }}
                type="button"
              >Cerrar</button>
            </div>
          </aside>
        </div>
      ) : null}

    </div>
  );
}