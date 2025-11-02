// Funções de cálculo de KPIs e Indicadores
import { PatientKPI, CohortKPI, SafetyKPI, VarianceStatus } from '@/types/indicadores';

/**
 * Calcular percentual de perda de peso
 * @param baseline Peso inicial (kg)
 * @param weight Peso atual (kg) ou null
 * @returns Percentual de perda ou null
 */
export function calcLossPct(baseline: number, weight: number | null): number | null {
  if (weight == null) return null;
  return Number(((baseline - weight) / baseline * 100).toFixed(1));
}

/**
 * Calcular variância em kg (peso real - esperado)
 * @param actual Peso real (kg) ou null
 * @param expected Peso esperado (kg)
 * @returns Variância em kg ou null
 */
export function calcVarianceKg(actual: number | null, expected: number): number | null {
  if (actual == null) return null;
  return Number((actual - expected).toFixed(1));
}

/**
 * Determinar status de variância baseado na diferença em kg
 * @param deltaKg Diferença entre real e esperado (kg)
 * @returns Status do semáforo
 */
export function varianceStatus(deltaKg: number | null): VarianceStatus {
  if (deltaKg == null) return 'NA';
  const a = Math.abs(deltaKg);
  if (a <= 0.3) return 'GREEN';
  if (a <= 1.0) return 'YELLOW';
  return 'RED';
}

/**
 * Mapear status de adesão para texto legível
 */
export function adherenceLabel(adherence: 'ON_TIME' | 'LATE_<96H' | 'MISSED'): string {
  switch (adherence) {
    case 'ON_TIME': return 'Pontual';
    case 'LATE_<96H': return 'Atrasado (< 96h)';
    case 'MISSED': return 'Esquecida';
    default: return 'N/A';
  }
}

/**
 * Mapear status de severidade GI para texto legível
 */
export function giSeverityLabel(severity: 'LEVE' | 'MODERADO' | 'GRAVE'): string {
  switch (severity) {
    case 'LEVE': return 'Leve';
    case 'MODERADO': return 'Moderado';
    case 'GRAVE': return 'Grave';
    default: return 'N/A';
  }
}

/**
 * Calcular estatísticas de coorte a partir de pacientes
 */
