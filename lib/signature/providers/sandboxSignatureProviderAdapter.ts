import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';
import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import { stubAdapterError } from '@/lib/signature/providers/signatureProviderErrors';
import { simulateSandboxPdfSignature } from '@/lib/signature/sandboxSignatureService';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';
import type { GetSignatureStatusResult } from '@/types/signatureProviderAdapter';

/**
 * Sandbox — delega assinatura simulada a {@link simulateSandboxPdfSignature}.
 * Autorização OAuth não se aplica; use Meu Perfil para conectar `sandbox_mock`.
 */
export const sandboxSignatureProviderAdapter: SignatureProviderAdapter = {
  providerId: SANDBOX_MOCK_PROVIDER_ID,

  async startAuthorization() {
    return stubAdapterError(
      'O provedor Sandbox conecta em Meu Perfil (Assinatura Digital), sem OAuth externo.'
    );
  },

  async submitPdfForSignature(params) {
    try {
      const result = await simulateSandboxPdfSignature({
        doctorId: params.doctorId,
        patientId: params.patientId,
        documentType: params.documentType,
        originalPdfUrl: params.originalPdfUrl,
        originalPdfBuffer: params.originalPdfBuffer,
      });

      return {
        ok: true,
        data: {
          requestId: result.requestId,
          status: result.status,
          signedPdfUrl: result.signedPdfUrl,
          originalHash: result.originalHash,
          signedHash: result.signedHash,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro na assinatura sandbox.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },

  async getSignatureStatus(params) {
    try {
      const snap = await getFirestoreAdmin()
        .collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION)
        .doc(params.requestId.trim())
        .get();

      if (!snap.exists) {
        return { ok: false, error: 'Solicitação de assinatura não encontrada.', code: 'provider_error' };
      }

      const data = snap.data()!;
      if (String(data.doctorId) !== params.doctorId.trim()) {
        return { ok: false, error: 'Solicitação não pertence a este médico.', code: 'provider_error' };
      }

      const result: GetSignatureStatusResult = {
        requestId: snap.id,
        status: data.status as GetSignatureStatusResult['status'],
        signedPdfUrl: data.signedPdfUrl != null ? String(data.signedPdfUrl) : undefined,
        errorMessage: data.errorMessage != null ? String(data.errorMessage) : undefined,
      };

      return { ok: true, data: result };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao consultar status.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },

  async downloadSignedPdf(params) {
    const statusResult = await sandboxSignatureProviderAdapter.getSignatureStatus({
      doctorId: params.doctorId,
      requestId: params.requestId,
    });

    if (!statusResult.ok) return statusResult;

    const url = params.signedPdfUrl?.trim() || statusResult.data.signedPdfUrl?.trim();
    if (!url) {
      return { ok: false, error: 'PDF assinado ainda não disponível.', code: 'provider_error' };
    }

    return { ok: true, data: { signedPdfUrl: url } };
  },
};
