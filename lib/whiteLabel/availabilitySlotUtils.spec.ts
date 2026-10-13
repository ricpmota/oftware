import { describe, expect, it } from 'vitest';
import {
  getBrazilDateKey,
  getBrazilTimeKey,
  isPublicBookableSlot,
  lastDateKeyOfMonth,
  listDateKeysInRange,
  toDateKey,
} from '@/lib/whiteLabel/availabilitySlotUtils';

describe('listDateKeysInRange', () => {
  it('lista o intervalo inclusive e ignora fim de semana quando pedido', () => {
    const dates = listDateKeysInRange('2026-08-03', '2026-08-09', { weekdays: [1, 2, 3, 4, 5] });
    expect(dates).toEqual(['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']);
  });

  it('inverte from/to se vierem invertidos', () => {
    const dates = listDateKeysInRange('2026-08-05', '2026-08-03');
    expect(dates).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
  });

  it('respeita minDate para não criar no passado', () => {
    const dates = listDateKeysInRange('2026-08-01', '2026-08-05', { minDate: '2026-08-04' });
    expect(dates).toEqual(['2026-08-04', '2026-08-05']);
  });

  it('agosto a dezembro começa e termina no mês', () => {
    const from = toDateKey(2026, 7, 1);
    const to = lastDateKeyOfMonth(2026, 11);
    expect(from).toBe('2026-08-01');
    expect(to).toBe('2026-12-31');
    const dates = listDateKeysInRange(from, to, { weekdays: [3] });
    expect(dates[0]).toBe('2026-08-05');
    expect(dates[dates.length - 1]).toBe('2026-12-30');
    expect(dates.length).toBeGreaterThan(15);
  });
});

describe('isPublicBookableSlot', () => {
  // 23/08/2026 08:00 em Brasília = 11:00 UTC
  const sundayMorningUtc = new Date('2026-08-23T11:00:00.000Z');

  it('usa o calendário de Brasília, não o UTC do servidor', () => {
    expect(getBrazilDateKey(sundayMorningUtc)).toBe('2026-08-23');
    expect(getBrazilTimeKey(sundayMorningUtc)).toBe('08:00');
  });

  it('mostra horários manuais de hoje que ainda não começaram', () => {
    expect(
      isPublicBookableSlot({
        date: '2026-08-23',
        startTime: '09:00',
        minAdvanceHours: 0,
        maxAdvanceDays: 30,
        now: sundayMorningUtc,
      })
    ).toBe(true);
    expect(
      isPublicBookableSlot({
        date: '2026-08-23',
        startTime: '11:00',
        minAdvanceHours: 0,
        maxAdvanceDays: 30,
        now: sundayMorningUtc,
      })
    ).toBe(true);
  });

  it('esconde gerados de hoje dentro da antecedência mínima de 4h', () => {
    expect(
      isPublicBookableSlot({
        date: '2026-08-23',
        startTime: '09:00',
        minAdvanceHours: 4,
        maxAdvanceDays: 30,
        now: sundayMorningUtc,
      })
    ).toBe(false);
    expect(
      isPublicBookableSlot({
        date: '2026-08-23',
        startTime: '12:00',
        minAdvanceHours: 4,
        maxAdvanceDays: 30,
        now: sundayMorningUtc,
      })
    ).toBe(true);
  });

  it('mantém dias futuros dentro da janela e recusa o passado', () => {
    expect(
      isPublicBookableSlot({
        date: '2026-08-24',
        startTime: '09:00',
        minAdvanceHours: 4,
        maxAdvanceDays: 30,
        now: sundayMorningUtc,
      })
    ).toBe(true);
    expect(
      isPublicBookableSlot({
        date: '2026-08-22',
        startTime: '09:00',
        minAdvanceHours: 0,
        maxAdvanceDays: 30,
        now: sundayMorningUtc,
      })
    ).toBe(false);
  });
});
