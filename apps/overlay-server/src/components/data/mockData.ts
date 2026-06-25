import type { Category, League, Player, Sponsor, StaffMember, Team, Tournament } from './types';

export const mockCategories: Category[] = [
  { id: 'cat-u12', name: 'U12', description: 'Categoría infantil menor', sportId: 'baseball', active: true },
  { id: 'cat-u15', name: 'U15', description: 'Categoría intermedia', sportId: 'baseball', active: true },
  { id: 'cat-adultos', name: 'Adultos', description: 'Categoría mayores', sportId: 'baseball', active: true },
];

export const mockTeams: Team[] = [
  {
    id: 'team-mineros',
    fullName: 'Mineros de Santiago',
    shortName: 'Mineros',
    abbreviation: 'MIN',
    city: 'Santiago',
    country: 'República Dominicana',
    primaryColor: '#D71920',
    secondaryColor: '#1B2F5B',
    logoAssetId: 'teams/logo-mineros',
    categoryIds: ['cat-u15', 'cat-adultos'],
  },
  {
    id: 'team-aguilas',
    fullName: 'Águilas del Norte',
    shortName: 'Águilas',
    abbreviation: 'AGU',
    city: 'La Vega',
    country: 'República Dominicana',
    primaryColor: '#FACC15',
    secondaryColor: '#111827',
    logoAssetId: 'teams/logo-aguilas',
    categoryIds: ['cat-u12'],
  },
];

export const mockPlayersByTeam: Record<string, Player[]> = {
  'team-mineros': [
    {
      id: 'player-min-01',
      fullName: 'Carlos Peña',
      nickname: 'El Toro',
      number: '27',
      position: '1B',
      bats: 'R',
      throws: 'R',
      photoAssetId: 'players/carlos-pena',
      birthDate: '2001-06-11',
      nationality: 'Dominicana',
      status: 'active',
    },
  ],
  'team-aguilas': [
    {
      id: 'player-agu-01',
      fullName: 'Luis Gómez',
      nickname: '',
      number: '8',
      position: 'CF',
      bats: 'L',
      throws: 'R',
      photoAssetId: 'players/luis-gomez',
      birthDate: '2004-03-08',
      nationality: 'Dominicana',
      status: 'active',
    },
  ],
};

export const mockStaffByTeam: Record<string, StaffMember[]> = {
  'team-mineros': [
    { id: 'staff-min-01', name: 'Miguel Santos', role: 'manager', photoAssetId: 'staff/miguel-santos' },
  ],
  'team-aguilas': [
    { id: 'staff-agu-01', name: 'Pedro Díaz', role: 'pitcher_coach', photoAssetId: 'staff/pedro-diaz' },
  ],
};

export const mockLeagues: League[] = [
  {
    id: 'league-lnb',
    name: 'Liga Nacional de Béisbol',
    shortName: 'LNB',
    country: 'República Dominicana',
    logoAssetId: 'leagues/lnb',
    active: true,
  },
];

export const mockTournaments: Tournament[] = [
  {
    id: 'tournament-apertura',
    name: 'Torneo Apertura 2026',
    shortName: 'Apertura 26',
    type: 'tournament',
    season: '2026',
    leagueId: 'league-lnb',
    categoryId: 'cat-adultos',
    structureType: 'group_stage',
    roundRobinRounds: 1,
    hasPlayoffs: true,
    playoffFormat: 'semifinal_final',
    startDate: '2026-03-01',
    endDate: '2026-06-20',
    status: 'active',
    groups: [
      { id: 'group-a', name: 'Grupo A', teamIds: ['team-mineros', 'team-aguilas'] },
    ],
    standings: [
      { teamId: 'team-mineros', wins: 5, losses: 1, ties: 0, pct: 0.833, runsAllowed: 12, runsScored: 28, runDiff: 16 },
      { teamId: 'team-aguilas', wins: 4, losses: 2, ties: 0, pct: 0.667, runsAllowed: 17, runsScored: 25, runDiff: 8 },
    ],
  },
];

export const mockSponsors: Sponsor[] = [
  {
    id: 'sponsor-mineros-01',
    name: 'Banco Minero',
    brand: 'Banco Minero',
    logoAssetId: 'sponsors/banco-minero',
    priority: 10,
    status: 'active',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    active: true,
  },
];
