import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  applyBulkWorkoutEdit,
  buildBulkEditViewModel,
  buildPatchFromDraft,
  createBulkEditDraft,
  isSessionStructurallyEditable,
  planSessionExerciseOps,
  previewBulkWorkoutEdit,
  selectBulkEditTargetSessions,
  type BulkWorkoutEditInput,
  type BulkWorkoutEditPatch,
  type BulkWorkoutEditWriters,
} from '@/lib/metapersonal/bulkWorkoutEdit';
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

function squat(docId: string, loadKg: number | null, extra?: Partial<TrainingSessionExercise>): TrainingSessionExercise {
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
    trainerNote: '',
    ...extra,
  };
}

function fly(docId: string): TrainingSessionExercise {
  return {
    id: docId,
    source: 'exercisedb',
    exerciseId: '0405',
    name: 'Crucifixo',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'dumbbell',
    prescription: prescription(12, 10),
    order: 1,
  };
}

function session(overrides: Partial<TrainingSession> & { id: string; patientId: string }): TrainingSession {
  return {
    createdBy: 'trainer',
    createdById: 'pt',
    scheduledDate: TODAY,
    title: 'Treino A',
    status: 'scheduled',
    published: true,
    active: true,
    patientNotes: 'Feedback original',
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceGroupId: 'g1',
    ...overrides,
  };
}

type Store = {
  sessions: Map<string, TrainingSession>;
  exercises: Map<string, TrainingSessionExercise[]>;
  gymMedia: Map<string, { patientUserId: string; exerciseId: string }>;
  deletedSessions: string[];
  sessionPatientNotesWrites: number;
};

function emptyStore(): Store {
  return {
    sessions: new Map(),
    exercises: new Map(),
    gymMedia: new Map(),
    deletedSessions: [],
    sessionPatientNotesWrites: 0,
  };
}

const NAMES: Record<string, string> = {
  p1: 'João',
  p2: 'Maria',
  p3: 'Carlos',
  p4: 'Ana',
};

const LOADS: Record<string, number> = { p1: 40, p2: 50, p3: 40, p4: 40 };

function seedPatient(
  store: Store,
  pacienteId: string,
  options?: {
    group?: string | null;
    extraFly?: boolean;
    dates?: Array<{ date: string; status?: TrainingSession['status'] }>;
  }
): PlannerCardPatient {
  const userId = `uid_${pacienteId}`;
  const group = options?.group === undefined ? 'g1' : options.group;
  const dates = options?.dates || [
    { date: '2026-09-07' },
    { date: TODAY },
    { date: '2026-09-21' },
    { date: '2026-09-28' },
  ];
  const load = LOADS[pacienteId] ?? 40;
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
        ...(group ? { recurrenceGroupId: group } : { recurrenceGroupId: undefined }),
      })
    );
    const exercises = [squat(`ex_${pacienteId}_${item.date}_squat`, load)];
    if (options?.extraFly) exercises.push(fly(`ex_${pacienteId}_${item.date}_fly`));
    store.exercises.set(id, exercises);
    if (item.date === TODAY) currentId = id;
  }
  store.gymMedia.set(`${userId}__0025`, { patientUserId: userId, exerciseId: '0025' });
  const currentExercises = store.exercises.get(currentId) || [];
  return {
    pacienteId,
    patientUserId: userId,
    name: NAMES[pacienteId] || pacienteId,
    sessionId: currentId,
    scheduledDate: TODAY,
    status: 'scheduled',
    recurrenceGroupId: group || undefined,
    sessionTrainerNotes: '',
    patientNotes: 'Feedback original',
    exercises: currentExercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      order: exercise.order,
      trainerNote: exercise.trainerNote,
      bodyPart: exercise.bodyPart,
      target: exercise.target,
      equipment: exercise.equipment,
      prescription: exercise.prescription,
    })),
    notes: [],
    gymMedia: [],
    exerciseCount: currentExercises.length,
  };
}

