import { describe, expect, it } from 'vitest';

import { OverlayLifecycle } from './OverlayLifecycle';
import { OverlayManager } from './OverlayManager';

describe('@mineros/overlay-manager', () => {
  it('el estado inicial de un overlay registrado es hidden', () => {
    const manager = new OverlayManager();

    manager.register('scorebug', 'A');

    expect(manager.getState('scorebug')).toBe('hidden');
  });

  it('show cambia el estado a preview', () => {
    const manager = new OverlayManager();

    manager.register('scorebug', 'A');
    manager.show('scorebug', { score: '1-0' });

    expect(manager.getState('scorebug')).toBe('preview');
  });

  it('take en preview cambia el estado a live', () => {
    const manager = new OverlayManager();

    manager.register('scorebug', 'A');
    manager.show('scorebug', { score: '2-0' });
    manager.take('scorebug');

    expect(manager.getState('scorebug')).toBe('live');
  });

  it('hide en live regresa el estado a hidden pasando por transitioning', () => {
    const manager = new OverlayManager();

    manager.register('scorebug', 'A');
    manager.show('scorebug', { score: '3-0' });
    manager.take('scorebug');
    manager.hide('scorebug');

    expect(manager.getState('scorebug')).toBe('hidden');
  });

  it('getActiveOverlays retorna solo overlays en preview o live', () => {
    const manager = new OverlayManager();

    manager.register('scorebug', 'A');
    manager.register('batter', 'B');
    manager.register('lineup', 'F');

    manager.show('scorebug', { score: '4-0' });
    manager.show('batter', { batter: '42' });
    manager.take('batter');

    const activeIds = manager.getActiveOverlays().map((overlay) => overlay.overlayId);

    expect(activeIds).toEqual(['scorebug', 'batter']);
  });

  it('lanza error si un overlay visible no tiene zoneId', () => {
    const manager = new OverlayManager();

    manager.register('scorebug', '');

    expect(() => manager.show('scorebug', { score: '5-0' })).toThrow(/zoneId/i);
  });
});

