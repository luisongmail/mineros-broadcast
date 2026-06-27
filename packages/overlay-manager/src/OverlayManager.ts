import { createEnvelope } from '@playflow/core';
import { globalBus, type EventBus } from '@playflow/event-bus';

import type { OverlayRecord, OverlayState, RenderContract } from './types';

interface ShowInput {
  assets?: string[];
  designTokens?: Record<string, unknown>;
  animation?: {
    in?: string;
    out?: string;
  };
  [key: string]: unknown;
}

function cloneRecord(record: OverlayRecord): OverlayRecord {
  return {
    ...record,
    data: { ...record.data },
    assets: [...record.assets],
    designTokens: { ...record.designTokens },
    animation: { ...record.animation },
  };
}

function toShowInput(data: unknown): ShowInput {
  if (typeof data === 'object' && data !== null) {
    return data as ShowInput;
  }

  return { value: data };
}

function ensureAssetIds(assets: string[]): void {
  for (const assetId of assets) {
    if (assetId.includes('/') || assetId.includes('\\')) {
      throw new Error('Los overlays deben consumir assets por assetId, nunca por ruta local.');
    }
  }
}

export class OverlayManager {
  private readonly overlays = new Map<string, OverlayRecord>();

  constructor(private readonly bus: EventBus = globalBus) {}

  register(overlayId: string, zoneId: string): void {
    if (!overlayId.trim()) {
      throw new Error('overlayId es obligatorio.');
    }

    this.overlays.set(overlayId, {
      overlayId,
      zoneId,
      state: 'hidden',
      data: {},
      assets: [],
      designTokens: {},
      animation: { in: 'fade', out: 'fade' },
      supportsTransparency: true,
    });
  }

  show(overlayId: string, data: unknown): void {
    const record = this.requireOverlay(overlayId);

    if (!record.zoneId.trim()) {
      throw new Error(`El overlay '${overlayId}' visible debe tener zoneId.`);
    }

    const showInput = toShowInput(data);
    const assets = Array.isArray(showInput.assets) ? showInput.assets.filter((asset): asset is string => typeof asset === 'string') : [];

    ensureAssetIds(assets);

    const nextRecord: OverlayRecord = {
      ...record,
      state: 'preview',
      data: { ...showInput },
      assets,
      designTokens:
        showInput.designTokens && typeof showInput.designTokens === 'object'
          ? { ...showInput.designTokens }
          : {},
      animation: {
        in: typeof showInput.animation?.in === 'string' ? showInput.animation.in : 'fade',
        out: typeof showInput.animation?.out === 'string' ? showInput.animation.out : 'fade',
      },
      supportsTransparency: true,
    };

    this.overlays.set(overlayId, nextRecord);
    this.publish('show', nextRecord);
  }

  take(overlayId: string): void {
    const record = this.requireOverlay(overlayId);

    if (record.state !== 'preview') {
      throw new Error(`El overlay '${overlayId}' debe estar en preview antes de pasar a live.`);
    }

    const nextRecord = { ...record, state: 'live' as const };
    this.overlays.set(overlayId, nextRecord);
    this.publish('take', nextRecord);
  }

  hide(overlayId: string): void {
    const record = this.requireOverlay(overlayId);

    if (record.state !== 'live' && record.state !== 'preview') {
      this.overlays.set(overlayId, { ...record, state: 'hidden' });
      return;
    }

    const transitioningRecord = { ...record, state: 'transitioning' as const };
    this.overlays.set(overlayId, transitioningRecord);
    this.publish('hide', transitioningRecord);

    this.overlays.set(overlayId, { ...transitioningRecord, state: 'hidden' });
  }

  getState(overlayId: string): OverlayState {
    return this.requireOverlay(overlayId).state;
  }

  getActiveOverlays(): OverlayRecord[] {
    return [...this.overlays.values()]
      .filter((record) => record.state === 'preview' || record.state === 'live')
      .map(cloneRecord);
  }

  getRenderContract(overlayId: string): RenderContract | null {
    const record = this.overlays.get(overlayId);

    if (!record || record.state === 'hidden') {
      return null;
    }

    return cloneRecord(record);
  }

  private requireOverlay(overlayId: string): OverlayRecord {
    const record = this.overlays.get(overlayId);

    if (!record) {
      throw new Error(`El overlay '${overlayId}' no est registrado.`);
    }

    return cloneRecord(record);
  }

  private publish(action: string, record: OverlayRecord): void {
    this.bus.publish(
      createEnvelope('event', 'OverlayManager', 'LayoutManager', {
        action,
        overlayId: record.overlayId,
        zoneId: record.zoneId,
        state: record.state,
      }),
    );
  }
}
