// ---------------------------------------------------------------------------
// apiV1Router — API pública v1, esquema MLBAM-compatible
// PlayFlow Extension Namespace (PFX): campos no-estándar bajo ext.playflow
//
// GET  /api/v1/games/:id/live      → live game data
// GET  /api/v1/games/:id/pitches   → pitcheos con coordenadas métricas
// GET  /api/v1/games/:id/at-bats   → at-bats con vocabulario MLBAM
// GET  /api/v1/games/:id/box-score → box score completo
// GET  /api/v1/players/:id/stats   → estadísticas por jugador
// Spec 29 § 6 + Migración 018 (PFX)
// ---------------------------------------------------------------------------

import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';

import { pool } from './db';
import { stateStore } from './stateStore';
import { parseJsonColumn, toIsoString, optionalInteger } from './routerUtils';

const router = Router();

// ---------------------------------------------------------------------------
// Constantes PFX
// ---------------------------------------------------------------------------

/** Namespace de extensión PlayFlow en respuestas JSON */
const PFX_NS = 'playflow';

// ---------------------------------------------------------------------------
// Helpers generales
// ---------------------------------------------------------------------------

function apiOk(res: Response, data: unknown, status = 200) {
  res.status(status).json({ apiVersion: 'v1', status, data });
}

function apiErr(res: Response, message: string, status = 400) {
  res.status(status).json({ apiVersion: 'v1', status, error: { message } });
}

/** Detecta si la petición prefiere respuesta MLBAM pura (sin extensiones PFX) */
function wantsMlbamPure(req: Request): boolean {
  const accept = req.headers['accept'] ?? '';
  return accept.includes('application/vnd.playflow.mlbam+json');
}

/** Construye el bloque ext.playflow si el cliente no pidió MLBAM puro */
function buildExt(req: Request, fields: Record<string, unknown>): Record<string, unknown> | undefined {
  if (wantsMlbamPure(req)) return undefined;
  const nonNull = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined));
  if (Object.keys(nonNull).length === 0) return undefined;
  return { [PFX_NS]: nonNull };
}

/** Mapea umpire_call interno al código MLBAM de resultado de pitcheo */
function umpireCallToMlbam(call: string | null): { code: string; description: string } | null {
  if (!call) return null;
  const map: Record<string, { code: string; description: string }> = {
    ball:        { code: 'B', description: 'Ball' },
    strike:      { code: 'C', description: 'Called Strike' },
    swinging:    { code: 'S', description: 'Swinging Strike' },
    foul:        { code: 'F', description: 'Foul' },
    hit:         { code: 'X', description: 'In play, no out' },
    hbp:         { code: 'H', description: 'Hit By Pitch' },
    called_strike: { code: 'C', description: 'Called Strike' },
  };
  return map[call.toLowerCase()] ?? { code: call.toUpperCase(), description: call };
}

/** Convierte corredor de stateStore al formato MLBAM */
function mapRunner(base: unknown): { id: string } | null {
  if (!base || typeof base !== 'object') return null;
  const r = base as Record<string, unknown>;
  return { id: String(r['id'] ?? '') };
}

// ---------------------------------------------------------------------------
// Serializers MLBAM + PFX
// ---------------------------------------------------------------------------

interface PitchRow extends RowDataPacket {
  id: string;
  game_id: string;
  at_bat_id: string | null;
  inning: number;
  inning_half: string;
  pitcher_player_id: string | null;
  batter_player_id: string | null;
  pitch_num: number;
  pitch_class: string | null;
  umpire_call: string;
  plate_x: string | null;
  plate_z: string | null;
  zone: number | null;
  sz_top: string | null;
  sz_bottom: string | null;
  start_speed: string | null;
  end_speed: string | null;
  spin_rate: number | null;
  spin_axis: number | null;
  pfx_x: string | null;
  pfx_z: string | null;
  confidence: string | null;
  device_id: string | null;
  operator_id: string | null;
  ext: string | null;
  timestamp: Date;
}

