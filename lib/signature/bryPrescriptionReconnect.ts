import { resolveBrySignatureSessionDisplay } from '@/lib/metaadmin/brySignatureSessionDisplay';
import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import {
  BRY_SIGNATURE_MISSING_TOKEN_ERROR,
  BRY_SIGNATURE_NOT_CONNECTED_ERROR,
  BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
  isBrySignatureSessionExpiredError,
} from '@/lib/signature/brySignatureConstants';
import { usesBryCloudSigning } from '@/lib/signature/providers/bryPscNameMap';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

/** Mensagens que devem abrir o painel de reconexão PSC, não erro vermelho genérico. */
export function isBryPrescriptionReconnectNeeded(args: {
  providerConfig?: DoctorSignatureProvider | null;
  message?: string;
  error?: unknown;
}): boolean {
  const msg =
    args.message?.trim() ||
    (args.error instanceof Error ? args.error.message : typeof args.error === 'string' ? args.error : '');

  if (isBrySignatureSessionExpiredError(args.error ?? msg)) return true;

  if (
    msg === BRY_SIGNATURE_MISSING_TOKEN_ERROR ||
    msg === BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE
  ) {
    return true;
  }

  if (/credenciais bry cloud ausentes/i.test(msg)) return true;
  if (/reconecte o provedor em meu perfil/i.test(msg)) return true;

  const cfg = args.providerConfig;
  if (cfg && usesBryCloudSigning(cfg) && isSignatureProviderConnected(cfg)) {
    const session = resolveBrySignatureSessionDisplay(cfg.connection);
    if (session?.expired) return true;
  }

  return false;
}

/** Sessão PSC expirada/esgotada (metadados visíveis no cliente, sem tokens). */
export function isBrySignatureSessionExpiredOnClient(
  providerConfig: DoctorSignatureProvider | null | undefined
): boolean {
  if (!providerConfig || !usesBryCloudSigning(providerConfig)) return false;
  if (!isSignatureProviderConnected(providerConfig)) return false;
  const session = resolveBrySignatureSessionDisplay(providerConfig.connection);
  return session?.expired === true;
}

export function isBryPrescriptionMissingConnection(
  providerConfig: DoctorSignatureProvider | null | undefined
): boolean {
  if (!providerConfig || !usesBryCloudSigning(providerConfig)) return false;
  return (
    !isSignatureProviderConnected(providerConfig) ||
    providerConfig.connection?.status === 'disconnected'
  );
}

export { BRY_SIGNATURE_NOT_CONNECTED_ERROR };
