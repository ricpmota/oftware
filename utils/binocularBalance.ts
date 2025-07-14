export interface BinocularBalanceInput {
  finalRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  visualAcuity: {
    od: string;
    oe: string;
  };
  dominantEye: 'od' | 'oe' | 'unknown';
  binocularSymptoms: string[];
  patientReports: string;
}

export interface BalanceTest {
  name: string;
  description: string;
  procedure: string;
  expectedResult: string;
  adjustment: { od: number; oe: number };
}

export interface BinocularBalanceOutput {
  shouldActivate: boolean;
  reason: string;
  balanceTests: BalanceTest[];
  recommendedAdjustment: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  clinicalNotes: string[];
  toleranceTest: {
    recommended: boolean;
    procedure: string;
    duration: string;
  };
}

export function binocularBalance(input: BinocularBalanceInput): BinocularBalanceOutput {
  const { finalRefraction, visualAcuity, dominantEye, binocularSymptoms, patientReports } = input;
  
  // Calcular diferença esférica entre os olhos
  const sphereDifference = Math.abs(finalRefraction.od.s - finalRefraction.oe.s);
  
  // Verificar sintomas binoculares
  const hasBinocularSymptoms = binocularSymptoms.length > 0;
  
  // Condição de ativação
  const shouldActivate = sphereDifference > 0.50 || hasBinocularSymptoms;
  
  if (!shouldActivate) {
    return {
      shouldActivate: false,
      reason: 'Diferença esférica < 0.50D e sem sintomas binoculares. Equilíbrio binocular adequado.',
      balanceTests: [],
      recommendedAdjustment: finalRefraction,
      clinicalNotes: [],
      toleranceTest: {
        recommended: false,
        procedure: '',
        duration: ''
      }
    };
  }
  
  // Determinar olho dominante se não especificado
  const effectiveDominantEye = dominantEye === 'unknown' ? 
    (finalRefraction.od.s > finalRefraction.oe.s ? 'od' : 'oe') : 
    dominantEye;
  
  // Calcular ajuste recomendado
  const adjustmentAmount = sphereDifference > 1.0 ? 0.25 : 0.125;
  
  const recommendedAdjustment = {
    od: {
      s: finalRefraction.od.s - (effectiveDominantEye === 'od' ? adjustmentAmount : 0),
      c: finalRefraction.od.c,
      e: finalRefraction.od.e
    },
    oe: {
      s: finalRefraction.oe.s - (effectiveDominantEye === 'oe' ? adjustmentAmount : 0),
      c: finalRefraction.oe.c,
      e: finalRefraction.oe.e
    }
  };
  
  // Definir testes de equilíbrio
  const balanceTests: BalanceTest[] = [
    {
      name: 'Duplo Borramento (Fogging)',
      description: 'Teste clássico de equilíbrio binocular',
      procedure: 'Adicionar +1,00D ao olho não dominante, testar AV binocular',
      expectedResult: 'AV binocular deve ser igual ou melhor que melhor olho',
      adjustment: { od: 0, oe: 0 }
    },
    {
      name: 'Jackson Cross Cylinder',
      description: 'Teste de equilíbrio com cilindro cruzado',
      procedure: 'Apresentar cilindro cruzado alternadamente entre os olhos',
      expectedResult: 'Paciente deve preferir igualmente ambas as posições',
      adjustment: { od: 0, oe: 0 }
    },
    {
      name: 'Teste de Tolerância',
      description: 'Avaliar conforto com correção ajustada',
      procedure: 'Manter correção por 15-20 minutos, avaliar sintomas',
      expectedResult: 'Sem queixas de fadiga ou desconforto',
      adjustment: recommendedAdjustment.od.s !== finalRefraction.od.s ? 
        { od: adjustmentAmount, oe: 0 } : 
        { od: 0, oe: adjustmentAmount }
    }
  ];
  
  const clinicalNotes = [
    `Diferença esférica de ${sphereDifference.toFixed(2)}D detectada entre os olhos`,
    `Olho dominante identificado: ${effectiveDominantEye.toUpperCase()}`,
    hasBinocularSymptoms ? 'Sintomas binoculares presentes: ajuste recomendado' : 'Ajuste preventivo para equilíbrio',
    `Redução de ${adjustmentAmount}D no olho dominante para equilibrar acomodação`,
    'Objetivo: prevenir fadiga acomodativa e queixas astenópicas'
  ];
  
  const toleranceTest = {
    recommended: true,
    procedure: 'Testar correção ajustada por 20-30 minutos em ambiente normal',
    duration: '15-30 minutos'
  };
  
  return {
    shouldActivate: true,
    reason: `Diferença esférica de ${sphereDifference.toFixed(2)}D e/ou sintomas binoculares detectados`,
    balanceTests,
    recommendedAdjustment,
    clinicalNotes,
    toleranceTest
  };
}

export function shouldActivateBinocularBalance(
  finalRefraction: any, 
  binocularSymptoms: string[]
): boolean {
  const sphereDifference = Math.abs(finalRefraction.od.s - finalRefraction.oe.s);
  const hasBinocularSymptoms = binocularSymptoms.length > 0;
  
  return sphereDifference > 0.50 || hasBinocularSymptoms;
}

export function calculateDominantEyeAdjustment(
  dominantEye: 'od' | 'oe', 
  sphereDifference: number
): number {
  if (sphereDifference <= 0.50) return 0;
  if (sphereDifference <= 1.0) return 0.125;
  return 0.25;
} 