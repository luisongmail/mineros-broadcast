import type { Zone } from './types';

const SAFE_AREA = 60;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

function createSystemZone(
  id: string,
  name: string,
  purpose: string,
  priorityBase: number,
  layout: Pick<Zone, 'x' | 'y' | 'width' | 'height'>,
): Zone {
  return {
    id,
    name,
    purpose,
    ...layout,
    priorityBase,
    editable: true,
    removable: false,
    visible: true,
    responsive: true,
    safeAreaRequired: true,
    assignedOverlays: [],
  };
}

export function createDefaultZones(): Zone[] {
  return [
    createSystemZone('zone-a', 'Zona A', 'Informacinnn Permanente', 100, { x: 60, y: 960, width: 480, height: 60 }),
    createSystemZone('zone-b', 'Zona B', 'Informacinnn Principal', 90, { x: 72, y: 300, width: 520, height: 240 }),
    createSystemZone('zone-c', 'Zona C', 'Informacinnn Contextual', 80, { x: 1328, y: 300, width: 520, height: 220 }),
    createSystemZone('zone-d', 'Zona D', 'Informacinnn Comercial', 70, { x: 1328, y: 72, width: 520, height: 180 }),
    createSystemZone('zone-e', 'Zona E', 'Informacinnn Auxiliar', 60, { x: 72, y: 72, width: 420, height: 160 }),
    createSystemZone('zone-f', 'Zona F', 'Contenido Full Screen', 50, { x: 60, y: 60, width: 1800, height: 960 }),
  ];
}

function cloneZone(zone: Zone): Zone {
  return {
    ...zone,
    assignedOverlays: [...zone.assignedOverlays],
  };
}

export class ZoneManager {
  private zones = new Map<string, Zone>();

  constructor(initialZones: Zone[] = createDefaultZones()) {
    this.replaceAll(initialZones);
  }

  getZones(): Zone[] {
    return [...this.zones.values()].map(cloneZone);
  }

  getZone(zoneId: string): Zone | null {
    const zone = this.zones.get(zoneId);
    return zone ? cloneZone(zone) : null;
  }

  createZone(zone: Zone): Zone {
    if (this.zones.has(zone.id)) {
      throw new Error(`La zona '${zone.id}' ya existe.`);
    }

    if (!zone.removable) {
      throw new Error('Las zonas personalizadas G+ deben ser removibles.');
    }

    this.assertSafeArea(zone);
    this.zones.set(zone.id, cloneZone(zone));

    return cloneZone(zone);
  }

  removeZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);

    if (!zone) {
      throw new Error(`La zona '${zoneId}' no existe.`);
    }

    if (!zone.removable) {
      throw new Error(`La zona '${zoneId}' no puede eliminarse.`);
    }

    this.zones.delete(zoneId);
  }

  updateZone(zoneId: string, changes: Partial<Omit<Zone, 'id'>>): Zone {
    const zone = this.zones.get(zoneId);

    if (!zone) {
      throw new Error(`La zona '${zoneId}' no existe.`);
    }

    const updated: Zone = {
      ...zone,
      ...changes,
      assignedOverlays: changes.assignedOverlays ? [...changes.assignedOverlays] : [...zone.assignedOverlays],
    };

    this.assertSafeArea(updated);
    this.zones.set(zoneId, cloneZone(updated));

    return cloneZone(updated);
  }

  replaceAll(zones: Zone[]): void {
    this.zones = new Map(zones.map((zone) => [zone.id, cloneZone(zone)]));
  }

  private assertSafeArea(zone: Zone): void {
    if (!zone.safeAreaRequired) {
      return;
    }

    const withinHorizontalBounds = zone.x >= SAFE_AREA && zone.x + zone.width <= CANVAS_WIDTH - SAFE_AREA;
    const withinVerticalBounds = zone.y >= SAFE_AREA && zone.y + zone.height <= CANVAS_HEIGHT - SAFE_AREA;

    if (!withinHorizontalBounds || !withinVerticalBounds) {
      throw new Error(`La zona '${zone.id}' viola el Safe Area de ${SAFE_AREA}px.`);
    }
  }
}
