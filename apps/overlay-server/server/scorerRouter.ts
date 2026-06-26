import { Router, type Request, type Response } from 'express';
import type { GameBases, LineupEntry, TeamRole } from '@mineros/game-engine';
import type { RowDataPacket } from 'mysql2';

import { pool } from './db';
import { stateStore, type PitcherStats } from './stateStore';

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

interface AtBatRequest {
  gameId: string;
  batterPlayerId: string;
  pitcherPlayerId?: string;
  result: AtBatResult;
  rbi?: number;
  runs?: number;
  onBase?: boolean;
  pitchCount?: number;
  notes?: string;
}

interface ApiSuccessResponse {
  status: number;
  result: 'ok';
  payload: unknown;
}

interface ApiErrorResponse {
  status: number;
  result: 'error';
  payload: {
    message: string;
  };
}

interface AtBatColumnRow extends RowDataPacket {
  Field: string;
}

interface GameLineupRow extends RowDataPacket {
  id: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

const AT_BAT_RESULTS = [
  'single',
  'double',
  'triple',
  'home_run',
  'walk',
  'hbp',
  'error',
  'strikeout',
  'groundout',
  'flyout',
  'sacrifice_fly',
  'sacrifice_bunt',
  'fielders_choice',
  'double_play',
] as const satisfies readonly AtBatResult[];

const ON_BASE_RESULTS = new Set<AtBatResult>(['single', 'double', 'triple', 'home_run', 'walk', 'hbp', 'error', 'fielders_choice']);
const OUT_RESULTS = new Set<AtBatResult>([
  'strikeout',
  'groundout',
  'flyout',
  'sacrifice_fly',
  'sacrifice_bunt',
  // fielders_choice: el bateador llega a base (el out es de otro corredor)
  'double_play',
]);

// Resultados que aplican avance forzado de corredores (walk / HBP)
const WALK_RESULTS = new Set<AtBatResult>(['walk', 'hbp']);

interface RunnerAdvancement {
  newBases: GameBases;
  runsScored: number;
}

/**
 * Walk/HBP: el bateador toma 1ª. Los corredores avanzan solo si son forzados
 * por el nuevo ocupante de 1ª (efecto dominó hasta home si bases llenas).
 */
function advanceRunnersForced(before: GameBases): RunnerAdvancement {
  let third = before.third;
  let second = before.second;
  let runsScored = 0;

  if (before.first) {
    if (before.second) {
      if (before.third) {
        runsScored = 1; // corredor de 3ª forzado a home
        // third stays true: corredor de 2ª lo reemplaza en 3ª
      } else {
        third = true; // corredor de 2ª forzado a 3ª
      }
      second = true; // corredor de 1ª forzado a 2ª
    } else {
      second = true; // corredor de 1ª forzado a 2ª
      // third no cambia
    }
  }

  return { newBases: { first: true, second, third }, runsScored };
}

/**
 * Single/double/triple: cada corredor avanza exactamente n bases.
 * Si llega a home (posición >= 4), anota.
 * NOTA: la posición final del bateador NO se incluye en newBases — se aplica por separado.
 */
function advanceRunnersNBases(before: GameBases, n: 1 | 2 | 3): RunnerAdvancement {
  let runsScored = 0;
  const newBases: GameBases = { first: false, second: false, third: false };

  if (before.third) {
    // 3 + n >= 4 para cualquier n >= 1 → siempre anota
    runsScored += 1;
  }

  if (before.second) {
    const pos = 2 + n;
    if (pos >= 4) {
      runsScored += 1; // double o triple: 2ª anota
    } else {
      newBases.third = true; // single: 2ª → 3ª
    }
  }

  if (before.first) {
    const pos = 1 + n;
    if (pos >= 4) {
      runsScored += 1; // triple: 1ª anota
    } else if (pos === 3) {
      newBases.third = true; // double: 1ª → 3ª
    } else {
      newBases.second = true; // single: 1ª → 2ª
    }
  }

  return { newBases, runsScored };
}

let atBatColumnsPromise: Promise<Set<string>> | null = null;

function sendSuccess(response: Response, payload: unknown, status = 200): void {
  const body: ApiSuccessResponse = {
    status,
    result: 'ok',
    payload,
  };

  response.status(status).json(body);
}

function sendError(response: Response, status: number, error: unknown): void {
  const body: ApiErrorResponse = {
    status,
    result: 'error',
    payload: {
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  };

  response.status(status).json(body);
}

function requirePool(response: Response) {
  if (!pool) {
    sendError(response, 503, new Error('DATABASE_URL no está configurado; scorer API no disponible'));
    return null;
  }

  return pool;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string when provided`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer when provided`);
  }

