import { useEffect, useRef, useState } from 'react';
import { GameEngine, type GameTeam } from '@mineros/game-engine';
import { Scorebug } from '@mineros/overlay-scorebug';

const homeTeam: GameTeam = {
  id: 'MIN',
  name: 'Mineros de Santiago',
  shortName: 'MIN',
  logoAssetId: 'AM-LOGO-001',
  role: 'home',
};

const awayTeam: GameTeam = {
  id: 'RIV',
  name: 'Rivales',
  shortName: 'RIV',
  logoAssetId: 'AM-TEAM-002',
  role: 'away',
};

export function App() {
  const engineRef = useRef<GameEngine | null>(null);

  if (!engineRef.current) {
    const engine = new GameEngine('demo-game-001', homeTeam, awayTeam);
    engine.startGame();
    engineRef.current = engine;
  }

  const engine = engineRef.current!;
  const [game, setGame] = useState(() => engine.getState());
  const [bg, setBg] = useState<'video' | 'black' | 'grid'>('black');

  useEffect(() => {
    const syncGame = () => setGame(engine.getState());

    engine.on('event', syncGame);
    return () => {
      engine.off('event', syncGame);
    };
  }, [engine]);

  const backgrounds: Record<typeof bg, string> = {
    video: 'url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=80") center/cover',
    black: '#000',
    grid: 'repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 20px 20px',
  };

  const sep = <span style={{ width: 1, height: 20, background: '#444', display: 'inline-block' }} />;
  const toggleBase = (base: 'first' | 'second' | 'third') => {
    engine.setBases({ [base]: !game.bases[base] } as Partial<typeof game.bases>);
  };
  const buttonStyle = {
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #555',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
  } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#111', fontFamily: 'Inter, sans-serif', color: '#fff' }}>
      <div style={{ padding: '10px 16px', background: '#1a1a2e', borderBottom: '1px solid #333', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong style={{ color: '#D4AF37', marginRight: 4 }}>Mineros Broadcast</strong>

        <span style={{ fontSize: 11, opacity: 0.5 }}>Fondo:</span>
        {(['black', 'grid', 'video'] as const).map((b) => (
          <button key={b} style={{ ...buttonStyle, opacity: bg === b ? 1 : 0.45, padding: '3px 10px', background: bg === b ? '#2a2a4a' : 'transparent', fontSize: 12 }} onClick={() => setBg(b)}>
            {b}
          </button>
        ))}
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Entrada:</span>
        <span style={{ minWidth: 56, textAlign: 'center', fontSize: 13 }}>
          {game.inningHalf === 'top' ? 'ALTA' : 'BAJA'} {game.inning}
        </span>
        <button style={{ ...buttonStyle, fontSize: 12 }} onClick={() => engine.advanceHalfInning()}>
          Avanzar
        </button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>MIN:</span>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13 }}>{game.score.home}</span>
        <button style={buttonStyle} onClick={() => engine.incrementScore('home')}>
          +
        </button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>RIV:</span>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13 }}>{game.score.away}</span>
        <button style={buttonStyle} onClick={() => engine.incrementScore('away')}>
          +
        </button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Outs:</span>
        <span style={{ minWidth: 16, textAlign: 'center', fontSize: 13 }}>{game.outs}</span>
        <button style={buttonStyle} onClick={() => engine.addOut()}>
          + OUT
        </button>
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Bases:</span>
        {(['first', 'second', 'third'] as const).map((base, i) => (
          <button
            key={base}
            style={{ ...buttonStyle, opacity: game.bases[base] ? 1 : 0.4, background: game.bases[base] ? '#D4AF37' : 'transparent', color: game.bases[base] ? '#000' : '#fff', fontSize: 12 }}
            onClick={() => toggleBase(base)}
          >
            {['1B', '2B', '3B'][i]}
          </button>
        ))}
        {sep}

        <span style={{ fontSize: 11, opacity: 0.5 }}>Conteo:</span>
        <span style={{ minWidth: 48, textAlign: 'center', fontSize: 13 }}>
          B {game.count.balls} / S {game.count.strikes}
        </span>
        <button style={buttonStyle} onClick={() => engine.setCount({ balls: (game.count.balls + 1) % 4 })}>
          +B
        </button>
        <button style={buttonStyle} onClick={() => engine.setCount({ strikes: (game.count.strikes + 1) % 3 })}>
          +S
        </button>
        <button style={buttonStyle} onClick={() => engine.setCount({ balls: 0, strikes: 0 })}>
          Reset
        </button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 6 }}>Canvas 1920x1080 @ Browser Source preview (60%)</div>
        <div style={{ width: 1152, height: 648, background: backgrounds[bg], borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid #2a2a2a' }}>
          <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: 1920, height: 1080 }}>
            <Scorebug game={engine.getState()} />
          </div>
        </div>
      </div>
    </div>
  );
}
