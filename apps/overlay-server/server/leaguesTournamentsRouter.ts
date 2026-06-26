import { Router, type Request, type Response } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

import {
  demoCategories,
  demoLeagues,
  demoStandings,
  demoTeams,
  demoTournamentGroupTeams,
  demoTournamentGroups,
  demoTournamentTeams,
  demoTournaments,
  type DemoLeague,
  type DemoStanding,
  type DemoTeam,
  type DemoTournament,
} from './editorDemoData';
import { pool } from './db';
import {
  optionalArrayOfStrings,
  optionalBoolean,
  optionalInteger,
  optionalString,
  parseJsonColumn,
  sendCaughtError,
  sendErr,
  sendOk,
  toIsoString,
  toTinyInt,
} from './routerUtils';

interface LeagueRow extends RowDataPacket {
  id: string;
  sport_id: string;
  name: string;
  short_name: string | null;
  country: string;
  level: string | null;
  logo_asset_id: string | null;
  banner_asset_id: string | null;
  active: 0 | 1;
  created_at: string | Date;
  updated_at: string | Date;
}

interface TournamentRow extends RowDataPacket {
  id: string;
  league_id: string;
  category_id: string | null;
  league_name?: string | null;
  category_name?: string | null;
  name: string;
  short_name: string | null;
  type: string | null;
  season: string | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  rules: unknown;
  logo_asset_id: string | null;
  banner_asset_id: string | null;
  trophy_asset_id: string | null;
  status: string;
  structure_type: string | null;
  num_rounds: number | null;
  has_playoffs: 0 | 1;
  playoff_format: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface TournamentTeamRow extends RowDataPacket {
  tournament_id: string;
  team_id: string;
  seeding: number | null;
  eliminated: 0 | 1;
  name: string;
  short_name: string;
  logo_asset_id: string | null;
}

interface GroupRow extends RowDataPacket {
  id: string;
  tournament_id: string;
  name: string;
  order_num: number;
  created_at: string | Date;
}

interface GroupTeamRow extends RowDataPacket {
  group_id: string;
  team_id: string;
  seeding: number | null;
  name: string;
  short_name: string;
  logo_asset_id: string | null;
}

interface StandingRow extends RowDataPacket {
  id: string;
  tournament_id: string;
  group_id: string | null;
  team_id: string;
  JG: number;
  JP: number;
  JE: number;
  PCT: number;
  RA: number;
  RC: number;
  Dif: number;
  updated_at: string | Date;
  team_name: string;
  team_short_name: string;
}

interface LeaguePayload {
  id: string;
  sport_id: string;
  name: string;
  short_name: string | null;
  country: string;
  level: string | null;
  logo_asset_id: string | null;
  banner_asset_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TournamentPayload {
  id: string;
  league_id: string;
  category_id: string | null;
  name: string;
  short_name: string | null;
  type: string | null;
  season: string | null;
  start_date: string | null;
  end_date: string | null;
  rules: Record<string, unknown> | null;
  logo_asset_id: string | null;
  banner_asset_id: string | null;
  trophy_asset_id: string | null;
  status: string;
  structure_type: string | null;
  num_rounds: number | null;
  has_playoffs: boolean;
  playoff_format: string | null;
  created_at: string;
  updated_at: string;
}

interface TournamentTeamPayload {
  tournament_id: string;
  team_id: string;
  seeding: number | null;
  eliminated: boolean;
  name: string;
  short_name: string;
  logo_asset_id: string | null;
}

interface TournamentGroupTeamPayload {
  team_id: string;
  seeding: number | null;
  name: string;
  short_name: string;
  logo_asset_id: string | null;
}

interface TournamentGroupPayload {
  id: string;
  tournament_id: string;
  name: string;
  order_num: number;
  created_at: string;
  teams: TournamentGroupTeamPayload[];
}

interface TournamentDetailPayload extends TournamentPayload {
  league_name?: string;
  category_name?: string;
  teams: TournamentTeamPayload[];
  groups: TournamentGroupPayload[];
}

interface StandingPayload {
  id: string;
  tournament_id: string;
  group_id: string | null;
  team_id: string;
  JG: number;
  JP: number;
  JE: number;
  PCT: number;
  RA: number;
  RC: number;
  Dif: number;
  updated_at: string;
  team_name: string;
  team_short_name: string;
}

function mapLeague(row: LeagueRow | DemoLeague): LeaguePayload {
  return {
    id: row.id,
    sport_id: row.sport_id,
    name: row.name,
    short_name: row.short_name,
    country: row.country,
    level: row.level,
    logo_asset_id: row.logo_asset_id,
    banner_asset_id: row.banner_asset_id,
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function mapTournament(row: TournamentRow | DemoTournament): TournamentPayload {
  return {
    id: row.id,
    league_id: row.league_id,
    category_id: row.category_id,
    name: row.name,
    short_name: row.short_name,
    type: row.type,
    season: row.season,
    start_date: row.start_date ? toIsoString(row.start_date) : null,
    end_date: row.end_date ? toIsoString(row.end_date) : null,
    rules: row.rules ? parseJsonColumn<Record<string, unknown>>(row.rules, {}) : null,
    logo_asset_id: row.logo_asset_id,
    banner_asset_id: row.banner_asset_id,
    trophy_asset_id: row.trophy_asset_id,
    status: row.status,
    structure_type: row.structure_type,
    num_rounds: row.num_rounds,
    has_playoffs: Boolean(row.has_playoffs),
    playoff_format: row.playoff_format,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function mapTournamentTeam(row: TournamentTeamRow): TournamentTeamPayload {
  return {
    tournament_id: row.tournament_id,
    team_id: row.team_id,
    seeding: row.seeding,
    eliminated: Boolean(row.eliminated),
    name: row.name,
    short_name: row.short_name,
    logo_asset_id: row.logo_asset_id,
  };
}

function mapStanding(row: StandingRow | (DemoStanding & { team_name: string; team_short_name: string })): StandingPayload {
  return {
    id: row.id,
    tournament_id: row.tournament_id,
    group_id: row.group_id,
    team_id: row.team_id,
    JG: row.JG,
    JP: row.JP,
    JE: row.JE,
    PCT: row.PCT,
    RA: row.RA,
    RC: row.RC,
    Dif: row.Dif,
    updated_at: toIsoString(row.updated_at),
    team_name: row.team_name,
    team_short_name: row.team_short_name,
  };
}

function buildDemoTournamentDetail(tournament: DemoTournament): TournamentDetailPayload {
  const teams = demoTournamentTeams
    .filter((entry) => entry.tournament_id === tournament.id)
    .map<TournamentTeamPayload | null>((entry) => {
      const team = demoTeams.find((candidate) => candidate.id === entry.team_id) as DemoTeam | undefined;
      return team
        ? {
            tournament_id: entry.tournament_id,
            team_id: entry.team_id,
            seeding: entry.seeding,
            eliminated: Boolean(entry.eliminated),
            name: team.name,
            short_name: team.short_name,
            logo_asset_id: team.logo_asset_id,
          }
        : null;
    })
    .filter((entry): entry is TournamentTeamPayload => entry !== null);

  const groups = demoTournamentGroups
    .filter((group) => group.tournament_id === tournament.id)
    .sort((left, right) => left.order_num - right.order_num)
    .map((group) => ({
      id: group.id,
      tournament_id: group.tournament_id,
      name: group.name,
      order_num: group.order_num,
      created_at: group.created_at,
      teams: demoTournamentGroupTeams
        .filter((entry) => entry.group_id === group.id)
        .map<TournamentGroupTeamPayload | null>((entry) => {
          const team = demoTeams.find((candidate) => candidate.id === entry.team_id) as DemoTeam | undefined;
          return team
            ? {
                team_id: entry.team_id,
                seeding: entry.seeding,
                name: team.name,
                short_name: team.short_name,
                logo_asset_id: team.logo_asset_id,
              }
            : null;
        })
        .filter((entry): entry is TournamentGroupTeamPayload => entry !== null),
    }));

  const league = demoLeagues.find((entry) => entry.id === tournament.league_id);
  const category = demoCategories.find((entry) => entry.id === tournament.category_id);

  return {
    ...mapTournament(tournament),
    league_name: league?.name,
    category_name: category?.name,
    teams,
    groups,
  };
}

async function loadTournamentTeams(tournamentId: string): Promise<TournamentTeamPayload[]> {
  if (!pool) {
    const tournament = demoTournaments.find((entry) => entry.id === tournamentId);
    return tournament ? buildDemoTournamentDetail(tournament).teams : [];
  }

  const [rows] = await pool.query<TournamentTeamRow[]>(
    `SELECT tt.tournament_id, tt.team_id, tt.seeding, tt.eliminated,
            t.name, t.short_name, t.logo_asset_id
     FROM tournament_teams tt
     INNER JOIN teams t ON t.id = tt.team_id
     WHERE tt.tournament_id = ?
     ORDER BY tt.seeding ASC, t.name ASC`,
    [tournamentId],
  );

  return rows.map(mapTournamentTeam);
}

async function loadTournamentGroups(tournamentId: string): Promise<TournamentGroupPayload[]> {
  if (!pool) {
    const tournament = demoTournaments.find((entry) => entry.id === tournamentId);
    return tournament ? buildDemoTournamentDetail(tournament).groups : [];
  }

  const [groupRows] = await pool.query<GroupRow[]>(
    `SELECT id, tournament_id, name, order_num, created_at
     FROM tournament_groups
     WHERE tournament_id = ?
     ORDER BY order_num ASC, name ASC`,
    [tournamentId],
  );

  if (groupRows.length === 0) {
    return [];
  }

  const [teamRows] = await pool.query<GroupTeamRow[]>(
    `SELECT tgt.group_id, tgt.team_id, tgt.seeding, t.name, t.short_name, t.logo_asset_id
     FROM tournament_group_teams tgt
     INNER JOIN teams t ON t.id = tgt.team_id
     WHERE tgt.group_id IN (${groupRows.map(() => '?').join(', ')})
     ORDER BY tgt.seeding ASC, t.name ASC`,
    groupRows.map((group) => group.id),
  );

  const teamMap = new Map<string, TournamentGroupTeamPayload[]>();
  for (const row of teamRows) {
    const current = teamMap.get(row.group_id) ?? [];
    current.push({
      team_id: row.team_id,
      seeding: row.seeding,
      name: row.name,
      short_name: row.short_name,
      logo_asset_id: row.logo_asset_id,
    });
    teamMap.set(row.group_id, current);
  }

  return groupRows.map((group) => ({
    id: group.id,
    tournament_id: group.tournament_id,
    name: group.name,
    order_num: group.order_num,
    created_at: toIsoString(group.created_at),
    teams: teamMap.get(group.id) ?? [],
  }));
}

async function loadTournamentDetail(tournamentId: string): Promise<TournamentDetailPayload | null> {
  if (!pool) {
    const tournament = demoTournaments.find((entry) => entry.id === tournamentId);
    return tournament ? buildDemoTournamentDetail(tournament) : null;
  }

  const [rows] = await pool.query<TournamentRow[]>(
    `SELECT t.id, t.league_id, t.category_id, t.name, t.short_name, t.type, t.season, t.start_date,
            t.end_date, t.rules, t.logo_asset_id, t.banner_asset_id, t.trophy_asset_id, t.status,
            t.structure_type, t.num_rounds, t.has_playoffs, t.playoff_format, t.created_at, t.updated_at,
            l.name AS league_name, c.name AS category_name
     FROM tournaments t
     LEFT JOIN leagues l ON l.id = t.league_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?
     LIMIT 1`,
    [tournamentId],
  );

  if (rows.length === 0) {
    return null;
  }

  const tournament = rows[0];

  return {
    ...mapTournament(tournament),
    league_name: tournament.league_name ?? undefined,
    category_name: tournament.category_name ?? undefined,
    teams: await loadTournamentTeams(tournamentId),
    groups: await loadTournamentGroups(tournamentId),
  };
}

async function loadStandings(tournamentId: string, groupId?: string | null): Promise<StandingPayload[]> {
  if (!pool) {
    return demoStandings
      .filter((entry) => entry.tournament_id === tournamentId)
      .filter((entry) => (groupId ? entry.group_id === groupId : true))
      .map((entry) => {
        const team = demoTeams.find((candidate) => candidate.id === entry.team_id) as DemoTeam | undefined;
        return {
          ...entry,
          team_name: team?.name ?? entry.team_id,
          team_short_name: team?.short_name ?? entry.team_id,
        };
      })
      .map(mapStanding)
      .sort((left, right) => right.PCT - left.PCT || right.Dif - left.Dif || right.RC - left.RC);
  }

  const filters = ['s.tournament_id = ?'];
  const params: string[] = [tournamentId];
  if (groupId) {
    filters.push('s.group_id = ?');
    params.push(groupId);
  }

  const [rows] = await pool.query<StandingRow[]>(
    `SELECT s.id, s.tournament_id, s.group_id, s.team_id, s.JG, s.JP, s.JE, s.PCT, s.RA, s.RC, s.Dif,
            s.updated_at, t.name AS team_name, t.short_name AS team_short_name
     FROM standings s
     INNER JOIN teams t ON t.id = s.team_id
     WHERE ${filters.join(' AND ')}
     ORDER BY s.PCT DESC, s.Dif DESC, s.RC DESC`,
    params,
  );

  return rows.map(mapStanding);
}

async function replaceTournamentTeams(connection: PoolConnection, tournamentId: string, teamIds: string[]): Promise<void> {
  const [groupRows] = await connection.query<GroupRow[]>(
    'SELECT id, tournament_id, name, order_num, created_at FROM tournament_groups WHERE tournament_id = ?',
    [tournamentId],
  );

  if (groupRows.length > 0 && teamIds.length > 0) {
    await connection.query<ResultSetHeader>(
      `DELETE FROM tournament_group_teams
       WHERE group_id IN (${groupRows.map(() => '?').join(', ')})
         AND team_id NOT IN (${teamIds.map(() => '?').join(', ')})`,
      [...groupRows.map((group) => group.id), ...teamIds],
    );
  }

  if (groupRows.length > 0 && teamIds.length === 0) {
    await connection.query<ResultSetHeader>(
      `DELETE FROM tournament_group_teams WHERE group_id IN (${groupRows.map(() => '?').join(', ')})`,
      groupRows.map((group) => group.id),
    );
  }

  await connection.query<ResultSetHeader>('DELETE FROM tournament_teams WHERE tournament_id = ?', [tournamentId]);

  for (let index = 0; index < teamIds.length; index += 1) {
    await connection.query<ResultSetHeader>(
      'INSERT INTO tournament_teams (id, tournament_id, team_id, seeding) VALUES (?, ?, ?, ?)',
      [crypto.randomUUID(), tournamentId, teamIds[index], index + 1],
    );
  }
}

const router = Router();

router.get('/leagues', async (_request: Request, response: Response) => {
  try {
    if (!pool) {
      sendOk(response, demoLeagues.filter((entry) => entry.active === 1).map(mapLeague));
      return;
    }

    const [rows] = await pool.query<LeagueRow[]>(
      `SELECT id, sport_id, name, short_name, country, level, logo_asset_id, banner_asset_id,
              active, created_at, updated_at
       FROM leagues
       WHERE active = 1
       ORDER BY name ASC`,
    );

    sendOk(response, rows.map(mapLeague));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar las ligas');
  }
});

router.post('/leagues', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear ligas', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const sportId = optionalString(body.sport_id);
    const name = optionalString(body.name);

    if (!sportId) {
      sendErr(response, 'sport_id es requerido');
      return;
    }

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO leagues (id, sport_id, name, short_name, country, level, logo_asset_id, banner_asset_id, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sportId,
        name,
        optionalString(body.short_name),
        optionalString(body.country) ?? 'DO',
        optionalString(body.level),
        optionalString(body.logo_asset_id),
        optionalString(body.banner_asset_id),
        toTinyInt(optionalBoolean(body.active) ?? true),
      ],
    );

    const [rows] = await pool.query<LeagueRow[]>(
      `SELECT id, sport_id, name, short_name, country, level, logo_asset_id, banner_asset_id,
              active, created_at, updated_at
       FROM leagues WHERE id = ? LIMIT 1`,
      [id],
    );

    sendOk(response, mapLeague(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear la liga');
  }
});

router.put('/leagues/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar ligas', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];
    const stringFields: Array<[string, string]> = [
      ['sport_id', 'sport_id'],
      ['name', 'name'],
      ['short_name', 'short_name'],
      ['country', 'country'],
      ['level', 'level'],
      ['logo_asset_id', 'logo_asset_id'],
      ['banner_asset_id', 'banner_asset_id'],
    ];

    for (const [field, column] of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates.push(`${column} = ?`);
        params.push(optionalString(body[field]));
      }
    }

    const active = optionalBoolean(body.active);
    if (active !== null) {
      updates.push('active = ?');
      params.push(toTinyInt(active));
    }

    if (updates.length === 0) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    params.push(request.params.id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE leagues SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      params,
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Liga no encontrada', 404);
      return;
    }

    const [rows] = await pool.query<LeagueRow[]>(
      `SELECT id, sport_id, name, short_name, country, level, logo_asset_id, banner_asset_id,
              active, created_at, updated_at
       FROM leagues WHERE id = ? LIMIT 1`,
      [request.params.id],
    );

    sendOk(response, mapLeague(rows[0]));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar la liga');
  }
});

router.delete('/leagues/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para desactivar ligas', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE leagues SET active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [request.params.id],
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Liga no encontrada', 404);
      return;
    }

