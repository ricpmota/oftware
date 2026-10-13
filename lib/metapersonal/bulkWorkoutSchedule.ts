/**
 * Edição de agendamento/recorrência na Central.
 * Infere dias/período a partir de trainingSessions + recurrenceGroupId.
 * Diff de datas: preserva sessionId nas coincidentes, cria as novas,
 * desativa (active: false) as futuras que saíram. Não toca passado/done.
 * Não reativa sessões já inactive.
 */

import {
  bulkEditQueryEndDate,
  planSessionExerciseOps,
  selectedPatients as selectedEditPatients,
  validateBulkWorkoutEdit,
  type BulkEditDraft,
  type BulkWorkoutEditInput,
  type BulkWorkoutEditPatch,
  type BulkWorkoutEditWriters,
  type SessionExerciseOp,
} from '@/lib/metapersonal/bulkWorkoutEdit';
import {
  inferRecurringConfigFromSessions,
  uniqueSessionWeekdays,
} from '@/lib/personal/inferRecurringConfig';
import {
  TRAINING_RECURRENCE_MAX_WEEKS,
  clampTrainingWeeksCount,
  createRecurrenceGroupId,
  generateSessionDates,
  toLocalYYYYMMDD,
} from '@/lib/personal/trainingRecurrence';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import { clonePrescriptionWithNewIds } from '@/lib/personal/workoutDraft';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

export const WEEK_PRESETS = [1, 2, 4, 6, 8, 12] as const;

export const SCHEDULE_DAY_OPTIONS: Array<{ jsDay: number; short: string; long: string }> = [
  { jsDay: 1, short: 'SEG', long: 'Segunda' },
  { jsDay: 2, short: 'TER', long: 'Terça' },
  { jsDay: 3, short: 'QUA', long: 'Quarta' },
  { jsDay: 4, short: 'QUI', long: 'Quinta' },
  { jsDay: 5, short: 'SEX', long: 'Sexta' },
  { jsDay: 6, short: 'SÁB', long: 'Sábado' },
  { jsDay: 0, short: 'DOM', long: 'Domingo' },
];

export type WorkoutScheduleConfig = {
  selectedDaysOfWeek: number[];
  startDate: string;
  endDate: string;
  weeksCount: number;
};

export type InferredPatientSchedule = {
  pacienteId: string;
  patientName: string;
  recurrenceGroupId?: string;
  avulsa: boolean;
  config: WorkoutScheduleConfig;
  fingerprint: string;
};

export type SharedScheduleView = {
  mode: 'same' | 'mixed' | 'none';
  value: WorkoutScheduleConfig | null;
  perPatient: InferredPatientSchedule[];
};

export type ScheduleDateDiff = {
  keep: string[];
  create: string[];
  deactivate: string[];
};

export type SchedulePatientImpact = {
  patientName: string;
  kept: number;
  created: number;
  deactivated: number;
};

export type CombinedEditPreview = {
  errors: string[];
  patientCount: number;
  workoutSessionCount: number;
  kept: number;
  created: number;
  deactivated: number;
  impacts: SchedulePatientImpact[];
  currentLabel?: string;
  nextLabel?: string;
  mixedSchedule: boolean;
};

export type CombinedEditInput = BulkWorkoutEditInput & {
  scheduleDirty: boolean;
  schedule: WorkoutScheduleConfig | null;
};

export type CombinedEditWriters = BulkWorkoutEditWriters & {
  createSessionWithExercises: (
    session: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>,
    exercises: Omit<TrainingSessionExercise, 'order'>[]
  ) => Promise<string>;
  setSessionsActive: (sessionIds: string[], active: boolean) => Promise<void>;
  updateSession: (
    sessionId: string,
    updates: Partial<Omit<TrainingSession, 'id' | 'createdAt'>>
  ) => Promise<void>;
};

function plusDays(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalYYYYMMDD(d);
}

function spanDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 1;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/** Janela da geração viva: início + N semanas − 1 dia. */
export function endDateFromWeeks(startDate: string, weeksCount: number): string {
  return plusDays(startDate, clampTrainingWeeksCount(weeksCount) * 7 - 1);
}

