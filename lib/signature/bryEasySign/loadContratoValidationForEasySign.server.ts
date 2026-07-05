import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildContratoTratamentoPublicUrls } from '@/lib/signature/contratoTratamentoPublicDocumentUrls';
import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';

export type ContratoEasySignValidationUrls = {
  validationCode: string;
  publicValidationUrl: string;
  publicPdfUrl: string;
};

export async function loadContratoValidationForEasySign(
  signatureRequestId?: string | null
): Promise<ContratoEasySignValidationUrls | null> {
  const id = signatureRequestId?.trim();
  if (!id) return null;

  const snap = await getFirestoreAdmin()
    .collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION)
    .doc(id)
    .get();
  if (!snap.exists) return null;

  const code = String(snap.data()?.validationCode || '').trim();
  if (!code) return null;

  const urls = buildContratoTratamentoPublicUrls(code);
  return {
    validationCode: code,
    ...urls,
  };
}
