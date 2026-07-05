import type {
  DownloadSignedPdfParams,
  DownloadSignedPdfResult,
  GetSignatureStatusParams,
  GetSignatureStatusResult,
  SignatureProviderAdapterResult,
  StartAuthorizationParams,
  StartAuthorizationResult,
  SubmitPdfForSignatureParams,
  SubmitPdfForSignatureResult,
} from '@/types/signatureProviderAdapter';

/**
 * Contrato para integração com provedores de assinatura digital.
 * Não armazena senha, certificado, chave privada ou token físico.
 */
export interface SignatureProviderAdapter {
  readonly providerId: string;

  startAuthorization(
    params: StartAuthorizationParams
  ): Promise<SignatureProviderAdapterResult<StartAuthorizationResult>>;

  submitPdfForSignature(
    params: SubmitPdfForSignatureParams
  ): Promise<SignatureProviderAdapterResult<SubmitPdfForSignatureResult>>;

  getSignatureStatus(
    params: GetSignatureStatusParams
  ): Promise<SignatureProviderAdapterResult<GetSignatureStatusResult>>;

  downloadSignedPdf(
    params: DownloadSignedPdfParams
  ): Promise<SignatureProviderAdapterResult<DownloadSignedPdfResult>>;
}
