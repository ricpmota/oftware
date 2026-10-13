import { describe, expect, it } from 'vitest';
import {
  applyBulkWorkoutNotes,
  previewBulkWorkoutNotes,
  resolvePatientExercise,
  type BulkNotePlanInput,
  type BulkNoteWriters,
} from '@/lib/metapersonal/bulkWorkoutNotes';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';

function patient(overrides: Partial<PlannerCardPatient> & { pacienteId: string; name: string }): PlannerCardPatient {
  return {
    patientUserId: `uid_${overrides.pacienteId}`,
    sessionId: `ses_${overrides.pacienteId}`,
    scheduledDate: '2026-09-14',
    sessionTrainerNotes: '',
    patientNotes: 'Feedback do paciente',
    exercises: [
      {
        id: `exdoc_${overrides.pacienteId}_squat`,
        exerciseId: '0025',
        name: 'Agachamento',
        order: 0,
        trainerNote: '',
      },
      {
        id: `exdoc_${overrides.pacienteId}_press`,
        exerciseId: '0033',
        name: 'Leg Press',
        order: 1,
      },
    ],
    notes: [],
    gymMedia: [],
    exerciseCount: 2,
    ...overrides,
  };
}

const four = [
  patient({ pacienteId: 'p1', name: 'João' }),
  patient({ pacienteId: 'p2', name: 'Maria' }),
  patient({ pacienteId: 'p3', name: 'Carlos' }),
  patient({ pacienteId: 'p4', name: 'Ana' }),
];

function base(overrides: Partial<BulkNotePlanInput> = {}): BulkNotePlanInput {
  return {
    source: 'existing',
    target: 'session',
    text: 'Evitar flexão profunda do joelho.',
    conflict: 'skip-filled',
    availablePatients: four,
    patientIds: four.map((item) => item.pacienteId),
    ...overrides,
  };
}

function recordingWriters(failOn?: string): BulkNoteWriters & {
  sessions: Array<{ sessionId: string; trainerNotes: string }>;
  exercises: Array<{ sessionId: string; exerciseDocId: string; trainerNote: string }>;
} {
  const sessions: Array<{ sessionId: string; trainerNotes: string }> = [];
  const exercises: Array<{ sessionId: string; exerciseDocId: string; trainerNote: string }> = [];
  return {
    sessions,
    exercises,
    updateSessionTrainerNotes: async (sessionId, trainerNotes) => {
      const name = four.find((item) => item.sessionId === sessionId)?.name;
      if (failOn && name === failOn) throw new Error('boom');
      sessions.push({ sessionId, trainerNotes });
    },
    updateExerciseTrainerNote: async (sessionId, exerciseDocId, trainerNote) => {
      const name = four.find((item) => item.sessionId === sessionId)?.name;
      if (failOn && name === failOn) throw new Error('boom');
      exercises.push({ sessionId, exerciseDocId, trainerNote });
    },
  };
}

