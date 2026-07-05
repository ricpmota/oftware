import {
  DESCONTOS_VOLUME_MG_PADRAO,
} from '@/lib/metaadmin/planoTerapeuticoComercial';
import type { PacienteCompleto } from '@/types/obesidade';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import { mapOrcamentoTerapeuticoConfigFromFirestore } from '@/lib/metaadmin/orcamentoTerapeuticoConfigMap';
import { DOSES_MENSAIS_PADRAO_MG } from '@/types/orcamentoTerapeuticoConfig';
import type { OIAnalysis } from '@/types/oi';
import { OIConfiabilidade } from '@/types/oi';
import { roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';

export type OrigemEstimativaOrcamento = 'v2_deterministica' | 'oi';

export type OIAnalysisResumo = {
  pacientesSemelhantes: number;
  confiabilidade: OIConfiabilidade;
  probabilidadeAtingirMeta: number | null;
  mgMinimo: number | null;
  mgMaximo: number | null;
  semanasMinimas: number | null;
  semanasMaximas: number | null;
  versaoModelo: string;
  observacoes: string[];
};

export type ContextoOrcamentoPaciente = {
  nome: string;
  pesoInicial: number | null;
  pesoAtual: number | null;
  metaDescricao: string;
  kgDesejados: number | null;
  percentualDesejado: number | null;
  imcInicial: number | null;
  imcAtual: number | null;
  medicamento: string | null;
  statusTratamento: string | null;
  adesaoMedia: number | null;
  numeroAplicacoesHistorico: number;
};

export type RegraEstimativaPlano =
  | 'meta_ate_5'
  | 'meta_5_a_10'
  | 'meta_10_a_15'
  | 'meta_15_a_20'
  | 'meta_acima_20'
  | 'fallback_sem_percentual';

export type EstimativaPlanoInicialV1 = {
  duracaoMeses: number;
  duracaoSemanas: number;
  numeroAplicacoes: number;
  quantidadeMedicacaoMg: number;
  consultasIncluidas: number;
  bioimpedanciasIncluidas: number;
  examesIncluidos: number;
  nomePlanoSugerido: string;
  /** Presente na V2 — identifica a faixa de meta aplicada. */
  regraEstimativa?: RegraEstimativaPlano;
  /** Origem da estimativa principal (V2 fallback ou OI). */
  origemEstimativa?: OrigemEstimativaOrcamento;
  /** Resumo OI quando origemEstimativa === 'oi'. */
  oiAnalysisResumo?: OIAnalysisResumo;
};

export type ComposicaoOrcamento = {
  custoMedicacao: number;
  custoKits: number;
  consultasAcompanhamento: number;
  exames: number;
  bioimpedancia: number;
  outrosCustos: number;
  margem: number;
  desconto: number;
};

const STATUS_TRATAMENTO_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_tratamento: 'Em tratamento',
  concluido: 'Concluído',
  abandono: 'Abandono',
};

function obterPesosPaciente(paciente: PacienteCompleto): {
  pesoInicial: number | null;
  pesoAtual: number | null;
} {
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const evolucao = paciente.evolucaoSeguimento || [];
  const primeiroRegistro = evolucao.find((e) => e.weekIndex === 1);
  const pesoInicial = primeiroRegistro?.peso ?? medidasIniciais?.peso ?? null;

  let pesoAtual: number | null = null;
  if (evolucao.length > 0) {
    const evolucaoOrdenada = [...evolucao].sort((a, b) => {
      const dataA =
        a.dataRegistro instanceof Date
          ? a.dataRegistro.getTime()
          : new Date(a.dataRegistro).getTime();
      const dataB =
        b.dataRegistro instanceof Date
          ? b.dataRegistro.getTime()
          : new Date(b.dataRegistro).getTime();
      return dataB - dataA;
    });
    const ultimoRegistroComPeso = evolucaoOrdenada.find((s) => s.peso && s.peso > 0);
    pesoAtual = ultimoRegistroComPeso?.peso ?? null;
  }
  if (pesoAtual == null && medidasIniciais?.peso) {
    pesoAtual = medidasIniciais.peso;
  }

  return { pesoInicial, pesoAtual };
}

