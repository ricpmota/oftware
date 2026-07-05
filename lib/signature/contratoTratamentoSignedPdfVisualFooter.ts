import {
  appendPrescriptionDigitalSignatureVisualFooter,
  formatPhysicianDisplayNameForFooter,
  type PrescriptionSignedPdfFooterParams,
} from '@/lib/signature/prescriptionSignedPdfVisualFooter';
import {
  buildContratoTratamentoPublicDocumentPageDisplayUrl,
  ICP_BRASIL_VALIDATION_DISPLAY_URL,
} from '@/lib/signature/contratoTratamentoPublicDocumentUrls';

function formatSignedDatePtBr(signedAt?: Date): string {
  const d = signedAt instanceof Date && !Number.isNaN(signedAt.getTime()) ? signedAt : new Date();
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Textos do rodapé visual — exclusivos do Contrato de Tratamento. */
export function buildContratoTratamentoSignatureFooterCenterLines(params: {
  physicianName: string;
  signedAt?: Date;
}): string[] {
  const name = formatPhysicianDisplayNameForFooter(params.physicianName);
  const date = formatSignedDatePtBr(params.signedAt);
  const documentPageUrl = buildContratoTratamentoPublicDocumentPageDisplayUrl();

  return [
    `Contrato de Tratamento assinado digitalmente por ${name} em ${date}.`,
    'Documento assinado digitalmente conforme a MP nº 2.200-2/2001.',
    `Valide a assinatura ICP-Brasil: ${ICP_BRASIL_VALIDATION_DISPLAY_URL}`,
    'Consulte este documento:',
    documentPageUrl,
  ];
}

export async function appendContratoTratamentoDigitalSignatureVisualFooter(
  signedPdfBytes: Buffer | Uint8Array,
  params: Omit<PrescriptionSignedPdfFooterParams, 'centerLines'> & {
    physicianName: string;
    signedAt?: Date;
  }
): Promise<Uint8Array> {
  const centerLines = buildContratoTratamentoSignatureFooterCenterLines({
    physicianName: params.physicianName,
    signedAt: params.signedAt,
  });

  return appendPrescriptionDigitalSignatureVisualFooter(signedPdfBytes, {
    ...params,
    centerLines,
  });
}
