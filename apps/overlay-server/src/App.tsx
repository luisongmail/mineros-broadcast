import { useState } from 'react';
import { Scorebug } from '@mineros/overlay-scorebug';
import type { GameState } from '@mineros/core';

type GameSlice = Pick<
  GameState,
  'homeTeam' | 'awayTeam' | 'score' | 'inning' | 'inningHalf' | 'outs' | 'bases' | 'count'
>;

const initial: GameSlice = {
  homeTeam: { id: 'MIN', name: 'Mineros de Santiago', shortName: 'MIN', logoAssetId: 'AM-LOGO-001', role: 'home' },
  awayTeam: { id: 'RIV', name: 'Rivales', shortName: 'RIV', logoAssetId: 'AM-TEAM-002', role: 'away' },
  score: { home: 4, away: 2 },
  inning: 3,
  inningHalf: 'top',
  outs: 1,
  bases: { first: true, second: false, third: true },
  count: { balls: 2, strikes: 1 },
};

export function App() {
  const [game, setGame] = useState<GameSlice>(initial);
  const [bg, setBg] = useState<'video' | 'black' | 'grid'>('black');

  const patch = (update: Partial<GameSlice>) => setGame((g) => ({ ...g, ...update }));

  const backgrounds: Record<typeof bg, string> = {
    video: 'url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=80") center/cover',
    black: '#000',
    grid: 'repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 20px 20px',
  };

  const sep = <span style={{ width: 1, height: 20, background: '#444', display: 'inline-block' }} />;

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      {/* Barra de controles */}
      <div style={{ padding: '10px 16px', background: '#1a1a2e', borderBottom: '1px solid #333', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: '#D4AF37', marginRight: 4 }}>Mineros Broadcast</strong>

        <span style={{ fontSize: 11, opacity: 0.5 }}>Fondo:</span>
        {(['black', 'grid', 'video'] as const).map((b) => (
          <button key={b} style={{ opacity: bg === b ? 1 : 0.45, padding: '3px 10px', borderRadius: 4, border: '1px solid #555', background: bg === b ? '#2a2a4a' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => setBg(b)}>{b}</button>
        ))}
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Entrada:</span>
        <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }} onClick={() => patch({ inning: Math.max(1, game.inning - 1) })}>-</button>
        <span style={{ minWidth: 18, textAlign: 'center', fontSize: 13 }}>{game.inning}</span>
        <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }} onClick={() => patch({ inning: game.inning + 1 })}>+</button>
        <button style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => patch({ inningHalf: game.inningHalf === 'top' ? 'bottom' : 'top' })}>
          {game.inningHalf === 'top' ? 'ALTA' : 'BAJA'}
        </button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>MIN:</span>
        <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }} onClick={() => patch({ score: { ...game.score, home: Math.max(0, game.score.home - 1) } })}>-</button>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13 }}>{game.score.home}</span>
        <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }} onClick={() => patch({ score: { ...game.score, home: game.score.home + 1 } })}>+</button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>RIV:</span>
        <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }} onClick={() => patch({ score: { ...game.score, away: Math.max(0, game.score.away - 1) } })}>-</button>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13 }}>{game.score.away}</span>
        <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }} onClick={() => patch({ score: { ...game.score, away: game.score.away + 1 } })}>+</button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Outs:</span>
        {[0, 1, 2].map((o) => (
          <button key={o} style={{ opacity: game.outs === o ? 1 : 0.4, padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: game.outs === o ? '#D71920' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => patch({ outs: o })}>{o}</button>
        ))}
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Bases:</span>
        {(['first', 'second', 'third'] as const).map((b, i) => (
          <button key={b} style={{ opacity: game.bases[b] ? 1 : 0.4, padding: '3px 8px', borderRadius: 4, border: '1px solid #555', background: game.bases[b] ? '#D4AF37' : 'transparent', color: game.bases[b] ? '#000' : '#fff', cursor: 'pointer', fontSize: 12 }} onClick={() => patch({ bases: { ...game.bases, [b]: !game.bases[b] } })}>
            {['1B', '2B', '3B'][i]}
          </button>
        ))}
      </div>

      {/* Canvas de preview escalado al 60% */}
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 6 }}>Canvas 1920x1080 @  Browser Source preview</div>60% 
        <div style={{ width: 1152, height: 648, background: backgrounds[bg], borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid #2a2a2a' }}>
          <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: 1920, height: 1080 }}>
            <Scorebug game={game} />
          </div>
        </div>
      </div>
    </div>
  );
}
