import type {
  LifecycleListener,
  OverlayLifecycleEntry,
  OverlayLifecycleState,
} from './types';

/** Vocabulario de eventos — Spec 23, sección 6 */
export type LifecycleEventType =
  | 'overlay_requested'
  | 'overlay_validated'
  | 'overlay_previewed'
  | 'overlay_programmed'
  | 'overlay_hold_elapsed'
  | 'overlay_hidden'
  | 'overlay_rejected'
  | 'overlay_conflict_detected';

export interface LifecycleEvent {
  type: LifecycleEventType;
  overlayId: string;
  entry: OverlayLifecycleEntry;
  reason?: string;
}

export type LifecycleEventListener = (event: LifecycleEvent) => void;

function cloneEntry(entry: OverlayLifecycleEntry): OverlayLifecycleEntry {
  return {
    ...entry,
    payload: entry.payload ? { ...entry.payload } : undefined,
    history: entry.history.map((item) => ({ ...item })),
  };
}

function hasPayload(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).length > 0;
}

export class OverlayLifecycle {
  private readonly entries = new Map<string, OverlayLifecycleEntry>();

  private readonly listeners = new Set<LifecycleListener>();

  private readonly eventListeners = new Set<LifecycleEventListener>();

  /** timers activos para auto-hide por holdSeconds */
  private readonly holdTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private sequenceCounter = 0;

  register(overlayId: string, priority: number, zone?: string): void {
    if (!overlayId.trim()) {
      throw new Error('overlayId es obligatorio.');
    }

    this.entries.set(overlayId, {
      overlayId,
      state: 'ready',
      priority,
      zone,
      history: [],
    });
  }

  request(
    overlayId: string,
    payload: Record<string, unknown>,
  ): OverlayLifecycleEntry {
    if (!hasPayload(payload)) {
      const rejected = this.entries.get(overlayId);
      if (rejected) this.emitEvent('overlay_rejected', cloneEntry(rejected), 'Payload vacío.');
      throw new Error(`El overlay '${overlayId}' requiere payload válido.`);
    }

    const entry = this.validate(overlayId, ['ready', 'hidden', 'archived']);
    entry.payload = { ...payload };
    entry.previewAt = undefined;
    entry.programAt = undefined;
    entry.hiddenAt = undefined;
    entry.archivedAt = undefined;

    const requested = this.transition(entry, 'requested');
    this.emitEvent('overlay_requested', requested);

    const validated = this.transition(requested, 'validated', 'Payload validado.');
    this.emitEvent('overlay_validated', validated);

    return validated;
  }

  toPreview(overlayId: string): OverlayLifecycleEntry {
    const entry = this.validate(overlayId, ['validated']);
    const result = this.transition(entry, 'preview');
    this.emitEvent('overlay_previewed', result);
    return result;
  }

  toProgram(overlayId: string, holdSeconds?: number): OverlayLifecycleEntry {
    const entry = this.validate(overlayId, ['preview', 'validated']);
    const conflictingEntryId = this.resolveZoneConflict(overlayId);

    if (conflictingEntryId) {
      this.emitEvent('overlay_conflict_detected', cloneEntry(this.entries.get(conflictingEntryId)!),
        `Desplazado por '${overlayId}'.`);
      this.hide(conflictingEntryId, `Desplazado por '${overlayId}'.`);
    } else if (this.hasBlockingZoneConflict(entry)) {
      this.emitEvent('overlay_conflict_detected', cloneEntry(entry),
        `Zona '${entry.zone}' bloqueada por overlay de mayor prioridad.`);
      throw new Error(
        `La zona '${entry.zone}' no está disponible para '${overlayId}'.`,
      );
    }

    const result = this.transition(entry, 'program');
    this.emitEvent('overlay_programmed', result);

    if (holdSeconds && holdSeconds > 0) {
      this.clearHoldTimer(overlayId);
      this.holdTimers.set(overlayId, setTimeout(() => {
        this.holdTimers.delete(overlayId);
        const current = this.entries.get(overlayId);
        if (current && (current.state === 'program' || current.state === 'holding')) {
          this.emitEvent('overlay_hold_elapsed', cloneEntry(current));
          this.hide(overlayId, `holdSeconds=${holdSeconds} elapsed.`);
        }
      }, holdSeconds * 1000));
    }

    return result;
  }

