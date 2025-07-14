import { foggingAssist, FoggingAssistInput, FoggingAssistOutput, shouldActivateFogging } from './foggingAssist';
import { cicloplegiaAlert, CicloplegiaAlertInput, CicloplegiaAlertOutput, shouldActivateCicloplegia } from './cicloplegiaAlert';
import { binocularBalance, BinocularBalanceInput, BinocularBalanceOutput, shouldActivateBinocularBalance } from './binocularBalance';

export interface RefractionModulesInput {
  // Dados básicos do paciente
  age: number;
  hasHyperopia: boolean;
  
  // Refrações
  arRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  initialRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  finalRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  
  // Acuidade visual
  initialVA: {
    od: string;
    oe: string;
  };
  finalVA: {
    od: string;
    oe: string;
  };
  
  // Estabilidade e melhora
  refractionStability: {
    od: boolean;
    oe: boolean;
  };
  subjectiveImprovement: boolean;
  
  // Sintomas binoculares
  dominantEye: 'od' | 'oe' | 'unknown';
  binocularSymptoms: string[];
  patientReports: string;
}

export interface RefractionModulesOutput {
  fogging: FoggingAssistOutput;
  cicloplegia: CicloplegiaAlertOutput;
  binocularBalance: BinocularBalanceOutput;
  finalRecommendation: {
    prescription: {
      od: { s: number; c: number; e: number };
      oe: { s: number; c: number; e: number };
    };
    canPrescribe: boolean;
    reason: string;
    nextSteps: string[];
    clinicalNotes: string[];
  };
}

export function runRefractionModules(input: RefractionModulesInput): RefractionModulesOutput {
  // Executar módulo 1: Fogging
  const foggingInput: FoggingAssistInput = {
    age: input.age,
    initialRefraction: input.initialRefraction,
    initialVA: input.initialVA,
    hasHyperopia: input.hasHyperopia,
    currentVA: input.finalVA
  };
  const fogging = foggingAssist(foggingInput);
  
  // Executar módulo 2: Cicloplegia
  const cicloplegiaInput: CicloplegiaAlertInput = {
    age: input.age,
    arRefraction: input.arRefraction,
    subjectiveRefraction: input.finalRefraction,
    finalVA: input.finalVA,
    refractionStability: input.refractionStability,
    subjectiveImprovement: input.subjectiveImprovement
  };
  const cicloplegia = cicloplegiaAlert(cicloplegiaInput);
  
  // Executar módulo 3: Equilíbrio Binocular
  const binocularInput: BinocularBalanceInput = {
    finalRefraction: input.finalRefraction,
    visualAcuity: input.finalVA,
    dominantEye: input.dominantEye,
    binocularSymptoms: input.binocularSymptoms,
    patientReports: input.patientReports
  };
  const binocularBalanceResult = binocularBalance(binocularInput);
  
  // Determinar prescrição final
  let finalPrescription = input.finalRefraction;
  let canPrescribe = true;
  let reason = 'Prescrição aprovada após análise dos módulos clínicos';
  const nextSteps: string[] = [];
  const clinicalNotes: string[] = [];
  
  // Se cicloplegia está ativa, não prescrever
  if (cicloplegia.shouldActivate) {
    canPrescribe = false;
    reason = 'Cicloplegia obrigatória: não prescrever até reavaliação';
    nextSteps.push('Agendar reavaliação com cicloplegia');
    nextSteps.push('Usar ciclopentolato 1% ou tropicamida 1%');
    nextSteps.push('Aguardar 30-45 minutos para efeito completo');
  }
  
  // Aplicar ajustes do fogging se ativo
  if (fogging.shouldActivate && fogging.finalRecommendation.visualGain) {
    finalPrescription = fogging.finalRecommendation.adjustedRefraction;
    clinicalNotes.push('Ajuste aplicado baseado no fogging');
  }
  
  // Aplicar ajustes do equilíbrio binocular se ativo
  if (binocularBalanceResult.shouldActivate && canPrescribe) {
    finalPrescription = binocularBalanceResult.recommendedAdjustment;
    clinicalNotes.push('Ajuste aplicado para equilíbrio binocular');
    nextSteps.push('Teste de tolerância recomendado');
  }
  
  // Adicionar notas clínicas de cada módulo
  if (fogging.shouldActivate) {
    clinicalNotes.push(...fogging.clinicalNotes);
  }
  
  if (cicloplegia.shouldActivate) {
    clinicalNotes.push(`Alerta: ${cicloplegia.alert?.message}`);
  }
  
  if (binocularBalanceResult.shouldActivate) {
    clinicalNotes.push(...binocularBalanceResult.clinicalNotes);
  }
  
  return {
    fogging,
    cicloplegia,
    binocularBalance: binocularBalanceResult,
    finalRecommendation: {
      prescription: finalPrescription,
      canPrescribe,
      reason,
      nextSteps,
      clinicalNotes
    }
  };
}

// Funções auxiliares para verificação rápida
export function shouldActivateAnyModule(input: RefractionModulesInput): boolean {
  return shouldActivateFogging(input.age, input.hasHyperopia) ||
         shouldActivateCicloplegia(input.age, input.arRefraction, input.finalRefraction, input.finalVA, input.refractionStability, input.subjectiveImprovement) ||
         shouldActivateBinocularBalance(input.finalRefraction, input.binocularSymptoms);
}

export function getModuleStatus(input: RefractionModulesInput): {
  fogging: boolean;
  cicloplegia: boolean;
  binocularBalance: boolean;
} {
  return {
    fogging: shouldActivateFogging(input.age, input.hasHyperopia),
    cicloplegia: shouldActivateCicloplegia(input.age, input.arRefraction, input.finalRefraction, input.finalVA, input.refractionStability, input.subjectiveImprovement),
    binocularBalance: shouldActivateBinocularBalance(input.finalRefraction, input.binocularSymptoms)
  };
} 