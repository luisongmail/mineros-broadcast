export type Category = {
  id: string;
  name: string;
  description: string;
  sportId: string;
  ageMin: number | null;
  ageMax: number | null;
  active: boolean;
};

export type Team = {
  id: string;
  fullName: string;
  shortName: string;
  abbreviation: string;
  city: string;
  country: string;
  clubId: string;
  clubName: string;
  clubFederated: boolean;
  clubAssociationId: string;
  clubAssociationName: string;
  primaryColor: string;
  secondaryColor: string;
  logoAssetId: string;
  categoryId: string;   // Una sola categoría por equipo
};

export type Player = {
  id: string;
  fullName: string;
  nickname: string;
  number: string;
  position: string;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R' | 'S';
  photoAssetId: string;
  birthDate: string;
  nationality: string;
  status: 'active' | 'inactive';
};

export type StaffRole = 'manager' | 'coach_bateo' | 'coach_bases' | 'pitcher_coach' | 'utilero' | 'otro';

export type StaffMember = {
  id: string;
  name: string;
  number?: string;
  role: StaffRole;
  photoAssetId: string;
};

export type League = {
  id: string;
  name: string;
  shortName: string;
  country: string;
  logoAssetId: string;
  active: boolean;
};

export type TournamentGroup = {
  id: string;
  name: string;
  teamIds: string[];
};

export type TournamentStanding = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
  runsAllowed: number;
  runsScored: number;
  runDiff: number;
};

export type Tournament = {
  id: string;
  name: string;
  shortName: string;
  type: string;
  season: string;
  leagueId: string;
  categoryId: string;
  structureType: 'round_robin' | 'single_elimination' | 'group_stage' | 'exhibition';
  roundRobinRounds: number;
  hasPlayoffs: boolean;
  playoffFormat: '' | 'semifinal_final' | 'quarterfinal_semi_final';
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'finished';
  groups: TournamentGroup[];
  standings: TournamentStanding[];
};

export type Sponsor = {
  id: string;
  name: string;
  brand: string;
  logoAssetId: string;
  priority: number;
  status: 'draft' | 'active' | 'paused' | 'ended';
  startDate: string;
  endDate: string;
  active: boolean;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}

export function normalizeCategory(value: unknown): Category {
  const raw = (value ?? {}) as Record<string, unknown>;
  const ageMin = raw.ageMin ?? raw.age_min;
  const ageMax = raw.ageMax ?? raw.age_max;
  return {
    id: asString(raw.id, asString(raw.category_id, '')),
    name: asString(raw.name),
    description: asString(raw.description),
    sportId: asString(raw.sportId, asString(raw.sport_id, 'baseball')),
    ageMin: ageMin !== null && ageMin !== undefined ? Number(ageMin) : null,
    ageMax: ageMax !== null && ageMax !== undefined ? Number(ageMax) : null,
    active: asBoolean(raw.active, true),
  };
}

export function normalizeTeam(value: unknown): Team {
  const raw = (value ?? {}) as Record<string, unknown>;
  const rawCategories = Array.isArray(raw.categoryIds)
    ? raw.categoryIds
    : Array.isArray(raw.category_ids)
      ? raw.category_ids
      : Array.isArray(raw.categories)
        ? raw.categories.map((item) => {
            if (typeof item === 'string') return item;
            const entry = item as Record<string, unknown>;
            return asString(entry.id, asString(entry.categoryId, asString(entry.category_id, '')));
          })
        : [];

  const validCategories = rawCategories.filter((item): item is string => typeof item === 'string' && item.length > 0);

  return {
    id: asString(raw.id, asString(raw.team_id, '')),
    fullName: asString(raw.fullName, asString(raw.full_name, asString(raw.name, ''))),
    shortName: asString(raw.shortName, asString(raw.short_name, '')),
    abbreviation: asString(raw.abbreviation, asString(raw.abbr, '')),
    city: asString(raw.city),
    country: asString(raw.country),
    clubId: asString(raw.clubId, asString(raw.club_id, '')),
    clubName: asString(raw.clubName, asString(raw.club_name, '')),
    clubFederated: Boolean(raw.clubFederated ?? raw.club_federated ?? false),
    clubAssociationId: asString(raw.clubAssociationId, asString(raw.club_association_id, '')),
    clubAssociationName: asString(raw.clubAssociationName, asString(raw.club_association_name, '')),
    primaryColor: asString(raw.primaryColor, asString(raw.primary_color, '#D71920')),
    secondaryColor: asString(raw.secondaryColor, asString(raw.secondary_color, '#1B2F5B')),
    logoAssetId: asString(raw.logoAssetId, asString(raw.logo_asset_id, '')),
    categoryId: validCategories[0] ?? '',
  };
}

