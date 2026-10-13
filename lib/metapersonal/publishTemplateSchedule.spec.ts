import { describe, expect, it } from 'vitest';
import { createTemplateExerciseFromCatalog } from '@/lib/personal/planosTreino';
import {
  buildTemplateSchedulePublishPlan,
  coincidingProgramDates,
  collectTemplateScheduleErrors,
  defaultProgramStartDate,
  initialProgramSchedule,
  previewTemplateSchedulePublish,
  publishTemplateSchedule,
} from '@/lib/metapersonal/publishTemplateSchedule';
import { endDateFromWeeks, generateScheduleDates } from '@/lib/metapersonal/bulkWorkoutSchedule';
import { TREINOS_WEEKDAY_TO_JS_DAY } from '@/lib/metapersonal/applyWeeklyTrainingBoard';
import type { TreinosSelectedPatient } from '@/components/metapersonal/treinos/treinosCentral.types';
import type { Exercise } from '@/types/exercise';
import type { PacienteCompleto } from '@/types/obesidade';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

const TODAY = '2026-09-14';

const catalog: Exercise = {
  id: '0025',
  name: 'barbell squat',
  bodyPart: 'upper legs',
  target: 'quads',
  equipment: 'barbell',
  secondaryMuscles: [],
  instructions: [],
};

function makePatient(overrides?: {
  nome?: string;
  userId?: string;
  id?: string;
}): TreinosSelectedPatient {
  const id = overrides?.id || 'pac_1';
  return {
    vinculoId: `${id}_pt`,
    pacienteId: id,
    paciente: {
      id,
      userId: overrides?.userId === undefined ? `uid_${id}` : overrides.userId,
      nome: overrides?.nome || 'Fernando Leite',
    } as PacienteCompleto,
    medicoId: 'med_1',
    medicoNome: 'Dra. Ana',
    dataCompartilhamento: new Date(),
    status: 'ativo',
  };
}

function templateTeste() {
  const exercise = createTemplateExerciseFromCatalog(catalog);
  return {
    id: 'tpl_teste',
    nome: 'Teste',
    exercicios: [{ ...exercise, order: 0 }],
  };
}

function scheduleSeg4w() {
  return initialProgramSchedule({ weekday: 'monday', weekdayDate: TODAY, today: TODAY });
}

