/** Health do Automation Operations Center — reutilizável por canal. */
export type AutomationOpsHealth = 'healthy' | 'warning' | 'critical';

export type AutomationOpsAlert = {
  id: string;
  severity: AutomationOpsHealth;
  channel: 'email' | 'whatsapp' | 'platform';
  organizationId?: string;
  title: string;
  message: string;
  triggeredAt: string;
};

export type AutomationOpsQueueHealth = {
  status: AutomationOpsHealth;
  pending: number;
  dueNow: number;
  processing: number;
  rules: string[];
};

export type AutomationOpsSlaMetrics = {
  sampleSize: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  avgMs: number | null;
  maxMs: number | null;
};

export type AutomationOpsHourlyPoint = {
  hour: string;
  count: number;
};

export type AutomationOpsOrgRow = {
  organizationId: string;
  organizationName: string;
  engine: 'legacy' | 'shadow' | 'queue';
  pending: number;
  processing: number;
  failed: number;
  dueNow: number;
  throughputEmailsPerMinute: number | null;
  lastExecutionAt: string | null;
  circuitOpen: boolean;
  circuitReason?: string;
  queueHealth: AutomationOpsHealth;
};

export type AutomationOpsTimelineEvent = {
  id: string;
  at: string;
  channel: 'email' | 'whatsapp' | 'platform';
  type:
    | 'queue_started'
    | 'email_sent'
    | 'email_failed'
    | 'email_skipped'
    | 'circuit_breaker'
    | 'retry'
    | 'shadow_mismatch'
    | 'cron_run'
    | 'processing';
  title: string;
  subtitle?: string;
  organizationId?: string;
  automationExecutionId?: string;
  severity?: AutomationOpsHealth;
};

export type AutomationOpsExecutionDetail = {
  automationExecutionId: string;
  queueItem: Record<string, unknown> | null;
  ledgerEntries: Record<string, unknown>[];
  shadowEvents: Record<string, unknown>[];
  runMetrics: Record<string, unknown> | null;
  zepto: { messageId?: string; provedor?: string } | null;
};

export type AutomationOpsSearchResult = {
  kind: 'queue' | 'ledger' | 'shadow';
  id: string;
  at: string;
  summary: string;
  organizationId?: string;
  leadId?: string;
  doctorId?: string;
  email?: string;
  automationExecutionId?: string;
};

export type AutomationOpsDashboardDto = {
  generatedAt: string;
  health: AutomationOpsHealth;
  alerts: AutomationOpsAlert[];

  overview: {
    lastExecutionAt: string | null;
    avgDurationMs: number | null;
    maxDurationMs: number | null;
    cronActive: boolean;
    cronDelayMinutes: number | null;
    circuitBreakersOpen: number;
    organizationsQueue: number;
    organizationsLegacy: number;
    organizationsShadow: number;
  };

  email: {
    queueHealth: AutomationOpsQueueHealth;
    counts: {
      pending: number;
      processing: number;
      sent: number;
      failed: number;
      skipped: number;
      total: number;
    };
    dueNow: number;
    retries: { totalRetries: number; avgRetryCountFailed: number };
    oldestPendingAt: string | null;
    oldestProcessingAt: string | null;
    avgQueueAgeMinutes: number | null;
    maxQueueAgeMinutes: number | null;
    throughput: {
      emailsPerMinute: number | null;
      avgSendLatencyMs: number | null;
      maxSendLatencyMs: number | null;
      smtpErrors: number;
      lastRunAt: string | null;
    };
    firestore: {
      reads: number | null;
      writes: number | null;
      avgDurationMs: number | null;
      legacy: {
        reads: number | null;
        writes: number | null;
        durationMs: number | null;
      } | null;
      queue: {
        reads: number | null;
        writes: number | null;
        durationMs: number | null;
      } | null;
      estimatedReadsSaved: number | null;
      readsReductionPct: number | null;
    };
    sla: AutomationOpsSlaMetrics;
  };

  shadow: {
    enabled: boolean;
    matchRate: number;
    comparisons: number;
    lastMismatchAt: string | null;
    lastCriticalMismatchAt: string | null;
    consecutiveDaysWithoutCriticalMismatch: number;
    readyForCutover: boolean;
    operationalChecklist: Record<string, boolean>;
  };

  organizations: AutomationOpsOrgRow[];

  charts: {
    emailsSentByHour: AutomationOpsHourlyPoint[];
    pendingSnapshot: { at: string; pending: number; dueNow: number };
    firestoreReadsComparison: { legacy: number | null; queue: number | null };
    avgDurationComparison: { legacy: number | null; queue: number | null };
  };

  channels: {
    email: { active: true; label: string };
    whatsapp: { active: true; label: string; pending: number; dueNow: number };
    push: { active: false; label: string };
    sms: { active: false; label: string };
    ia: { active: false; label: string };
    webhooks: { active: false; label: string };
  };
};
