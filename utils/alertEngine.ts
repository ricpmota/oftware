/**
 * Alert Engine para monitoramento automático de tratamento com tirzepatida
 * Gera alertas clínicos baseados em parâmetros de adesão, sintomas GI, gravidez, exames, etc.
 */

import { Alerta } from '@/types/obesidade';

export interface AlertEngineParams {
  adherence?: 'ON_TIME' | 'LATE_<96H' | 'MISSED';
  giSeverity?: 'LEVE' | 'MODERADO' | 'GRAVE';
  pregnancy?: boolean;
  calcitonin?: number;
  sex?: 'M' | 'F';
  lipase?: number;
  amylase?: number;
  eGFR?: number;
  prev_eGFR?: number;
  weekIndex?: number;
}

const ALERTA_CONFIG: Record<string, { descricao: string; gravidade: 'INFO' | 'MODERATE' | 'CRITICAL' }> = {
  MISSED_DOSE: {
    descricao: 'Dose não aplicada',
    gravidade: 'MODERATE'
  },
  GI_MILD: {
    descricao: 'Efeitos gastrointestinais leves',
    gravidade: 'INFO'
  },
  GI_SEVERE: {
    descricao: 'Efeitos gastrointestinais graves',
    gravidade: 'CRITICAL'
  },
  PREGNANCY_FLAG: {
    descricao: 'Gravidez detectada ou lactação',
    gravidade: 'CRITICAL'
  },
  MEN2_RISK: {
    descricao: 'Risco de carcinoma medular de tireoide (MEN2)',
    gravidade: 'CRITICAL'
  },
  PANCREATITIS_SUSPECTED: {
    descricao: 'Pancreatite suspeita',
    gravidade: 'CRITICAL'
  },
  RENAL_DECLINE: {
    descricao: 'Declínio da função renal',
    gravidade: 'CRITICAL'
  },
  HYPOGLYCEMIA_RISK: {
    descricao: 'Risco de hipoglicemia',
    gravidade: 'MODERATE'
  },
  LAB_ABNORMAL: {
    descricao: 'Exame laboratorial alterado',
    gravidade: 'MODERATE'
  },
  EDEMA_SEVERE: {
    descricao: 'Edema grave',
    gravidade: 'CRITICAL'
  },
  TECHNICAL_EVENT: {
    descricao: 'Evento técnico/instrumental',
    gravidade: 'INFO'
  }
};

export function alertEngine(params: AlertEngineParams): Alerta[] {
  const alertas: Alerta[] = [];
  const { adherence, giSeverity, pregnancy, calcitonin, sex, lipase, amylase, eGFR, prev_eGFR, weekIndex } = params;

  // MISSED_DOSE
  if (adherence === 'MISSED') {
    alertas.push({
      id: `alert-${Date.now()}-missed`,
      type: 'MISSED_DOSE',
      description: ALERTA_CONFIG.MISSED_DOSE.descricao,
      severity: ALERTA_CONFIG.MISSED_DOSE.gravidade,
      status: 'ACTIVE',
      generatedAt: new Date(),
      linkedWeek: weekIndex,
      followUpRequired: true
    });
  }

  // GI_MILD
  if (giSeverity === 'LEVE') {
    alertas.push({
      id: `alert-${Date.now()}-gi-mild`,
      type: 'GI_MILD',
      description: ALERTA_CONFIG.GI_MILD.descricao,
      severity: ALERTA_CONFIG.GI_MILD.gravidade,
      status: 'ACTIVE',
      generatedAt: new Date(),
      linkedWeek: weekIndex,
      followUpRequired: false
    });
  }

  // GI_SEVERE
  if (giSeverity === 'MODERADO' || giSeverity === 'GRAVE') {
    alertas.push({
      id: `alert-${Date.now()}-gi-severe`,
      type: 'GI_SEVERE',
      description: ALERTA_CONFIG.GI_SEVERE.descricao,
      severity: ALERTA_CONFIG.GI_SEVERE.gravidade,
      status: 'ACTIVE',
      generatedAt: new Date(),
      linkedWeek: weekIndex,
      followUpRequired: true
    });
  }

  // PREGNANCY_FLAG
  if (pregnancy === true) {
    alertas.push({
      id: `alert-${Date.now()}-pregnancy`,
      type: 'PREGNANCY_FLAG',
      description: ALERTA_CONFIG.PREGNANCY_FLAG.descricao,
      severity: ALERTA_CONFIG.PREGNANCY_FLAG.gravidade,
      status: 'ACTIVE',
      generatedAt: new Date(),
      linkedWeek: weekIndex,
      followUpRequired: true
    });
  }

  // MEN2_RISK
  if (calcitonin !== undefined && sex) {
    const threshold = sex === 'M' ? 10 : 5;
    if (calcitonin > threshold) {
      alertas.push({
        id: `alert-${Date.now()}-men2`,
        type: 'MEN2_RISK',
        description: `${ALERTA_CONFIG.MEN2_RISK.descricao}: calcitonina ${calcitonin} pg/mL (limite: ${threshold})`,
        severity: ALERTA_CONFIG.MEN2_RISK.gravidade,
        status: 'ACTIVE',
        generatedAt: new Date(),
        linkedWeek: weekIndex,
        followUpRequired: true
      });
    }
  }

  // PANCREATITIS_SUSPECTED
  if ((lipase !== undefined && lipase > 180) || (amylase !== undefined && amylase > 330)) {
    alertas.push({
      id: `alert-${Date.now()}-pancreatitis`,
      type: 'PANCREATITIS_SUSPECTED',
      description: `${ALERTA_CONFIG.PANCREATITIS_SUSPECTED.descricao}: ${lipase ? `Lipase: ${lipase} U/L` : ''}${lipase && amylase ? ', ' : ''}${amylase ? `Amilase: ${amylase} U/L` : ''}`,
      severity: ALERTA_CONFIG.PANCREATITIS_SUSPECTED.gravidade,
      status: 'ACTIVE',
      generatedAt: new Date(),
      linkedWeek: weekIndex,
      followUpRequired: true
    });
  }

  // RENAL_DECLINE
  if (eGFR !== undefined) {
    let shouldAlert = false;
    
    // eGFR < 15 mL/min
    if (eGFR < 15) {
      shouldAlert = true;
    }
    
    // Queda ≥ 30% do valor anterior
    if (prev_eGFR && eGFR < prev_eGFR * 0.7) {
      shouldAlert = true;
    }
    
    if (shouldAlert) {
      alertas.push({
        id: `alert-${Date.now()}-renal`,
        type: 'RENAL_DECLINE',
        description: `${ALERTA_CONFIG.RENAL_DECLINE.descricao}: eGFR ${eGFR} mL/min/1,73m²${prev_eGFR ? ` (anterior: ${prev_eGFR})` : ''}`,
        severity: ALERTA_CONFIG.RENAL_DECLINE.gravidade,
        status: 'ACTIVE',
        generatedAt: new Date(),
        linkedWeek: weekIndex,
        followUpRequired: true
      });
    }
  }

  return alertas;
}