function calcularImc(pesoKg: number | null, alturaCm: number | undefined): number | null {
  if (pesoKg == null || pesoKg <= 0 || !alturaCm || alturaCm <= 0) return null;
  const alturaMetros = alturaCm / 100;
  return Math.round((pesoKg / (alturaMetros * alturaMetros)) * 10) / 10;
}

function resolverMetaPerdaPeso(
  paciente: PacienteCompleto,
  pesoInicial: number | null
): {
  metaDescricao: string;
  kgDesejados: number | null;
  percentualDesejado: number | null;
} {
  const metas = paciente.planoTerapeutico?.metas;
  const peso0 = pesoInicial;

  if (peso0 == null || peso0 <= 0) {
    return {
      metaDescricao: 'Dado não informado',
      kgDesejados: null,
      percentualDesejado: null,
    };
  }

  const pctMin = 5;
  const pctMax = 45;
  const kgMin = roundMetaHalfStep((peso0 * pctMin) / 100);
  const kgMax = roundMetaHalfStep((peso0 * pctMax) / 100);

  let kgRaw: number | null = null;
  if (
    metas?.weightLossTargetType === 'PESO_ABSOLUTO' &&
    metas.weightLossTargetValue != null &&
    metas.weightLossTargetValue > 0
  ) {
    kgRaw = metas.weightLossTargetValue;
  } else if (
    metas?.weightLossTargetType === 'PERCENTUAL' &&
    metas.weightLossTargetValue != null &&
    metas.weightLossTargetValue > 0
  ) {
    kgRaw = (peso0 * metas.weightLossTargetValue) / 100;
  } else if (metas?.weightLossTargetValue != null && metas.weightLossTargetValue > 0) {
    kgRaw = (peso0 * metas.weightLossTargetValue) / 100;
  }

  if (kgRaw == null) {
    return {
      metaDescricao: 'Dado não informado',
      kgDesejados: null,
      percentualDesejado: null,
    };
  }

  const kgDesejados = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgRaw)));
  const percentualDesejado = Math.round(((kgDesejados / peso0) * 100) * 10) / 10;

  let metaDescricao: string;
  if (metas?.weightLossTargetType === 'PERCENTUAL') {
    metaDescricao = `perder ${metas.weightLossTargetValue}% (${kgDesejados} kg)`;
  } else {
    metaDescricao = `perder ${kgDesejados} kg`;
  }

  return { metaDescricao, kgDesejados, percentualDesejado };
}

function resolverMedicamento(paciente: PacienteCompleto): string | null {
  const dose = paciente.planoTerapeutico?.currentDoseMg;
  if (dose != null && dose > 0) {
    return 'Tirzepatida';
  }
  const evolucao = paciente.evolucaoSeguimento || [];
  const comDose = evolucao.find(
    (e) => e.doseAplicada?.quantidade && e.doseAplicada.quantidade > 0
  );
  if (comDose?.doseAplicada?.quantidade) {
    return 'Tirzepatida';
  }
  return null;
}

function contarAplicacoesHistorico(paciente: PacienteCompleto): number {
  const evolucao = paciente.evolucaoSeguimento || [];
  return evolucao.filter((reg) => {
    if (reg.adherence === 'MISSED' || reg.adesao === 'esquecida') return false;
    if (reg.doseAplicada && reg.doseAplicada.quantidade > 0) return true;
    if (reg.adherence && reg.adherence !== 'MISSED') return true;
    if (reg.adesao && reg.adesao !== 'esquecida') return true;
    return false;
  }).length;
}

export function extrairContextoOrcamentoPaciente(
  paciente: PacienteCompleto
): ContextoOrcamentoPaciente {
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const { pesoInicial, pesoAtual } = obterPesosPaciente(paciente);
  const { metaDescricao, kgDesejados, percentualDesejado } = resolverMetaPerdaPeso(
    paciente,
    pesoInicial
  );
  const altura = medidasIniciais?.altura;

  return {
    nome:
      paciente.dadosIdentificacao?.nomeCompleto?.trim() ||
      paciente.nome?.trim() ||
      'Paciente',
    pesoInicial,
    pesoAtual,
    metaDescricao,
    kgDesejados,
    percentualDesejado,
    imcInicial: medidasIniciais?.imc ?? calcularImc(pesoInicial, altura),
    imcAtual: calcularImc(pesoAtual, altura),
    medicamento: resolverMedicamento(paciente),
    statusTratamento:
      STATUS_TRATAMENTO_LABEL[paciente.statusTratamento] ?? paciente.statusTratamento ?? null,
    adesaoMedia: paciente.indicadores?.adesaoMedia ?? null,
    numeroAplicacoesHistorico: contarAplicacoesHistorico(paciente),
  };
}

