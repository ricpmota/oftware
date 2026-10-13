import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import { inferRecurringConfigFromSessions } from '@/lib/personal/inferRecurringConfig';
import {
  applyCombinedWorkoutEdit,
  diffScheduleDates,
  endDateFromWeeks,
  generateScheduleDates,
  inferOperationalSchedule,
  previewCombinedWorkoutEdit,
  scheduleFingerprint,
  weeksFromRange,
  type CombinedEditInput,
  type CombinedEditWriters,
  type WorkoutScheduleConfig,
} from '@/lib/metapersonal/bulkWorkoutSchedule';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

const TODAY = '2026-09-14';

function prescription(reps: number, loadKg: number | null): TrainingSessionExercise['prescription'] {
  return {
    series: createDefaultTrainingSeries().map((item) => ({
      ...item,
      reps,
      loadKg,
      restSec: 60,
    })),
  };
}

function squat(docId: string, loadKg: number | null): TrainingSessionExercise {
  return {
    id: docId,
    source: 'exercisedb',
    exerciseId: '0025',
    name: 'Agachamento',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'barbell',
    prescription: prescription(12, loadKg),
    order: 0,
  };
}

function session(overrides: Partial<TrainingSession> & { id: string; patientId: string }): TrainingSession {
  return {
    createdBy: 'trainer',
    createdById: 'pt',
    scheduledDate: TODAY,
    title: 'Costas',
    status: 'scheduled',
    published: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceGroupId: 'g1',
    ...overrides,
  };
}

type Store = {
  sessions: Map<string, TrainingSession>;
  exercises: Map<string, TrainingSessionExercise[]>;
};

function emptyStore(): Store {
  return { sessions: new Map(), exercises: new Map() };
}

const NAMES: Record<string, string> = { p1: 'João', p2: 'Maria', p3: 'Carlos', p4: 'Ana' };
const LOADS: Record<string, number> = { p1: 40, p2: 50, p3: 40, p4: 40 };

function seedPatient(
  store: Store,
  pacienteId: string,
  options?: {
    group?: string | null;
    dates?: Array<{ date: string; status?: TrainingSession['status']; active?: boolean }>;
    load?: number;
  }
): PlannerCardPatient {
  const userId = `uid_${pacienteId}`;
  const group = options?.group === undefined ? `g_${pacienteId}` : options.group;
  const dates =
    options?.dates ||
    generateScheduleDates({
      selectedDaysOfWeek: [1, 3, 5],
      startDate: TODAY,
      endDate: endDateFromWeeks(TODAY, 4),
      weeksCount: 4,
    }).map((date) => ({ date }));
  const load = options?.load ?? LOADS[pacienteId] ?? 40;
  let currentId = '';
  for (const item of dates) {
    const id = `ses_${pacienteId}_${item.date}`;
    store.sessions.set(
      id,
      session({
        id,
        patientId: userId,
        scheduledDate: item.date,
        status: item.status || 'scheduled',
        active: item.active !== false,
        ...(group ? { recurrenceGroupId: group } : { recurrenceGroupId: undefined }),
      })
    );
    store.exercises.set(id, [squat(`ex_${pacienteId}_${item.date}`, load)]);
    if (item.date === TODAY || (!currentId && item.date >= TODAY)) currentId = id;
  }
  const currentExercises = store.exercises.get(currentId) || [];
  return {
    pacienteId,
    patientUserId: userId,
    name: NAMES[pacienteId] || pacienteId,
    sessionId: currentId,
    scheduledDate: store.sessions.get(currentId)?.scheduledDate || TODAY,
    status: 'scheduled',
    recurrenceGroupId: group || undefined,
    exercises: currentExercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      order: exercise.order,
      prescription: exercise.prescription,
    })),
    notes: [],
    gymMedia: [],
    exerciseCount: currentExercises.length,
  };
}

