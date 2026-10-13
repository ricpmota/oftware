import { describe, expect, it } from 'vitest';
import {
  alertTypesFromEvaluation,
  evaluateHydrationAdherence,
  hydrationAdherenceAlertDocId,
  recordAdherencePct,
} from '@/lib/nutri/hidratacao/hydrationAdherence';
import { addDaysToHydrationYmd, last7HydrationDates } from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationDayView, HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

const TODAY = '2026-08-31';

function rec(date: string, pct: number, goalMl = 2000): HydrationRecord {
  const consumedMl = Math.round((pct / 100) * goalMl);
  return {
    date,
    goalMl,
    consumedMl,
    percentage: pct,
    goalReached: consumedMl >= goalMl,
    source: 'patient_portal',
    patientId: 'p1',
    userId: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function daysFrom(spec: Array<{ date: string; pct?: number | null }>): HydrationDayView[] {
  return spec.map((item) => ({
    date: item.date,
    record: item.pct == null ? null : rec(item.date, item.pct),
  }));
}

function windowWith(registered: Record<string, number | null>): HydrationDayView[] {
  return last7HydrationDates(TODAY).map((date) => ({
    date,
    record: registered[date] == null ? null : rec(date, registered[date] as number),
  }));
}

describe('evaluateHydrationAdherence', () => {
  it('A. 7 dias bons → good', () => {
    const days = last7HydrationDates(TODAY).map((date) => ({ date, record: rec(date, 100) }));
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('good');
    expect(result.reasons).toEqual([]);
    expect(result.registeredDays).toBe(7);
    expect(result.averagePercentage).toBe(100);
  });

  it('B. 2 dias sem registro → attention', () => {
    const days = windowWith({
      '2026-08-31': null,
      '2026-08-30': null,
      '2026-08-29': 100,
      '2026-08-28': 100,
      '2026-08-27': 100,
      '2026-08-26': 100,
      '2026-08-25': 100,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('attention');
    expect(result.reasons).toContain('no_registration_2_days');
    expect(result.consecutiveMissingDays).toBe(2);
    expect(alertTypesFromEvaluation(result)).toEqual([]);
  });

  it('C. 3 dias sem registro → alert', () => {
    const days = windowWith({
      '2026-08-31': null,
      '2026-08-30': null,
      '2026-08-29': null,
      '2026-08-28': 100,
      '2026-08-27': 100,
      '2026-08-26': 100,
      '2026-08-25': 100,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('alert');
    expect(result.reasons).toContain('no_registration_3_days');
    expect(alertTypesFromEvaluation(result)).toEqual(['missing_registration']);
  });

  it('D. 2 registros <80% → attention', () => {
    const days = windowWith({
      '2026-08-31': 70,
      '2026-08-30': 75,
      '2026-08-29': 100,
      '2026-08-28': 100,
      '2026-08-27': 100,
      '2026-08-26': 100,
      '2026-08-25': 100,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('attention');
    expect(result.reasons).toContain('below_80_two_consecutive');
    expect(alertTypesFromEvaluation(result)).toEqual([]);
  });

  it('E. 3/5 registros <60% → alert', () => {
    const days = windowWith({
      '2026-08-31': 40,
      '2026-08-30': 100,
      '2026-08-29': 50,
      '2026-08-28': 100,
      '2026-08-27': 45,
      '2026-08-26': 100,
      '2026-08-25': 100,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('alert');
    expect(result.reasons).toContain('below_60_three_of_five');
    expect(alertTypesFromEvaluation(result)).toEqual(['low_recorded_adherence']);
  });

  it('F. 1 dia ruim → sem alerta', () => {
    const days = windowWith({
      '2026-08-31': 50,
      '2026-08-30': 100,
      '2026-08-29': 100,
      '2026-08-28': 100,
      '2026-08-27': 100,
      '2026-08-26': 100,
      '2026-08-25': 100,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('good');
    expect(result.reasons).toEqual([]);
    expect(alertTypesFromEvaluation(result)).toEqual([]);
  });

  it('G. menos de 3 registros → insufficient_data (mesmo com % baixo)', () => {
    const days = windowWith({
      '2026-08-31': 40,
      '2026-08-30': 40,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('insufficient_data');
    expect(result.registeredDays).toBe(2);
    expect(result.reasons).not.toContain('below_80_two_consecutive');
    expect(alertTypesFromEvaluation(result)).toEqual([]);
  });

  it('G2. 3 dias sem registro e poucos dados → alerta de falta de registro, não de baixa adesão', () => {
    const days = windowWith({
      '2026-08-31': null,
      '2026-08-30': null,
      '2026-08-29': null,
    });
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.status).toBe('alert');
    expect(result.registeredDays).toBe(0);
    expect(result.averagePercentage).toBeNull();
    expect(result.reasons).toEqual(['no_registration_3_days']);
    expect(alertTypesFromEvaluation(result)).toEqual(['missing_registration']);
  });

  it('H. alerta ativo + melhora → resolved (condição some)', () => {
    const before = evaluateHydrationAdherence({
      days: windowWith({
        '2026-08-31': null,
        '2026-08-30': null,
        '2026-08-29': null,
        '2026-08-28': 100,
        '2026-08-27': 100,
        '2026-08-26': 100,
        '2026-08-25': 100,
      }),
      todayYmd: TODAY,
    });
    expect(alertTypesFromEvaluation(before)).toContain('missing_registration');

    const after = evaluateHydrationAdherence({
      days: windowWith({
        '2026-08-31': 100,
        '2026-08-30': 100,
        '2026-08-29': 100,
        '2026-08-28': 100,
        '2026-08-27': 100,
        '2026-08-26': 100,
        '2026-08-25': 100,
      }),
      todayYmd: TODAY,
    });
    expect(after.status).toBe('good');
    expect(alertTypesFromEvaluation(after)).toEqual([]);
  });

  it('I. condição persiste → mesmo id lógico, não duplica', () => {
    expect(hydrationAdherenceAlertDocId('p1', 'missing_registration')).toBe('p1_missing_registration');
    expect(hydrationAdherenceAlertDocId('p1', 'missing_registration')).toBe(
      hydrationAdherenceAlertDocId('p1', 'missing_registration')
    );
    expect(hydrationAdherenceAlertDocId('p1', 'low_recorded_adherence')).not.toBe(
      hydrationAdherenceAlertDocId('p1', 'missing_registration')
    );
  });

  it('J. ausência de registro nunca é convertida em consumo 0', () => {
    const days = daysFrom([
      { date: '2026-08-31', pct: 100 },
      { date: '2026-08-30', pct: null },
      { date: '2026-08-29', pct: 100 },
      { date: '2026-08-28', pct: null },
      { date: '2026-08-27', pct: 100 },
      { date: '2026-08-26', pct: null },
      { date: '2026-08-25', pct: 100 },
    ]);
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.registeredDays).toBe(4);
    expect(result.averagePercentage).toBe(100);
    expect(result.averagePercentage).not.toBe(Math.round((100 * 4) / 7));
    const missingDay = days.find((d) => d.date === '2026-08-30')!;
    expect(missingDay.record).toBeNull();
    expect(missingDay.record?.consumedMl ?? null).toBeNull();
  });
});

describe('recordAdherencePct', () => {
  it('recalcula a partir de consumed/goal, sem inventar 0 para dia vazio', () => {
    expect(recordAdherencePct(rec('2026-08-31', 80, 2500))).toBe(80);
  });
});

describe('janela sem dias futuros', () => {
  it('ignora datas depois de hoje', () => {
    const days = [
      { date: addDaysToHydrationYmd(TODAY, 1), record: rec(addDaysToHydrationYmd(TODAY, 1), 10) },
      ...last7HydrationDates(TODAY).map((date) => ({ date, record: rec(date, 100) })),
    ];
    const result = evaluateHydrationAdherence({ days, todayYmd: TODAY });
    expect(result.windowDates).not.toContain(addDaysToHydrationYmd(TODAY, 1));
    expect(result.averagePercentage).toBe(100);
  });
});
