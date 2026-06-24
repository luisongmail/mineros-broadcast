export type FinalScoreVariant =
  | 'lower_third_compact'
  | 'full_width'
  | 'full_card'
  | 'minimal'
  | 'sponsor_closing';

export interface LineScore {
  runs: number;
  hits: number;
  errors: number;
}

export interface FeaturedPlayer {
  playerId: string;
  name: string;
  summary: string;
}

export interface FinalScoreData {
  gameId: string;
  status: 'final' | 'official';
  winner: {
    teamId: string;
    name: string;
    shortName: string;
    logoAssetId?: string;
  };
  loser: {
    teamId: string;
    name: string;
    shortName: string;
    logoAssetId?: string;
  };
  finalScore: {
    winnerRuns: number;
    loserRuns: number;
  };
  lineScore?: {
    winner: LineScore;
    loser: LineScore;
  };
  featuredPlayer?: FeaturedPlayer;
  context?: {
    inningsPlayed?: number;
    label?: string;
  };
}

export interface FinalScoreOverlayProps {
  data: FinalScoreData;
  variant?: FinalScoreVariant;
}
