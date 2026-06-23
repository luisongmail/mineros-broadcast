import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('@mineros/control-panel', () => {
  it('expone la aplicacinnn base', () => {
    expect(App).toBeTypeOf('function');
  });
});