  return value;
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean when provided`);
  }

  return value;
}

function parseAtBatResult(value: unknown): AtBatResult {
  if (typeof value !== 'string' || !AT_BAT_RESULTS.includes(value as AtBatResult)) {
    throw new Error('result must be a valid at-bat result');
  }

  return value as AtBatResult;
}

function parseAtBatRequest(body: unknown): AtBatRequest {
  if (!isRecord(body)) {
    throw new Error('Request body must be a JSON object');
  }

  return {
    gameId: parseRequiredString(body.gameId, 'gameId'),
    batterPlayerId: parseRequiredString(body.batterPlayerId, 'batterPlayerId'),
    pitcherPlayerId: parseOptionalString(body.pitcherPlayerId, 'pitcherPlayerId'),
    result: parseAtBatResult(body.result),
    rbi: parseOptionalInteger(body.rbi, 'rbi'),
    runs: parseOptionalInteger(body.runs, 'runs'),
    onBase: parseOptionalBoolean(body.onBase, 'onBase'),
    pitchCount: parseOptionalInteger(body.pitchCount, 'pitchCount'),
    notes: parseOptionalString(body.notes, 'notes'),
  };
}

async function getAtBatColumns(): Promise<Set<string>> {
  if (!pool) {
    return new Set();
  }

  atBatColumnsPromise ??= pool
    .query<AtBatColumnRow[]>('SHOW COLUMNS FROM at_bats')
    .then(([rows]) => new Set(rows.map((row) => row.Field)));

  return atBatColumnsPromise;
}

async function findGameLineupId(gameId: string, playerId: string | undefined): Promise<string | null> {
  if (!pool || !playerId) {
    return null;
  }

  const [rows] = await pool.query<GameLineupRow[]>(
    `SELECT id
     FROM game_lineups
     WHERE game_id = ? AND player_id = ?
     ORDER BY is_starter DESC, batting_order ASC, created_at ASC
     LIMIT 1`,
    [gameId, playerId],
  );

  return rows[0]?.id ?? null;
}

function getBattingRole(inningHalf: 'top' | 'bottom'): TeamRole {
  return inningHalf === 'top' ? 'away' : 'home';
}

function getPitchingRole(inningHalf: 'top' | 'bottom'): TeamRole {
  return inningHalf === 'top' ? 'home' : 'away';
}

function findLineupEntry(entries: LineupEntry[], playerId: string | undefined): LineupEntry | null {
  if (playerId) {
    const match = entries.find((entry) => entry.playerId === playerId);
    if (match) {
      return match;
    }
  }

  return entries[0] ?? null;
}

async function countAtBatsThisInning(gameId: string, inning: number, inningHalf: 'top' | 'bottom'): Promise<number> {
  if (!pool) {
    return 0;
  }

  const columns = await getAtBatColumns();
  const hasInningHalf = columns.has('inning_half');
  const sql = hasInningHalf
    ? 'SELECT COUNT(*) AS total FROM at_bats WHERE game_id = ? AND inning = ? AND inning_half = ?'
    : 'SELECT COUNT(*) AS total FROM at_bats WHERE game_id = ? AND inning = ?';
  const params = hasInningHalf ? [gameId, inning, inningHalf] : [gameId, inning];
  const [rows] = await pool.query<CountRow[]>(sql, params);
  return rows[0]?.total ?? 0;
}

async function insertAtBat(request: AtBatRequest): Promise<void> {
  if (!pool) {
    throw new Error('DATABASE_URL no está configurado');
  }

  const state = stateStore.getState();
  const columns = await getAtBatColumns();
  const batterRosterId = await findGameLineupId(request.gameId, request.batterPlayerId);
  const pitcherRosterId = request.pitcherPlayerId ? await findGameLineupId(request.gameId, request.pitcherPlayerId) : null;
  const onBase = request.onBase ?? ON_BASE_RESULTS.has(request.result);
  const insertColumns = ['game_id', 'player_id', 'inning', 'result', 'rbi', 'runs'];
  const insertValues: Array<string | number | boolean | null> = [
    request.gameId,
    request.batterPlayerId,
    state.inning,
    request.result,
    request.rbi ?? 0,
    request.runs ?? 0,
  ];
  const placeholders = ['?', '?', '?', '?', '?', '?'];

  if (columns.has('batter_roster_id')) {
    insertColumns.push('batter_roster_id');
    insertValues.push(batterRosterId);
    placeholders.push('?');
  }

  if (columns.has('batter_player_id')) {
    insertColumns.push('batter_player_id');
    insertValues.push(request.batterPlayerId);
    placeholders.push('?');
  }

  if (columns.has('pitcher_roster_id')) {
    insertColumns.push('pitcher_roster_id');
    insertValues.push(pitcherRosterId);
    placeholders.push('?');
  }

  if (columns.has('inning_half')) {
    insertColumns.push('inning_half');
    insertValues.push(state.inningHalf);
    placeholders.push('?');
  }

  if (columns.has('on_base')) {
    insertColumns.push('on_base');
    insertValues.push(onBase);
    placeholders.push('?');
  }

  if (columns.has('pitch_count')) {
    insertColumns.push('pitch_count');
    insertValues.push(request.pitchCount ?? null);
    placeholders.push('?');
  }

  if (columns.has('notes')) {
    insertColumns.push('notes');
    insertValues.push(request.notes ?? null);
    placeholders.push('?');
  }

  if (columns.has('pitcher_player_id')) {
    insertColumns.push('pitcher_player_id');
    insertValues.push(request.pitcherPlayerId ?? null);
    placeholders.push('?');
  }

  if (columns.has('timestamp')) {
    insertColumns.push('timestamp');
    placeholders.push('CURRENT_TIMESTAMP(3)');
  }

  await pool.query(
    `INSERT INTO at_bats (${insertColumns.join(', ')})
     VALUES (${placeholders.join(', ')})`,
    insertValues,
  );
}

export interface GamePlayerStats {
  playerId: string;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
}

async function computePlayerStats(gameId: string): Promise<Record<string, GamePlayerStats>> {
  if (!pool) return {};

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      COALESCE(batter_player_id, player_id) AS player_id,
      COUNT(CASE WHEN result NOT IN ('walk','hbp','sacrifice_fly','sacrifice_bunt') THEN 1 END) AS ab,
      SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END) AS hits,
      SUM(CASE WHEN result = 'double' THEN 1 ELSE 0 END) AS doubles,
      SUM(CASE WHEN result = 'triple' THEN 1 ELSE 0 END) AS triples,
      SUM(CASE WHEN result = 'home_run' THEN 1 ELSE 0 END) AS home_runs,
      SUM(rbi) AS rbi,
      SUM(runs) AS runs,
      SUM(CASE WHEN result IN ('walk','hbp') THEN 1 ELSE 0 END) AS walks,
      SUM(CASE WHEN result = 'strikeout' THEN 1 ELSE 0 END) AS strikeouts
    FROM at_bats
    WHERE game_id = ?
    GROUP BY COALESCE(batter_player_id, player_id)`,
    [gameId],
  );

  const stats: Record<string, GamePlayerStats> = {};

  for (const row of rows) {
    const pid = row.player_id as string;
    stats[pid] = {
      playerId: pid,
      ab: Number(row.ab ?? 0),
      hits: Number(row.hits ?? 0),
      doubles: Number(row.doubles ?? 0),
      triples: Number(row.triples ?? 0),
      homeRuns: Number(row.home_runs ?? 0),
      rbi: Number(row.rbi ?? 0),
      runs: Number(row.runs ?? 0),
      walks: Number(row.walks ?? 0),
      strikeouts: Number(row.strikeouts ?? 0),
    };
  }

  return stats;
}

