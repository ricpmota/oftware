import type { CheckInSemanalNutriQuestion } from '@/lib/nutri/checkInSemanalNutriQuestions';
import {
  getCheckInSemanalNutriQuestions,
  PRINCIPAL_CONQUISTA_OPCOES,
  PRINCIPAL_DIFICULDADE_OPCOES,
  textoConquistaCheckIn,
  textoDificuldadeCheckIn,
} from '@/lib/nutri/checkInSemanalNutriQuestions';
import type {
  CheckInSemanalNutriAlimentacaoForaPlano,
  CheckInSemanalNutriAnswers,
  CheckInSemanalNutriConquistaTipo,
  CheckInSemanalNutriDificuldadeTipo,
  CheckInSemanalNutriQuestionnaireVersion,
  CheckInSemanalNutriSeveridadeGI,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  deriveAdherenceFromDaily,
  isCompleteDailyAdherence,
  type CheckInDailyAdherence,
  type CheckInFoodSwapRequest,
  type CheckInMealAdherenceItem,
  type CheckInMenuContext,
  type HydrationQuality,
} from '@/lib/nutri/checkInSemanalNutriV3';
import { finalizeCheckInSemanalNutriV3Answers } from '@/lib/nutri/checkInSemanalNutriV3Finalize';

export type CheckInSemanalNutriFormState = Record<string, string>;

const GI: CheckInSemanalNutriSeveridadeGI[] = ['nenhum', 'leve', 'moderado', 'grave'];
const FORA: CheckInSemanalNutriAlimentacaoForaPlano[] = ['nenhuma', 'pouca', 'moderada', 'frequente'];
const DIFICULDADES = PRINCIPAL_DIFICULDADE_OPCOES.map((o) => o.value);
const CONQUISTAS = PRINCIPAL_CONQUISTA_OPCOES.map((o) => o.value);
const HYDRATION: HydrationQuality[] = ['excellent', 'good', 'regular', 'poor'];

