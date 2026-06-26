export type SceneId =
  | 'scene-inicio-partido'
  | 'scene-presentacion-equipos'
  | 'scene-lineup'
  | 'scene-cambio-bateador'
  | 'scene-fin-entrada'
  | 'scene-mvp'
  | 'scene-cierre';

export type SceneStatus = 'idle' | 'preview' | 'live' | 'transitioning' | 'ended' | 'blocked';

export interface Scene {
  sceneId: SceneId;
  name: string;
  status: SceneStatus;
  priority: number;
  requiredZones: string[];
  overlays: string[];
  sponsorAllowed: boolean;
  preferredPlacement?: string;
  defaultMode: 'preview' | 'program';
}

export interface SceneRequest {
  requestId: string;
  source: string;
  sceneId: string;
  mode: 'preview' | 'program';
  priority: number;
}

export interface SceneDecision {
  requestId: string;
  sceneId: string | null;
  accepted: boolean;
  reason: string;
  mode: 'preview' | 'program';
  scene?: Scene;
}

export interface SceneEngineEvent {
  type: 'scene_requested' | 'scene_preview' | 'scene_live' | 'scene_ended' | 'scene_rejected';
  scene?: Scene;
  decision?: SceneDecision;
  timestamp: string;
}

export type SceneEngineListener = (event: SceneEngineEvent) => void;
