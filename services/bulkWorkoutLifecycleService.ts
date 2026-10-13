/**
 * Writers de ciclo de vida (ativo/inativo e exclusão). Reusa o serviço vivo.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import {
  applyBulkLifecycle,
  previewBulkLifecycle,
  type BulkLifecycleInput,
  type BulkLifecyclePreview,
  type BulkLifecycleResult,
  type BulkLifecycleWriters,
} from '@/lib/metapersonal/bulkWorkoutLifecycle';

function firestoreWriters(): BulkLifecycleWriters {
  return {
    getSession: (sessionId) => trainingSessionService.getSession(sessionId),
    listPatientSessions: (patientId, startDate, endDate) =>
      trainingSessionService.getPatientSessionsInDateRange(patientId, startDate, endDate),
    setSessionsActive: (sessionIds, active) =>
      trainingSessionService.setSessionsActive(sessionIds, active),
    deleteSession: (sessionId) => trainingSessionService.deleteSession(sessionId),
  };
}

export async function saveBulkWorkoutLifecycle(input: BulkLifecycleInput): Promise<BulkLifecycleResult> {
  return applyBulkLifecycle(input, firestoreWriters());
}

export async function previewBulkWorkoutLifecycle(
  input: BulkLifecycleInput
): Promise<BulkLifecyclePreview> {
  return previewBulkLifecycle(input, firestoreWriters());
}