    sendOk(response, { id: request.params.id, active: false });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo eliminar la liga');
  }
});

router.get('/tournaments', async (request: Request, response: Response) => {
  try {
    const leagueId = optionalString(request.query.league_id);
    const categoryId = optionalString(request.query.category_id);
    const status = optionalString(request.query.status);

    if (!pool) {
      const tournaments = demoTournaments
        .filter((entry) => (leagueId ? entry.league_id === leagueId : true))
        .filter((entry) => (categoryId ? entry.category_id === categoryId : true))
        .filter((entry) => (status ? entry.status === status : true))
        .map(mapTournament);
      sendOk(response, tournaments);
      return;
    }

    const filters: string[] = [];
    const params: string[] = [];

    if (leagueId) {
      filters.push('league_id = ?');
      params.push(leagueId);
    }

    if (categoryId) {
      filters.push('category_id = ?');
      params.push(categoryId);
    }

    if (status) {
      filters.push('status = ?');
      params.push(status);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await pool.query<TournamentRow[]>(
      `SELECT id, league_id, category_id, name, short_name, type, season, start_date, end_date, rules,
              logo_asset_id, banner_asset_id, trophy_asset_id, status, structure_type, num_rounds,
              has_playoffs, playoff_format, created_at, updated_at
       FROM tournaments
       ${whereClause}
       ORDER BY start_date DESC, name ASC`,
      params,
    );

    sendOk(response, rows.map(mapTournament));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los torneos');
  }
});

router.get('/tournaments/:id', async (request: Request, response: Response) => {
  try {
    const detail = await loadTournamentDetail(request.params.id);
    if (!detail) {
      sendErr(response, 'Torneo no encontrado', 404);
      return;
    }

    sendOk(response, detail);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo cargar el torneo');
  }
});

router.post('/tournaments', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear torneos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const leagueId = optionalString(body.league_id);
    const name = optionalString(body.name);
    const teamIds = optionalArrayOfStrings(body.team_ids) ?? [];

    if (!leagueId) {
      sendErr(response, 'league_id es requerido');
      return;
    }

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query<ResultSetHeader>(
        `INSERT INTO tournaments (
          id, league_id, category_id, name, short_name, type, season, start_date, end_date, rules,
          logo_asset_id, banner_asset_id, trophy_asset_id, status, structure_type, num_rounds,
          has_playoffs, playoff_format
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          leagueId,
          optionalString(body.category_id),
          name,
          optionalString(body.short_name),
          optionalString(body.type),
          optionalString(body.season),
          optionalString(body.start_date),
          optionalString(body.end_date),
          JSON.stringify(body.rules && typeof body.rules === 'object' ? body.rules : {}),
          optionalString(body.logo_asset_id),
          optionalString(body.banner_asset_id),
          optionalString(body.trophy_asset_id),
          optionalString(body.status) ?? 'upcoming',
          optionalString(body.structure_type) ?? 'round_robin',
          optionalInteger(body.num_rounds) ?? 1,
          toTinyInt(optionalBoolean(body.has_playoffs) ?? false),
          optionalString(body.playoff_format),
        ],
      );

      await replaceTournamentTeams(connection, id, teamIds);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    sendOk(response, await loadTournamentDetail(id), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el torneo');
  }
});

router.put('/tournaments/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar torneos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];
    const stringFields: Array<[string, string]> = [
      ['league_id', 'league_id'],
      ['category_id', 'category_id'],
      ['name', 'name'],
      ['short_name', 'short_name'],
      ['type', 'type'],
      ['season', 'season'],
      ['start_date', 'start_date'],
      ['end_date', 'end_date'],
      ['logo_asset_id', 'logo_asset_id'],
      ['banner_asset_id', 'banner_asset_id'],
      ['trophy_asset_id', 'trophy_asset_id'],
      ['status', 'status'],
      ['structure_type', 'structure_type'],
      ['playoff_format', 'playoff_format'],
    ];

    for (const [field, column] of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates.push(`${column} = ?`);
        params.push(optionalString(body[field]));
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'num_rounds')) {
      updates.push('num_rounds = ?');
      params.push(optionalInteger(body.num_rounds));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'rules')) {
      updates.push('rules = ?');
      params.push(JSON.stringify(body.rules && typeof body.rules === 'object' ? body.rules : {}));
    }

    const hasPlayoffs = optionalBoolean(body.has_playoffs);
    if (hasPlayoffs !== null) {
      updates.push('has_playoffs = ?');
      params.push(toTinyInt(hasPlayoffs));
    }

    const teamIds = optionalArrayOfStrings(body.team_ids);

    if (updates.length === 0 && teamIds === null) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (updates.length > 0) {
        params.push(request.params.id);
        const [result] = await connection.query<ResultSetHeader>(
          `UPDATE tournaments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
          params,
        );

        if (result.affectedRows === 0) {
          throw new Error('Torneo no encontrado');
        }
      }

      if (teamIds !== null) {
        await replaceTournamentTeams(connection, request.params.id, teamIds);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    sendOk(response, await loadTournamentDetail(request.params.id));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar el torneo');
  }
});

