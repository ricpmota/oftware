import { describe, expect, it } from 'vitest';
import {
  buildBryPendingAuthRecord,
  sanitizeBryPendingAuthForFirestore,
} from '@/lib/signature/providers/bryPendingAuth.server';

describe('bryPendingAuth.server', () => {
  it('sanitizeBryPendingAuthForFirestore omite campos opcionais vazios', () => {
    const record = buildBryPendingAuthRecord({
      medicoId: 'm1',
      nonce: 'nonce-1',
      integraApiKey: 'key-12345678',
    });
    const data = sanitizeBryPendingAuthForFirestore(record);
    expect(data.integraApiKey).toBe('key-12345678');
    expect('authorizationContextId' in data).toBe(false);
    expect('authorizationUrl' in data).toBe(false);
    expect('pscProvider' in data).toBe(false);
    expect('pscLinkResponseKeys' in data).toBe(false);
  });

  it('buildBryPendingAuthRecord não define authorizationContextId quando ausente', () => {
    const record = buildBryPendingAuthRecord({
      medicoId: 'm1',
      nonce: 'nonce-2',
      integraApiKey: 'abc',
    });
    expect(record.authorizationContextId).toBeUndefined();
    expect(Object.hasOwn(record, 'authorizationContextId')).toBe(false);
  });
});