export function normalizePlayer(value: unknown): Player {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id, asString(raw.player_id, '')),
    fullName: asString(raw.fullName, asString(raw.full_name, asString(raw.name, ''))),
    nickname: asString(raw.nickname, asString(raw.nick_name, '')),
    number: asString(raw.number),
    position: asString(raw.position, 'UT'),
    bats: asString(raw.bats, 'R') as Player['bats'],
    throws: asString(raw.throws, asString(raw.throwing_hand, 'R')) as Player['throws'],
    photoAssetId: asString(raw.photoAssetId, asString(raw.photo_asset_id, '')),
    birthDate: asString(raw.birthDate, asString(raw.birth_date, '')),
    nationality: asString(raw.nationality),
    status: asString(raw.status, 'active') as Player['status'],
  };
}

export function normalizeStaffMember(value: unknown): StaffMember {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id, asString(raw.staff_id, '')),
    name: asString(raw.name, asString(raw.full_name, '')),
    number: asString(raw.number, ''),
    role: asString(raw.role, 'otro') as StaffRole,
    photoAssetId: asString(raw.photoAssetId, asString(raw.photo_asset_id, '')),
  };
}

export function normalizeLeague(value: unknown): League {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id, asString(raw.league_id, '')),
    name: asString(raw.name),
    shortName: asString(raw.shortName, asString(raw.short_name, '')),
    country: asString(raw.country),
    logoAssetId: asString(raw.logoAssetId, asString(raw.logo_asset_id, '')),
    active: asBoolean(raw.active, true),
  };
}

export function normalizeTournament(value: unknown): Tournament {
  const raw = (value ?? {}) as Record<string, unknown>;
  const groups = Array.isArray(raw.groups)
    ? raw.groups.map((entry) => {
        const item = entry as Record<string, unknown>;
        const teamIds = Array.isArray(item.teamIds)
          ? item.teamIds
          : Array.isArray(item.team_ids)
            ? item.team_ids
            : Array.isArray(item.teams)
              ? item.teams.map((team) => {
                  if (typeof team === 'string') return team;
                  const teamRecord = team as Record<string, unknown>;
                  return asString(teamRecord.id, asString(teamRecord.team_id, ''));
                })
              : [];
        return {
          id: asString(item.id, asString(item.group_id, '')),
          name: asString(item.name),
          teamIds: teamIds.filter((teamId): teamId is string => typeof teamId === 'string' && teamId.length > 0),
        };
      })
    : [];

  const standings = Array.isArray(raw.standings)
    ? raw.standings.map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          teamId: asString(item.teamId, asString(item.team_id, '')),
          wins: asNumber(item.wins, asNumber(item.jg, 0)),
          losses: asNumber(item.losses, asNumber(item.jp, 0)),
          ties: asNumber(item.ties, asNumber(item.je, 0)),
          pct: asNumber(item.pct, 0),
          runsAllowed: asNumber(item.runsAllowed, asNumber(item.ra, 0)),
          runsScored: asNumber(item.runsScored, asNumber(item.rc, 0)),
          runDiff: asNumber(item.runDiff, asNumber(item.dif, 0)),
        };
      })
    : [];

  return {
    id: asString(raw.id, asString(raw.tournament_id, '')),
    name: asString(raw.name),
    shortName: asString(raw.shortName, asString(raw.short_name, '')),
    type: asString(raw.type, 'league'),
    season: asString(raw.season, ''),
    leagueId: asString(raw.leagueId, asString(raw.league_id, '')),
    categoryId: asString(raw.categoryId, asString(raw.category_id, '')),
    structureType: asString(raw.structureType, asString(raw.structure_type, 'round_robin')) as Tournament['structureType'],
    roundRobinRounds: asNumber(raw.roundRobinRounds, asNumber(raw.round_robin_rounds, 1)),
    hasPlayoffs: asBoolean(raw.hasPlayoffs, asBoolean(raw.has_playoffs, false)),
    playoffFormat: asString(raw.playoffFormat, asString(raw.playoff_format, '')) as Tournament['playoffFormat'],
    startDate: asString(raw.startDate, asString(raw.start_date, '')),
    endDate: asString(raw.endDate, asString(raw.end_date, '')),
    status: asString(raw.status, 'upcoming') as Tournament['status'],
    groups,
    standings,
  };
}

export function normalizeSponsor(value: unknown): Sponsor {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    id: asString(raw.id, asString(raw.sponsor_id, '')),
    name: asString(raw.name),
    brand: asString(raw.brand),
    logoAssetId: asString(raw.logoAssetId, asString(raw.assetId, asString(raw.asset_id, asString(raw.logo_asset_id, '')))),
    priority: asNumber(raw.priority, 1),
    status: asString(raw.status, 'draft') as Sponsor['status'],
    startDate: asString(raw.startDate, asString(raw.start_date, '')),
    endDate: asString(raw.endDate, asString(raw.end_date, '')),
    active: asBoolean(raw.active, true),
  };
}
