/**
 * Camada interna de assinatura digital — preparação para integração futura.
 * Usa Firebase Admin (somente servidor / API routes).
 */
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';
import {
  evaluateDoctorSignatureEligibility,
  validateSignatureProviderConfig,
} from '@/lib/signature/validateSignatureProviderConfig';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';
import type {
  CanUseDigitalSignatureResult,
  CreateSignatureRequestPayload,
  DigitalSignatureRequest,
  SignatureProviderValidationResult,
  SignatureRequestStatus,
} from '@/types/digitalSignature';
import { SIGNATURE_DOCUMENT_TYPES, SIGNATURE_REQUEST_STATUSES } from '@/types/digitalSignature';

function timestampToDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date ? d : undefined;
  }
  return undefined;
}

function mapRequestDoc(id: string, data: Record<string, unknown>): DigitalSignatureRequest {
  return {
    id,
    doctorId: String(data.doctorId ?? ''),
    patientId: data.patientId != null ? String(data.patientId) : undefined,
    documentType: data.documentType as DigitalSignatureRequest['documentType'],
    provider: String(data.provider ?? ''),
    providerCategory: String(data.providerCategory ?? ''),
    status: data.status as DigitalSignatureRequest['status'],
    originalPdfUrl: String(data.originalPdfUrl ?? ''),
    signedPdfUrl: data.signedPdfUrl != null ? String(data.signedPdfUrl) : undefined,
    originalHash: data.originalHash != null ? String(data.originalHash) : undefined,
    signedHash: data.signedHash != null ? String(data.signedHash) : undefined,
    errorMessage: data.errorMessage != null ? String(data.errorMessage) : undefined,
    providerOperationId:
      data.providerOperationId != null ? String(data.providerOperationId) : undefined,
    validationCode: data.validationCode != null ? String(data.validationCode) : undefined,
    publicValidationUrl:
      data.publicValidationUrl != null ? String(data.publicValidationUrl) : undefined,
    publicPdfUrl: data.publicPdfUrl != null ? String(data.publicPdfUrl) : undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    signedAt: timestampToDate(data.signedAt),
  };
}

function assertValidRequestStatus(status: SignatureRequestStatus): void {
  if (!SIGNATURE_REQUEST_STATUSES.includes(status)) {
    throw new Error(`Status de assinatura inválido: ${status}`);
  }
}

export class DigitalSignatureService {
  /** Lê `doctorSignatureProvider` do documento `medicos/{doctorId}`. */
  static async getDoctorSignatureProvider(doctorId: string): Promise<DoctorSignatureProvider | null> {
    const trimmed = doctorId?.trim();
    if (!trimmed) return null;

    const snap = await getFirestoreAdmin().collection('medicos').doc(trimmed).get();
    if (!snap.exists) return null;

    const raw = snap.data()?.doctorSignatureProvider;
    if (!raw || typeof raw !== 'object') return null;

    return raw as DoctorSignatureProvider;
  }

  /** `true` apenas se o provedor está configurado e com status `connected`. */
  static async canDoctorUseDigitalSignature(doctorId: string): Promise<CanUseDigitalSignatureResult> {
    const provider = await this.getDoctorSignatureProvider(doctorId);
    return evaluateDoctorSignatureEligibility(provider);
  }

  /**
   * Cria registro em `digitalSignatureRequests` com status `draft`.
   * Exige provedor integrado (`connected`); não chama API externa.
   */
  static async createSignatureRequest(
    payload: CreateSignatureRequestPayload
  ): Promise<{ requestId: string; request: DigitalSignatureRequest }> {
    const doctorId = payload.doctorId?.trim();
    if (!doctorId) {
      throw new Error('doctorId é obrigatório.');
    }

    const originalPdfUrl = payload.originalPdfUrl?.trim();
    if (!originalPdfUrl) {
      throw new Error('originalPdfUrl é obrigatório.');
    }

    if (!SIGNATURE_DOCUMENT_TYPES.includes(payload.documentType)) {
      throw new Error(`documentType inválido: ${payload.documentType}`);
    }

    const eligibility = await this.canDoctorUseDigitalSignature(doctorId);
    if (!eligibility.allowed) {
      throw new Error(eligibility.message);
    }

    const providerConfig = eligibility.provider;
    const validation = validateSignatureProviderConfig(providerConfig);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const record = {
      doctorId,
      ...(payload.patientId?.trim() ? { patientId: payload.patientId.trim() } : {}),
      documentType: payload.documentType,
      provider: validation.provider,
      providerCategory: validation.providerCategory,
      status: 'draft' as const,
      originalPdfUrl,
      ...(payload.originalHash?.trim() ? { originalHash: payload.originalHash.trim() } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ref = await getFirestoreAdmin()
      .collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION)
      .add(record);

    const request: DigitalSignatureRequest = {
      id: ref.id,
      doctorId,
      patientId: payload.patientId?.trim(),
      documentType: payload.documentType,
      provider: validation.provider,
      providerCategory: String(validation.providerCategory),
      status: 'draft',
      originalPdfUrl,
      originalHash: payload.originalHash?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { requestId: ref.id, request };
  }

  /** Atualiza status e `updatedAt`; define `signedAt` quando status = `signed`. */
  static async updateSignatureRequestStatus(
    requestId: string,
    status: SignatureRequestStatus,
    options?: {
      errorMessage?: string;
      signedPdfUrl?: string;
      signedHash?: string;
      originalHash?: string;
      providerOperationId?: string;
      validationCode?: string;
      publicValidationUrl?: string;
      publicPdfUrl?: string;
    }
  ): Promise<DigitalSignatureRequest> {
    const id = requestId?.trim();
    if (!id) throw new Error('requestId é obrigatório.');

    assertValidRequestStatus(status);

    const ref = getFirestoreAdmin().collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Solicitação de assinatura não encontrada: ${id}`);
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (options?.errorMessage !== undefined) {
      updates.errorMessage = options.errorMessage.trim() || null;
    }
    if (options?.signedPdfUrl !== undefined) {
      updates.signedPdfUrl = options.signedPdfUrl.trim() || null;
    }
    if (options?.signedHash !== undefined) {
      updates.signedHash = options.signedHash.trim() || null;
    }
    if (options?.originalHash !== undefined) {
      updates.originalHash = options.originalHash.trim() || null;
    }
    if (options?.providerOperationId !== undefined) {
      updates.providerOperationId = options.providerOperationId.trim() || null;
    }
    if (options?.validationCode !== undefined) {
      updates.validationCode = options.validationCode.trim() || null;
    }
    if (options?.publicValidationUrl !== undefined) {
      updates.publicValidationUrl = options.publicValidationUrl.trim() || null;
    }
    if (options?.publicPdfUrl !== undefined) {
      updates.publicPdfUrl = options.publicPdfUrl.trim() || null;
    }

    if (status === 'signed') {
      updates.signedAt = FieldValue.serverTimestamp();
    }

    await ref.update(updates);

    const after = await ref.get();
    return mapRequestDoc(id, (after.data() ?? {}) as Record<string, unknown>);
  }

  /** Validação de provedor (reexporta helper puro). */
  static validateSignatureProviderConfig(
    input: string | DoctorSignatureProvider | null | undefined
  ): SignatureProviderValidationResult {
    return validateSignatureProviderConfig(input);
  }
}
