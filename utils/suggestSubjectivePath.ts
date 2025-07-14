import { ARMeasurement } from './analyzeARData';

export interface SubjectivePathInput {
  age: number;
  averages: {
    od: ARMeasurement;
    oe: ARMeasurement;
  };
  ametropiaType: {
    od: 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro';
    oe: 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro';
  };
  stability: {
    od: boolean;
    oe: boolean;
  };
  clinicalSuggestions: string[];
  usesGlasses: boolean;
}

export interface SubjectivePathOutput {
  od: {
    startEsferico: string;
    cilindro: string;
    eixo: string;
    etapas: string[];
    observacoes: string[];
  };
  oe: {
    startEsferico: string;
    cilindro: string;
    eixo: string;
    etapas: string[];
    observacoes: string[];
  };
  observacoes: string[];
  alertasClinicos: string[];
}

/**
 * Arredonda para o passo mais próximo de 0.25D
 */
function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

/**
 * Calcula a diferença interocular em dioptrias
 */
function calculateInterocularDifference(od: ARMeasurement, oe: ARMeasurement): number {
  const sphereDiff = Math.abs(od.s - oe.s);
  const cylinderDiff = Math.abs(od.c - oe.c);
  return Math.max(sphereDiff, cylinderDiff);
}

/**
 * Determina o grau inicial esférico baseado na ametropia e perfil do paciente
 */
function determineInitialSphere(
  average: ARMeasurement,
  ametropiaType: string,
  age: number,
  usesGlasses: boolean,
  isStable: boolean,
  interocularDiff: number
): number {
  let initialSphere = roundToQuarter(average.s);
  
  // Reduzir grau inicial se paciente nunca usou óculos
  if (!usesGlasses) {
    if (ametropiaType === 'Miopia') {
      initialSphere = Math.max(initialSphere, -0.25);
    } else if (ametropiaType === 'Hipermetropia') {
      initialSphere = Math.min(initialSphere, 0.50);
    }
  }
  
  // Reduzir se diferença interocular for alta (>1.50D)
  if (interocularDiff > 1.50) {
    initialSphere = roundToQuarter(initialSphere * 0.75);
  }
  
  // Reduzir se AR instável
  if (!isStable) {
    initialSphere = roundToQuarter(initialSphere * 0.80);
  }
  
  // Ajustes específicos por idade
  if (age < 10 && ametropiaType === 'Hipermetropia') {
    initialSphere = Math.min(initialSphere, 0.75);
  }
  
  return initialSphere;
}

/**
 * Determina estratégia para cilindro
 */
function determineCylinderStrategy(
  average: ARMeasurement
): { value: number; strategy: string; useJacksonCross: boolean } {
  const cylinderValue = Math.abs(average.c);
  
  if (cylinderValue === 0) {
    return { value: 0, strategy: 'Sem cilindro', useJacksonCross: false };
  }
  
  if (cylinderValue <= 1.00) {
    return { 
      value: average.c, 
      strategy: 'Aplicar cilindro total', 
      useJacksonCross: true 
    };
  }
  
  // Cilindro alto (>1.00D)
  const initialCylinder = average.c * 0.60; // 60% do valor
  return { 
    value: roundToQuarter(initialCylinder), 
    strategy: 'Iniciar com 60% do cilindro e aumentar conforme tolerância', 
    useJacksonCross: true 
  };
}

/**
 * Gera etapas de refração para um olho
 */