router.get('/tournaments/:id/groups', async (request: Request, response: Response) => {
  try {
    sendOk(response, await loadTournamentGroups(request.params.id));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los grupos');
  }
});

router.post('/tournaments/:id/groups', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear grupos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const name = optionalString(body.name);
    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    await pool.query<ResultSetHeader>(
      'INSERT INTO tournament_groups (id, tournament_id, name, order_num) VALUES (?, ?, ?, ?)',
      [id, request.params.id, name, optionalInteger(body.order_num) ?? 0],
    );

    sendOk(response, (await loadTournamentGroups(request.params.id)).find((group) => group.id === id) ?? null, 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el grupo');
  }
});

router.put('/groups/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar grupos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      updates.push('name = ?');
      params.push(optionalString(body.name));
    }

    if (Object.prototype.hasOwnProperty.call(body, 'order_num')) {
      updates.push('order_num = ?');
      params.push(optionalInteger(body.order_num) ?? 0);
    }

    if (updates.length === 0) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    params.push(request.params.id);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tournament_groups SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Grupo no encontrado', 404);
      return;
    }

    const [rows] = await pool.query<GroupRow[]>(
      'SELECT id, tournament_id, name, order_num, created_at FROM tournament_groups WHERE id = ? LIMIT 1',
      [request.params.id],
    );

    const groups = await loadTournamentGroups(rows[0].tournament_id);
    sendOk(response, groups.find((group) => group.id === request.params.id) ?? null);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar el grupo');
  }
});

