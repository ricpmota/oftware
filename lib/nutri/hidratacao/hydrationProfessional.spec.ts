import { describe, expect, it } from 'vitest';
import {
  classifyHydrationCheckInFulfillment,
  classifyHydrationProfessionalAdherence,
  formatHydrationCheckInPeriod,
  formatHydrationLastRecordLine,
  hydrationCalendarDayTooltip,
  hydrationCheckInOperationalBody,
  hydrationCheckInOperationalTitle,
  hydrationProfessionalNarrative,
  hydrationProfessionalStatusLabel,
  hydrationSourceLabel,
} from '@/lib/nutri/hidratacao/hydrationProfessional';
import {
  hydrationCheckInRateLimited,
  resetHydrationCheckInRateLimitForTests,
} from '@/lib/nutri/hidratacao/hydrationCheckInRateLimit';
import { isHydrationCheckInHashToken, isValidHydrationCheckInToken } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { hashHydrationCheckInToken } from '@/lib/nutri/hidratacao/hydrationCheckInToken';

describe('hydration professional adherence', () => {
  it('não trata ausência de registro como consumo zero', () => {
    expect(
      classifyHydrationProfessionalAdherence({
        daysInPeriod: 7,
        daysRegistered: 0,
        daysWithoutRecord: 7,
        daysGoalReached: 0,
        averageConsumedMl: null,
        averageAdherencePct: null,
      })
    ).toBe('sem_dados');
    expect(
      classifyHydrationProfessionalAdherence({
        daysInPeriod: 7,
        daysRegistered: 2,
        daysWithoutRecord: 5,
        daysGoalReached: 2,
        averageConsumedMl: 2500,
        averageAdherencePct: 100,
      })
    ).toBe('sem_dados');
  });

  it('classifica boa / atenção / baixa só com dados suficientes', () => {
    expect(
      classifyHydrationProfessionalAdherence({
        daysInPeriod: 7,
        daysRegistered: 5,
        daysWithoutRecord: 2,
        daysGoalReached: 4,
        averageConsumedMl: 2400,
        averageAdherencePct: 92,
      })
    ).toBe('boa_adesao');
    expect(
      classifyHydrationProfessionalAdherence({
        daysInPeriod: 7,
        daysRegistered: 4,
        daysWithoutRecord: 3,
        daysGoalReached: 1,
        averageConsumedMl: 1800,
        averageAdherencePct: 70,
      })
    ).toBe('atencao');
    expect(
      classifyHydrationProfessionalAdherence({
        daysInPeriod: 7,
        daysRegistered: 4,
        daysWithoutRecord: 3,
        daysGoalReached: 0,
        averageConsumedMl: 900,
        averageAdherencePct: 40,
      })
    ).toBe('baixa_adesao');
  });

  it('formata período e origem', () => {
    expect(formatHydrationCheckInPeriod(['2026-08-29', '2026-08-30'])).toBe('29–30 AGO');
    expect(hydrationSourceLabel('whatsapp_checkin')).toBe('Check-in (link)');
  });

  it('calcula status do link', () => {
    const dates = ['2026-08-29', '2026-08-30'];
    expect(
      classifyHydrationCheckInFulfillment({
        hasLink: false,
        allowedDates: dates,
        registeredDates: [],
      })
    ).toBe('nenhum');
    expect(
      classifyHydrationCheckInFulfillment({
        hasLink: true,
        allowedDates: dates,
        registeredDates: [],
        expiresAt: new Date('2026-09-10'),
        now: new Date('2026-08-31'),
      })
    ).toBe('pendente');
    expect(
      classifyHydrationCheckInFulfillment({
        hasLink: true,
        allowedDates: dates,
        registeredDates: ['2026-08-29'],
        expiresAt: new Date('2026-09-10'),
        now: new Date('2026-08-31'),
      })
    ).toBe('parcial');
    expect(
      classifyHydrationCheckInFulfillment({
        hasLink: true,
        allowedDates: dates,
        registeredDates: dates,
        expiresAt: new Date('2026-09-10'),
        now: new Date('2026-08-31'),
      })
    ).toBe('concluido');
    expect(
      classifyHydrationCheckInFulfillment({
        hasLink: true,
        allowedDates: dates,
        registeredDates: dates,
        expiresAt: new Date('2026-08-01'),
        now: new Date('2026-08-31'),
      })
    ).toBe('expirado');
  });
});

