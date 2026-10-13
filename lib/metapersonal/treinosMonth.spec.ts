import { describe, expect, it } from 'vitest';
import { monthVisibleRange, shiftMonth } from '@/lib/metapersonal/treinosMonth';

describe('monthVisibleRange', () => {
  it('14. range do calendário inclui padding de meses vizinhos', () => {
    const range = monthVisibleRange('2026-09');
    expect(range.label).toBe('Setembro 2026');
    expect(range.startDate).toBe('2026-08-31');
    expect(range.endDate).toBe('2026-10-04');
    expect(range.days[0]).toMatchObject({ date: '2026-08-31', inMonth: false, weekday: 'monday' });
    expect(range.days.some((day) => day.date === '2026-09-14' && day.inMonth)).toBe(true);
    expect(range.days[range.days.length - 1]).toMatchObject({
      date: '2026-10-04',
      inMonth: false,
      weekday: 'sunday',
    });
  });

  it('navega mês a mês', () => {
    expect(shiftMonth('2026-09', 1)).toBe('2026-10');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});
