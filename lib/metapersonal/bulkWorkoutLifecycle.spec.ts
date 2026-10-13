import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  applyBulkLifecycle,
  isSessionLifecycleMutable,
  selectLifecycleTargetSessions,
  type BulkLifecycleInput,
  type BulkLifecycleWriters,
} from '@/lib/metapersonal/bulkWorkoutLifecycle';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

const TODAY = '2026-09-14';

function squat(docId: string): TrainingSessionExercise {
  return {
    id: docId,
    source: 'exercisedb',
    exerciseId: '0025',
    name: 'Agachamento',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'barbell',
    prescription: { series: createDefaultTrainingSeries() },
    order: 0,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceGroupId: 'g1',
    ...overrides,
  };
}

type Store = {
  sessions: Map<string, TrainingSession>;
  exercises: Map<string, TrainingSessionExercise[]>;
  executions: Map<string, string[]>;
  deletedSessions: string[];
  deletedExercises: string[];
  deletedExecutions: string[];
};

function emptyStore(): Store {
  return {
    sessions: new Map(),
    exercises: new Map(),
    executions: new Map(),
    deletedSessions: [],
    deletedExercises: [],
    deletedExecutions: [],
  };
}

function seedPatient(
  store: Store,
  pacienteId: string,
  options?: {
    active?: boolean;
    createdBy?: TrainingSession['createdBy'];
    dates?: Array<{ date: string; status?: TrainingSession['status']; active?: boolean }>;
    group?: string | null;
  }
): PlannerCardPatient {
  const userId = `uid_${pacienteId}`;
  const names: Record<string, string> = { p1: 'João', p2: 'Maria', p3: 'Carlos', p4: 'Ana' };
  const dates = options?.dates || [
    { date: '2026-09-07' },
    { date: TODAY },
    { date: '2026-09-21' },
    { date: '2026-09-28' },
  ];
  const group = options?.group === undefined ? 'g1' : options.group;
  let currentId = '';
  for (const item of dates) {
    const id = `ses_${pacienteId}_${item.date}`;
    const active = item.active ?? options?.active ?? true;
    store.sessions.set(
      id,
      session({
        id,
        patientId: userId,
        scheduledDate: item.date,
        status: item.status || 'scheduled',
        active,
        createdBy: options?.createdBy || 'trainer',
        ...(group ? { recurrenceGroupId: group } : { recurrenceGroupId: undefined }),
      })
    );
    store.exercises.set(id, [squat(`ex_${id}`)]);
    store.executions.set(id, [`exec_${id}`]);
    if (item.date === TODAY) currentId = id;
  }
  const current = store.sessions.get(currentId)!;
  return {
    pacienteId,
    patientUserId: userId,
    name: names[pacienteId] || pacienteId,
    sessionId: currentId,
    scheduledDate: TODAY,
    status: 'scheduled',
    recurrenceGroupId: group || undefined,
    active: current.active !== false,
    createdBy: current.createdBy,
    exercises: [],
    notes: [],
    gymMedia: [],
    exerciseCount: 1,
  };
}

function writers(store: Store, failPatientId?: string): BulkLifecycleWriters {
  return {
    getSession: async (id) => store.sessions.get(id) || null,
    listPatientSessions: async (patientId, start, end) =>
      Array.from(store.sessions.values()).filter(
        (item) => item.patientId === patientId && item.scheduledDate >= start && item.scheduledDate <= end
      ),
    setSessionsActive: async (ids, active) => {
      for (const id of ids) {
        const row = store.sessions.get(id);
        if (failPatientId && row?.patientId === failPatientId) throw new Error('boom');
        if (row) store.sessions.set(id, { ...row, active });
      }
    },
    deleteSession: async (id) => {
      const row = store.sessions.get(id);
      if (failPatientId && row?.patientId === failPatientId) throw new Error('boom');
      store.deletedExercises.push(...(store.exercises.get(id) || []).map((item) => item.id || ''));
      store.deletedExecutions.push(...(store.executions.get(id) || []));
      store.exercises.delete(id);
      store.executions.delete(id);
      store.sessions.delete(id);
      store.deletedSessions.push(id);
    },
  };
}

function inputFor(
  patients: PlannerCardPatient[],
  extra?: Partial<BulkLifecycleInput>
): BulkLifecycleInput {
  return {
    source: 'existing',
    action: 'deactivate',
    temporalScope: 'this',
    availablePatients: patients,
    patientIds: patients.map((item) => item.pacienteId),
    today: TODAY,
    ...extra,
  };
}

describe('isSessionLifecycleMutable', () => {
  it('protege passado e done, mas permite inativo futuro', () => {
    expect(isSessionLifecycleMutable({ scheduledDate: '2026-09-13', status: 'scheduled' }, TODAY)).toBe(false);
    expect(isSessionLifecycleMutable({ scheduledDate: TODAY, status: 'done' }, TODAY)).toBe(false);
    expect(isSessionLifecycleMutable({ scheduledDate: TODAY, status: 'scheduled' }, TODAY)).toBe(true);
  });
});

