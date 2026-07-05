import {
  buildDoctorSignatureProviderPayload,
  findDoctorSignatureProviderOption,
} from '@/lib/metaadmin/doctorSignatureProviders';
import { resolveBryPscNameFromProvider } from '@/lib/signature/providers/bryPscNameMap';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type { DoctorSignatureProviderFormState } from '@/types/doctorSignatureProvider';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';
import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

export function buildBryCloudConnectedProvider(
  form: DoctorSignatureProviderFormState,
  timestamps: { updatedAt: unknown; connectedAt: unknown },
  connection: DoctorSignatureProviderConnection,
  options?: { pscProvider?: string }
): DoctorSignatureProvider {
  const pscProvider =
    options?.pscProvider?.trim() ||
    connection.pscProvider?.trim() ||
    form.provider?.trim() ||
    '';
  const pscName =
    connection.pscName?.trim() || resolveBryPscNameFromProvider(pscProvider) || undefined;
  const formForPayload: DoctorSignatureProviderFormState = {
    ...form,
    provider: pscProvider || form.provider,
  };
  const base = buildDoctorSignatureProviderPayload(formForPayload, timestamps.updatedAt, {
    preserveConnectionFrom: null,
  });
  const option = findDoctorSignatureProviderOption(pscProvider);

  const status =
    connection.status === 'connected' ? ('connected' as const) : ('error' as const);

  return {
    ...base,
    provider: pscProvider || base.provider,
    providerLabel: option?.providerLabel ?? base.providerLabel,
    providerCategory: 'cloud_certificate',
    status,
    connectedAt: timestamps.connectedAt as DoctorSignatureProvider['connectedAt'],
    updatedAt: timestamps.updatedAt as DoctorSignatureProvider['updatedAt'],
    connection: {
      ...connection,
      provider: BRY_CLOUD_PROVIDER_ID,
      ...((pscProvider || connection.pscProvider) && {
        pscProvider: pscProvider || connection.pscProvider,
      }),
      ...(pscName ? { pscName } : {}),
    },
  };
}
