import type { CutoverPreflightCheck } from '@/services/emailAutomationCutoverPreflightService';
import type { EmailTransportHealth } from '@/lib/email/emailTransportHealth';

export type EmailCutoverSessionStatus =
  | 'VALIDATING_LEGACY'
  | 'READY_FOR_CUTOVER'
  | 'MONITORING_QUEUE'
  | 'ROLLED_BACK';

export type EmailCutoverTimelineEventType =
  | 'CUTOVER_PREPARATION_STARTED'
  | 'LEGACY_CYCLE_1_COMPLETED'
  | 'LEGACY_CYCLE_2_COMPLETED'
  | 'CUTOVER_READY'
  | 'ENGINE_CHANGED_TO_QUEUE'
  | 'QUEUE_CYCLE_1_COMPLETED'
  | 'QUEUE_CYCLE_2_COMPLETED'
  | 'CUTOVER_VALIDATED'
  | 'ROLLBACK_EXECUTED'
  | 'ISOLATION_FAILURE_DETECTED';

export type ExternalQueryInsightsSnapshot = {
  reads24h?: number;
  executions24h?: number;
  capturedAt: string;
  note?: string;
};

export type EmailCutoverCycleObservation = {
  cycleNumber: number;
  completedAt: string;
  organizationId: string;
  engine: string;
  status: string;
  durationMs: number;
  readsEstimated: number;
  writesEstimated: number;
  emailEnviosQueries: number;
  emailEnviosDocsLidos: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type EmailCutoverBaselineMetrics = {
  legacyReadsEstimated: number | null;
  legacyWritesEstimated: number | null;
  legacyDurationMs: number | null;
  emailEnviosQueries: number | null;
  emailEnviosDocsLidos: number | null;
  sent: number | null;
  failed: number | null;
  skipped: number | null;
  queuePending: number;
  queueDueNow: number;
};

export type EmailCutoverOrgIsolationRow = {
  organizationId: string;
  organizationName: string;
  engine: 'legacy' | 'shadow' | 'queue';
  lastCycleStatus: string | null;
  lastCycleAt: string | null;
  ok: boolean;
};

export type EmailCutoverAlert = {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
  recommendation?: string;
};

export type EmailCutoverComparison = {
  beforeLegacy: {
    readsPerRun: number | null;
    emailEnviosQueriesPerRun: number | null;
    emailEnviosDocsLidosPerRun: number | null;
    durationPerRun: number | null;
  };
  afterQueue: {
    readsPerRun: number | null;
    emailEnviosQueriesPerRun: number | null;
    emailEnviosDocsLidosPerRun: number | null;
    durationPerRun: number | null;
  };
  savings: {
    readsReduction: number | null;
    readsReductionPct: number | null;
    durationReductionMs: number | null;
    durationReductionPct: number | null;
  };
};

export type EmailCutoverSessionDto = {
  cutoverSessionId: string;
  organizationId: string;
  channel: 'email';
  status: EmailCutoverSessionStatus;
  fromEngine: 'legacy';
  toEngine: 'queue';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  promotedAt: string | null;
  rolledBackAt: string | null;
  rollbackReason: string | null;
  legacyCycles: EmailCutoverCycleObservation[];
  queueCycles: EmailCutoverCycleObservation[];
  preflightChecks: CutoverPreflightCheck[];
  extendedChecks: CutoverPreflightCheck[];
  snapshotId: string | null;
  baseline: EmailCutoverBaselineMetrics | null;
  externalQueryInsightsBaseline: ExternalQueryInsightsSnapshot | null;
  externalQueryInsights30m: ExternalQueryInsightsSnapshot | null;
  externalQueryInsights60m: ExternalQueryInsightsSnapshot | null;
  isolationRows: EmailCutoverOrgIsolationRow[];
  alerts: EmailCutoverAlert[];
  comparison: EmailCutoverComparison | null;
  isolationFailure: boolean;
};

export type EmailCutoverOrgStatusDto = {
  organizationId: string;
  organizationName: string;
  engine: 'legacy' | 'shadow' | 'queue';
  queuePopulated: boolean;
  pending: number;
  dueNow: number;
  processing: number;
  failed: number;
  circuitOpen: boolean;
  lastCronAt: string | null;
  lastProcessingAt: string | null;
  transportHealth: EmailTransportHealth;
  preflightOk: boolean;
  preflightChecks: CutoverPreflightCheck[];
};

export type EmailCutoverControlDto = {
  generatedAt: string;
  targetOrganizationId: string;
  clinicaOrganizationId: string;
  session: EmailCutoverSessionDto | null;
  organizations: EmailCutoverOrgStatusDto[];
  timeline: Array<{
    id: string;
    type: EmailCutoverTimelineEventType;
    at: string;
    title: string;
    detail?: string;
  }>;
  canPrepare: boolean;
  canPromote: boolean;
  canRollback: boolean;
};

export const EMAIL_CUTOVER_ROLLBACK_REASONS = [
  'fila_acumulando',
  'falha_envio',
  'duplicidade',
  'circuit_breaker',
  'isolamento_multi_org',
  'outro',
] as const;

export type EmailCutoverRollbackReason = (typeof EMAIL_CUTOVER_ROLLBACK_REASONS)[number];
