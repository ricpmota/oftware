import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type {
  CenarioPlanoTerapeutico,
  CenarioPlanoTipo,
  PontoCurvaPeso,
} from '@/types/planoTerapeuticoInterativo';

/**
 * Motor v1 — gera três cenários (progressivo / equilibrado / intensivo) persistidos no Firestore.
 *
 * @legacy A UI não exibe mais os três cards; interpolação ocorre em legacyTresCenarios.ts.
 * FUTURO: TreatmentPlanningEngine.compute() — plano único multi-fase.
 * Ver docs/oi/13_TREATMENT_ENGINE_PREPARATION.md
 */
import {
  calcularComposicaoPlanoInterativo,
  calcularValorTotalPlanoInterativo,
} from '@/lib/metaadmin/planoTerapeuticoComercial';

export const MAX_KG_PER_SEMANA = 2;
export const VERSAO_MOTOR_PLANO = 'plano-terapeutico-v1' as const;
export const MENSAGEM_GUARDRAIL =
  'Ajustado para uma faixa de evolução clinicamente prudente.';

export type PlanoTerapeuticoEngineInput = {
  metaKg: number | null;
  metaPercentual: number | null;
  pesoAtual: number | null;
  pesoInicial: number | null;
  /** Estimativa equilibrada já com OI ou V2 aplicada. */
  estimativaEquilibrada: EstimativaPlanoInicialV1;
  config: OrcamentoTerapeuticoConfig;
  descontoManual?: number;
};

const ROTULOS: Record<
  CenarioPlanoTipo,
  { rotulo: string; descricaoCurta: string }
> = {
  progressivo: {
    rotulo: 'Progressivo',
    descricaoCurta: 'Ritmo mais gradual, com prazo estendido e evolução contínua.',
  },
  equilibrado: {
    rotulo: 'Equilibrado',
    descricaoCurta: 'Cenário recomendado com equilíbrio entre prazo, monitoramento e meta.',
  },
  intensivo: {
    rotulo: 'Intensivo',
    descricaoCurta: 'Prazo mais curto, com acompanhamento e medicação proporcionalmente maiores.',
  },
};

function arredondar1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function mesesDesdeSemanas(semanas: number): number {
  return Math.max(1, Math.round(semanas / 4));
}

function aplicarRecursosComerciais(
  base: EstimativaPlanoInicialV1,
  config: OrcamentoTerapeuticoConfig
): EstimativaPlanoInicialV1 {
  const meses = base.duracaoMeses;
  return {
    ...base,
    consultasIncluidas: Math.max(
      1,
      Math.round(meses * config.consultasPorMesPadrao)
    ),
    bioimpedanciasIncluidas: Math.max(
      1,
      Math.round(meses * config.bioimpedanciasPorMesPadrao)
    ),
    examesIncluidos: Math.max(0, Math.round(config.examesPorPlanoPadrao)),
  };
}

function escalarEstimativa(
  base: EstimativaPlanoInicialV1,
  fatorSemanas: number,
  fatorMg: number,
  config: OrcamentoTerapeuticoConfig
): EstimativaPlanoInicialV1 {
  const semanasBase = Math.max(1, base.duracaoSemanas);
  const semanas = Math.max(4, Math.round(semanasBase * fatorSemanas));
  const meses = mesesDesdeSemanas(semanas);
  const aplicacoes = Math.max(4, Math.round(base.numeroAplicacoes * fatorSemanas));
  const mg = Math.max(8, Math.round(base.quantidadeMedicacaoMg * fatorMg));

  const parcial: EstimativaPlanoInicialV1 = {
    ...base,
    duracaoSemanas: semanas,
    duracaoMeses: meses,
    numeroAplicacoes: aplicacoes,
    quantidadeMedicacaoMg: mg,
    nomePlanoSugerido: base.nomePlanoSugerido,
  };

  return aplicarRecursosComerciais(parcial, config);
}