router.delete('/groups/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para eliminar grupos', 503);
      return;
    }

    const [rows] = await pool.query<GroupRow[]>(
      'SELECT id, tournament_id, name, order_num, created_at FROM tournament_groups WHERE id = ? LIMIT 1',
      [request.params.id],
    );

    if (rows.length === 0) {
      sendErr(response, 'Grupo no encontrado', 404);
      return;
    }

    await pool.query<ResultSetHeader>('DELETE FROM tournament_group_teams WHERE group_id = ?', [request.params.id]);
    await pool.query<ResultSetHeader>('DELETE FROM tournament_groups WHERE id = ?', [request.params.id]);
    sendOk(response, { deleted: request.params.id, tournament_id: rows[0].tournament_id });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo eliminar el grupo');
  }
});

router.post('/groups/:id/teams', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para agregar equipos a grupos', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const teamId = optionalString(body.team_id);
    if (!teamId) {
      sendErr(response, 'team_id es requerido');
      return;
    }

    const [groupRows] = await pool.query<GroupRow[]>(
      'SELECT id, tournament_id, name, order_num, created_at FROM tournament_groups WHERE id = ? LIMIT 1',
      [request.params.id],
    );

    if (groupRows.length === 0) {
      sendErr(response, 'Grupo no encontrado', 404);
      return;
    }

    const group = groupRows[0];
    const seeding = optionalInteger(body.seeding);

    await pool.query<ResultSetHeader>(
      `INSERT INTO tournament_teams (id, tournament_id, team_id, seeding)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE seeding = COALESCE(VALUES(seeding), seeding)`,
      [crypto.randomUUID(), group.tournament_id, teamId, seeding],
    );

    await pool.query<ResultSetHeader>(
      `INSERT INTO tournament_group_teams (group_id, team_id, seeding)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE seeding = VALUES(seeding)`,
      [request.params.id, teamId, seeding],
    );

    const groups = await loadTournamentGroups(group.tournament_id);
    sendOk(response, groups.find((entry) => entry.id === request.params.id) ?? null, 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo agregar el equipo al grupo');
  }
});

router.delete('/groups/:groupId/teams/:teamId', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para quitar equipos de grupos', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM tournament_group_teams WHERE group_id = ? AND team_id = ?',
      [request.params.groupId, request.params.teamId],
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Equipo no encontrado en el grupo', 404);
      return;
    }

    sendOk(response, { group_id: request.params.groupId, team_id: request.params.teamId, removed: true });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo quitar el equipo del grupo');
  }
});

router.get('/tournaments/:id/standings', async (request: Request, response: Response) => {
  try {
    const groupId = optionalString(request.query.group_id);
    sendOk(response, await loadStandings(request.params.id, groupId));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo cargar la tabla de posiciones');
  }
});

export default router;
