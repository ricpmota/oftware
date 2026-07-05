import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';

export { SANDBOX_MOCK_PROVIDER_ID };

export const NON_SANDBOX_PROVIDER_SIGNATURE_ERROR =
  'Este provedor ainda não possui integração ativa para assinatura digital.';

export const SANDBOX_SIGNATURE_NOT_CONNECTED_ERROR =
  'Conecte o provedor Sandbox em Meu Perfil antes de testar a assinatura simulada.';

export function sandboxSignedPdfStoragePath(doctorId: string, requestId: string): string {
  return `digital-signatures/sandbox/${doctorId.trim()}/${requestId.trim()}/signed.pdf`;
}

export function publicStorageUrl(bucketName: string, storagePath: string): string {
  return `https://storage.googleapis.com/${bucketName}/${storagePath}`;
}