/**
 * Estimativa determinística v1 — sem IA e sem base estatística real.
 * Futuramente estes dados serão alimentados pela OI — Oftware Intelligence.
 */
export function calcularEstimativaPlanoInicialV1(
  contexto: ContextoOrcamentoPaciente
): EstimativaPlanoInicialV1 {
  const duracaoMeses = 6;
  const duracaoSemanas = 24;
  const numeroAplicacoes = 24;
  const quantidadeMedicacaoMg = 88;
  const consultasIncluidas = 6;
  const bioimpedanciasIncluidas = 3;
  const examesIncluidos = 2;

  return {
    duracaoMeses,
    duracaoSemanas,
    numeroAplicacoes,
    quantidadeMedicacaoMg,
    consultasIncluidas,
    bioimpedanciasIncluidas,
    examesIncluidos,
    nomePlanoSugerido: montarNomePlanoSugerido(contexto.kgDesejados, duracaoMeses),
  };
}

const FAIXA_ESTIMATIVA_10_A_15 = {
  duracaoMeses: 6,
  duracaoSemanas: 24,
  numeroAplicacoes: 24,
  quantidadeMedicacaoMg: 88,
  consultasIncluidas: 6,
  bioimpedanciasIncluidas: 3,
  examesIncluidos: 2,
} as const;

type FaixaEstimativaParams = Omit<
  EstimativaPlanoInicialV1,
  'nomePlanoSugerido' | 'regraEstimativa'
> & { regraEstimativa: RegraEstimativaPlano };

function montarNomePlanoSugerido(
  kgDesejados: number | null,
  duracaoMeses: number
): string {
  if (kgDesejados != null && kgDesejados > 0) {
    return `Plano ${kgDesejados} kg / ${duracaoMeses} meses`;
  }
  return `Plano terapêutico / ${duracaoMeses} meses`;
}

function resolverFaixaEstimativaPorPercentual(
  percentualDesejado: number | null
): FaixaEstimativaParams {
  // Fallback: percentual ausente — faixa intermediária (6 meses / 88 mg).
  if (percentualDesejado == null || Number.isNaN(percentualDesejado)) {
    return { ...FAIXA_ESTIMATIVA_10_A_15, regraEstimativa: 'fallback_sem_percentual' };
  }

  const pct = percentualDesejado;

  if (pct <= 5) {
    return {
      regraEstimativa: 'meta_ate_5',
      duracaoMeses: 3,
      duracaoSemanas: 12,
      numeroAplicacoes: 12,
      quantidadeMedicacaoMg: 36,
      consultasIncluidas: 3,
      bioimpedanciasIncluidas: 2,
      examesIncluidos: 1,
    };
  }
  if (pct <= 10) {
    return {
      regraEstimativa: 'meta_5_a_10',
      duracaoMeses: 4,
      duracaoSemanas: 16,
      numeroAplicacoes: 16,
      quantidadeMedicacaoMg: 56,
      consultasIncluidas: 4,
      bioimpedanciasIncluidas: 2,
      examesIncluidos: 1,
    };
  }
  if (pct <= 15) {
    return {
      ...FAIXA_ESTIMATIVA_10_A_15,
      regraEstimativa: 'meta_10_a_15',
    };
  }
  if (pct <= 20) {
    return {
      regraEstimativa: 'meta_15_a_20',
      duracaoMeses: 8,
      duracaoSemanas: 32,
      numeroAplicacoes: 32,
      quantidadeMedicacaoMg: 128,
      consultasIncluidas: 8,
      bioimpedanciasIncluidas: 4,
      examesIncluidos: 2,
    };
  }
  return {
    regraEstimativa: 'meta_acima_20',
    duracaoMeses: 10,
    duracaoSemanas: 40,
    numeroAplicacoes: 40,
    quantidadeMedicacaoMg: 180,
    consultasIncluidas: 10,
    bioimpedanciasIncluidas: 5,
    examesIncluidos: 3,
  };
}

