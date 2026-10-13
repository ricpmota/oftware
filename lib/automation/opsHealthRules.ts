import type { AutomationOpsHealth, AutomationOpsQueueHealth } from '@/types/automationOps';

/** Limites operacionais — ajustáveis via env sem alterar cron. */
export const OPS_PENDING_WARNING = Number(process.env.AUTOMATION_OPS_PENDING_WARNING ?? '50');
export const OPS_PENDING_CRITICAL = Number(process.env.AUTOMATION_OPS_PENDING_CRITICAL ?? '200');
export const OPS_PROCESSING_STALE_MS = Number(process.env.AUTOMATION_OPS_PROCESSING_STALE_MS ?? '900000'); // 15 min
export const OPS_RETRY_AVG_WARNING = Number(process.env.AUTOMATION_OPS_RETRY_AVG_WARNING ?? '2');
export const OPS_CRON_DELAY_WARNING_MIN = Number(process.env.AUTOMATION_OPS_CRON_DELAY_WARNING_MIN ?? '20');
export const OPS_CRON_DELAY_CRITICAL_MIN = Number(process.env.AUTOMATION_OPS_CRON_DELAY_CRITICAL_MIN ?? '35');
export const OPS_SHADOW_MATCH_WARNING = Number(process.env.AUTOMATION_OPS_SHADOW_MATCH_WARNING ?? '99.5');

export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? null;
}

export function deriveQueueHealth(params: {
  pending: number;
  dueNow: number;
  processing: number;
  oldestProcessingAgeMs: number | null;
  avgRetryCountFailed: number;
}): AutomationOpsQueueHealth {
  const rules: string[] = [];
  let status: AutomationOpsHealth = 'healthy';

  if (params.pending >= OPS_PENDING_CRITICAL || params.dueNow >= OPS_PENDING_CRITICAL) {
    status = 'critical';
    rules.push(`Pending/dueNow ≥ ${OPS_PENDING_CRITICAL}`);
  } else if (params.pending >= OPS_PENDING_WARNING || params.dueNow >= OPS_PENDING_WARNING) {
    status = 'warning';
    rules.push(`Pending/dueNow ≥ ${OPS_PENDING_WARNING}`);
  }

  if (
    params.oldestProcessingAgeMs != null &&
    params.oldestProcessingAgeMs >= OPS_PROCESSING_STALE_MS
  ) {
    status = 'critical';
    rules.push('Processing stale (lock antigo)');
  }

  if (params.avgRetryCountFailed >= OPS_RETRY_AVG_WARNING) {
    if (status === 'healthy') status = 'warning';
    rules.push(`Retries médios ≥ ${OPS_RETRY_AVG_WARNING}`);
  }

  return { status, pending: params.pending, dueNow: params.dueNow, processing: params.processing, rules };
}

export function deriveCronHealth(delayMinutes: number | null): AutomationOpsHealth {
  if (delayMinutes == null) return 'warning';
  if (delayMinutes >= OPS_CRON_DELAY_CRITICAL_MIN) return 'critical';
  if (delayMinutes >= OPS_CRON_DELAY_WARNING_MIN) return 'warning';
  return 'healthy';
}

export function mergeHealth(...levels: AutomationOpsHealth[]): AutomationOpsHealth {
  if (levels.includes('critical')) return 'critical';
  if (levels.includes('warning')) return 'warning';
  return 'healthy';
}

export function healthEmoji(status: AutomationOpsHealth): string {
  if (status === 'healthy') return '🟢';
  if (status === 'warning') return '🟡';
  return '🔴';
}

export function healthLabel(status: AutomationOpsHealth): string {
  if (status === 'healthy') return 'Healthy';
  if (status === 'warning') return 'Warning';
  return 'Critical';
}
