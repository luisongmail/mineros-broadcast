export type ScoreboardVariant = 'full_board';
export type InningValue = number | 'X' | null;

export interface ScoreboardBranding {
  brandName: string;
  brandLogoAssetId?: string;
}

export interface ScoreboardCompetition {
  name: string;
  tournament?: string;
  category?: string;
}

export interface ScoreboardVenue {
  name?: string;
}

export interface ScoreboardGameMeta {
  gameId: string;
  gameType?: string;
  date?: string;
  startTime?: string;
  configuredInnings?: number;
  remainingTime?: string;
  status?: string;
}

export interface ScoreboardTeam {
  teamId: string;
  displayName: string;
  abbr: string;
  logoAssetId?: string;
}

export interface ScoreboardLineScoreInning {
  inning: number;
  away: InningValue;
  home: InningValue;
}

export interface ScoreboardLineScoreTotals {
  runs: number;
  hits?: number;
  errors?: number;
}

export interface ScoreboardLineScore {
  innings: ScoreboardLineScoreInning[];
  totals: {
    away: ScoreboardLineScoreTotals;
    home: ScoreboardLineScoreTotals;
  };
}

export interface ScoreboardNextBatter {
  order: number;
  playerId: string;
  playerNumber?: string;
  playerName: string;
  position?: string;
  battingHand?: string;
  avg?: string;
  hits?: number;
  rbi?: number;
  today?: string;
}

export interface ScoreboardPitcherLine {
  teamId: string;
  teamAbbr: string;
  teamLogoAssetId?: string;
  playerId: string;
  playerNumber?: string;
  playerName: string;
  ip?: string;
  runsAllowed?: number;
  hitsAllowed?: number;
  walks?: number;
  strikeouts?: number;
  pitchCount?: number;
}

export interface ScoreboardSponsor {
  sponsorId: string;
  displayName: string;
  logoAssetId?: string;
  text?: string;
  priority?: number;
  active?: boolean;
  campaignId?: string;
}

export interface ScoreboardSponsorGridConfig {
  enabled?: boolean;
  visibleCards?: number;
  direction?: 'right_to_left';
  transitionMs?: number;
  holdMs?: number;
  showPartialNextCard?: boolean;
  cardGapPx?: number;
  cardMode?: 'logo_text' | 'logo_only';
}

export interface ScoreboardLayoutConfig {
  preferredZone?: string;
  priority?: number;
  persistent?: boolean;
  safeArea?: number;
  durationMs?: number;
  sponsorGrid?: ScoreboardSponsorGridConfig;
}

export interface ScoreboardOverlayData {
  schemaVersion: string;
  correlationId: string;
  overlay: 'baseball_scoreboard_board';
  variant?: ScoreboardVariant;
  branding: ScoreboardBranding;
  competition: ScoreboardCompetition;
  venue?: ScoreboardVenue;
  game: ScoreboardGameMeta;
  teams: {
    away: ScoreboardTeam;
    home: ScoreboardTeam;
  };
  lineScore: ScoreboardLineScore;
  battingTeam: ScoreboardTeam;
  nextBatters: ScoreboardNextBatter[];
  pitchers: {
    away: ScoreboardPitcherLine;
    home: ScoreboardPitcherLine;
  };
  sponsors: ScoreboardSponsor[];
  layout?: ScoreboardLayoutConfig;
}

export interface ScoreboardOverlayProps {
  data: ScoreboardOverlayData;
  variant?: ScoreboardVariant;
  assetBaseUrl?: string;
  isPaused?: boolean;
}
