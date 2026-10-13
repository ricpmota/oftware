import { describe, expect, it } from 'vitest';
import { resolveCheckInSemanalNutriStatus } from '@/lib/nutri/checkInSemanalNutriStatus';

describe('resolveCheckInSemanalNutriStatus', () => {
  it('completed quando já existe registro', () => {
    expect(
      resolveCheckInSemanalNutriStatus({
        hasRecord: true,
        scheduledDate: '2026-08-23',
        today: '2026-08-17',
      })
    ).toBe('completed');
  });

  it('upcoming quando scheduledDate ainda é futuro', () => {
    expect(
      resolveCheckInSemanalNutriStatus({
        hasRecord: false,
        scheduledDate: '2026-08-23',
        today: '2026-08-17',
      })
    ).toBe('upcoming');
  });

  it('pending quando scheduledDate já chegou e não há check-in', () => {
    expect(
      resolveCheckInSemanalNutriStatus({
        hasRecord: false,
        scheduledDate: '2026-08-23',
        weekEnd: '2026-08-23',
        today: '2026-08-23',
      })
    ).toBe('pending');
  });

  it('usa weekEnd quando scheduledDate não foi definida', () => {
    expect(
      resolveCheckInSemanalNutriStatus({
        hasRecord: false,
        weekEnd: '2026-08-23',
        today: '2026-08-20',
      })
    ).toBe('upcoming');
  });
});
