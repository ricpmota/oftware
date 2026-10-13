/**
 * Mídia visual no editor da Central: GIF de demonstração + exerciseGymMedia.
 * A mídia da academia é sempre patientUserId + exerciseId — nunca compartilhada.
 * Não persiste junto com prescrição, recorrência ou remoção de exercício.
 */

import { resolvePatientExercise } from '@/lib/metapersonal/bulkWorkoutNotes';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { ExerciseGymMedia, ExerciseGymMediaKind } from '@/lib/personal/exerciseGymMedia';
import { templateExerciseGifUrl } from '@/lib/personal/planosTreino';

export type ExerciseGymMediaLookupKey = {
  exerciseId: string;
  order?: number;
  name?: string;
};

export type GymMediaPatientRow = {
  pacienteId: string;
  patientUserId: string;
  name: string;
  exerciseId: string;
  media: ExerciseGymMedia | null;
};

export type GymMediaSummary = {
  rows: GymMediaPatientRow[];
  withMedia: number;
  total: number;
};

export type GymMediaOverrides = Record<string, ExerciseGymMedia | null>;

/** Lista compacta: vídeo só com ícone. Player monta apenas no preview/clique. */
export function gymMediaListPresentation(kind: ExerciseGymMediaKind): 'lazy-image' | 'play-icon' {
  return kind === 'video' ? 'play-icon' : 'lazy-image';
}

export function exerciseDemoGifUrl(exercise: {
  exerciseId?: string;
  gifUrl?: string | null;
}): string {
  const existing = String(exercise.gifUrl || '').trim();
  if (existing) return existing;
  return templateExerciseGifUrl(String(exercise.exerciseId || '').trim());
}

export function sourceOrderFromEditorKey(editorKey: string): number | undefined {
  if (String(editorKey).startsWith('add:')) return undefined;
  const n = Number(String(editorKey).split(':')[0]);
  return Number.isFinite(n) ? n : undefined;
}

export function exerciseLookupKeyFromDraft(exercise: {
  editorKey: string;
  exerciseId: string;
  name: string;
}): ExerciseGymMediaLookupKey {
  return {
    exerciseId: String(exercise.exerciseId || '').trim(),
    order: sourceOrderFromEditorKey(exercise.editorKey),
    name: exercise.name,
  };
}

export function gymMediaOverrideKey(patientUserId: string, exerciseId: string): string {
  return `${String(patientUserId || '').trim()}__${String(exerciseId || '').trim()}`;
}

export function applyGymMediaOverride(
  media: ExerciseGymMedia | null,
  patientUserId: string,
  exerciseId: string,
  overrides: GymMediaOverrides
): ExerciseGymMedia | null {
  const key = gymMediaOverrideKey(patientUserId, exerciseId);
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
  return media;
}

export function gymMediaForPatientExercise(
  patient: Pick<PlannerCardPatient, 'exercises' | 'gymMedia'>,
  key: ExerciseGymMediaLookupKey
): { exerciseId: string; media: ExerciseGymMedia | null } {
  const resolved = resolvePatientExercise(patient.exercises || [], key);
  const exerciseId = String(resolved?.exerciseId || key.exerciseId || '').trim();
  if (!exerciseId) return { exerciseId: '', media: null };
  const media =
    (patient.gymMedia || []).find((item) => String(item.exerciseId || '').trim() === exerciseId) ||
    null;
  return { exerciseId, media };
}

export function summarizeExerciseGymMedia(
  patients: PlannerCardPatient[],
  key: ExerciseGymMediaLookupKey,
  overrides: GymMediaOverrides = {}
): GymMediaSummary {
  const rows = patients.map((patient) => {
    const resolved = gymMediaForPatientExercise(patient, key);
    return {
      pacienteId: patient.pacienteId,
      patientUserId: patient.patientUserId,
      name: patient.name,
      exerciseId: resolved.exerciseId,
      media: applyGymMediaOverride(
        resolved.media,
        patient.patientUserId,
        resolved.exerciseId,
        overrides
      ),
    };
  });
  return {
    rows,
    withMedia: rows.filter((row) => Boolean(row.media)).length,
    total: rows.length,
  };
}

export function gymMediaUploadTarget(row: Pick<GymMediaPatientRow, 'pacienteId' | 'exerciseId'>): {
  pacienteId: string;
  exerciseId: string;
} {
  return {
    pacienteId: String(row.pacienteId || '').trim(),
    exerciseId: String(row.exerciseId || '').trim(),
  };
}