async function computePitcherStats(gameId: string): Promise<Record<string, PitcherStats>> {
  if (!pool) return {};

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      pitcher_player_id AS pitcher_id,
      SUM(COALESCE(pitch_count, 0)) AS pitches,
      SUM(CASE WHEN result = 'strikeout' THEN 1 ELSE 0 END) AS strikeouts,
      SUM(CASE WHEN result IN ('walk','hbp') THEN 1 ELSE 0 END) AS walks,
      SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END) AS hits_allowed,
      SUM(runs) AS runs_allowed,
      SUM(CASE WHEN result IN ('strikeout','groundout','flyout','sacrifice_fly','sacrifice_bunt') THEN 1
               WHEN result = 'double_play' THEN 2 ELSE 0 END) AS outs_recorded
    FROM at_bats
    WHERE game_id = ? AND pitcher_player_id IS NOT NULL
    GROUP BY pitcher_player_id`,
    [gameId],
  );

  const stats: Record<string, PitcherStats> = {};

  for (const row of rows) {
    const pid = row.pitcher_id as string;
    const outs = Number(row.outs_recorded ?? 0);
    const fullInnings = Math.floor(outs / 3);
    const remainder = outs % 3;
    stats[pid] = {
      pitcherId: pid,
      outs,
      ip: remainder === 0 ? String(fullInnings) : `${fullInnings}.${remainder}`,
      pitches: Number(row.pitches ?? 0),
      strikeouts: Number(row.strikeouts ?? 0),
      walks: Number(row.walks ?? 0),
      hitsAllowed: Number(row.hits_allowed ?? 0),
      runsAllowed: Number(row.runs_allowed ?? 0),
    };
  }

  return stats;
}


function applyAtBatToGameState(request: AtBatRequest): void {
  const state = stateStore.getState();
  const battingTeamRole = getBattingRole(state.inningHalf);
  const beforeBases = state.bases;
  const beforeInningHalf = state.inningHalf;
  const outsToRecord = request.result === 'double_play' ? 2 : OUT_RESULTS.has(request.result) ? 1 : 0;

  // Asegurar que el bateador y pitcher correctos están activos en el engine
  if (state.currentBatterId !== request.batterPlayerId) {
    stateStore.sendCommand('SetBatter', `playerId:${request.batterPlayerId}`);
  }

  if (state.rules.hasPitcher && request.pitcherPlayerId && state.currentPitcherId !== request.pitcherPlayerId) {
    stateStore.sendCommand('SetPitcher', `playerId:${request.pitcherPlayerId}`);
  }

  // Calcular avance de corredores y carreras automáticas según el resultado
  let autoRuns = 0;
  let newBases: GameBases | null = null;

  if (request.result === 'home_run') {
    // Todos los corredores + bateador anotan; el campo `runs` del scorer se ignora
    autoRuns = (beforeBases.first ? 1 : 0) + (beforeBases.second ? 1 : 0) + (beforeBases.third ? 1 : 0) + 1;
    newBases = { first: false, second: false, third: false };
  } else if (WALK_RESULTS.has(request.result)) {
    // Walk / HBP: avance forzado
    const adv = advanceRunnersForced(beforeBases);
    autoRuns = adv.runsScored;
    newBases = adv.newBases;
  } else if (request.result === 'single' || request.result === 'error' || request.result === 'fielders_choice') {
    // Sencillo / Error / FC: avance de 1 base; bateador a 1ª
    const adv = advanceRunnersNBases(beforeBases, 1);
    autoRuns = adv.runsScored;
    newBases = { ...adv.newBases, first: true };
  } else if (request.result === 'double') {
    // Doble: avance de 2 bases; bateador a 2ª
    const adv = advanceRunnersNBases(beforeBases, 2);
    autoRuns = adv.runsScored;
    newBases = { first: false, second: true, third: adv.newBases.third };
  } else if (request.result === 'triple') {
    // Triple: todos los corredores anotan; bateador a 3ª
    autoRuns = (beforeBases.first ? 1 : 0) + (beforeBases.second ? 1 : 0) + (beforeBases.third ? 1 : 0);
    newBases = { first: false, second: false, third: true };
  }

  // Carreras totales = automáticas (avance) + manuales (operador, para casos edge)
  // HR es solo automático; el campo `runs` del scorer es ignorado para HR
  const manualRuns = request.result === 'home_run' ? 0 : (request.runs ?? 0);
  const totalRuns = autoRuns + manualRuns;

  // Registrar outs (AddOut puede avanzar la entrada si llega a maxOuts)
  for (let index = 0; index < outsToRecord; index += 1) {
    stateStore.sendCommand('AddOut');
  }

  // Registrar carreras al equipo en turno
  for (let index = 0; index < totalRuns; index += 1) {
    stateStore.sendCommand('IncrementScore', battingTeamRole);
  }

  // Actualizar bases — solo si la entrada no terminó (el engine ya limpió si hubo 3 outs)
  const afterOutsState = stateStore.getState();
  const inningHalfChangedAfterOuts = afterOutsState.inningHalf !== beforeInningHalf;

  if (!inningHalfChangedAfterOuts) {
    if (newBases !== null) {
      stateStore.sendCommand('SetBase', `first:${String(newBases.first)}`);
      stateStore.sendCommand('SetBase', `second:${String(newBases.second)}`);
      stateStore.sendCommand('SetBase', `third:${String(newBases.third)}`);
    }
    stateStore.sendCommand('ResetCount');
  }

  // Avanzar al siguiente bateador
  const finalState = stateStore.getState();
  const newBattingRole = getBattingRole(finalState.inningHalf);
  const inningChanged = newBattingRole !== battingTeamRole;

  if (inningChanged) {
    // Cambio de media entrada: primer bateador del nuevo equipo en turno
    const newLineup = finalState.lineup[newBattingRole];
    if (newLineup.length > 0) {
      const lastIdx = newLineup.findIndex((p) => p.playerId === finalState.currentBatterId);
      const nextBatter = lastIdx >= 0 ? newLineup[(lastIdx + 1) % newLineup.length] : newLineup[0];
      if (nextBatter) {
        stateStore.sendCommand('SetBatter', `playerId:${nextBatter.playerId}`);
      }
    }
  } else {
    // Misma media entrada: siguiente en el orden al bate (circular)
    const lineup = state.lineup[battingTeamRole];
    const currentIndex = lineup.findIndex((p) => p.playerId === request.batterPlayerId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % lineup.length : 0;
    const nextBatter = lineup[nextIndex];
    if (nextBatter) {
      stateStore.sendCommand('SetBatter', `playerId:${nextBatter.playerId}`);
    }
  }
}

export const scorerRouter = Router();

scorerRouter.post('/at-bats', async (request: Request, response: Response) => {
  if (!requirePool(response)) {
    return;
  }

  try {
    const payload = parseAtBatRequest(request.body);
    await insertAtBat(payload);
    applyAtBatToGameState(payload);
    stateStore.broadcast();

    // Calcular y transmitir estadísticas actualizadas por jugador
    computePlayerStats(payload.gameId)
      .then((stats) => {
        stateStore.broadcastPlayerStats(stats);
      })
      .catch((err: unknown) => {
        console.warn('[Scorer] computePlayerStats error', err);
      });

    // Calcular y transmitir estadísticas actualizadas por pitcher
    computePitcherStats(payload.gameId)
      .then((pitcherStats) => {
        stateStore.broadcastPitcherStats(pitcherStats);
      })
      .catch((err: unknown) => {
        console.warn('[Scorer] computePitcherStats error', err);
      });

    sendSuccess(response, {
      gameState: stateStore.getState(),
      recorded: {
        ...payload,
        inning: stateStore.getState().inning,
        inningHalf: stateStore.getState().inningHalf,
      },
    });
  } catch (error) {
    sendError(response, 400, error);
  }
});

scorerRouter.get('/at-bats/:gameId', async (request: Request, response: Response) => {
  const databasePool = requirePool(response);
  if (!databasePool) {
    return;
  }

  try {
    const gameId = parseRequiredString(request.params.gameId, 'gameId');
    const columns = await getAtBatColumns();
    const recordedAtColumn = columns.has('timestamp') ? 'ab.timestamp' : 'ab.created_at';
    const batterPlayerIdExpr = columns.has('batter_player_id') ? 'COALESCE(ab.batter_player_id, ab.player_id)' : 'ab.player_id';
    const selectColumns = [
      'ab.id',
      'ab.game_id',
      'ab.player_id',
      columns.has('batter_player_id') ? 'ab.batter_player_id' : 'NULL AS batter_player_id',
      columns.has('batter_roster_id') ? 'ab.batter_roster_id' : 'NULL AS batter_roster_id',
      columns.has('pitcher_roster_id') ? 'ab.pitcher_roster_id' : 'NULL AS pitcher_roster_id',
      'ab.inning',
      columns.has('inning_half') ? 'ab.inning_half' : 'NULL AS inning_half',
      'ab.result',
      'ab.rbi',
      'ab.runs',
      columns.has('on_base') ? 'ab.on_base' : 'NULL AS on_base',
      columns.has('pitch_count') ? 'ab.pitch_count' : 'NULL AS pitch_count',
      columns.has('notes') ? 'ab.notes' : 'NULL AS notes',
      `${recordedAtColumn} AS recorded_at`,
      'p.name AS batter_name',
      'p.number AS batter_number',
    ];
    const [rows] = await databasePool.query<RowDataPacket[]>(
      `SELECT ${selectColumns.join(', ')}
       FROM at_bats ab
       LEFT JOIN players p ON p.id = ${batterPlayerIdExpr}
       WHERE ab.game_id = ?
       ORDER BY ${recordedAtColumn} DESC`,
      [gameId],
    );

    sendSuccess(response, rows);
  } catch (error) {
    sendError(response, 400, error);
  }
});

scorerRouter.get('/scorer/context', async (_request: Request, response: Response) => {
  if (!requirePool(response)) {
    return;
  }

  try {
    const gameState = stateStore.getState();
    const battingRole = getBattingRole(gameState.inningHalf);
    const pitchingRole = getPitchingRole(gameState.inningHalf);
    const currentBatter = findLineupEntry(gameState.lineup[battingRole], gameState.currentBatterId);
    const currentPitcher = gameState.rules.hasPitcher
      ? findLineupEntry(
          gameState.lineup[pitchingRole].filter((entry) => entry.position.toUpperCase() === 'P' || entry.playerId === gameState.currentPitcherId),
          gameState.currentPitcherId,
        ) ?? findLineupEntry(gameState.lineup[pitchingRole], gameState.currentPitcherId)
      : null;
    const atBatsThisInning = await countAtBatsThisInning(gameState.gameId, gameState.inning, gameState.inningHalf);
    const pitcherStats = gameState.rules.hasPitcher ? await computePitcherStats(gameState.gameId) : {};

    sendSuccess(response, {
      gameState,
      currentInning: gameState.inning,
      inningHalf: gameState.inningHalf,
      currentBatter,
      currentPitcher,
      battingLineup: gameState.lineup[battingRole],
      pitchingLineup: gameState.lineup[pitchingRole],
      atBatsThisInning,
      pitcherStats,
      pitcherChangeLog: stateStore.pitcherChangeLog,
    });
  } catch (error) {
    sendError(response, 400, error);
  }
});

/**
 * POST /pitch
 * Registra un pitcheo (bola, strike, foul) con lógica automática:
 * - Bola 4 → auto-walk
 * - Strike 3 → auto-ponche
 * - Foul con 2 strikes → no-op
 */
scorerRouter.post('/pitch', async (request: Request, response: Response) => {
  if (!requirePool(response)) return;

  try {
    const body = request.body as { type?: string };
    const type = body.type;
    if (type !== 'ball' && type !== 'strike' && type !== 'foul') {
      sendError(response, 400, new Error('type debe ser "ball", "strike" o "foul"'));
      return;
    }

    const state = stateStore.getState();
    const currentBalls = state.count.balls;
    const currentStrikes = state.count.strikes;

    if (type === 'foul') {
      if (currentStrikes < 2) {
        stateStore.sendCommand('AddStrike');
        stateStore.incrementPitchCount();
      }
      sendSuccess(response, { gameState: stateStore.getState(), action: currentStrikes < 2 ? 'strike_added' : 'no_op' });
      return;
    }

    if (type === 'ball') {
      const newBalls = currentBalls + 1;
      stateStore.incrementPitchCount();

      if (newBalls >= 4) {
        const pitchCount = stateStore.getPitchCount();
        const battingRole = getBattingRole(state.inningHalf);
        const batterId = state.currentBatterId ?? state.lineup[battingRole][0]?.playerId ?? '';
        const pitcherId = state.rules.hasPitcher ? (state.currentPitcherId ?? undefined) : undefined;

        const walkRequest: AtBatRequest = {
          gameId: state.gameId,
          batterPlayerId: batterId,
          pitcherPlayerId: pitcherId,
          result: 'walk',
          rbi: 0,
          runs: 0,
          pitchCount,
        };

        await insertAtBat(walkRequest);
        applyAtBatToGameState(walkRequest);
        stateStore.resetPitchCount();
        stateStore.broadcast();

        computePlayerStats(state.gameId)
          .then((stats) => { stateStore.broadcastPlayerStats(stats); })
          .catch((err: unknown) => { console.warn('[Pitch] computePlayerStats error', err); });

        sendSuccess(response, { gameState: stateStore.getState(), action: 'auto_walk' });
      } else {
        stateStore.sendCommand('AddBall');
        sendSuccess(response, { gameState: stateStore.getState(), action: 'ball_added' });
      }
      return;
    }

    // type === 'strike'
    const newStrikes = currentStrikes + 1;
    stateStore.incrementPitchCount();

    if (newStrikes >= 3) {
      const pitchCount = stateStore.getPitchCount();
      const battingRole = getBattingRole(state.inningHalf);
      const batterId = state.currentBatterId ?? state.lineup[battingRole][0]?.playerId ?? '';
      const pitcherId = state.rules.hasPitcher ? (state.currentPitcherId ?? undefined) : undefined;

      const kRequest: AtBatRequest = {
        gameId: state.gameId,
        batterPlayerId: batterId,
        pitcherPlayerId: pitcherId,
        result: 'strikeout',
        rbi: 0,
        runs: 0,
        pitchCount,
      };

      await insertAtBat(kRequest);
      applyAtBatToGameState(kRequest);
      stateStore.resetPitchCount();
      stateStore.broadcast();

      computePlayerStats(state.gameId)
        .then((stats) => { stateStore.broadcastPlayerStats(stats); })
        .catch((err: unknown) => { console.warn('[Pitch] computePlayerStats error', err); });

      sendSuccess(response, { gameState: stateStore.getState(), action: 'auto_strikeout' });
    } else {
      stateStore.sendCommand('AddStrike');
      sendSuccess(response, { gameState: stateStore.getState(), action: 'strike_added' });
    }
  } catch (error) {
    sendError(response, 400, error);
  }
});

// ─── RESET JUEGO ─────────────────────────────────────────────────────────────
scorerRouter.post('/game/reset', async (_request: Request, response: Response) => {
  try {
    const state = stateStore.getState();
    const gameId = state.gameId;

    if (!pool) {
      sendError(response, 503, 'DB no disponible');
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM at_bats WHERE game_id = ?', [gameId]);
      // operator_actions no tiene game_id, se deja intacto
      await conn.query(
        `UPDATE broadcast_sessions SET state_json = JSON_SET(
          state_json,
          '$.score', JSON_OBJECT('home', 0, 'away', 0),
          '$.inning', 1,
          '$.inningHalf', 'top',
          '$.outs', 0,
          '$.bases', JSON_OBJECT('first', false, 'second', false, 'third', false),
          '$.count', JSON_OBJECT('balls', 0, 'strikes', 0),
          '$.status', 'scheduled',
          '$.currentBatterId', NULL,
          '$.currentPitcherId', NULL
        ) WHERE game_id = ?`,
        [gameId],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Reiniciar engine en memoria preservando equipos y lineup
    stateStore.resetGame();

    sendSuccess(response, { message: 'Juego reiniciado correctamente', gameId });
  } catch (error) {
    sendError(response, 500, error);
  }
});

