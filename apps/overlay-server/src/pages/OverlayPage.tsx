import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DEFAULT_BASEBALL_RULES, type GameState, type GameTeam } from '@mineros/game-engine';
import { BatterOverlay } from '@mineros/overlay-batter';
import { FinalScoreOverlay } from '@mineros/overlay-final-score';
import { InningTransitionOverlay } from '@mineros/overlay-inning-transition';
import { LineupOverlay } from '@mineros/overlay-lineup';
import { NextBattersOverlay } from '@mineros/overlay-next-batters';
import { PitcherOverlay } from '@mineros/overlay-pitcher';
import { Scorebug } from '@mineros/overlay-scorebug';
import { SponsorBreakOverlay } from '@mineros/overlay-sponsor-break';
import { AnnouncementOverlay } from '@mineros/overlay-announcement';
import { SocialLowerThirdOverlay } from '@mineros/overlay-social-lower-third';
import { CountdownOverlay } from '@mineros/overlay-countdown';
import { SubstitutionOverlay } from '@mineros/overlay-substitution';
import { GameEventOverlay } from '@mineros/overlay-game-event';

type OverlayId =
  | 'scorebug'
  | 'batter'
  | 'pitcher'
  | 'lineup'
  | 'next-batters'
  | 'inning-transition'
  | 'final-score'
  | 'announcement'
  | 'social'
  | 'social-lower-third'
  | 'countdown'
  | 'sponsor-break'
  | 'substitution'
  | 'game-event';

type OverlayDefinition = {
  defaultVariant: string;
};

type OverlaySocketMessage = {
  type: 'state' | 'show' | 'hide';
  payload?: GameState;
  overlay?: string;
};

// En Docker/producción el server sirve todo desde el mismo origen.
// En dev apunta a localhost:3001 (puerto del servidor Node separado).
const WEBSOCKET_URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.DEV
    ? 'ws://localhost:3001'
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);
const MAX_RECONNECT_ATTEMPTS = 3;

