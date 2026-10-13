import type { CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  DAILY_ADHERENCE_POINTS,
  HYDRATION_QUALITY_POINTS,
  mealAdherenceAverage,
  type CheckInDailyAdherence,
} from '@/lib/nutri/checkInSemanalNutriV3';
import type { CheckInSemanalNutriScoreResultado } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';

const PESO_DIARIO = 35;
const PESO_CARDAPIO = 30;
const PESO_HIDRATACAO = 15;
const PESO_SINTOMAS = 10;
const PESO_ENERGIA = 5;
const PESO_ATIVIDADE = 5;

const GI_MAP = {
  nenhum: 1,
  leve: 0.75,
  moderado: 0.5,
  grave: 0.25,
} as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dailyScore(daily: CheckInDailyAdherence | undefined): number {
  if (!daily) return 0;
  const values = Object.values(daily);
  if (values.length === 0) return 0;
  const total = values.reduce((sum, rating) => sum + DAILY_ADHERENCE_POINTS[rating], 0);
  return total / values.length;
}

/**
 * Score V3 0–100.
 * Solicitações de troca e textos qualitativos não entram.
 * Sem cardápio, o peso da aderência diária absorve o bloco de refeições.
 */
export function calcularScoreCheckInSemanalNutriV3(
  answers: CheckInSemanalNutriAnswers
): CheckInSemanalNutriScoreResultado {
  const diario = clamp01(dailyScore(answers.dailyAdherence) / 100);
  const cardapioRaw = mealAdherenceAverage(answers.mealAdherence || []);
  const hasMenu = cardapioRaw != null;
  const cardapio = hasMenu ? clamp01(cardapioRaw / 100) : 0;
  const hidratacao = answers.hydrationQuality
    ? clamp01(HYDRATION_QUALITY_POINTS[answers.hydrationQuality] / 100)
    : 0;
  const gi =
    ((GI_MAP[answers.nauseas] ?? 0) +
      (GI_MAP[answers.constipacao] ?? 0) +
      (GI_MAP[answers.diarreia] ?? 0)) /
    3;
  const energia = answers.energiaSemana != null ? clamp01(answers.energiaSemana > 5 ? answers.energiaSemana / 100 : answers.energiaSemana / 5) : null;
  const sessoes = answers.sessoesAtividadeFisica;
  const atividade = sessoes == null ? null : clamp01(Math.min(sessoes, 7) / 7);

  const pesos = {
    aderenciaPlano: hasMenu ? PESO_DIARIO : PESO_DIARIO + PESO_CARDAPIO,
    alimentacao: hasMenu ? PESO_CARDAPIO : 0,
    hidratacao: PESO_HIDRATACAO,
    sintomas: PESO_SINTOMAS,
    energia: energia == null ? 0 : PESO_ENERGIA,
    atividadeFisica: atividade == null ? 0 : PESO_ATIVIDADE,
    suplementacao: 0,
    sonoEnergia: 0,
  };
  const pesoTotal = Object.values(pesos).reduce((a, b) => a + b, 0) || 100;

  const pontos = {
    aderenciaPlano: diario * 100,
    alimentacao: hasMenu ? cardapio * 100 : undefined,
    hidratacao: hidratacao * 100,
    sintomas: gi * 100,
    energia: energia == null ? undefined : energia * 100,
    atividadeFisica: atividade == null ? undefined : atividade * 100,
  };

  const scoreTotal =
    (diario * pesos.aderenciaPlano +
      cardapio * pesos.alimentacao +
      hidratacao * pesos.hidratacao +
      gi * pesos.sintomas +
      (energia ?? 0) * pesos.energia +
      (atividade ?? 0) * pesos.atividadeFisica) /
    pesoTotal;

  return {
    score: round1(scoreTotal * 100),
    pontos,
    pesosUsados: pesos,
  };
}
