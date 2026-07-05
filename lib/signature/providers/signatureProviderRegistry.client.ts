import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import { bryCloudSignatureProviderAdapterClient } from '@/lib/signature/providers/bryCloudSignatureProviderAdapter.client';
import { lacunaRestPkiSignatureProviderAdapter } from '@/lib/signature/providers/lacunaRestPkiSignatureProviderAdapter';
import { sandboxSignatureProviderAdapterClient } from '@/lib/signature/providers/sandboxSignatureProviderAdapter.client';
import { createUnimplementedSignatureProviderAdapter } from '@/lib/signature/providers/unimplementedSignatureProviderAdapter';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';
import { BRY_CLOUD_PROVIDER_ID, LACUNA_REST_PKI_PROVIDER_ID } from '@/types/signatureProviderAdapter';

export { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';

const CLIENT_ADAPTERS: Record<string, SignatureProviderAdapter> = {
  [SANDBOX_MOCK_PROVIDER_ID]: sandboxSignatureProviderAdapterClient,
  [BRY_CLOUD_PROVIDER_ID]: bryCloudSignatureProviderAdapterClient,
  [LACUNA_REST_PKI_PROVIDER_ID]: lacunaRestPkiSignatureProviderAdapter,
};

/** Registry seguro para o browser (sem Firebase Admin). */
export function getSignatureProviderAdapterClient(providerId: string): SignatureProviderAdapter {
  const id = providerId?.trim();
  if (id && CLIENT_ADAPTERS[id]) {
    return CLIENT_ADAPTERS[id];
  }
  return createUnimplementedSignatureProviderAdapter(id || 'unknown');
}
