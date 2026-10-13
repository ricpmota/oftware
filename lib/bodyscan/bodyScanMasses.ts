import type { BodyScanRangeKg } from '@/lib/bodyscan/bodyScanTypes';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Massa gorda / massa livre de gordura — cálculo determinístico no backend.
 * NÃO deve ser pedido ao Gemini.
 */
export function calculateBodyScanMasses(params: {
  weightKg: number;
  minPercent: number | null;
  centralPercent: number | null;
  maxPercent: number | null;
}): {
  estimatedFatMassKg: BodyScanRangeKg | null;
  estimatedFatFreeMassKg: BodyScanRangeKg | null;
} {
  const { weightKg, minPercent, centralPercent, maxPercent } = params;
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    minPercent == null ||
    centralPercent == null ||
    maxPercent == null
  ) {
    return { estimatedFatMassKg: null, estimatedFatFreeMassKg: null };
  }

  const fatMin = round1((weightKg * minPercent) / 100);
  const fatCentral = round1((weightKg * centralPercent) / 100);
  const fatMax = round1((weightKg * maxPercent) / 100);

  return {
    estimatedFatMassKg: { min: fatMin, central: fatCentral, max: fatMax },
    estimatedFatFreeMassKg: {
      min: round1(weightKg - fatMax),
      central: round1(weightKg - fatCentral),
      max: round1(weightKg - fatMin),
    },
  };
}
