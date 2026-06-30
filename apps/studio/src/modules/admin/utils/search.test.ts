import { describe, expect, it } from 'vitest';
import { ADMIN_SEARCH_MIN_CHARS, normalizeAdminSearchTerm } from './search';

describe('admin search normalization', () => {
  it('aplica mínimo de caracteres global', () => {
    expect(ADMIN_SEARCH_MIN_CHARS).toBe(3);
    expect(normalizeAdminSearchTerm('ab')).toBe('');
    expect(normalizeAdminSearchTerm('abc')).toBe('abc');
  });

  it('trimmea y permite override del mínimo', () => {
    expect(normalizeAdminSearchTerm('   usr_001   ')).toBe('usr_001');
    expect(normalizeAdminSearchTerm('ab', 2)).toBe('ab');
  });
});

