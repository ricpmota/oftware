/**
 * Tipos da Mesa de Negociação Terapêutica.
 * Toda negociação ocorre exclusivamente no Plano Personalizado.
 *
 * Ver docs/oi/16_TREATMENT_NEGOTIATION.md
 */
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';
import type {
  ModalidadePlanoId,
  RitmoEscalonamentoId,
} from '@/lib/planoTerapeutico/modalidadesPlano';

/** Planos automáticos de referência — nunca editáveis manualmente. */
export type ModalidadePlanoAutomaticoId = Exclude<ModalidadePlanoId, 'personalizado'>;

/** Ciclo de vida da negociação entre médico e paciente. */
export type StatusNegociacaoTerapeutica =
  | 'RASCUNHO'
  | 'PROPOSTA_MEDICO'
  | 'EM_NEGOCIACAO'
  | 'ACEITA_PACIENTE'
  | 'ACEITA_MEDICO'
  | 'PLANO_FECHADO'
  | 'CONTRATO_GERADO';

export const STATUS_NEGOCIACAO_LABELS: Record<StatusNegociacaoTerapeutica, string> = {
  RASCUNHO: 'Rascunho',
  PROPOSTA_MEDICO: 'Proposta salva',
  EM_NEGOCIACAO: 'Em negociação',
  ACEITA_PACIENTE: 'Aceita pelo paciente',
  ACEITA_MEDICO: 'Aceita pelo médico',
  PLANO_FECHADO: 'Plano fechado',
  CONTRATO_GERADO: 'Contrato gerado',
};

export type ModoEditorPlanoPersonalizado = 'basico' | 'editar_tudo';

export type ModoRecalculoNegociacao = 'automatico' | 'manter_manuais';

export type EstrategiaPosMetaId =
  | 'manutencao'
  | 'reducao_gradual'
  | 'continuidade'
  | 'nao_definido';

export const ESTRATEGIAS_POS_META: {
  id: EstrategiaPosMetaId;
  rotulo: string;
}[] = [
  { id: 'manutencao', rotulo: 'Manutenção' },
  { id: 'reducao_gradual', rotulo: 'Redução gradual' },
  { id: 'continuidade', rotulo: 'Continuidade' },
  { id: 'nao_definido', rotulo: 'Não definido' },
];

/** Dose editável por semana. */
export type DoseSemanalEditavel = {
  semana: number;
  doseMg: number;
  observacao?: string;
};

/** Parcelamento — preparado para etapa futura. */
export type ParcelamentoNegociado = {
  numeroParcelas: number;
  valorParcela: number;
  observacao?: string;
};

export type VistaPropostaNegociacao = 'medico' | 'paciente';

/** Valores de investimento editáveis manualmente. */
export type InvestimentoManualNegociado = {
  /** Preço por mg — multiplicado pela dose total do plano. */
  valorPorMg: number | null;
  valorMedicacao: number | null;
  valorConsultas: number | null;
  valorBioimpedancias: number | null;
  valorExames: number | null;
  outrosCustos: number | null;
  margem: number | null;
  descontoReais: number;
  descontoPercentual: number;
  /** Quando preenchido, prevalece sobre qualquer cálculo automático. */
  valorFinalManual: number | null;
};

/**
 * Parâmetros editáveis do Plano Personalizado.
 * Após duplicação de um plano automático, deixa de depender da OI.
 */
export type ParametrosPlanoPersonalizadoEditavel = {
  modalidadeBase: ModalidadePlanoAutomaticoId;
  modoEditor: ModoEditorPlanoPersonalizado;
  modoRecalculo: ModoRecalculoNegociacao;

  /** 1. Identificação */
  nomePlano: string;
  descricaoCurta: string;
  observacoesMedico: string;

  /** 2. Objetivo */
  pesoAtualKg: number | null;
  metaKg: number;
  pesoAlvoKg: number | null;
  percentualEstimado: number | null;

  /** 3. Duração */
  semanasPrazo: number;
  mesesPrazo: number;
  dataInicioEstimada: string | null;
  dataTerminoEstimada: string | null;

  /** 4. Doses — editor completo por semana */
  doseMensalMg: number;
  ritmoEscalonamento: RitmoEscalonamentoId;
  dosesSemanais: DoseSemanalEditavel[];

  /** 5. Aplicações */
  aplicacoesTotal: number;
  aplicacoesFrequencia: string;
  custoPorKit: number | null;

  /** 6. Consultas */
  consultas: number;
  consultasFrequencia: string;
  consultasValorUnitario: number | null;
  consultasValorTotalManual: number | null;

  /** 7. Bioimpedância */
  bioimpedancias: number;
  bioFrequencia: string;
  bioValorUnitario: number | null;
  bioValorTotalManual: number | null;

  /** 8. Análise de exames */
  exames: number;
  examesDescricao: string;
  examesValorUnitario: number | null;
  examesValorTotalManual: number | null;

  /** 9. Consolidação / pós-meta */
  consolidacaoHabilitada: boolean;
  consolidacaoSemanas: number;
  estrategiaPosMeta: EstrategiaPosMetaId;
  consolidacaoObservacao: string;

  /** 10. Investimento */
  investimento: InvestimentoManualNegociado;

  /** @deprecated use observacoesMedico */
  observacoes: string;
  descontoManual: number;
  parcelamento: ParcelamentoNegociado | null;
};

export type CampoAlteradoAuditoria = {
  campo: string;
  valorAnterior: string;
  valorNovo: string;
};

/** Versão do plano personalizado — histórico em memória nesta etapa. */
export type VersaoPlanoPersonalizado = {
  versao: number;
  criadaEm: string;
  autor: 'medico' | 'paciente';
  status: StatusNegociacaoTerapeutica;
  parametros: ParametrosPlanoPersonalizadoEditavel;
  planoCalculado: PlanoTratamentoUnificado;
  camposAlterados: CampoAlteradoAuditoria[];
  observacoes?: string;
};

/** Estado em memória da negociação (cliente / futura persistência). */
export type NegociacaoTerapeuticaState = {
  status: StatusNegociacaoTerapeutica;
  versaoAtual: number;
  parametros: ParametrosPlanoPersonalizadoEditavel | null;
  versoes: VersaoPlanoPersonalizado[];
};

export type AcaoPacienteNegociacao = 'aceitar_proposta' | 'solicitar_alteracoes';

export type PropostaNegociacaoPaciente = {
  tipo: AcaoPacienteNegociacao;
  mensagem?: string;
  parametrosSugeridos?: Partial<ParametrosPlanoPersonalizadoEditavel>;
  criadaEm: string;
};
