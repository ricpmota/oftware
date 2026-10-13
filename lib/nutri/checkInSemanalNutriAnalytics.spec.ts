import { describe, expect, it } from 'vitest';
import {
  WEEKLY_NUTRITION_ATTENTION_WINDOW,
  buildWeeklyNutritionAnalytics,
  buildWeeklyNutritionAttentionTrends,
} from '@/lib/nutri/checkInSemanalNutriAnalytics';
import { CHECK_IN_DIARIO_NUTRI_ENABLED } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

function ci(
  weekKey: string,
  extra: Partial<CheckInSemanalNutri> = {}
): CheckInSemanalNutri {
  const week = getNutritionWeek(weekKey);
  return {
    questionnaireVersion: 'nutri_weekly_v2',
    pacienteId: 'p1',
    weekKey: week.weekKey,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    answeredBy: 'patient',
    source: 'patient_meta',
    aderenciaPlano: 80,
    diasProteinaMeta: 5,
    diasFrutasVegetais: 5,
    alimentacaoForaPlano: 'nenhuma',
    diasMetaAgua: 5,
    nauseas: 'nenhum',
    constipacao: 'nenhum',
    diarreia: 'nenhum',
    energiaSemana: 4,
    sessoesAtividadeFisica: 3,
    score: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  };
}

