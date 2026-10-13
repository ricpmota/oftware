import { randomUUID } from 'crypto';
import type { AutomationEngineChannel } from '@/types/automationEngine';

/**
 * ID único por item processado — rastreável em logs, fila, ledger e provedor.
 * Formato: {channel}:{organizationId}:{resourceId}:{actionType}:{uuid}
 */
export function createAutomationExecutionId(params: {
  channel: AutomationEngineChannel;
  organizationId: string;
  resourceId: string;
  actionType: string;
}): string {
  const channel = params.channel.trim() || 'unknown';
  const org = params.organizationId.trim() || 'unknown';
  const resource = params.resourceId.trim() || 'unknown';
  const action = params.actionType.trim() || 'unknown';
  return `${channel}:${org}:${resource}:${action}:${randomUUID()}`;
}

/** ID de batch/run do cron (uma execução completa). */
export function createAutomationRunId(params: {
  channel: AutomationEngineChannel;
  organizationId: string;
}): string {
  return `run:${params.channel}:${params.organizationId}:${randomUUID()}`;
}

export const AUTOMATION_ENGINE_LOG_PREFIX = '[automation_engine]';