describe('hydration professional presentation', () => {
  it('mostra Acompanhamento inicial no lugar de Dados insuficientes', () => {
    expect(hydrationProfessionalStatusLabel('insufficient_data')).toBe('Acompanhamento inicial');
    expect(hydrationProfessionalStatusLabel('good')).toBe('Boa adesão');
    expect(hydrationProfessionalStatusLabel('alert')).toBe('Precisa de acompanhamento');
  });

  it('A. insufficient_data ainda mostra métricas conhecidas, sem julgar adesão', () => {
    const text = hydrationProfessionalNarrative({
      evaluation: {
        status: 'insufficient_data',
        reasons: [],
        registeredDays: 1,
        missingDays: 6,
        averagePercentage: 122,
        goalsReached: 1,
        consecutiveMissingDays: 0,
        recentLowAdherenceCount: 0,
        evaluatedAt: new Date(),
        windowDates: [],
      },
      summary: {
        daysInPeriod: 7,
        daysRegistered: 1,
        daysWithoutRecord: 6,
        daysGoalReached: 1,
        averageConsumedMl: 3050,
        averageAdherencePct: 122,
      },
    });
    expect(text).toMatch(/3,1 L/);
    expect(text).toMatch(/122%/);
    expect(text).toMatch(/mais registros/);
    expect(text).not.toMatch(/baixa adesão|Boa adesão/i);
  });

  it('C/D. atenção e alerta usam os dias consecutivos sem registro', () => {
    const attention = hydrationProfessionalNarrative({
      evaluation: {
        status: 'attention',
        reasons: ['no_registration_2_days'],
        registeredDays: 5,
        missingDays: 2,
        averagePercentage: 90,
        goalsReached: 4,
        consecutiveMissingDays: 2,
        recentLowAdherenceCount: 0,
        evaluatedAt: new Date(),
        windowDates: [],
      },
      summary: {
        daysInPeriod: 7,
        daysRegistered: 5,
        daysWithoutRecord: 2,
        daysGoalReached: 4,
        averageConsumedMl: 2300,
        averageAdherencePct: 92,
      },
    });
    expect(attention).toMatch(/Sem registro há 2 dias/);

    const alert = hydrationProfessionalNarrative({
      evaluation: {
        status: 'alert',
        reasons: ['no_registration_3_days'],
        registeredDays: 3,
        missingDays: 4,
        averagePercentage: 70,
        goalsReached: 1,
        consecutiveMissingDays: 4,
        recentLowAdherenceCount: 0,
        evaluatedAt: new Date(),
        windowDates: [],
      },
      summary: {
        daysInPeriod: 7,
        daysRegistered: 3,
        daysWithoutRecord: 4,
        daysGoalReached: 1,
        averageConsumedMl: 1800,
        averageAdherencePct: 72,
      },
    });
    expect(alert).toMatch(/Sem registro há 4 dias/);
  });

  it('E. alerta de baixa adesão registrada não vira diagnóstico', () => {
    const text = hydrationProfessionalNarrative({
      evaluation: {
        status: 'alert',
        reasons: ['below_60_three_of_five'],
        registeredDays: 5,
        missingDays: 2,
        averagePercentage: 55,
        goalsReached: 1,
        consecutiveMissingDays: 0,
        recentLowAdherenceCount: 3,
        evaluatedAt: new Date(),
        windowDates: [],
      },
      summary: {
        daysInPeriod: 7,
        daysRegistered: 5,
        daysWithoutRecord: 2,
        daysGoalReached: 1,
        averageConsumedMl: 1400,
        averageAdherencePct: 55,
      },
    });
    expect(text).toMatch(/60%/);
    expect(text).not.toMatch(/desidrat|clínico|risco/i);
  });

  it('F/G/H/I. humaniza o check-in sem inventar envio', () => {
    expect(hydrationCheckInOperationalTitle('pendente')).toBe('Aguardando preenchimento');
    expect(hydrationCheckInOperationalTitle('parcial')).toBe('Parcialmente preenchido');
    expect(hydrationCheckInOperationalTitle('concluido')).toBe('Check-in concluído');
    expect(
      hydrationCheckInOperationalBody({
        fulfillment: 'pendente',
        lastOpenedAt: null,
        completedAt: null,
        todayYmd: '2026-08-31',
      })
    ).toMatch(/ainda não abriu/);
    expect(
      hydrationCheckInOperationalBody({
        fulfillment: 'pendente',
        lastOpenedAt: '2026-08-31T22:02:00.000-03:00',
        completedAt: null,
        todayYmd: '2026-08-31',
      })
    ).toMatch(/abriu este check-in/);
  });

  it('L. dia sem registro não aparece como 0%', () => {
    expect(
      hydrationCalendarDayTooltip({
        date: '2026-08-30',
        record: null,
        isFuture: false,
      })
    ).toBe('30 AGO · Sem registro');
    expect(
      hydrationCalendarDayTooltip({
        date: '2026-08-30',
        record: null,
        isFuture: false,
      })
    ).not.toMatch(/0%/);
  });

  it('formata último registro em litros', () => {
    expect(
      formatHydrationLastRecordLine(
        {
          date: '2026-08-31',
          goalMl: 2500,
          consumedMl: 3050,
          percentage: 122,
          goalReached: true,
          source: 'patient_portal',
          patientId: 'p1',
          userId: 'u1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        '2026-08-31'
      )
    ).toBe('Hoje · 3,1 L · 122% da meta ✓');
  });
});

describe('hydration check-in rate limit and hash credential', () => {
  it('aceita hash sha256 como credencial pública', () => {
    const hash = hashHydrationCheckInToken('abcdefghijklmnpqrstuvwxy23456789');
    expect(hash).toHaveLength(64);
    expect(isHydrationCheckInHashToken(hash)).toBe(true);
    expect(isValidHydrationCheckInToken(hash)).toBe(true);
  });

  it('bloqueia após excesso sem distinguir o token', () => {
    resetHydrationCheckInRateLimitForTests();
    const now = 1_000_000;
    let blocked = false;
    for (let i = 0; i < 45; i += 1) {
      blocked = hydrationCheckInRateLimited('1.1.1.1', 'token-a', now);
    }
    expect(blocked).toBe(true);
    expect(hydrationCheckInRateLimited('1.1.1.1', 'token-b', now)).toBe(false);
  });
});
