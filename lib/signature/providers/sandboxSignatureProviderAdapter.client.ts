import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import { stubAdapterError } from '@/lib/signature/providers/signatureProviderErrors';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';

/**
 * Adapter sandbox para o cliente (Meu Perfil).
 * Autorização imediata sem OAuth; persistência via MedicoService no chamador.
 */
export const sandboxSignatureProviderAdapterClient: SignatureProviderAdapter = {
  providerId: SANDBOX_MOCK_PROVIDER_ID,

  async startAuthorization() {
    return {
      ok: true,
      data: {
        connection: {
          provider: SANDBOX_MOCK_PROVIDER_ID,
          status: 'connected',
        },
      },
    };
  },

  async submitPdfForSignature() {
    return stubAdapterError('Assinatura sandbox disponível apenas via API no servidor.');
  },

  async getSignatureStatus() {
    return stubAdapterError('Consulta de status sandbox disponível apenas no servidor.');
  },

  async downloadSignedPdf() {
    return stubAdapterError('Download sandbox disponível apenas no servidor.');
  },
};
