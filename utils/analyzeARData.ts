export interface ARMeasurement {
  s: number; // esfera
  c: number; // cilindro
  e: number; // eixo
}

export interface PatientInfo {
  age: number;
  usesGlasses?: boolean;
  knownConditions?: string[];
}

export interface ARData {
  od: ARMeasurement[];
  oe: ARMeasurement[];
  patientInfo: PatientInfo;
}

export interface AnalysisResult {
  averages: {
    od: ARMeasurement;
    oe: ARMeasurement;
  };
  stability: {
    od: boolean;
    oe: boolean;
    details: {
      od: { s: number; c: number; e: number };
      oe: { s: number; c: number; e: number };
    };
  };
  ametropiaType: {
    od: 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro';
    oe: 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro';
  };
  clinicalSuggestions: string[];
}

/**
 * Arredonda um número para o múltiplo de 0.25 mais próximo
 * Se o resultado for próximo de 0, arredonda para 0
 */
function roundToQuarter(value: number): number {
  if (Math.abs(value) < 0.125) return 0;
  return Math.round(value * 4) / 4;
}

/**
 * Arredonda o eixo para o múltiplo de 5 mais próximo
 */
function roundAxis(axis: number): number {
  return Math.round(axis / 5) * 5;
}

/**
 * Calcula a média de um array de números e arredonda apropriadamente
 */
function calculateAverage(values: number[], isAxis: boolean = false): number {
  // Filtrar valores que não devem ser incluídos no cálculo
  const validValues = values.filter(val => {
    // Para eixo, incluir apenas se não for 0
    if (isAxis) {
      return val !== 0;
    }
    // Para esfera e cilindro, incluir todos os valores
    return true;
  });
  
  // Se não há valores válidos, retornar 0
  if (validValues.length === 0) {
    return 0;
  }
  
  const average = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  return isAxis ? roundAxis(average) : roundToQuarter(average);
}

/**
 * Calcula a média de medições do AR, excluindo valores de cilindro/eixo quando ambos são 0
 */
function calculateARAverage(measurements: ARMeasurement[]): ARMeasurement {
  // Separar valores por tipo
  const spheres = measurements.map(m => m.s);
  const cylinders = measurements.map(m => m.c);
  const axes = measurements.map(m => m.e);
  
  // Para cilindro e eixo, só incluir no cálculo se pelo menos um dos valores não for 0
  const hasValidCylinder = cylinders.some(c => c !== 0);
  const hasValidAxis = axes.some(a => a !== 0);
  
  const averageS = calculateAverage(spheres);
  const averageC = hasValidCylinder ? calculateAverage(cylinders) : 0;
  const averageE = (hasValidCylinder && hasValidAxis) ? calculateAverage(axes, true) : 0;
  
  return {
    s: averageS,
    c: averageC,
    e: averageE
  };
}

/**
 * Calcula a variabilidade (diferença entre maior e menor valor)
 */
function calculateVariability(values: number[]): number {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return max - min;
}

/**
 * Classifica o tipo de ametropia baseado nos valores médios
 */
function classifyAmetropia(average: ARMeasurement): 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro' {
  // Prioridade: Astigmatismo > Esférico
  if (Math.abs(average.c) >= 0.75) {
    return 'Astigmatismo';
  }
  
  if (average.s <= -0.50) {
    return 'Miopia';
  }
  
  if (average.s >= 0.50) {
    return 'Hipermetropia';
  }
  
  return 'Neutro';
}

/**
 * Gera sugestões clínicas baseadas nos padrões detectados
 */
