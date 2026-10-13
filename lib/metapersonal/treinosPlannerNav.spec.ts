import { describe, expect, it } from 'vitest';
import { formatWeekRangeLabel } from '@/lib/metapersonal/treinosWeek';
import {
  formatOpenWeekAriaLabel,
  formatPlannerDateLong,
  goToToday,
  monthFromDate,
  openWeekAtDate,
  setPlannerViewMode,
  shiftPlannerDateDays,
  shiftPlannerDateMonths,
  shiftPlannerNav,
  weekMondayFromDate,
  weekRangeFromReferenceDate,
  type PlannerNavState,
} from '@/lib/metapersonal/treinosPlannerNav';

function weekLabelFromDate(date: string) {
  const range = weekRangeFromReferenceDate(date);
  return formatWeekRangeLabel(range.startDate, range.endDate);
}

const september: PlannerNavState = {
  plannerViewMode: 'month',
  plannerReferenceDate: '2026-09-14',
};

describe('treinosPlannerNav', () => {
  it('1. clicar dia 23 → semana 21–27', () => {
    const next = openWeekAtDate(september, '2026-09-23');
    expect(next.plannerViewMode).toBe('week');
    expect(next.plannerReferenceDate).toBe('2026-09-23');
    expect(weekMondayFromDate(next.plannerReferenceDate)).toBe('2026-09-21');
    expect(weekLabelFromDate(next.plannerReferenceDate)).toBe('21–27 SET');
  });

  it('2. clicar dia 1 do mês', () => {
    const next = openWeekAtDate(september, '2026-09-01');
    expect(weekRangeFromReferenceDate(next.plannerReferenceDate)).toMatchObject({
      startDate: '2026-08-31',
      endDate: '2026-09-06',
    });
  });

  it('3. clicar dia 31', () => {
    const next = openWeekAtDate(september, '2026-08-31');
    expect(weekRangeFromReferenceDate(next.plannerReferenceDate)).toMatchObject({
      startDate: '2026-08-31',
      endDate: '2026-09-06',
    });
    const january = openWeekAtDate(september, '2026-01-31');
    expect(weekRangeFromReferenceDate(january.plannerReferenceDate)).toMatchObject({
      startDate: '2026-01-26',
      endDate: '2026-02-01',
    });
  });

  it('4. virada de mês', () => {
    expect(monthFromDate('2026-09-28')).toBe('2026-09');
    expect(monthFromDate('2026-10-01')).toBe('2026-10');
    expect(weekLabelFromDate('2026-10-01')).toBe('28 SET – 4 OUT');
  });

  it('5. virada de ano', () => {
    expect(shiftPlannerDateMonths('2026-12-23', 1)).toBe('2027-01-23');
    expect(weekRangeFromReferenceDate('2026-12-29')).toMatchObject({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
    });
    expect(monthFromDate('2026-12-29')).toBe('2026-12');
    expect(monthFromDate('2027-01-01')).toBe('2027-01');
  });

  it('6. semanal → mensal preserva referência', () => {
    const week = openWeekAtDate(september, '2026-09-23');
    const month = setPlannerViewMode(week, 'month');
    expect(month.plannerReferenceDate).toBe('2026-09-23');
    expect(month.plannerViewMode).toBe('month');
    expect(monthFromDate(month.plannerReferenceDate)).toBe('2026-09');
  });

  it('7. mensal → semanal não envolve selectedPatients', () => {
    const patients = [{ id: 'joao' }, { id: 'maria' }];
    const next = setPlannerViewMode(september, 'week');
    expect(next.plannerReferenceDate).toBe(september.plannerReferenceDate);
    expect(next).not.toHaveProperty('selectedPatients');
    expect(patients).toHaveLength(2);
  });

  it('8. setas semanais = ±7 dias', () => {
    const state: PlannerNavState = {
      plannerViewMode: 'week',
      plannerReferenceDate: '2026-09-23',
    };
    expect(shiftPlannerNav(state, 1).plannerReferenceDate).toBe('2026-09-30');
    expect(shiftPlannerNav(state, -1).plannerReferenceDate).toBe('2026-09-16');
    expect(shiftPlannerDateDays('2026-09-23', 7)).toBe('2026-09-30');
    expect(weekMondayFromDate('2026-09-30')).toBe('2026-09-28');
  });

  it('9. setas mensais = ±1 mês', () => {
    const state: PlannerNavState = {
      plannerViewMode: 'month',
      plannerReferenceDate: '2026-09-23',
    };
    expect(shiftPlannerNav(state, 1).plannerReferenceDate).toBe('2026-10-23');
    expect(shiftPlannerNav(state, -1).plannerReferenceDate).toBe('2026-08-23');
    expect(shiftPlannerDateMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(monthFromDate('2026-10-23')).toBe('2026-10');
  });

  it('10. Hoje funciona nos dois modos', () => {
    const fromWeek = goToToday(
      { plannerViewMode: 'week', plannerReferenceDate: '2026-09-23' },
      '2026-09-14'
    );
    const fromMonth = goToToday(
      { plannerViewMode: 'month', plannerReferenceDate: '2026-08-01' },
      '2026-09-14'
    );
    expect(fromWeek).toEqual({ plannerViewMode: 'week', plannerReferenceDate: '2026-09-14' });
    expect(fromMonth).toEqual({ plannerViewMode: 'month', plannerReferenceDate: '2026-09-14' });
    expect(weekMondayFromDate(fromWeek.plannerReferenceDate)).toBe('2026-09-14');
    expect(monthFromDate(fromMonth.plannerReferenceDate)).toBe('2026-09');
  });

  it('11. clique no chip não navega; só o dia chama openWeekAtDate', () => {
    expect(september.plannerViewMode).toBe('month');
    expect(september.plannerReferenceDate).toBe('2026-09-14');
    const afterDayClick = openWeekAtDate(september, '2026-09-23');
    expect(afterDayClick.plannerViewMode).toBe('week');
  });

  it('12. Ver nesta semana leva à semana correta', () => {
    const next = openWeekAtDate(
      { plannerViewMode: 'month', plannerReferenceDate: '2026-09-01' },
      '2026-09-23'
    );
    expect(next.plannerViewMode).toBe('week');
    expect(weekLabelFromDate(next.plannerReferenceDate)).toBe('21–27 SET');
  });

  it('formata labels de data e aria', () => {
    expect(formatPlannerDateLong('2026-09-23')).toBe('Quarta-feira, 23 de setembro');
    expect(formatOpenWeekAriaLabel('2026-09-23')).toBe('Abrir semana de 23 de setembro de 2026');
  });
});
