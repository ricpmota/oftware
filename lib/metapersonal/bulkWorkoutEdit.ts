/**
 * Edição estrutural em massa da Central de Treinos.
 * ViewModel só para UI. Persistência por patch pontual — nunca apaga/recria a série.
 * Nunca grava patientNotes. Nunca mexe em exerciseGymMedia.
 */

import { resolvePatientExercise } from '@/lib/metapersonal/bulkWorkoutNotes';
import { TRAINING_RECURRENCE_MAX_WEEKS, toLocalYYYYMMDD } from '@/lib/personal/trainingRecurrence';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import {
  addTrainingSeries,
  createDefaultTrainingSeries,
  normalizeSeriesOrder,
  normalizeTrainingExercisePrescription,
  sanitizeLoadKg,
  sanitizeReps,
  sanitizeRestSec,
  serializeTrainingPrescription,
  updateTrainingSeries,
  type TrainingExercisePrescription,
} from '@/lib/personal/trainingExerciseSeries';
import { removeSeriesAndLinkedIntercalations } from '@/lib/personal/trainingIntercalation';
import { clonePrescriptionWithNewIds, sanitizeTrainerNote } from '@/lib/personal/workoutDraft';
import type { PlannerBoardCard, PlannerCardExercise, PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

export const MIXED_FIELD_LABEL = 'Múltiplos valores';

export type BulkEditTemporalScope = 'this' | 'this-and-future';

export type MixedField<T> = {
  mode: 'same' | 'mixed';
  value: T | null;
};

export type DirtyMixed<T> = MixedField<T> & {
  dirty: boolean;
  initialMode?: 'same' | 'mixed';
  initialValue?: T | null;
};

export type BulkEditSeriesView = {
  order: number;
  reps: MixedField<number>;
  loadKg: MixedField<number | null>;
  restSec: MixedField<number>;
};

export type BulkEditExerciseView = {
  editorKey: string;
  exerciseId: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  presentInPatientIds: string[];
  presentCount: number;
  totalPatients: number;
  seriesCount: MixedField<number>;
  series: BulkEditSeriesView[];
  trainerNote: MixedField<string>;
};

export type BulkEditViewModel = {
  exercises: BulkEditExerciseView[];
  totalPatients: number;
};

export type BulkEditDraftExercise = {
  editorKey: string;
  kind: 'existing' | 'added';
  exerciseId: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  presentInPatientIds: string[];
  presentCount: number;
  totalPatients: number;
  seriesCount: DirtyMixed<number>;
  series: Array<{
    order: number;
    reps: DirtyMixed<number>;
    loadKg: DirtyMixed<number | null>;
    restSec: DirtyMixed<number>;
  }>;
  trainerNote: DirtyMixed<string>;
  removed: boolean;
  addedPrescription?: TrainingExercisePrescription;
};

export type BulkEditDraft = {
  exercises: BulkEditDraftExercise[];
  orderDirty: boolean;
};

export type SeriesFieldPatch = {
  index: number;
  reps?: number;
  loadKg?: number | null;
  restSec?: number;
};

export type BulkEditExercisePatch = {
  editorKey: string;
  kind: 'keep' | 'add' | 'remove';
  exerciseId: string;
  name: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  order: number;
  sourceOrder?: number;
  seriesCount?: number;
  seriesPatches: SeriesFieldPatch[];
  trainerNote?: string;
  addedPrescription?: TrainingExercisePrescription;
  addedTrainerNote?: string;
};

export type BulkWorkoutEditPatch = {
  exercises: BulkEditExercisePatch[];
  orderChanged: boolean;
};

export type SessionExerciseOp =
  | { type: 'update-prescription'; exerciseDocId: string; prescription: TrainingExercisePrescription }
  | { type: 'update-note'; exerciseDocId: string; trainerNote: string }
  | { type: 'update-order'; exerciseDocId: string; order: number }
  | { type: 'add'; exercise: Omit<TrainingSessionExercise, 'id'> }
  | { type: 'delete'; exerciseDocId: string };

export type BulkWorkoutEditInput = {
  source: PlannerBoardCard['source'];
  availablePatients: PlannerCardPatient[];
  patientIds: string[];
  lockedPatientId?: string;
  temporalScope: BulkEditTemporalScope;
  patch: BulkWorkoutEditPatch;
  today: string;
  allowEmptyPatch?: boolean;
};

export type BulkEditPatientReport = {
  patientName: string;
  status: 'saved' | 'skipped' | 'failed';
  sessionsTouched: number;
  error?: string;
};

export type BulkWorkoutEditResult = {
  ok: boolean;
  reports: BulkEditPatientReport[];
  savedCount: number;
  sessionCount: number;
  errors: string[];
};

export type BulkEditPreview = {
  errors: string[];
  patientCount: number;
  sessionCount: number;
  changes: string[];
  temporalLabel: string;
  avulsaHint: boolean;
  removals: Array<{ name: string; patientCount: number; sessionCount: number }>;
};

export type BulkWorkoutEditWriters = {
  getSession: (sessionId: string) => Promise<TrainingSession | null>;
  getSessionExercises: (sessionId: string) => Promise<TrainingSessionExercise[]>;
  listPatientSessions: (
    patientId: string,
    startDate: string,
    endDate: string
  ) => Promise<TrainingSession[]>;
  updateExercisePrescription: (
    sessionId: string,
    exerciseDocId: string,
    prescription: TrainingExercisePrescription
  ) => Promise<void>;
  updateExerciseTrainerNote: (
    sessionId: string,
    exerciseDocId: string,
    trainerNote: string
  ) => Promise<void>;
  updateExerciseOrder: (sessionId: string, exerciseDocId: string, order: number) => Promise<void>;
  addExercise: (sessionId: string, exercise: Omit<TrainingSessionExercise, 'id'>) => Promise<string>;
  deleteExercise: (sessionId: string, exerciseDocId: string) => Promise<void>;
};

function normalizeName(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function bulkExerciseKey(exercise: {
  exerciseId?: string;
  order?: number;
  name?: string;
}): string {
  return `${exercise.order ?? 0}:${String(exercise.exerciseId || '').trim() || normalizeName(exercise.name)}`;
}

function loadsEqual(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.05;
}

function plusDays(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalYYYYMMDD(d);
}

export function bulkEditQueryEndDate(today: string, currentScheduledDate: string): string {
  const fromToday = plusDays(today, TRAINING_RECURRENCE_MAX_WEEKS * 7);
  const fromCurrent = plusDays(currentScheduledDate, TRAINING_RECURRENCE_MAX_WEEKS * 7);
  return fromToday >= fromCurrent ? fromToday : fromCurrent;
}

export function isSessionStructurallyEditable(
  session: Pick<TrainingSession, 'scheduledDate' | 'status' | 'active'>,
  today: string
): boolean {
  if (session.scheduledDate < today) return false;
  if (session.status === 'done') return false;
  if (!isTrainingSessionActive(session)) return false;
  return true;
}

export function selectBulkEditTargetSessions(
  current: TrainingSession,
  siblings: TrainingSession[],
  temporalScope: BulkEditTemporalScope,
  today: string
): TrainingSession[] {
  const byId = new Map<string, TrainingSession>();
  for (const item of [current, ...siblings]) {
    if (item.id) byId.set(item.id, item);
  }
  const all = Array.from(byId.values());
  const groupId = String(current.recurrenceGroupId || '').trim();

  if (temporalScope === 'this' || !groupId) {
    return isSessionStructurallyEditable(current, today) ? [current] : [];
  }

  return all
    .filter((item) => {
      if (String(item.recurrenceGroupId || '').trim() !== groupId) return false;
      if (item.scheduledDate < current.scheduledDate) return false;
      return isSessionStructurallyEditable(item, today);
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

function mixedField<T>(values: T[], equal: (a: T, b: T) => boolean): MixedField<T> {
  if (values.length === 0) return { mode: 'mixed', value: null };
  const first = values[0];
  if (values.every((item) => equal(item, first))) {
    return { mode: 'same', value: first };
  }
  return { mode: 'mixed', value: null };
}

function withDirty<T>(field: MixedField<T>): DirtyMixed<T> {
  return { ...field, dirty: false, initialMode: field.mode, initialValue: field.value };
}

export function buildBulkEditViewModel(patients: PlannerCardPatient[]): BulkEditViewModel {
  const totalPatients = patients.length;
  const buckets = new Map<
    string,
    {
      sample: PlannerCardExercise;
      presentInPatientIds: string[];
      exercises: PlannerCardExercise[];
    }
  >();

  for (const patient of patients) {
    const seen = new Set<string>();
    for (const exercise of [...(patient.exercises || [])].sort((a, b) => a.order - b.order)) {
      const key = bulkExerciseKey(exercise);
      if (seen.has(key)) continue;
      seen.add(key);
      const bucket = buckets.get(key) || {
        sample: exercise,
        presentInPatientIds: [],
        exercises: [],
      };
      bucket.presentInPatientIds.push(patient.pacienteId);
      bucket.exercises.push(exercise);
      buckets.set(key, bucket);
    }
  }

  const exercises: BulkEditExerciseView[] = Array.from(buckets.entries())
    .map(([editorKey, bucket]) => {
      const prescriptions = bucket.exercises.map((item) =>
        normalizeTrainingExercisePrescription(item.prescription)
      );
      const counts = prescriptions.map((item) => item.series.length);
      const seriesCount = mixedField(counts, (a, b) => a === b);
      const series: BulkEditSeriesView[] = [];
      if (seriesCount.mode === 'same' && seriesCount.value) {
        for (let index = 0; index < seriesCount.value; index += 1) {
          const reps = mixedField(
            prescriptions.map((item) => item.series[index]?.reps ?? 0),
            (a, b) => a === b
          );
          const loadKg = mixedField(
            prescriptions.map((item) => item.series[index]?.loadKg ?? null),
            loadsEqual
          );
          const restSec = mixedField(
            prescriptions.map((item) => item.series[index]?.restSec ?? 0),
            (a, b) => a === b
          );
          series.push({ order: index + 1, reps, loadKg, restSec });
        }
      }
      const notes = bucket.exercises.map((item) => sanitizeTrainerNote(item.trainerNote) || '');
      const sample = bucket.sample;
      return {
        editorKey,
        exerciseId: String(sample.exerciseId || '').trim(),
        name: sample.name || 'Exercício',
        bodyPart: sample.bodyPart || '',
        target: sample.target || '',
        equipment: sample.equipment || '',
        gifUrl: sample.gifUrl,
        presentInPatientIds: bucket.presentInPatientIds,
        presentCount: bucket.presentInPatientIds.length,
        totalPatients,
        seriesCount,
        series,
        trainerNote: mixedField(notes, (a, b) => a === b),
      };
    })
    .sort((a, b) => {
      const orderA = Number(a.editorKey.split(':')[0]) || 0;
      const orderB = Number(b.editorKey.split(':')[0]) || 0;
      return orderA - orderB;
    });

  return { exercises, totalPatients };
}

export function createBulkEditDraft(view: BulkEditViewModel): BulkEditDraft {
  return {
    orderDirty: false,
    exercises: view.exercises.map((exercise) => ({
      editorKey: exercise.editorKey,
      kind: 'existing',
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      target: exercise.target,
      equipment: exercise.equipment,
      gifUrl: exercise.gifUrl,
      presentInPatientIds: exercise.presentInPatientIds,
      presentCount: exercise.presentCount,
      totalPatients: exercise.totalPatients,
      seriesCount: withDirty(exercise.seriesCount),
      series: exercise.series.map((row) => ({
        order: row.order,
        reps: withDirty(row.reps),
        loadKg: withDirty(row.loadKg),
        restSec: withDirty(row.restSec),
      })),
      trainerNote: withDirty(exercise.trainerNote),
      removed: false,
    })),
  };
}

export function createAddedDraftExercise(input: {
  exerciseId: string;
  name: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  gifUrl?: string;
  totalPatients: number;
  prescription?: TrainingExercisePrescription;
}): BulkEditDraftExercise {
  const prescription = normalizeTrainingExercisePrescription(
    input.prescription || { series: createDefaultTrainingSeries() }
  );
  return {
    editorKey: `add:${input.exerciseId}:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    kind: 'added',
    exerciseId: input.exerciseId,
    name: input.name,
    bodyPart: input.bodyPart || '',
    target: input.target || '',
    equipment: input.equipment || '',
    gifUrl: input.gifUrl,
    presentInPatientIds: [],
    presentCount: input.totalPatients,
    totalPatients: input.totalPatients,
    seriesCount: { mode: 'same', value: prescription.series.length, dirty: true },
    series: prescription.series.map((row) => ({
      order: row.order,
      reps: { mode: 'same', value: row.reps, dirty: true },
      loadKg: { mode: 'same', value: row.loadKg, dirty: true },
      restSec: { mode: 'same', value: row.restSec, dirty: true },
    })),
    trainerNote: { mode: 'same', value: '', dirty: false },
    removed: false,
    addedPrescription: prescription,
  };
}

export function setDraftSeriesCount(
  exercise: BulkEditDraftExercise,
  count: number
): BulkEditDraftExercise {
  const n = Math.max(1, Math.round(count));
  const series = [...exercise.series];
  while (series.length < n) {
    const last = series[series.length - 1];
    series.push({
      order: series.length + 1,
      reps: last
        ? { mode: 'mixed', value: last.reps.value, dirty: false }
        : { mode: 'mixed', value: null, dirty: false },
      loadKg: { mode: 'mixed', value: null, dirty: false },
      restSec: last
        ? { mode: 'mixed', value: last.restSec.value, dirty: false }
        : { mode: 'mixed', value: null, dirty: false },
    });
  }
  return {
    ...exercise,
    seriesCount: { mode: 'same', value: n, dirty: true },
    series: series.slice(0, n).map((row, index) => ({ ...row, order: index + 1 })),
  };
}

export function hasBulkEditPatch(draft: BulkEditDraft): boolean {
  if (draft.orderDirty) return true;
  return draft.exercises.some((exercise) => {
    if (exercise.kind === 'added' && !exercise.removed) return true;
    if (exercise.removed) return true;
    if (exercise.seriesCount.dirty) return true;
    if (exercise.trainerNote.dirty) return true;
    return exercise.series.some(
      (row) => row.reps.dirty || row.loadKg.dirty || row.restSec.dirty
    );
  });
}

function sourceOrderFromKey(editorKey: string): number | undefined {
  if (String(editorKey).startsWith('add:')) return undefined;
  const n = Number(String(editorKey).split(':')[0]);
  return Number.isFinite(n) ? n : undefined;
}

export function buildPatchFromDraft(draft: BulkEditDraft): BulkWorkoutEditPatch {
  const visible = draft.exercises.filter((item) => !(item.kind === 'added' && item.removed));
  const exercises: BulkEditExercisePatch[] = [];
  let order = 0;
  for (const item of visible) {
    if (item.removed) {
      exercises.push({
        editorKey: item.editorKey,
        kind: 'remove',
        exerciseId: item.exerciseId,
        name: item.name,
        order,
        sourceOrder: sourceOrderFromKey(item.editorKey),
        seriesPatches: [],
      });
      continue;
    }
    if (item.kind === 'added') {
      const prescription: TrainingExercisePrescription = {
        series: item.series.map((row, index) => ({
          id: item.addedPrescription?.series[index]?.id || `tmp_${index}`,
          order: index + 1,
          reps: sanitizeReps(row.reps.value, 10),
          loadKg: row.loadKg.value ?? null,
          restSec: sanitizeRestSec(row.restSec.value, 60),
        })),
      };
      exercises.push({
        editorKey: item.editorKey,
        kind: 'add',
        exerciseId: item.exerciseId,
        name: item.name,
        bodyPart: item.bodyPart,
        target: item.target,
        equipment: item.equipment,
        gifUrl: item.gifUrl,
        order,
        seriesPatches: [],
        addedPrescription: prescription,
        addedTrainerNote: sanitizeTrainerNote(item.trainerNote.value) || undefined,
      });
      order += 1;
      continue;
    }
    const seriesPatches: SeriesFieldPatch[] = [];
    item.series.forEach((row, index) => {
      const patch: SeriesFieldPatch = { index };
      if (row.reps.dirty && row.reps.value != null) patch.reps = sanitizeReps(row.reps.value, 10);
      if (row.loadKg.dirty) patch.loadKg = sanitizeLoadKg(row.loadKg.value);
      if (row.restSec.dirty && row.restSec.value != null) {
        patch.restSec = sanitizeRestSec(row.restSec.value, 60);
      }
      if (patch.reps !== undefined || patch.loadKg !== undefined || patch.restSec !== undefined) {
        seriesPatches.push(patch);
      }
    });
    exercises.push({
      editorKey: item.editorKey,
      kind: 'keep',
      exerciseId: item.exerciseId,
      name: item.name,
      bodyPart: item.bodyPart,
      target: item.target,
      equipment: item.equipment,
      gifUrl: item.gifUrl,
      order,
      sourceOrder: sourceOrderFromKey(item.editorKey),
      seriesCount: item.seriesCount.dirty && item.seriesCount.value != null ? item.seriesCount.value : undefined,
      seriesPatches,
      trainerNote: item.trainerNote.dirty ? sanitizeTrainerNote(item.trainerNote.value) || '' : undefined,
    });
    order += 1;
  }
  return { exercises, orderChanged: draft.orderDirty };
}

export function describeBulkEditChanges(draft: BulkEditDraft): string[] {
  const lines: string[] = [];
  if (draft.orderDirty) lines.push('Ordem dos exercícios atualizada');
  for (const exercise of draft.exercises) {
    if (exercise.kind === 'added' && !exercise.removed) {
      lines.push(`Novo exercício: ${exercise.name}`);
      continue;
    }
    if (exercise.removed && exercise.kind === 'existing') {
      lines.push(`Remover: ${exercise.name}`);
      continue;
    }
    if (exercise.removed) continue;
    const bits: string[] = [];
    if (exercise.seriesCount.dirty && exercise.seriesCount.value != null) {
      bits.push(`${exercise.seriesCount.value} séries`);
    }
    const repsDirty = exercise.series.filter((row) => row.reps.dirty);
    if (repsDirty.length > 0) {
      const values = [...new Set(repsDirty.map((row) => row.reps.value))];
      const first = repsDirty[0];
      if (values.length === 1 && first.reps.value != null) {
        bits.push(
          first.reps.initialMode === 'same' && first.reps.initialValue != null
            ? `reps ${first.reps.initialValue} → ${first.reps.value}`
            : `reps → ${first.reps.value}`
        );
      } else {
        bits.push('reps alteradas');
      }
    }
    const loadDirty = exercise.series.filter((row) => row.loadKg.dirty);
    if (loadDirty.length > 0) {
      const first = loadDirty[0];
      bits.push(
        first.loadKg.value == null ? 'carga removida' : `carga definida para ${first.loadKg.value}kg`
      );
    }
    const restDirty = exercise.series.filter((row) => row.restSec.dirty);
    if (restDirty.length > 0 && restDirty[0].restSec.value != null) {
      bits.push(`descanso → ${restDirty[0].restSec.value}s`);
    }
    if (exercise.trainerNote.dirty) bits.push('orientação atualizada');
    if (bits.length > 0) lines.push(`${exercise.name}: ${bits.join(', ')}`);
  }
  return lines;
}

export function applyPrescriptionPatch(
  current: TrainingExercisePrescription | null | undefined,
  seriesCount: number | undefined,
  seriesPatches: SeriesFieldPatch[]
): TrainingExercisePrescription {
  let next = normalizeTrainingExercisePrescription(current);
  if (typeof seriesCount === 'number' && seriesCount >= 1) {
    while (next.series.length < seriesCount) {
      next = { ...next, series: addTrainingSeries(next.series) };
    }
    while (next.series.length > seriesCount) {
      const last = next.series[next.series.length - 1];
      const removed = removeSeriesAndLinkedIntercalations(
        next.series,
        next.intercalations,
        last.id
      );
      next = {
        series: normalizeSeriesOrder(removed.series),
        ...(removed.intercalations.length > 0 ? { intercalations: removed.intercalations } : {}),
      };
    }
  }
  for (const patch of seriesPatches) {
    const item = next.series[patch.index];
    if (!item) continue;
    next = {
      ...next,
      series: updateTrainingSeries(next.series, item.id, {
        ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
        ...(patch.loadKg !== undefined ? { loadKg: patch.loadKg } : {}),
        ...(patch.restSec !== undefined ? { restSec: patch.restSec } : {}),
      }),
    };
  }
  return next;
}

function prescriptionsEqual(
  a: TrainingExercisePrescription,
  b: TrainingExercisePrescription
): boolean {
  return JSON.stringify(serializeTrainingPrescription(a)) === JSON.stringify(serializeTrainingPrescription(b));
}

function matchExercise(
  exercises: TrainingSessionExercise[],
  patch: Pick<BulkEditExercisePatch, 'exerciseId' | 'name' | 'order' | 'sourceOrder'>
): TrainingSessionExercise | null {
  return resolvePatientExercise(exercises, {
    exerciseId: patch.exerciseId,
    order: patch.sourceOrder ?? patch.order,
    name: patch.name,
  }) as TrainingSessionExercise | null;
}

export function planSessionExerciseOps(
  exercises: TrainingSessionExercise[],
  patch: BulkWorkoutEditPatch
): SessionExerciseOp[] {
  const ops: SessionExerciseOp[] = [];
  const deletedIds = new Set<string>();
  const touchedIds = new Set<string>();

  for (const item of patch.exercises) {
    if (item.kind !== 'remove') continue;
    const found = matchExercise(exercises, item);
    if (!found?.id) continue;
    ops.push({ type: 'delete', exerciseDocId: found.id });
    deletedIds.add(found.id);
  }

  for (const item of patch.exercises) {
    if (item.kind !== 'keep') continue;
    const found = matchExercise(exercises, item);
    if (!found?.id || deletedIds.has(found.id)) continue;
    touchedIds.add(found.id);
    const nextPrescription = applyPrescriptionPatch(
      found.prescription,
      item.seriesCount,
      item.seriesPatches
    );
    if (!prescriptionsEqual(normalizeTrainingExercisePrescription(found.prescription), nextPrescription)) {
      ops.push({ type: 'update-prescription', exerciseDocId: found.id, prescription: nextPrescription });
    }
    if (item.trainerNote !== undefined) {
      const current = sanitizeTrainerNote(found.trainerNote) || '';
      if (current !== item.trainerNote) {
        ops.push({ type: 'update-note', exerciseDocId: found.id, trainerNote: item.trainerNote });
      }
    }
  }

  const addItems = patch.exercises.filter((item) => item.kind === 'add');
  let appendOrder =
    exercises.reduce((max, item) => Math.max(max, item.order || 0), -1) + 1;
  for (const item of addItems) {
    const already = exercises.some(
      (row) =>
        !deletedIds.has(String(row.id || '')) &&
        String(row.exerciseId || '').trim() === item.exerciseId
    );
    if (already) continue;
    const cloned = clonePrescriptionWithNewIds(
      normalizeTrainingExercisePrescription(item.addedPrescription)
    );
    const order = patch.orderChanged ? item.order : appendOrder;
    appendOrder += 1;
    const trainerNote = sanitizeTrainerNote(item.addedTrainerNote);
    ops.push({
      type: 'add',
      exercise: {
        source: 'exercisedb',
        exerciseId: item.exerciseId,
        name: item.name,
        bodyPart: item.bodyPart || '',
        target: item.target || '',
        equipment: item.equipment || '',
        prescription: cloned,
        order,
        ...(item.gifUrl ? { gifUrl: item.gifUrl } : {}),
        ...(trainerNote ? { trainerNote } : {}),
      },
    });
  }

  if (patch.orderChanged) {
    const keepItems = patch.exercises.filter((item) => item.kind === 'keep' || item.kind === 'add');
    for (const item of keepItems) {
      if (item.kind === 'add') continue;
      const found = matchExercise(exercises, item);
      if (!found?.id || deletedIds.has(found.id)) continue;
      if ((found.order || 0) !== item.order) {
        ops.push({ type: 'update-order', exerciseDocId: found.id, order: item.order });
      }
      touchedIds.add(found.id);
    }
    const extras = [...exercises]
      .filter((row) => row.id && !deletedIds.has(row.id) && !touchedIds.has(row.id))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    let extraOrder = keepItems.length;
    for (const extra of extras) {
      if (!extra.id) continue;
      if ((extra.order || 0) !== extraOrder) {
        ops.push({ type: 'update-order', exerciseDocId: extra.id, order: extraOrder });
      }
      extraOrder += 1;
    }
  }

  return ops;
}

export function temporalScopeLabel(scope: BulkEditTemporalScope): string {
  return scope === 'this' ? 'Somente esta ocorrência' : 'Esta e próximas';
}

export function selectedPatients(input: BulkWorkoutEditInput): PlannerCardPatient[] {
  const availableIds = new Set(input.availablePatients.map((item) => item.pacienteId));
  const requested = input.lockedPatientId
    ? [input.lockedPatientId]
    : [...new Set(input.patientIds.filter(Boolean))];
  return requested
    .filter((id) => availableIds.has(id))
    .map((id) => input.availablePatients.find((item) => item.pacienteId === id))
    .filter((item): item is PlannerCardPatient => Boolean(item));
}

export function validateBulkWorkoutEdit(input: BulkWorkoutEditInput): string[] {
  const errors: string[] = [];
  if (input.source !== 'existing') {
    errors.push('Publique o planejamento antes de editar o treino.');
  }
  if (input.today && !/^\d{4}-\d{2}-\d{2}$/.test(input.today)) {
    errors.push('Data de referência inválida.');
  }
  const requested = input.lockedPatientId
    ? [input.lockedPatientId]
    : [...new Set(input.patientIds.filter(Boolean))];
  if (requested.length === 0) {
    errors.push('Selecione pelo menos um paciente.');
  }
  const availableIds = new Set(input.availablePatients.map((item) => item.pacienteId));
  for (const id of requested) {
    if (!availableIds.has(id)) {
      const name = input.availablePatients.find((item) => item.pacienteId === id)?.name || id;
      errors.push(`${name} não possui este treino neste card.`);
    }
  }
  const hasOps = input.patch.orderChanged || input.patch.exercises.some((item) => {
    if (item.kind === 'add' || item.kind === 'remove') return true;
    return (
      item.seriesCount != null ||
      item.seriesPatches.length > 0 ||
      item.trainerNote !== undefined
    );
  });
  if (!hasOps && !input.allowEmptyPatch) {
    errors.push('Altere pelo menos um campo antes de aplicar.');
  }
  return errors;
}

async function resolvePatientTargetSessions(
  patient: PlannerCardPatient,
  input: BulkWorkoutEditInput,
  writers: BulkWorkoutEditWriters
): Promise<{ sessions: TrainingSession[]; avulsa: boolean; error?: string }> {
  const sessionId = String(patient.sessionId || '').trim();
  if (!sessionId) {
    return { sessions: [], avulsa: true, error: 'Sessão não encontrada.' };
  }
  const current = await writers.getSession(sessionId);
  if (!current?.id) {
    return { sessions: [], avulsa: true, error: 'Sessão não encontrada.' };
  }
  const avulsa = !String(current.recurrenceGroupId || '').trim();
  const patientId = String(current.patientId || patient.patientUserId || '').trim();
  const endDate = bulkEditQueryEndDate(input.today, current.scheduledDate);
  const siblings =
    input.temporalScope === 'this-and-future' && patientId && !avulsa
      ? await writers.listPatientSessions(patientId, input.today, endDate)
      : [];
  const sessions = selectBulkEditTargetSessions(current, siblings, input.temporalScope, input.today);
  if (sessions.length === 0) {
    return {
      sessions: [],
      avulsa,
      error: 'Nenhuma ocorrência futura/agendada pode ser alterada (passado e concluído ficam intactos).',
    };
  }
  return { sessions, avulsa };
}

export async function previewBulkWorkoutEdit(
  input: BulkWorkoutEditInput,
  writers: BulkWorkoutEditWriters,
  draft?: BulkEditDraft
): Promise<BulkEditPreview> {
  const errors = validateBulkWorkoutEdit(input);
  const patients = selectedPatients(input);
  const changes = draft ? describeBulkEditChanges(draft) : [];
  let sessionCount = 0;
  let avulsaHint = false;
  const removals: BulkEditPreview['removals'] = [];
  const removePatches = input.patch.exercises.filter((item) => item.kind === 'remove');

  if (errors.length === 0) {
    for (const patient of patients) {
      const resolved = await resolvePatientTargetSessions(patient, input, writers);
      if (resolved.avulsa && input.temporalScope === 'this-and-future') avulsaHint = true;
      if (resolved.error) continue;
      sessionCount += resolved.sessions.length;
      for (const remove of removePatches) {
        let present = 0;
        for (const session of resolved.sessions) {
          if (!session.id) continue;
          const exercises = await writers.getSessionExercises(session.id);
          if (matchExercise(exercises, remove)) present += 1;
        }
        if (present > 0) {
          const existing = removals.find((item) => item.name === remove.name);
          if (existing) {
            existing.patientCount += 1;
            existing.sessionCount += present;
          } else {
            removals.push({ name: remove.name, patientCount: 1, sessionCount: present });
          }
        }
      }
    }
    if (sessionCount === 0) {
      errors.push('Nenhuma sessão futura/agendada no escopo. Passado e concluído não são alterados.');
    }
  }

  return {
    errors,
    patientCount: patients.length,
    sessionCount,
    changes,
    temporalLabel: temporalScopeLabel(input.temporalScope),
    avulsaHint,
    removals,
  };
}

export async function applyBulkWorkoutEdit(
  input: BulkWorkoutEditInput,
  writers: BulkWorkoutEditWriters
): Promise<BulkWorkoutEditResult> {
  const errors = validateBulkWorkoutEdit(input);
  if (errors.length > 0) {
    return { ok: false, reports: [], savedCount: 0, sessionCount: 0, errors };
  }

  const patients = selectedPatients(input);
  const reports: BulkEditPatientReport[] = [];
  let sessionCount = 0;

  for (const patient of patients) {
    try {
      const resolved = await resolvePatientTargetSessions(patient, input, writers);
      if (resolved.error || resolved.sessions.length === 0) {
        reports.push({
          patientName: patient.name,
          status: 'skipped',
          sessionsTouched: 0,
          error: resolved.error,
        });
        continue;
      }
      let touched = 0;
      for (const session of resolved.sessions) {
        const sessionId = String(session.id || '').trim();
        if (!sessionId) continue;
        const exercises = await writers.getSessionExercises(sessionId);
        const ops = planSessionExerciseOps(exercises, input.patch);
        if (ops.length === 0) continue;
        for (const op of ops) {
          if (op.type === 'update-prescription') {
            await writers.updateExercisePrescription(sessionId, op.exerciseDocId, op.prescription);
          } else if (op.type === 'update-note') {
            await writers.updateExerciseTrainerNote(sessionId, op.exerciseDocId, op.trainerNote);
          } else if (op.type === 'update-order') {
            await writers.updateExerciseOrder(sessionId, op.exerciseDocId, op.order);
          } else if (op.type === 'add') {
            await writers.addExercise(sessionId, op.exercise);
          } else if (op.type === 'delete') {
            await writers.deleteExercise(sessionId, op.exerciseDocId);
          }
        }
        touched += 1;
      }
      sessionCount += touched;
      reports.push({
        patientName: patient.name,
        status: touched > 0 ? 'saved' : 'skipped',
        sessionsTouched: touched,
      });
    } catch (error) {
      reports.push({
        patientName: patient.name,
        status: 'failed',
        sessionsTouched: 0,
        error: error instanceof Error ? error.message : 'falha',
      });
    }
  }

  const failed = reports.filter((item) => item.status === 'failed');
  const savedCount = reports.filter((item) => item.status === 'saved').length;
  return {
    ok: failed.length === 0 && savedCount > 0,
    reports,
    savedCount,
    sessionCount,
    errors: failed.map((item) => `${item.patientName}: ${item.error || 'falha'}`),
  };
}

export function formatBulkEditReportLine(report: BulkEditPatientReport): string {
  if (report.status === 'saved') {
    return `${report.patientName} — ${report.sessionsTouched} ${
      report.sessionsTouched === 1 ? 'sessão atualizada' : 'sessões atualizadas'
    }`;
  }
  if (report.status === 'skipped') {
    return `${report.patientName} — ignorado${report.error ? ` (${report.error})` : ''}`;
  }
  return `${report.patientName} — falha${report.error ? ` (${report.error})` : ''}`;
}

export function somePatientsAreAvulsa(patients: PlannerCardPatient[]): boolean {
  return patients.some((item) => !String(item.recurrenceGroupId || '').trim());
}
