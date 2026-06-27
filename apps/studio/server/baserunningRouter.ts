import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from './db';
import { stateStore } from './stateStore';

export const baserunningRouter = Router();

type BaserunningEventType =
  | 'stolen_base'
  | 'caught_stealing'
  | 'wild_pitch_advance'
  | 'passed_ball_advance'
  | 'balk'
  | 'throwing_error'
  | 'receiving_error'
  | 'pickoff_out'
  | 'pickoff_error'
  | 'catcher_interference';

type RunnerBase = '1B' | '2B' | '3B' | 'HOME' | 'OUT';

interface RunnerMove {
  runnerLabel: 'R1' | 'R2' | 'R3' | 'BR';
  fromBase: string;
  toBase: RunnerBase;
  runScored: boolean;
  earnedRun: boolean;
  fielderPos?: number;
  playerId?: string;
  playerNum?: string;
}

interface BaserunningRequest {
  gameId: string;
  eventType: BaserunningEventType;
  runners: RunnerMove[];
  /** Timecode del stream de transmisión, ej. "1:23:45.500" */
  videoTimestamp?: string;
}

// Earned run types (pitcher is responsible)
const EARNED_EVENTS = new Set<BaserunningEventType>([
  'stolen_base',
  'wild_pitch_advance',
  'balk',
  'catcher_interference',
]);

function toBasesUpdate(moves: RunnerMove[]): Partial<Record<'first' | 'second' | 'third', { playerId: string | null }>> {
  const update: Partial<Record<'first' | 'second' | 'third', { playerId: string | null }>> = {};
  const baseMap: Record<string, 'first' | 'second' | 'third'> = {
    '1B': 'first',
    '2B': 'second',
    '3B': 'third',
  };

  for (const move of moves) {
    const fromKey = baseMap[move.fromBase];
    if (fromKey) update[fromKey] = { playerId: null };   // base liberada

    const toKey = baseMap[move.toBase];
    if (toKey) update[toKey] = { playerId: move.playerId ?? null };  // corredor llega
  }

  return update;
}

baserunningRouter.post('/', async (req: Request, res: Response) => {
  if (!pool) {
    res.status(503).json({ error: 'Base de datos no disponible' });
    return;
  }

  const body = req.body as Partial<BaserunningRequest>;

  if (!body.gameId || !body.eventType || !Array.isArray(body.runners) || body.runners.length === 0) {
    res.status(400).json({ error: 'gameId, eventType y runners son requeridos' });
    return;
  }

  const state = stateStore.getState();
  const { inning, inningHalf, outs } = state;
  const isEarnedEvent = EARNED_EVENTS.has(body.eventType);

  try {
    // 1. Persistir cada movimiento
    for (const move of body.runners) {
      const earnedRun = move.runScored ? (isEarnedEvent ? 1 : 0) : 0;
      await pool.query(
        `INSERT INTO baserunning_events
         (game_id, inning, inning_half, outs_before, event_type, runner_label, player_id, player_num,
          from_base, to_base, run_scored, earned_run, fielder_pos, operator_id, video_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.gameId,
          inning,
          inningHalf,
          outs,                          // momento de la transmisión: outs antes del evento
          body.eventType,
          move.runnerLabel,
          move.playerId ?? null,
          move.playerNum ?? null,
          move.fromBase,
          move.toBase,
          move.runScored ? 1 : 0,
          earnedRun,
          move.fielderPos ?? null,
          'live-game-scoring',
          body.videoTimestamp ?? null,   // timecode del stream
        ],
      );
    }

    // 2. Actualizar outs si algún corredor quedó OUT
    const outsAdded = body.runners.filter((m) => m.toBase === 'OUT').length;
    for (let i = 0; i < outsAdded; i++) {
      stateStore.sendCommand('AddOut');
    }

    // 3. Actualizar bases preservando identidad del corredor (Spec 29 S2 RunnerOnBase)
    const basesUpdate = toBasesUpdate(body.runners);
    for (const [base, info] of Object.entries(basesUpdate) as [string, { playerId: string | null }][]) {
      const cmd = info.playerId ? `${base}:playerId:${info.playerId}` : `${base}:false`;
      stateStore.sendCommand('SetBase', cmd);
    }

    // 4. Sumar carreras si aplica
    const runsScored = body.runners.filter((m) => m.runScored).length;
    const earnedRuns = body.runners.filter((m) => m.runScored && isEarnedEvent).length;

    if (runsScored > 0) {
      const battingRole = inningHalf === 'top' ? 'away' : 'home';
      for (let i = 0; i < runsScored; i++) {
        stateStore.sendCommand('IncrementScore', battingRole);
      }
    }

    res.json({ action: 'recorded', runsScored, earnedRuns });
  } catch (err) {
    console.error('[baserunningRouter] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});

// GET /api/baserunning-events/:gameId — historial para el partido
baserunningRouter.get('/:gameId', async (req: Request, res: Response) => {
  if (!pool) {
    res.status(503).json({ error: 'Base de datos no disponible' });
    return;
  }

  const { gameId } = req.params;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM baserunning_events WHERE game_id = ? ORDER BY timestamp DESC LIMIT 50`,
      [gameId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error interno' });
  }
});
