/**
 * Banco de perguntas — Avaliação de Atividade Física (Etapas 03–06).
 *
 * Dívida técnica: este arquivo cresceu além do bloco “básico”.
 * Avaliar renomear ou dividir somente em refatoração controlada futura.
 */

import type { AvaliacaoAtividadeFisicaBasicAnswers } from '@/types/avaliacaoAtividadeFisica';
import {
  AVALIACAO_BASIC_COMPLETE_STEP,
  AVALIACAO_COMPLETED_STEP,
  AVALIACAO_ENVIRONMENT_COMPLETE_STEP,
  AVALIACAO_SAFETY_COMPLETE_STEP,
  AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP,
} from '@/types/avaliacaoAtividadeFisica';

export type AvaliacaoBasicStepId =
  | 'primary_goal'
  | 'secondary_goals'
  | 'experience'
  | 'current_activity'
  | 'current_activity_details'
  | 'current_frequency'
  | 'available_days'
  | 'preferred_days'
  | 'session_duration'
  | 'duration_consistency'
  | 'preferred_time'
  | 'training_location';

export type AvaliacaoProfileStepId =
  | 'body_priorities'
  | 'preferred_modalities'
  | 'preferred_intensity'
  | 'cardio_preference'
  | 'cardio_activities'
  | 'favorite_exercises'
  | 'avoided_exercises'
  | 'training_barriers';

export type AvaliacaoEnvironmentStepId =
  | 'environment_overview'
  | 'gym_structure'
  | 'gym_areas'
  | 'home_space'
  | 'available_equipment'
  | 'equipment_access'
  | 'outdoor_spaces'
  | 'floor_exercises'
  | 'environment_noise'
  | 'environment_notes';

export type AvaliacaoSafetyStepId =
  | 'safety_overview'
  | 'current_pain'
  | 'pain_regions'
  | 'pain_triggers'
  | 'pain_functional_impact'
  | 'relevant_injury'
  | 'injury_details'
  | 'injury_movement_limitation'
  | 'relevant_surgery'
  | 'surgery_details'
  | 'surgery_timing'
  | 'movement_limitations'
  | 'balance_falls'
  | 'shortness_of_breath'
  | 'chest_symptoms'
  | 'dizziness_fainting'
  | 'palpitations'
  | 'blood_pressure_advice'
  | 'professional_restriction'
  | 'professional_restriction_details'
  | 'additional_safety_notes'
  | 'safety_confirmation';

export type AvaliacaoReviewStepId = 'final_review' | 'completion_confirmation';

export type AvaliacaoStepId =
  | AvaliacaoBasicStepId
  | AvaliacaoProfileStepId
  | AvaliacaoEnvironmentStepId
  | AvaliacaoSafetyStepId
  | AvaliacaoReviewStepId;

export type ChoiceOption = {
  value: string;
  label: string;
};

export const PRIMARY_GOAL_OPTIONS: ChoiceOption[] = [
  { value: 'weight_loss', label: 'Emagrecer' },
  { value: 'muscle_gain', label: 'Ganhar massa muscular' },
  { value: 'body_definition', label: 'Definir o corpo' },
  { value: 'conditioning', label: 'Melhorar o condicionamento' },
  { value: 'health', label: 'Melhorar minha saúde e disposição' },
  { value: 'mobility', label: 'Melhorar mobilidade e flexibilidade' },
  { value: 'physical_recovery', label: 'Recuperar capacidade física' },
  { value: 'sports_performance', label: 'Melhorar desempenho esportivo' },
  { value: 'other', label: 'Outro' },
];

export const EXPERIENCE_OPTIONS: ChoiceOption[] = [
  { value: 'never_trained', label: 'Nunca treinei' },
  { value: 'returning', label: 'Estou voltando depois de muito tempo' },
  { value: 'less_than_6_months', label: 'Treino há menos de 6 meses' },
  { value: 'between_6_months_and_2_years', label: 'Treino entre 6 meses e 2 anos' },
  { value: 'more_than_2_years', label: 'Treino há mais de 2 anos' },
  { value: 'advanced', label: 'Tenho experiência avançada' },
];

export const CURRENT_ACTIVITY_OPTIONS: ChoiceOption[] = [
  { value: 'walking', label: 'Caminhada' },
  { value: 'running', label: 'Corrida' },
  { value: 'strength', label: 'Musculação' },
  { value: 'cycling', label: 'Ciclismo' },
  { value: 'swimming', label: 'Natação' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'functional', label: 'Treino funcional' },
  { value: 'team_sport', label: 'Esporte coletivo' },
  { value: 'dance', label: 'Dança' },
  { value: 'other', label: 'Outro' },
];

export const WEEKDAY_OPTIONS: ChoiceOption[] = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

export const DURATION_OPTIONS: ChoiceOption[] = [
  { value: '15', label: '15 minutos' },
  { value: '20', label: '20 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '40', label: '40 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '50', label: '50 minutos' },
  { value: '60', label: '60 minutos' },
  { value: '75', label: '75 minutos' },
  { value: '90', label: '90 minutos' },
  { value: '100', label: 'Mais de 90 minutos' },
];

export const DURATION_OVER_90_MINUTES = 100;

export const DURATION_CONSISTENCY_OPTIONS: ChoiceOption[] = [
  { value: 'stable', label: 'Sim, quase sempre tenho esse tempo' },
  { value: 'sometimes_less', label: 'Às vezes tenho menos tempo' },
  { value: 'variable', label: 'Meu tempo varia bastante' },
];

export const TRAINING_PERIOD_OPTIONS: ChoiceOption[] = [
  { value: 'early_morning', label: 'Início da manhã' },
  { value: 'morning', label: 'Manhã' },
  { value: 'lunch_time', label: 'Horário do almoço' },
  { value: 'afternoon', label: 'Tarde' },
  { value: 'evening', label: 'Noite' },
  { value: 'late_night', label: 'Madrugada' },
  { value: 'variable', label: 'Meu horário varia' },
  { value: 'no_preference', label: 'Não tenho preferência' },
];

export const TRAINING_LOCATION_OPTIONS: ChoiceOption[] = [
  { value: 'gym', label: 'Academia' },
  { value: 'home', label: 'Em casa' },
  { value: 'gym_and_home', label: 'Academia e casa' },
  { value: 'condo_gym', label: 'Academia de condomínio' },
  { value: 'outdoors', label: 'Ao ar livre' },
  { value: 'other', label: 'Outro' },
];

