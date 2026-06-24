import { describe, expect, it } from 'vitest';

import { createErrorEnvelope } from './index';

describe('@mineros/core', () => {
  it('crea envelopes de error vlidos', () => {
    const envelope = createErrorEnvelope('core', 'overlay', 'NOT_FOUND', 'Missing asset');

    expect(envelope.messageType).toBe('error');
    expect(envelope.payload.code).toBe('NOT_FOUND');
  });
});
