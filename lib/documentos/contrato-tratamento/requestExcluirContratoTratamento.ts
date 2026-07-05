import { auth } from '@/lib/firebase';

export type ExcluirContratoTratamentoResult = {
  deletedDocumentoIds: string[];
  pacienteIdsLimpos: string[];
  tinhaAssinaturaPacienteAnterior: boolean;
};

export async function requestExcluirContratoTratamento(args: {
  pacienteId: string;
  documentoId?: string;
}): Promise<ExcluirContratoTratamentoResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para continuar.');

  const token = await user.getIdToken();
  const res = await fetch('/api/metaadmin/contrato-tratamento/excluir', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(
      (typeof data.error === 'string' && data.error) || 'Não foi possível excluir o contrato.'
    );
  }

  return {
    deletedDocumentoIds: Array.isArray(data.deletedDocumentoIds)
      ? data.deletedDocumentoIds.map(String)
      : [],
    pacienteIdsLimpos: Array.isArray(data.pacienteIdsLimpos)
      ? data.pacienteIdsLimpos.map(String)
      : [args.pacienteId],
    tinhaAssinaturaPacienteAnterior: data.tinhaAssinaturaPacienteAnterior === true,
  };
}
