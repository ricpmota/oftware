/**
 * Labels humanas para blockers, warnings, motivos e roles do motor.
 * Não expor códigos crus na UI principal.
 */

const BLOCKER_LABELS: Record<string, string> = {
  assessment_not_completed: 'A avaliação ainda não foi concluída.',
  professional_review_required:
    'A avaliação possui informações que precisam de revisão profissional antes da geração do treino.',
  weekly_frequency_missing: 'A frequência semanal disponível não foi informada.',
  session_duration_missing: 'A duração da sessão não foi informada.',
  training_location_missing: 'O local de treino não foi informado.',
  professional_restriction_present: 'Há restrição profissional para exercício registrada.',
  insufficient_assessment_data: 'Os dados da avaliação são insuficientes para gerar o treino.',
};

const WARNING_LABELS: Record<string, string> = {
  summary_rebuilt_from_answers: 'O resumo foi reconstruído a partir das respostas.',
  equipment_availability_unknown: 'A disponibilidade de equipamentos não está clara.',
  variable_schedule: 'A rotina de dias é variável.',
  variable_session_duration: 'A duração das sessões pode variar.',
  returning_after_inactivity: 'A pessoa está retornando após período sem treino.',
  exercise_preferences_not_in_catalog:
    'Preferências de exercícios em texto livre ainda não mapeadas no catálogo.',
  environment_has_limitations: 'O ambiente de treino tem limitações.',
  low_training_experience: 'Experiência de treino baixa ou indefinida.',
  cardio_preference_unknown: 'Preferência de cardio indefinida.',
  seven_day_frequency: 'Frequência de 7 dias — volume intenso não é sugerido automaticamente.',
  very_intense_preference_capped: 'Preferência de intensidade muito alta foi limitada.',
  preferred_weekdays_insufficient: 'Há menos dias preferidos do que sessões necessárias.',
  alternating_ab_same_week_limitation: 'Divisão A/B na mesma semana (limitação da versão atual).',
  unsupported_modality_or_goal: 'Modalidade ou objetivo ainda não suportado pelo motor.',
  unsupported_goal_or_catalog_gap: 'Objetivo sem catálogo suficiente (ex.: mobilidade).',
  metadata_unknown: 'Alguns metadados deste exercício foram inferidos a partir do catálogo.',
  environment_inferred: 'O ambiente do exercício foi inferido, não mapeado com certeza.',
  equipment_inferred: 'O equipamento do exercício foi inferido.',
  difficulty_unknown: 'A dificuldade do exercício não está definida no catálogo.',
  secondary_pain_region: 'O exercício envolve secundariamente uma região sensível.',
  restricted_pattern_secondary: 'O exercício toca um padrão de movimento restrito de forma secundária.',
};

const SELECTION_REASON_LABELS: Record<string, string> = {
  goal_compatible: 'Compatível com o objetivo',
  primary_body_priority: 'Trabalha uma região prioritária',
  secondary_body_priority: 'Trabalha uma região prioritária secundária',
  preferred_modality: 'Compatível com a modalidade preferida',
  equipment_available: 'Compatível com os equipamentos disponíveis',
  difficulty_compatible: 'Adequado ao nível de experiência',
  environment_known_compatible: 'Compatível com o ambiente de treino',
  compound_bonus: 'Exercício composto (multiarticular)',
  unilateral_bonus: 'Exercício unilateral',
  unknown_metadata_penalty: 'Metadados incompletos no catálogo',
  restricted_pattern_penalty: 'Padrão de movimento restrito (penalidade)',
  secondary_pain_penalty: 'Envolve região sensível de forma secundária',
  execution_barrier_penalty: 'Ajustado por barreiras de execução',
  slot_pattern_match: 'Preenche o padrão de movimento da sessão',
  slot_muscle_match: 'Trabalha o músculo alvo do componente',
};

const ROLE_LABELS: Record<string, string> = {
  primary_compound: 'Exercício principal',
  secondary_compound: 'Exercício principal complementar',
  accessory: 'Acessório',
  unilateral: 'Unilateral',
  core: 'Core',
  mobility: 'Mobilidade',
  cardio: 'Cardio',
  warmup: 'Aquecimento',
};

const WEEKDAY_LABELS: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const SPLIT_LABELS: Record<string, string> = {
  full_body_once: 'Corpo inteiro (1x)',
  full_body_twice: 'Corpo inteiro (2x)',
  full_body_three_times: 'Corpo inteiro (3x)',
  alternating_ab: 'Alternado A/B',
  upper_lower: 'Superior / Inferior',
  upper_lower_plus: 'Superior / Inferior + complementar',
  push_pull_lower_plus: 'Push / Pull / Lower',
  advanced_split_candidate: 'Divisão avançada (não suportada)',
};

const CARDIO_ACTIVITY_LABELS: Record<string, string> = {
  general_cardio: 'Cardio geral',
  walk: 'Caminhada',
  bike: 'Bicicleta',
  run: 'Corrida',
  elliptical: 'Elíptico',
};

export function labelBlocker(code: string): string {
  return BLOCKER_LABELS[code] || `Restrição: ${code}`;
}

export function labelWarning(code: string): string {
  return WARNING_LABELS[code] || code;
}

export function labelSelectionReason(raw: string): string {
  const code = raw.includes(':') ? raw.split(':')[0] : raw;
  return SELECTION_REASON_LABELS[code] || code;
}

export function labelExerciseRole(role: string): string {
  return ROLE_LABELS[role] || role;
}

export function labelWeekday(day: string | null | undefined): string | null {
  if (!day) return null;
  return WEEKDAY_LABELS[day] || day;
}

export function labelSplit(strategy: string): string {
  return SPLIT_LABELS[strategy] || strategy;
}

export function labelCardioActivity(code: string): string {
  return CARDIO_ACTIVITY_LABELS[code] || code;
}

export function labelMuscle(code: string): string {
  const map: Record<string, string> = {
    pectorals: 'Peitoral',
    quads: 'Quadríceps',
    hamstrings: 'Posteriores',
    glutes: 'Glúteos',
    lats: 'Costas (latíssimo)',
    'upper back': 'Costas superiores',
    delts: 'Ombros',
    biceps: 'Bíceps',
    triceps: 'Tríceps',
    abs: 'Abdômen',
    calves: 'Panturrilhas',
    traps: 'Trapézios',
    spine: 'Coluna',
  };
  return map[code] || code;
}
