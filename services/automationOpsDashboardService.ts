import { listAllOrganizationCircuitBreakers } from '@/lib/automation/circuitBreaker';
import {
  deriveCronHealth,
  deriveQueueHealth,
  mergeHealth,
  OPS_SHADOW_MATCH_WARNING,
} from '@/lib/automation/opsHealthRules';
import { getLegacyVsQueueComparison, listLatestAutomationRunMetrics } from '@/lib/automation/executionMetrics';
import { getOrganizationById, listOrganizations } from '@/lib/organization/organizationRegistry';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import {
  getEmailQueueDepthMetrics,
  getEmailQueueSlaMetrics,
  getEmailsSentByHourLast24h,
} from '@/services/automationOpsEmailMetricsService';
import { stats as getEmailQueueStats } from '@/services/emailAutomationQueueService';
import {
  getEmailAutomationEngineSetting,
  listEmailAutomationEngineSettings,
} from '@/services/emailAutomationEngineService';
import { getEmailQueueShadowStats } from '@/services/emailQueueShadowValidationService';
import { getWhatsappAutomationQueueStats } from '@/services/whatsappAutomationQueueService';
import { getWhatsappCronHeartbeat } from '@/services/whatsappCronHeartbeatService';
import type {
  AutomationOpsAlert,
  AutomationOpsDashboardDto,
  AutomationOpsOrgRow,
} from '@/types/automationOps';

const CUTOVER_MIN_COMPARISONS = 500;
const CUTOVER_MIN_MATCH_RATE = 99.9;

function orgName(orgId: string): string {
  return getOrganizationById(orgId as never)?.name ?? orgId;
}

function resolveOrganizationIds(requested?: string[]): string[] {
  if (requested && requested.length > 0) return requested;
  const fromRegistry = listOrganizations().map((o) => o.id);
  const fromEngines = new Set<string>();
  return [...new Set([...fromRegistry, getDefaultOrganizationId(), ...fromEngines])];
}

