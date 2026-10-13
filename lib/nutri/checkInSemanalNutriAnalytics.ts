import type { WeeklyNutritionCheckInFlagId } from '@/lib/nutri/checkInSemanalNutriFlags';
import {
  getWeeklyNutritionCheckInFlags,
  isWeeklyNutritionAdherenceInstrumentFlag,
} from '@/lib/nutri/checkInSemanalNutriFlags';
import {
  PRINCIPAL_CONQUISTA_OPCOES,
  PRINCIPAL_DIFICULDADE_OPCOES,
} from '@/lib/nutri/checkInSemanalNutriQuestions';
import type {
  CheckInSemanalNutri,
  CheckInSemanalNutriConquistaTipo,
  CheckInSemanalNutriDificuldadeTipo,
  CheckInSemanalNutriQuestionnaireVersion,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  DAILY_ADHERENCE_POINTS,
  HYDRATION_QUALITY_POINTS,
  MEAL_ADHERENCE_POINTS,
  hasWeekendAdherenceProblem,
  isCompleteDailyAdherence,
  rotuloMealAdherence,
  type CheckInDailyAdherence,
  type CheckInFoodSwapRequest,
  type MealAdherenceStatus,
} from '@/lib/nutri/checkInSemanalNutriV3';
import {
  NUTRITION_WEEKDAY_KEYS,
  formatNutritionWeekShortLabel,
  getNutritionWeek,
  type NutritionWeekdayKey,
} from '@/lib/nutri/checkInSemanalNutriWeek';

/** Janela de recorrência: últimas N respostas (não semanas civis). */
export const WEEKLY_NUTRITION_ATTENTION_WINDOW = 4;
/** Tendência: últimas N respostas. */
export const WEEKLY_NUTRITION_TREND_WINDOW = 3;
/** Recorrente se ocorrer pelo menos 2 vezes na janela. */
export const WEEKLY_NUTRITION_RECURRING_MIN = 2;
const FLAG_TREND_LABEL: Record<WeeklyNutritionCheckInFlagId, string> = {
  low_adherence: 'Aderência baixa',
  low_protein: 'Proteína baixa',
  low_hydration: 'Hidratação baixa',
  moderate_nausea: 'Náusea moderada',
  severe_nausea: 'Náusea grave',
  moderate_constipation: 'Constipação moderada',
  severe_constipation: 'Constipação grave',
  moderate_diarrhea: 'Diarreia moderada',
  severe_diarrhea: 'Diarreia grave',
  low_energy: 'Energia baixa',
};
const TREND_IMPROVING_MIN = 4;

export type WeeklyNutritionTrend = 'improving' | 'stable' | 'declining' | 'insufficient_data';

export type WeeklyNutritionSeriesPoint = {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  label: string;
  value: number;
  questionnaireVersion?: CheckInSemanalNutriQuestionnaireVersion;
};

export type WeeklyNutritionDelta = {
  current: number | null;
  previous: number | null;
  delta: number | null;
};

export type WeeklyNutritionHabitId = 'proteina' | 'hidratacao' | 'atividade' | 'energia';

export type WeeklyNutritionHabit = {
  id: WeeklyNutritionHabitId;
  label: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  unit: 'days' | 'sessions' | 'scale' | 'quality';
  /** Valores das semanas respondidas, mais antiga → mais recente. Sem zero fictício. */
  series: number[];
};

export type WeeklyNutritionAttentionTrend = {
  flag: string;
  label: string;
  occurrences: number;
  evaluatedWeeks: number;
  lastOccurrenceWeekKey: string | null;
  recurring: boolean;
};

export type WeeklyNutritionCountedItem = {
  id: string;
  label: string;
  count: number;
  otherText?: string;
};

export type WeeklyNutritionHistoryItem = {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  label: string;
  score: number | null;
  delta: number | null;
  questionnaireVersion?: CheckInSemanalNutriQuestionnaireVersion;
  instrumentChanged?: boolean;
};

