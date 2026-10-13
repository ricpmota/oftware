/** Snap de régua: o valor final sempre cai num múltiplo de `step` dentro de [min, max]. */
export function snapRulerValue(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(min)) return 0;
  if (!Number.isFinite(value) || !Number.isFinite(max) || !(step > 0)) return min;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const stepsFromMin = Math.round((value - lo) / step);
  const maxSteps = Math.round((hi - lo) / step);
  const clamped = Math.min(maxSteps, Math.max(0, stepsFromMin));
  const snapped = lo + clamped * step;
  const precision = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  const factor = 10 ** Math.min(8, precision);
  return Math.round(snapped * factor) / factor;
}

/** Deslocamento em px para o `value` ficar sob o marcador central. 0 = mínimo. */
export function rulerOffsetForValue(
  value: number,
  min: number,
  step: number,
  pxPerStep: number,
): number {
  if (!(step > 0) || !(pxPerStep > 0)) return 0;
  const offset = -((value - min) / step) * pxPerStep;
  return offset === 0 ? 0 : offset;
}

/** Percentual já usado pelo slider: 1 casa decimal, limitado a 5–45. */
export function percentLossFromKg(kg: number, peso0: number, pctMin = 5, pctMax = 45): number {
  if (!(peso0 > 0)) return pctMin;
  const raw = (kg / peso0) * 100;
  return Math.round(Math.min(pctMax, Math.max(pctMin, raw)) * 10) / 10;
}

export function roundMetaTenth(n: number): number {
  return Math.round(n * 10) / 10;
}

export function kgLossFromPercent(pct: number, peso0: number): number {
  if (!(peso0 > 0)) return 0;
  return roundMetaTenth((peso0 * pct) / 100);
}

export function rulerValueForOffset(
  offset: number,
  min: number,
  step: number,
  pxPerStep: number,
): number {
  if (!(step > 0) || !(pxPerStep > 0)) return min;
  return min + (-offset / pxPerStep) * step;
}

export function clampRulerOffset(
  offset: number,
  min: number,
  max: number,
  step: number,
  pxPerStep: number,
): number {
  const atMin = rulerOffsetForValue(min, min, step, pxPerStep);
  const atMax = rulerOffsetForValue(max, min, step, pxPerStep);
  const lo = Math.min(atMin, atMax);
  const hi = Math.max(atMin, atMax);
  return Math.min(hi, Math.max(lo, offset));
}