/**
 * Semanas a partir do intervalo. Arredonda para cima e limita 1–12.
 * Depois o final é sempre snapado com endDateFromWeeks para ficar alinhado à geração.
 */
export function weeksFromRange(startDate: string, endDate: string): number {
  return clampTrainingWeeksCount(Math.ceil(spanDaysInclusive(startDate, endDate) / 7));
}

export function normalizeScheduleConfig(input: WorkoutScheduleConfig): WorkoutScheduleConfig {
  const days = Array.from(
    new Set((input.selectedDaysOfWeek || []).filter((day) => day >= 0 && day <= 6))
  ).sort((a, b) => a - b);
  const startDate = String(input.startDate || '').trim();
  const weeksCount = clampTrainingWeeksCount(input.weeksCount || weeksFromRange(startDate, input.endDate));
  return {
    selectedDaysOfWeek: days,
    startDate,
    weeksCount,
    endDate: endDateFromWeeks(startDate, weeksCount),
  };
}

export function generateScheduleDates(config: WorkoutScheduleConfig): string[] {
  const normalized = normalizeScheduleConfig(config);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.startDate) || normalized.selectedDaysOfWeek.length === 0) {
    return [];
  }
  return generateSessionDates({
    startDate: normalized.startDate,
    sessionType: 'recurring',
    recurrenceFrequency: 'custom',
    weeksCount: normalized.weeksCount,
    selectedDaysOfWeek: normalized.selectedDaysOfWeek,
  });
}

export function diffScheduleDates(currentActiveDates: string[], nextDates: string[]): ScheduleDateDiff {
  const current = new Set(currentActiveDates);
  const next = new Set(nextDates);
  const keep = nextDates.filter((date) => current.has(date)).sort();
  const create = nextDates.filter((date) => !current.has(date)).sort();
  const deactivate = currentActiveDates.filter((date) => !next.has(date)).sort();
  return { keep, create, deactivate };
}

export function formatScheduleDays(days: number[]): string {
  const labels = SCHEDULE_DAY_OPTIONS.filter((item) => days.includes(item.jsDay)).map((item) => item.short);
  return labels.join(' · ') || '—';
}

