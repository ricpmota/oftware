import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { isOrganizationCircuitOpen } from '@/lib/automation/circuitBreaker';
import { getLatestAutomationRunMetrics, listLatestAutomationRunMetrics } from '@/lib/automation/executionMetrics';
import { getEmailTransportHealth } from '@/lib/email/emailTransportHealth';
import { listEmailAutomationOrganizations } from '@/lib/email/emailAutomationOrganizations';
import { getOrganizationById } from '@/lib/organization/organizationRegistry';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  getEmailAutomationEngine,
  getEmailAutomationEngineSetting,
  setEmailAutomationEngine,
} from '@/services/emailAutomationEngineService';
import {
  validateQueueEngineCutover,
  type CutoverPreflightCheck,
} from '@/services/emailAutomationCutoverPreflightService';
import { stats as getEmailQueueStats } from '@/services/emailAutomationQueueService';
import type { CronOrganizationEmailResult } from '@/services/sendAutomaticEmailsCronService';
import type {
  EmailCutoverAlert,
  EmailCutoverBaselineMetrics,
  EmailCutoverComparison,
  EmailCutoverControlDto,
  EmailCutoverCycleObservation,
  EmailCutoverOrgIsolationRow,
  EmailCutoverOrgStatusDto,
  EmailCutoverRollbackReason,
  EmailCutoverSessionDto,
  EmailCutoverSessionStatus,
  EmailCutoverTimelineEventType,
  ExternalQueryInsightsSnapshot,
} from '@/types/emailCutoverControl';

const SESSIONS = 'automation_cutover_sessions';
const SNAPSHOTS = 'automation_cutover_snapshots';
const TIMELINE = 'automation_cutover_timeline';
const AUDIT = 'automation_engine_cutover_audit';

export const EMAIL_CUTOVER_TARGET_ORG = 'metodo';
export const EMAIL_CUTOVER_CLINICA_ORG = 'clinica_exemplo_wl';

function sessionDocId(organizationId: string): string {
  return `email_${organizationId}`;
}

