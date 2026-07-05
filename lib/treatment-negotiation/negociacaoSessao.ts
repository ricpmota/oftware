import type {

  NegociacaoTerapeuticaState,

  ParametrosPlanoPersonalizadoEditavel,

  StatusNegociacaoTerapeutica,

  VistaPropostaNegociacao,

} from '@/lib/treatment-negotiation/types';

import { normalizarParametrosNegociacaoSalvos } from '@/lib/treatment-negotiation/normalizarParametrosNegociacao';

const PREFIXO = 'oftware-negociacao-terapeutica';



export type NegociacaoTerapeuticaPersistida = {

  orcamentoId: string;

  status: StatusNegociacaoTerapeutica;

  enviadaEm: string;

  nomePlano: string;

  descricaoCurta: string;

  parametros: ParametrosPlanoPersonalizadoEditavel;

  mensagemPaciente?: string;

  vistaProposta?: VistaPropostaNegociacao;

};



export function salvarNegociacaoSessao(

  orcamentoId: string,

  estado: NegociacaoTerapeuticaState

): void {

  if (typeof window === 'undefined' || !estado.parametros) return;

  const anterior = carregarNegociacaoSessao(orcamentoId);

  const payload: NegociacaoTerapeuticaPersistida = {

    orcamentoId,

    status: estado.status,

    enviadaEm:

      estado.status === 'PROPOSTA_MEDICO'

        ? new Date().toISOString()

        : (anterior?.enviadaEm ?? new Date().toISOString()),

    nomePlano: estado.parametros.nomePlano,

    descricaoCurta: estado.parametros.descricaoCurta,

    parametros: estado.parametros,

    mensagemPaciente: anterior?.mensagemPaciente,

    vistaProposta: anterior?.vistaProposta ?? 'medico',

  };

  try {

    sessionStorage.setItem(`${PREFIXO}-${orcamentoId}`, JSON.stringify(payload));

  } catch {

    // quota ou modo privado — ignorar

  }

}



export function atualizarNegociacaoPacienteSessao(

  orcamentoId: string,

  patch: {

    mensagemPaciente?: string;

    vistaProposta?: VistaPropostaNegociacao;

    status?: StatusNegociacaoTerapeutica;

  }

): NegociacaoTerapeuticaPersistida | null {

  if (typeof window === 'undefined') return null;

  const atual = carregarNegociacaoSessao(orcamentoId);

  if (!atual) return null;



  const merged: NegociacaoTerapeuticaPersistida = {

    ...atual,

    ...patch,

    status: patch.status ?? atual.status,

  };



  if (patch.mensagemPaciente != null && patch.mensagemPaciente.trim()) {

    merged.status = 'EM_NEGOCIACAO';

  }



  try {

    sessionStorage.setItem(`${PREFIXO}-${orcamentoId}`, JSON.stringify(merged));

  } catch {

    // ignorar

  }

  return merged;

}



export function carregarNegociacaoSessao(

  orcamentoId: string

): NegociacaoTerapeuticaPersistida | null {

  if (typeof window === 'undefined') return null;

  try {

    const raw = sessionStorage.getItem(`${PREFIXO}-${orcamentoId}`);

    if (!raw) return null;

    return JSON.parse(raw) as NegociacaoTerapeuticaPersistida;

  } catch {

    return null;

  }

}



export function propostaMedicoDisponivel(
  status: StatusNegociacaoTerapeutica | undefined
): boolean {
  return status === 'PROPOSTA_MEDICO' || status === 'EM_NEGOCIACAO';
}

export function negociacaoPersistidaFromSalva(
  orcamentoId: string,
  negociacao: import('@/types/planoTerapeuticoInterativo').NegociacaoTerapeuticaSalva,
  config?: import('@/types/orcamentoTerapeuticoConfig').OrcamentoTerapeuticoConfig | null
): NegociacaoTerapeuticaPersistida | null {
  const parametros = normalizarParametrosNegociacaoSalvos(negociacao.parametros, config);
  if (!parametros) return null;

  return {
    orcamentoId,
    status: negociacao.status,
    enviadaEm: negociacao.enviadaEm,
    nomePlano: negociacao.nomePlano,
    descricaoCurta: negociacao.descricaoCurta,
    parametros,
    mensagemPaciente: negociacao.mensagemPaciente,
    vistaProposta: negociacao.vistaProposta,
  };
}
