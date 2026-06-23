import { describe, expect, it } from 'vitest';

import { AssetManager, validateAsset } from '../src';

const draftAsset = {
  assetId: 'AM-ICON-001',
  name: 'Icono marcador',
  type: 'icon' as const,
  owner: 'Producción',
  brand: 'Mineros',
  status: 'draft' as const,
  usage: ['scorebug'],
  file: 'icons/scorebug.json',
  format: 'json' as const,
  protected: false,
  checksum: 'icono-v1',
  createdAt: '2026-06-23T12:00:00Z',
  updatedAt: '2026-06-23T12:00:00Z',
};

describe('AssetManager', () => {
  it('precarga los assets oficiales aprobados', () => {
    const manager = new AssetManager();

    expect(manager.getApproved('AM-LOGO-001').name).toBe('Logo oficial Mineros');
    expect(manager.list({ type: 'logo', status: 'approved' })).toHaveLength(2);
  });

  it('valida y registra assets nuevos', () => {
    const manager = new AssetManager();

    const registered = manager.register(draftAsset);

    expect(registered.assetId).toBe('AM-ICON-001');
    expect(manager.get('AM-ICON-001')?.status).toBe('draft');
  });

  it('impide consumir assets no aprobados', () => {
    const manager = new AssetManager([draftAsset]);

    expect(() => manager.getApproved('AM-ICON-001')).toThrow(/approved/);
  });

  it('protege assets oficiales contra cambios de estado', () => {
    const manager = new AssetManager();

    expect(() => manager.updateStatus('AM-LOGO-001', 'archived')).toThrow(/protegido/);
  });

  it('resuelve URLs usando el archivo lógico del asset aprobado', () => {
    const manager = new AssetManager();

    expect(manager.resolveUrl('AM-LOGO-002', 'https://cdn.mineros.test/assets/')).toBe(
      'https://cdn.mineros.test/assets/03-asset-manager-assets/AM-LOGO-002-merchise-oficial.png',
    );
  });
});

describe('validateAsset', () => {
  it('rechaza metadata inválida', () => {
    expect(() => validateAsset({ ...draftAsset, format: 'gif' })).toThrow(/format/);
  });
});
