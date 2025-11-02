/**
 * Utilitários para cálculo da curva de peso esperada no tratamento
 * Engine calibrada com âncoras clínicas baseadas em prática real de tirzepatida
 */

// ---------- Tipos ----------
export type TargetType = 'PERCENTUAL' | 'PESO_ABSOLUTO';
export type ExpectedModel = 'PIECEWISE' | 'LINEAR';
export type DoseStep = { weekIndex: number; doseMg: number };

export interface CarePlan {
  startDate: string;
  baselineWeightKg: number;
  targetType: TargetType;
  targetValue: number;
  targetWeeks: number;
  expectedModel: ExpectedModel;
  doseSchedule: DoseStep[];
}

export interface ExpectedWeek {
  weekIndex: number;
  expectedWeightKg: number;
  expectedCumulativePct?: number;
  doseMg?: number;
}

// ---------- Parâmetros base ----------
export const DOSE_STEPS_DEFAULT: number[] = [2.5, 5, 7.5, 10, 12.5, 15];
export const FOUR_WEEKS = 4;
export const defaultCeilingTotalPct = 22;

// Ritmo de perda semanal por dose (% do peso inicial/semana)
export const baseLossPctByDose: Record<number, number> = {
  2.5: 0.30,
  5:   0.50,
  7.5: 0.70,
  10:  0.85,
  12.5:0.95,
  15:  1.05
};

// Nas 4 semanas seguintes a cada upgrade, aplicar 80% do ritmo alvo (adaptação GI)
export const rampFactorFirst4Weeks = 0.8;

// Âncoras clínicas (perda acumulada alvo em % na semana)
export const anchorTargets = {
  w12_pct: { min: 5,  max: 8,  target: 6.5 },
  w18_pct: { min: 8,  max: 10, target: 9.0 },  // alvo principal
  w24_pct: { min: 10, max: 15, target: 12.5 },
  w52_pct: { min: 18, max: 22, target: 20.0 }
};

// Modelo Emax para HbA1c por dose
const EMAX_BY_DOSE: Record<number, number> = {
  2.5: 0.6,   // % HbA1c
  5:   0.9,
  7.5: 1.2,
  10:  1.5,
  12.5:1.7,
  15:  2.0
};

// ---------- Dose schedule sugerido (4/4 semanas) ----------
export function buildSuggestedDoseSchedule(
  startWeek = 1,
  steps: number[] = DOSE_STEPS_DEFAULT,
  intervalWeeks = FOUR_WEEKS
): DoseStep[] {
  const out: DoseStep[] = [];
  let w = startWeek;
  
  for (let i = 0; i < steps.length; i++) {
    out.push({ weekIndex: w, doseMg: steps[i] });
    if (i < steps.length - 1) w += intervalWeeks;
  }
  
  return out;
}

// ---------- Funções auxiliares ----------
function getDoseForWeek(doseSchedule: DoseStep[], w: number): number {
  let current = doseSchedule[0]?.doseMg ?? 2.5;
  for (const step of doseSchedule) {
    if (w >= step.weekIndex) current = step.doseMg;
    else break;
  }
  return current;
}

function weeksSinceDoseChange(doseSchedule: DoseStep[], w: number): number {
  let lastChange = doseSchedule[0]?.weekIndex ?? 1;
  for (const step of doseSchedule) {
    if (w >= step.weekIndex) lastChange = step.weekIndex;
    else break;
  }
  return w - lastChange + 1;
}

// ---------- Construção de curva não normalizada (peso) ----------
function buildUnnormalizedCurve(params: {
  baselineWeightKg: number;
  doseSchedule: DoseStep[];
  totalWeeks: number;
  ceilingTotalPct: number;
}) {
  const { baselineWeightKg, doseSchedule, totalWeeks, ceilingTotalPct } = params;
  let cumulativePct = 0;
  const arr: { weekIndex: number; cumulativePct: number; doseMg: number }[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const dose = getDoseForWeek(doseSchedule, w);
    const basePct = baseLossPctByDose[dose] ?? baseLossPctByDose[2.5];
    const since = weeksSinceDoseChange(doseSchedule, w);
    const weeklyPct = since <= 4 ? basePct * rampFactorFirst4Weeks : basePct;

    cumulativePct = Math.min(ceilingTotalPct, cumulativePct + weeklyPct);
    arr.push({ weekIndex: w, cumulativePct, doseMg: dose });
  }
  return arr;
}

// ---------- Normalização com âncora ----------
function computeNormalizationFactor(unNorm: {weekIndex: number; cumulativePct: number}[], anchorWeek: number, anchorPctTarget: number) {
  const anchor = unNorm.find(x => x.weekIndex === anchorWeek);
  if (!anchor || anchor.cumulativePct === 0) return 1;
  return anchorPctTarget / anchor.cumulativePct;
}