function orgName(orgId: string): string {
  return getOrganizationById(orgId as never)?.name ?? orgId;
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function avg(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function pctReduction(before: number | null, after: number | null): number | null {
  if (before == null || after == null || before <= 0) return null;
  return Math.round(((before - after) / before) * 100);
}

type SessionDoc = {
  cutoverSessionId: string;
  organizationId: string;
  channel: 'email';
  status: EmailCutoverSessionStatus;
  fromEngine: 'legacy';
  toEngine: 'queue';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  promotedAt?: string | null;
  rolledBackAt?: string | null;
  rollbackReason?: string | null;
  legacyCycles?: EmailCutoverCycleObservation[];
  queueCycles?: EmailCutoverCycleObservation[];
  preflightChecks?: CutoverPreflightCheck[];
  extendedChecks?: CutoverPreflightCheck[];
  snapshotId?: string | null;
  baseline?: EmailCutoverBaselineMetrics | null;
  externalQueryInsightsBaseline?: ExternalQueryInsightsSnapshot | null;
  externalQueryInsights30m?: ExternalQueryInsightsSnapshot | null;
  externalQueryInsights60m?: ExternalQueryInsightsSnapshot | null;
  isolationFailure?: boolean;
  lastIsolationCheckAt?: string | null;
};

async function appendTimelineEvent(params: {
  cutoverSessionId: string;
  organizationId: string;
  type: EmailCutoverTimelineEventType;
  title: string;
  detail?: string;
}): Promise<void> {
  await getFirestoreAdmin()
    .collection(TIMELINE)
    .add({
      cutoverSessionId: params.cutoverSessionId,
      organizationId: params.organizationId,
      channel: 'email',
      type: params.type,
      title: params.title,
      detail: params.detail ?? null,
      at: FieldValue.serverTimestamp(),
    });
}

async function recordEngineAudit(params: {
  organizationId: string;
  fromEngine: string;
  toEngine: string;
  changedBy: string;
  reason: string;
  cutoverSessionId?: string | null;
}): Promise<void> {
  await getFirestoreAdmin()
    .collection(AUDIT)
    .add({
      organizationId: params.organizationId,
      channel: 'email',
      fromEngine: params.fromEngine,
      toEngine: params.toEngine,
      changedAt: FieldValue.serverTimestamp(),
      changedBy: params.changedBy,
      reason: params.reason,
      cutoverSessionId: params.cutoverSessionId ?? null,
    });
}

export async function buildExtendedCutoverChecks(organizationId: string): Promise<CutoverPreflightCheck[]> {
  const checks: CutoverPreflightCheck[] = [];
  const now = new Date();

  checks.push({
    id: 'multi_org_isolation',
    ok: true,
    detail: 'Processamento isolado por organização (ETAPA 2.0.1).',
  });

  const clinicaEngine = await getEmailAutomationEngine(EMAIL_CUTOVER_CLINICA_ORG);
  const clinicaLegacy = clinicaEngine === 'legacy';
  checks.push({
    id: 'clinica_remains_legacy',
    ok: clinicaLegacy,
    detail: clinicaLegacy
      ? `${orgName(EMAIL_CUTOVER_CLINICA_ORG)} permanecerá em legacy.`
      : `${orgName(EMAIL_CUTOVER_CLINICA_ORG)} não está em legacy (${clinicaEngine}).`,
  });

  const metrics = await listLatestAutomationRunMetrics();
  const lastCron = metrics
    .filter((m) => m.channel === 'email' || m.channel === 'email_legacy')
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
  const cronDelayMin =
    lastCron ? Math.round((now.getTime() - new Date(lastCron.finishedAt).getTime()) / 60_000) : null;
  const cronActive = cronDelayMin != null && cronDelayMin <= 20;
  checks.push({
    id: 'cron_active',
    ok: cronActive,
    detail: cronActive
      ? `Último ciclo há ${cronDelayMin} min.`
      : lastCron
        ? `Último ciclo há ${cronDelayMin} min (esperado ≤20 min).`
        : 'Nenhuma métrica de cron encontrada.',
  });

  const queueStats = await getEmailQueueStats(now, organizationId);
  const failedOk = queueStats.counts.failed === 0;
  checks.push({
    id: 'failed_acceptable',
    ok: failedOk,
    detail: failedOk
      ? 'Nenhum item failed na fila.'
      : `${queueStats.counts.failed} item(ns) failed na fila.`,
  });

  checks.push({
    id: 'queue_index',
    ok: true,
    detail: 'Estatísticas da fila respondem — índice operacional.',
  });

  checks.push({
    id: 'rollback_available',
    ok: true,
    detail: 'Rollback via set-engine → legacy sem deploy.',
  });

  return checks;
}

function isCriticalPreflightFailure(checks: CutoverPreflightCheck[]): boolean {
  const criticalIds = new Set([
    'queue_populated',
    'processing_clear',
    'circuit_breaker',
    'transport_health',
    'clinica_remains_legacy',
    'cron_active',
    'failed_acceptable',
  ]);
  return checks.some((c) => criticalIds.has(c.id) && !c.ok);
}

async function captureBaselineMetrics(organizationId: string): Promise<EmailCutoverBaselineMetrics> {
  const now = new Date();
  const [legacyMetrics, queueStats] = await Promise.all([
    getLatestAutomationRunMetrics({ channel: 'email_legacy', organizationId }),
    getEmailQueueStats(now, organizationId),
  ]);

  return {
    legacyReadsEstimated: legacyMetrics?.firestoreReads ?? null,
    legacyWritesEstimated: legacyMetrics?.firestoreWrites ?? null,
    legacyDurationMs: legacyMetrics?.durationMs ?? null,
    emailEnviosQueries: null,
    emailEnviosDocsLidos: null,
    sent: legacyMetrics?.sent ?? null,
    failed: legacyMetrics?.failed ?? null,
    skipped: legacyMetrics?.skipped ?? null,
    queuePending: queueStats.counts.pending,
    queueDueNow: queueStats.dueNow,
  };
}

function mapCycle(
  cycleNumber: number,
  org: CronOrganizationEmailResult,
  completedAt: string,
): EmailCutoverCycleObservation {
  return {
    cycleNumber,
    completedAt,
    organizationId: org.organizationId,
    engine: org.engine,
    status: org.status,
    durationMs: org.durationMs,
    readsEstimated: org.readsEstimated,
    writesEstimated: org.writesEstimated,
    emailEnviosQueries: org.emailEnviosQueries ?? 0,
    emailEnviosDocsLidos: org.emailEnviosDocsLidos ?? 0,
    sent: org.sent,
    failed: org.failed,
    skipped: org.skipped,
  };
}

function buildComparison(
  baseline: EmailCutoverBaselineMetrics | null,
  legacyCycles: EmailCutoverCycleObservation[],
  queueCycles: EmailCutoverCycleObservation[],
): EmailCutoverComparison | null {
  const legacySource = legacyCycles.length > 0 ? legacyCycles : null;
  const beforeReads =
    legacySource ? avg(legacySource.map((c) => c.readsEstimated)) : baseline?.legacyReadsEstimated ?? null;
  const beforeQueries =
    legacySource ? avg(legacySource.map((c) => c.emailEnviosQueries)) : baseline?.emailEnviosQueries ?? null;
  const beforeDocs =
    legacySource
      ? avg(legacySource.map((c) => c.emailEnviosDocsLidos))
      : baseline?.emailEnviosDocsLidos ?? null;
  const beforeDuration =
    legacySource ? avg(legacySource.map((c) => c.durationMs)) : baseline?.legacyDurationMs ?? null;

  const afterReads = avg(queueCycles.map((c) => c.readsEstimated));
  const afterQueries = avg(queueCycles.map((c) => c.emailEnviosQueries));
  const afterDocs = avg(queueCycles.map((c) => c.emailEnviosDocsLidos));
  const afterDuration = avg(queueCycles.map((c) => c.durationMs));

  if (beforeReads == null && afterReads == null) return null;

  const readsReduction =
    beforeReads != null && afterReads != null ? Math.max(0, beforeReads - afterReads) : null;

  return {
    beforeLegacy: {
      readsPerRun: beforeReads,
      emailEnviosQueriesPerRun: beforeQueries,
      emailEnviosDocsLidosPerRun: beforeDocs,
      durationPerRun: beforeDuration,
    },
    afterQueue: {
      readsPerRun: afterReads,
      emailEnviosQueriesPerRun: afterQueries,
      emailEnviosDocsLidosPerRun: afterDocs,
      durationPerRun: afterDuration,
    },
    savings: {
      readsReduction,
      readsReductionPct: pctReduction(beforeReads, afterReads),
      durationReductionMs:
        beforeDuration != null && afterDuration != null
          ? Math.max(0, beforeDuration - afterDuration)
          : null,
      durationReductionPct: pctReduction(beforeDuration, afterDuration),
    },
  };
}

function buildAlerts(params: {
  session: SessionDoc | null;
  orgStatuses: EmailCutoverOrgStatusDto[];
  isolationRows: EmailCutoverOrgIsolationRow[];
}): EmailCutoverAlert[] {
  const alerts: EmailCutoverAlert[] = [];
  const metodo = params.orgStatuses.find((o) => o.organizationId === EMAIL_CUTOVER_TARGET_ORG);
  const clinica = params.orgStatuses.find((o) => o.organizationId === EMAIL_CUTOVER_CLINICA_ORG);

  if (params.session?.isolationFailure) {
    alerts.push({
      id: 'isolation-failure',
      severity: 'critical',
      title: 'CRITICAL — MULTI-ORG ISOLATION FAILURE',
      message: 'O cutover pode ter afetado o processamento legacy de outra organização.',
      recommendation: 'Execute rollback para legacy e investigue os ciclos da clínica.',
    });
  }

  if (metodo?.processing > 0) {
    alerts.push({
      id: 'processing-stuck',
      severity: 'critical',
      title: 'Processing travado',
      message: `${metodo.processing} item(ns) em processing para ${orgName(EMAIL_CUTOVER_TARGET_ORG)}.`,
      recommendation: 'Verifique a fila e considere rollback se persistir.',
    });
  }

  if (metodo?.circuitOpen) {
    alerts.push({
      id: 'circuit-open',
      severity: 'critical',
      title: 'Circuit breaker aberto',
      message: `Circuit breaker aberto para ${orgName(EMAIL_CUTOVER_TARGET_ORG)}.`,
      recommendation: 'Investigue falhas de envio antes de manter em queue.',
    });
  }

  if (metodo && metodo.dueNow >= 10) {
    alerts.push({
      id: 'due-now-growth',
      severity: metodo.dueNow >= 30 ? 'critical' : 'warning',
      title: 'Itens vencidos na fila',
      message: `${metodo.dueNow} item(ns) dueNow para ${orgName(EMAIL_CUTOVER_TARGET_ORG)}.`,
      recommendation: 'Monitore se a fila está acumulando após o cutover.',
    });
  }

  if (metodo && metodo.failed > 0) {
    alerts.push({
      id: 'queue-failed',
      severity: 'warning',
      title: 'Itens failed na fila',
      message: `${metodo.failed} failed para ${orgName(EMAIL_CUTOVER_TARGET_ORG)}.`,
    });
  }

  if (params.session?.status === 'MONITORING_QUEUE') {
    const metodoRow = params.isolationRows.find((r) => r.organizationId === EMAIL_CUTOVER_TARGET_ORG);
    const clinicaRow = params.isolationRows.find((r) => r.organizationId === EMAIL_CUTOVER_CLINICA_ORG);
    if (metodoRow && !metodoRow.ok) {
      alerts.push({
        id: 'metodo-not-processed',
        severity: 'critical',
        title: 'Método não processado no último ciclo',
        message: `Último ciclo: ${metodoRow.lastCycleStatus ?? 'ausente'}.`,
        recommendation: 'Verifique o cron e considere rollback.',
      });
    }
    if (clinicaRow && !clinicaRow.ok) {
      alerts.push({
        id: 'clinica-not-processed',
        severity: 'critical',
        title: 'Clínica Exemplo WL não processada no legacy',
        message: `Último ciclo: ${clinicaRow.lastCycleStatus ?? 'ausente'}.`,
        recommendation: 'Falha de isolamento multi-org — rollback recomendado.',
      });
    }
  }

  if (metodo && !metodo.transportHealth.lastKnownStatus?.includes('ok') && metodo.engine === 'queue') {
    alerts.push({
      id: 'transport-warning',
      severity: 'warning',
      title: 'Transporte SMTP com alerta',
      message: `Status: ${metodo.transportHealth.lastKnownStatus ?? 'desconhecido'}.`,
    });
  }

  return alerts;
}

async function buildOrgStatuses(organizationIds: string[]): Promise<EmailCutoverOrgStatusDto[]> {
  const now = new Date();
  const transport = await getEmailTransportHealth();
  const metrics = await listLatestAutomationRunMetrics();

  return Promise.all(
    organizationIds.map(async (organizationId) => {
      const [engineSetting, queueStats, circuitOpen, preflight] = await Promise.all([
        getEmailAutomationEngineSetting(organizationId),
        getEmailQueueStats(now, organizationId),
        isOrganizationCircuitOpen(organizationId),
        organizationId === EMAIL_CUTOVER_TARGET_ORG
          ? validateQueueEngineCutover(organizationId)
          : Promise.resolve({ ok: true, checks: [] as CutoverPreflightCheck[] }),
      ]);

      const orgMetrics = metrics
        .filter(
          (m) =>
            m.organizationId === organizationId &&
            (m.channel === 'email' || m.channel === 'email_legacy'),
        )
        .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));

      const lastCron = orgMetrics[0]?.finishedAt ?? null;
      const lastProcessing = orgMetrics[0]?.finishedAt ?? null;
      const queuePopulated =
        queueStats.counts.total > 0 ||
        queueStats.counts.sent > 0 ||
        queueStats.counts.skipped > 0;

      return {
        organizationId,
        organizationName: orgName(organizationId),
        engine: engineSetting.engine,
        queuePopulated,
        pending: queueStats.counts.pending,
        dueNow: queueStats.dueNow,
        processing: queueStats.counts.processing,
        failed: queueStats.counts.failed,
        circuitOpen,
        lastCronAt: lastCron,
        lastProcessingAt: lastProcessing,
        transportHealth: transport,
        preflightOk: preflight.ok,
        preflightChecks: preflight.checks,
      };
    }),
  );
}