/** Rótulo amigável da regra de estimativa V2 (exibição no modal). */
export function rotuloRegraEstimativaAmigavel(regra: RegraEstimativaPlano): string {
  const map: Record<RegraEstimativaPlano, string> = {
    meta_ate_5: 'meta até 5%',
    meta_5_a_10: 'meta entre 5% e 10%',
    meta_10_a_15: 'meta entre 10% e 15%',
    meta_15_a_20: 'meta entre 15% e 20%',
    meta_acima_20: 'meta acima de 20%',
    fallback_sem_percentual: 'percentual não informado (padrão 6 meses)',
  };
  return map[regra];
}

/**
 * Estimativa determinística V2 — faixas por percentual de perda desejado.
 * Sem IA e sem base estatística real. Futuramente: OI — Oftware Intelligence.
 */
export function calcularEstimativaPlanoInicialV2(
  contexto: ContextoOrcamentoPaciente
): EstimativaPlanoInicialV1 {
  const faixa = resolverFaixaEstimativaPorPercentual(contexto.percentualDesejado);
  return {
    ...faixa,
    nomePlanoSugerido: montarNomePlanoSugerido(
      contexto.kgDesejados,
      faixa.duracaoMeses
    ),
    origemEstimativa: 'v2_deterministica',
  };
}

/** Recursos auxiliares (consultas/bio/exames) derivados da duração — regra simples OI. */
export function derivarRecursosPlanoPorDuracao(duracaoMeses: number): {
  consultasIncluidas: number;
  bioimpedanciasIncluidas: number;
  examesIncluidos: number;
} {
  const meses = Math.max(1, Math.round(duracaoMeses));
  return {
    consultasIncluidas: meses,
    bioimpedanciasIncluidas: Math.max(2, Math.round(meses / 2)),
    examesIncluidos: meses <= 4 ? 1 : meses <= 8 ? 2 : 3,
  };
}

export function analiseOiUtilizavel(analysis: OIAnalysis): boolean {
  return (
    analysis.confiabilidade !== OIConfiabilidade.Baixa &&
    (analysis.mgEstimado ?? 0) > 0 &&
    (analysis.tempoEstimadoSemanas ?? 0) > 0 &&
    (analysis.aplicacoesEstimadas ?? 0) > 0
  );
}

/** Mensagem curta quando a OI respondeu, mas a estimativa V2 foi mantida. */
export function avisoOiNaoAplicada(analysis: OIAnalysis): string {
  if (analysis.benchmarkUtilizado?.includes('fallback')) {
    return 'A OI foi consultada, mas o ambiente ainda usa benchmark provisório (sem dados reais). Mantida a estimativa V2 por faixa de meta.';
  }
  const obs = analysis.observacoes?.find(
    (o) =>
      /amostra insuficiente|benchmark|meta de perda|não cadastrada|não encontrados/i.test(o)
  );
  if (obs) {
    return `A OI foi consultada, mas não há estimativa confiável (${obs}). Mantida a estimativa V2 por faixa de meta.`;
  }
  if (analysis.confiabilidade === OIConfiabilidade.Baixa) {
    return `A OI foi consultada (confiabilidade baixa, n=${analysis.pacientesSemelhantes}). Mantida a estimativa V2 por faixa de meta.`;
  }
  return 'A OI foi consultada, mas a resposta não é utilizável. Mantida a estimativa V2 por faixa de meta.';
}

export function buildOiAnalysisResumo(analysis: OIAnalysis): OIAnalysisResumo {
  return {
    pacientesSemelhantes: analysis.pacientesSemelhantes,
    confiabilidade: analysis.confiabilidade,
    probabilidadeAtingirMeta: analysis.probabilidadeAtingirMeta,
    mgMinimo: analysis.mgMinimo,
    mgMaximo: analysis.mgMaximo,
    semanasMinimas: analysis.tempoMinimoSemanas,
    semanasMaximas: analysis.tempoMaximoSemanas,
    versaoModelo: analysis.versaoModelo,
    observacoes: analysis.observacoes ?? [],
  };
}

