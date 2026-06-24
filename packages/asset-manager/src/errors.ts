import type { ErrorCode } from '@mineros/core';

export type AssetManagerError = Error & { code: ErrorCode };

export function createAssetManagerError(code: ErrorCode, message: string): AssetManagerError {
  return Object.assign(new Error(message), {
    name: 'AssetManagerError',
    code,
  });
}