function buildIsolationRows(
  orgStatuses: EmailCutoverOrgStatusDto[],
  session: SessionDoc | null,
): EmailCutoverOrgIsolationRow[] {
  const targetIds = [EMAIL_CUTOVER_TARGET_ORG, EMAIL_CUTOVER_CLINICA_ORG];
  const lastCycles = [...(session?.legacyCycles ?? []), ...(session?.queueCycles ?? [])];

  return targetIds.map((organizationId) => {
    const status = orgStatuses.find((o) => o.organizationId === organizationId);
    const expectedEngine =
      organizationId === EMAIL_CUTOVER_CLINICA_ORG ? 'legacy' : (session?.status === 'MONITORING_QUEUE' ? 'queue' : 'legacy');
    const lastCycle = [...lastCycles]
      .filter((c) => c.organizationId === organizationId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];

    const engineOk = status?.engine === expectedEngine;
    const cycleOk = lastCycle ? lastCycle.status !== 'failed' : session == null;
    const ok = engineOk && cycleOk && !session?.isolationFailure;

    return {
      organizationId,
      organizationName: orgName(organizationId),
      engine: status?.engine ?? 'legacy',
      lastCycleStatus: lastCycle?.status ?? null,
      lastCycleAt: lastCycle?.completedAt ?? status?.lastCronAt ?? null,
      ok,
    };
  });
}

