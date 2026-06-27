import { describe, expect, it } from 'vitest';

import { isAssetApproved } from './index';

describe('@playflow/asset-manager', () => {
  it('reconoce assets aprobados', () => {
    expect(isAssetApproved({ status: 'approved' })).toBe(true);
    expect(isAssetApproved({ status: 'draft' })).toBe(false);
  });
});
