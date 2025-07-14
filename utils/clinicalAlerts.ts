export interface ClinicalAlertsInput {
  age: number;
  finalPrescription: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  arAverages: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  arStability: {
    od: boolean;
    oe: boolean;
  };
  subjectiveImprovement: boolean;
  knownDiagnoses: string[];
  previousGlasses?: boolean;
  symptoms?: string[];
}

export interface ClinicalAlert {
  type: 'error' | 'warning' | 'info';
  message: string;
  priority: 'high' | 'medium' | 'low';
  category: 'acuity' | 'stability' | 'anisometropia' | 'pathology' | 'age' | 'refraction';
}

export interface ClinicalAlertsOutput {
  alerts: ClinicalAlert[];
  summary: {
    totalAlerts: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

export function generateClinicalAlerts(input: ClinicalAlertsInput): ClinicalAlertsOutput {
  const alerts: ClinicalAlert[] = [];
  
  // 1. Análise de Acuidade Visual
  analyzeAcuityIssues(input, alerts);
  
  // 2. Análise de Estabilidade do AR
  analyzeARStability(input, alerts);
  
  // 3. Análise de Anisometropia
  analyzeAnisometropia(input, alerts);
  
  // 4. Análise de Patologias por Idade
  analyzeAgeRelatedPathology(input, alerts);
  
  // 5. Análise de Coerência Refrativa
  analyzeRefractiveCoherence(input, alerts);
  
  // 6. Análise de Sintomas Específicos
  analyzeSpecificSymptoms(input, alerts);
  
  // 7. Análise de Astigmatismo Irregular
  analyzeIrregularAstigmatism(input, alerts);
  
  // Calcular resumo
  const summary = {
    totalAlerts: alerts.length,
    highPriority: alerts.filter(a => a.priority === 'high').length,
    mediumPriority: alerts.filter(a => a.priority === 'medium').length,
    lowPriority: alerts.filter(a => a.priority === 'low').length
  };
  
  return { alerts, summary };
}

function analyzeAcuityIssues(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { subjectiveImprovement, finalPrescription } = input;
  
  if (!subjectiveImprovement) {
    alerts.push({
      type: 'error',
      message: 'AV não melhorou com nenhum ajuste: considerar ambliopia, catarata ou patologia retiniana',
      priority: 'high',
      category: 'acuity'
    });
  }
  
  // Verificar se há grau significativo mas sem melhora
  const maxSphere = Math.max(Math.abs(finalPrescription.od.s), Math.abs(finalPrescription.oe.s));
  const maxCylinder = Math.max(Math.abs(finalPrescription.od.c), Math.abs(finalPrescription.oe.c));
  
  if ((maxSphere > 1.0 || maxCylinder > 1.0) && !subjectiveImprovement) {
    alerts.push({
      type: 'warning',
      message: 'Grau significativo presente mas sem melhora visual: investigar patologia orgânica',
      priority: 'high',
      category: 'acuity'
    });
  }
}

function analyzeARStability(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { arStability, age } = input;
  
  if (!arStability.od || !arStability.oe) {
    alerts.push({
      type: 'warning',
      message: 'AR instável: possível erro de captura, opacidade de cristalino ou olho seco',
      priority: 'medium',
      category: 'stability'
    });
    
    if (age > 50) {
      alerts.push({
        type: 'info',
        message: 'AR instável em paciente idoso: suspeitar catarata cortical ou nuclear',
        priority: 'medium',
        category: 'stability'
      });
    }
  }
}

function analyzeAnisometropia(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { finalPrescription } = input;
  
  const sphereDifference = Math.abs(finalPrescription.od.s - finalPrescription.oe.s);
  const cylinderDifference = Math.abs(finalPrescription.od.c - finalPrescription.oe.c);
  
  if (sphereDifference > 1.5) {
    alerts.push({
      type: 'error',
      message: `Diferença esférica de ${sphereDifference.toFixed(2)}D entre os olhos: risco de anisometropia e aniseiconia`,
      priority: 'high',
      category: 'anisometropia'
    });
  }
  
  if (cylinderDifference > 1.5) {
    alerts.push({
      type: 'warning',
      message: `Diferença cilíndrica de ${cylinderDifference.toFixed(2)}D entre os olhos: avaliar ambliopia`,
      priority: 'medium',
      category: 'anisometropia'
    });
  }
  
  if (sphereDifference > 2.0 || cylinderDifference > 2.0) {
    alerts.push({
      type: 'error',
      message: 'Anisometropia severa: considerar lente de contato ou cirurgia refrativa',
      priority: 'high',
      category: 'anisometropia'
    });
  }
}

function analyzeAgeRelatedPathology(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { age, finalPrescription, previousGlasses } = input;
  
  // Miopia nova em idoso
  if (age > 50 && !previousGlasses) {
    const avgSphere = (finalPrescription.od.s + finalPrescription.oe.s) / 2;
    if (avgSphere < -1.0) {
      alerts.push({
        type: 'warning',
        message: 'Miopia nova em paciente >50 anos: suspeitar catarata nuclear',
        priority: 'medium',
        category: 'pathology'
      });
    }
  }
  
  // Miopização em usuário de óculos
  if (age > 55 && previousGlasses) {
    const avgSphere = (finalPrescription.od.s + finalPrescription.oe.s) / 2;
    if (avgSphere < -2.0) {
      alerts.push({
        type: 'info',
        message: 'Miopização em idoso usuário de óculos: monitorar progressão da catarata',
        priority: 'low',
        category: 'pathology'
      });
    }
  }
  
  // Hipermetropia em adulto jovem
  if (age < 40) {
    const avgSphere = (finalPrescription.od.s + finalPrescription.oe.s) / 2;
    if (avgSphere > 2.0) {
      alerts.push({
        type: 'warning',
        message: 'Hipermetropia alta em adulto jovem: cicloplegia pode ser necessária',
        priority: 'medium',
        category: 'refraction'
      });
    }
  }
  
  // Presbiopia precoce
  if (age < 35) {
    const avgSphere = (finalPrescription.od.s + finalPrescription.oe.s) / 2;
    if (avgSphere > 0.5) {
      alerts.push({
        type: 'info',
        message: 'Presbiopia precoce: investigar diabetes ou outras condições sistêmicas',
        priority: 'low',
        category: 'pathology'
      });
    }
  }
}

function analyzeRefractiveCoherence(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { finalPrescription, arAverages } = input;
  
  // Calcular diferença entre AR e prescrição final
  const odSphereDiff = Math.abs(finalPrescription.od.s - arAverages.od.s);
  const oeSphereDiff = Math.abs(finalPrescription.oe.s - arAverages.oe.s);
  const odCylDiff = Math.abs(finalPrescription.od.c - arAverages.od.c);
  const oeCylDiff = Math.abs(finalPrescription.oe.c - arAverages.oe.c);
  
  const avgSphereDiff = (odSphereDiff + oeSphereDiff) / 2;
  const avgCylDiff = (odCylDiff + oeCylDiff) / 2;
  
  // Prescrição muito menor que AR
  if (avgSphereDiff > 1.5) {
    alerts.push({
      type: 'warning',
      message: `Refração subjetiva ${avgSphereDiff.toFixed(2)}D menor que AR: possível espasmo acomodativo`,
      priority: 'medium',
      category: 'refraction'
    });
  }
  
  // Prescrição muito maior que AR
  if (avgSphereDiff > 1.0 && finalPrescription.od.s > arAverages.od.s && finalPrescription.oe.s > arAverages.oe.s) {
    alerts.push({
      type: 'info',
      message: 'Prescrição maior que AR: verificar se não há hipercorreção',
      priority: 'low',
      category: 'refraction'
    });
  }
  
  // Diferença cilíndrica significativa
  if (avgCylDiff > 1.0) {
    alerts.push({
      type: 'warning',
      message: `Diferença cilíndrica de ${avgCylDiff.toFixed(2)}D entre AR e prescrição: verificar eixo e potência`,
      priority: 'medium',
      category: 'refraction'
    });
  }
}

function analyzeSpecificSymptoms(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { symptoms, age, finalPrescription } = input;
  
  if (!symptoms || symptoms.length === 0) return;
  
  // Dor nos olhos
  if (symptoms.includes('Dor nos olhos')) {
    alerts.push({
      type: 'error',
      message: 'Dor ocular: investigar glaucoma, uveíte ou trauma',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Fotofobia
  if (symptoms.includes('Fotofobia')) {
    alerts.push({
      type: 'warning',
      message: 'Fotofobia: considerar catarata, uveíte ou olho seco',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Cefaleia sem grau significativo
  if (symptoms.includes('Cefaleia') && Math.abs(finalPrescription.od.s) < 0.5 && Math.abs(finalPrescription.oe.s) < 0.5) {
    alerts.push({
      type: 'info',
      message: 'Cefaleia sem grau significativo: investigar causas não refrativas',
      priority: 'low',
      category: 'pathology'
    });
  }
  
  // Dificuldade para leitura em jovem
  if (symptoms.includes('Dificuldade para leitura') && age < 40) {
    alerts.push({
      type: 'warning',
      message: 'Dificuldade para leitura em paciente jovem: avaliar presbiopia precoce',
      priority: 'medium',
      category: 'refraction'
    });
  }
  
  // Visão borrada
  if (symptoms.includes('Visão borrada')) {
    alerts.push({
      type: 'info',
      message: 'Visão borrada: confirmar se melhora com correção',
      priority: 'low',
      category: 'acuity'
    });
  }
  
  // Visão dupla
  if (symptoms.includes('Visão dupla')) {
    alerts.push({
      type: 'error',
      message: 'Visão dupla: investigar estrabismo, catarata ou patologia neurológica',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Olhos secos
  if (symptoms.includes('Olhos secos')) {
    alerts.push({
      type: 'info',
      message: 'Olhos secos: considerar lágrima artificial e pausas durante o teste',
      priority: 'low',
      category: 'stability'
    });
  }
  
  // Sensação de corpo estranho
  if (symptoms.includes('Sensação de corpo estranho')) {
    alerts.push({
      type: 'warning',
      message: 'Sensação de corpo estranho: avaliar abrasão corneal ou corpo estranho',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Fadiga visual
  if (symptoms.includes('Fadiga visual')) {
    alerts.push({
      type: 'info',
      message: 'Fadiga visual: considerar presbiopia ou astenopia',
      priority: 'low',
      category: 'refraction'
    });
  }
  
  // Dificuldade para dirigir à noite
  if (symptoms.includes('Dificuldade para dirigir à noite')) {
    alerts.push({
      type: 'warning',
      message: 'Dificuldade para dirigir à noite: avaliar catarata ou astigmatismo irregular',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Perda de visão periférica
  if (symptoms.includes('Perda de visão periférica')) {
    alerts.push({
      type: 'error',
      message: 'Perda de visão periférica: investigar glaucoma ou patologia retiniana',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Manchas na visão
  if (symptoms.includes('Manchas na visão')) {
    alerts.push({
      type: 'error',
      message: 'Manchas na visão: investigar descolamento de retina ou degeneração macular',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Novos sintomas expandidos
  
  // Moscas volantes
  if (symptoms.includes('Manchas móveis (moscas volantes)')) {
    alerts.push({
      type: 'warning',
      message: 'Moscas volantes: avaliar descolamento de vítreo posterior ou hemorragia vítrea',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Flashes de luz
  if (symptoms.includes('Flashes de luz')) {
    alerts.push({
      type: 'error',
      message: 'Flashes de luz: urgência - investigar descolamento de retina ou tração vítrea',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Lacrimejamento excessivo
  if (symptoms.includes('Lacrimejamento excessivo')) {
    alerts.push({
      type: 'info',
      message: 'Lacrimejamento excessivo: avaliar obstrução de vias lacrimais ou olho seco',
      priority: 'low',
      category: 'pathology'
    });
  }
  
  // Ardência ocular
  if (symptoms.includes('Ardência ocular')) {
    alerts.push({
      type: 'warning',
      message: 'Ardência ocular: considerar olho seco, blefarite ou alergia',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Secreção ocular
  if (symptoms.includes('Secreção ocular')) {
    alerts.push({
      type: 'warning',
      message: 'Secreção ocular: investigar conjuntivite, blefarite ou infecção',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Visão tremida ou com ondas
  if (symptoms.includes('Visão tremida ou com "ondas"')) {
    alerts.push({
      type: 'error',
      message: 'Visão tremida: investigar nistagmo, catarata ou patologia neurológica',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Metamorfopsia
  if (symptoms.includes('Visão distorcida (metamorfopsia)')) {
    alerts.push({
      type: 'error',
      message: 'Metamorfopsia: urgência - investigar edema macular, buraco de mácula ou membrana epirretiniana',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Dificuldade para reconhecer rostos
  if (symptoms.includes('Dificuldade para reconhecer rostos')) {
    alerts.push({
      type: 'warning',
      message: 'Dificuldade para reconhecer rostos: avaliar patologia macular ou neurológica',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Campo de visão restrito
  if (symptoms.includes('Campo de visão restrito')) {
    alerts.push({
      type: 'error',
      message: 'Campo de visão restrito: investigar glaucoma, patologia retiniana ou neurológica',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Dores orbitárias
  if (symptoms.includes('Dores orbitárias')) {
    alerts.push({
      type: 'error',
      message: 'Dores orbitárias: investigar sinusite, celulite orbitária ou patologia neurológica',
      priority: 'high',
      category: 'pathology'
    });
  }
  
  // Sensação de pressão ocular
  if (symptoms.includes('Sensação de pressão ocular')) {
    alerts.push({
      type: 'warning',
      message: 'Sensação de pressão ocular: medir PIO e investigar glaucoma',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Visão com cores desbotadas
  if (symptoms.includes('Visão com cores desbotadas')) {
    alerts.push({
      type: 'warning',
      message: 'Visão com cores desbotadas: investigar catarata, patologia macular ou daltonismo',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Dificuldade para acompanhar linhas de texto
  if (symptoms.includes('Dificuldade para acompanhar linhas de texto')) {
    alerts.push({
      type: 'info',
      message: 'Dificuldade para acompanhar linhas: avaliar nistagmo, estrabismo ou patologia macular',
      priority: 'low',
      category: 'refraction'
    });
  }
  
  // Piora da visão após esforço visual
  if (symptoms.includes('Piora da visão após esforço visual')) {
    alerts.push({
      type: 'info',
      message: 'Piora após esforço visual: considerar astenopia, presbiopia ou olho seco',
      priority: 'low',
      category: 'refraction'
    });
  }
  
  // Desconforto ao usar computador/celular
  if (symptoms.includes('Desconforto ao usar computador/celular')) {
    alerts.push({
      type: 'info',
      message: 'Desconforto com telas: considerar síndrome do olho seco ou astenopia',
      priority: 'low',
      category: 'refraction'
    });
  }
  
  // Necessidade de aproximar objetos para ler
  if (symptoms.includes('Necessidade de aproximar objetos para ler')) {
    alerts.push({
      type: 'info',
      message: 'Necessidade de aproximar objetos: avaliar presbiopia ou hipermetropia',
      priority: 'low',
      category: 'refraction'
    });
  }
  
  // Necessidade de afastar objetos para ler
  if (symptoms.includes('Necessidade de afastar objetos para ler')) {
    alerts.push({
      type: 'info',
      message: 'Necessidade de afastar objetos: avaliar miopia ou catarata',
      priority: 'low',
      category: 'refraction'
    });
  }
}

function analyzeIrregularAstigmatism(input: ClinicalAlertsInput, alerts: ClinicalAlert[]) {
  const { finalPrescription, age } = input;
  
  const maxCylinder = Math.max(Math.abs(finalPrescription.od.c), Math.abs(finalPrescription.oe.c));
  const odAxis = finalPrescription.od.e;
  const oeAxis = finalPrescription.oe.e;
  
  // Astigmatismo alto
  if (maxCylinder > 2.0) {
    alerts.push({
      type: 'warning',
      message: `Astigmatismo alto (${maxCylinder.toFixed(2)}D): sugerir topografia corneana para descartar ceratocone`,
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Astigmatismo oblíquo (eixo entre 30-60° ou 120-150°)
  const isOblique = (odAxis >= 30 && odAxis <= 60) || (odAxis >= 120 && odAxis <= 150) ||
                   (oeAxis >= 30 && oeAxis <= 60) || (oeAxis >= 120 && oeAxis <= 150);
  
  if (isOblique && maxCylinder > 1.5) {
    alerts.push({
      type: 'warning',
      message: 'Astigmatismo oblíquo e alto: suspeitar ceratocone ou trauma corneano',
      priority: 'medium',
      category: 'pathology'
    });
  }
  
  // Astigmatismo contra-regra (eixo entre 90-180°)
  const isAgainstRule = (odAxis >= 90 && odAxis <= 180) || (oeAxis >= 90 && oeAxis <= 180);
  
  if (isAgainstRule && maxCylinder > 1.0 && age > 50) {
    alerts.push({
      type: 'info',
      message: 'Astigmatismo contra-regra em idoso: pode estar relacionado à catarata',
      priority: 'low',
      category: 'pathology'
    });
  }
} 