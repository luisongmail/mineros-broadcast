import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { demoGameEvents, demoPitches, type DemoGameEvent, type DemoPitch } from './editorDemoData';
import { pool } from './db';
import {
  isRecord,
  optionalInteger,
  optionalString,
  parseJsonColumn,
  sendCaughtError,
  sendErr,
  sendOk,
  toIsoString,
} from './routerUtils';

interface PitchRow extends RowDataPacket {
  id: string;
  game_id: string;
  at_bat_id: string | null;
  pitcher_player_id: string;
  batter_player_id: string;
  pitch_num: number;
  pitch_type: string | null;
  zone_x: number | null;
  zone_y: number | null;
  umpire_call: string;
  inning: number;
  inning_half: string;
  operator_id: string;
  timestamp: string | Date;
}

interface GameEventRow extends RowDataPacket {
  id: string;
  game_id: string;
  event_type: string;
  at_bat_id: string | null;
  inning: number;
  inning_half: string;
  batter_player_id: string | null;
  pitcher_player_id: string | null;
  payload: unknown;
  operator_id: string;
  created_at: string | Date;
}

interface PitchPayload {
  id: string;
  game_id: string;
  at_bat_id: string | null;
  pitcher_player_id: string;
  batter_player_id: string;
  pitch_num: number;
  pitch_type: string | null;
  zone_x: number | null;
  zone_y: number | null;
  umpire_call: string;
  inning: number;
  inning_half: string;
  operator_id: string;
  timestamp: string;
}

interface GameEventPayload {
  id: string;
  game_id: string;
  event_type: string;
  at_bat_id: string | null;
  inning: number;
  inning_half: string;
  batter_player_id: string | null;
  pitcher_player_id: string | null;
  payload: Record<string, unknown>;
  operator_id: string;
  created_at: string;
}

function mapPitch(row: PitchRow | DemoPitch): PitchPayload {
  return {
    id: row.id,
    game_id: row.game_id,
    at_bat_id: row.at_bat_id,
    pitcher_player_id: row.pitcher_player_id,
    batter_player_id: row.batter_player_id,
    pitch_num: row.pitch_num,
    pitch_type: row.pitch_type,
    zone_x: row.zone_x,
    zone_y: row.zone_y,
    umpire_call: row.umpire_call,
    inning: row.inning,
    inning_half: row.inning_half,
    operator_id: row.operator_id,
    timestamp: toIsoString(row.timestamp),
  };
}

function mapGameEvent(row: GameEventRow | DemoGameEvent): GameEventPayload {
  return {
    id: row.id,
    game_id: row.game_id,
    event_type: row.event_type,
    at_bat_id: row.at_bat_id,
    inning: row.inning,
    inning_half: row.inning_half,
    batter_player_id: row.batter_player_id,
    pitcher_player_id: row.pitcher_player_id,
    payload: parseJsonColumn<Record<string, unknown>>(row.payload, {}),
    operator_id: row.operator_id,
    created_at: toIsoString(row.created_at),
  };
}

const router = Router();

router.get('/games/:gameId/pitches', async (request: Request, response: Response) => {
  try {
    const inning = optionalInteger(request.query.inning);
    const pitcher = optionalString(request.query.pitcher);

    if (!pool) {
      const pitches = demoPitches
        .filter((entry) => entry.game_id === request.params.gameId)
        .filter((entry) => (inning !== null ? entry.inning === inning : true))
        .filter((entry) => (pitcher ? entry.pitcher_player_id === pitcher : true))
        .map(mapPitch);
      sendOk(response, pitches);
      return;
    }

    const filters = ['game_id = ?'];
    const params: Array<string | number> = [request.params.gameId];

    if (inning !== null) {
      filters.push('inning = ?');
      params.push(inning);
    }

    if (pitcher) {
      filters.push('pitcher_player_id = ?');
      params.push(pitcher);
    }

    const [rows] = await pool.query<PitchRow[]>(
      `SELECT id, game_id, at_bat_id, pitcher_player_id, batter_player_id, pitch_num, pitch_type,
              zone_x, zone_y, umpire_call, inning, inning_half, operator_id, timestamp
       FROM pitches
       WHERE ${filters.join(' AND ')}
       ORDER BY inning ASC, timestamp ASC, pitch_num ASC`,
      params,
    );

    sendOk(response, rows.map(mapPitch));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los lanzamientos');
  }
});

