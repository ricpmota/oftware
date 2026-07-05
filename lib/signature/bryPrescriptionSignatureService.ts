/**
 * Assinatura de prescrição via BRy Cloud (servidor).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getSignatureProviderAdapter } from '@/lib/signature/providers/signatureProviderRegistry';
import { DigitalSignatureService } from '@/lib/signature/digitalSignatureService';
import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';
import {
  BRY_CLOUD_PROVIDER_ID,
  BRY_PRESCRIPTION_ASYNC_MESSAGE,
  brySignedPdfStoragePath,
  publicBrySignedPdfStorageUrl,
} from '@/lib/signature/brySignatureConstants';
import {
  appendPrescriptionDigitalSignatureVisualFooter,
  type PrescriptionSignedPdfFooterParams,
} from '@/lib/signature/prescriptionSignedPdfVisualFooter';
import { generatePrescriptionValidationCode } from '@/lib/signature/prescriptionValidationCode';
import { buildPrescriptionPublicUrls } from '@/lib/signature/prescriptionPublicDocumentUrls';
import {
  expireDoctorBrySignatureSession,
  incrementSignatureSessionUsedDocuments,
  isBryOperationExpiredOrCompletedError,
  BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
} from '@/lib/signature/brySignatureSession.server';
import { BryPdfSignError } from '@/lib/signature/providers/bryCloudApi';
import { validateBryDoctorForSigning } from '@/lib/signature/brySignatureValidation';
import { sha256Hex } from '@/lib/signature/sandboxSignaturePdf';
import type { BryPrescriptionPhysicianMetadata } from '@/types/signatureProviderAdapter';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { SignatureDocumentType, SignatureRequestStatus } from '@/types/digitalSignature';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';

export type BryPrescriptionSignatureParams = {
  doctorId: string;
  patientId: string;
  originalPdfBuffer: Buffer;
  /** Padrão: prescrição médica. */
  documentType?: SignatureDocumentType;
  prescriptionPrintType?: PrescriptionPrintType;
};

export type BryPrescriptionSignatureResult =
  | {
      outcome: 'signed';
      requestId: string;
      status: 'signed';
      signedPdfUrl: string;
      originalHash: string;
      signedHash: string;
    }
  | {
      outcome: 'pending';
      requestId: string;
      status: 'sent_to_provider';
      message: string;
      providerOperationId?: string;
    };

export type BryPrescriptionSignatureDeps = {
  allocateValidation: () => Promise<BryPrescriptionValidationUrls>;
  getDoctorSignatureProvider: typeof DigitalSignatureService.getDoctorSignatureProvider;
  getAdapter: typeof getSignatureProviderAdapter;
  uploadSignedPdf: (args: {
    doctorId: string;
    requestId: string;
    pdfBuffer: Buffer;
  }) => Promise<string>;
  fetchPdfFromUrl: (url: string) => Promise<Buffer>;
  updateRequest: typeof DigitalSignatureService.updateSignatureRequestStatus;
  createRequest: (args: {
    doctorId: string;
    patientId: string;
    documentType: SignatureDocumentType;
    originalPdfUrl: string;
    originalHash: string;
    initialStatus: SignatureRequestStatus;
    validation: BryPrescriptionValidationUrls;
  }) => Promise<string>;
  resolvePrescriptionMetadata: (doctorId: string) => Promise<BryPrescriptionPhysicianMetadata>;
  resolveVisualFooterParams: (args: {
    doctorId: string;
    requestId: string;
    validation: BryPrescriptionValidationUrls;
  }) => Promise<PrescriptionSignedPdfFooterParams>;
  applyVisualFooter: (
    signedPdf: Buffer,
    footer: PrescriptionSignedPdfFooterParams
  ) => Promise<Buffer>;
  incrementSessionUsedDocuments: (doctorId: string) => Promise<void>;
  expireSignatureSession: (doctorId: string) => Promise<void>;
};

async function generateUniquePrescriptionValidationCode(): Promise<string> {
  const col = getFirestoreAdmin().collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION);
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generatePrescriptionValidationCode();
    const existing = await col.where('validationCode', '==', code).limit(1).get();
    if (existing.empty) return code;
  }
  throw new Error('Não foi possível gerar código de validação único.');
}

