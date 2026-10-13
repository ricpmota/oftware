import { z } from 'zod';
import {
  textoConquistaCheckIn,
  textoDificuldadeCheckIn,
} from '@/lib/nutri/checkInSemanalNutriQuestions';
import type { CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import { NUTRITION_WEEKDAY_KEYS } from '@/lib/nutri/checkInSemanalNutriWeek';
import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';
import { finalizeCheckInSemanalNutriV3Answers } from '@/lib/nutri/checkInSemanalNutriV3Finalize';

const GI = z.enum(['nenhum', 'leve', 'moderado', 'grave']);
const FORA = z.enum(['nenhuma', 'pouca', 'moderada', 'frequente']);
const DIFICULDADE = z.enum([
  'falta_tempo',
  'comer_fora',
  'eventos_sociais',
  'vontade_doces',
  'fome_aumentada',
  'ansiedade',
  'horarios',
  'falta_alimentos',
  'sem_dificuldade',
  'outra',
]);
const CONQUISTA = z.enum([
  'aderencia',
  'organizacao',
  'proteina',
  'hidratacao',
  'frutas_vegetais',
  'reduziu_extras',
  'boas_escolhas_fora',
  'controle_fome',
  'atividade',
  'sem_conquista',
  'outra',
]);

const META_KEYS = new Set([
  'score',
  'weekKey',
  'patientId',
  'pacienteId',
  'nutritionistId',
  'scheduledDate',
  'answeredBy',
  'source',
  'token',
]);

export const checkInSemanalNutriAnswersSchema = z
  .object({
    aderenciaPlano: z.number().int().min(0).max(100),
    diasProteinaMeta: z.number().int().min(0).max(7),
    diasFrutasVegetais: z.number().int().min(0).max(7),
    alimentacaoForaPlano: FORA,
    diasMetaAgua: z.number().int().min(0).max(7),
    nauseas: GI,
    constipacao: GI,
    diarreia: GI,
    energiaSemana: z.number().int().min(1).max(5),
    sessoesAtividadeFisica: z.number().int().min(0).max(8),
    principalDificuldadeTipo: DIFICULDADE,
    principalDificuldadeOutra: z.string().trim().max(500).optional(),
    principalConquistaTipo: CONQUISTA,
    principalConquistaOutra: z.string().trim().max(500).optional(),
    observacoes: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.principalDificuldadeTipo === 'outra' && !value.principalDificuldadeOutra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalDificuldadeOutra'],
        message: 'Descreva a dificuldade.',
      });
    }
    if (value.principalConquistaTipo === 'outra' && !value.principalConquistaOutra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalConquistaOutra'],
        message: 'Descreva a conquista.',
      });
    }
  });

const DAILY = z.enum(['good', 'regular', 'bad']);
const MEAL_STATUS = z.enum(['followed', 'partial', 'substituted', 'skipped', 'not_followed']);
const SWAP_REASON = z.enum([
  'dislike',
  'tired_of',
  'hard_to_find',
  'expensive',
  'hard_to_prepare',
  'hard_to_take',
  'does_not_sit_well',
  'no_appetite',
  'other',
]);
const WEEKDAY = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

export const checkInSemanalNutriAnswersSchemaV3 = z
  .object({
    dailyAdherence: z.object({
      monday: DAILY,
      tuesday: DAILY,
      wednesday: DAILY,
      thursday: DAILY,
      friday: DAILY,
      saturday: DAILY,
      sunday: DAILY,
    }),
    hydrationQuality: z.enum(['excellent', 'good', 'regular', 'poor']),
    mealAdherence: z
      .array(
        z.object({
          mealId: z.string().min(1),
          mealLabel: z.string().optional(),
          status: MEAL_STATUS,
          skippedDays: z.array(WEEKDAY).optional(),
          missingFoods: z
            .array(z.object({ foodId: z.string(), foodLabel: z.string().optional() }))
            .optional(),
          substitutions: z
            .array(
              z.object({
                foodId: z.string(),
                foodLabel: z.string().optional(),
                replacementText: z.string().trim().max(200).optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
    foodSwapRequests: z
      .array(
        z.object({
          mealId: z.string().min(1),
          mealLabel: z.string().optional(),
          foodId: z.string().min(1),
          foodLabel: z.string().optional(),
          reason: SWAP_REASON,
          reasonOther: z.string().trim().max(500).optional(),
          desiredReplacement: z.string().trim().max(200).optional(),
        })
      )
      .optional(),
    nauseas: GI,
    constipacao: GI,
    diarreia: GI,
    energiaSemana: z.number().min(0).max(100),
    sessoesAtividadeFisica: z.number().int().min(0).max(8),
    atividadeFisicaPorDia: z.record(z.string(), z.string().trim().max(80)).optional(),
    principalDificuldadeTipo: DIFICULDADE.optional(),
    principalDificuldadeTipos: z.array(DIFICULDADE).min(1).optional(),
    principalDificuldadeOutra: z.string().trim().max(500).optional(),
    principalConquistaTipo: CONQUISTA.optional(),
    principalConquistaTipos: z.array(CONQUISTA).min(1).optional(),
    principalConquistaOutra: z.string().trim().max(500).optional(),
    observacoes: z.string().trim().max(2000).optional(),
    aderenciaPlano: z.number().int().min(0).max(100).optional(),
  })
  .superRefine((value, ctx) => {
    const dificuldadeTipos = value.principalDificuldadeTipos?.length
      ? value.principalDificuldadeTipos
      : value.principalDificuldadeTipo
        ? [value.principalDificuldadeTipo]
        : [];
    if (dificuldadeTipos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalDificuldadeTipos'],
        message: 'Selecione pelo menos uma dificuldade.',
      });
    }
    if (dificuldadeTipos.includes('outra') && !value.principalDificuldadeOutra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalDificuldadeOutra'],
        message: 'Descreva a dificuldade.',
      });
    }
    const conquistaTipos = value.principalConquistaTipos?.length
      ? value.principalConquistaTipos
      : value.principalConquistaTipo
        ? [value.principalConquistaTipo]
        : [];
    if (conquistaTipos.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalConquistaTipos'],
        message: 'Selecione pelo menos uma conquista.',
      });
    }
    if (conquistaTipos.includes('outra') && !value.principalConquistaOutra) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['principalConquistaOutra'],
        message: 'Descreva a conquista.',
      });
    }
    for (const swap of value.foodSwapRequests || []) {
      if (swap.reason === 'other' && !swap.reasonOther) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['foodSwapRequests'],
          message: 'Descreva o motivo da troca.',
        });
      }
    }
    void NUTRITION_WEEKDAY_KEYS;
  });

