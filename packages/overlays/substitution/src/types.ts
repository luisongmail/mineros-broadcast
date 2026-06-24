export type SubstitutionType = 'defensive' | 'offensive' | 'pitcher_change' | 'pinch_runner' | 'pinch_hitter' | 'multiple';
export type SubstitutionVariant = 'lower_third_compact' | 'minimal';

export interface SubstitutionPlayer {
  playerId: string;
  number?: string;
  name: string;
  position?: string;
  photoAssetId?: string;
  detail?: string;
}

export interface SubstitutionData {
  gameId: string;
  substitution: {
    type: SubstitutionType;
    label: string;
    reason?: string;
  };
  playerOut: SubstitutionPlayer;
  playerIn: SubstitutionPlayer;
  inning?: number;
  inningHalf?: 'top' | 'bottom';
}

export interface SubstitutionOverlayProps {
  data: SubstitutionData;
  variant?: SubstitutionVariant;
}
