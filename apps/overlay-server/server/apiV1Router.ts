// ---------------------------------------------------------------------------
// apiV1Router — API pública v1, esquema MLBAM-compatible
// GET  /api/v1/games/:id/live      → live game data
// GET  /api/v1/games/:id/pitches   → pitcheos con coordenadas métricas
// GET  /api/v1/players/:id/stats   → estadísticas por jugador
// Spec 29 § 6
// ---------------------------------------------------------------------------

import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from './db';
import { stateStore } from './stateStore';
import { parseJsonColumn, toIsoString, optionalInteger } from './routerUtils';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiOk(res: Response, data: unknown, status = 200) {
  res.status(status).json({ apiVersion: 'v1', status, data });
}

function apiErr(res: Response, message: string, status = 400) {
  res.status(status).json({ apiVersion: 'v1', status, error: { message } });
}

/** Convierte un corredor almacenado en el formato MLBAM */
function mapRunner(base: unknown): { id: string } | null {
  if (!base || typeof base !== 'object') return null;
  const r = base as Record<string, unknown>;
  return { id: String(r['id'] ?? '') };
}

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/live
// Devuelve el estado en vivo del juego — compatible con el vocabulario MLBAM
// ---------------------------------------------------------------------------
router.get('/games/:id/live', (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const state = stateStore.getState();

  if (state.gameId !== id) {
    // Si el juego pedido no es el activo, responder sin datos en vivo
    apiErr(res, `Juego ${id} no está activo. Juego activo: ${state.gameId}`, 404);
    return;
  }

  const bases = state.bases;

  res.json({
    apiVersion: 'v1',
    status: 200,
    data: {
      gameId: state.gameId,
      status: state.status,
      inning: state.inning,
      inningHalf: state.inningHalf,       // 'top' | 'bottom'
      outs: state.outs,
      count: {
        balls: state.count.balls,
        strikes: state.count.strikes,
      },
      score: {
        home: state.score.home,
        away: state.score.away,
      },
      runners: {
        first:  mapRunner(bases.first),
        second: mapRunner(bases.second),
        third:  mapRunner(bases.third),
      },
      currentBatter:  state.currentBatterId  ?? null,
      currentPitcher: state.currentPitcherId ?? null,
      homeTeam: {
        id:        state.homeTeam.id,
        name:      state.homeTeam.name,
        shortName: state.homeTeam.shortName,
      },
      awayTeam: {
        id:        state.awayTeam.id,
        name:      state.awayTeam.name,
        shortName: state.awayTeam.shortName,
      },
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/pitches
// Pitcheos del juego con coordenadas métricas + zona MLBAM
// Query params: inning, inningHalf, pitcherId, batterId, limit (default 100)
// ---------------------------------------------------------------------------
router.get('/games/:id/pitches', async (req: Request, res: Response) => {
  if (!pool) { apiErr(res, 'Base de datos no disponible', 503); return; }

  const { id } = req.params as { id: string };
  const inning     = optionalInteger(req.query.inning);
  const inningHalf = typeof req.query.inningHalf === 'string' ? req.query.inningHalf : null;
  const pitcherId  = typeof req.query.pitcherId  === 'string' ? req.query.pitcherId  : null;
  const batterId   = typeof req.query.batterId   === 'string' ? req.query.batterId   : null;
  const limit      = Math.min(optionalInteger(req.query.limit) ?? 100, 500);

  try {
    const conditions: string[] = ['p.game_id = ?'];
    const params: Array<string | number> = [id];

    if (inning !== null)     { conditions.push('p.inning = ?');            params.push(inning); }
    if (inningHalf)          { conditions.push('p.inning_half = ?');       params.push(inningHalf); }
    if (pitcherId)           { conditions.push('p.pitcher_player_id = ?'); params.push(pitcherId); }
    if (batterId)            { conditions.push('p.batter_player_id = ?');  params.push(batterId); }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         p.id, p.game_id, p.at_bat_id, p.inning, p.inning_half,
         p.pitcher_player_id, p.batter_player_id,
         p.pitch_num, p.pitch_type, p.pitch_class,
         p.umpire_call,
         p.plate_x, p.plate_z, p.zone,
         p.sz_top, p.sz_bottom,
         p.start_speed, p.end_speed,
         p.spin_rate, p.spin_axis,
         p.pfx_x, p.pfx_z,
         p.confidence, p.device_id,
         p.zone_x, p.zone_y,
         p.timestamp
       FROM pitches p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.timestamp ASC
       LIMIT ?`,
      [...params, limit],
    );

    const pitches = rows.map((r) => ({
      id:                r['id'],
      gameId:            r['game_id'],
      atBatId:           r['at_bat_id']           ?? null,
      inning:            r['inning'],
      inningHalf:        r['inning_half'],
      pitcherPlayerId:   r['pitcher_player_id']   ?? null,
      batterPlayerId:    r['batter_player_id']    ?? null,
      pitchNum:          r['pitch_num'],
      pitchType:         r['pitch_type']          ?? null,
      pitchClass:        r['pitch_class']         ?? null,  // código MLBAM
      umpireCall:        r['umpire_call'],
      // Coordenadas métricas (spec 29)
      plateX:            r['plate_x']             !== null ? Number(r['plate_x'])     : null,
      plateZ:            r['plate_z']             !== null ? Number(r['plate_z'])     : null,
      zone:              r['zone']                !== null ? Number(r['zone'])         : null,
      szTop:             r['sz_top']              !== null ? Number(r['sz_top'])      : null,
      szBottom:          r['sz_bottom']           !== null ? Number(r['sz_bottom'])   : null,
      startSpeed:        r['start_speed']         !== null ? Number(r['start_speed']) : null,
      endSpeed:          r['end_speed']           !== null ? Number(r['end_speed'])   : null,
      spinRate:          r['spin_rate']           !== null ? Number(r['spin_rate'])   : null,
      spinAxis:          r['spin_axis']           !== null ? Number(r['spin_axis'])   : null,
      pfxX:              r['pfx_x']               !== null ? Number(r['pfx_x'])       : null,
      pfxZ:              r['pfx_z']               !== null ? Number(r['pfx_z'])       : null,
      confidence:        r['confidence']          !== null ? Number(r['confidence'])  : null,
      deviceId:          r['device_id']           ?? null,
      // Legacy grid coords (solo para compatibilidad interna)
      _zoneX:            r['zone_x']              !== null ? Number(r['zone_x'])      : null,
      _zoneY:            r['zone_y']              !== null ? Number(r['zone_y'])      : null,
      timestamp:         toIsoString(r['timestamp']),
    }));

    apiOk(res, { gameId: id, count: pitches.length, pitches });
  } catch (err) {
    console.error('[apiV1] GET /games/:id/pitches error:', err);
    apiErr(res, String(err), 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/players/:id/stats
// Estadísticas del jugador en un juego específico
// Query params: gameId (requerido)
// ---------------------------------------------------------------------------
router.get('/players/:id/stats', async (req: Request, res: Response) => {
  if (!pool) { apiErr(res, 'Base de datos no disponible', 503); return; }

  const { id: playerId } = req.params as { id: string };
  const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : null;

  if (!gameId) {
    apiErr(res, 'gameId es requerido como query param', 400);
    return;
  }

  try {
    // Estadísticas ofensivas
    const [batRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(CASE WHEN result NOT IN ('walk','hbp','sacrifice_fly','sacrifice_bunt') THEN 1 END) AS ab,
         SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END)         AS hits,
         SUM(CASE WHEN result = 'double'        THEN 1 ELSE 0 END)                                  AS doubles,
         SUM(CASE WHEN result = 'triple'        THEN 1 ELSE 0 END)                                  AS triples,
         SUM(CASE WHEN result = 'home_run'      THEN 1 ELSE 0 END)                                  AS home_runs,
         SUM(rbi)  AS rbi,
         SUM(runs) AS runs,
         SUM(CASE WHEN result = 'walk'          THEN 1 ELSE 0 END)                                  AS walks,
         SUM(CASE WHEN result = 'hbp'           THEN 1 ELSE 0 END)                                  AS hbp,
         SUM(CASE WHEN result = 'sacrifice_fly' THEN 1 ELSE 0 END)                                  AS sf,
         SUM(CASE WHEN result = 'strikeout'     THEN 1 ELSE 0 END)                                  AS strikeouts
       FROM at_bats
       WHERE game_id = ? AND COALESCE(batter_player_id, player_id) = ?`,
      [gameId, playerId],
    );

    // Estadísticas de pitcheo
    const [pitchRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS pitches_thrown,
         AVG(start_speed) AS avg_velocity_kmh,
         MAX(start_speed) AS max_velocity_kmh,
         AVG(spin_rate)   AS avg_spin_rate
       FROM pitches
       WHERE game_id = ? AND pitcher_player_id = ?`,
      [gameId, playerId],
    );

    const bat = batRows[0] ?? {};
    const ab       = Number(bat['ab']       ?? 0);
    const hits     = Number(bat['hits']     ?? 0);
    const doubles  = Number(bat['doubles']  ?? 0);
    const triples  = Number(bat['triples']  ?? 0);
    const homeRuns = Number(bat['home_runs']?? 0);
    const walks    = Number(bat['walks']    ?? 0);
    const hbp      = Number(bat['hbp']      ?? 0);
    const sf       = Number(bat['sf']       ?? 0);

    const avg = ab > 0 ? Math.round((hits / ab) * 1000) / 1000 : null;

    // OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
    const obpDenom = ab + walks + hbp + sf;
    const obp = obpDenom > 0
      ? Math.round(((hits + walks + hbp) / obpDenom) * 1000) / 1000
      : null;

    // SLG = (1B + 2×2B + 3×3B + 4×HR) / AB
    const singles      = hits - doubles - triples - homeRuns;
    const totalBases   = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
    const slg = ab > 0 ? Math.round((totalBases / ab) * 1000) / 1000 : null;

    // OPS = OBP + SLG
    const ops = obp !== null && slg !== null
      ? Math.round((obp + slg) * 1000) / 1000
      : null;

    const pitch = pitchRows[0] ?? {};

    apiOk(res, {
      playerId,
      gameId,
      batting: {
        ab,
        hits,
        avg,
        doubles,
        triples,
        homeRuns,
        rbi:        Number(bat['rbi']        ?? 0),
        runs:       Number(bat['runs']        ?? 0),
        walks,
        hbp,
        sf,
        strikeouts: Number(bat['strikeouts'] ?? 0),
        obp,
        slg,
        ops,
      },
      pitching: {
        pitchesThrown:    Number(pitch['pitches_thrown'] ?? 0),
        avgVelocityKmh:   pitch['avg_velocity_kmh'] !== null ? Math.round(Number(pitch['avg_velocity_kmh']) * 10) / 10 : null,
        maxVelocityKmh:   pitch['max_velocity_kmh'] !== null ? Math.round(Number(pitch['max_velocity_kmh']) * 10) / 10 : null,
        avgSpinRate:      pitch['avg_spin_rate']     !== null ? Math.round(Number(pitch['avg_spin_rate']))              : null,
      },
    });
  } catch (err) {
    console.error('[apiV1] GET /players/:id/stats error:', err);
    apiErr(res, String(err), 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/at-bats
// At-bats del juego con event_type MLBAM
// Query params: inning, inningHalf, batterId, limit (default 50)
// ---------------------------------------------------------------------------
router.get('/games/:id/at-bats', async (req: Request, res: Response) => {
  if (!pool) { apiErr(res, 'Base de datos no disponible', 503); return; }

  const { id } = req.params as { id: string };
  const inning     = optionalInteger(req.query.inning);
  const inningHalf = typeof req.query.inningHalf === 'string' ? req.query.inningHalf : null;
  const batterId   = typeof req.query.batterId   === 'string' ? req.query.batterId   : null;
  const limit      = Math.min(optionalInteger(req.query.limit) ?? 50, 200);

  try {
    const conditions: string[] = ['game_id = ?'];
    const params: Array<string | number> = [id];
    if (inning !== null)  { conditions.push('inning = ?');                                     params.push(inning); }
    if (inningHalf)       { conditions.push('inning_half = ?');                                params.push(inningHalf); }
    if (batterId)         { conditions.push('COALESCE(batter_player_id, player_id) = ?');      params.push(batterId); }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         id, game_id, COALESCE(batter_player_id, player_id) AS batter_id,
         pitcher_player_id, inning, inning_half,
         result, event_type, rbi, runs, on_base,
         pitch_count, contact_type, hit_direction, hit_quality,
         runners, runners_json,
         timestamp
       FROM at_bats
       WHERE ${conditions.join(' AND ')}
       ORDER BY timestamp ASC
       LIMIT ?`,
      [...params, limit],
    );

    const atBats = rows.map((r) => ({
      id:               r['id'],
      gameId:           r['game_id'],
      batterId:         r['batter_id']          ?? null,
      pitcherId:        r['pitcher_player_id']  ?? null,
      inning:           r['inning'],
      inningHalf:       r['inning_half'],
      result:           r['result'],
      eventType:        r['event_type']         ?? null,   // MLBAM vocab
      rbi:              Number(r['rbi'] ?? 0),
      runs:             Number(r['runs'] ?? 0),
      onBase:           Boolean(r['on_base']),
      pitchCount:       r['pitch_count']        !== null ? Number(r['pitch_count']) : null,
      contactType:      r['contact_type']       ?? null,
      hitDirection:     r['hit_direction']      ?? null,
      hitQuality:       r['hit_quality']        ?? null,
      runners:          parseJsonColumn<unknown>(r['runners'], null),
      runnersJson:      r['runners_json']       ?? null,
      timestamp:        toIsoString(r['timestamp']),
    }));

    apiOk(res, { gameId: id, count: atBats.length, atBats });
  } catch (err) {
    console.error('[apiV1] GET /games/:id/at-bats error:', err);
    apiErr(res, String(err), 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/box-score
// Box score completo del juego:
//   - linescore: carreras por entrada para cada equipo
//   - batting: línea por bateador (AB, R, H, RBI, BB, K, AVG, OBP, SLG)
//   - pitching: línea por lanzador (IP, H, R, BB, K, pitches)
//   - totals: R-H-E por equipo
// ---------------------------------------------------------------------------
router.get('/games/:id/box-score', async (req: Request, res: Response) => {
  if (!pool) { apiErr(res, 'Base de datos no disponible', 503); return; }

  const { id } = req.params as { id: string };

  try {
    // ── Linescore: carreras anotadas por entrada/half ──────────────────────
    const [linescoreRows] = await pool.query<RowDataPacket[]>(
      `SELECT inning, inning_half, SUM(runs) AS runs_scored
       FROM at_bats
       WHERE game_id = ?
       GROUP BY inning, inning_half
       ORDER BY inning ASC, FIELD(inning_half, 'top', 'bottom')`,
      [id],
    );

    // Determinar total de entradas jugadas
    const maxInning = linescoreRows.length > 0
      ? Math.max(...linescoreRows.map((r) => Number(r['inning'])))
      : 9;
    const innings = Array.from({ length: maxInning }, (_, i) => i + 1);

    const linescore: Record<string, number[]> = { away: [], home: [] };
    for (const inning of innings) {
      const top    = linescoreRows.find((r) => Number(r['inning']) === inning && r['inning_half'] === 'top');
      const bottom = linescoreRows.find((r) => Number(r['inning']) === inning && r['inning_half'] === 'bottom');
      linescore['away'].push(Number(top?.['runs_scored']    ?? 0));
      linescore['home'].push(Number(bottom?.['runs_scored'] ?? 0));
    }

    // ── Batting lines: una fila por bateador ──────────────────────────────
    const [battingRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COALESCE(batter_player_id, player_id) AS player_id,
         COUNT(CASE WHEN result NOT IN ('walk','hbp','sacrifice_fly','sacrifice_bunt') THEN 1 END) AS ab,
         SUM(runs)                                                                                  AS runs,
         SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END)        AS hits,
         SUM(rbi)                                                                                   AS rbi,
         SUM(CASE WHEN result = 'walk'          THEN 1 ELSE 0 END)                                 AS walks,
         SUM(CASE WHEN result = 'hbp'           THEN 1 ELSE 0 END)                                 AS hbp,
         SUM(CASE WHEN result = 'sacrifice_fly' THEN 1 ELSE 0 END)                                 AS sf,
         SUM(CASE WHEN result = 'strikeout'     THEN 1 ELSE 0 END)                                 AS strikeouts,
         SUM(CASE WHEN result = 'double'        THEN 1 ELSE 0 END)                                 AS doubles,
         SUM(CASE WHEN result = 'triple'        THEN 1 ELSE 0 END)                                 AS triples,
         SUM(CASE WHEN result = 'home_run'      THEN 1 ELSE 0 END)                                 AS home_runs,
         MIN(timestamp) AS first_ab
       FROM at_bats
       WHERE game_id = ?
       GROUP BY COALESCE(batter_player_id, player_id)
       ORDER BY first_ab ASC`,
      [id],
    );

    const batting = battingRows.map((r) => {
      const ab       = Number(r['ab']       ?? 0);
      const hits     = Number(r['hits']     ?? 0);
      const walks    = Number(r['walks']    ?? 0);
      const hbp      = Number(r['hbp']      ?? 0);
      const sf       = Number(r['sf']       ?? 0);
      const doubles  = Number(r['doubles']  ?? 0);
      const triples  = Number(r['triples']  ?? 0);
      const homeRuns = Number(r['home_runs']?? 0);

      const avg = ab > 0 ? Math.round((hits / ab) * 1000) / 1000 : null;

      const obpDenom = ab + walks + hbp + sf;
      const obp = obpDenom > 0
        ? Math.round(((hits + walks + hbp) / obpDenom) * 1000) / 1000
        : null;

      const singles    = hits - doubles - triples - homeRuns;
      const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
      const slg = ab > 0 ? Math.round((totalBases / ab) * 1000) / 1000 : null;
      const ops = obp !== null && slg !== null
        ? Math.round((obp + slg) * 1000) / 1000
        : null;

      return {
        playerId:   r['player_id'],
        ab,
        runs:       Number(r['runs']       ?? 0),
        hits,
        rbi:        Number(r['rbi']        ?? 0),
        walks,
        hbp,
        strikeouts: Number(r['strikeouts'] ?? 0),
        doubles,
        triples,
        homeRuns,
        avg,
        obp,
        slg,
        ops,
      };
    });

    // ── Pitching lines: una fila por lanzador ─────────────────────────────
    const [pitchingRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         p.pitcher_player_id AS player_id,
         COUNT(*)             AS pitches_thrown,
         AVG(p.start_speed)   AS avg_velocity_kmh,
         MAX(p.start_speed)   AS max_velocity_kmh
       FROM pitches p
       WHERE p.game_id = ? AND p.pitcher_player_id IS NOT NULL
       GROUP BY p.pitcher_player_id`,
      [id],
    );

    // Runs / Hits / BB / K desde at_bats por lanzador
    const [pitcherAtBatRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         pitcher_player_id AS player_id,
         COUNT(CASE WHEN result NOT IN ('walk','hbp','sacrifice_fly','sacrifice_bunt') THEN 1 END) AS bf,
         SUM(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 ELSE 0 END)        AS hits_allowed,
         SUM(runs)                                                                                  AS runs_allowed,
         SUM(CASE WHEN result IN ('walk','hbp') THEN 1 ELSE 0 END)                                 AS walks_allowed,
         SUM(CASE WHEN result = 'strikeout'     THEN 1 ELSE 0 END)                                 AS strikeouts_recorded,
         SUM(pitch_count) AS pitch_count_total
       FROM at_bats
       WHERE game_id = ? AND pitcher_player_id IS NOT NULL
       GROUP BY pitcher_player_id`,
      [id],
    );

    const pitcherAtBatMap = new Map(
      pitcherAtBatRows.map((r) => [String(r['player_id']), r as RowDataPacket]),
    );

    const pitching = pitchingRows.map((r) => {
      const pid  = String(r['player_id']);
      const abr: RowDataPacket  = pitcherAtBatMap.get(pid) ?? ({} as RowDataPacket);
      return {
        playerId:           pid,
        pitchesThrown:      Number(r['pitches_thrown']    ?? 0),
        avgVelocityKmh:     r['avg_velocity_kmh'] !== null ? Math.round(Number(r['avg_velocity_kmh']) * 10) / 10 : null,
        maxVelocityKmh:     r['max_velocity_kmh'] !== null ? Math.round(Number(r['max_velocity_kmh']) * 10) / 10 : null,
        hitsAllowed:        Number(abr['hits_allowed']        ?? 0),
        runsAllowed:        Number(abr['runs_allowed']        ?? 0),
        walksAllowed:       Number(abr['walks_allowed']       ?? 0),
        strikeoutsRecorded: Number(abr['strikeouts_recorded'] ?? 0),
        bf:                 Number(abr['bf']                  ?? 0),
      };
    });

    // ── Totals ────────────────────────────────────────────────────────────
    const awayRuns  = linescore['away'].reduce((s, n) => s + n, 0);
    const homeRuns  = linescore['home'].reduce((s, n) => s + n, 0);
    const awayHits  = batting.reduce((s, b) => s + b.hits, 0);
    const homeHits  = 0; // TODO: cuando haya equipo asignado por bateador, separar por equipo
    void homeHits;

    apiOk(res, {
      gameId: id,
      innings,
      linescore,
      totals: {
        away: { runs: awayRuns, hits: awayHits, errors: 0 },
        home: { runs: homeRuns, hits: 0,         errors: 0 },
      },
      batting,
      pitching,
    });
  } catch (err) {
    console.error('[apiV1] GET /games/:id/box-score error:', err);
    apiErr(res, String(err), 500);
  }
});

export default router;
