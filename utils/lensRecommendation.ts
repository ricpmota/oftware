export interface LensRecommendationInput {
  finalPrescription: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  age: number;
  intendedUse: string[];
  visualComplaints?: string[];
  previousGlasses?: boolean;
  isMultifocal?: boolean;
  profession?: string;
  poorAdaptationHistory?: boolean;
}

export interface LensRecommendationOutput {
  patientSummary: {
    age: number;
    prescriptionOD: string;
    prescriptionOE: string;
    intendedUse: string[];
    isPresbyopic: boolean;
  };
  recommendation: {
    material: string;
    type: string;
    additionalFeatures: string[];
  };
  observations: string[];
}

export function suggestLensType(input: LensRecommendationInput): LensRecommendationOutput {
  const { finalPrescription, age, intendedUse, isMultifocal = false, profession, poorAdaptationHistory = false } = input;
  
  // Determinar se é presbiópico
  const isPresbyopic = age >= 40 || isMultifocal;
  
  // Calcular grau máximo para recomendações
  const maxSphere = Math.max(Math.abs(finalPrescription.od.s), Math.abs(finalPrescription.oe.s));
  const maxCylinder = Math.max(Math.abs(finalPrescription.od.c), Math.abs(finalPrescription.oe.c));
  
  // Determinar material base
  let material = '';
  
  if (age < 18 || intendedUse.includes('atividade física')) {
    material = 'Policarbonato';
  } else if (maxSphere > 4.0 || maxCylinder > 2.0) {
    material = 'Índice alto 1.67 ou 1.74';
  } else if (maxSphere < 2.0 && maxCylinder < 1.0) {
    material = 'CR-39';
  } else {
    material = 'Trivex ou Índice 1.60';
  }
  
  // Determinar design óptico
  let design = '';
  if (maxCylinder > 1.5) {
    design = 'Asférico';
  } else {
    design = 'Esférico';
  }
  
  // Determinar tipo de lente
  let lensType = '';
  if (isPresbyopic) {
    if (intendedUse.includes('computador') && intendedUse.includes('leitura')) {
      lensType = 'Progressiva Premium';
    } else if (intendedUse.includes('computador')) {
      lensType = 'Ocupacional';
    } else {
      lensType = 'Progressiva';
    }
  } else {
    lensType = 'Monofocal';
  }
  
  // Determinar revestimentos adicionais
  const additionalFeatures: string[] = [];
  
  if (intendedUse.includes('computador')) {
    additionalFeatures.push('Filtro azul');
  }
  
  if (intendedUse.includes('direção')) {
    additionalFeatures.push('Antirreflexo');
  }
  
  if (intendedUse.includes('exposição solar') || profession?.toLowerCase().includes('exterior')) {
    additionalFeatures.push('Fotossensível (Transitions)');
  }
  
  // Adicionar antirreflexo se não foi adicionado ainda
  if (!additionalFeatures.includes('Antirreflexo')) {
    additionalFeatures.push('Antirreflexo');
  }
  
  // Considerações especiais
  const observations: string[] = [];
  
  if (maxSphere > 4.0) {
    observations.push('Paciente com alto grau: considerar índice alto para estética e leveza');
  }
  
  if (isPresbyopic && lensType.includes('Progressiva')) {
    observations.push('Progressiva pode gerar desconforto inicial — avaliar curva de adaptação');
  }
  
  if (intendedUse.includes('computador')) {
    observations.push('Lente ocupacional recomendada para usuários intensivos de computador');
  }
  
  if (poorAdaptationHistory) {
    observations.push('Se histórico de má adaptação, evitar multifocal e considerar monofocal dupla');
  }
  
  if (maxCylinder > 1.5) {
    observations.push('Astigmatismo alto sugere lente asférica para conforto e estética');
  }
  
  if (age > 60) {
    observations.push('Paciente idoso: priorizar conforto e facilidade de adaptação');
  }
  
  // Formatar prescrições
  const formatPrescription = (eye: { s: number; c: number; e: number }) => {
    const sphere = eye.s > 0 ? `+${eye.s.toFixed(2)}` : eye.s.toFixed(2);
    const cylinder = eye.c > 0 ? `+${eye.c.toFixed(2)}` : eye.c.toFixed(2);
    return `${sphere} ${cylinder} x ${eye.e}°`;
  };
  
  return {
    patientSummary: {
      age,
      prescriptionOD: formatPrescription(finalPrescription.od),
      prescriptionOE: formatPrescription(finalPrescription.oe),
      intendedUse,
      isPresbyopic
    },
    recommendation: {
      material: `${material} com design ${design}`,
      type: lensType,
      additionalFeatures
    },
    observations
  };
} 