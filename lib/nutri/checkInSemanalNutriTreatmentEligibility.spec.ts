import { describe, expect, it } from 'vitest';
import {
  getNutritionTreatmentWindow,
  isNutritionCheckInScheduledDateEligible,
  isWeeklyNutritionCheckInEligible,
} from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import {
  buildWeeklyNutritionCheckInSlotsForRange,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { BRASIL_TIMEZONE } from '@/lib/time/brasilTimezone';
import type { PacienteCompleto } from '@/types/obesidade';

function patientSlice(overrides: Partial<PacienteCompleto> = {}): PacienteCompleto {
  return {
    id: 'pac-1',
    nome: 'Ricardo Mota',
    email: 'r@test.com',
    statusTratamento: 'em_tratamento',
    planoTerapeutico: {
      metas: {},
      startDate: new Date(2026, 7, 1),
      numeroSemanasTratamento: 9,
      currentDoseMg: 2.5,
    },
    ...overrides,
  } as PacienteCompleto;
}

const schedule = {
  patientId: 'pac-1',
  nutritionistId: 'nutri-1',
  enabled: true,
  weekday: 0 as const,
  time: '18:00',
  timezone: BRASIL_TIMEZONE,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'nutri-1',
};

describe('ETAPA 06 — vigência do tratamento', () => {
  it('em_tratamento + dentro da vigência gera slot', () => {
    const patient = patientSlice();
    const window = getNutritionTreatmentWindow(patient);
    expect(window).not.toBeNull();
    expect(window?.start).toBe('2026-08-01');
    expect(
      isWeeklyNutritionCheckInEligible({
        patient,
        scheduledDate: '2026-08-16',
      })
    ).toBe(true);
  });

  it('em_tratamento + antes do início não gera slot', () => {
    const patient = patientSlice();
    expect(
      isWeeklyNutritionCheckInEligible({
        patient,
        scheduledDate: '2026-07-20',
      })
    ).toBe(false);
  });

  it('em_tratamento + depois do fim não gera slot', () => {
    const patient = patientSlice();
    const window = getNutritionTreatmentWindow(patient)!;
    expect(
      isNutritionCheckInScheduledDateEligible({
        statusTratamento: 'em_tratamento',
        window,
        scheduledDate: '2026-10-25',
      })
    ).toBe(false);
  });

  it('concluido não gera slot futuro', () => {
    expect(
      isWeeklyNutritionCheckInEligible({
        patient: patientSlice({ statusTratamento: 'concluido' }),
        scheduledDate: '2026-08-16',
      })
    ).toBe(false);
  });

  it('abandono não gera slot', () => {
    expect(
      isWeeklyNutritionCheckInEligible({
        patient: patientSlice({ statusTratamento: 'abandono' }),
        scheduledDate: '2026-08-16',
      })
    ).toBe(false);
  });

  it('histórico concluído permanece mesmo após o tratamento', () => {
    expect(
      isNutritionCheckInScheduledDateEligible({
        statusTratamento: 'concluido',
        window: null,
        scheduledDate: '2026-08-16',
        hasRecord: true,
      })
    ).toBe(true);
  });

  it('sem datas suficientes não considera elegível', () => {
    const patient = patientSlice({
      planoTerapeutico: { metas: {} },
    });
    expect(getNutritionTreatmentWindow(patient)).toBeNull();
    expect(isWeeklyNutritionCheckInEligible({ patient, scheduledDate: '2026-08-16' })).toBe(false);
  });

  it('tratamento combinado usa as semanas do plano terapêutico, não o extra de injetáveis', () => {
    const patient = patientSlice({
      planoTerapeutico: {
        metas: {},
        startDate: new Date(2026, 7, 1),
        numeroSemanasTratamento: 9,
        currentDoseMg: 2.5,
        injetaveisAplicacoes: [
          {
            id: 'inj-1',
            protocoloId: 'prot-1',
            protocoloNome: 'Protocolo',
            startDate: new Date(2026, 7, 15),
            numeroSemanasTratamento: 10,
          },
        ],
      },
    });
    const window = getNutritionTreatmentWindow(patient);
    expect(window?.sources).toEqual(['plano']);
    expect(window?.start).toBe('2026-08-01');
    expect(window?.end).toBe('2026-10-02');
  });
});

describe('ETAPA 06 — calendário filtra slots', () => {
  it('setembro não gera upcoming/pending se o tratamento termina em agosto', () => {
    const patient = patientSlice({
      planoTerapeutico: {
        metas: {},
        startDate: new Date(2026, 7, 1),
        numeroSemanasTratamento: 5,
        currentDoseMg: 2.5,
      },
    });
    const window = getNutritionTreatmentWindow(patient);
    const slots = buildWeeklyNutritionCheckInSlotsForRange({
      schedules: [schedule],
      records: [],
      rangeStart: '2026-09-01',
      rangeEnd: '2026-09-30',
      eligibilityByPatient: {
        'pac-1': { statusTratamento: 'em_tratamento', window },
      },
    });
    expect(slots.filter((s) => s.status !== 'completed')).toHaveLength(0);
  });

  it('agosto gera slots no domingo dentro da vigência', () => {
    const patient = patientSlice();
    const window = getNutritionTreatmentWindow(patient);
    const slots = buildWeeklyNutritionCheckInSlotsForRange({
      schedules: [schedule],
      records: [],
      rangeStart: '2026-08-01',
      rangeEnd: '2026-08-31',
      eligibilityByPatient: {
        'pac-1': { statusTratamento: 'em_tratamento', window },
      },
    });
    expect(slots.some((s) => s.scheduledDate === '2026-08-02')).toBe(true);
    expect(slots.every((s) => s.scheduledDate >= window!.start && s.scheduledDate <= window!.end)).toBe(true);
    expect(getNutritionWeek('2026-08-02').weekKey).toBe('2026-07-27');
  });
});

describe('ETAPA 06 — invariantes', () => {
  it('Check-in Diário permanece desativado', async () => {
    const { CHECK_IN_DIARIO_NUTRI_ENABLED } = await import('@/lib/nutri/checkInSemanalNutriCapabilities');
    expect(CHECK_IN_DIARIO_NUTRI_ENABLED).toBe(false);
  });
});
