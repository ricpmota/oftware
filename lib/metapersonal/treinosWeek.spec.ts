import { describe, expect, it } from 'vitest';
import {
  formatWeekRangeLabel,
  weekRangeFromMonday,
  weekdayFromDateStr,
} from '@/lib/metapersonal/treinosWeek';

describe('treinosWeek', () => {
  it('SEG–DOM a partir de uma segunda', () => {
    const range = weekRangeFromMonday('2026-09-14');
    expect(range.startDate).toBe('2026-09-14');
    expect(range.endDate).toBe('2026-09-20');
    expect(range.datesByWeekday.wednesday).toBe('2026-09-16');
  });

  it('mapeia data para weekday local', () => {
    expect(weekdayFromDateStr('2026-09-14')).toBe('monday');
    expect(weekdayFromDateStr('2026-09-20')).toBe('sunday');
  });

  it('formata o rótulo da semana', () => {
    expect(formatWeekRangeLabel('2026-09-14', '2026-09-20')).toBe('14–20 SET');
  });
});
