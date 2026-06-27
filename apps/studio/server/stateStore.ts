import type { Envelope, MessageType } from '@playflow/core';
import { EventEngine, type EventEngineOutput, type EventEngineRequest } from '@playflow/event-engine';
import {
  GameEngine,
  type GameBases,
  type GameLineup,
  type GameScore,
  type GameState,
  type GameStatus,
  type InningHalf,
  type LineupEntry,
  type RunnerOnBase,
  type TeamRole,
  validateLineup,
} from '@playflow/game-engine';

import type { RowDataPacket } from 'mysql2';

import { DEMO_GAME_DETAIL, toGameLineup, toGameLoadSnapshot, type GameLoadSnapshot } from '../src/gameConfig';
import { pool } from './db';

export type OverlayCommand =
  | 'ShowOverlay'
  | 'HideOverlay'
  | 'HideAll'
  | 'IncrementScore'
  | 'SetScore'
  | 'AddOut'
  | 'AddBall'
  | 'AddStrike'
  | 'ResetCount'
  | 'SetBase'
  | 'AdvanceInning'
  | 'StartGame'
  | 'EndGame'
  | 'SetBatter'
  | 'SetPitcher'
  | 'SetLineupHome'
  | 'SetLineupAway'
  | 'GetState';

export interface CommandResult {
  command: OverlayCommand;
  value?: string;
  data: unknown;
}

export interface RunnerOnBaseWithPitcher extends RunnerOnBase {
  responsiblePitcherId?: string;
}

export interface GameBasesWithPitcherResponsibility extends GameBases {
  first: RunnerOnBaseWithPitcher | null;
  second: RunnerOnBaseWithPitcher | null;
  third: RunnerOnBaseWithPitcher | null;
}

export interface StateMessage {
  type: 'state';
  payload: Readonly<GameState>;
  visibleOverlays?: string[];
}

export interface ShowMessage {
  type: 'show';
  overlay: string;
  payload?: Readonly<GameState>;
}

export interface HideMessage {
  type: 'hide';
  overlay: string;
}

