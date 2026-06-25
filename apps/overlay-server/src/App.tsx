import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { GameEngine, type GameState } from '@mineros/game-engine';
import { BatterOverlay } from '@mineros/overlay-batter';
import { FinalScoreOverlay } from '@mineros/overlay-final-score';
import { InningTransitionOverlay } from '@mineros/overlay-inning-transition';
import { NextBattersOverlay } from '@mineros/overlay-next-batters';
import { Scorebug } from '@mineros/overlay-scorebug';
import { ScoreboardOverlay } from '@mineros/overlay-scoreboard';
import { SponsorBreakOverlay } from '@mineros/overlay-sponsor-break';
import { AnnouncementOverlay } from '@mineros/overlay-announcement';
import { SocialLowerThirdOverlay } from '@mineros/overlay-social-lower-third';
import { CountdownOverlay } from '@mineros/overlay-countdown';
import { SubstitutionOverlay } from '@mineros/overlay-substitution';
import { GameEventOverlay } from '@mineros/overlay-game-event';
import { LineupOverlay } from '@mineros/overlay-lineup';
import { PitcherOverlay } from '@mineros/overlay-pitcher';

import { GameConfigPanel } from './components/GameConfigPanel';
import { MatchMetadataEditor } from './components/MatchMetadataEditor';
import { LayoutEditor } from './components/LayoutEditor';
import { useBroadcastWS } from './hooks/useBroadcastWS';
import {
  DEMO_GAME_DETAIL,
  createCurrentBatterData,
  createDemoGameState,
  createNextBattersData,
  formatGameLabel,
  toGameLineup,
  toGameTeam,
  type GameConfigDetail,
} from './gameConfig';
import { BroadcastPage } from './pages/BroadcastPage';
import { createScoreboardOverlayData } from './scoreboardData';
import { OverlayPage } from './pages/OverlayPage';
import { ScorerPage } from './pages/ScorerPage';

const CANVAS_SCALE = 0.33;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

type OverlayId =
  | 'batter'
  | 'next-batters'
  | 'lineup'
  | 'pitcher'
  | 'inning-transition'
  | 'final-score'
  | 'announcement'
  | 'social'
  | 'countdown'
  | 'sponsor-break'
  | 'substitution'
  | 'game-event'
  | 'scoreboard';

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
  scoreboard: {
    label: 'Scoreboard',
    category: 'Juego',
    variants: ['full_board'],
    defaultVariant: 'full_board',
    autoHideMs: 12000,
  },
  lineup: {
    label: 'Lineup',
    category: 'Juego',
    variants: ['full', 'compact'],
    defaultVariant: 'full',
    autoHideMs: 12000,
  },
  pitcher: {
    label: 'Pitcher',
    category: 'Juego',
    variants: ['default'],
    defaultVariant: 'default',
    autoHideMs: 8000,
  },
};

const TRIGGER_GROUPS: Array<{ title: OverlayDefinition['category']; overlays: OverlayId[] }> = [
  { title: 'Juego', overlays: ['scoreboard', 'batter', 'next-batters', 'lineup', 'pitcher', 'inning-transition', 'final-score'] },
  { title: 'Comunicacion', overlays: ['announcement', 'social', 'countdown', 'sponsor-break'] },
  { title: 'Accion', overlays: ['substitution', 'game-event'] },
];

