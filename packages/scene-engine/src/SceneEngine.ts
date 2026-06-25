import type { Scene, SceneDecision, SceneEngineEvent, SceneEngineListener, SceneId, SceneRequest, SceneStatus } from './types';

export const V1_SCENES: Scene[] = [
  {
    sceneId: 'scene-inicio-partido',
    name: 'Inicio del Partido',
    status: 'idle',
    priority: 100,
    requiredZones: ['F'],
    overlays: [],
    sponsorAllowed: false,
    defaultMode: 'preview',
  },
  {
    sceneId: 'scene-presentacion-equipos',
    name: 'Presentación de Equipos',
    status: 'idle',
    priority: 95,
    requiredZones: ['F'],
    overlays: [],
    sponsorAllowed: true,
    defaultMode: 'preview',
  },
  {
    sceneId: 'scene-lineup',
    name: 'Lineup',
    status: 'idle',
    priority: 95,
    requiredZones: ['F'],
    overlays: ['lineup'],
    sponsorAllowed: true,
    defaultMode: 'preview',
  },
  {
    sceneId: 'scene-cambio-bateador',
    name: 'Cambio de Bateador',
    status: 'idle',
    priority: 80,
    requiredZones: ['B'],
    overlays: ['batter'],
    sponsorAllowed: false,
    defaultMode: 'preview',
  },
  {
    sceneId: 'scene-fin-entrada',
    name: 'Fin de Entrada',
    status: 'idle',
    priority: 90,
    requiredZones: ['B', 'D'],
    overlays: [],
    sponsorAllowed: true,
    preferredPlacement: 'sponsor_overlay',
    defaultMode: 'preview',
  },
  {
    sceneId: 'scene-mvp',
    name: 'MVP',
    status: 'idle',
    priority: 85,
    requiredZones: ['F'],
    overlays: [],
    sponsorAllowed: true,
    defaultMode: 'preview',
  },
  {
    sceneId: 'scene-cierre',
    name: 'Cierre',
    status: 'idle',
    priority: 100,
    requiredZones: ['F'],
    overlays: [],
    sponsorAllowed: false,
    defaultMode: 'preview',
  },
];

function cloneScene(scene: Scene): Scene {
  return {
    ...scene,
    requiredZones: [...scene.requiredZones],
    overlays: [...scene.overlays],
  };
}

export class SceneEngine {
  private readonly scenes: Map<SceneId, Scene>;

  private activeScene: Scene | null = null;

  private previewScene: Scene | null = null;

  private readonly listeners = new Set<SceneEngineListener>();

  constructor(initialScenes: Scene[] = V1_SCENES) {
    this.scenes = new Map(initialScenes.map((scene) => [scene.sceneId, cloneScene(scene)]));
  }

  request(request: SceneRequest): SceneDecision {
    const scene = this.validate(request.sceneId);

    if (!scene) {
      const decision: SceneDecision = {
        requestId: request.requestId,
        sceneId: null,
        accepted: false,
        reason: 'scene_not_found',
        mode: request.mode,
      };

      this.emit({ type: 'scene_rejected', decision });
      return decision;
    }

    if (this.activeScene && this.activeScene.priority > scene.priority) {
      const decision: SceneDecision = {
        requestId: request.requestId,
        sceneId: scene.sceneId,
        accepted: false,
        reason: 'blocked_by_active_scene',
        mode: request.mode,
        scene: cloneScene(this.activeScene),
      };

      this.markSceneStatus(scene.sceneId, 'blocked');
      this.emit({ type: 'scene_rejected', scene: this.getCatalogScene(scene.sceneId), decision });
      return decision;
    }

    this.resetPreviewSceneStatus();

    const previewScene = cloneScene(scene);
    previewScene.status = 'preview';
    this.previewScene = previewScene;
    this.markSceneStatus(previewScene.sceneId, 'preview');

    const decision: SceneDecision = {
      requestId: request.requestId,
      sceneId: previewScene.sceneId,
      accepted: true,
      reason: 'accepted',
      mode: request.mode,
      scene: cloneScene(previewScene),
    };

    this.emit({ type: 'scene_requested', scene: cloneScene(previewScene), decision });
    this.emit({ type: 'scene_preview', scene: cloneScene(previewScene), decision });

    return decision;
  }

  take(): boolean {
    if (!this.previewScene) {
      return false;
    }

    if (this.activeScene && this.activeScene.sceneId !== this.previewScene.sceneId) {
      const endedScene = cloneScene(this.activeScene);
      endedScene.status = 'ended';
      this.markSceneStatus(endedScene.sceneId, 'ended');
      this.emit({ type: 'scene_ended', scene: endedScene });
    }

    const nextActiveScene = cloneScene(this.previewScene);
    nextActiveScene.status = 'live';
    this.activeScene = nextActiveScene;
    this.previewScene = null;
    this.markSceneStatus(nextActiveScene.sceneId, 'live');

    this.emit({ type: 'scene_live', scene: cloneScene(nextActiveScene) });
    return true;
  }

  end(): void {
    if (!this.activeScene) {
      return;
    }

    const endedScene = cloneScene(this.activeScene);
    endedScene.status = 'ended';
    this.activeScene = null;
    this.markSceneStatus(endedScene.sceneId, 'ended');

    this.emit({ type: 'scene_ended', scene: endedScene });
  }

  getActiveScene(): Scene | null {
    return this.activeScene ? cloneScene(this.activeScene) : null;
  }

  getPreviewScene(): Scene | null {
    return this.previewScene ? cloneScene(this.previewScene) : null;
  }

  getCatalog(): Scene[] {
    return [...this.scenes.values()].map(cloneScene);
  }

  on(listener: SceneEngineListener): void {
    this.listeners.add(listener);
  }

  off(listener: SceneEngineListener): void {
    this.listeners.delete(listener);
  }

  private validate(sceneId: string): Scene | null {
    const scene = this.scenes.get(sceneId as SceneId);
    return scene ? cloneScene(scene) : null;
  }

  private getCatalogScene(sceneId: SceneId): Scene | undefined {
    const scene = this.scenes.get(sceneId);
    return scene ? cloneScene(scene) : undefined;
  }

  private markSceneStatus(sceneId: SceneId, status: SceneStatus): void {
    const scene = this.scenes.get(sceneId);

    if (!scene) {
      return;
    }

    scene.status = status;
  }

  private resetPreviewSceneStatus(): void {
    if (!this.previewScene) {
      return;
    }

    const status: SceneStatus = this.activeScene && this.activeScene.sceneId === this.previewScene.sceneId ? 'live' : 'idle';
    this.markSceneStatus(this.previewScene.sceneId, status);
    this.previewScene = null;
  }

  private emit(event: Omit<SceneEngineEvent, 'timestamp'>): void {
    const payload: SceneEngineEvent = {
      ...event,
      scene: event.scene ? cloneScene(event.scene) : undefined,
      decision: event.decision
        ? {
            ...event.decision,
            scene: event.decision.scene ? cloneScene(event.decision.scene) : undefined,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    };

    for (const listener of this.listeners) {
      listener(payload);
    }
  }
}
