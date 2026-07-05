import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import type { SignatureAdapterErrorCode } from '@/types/signatureProviderAdapter';

export { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR };

export function notImplementedAdapterError(providerId: string): {
  ok: false;
  error: string;
  code: SignatureAdapterErrorCode;
} {
  return {
    ok: false,
    error: NON_SANDBOX_PROVIDER_SIGNATURE_ERROR,
    code: 'not_implemented',
  };
}

export function stubAdapterError(message: string): {
  ok: false;
  error: string;
  code: SignatureAdapterErrorCode;
} {
  return { ok: false, error: message, code: 'stub' };
}

export function notConfiguredAdapterError(message: string): {
  ok: false;
  error: string;
  code: SignatureAdapterErrorCode;
} {
  return { ok: false, error: message, code: 'not_configured' };
}