export type BryPrescriptionValidationUrls = {
  validationCode: string;
  publicValidationUrl: string;
  publicPdfUrl: string;
};

export function buildBryPrescriptionValidationUrls(validationCode: string): BryPrescriptionValidationUrls {
  const code = validationCode.trim();
  const urls = buildPrescriptionPublicUrls(code);
  return {
    validationCode: code,
    ...urls,
  };
}

async function defaultCreateRequest(args: {
  doctorId: string;
  patientId: string;
  documentType: SignatureDocumentType;
  originalPdfUrl: string;
  originalHash: string;
  initialStatus: SignatureRequestStatus;
  validation: BryPrescriptionValidationUrls;
}): Promise<string> {
  const ref = await getFirestoreAdmin()
    .collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION)
    .add({
      doctorId: args.doctorId,
      patientId: args.patientId,
      documentType: args.documentType,
      provider: BRY_CLOUD_PROVIDER_ID,
      providerCategory: 'signature_platform',
      status: args.initialStatus,
      originalPdfUrl: args.originalPdfUrl,
      originalHash: args.originalHash,
      validationCode: args.validation.validationCode,
      publicValidationUrl: args.validation.publicValidationUrl,
      publicPdfUrl: args.validation.publicPdfUrl,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

async function defaultUploadSignedPdf(args: {
  doctorId: string;
  requestId: string;
  pdfBuffer: Buffer;
}): Promise<string> {
  const storagePath = brySignedPdfStoragePath(args.doctorId, args.requestId);
  const bucket = getAdminStorageBucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(args.pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    },
  });

  await fileRef.makePublic();
  return publicBrySignedPdfStorageUrl(bucket.name, storagePath);
}

