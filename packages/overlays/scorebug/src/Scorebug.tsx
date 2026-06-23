import { BroadcastShell } from '@mineros/design-system';

import type { ScorebugProps } from './types';

export function Scorebug({ game }: ScorebugProps) {
  const safeOuts = game.outs >= 0 && game.outs <= 2 ? game.outs : null;

  return (
    <BroadcastShell title="Scorebug" subtitle="Overlay permanente de marcador">
      <div>
        <strong>{game.awayTeam.shortName}</strong>
        <span>{game.score.away}</span>
        <span>{game.score.home}</span>
        <strong>{game.homeTeam.shortName}</strong>
      </div>
      <div>
        <span>{game.inningHalf === 'top' ? '▲' : '▼'}</span>
        <span>{game.inning}</span>
      </div>
      {safeOuts !== null ? <div>{`${safeOuts} ${safeOuts === 2 ? 'OUTS' : 'OUT'}`}</div> : null}
      <div>
        <span>1B:{game.bases.first ? '●' : '○'}</span>
        <span>2B:{game.bases.second ? '●' : '○'}</span>
        <span>3B:{game.bases.third ? '●' : '○'}</span>
      </div>
      {game.count ? (
        <div>
          <span>B {game.count.balls}</span>
          <span>S {game.count.strikes}</span>
        </div>
      ) : null}
    </BroadcastShell>
  );
}
