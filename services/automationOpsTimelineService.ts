import { Timestamp } from 'firebase-admin/firestore';
import { listAllOrganizationCircuitBreakers } from '@/lib/automation/circuitBreaker';
import { listLatestAutomationRunMetrics } from '@/lib/automation/executionMetrics';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getWhatsappCronHeartbeat, toWhatsappCronHeartbeatDto } from '@/services/whatsappCronHeartbeatService';
import type { AutomationOpsTimelineEvent } from '@/types/automationOps';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

export async function getAutomationOpsTimeline(limit = 50): Promise<AutomationOpsTimelineEvent[]> {
  try {
    return await buildAutomationOpsTimeline(limit);
  } catch (error) {
    console.error('[automationOpsTimeline]', error);
    return [];
  }
}

async function buildAutomationOpsTimeline(limit = 50): Promise<AutomationOpsTimelineEvent[]> {
  const events: AutomationOpsTimelineEvent[] = [];
  const db = getFirestoreAdmin();

  const [queueSnap, ledgerSnap, shadowSnap, runMetrics, circuits, whatsappHb] = await Promise.all([
    db.collection('email_automation_queue').orderBy('updatedAt', 'desc').limit(30).get(),
    db.collection('email_envios').orderBy('enviadoEm', 'desc').limit(20).get(),
    db.collection('email_queue_shadow_events').orderBy('createdAt', 'desc').limit(15).get().catch(() => null),
    listLatestAutomationRunMetrics(),
    listAllOrganizationCircuitBreakers(),
    getWhatsappCronHeartbeat(),
  ]);

  for (const doc of queueSnap.docs) {
    const data = doc.data();
    const status = String(data.status ?? '');
    const at = toIso(data.updatedAt) ?? new Date().toISOString();
    const automationExecutionId =
      typeof data.automationExecutionId === 'string' ? data.automationExecutionId : undefined;

    let type: AutomationOpsTimelineEvent['type'] = 'processing';
    let title = `Queue ${status}`;
    if (status === 'sent') {
      type = 'email_sent';
      title = `E-mail enviado (${data.emailTipo})`;
    } else if (status === 'failed') {
      type = 'email_failed';
      title = `Falha no envio (${data.emailTipo})`;
    } else if (status === 'skipped') {
      type = 'email_skipped';
      title = `Skipped (${data.emailTipo})`;
    } else if (status === 'processing') {
      type = 'processing';
      title = 'Processando item da fila';
    } else if (status === 'pending') {
      continue;
    }

    if (status === 'failed' && Number(data.retryCount ?? 0) > 0) {
      events.push({
        id: `retry-${doc.id}`,
        at,
        channel: 'email',
        type: 'retry',
        title: `Retry #${data.retryCount}`,
        subtitle: String(data.errorMessage ?? ''),
        organizationId: String(data.organizationId ?? ''),
        automationExecutionId,
        severity: 'warning',
      });
    }

    events.push({
      id: `queue-${doc.id}`,
      at,
      channel: 'email',
      type,
      title,
      subtitle: data.leadEmail ? String(data.leadEmail) : undefined,
      organizationId: String(data.organizationId ?? ''),
      automationExecutionId,
      severity: status === 'failed' ? 'critical' : status === 'skipped' ? 'warning' : 'healthy',
    });
  }

  for (const doc of ledgerSnap.docs) {
    const data = doc.data();
    if (data.tipo !== 'automatico' && data.engine !== 'queue') continue;
    events.push({
      id: `ledger-${doc.id}`,
      at: toIso(data.enviadoEm) ?? new Date().toISOString(),
      channel: 'email',
      type: data.status === 'enviado' ? 'email_sent' : 'email_failed',
      title: `Ledger: ${data.emailTipo} → ${data.status}`,
      subtitle: data.leadEmail ? String(data.leadEmail) : undefined,
      organizationId: typeof data.organizationId === 'string' ? data.organizationId : undefined,
      automationExecutionId:
        typeof data.automationExecutionId === 'string' ? data.automationExecutionId : undefined,
    });
  }

  if (shadowSnap) {
    for (const doc of shadowSnap.docs) {
      const data = doc.data();
      if (data.status !== 'MISMATCH') continue;
      events.push({
        id: `shadow-${doc.id}`,
        at: toIso(data.createdAt) ?? new Date().toISOString(),
        channel: 'email',
        type: 'shadow_mismatch',
        title: 'Shadow mismatch',
        subtitle: `${data.emailTipo} · lead ${data.leadId}`,
        organizationId: typeof data.organizationId === 'string' ? data.organizationId : undefined,
        severity: data.critical === true ? 'critical' : 'warning',
      });
    }
  }

  for (const metric of runMetrics) {
    events.push({
      id: `run-${metric.channel}-${metric.organizationId}`,
      at: metric.finishedAt,
      channel: metric.channel.startsWith('email') ? 'email' : 'platform',
      type: 'cron_run',
      title: `Cron ${metric.engine} (${metric.channel})`,
      subtitle: `${metric.sent} enviados · ${metric.durationMs}ms · ${metric.firestoreReads} reads`,
      organizationId: metric.organizationId,
      automationExecutionId: metric.automationExecutionId,
    });
  }

  for (const circuit of circuits.filter((c) => c.open)) {
    events.push({
      id: `circuit-${circuit.organizationId}`,
      at: circuit.openedAt ?? new Date().toISOString(),
      channel: 'email',
      type: 'circuit_breaker',
      title: 'Circuit Breaker aberto',
      subtitle: circuit.reason,
      organizationId: circuit.organizationId,
      severity: 'critical',
    });
  }

  if (whatsappHb) {
    const dto = toWhatsappCronHeartbeatDto(whatsappHb);
    if (dto) {
      events.push({
        id: 'whatsapp-cron-aplicacao',
        at: dto.ranAt,
        channel: 'whatsapp',
        type: 'cron_run',
        title: 'Cron WhatsApp aplicação',
        subtitle: `${dto.enviados} enviados · ${dto.medicos} médicos`,
      });
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return events.slice(0, limit);
}