function sessionToDto(
  session: SessionDoc,
  orgStatuses: EmailCutoverOrgStatusDto[],
): EmailCutoverSessionDto {
  const legacyCycles = session.legacyCycles ?? [];
  const queueCycles = session.queueCycles ?? [];
  const isolationRows = buildIsolationRows(orgStatuses, session);

  return {
    cutoverSessionId: session.cutoverSessionId,
    organizationId: session.organizationId,
    channel: 'email',
    status: session.status,
    fromEngine: session.fromEngine,
    toEngine: session.toEngine,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    createdBy: session.createdBy,
    promotedAt: session.promotedAt ?? null,
    rolledBackAt: session.rolledBackAt ?? null,
    rollbackReason: session.rollbackReason ?? null,
    legacyCycles,
    queueCycles,
    preflightChecks: session.preflightChecks ?? [],
    extendedChecks: session.extendedChecks ?? [],
    snapshotId: session.snapshotId ?? null,
    baseline: session.baseline ?? null,
    externalQueryInsightsBaseline: session.externalQueryInsightsBaseline ?? null,
    externalQueryInsights30m: session.externalQueryInsights30m ?? null,
    externalQueryInsights60m: session.externalQueryInsights60m ?? null,
    isolationRows,
    alerts: buildAlerts({ session, orgStatuses, isolationRows }),
    comparison: buildComparison(session.baseline ?? null, legacyCycles, queueCycles),
    isolationFailure: session.isolationFailure === true,
  };
}

