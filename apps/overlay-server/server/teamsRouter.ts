import { Router, type Request, type Response } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import {
  demoCategories,
  demoPlayers,
  demoRosters,
  demoStaff,
  demoTeamCategories,
  demoTeams,
  demoTournamentTeams,
  type DemoCategory,
  type DemoPlayer,
  type DemoStaff,
  type DemoTeam,
} from './editorDemoData';
import { pool } from './db';
import {
  isRecord,
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

interface TeamRow extends RowDataPacket {
  id: string;
  name: string;
  short_name: string;
  abbreviation: string | null;
  logo_asset_id: string | null;
  logo_wordmark_asset_id: string | null;
  logo_alternate_asset_id: string | null;
  city: string | null;
  country: string | null;
  club_id: string | null;
  club_name: string | null;
  club_federated: number | null;
  club_association_id: string | null;
  club_association_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  active: 0 | 1;
  created_at: string | Date;
  updated_at: string | Date;
  category_ids_csv: string | null;
}

interface CategoryRow extends RowDataPacket {
  id: string;
  sport_id: string;
  name: string;
  description: string | null;
  active: 0 | 1;
  created_at: string | Date;
}

interface StaffRow extends RowDataPacket {
  id: string;
  team_id: string;
  tournament_id: string | null;
  name: string;
  role: string;
  photo_asset_id: string | null;
  active: 0 | 1;
  created_at: string | Date;
  updated_at: string | Date;
}

interface PlayerRow extends RowDataPacket {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string;
  team_id: string | null;
  number: string;
  position: string;
  bats: string | null;
  throws: string | null;
  photo_asset_id: string | null;
  photo_action_asset_id: string | null;
  stats: unknown;
  status: string;
  date_of_birth: string | Date | null;
  nationality: string | null;
  gender: string | null;
  // Spec 29 S2 — identificadores externos
  mlbam_id: string | null;
  wbsc_id: string | null;
  ext_ref: unknown;
  created_at: string | Date;
  updated_at: string | Date;
}

interface RosterRow extends RowDataPacket {
  id: string;
  tournament_id: string;
  team_id: string;
  player_id: string;
  number: string;
  position: string;
  batting_slot: number | null;
  status: string;
  joined_date: string | Date | null;
  left_date: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface TeamPayload {
  id: string;
  name: string;
  short_name: string;
  abbreviation: string | null;
  logo_asset_id: string | null;
  logo_wordmark_asset_id: string | null;
  logo_alternate_asset_id: string | null;
  city: string | null;
  country: string | null;
  club_id: string | null;
  club_name: string | null;
  club_federated: boolean;
  club_association_id: string | null;
  club_association_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  category_ids: string[];
}

interface CategoryPayload {
  id: string;
  sport_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

interface StaffPayload {
  id: string;
  team_id: string;
  tournament_id: string | null;
  name: string;
  role: string;
  photo_asset_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface RosterPayload {
  id: string;
  tournament_id: string;
  team_id: string;
  player_id: string;
  number: string;
  position: string;
  batting_slot: number | null;
  status: string;
  joined_date?: string | null;
  left_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface PlayerPayload {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string;
  team_id: string | null;
  number: string;
  position: string;
  bats: string | null;
  throws: string | null;
  photo_asset_id: string | null;
  photo_action_asset_id: string | null;
  stats: Record<string, unknown>;
  status: string;
  date_of_birth: string | null;
  nationality: string | null;
  gender: string | null;
  // Spec 29 S2
  mlbam_id: string | null;
  wbsc_id: string | null;
  ext_ref: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  rosters: RosterPayload[];
}

interface TeamDetailPayload extends TeamPayload {
  categories: CategoryPayload[];
  staff: StaffPayload[];
}

interface TeamMutationBody extends Record<string, unknown> {
  category_ids?: unknown;
  tournament_ids?: unknown;
}

interface PlayerMutationBody extends Record<string, unknown> {
  tournament_id?: unknown;
  batting_slot?: unknown;
  roster_status?: unknown;
  rosters?: unknown;
}

interface StaffMutationBody extends Record<string, unknown> {}

interface NormalizedRosterInput {
  id: string;
  tournament_id: string;
  team_id: string;
  player_id: string;
  number: string;
  position: string;
  batting_slot: number | null;
  status: string;
}

function mapTeam(row: TeamRow | DemoTeam): TeamPayload {
  const r = row as TeamRow;
  return {
    id: row.id,
    name: row.name,
    short_name: row.short_name,
    abbreviation: r.abbreviation ?? null,
    logo_asset_id: row.logo_asset_id,
    logo_wordmark_asset_id: row.logo_wordmark_asset_id,
    logo_alternate_asset_id: row.logo_alternate_asset_id,
    city: row.city,
    country: row.country,
    club_id: r.club_id ?? null,
    club_name: r.club_name ?? null,
    club_federated: Boolean(r.club_federated),
    club_association_id: r.club_association_id ?? null,
    club_association_name: r.club_association_name ?? null,
    primary_color: row.primary_color,
    secondary_color: row.secondary_color,
    founded_year: row.founded_year,
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
    category_ids: r.category_ids_csv ? r.category_ids_csv.split(',').filter(Boolean) : [],
  };
}

function mapCategory(row: CategoryRow | DemoCategory): CategoryPayload {
  return {
    id: row.id,
    sport_id: row.sport_id,
    name: row.name,
    description: row.description,
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
  };
}

function mapStaff(row: StaffRow | DemoStaff): StaffPayload {
  return {
    id: row.id,
    team_id: row.team_id,
    tournament_id: row.tournament_id,
    name: row.name,
    role: row.role,
    photo_asset_id: row.photo_asset_id,
    active: Boolean(row.active),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function mapRoster(row: RosterRow | (typeof demoRosters)[number]): RosterPayload {
  return {
    id: row.id,
    tournament_id: row.tournament_id,
    team_id: row.team_id,
    player_id: row.player_id,
    number: row.number,
    position: row.position,
    batting_slot: row.batting_slot,
    status: row.status,
    joined_date: 'joined_date' in row && row.joined_date ? toIsoString(row.joined_date) : null,
    left_date: 'left_date' in row && row.left_date ? toIsoString(row.left_date) : null,
    created_at: 'created_at' in row ? toIsoString(row.created_at) : undefined,
    updated_at: 'updated_at' in row ? toIsoString(row.updated_at) : undefined,
  };
}

function mapPlayer(row: PlayerRow | DemoPlayer, rosters: RosterPayload[]): PlayerPayload {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    nickname: row.nickname,
    name: row.name,
    team_id: row.team_id,
    number: row.number,
    position: row.position,
    bats: row.bats,
    throws: row.throws,
    photo_asset_id: row.photo_asset_id,
    photo_action_asset_id: row.photo_action_asset_id,
    stats: parseJsonColumn<Record<string, unknown>>(row.stats, {}),
    status: row.status,
    date_of_birth: row.date_of_birth ? toIsoString(row.date_of_birth) : null,
    nationality: row.nationality,
    gender: row.gender,
    // Spec 29 S2 — identificadores externos MLBAM/WBSC
    mlbam_id: ('mlbam_id' in row ? row.mlbam_id : null) ?? null,
    wbsc_id:  ('wbsc_id'  in row ? row.wbsc_id  : null) ?? null,
    ext_ref:  ('ext_ref' in row ? parseJsonColumn<Record<string, string>>(row.ext_ref, {}) : null),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
    rosters,
  };
}

function normalizeRosterInputs(
  body: PlayerMutationBody,
  teamId: string,
  playerId: string,
  fallbackNumber: string,
  fallbackPosition: string,
): NormalizedRosterInput[] {
  const rostersValue = body.rosters;
  if (Array.isArray(rostersValue)) {
    return rostersValue
      .filter(isRecord)
      .map((entry) => {
        const tournamentId = optionalString(entry.tournament_id);
        if (!tournamentId) {
          throw new Error('Cada roster requiere tournament_id');
        }

        return {
          id: optionalString(entry.id) ?? crypto.randomUUID(),
          tournament_id: tournamentId,
          team_id: optionalString(entry.team_id) ?? teamId,
          player_id: playerId,
          number: optionalString(entry.number) ?? fallbackNumber,
          position: optionalString(entry.position) ?? fallbackPosition,
          batting_slot: optionalInteger(entry.batting_slot),
          status: optionalString(entry.status) ?? 'active',
        };
      });
  }

  const tournamentId = optionalString(body.tournament_id);
  if (!tournamentId) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      team_id: teamId,
      player_id: playerId,
      number: optionalString(body.number) ?? fallbackNumber,
      position: optionalString(body.position) ?? fallbackPosition,
      batting_slot: optionalInteger(body.batting_slot),
      status: optionalString(body.roster_status) ?? 'active',
    },
  ];
}

async function replaceTeamCategories(connection: PoolConnection, teamId: string, categoryIds: string[]): Promise<void> {
  await connection.query('DELETE FROM team_categories WHERE team_id = ?', [teamId]);

  for (const categoryId of categoryIds) {
    await connection.query(
      'INSERT INTO team_categories (team_id, category_id) VALUES (?, ?)',
      [teamId, categoryId],
    );
  }
}

async function replaceTeamTournamentAssignments(connection: PoolConnection, teamId: string, tournamentIds: string[]): Promise<void> {
  await connection.query('DELETE FROM tournament_group_teams WHERE team_id = ? AND group_id IN (SELECT id FROM tournament_groups WHERE tournament_id NOT IN (?))', [teamId, tournamentIds.length > 0 ? tournamentIds : ['__none__']]);
  await connection.query('DELETE FROM tournament_teams WHERE team_id = ?', [teamId]);

  for (const tournamentId of tournamentIds) {
    await connection.query(
      `INSERT INTO tournament_teams (id, tournament_id, team_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE tournament_id = VALUES(tournament_id), team_id = VALUES(team_id)`,
      [crypto.randomUUID(), tournamentId, teamId],
    );
  }
}

async function upsertRosterEntries(connection: PoolConnection, rosterEntries: NormalizedRosterInput[]): Promise<void> {
  for (const rosterEntry of rosterEntries) {
    await connection.query(
      `INSERT INTO rosters (id, tournament_id, team_id, player_id, number, position, batting_slot, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         number = VALUES(number),
         position = VALUES(position),
         batting_slot = VALUES(batting_slot),
         status = VALUES(status),
         updated_at = CURRENT_TIMESTAMP(3)`,
      [
        rosterEntry.id,
        rosterEntry.tournament_id,
        rosterEntry.team_id,
        rosterEntry.player_id,
        rosterEntry.number,
        rosterEntry.position,
        rosterEntry.batting_slot,
        rosterEntry.status,
      ],
    );
  }
}

async function loadTeamCategories(teamId: string): Promise<CategoryPayload[]> {
  if (!pool) {
    return demoTeamCategories
      .filter((entry) => entry.team_id === teamId)
      .map((entry) => demoCategories.find((category) => category.id === entry.category_id) ?? null)
      .filter((entry): entry is DemoCategory => entry !== null)
      .map(mapCategory);
  }

  const [rows] = await pool.query<CategoryRow[]>(
    `SELECT c.id, c.sport_id, c.name, c.description, c.active, c.created_at
     FROM team_categories tc
     INNER JOIN categories c ON c.id = tc.category_id
     WHERE tc.team_id = ?
     ORDER BY c.name ASC`,
    [teamId],
  );

  return rows.map(mapCategory);
}

async function loadTeamStaff(teamId: string, tournamentId?: string | null): Promise<StaffPayload[]> {
  if (!pool) {
    return demoStaff
      .filter((entry) => entry.team_id === teamId)
      .filter((entry) => entry.active === 1)
      .filter((entry) => (tournamentId ? entry.tournament_id === tournamentId : true))
      .map(mapStaff);
  }

  const filters = ['team_id = ?', 'active = 1'];
  const params: string[] = [teamId];

  if (tournamentId) {
    filters.push('tournament_id = ?');
    params.push(tournamentId);
  }

  const [rows] = await pool.query<StaffRow[]>(
    `SELECT id, team_id, tournament_id, name, role, photo_asset_id, active, created_at, updated_at
     FROM coaching_staff
     WHERE ${filters.join(' AND ')}
     ORDER BY tournament_id IS NULL DESC, name ASC`,
    params,
  );

  return rows.map(mapStaff);
}

async function loadTeamPlayers(teamId: string, tournamentId?: string | null): Promise<PlayerPayload[]> {
  if (!pool) {
    return demoPlayers
      .filter((player) => player.team_id === teamId && player.status !== 'inactive')
      .map((player) => {
        const rosters = demoRosters
          .filter((roster) => roster.player_id === player.id)
          .filter((roster) => (tournamentId ? roster.tournament_id === tournamentId : true))
          .map(mapRoster);
        return mapPlayer(player, rosters);
      });
  }

  const [playerRows] = await pool.query<PlayerRow[]>(
    `SELECT id, first_name, last_name, nickname, name, team_id, number, position, bats, throws,
            photo_asset_id, photo_action_asset_id, stats, status, date_of_birth, nationality,
            gender, mlbam_id, wbsc_id, ext_ref, created_at, updated_at
     FROM players
     WHERE team_id = ? AND status <> 'inactive'
     ORDER BY CAST(number AS UNSIGNED) ASC, number ASC`,
    [teamId],
  );

  const rosterFilters = ['team_id = ?', "status <> 'inactive'"];
  const rosterParams: string[] = [teamId];
  if (tournamentId) {
    rosterFilters.push('tournament_id = ?');
    rosterParams.push(tournamentId);
  }

  const [rosterRows] = await pool.query<RosterRow[]>(
    `SELECT id, tournament_id, team_id, player_id, number, position, batting_slot, status, joined_date, left_date, created_at, updated_at
     FROM rosters
     WHERE ${rosterFilters.join(' AND ')}
     ORDER BY tournament_id ASC, batting_slot ASC`,
    rosterParams,
  );

  const rosterMap = new Map<string, RosterPayload[]>();
  for (const row of rosterRows) {
    const current = rosterMap.get(row.player_id) ?? [];
    current.push(mapRoster(row));
    rosterMap.set(row.player_id, current);
  }

  return playerRows.map((row) => mapPlayer(row, rosterMap.get(row.id) ?? []));
}

async function loadTeamDetail(teamId: string): Promise<TeamDetailPayload | null> {
  if (!pool) {
    const team = demoTeams.find((entry) => entry.id === teamId && entry.active === 1);
    if (!team) {
      return null;
    }

    return {
      ...mapTeam(team),
      categories: await loadTeamCategories(teamId),
      staff: await loadTeamStaff(teamId),
    };
  }

    const [rows] = await pool.query<TeamRow[]>(
      `SELECT t.id, t.name, t.short_name, t.abbreviation, t.logo_asset_id, t.logo_wordmark_asset_id, t.logo_alternate_asset_id,
              t.city, t.country, t.club_id, c.name AS club_name, c.federated AS club_federated,
              c.association_id AS club_association_id, a.name AS club_association_name,
              t.primary_color, t.secondary_color, t.founded_year, t.active, t.created_at, t.updated_at,
              (SELECT GROUP_CONCAT(tc2.category_id SEPARATOR ',') FROM team_categories tc2 WHERE tc2.team_id = t.id) AS category_ids_csv
       FROM teams t
       LEFT JOIN clubs c ON c.id = t.club_id
       LEFT JOIN associations a ON a.id = c.association_id
       WHERE t.id = ? AND t.active = 1
       LIMIT 1`,
      [teamId],
    );

  if (rows.length === 0) {
    return null;
  }

  return {
    ...mapTeam(rows[0]),
    categories: await loadTeamCategories(teamId),
    staff: await loadTeamStaff(teamId),
  };
}

const router = Router();

router.get('/teams', async (request: Request, response: Response) => {
  try {
    const categoryId = optionalString(request.query.category_id);
    const tournamentId = optionalString(request.query.tournament_id);

    if (!pool) {
      const items = demoTeams
        .filter((team) => team.active === 1)
        .filter((team) => (categoryId ? demoTeamCategories.some((entry) => entry.team_id === team.id && entry.category_id === categoryId) : true))
        .filter((team) => (tournamentId ? demoTournamentTeams.some((entry) => entry.team_id === team.id && entry.tournament_id === tournamentId) : true))
        .map(mapTeam);
      sendOk(response, items);
      return;
    }

    const joins: string[] = [];
    const filters = ['t.active = 1'];
    const params: string[] = [];

    if (categoryId) {
      joins.push('INNER JOIN team_categories tc ON tc.team_id = t.id');
      filters.push('tc.category_id = ?');
      params.push(categoryId);
    }

    if (tournamentId) {
      joins.push('INNER JOIN tournament_teams tt ON tt.team_id = t.id');
      filters.push('tt.tournament_id = ?');
      params.push(tournamentId);
    }

    const [rows] = await pool.query<TeamRow[]>(
      `SELECT DISTINCT t.id, t.name, t.short_name, t.abbreviation, t.logo_asset_id, t.logo_wordmark_asset_id,
              t.logo_alternate_asset_id, t.city, t.country, t.club_id,
              c.name AS club_name, c.federated AS club_federated,
              c.association_id AS club_association_id, a.name AS club_association_name,
              t.primary_color, t.secondary_color, t.founded_year, t.active, t.created_at, t.updated_at,
              (SELECT GROUP_CONCAT(tc2.category_id SEPARATOR ',') FROM team_categories tc2 WHERE tc2.team_id = t.id) AS category_ids_csv
       FROM teams t
       LEFT JOIN clubs c ON c.id = t.club_id
       LEFT JOIN associations a ON a.id = c.association_id
       ${joins.join(' ')}
       WHERE ${filters.join(' AND ')}
       ORDER BY t.name ASC`,
      params,
    );

    sendOk(response, rows.map(mapTeam));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los equipos');
  }
});

router.get('/teams/:id', async (request: Request, response: Response) => {
  try {
    const detail = await loadTeamDetail(request.params.id);
    if (!detail) {
      sendErr(response, 'Equipo no encontrado', 404);
      return;
    }

    sendOk(response, detail);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo cargar el equipo');
  }
});

router.post('/teams', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear equipos', 503);
      return;
    }

    const body = request.body as TeamMutationBody;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const name = optionalString(body.name);
    const shortName = optionalString(body.short_name);
    const categoryIds = optionalArrayOfStrings(body.category_ids) ?? [];
    const tournamentIds = optionalArrayOfStrings(body.tournament_ids) ?? [];

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    if (!shortName) {
      sendErr(response, 'short_name es requerido');
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query<ResultSetHeader>(
        `INSERT INTO teams (
          id, name, short_name, abbreviation, logo_asset_id, logo_wordmark_asset_id, logo_alternate_asset_id,
          city, country, club_id, primary_color, secondary_color, founded_year, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          shortName,
          optionalString(body.abbreviation)?.slice(0, 4).toUpperCase() ?? null,
          optionalString(body.logo_asset_id),
          optionalString(body.logo_wordmark_asset_id),
          optionalString(body.logo_alternate_asset_id),
          optionalString(body.city),
          optionalString(body.country) ?? 'DO',
          optionalString(body.club_id) ?? null,
          optionalString(body.primary_color),
          optionalString(body.secondary_color),
          optionalInteger(body.founded_year),
          toTinyInt(optionalBoolean(body.active) ?? true),
        ],
      );

      if (categoryIds.length > 0) {
        await replaceTeamCategories(connection, id, categoryIds);
      }

      if (tournamentIds.length > 0) {
        await replaceTeamTournamentAssignments(connection, id, tournamentIds);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const detail = await loadTeamDetail(id);
    sendOk(response, detail, 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el equipo');
  }
});

router.put('/teams/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar equipos', 503);
      return;
    }

    const body = request.body as TeamMutationBody;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    const stringFields: Array<[keyof TeamMutationBody, string]> = [
      ['name', 'name'],
      ['short_name', 'short_name'],
      ['abbreviation', 'abbreviation'],
      ['logo_asset_id', 'logo_asset_id'],
      ['logo_wordmark_asset_id', 'logo_wordmark_asset_id'],
      ['logo_alternate_asset_id', 'logo_alternate_asset_id'],
      ['city', 'city'],
      ['country', 'country'],
      ['club_id', 'club_id'],
      ['primary_color', 'primary_color'],
      ['secondary_color', 'secondary_color'],
    ];

    for (const [field, column] of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates.push(`${column} = ?`);
        params.push(optionalString(body[field]));
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'founded_year')) {
      updates.push('founded_year = ?');
      params.push(optionalInteger(body.founded_year));
    }

    const active = optionalBoolean(body.active);
    if (active !== null) {
      updates.push('active = ?');
      params.push(toTinyInt(active));
    }

    const categoryIds = optionalArrayOfStrings(body.category_ids);
    const tournamentIds = optionalArrayOfStrings(body.tournament_ids);

    if (updates.length === 0 && categoryIds === null && tournamentIds === null) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (updates.length > 0) {
        params.push(request.params.id);
        const [result] = await connection.query<ResultSetHeader>(
          `UPDATE teams SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
          params,
        );

        if (result.affectedRows === 0) {
          throw new Error('Equipo no encontrado');
        }
      }

      if (categoryIds !== null) {
        await replaceTeamCategories(connection, request.params.id, categoryIds);
      }

      if (tournamentIds !== null) {
        await replaceTeamTournamentAssignments(connection, request.params.id, tournamentIds);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const detail = await loadTeamDetail(request.params.id);
    if (!detail) {
      sendErr(response, 'Equipo no encontrado', 404);
      return;
    }

    sendOk(response, detail);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar el equipo');
  }
});

router.delete('/teams/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para desactivar equipos', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE teams SET active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [request.params.id],
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Equipo no encontrado', 404);
      return;
    }

    sendOk(response, { id: request.params.id, active: false });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo desactivar el equipo');
  }
});

