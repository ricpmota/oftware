import { describe, expect, it, vi } from 'vitest';
import {
  applyPscSigningKmsToConnection,
  resolvePscSigningKmsFromConnection,
} from '@/lib/security/bryOAuthTokens.server';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('bryOAuthTokens PSC kms persistence', () => {
  it('applyPscSigningKmsToConnection persiste e resolve token hex', () => {
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', Buffer.alloc(32, 2).toString('base64'));

    const conn = applyPscSigningKmsToConnection(
      { provider: BRY_CLOUD_PROVIDER_ID, status: 'connected' },
      { token: 'abc123def456', user: '12345678901', uuid_cert: 'cert-uuid-1' }
    );

    expect(conn.pscSigningKmsUser).toBe('12345678901');
    expect(conn.pscSigningKmsUuidCert).toBe('cert-uuid-1');
    expect(conn.pscSigningKmsTokenEncrypted).toBeTruthy();

    const kms = resolvePscSigningKmsFromConnection(conn);
    expect(kms).toEqual({
      token: 'abc123def456',
      user: '12345678901',
      uuid_cert: 'cert-uuid-1',
    });
  });
});
