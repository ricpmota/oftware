/**
 * Treatment Designer — ponto de entrada da arquitetura de planejamento.
 */
export * from '@/lib/treatment-designer/types';
export * from '@/lib/treatment-designer/horizontePlano';
export * from '@/lib/treatment-designer/planoDiff';
export * from '@/lib/treatment-designer/treatmentPlanningEngine';
export * from '@/lib/treatment-designer/legacyCenarioAdapter';
export * from '@/lib/treatment-designer/graficoPlano';
export * from '@/lib/treatment-designer/marcosClinicosEsperados';
export * from '@/lib/treatment-designer/planoVisuais';
export { usePlanoDiffRef } from '@/lib/treatment-designer/usePlanoDiff';
export {
  interpolarCenarioPorPrazo,
  mesesInicialDoPlanoLegado,
  mesesParaCenarioLegado,
  prazoParaInterpolacao,
  clampMesesSlider,
  PRAZO_SLIDER_MIN_MESES,
  PRAZO_SLIDER_MAX_MESES,
  LEGACY_CENARIOS_ORDEM,
} from '@/lib/treatment-designer/legacyTresCenarios';
