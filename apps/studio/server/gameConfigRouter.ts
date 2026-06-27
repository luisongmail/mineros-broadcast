import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';

import {
  DEMO_GAME_DETAIL,
  buildGameSummary,
  formatGameLabel,
  toGameLoadSnapshot,
  toLineupEntries,
  type GameConfigDetail,
  type GameConfigSource,
  type GameConfigPlayer,
  type GameConfigTeam,
} from '../src/gameConfig';
import { hasDatabaseConfigured, pool } from './db';
import { stateStore } from './stateStore';

type MysqlGameRow = {
  id: string;
  status: string;
  scheduled_at: string;
  venue_id?: string | null;
  venue_name?: string | null;
  season?: string | null;
  game_number?: number | null;
  game_name?: string | null;
  game_type?: string | null;
  series_description?: string | null;
  games_in_series?: number | null;
  double_header?: string | null;
  weather?: Record<string, unknown> | null;
  game_state?: Record<string, unknown> | null;
  home_team: MysqlTeamRow | null;
  away_team: MysqlTeamRow | null;
};

type MysqlTeamRow = {
  id: string;
  name: string;
  short_name: string;
  logo_asset_id?: string | null;
  city?: string | null;
  country?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

type MysqlLineupRow = {
  team_id: string;
  batting_order: number;
  position: string;
  is_starter: boolean;
  player: {
    id: string;
    team_id: string | null;
    number: string;
    name: string;
    position: string;
    bats?: string | null;
    throws?: string | null;
    photo_asset_id?: string | null;
    stats?: Record<string, unknown> | null;
    status?: string | null;
  } | null;
};

type MysqlGameQueryRow = RowDataPacket & {
  id: string;
  status: string;
  scheduled_at: string | Date;
  venue_id?: string | null;
  venue_name?: string | null;
  season: string | null;
  game_number: number | null;
  game_name: string | null;
  game_type?: string | null;
  series_description?: string | null;
  games_in_series?: number | null;
  double_header?: string | null;
  weather?: Record<string, unknown> | null;
  game_state: Record<string, unknown> | null;
  ht_id: string | null;
  ht_name: string | null;
  ht_short_name: string | null;
  ht_logo_asset_id: string | null;
  ht_city: string | null;
  ht_country: string | null;
  ht_primary_color: string | null;
  ht_secondary_color: string | null;
  at_id: string | null;
  at_name: string | null;
  at_short_name: string | null;
  at_logo_asset_id: string | null;
  at_city: string | null;
  at_country: string | null;
  at_primary_color: string | null;
  at_secondary_color: string | null;
};

type MysqlLineupQueryRow = RowDataPacket & {
  team_id: string;
  batting_order: number;
  position: string;
  is_starter: 0 | 1;
  p_id: string | null;
  p_team_id: string | null;
  p_number: string | null;
  p_name: string | null;
  p_position: string | null;
  p_bats: string | null;
  p_throws: string | null;
  p_photo_asset_id: string | null;
  p_stats: Record<string, unknown> | null;
  p_status: string | null;
};

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

function sendSuccess(response: Response, payload: unknown): void {
  const body: ApiSuccessResponse = {
    status: 200,
    result: 'ok',
    payload,
  };

  response.status(200).json(body);
}

function sendError(response: Response, error: unknown): void {
  const body: ApiErrorResponse = {
    status: 400,
    result: 'error',
    payload: {
      message: error instanceof Error ? error.message : 'Unknown error',
    },
  };

  response.status(200).json(body);
}

function normalizeTeam(row: MysqlTeamRow, role: 'home' | 'away'): GameConfigTeam {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    logoAssetId: row.logo_asset_id ?? '',
    role,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    secondaryColor: row.secondary_color ?? undefined,
  };
}

function normalizePlayer(row: MysqlLineupRow): GameConfigPlayer {
  if (!row.player) {
    throw new Error('Lineup row sin player relacionado');
  }

  return {
    playerId: row.player.id,
    teamId: row.player.team_id ?? row.team_id,
    order: row.batting_order,
    number: row.player.number,
    name: row.player.name,
    position: row.position || row.player.position,
    bats: row.player.bats ?? undefined,
    throws: row.player.throws ?? undefined,
    photoAssetId: row.player.photo_asset_id ?? undefined,
    stats: row.player.stats ?? {},
    status: row.player.status === 'substituted' || row.player.status === 'ejected' ? row.player.status : 'active',
  };
}

function parseNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseString<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractGameStateValue<T>(gameState: Record<string, unknown> | null | undefined, key: string): T | undefined {
  return isRecord(gameState) ? (gameState[key] as T | undefined) : undefined;
}

function normalizeScheduledAt(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapTeamRow(
  row: MysqlGameQueryRow,
  prefix: 'ht' | 'at',
): MysqlTeamRow | null {
  const id = prefix === 'ht' ? row.ht_id : row.at_id;
  const name = prefix === 'ht' ? row.ht_name : row.at_name;
  const shortName = prefix === 'ht' ? row.ht_short_name : row.at_short_name;

  if (!id || !name || !shortName) {
    return null;
  }

  return {
    id,
    name,
    short_name: shortName,
    logo_asset_id: prefix === 'ht' ? row.ht_logo_asset_id : row.at_logo_asset_id,
    city: prefix === 'ht' ? row.ht_city : row.at_city,
    country: prefix === 'ht' ? row.ht_country : row.at_country,
    primary_color: prefix === 'ht' ? row.ht_primary_color : row.at_primary_color,
    secondary_color: prefix === 'ht' ? row.ht_secondary_color : row.at_secondary_color,
  };
}

function mapGameRow(row: MysqlGameQueryRow): MysqlGameRow {
  return {
    id: row.id,
    status: row.status,
    scheduled_at: normalizeScheduledAt(row.scheduled_at),
    venue_id: row.venue_id,
    venue_name: row.venue_name,
    season: row.season,
    game_number: row.game_number,
    game_name: row.game_name,
    game_type: row.game_type,
    series_description: row.series_description,
    games_in_series: row.games_in_series,
    double_header: row.double_header,
    weather: row.weather ?? null,
    game_state: row.game_state,
    home_team: mapTeamRow(row, 'ht'),
    away_team: mapTeamRow(row, 'at'),
  };
}

function mapLineupRow(row: MysqlLineupQueryRow): MysqlLineupRow {
  return {
    team_id: row.team_id,
    batting_order: row.batting_order,
    position: row.position,
    is_starter: Boolean(row.is_starter),
    player: row.p_id && row.p_number && row.p_name && row.p_position
      ? {
          id: row.p_id,
          team_id: row.p_team_id,
          number: row.p_number,
          name: row.p_name,
          position: row.p_position,
          bats: row.p_bats,
          throws: row.p_throws,
          photo_asset_id: row.p_photo_asset_id,
          stats: row.p_stats,
          status: row.p_status,
        }
      : null,
  };
}

function getDatabasePool() {
  if (!pool) {
    throw new Error('DATABASE_URL no está configurado');
  }

  return pool;
}

function normalizeGameDetail(gameRow: MysqlGameRow, lineupRows: MysqlLineupRow[]): GameConfigDetail {
  if (!gameRow.home_team || !gameRow.away_team) {
    throw new Error('El partido no tiene equipos asociados');
  }

  const homeTeam = normalizeTeam(gameRow.home_team, 'home');
  const awayTeam = normalizeTeam(gameRow.away_team, 'away');
  const homePlayers = lineupRows
    .filter((row) => row.team_id === homeTeam.id)
    .map(normalizePlayer)
    .sort((left, right) => left.order - right.order);
  const awayPlayers = lineupRows
    .filter((row) => row.team_id === awayTeam.id)
    .map(normalizePlayer)
    .sort((left, right) => left.order - right.order);
  const rawState = isRecord(gameRow.game_state) ? gameRow.game_state : null;
  const rawBases = extractGameStateValue<Record<string, unknown>>(rawState, 'bases');
  const rawCount = extractGameStateValue<Record<string, unknown>>(rawState, 'count');
  const rawScore = extractGameStateValue<Record<string, unknown>>(rawState, 'score');

  return {
    id: gameRow.id,
    status: parseString(gameRow.status, ['scheduled', 'pre_game', 'live', 'paused', 'between_innings', 'final', 'cancelled', 'suspended'] as const, 'scheduled'),
    scheduledAt: gameRow.scheduled_at,
    venue: gameRow.venue_name ?? undefined,
    season: gameRow.season ?? undefined,
    gameNumber: gameRow.game_number ?? undefined,
    homeTeam,
    awayTeam,
    source: 'mysql',
    isDemo: false,
    label: gameRow.game_name ?? formatGameLabel(homeTeam, awayTeam),
    gameName: gameRow.game_name ?? undefined,
    inning: parseNumber(extractGameStateValue(rawState, 'inning'), 1),
    inningHalf: parseString(extractGameStateValue(rawState, 'inningHalf'), ['top', 'bottom'] as const, 'top'),
    outs: parseNumber(extractGameStateValue(rawState, 'outs'), 0),
    bases: {
      first: rawBases?.first != null && rawBases.first !== false ? rawBases.first as import('@playflow/game-engine').RunnerOnBase : null,
      second: rawBases?.second != null && rawBases.second !== false ? rawBases.second as import('@playflow/game-engine').RunnerOnBase : null,
      third: rawBases?.third != null && rawBases.third !== false ? rawBases.third as import('@playflow/game-engine').RunnerOnBase : null,
    },
    count: {
      balls: parseNumber(rawCount?.balls, 0),
      strikes: parseNumber(rawCount?.strikes, 0),
    },
    score: {
      home: parseNumber(rawScore?.home, 0),
      away: parseNumber(rawScore?.away, 0),
    },
    currentBatterId: extractGameStateValue<string>(rawState, 'currentBatterId') ?? homePlayers[0]?.playerId,
    currentPitcherId: extractGameStateValue<string>(rawState, 'currentPitcherId') ?? awayPlayers.find((player) => player.position === 'P')?.playerId,
    lineups: {
      home: homePlayers,
      away: awayPlayers,
    },
  };
}

async function getGamesFromMySQL(allStatuses = false): Promise<GameConfigDetail[]> {
  const databasePool = getDatabasePool();
  const statusFilter = allStatuses
    ? ''
    : `WHERE g.status IN ('scheduled', 'pre_game', 'live', 'paused', 'between_innings')`;
  const [gameRows] = await databasePool.query<MysqlGameQueryRow[]>(`
    SELECT
      g.id,
      g.status,
      g.scheduled_at,
      g.venue_id,
      v.name AS venue_name,
      g.season,
      g.game_number,
      g.game_name,
      g.game_type,
      g.series_description,
      g.games_in_series,
      g.double_header,
      g.weather,
      g.game_state,
      ht.id AS ht_id,
      ht.name AS ht_name,
      ht.short_name AS ht_short_name,
      ht.logo_asset_id AS ht_logo_asset_id,
      ht.city AS ht_city,
      ht.country AS ht_country,
      ht.primary_color AS ht_primary_color,
      ht.secondary_color AS ht_secondary_color,
      at.id AS at_id,
      at.name AS at_name,
      at.short_name AS at_short_name,
      at.logo_asset_id AS at_logo_asset_id,
      at.city AS at_city,
      at.country AS at_country,
      at.primary_color AS at_primary_color,
      at.secondary_color AS at_secondary_color
    FROM games g
    LEFT JOIN venues v ON g.venue_id = v.id
    LEFT JOIN teams ht ON g.home_team_id = ht.id
    LEFT JOIN teams at ON g.away_team_id = at.id
    ${statusFilter}
    ORDER BY g.scheduled_at DESC
  `);

  const mappedGameRows = gameRows.map(mapGameRow);
  const details = await Promise.all(
    mappedGameRows.map(async (gameRow) => {
      const lineupRows = await getLineupsFromMySQL(gameRow.id);
      return normalizeGameDetail(gameRow, lineupRows);
    }),
  );

  return details;
}

async function getLineupsFromMySQL(gameId: string): Promise<MysqlLineupRow[]> {
  const databasePool = getDatabasePool();
  const [lineupRows] = await databasePool.query<MysqlLineupQueryRow[]>(
    `
      SELECT
        gl.team_id,
        gl.batting_order,
        gl.position,
        gl.is_starter,
        p.id AS p_id,
        p.team_id AS p_team_id,
        p.number AS p_number,
        p.name AS p_name,
        p.position AS p_position,
        p.bats AS p_bats,
        p.throws AS p_throws,
        p.photo_asset_id AS p_photo_asset_id,
        p.stats AS p_stats,
        p.status AS p_status
      FROM game_lineups gl
      LEFT JOIN players p ON gl.player_id = p.id
      WHERE gl.game_id = ?
      ORDER BY gl.batting_order ASC
    `,
    [gameId],
  );

  return lineupRows.map(mapLineupRow);
}

async function getAvailableGames(allStatuses = false): Promise<{ games: GameConfigDetail[]; source: GameConfigSource; usingDemo: boolean }> {
  if (!hasDatabaseConfigured()) {
    return { games: [DEMO_GAME_DETAIL], source: 'demo', usingDemo: true };
  }

  try {
    const games = await getGamesFromMySQL(allStatuses);
    if (games.length === 0 && !allStatuses) {
      return { games: [DEMO_GAME_DETAIL], source: 'demo', usingDemo: true };
    }

    return { games, source: 'mysql', usingDemo: false };
  } catch (error) {
    console.warn('[studio] Falling back to demo game config', error);
    return { games: [DEMO_GAME_DETAIL], source: 'demo', usingDemo: true };
  }
}

async function getGameDetail(gameId: string): Promise<{ game: GameConfigDetail; source: GameConfigSource; usingDemo: boolean }> {
  const available = await getAvailableGames();
  const game = available.games.find((entry) => entry.id === gameId);

  if (!game) {
    throw new Error(`No se encontró el partido ${gameId}`);
  }

  return {
    game,
    source: available.source,
    usingDemo: available.usingDemo,
  };
}

export const gameConfigRouter = Router();

gameConfigRouter.get('/games', async (request: Request, response: Response) => {
  try {
    const allStatuses = request.query.all === 'true';
    const result = await getAvailableGames(allStatuses);
    sendSuccess(response, {
      games: result.games.map((game) => buildGameSummary(game, result.source)),
      source: result.source,
      usingDemo: result.usingDemo,
    });
  } catch (error) {
    sendError(response, error);
  }
});

gameConfigRouter.get('/games/:id', async (request: Request, response: Response) => {
  try {
    const result = await getGameDetail(request.params.id);
    sendSuccess(response, result);
  } catch (error) {
    sendError(response, error);
  }
});

gameConfigRouter.post('/games/:id/load', async (request: Request, response: Response) => {
  try {
    const result = await getGameDetail(request.params.id);
    const { game } = result;

    // Marcar el partido como en curso en la DB
    if (pool) {
      await pool.query(`UPDATE games SET status = 'live' WHERE id = ?`, [game.id]);
    }

    stateStore.loadGameSnapshot(toGameLoadSnapshot(game));
    stateStore.sendCommand('SetLineupHome', JSON.stringify(toLineupEntries(game.lineups.home)));
    stateStore.sendCommand('SetLineupAway', JSON.stringify(toLineupEntries(game.lineups.away)));

    if (game.currentBatterId) {
      stateStore.sendCommand('SetBatter', `playerId:${game.currentBatterId}`);
    }

    if (game.currentPitcherId) {
      stateStore.sendCommand('SetPitcher', `playerId:${game.currentPitcherId}`);
    }

    // Persiste el estado completo (con lineups) y notifica a todos los clientes WS
    stateStore.broadcast();

    sendSuccess(response, {
      game: { ...game, status: 'live' },
      state: stateStore.getState(),
      source: result.source,
      usingDemo: result.usingDemo,
      message: `Partido cargado: ${formatGameLabel(game.homeTeam, game.awayTeam)}`,
    });
  } catch (error) {
    sendError(response, error);
  }
});

gameConfigRouter.post('/games/:id/finish', async (request: Request, response: Response) => {
  try {
    const gameId = request.params.id;

    if (pool) {
      await pool.query(`UPDATE games SET status = 'final' WHERE id = ?`, [gameId]);
    }

    // Finaliza el engine solo si tiene este partido cargado
    const currentState = stateStore.getState();
    if (currentState.gameId === gameId) {
      try {
        stateStore.sendCommand('EndGame');
      } catch {
        // Ya estaba finalizado
      }
      stateStore.broadcast();
    }

    sendSuccess(response, {
      gameId,
      message: 'Partido finalizado.',
    });
  } catch (error) {
    sendError(response, error);
  }
});

gameConfigRouter.post('/games/:id/reset', async (request: Request, response: Response) => {
  try {
    const result = await getGameDetail(request.params.id);
    const { game } = result;
    const gameId = game.id;

    if (pool) {
      await pool.query('DELETE FROM at_bats WHERE game_id = ?', [gameId]);
      await pool.query('DELETE FROM broadcast_sessions WHERE game_id = ?', [gameId]);
    }

    // Reiniciar engine desde cero con el mismo partido
    stateStore.loadGameSnapshot(toGameLoadSnapshot(game));
    stateStore.sendCommand('SetLineupHome', JSON.stringify(toLineupEntries(game.lineups.home)));
    stateStore.sendCommand('SetLineupAway', JSON.stringify(toLineupEntries(game.lineups.away)));

    if (game.currentBatterId) {
      stateStore.sendCommand('SetBatter', `playerId:${game.currentBatterId}`);
    }

    if (game.currentPitcherId) {
      stateStore.sendCommand('SetPitcher', `playerId:${game.currentPitcherId}`);
    }

    stateStore.broadcast();

    sendSuccess(response, {
      game,
      state: stateStore.getState(),
      source: result.source,
      usingDemo: result.usingDemo,
      message: `Partido reiniciado: ${formatGameLabel(game.homeTeam, game.awayTeam)}`,
    });
  } catch (error) {
    sendError(response, error);
  }
});

// PUT /games/:id — actualizar campos editables del partido
gameConfigRouter.put('/games/:id', async (request: Request, response: Response) => {
  const { id } = request.params;
  const {
    gameName,
    venue_id,
    scheduledAt,
    homeTeamId,
    awayTeamId,
    game_type,
    series_description,
    games_in_series,
    double_header,
    weather,
  } = request.body as {
    gameName?: string | null;
    venue_id?: string | null;
    scheduledAt?: string | null;
    homeTeamId?: string | null;
    awayTeamId?: string | null;
    game_type?: string | null;
    series_description?: string | null;
    games_in_series?: number | null;
    double_header?: string | null;
    weather?: Record<string, unknown> | null;
  };

  try {
    const pool = getDatabasePool();

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (gameName !== undefined) {
      updates.push('game_name = ?');
      values.push(gameName?.trim() || null);
    }
    if (venue_id !== undefined) {
      updates.push('venue_id = ?');
      values.push(venue_id?.trim() || null);
    }
    if (scheduledAt !== undefined) {
      updates.push('scheduled_at = ?');
      values.push(scheduledAt);
    }
    if (homeTeamId !== undefined) {
      updates.push('home_team_id = ?');
      values.push(homeTeamId?.trim() || null);
    }
    if (awayTeamId !== undefined) {
      updates.push('away_team_id = ?');
      values.push(awayTeamId?.trim() || null);
    }
    if (game_type !== undefined) {
      updates.push('game_type = ?');
      values.push(game_type?.trim() || null);
    }
    if (series_description !== undefined) {
      updates.push('series_description = ?');
      values.push(series_description?.trim() || null);
    }
    if (games_in_series !== undefined) {
      updates.push('games_in_series = ?');
      values.push(games_in_series ?? null);
    }
    if (double_header !== undefined) {
      updates.push('double_header = ?');
      values.push(double_header?.trim() || null);
    }
    if (weather !== undefined) {
      updates.push('weather = ?');
      values.push(weather === null ? null : JSON.stringify(weather));
    }

    if (updates.length === 0) {
      sendSuccess(response, { message: 'Sin cambios' });
      return;
    }

    values.push(id);
    await pool.query(`UPDATE games SET ${updates.join(', ')} WHERE id = ?`, values);

    sendSuccess(response, { id, message: 'Partido actualizado' });
  } catch (error) {
    sendError(response, error);
  }
});

// POST /games — crear un nuevo partido
gameConfigRouter.post('/games', async (request: Request, response: Response) => {
  const {
    gameName,
    venue_id,
    scheduledAt,
    homeTeamId,
    awayTeamId,
    status,
    game_type,
    series_description,
    games_in_series,
    double_header,
    weather,
  } = request.body as {
    gameName?: string | null;
    venue_id?: string | null;
    scheduledAt?: string | null;
    homeTeamId?: string | null;
    awayTeamId?: string | null;
    status?: string;
    game_type?: string | null;
    series_description?: string | null;
    games_in_series?: number | null;
    double_header?: string | null;
    weather?: Record<string, unknown> | null;
  };

  try {
    const pool = getDatabasePool();
    const id = `game-${randomUUID()}`;
    const at = scheduledAt ?? new Date().toISOString();

    await pool.query(
      `INSERT INTO games (
         id, game_name, venue_id, scheduled_at, home_team_id, away_team_id, status,
         game_type, series_description, games_in_series, double_header, weather
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        gameName?.trim() || null,
        venue_id?.trim() || null,
        at,
        homeTeamId?.trim() || null,
        awayTeamId?.trim() || null,
        status ?? 'scheduled',
        game_type?.trim() || null,
        series_description?.trim() || null,
        games_in_series ?? null,
        double_header?.trim() || null,
        weather === null || weather === undefined ? null : JSON.stringify(weather),
      ],
    );

    sendSuccess(response, { id, message: 'Partido creado' });
  } catch (error) {
    sendError(response, error);
  }
});
