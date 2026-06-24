export interface PitcherStats {
  ip?: string;
  pitches?: number;
  strikeouts?: number;
  walks?: number;
  era?: string;
  lastPitch?: string;
  lastPitchSpeed?: string;
}

export interface PitcherData {
  playerId: string;
  number?: string;
  name: string;
  teamId: string;
  photoAssetId?: string;
  throws?: 'R' | 'L';
  stats?: PitcherStats;
}

export interface PitcherOverlayProps {
  pitcher: PitcherData;
  assetBaseUrl?: string;
}