export function emptyCheckInSemanalNutriForm(
  version?: CheckInSemanalNutriQuestionnaireVersion | string | null
): CheckInSemanalNutriFormState {
  return Object.fromEntries(getCheckInSemanalNutriQuestions(version).map((q) => [q.id, '']));
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function checkInSemanalNutriAnswersToForm(
  answers: Partial<CheckInSemanalNutriAnswers> | null | undefined,
  version?: CheckInSemanalNutriQuestionnaireVersion | string | null
): CheckInSemanalNutriFormState {
  const form = emptyCheckInSemanalNutriForm(version);
  if (!answers) return form;
  const questions = getCheckInSemanalNutriQuestions(version);

  for (const q of questions) {
    if (q.id === 'mealAdherence' || q.id === 'sessoesAtividadeFisica') continue;
    if (q.id === 'principalDificuldadeTipo' || q.id === 'principalConquistaTipo') continue;
    const raw = answers[q.id as keyof CheckInSemanalNutriAnswers];
    if (raw == null || raw === '') continue;
    if (typeof raw === 'object') form[q.id] = stringifyJson(raw);
    else form[q.id] = String(raw);
  }

  if (questions.some((q) => q.id === 'mealAdherence')) {
    form.mealAdherence = stringifyJson({
      meals: answers.mealAdherence || [],
      swaps: answers.foodSwapRequests || [],
    });
  }

  if (answers.atividadeFisicaPorDia) {
    form.sessoesAtividadeFisica = stringifyJson(answers.atividadeFisicaPorDia);
  } else if (answers.sessoesAtividadeFisica != null && typeof answers.sessoesAtividadeFisica === 'number') {
    const questionsHasExerciseDays = questions.some((q) => q.id === 'sessoesAtividadeFisica' && q.type === 'exercise_days');
    if (!questionsHasExerciseDays) form.sessoesAtividadeFisica = String(answers.sessoesAtividadeFisica);
  }

  const dificuldadeIsMulti = questions.some((q) => q.id === 'principalDificuldadeTipo' && q.type === 'multi_choice');
  const conquistaIsMulti = questions.some((q) => q.id === 'principalConquistaTipo' && q.type === 'multi_choice');
  if (dificuldadeIsMulti) {
    if (answers.principalDificuldadeTipos?.length) {
      form.principalDificuldadeTipo = stringifyJson(answers.principalDificuldadeTipos);
    } else if (answers.principalDificuldadeTipo) {
      form.principalDificuldadeTipo = stringifyJson([answers.principalDificuldadeTipo]);
    }
  } else if (answers.principalDificuldadeTipo) {
    form.principalDificuldadeTipo = answers.principalDificuldadeTipo;
  }
  if (conquistaIsMulti) {
    if (answers.principalConquistaTipos?.length) {
      form.principalConquistaTipo = stringifyJson(answers.principalConquistaTipos);
    } else if (answers.principalConquistaTipo) {
      form.principalConquistaTipo = stringifyJson([answers.principalConquistaTipo]);
    }
  } else if (answers.principalConquistaTipo) {
    form.principalConquistaTipo = answers.principalConquistaTipo;
  }

  if (!form.principalDificuldadeTipo && answers.principalDificuldade) {
    form.principalDificuldadeTipo = dificuldadeIsMulti ? stringifyJson(['outra']) : 'outra';
    form.principalDificuldadeOutra = answers.principalDificuldade;
  }
  if (!form.principalConquistaTipo && answers.principalConquista) {
    form.principalConquistaTipo = conquistaIsMulti ? stringifyJson(['outra']) : 'outra';
    form.principalConquistaOutra = answers.principalConquista;
  }
  return form;
}

function parseIntInRange(raw: string, min: number, max: number): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

export function validateCheckInSemanalNutriQuestion(
  question: CheckInSemanalNutriQuestion,
  form: CheckInSemanalNutriFormState
): string | null {
  const value = (form[question.id] || '').trim();

  if (question.type === 'daily_rating') {
    const parsed = parseJson<CheckInDailyAdherence>(value);
    if (!isCompleteDailyAdherence(parsed)) return 'Avalie todos os dias da semana.';
    return null;
  }

  if (question.type === 'meal_adherence') {
    const parsed = parseJson<{ meals?: CheckInMealAdherenceItem[]; swaps?: CheckInFoodSwapRequest[] }>(value);
    const meals = parsed?.meals || parseJson<CheckInMealAdherenceItem[]>(value);
    if (!Array.isArray(meals) || meals.length === 0 || meals.some((item) => !item?.status)) {
      return 'Indique como foi cada refeição.';
    }
    if (meals.some((item) => item.status === 'substituted' && !(item.substitutions || []).length)) {
      return 'Indique o alimento que você trocou.';
    }
    if (meals.some((item) => item.status === 'skipped' && !(item.skippedDays || []).length)) {
      return 'Indique em quais dias você pulou esta refeição.';
    }
    const swaps = parsed?.swaps || [];
    if (swaps.some((swap) => swap.reason === 'other' && !String(swap.reasonOther || '').trim())) {
      return 'Descreva o motivo da troca.';
    }
    return null;
  }

  if (question.type === 'energy_bar') {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 0 || n > 100) return 'Deslize a barra para indicar sua energia.';
    return null;
  }

  if (question.type === 'exercise_days') {
    if (!value) return 'Selecione os dias ou indique que não praticou.';
    const parsed = parseJson<Record<string, string>>(value);
    if (!parsed || typeof parsed !== 'object') return 'Selecione os dias ou indique que não praticou.';
    return null;
  }

  if (question.type === 'multi_choice') {
    const parsed = parseJson<string[]>(value);
    const list = Array.isArray(parsed) ? parsed : value ? [value] : [];
    if (list.length === 0) return 'Selecione pelo menos uma opção.';
    const allowed = new Set((question.options || []).map((o) => o.value));
    if (list.some((item) => !allowed.has(item))) return 'Selecione uma opção válida.';
    return null;
  }

  if (!question.required && !value) return null;

  if (question.required && !value) {
    if (question.type === 'single_choice' || question.type === 'days' || question.type === 'days_plus' || question.type === 'scale') {
      return 'Selecione uma opção.';
    }
    if (question.type === 'slider') return 'Informe um valor.';
    return 'Este campo é obrigatório.';
  }

  if (question.type === 'slider') {
    const n = Number.parseInt(value, 10);
    const min = question.min ?? 0;
    const max = question.max ?? 100;
    if (!Number.isFinite(n) || n < min || n > max) return 'Informe um valor válido.';
    return null;
  }

  if (question.type === 'days' || question.type === 'days_plus' || question.type === 'scale') {
    const min = question.min ?? 0;
    const max = question.max ?? 7;
    if (parseIntInRange(value, min, max) == null) return 'Selecione uma opção válida.';
    return null;
  }

  if (question.type === 'single_choice') {
    const ok = question.options?.some((o) => o.value === value);
    if (!ok) return 'Selecione uma opção.';
    return null;
  }

  return null;
}

function parseChoiceList(raw: string): string[] {
  const parsed = parseJson<string[]>(raw);
  if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string');
  if (raw.trim()) return [raw.trim()];
  return [];
}

