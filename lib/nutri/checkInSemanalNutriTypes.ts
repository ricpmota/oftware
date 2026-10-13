import type { NutritionWeekdayKey } from '@/lib/nutri/checkInSemanalNutriWeek';
import type {
  CheckInDailyAdherence,
  CheckInFoodSwapRequest,
  CheckInMealAdherenceItem,
  CheckInMenuSnapshot,
  HydrationQuality,
} from '@/lib/nutri/checkInSemanalNutriV3';

export const CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V1 = 'nutri_weekly_v1' as const;
export const CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V2 = 'nutri_weekly_v2' as const;
export const CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V3 = 'nutri_weekly_v3' as const;
export const CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION = CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V3;

export type CheckInSemanalNutriQuestionnaireVersion =
  | typeof CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V1
  | typeof CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V2
  | typeof CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V3;

export type CheckInSemanalNutriAlimentacaoForaPlano =
  | 'nenhuma'
  | 'pouca'
  | 'moderada'
  | 'frequente';

export type CheckInSemanalNutriSeveridadeGI = 'nenhum' | 'leve' | 'moderado' | 'grave';

/** Legado V1 — não coletado na V2. */
export type CheckInSemanalNutriMediaSono = 'menos_6h' | '6_8h' | 'mais_8h';

export type CheckInSemanalNutriDificuldadeTipo =
  | 'falta_tempo'
  | 'comer_fora'
  | 'eventos_sociais'
  | 'vontade_doces'
  | 'fome_aumentada'
  | 'ansiedade'
  | 'horarios'
  | 'falta_alimentos'
  | 'sem_dificuldade'
  | 'outra';

export type CheckInSemanalNutriConquistaTipo =
  | 'aderencia'
  | 'organizacao'
  | 'proteina'
  | 'hidratacao'
  | 'frutas_vegetais'
  | 'reduziu_extras'
  | 'boas_escolhas_fora'
  | 'controle_fome'
  | 'atividade'
  | 'sem_conquista'
  | 'outra';

export type CheckInSemanalNutriAnsweredBy = 'patient' | 'nutritionist' | 'doctor';

export type CheckInSemanalNutriWizardMode = 'patient' | 'nutritionist' | 'public';

export type CheckInSemanalNutriSource =
  | 'patient_meta'
  | 'patient_public_link'
  | 'nutritionist'
  | 'doctor';

export type CheckInSemanalNutriStatus = 'upcoming' | 'pending' | 'completed';

/** Legado V1. */
export type CheckInSemanalNutriSuplementosAplicaveis = {
  probiotico: boolean;
  whey: boolean;
  creatina: boolean;
};

/** Respostas do questionário (V3 + campos opcionais de V1/V2). */
export type CheckInSemanalNutriAnswers = {
  aderenciaPlano: number;
  diasProteinaMeta?: number;
  diasFrutasVegetais?: number;
  alimentacaoForaPlano?: CheckInSemanalNutriAlimentacaoForaPlano;
  diasMetaAgua?: number;
  probioticoDias?: number | null;
  wheyDias?: number | null;
  creatinaDias?: number | null;
  nauseas: CheckInSemanalNutriSeveridadeGI;
  constipacao: CheckInSemanalNutriSeveridadeGI;
  diarreia: CheckInSemanalNutriSeveridadeGI;
  mediaSono?: CheckInSemanalNutriMediaSono;
  energiaSemana?: number;
  sessoesAtividadeFisica?: number;
  atividadeFisicaPorDia?: Partial<Record<NutritionWeekdayKey, string>>;
  principalDificuldadeTipo?: CheckInSemanalNutriDificuldadeTipo;
  principalDificuldadeTipos?: CheckInSemanalNutriDificuldadeTipo[];
  principalDificuldadeOutra?: string;
  principalDificuldade?: string;
  principalConquistaTipo?: CheckInSemanalNutriConquistaTipo;
  principalConquistaTipos?: CheckInSemanalNutriConquistaTipo[];
  principalConquistaOutra?: string;
  principalConquista?: string;
  observacoes?: string;
  dailyAdherence?: CheckInDailyAdherence;
  diasBons?: number;
  diasRegulares?: number;
  diasRuins?: number;
  mealAdherence?: CheckInMealAdherenceItem[];
  foodSwapRequests?: CheckInFoodSwapRequest[];
  hydrationQuality?: HydrationQuality;
  menuSnapshot?: CheckInMenuSnapshot;
};

export type CheckInSemanalNutri = CheckInSemanalNutriAnswers & {
  questionnaireVersion: CheckInSemanalNutriQuestionnaireVersion;
  pacienteId: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  isoWeek?: number;
  scheduledDate?: string;
  score?: number;
  answeredBy: CheckInSemanalNutriAnsweredBy;
  answeredById?: string;
  source: CheckInSemanalNutriSource;
  nutritionistId?: string;
  lastEditedBy?: CheckInSemanalNutriAnsweredBy;
  lastEditedById?: string;
  lastEditedAt?: Date;
  suplementosAplicaveis?: CheckInSemanalNutriSuplementosAplicaveis;
  createdAt: Date;
  updatedAt: Date;
};

export const CHECKIN_SEMANAL_NUTRI_COLLECTION = 'checkinsSemanais';

export function checkInSemanalNutriDocSegments(
  pacienteId: string,
  weekKey: string
): [string, string, string, string, string, string] {
  return [
    'pacientes_completos',
    pacienteId,
    'nutricao',
    'dados',
    CHECKIN_SEMANAL_NUTRI_COLLECTION,
    weekKey,
  ];
}

export const SUPLEMENTOS_APLICAVEIS_TODOS: CheckInSemanalNutriSuplementosAplicaveis = {
  probiotico: true,
  whey: true,
  creatina: true,
};

export function parseCheckInSemanalNutriQuestionnaireVersion(
  value: unknown
): CheckInSemanalNutriQuestionnaireVersion {
  if (value === CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V1) {
    return CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V1;
  }
  if (value === CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V3) {
    return CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V3;
  }
  return CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V2;
}

export function isWeeklyNutritionQuestionnaireV3(
  version?: CheckInSemanalNutriQuestionnaireVersion | string | null
): boolean {
  return version === CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION_V3;
}