describe('OverlayLifecycle', () => {
  it('register() crea entrada en estado ready', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');

    expect(lifecycle.getEntry('scorebug')).toMatchObject({
      overlayId: 'scorebug',
      state: 'ready',
      priority: 90,
      zone: 'A',
      history: [],
    });
  });

  it('request() avanza ready → validated con payload', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');

    const entry = lifecycle.request('scorebug', { score: '1-0' });

    expect(entry.state).toBe('validated');
    expect(entry.payload).toEqual({ score: '1-0' });
    expect(entry.requestedAt).toEqual(expect.any(String));
    expect(entry.history.map((item) => item.to)).toEqual(['requested', 'validated']);
  });

  it('request() lanza error si payload vacío', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');

    expect(() => lifecycle.request('scorebug', {})).toThrow(/payload válido/i);
  });

  it('toPreview() avanza validated → preview', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');
    lifecycle.request('scorebug', { score: '1-0' });

    const entry = lifecycle.toPreview('scorebug');

    expect(entry.state).toBe('preview');
    expect(entry.previewAt).toEqual(expect.any(String));
  });

  it('toProgram() avanza preview → program', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');
    lifecycle.request('scorebug', { score: '1-0' });
    lifecycle.toPreview('scorebug');

    const entry = lifecycle.toProgram('scorebug');

    expect(entry.state).toBe('program');
    expect(entry.programAt).toEqual(expect.any(String));
  });

  it('toProgram() permite salto rápido desde validated', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('alerta', 100, 'A');
    lifecycle.request('alerta', { message: 'Urgente' });

    const entry = lifecycle.toProgram('alerta');

    expect(entry.state).toBe('program');
    expect(entry.history.map((item) => item.to)).toEqual([
      'requested',
      'validated',
      'program',
    ]);
  });

  it('hide() desde program → hidden', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');
    lifecycle.request('scorebug', { score: '1-0' });
    lifecycle.toPreview('scorebug');
    lifecycle.toProgram('scorebug');

    const entry = lifecycle.hide('scorebug');

    expect(entry.state).toBe('hidden');
    expect(entry.hiddenAt).toEqual(expect.any(String));
    expect(entry.history.slice(-2).map((item) => item.to)).toEqual(['hiding', 'hidden']);
  });

  it('archive() desde hidden → archived', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('scorebug', 90, 'A');
    lifecycle.request('scorebug', { score: '1-0' });
    lifecycle.toPreview('scorebug');
    lifecycle.hide('scorebug');

    const entry = lifecycle.archive('scorebug');

    expect(entry.state).toBe('archived');
    expect(entry.archivedAt).toEqual(expect.any(String));
  });

  it('resolveZoneConflict() retorna overlay a desplazar si hay conflicto de zona', () => {
    const lifecycle = new OverlayLifecycle();

    lifecycle.register('lineup', 70, 'A');
    lifecycle.register('alerta', 100, 'A');

    lifecycle.request('lineup', { player: '42' });
    lifecycle.toPreview('lineup');
    lifecycle.toProgram('lineup');
    lifecycle.request('alerta', { message: 'Urgente' });

    expect(lifecycle.resolveZoneConflict('alerta')).toBe('lineup');
  });

  it('listener es notificado en cada transición', () => {
    const lifecycle = new OverlayLifecycle();
    const states: string[] = [];

    lifecycle.on((entry) => {
      states.push(entry.state);
    });

    lifecycle.register('scorebug', 90, 'A');
    lifecycle.request('scorebug', { score: '1-0' });
    lifecycle.toPreview('scorebug');
    lifecycle.toProgram('scorebug');
    lifecycle.hide('scorebug');

    expect(states).toEqual([
      'requested',
      'validated',
      'preview',
      'program',
      'hiding',
      'hidden',
    ]);
  });

  it('onEvent() recibe eventos nominados del spec 23', () => {
    const lifecycle = new OverlayLifecycle();
    const events: string[] = [];

    lifecycle.onEvent((ev) => { events.push(ev.type); });

    lifecycle.register('game_event', 80, 'D');
    lifecycle.request('game_event', { result: 'home_run' });
    lifecycle.toPreview('game_event');
    lifecycle.toProgram('game_event');
    lifecycle.hide('game_event');

    expect(events).toEqual([
      'overlay_requested',
      'overlay_validated',
      'overlay_previewed',
      'overlay_programmed',
      'overlay_hidden',
    ]);
  });

  it('toProgram() con holdSeconds auto-oculta el overlay', async () => {
    const lifecycle = new OverlayLifecycle();
    const events: string[] = [];

    lifecycle.onEvent((ev) => { events.push(ev.type); });
    lifecycle.register('announcement', 50, 'E');
    lifecycle.request('announcement', { text: 'Bienvenidos' });
    lifecycle.toProgram('announcement', 0.05); // 50ms

    expect(lifecycle.getEntry('announcement')?.state).toBe('program');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(lifecycle.getEntry('announcement')?.state).toBe('hidden');
    expect(events).toContain('overlay_hold_elapsed');
    expect(events).toContain('overlay_hidden');
  });

  it('hide() cancela el timer holdSeconds si se oculta antes', async () => {
    const lifecycle = new OverlayLifecycle();
    const events: string[] = [];

    lifecycle.onEvent((ev) => { events.push(ev.type); });
    lifecycle.register('countdown', 60, 'D');
    lifecycle.request('countdown', { seconds: 10 });
    lifecycle.toProgram('countdown', 1); // 1 segundo
    lifecycle.hide('countdown', 'Operador ocultó manualmente');

    await new Promise((resolve) => setTimeout(resolve, 50));
    // hold_elapsed NO debe aparecer porque se ocultó antes del timer
    expect(events).not.toContain('overlay_hold_elapsed');
    expect(lifecycle.getEntry('countdown')?.state).toBe('hidden');
  });
});
