import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';

function ts(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function temPropostaPersonalizadaSalva(
  plano: PlanoTerapeuticoInterativoDocumento
): boolean {
  const status = plano.negociacaoTerapeutica?.status;
  return (
    (status === 'PROPOSTA_MEDICO' || status === 'EM_NEGOCIACAO') &&
    Boolean(plano.negociacaoTerapeutica?.parametros)
  );
}

function ordenarPorRecencia(
  planos: PlanoTerapeuticoInterativoDocumento[]
): PlanoTerapeuticoInterativoDocumento[] {
  return [...planos].sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
}

/** Plano visível ao paciente — prioriza proposta personalizada salva e updatedAt. */
export function escolherPlanoAtivoPaciente(
  planos: PlanoTerapeuticoInterativoDocumento[]
): PlanoTerapeuticoInterativoDocumento | null {
  const ativos = planos.filter((p) => p.status === 'compartilhado' || p.status === 'aceito');
  if (ativos.length === 0) return null;

  const comProposta = ativos.filter(temPropostaPersonalizadaSalva);
  const pool = comProposta.length > 0 ? comProposta : ativos.filter((p) => p.status === 'compartilhado');
  const ordenados = ordenarPorRecencia(pool.length > 0 ? pool : ativos);
  return ordenados[0] ?? null;
}

/** Plano em edição pelo médico — prioriza proposta salva e updatedAt. */
export function escolherPlanoEdicaoMedico(
  planos: PlanoTerapeuticoInterativoDocumento[]
): PlanoTerapeuticoInterativoDocumento | null {
  const editaveis = planos.filter((p) => p.status === 'rascunho' || p.status === 'compartilhado');
  if (editaveis.length === 0) return null;

  const comProposta = editaveis.filter(temPropostaPersonalizadaSalva);
  const pool = comProposta.length > 0 ? comProposta : editaveis;
  return ordenarPorRecencia(pool)[0] ?? null;
}
