import type { Envelope, MessageType } from '@mineros/core';
import { GameEngine, type GameBases, type GameScore, type GameState, type TeamRole } from '@mineros/game-engine';

export type OverlayCommand =
  | 'ShowOverlay'
  | 'HideOverlay'
  | 'HideAll'
  | 'IncrementScore'
  | 'SetScore'
  | 'AddOut'
  | 'AddBall'
  | 'AddStrike'
  | 'ResetCount'
  | 'SetBase'
  | 'AdvanceInning'
  | 'StartGame'
  | 'EndGame'
  | 'SetBatter'
  | 'GetState';

export interface CommandResult {
  command: OverlayCommand;
  value?: string;
  data: unknown;
}

export interface StateMessage {
  type: 'state';
  payload: Readonly<GameState>;
}

export interface EventMessage {
  type: 'event';
  payload: Envelope<Record<string, unknown>>;
}

export type StoreMessage = StateMessage | EventMessage;
export type Subscriber = (message: StoreMessage) => void;

interface OverlayUiState {
  visibleOverlays: string[];
}

const AVAILABLE_OVERLAYS = [
  'batter',
  'next-batters',
  'scorebug',
  'inning-transition',
  'final-score',
  'sponsor-break',
  'announcement',
  'social-lower-third',
  'countdown',
  'substitution',
  'game-event',
] as const;

const DEMO_OPERATOR_ID = 'overlay-server';
const DEMO_REASON = 'remote-command';

function createEnvelope<T>(messageType: MessageType, source: string, target: string, payload: T): Envelope<T> {
  return {
    schemaVersion: '1.0.0',
    messageType,
    correlationId: `corr-${Date.now()}`,
    source,
    target,
    timestamp: new Date().toISOString(),
    payload,
  };
}

