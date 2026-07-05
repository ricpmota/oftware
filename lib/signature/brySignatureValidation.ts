import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import {
  BRY_PSC_GENERIC_CONNECT_ERROR,
  usesBryCloudSigning,
} from '@/lib/signature/providers/bryPscNameMap';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import {
  BRY_CLOUD_PROVIDER_ID,
  BRY_SIGNATURE_MISSING_TOKEN_ERROR,
  BRY_SIGNATURE_NOT_CONNECTED_ERROR,
} from '@/lib/signature/brySignatureConstants';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

export type BryDoctorValidationResult =
  | { ok: true; provider: DoctorSignatureProvider }
  | { ok: false; message: string };

function hasStoredBryAccessToken(provider: DoctorSignatureProvider): boolean {
  const conn = provider.connection;
  if (!conn) return false;
  if (conn.accessTokenEncrypted?.trim()) return true;
  if (process.env.NODE_ENV !== 'production' && conn.accessToken?.trim()) return true;
  return false;
}

export function validateBryDoctorForSigning(
  providerConfig: DoctorSignatureProvider | null | undefined
): BryDoctorValidationResult {
  if (!providerConfig || !usesBryCloudSigning(providerConfig)) {
    return { ok: false, message: NON_SANDBOX_PROVIDER_SIGNATURE_ERROR };
  }

  if (
    providerConfig.provider === BRY_CLOUD_PROVIDER_ID &&
    !providerConfig.connection?.pscName &&
    !providerConfig.connection?.pscProvider
  ) {
    return { ok: false, message: BRY_PSC_GENERIC_CONNECT_ERROR };
  }

  if (!isSignatureProviderConnected(providerConfig)) {
    return { ok: false, message: BRY_SIGNATURE_NOT_CONNECTED_ERROR };
  }

  if (providerConfig.connection?.status && providerConfig.connection.status !== 'connected') {
    return { ok: false, message: BRY_SIGNATURE_NOT_CONNECTED_ERROR };
  }

  if (!hasStoredBryAccessToken(providerConfig)) {
    return { ok: false, message: BRY_SIGNATURE_MISSING_TOKEN_ERROR };
  }

  return { ok: true, provider: providerConfig };
}