function generateRefractionSteps(
  average: ARMeasurement,
  ametropiaType: string,
  age: number,
  usesGlasses: boolean,
  isStable: boolean,
  interocularDiff: number
): { startEsferico: string; cilindro: string; eixo: string; etapas: string[]; observacoes: string[] } {
  
  const initialSphere = determineInitialSphere(average, ametropiaType, age, usesGlasses, isStable, interocularDiff);
  const cylinderStrategy = determineCylinderStrategy(average);
  
  const etapas: string[] = [];
  const observacoes: string[] = [];
  
  // Etapa 1: Correção esférica
  if (ametropiaType === 'Neutro') {
    etapas.push('Olho emétrope - verificar se há queixas específicas');
    if (age >= 40) {
      etapas.push('Testar adição para perto se necessário');
    }
  } else {
    const sphereSign = initialSphere > 0 ? '+' : '';
    etapas.push(`Iniciar com ${sphereSign}${initialSphere.toFixed(2)}D esférico`);
    etapas.push('Ajustar em passos de 0.25D até máxima acuidade visual');
    etapas.push('Parar se visão embaçar ou surgirem queixas');
  }
  
  // Etapa 2: Correção do cilindro
  if (cylinderStrategy.value !== 0) {
    const cylinderSign = cylinderStrategy.value > 0 ? '+' : '';
    etapas.push(`Aplicar cilindro ${cylinderSign}${Math.abs(cylinderStrategy.value).toFixed(2)}D`);
    
    if (cylinderStrategy.useJacksonCross) {
      etapas.push('Usar Jackson Cross para refração cruzada');
    }
    
    if (Math.abs(average.c) > 1.00) {
      etapas.push('Se bem tolerado, aumentar gradualmente até valor total');
      etapas.push('Monitorar distorções visuais');
    }
  }
  
  // Etapa 3: Refinamento do eixo
  if (average.e > 0) {
    etapas.push(`Refinar eixo ${average.e}° em incrementos de 5° se necessário`);
    etapas.push('Ajustar se queixas de distorção ou AV subótima');
  }
  
  // Etapa 4: Reavaliação esférica pós-cilindro
  if (cylinderStrategy.value !== 0) {
    etapas.push('Reavaliar equilíbrio esférico após correção do cilindro');
    etapas.push('Ajustar esférico se AV for subótima');
  }
  
  // Etapa 5: Verificação binocular
  etapas.push('Testar visão binocular com ambos os olhos');
  etapas.push('Avaliar conforto e qualidade visual');
  
  // Observações específicas
  if (!isStable) {
    observacoes.push('⚠️ AR instável - considerar repetir medição');
  }
  
  if (!usesGlasses && ametropiaType !== 'Neutro') {
    observacoes.push('Primeira prescrição - grau inicial conservador');
  }
  
  if (age < 10 && ametropiaType === 'Hipermetropia') {
    observacoes.push('Criança - considerar cicloplegia se necessário');
  }
  
  return {
    startEsferico: initialSphere > 0 ? `+${initialSphere.toFixed(2)}` : initialSphere.toFixed(2),
    cilindro: cylinderStrategy.value > 0 ? `+${cylinderStrategy.value.toFixed(2)}` : cylinderStrategy.value.toFixed(2),
    eixo: average.e > 0 ? `${average.e}°` : '0°',
    etapas,
    observacoes
  };
}

/**
 * Gera alertas clínicos baseados na análise
 */
function generateClinicalAlerts(
  input: SubjectivePathInput,
  interocularDiff: number
): string[] {
  const alertas: string[] = [];
  
  // Alerta de anisometropia
  if (interocularDiff > 1.50) {
    alertas.push(`🚨 DIFERENÇA INTEROCULAR DE ${interocularDiff.toFixed(2)}D - RISCO DE ANISOMETROPIA`);
    alertas.push('Considerar prescrição parcial inicial ou teste com lente de contato');
    alertas.push('Monitorar sintomas de aniseiconia, diplopia ou desconforto visual');
  }
  
  // Alerta de AR instável
  if (!input.stability.od || !input.stability.oe) {
    alertas.push('⚠️ AR INSTÁVEL - Repetir medição com lágrima artificial');
    if (input.age < 18) {
      alertas.push('Considerar cicloplegia para refração precisa');
    }
  }
  
  // Alerta de ametropia alta
  const highMyopia = input.averages.od.s <= -6.0 || input.averages.oe.s <= -6.0;
  const highAstigmatism = Math.abs(input.averages.od.c) >= 3.0 || Math.abs(input.averages.oe.c) >= 3.0;
  
  if (highMyopia) {
    alertas.push('⚠️ MIOPIA ALTA - Considerar lentes de alto índice e avaliação retiniana');
  }
  
  if (highAstigmatism) {
    alertas.push('⚠️ ASTIGMATISMO ALTO - Suspeitar ceratocone, indicar topografia');
  }
  
  // Alerta de primeira prescrição
  if (!input.usesGlasses && (input.averages.od.s !== 0 || input.averages.oe.s !== 0)) {
    alertas.push('📋 PRIMEIRA PRESCRIÇÃO - Orientar sobre período de adaptação');
  }
  
  return alertas;
}

/**
 * Gera observações gerais
 */
