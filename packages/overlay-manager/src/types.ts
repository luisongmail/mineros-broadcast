import type { OverlayState as CoreOverlayState } from '@playflow/core';

export type OverlayState = CoreOverlayState;
export type OverlayLifecycleState =
  | 'ready'
  | 'requested'
  | 'validated'
  | 'preview'
  | 'program'
  | 'holding'
  | 'hiding'
  | 'hidden'
  | 'archived';

export interface OverlayLifecycleEntry {
  overlayId: string;
  state: OverlayLifecycleState;
  priority: number;
  zone?: string;
  payload?: Record<string, unknown>;
  requestedAt?: string;
  previewAt?: string;
  programAt?: string;
  hiddenAt?: string;
  archivedAt?: string;
  history: Array<{
    from: OverlayLifecycleState;
    to: OverlayLifecycleState;
    at: string;
    reason?: string;
  }>;
}

export type LifecycleListener = (entry: OverlayLifecycleEntry) => void;

export interface RenderContract {
  overlayId: string;
  zoneId: string;
  state: OverlayState;
  data: Record<string, unknown>;
  assets: string[];
  designTokens: Record<string, unknown>;
  animation: {
    in: string;
    out: string;
  };
}

export interface OverlayRecord extends RenderContract {
  supportsTransparency: true;
}
