import type { GameState, InningHalf, TeamRole } from '@mineros/game-engine';
import type { ScoreboardLineScore, ScoreboardOverlayData, ScoreboardPitcherLine } from '@mineros/overlay-scoreboard';

import { DEMO_SCOREBOARD_DATA, type GameConfigDetail, type GameConfigPlayer } from './gameConfig';

interface LiveBatterStats {
  ab?: number;
  hits?: number;
  rbi?: number;
}

interface LivePitcherStats {
  ip?: string;
  pitches?: number;
  strikeouts?: number;
  walks?: number;
  hitsAllowed?: number;
  runsAllowed?: number;
}

type GameStateWithLineScore = GameState & {
  lineScore?: ScoreboardLineScore;
};

function battingRole(inningHalf: InningHalf): TeamRole {
  return inningHalf === 'top' ? 'away' : 'home';
}

function pitchingRole(inningHalf: InningHalf): TeamRole {
  return inningHalf === 'top' ? 'home' : 'away';
}

function toStringStat(player: GameConfigPlayer | undefined, key: string) {
  const value = player?.stats[key];
  return typeof value === 'string' ? value : undefined;
}

function toNumberStat(player: GameConfigPlayer | undefined, key: string) {
  const value = player?.stats[key];
  return typeof value === 'number' ? value : undefined;
}

function toBattingHand(value: string | undefined) {
  if (value === 'R') return 'BD';
  if (value === 'L') return 'BI';
  if (value === 'S') return 'AMB';
  return undefined;
}

function toPitcher(detail: GameConfigDetail, gameState: GameState, role: TeamRole, livePitcherStats?: Record<string, LivePitcherStats>): ScoreboardPitcherLine {
  const lineup = detail.lineups[role];
  const team = role === 'home' ? gameState.homeTeam : gameState.awayTeam;
  const demoPitcher = role === 'home' ? DEMO_SCOREBOARD_DATA.pitchers.home : DEMO_SCOREBOARD_DATA.pitchers.away;
  const preferredPitcherId = role === pitchingRole(gameState.inningHalf) ? gameState.currentPitcherId : undefined;
  const player =
    (preferredPitcherId ? lineup.find((item) => item.playerId === preferredPitcherId) : undefined) ??
    lineup.find((item) => item.position.toUpperCase() === 'P') ??
    lineup[0];
  const live = player ? livePitcherStats?.[player.playerId] : undefined;

  return {
    teamId: team.id,
    teamAbbr: team.shortName,
    teamLogoAssetId: team.logoAssetId,
    playerId: player?.playerId ?? demoPitcher.playerId,
    playerNumber: player?.number ?? demoPitcher.playerNumber,
    playerName: player?.name ?? demoPitcher.playerName,
    ip: live?.ip ?? toStringStat(player, 'ip') ?? demoPitcher.ip,
    runsAllowed: live?.runsAllowed ?? toNumberStat(player, 'runsAllowed') ?? demoPitcher.runsAllowed,
    hitsAllowed: live?.hitsAllowed ?? toNumberStat(player, 'hitsAllowed') ?? demoPitcher.hitsAllowed,
    walks: live?.walks ?? toNumberStat(player, 'walks') ?? demoPitcher.walks,
    strikeouts: live?.strikeouts ?? toNumberStat(player, 'strikeouts') ?? demoPitcher.strikeouts,
    pitchCount: live?.pitches ?? toNumberStat(player, 'pitches') ?? demoPitcher.pitchCount,
  };
}

function buildLineScore(gameState: GameStateWithLineScore, configuredInnings: number): ScoreboardLineScore {
  const source = gameState.lineScore ?? DEMO_SCOREBOARD_DATA.lineScore;
  const innings = Array.from({ length: configuredInnings }, (_, index) => {
    const inningNumber = index + 1;
    return source.innings.find((entry) => entry.inning === inningNumber) ?? { inning: inningNumber, away: null, home: null };
  });

  return {
    innings,
    totals: {
      away: {
        ...source.totals.away,
        runs: gameState.score.away,
      },
      home: {
        ...source.totals.home,
        runs: gameState.score.home,
      },
    },
  };
}