/**
 * Verifica se existe algum alerta ativo que bloqueia o avanço de dose
 */
export const DOSE_BLOCKER_TYPES: string[] = [
  'MEN2_RISK',
  'PREGNANCY_FLAG',
  'GI_SEVERE',
  'PANCREATITIS_SUSPECTED',
  'RENAL_DECLINE',
  'LAB_ABNORMAL'
];

export function isDoseUpgradeBlocked(alertas: Alerta[]): boolean {
  return alertas.some(alerta => 
    alerta.status === 'ACTIVE' && DOSE_BLOCKER_TYPES.includes(alerta.type)
  );
}

/**
 * Obtém a descrição da ação sugerida para cada tipo de alerta
 */
export function getSuggestedAction(alertType: string): string {
  switch (alertType) {
    case 'MISSED_DOSE':
      return 'Reforçar adesão e reagendar aplicação.';
    case 'GI_MILD':
      return 'Hidratação e dieta leve.';
    case 'GI_SEVERE':
      return 'Pausar dose, avaliar pancreatite.';
    case 'PREGNANCY_FLAG':
      return 'Suspender tratamento, comunicar obstetra.';
    case 'MEN2_RISK':
      return 'Suspender e investigar tireoide.';
    case 'PANCREATITIS_SUSPECTED':
      return 'Suspender imediatamente e investigar.';
    case 'RENAL_DECLINE':
      return 'Suspender e encaminhar nefrologia.';
    case 'LAB_ABNORMAL':
      return 'Revisar exames e interações.';
    case 'EDEMA_SEVERE':
      return 'Avaliar IC e suspender se necessário.';
    case 'TECHNICAL_EVENT':
      return 'Registrar falha e substituir caneta.';
    default:
      return 'Revisar caso clínico.';
  }
}

/**
 * Obtém o ícone Lucide React apropriado para cada tipo de alerta
 */
export function getAlertIcon(severity: 'INFO' | 'MODERATE' | 'CRITICAL'): string {
  switch (severity) {
    case 'INFO':
      return 'Info';
    case 'MODERATE':
      return 'AlertTriangle';
    case 'CRITICAL':
      return 'AlertCircle';
    default:
      return 'AlertTriangle';
  }
}

/**
 * Obtém as classes CSS para cada severidade
 */
export function getSeverityClasses(severity: 'INFO' | 'MODERATE' | 'CRITICAL'): string {
  switch (severity) {
    case 'INFO':
      return 'bg-blue-50 border-blue-200 text-blue-700';
    case 'MODERATE':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'CRITICAL':
      return 'bg-red-50 border-red-200 text-red-700';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700';
  }
}

