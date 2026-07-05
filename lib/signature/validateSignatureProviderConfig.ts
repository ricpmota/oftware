import {
  findDoctorSignatureProviderOption,
  isPhysicalCertificateProvider,
} from '@/lib/metaadmin/doctorSignatureProviders';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import { DIGITAL_SIGNATURE_NOT_CONNECTED_MESSAGE } from '@/lib/signature/digitalSignatureMessages';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type {
  CanUseDigitalSignatureResult,
  SignatureProviderValidationResult,
} from '@/types/digitalSignature';

/**
 * Valida ID de provedor ou objeto salvo em `doctorSignatureProvider`.
 * Não verifica conexão OAuth — apenas configuração reconhecida e completa.
 */
export function validateSignatureProviderConfig(
  input: string | DoctorSignatureProvider | null | undefined
): SignatureProviderValidationResult {
  if (!input) {
    return { valid: false, reason: 'Provedor de assinatura não informado.' };
  }

  if (typeof input === 'string') {
    const provider = input.trim();
    if (!provider || provider === 'none') {
      return { valid: false, reason: 'Nenhum provedor de assinatura digital configurado.' };
    }
    if (provider === 'other') {
      return {
        valid: false,
        reason: 'Provedor "Outro" exige configuração completa no perfil do médico.',
      };
    }
    const known = findDoctorSignatureProviderOption(provider);
    if (!known) {
      return { valid: false, reason: `Provedor "${provider}" não é reconhecido pelo Oftware.` };
    }
    if (isPhysicalCertificateProvider(known.provider)) {
      return { valid: false, reason: CLOUD_ONLY_SIGNATURE_ERROR };
    }
    return { valid: true, provider: known.provider, providerCategory: known.providerCategory };
  }

  const config = input;
  const provider = (config.provider || '').trim();
  if (!provider || provider === 'none') {
    return { valid: false, reason: 'Nenhum provedor de assinatura digital configurado.' };
  }

  const known = findDoctorSignatureProviderOption(provider);
  if (!known && provider !== 'other') {
    return { valid: false, reason: `Provedor "${provider}" não é reconhecido pelo Oftware.` };
  }

  const providerCategory = config.providerCategory ?? known?.providerCategory ?? 'other';

  if (isPhysicalCertificateProvider(provider) || providerCategory === 'physical_certificate') {
    return { valid: false, reason: CLOUD_ONLY_SIGNATURE_ERROR };
  }

  if (provider === 'other') {
    const name = (config.customProviderName || config.providerLabel || '').trim();
    if (!name) {
      return { valid: false, reason: 'Informe o nome do provedor em "Outro".' };
    }
  }

  if (config.status === 'error') {
    return { valid: false, reason: 'O provedor de assinatura está com erro. Revise a configuração no perfil.' };
  }

  return {
    valid: true,
    provider,
    providerCategory,
  };
}

/** Regra de elegibilidade para assinatura via provedor (exige status `connected`). */
export function evaluateDoctorSignatureEligibility(
  doctorSignatureProvider: DoctorSignatureProvider | null | undefined
): CanUseDigitalSignatureResult {
  const validation = validateSignatureProviderConfig(doctorSignatureProvider ?? null);
  if (!validation.valid) {
    return { allowed: false, message: validation.reason };
  }

  const config = doctorSignatureProvider!;
  if (!isSignatureProviderConnected(config)) {
    return { allowed: false, message: DIGITAL_SIGNATURE_NOT_CONNECTED_MESSAGE };
  }

  return { allowed: true, provider: config };
}
