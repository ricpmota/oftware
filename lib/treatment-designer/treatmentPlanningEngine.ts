/**
 * Contrato do motor futuro — Treatment Planning Engine v2.
 *
 * Hoje a UI usa legacyCenarioAdapter (interpolação dos 3 cenários v1).
 * FUTURO: TreatmentPlanningEngine.compute() substitui toda a cadeia legada.
 *
 * Ver docs/oi/12_FASES_DO_TRATAMENTO.md
 */
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';
import type { CenarioPlanoTipo, CenarioPlanoTerapeutico } from '@/types/planoTerapeuticoInterativo';

export type TreatmentPlanningInput = {
  mesesPrazo: number;
  metaKg: number;
  metaKgOriginal: number | null;
  pesoAtualKg: number | null;
  /** Temporário — removido quando o motor calcular direto sem cenários. */
  cenariosLegados?: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>;
};

export type TreatmentPlanningOutput = {
  plano: PlanoTratamentoUnificado;
  versaoMotor: 'plano-terapeutico-v2-fases' | 'plano-terapeutico-v1-adapter';
};

/**
 * Motor futuro. Não implementado — use resolvePlanoUnico() na UI.
 */
export const TreatmentPlanningEngine = {
  compute(_input: TreatmentPlanningInput): TreatmentPlanningOutput {
    throw new Error(
      'TreatmentPlanningEngine.compute() ainda não implementado. Use resolvePlanoUnico().'
    );
  },
} as const;
