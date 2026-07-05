import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import {
  NON_SANDBOX_PROVIDER_SIGNATURE_ERROR,
  SANDBOX_MOCK_PROVIDER_ID,
  SANDBOX_SIGNATURE_NOT_CONNECTED_ERROR,
} from '@/lib/signature/sandboxSignatureConstants';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

export type SandboxDoctorValidationResult =
  | { ok: true; provider: DoctorSignatureProvider }
  | { ok: false; message: string };

export function validateSandboxDoctorForSigning(
  providerConfig: DoctorSignatureProvider | null | undefined
): SandboxDoctorValidationResult {
  if (!providerConfig || providerConfig.provider !== SANDBOX_MOCK_PROVIDER_ID) {
    return { ok: false, message: NON_SANDBOX_PROVIDER_SIGNATURE_ERROR };
  }

  if (!isSignatureProviderConnected(providerConfig)) {
    return { ok: false, message: SANDBOX_SIGNATURE_NOT_CONNECTED_ERROR };
  }

  return { ok: true, provider: providerConfig };
}