export function aggregateCohortKPIs(patients: {
  patientId: string;
  baselineWeightKg: number;
  weightAt12w?: number;
  weightAt24w?: number;
  weightAt52w?: number;
  adherenceWeeks4: ('ON_TIME' | 'LATE_<96H' | 'MISSED')[];
  alertsLast4w: { severity: 'INFO' | 'MODERATE' | 'CRITICAL'; resolvedAt?: string; generatedAt: string }[];
  followUpOnTimeFlags4w: boolean[];
  msgResponseTimesHours?: number[];
}[]): CohortKPI {
  const patientsTotal = patients.length;
  const activePatients = patientsTotal;

  // Função auxiliar para calcular percentual
  const toPct = (n: number, d: number) => Number(((n / (d || 1)) * 100).toFixed(0));

  // Função auxiliar para calcular perda percentual
  const getLossPct = (b: number, w?: number) => w ? ((b - w) / b * 100) : 0;

  // Eficácia: contagem de pacientes que alcançaram metas
  const achieved_5_12w = patients.filter(p => getLossPct(p.baselineWeightKg, p.weightAt12w) >= 5).length;
  const achieved_10_24w = patients.filter(p => getLossPct(p.baselineWeightKg, p.weightAt24w) >= 10).length;
  const achieved_15_52w = patients.filter(p => getLossPct(p.baselineWeightKg, p.weightAt52w) >= 15).length;

  // Função auxiliar para calcular média
  const avg = (arr: number[]) => arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

  const avgLossPct_12w = avg(patients.map(p => getLossPct(p.baselineWeightKg, p.weightAt12w)));
  const avgLossPct_24w = avg(patients.map(p => getLossPct(p.baselineWeightKg, p.weightAt24w)));
  const avgLossPct_52w = avg(patients.map(p => getLossPct(p.baselineWeightKg, p.weightAt52w)));

  // Adesão: média de ON_TIME nas últimas 4 semanas
  const adherenceRate_4w = avg(patients.map(p => {
    const on = p.adherenceWeeks4.filter(s => s === 'ON_TIME').length;
    return toPct(on, p.adherenceWeeks4.length);
  }));

  // Taxa de esquecimento nas últimas 4 semanas
  const missedDoseRate_4w = avg(patients.map(p => {
    const miss = p.adherenceWeeks4.filter(s => s === 'MISSED').length;
    return toPct(miss, p.adherenceWeeks4.length);
  }));

  // Segurança: alertas
  const alerts = patients.flatMap(p => p.alertsLast4w);
  const alertsPerPatient_4w = Number((alerts.length / (patientsTotal || 1)).toFixed(1));
  const criticalAlertRate_4w = toPct(alerts.filter(a => a.severity === 'CRITICAL').length, alerts.length);

  // Tempo mediano de resolução de alertas (horas)
  const times = alerts
    .filter(a => a.resolvedAt)
    .map(a => (new Date(a.resolvedAt!).getTime() - new Date(a.generatedAt).getTime()) / 36e5)
    .sort((x, y) => x - y);

  const mid = Math.floor(times.length / 2);
  const medianAlertTimeToResolve_h = times.length 
    ? (times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2) 
    : 0;

  // Engajamento: follow-ups pontuais
  const followUpOnTimeRate_4w = avg(patients.map(p => 
    toPct(p.followUpOnTimeFlags4w.filter(Boolean).length, p.followUpOnTimeFlags4w.length)
  ));

  // Tempo mediano de resposta do médico (horas)
  const msgMedianResponseTime_h = (() => {
    const arr = (patients.flatMap(p => p.msgResponseTimesHours || [])).sort((a, b) => a - b);
    const m = Math.floor(arr.length / 2);
    return arr.length ? (arr.length % 2 ? arr[m] : (arr[m - 1] + arr[m]) / 2) : 0;
  })();

  return {
    refDateISO: new Date().toISOString(),
    patientsTotal,
    activePatients,
    pctAchieved_5_12w: toPct(achieved_5_12w, patientsTotal),
    pctAchieved_10_24w: toPct(achieved_10_24w, patientsTotal),
    pctAchieved_15_52w: toPct(achieved_15_52w, patientsTotal),
    avgLossPct_12w,
    avgLossPct_24w,
    avgLossPct_52w,
    adherenceRate_4w,
    missedDoseRate_4w,
    alertsPerPatient_4w,
    criticalAlertRate_4w,
    medianAlertTimeToResolve_h: Number(medianAlertTimeToResolve_h.toFixed(1)),
    followUpOnTimeRate_4w,
    msgMedianResponseTime_h: Number(msgMedianResponseTime_h.toFixed(1))
  };
}

/**
 * Calcular métricas de segurança por janela de tempo
 */
export function calculateSafetyKPIs(
  windowWeeks: number,
  alerts: { severity: 'INFO' | 'MODERATE' | 'CRITICAL'; type: string; resolvedAt?: string }[],
  blockedPatients: number
): SafetyKPI {
  const giSevere = alerts.filter(a => a.type === 'GI_SEVERE').length;
  const pregnancyFlags = alerts.filter(a => a.type === 'PREGNANCY_FLAG').length;
  const pancreatitisSuspected = alerts.filter(a => a.type === 'PANCREATITIS_SUSPECTED').length;
  const renalDecline = alerts.filter(a => a.type === 'RENAL_DECLINE').length;
  const men2Risk = alerts.filter(a => a.type === 'MEN2_RISK').length;

  return {
    windowWeeks,
    totalAlerts: alerts.length,
    giSevere,
    pregnancyFlags,
    pancreatitisSuspected,
    renalDecline,
    men2Risk,
    blockersActive: blockedPatients
  };
}

/**
 * Mapear status para cores (Tailwind CSS)
 */
export function getStatusColor(status: VarianceStatus): string {
  switch (status) {
    case 'GREEN': return 'text-emerald-600 bg-emerald-50';
    case 'YELLOW': return 'text-amber-600 bg-amber-50';
    case 'RED': return 'text-rose-600 bg-rose-50';
    case 'NA': return 'text-slate-600 bg-slate-50';
  }
}

/**
 * Obter rótulo de status
 */
export function getStatusLabel(status: VarianceStatus): string {
  switch (status) {
    case 'GREEN': return 'Excelente';
    case 'YELLOW': return 'Atentar';
    case 'RED': return 'Crítico';
    case 'NA': return 'Sem dados';
  }
}