function writers(store: Store, failPatientId?: string): BulkWorkoutEditWriters {
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
      const sessionRow = store.sessions.get(sessionId);
      if (failPatientId && sessionRow?.patientId === failPatientId) throw new Error('boom');
      const list = store.exercises.get(sessionId) || [];
      store.exercises.set(
        sessionId,
        list.map((item) => (item.id === exerciseDocId ? { ...item, prescription } : item))
      );
    },
    updateExerciseTrainerNote: async (sessionId, exerciseDocId, trainerNote) => {
      const list = store.exercises.get(sessionId) || [];
      store.exercises.set(
        sessionId,
        list.map((item) => (item.id === exerciseDocId ? { ...item, trainerNote } : item))
      );
    },
    updateExerciseOrder: async (sessionId, exerciseDocId, order) => {
      const list = store.exercises.get(sessionId) || [];
      store.exercises.set(
        sessionId,
        list.map((item) => (item.id === exerciseDocId ? { ...item, order } : item))
      );
    },
    addExercise: async (sessionId, exercise) => {
      const id = `ex_new_${sessionId}_${exercise.exerciseId}_${Math.random().toString(36).slice(2, 6)}`;
      const list = store.exercises.get(sessionId) || [];
      store.exercises.set(sessionId, [...list, { ...exercise, id }]);
      return id;
    },
    deleteExercise: async (sessionId, exerciseDocId) => {
      const list = store.exercises.get(sessionId) || [];
      store.exercises.set(
        sessionId,
        list.filter((item) => item.id !== exerciseDocId)
      );
    },
  };
}

function repsPatch(reps = 15): BulkWorkoutEditPatch {
  return {
    orderChanged: false,
    exercises: [
      {
        editorKey: '0:0025',
        kind: 'keep',
        exerciseId: '0025',
        name: 'Agachamento',
        order: 0,
        sourceOrder: 0,
        seriesPatches: [
          { index: 0, reps },
          { index: 1, reps },
          { index: 2, reps },
        ],
      },
    ],
  };
}

function inputFor(
  patients: PlannerCardPatient[],
  patch: BulkWorkoutEditPatch,
  extra?: Partial<BulkWorkoutEditInput>
): BulkWorkoutEditInput {
  return {
    source: 'existing',
    availablePatients: patients,
    patientIds: patients.map((item) => item.pacienteId),
    temporalScope: 'this',
    patch,
    today: TODAY,
    ...extra,
  };
}

function squatReps(store: Store, sessionId: string): number[] {
  const squatEx = (store.exercises.get(sessionId) || []).find((item) => item.exerciseId === '0025');
  return squatEx?.prescription.series.map((item) => item.reps) || [];
}

function squatLoads(store: Store, sessionId: string): Array<number | null> {
  const squatEx = (store.exercises.get(sessionId) || []).find((item) => item.exerciseId === '0025');
  return squatEx?.prescription.series.map((item) => item.loadKg ?? null) || [];
}

describe('buildBulkEditViewModel', () => {
  it('marca carga mista e reps iguais', () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    const view = buildBulkEditViewModel(patients);
    expect(view.exercises).toHaveLength(1);
    expect(view.exercises[0].series[0].reps).toEqual({ mode: 'same', value: 12 });
    expect(view.exercises[0].series[0].loadKg.mode).toBe('mixed');
    expect(view.exercises[0].series[0].loadKg.value).toBeNull();
  });

  it('mostra exercício presente em 2 de 4', () => {
    const store = emptyStore();
    const patients = [
      seedPatient(store, 'p1', { extraFly: true }),
      seedPatient(store, 'p2', { extraFly: true }),
      seedPatient(store, 'p3'),
      seedPatient(store, 'p4'),
    ];
    const view = buildBulkEditViewModel(patients);
    const flyView = view.exercises.find((item) => item.exerciseId === '0405');
    expect(flyView?.presentCount).toBe(2);
    expect(flyView?.totalPatients).toBe(4);
  });
});

