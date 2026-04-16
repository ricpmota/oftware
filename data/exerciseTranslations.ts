/**
 * Dicionário de traduções de exercícios do inglês para português
 * Baseado nos exercícios mais comuns da ExerciseDB
 */

export const exerciseTranslations: Record<string, string> = {
  // Exercícios de peito
  'barbell bench press': 'Supino com Barra',
  'dumbbell bench press': 'Supino com Halteres',
  'incline dumbbell press': 'Supino Inclinado com Halteres',
  'decline barbell bench press': 'Supino Declinado com Barra',
  'push-ups': 'Flexões',
  'dumbbell flyes': 'Crucifixo com Halteres',
  'cable crossover': 'Crucifixo no Cabo',
  'chest dips': 'Paralelas para Peito',
  'pec deck': 'Voador',
  'chest press': 'Press para Peito',

  // Exercícios de costas
  'barbell row': 'Remada com Barra',
  'dumbbell row': 'Remada com Halter',
  'lat pulldown': 'Puxada Frontal',
  'pull-ups': 'Barra Fixa',
  'chin-ups': 'Barra Fixa (pegada supinada)',
  'seated cable row': 'Remada Sentada no Cabo',
  't-bar row': 'Remada T',
  'one-arm dumbbell row': 'Remada Unilateral com Halter',
  'deadlift': 'Levantamento Terra',
  'bent-over row': 'Remada Curvada',
  'cable row': 'Remada no Cabo',
  'wide-grip pull-up': 'Barra Fixa Pegada Aberta',

  // Exercícios de ombros
  'shoulder press': 'Desenvolvimento',
  'dumbbell shoulder press': 'Desenvolvimento com Halteres',
  'barbell shoulder press': 'Desenvolvimento com Barra',
  'lateral raise': 'Elevação Lateral',
  'front raise': 'Elevação Frontal',
  'rear delt fly': 'Voador Invertido',
  'upright row': 'Remada Alta',
  'arnold press': 'Desenvolvimento Arnold',
  'face pull': 'Puxada para Face',
  'shoulder shrug': 'Encolhimento de Ombros',

  // Exercícios de braços - tríceps
  'tricep dips': 'Paralelas para Tríceps',
  'close-grip bench press': 'Supino Pegada Fechada',
  'tricep pushdown': 'Tríceps Pulley',
  'overhead tricep extension': 'Extensão de Tríceps',
  'dumbbell tricep extension': 'Extensão de Tríceps com Halter',
  'tricep kickback': 'Tríceps Coice',
  'diamond push-ups': 'Flexões Diamante',

  // Exercícios de braços - bíceps
  'barbell curl': 'Rosca Direta com Barra',
  'dumbbell curl': 'Rosca Direta com Halter',
  'hammer curl': 'Rosca Martelo',
  'preacher curl': 'Rosca Scott',
  'concentration curl': 'Rosca Concentrada',
  'cable curl': 'Rosca no Cabo',
  'incline dumbbell curl': 'Rosca Inclinada com Halter',

  // Exercícios de pernas - quadríceps
  'barbell squat': 'Agachamento com Barra',
  'dumbbell squat': 'Agachamento com Halteres',
  'leg press': 'Leg Press',
  'leg extension': 'Extensão de Pernas',
  'bulgarian split squat': 'Agachamento Búlgaro',
  'goblet squat': 'Agachamento Goblet',
  'front squat': 'Agachamento Frontal',
  'hack squat': 'Agachamento Hack',

  // Exercícios de pernas - posterior
  'leg curl': 'Flexão de Pernas',
  'romanian deadlift': 'Levantamento Terra Romeno',
  'stiff-legged deadlift': 'Levantamento Terra Pernas Estendidas',
  'good morning': 'Bom Dia',
  'hip thrust': 'Elevação Pélvica',

  // Exercícios de pernas - glúteos
  'hip thrust': 'Elevação Pélvica',
  'glute bridge': 'Ponte de Glúteos',
  'donkey kick': 'Chute de Burro',
  'fire hydrant': 'Hidrante',
  'sumo squat': 'Agachamento Sumô',

  // Exercícios de panturrilha
  'calf raise': 'Elevação de Panturrilha',
  'standing calf raise': 'Elevação de Panturrilha em Pé',
  'seated calf raise': 'Elevação de Panturrilha Sentado',
  'donkey calf raise': 'Elevação de Panturrilha Burro',

  // Exercícios de abdômen
  'crunch': 'Abdominal',
  'sit-up': 'Abdominal Completo',
  'plank': 'Prancha',
  'russian twist': 'Rotação Russa',
  'mountain climber': 'Escalador',
  'leg raise': 'Elevação de Pernas',
  'hanging leg raise': 'Elevação de Pernas Suspenso',
  'ab wheel': 'Roda Abdominal',
  'bicycle crunch': 'Abdominal Bicicleta',
  'side plank': 'Prancha Lateral',

  // Exercícios de cardio
  'running': 'Corrida',
  'cycling': 'Ciclismo',
  'jumping jacks': 'Polichinelo',
  'burpee': 'Burpee',
  'jump rope': 'Corda',
  'high knees': 'Joelhos Altos',
  'butt kicks': 'Calcanhar no Glúteo',
  'sprint': 'Corrida de Velocidade',

  // Exercícios de alongamento
  'stretch': 'Alongamento',
  'hamstring stretch': 'Alongamento de Posterior',
  'quad stretch': 'Alongamento de Quadríceps',
  'shoulder stretch': 'Alongamento de Ombros',
  'chest stretch': 'Alongamento de Peito',

  // Equipamentos comuns
  'barbell': 'Barra',
  'dumbbell': 'Halter',
  'cable': 'Cabo',
  'machine': 'Máquina',
  'body weight': 'Peso Corporal',
  'kettlebell': 'Kettlebell',
  'resistance band': 'Faixa Elástica',
  'medicine ball': 'Medicine Ball',
  'ez-bar': 'Barra W',
  'smith machine': 'Smith Machine',
};

