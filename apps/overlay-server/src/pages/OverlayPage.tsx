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
import { ScoreboardOverlay } from '@mineros/overlay-scoreboard';
import { SponsorBreakOverlay } from '@mineros/overlay-sponsor-break';
import { AnnouncementOverlay } from '@mineros/overlay-announcement';
import { SocialLowerThirdOverlay } from '@mineros/overlay-social-lower-third';
import { CountdownOverlay } from '@mineros/overlay-countdown';
import { SubstitutionOverlay } from '@mineros/overlay-substitution';
import { GameEventOverlay } from '@mineros/overlay-game-event';

import { DEMO_GAME_DETAIL, findPlayerById, type GameConfigDetail } from '../gameConfig';
import { createScoreboardOverlayData } from '../scoreboardData';

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
  | 'game-event'
  | 'scoreboard';

type OverlayDefinition = {
  defaultVariant: string;
};

type OverlaySocketMessage = {
  type: 'state' | 'show' | 'hide';
  payload?: GameState;
  overlay?: string;
};

const WEBSOCKET_URL =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.DEV
    ? 'ws://localhost:3001'
    : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);
const MAX_RECONNECT_ATTEMPTS = 3;
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

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
  scoreboard: { defaultVariant: 'full_board' },
};

// ── Helpers para derivar datos de jugadores desde el gameConfig real ─────────

function getBattingRole(half: GameState['inningHalf']) {
  return half === 'top' ? 'away' : 'home';
}

function getPitchingRole(half: GameState['inningHalf']) {
  return half === 'top' ? 'home' : 'away';
}

function deriveBatterData(gameState: GameState, config: GameConfigDetail) {
  const role = getBattingRole(gameState.inningHalf);
  const lineup = gameState.lineup[role];
  const batter = gameState.currentBatterId
    ? lineup.find((p) => p.playerId === gameState.currentBatterId)
    : lineup[0];
  if (!batter) return null;
  const team = role === 'home' ? config.homeTeam : config.awayTeam;
  const playerConfig = findPlayerById(config, batter.playerId);
  const stats = playerConfig?.stats ?? {};
  return {
    playerId: batter.playerId,
    number: batter.number,
    name: batter.name,
    position: batter.position,
    status: 'AL BATE' as const,
    battingOrder: batter.order,
    teamId: team.id,
    photoAssetId: playerConfig?.photoAssetId,
    stats: {
      avg: typeof stats.avg === 'string' ? stats.avg : undefined,
      hits: typeof stats.hits === 'number' ? stats.hits : undefined,
      rbi: typeof stats.rbi === 'number' ? stats.rbi : undefined,
      today: '--',
    },
  };
}

function derivePitcherData(gameState: GameState, config: GameConfigDetail) {
  const role = getPitchingRole(gameState.inningHalf);
  const lineup = gameState.lineup[role];
  const pitcher =
    (gameState.currentPitcherId
      ? lineup.find((p) => p.playerId === gameState.currentPitcherId)
      : undefined) ??
    lineup.find((p) => p.position.toUpperCase() === 'P') ??
    null;
  if (!pitcher) return null;
  const team = role === 'home' ? config.homeTeam : config.awayTeam;
  const playerConfig = findPlayerById(config, pitcher.playerId);
  const stats = playerConfig?.stats ?? {};
  const throwsVal = playerConfig?.stats?.throws;
  return {
    playerId: pitcher.playerId,
    number: pitcher.number,
    name: pitcher.name,
    teamId: team.id,
    photoAssetId: playerConfig?.photoAssetId,
    throws: (throwsVal === 'R' || throwsVal === 'L' ? throwsVal : undefined) as 'R' | 'L' | undefined,
    stats: {
      ip: typeof stats.ip === 'string' ? stats.ip : undefined,
      pitches: typeof stats.pitches === 'number' ? stats.pitches : undefined,
      strikeouts: typeof stats.so === 'number' ? stats.so : undefined,
      walks: typeof stats.bb === 'number' ? stats.bb : undefined,
      era: typeof stats.era === 'string' ? stats.era : undefined,
      lastPitch: 'Recta',
      lastPitchSpeed: '145 km/h',
    },
  };
}