async function defaultFetchPdfFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url.trim());
  if (!res.ok) {
    throw new Error(`Não foi possível obter o PDF assinado do provedor (${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function defaultAllocateValidation(): Promise<BryPrescriptionValidationUrls> {
  const code = await generateUniquePrescriptionValidationCode();
  return buildBryPrescriptionValidationUrls(code);
}

function defaultDeps(): BryPrescriptionSignatureDeps {
  return {
    allocateValidation: defaultAllocateValidation,
    getDoctorSignatureProvider: DigitalSignatureService.getDoctorSignatureProvider.bind(
      DigitalSignatureService
    ),
    getAdapter: getSignatureProviderAdapter,
    uploadSignedPdf: defaultUploadSignedPdf,
    fetchPdfFromUrl: defaultFetchPdfFromUrl,
    updateRequest: DigitalSignatureService.updateSignatureRequestStatus.bind(DigitalSignatureService),
    createRequest: defaultCreateRequest,
    resolvePrescriptionMetadata: defaultResolvePrescriptionMetadata,
    resolveVisualFooterParams: defaultResolveVisualFooterParams,
    applyVisualFooter: defaultApplyVisualFooter,
    incrementSessionUsedDocuments: incrementSignatureSessionUsedDocuments,
    expireSignatureSession: expireDoctorBrySignatureSession,
  };
}

function pickMedicoCrmFields(data: Record<string, unknown> | undefined): {
  crm: string;
  crmUf: string;
} {
  if (!data) return { crm: '', crmUf: '' };

  const crmRaw = data.crm;
  if (crmRaw && typeof crmRaw === 'object' && !Array.isArray(crmRaw)) {
    const c = crmRaw as Record<string, unknown>;
    return {
      crm: typeof c.numero === 'string' ? c.numero.trim() : '',
      crmUf: typeof c.estado === 'string' ? c.estado.trim() : '',
    };
  }
  if (typeof crmRaw === 'string') {
    return { crm: crmRaw.trim(), crmUf: '' };
  }
  return { crm: '', crmUf: '' };
}

function pickMedicoSpecialty(data: Record<string, unknown> | undefined): string {
  if (!data) return '';
  if (typeof data.especialidade === 'string') return data.especialidade.trim();
  if (typeof data.specialty === 'string') return data.specialty.trim();
  return '';
}

/** CRM/UF/especialidade via Firebase Admin (sem regras do client SDK). */
function pickMedicoDisplayName(data: Record<string, unknown> | undefined): string {
  if (!data) return 'Médico';
  if (typeof data.nome === 'string' && data.nome.trim()) return data.nome.trim();
  return 'Médico';
}

async function defaultResolveVisualFooterParams(args: {
  doctorId: string;
  requestId: string;
  validation: BryPrescriptionValidationUrls;
}): Promise<PrescriptionSignedPdfFooterParams> {
  const doctorId = args.doctorId.trim();
  const signedAt = new Date();

  let physicianName = 'Médico';
  let crm = '';
  let crmUf = '';

  if (doctorId) {
    const snap = await getFirestoreAdmin().collection('medicos').doc(doctorId).get();
    if (snap.exists) {
      const data = snap.data() as Record<string, unknown> | undefined;
      physicianName = pickMedicoDisplayName(data);
      const crmFields = pickMedicoCrmFields(data);
      crm = crmFields.crm;
      crmUf = crmFields.crmUf;
    }
  }

  return {
    physicianName,
    crm,
    crmUf,
    signedAt,
    validationCode: args.validation.validationCode,
    publicValidationUrl: args.validation.publicValidationUrl,
    publicPdfUrl: args.validation.publicPdfUrl,
  };
}

async function defaultApplyVisualFooter(
  signedPdf: Buffer,
  footer: PrescriptionSignedPdfFooterParams
): Promise<Buffer> {
  const withFooter = await appendPrescriptionDigitalSignatureVisualFooter(signedPdf, footer);
  return Buffer.from(withFooter);
}

async function defaultResolvePrescriptionMetadata(
  doctorId: string
): Promise<BryPrescriptionPhysicianMetadata> {
  const id = doctorId.trim();
  if (!id) {
    return { crm: '', crmUf: '', specialty: '' };
  }

  const snap = await getFirestoreAdmin().collection('medicos').doc(id).get();
  if (!snap.exists) {
    return { crm: '', crmUf: '', specialty: '' };
  }

  const data = snap.data() as Record<string, unknown> | undefined;
  const { crm, crmUf } = pickMedicoCrmFields(data);

  return {
    crm,
    crmUf,
    specialty: pickMedicoSpecialty(data),
  };
}

function isImmediateSignedStatus(
  status: string,
  signedPdfUrl?: string,
  signedPdfBase64?: string
): boolean {
  if (status !== 'signed') return false;
  return !!signedPdfBase64?.trim() || !!signedPdfUrl?.trim();
}

function friendlyBryErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const m = error.message.trim();
    if (m === BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE) return m;
    if (
      /reconecte|sessão|credencial inválida|safeid|integra bry|autorize novamente/i.test(m) &&
      m.length > 0 &&
      m.length < 280
    ) {
      return m;
    }
    if (/token|secret|credential|authorization/i.test(m)) {
      return 'Não foi possível autorizar a assinatura no BRy Cloud. Reconecte o provedor em Meu Perfil.';
    }
    if (m.length > 0 && m.length < 280) return m;
  }
  return 'Não foi possível concluir a assinatura digital no BRy Cloud. Tente novamente.';
}

export async function submitBryPrescriptionSignature(
  params: BryPrescriptionSignatureParams,
  deps: Partial<BryPrescriptionSignatureDeps> = {}
): Promise<BryPrescriptionSignatureResult> {
  const d: BryPrescriptionSignatureDeps = { ...defaultDeps(), ...deps };

  const doctorId = params.doctorId?.trim();
  const patientId = params.patientId?.trim();
  if (!doctorId) throw new Error('doctorId é obrigatório.');
  if (!patientId) throw new Error('patientId é obrigatório.');
  if (!params.originalPdfBuffer?.length) throw new Error('PDF original inválido.');

  const providerConfig = await d.getDoctorSignatureProvider(doctorId);
  const bryCheck = validateBryDoctorForSigning(providerConfig);
  if (!bryCheck.ok) {
    throw new Error(bryCheck.message);
  }

  const documentType: SignatureDocumentType = params.documentType ?? 'prescription';
  const originalHash = sha256Hex(params.originalPdfBuffer);
  const originalPdfUrl = `bry://${documentType}/${patientId}/${Date.now()}.pdf`;

  const validation = await d.allocateValidation();

  const requestId = await d.createRequest({
    doctorId,
    patientId,
    documentType,
    originalPdfUrl,
    originalHash,
    initialStatus: 'pending_provider_authorization',
    validation,
  });

  const adapter = d.getAdapter(BRY_CLOUD_PROVIDER_ID);
  const prescriptionMetadata = await d.resolvePrescriptionMetadata(doctorId);

  let pdfToSign = params.originalPdfBuffer;
  try {
    const footerParams = await d.resolveVisualFooterParams({
      doctorId,
      requestId,
      validation,
    });
    if (params.prescriptionPrintType === 'controle_especial') {
      footerParams.applyToAllPages = true;
    }
    pdfToSign = await d.applyVisualFooter(pdfToSign, footerParams);
  } catch (footerError) {
    console.warn('[bry_prescription] rodapé visual ICP-Brasil não aplicado antes da assinatura', {
      doctorId,
      requestId,
      errorName: footerError instanceof Error ? footerError.name : 'Error',
      message: footerError instanceof Error ? footerError.message : String(footerError),
    });
  }

  try {
    const submitResult = await adapter.submitPdfForSignature({
      doctorId,
      patientId,
      documentType,
      originalPdfUrl,
      originalPdfBuffer: pdfToSign,
      requestId,
      connection: bryCheck.provider.connection,
      prescriptionMetadata,
    });

    if (!submitResult.ok) {
      await d.updateRequest(requestId, 'failed', {
        errorMessage: submitResult.error,
        originalHash,
      });
      throw new Error(submitResult.error);
    }

    const { status, signedPdfUrl, signedPdfBase64, operationId, externalSignatureId } =
      submitResult.data;
    const providerOperationId = operationId || externalSignatureId;

    if (isImmediateSignedStatus(status, signedPdfUrl, signedPdfBase64)) {
      const signedBuffer = signedPdfBase64?.trim()
        ? Buffer.from(signedPdfBase64.trim(), 'base64')
        : await d.fetchPdfFromUrl(signedPdfUrl!.trim());

      const storedUrl = await d.uploadSignedPdf({
        doctorId,
        requestId,
        pdfBuffer: signedBuffer,
      });
      const signedHash = sha256Hex(signedBuffer);

      await d.updateRequest(requestId, 'signed', {
        signedPdfUrl: storedUrl,
        originalHash,
        signedHash,
        validationCode: validation.validationCode,
        publicValidationUrl: validation.publicValidationUrl,
        publicPdfUrl: validation.publicPdfUrl,
        ...(providerOperationId ? { providerOperationId } : {}),
      });

      await d.incrementSessionUsedDocuments(doctorId);

      return {
        outcome: 'signed',
        requestId,
        status: 'signed',
        signedPdfUrl: storedUrl,
        originalHash,
        signedHash,
      };
    }

    await d.updateRequest(requestId, 'sent_to_provider', {
      originalHash,
      ...(providerOperationId ? { providerOperationId } : {}),
    });

    return {
      outcome: 'pending',
      requestId,
      status: 'sent_to_provider',
      message: BRY_PRESCRIPTION_ASYNC_MESSAGE,
      providerOperationId,
    };
  } catch (e) {
    if (
      isBryOperationExpiredOrCompletedError(e) ||
      (e instanceof BryPdfSignError && isBryOperationExpiredOrCompletedError(e.message))
    ) {
      await d.expireSignatureSession(doctorId);
    }
    const errorMessage = friendlyBryErrorMessage(e);
    try {
      await d.updateRequest(requestId, 'failed', {
        errorMessage: isBryOperationExpiredOrCompletedError(e)
          ? BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE
          : errorMessage,
        originalHash,
      });
    } catch {
      /* ignore secondary failure */
    }
    throw new Error(
      isBryOperationExpiredOrCompletedError(e)
        ? BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE
        : errorMessage
    );
  }
}

/** Requisição de exames — mesmo fluxo BRy/rodapé visual das prescrições. */
export async function submitBryExamRequestSignature(
  params: Omit<BryPrescriptionSignatureParams, 'documentType'>,
  deps: Partial<BryPrescriptionSignatureDeps> = {}
): Promise<BryPrescriptionSignatureResult> {
  return submitBryPrescriptionSignature({ ...params, documentType: 'exam_request' }, deps);
}

/** @deprecated Importe de `@/lib/signature/bryContratoTratamentoSignatureService`. */
export { submitBryContratoTratamentoSignature } from '@/lib/signature/bryContratoTratamentoSignatureService';
