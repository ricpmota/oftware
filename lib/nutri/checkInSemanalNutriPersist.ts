import type { CheckInSemanalNutri, CheckInSemanalNutriAnswers, CheckInSemanalNutriQuestionnaireVersion } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION,
  parseCheckInSemanalNutriQuestionnaireVersion,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import type { NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export type CheckInSemanalNutriFirestoreDoc = Record<string, unknown>;

export type BuildCheckInSemanalNutriRecordInput = {
  pacienteId: string;
  week: NutritionWeek;
  answers: CheckInSemanalNutriAnswers;
  score: number;
  answeredBy: CheckInSemanalNutri['answeredBy'];
  source: CheckInSemanalNutri['source'];
  answeredById?: string;
  nutritionistId?: string;
  scheduledDate?: string;
  suplementosAplicaveis?: CheckInSemanalNutri['suplementosAplicaveis'];
  createdAt?: Date;
  lastEditedBy?: CheckInSemanalNutri['lastEditedBy'];
  lastEditedById?: string;
  lastEditedAt?: Date;
  questionnaireVersion?: CheckInSemanalNutriQuestionnaireVersion;
};

export function buildCheckInSemanalNutriRecord(
  input: BuildCheckInSemanalNutriRecordInput
): CheckInSemanalNutri {
  const now = new Date();
  return {
    questionnaireVersion: input.questionnaireVersion ?? CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION,
    pacienteId: input.pacienteId,
    weekKey: input.week.weekKey,
    weekStart: input.week.weekStart,
    weekEnd: input.week.weekEnd,
    isoWeek: input.week.isoWeek,
    scheduledDate: input.scheduledDate,
    ...input.answers,
    score: input.score,
    answeredBy: input.answeredBy,
    answeredById: input.answeredById,
    source: input.source,
    nutritionistId: input.nutritionistId,
    lastEditedBy: input.lastEditedBy,
    lastEditedById: input.lastEditedById,
    lastEditedAt: input.lastEditedAt,
    suplementosAplicaveis: input.suplementosAplicaveis,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function serializeCheckInSemanalNutri(
  record: CheckInSemanalNutri
): CheckInSemanalNutriFirestoreDoc {
  const payload: CheckInSemanalNutriFirestoreDoc = {
    questionnaireVersion: record.questionnaireVersion,
    pacienteId: record.pacienteId,
    weekKey: record.weekKey,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    isoWeek: record.isoWeek ?? null,
    aderenciaPlano: record.aderenciaPlano,
    nauseas: record.nauseas,
    constipacao: record.constipacao,
    diarreia: record.diarreia,
    energiaSemana: record.energiaSemana ?? null,
    sessoesAtividadeFisica: record.sessoesAtividadeFisica ?? null,
    principalDificuldade: record.principalDificuldade ?? '',
    principalConquista: record.principalConquista ?? '',
    observacoes: record.observacoes ?? '',
    score: record.score ?? null,
    answeredBy: record.answeredBy,
    source: record.source,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };

  if (record.principalDificuldadeTipo) payload.principalDificuldadeTipo = record.principalDificuldadeTipo;
  if (record.principalDificuldadeOutra) payload.principalDificuldadeOutra = record.principalDificuldadeOutra;
  if (record.principalConquistaTipo) payload.principalConquistaTipo = record.principalConquistaTipo;
  if (record.principalConquistaOutra) payload.principalConquistaOutra = record.principalConquistaOutra;
  if (record.scheduledDate) payload.scheduledDate = record.scheduledDate;
  if (record.nutritionistId) payload.nutritionistId = record.nutritionistId;
  if (record.answeredById) payload.answeredById = record.answeredById;
  if (record.lastEditedBy) payload.lastEditedBy = record.lastEditedBy;
  if (record.lastEditedById) payload.lastEditedById = record.lastEditedById;
  if (record.lastEditedAt) payload.lastEditedAt = record.lastEditedAt;
  if (record.diasProteinaMeta != null) payload.diasProteinaMeta = record.diasProteinaMeta;
  if (record.diasFrutasVegetais != null) payload.diasFrutasVegetais = record.diasFrutasVegetais;
  if (record.alimentacaoForaPlano) payload.alimentacaoForaPlano = record.alimentacaoForaPlano;
  if (record.diasMetaAgua != null) payload.diasMetaAgua = record.diasMetaAgua;
  if (record.dailyAdherence) payload.dailyAdherence = record.dailyAdherence;
  if (record.diasBons != null) payload.diasBons = record.diasBons;
  if (record.diasRegulares != null) payload.diasRegulares = record.diasRegulares;
  if (record.diasRuins != null) payload.diasRuins = record.diasRuins;
  if (record.mealAdherence) payload.mealAdherence = record.mealAdherence;
  if (record.foodSwapRequests) payload.foodSwapRequests = record.foodSwapRequests;
  if (record.hydrationQuality) payload.hydrationQuality = record.hydrationQuality;
  if (record.menuSnapshot) payload.menuSnapshot = record.menuSnapshot;
  if (record.atividadeFisicaPorDia) payload.atividadeFisicaPorDia = record.atividadeFisicaPorDia;
  if (record.principalDificuldadeTipos?.length) payload.principalDificuldadeTipos = record.principalDificuldadeTipos;
  if (record.principalConquistaTipos?.length) payload.principalConquistaTipos = record.principalConquistaTipos;

  return payload;
}

export function deserializeCheckInSemanalNutri(
  data: CheckInSemanalNutriFirestoreDoc,
  fallbackWeekKey: string
): CheckInSemanalNutri {
  const weekKey = typeof data.weekKey === 'string' ? data.weekKey : fallbackWeekKey;
  return {
    questionnaireVersion: parseCheckInSemanalNutriQuestionnaireVersion(data.questionnaireVersion),
    pacienteId: String(data.pacienteId ?? ''),
    weekKey,
    weekStart: String(data.weekStart ?? weekKey),
    weekEnd: String(data.weekEnd ?? weekKey),
    isoWeek: typeof data.isoWeek === 'number' ? data.isoWeek : undefined,
    scheduledDate: typeof data.scheduledDate === 'string' ? data.scheduledDate : undefined,
    aderenciaPlano: Number(data.aderenciaPlano ?? 0),
    diasProteinaMeta: optionalNumber(data.diasProteinaMeta),
    diasFrutasVegetais: optionalNumber(data.diasFrutasVegetais),
    alimentacaoForaPlano: (data.alimentacaoForaPlano as CheckInSemanalNutri['alimentacaoForaPlano']) || undefined,
    diasMetaAgua: optionalNumber(data.diasMetaAgua),
    probioticoDias: optionalNumber(data.probioticoDias) ?? null,
    wheyDias: optionalNumber(data.wheyDias) ?? null,
    creatinaDias: optionalNumber(data.creatinaDias) ?? null,
    nauseas: (data.nauseas as CheckInSemanalNutri['nauseas']) || 'nenhum',
    constipacao: (data.constipacao as CheckInSemanalNutri['constipacao']) || 'nenhum',
    diarreia: (data.diarreia as CheckInSemanalNutri['diarreia']) || 'nenhum',
    mediaSono: (data.mediaSono as CheckInSemanalNutri['mediaSono']) || undefined,
    energiaSemana: optionalNumber(data.energiaSemana),
    sessoesAtividadeFisica: optionalNumber(data.sessoesAtividadeFisica),
    principalDificuldadeTipo:
      (data.principalDificuldadeTipo as CheckInSemanalNutri['principalDificuldadeTipo']) || undefined,
    principalDificuldadeOutra: String(data.principalDificuldadeOutra ?? '').trim() || undefined,
    principalDificuldade: String(data.principalDificuldade ?? '').trim() || undefined,
    principalConquistaTipo:
      (data.principalConquistaTipo as CheckInSemanalNutri['principalConquistaTipo']) || undefined,
    principalConquistaOutra: String(data.principalConquistaOutra ?? '').trim() || undefined,
    principalConquista: String(data.principalConquista ?? '').trim() || undefined,
    observacoes: String(data.observacoes ?? '').trim() || undefined,
    dailyAdherence: data.dailyAdherence && typeof data.dailyAdherence === 'object'
      ? (data.dailyAdherence as CheckInSemanalNutri['dailyAdherence'])
      : undefined,
    diasBons: optionalNumber(data.diasBons),
    diasRegulares: optionalNumber(data.diasRegulares),
    diasRuins: optionalNumber(data.diasRuins),
    mealAdherence: Array.isArray(data.mealAdherence)
      ? (data.mealAdherence as CheckInSemanalNutri['mealAdherence'])
      : undefined,
    foodSwapRequests: Array.isArray(data.foodSwapRequests)
      ? (data.foodSwapRequests as CheckInSemanalNutri['foodSwapRequests'])
      : undefined,
    hydrationQuality: data.hydrationQuality as CheckInSemanalNutri['hydrationQuality'],
    menuSnapshot:
      data.menuSnapshot && typeof data.menuSnapshot === 'object'
        ? (data.menuSnapshot as CheckInSemanalNutri['menuSnapshot'])
        : undefined,
    atividadeFisicaPorDia:
      data.atividadeFisicaPorDia && typeof data.atividadeFisicaPorDia === 'object'
        ? (data.atividadeFisicaPorDia as CheckInSemanalNutri['atividadeFisicaPorDia'])
        : undefined,
    principalDificuldadeTipos: Array.isArray(data.principalDificuldadeTipos)
      ? (data.principalDificuldadeTipos as CheckInSemanalNutri['principalDificuldadeTipos'])
      : undefined,
    principalConquistaTipos: Array.isArray(data.principalConquistaTipos)
      ? (data.principalConquistaTipos as CheckInSemanalNutri['principalConquistaTipos'])
      : undefined,
    score: optionalNumber(data.score),
    answeredBy: (data.answeredBy as CheckInSemanalNutri['answeredBy']) || 'patient',
    answeredById: typeof data.answeredById === 'string' ? data.answeredById : undefined,
    source: (data.source as CheckInSemanalNutri['source']) || 'patient_meta',
    nutritionistId: typeof data.nutritionistId === 'string' ? data.nutritionistId : undefined,
    lastEditedBy: (data.lastEditedBy as CheckInSemanalNutri['lastEditedBy']) || undefined,
    lastEditedById: typeof data.lastEditedById === 'string' ? data.lastEditedById : undefined,
    lastEditedAt: toDate(data.lastEditedAt),
    suplementosAplicaveis:
      data.suplementosAplicaveis && typeof data.suplementosAplicaveis === 'object'
        ? (data.suplementosAplicaveis as CheckInSemanalNutri['suplementosAplicaveis'])
        : undefined,
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}