export const SECONDARY_NONE_VALUE = 'none';

export const BODY_PRIORITY_FULL_BODY = 'full_body';

export const BODY_PRIORITY_OPTIONS: ChoiceOption[] = [
  { value: 'full_body', label: 'Corpo inteiro' },
  { value: 'chest', label: 'Peitoral' },
  { value: 'back', label: 'Costas' },
  { value: 'shoulders', label: 'Ombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'abs', label: 'Abdômen' },
  { value: 'glutes', label: 'Glúteos' },
  { value: 'quads', label: 'Quadríceps' },
  { value: 'hamstrings', label: 'Posterior de coxa' },
  { value: 'calves', label: 'Panturrilhas' },
];

export const MODALITY_NO_PREFERENCE = 'no_preference';

export const MODALITY_OPTIONS: ChoiceOption[] = [
  { value: 'machines', label: 'Máquinas' },
  { value: 'free_weights', label: 'Pesos livres' },
  { value: 'bodyweight', label: 'Peso corporal' },
  { value: 'functional', label: 'Funcional' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'stretching', label: 'Alongamento' },
  { value: 'walking', label: 'Caminhada' },
  { value: 'running', label: 'Corrida' },
  { value: 'bike', label: 'Bicicleta' },
  { value: 'no_preference', label: 'Não tenho preferência' },
];

export const INTENSITY_OPTIONS: ChoiceOption[] = [
  { value: 'very_light', label: 'Bem leves' },
  { value: 'light', label: 'Leves' },
  { value: 'moderate', label: 'Moderados' },
  { value: 'intense', label: 'Intensos' },
  { value: 'very_intense', label: 'Muito intensos' },
  { value: 'unsure', label: 'Ainda não sei' },
];

export const CARDIO_PREFERENCE_OPTIONS: ChoiceOption[] = [
  { value: 'a_lot', label: 'Muito cardio' },
  { value: 'moderate', label: 'Quantidade moderada' },
  { value: 'little', label: 'Pouco' },
  { value: 'warmup_only', label: 'Apenas aquecimento' },
  { value: 'dislike', label: 'Não gosto' },
  { value: 'no_preference', label: 'Não tenho preferência' },
];

export const CARDIO_ACTIVITY_OPTIONS: ChoiceOption[] = [
  { value: 'walking', label: 'Caminhada' },
  { value: 'running', label: 'Corrida' },
  { value: 'bike', label: 'Bicicleta' },
  { value: 'stairs', label: 'Escada' },
  { value: 'elliptical', label: 'Elíptico' },
  { value: 'rowing', label: 'Remo' },
  { value: 'other', label: 'Outro' },
];

export const BARRIER_NONE_VALUE = 'nothing';

export const BARRIER_OPTIONS: ChoiceOption[] = [
  { value: 'lack_of_time', label: 'Falta de tempo' },
  { value: 'work', label: 'Trabalho' },
  { value: 'children', label: 'Filhos' },
  { value: 'travel', label: 'Viagens' },
  { value: 'motivation', label: 'Falta de motivação' },
  { value: 'fatigue', label: 'Cansaço' },
  { value: 'crowded_gym', label: 'Academia cheia' },
  { value: 'unsure_form', label: 'Não saber executar os exercícios' },
  { value: 'other', label: 'Outro' },
  { value: 'nothing', label: 'Nada costuma atrapalhar' },
];

// ——— Etapa 05 ———

export const GYM_STRUCTURE_OPTIONS: ChoiceOption[] = [
  { value: 'full', label: 'Academia completa' },
  { value: 'medium', label: 'Academia de porte médio' },
  { value: 'small', label: 'Academia pequena' },
  { value: 'condo', label: 'Academia de condomínio' },
  { value: 'unknown', label: 'Não conheço bem a estrutura' },
  { value: 'not_chosen', label: 'Ainda não escolhi a academia' },
];

export const GYM_AREA_UNKNOWN = 'unknown';

export const GYM_AREA_OPTIONS: ChoiceOption[] = [
  { value: 'machines', label: 'Máquinas de musculação' },
  { value: 'free_weights', label: 'Área de pesos livres' },
  { value: 'cardio', label: 'Esteiras, bicicletas ou elípticos' },
  { value: 'functional', label: 'Área para treino funcional' },
  { value: 'stretching', label: 'Espaço para alongamento' },
  { value: 'pool', label: 'Piscina' },
  { value: 'unknown', label: 'Não sei informar' },
];

export const HOME_SPACE_OPTIONS: ChoiceOption[] = [
  { value: 'very_small', label: 'Espaço muito pequeno' },
  { value: 'mat_space', label: 'Espaço suficiente para um colchonete' },
  { value: 'comfortable', label: 'Espaço para me movimentar com liberdade' },
  { value: 'outdoor_area', label: 'Área externa ou quintal' },
  { value: 'undefined', label: 'Ainda não defini o local' },
];

export const EQUIPMENT_NONE = 'none';
export const EQUIPMENT_UNKNOWN = 'unknown';

export const EQUIPMENT_OPTIONS: ChoiceOption[] = [
  { value: 'none', label: 'Nenhum equipamento' },
  { value: 'mat', label: 'Colchonete' },
  { value: 'resistance_bands', label: 'Faixas elásticas' },
  { value: 'mini_bands', label: 'Mini bands' },
  { value: 'dumbbells', label: 'Halteres' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'barbell_plates', label: 'Barra e anilhas' },
  { value: 'bench', label: 'Banco' },
  { value: 'ankle_weights', label: 'Caneleiras' },
  { value: 'swiss_ball', label: 'Bola suíça' },
  { value: 'step', label: 'Step' },
  { value: 'jump_rope', label: 'Corda' },
  { value: 'trx', label: 'TRX ou fita de suspensão' },
  { value: 'stationary_bike', label: 'Bicicleta ergométrica' },
  { value: 'treadmill', label: 'Esteira' },
  { value: 'elliptical', label: 'Elíptico' },
  { value: 'strength_machines', label: 'Aparelhos de musculação' },
  { value: 'other', label: 'Outro' },
  { value: 'unknown', label: 'Não sei informar' },
];

export const EQUIPMENT_ACCESS_OPTIONS: ChoiceOption[] = [
  { value: 'always', label: 'Sim, em todos os treinos' },
  { value: 'most_sessions', label: 'Na maioria dos treinos' },
  { value: 'some_days', label: 'Apenas em alguns dias' },
  { value: 'variable', label: 'Minha disponibilidade varia' },
];

export const OUTDOOR_SPACE_OPTIONS: ChoiceOption[] = [
  { value: 'street', label: 'Rua ou calçada' },
  { value: 'park', label: 'Parque' },
  { value: 'square', label: 'Praça' },
  { value: 'track', label: 'Pista de corrida' },
  { value: 'beach', label: 'Praia' },
  { value: 'stairs', label: 'Escadas' },
  { value: 'court', label: 'Quadra' },
  { value: 'bars', label: 'Área com barras' },
  { value: 'other', label: 'Outro' },
];

export const FLOOR_EXERCISE_OPTIONS: ChoiceOption[] = [
  { value: 'yes', label: 'Sim' },
  { value: 'prefer_avoid', label: 'Prefiro evitar' },
  { value: 'no_space', label: 'Não tenho espaço adequado' },
  { value: 'no_mat', label: 'Não tenho colchonete' },
  { value: 'unsure', label: 'Não sei' },
];

export const ENVIRONMENT_NOISE_OPTIONS: ChoiceOption[] = [
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
  { value: 'sometimes', label: 'Às vezes' },
  { value: 'unsure', label: 'Não sei' },
];

// ——— Etapa 06 — Segurança ———

export const CURRENT_PAIN_OPTIONS: ChoiceOption[] = [
  { value: 'none', label: 'Não' },
  { value: 'mild', label: 'Sim, leve' },
  { value: 'moderate', label: 'Sim, moderada' },
  { value: 'severe', label: 'Sim, forte' },
  { value: 'variable', label: 'A dor varia' },
];

export const PAIN_REGION_OPTIONS: ChoiceOption[] = [
  { value: 'neck', label: 'Pescoço' },
  { value: 'right_shoulder', label: 'Ombro direito' },
  { value: 'left_shoulder', label: 'Ombro esquerdo' },
  { value: 'right_elbow', label: 'Cotovelo direito' },
  { value: 'left_elbow', label: 'Cotovelo esquerdo' },
  { value: 'right_wrist_hand', label: 'Punho ou mão direita' },
  { value: 'left_wrist_hand', label: 'Punho ou mão esquerda' },
  { value: 'cervical_spine', label: 'Coluna cervical' },
  { value: 'thoracic_spine', label: 'Coluna torácica' },
  { value: 'lumbar', label: 'Lombar' },
  { value: 'right_hip', label: 'Quadril direito' },
  { value: 'left_hip', label: 'Quadril esquerdo' },
  { value: 'groin', label: 'Virilha' },
  { value: 'right_knee', label: 'Joelho direito' },
  { value: 'left_knee', label: 'Joelho esquerdo' },
  { value: 'right_ankle', label: 'Tornozelo direito' },
  { value: 'left_ankle', label: 'Tornozelo esquerdo' },
  { value: 'right_foot', label: 'Pé direito' },
  { value: 'left_foot', label: 'Pé esquerdo' },
  { value: 'other', label: 'Outra região' },
];

export const PAIN_TRIGGER_OPTIONS: ChoiceOption[] = [
  { value: 'at_rest', label: 'Em repouso' },
  { value: 'walking', label: 'Durante caminhada' },
  { value: 'running', label: 'Durante corrida' },
  { value: 'stairs', label: 'Ao subir escadas' },
  { value: 'strength_training', label: 'Durante musculação' },
  { value: 'specific_movements', label: 'Em movimentos específicos' },
  { value: 'after_exercise', label: 'Depois do exercício' },
  { value: 'waking_up', label: 'Ao acordar' },
  { value: 'prolonged_sitting', label: 'Ao permanecer muito tempo sentado' },
  { value: 'no_pattern', label: 'Varia sem padrão' },
  { value: 'other', label: 'Outro' },
];

export const PAIN_IMPACT_OPTIONS: ChoiceOption[] = [
  { value: 'none', label: 'Não limita' },
  { value: 'mild', label: 'Limita um pouco' },
  { value: 'moderate', label: 'Limita algumas atividades' },
  { value: 'major', label: 'Limita bastante' },
  { value: 'prevents_activities', label: 'Impede algumas atividades' },
];

export const INJURY_STATUS_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'recovered', label: 'Sim, mas já estou recuperado' },
  { value: 'recovering', label: 'Sim, ainda estou em recuperação' },
  { value: 'current', label: 'Sim, tenho uma lesão atual' },
  { value: 'unsure', label: 'Não sei informar' },
];

