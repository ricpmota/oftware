import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import { notImplementedAdapterError } from '@/lib/signature/providers/signatureProviderErrors';

/** Adapter genérico para provedores ainda sem implementação. */
export function createUnimplementedSignatureProviderAdapter(providerId: string): SignatureProviderAdapter {
  const fail = () => Promise.resolve(notImplementedAdapterError(providerId));

  return {
    providerId,
    startAuthorization: fail,
    submitPdfForSignature: fail,
    getSignatureStatus: fail,
    downloadSignedPdf: fail,
  };
}
