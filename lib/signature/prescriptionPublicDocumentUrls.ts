/**
 * URLs públicas de validação / PDF de prescrição assinada (domínio oficial Oftware).
 * Não usar VERCEL_URL, request.url, headers.host nem window.location.origin.
 */

export const PRESCRIPTION_PUBLIC_APP_URL_DEFAULT = 'https://www.oftware.com.br';

function normalizeOftwarePublicBase(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return PRESCRIPTION_PUBLIC_APP_URL_DEFAULT;
  if (/^https?:\/\/oftware\.com\.br$/i.test(trimmed)) {
    return PRESCRIPTION_PUBLIC_APP_URL_DEFAULT;
  }
  return trimmed;
}

function isDisallowedPublicBaseUrl(url: string): boolean {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    return host.endsWith('.vercel.app') || host === 'vercel.app';
  } catch {
    return true;
  }
}

/**
 * Base pública para QR Code, rodapé do PDF e links salvos no Firestore.
 * Ordem: PUBLIC_APP_URL → NEXT_PUBLIC_APP_URL → domínio oficial.
 */
export function resolvePrescriptionDocumentPublicBaseUrl(): string {
  const raw =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    '';

  if (raw && !isDisallowedPublicBaseUrl(raw)) {
    return normalizeOftwarePublicBase(raw);
  }

  return PRESCRIPTION_PUBLIC_APP_URL_DEFAULT;
}

export function buildPrescriptionPublicValidationUrl(validationCode: string): string {
  const base = resolvePrescriptionDocumentPublicBaseUrl();
  return `${base}/prescricao/documento?codigo=${encodeURIComponent(validationCode.trim())}`;
}

export function buildPrescriptionPublicPdfUrl(validationCode: string): string {
  const base = resolvePrescriptionDocumentPublicBaseUrl();
  return `${base}/prescricao/documento?_format=application/pdf&codigo=${encodeURIComponent(validationCode.trim())}`;
}

export function buildPrescriptionPublicUrls(validationCode: string): {
  publicValidationUrl: string;
  publicPdfUrl: string;
} {
  const code = validationCode.trim();
  return {
    publicValidationUrl: buildPrescriptionPublicValidationUrl(code),
    publicPdfUrl: buildPrescriptionPublicPdfUrl(code),
  };
}

/** URL fixa impressa no rodapé (sem ?codigo= nem parâmetros). */
export function buildPrescriptionPublicDocumentPageDisplayUrl(): string {
  return `${resolvePrescriptionDocumentPublicBaseUrl()}/prescricao/documento`;
}

export const ICP_BRASIL_VALIDATION_DISPLAY_URL = 'https://validar.iti.gov.br';