export const INJURY_LIMITS_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'yes', label: 'Sim' },
  { value: 'sometimes', label: 'Às vezes' },
  { value: 'unsure', label: 'Não sei' },
];

export const SURGERY_STATUS_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'yes', label: 'Sim' },
  { value: 'unsure', label: 'Não sei se interfere' },
];

export const SURGERY_TIMING_OPTIONS: ChoiceOption[] = [
  { value: 'less_than_3_months', label: 'Há menos de 3 meses' },
  { value: 'between_3_and_6_months', label: 'Entre 3 e 6 meses' },
  { value: 'between_6_and_12_months', label: 'Entre 6 e 12 meses' },
  { value: 'more_than_1_year', label: 'Há mais de 1 ano' },
  { value: 'unknown', label: 'Não lembro' },
];

export const MOVEMENT_LIMITATION_NONE = 'none';

export const MOVEMENT_LIMITATION_OPTIONS: ChoiceOption[] = [
  { value: 'squat', label: 'Agachar' },
  { value: 'kneel', label: 'Ajoelhar' },
  { value: 'lie_down', label: 'Deitar no chão' },
  { value: 'get_up_from_floor', label: 'Levantar do chão' },
  { value: 'raise_arms', label: 'Elevar os braços' },
  { value: 'push', label: 'Empurrar' },
  { value: 'pull', label: 'Puxar' },
  { value: 'run', label: 'Correr' },
  { value: 'jump', label: 'Saltar' },
  { value: 'stairs', label: 'Subir escadas' },
  { value: 'prolonged_standing', label: 'Ficar muito tempo em pé' },
  { value: 'none', label: 'Nenhuma limitação' },
  { value: 'other', label: 'Outro' },
];

