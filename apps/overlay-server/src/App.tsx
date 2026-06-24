import { useEffect, useRef, useState } from 'react';
import { GameEngine, type GameTeam } from '@mineros/game-engine';
import { BatterOverlay } from '@mineros/overlay-batter';
import { FinalScoreOverlay } from '@mineros/overlay-final-score';
import { InningTransitionOverlay } from '@mineros/overlay-inning-transition';
import { NextBattersOverlay } from '@mineros/overlay-next-batters';
import { Scorebug } from '@mineros/overlay-scorebug';
import { SponsorBreakOverlay } from '@mineros/overlay-sponsor-break';

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

const DEMO_BATTERS = [
  { playerId: 'p1', number: '15', name: 'Martina Pellizaris', position: '2B', status: 'AL BATE', teamId: 'team-mineros', stats: { avg: '.385', hits: 5, rbi: 4, today: '2-2' } },
  { playerId: 'p2', number: '08', name: 'Carolina Jara', position: 'SS', status: 'AL BATE', teamId: 'team-mineros', stats: { avg: '.312', hits: 3, rbi: 2, today: '1-3' } },
  { playerId: 'p3', number: '22', name: 'Valentina Rios', position: '3B', status: 'AL BATE', teamId: 'team-mineros', stats: { avg: '.278', hits: 4, rbi: 5, today: '0-2' } },
  { playerId: 'p4', number: '07', name: 'Sofia Mendoza', position: 'CF', status: 'AL BATE', teamId: 'team-mineros', stats: { avg: '.340', hits: 6, rbi: 3, today: '2-4' } },
];

const sampleNextBatters = [
  { state: 'current', order: 1, playerId: 'p1', name: 'C. Jara', number: '12', position: '2B', avg: '.385' },
  { state: 'on_deck', order: 2, playerId: 'p2', name: 'M. Pellizaris', number: '15', position: '3B', avg: '.300' },
  { state: 'in_the_hole', order: 3, playerId: 'p3', name: 'V. Rios', number: '08', position: 'SS', avg: '.278' },
] as const;

const OVERLAY_VARIANTS: Record<string, string[]> = {
  'batter':             ['lower_third', 'compact', 'scorebug_expanded', 'fullscreen_card'],
  'next-batters':       ['horizontal_compact', 'vertical_side', 'lower_third'],
  'inning-transition':  ['lower_third_compact', 'full_width', 'minimal', 'scorebug_attached', 'end_game'],
  'final-score':        ['lower_third_compact', 'full_width', 'full_card', 'minimal', 'sponsor_closing'],
  'sponsor-break':      ['lower_third_compact', 'full_width', 'logo_only', 'sponsor_cta', 'multi_sponsor'],
};

const DEFAULT_VARIANT: Record<string, string> = {
  'batter':            'lower_third',
  'next-batters':      'horizontal_compact',
  'inning-transition': 'lower_third_compact',
  'final-score':       'lower_third_compact',
  'sponsor-break':     'lower_third_compact',
};

const overlayOptions = [
  { id: 'scorebug', label: 'Scorebug' },
  { id: 'batter', label: 'Batter' },
  { id: 'next-batters', label: 'Next Batters' },
  { id: 'inning-transition', label: 'Transicion' },
  { id: 'final-score', label: 'Final Score' },
  { id: 'sponsor-break', label: 'Sponsor Break' },
] as const;

