/**
 * @legacy Camada de compatibilidade com o motor v1 (três cenários persistidos).
 *
 * DEPENDÊNCIA LEGADA — remover quando TreatmentPlanningEngine.compute() substituir
 * a interpolação entre progressivo / equilibrado / intensivo.
 *
 * Consumidores atuais:
 * - legacyCenarioAdapter.ts (único ponto de entrada da UI)
 * - planoTerapeuticoPlanoUi.ts (re-exporta para compat)
 *
 * Não usar em código novo fora deste módulo.
 */
import type {
  CenarioPlanoTerapeutico,
  CenarioPlanoTipo,
  ComposicaoPlanoComercial,
} from '@/types/planoTerapeuticoInterativo';

export const LEGACY_CENARIOS_ORDEM: CenarioPlanoTipo[] = [
  'intensivo',
  'equilibrado',
  'progressivo',
];

export const PRAZO_SLIDER_MIN_MESES = 2;
export const PRAZO_SLIDER_MAX_MESES = 12;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampMesesSlider(meses: number): number {
  return clamp(Math.round(meses), PRAZO_SLIDER_MIN_MESES, PRAZO_SLIDER_MAX_MESES);
}

/** Normaliza prazo 4–10 meses → 0 (intensivo) … 1 (progressivo), 0.5 = equilibrado. */
export function prazoParaInterpolacao(meses: number): number {
  return (
    (clampMesesSlider(meses) - PRAZO_SLIDER_MIN_MESES) /
    (PRAZO_SLIDER_MAX_MESES - PRAZO_SLIDER_MIN_MESES)
  );
}

function interpolarEntreCenarios(
  a: CenarioPlanoTerapeutico,
  b: CenarioPlanoTerapeutico,
  t: number
): CenarioPlanoTerapeutico {
  const lt = clamp(t, 0, 1);
  const interp = (va: number, vb: number) => Math.round(lerp(va, vb, lt) * 10) / 10;
  const interpInt = (va: number, vb: number) => Math.max(1, Math.round(lerp(va, vb, lt)));

  return {
    ...a,
    estimativa: {
      ...a.estimativa,
      duracaoSemanas: interpInt(a.estimativa.duracaoSemanas, b.estimativa.duracaoSemanas),
      duracaoMeses: interpInt(a.estimativa.duracaoMeses, b.estimativa.duracaoMeses),
      numeroAplicacoes: interpInt(a.estimativa.numeroAplicacoes, b.estimativa.numeroAplicacoes),
      quantidadeMedicacaoMg: interp(
        a.estimativa.quantidadeMedicacaoMg,
        b.estimativa.quantidadeMedicacaoMg
      ),
      consultasIncluidas: interpInt(
        a.estimativa.consultasIncluidas,
        b.estimativa.consultasIncluidas
      ),
      bioimpedanciasIncluidas: interpInt(
        a.estimativa.bioimpedanciasIncluidas,
        b.estimativa.bioimpedanciasIncluidas
      ),
      examesIncluidos: interpInt(a.estimativa.examesIncluidos, b.estimativa.examesIncluidos),
    },
    perdaSemanalKg: interp(a.perdaSemanalKg, b.perdaSemanalKg),
    valorTotal: Math.round(lerp(a.valorTotal, b.valorTotal, lt) * 100) / 100,
    composicao: interpolarComposicao(a.composicao, b.composicao, lt),
    guardrailAplicado: a.guardrailAplicado || b.guardrailAplicado,
    mensagemGuardrail: a.mensagemGuardrail ?? b.mensagemGuardrail,
    curvaPeso: a.curvaPeso,
  };
}

function interpolarComposicao(
  a: ComposicaoPlanoComercial,
  b: ComposicaoPlanoComercial,
  t: number
): ComposicaoPlanoComercial {
  const lt = clamp(t, 0, 1);
  const i = (va: number, vb: number) => Math.round(lerp(va, vb, lt) * 100) / 100;
  const bruto = i(a.custoMedicacaoBruto, b.custoMedicacaoBruto);
  const desc = i(a.descontoMedicacaoVolume, b.descontoMedicacaoVolume);
  const liquido = i(a.custoMedicacaoLiquido, b.custoMedicacaoLiquido);
  return {
    custoMedicacaoBruto: bruto,
    descontoMedicacaoVolume: desc,
    descontoMedicacaoVolumePercentual: i(
      a.descontoMedicacaoVolumePercentual,
      b.descontoMedicacaoVolumePercentual
    ),
    custoMedicacaoLiquido: liquido,
    custoKits: i(a.custoKits, b.custoKits),
    consultasAcompanhamento: i(a.consultasAcompanhamento, b.consultasAcompanhamento),
    bioimpedancia: i(a.bioimpedancia, b.bioimpedancia),
    exames: i(a.exames, b.exames),
    outrosCustos: i(a.outrosCustos, b.outrosCustos),
    subtotal: i(a.subtotal, b.subtotal),
    margem: i(a.margem, b.margem),
    descontoManual: i(a.descontoManual, b.descontoManual),
  };
}

/**
 * @legacy Interpolação contínua entre os 3 cenários do motor v1.
 * FUTURO: substituída por TreatmentPlanningEngine.compute().
 */
export function interpolarCenarioPorPrazo(
  cenarios: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>,
  meses: number
): CenarioPlanoTerapeutico {
  const t = prazoParaInterpolacao(meses);
  const [intensivo, equilibrado, progressivo] = LEGACY_CENARIOS_ORDEM.map((k) => cenarios[k]);

  if (t <= 0.5) {
    return interpolarEntreCenarios(intensivo, equilibrado, t / 0.5);
  }
  return interpolarEntreCenarios(equilibrado, progressivo, (t - 0.5) / 0.5);
}

/** @legacy Valor inicial do slider de prazo a partir do cenário equilibrado persistido. */
export function mesesInicialDoPlanoLegado(
  cenarios: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>
): number {
  return clampMesesSlider(cenarios.equilibrado.estimativa.duracaoMeses);
}

/** @deprecated UI v1 — mantido para compat. */
export function mesesParaCenarioLegado(meses: number): CenarioPlanoTipo {
  const m = clampMesesSlider(meses);
  if (m <= 5) return 'intensivo';
  if (m <= 7) return 'equilibrado';
  return 'progressivo';
}
