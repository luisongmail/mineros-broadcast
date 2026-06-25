export interface DemoCategory {
  id: string;
  sport_id: string;
  name: string;
  description: string | null;
  active: number;
  created_at: string;
}

export interface DemoTeam {
  id: string;
  name: string;
  short_name: string;
  logo_asset_id: string | null;
  logo_wordmark_asset_id: string | null;
  logo_alternate_asset_id: string | null;
  city: string | null;
  country: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  founded_year: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface DemoPlayer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string;
  team_id: string;
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
  created_at: string;
  updated_at: string;
}

export interface DemoStaff {
  id: string;
  team_id: string;
  tournament_id: string | null;
  name: string;
  role: string;
  photo_asset_id: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface DemoLeague {
  id: string;
  sport_id: string;
  name: string;
  short_name: string | null;
  country: string;
  level: string | null;
  logo_asset_id: string | null;
  banner_asset_id: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface DemoTournament {
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
  has_playoffs: number;
  playoff_format: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoTournamentGroup {
  id: string;
  tournament_id: string;
  name: string;
  order_num: number;
  created_at: string;
}

export interface DemoTournamentGroupTeam {
  group_id: string;
  team_id: string;
  seeding: number | null;
}

export interface DemoStanding {
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
}

export interface DemoSponsor {
  id: string;
  name: string;
  brand: string;
  asset_id: string | null;
  status: string;
  priority: number;
  weight: number;
  allowed_placements: string[];
  start_date: string | null;
  end_date: string | null;
  exposure_limits: Record<string, unknown>;
  blackout_rules: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DemoPitch {
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

export interface DemoGameEvent {
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

export const demoCategories: DemoCategory[] = [
  // Pequeñas Ligas
  { id: 'cat-pb-tball',    sport_id: 'baseball_m', name: 'T-Ball',         description: 'Iniciación, 4-6 años',           active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pb-novato',   sport_id: 'baseball_m', name: 'Novato',         description: 'División Novato, 6-8 años',       active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pb-menor',    sport_id: 'baseball_m', name: 'Pequeñas Ligas', description: 'División principal, 9-12 años',   active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pb-junior',   sport_id: 'baseball_m', name: 'Junior',         description: 'División Junior, 13-14 años',     active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pb-senior',   sport_id: 'baseball_m', name: 'Senior',         description: 'División Senior, 15-16 años',     active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pb-biglearn', sport_id: 'baseball_m', name: 'Big League',     description: 'División Big League, 16-18 años', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  // Pony League
  { id: 'cat-pony-shetland',  sport_id: 'baseball_m', name: 'Shetland',  description: 'Pony League, 5-6 años',   active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pony-pony',      sport_id: 'baseball_m', name: 'Pony',      description: 'Pony League, 13-14 años', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pony-colt',      sport_id: 'baseball_m', name: 'Colt',      description: 'Pony League, 15-16 años', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pony-palomino',  sport_id: 'baseball_m', name: 'Palomino',  description: 'Pony League, 17-18 años', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-pony-thorobred', sport_id: 'baseball_m', name: 'Thorobred', description: 'Pony League, 19-22 años', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  // Federado Béisbol Masculino
  { id: 'cat-fed-bm-sub15',  sport_id: 'baseball_m', name: 'Sub-15', description: 'Béisbol Federado Masculino Sub-15', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bm-sub18',  sport_id: 'baseball_m', name: 'Sub-18', description: 'Béisbol Federado Masculino Sub-18', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bm-sub23',  sport_id: 'baseball_m', name: 'Sub-23', description: 'Béisbol Federado Masculino Sub-23', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bm-adulto', sport_id: 'baseball_m', name: 'Adulto', description: 'Béisbol Federado Masculino Adulto', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bm-master', sport_id: 'baseball_m', name: 'Máster', description: 'Béisbol Federado Masculino Máster', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  // Federado Béisbol Femenino
  { id: 'cat-fed-bf-sub15',  sport_id: 'baseball_f', name: 'Sub-15', description: 'Béisbol Federado Femenino Sub-15', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bf-sub18',  sport_id: 'baseball_f', name: 'Sub-18', description: 'Béisbol Federado Femenino Sub-18', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bf-sub23',  sport_id: 'baseball_f', name: 'Sub-23', description: 'Béisbol Federado Femenino Sub-23', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bf-adulto', sport_id: 'baseball_f', name: 'Adulto', description: 'Béisbol Federado Femenino Adulto', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-bf-master', sport_id: 'baseball_f', name: 'Máster', description: 'Béisbol Federado Femenino Máster', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  // Federado Softball Femenino
  { id: 'cat-fed-sf-sub15',  sport_id: 'softball_fast_f', name: 'Sub-15', description: 'Softball Federado Femenino Sub-15', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sf-sub18',  sport_id: 'softball_fast_f', name: 'Sub-18', description: 'Softball Federado Femenino Sub-18', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sf-sub23',  sport_id: 'softball_fast_f', name: 'Sub-23', description: 'Softball Federado Femenino Sub-23', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sf-adulto', sport_id: 'softball_fast_f', name: 'Adulto', description: 'Softball Federado Femenino Adulto', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sf-master', sport_id: 'softball_fast_f', name: 'Máster', description: 'Softball Federado Femenino Máster', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  // Federado Softball Masculino
  { id: 'cat-fed-sm-sub15',  sport_id: 'softball_fast_m', name: 'Sub-15', description: 'Softball Federado Masculino Sub-15', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sm-sub18',  sport_id: 'softball_fast_m', name: 'Sub-18', description: 'Softball Federado Masculino Sub-18', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sm-sub23',  sport_id: 'softball_fast_m', name: 'Sub-23', description: 'Softball Federado Masculino Sub-23', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sm-adulto', sport_id: 'softball_fast_m', name: 'Adulto', description: 'Softball Federado Masculino Adulto', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-fed-sm-master', sport_id: 'softball_fast_m', name: 'Máster', description: 'Softball Federado Masculino Máster', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  // Béisbol5
  { id: 'cat-b5-sub14',  sport_id: 'baseball5', name: 'Sub-14', description: 'Béisbol5 Sub-14', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-b5-sub17',  sport_id: 'baseball5', name: 'Sub-17', description: 'Béisbol5 Sub-17', active: 1, created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'cat-b5-adulto', sport_id: 'baseball5', name: 'Adulto', description: 'Béisbol5 Adulto',  active: 1, created_at: '2026-01-10T12:00:00.000Z' },
];

export const demoTeams: DemoTeam[] = [
  {
    id: 'team-mineros',
    name: 'Mineros de Santiago',
    short_name: 'MIN',
    logo_asset_id: 'asset-mineros-logo',
    logo_wordmark_asset_id: 'asset-mineros-wordmark',
    logo_alternate_asset_id: null,
    city: 'Santiago',
    country: 'DO',
    primary_color: '#D71920',
    secondary_color: '#1B2F5B',
    founded_year: 2018,
    active: 1,
    created_at: '2026-01-10T12:10:00.000Z',
    updated_at: '2026-01-10T12:10:00.000Z',
  },
  {
    id: 'team-aguilas-cibao-demo',
    name: 'Águilas del Cibao Demo',
    short_name: 'AGD',
    logo_asset_id: 'asset-aguilas-logo',
    logo_wordmark_asset_id: null,
    logo_alternate_asset_id: null,
    city: 'Santiago',
    country: 'DO',
    primary_color: '#D4AF37',
    secondary_color: '#0D0D0D',
    founded_year: 2020,
    active: 1,
    created_at: '2026-01-10T12:15:00.000Z',
    updated_at: '2026-01-10T12:15:00.000Z',
  },
  // Equipos del juego demo activo (deben coincidir con gameConfig.ts DEMO_HOME_TEAM / DEMO_AWAY_TEAM)
  {
    id: 'team-chile',
    name: 'Team Chile',
    short_name: 'CHI',
    logo_asset_id: 'teams/teamchile-logo',
    logo_wordmark_asset_id: null,
    logo_alternate_asset_id: null,
    city: 'Santiago',
    country: 'CL',
    primary_color: '#C8102E',
    secondary_color: '#003580',
    founded_year: null,
    active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'team-guerreras',
    name: 'Las Guerreras',
    short_name: 'GUE',
    logo_asset_id: 'teams/guerreras-logo',
    logo_wordmark_asset_id: null,
    logo_alternate_asset_id: null,
    city: 'Santiago',
    country: 'DO',
    primary_color: '#D71920',
    secondary_color: '#1B2F5B',
    founded_year: null,
    active: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const demoTeamCategories = [
  { team_id: 'team-mineros', category_id: 'cat-fed-bm-sub18' },
  { team_id: 'team-mineros', category_id: 'cat-fed-bm-adulto' },
  { team_id: 'team-aguilas-cibao-demo', category_id: 'cat-fed-bm-adulto' },
  { team_id: 'team-chile', category_id: 'cat-fed-bm-adulto' },
  { team_id: 'team-guerreras', category_id: 'cat-fed-bm-adulto' },
];

export const demoPlayers: DemoPlayer[] = [
  {
    id: 'player-rivera-9',
    first_name: 'José',
    last_name: 'Rivera',
    nickname: 'Pepe',
    name: 'José Rivera',
    team_id: 'team-mineros',
    number: '9',
    position: 'CF',
    bats: 'R',
    throws: 'R',
    photo_asset_id: null,
    photo_action_asset_id: null,
    stats: { avg: 0.347 },
    status: 'active',
    date_of_birth: '2004-08-12',
    nationality: 'DO',
    gender: 'male',
    created_at: '2026-01-10T12:20:00.000Z',
    updated_at: '2026-01-10T12:20:00.000Z',
  },
  {
    id: 'player-mendez-18',
    first_name: 'Luis',
    last_name: 'Méndez',
    nickname: null,
    name: 'Luis Méndez',
    team_id: 'team-mineros',
    number: '18',
    position: 'P',
    bats: 'L',
    throws: 'L',
    photo_asset_id: null,
    photo_action_asset_id: null,
    stats: { era: 2.41 },
    status: 'active',
    date_of_birth: '2002-02-20',
    nationality: 'DO',
    gender: 'male',
    created_at: '2026-01-10T12:21:00.000Z',
    updated_at: '2026-01-10T12:21:00.000Z',
  },
  // Jugadoras del juego demo activo — Team Chile
  { id: 'player-chi-01', first_name: 'Constanza', last_name: 'Aguilera', nickname: null, name: 'Constanza Aguilera', team_id: 'team-chile', number: '3', position: '1B', bats: 'R', throws: 'R', photo_asset_id: 'players/chi-p-01-constanza-aguilera', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'CL', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-chi-02', first_name: 'Florencia', last_name: 'Honorato', nickname: null, name: 'Florencia Honorato', team_id: 'team-chile', number: '5', position: 'DP', bats: 'R', throws: 'R', photo_asset_id: 'players/chi-p-02-florencia-honorato', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'CL', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-chi-03', first_name: 'Daniela', last_name: 'De Oliveira', nickname: null, name: 'Daniela De Oliveira', team_id: 'team-chile', number: '6', position: 'SS', bats: 'R', throws: 'R', photo_asset_id: 'players/chi-p-03-daniela-deoliveira', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'CL', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-chi-06', first_name: 'Martina', last_name: 'Pellizaris', nickname: null, name: 'Martina Pellizaris', team_id: 'team-chile', number: '16', position: '3B', bats: 'R', throws: 'R', photo_asset_id: 'players/chi-p-07-martina-pellizaris', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'CL', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-chi-09', first_name: 'Catalina', last_name: 'Guerra', nickname: null, name: 'Catalina Guerra', team_id: 'team-chile', number: '24', position: 'P', bats: 'R', throws: 'R', photo_asset_id: 'players/chi-p-10-catalina-guerra', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'CL', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-chi-12', first_name: 'Barbara', last_name: 'Carrasco', nickname: null, name: 'Barbara Carrasco', team_id: 'team-chile', number: '14', position: 'C', bats: 'R', throws: 'R', photo_asset_id: 'players/chi-p-06-barbara-carrasco', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'CL', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  // Jugadoras del juego demo activo — Las Guerreras
  { id: 'player-gue-01', first_name: 'Angélica', last_name: 'González', nickname: null, name: 'Angélica González', team_id: 'team-guerreras', number: '20', position: 'LF', bats: 'R', throws: 'R', photo_asset_id: 'players/gue-p-01-angelica', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'DO', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-gue-02', first_name: 'Mariela', last_name: 'Diaz', nickname: null, name: 'Mariela Diaz', team_id: 'team-guerreras', number: '21', position: '1B', bats: 'R', throws: 'R', photo_asset_id: 'players/gue-p-02-mariela-diaz', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'DO', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-gue-03', first_name: 'María', last_name: 'Gabriela', nickname: null, name: 'María Gabriela', team_id: 'team-guerreras', number: '22', position: '3B', bats: 'R', throws: 'R', photo_asset_id: 'players/gue-p-03-maria-gabriela', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'DO', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-gue-05', first_name: 'Merly', last_name: 'Rodríguez', nickname: null, name: 'Merly Rodríguez', team_id: 'team-guerreras', number: '25', position: 'CF', bats: 'R', throws: 'R', photo_asset_id: 'players/gue-p-05-merly', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'DO', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
  { id: 'player-gue-08', first_name: 'Mariant', last_name: 'Reyes', nickname: null, name: 'Mariant Reyes', team_id: 'team-guerreras', number: '28', position: '2B', bats: 'R', throws: 'R', photo_asset_id: 'players/gue-p-08-mariant-reyes', photo_action_asset_id: null, stats: {}, status: 'active', date_of_birth: null, nationality: 'DO', gender: 'female', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
];

export const demoRosters = [
  {
    id: 'roster-demo-mineros-juvenil-rivera',
    tournament_id: 'tournament-copa-norte-2026',
    team_id: 'team-mineros',
    player_id: 'player-rivera-9',
    number: '9',
    position: 'CF',
    batting_slot: 1,
    status: 'active',
  },
  {
    id: 'roster-demo-mineros-juvenil-mendez',
    tournament_id: 'tournament-copa-norte-2026',
    team_id: 'team-mineros',
    player_id: 'player-mendez-18',
    number: '18',
    position: 'P',
    batting_slot: 9,
    status: 'active',
  },
];

export const demoStaff: DemoStaff[] = [
  {
    id: 'staff-demo-manager-mineros',
    team_id: 'team-mineros',
    tournament_id: null,
    name: 'Carlos Peña',
    role: 'manager',
    photo_asset_id: null,
    active: 1,
    created_at: '2026-01-10T12:30:00.000Z',
    updated_at: '2026-01-10T12:30:00.000Z',
  },
  {
    id: 'staff-demo-pitcher-mineros',
    team_id: 'team-mineros',
    tournament_id: 'tournament-copa-norte-2026',
    name: 'Miguel Santos',
    role: 'pitcher_coach',
    photo_asset_id: null,
    active: 1,
    created_at: '2026-01-10T12:31:00.000Z',
    updated_at: '2026-01-10T12:31:00.000Z',
  },
];

export const demoLeagues: DemoLeague[] = [
  {
    id: 'league-liga-norte',
    sport_id: 'baseball',
    name: 'Liga del Norte',
    short_name: 'LDN',
    country: 'DO',
    level: 'amateur',
    logo_asset_id: null,
    banner_asset_id: null,
    active: 1,
    created_at: '2026-01-10T12:40:00.000Z',
    updated_at: '2026-01-10T12:40:00.000Z',
  },
];

export const demoTournaments: DemoTournament[] = [
  {
    id: 'tournament-copa-norte-2026',
    league_id: 'league-liga-norte',
    category_id: 'cat-fed-bm-sub18',
    name: 'Copa del Norte 2026',
    short_name: 'Copa Norte',
    type: 'regular_season',
    season: '2026',
    start_date: '2026-03-10',
    end_date: '2026-04-15',
    rules: { mercyRule: true },
    logo_asset_id: null,
    banner_asset_id: null,
    trophy_asset_id: null,
    status: 'live',
    structure_type: 'group_stage',
    num_rounds: 1,
    has_playoffs: 1,
    playoff_format: 'semifinal_final',
    created_at: '2026-01-10T12:45:00.000Z',
    updated_at: '2026-01-10T12:45:00.000Z',
  },
];

export const demoTournamentTeams = [
  { tournament_id: 'tournament-copa-norte-2026', team_id: 'team-mineros', seeding: 1, eliminated: 0 },
  { tournament_id: 'tournament-copa-norte-2026', team_id: 'team-aguilas-cibao-demo', seeding: 2, eliminated: 0 },
];

export const demoTournamentGroups: DemoTournamentGroup[] = [
  {
    id: 'group-a-demo',
    tournament_id: 'tournament-copa-norte-2026',
    name: 'Grupo A',
    order_num: 1,
    created_at: '2026-01-10T12:50:00.000Z',
  },
];

export const demoTournamentGroupTeams: DemoTournamentGroupTeam[] = [
  { group_id: 'group-a-demo', team_id: 'team-mineros', seeding: 1 },
  { group_id: 'group-a-demo', team_id: 'team-aguilas-cibao-demo', seeding: 2 },
];

export const demoStandings: DemoStanding[] = [
  {
    id: 'standing-mineros-demo',
    tournament_id: 'tournament-copa-norte-2026',
    group_id: 'group-a-demo',
    team_id: 'team-mineros',
    JG: 3,
    JP: 1,
    JE: 0,
    PCT: 0.75,
    RA: 14,
    RC: 22,
    Dif: 8,
    updated_at: '2026-03-18T01:15:00.000Z',
  },
  {
    id: 'standing-aguilas-demo',
    tournament_id: 'tournament-copa-norte-2026',
    group_id: 'group-a-demo',
    team_id: 'team-aguilas-cibao-demo',
    JG: 2,
    JP: 2,
    JE: 0,
    PCT: 0.5,
    RA: 18,
    RC: 18,
    Dif: 0,
    updated_at: '2026-03-18T01:15:00.000Z',
  },
];

export const demoSponsors: DemoSponsor[] = [
  {
    id: 'sponsor-mineros-ferreteria',
    name: 'Ferretería Central',
    brand: 'Ferretería Central',
    asset_id: 'asset-sponsor-ferreteria',
    status: 'active',
    priority: 80,
    weight: 20,
    allowed_placements: ['scorebug', 'lower_third'],
    start_date: '2026-03-01T00:00:00.000Z',
    end_date: '2026-12-31T23:59:59.000Z',
    exposure_limits: { perGame: 12 },
    blackout_rules: [],
    metadata: { contact: 'ventas@ferreteriacentral.do' },
    created_at: '2026-01-10T13:00:00.000Z',
    updated_at: '2026-01-10T13:00:00.000Z',
  },
];

export const demoPitches: DemoPitch[] = [
  {
    id: 'pitch-demo-1',
    game_id: 'game-demo-001',
    at_bat_id: 'ab-demo-1',
    pitcher_player_id: 'player-mendez-18',
    batter_player_id: 'player-rivera-9',
    pitch_num: 1,
    pitch_type: 'recta',
    zone_x: 4,
    zone_y: 3,
    umpire_call: 'strike',
    inning: 1,
    inning_half: 'top',
    operator_id: 'demo-operator',
    timestamp: '2026-03-18T18:05:10.000Z',
  },
];

export const demoGameEvents: DemoGameEvent[] = [
  {
    id: 'event-demo-1',
    game_id: 'game-demo-001',
    event_type: 'pitch',
    at_bat_id: 'ab-demo-1',
    inning: 1,
    inning_half: 'top',
    batter_player_id: 'player-rivera-9',
    pitcher_player_id: 'player-mendez-18',
    payload: { umpire_call: 'strike', zone_x: 4, zone_y: 3 },
    operator_id: 'demo-operator',
    created_at: '2026-03-18T18:05:10.000Z',
  },
];
