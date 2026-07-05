import { describe, expect, it } from 'vitest';
import { BRY_SIGNATURE_MISSING_TOKEN_ERROR } from '@/lib/signature/brySignatureConstants';
import {
  isBryPrescriptionReconnectNeeded,
  isBrySignatureSessionExpiredOnClient,
} from '@/lib/signature/bryPrescriptionReconnect';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('bryPrescriptionReconnect', () => {
  it('isBryPrescriptionReconnectNeeded reconhece credenciais ausentes', () => {
    expect(
      isBryPrescriptionReconnectNeeded({ message: BRY_SIGNATURE_MISSING_TOKEN_ERROR })
    ).toBe(true);
  });

  it('isBrySignatureSessionExpiredOnClient com quota esgotada', () => {
    const expired = isBrySignatureSessionExpiredOnClient({
      provider: 'remoteid',
      providerLabel: 'RemoteID',
      providerCategory: 'cloud_certificate',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'remoteid',
        signatureSessionMaxDocuments: 10,
        signatureSessionUsedDocuments: 10,
        signatureSessionExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
    });
    expect(expired).toBe(true);
  });
});
