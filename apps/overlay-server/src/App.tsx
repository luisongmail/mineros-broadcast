import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GameEngine, type GameTeam } from '@mineros/game-engine';
import { BatterOverlay } from '@mineros/overlay-batter';
import { FinalScoreOverlay } from '@mineros/overlay-final-score';
import { InningTransitionOverlay } from '@mineros/overlay-inning-transition';
import { NextBattersOverlay } from '@mineros/overlay-next-batters';
import { Scorebug } from '@mineros/overlay-scorebug';
import { SponsorBreakOverlay } from '@mineros/overlay-sponsor-break';
import { AnnouncementOverlay } from '@mineros/overlay-announcement';
import { SocialLowerThirdOverlay } from '@mineros/overlay-social-lower-third';
import { CountdownOverlay } from '@mineros/overlay-countdown';
import { SubstitutionOverlay } from '@mineros/overlay-substitution';
import { GameEventOverlay } from '@mineros/overlay-game-event';

import { OverlayPage } from './pages/OverlayPage';

const CANVAS_SCALE = 0.45;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

type OverlayId =
  | 'batter'
  | 'next-batters'
  | 'inning-transition'
  | 'final-score'
  | 'announcement'
  | 'social'
  | 'countdown'
  | 'sponsor-break'
  | 'substitution'
  | 'game-event';

type HistoryAction = 'preview_overlay' | 'take_overlay' | 'hide_overlay' | 'hide_all' | 'clear_preview';

type HistoryEntry = {
  action: HistoryAction;
  overlay: string;
  time: string;
};

type OverlayDefinition = {
  label: string;
  category: 'Juego' | 'Comunicacion' | 'Accion';
  variants: string[];
  defaultVariant: string;
  autoHideMs?: number;
};

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
] as const;

const DEMO_NEXT_BATTERS = [
  { state: 'current', order: 1, playerId: 'p1', name: 'C. Jara', number: '12', position: '2B', avg: '.385' },
  { state: 'on_deck', order: 2, playerId: 'p2', name: 'M. Pellizaris', number: '15', position: '3B', avg: '.300' },
  { state: 'in_the_hole', order: 3, playerId: 'p3', name: 'V. Rios', number: '08', position: 'SS', avg: '.278' },
] as const;

