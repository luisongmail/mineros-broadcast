import { describe, expect, it, vi } from 'vitest';

import { SceneEngine } from './SceneEngine';
import type { SceneEngineEvent, SceneRequest } from './types';

function createRequest(overrides: Partial<SceneRequest> = {}): SceneRequest {
  return {
    requestId: 'request-001',
    source: 'event-engine',
    sceneId: 'scene-lineup',
    mode: 'preview',
    priority: 95,
    ...overrides,
  };
}

describe('@mineros/scene-engine', () => {
  it('getCatalog retorna las 7 escenas V1', () => {
    const engine = new SceneEngine();

    expect(engine.getCatalog()).toHaveLength(7);
  });

  it('request rechaza sceneId que no existe', () => {
    const engine = new SceneEngine();

    const decision = engine.request(createRequest({ sceneId: 'scene-desconocida' }));

    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('scene_not_found');
    expect(engine.getPreviewScene()).toBeNull();
  });

  it('request acepta una escena válida y la pone en preview', () => {
    const engine = new SceneEngine();

    const decision = engine.request(createRequest());

    expect(decision.accepted).toBe(true);
    expect(decision.sceneId).toBe('scene-lineup');
    expect(engine.getPreviewScene()).toMatchObject({
      sceneId: 'scene-lineup',
      status: 'preview',
    });
  });

  it('take mueve preview a live', () => {
    const engine = new SceneEngine();

    engine.request(createRequest({ sceneId: 'scene-cambio-bateador', priority: 80 }));

    expect(engine.take()).toBe(true);
    expect(engine.getPreviewScene()).toBeNull();
    expect(engine.getActiveScene()).toMatchObject({
      sceneId: 'scene-cambio-bateador',
      status: 'live',
    });
  });

  it('end finaliza la escena activa', () => {
    const engine = new SceneEngine();

    engine.request(createRequest({ sceneId: 'scene-inicio-partido', priority: 100 }));
    engine.take();
    engine.end();

    expect(engine.getActiveScene()).toBeNull();
    expect(engine.getCatalog().find((scene) => scene.sceneId === 'scene-inicio-partido')?.status).toBe('ended');
  });

  it('request rechaza una escena si hay activeScene con mayor prioridad', () => {
    const engine = new SceneEngine();

    engine.request(createRequest({ sceneId: 'scene-cierre', priority: 100 }));
    engine.take();

    const decision = engine.request(createRequest({ sceneId: 'scene-cambio-bateador', priority: 80, requestId: 'request-002' }));

    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('blocked_by_active_scene');
    expect(engine.getPreviewScene()).toBeNull();
  });

  it('listener es notificado en scene_preview y scene_live', () => {
    const engine = new SceneEngine();
    const listener = vi.fn((event: SceneEngineEvent) => event);

    engine.on(listener);
    engine.request(createRequest());
    engine.take();

    const eventTypes = listener.mock.calls.map(([event]) => event.type);

    expect(eventTypes).toContain('scene_preview');
    expect(eventTypes).toContain('scene_live');
  });

  it('getPreviewScene y getActiveScene retornan el estado correcto', () => {
    const engine = new SceneEngine();

    expect(engine.getPreviewScene()).toBeNull();
    expect(engine.getActiveScene()).toBeNull();

    engine.request(createRequest({ sceneId: 'scene-mvp', priority: 85 }));

    expect(engine.getPreviewScene()?.sceneId).toBe('scene-mvp');
    expect(engine.getActiveScene()).toBeNull();

    engine.take();

    expect(engine.getPreviewScene()).toBeNull();
    expect(engine.getActiveScene()?.sceneId).toBe('scene-mvp');
    expect(engine.getActiveScene()?.status).toBe('live');
  });
});
