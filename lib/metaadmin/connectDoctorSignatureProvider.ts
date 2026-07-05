import {
  buildSandboxConnectedProvider,
  canConnectSignatureProvider,
  isPhysicalCertificateProvider,
  isSandboxMockProvider,
  resolveConnectableProviderId,
} from '@/lib/metaadmin/doctorSignatureProviders';
import {
  isBryCompatiblePscProvider,
  normalizeSignatureProviderId,
} from '@/lib/signature/providers/bryPscNameMap';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import { getSignatureProviderAdapterClient } from '@/lib/signature/providers/signatureProviderRegistry.client';
import { MedicoService } from '@/services/medicoService';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type { DoctorSignatureProviderFormState } from '@/types/doctorSignatureProvider';

export type ConnectDoctorSignatureProviderParams = {
  providerId: string;
  form: DoctorSignatureProviderFormState;
  medicoId: string;
  /** Timestamps Firestore (ex.: serverTimestamp()). */
  timestamps: { updatedAt: unknown; connectedAt: unknown };
  returnUrl?: string;
  /** Firebase ID token — obrigatório para `bry_cloud` no browser. */
  authToken?: string;
};

export type ConnectDoctorSignatureProviderResult =
  | { ok: true; mode: 'immediate'; config: DoctorSignatureProvider; successMessage: string }
  | { ok: true; mode: 'redirect'; authorizationUrl: string }
  | { ok: false; error: string };

export type ConnectDoctorSignatureProviderDeps = {
  getAdapter?: typeof getSignatureProviderAdapterClient;
  updateMedico?: typeof MedicoService.updateMedico;
};

/**
 * Conecta provedor via adapter.startAuthorization (client-safe registry).
 */
export async function connectDoctorSignatureProvider(
  params: ConnectDoctorSignatureProviderParams,
  deps: ConnectDoctorSignatureProviderDeps = {}
): Promise<ConnectDoctorSignatureProviderResult> {
  const getAdapter = deps.getAdapter ?? getSignatureProviderAdapterClient;
  const updateMedico = deps.updateMedico ?? MedicoService.updateMedico;

  const gate = canConnectSignatureProvider(params.form);
  if (!gate.ok) {
    return { ok: false, error: gate.reason ?? 'Não foi possível conectar.' };
  }

  const medicoId = params.medicoId?.trim();
  if (!medicoId) {
    return { ok: false, error: 'Salve o perfil médico antes de conectar o provedor.' };
  }

  const rawProviderId = params.providerId?.trim() || params.form.provider;
  const resolved = resolveConnectableProviderId(rawProviderId);
  if (!resolved.ok) {
    return { ok: false, error: resolved.reason };
  }
  const providerId = resolved.providerId;

  if (isPhysicalCertificateProvider(rawProviderId)) {
    return { ok: false, error: CLOUD_ONLY_SIGNATURE_ERROR };
  }

  const adapter = getAdapter(providerId);

  const pscProviderKey = normalizeSignatureProviderId(rawProviderId);
  const authResult = await adapter.startAuthorization({
    doctorId: medicoId,
    returnUrl: params.returnUrl,
    authToken: params.authToken,
    pscProvider: isBryCompatiblePscProvider(pscProviderKey) ? pscProviderKey! : undefined,
  });

  if (!authResult.ok) {
    return { ok: false, error: authResult.error };
  }

  const authorizationUrl = authResult.data.authorizationUrl?.trim();
  if (authorizationUrl) {
    return { ok: true, mode: 'redirect', authorizationUrl };
  }

  if (isSandboxMockProvider(providerId)) {
    const config = buildSandboxConnectedProvider(params.form, params.timestamps);
    await updateMedico(medicoId, { doctorSignatureProvider: config });
    return {
      ok: true,
      mode: 'immediate',
      config,
      successMessage: 'Sandbox de assinatura conectado com sucesso.',
    };
  }

  return {
    ok: false,
    error: 'Resposta de autorização do provedor sem URL nem conexão imediata.',
  };
}
