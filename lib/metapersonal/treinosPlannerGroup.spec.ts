import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  collectPatientNotes,
  coverageLabel,
  cardActiveSummary,
  draftCardsToPlanner,
  groupExistingSessions,
  groupExistingSessionsByDate,
  plannerColorKeyFromTemplates,
  shouldNotifyPatientPublish,
  visualWorkoutSignature,
  withPlannerCardColors,
  type ExistingSessionRow,
  type PlannerBoardCard,
} from '@/lib/metapersonal/treinosPlannerGroup';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

function exercise(
  id: string,
  order: number,
  reps = 10
): TrainingSessionExercise {
  return {
    source: 'exercisedb',
    exerciseId: id,
    name: id,
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'barbell',
    prescription: {
      series: createDefaultTrainingSeries().map((item) => ({ ...item, reps })),
    },
    order,
  };
}

function session(overrides: Partial<TrainingSession>): TrainingSession {
  return {
    id: 's1',
    patientId: 'uid_a',
    createdBy: 'trainer',
    createdById: 'pt',
    scheduledDate: '2026-09-14',
    title: 'Treino A',
    status: 'scheduled',
    published: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function row(partial: Partial<ExistingSessionRow> & { name: string; pacienteId: string }): ExistingSessionRow {
  return {
    patientUserId: partial.patientUserId || `uid_${partial.pacienteId}`,
    weekday: 'monday',
    session: session({ id: partial.session?.id || partial.pacienteId, title: 'Treino A' }),
    exercises: [exercise('0025', 0)],
    gymMedia: [],
    ...partial,
  };
}

describe('visualWorkoutSignature', () => {
  it('ignora loadKg e ids de série, usa título + exerciseIds + reps', () => {
    const a = visualWorkoutSignature('Treino A', [
      exercise('0025', 0, 10),
    ]);
    const shiftedLoad: TrainingSessionExercise = {
      ...exercise('0025', 0, 10),
      prescription: {
        series: exercise('0025', 0, 10).prescription.series.map((item) => ({
          ...item,
          id: 'other',
          loadKg: 40,
        })),
      },
    };
    const b = visualWorkoutSignature('treino  a', [shiftedLoad]);
    expect(a).toBe(b);
  });

  it('não agrupa só pelo título', () => {
    const a = visualWorkoutSignature('Treino A', [exercise('0025', 0)]);
    const b = visualWorkoutSignature('Treino A', [exercise('9999', 0)]);
    expect(a).not.toBe(b);
  });
});

describe('groupExistingSessions', () => {
  it('consolida pacientes com a mesma assinatura no mesmo dia', () => {
    const cards = groupExistingSessions(
      [
        row({ name: 'João', pacienteId: 'p1' }),
        row({ name: 'Maria', pacienteId: 'p2' }),
      ],
      4
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].coveredPatientCount).toBe(2);
    expect(coverageLabel(cards[0])).toBe('2 de 4 pacientes');
    expect(cards[0].patients[0].exercises[0].prescription).toBeTruthy();
  });

  it('separa o mesmo título com exercícios diferentes', () => {
    const cards = groupExistingSessions(
      [
        row({ name: 'João', pacienteId: 'p1', exercises: [exercise('0025', 0)] }),
        row({
          name: 'Maria',
          pacienteId: 'p2',
          exercises: [exercise('1111', 0)],
        }),
      ],
      2
    );
    expect(cards).toHaveLength(2);
  });

  it('conta observações por paciente, sem misturar textos', () => {
    const cards = groupExistingSessions(
      [
        row({
          name: 'João',
          pacienteId: 'p1',
          session: session({ id: 's1', patientNotes: 'Dor no joelho' }),
        }),
        row({
          name: 'Maria',
          pacienteId: 'p2',
          session: session({ id: 's2' }),
        }),
      ],
      2
    );
    expect(cards[0].notesPatientCount).toBe(1);
    expect(cards[0].patients.find((p) => p.name === 'João')?.notes[0].text).toBe(
      'Dor no joelho'
    );
    expect(cards[0].patients.find((p) => p.name === 'Maria')?.notes).toEqual([]);
  });

  it('marca mixed 3/4 ativos no mesmo card', () => {
    const cards = groupExistingSessions(
      [
        row({ name: 'João', pacienteId: 'p1' }),
        row({ name: 'Maria', pacienteId: 'p2' }),
        row({
          name: 'Carlos',
          pacienteId: 'p3',
          session: session({ id: 's3', active: false }),
        }),
        row({ name: 'Ana', pacienteId: 'p4', session: session({ id: 's4' }) }),
      ],
      4
    );
    const summary = cardActiveSummary(cards[0]);
    expect(summary).toEqual({ activeCount: 3, total: 4, state: 'mixed' });
  });
});

describe('groupExistingSessionsByDate', () => {
  it('não mistura a mesma segunda em semanas diferentes', () => {
    const byDate = groupExistingSessionsByDate(
      [
        row({
          name: 'João',
          pacienteId: 'p1',
          weekday: 'monday',
          session: session({ id: 's1', scheduledDate: '2026-09-07' }),
        }),
        row({
          name: 'João',
          pacienteId: 'p1',
          weekday: 'monday',
          session: session({ id: 's2', scheduledDate: '2026-09-14' }),
        }),
      ],
      1
    );
    expect(Object.keys(byDate).sort()).toEqual(['2026-09-07', '2026-09-14']);
    expect(byDate['2026-09-07'][0].date).toBe('2026-09-07');
  });
});

describe('collectPatientNotes', () => {
  it('separa nota de sessão, paciente e exercício', () => {
    const notes = collectPatientNotes({
      trainerNotes: 'Carga leve',
      patientNotes: 'Foi ok',
      exercises: [{ name: 'Agachamento', trainerNote: 'Reduzir amplitude' }],
    });
    expect(notes.map((item) => item.scope)).toEqual([
      'session-trainer',
      'session-patient',
      'exercise',
    ]);
  });
});

describe('shouldNotifyPatientPublish', () => {
  it('não notifica quem ficou com zero sessões', () => {
    expect(shouldNotifyPatientPublish(0)).toBe(false);
    expect(shouldNotifyPatientPublish(8)).toBe(true);
  });
});

describe('coverageLabel', () => {
  const base: PlannerBoardCard = {
    id: 'x',
    weekday: 'monday',
    source: 'existing',
    title: 'A',
    subtitle: '1 exercício',
    exerciseCount: 1,
    selectedPatientCount: 1,
    coveredPatientCount: 1,
    notesPatientCount: 0,
    mediaFileCount: 0,
    patients: [],
    visualSignature: 'a',
  };
  it('marca draft como não publicado e 4/4 como todos', () => {
    expect(coverageLabel({ ...base, source: 'draft' })).toBe('Não publicado');
    expect(
      coverageLabel({ ...base, selectedPatientCount: 4, coveredPatientCount: 4 })
    ).toBe('Todos');
  });
});

describe('planner card color', () => {
  it('usa a cor do treino salvo pelo título da sessão', () => {
    const cards = groupExistingSessions([row({ name: 'Ana', pacienteId: 'p1' })], 1);
    expect(
      plannerColorKeyFromTemplates(cards[0], [
        { nome: 'Treino A', cor: 'amber', exercicios: [] },
      ])
    ).toBe('amber');
  });

  it('prioriza a assinatura visual sobre outro template com o mesmo título', () => {
    const cards = groupExistingSessions([row({ name: 'Ana', pacienteId: 'p1' })], 1);
    const matching = {
      nome: 'Treino A',
      cor: 'cyan' as const,
      exercicios: [
        {
          id: 't1',
          source: 'exercisedb' as const,
          exerciseId: '0025',
          name: '0025',
          bodyPart: 'chest',
          target: 'pectorals',
          equipment: 'barbell',
          prescription: { series: createDefaultTrainingSeries() },
          order: 0,
        },
      ],
    };
    expect(
      plannerColorKeyFromTemplates(cards[0], [
        { nome: 'Treino A', cor: 'rose', exercicios: [] },
        matching,
      ])
    ).toBe('cyan');
  });

  it('propaga a cor do rascunho e aplica a cor salva nos cards existentes', () => {
    const drafts = draftCardsToPlanner(
      'monday',
      [
        {
          localId: 'd1',
          templateId: 'tpl',
          template: { nome: 'Peito', cor: 'indigo', exercicios: [] },
        },
      ],
      1
    );
    expect(drafts[0].colorKey).toBe('indigo');
    const existing = groupExistingSessions([row({ name: 'Ana', pacienteId: 'p1' })], 1);
    expect(
      withPlannerCardColors(existing, [{ nome: 'Treino A', cor: 'lime', exercicios: [] }])[0]
        .colorKey
    ).toBe('lime');
  });
});
