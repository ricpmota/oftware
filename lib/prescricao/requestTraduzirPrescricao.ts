import { auth } from '@/lib/firebase';
import type { PrescricaoTextoTraduzivel } from '@/lib/prescricao/traduzirPrescricaoIngles';

export async function requestTraduzirPrescricao(params: {
  patientId: string;
  texto: PrescricaoTextoTraduzivel;
}): Promise<PrescricaoTextoTraduzivel> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Faça login para traduzir a receita.');
  }

  const token = await user.getIdToken();
  const res = await fetch('/api/prescricao/traduzir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: params.patientId,
      nome: params.texto.nome,
      descricao: params.texto.descricao,
      observacoes: params.texto.observacoes,
      itens: params.texto.itens,
    }),
  });

  const data = (await res.json().catch(() => null)) as
    | { ok: true; nome: string; descricao: string; observacoes: string; itens: PrescricaoTextoTraduzivel['itens'] }
    | { ok: false; error?: string }
    | null;

  if (!res.ok || !data || data.ok !== true) {
    const message = data && data.ok === false && data.error ? data.error : 'Não foi possível traduzir a receita para inglês.';
    throw new Error(message);
  }

  return {
    nome: data.nome,
    descricao: data.descricao,
    observacoes: data.observacoes,
    itens: data.itens,
  };
}
