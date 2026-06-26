import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GameState, InningHalf, TeamRole } from '@mineros/game-engine';
import { AnnouncementOverlay } from '@mineros/overlay-announcement';
import { BatterOverlay } from '@mineros/overlay-batter';
import { CountdownOverlay } from '@mineros/overlay-countdown';
import { FinalScoreOverlay } from '@mineros/overlay-final-score';
import { GameEventOverlay } from '@mineros/overlay-game-event';
import { InningTransitionOverlay } from '@mineros/overlay-inning-transition';
import { LineupOverlay } from '@mineros/overlay-lineup';
import { NextBattersOverlay } from '@mineros/overlay-next-batters';
import { PitcherOverlay } from '@mineros/overlay-pitcher';
import { Scorebug } from '@mineros/overlay-scorebug';
import { ScoreboardOverlay } from '@mineros/overlay-scoreboard';
import { SocialLowerThirdOverlay } from '@mineros/overlay-social-lower-third';
import { SponsorBreakOverlay } from '@mineros/overlay-sponsor-break';
import { SubstitutionOverlay } from '@mineros/overlay-substitution';

import { DEMO_GAME_DETAIL, createDemoGameState, findPlayerById } from '../gameConfig';
import { useBroadcastWS } from '../hooks/useBroadcastWS';
import { createScoreboardOverlayData } from '../scoreboardData';
import type { MatchMetadata } from '../matchMetadata';
import './BroadcastPage.css';

interface LivePlayerStats {
  playerId: string;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
}

interface LivePitcherStats {
  pitcherId: string;
  outs: number;
  ip: string;
  pitches: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  runsAllowed: number;
}

interface HalfInningMvp {
  playerId: string;
  name: string;
  number?: string;
  position?: string;
  hits: number;
  rbi: number;
}

interface HalfInningSequenceData {
  phase: 'outro' | 'sponsor' | 'intro' | 'end' | null;
  endedInning?: number;
  endedHalf?: InningHalf;
  runsScored?: number;
  hitsCount?: number;
  mvpBatter?: HalfInningMvp | null;
  score?: { home: number; away: number };
  batters?: Array<{ state: string; order: number; playerId: string; number?: string; name: string; position?: string }>;
  battingTeam?: { teamId: string; name: string; shortName: string };
  newInning?: number;
  newInningHalf?: InningHalf;
}

type VisibilityState = 'hidden' | 'preview' | 'live';

interface OverlayVisibility {
  scorebug: VisibilityState;
  batter: VisibilityState;
  pitcher: VisibilityState;
  'next-batters': VisibilityState;
  lineup: VisibilityState;
  'inning-transition': VisibilityState;
  'final-score': VisibilityState;
  'sponsor-break': VisibilityState;
  announcement: VisibilityState;
  social: VisibilityState;
  countdown: VisibilityState;
  substitution: VisibilityState;
  'game-event': VisibilityState;
  scoreboard: VisibilityState;
}

const DEFAULT_VISIBILITY: OverlayVisibility = {
  scorebug: 'live',
  batter: 'hidden',
  pitcher: 'hidden',
  'next-batters': 'hidden',
  lineup: 'hidden',
  'inning-transition': 'hidden',
  'final-score': 'hidden',
  'sponsor-break': 'hidden',
  announcement: 'hidden',
  social: 'hidden',
  countdown: 'hidden',
  substitution: 'hidden',
  'game-event': 'hidden',
  scoreboard: 'hidden',
};

const HIDDEN_VISIBILITY: OverlayVisibility = {
  scorebug: 'hidden',
  batter: 'hidden',
  pitcher: 'hidden',
  'next-batters': 'hidden',
  lineup: 'hidden',
  'inning-transition': 'hidden',
  'final-score': 'hidden',
  'sponsor-break': 'hidden',
  announcement: 'hidden',
  social: 'hidden',
  countdown: 'hidden',
  substitution: 'hidden',
  'game-event': 'hidden',
  scoreboard: 'hidden',
};

const OVERLAY_KEYS = Object.keys(DEFAULT_VISIBILITY) as Array<keyof OverlayVisibility>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getBroadcastWebSocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) {
    return configured.endsWith('/ws') ? configured : `${configured.replace(/\/$/, '')}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = import.meta.env.DEV ? 'localhost:3001' : window.location.host;
  return `${protocol}://${host}/ws`;
}

function getBattingRole(inningHalf: InningHalf): TeamRole {
  return inningHalf === 'top' ? 'away' : 'home';
}

function getPitchingRole(inningHalf: InningHalf): TeamRole {
  return inningHalf === 'top' ? 'home' : 'away';
}

function getTeamByRole(gameState: GameState, role: TeamRole) {
  return role === 'home' ? gameState.homeTeam : gameState.awayTeam;
}

function toOverlayTeam(team: GameState['homeTeam']) {
  return {
    teamId: team.id,
    name: team.name,
    shortName: team.shortName,
    logoAssetId: team.logoAssetId,
  };
}

function toPitcherThrows(playerId: string): 'R' | 'L' | undefined {
  const value = getPlayerStat(playerId, 'throws');
  return value === 'R' || value === 'L' ? value : undefined;
}

function getLineupPlayer(gameState: GameState, role: TeamRole, playerId: string | undefined) {
  const players = gameState.lineup[role];

  if (playerId) {
    const currentPlayer = players.find((player) => player.playerId === playerId);
    if (currentPlayer) {
      return currentPlayer;
    }
  }

  return players[0] ?? null;
}