router.post('/games/:gameId/pitches', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para registrar lanzamientos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const pitcherPlayerId = optionalString(body.pitcher_player_id);
    const batterPlayerId = optionalString(body.batter_player_id);
    const pitchNum = optionalInteger(body.pitch_num);
    const umpireCall = optionalString(body.umpire_call);
    const inning = optionalInteger(body.inning);
    const inningHalf = optionalString(body.inning_half);
    const operatorId = optionalString(body.operator_id);

    if (!pitcherPlayerId || !batterPlayerId || pitchNum === null || !umpireCall || inning === null || !inningHalf || !operatorId) {
      sendErr(response, 'pitcher_player_id, batter_player_id, pitch_num, umpire_call, inning, inning_half y operator_id son requeridos');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO pitches (
        id, game_id, at_bat_id, pitcher_player_id, batter_player_id, pitch_num, pitch_type,
        zone_x, zone_y, umpire_call, inning, inning_half, operator_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.params.gameId,
        optionalString(body.at_bat_id),
        pitcherPlayerId,
        batterPlayerId,
        pitchNum,
        optionalString(body.pitch_type),
        optionalInteger(body.zone_x),
        optionalInteger(body.zone_y),
        umpireCall,
        inning,
        inningHalf,
        operatorId,
      ],
    );

    const [rows] = await pool.query<PitchRow[]>(
      `SELECT id, game_id, at_bat_id, pitcher_player_id, batter_player_id, pitch_num, pitch_type,
              zone_x, zone_y, umpire_call, inning, inning_half, operator_id, timestamp
       FROM pitches WHERE id = ? LIMIT 1`,
      [id],
    );

    sendOk(response, mapPitch(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo registrar el lanzamiento');
  }
});

router.delete('/pitches/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para eliminar lanzamientos', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM pitches WHERE id = ?', [request.params.id]);
    if (result.affectedRows === 0) {
      sendErr(response, 'Lanzamiento no encontrado', 404);
      return;
    }

    sendOk(response, { deleted: request.params.id });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo eliminar el lanzamiento');
  }
});

router.get('/games/:gameId/events', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      const events = demoGameEvents
        .filter((entry) => entry.game_id === request.params.gameId)
        .map(mapGameEvent);
      sendOk(response, events);
      return;
    }

    const [rows] = await pool.query<GameEventRow[]>(
      `SELECT id, game_id, event_type, at_bat_id, inning, inning_half, batter_player_id,
              pitcher_player_id, payload, operator_id, created_at
       FROM game_events
       WHERE game_id = ?
       ORDER BY inning ASC, created_at ASC`,
      [request.params.gameId],
    );

    sendOk(response, rows.map(mapGameEvent));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo listar el log de eventos');
  }
});

router.post('/games/:gameId/events', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para registrar eventos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const eventType = optionalString(body.event_type);
    const inning = optionalInteger(body.inning);
    const inningHalf = optionalString(body.inning_half);
    const operatorId = optionalString(body.operator_id);

    if (!eventType || inning === null || !inningHalf || !operatorId) {
      sendErr(response, 'event_type, inning, inning_half y operator_id son requeridos');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO game_events (
        id, game_id, event_type, at_bat_id, inning, inning_half, batter_player_id,
        pitcher_player_id, payload, operator_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.params.gameId,
        eventType,
        optionalString(body.at_bat_id),
        inning,
        inningHalf,
        optionalString(body.batter_player_id),
        optionalString(body.pitcher_player_id),
        JSON.stringify(isRecord(body.payload) ? body.payload : {}),
        operatorId,
      ],
    );

    const [rows] = await pool.query<GameEventRow[]>(
      `SELECT id, game_id, event_type, at_bat_id, inning, inning_half, batter_player_id,
              pitcher_player_id, payload, operator_id, created_at
       FROM game_events WHERE id = ? LIMIT 1`,
      [id],
    );

    sendOk(response, mapGameEvent(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo registrar el evento');
  }
});

export default router;
