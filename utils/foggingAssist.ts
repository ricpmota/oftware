export interface FoggingAssistInput {
  age: number;
  initialRefraction: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  initialVA: {
    od: string;
    oe: string;
  };
  hasHyperopia: boolean;
  currentVA: {
    od: string;
    oe: string;
  };
}

export interface FoggingStep {
  step: number;
  description: string;
  lensToAdd: { od: number; oe: number };
  expectedVA: string;
  instructions: string;
}

export interface FoggingAssistOutput {
  shouldActivate: boolean;
  reason: string;
  foggingPlan: FoggingStep[];
  finalRecommendation: {
    adjustedRefraction: {
      od: { s: number; c: number; e: number };
      oe: { s: number; c: number; e: number };
    };
    visualGain: boolean;
    notes: string;
  };
  clinicalNotes: string[];
}

export function foggingAssist(input: FoggingAssistInput): FoggingAssistOutput {
  const { age, initialRefraction, hasHyperopia } = input;
  
  // Condição de ativação
  const shouldActivate = age < 35 && hasHyperopia;
  
  if (!shouldActivate) {
    return {
      shouldActivate: false,
      reason: `Paciente com ${age} anos e sem hipermetropia detectada. Fogging não indicado.`,
      foggingPlan: [],
      finalRecommendation: {
        adjustedRefraction: initialRefraction,
        visualGain: false,
        notes: 'Fogging não aplicável'
      },
      clinicalNotes: []
    };
  }
  
  // Calcular plano de fogging
  const foggingPlan: FoggingStep[] = [
    {
      step: 1,
      description: 'Adicionar +1,00D ao esférico inicial',
      lensToAdd: { od: 1.0, oe: 1.0 },
      expectedVA: '20/40 - 20/60',
      instructions: 'Testar AV com lente borradora. Paciente deve ver borrado mas confortável.'
    },
    {
      step: 2,
      description: 'Reduzir gradualmente até melhor AV',
      lensToAdd: { od: 0.5, oe: 0.5 },
      expectedVA: '20/30 - 20/40',
      instructions: 'Reduzir +0,25D por vez até encontrar melhor AV sem desconforto.'
    },
    {
      step: 3,
      description: 'Teste final de conforto',
      lensToAdd: { od: 0.25, oe: 0.25 },
      expectedVA: '20/25 ou melhor',
      instructions: 'Confirmar que paciente mantém conforto e não há queixas de fadiga.'
    }
  ];
  
  // Calcular refração ajustada
  const adjustedRefraction = {
    od: {
      s: initialRefraction.od.s + 0.75, // Redução típica após fogging
      c: initialRefraction.od.c,
      e: initialRefraction.od.e
    },
    oe: {
      s: initialRefraction.oe.s + 0.75,
      c: initialRefraction.oe.c,
      e: initialRefraction.oe.e
    }
  };
  
  // Determinar se houve ganho visual
  const visualGain = Math.abs(adjustedRefraction.od.s - initialRefraction.od.s) > 0.5 ||
                     Math.abs(adjustedRefraction.oe.s - initialRefraction.oe.s) > 0.5;
  
  const clinicalNotes = [
    `Paciente jovem (${age} anos) com hipermetropia: fogging ativado para relaxar acomodação`,
    'Procedimento: adicionar +1,00D inicialmente, reduzir gradualmente até melhor AV',
    'Objetivo: detectar hipermetropia latente e evitar subprescrição',
    visualGain ? 'Ganho visual detectado: hipermetropia latente confirmada' : 'Sem ganho visual significativo'
  ];
  
  return {
    shouldActivate: true,
    reason: `Paciente jovem (${age} anos) com hipermetropia: fogging indicado para relaxar acomodação`,
    foggingPlan,
    finalRecommendation: {
      adjustedRefraction,
      visualGain,
      notes: visualGain 
        ? 'Hipermetropia latente detectada. Grau ajustado para relaxamento acomodativo.'
        : 'Fogging realizado sem ganho visual significativo. Manter grau original.'
    },
    clinicalNotes
  };
}

export function shouldActivateFogging(age: number, hasHyperopia: boolean): boolean {
  return age < 35 && hasHyperopia;
} 