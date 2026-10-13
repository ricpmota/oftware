import { describe, expect, it } from 'vitest';
import { labelsForWeekdays, weekdaysFromRecurringRules } from '@/lib/nutri/agenda/recurringWeekdays';

describe('weekdaysFromRecurringRules', () => {
  it('só inclui dias ativos com pelo menos um período', () => {
    const days = weekdaysFromRecurringRules([
      { weekday: 1, enabled: true, periods: [{ startTime: '09:00', endTime: '12:00' }] },
      { weekday: 3, enabled: true, periods: [] },
      { weekday: 5, enabled: false, periods: [{ startTime: '09:00', endTime: '12:00' }] },
      { weekday: 6, enabled: true, periods: [{ startTime: '08:00', endTime: '10:00' }] },
    ]);
    expect(days).toEqual([1, 6]);
    expect(labelsForWeekdays(days)).toEqual(['Segunda-feira', 'Sábado']);
  });

  it('fica vazio quando Recorrente ainda não tem horários', () => {
    expect(
      weekdaysFromRecurringRules([
        { weekday: 1, enabled: true, periods: [] },
        { weekday: 2, enabled: true, periods: [] },
      ])
    ).toEqual([]);
  });
});
