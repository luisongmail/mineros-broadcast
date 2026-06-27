import { describe, expect, it } from 'vitest';

import { Scorebug } from './index';

describe('@playflow/overlay-scorebug', () => {
  it('expone el overlay scorebug', () => {
    expect(Scorebug).toBeTypeOf('function');
  });
});