export async function getAutomationOpsDashboard(options?: {
  organizationIds?: string[];
}): Promise<AutomationOpsDashboardDto> {
  const now = new Date();
  const orgIds = resolveOrganizationIds(options?.organizationIds);

  const [
    shadow,
    engineSettings,
    circuits,
    allRunMetrics,
    whatsappQueue,
    whatsappHeartbeat,
    emailsByHour,
    globalQueueStats,
    globalDepth,
    globalSla,
  ] = await Promise.all([
    getEmailQueueShadowStats(),
    listEmailAutomationEngineSettings(),
    listAllOrganizationCircuitBreakers(),
    listLatestAutomationRunMetrics(),
    getWhatsappAutomationQueueStats(now),
    getWhatsappCronHeartbeat(),
    getEmailsSentByHourLast24h(),
    getEmailQueueStats(now),
    getEmailQueueDepthMetrics(),
    getEmailQueueSlaMetrics(),
  ]);

  const engineByOrg = new Map(engineSettings.map((s) => [s.organizationId, s.engine]));
  for (const org of listOrganizations()) {
    if (!engineByOrg.has(org.id)) engineByOrg.set(org.id, 'legacy');
  }

  const organizationsQueue = [...engineByOrg.values()].filter((e) => e === 'queue').length;
  const organizationsLegacy = [...engineByOrg.values()].filter((e) => e === 'legacy').length;
  const organizationsShadow = [...engineByOrg.values()].filter((e) => e === 'shadow').length;

  const defaultOrg = getDefaultOrganizationId();
  const defaultComparison = await getLegacyVsQueueComparison(defaultOrg);
  const defaultEngine = await getEmailAutomationEngineSetting(defaultOrg);

  const emailRunMetrics = allRunMetrics.filter((m) => m.channel === 'email' || m.channel === 'email_legacy');
  void emailRunMetrics;
  const lastQueueRun = allRunMetrics.find((m) => m.channel === 'email' && m.organizationId === defaultOrg);
  const lastLegacyRun = allRunMetrics.find(
    (m) => m.channel === 'email_legacy' && m.organizationId === defaultOrg,
  );

  const lastExecutionCandidates = [
    lastQueueRun?.finishedAt,
    lastLegacyRun?.finishedAt,
    whatsappHeartbeat?.ranAt.toISOString(),
  ].filter(Boolean) as string[];
  lastExecutionCandidates.sort();
  const lastExecutionAt = lastExecutionCandidates.at(-1) ?? null;

  const cronDelayMinutes =
    lastQueueRun || lastLegacyRun ?
      Math.round(
        (now.getTime() -
          new Date((lastQueueRun ?? lastLegacyRun)!.finishedAt).getTime()) /
          60_000,
      )
    : null;

  const cronHealth = deriveCronHealth(cronDelayMinutes);
  const queueHealth = deriveQueueHealth({
    pending: globalQueueStats.counts.pending,
    dueNow: globalQueueStats.dueNow,
    processing: globalQueueStats.counts.processing,
    oldestProcessingAgeMs: globalDepth.oldestProcessingAgeMs,
    avgRetryCountFailed: globalQueueStats.avgRetryCountFailed,
  });

  const circuitsOpen = circuits.filter((c) => c.open);
  const alerts: AutomationOpsAlert[] = [];

  if (circuitsOpen.length > 0) {
    for (const c of circuitsOpen) {
      alerts.push({
        id: `circuit-${c.organizationId}`,
        severity: 'critical',
        channel: 'email',
        organizationId: c.organizationId,
        title: 'Circuit Breaker acionado',
        message: c.reason ?? 'Organização pausada por falhas consecutivas.',
        triggeredAt: c.openedAt ?? now.toISOString(),
      });
    }
  }

  if (queueHealth.status !== 'healthy') {
    alerts.push({
      id: 'queue-health',
      severity: queueHealth.status,
      channel: 'email',
      title: queueHealth.status === 'critical' ? 'Fila acumulando (Critical)' : 'Fila elevada (Warning)',
      message: queueHealth.rules.join(' · '),
      triggeredAt: now.toISOString(),
    });
  }

  if (cronHealth !== 'healthy') {
    alerts.push({
      id: 'cron-delay',
      severity: cronHealth,
      channel: 'platform',
      title: 'Cron de e-mail atrasado',
      message: `Última execução há ${cronDelayMinutes ?? '?'} min (esperado ≤15 min).`,
      triggeredAt: now.toISOString(),
    });
  }

  if (shadow.enabled && shadow.aggregate.matchRate < OPS_SHADOW_MATCH_WARNING) {
    alerts.push({
      id: 'shadow-match',
      severity: 'warning',
      channel: 'email',
      title: 'Match Rate shadow caiu',
      message: `Match rate ${shadow.aggregate.matchRate}% (meta ≥ ${OPS_SHADOW_MATCH_WARNING}%).`,
      triggeredAt: shadow.aggregate.lastUpdatedAt,
    });
  }

  if (globalQueueStats.dueNow >= 10 && organizationsQueue > 0) {
    alerts.push({
      id: 'due-now',
      severity: globalQueueStats.dueNow >= 50 ? 'warning' : 'healthy',
      channel: 'email',
      title: 'Itens vencidos na fila',
      message: `${globalQueueStats.dueNow} item(ns) com scheduledFor ≤ agora.`,
      triggeredAt: now.toISOString(),
    });
  }

  const operationalChecklist = {
    matchRateAtLeast999: shadow.aggregate.matchRate >= CUTOVER_MIN_MATCH_RATE,
    comparisonsAtLeast500: shadow.aggregate.totalComparisons >= CUTOVER_MIN_COMPARISONS,
    zeroCriticalMismatchLast72h: shadow.criticalMismatchesInLast72h === 0,
    shadowValidationEnabled: shadow.enabled,
    rebuildQueuePopulated: globalQueueStats.counts.total > 0,
    engineIsLegacy: defaultEngine.engine === 'legacy',
    statisticsConsistent: true,
  };

  const orgRows: AutomationOpsOrgRow[] = await Promise.all(
    orgIds.map(async (orgId) => {
      const [orgStats, orgComparison, circuit] = await Promise.all([
        getEmailQueueStats(now, orgId),
        getLegacyVsQueueComparison(orgId),
        Promise.resolve(circuits.find((c) => c.organizationId === orgId)),
      ]);

      const orgDepth = await getEmailQueueDepthMetrics(orgId);
      const orgQueueHealth = deriveQueueHealth({
        pending: orgStats.counts.pending,
        dueNow: orgStats.dueNow,
        processing: orgStats.counts.processing,
        oldestProcessingAgeMs: orgDepth.oldestProcessingAgeMs,
        avgRetryCountFailed: orgStats.avgRetryCountFailed,
      });

      const throughput =
        orgComparison.queue?.emailsPerMinute ?? orgComparison.legacy?.emailsPerMinute ?? null;
      const lastRun = orgComparison.queue ?? orgComparison.legacy;

      return {
        organizationId: orgId,
        organizationName: orgName(orgId),
        engine: engineByOrg.get(orgId) ?? 'legacy',
        pending: orgStats.counts.pending,
        processing: orgStats.counts.processing,
        failed: orgStats.counts.failed,
        dueNow: orgStats.dueNow,
        throughputEmailsPerMinute: throughput,
        lastExecutionAt: lastRun?.finishedAt ?? null,
        circuitOpen: circuit?.open === true,
        circuitReason: circuit?.reason,
        queueHealth: orgQueueHealth.status,
      };
    }),
  );

  const health = mergeHealth(
    queueHealth.status,
    cronHealth,
    circuitsOpen.length > 0 ? 'critical' : 'healthy',
    shadow.enabled && shadow.aggregate.matchRate < OPS_SHADOW_MATCH_WARNING ? 'warning' : 'healthy',
    ...alerts.filter((a) => a.severity !== 'healthy').map((a) => a.severity),
  );

  const estimatedReadsSaved =
    defaultComparison.legacy && defaultComparison.queue ?
      Math.max(0, defaultComparison.legacy.firestoreReads - defaultComparison.queue.firestoreReads)
    : null;

  const readsReductionPct =
    defaultComparison.legacy && defaultComparison.queue && defaultComparison.legacy.firestoreReads > 0 ?
      Math.round(
        ((defaultComparison.legacy.firestoreReads - defaultComparison.queue.firestoreReads) /
          defaultComparison.legacy.firestoreReads) *
          100,
      )
    : null;

  return {
    generatedAt: now.toISOString(),
    health,
    alerts: alerts.filter((a) => a.severity !== 'healthy'),

    overview: {
      lastExecutionAt,
      avgDurationMs:
        lastQueueRun?.durationMs ?? lastLegacyRun?.durationMs ?? null,
      maxDurationMs: Math.max(lastQueueRun?.durationMs ?? 0, lastLegacyRun?.durationMs ?? 0) || null,
      cronActive: cronHealth === 'healthy',
      cronDelayMinutes,
      circuitBreakersOpen: circuitsOpen.length,
      organizationsQueue,
      organizationsLegacy,
      organizationsShadow,
    },

    email: {
      queueHealth,
      counts: globalQueueStats.counts,
      dueNow: globalQueueStats.dueNow,
      retries: {
        totalRetries: globalQueueStats.totalRetries,
        avgRetryCountFailed: globalQueueStats.avgRetryCountFailed,
      },
      oldestPendingAt: globalDepth.oldestPendingAt?.toISOString() ?? null,
      oldestProcessingAt: globalDepth.oldestProcessingAt?.toISOString() ?? null,
      avgQueueAgeMinutes: globalDepth.avgQueueAgeMinutes,
      maxQueueAgeMinutes: globalDepth.maxQueueAgeMinutes,
      throughput: {
        emailsPerMinute: lastQueueRun?.emailsPerMinute ?? lastLegacyRun?.emailsPerMinute ?? null,
        avgSendLatencyMs: lastQueueRun?.avgSendLatencyMs ?? null,
        maxSendLatencyMs: lastQueueRun?.maxSendLatencyMs ?? null,
        smtpErrors: lastQueueRun?.smtpErrors ?? lastLegacyRun?.smtpErrors ?? 0,
        lastRunAt: lastQueueRun?.finishedAt ?? lastLegacyRun?.finishedAt ?? null,
      },
      firestore: {
        reads: lastQueueRun?.firestoreReads ?? lastLegacyRun?.firestoreReads ?? null,
        writes: lastQueueRun?.firestoreWrites ?? lastLegacyRun?.firestoreWrites ?? null,
        avgDurationMs: lastQueueRun?.durationMs ?? lastLegacyRun?.durationMs ?? null,
        legacy: defaultComparison.legacy ?
          {
            reads: defaultComparison.legacy.firestoreReads,
            writes: defaultComparison.legacy.firestoreWrites,
            durationMs: defaultComparison.legacy.durationMs,
          }
        : null,
        queue: defaultComparison.queue ?
          {
            reads: defaultComparison.queue.firestoreReads,
            writes: defaultComparison.queue.firestoreWrites,
            durationMs: defaultComparison.queue.durationMs,
          }
        : null,
        estimatedReadsSaved,
        readsReductionPct,
      },
      sla: globalSla,
    },

    shadow: {
      enabled: shadow.enabled,
      matchRate: shadow.aggregate.matchRate,
      comparisons: shadow.aggregate.totalComparisons,
      lastMismatchAt: shadow.lastMismatchAt ?? shadow.aggregate.lastMismatchAt ?? null,
      lastCriticalMismatchAt:
        shadow.lastCriticalMismatchAt ?? shadow.aggregate.lastCriticalMismatchAt ?? null,
      consecutiveDaysWithoutCriticalMismatch: shadow.consecutiveDaysWithoutCriticalMismatch,
      readyForCutover: Object.values(operationalChecklist).every(Boolean),
      operationalChecklist,
    },

    organizations: orgRows,

    charts: {
      emailsSentByHour: emailsByHour,
      pendingSnapshot: {
        at: now.toISOString(),
        pending: globalQueueStats.counts.pending,
        dueNow: globalQueueStats.dueNow,
      },
      firestoreReadsComparison: {
        legacy: defaultComparison.legacy?.firestoreReads ?? null,
        queue: defaultComparison.queue?.firestoreReads ?? null,
      },
      avgDurationComparison: {
        legacy: defaultComparison.legacy?.durationMs ?? null,
        queue: defaultComparison.queue?.durationMs ?? null,
      },
    },

    channels: {
      email: { active: true, label: 'E-mail' },
      whatsapp: {
        active: true,
        label: 'WhatsApp',
        pending: whatsappQueue.counts.pending,
        dueNow: whatsappQueue.dueNow,
      },
      push: { active: false, label: 'Push' },
      sms: { active: false, label: 'SMS' },
      ia: { active: false, label: 'IA' },
      webhooks: { active: false, label: 'Webhooks' },
    },
  };
}

// Re-export para consumo futuro
export type { AutomationOpsHealth } from '@/types/automationOps';
