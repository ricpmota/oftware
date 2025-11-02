/**
 * Utilitários para cálculo da curva de peso esperada no tratamento
 * Meta sugerida por "boas práticas": subir dose a cada 4 semanas até 15 mg
 */

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

// Configuração padrão de titulação
export const DOSE_STEPS_DEFAULT: number[] = [2.5, 5, 7.5, 10, 12.5, 15];
export const FOUR_WEEKS = 4;
export const defaultCeilingTotalPct = 22;

// Ritmo de perda semanal estimado por dose (% do peso inicial/semana)
export const expectedLossPctByDose: Record<number, number> = {
  2.5: 0.25,
  5: 0.40,
  7.5: 0.55,
  10: 0.65,
  12.5: 0.70,
  15: 0.75
};

// Nas 4 semanas seguintes a cada upgrade, aplicar 60% do ritmo alvo (adaptação GI)
export const rampFactorFirst4Weeks = 0.6;

/**
 * Constrói schedule de doses sugerido (2.5 → 5 → 7.5 → 10 → 12.5 → 15)
 */
export function buildSuggestedDoseSchedule(
  startWeek = 1,
  steps: number[] = DOSE_STEPS_DEFAULT,
  intervalWeeks = FOUR_WEEKS
): DoseStep[] {
  const out: DoseStep[] = [];
  let w = startWeek;
  
  for (let i = 0; i < steps.length; i++) {
    out.push({ weekIndex: w, doseMg: steps[i] });
    if (i < steps.length - 1) w += intervalWeeks; // sobe a cada 4 semanas
  }
  
  return out;
}

/**
 * Calcula curva prevista dose-dependente com rampa nas 4 semanas pós-upgrade
 */
export function buildExpectedCurveDoseDriven(params: {
  baselineWeightKg: number;
  doseSchedule: DoseStep[];
  totalWeeks: number;
  targetType?: TargetType;
  targetValue?: number;
  ceilingTotalPct?: number;
}): ExpectedWeek[] {
  const {
    baselineWeightKg,
    doseSchedule,
    totalWeeks,
    targetType,
    targetValue,
    ceilingTotalPct = defaultCeilingTotalPct
  } = params;

  // Meta em %
  const targetTotalPct = targetType === 'PESO_ABSOLUTO'
    ? (100 * (targetValue ?? 0)) / baselineWeightKg
    : (targetValue ?? 0);

  const capPct = Math.max(0, targetTotalPct > 0 ? targetTotalPct : ceilingTotalPct);

  // Pega dose atual para semana w
  const getDoseForWeek = (w: number): number => {
    let current = doseSchedule[0]?.doseMg ?? 2.5;
    for (const step of doseSchedule) {
      if (w >= step.weekIndex) current = step.doseMg;
      else break;
    }
    return current;
  };

  // Conta semanas desde última mudança de dose
  const weeksSinceDoseChange = (w: number): number => {
    let lastChange = doseSchedule[0]?.weekIndex ?? 1;
    for (const step of doseSchedule) {
      if (w >= step.weekIndex) lastChange = step.weekIndex;
      else break;
    }
    return w - lastChange + 1;
  };

  let cumulativePct = 0;
  const out: ExpectedWeek[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const dose = getDoseForWeek(w);
    const basePct = expectedLossPctByDose[dose] ?? expectedLossPctByDose[2.5];
    const since = weeksSinceDoseChange(w);

    // Nas 4 primeiras semanas após upgrade, usar 60% do ritmo (adaptação GI)
    const weeklyPct = since <= 4 ? basePct * rampFactorFirst4Weeks : basePct;

    cumulativePct = Math.min(capPct, cumulativePct + weeklyPct);

    const expectedWeightKg = Number((baselineWeightKg * (1 - cumulativePct / 100)).toFixed(1));

    out.push({
      weekIndex: w,
      expectedWeightKg,
      expectedCumulativePct: Number(cumulativePct.toFixed(2)),
      doseMg: dose
    });
  }

  return out;
}

/**
 * Método legacy para compatibilidade
 */
export function buildExpectedCurve(plan: CarePlan): ExpectedWeek[] {
  const { baselineWeightKg, targetType, targetValue, targetWeeks, doseSchedule } = plan;
  
  // Se tem doseSchedule, usar modelo dose-driven
  if (doseSchedule && doseSchedule.length > 0) {
    return buildExpectedCurveDoseDriven({
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

/**
 * Meta sugerida padrão de 52 semanas
 */
export function buildSuggestedGoalCurve(baselineWeightKg: number, totalWeeks = 52): ExpectedWeek[] {
  const schedule = buildSuggestedDoseSchedule(1, DOSE_STEPS_DEFAULT, FOUR_WEEKS);
  return buildExpectedCurveDoseDriven({
    baselineWeightKg,
    doseSchedule: schedule,
    totalWeeks
  });
}

/**
 * Calcula variância em kg
 */
export function varianceKg(actual: number | null, expected: number): number | null {
  if (actual == null) return null;
  return Number((actual - expected).toFixed(1));
}

/**
 * Classifica o desvio do peso em relação ao esperado
 */
export function varianceStatus(deltaKg: number | null): 'GREEN' | 'YELLOW' | 'RED' | 'NA' {
  if (deltaKg == null) return 'NA';
  const a = Math.abs(deltaKg);
  if (a <= 0.3) return 'GREEN';
  if (a <= 1.0) return 'YELLOW';
  return 'RED';
}

/**
 * Obtém as classes CSS de cor baseado no status de variância
 */
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