function aplicarGuardrailSemanas(
  estimativa: EstimativaPlanoInicialV1,
  metaKg: number | null,
  config: OrcamentoTerapeuticoConfig
): { estimativa: EstimativaPlanoInicialV1; guardrailAplicado: boolean } {
  if (metaKg == null || metaKg <= 0) {
    return { estimativa, guardrailAplicado: false };
  }

  const ritmo = metaKg / Math.max(1, estimativa.duracaoSemanas);
  if (ritmo <= MAX_KG_PER_SEMANA) {
    return { estimativa, guardrailAplicado: false };
  }

  const semanasMinimas = Math.ceil(metaKg / MAX_KG_PER_SEMANA);
  const fator = semanasMinimas / estimativa.duracaoSemanas;
  const ajustada = escalarEstimativa(estimativa, fator, 1, config);

  return {
    estimativa: {
      ...ajustada,
      duracaoSemanas: semanasMinimas,
      duracaoMeses: mesesDesdeSemanas(semanasMinimas),
      numeroAplicacoes: Math.max(
        ajustada.numeroAplicacoes,
        Math.round(
          semanasMinimas * (estimativa.numeroAplicacoes / estimativa.duracaoSemanas)
        )
      ),
    },
    guardrailAplicado: true,
  };
}

export function gerarCurvaPesoPrevista(
  pesoInicial: number | null,
  pesoAtual: number | null,
  metaKg: number | null,
  duracaoSemanas: number
): PontoCurvaPeso[] {
  const inicio = pesoAtual ?? pesoInicial;
  if (inicio == null || !Number.isFinite(inicio)) return [];
  const perda = metaKg != null && metaKg > 0 ? metaKg : inicio * 0.1;
  const alvo = Math.max(0, inicio - perda);
  const semanas = Math.max(1, duracaoSemanas);
  const pontos: PontoCurvaPeso[] = [{ semana: 0, pesoKg: arredondar1(inicio) }];

  for (let s = 1; s <= semanas; s++) {
    const t = s / semanas;
    const eased = 1 - Math.pow(1 - t, 1.15);
    const peso = inicio - perda * eased;
    pontos.push({ semana: s, pesoKg: arredondar1(peso) });
  }

  if (pontos[pontos.length - 1].pesoKg !== arredondar1(alvo)) {
    pontos[pontos.length - 1] = { semana: semanas, pesoKg: arredondar1(alvo) };
  }

  return pontos;
}

function montarCenario(
  tipo: CenarioPlanoTipo,
  estimativaBase: EstimativaPlanoInicialV1,
  input: PlanoTerapeuticoEngineInput
): CenarioPlanoTerapeutico {
  const { metaKg, pesoAtual, pesoInicial, config, descontoManual = 0 } = input;

  let estimativa = estimativaBase;
  if (tipo === 'progressivo') {
    estimativa = escalarEstimativa(estimativaBase, 1.32, 0.97, config);
  } else if (tipo === 'intensivo') {
    estimativa = escalarEstimativa(estimativaBase, 0.75, 1.12, config);
  } else {
    estimativa = aplicarRecursosComerciais({ ...estimativaBase }, config);
  }

  const guardrail = aplicarGuardrailSemanas(estimativa, metaKg, config);
  estimativa = guardrail.estimativa;

  const perdaSemanalKg =
    metaKg != null && metaKg > 0
      ? arredondar1(metaKg / Math.max(1, estimativa.duracaoSemanas))
      : 0;

  const composicao = calcularComposicaoPlanoInterativo(
    estimativa,
    config,
    descontoManual
  );
  const valorTotal = calcularValorTotalPlanoInterativo(composicao);
  const curvaPeso = gerarCurvaPesoPrevista(
    pesoInicial,
    pesoAtual,
    metaKg,
    estimativa.duracaoSemanas
  );

  const meta = ROTULOS[tipo];

  return {
    tipo,
    rotulo: meta.rotulo,
    descricaoCurta: meta.descricaoCurta,
    estimativa,
    perdaSemanalKg,
    curvaPeso,
    composicao,
    valorTotal,
    guardrailAplicado: guardrail.guardrailAplicado,
    ...(guardrail.guardrailAplicado ? { mensagemGuardrail: MENSAGEM_GUARDRAIL } : {}),
  };
}

export function gerarCenariosPlanoTerapeutico(
  input: PlanoTerapeuticoEngineInput
): Record<CenarioPlanoTipo, CenarioPlanoTerapeutico> {
  const base = { ...input.estimativaEquilibrada };

  // @legacy Três cenários — consumidos por legacyCenarioAdapter via interpolação na UI.
  // Remover quando o motor passar a emitir PlanoTratamentoUnificado diretamente.
  return {
    progressivo: montarCenario('progressivo', base, input),
    equilibrado: montarCenario('equilibrado', base, input),
    intensivo: montarCenario('intensivo', base, input),
  };
}
