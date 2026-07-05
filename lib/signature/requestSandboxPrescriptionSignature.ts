import { auth } from '@/lib/firebase';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';

export type SandboxPrescriptionSignatureResponse = {
  ok: true;
  requestId: string;
  status: 'signed';
  signedPdfUrl: string;
  originalHash: string;
  signedHash: string;
};

export async function requestSandboxPrescriptionSignature(params: {
  patientId: string;
  originalPdfBase64: string;
  prescriptionPrintType?: PrescriptionPrintType;
}): Promise<SandboxPrescriptionSignatureResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para assinar o documento.');
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/signature/sandbox/prescription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: params.patientId,
      originalPdfBase64: params.originalPdfBase64,
      prescriptionPrintType: params.prescriptionPrintType ?? 'simple',
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    requestId?: string;
    signedPdfUrl?: string;
    originalHash?: string;
    signedHash?: string;
  };

  if (!res.ok || !data.ok || !data.signedPdfUrl) {
    throw new Error(data.error || 'Não foi possível gerar o PDF com assinatura simulada.');
  }

  return {
    ok: true,
    requestId: data.requestId!,
    status: 'signed',
    signedPdfUrl: data.signedPdfUrl,
    originalHash: data.originalHash!,
    signedHash: data.signedHash!,
  };
}

export function arrayBufferToBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
