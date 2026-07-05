import { auth } from '@/lib/firebase';

export type SandboxExamRequestSignatureResponse = {
  ok: true;
  requestId: string;
  status: 'signed';
  signedPdfUrl: string;
  originalHash: string;
  signedHash: string;
};

export async function requestSandboxExamRequestSignature(params: {
  patientId: string;
  originalPdfBase64: string;
}): Promise<SandboxExamRequestSignatureResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para assinar o documento.');
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/signature/sandbox/exam-request', {
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
