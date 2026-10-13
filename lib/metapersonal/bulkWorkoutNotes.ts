/**
 * Observações em massa da Central: uma escrita por paciente, campos vivos.
 * Sessão → trainingSessions.trainerNotes
 * Exercício → exercises.trainerNote
 * Nunca grava patientNotes.
 */

import { sanitizeTrainerNote } from '@/lib/personal/workoutDraft';
import type { PlannerBoardCard, PlannerCardExercise, PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';

export type BulkNoteTarget = 'session' | 'exercise';
export type BulkNoteConflict = 'skip-filled' | 'replace' | 'append';

export type BulkNoteExerciseKey = {
  exerciseId: string;
  order?: number;
  name?: string;
};

export type BulkNotePlanInput = {
  source: PlannerBoardCard['source'];
  target: BulkNoteTarget;
  text: string;
  conflict: BulkNoteConflict;
  availablePatients: PlannerCardPatient[];
  patientIds: string[];
  exerciseKey?: BulkNoteExerciseKey;
  lockedPatientId?: string;
};

export type BulkNoteWrite = {
  pacienteId: string;
  patientName: string;
  sessionId: string;
  kind: BulkNoteTarget;
  exerciseDocId?: string;
  exerciseName?: string;
  previousText: string;
  nextText: string;
  action: 'write' | 'skip-filled' | 'skip-missing-target';
};

export type BulkNotePreview = {
  errors: string[];
  writes: BulkNoteWrite[];
  willChangeCount: number;
  alreadyHasCount: number;
  eligiblePatientCount: number;
  exerciseLabel?: string;
};

export type BulkNotePatientReport = {
  patientName: string;
  status: 'saved' | 'skipped' | 'failed';
  error?: string;
};

export type BulkNoteResult = {
  ok: boolean;
  reports: BulkNotePatientReport[];
  savedCount: number;
  errors: string[];
};

export type BulkNoteWriters = {
  updateSessionTrainerNotes: (sessionId: string, trainerNotes: string) => Promise<void>;
  updateExerciseTrainerNote: (
    sessionId: string,
    exerciseDocId: string,
    trainerNote: string
  ) => Promise<void>;
};

function normalizeName(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function listCardExercises(card: PlannerBoardCard): PlannerCardExercise[] {
  const seen = new Map<string, PlannerCardExercise>();
  for (const patient of card.patients) {
    for (const exercise of patient.exercises || []) {
      const key = `${exercise.order}:${exercise.exerciseId || normalizeName(exercise.name)}`;
      if (!seen.has(key)) seen.set(key, exercise);
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.order - b.order);
}

export function resolvePatientExercise(
  exercises: PlannerCardExercise[],
  key: BulkNoteExerciseKey
): PlannerCardExercise | null {
  const exerciseId = String(key.exerciseId || '').trim();
  const byId = exercises.filter((item) => String(item.exerciseId || '').trim() === exerciseId);
  if (byId.length === 1) return byId[0];
  if (byId.length > 1) {
    if (typeof key.order === 'number') {
      const byOrder = byId.find((item) => item.order === key.order);
      if (byOrder) return byOrder;
    }
    const byName = byId.find((item) => normalizeName(item.name) === normalizeName(key.name));
    if (byName) return byName;
    return byId[0];
  }
  if (typeof key.order === 'number') {
    const byOrder = exercises.filter((item) => item.order === key.order);
    if (byOrder.length === 1) {
      if (!key.name || normalizeName(byOrder[0].name) === normalizeName(key.name)) {
        return byOrder[0];
      }
    }
  }
  return null;
}

export function composeNoteText(
  previous: string,
  next: string,
  conflict: BulkNoteConflict
): { action: BulkNoteWrite['action']; nextText: string } | { action: 'skip-filled'; nextText: string } {
  const incoming = sanitizeTrainerNote(next) || '';
  const current = String(previous || '').trim();
  if (!incoming) {
    return { action: 'skip-missing-target', nextText: current };
  }
  if (!current) {
    return { action: 'write', nextText: incoming };
  }
  if (conflict === 'skip-filled') {
    return { action: 'skip-filled', nextText: current };
  }
  if (conflict === 'append') {
    return { action: 'write', nextText: `${current}\n\n${incoming}` };
  }
  return { action: 'write', nextText: incoming };
}

export function previewBulkWorkoutNotes(input: BulkNotePlanInput): BulkNotePreview {
  const errors: string[] = [];
  if (input.source !== 'existing') {
    errors.push('Publique o planejamento antes de adicionar observações individuais.');
  }
  const text = sanitizeTrainerNote(input.text) || '';
  if (!text) {
    errors.push('Escreva a observação.');
  }
  if (input.target === 'exercise' && !String(input.exerciseKey?.exerciseId || '').trim()) {
    if (typeof input.exerciseKey?.order !== 'number') {
      errors.push('Selecione um exercício.');
    }
  }

  const availableIds = new Set(input.availablePatients.map((item) => item.pacienteId));
  const requested = input.lockedPatientId
    ? [input.lockedPatientId]
    : [...new Set(input.patientIds.filter(Boolean))];

  if (requested.length === 0) {
    errors.push('Selecione pelo menos um paciente.');
  }
  for (const id of requested) {
    if (!availableIds.has(id)) {
      const name = input.availablePatients.find((item) => item.pacienteId === id)?.name || id;
      errors.push(`${name} não possui este treino neste card.`);
    }
  }

  if (errors.length > 0) {
    return {
      errors,
      writes: [],
      willChangeCount: 0,
      alreadyHasCount: 0,
      eligiblePatientCount: 0,
    };
  }

  const writes: BulkNoteWrite[] = [];
  const patients = requested
    .map((id) => input.availablePatients.find((item) => item.pacienteId === id))
    .filter((item): item is PlannerCardPatient => Boolean(item));

  for (const patient of patients) {
    const sessionId = String(patient.sessionId || '').trim();
    if (!sessionId) {
      writes.push({
        pacienteId: patient.pacienteId,
        patientName: patient.name,
        sessionId: '',
        kind: input.target,
        previousText: '',
        nextText: '',
        action: 'skip-missing-target',
      });
      continue;
    }

    if (input.target === 'session') {
      const previous = String(patient.sessionTrainerNotes || '').trim();
      const composed = composeNoteText(previous, text, input.conflict);
      writes.push({
        pacienteId: patient.pacienteId,
        patientName: patient.name,
        sessionId,
        kind: 'session',
        previousText: previous,
        nextText: composed.nextText,
        action: composed.action === 'skip-missing-target' ? 'skip-missing-target' : composed.action,
      });
      continue;
    }

    const match = input.exerciseKey
      ? resolvePatientExercise(patient.exercises || [], input.exerciseKey)
      : null;
    const exerciseDocId = String(match?.id || '').trim();
    if (!match || !exerciseDocId) {
      writes.push({
        pacienteId: patient.pacienteId,
        patientName: patient.name,
        sessionId,
        kind: 'exercise',
        previousText: '',
        nextText: '',
        action: 'skip-missing-target',
        exerciseName: input.exerciseKey?.name,
      });
      continue;
    }
    const previous = String(match.trainerNote || '').trim();
    const composed = composeNoteText(previous, text, input.conflict);
    writes.push({
      pacienteId: patient.pacienteId,
      patientName: patient.name,
      sessionId,
      kind: 'exercise',
      exerciseDocId,
      exerciseName: match.name,
      previousText: previous,
      nextText: composed.nextText,
      action: composed.action === 'skip-missing-target' ? 'skip-missing-target' : composed.action,
    });
  }

  const alreadyHasCount = writes.filter((item) => item.previousText).length;
  const willChangeCount = writes.filter((item) => item.action === 'write').length;
  return {
    errors: [],
    writes,
    willChangeCount,
    alreadyHasCount,
    eligiblePatientCount: patients.length,
    exerciseLabel:
      input.target === 'exercise'
        ? writes.find((item) => item.exerciseName)?.exerciseName || input.exerciseKey?.name
        : undefined,
  };
}

export async function applyBulkWorkoutNotes(
  input: BulkNotePlanInput,
  writers: BulkNoteWriters
): Promise<BulkNoteResult> {
  const preview = previewBulkWorkoutNotes(input);
  if (preview.errors.length > 0) {
    return { ok: false, reports: [], savedCount: 0, errors: preview.errors };
  }

  const reports: BulkNotePatientReport[] = [];
  let savedCount = 0;

  for (const write of preview.writes) {
    if (write.action !== 'write') {
      reports.push({
        patientName: write.patientName,
        status: 'skipped',
      });
      continue;
    }
    try {
      if (write.kind === 'session') {
        await writers.updateSessionTrainerNotes(write.sessionId, write.nextText);
      } else {
        const exerciseDocId = String(write.exerciseDocId || '').trim();
        if (!exerciseDocId) {
          reports.push({
            patientName: write.patientName,
            status: 'failed',
            error: 'Exercício sem documento na sessão.',
          });
          continue;
        }
        await writers.updateExerciseTrainerNote(write.sessionId, exerciseDocId, write.nextText);
      }
      savedCount += 1;
      reports.push({ patientName: write.patientName, status: 'saved' });
    } catch (error) {
      reports.push({
        patientName: write.patientName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Falha ao salvar.',
      });
    }
  }

  const failed = reports.filter((item) => item.status === 'failed');
  return {
    ok: failed.length === 0 && savedCount > 0,
    reports,
    savedCount,
    errors: failed.map((item) => `${item.patientName}: ${item.error || 'falha'}`),
  };
}

export function formatBulkNoteReportLine(report: BulkNotePatientReport): string {
  if (report.status === 'saved') return `${report.patientName} — salvo`;
  if (report.status === 'skipped') return `${report.patientName} — ignorado`;
  return `${report.patientName} — falha${report.error ? ` (${report.error})` : ''}`;
}

export function coveredPatientsFromCard(card: PlannerBoardCard): PlannerCardPatient[] {
  return (card.patients || []).filter((item) => Boolean(item.sessionId));
}
