/**
 * Ativar/desativar e apagar treinos na Central.
 * Reusa `active` + `setSessionsActive` + `deleteSession` do contrato vivo.
 * Na Central NÃO toca passado nem status === 'done' (o switch de Treinos Salvos no /meta
 * ainda aplica o grupo inteiro, inclusive histórico).
 */

import { coveredPatientsFromCard } from '@/lib/metapersonal/bulkWorkoutNotes';
import { bulkEditQueryEndDate } from '@/lib/metapersonal/bulkWorkoutEdit';
import type { PlannerBoardCard, PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import type { TrainingSession } from '@/types/trainingSession';

export type LifecycleAction = 'activate' | 'deactivate' | 'delete';
export type LifecycleTemporalScope = 'this' | 'this-and-future' | 'series-future';

export type BulkLifecycleInput = {
  source: PlannerBoardCard['source'];
  action: LifecycleAction;
  temporalScope: LifecycleTemporalScope;
  availablePatients: PlannerCardPatient[];
  patientIds: string[];
  lockedPatientId?: string;
  today: string;
};

export type BulkLifecyclePatientReport = {
  patientName: string;
  status: 'saved' | 'skipped' | 'failed';
  sessionsTouched: number;
  error?: string;
};

export type BulkLifecycleResult = {
  ok: boolean;
  reports: BulkLifecyclePatientReport[];
  savedCount: number;
  sessionCount: number;
  errors: string[];
};

export type BulkLifecyclePreview = {
  errors: string[];
  patientCount: number;
  sessionCount: number;
  avulsaHint: boolean;
  temporalLabel: string;
};

export type BulkLifecycleWriters = {
  getSession: (sessionId: string) => Promise<TrainingSession | null>;
  listPatientSessions: (
    patientId: string,
    startDate: string,
    endDate: string
  ) => Promise<TrainingSession[]>;
  setSessionsActive: (sessionIds: string[], active: boolean) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
};

export function isSessionLifecycleMutable(
  session: Pick<TrainingSession, 'scheduledDate' | 'status'>,
  today: string
): boolean {
  if (session.scheduledDate < today) return false;
  if (session.status === 'done') return false;
  return true;
}

export function temporalScopeLabel(scope: LifecycleTemporalScope): string {
  if (scope === 'this') return 'Somente esta ocorrência';
  if (scope === 'this-and-future') return 'Esta e próximas';
  return 'Toda a série futura';
}

export function selectLifecycleTargetSessions(
  current: TrainingSession,
  siblings: TrainingSession[],
  temporalScope: LifecycleTemporalScope,
  today: string
): TrainingSession[] {
  const byId = new Map<string, TrainingSession>();
  for (const item of [current, ...siblings]) {
    if (item.id) byId.set(item.id, item);
  }
  const all = Array.from(byId.values());
  const groupId = String(current.recurrenceGroupId || '').trim();

  if (temporalScope === 'this' || !groupId) {
    return isSessionLifecycleMutable(current, today) ? [current] : [];
  }

  const minDate = temporalScope === 'series-future' ? today : current.scheduledDate;
  return all
    .filter((item) => {
      if (String(item.recurrenceGroupId || '').trim() !== groupId) return false;
      if (item.scheduledDate < minDate) return false;
      return isSessionLifecycleMutable(item, today);
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

function selectedPatients(input: BulkLifecycleInput): PlannerCardPatient[] {
  const availableIds = new Set(input.availablePatients.map((item) => item.pacienteId));
  const requested = input.lockedPatientId
    ? [input.lockedPatientId]
    : [...new Set(input.patientIds.filter(Boolean))];
  return requested
    .filter((id) => availableIds.has(id))
    .map((id) => input.availablePatients.find((item) => item.pacienteId === id))
    .filter((item): item is PlannerCardPatient => Boolean(item));
}

export function validateBulkLifecycle(input: BulkLifecycleInput): string[] {
  const errors: string[] = [];
  if (input.source !== 'existing') {
    errors.push('Publique o planejamento antes de alterar o status do treino.');
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
  return errors;
}

async function resolvePatientTargets(
  patient: PlannerCardPatient,
  input: BulkLifecycleInput,
  writers: BulkLifecycleWriters
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
    input.temporalScope !== 'this' && patientId && !avulsa
      ? await writers.listPatientSessions(patientId, input.today, endDate)
      : [];
  const sessions = selectLifecycleTargetSessions(current, siblings, input.temporalScope, input.today);
  if (sessions.length === 0) {
    return {
      sessions: [],
      avulsa,
      error: 'Nenhuma ocorrência futura/agendada no escopo. Passado e concluído ficam intactos.',
    };
  }
  return { sessions, avulsa };
}

export async function previewBulkLifecycle(
  input: BulkLifecycleInput,
  writers: BulkLifecycleWriters
): Promise<BulkLifecyclePreview> {
  const errors = validateBulkLifecycle(input);
  const patients = selectedPatients(input);
  let sessionCount = 0;
  let avulsaHint = false;
  if (errors.length === 0) {
    for (const patient of patients) {
      const resolved = await resolvePatientTargets(patient, input, writers);
      if (resolved.avulsa && input.temporalScope !== 'this') avulsaHint = true;
      if (resolved.error) continue;
      sessionCount += resolved.sessions.length;
    }
    if (sessionCount === 0) {
      errors.push('Nenhuma sessão futura/agendada no escopo. Passado e concluído não são alterados.');
    }
  }
  return {
    errors,
    patientCount: patients.length,
    sessionCount,
    avulsaHint,
    temporalLabel: temporalScopeLabel(input.temporalScope),
  };
}

export async function applyBulkLifecycle(
  input: BulkLifecycleInput,
  writers: BulkLifecycleWriters
): Promise<BulkLifecycleResult> {
  const errors = validateBulkLifecycle(input);
  if (errors.length > 0) {
    return { ok: false, reports: [], savedCount: 0, sessionCount: 0, errors };
  }

  const patients = selectedPatients(input);
  const reports: BulkLifecyclePatientReport[] = [];
  let sessionCount = 0;
  const nextActive = input.action === 'activate';

  for (const patient of patients) {
    try {
      const resolved = await resolvePatientTargets(patient, input, writers);
      if (resolved.error || resolved.sessions.length === 0) {
        reports.push({
          patientName: patient.name,
          status: 'skipped',
          sessionsTouched: 0,
          error: resolved.error,
        });
        continue;
      }
      const ids = resolved.sessions.map((item) => String(item.id || '').trim()).filter(Boolean);
      if (input.action === 'delete') {
        for (const id of ids) {
          await writers.deleteSession(id);
        }
      } else {
        await writers.setSessionsActive(ids, nextActive);
      }
      sessionCount += ids.length;
      reports.push({
        patientName: patient.name,
        status: 'saved',
        sessionsTouched: ids.length,
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

export function formatLifecycleReportLine(report: BulkLifecyclePatientReport): string {
  if (report.status === 'saved') {
    return `${report.patientName} — ${report.sessionsTouched} ${
      report.sessionsTouched === 1 ? 'sessão' : 'sessões'
    }`;
  }
  if (report.status === 'skipped') {
    return `${report.patientName} — ignorado${report.error ? ` (${report.error})` : ''}`;
  }
  return `${report.patientName} — falha${report.error ? ` (${report.error})` : ''}`;
}

export function someLifecyclePatientsAreAvulsa(patients: PlannerCardPatient[]): boolean {
  return patients.some((item) => !String(item.recurrenceGroupId || '').trim());
}

export function lifecyclePatientsFromCard(card: PlannerBoardCard): PlannerCardPatient[] {
  return coveredPatientsFromCard(card);
}

export function isPatientSessionActive(patient: PlannerCardPatient): boolean {
  return patient.active !== false;
}
