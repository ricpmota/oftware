/**
 * Assinatura BRy do Contrato de Tratamento — validação, URLs e rodapé próprios (OFTW-CT-).
 * Reutiliza o motor de {@link submitBryPrescriptionSignature} sem alterar fluxos de prescrição.
 */
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';
import {
  submitBryPrescriptionSignature,
  type BryPrescriptionSignatureDeps,
  type BryPrescriptionSignatureParams,
  type BryPrescriptionSignatureResult,
  type BryPrescriptionValidationUrls,
} from '@/lib/signature/bryPrescriptionSignatureService';
import { appendContratoTratamentoDigitalSignatureVisualFooter } from '@/lib/signature/contratoTratamentoSignedPdfVisualFooter';
import {
  buildContratoTratamentoPublicUrls,
} from '@/lib/signature/contratoTratamentoPublicDocumentUrls';
import { generateContratoTratamentoValidationCode } from '@/lib/signature/contratoTratamentoValidationCode';
import type { PrescriptionSignedPdfFooterParams } from '@/lib/signature/prescriptionSignedPdfVisualFooter';
import { SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO } from '@/types/digitalSignature';

async function generateUniqueContratoTratamentoValidationCode(): Promise<string> {
  const col = getFirestoreAdmin().collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION);
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateContratoTratamentoValidationCode();
    const existing = await col.where('validationCode', '==', code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error('Não foi possível gerar código de validação único para o contrato.');
}

function buildContratoTratamentoValidationUrls(validationCode: string): BryPrescriptionValidationUrls {
  const code = validationCode.trim();
  const urls = buildContratoTratamentoPublicUrls(code);
  return {
    validationCode: code,
    ...urls,
  };
}

async function allocateContratoTratamentoValidation(): Promise<BryPrescriptionValidationUrls> {
  const code = await generateUniqueContratoTratamentoValidationCode();
  return buildContratoTratamentoValidationUrls(code);
}

async function applyContratoTratamentoVisualFooter(
  signedPdf: Buffer,
  footer: PrescriptionSignedPdfFooterParams
): Promise<Buffer> {
  const withFooter = await appendContratoTratamentoDigitalSignatureVisualFooter(signedPdf, footer);
  return Buffer.from(withFooter);
}

const CONTRATO_TRATAMENTO_BRY_DEPS: Partial<BryPrescriptionSignatureDeps> = {
  allocateValidation: allocateContratoTratamentoValidation,
  applyVisualFooter: applyContratoTratamentoVisualFooter,
};

export async function submitBryContratoTratamentoSignature(
  params: Omit<BryPrescriptionSignatureParams, 'documentType'>,
  deps: Partial<BryPrescriptionSignatureDeps> = {}
): Promise<BryPrescriptionSignatureResult> {
  return submitBryPrescriptionSignature(
    { ...params, documentType: SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO },
    { ...CONTRATO_TRATAMENTO_BRY_DEPS, ...deps }
  );
}
