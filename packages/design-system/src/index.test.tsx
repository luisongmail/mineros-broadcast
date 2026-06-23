import { describe, expect, it } from 'vitest';

import { BroadcastShell, designTokens } from './index';

describe('@mineros/design-system', () => {
  it('expone tokens oficiales', () => {
    expect(designTokens.colors.minerosRed).toBe('#D71920');
  });

  it('expone el contenedor visual base', () => {
    expect(BroadcastShell).toBeTypeOf('function');
  });
});
