import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

export { BRY_CLOUD_PROVIDER_ID };

export const BRY_PRESCRIPTION_ASYNC_MESSAGE =
  'Assinatura enviada para autorização. Aguarde a finalização pelo provedor.';

export const BRY_SIGNATURE_NOT_CONNECTED_ERROR =
  'Conecte o BRy Cloud em Meu Perfil antes de assinar prescrições.';

export const BRY_SIGNATURE_MISSING_TOKEN_ERROR =
  'Credenciais BRy Cloud ausentes. Reconecte o provedor em Meu Perfil.';

export const BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE =
  'Sessão de assinatura expirada. Autorize novamente para continuar assinando documentos.';

export function isBrySignatureSessionExpiredError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return (
    message === BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE ||
    message === BRY_SIGNATURE_MISSING_TOKEN_ERROR ||
    /sessão de assinatura expirada/i.test(message) ||
    /autorize novamente para continuar assinando/i.test(message) ||
    /credenciais bry cloud ausentes/i.test(message)
  );
}

export function brySignedPdfStoragePath(doctorId: string, requestId: string): string {
  return `digital-signatures/bry/${doctorId.trim()}/${requestId.trim()}/signed.pdf`;
}

export function publicBrySignedPdfStorageUrl(bucketName: string, storagePath: string): string {
  return `https://storage.googleapis.com/${bucketName}/${storagePath}`;
}

/** OID ICP-Brasil — prescrição (metadados HUB Signer / ADRT). */
export const BRY_PRESCRIPTION_METADATA_OID = '2.16.76.1.12.1.8';
export const BRY_PHYSICIAN_CRM_OID = '2.16.76.1.4.2.2.1';
export const BRY_PHYSICIAN_CRM_UF_OID = '2.16.76.1.4.2.2.2';
export const BRY_PHYSICIAN_SPECIALTY_OID = '2.16.76.1.4.2.2.3';

export const BRY_HUB_KMS_TYPE_INTEGRABRY = 'INTEGRABRY';

/** Perfil PAdES ICP-Brasil no HUB (`/fw/v1/pdf/kms/lote/assinaturas`) — carimbo do tempo (ADRT). */
export const BRY_HUB_PDF_PRESCRIPTION_PERFIL = 'ADRT';