router.get('/teams/:id/players', async (request: Request, response: Response) => {
  try {
    const tournamentId = optionalString(request.query.tournament_id);
    const players = await loadTeamPlayers(request.params.id, tournamentId);
    sendOk(response, players);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar los jugadores');
  }
});

router.post('/teams/:id/players', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear jugadores', 503);
      return;
    }

    const body = request.body as PlayerMutationBody;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const name = optionalString(body.name);
    const number = optionalString(body.number);
    const position = optionalString(body.position);

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    if (!number) {
      sendErr(response, 'number es requerido');
      return;
    }

    if (!position) {
      sendErr(response, 'position es requerido');
      return;
    }

    const rosterEntries = normalizeRosterInputs(body, request.params.id, id, number, position);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query<ResultSetHeader>(
        `INSERT INTO players (
          id, first_name, last_name, nickname, name, team_id, number, position, bats, throws,
          photo_asset_id, photo_action_asset_id, stats, status, date_of_birth, nationality, gender
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          optionalString(body.first_name),
          optionalString(body.last_name),
          optionalString(body.nickname),
          name,
          request.params.id,
          number,
          position,
          optionalString(body.bats),
          optionalString(body.throws),
          optionalString(body.photo_asset_id),
          optionalString(body.photo_action_asset_id),
          JSON.stringify(isRecord(body.stats) ? body.stats : {}),
          optionalString(body.status) ?? 'active',
          optionalString(body.date_of_birth),
          optionalString(body.nationality) ?? 'DO',
          optionalString(body.gender) ?? 'male',
        ],
      );

      await upsertRosterEntries(connection, rosterEntries);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const players = await loadTeamPlayers(request.params.id);
    const created = players.find((player) => player.id === id) ?? null;
    sendOk(response, created, 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el jugador');
  }
});

router.put('/players/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar jugadores', 503);
      return;
    }

    const body = request.body as PlayerMutationBody;
    const [existingRows] = await pool.query<PlayerRow[]>(
      `SELECT id, first_name, last_name, nickname, name, team_id, number, position, bats, throws,
              photo_asset_id, photo_action_asset_id, stats, status, date_of_birth, nationality,
              gender, created_at, updated_at
       FROM players WHERE id = ? LIMIT 1`,
      [request.params.id],
    );

    const existing = existingRows[0];
    const existingTeamId = existing?.team_id;

    if (!existing || !existingTeamId) {
      sendErr(response, 'Jugador no encontrado', 404);
      return;
    }
    const updates: string[] = [];
    const params: Array<string | number | null> = [];
    const stringFields: Array<[keyof PlayerMutationBody, string]> = [
      ['first_name', 'first_name'],
      ['last_name', 'last_name'],
      ['nickname', 'nickname'],
      ['name', 'name'],
      ['number', 'number'],
      ['position', 'position'],
      ['bats', 'bats'],
      ['throws', 'throws'],
      ['photo_asset_id', 'photo_asset_id'],
      ['photo_action_asset_id', 'photo_action_asset_id'],
      ['status', 'status'],
      ['date_of_birth', 'date_of_birth'],
      ['nationality', 'nationality'],
      ['gender', 'gender'],
    ];

    for (const [field, column] of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates.push(`${column} = ?`);
        params.push(optionalString(body[field]));
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'stats')) {
      updates.push('stats = ?');
      params.push(JSON.stringify(isRecord(body.stats) ? body.stats : {}));
    }

    const fallbackNumber = optionalString(body.number) ?? existing.number;
    const fallbackPosition = optionalString(body.position) ?? existing.position;
    const rosterEntries = normalizeRosterInputs(body, existingTeamId, request.params.id, fallbackNumber, fallbackPosition);

    if (updates.length === 0 && rosterEntries.length === 0) {
      sendErr(response, 'No hay cambios para aplicar');
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (updates.length > 0) {
        params.push(request.params.id);
        await connection.query<ResultSetHeader>(
          `UPDATE players SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
          params,
        );
      }

      await upsertRosterEntries(connection, rosterEntries);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const players = await loadTeamPlayers(existingTeamId);
    const updated = players.find((player) => player.id === request.params.id) ?? null;
    sendOk(response, updated);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar el jugador');
  }
});

