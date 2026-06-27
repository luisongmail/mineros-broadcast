import { beforeEach, describe, expect, it } from 'vitest';
import type { AssetMetadata } from '@playflow/core';

import { AssetManager } from './AssetManager';

describe('AssetManager', () => {
  let manager: AssetManager;
  let draftAsset: AssetMetadata;
  let approvedAsset: AssetMetadata;

  const expectAssetNotApproved = (assetId: string) => {
    try {
      manager.getApproved(assetId);
      throw new Error('Se esperaba un error ASSET_NOT_APPROVED');
    } catch (error) {
      expect(error).toMatchObject({ code: 'ASSET_NOT_APPROVED' });
    }
  };

  beforeEach(() => {
    manager = new AssetManager();

    draftAsset = {
      assetId: 'AM-BG-001',
      name: 'Fondo de prueba',
      type: 'background',
      owner: 'Club Mineros de Santiago',
      brand: 'Mineros',
      status: 'draft',
      usage: ['scorebug'],
      file: 'assets/background-prueba.jpg',
      format: 'jpg',
      protected: false,
      checksum: 'checksum-bg-001',
      createdAt: '2026-06-23T00:00:00Z',
      updatedAt: '2026-06-23T00:00:00Z',
    };

    approvedAsset = {
      assetId: 'AM-ICON-001',
      name: 'Ícono de prueba',
      type: 'icon',
      owner: 'Club Mineros de Santiago',
      brand: 'Mineros',
      status: 'approved',
      usage: ['scorebug'],
      file: 'assets/icono-prueba.svg',
      format: 'svg',
      protected: false,
      checksum: 'checksum-icon-001',
      createdAt: '2026-06-23T00:00:00Z',
      updatedAt: '2026-06-23T00:00:00Z',
    };

    manager.register(draftAsset);
    manager.register(approvedAsset);
  });

  describe('registro y lectura de assets', () => {
    it('registra un asset nuevo', () => {
      const initialCount = manager.list().length;
      const newAsset: AssetMetadata = {
        assetId: 'AM-TEMPLATE-001',
        name: 'Template de prueba',
        type: 'template',
        owner: 'Club Mineros de Santiago',
        brand: 'Mineros',
        status: 'review',
        usage: ['lineup'],
        file: 'assets/template-prueba.json',
        format: 'json',
        protected: false,
        checksum: 'checksum-template-001',
        createdAt: '2026-06-23T00:00:00Z',
        updatedAt: '2026-06-23T00:00:00Z',
      };

      manager.register(newAsset);

      expect(manager.list()).toHaveLength(initialCount + 1);
      expect(manager.get('AM-TEMPLATE-001')).toEqual(newAsset);
    });

    it('recupera un asset por assetId', () => {
      expect(manager.get(draftAsset.assetId)).toEqual(draftAsset);
    });

    it('retorna undefined para assetId desconocido', () => {
      expect(manager.get('AM-UNKNOWN-999')).toBeUndefined();
    });
  });

  describe('consumo de assets aprobados', () => {
    it('getApproved lanza ASSET_NOT_APPROVED para asset en draft', () => {
      expectAssetNotApproved(draftAsset.assetId);
    });

    it('getApproved lanza ASSET_NOT_APPROVED para asset desconocido', () => {
      expectAssetNotApproved('AM-UNKNOWN-999');
    });

    it('getApproved retorna asset si está approved', () => {
      expect(manager.getApproved(approvedAsset.assetId)).toEqual(approvedAsset);
    });

    it("no permite usar asset en status 'draft' como aprobado", () => {
      expectAssetNotApproved(draftAsset.assetId);
    });
  });

  describe('listado y filtros', () => {
    it('list retorna todos los assets', () => {
      const ids = manager.list().map((asset) => asset.assetId);

      expect(ids).toEqual(
        expect.arrayContaining(['AM-LOGO-001', 'AM-LOGO-002', draftAsset.assetId, approvedAsset.assetId]),
      );
    });

    it('list filtra por type', () => {
      const assets = manager.list({ type: 'icon' });

      expect(assets).toHaveLength(1);
      expect(assets[0]).toEqual(approvedAsset);
    });

    it('list filtra por status', () => {
      const assets = manager.list({ status: 'approved' });
      const ids = assets.map((asset) => asset.assetId);

      expect(ids).toEqual(expect.arrayContaining(['AM-LOGO-001', 'AM-LOGO-002', approvedAsset.assetId]));
      expect(assets.every((asset) => asset.status === 'approved')).toBe(true);
    });
  });

  describe('actualización de estado', () => {
    it('updateStatus cambia el estado del asset', () => {
      manager.updateStatus(draftAsset.assetId, 'approved');

      expect(manager.get(draftAsset.assetId)).toMatchObject({ status: 'approved' });
      expect(manager.getApproved(draftAsset.assetId)).toMatchObject({ assetId: draftAsset.assetId, status: 'approved' });
    });
  });

  describe('assets oficiales de marca', () => {
    it('inicializa con official assets (AM-LOGO-001 y AM-LOGO-002 deben estar approved)', () => {
      expect(manager.get('AM-LOGO-001')).toMatchObject({ assetId: 'AM-LOGO-001', status: 'approved' });
      expect(manager.get('AM-LOGO-002')).toMatchObject({ assetId: 'AM-LOGO-002', status: 'approved' });
    });

    it('AM-LOGO-001 tiene protected=true', () => {
      expect(manager.get('AM-LOGO-001')).toMatchObject({ protected: true });
    });

    it('AM-LOGO-002 tiene protected=true', () => {
      expect(manager.get('AM-LOGO-002')).toMatchObject({ protected: true });
    });
  });
});
