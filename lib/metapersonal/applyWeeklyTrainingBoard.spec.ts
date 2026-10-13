import { describe, expect, it } from 'vitest';
import { createTemplateExerciseFromCatalog } from '@/lib/personal/planosTreino';
import {
  buildWeeklyBoardPublishPlan,
  previewWeeklyBoardApplication,
} from '@/lib/metapersonal/applyWeeklyTrainingBoard';
import {
  createEmptyWeeklyBoard,
  type TreinosSelectedPatient,
} from '@/components/metapersonal/treinos/treinosCentral.types';
import type { Exercise } from '@/types/exercise';
import type { PacienteCompleto } from '@/types/obesidade';

const catalog: Exercise = {
  id: '0025',
  name: 'barbell bench press',
  bodyPart: 'chest',
  target: 'pectorals',
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
      userId: overrides?.userId,
      nome: overrides?.nome || 'João',
    } as PacienteCompleto,
    medicoId: 'med_1',
    medicoNome: 'Dra. Ana',
    dataCompartilhamento: new Date(),
    status: 'ativo',
  };
}

function boardWithAonMonAndWed() {
  const board = createEmptyWeeklyBoard();
  const exercise = createTemplateExerciseFromCatalog(catalog);
  const template = { id: 'tpl_a', nome: 'Treino A', exercicios: [{ ...exercise, order: 0 }] };
  board.monday.push({ localId: 'c1', templateId: 'tpl_a', template });
  board.wednesday.push({ localId: 'c2', templateId: 'tpl_a', template });
  return board;
}

describe('previewWeeklyBoardApplication', () => {
  it('bloqueia paciente sem userId e aborta o plano inteiro', () => {
    const board = createEmptyWeeklyBoard();
    const exercise = createTemplateExerciseFromCatalog(catalog);
    board.monday.push({
      localId: 'c1',
      templateId: 'tpl_a',
      template: { id: 'tpl_a', nome: 'Treino A', exercicios: [{ ...exercise, order: 0 }] },
    });
    const preview = previewWeeklyBoardApplication({
      patients: [
        makePatient({ id: 'p1', nome: 'João', userId: 'uid_joao' }),
        makePatient({ id: 'p2', nome: 'Maria', userId: '' }),
      ],
      board,
      startDate: '2026-09-16',
      weeksCount: 4,
      createdById: 'pt_1',
      today: '2026-09-16',
    });
    expect(preview.errors.some((msg) => msg.includes('Maria') && msg.includes('userId'))).toBe(
      true
    );
    expect(preview.sessionCount).toBe(0);
    expect(
      buildWeeklyBoardPublishPlan({
        patients: [
          makePatient({ id: 'p1', nome: 'João', userId: 'uid_joao' }),
          makePatient({ id: 'p2', nome: 'Maria', userId: '' }),
        ],
        board,
        startDate: '2026-09-16',
        weeksCount: 4,
        createdById: 'pt_1',
        today: '2026-09-16',
      }).series
    ).toEqual([]);
  });

  it('usa paciente.userId, não o id do documento', () => {
    const plan = buildWeeklyBoardPublishPlan({
      patients: [makePatient({ id: 'doc_abc', nome: 'João', userId: 'uid_timestamp_1' })],
      board: boardWithAonMonAndWed(),
      startDate: '2026-09-16',
      weeksCount: 4,
      createdById: 'pt_1',
      today: '2026-09-16',
    });
    expect(plan.errors).toEqual([]);
    expect(plan.series.every((item) => item.patientId === 'uid_timestamp_1')).toBe(true);
    expect(plan.series.some((item) => item.patientId === 'doc_abc')).toBe(false);
  });

  it('mesmo template em dois dias vira duas séries com recurrenceGroupId distintos', () => {
    const plan = buildWeeklyBoardPublishPlan({
      patients: [
        makePatient({ id: 'p1', nome: 'João', userId: 'uid_joao' }),
        makePatient({ id: 'p2', nome: 'Carlos', userId: 'uid_carlos' }),
      ],
      board: boardWithAonMonAndWed(),
      startDate: '2026-09-16',
      weeksCount: 4,
      createdById: 'pt_1',
      today: '2026-09-16',
    });
    expect(plan.errors).toEqual([]);
    expect(plan.series).toHaveLength(4);
    const groupIds = new Set(plan.series.map((item) => item.recurrenceGroupId));
    expect(groupIds.size).toBe(4);
    const joaoMonday = plan.series.find(
      (item) => item.patientId === 'uid_joao' && item.weekday === 'monday'
    );
    expect(joaoMonday?.dates).toEqual(['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
    const joaoWednesday = plan.series.find(
      (item) => item.patientId === 'uid_joao' && item.weekday === 'wednesday'
    );
    expect(joaoWednesday?.dates[0]).toBe('2026-09-16');
    expect(joaoWednesday?.dates).not.toContain('2026-09-14');
  });

  it('conta 1 série por card × paciente × semanas', () => {
    const preview = previewWeeklyBoardApplication({
      patients: [
        makePatient({ id: 'p1', nome: 'João', userId: 'uid_joao' }),
        makePatient({ id: 'p2', nome: 'Carlos', userId: 'uid_carlos' }),
      ],
      board: boardWithAonMonAndWed(),
      startDate: '2026-09-16',
      weeksCount: 4,
      createdById: 'pt_1',
      today: '2026-09-16',
    });
    expect(preview.errors).toEqual([]);
    expect(preview.patientCount).toBe(2);
    expect(preview.dayCount).toBe(2);
    expect(preview.cardCount).toBe(2);
    expect(preview.sessionCount).toBe(16);
  });

  it('rejeita data de início no passado', () => {
    const preview = previewWeeklyBoardApplication({
      patients: [makePatient({ userId: 'uid_joao' })],
      board: boardWithAonMonAndWed(),
      startDate: '2026-09-13',
      weeksCount: 4,
      createdById: 'pt_1',
      today: '2026-09-16',
    });
    expect(preview.errors.some((msg) => msg.includes('passado'))).toBe(true);
    expect(preview.sessionCount).toBe(0);
  });
});
