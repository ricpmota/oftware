import { describe, expect, it } from 'vitest';
import { getPlanoTerapeuticoTreatmentWeeks } from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import { listPickerWeeklyNutritionCheckIns } from '@/lib/nutri/listPendingWeeklyNutritionCheckIns';
import type { PacienteCompleto } from '@/types/obesidade';

function patient(overrides: Partial<PacienteCompleto['planoTerapeutico']> = {}) {
  return {
    id: 'pac-1',
    statusTratamento: 'em_tratamento',
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2026, 7, 1),
      numeroSemanasTratamento: 9,
      ...overrides,
    },
  } as PacienteCompleto;
}

describe('listPickerWeeklyNutritionCheckIns', () => {
  it('lista as semanas do plano já iniciadas, atual primeiro, ordem decrescente', () => {
    const treatmentWeeks = getPlanoTerapeuticoTreatmentWeeks(patient());
    const items = listPickerWeeklyNutritionCheckIns({
      answeredWeekKeys: [],
      treatmentWeeks,
      now: new Date(2026, 7, 22),
    });
    expect(items.map((item) => item.treatmentWeekNumber)).toEqual([4, 3, 2, 1]);
    expect(items[0]?.isCurrent).toBe(true);
    expect(items[0]?.treatmentWeekStart).toBe('2026-08-22');
    expect(items[0]?.treatmentWeekEnd).toBe('2026-08-28');
  });

  it('marca semanas já respondidas', () => {
    const treatmentWeeks = getPlanoTerapeuticoTreatmentWeeks(patient());
    const items = listPickerWeeklyNutritionCheckIns({
      answeredWeekKeys: ['2026-08-17'],
      treatmentWeeks,
      now: new Date(2026, 7, 22),
    });
    const week4 = items.find((item) => item.treatmentWeekNumber === 4);
    expect(week4?.answered).toBe(true);
    expect(items.find((item) => item.treatmentWeekNumber === 1)?.answered).toBe(false);
  });

  it('sem plano lista só a semana nutricional corrente', () => {
    const items = listPickerWeeklyNutritionCheckIns({
      answeredWeekKeys: [],
      treatmentWeeks: [],
      now: new Date(2026, 7, 22),
    });
    expect(items.map((item) => item.week.weekKey)).toEqual(['2026-08-17']);
    expect(items[0]?.isCurrent).toBe(true);
  });
});