export interface EventMessage {
  type: 'event';
  payload: Envelope<Record<string, unknown>>;
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

export interface PlayerStatsMessage {
  type: 'player_stats';
  payload: Record<string, GamePlayerStats>;
}

export interface PitcherStatsMessage {
  type: 'pitcher_stats';
  payload: Record<string, PitcherStats>;
}

export interface HalfInningMvp {
  playerId: string;
  name: string;
  number?: string;
  position?: string;
  hits: number;
  rbi: number;
}

export interface HalfInningSequenceMessage {
  type: 'half_inning_sequence';
  phase: 'outro' | 'sponsor' | 'intro' | 'end';
  data: {
    endedInning?: number;
    endedHalf?: InningHalf;
    runsScored?: number;
    hitsCount?: number;
    mvpBatter?: HalfInningMvp | null;
    score?: GameScore;
    sponsor?: { sponsorId: string; name: string };
    batters?: Array<{ state: string; order: number; playerId: string; number?: string; name: string; position?: string }>;
    battingTeam?: { teamId: string; name: string; shortName: string };
    newInning?: number;
    newInningHalf?: InningHalf;
  };
}

export type StoreMessage = StateMessage | ShowMessage | HideMessage | EventMessage | PlayerStatsMessage | PitcherStatsMessage | HalfInningSequenceMessage;
export type Subscriber = (message: StoreMessage) => void;

interface OverlayUiState {
  visibleOverlays: string[];
}

const AVAILABLE_OVERLAYS = [
  'batter',
  'next-batters',
  'scorebug',
  'inning-transition',
  'final-score',
  'sponsor-break',
  'announcement',
  'social-lower-third',
  'countdown',
  'substitution',
  'game-event',
] as const;

const DEMO_OPERATOR_ID = 'studio';
const DEMO_REASON = 'remote-command';
const HALF_INNING_SEQUENCE_DURATION_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createEnvelope<T>(messageType: MessageType, source: string, target: string, payload: T): Envelope<T> {
  return {
    schemaVersion: '1.0.0',
    messageType,
    correlationId: `corr-${Date.now()}`,
    source,
    target,
    timestamp: new Date().toISOString(),
    payload,
  };
}

function assertNonEmpty(value: string | undefined, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function parseTeamRole(value: string | undefined): TeamRole {
  const normalized = assertNonEmpty(value, 'value');

  if (normalized !== 'home' && normalized !== 'away') {
    throw new Error('value must be "home" or "away"');
  }

  return normalized;
}

function parseScoreValue(value: string | undefined): Partial<GameScore> {
  const normalized = assertNonEmpty(value, 'value');
  const nextScore: Partial<GameScore> = {};

  for (const entry of normalized.split(',')) {
    const [teamRaw, scoreRaw] = entry.split(':', 2);
    const team = teamRaw?.trim();
    const scoreValue = scoreRaw?.trim();

    if (team !== 'home' && team !== 'away') {
      throw new Error('SetScore expects "home:<n>,away:<n>"');
    }

    const parsedScore = Number(scoreValue);
    if (!Number.isInteger(parsedScore) || parsedScore < 0) {
      throw new Error(`Invalid score for ${team}`);
    }

    nextScore[team] = parsedScore;
  }

  if (Object.keys(nextScore).length === 0) {
    throw new Error('SetScore requires at least one score value');
  }

  return nextScore;
}

// parseBooleanToken se usa en compatibilidad legada (SetBase true/false)
function parseBooleanToken(value: string): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error('Boolean value must be "true" or "false"');
}

export function toSetBaseCommand(
  base: 'first' | 'second' | 'third',
  runner: RunnerOnBaseWithPitcher | null,
): string {
  if (!runner) {
    return `${base}:false`;
  }

  let command = `${base}:playerId:${runner.id}`;
  if (runner.responsiblePitcherId) {
    command += `:responsiblePitcherId:${runner.responsiblePitcherId}`;
  }

  return command;
}

function parseBaseValue(
  value: string | undefined,
  currentPitcherId?: string,
): Partial<GameBasesWithPitcherResponsibility> {
  const normalized = assertNonEmpty(value, 'value');
  const parts = normalized.split(':');
  const base = parts[0]?.trim() as 'first' | 'second' | 'third' | undefined;
  const token = parts[1]?.trim();

  if (base !== 'first' && base !== 'second' && base !== 'third') {
    throw new Error('SetBase expects "first:true", "second:false", "first:false" or "first:playerId:<id>"');
  }

  let runner: RunnerOnBaseWithPitcher | null;

  if (token === 'playerId') {
    // Formato: first:playerId:<id> — corredor identificado
    const playerId = parts[2]?.trim();
    if (!playerId) throw new Error('SetBase playerId format requires an id: "first:playerId:<id>"');
    const responsiblePitcherToken = parts[3]?.trim();
    const explicitResponsiblePitcherId = parts[4]?.trim();
    if (responsiblePitcherToken && responsiblePitcherToken !== 'responsiblePitcherId') {
      throw new Error(
        'SetBase optional responsible pitcher format must be "first:playerId:<id>:responsiblePitcherId:<pitcherId>"',
      );
    }
    if (responsiblePitcherToken === 'responsiblePitcherId' && !explicitResponsiblePitcherId) {
      throw new Error('SetBase responsiblePitcherId format requires an id');
    }
    const originMap: Record<'first' | 'second' | 'third', RunnerOnBase['originBase']> = {
      first: 'first', second: 'second', third: 'third',
    };
    const responsiblePitcherId = explicitResponsiblePitcherId ?? currentPitcherId;
    runner = {
      id: playerId,
      name: '',
      number: 0,
      originBase: originMap[base],
      earned: true,
      ...(responsiblePitcherId ? { responsiblePitcherId } : {}),
    };
  } else if (token === 'false' || token === 'null' || token === 'clear') {
    runner = null;
  } else if (token === 'true') {
    // Corredor anónimo — compatibilidad legada y operador manual sin ficha
    runner = {
      id: `anon-${base}`,
      name: '',
      number: 0,
      originBase: base,
      earned: true,
      ...(currentPitcherId ? { responsiblePitcherId: currentPitcherId } : {}),
    };
  } else {
    // Intentar parsear como boolean para dar mensaje de error claro
    void parseBooleanToken(token); // lanza si no es "true"/"false"
    throw new Error('SetBase requires boolean or playerId format: "first:true", "first:false", "first:playerId:<id>"');
  }

  return { [base]: runner } satisfies Partial<GameBasesWithPitcherResponsibility>;
}

function parseBatterValue(value: string | undefined): string {
  const normalized = assertNonEmpty(value, 'value');
  const [keyRaw, playerIdRaw] = normalized.split(':', 2);
  const key = keyRaw?.trim();
  const playerId = playerIdRaw?.trim();

  if (key !== 'playerId' || !playerId) {
    throw new Error('SetBatter expects "playerId:<id>"');
  }

  return playerId;
}

function parsePitcherValue(value: string | undefined): string {
  const normalized = assertNonEmpty(value, 'value');
  const [keyRaw, playerIdRaw] = normalized.split(':', 2);
  const key = keyRaw?.trim();
  const playerId = playerIdRaw?.trim();

  if (key !== 'playerId' || !playerId) {
    throw new Error('SetPitcher expects "playerId:<id>"');
  }

  return playerId;
}

function parseLineupEntries(value: string | undefined, command: 'SetLineupHome' | 'SetLineupAway'): LineupEntry[] {
  const normalized = assertNonEmpty(value, 'value');
  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error(`${command} expects a JSON array`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${command} expects a JSON array`);
  }

  const entries = parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`${command} entry at index ${index} must be an object`);
    }

    const record = entry as Record<string, unknown>;
    const { order, playerId, name, number, position, status, photoAssetId } = record;

    if (
      typeof order !== 'number' ||
      typeof playerId !== 'string' ||
      typeof name !== 'string' ||
      typeof number !== 'string' ||
      typeof position !== 'string' ||
      (status !== 'active' && status !== 'substituted' && status !== 'ejected')
    ) {
      throw new Error(`${command} contains invalid lineup data`);
    }

    return {
      order,
      playerId,
      name,
      number,
      position,
      status,
      ...(typeof photoAssetId === 'string' && photoAssetId ? { photoAssetId } : {}),
    } satisfies LineupEntry;
  });

  validateLineup(command === 'SetLineupHome' ? { home: entries, away: [] } : { home: [], away: entries });
  return entries;
}

export interface PitcherStats {
  pitcherId: string;
  outs: number;
  ip: string;
  pitches: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  runsAllowed: number;
}

export interface PitcherChangeEntry {
  oldPitcherId: string | null;
  newPitcherId: string;
  inning: number;
  inningHalf: InningHalf;
  inheritedRunners: number;
  timestamp: string;
}

export interface PitcherChangeMessage {
  type: 'pitcher_change';
  payload: PitcherChangeEntry;
}

class StateStore {
  private engine: GameEngine;
  private readonly eventEngine: EventEngine;
  private readonly subscribers = new Set<Subscriber>();
  private readonly visibleOverlays = new Set<string>();

  // Conteo de pitcheos del at-bat actual (se resetea al cambiar de bateador)
  private atBatPitchCount = 0;
  // Último pitcher por rol de equipo (para auto-selección al inicio de media entrada)
  private readonly lastPitcherByRole: Partial<Record<TeamRole, string>> = {};
  // Log de cambios de pitcher con corredores heredados
  readonly pitcherChangeLog: PitcherChangeEntry[] = [];

  constructor() {
    this.eventEngine = new EventEngine();
    this.engine = this.createEngine(toGameLoadSnapshot(DEMO_GAME_DETAIL));
    this.applyStateToEngine(this.engine, {
      ...toGameLoadSnapshot(DEMO_GAME_DETAIL),
      currentBatterId: DEMO_GAME_DETAIL.currentBatterId,
      currentPitcherId: DEMO_GAME_DETAIL.currentPitcherId,
      lineup: toGameLineup(DEMO_GAME_DETAIL.lineups),
    });
    // El scorebug siempre visible como estado base del broadcast
    this.visibleOverlays.add('scorebug');
  }

  getState(): Readonly<GameState> {
    return this.engine.getState();
  }

  getAvailableOverlays(): string[] {
    return [...AVAILABLE_OVERLAYS];
  }

  getPitchCount(): number {
    return this.atBatPitchCount;
  }

  incrementPitchCount(): void {
    this.atBatPitchCount++;
  }

  resetPitchCount(): void {
    this.atBatPitchCount = 0;
  }

  getVisibleOverlays(): string[] {
    return [...this.visibleOverlays];
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  broadcast(): void {
    this.emit({ type: 'state', payload: this.getState() });
    this.persistGameState();
  }

  loadGameSnapshot(snapshot: GameLoadSnapshot): void {
    this.visibleOverlays.clear();
    this.visibleOverlays.add('scorebug');
    this.engine = this.createEngine(snapshot);
    this.applyStateToEngine(this.engine, snapshot);
    this.broadcast();
  }

  /** Reinicia el juego a entrada 1, marcador 0-0, preservando equipos y lineup. */
  resetGame(): void {
    const current = this.engine.getState();
    const extendedSnapshot: GameLoadSnapshot & {
      currentBatterId?: string;
      currentPitcherId?: string;
      lineup?: GameLineup;
    } = {
      gameId: current.gameId,
      homeTeam: current.homeTeam,
      awayTeam: current.awayTeam,
      status: 'live',
      inning: 1,
      inningHalf: 'top',
      outs: 0,
      score: { home: 0, away: 0 },
      bases: { first: null, second: null, third: null },
      count: { balls: 0, strikes: 0 },
      lineup: current.lineup,
      currentBatterId: current.lineup.away[0]?.playerId ?? current.lineup.home[0]?.playerId,
      currentPitcherId: undefined,
    };
    this.visibleOverlays.clear();
    this.visibleOverlays.add('scorebug');
    this.atBatPitchCount = 0;
    this.pitcherChangeLog.splice(0);
    for (const key of Object.keys(this.lastPitcherByRole) as TeamRole[]) {
      delete this.lastPitcherByRole[key];
    }
    this.engine = this.createEngine(extendedSnapshot);
    this.applyStateToEngine(this.engine, extendedSnapshot);

    // Inning 1 top → equipo local pitchea. Auto-seleccionar primera pitcher.
    const homeLineup = this.engine.getState().lineup.home;
    const firstPitcher = homeLineup.find((p) => p.position?.toUpperCase() === 'P') ?? homeLineup[0];
    if (firstPitcher) {
      this.engine.setCurrentPitcher(firstPitcher.playerId);
      this.lastPitcherByRole['home'] = firstPitcher.playerId;
    }

    this.broadcast();
  }

  /** Restaura el último estado guardado en DB al arrancar. Si falla, usa demo. */
  async init(): Promise<void> {
    if (!pool) return;

    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT game_id, state_json FROM broadcast_sessions ORDER BY updated_at DESC LIMIT 1',
      );

      if (rows.length === 0) return;

      const savedState = (
        typeof rows[0]!.state_json === 'string' ? JSON.parse(rows[0]!.state_json as string) : rows[0]!.state_json
      ) as GameState;

      const snapshot: GameLoadSnapshot & { currentBatterId?: string; currentPitcherId?: string; lineup?: GameLineup } = {
        gameId: savedState.gameId,
        homeTeam: savedState.homeTeam,
        awayTeam: savedState.awayTeam,
        status: savedState.status,
        inning: savedState.inning,
        inningHalf: savedState.inningHalf,
        outs: savedState.outs,
        bases: savedState.bases,
        count: savedState.count,
        score: savedState.score,
        currentBatterId: savedState.currentBatterId,
        currentPitcherId: savedState.currentPitcherId,
        lineup: savedState.lineup,
      };

      // Si el lineup guardado está vacío, recupéralo desde game_lineups + players en la DB
      const restoredLineup = savedState.lineup as GameLineup | undefined;
      if (!restoredLineup || (restoredLineup.home.length === 0 && restoredLineup.away.length === 0)) {
        try {
          // Obtiene home_team_id y away_team_id del juego para asignar roles
          const [gameRows] = await pool.query<RowDataPacket[]>(
            'SELECT home_team_id, away_team_id FROM games WHERE id = ? LIMIT 1',
            [savedState.gameId],
          );

          const homeTeamId = gameRows[0]?.home_team_id as string | undefined ?? savedState.homeTeam?.id;
          const awayTeamId = gameRows[0]?.away_team_id as string | undefined ?? savedState.awayTeam?.id;

          const [lineupRows] = await pool.query<RowDataPacket[]>(
            `SELECT gl.team_id, gl.batting_order, gl.position, gl.is_starter,
                    p.id AS p_id, p.name AS p_name, p.number AS p_number,
                    p.position AS p_pos, p.status AS p_status,
                    p.photo_asset_id AS p_photo_asset_id
             FROM game_lineups gl
             LEFT JOIN players p ON gl.player_id = p.id
             WHERE gl.game_id = ?
             ORDER BY gl.batting_order ASC`,
            [savedState.gameId],
          );

          if (lineupRows.length > 0) {
            const homeEntries: LineupEntry[] = [];
            const awayEntries: LineupEntry[] = [];

            for (const row of lineupRows) {
              const entry: LineupEntry = {
                order: row.batting_order as number,
                playerId: row.p_id as string,
                name: row.p_name as string,
                number: String(row.p_number ?? ''),
                position: (row.position || row.p_pos) as string,
                status: 'active',
                ...(row.p_photo_asset_id ? { photoAssetId: row.p_photo_asset_id as string } : {}),
              };

              if (row.team_id === homeTeamId) homeEntries.push(entry);
              else if (row.team_id === awayTeamId) awayEntries.push(entry);
            }

            snapshot.lineup = { home: homeEntries, away: awayEntries };
            console.info('[StateStore] Lineup recuperado desde game_lineups', {
              gameId: savedState.gameId,
              home: homeEntries.length,
              away: awayEntries.length,
            });
          }
        } catch (lineupErr) {
          console.warn('[StateStore] No se pudo recuperar lineup desde DB', lineupErr);
        }
      }

      this.visibleOverlays.clear();
      this.visibleOverlays.add('scorebug');
      this.engine = this.createEngine(snapshot);
      this.applyStateToEngine(this.engine, snapshot);

      console.info('[StateStore] Estado restaurado desde DB', { gameId: savedState.gameId, status: savedState.status });
    } catch (err) {
      console.warn('[StateStore] No se pudo restaurar estado desde DB, usando demo', err);
    }
  }

  /** Persiste el estado actual en broadcast_sessions (fire-and-forget). */
  private persistGameState(): void {
    if (!pool) return;

    const state = this.getState();
    pool
      .query(
        `INSERT INTO broadcast_sessions (game_id, state_json)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = CURRENT_TIMESTAMP(3)`,
        [state.gameId, JSON.stringify(state)],
      )
      .catch((err: unknown) => {
        console.warn('[StateStore] Error al persistir estado', err);
      });
  }


  broadcastPlayerStats(stats: Record<string, GamePlayerStats>): void {
    this.emit({ type: 'player_stats', payload: stats });
  }

  broadcastPitcherStats(stats: Record<string, PitcherStats>): void {
    this.emit({ type: 'pitcher_stats', payload: stats });
  }

  private async computeInningSummary(
    gameId: string,
    inning: number,
    inningHalf: InningHalf,
  ): Promise<{
    mvpBatter: HalfInningMvp | null;
    runsScored: number;
    hitsCount: number;
  }> {
    if (!pool) {
      return { mvpBatter: null, runsScored: 0, hitsCount: 0 };
    }

    try {
      const [totalsRows] = await pool.query<RowDataPacket[]>(
        `SELECT
          SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END) AS hits,
          SUM(runs) AS runs
        FROM at_bats
        WHERE game_id = ? AND inning = ? AND inning_half = ?`,
        [gameId, inning, inningHalf],
      );

      const [mvpRows] = await pool.query<RowDataPacket[]>(
        `SELECT
          COALESCE(batter_player_id, player_id) AS player_id,
          SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END) AS hits,
          SUM(rbi) AS rbi
        FROM at_bats
        WHERE game_id = ? AND inning = ? AND inning_half = ?
        GROUP BY COALESCE(batter_player_id, player_id)
        ORDER BY rbi DESC, hits DESC
        LIMIT 1`,
        [gameId, inning, inningHalf],
      );

      const totalRow = totalsRows[0];
      const mvpRow = mvpRows[0];
      let mvpBatter: HalfInningMvp | null = null;

      if (mvpRow && Number(mvpRow.hits ?? 0) > 0) {
        const gameState = this.getState();
        const battingRole: TeamRole = inningHalf === 'top' ? 'away' : 'home';
        const lineup = gameState.lineup[battingRole];
        const lineupEntry = lineup.find((p) => p.playerId === (mvpRow.player_id as string));

        mvpBatter = {
          playerId: mvpRow.player_id as string,
          name: lineupEntry?.name ?? 'Jugadora',
          number: lineupEntry?.number,
          position: lineupEntry?.position,
          hits: Number(mvpRow.hits ?? 0),
          rbi: Number(mvpRow.rbi ?? 0),
        };
      }

      return {
        mvpBatter,
        runsScored: Number(totalRow?.runs ?? 0),
        hitsCount: Number(totalRow?.hits ?? 0),
      };
    } catch (err) {
      console.warn('[StateStore] computeInningSummary error', err);
      return { mvpBatter: null, runsScored: 0, hitsCount: 0 };
    }
  }

  private getNextBattersForSequence(
    state: Readonly<GameState>,
    battingRole: TeamRole,
  ): Array<{ state: string; order: number; playerId: string; number?: string; name: string; position?: string }> {
    const lineup = state.lineup[battingRole];

    if (lineup.length === 0) return [];

    const currentIndex = Math.max(
      0,
      lineup.findIndex((p) => p.playerId === state.currentBatterId),
    );

    return (['current', 'on_deck', 'in_the_hole'] as const).map((bState, offset) => {
      const player = lineup[(currentIndex + offset) % lineup.length];
      return {
        state: bState,
        order: player.order,
        playerId: player.playerId,
        number: player.number,
        name: player.name,
        position: player.position,
      };
    });
  }

  private async startHalfInningSequence(gameId: string, endedInning: number, endedHalf: InningHalf): Promise<void> {
    try {
      const summary = await this.computeInningSummary(gameId, endedInning, endedHalf);
      const newState = this.getState();
      const newBattingRole: TeamRole = newState.inningHalf === 'top' ? 'away' : 'home';
      const battingTeam = newBattingRole === 'home' ? newState.homeTeam : newState.awayTeam;
      const nextBatters = this.getNextBattersForSequence(newState, newBattingRole);

      // Fase 1: Outro — jugadora MVP de la entrada cerrada (8 s)
      this.emit({
        type: 'half_inning_sequence',
        phase: 'outro',
        data: {
          endedInning,
          endedHalf,
          runsScored: summary.runsScored,
          hitsCount: summary.hitsCount,
          mvpBatter: summary.mvpBatter,
          score: newState.score,
        },
      });
      this.emit({ type: 'show', overlay: 'game-event', payload: newState });

      await sleep(HALF_INNING_SEQUENCE_DURATION_MS);

      // Fase 2: Patrocinador (8 s)
      this.emit({ type: 'hide', overlay: 'game-event' });
      this.emit({
        type: 'half_inning_sequence',
        phase: 'sponsor',
        data: { sponsor: { sponsorId: 'sponsor-001', name: 'Patrocinador' } },
      });
      this.emit({ type: 'show', overlay: 'sponsor-break', payload: newState });

      await sleep(HALF_INNING_SEQUENCE_DURATION_MS);

      // Fase 3: Intro — próximas 3 bateadoras (8 s)
      this.emit({ type: 'hide', overlay: 'sponsor-break' });
      this.emit({
        type: 'half_inning_sequence',
        phase: 'intro',
        data: {
          batters: nextBatters,
          battingTeam: { teamId: battingTeam.id, name: battingTeam.name, shortName: battingTeam.shortName },
          newInning: newState.inning,
          newInningHalf: newState.inningHalf,
        },
      });
      this.emit({ type: 'show', overlay: 'next-batters', payload: newState });

      await sleep(HALF_INNING_SEQUENCE_DURATION_MS);

      // Fin de secuencia
      this.emit({ type: 'hide', overlay: 'next-batters' });
      this.emit({ type: 'half_inning_sequence', phase: 'end', data: {} });
    } catch (err) {
      console.warn('[StateStore] startHalfInningSequence error', err);
    }
  }

  private emit(message: StoreMessage): void {
    for (const subscriber of this.subscribers) {
      subscriber(message);
    }
  }

  sendCommand(command: string, value?: string): CommandResult {
    switch (command) {
      case 'ShowOverlay': {
        const overlayName = assertNonEmpty(value, 'value');
        this.visibleOverlays.add(overlayName);
        this.emit({ type: 'show', overlay: overlayName, payload: this.getState() });
        this.emit({ type: 'state', payload: this.getState(), visibleOverlays: [...this.visibleOverlays] });
        return { command, value: overlayName, data: this.getUiState() };
      }
      case 'HideOverlay': {
        const overlayName = assertNonEmpty(value, 'value');
        this.visibleOverlays.delete(overlayName);
        this.emit({ type: 'hide', overlay: overlayName });
        this.emit({ type: 'state', payload: this.getState(), visibleOverlays: [...this.visibleOverlays] });
        return { command, value: overlayName, data: this.getUiState() };
      }
      case 'HideAll': {
        this.visibleOverlays.clear();
        this.emit({ type: 'hide', overlay: 'all' });
        this.emit({ type: 'state', payload: this.getState(), visibleOverlays: [] });
        return { command: 'HideAll', data: this.getUiState() };
      }
      case 'IncrementScore': {
        const team = parseTeamRole(value);
        this.engine.incrementScore(team, DEMO_OPERATOR_ID);
        return { command, value: team, data: this.getState() };
      }
      case 'SetScore': {
        const nextScore = parseScoreValue(value);
        this.engine.setScore(nextScore, DEMO_OPERATOR_ID, DEMO_REASON);
        return { command, value, data: this.getState() };
      }
      case 'AddOut': {
        this.engine.addOut();
        return { command, data: this.getState() };
      }
      case 'AddBall': {
        const currentCount = this.engine.getState().count;
        this.engine.setCount({ balls: currentCount.balls + 1 });
        this.atBatPitchCount++;
        return { command, data: this.getState() };
      }
      case 'AddStrike': {
        const currentCount = this.engine.getState().count;
        this.engine.setCount({ strikes: currentCount.strikes + 1 });
        this.atBatPitchCount++;
        return { command, data: this.getState() };
      }
      case 'ResetCount': {
        this.engine.resetCount();
        this.atBatPitchCount = 0;
        return { command, data: this.getState() };
      }
      case 'SetBase': {
        const bases = parseBaseValue(value, this.engine.getState().currentPitcherId);
        this.engine.setBases(bases, DEMO_OPERATOR_ID);
        return { command, value, data: this.getState() };
      }
      case 'AdvanceInning': {
        this.engine.advanceHalfInning();
        return { command, data: this.getState() };
      }
      case 'StartGame': {
        this.engine.startGame();
        return { command, data: this.getState() };
      }
      case 'EndGame': {
        this.engine.endGame();
        return { command, data: this.getState() };
      }
      case 'SetBatter': {
        const batterId = parseBatterValue(value);
        this.engine.setCurrentBatter(batterId);
        this.atBatPitchCount = 0; // nuevo turno al bate = pitcheos desde cero
        return { command, value: batterId, data: this.getState() };
      }
      case 'SetPitcher': {
        const pitcherId = parsePitcherValue(value);
        // Registrar cambio con corredores heredados antes de aplicar
        const stateBeforeChange = this.engine.getState();
        const oldPitcherId = stateBeforeChange.currentPitcherId ?? null;
        if (oldPitcherId !== pitcherId) {
          const bases = stateBeforeChange.bases;
          const inheritedRunners = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
          if (oldPitcherId !== null) {
            const entry: PitcherChangeEntry = {
              oldPitcherId,
              newPitcherId: pitcherId,
              inning: stateBeforeChange.inning,
              inningHalf: stateBeforeChange.inningHalf,
              inheritedRunners,
              timestamp: new Date().toISOString(),
            };
            this.pitcherChangeLog.push(entry);
          }
          const pitchingRole: TeamRole = stateBeforeChange.inningHalf === 'top' ? 'home' : 'away';
          this.lastPitcherByRole[pitchingRole] = pitcherId;
        }
        this.engine.setCurrentPitcher(pitcherId);
        return { command, value: pitcherId, data: this.getState() };
      }
      case 'SetLineupHome': {
        const homeLineup = parseLineupEntries(value, 'SetLineupHome');
        const currentLineup = this.engine.getState().lineup;
        const nextLineup: GameLineup = {
          home: homeLineup,
          away: currentLineup.away,
        };
        this.engine.setLineup(nextLineup);
        return { command, data: this.getState() };
      }
      case 'SetLineupAway': {
        const awayLineup = parseLineupEntries(value, 'SetLineupAway');
        const currentLineup = this.engine.getState().lineup;
        const nextLineup: GameLineup = {
          home: currentLineup.home,
          away: awayLineup,
        };
        this.engine.setLineup(nextLineup);
        return { command, data: this.getState() };
      }
      case 'GetState': {
        return { command, data: this.getState() };
      }
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }

  private getUiState(): OverlayUiState {
    return {
      visibleOverlays: [...this.visibleOverlays],
    };
  }

  private createEngine(snapshot: GameLoadSnapshot): GameEngine {
    const engine = new GameEngine(snapshot.gameId, snapshot.homeTeam, snapshot.awayTeam);
    this.bindEngine(engine);
    return engine;
  }

  private bindEngine(engine: GameEngine): void {
    engine.on('event', (gameEvent) => {
      this.emitEvent(gameEvent.eventType, {
        gameEvent,
        ui: this.getUiState(),
      });

      try {
        const output = this.eventEngine.process(gameEvent);
        this.handleEventEngineOutput(output);
      } catch (error) {
        console.warn('[StateStore] EventEngine failed to process GameEngine event', {
          eventType: gameEvent.eventType,
          eventId: gameEvent.eventId,
          error: error instanceof Error ? error.message : error,
        });
      }

      this.broadcast();
    });

    engine.on('inning_ended', (gameEvent) => {
      const endedInning = gameEvent.payload.inning as number;
      const endedHalf = gameEvent.payload.inningHalf as InningHalf;
      const gameId = this.getState().gameId;

      // Lanzar la secuencia asíncrona sin bloquear el hilo del engine
      setTimeout(() => {
        this.startHalfInningSequence(gameId, endedInning, endedHalf).catch((err: unknown) => {
          console.warn('[StateStore] startHalfInningSequence uncaught', err);
        });
      }, 0);
    });

    engine.on('inning_started', (gameEvent) => {
      const newHalf = gameEvent.payload.inningHalf as InningHalf;
      const state = this.getState();
      if (state.status !== 'live' && state.status !== 'between_innings') return;

      // Equipo al pitcheo: top=home, bottom=away
      const pitchingRole: TeamRole = newHalf === 'top' ? 'home' : 'away';
      const lastPitcher = this.lastPitcherByRole[pitchingRole];

      if (lastPitcher) {
        this.engine.setCurrentPitcher(lastPitcher);
      } else {
        // Primer pitcher del lineup del equipo en turno
        const lineup = state.lineup[pitchingRole];
        const pitcher = lineup.find((p) => p.position?.toUpperCase() === 'P');
        if (pitcher) {
          this.engine.setCurrentPitcher(pitcher.playerId);
          this.lastPitcherByRole[pitchingRole] = pitcher.playerId;
        }
      }

      // Reset pitch count al iniciar media entrada
      this.atBatPitchCount = 0;
    });
  }

  private applyStateToEngine(
    engine: GameEngine,
    snapshot: GameLoadSnapshot & {
      currentBatterId?: string;
      currentPitcherId?: string;
      lineup?: GameLineup;
    },
  ): void {
    this.applyStatus(engine, snapshot.status);
    this.applyInning(engine, snapshot.inning, snapshot.inningHalf);
    engine.setScore(snapshot.score, DEMO_OPERATOR_ID, DEMO_REASON);
    engine.setOuts(snapshot.outs, DEMO_OPERATOR_ID, DEMO_REASON);
    engine.setBases(snapshot.bases, DEMO_OPERATOR_ID);
    engine.setCount(snapshot.count);

    if (snapshot.lineup) {
      engine.setLineup(snapshot.lineup);
    }

    if (snapshot.currentBatterId) {
      engine.setCurrentBatter(snapshot.currentBatterId);
    }

    if (snapshot.currentPitcherId) {
      engine.setCurrentPitcher(snapshot.currentPitcherId);
    }
  }

  private applyStatus(engine: GameEngine, status: GameStatus): void {
    if (status === 'scheduled' || status === 'pre_game') {
      return;
    }

    engine.startGame();

    if (status === 'paused') {
      engine.pauseGame();
      return;
    }

    if (status === 'final') {
      engine.endGame();
    }
  }

  private applyInning(engine: GameEngine, inning: number, inningHalf: InningHalf): void {
    const normalizedInning = Math.max(1, inning);
    const targetIndex = (normalizedInning - 1) * 2 + (inningHalf === 'bottom' ? 1 : 0);

    for (let currentIndex = 0; currentIndex < targetIndex; currentIndex += 1) {
      engine.advanceHalfInning();
    }
  }

  private handleEventEngineOutput(output: EventEngineOutput): void {
    for (const request of output.requests) {
      if (!this.shouldProcessEventEngineRequest(request)) {
        continue;
      }

      switch (request.action) {
        case 'showOverlay':
          this.visibleOverlays.add(request.overlay);
          this.emit({ type: 'show', overlay: request.overlay, payload: this.getState() });
          break;
        case 'hideOverlay':
          this.visibleOverlays.delete(request.overlay);
          this.emit({ type: 'hide', overlay: request.overlay });
          break;
        case 'requestScene':
          console.info('[StateStore] EventEngine requestScene received', {
            eventId: output.eventId,
            eventType: output.eventType,
            sceneId: request.sceneId,
            mode: request.mode,
          });
          break;
        case 'requestSponsor':
          console.info('[StateStore] EventEngine requestSponsor received', {
            eventId: output.eventId,
            eventType: output.eventType,
            placement: request.placement,
            mode: request.mode,
          });
          break;
        default:
          break;
      }
    }
  }

  private shouldProcessEventEngineRequest(request: EventEngineRequest): boolean {
    if (!request.mode || request.mode === 'preview') {
      return true;
    }

    console.info('[StateStore] EventEngine request skipped due to unsupported mode', {
      requestId: request.requestId,
      action: request.action,
      mode: request.mode,
    });

    return false;
  }

  private emitEvent(eventType: string, payload: Record<string, unknown>): void {
    const message: EventMessage = {
      type: 'event',
      payload: createEnvelope('event', 'OverlayServer', 'OverlayClients', {
        eventType,
        ...payload,
      }),
    };

    this.emit(message);
  }
}

export const stateStore = new StateStore();