function sharedQualitative(
  form: CheckInSemanalNutriFormState,
  answers: CheckInSemanalNutriAnswers
) {
  const num = (id: string, min: number, max: number): number | undefined =>
    parseIntInRange(form[id] || '', min, max);
  const energia100 = num('energiaSemana', 0, 100);
  const energia5 = num('energiaSemana', 1, 5);
  if (energia100 != null && energia100 > 5) answers.energiaSemana = energia100;
  else if (energia5 != null) answers.energiaSemana = energia5;
  else if (energia100 != null) answers.energiaSemana = energia100;

  const exerciseDays = parseJson<Record<string, string>>(form.sessoesAtividadeFisica || '');
  if (exerciseDays && typeof exerciseDays === 'object' && !Array.isArray(exerciseDays)) {
    const keys = Object.keys(exerciseDays);
    answers.sessoesAtividadeFisica = keys.length;
    answers.atividadeFisicaPorDia = exerciseDays;
  } else {
    const sessoes = num('sessoesAtividadeFisica', 0, 8);
    if (sessoes != null) answers.sessoesAtividadeFisica = sessoes;
  }

  const tiposD = parseChoiceList(form.principalDificuldadeTipo || '').filter((item) =>
    DIFICULDADES.includes(item as CheckInSemanalNutriDificuldadeTipo)
  ) as CheckInSemanalNutriDificuldadeTipo[];
  const tiposC = parseChoiceList(form.principalConquistaTipo || '').filter((item) =>
    CONQUISTAS.includes(item as CheckInSemanalNutriConquistaTipo)
  ) as CheckInSemanalNutriConquistaTipo[];

  if (tiposD.length > 0) {
    answers.principalDificuldadeTipos = tiposD;
    answers.principalDificuldadeTipo = tiposD[0];
    if (tiposD.includes('outra')) {
      const outra = (form.principalDificuldadeOutra || '').trim();
      if (outra) answers.principalDificuldadeOutra = outra;
    }
    const texto = textoDificuldadeCheckIn(answers);
    if (texto) answers.principalDificuldade = texto;
  }
  if (tiposC.length > 0) {
    answers.principalConquistaTipos = tiposC;
    answers.principalConquistaTipo = tiposC[0];
    if (tiposC.includes('outra')) {
      const outra = (form.principalConquistaOutra || '').trim();
      if (outra) answers.principalConquistaOutra = outra;
    }
    const texto = textoConquistaCheckIn(answers);
    if (texto) answers.principalConquista = texto;
  }
  const obs = (form.observacoes || '').trim();
  if (obs) answers.observacoes = obs;
}

export function formToCheckInSemanalNutriAnswers(
  form: CheckInSemanalNutriFormState,
  _visibleIds: Set<string>,
  options?: {
    version?: CheckInSemanalNutriQuestionnaireVersion | string | null;
    menuContext?: CheckInMenuContext | null;
  }
): CheckInSemanalNutriAnswers {
  const asGi = (id: string): CheckInSemanalNutriSeveridadeGI => {
    const v = (form[id] || '') as CheckInSemanalNutriSeveridadeGI;
    return GI.includes(v) ? v : 'nenhum';
  };

  if (isWeeklyNutritionQuestionnaireV3(options?.version)) {
    const daily = parseJson<CheckInDailyAdherence>(form.dailyAdherence || '');
    const mealPayload = parseJson<{ meals?: CheckInMealAdherenceItem[]; swaps?: CheckInFoodSwapRequest[] }>(
      form.mealAdherence || ''
    );
    const hydration = form.hydrationQuality as HydrationQuality;
    const derived = daily && isCompleteDailyAdherence(daily) ? deriveAdherenceFromDaily(daily) : null;
    const answers: CheckInSemanalNutriAnswers = {
      aderenciaPlano: derived?.aderenciaPlano ?? 0,
      nauseas: asGi('nauseas'),
      constipacao: asGi('constipacao'),
      diarreia: asGi('diarreia'),
      dailyAdherence: daily && isCompleteDailyAdherence(daily) ? daily : undefined,
      hydrationQuality: HYDRATION.includes(hydration) ? hydration : undefined,
      mealAdherence: mealPayload?.meals,
      foodSwapRequests: mealPayload?.swaps,
    };
    sharedQualitative(form, answers);
    return finalizeCheckInSemanalNutriV3Answers(answers, options?.menuContext);
  }

  const num = (id: string, min: number, max: number): number | undefined =>
    parseIntInRange(form[id] || '', min, max);
  const fora = (form.alimentacaoForaPlano || '') as CheckInSemanalNutriAlimentacaoForaPlano;
  const answers: CheckInSemanalNutriAnswers = {
    aderenciaPlano: num('aderenciaPlano', 0, 100) ?? 0,
    diasProteinaMeta: num('diasProteinaMeta', 0, 7) ?? 0,
    diasFrutasVegetais: num('diasFrutasVegetais', 0, 7) ?? 0,
    alimentacaoForaPlano: FORA.includes(fora) ? fora : 'nenhuma',
    diasMetaAgua: num('diasMetaAgua', 0, 7) ?? 0,
    nauseas: asGi('nauseas'),
    constipacao: asGi('constipacao'),
    diarreia: asGi('diarreia'),
  };
  sharedQualitative(form, answers);
  return answers;
}
