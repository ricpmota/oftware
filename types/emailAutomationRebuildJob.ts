import type {
  RebuildDoctorEmailQueueResult,
  RebuildEmailQueueResult,
  RebuildLeadEmailQueueResult,
} from '@/services/emailAutomationRebuildService';

export type EmailAutomationRebuildJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export type EmailAutomationRebuildJobScope = 'organization' | 'all' | 'doctor' | 'lead';

export type EmailAutomationRebuildJobResult =
  | RebuildEmailQueueResult
  | RebuildLeadEmailQueueResult
  | RebuildDoctorEmailQueueResult;

export type EmailAutomationRebuildJob = {
  id: string;
  status: EmailAutomationRebuildJobStatus;
  scope: EmailAutomationRebuildJobScope;
  organizationId?: string;
  doctorId?: string;
  leadId?: string;
  requestedByUid: string;
  requestedByEmail: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: EmailAutomationRebuildJobResult;
  error?: string;
};