describe('planSessionExerciseOps', () => {
  it('altera reps e preserva carga se o patch não toca carga', () => {
    const exercise = squat('ex1', 40);
    const ops = planSessionExerciseOps([exercise], repsPatch());
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('update-prescription');
    if (ops[0].type !== 'update-prescription') return;
    expect(ops[0].prescription.series.map((item) => item.reps)).toEqual([15, 15, 15]);
    expect(ops[0].prescription.series.map((item) => item.loadKg)).toEqual([40, 40, 40]);
  });

  it('não apaga exercício extra ao reordenar', () => {
    const extra = { ...fly('ex2'), order: 2 };
    const ops = planSessionExerciseOps(
      [squat('ex1', 40), extra],
      {
        orderChanged: true,
        exercises: [
          {
            editorKey: '0:0025',
            kind: 'keep',
            exerciseId: '0025',
            name: 'Agachamento',
            order: 0,
            sourceOrder: 0,
            seriesPatches: [],
          },
        ],
      }
    );
    const deletes = ops.filter((item) => item.type === 'delete');
    const orders = ops.filter((item) => item.type === 'update-order');
    expect(deletes).toHaveLength(0);
    expect(
      orders.some((item) => item.type === 'update-order' && item.exerciseDocId === 'ex2' && item.order === 1)
    ).toBe(true);
  });
});

describe('escopo temporal', () => {
  it('nunca considera passado ou done editáveis', () => {
    expect(
      isSessionStructurallyEditable({ scheduledDate: '2026-09-13', status: 'scheduled', active: true }, TODAY)
    ).toBe(false);
    expect(
      isSessionStructurallyEditable({ scheduledDate: TODAY, status: 'done', active: true }, TODAY)
    ).toBe(false);
    expect(
      isSessionStructurallyEditable({ scheduledDate: TODAY, status: 'scheduled', active: true }, TODAY)
    ).toBe(true);
  });

  it('sem recurrenceGroupId, esta e próximas = somente esta', () => {
    const current = session({ id: 's1', patientId: 'uid', recurrenceGroupId: undefined });
    const future = session({
      id: 's2',
      patientId: 'uid',
      scheduledDate: '2026-09-21',
      recurrenceGroupId: undefined,
    });
    const selected = selectBulkEditTargetSessions(current, [future], 'this-and-future', TODAY);
    expect(selected.map((item) => item.id)).toEqual(['s1']);
  });
});

