import { createAuditEntry } from './audit';
import type {
  GameRules,
  GameBases,
  GameCount,
  GameEvent,
  GameEventType,
  GameLineup,
  GameScore,
  GameState,
  GameTeam,
} from './types';
import { DEFAULT_BASEBALL_RULES } from './types';
import { validateBases, validateCount, validateIdentifier, validateLineup, validateOuts, validateScore, validateTeam } from './validators';

const EMPTY_BASES: GameBases = { first: false, second: false, third: false };
const EMPTY_COUNT: GameCount = { balls: 0, strikes: 0 };
type GameEngineEventName = GameEventType | 'event';
type GameEngineListener = (event: GameEvent) => void;

export class GameEngine {
  private state: GameState;
  private eventSequence = 0;
  private auditSequence = 0;
  private listeners: Partial<Record<GameEngineEventName, Set<GameEngineListener>>> = {};

  constructor(gameId: string, homeTeam: GameTeam, awayTeam: GameTeam, rules?: Partial<GameRules>) {
    validateIdentifier(gameId, 'gameId');

    const normalizedHomeTeam: GameTeam = { ...homeTeam, role: 'home' };
    const normalizedAwayTeam: GameTeam = { ...awayTeam, role: 'away' };

    validateTeam(normalizedHomeTeam, 'home');
    validateTeam(normalizedAwayTeam, 'away');

    const timestamp = this.now();

    this.state = {
      gameId,
      status: 'scheduled',
      homeTeam: normalizedHomeTeam,
      awayTeam: normalizedAwayTeam,
      inning: 1,
      inningHalf: 'top',
      outs: 0,
      bases: this.clone(EMPTY_BASES),
      count: this.clone(EMPTY_COUNT),
      score: { home: 0, away: 0 },
      rules: this.clone({
        ...DEFAULT_BASEBALL_RULES,
        ...rules,
        extraInnings: {
          ...DEFAULT_BASEBALL_RULES.extraInnings,
          ...rules?.extraInnings,
        },
      }),
      lineup: { home: [], away: [] },
      eventLog: [],
      auditLog: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  getState(): Readonly<GameState> {
    return this.clone(this.state);
  }

  getRules(): Readonly<GameRules> {
    return this.clone(this.state.rules);
  }

  on(eventType: GameEngineEventName, listener: GameEngineListener): this {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = new Set();
    }

    this.listeners[eventType]?.add(listener);
    return this;
  }

  off(eventType: GameEngineEventName, listener: GameEngineListener): this {
    this.listeners[eventType]?.delete(listener);
    return this;
  }

  startGame(): void {
    if (this.state.status === 'live') {
      throw new Error('Game is already live');
    }

    if (this.state.status === 'final' || this.state.status === 'cancelled') {
      throw new Error('Cannot start a finished game');
    }

    this.state.status = 'live';
    this.emitEvent('game_started', { status: this.state.status });
  }

  pauseGame(): void {
    if (this.state.status !== 'live') {
      throw new Error('Game must be live to pause');
    }

    this.state.status = 'paused';
    this.emitEvent('game_paused', { status: this.state.status });
  }

  resumeGame(): void {
    if (this.state.status !== 'paused') {
      throw new Error('Game must be paused to resume');
    }

    this.state.status = 'live';
    this.emitEvent('game_resumed', { status: this.state.status });
  }

  finalizeGame(): void {
    if (this.state.status === 'final') {
      throw new Error('Game is already final');
    }

    this.state.status = 'final';
    this.emitEvent('game_finalized', { status: this.state.status, score: this.clone(this.state.score) });
  }

  incrementScore(team: 'home' | 'away', operatorId?: string): void {
    const previousScore = this.clone(this.state.score);
    const nextScore = { ...this.state.score, [team]: this.state.score[team] + 1 } satisfies GameScore;

    validateScore(nextScore);

    this.state.score = nextScore;

    if (operatorId) {
      this.createAudit('incrementScore', previousScore as unknown as Record<string, unknown>, this.clone(nextScore) as unknown as Record<string, unknown>, operatorId);
    }

    this.emitEvent('run_scored', {
      team,
      previousScore,
      score: this.clone(this.state.score),
    });
  }

  setScore(score: Partial<GameScore>, operatorId: string, reason: string): void {
    validateIdentifier(operatorId, 'operatorId');
    validateIdentifier(reason, 'reason');

    const nextScore = { ...this.state.score, ...score };
    validateScore(nextScore);

    const previousScore = this.clone(this.state.score);
    this.state.score = nextScore;
    this.createAudit(
      'setScore',
      previousScore as unknown as Record<string, unknown>,
      this.clone(nextScore) as unknown as Record<string, unknown>,
      operatorId,
      reason,
    );
    this.emitEvent('score_corrected', {
      previousScore,
      score: this.clone(this.state.score),
      operatorId,
      reason,
    });
  }

  addOut(): void {
    const nextOuts = this.state.outs + 1;

    if (nextOuts < this.state.rules.maxOuts) {
      const previousOuts = this.state.outs;
      const previousCount = this.clone(this.state.count);
      this.state.outs = nextOuts;
      // Al registrar un out, el conteo se reinicia (nuevo bateador)
      this.state.count = this.clone(EMPTY_COUNT);
      this.emitEvent('outs_changed', { previousOuts, outs: this.state.outs });
      if (previousCount.balls !== 0 || previousCount.strikes !== 0) {
        this.emitEvent('count_changed', { previousCount, count: this.clone(this.state.count) });
      }
      this.emitEvent('batter_changed', {
        previousBatterId: this.state.currentBatterId,
        currentBatterId: this.state.currentBatterId,
        reason: 'out',
      });
      return;
    }

    this.advanceHalfInningInternal(this.state.rules.maxOuts);
  }

  setOuts(outs: number, operatorId: string, reason?: string): void {
    validateIdentifier(operatorId, 'operatorId');
    validateOuts(outs);

    const previousState = { outs: this.state.outs };
    this.state.outs = outs;
    this.createAudit('setOuts', previousState, { outs: this.state.outs }, operatorId, reason);
    this.emitEvent('outs_changed', { previousOuts: previousState.outs, outs: this.state.outs });
  }

  setBases(bases: Partial<GameBases>, operatorId?: string): void {
    validateBases(bases);

    const previousBases = this.clone(this.state.bases);
    this.state.bases = { ...this.state.bases, ...bases };

    if (operatorId) {
      this.createAudit(
        'setBases',
        previousBases as unknown as Record<string, unknown>,
        this.clone(this.state.bases) as unknown as Record<string, unknown>,
        operatorId,
      );
    }

    this.emitEvent('bases_changed', { previousBases, bases: this.clone(this.state.bases) });
  }

  clearBases(): void {
    const previousBases = this.clone(this.state.bases);
    this.state.bases = this.clone(EMPTY_BASES);
    this.emitEvent('bases_changed', { previousBases, bases: this.clone(this.state.bases) });
  }

  setCount(count: Partial<GameCount>): void {
    validateCount(count);

    const merged = { ...this.state.count, ...count };
    const { batterAttempts, maxBalls, maxStrikes } = this.state.rules;

    if (batterAttempts === 1 && merged.strikes > this.state.count.strikes) {
      this.addOut();
      return;
    }

    // 3er strike → strikeout: addOut() maneja reset de conteo y batter_changed
    if (merged.strikes >= maxStrikes) {
      this.addOut();
      return;
    }

    // 4ª bola → base por bolas: avance forzado de corredores
    if (maxBalls !== null && merged.balls >= maxBalls) {
      const previousBases = this.clone(this.state.bases);
      const previousScore = this.clone(this.state.score);
      const b = this.state.bases;

      // Algoritmo de avance forzado:
      // Un corredor avanza sólo si la base que deja es "empujada" por el bateador
      // → runner en 3ª anota SÓLO si había corredor en 1ª Y 2ª Y 3ª (bases llenas)
      const scoredRun = b.first && b.second && b.third;
      this.state.bases = {
        first: true,                            // bateador siempre a 1ª
        second: b.second || b.first,            // 2ª: estaba ocupada ó forzado desde 1ª
        third: b.third || (b.second && b.first), // 3ª: estaba ocupada ó forzado desde 2ª (requiere que 1ª tb lo estuviera)
      };

      const previousCount = this.clone(this.state.count);
      this.state.count = this.clone(EMPTY_COUNT);

      this.emitEvent('bases_changed', { previousBases, bases: this.clone(this.state.bases) });
      this.emitEvent('count_changed', { previousCount, count: this.clone(this.state.count) });

      if (scoredRun) {
        const battingTeam = this.state.inningHalf === 'top' ? 'away' : 'home';
        this.state.score = { ...this.state.score, [battingTeam]: this.state.score[battingTeam] + 1 };
        this.emitEvent('run_scored', {
          team: battingTeam,
          reason: 'walk',
          previousScore,
          score: this.clone(this.state.score),
        });
      }

      this.emitEvent('batter_changed', {
        previousBatterId: this.state.currentBatterId,
        currentBatterId: this.state.currentBatterId,
        reason: 'walk',
      });
      return;
    }

    const previousCount = this.clone(this.state.count);
    this.state.count = merged;
    this.emitEvent('count_changed', { previousCount, count: this.clone(this.state.count) });
  }

  resetCount(): void {
    const previousCount = this.clone(this.state.count);
    this.state.count = this.clone(EMPTY_COUNT);
    this.emitEvent('count_changed', { previousCount, count: this.clone(this.state.count) });
  }

  setCurrentBatter(batterId: string): void {
    validateIdentifier(batterId, 'batterId');

    const previousBatterId = this.state.currentBatterId;
    const previousCount = this.clone(this.state.count);

    this.state.currentBatterId = batterId;
    this.state.count = this.clone(EMPTY_COUNT);

    if (previousCount.balls !== 0 || previousCount.strikes !== 0) {
      this.emitEvent('count_changed', { previousCount, count: this.clone(this.state.count) });
    }

    this.emitEvent('batter_changed', {
      previousBatterId,
      currentBatterId: this.state.currentBatterId,
    });
  }

  setCurrentPitcher(pitcherId: string): void {
    validateIdentifier(pitcherId, 'pitcherId');

    const previousPitcherId = this.state.currentPitcherId;
    this.state.currentPitcherId = pitcherId;
    this.emitEvent('pitcher_changed', {
      previousPitcherId,
      currentPitcherId: this.state.currentPitcherId,
    });
  }

  advanceHalfInning(): void {
    this.advanceHalfInningInternal(this.state.outs);
  }

  endGame(): void {
    if (this.state.status === 'final') return;

    this.state.status = 'final';
    this.emitEvent('game_finalized', {
      finalScore: this.clone(this.state.score),
      inning: this.state.inning,
      inningHalf: this.state.inningHalf,
    });
  }

  setLineup(lineup: GameLineup): void {
    validateLineup(lineup);

    const previousLineup = this.clone(this.state.lineup);
    this.state.lineup = this.clone(lineup);
    this.emitEvent('lineup_changed', { previousLineup, lineup: this.clone(this.state.lineup) });
  }

  private advanceHalfInningInternal(recordedOuts: number): void {
    const endedInning = this.state.inning;
    const endedHalf = this.state.inningHalf;

    this.emitEvent('inning_ended', {
      inning: endedInning,
      inningHalf: endedHalf,
      outs: recordedOuts,
      score: this.clone(this.state.score),
    });

    if (this.shouldEndGameAfterHalfInning(endedInning, endedHalf)) {
      this.state.outs = 0;
      this.state.bases = this.clone(EMPTY_BASES);
      this.state.count = this.clone(EMPTY_COUNT);
      this.endGame();
      return;
    }

    const nextHalf = this.state.inningHalf === 'top' ? 'bottom' : 'top';
    const nextInning = this.state.inningHalf === 'top' ? this.state.inning : this.state.inning + 1;

    this.state.outs = 0;
    this.state.bases = this.clone(EMPTY_BASES);
    this.state.count = this.clone(EMPTY_COUNT);
    this.state.inningHalf = nextHalf;
    this.state.inning = nextInning;

    this.emitEvent('inning_started', {
      inning: this.state.inning,
      inningHalf: this.state.inningHalf,
      outs: this.state.outs,
    });
  }

  private emitEvent(eventType: GameEventType, payload: Record<string, unknown>): void {
    const event: GameEvent = {
      eventId: this.nextEventId(),
      eventType,
      gameId: this.state.gameId,
      timestamp: this.now(),
      source: 'GameEngine',
      payload,
    };

    this.state.eventLog.push(event);
    this.state.updatedAt = event.timestamp;
    this.dispatchEvent(eventType, event);
    this.dispatchEvent('event', event);
  }

  private dispatchEvent(eventType: GameEngineEventName, event: GameEvent): void {
    this.listeners[eventType]?.forEach((listener) => listener(event));
  }

  private createAudit(
    command: string,
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
    operatorId?: string,
    reason?: string,
  ): void {
    if (!operatorId) {
      return;
    }

    const entry = createAuditEntry(this.nextAuditId(), operatorId, command, prev, next, this.now(), reason);
    this.state.auditLog.push(entry);
    this.state.updatedAt = entry.timestamp;
  }

  private nextEventId(): string {
    this.eventSequence += 1;
    return `evt-${String(this.eventSequence).padStart(6, '0')}`;
  }

  private nextAuditId(): string {
    this.auditSequence += 1;
    return `audit-${String(this.auditSequence).padStart(6, '0')}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  private shouldEndGameAfterHalfInning(inning: number, inningHalf: GameState['inningHalf']): boolean {
    const regulationComplete = inning >= this.state.rules.inningsCount;

    if (!regulationComplete) {
      return false;
    }

    if (inningHalf === 'top') {
      return this.state.score.home > this.state.score.away;
    }

    return this.state.score.home !== this.state.score.away;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}
