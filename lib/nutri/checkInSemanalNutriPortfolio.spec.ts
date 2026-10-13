import { describe, expect, it } from 'vitest';
import { buildWeeklyNutritionAnalytics } from '@/lib/nutri/checkInSemanalNutriAnalytics';
import { CHECK_IN_DIARIO_NUTRI_ENABLED } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import {
  buildWeeklyNutritionPortfolioSummary,
  classifyWeeklyNutritionPortfolioPatient,
  isActiveWeeklyNutritionPortfolioStatus,
  mergeEligiblePatientsWithPortfolioRows,
  sortWeeklyNutritionPortfolioPatients,
  toWeeklyNutritionPortfolioPatient,
} from '@/lib/nutri/checkInSemanalNutriPortfolio';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

function ci(weekKey: string, extra: Partial<CheckInSemanalNutri> = {}): CheckInSemanalNutri {
  const week = getNutritionWeek(weekKey);
  return {
    questionnaireVersion: 'nutri_weekly_v2',
    pacienteId: extra.pacienteId || 'p1',
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

function classify(...records: CheckInSemanalNutri[]) {
  return classifyWeeklyNutritionPortfolioPatient(buildWeeklyNutritionAnalytics(records));
}

describe('ETAPA 08B — classificação da carteira', () => {
  it('trend improving sem flag relevante → improving', () => {
    const result = classify(
      ci('2026-08-03', { score: 70 }),
      ci('2026-08-10', { score: 78 }),
      ci('2026-08-17', { score: 86 })
    );
    expect(result.classification).toBe('improving');
  });

  it('trend stable sem flag → stable', () => {
    const result = classify(
      ci('2026-08-03', { score: 80 }),
      ci('2026-08-10', { score: 81 }),
      ci('2026-08-17', { score: 82 })
    );
    expect(result.classification).toBe('stable');
  });

  it('trend declining → attention', () => {
    const result = classify(
      ci('2026-08-03', { score: 84 }),
      ci('2026-08-10', { score: 76 }),
      ci('2026-08-17', { score: 68 })
    );
    expect(result.classification).toBe('attention');
    expect(result.reasons.some((r) => r.id === 'trend:declining')).toBe(true);
  });

  it('trend improving + severe recorrente → attention', () => {
    const result = classify(
      ci('2026-08-03', { score: 70, constipacao: 'grave' }),
      ci('2026-08-10', { score: 78, constipacao: 'grave' }),
      ci('2026-08-17', { score: 88, constipacao: 'grave' })
    );
    expect(result.classification).toBe('attention');
    expect(result.reasons.some((r) => r.id === 'recurring:severe_constipation')).toBe(true);
  });

  it('1 resposta sem alerta → insufficient_data', () => {
    const result = classify(ci('2026-08-17', { score: 84 }));
    expect(result.classification).toBe('insufficient_data');
  });

  it('1 resposta com flag severa → attention', () => {
    const result = classify(ci('2026-08-17', { score: 84, nauseas: 'grave' }));
    expect(result.classification).toBe('attention');
  });

  it('primeiro check-in com aderência baixa → attention', () => {
    const result = classify(ci('2026-08-17', { score: 40, aderenciaPlano: 25 }));
    expect(result.classification).toBe('attention');
    expect(result.reasons.some((r) => r.id === 'current:low_adherence')).toBe(true);
  });

  it('2 respostas sem alerta não viram estável', () => {
    const result = classify(ci('2026-08-10', { score: 70 }), ci('2026-08-17', { score: 84 }));
    expect(result.classification).toBe('insufficient_data');
  });

  it('0 respostas → insufficient_data', () => {
    expect(classifyWeeklyNutritionPortfolioPatient(buildWeeklyNutritionAnalytics([])).classification).toBe(
      'insufficient_data'
    );
  });

  it('score < 60 eleva para attention mesmo com tendência estável', () => {
    const result = classify(
      ci('2026-08-03', { score: 58 }),
      ci('2026-08-10', { score: 57 }),
      ci('2026-08-17', { score: 58 })
    );
    expect(result.classification).toBe('attention');
    expect(result.reasons.some((r) => r.id === 'score:low')).toBe(true);
  });
});

describe('ETAPA 08B — exclusividade e KPIs', () => {
  it('cada paciente em exatamente uma categoria e a soma fecha o total', () => {
    const patients = [
      toWeeklyNutritionPortfolioPatient({
        patientId: 'a',
        patientName: 'Ana',
        analytics: buildWeeklyNutritionAnalytics([
          ci('2026-08-03', { score: 70, pacienteId: 'a' }),
          ci('2026-08-10', { score: 78, pacienteId: 'a' }),
          ci('2026-08-17', { score: 86, pacienteId: 'a' }),
        ]),
      }),
      toWeeklyNutritionPortfolioPatient({
        patientId: 'b',
        patientName: 'Bruno',
        analytics: buildWeeklyNutritionAnalytics([
          ci('2026-08-03', { score: 80, pacienteId: 'b' }),
          ci('2026-08-10', { score: 81, pacienteId: 'b' }),
          ci('2026-08-17', { score: 82, pacienteId: 'b' }),
        ]),
      }),
      toWeeklyNutritionPortfolioPatient({
        patientId: 'c',
        patientName: 'Carla',
        analytics: buildWeeklyNutritionAnalytics([
          ci('2026-08-03', { score: 84, pacienteId: 'c' }),
          ci('2026-08-10', { score: 76, pacienteId: 'c' }),
          ci('2026-08-17', { score: 68, pacienteId: 'c' }),
        ]),
      }),
      toWeeklyNutritionPortfolioPatient({
        patientId: 'd',
        patientName: 'Diego',
        analytics: buildWeeklyNutritionAnalytics([ci('2026-08-17', { score: 84, pacienteId: 'd' })]),
      }),
    ];
    const summary = buildWeeklyNutritionPortfolioSummary(patients);
    expect(summary.improving + summary.stable + summary.attention + summary.insufficientData).toBe(summary.total);
    expect(summary.total).toBe(4);
    expect(summary.improving).toBe(1);
    expect(summary.stable).toBe(1);
    expect(summary.attention).toBe(1);
    expect(summary.insufficientData).toBe(1);
  });
});

describe('ETAPA 08B — prioridade', () => {
  it('severe recorrente aparece antes de hidratação isolada', () => {
    const severe = toWeeklyNutritionPortfolioPatient({
      patientId: 'maria',
      patientName: 'Maria Silva',
      analytics: buildWeeklyNutritionAnalytics([
        ci('2026-08-03', { score: 70, constipacao: 'grave', pacienteId: 'maria' }),
        ci('2026-08-10', { score: 78, constipacao: 'grave', pacienteId: 'maria' }),
        ci('2026-08-17', { score: 88, constipacao: 'grave', pacienteId: 'maria' }),
      ]),
    });
    const hydration = toWeeklyNutritionPortfolioPatient({
      patientId: 'joao',
      patientName: 'João Santos',
      analytics: buildWeeklyNutritionAnalytics([ci('2026-08-17', { score: 70, diasMetaAgua: 1, pacienteId: 'joao' })]),
    });
    expect(severe.classification).toBe('attention');
    expect(hydration.classification).toBe('attention');
    const sorted = sortWeeklyNutritionPortfolioPatients([hydration, severe]);
    expect(sorted[0].patientId).toBe('maria');
    expect(severe.priorityScore).toBeGreaterThan(hydration.priorityScore);
  });
});

describe('ETAPA 08B — vínculo e status', () => {
  it('somente em_tratamento entra na carteira ativa', () => {
    expect(isActiveWeeklyNutritionPortfolioStatus('em_tratamento')).toBe(true);
    expect(isActiveWeeklyNutritionPortfolioStatus('pendente')).toBe(false);
    expect(isActiveWeeklyNutritionPortfolioStatus('concluido')).toBe(false);
    expect(isActiveWeeklyNutritionPortfolioStatus('abandono')).toBe(false);
  });

  it('não inclui paciente fora da lista elegível mesmo se houver summary', () => {
    const outsider = toWeeklyNutritionPortfolioPatient({
      patientId: 'outsider',
      patientName: 'Fora',
      analytics: buildWeeklyNutritionAnalytics([
        ci('2026-08-03', { score: 84, pacienteId: 'outsider' }),
        ci('2026-08-10', { score: 76, pacienteId: 'outsider' }),
        ci('2026-08-17', { score: 68, pacienteId: 'outsider' }),
      ]),
    });
    const merged = mergeEligiblePatientsWithPortfolioRows({
      eligiblePatients: [{ patientId: 'ana', patientName: 'Ana' }],
      rows: [outsider],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].patientId).toBe('ana');
    expect(merged[0].classification).toBe('insufficient_data');
  });
});

describe('ETAPA 08B — regressão', () => {
  it('Check-in Diário permanece desativado', () => {
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });
});
