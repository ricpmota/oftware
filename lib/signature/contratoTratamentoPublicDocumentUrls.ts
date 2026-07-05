/**
 * URLs públicas de validação / PDF do Contrato de Tratamento assinado.
 * Reutiliza a mesma base pública das prescrições (domínio oficial Oftware).
 */
import { resolvePrescriptionDocumentPublicBaseUrl } from '@/lib/signature/prescriptionPublicDocumentUrls';

export { ICP_BRASIL_VALIDATION_DISPLAY_URL } from '@/lib/signature/prescriptionPublicDocumentUrls';

export function buildContratoTratamentoPublicValidationUrl(validationCode: string): string {
  const base = resolvePrescriptionDocumentPublicBaseUrl();
  return `${base}/contratos/documento?codigo=${encodeURIComponent(validationCode.trim())}`;
}

export function buildContratoTratamentoPublicPdfUrl(validationCode: string): string {
  const base = resolvePrescriptionDocumentPublicBaseUrl();
  return `${base}/contratos/documento?_format=application/pdf&codigo=${encodeURIComponent(validationCode.trim())}`;
}

export function buildContratoTratamentoPublicUrls(validationCode: string): {
  publicValidationUrl: string;
  publicPdfUrl: string;
} {
  const code = validationCode.trim();
  return {
    publicValidationUrl: buildContratoTratamentoPublicValidationUrl(code),
    publicPdfUrl: buildContratoTratamentoPublicPdfUrl(code),
  };
}

/** URL fixa impressa no rodapé (sem query string). */
export function buildContratoTratamentoPublicDocumentPageDisplayUrl(): string {
  return `${resolvePrescriptionDocumentPublicBaseUrl()}/contratos/documento`;
}
