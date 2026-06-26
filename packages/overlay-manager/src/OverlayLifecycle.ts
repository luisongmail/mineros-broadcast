import type {
  LifecycleListener,
  OverlayLifecycleEntry,
  OverlayLifecycleState,
} from './types';

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
      throw new Error(`El overlay '${overlayId}' requiere payload válido.`);
    }

    const entry = this.validate(overlayId, ['ready', 'hidden', 'archived']);
    entry.payload = { ...payload };
    entry.previewAt = undefined;
    entry.programAt = undefined;
    entry.hiddenAt = undefined;
    entry.archivedAt = undefined;

    return this.transition(
      this.transition(entry, 'requested'),
      'validated',
      'Payload validado.',
    );
  }

  toPreview(overlayId: string): OverlayLifecycleEntry {
    const entry = this.validate(overlayId, ['validated']);
    return this.transition(entry, 'preview');
  }

  toProgram(overlayId: string): OverlayLifecycleEntry {
    const entry = this.validate(overlayId, ['preview', 'validated']);
    const conflictingEntryId = this.resolveZoneConflict(overlayId);

    if (conflictingEntryId) {
      this.hide(conflictingEntryId, `Desplazado por '${overlayId}'.`);
    } else if (this.hasBlockingZoneConflict(entry)) {
      throw new Error(
        `La zona '${entry.zone}' no está disponible para '${overlayId}'.`,
      );
    }

    return this.transition(entry, 'program');
  }

  hide(overlayId: string, reason?: string): OverlayLifecycleEntry {
    const entry = this.validate(overlayId, ['program', 'preview', 'holding']);

    if (entry.state === 'preview') {
      return this.transition(entry, 'hidden', reason);
    }

    return this.transition(this.transition(entry, 'hiding', reason), 'hidden', reason);
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
