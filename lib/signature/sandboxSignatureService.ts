/**
 * Sandbox de assinatura de PDF — fluxo completo simulado, sem API externa.
 * Somente servidor (Firebase Admin).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { DigitalSignatureService } from '@/lib/signature/digitalSignatureService';
import { DIGITAL_SIGNATURE_REQUESTS_COLLECTION } from '@/lib/signature/digitalSignatureMessages';
import {
  publicStorageUrl,
  SANDBOX_MOCK_PROVIDER_ID,
  sandboxSignedPdfStoragePath,
} from '@/lib/signature/sandboxSignatureConstants';
import {
  appendSandboxSimulationPage,
  sha256Hex,
} from '@/lib/signature/sandboxSignaturePdf';
import { validateSandboxDoctorForSigning } from '@/lib/signature/sandboxSignatureValidation';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { SIGNATURE_DOCUMENT_TYPES } from '@/types/digitalSignature';
import type { SignatureDocumentType } from '@/types/digitalSignature';

export interface SimulateSandboxPdfSignatureParams {
  doctorId: string;
  patientId?: string;
  documentType: SignatureDocumentType;
  originalPdfUrl: string;
  originalPdfBuffer?: Buffer;
}

export interface SimulateSandboxPdfSignatureResult {
  requestId: string;
  status: 'signed';
  signedPdfUrl: string;
  originalHash: string;
  signedHash: string;
}

export type SandboxSignatureDeps = {
  getDoctorSignatureProvider: typeof DigitalSignatureService.getDoctorSignatureProvider;
  fetchOriginalPdf: (url: string) => Promise<Buffer>;
  createPendingRequest: (args: {
    doctorId: string;
    patientId?: string;
    documentType: SignatureDocumentType;
    originalPdfUrl: string;
    originalHash: string;
  }) => Promise<string>;
  uploadSignedPdf: (args: {
    doctorId: string;
    requestId: string;
    pdfBuffer: Buffer;
  }) => Promise<string>;
  finalizeSignedRequest: (args: {
    requestId: string;
    signedPdfUrl: string;
    originalHash: string;
    signedHash: string;
  }) => Promise<void>;
  now: () => Date;
};

async function defaultFetchOriginalPdf(url: string): Promise<Buffer> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('originalPdfUrl é obrigatório.');
  const res = await fetch(trimmed);
  if (!res.ok) {
    throw new Error(`Não foi possível baixar o PDF original (${res.status}).`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function defaultCreatePendingRequest(args: {
  doctorId: string;
  patientId?: string;
  documentType: SignatureDocumentType;
  originalPdfUrl: string;
  originalHash: string;
}): Promise<string> {
  const ref = await getFirestoreAdmin()
    .collection(DIGITAL_SIGNATURE_REQUESTS_COLLECTION)
    .add({
      doctorId: args.doctorId,
      ...(args.patientId ? { patientId: args.patientId } : {}),
      documentType: args.documentType,
      provider: SANDBOX_MOCK_PROVIDER_ID,
      providerCategory: 'sandbox',
      status: 'pending_provider_authorization',
      originalPdfUrl: args.originalPdfUrl,
      originalHash: args.originalHash,
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
  const storagePath = sandboxSignedPdfStoragePath(args.doctorId, args.requestId);
  const bucket = getAdminStorageBucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(args.pdfBuffer, {
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=3600',
    },
  });

  await fileRef.makePublic();
  return publicStorageUrl(bucket.name, storagePath);
}

async function defaultFinalizeSignedRequest(args: {
  requestId: string;
  signedPdfUrl: string;
  originalHash: string;
  signedHash: string;
}): Promise<void> {
  await DigitalSignatureService.updateSignatureRequestStatus(args.requestId, 'signed', {
    signedPdfUrl: args.signedPdfUrl,
    originalHash: args.originalHash,
    signedHash: args.signedHash,
  });
}

function defaultDeps(): SandboxSignatureDeps {
  return {
    getDoctorSignatureProvider: DigitalSignatureService.getDoctorSignatureProvider.bind(DigitalSignatureService),
    fetchOriginalPdf: defaultFetchOriginalPdf,
    createPendingRequest: defaultCreatePendingRequest,
    uploadSignedPdf: defaultUploadSignedPdf,
    finalizeSignedRequest: defaultFinalizeSignedRequest,
    now: () => new Date(),
  };
}

export async function simulateSandboxPdfSignature(
  params: SimulateSandboxPdfSignatureParams,
  deps: Partial<SandboxSignatureDeps> = {}
): Promise<SimulateSandboxPdfSignatureResult> {
  const d: SandboxSignatureDeps = { ...defaultDeps(), ...deps };

  const doctorId = params.doctorId?.trim();
  if (!doctorId) throw new Error('doctorId é obrigatório.');

  const originalPdfUrl = params.originalPdfUrl?.trim();
  if (!originalPdfUrl) throw new Error('originalPdfUrl é obrigatório.');

  if (!SIGNATURE_DOCUMENT_TYPES.includes(params.documentType)) {
    throw new Error(`documentType inválido: ${params.documentType}`);
  }

  const providerConfig = await d.getDoctorSignatureProvider(doctorId);
  const sandboxCheck = validateSandboxDoctorForSigning(providerConfig);
  if (!sandboxCheck.ok) {
    throw new Error(sandboxCheck.message);
  }

  const originalBuffer =
    params.originalPdfBuffer ?? (await d.fetchOriginalPdf(originalPdfUrl));
  const originalHash = sha256Hex(originalBuffer);

  const patientId = params.patientId?.trim() || undefined;

  const requestId = await d.createPendingRequest({
    doctorId,
    patientId,
    documentType: params.documentType,
    originalPdfUrl,
    originalHash,
  });

  const simulatedAt = d.now();
  const signedPdfBytes = await appendSandboxSimulationPage(originalBuffer, {
    simulatedAt,
    originalHash,
    providerId: SANDBOX_MOCK_PROVIDER_ID,
  });
  const signedBuffer = Buffer.from(signedPdfBytes);
  const signedHash = sha256Hex(signedBuffer);

  const signedPdfUrl = await d.uploadSignedPdf({
    doctorId,
    requestId,
    pdfBuffer: signedBuffer,
  });

  await d.finalizeSignedRequest({
    requestId,
    signedPdfUrl,
    originalHash,
    signedHash,
  });

  return {
    requestId,
    status: 'signed',
    signedPdfUrl,
    originalHash,
    signedHash,
  };
}