export type WeeklyNutritionWeekdayPattern = {
  key: NutritionWeekdayKey;
  good: number;
  regular: number;
  bad: number;
  averagePoints: number | null;
};

export type WeeklyNutritionMealPattern = {
  mealId: string;
  mealLabel: string;
  latestStatus?: MealAdherenceStatus;
  averagePoints: number | null;
  count: number;
};

export type WeeklyNutritionAnalytics = {
  latest: CheckInSemanalNutri | null;
  previous: CheckInSemanalNutri | null;
  deltas: {
    score: WeeklyNutritionDelta;
    aderencia: WeeklyNutritionDelta;
    hidratacao: WeeklyNutritionDelta;
    atividade: WeeklyNutritionDelta;
    proteina: WeeklyNutritionDelta;
    energia: WeeklyNutritionDelta;
  };
  trend: WeeklyNutritionTrend;
  trendDelta: number | null;
  scoreSeries: WeeklyNutritionSeriesPoint[];
  adherenceSeries: WeeklyNutritionSeriesPoint[];
  habits: WeeklyNutritionHabit[];
  attentionFlags: WeeklyNutritionAttentionTrend[];
  difficulties: WeeklyNutritionCountedItem[];
  otherDifficulties: WeeklyNutritionCountedItem[];
  achievements: WeeklyNutritionCountedItem[];
  otherAchievements: WeeklyNutritionCountedItem[];
  history: WeeklyNutritionHistoryItem[];
  instrumentChanged: boolean;
  dailyAdherenceSeries: Array<{
    weekKey: string;
    daily: CheckInDailyAdherence;
    aderenciaPlano: number;
  }>;
  weekdayPatterns: WeeklyNutritionWeekdayPattern[];
  weekendPatterns: {
    saturday: WeeklyNutritionWeekdayPattern;
    sunday: WeeklyNutritionWeekdayPattern;
  } | null;
  mealAdherence: WeeklyNutritionMealPattern[];
  mealDifficultyFrequency: Array<{ status: MealAdherenceStatus; label: string; count: number }>;
  foodSwapRequests: CheckInFoodSwapRequest[];
  weekendInsight: string | null;
  /**
   * Sinais para a ETAPA 08B (carteira).
   * Não classifica o paciente nesta etapa.
   */
  portfolioSignals: {
    trend: WeeklyNutritionTrend;
    recurringAttentionCount: number;
    latestScore: number | null;
    weekendAdherenceProblem: boolean;
    pendingFoodSwapRequests: number;
    mealAdherenceProblems: number;
  };
};

function num(value?: number | null): number | null {
  return value == null || !Number.isFinite(value) ? null : value;
}

function deltaOf(current?: number | null, previous?: number | null): WeeklyNutritionDelta {
  const cur = num(current);
  const prev = num(previous);
  return {
    current: cur,
    previous: prev,
    delta: cur == null || prev == null ? null : Math.round((cur - prev) * 10) / 10,
  };
}