function generateClinicalSuggestions(
  averages: { od: ARMeasurement; oe: ARMeasurement },
  stability: { od: boolean; oe: boolean; details: any },
  patientInfo: PatientInfo
): string[] {
  const suggestions: string[] = [];

  // Verificar instabilidade
  if (!stability.od || !stability.oe) {
    suggestions.push('AR instável - repetir medição com lágrima artificial');
  }

  // Verificar catarata em idosos
  if (patientInfo.age > 60) {
    const odMiopia = averages.od.s <= -1.0;
    const oeMiopia = averages.oe.s <= -1.0;
    
    if (odMiopia || oeMiopia) {
      suggestions.push('Miopização em idoso - suspeitar catarata nuclear');
    }
  }

  // Verificar ceratocone
  const highAstigmatism = Math.abs(averages.od.c) > 2.0 || Math.abs(averages.oe.c) > 2.0;
  const irregularAxis = averages.od.e > 90 || averages.oe.e > 90;
  
  if (highAstigmatism && irregularAxis) {
    suggestions.push('Astigmatismo alto e irregular - suspeitar ceratocone');
  }

  // Verificar condições conhecidas
  if (patientInfo.knownConditions?.includes('Catarata')) {
    suggestions.push('Catarata conhecida - monitorar progressão');
  }

  if (patientInfo.knownConditions?.includes('Ceratocone')) {
    suggestions.push('Ceratocone conhecido - indicar topografia');
  }

  // Verificar diferença significativa entre olhos
  const sphereDiff = Math.abs(averages.od.s - averages.oe.s);
  const cylinderDiff = Math.abs(averages.od.c - averages.oe.c);
  
  if (sphereDiff > 1.0 || cylinderDiff > 1.0) {
    suggestions.push('Diferença significativa entre olhos - investigar causa');
  }

  // Verificar presbiopia
  if (patientInfo.age >= 40) {
    suggestions.push('Paciente presbíope - considerar adição para perto');
  }

  return suggestions;
}

/**
 * Função principal de análise dos dados do AR
 */
export function analyzeARData(data: ARData): AnalysisResult {
  // Extrair medições
  const odMeasurements = data.od;
  const oeMeasurements = data.oe;

  // Calcular médias usando a nova lógica
  const odAverage = calculateARAverage(odMeasurements);
  const oeAverage = calculateARAverage(oeMeasurements);

  // Calcular variabilidade
  const odVariability = {
    s: calculateVariability(odMeasurements.map(m => m.s)),
    c: calculateVariability(odMeasurements.map(m => m.c)),
    e: calculateVariability(odMeasurements.map(m => m.e))
  };

  const oeVariability = {
    s: calculateVariability(oeMeasurements.map(m => m.s)),
    c: calculateVariability(oeMeasurements.map(m => m.c)),
    e: calculateVariability(oeMeasurements.map(m => m.e))
  };

  // Verificar estabilidade (≤ 0.50D de variação)
  const odStable = odVariability.s <= 0.50 && odVariability.c <= 0.50;
  const oeStable = oeVariability.s <= 0.50 && oeVariability.c <= 0.50;

  // Classificar ametropia
  const odAmetropia = classifyAmetropia(odAverage);
  const oeAmetropia = classifyAmetropia(oeAverage);

  // Gerar sugestões clínicas
  const clinicalSuggestions = generateClinicalSuggestions(
    { od: odAverage, oe: oeAverage },
    { 
      od: odStable, 
      oe: oeStable, 
      details: { od: odVariability, oe: oeVariability } 
    },
    data.patientInfo
  );

  return {
    averages: { od: odAverage, oe: oeAverage },
    stability: {
      od: odStable,
      oe: oeStable,
      details: { od: odVariability, oe: oeVariability }
    },
    ametropiaType: { od: odAmetropia, oe: oeAmetropia },
    clinicalSuggestions
  };
}

/**
 * Função auxiliar para formatar prescrição
 */
export function formatPrescription(measurement: ARMeasurement): string {
  const s = measurement.s > 0 ? `+${measurement.s.toFixed(2)}` : measurement.s.toFixed(2);
  const c = measurement.c > 0 ? `+${measurement.c.toFixed(2)}` : measurement.c.toFixed(2);
  return `${s} ${c} ${measurement.e}°`;
}

/**
 * Função para calcular adição para perto baseada na idade
 */
export function calculateNearAddition(age: number): number {
  if (age < 40) return 0;
  if (age < 45) return 0.75;
  if (age < 50) return 1.00;
  if (age < 55) return 1.25;
  if (age < 60) return 1.50;
  if (age < 65) return 1.75;
  return 2.00;
} 