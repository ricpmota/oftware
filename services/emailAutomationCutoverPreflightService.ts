import { isOrganizationCircuitOpen } from '@/lib/automation/circuitBreaker';
import { getEmailTransportHealth, isEmailTransportBlockingCutover } from '@/lib/email/emailTransportHealth';
import { stats as getEmailQueueStats } from '@/services/emailAutomationQueueService';

export type CutoverPreflightCheck = {
  id: string;
  ok: boolean;
  detail: string;
};

export type CutoverPreflightResult =
  | { ok: true; checks: CutoverPreflightCheck[] }
  | { ok: false; checks: CutoverPreflightCheck[]; error: string };

/**
 * Validações antes de promover uma organização para engine `queue`.
 * Rollback para `legacy` não passa por aqui.
 */
export async function validateQueueEngineCutover(organizationId: string): Promise<CutoverPreflightResult> {
  const orgId = organizationId.trim();
  const checks: CutoverPreflightCheck[] = [];

  const queueStats = await getEmailQueueStats(new Date(), orgId);
  const queuePopulated =
    queueStats.counts.total > 0 ||
    queueStats.counts.sent > 0 ||
    queueStats.counts.skipped > 0;
  checks.push({
    id: 'queue_populated',
    ok: queuePopulated,
    detail: queuePopulated
      ? `Fila com ${queueStats.counts.total} itens (${queueStats.counts.sent} sent, ${queueStats.counts.skipped} skipped).`
      : 'Fila vazia para a organização.',
  });

  const processingOk = queueStats.counts.processing === 0;
  checks.push({
    id: 'processing_clear',
    ok: processingOk,
    detail: processingOk
      ? 'Nenhum item em processing.'
      : `${queueStats.counts.processing} item(ns) em processing.`,
  });

  const circuitOpen = await isOrganizationCircuitOpen(orgId);
  checks.push({
    id: 'circuit_breaker',
    ok: !circuitOpen,
    detail: circuitOpen ? 'Circuit breaker aberto.' : 'Circuit breaker fechado.',
  });

  const transport = await getEmailTransportHealth();
  const transportOk = !isEmailTransportBlockingCutover(transport);
  checks.push({
    id: 'transport_health',
    ok: transportOk,
    detail: transportOk
      ? `Transporte ${transport.lastKnownStatus}.`
      : transport.lastAuthErrorAt
        ? `EAUTH recente em ${transport.lastAuthErrorAt}.`
        : 'ZeptoMail não configurado ou autenticação inválida.',
  });

  const failedCheck = checks.find((c) => !c.ok);
  if (failedCheck) {
    const error =
      failedCheck.id === 'transport_health'
        ? 'Cutover bloqueado: autenticação ZeptoMail inválida.'
        : `Cutover bloqueado: ${failedCheck.detail}`;
    return { ok: false, checks, error };
  }

  return { ok: true, checks };
}