router.delete('/players/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para desactivar jugadores', 503);
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [playerResult] = await connection.query<ResultSetHeader>(
        `UPDATE players SET status = 'inactive', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [request.params.id],
      );

      if (playerResult.affectedRows === 0) {
        throw new Error('Jugador no encontrado');
      }

      await connection.query<ResultSetHeader>(
        `UPDATE rosters SET status = 'inactive', updated_at = CURRENT_TIMESTAMP(3) WHERE player_id = ?`,
        [request.params.id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    sendOk(response, { id: request.params.id, status: 'inactive' });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo desactivar el jugador');
  }
});

router.get('/teams/:id/staff', async (request: Request, response: Response) => {
  try {
    const tournamentId = optionalString(request.query.tournament_id);
    const staff = await loadTeamStaff(request.params.id, tournamentId);
    sendOk(response, staff);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo listar el cuerpo técnico');
  }
});

router.post('/teams/:id/staff', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para crear staff', 503);
      return;
    }

    const body = request.body as StaffMutationBody;
    const id = optionalString(body.id) ?? crypto.randomUUID();
    const name = optionalString(body.name);
    const role = optionalString(body.role);

    if (!name) {
      sendErr(response, 'name es requerido');
      return;
    }

    if (!role) {
      sendErr(response, 'role es requerido');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO coaching_staff (id, team_id, tournament_id, name, role, photo_asset_id, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.params.id,
        optionalString(body.tournament_id),
        name,
        role,
        optionalString(body.photo_asset_id),
        toTinyInt(optionalBoolean(body.active) ?? true),
      ],
    );

    const [rows] = await pool.query<StaffRow[]>(
      `SELECT id, team_id, tournament_id, name, role, photo_asset_id, active, created_at, updated_at
       FROM coaching_staff WHERE id = ? LIMIT 1`,
      [id],
    );

    sendOk(response, mapStaff(rows[0]), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo crear el miembro del staff');
  }
});

router.put('/staff/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para editar staff', 503);
      return;
    }

    const body = request.body as StaffMutationBody;
    const updates: string[] = [];
    const params: Array<string | number | null> = [];
    const stringFields: Array<[keyof StaffMutationBody, string]> = [
      ['tournament_id', 'tournament_id'],
      ['name', 'name'],
      ['role', 'role'],
      ['photo_asset_id', 'photo_asset_id'],
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
      `UPDATE coaching_staff SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      params,
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Miembro del staff no encontrado', 404);
      return;
    }

    const [rows] = await pool.query<StaffRow[]>(
      `SELECT id, team_id, tournament_id, name, role, photo_asset_id, active, created_at, updated_at
       FROM coaching_staff WHERE id = ? LIMIT 1`,
      [request.params.id],
    );

    sendOk(response, mapStaff(rows[0]));
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo actualizar el staff');
  }
});

