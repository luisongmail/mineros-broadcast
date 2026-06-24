export type TransitionType =
  | 'top_to_bottom'
  | 'bottom_to_top'
  | 'inning_completed'
  | 'game_completed'
  | 'between_innings';

export type InningTransitionVariant =
  | 'lower_third_compact'
  | 'full_width'
  | 'minimal'
  | 'scorebug_attached'
  | 'end_game';

export interface TransitionScore {
  home: { teamId: string; shortName: string; runs: number };
  away: { teamId: string; shortName: string; runs: number };
}

export interface InningTransitionData {
  gameId: string;
  transition: {
    type: TransitionType;
    label: string;
    statusLabel: string;
    nextLabel: string;
  };
  inning: {
    number: number;
    completedHalf: 'top' | 'bottom';
    nextHalf: 'top' | 'bottom';
  };
  score: TransitionScore;
  nextBattingTeam: {
    teamId: string;
    shortName: string;
    logoAssetId?: string;
  };
  nextBattersSummary?: string;
  context?: {
    outs?: number;
    basesLabel?: string;
  };
  message?: string;
}

export interface InningTransitionOverlayProps {
  data: InningTransitionData;
  variant?: InningTransitionVariant;
}