function assertNonEmpty(value: string | undefined, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function parseTeamRole(value: string | undefined): TeamRole {
  const normalized = assertNonEmpty(value, 'value');

  if (normalized !== 'home' && normalized !== 'away') {
    throw new Error('value must be "home" or "away"');
  }

  return normalized;
}

function parseScoreValue(value: string | undefined): Partial<GameScore> {
  const normalized = assertNonEmpty(value, 'value');
  const nextScore: Partial<GameScore> = {};

  for (const entry of normalized.split(',')) {
    const [teamRaw, scoreRaw] = entry.split(':', 2);
    const team = teamRaw?.trim();
    const scoreValue = scoreRaw?.trim();

    if (team !== 'home' && team !== 'away') {
      throw new Error('SetScore expects "home:<n>,away:<n>"');
    }

    const parsedScore = Number(scoreValue);
    if (!Number.isInteger(parsedScore) || parsedScore < 0) {
      throw new Error(`Invalid score for ${team}`);
    }

    nextScore[team] = parsedScore;
  }

  if (Object.keys(nextScore).length === 0) {
    throw new Error('SetScore requires at least one score value');
  }

  return nextScore;
}

function parseBooleanToken(value: string): boolean {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new Error('Boolean value must be "true" or "false"');
}

function parseBaseValue(value: string | undefined): Partial<GameBases> {
  const normalized = assertNonEmpty(value, 'value');
  const [baseRaw, occupiedRaw] = normalized.split(':', 2);
  const base = baseRaw?.trim();
  const occupied = occupiedRaw?.trim();

  if (base !== 'first' && base !== 'second' && base !== 'third') {
    throw new Error('SetBase expects "first:true", "second:false" or "third:true"');
  }

  if (!occupied) {
    throw new Error('SetBase requires a boolean value');
  }

  return { [base]: parseBooleanToken(occupied) } satisfies Partial<GameBases>;
}

function parseBatterValue(value: string | undefined): string {
  const normalized = assertNonEmpty(value, 'value');
  const [keyRaw, playerIdRaw] = normalized.split(':', 2);
  const key = keyRaw?.trim();
  const playerId = playerIdRaw?.trim();

  if (key !== 'playerId' || !playerId) {
    throw new Error('SetBatter expects "playerId:<id>"');
  }

  return playerId;
}

class StateStore {
  private readonly engine: GameEngine;
  private readonly subscribers = new Set<Subscriber>();
  private readonly visibleOverlays = new Set<string>();

  constructor() {
    this.engine = new GameEngine(
      'game-demo-001',
      {
        id: 'team-mineros',
        name: 'Mineros de Santiago',
        shortName: 'MIN',
        logoAssetId: 'AM-LOGO-001',
        role: 'home',
      },
      {
        id: 'team-rival',
        name: 'Rivales',
        shortName: 'RIV',
        logoAssetId: 'AM-LOGO-002',
        role: 'away',
      },
    );

    this.engine.on('event', (event) => {
      this.emitEvent(event.eventType, {
        gameEvent: event,
        ui: this.getUiState(),
      });
      this.broadcast();
    });
  }

  getState(): Readonly<GameState> {
    return this.engine.getState();
  }

  getAvailableOverlays(): string[] {
    return [...AVAILABLE_OVERLAYS];
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  broadcast(): void {
    const message: StateMessage = {
      type: 'state',
      payload: this.getState(),
    };

    for (const subscriber of this.subscribers) {
      subscriber(message);
    }
  }

  sendCommand(command: string, value?: string): CommandResult {
    switch (command) {
      case 'ShowOverlay': {
        const overlayName = assertNonEmpty(value, 'value');
        this.visibleOverlays.add(overlayName);
        this.emitEvent('overlay_shown', {
          overlay: overlayName,
          ui: this.getUiState(),
        });
        this.broadcast();
        return { command, value: overlayName, data: this.getUiState() };
      }
      case 'HideOverlay': {
        const overlayName = assertNonEmpty(value, 'value');
        this.visibleOverlays.delete(overlayName);
        this.emitEvent('overlay_hidden', {
          overlay: overlayName,
          ui: this.getUiState(),
        });
        this.broadcast();
        return { command, value: overlayName, data: this.getUiState() };
      }
      case 'HideAll': {
        this.visibleOverlays.clear();
        this.emitEvent('overlay_hidden_all', {
          ui: this.getUiState(),
        });
        this.broadcast();
        return { command: 'HideAll', data: this.getUiState() };
      }
      case 'IncrementScore': {
        const team = parseTeamRole(value);
        this.engine.incrementScore(team, DEMO_OPERATOR_ID);
        return { command, value: team, data: this.getState() };
      }
      case 'SetScore': {
        const nextScore = parseScoreValue(value);
        this.engine.setScore(nextScore, DEMO_OPERATOR_ID, DEMO_REASON);
        return { command, value, data: this.getState() };
      }
      case 'AddOut': {
        this.engine.addOut();
        return { command, data: this.getState() };
      }
      case 'AddBall': {
        const currentCount = this.engine.getState().count;
        this.engine.setCount({ balls: currentCount.balls + 1 });
        return { command, data: this.getState() };
      }
      case 'AddStrike': {
        const currentCount = this.engine.getState().count;
        this.engine.setCount({ strikes: currentCount.strikes + 1 });
        return { command, data: this.getState() };
      }
      case 'ResetCount': {
        this.engine.resetCount();
        return { command, data: this.getState() };
      }
      case 'SetBase': {
        const bases = parseBaseValue(value);
        this.engine.setBases(bases, DEMO_OPERATOR_ID);
        return { command, value, data: this.getState() };
      }
      case 'AdvanceInning': {
        this.engine.advanceHalfInning();
        return { command, data: this.getState() };
      }
      case 'StartGame': {
        this.engine.startGame();
        return { command, data: this.getState() };
      }
      case 'EndGame': {
        this.engine.endGame();
        return { command, data: this.getState() };
      }
      case 'SetBatter': {
        const batterId = parseBatterValue(value);
        this.engine.setCurrentBatter(batterId);
        return { command, value: batterId, data: this.getState() };
      }
      case 'GetState': {
        return { command, data: this.getState() };
      }
      default:
        throw new Error(`Unsupported command: ${command}`);
    }
  }

  private getUiState(): OverlayUiState {
    return {
      visibleOverlays: [...this.visibleOverlays],
    };
  }

  private emitEvent(eventType: string, payload: Record<string, unknown>): void {
    const message: EventMessage = {
      type: 'event',
      payload: createEnvelope('event', 'OverlayServer', 'OverlayClients', {
        eventType,
        ...payload,
      }),
    };

    for (const subscriber of this.subscribers) {
      subscriber(message);
    }
  }
}

export const stateStore = new StateStore();