export async function getEmailCutoverControl(): Promise<EmailCutoverControlDto> {
  const now = new Date();
  const orgIds = await listEmailAutomationOrganizations();
  const focusIds = [...new Set([EMAIL_CUTOVER_TARGET_ORG, EMAIL_CUTOVER_CLINICA_ORG, ...orgIds])];

  const sessionSnap = await getFirestoreAdmin()
    .collection(SESSIONS)
    .doc(sessionDocId(EMAIL_CUTOVER_TARGET_ORG))
    .get();

  const session = sessionSnap.exists ? (sessionSnap.data() as SessionDoc) : null;
  const orgStatuses = await buildOrgStatuses(focusIds);

  let timeline: EmailCutoverControlDto['timeline'] = [];
  if (session) {
    const timelineSnap = await getFirestoreAdmin()
      .collection(TIMELINE)
      .where('cutoverSessionId', '==', session.cutoverSessionId)
      .orderBy('at', 'desc')
      .limit(30)
      .get()
      .catch(async () => {
        const fallback = await getFirestoreAdmin()
          .collection(TIMELINE)
          .where('cutoverSessionId', '==', session.cutoverSessionId)
          .limit(30)
          .get();
        return fallback;
      });

    timeline = timelineSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type as EmailCutoverTimelineEventType,
          at: toIso(data.at),
          title: String(data.title ?? ''),
          detail: typeof data.detail === 'string' ? data.detail : undefined,
        };
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  const metodoEngine = await getEmailAutomationEngine(EMAIL_CUTOVER_TARGET_ORG);
  const allChecks = session
    ? [...(session.preflightChecks ?? []), ...(session.extendedChecks ?? [])]
    : [];

  const canPrepare =
    metodoEngine === 'legacy' && (!session || session.status === 'ROLLED_BACK');
  const preflightBlocked = isCriticalPreflightFailure(allChecks);
  const canPromote =
    session?.status === 'READY_FOR_CUTOVER' && !preflightBlocked && metodoEngine === 'legacy';
  const canRollback = metodoEngine === 'queue';

  return {
    generatedAt: now.toISOString(),
    targetOrganizationId: EMAIL_CUTOVER_TARGET_ORG,
    clinicaOrganizationId: EMAIL_CUTOVER_CLINICA_ORG,
    session: session ? sessionToDto(session, orgStatuses) : null,
    organizations: orgStatuses.filter((o) =>
      [EMAIL_CUTOVER_TARGET_ORG, EMAIL_CUTOVER_CLINICA_ORG].includes(o.organizationId),
    ),
    timeline,
    canPrepare,
    canPromote,
    canRollback,
  };
}

