import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  rebuildEmailAutomationQueueForDoctor,
  rebuildEmailAutomationQueueForLead,
  rebuildEmailAutomationQueueForOrganization,
  type RebuildDoctorEmailQueueResult,
  type RebuildEmailQueueResult,
  type RebuildLeadEmailQueueResult,
} from '@/services/emailAutomationRebuildService';
import type {
  EmailAutomationRebuildJob,
  EmailAutomationRebuildJobResult,
  EmailAutomationRebuildJobScope,
  EmailAutomationRebuildJobStatus,
} from '@/types/emailAutomationRebuildJob';

const COLLECTION = 'email_automation_rebuild_jobs';

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

function docToJob(id: string, data: Record<string, unknown>): EmailAutomationRebuildJob {
  return {
    id,
    status: (data.status as EmailAutomationRebuildJobStatus) ?? 'queued',
    scope: (data.scope as EmailAutomationRebuildJobScope) ?? 'organization',
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : undefined,
    doctorId: typeof data.doctorId === 'string' ? data.doctorId : undefined,
    leadId: typeof data.leadId === 'string' ? data.leadId : undefined,
    requestedByUid: String(data.requestedByUid ?? ''),
    requestedByEmail: String(data.requestedByEmail ?? ''),
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    startedAt: toIso(data.startedAt),
    completedAt: toIso(data.completedAt),
    durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
    result: (data.result as EmailAutomationRebuildJobResult | undefined) ?? undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
  };
}

export type CreateEmailRebuildJobInput = {
  scope: EmailAutomationRebuildJobScope;
  organizationId?: string;
  doctorId?: string;
  leadId?: string;
  requestedByUid: string;
  requestedByEmail: string;
};

export async function createEmailAutomationRebuildJob(
  input: CreateEmailRebuildJobInput,
): Promise<EmailAutomationRebuildJob> {
  const id = randomUUID();
  const now = Timestamp.now();
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);

  const payload: Record<string, unknown> = {
    status: 'queued',
    scope: input.scope,
    requestedByUid: input.requestedByUid,
    requestedByEmail: input.requestedByEmail,
    createdAt: now,
    organizationId: input.organizationId ?? null,
    doctorId: input.doctorId ?? null,
    leadId: input.leadId ?? null,
  };

  await ref.set(payload);
  return docToJob(id, { ...payload, createdAt: now });
}

export async function getEmailAutomationRebuildJob(
  jobId: string,
): Promise<EmailAutomationRebuildJob | null> {
  const trimmed = jobId?.trim();
  if (!trimmed) return null;
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(trimmed).get();
  if (!snap.exists) return null;
  return docToJob(snap.id, snap.data() as Record<string, unknown>);
}

async function patchJob(
  jobId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await getFirestoreAdmin().collection(COLLECTION).doc(jobId).set(patch, { merge: true });
}

export async function executeEmailAutomationRebuildJob(jobId: string): Promise<void> {
  const job = await getEmailAutomationRebuildJob(jobId);
  if (!job) {
    console.error('[emailAutomationRebuildJob] job não encontrado', jobId);
    return;
  }
  if (job.status === 'completed' || job.status === 'failed') {
    return;
  }

  const start = Date.now();
  await patchJob(jobId, { status: 'running', startedAt: Timestamp.now() });

  try {
    let result: EmailAutomationRebuildJobResult;

    if (job.scope === 'lead') {
      if (!job.leadId) throw new Error('leadId ausente no job.');
      result = await rebuildEmailAutomationQueueForLead(job.leadId, job.organizationId);
    } else if (job.scope === 'doctor') {
      if (!job.doctorId) throw new Error('doctorId ausente no job.');
      result = await rebuildEmailAutomationQueueForDoctor(job.doctorId);
    } else {
      result = await rebuildEmailAutomationQueueForOrganization(job.organizationId);
    }

    const durationMs = Date.now() - start;
    await patchJob(jobId, {
      status: 'completed',
      completedAt: Timestamp.now(),
      durationMs,
      result,
      error: null,
    });
    console.info('[emailAutomationRebuildJob] concluído', { jobId, scope: job.scope, durationMs, result });
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Erro ao reconstruir fila de e-mails.';
    await patchJob(jobId, {
      status: 'failed',
      completedAt: Timestamp.now(),
      durationMs,
      error: message,
    });
    console.error('[emailAutomationRebuildJob] falhou', { jobId, scope: job.scope, durationMs, error: message });
  }
}

export function isOrganizationRebuildResult(
  result: EmailAutomationRebuildJobResult,
): result is RebuildEmailQueueResult {
  return 'leadsScanned' in result;
}
