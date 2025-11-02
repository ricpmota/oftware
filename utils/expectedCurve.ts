/**
 * Utilitários para cálculo da curva de peso esperada no tratamento
 */

export type TargetType = 'PERCENTUAL' | 'PESO_ABSOLUTO';
export type ExpectedModel = 'PIECEWISE' | 'LINEAR';

export interface CarePlan {
  startDate: string;
  baselineWeightKg: number;
  targetType: TargetType;
  targetValue: number;
  targetWeeks: number;
  expectedModel: ExpectedModel;
  doseSchedule: { weekIndex: number; doseMg: number }[];
}

export interface ExpectedWeek {
  weekIndex: number;
  expectedWeightKg: number;
}

/**
 * Calcula a curva de peso esperada por semana com base no plano terapêutico
 */
export function buildExpectedCurve(plan: CarePlan): ExpectedWeek[] {
  const { baselineWeightKg, targetType, targetValue, targetWeeks, expectedModel } = plan;
  
  const metaKg = targetType === 'PESO_ABSOLUTO'
    ? targetValue
    : baselineWeightKg * (targetValue / 100);
  
  const curve: ExpectedWeek[] = [];
  
  for (let w = 1; w <= targetWeeks; w++) {
    let expectedWeight = baselineWeightKg;
    
    if (expectedModel === 'LINEAR') {
      expectedWeight = baselineWeightKg - (metaKg / targetWeeks) * w;
    } else {
      // Curva piecewise aproximada
      let pctLoss = 0;
      
      if (w <= 4) {
        // Semanas 1-4: 0.25%/sem (fase de adaptação)
        pctLoss = 0.0025 * w;
      } else if (w <= 12) {
        // Semanas 5-12: 0.6%/sem (fase de resposta)
        pctLoss = 0.01 + (w - 4) * 0.006;
      } else {
        // Semanas 13+: 0.4%/sem (fase de consolidação)
        pctLoss = 0.058 + (w - 12) * 0.004;
      }
      
      const totalPct = Math.min(pctLoss, targetValue / 100);
      expectedWeight = baselineWeightKg * (1 - totalPct);
    }
    
    curve.push({ 
      weekIndex: w, 
      expectedWeightKg: parseFloat(expectedWeight.toFixed(1))
    });
  }
  
  return curve;
}

/**
 * Classifica o desvio do peso em relação ao esperado
 */
export function varianceStatus(varianceKg: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (Math.abs(varianceKg) <= 0.3) return 'GREEN';
  if (Math.abs(varianceKg) <= 1.0) return 'YELLOW';
  return 'RED';
}

/**
 * Obtém as classes CSS de cor baseado no status de variância
 */
export function getVarianceColorClasses(status: 'GREEN' | 'YELLOW' | 'RED'): string {
  switch (status) {
    case 'GREEN':
      return 'bg-emerald-100 text-emerald-700';
    case 'YELLOW':
      return 'bg-amber-100 text-amber-700';
    case 'RED':
      return 'bg-rose-100 text-rose-700';
  }
}