/**
 * Traduz o nome do exercício do inglês para português
 * Se não encontrar tradução, retorna o nome original
 */
export function translateExerciseName(name: string): string {
  const lowerName = name.toLowerCase().trim();
  
  // Buscar tradução exata
  if (exerciseTranslations[lowerName]) {
    return exerciseTranslations[lowerName];
  }
  
  // Buscar tradução parcial (para variações)
  for (const [key, translation] of Object.entries(exerciseTranslations)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return translation;
    }
  }
  
  // Se não encontrar, retornar original com primeira letra maiúscula
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Traduz bodyPart, target e equipment
 */
export const bodyPartTranslations: Record<string, string> = {
  'chest': 'Peito',
  'back': 'Costas',
  'shoulders': 'Ombros',
  'arms': 'Braços',
  'legs': 'Pernas',
  'cardio': 'Cardio',
  'waist': 'Cintura',
  'upper legs': 'Coxas',
  'lower legs': 'Panturrilhas',
  'neck': 'Pescoço',
};

export const targetTranslations: Record<string, string> = {
  'pectorals': 'Peitorais',
  'anterior deltoids': 'Deltóides Anteriores',
  'lats': 'Latíssimos',
  'biceps': 'Bíceps',
  'triceps': 'Tríceps',
  'quadriceps': 'Quadríceps',
  'hamstrings': 'Posteriores',
  'glutes': 'Glúteos',
  'calves': 'Panturrilhas',
  'abs': 'Abdominais',
  'traps': 'Trapézios',
  'rear delts': 'Deltóides Posteriores',
  'middle delts': 'Deltóides Médios',
  'forearms': 'Antebraços',
  'adductors': 'Adutores',
  'abductors': 'Abdutores',
};

export const equipmentTranslations: Record<string, string> = {
  'barbell': 'Barra',
  'dumbbell': 'Halter',
  'cable': 'Cabo',
  'machine': 'Máquina',
  'body weight': 'Peso Corporal',
  'kettlebell': 'Kettlebell',
  'resistance band': 'Faixa Elástica',
  'medicine ball': 'Medicine Ball',
  'ez-bar': 'Barra W',
  'smith machine': 'Smith Machine',
  'none': 'Sem Equipamento',
};

export function translateBodyPart(bodyPart: string): string {
  const translated = bodyPartTranslations[bodyPart.toLowerCase()] || bodyPart;
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateTarget(target: string): string {
  const translated = targetTranslations[target.toLowerCase()] || target;
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

export function translateEquipment(equipment: string): string {
  const translated = equipmentTranslations[equipment.toLowerCase()] || equipment;
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}
