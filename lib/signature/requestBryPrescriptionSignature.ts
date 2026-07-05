import { auth } from '@/lib/firebase';

export type BryPrescriptionSignatureResponse =
  | {
      ok: true;
      outcome: 'signed';
      requestId: string;
      status: 'signed';
      signedPdfUrl: string;
      originalHash: string;
      signedHash: string;
    }
  | {
      ok: true;
      outcome: 'pending';
      requestId: string;
      status: 'sent_to_provider';
      message: string;
      providerOperationId?: string;
    };

import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';

export async function requestBryPrescriptionSignature(params: {
  patientId: string;
  originalPdfBase64: string;
  prescriptionPrintType?: PrescriptionPrintType;
}): Promise<BryPrescriptionSignatureResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para assinar o documento.');
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/signature/bry/prescription', {
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
    outcome?: 'signed' | 'pending';
    requestId?: string;
    status?: string;
    signedPdfUrl?: string;
    originalHash?: string;
    signedHash?: string;
    message?: string;
    providerOperationId?: string;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Não foi possível enviar a prescrição para assinatura digital.');
  }

  if (data.outcome === 'signed' && data.signedPdfUrl) {
    return {
      ok: true,
      outcome: 'signed',
      requestId: data.requestId!,
      status: 'signed',
      signedPdfUrl: data.signedPdfUrl,
      originalHash: data.originalHash!,
      signedHash: data.signedHash!,
    };
  }

  if (data.outcome === 'pending') {
    return {
      ok: true,
      outcome: 'pending',
      requestId: data.requestId!,
      status: 'sent_to_provider',
      message: data.message || 'Assinatura enviada para autorização. Aguarde a finalização pelo provedor.',
      providerOperationId: data.providerOperationId,
    };
  }

  throw new Error('Resposta inesperada do servidor de assinatura.');
}