const OVERLAYS: Record<OverlayId, OverlayDefinition> = {
  batter: {
    label: 'Batter',
    category: 'Juego',
    variants: ['lower_third', 'compact', 'scorebug_expanded', 'fullscreen_card'],
    defaultVariant: 'lower_third',
    autoHideMs: 8000,
  },
  'next-batters': {
    label: 'Next Batters',
    category: 'Juego',
    variants: ['horizontal_compact', 'vertical_side', 'lower_third'],
    defaultVariant: 'horizontal_compact',
    autoHideMs: 10000,
  },
  'inning-transition': {
    label: 'Transicion',
    category: 'Juego',
    variants: ['lower_third_compact', 'minimal'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 6000,
  },
  'final-score': {
    label: 'Final',
    category: 'Juego',
    variants: ['lower_third_compact', 'full_card'],
    defaultVariant: 'lower_third_compact',
  },
  announcement: {
    label: 'Anuncio',
    category: 'Comunicacion',
    variants: ['lower_third_compact', 'minimal', 'alert', 'clinic_card'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 8000,
  },
  social: {
    label: 'Social',
    category: 'Comunicacion',
    variants: ['lower_third_compact', 'minimal_handle', 'dual_channel'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 8000,
  },
  countdown: {
    label: 'Countdown',
    category: 'Comunicacion',
    variants: ['lower_third_compact', 'minimal_timer'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 12000,
  },
  'sponsor-break': {
    label: 'Sponsor',
    category: 'Comunicacion',
    variants: ['lower_third_compact', 'logo_only'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 10000,
  },
  substitution: {
    label: 'Sustitucion',
    category: 'Accion',
    variants: ['lower_third_compact', 'minimal'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 8000,
  },
  'game-event': {
    label: 'Evento Juego',
    category: 'Accion',
    variants: ['lower_third_compact', 'minimal'],
    defaultVariant: 'lower_third_compact',
    autoHideMs: 7000,
  },
};

const TRIGGER_GROUPS: Array<{ title: OverlayDefinition['category']; overlays: OverlayId[] }> = [
  { title: 'Juego', overlays: ['batter', 'next-batters', 'inning-transition', 'final-score'] },
  { title: 'Comunicacion', overlays: ['announcement', 'social', 'countdown', 'sponsor-break'] },
  { title: 'Accion', overlays: ['substitution', 'game-event'] },
];

const OUTPUT_OVERLAY_IDS: Array<'scorebug' | OverlayId> = [
  'scorebug',
  'batter',
  'next-batters',
  'inning-transition',
  'final-score',
  'announcement',
  'social',
  'countdown',
  'sponsor-break',
  'substitution',
  'game-event',
];

function outputOverlayLabel(overlayId: 'scorebug' | OverlayId): string {
  return overlayId === 'scorebug' ? 'Scorebug' : OVERLAYS[overlayId].label;
}

function buildOutputUrl(origin: string, overlayId: 'scorebug' | OverlayId): string {
  if (overlayId === 'scorebug') {
    return `${origin}/overlay/${overlayId}`;
  }

  return `${origin}/overlay/${overlayId}?variant=${OVERLAYS[overlayId].defaultVariant}`;
}

function formatClock(date = new Date()): string {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function formatVariantLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function actionLabel(action: HistoryAction): string {
  switch (action) {
    case 'preview_overlay':
      return 'Preview';
    case 'take_overlay':
      return 'Take';
    case 'hide_overlay':
      return 'Hide';
    case 'hide_all':
      return 'Hide All';
    case 'clear_preview':
      return 'Clear';
    default:
      return action;
  }
}

function CanvasFrame({
  title,
  subtitle,
  children,
  background,
  badge,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  background: string;
  badge?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-broadcast-black/80 p-4 shadow-broadcast">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-bebas text-2xl uppercase tracking-wide text-mineros-gold">{title}</p>
          <p className="text-xs text-white/55">{subtitle}</p>
        </div>
        {badge}
      </div>
      <div className="mx-auto h-[486px] w-[864px] overflow-hidden rounded-md border border-white/10 bg-black">
        <div className="h-full w-full" style={{ background }}>
          <div
            className="relative origin-top-left"
            style={{
              transform: 'scale(' + CANVAS_SCALE + ')',
              width: CANVAS_WIDTH + 'px',
              height: CANVAS_HEIGHT + 'px',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/overlay/:overlayId" element={<OverlayPage />} />
      <Route path="/control" element={<OperatorControlPanel />} />
      <Route path="/" element={<OperatorControlPanel />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

function OperatorControlPanel() {
  const engineRef = useRef<GameEngine | null>(null);
  const programTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!engineRef.current) {
    const engine = new GameEngine('demo-game-001', homeTeam, awayTeam);
    engine.startGame();
    engineRef.current = engine;
  }

  const engine = engineRef.current as GameEngine;
  const [game, setGame] = useState(() => engine.getState());
  const [previewOverlay, setPreviewOverlay] = useState<OverlayId | null>(null);
  const [previewVariant, setPreviewVariant] = useState('lower_third_compact');
  const [programOverlay, setProgramOverlay] = useState<OverlayId | null>(null);
  const [programVariant, setProgramVariant] = useState('lower_third_compact');
  const [onAir, setOnAir] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [batterIndex, setBatterIndex] = useState(0);
  const [latencyMs, setLatencyMs] = useState(24);
  const [autoHideEnabled, setAutoHideEnabled] = useState(true);
  const browserSourceOrigin = typeof window === 'undefined' ? 'http://localhost:5174' : window.location.origin;

  const copyToClipboard = useCallback((value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(value).catch(() => undefined);
  }, []);

  const clearProgramTimer = useCallback(() => {
    if (programTimerRef.current) {
      clearTimeout(programTimerRef.current);
      programTimerRef.current = null;
    }
  }, []);

  const addHistory = useCallback((action: HistoryAction, overlay: string) => {
    setHistory((current) => [{ action, overlay, time: formatClock() }, ...current].slice(0, 10));
  }, []);

  const overlayLabel = useCallback((overlayId: string) => {
    return overlayId in OVERLAYS ? OVERLAYS[overlayId as OverlayId].label : overlayId;
  }, []);

  const scheduleAutoHide = useCallback(
    (overlayId: OverlayId, variant: string) => {
      clearProgramTimer();

      const autoHideMs = OVERLAYS[overlayId].autoHideMs;
      if (!autoHideEnabled || !autoHideMs) {
        return;
      }

      programTimerRef.current = setTimeout(() => {
        setProgramOverlay((current) => {
          if (current !== overlayId) {
            return current;
          }

          addHistory('hide_overlay', overlayLabel(overlayId) + ' · ' + formatVariantLabel(variant));
          setOnAir(false);
          return null;
        });
      }, autoHideMs);
    },
    [addHistory, autoHideEnabled, clearProgramTimer, overlayLabel],
  );

  useEffect(() => {
    const syncGame = () => setGame(engine.getState());
    const rotateBatter = () => setBatterIndex((current) => (current + 1) % DEMO_BATTERS.length);
    const latencyInterval = setInterval(() => {
      setLatencyMs(18 + Math.floor(Math.random() * 12));
    }, 2500);

    engine.on('event', syncGame);
    engine.on('batter_changed', rotateBatter);

    return () => {
      engine.off('event', syncGame);
      engine.off('batter_changed', rotateBatter);
      clearInterval(latencyInterval);
      clearProgramTimer();
    };
  }, [clearProgramTimer, engine]);

  useEffect(() => {
    if (!programOverlay) {
      clearProgramTimer();
      return;
    }

    scheduleAutoHide(programOverlay, programVariant);
  }, [clearProgramTimer, programOverlay, programVariant, scheduleAutoHide]);

  const loadPreview = (overlayId: OverlayId) => {
    setPreviewOverlay(overlayId);
    setPreviewVariant(OVERLAYS[overlayId].defaultVariant);
    addHistory('preview_overlay', overlayLabel(overlayId));
  };

  const clearPreview = () => {
    setPreviewOverlay(null);
    setPreviewVariant('lower_third_compact');
    addHistory('clear_preview', '—');
  };

  const takeOverlay = () => {
    if (!previewOverlay) {
      return;
    }

    setProgramOverlay(previewOverlay);
    setProgramVariant(previewVariant);
    setOnAir(true);
    addHistory('take_overlay', overlayLabel(previewOverlay) + ' · ' + formatVariantLabel(previewVariant));
    scheduleAutoHide(previewOverlay, previewVariant);
  };

  const hideProgramOverlay = () => {
    if (!programOverlay) {
      return;
    }

    clearProgramTimer();
    addHistory('hide_overlay', overlayLabel(programOverlay));
    setProgramOverlay(null);
    setOnAir(false);
  };

  const hideAll = () => {
    clearProgramTimer();
    setProgramOverlay(null);
    setOnAir(false);
    addHistory('hide_all', 'Scorebug locked');
  };

  const previewVariants = previewOverlay ? OVERLAYS[previewOverlay].variants : [];
  const currentBatter = DEMO_BATTERS[batterIndex];
  const inningLabel = (game.inningHalf === 'top' ? 'Alta ' : 'Baja ') + game.inning;
  const basesLabel = [game.bases.first ? '1B' : null, game.bases.second ? '2B' : null, game.bases.third ? '3B' : null]
    .filter(Boolean)
    .join(' · ');

  const finalScoreData = useMemo(() => {
    const homeAhead = game.score.home >= game.score.away;

    return {
      gameId: 'demo-game-001',
      status: 'final' as const,
      winner: homeAhead
        ? { teamId: game.homeTeam.id, name: game.homeTeam.name, shortName: game.homeTeam.shortName, logoAssetId: game.homeTeam.logoAssetId }
        : { teamId: game.awayTeam.id, name: game.awayTeam.name, shortName: game.awayTeam.shortName, logoAssetId: game.awayTeam.logoAssetId },
      loser: homeAhead
        ? { teamId: game.awayTeam.id, name: game.awayTeam.name, shortName: game.awayTeam.shortName, logoAssetId: game.awayTeam.logoAssetId }
        : { teamId: game.homeTeam.id, name: game.homeTeam.name, shortName: game.homeTeam.shortName, logoAssetId: game.homeTeam.logoAssetId },
      finalScore: {
        winnerRuns: homeAhead ? game.score.home : game.score.away,
        loserRuns: homeAhead ? game.score.away : game.score.home,
      },
      lineScore: {
        winner: { runs: homeAhead ? game.score.home : game.score.away, hits: 9, errors: 1 },
        loser: { runs: homeAhead ? game.score.away : game.score.home, hits: 7, errors: 2 },
      },
      featuredPlayer: { playerId: 'p2', name: 'C. Jara', summary: '2-3 · 2 RBI · Doble' },
      context: { inningsPlayed: game.inning, label: 'Final ' + game.inning + ' entradas' },
    };
  }, [game]);

  const inningTransitionData = useMemo(
    () => ({
      gameId: 'demo-game-001',
      transition: {
        type: game.inningHalf === 'top' ? ('bottom_to_top' as const) : ('top_to_bottom' as const),
        label: 'Cambio de entrada',
        statusLabel: 'Fin ' + inningLabel,
        nextLabel: 'Siguiente ' + (game.inningHalf === 'top' ? 'Baja ' + game.inning : 'Alta ' + (game.inning + 1)),
      },
      inning: {
        number: game.inning,
        completedHalf: game.inningHalf,
        nextHalf: game.inningHalf === 'top' ? ('bottom' as const) : ('top' as const),
      },
      score: {
        home: { teamId: game.homeTeam.id, shortName: game.homeTeam.shortName, runs: game.score.home },
        away: { teamId: game.awayTeam.id, shortName: game.awayTeam.shortName, runs: game.score.away },
      },
      nextBattingTeam: {
        teamId: game.inningHalf === 'top' ? game.homeTeam.id : game.awayTeam.id,
        shortName: game.inningHalf === 'top' ? game.homeTeam.shortName : game.awayTeam.shortName,
        logoAssetId: game.inningHalf === 'top' ? game.homeTeam.logoAssetId : game.awayTeam.logoAssetId,
      },
      nextBattersSummary: 'Batean 6 · 7 · 8',
      context: {
        outs: game.outs,
        basesLabel: basesLabel || 'Bases limpias',
      },
    }),
    [basesLabel, game, inningLabel],
  );

  const announcementData = {
    announcement: {
      type: 'clinic' as const,
      title: 'Clinica gratuita de bateo',
      subtitle: 'Este sabado 10:00 - 13:00',
      detail: 'Cupo limitado - inscribirse antes del viernes',
      place: 'Estadio Antupiren',
      date: 'Sabado 14 jun',
      categories: '4 a 16 anos',
      action: 'Inscribete ya',
      socialHandle: '@clubminerosdesantiago',
    },
  };

  const sponsorData = {
    placement: { type: 'primary' as const, slot: 'between_innings' },
    sponsor: { sponsorId: 'sponsor-001', name: 'Merchise' },
    message: { title: 'Gracias', subtitle: 'Por apoyar a Mineros' },
    cta: { text: 'Siguenos', handle: '@clubminerosdesantiago' },
    context: { label: 'Entre entradas', durationSeconds: 10 },
  };

  const socialData = {
    social: {
      primaryHandle: '@clubminerosdesantiago',
      instagram: { handle: '@clubmineros', label: 'Fotos y reels' },
      youtube: { handle: 'Club Mineros', label: 'Partidos en vivo' },
    },
    message: {
      type: 'follow' as const,
      title: 'Siguenos en redes',
      subtitle: 'Contenido exclusivo del club',
      cta: 'Comparte el partido',
    },
  };

  const countdownData = {
    countdown: {
      targetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      type: 'game_start' as const,
      label: 'Inicio del partido',
    },
    event: {
      title: 'Mineros vs Rivales',
      subtitle: 'Liga Femenina 2025',
      venue: 'Estadio Antupiren',
      status: 'En breve',
    },
  };

  const substitutionData = {
    gameId: 'demo-game-001',
    substitution: { type: 'pitcher_change' as const, label: 'Cambio de lanzadora', reason: 'Relevo estrategico' },
    playerOut: { playerId: 'p-031', number: '31', name: 'L. Soto', position: 'P', detail: String(game.inning) + '.0 IP · 54 PIT' },
    playerIn: { playerId: 'p-007', number: '07', name: 'M. Castro', position: 'P' },
    inning: game.inning,
    inningHalf: game.inningHalf,
  };

  const gameEventData = {
    gameId: 'demo-game-001',
    event: { type: 'double' as const, label: 'DOBLE', description: 'Doble al jardin derecho', direction: 'Jardin derecho' },
    player: { playerId: 'p-012', number: '12', name: 'C. Jara', position: '2B', stat: 'B' + game.count.balls + ' · S' + game.count.strikes },
    scoreImpact: { team: game.homeTeam.shortName, change: 1, label: game.score.home === game.score.away ? 'Empata' : 'Amplia ventaja' },
    bases: { label: basesLabel || 'Bases limpias' },
  };

  const renderOverlay = (overlayId: OverlayId | null, variant: string) => {
    if (!overlayId) {
      return null;
    }

    switch (overlayId) {
      case 'batter':
        return <BatterOverlay batter={currentBatter} variant={variant as never} />;
      case 'next-batters':
        return (
          <NextBattersOverlay
            batters={[...DEMO_NEXT_BATTERS]}
            inning={{ number: game.inning, half: game.inningHalf }}
            team={{
              teamId: game.homeTeam.id,
              name: game.homeTeam.name,
              shortName: game.homeTeam.shortName,
              logoAssetId: game.homeTeam.logoAssetId,
            }}
            variant={variant as never}
          />
        );
      case 'inning-transition':
        return <InningTransitionOverlay data={inningTransitionData} variant={variant as never} />;
      case 'final-score':
        return <FinalScoreOverlay data={finalScoreData} variant={variant as never} />;
      case 'announcement':
        return <AnnouncementOverlay data={announcementData} variant={variant as never} />;
      case 'social':
        return <SocialLowerThirdOverlay data={socialData} variant={variant as never} />;
      case 'countdown':
        return <CountdownOverlay data={countdownData} variant={variant as never} />;
      case 'sponsor-break':
        return <SponsorBreakOverlay data={sponsorData} variant={variant as never} />;
      case 'substitution':
        return <SubstitutionOverlay data={substitutionData} variant={variant as never} />;
      case 'game-event':
        return <GameEventOverlay data={gameEventData} variant={variant as never} />;
      default:
        return null;
    }
  };

  const onAirBadgeClass =
    'inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ' +
    (onAir ? 'animate-pulse border-mineros-red bg-mineros-red text-white' : 'border-white/20 bg-white/10 text-white/70');

  const autoHideClass =
    'rounded-md border px-3 py-1 text-xs font-medium uppercase tracking-wide ' +
    (autoHideEnabled ? 'border-mineros-gold/40 bg-mineros-gold/15 text-mineros-gold' : 'border-white/15 bg-white/5 text-white/60');

  const takeClass =
    'rounded-md px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ' +
    (previewOverlay ? 'bg-mineros-red text-white hover:bg-red-700' : 'cursor-not-allowed bg-mineros-red/40 text-white opacity-50');

  const programBadgeClass =
    'rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ' +
    (programOverlay ? 'animate-pulse border-mineros-red bg-mineros-red text-white' : 'border-white/20 bg-white/10 text-white/70');

  const hideClass =
    'rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] ' +
    (programOverlay ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15' : 'cursor-not-allowed border border-white/10 bg-white/5 text-white/35');

  return (
    <div className="min-h-screen bg-broadcast-black text-white">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 p-6 font-inter">
        <header className="rounded-xl border border-white/10 bg-mineros-navy px-5 py-4 shadow-broadcast">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="font-bebas text-4xl uppercase tracking-wider text-mineros-gold">Mineros Broadcast</p>
                <p className="text-sm text-white/65">Operator Control Panel · Overlay Server Demo</p>
              </div>
              <span className={onAirBadgeClass}>
                <span className="mr-2 text-base leading-none">{onAir ? '●' : '○'}</span>
                {onAir ? 'On Air' : 'Off Air'}
              </span>
              <span className="inline-flex items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Conexion estable
              </span>
              <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/75">
                Latencia {latencyMs} ms
              </span>
              <span className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/75">
                Programa {programOverlay ? overlayLabel(programOverlay) : 'Scorebug only'}
              </span>
              <button type="button" onClick={() => setAutoHideEnabled((current) => !current)} className={autoHideClass}>
                Auto-hide {autoHideEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/45">Juego</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-white/10 px-2 py-1 font-semibold">{inningLabel}</span>
                  <button type="button" onClick={() => engine.advanceHalfInning()} className="rounded bg-white/10 px-2 py-1 text-xs font-medium hover:bg-white/20">
                    Avanzar
                  </button>
                  <button type="button" onClick={() => engine.endGame()} className="rounded bg-mineros-red/90 px-2 py-1 text-xs font-medium hover:bg-mineros-red">
                    Final
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/45">Marcador</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-white/10 px-2 py-1 font-semibold">{game.homeTeam.shortName} {game.score.home}</span>
                  <button type="button" onClick={() => engine.incrementScore('home')} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">+1</button>
                  <span className="rounded bg-white/10 px-2 py-1 font-semibold">{game.awayTeam.shortName} {game.score.away}</span>
                  <button type="button" onClick={() => engine.incrementScore('away')} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">+1</button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/45">Bases / Outs</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-white/10 px-2 py-1 font-semibold">Outs {game.outs}</span>
                  <button type="button" onClick={() => engine.addOut()} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">+ Out</button>
                  {(['first', 'second', 'third'] as const).map((base, index) => (
                    <button
                      key={base}
                      type="button"
                      onClick={() => engine.setBases({ [base]: !game.bases[base] })}
                      className={
                        'rounded px-2 py-1 text-xs font-medium ' +
                        (game.bases[base] ? 'bg-mineros-gold text-broadcast-black' : 'bg-white/10 text-white/70 hover:bg-white/20')
                      }
                    >
                      {index + 1}B
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/45">Conteo</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-white/10 px-2 py-1 font-semibold">B {game.count.balls} · S {game.count.strikes}</span>
                  <button type="button" onClick={() => engine.setCount({ balls: Math.min(game.count.balls + 1, 4) })} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">+B</button>
                  <button type="button" onClick={() => engine.setCount({ strikes: Math.min(game.count.strikes + 1, 3) })} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">+S</button>
                  <button type="button" onClick={() => engine.resetCount()} className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">Reset</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 2xl:grid-cols-2">
          <div className="space-y-4">
            <CanvasFrame
              title="Preview"
              subtitle={previewOverlay ? overlayLabel(previewOverlay) + ' · ' + formatVariantLabel(previewVariant) : 'Sin overlay preparado'}
              background="#111827"
              badge={
                previewOverlay ? (
                  <span className="rounded-md border border-mineros-gold/40 bg-mineros-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-mineros-gold">
                    Ready
                  </span>
                ) : undefined
              }
            >
              {renderOverlay(previewOverlay, previewVariant)}
            </CanvasFrame>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-broadcast">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <label htmlFor="variant" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                    Variante antes del Take
                  </label>
                  <select
                    id="variant"
                    value={previewVariant}
                    onChange={(event) => setPreviewVariant(event.target.value)}
                    disabled={!previewOverlay}
                    className="w-full rounded-md border border-white/15 bg-broadcast-black px-3 py-2 text-sm text-white outline-none transition focus:border-mineros-gold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {previewOverlay ? (
                      previewVariants.map((variant) => (
                        <option key={variant} value={variant}>
                          {formatVariantLabel(variant)}
                        </option>
                      ))
                    ) : (
                      <option value="lower_third_compact">Selecciona un overlay</option>
                    )}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={takeOverlay} disabled={!previewOverlay} className={takeClass}>
                    Take →
                  </button>
                  <button
                    type="button"
                    onClick={clearPreview}
                    className="rounded-md border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/15"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/55">Preview → Program es el unico flujo permitido. Scorebug vive bloqueado en Program.</p>
            </div>
          </div>

          <div className="space-y-4">
            <CanvasFrame
              title="Program"
              subtitle={programOverlay ? overlayLabel(programOverlay) + ' · ' + formatVariantLabel(programVariant) : 'Salida viva con Scorebug bloqueado'}
              background="#05070b"
              badge={<span className={programBadgeClass}>{programOverlay ? 'ON AIR' : 'OFF AIR'}</span>}
            >
              <div className="absolute inset-0">
                <Scorebug game={game} />
              </div>
              <div className="absolute inset-0">{renderOverlay(programOverlay, programVariant)}</div>
            </CanvasFrame>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-broadcast">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Program Actions</p>
                  <p className="mt-1 text-sm text-white/60">Hide All solo limpia overlays no persistentes. Scorebug permanece locked.</p>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={hideProgramOverlay} disabled={!programOverlay} className={hideClass}>
                    Hide Overlay
                  </button>
                  <button
                    type="button"
                    onClick={hideAll}
                    className="rounded-md bg-mineros-red px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white hover:bg-red-700"
                  >
                    Hide All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-mineros-navy/40 p-5 shadow-broadcast">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-bebas text-3xl uppercase tracking-wide text-mineros-gold">Overlay Triggers</p>
              <p className="text-sm text-white/60">Carga overlays en Preview y ajusta su variante antes del Take.</p>
            </div>
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65">
              Preview target
            </span>
          </div>

          <div className="space-y-4">
            {TRIGGER_GROUPS.map((group) => (
              <div key={group.title} className="grid gap-3 xl:grid-cols-[160px_1fr]">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <p className="font-bebas text-2xl uppercase tracking-wide text-white">{group.title}</p>
                </div>
                <div className="flex flex-wrap gap-3 rounded-lg border border-white/10 bg-broadcast-black/50 p-3">
                  {group.overlays.map((overlayId) => {
                    const active = previewOverlay === overlayId;
                    return (
                      <button
                        key={overlayId}
                        type="button"
                        onClick={() => loadPreview(overlayId)}
                        className={
                          'rounded-md px-4 py-3 text-sm font-semibold transition ' +
                          (active ? 'bg-mineros-gold text-broadcast-black' : 'border border-white/15 bg-white/10 text-white hover:bg-white/15')
                        }
                      >
                        {OVERLAYS[overlayId].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-broadcast">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-bebas text-3xl uppercase tracking-wide text-mineros-gold">Historial</p>
              <p className="text-sm text-white/60">Ultimas 10 acciones del operador.</p>
            </div>
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65">
              Auditado
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-[110px_160px_1fr] bg-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              <span>Hora</span>
              <span>Accion</span>
              <span>Detalle</span>
            </div>
            <div className="divide-y divide-white/10">
              {history.length > 0 ? (
                history.map((entry, index) => (
                  <div key={entry.time + '-' + entry.action + '-' + index} className="grid grid-cols-[110px_160px_1fr] px-4 py-3 text-sm text-white/80">
                    <span className="font-mono text-white/55">{entry.time}</span>
                    <span>{actionLabel(entry.action)}</span>
                    <span>{entry.overlay}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-sm text-white/50">Sin acciones registradas todavia.</div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-broadcast">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-bebas text-3xl uppercase tracking-wide text-mineros-gold">Browser Source URLs (OBS)</p>
              <p className="text-sm text-white/60">Cada overlay vive en su propia ruta, sin toolbar y con fondo transparente para Browser Source.</p>
            </div>
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/65">
              Output
            </span>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {OUTPUT_OVERLAY_IDS.map((overlayId) => {
              const outputUrl = buildOutputUrl(browserSourceOrigin, overlayId);
              return (
                <div key={overlayId} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-broadcast-black/50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{outputOverlayLabel(overlayId)}</p>
                    <code className="mt-2 block break-all rounded-md border border-white/10 bg-broadcast-black px-3 py-2 text-xs text-mineros-gold">
                      {outputUrl}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-white/50">
                      {overlayId === 'scorebug' ? 'Salida persistente sin variante.' : 'Incluye la variante por defecto; puedes cambiarla por querystring.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(outputUrl)}
                      className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/15"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
