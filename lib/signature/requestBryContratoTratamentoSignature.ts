import { auth } from '@/lib/firebase';

export type BryContratoTratamentoSignatureResponse =
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

export async function requestBryContratoTratamentoSignature(params: {
  patientId: string;
  originalPdfBase64?: string;
  originalPdfUrl?: string;
}): Promise<BryContratoTratamentoSignatureResponse> {
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
    res = await fetch('/api/signature/bry/contrato-tratamento', {
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
    outcome?: 'signed' | 'pending';
    requestId?: string;
    signedPdfUrl?: string;
    originalHash?: string;
    signedHash?: string;
    message?: string;
    providerOperationId?: string;
  };

  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Não foi possível enviar o contrato para assinatura digital.');
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
