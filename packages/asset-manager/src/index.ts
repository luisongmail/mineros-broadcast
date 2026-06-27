import type { AssetMetadata } from '@playflow/core';

export * from './AssetManager';
export * from './AssetStore';
export * from './AssetValidator';
export * from './errors';
export * from './officialAssets';

export interface AssetRecord extends AssetMetadata {
  metadata?: Record<string, unknown>;
}

export function createAssetRecord(asset: AssetRecord): AssetRecord {
  return {
    ...asset,
    usage: [...asset.usage],
    metadata: asset.metadata ? { ...asset.metadata } : undefined,
  };
}

export function isAssetApproved(asset: Pick<AssetRecord, 'status'>): boolean {
  return asset.status === 'approved';
}
