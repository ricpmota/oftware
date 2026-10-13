import type { CheckInSemanalNutri, CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import { isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import type { HydrationQuality } from '@/lib/nutri/checkInSemanalNutriV3';

export type WeeklyNutritionCheckInFlagId =
  | 'low_adherence'
  | 'low_protein'
  | 'low_hydration'
  | 'moderate_nausea'
  | 'severe_nausea'
  | 'moderate_constipation'
  | 'severe_constipation'
  | 'moderate_diarrhea'
  | 'severe_diarrhea'
  | 'low_energy';

export type WeeklyNutritionCheckInFlag = {
  id: WeeklyNutritionCheckInFlagId;
  label: string;
};

const ADHERENCE_INSTRUMENT_FLAGS = new Set<WeeklyNutritionCheckInFlagId>([
  'low_adherence',
  'low_protein',
  'low_hydration',
]);

export function isWeeklyNutritionAdherenceInstrumentFlag(flag: string): boolean {
  return ADHERENCE_INSTRUMENT_FLAGS.has(flag as WeeklyNutritionCheckInFlagId);
}

function usesV3(
  record: Pick<CheckInSemanalNutriAnswers, 'dailyAdherence'> & {
    questionnaireVersion?: CheckInSemanalNutri['questionnaireVersion'];
  }
): boolean {
  return isWeeklyNutritionQuestionnaireV3(record.questionnaireVersion) || Boolean(record.dailyAdherence);
}

export function getWeeklyNutritionCheckInFlags(
  record: Pick<
    CheckInSemanalNutriAnswers,
    | 'aderenciaPlano'
    | 'diasProteinaMeta'
    | 'diasMetaAgua'
    | 'nauseas'
    | 'constipacao'
    | 'diarreia'
    | 'energiaSemana'
    | 'dailyAdherence'
    | 'hydrationQuality'
  > & {
    questionnaireVersion?: CheckInSemanalNutri['questionnaireVersion'];
  }
): WeeklyNutritionCheckInFlag[] {
  const flags: WeeklyNutritionCheckInFlag[] = [];
  const v3 = usesV3(record);
  if ((record.aderenciaPlano ?? 0) < 50) {
    flags.push({ id: 'low_adherence', label: `Aderência ${record.aderenciaPlano ?? 0}%` });
  }
  if (!v3) {
    if (record.diasProteinaMeta != null && record.diasProteinaMeta <= 2) {
      flags.push({
        id: 'low_protein',
        label: `Meta de proteína atingida em apenas ${record.diasProteinaMeta} dia(s)`,
      });
    }
    if (record.diasMetaAgua != null && record.diasMetaAgua <= 2) {
      flags.push({
        id: 'low_hydration',
        label: `Meta de água atingida em apenas ${record.diasMetaAgua} dia(s)`,
      });
    }
  } else if ((record.hydrationQuality as HydrationQuality | undefined) === 'poor') {
    flags.push({ id: 'low_hydration', label: 'Hidratação ruim' });
  }
  if (record.nauseas === 'moderado') flags.push({ id: 'moderate_nausea', label: 'Náusea moderada' });
  if (record.nauseas === 'grave') flags.push({ id: 'severe_nausea', label: 'Náusea grave' });
  if (record.constipacao === 'moderado') {
    flags.push({ id: 'moderate_constipation', label: 'Constipação moderada' });
  }
  if (record.constipacao === 'grave') flags.push({ id: 'severe_constipation', label: 'Constipação grave' });
  if (record.diarreia === 'moderado') flags.push({ id: 'moderate_diarrhea', label: 'Diarreia moderada' });
  if (record.diarreia === 'grave') flags.push({ id: 'severe_diarrhea', label: 'Diarreia grave' });
  if (record.energiaSemana != null) {
    const low = record.energiaSemana > 5 ? record.energiaSemana <= 40 : record.energiaSemana <= 2;
    if (low) {
      flags.push({
        id: 'low_energy',
        label: record.energiaSemana > 5 ? `Energia ${record.energiaSemana}%` : `Energia ${record.energiaSemana}/5`,
      });
    }
  }
  return flags;
}

export type WeeklyNutritionMetricDelta = {
  current: number | null;
  previous: number | null;
  delta: number | null;
};

export type WeeklyNutritionCheckInComparison = {
  score: WeeklyNutritionMetricDelta;
  aderencia: WeeklyNutritionMetricDelta;
  proteina: WeeklyNutritionMetricDelta;
  agua: WeeklyNutritionMetricDelta;
  instrumentChanged: boolean;
};

function metric(current?: number | null, previous?: number | null): WeeklyNutritionMetricDelta {
  const cur = current == null || !Number.isFinite(current) ? null : current;
  const prev = previous == null || !Number.isFinite(previous) ? null : previous;
  const delta = cur == null || prev == null ? null : Math.round((cur - prev) * 10) / 10;
  return { current: cur, previous: prev, delta };
}

export function sameWeeklyNutritionInstrument(
  current?: { questionnaireVersion?: string | null } | null,
  previous?: { questionnaireVersion?: string | null } | null
): boolean {
  const currentVersion = current?.questionnaireVersion;
  const previousVersion = previous?.questionnaireVersion;
  if (!currentVersion || !previousVersion) return true;
  return currentVersion === previousVersion;
}

export function compareWeeklyNutritionCheckIns(
  current?: Pick<
    CheckInSemanalNutri,
    'score' | 'aderenciaPlano' | 'diasProteinaMeta' | 'diasMetaAgua' | 'questionnaireVersion'
  > | null,
  previous?: Pick<
    CheckInSemanalNutri,
    'score' | 'aderenciaPlano' | 'diasProteinaMeta' | 'diasMetaAgua' | 'questionnaireVersion'
  > | null
): WeeklyNutritionCheckInComparison {
  const instrumentChanged = Boolean(
    current?.questionnaireVersion &&
      previous?.questionnaireVersion &&
      current.questionnaireVersion !== previous.questionnaireVersion
  );
  if (instrumentChanged) {
    const empty = metric(null, null);
    return {
      score: empty,
      aderencia: empty,
      proteina: empty,
      agua: empty,
      instrumentChanged: true,
    };
  }
  return {
    score: metric(current?.score, previous?.score),
    aderencia: metric(current?.aderenciaPlano, previous?.aderenciaPlano),
    proteina: metric(current?.diasProteinaMeta, previous?.diasProteinaMeta),
    agua: metric(current?.diasMetaAgua, previous?.diasMetaAgua),
    instrumentChanged: false,
  };
}
