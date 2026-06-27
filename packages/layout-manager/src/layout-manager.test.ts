import { describe, expect, it } from 'vitest';

import { LayoutManager } from './LayoutManager';
import { PreviewProgram } from './PreviewProgram';
import { ZoneManager } from './ZoneManager';
import type { LayoutSnapshot, Zone } from './types';

function createCustomZone(id: string): Zone {
  return {
    id,
    name: 'Zona G',
    purpose: 'Informacinnn adicional',
    x: 200,
    y: 200,
    width: 320,
    height: 140,
    priorityBase: 40,
    editable: true,
    removable: true,
    visible: true,
    responsive: true,
    safeAreaRequired: true,
    assignedOverlays: [],
  };
}

function createSnapshot(overrides: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  const zones = new ZoneManager().getZones();

  return {
    profileId: 'profile-001',
    zones,
    scenes: [],
    overlayAssignments: [],
    activeSceneId: null,
    ...overrides,
  };
}

describe('@playflow/layout-manager', () => {
  it('ZoneManager inicializa con zonas A-F', () => {
    const zoneManager = new ZoneManager();

    expect(zoneManager.getZones().map((zone) => zone.id)).toEqual([
      'zone-a',
      'zone-b',
      'zone-c',
      'zone-d',
      'zone-e',
      'zone-f',
    ]);
  });

  it('las zonas A-F no se pueden eliminar', () => {
    const zoneManager = new ZoneManager();

    expect(() => zoneManager.removeZone('zone-a')).toThrow(/no puede eliminarse/i);
  });

  it('se pueden crear y eliminar zonas G+', () => {
    const zoneManager = new ZoneManager();

    zoneManager.createZone(createCustomZone('zone-g-1'));
    expect(zoneManager.getZone('zone-g-1')).not.toBeNull();

    zoneManager.removeZone('zone-g-1');
    expect(zoneManager.getZone('zone-g-1')).toBeNull();
  });

  it('preparePreview marca el estado como preview_dirty', () => {
    const previewProgram = new PreviewProgram(createSnapshot());

    previewProgram.preparePreview({ activeSceneId: 'scene-1' });

    expect(previewProgram.getState()).toBe('preview_dirty');
  });

  it('take con estado vlido cambia a program_live', () => {
    const layoutManager = new LayoutManager();

    layoutManager.preparePreview({ activeSceneId: 'scene-2' });
    layoutManager.take();

    expect(layoutManager.getState()).toBe('program_live');
    expect(layoutManager.getProgramState().activeSceneId).toBe('scene-2');
  });

  it('cancel vuelve a idle', () => {
    const layoutManager = new LayoutManager();

    layoutManager.preparePreview({ activeSceneId: 'scene-3' });
    layoutManager.cancel();

    expect(layoutManager.getState()).toBe('idle');
    expect(layoutManager.getPreviewState().activeSceneId).toBeNull();
  });

  it('revert restaura el estado anterior desde historial', () => {
    const previewProgram = new PreviewProgram(createSnapshot());

    previewProgram.preparePreview({ activeSceneId: 'scene-1' });
    previewProgram.take();
    previewProgram.preparePreview({ activeSceneId: 'scene-2' });
    previewProgram.take();
    previewProgram.revert();

    expect(previewProgram.getState()).toBe('reverted');
    expect(previewProgram.getProgramState().activeSceneId).toBe('scene-1');
  });

  it('el historial no supera 10 niveles', () => {
    const previewProgram = new PreviewProgram(createSnapshot());

    for (let index = 0; index < 12; index += 1) {
      previewProgram.preparePreview({ activeSceneId: `scene-${index}` });
    }

    expect(previewProgram.getHistory()).toHaveLength(10);
  });
});
