// ---------------------------------------------------------------------------
// exportRouter — GET /api/v1/games/:id/export
// Formatos: retrosheet | mlbam-json | csv
// Spec 29 — extensión S6
// ---------------------------------------------------------------------------

import { Router, type Request, type Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { pool } from './db';
import { toIsoString } from './routerUtils';

const router = Router();

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface AtBatRow extends RowDataPacket {
  id: string;
  game_id: string;
  batter_id: string;
  pitcher_player_id: string | null;
  inning: number;
  inning_half: string;
  result: string;
  event_type: string | null;
  rbi: number;
  runs: number;
  on_base: number;
  pitch_count: number | null;
  contact_type: string | null;
  hit_direction: string | null;
  hit_quality: string | null;
  timestamp: Date | string;
}

interface PitchRow extends RowDataPacket {
  id: string;
  at_bat_id: string | null;
  inning: number;
  inning_half: string;
  pitcher_player_id: string | null;
  batter_player_id: string | null;
  pitch_type: string | null;
  pitch_class: string | null;
  umpire_call: string;
  plate_x: number | null;
  plate_z: number | null;
  zone: number | null;
  start_speed: number | null;
  spin_rate: number | null;
  timestamp: Date | string;
}

interface GameRow extends RowDataPacket {
  id: string;
  game_name: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  game_date: Date | string | null;
}

// ---------------------------------------------------------------------------
// Retrosheet helpers
// ---------------------------------------------------------------------------

/** Mapa MLBAM event_type → código Retrosheet */
const RETROSHEET_EVENT_MAP: Record<string, string> = {
  single:                        'S',
  double:                        'D',
  triple:                        'T',
  home_run:                      'HR',
  walk:                          'W',
  intent_walk:                   'IW',
  hit_by_pitch:                  'HP',
  strikeout:                     'K',
  field_out:                     'F',
  force_out:                     'FC',
  grounded_into_double_play:     'GDP',
  double_play:                   'DP',
  sac_fly:                       'SF',
  sac_bunt:                      'SH',
  field_error:                   'E',
  fielders_choice:               'FC',
  fielders_choice_out:           'FC/FO',
  catcher_interference:          'CI',
};

function toRetroEvent(row: AtBatRow): string {
  const event = RETROSHEET_EVENT_MAP[row.event_type ?? row.result] ?? row.result.toUpperCase();
  const dir = row.hit_direction ? `/${row.hit_direction}` : '';
  return `${event}${dir}`;
}

/** Genera una línea de evento Retrosheet (formato simplificado para ligas amateur) */
function atBatToRetrosheet(row: AtBatRow): string {
  // play,inning,side,batter_id,count,pitches,event
  const side = row.inning_half === 'top' ? '0' : '1';
  const batterId = (row.batter_id ?? 'UNK').padEnd(8, ' ');
  const event = toRetroEvent(row);
  const rbi = row.rbi > 0 ? ` RBI:${row.rbi}` : '';
  return `play,${row.inning},${side},${batterId.trim()},,${row.pitch_count ?? '?'}pitches,${event}${rbi}`;
}

// ---------------------------------------------------------------------------
// GET /api/v1/games/:id/export
// Query params: format = 'retrosheet' | 'mlbam-json' | 'csv' (default: mlbam-json)
// ---------------------------------------------------------------------------
router.get('/games/:id/export', async (req: Request, res: Response) => {
  if (!pool) {
    res.status(503).json({ apiVersion: 'v1', status: 503, error: { message: 'Base de datos no disponible' } });
    return;
  }

  const { id } = req.params as { id: string };
  const format = (req.query.format as string | undefined) ?? 'mlbam-json';

  if (!['retrosheet', 'mlbam-json', 'csv'].includes(format)) {
    res.status(400).json({ apiVersion: 'v1', status: 400, error: { message: 'format debe ser retrosheet, mlbam-json o csv' } });
    return;
  }

  try {
    // Metadatos del juego
    const [gameRows] = await pool.query<GameRow[]>(
      `SELECT g.id, g.game_name,
              ht.name AS home_team_name,
              at.name AS away_team_name,
              g.game_date
       FROM games g
       LEFT JOIN teams ht ON g.home_team_id = ht.id
       LEFT JOIN teams at ON g.away_team_id = at.id
       WHERE g.id = ?`,
      [id],
    );
    const game = gameRows[0];

    // At-bats
    const [abRows] = await pool.query<AtBatRow[]>(
      `SELECT id, game_id,
              COALESCE(batter_player_id, player_id) AS batter_id,
              pitcher_player_id, inning, inning_half,
              result, event_type, rbi, runs, on_base,
              pitch_count, contact_type, hit_direction, hit_quality,
              timestamp
       FROM at_bats
       WHERE game_id = ?
       ORDER BY inning ASC, inning_half ASC, timestamp ASC`,
      [id],
    );

    // Pitcheos (solo para mlbam-json y csv)
    let pitchRows: PitchRow[] = [];
    if (format !== 'retrosheet') {
      const [rows] = await pool.query<PitchRow[]>(
        `SELECT id, at_bat_id, inning, inning_half,
                pitcher_player_id, batter_player_id,
                pitch_type, pitch_class, umpire_call,
                plate_x, plate_z, zone, start_speed, spin_rate,
                timestamp
         FROM pitches
         WHERE game_id = ?
         ORDER BY timestamp ASC`,
        [id],
      );
      pitchRows = rows;
    }

    if (format === 'retrosheet') {
      const lines: string[] = [];
      lines.push(`id,${id}`);
      if (game) {
        lines.push(`info,visteam,${game.away_team_name ?? 'AWAY'}`);
        lines.push(`info,hometeam,${game.home_team_name ?? 'HOME'}`);
        lines.push(`info,date,${game.game_date ? toIsoString(game.game_date).slice(0, 10) : 'unknown'}`);
        lines.push(`info,site,MinerosSantiago`);
        lines.push(`info,scorer,MinerosBroadcast`);
      }
      for (const ab of abRows) {
        lines.push(atBatToRetrosheet(ab));
      }
      lines.push('');  // newline final

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${id}.txt"`);
      res.send(lines.join('\n'));
      return;
    }

    if (format === 'csv') {
      const headers = [
        'atBatId', 'batterId', 'pitcherId', 'inning', 'inningHalf',
        'result', 'eventType', 'rbi', 'runs', 'onBase', 'pitchCount',
        'contactType', 'hitDirection', 'hitQuality', 'timestamp',
      ];
      const rows = abRows.map((ab) => [
        ab.id, ab.batter_id ?? '', ab.pitcher_player_id ?? '',
        ab.inning, ab.inning_half,
        ab.result, ab.event_type ?? '',
        ab.rbi, ab.runs, ab.on_base ? '1' : '0',
        ab.pitch_count ?? '', ab.contact_type ?? '',
        ab.hit_direction ?? '', ab.hit_quality ?? '',
        toIsoString(ab.timestamp),
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${id}-at-bats.csv"`);
      res.send(csv);
      return;
    }

    // mlbam-json (default)
    const atBatsByInning: Record<string, typeof abRows> = {};
    for (const ab of abRows) {
      const key = `${ab.inning}-${ab.inning_half}`;
      if (!atBatsByInning[key]) atBatsByInning[key] = [];
      atBatsByInning[key]!.push(ab);
    }

    res.json({
      apiVersion: 'v1',
      status: 200,
      data: {
        gameId: id,
        gameName: game?.game_name ?? null,
        homeTeam: game?.home_team_name ?? null,
        awayTeam: game?.away_team_name ?? null,
        gameDate: game?.game_date ? toIsoString(game.game_date).slice(0, 10) : null,
        exportedAt: new Date().toISOString(),
        summary: {
          atBats: abRows.length,
          pitches: pitchRows.length,
          innings: Object.keys(atBatsByInning).length,
        },
        atBats: abRows.map((ab) => ({
          id:           ab.id,
          batterId:     ab.batter_id  ?? null,
          pitcherId:    ab.pitcher_player_id ?? null,
          inning:       ab.inning,
          inningHalf:   ab.inning_half,
          result:       ab.result,
          eventType:    ab.event_type ?? null,   // MLBAM vocab
          rbi:          ab.rbi,
          runs:         ab.runs,
          onBase:       Boolean(ab.on_base),
          pitchCount:   ab.pitch_count ?? null,
          contactType:  ab.contact_type  ?? null,
          hitDirection: ab.hit_direction ?? null,
          hitQuality:   ab.hit_quality   ?? null,
          timestamp:    toIsoString(ab.timestamp),
        })),
        pitches: pitchRows.map((p) => ({
          id:             p.id,
          atBatId:        p.at_bat_id         ?? null,
          inning:         p.inning,
          inningHalf:     p.inning_half,
          pitcherId:      p.pitcher_player_id ?? null,
          batterId:       p.batter_player_id  ?? null,
          pitchClass:     p.pitch_class       ?? p.pitch_type ?? null,
          umpireCall:     p.umpire_call,
          plateX:         p.plate_x     !== null ? Number(p.plate_x)     : null,
          plateZ:         p.plate_z     !== null ? Number(p.plate_z)     : null,
          zone:           p.zone        !== null ? Number(p.zone)        : null,
          startSpeedKmh:  p.start_speed !== null ? Number(p.start_speed) : null,
          spinRate:       p.spin_rate   !== null ? Number(p.spin_rate)   : null,
          timestamp:      toIsoString(p.timestamp),
        })),
      },
    });
  } catch (err) {
    console.error('[exportRouter] export error:', err);
    res.status(500).json({ apiVersion: 'v1', status: 500, error: { message: String(err) } });
  }
});

export default router;
