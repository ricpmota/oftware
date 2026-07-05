import { describe, expect, it } from 'vitest';
import { formatLeadAge, getLeadIdleDays, getLeadIdleTone } from '@/lib/crm/leadAge';

const NOW = new Date(2026, 5, 21, 12, 0, 0);

describe('leadAge', () => {
  it('formata Hoje e dias', () => {
    expect(formatLeadAge(new Date(2026, 5, 21), NOW)).toBe('Hoje');
    expect(formatLeadAge(new Date(2026, 5, 19), NOW)).toBe('2d');
  });

  it('aplica tom por dias parado', () => {
    expect(getLeadIdleTone(new Date(2026, 5, 20), NOW)).toBe('neutral');
    expect(getLeadIdleTone(new Date(2026, 5, 10), NOW)).toBe('warning');
    expect(getLeadIdleTone(new Date(2026, 4, 1), NOW)).toBe('danger');
    expect(getLeadIdleDays(new Date(2026, 5, 10), NOW)).toBe(11);
  });
});
