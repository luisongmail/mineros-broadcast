import { randomUUID } from 'node:crypto';

import { Router, type Request, type Response } from 'express';
import type { LineupEntry } from '@playflow/game-engine';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { requireAuth, type AuthenticatedRequest } from './auth/authMiddleware';
import { pool } from './db';
import { sendCaughtError, sendErr, sendOk, parseJsonColumn, requireString, optionalInteger, optionalString } from './routerUtils';
import { stateStore } from './stateStore';

interface GameTeamsRow extends RowDataPacket {
  home_team_id: string;
  away_team_id: string;
}

interface ActiveLineupRow extends RowDataPacket {
  team_id: string;
  player_id: string;
  batting_order: number;
  position: string;
  defensive_position: string | null;
  p_name: string | null;
  p_number: string | null;
  p_photo_asset_id: string | null;
}

interface PlayerRow extends RowDataPacket {
  id: string;
  team_id: string | null;
  name: string;
  number: string;
  position: string;
  photo_asset_id: string | null;
}

interface ChangeHistoryRow extends RowDataPacket {
  id: string;
  inning: number;
  inning_half: string;
  payload: string | Record<string, unknown>;
  created_at: Date | string;
  operator_id: string;
}

interface LineupWriteEntry {
  playerId: string;
  order: number;
  position: string;
  defensivePosition?: string | null;
  isStarter?: boolean;
}

interface LineupChangeRequest {
  outgoingPlayerId: string;
  incomingPlayerId: string;
  substitutionType: string;
  position?: string;
  battingOrder?: number;
  notes?: string;
}

function getPool(response: Response) {
  if (!pool) {
    sendErr(response, 'Base de datos no disponible', 503);
    return null;
  }

  return pool;
}

async function getGameTeams(gameId: string): Promise<GameTeamsRow | null> {
  if (!pool) return null;
  const [rows] = await pool.query<GameTeamsRow[]>(
    `SELECT home_team_id, away_team_id
     FROM games
     WHERE id = ?
     LIMIT 1`,
    [gameId],
  );
  return rows[0] ?? null;
}

function toLineupEntry(row: ActiveLineupRow): LineupEntry {
  return {
    playerId: row.player_id,
    order: Number(row.batting_order),
    name: row.p_name ?? row.player_id,
    number: row.p_number ?? '',
    position: row.position,
    status: 'active',
    ...(row.p_photo_asset_id ? { photoAssetId: row.p_photo_asset_id } : {}),
  };
}

async function loadActiveLineup(gameId: string, teams: GameTeamsRow): Promise<{ home: LineupEntry[]; away: LineupEntry[] }> {
  if (!pool) {
    return { home: [], away: [] };
  }

  const [rows] = await pool.query<ActiveLineupRow[]>(
    `SELECT
       gl.team_id,
       gl.player_id,
       gl.batting_order,
       gl.position,
       gl.defensive_position,
       p.name AS p_name,
       p.number AS p_number,
       p.photo_asset_id AS p_photo_asset_id
     FROM game_lineups gl
     LEFT JOIN players p ON p.id = gl.player_id
     WHERE gl.game_id = ?
       AND gl.substituted_at IS NULL
     ORDER BY gl.batting_order ASC`,
    [gameId],
  );

  return {
    home: rows.filter((row) => row.team_id === teams.home_team_id).map(toLineupEntry),
    away: rows.filter((row) => row.team_id === teams.away_team_id).map(toLineupEntry),
  };
}

async function loadChangeHistory(gameId: string): Promise<Array<Record<string, unknown>>> {
  if (!pool) return [];
  const [rows] = await pool.query<ChangeHistoryRow[]>(
    `SELECT id, inning, inning_half, payload, created_at, operator_id
     FROM game_events
     WHERE game_id = ?
       AND event_type = 'substitution'
     ORDER BY created_at ASC`,
    [gameId],
  );

  return rows.map((row) => ({
    id: row.id,
    inning: Number(row.inning),
    inningHalf: row.inning_half,
    operatorId: row.operator_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    ...parseJsonColumn<Record<string, unknown>>(row.payload, {}),
  }));
}