function omitMetaKeys(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (META_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function applyQualitativeTexts(answers: CheckInSemanalNutriAnswers): CheckInSemanalNutriAnswers {
  const dificuldade = textoDificuldadeCheckIn(answers);
  if (dificuldade) answers.principalDificuldade = dificuldade;
  const conquista = textoConquistaCheckIn(answers);
  if (conquista) answers.principalConquista = conquista;
  return answers;
}

export function parseCheckInSemanalNutriPublicAnswers(
  body: unknown,
  options?: { menuContext?: CheckInMenuContext | null }
): CheckInSemanalNutriAnswers {
  if (!body || typeof body !== 'object') {
    throw new Error('Respostas inválidas.');
  }
  const raw = body as Record<string, unknown>;
  const candidate =
    raw.answers && typeof raw.answers === 'object' && !Array.isArray(raw.answers)
      ? omitMetaKeys(raw.answers as Record<string, unknown>)
      : omitMetaKeys(raw);

  if (candidate.dailyAdherence) {
    const parsed = checkInSemanalNutriAnswersSchemaV3.parse(candidate);
    const answers: CheckInSemanalNutriAnswers = {
      aderenciaPlano: 0,
      nauseas: parsed.nauseas,
      constipacao: parsed.constipacao,
      diarreia: parsed.diarreia,
      energiaSemana: parsed.energiaSemana,
      sessoesAtividadeFisica: parsed.sessoesAtividadeFisica,
      atividadeFisicaPorDia: parsed.atividadeFisicaPorDia,
      principalDificuldadeTipo: parsed.principalDificuldadeTipo,
      principalDificuldadeTipos: parsed.principalDificuldadeTipos,
      principalConquistaTipo: parsed.principalConquistaTipo,
      principalConquistaTipos: parsed.principalConquistaTipos,
      dailyAdherence: parsed.dailyAdherence,
      hydrationQuality: parsed.hydrationQuality,
      mealAdherence: parsed.mealAdherence,
      foodSwapRequests: parsed.foodSwapRequests,
    };
    if (
      (parsed.principalDificuldadeTipo === 'outra' || parsed.principalDificuldadeTipos?.includes('outra')) &&
      parsed.principalDificuldadeOutra
    ) {
      answers.principalDificuldadeOutra = parsed.principalDificuldadeOutra;
    }
    if (
      (parsed.principalConquistaTipo === 'outra' || parsed.principalConquistaTipos?.includes('outra')) &&
      parsed.principalConquistaOutra
    ) {
      answers.principalConquistaOutra = parsed.principalConquistaOutra;
    }
    if (parsed.observacoes) answers.observacoes = parsed.observacoes;
    const finalized = finalizeCheckInSemanalNutriV3Answers(
      applyQualitativeTexts(answers),
      options?.menuContext
    );
    const menuMeals = options?.menuContext?.meals || [];
    if (menuMeals.length > 0) {
      const answered = new Set((finalized.mealAdherence || []).map((item) => item.mealId));
      if (menuMeals.some((meal) => !answered.has(meal.mealId))) {
        throw new Error('Indique como foi cada refeição.');
      }
    }
    return finalized;
  }

  const parsed = checkInSemanalNutriAnswersSchema.parse(candidate);
  const answers: CheckInSemanalNutriAnswers = {
    aderenciaPlano: parsed.aderenciaPlano,
    diasProteinaMeta: parsed.diasProteinaMeta,
    diasFrutasVegetais: parsed.diasFrutasVegetais,
    alimentacaoForaPlano: parsed.alimentacaoForaPlano,
    diasMetaAgua: parsed.diasMetaAgua,
    nauseas: parsed.nauseas,
    constipacao: parsed.constipacao,
    diarreia: parsed.diarreia,
    energiaSemana: parsed.energiaSemana,
    sessoesAtividadeFisica: parsed.sessoesAtividadeFisica,
    principalDificuldadeTipo: parsed.principalDificuldadeTipo,
    principalConquistaTipo: parsed.principalConquistaTipo,
  };

  if (parsed.principalDificuldadeTipo === 'outra' && parsed.principalDificuldadeOutra) {
    answers.principalDificuldadeOutra = parsed.principalDificuldadeOutra;
  }
  if (parsed.principalConquistaTipo === 'outra' && parsed.principalConquistaOutra) {
    answers.principalConquistaOutra = parsed.principalConquistaOutra;
  }
  if (parsed.observacoes) answers.observacoes = parsed.observacoes;

  return applyQualitativeTexts(answers);
}
