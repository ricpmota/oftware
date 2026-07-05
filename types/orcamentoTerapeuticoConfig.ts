export type TipoDescontoMaximoOrcamento = 'percentual' | 'valor';

/** Faixa de desconto percentual sobre medicação conforme volume estimado de mg. */
export type DescontoVolumeMg = {
  minMg: number;
  descontoPercentual: number;
};

/** Doses semanais (mg) disponíveis no plano mensal para escolha do paciente. */
export const DOSES_MENSAIS_PADRAO_MG = [2.5, 5, 7.5, 10, 12.5, 15] as const;

/** Configuração comercial padrão do médico para orçamentos terapêuticos. */
export type OrcamentoTerapeuticoConfig = {
  medicoId: string;
  valorPorMg: number;
  valorPorKitAplicacao: number;
  valorPorConsulta: number;
  valorPorBioimpedancia: number;
  valorPorExame: number;
  outrosCustosPadrao: number;
  margemPadraoPercentual: number;
  descontoMaximo: number;
  tipoDescontoMaximo: TipoDescontoMaximoOrcamento;
  consultasPorMesPadrao: number;
  bioimpedanciasPorMesPadrao: number;
  examesPorPlanoPadrao: number;
  descontosPorVolumeMg: DescontoVolumeMg[];
  /** Dose inicial padrão no plano mensal (mg por aplicação). */
  doseInicialMensalMg: number;
  /** Nº de aplicações no plano mensal. */
  aplicacoesMensais: number;
  /** Doses (mg) que o paciente pode escolher no plano mensal. */
  dosesMensaisDisponiveisMg: number[];
  /** Desconto percentual sobre o total do plano trimestral. */
  descontoPlanoTrimestralPercentual: number;
  /** Desconto percentual sobre o total do plano semestral. */
  descontoPlanoSemestralPercentual: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OrcamentoTerapeuticoConfigInput = Omit<
  OrcamentoTerapeuticoConfig,
  'medicoId' | 'createdAt' | 'updatedAt'
>;