export function rotuloConfiabilidadeOi(confiabilidade: OIConfiabilidade): string {
  const map: Record<OIConfiabilidade, string> = {
    [OIConfiabilidade.Baixa]: 'Baixa',
    [OIConfiabilidade.Media]: 'Média',
    [OIConfiabilidade.Alta]: 'Alta',
    [OIConfiabilidade.MuitoAlta]: 'Muito alta',
  };
  return map[confiabilidade] ?? confiabilidade;
}

/**
 * Aplica análise OI na estimativa V2 quando confiável e completa.
 * Caso contrário retorna estimativaAtual inalterada (fallback V2).
 */
export function aplicarAnaliseOiNaEstimativa(
  estimativaAtual: EstimativaPlanoInicialV1,
  analysis: OIAnalysis,
  contexto: ContextoOrcamentoPaciente
): EstimativaPlanoInicialV1 {
  if (!analiseOiUtilizavel(analysis)) {
    return {
      ...estimativaAtual,
      origemEstimativa: 'v2_deterministica',
      oiAnalysisResumo: undefined,
    };
  }

  const duracaoSemanas = Math.round(analysis.tempoEstimadoSemanas!);
  const duracaoMeses = Math.max(1, Math.round(duracaoSemanas / 4));
  const recursos = derivarRecursosPlanoPorDuracao(duracaoMeses);

  return {
    ...estimativaAtual,
    duracaoSemanas,
    duracaoMeses,
    numeroAplicacoes: Math.round(analysis.aplicacoesEstimadas!),
    quantidadeMedicacaoMg: Math.round(analysis.mgEstimado! * 10) / 10,
    ...recursos,
    nomePlanoSugerido: montarNomePlanoSugerido(contexto.kgDesejados, duracaoMeses),
    origemEstimativa: 'oi',
    oiAnalysisResumo: buildOiAnalysisResumo(analysis),
  };
}

/** Valores placeholder quando não há configuração do médico (fallback local). */
export function composicaoOrcamentoInicialV1(): ComposicaoOrcamento {
  return {
    custoMedicacao: 4200,
    custoKits: 480,
    consultasAcompanhamento: 1800,
    exames: 600,
    bioimpedancia: 450,
    outrosCustos: 0,
    margem: 0,
    desconto: 0,
  };
}

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularSubtotalComposicao(composicao: ComposicaoOrcamento): number {
  return arredondarMoeda(
    composicao.custoMedicacao +
      composicao.custoKits +
      composicao.consultasAcompanhamento +
      composicao.exames +
      composicao.bioimpedancia +
      composicao.outrosCustos
  );
}

/**
 * Calcula composição a partir da estimativa do plano e da configuração comercial do médico.
 * Determinístico — sem IA / sem OI.
 */
export function calcularComposicaoDesdeConfig(
  estimativa: EstimativaPlanoInicialV1,
  config: OrcamentoTerapeuticoConfig
): ComposicaoOrcamento {
  const custoMedicacao = arredondarMoeda(
    estimativa.quantidadeMedicacaoMg * config.valorPorMg
  );
  const custoKits = arredondarMoeda(
    estimativa.numeroAplicacoes * config.valorPorKitAplicacao
  );
  const consultasAcompanhamento = arredondarMoeda(
    estimativa.consultasIncluidas * config.valorPorConsulta
  );
  const bioimpedancia = arredondarMoeda(
    estimativa.bioimpedanciasIncluidas * config.valorPorBioimpedancia
  );
  const exames = arredondarMoeda(estimativa.examesIncluidos * config.valorPorExame);
  const outrosCustos = arredondarMoeda(config.outrosCustosPadrao);

  const subtotal =
    custoMedicacao +
    custoKits +
    consultasAcompanhamento +
    bioimpedancia +
    exames +
    outrosCustos;

  const margem = 0;

  return {
    custoMedicacao,
    custoKits,
    consultasAcompanhamento,
    exames,
    bioimpedancia,
    outrosCustos,
    margem,
    desconto: 0,
  };
}

