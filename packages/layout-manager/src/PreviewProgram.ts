import type { HistoryEntry, LayoutSnapshot, LockRecord, OperatorState, Zone } from './types';

const SAFE_AREA = 60;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const MAX_HISTORY = 10;

function cloneSnapshot(snapshot: LayoutSnapshot): LayoutSnapshot {
  return {
    profileId: snapshot.profileId,
    zones: snapshot.zones.map((zone) => ({ ...zone, assignedOverlays: [...zone.assignedOverlays] })),
    scenes: [...snapshot.scenes],
    overlayAssignments: snapshot.overlayAssignments.map((assignment) => ({ ...assignment })),
    activeSceneId: snapshot.activeSceneId,
  };
}

function mergeSnapshot(base: LayoutSnapshot, changes: Partial<LayoutSnapshot>): LayoutSnapshot {
  return {
    profileId: changes.profileId ?? base.profileId,
    zones: changes.zones ? changes.zones.map((zone) => ({ ...zone, assignedOverlays: [...zone.assignedOverlays] })) : base.zones.map((zone) => ({ ...zone, assignedOverlays: [...zone.assignedOverlays] })),
    scenes: changes.scenes ? [...changes.scenes] : [...base.scenes],
    overlayAssignments: changes.overlayAssignments
      ? changes.overlayAssignments.map((assignment) => ({ ...assignment }))
      : base.overlayAssignments.map((assignment) => ({ ...assignment })),
    activeSceneId: changes.activeSceneId ?? base.activeSceneId,
  };
}

function isZoneWithinSafeArea(zone: Zone): boolean {
  if (!zone.safeAreaRequired) {
    return true;
  }

  return (
    zone.x >= SAFE_AREA &&
    zone.y >= SAFE_AREA &&
    zone.x + zone.width <= CANVAS_WIDTH - SAFE_AREA &&
    zone.y + zone.height <= CANVAS_HEIGHT - SAFE_AREA
  );
}

export class PreviewProgram {
  private state: OperatorState = 'idle';
  private programState: LayoutSnapshot;
  private previewState: LayoutSnapshot;
  private history: HistoryEntry[] = [];
  private activeLocks: LockRecord[] = [];

  constructor(initialState: LayoutSnapshot) {
    this.programState = cloneSnapshot(initialState);
    this.previewState = cloneSnapshot(initialState);
  }

  getState(): OperatorState {
    return this.state;
  }

  getProgramState(): LayoutSnapshot {
    return cloneSnapshot(this.programState);
  }

  getPreviewState(): LayoutSnapshot {
    return cloneSnapshot(this.previewState);
  }

  getHistory(): HistoryEntry[] {
    return this.history.map((entry) => ({
      ...entry,
      previousState: cloneSnapshot(entry.previousState),
      newState: cloneSnapshot(entry.newState),
    }));
  }

  setLocks(locks: LockRecord[]): void {
    this.activeLocks = locks.map((lock) => ({ ...lock }));
  }

  preparePreview(
    changes: Partial<LayoutSnapshot>,
    metadata: { operator?: string; origin?: string; resource?: string } = {},
  ): void {
    const previousState = cloneSnapshot(this.previewState);

    this.previewState = mergeSnapshot(this.programState, changes);
    this.state = 'preview_dirty';
    this.recordHistory('preparePreview', previousState, this.previewState, metadata);
  }

  take(metadata: { operator?: string; origin?: string; resource?: string } = {}): void {
    if (this.state !== 'preview_dirty' && this.state !== 'ready_to_take') {
      throw new Error('No hay cambios en Preview para enviar a Program.');
    }

    const errors = this.validateTake();

    if (errors.length > 0) {
      this.state = 'error';
      throw new Error(errors.join(' '));
    }

    const previousState = cloneSnapshot(this.programState);

    this.state = 'ready_to_take';
    this.programState = cloneSnapshot(this.previewState);
    this.state = 'program_live';
    this.recordHistory('take', previousState, this.programState, metadata);
  }

  cancel(metadata: { operator?: string; origin?: string; resource?: string } = {}): void {
    const previousState = cloneSnapshot(this.previewState);

    this.previewState = cloneSnapshot(this.programState);
    this.state = 'idle';
    this.recordHistory('cancel', previousState, this.previewState, metadata);
  }

  revert(metadata: { operator?: string; origin?: string; resource?: string } = {}): void {
    const lastEntry = this.history.pop();

    if (!lastEntry) {
      this.previewState = cloneSnapshot(this.programState);
      this.state = 'reverted';
      return;
    }

    const restoredState = cloneSnapshot(lastEntry.previousState);
    const currentProgramState = cloneSnapshot(this.programState);

    this.previewState = restoredState;
    this.programState = cloneSnapshot(restoredState);
    this.state = 'reverted';
    this.recordHistory('revert', currentProgramState, restoredState, metadata);
  }

  private validateTake(): string[] {
    const errors: string[] = [];

    if (this.activeLocks.some((lock) => lock.status === 'active')) {
      errors.push('Existen locks activos que impiden ejecutar Take.');
    }

    const zoneIds = new Set<string>();
    const overlayIds = new Set<string>();

    for (const zone of this.previewState.zones) {
      if (zoneIds.has(zone.id)) {
        errors.push(`Conflicto de zona: '${zone.id}' est duplicada.`);
      }
      zoneIds.add(zone.id);

      if (!isZoneWithinSafeArea(zone)) {
        errors.push(`La zona '${zone.id}' viola el Safe Area.`);
      }

      for (const overlayId of zone.assignedOverlays) {
        if (overlayIds.has(overlayId)) {
          errors.push(`Conflicto de zona: el overlay '${overlayId}' est asignado a mltiples zonas.`);
        }
        overlayIds.add(overlayId);
      }
    }

    return errors;
  }

  private recordHistory(
    action: HistoryEntry['action'],
    previousState: LayoutSnapshot,
    newState: LayoutSnapshot,
    metadata: { operator?: string; origin?: string; resource?: string },
  ): void {
    const entry: HistoryEntry = {
      id: `history-${Date.now()}-${this.history.length + 1}`,
      timestamp: new Date().toISOString(),
      operator: metadata.operator ?? 'system',
      action,
      resource: metadata.resource ?? 'layout',
      previousState: cloneSnapshot(previousState),
      newState: cloneSnapshot(newState),
      origin: metadata.origin ?? 'LayoutManager',
      result: 'success',
    };

    this.history.push(entry);

    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }
}