const OUTPUT_OVERLAY_IDS: Array<'scorebug' | OverlayId> = [
  'scorebug',
  'batter',
  'next-batters',
  'lineup',
  'pitcher',
  'inning-transition',
  'final-score',
  'announcement',
  'social',
  'countdown',
  'sponsor-break',
  'substitution',
  'game-event',
  'scoreboard',
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
  const W = Math.round(CANVAS_WIDTH * CANVAS_SCALE);
  const H = Math.round(CANVAS_HEIGHT * CANVAS_SCALE);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <span className="font-bebas text-lg uppercase tracking-wide text-mineros-gold">{title}</span>
          <span className="ml-2 text-[10px] text-white/40 truncate">{subtitle}</span>
        </div>
        {badge}
      </div>
      <div className="overflow-hidden rounded border border-white/10 bg-black" style={{ width: W, height: H }}>
        <div className="h-full w-full" style={{ background }}>
          <div
            className="relative origin-top-left"
            style={{ transform: `scale(${CANVAS_SCALE})`, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
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
      <Route path="/broadcast" element={<BroadcastPage />} />
      <Route path="/overlay/:overlayId" element={<OverlayPage />} />
      <Route path="/control" element={<OperatorControlPanel />} />
      <Route path="/scorer" element={<ScorerPage />} />
      <Route path="/" element={<OperatorControlPanel />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

// En Docker/producción la SPA se sirve desde el mismo origen que la API.
// En dev, Vite corre en :5173 y el servidor Node en :3001.
const SERVER_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
const SERVER_API = `${SERVER_BASE_URL}/command`;
const WS_URL = import.meta.env.DEV ? 'ws://localhost:3001' : `ws://${window.location.host}`;

type ApiSuccess<T> = {
  result: 'ok';
  payload: T;
};

type ApiError = {
  result: 'error';
  payload: {
    message: string;
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

function createLocalDemoEngine(): GameEngine {
  const engine = new GameEngine(DEMO_GAME_DETAIL.id, toGameTeam(DEMO_GAME_DETAIL.homeTeam), toGameTeam(DEMO_GAME_DETAIL.awayTeam));
  engine.startGame();
  engine.advanceHalfInning();
  engine.advanceHalfInning();
  engine.advanceHalfInning();
  engine.setScore(DEMO_GAME_DETAIL.score, 'overlay-server', 'demo-seed');
  engine.setOuts(DEMO_GAME_DETAIL.outs, 'overlay-server', 'demo-seed');
  engine.setBases(DEMO_GAME_DETAIL.bases, 'overlay-server');
  engine.setCount(DEMO_GAME_DETAIL.count);
  engine.setLineup(toGameLineup(DEMO_GAME_DETAIL.lineups));

  if (DEMO_GAME_DETAIL.currentBatterId) {
    engine.setCurrentBatter(DEMO_GAME_DETAIL.currentBatterId);
  }

  if (DEMO_GAME_DETAIL.currentPitcherId) {
    engine.setCurrentPitcher(DEMO_GAME_DETAIL.currentPitcherId);
  }

  return engine;
}

function isGameState(value: unknown): value is GameState {
  return typeof value === 'object' && value !== null && 'gameId' in value && 'score' in value;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, init);
    const body = (await response.json()) as ApiResponse<T>;

    if (body.result !== 'ok') {
      throw new Error(body.payload.message);
    }

    return body.payload;
  } catch {
    return null;
  }
}

function OperatorControlPanel() {
  const engineRef = useRef<GameEngine | null>(null);
  const programTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!engineRef.current) {
    engineRef.current = createLocalDemoEngine();
  }

  const engine = engineRef.current as GameEngine;
  const [game, setGame] = useState<GameState>(() => createDemoGameState());
  const [gameConfigDetail, setGameConfigDetail] = useState<GameConfigDetail>(DEMO_GAME_DETAIL);

  // Sincronización en tiempo real con el servidor vía WebSocket
  const { gameState: wsGameState, connected: wsConnected, lastMessage: wsLastMessage } = useBroadcastWS(WS_URL);
  useEffect(() => {
    if (wsGameState) {
      setGame(wsGameState);
      setServerAvailable(true);
    }
  }, [wsGameState]);

  // Preload all player photos and team logos on mount so overlay images appear instantly
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

  const [previewOverlay, setPreviewOverlay] = useState<OverlayId | null>(null);
  const [previewVariant, setPreviewVariant] = useState('lower_third_compact');
  const [programOverlay, setProgramOverlay] = useState<OverlayId | null>(null);
  const [programVariant, setProgramVariant] = useState('lower_third_compact');
  const [onAir, setOnAir] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [, setLatencyMs] = useState(24);
  const [autoHideEnabled, setAutoHideEnabled] = useState(true);
  const [serverAvailable, setServerAvailable] = useState(false);

  // Layout zones — mismo comportamiento que BroadcastPage
  const [layoutZones, setLayoutZones] = useState<Record<string, { x: number; y: number; width: number; height: number; visible: boolean }>>({});
  const [activeLayoutName, setActiveLayoutName] = useState<string>('Default');
  const [availableLayouts, setAvailableLayouts] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

  const reloadActiveLayout = useCallback(() => {
    if (!game.gameId) return;
    fetch(`${API_BASE}/layouts/active/${encodeURIComponent(game.gameId)}`)
      .then((r) => r.json())
      .then((body: { result?: string; payload?: { name?: string; zones?: Record<string, { x: number; y: number; width: number; height: number; visible: boolean }> } }) => {
        if (body.result === 'ok' && body.payload) {
          if (body.payload.zones) setLayoutZones(body.payload.zones);
          if (body.payload.name) setActiveLayoutName(body.payload.name);
        }
      })
      .catch(() => undefined);
  }, [API_BASE, game.gameId]);

  useEffect(() => { reloadActiveLayout(); }, [reloadActiveLayout]);

  useEffect(() => {
    fetch(`${API_BASE}/layouts`)
      .then((r) => r.json())
      .then((body: { result?: string; payload?: { id: string; name: string; isDefault: boolean }[] }) => {
        if (body.result === 'ok' && body.payload) setAvailableLayouts(body.payload);
      })
      .catch(() => undefined);
  }, [API_BASE]);

  const switchLayout = useCallback((layoutId: string) => {
    if (!game.gameId) return;
    fetch(`${API_BASE}/layouts/game/${encodeURIComponent(game.gameId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layoutId }),
    })
      .then(() => reloadActiveLayout())
      .catch(() => undefined);
  }, [API_BASE, game.gameId, reloadActiveLayout]);

  const zoneStyle = useCallback(
    (overlayId: string): React.CSSProperties => {
      const zone = layoutZones[overlayId];
      if (!zone) return { position: 'absolute', inset: 0 };
      return { position: 'absolute', left: zone.x, top: zone.y, width: zone.width, height: zone.height };
    },
    [layoutZones],
  );

  // Sincronizar programOverlay con el estado real del servidor (visibleOverlays)
  useEffect(() => {
    if (!wsLastMessage || typeof wsLastMessage !== 'object' || wsLastMessage === null) return;
    const msg = wsLastMessage as Record<string, unknown>;

    if (msg.type === 'state' && Array.isArray(msg.visibleOverlays)) {
      const overlays = msg.visibleOverlays as string[];
      const activeOverlay = overlays.find((o) => o in OVERLAYS) as OverlayId | undefined;
      if (activeOverlay) {
        setProgramOverlay(activeOverlay);
        setOnAir(true);
      } else {
        // Sin overlay activo (solo scorebug o vacío) → limpiar Program
        setProgramOverlay(null);
        setOnAir(false);
      }
    }

    if (msg.type === 'show' && typeof msg.overlay === 'string' && msg.overlay in OVERLAYS) {
      setProgramOverlay(msg.overlay as OverlayId);
      setOnAir(true);
    }

    if (msg.type === 'hide') {
      if (typeof msg.overlay === 'string' && msg.overlay !== 'all' && msg.overlay === programOverlay) {
        setProgramOverlay(null);
        setOnAir(false);
      } else if (msg.overlay === 'all') {
        setProgramOverlay(null);
        setOnAir(false);
      }
    }
  }, [wsLastMessage, programOverlay]);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [rightTab, setRightTab] = useState<'config' | 'history' | 'layout' | 'obs' | 'metadata'>('config');
  const handleResetGame = useCallback(async () => {
    setResetting(true);
    try {
      const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
      await fetch(`${API_BASE}/game/reset`, { method: 'POST' });
      setShowResetModal(false);
    } catch {
      // ignorar error — el WS actualizará el estado
    } finally {
      setResetting(false);
    }
  }, []);

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
          // Sincronizar con el servidor para que Broadcast también oculte el overlay
          const apiBase = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
          void fetch(`${apiBase}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'HideOverlay', value: overlayId }),
          }).catch(() => undefined);
          return null;
        });
      }, autoHideMs);
    },
    [addHistory, autoHideEnabled, clearProgramTimer, overlayLabel],
  );

  useEffect(() => {
    const latencyInterval = setInterval(() => {
      setLatencyMs(18 + Math.floor(Math.random() * 12));
    }, 2500);

    return () => {
      clearInterval(latencyInterval);
      clearProgramTimer();
    };
  }, [clearProgramTimer]);

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

  const applyOfflineCommand = useCallback(
    (command: string, value?: string) => {
      switch (command) {
        case 'IncrementScore':
          if (value === 'home' || value === 'away') {
            engine.incrementScore(value, 'overlay-server');
          }
          break;
        case 'AddOut':
          engine.addOut();
          break;
        case 'AddBall': {
          const currentCount = engine.getState().count;
          engine.setCount({ balls: currentCount.balls + 1 });
          break;
        }
        case 'AddStrike': {
          const currentCount = engine.getState().count;
          engine.setCount({ strikes: currentCount.strikes + 1 });
          break;
        }
        case 'ResetCount':
          engine.resetCount();
          break;
        case 'SetBase': {
          const [base, occupied] = value?.split(':', 2) ?? [];
          if (base === 'first' || base === 'second' || base === 'third') {
            engine.setBases({ [base]: occupied === 'true' });
          }
          break;
        }
        case 'AdvanceInning':
          engine.advanceHalfInning();
          break;
        case 'EndGame':
          engine.endGame();
          break;
        default:
          break;
      }

      setGame(engine.getState());
    },
    [engine],
  );

  const dispatchStateCommand = useCallback(
    async (command: string, value?: string) => {
      const payload = await requestJson<unknown>(SERVER_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, value }),
      });

      if (payload && isGameState(payload)) {
        setGame(payload);
        setServerAvailable(true);
        return;
      }

      if (!serverAvailable) {
        applyOfflineCommand(command, value);
      }
    },
    [applyOfflineCommand, serverAvailable],
  );

  const takeOverlay = () => {
    if (!previewOverlay) {
      return;
    }

    setProgramOverlay(previewOverlay);
    setProgramVariant(previewVariant);
    setOnAir(true);
    addHistory('take_overlay', overlayLabel(previewOverlay) + ' · ' + formatVariantLabel(previewVariant));
    scheduleAutoHide(previewOverlay, previewVariant);
    void requestJson(SERVER_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'ShowOverlay', value: previewOverlay }),
    });
  };

  const hideProgramOverlay = () => {
    if (!programOverlay) {
      return;
    }

    clearProgramTimer();
    addHistory('hide_overlay', overlayLabel(programOverlay));
    void requestJson(SERVER_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'HideOverlay', value: programOverlay }),
    });
    setProgramOverlay(null);
    setOnAir(false);
  };

  const hideAll = () => {
    clearProgramTimer();
    setProgramOverlay(null);
    setOnAir(false);
    addHistory('hide_all', 'Scorebug locked');
    void requestJson(SERVER_API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'HideAll' }),
    });
  };

  const previewVariants = previewOverlay ? OVERLAYS[previewOverlay].variants : [];
  const currentBatter = createCurrentBatterData(gameConfigDetail, game);
  const nextBatters = createNextBattersData(gameConfigDetail, game);
  const inningLabel = (game.inningHalf === 'top' ? 'Alta ' : 'Baja ') + game.inning;
  const basesLabel = [game.bases.first ? '1B' : null, game.bases.second ? '2B' : null, game.bases.third ? '3B' : null]
    .filter(Boolean)
    .join(' · ');

  const finalScoreData = useMemo(() => {
    const homeAhead = game.score.home >= game.score.away;

    return {
      gameId: game.gameId,
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
      gameId: game.gameId,
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
      title: formatGameLabel(gameConfigDetail.homeTeam, gameConfigDetail.awayTeam),
      subtitle: gameConfigDetail.season ?? 'Temporada actual',
      venue: gameConfigDetail.venue ?? 'Sede por confirmar',
      status: 'En breve',
    },
  };

  const substitutionData = {
    gameId: game.gameId,
    substitution: { type: 'pitcher_change' as const, label: 'Cambio de lanzadora', reason: 'Relevo estrategico' },
    playerOut: { playerId: 'p-031', number: '31', name: 'L. Soto', position: 'P', detail: String(game.inning) + '.0 IP · 54 PIT' },
    playerIn: { playerId: 'p-007', number: '07', name: 'M. Castro', position: 'P' },
    inning: game.inning,
    inningHalf: game.inningHalf,
  };

  const scoreboardData = useMemo(() => createScoreboardOverlayData(gameConfigDetail, game), [game, gameConfigDetail]);

  const gameEventData = {
    gameId: game.gameId,
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
        return currentBatter ? <BatterOverlay batter={currentBatter} variant={variant as never} assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} /> : null;
      case 'next-batters':
        return (
          <NextBattersOverlay
            batters={nextBatters}
            inning={{ number: game.inning, half: game.inningHalf }}
            team={{
              teamId: game.inningHalf === 'top' ? game.awayTeam.id : game.homeTeam.id,
              name: game.inningHalf === 'top' ? game.awayTeam.name : game.homeTeam.name,
              shortName: game.inningHalf === 'top' ? game.awayTeam.shortName : game.homeTeam.shortName,
              logoAssetId: game.inningHalf === 'top' ? game.awayTeam.logoAssetId : game.homeTeam.logoAssetId,
            }}
            variant={variant as never}
            assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL}
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
      case 'lineup': {
        const battingRole = game.inningHalf === 'top' ? 'away' : 'home';
        const battingTeam = game[battingRole === 'home' ? 'homeTeam' : 'awayTeam'];
        const lineupPlayers = DEMO_GAME_DETAIL.lineups[battingRole].map((p) => ({
          order: p.order,
          playerId: p.playerId,
          name: p.name,
          number: p.number,
          position: p.position,
          photoAssetId: p.photoAssetId,
          isCurrentBatter: p.playerId === game.currentBatterId,
          status: 'active' as const,
        }));
        const pitcherEntry = DEMO_GAME_DETAIL.lineups[battingRole].find((p) => p.position === 'P');
        return (
          <LineupOverlay
            team={{ teamId: battingTeam.id, name: battingTeam.name, shortName: battingTeam.shortName, logoAssetId: battingTeam.logoAssetId }}
            players={lineupPlayers}
            pitcher={pitcherEntry ? { playerId: pitcherEntry.playerId, name: pitcherEntry.name, number: pitcherEntry.number, photoAssetId: pitcherEntry.photoAssetId } : undefined}
            assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL}
          />
        );
      }
      case 'scoreboard':
        return <ScoreboardOverlay data={scoreboardData} assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} isPaused />;
      case 'pitcher': {
        const pitchingRole = game.inningHalf === 'top' ? 'home' : 'away';
        const pitchingLineup = DEMO_GAME_DETAIL.lineups[pitchingRole];
        // Busca por currentPitcherId exacto primero, luego por posición P
        const pitcherPlayer =
          (game.currentPitcherId
            ? pitchingLineup.find((p) => p.playerId === game.currentPitcherId)
            : undefined) ??
          pitchingLineup.find((p) => p.position === 'P') ??
          null;
        if (!pitcherPlayer) return null;
        return (
          <PitcherOverlay
            pitcher={{
              playerId: pitcherPlayer.playerId,
              name: pitcherPlayer.name,
              number: pitcherPlayer.number,
              teamId: game[pitchingRole === 'home' ? 'homeTeam' : 'awayTeam'].id,
              photoAssetId: pitcherPlayer.photoAssetId,
              throws: (pitcherPlayer.throws as 'R' | 'L' | undefined) ?? 'R',
            }}
            assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL}
          />
        );
      }
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

  return (
    <div className="h-screen overflow-hidden bg-broadcast-black font-inter text-white flex flex-col">

      {/* ── TOPBAR ── */}
      <header className="flex-none border-b border-white/10 bg-mineros-navy px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Identidad + status */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-bebas text-2xl uppercase tracking-widest text-mineros-gold">Mineros</span>
            {/* ON AIR = overlay activo visible al aire. OFF AIR = solo scorebug permanente */}
            <span className={onAirBadgeClass} title={onAir ? 'Overlay activo en transmisión' : 'Solo scorebug — sin overlay activo'}>
              <span className="mr-1.5 text-sm leading-none">{onAir ? '●' : '○'}</span>
              {onAir ? 'On Air' : 'Off Air'}
            </span>
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${wsConnected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/15 bg-white/5 text-white/50'}`}>
              {wsConnected ? 'WS ✓' : 'WS ✗'}
            </span>
            {/* Selector de layout activo */}
            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Layout</span>
              {availableLayouts.length > 1 ? (
                <select
                  className="bg-transparent text-[10px] font-semibold text-mineros-gold outline-none cursor-pointer"
                  value={availableLayouts.find((l) => l.name === activeLayoutName)?.id ?? ''}
                  onChange={(e) => { switchLayout(e.target.value); }}
                >
                  {availableLayouts.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}{l.isDefault ? ' ★' : ''}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[10px] font-semibold text-mineros-gold">{activeLayoutName}</span>
              )}
              <button
                type="button"
                title="Editar layout"
                onClick={() => setRightTab('layout')}
                className="text-white/30 hover:text-white/70 text-[10px] transition"
              >
                ✏
              </button>
            </div>
          </div>

          {/* Controles de juego: entrada + marcador + bases + outs + conteo */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Entrada */}
            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Entrada</span>
              <span className="font-bebas text-base text-white">{inningLabel}</span>
              <button type="button" onClick={() => void dispatchStateCommand('AdvanceInning')} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20">+</button>
              <button type="button" onClick={() => void dispatchStateCommand('EndGame')} className="rounded bg-mineros-red/80 px-1.5 py-0.5 text-[10px] hover:bg-mineros-red">Fin</button>
            </div>

            {/* Marcador */}
            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Marcador</span>
              <span className="font-bebas text-base text-white">{game.awayTeam.shortName} <span className="text-mineros-gold">{game.score.away}</span></span>
              <button type="button" onClick={() => void dispatchStateCommand('IncrementScore', 'away')} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20">+1</button>
              <span className="text-white/30">·</span>
              <span className="font-bebas text-base text-white">{game.homeTeam.shortName} <span className="text-mineros-gold">{game.score.home}</span></span>
              <button type="button" onClick={() => void dispatchStateCommand('IncrementScore', 'home')} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20">+1</button>
            </div>

            {/* Outs */}
            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Outs</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full border ${i < game.outs ? 'border-mineros-red bg-mineros-red' : 'border-white/30'}`} />
                ))}
              </div>
              <button type="button" onClick={() => void dispatchStateCommand('AddOut')} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20">+</button>
            </div>

            {/* Bases */}
            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Bases</span>
              {(['first', 'second', 'third'] as const).map((base, i) => (
                <button
                  key={base}
                  type="button"
                  onClick={() => void dispatchStateCommand('SetBase', `${base}:${String(!game.bases[base])}`)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${game.bases[base] ? 'bg-mineros-gold text-broadcast-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                >
                  {i + 1}B
                </button>
              ))}
            </div>

            {/* Conteo */}
            <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">B·S</span>
              <span className="font-bebas text-base text-blue-300">{game.count.balls}</span>
              <span className="text-white/30">·</span>
              <span className="font-bebas text-base text-red-300">{game.count.strikes}</span>
              <button type="button" onClick={() => void dispatchStateCommand('AddBall')} className="rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-300 hover:bg-blue-500/25">+B</button>
              <button type="button" onClick={() => void dispatchStateCommand('AddStrike')} className="rounded bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/25">+S</button>
              <button type="button" onClick={() => void dispatchStateCommand('ResetCount')} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-white/20">✕</button>
            </div>
          </div>

          {/* Acciones globales */}
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setAutoHideEnabled((c) => !c)} className={autoHideClass}>
              Auto-hide {autoHideEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-300 hover:bg-red-500/20"
            >
              ⟳ Reset
            </button>
          </div>
        </div>
      </header>

      {/* ── CUERPO PRINCIPAL ── */}
      <div className="flex-1 overflow-hidden flex gap-0 divide-x divide-white/10">

        {/* ── COLUMNA IZQUIERDA: Overlay Triggers (siempre visible) ── */}
        <aside className="w-52 shrink-0 overflow-y-auto p-3 space-y-3 bg-broadcast-black/60">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Overlays → Preview</p>

          {TRIGGER_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">{group.title}</p>
              <div className="flex flex-col gap-1">
                {group.overlays.map((overlayId) => {
                  const active = previewOverlay === overlayId;
                  return (
                    <button
                      key={overlayId}
                      type="button"
                      onClick={() => loadPreview(overlayId)}
                      className={`w-full rounded px-3 py-2 text-xs font-semibold text-left transition ${active ? 'bg-mineros-gold text-broadcast-black' : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20'}`}
                    >
                      {OVERLAYS[overlayId].label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-white/10 pt-3">
            <p className="mb-1 text-[10px] text-white/30">Programa activo</p>
            <p className="text-xs font-semibold text-white/70">{programOverlay ? overlayLabel(programOverlay) : '— Scorebug'}</p>
          </div>
        </aside>

        {/* ── CENTRO + DERECHA: condicional según tab activo ── */}
        {rightTab === 'layout' ? (
          /* Layout editor: ocupa toda la zona central + derecha */
          <LayoutEditor
            gameId={game.gameId}
            apiBase={import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'}
            onClose={() => setRightTab('config')}
            onLayoutChange={reloadActiveLayout}
          />
        ) : (
          <>
            {/* ── CENTRO: Preview + Program + controles ── */}
            <main className="flex-1 overflow-hidden flex flex-col p-3 gap-3 min-w-0">
          {/* Canvases lado a lado */}
          <div className="flex gap-3 items-start">
            {/* PREVIEW */}
            <div className="flex-1 min-w-0">
              <CanvasFrame
                title="Preview"
                subtitle={previewOverlay ? overlayLabel(previewOverlay) + ' · ' + formatVariantLabel(previewVariant) : 'Sin overlay'}
                background="#111827"
                badge={
                  previewOverlay ? (
                    <span className="rounded border border-mineros-gold/40 bg-mineros-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-mineros-gold">
                      Ready
                    </span>
                  ) : undefined
                }
              >
                <div style={previewOverlay ? zoneStyle(previewOverlay) : { position: 'absolute', inset: 0 }}>{renderOverlay(previewOverlay, previewVariant)}</div>
              </CanvasFrame>
            </div>

            {/* PROGRAM */}
            <div className="flex-1 min-w-0">
              <CanvasFrame
                title="Program"
                subtitle={programOverlay ? overlayLabel(programOverlay) + ' · ' + formatVariantLabel(programVariant) : 'Scorebug permanente'}
                background="#05070b"
                badge={<span className={programBadgeClass}>{programOverlay ? 'ON AIR' : 'OFF AIR'}</span>}
              >
                <div style={zoneStyle('scorebug')}>
                  <Scorebug game={game} assetBaseUrl={import.meta.env.VITE_ASSETS_BASE_URL} />
                </div>
                <div style={programOverlay ? zoneStyle(programOverlay) : { position: 'absolute', inset: 0 }}>{renderOverlay(programOverlay, programVariant)}</div>
              </CanvasFrame>
            </div>
          </div>

          {/* Controles de transición */}
          <div className="flex items-center gap-3 rounded border border-white/10 bg-white/5 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <label className="text-[10px] uppercase tracking-wider text-white/40">Variante</label>
              <select
                value={previewVariant}
                onChange={(e) => setPreviewVariant(e.target.value)}
                disabled={!previewOverlay}
                className="mt-0.5 block w-full rounded border border-white/10 bg-broadcast-black px-2 py-1.5 text-xs text-white outline-none focus:border-mineros-gold disabled:opacity-40"
              >
                {previewOverlay ? (
                  previewVariants.map((v) => <option key={v} value={v}>{formatVariantLabel(v)}</option>)
                ) : (
                  <option value="">Selecciona un overlay</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={takeOverlay} disabled={!previewOverlay} className={takeClass}>
                Take →
              </button>
              <button
                type="button"
                onClick={clearPreview}
                className="rounded border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15"
              >
                Clear
              </button>
              <button type="button" onClick={hideProgramOverlay} disabled={!programOverlay} className={`rounded px-4 py-2 text-xs font-semibold uppercase tracking-wide ${programOverlay ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15' : 'cursor-not-allowed opacity-35 border border-white/10 bg-white/5 text-white'}`}>
                Hide
              </button>
              <button
                type="button"
                onClick={hideAll}
                className="rounded bg-mineros-red px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-red-700"
              >
                Hide All
              </button>
            </div>
          </div>
        </main>

            {/* ── COLUMNA DERECHA: Tabs ── */}
            <aside className="w-80 shrink-0 flex flex-col overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-white/10 bg-broadcast-black/60">
            {(
              [
                { key: 'config', label: 'Config' },
                { key: 'metadata', label: 'Partido' },
                { key: 'history', label: 'Hist.' },
                { key: 'layout', label: 'Layout' },
                { key: 'obs', label: 'OBS' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setRightTab(tab.key)}
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-widest transition ${rightTab === tab.key ? 'border-b-2 border-mineros-gold text-mineros-gold' : 'text-white/40 hover:text-white/70'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {/* CONFIG */}
            {rightTab === 'config' && (
              <div className="p-3">
                <GameConfigPanel
                  onGameLoaded={(payload) => {
                    setGame(payload.state);
                    setGameConfigDetail(payload.game);
                    setServerAvailable(true);
                  }}
                />
              </div>
            )}

            {/* DATOS DEL PARTIDO */}
            {rightTab === 'metadata' && (
              <div className="p-3">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  Datos del partido · Competencia · Sponsors
                </p>
                <MatchMetadataEditor gameId={game.gameId} />
              </div>
            )}

            {/* HISTORIAL */}
            {rightTab === 'history' && (
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">Últimas acciones</p>
                <div className="overflow-hidden rounded border border-white/10">
                  <div className="grid grid-cols-[80px_90px_1fr] bg-white/5 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/35">
                    <span>Hora</span><span>Acción</span><span>Overlay</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {history.length > 0 ? history.map((entry, i) => (
                      <div key={entry.time + i} className="grid grid-cols-[80px_90px_1fr] px-2 py-2 text-xs text-white/70">
                        <span className="font-mono text-white/40 text-[10px]">{entry.time}</span>
                        <span>{actionLabel(entry.action)}</span>
                        <span className="truncate text-white/50">{entry.overlay}</span>
                      </div>
                    )) : (
                      <div className="px-3 py-4 text-xs text-white/35">Sin acciones.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LAYOUT — el editor ocupa el área principal cuando este tab está activo */}

            {/* OBS URLS */}
            {rightTab === 'obs' && (
              <div className="p-3 space-y-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">Browser Source URLs</p>
                {OUTPUT_OVERLAY_IDS.map((overlayId) => {
                  const outputUrl = buildOutputUrl(browserSourceOrigin, overlayId);
                  return (
                    <div key={overlayId} className="rounded border border-white/10 bg-broadcast-black/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white/80">{outputOverlayLabel(overlayId)}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(outputUrl)}
                          className="rounded border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/15 shrink-0"
                        >
                          Copiar
                        </button>
                      </div>
                      <code className="mt-1 block truncate text-[10px] text-mineros-gold/70">{outputUrl}</code>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
          </>
        )}
      </div>

      {/* ── MODAL RESET JUEGO ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-red-500/40 bg-[#1a0a0a] p-6 shadow-2xl">
            <p className="font-bebas text-2xl uppercase tracking-wide text-red-300">⚠ Reiniciar juego</p>
            <p className="mt-3 text-sm text-white/70">
              Esta acción borrará <strong className="text-white">todos los at-bats, estadísticas e historial</strong> del partido actual y restablecerá el marcador a 0-0, entrada 1.
            </p>
            <p className="mt-2 text-sm text-white/50">Los equipos y lineup se conservan.</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleResetGame()}
                disabled={resetting}
                className="flex-1 rounded-xl bg-[#D71920] px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {resetting ? 'Reiniciando…' : 'Sí, reiniciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