export const BALANCE_FALL_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'occasional', label: 'Às vezes sinto desequilíbrio' },
  { value: 'frequent', label: 'Tenho dificuldade frequente de equilíbrio' },
  { value: 'fell_once', label: 'Caí uma vez nos últimos 12 meses' },
  { value: 'fell_multiple', label: 'Caí mais de uma vez nos últimos 12 meses' },
  { value: 'prefer_not', label: 'Prefiro não responder' },
];

export const SHORTNESS_OF_BREATH_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'rarely', label: 'Raramente' },
  { value: 'sometimes', label: 'Às vezes' },
  { value: 'frequently', label: 'Frequentemente' },
  { value: 'at_rest', label: 'Sim, mesmo em repouso' },
  { value: 'unsure', label: 'Não sei' },
];

export const CHEST_SYMPTOM_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'past_only', label: 'Já senti no passado, mas não atualmente' },
  { value: 'sometimes', label: 'Às vezes' },
  { value: 'frequently', label: 'Frequentemente' },
  { value: 'at_rest', label: 'Sinto mesmo em repouso' },
  { value: 'unsure', label: 'Não sei' },
];

export const DIZZINESS_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'mild_occasional', label: 'Tontura leve ocasional' },
  { value: 'frequent', label: 'Tontura frequente' },
  { value: 'near_faint', label: 'Já quase desmaiei' },
  { value: 'fainted', label: 'Já desmaiei' },
  { value: 'unsure', label: 'Não sei' },
];

export const PALPITATION_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'rarely', label: 'Raramente' },
  { value: 'sometimes', label: 'Às vezes' },
  { value: 'frequently', label: 'Frequentemente' },
  { value: 'unsure', label: 'Não sei' },
];

export const BP_ADVICE_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'yes', label: 'Sim' },
  { value: 'past', label: 'Já fui orientado no passado' },
  { value: 'unsure', label: 'Não sei' },
];

export const PROFESSIONAL_RESTRICTION_OPTIONS: ChoiceOption[] = [
  { value: 'no', label: 'Não' },
  { value: 'yes', label: 'Sim' },
  { value: 'awaiting', label: 'Estou aguardando avaliação' },
  { value: 'unsure', label: 'Não sei' },
];

export const SAFETY_CONFIRMATION_OPTIONS: ChoiceOption[] = [
  { value: 'confirmed', label: 'Sim, estão corretas' },
  { value: 'review', label: 'Preciso revisar alguma resposta' },
];

export type StepMeta = {
  id: AvaliacaoStepId;
  title: string;
  subtitle?: string;
};