export function calcularDescontoMaximoPermitido(
  composicao: ComposicaoOrcamento,
  config: OrcamentoTerapeuticoConfig
): number {
  const base = calcularSubtotalComposicao(composicao) + composicao.margem;
  if (config.tipoDescontoMaximo === 'valor') {
    return arredondarMoeda(config.descontoMaximo);
  }
  return arredondarMoeda(base * (config.descontoMaximo / 100));
}

export function descontoExcedeMaximo(
  composicao: ComposicaoOrcamento,
  config: OrcamentoTerapeuticoConfig
): boolean {
  if (composicao.desconto <= 0) return false;
  return composicao.desconto > calcularDescontoMaximoPermitido(composicao, config);
}

export function calcularValorTotalOrcamento(composicao: ComposicaoOrcamento): number {
  const subtotal = calcularSubtotalComposicao(composicao);
  return Math.max(0, arredondarMoeda(subtotal + composicao.margem - composicao.desconto));
}

/** Valores sugeridos no formulário de configuração (primeiro cadastro). */
export function criarValoresPadraoConfigOrcamento(): Omit<
  OrcamentoTerapeuticoConfig,
  'medicoId' | 'createdAt' | 'updatedAt'
> {
  return {
    valorPorMg: 48,
    valorPorKitAplicacao: 20,
    valorPorConsulta: 300,
    valorPorBioimpedancia: 150,
    valorPorExame: 300,
    outrosCustosPadrao: 0,
    margemPadraoPercentual: 0,
    descontoMaximo: 10,
    tipoDescontoMaximo: 'percentual',
    consultasPorMesPadrao: 1,
    bioimpedanciasPorMesPadrao: 0.5,
    examesPorPlanoPadrao: 2,
    descontosPorVolumeMg: DESCONTOS_VOLUME_MG_PADRAO,
    doseInicialMensalMg: 2.5,
    aplicacoesMensais: 4,
    dosesMensaisDisponiveisMg: [...DOSES_MENSAIS_PADRAO_MG],
    descontoPlanoTrimestralPercentual: 0,
    descontoPlanoSemestralPercentual: 0,
  };
}

export function configOrcamentoParaFormulario(
  config: OrcamentoTerapeuticoConfig | null
): Omit<OrcamentoTerapeuticoConfig, 'medicoId' | 'createdAt' | 'updatedAt'> {
  if (!config) return criarValoresPadraoConfigOrcamento();
  const padrao = criarValoresPadraoConfigOrcamento();
  return {
    valorPorMg: config.valorPorMg,
    valorPorKitAplicacao: config.valorPorKitAplicacao,
    valorPorConsulta: config.valorPorConsulta,
    valorPorBioimpedancia: config.valorPorBioimpedancia,
    valorPorExame: config.valorPorExame,
    outrosCustosPadrao: config.outrosCustosPadrao,
    margemPadraoPercentual: 0,
    descontoMaximo: config.descontoMaximo,
    tipoDescontoMaximo: config.tipoDescontoMaximo,
    consultasPorMesPadrao: config.consultasPorMesPadrao ?? padrao.consultasPorMesPadrao,
    bioimpedanciasPorMesPadrao:
      config.bioimpedanciasPorMesPadrao ?? padrao.bioimpedanciasPorMesPadrao,
    examesPorPlanoPadrao: config.examesPorPlanoPadrao ?? padrao.examesPorPlanoPadrao,
    descontosPorVolumeMg:
      config.descontosPorVolumeMg?.length > 0
        ? config.descontosPorVolumeMg
        : padrao.descontosPorVolumeMg,
    doseInicialMensalMg: config.doseInicialMensalMg ?? padrao.doseInicialMensalMg,
    aplicacoesMensais: config.aplicacoesMensais ?? padrao.aplicacoesMensais,
    dosesMensaisDisponiveisMg:
      config.dosesMensaisDisponiveisMg?.length > 0
        ? config.dosesMensaisDisponiveisMg
        : padrao.dosesMensaisDisponiveisMg,
    descontoPlanoTrimestralPercentual:
      config.descontoPlanoTrimestralPercentual ?? padrao.descontoPlanoTrimestralPercentual,
    descontoPlanoSemestralPercentual:
      config.descontoPlanoSemestralPercentual ?? padrao.descontoPlanoSemestralPercentual,
  };
}