export async function prepareEmailCutover(params: {
  organizationId: string;
  createdBy: string;
  externalQueryInsightsBaseline?: ExternalQueryInsightsSnapshot | null;
}): Promise<EmailCutoverControlDto> {
  const organizationId = params.organizationId.trim();
  if (organizationId !== EMAIL_CUTOVER_TARGET_ORG) {
    throw new Error(`Cutover control disponível apenas para ${orgName(EMAIL_CUTOVER_TARGET_ORG)}.`);
  }

  const engine = await getEmailAutomationEngine(organizationId);
  if (engine === 'queue') {
    throw new Error('Organização já está em queue. Use rollback se necessário.');
  }

  const existingSnap = await getFirestoreAdmin()
    .collection(SESSIONS)
    .doc(sessionDocId(organizationId))
    .get();
  if (existingSnap.exists) {
    const existing = existingSnap.data() as SessionDoc;
    if (existing.status !== 'ROLLED_BACK') {
      throw new Error(`Sessão de cutover já ativa (status: ${existing.status}).`);
    }
  }

  const [preflight, extendedChecks, baseline] = await Promise.all([
    validateQueueEngineCutover(organizationId),
    buildExtendedCutoverChecks(organizationId),
    captureBaselineMetrics(organizationId),
  ]);

  const cutoverSessionId = randomUUID();
  const nowIso = new Date().toISOString();

  const snapshotRef = await getFirestoreAdmin().collection(SNAPSHOTS).add({
    cutoverSessionId,
    organizationId,
    channel: 'email',
    fromEngine: 'legacy',
    toEngine: 'queue',
    capturedAt: FieldValue.serverTimestamp(),
    metrics: baseline,
    externalQueryInsightsBaseline: params.externalQueryInsightsBaseline ?? null,
  });

  const session: SessionDoc = {
    cutoverSessionId,
    organizationId,
    channel: 'email',
    status: 'VALIDATING_LEGACY',
    fromEngine: 'legacy',
    toEngine: 'queue',
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: params.createdBy,
    legacyCycles: [],
    queueCycles: [],
    preflightChecks: preflight.checks,
    extendedChecks,
    snapshotId: snapshotRef.id,
    baseline,
    externalQueryInsightsBaseline: params.externalQueryInsightsBaseline ?? null,
    isolationFailure: false,
  };

  await getFirestoreAdmin().collection(SESSIONS).doc(sessionDocId(organizationId)).set(session);

  await appendTimelineEvent({
    cutoverSessionId,
    organizationId,
    type: 'CUTOVER_PREPARATION_STARTED',
    title: 'Preparação do cutover iniciada',
    detail: `Observando 2 ciclos legacy para ${orgName(organizationId)}.`,
  });

  return getEmailCutoverControl();
}