const OVERLAYS: Record<Exclude<OverlayId, 'scorebug'>, OverlayDefinition> = {
  batter: { defaultVariant: 'lower_third' },
  pitcher: { defaultVariant: 'lower_third' },
  lineup: { defaultVariant: 'full' },
  'next-batters': { defaultVariant: 'horizontal_compact' },
  'inning-transition': { defaultVariant: 'lower_third_compact' },
  'final-score': { defaultVariant: 'lower_third_compact' },
  announcement: { defaultVariant: 'lower_third_compact' },
  social: { defaultVariant: 'lower_third_compact' },
  'social-lower-third': { defaultVariant: 'lower_third_compact' },
  countdown: { defaultVariant: 'lower_third_compact' },
  'sponsor-break': { defaultVariant: 'lower_third_compact' },
  substitution: { defaultVariant: 'lower_third_compact' },
  'game-event': { defaultVariant: 'lower_third_compact' },
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

const DEMO_PITCHER = {
  playerId: 'p10',
  number: '34',
  name: 'Roberto Fuentes',
  teamId: 'team-mineros',
  throws: 'R' as const,
  stats: { ip: '4.2', pitches: 78, strikeouts: 6, walks: 2, era: '2.45', lastPitch: 'Recta', lastPitchSpeed: '145 km/h' },
};

const DEMO_LINEUP_PLAYERS = [
  { order: 1, playerId: 'p1', name: 'Carolina Jara', number: '12', position: '2B', avg: '.385', status: 'active' as const, isCurrentBatter: true },
  { order: 2, playerId: 'p2', name: 'Martina Pellizaris', number: '15', position: '3B', avg: '.300', status: 'active' as const },
  { order: 3, playerId: 'p3', name: 'Valentina Rios', number: '08', position: 'SS', avg: '.278', status: 'active' as const },
  { order: 4, playerId: 'p4', name: 'Sofía Mendoza', number: '07', position: 'CF', avg: '.340', status: 'active' as const },
  { order: 5, playerId: 'p5', name: 'Andrea Torres', number: '23', position: '1B', avg: '.290', status: 'active' as const },
  { order: 6, playerId: 'p6', name: 'Camila Rojas', number: '11', position: 'LF', avg: '.265', status: 'active' as const },
  { order: 7, playerId: 'p7', name: 'Paula Vega', number: '18', position: 'RF', avg: '.255', status: 'active' as const },
  { order: 8, playerId: 'p8', name: 'Daniela Soto', number: '04', position: 'C', avg: '.230', status: 'active' as const },
  { order: 9, playerId: 'p9', name: 'Isidora Muñoz', number: '27', position: 'P', avg: '.100', status: 'active' as const },
];

function createDefaultGameState(): GameState {
  return {
    gameId: 'demo-game-001',
    status: 'live',
    homeTeam,
    awayTeam,
    inning: 5,
    inningHalf: 'top',
    outs: 1,
    bases: {
      first: true,
      second: false,
      third: false,
    },
    count: {
      balls: 2,
      strikes: 1,
    },
    score: {
      home: 3,
      away: 2,
    },
    rules: {
      ...DEFAULT_BASEBALL_RULES,
      mercyRule: [...DEFAULT_BASEBALL_RULES.mercyRule],
      extraInnings: { ...DEFAULT_BASEBALL_RULES.extraInnings },
    },
    currentBatterId: DEMO_BATTERS[0].playerId,
    currentPitcherId: 'p-031',
    lineup: {
      home: [],
      away: [],
    },
    eventLog: [],
    auditLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isOverlayId(value: string | undefined): value is OverlayId {
  const valid: OverlayId[] = ['scorebug', 'batter', 'pitcher', 'lineup', 'next-batters', 'inning-transition', 'final-score', 'announcement', 'social', 'social-lower-third', 'countdown', 'sponsor-break', 'substitution', 'game-event'];
  return valid.includes(value as OverlayId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSocketMessage(data: string): OverlaySocketMessage | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!isRecord(parsed) || typeof parsed.type !== 'string') {
      return null;
    }

    const message: OverlaySocketMessage = {
      type: parsed.type === 'state' || parsed.type === 'show' || parsed.type === 'hide' ? parsed.type : 'hide',
    };

    if ('payload' in parsed) {
      message.payload = parsed.payload as GameState;
    }

    if ('overlay' in parsed && typeof parsed.overlay === 'string') {
      message.overlay = parsed.overlay;
    }

    if (message.type === 'hide' && parsed.type !== 'hide' && parsed.type !== 'state' && parsed.type !== 'show') {
      return null;
    }

    return message;
  } catch {
    return null;
  }
}

function renderOverlay(overlayId: OverlayId, gameState: GameState, variant?: string) {
  const resolvedVariant = overlayId === 'scorebug' ? undefined : variant ?? OVERLAYS[overlayId].defaultVariant;
  const basesLabel = [gameState.bases.first ? '1B' : null, gameState.bases.second ? '2B' : null, gameState.bases.third ? '3B' : null]
    .filter(Boolean)
    .join(' · ');
  const inningLabel = (gameState.inningHalf === 'top' ? 'Alta ' : 'Baja ') + gameState.inning;
  const homeAhead = gameState.score.home >= gameState.score.away;

  const finalScoreData = {
    gameId: 'demo-game-001',
    status: 'final' as const,
    winner: homeAhead
      ? { teamId: gameState.homeTeam.id, name: gameState.homeTeam.name, shortName: gameState.homeTeam.shortName, logoAssetId: gameState.homeTeam.logoAssetId }
      : { teamId: gameState.awayTeam.id, name: gameState.awayTeam.name, shortName: gameState.awayTeam.shortName, logoAssetId: gameState.awayTeam.logoAssetId },
    loser: homeAhead
      ? { teamId: gameState.awayTeam.id, name: gameState.awayTeam.name, shortName: gameState.awayTeam.shortName, logoAssetId: gameState.awayTeam.logoAssetId }
      : { teamId: gameState.homeTeam.id, name: gameState.homeTeam.name, shortName: gameState.homeTeam.shortName, logoAssetId: gameState.homeTeam.logoAssetId },
    finalScore: {
      winnerRuns: homeAhead ? gameState.score.home : gameState.score.away,
      loserRuns: homeAhead ? gameState.score.away : gameState.score.home,
    },
    lineScore: {
      winner: { runs: homeAhead ? gameState.score.home : gameState.score.away, hits: 9, errors: 1 },
      loser: { runs: homeAhead ? gameState.score.away : gameState.score.home, hits: 7, errors: 2 },
    },
    featuredPlayer: { playerId: 'p2', name: 'C. Jara', summary: '2-3 · 2 RBI · Doble' },
    context: { inningsPlayed: gameState.inning, label: 'Final ' + gameState.inning + ' entradas' },
  };

  const inningTransitionData = {
    gameId: 'demo-game-001',
    transition: {
      type: gameState.inningHalf === 'top' ? ('bottom_to_top' as const) : ('top_to_bottom' as const),
      label: 'Cambio de entrada',
      statusLabel: 'Fin ' + inningLabel,
      nextLabel: 'Siguiente ' + (gameState.inningHalf === 'top' ? 'Baja ' + gameState.inning : 'Alta ' + (gameState.inning + 1)),
    },
    inning: {
      number: gameState.inning,
      completedHalf: gameState.inningHalf,
      nextHalf: gameState.inningHalf === 'top' ? ('bottom' as const) : ('top' as const),
    },
    score: {
      home: { teamId: gameState.homeTeam.id, shortName: gameState.homeTeam.shortName, runs: gameState.score.home },
      away: { teamId: gameState.awayTeam.id, shortName: gameState.awayTeam.shortName, runs: gameState.score.away },
    },
    nextBattingTeam: {
      teamId: gameState.inningHalf === 'top' ? gameState.homeTeam.id : gameState.awayTeam.id,
      shortName: gameState.inningHalf === 'top' ? gameState.homeTeam.shortName : gameState.awayTeam.shortName,
      logoAssetId: gameState.inningHalf === 'top' ? gameState.homeTeam.logoAssetId : gameState.awayTeam.logoAssetId,
    },
    nextBattersSummary: 'Batean 6 · 7 · 8',
    context: {
      outs: gameState.outs,
      basesLabel: basesLabel || 'Bases limpias',
    },
  };

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
    playerOut: { playerId: 'p-031', number: '31', name: 'L. Soto', position: 'P', detail: String(gameState.inning) + '.0 IP · 54 PIT' },
    playerIn: { playerId: 'p-007', number: '07', name: 'M. Castro', position: 'P' },
    inning: gameState.inning,
    inningHalf: gameState.inningHalf,
  };

  const gameEventData = {
    gameId: 'demo-game-001',
    event: { type: 'double' as const, label: 'DOBLE', description: 'Doble al jardin derecho', direction: 'Jardin derecho' },
    player: { playerId: 'p-012', number: '12', name: 'C. Jara', position: '2B', stat: 'B' + gameState.count.balls + ' · S' + gameState.count.strikes },
    scoreImpact: { team: gameState.homeTeam.shortName, change: 1, label: gameState.score.home === gameState.score.away ? 'Empata' : 'Amplia ventaja' },
    bases: { label: basesLabel || 'Bases limpias' },
  };

  switch (overlayId) {
    case 'scorebug':
      return <Scorebug game={gameState} />;
    case 'batter':
      return <BatterOverlay batter={DEMO_BATTERS[0]} variant={resolvedVariant as never} />;
    case 'pitcher':
      return <PitcherOverlay pitcher={DEMO_PITCHER} />;
    case 'lineup':
      return (
        <LineupOverlay
          team={{ teamId: gameState.homeTeam.id, name: gameState.homeTeam.name, shortName: gameState.homeTeam.shortName, logoAssetId: gameState.homeTeam.logoAssetId }}
          players={DEMO_LINEUP_PLAYERS}
          pitcher={DEMO_PITCHER}
        />
      );
    case 'next-batters':
      return (
        <NextBattersOverlay
          batters={[...DEMO_NEXT_BATTERS]}
          inning={{ number: gameState.inning, half: gameState.inningHalf }}
          team={{
            teamId: gameState.homeTeam.id,
            name: gameState.homeTeam.name,
            shortName: gameState.homeTeam.shortName,
            logoAssetId: gameState.homeTeam.logoAssetId,
          }}
          variant={resolvedVariant as never}
        />
      );
    case 'inning-transition':
      return <InningTransitionOverlay data={inningTransitionData} variant={resolvedVariant as never} />;
    case 'final-score':
      return <FinalScoreOverlay data={finalScoreData} variant={resolvedVariant as never} />;
    case 'announcement':
      return <AnnouncementOverlay data={announcementData} variant={resolvedVariant as never} />;
    case 'social':
    case 'social-lower-third':
      return <SocialLowerThirdOverlay data={socialData} variant={resolvedVariant as never} />;
    case 'countdown':
      return <CountdownOverlay data={countdownData} variant={resolvedVariant as never} />;
    case 'sponsor-break':
      return <SponsorBreakOverlay data={sponsorData} variant={resolvedVariant as never} />;
    case 'substitution':
      return <SubstitutionOverlay data={substitutionData} variant={resolvedVariant as never} />;
    case 'game-event':
      return <GameEventOverlay data={gameEventData} variant={resolvedVariant as never} />;
    default:
      return null;
  }
}

export function OverlayPage() {
  const { overlayId: routeOverlayId } = useParams<{ overlayId: string }>();
  const [searchParams] = useSearchParams();
  const variant = searchParams.get('variant') ?? undefined;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [visible, setVisible] = useState(true);
  const overlayId = isOverlayId(routeOverlayId) ? routeOverlayId : null;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlBackground = html.style.background;
    const previousBodyBackground = body.style.background;
    const previousBodyMargin = body.style.margin;
    const previousBodyOverflow = body.style.overflow;

    html.style.background = 'transparent';
    body.style.background = 'transparent';
    body.style.margin = '0';
    body.style.overflow = 'hidden';

    return () => {
      html.style.background = previousHtmlBackground;
      body.style.background = previousBodyBackground;
      body.style.margin = previousBodyMargin;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    setVisible(true);
  }, [overlayId]);

  useEffect(() => {
    if (!overlayId) {
      return undefined;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      socket = new WebSocket(WEBSOCKET_URL);

      socket.onopen = () => {
        reconnectAttempts = 0;
      };

      socket.onmessage = (event) => {
        const message = parseSocketMessage(event.data);
        if (!message) {
          return;
        }

        if (message.type === 'state' && message.payload) {
          setGameState(message.payload);
          return;
        }

        if (message.type === 'show' && (message.overlay === overlayId || message.overlay === 'all')) {
          setVisible(true);
          return;
        }

        if (message.type === 'hide' && (message.overlay === overlayId || message.overlay === 'all')) {
          setVisible(false);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (disposed || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          return;
        }

        const delay = 500 * 2 ** reconnectAttempts;
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [overlayId]);

  const resolvedGameState = useMemo(() => gameState ?? createDefaultGameState(), [gameState]);

  if (!overlayId || !visible) {
    return null;
  }

  return renderOverlay(overlayId, resolvedGameState, variant);
}