router.delete('/staff/:id', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para eliminar staff', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE coaching_staff SET active = 0, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
      [request.params.id],
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Miembro del staff no encontrado', 404);
      return;
    }

    sendOk(response, { id: request.params.id, active: false });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo eliminar el staff');
  }
});

router.get('/teams/:id/categories', async (request: Request, response: Response) => {
  try {
    const categories = await loadTeamCategories(request.params.id);
    sendOk(response, categories);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudieron listar las categorías del equipo');
  }
});

router.post('/teams/:id/categories', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para asignar categorías', 503);
      return;
    }

    const body = request.body as Record<string, unknown>;
    const categoryId = optionalString(body.category_id);
    if (!categoryId) {
      sendErr(response, 'category_id es requerido');
      return;
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO team_categories (team_id, category_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE category_id = VALUES(category_id)`,
      [request.params.id, categoryId],
    );

    sendOk(response, await loadTeamCategories(request.params.id), 201);
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo asignar la categoría');
  }
});

router.delete('/teams/:teamId/categories/:categoryId', async (request: Request, response: Response) => {
  try {
    if (!pool) {
      sendErr(response, 'DB no disponible para desasignar categorías', 503);
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM team_categories WHERE team_id = ? AND category_id = ?',
      [request.params.teamId, request.params.categoryId],
    );

    if (result.affectedRows === 0) {
      sendErr(response, 'Asignación de categoría no encontrada', 404);
      return;
    }

    sendOk(response, { team_id: request.params.teamId, category_id: request.params.categoryId, removed: true });
  } catch (error) {
    sendCaughtError(response, error, 'No se pudo desasignar la categoría');
  }
});

export default router;
