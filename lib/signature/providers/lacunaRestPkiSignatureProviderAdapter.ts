import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import {
  getLacunaRestPkiEnvConfig,
  isLacunaRestPkiEnvConfigured,
  lacunaRestPkiMissingEnvMessage,
} from '@/lib/signature/providers/lacunaRestPkiEnv';
import { notConfiguredAdapterError, stubAdapterError } from '@/lib/signature/providers/signatureProviderErrors';
import { LACUNA_REST_PKI_PROVIDER_ID } from '@/types/signatureProviderAdapter';

const STUB_AUTHORIZATION_MESSAGE =
  'Autorização Lacuna Rest PKI em desenvolvimento. O Oftware não armazena certificado, senha ou chave privada do médico.';

const STUB_SIGN_MESSAGE =
  'Assinatura via Lacuna Rest PKI em desenvolvimento. Use o sandbox para testes internos.';

function envGuard():
  | { ok: true }
  | ReturnType<typeof notConfiguredAdapterError> {
  if (!isLacunaRestPkiEnvConfigured()) {
    return notConfiguredAdapterError(lacunaRestPkiMissingEnvMessage());
  }
  return { ok: true };
}

/**
 * Primeiro provedor real planejado — métodos stub controlados até integração OAuth/API Lacuna.
 */
export const lacunaRestPkiSignatureProviderAdapter: SignatureProviderAdapter = {
  providerId: LACUNA_REST_PKI_PROVIDER_ID,

  async startAuthorization(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    void getLacunaRestPkiEnvConfig();
    void params;

    return stubAdapterError(STUB_AUTHORIZATION_MESSAGE);
  },

  async submitPdfForSignature(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    void params;
    return stubAdapterError(STUB_SIGN_MESSAGE);
  },

  async getSignatureStatus(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    void params;
    return stubAdapterError('Consulta de status Lacuna Rest PKI em desenvolvimento.');
  },

  async downloadSignedPdf(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    void params;
    return stubAdapterError('Download do PDF assinado Lacuna Rest PKI em desenvolvimento.');
  },
};
