/**
 * Modalidades de orçamento: Mensal, Trimestral, Semestral e Personalizado.
 */
import { calcularComposicaoPlanoInterativo, calcularValorTotalPlanoInterativo } from '@/lib/metaadmin/planoTerapeuticoComercial';
import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { resolvePlanoUnico, type ResolvePlanoUnicoInput } from '@/lib/treatment-designer/legacyCenarioAdapter';
import {
  calcularHorizonteAtualFasePerda,
} from '@/lib/treatment-designer/horizontePlano';
import {
  calcularMarcosClinicosPorRitmo,
  semanaMetaAtingidaPorRitmo,
} from '@/lib/treatment-designer/marcosClinicosEsperados';
import { resolverMetaPerdaComLimite } from '@/lib/planoTerapeutico/limitePerdaPonderal';
import {
  gerarMarcadoresTimeline,
} from '@/lib/treatment-designer/planoVisuais';
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';
import type { ComposicaoPlanoComercial } from '@/types/planoTerapeuticoInterativo';
import {
  estimarPerdaPrevistaPacote,
  SEMANAS_MENSAL,
} from '@/lib/planoTerapeutico/perdaPesoPacote';
import {
  INCREMENTO_DOSE_ESCALONAMENTO_MG,
  limitarDoseEscalonamentoMg,
  montarDosesComDesmame,
  montarEscadinhaDose,
  PERDA_SEMANAL_MEDIA_KG,
} from '@/lib/planoTerapeutico/escadinhaDose';
import {
  calcularSemanaMetaComDose,
  gerarCurvaPesoComManutencao,
  montarFasesVisuaisPlano,
} from '@/lib/planoTerapeutico/curvaPesoPlano';
import {
  DOSES_MENSAIS_PADRAO_MG,
  type OrcamentoTerapeuticoConfig,
} from '@/types/orcamentoTerapeuticoConfig';

export type ModalidadePlanoId = 'mensal' | 'trimestral' | 'semestral' | 'personalizado';

export const MODALIDADES_PLANO: {
  id: ModalidadePlanoId;
  rotulo: string;
  descricao: string;
}[] = [
  { id: 'mensal', rotulo: 'Mensal', descricao: '1 mês · 1 consulta · bio semanal · 1 exame' },
  {
    id: 'trimestral',
    rotulo: 'Trimestral',
    descricao: '3 meses · 3 consultas · bio semanal · 2 exames',
  },
  {
    id: 'semestral',
    rotulo: 'Semestral',
    descricao: '6 meses · 6 consultas · bio semanal · 3 exames',
  },
  {
    id: 'personalizado',
    rotulo: 'Personalizado',
    descricao: 'Você define prazo e meta com seu médico',
  },
];

export const PRAZO_PERSONALIZADO_MIN_MESES = 2;
export const PRAZO_PERSONALIZADO_MAX_MESES = 12;
export const META_PERSONALIZADA_MIN_KG = 0.5;
export const META_PERSONALIZADA_MAX_KG = 25;
export const META_PERSONALIZADA_STEP_KG = 0.5;

/** Incremento entre degraus de dose no escalonamento trimestral/semestral. */
export { INCREMENTO_DOSE_ESCALONAMENTO_MG };

export type RitmoEscalonamentoId = 'lento' | 'agressivo';