export const STEP_META: Record<AvaliacaoStepId, StepMeta> = {
  primary_goal: {
    id: 'primary_goal',
    title: 'Qual é o seu principal objetivo?',
  },
  secondary_goals: {
    id: 'secondary_goals',
    title: 'Além disso, o que mais você gostaria de melhorar?',
    subtitle: 'Escolha até 3 opções, ou nenhum objetivo adicional.',
  },
  experience: {
    id: 'experience',
    title: 'Qual é a sua experiência com exercícios?',
  },
  current_activity: {
    id: 'current_activity',
    title: 'Você pratica alguma atividade física atualmente?',
  },
  current_activity_details: {
    id: 'current_activity_details',
    title: 'Quais atividades você pratica atualmente?',
    subtitle: 'Pode escolher mais de uma.',
  },
  current_frequency: {
    id: 'current_frequency',
    title: 'Quantos dias por semana você pratica atualmente?',
  },
  available_days: {
    id: 'available_days',
    title: 'Quantos dias por semana você realmente consegue treinar?',
    subtitle: 'Escolha o que cabe na sua rotina — não precisa ser o máximo.',
  },
  preferred_days: {
    id: 'preferred_days',
    title: 'Em quais dias você prefere treinar?',
  },
  session_duration: {
    id: 'session_duration',
    title: 'Quanto tempo você tem disponível por treino?',
  },
  duration_consistency: {
    id: 'duration_consistency',
    title: 'Esse tempo costuma ser estável?',
  },
  preferred_time: {
    id: 'preferred_time',
    title: 'Em qual horário você prefere treinar?',
    subtitle: 'Informar um horário aproximado é opcional.',
  },
  training_location: {
    id: 'training_location',
    title: 'Onde você pretende treinar?',
  },
  body_priorities: {
    id: 'body_priorities',
    title: 'Quais regiões do corpo você gostaria de priorizar?',
    subtitle: 'Até 3 regiões. A ordem de seleção define a prioridade (1ª, 2ª, 3ª).',
  },
  preferred_modalities: {
    id: 'preferred_modalities',
    title: 'Que tipo de treino você mais gosta?',
    subtitle: 'Pode escolher mais de uma opção.',
  },
  preferred_intensity: {
    id: 'preferred_intensity',
    title: 'Como você prefere que sejam seus treinos?',
    subtitle: 'Isso é só uma preferência — não substitui orientação profissional.',
  },
  cardio_preference: {
    id: 'cardio_preference',
    title: 'Você gostaria que seu treino incluísse exercícios aeróbicos?',
  },
  cardio_activities: {
    id: 'cardio_activities',
    title: 'Quais atividades aeróbicas você prefere?',
    subtitle: 'Pode escolher mais de uma.',
  },
  favorite_exercises: {
    id: 'favorite_exercises',
    title: 'Existe algum exercício que você gosta muito?',
    subtitle: 'Opcional — pode pular se preferir.',
  },
  avoided_exercises: {
    id: 'avoided_exercises',
    title: 'Existe algum exercício que você prefere evitar?',
    subtitle: 'Opcional — o motivo poderá ser detalhado depois.',
  },
  training_barriers: {
    id: 'training_barriers',
    title: 'O que costuma dificultar sua rotina de treinos?',
    subtitle: 'Pode escolher mais de uma opção.',
  },
  environment_overview: {
    id: 'environment_overview',
    title: 'Agora vamos entender o que você terá disponível para treinar.',
    subtitle:
      'Isso ajuda a evitar exercícios que dependam de equipamentos ou espaços que você não possui.',
  },
  gym_structure: {
    id: 'gym_structure',
    title: 'Como é a estrutura da academia onde você pretende treinar?',
  },
  gym_areas: {
    id: 'gym_areas',
    title: 'Quais áreas você terá disponíveis?',
    subtitle: 'Pode escolher mais de uma.',
  },
  home_space: {
    id: 'home_space',
    title: 'Como é o espaço disponível para você treinar em casa?',
  },
  available_equipment: {
    id: 'available_equipment',
    title: 'Quais equipamentos estarão disponíveis para você?',
    subtitle: 'Pode escolher mais de uma opção.',
  },
  equipment_access: {
    id: 'equipment_access',
    title: 'Você terá acesso a esses equipamentos em todos os treinos?',
  },
  outdoor_spaces: {
    id: 'outdoor_spaces',
    title: 'Que espaços ao ar livre você costuma ter disponíveis?',
    subtitle: 'Pode escolher mais de uma.',
  },
  floor_exercises: {
    id: 'floor_exercises',
    title: 'Você consegue realizar exercícios no chão?',
    subtitle: 'Isso é sobre o espaço — não sobre dor ou limitação física.',
  },
  environment_noise: {
    id: 'environment_noise',
    title: 'Você precisa evitar exercícios com impacto ou muito barulho no local onde treina?',
    subtitle: 'Limitação do ambiente, não restrição médica.',
  },
  environment_notes: {
    id: 'environment_notes',
    title: 'Existe algo importante sobre o local onde você vai treinar?',
    subtitle: 'Opcional — pode pular se preferir.',
  },
  safety_overview: {
    id: 'safety_overview',
    title: 'Agora precisamos entender se existe alguma dor, limitação ou condição que deva ser considerada.',
    subtitle:
      'Essas informações ajudam a montar um treino mais seguro e adaptado para você. Responda com atenção. Isso não substitui uma avaliação médica ou física presencial.',
  },
  current_pain: {
    id: 'current_pain',
    title: 'Você sente alguma dor atualmente?',
  },
  pain_regions: {
    id: 'pain_regions',
    title: 'Onde você sente dor?',
    subtitle: 'Pode escolher mais de uma região.',
  },
  pain_triggers: {
    id: 'pain_triggers',
    title: 'Quando essa dor costuma aparecer?',
    subtitle: 'Pode escolher mais de uma opção.',
  },
  pain_functional_impact: {
    id: 'pain_functional_impact',
    title: 'Essa dor limita alguma atividade?',
  },
  relevant_injury: {
    id: 'relevant_injury',
    title: 'Você possui ou já teve alguma lesão importante?',
  },
  injury_details: {
    id: 'injury_details',
    title: 'Conte brevemente qual foi a lesão.',
  },
  injury_movement_limitation: {
    id: 'injury_movement_limitation',
    title: 'Essa lesão limita algum movimento atualmente?',
  },
  relevant_surgery: {
    id: 'relevant_surgery',
    title: 'Você já realizou alguma cirurgia que possa interferir nos exercícios?',
  },
  surgery_details: {
    id: 'surgery_details',
    title: 'Qual cirurgia foi realizada?',
  },
  surgery_timing: {
    id: 'surgery_timing',
    title: 'Quando essa cirurgia foi realizada?',
  },
  movement_limitations: {
    id: 'movement_limitations',
    title: 'Existe algum movimento que você não consegue ou prefere não realizar?',
    subtitle: 'Pode escolher mais de uma opção.',
  },
  balance_falls: {
    id: 'balance_falls',
    title: 'Você apresenta dificuldade de equilíbrio ou já caiu recentemente?',
  },
  shortness_of_breath: {
    id: 'shortness_of_breath',
    title: 'Você sente falta de ar durante esforços leves?',
    subtitle: 'Como caminhar devagar, tomar banho, vestir-se ou subir poucos degraus.',
  },
  chest_symptoms: {
    id: 'chest_symptoms',
    title: 'Você sente dor, aperto ou pressão no peito durante esforço?',
  },
  dizziness_fainting: {
    id: 'dizziness_fainting',
    title: 'Você sente tontura intensa ou já desmaiou durante esforço?',
  },
  palpitations: {
    id: 'palpitations',
    title: 'Você percebe palpitações ou batimentos muito irregulares durante o exercício?',
  },
  blood_pressure_advice: {
    id: 'blood_pressure_advice',
    title:
      'Algum profissional já orientou que sua pressão arterial está descontrolada ou que você deve evitar esforço?',
  },
  professional_restriction: {
    id: 'professional_restriction',
    title: 'Algum médico, fisioterapeuta ou outro profissional recomendou limitar algum exercício?',
  },
  professional_restriction_details: {
    id: 'professional_restriction_details',
    title: 'Qual orientação ou restrição foi informada?',
  },
  additional_safety_notes: {
    id: 'additional_safety_notes',
    title: 'Existe alguma outra condição que deveríamos considerar antes de montar seu treino?',
    subtitle: 'Opcional — pode pular se preferir.',
  },
  safety_confirmation: {
    id: 'safety_confirmation',
    title: 'As informações acima estão corretas?',
  },
  final_review: {
    id: 'final_review',
    title: 'Revise sua avaliação',
    subtitle: 'Confira suas respostas antes de concluir. Você poderá voltar e corrigir qualquer informação.',
  },
  completion_confirmation: {
    id: 'completion_confirmation',
    title: 'Confirmar conclusão',
    subtitle:
      'Ao concluir, estas informações serão usadas para personalizar seu acompanhamento e, futuramente, seu treino.',
  },
};

export function isGymLocation(location?: string | null): boolean {
  return location === 'gym' || location === 'gym_and_home' || location === 'condo_gym';
}

export function isHomeLocation(location?: string | null): boolean {
  return location === 'home' || location === 'gym_and_home';
}

export function isOutdoorsLocation(location?: string | null): boolean {
  // gym_and_home não assume treino externo automaticamente.
  return location === 'outdoors';
}

export function hasConcreteEquipment(answers: AvaliacaoAtividadeFisicaBasicAnswers): boolean {
  const list = answers.availableEquipment || [];
  if (list.length === 0) return false;
  if (list.includes(EQUIPMENT_NONE) || list.includes(EQUIPMENT_UNKNOWN)) return false;
  return true;
}