describe('publishTemplateSchedule', () => {
  it('pré-seleciona o dia clicado e 4 semanas a partir da data visível', () => {
    const schedule = scheduleSeg4w();
    expect(schedule.selectedDaysOfWeek).toEqual([TREINOS_WEEKDAY_TO_JS_DAY.monday]);
    expect(schedule.startDate).toBe(TODAY);
    expect(schedule.weeksCount).toBe(4);
    expect(schedule.endDate).toBe(endDateFromWeeks(TODAY, 4));
  });

  it('início: dia clicado futuro; se o dia da coluna já passou, usa hoje', () => {
    expect(defaultProgramStartDate('2026-09-21', TODAY)).toBe('2026-09-21');
    expect(defaultProgramStartDate('2026-09-08', TODAY)).toBe(TODAY);
    expect(defaultProgramStartDate(undefined, TODAY)).toBe(TODAY);
  });

  it('sem paciente: zero writes', async () => {
    const writes: string[] = [];
    const result = await publishTemplateSchedule(
      {
        patients: [],
        template: templateTeste(),
        schedule: scheduleSeg4w(),
        createdById: 'pt_1',
        today: TODAY,
      },
      {
        writers: {
          createSessionWithExercises: async (session) => {
            writes.push(session.patientId);
            return 'x';
          },
        },
      }
    );
    expect(result.sessionCount).toBe(0);
    expect(result.errors.some((msg) => msg.includes('paciente'))).toBe(true);
    expect(writes).toEqual([]);
  });

  it('paciente sem userId aborta antes de gravar', async () => {
    const writes: string[] = [];
    const result = await publishTemplateSchedule(
      {
        patients: [makePatient({ id: 'p1', nome: 'Fernando Leite', userId: '' })],
        template: templateTeste(),
        schedule: scheduleSeg4w(),
        createdById: 'pt_1',
        today: TODAY,
      },
      {
        writers: {
          createSessionWithExercises: async (session) => {
            writes.push(session.patientId);
            return 'x';
          },
        },
      }
    );
    expect(writes).toEqual([]);
    expect(result.errors.some((msg) => msg.includes('userId'))).toBe(true);
  });

  it('exige pelo menos um dia e treino com exercício', () => {
    const noDays = collectTemplateScheduleErrors({
      patients: [makePatient()],
      template: templateTeste(),
      schedule: { ...scheduleSeg4w(), selectedDaysOfWeek: [] },
      createdById: 'pt_1',
      today: TODAY,
    });
    expect(noDays.some((msg) => msg.toLowerCase().includes('dia'))).toBe(true);

    const empty = collectTemplateScheduleErrors({
      patients: [makePatient()],
      template: { id: 'tpl', nome: 'Teste', exercicios: [] },
      schedule: scheduleSeg4w(),
      createdById: 'pt_1',
      today: TODAY,
    });
    expect(empty.some((msg) => msg.includes('exercício'))).toBe(true);
  });

  it('Fernando + SEG + 4 semanas cria sessões publicadas e ativas', async () => {
    const created: Array<{ session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>; exercises: Omit<TrainingSessionExercise, 'order'>[] }> =
      [];
    const fernando = makePatient({ id: 'p1', nome: 'Fernando Leite' });
    const tpl = templateTeste();
    const schedule = scheduleSeg4w();
    const result = await publishTemplateSchedule(
      {
        patients: [fernando],
        template: tpl,
        schedule,
        createdById: 'pt_1',
        today: TODAY,
      },
      {
        writers: {
          createSessionWithExercises: async (session, exercises) => {
            created.push({ session, exercises });
            return `ses_${created.length}`;
          },
        },
      }
    );
    const dates = generateScheduleDates(schedule);
    expect(dates.length).toBe(4);
    expect(dates[0]).toBe(TODAY);
    expect(result.ok).toBe(true);
    expect(result.sessionCount).toBe(4);
    expect(created).toHaveLength(4);
    expect(new Set(created.map((item) => item.session.recurrenceGroupId)).size).toBe(1);
    expect(created.every((item) => item.session.patientId === 'uid_p1')).toBe(true);
    expect(created.every((item) => item.session.published === true)).toBe(true);
    expect(created.every((item) => item.session.active === true)).toBe(true);
    expect(created.every((item) => item.session.createdBy === 'personal_trainer')).toBe(true);
    expect(created.every((item) => item.session.title === 'Teste')).toBe(true);
    expect(created.every((item) => !('templateId' in item.session))).toBe(true);
    expect(created[0].exercises[0].exerciseId).toBe('0025');
    expect(JSON.stringify(created)).not.toMatch(/gymMedia|exerciseGymMedia/);
    expect(tpl.exercicios[0].exerciseId).toBe('0025');
  });

  it('vários dias compartilham o mesmo groupId por paciente e não entre pacientes', () => {
    const schedule = {
      ...scheduleSeg4w(),
      selectedDaysOfWeek: [1, 3, 5],
    };
    const plan = buildTemplateSchedulePublishPlan({
      patients: [
        makePatient({ id: 'p1', nome: 'Fernando' }),
        makePatient({ id: 'p2', nome: 'Maria' }),
      ],
      template: templateTeste(),
      schedule,
      createdById: 'pt_1',
      today: TODAY,
    });
    expect(plan.errors).toEqual([]);
    expect(plan.series).toHaveLength(2);
    expect(plan.series[0].recurrenceGroupId).not.toBe(plan.series[1].recurrenceGroupId);
    expect(plan.series[0].dates).toEqual(plan.series[1].dates);
    expect(plan.series[0].dates.every((date) => [1, 3, 5].includes(new Date(`${date}T00:00:00`).getDay()))).toBe(
      true
    );
    expect(previewTemplateSchedulePublish({
      patients: [makePatient(), makePatient({ id: 'p2', nome: 'Maria' })],
      template: templateTeste(),
      schedule,
      createdById: 'pt_1',
      today: TODAY,
    }).sessionCount).toBe(plan.series[0].dates.length * 2);
  });

  it('falha parcial continua o próximo paciente', async () => {
    let calls = 0;
    const result = await publishTemplateSchedule(
      {
        patients: [makePatient({ id: 'p1', nome: 'Fernando' }), makePatient({ id: 'p2', nome: 'Maria' })],
        template: templateTeste(),
        schedule: scheduleSeg4w(),
        createdById: 'pt_1',
        today: TODAY,
      },
      {
        writers: {
          createSessionWithExercises: async (session) => {
            calls += 1;
            if (session.patientId === 'uid_p1') throw new Error('boom');
            return `ses_${calls}`;
          },
        },
      }
    );
    expect(result.ok).toBe(false);
    expect(result.reports[0].status).toBe('failed');
    expect(result.reports[1].status).toBe('success');
    expect(result.sessionCount).toBe(4);
  });

  it('detecta datas coincidentes sem bloquear o plano', () => {
    const dates = generateScheduleDates(scheduleSeg4w());
    const hits = coincidingProgramDates(
      [{ pacienteId: 'p1', name: 'Fernando Leite' }],
      'Teste',
      dates,
      [
        { pacienteId: 'p1', title: 'Teste', scheduledDate: TODAY },
        { pacienteId: 'p2', title: 'Teste', scheduledDate: TODAY },
        { pacienteId: 'p1', title: 'Costas', scheduledDate: TODAY },
      ]
    );
    expect(hits).toEqual([{ pacienteId: 'p1', name: 'Fernando Leite', dates: [TODAY] }]);
    expect(buildTemplateSchedulePublishPlan({
      patients: [makePatient()],
      template: templateTeste(),
      schedule: scheduleSeg4w(),
      createdById: 'pt_1',
      today: TODAY,
    }).errors).toEqual([]);
  });
});