export async function observeEmailCutoverCronRun(params: {
  organizations: CronOrganizationEmailResult[];
  timestamp: string;
}): Promise<void> {
  const sessionSnap = await getFirestoreAdmin()
    .collection(SESSIONS)
    .doc(sessionDocId(EMAIL_CUTOVER_TARGET_ORG))
    .get();

  if (!sessionSnap.exists) return;

  const session = sessionSnap.data() as SessionDoc;
  const metodo = params.organizations.find((o) => o.organizationId === EMAIL_CUTOVER_TARGET_ORG);
  const clinica = params.organizations.find((o) => o.organizationId === EMAIL_CUTOVER_CLINICA_ORG);

  const updates: Partial<SessionDoc> = {
    updatedAt: new Date().toISOString(),
    lastIsolationCheckAt: params.timestamp,
  };

  let isolationFailure = session.isolationFailure === true;

  if (session.status === 'MONITORING_QUEUE') {
    if (clinica && (clinica.status === 'failed' || clinica.engine !== 'legacy')) {
      isolationFailure = true;
    }
    if (!clinica) {
      isolationFailure = true;
    }
    if (metodo && metodo.engine !== 'queue') {
      isolationFailure = true;
    }
  }

  updates.isolationFailure = isolationFailure;

  if (session.status === 'VALIDATING_LEGACY' && metodo && metodo.engine !== 'queue') {
    if (metodo.status === 'failed') {
      updates.updatedAt = new Date().toISOString();
      await sessionSnap.ref.set(updates, { merge: true });
      return;
    }

    const legacyCycles = [...(session.legacyCycles ?? [])];
    if (legacyCycles.length < 2 && (metodo.status === 'completed' || metodo.status === 'skipped')) {
      const cycle = mapCycle(legacyCycles.length + 1, metodo, params.timestamp);
      legacyCycles.push(cycle);
      updates.legacyCycles = legacyCycles;

      const eventType: EmailCutoverTimelineEventType =
        cycle.cycleNumber === 1 ? 'LEGACY_CYCLE_1_COMPLETED' : 'LEGACY_CYCLE_2_COMPLETED';
      await appendTimelineEvent({
        cutoverSessionId: session.cutoverSessionId,
        organizationId: EMAIL_CUTOVER_TARGET_ORG,
        type: eventType,
        title: `Ciclo legacy ${cycle.cycleNumber} concluído`,
        detail: `reads=${cycle.readsEstimated}, email_envios queries=${cycle.emailEnviosQueries}, duration=${cycle.durationMs}ms`,
      });

      if (legacyCycles.length >= 2 && !isolationFailure) {
        updates.status = 'READY_FOR_CUTOVER';
        await appendTimelineEvent({
          cutoverSessionId: session.cutoverSessionId,
          organizationId: EMAIL_CUTOVER_TARGET_ORG,
          type: 'CUTOVER_READY',
          title: 'Pronto para cutover',
          detail: 'Dois ciclos legacy observados sem falha crítica.',
        });
      }
    }
  }

  if (session.status === 'MONITORING_QUEUE' && metodo && metodo.engine === 'queue') {
    const queueCycles = [...(session.queueCycles ?? [])];
    if (queueCycles.length < 2 && metodo.status !== 'failed') {
      const cycle = mapCycle(queueCycles.length + 1, metodo, params.timestamp);
      queueCycles.push(cycle);
      updates.queueCycles = queueCycles;

      const eventType: EmailCutoverTimelineEventType =
        cycle.cycleNumber === 1 ? 'QUEUE_CYCLE_1_COMPLETED' : 'QUEUE_CYCLE_2_COMPLETED';
      await appendTimelineEvent({
        cutoverSessionId: session.cutoverSessionId,
        organizationId: EMAIL_CUTOVER_TARGET_ORG,
        type: eventType,
        title: `Ciclo queue ${cycle.cycleNumber} concluído`,
        detail: `email_envios queries=${cycle.emailEnviosQueries}, docs=${cycle.emailEnviosDocsLidos}`,
      });

      if (
        queueCycles.length >= 2 &&
        queueCycles.every((c) => c.emailEnviosQueries === 0 && c.emailEnviosDocsLidos === 0)
      ) {
        await appendTimelineEvent({
          cutoverSessionId: session.cutoverSessionId,
          organizationId: EMAIL_CUTOVER_TARGET_ORG,
          type: 'CUTOVER_VALIDATED',
          title: 'Cutover validado',
          detail: 'Dois ciclos queue sem consultas email_envios no motor de decisão.',
        });
      }
    }
  }

  if (isolationFailure && !session.isolationFailure) {
    await appendTimelineEvent({
      cutoverSessionId: session.cutoverSessionId,
      organizationId: EMAIL_CUTOVER_TARGET_ORG,
      type: 'ISOLATION_FAILURE_DETECTED',
      title: 'Falha de isolamento multi-org detectada',
      detail: 'Verifique o processamento da clínica legacy.',
    });
  }

  await sessionSnap.ref.set(updates, { merge: true });
}

