import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import { stubAdapterError } from '@/lib/signature/providers/signatureProviderErrors';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

const SERVER_ONLY_MESSAGE =
  'Assinatura BRy Cloud é processada no servidor. Use as APIs de assinatura do Oftware.';

/**
 * Cliente: inicia OAuth via API (client_secret permanece no servidor).
 */
export const bryCloudSignatureProviderAdapterClient: SignatureProviderAdapter = {
  providerId: BRY_CLOUD_PROVIDER_ID,

  async startAuthorization(params) {
    if (!params.authToken?.trim()) {
      return {
        ok: false,
        error: 'Faça login novamente para conectar o BRy Cloud.',
        code: 'provider_error',
      };
    }

    try {
      const res = await fetch('/api/signature/bry/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.authToken.trim()}`,
        },
        body: JSON.stringify({
          returnUrl: params.returnUrl,
          state: params.state,
          provider: params.pscProvider,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        authorizationUrl?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok || !json.ok || !json.authorizationUrl?.trim()) {
        return {
          ok: false,
          error: json.error || 'Não foi possível iniciar a conexão com o BRy Cloud.',
          code: (json.code as 'provider_error') || 'provider_error',
        };
      }

      return {
        ok: true,
        data: { authorizationUrl: json.authorizationUrl.trim() },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro de rede ao conectar BRy Cloud.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },

  async submitPdfForSignature() {
    return stubAdapterError(SERVER_ONLY_MESSAGE);
  },

  async getSignatureStatus() {
    return stubAdapterError(SERVER_ONLY_MESSAGE);
  },

  async downloadSignedPdf() {
    return stubAdapterError(SERVER_ONLY_MESSAGE);
  },
};
