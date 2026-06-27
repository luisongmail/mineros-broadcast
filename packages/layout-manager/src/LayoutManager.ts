import { globalBus, type EventBus } from '@playflow/event-bus';
import { createEnvelope } from '@playflow/core';

import { PreviewProgram } from './PreviewProgram';
import { ProfileManager } from './ProfileManager';
import { createDefaultZones, ZoneManager } from './ZoneManager';
import type { HistoryEntry, LayoutSnapshot, LockRecord, OperatorState, Zone } from './types';

function createInitialSnapshot(zones: Zone[] = createDefaultZones()): LayoutSnapshot {
  return {
    profileId: null,
    zones,
    scenes: [],
    overlayAssignments: [],
    activeSceneId: null,
  };
}

export class LayoutManager {
  readonly zones: ZoneManager;
  readonly profiles: ProfileManager;
  readonly previewProgram: PreviewProgram;

  constructor(private readonly bus: EventBus = globalBus) {
    const initialZones = createDefaultZones();

    this.zones = new ZoneManager(initialZones);
    this.profiles = new ProfileManager();
    this.previewProgram = new PreviewProgram(createInitialSnapshot(initialZones));
  }

  preparePreview(changes: Partial<LayoutSnapshot>): void {
    this.previewProgram.preparePreview(changes);
    this.publishLifecycleEvent('event', 'previewPrepared', changes);
  }

  take(): void {
    this.previewProgram.take();
    this.publishLifecycleEvent('command', 'take', this.previewProgram.getProgramState());
  }

  cancel(): void {
    this.previewProgram.cancel();
    this.publishLifecycleEvent('command', 'cancel', this.previewProgram.getPreviewState());
  }

  revert(): void {
    this.previewProgram.revert();
    this.publishLifecycleEvent('command', 'revert', this.previewProgram.getProgramState());
  }

  setLocks(locks: LockRecord[]): void {
    this.previewProgram.setLocks(locks);
  }

  getState(): OperatorState {
    return this.previewProgram.getState();
  }

  getHistory(): HistoryEntry[] {
    return this.previewProgram.getHistory();
  }

  getProgramState(): LayoutSnapshot {
    return this.previewProgram.getProgramState();
  }

  getPreviewState(): LayoutSnapshot {
    return this.previewProgram.getPreviewState();
  }

  private publishLifecycleEvent(messageType: 'command' | 'event', action: string, payload: unknown): void {
    this.bus.publish(
      createEnvelope(messageType, 'LayoutManager', 'OverlayManager', {
        action,
        payload,
      }),
    );
  }
}