function getPlayerStat(playerId: string, key: string): string | number | undefined {
  const player = findPlayerById(DEMO_GAME_DETAIL, playerId);
  const value = player?.stats[key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function getBatterData(gameState: GameState, liveStats: Record<string, LivePlayerStats>) {
  const battingRole = getBattingRole(gameState.inningHalf);
  const team = getTeamByRole(gameState, battingRole);
  const batter = getLineupPlayer(gameState, battingRole, gameState.currentBatterId);

  if (!batter) {
    return null;
  }

  const live = liveStats[batter.playerId];
  const todayStr = live ? `${live.hits}-${live.ab}` : '--';
  const avgStr = live && live.ab > 0 ? (live.hits / live.ab).toFixed(3).replace('0.', '.') : undefined;

  return {
    playerId: batter.playerId,
    number: batter.number,
    name: batter.name,
    position: batter.position,
    status: 'AL BATE',
    battingOrder: batter.order,
    teamId: team.id,
    photoAssetId: findPlayerById(DEMO_GAME_DETAIL, batter.playerId)?.photoAssetId,
    stats: {
      avg: avgStr ?? (typeof getPlayerStat(batter.playerId, 'avg') === 'string' ? (getPlayerStat(batter.playerId, 'avg') as string) : undefined),
      hits: live?.hits ?? (typeof getPlayerStat(batter.playerId, 'hits') === 'number' ? (getPlayerStat(batter.playerId, 'hits') as number) : undefined),
      rbi: live?.rbi ?? (typeof getPlayerStat(batter.playerId, 'rbi') === 'number' ? (getPlayerStat(batter.playerId, 'rbi') as number) : undefined),
      today: todayStr,
      obp: typeof getPlayerStat(batter.playerId, 'obp') === 'string' ? (getPlayerStat(batter.playerId, 'obp') as string) : undefined,
      slg: typeof getPlayerStat(batter.playerId, 'slg') === 'string' ? (getPlayerStat(batter.playerId, 'slg') as string) : undefined,
    },
  };
}

function getPitcherData(gameState: GameState, livePitcherStats: Record<string, LivePitcherStats>) {
  const pitchingRole = getPitchingRole(gameState.inningHalf);
  const team = getTeamByRole(gameState, pitchingRole);
  const pitchingLineup = gameState.lineup[pitchingRole];

  // Busca primero por currentPitcherId (coincidencia exacta), luego por posición P
  const pitcher =
    (gameState.currentPitcherId
      ? pitchingLineup.find((p) => p.playerId === gameState.currentPitcherId)
      : undefined) ??
    pitchingLineup.find((p) => p.position.toUpperCase() === 'P') ??
    null;

  if (!pitcher) {
    return null;
  }

  return {
    playerId: pitcher.playerId,
    number: pitcher.number,
    name: pitcher.name,
    teamId: team.id,
    photoAssetId: findPlayerById(DEMO_GAME_DETAIL, pitcher.playerId)?.photoAssetId,
    throws: toPitcherThrows(pitcher.playerId),
    stats: (() => {
      const live = livePitcherStats[pitcher.playerId];
      return {
        ip: live?.ip ?? (typeof getPlayerStat(pitcher.playerId, 'ip') === 'string' ? (getPlayerStat(pitcher.playerId, 'ip') as string) : undefined),
        pitches: live?.pitches ?? (typeof getPlayerStat(pitcher.playerId, 'pitches') === 'number' ? (getPlayerStat(pitcher.playerId, 'pitches') as number) : undefined),
        strikeouts: live?.strikeouts ?? (typeof getPlayerStat(pitcher.playerId, 'so') === 'number' ? (getPlayerStat(pitcher.playerId, 'so') as number) : undefined),
        walks: live?.walks ?? (typeof getPlayerStat(pitcher.playerId, 'bb') === 'number' ? (getPlayerStat(pitcher.playerId, 'bb') as number) : undefined),
        era: typeof getPlayerStat(pitcher.playerId, 'era') === 'string' ? (getPlayerStat(pitcher.playerId, 'era') as string) : undefined,
        lastPitch: 'Recta',
        lastPitchSpeed: '145 km/h',
      };
    })(),
  };
}

function getNextBattersData(gameState: GameState, liveStats: Record<string, LivePlayerStats>) {
  const battingRole = getBattingRole(gameState.inningHalf);
  const lineup = gameState.lineup[battingRole];

  if (lineup.length === 0) {
    return [];
  }

  const currentIndex = Math.max(
    0,
    lineup.findIndex((player) => player.playerId === gameState.currentBatterId),
  );

  return ['current', 'on_deck', 'in_the_hole'].map((state, offset) => {
    const player = lineup[(currentIndex + offset) % lineup.length];
    const playerData = findPlayerById(DEMO_GAME_DETAIL, player.playerId);
    const live = liveStats[player.playerId];

    // avg: prefer live computed from at-bats, fallback to demo static stat
    const liveAvg = live && live.ab > 0
      ? (live.hits / live.ab).toFixed(3).replace('0.', '.')
      : undefined;
    const staticAvg = typeof getPlayerStat(player.playerId, 'avg') === 'string'
      ? (getPlayerStat(player.playerId, 'avg') as string)
      : undefined;
    const avg = liveAvg ?? staticAvg;

    // today: H-AB de este juego
    const today = live ? `${live.hits}-${live.ab}` : undefined;

    return {
      state: state as 'current' | 'on_deck' | 'in_the_hole',
      order: player.order,
      playerId: player.playerId,
      number: player.number,
      name: player.name,
      position: player.position,
      photoAssetId: playerData?.photoAssetId,
      bats: playerData?.bats as 'R' | 'L' | 'S' | undefined,
      avg,
      today,
    };
  });
}

function toBasesLabel(gameState: GameState): string {
  const labels = [
    gameState.bases.first ? '1B' : null,
    gameState.bases.second ? '2B' : null,
    gameState.bases.third ? '3B' : null,
  ].filter(Boolean);

  return labels.length > 0 ? labels.join(' · ') : 'Bases limpias';
}

function normalizeOverlayId(value: string): keyof OverlayVisibility | null {
  if (value === 'social-lower-third') {
    return 'social';
  }

  return OVERLAY_KEYS.includes(value as keyof OverlayVisibility) ? (value as keyof OverlayVisibility) : null;
}

function readOverlayList(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function createVisibilityFromLists(liveOverlays: string[], previewOverlays: string[]): OverlayVisibility {
  const nextVisibility = { ...HIDDEN_VISIBILITY };

  for (const overlayId of previewOverlays) {
    const normalizedOverlayId = normalizeOverlayId(overlayId);
    if (normalizedOverlayId) {
      nextVisibility[normalizedOverlayId] = 'preview';
    }
  }

  for (const overlayId of liveOverlays) {
    const normalizedOverlayId = normalizeOverlayId(overlayId);
    if (normalizedOverlayId) {
      nextVisibility[normalizedOverlayId] = 'live';
    }
  }

  return nextVisibility;
}

const ANIM_DURATION = 600;

const ENTER_ANIM: Record<OverlayAnimIn, string> = {
  fade_in: 'ovFadeIn',
  slide_up: 'ovSlideUp',
  slide_down: 'ovSlideDown',
  slide_left: 'ovSlideLeft',
  slide_right: 'ovSlideRight',
  zoom_in: 'ovZoomIn',
};

const EXIT_ANIM: Record<OverlayAnimOut, string> = {
  fade_out: 'ovFadeOut',
  slide_up_out: 'ovSlideUpOut',
  slide_down_out: 'ovSlideDownOut',
  slide_left_out: 'ovSlideLeftOut',
  slide_right_out: 'ovSlideRightOut',
  zoom_out: 'ovZoomOut',
};

function OverlaySlot({
  visibility,
  animIn = 'fade_in',
  animOut = 'fade_out',
  children,
}: {
  visibility: VisibilityState;
  animIn?: OverlayAnimIn;
  animOut?: OverlayAnimOut;
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'visible' | 'leaving'>('hidden');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevVisRef = useRef<VisibilityState>('hidden');
  // Increments each enter → forces fresh DOM node via key so CSS animation always replays
  const enterIdRef = useRef(0);

  useEffect(() => {
    const prev = prevVisRef.current;
    prevVisRef.current = visibility;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (visibility === 'live') {
      enterIdRef.current += 1;
      setPhase('entering');
      timerRef.current = setTimeout(() => setPhase('visible'), ANIM_DURATION);
    } else if (visibility === 'preview') {
      setPhase('visible');
    } else {
      if (prev !== 'hidden') {
        setPhase('leaving');
        timerRef.current = setTimeout(() => setPhase('hidden'), ANIM_DURATION);
      }
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visibility]);

  if (phase === 'hidden') return null;

  // Inline animation style bypasses CSS class specificity issues
  const animation =
    phase === 'entering' ? `${ENTER_ANIM[animIn]} ${ANIM_DURATION}ms ease-out forwards` :
    phase === 'leaving'  ? `${EXIT_ANIM[animOut]} ${ANIM_DURATION}ms ease-in forwards` :
    undefined;

  return (
    <div
      // Same key through enter→visible→leave cycle; new key on each new enter → fresh DOM node
      key={`e${enterIdRef.current}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        animation,
        opacity: visibility === 'preview' ? 0.4 : undefined,
        outline: visibility === 'preview' ? '2px dashed rgba(255,255,0,0.5)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

export type OverlayAnimIn = 'fade_in' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom_in';
export type OverlayAnimOut = 'fade_out' | 'slide_up_out' | 'slide_down_out' | 'slide_left_out' | 'slide_right_out' | 'zoom_out';

interface LayoutZone {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  animIn?: OverlayAnimIn;
  animOut?: OverlayAnimOut;
}

const DEFAULT_ANIM_IN: Record<string, OverlayAnimIn> = {
  scorebug: 'slide_up',
  batter: 'slide_up',
  pitcher: 'slide_up',
  'next-batters': 'slide_up',
  lineup: 'slide_left',
  'inning-transition': 'fade_in',
  'final-score': 'zoom_in',
  announcement: 'slide_up',
  social: 'slide_up',
  countdown: 'fade_in',
  'sponsor-break': 'slide_up',
  substitution: 'slide_up',
  'game-event': 'slide_up',
  scoreboard: 'fade_in',
};

const DEFAULT_ANIM_OUT: Record<string, OverlayAnimOut> = {
  scorebug: 'slide_down_out',
  batter: 'fade_out',
  pitcher: 'fade_out',
  'next-batters': 'fade_out',
  lineup: 'slide_left_out',
  'inning-transition': 'fade_out',
  'final-score': 'zoom_out',
  announcement: 'fade_out',
  social: 'fade_out',
  countdown: 'fade_out',
  'sponsor-break': 'fade_out',
  substitution: 'fade_out',
  'game-event': 'fade_out',
  scoreboard: 'fade_out',
};

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

async function fetchActiveLayout(gameId: string): Promise<Record<string, LayoutZone>> {
  try {
    const res = await fetch(`${API_BASE}/layouts/active/${encodeURIComponent(gameId)}`);
    if (!res.ok) return {};
    const json = (await res.json()) as { payload?: { zones?: Record<string, LayoutZone> } };
    return json.payload?.zones ?? {};
  } catch {
    return {};
  }
}

const CANVAS_W = 1920;
const CANVAS_H = 1080;

export function BroadcastPage() {
  const { gameState, lastMessage } = useBroadcastWS(getBroadcastWebSocketUrl());
  const [visibility, setVisibility] = useState<OverlayVisibility>(DEFAULT_VISIBILITY);
  const [liveStats, setLiveStats] = useState<Record<string, LivePlayerStats>>({});
  const [livePitcherStats, setLivePitcherStats] = useState<Record<string, LivePitcherStats>>({});
  const [halfInningSeq, setHalfInningSeq] = useState<HalfInningSequenceData>({ phase: null });
  const [layoutZones, setLayoutZones] = useState<Record<string, LayoutZone>>({});
  const [matchMetadata, setMatchMetadata] = useState<MatchMetadata | undefined>(undefined);
  const seqBattersRef = useRef<HalfInningSequenceData['batters']>(undefined);
  const [canvasScale, setCanvasScale] = useState(1);

  // Escala el canvas para que quepa en el viewport del browser.
  // OBS renderiza a 1920x1080 exacto → scale es 1 y no hay cambio visual.
  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / CANVAS_W;
      const scaleY = window.innerHeight / CANVAS_H;
      setCanvasScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => { window.removeEventListener('resize', updateScale); };
  }, []);

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

  // Cargar zonas del layout activo cuando el gameId esté disponible
  useEffect(() => {
    const gid = gameState?.gameId;
    if (!gid) return;
    fetchActiveLayout(gid)
      .then((zones) => { if (Object.keys(zones).length > 0) setLayoutZones(zones); })
      .catch(() => undefined);
  }, [gameState?.gameId]);

  useEffect(() => {
    if (!isRecord(lastMessage)) {
      return;
    }

    if (lastMessage.type === 'show' && typeof lastMessage.overlay === 'string') {
      if (lastMessage.overlay === 'all') {
        setVisibility(createVisibilityFromLists(OVERLAY_KEYS, []));
        return;
      }

      const overlayId = normalizeOverlayId(lastMessage.overlay);
      if (overlayId) {
        setVisibility((currentVisibility) => ({ ...currentVisibility, [overlayId]: 'live' }));
      }
      return;
    }

    if (lastMessage.type === 'hide' && typeof lastMessage.overlay === 'string') {
      if (lastMessage.overlay === 'all') {
        // HideAll vuelve al estado base: scorebug visible, resto oculto
        setVisibility({ ...DEFAULT_VISIBILITY });
        return;
      }

      const overlayId = normalizeOverlayId(lastMessage.overlay);
      if (overlayId) {
        setVisibility((currentVisibility) => ({ ...currentVisibility, [overlayId]: 'hidden' }));
      }
      return;
    }

    if (lastMessage.type === 'state' && isRecord(lastMessage.payload)) {
      const topLevel = Array.isArray((lastMessage as Record<string, unknown>).visibleOverlays)
        ? ((lastMessage as Record<string, unknown>).visibleOverlays as string[])
        : null;
      const liveOverlays = topLevel ?? readOverlayList(lastMessage.payload.visibleOverlays);
      const previewOverlays = readOverlayList(lastMessage.payload.previewOverlays);

      if (liveOverlays !== null || previewOverlays) {
        setVisibility(createVisibilityFromLists(liveOverlays ?? [], previewOverlays ?? []));
      }
      return;
    }

    // Estadísticas en vivo por jugador
    if (lastMessage.type === 'player_stats' && isRecord(lastMessage.payload)) {
      setLiveStats(lastMessage.payload as Record<string, LivePlayerStats>);
      return;
    }

    // Estadísticas en vivo por pitcher
    if (lastMessage.type === 'pitcher_stats' && isRecord(lastMessage.payload)) {
      setLivePitcherStats(lastMessage.payload as Record<string, LivePitcherStats>);
      return;
    }

    // Secuencias automáticas de media entrada
    if (lastMessage.type === 'half_inning_sequence' && typeof lastMessage.phase === 'string') {
      const phase = lastMessage.phase as HalfInningSequenceData['phase'];
      const data = isRecord(lastMessage.data) ? lastMessage.data : {};

      if (phase === 'intro' && Array.isArray(data.batters)) {
        seqBattersRef.current = data.batters as HalfInningSequenceData['batters'];
      }

      setHalfInningSeq({
        phase,
        ...(isRecord(data.mvpBatter) || data.mvpBatter === null ? { mvpBatter: data.mvpBatter as HalfInningMvp | null } : {}),
        endedInning: typeof data.endedInning === 'number' ? data.endedInning : undefined,
        endedHalf: typeof data.endedHalf === 'string' ? (data.endedHalf as InningHalf) : undefined,
        runsScored: typeof data.runsScored === 'number' ? data.runsScored : undefined,
        hitsCount: typeof data.hitsCount === 'number' ? data.hitsCount : undefined,
        score: isRecord(data.score) ? (data.score as { home: number; away: number }) : undefined,
        batters: Array.isArray(data.batters) ? (data.batters as HalfInningSequenceData['batters']) : undefined,
        battingTeam: isRecord(data.battingTeam) ? (data.battingTeam as { teamId: string; name: string; shortName: string }) : undefined,
        newInning: typeof data.newInning === 'number' ? data.newInning : undefined,
        newInningHalf: typeof data.newInningHalf === 'string' ? (data.newInningHalf as InningHalf) : undefined,
      });
      return;
    }

    if (lastMessage.messageType === 'OVERLAY_COMMAND') {
      const payload = isRecord(lastMessage.payload) ? lastMessage.payload : {};
      const command = typeof payload.command === 'string' ? payload.command : typeof lastMessage.command === 'string' ? lastMessage.command : null;
      const overlayName =
        typeof payload.overlay === 'string'
          ? payload.overlay
          : typeof payload.overlayId === 'string'
            ? payload.overlayId
            : typeof lastMessage.overlay === 'string'
              ? lastMessage.overlay
              : typeof lastMessage.value === 'string'
                ? lastMessage.value
                : null;

      if (command === 'HideAll') {
        setVisibility({ ...DEFAULT_VISIBILITY });
        return;
      }

      if (!overlayName) {
        return;
      }

      const overlayId = normalizeOverlayId(overlayName);
      if (!overlayId) {
        return;
      }

      if (command === 'HideOverlay' || payload.state === 'hidden') {
        setVisibility((currentVisibility) => ({ ...currentVisibility, [overlayId]: 'hidden' }));
        return;
      }

      if (command === 'PreviewOverlay' || payload.state === 'preview' || payload.mode === 'preview') {
        setVisibility((currentVisibility) => ({ ...currentVisibility, [overlayId]: 'preview' }));
        return;
      }

      if (command === 'ShowOverlay' || command === 'Take' || payload.state === 'live' || payload.mode === 'live') {
        setVisibility((currentVisibility) => ({ ...currentVisibility, [overlayId]: 'live' }));
      }
    }
  }, [lastMessage]);

  const resolvedGameState = useMemo(() => gameState ?? createDemoGameState(), [gameState]);
  const batterData = useMemo(() => getBatterData(resolvedGameState, liveStats), [resolvedGameState, liveStats]);
  const pitcherData = useMemo(() => getPitcherData(resolvedGameState, livePitcherStats), [resolvedGameState, livePitcherStats]);
  const nextBattersData = useMemo(() => getNextBattersData(resolvedGameState, liveStats), [resolvedGameState, liveStats]);

  // Refs estables para evitar desmonte del OverlaySlot cuando los datos se actualizan brevemente a null/empty
  const lastBatterDataRef = useRef(batterData);
  const lastPitcherDataRef = useRef(pitcherData);
  const lastNextBattersRef = useRef(nextBattersData);
  if (batterData) lastBatterDataRef.current = batterData;
  if (pitcherData) lastPitcherDataRef.current = pitcherData;
  if (nextBattersData.length > 0) lastNextBattersRef.current = nextBattersData;
  const lineupRole = getBattingRole(resolvedGameState.inningHalf);
  const homeAhead = resolvedGameState.score.home >= resolvedGameState.score.away;
  const lineupTeam = toOverlayTeam(getTeamByRole(resolvedGameState, lineupRole));
  const winningTeam = toOverlayTeam(homeAhead ? resolvedGameState.homeTeam : resolvedGameState.awayTeam);
  const losingTeam = toOverlayTeam(homeAhead ? resolvedGameState.awayTeam : resolvedGameState.homeTeam);
  const lineupPlayers = useMemo(
    () =>
      resolvedGameState.lineup[lineupRole].map((player) => {
        const avg = getPlayerStat(player.playerId, 'avg');
        // Fallback: si el estado del servidor no tiene photoAssetId, lo buscamos en DEMO_GAME_DETAIL
        const photoAssetId = player.photoAssetId ?? findPlayerById(DEMO_GAME_DETAIL, player.playerId)?.photoAssetId;

        return {
          order: player.order,
          playerId: player.playerId,
          name: player.name,
          number: player.number,
          position: player.position,
          photoAssetId,
          avg: typeof avg === 'string' ? avg : undefined,
          status: player.status,
          isCurrentBatter: player.playerId === resolvedGameState.currentBatterId,
        };
      }),
    [lineupRole, resolvedGameState],
  );

  // Pitcher propio del equipo que está bateando (para mostrar en el card de lineup)
  const lineupPitcher = useMemo(() => {
    const pitcher = resolvedGameState.lineup[lineupRole].find((p) => p.position.toUpperCase() === 'P');
    if (!pitcher) return undefined;
    const photoAssetId = pitcher.photoAssetId ?? findPlayerById(DEMO_GAME_DETAIL, pitcher.playerId)?.photoAssetId;
    return { playerId: pitcher.playerId, name: pitcher.name, number: pitcher.number, photoAssetId };
  }, [lineupRole, resolvedGameState.lineup]);

  const basesLabel = useMemo(() => toBasesLabel(resolvedGameState), [resolvedGameState]);
  const scoreboardData = useMemo(
    () => createScoreboardOverlayData(DEMO_GAME_DETAIL, resolvedGameState, { liveStats, livePitcherStats, metadata: matchMetadata }),
    [livePitcherStats, liveStats, matchMetadata, resolvedGameState],
  );

  // Recargar metadata del partido cuando cambie el gameId o cuando se haya guardado
  useEffect(() => {
    const gameId = resolvedGameState.gameId;
    if (!gameId) return;
    const base = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
    fetch(`${base}/games/${encodeURIComponent(gameId)}/metadata`)
      .then((r) => r.json())
      .then((body: { result: string; payload: MatchMetadata }) => {
        if (body.result === 'ok') setMatchMetadata(body.payload);
      })
      .catch(() => undefined);
  }, [resolvedGameState.gameId]);

  const getZoneAnim = useCallback(
    (id: string): { animIn: OverlayAnimIn; animOut: OverlayAnimOut } => ({
      animIn: layoutZones[id]?.animIn ?? DEFAULT_ANIM_IN[id] ?? 'fade_in',
      animOut: layoutZones[id]?.animOut ?? DEFAULT_ANIM_OUT[id] ?? 'fade_out',
    }),
    [layoutZones],
  );

  // ── Image preloading ──────────────────────────────────────────────────────────
  // On mount: inject <link rel="preload"> for ALL known player photos and logos
  // so they're cached before the operator shows any overlay.
  useEffect(() => {
    const base = import.meta.env.VITE_ASSETS_BASE_URL as string | undefined;
    if (!base) return;

    const assetIds = new Set<string>();
    (['home', 'away'] as const).forEach((side) => {
      DEMO_GAME_DETAIL.lineups[side].forEach((p) => {
        if (p.photoAssetId) assetIds.add(p.photoAssetId);
      });
    });
    if (DEMO_GAME_DETAIL.homeTeam.logoAssetId) assetIds.add(DEMO_GAME_DETAIL.homeTeam.logoAssetId);
    if (DEMO_GAME_DETAIL.awayTeam.logoAssetId) assetIds.add(DEMO_GAME_DETAIL.awayTeam.logoAssetId);

    const links: HTMLLinkElement[] = [];
    assetIds.forEach((id) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = `${base}/${id}`;
      document.head.appendChild(link);
      links.push(link);
    });

    return () => links.forEach((l) => l.remove());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactive preload: when live game data changes, ensure new photos are cached
  useEffect(() => {
    const base = import.meta.env.VITE_ASSETS_BASE_URL as string | undefined;
    if (!base) return;
    const preload = (assetId: string | undefined) => {
      if (assetId) { const img = new Image(); img.src = `${base}/${assetId}`; }
    };
    preload(batterData?.photoAssetId);
    preload(pitcherData?.photoAssetId);
    preload(lineupTeam.logoAssetId);
    nextBattersData.forEach((b) => preload(b.photoAssetId));
  }, [batterData?.photoAssetId, pitcherData?.photoAssetId, lineupTeam.logoAssetId, nextBattersData]);

  // ZoneLayer: posiciona y escala el overlay dentro de su zona.
  // - Zona full-canvas con x/y != 0: traduce el contenido del overlay (desplazamiento).
  // - Zona parcial: container posicionado + capa interior escalada para caber en la zona.
  const ZoneLayer = useCallback(
    ({ overlayId, children }: { overlayId: string; children: React.ReactNode }) => {
      const z = layoutZones[overlayId];
      // Sin zona definida o zona default (0,0,1920,1080): posición natural
      if (!z || (z.x === 0 && z.y === 0 && z.width === CANVAS_W && z.height === CANVAS_H)) {
        return (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {children}
          </div>
        );
      }
      // Zona full-canvas con translate: desplaza el contenido sin escalar
      if (z.width >= CANVAS_W && z.height >= CANVAS_H) {
        return (
          <div style={{ position: 'absolute', left: z.x, top: z.y, width: z.width, height: z.height, pointerEvents: 'none' }}>
            {children}
          </div>
        );
      }
      // Zona parcial: escalar para caber
      const scale = Math.min(z.width / CANVAS_W, z.height / CANVAS_H);
      return (
        <div style={{ position: 'absolute', left: z.x, top: z.y, width: z.width, height: z.height, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: CANVAS_W, height: CANVAS_H, transformOrigin: '0 0', transform: `scale(${scale})`, pointerEvents: 'none' }}>
            {children}
          </div>
        </div>
      );
    },
    [layoutZones],
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${CANVAS_W * canvasScale}px`,
        height: `${CANVAS_H * canvasScale}px`,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <div
        className="broadcast-canvas"
        style={{
          background: 'transparent',
          transformOrigin: 'top left',
          transform: `scale(${canvasScale})`,
        }}
      >
      <ZoneLayer overlayId="scorebug">
        <OverlaySlot visibility={visibility.scorebug} {...getZoneAnim('scorebug')}>
          <Scorebug game={resolvedGameState} assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="scoreboard">
        <OverlaySlot visibility={visibility.scoreboard} {...getZoneAnim('scoreboard')}>
          <ScoreboardOverlay
            data={scoreboardData}
            assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL}
            isPaused={visibility.scoreboard !== 'live'}
          />
        </OverlaySlot>
      </ZoneLayer>

      {resolvedGameState.rules.hasPitcher && (
        <ZoneLayer overlayId="pitcher">
          <OverlaySlot visibility={visibility.pitcher} {...getZoneAnim('pitcher')}>
            {(pitcherData ?? lastPitcherDataRef.current) && (
              <PitcherOverlay pitcher={(pitcherData ?? lastPitcherDataRef.current)!} assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} />
            )}
          </OverlaySlot>
        </ZoneLayer>
      )}

      <ZoneLayer overlayId="batter">
        <OverlaySlot visibility={visibility.batter} {...getZoneAnim('batter')}>
          {(batterData ?? lastBatterDataRef.current) && (
            <BatterOverlay batter={(batterData ?? lastBatterDataRef.current)!} variant="lower_third" assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} />
          )}
        </OverlaySlot>
      </ZoneLayer>

      {(lastNextBattersRef.current.length > 0 || (halfInningSeq.phase === 'intro' && seqBattersRef.current)) && (
        <ZoneLayer overlayId="next-batters">
          <OverlaySlot visibility={visibility['next-batters']} {...getZoneAnim('next-batters')}>
            <NextBattersOverlay
              batters={
                halfInningSeq.phase === 'intro' && seqBattersRef.current
                  ? (seqBattersRef.current as typeof nextBattersData)
                  : (nextBattersData.length > 0 ? nextBattersData : lastNextBattersRef.current)
              }
              inning={{
                number: halfInningSeq.newInning ?? resolvedGameState.inning,
                half: halfInningSeq.newInningHalf ?? resolvedGameState.inningHalf,
              }}
              team={
                halfInningSeq.battingTeam
                  ? {
                      teamId: halfInningSeq.battingTeam.teamId,
                      name: halfInningSeq.battingTeam.name,
                      shortName: halfInningSeq.battingTeam.shortName,
                      // logoAssetId desde el lineupTeam real (battingTeam del seq no lo incluye)
                      logoAssetId: lineupTeam.logoAssetId,
                    }
                  : lineupTeam
              }
              assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL}
              variant="horizontal_compact"
            />
          </OverlaySlot>
        </ZoneLayer>
      )}

      {lineupPlayers.length > 0 && (
        <ZoneLayer overlayId="lineup">
          <OverlaySlot visibility={visibility.lineup} {...getZoneAnim('lineup')}>
            <LineupOverlay
              team={lineupTeam}
              players={lineupPlayers}
              assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL}
              pitcher={lineupPitcher}
            />
          </OverlaySlot>
        </ZoneLayer>
      )}

      <ZoneLayer overlayId="inning-transition">
        <OverlaySlot visibility={visibility['inning-transition']} {...getZoneAnim('inning-transition')}>
          <InningTransitionOverlay
            data={{
              gameId: resolvedGameState.gameId,
              transition: {
                type: resolvedGameState.inningHalf === 'top' ? 'top_to_bottom' : 'bottom_to_top',
                label: 'Cambio de entrada',
                statusLabel: `${resolvedGameState.inningHalf === 'top' ? 'Fin de la alta' : 'Fin de la baja'} ${resolvedGameState.inning}`,
                nextLabel:
                  resolvedGameState.inningHalf === 'top'
                    ? `Siguiente baja ${resolvedGameState.inning}`
                    : `Siguiente alta ${resolvedGameState.inning + 1}`,
              },
              inning: {
                number: resolvedGameState.inning,
                completedHalf: resolvedGameState.inningHalf,
                nextHalf: resolvedGameState.inningHalf === 'top' ? 'bottom' : 'top',
              },
              score: {
                home: {
                  teamId: resolvedGameState.homeTeam.id,
                  shortName: resolvedGameState.homeTeam.shortName,
                  runs: resolvedGameState.score.home,
                },
                away: {
                  teamId: resolvedGameState.awayTeam.id,
                  shortName: resolvedGameState.awayTeam.shortName,
                  runs: resolvedGameState.score.away,
                },
              },
              nextBattingTeam: {
                teamId: getTeamByRole(resolvedGameState, getPitchingRole(resolvedGameState.inningHalf)).id,
                shortName: getTeamByRole(resolvedGameState, getPitchingRole(resolvedGameState.inningHalf)).shortName,
                logoAssetId: getTeamByRole(resolvedGameState, getPitchingRole(resolvedGameState.inningHalf)).logoAssetId,
              },
              nextBattersSummary: nextBattersData.map((player) => player.order).join(' · '),
              context: {
                outs: resolvedGameState.outs,
                basesLabel,
              },
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="final-score">
        <OverlaySlot visibility={visibility['final-score']} {...getZoneAnim('final-score')}>
          <FinalScoreOverlay
            data={{
              gameId: resolvedGameState.gameId,
              status: 'final',
              winner: winningTeam,
              loser: losingTeam,
              finalScore: {
                winnerRuns: homeAhead ? resolvedGameState.score.home : resolvedGameState.score.away,
                loserRuns: homeAhead ? resolvedGameState.score.away : resolvedGameState.score.home,
              },
              lineScore: {
                winner: {
                  runs: homeAhead ? resolvedGameState.score.home : resolvedGameState.score.away,
                  hits: 9,
                  errors: 1,
                },
                loser: {
                  runs: homeAhead ? resolvedGameState.score.away : resolvedGameState.score.home,
                  hits: 7,
                  errors: 2,
                },
              },
              featuredPlayer: batterData
                ? {
                    playerId: batterData.playerId,
                    name: batterData.name,
                    summary: 'Figura del partido',
                  }
                : undefined,
              context: {
                inningsPlayed: resolvedGameState.inning,
                label: `Final ${resolvedGameState.inning} entradas`,
              },
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="countdown">
        <OverlaySlot visibility={visibility.countdown} {...getZoneAnim('countdown')}>
          <CountdownOverlay
            data={{
              countdown: {
                targetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                type: 'game_start',
                label: 'Inicio del partido',
              },
              event: {
                title: `${resolvedGameState.awayTeam.shortName} vs ${resolvedGameState.homeTeam.shortName}`,
                subtitle: 'Broadcast Mineros',
                venue: 'Estadio Cibao',
                status: 'En breve',
              },
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="sponsor-break">
        <OverlaySlot visibility={visibility['sponsor-break']} {...getZoneAnim('sponsor-break')}>
          <SponsorBreakOverlay
            data={{
              placement: { type: 'primary', slot: 'between_innings' },
              sponsor: { sponsorId: 'sponsor-001', name: 'Merchise' },
              message: { title: 'Gracias', subtitle: 'Por apoyar a Mineros' },
              cta: { text: 'Síguenos', handle: '@clubminerosdesantiago' },
              context: { label: 'Entre entradas', durationSeconds: 10 },
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="announcement">
        <OverlaySlot visibility={visibility.announcement} {...getZoneAnim('announcement')}>
          <AnnouncementOverlay
            data={{
              announcement: {
                type: 'club_notice',
                title: 'Clínica gratuita de bateo',
                subtitle: 'Este sábado 10:00 - 13:00',
                detail: 'Cupo limitado · inscripción abierta',
                place: 'Estadio Antupirén',
                date: 'Sábado 14 jun',
                action: 'Inscríbete ya',
                socialHandle: '@clubminerosdesantiago',
              },
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="social">
        <OverlaySlot visibility={visibility.social} {...getZoneAnim('social')}>
          <SocialLowerThirdOverlay
            data={{
              social: {
                primaryHandle: '@clubminerosdesantiago',
                instagram: { handle: '@clubmineros', label: 'Fotos y reels' },
                youtube: { handle: 'Club Mineros', label: 'Partidos en vivo' },
              },
              message: {
                type: 'follow',
                title: 'Síguenos en redes',
                subtitle: 'Contenido exclusivo del club',
                cta: 'Comparte la transmisión',
              },
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      <ZoneLayer overlayId="substitution">
        <OverlaySlot visibility={visibility.substitution} {...getZoneAnim('substitution')}>
          <SubstitutionOverlay
            data={{
              gameId: resolvedGameState.gameId,
              substitution: {
                type: 'pitcher_change',
                label: 'Cambio de lanzador',
                reason: 'Relevo estratégico',
              },
              playerOut: {
                playerId: pitcherData?.playerId ?? 'pitcher-out',
                number: pitcherData?.number,
                name: pitcherData?.name ?? 'Lanzador saliente',
                position: 'P',
                detail: `${resolvedGameState.inning}.0 IP`,
              },
              playerIn: {
                playerId: batterData?.playerId ?? 'player-in',
                number: batterData?.number,
                name: batterData?.name ?? 'Relevo',
                position: 'P',
              },
              inning: resolvedGameState.inning,
              inningHalf: resolvedGameState.inningHalf,
            }}
            variant="lower_third_compact"
          />
        </OverlaySlot>
      </ZoneLayer>

      {(batterData || halfInningSeq.mvpBatter) && (
        <ZoneLayer overlayId="game-event">
          <OverlaySlot visibility={visibility['game-event']} {...getZoneAnim('game-event')}>
            <GameEventOverlay
              data={
                halfInningSeq.phase === 'outro' && halfInningSeq.mvpBatter
                  ? {
                      // Modo outro: muestra la jugadora MVP de la entrada cerrada
                      gameId: resolvedGameState.gameId,
                      event: {
                        type: halfInningSeq.mvpBatter.rbi > 0 ? 'hit' : 'hit',
                        label: 'JUGADORA DEL INNING',
                        direction:
                          halfInningSeq.runsScored != null && halfInningSeq.hitsCount != null
                            ? halfInningSeq.runsScored > 0
                              ? `${halfInningSeq.runsScored} carrera${halfInningSeq.runsScored > 1 ? 's' : ''} · ${halfInningSeq.hitsCount} imparable${halfInningSeq.hitsCount > 1 ? 's' : ''}`
                              : `${halfInningSeq.hitsCount} imparable${halfInningSeq.hitsCount !== 1 ? 's' : ''} · Sin carreras`
                            : undefined,
                      },
                      player: {
                        playerId: halfInningSeq.mvpBatter.playerId,
                        number: halfInningSeq.mvpBatter.number,
                        name: halfInningSeq.mvpBatter.name,
                        position: halfInningSeq.mvpBatter.position,
                        stat: `${halfInningSeq.mvpBatter.hits}H · ${halfInningSeq.mvpBatter.rbi} RBI`,
                      },
                      scoreImpact: halfInningSeq.score
                        ? {
                            team: `${resolvedGameState.awayTeam.shortName} ${halfInningSeq.score.away} - ${halfInningSeq.score.home} ${resolvedGameState.homeTeam.shortName}`,
                            change: halfInningSeq.runsScored ?? 0,
                            label: halfInningSeq.endedHalf === 'top' ? `Alta ${halfInningSeq.endedInning}` : `Baja ${halfInningSeq.endedInning}`,
                          }
                        : undefined,
                    }
                  : {
                      // Modo normal: muestra la jugada actual del bateador
                      gameId: resolvedGameState.gameId,
                      event: {
                        type: 'double',
                        label: 'DOBLE',
                        description: 'Línea al jardín derecho',
                        direction: 'Jardín derecho',
                      },
                      player: {
                        playerId: batterData?.playerId ?? '',
                        number: batterData?.number,
                        name: batterData?.name ?? '',
                        position: batterData?.position,
                        stat: `B${resolvedGameState.count.balls} · S${resolvedGameState.count.strikes}`,
                      },
                      scoreImpact: {
                        team: getTeamByRole(resolvedGameState, lineupRole).shortName,
                        change: 1,
                        label: resolvedGameState.score.home === resolvedGameState.score.away ? 'Empata' : 'Amplía ventaja',
                      },
                      bases: {
                        label: basesLabel,
                      },
                    }
              }
              variant="lower_third_compact"
            />
          </OverlaySlot>
        </ZoneLayer>
      )}
      </div>
    </div>
  );
}