function writers(store: Store, failPatientId?: string): CombinedEditWriters {
  return {
    getSession: async (sessionId) => store.sessions.get(sessionId) || null,
    getSessionExercises: async (sessionId) => store.exercises.get(sessionId) || [],
    listPatientSessions: async (patientId, startDate, endDate) =>
      Array.from(store.sessions.values()).filter(
        (item) =>
          item.patientId === patientId &&
          item.scheduledDate >= startDate &&
          item.scheduledDate <= endDate
      ),
    updateExercisePrescription: async (sessionId, exerciseDocId, prescription) => {
      const row = store.sessions.get(sessionId);
      if (failPatientId && row?.patientId === failPatientId) throw new Error('boom');
      const list = store.exercises.get(sessionId) || [];
      store.exercises.set(
        sessionId,
        list.map((item) => (item.id === exerciseDocId ? { ...item, prescription } : item))
      );
    },
    updateExerciseTrainerNote: async () => undefined,
    updateExerciseOrder: async () => undefined,
    addExercise: async () => 'ex_new',
    deleteExercise: async () => undefined,
    createSessionWithExercises: async (session, exercises) => {
      const id = `ses_new_${session.patientId}_${session.scheduledDate}`;
      if (store.sessions.has(id)) {
        store.sessions.set(id, { ...store.sessions.get(id)!, ...session, id });
      } else {
        store.sessions.set(id, {
          ...session,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TrainingSession);
      }
      store.exercises.set(
        id,
        exercises.map((exercise, index) => ({
          ...exercise,
          id: `ex_${id}_${index}`,
          order: index,
        }))
      );
      return id;
    },
    setSessionsActive: async (sessionIds, active) => {
      for (const id of sessionIds) {
        const row = store.sessions.get(id);
        if (row) store.sessions.set(id, { ...row, active });
      }
    },
    updateSession: async (sessionId, updates) => {
      const row = store.sessions.get(sessionId);
      if (row) store.sessions.set(sessionId, { ...row, ...updates });
    },
  };
}

const mwf: WorkoutScheduleConfig = {
  selectedDaysOfWeek: [1, 3, 5],
  startDate: TODAY,
  endDate: endDateFromWeeks(TODAY, 4),
  weeksCount: 4,
};

const tth: WorkoutScheduleConfig = {
  selectedDaysOfWeek: [2, 4],
  startDate: '2026-09-15',
  endDate: endDateFromWeeks('2026-09-15', 6),
  weeksCount: 6,
};

function baseInput(
  patients: PlannerCardPatient[],
  extra?: Partial<CombinedEditInput>
): CombinedEditInput {
  return {
    source: 'existing',
    availablePatients: patients,
    patientIds: patients.map((item) => item.pacienteId),
    temporalScope: 'this-and-future',
    patch: { orderChanged: false, exercises: [] },
    today: TODAY,
    allowEmptyPatch: true,
    scheduleDirty: false,
    schedule: null,
    ...extra,
  };
}

function repsPatch(): CombinedEditInput['patch'] {
  return {
    orderChanged: false,
    exercises: [
      {
        editorKey: '0:0025',
        kind: 'keep',
        exerciseId: '0025',
        name: 'Agachamento',
        order: 0,
        seriesPatches: [{ index: 0, reps: 15 }],
      },
    ],
  };
}

describe('bulkWorkoutSchedule', () => {
  it('reusa inferRecurringConfigFromSessions para dias custom', () => {
    const store = emptyStore();
    seedPatient(store, 'p1');
    const inferred = inferRecurringConfigFromSessions(Array.from(store.sessions.values()));
    expect(inferred.recurrenceFrequency).toBe('custom');
    expect(inferred.selectedDaysOfWeek).toEqual([1, 3, 5]);
  });

  it('1. SEG/QUA/SEX → TER/QUI', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    const beforeIds = new Set(store.sessions.keys());
    const result = await applyCombinedWorkoutEdit(
      baseInput([p1], { scheduleDirty: true, schedule: tth }),
      writers(store)
    );
    expect(result.savedCount).toBe(1);
    const next = generateScheduleDates(tth);
    const active = Array.from(store.sessions.values()).filter((item) => item.active !== false);
    expect(active.map((item) => item.scheduledDate).sort()).toEqual(next);
    const kept = Array.from(store.sessions.values()).filter(
      (item) => beforeIds.has(item.id!) && next.includes(item.scheduledDate) && item.active !== false
    );
    expect(kept.every((item) => beforeIds.has(item.id!))).toBe(true);
  });

  it('2. 4 → 8 semanas cria ocorrências', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    const longer = { ...mwf, weeksCount: 8, endDate: endDateFromWeeks(TODAY, 8) };
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: longer }), writers(store));
    const next = generateScheduleDates(longer);
    const active = Array.from(store.sessions.values()).filter((item) => item.active !== false);
    expect(active).toHaveLength(next.length);
    expect(active.some((item) => item.scheduledDate > endDateFromWeeks(TODAY, 4))).toBe(true);
  });

  it('3. 8 → 4 semanas desativa o restante futuro', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', {
      dates: generateScheduleDates({ ...mwf, weeksCount: 8, endDate: endDateFromWeeks(TODAY, 8) }).map(
        (date) => ({ date })
      ),
    });
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    const next = new Set(generateScheduleDates(mwf));
    const afterEnd = Array.from(store.sessions.values()).filter((item) => !next.has(item.scheduledDate));
    expect(afterEnd.length).toBeGreaterThan(0);
    expect(afterEnd.every((item) => item.active === false)).toBe(true);
  });

  it('4. início movido para frente desativa a janela que saiu', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    const moved = { ...mwf, startDate: '2026-09-28', endDate: endDateFromWeeks('2026-09-28', 4) };
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: moved }), writers(store));
    const todaySession = store.sessions.get(`ses_p1_${TODAY}`);
    expect(todaySession?.active).toBe(false);
    expect(store.sessions.get('ses_p1_2026-09-28')?.active).not.toBe(false);
  });

  it('5. início hoje gera a partir de hoje', () => {
    const dates = generateScheduleDates(mwf);
    expect(dates[0]).toBe(TODAY);
    expect(dates.every((date) => date >= TODAY)).toBe(true);
  });

  it('6. data passada preservada', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', {
      dates: [{ date: '2026-09-07' }, { date: TODAY }, { date: '2026-09-16' }],
    });
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    const past = store.sessions.get('ses_p1_2026-09-07');
    expect(past?.active).not.toBe(false);
    expect(past?.id).toBe('ses_p1_2026-09-07');
  });

  it('7. done preservada', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', {
      dates: [
        { date: TODAY, status: 'done' },
        { date: '2026-09-16' },
        { date: '2026-09-18' },
      ],
    });
    await applyCombinedWorkoutEdit(
      baseInput([p1], { scheduleDirty: true, schedule: { ...mwf, selectedDaysOfWeek: [5] } }),
      writers(store)
    );
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.status).toBe('done');
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).not.toBe(false);
  });

  it('8. sessão coincidente mantém sessionId', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.id).toBe(`ses_p1_${TODAY}`);
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).not.toBe(false);
  });

  it('9. nova data cria sessão', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', {
      dates: generateScheduleDates({ ...mwf, selectedDaysOfWeek: [1, 5] }).map((date) => ({ date })),
    });
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    expect(store.sessions.get('ses_new_uid_p1_2026-09-16') || store.sessions.get('ses_p1_2026-09-16')).toBeTruthy();
    const wed = Array.from(store.sessions.values()).find(
      (item) => item.scheduledDate === '2026-09-16' && item.active !== false
    );
    expect(wed).toBeTruthy();
  });

  it('10. data removida fica active: false', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    await applyCombinedWorkoutEdit(
      baseInput([p1], { scheduleDirty: true, schedule: { ...mwf, selectedDaysOfWeek: [1, 5] } }),
      writers(store)
    );
    expect(store.sessions.get('ses_p1_2026-09-16')?.active).toBe(false);
  });

  it('11. 4 pacientes aplicam o mesmo diff', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    const result = await applyCombinedWorkoutEdit(
      baseInput(patients, { scheduleDirty: true, schedule: tth }),
      writers(store)
    );
    expect(result.savedCount).toBe(4);
    expect(result.reports.every((item) => item.status === 'saved')).toBe(true);
  });

  it('12. somente 2 pacientes', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    await applyCombinedWorkoutEdit(
      baseInput(patients, {
        patientIds: ['p1', 'p2'],
        scheduleDirty: true,
        schedule: tth,
      }),
      writers(store)
    );
    expect(store.sessions.get('ses_p3_2026-09-16')?.active).not.toBe(false);
    expect(store.sessions.get('ses_p1_2026-09-16')?.active).toBe(false);
  });

  it('13. agendamentos divergentes têm fingerprints diferentes', () => {
    const a = scheduleFingerprint(mwf);
    const b = scheduleFingerprint(tth);
    expect(a).not.toBe(b);
  });

  it('14. schedule untouched → nenhuma alteração de data', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    const datesBefore = Array.from(store.sessions.values()).map((item) => item.scheduledDate).sort();
    await applyCombinedWorkoutEdit(
      baseInput([p1], { scheduleDirty: false, patch: repsPatch() }),
      writers(store)
    );
    expect(Array.from(store.sessions.values()).map((item) => item.scheduledDate).sort()).toEqual(datesBefore);
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).not.toBe(false);
  });

  it('15. workout untouched → conteúdo preservado', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1');
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    const ex = store.exercises.get(`ses_p1_${TODAY}`)?.[0];
    expect(ex?.prescription.series[0]?.reps).toBe(12);
    expect(ex?.prescription.series[0]?.loadKg).toBe(40);
  });

  it('16. workout + schedule no mesmo save', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', {
      dates: generateScheduleDates({ ...mwf, selectedDaysOfWeek: [1, 5] }).map((date) => ({ date })),
    });
    await applyCombinedWorkoutEdit(
      baseInput([p1], { scheduleDirty: true, schedule: mwf, patch: repsPatch() }),
      writers(store)
    );
    const kept = store.exercises.get(`ses_p1_${TODAY}`)?.[0];
    expect(kept?.prescription.series[0]?.reps).toBe(15);
    const created = Array.from(store.sessions.values()).find(
      (item) => item.scheduledDate === '2026-09-16' && item.active !== false
    );
    expect(created).toBeTruthy();
    const createdEx = store.exercises.get(created!.id!)?.[0];
    expect(createdEx?.prescription.series[0]?.reps).toBe(15);
  });

  it('17. série sem recurrenceGroupId ganha group nas novas', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', { group: null, dates: [{ date: TODAY }] });
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    const created = Array.from(store.sessions.values()).filter((item) => item.scheduledDate > TODAY);
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((item) => item.recurrenceGroupId)).toBe(true);
  });

  it('18. virada de mês', () => {
    const dates = generateScheduleDates(mwf);
    expect(dates.some((date) => date.startsWith('2026-10'))).toBe(true);
  });

  it('19. virada de ano', () => {
    const dates = generateScheduleDates({
      selectedDaysOfWeek: [1],
      startDate: '2026-12-28',
      endDate: endDateFromWeeks('2026-12-28', 3),
      weeksCount: 3,
    });
    expect(dates.some((date) => date.startsWith('2027-01'))).toBe(true);
  });

  it('inativo existente não é reativado', async () => {
    const store = emptyStore();
    const p1 = seedPatient(store, 'p1', {
      dates: [
        { date: TODAY },
        { date: '2026-09-16', active: false },
        { date: '2026-09-18' },
      ],
    });
    await applyCombinedWorkoutEdit(baseInput([p1], { scheduleDirty: true, schedule: mwf }), writers(store));
    expect(store.sessions.get('ses_p1_2026-09-16')?.active).toBe(false);
    const recreated = Array.from(store.sessions.values()).filter(
      (item) => item.scheduledDate === '2026-09-16'
    );
    expect(recreated.length).toBeGreaterThan(1);
    expect(recreated.some((item) => item.active !== false)).toBe(true);
  });

  it('weeksFromRange arredonda para cima e limita 1–12', () => {
    expect(weeksFromRange(TODAY, '2026-09-20')).toBe(1);
    expect(weeksFromRange(TODAY, endDateFromWeeks(TODAY, 4))).toBe(4);
    expect(weeksFromRange(TODAY, '2028-01-01')).toBe(12);
  });

  it('diffScheduleDates classifica keep/create/deactivate', () => {
    const diff = diffScheduleDates(['2026-09-14', '2026-09-16'], ['2026-09-14', '2026-09-15']);
    expect(diff.keep).toEqual(['2026-09-14']);
    expect(diff.create).toEqual(['2026-09-15']);
    expect(diff.deactivate).toEqual(['2026-09-16']);
  });

  it('início operacional ignora passado', () => {
    const inferred = inferOperationalSchedule(
      [
        session({ id: 'a', patientId: 'u', scheduledDate: '2026-08-01' }),
        session({ id: 'b', patientId: 'u', scheduledDate: TODAY }),
        session({ id: 'c', patientId: 'u', scheduledDate: '2026-09-28' }),
      ],
      TODAY
    );
    expect(inferred?.startDate).toBe(TODAY);
  });

  it('preview agrega impacto de 4 pacientes', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    const preview = await previewCombinedWorkoutEdit(
      baseInput(patients, { scheduleDirty: true, schedule: tth }),
      writers(store)
    );
    expect(preview.patientCount).toBe(4);
    expect(preview.created).toBeGreaterThan(0);
    expect(preview.deactivated).toBeGreaterThan(0);
  });
});
