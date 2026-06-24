import type { AssetMetadata, AssetStatus, AssetType } from '@mineros/core';

const ALLOWED_TYPES: AssetType[] = [
  'logo',
  'player_photo',
  'sponsor_asset',
  'background',
  'icon',
  'template',
  'lower_third',
  'broadcast_graphic',
];

const ALLOWED_STATUSES: AssetStatus[] = [
  'draft',
  'review',
  'approved',
  'rejected',
  'archived',
  'expired',
];

const ALLOWED_FORMATS: AssetMetadata['format'][] = ['png', 'svg', 'jpg', 'webp', 'json'];
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRequiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Asset inválido: "${field}" es obligatorio y no puede estar vacío.`);
  }

  return value.trim();
}

function assertReadableName(name: string): void {
  if (name.length < 3 || !/[\p{L}\p{N}]/u.test(name)) {
    throw new Error('Asset inválido: "name" debe ser legible.');
  }
}

function assertAllowedType(type: string): asserts type is AssetType {
  if (!ALLOWED_TYPES.includes(type as AssetType)) {
    throw new Error(`Asset inválido: "type" debe ser uno de ${ALLOWED_TYPES.join(', ')}.`);
  }
}

function assertAllowedStatus(status: string): asserts status is AssetStatus {
  if (!ALLOWED_STATUSES.includes(status as AssetStatus)) {
    throw new Error(`Asset inválido: "status" debe ser uno de ${ALLOWED_STATUSES.join(', ')}.`);
  }
}

function assertAllowedFormat(format: string): asserts format is AssetMetadata['format'] {
  if (!ALLOWED_FORMATS.includes(format as AssetMetadata['format'])) {
    throw new Error(`Asset inválido: "format" debe ser uno de ${ALLOWED_FORMATS.join(', ')}.`);
  }
}

function readUsage(record: Record<string, unknown>): string[] {
  const value = record.usage;

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Asset inválido: "usage" debe ser un arreglo no vacío.');
  }

  const usage = value.map((entry) => {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error('Asset inválido: cada valor de "usage" debe ser un string no vacío.');
    }

    return entry.trim();
  });

  return usage;
}

function readProtected(record: Record<string, unknown>): boolean {
  if (typeof record.protected !== 'boolean') {
    throw new Error('Asset inválido: "protected" debe ser boolean.');
  }

  return record.protected;
}

function readIsoDate(record: Record<string, unknown>, field: 'createdAt' | 'updatedAt'): string {
  const value = readRequiredString(record, field);

  if (!ISO_DATETIME_REGEX.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`Asset inválido: "${field}" debe ser una fecha ISO válida.`);
  }

  return value;
}

export function validateAsset(asset: unknown): AssetMetadata {
  if (!isRecord(asset)) {
    throw new Error('Asset inválido: se esperaba un objeto con metadata.');
  }

  const assetId = readRequiredString(asset, 'assetId');
  const name = readRequiredString(asset, 'name');
  const type = readRequiredString(asset, 'type');
  const owner = readRequiredString(asset, 'owner');
  const brand = readRequiredString(asset, 'brand');
  const status = readRequiredString(asset, 'status');
  const file = readRequiredString(asset, 'file');
  const format = readRequiredString(asset, 'format');
  const checksum = readRequiredString(asset, 'checksum');
  const usage = readUsage(asset);
  const createdAt = readIsoDate(asset, 'createdAt');
  const updatedAt = readIsoDate(asset, 'updatedAt');
  const isProtected = readProtected(asset);

  assertReadableName(name);
  assertAllowedType(type);
  assertAllowedStatus(status);
  assertAllowedFormat(format);

  return {
    assetId,
    name,
    type,
    owner,
    brand,
    status,
    usage,
    file,
    format,
    protected: isProtected,
    checksum,
    createdAt,
    updatedAt,
  };
}

export const AssetValidator = {
  validateAsset,
};