describe('applyBulkWorkoutEdit', () => {
  it('1. altera reps em 4 pacientes', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    const result = await applyBulkWorkoutEdit(inputFor(patients, repsPatch()), writers(store));
    expect(result.savedCount).toBe(4);
    for (const id of ['p1', 'p2', 'p3', 'p4']) {
      expect(squatReps(store, `ses_${id}_${TODAY}`)).toEqual([15, 15, 15]);
    }
    expect(store.deletedSessions).toEqual([]);
  });

  it('2. cargas diferentes permanecem se não tocadas', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    await applyBulkWorkoutEdit(inputFor(patients, repsPatch()), writers(store));
    expect(squatLoads(store, `ses_p1_${TODAY}`)).toEqual([40, 40, 40]);
    expect(squatLoads(store, `ses_p2_${TODAY}`)).toEqual([50, 50, 50]);
  });

  it('3. carga alterada explicitamente sobrescreve', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2'].map((id) => seedPatient(store, id));
    const patch: BulkWorkoutEditPatch = {
      orderChanged: false,
      exercises: [
        {
          editorKey: '0:0025',
          kind: 'keep',
          exerciseId: '0025',
          name: 'Agachamento',
          order: 0,
          sourceOrder: 0,
          seriesPatches: [
            { index: 0, loadKg: 60 },
            { index: 1, loadKg: 60 },
            { index: 2, loadKg: 60 },
          ],
        },
      ],
    };
    await applyBulkWorkoutEdit(inputFor(patients, patch), writers(store));
    expect(squatLoads(store, `ses_p1_${TODAY}`)).toEqual([60, 60, 60]);
    expect(squatLoads(store, `ses_p2_${TODAY}`)).toEqual([60, 60, 60]);
  });

  it('4. somente esta ocorrência', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkWorkoutEdit(inputFor(patients, repsPatch(), { temporalScope: 'this' }), writers(store));
    expect(squatReps(store, `ses_p1_${TODAY}`)).toEqual([15, 15, 15]);
    expect(squatReps(store, 'ses_p1_2026-09-21')).toEqual([12, 12, 12]);
    expect(squatReps(store, 'ses_p1_2026-09-28')).toEqual([12, 12, 12]);
  });

  it('5. esta e próximas', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkWorkoutEdit(
      inputFor(patients, repsPatch(), { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(squatReps(store, `ses_p1_${TODAY}`)).toEqual([15, 15, 15]);
    expect(squatReps(store, 'ses_p1_2026-09-21')).toEqual([15, 15, 15]);
    expect(squatReps(store, 'ses_p1_2026-09-28')).toEqual([15, 15, 15]);
  });

  it('6. sessão passada não alterada', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkWorkoutEdit(
      inputFor(patients, repsPatch(), { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(squatReps(store, 'ses_p1_2026-09-07')).toEqual([12, 12, 12]);
  });

  it('7. status done não alterado', async () => {
    const store = emptyStore();
    const patients = [
      seedPatient(store, 'p1', {
        dates: [
          { date: TODAY },
          { date: '2026-09-21', status: 'done' },
          { date: '2026-09-28' },
        ],
      }),
    ];
    await applyBulkWorkoutEdit(
      inputFor(patients, repsPatch(), { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(squatReps(store, `ses_p1_${TODAY}`)).toEqual([15, 15, 15]);
    expect(squatReps(store, 'ses_p1_2026-09-21')).toEqual([12, 12, 12]);
    expect(squatReps(store, 'ses_p1_2026-09-28')).toEqual([15, 15, 15]);
  });

  it('8. adicionar exercício cria doc próprio por sessão', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2'].map((id) => seedPatient(store, id));
    const patch: BulkWorkoutEditPatch = {
      orderChanged: false,
      exercises: [
        {
          editorKey: 'add:0778',
          kind: 'add',
          exerciseId: '0778',
          name: 'Remada',
          bodyPart: 'back',
          target: 'lats',
          equipment: 'cable',
          order: 1,
          seriesPatches: [],
          addedPrescription: prescription(10, 20),
        },
      ],
    };
    const result = await applyBulkWorkoutEdit(inputFor(patients, patch), writers(store));
    expect(result.ok).toBe(true);
    const a = (store.exercises.get(`ses_p1_${TODAY}`) || []).find((item) => item.exerciseId === '0778');
    const b = (store.exercises.get(`ses_p2_${TODAY}`) || []).find((item) => item.exerciseId === '0778');
    expect(a?.id).toBeTruthy();
    expect(b?.id).toBeTruthy();
    expect(a?.id).not.toBe(b?.id);
    expect(a?.prescription.series[0].id).not.toBe(b?.prescription.series[0].id);
  });

  it('9. remover exercício das sessões no escopo', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => seedPatient(store, id));
    const patch: BulkWorkoutEditPatch = {
      orderChanged: false,
      exercises: [
        {
          editorKey: '0:0025',
          kind: 'remove',
          exerciseId: '0025',
          name: 'Agachamento',
          order: 0,
          sourceOrder: 0,
          seriesPatches: [],
        },
      ],
    };
    await applyBulkWorkoutEdit(
      inputFor(patients, patch, { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(store.exercises.get(`ses_p1_${TODAY}`)?.some((item) => item.exerciseId === '0025')).toBe(false);
    expect(store.exercises.get('ses_p1_2026-09-21')?.some((item) => item.exerciseId === '0025')).toBe(false);
    expect(store.exercises.get('ses_p1_2026-09-07')?.some((item) => item.exerciseId === '0025')).toBe(true);
  });

  it('10. exercício presente em 2/4 só atualiza quem tem', async () => {
    const store = emptyStore();
    const patients = [
      seedPatient(store, 'p1', { extraFly: true }),
      seedPatient(store, 'p2', { extraFly: true }),
      seedPatient(store, 'p3'),
      seedPatient(store, 'p4'),
    ];
    const patch: BulkWorkoutEditPatch = {
      orderChanged: false,
      exercises: [
        {
          editorKey: '1:0405',
          kind: 'keep',
          exerciseId: '0405',
          name: 'Crucifixo',
          order: 1,
          sourceOrder: 1,
          seriesPatches: [
            { index: 0, reps: 8 },
            { index: 1, reps: 8 },
            { index: 2, reps: 8 },
          ],
        },
      ],
    };
    await applyBulkWorkoutEdit(inputFor(patients, patch), writers(store));
    const joaoFly = (store.exercises.get(`ses_p1_${TODAY}`) || []).find((item) => item.exerciseId === '0405');
    expect(joaoFly?.prescription.series[0].reps).toBe(8);
    expect((store.exercises.get(`ses_p3_${TODAY}`) || []).some((item) => item.exerciseId === '0405')).toBe(false);
    expect(squatReps(store, `ses_p3_${TODAY}`)).toEqual([12, 12, 12]);
  });

  it('11. falha em 1 paciente não interrompe os demais', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3'].map((id) => seedPatient(store, id));
    const result = await applyBulkWorkoutEdit(inputFor(patients, repsPatch()), writers(store, 'uid_p1'));
    expect(result.reports.find((item) => item.patientName === 'João')?.status).toBe('failed');
    expect(result.reports.find((item) => item.patientName === 'Maria')?.status).toBe('saved');
    expect(squatReps(store, `ses_p2_${TODAY}`)).toEqual([15, 15, 15]);
    expect(squatReps(store, `ses_p3_${TODAY}`)).toEqual([15, 15, 15]);
  });

  it('12. patientNotes permanece intacto', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkWorkoutEdit(inputFor(patients, repsPatch()), writers(store));
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.patientNotes).toBe('Feedback original');
    expect(store.sessionPatientNotesWrites).toBe(0);
  });

  it('13. gym media permanece após remover exercício', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    const before = Array.from(store.gymMedia.entries());
    const patch: BulkWorkoutEditPatch = {
      orderChanged: false,
      exercises: [
        {
          editorKey: '0:0025',
          kind: 'remove',
          exerciseId: '0025',
          name: 'Agachamento',
          order: 0,
          sourceOrder: 0,
          seriesPatches: [],
        },
      ],
    };
    await applyBulkWorkoutEdit(inputFor(patients, patch), writers(store));
    expect(Array.from(store.gymMedia.entries())).toEqual(before);
    expect(store.gymMedia.get('uid_p1__0025')?.exerciseId).toBe('0025');
  });

  it('14. sessão sem recurrenceGroupId não propaga', async () => {
    const store = emptyStore();
    const patients = [
      seedPatient(store, 'p1', {
        group: null,
        dates: [{ date: TODAY }, { date: '2026-09-21' }],
      }),
    ];
    store.sessions.get('ses_p1_2026-09-21')!.recurrenceGroupId = undefined;
    await applyBulkWorkoutEdit(
      inputFor(patients, repsPatch(), { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(squatReps(store, `ses_p1_${TODAY}`)).toEqual([15, 15, 15]);
    expect(squatReps(store, 'ses_p1_2026-09-21')).toEqual([12, 12, 12]);
  });

  it('campo não tocado no draft não entra no patch', () => {
    const store = emptyStore();
    const patients = ['p1', 'p2'].map((id) => seedPatient(store, id));
    const draft = createBulkEditDraft(buildBulkEditViewModel(patients));
    draft.exercises[0].series[0].reps = {
      ...draft.exercises[0].series[0].reps,
      mode: 'same',
      value: 15,
      dirty: true,
    };
    const patch = buildPatchFromDraft(draft);
    expect(patch.exercises[0].seriesPatches[0].reps).toBe(15);
    expect(patch.exercises[0].seriesPatches[0].loadKg).toBeUndefined();
    expect(draft.exercises[0].series[0].loadKg.dirty).toBe(false);
  });
});

describe('previewBulkWorkoutEdit', () => {
  it('conta sessões futuras e avisa remoção', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2'].map((id) => seedPatient(store, id));
    const patch: BulkWorkoutEditPatch = {
      orderChanged: false,
      exercises: [
        {
          editorKey: '0:0025',
          kind: 'remove',
          exerciseId: '0025',
          name: 'Agachamento',
          order: 0,
          sourceOrder: 0,
          seriesPatches: [],
        },
      ],
    };
    const preview = await previewBulkWorkoutEdit(
      inputFor(patients, patch, { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(preview.sessionCount).toBe(6);
    expect(preview.removals[0]).toMatchObject({ name: 'Agachamento', patientCount: 2, sessionCount: 6 });
  });
});
