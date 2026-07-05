/**
 * Helpers de estado da negociação — em memória nesta etapa.
 */
import { diffParametrosNegociacao } from '@/lib/treatment-negotiation/auditoriaLocal';
import { clonarParametros } from '@/lib/treatment-negotiation/parametrosDefaults';
import type {
  ModoRecalculoNegociacao,
  NegociacaoTerapeuticaState,
  ParametrosPlanoPersonalizadoEditavel,
  VersaoPlanoPersonalizado,
} from '@/lib/treatment-negotiation/types';
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';

export function criarEstadoNegociacaoInicial(): NegociacaoTerapeuticaState {
  return {
    status: 'RASCUNHO',
    versaoAtual: 0,
    parametros: null,
    versoes: [],
  };
}

function snapshotVersao(
  versao: number,
  status: NegociacaoTerapeuticaState['status'],
  parametros: ParametrosPlanoPersonalizadoEditavel,
  planoCalculado: PlanoTratamentoUnificado,
  camposAlterados: VersaoPlanoPersonalizado['camposAlterados']
): VersaoPlanoPersonalizado {
  return {
    versao,
    criadaEm: new Date().toISOString(),
    autor: 'medico',
    status,
    parametros: clonarParametros(parametros),
    planoCalculado,
    camposAlterados,
  };
}

export function iniciarPlanoPersonalizado(
  parametros: ParametrosPlanoPersonalizadoEditavel,
  planoCalculado: PlanoTratamentoUnificado
): NegociacaoTerapeuticaState {
  const camposAlterados = diffParametrosNegociacao(null, parametros);
  const versao = snapshotVersao(1, 'RASCUNHO', parametros, planoCalculado, camposAlterados);
  return {
    status: 'RASCUNHO',
    versaoAtual: 1,
    parametros: clonarParametros(parametros),
    versoes: [versao],
  };
}

export function registrarVersaoMedico(
  estado: NegociacaoTerapeuticaState,
  parametros: ParametrosPlanoPersonalizadoEditavel,
  planoCalculado: PlanoTratamentoUnificado
): NegociacaoTerapeuticaState {
  const proximaVersao = estado.versaoAtual + 1;
  const camposAlterados = diffParametrosNegociacao(estado.parametros, parametros);
  const status =
    estado.status === 'RASCUNHO' ? 'RASCUNHO' : estado.status;
  const versao = snapshotVersao(
    proximaVersao,
    status,
    parametros,
    planoCalculado,
    camposAlterados
  );
  return {
    ...estado,
    versaoAtual: proximaVersao,
    parametros: clonarParametros(parametros),
    versoes: [...estado.versoes, versao],
  };
}

export function salvarPropostaMedico(
  estado: NegociacaoTerapeuticaState,
  planoCalculado: PlanoTratamentoUnificado
): NegociacaoTerapeuticaState {
  if (!estado.parametros) return estado;
  if (estado.status === 'PROPOSTA_MEDICO' || estado.status === 'EM_NEGOCIACAO') {
    return {
      ...registrarVersaoMedico(estado, estado.parametros, planoCalculado),
      status: 'PROPOSTA_MEDICO',
    };
  }
  return enviarPropostaMedico(estado, planoCalculado);
}

export function enviarPropostaMedico(
  estado: NegociacaoTerapeuticaState,
  planoCalculado: PlanoTratamentoUnificado
): NegociacaoTerapeuticaState {
  if (!estado.parametros) return estado;
  if (estado.status === 'PROPOSTA_MEDICO') return estado;

  const proximaVersao = estado.versaoAtual + 1;
  const camposAlterados = [
    {
      campo: 'status',
      valorAnterior: estado.status,
      valorNovo: 'PROPOSTA_MEDICO',
    },
  ];
  const versao = snapshotVersao(
    proximaVersao,
    'PROPOSTA_MEDICO',
    estado.parametros,
    planoCalculado,
    camposAlterados
  );

  return {
    ...estado,
    status: 'PROPOSTA_MEDICO',
    versaoAtual: proximaVersao,
    versoes: [...estado.versoes, versao],
  };
}

export function aplicarModoRecalculo(
  estado: NegociacaoTerapeuticaState,
  modo: ModoRecalculoNegociacao,
  parametros: ParametrosPlanoPersonalizadoEditavel,
  planoCalculado: PlanoTratamentoUnificado
): NegociacaoTerapeuticaState {
  const atualizados = { ...parametros, modoRecalculo: modo };
  return registrarVersaoMedico(estado, atualizados, planoCalculado);
}