describe('previewBulkWorkoutNotes', () => {
  it('treino inteiro para todos gera 4 writes em trainerNotes', () => {
    const preview = previewBulkWorkoutNotes(base());
    expect(preview.errors).toEqual([]);
    expect(preview.willChangeCount).toBe(4);
    expect(preview.writes.every((item) => item.kind === 'session' && item.action === 'write')).toBe(
      true
    );
  });

  it('exercício para todos resolve doc ids diferentes por paciente', () => {
    const preview = previewBulkWorkoutNotes(
      base({
        target: 'exercise',
        exerciseKey: { exerciseId: '0025', order: 0, name: 'Agachamento' },
      })
    );
    expect(preview.willChangeCount).toBe(4);
    const ids = preview.writes.map((item) => item.exerciseDocId);
    expect(ids).toEqual([
      'exdoc_p1_squat',
      'exdoc_p2_squat',
      'exdoc_p3_squat',
      'exdoc_p4_squat',
    ]);
    expect(new Set(ids).size).toBe(4);
  });

  it('permite selecionar 2 de 4', () => {
    const preview = previewBulkWorkoutNotes(base({ patientIds: ['p1', 'p2'] }));
    expect(preview.willChangeCount).toBe(2);
    expect(preview.writes.map((item) => item.patientName)).toEqual(['João', 'Maria']);
  });

  it('um paciente via lockedPatientId ignora a lista extra', () => {
    const preview = previewBulkWorkoutNotes(
      base({ lockedPatientId: 'p1', patientIds: ['p1', 'p2', 'p3'] })
    );
    expect(preview.writes).toHaveLength(1);
    expect(preview.writes[0].patientName).toBe('João');
  });

  it('somente onde vazio não toca quem já tem nota', () => {
    const available = [
      patient({ pacienteId: 'p1', name: 'João', sessionTrainerNotes: 'Já tinha' }),
      patient({ pacienteId: 'p2', name: 'Maria' }),
    ];
    const preview = previewBulkWorkoutNotes(
      base({
        availablePatients: available,
        patientIds: ['p1', 'p2'],
        conflict: 'skip-filled',
      })
    );
    expect(preview.alreadyHasCount).toBe(1);
    expect(preview.willChangeCount).toBe(1);
    expect(preview.writes.find((item) => item.patientName === 'João')?.action).toBe('skip-filled');
    expect(preview.writes.find((item) => item.patientName === 'Maria')?.action).toBe('write');
  });

  it('substituir troca o texto existente', () => {
    const preview = previewBulkWorkoutNotes(
      base({
        availablePatients: [patient({ pacienteId: 'p1', name: 'João', sessionTrainerNotes: 'Antiga' })],
        patientIds: ['p1'],
        conflict: 'replace',
        text: 'Nova',
      })
    );
    expect(preview.writes[0].nextText).toBe('Nova');
    expect(preview.writes[0].action).toBe('write');
  });

  it('acrescentar preserva o texto antigo', () => {
    const preview = previewBulkWorkoutNotes(
      base({
        availablePatients: [patient({ pacienteId: 'p1', name: 'João', sessionTrainerNotes: 'Antiga' })],
        patientIds: ['p1'],
        conflict: 'append',
        text: 'Nova',
      })
    );
    expect(preview.writes[0].nextText).toBe('Antiga\n\nNova');
  });

  it('draft não permite write', () => {
    const preview = previewBulkWorkoutNotes(base({ source: 'draft' }));
    expect(preview.errors.some((msg) => /publique/i.test(msg))).toBe(true);
    expect(preview.writes).toEqual([]);
  });

  it('card parcial rejeita paciente fora do card', () => {
    const preview = previewBulkWorkoutNotes(
      base({
        availablePatients: four.slice(0, 2),
        patientIds: ['p1', 'p2', 'p3'],
      })
    );
    expect(preview.errors.some((msg) => /não possui este treino/i.test(msg))).toBe(true);
    expect(preview.willChangeCount).toBe(0);
  });
});

describe('applyBulkWorkoutNotes', () => {
  it('não chama writer de patientNotes e grava trainerNotes', async () => {
    const writers = recordingWriters();
    const result = await applyBulkWorkoutNotes(base({ patientIds: ['p1', 'p2'] }), writers);
    expect(result.ok).toBe(true);
    expect(writers.sessions).toHaveLength(2);
    expect(writers.sessions.every((item) => item.trainerNotes.includes('flexão'))).toBe(true);
    expect(JSON.stringify(writers)).not.toMatch(/patientNotes/);
  });

  it('falha em um paciente não interrompe os demais', async () => {
    const writers = recordingWriters('Carlos');
    const result = await applyBulkWorkoutNotes(base(), writers);
    expect(result.savedCount).toBe(3);
    expect(result.reports.find((item) => item.patientName === 'Carlos')?.status).toBe('failed');
    expect(result.reports.filter((item) => item.status === 'saved')).toHaveLength(3);
    expect(writers.sessions.map((item) => item.sessionId).sort()).toEqual(
      ['ses_p1', 'ses_p2', 'ses_p4'].sort()
    );
  });

  it('exercício grava no doc de cada paciente', async () => {
    const writers = recordingWriters();
    const result = await applyBulkWorkoutNotes(
      base({
        target: 'exercise',
        exerciseKey: { exerciseId: '0025', order: 0, name: 'Agachamento' },
      }),
      writers
    );
    expect(result.savedCount).toBe(4);
    expect(writers.exercises.map((item) => item.exerciseDocId).sort()).toEqual(
      ['exdoc_p1_squat', 'exdoc_p2_squat', 'exdoc_p3_squat', 'exdoc_p4_squat'].sort()
    );
  });
});

describe('resolvePatientExercise', () => {
  it('não reutiliza exerciseDocId de outro paciente', () => {
    const joao = four[0].exercises;
    const maria = four[1].exercises;
    const key = { exerciseId: '0025', order: 0, name: 'Agachamento' };
    expect(resolvePatientExercise(joao, key)?.id).toBe('exdoc_p1_squat');
    expect(resolvePatientExercise(maria, key)?.id).toBe('exdoc_p2_squat');
  });
});
