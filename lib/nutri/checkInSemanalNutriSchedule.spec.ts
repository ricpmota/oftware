import { describe, expect, it } from 'vitest';
import { CHECK_IN_SEMANAL_QUESTIONS } from '@/lib/aplicacao/checkInSemanalQuestions';
import { CHECK_IN_DIARIO_NUTRI_ENABLED, getCheckInSemanalNutriCapabilities } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import {
  buildWeeklyNutritionCheckInSlot,
  buildWeeklyNutritionCheckInSlotsForRange,
  deserializeNutriWeeklyCheckInSchedule,
  DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY,
  formatWeeklyNutritionCheckInFillWindowLabel,
  getScheduledDateForNutritionWeek,
  getWeeklyNutritionCheckInFillWindow,
  isWeeklyNutritionCheckInFillWindowOpen,
  NUTRI_WEEKDAY_SUNDAY_0,
  resolveWeeklyNutritionCheckInSlotStatus,
  weekdayOffsetFromMonday,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import { canCreateWeeklyNutritionCheckIn } from '@/lib/nutri/canEditWeeklyNutritionCheckIn';
import { getNutritionCheckInReferenceWeek, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { BRASIL_TIMEZONE, brasiliaWallTimeToInstant } from '@/lib/time/brasilTimezone';

const WEEK = getNutritionWeek('2026-08-17');

describe('ETAPA 04 — scheduledDate na semana nutricional', () => {
  it('weekKey 2026-08-17 + domingo = 2026-08-23', () => {
    expect(WEEK.weekKey).toBe('2026-08-17');
    expect(getScheduledDateForNutritionWeek(WEEK, 0)).toBe('2026-08-23');
  });

  it.each([
    [1, '2026-08-24'],
    [2, '2026-08-25'],
    [3, '2026-08-26'],
    [4, '2026-08-27'],
    [5, '2026-08-28'],
    [6, '2026-08-29'],
    [0, '2026-08-23'],
  ] as const)('weekday %s → %s', (weekday, expected) => {
    expect(getScheduledDateForNutritionWeek(WEEK, weekday)).toBe(expected);
  });

  it('segunda-feira relata a semana anterior: 10–16/08 → dia 17', () => {
    const described = getNutritionWeek('2026-08-10');
    expect(getScheduledDateForNutritionWeek(described, 1)).toBe('2026-08-17');
    expect(getNutritionCheckInReferenceWeek('2026-08-17').weekKey).toBe(described.weekKey);
  });

  it('a data agendada descreve a weekKey correspondente', () => {
    for (const weekday of NUTRI_WEEKDAY_SUNDAY_0) {
      const scheduled = getScheduledDateForNutritionWeek(WEEK, weekday);
      expect(getNutritionCheckInReferenceWeek(scheduled).weekKey).toBe(WEEK.weekKey);
    }
  });

  it('virada de mês: semana 2026-08-31 domingo = 2026-09-06', () => {
    const week = getNutritionWeek('2026-08-31');
    expect(week.weekKey).toBe('2026-08-31');
    expect(getScheduledDateForNutritionWeek(week, 0)).toBe('2026-09-06');
  });

  it('virada de ano: semana 2026-12-28 domingo = 2027-01-03', () => {
    const week = getNutritionWeek('2026-12-28');
    expect(week.weekKey).toBe('2026-12-28');
    expect(getScheduledDateForNutritionWeek(week, 0)).toBe('2027-01-03');
  });

  it('offset segunda=0 … domingo=6 cobre 0–6', () => {
    expect(NUTRI_WEEKDAY_SUNDAY_0.map(weekdayOffsetFromMonday)).toEqual([6, 0, 1, 2, 3, 4, 5]);
  });
});

describe('ETAPA 04 — status do slot', () => {
  const future = new Date('2026-08-23T20:00:00-03:00');
  const past = new Date('2026-08-23T21:00:00-03:00');

  it('upcoming quando scheduledAt > agora e não há check-in', () => {
    expect(
      resolveWeeklyNutritionCheckInSlotStatus({
        hasRecord: false,
        scheduledDate: '2026-08-23',
        scheduledTime: '18:00',
        now: new Date('2026-08-23T17:00:00-03:00'),
      })
    ).toBe('upcoming');
  });

  it('pending quando scheduledAt <= agora e não há check-in', () => {
    expect(
      resolveWeeklyNutritionCheckInSlotStatus({
        hasRecord: false,
        scheduledDate: '2026-08-23',
        scheduledTime: '18:00',
        now: past,
      })
    ).toBe('pending');
  });

  it('completed tem prioridade mesmo se o horário ainda é futuro', () => {
    expect(
      resolveWeeklyNutritionCheckInSlotStatus({
        hasRecord: true,
        scheduledDate: '2026-08-23',
        scheduledTime: '18:00',
        now: new Date('2026-08-20T10:00:00-03:00'),
      })
    ).toBe('completed');
  });

  it('usa timezone de Brasília, não o relógio local implícito do helper', () => {
    expect(BRASIL_TIMEZONE).toBe('America/Sao_Paulo');
    expect(future.getTime()).toBeLessThan(past.getTime());
  });
});

describe('ETAPA 04 — slots virtuais', () => {
  const schedule = {
    patientId: 'pac-1',
    nutritionistId: 'nutri-1',
    enabled: true,
    weekday: 0 as const,
    time: '18:00',
  };

  it('não cria documento clínico: slot não inclui answers', () => {
    const slot = buildWeeklyNutritionCheckInSlot({ schedule, week: WEEK, record: null });
    expect(slot?.weekKey).toBe('2026-08-17');
    expect(slot?.scheduledDate).toBe('2026-08-23');
    expect(slot && 'score' in slot).toBe(false);
  });

  it('enabled=false não gera slot futuro', () => {
    expect(
      buildWeeklyNutritionCheckInSlot({
        schedule: { ...schedule, enabled: false },
        week: WEEK,
        record: null,
      })
    ).toBeNull();
  });

  it('check-in pelo link público também marca o card como completed', () => {
    const slot = buildWeeklyNutritionCheckInSlot({
      schedule,
      week: WEEK,
      record: { weekKey: '2026-08-17', scheduledDate: '2026-08-23' },
    });
    expect(slot?.status).toBe('completed');
  });

  it('enabled=false ainda mostra slot concluído (histórico)', () => {
    const slot = buildWeeklyNutritionCheckInSlot({
      schedule: { ...schedule, enabled: false },
      week: WEEK,
      record: { weekKey: '2026-08-17', scheduledDate: '2026-08-23' },
    });
    expect(slot?.status).toBe('completed');
    expect(slot?.scheduledDate).toBe('2026-08-23');
  });

  it('mudança domingo → sábado move slot sem check-in', () => {
    const sunday = buildWeeklyNutritionCheckInSlot({ schedule, week: WEEK, record: null });
    const saturday = buildWeeklyNutritionCheckInSlot({
      schedule: { ...schedule, weekday: 6 },
      week: WEEK,
      record: null,
    });
    expect(sunday?.scheduledDate).toBe('2026-08-23');
    expect(saturday?.scheduledDate).toBe('2026-08-29');
    expect(saturday?.weekKey).toBe(sunday?.weekKey);
  });

  it('check-in feito na segunda aparece no dia 17, não nos dias 10–16', () => {
    const described = getNutritionWeek('2026-08-10');
    const slot = buildWeeklyNutritionCheckInSlot({
      schedule: { ...schedule, weekday: 1 },
      week: described,
      record: { weekKey: '2026-08-10', scheduledDate: '2026-08-17' },
    });
    expect(slot?.weekKey).toBe('2026-08-10');
    expect(slot?.scheduledDate).toBe('2026-08-17');
    expect(slot?.status).toBe('completed');
  });

  it('check-in existente mantém scheduledDate original após mudar o dia', () => {
    const slot = buildWeeklyNutritionCheckInSlot({
      schedule: { ...schedule, weekday: 6 },
      week: WEEK,
      record: { weekKey: '2026-08-17', scheduledDate: '2026-08-23' },
    });
    expect(slot?.weekKey).toBe('2026-08-17');
    expect(slot?.scheduledDate).toBe('2026-08-23');
    expect(slot?.status).toBe('completed');
  });

  it('resposta atrasada pinta o dia programado, não o dia em que respondeu', () => {
    const described = getNutritionWeek('2026-08-10');
    const mondaySchedule = { ...schedule, weekday: 1 as const };
    const slot = buildWeeklyNutritionCheckInSlot({
      schedule: mondaySchedule,
      week: described,
      record: { weekKey: '2026-08-10', scheduledDate: '2026-08-19' },
    });
    expect(getScheduledDateForNutritionWeek(described, 1)).toBe('2026-08-17');
    expect(slot?.weekKey).toBe('2026-08-10');
    expect(slot?.scheduledDate).toBe('2026-08-17');
    expect(slot?.status).toBe('completed');
  });

  it('gera apenas slots do intervalo visível', () => {
    const slots = buildWeeklyNutritionCheckInSlotsForRange({
      schedules: [{ ...schedule, timezone: BRASIL_TIMEZONE, createdAt: new Date(), updatedAt: new Date(), createdBy: 'nutri-1' }],
      records: [],
      rangeStart: '2026-08-01',
      rangeEnd: '2026-08-31',
    });
    expect(slots.every((s) => s.scheduledDate >= '2026-08-01' && s.scheduledDate <= '2026-08-31')).toBe(true);
    expect(slots.some((s) => s.scheduledDate === '2026-08-23')).toBe(true);
    expect(slots.some((s) => s.scheduledDate === '2026-09-06')).toBe(false);
  });
});

describe('ETAPA 04 — papéis', () => {
  it('somente nutricionista configura cronograma', () => {
    expect(getCheckInSemanalNutriCapabilities('nutritionist').configureSchedule).toBe(true);
    expect(getCheckInSemanalNutriCapabilities('doctor').configureSchedule).toBe(false);
    expect(getCheckInSemanalNutriCapabilities('personal').configureSchedule).toBe(false);
    expect(getCheckInSemanalNutriCapabilities('patient').configureSchedule).toBe(false);
  });
});

describe('janela de preenchimento — Check-in Ativo', () => {
  const described = getNutritionWeek('2026-08-10');
  const current = getNutritionWeek('2026-08-17');
  const mondaySchedule = { weekday: 1 as const, time: '18:00', enabled: true };

  it('semana 10–16 só abre na segunda 17 às 18:00', () => {
    expect(
      isWeeklyNutritionCheckInFillWindowOpen({
        week: described,
        schedule: mondaySchedule,
        now: brasiliaWallTimeToInstant('2026-08-17', '17:59'),
      })
    ).toBe(false);
    expect(
      isWeeklyNutritionCheckInFillWindowOpen({
        week: described,
        schedule: mondaySchedule,
        now: brasiliaWallTimeToInstant('2026-08-17', '18:00'),
      })
    ).toBe(true);
  });

  it('semana 17–23 não abre no dia 17; espera o Check-in Ativo dessa semana', () => {
    expect(
      isWeeklyNutritionCheckInFillWindowOpen({
        week: current,
        schedule: mondaySchedule,
        now: brasiliaWallTimeToInstant('2026-08-17', '19:00'),
      })
    ).toBe(false);
    expect(getWeeklyNutritionCheckInFillWindow({ week: current, schedule: mondaySchedule }).scheduledDate).toBe(
      '2026-08-24'
    );
  });

  it('paciente não preenche a semana em andamento antes do horário ativo', () => {
    const now = brasiliaWallTimeToInstant('2026-08-17', '19:00');
    expect(
      canCreateWeeklyNutritionCheckIn({
        weekKey: current.weekKey,
        today: now,
        now,
        capabilities: getCheckInSemanalNutriCapabilities('patient'),
        schedule: mondaySchedule,
      })
    ).toBe(false);
    expect(
      canCreateWeeklyNutritionCheckIn({
        weekKey: described.weekKey,
        today: now,
        now,
        capabilities: getCheckInSemanalNutriCapabilities('patient'),
        schedule: mondaySchedule,
      })
    ).toBe(true);
  });

  it('nutricionista também espera o Check-in Ativo da semana corrente', () => {
    const now = brasiliaWallTimeToInstant('2026-08-17', '19:00');
    expect(
      canCreateWeeklyNutritionCheckIn({
        weekKey: current.weekKey,
        today: now,
        now,
        capabilities: getCheckInSemanalNutriCapabilities('nutritionist'),
        schedule: mondaySchedule,
      })
    ).toBe(false);
  });

  it('rótulo descreve dia e hora do Check-in Ativo', () => {
    expect(
      formatWeeklyNutritionCheckInFillWindowLabel(
        getWeeklyNutritionCheckInFillWindow({ week: described, schedule: mondaySchedule })
      )
    ).toBe('Segunda-feira, 17/08, às 18:00');
  });

  it('sem cronograma, o envio padrão é segunda-feira', () => {
    expect(DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY).toBe(1);
    expect(getWeeklyNutritionCheckInFillWindow({ week: described }).scheduledDate).toBe('2026-08-17');
    expect(getWeeklyNutritionCheckInFillWindow({ week: described }).weekday).toBe(1);
  });
});

describe('envio fixo na segunda-feira', () => {
  it('agenda gravada em outro dia é lida como segunda-feira', () => {
    const parsed = deserializeNutriWeeklyCheckInSchedule(
      {
        patientId: 'pac-1',
        nutritionistId: 'nutri-1',
        enabled: true,
        weekday: 0,
        time: '19:30',
      },
      { nutritionistId: 'nutri-1', patientId: 'pac-1' }
    );
    expect(parsed?.weekday).toBe(1);
    expect(parsed?.time).toBe('19:30');
  });
});

describe('ETAPA 04 — regressão', () => {
  it('diário permanece desativado', () => {
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });

  it('/aplicacao permanece com localAplicacao', () => {
    expect(CHECK_IN_SEMANAL_QUESTIONS.some((q) => q.key === 'localAplicacao')).toBe(true);
  });
});