  hide(overlayId: string, reason?: string): OverlayLifecycleEntry {
    this.clearHoldTimer(overlayId);
    const entry = this.validate(overlayId, ['program', 'preview', 'holding']);

    let result: OverlayLifecycleEntry;
    if (entry.state === 'preview') {
      result = this.transition(entry, 'hidden', reason);
    } else {
      result = this.transition(this.transition(entry, 'hiding', reason), 'hidden', reason);
    }
    this.emitEvent('overlay_hidden', result, reason);
    return result;
  }

  archive(overlayId: string): OverlayLifecycleEntry {
    const entry = this.validate(overlayId, ['hidden']);
    return this.transition(entry, 'archived');
  }

  getEntry(overlayId: string): OverlayLifecycleEntry | undefined {
    const entry = this.entries.get(overlayId);
    return entry ? cloneEntry(entry) : undefined;
  }

  getByState(state: OverlayLifecycleState): OverlayLifecycleEntry[] {
    return [...this.entries.values()]
      .filter((entry) => entry.state === state)
      .map((entry) => cloneEntry(entry));
  }

  resolveZoneConflict(overlayId: string): string | null {
    const entry = this.validate(overlayId, ['preview', 'validated']);

    if (!entry.zone) {
      return null;
    }

    const conflictingEntries = [...this.entries.values()].filter(
      (candidate) =>
        candidate.overlayId !== overlayId &&
        candidate.zone === entry.zone &&
        candidate.state === 'program',
    );

    if (conflictingEntries.length === 0) {
      return null;
    }

    const blockingEntry = conflictingEntries.sort(
      (left, right) => right.priority - left.priority,
    )[0];

    return blockingEntry.priority < entry.priority ? blockingEntry.overlayId : null;
  }

  on(listener: LifecycleListener): void {
    this.listeners.add(listener);
  }

  off(listener: LifecycleListener): void {
    this.listeners.delete(listener);
  }

  /** Suscribirse a eventos nominados del spec 23 sección 6 */
  onEvent(listener: LifecycleEventListener): void {
    this.eventListeners.add(listener);
  }

  offEvent(listener: LifecycleEventListener): void {
    this.eventListeners.delete(listener);
  }

  /** Cancela el timer de auto-hide de un overlay */
  private clearHoldTimer(overlayId: string): void {
    const timer = this.holdTimers.get(overlayId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.holdTimers.delete(overlayId);
    }
  }

  private emitEvent(type: LifecycleEventType, entry: OverlayLifecycleEntry, reason?: string): void {
    const event: LifecycleEvent = { type, overlayId: entry.overlayId, entry, reason };
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private transition(
    entry: OverlayLifecycleEntry,
    to: OverlayLifecycleState,
    reason?: string,
  ): OverlayLifecycleEntry {
    const at = this.nextTimestamp();
    const nextEntry: OverlayLifecycleEntry = {
      ...entry,
      payload: entry.payload ? { ...entry.payload } : undefined,
      state: to,
      history: [
        ...entry.history,
        {
          from: entry.state,
          to,
          at,
          reason,
        },
      ],
    };

    if (to === 'requested') {
      nextEntry.requestedAt = at;
    }

    if (to === 'preview') {
      nextEntry.previewAt = at;
    }

    if (to === 'program') {
      nextEntry.programAt = at;
    }

    if (to === 'hidden') {
      nextEntry.hiddenAt = at;
    }

    if (to === 'archived') {
      nextEntry.archivedAt = at;
    }

    this.entries.set(nextEntry.overlayId, nextEntry);

    const snapshot = cloneEntry(nextEntry);
    for (const listener of this.listeners) {
      listener(snapshot);
    }

    return cloneEntry(nextEntry);
  }

  private validate(
    overlayId: string,
    expectedStates: OverlayLifecycleState[],
  ): OverlayLifecycleEntry {
    const entry = this.entries.get(overlayId);

    if (!entry) {
      throw new Error(`El overlay '${overlayId}' no está registrado.`);
    }

    if (!expectedStates.includes(entry.state)) {
      throw new Error(
        `El overlay '${overlayId}' debe estar en [${expectedStates.join(', ')}] y está en '${entry.state}'.`,
      );
    }

    return cloneEntry(entry);
  }

  private hasBlockingZoneConflict(entry: OverlayLifecycleEntry): boolean {
    if (!entry.zone) {
      return false;
    }

    return [...this.entries.values()].some(
      (candidate) =>
        candidate.overlayId !== entry.overlayId &&
        candidate.zone === entry.zone &&
        candidate.state === 'program' &&
        candidate.priority >= entry.priority,
    );
  }

  private nextTimestamp(): string {
    const timestamp = new Date(Date.now() + this.sequenceCounter).toISOString();
    this.sequenceCounter += 1;
    return timestamp;
  }
}
