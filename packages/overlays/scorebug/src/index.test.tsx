import { describe, expect, it } from 'vitest';

import { Scorebug } from './index';

describe('@mineros/overlay-scorebug', () => {
  it('expone el overlay scorebug', () => {
    expect(Scorebug).toBeTypeOf('function');
  });
});
