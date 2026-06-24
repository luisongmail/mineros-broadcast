import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('@mineros/overlay-server', () => {
  it('expone la app contenedora de overlays', () => {
    expect(App).toBeTypeOf('function');
  });
});
