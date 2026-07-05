import {
  isCloudSignatureProviderCategory,
  isPhysicalCertificateProvider,
} from '@/lib/metaadmin/doctorSignatureProviders';
import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { isBrySignatureSessionExpiredOnClient } from '@/lib/signature/bryPrescriptionReconnect';
import { usesBryCloudSigning } from '@/lib/signature/providers/bryPscNameMap';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';

export const PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE =
  'Configure e conecte um provedor de assinatura digital em Meu Perfil para usar esta opção.';

export const PRESCRIPTION_PRINT_SIGNED_RECIBO_DISABLED =
  'Assinatura digital simulada disponível apenas para prescrições médicas (não recibo).';

export type PrescriptionSignedPrintEligibility =
  | { allowed: true; mode: 'sandbox' }
  | { allowed: true; mode: 'bry_cloud'; sessionReconnectRecommended?: boolean }
  | { allowed: false; message: string };

/** Habilita o botão “Gerar PDF com assinatura digital” no modal de prescrição. */
export function isPrescriptionSignedPrintButtonEnabled(
  providerConfig: DoctorSignatureProvider | null | undefined,
  options?: { isRecibo?: boolean }
): boolean {
  if (options?.isRecibo) return false;
  if (!providerConfig || providerConfig.provider === 'none') return false;
  if (
    isPhysicalCertificateProvider(providerConfig.provider) ||
    providerConfig.providerCategory === 'physical_certificate'
  ) {
    return false;
  }
  return isSignatureProviderConnected(providerConfig);
}

export function getPrescriptionSignedPrintEligibility(
  providerConfig: DoctorSignatureProvider | null | undefined,
  options?: { isRecibo?: boolean }
): PrescriptionSignedPrintEligibility {
  if (options?.isRecibo) {
    return { allowed: false, message: PRESCRIPTION_PRINT_SIGNED_RECIBO_DISABLED };
  }

  if (!providerConfig || providerConfig.provider === 'none') {
    return { allowed: false, message: PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE };
  }

  if (
    isPhysicalCertificateProvider(providerConfig.provider) ||
    providerConfig.providerCategory === 'physical_certificate'
  ) {
    return { allowed: false, message: CLOUD_ONLY_SIGNATURE_ERROR };
  }

  if (!isSignatureProviderConnected(providerConfig)) {
    return { allowed: false, message: PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE };
  }

  if (providerConfig.provider === SANDBOX_MOCK_PROVIDER_ID) {
    return { allowed: true, mode: 'sandbox' };
  }

  if (usesBryCloudSigning(providerConfig)) {
    // Tokens ficam só no servidor (sanitização no cliente). Validar sessão pelos metadados.
    const sessionExpired = isBrySignatureSessionExpiredOnClient(providerConfig);
    return {
      allowed: true,
      mode: 'bry_cloud',
      ...(sessionExpired ? { sessionReconnectRecommended: true } : {}),
    };
  }

  if (!isCloudSignatureProviderCategory(providerConfig.providerCategory)) {
    return { allowed: false, message: CLOUD_ONLY_SIGNATURE_ERROR };
  }

  return { allowed: false, message: NON_SANDBOX_PROVIDER_SIGNATURE_ERROR };
}
