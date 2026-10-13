import type {
  CheckInSemanalNutriAlimentacaoForaPlano,
  CheckInSemanalNutriAnswers,
  CheckInSemanalNutriQuestionnaireVersion,
  CheckInSemanalNutriSeveridadeGI,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import { calcularScoreCheckInSemanalNutriV3 } from '@/lib/nutri/calcularScoreCheckInSemanalNutriV3';

export type CheckInSemanalNutriScorePontos = {
  aderenciaPlano?: number;
  alimentacao?: number;
  hidratacao?: number;
  sintomas?: number;
  energia?: number;
  atividadeFisica?: number;
  suplementacao?: number;
  sonoEnergia?: number;
};

export type CheckInSemanalNutriScoreResultado = {
  score: number;
  pontos: CheckInSemanalNutriScorePontos;
  pesosUsados: Record<keyof CheckInSemanalNutriScorePontos, number>;
};

const PESO_ADERENCIA = 35;
const PESO_ALIMENTACAO = 30;
const PESO_HIDRATACAO = 15;
const PESO_SINTOMAS = 10;
const PESO_ENERGIA = 5;
const PESO_ATIVIDADE = 5;

const GI_MAP: Record<CheckInSemanalNutriSeveridadeGI, number> = {
  nenhum: 1,
  leve: 0.75,
  moderado: 0.5,
  grave: 0.25,
};

const FORA_MAP: Record<CheckInSemanalNutriAlimentacaoForaPlano, number> = {
  nenhuma: 1,
  pouca: 0.75,
  moderada: 0.4,
  frequente: 0,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function diasRatio(dias: number | null | undefined): number {
  if (dias == null || !Number.isFinite(dias)) return 0;
  return clamp01(dias / 7);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Score V2 0–100 (1 casa).
 * Dificuldade e conquista são qualitativos e não entram no cálculo.
 * Campos V1 de suplemento/sono são ignorados.
 */
export function calcularScoreCheckInSemanalNutri(
  answers: CheckInSemanalNutriAnswers,
  _suplementosAplicaveis?: unknown
): CheckInSemanalNutriScoreResultado {
  const alimentacao =
    diasRatio(answers.diasProteinaMeta) * 0.4 +
    diasRatio(answers.diasFrutasVegetais) * 0.4 +
    (FORA_MAP[answers.alimentacaoForaPlano ?? 'nenhuma'] ?? 0) * 0.2;

  const hidratacao = diasRatio(answers.diasMetaAgua);

  const gi =
    ((GI_MAP[answers.nauseas] ?? 0) +
      (GI_MAP[answers.constipacao] ?? 0) +
      (GI_MAP[answers.diarreia] ?? 0)) /
    3;

  const energia = answers.energiaSemana != null ? clamp01(answers.energiaSemana > 5 ? answers.energiaSemana / 100 : answers.energiaSemana / 5) : null;

  const sessoes = answers.sessoesAtividadeFisica;
  const atividade = sessoes == null ? null : clamp01(Math.min(sessoes, 7) / 7);

  const aderencia = clamp01((answers.aderenciaPlano ?? 0) / 100);

  const pesos: Record<keyof CheckInSemanalNutriScorePontos, number> = {
    aderenciaPlano: PESO_ADERENCIA,
    alimentacao: PESO_ALIMENTACAO,
    hidratacao: PESO_HIDRATACAO,
    sintomas: PESO_SINTOMAS,
    energia: energia == null ? 0 : PESO_ENERGIA,
    atividadeFisica: atividade == null ? 0 : PESO_ATIVIDADE,
    suplementacao: 0,
    sonoEnergia: 0,
  };

  const pesoTotal = Object.values(pesos).reduce((a, b) => a + b, 0) || 100;

  const pontos: CheckInSemanalNutriScorePontos = {
    aderenciaPlano: aderencia * 100,
    alimentacao: alimentacao * 100,
    hidratacao: hidratacao * 100,
    sintomas: gi * 100,
    energia: energia == null ? undefined : energia * 100,
    atividadeFisica: atividade == null ? undefined : atividade * 100,
  };

  const scoreTotal =
    (aderencia * pesos.aderenciaPlano +
      alimentacao * pesos.alimentacao +
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

export type CheckInSemanalNutriScoreTone = 'green' | 'yellow' | 'red';

export function checkInSemanalNutriScoreTone(score: number): CheckInSemanalNutriScoreTone {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}

export function calcularScoreCheckInSemanalNutriForVersion(
  answers: CheckInSemanalNutriAnswers,
  version?: CheckInSemanalNutriQuestionnaireVersion | string | null
) {
  if (isWeeklyNutritionQuestionnaireV3(version) || answers.dailyAdherence) {
    return calcularScoreCheckInSemanalNutriV3(answers);
  }
  return calcularScoreCheckInSemanalNutri(answers);
}
