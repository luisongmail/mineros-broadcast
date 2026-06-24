import type { AssetMetadata, AssetStatus, AssetType } from '@mineros/core';

import { createAssetManagerError } from './errors';

export interface IAssetStore {
  register(asset: AssetMetadata): void;
  get(assetId: string): AssetMetadata | undefined;
  getApproved(assetId: string): AssetMetadata;
  list(filter?: { type?: AssetType; status?: AssetStatus }): AssetMetadata[];
  updateStatus(assetId: string, status: AssetStatus): void;
  exists(assetId: string): boolean;
}

function cloneAsset(asset: AssetMetadata): AssetMetadata {
  return {
    ...asset,
    usage: [...asset.usage],
  };
}

export class AssetStore implements IAssetStore {
  private readonly assets = new Map<string, AssetMetadata>();

  constructor(initialAssets: AssetMetadata[] = []) {
    for (const asset of initialAssets) {
      this.register(asset);
    }
  }

  register(asset: AssetMetadata): void {
    if (this.assets.has(asset.assetId)) {
      throw createAssetManagerError('CONFLICT', `El asset "${asset.assetId}" ya está registrado.`);
    }

    this.assets.set(asset.assetId, cloneAsset(asset));
  }

  get(assetId: string): AssetMetadata | undefined {
    const asset = this.assets.get(assetId);
    return asset ? cloneAsset(asset) : undefined;
  }

  getApproved(assetId: string): AssetMetadata {
    const asset = this.assets.get(assetId);

    if (!asset || asset.status !== 'approved') {
      throw createAssetManagerError(
        'ASSET_NOT_APPROVED',
        `El asset "${assetId}" no existe o no está en estado approved.`,
      );
    }

    return cloneAsset(asset);
  }

  list(filter?: { type?: AssetType; status?: AssetStatus }): AssetMetadata[] {
    return Array.from(this.assets.values())
      .filter((asset) => {
        if (filter?.type && asset.type !== filter.type) {
          return false;
        }

        if (filter?.status && asset.status !== filter.status) {
          return false;
        }

        return true;
      })
      .map(cloneAsset);
  }

  updateStatus(assetId: string, status: AssetStatus): void {
    const current = this.assets.get(assetId);

    if (!current) {
      throw createAssetManagerError('NOT_FOUND', `No existe un asset con id "${assetId}".`);
    }

    if (current.protected && current.status !== status) {
      throw createAssetManagerError(
        'LOCKED_RESOURCE',
        `El asset protegido "${assetId}" no puede modificarse sin permiso explícito.`,
      );
    }

    this.assets.set(assetId, {
      ...current,
      status,
      updatedAt: current.status === status ? current.updatedAt : new Date().toISOString(),
      usage: [...current.usage],
    });
  }

  exists(assetId: string): boolean {
    return this.assets.has(assetId);
  }
}
