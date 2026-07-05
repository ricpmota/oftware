/**
 * Camada de apresentação do Plano Terapêutico — compatibilidade e re-exports.
 *
 * A arquitetura do Treatment Designer vive em `lib/treatment-designer/`.
 * Este arquivo mantém a API usada pela UI enquanto migramos para plano único.
 *
 * INTERPOLAÇÃO LEGADA (3 cenários):
 * - `resolverPlanoContinuo` → delega para `resolvePlanoUnico` (legacyCenarioAdapter)
 * - FUTURO: `TreatmentPlanningEngine.compute()` substitui toda esta cadeia
 *
 * Ver docs/oi/13_TREATMENT_ENGINE_PREPARATION.md
 */
import { montarDadosGraficoTratamento } from '@/lib/treatment-designer/graficoPlano';
import { mesesInicialDoPlanoLegado, mesesParaCenarioLegado } from '@/lib/treatment-designer/legacyTresCenarios';
import { resolvePlanoUnico } from '@/lib/treatment-designer/legacyCenarioAdapter';
import type {
  MarcadorTimelineTratamento,
  PlanoTratamentoUnificado,
  PontoGraficoTratamento,
  ResumoDinamicoTratamento,
} from '@/lib/treatment-designer/types';
import {
  PERDA_SEMANAL_MAX_KG,
  PERDA_SEMANAL_MEDIA_KG,
  PERDA_SEMANAL_MIN_KG,
} from '@/lib/planoTerapeutico/escadinhaDose';
import type { CenarioPlanoTipo, CenarioPlanoTerapeutico } from '@/types/planoTerapeuticoInterativo';

export {
  PRAZO_SLIDER_MIN_MESES,
  PRAZO_SLIDER_MAX_MESES,
  clampMesesSlider,
  prazoParaInterpolacao,
  interpolarCenarioPorPrazo,
} from '@/lib/treatment-designer/legacyTresCenarios';

export {
  META_SLIDER_MIN_KG,
  META_SLIDER_MAX_KG,
  clampMetaSlider,
  metaInicialDoPlano,
  calcularPesoAlvo,
  formatarPrazoMeses,
  formatarMetaKg,
  formatarFrequenciaPorMes,
  formatarFrequenciaPorSemana,
  derivarDosesSemanaisVisuais,
  gerarMarcadoresTimeline,
} from '@/lib/treatment-designer/planoVisuais';

/** @deprecated Use MarcadorTimelineTratamento */
export type MarcadorTimelineUi = MarcadorTimelineTratamento;

/** @deprecated Use PlanoTratamentoUnificado */
export type PlanoContinuoUi = PlanoTratamentoUnificado;

/** @deprecated Use PontoGraficoTratamento */
export type PontoGraficoPlanoUi = PontoGraficoTratamento;

/** @deprecated Use ResumoDinamicoTratamento */
export type ResumoDinamicoUi = ResumoDinamicoTratamento;

/** @deprecated Use EstimativaPlanoTratamento via PlanoTratamentoUnificado */
export type EstimativaPlanoUi = PlanoTratamentoUnificado['estimativa'];

/** @deprecated Use mesesInicialDoPlanoLegado */
export function mesesInicialDoPlano(
  cenarios: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>
): number {
  return mesesInicialDoPlanoLegado(cenarios);
}

/**
 * Ponto de entrada da UI — resolve o plano único a partir dos cenários persistidos.
 *
 * INTERPOLAÇÃO: ocorre dentro de `resolvePlanoUnico` → `interpolarCenarioPorPrazo`.
 * FUTURO: `TreatmentPlanningEngine.compute({ metaKg, mesesPrazo, pesoAtualKg })`
 */
export function resolverPlanoContinuo(
  cenarios: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>,
  mesesPrazo: number,
  metaKgSlider: number,
  metaKgOriginal: number | null,
  pesoAtual: number | null
): PlanoTratamentoUnificado {
  return resolvePlanoUnico({
    cenariosLegados: cenarios,
    mesesPrazo,
    metaKgSlider,
    metaKgOriginal,
    pesoAtual,
  });
}

/** @deprecated Use montarDadosGraficoTratamento */
export function montarDadosGraficoPlano(
  plano: PlanoTratamentoUnificado,
  pesoAlvoKg: number | null
): PontoGraficoTratamento[] {
  return montarDadosGraficoTratamento(plano, pesoAlvoKg);
}

export function montarResumoDinamico(plano: PlanoTratamentoUnificado): ResumoDinamicoTratamento {
  return {
    prazoMeses: plano.estimativa.duracaoMeses,
    perdaSemanalKg: PERDA_SEMANAL_MEDIA_KG,
    perdaSemanalMinKg: PERDA_SEMANAL_MIN_KG,
    perdaSemanalMaxKg: PERDA_SEMANAL_MAX_KG,
    doseTotalMg: plano.estimativa.quantidadeMedicacaoMg,
    aplicacoes: plano.estimativa.numeroAplicacoes,
    consultas: plano.estimativa.consultasIncluidas,
    bioimpedancias: plano.estimativa.bioimpedanciasIncluidas,
  };
}

/** @deprecated UI v1 — use resolverPlanoContinuo / resolvePlanoUnico */
export function mesesParaCenario(meses: number): CenarioPlanoTipo {
  return mesesParaCenarioLegado(meses);
}
