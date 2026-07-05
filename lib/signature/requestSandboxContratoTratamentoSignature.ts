import { auth } from '@/lib/firebase';

export type SandboxContratoTratamentoSignatureResponse = {
  ok: true;
  requestId: string;
  status: 'signed';
  signedPdfUrl: string;
  originalHash: string;
  signedHash: string;
};

export async function requestSandboxContratoTratamentoSignature(params: {
  patientId: string;
  originalPdfBase64?: string;
  originalPdfUrl?: string;
}): Promise<SandboxContratoTratamentoSignatureResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para assinar o documento.');
  }

  if (!params.originalPdfBase64?.trim() && !params.originalPdfUrl?.trim()) {
    throw new Error('PDF do contrato não informado.');
  }

  const token = await user.getIdToken();

  let res: Response;
  try {
    res = await fetch('/api/signature/sandbox/contrato-tratamento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: params.patientId,
        ...(params.originalPdfBase64?.trim()
          ? { originalPdfBase64: params.originalPdfBase64.trim() }
          : {}),
        ...(params.originalPdfUrl?.trim() ? { originalPdfUrl: params.originalPdfUrl.trim() } : {}),
      }),
    });
  } catch {
    throw new Error('Erro de conexão ao assinar o contrato. Verifique sua internet e tente novamente.');
  }

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    requestId?: string;
    signedPdfUrl?: string;
    originalHash?: string;
    signedHash?: string;
  };

  if (!res.ok || !data.ok || !data.signedPdfUrl) {
    throw new Error(data.error || 'Não foi possível gerar o contrato com assinatura simulada.');
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
