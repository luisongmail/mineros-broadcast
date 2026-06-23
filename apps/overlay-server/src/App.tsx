import { Scorebug } from '@mineros/overlay-scorebug';
import type { GameState } from '@mineros/core';

const sampleGame: Pick<
  GameState,
  'homeTeam' | 'awayTeam' | 'score' | 'inning' | 'inningHalf' | 'outs' | 'bases' | 'count'
> = {
  homeTeam: { id: 'MIN', name: 'Mineros', shortName: 'MIN', logoAssetId: 'AM-LOGO-001', role: 'home' },
  awayTeam: { id: 'RIV', name: 'Rival', shortName: 'RIV', logoAssetId: 'AM-TEAM-002', role: 'away' },
  score: { home: 4, away: 2 },
  inning: 3,
  inningHalf: 'top',
  outs: 1,
  bases: { first: true, second: false, third: true },
  count: { balls: 2, strikes: 1 },
};

export function App() {
  return (
    <main style={{ padding: 24 }}>
      <Scorebug game={sampleGame} />
    </main>
  );
}
