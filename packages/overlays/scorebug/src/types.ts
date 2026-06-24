import type { GameState } from '@mineros/core';

export interface ScorebugGame
  extends Pick<GameState, 'homeTeam' | 'awayTeam' | 'score' | 'inning' | 'inningHalf' | 'outs' | 'bases'> {
  count?: GameState['count'];
}

export interface ScorebugProps {
  game: ScorebugGame;
  assetBaseUrl?: string;
}