/** Snapshot completo da config comercial gravado no plano público (valores exatos do médico). */
export function snapshotConfiguracaoComercialParaPlano(
  config: OrcamentoTerapeuticoConfig
): Omit<OrcamentoTerapeuticoConfig, 'medicoId' | 'createdAt' | 'updatedAt'> {
  const {
    medicoId: _medicoId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...snapshot
  } = config;
  return { ...snapshot, margemPadraoPercentual: 0 };
}

/** Reidrata a config comercial salva no documento do plano — sem defaults da plataforma. */
export function configuracaoComercialFromPlanoSalvo(
  usada: Omit<OrcamentoTerapeuticoConfig, 'medicoId' | 'createdAt' | 'updatedAt'>
): OrcamentoTerapeuticoConfig {
  return mapOrcamentoTerapeuticoConfigFromFirestore(
    '',
    usada as unknown as Record<string, unknown>
  );
}

export function formatarMoedaBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarPesoKg(valor: number | null): string {
  if (valor == null || Number.isNaN(valor)) return 'Dado não informado';
  return `${valor.toFixed(1)} kg`;
}

export function formatarDadoOpcional(
  valor: string | number | null | undefined,
  formatar?: (v: number) => string
): string {
  if (valor == null || valor === '') return 'Dado não informado';
  if (typeof valor === 'number') {
    if (Number.isNaN(valor)) return 'Dado não informado';
    return formatar ? formatar(valor) : String(valor);
  }
  const trimmed = valor.trim();
  return trimmed.length > 0 ? trimmed : 'Dado não informado';
}

export function montarTextoResumoOrcamento(
  contexto: ContextoOrcamentoPaciente,
  estimativa: EstimativaPlanoInicialV1,
  composicao: ComposicaoOrcamento,
  valorTotal: number
): string {
  const linhas = [
    'ORÇAMENTO TERAPÊUTICO — OFTWARE',
    '',
    `Paciente: ${contexto.nome}`,
    `Peso inicial: ${formatarPesoKg(contexto.pesoInicial)}`,
    `Peso atual: ${formatarPesoKg(contexto.pesoAtual)}`,
    `Meta: ${contexto.metaDescricao}`,
    contexto.percentualDesejado != null
      ? `Percentual estimado: ${contexto.percentualDesejado}%`
      : null,
    `Medicamento: ${formatarDadoOpcional(contexto.medicamento)}`,
    '',
    `Plano sugerido: ${estimativa.nomePlanoSugerido}`,
    estimativa.origemEstimativa === 'oi'
      ? 'Estimativa: OI — Oftware Intelligence'
      : 'Estimativa: provisória por faixa de meta (V2)',
    `Duração: ${estimativa.duracaoMeses} meses (${estimativa.numeroAplicacoes} aplicações)`,
    `Medicação estimada: ${estimativa.quantidadeMedicacaoMg} mg`,
    '',
    'Composição:',
    `- Medicação: ${formatarMoedaBRL(composicao.custoMedicacao)}`,
    `- Kits: ${formatarMoedaBRL(composicao.custoKits)}`,
    `- Consultas: ${formatarMoedaBRL(composicao.consultasAcompanhamento)}`,
    `- Exames: ${formatarMoedaBRL(composicao.exames)}`,
    `- Bioimpedância: ${formatarMoedaBRL(composicao.bioimpedancia)}`,
    `- Outros: ${formatarMoedaBRL(composicao.outrosCustos)}`,
    `- Margem: ${formatarMoedaBRL(composicao.margem)}`,
    composicao.desconto > 0 ? `- Desconto: ${formatarMoedaBRL(composicao.desconto)}` : null,
    '',
    `Valor total: ${formatarMoedaBRL(valorTotal)}`,
    '',
    'Este orçamento é uma estimativa terapêutica e comercial. A decisão final sobre conduta, duração, medicação e valores é do médico responsável.',
  ];
  return linhas.filter((l): l is string => l != null).join('\n');
}
