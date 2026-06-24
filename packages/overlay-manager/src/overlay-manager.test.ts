import { describe, expect, it } from 'vitest';

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
