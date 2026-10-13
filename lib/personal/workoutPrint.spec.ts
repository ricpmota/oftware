import { describe, expect, it } from 'vitest';
import { createUniformTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  buildWorkoutPrintData,
  formatPrintLoadKg,
  slugifyWorkoutPrintPart,
  workoutPrintFilename,
} from '@/lib/personal/workoutPrint';
import type { TrainingSessionExercise } from '@/types/trainingSession';

function makeExercise(
  partial: Partial<TrainingSessionExercise> & Pick<TrainingSessionExercise, 'name' | 'exerciseId'>
): TrainingSessionExercise {
  return {
    source: 'exercisedb',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'barbell',
    order: 0,
    prescription: { series: createUniformTrainingSeries({ count: 3, reps: 10, restSec: 60, loadKg: 30 }) },
    ...partial,
  };
}

describe('workoutPrint', () => {
  it('tradicional 3×10 vira três linhas', () => {
    const data = buildWorkoutPrintData({
      patientName: 'João da Silva',
      session: { title: 'Peito', scheduledDate: '2026-08-18' },
      exercises: [makeExercise({ name: 'bench', exerciseId: '0025', order: 0 })],
      now: new Date('2026-08-18T12:00:00'),
    });
    expect(data.exercises[0].series).toHaveLength(3);
    expect(data.exercises[0].series.every((s) => s.reps === 10 && s.loadLabel === '30 kg' && s.restSec === 60)).toBe(
      true
    );
    expect(data.exerciseCount).toBe(1);
    expect(data.seriesCount).toBe(3);
  });

  it('pirâmide gera quatro linhas independentes', () => {
    const series = [
      { id: 'a', order: 1, reps: 15, loadKg: 20, restSec: 60 },
      { id: 'b', order: 2, reps: 12, loadKg: 25, restSec: 60 },
      { id: 'c', order: 3, reps: 10, loadKg: 30, restSec: 75 },
      { id: 'd', order: 4, reps: 8, loadKg: 35, restSec: 90 },
    ];
    const data = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Peito', scheduledDate: '2026-08-18' },
      exercises: [makeExercise({ name: 'bench', exerciseId: '0025', prescription: { series } })],
    });
    expect(data.exercises[0].series.map((s) => `${s.reps} ${s.loadLabel} ${s.restSec}`)).toEqual([
      '15 20 kg 60',
      '12 25 kg 60',
      '10 30 kg 75',
      '8 35 kg 90',
    ]);
  });

  it('carga null vira travessão', () => {
    expect(formatPrintLoadKg(null)).toBe('—');
    const data = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Treino', scheduledDate: '2026-08-18' },
      exercises: [
        makeExercise({
          name: 'push-up',
          exerciseId: '0001',
          prescription: { series: createUniformTrainingSeries({ count: 2, reps: 12, restSec: 45, loadKg: null }) },
        }),
      ],
    });
    expect(data.exercises[0].series.every((s) => s.loadLabel === '—')).toBe(true);
  });

  it('preserva trainerNote e omite bloco vazio', () => {
    const withNote = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Treino', scheduledDate: '2026-08-18' },
      exercises: [
        makeExercise({
          name: 'bench',
          exerciseId: '0025',
          trainerNote: 'Manter escápulas retraídas.',
        }),
      ],
    });
    expect(withNote.exercises[0].trainerNote).toBe('Manter escápulas retraídas.');

    const empty = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Treino', scheduledDate: '2026-08-18' },
      exercises: [makeExercise({ name: 'bench', exerciseId: '0025', trainerNote: '   ' })],
    });
    expect(empty.exercises[0].trainerNote).toBeUndefined();
  });

  it('respeita a ordem persistida e não deduplica ExerciseDB', () => {
    const data = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Treino', scheduledDate: '2026-08-18' },
      exercises: [
        makeExercise({ name: 'fly', exerciseId: '0030', order: 2 }),
        makeExercise({ name: 'bench', exerciseId: '0025', order: 0, trainerNote: 'Primeiro' }),
        makeExercise({ name: 'bench', exerciseId: '0025', order: 1, trainerNote: 'Segundo' }),
      ],
    });
    expect(data.exercises).toHaveLength(3);
    expect(data.exercises.map((e) => e.order)).toEqual([1, 2, 3]);
    expect(data.exercises[0].trainerNote).toBe('Primeiro');
    expect(data.exercises[1].trainerNote).toBe('Segundo');
    expect(data.exercises[2].trainerNote).toBeUndefined();
  });

  it('treino legado sets/reps é normalizado', () => {
    const data = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Treino', scheduledDate: '2026-08-18' },
      exercises: [
        makeExercise({
          name: 'bench',
          exerciseId: '0025',
          prescription: { sets: 4, reps: 8, restSec: 90 } as never,
        }),
      ],
    });
    expect(data.exercises[0].series).toHaveLength(4);
    expect(data.exercises[0].series.every((s) => s.reps === 8 && s.restSec === 90 && s.loadLabel === '—')).toBe(
      true
    );
  });

  it('imprime intercalado entre as séries correspondentes', () => {
    const series = [
      { id: 'a1', order: 1, reps: 15, loadKg: 20, restSec: 0 },
      { id: 'a2', order: 2, reps: 12, loadKg: 25, restSec: 60 },
    ];
    const data = buildWorkoutPrintData({
      patientName: 'João',
      session: { title: 'Peito', scheduledDate: '2026-08-18' },
      exercises: [
        makeExercise({
          name: 'bench',
          exerciseId: '0025',
          prescription: {
            series,
            intercalations: [
              {
                id: 'int_1',
                afterSeriesId: 'a1',
                slotOrder: 0,
                exerciseId: 'lat',
                name: 'lateral raise',
                bodyPart: 'shoulders',
                target: 'delts',
                equipment: 'dumbbell',
                series: { id: 'b1', order: 1, reps: 12, loadKg: 8, restSec: 60 },
              },
            ],
          },
        }),
      ],
    });
    expect(data.exercises[0].series.map((row) => `${row.kind}:${row.reps}`)).toEqual([
      'main:15',
      'intercalated:12',
      'main:12',
    ]);
    expect(data.exercises[0].series[1].name).toBeTruthy();
    expect(data.seriesCount).toBe(3);
  });

  it('sanitiza nome de arquivo', () => {
    expect(slugifyWorkoutPrintPart('João da Silva')).toBe('joao-da-silva');
    expect(
      workoutPrintFilename({ patientName: 'João da Silva', title: 'Peito + Tríceps' })
    ).toBe('treino-joao-da-silva-peito-triceps.pdf');
  });
});
