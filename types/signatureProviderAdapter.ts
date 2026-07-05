import type { SignatureDocumentType, SignatureRequestStatus } from '@/types/digitalSignature';

/** Status da conexão OAuth/conta no provedor externo (Firestore: `doctorSignatureProvider.connection`). */
export type DoctorSignatureProviderConnectionStatus = 'connected' | 'error' | 'expired';

export interface DoctorSignatureProviderConnection {
  provider: string;
  /** ID do PSC no perfil (ex.: safeid) quando a conexão OAuth é via BRy Cloud. */
  pscProvider?: string;
  /** Nome do PSC na Integra BRy (ex.: SafeID, Vidaas). */
  pscName?: string;
  status: DoctorSignatureProviderConnectionStatus;
  connectedAt?: Date | { toDate?: () => Date } | null;
  externalAccountId?: string;
  scopes?: string[];
  lastAuthorizationAt?: Date | { toDate?: () => Date } | null;
  /** AES-256-GCM (`v1:iv:authTag:ciphertext`) — não expor ao client. */
  accessTokenEncrypted?: string;
  refreshTokenEncrypted?: string;
  expiresAt?: string | Date | { toDate?: () => Date } | null;
  /**
   * Legado (dev) — não usar em produção.
   * @deprecated Use `accessTokenEncrypted`.
   */
  accessToken?: string;
  /**
   * Legado (dev) — não usar em produção.
   * @deprecated Use `refreshTokenEncrypted`.
   */
  refreshToken?: string;
  /** Contexto de autorização BRy Portal (poll de token). */
  authorizationContextId?: string;
  /**
   * Credencial Integra da sessão PSC (`X-API-KEY` em `/auth/info` e assinatura).
   * Em registros antigos pode estar só em `authorizationContextId`.
   */
  integraSessionApiKey?: string;
  /** CPF do titular para `kms_data.user` (persistido no connect PSC). */
  pscSigningKmsUser?: string;
  /** UUID do certificado PSC para `kms_data.uuid_cert`. */
  pscSigningKmsUuidCert?: string;
  /** Token hex PSC (`kms_data.token`) — AES-256-GCM, server-only. @deprecated use integraBrySigningTokenEncrypted */
  pscSigningKmsTokenEncrypted?: string;
  /** Token do `POST /psc/link` para HUB `kms_data.token` (INTEGABRY). */
  integraBrySigningTokenEncrypted?: string;
  /** Fim da sessão PSC (`signature_session`) — ISO ou Timestamp. */
  signatureSessionExpiresAt?: string | Date | { toDate?: () => Date } | null;
  signatureSessionMaxDocuments?: number;
  signatureSessionUsedDocuments?: number;
  signatureSessionScope?: string;
}

export const LACUNA_REST_PKI_PROVIDER_ID = 'lacuna_rest_pki' as const;
export const BRY_CLOUD_PROVIDER_ID = 'bry_cloud' as const;

export interface SignatureProviderBaseParams {
  doctorId: string;
  patientId?: string;
}

export interface StartAuthorizationParams extends SignatureProviderBaseParams {
  /** URL de retorno após OAuth (quando aplicável). */
  returnUrl?: string;
  /** State anti-CSRF para OAuth. */
  state?: string;
  /** Firebase ID token (rotas server-side). */
  authToken?: string;
  /** CPF do médico (filtra PSCs em `/psc/list`). */
  cpf?: string;
  /** ID do PSC escolhido no perfil (ex.: vidaas, safeid). */
  pscProvider?: string;
  /** @deprecated Resolvido no servidor a partir de `pscProvider`. */
  pscName?: string;
}

export interface StartAuthorizationResult {
  authorizationUrl?: string;
  connection?: DoctorSignatureProviderConnection;
}

export interface SubmitPdfForSignatureParams extends SignatureProviderBaseParams {
  documentType: SignatureDocumentType;
  originalPdfUrl: string;
  originalPdfBuffer?: Buffer;
  /** ID interno em `digitalSignatureRequests` (opcional). */
  requestId?: string;
  /** Conta OAuth do médico (server-side). */
  connection?: DoctorSignatureProviderConnection;
  /** CRM/UF/especialidade para metadados OID (prescrição). */
  prescriptionMetadata?: BryPrescriptionPhysicianMetadata;
}

export interface SubmitPdfForSignatureResult {
  requestId: string;
  status: SignatureRequestStatus;
  signedPdfUrl?: string;
  /** PDF assinado (BASE64) — processar server-side, não expor ao client. */
  signedPdfBase64?: string;
  originalHash?: string;
  signedHash?: string;
  externalSignatureId?: string;
  /** ID da operação no HUB BRy (quando assíncrono). */
  operationId?: string;
}

/** Metadados ICP-Brasil para prescrição (HUB Signer / ADRT). */
export type BryPrescriptionPhysicianMetadata = {
  crm: string;
  crmUf: string;
  specialty?: string;
};

export interface GetSignatureStatusParams {
  doctorId: string;
  requestId: string;
  externalSignatureId?: string;
  accessToken?: string;
  connection?: DoctorSignatureProviderConnection;
}

export interface GetSignatureStatusResult {
  requestId: string;
  status: SignatureRequestStatus;
  signedPdfUrl?: string;
  errorMessage?: string;
}

export interface DownloadSignedPdfParams {
  doctorId: string;
  requestId: string;
  signedPdfUrl?: string;
  accessToken?: string;
  connection?: DoctorSignatureProviderConnection;
}

export interface DownloadSignedPdfResult {
  signedPdfUrl: string;
}

export type SignatureAdapterErrorCode =
  | 'not_implemented'
  | 'not_configured'
  | 'stub'
  | 'provider_error';

export type SignatureProviderAdapterResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: SignatureAdapterErrorCode };
