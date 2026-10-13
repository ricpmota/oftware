/**
 * Dados de impressão do treino operacional (prescrição, não execução).
 */

import {
  translateBodyPart,
  translateEquipment,
  translateExerciseName,
  translateTarget,
} from '@/data/exerciseTranslations';
import {
  formatLoadKgInput,
  normalizeTrainingExercisePrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { buildHostRunQueue } from '@/lib/personal/trainingIntercalation';
import { sanitizeTrainerNote } from '@/lib/personal/workoutDraft';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

export type WorkoutPrintSeries = {
  kind?: 'main' | 'intercalated';
  order: number;
  name?: string;
  reps: number;
  loadKg: number | null;
  restSec: number;
  loadLabel: string;
};

export type WorkoutPrintExercise = {
  order: number;
  name: string;
  meta?: string;
  trainerNote?: string;
  series: WorkoutPrintSeries[];
};

export type WorkoutPrintData = {
  patientName: string;
  trainerName?: string;
  title: string;
  scheduledDate?: string;
  scheduledDateLabel?: string;
  printedAt: string;
  exercises: WorkoutPrintExercise[];
  exerciseCount: number;
  seriesCount: number;
};

export function formatPrintLoadKg(loadKg: number | null): string {
  if (loadKg == null) return '—';
  const formatted = formatLoadKgInput(loadKg);
  return formatted ? `${formatted} kg` : '—';
}

export function formatPrintRestSec(restSec: number): string {
  return `${Math.max(0, Math.round(restSec))} s`;
}

export function slugifyWorkoutPrintPart(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'treino';
}

export function workoutPrintFilename(data: Pick<WorkoutPrintData, 'patientName' | 'title'>): string {
  return `treino-${slugifyWorkoutPrintPart(data.patientName)}-${slugifyWorkoutPrintPart(data.title)}.pdf`;
}

function formatScheduledDateLabel(scheduledDate?: string): string | undefined {
  const raw = String(scheduledDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || undefined;
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('pt-BR');
}

function exerciseMeta(exercise: TrainingSessionExercise): string | undefined {
  const parts = [
    translateTarget(exercise.target) || translateBodyPart(exercise.bodyPart),
    translateEquipment(exercise.equipment),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function sortExercises(exercises: TrainingSessionExercise[]): TrainingSessionExercise[] {
  return [...exercises].sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const bo = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
}

export function buildWorkoutPrintData(params: {
  patientName: string;
  trainerName?: string | null;
  session: Pick<TrainingSession, 'title' | 'scheduledDate'>;
  exercises: TrainingSessionExercise[];
  now?: Date;
}): WorkoutPrintData {
  const now = params.now ?? new Date();
  const trainerName = String(params.trainerName || '').trim() || undefined;
  const exercises = sortExercises(params.exercises).map((exercise, index) => {
    const prescription = normalizeTrainingExercisePrescription(exercise.prescription);
    const intercalations = prescription.intercalations || [];
    const queue = buildHostRunQueue(prescription.series, intercalations);
    const series =
      intercalations.length === 0
        ? prescription.series.map((item) => ({
            kind: 'main' as const,
            order: item.order,
            reps: item.reps,
            loadKg: item.loadKg,
            restSec: item.restSec,
            loadLabel: formatPrintLoadKg(item.loadKg),
          }))
        : queue.map((step) => {
            if (step.kind === 'main') {
              const item = prescription.series.find((row) => row.id === step.seriesId);
              return {
                kind: 'main' as const,
                order: step.seriesOrder,
                reps: item?.reps ?? 0,
                loadKg: item?.loadKg ?? null,
                restSec: item?.restSec ?? 0,
                loadLabel: formatPrintLoadKg(item?.loadKg ?? null),
              };
            }
            const occ = intercalations.find((row) => row.id === step.intercalationId);
            return {
              kind: 'intercalated' as const,
              order: step.labelOrder,
              name: translateExerciseName(occ?.name || '') || occ?.name,
              reps: occ?.series.reps ?? 0,
              loadKg: occ?.series.loadKg ?? null,
              restSec: occ?.series.restSec ?? 0,
              loadLabel: formatPrintLoadKg(occ?.series.loadKg ?? null),
            };
          });
    const trainerNote = sanitizeTrainerNote(exercise.trainerNote);
    return {
      order: typeof exercise.order === 'number' ? exercise.order + 1 : index + 1,
      name: translateExerciseName(exercise.name) || exercise.name,
      meta: exerciseMeta(exercise),
      ...(trainerNote ? { trainerNote } : {}),
      series,
    } satisfies WorkoutPrintExercise;
  });

  const displayOrder = exercises.map((item, index) => ({ ...item, order: index + 1 }));
  const seriesCount = displayOrder.reduce((sum, item) => sum + item.series.length, 0);
  const scheduledDateLabel = formatScheduledDateLabel(params.session.scheduledDate);

  return {
    patientName: String(params.patientName || '').trim() || 'Paciente',
    ...(trainerName ? { trainerName } : {}),
    title: String(params.session.title || '').trim() || 'Treino',
    scheduledDate: params.session.scheduledDate,
    ...(scheduledDateLabel ? { scheduledDateLabel } : {}),
    printedAt: now.toLocaleDateString('pt-BR'),
    exercises: displayOrder,
    exerciseCount: displayOrder.length,
    seriesCount,
  };
}
