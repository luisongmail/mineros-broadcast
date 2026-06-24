export type BatterVariant = 'lower_third' | 'compact' | 'scorebug_expanded' | 'fullscreen_card';

export interface BatterStats {
  avg?: string;
  hits?: number;
  rbi?: number;
  today?: string;
  obp?: string;
  slg?: string;
}

export interface BatterData {
  playerId: string;
  number?: string;
  name: string;
  position?: string;
  status: string;
  battingOrder?: number;
  teamId: string;
  photoAssetId?: string;
  bats?: string;
  throws?: string;
  stats?: BatterStats;
}

export interface BatterOverlayProps {
  batter: BatterData;
  variant?: BatterVariant;
  assetBaseUrl?: string;
}