function serializePitch(req: Request, r: PitchRow) {
  const call = umpireCallToMlbam(r.umpire_call);
  const extDb = parseJsonColumn<Record<string, unknown>>(r.ext, {});
  const pfxDb = (extDb[PFX_NS] as Record<string, unknown> | undefined) ?? {};

  const standard = {
    id:             r.id,
    gameId:         r.game_id,
    atBatId:        r.at_bat_id          ?? null,
    inning:         r.inning,
    inningHalf:     r.inning_half,
    pitcherPlayerId: r.pitcher_player_id ?? null,
    batterPlayerId: r.batter_player_id   ?? null,
    pitchNumber:    r.pitch_num,
    pitchData: {
      pitchClass:    r.pitch_class        ?? null,   // código MLBAM: FF, SL, CH…
      call,
      coordinates: {
        plateX:      r.plate_x  !== null ? Number(r.plate_x)   : null,  // metros
        plateZ:      r.plate_z  !== null ? Number(r.plate_z)   : null,  // metros
      },
      zone:          r.zone               !== null ? Number(r.zone)      : null,
      strikeZone: {
        top:         r.sz_top    !== null ? Number(r.sz_top)   : null,
        bottom:      r.sz_bottom !== null ? Number(r.sz_bottom): null,
      },
      breaks: {
        pfxX:        r.pfx_x !== null ? Number(r.pfx_x) : null,   // cm
        pfxZ:        r.pfx_z !== null ? Number(r.pfx_z) : null,   // cm
      },
      startSpeed:    r.start_speed !== null ? Number(r.start_speed) : null,  // km/h
      endSpeed:      r.end_speed   !== null ? Number(r.end_speed)   : null,  // km/h
      spinRate:      r.spin_rate   !== null ? Number(r.spin_rate)   : null,  // rpm
      spinAxis:      r.spin_axis   !== null ? Number(r.spin_axis)   : null,
      confidence:    r.confidence  !== null ? Number(r.confidence)  : null,
      deviceId:      r.device_id             ?? null,
    },
    timestamp: toIsoString(r.timestamp),
  };

  const ext = buildExt(req, {
    operatorId:    pfxDb['operatorId'] ?? r.operator_id ?? null,
    ...(pfxDb['catcherTarget'] ? { catcherTarget: pfxDb['catcherTarget'] } : {}),
  });

  return ext ? { ...standard, ext } : standard;
}

interface AtBatRow extends RowDataPacket {
  id: string;
  game_id: string;
  batter_player_id: string | null;
  pitcher_player_id: string | null;
  inning: number;
  inning_half: string;
  batting_team_id: string | null;
  event_type: string | null;
  rbi: number;
  runs: number;
  on_base: number;
  pitch_count: number | null;
  contact_type: string | null;
  hit_direction: string | null;
  hit_data: string | null;
  runners: string | null;
  notes: string | null;
  outs_before: number | null;
  score_home: number | null;
  score_away: number | null;
  video_timestamp: string | null;
  ext: string | null;
  timestamp: Date;
}