function parseLineupEntries(value: unknown, fieldName: 'home' | 'away'): LineupWriteEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} debe contener al menos un jugador`);
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`${fieldName}[${index}] no es válido`);
    }

    const record = entry as Record<string, unknown>;
    const order = optionalInteger(record.order) ?? optionalInteger(record.battingOrder);

    if (!order || order < 1) {
      throw new Error(`${fieldName}[${index}].order debe ser un entero positivo`);
    }

    return {
      playerId: requireString(record.playerId, `${fieldName}[${index}].playerId`),
      order,
      position: requireString(record.position, `${fieldName}[${index}].position`),
      defensivePosition: optionalString(record.defensivePosition),
      isStarter: record.isStarter === false ? false : true,
    };
  });
}

function parseLineupChange(body: unknown): LineupChangeRequest {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Body inválido para lineup/change');
  }

  const record = body as Record<string, unknown>;
  return {
    outgoingPlayerId: requireString(record.outgoingPlayerId, 'outgoingPlayerId'),
    incomingPlayerId: requireString(record.incomingPlayerId, 'incomingPlayerId'),
    substitutionType: optionalString(record.substitutionType) ?? 'defensive_change',
    position: optionalString(record.position) ?? undefined,
    battingOrder: optionalInteger(record.battingOrder) ?? undefined,
    notes: optionalString(record.notes) ?? undefined,
  };
}

function lineupCommandPayload(entries: LineupEntry[]): string {
  return JSON.stringify(entries.map((entry) => ({
    order: entry.order,
    playerId: entry.playerId,
    name: entry.name,
    number: entry.number,
    position: entry.position,
    status: entry.status,
    ...(entry.photoAssetId ? { photoAssetId: entry.photoAssetId } : {}),
  })));
}

function syncStateStore(gameId: string, lineup: { home: LineupEntry[]; away: LineupEntry[] }) {
  if (stateStore.getState().gameId !== gameId) {
    return;
  }

  stateStore.sendCommand('SetLineupHome', lineupCommandPayload(lineup.home));
  stateStore.sendCommand('SetLineupAway', lineupCommandPayload(lineup.away));
  stateStore.broadcast();
}

export const lineupRouter = Router();

lineupRouter.get('/games/:id/lineup', requireAuth, async (request: Request, response: Response) => {
  if (!getPool(response)) return;

  try {
    const gameId = requireString(request.params.id, 'id');
    const teams = await getGameTeams(gameId);

    if (!teams) {
      sendErr(response, `Juego ${gameId} no encontrado`, 404);
      return;
    }

    const lineup = await loadActiveLineup(gameId, teams);
    sendOk(response, { gameId, lineup });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo cargar el lineup');
  }
});

lineupRouter.post('/games/:id/lineup', requireAuth, async (request: Request, response: Response) => {
  const databasePool = getPool(response);
  if (!databasePool) return;

  try {
    const gameId = requireString(request.params.id, 'id');
    const teams = await getGameTeams(gameId);

    if (!teams) {
      sendErr(response, `Juego ${gameId} no encontrado`, 404);
      return;
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const homeEntries = parseLineupEntries(body.home, 'home');
    const awayEntries = parseLineupEntries(body.away, 'away');

    const connection = await databasePool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM game_lineups WHERE game_id = ?', [gameId]);

      const insertSql = `INSERT INTO game_lineups (
        game_id,
        team_id,
        player_id,
        roster_id,
        batting_order,
        position,
        defensive_position,
        is_starter,
        is_dp,
        is_flex,
        re_entry_used,
        courtesy_running_for_roster_id
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, 0, NULL)`;

      for (const entry of homeEntries) {
        await connection.query<ResultSetHeader>(insertSql, [
          gameId,
          teams.home_team_id,
          entry.playerId,
          entry.order,
          entry.position,
          entry.defensivePosition ?? (entry.position.toUpperCase() === 'DP' ? null : entry.position),
          entry.isStarter ? 1 : 0,
          entry.position.toUpperCase() === 'DP' ? 1 : 0,
        ]);
      }

      for (const entry of awayEntries) {
        await connection.query<ResultSetHeader>(insertSql, [
          gameId,
          teams.away_team_id,
          entry.playerId,
          entry.order,
          entry.position,
          entry.defensivePosition ?? (entry.position.toUpperCase() === 'DP' ? null : entry.position),
          entry.isStarter ? 1 : 0,
          entry.position.toUpperCase() === 'DP' ? 1 : 0,
        ]);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const lineup = await loadActiveLineup(gameId, teams);
    syncStateStore(gameId, lineup);
    sendOk(response, { gameId, lineup, createdCount: lineup.home.length + lineup.away.length }, 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el lineup');
  }
});

lineupRouter.post('/games/:id/lineup/change', requireAuth, async (request: Request, response: Response) => {
  const databasePool = getPool(response);
  if (!databasePool) return;

  try {
    const gameId = requireString(request.params.id, 'id');
    const teams = await getGameTeams(gameId);

    if (!teams) {
      sendErr(response, `Juego ${gameId} no encontrado`, 404);
      return;
    }

    const change = parseLineupChange(request.body);
    const [outgoingRows] = await databasePool.query<ActiveLineupRow[]>(
      `SELECT
         gl.team_id,
         gl.player_id,
         gl.batting_order,
         gl.position,
         gl.defensive_position,
         p.name AS p_name,
         p.number AS p_number,
         p.photo_asset_id AS p_photo_asset_id
       FROM game_lineups gl
       LEFT JOIN players p ON p.id = gl.player_id
       WHERE gl.game_id = ?
         AND gl.player_id = ?
         AND gl.substituted_at IS NULL
       LIMIT 1`,
      [gameId, change.outgoingPlayerId],
    );
    const outgoing = outgoingRows[0];

    if (!outgoing) {
      sendErr(response, `Jugador saliente ${change.outgoingPlayerId} no encontrado en lineup activo`, 404);
      return;
    }

    const [incomingRows] = await databasePool.query<PlayerRow[]>(
      `SELECT id, team_id, name, number, position, photo_asset_id
       FROM players
       WHERE id = ?
       LIMIT 1`,
      [change.incomingPlayerId],
    );
    const incoming = incomingRows[0];

    if (!incoming) {
      sendErr(response, `Jugador entrante ${change.incomingPlayerId} no encontrado`, 404);
      return;
    }

    if (incoming.team_id && incoming.team_id !== outgoing.team_id) {
      sendErr(response, 'El jugador entrante debe pertenecer al mismo equipo del lineup', 400);
      return;
    }

    const nextPosition = change.position ?? outgoing.position;
    const nextBattingOrder = change.battingOrder ?? Number(outgoing.batting_order);
    const eventId = randomUUID();
    const currentState = stateStore.getState();

    const connection = await databasePool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query<ResultSetHeader>(
        `UPDATE game_lineups
         SET substituted_at = CURRENT_TIMESTAMP(3), substituted_by = ?
         WHERE game_id = ?
           AND player_id = ?
           AND substituted_at IS NULL`,
        [change.incomingPlayerId, gameId, change.outgoingPlayerId],
      );

      await connection.query<ResultSetHeader>(
        `INSERT INTO game_lineups (
          game_id,
          team_id,
          player_id,
          roster_id,
          batting_order,
          position,
          defensive_position,
          is_starter,
          is_dp,
          is_flex,
          re_entry_used,
          courtesy_running_for_roster_id
        ) VALUES (?, ?, ?, NULL, ?, ?, ?, 0, ?, 0, 0, NULL)`,
        [
          gameId,
          outgoing.team_id,
          change.incomingPlayerId,
          nextBattingOrder,
          nextPosition,
          nextPosition.toUpperCase() === 'DP' ? null : nextPosition,
          nextPosition.toUpperCase() === 'DP' ? 1 : 0,
        ],
      );

      await connection.query<ResultSetHeader>(
        `INSERT INTO game_events (
          id,
          game_id,
          event_type,
          inning,
          inning_half,
          batter_player_id,
          pitcher_player_id,
          payload,
          operator_id,
          outs_before,
          score_home,
          score_away
        ) VALUES (?, ?, 'substitution', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          gameId,
          currentState.inning,
          currentState.inningHalf,
          currentState.currentBatterId ?? null,
          currentState.currentPitcherId ?? null,
          JSON.stringify({
            substitutionType: change.substitutionType,
            incoming: { playerId: incoming.id, name: incoming.name },
            outgoing: { playerId: change.outgoingPlayerId, name: outgoing.p_name ?? change.outgoingPlayerId },
            battingOrder: nextBattingOrder,
            position: nextPosition,
            notes: change.notes,
          }),
          (request as AuthenticatedRequest).user?.userId ?? 'lineup-router',
          currentState.outs,
          currentState.score.home,
          currentState.score.away,
        ],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const lineup = await loadActiveLineup(gameId, teams);
    const changes = await loadChangeHistory(gameId);
    syncStateStore(gameId, lineup);
    sendOk(response, { gameId, lineup, change: changes.at(-1) ?? null });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo registrar el cambio de lineup');
  }
});

lineupRouter.get('/games/:id/lineup/changes', requireAuth, async (request: Request, response: Response) => {
  if (!getPool(response)) return;

  try {
    const gameId = requireString(request.params.id, 'id');
    const teams = await getGameTeams(gameId);

    if (!teams) {
      sendErr(response, `Juego ${gameId} no encontrado`, 404);
      return;
    }

    const changes = await loadChangeHistory(gameId);
    sendOk(response, { gameId, changes });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo cargar el historial de lineup');
  }
});