// ---------- Curva final (peso), aplicando âncora (18s=~9%) ----------
export function buildExpectedCurveDoseDrivenAnchored(params: {
  baselineWeightKg: number;
  doseSchedule: DoseStep[];
  totalWeeks: number;
  targetType?: TargetType;
  targetValue?: number;
  useAnchorWeek?: number;
  useAnchorPct?: number;
  ceilingTotalPct?: number;
}): ExpectedWeek[] {
  const {
    baselineWeightKg,
    doseSchedule,
    totalWeeks,
    targetType,
    targetValue,
    useAnchorWeek = 18,
    useAnchorPct = anchorTargets.w18_pct.target,
    ceilingTotalPct = defaultCeilingTotalPct
  } = params;

  // Se houver meta explícita, use-a como cap preferencial
  const explicitCapPct = targetType === 'PESO_ABSOLUTO'
    ? (100 * (targetValue ?? 0)) / baselineWeightKg
    : (targetValue ?? 0);

  const capPct = Math.max(0, explicitCapPct > 0 ? explicitCapPct : ceilingTotalPct);

  // 1) Curva não normalizada
  const unNorm = buildUnnormalizedCurve({
    baselineWeightKg,
    doseSchedule,
    totalWeeks,
    ceilingTotalPct: capPct
  });

  // 2) Normalização p/ bater na âncora (ex.: 18s => 9%)
  const norm = computeNormalizationFactor(unNorm, useAnchorWeek, useAnchorPct);

  // 3) Aplicar normalização e montar saída
  const out: ExpectedWeek[] = [];
  for (const w of unNorm) {
    const pct = Math.min(capPct, w.cumulativePct * norm);
    const expectedWeightKg = Number((baselineWeightKg * (1 - pct / 100)).toFixed(1));
    out.push({
      weekIndex: w.weekIndex,
      expectedWeightKg,
      expectedCumulativePct: Number(pct.toFixed(2)),
      doseMg: getDoseForWeek(doseSchedule, w.weekIndex)
    });
  }
  return out;
}

// ---------- HbA1c prevista (modelo Emax temporal) ----------
export function predictHbA1c(params: {
  baselineHbA1c: number;
  weekIndex: number;
  doseAchievedMg: number;
  k?: number;
}): number {
  const { baselineHbA1c, weekIndex, doseAchievedMg, k = 0.12 } = params;
  const emax = EMAX_BY_DOSE[doseAchievedMg] ?? 0.8;
  const reduction = emax * (1 - Math.exp(-k * weekIndex));
  const predicted = Math.max(4.8, Number((baselineHbA1c - reduction).toFixed(2)));
  return predicted;
}

// ---------- Cintura prevista (linear vs. % perda de peso) ----------
export function predictWaistCircumference(params: {
  baselineWaistCm: number;
  cumulativeWeightLossPct: number;
  alpha?: number;
  floorCm?: number;
}): number {
  const { baselineWaistCm, cumulativeWeightLossPct, alpha = 0.9, floorCm } = params;
  const deltaCm = alpha * cumulativeWeightLossPct;
  const predicted = baselineWaistCm - deltaCm;
  const clamped = floorCm ? Math.max(floorCm, predicted) : predicted;
  return Number(clamped.toFixed(1));
}

// ---------- Método legacy para compatibilidade ----------
export function buildExpectedCurve(plan: CarePlan): ExpectedWeek[] {
  const { baselineWeightKg, targetType, targetValue, targetWeeks, doseSchedule } = plan;
  
  // Se tem doseSchedule, usar modelo dose-driven anchored
  if (doseSchedule && doseSchedule.length > 0) {
    return buildExpectedCurveDoseDrivenAnchored({
      baselineWeightKg,
      doseSchedule,
      totalWeeks: targetWeeks,
      targetType,
      targetValue
    });
  }
  
  // Fallback para modelo PIECEWISE
  const metaKg = targetType === 'PESO_ABSOLUTO'
    ? targetValue
    : baselineWeightKg * (targetValue / 100);
  
  const curve: ExpectedWeek[] = [];
  
  for (let w = 1; w <= targetWeeks; w++) {
    let pctLoss = 0;
    
    if (w <= 4) {
      pctLoss = 0.0025 * w;
    } else if (w <= 12) {
      pctLoss = 0.01 + (w - 4) * 0.006;
    } else {
      pctLoss = 0.058 + (w - 12) * 0.004;
    }
    
    const totalPct = Math.min(pctLoss, targetValue / 100);
    const expectedWeight = baselineWeightKg * (1 - totalPct);
    
    curve.push({ 
      weekIndex: w, 
      expectedWeightKg: parseFloat(expectedWeight.toFixed(1))
    });
  }
  
  return curve;
}

// ---------- Variância e status ----------
export function varianceKg(actual: number | null, expected: number): number | null {
  if (actual == null) return null;
  return Number((actual - expected).toFixed(1));
}

export function varianceStatus(deltaKg: number | null): 'GREEN' | 'YELLOW' | 'RED' | 'NA' {
  if (deltaKg == null) return 'NA';
  const a = Math.abs(deltaKg);
  if (a <= 0.3) return 'GREEN';
  if (a <= 1.0) return 'YELLOW';
  return 'RED';
}

// ---------- Obtém as classes CSS de cor baseado no status de variância ----------
export function getVarianceColorClasses(status: 'GREEN' | 'YELLOW' | 'RED' | 'NA'): string {
  switch (status) {
    case 'GREEN':
      return 'bg-emerald-100 text-emerald-700';
    case 'YELLOW':
      return 'bg-amber-100 text-amber-700';
    case 'RED':
      return 'bg-rose-100 text-rose-700';
    case 'NA':
      return 'bg-gray-100 text-gray-500';
  }
}
