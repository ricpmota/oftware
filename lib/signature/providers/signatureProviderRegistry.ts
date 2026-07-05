import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import { bryCloudSignatureProviderAdapter } from '@/lib/signature/providers/bryCloudSignatureProviderAdapter';
import { lacunaRestPkiSignatureProviderAdapter } from '@/lib/signature/providers/lacunaRestPkiSignatureProviderAdapter';
import { sandboxSignatureProviderAdapter } from '@/lib/signature/providers/sandboxSignatureProviderAdapter';
import { createUnimplementedSignatureProviderAdapter } from '@/lib/signature/providers/unimplementedSignatureProviderAdapter';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';
import { BRY_CLOUD_PROVIDER_ID, LACUNA_REST_PKI_PROVIDER_ID } from '@/types/signatureProviderAdapter';

export { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';

const REGISTERED_ADAPTERS: Record<string, SignatureProviderAdapter> = {
  [SANDBOX_MOCK_PROVIDER_ID]: sandboxSignatureProviderAdapter,
  [BRY_CLOUD_PROVIDER_ID]: bryCloudSignatureProviderAdapter,
  [LACUNA_REST_PKI_PROVIDER_ID]: lacunaRestPkiSignatureProviderAdapter,
};

/** IDs com adapter registrado (sandbox, bry_cloud, lacuna stub). */
export function listRegisteredSignatureProviderIds(): string[] {
  return Object.keys(REGISTERED_ADAPTERS);
}

export function isSignatureProviderRegistered(providerId: string): boolean {
  return providerId in REGISTERED_ADAPTERS;
}

/**
 * Retorna adapter do provedor.
 * - `sandbox_mock` → {@link sandboxSignatureProviderAdapter}
 * - `bry_cloud` → BRy Cloud (certificado em nuvem / BRYKMS)
 * - `lacuna_rest_pki` → stub Lacuna
 * - demais → adapter que retorna integração indisponível
 */
export function getSignatureProviderAdapter(providerId: string): SignatureProviderAdapter {
  const id = providerId?.trim();
  if (id && REGISTERED_ADAPTERS[id]) {
    return REGISTERED_ADAPTERS[id];
  }
  return createUnimplementedSignatureProviderAdapter(id || 'unknown');
}