export const RITMOS_ESCALONAMENTO: {
  id: RitmoEscalonamentoId;
  rotulo: string;
  descricao: string;
}[] = [
  {
    id: 'lento',
    rotulo: 'Gradual',
    descricao:
      'Evolução clínica mais gradual até os marcos de perda, com progressão terapêutica em blocos de 4 semanas.',
  },
  {
    id: 'agressivo',
    rotulo: 'Acelerado',
    descricao:
      'Evolução clínica mais acelerada até os marcos de perda, com progressão terapêutica em blocos de 2 semanas.',
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function semanasPorMeses(meses: number): number {
  return Math.max(1, Math.round(meses * 4));
}

/** Prazo fixo por modalidade de pacote (nunca ultrapassa o contratado). */
export function semanasFixasPorModalidade(
  modalidade: Exclude<ModalidadePlanoId, 'personalizado'>
): number {
  if (modalidade === 'mensal') return SEMANAS_MENSAL;
  if (modalidade === 'trimestral') return 12;
  return 24;
}

function ajustarDosesAoPrazo(doses: number[], semanas: number): number[] {
  if (doses.length === semanas) return doses;
  if (doses.length > semanas) return doses.slice(0, semanas);
  const ultima = doses[doses.length - 1] ?? doses[0] ?? 0;
  return [...doses, ...Array.from({ length: semanas - doses.length }, () => ultima)];
}

export function mesesFixosModalidade(modalidade: ModalidadePlanoId): number | null {
  if (modalidade === 'mensal') return 1;
  if (modalidade === 'trimestral') return 3;
  if (modalidade === 'semestral') return 6;
  return null;
}

export function recursosPacoteModalidade(modalidade: ModalidadePlanoId): {
  consultas: number;
  bioimpedancias: number;
  exames: number;
} {
  const meses = mesesFixosModalidade(modalidade) ?? 1;
  const semanas = semanasPorMeses(meses);
  switch (modalidade) {
    case 'mensal':
      return { consultas: 1, bioimpedancias: semanas, exames: 1 };
    case 'trimestral':
      return { consultas: 3, bioimpedancias: semanas, exames: 2 };
    case 'semestral':
      return { consultas: 6, bioimpedancias: semanas, exames: 3 };
    default:
      return { consultas: 0, bioimpedancias: 0, exames: 0 };
  }
}

export function dosesMensaisDaConfig(
  config: Pick<OrcamentoTerapeuticoConfig, 'dosesMensaisDisponiveisMg' | 'doseInicialMensalMg'>
): number[] {
  const lista = config.dosesMensaisDisponiveisMg?.filter((d) => d > 0) ?? [];
  if (lista.length > 0) return [...lista].sort((a, b) => a - b);
  return [...DOSES_MENSAIS_PADRAO_MG];
}

export function doseMensalInicial(config: Pick<OrcamentoTerapeuticoConfig, 'doseInicialMensalMg'>): number {
  const d = config.doseInicialMensalMg;
  return d > 0 ? d : 2.5;
}

export function aplicacoesMensaisDaConfig(
  config: Pick<OrcamentoTerapeuticoConfig, 'aplicacoesMensais'>
): number {
  return Math.max(1, Math.round(config.aplicacoesMensais || 4));
}

export function clampMesesPersonalizado(meses: number): number {
  return clamp(Math.round(meses), PRAZO_PERSONALIZADO_MIN_MESES, PRAZO_PERSONALIZADO_MAX_MESES);
}

export function clampMetaPersonalizada(metaKg: number): number {
  const step = META_PERSONALIZADA_STEP_KG;
  const arred = Math.round(metaKg / step) * step;
  return clamp(Math.round(arred * 10) / 10, META_PERSONALIZADA_MIN_KG, META_PERSONALIZADA_MAX_KG);
}

function montarEstimativaPacote(
  modalidade: ModalidadePlanoId,
  dosesSemanais: number[],
  aplicacoesMensais = 4
): EstimativaPlanoInicialV1 {
  const meses = mesesFixosModalidade(modalidade)!;
  const semanas = semanasFixasPorModalidade(
    modalidade as Exclude<ModalidadePlanoId, 'personalizado'>
  );
  const dosesAjustadas = ajustarDosesAoPrazo(dosesSemanais, semanas);
  const recursos = recursosPacoteModalidade(modalidade);
  const doseSemanal = dosesAjustadas.find((d) => d > 0) ?? 0;
  const aplicacoes =
    modalidade === 'mensal'
      ? Math.max(1, Math.round(aplicacoesMensais))
      : dosesAjustadas.length;
  const mg =
    modalidade === 'mensal'
      ? Math.round(doseSemanal * aplicacoes * 10) / 10
      : somaDoses(dosesAjustadas);

  const rotulos: Record<Exclude<ModalidadePlanoId, 'personalizado'>, string> = {
    mensal: 'Plano mensal',
    trimestral: 'Plano trimestral',
    semestral: 'Plano semestral',
  };

  return {
    duracaoMeses: meses,
    duracaoSemanas: semanas,
    numeroAplicacoes: aplicacoes,
    quantidadeMedicacaoMg: mg,
    consultasIncluidas: recursos.consultas,
    bioimpedanciasIncluidas: recursos.bioimpedancias,
    examesIncluidos: recursos.exames,
    nomePlanoSugerido: rotulos[modalidade as Exclude<ModalidadePlanoId, 'personalizado'>],
    origemEstimativa: 'v2_deterministica',
  };
}

function aplicarDescontoModalidade(
  composicao: ComposicaoPlanoComercial,
  modalidade: ModalidadePlanoId,
  config: Pick<
    OrcamentoTerapeuticoConfig,
    'descontoPlanoTrimestralPercentual' | 'descontoPlanoSemestralPercentual'
  >
): ComposicaoPlanoComercial {
  let pct = 0;
  if (modalidade === 'trimestral') pct = config.descontoPlanoTrimestralPercentual ?? 0;
  if (modalidade === 'semestral') pct = config.descontoPlanoSemestralPercentual ?? 0;
  if (pct <= 0) return composicao;

  const bruto = composicao.subtotal + composicao.margem - composicao.descontoManual;
  const descontoExtra = Math.round(bruto * (pct / 100) * 100) / 100;
  return {
    ...composicao,
    descontoManual: Math.round((composicao.descontoManual + descontoExtra) * 100) / 100,
  };
}

function blocoSemanasRitmo(ritmo: RitmoEscalonamentoId): number {
  return ritmo === 'lento' ? 4 : 2;
}

function arredondarDoseMg(dose: number): number {
  return limitarDoseEscalonamentoMg(dose);
}

/** Ciclo de 12 semanas (trimestral) — ritmo lento. */
export function cicloDosesLentoTrimestral(doseInicialMg: number): number[] {
  return montarEscadinhaDose(doseInicialMg, 12, 4);
}

/** Ciclo de 12 semanas (trimestral) — ritmo agressivo. */
export function cicloDosesAgressivoTrimestral(doseInicialMg: number): number[] {
  return montarEscadinhaDose(doseInicialMg, 12, 2);
}

/** Plano semestral (24 sem) — lento: pirâmide centrada em 6 meses. */
export function cicloDosesLentoSemestral(doseInicialMg: number): number[] {
  return montarDosesComDesmame(doseInicialMg, 24, 12, 4);
}

/** Plano semestral (24 sem) — agressivo: pirâmide centrada em 6 meses. */
export function cicloDosesAgressivoSemestral(doseInicialMg: number): number[] {
  return montarDosesComDesmame(doseInicialMg, 24, 12, 2);
}

/** Semanas finais reservadas ao desmame (dose inicial), por prazo e ritmo. */
export function semanasDesmamePorPrazo(
  mesesTotal: number,
  ritmo: RitmoEscalonamentoId
): number {
  const meses = clampMesesPersonalizado(mesesTotal);
  if (ritmo === 'lento') {
    if (meses <= 3) return 4;
    if (meses <= 6) return 12;
    return Math.max(4, Math.round((meses / 2) * 4));
  }
  if (meses <= 3) return 2;
  if (meses <= 6) return 8;
  return Math.max(8, Math.round((meses / 3) * 4));
}

/**
 * Pirâmide para plano personalizado: dose máxima no centro do prazo.
 */
export function montarDosesSemanaisPersonalizado(
  mesesPrazo: number,
  doseInicialMg: number,
  ritmo: RitmoEscalonamentoId
): number[] {
  const meses = clampMesesPersonalizado(mesesPrazo);
  const totalSemanas = semanasPorMeses(meses);
  const semDesmame = Math.min(totalSemanas - 4, semanasDesmamePorPrazo(meses, ritmo));
  return montarDosesComDesmame(
    doseInicialMg,
    totalSemanas,
    semDesmame,
    blocoSemanasRitmo(ritmo)
  );
}

export function montarDosesSemanaisPacote(
  modalidade: ModalidadePlanoId,
  doseInicialMg: number,
  ritmo: RitmoEscalonamentoId,
  aplicacoesMensais: number
): number[] {
  if (modalidade === 'mensal') {
    const dose = arredondarDoseMg(doseInicialMg);
    return Array.from({ length: SEMANAS_MENSAL }, () => dose);
  }

  if (modalidade === 'trimestral') {
    return ritmo === 'lento'
      ? cicloDosesLentoTrimestral(doseInicialMg)
      : cicloDosesAgressivoTrimestral(doseInicialMg);
  }
  if (modalidade === 'semestral') {
    return ritmo === 'lento'
      ? cicloDosesLentoSemestral(doseInicialMg)
      : cicloDosesAgressivoSemestral(doseInicialMg);
  }
  return [];
}

function construirMarcosClinicosPlano(
  pesoInicialKg: number,
  metaKg: number | null,
  metaPercentual: number | null | undefined,
  ritmo: RitmoEscalonamentoId
) {
  const metaResolvida = resolverMetaPerdaComLimite(
    pesoInicialKg,
    metaKg,
    metaPercentual
  );
  const input = {
    pesoInicialKg,
    metaKg: metaResolvida.perdaEfetivaKg,
    metaPercentual: metaResolvida.perdaEfetivaPercentual,
  };
  return {
    marcosClinicos: calcularMarcosClinicosPorRitmo(input, ritmo),
    semanaMetaAtingida: semanaMetaAtingidaPorRitmo(input, ritmo),
    metaResolvida,
  };
}

function somaDoses(doses: number[]): number {
  return Math.round(doses.reduce((s, d) => s + d, 0) * 10) / 10;
}

export type CalcularMesesPersonalizadoParaMetaInput = {
  pesoAtualKg: number | null;
  metaKg: number;
  metaPercentual: number | null;
  doseMensalMg: number;
  ritmoEscalonamento: RitmoEscalonamentoId;
  doseReferenciaMg: number;
};

/** Semanas até atingir a meta (última semana de perda), considerando dose e ritmo. */
export function semanasParaAtingirMetaPersonalizado(
  input: CalcularMesesPersonalizadoParaMetaInput
): number {
  const pesoInicio = input.pesoAtualKg ?? 80;
  const marcos = construirMarcosClinicosPlano(
    pesoInicio,
    input.metaKg,
    input.metaPercentual,
    input.ritmoEscalonamento
  );
  const perda = marcos.metaResolvida.perdaEfetivaKg;
  if (perda <= 0) {
    return semanasPorMeses(PRAZO_PERSONALIZADO_MIN_MESES);
  }

  return calcularSemanaMetaComDose(
    perda,
    marcos.semanaMetaAtingida,
    input.doseMensalMg,
    input.doseReferenciaMg,
    999
  );
}

/** Prazo inicial do personalizado: meses para atingir a meta na última semana do período. */
export function calcularMesesInicialPersonalizadoParaMeta(
  input: CalcularMesesPersonalizadoParaMetaInput
): number {
  const semanas = semanasParaAtingirMetaPersonalizado(input);
  return clampMesesPersonalizado(Math.ceil(semanas / 4));
}

export type ResolvePlanoModalidadeInput = ResolvePlanoUnicoInput & {
  modalidade: ModalidadePlanoId;
  configuracaoComercial: OrcamentoTerapeuticoConfig;
  doseMensalMg: number;
  ritmoEscalonamento: RitmoEscalonamentoId;
  metaPercentual: number | null;
  descontoManual?: number;
};

/**
 * Resolve o plano conforme a modalidade escolhida.
 * Personalizado delega à interpolação legada (cenários v1).
 */
export function resolvePlanoPorModalidade(input: ResolvePlanoModalidadeInput): PlanoTratamentoUnificado {
  const {
    modalidade,
    configuracaoComercial,
    doseMensalMg,
    ritmoEscalonamento,
    descontoManual = 0,
    metaPercentual,
    mesesPrazo,
    metaKgSlider,
    metaKgOriginal,
    pesoAtual,
    cenariosLegados,
  } = input;

  if (modalidade === 'personalizado') {
    const dose = doseMensalMg > 0 ? doseMensalMg : doseMensalInicial(configuracaoComercial);
    const meses = clampMesesPersonalizado(mesesPrazo);
    const dosesSemanais = montarDosesSemanaisPersonalizado(meses, dose, ritmoEscalonamento);
    const metaPacienteSlider = clampMetaPersonalizada(metaKgSlider);
    const metaResolvida = resolverMetaPerdaComLimite(
      pesoAtual,
      metaPacienteSlider,
      metaPercentual
    );

    const plano = resolvePlanoUnico({
      cenariosLegados,
      mesesPrazo: meses,
      metaKgSlider: metaResolvida.perdaEfetivaKg,
      metaKgOriginal,
      pesoAtual,
    });

    const mgTotal = somaDoses(dosesSemanais);
    const semanas = dosesSemanais.length;
    const estimativaAtualizada = {
      ...plano.estimativa,
      duracaoMeses: meses,
      duracaoSemanas: semanas,
      numeroAplicacoes: semanas,
      quantidadeMedicacaoMg: mgTotal,
    };

    let composicao = calcularComposicaoPlanoInterativo(
      estimativaAtualizada,
      configuracaoComercial,
      descontoManual
    );
    const valorTotal = calcularValorTotalPlanoInterativo(composicao);

    const perda = estimarPerdaPrevistaPacote({
      modalidade: 'personalizado',
      duracaoSemanas: semanas,
      pesoAtualKg: pesoAtual,
      metaPacienteKg: metaPacienteSlider,
      metaPercentual,
    });

    const pesoInicio = pesoAtual ?? 80;
    const marcos = construirMarcosClinicosPlano(
      pesoInicio,
      metaPacienteSlider,
      metaPercentual,
      ritmoEscalonamento
    );
    const doseRef = doseMensalInicial(configuracaoComercial);
    const semanaMeta = calcularSemanaMetaComDose(
      marcos.metaResolvida.perdaEfetivaKg,
      marcos.semanaMetaAtingida,
      dose,
      doseRef,
      semanas
    );
    const curvaPeso = gerarCurvaPesoComManutencao(
      pesoInicio,
      marcos.metaResolvida.perdaEfetivaKg,
      semanas,
      semanaMeta
    );
    const horizonte = calcularHorizonteAtualFasePerda(semanas);

    return {
      ...plano,
      estimativa: estimativaAtualizada,
      dosesSemanais,
      composicao,
      valorTotal,
      curvaPeso,
      marcadores: gerarMarcadoresTimeline(estimativaAtualizada),
      perdaPrevistaKg: marcos.metaResolvida.perdaEfetivaKg,
      perdaSemanalKg: PERDA_SEMANAL_MEDIA_KG,
      metaPacienteKg: perda.metaPacienteKg,
      metaSuperiorAoPrevisto: perda.metaSuperiorAoPrevisto,
      usaMetaPacienteNaCurva: true,
      marcosClinicos: marcos.marcosClinicos,
      semanaMetaAtingida: semanaMeta,
      semanaFimHorizonteVisual: horizonte.semanaFimHorizonteVisual,
      fases: montarFasesVisuaisPlano(semanas, semanaMeta),
    };
  }

  const dose = doseMensalMg > 0 ? doseMensalMg : doseMensalInicial(configuracaoComercial);
  const semanasFixas = semanasFixasPorModalidade(
    modalidade as Exclude<ModalidadePlanoId, 'personalizado'>
  );
  const dosesSemanais = ajustarDosesAoPrazo(
    montarDosesSemanaisPacote(
      modalidade,
      dose,
      ritmoEscalonamento,
      aplicacoesMensaisDaConfig(configuracaoComercial)
    ),
    semanasFixas
  );
  const estimativa = montarEstimativaPacote(
    modalidade,
    dosesSemanais,
    aplicacoesMensaisDaConfig(configuracaoComercial)
  );

  const perda = estimarPerdaPrevistaPacote({
    modalidade,
    duracaoSemanas: estimativa.duracaoSemanas,
    pesoAtualKg: pesoAtual,
    metaPacienteKg: metaKgOriginal,
    metaPercentual,
  });

  const pesoInicio = pesoAtual ?? 80;
  const marcos = construirMarcosClinicosPlano(
    pesoInicio,
    perda.metaPacienteKg,
    metaPercentual,
    ritmoEscalonamento
  );
  const doseRef = doseMensalInicial(configuracaoComercial);
  const semanaMeta = calcularSemanaMetaComDose(
    marcos.metaResolvida.perdaEfetivaKg,
    marcos.semanaMetaAtingida,
    dose,
    doseRef,
    estimativa.duracaoSemanas
  );
  const curvaPeso = gerarCurvaPesoComManutencao(
    pesoInicio,
    marcos.metaResolvida.perdaEfetivaKg,
    estimativa.duracaoSemanas,
    semanaMeta
  );
  const horizonte = calcularHorizonteAtualFasePerda(estimativa.duracaoSemanas);
  let composicao = calcularComposicaoPlanoInterativo(
    estimativa,
    configuracaoComercial,
    descontoManual
  );
  composicao = aplicarDescontoModalidade(composicao, modalidade, configuracaoComercial);

  const valorTotal = calcularValorTotalPlanoInterativo(composicao);

  return {
    estimativa: {
      duracaoMeses: estimativa.duracaoMeses,
      duracaoSemanas: estimativa.duracaoSemanas,
      numeroAplicacoes: estimativa.numeroAplicacoes,
      quantidadeMedicacaoMg: estimativa.quantidadeMedicacaoMg,
      consultasIncluidas: estimativa.consultasIncluidas,
      bioimpedanciasIncluidas: estimativa.bioimpedanciasIncluidas,
      examesIncluidos: estimativa.examesIncluidos,
    },
    perdaSemanalKg: PERDA_SEMANAL_MEDIA_KG,
    valorTotal,
    composicao,
    curvaPeso,
    dosesSemanais,
    marcadores: gerarMarcadoresTimeline({
      duracaoMeses: estimativa.duracaoMeses,
      duracaoSemanas: estimativa.duracaoSemanas,
      numeroAplicacoes: estimativa.numeroAplicacoes,
      quantidadeMedicacaoMg: estimativa.quantidadeMedicacaoMg,
      consultasIncluidas: estimativa.consultasIncluidas,
      bioimpedanciasIncluidas: estimativa.bioimpedanciasIncluidas,
      examesIncluidos: estimativa.examesIncluidos,
    }),
    guardrailAplicado: false,
    mensagemGuardrail: undefined,
    semanaMetaAtingida: semanaMeta,
    semanaFimHorizonteVisual: horizonte.semanaFimHorizonteVisual,
    marcosClinicos: marcos.marcosClinicos,
    fases: montarFasesVisuaisPlano(estimativa.duracaoSemanas, semanaMeta),
    perdaPrevistaKg: marcos.metaResolvida.perdaEfetivaKg,
    metaPacienteKg: perda.metaPacienteKg,
    metaSuperiorAoPrevisto: perda.metaSuperiorAoPrevisto,
    usaMetaPacienteNaCurva: false,
  };
}
