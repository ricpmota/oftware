import type {
  DoctorSignatureProvider,
  DoctorSignatureProviderCategory,
} from '@/types/doctorSignatureProvider';

/** Tipo de documento enviado para assinatura digital. */
export type SignatureDocumentType =
  | 'prescription'
  | 'exam_request'
  | 'lab_report'
  | 'medical_report'
  | 'contrato_tratamento'
  | 'certificate'
  | 'other';

/** Contrato de tratamento / termo de consentimento (ex.: tirzepatida). */
export const SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO = 'contrato_tratamento' as const satisfies SignatureDocumentType;

/** Ciclo de vida de uma solicitação de assinatura. */
export type SignatureRequestStatus =
  | 'draft'
  | 'pending_provider_authorization'
  | 'sent_to_provider'
  | 'signed'
  | 'failed'
  | 'canceled';

export const SIGNATURE_DOCUMENT_TYPES: readonly SignatureDocumentType[] = [
  'prescription',
  'exam_request',
  'lab_report',
  'medical_report',
  SIGNATURE_DOCUMENT_TYPE_CONTRATO_TRATAMENTO,
  'certificate',
  'other',
] as const;

export const SIGNATURE_REQUEST_STATUSES: readonly SignatureRequestStatus[] = [
  'draft',
  'pending_provider_authorization',
  'sent_to_provider',
  'signed',
  'failed',
  'canceled',
] as const;

/** Documento em `digitalSignatureRequests/{requestId}` (Firestore). */
export interface DigitalSignatureRequestRecord {
  doctorId: string;
  patientId?: string;
  documentType: SignatureDocumentType;
  provider: string;
  providerCategory: string;
  status: SignatureRequestStatus;
  originalPdfUrl: string;
  signedPdfUrl?: string;
  originalHash?: string;
  signedHash?: string;
  errorMessage?: string;
  providerOperationId?: string;
  /** Código público para farmacêutico (ex.: OFTW-RE-4HEWEVWW). */
  validationCode?: string;
  publicValidationUrl?: string;
  publicPdfUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  signedAt?: unknown;
}

/** Registro lido/normalizado no servidor. */
export interface DigitalSignatureRequest extends Omit<DigitalSignatureRequestRecord, 'createdAt' | 'updatedAt' | 'signedAt'> {
  id: string;
  providerCategory: DoctorSignatureProviderCategory | string;
  createdAt?: Date;
  updatedAt?: Date;
  signedAt?: Date;
  validationCode?: string;
  publicValidationUrl?: string;
  publicPdfUrl?: string;
}

export interface CreateSignatureRequestPayload {
  doctorId: string;
  patientId?: string;
  documentType: SignatureDocumentType;
  originalPdfUrl: string;
  originalHash?: string;
}

export type SignatureProviderValidationResult =
  | { valid: true; provider: string; providerCategory: DoctorSignatureProviderCategory | string }
  | { valid: false; reason: string };

export type CanUseDigitalSignatureResult =
  | { allowed: true; provider: DoctorSignatureProvider }
  | { allowed: false; message: string };
