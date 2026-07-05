import { describe, expect, it } from 'vitest';
import {
  formatDateAsDDMMYY,
  parseDDMMYYToYyyyMmDd,
  parseYyyyMmDdToLocalDate,
  yyyyMmDdFromLocalDate,
} from '@/utils/esquemaDoseSemanaDateFormat';

describe('esquemaDoseSemanaDateFormat', () => {
  it('parse YYYY-MM-DD não desloca o dia (sem UTC)', () => {
    const d = parseYyyyMmDdToLocalDate('2025-03-15');
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2025);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(15);
    expect(yyyyMmDdFromLocalDate(d!)).toBe('2025-03-15');
  });

  it('DD/MM/AA ↔ YYYY-MM-DD mantém o mesmo dia civil', () => {
    expect(parseDDMMYYToYyyyMmDd('15/03/25')).toBe('2025-03-15');
    const d = parseYyyyMmDdToLocalDate('2025-03-15')!;
    expect(formatDateAsDDMMYY(d)).toBe('15/03/25');
  });
});
