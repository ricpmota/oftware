import { describe, expect, it } from 'vitest';
import { buildBryCloudConnectedProvider } from '@/lib/metaadmin/buildBryCloudConnectedProvider';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('buildBryCloudConnectedProvider', () => {
  it('salva connection.pscProvider e connection.pscName', () => {
    const config = buildBryCloudConnectedProvider(
      {
        provider: 'safeid',
        customProviderName: '',
        customProviderUrl: '',
        customProviderNotes: '',
      },
      { updatedAt: new Date(), connectedAt: new Date() },
      {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        accessTokenEncrypted: 'v1:a:b:c',
      },
      { pscProvider: 'safeid' }
    );

    expect(config.provider).toBe('safeid');
    expect(config.connection?.provider).toBe(BRY_CLOUD_PROVIDER_ID);
    expect(config.connection?.pscProvider).toBe('safeid');
    expect(config.connection?.pscName).toBe('SafeID');
  });
});