export function sortWeeklyNutritionCheckInsOldestFirst(
  checkIns: CheckInSemanalNutri[]
): CheckInSemanalNutri[] {
  return [...checkIns].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

export function sortWeeklyNutritionCheckInsNewestFirst(
  checkIns: CheckInSemanalNutri[]
): CheckInSemanalNutri[] {
  return [...checkIns].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

function point(record: CheckInSemanalNutri, value: number): WeeklyNutritionSeriesPoint {
  const week = getNutritionWeek(record.weekStart || record.weekKey);
  return {
    weekKey: record.weekKey,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    label: formatNutritionWeekShortLabel(week),
    value,
    questionnaireVersion: record.questionnaireVersion,
  };
}

function comparablePrevious(
  latest: CheckInSemanalNutri | null,
  previous: CheckInSemanalNutri | null
): CheckInSemanalNutri | null {
  if (!latest || !previous) return null;
  if (latest.questionnaireVersion !== previous.questionnaireVersion) return null;
  return previous;
}

export function buildWeekendAdherenceInsight(checkInsNewestFirst: CheckInSemanalNutri[]): string | null {
  const window = checkInsNewestFirst.filter((record) => isCompleteDailyAdherence(record.dailyAdherence)).slice(0, 4);
  if (window.length < 3) return null;
  let weekendBad = 0;
  let weekdayBad = 0;
  for (const record of window) {
    const daily = record.dailyAdherence;
    if (!daily) continue;
    for (const key of NUTRITION_WEEKDAY_KEYS) {
      if (daily[key] !== 'bad') continue;
      if (key === 'saturday' || key === 'sunday') weekendBad += 1;
      else weekdayBad += 1;
    }
  }
  const totalBad = weekendBad + weekdayBad;
  if (totalBad < 3) return null;
  if (weekendBad >= weekdayBad && weekendBad / totalBad >= 0.5) {
    return 'Sábado e domingo concentram mais avaliações "Ruim".';
  }
  return null;
}

export function resolveWeeklyNutritionScoreTrend(scoresOldestFirst: number[]): {
  trend: WeeklyNutritionTrend;
  trendDelta: number | null;
} {
  if (scoresOldestFirst.length < WEEKLY_NUTRITION_TREND_WINDOW) {
    return { trend: 'insufficient_data', trendDelta: null };
  }
  const window = scoresOldestFirst.slice(-WEEKLY_NUTRITION_TREND_WINDOW);
  const trendDelta = Math.round((window[window.length - 1] - window[0]) * 10) / 10;
  if (trendDelta >= TREND_IMPROVING_MIN) return { trend: 'improving', trendDelta };
  if (trendDelta <= -TREND_IMPROVING_MIN) return { trend: 'declining', trendDelta };
  return { trend: 'stable', trendDelta };
}

export function buildWeeklyNutritionAttentionTrends(
  checkInsNewestFirst: CheckInSemanalNutri[],
  windowSize = WEEKLY_NUTRITION_ATTENTION_WINDOW,
  options?: { latestVersion?: CheckInSemanalNutriQuestionnaireVersion | null }
): WeeklyNutritionAttentionTrend[] {
  const window = checkInsNewestFirst.slice(0, windowSize);
  const evaluatedWeeks = window.length;
  if (evaluatedWeeks === 0) return [];
  const byFlag = new Map<string, WeeklyNutritionAttentionTrend>();
  for (const record of window) {
    for (const flag of getWeeklyNutritionCheckInFlags(record)) {
      if (
        options?.latestVersion &&
        isWeeklyNutritionAdherenceInstrumentFlag(flag.id) &&
        record.questionnaireVersion !== options.latestVersion
      ) {
        continue;
      }
      const existing = byFlag.get(flag.id);
      if (existing) {
        existing.occurrences += 1;
        continue;
      }
      byFlag.set(flag.id, {
        flag: flag.id,
        label: FLAG_TREND_LABEL[flag.id] ?? flag.label,
        occurrences: 1,
        evaluatedWeeks,
        lastOccurrenceWeekKey: record.weekKey,
        recurring: false,
      });
    }
  }
  return [...byFlag.values()]
    .map((item) => ({
      ...item,
      evaluatedWeeks,
      recurring: item.occurrences >= WEEKLY_NUTRITION_RECURRING_MIN,
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.label.localeCompare(b.label, 'pt-BR'));
}

function dificuldadeLabel(tipo: CheckInSemanalNutriDificuldadeTipo): string {
  return PRINCIPAL_DIFICULDADE_OPCOES.find((o) => o.value === tipo)?.label ?? tipo;
}

function conquistaLabel(tipo: CheckInSemanalNutriConquistaTipo): string {
  return PRINCIPAL_CONQUISTA_OPCOES.find((o) => o.value === tipo)?.label ?? tipo;
}

function countStandardized<T extends string>(
  items: Array<{ tipo?: T | null; skip?: T }>,
  skip: T,
  labelOf: (tipo: T) => string
): WeeklyNutritionCountedItem[] {
  const counts = new Map<T, number>();
  for (const item of items) {
    const tipo = item.tipo;
    if (!tipo || tipo === skip) continue;
    counts.set(tipo, (counts.get(tipo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: labelOf(id), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

function countOtherTexts(texts: Array<string | undefined>): WeeklyNutritionCountedItem[] {
  const counts = new Map<string, number>();
  for (const raw of texts) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase('pt-BR');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const original = texts.find((t) => String(t || '').trim().toLocaleLowerCase('pt-BR') === key) || key;
      return { id: `outra:${key}`, label: String(original).trim(), count, otherText: String(original).trim() };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
}

function emptyWeekdayPattern(key: NutritionWeekdayKey): WeeklyNutritionWeekdayPattern {
  return { key, good: 0, regular: 0, bad: 0, averagePoints: null };
}

function buildWeekdayPatterns(records: CheckInSemanalNutri[]): WeeklyNutritionWeekdayPattern[] {
  return NUTRITION_WEEKDAY_KEYS.map((key) => {
    const ratings = records
      .map((record) => record.dailyAdherence?.[key])
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
    if (ratings.length === 0) return emptyWeekdayPattern(key);
    const points = ratings.reduce((sum, rating) => sum + DAILY_ADHERENCE_POINTS[rating], 0);
    return {
      key,
      good: ratings.filter((value) => value === 'good').length,
      regular: ratings.filter((value) => value === 'regular').length,
      bad: ratings.filter((value) => value === 'bad').length,
      averagePoints: Math.round(points / ratings.length),
    };
  });
}

function buildMealPatterns(recordsNewestFirst: CheckInSemanalNutri[]): WeeklyNutritionMealPattern[] {
  const byMeal = new Map<string, { mealLabel: string; points: number[]; latestStatus?: MealAdherenceStatus }>();
  for (const record of recordsNewestFirst) {
    for (const meal of record.mealAdherence || []) {
      const existing = byMeal.get(meal.mealId) || { mealLabel: meal.mealLabel, points: [] };
      if (!existing.latestStatus) existing.latestStatus = meal.status;
      existing.points.push(MEAL_ADHERENCE_POINTS[meal.status]);
      byMeal.set(meal.mealId, existing);
    }
  }
  return [...byMeal.entries()]
    .map(([mealId, row]) => ({
      mealId,
      mealLabel: row.mealLabel,
      latestStatus: row.latestStatus,
      averagePoints: row.points.length ? Math.round(row.points.reduce((a, b) => a + b, 0) / row.points.length) : null,
      count: row.points.length,
    }))
    .sort((a, b) => a.mealLabel.localeCompare(b.mealLabel, 'pt-BR'));
}

export function buildWeeklyNutritionAnalytics(
  checkIns: CheckInSemanalNutri[]
): WeeklyNutritionAnalytics {
  const oldestFirst = sortWeeklyNutritionCheckInsOldestFirst(checkIns);
  const newestFirst = sortWeeklyNutritionCheckInsNewestFirst(checkIns);
  const latest = newestFirst[0] ?? null;
  const previous = newestFirst[1] ?? null;
  const comparable = comparablePrevious(latest, previous);
  const instrumentChanged = Boolean(latest && previous && !comparable);
  const sameVersionOldestFirst = latest
    ? oldestFirst.filter((record) => record.questionnaireVersion === latest.questionnaireVersion)
    : oldestFirst;
  const scores = sameVersionOldestFirst
    .map((r) => r.score)
    .filter((s): s is number => s != null && Number.isFinite(s));
  const { trend, trendDelta } = resolveWeeklyNutritionScoreTrend(scores);

  const emptyDelta = deltaOf(null, null);
  const latestIsV3 = isWeeklyNutritionQuestionnaireV3(latest?.questionnaireVersion);
  const hydrationCurrent = latestIsV3
    ? latest?.hydrationQuality
      ? HYDRATION_QUALITY_POINTS[latest.hydrationQuality]
      : null
    : num(latest?.diasMetaAgua);
  const hydrationPrevious = latestIsV3
    ? comparable?.hydrationQuality
      ? HYDRATION_QUALITY_POINTS[comparable.hydrationQuality]
      : null
    : num(comparable?.diasMetaAgua);
  const deltas = {
    score: deltaOf(latest?.score, comparable?.score),
    aderencia: deltaOf(latest?.aderenciaPlano, comparable?.aderenciaPlano),
    hidratacao: deltaOf(hydrationCurrent, hydrationPrevious),
    atividade: deltaOf(latest?.sessoesAtividadeFisica, previous?.sessoesAtividadeFisica),
    proteina: latestIsV3 ? emptyDelta : deltaOf(latest?.diasProteinaMeta, comparable?.diasProteinaMeta),
    energia: deltaOf(latest?.energiaSemana, previous?.energiaSemana),
  };
  const attentionFlags = buildWeeklyNutritionAttentionTrends(newestFirst, WEEKLY_NUTRITION_ATTENTION_WINDOW, {
    latestVersion: latest?.questionnaireVersion,
  });
  const v3Records = oldestFirst.filter((record) => isCompleteDailyAdherence(record.dailyAdherence));
  const weekdayPatterns = buildWeekdayPatterns(v3Records);
  const mealAdherence = buildMealPatterns(newestFirst.filter((record) => (record.mealAdherence || []).length > 0));
  const mealDifficultyFrequencyMap = new Map<MealAdherenceStatus, number>();
  for (const record of newestFirst) {
    for (const meal of record.mealAdherence || []) {
      mealDifficultyFrequencyMap.set(meal.status, (mealDifficultyFrequencyMap.get(meal.status) ?? 0) + 1);
    }
  }
  const foodSwapRequests = latest?.foodSwapRequests || [];
  const weekendInsight = buildWeekendAdherenceInsight(newestFirst);
  const mealAdherenceProblems = (latest?.mealAdherence || []).filter(
    (meal) => meal.status === 'skipped' || meal.status === 'not_followed' || meal.status === 'partial'
  ).length;

  const habits: WeeklyNutritionHabit[] = [];
  if (!latestIsV3) {
    habits.push({
      id: 'proteina',
      label: 'Proteína',
      current: num(latest?.diasProteinaMeta),
      previous: num(comparable?.diasProteinaMeta),
      delta: deltas.proteina.delta,
      unit: 'days',
      series: oldestFirst.map((r) => num(r.diasProteinaMeta)).filter((n): n is number => n != null),
    });
  }
  habits.push(
    latestIsV3
      ? {
          id: 'hidratacao',
          label: 'Hidratação',
          current: hydrationCurrent,
          previous: hydrationPrevious,
          delta: deltas.hidratacao.delta,
          unit: 'quality',
          series: sameVersionOldestFirst
            .map((r) => (r.hydrationQuality ? HYDRATION_QUALITY_POINTS[r.hydrationQuality] : null))
            .filter((n): n is number => n != null),
        }
      : {
          id: 'hidratacao',
          label: 'Hidratação',
          current: num(latest?.diasMetaAgua),
          previous: num(comparable?.diasMetaAgua),
          delta: deltas.hidratacao.delta,
          unit: 'days',
          series: oldestFirst.map((r) => num(r.diasMetaAgua)).filter((n): n is number => n != null),
        },
    {
      id: 'atividade',
      label: 'Atividade',
      current: num(latest?.sessoesAtividadeFisica),
      previous: num(previous?.sessoesAtividadeFisica),
      delta: deltas.atividade.delta,
      unit: 'sessions',
      series: oldestFirst.map((r) => num(r.sessoesAtividadeFisica)).filter((n): n is number => n != null),
    },
    {
      id: 'energia',
      label: 'Energia',
      current: num(latest?.energiaSemana),
      previous: num(previous?.energiaSemana),
      delta: deltas.energia.delta,
      unit: 'scale',
      series: oldestFirst.map((r) => num(r.energiaSemana)).filter((n): n is number => n != null),
    }
  );

  return {
    latest,
    previous,
    deltas: latest
      ? deltas
      : {
          score: emptyDelta,
          aderencia: emptyDelta,
          hidratacao: emptyDelta,
          atividade: emptyDelta,
          proteina: emptyDelta,
          energia: emptyDelta,
        },
    trend,
    trendDelta,
    instrumentChanged,
    scoreSeries: oldestFirst
      .filter((r) => r.score != null && Number.isFinite(r.score))
      .map((r) => point(r, r.score as number)),
    adherenceSeries: oldestFirst
      .filter((r) => r.aderenciaPlano != null && Number.isFinite(r.aderenciaPlano))
      .map((r) => point(r, r.aderenciaPlano as number)),
    dailyAdherenceSeries: v3Records.map((record) => ({
      weekKey: record.weekKey,
      daily: record.dailyAdherence as CheckInDailyAdherence,
      aderenciaPlano: record.aderenciaPlano,
    })),
    weekdayPatterns,
    weekendPatterns:
      weekdayPatterns.length === 7
        ? {
            saturday: weekdayPatterns.find((item) => item.key === 'saturday') || emptyWeekdayPattern('saturday'),
            sunday: weekdayPatterns.find((item) => item.key === 'sunday') || emptyWeekdayPattern('sunday'),
          }
        : null,
    mealAdherence,
    mealDifficultyFrequency: [...mealDifficultyFrequencyMap.entries()]
      .map(([status, count]) => ({ status, label: rotuloMealAdherence(status), count }))
      .sort((a, b) => b.count - a.count),
    foodSwapRequests,
    weekendInsight,
    habits,
    attentionFlags,
    difficulties: countStandardized(
      oldestFirst.map((r) => ({ tipo: r.principalDificuldadeTipo })),
      'outra',
      dificuldadeLabel
    ).filter((item) => item.id !== 'sem_dificuldade'),
    otherDifficulties: countOtherTexts(
      oldestFirst
        .filter((r) => r.principalDificuldadeTipo === 'outra')
        .map((r) => r.principalDificuldadeOutra || r.principalDificuldade)
    ),
    achievements: countStandardized(
      oldestFirst.map((r) => ({ tipo: r.principalConquistaTipo })),
      'outra',
      conquistaLabel
    ).filter((item) => item.id !== 'sem_conquista'),
    otherAchievements: countOtherTexts(
      oldestFirst
        .filter((r) => r.principalConquistaTipo === 'outra')
        .map((r) => r.principalConquistaOutra || r.principalConquista)
    ),
    portfolioSignals: {
      trend,
      recurringAttentionCount: attentionFlags.filter((flag) => flag.recurring).length,
      latestScore: num(latest?.score),
      weekendAdherenceProblem: Boolean(
        latest?.dailyAdherence && isCompleteDailyAdherence(latest.dailyAdherence)
          ? hasWeekendAdherenceProblem(latest.dailyAdherence)
          : false
      ),
      pendingFoodSwapRequests: foodSwapRequests.length,
      mealAdherenceProblems,
    },
    history: newestFirst.map((record, index) => {
      const week = getNutritionWeek(record.weekStart || record.weekKey);
      const older = newestFirst[index + 1];
      const sameInstrument = Boolean(older && older.questionnaireVersion === record.questionnaireVersion);
      return {
        weekKey: record.weekKey,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        label: formatNutritionWeekShortLabel(week),
        score: num(record.score),
        delta: sameInstrument ? deltaOf(record.score, older?.score).delta : null,
        questionnaireVersion: record.questionnaireVersion,
        instrumentChanged: Boolean(older && !sameInstrument),
      };
    }),
  };
}