function buildNextBatters(
  detail: GameConfigDetail,
  gameState: GameState,
  liveStats?: Record<string, LiveBatterStats>,
) {
  const role = battingRole(gameState.inningHalf);
  const lineup = detail.lineups[role];
  const currentIndex = Math.max(0, lineup.findIndex((player) => player.playerId === gameState.currentBatterId));

  return Array.from({ length: Math.min(3, Math.max(1, lineup.length)) }, (_, offset) => {
    const player = lineup.length > 0 ? lineup[(currentIndex + offset) % lineup.length] : undefined;
    const demoFallback = DEMO_SCOREBOARD_DATA.nextBatters[offset];
    const live = player ? liveStats?.[player.playerId] : undefined;
    const liveAvg = live && typeof live.ab === 'number' && live.ab > 0 && typeof live.hits === 'number'
      ? (live.hits / live.ab).toFixed(3).replace('0.', '.')
      : undefined;

    return {
      order: player?.order ?? demoFallback.order,
      playerId: player?.playerId ?? demoFallback.playerId,
      playerNumber: player?.number ?? demoFallback.playerNumber,
      playerName: player?.name ?? demoFallback.playerName,
      position: player?.position ?? demoFallback.position,
      battingHand: toBattingHand(player?.bats) ?? demoFallback.battingHand,
      avg: liveAvg ?? toStringStat(player, 'avg') ?? demoFallback.avg,
      hits: live?.hits ?? toNumberStat(player, 'hits') ?? demoFallback.hits,
      rbi: live?.rbi ?? toNumberStat(player, 'rbi') ?? demoFallback.rbi,
      today: live && typeof live.ab === 'number' && typeof live.hits === 'number'
        ? `${live.hits}-${live.ab}`
        : toStringStat(player, 'today') ?? demoFallback.today,
    };
  });
}

function parseScheduledAt(scheduledAt: string | undefined): { date?: string; startTime?: string } {
  if (!scheduledAt) return {};
  try {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return {};
    const date = d.toISOString().slice(0, 10);
    const startTime = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { date, startTime };
  } catch {
    return {};
  }
}

export function createScoreboardOverlayData(
  detail: GameConfigDetail,
  gameState: GameState,
  options?: {
    liveStats?: Record<string, LiveBatterStats>;
    livePitcherStats?: Record<string, LivePitcherStats>;
  },
): ScoreboardOverlayData {
  const configuredInnings = gameState.rules.inningsCount ?? DEMO_SCOREBOARD_DATA.game.configuredInnings ?? 7;
  const role = battingRole(gameState.inningHalf);
  const battingTeam = role === 'home' ? gameState.homeTeam : gameState.awayTeam;
  const { date, startTime } = parseScheduledAt(detail.scheduledAt);

  return {
    ...DEMO_SCOREBOARD_DATA,
    correlationId: `${gameState.gameId}-scoreboard`,
    game: {
      ...DEMO_SCOREBOARD_DATA.game,
      gameId: gameState.gameId,
      configuredInnings,
      status: gameState.status,
      date: date ?? DEMO_SCOREBOARD_DATA.game.date,
      startTime: startTime ?? DEMO_SCOREBOARD_DATA.game.startTime,
    },
    // venue from game definition (string field) or demo fallback
    venue: { name: (detail.venue as string | undefined) ?? DEMO_SCOREBOARD_DATA.venue?.name },
    // competition: season from detail, rest from demo data
    competition: {
      ...DEMO_SCOREBOARD_DATA.competition,
      tournament: detail.season ?? DEMO_SCOREBOARD_DATA.competition.tournament,
    },
    teams: {
      away: {
        teamId: gameState.awayTeam.id,
        displayName: gameState.awayTeam.name,
        abbr: gameState.awayTeam.shortName,
        logoAssetId: gameState.awayTeam.logoAssetId,
      },
      home: {
        teamId: gameState.homeTeam.id,
        displayName: gameState.homeTeam.name,
        abbr: gameState.homeTeam.shortName,
        logoAssetId: gameState.homeTeam.logoAssetId,
      },
    },
    lineScore: buildLineScore(gameState as GameStateWithLineScore, configuredInnings),
    battingTeam: {
      teamId: battingTeam.id,
      displayName: battingTeam.name,
      abbr: battingTeam.shortName,
      logoAssetId: battingTeam.logoAssetId,
    },
    nextBatters: buildNextBatters(detail, gameState, options?.liveStats),
    pitchers: {
      away: toPitcher(detail, gameState, 'away', options?.livePitcherStats),
      home: toPitcher(detail, gameState, 'home', options?.livePitcherStats),
    },
  };
}
