import { describe, expect, it } from 'vitest';
import { sanitizeDoctorSignatureProviderForClient } from '@/lib/metaadmin/sanitizeDoctorSignatureProviderForClient';

describe('sanitizeDoctorSignatureProviderForClient', () => {
  it('remove tokens plaintext e criptografados', () => {
    const sanitized = sanitizeDoctorSignatureProviderForClient({
      provider: 'bry_cloud',
      providerLabel: 'BRy',
      providerCategory: 'signature_platform',
      status: 'connected',
      connection: {
        provider: 'bry_cloud',
        status: 'connected',
        accessToken: 'plain',
        refreshToken: 'plain-r',
        accessTokenEncrypted: 'v1:aa:bb:cc',
        refreshTokenEncrypted: 'v1:dd:ee:ff',
        externalAccountId: 'cpf',
      },
    });

    expect(sanitized?.connection?.accessToken).toBeUndefined();
    expect(sanitized?.connection?.refreshToken).toBeUndefined();
    expect(sanitized?.connection?.accessTokenEncrypted).toBeUndefined();
    expect(sanitized?.connection?.refreshTokenEncrypted).toBeUndefined();
    expect(sanitized?.connection?.externalAccountId).toBe('cpf');
  });
});
