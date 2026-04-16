/** Passo da meta de peso (kg) e circunferência (cm) na UI de metas (metaadmin / meta). */
export const META_STEP_KG = 0.5;
export const META_STEP_CM = 0.5;

export function roundMetaHalfStep(n: number): number {
  return Math.round(n * 2) / 2;
}
