import { describe, expect, it } from 'vitest';
import {
  applyHydrationWrite,
  assertDailyTotalAllowed,
  buildHydrationWeeklySummary,
  calcHydrationPercentage,
  classifyHydrationAdherence,
  hydrationTodayYmd,
  isHydrationGoalReached,
  last7HydrationDates,
  parseHydrationDailyTotalInput,
  parseHydrationLitersInput,
  parseHydrationMlInput,
  formatHydrationLiters,
  remainingMlToGoal,
  datesInHydrationMonth,
  hydrationCalendarCells,
  shiftHydrationMonth,
  canGoToHydrationMonth,
  formatHydrationCheckInDateTitle,
} from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

function record(partial: Partial<HydrationRecord> & Pick<HydrationRecord, 'date' | 'goalMl' | 'consumedMl'>): HydrationRecord {
  const percentage = calcHydrationPercentage(partial.consumedMl, partial.goalMl);
  return {
    source: 'patient_portal',
    patientId: 'p1',
    userId: 'u1',
    createdAt: new Date('2026-08-31T10:00:00'),
    updatedAt: new Date('2026-08-31T10:00:00'),
    percentage,
    goalReached: isHydrationGoalReached(partial.consumedMl, partial.goalMl),
    ...partial,
  };
}

describe('hydrationMath', () => {
  it('usa data civil local, não UTC', () => {
    const lateNightBr = new Date(2026, 7, 31, 23, 30, 0);
    expect(hydrationTodayYmd(lateNightBr)).toBe('2026-08-31');
  });

  it('monta os últimos 7 dias a partir de hoje', () => {
    expect(last7HydrationDates('2026-08-31')).toEqual([
      '2026-08-31',
      '2026-08-30',
      '2026-08-29',
      '2026-08-28',
      '2026-08-27',
      '2026-08-26',
      '2026-08-25',
    ]);
  });

  it('recalcula percentual e permite ultrapassar a meta', () => {
    expect(calcHydrationPercentage(1800, 2500)).toBe(72);
    expect(calcHydrationPercentage(2500, 2500)).toBe(100);
    expect(calcHydrationPercentage(2800, 2500)).toBe(112);
    expect(isHydrationGoalReached(2800, 2500)).toBe(true);
    expect(remainingMlToGoal(1800, 2500)).toBe(700);
    expect(remainingMlToGoal(2800, 2500)).toBe(0);
  });

  it('não classifica ausência de registro como baixa adesão', () => {
    expect(classifyHydrationAdherence({ hasRecord: false })).toBe('nao_informado');
    expect(classifyHydrationAdherence({ hasRecord: false, consumedMl: 0, goalMl: 2500 })).toBe(
      'nao_informado'
    );
    expect(classifyHydrationAdherence({ hasRecord: true, consumedMl: 0, goalMl: 2500 })).toBe(
      'baixa_adesao'
    );
    expect(classifyHydrationAdherence({ hasRecord: true, consumedMl: 1500, goalMl: 2500 })).toBe(
      'abaixo_da_meta'
    );
    expect(classifyHydrationAdherence({ hasRecord: true, consumedMl: 2100, goalMl: 2500 })).toBe(
      'proximo_da_meta'
    );
    expect(classifyHydrationAdherence({ hasRecord: true, consumedMl: 2500, goalMl: 2500 })).toBe(
      'meta_atingida'
    );
  });

  it('congela a meta do dia no primeiro registro', () => {
    const first = applyHydrationWrite(null, { kind: 'add', addMl: 500, currentGoalMl: 2500 });
    expect(first.goalMl).toBe(2500);
    expect(first.consumedMl).toBe(500);

    const later = applyHydrationWrite(
      record({ date: '2026-08-31', goalMl: 2500, consumedMl: 500 }),
      { kind: 'add', addMl: 300, currentGoalMl: 3000 }
    );
    expect(later.goalMl).toBe(2500);
    expect(later.consumedMl).toBe(800);
    expect(later.percentage).toBe(32);
  });

  it('marca justReachedGoal só na transição', () => {
    const crossing = applyHydrationWrite(
      record({ date: '2026-08-31', goalMl: 2500, consumedMl: 2200 }),
      { kind: 'add', addMl: 500, currentGoalMl: 2500 }
    );
    expect(crossing.justReachedGoal).toBe(true);
    expect(crossing.goalReached).toBe(true);

    const already = applyHydrationWrite(
      record({ date: '2026-08-31', goalMl: 2500, consumedMl: 2500 }),
      { kind: 'add', addMl: 200, currentGoalMl: 2500 }
    );
    expect(already.justReachedGoal).toBe(false);
  });

  it('média semanal ignora dias sem registro (não trata como 0 ml)', () => {
    const days = [
      { date: '2026-08-31', record: record({ date: '2026-08-31', goalMl: 2500, consumedMl: 2500 }) },
      { date: '2026-08-30', record: record({ date: '2026-08-30', goalMl: 2500, consumedMl: 2100 }) },
      { date: '2026-08-29', record: null },
      { date: '2026-08-28', record: record({ date: '2026-08-28', goalMl: 2500, consumedMl: 1400 }) },
      { date: '2026-08-27', record: null },
      { date: '2026-08-26', record: record({ date: '2026-08-26', goalMl: 2500, consumedMl: 2500 }) },
      { date: '2026-08-25', record: record({ date: '2026-08-25', goalMl: 2500, consumedMl: 2500 }) },
    ];
    const summary = buildHydrationWeeklySummary(days);
    expect(summary.daysInPeriod).toBe(7);
    expect(summary.daysRegistered).toBe(5);
    expect(summary.daysWithoutRecord).toBe(2);
    expect(summary.daysGoalReached).toBe(3);
    expect(summary.averageConsumedMl).toBe(Math.round((2500 + 2100 + 1400 + 2500 + 2500) / 5));
    expect(summary.averageAdherencePct).toBe(Math.round((100 + 84 + 56 + 100 + 100) / 5));
  });

  it('valida quantidade personalizada', () => {
    expect(parseHydrationMlInput('')).toEqual({ ok: false, error: 'empty' });
    expect(parseHydrationMlInput('abc')).toEqual({ ok: false, error: 'not_number' });
    expect(parseHydrationMlInput('0')).toEqual({ ok: false, error: 'not_positive' });
    expect(parseHydrationMlInput('500')).toEqual({ ok: true, ml: 500 });
    expect(parseHydrationMlInput('5001').ok).toBe(false);
    expect(assertDailyTotalAllowed(20000)).toBe('too_large_day');
    expect(assertDailyTotalAllowed(2800)).toBeNull();
  });

  it('aceita correção do total do dia acima da meta e zero', () => {
    expect(parseHydrationDailyTotalInput('0')).toEqual({ ok: true, ml: 0 });
    expect(parseHydrationDailyTotalInput('2800')).toEqual({ ok: true, ml: 2800 });
    expect(parseHydrationDailyTotalInput('8000')).toEqual({ ok: true, ml: 8000 });
    expect(parseHydrationDailyTotalInput('20000').ok).toBe(false);
  });

  it('converte litros na apresentação e no campo Outro', () => {
    expect(formatHydrationLiters(1000)).toBe('1 L');
    expect(formatHydrationLiters(1500)).toBe('1,5 L');
    expect(formatHydrationLiters(2500)).toBe('2,5 L');
    expect(parseHydrationLitersInput('2,3')).toEqual({ ok: true, ml: 2300 });
    expect(parseHydrationLitersInput('2.5')).toEqual({ ok: true, ml: 2500 });
    expect(parseHydrationLitersInput('3')).toEqual({ ok: true, ml: 3000 });
    expect(parseHydrationLitersInput('2300')).toEqual({ ok: true, ml: 2300 });
    expect(parseHydrationLitersInput('20').ok).toBe(false);
  });

  it('monta o mês civil e a grade segunda–domingo', () => {
    expect(datesInHydrationMonth('2026-08')).toHaveLength(31);
    expect(datesInHydrationMonth('2026-08')[0]).toBe('2026-08-01');
    expect(datesInHydrationMonth('2026-08')[30]).toBe('2026-08-31');
    const cells = hydrationCalendarCells('2026-08');
    expect(cells[0]).toBeNull();
    expect(cells[5]).toBe('2026-08-01');
    expect(shiftHydrationMonth('2026-01', -1)).toBe('2025-12');
    expect(canGoToHydrationMonth('2026-08', '2026-08-31').next).toBe(false);
    expect(canGoToHydrationMonth('2026-08', '2026-08-31').prev).toBe(true);
  });

  it('formata o dia do check-in em calendário', () => {
    expect(formatHydrationCheckInDateTitle('2026-08-30')).toMatch(/,\s*30 de agosto$/);
    expect(formatHydrationCheckInDateTitle('2026-08-31')).toMatch(/,\s*31 de agosto$/);
  });
});
