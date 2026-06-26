import { Router, type Request, type Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import { demoGameEvents, demoPitches, type DemoGameEvent, type DemoPitch } from './editorDemoData';
import { pool } from './db';
import {
  isRecord,
  optionalFloat,
  optionalInteger,
  optionalString,
  parseJsonColumn,
  sendCaughtError,
  sendErr,
  sendOk,
  toIsoString,
} from './routerUtils';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

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
  // Campos estándar (spec 29)
  plate_x: number | null;
  plate_z: number | null;
  zone: number | null;
  sz_top: number | null;
  sz_bottom: number | null;
  pfx_x: number | null;
  pfx_z: number | null;
  start_speed: number | null;
  end_speed: number | null;
  spin_rate: number | null;
  spin_axis: number | null;
  pitch_class: string | null;
  confidence: number | null;
  device_id: string | null;
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
  // Legacy grid (mantenido para compatibilidad)
  zone_x: number | null;
  zone_y: number | null;
  umpire_call: string;
  inning: number;
  inning_half: string;
  operator_id: string;
  timestamp: string;
  // Campos estándar métricos (spec 29)
  plate_x: number | null;
  plate_z: number | null;
  zone: number | null;
  sz_top: number | null;
  sz_bottom: number | null;
  pfx_x: number | null;
  pfx_z: number | null;
  start_speed: number | null;
  end_speed: number | null;
  spin_rate: number | null;
  spin_axis: number | null;
  pitch_class: string | null;
  confidence: number | null;
  device_id: string | null;
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

// ---------------------------------------------------------------------------
// Zona MLBAM calculada desde coordenadas métricas reales
// plate_x: metros desde centro del plato (izq negativo, der positivo)
// plate_z: metros desde el suelo
// szTop/szBottom: límites de la zona del bateador en metros
// Zonas 1-9: strike (vista del receptor, fila 1 = arriba)
// Zonas 11-14: bola (11=arriba, 12=abajo, 13=izq, 14=der)
// ---------------------------------------------------------------------------
export function calculateZone(
  plateX: number,
  plateZ: number,
  szTop: number,
  szBottom: number,
): number {
  const halfPlate = 0.2159; // 17 pulgadas / 2 = 0.4318m total
  const thirdW = (halfPlate * 2) / 3;
  const thirdH = (szTop - szBottom) / 3;

  const inStrike =
    Math.abs(plateX) <= halfPlate && plateZ >= szBottom && plateZ <= szTop;

  if (!inStrike) {
    if (plateZ > szTop) return 11;
    if (plateZ < szBottom) return 12;
    return plateX < 0 ? 13 : 14;
  }

  const col = plateX < -thirdW ? 0 : plateX > thirdW ? 2 : 1;
  const row = plateZ > szTop - thirdH ? 0 : plateZ < szBottom + thirdH ? 2 : 1;
  return row * 3 + col + 1;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapPitch(row: PitchRow | DemoPitch): PitchPayload {
  const r = row as PitchRow;
  return {
    id: r.id,
    game_id: r.game_id,
    at_bat_id: r.at_bat_id,
    pitcher_player_id: r.pitcher_player_id,
    batter_player_id: r.batter_player_id,
    pitch_num: r.pitch_num,
    pitch_type: r.pitch_type,
    zone_x: r.zone_x,
    zone_y: r.zone_y,
    umpire_call: r.umpire_call,
    inning: r.inning,
    inning_half: r.inning_half,
    operator_id: r.operator_id,
    timestamp: toIsoString(r.timestamp),
    plate_x: r.plate_x ?? null,
    plate_z: r.plate_z ?? null,
    zone: r.zone ?? null,
    sz_top: r.sz_top ?? null,
    sz_bottom: r.sz_bottom ?? null,
    pfx_x: r.pfx_x ?? null,
    pfx_z: r.pfx_z ?? null,
    start_speed: r.start_speed ?? null,
    end_speed: r.end_speed ?? null,
    spin_rate: r.spin_rate ?? null,
    spin_axis: r.spin_axis ?? null,
    pitch_class: r.pitch_class ?? null,
    confidence: r.confidence ?? null,
    device_id: r.device_id ?? null,
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

const PITCH_SELECT = `
  id, game_id, at_bat_id, pitcher_player_id, batter_player_id, pitch_num, pitch_type,
  zone_x, zone_y, umpire_call, inning, inning_half, operator_id, timestamp,
  plate_x, plate_z, zone, sz_top, sz_bottom, pfx_x, pfx_z,
  start_speed, end_speed, spin_rate, spin_axis, pitch_class, confidence, device_id
`;

const router = Router();

// ---------------------------------------------------------------------------
// GET /games/:gameId/pitches
// ---------------------------------------------------------------------------
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
      `SELECT ${PITCH_SELECT}
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

// ---------------------------------------------------------------------------
// POST /games/:gameId/pitches
// Acepta tanto coordenadas de grilla legacy (zone_x/zone_y) como
// coordenadas métricas reales (plate_x/plate_z).
// Si se proporcionan plate_x/plate_z + sz_top/sz_bottom, calcula la zona
// automáticamente cuando no se envía explícitamente.
// ---------------------------------------------------------------------------
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

    // Campos estándar métricos
    const plateX = optionalFloat(body.plate_x);
    const plateZ = optionalFloat(body.plate_z);
    const szTop = optionalFloat(body.sz_top);
    const szBottom = optionalFloat(body.sz_bottom);

    // Auto-calcular zona si tenemos coordenadas completas y no se envía explícitamente
    let zone = optionalInteger(body.zone);
    if (zone === null && plateX !== null && plateZ !== null && szTop !== null && szBottom !== null) {
      zone = calculateZone(plateX, plateZ, szTop, szBottom);
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO pitches (
        id, game_id, at_bat_id, pitcher_player_id, batter_player_id, pitch_num, pitch_type,
        zone_x, zone_y, umpire_call, inning, inning_half, operator_id,
        plate_x, plate_z, zone, sz_top, sz_bottom, pfx_x, pfx_z,
        start_speed, end_speed, spin_rate, spin_axis, pitch_class, confidence, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        plateX,
        plateZ,
        zone,
        szTop,
        szBottom,
        optionalFloat(body.pfx_x),
        optionalFloat(body.pfx_z),
        optionalFloat(body.start_speed),
        optionalFloat(body.end_speed),
        optionalInteger(body.spin_rate),
        optionalInteger(body.spin_axis),
        optionalString(body.pitch_class),
        optionalFloat(body.confidence),
        optionalString(body.device_id),
      ],
    );

    const [rows] = await pool.query<PitchRow[]>(
      `SELECT ${PITCH_SELECT} FROM pitches WHERE id = ? LIMIT 1`,
      [id],
    );

    sendOk(response, mapPitch(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo registrar el lanzamiento');
  }
});

// ---------------------------------------------------------------------------
// DELETE /pitches/:id
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /games/:gameId/events
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /games/:gameId/events
// ---------------------------------------------------------------------------
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

