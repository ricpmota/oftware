import { auth } from '@/lib/firebase';
import type { SolicitacaoExamesTextoTraduzivel } from '@/lib/solicitacaoExames/traduzirSolicitacaoExames';

export async function requestTraduzirSolicitacaoExames(params: {
  patientId: string;
  texto: SolicitacaoExamesTextoTraduzivel;
}): Promise<SolicitacaoExamesTextoTraduzivel> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para traduzir a requisição.');
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/solicitacao-exames/traduzir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: params.patientId,
      exames: params.texto.exames,
      hipoteseDiagnostica: params.texto.hipoteseDiagnostica,
    }),
  });

  const data = (await res.json().catch(() => null)) as
    | { ok: true; exames: string[]; hipoteseDiagnostica: string }
    | { ok: false; error?: string }
    | null;

  if (!res.ok || !data || data.ok !== true) {
    const message =
      data && data.ok === false && data.error
        ? data.error
        : 'Não foi possível traduzir a requisição de exames para inglês.';
    throw new Error(message);
  }

  return {
    exames: data.exames,
    hipoteseDiagnostica: data.hipoteseDiagnostica,
  };
}