function deriveLineupData(gameState: GameState, config: GameConfigDetail) {
  const role = getBattingRole(gameState.inningHalf);
  const lineup = gameState.lineup[role];
  return lineup.map((p) => {
    const playerConfig = findPlayerById(config, p.playerId);
    return {
      order: p.order,
      playerId: p.playerId,
      name: p.name,
      number: p.number,
      position: p.position,
      photoAssetId: playerConfig?.photoAssetId,
      avg: typeof playerConfig?.stats?.avg === 'string' ? playerConfig.stats.avg : undefined,
      status: p.status as 'active' | 'substituted' | 'ejected',
      isCurrentBatter: p.playerId === gameState.currentBatterId,
    };
  });
}

function deriveNextBattersData(gameState: GameState, config: GameConfigDetail) {
  const role = getBattingRole(gameState.inningHalf);
  const lineup = gameState.lineup[role];
  if (lineup.length === 0) return [];
  const currentIndex = Math.max(0, lineup.findIndex((p) => p.playerId === gameState.currentBatterId));
  return (['current', 'on_deck', 'in_the_hole'] as const).map((state, offset) => {
    const player = lineup[(currentIndex + offset) % lineup.length];
    const playerConfig = findPlayerById(config, player.playerId);
    return {
      state,
      order: player.order,
      playerId: player.playerId,
      number: player.number,
      name: player.name,
      position: player.position,
      photoAssetId: playerConfig?.photoAssetId,
      bats: playerConfig?.bats as 'R' | 'L' | 'S' | undefined,
      avg: typeof playerConfig?.stats?.avg === 'string' ? playerConfig.stats.avg : undefined,
      today: undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

function createDefaultGameState(): GameState {
  const homeTeam: GameTeam = {
    id: DEMO_GAME_DETAIL.homeTeam.id,
    name: DEMO_GAME_DETAIL.homeTeam.name,
    shortName: DEMO_GAME_DETAIL.homeTeam.shortName,
    logoAssetId: DEMO_GAME_DETAIL.homeTeam.logoAssetId,
    role: 'home',
  };
  const awayTeam: GameTeam = {
    id: DEMO_GAME_DETAIL.awayTeam.id,
    name: DEMO_GAME_DETAIL.awayTeam.name,
    shortName: DEMO_GAME_DETAIL.awayTeam.shortName,
    logoAssetId: DEMO_GAME_DETAIL.awayTeam.logoAssetId,
    role: 'away',
  };
  return {
    gameId: DEMO_GAME_DETAIL.id,
    status: 'live',
    homeTeam,
    awayTeam,
    inning: DEMO_GAME_DETAIL.inning,
    inningHalf: DEMO_GAME_DETAIL.inningHalf,
    outs: DEMO_GAME_DETAIL.outs,
    bases: { ...DEMO_GAME_DETAIL.bases },
    count: { ...DEMO_GAME_DETAIL.count },
    score: { ...DEMO_GAME_DETAIL.score },
    rules: { ...DEFAULT_BASEBALL_RULES, mercyRule: [...DEFAULT_BASEBALL_RULES.mercyRule], extraInnings: { ...DEFAULT_BASEBALL_RULES.extraInnings } },
    currentBatterId: DEMO_GAME_DETAIL.currentBatterId,
    currentPitcherId: DEMO_GAME_DETAIL.currentPitcherId,
    lineup: {
      home: DEMO_GAME_DETAIL.lineups.home.map((p) => ({ playerId: p.playerId, number: p.number, name: p.name, position: p.position, order: p.order, status: p.status })),
      away: DEMO_GAME_DETAIL.lineups.away.map((p) => ({ playerId: p.playerId, number: p.number, name: p.name, position: p.position, order: p.order, status: p.status })),
    },
    eventLog: [],
    auditLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function isOverlayId(value: string | undefined): value is OverlayId {
  const valid: OverlayId[] = ['scorebug', 'scoreboard', 'batter', 'pitcher', 'lineup', 'next-batters', 'inning-transition', 'final-score', 'announcement', 'social', 'social-lower-third', 'countdown', 'sponsor-break', 'substitution', 'game-event'];
  return valid.includes(value as OverlayId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseSocketMessage(data: string): OverlaySocketMessage | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!isRecord(parsed) || typeof parsed.type !== 'string') return null;
    const message: OverlaySocketMessage = {
      type: parsed.type === 'state' || parsed.type === 'show' || parsed.type === 'hide' ? parsed.type : 'hide',
    };
    if ('payload' in parsed) message.payload = parsed.payload as GameState;
    if ('overlay' in parsed && typeof parsed.overlay === 'string') message.overlay = parsed.overlay;
    if (message.type === 'hide' && parsed.type !== 'hide' && parsed.type !== 'state' && parsed.type !== 'show') return null;
    return message;
  } catch {
    return null;
  }
}

function renderOverlay(overlayId: OverlayId, gameState: GameState, config: GameConfigDetail, variant?: string) {
  const resolvedVariant = overlayId === 'scorebug' ? undefined : variant ?? OVERLAYS[overlayId].defaultVariant;
  const basesLabel = [gameState.bases.first ? '1B' : null, gameState.bases.second ? '2B' : null, gameState.bases.third ? '3B' : null]
    .filter(Boolean).join(' · ');
  const inningLabel = (gameState.inningHalf === 'top' ? 'Alta ' : 'Baja ') + gameState.inning;
  const homeAhead = gameState.score.home >= gameState.score.away;

  const batterData = deriveBatterData(gameState, config);
  const pitcherData = derivePitcherData(gameState, config);
  const lineupPlayers = deriveLineupData(gameState, config);
  const nextBattersData = deriveNextBattersData(gameState, config);

  const battingRole = getBattingRole(gameState.inningHalf);
  const battingTeam = battingRole === 'home' ? config.homeTeam : config.awayTeam;
  const lineupPitcher = (() => {
    const p = gameState.lineup[battingRole].find((x) => x.position.toUpperCase() === 'P');
    if (!p) return undefined;
    return { playerId: p.playerId, name: p.name, number: p.number, photoAssetId: findPlayerById(config, p.playerId)?.photoAssetId };
  })();

  const finalScoreData = {
    gameId: gameState.gameId,
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
    featuredPlayer: batterData ? { playerId: batterData.playerId, name: batterData.name, summary: `${batterData.stats.today ?? '--'} · MVP` } : undefined,
    context: { inningsPlayed: gameState.inning, label: 'Final ' + gameState.inning + ' entradas' },
  };

  const inningTransitionData = {
    gameId: gameState.gameId,
    transition: {
      type: gameState.inningHalf === 'top' ? ('bottom_to_top' as const) : ('top_to_bottom' as const),
      label: 'Cambio de entrada',
      statusLabel: 'Fin ' + inningLabel,
      nextLabel: 'Siguiente ' + (gameState.inningHalf === 'top' ? 'Baja ' + gameState.inning : 'Alta ' + (gameState.inning + 1)),
    },
    inning: { number: gameState.inning, completedHalf: gameState.inningHalf, nextHalf: gameState.inningHalf === 'top' ? ('bottom' as const) : ('top' as const) },
    score: {
      home: { teamId: gameState.homeTeam.id, shortName: gameState.homeTeam.shortName, runs: gameState.score.home },
      away: { teamId: gameState.awayTeam.id, shortName: gameState.awayTeam.shortName, runs: gameState.score.away },
    },
    nextBattingTeam: {
      teamId: gameState.inningHalf === 'top' ? gameState.homeTeam.id : gameState.awayTeam.id,
      shortName: gameState.inningHalf === 'top' ? gameState.homeTeam.shortName : gameState.awayTeam.shortName,
      logoAssetId: gameState.inningHalf === 'top' ? gameState.homeTeam.logoAssetId : gameState.awayTeam.logoAssetId,
    },
    nextBattersSummary: nextBattersData.length > 0 ? nextBattersData.map((b) => b.number).join(' · ') : '',
    context: { outs: gameState.outs, basesLabel: basesLabel || 'Bases limpias' },
  };

  const announcementData = {
    announcement: {
      type: 'clinic' as const,
      title: 'Clinica gratuita de bateo',
      subtitle: 'Este sabado 10:00 - 13:00',
      detail: 'Cupo limitado - inscribirse antes del viernes',
      place: config.venue ?? 'Estadio',
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
    message: { type: 'follow' as const, title: 'Siguenos en redes', subtitle: 'Contenido exclusivo del club', cta: 'Comparte el partido' },
  };

  const countdownData = {
    countdown: { targetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), type: 'game_start' as const, label: 'Inicio del partido' },
    event: {
      title: `${config.awayTeam.shortName} vs ${config.homeTeam.shortName}`,
      subtitle: config.season ?? 'Temporada',
      venue: config.venue ?? 'Estadio',
      status: 'En breve',
    },
  };

  const substitutionData = {
    gameId: gameState.gameId,
    substitution: { type: 'pitcher_change' as const, label: 'Cambio de lanzadora', reason: 'Relevo estrategico' },
    playerOut: pitcherData
      ? { playerId: pitcherData.playerId, number: pitcherData.number, name: pitcherData.name, position: 'P', detail: `${String(gameState.inning)}.0 IP` }
      : { playerId: '', number: '--', name: '--', position: 'P', detail: '' },
    playerIn: { playerId: '', number: '--', name: 'Por confirmar', position: 'P' },
    inning: gameState.inning,
    inningHalf: gameState.inningHalf,
  };

  const scoreboardData = createScoreboardOverlayData(config, gameState);

  const gameEventData = {
    gameId: gameState.gameId,
    event: { type: 'double' as const, label: 'DOBLE', description: 'Doble al jardin derecho', direction: 'Jardin derecho' },
    player: batterData
      ? { playerId: batterData.playerId, number: batterData.number, name: batterData.name, position: batterData.position, stat: `B${gameState.count.balls} · S${gameState.count.strikes}` }
      : { playerId: '', number: '--', name: '--', position: '--', stat: '' },
    scoreImpact: { team: gameState.homeTeam.shortName, change: 1, label: gameState.score.home === gameState.score.away ? 'Empata' : 'Amplia ventaja' },
    bases: { label: basesLabel || 'Bases limpias' },
  };

  switch (overlayId) {
    case 'scorebug':
      return <Scorebug game={gameState} />;
    case 'scoreboard':
      return <ScoreboardOverlay data={scoreboardData} assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} isPaused />;
    case 'batter':
      return batterData ? <BatterOverlay batter={batterData} variant={resolvedVariant as never} /> : null;
    case 'pitcher':
      return pitcherData ? <PitcherOverlay pitcher={pitcherData} /> : null;
    case 'lineup':
      return (
        <LineupOverlay
          team={{ teamId: battingTeam.id, name: battingTeam.name, shortName: battingTeam.shortName, logoAssetId: battingTeam.logoAssetId }}
          players={lineupPlayers}
          pitcher={lineupPitcher}
        />
      );
    case 'next-batters':
      return (
        <NextBattersOverlay
          batters={nextBattersData}
          inning={{ number: gameState.inning, half: gameState.inningHalf }}
          team={{ teamId: battingTeam.id, name: battingTeam.name, shortName: battingTeam.shortName, logoAssetId: battingTeam.logoAssetId }}
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
  const [gameConfig, setGameConfig] = useState<GameConfigDetail>(DEMO_GAME_DETAIL);
  const [visible, setVisible] = useState(true);
  const overlayId = isOverlayId(routeOverlayId) ? routeOverlayId : null;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { htmlBg: html.style.background, bodyBg: body.style.background, margin: body.style.margin, overflow: body.style.overflow };
    html.style.background = 'transparent';
    body.style.background = 'transparent';
    body.style.margin = '0';
    body.style.overflow = 'hidden';
    return () => {
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
      body.style.margin = prev.margin;
      body.style.overflow = prev.overflow;
    };
  }, []);

  useEffect(() => { setVisible(true); }, [overlayId]);

  // Cargar config del partido cuando llega el gameId por WS
  useEffect(() => {
    const gid = gameState?.gameId;
    if (!gid) return;
    fetch(`${API_BASE}/games/${gid}`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: { game?: unknown } }>)
      .then((body) => {
        const cfg = body?.payload?.game;
        if (cfg && typeof cfg === 'object') setGameConfig(cfg as GameConfigDetail);
      })
      .catch(() => undefined);
  }, [gameState?.gameId]);

  useEffect(() => {
    if (!overlayId) return undefined;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(WEBSOCKET_URL);
      socket.onopen = () => { reconnectAttempts = 0; };
      socket.onmessage = (event) => {
        const message = parseSocketMessage(event.data as string);
        if (!message) return;
        if (message.type === 'state' && message.payload) { setGameState(message.payload); return; }
        if (message.type === 'show' && (message.overlay === overlayId || message.overlay === 'all')) { setVisible(true); return; }
        if (message.type === 'hide' && (message.overlay === overlayId || message.overlay === 'all')) { setVisible(false); }
      };
      socket.onerror = () => { socket?.close(); };
      socket.onclose = () => {
        if (disposed || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
        const delay = 500 * 2 ** reconnectAttempts;
        reconnectAttempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [overlayId]);

  const resolvedGameState = useMemo(() => gameState ?? createDefaultGameState(), [gameState]);

  if (!overlayId || !visible) return null;

  return renderOverlay(overlayId, resolvedGameState, gameConfig, variant);
}
