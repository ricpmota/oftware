import type { ExternalQueryInsightsSnapshot } from '@/types/emailCutoverControl';

export function computeQueryInsightsDelta(
  baseline: ExternalQueryInsightsSnapshot | null,
  after: ExternalQueryInsightsSnapshot | null,
): { readsDelta: number | null; executionsDelta: number | null } {
  if (!baseline || !after) return { readsDelta: null, executionsDelta: null };
  const readsDelta =
    baseline.reads24h != null && after.reads24h != null ? after.reads24h - baseline.reads24h : null;
  const executionsDelta =
    baseline.executions24h != null && after.executions24h != null
      ? after.executions24h - baseline.executions24h
      : null;
  return { readsDelta, executionsDelta };
}
