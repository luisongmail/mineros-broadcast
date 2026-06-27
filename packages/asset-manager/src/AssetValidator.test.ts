import { beforeEach, describe, expect, it } from 'vitest';
import type { AssetMetadata } from '@playflow/core';

import { validateAsset } from './AssetValidator';

describe('AssetValidator', () => {
  let validAsset: AssetMetadata;

  beforeEach(() => {
    validAsset = {
      assetId: 'AM-LOGO-999',
      name: 'Logo de prueba',
      type: 'logo',
      owner: 'Club Mineros de Santiago',
      brand: 'Mineros',
      status: 'approved',
      usage: ['scorebug'],
      file: 'assets/logo-prueba.png',
      format: 'png',
      protected: false,
      checksum: 'checksum-de-prueba',
      createdAt: '2026-06-23T00:00:00Z',
      updatedAt: '2026-06-23T00:00:00Z',
    };
  });

  describe('validaciones mínimas de AM-007', () => {
    it('valida asset completo y correcto sin errores', () => {
      expect(() => validateAsset(validAsset)).not.toThrow();
    });

    it('lanza error si assetId está vacío', () => {
      expect(() => validateAsset({ ...validAsset, assetId: '' })).toThrow(/assetId/i);
    });

    it('lanza error si name está vacío', () => {
      expect(() => validateAsset({ ...validAsset, name: '' })).toThrow(/name/i);
    });

    it('lanza error si type no es uno de los permitidos', () => {
      expect(() => validateAsset({ ...validAsset, type: 'invalid-type' as never })).toThrow(/type/i);
    });

    it('lanza error si status no es uno de los permitidos', () => {
      expect(() => validateAsset({ ...validAsset, status: 'invalid-status' as never })).toThrow(/status/i);
    });

    it('lanza error si format no es png/svg/jpg/webp/json', () => {
      expect(() => validateAsset({ ...validAsset, format: 'gif' as never })).toThrow(/format/i);
    });

    it('lanza error si file está vacío', () => {
      expect(() => validateAsset({ ...validAsset, file: '' })).toThrow(/file/i);
    });

    it('lanza error si checksum está vacío', () => {
      expect(() => validateAsset({ ...validAsset, checksum: '' })).toThrow(/checksum/i);
    });

    it('lanza error si owner está vacío', () => {
      expect(() => validateAsset({ ...validAsset, owner: '' })).toThrow(/owner/i);
    });
  });
});
