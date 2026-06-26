export type BatterState = 'current' | 'on_deck' | 'in_the_hole' | 'third_next';
export type NextBatersVariant = 'horizontal_compact' | 'vertical_side' | 'lower_third';

export interface NextBatterEntry {
  state: BatterState;
  order: number;
  playerId: string;
  number?: string;
  name: string;
  position?: string;
  photoAssetId?: string;
  bats?: 'R' | 'L' | 'S';
  avg?: string;
  today?: string;  // hits-ab de este juego, e.g. "2-3"
}

export interface NextBattersOverlayProps {
  team: {
    teamId: string;
    name: string;
    shortName: string;
    logoAssetId?: string;
  };
  inning: { number: number; half: 'top' | 'bottom' };
  batters: NextBatterEntry[];
  variant?: NextBatersVariant;
  assetBaseUrl?: string;
}
