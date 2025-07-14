export interface CicloplegiaAlertInput {
  age: number;
  arRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  subjectiveRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  finalVA: {
    od: string;
    oe: string;
  };
  refractionStability: {
    od: boolean;
    oe: boolean;
  };
  subjectiveImprovement: boolean;
}

export interface CicloplegiaAlert {
  type: 'warning' | 'error';
  severity: 'high' | 'critical';
  message: string;
  reasons: string[];
  recommendations: string[];
  contraindications: string[];
}

export interface CicloplegiaAlertOutput {
  shouldActivate: boolean;
  alert: CicloplegiaAlert | null;
  clinicalIndicators: {
    ageIndicator: boolean;
    refractionDifference: boolean;
    vaIncompatibility: boolean;
    instabilityIndicator: boolean;
  };
  contraindications: string[];
}

export function cicloplegiaAlert(input: CicloplegiaAlertInput): CicloplegiaAlertOutput {
  const { age, arRefraction, subjectiveRefraction, finalVA, refractionStability, subjectiveImprovement } = input;
  
  // Calcular diferença entre AR e subjetivo
  const sphereDifferenceOD = Math.abs(arRefraction.od.s - subjectiveRefraction.od.s);
  const sphereDifferenceOE = Math.abs(arRefraction.oe.s - subjectiveRefraction.oe.s);
  const maxSphereDifference = Math.max(sphereDifferenceOD, sphereDifferenceOE);
  
  // Verificar incompatibilidade de AV
  const vaIncompatible = !subjectiveImprovement || 
                        finalVA.od === '20/40' || finalVA.od === '20/50' ||
                        finalVA.oe === '20/40' || finalVA.oe === '20/50';
  
  // Indicadores clínicos
  const clinicalIndicators = {
    ageIndicator: age < 20,
    refractionDifference: maxSphereDifference > 1.0,
    vaIncompatibility: vaIncompatible,
    instabilityIndicator: !refractionStability.od || !refractionStability.oe
  };
  
  // Condição de ativação
  const shouldActivate = clinicalIndicators.ageIndicator || 
                        clinicalIndicators.refractionDifference || 
                        clinicalIndicators.vaIncompatibility ||
                        clinicalIndicators.instabilityIndicator;
  
  if (!shouldActivate) {
    return {
      shouldActivate: false,
      alert: null,
      clinicalIndicators,
      contraindications: []
    };
  }
  
  // Construir alerta
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const contraindications: string[] = [];
  
  if (clinicalIndicators.ageIndicator) {
    reasons.push(`Idade inferior a 20 anos (${age} anos)`);
    recommendations.push('Cicloplegia obrigatória em pacientes pediátricos');
  }
  
  if (clinicalIndicators.refractionDifference) {
    reasons.push(`Diferença de ${maxSphereDifference.toFixed(2)}D entre AR e grau ajustado`);
    recommendations.push('Reavaliação com cicloplegia para confirmar grau real');
  }
  
  if (clinicalIndicators.vaIncompatibility) {
    reasons.push('AV permaneceu 20/40 com todas as correções testadas');
    recommendations.push('Investigar patologia orgânica concomitante');
  }
  
  if (clinicalIndicators.instabilityIndicator) {
    reasons.push('Refração instável durante exames');
    recommendations.push('Cicloplegia para estabilizar acomodação');
  }
  
  // Contraindicações
  if (age > 50) {
    contraindications.push('Paciente idoso: considerar glaucoma de ângulo fechado');
  }
  
  if (age < 6) {
    contraindications.push('Paciente muito jovem: avaliar risco de ambliopia');
  }
  
  const alert: CicloplegiaAlert = {
    type: clinicalIndicators.ageIndicator ? 'error' : 'warning',
    severity: clinicalIndicators.ageIndicator || clinicalIndicators.vaIncompatibility ? 'critical' : 'high',
    message: '⚠️ Indicação de cicloplegia obrigatória',
    reasons,
    recommendations: [
      ...recommendations,
      'Recomenda-se reavaliação com cicloplegia antes de prescrição definitiva',
      'Usar ciclopentolato 1% ou tropicamida 1%',
      'Aguardar 30-45 minutos para efeito completo',
      'Reavaliar refração sob cicloplegia total'
    ],
    contraindications
  };
  
  return {
    shouldActivate: true,
    alert,
    clinicalIndicators,
    contraindications
  };
}

export function shouldActivateCicloplegia(
  age: number, 
  arRefraction: any, 
  subjectiveRefraction: any, 
  finalVA: any, 
  refractionStability: any, 
  subjectiveImprovement: boolean
): boolean {
  const sphereDifferenceOD = Math.abs(arRefraction.od.s - subjectiveRefraction.od.s);
  const sphereDifferenceOE = Math.abs(arRefraction.oe.s - subjectiveRefraction.oe.s);
  const maxSphereDifference = Math.max(sphereDifferenceOD, sphereDifferenceOE);
  
  const vaIncompatible = !subjectiveImprovement || 
                        finalVA.od === '20/40' || finalVA.od === '20/50' ||
                        finalVA.oe === '20/40' || finalVA.oe === '20/50';
  
  return age < 20 || 
         maxSphereDifference > 1.0 || 
         vaIncompatible ||
         !refractionStability.od || 
         !refractionStability.oe;
} 