describe('ETAPA 08A — analytics', () => {
  it('0 respostas: empty', () => {
    const analytics = buildWeeklyNutritionAnalytics([]);
    expect(analytics.latest).toBeNull();
    expect(analytics.previous).toBeNull();
    expect(analytics.scoreSeries).toEqual([]);
    expect(analytics.trend).toBe('insufficient_data');
  });

  it('1 resposta: sem delta e sem tendência', () => {
    const analytics = buildWeeklyNutritionAnalytics([ci('2026-08-17', { score: 84, aderenciaPlano: 86 })]);
    expect(analytics.latest?.weekKey).toBe('2026-08-17');
    expect(analytics.previous).toBeNull();
    expect(analytics.deltas.score.delta).toBeNull();
    expect(analytics.trend).toBe('insufficient_data');
  });

  it('2 respostas: delta existe, tendência ainda insuficiente', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-08-10', { score: 70 }),
      ci('2026-08-17', { score: 84 }),
    ]);
    expect(analytics.deltas.score.delta).toBe(14);
    expect(analytics.trend).toBe('insufficient_data');
  });

  it('semana pulada não vira score zero; previous de S3 é S1', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-08-03', { score: 60, aderenciaPlano: 55, diasMetaAgua: 4, sessoesAtividadeFisica: 2 }),
      ci('2026-08-17', { score: 84, aderenciaPlano: 86, diasMetaAgua: 6, sessoesAtividadeFisica: 4 }),
    ]);
    expect(analytics.latest?.weekKey).toBe('2026-08-17');
    expect(analytics.previous?.weekKey).toBe('2026-08-03');
    expect(analytics.scoreSeries.map((p) => p.value)).toEqual([60, 84]);
    expect(analytics.scoreSeries).toHaveLength(2);
    expect(analytics.deltas.score.delta).toBe(24);
    expect(analytics.deltas.aderencia.delta).toBe(31);
    expect(analytics.deltas.hidratacao.delta).toBe(2);
    expect(analytics.deltas.atividade.delta).toBe(2);
  });

  it('série de score em ordem cronológica; histórico decrescente', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-08-17', { score: 84 }),
      ci('2026-08-03', { score: 62 }),
      ci('2026-08-10', { score: 71 }),
    ]);
    expect(analytics.scoreSeries.map((p) => p.weekKey)).toEqual(['2026-08-03', '2026-08-10', '2026-08-17']);
    expect(analytics.history.map((p) => p.weekKey)).toEqual(['2026-08-17', '2026-08-10', '2026-08-03']);
    expect(analytics.adherenceSeries.map((p) => p.weekKey)).toEqual(['2026-08-03', '2026-08-10', '2026-08-17']);
  });

  it('tendência das últimas 3 respostas', () => {
    const improving = buildWeeklyNutritionAnalytics([
      ci('2026-07-27', { score: 62 }),
      ci('2026-08-03', { score: 69 }),
      ci('2026-08-10', { score: 78 }),
      ci('2026-08-17', { score: 84 }),
    ]);
    expect(improving.trend).toBe('improving');
    const declining = buildWeeklyNutritionAnalytics([
      ci('2026-08-03', { score: 84 }),
      ci('2026-08-10', { score: 70 }),
      ci('2026-08-17', { score: 60 }),
    ]);
    expect(declining.trend).toBe('declining');
  });

  it('recorrência: constipação em 3 das últimas 4', () => {
    const records = [
      ci('2026-07-27', { constipacao: 'moderado' }),
      ci('2026-08-03', { constipacao: 'moderado' }),
      ci('2026-08-10', { constipacao: 'nenhum' }),
      ci('2026-08-17', { constipacao: 'moderado' }),
    ];
    const trends = buildWeeklyNutritionAttentionTrends(records.slice().reverse());
    const constipation = trends.find((t) => t.flag === 'moderate_constipation');
    expect(WEEKLY_NUTRITION_ATTENTION_WINDOW).toBe(4);
    expect(constipation?.occurrences).toBe(3);
    expect(constipation?.evaluatedWeeks).toBe(4);
    expect(constipation?.recurring).toBe(true);
  });

  it('não inventa flag fora do helper clínico', () => {
    const analytics = buildWeeklyNutritionAnalytics([ci('2026-08-17', { aderenciaPlano: 30, constipacao: 'moderado' })]);
    expect(analytics.attentionFlags.every((f) => ['low_adherence', 'moderate_constipation'].includes(f.flag))).toBe(true);
  });

  it('dificuldades padronizadas agregam; Outra fica por texto', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-07-27', { principalDificuldadeTipo: 'eventos_sociais' }),
      ci('2026-08-03', { principalDificuldadeTipo: 'eventos_sociais' }),
      ci('2026-08-10', { principalDificuldadeTipo: 'outra', principalDificuldadeOutra: 'Viagem de trabalho' }),
      ci('2026-08-17', { principalDificuldadeTipo: 'outra', principalDificuldadeOutra: 'Dor de dente' }),
    ]);
    expect(analytics.difficulties[0]).toMatchObject({ id: 'eventos_sociais', count: 2 });
    expect(analytics.difficulties.find((d) => d.id === 'outra')).toBeUndefined();
    expect(analytics.otherDifficulties.map((d) => d.label).sort()).toEqual(['Dor de dente', 'Viagem de trabalho']);
  });

  it('conquistas padronizadas agregam; Outra não vira um único balde', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-08-03', { principalConquistaTipo: 'aderencia' }),
      ci('2026-08-10', { principalConquistaTipo: 'aderencia' }),
      ci('2026-08-17', { principalConquistaTipo: 'outra', principalConquistaOutra: 'Cozinhei em casa' }),
    ]);
    expect(analytics.achievements[0]).toMatchObject({ id: 'aderencia', count: 2 });
    expect(analytics.otherAchievements.map((d) => d.label)).toEqual(['Cozinhei em casa']);
  });

  it('deltas de hábitos usam última vs anterior respondida', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-08-03', { diasProteinaMeta: 4, diasMetaAgua: 5, sessoesAtividadeFisica: 2, energiaSemana: 3 }),
      ci('2026-08-17', { diasProteinaMeta: 6, diasMetaAgua: 5, sessoesAtividadeFisica: 4, energiaSemana: 4 }),
    ]);
    expect(analytics.habits.find((h) => h.id === 'proteina')).toMatchObject({ current: 6, previous: 4, delta: 2 });
    expect(analytics.habits.find((h) => h.id === 'hidratacao')).toMatchObject({ current: 5, previous: 5, delta: 0 });
    expect(analytics.habits.find((h) => h.id === 'atividade')).toMatchObject({ current: 4, previous: 2, delta: 2 });
    expect(analytics.habits.find((h) => h.id === 'energia')).toMatchObject({ current: 4, previous: 3, delta: 1 });
  });

  it('sem_dificuldade e sem_conquista não entram nas agregações', () => {
    const analytics = buildWeeklyNutritionAnalytics([
      ci('2026-08-03', { principalDificuldadeTipo: 'sem_dificuldade', principalConquistaTipo: 'sem_conquista' }),
      ci('2026-08-10', { principalDificuldadeTipo: 'horarios', principalConquistaTipo: 'hidratacao' }),
    ]);
    expect(analytics.difficulties.find((d) => d.id === 'sem_dificuldade')).toBeUndefined();
    expect(analytics.achievements.find((d) => d.id === 'sem_conquista')).toBeUndefined();
    expect(analytics.difficulties[0]?.id).toBe('horarios');
  });

  it('Check-in Diário permanece desativado', () => {
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });
});