function serializeAtBat(req: Request, r: AtBatRow) {
  const hitData = parseJsonColumn<Record<string, unknown> | null>(r.hit_data, null);
  const extDb   = parseJsonColumn<Record<string, unknown>>(r.ext, {});
  const pfxDb   = (extDb[PFX_NS] as Record<string, unknown> | undefined) ?? {};
  const notes   = pfxDb['notes'] as string | undefined ?? r.notes ?? null;

  const standard = {
    id:            r.id,
    gameId:        r.game_id,
    batterId:      r.batter_player_id  ?? null,
    pitcherId:     r.pitcher_player_id ?? null,
    inning:        r.inning,
    inningHalf:    r.inning_half,
    battingTeamId: r.batting_team_id   ?? null,   // MLBAM: battingTeam
    eventType:     r.event_type        ?? null,   // vocabulario MLBAM
    rbi:           Number(r.rbi  ?? 0),
    runs:          Number(r.runs ?? 0),
    pitchCount:    r.pitch_count !== null ? Number(r.pitch_count) : null,
    hitData:       hitData,                        // MLBAM hitData: {type, direction, coordinates}
    runners:       parseJsonColumn<unknown>(r.runners, null),
    context: {
      outsBefore:   r.outs_before  !== null ? Number(r.outs_before)  : null,
      scoreHome:    r.score_home   !== null ? Number(r.score_home)   : null,
      scoreAway:    r.score_away   !== null ? Number(r.score_away)   : null,
      videoTimestamp: r.video_timestamp ?? null,
    },
    timestamp:     toIsoString(r.timestamp),
  };

  const ext = buildExt(req, {
    notes,
    onBase: r.on_base !== null ? Boolean(r.on_base) : null,
  });

  return ext ? { ...standard, ext } : standard;
}

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/live
// ---------------------------------------------------------------------------
router.get('/games/:id/live', (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const state = stateStore.getState();

  if (state.gameId !== id) {
    apiErr(res, `Juego ${id} no está activo. Juego activo: ${state.gameId}`, 404);
    return;
  }

  const bases = state.bases;
  const standard = {
    gameId:      state.gameId,
    status:      state.status,
    inning:      state.inning,
    inningHalf:  state.inningHalf,
    outs:        state.outs,
    count:       { balls: state.count.balls, strikes: state.count.strikes },
    score:       { home: state.score.home, away: state.score.away },
    runners: {
      first:  mapRunner(bases.first),
      second: mapRunner(bases.second),
      third:  mapRunner(bases.third),
    },
    currentBatter:  state.currentBatterId  ?? null,
    currentPitcher: state.currentPitcherId ?? null,
    homeTeam: { id: state.homeTeam.id, name: state.homeTeam.name, shortName: state.homeTeam.shortName },
    awayTeam: { id: state.awayTeam.id, name: state.awayTeam.name, shortName: state.awayTeam.shortName },
  };

  const ext = buildExt(req, {
    lineup: state.lineup,
    eventLog: state.eventLog,
  });

  res.json({ apiVersion: 'v1', status: 200, data: ext ? { ...standard, ext } : standard });
});

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/pitches
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

    if (inning !== null) { conditions.push('p.inning = ?');            params.push(inning); }
    if (inningHalf)      { conditions.push('p.inning_half = ?');       params.push(inningHalf); }
    if (pitcherId)       { conditions.push('p.pitcher_player_id = ?'); params.push(pitcherId); }
    if (batterId)        { conditions.push('p.batter_player_id = ?');  params.push(batterId); }

    const [rows] = await pool.query<PitchRow[]>(
      `SELECT
         p.id, p.game_id, p.at_bat_id, p.inning, p.inning_half,
         p.pitcher_player_id, p.batter_player_id,
         p.pitch_num, p.pitch_class, p.umpire_call,
         p.plate_x, p.plate_z, p.zone,
         p.sz_top, p.sz_bottom,
         p.start_speed, p.end_speed,
         p.spin_rate, p.spin_axis,
         p.pfx_x, p.pfx_z,
         p.confidence, p.device_id,
         p.operator_id, p.ext,
         p.timestamp
       FROM pitches p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.timestamp ASC
       LIMIT ?`,
      [...params, limit],
    );

    apiOk(res, { gameId: id, count: rows.length, pitches: rows.map((r) => serializePitch(req, r)) });
  } catch (err) {
    console.error('[apiV1] GET /games/:id/pitches error:', err);
    apiErr(res, String(err), 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/at-bats
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
    if (inning !== null) { conditions.push('inning = ?');            params.push(inning); }
    if (inningHalf)      { conditions.push('inning_half = ?');       params.push(inningHalf); }
    if (batterId)        { conditions.push('batter_player_id = ?');  params.push(batterId); }

    const [rows] = await pool.query<AtBatRow[]>(
      `SELECT
         id, game_id, batter_player_id, pitcher_player_id,
         inning, inning_half, batting_team_id,
         event_type, rbi, runs, on_base,
         pitch_count, contact_type, hit_direction, hit_data,
         runners, notes,
         outs_before, score_home, score_away, video_timestamp,
         ext, timestamp
       FROM at_bats
       WHERE ${conditions.join(' AND ')}
       ORDER BY timestamp ASC
       LIMIT ?`,
      [...params, limit],
    );

    apiOk(res, { gameId: id, count: rows.length, atBats: rows.map((r) => serializeAtBat(req, r)) });
  } catch (err) {
    console.error('[apiV1] GET /games/:id/at-bats error:', err);
    apiErr(res, String(err), 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/players/:id/stats
// ---------------------------------------------------------------------------
router.get('/players/:id/stats', async (req: Request, res: Response) => {
  if (!pool) { apiErr(res, 'Base de datos no disponible', 503); return; }

  const { id: playerId } = req.params as { id: string };
  const gameId = typeof req.query.gameId === 'string' ? req.query.gameId : null;

  if (!gameId) { apiErr(res, 'gameId es requerido como query param', 400); return; }

  try {
    const [batRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(CASE WHEN event_type NOT IN ('walk','intent_walk','hit_by_pitch','sac_fly','sac_bunt') THEN 1 END) AS ab,
         SUM(CASE WHEN event_type IN ('single','double','triple','home_run') THEN 1 ELSE 0 END)  AS hits,
         SUM(CASE WHEN event_type = 'double'      THEN 1 ELSE 0 END)                             AS doubles,
         SUM(CASE WHEN event_type = 'triple'      THEN 1 ELSE 0 END)                             AS triples,
         SUM(CASE WHEN event_type = 'home_run'    THEN 1 ELSE 0 END)                             AS home_runs,
         SUM(rbi)  AS rbi,
         SUM(runs) AS runs,
         SUM(CASE WHEN event_type IN ('walk','intent_walk') THEN 1 ELSE 0 END)                   AS walks,
         SUM(CASE WHEN event_type = 'hit_by_pitch' THEN 1 ELSE 0 END)                            AS hbp,
         SUM(CASE WHEN event_type = 'sac_fly'     THEN 1 ELSE 0 END)                             AS sf,
         SUM(CASE WHEN event_type = 'strikeout'   THEN 1 ELSE 0 END)                             AS strikeouts
       FROM at_bats
       WHERE game_id = ? AND batter_player_id = ?`,
      [gameId, playerId],
    );

    const [pitchRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         COUNT(*)         AS pitches_thrown,
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

    const avg      = ab > 0 ? Math.round((hits / ab) * 1000) / 1000 : null;
    const obpDenom = ab + walks + hbp + sf;
    const obp      = obpDenom > 0
      ? Math.round(((hits + walks + hbp) / obpDenom) * 1000) / 1000
      : null;
    const singles    = hits - doubles - triples - homeRuns;
    const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
    const slg        = ab > 0 ? Math.round((totalBases / ab) * 1000) / 1000 : null;
    const ops        = obp !== null && slg !== null
      ? Math.round((obp + slg) * 1000) / 1000
      : null;

    const pitch = pitchRows[0] ?? {};

    apiOk(res, {
      playerId,
      gameId,
      batting: {
        ab, hits, avg, doubles, triples, homeRuns,
        rbi:        Number(bat['rbi']        ?? 0),
        runs:       Number(bat['runs']        ?? 0),
        walks, hbp, sf,
        strikeouts: Number(bat['strikeouts'] ?? 0),
        obp, slg, ops,
      },
      pitching: {
        pitchesThrown:   Number(pitch['pitches_thrown']  ?? 0),
        avgVelocityKmh:  pitch['avg_velocity_kmh'] !== null ? Math.round(Number(pitch['avg_velocity_kmh']) * 10) / 10 : null,
        maxVelocityKmh:  pitch['max_velocity_kmh'] !== null ? Math.round(Number(pitch['max_velocity_kmh']) * 10) / 10 : null,
        avgSpinRate:     pitch['avg_spin_rate']     !== null ? Math.round(Number(pitch['avg_spin_rate']))              : null,
      },
    });
  } catch (err) {
    console.error('[apiV1] GET /players/:id/stats error:', err);
    apiErr(res, String(err), 500);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/box-score
// ---------------------------------------------------------------------------
router.get('/games/:id/box-score', async (req: Request, res: Response) => {
  if (!pool) { apiErr(res, 'Base de datos no disponible', 503); return; }

  const { id } = req.params as { id: string };

  try {
    // Linescore
    const [linescoreRows] = await pool.query<RowDataPacket[]>(
      `SELECT inning, inning_half, SUM(runs) AS runs_scored
       FROM at_bats WHERE game_id = ?
       GROUP BY inning, inning_half
       ORDER BY inning ASC, FIELD(inning_half, 'top', 'bottom')`,
      [id],
    );

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

    // Batting lines — usa event_type MLBAM
    const [battingRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         batter_player_id AS player_id,
         inning_half,
         batting_team_id,
         COUNT(CASE WHEN event_type NOT IN ('walk','intent_walk','hit_by_pitch','sac_fly','sac_bunt') THEN 1 END) AS ab,
         SUM(runs)                                                                                                  AS runs,
         SUM(CASE WHEN event_type IN ('single','double','triple','home_run') THEN 1 ELSE 0 END)                    AS hits,
         SUM(rbi)                                                                                                   AS rbi,
         SUM(CASE WHEN event_type IN ('walk','intent_walk') THEN 1 ELSE 0 END)                                     AS walks,
         SUM(CASE WHEN event_type = 'hit_by_pitch'   THEN 1 ELSE 0 END)                                           AS hbp,
         SUM(CASE WHEN event_type = 'sac_fly'        THEN 1 ELSE 0 END)                                           AS sf,
         SUM(CASE WHEN event_type = 'strikeout'      THEN 1 ELSE 0 END)                                           AS strikeouts,
         SUM(CASE WHEN event_type = 'double'         THEN 1 ELSE 0 END)                                           AS doubles,
         SUM(CASE WHEN event_type = 'triple'         THEN 1 ELSE 0 END)                                           AS triples,
         SUM(CASE WHEN event_type = 'home_run'       THEN 1 ELSE 0 END)                                           AS home_runs,
         MIN(timestamp) AS first_ab
       FROM at_bats
       WHERE game_id = ?
       GROUP BY batter_player_id, inning_half, batting_team_id
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
      const avg      = ab > 0 ? Math.round((hits / ab) * 1000) / 1000 : null;
      const obpDenom = ab + walks + hbp + sf;
      const obp      = obpDenom > 0
        ? Math.round(((hits + walks + hbp) / obpDenom) * 1000) / 1000 : null;
      const singles    = hits - doubles - triples - homeRuns;
      const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
      const slg = ab > 0 ? Math.round((totalBases / ab) * 1000) / 1000 : null;
      const ops = obp !== null && slg !== null
        ? Math.round((obp + slg) * 1000) / 1000 : null;
      return {
        playerId:      r['player_id'] as string,
        battingTeamId: (r['batting_team_id'] as string | null) ?? null,
        team:          (r['inning_half'] === 'bottom') ? 'home' : 'away',
        ab, runs: Number(r['runs'] ?? 0), hits, rbi: Number(r['rbi'] ?? 0),
        walks, hbp, strikeouts: Number(r['strikeouts'] ?? 0),
        doubles, triples, homeRuns, avg, obp, slg, ops,
      };
    });

    // Pitching lines
    const [pitchingRows] = await pool.query<RowDataPacket[]>(
      `SELECT pitcher_player_id AS player_id,
              COUNT(*) AS pitches_thrown,
              AVG(start_speed) AS avg_velocity_kmh,
              MAX(start_speed) AS max_velocity_kmh
       FROM pitches WHERE game_id = ? AND pitcher_player_id IS NOT NULL
       GROUP BY pitcher_player_id`,
      [id],
    );

    const [pitcherAbRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         pitcher_player_id AS player_id,
         COUNT(CASE WHEN event_type NOT IN ('walk','intent_walk','hit_by_pitch','sac_fly','sac_bunt') THEN 1 END) AS bf,
         SUM(CASE WHEN event_type IN ('single','double','triple','home_run') THEN 1 ELSE 0 END) AS hits_allowed,
         SUM(runs) AS runs_allowed,
         SUM(CASE WHEN event_type IN ('walk','intent_walk','hit_by_pitch') THEN 1 ELSE 0 END)  AS walks_allowed,
         SUM(CASE WHEN event_type = 'strikeout' THEN 1 ELSE 0 END) AS strikeouts_recorded,
         SUM(pitch_count) AS pitch_count_total
       FROM at_bats WHERE game_id = ? AND pitcher_player_id IS NOT NULL
       GROUP BY pitcher_player_id`,
      [id],
    );

    const pitcherAbMap = new Map(pitcherAbRows.map((r) => [String(r['player_id']), r as RowDataPacket]));
    const pitching = pitchingRows.map((r) => {
      const pid = String(r['player_id']);
      const abr = pitcherAbMap.get(pid) ?? ({} as RowDataPacket);
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

    // Totals
    const awayRuns = linescore['away'].reduce((s, n) => s + n, 0);
    const homeRuns = linescore['home'].reduce((s, n) => s + n, 0);
    const awayHits = batting.filter((b) => b.team === 'away').reduce((s, b) => s + b.hits, 0);
    const homeHits = batting.filter((b) => b.team === 'home').reduce((s, b) => s + b.hits, 0);

    apiOk(res, {
      gameId: id,
      innings,
      linescore,
      totals: {
        away: { runs: awayRuns, hits: awayHits, errors: 0 },
        home: { runs: homeRuns, hits: homeHits, errors: 0 },
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

