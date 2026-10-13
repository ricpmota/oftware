import { describe, expect, it } from 'vitest';
import {
  buildNutritionMonthDaysMondayFirst,
  formatNutritionWeekLongLabel,
  formatNutritionWeekShortLabel,
  getNutritionCheckInReferenceWeek,
  getNutritionWeek,
  getNutritionWeekKey,
  isNutritionCheckInFillableWeek,
  isNutritionCheckInFutureWeek,
  getNutritionCheckInCalendarDate,
  nutritionWeekdayMondayFirst,
  parseNutritionYmdLocal,
} from '@/lib/nutri/checkInSemanalNutriWeek';

describe('getNutritionWeek — segunda a domingo', () => {
  it('segunda 2026-08-17 gera weekKey 2026-08-17 e weekEnd 2026-08-23', () => {
    const week = getNutritionWeek('2026-08-17');
    expect(week.weekKey).toBe('2026-08-17');
    expect(week.weekStart).toBe('2026-08-17');
    expect(week.weekEnd).toBe('2026-08-23');
    expect(week.year).toBe(2026);
    expect(week.isoWeek).toBe(34);
  });

  it('17/08 a 23/08 de 2026 geram a mesma weekKey', () => {
    const dias = [
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23',
    ];
    for (const dia of dias) {
      expect(getNutritionWeekKey(dia)).toBe('2026-08-17');
      expect(getNutritionWeek(dia).weekEnd).toBe('2026-08-23');
    }
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    const week = getNutritionWeek('2026-08-23');
    expect(week.weekKey).toBe('2026-08-17');
  });

  it('virada de mês: domingo 2026-08-02 e segunda 2026-08-03 são semanas diferentes', () => {
    expect(getNutritionWeekKey('2026-08-02')).toBe('2026-07-27');
    expect(getNutritionWeekKey('2026-08-03')).toBe('2026-08-03');
  });

  it('virada de ano: 2026-01-01 (quinta) cai na semana de 2025-12-29', () => {
    const week = getNutritionWeek('2026-01-01');
    expect(week.weekKey).toBe('2025-12-29');
    expect(week.weekEnd).toBe('2026-01-04');
    expect(week.year).toBe(2026);
    expect(week.isoWeek).toBe(1);
  });

  it('interpreta YYYY-MM-DD como dia civil local (não UTC)', () => {
    const local = parseNutritionYmdLocal('2026-08-17');
    expect(local.getFullYear()).toBe(2026);
    expect(local.getMonth()).toBe(7);
    expect(local.getDate()).toBe(17);
    expect(getNutritionWeekKey(local)).toBe('2026-08-17');
  });

  it('Date local no fim do dia ainda cai na mesma semana', () => {
    const tarde = new Date(2026, 7, 17, 23, 45, 0);
    expect(getNutritionWeekKey(tarde)).toBe('2026-08-17');
  });

  it('formatNutritionWeekLongLabel descreve a semana em português', () => {
    expect(formatNutritionWeekLongLabel(getNutritionWeek('2026-08-19'))).toBe(
      'Semana de 17 a 23 de agosto'
    );
  });

  it('formatNutritionWeekShortLabel cabe no botão', () => {
    const label = formatNutritionWeekShortLabel(getNutritionWeek('2026-08-19'));
    expect(label).toMatch(/17/);
    expect(label).toMatch(/23/);
  });

  it('grade mensal começa na segunda e a semana 17–23 ago é uma faixa contínua', () => {
    const days = buildNutritionMonthDaysMondayFirst(new Date(2026, 7, 1));
    expect(days.length % 7).toBe(0);
    const firstReal = days.find((d) => d && d.getDate() === 1);
    expect(firstReal).toBeTruthy();
    const monday = days.find((d) => d && d.getDate() === 17);
    const sunday = days.find((d) => d && d.getDate() === 23);
    expect(monday && nutritionWeekdayMondayFirst(monday)).toBe(0);
    expect(sunday && nutritionWeekdayMondayFirst(sunday)).toBe(6);
    const monIndex = days.findIndex((d) => d && d.getDate() === 17);
    expect(days.slice(monIndex, monIndex + 7).map((d) => d?.getDate())).toEqual([17, 18, 19, 20, 21, 22, 23]);
    expect(days.slice(monIndex, monIndex + 7).every((d) => d && getNutritionWeekKey(d) === '2026-08-17')).toBe(true);
  });

  it('check-in descreve a semana anterior durante a semana em andamento', () => {
    expect(getNutritionCheckInReferenceWeek('2026-08-20').weekKey).toBe('2026-08-10');
    expect(getNutritionCheckInReferenceWeek('2026-08-23').weekKey).toBe('2026-08-17');
  });

  it('quarta-feira não permite preencher a semana em andamento', () => {
    expect(isNutritionCheckInFillableWeek('2026-08-17', '2026-08-19')).toBe(false);
    expect(isNutritionCheckInFillableWeek('2026-08-10', '2026-08-19')).toBe(true);
    expect(isNutritionCheckInFillableWeek('2026-08-17', '2026-08-23')).toBe(true);
  });

  it('semana futura é a que começa depois da semana corrente', () => {
    expect(isNutritionCheckInFutureWeek('2026-08-24', '2026-08-19')).toBe(true);
    expect(isNutritionCheckInFutureWeek('2026-08-17', '2026-08-19')).toBe(false);
    expect(isNutritionCheckInFutureWeek('2026-08-10', '2026-08-19')).toBe(false);
  });

  it('data operacional do check-in é o dia do registro, não a semana descrita', () => {
    const described = getNutritionWeek('2026-08-10');
    expect(
      getNutritionCheckInCalendarDate({
        ...described,
        scheduledDate: '2026-08-17',
      })
    ).toBe('2026-08-17');
    expect(
      getNutritionCheckInCalendarDate({
        ...described,
        scheduledDate: '2026-08-10',
      })
    ).toBe('2026-08-17');
  });
});