function generateGeneralObservations(
  input: SubjectivePathInput,
  interocularDiff: number
): string[] {
  const observacoes: string[] = [];
  
  // Observações baseadas na diferença interocular
  if (interocularDiff > 2.00) {
    observacoes.push(`Diferença de ${interocularDiff.toFixed(2)}D entre os olhos: risco de anisometropia`);
    observacoes.push('Sugerida prescrição parcial inicial ou teste com lente de contato');
    observacoes.push('Considerar monovisão se não houver adaptação binocular');
  } else if (interocularDiff > 1.50) {
    observacoes.push(`Diferença de ${interocularDiff.toFixed(2)}D entre os olhos: monitorar tolerância`);
  }
  
  // Observações baseadas na idade
  if (input.age < 10) {
    observacoes.push('Paciente pediátrico - avaliar presença de estrabismo ou ambliopia');
  } else if (input.age >= 40) {
    observacoes.push('Paciente presbíope - considerar adição para perto após correção de longe');
  }
  
  // Observações baseadas no histórico
  if (input.usesGlasses) {
    observacoes.push('Paciente já usa óculos - comparar com prescrição anterior');
    observacoes.push('Evitar mudanças maiores que 0.75D por olho');
  }
  
  return observacoes;
}

/**
 * Função principal que gera o roteiro de ajuste subjetivo
 */
export function suggestSubjectivePath(input: SubjectivePathInput): SubjectivePathOutput {
  const interocularDiff = calculateInterocularDifference(input.averages.od, input.averages.oe);
  
  // Gerar roteiro para cada olho
  const odSteps = generateRefractionSteps(
    input.averages.od,
    input.ametropiaType.od,
    input.age,
    input.usesGlasses,
    input.stability.od,
    interocularDiff
  );
  const oeSteps = generateRefractionSteps(
    input.averages.oe,
    input.ametropiaType.oe,
    input.age,
    input.usesGlasses,
    input.stability.oe,
    interocularDiff
  );
  
  // Gerar alertas e observações
  const alertasClinicos = generateClinicalAlerts(input, interocularDiff);
  const observacoes = generateGeneralObservations(input, interocularDiff);
  
  return {
    od: odSteps,
    oe: oeSteps,
    observacoes,
    alertasClinicos
  };
}

/**
 * Formata o roteiro para exibição
 */
export function formatSubjectivePath(path: SubjectivePathOutput): string {
  let output = '=== ROTEIRO DE AJUSTE SUBJETIVO ===\n\n';
  
  // OD
  output += `OLHO DIREITO (OD):\n`;
  output += `Esférico inicial: ${path.od.startEsferico}D\n`;
  output += `Cilindro: ${path.od.cilindro}D\n`;
  output += `Eixo: ${path.od.eixo}\n\n`;
  output += `Etapas:\n`;
  path.od.etapas.forEach((etapa, index) => {
    output += `${index + 1}. ${etapa}\n`;
  });
  if (path.od.observacoes.length > 0) {
    output += `\nObservações:\n`;
    path.od.observacoes.forEach(obs => {
      output += `• ${obs}\n`;
    });
  }
  
  output += '\n';
  
  // OE
  output += `OLHO ESQUERDO (OE):\n`;
  output += `Esférico inicial: ${path.oe.startEsferico}D\n`;
  output += `Cilindro: ${path.oe.cilindro}D\n`;
  output += `Eixo: ${path.oe.eixo}\n\n`;
  output += `Etapas:\n`;
  path.oe.etapas.forEach((etapa, index) => {
    output += `${index + 1}. ${etapa}\n`;
  });
  if (path.oe.observacoes.length > 0) {
    output += `\nObservações:\n`;
    path.oe.observacoes.forEach(obs => {
      output += `• ${obs}\n`;
    });
  }
  
  output += '\n';
  
  // Observações gerais
  if (path.observacoes.length > 0) {
    output += `OBSERVAÇÕES GERAIS:\n`;
    path.observacoes.forEach(obs => {
      output += `• ${obs}\n`;
    });
    output += '\n';
  }
  
  // Alertas clínicos
  if (path.alertasClinicos.length > 0) {
    output += `ALERTAS CLÍNICOS:\n`;
    path.alertasClinicos.forEach(alerta => {
      output += `• ${alerta}\n`;
    });
  }
  
  return output;
} 