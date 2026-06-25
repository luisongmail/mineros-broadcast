import type {
  GameRules,
  GameBases,
  GameCount,
  GameLineup,
  GameScore,
  GameState,
  GameStatus,
  GameTeam,
  InningHalf,
  LineupEntry,
  TeamRole,
} from '@mineros/game-engine';
import { SOFTBALL_FAST_RULES } from '@mineros/game-engine';
import type { ScoreboardOverlayData } from '@mineros/overlay-scoreboard';

export type GameConfigSource = 'demo' | 'mysql';

export interface GameConfigTeam {
  id: string;
  name: string;
  shortName: string;
  logoAssetId: string;
  role: TeamRole;
  city?: string;
  country?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface GameConfigPlayer {
  playerId: string;
  teamId: string;
  order: number;
  number: string;
  name: string;
  position: string;
  bats?: string;
  throws?: string;
  photoAssetId?: string;
  stats: Record<string, unknown>;
  status: 'active' | 'substituted' | 'ejected';
}

export interface GameConfigSummary {
  id: string;
  status: GameStatus;
  scheduledAt: string;
  venue?: string;
  season?: string;
  gameNumber?: number;
  homeTeam: GameConfigTeam;
  awayTeam: GameConfigTeam;
  source: GameConfigSource;
  isDemo: boolean;
  label: string;
}

export interface GameConfigDetail extends GameConfigSummary {
  inning: number;
  inningHalf: InningHalf;
  outs: number;
  bases: GameBases;
  count: GameCount;
  score: GameScore;
  currentBatterId?: string;
  currentPitcherId?: string;
  lineups: GameLineupConfig;
}

export interface GameLineupConfig {
  home: GameConfigPlayer[];
  away: GameConfigPlayer[];
}

export interface GameLoadSnapshot {
  gameId: string;
  status: GameStatus;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  inning: number;
  inningHalf: InningHalf;
  outs: number;
  bases: GameBases;
  count: GameCount;
  score: GameScore;
}

// ------------------------------------------------------------
// Equipos — Exhibición 11 Jun 2026
// ------------------------------------------------------------

const DEMO_HOME_TEAM: GameConfigTeam = {
  id: 'team-chile',
  name: 'Team Chile',
  shortName: 'CHI',
  logoAssetId: 'teams/teamchile-logo',
  role: 'home',
  city: 'Santiago de Chile',
  country: 'CL',
  primaryColor: '#CC0F0C',
  secondaryColor: '#01299F',
};

const DEMO_AWAY_TEAM: GameConfigTeam = {
  id: 'team-guerreras',
  name: 'Las Guerreras',
  shortName: 'GUE',
  logoAssetId: 'teams/guerreras-logo',
  role: 'away',
  city: 'Santiago de Chile',
  country: 'VE',
  primaryColor: '#760B24',
  secondaryColor: '#FFFFFF',
};

function createDemoPlayer(player: Omit<GameConfigPlayer, 'status'> & { status?: GameConfigPlayer['status'] }): GameConfigPlayer {
  return { ...player, status: player.status ?? 'active' };
}

// ------------------------------------------------------------
// Lineup — Team Chile (home, orden de bateo)
// ------------------------------------------------------------
const DEMO_HOME_LINEUP: GameConfigPlayer[] = [
  createDemoPlayer({ playerId: 'player-chi-01', teamId: 'team-chile', order: 1,  number: '3',  name: 'Constanza Aguilera',   position: '1B', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-01-constanza-aguilera',  stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-02', teamId: 'team-chile', order: 2,  number: '5',  name: 'Florencia Honorato',   position: 'DP', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-02-florencia-honorato',  stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-03', teamId: 'team-chile', order: 3,  number: '6',  name: 'Daniela De Oliveira',  position: 'SS', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-03-daniela-deoliveira',  stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-06', teamId: 'team-chile', order: 4,  number: '16', name: 'Martina Pellizaris',   position: '3B', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-07-martina-pellizaris',  stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-07', teamId: 'team-chile', order: 5,  number: '17', name: 'Carolina Jara',        position: '2B', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-08-carolina-jara',       stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-08', teamId: 'team-chile', order: 6,  number: '22', name: 'Constanza Espinoza',   position: 'RF', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-09-constanza-espinoza',  stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-10', teamId: 'team-chile', order: 7,  number: '27', name: 'Marianny Mendez',      position: 'LF', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-11-marianny-mendez',     stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-11', teamId: 'team-chile', order: 8,  number: '42', name: 'María Mondeja',        position: 'CF', bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-12-maria-mondeja',       stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-12', teamId: 'team-chile', order: 9,  number: '14', name: 'Barbara Carrasco',     position: 'C',  bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-06-barbara-carrasco',    stats: {} }),
  createDemoPlayer({ playerId: 'player-chi-09', teamId: 'team-chile', order: 10, number: '24', name: 'Catalina Guerra',      position: 'P',  bats: 'R', throws: 'R', photoAssetId: 'players/chi-p-10-catalina-guerra',     stats: {} }),
];

// ------------------------------------------------------------
// Lineup — Las Guerreras (away, orden de bateo)
// ------------------------------------------------------------
const DEMO_AWAY_LINEUP: GameConfigPlayer[] = [
  createDemoPlayer({ playerId: 'player-gue-01', teamId: 'team-guerreras', order: 1, number: '20', name: 'Angélica González',  position: 'LF', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-01-angelica',        stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-02', teamId: 'team-guerreras', order: 2, number: '21', name: 'Mariela Diaz',        position: '1B', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-02-mariela-diaz',     stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-03', teamId: 'team-guerreras', order: 3, number: '22', name: 'María Gabriela',      position: '3B', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-03-maria-gabriela',   stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-05', teamId: 'team-guerreras', order: 4, number: '25', name: 'Merly Rodríguez',     position: 'CF', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-05-merly',            stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-06', teamId: 'team-guerreras', order: 5, number: '26', name: 'María Mora',          position: 'C',  bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-06-maria-mora',       stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-07', teamId: 'team-guerreras', order: 6, number: '27', name: 'Raquel Hernández',    position: 'RF', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-07-raquel',           stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-08', teamId: 'team-guerreras', order: 7, number: '28', name: 'Mariant Reyes',       position: '2B', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-08-mariant-reyes',    stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-09', teamId: 'team-guerreras', order: 8, number: '29', name: 'Maoly Talamonty',     position: 'SS', bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-09-maoly-talamonty', stats: {} }),
  createDemoPlayer({ playerId: 'player-gue-04', teamId: 'team-guerreras', order: 9, number: '23', name: 'Jessica Martínez',    position: 'P',  bats: 'R', throws: 'R', photoAssetId: 'players/gue-p-04-jessica',          stats: {} }),
];

export function formatGameLabel(homeTeam: Pick<GameConfigTeam, 'shortName' | 'name'>, awayTeam: Pick<GameConfigTeam, 'shortName' | 'name'>): string {
  return `${awayTeam.name} vs ${homeTeam.name}`;
}

export const DEMO_GAME_DETAIL: GameConfigDetail = {
  id: 'game-gue-vs-chi-20260611',
  status: 'live',
  scheduledAt: '2026-06-11T10:00:00-04:00',
  venue: 'Estadio Mineros Peñalolén',
  season: 'Exhibición 2026',
  homeTeam: DEMO_HOME_TEAM,
  awayTeam: DEMO_AWAY_TEAM,
  source: 'demo',
  isDemo: true,
  label: formatGameLabel(DEMO_HOME_TEAM, DEMO_AWAY_TEAM),
  inning: 1,
  inningHalf: 'top',
  outs: 0,
  bases: { first: false, second: false, third: false },
  count: { balls: 0, strikes: 0 },
  score: { home: 0, away: 0 },
  currentBatterId: 'player-gue-01',
  currentPitcherId: 'player-chi-09',
  lineups: {
    home: DEMO_HOME_LINEUP,
    away: DEMO_AWAY_LINEUP,
  },
};


export const DEMO_SCOREBOARD_DATA: ScoreboardOverlayData = {
  schemaVersion: '1.0.0',
  correlationId: 'demo-scoreboard',
  overlay: 'baseball_scoreboard_board',
  variant: 'full_board',
  branding: {
    brandName: 'Mineros Broadcast',
    brandLogoAssetId: 'brands/mineros-broadcast-logo',
  },
  competition: {
    name: 'Liga Oriente',
    tournament: 'Torneo Apertura 2026',
    category: 'Categoría Infantil',
  },
  venue: {
    name: 'Estadio Lo Prado',
  },
  game: {
    gameId: 'game-2026-001',
    gameType: 'Juego Regular',
    date: '2026-06-25',
    startTime: '13:30',
    configuredInnings: 7,
    remainingTime: '48:12',
    status: 'live',
  },
  teams: {
    away: {
      teamId: 'team-anderson',
      displayName: 'Team Anderson',
      abbr: 'TAI',
      logoAssetId: 'teams/team-anderson-logo',
    },
    home: {
      teamId: 'astros',
      displayName: 'Astros',
      abbr: 'AST',
      logoAssetId: 'teams/astros-logo',
    },
  },
  lineScore: {
    innings: [
      { inning: 1, away: 0, home: 1 },
      { inning: 2, away: 0, home: 0 },
      { inning: 3, away: 1, home: 0 },
      { inning: 4, away: 1, home: 3 },
      { inning: 5, away: null, home: null },
      { inning: 6, away: null, home: null },
      { inning: 7, away: null, home: null },
    ],
    totals: {
      away: { runs: 2, hits: 5, errors: 1 },
      home: { runs: 4, hits: 6, errors: 0 },
    },
  },
  battingTeam: {
    teamId: 'astros',
    displayName: 'Astros',
    abbr: 'AST',
    logoAssetId: 'teams/astros-logo',
  },
  nextBatters: [
    { order: 1, playerId: 'player-012', playerNumber: '12', playerName: 'S. Sánchez', position: 'SS', battingHand: 'BD', avg: '.333', hits: 2, rbi: 1, today: '1-2' },
    { order: 2, playerId: 'player-018', playerNumber: '18', playerName: 'C. Arias', position: 'CF', battingHand: 'BI', avg: '.286', hits: 1, rbi: 0, today: '0-1' },
    { order: 3, playerId: 'player-023', playerNumber: '23', playerName: 'I. Córdova', position: '1B', battingHand: 'BD', avg: '.417', hits: 3, rbi: 2, today: '2-2' },
  ],
  pitchers: {
    away: {
      teamId: 'team-anderson',
      teamAbbr: 'TAI',
      teamLogoAssetId: 'teams/team-anderson-logo',
      playerId: 'player-045',
      playerNumber: '45',
      playerName: 'R. Gómez',
      ip: '3.0',
      runsAllowed: 4,
      hitsAllowed: 6,
      walks: 2,
      strikeouts: 3,
      pitchCount: 64,
    },
    home: {
      teamId: 'astros',
      teamAbbr: 'AST',
      teamLogoAssetId: 'teams/astros-logo',
      playerId: 'player-021',
      playerNumber: '21',
      playerName: 'C. Jara',
      ip: '4.0',
      runsAllowed: 2,
      hitsAllowed: 5,
      walks: 1,
      strikeouts: 5,
      pitchCount: 54,
    },
  },
  sponsors: [
    { sponsorId: 'merchise', displayName: 'Merchise', logoAssetId: 'sponsors/merchise-logo', text: 'Tecnología para la transmisión', priority: 1, active: true },
    { sponsorId: 'storeware', displayName: 'Storeware', logoAssetId: 'sponsors/storeware-logo', text: 'Plataforma oficial de datos', priority: 2, active: true },
    { sponsorId: 'pjd', displayName: 'PJD', logoAssetId: 'sponsors/pjd-logo', text: 'Auspiciador de la jornada', priority: 3, active: true },
  ],
  layout: {
    preferredZone: 'center',
    priority: 80,
    persistent: false,
    safeArea: 60,
    durationMs: 12000,
    sponsorGrid: {
      enabled: true,
      visibleCards: 3,
      direction: 'right_to_left',
      transitionMs: 450,
      holdMs: 5000,
      showPartialNextCard: true,
      cardGapPx: 22,
      cardMode: 'logo_text',
    },
  },
};

export function buildGameSummary(detail: GameConfigDetail, source: GameConfigSource = detail.source): GameConfigSummary {
  return {
    id: detail.id,
    status: detail.status,
    scheduledAt: detail.scheduledAt,
    venue: detail.venue,
    season: detail.season,
    gameNumber: detail.gameNumber,
    homeTeam: detail.homeTeam,
    awayTeam: detail.awayTeam,
    source,
    isDemo: source === 'demo',
    label: formatGameLabel(detail.homeTeam, detail.awayTeam),
  };
}

export function toGameTeam(team: GameConfigTeam): GameTeam {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logoAssetId: team.logoAssetId,
    role: team.role,
  };
}

export function toLineupEntries(players: GameConfigPlayer[]): LineupEntry[] {
  return players.map((player) => ({
    order: player.order,
    playerId: player.playerId,
    name: player.name,
    number: player.number,
    position: player.position,
    status: player.status,
    photoAssetId: player.photoAssetId,
  }));
}

export function toGameLineup(lineups: GameLineupConfig): GameLineup {
  return {
    home: toLineupEntries(lineups.home),
    away: toLineupEntries(lineups.away),
  };
}

export function toGameLoadSnapshot(detail: GameConfigDetail): GameLoadSnapshot {
  return {
    gameId: detail.id,
    status: detail.status,
    homeTeam: toGameTeam(detail.homeTeam),
    awayTeam: toGameTeam(detail.awayTeam),
    inning: detail.inning,
    inningHalf: detail.inningHalf,
    outs: detail.outs,
    bases: structuredClone(detail.bases),
    count: structuredClone(detail.count),
    score: structuredClone(detail.score),
  };
}

export function createDemoGameState(): GameState {
  const rules: GameRules = {
    ...SOFTBALL_FAST_RULES,
    mercyRule: [...SOFTBALL_FAST_RULES.mercyRule],
    extraInnings: { ...SOFTBALL_FAST_RULES.extraInnings },
  };

  return {
    gameId: DEMO_GAME_DETAIL.id,
    status: DEMO_GAME_DETAIL.status,
    homeTeam: toGameTeam(DEMO_GAME_DETAIL.homeTeam),
    awayTeam: toGameTeam(DEMO_GAME_DETAIL.awayTeam),
    inning: DEMO_GAME_DETAIL.inning,
    inningHalf: DEMO_GAME_DETAIL.inningHalf,
    outs: DEMO_GAME_DETAIL.outs,
    bases: structuredClone(DEMO_GAME_DETAIL.bases),
    count: structuredClone(DEMO_GAME_DETAIL.count),
    score: structuredClone(DEMO_GAME_DETAIL.score),
    rules,
    currentBatterId: DEMO_GAME_DETAIL.currentBatterId,
    currentPitcherId: DEMO_GAME_DETAIL.currentPitcherId,
    lineup: toGameLineup(DEMO_GAME_DETAIL.lineups),
    eventLog: [],
    auditLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getBattingTeamRole(inningHalf: InningHalf): TeamRole {
  return inningHalf === 'top' ? 'away' : 'home';
}

function getLineupForRole(detail: GameConfigDetail, role: TeamRole): GameConfigPlayer[] {
  return detail.lineups[role];
}

export function findPlayerById(detail: GameConfigDetail, playerId: string | undefined): GameConfigPlayer | null {
  if (!playerId) return null;
  for (const player of [...detail.lineups.home, ...detail.lineups.away]) {
    if (player.playerId === playerId) return player;
  }
  return null;
}

function toStringStat(stats: Record<string, unknown>, key: string): string | undefined {
  const value = stats[key];
  return typeof value === 'string' ? value : undefined;
}

function toNumberStat(stats: Record<string, unknown>, key: string): number | undefined {
  const value = stats[key];
  return typeof value === 'number' ? value : undefined;
}

function normalizeBats(value: string | undefined): 'R' | 'L' | 'S' | undefined {
  return value === 'R' || value === 'L' || value === 'S' ? value : undefined;
}

export function createCurrentBatterData(detail: GameConfigDetail, gameState: Pick<GameState, 'inningHalf' | 'currentBatterId'>) {
  const battingRole = getBattingTeamRole(gameState.inningHalf);
  const players = getLineupForRole(detail, battingRole);
  const batter = players.find((player) => player.playerId === gameState.currentBatterId) ?? players[0] ?? null;

  if (!batter) return null;

  return {
    playerId: batter.playerId,
    number: batter.number,
    name: batter.name,
    position: batter.position,
    status: 'AL BATE',
    battingOrder: batter.order,
    teamId: batter.teamId,
    photoAssetId: batter.photoAssetId,
    bats: batter.bats,
    throws: batter.throws,
    stats: {
      avg: toStringStat(batter.stats, 'avg'),
      hits: toNumberStat(batter.stats, 'hits'),
      rbi: toNumberStat(batter.stats, 'rbi'),
      today: '--',
      obp: toStringStat(batter.stats, 'obp'),
      slg: toStringStat(batter.stats, 'slg'),
    },
  };
}

export function createNextBattersData(detail: GameConfigDetail, gameState: Pick<GameState, 'inningHalf' | 'currentBatterId'>) {
  const battingRole = getBattingTeamRole(gameState.inningHalf);
  const players = getLineupForRole(detail, battingRole);

  if (players.length === 0) return [];

  const currentIndex = Math.max(
    0,
    players.findIndex((player) => player.playerId === gameState.currentBatterId),
  );

  return ['current', 'on_deck', 'in_the_hole'].map((state, offset) => {
    const player = players[(currentIndex + offset) % players.length];
    return {
      state: state as 'current' | 'on_deck' | 'in_the_hole',
      order: player.order,
      playerId: player.playerId,
      number: player.number,
      name: player.name,
      position: player.position,
      photoAssetId: player.photoAssetId,
      bats: normalizeBats(player.bats),
      avg: toStringStat(player.stats, 'avg'),
    };
  });
}