export async function promoteEmailCutover(params: {
  organizationId: string;
  changedBy: string;
}): Promise<EmailCutoverControlDto> {
  const organizationId = params.organizationId.trim();
  const sessionSnap = await getFirestoreAdmin()
    .collection(SESSIONS)
    .doc(sessionDocId(organizationId))
    .get();

  if (!sessionSnap.exists) {
    throw new Error('Nenhuma sessão de cutover ativa. Execute "Preparar cutover" primeiro.');
  }

  const session = sessionSnap.data() as SessionDoc;
  if (session.status !== 'READY_FOR_CUTOVER') {
    throw new Error(`Cutover não está pronto (status: ${session.status}).`);
  }

  const preflight = await validateQueueEngineCutover(organizationId);
  const extended = await buildExtendedCutoverChecks(organizationId);
  const allChecks = [...preflight.checks, ...extended];
  if (!preflight.ok || isCriticalPreflightFailure(allChecks)) {
    throw new Error(preflight.ok ? 'Pré-flight estendido bloqueou o cutover.' : preflight.error);
  }

  const currentEngine = await getEmailAutomationEngine(organizationId);
  if (currentEngine === 'queue') {
    throw new Error('Organização já está em queue.');
  }

  await setEmailAutomationEngine({
    organizationId,
    engine: 'queue',
    updatedBy: params.changedBy,
  });

  await recordEngineAudit({
    organizationId,
    fromEngine: currentEngine,
    toEngine: 'queue',
    changedBy: params.changedBy,
    reason: 'cutover_promote_ui',
    cutoverSessionId: session.cutoverSessionId,
  });

  const promotedAt = new Date().toISOString();
  await sessionSnap.ref.set(
    {
      status: 'MONITORING_QUEUE',
      promotedAt,
      updatedAt: promotedAt,
      queueCycles: [],
      preflightChecks: preflight.checks,
      extendedChecks: extended,
    },
    { merge: true },
  );

  await appendTimelineEvent({
    cutoverSessionId: session.cutoverSessionId,
    organizationId,
    type: 'ENGINE_CHANGED_TO_QUEUE',
    title: `${orgName(organizationId)} promovido para queue`,
    detail: `${orgName(EMAIL_CUTOVER_CLINICA_ORG)} permanece em legacy.`,
  });

  return getEmailCutoverControl();
}

export async function rollbackEmailCutover(params: {
  organizationId: string;
  changedBy: string;
  reason: EmailCutoverRollbackReason;
  reasonDetail?: string;
}): Promise<EmailCutoverControlDto> {
  const organizationId = params.organizationId.trim();
  const sessionSnap = await getFirestoreAdmin()
    .collection(SESSIONS)
    .doc(sessionDocId(organizationId))
    .get();

  const session = sessionSnap.exists ? (sessionSnap.data() as SessionDoc) : null;
  const currentEngine = await getEmailAutomationEngine(organizationId);

  if (currentEngine !== 'queue') {
    throw new Error('Rollback disponível apenas quando a organização está em queue.');
  }

  await setEmailAutomationEngine({
    organizationId,
    engine: 'legacy',
    updatedBy: params.changedBy,
  });

  const reasonLabel =
    params.reason === 'outro' && params.reasonDetail
      ? `outro: ${params.reasonDetail}`
      : params.reason;

  await recordEngineAudit({
    organizationId,
    fromEngine: 'queue',
    toEngine: 'legacy',
    changedBy: params.changedBy,
    reason: reasonLabel,
    cutoverSessionId: session?.cutoverSessionId ?? null,
  });

  const rolledBackAt = new Date().toISOString();
  if (sessionSnap.exists) {
    await sessionSnap.ref.set(
      {
        status: 'ROLLED_BACK',
        rolledBackAt,
        rollbackReason: reasonLabel,
        updatedAt: rolledBackAt,
      },
      { merge: true },
    );

    if (session) {
      await appendTimelineEvent({
        cutoverSessionId: session.cutoverSessionId,
        organizationId,
        type: 'ROLLBACK_EXECUTED',
        title: 'Rollback para legacy executado',
        detail: reasonLabel,
      });
    }
  }

  return getEmailCutoverControl();
}

export async function recordEmailCutoverQueryInsights(params: {
  organizationId: string;
  window: 'baseline' | '30m' | '60m';
  reads24h?: number;
  executions24h?: number;
  note?: string;
}): Promise<EmailCutoverControlDto> {
  const sessionSnap = await getFirestoreAdmin()
    .collection(SESSIONS)
    .doc(sessionDocId(params.organizationId))
    .get();

  if (!sessionSnap.exists) {
    throw new Error('Nenhuma sessão de cutover ativa.');
  }

  const snapshot: ExternalQueryInsightsSnapshot = {
    reads24h: params.reads24h,
    executions24h: params.executions24h,
    capturedAt: new Date().toISOString(),
    note: params.note,
  };

  const fieldMap = {
    baseline: 'externalQueryInsightsBaseline',
    '30m': 'externalQueryInsights30m',
    '60m': 'externalQueryInsights60m',
  } as const;

  const field = fieldMap[params.window];
  await sessionSnap.ref.set({ [field]: snapshot, updatedAt: new Date().toISOString() }, { merge: true });

  const session = sessionSnap.data() as SessionDoc;
  if (session.snapshotId && params.window === 'baseline') {
    await getFirestoreAdmin()
      .collection(SNAPSHOTS)
      .doc(session.snapshotId)
      .set({ externalQueryInsightsBaseline: snapshot }, { merge: true });
  }

  return getEmailCutoverControl();
}