describe('applyBulkLifecycle ativo/inativo', () => {
  it('1. ativo → inativo nesta ocorrência', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    const result = await applyBulkLifecycle(inputFor(patients, { action: 'deactivate' }), writers(store));
    expect(result.ok).toBe(true);
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).toBe(false);
    expect(store.sessions.get('ses_p1_2026-09-21')?.active).toBe(true);
  });

  it('2. inativo → ativo', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1', { active: false })];
    await applyBulkLifecycle(inputFor(patients, { action: 'activate' }), writers(store));
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).toBe(true);
  });

  it('3. mixed 3/4 — só altera selecionados', async () => {
    const store = emptyStore();
    const patients = [
      seedPatient(store, 'p1'),
      seedPatient(store, 'p2'),
      seedPatient(store, 'p3', { active: false }),
      seedPatient(store, 'p4'),
    ];
    expect(patients.filter((item) => item.active !== false)).toHaveLength(3);
    await applyBulkLifecycle(
      inputFor(patients, { action: 'deactivate', patientIds: ['p1', 'p2'] }),
      writers(store)
    );
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).toBe(false);
    expect(store.sessions.get(`ses_p2_${TODAY}`)?.active).toBe(false);
    expect(store.sessions.get(`ses_p4_${TODAY}`)?.active).toBe(true);
  });

  it('4. aplicar em selecionados', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2', 'p3'].map((id) => seedPatient(store, id));
    await applyBulkLifecycle(inputFor(patients, { patientIds: ['p2'] }), writers(store));
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).toBe(true);
    expect(store.sessions.get(`ses_p2_${TODAY}`)?.active).toBe(false);
  });

  it('5. done não alterado', async () => {
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
    await applyBulkLifecycle(
      inputFor(patients, { temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).toBe(false);
    expect(store.sessions.get('ses_p1_2026-09-21')?.active).toBe(true);
    expect(store.sessions.get('ses_p1_2026-09-28')?.active).toBe(false);
  });

  it('6. passado não alterado', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkLifecycle(
      inputFor(patients, { temporalScope: 'series-future' }),
      writers(store)
    );
    expect(store.sessions.get('ses_p1_2026-09-07')?.active).toBe(true);
    expect(store.sessions.get(`ses_p1_${TODAY}`)?.active).toBe(false);
  });

  it('7. falha parcial continua os outros', async () => {
    const store = emptyStore();
    const patients = ['p1', 'p2'].map((id) => seedPatient(store, id));
    const result = await applyBulkLifecycle(inputFor(patients), writers(store, 'uid_p1'));
    expect(result.reports.find((item) => item.patientName === 'João')?.status).toBe('failed');
    expect(result.reports.find((item) => item.patientName === 'Maria')?.status).toBe('saved');
    expect(store.sessions.get(`ses_p2_${TODAY}`)?.active).toBe(false);
  });
});

describe('applyBulkLifecycle exclusão', () => {
  it('8. futura simples', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkLifecycle(inputFor(patients, { action: 'delete' }), writers(store));
    expect(store.sessions.has(`ses_p1_${TODAY}`)).toBe(false);
    expect(store.sessions.has('ses_p1_2026-09-21')).toBe(true);
  });

  it('9. série futura', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkLifecycle(
      inputFor(patients, { action: 'delete', temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(store.sessions.has(`ses_p1_${TODAY}`)).toBe(false);
    expect(store.sessions.has('ses_p1_2026-09-21')).toBe(false);
    expect(store.sessions.has('ses_p1_2026-09-28')).toBe(false);
    expect(store.sessions.has('ses_p1_2026-09-07')).toBe(true);
  });

  it('10. done protegido', async () => {
    const store = emptyStore();
    const patients = [
      seedPatient(store, 'p1', {
        dates: [
          { date: TODAY },
          { date: '2026-09-21', status: 'done' },
        ],
      }),
    ];
    await applyBulkLifecycle(
      inputFor(patients, { action: 'delete', temporalScope: 'this-and-future' }),
      writers(store)
    );
    expect(store.sessions.has('ses_p1_2026-09-21')).toBe(true);
  });

  it('11. passado protegido', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkLifecycle(
      inputFor(patients, { action: 'delete', temporalScope: 'series-future' }),
      writers(store)
    );
    expect(store.sessions.has('ses_p1_2026-09-07')).toBe(true);
  });

  it('12. subcollections seguem o deleteSession real', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1')];
    await applyBulkLifecycle(inputFor(patients, { action: 'delete' }), writers(store));
    expect(store.deletedSessions).toEqual([`ses_p1_${TODAY}`]);
    expect(store.deletedExercises.length).toBeGreaterThan(0);
    expect(store.deletedExecutions).toEqual([`exec_ses_p1_${TODAY}`]);
    expect(store.exercises.has(`ses_p1_${TODAY}`)).toBe(false);
  });

  it('13. treino padrão automático (createdBy patient) não é bloqueado', async () => {
    const store = emptyStore();
    const patients = [seedPatient(store, 'p1', { createdBy: 'patient' })];
    const result = await applyBulkLifecycle(inputFor(patients, { action: 'delete' }), writers(store));
    expect(result.ok).toBe(true);
    expect(store.sessions.has(`ses_p1_${TODAY}`)).toBe(false);
  });
});

describe('selectLifecycleTargetSessions', () => {
  it('série futura começa em hoje, esta e próximas na data do card', () => {
    const current = session({ id: 'c', patientId: 'uid', scheduledDate: '2026-09-21' });
    const todaySession = session({ id: 't', patientId: 'uid', scheduledDate: TODAY });
    const later = session({ id: 'l', patientId: 'uid', scheduledDate: '2026-09-28' });
    const fromCard = selectLifecycleTargetSessions(current, [todaySession, later], 'this-and-future', TODAY);
    const series = selectLifecycleTargetSessions(current, [todaySession, later], 'series-future', TODAY);
    expect(fromCard.map((item) => item.id)).toEqual(['c', 'l']);
    expect(series.map((item) => item.id)).toEqual(['t', 'c', 'l']);
  });
});