export function getVisibleBasicSteps(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoBasicStepId[] {
  const steps: AvaliacaoBasicStepId[] = [
    'primary_goal',
    'secondary_goals',
    'experience',
    'current_activity',
  ];
  if (answers.currentlyActive === true) {
    steps.push('current_activity_details', 'current_frequency');
  }
  steps.push(
    'available_days',
    'preferred_days',
    'session_duration',
    'duration_consistency',
    'preferred_time',
    'training_location'
  );
  return steps;
}

export function getVisibleProfileSteps(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoProfileStepId[] {
  const steps: AvaliacaoProfileStepId[] = [
    'body_priorities',
    'preferred_modalities',
    'preferred_intensity',
    'cardio_preference',
  ];
  const cardio = answers.cardioPreference;
  if (cardio && cardio !== 'dislike' && cardio !== 'no_preference') {
    steps.push('cardio_activities');
  }
  steps.push('favorite_exercises', 'avoided_exercises', 'training_barriers');
  return steps;
}

export function getVisibleEnvironmentSteps(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoEnvironmentStepId[] {
  const location = answers.trainingLocation;
  const steps: AvaliacaoEnvironmentStepId[] = ['environment_overview'];

  if (isGymLocation(location)) {
    steps.push('gym_structure', 'gym_areas');
  }
  if (isHomeLocation(location)) {
    steps.push('home_space');
  }

  steps.push('available_equipment');

  if (hasConcreteEquipment(answers)) {
    steps.push('equipment_access');
  }

  if (isOutdoorsLocation(location)) {
    steps.push('outdoor_spaces');
  }

  steps.push('floor_exercises', 'environment_noise', 'environment_notes');
  return steps;
}

export function hasPainFollowUp(answers: AvaliacaoAtividadeFisicaBasicAnswers): boolean {
  return Boolean(answers.currentPainLevel && answers.currentPainLevel !== 'none');
}

export function hasInjuryDetails(answers: AvaliacaoAtividadeFisicaBasicAnswers): boolean {
  const v = answers.hasRelevantInjury;
  return v === 'recovered' || v === 'recovering' || v === 'current';
}

export function hasSurgeryFollowUp(answers: AvaliacaoAtividadeFisicaBasicAnswers): boolean {
  return Boolean(answers.hasRelevantSurgery && answers.hasRelevantSurgery !== 'no');
}

export function hasProfessionalRestrictionFollowUp(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): boolean {
  return Boolean(
    answers.hasProfessionalExerciseRestriction &&
      answers.hasProfessionalExerciseRestriction !== 'no'
  );
}

export function getVisibleSafetySteps(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoSafetyStepId[] {
  const steps: AvaliacaoSafetyStepId[] = ['safety_overview', 'current_pain'];

  if (hasPainFollowUp(answers)) {
    steps.push('pain_regions', 'pain_triggers', 'pain_functional_impact');
  }

  steps.push('relevant_injury');
  if (hasInjuryDetails(answers)) {
    steps.push('injury_details', 'injury_movement_limitation');
  }

  steps.push('relevant_surgery');
  if (hasSurgeryFollowUp(answers)) {
    steps.push('surgery_details', 'surgery_timing');
  }

  steps.push(
    'movement_limitations',
    'balance_falls',
    'shortness_of_breath',
    'chest_symptoms',
    'dizziness_fainting',
    'palpitations',
    'blood_pressure_advice',
    'professional_restriction'
  );

  if (hasProfessionalRestrictionFollowUp(answers)) {
    steps.push('professional_restriction_details');
  }

  // Gestação omitida: sem regra segura de sexo biológico no Gate/Questionnaire.
  steps.push('additional_safety_notes', 'safety_confirmation');
  return steps;
}

export type AvaliacaoReviewEditBlock =
  | 'goals'
  | 'routine'
  | 'profile'
  | 'environment'
  | 'safety';

export function getReviewBlockSteps(
  block: AvaliacaoReviewEditBlock,
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoStepId[] {
  switch (block) {
    case 'goals': {
      const steps: AvaliacaoStepId[] = [
        'primary_goal',
        'secondary_goals',
        'experience',
        'current_activity',
      ];
      if (answers.currentlyActive === true) {
        steps.push('current_activity_details', 'current_frequency');
      }
      return steps;
    }
    case 'routine':
      return [
        'available_days',
        'preferred_days',
        'session_duration',
        'duration_consistency',
        'preferred_time',
        'training_location',
      ];
    case 'profile':
      return getVisibleProfileSteps(answers);
    case 'environment':
      return getVisibleEnvironmentSteps(answers);
    case 'safety':
      return getVisibleSafetySteps(answers);
    default:
      return [];
  }
}

export function getReviewBlockEntryStep(
  block: AvaliacaoReviewEditBlock,
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoStepId {
  const steps = getReviewBlockSteps(block, answers);
  if (block === 'environment') {
    const firstAnswerable = steps.find((s) => s !== 'environment_overview');
    return firstAnswerable || steps[0] || 'environment_overview';
  }
  return steps[0] || 'primary_goal';
}

export function getVisibleReviewSteps(): AvaliacaoReviewStepId[] {
  return ['final_review', 'completion_confirmation'];
}

export function getVisibleSteps(
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): AvaliacaoStepId[] {
  return [
    ...getVisibleBasicSteps(answers),
    ...getVisibleProfileSteps(answers),
    ...getVisibleEnvironmentSteps(answers),
    ...getVisibleSafetySteps(answers),
    ...getVisibleReviewSteps(),
  ];
}

export function isProfileStep(stepId: string): boolean {
  return (
    stepId === 'body_priorities' ||
    stepId === 'preferred_modalities' ||
    stepId === 'preferred_intensity' ||
    stepId === 'cardio_preference' ||
    stepId === 'cardio_activities' ||
    stepId === 'favorite_exercises' ||
    stepId === 'avoided_exercises' ||
    stepId === 'training_barriers'
  );
}

export function progressPercentForStep(
  stepId:
    | AvaliacaoStepId
    | typeof AVALIACAO_BASIC_COMPLETE_STEP
    | typeof AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP
    | typeof AVALIACAO_ENVIRONMENT_COMPLETE_STEP
    | typeof AVALIACAO_SAFETY_COMPLETE_STEP
    | typeof AVALIACAO_COMPLETED_STEP,
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): number {
  if (stepId === AVALIACAO_COMPLETED_STEP || stepId === 'completed') return 100;

  const all = getVisibleSteps(answers);
  const basicLen = getVisibleBasicSteps(answers).length;
  const profileLen = getVisibleProfileSteps(answers).length;
  const envLen = getVisibleEnvironmentSteps(answers).length;
  const safetyLen = getVisibleSafetySteps(answers).length;
  const total = all.length;
  if (total === 0) return 0;

  if (stepId === AVALIACAO_BASIC_COMPLETE_STEP) {
    return Math.round((basicLen / total) * 100);
  }

  if (stepId === AVALIACAO_TRAINING_PROFILE_COMPLETE_STEP) {
    return Math.round(((basicLen + profileLen) / total) * 100);
  }

  if (stepId === AVALIACAO_ENVIRONMENT_COMPLETE_STEP) {
    return Math.round(((basicLen + profileLen + envLen) / total) * 100);
  }

  if (stepId === AVALIACAO_SAFETY_COMPLETE_STEP) {
    return Math.round(((basicLen + profileLen + envLen + safetyLen) / total) * 100);
  }

  const idx = all.indexOf(stepId as AvaliacaoStepId);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / total) * 100);
}

export function validateStep(
  stepId: AvaliacaoStepId,
  answers: AvaliacaoAtividadeFisicaBasicAnswers
): string | null {
  switch (stepId) {
    case 'primary_goal': {
      if (!answers.primaryGoal) return 'Selecione o seu principal objetivo.';
      if (answers.primaryGoal === 'other' && !answers.primaryGoalOther?.trim()) {
        return 'Conte brevemente qual é o seu objetivo.';
      }
      return null;
    }
    case 'secondary_goals': {
      const list = answers.secondaryGoals || [];
      if (list.length === 0) return 'Selecione ao menos uma opção, ou “Nenhum objetivo adicional”.';
      if (list.includes(SECONDARY_NONE_VALUE) && list.length > 1) {
        return '“Nenhum objetivo adicional” não pode ser combinado com outras opções.';
      }
      const withoutNone = list.filter((v) => v !== SECONDARY_NONE_VALUE);
      if (withoutNone.length > 3) return 'Escolha no máximo 3 objetivos complementares.';
      return null;
    }
    case 'experience':
      if (!answers.experienceLevel) return 'Selecione sua experiência com exercícios.';
      return null;
    case 'current_activity':
      if (answers.currentlyActive !== true && answers.currentlyActive !== false) {
        return 'Responda se você pratica atividade física atualmente.';
      }
      return null;
    case 'current_activity_details': {
      const acts = answers.currentActivities || [];
      if (acts.length === 0) return 'Selecione ao menos uma atividade.';
      if (acts.includes('other') && !answers.currentActivityOther?.trim()) {
        return 'Descreva a outra atividade.';
      }
      return null;
    }
    case 'current_frequency': {
      const n = answers.currentFrequencyPerWeek;
      if (n == null || n < 1 || n > 7) return 'Selecione quantos dias por semana você pratica.';
      return null;
    }
    case 'available_days': {
      const n = answers.availableDaysPerWeek;
      if (n == null || n < 1 || n > 7) return 'Selecione quantos dias você consegue treinar.';
      return null;
    }
    case 'preferred_days': {
      if (answers.variableSchedule) return null;
      const days = answers.preferredWeekdays || [];
      if (days.length === 0) return 'Selecione os dias ou “Minha rotina varia”.';
      const max = answers.availableDaysPerWeek ?? 7;
      if (days.length > max) {
        return `Selecione no máximo ${max} dia${max === 1 ? '' : 's'} (sua disponibilidade).`;
      }
      return null;
    }
    case 'session_duration':
      if (answers.sessionDurationMinutes == null) return 'Selecione o tempo disponível por treino.';
      return null;
    case 'duration_consistency':
      if (!answers.durationConsistency) return 'Selecione se esse tempo costuma ser estável.';
      return null;
    case 'preferred_time':
      if (!answers.preferredTrainingPeriod) return 'Selecione o horário preferido.';
      return null;
    case 'training_location': {
      if (!answers.trainingLocation) return 'Selecione onde você pretende treinar.';
      if (answers.trainingLocation === 'other' && !answers.trainingLocationOther?.trim()) {
        return 'Descreva o local de treino.';
      }
      return null;
    }
    case 'body_priorities': {
      const list = answers.bodyPriorities || [];
      if (list.length === 0) return 'Selecione ao menos uma região (ou Corpo inteiro).';
      if (list.includes(BODY_PRIORITY_FULL_BODY) && list.length > 1) {
        return '“Corpo inteiro” não pode ser combinado com outras regiões.';
      }
      if (!list.includes(BODY_PRIORITY_FULL_BODY) && list.length > 3) {
        return 'Escolha no máximo 3 regiões.';
      }
      return null;
    }
    case 'preferred_modalities': {
      const list = answers.preferredModalities || [];
      if (list.length === 0) return 'Selecione ao menos uma opção.';
      if (list.includes(MODALITY_NO_PREFERENCE) && list.length > 1) {
        return '“Não tenho preferência” não pode ser combinado com outras opções.';
      }
      return null;
    }
    case 'preferred_intensity':
      if (!answers.preferredIntensity) return 'Selecione a intensidade desejada.';
      return null;
    case 'cardio_preference':
      if (!answers.cardioPreference) return 'Selecione uma opção sobre cardio.';
      return null;
    case 'cardio_activities': {
      const list = answers.preferredCardioActivities || [];
      if (list.length === 0) return 'Selecione ao menos uma atividade aeróbica.';
      if (list.includes('other') && !answers.preferredCardioOther?.trim()) {
        return 'Descreva a outra atividade aeróbica.';
      }
      return null;
    }
    case 'favorite_exercises':
    case 'avoided_exercises':
      return null;
    case 'training_barriers': {
      const list = answers.trainingBarriers || [];
      if (list.length === 0) return 'Selecione ao menos uma opção.';
      if (list.includes(BARRIER_NONE_VALUE) && list.length > 1) {
        return '“Nada costuma atrapalhar” não pode ser combinado com outras opções.';
      }
      if (list.includes('other') && !answers.trainingBarrierOther?.trim()) {
        return 'Descreva o que costuma atrapalhar.';
      }
      return null;
    }
    case 'environment_overview':
      return null;
    case 'gym_structure':
      if (!answers.gymStructureLevel) return 'Selecione como é a estrutura da academia.';
      return null;
    case 'gym_areas': {
      const list = answers.gymAvailableAreas || [];
      if (list.length === 0) return 'Selecione ao menos uma área, ou “Não sei informar”.';
      if (list.includes(GYM_AREA_UNKNOWN) && list.length > 1) {
        return '“Não sei informar” não pode ser combinado com outras opções.';
      }
      return null;
    }
    case 'home_space':
      if (!answers.homeTrainingSpace) return 'Selecione como é o espaço em casa.';
      return null;
    case 'available_equipment': {
      const list = answers.availableEquipment || [];
      if (list.length === 0) return 'Selecione ao menos uma opção.';
      if (list.includes(EQUIPMENT_NONE) && list.length > 1) {
        return '“Nenhum equipamento” não pode ser combinado com outras opções.';
      }
      if (list.includes(EQUIPMENT_UNKNOWN) && list.length > 1) {
        return '“Não sei informar” não pode ser combinado com outras opções.';
      }
      if (list.includes('other') && !answers.availableEquipmentOther?.trim()) {
        return 'Descreva o outro equipamento.';
      }
      return null;
    }
    case 'equipment_access':
      if (!answers.equipmentAccessFrequency) {
        return 'Selecione a frequência de acesso aos equipamentos.';
      }
      return null;
    case 'outdoor_spaces': {
      const list = answers.outdoorEnvironment || [];
      if (list.length === 0) return 'Selecione ao menos um espaço ao ar livre.';
      if (list.includes('other') && !answers.outdoorEnvironmentOther?.trim()) {
        return 'Descreva o outro espaço.';
      }
      return null;
    }
    case 'floor_exercises':
      if (!answers.floorExerciseAvailability) {
        return 'Selecione uma opção sobre exercícios no chão.';
      }
      return null;
    case 'environment_noise':
      if (!answers.environmentImpactNoiseRestriction) {
        return 'Selecione uma opção sobre impacto ou barulho.';
      }
      return null;
    case 'environment_notes':
      return null;
    case 'safety_overview':
      return null;
    case 'current_pain':
      if (!answers.currentPainLevel) return 'Selecione uma opção sobre dor atual.';
      return null;
    case 'pain_regions': {
      const list = answers.painRegions || [];
      if (list.length === 0) return 'Selecione ao menos uma região.';
      if (list.includes('other') && !answers.painRegionOther?.trim()) {
        return 'Descreva a outra região.';
      }
      return null;
    }
    case 'pain_triggers': {
      const list = answers.painTriggers || [];
      if (list.length === 0) return 'Selecione ao menos uma opção.';
      if (list.includes('other') && !answers.painTriggerOther?.trim()) {
        return 'Descreva quando a dor aparece.';
      }
      return null;
    }
    case 'pain_functional_impact':
      if (!answers.painFunctionalImpact) return 'Selecione o impacto da dor nas atividades.';
      return null;
    case 'relevant_injury':
      if (!answers.hasRelevantInjury) return 'Selecione uma opção sobre lesões.';
      return null;
    case 'injury_details':
      if (!answers.injuryDetails?.trim()) return 'Conte brevemente qual foi a lesão.';
      return null;
    case 'injury_movement_limitation':
      if (!answers.injuryCurrentlyLimitsMovement) {
        return 'Selecione se a lesão limita algum movimento.';
      }
      return null;
    case 'relevant_surgery':
      if (!answers.hasRelevantSurgery) return 'Selecione uma opção sobre cirurgias.';
      return null;
    case 'surgery_details':
      if (!answers.surgeryDetails?.trim()) return 'Informe qual cirurgia foi realizada.';
      return null;
    case 'surgery_timing':
      if (!answers.surgeryTiming) return 'Selecione quando a cirurgia foi realizada.';
      return null;
    case 'movement_limitations': {
      const list = answers.movementLimitations || [];
      if (list.length === 0) return 'Selecione ao menos uma opção.';
      if (list.includes(MOVEMENT_LIMITATION_NONE) && list.length > 1) {
        return '“Nenhuma limitação” não pode ser combinado com outras opções.';
      }
      if (list.includes('other') && !answers.movementLimitationOther?.trim()) {
        return 'Descreva a outra limitação.';
      }
      return null;
    }
    case 'balance_falls':
      if (!answers.balanceFallHistory) return 'Selecione uma opção sobre equilíbrio ou quedas.';
      return null;
    case 'shortness_of_breath':
      if (!answers.shortnessOfBreathOnLightEffort) {
        return 'Selecione uma opção sobre falta de ar.';
      }
      return null;
    case 'chest_symptoms':
      if (!answers.chestSymptomsDuringEffort) {
        return 'Selecione uma opção sobre sintomas no peito.';
      }
      return null;
    case 'dizziness_fainting':
      if (!answers.dizzinessOrFaintingDuringEffort) {
        return 'Selecione uma opção sobre tontura ou desmaio.';
      }
      return null;
    case 'palpitations':
      if (!answers.palpitationsDuringExercise) {
        return 'Selecione uma opção sobre palpitações.';
      }
      return null;
    case 'blood_pressure_advice':
      if (!answers.uncontrolledBloodPressureAdvice) {
        return 'Selecione uma opção sobre pressão arterial.';
      }
      return null;
    case 'professional_restriction':
      if (!answers.hasProfessionalExerciseRestriction) {
        return 'Selecione uma opção sobre restrição profissional.';
      }
      return null;
    case 'professional_restriction_details':
      if (!answers.professionalExerciseRestrictionDetails?.trim()) {
        return 'Descreva a orientação ou restrição informada.';
      }
      return null;
    case 'additional_safety_notes':
      return null;
    case 'safety_confirmation':
      if (answers.safetyAnswersConfirmed !== true && answers.safetyAnswersConfirmed !== false) {
        return 'Confirme se as informações estão corretas ou se deseja revisar.';
      }
      return null;
    case 'final_review':
      return null;
    case 'completion_confirmation':
      if (answers.finalConfirmationAccepted !== true) {
        return 'Confirme que revisou as informações antes de concluir.';
      }
      return null;
    default:
      return null;
  }
}

export function firstNameFromFullName(fullName?: string | null): string | null {
  if (!fullName?.trim()) return null;
  const first = fullName.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function bodyPriorityLabel(value: string): string {
  return BODY_PRIORITY_OPTIONS.find((o) => o.value === value)?.label || value;
}
