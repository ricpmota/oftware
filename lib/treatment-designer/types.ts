/**
 * Tipos centrais do Treatment Designer — preparação para motor multi-fase.
 * Ver docs/oi/12_FASES_DO_TRATAMENTO.md e docs/oi/13_TREATMENT_ENGINE_PREPARATION.md
 */
import type {
  ComposicaoPlanoComercial,
  PontoCurvaPeso,
} from '@/types/planoTerapeuticoInterativo';

/** Fases do ciclo terapêutico completo (futuro motor v2). */
export type FaseTratamentoId =
  | 'adaptacao'
  | 'perda_peso'
  | 'consolidacao'
  | 'pos_meta';

/** Identificadores estáveis dos marcos clínicos do plano. */
export type MarcoClinicoId =
  | 'inicio_tratamento'
  | 'fim_adaptacao'
  | 'perda_5_pct'
  | 'perda_10_pct'
  | 'perda_15_pct'
  | 'perda_20_pct'
  | 'meta_atingida'
  | 'inicio_consolidacao'
  | 'fim_consolidacao'
  | 'inicio_pos_meta';

export type MarcoClinicoGrafico = {
  id: MarcoClinicoId;
  rotulo: string;
  /** Rótulo curto para tooltip (ex.: "5%", "Meta"). */
  rotuloCurto: string;
  semana: number;
  semanaLabel: string;
  pesoKg: number;
  perdaPercentual?: number;
};

export type MarcoClinicoDef = {
  id: MarcoClinicoId;
  rotulo: string;
  /** Semana no eixo temporal do plano (0 = início). */
  semana: number;
  /** Percentual de perda em relação ao peso inicial, quando aplicável. */
  perdaPercentual?: number;
};

/** Segmento de fase para o gráfico (ainda não renderizado). */
export type FaseTratamentoSegmento = {
  id: FaseTratamentoId;
  rotulo: string;
  semanaInicio: number;
  semanaFim: number;
  duracaoSemanas: number;
};

/** Indicadores estatísticos da OI para sobreposição futura no gráfico. */
export type IndicadoresOiGrafico = {
  /** Percentual de pacientes semelhantes que atingiram o marco até aquela semana. */
  percentualAtingiuMarco?: number;
  /** Quantidade de pacientes na coorte semelhante. */
  pacientesSemelhantes?: number;
  /** Intervalo de confiança ou faixa percentil (ex.: P25–P75). */
  faixaPercentil?: { p25: number; p75: number };
  /** Semana de referência na coorte. */
  semanaReferencia?: number;
};

/** Extensão opcional por ponto do gráfico — consumida quando OI estiver integrada. */
export type PontoGraficoOiExtensao = {
  oi?: IndicadoresOiGrafico;
  faseId?: FaseTratamentoId;
  marcosNaSemana?: MarcoClinicoId[];
};

export type EstimativaPlanoTratamento = {
  duracaoMeses: number;
  duracaoSemanas: number;
  numeroAplicacoes: number;
  quantidadeMedicacaoMg: number;
  consultasIncluidas: number;
  bioimpedanciasIncluidas: number;
  examesIncluidos: number;
};

/**
 * Plano único do Treatment Designer — unidade de trabalho da UI.
 * Substitui conceitualmente a escolha entre progressivo / equilibrado / intensivo.
 */
export type PlanoTratamentoUnificado = {
  estimativa: EstimativaPlanoTratamento;
  perdaSemanalKg: number;
  valorTotal: number;
  composicao: ComposicaoPlanoComercial;
  curvaPeso: PontoCurvaPeso[];
  dosesSemanais: number[];
  marcadores: MarcadorTimelineTratamento[];
  guardrailAplicado: boolean;
  mensagemGuardrail?: string;
  /** Semana em que a meta de perda é atingida — marco, não fim do tratamento. */
  semanaMetaAtingida: number;
  /** Horizonte visual atual (hoje = fase de perda; futuro = ciclo completo). */
  semanaFimHorizonteVisual: number;
  /** Marcos clínicos calculados (vazio até motor v2 popular). */
  marcosClinicos: MarcoClinicoDef[];
  /** Segmentos de fase (vazio até motor v2 popular). */
  fases: FaseTratamentoSegmento[];
  /** Perda prevista no período (pacote) ou meta escolhida (personalizado). */
  perdaPrevistaKg: number;
  metaPacienteKg: number | null;
  metaSuperiorAoPrevisto: boolean;
  usaMetaPacienteNaCurva: boolean;
};

export type MarcadorTimelineTratamento = {
  semana: number;
  tipo: 'consulta' | 'bioimpedancia' | 'exame' | 'reavaliacao';
  rotulo: string;
};

export type PontoGraficoTratamento = {
  semana: number;
  semanaLabel: string;
  pesoPrevisto: number | null;
  /** Limite superior da faixa de perda (perda mínima semanal → menos perda acumulada). */
  pesoPerdaMaxKg: number | null;
  /** Limite inferior da faixa de perda (perda máxima semanal). */
  pesoPerdaMinKg: number | null;
  pesoAlvo: number | null;
  doseSemanalMg: number;
  marcadores: MarcadorTimelineTratamento[];
  /** Extensões futuras — não renderizadas na UI atual. */
  extensao?: PontoGraficoOiExtensao;
  /** Semana em que a meta é atingida (referência; não implica fim do tratamento). */
  semanaMetaAtingida?: number;
  faseId?: FaseTratamentoId;
};

export type ResumoDinamicoTratamento = {
  prazoMeses: number;
  perdaSemanalKg: number;
  perdaSemanalMinKg: number;
  perdaSemanalMaxKg: number;
  doseTotalMg: number;
  aplicacoes: number;
  consultas: number;
  bioimpedancias: number;
};
