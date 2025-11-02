// Tipos para KPIs e Indicadores do Sistema META
// Paciente, Coorte e Segurança

// KPIs no nível do paciente (snapshot por semana)
export type PatientKPI = {
  patientId: string;
  weekIndex: number;
  
  // Peso e metas
  baselineWeightKg: number;
  expectedWeightKg: number;
  actualWeightKg: number | null;
  lossPctExpected: number;   // 100 * (baseline - expected) / baseline
  lossPctActual: number | null; // idem usando actual
  varianceKg: number | null; // actual - expected
  varianceStatus: 'GREEN' | 'YELLOW' | 'RED' | 'NA';
  
  // Adesão e dose
  adherence: 'ON_TIME' | 'LATE_<96H' | 'MISSED';
  doseAppliedMg: number | 'NAO_APLICOU';
  weeksOnCurrentDose: number;
  
  // Sintomas e segurança
  giSeverity?: 'LEVE' | 'MODERADO' | 'GRAVE';
  activeAlerts: string[]; // AlertType[]
  blockedForUpgrade: boolean;
  
  // Metabólicos
  predictedHbA1c?: number; // opcional se não for DM2
  predictedWaistCm?: number;
  
  // Pressão arterial (se disponível no follow-up)
  bpSystolic?: number;
  bpDiastolic?: number;
};

// KPIs agregados da coorte (rolling 4/12/24/52 semanas)
export type CohortKPI = {
  refDateISO: string;
  patientsTotal: number;
  activePatients: number;
  
  // Eficácia
  pctAchieved_5_12w: number;   // % pacientes com ≥5% em 12s
  pctAchieved_10_24w: number;  // % pacientes com ≥10% em 24s
  pctAchieved_15_52w: number;  // % pacientes com ≥15% em 52s
  avgLossPct_12w: number;
  avgLossPct_24w: number;
  avgLossPct_52w: number;
  
  // Adesão
  adherenceRate_4w: number;    // % semanas ON_TIME nas últimas 4 semanas
  missedDoseRate_4w: number;   // % semanas MISSED nas últimas 4
  
  // Segurança
  alertsPerPatient_4w: number;
  criticalAlertRate_4w: number; // % com ≥1 alerta CRITICAL nas últimas 4
  medianAlertTimeToResolve_h: number;
  
  // Engajamento
  followUpOnTimeRate_4w: number; // % follow-ups registrados no prazo
  msgMedianResponseTime_h: number; // tempo mediano de resposta do médico
};

// KPIs de segurança (monitor)
export type SafetyKPI = {
  windowWeeks: number;          // ex.: 4
  totalAlerts: number;
  giSevere: number;
  pregnancyFlags: number;
  pancreatitisSuspected: number;
  renalDecline: number;
  men2Risk: number;
  blockersActive: number;       // nº pacientes com upgrade bloqueado
};

// Métricas de âncora clínica
export const anchors = {
  w12_min: 5, w12_opt: 7, w12_max: 8,
  w18_min: 8, w18_opt: 9, w18_max: 10,
  w24_min: 10, w24_opt: 12.5, w24_max: 15,
  w52_min: 18, w52_opt: 20, w52_max: 22
};

// Status de variância para semáforo
export type VarianceStatus = 'GREEN' | 'YELLOW' | 'RED' | 'NA';

