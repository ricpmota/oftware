import { describe, expect, it } from 'vitest';
import {
  clampTrainingWeeksCount,
  generateSessionDates,
  toLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';

describe('generateSessionDates', () => {
  it('treino único devolve só a data de início', () => {
    expect(
      generateSessionDates({
        startDate: '2026-09-16',
        sessionType: 'single',
        weeksCount: 4,
      })
    ).toEqual(['2026-09-16']);
  });

  it('diário preenche a janela de N semanas', () => {
    const dates = generateSessionDates({
      startDate: '2026-09-16',
      sessionType: 'recurring',
      recurrenceFrequency: 'daily',
      weeksCount: 1,
    });
    expect(dates[0]).toBe('2026-09-16');
    expect(dates[dates.length - 1]).toBe('2026-09-22');
    expect(dates).toHaveLength(7);
  });

  it('custom SEG/QUA/SEX a partir de uma quarta não cria a segunda já passada', () => {
    // 2026-09-16 é quarta.
    const dates = generateSessionDates({
      startDate: '2026-09-16',
      sessionType: 'recurring',
      recurrenceFrequency: 'custom',
      weeksCount: 4,
      selectedDaysOfWeek: [1, 3, 5],
    });
    expect(dates).not.toContain('2026-09-14');
    expect(dates[0]).toBe('2026-09-16');
    expect(dates).toContain('2026-09-18');
    expect(dates).toContain('2026-09-21');
    const mondays = dates.filter((d) => new Date(`${d}T00:00:00`).getDay() === 1);
    const wednesdays = dates.filter((d) => new Date(`${d}T00:00:00`).getDay() === 3);
    const fridays = dates.filter((d) => new Date(`${d}T00:00:00`).getDay() === 5);
    expect(mondays).toHaveLength(4);
    expect(wednesdays).toHaveLength(4);
    expect(fridays).toHaveLength(4);
    expect(dates).toHaveLength(12);
  });

  it('um único dia da semana gera uma série naquele weekday', () => {
    const dates = generateSessionDates({
      startDate: '2026-09-16',
      sessionType: 'recurring',
      recurrenceFrequency: 'custom',
      weeksCount: 4,
      selectedDaysOfWeek: [1],
    });
    expect(dates.every((d) => new Date(`${d}T00:00:00`).getDay() === 1)).toBe(true);
    expect(dates).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
  });

  it('rejeita startDate inválida', () => {
    expect(
      generateSessionDates({
        startDate: '16/09/2026',
        sessionType: 'recurring',
        recurrenceFrequency: 'custom',
        selectedDaysOfWeek: [1],
      })
    ).toEqual([]);
  });
});

describe('clampTrainingWeeksCount', () => {
  it('limita 1–12', () => {
    expect(clampTrainingWeeksCount(0)).toBe(1);
    expect(clampTrainingWeeksCount(4)).toBe(4);
    expect(clampTrainingWeeksCount(99)).toBe(12);
  });
});

describe('toLocalYYYYMMDD', () => {
  it('formata sem UTC shift no calendário local', () => {
    expect(toLocalYYYYMMDD(new Date(2026, 8, 16))).toBe('2026-09-16');
  });
});
