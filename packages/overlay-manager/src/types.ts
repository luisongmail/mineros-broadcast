import type { OverlayState as CoreOverlayState } from '@mineros/core';

export type OverlayState = CoreOverlayState;

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
