/**
 * Adaptador: dados persistidos (3 cenários v1) → plano único da UI.
 *
 * Único ponto em que a UI deve tocar nos cenários legados.
 * FUTURO: substituído por TreatmentPlanningEngine.compute().
 */
import {
  calcularHorizonteAtualFasePerda,
  fasesPlaceholderFasePerda,
  marcosPlaceholderFasePerda,
} from '@/lib/treatment-designer/horizontePlano';
import { interpolarCenarioPorPrazo } from '@/lib/treatment-designer/legacyTresCenarios';
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';
import type {
  CenarioPlanoTipo,
  CenarioPlanoTerapeutico,
  ComposicaoPlanoComercial,
  PontoCurvaPeso,
} from '@/types/planoTerapeuticoInterativo';
import { clampMesesSlider } from '@/lib/treatment-designer/legacyTresCenarios';
import {
  derivarDosesSemanaisVisuais,
  gerarMarcadoresTimeline,
} from '@/lib/treatment-designer/planoVisuais';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function gerarCurvaPesoUi(
  pesoInicio: number,
  metaKg: number,
  duracaoSemanas: number
): PontoCurvaPeso[] {
  const semanas = Math.max(1, Math.round(duracaoSemanas));
  const perda = Math.max(0, metaKg);
  const alvo = Math.max(0, pesoInicio - perda);
  const pontos: PontoCurvaPeso[] = [{ semana: 0, pesoKg: Math.round(pesoInicio * 10) / 10 }];

  for (let s = 1; s <= semanas; s++) {
    const eased = 1 - Math.pow(1 - s / semanas, 1.15);
    const peso = pesoInicio - perda * eased;
    pontos.push({ semana: s, pesoKg: Math.round(peso * 10) / 10 });
  }
  if (pontos[pontos.length - 1].pesoKg !== Math.round(alvo * 10) / 10) {
    pontos[pontos.length - 1] = { semana: semanas, pesoKg: Math.round(alvo * 10) / 10 };
  }
  return pontos;
}

function escalarComposicaoPorMeta(
  composicao: ComposicaoPlanoComercial,
  fatorMeta: number
): ComposicaoPlanoComercial {
  const f = clamp(fatorMeta, 0.5, 2);
  const bruto = Math.round(composicao.custoMedicacaoBruto * f * 100) / 100;
  const desc = Math.round(composicao.descontoMedicacaoVolume * f * 100) / 100;
  const liquido = Math.round((bruto - desc) * 100) / 100;
  const subtotal =
    liquido +
    composicao.custoKits +
    composicao.consultasAcompanhamento +
    composicao.bioimpedancia +
    composicao.exames +
    composicao.outrosCustos;
  const margem =
    Math.round(
      (subtotal * (composicao.margem / Math.max(composicao.subtotal, 1))) * 100
    ) / 100;
  return {
    ...composicao,
    custoMedicacaoBruto: bruto,
    descontoMedicacaoVolume: desc,
    custoMedicacaoLiquido: liquido,
    subtotal: Math.round(subtotal * 100) / 100,
    margem,
  };
}

export type ResolvePlanoUnicoInput = {
  cenariosLegados: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>;
  mesesPrazo: number;
  metaKgSlider: number;
  metaKgOriginal: number | null;
  pesoAtual: number | null;
};

/**
 * Resolve o plano único exibido na UI a partir dos cenários persistidos.
 *
 * INTERPOLAÇÃO LEGADA (remover no motor v2):
 * 1. interpolarCenarioPorPrazo(cenarios, meses) — prazo → cenário sintético
 * 2. escalarComposicaoPorMeta — meta do slider vs meta original
 *
 * FUTURO: TreatmentPlanningEngine.compute({ mesesPrazo, metaKg, pesoAtualKg })
 */
export function resolvePlanoUnico(input: ResolvePlanoUnicoInput): PlanoTratamentoUnificado {
  const { cenariosLegados, mesesPrazo, metaKgSlider, metaKgOriginal, pesoAtual } = input;

  const base = interpolarCenarioPorPrazo(cenariosLegados, mesesPrazo);
  const metaRef = metaKgOriginal && metaKgOriginal > 0 ? metaKgOriginal : metaKgSlider;
  const fatorMeta = metaKgSlider / metaRef;

  const mgAjustada = Math.round(base.estimativa.quantidadeMedicacaoMg * fatorMeta * 10) / 10;
  const semanas = base.estimativa.duracaoSemanas;
  const perdaSemanal = Math.round((metaKgSlider / Math.max(1, semanas)) * 10) / 10;

  const pesoInicio = pesoAtual ?? 80;
  const curvaPeso = gerarCurvaPesoUi(pesoInicio, metaKgSlider, semanas);
  const dosesSemanais = derivarDosesSemanaisVisuais(mgAjustada, semanas);

  const composicao = escalarComposicaoPorMeta(base.composicao, fatorMeta);
  const valorTotal =
    Math.round(
      (composicao.subtotal + composicao.margem - composicao.descontoManual) * 100
    ) / 100;

  const estimativa = {
    duracaoMeses: clampMesesSlider(mesesPrazo),
    duracaoSemanas: semanas,
    numeroAplicacoes: base.estimativa.numeroAplicacoes,
    quantidadeMedicacaoMg: mgAjustada,
    consultasIncluidas: base.estimativa.consultasIncluidas,
    bioimpedanciasIncluidas: base.estimativa.bioimpedanciasIncluidas,
    examesIncluidos: base.estimativa.examesIncluidos,
  };

  const horizonte = calcularHorizonteAtualFasePerda(semanas);

  return {
    estimativa,
    perdaSemanalKg: perdaSemanal,
    valorTotal,
    composicao,
    curvaPeso,
    dosesSemanais,
    marcadores: gerarMarcadoresTimeline(estimativa),
    guardrailAplicado: base.guardrailAplicado,
    mensagemGuardrail: base.mensagemGuardrail,
    semanaMetaAtingida: horizonte.semanaMetaAtingida,
    semanaFimHorizonteVisual: horizonte.semanaFimHorizonteVisual,
    marcosClinicos: marcosPlaceholderFasePerda(semanas, pesoInicio, metaKgSlider),
    fases: fasesPlaceholderFasePerda(semanas),
    perdaPrevistaKg: metaKgSlider,
    metaPacienteKg: metaKgOriginal,
    metaSuperiorAoPrevisto: false,
    usaMetaPacienteNaCurva: true,
  };
}