type ActiveOverlay = (typeof overlayOptions)[number]['id'];

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
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>('scorebug');
  const [activeVariant, setActiveVariant] = useState<string>('lower_third');
  const [batterIndex, setBatterIndex] = useState(0);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = () => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
  };

  const switchOverlay = (id: ActiveOverlay) => {
    cancelTimer();
    setActiveOverlay(id);
    setActiveVariant(DEFAULT_VARIANT[id] ?? '');
  };

  const showBatterOverlay = () => {
    cancelTimer();
    setActiveOverlay('batter');
    autoHideTimer.current = setTimeout(() => setActiveOverlay('scorebug'), 8000);
  };

  useEffect(() => {
    const syncGame = () => setGame(engine.getState());
    const onBatterChanged = () => {
      setBatterIndex((i) => (i + 1) % DEMO_BATTERS.length);
      showBatterOverlay();
    };
    const onInningStarted = () => {
      cancelTimer();
      setActiveOverlay('inning-transition');
      autoHideTimer.current = setTimeout(() => setActiveOverlay('scorebug'), 6000);
    };
    const onGameFinalized = () => {
      cancelTimer();
      setActiveOverlay('final-score');
    };

    engine.on('event', syncGame);
    engine.on('batter_changed', onBatterChanged);
    engine.on('inning_started', onInningStarted);
    engine.on('game_finalized', onGameFinalized);
    return () => {
      engine.off('event', syncGame);
      engine.off('batter_changed', onBatterChanged);
      engine.off('inning_started', onInningStarted);
      engine.off('game_finalized', onGameFinalized);
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
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

  const demoInningTransition = {
    gameId: 'demo-game-001',
    transition: {
      type: 'top_to_bottom' as const,
      label: 'Cambio de entrada',
      statusLabel: `Fin ${game.inning}a`,
      nextLabel: `Cambio a baja ${game.inning}a`,
    },
    inning: { number: game.inning, completedHalf: game.inningHalf, nextHalf: (game.inningHalf === 'top' ? 'bottom' : 'top') as 'top' | 'bottom' },
    score: {
      home: { teamId: 'MIN', shortName: 'MIN', runs: game.score.home },
      away: { teamId: 'RIV', shortName: 'RIV', runs: game.score.away },
    },
    nextBattingTeam: { teamId: 'MIN', shortName: 'MIN' },
    nextBattersSummary: 'Batean 6 . 7 . 8',
  };

  const demoFinalScore = {
    gameId: 'demo-game-001',
    status: 'final' as const,
    winner: { teamId: 'MIN', name: 'Mineros', shortName: 'MIN' },
    loser: { teamId: 'RIV', name: 'Rivales', shortName: 'RIV' },
    finalScore: { winnerRuns: game.score.home, loserRuns: game.score.away },
    lineScore: {
      winner: { runs: game.score.home, hits: 9, errors: 1 },
      loser: { runs: game.score.away, hits: 7, errors: 2 },
    },
    featuredPlayer: { playerId: 'p2', name: 'C. Jara', summary: '2-3 . 2 RBI . Doble' },
    context: { inningsPlayed: game.inning, label: `Final ${game.inning} entradas` },
  };

  const demoSponsor = {
    placement: { type: 'primary' as const, slot: 'between_innings' },
    sponsor: { sponsorId: 'sponsor-001', name: 'Merchise' },
    message: { title: 'Gracias', subtitle: 'Por apoyar a Mineros' },
    cta: { text: 'Siguenos', handle: '@clubminerosdesantiago' },
    context: { label: 'Entre entradas', durationSeconds: 10 },
  };

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

        <span style={{ fontSize: 11, opacity: 0.5 }}>Overlay:</span>
        {overlayOptions.map((overlay) => (
         <button
           key={overlay.id}
           style={{ ...buttonStyle, opacity: activeOverlay === overlay.id ? 1 : 0.45, padding: '3px 10px', background: activeOverlay === overlay.id ? '#2a2a4a' : 'transparent', fontSize: 12 }}
           onClick={() => switchOverlay(overlay.id)}
         >
           {overlay.label}
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
        <button style={{ ...buttonStyle, fontSize: 12, borderColor: '#D71920', color: '#D71920' }} onClick={() => { cancelTimer(); engine.endGame(); }}>
          Fin Juego
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
        <button style={buttonStyle} onClick={() => engine.setCount({ balls: game.count.balls + 1 })}>
          +B
        </button>
        <button style={buttonStyle} onClick={() => engine.setCount({ strikes: game.count.strikes + 1 })}>
          +S
        </button>
        <button style={buttonStyle} onClick={() => engine.setCount({ balls: 0, strikes: 0 })}>
          Reset
        </button>
      </div>

      {/* Barra de variantes — solo cuando hay variantes disponibles */}
      {OVERLAY_VARIANTS[activeOverlay] && (
        <div style={{ padding: '6px 16px', background: '#111827', borderBottom: '1px solid #222', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, opacity: 0.4, marginRight: 4 }}>Variante:</span>
          {OVERLAY_VARIANTS[activeOverlay].map((v) => (
            <button
              key={v}
              style={{ ...buttonStyle, fontSize: 11, padding: '2px 10px', background: activeVariant === v ? '#D4AF37' : 'transparent', color: activeVariant === v ? '#000' : '#aaa', borderColor: activeVariant === v ? '#D4AF37' : '#444' }}
              onClick={() => setActiveVariant(v)}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 6 }}>Canvas 1920x1080 @ Browser Source preview (60%)</div>
        <div style={{ width: 1152, height: 648, background: backgrounds[bg], borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid #2a2a2a' }}>
          <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left', width: 1920, height: 1080, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Scorebug game={game} />
            </div>
            {activeOverlay === 'batter' && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <BatterOverlay batter={DEMO_BATTERS[batterIndex]} variant={activeVariant as 'lower_third' | 'compact' | 'scorebug_expanded' | 'fullscreen_card'} />
              </div>
            )}
            {activeOverlay === 'next-batters' && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <NextBattersOverlay
                  batters={[...sampleNextBatters]}
                  inning={{ number: game.inning, half: game.inningHalf }}
                  team={{ teamId: 'team-mineros', name: 'Mineros de Santiago', shortName: 'MIN', logoAssetId: 'AM-LOGO-001' }}
                  variant={activeVariant as 'horizontal_compact' | 'vertical_side' | 'lower_third'}
                />
              </div>
            )}
            {activeOverlay === 'inning-transition' && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <InningTransitionOverlay data={demoInningTransition} variant={activeVariant as never} />
              </div>
            )}
            {activeOverlay === 'final-score' && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <FinalScoreOverlay data={demoFinalScore} variant={activeVariant as never} />
              </div>
            )}
            {activeOverlay === 'sponsor-break' && (
              <div style={{ position: 'absolute', inset: 0 }}>
                <SponsorBreakOverlay data={demoSponsor} variant={activeVariant as never} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
