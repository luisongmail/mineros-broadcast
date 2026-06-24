export interface LineupPlayer {
  order: number;
  playerId: string;
  name: string;
  number?: string;
  position?: string;
  avg?: string;
  photoAssetId?: string;
  status: 'active' | 'substituted' | 'ejected';
  isCurrentBatter?: boolean;
}

export interface LineupOverlayProps {
  team: {
    teamId: string;
    name: string;
    shortName: string;
    logoAssetId?: string;
  };
  players: LineupPlayer[];
  pitcher?: {
    playerId: string;
    name: string;
    number?: string;
    photoAssetId?: string;
  };
  assetBaseUrl?: string;
}
