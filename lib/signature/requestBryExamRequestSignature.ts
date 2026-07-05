import { auth } from '@/lib/firebase';

export type BryExamRequestSignatureResponse =
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

export async function requestBryExamRequestSignature(params: {
  patientId: string;
  originalPdfBase64: string;
}): Promise<BryExamRequestSignatureResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para assinar o documento.');
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/signature/bry/exam-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: params.patientId,
      originalPdfBase64: params.originalPdfBase64,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    outcome?: 'signed' | 'pending';
    requestId?: string;
    signedPdfUrl?: string;
    originalHash?: string;
    signedHash?: string;
    message?: string;
    providerOperationId?: string;
  };

  if (!res.ok || !data.ok) {
    throw new Error(
      data.error || 'Não foi possível enviar a requisição de exames para assinatura digital.'
    );
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
      message:
        data.message || 'Assinatura enviada para autorização. Aguarde a finalização pelo provedor.',
      providerOperationId: data.providerOperationId,
    };
  }

  throw new Error('Resposta inesperada do servidor de assinatura.');
}