export function formatScheduleDateBr(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatScheduleSummary(config: WorkoutScheduleConfig): string {
  const normalized = normalizeScheduleConfig(config);
  return `${formatScheduleDays(normalized.selectedDaysOfWeek)}\n${formatScheduleDateBr(normalized.startDate)} → ${formatScheduleDateBr(normalized.endDate)}\n${normalized.weeksCount} ${normalized.weeksCount === 1 ? 'semana' : 'semanas'}`;
}

export function scheduleFingerprint(config: WorkoutScheduleConfig): string {
  const normalized = normalizeScheduleConfig(config);
  return `${normalized.selectedDaysOfWeek.join(',')}|${normalized.startDate}|${normalized.weeksCount}`;
}

function isEditableSession(session: TrainingSession, today: string): boolean {
  if (session.scheduledDate < today) return false;
  if (session.status === 'done') return false;
  return true;
}

function groupSessions(current: TrainingSession, siblings: TrainingSession[]): TrainingSession[] {
  const byId = new Map<string, TrainingSession>();
  for (const item of [current, ...siblings]) {
    if (item.id) byId.set(item.id, item);
  }
  const groupId = String(current.recurrenceGroupId || '').trim();
  const all = Array.from(byId.values());
  if (!groupId) return current.id ? [current] : [];
  return all.filter((item) => String(item.recurrenceGroupId || '').trim() === groupId);
}

export function inferOperationalSchedule(
  sessions: TrainingSession[],
  today: string
): WorkoutScheduleConfig | null {
  if (!sessions.length) return null;
  const inferred = inferRecurringConfigFromSessions(sessions);
  const days = inferred.selectedDaysOfWeek.length
    ? inferred.selectedDaysOfWeek
    : uniqueSessionWeekdays(sessions);
  const editable = sessions.filter((item) => isEditableSession(item, today));
  const activeEditable = editable.filter(isTrainingSessionActive);
  const startPool = activeEditable.length ? activeEditable : editable;
  const startDate =
    startPool
      .map((item) => item.scheduledDate)
      .sort()[0] || today;
  const endPool = sessions.filter(
    (item) => isTrainingSessionActive(item) && item.scheduledDate >= startDate
  );
  const rawEnd =
    endPool.map((item) => item.scheduledDate).sort().slice(-1)[0] || startDate;
  const weeksCount = weeksFromRange(startDate, rawEnd);
  const selectedDaysOfWeek = days.length ? days : uniqueSessionWeekdays([{ ...sessions[0], scheduledDate: startDate }]);
  return normalizeScheduleConfig({
    selectedDaysOfWeek,
    startDate,
    endDate: rawEnd,
    weeksCount,
  });
}

export function comparePatientSchedules(items: InferredPatientSchedule[]): SharedScheduleView {
  if (items.length === 0) return { mode: 'none', value: null, perPatient: [] };
  const first = items[0].fingerprint;
  const same = items.every((item) => item.fingerprint === first);
  return {
    mode: same ? 'same' : 'mixed',
    value: same ? items[0].config : null,
    perPatient: items,
  };
}

function applyOpsInMemory(
  exercises: TrainingSessionExercise[],
  patch: BulkWorkoutEditPatch
): TrainingSessionExercise[] {
  const ops = planSessionExerciseOps(exercises, patch);
  let next = exercises.map((item) => ({ ...item }));
  let temp = 0;
  for (const op of ops) {
    if (op.type === 'update-prescription') {
      next = next.map((item) =>
        item.id === op.exerciseDocId ? { ...item, prescription: op.prescription } : item
      );
    } else if (op.type === 'update-note') {
      next = next.map((item) =>
        item.id === op.exerciseDocId ? { ...item, trainerNote: op.trainerNote } : item
      );
    } else if (op.type === 'update-order') {
      next = next.map((item) => (item.id === op.exerciseDocId ? { ...item, order: op.order } : item));
    } else if (op.type === 'delete') {
      next = next.filter((item) => item.id !== op.exerciseDocId);
    } else if (op.type === 'add') {
      next = [...next, { ...op.exercise, id: `tmp_add_${temp++}` }];
    }
  }
  return next.sort((a, b) => (a.order || 0) - (b.order || 0));
}

function exercisesForCreate(list: TrainingSessionExercise[]): Omit<TrainingSessionExercise, 'order'>[] {
  return list.map((exercise) => {
    const cloned = clonePrescriptionWithNewIds(
      exercise.prescription || { series: [{ id: 's1', order: 1, reps: 10, loadKg: null, restSec: 60 }] }
    );
    const row: Omit<TrainingSessionExercise, 'order'> = {
      source: exercise.source || 'exercisedb',
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      target: exercise.target,
      equipment: exercise.equipment,
      prescription: cloned,
      ...(exercise.gifUrl ? { gifUrl: exercise.gifUrl } : {}),
      ...(exercise.trainerNote ? { trainerNote: exercise.trainerNote } : {}),
    };
    return row;
  });
}

function workoutPatchHasOps(patch: BulkWorkoutEditPatch): boolean {
  return (
    patch.orderChanged ||
    patch.exercises.some((item) => {
      if (item.kind === 'add' || item.kind === 'remove') return true;
      return item.seriesCount != null || item.seriesPatches.length > 0 || item.trainerNote !== undefined;
    })
  );
}

async function applyWorkoutOps(
  sessionId: string,
  exercises: TrainingSessionExercise[],
  patch: BulkWorkoutEditPatch,
  writers: CombinedEditWriters
): Promise<number> {
  const ops = planSessionExerciseOps(exercises, patch);
  for (const op of ops) {
    await applyOp(sessionId, op, writers);
  }
  return ops.length > 0 ? 1 : 0;
}

async function applyOp(sessionId: string, op: SessionExerciseOp, writers: CombinedEditWriters) {
  if (op.type === 'update-prescription') {
    await writers.updateExercisePrescription(sessionId, op.exerciseDocId, op.prescription);
  } else if (op.type === 'update-note') {
    await writers.updateExerciseTrainerNote(sessionId, op.exerciseDocId, op.trainerNote);
  } else if (op.type === 'update-order') {
    await writers.updateExerciseOrder(sessionId, op.exerciseDocId, op.order);
  } else if (op.type === 'add') {
    await writers.addExercise(sessionId, op.exercise);
  } else {
    await writers.deleteExercise(sessionId, op.exerciseDocId);
  }
}

function queryEnd(today: string, current: TrainingSession, schedule: WorkoutScheduleConfig | null): string {
  const fromBulk = bulkEditQueryEndDate(today, current.scheduledDate);
  const fromSchedule = schedule ? normalizeScheduleConfig(schedule).endDate : fromBulk;
  return fromSchedule >= fromBulk ? fromSchedule : fromBulk;
}

export function validateScheduleConfig(
  schedule: WorkoutScheduleConfig | null,
  today: string
): string[] {
  if (!schedule) return ['Defina os dias e o período do novo agendamento.'];
  const normalized = normalizeScheduleConfig(schedule);
  const errors: string[] = [];
  if (normalized.selectedDaysOfWeek.length === 0) {
    errors.push('Selecione pelo menos um dia da semana.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.startDate)) {
    errors.push('Data de início inválida.');
  } else if (normalized.startDate < today) {
    errors.push('O início não pode ser anterior a hoje.');
  }
  if (generateScheduleDates(normalized).length === 0) {
    errors.push('Nenhuma data futura foi gerada com esses dias e período.');
  }
  return errors;
}

export async function inferSchedulesForPatients(
  patients: PlannerCardPatient[],
  today: string,
  writers: Pick<CombinedEditWriters, 'getSession' | 'listPatientSessions'>
): Promise<SharedScheduleView> {
  const perPatient: InferredPatientSchedule[] = [];
  for (const patient of patients) {
    const sessionId = String(patient.sessionId || '').trim();
    if (!sessionId) continue;
    const current = await writers.getSession(sessionId);
    if (!current?.id) continue;
    const patientId = String(current.patientId || patient.patientUserId || '').trim();
    const endDate = queryEnd(today, current, null);
    const siblings = patientId
      ? await writers.listPatientSessions(patientId, today, plusDays(endDate, TRAINING_RECURRENCE_MAX_WEEKS * 7))
      : [];
    const group = groupSessions(current, siblings);
    const config = inferOperationalSchedule(group, today);
    if (!config) continue;
    perPatient.push({
      pacienteId: patient.pacienteId,
      patientName: patient.name,
      recurrenceGroupId: current.recurrenceGroupId,
      avulsa: !String(current.recurrenceGroupId || '').trim(),
      config,
      fingerprint: scheduleFingerprint(config),
    });
  }
  return comparePatientSchedules(perPatient);
}

function classifyPatientDates(
  group: TrainingSession[],
  nextDates: string[],
  today: string
): {
  keepSessions: TrainingSession[];
  createDates: string[];
  deactivateSessions: TrainingSession[];
} {
  const activeEditable = group.filter(
    (item) => isEditableSession(item, today) && isTrainingSessionActive(item)
  );
  const byDate = new Map<string, TrainingSession>();
  for (const item of activeEditable) {
    if (!byDate.has(item.scheduledDate)) byDate.set(item.scheduledDate, item);
  }
  const keepSessions: TrainingSession[] = [];
  const createDates: string[] = [];
  for (const date of nextDates) {
    const existing = byDate.get(date);
    if (existing) keepSessions.push(existing);
    else createDates.push(date);
  }
  const nextSet = new Set(nextDates);
  const deactivateSessions = activeEditable.filter((item) => !nextSet.has(item.scheduledDate));
  return { keepSessions, createDates, deactivateSessions };
}

export async function previewCombinedWorkoutEdit(
  input: CombinedEditInput,
  writers: CombinedEditWriters,
  _draft?: BulkEditDraft
): Promise<CombinedEditPreview> {
  const workoutDirty = workoutPatchHasOps(input.patch);
  const errors = workoutDirty
    ? validateBulkWorkoutEdit(input)
    : validateBulkWorkoutEdit({ ...input, allowEmptyPatch: true }).filter(
        (item) => item !== 'Altere pelo menos um campo antes de aplicar.'
      );
  if (input.scheduleDirty) {
    errors.push(...validateScheduleConfig(input.schedule, input.today));
  }
  if (!workoutDirty && !input.scheduleDirty) {
    errors.push('Altere o treino ou o agendamento antes de aplicar.');
  }

  const patients = selectedEditPatients(input);
  const mixedSchedule = false;
  let kept = 0;
  let created = 0;
  let deactivated = 0;
  let workoutSessionCount = 0;
  const impacts: SchedulePatientImpact[] = [];

  if (errors.length === 0) {
    for (const patient of patients) {
      const sessionId = String(patient.sessionId || '').trim();
      const current = sessionId ? await writers.getSession(sessionId) : null;
      if (!current?.id) continue;
      const patientId = String(current.patientId || patient.patientUserId || '').trim();
      const endDate = queryEnd(input.today, current, input.schedule);
      const siblings = patientId
        ? await writers.listPatientSessions(patientId, input.today, endDate)
        : [];
      const group = groupSessions(current, siblings);
      if (input.scheduleDirty && input.schedule) {
        const nextDates = generateScheduleDates(input.schedule).filter((date) => date >= input.today);
        const classified = classifyPatientDates(group, nextDates, input.today);
        kept += classified.keepSessions.length;
        created += classified.createDates.length;
        deactivated += classified.deactivateSessions.length;
        workoutSessionCount += classified.keepSessions.length;
        impacts.push({
          patientName: patient.name,
          kept: classified.keepSessions.length,
          created: classified.createDates.length,
          deactivated: classified.deactivateSessions.length,
        });
      } else {
        const editable = group.filter(
          (item) => isEditableSession(item, input.today) && isTrainingSessionActive(item)
        );
        const scoped =
          input.temporalScope === 'this'
            ? editable.filter((item) => item.id === current.id)
            : editable.filter((item) => item.scheduledDate >= current.scheduledDate);
        workoutSessionCount += scoped.length;
      }
    }
    if (input.scheduleDirty && kept + created === 0) {
      errors.push('Nenhuma sessão futura/agendada no novo período.');
    }
    if (!input.scheduleDirty && workoutDirty && workoutSessionCount === 0) {
      errors.push('Nenhuma sessão futura/agendada no escopo. Passado e concluído não são alterados.');
    }
  }

  return {
    errors,
    patientCount: patients.length,
    workoutSessionCount,
    kept,
    created,
    deactivated,
    impacts,
    currentLabel: undefined,
    nextLabel: input.scheduleDirty && input.schedule ? formatScheduleSummary(input.schedule) : undefined,
    mixedSchedule,
  };
}

export async function applyCombinedWorkoutEdit(
  input: CombinedEditInput,
  writers: CombinedEditWriters
): Promise<{
  ok: boolean;
  reports: Array<{
    patientName: string;
    status: 'saved' | 'skipped' | 'failed';
    sessionsTouched: number;
    kept?: number;
    created?: number;
    deactivated?: number;
    error?: string;
  }>;
  savedCount: number;
  sessionCount: number;
  errors: string[];
}> {
  const preview = await previewCombinedWorkoutEdit(input, writers);
  if (preview.errors.length > 0 && preview.patientCount === 0) {
    return { ok: false, reports: [], savedCount: 0, sessionCount: 0, errors: preview.errors };
  }
  const hardErrors = preview.errors.filter(
    (item) =>
      item.startsWith('Publique') ||
      item.startsWith('Selecione') ||
      item.includes('inválid') ||
      item.startsWith('Defina') ||
      item.startsWith('O início') ||
      item.startsWith('Altere o treino')
  );
  if (hardErrors.length > 0) {
    return { ok: false, reports: [], savedCount: 0, sessionCount: 0, errors: preview.errors };
  }

  const workoutDirty = workoutPatchHasOps(input.patch);
  const patients = selectedEditPatients(input);
  const reports: Array<{
    patientName: string;
    status: 'saved' | 'skipped' | 'failed';
    sessionsTouched: number;
    kept?: number;
    created?: number;
    deactivated?: number;
    error?: string;
  }> = [];
  let sessionCount = 0;

  for (const patient of patients) {
    try {
      const sessionId = String(patient.sessionId || '').trim();
      const current = sessionId ? await writers.getSession(sessionId) : null;
      if (!current?.id) {
        reports.push({
          patientName: patient.name,
          status: 'skipped',
          sessionsTouched: 0,
          error: 'Sessão não encontrada.',
        });
        continue;
      }
      const patientId = String(current.patientId || patient.patientUserId || '').trim();
      const endDate = queryEnd(input.today, current, input.schedule);
      const siblings = patientId
        ? await writers.listPatientSessions(patientId, input.today, endDate)
        : [];
      const group = groupSessions(current, siblings);
      const baseExercises = await writers.getSessionExercises(current.id);
      const patched = workoutDirty ? applyOpsInMemory(baseExercises, input.patch) : baseExercises;

      if (!input.scheduleDirty) {
        const editable = group.filter(
          (item) => isEditableSession(item, input.today) && isTrainingSessionActive(item)
        );
        const targets =
          input.temporalScope === 'this'
            ? editable.filter((item) => item.id === current.id)
            : editable.filter((item) => item.scheduledDate >= current.scheduledDate);
        let touched = 0;
        for (const session of targets) {
          if (!session.id) continue;
          const exercises = await writers.getSessionExercises(session.id);
          touched += await applyWorkoutOps(session.id, exercises, input.patch, writers);
        }
        sessionCount += touched;
        reports.push({
          patientName: patient.name,
          status: touched > 0 ? 'saved' : 'skipped',
          sessionsTouched: touched,
          error: touched > 0 ? undefined : 'Nenhuma ocorrência futura/agendada pode ser alterada.',
        });
        continue;
      }

      const schedule = normalizeScheduleConfig(input.schedule!);
      const nextDates = generateScheduleDates(schedule).filter((date) => date >= input.today);
      const classified = classifyPatientDates(group, nextDates, input.today);
      let groupId = String(current.recurrenceGroupId || '').trim();
      if (!groupId && nextDates.length > 0) {
        groupId = createRecurrenceGroupId('rec');
      }

      if (workoutDirty) {
        for (const session of classified.keepSessions) {
          if (!session.id) continue;
          const exercises = await writers.getSessionExercises(session.id);
          await applyWorkoutOps(session.id, exercises, input.patch, writers);
        }
      }

      if (groupId) {
        for (const session of classified.keepSessions) {
          if (!session.id) continue;
          if (String(session.recurrenceGroupId || '').trim() !== groupId) {
            await writers.updateSession(session.id, { recurrenceGroupId: groupId });
          }
        }
      }

      const snapshotExercises = exercisesForCreate(patched);
      for (const date of classified.createDates) {
        await writers.createSessionWithExercises(
          {
            patientId,
            createdBy: current.createdBy,
            createdById: current.createdById,
            scheduledDate: date,
            title: current.title,
            status: 'scheduled',
            published: current.published,
            active: true,
            recurrenceGroupId: groupId || undefined,
            ...(current.trainerNotes ? { trainerNotes: current.trainerNotes } : {}),
          },
          snapshotExercises
        );
      }

      const deactivateIds = classified.deactivateSessions
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));
      if (deactivateIds.length) {
        await writers.setSessionsActive(deactivateIds, false);
      }

      const touched =
        classified.keepSessions.length + classified.createDates.length + classified.deactivateSessions.length;
      sessionCount += touched;
      reports.push({
        patientName: patient.name,
        status: touched > 0 ? 'saved' : 'skipped',
        sessionsTouched: touched,
        kept: classified.keepSessions.length,
        created: classified.createDates.length,
        deactivated: classified.deactivateSessions.length,
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

export function formatCombinedEditReportLine(report: {
  patientName: string;
  status: 'saved' | 'skipped' | 'failed';
  sessionsTouched: number;
  kept?: number;
  created?: number;
  deactivated?: number;
  error?: string;
}): string {
  if (report.status === 'saved') {
    if (report.kept != null || report.created != null || report.deactivated != null) {
      return `${report.patientName} — ${report.kept || 0} permanecem, ${report.created || 0} novas, ${report.deactivated || 0} desativadas`;
    }
    return `${report.patientName} — ${report.sessionsTouched} ${
      report.sessionsTouched === 1 ? 'sessão atualizada' : 'sessões atualizadas'
    }`;
  }
  if (report.status === 'skipped') {
    return `${report.patientName} — ignorado${report.error ? ` (${report.error})` : ''}`;
  }
  return `${report.patientName} — falha${report.error ? ` (${report.error})` : ''}`;
}

