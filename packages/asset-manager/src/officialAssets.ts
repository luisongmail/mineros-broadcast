import type { AssetMetadata } from '@playflow/core';

export const OFFICIAL_ASSETS: AssetMetadata[] = [
  {
    assetId: 'AM-LOGO-001',
    name: 'Logo oficial Mineros',
    type: 'logo',
    owner: 'Club Mineros de Santiago',
    brand: 'Mineros',
    status: 'approved',
    usage: ['scorebug', 'lineup', 'summary', 'fullscreen'],
    file: '03-asset-manager-assets/AM-LOGO-001-mineros-oficial.png',
    format: 'png',
    protected: true,
    checksum: 'oficial-mineros-v1',
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
  },
  {
    assetId: 'AM-LOGO-002',
    name: 'Logo oficial Merchise',
    type: 'logo',
    owner: 'Merchise',
    brand: 'Merchise',
    status: 'approved',
    usage: ['scorebug', 'lineup', 'summary', 'fullscreen'],
    file: '03-asset-manager-assets/AM-LOGO-002-merchise-oficial.png',
    format: 'png',
    protected: true,
    checksum: 'oficial-merchise-v1',
    createdAt: '2026-06-23T00:00:00Z',
    updatedAt: '2026-06-23T00:00:00Z',
  },
];
