import type { AssetMetadata, AssetStatus, AssetType } from '@playflow/core';

import { AssetStore } from './AssetStore';
import { validateAsset } from './AssetValidator';
import { OFFICIAL_ASSETS } from './officialAssets';

export class AssetManager {
  private readonly store: AssetStore;

  constructor(initialAssets: AssetMetadata[] = []) {
    this.store = new AssetStore([...OFFICIAL_ASSETS, ...initialAssets]);
  }

  register(asset: unknown): AssetMetadata {
    const validatedAsset = validateAsset(asset);
    this.store.register(validatedAsset);
    return validatedAsset;
  }

  get(assetId: string): AssetMetadata | undefined {
    return this.store.get(assetId);
  }

  getApproved(assetId: string): AssetMetadata {
    return this.store.getApproved(assetId);
  }

  list(filter?: { type?: AssetType; status?: AssetStatus }): AssetMetadata[] {
    return this.store.list(filter);
  }

  updateStatus(assetId: string, status: AssetStatus): void {
    this.store.updateStatus(assetId, status);
  }

  resolveUrl(assetId: string, baseUrl?: string): string {
    const asset = this.store.getApproved(assetId);
    const relativePath = asset.file.replace(/^\/+/, '');

    if (!baseUrl) {
      return relativePath;
    }

    return `${baseUrl.replace(/\/+$/, '')}/${relativePath}`;
  }
}
