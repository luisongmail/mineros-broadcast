export type GameEventType = 'hit' | 'double' | 'triple' | 'home_run' | 'rbi' | 'walk' | 'strikeout' | 'out' | 'stolen_base' | 'error' | 'double_play' | 'highlight' | 'correction';
export type GameEventVariant = 'lower_third_compact' | 'minimal';

export interface GameEventPlayer {
  playerId: string;
  number?: string;
  name: string;
  position?: string;
  photoAssetId?: string;
  stat?: string;
}

export interface GameEventData {
  gameId: string;
  event: {
    type: GameEventType;
    label: string;
    description?: string;
    direction?: string;
  };
  player: GameEventPlayer;
  scoreImpact?: {
    team: string;
    change: number;
    label?: string;
  };
  bases?: {
    label?: string;
  };
}

export interface GameEventOverlayProps {
  data: GameEventData;
  variant?: GameEventVariant;
}
