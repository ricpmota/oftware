export interface ARMeasurement {
  s: number; // esfera
  c: number; // cilindro
  e: number; // eixo
}

export interface PatientInfo {
  age: number;
  usesGlasses?: boolean;
  knownConditions?: string[];
  symptoms?: string[]; // Adicionado para sintomas
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
    axisVariation: {
      od: number;
      oe: number;
    };
  };
  ametropiaType: {
    od: 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro';
    oe: 'Miopia' | 'Hipermetropia' | 'Astigmatismo' | 'Neutro';
  };
  clinicalSuggestions: string[];
  clinicalAlerts: string[];
  anisometropia: {
    sphere: number;
    cylinder: number;
    significant: boolean;
  };
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
 * Calcula a média de medições do AR de forma independente para esfera, cilindro e eixo
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
 * Calcula a variação do eixo considerando a natureza circular (0-180°)
 */
function calculateAxisVariation(axes: number[]): number {
  const validAxes = axes.filter(a => a !== 0);
  if (validAxes.length < 2) return 0;
  
  // Converter para radianos para calcular diferenças circulares
  const radians = validAxes.map(axis => (axis * Math.PI) / 180);
  
  let maxDiff = 0;
  for (let i = 0; i < radians.length; i++) {
    for (let j = i + 1; j < radians.length; j++) {
      let diff = Math.abs(radians[i] - radians[j]);
      // Considerar a menor diferença circular
      if (diff > Math.PI) {
        diff = 2 * Math.PI - diff;
      }
      const diffDegrees = (diff * 180) / Math.PI;
      maxDiff = Math.max(maxDiff, diffDegrees);
    }
  }
  
  return maxDiff;
}

/**
 * Verifica estabilidade baseada nos novos critérios clínicos
 */
function checkStability(measurements: ARMeasurement[]): {
  stable: boolean;
  variability: { s: number; c: number; e: number };
  axisVariation: number;
} {
  const spheres = measurements.map(m => m.s);
  const cylinders = measurements.map(m => m.c);
  const axes = measurements.map(m => m.e);
  
  const variability = {
    s: calculateVariability(spheres),
    c: calculateVariability(cylinders),
    e: calculateVariability(axes)
  };
  
  const axisVariation = calculateAxisVariation(axes);
  
  // Critérios de estabilidade atualizados:
  // - Diferença > 0.75D para esfera ou cilindro = instável
  // - Variação do eixo > 20° = instável
  const stable = variability.s <= 0.75 && variability.c <= 0.75 && axisVariation <= 20;
  
  return { stable, variability, axisVariation };
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
 * Calcula anisometropia entre os olhos
 */
function calculateAnisometropia(od: ARMeasurement, oe: ARMeasurement): {
  sphere: number;
  cylinder: number;
  significant: boolean;
} {
  const sphereDiff = Math.abs(od.s - oe.s);
  const cylinderDiff = Math.abs(od.c - oe.c);
  
  // Anisometropia significativa: > 2D de diferença
  const significant = sphereDiff > 2.0 || cylinderDiff > 2.0;
  
  return {
    sphere: sphereDiff,
    cylinder: cylinderDiff,
    significant
  };
}

/**
 * Gera sugestões clínicas baseadas nos padrões detectados
 */
function generateClinicalSuggestions(
  averages: { od: ARMeasurement; oe: ARMeasurement },
  stability: { od: boolean; oe: boolean; details: any; axisVariation: any },
  patientInfo: PatientInfo
): string[] {
  const suggestions: string[] = [];

  // Verificar instabilidade
  if (!stability.od || !stability.oe) {
    suggestions.push('AR instável - repetir medição com lágrima artificial');
  }

  // Verificar variação do eixo > 20°
  if (stability.axisVariation.od > 20 || stability.axisVariation.oe > 20) {
    suggestions.push('Variação do eixo > 20° - suspeitar astigmatismo irregular');
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

  // Verificar presbiopia
  if (patientInfo.age >= 40) {
    suggestions.push('Paciente presbíope - considerar adição para perto');
  }

  return suggestions;
}

/**
 * Gera alertas clínicos específicos baseados na prática médica
 */
function generateClinicalAlerts(
  averages: { od: ARMeasurement; oe: ARMeasurement },
  stability: { od: boolean; oe: boolean },
  patientInfo: PatientInfo,
  anisometropia: { sphere: number; cylinder: number; significant: boolean }
): string[] {
  const alerts: string[] = [];

  // Cicloplegia para hipermetropia + sintomas de astenopia OU idade < 40 anos
  const hasAstenopia = patientInfo.symptoms?.some(s => 
    s.toLowerCase().includes('astenopia') || 
    s.toLowerCase().includes('cansaço') || 
    s.toLowerCase().includes('dor de cabeça')
  );
  
  const hasHyperopia = averages.od.s >= 1.0 || averages.oe.s >= 1.0;
  
  if ((hasHyperopia && hasAstenopia) || (hasHyperopia && patientInfo.age < 40)) {
    alerts.push('Sugerir cicloplegia - hipermetropia + sintomas ou idade < 40 anos');
  }

  // Adaptação progressiva para ametropias altas
  const highMyopia = averages.od.s <= -4.0 || averages.oe.s <= -4.0;
  const highHyperopia = averages.od.s >= 3.0 || averages.oe.s >= 3.0;
  
  if (highMyopia || highHyperopia) {
    alerts.push('Ametropia alta - sugerir adaptação progressiva');
  }

  // Anisometropia significativa
  if (anisometropia.significant) {
    alerts.push(`Anisometropia significativa (${anisometropia.sphere.toFixed(2)}D esfera, ${anisometropia.cylinder.toFixed(2)}D cilindro) - risco de diplopia`);
  }

  // Diferença entre olhos > 3D
  const sphereDiff = Math.abs(averages.od.s - averages.oe.s);
  if (sphereDiff > 3.0) {
    alerts.push('Diferença entre olhos > 3D - alto risco de diplopia, considerar encaminhamento');
  }

  return alerts;
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

  // Verificar estabilidade com novos critérios
  const odStability = checkStability(odMeasurements);
  const oeStability = checkStability(oeMeasurements);

  // Classificar ametropia
  const odAmetropia = classifyAmetropia(odAverage);
  const oeAmetropia = classifyAmetropia(oeAverage);

  // Calcular anisometropia
  const anisometropia = calculateAnisometropia(odAverage, oeAverage);

  // Gerar sugestões clínicas
  const clinicalSuggestions = generateClinicalSuggestions(
    { od: odAverage, oe: oeAverage },
    { 
      od: odStability.stable, 
      oe: oeStability.stable, 
      details: { 
        od: odStability.variability, 
        oe: oeStability.variability 
      },
      axisVariation: {
        od: odStability.axisVariation,
        oe: oeStability.axisVariation
      }
    },
    data.patientInfo
  );

  // Gerar alertas clínicos
  const clinicalAlerts = generateClinicalAlerts(
    { od: odAverage, oe: oeAverage },
    { od: odStability.stable, oe: oeStability.stable },
    data.patientInfo,
    anisometropia
  );

  return {
    averages: { od: odAverage, oe: oeAverage },
    stability: {
      od: odStability.stable,
      oe: oeStability.stable,
      details: { 
        od: odStability.variability, 
        oe: oeStability.variability 
      },
      axisVariation: {
        od: odStability.axisVariation,
        oe: oeStability.axisVariation
      }
    },
    ametropiaType: { od: odAmetropia, oe: oeAmetropia },
    clinicalSuggestions,
    clinicalAlerts,
    anisometropia
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