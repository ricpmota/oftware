import { getPendingItems } from '@/services/emailAutomationQueueService';
import type { EmailAutomationQueueItem } from '@/types/emailAutomationQueue';

export type ProcessDueEmailAutomationQueueResult = {
  queueItemsRead: number;
  items: EmailAutomationQueueItem[];
  durationMs: number;
  /** ETAPA 1: consumidor preparado — ainda não envia e-mails. */
  shadowMode: true;
};

/**
 * Consumidor da fila (ETAPA 1 — shadow mode).
 * Consulta itens vencidos (pending + scheduledFor <= now) e retorna.
 * NÃO envia e-mails — preparação para ETAPA 2.
 */
export async function processDueEmailAutomationQueue(options: {
  now?: Date;
  limit?: number;
} = {}): Promise<ProcessDueEmailAutomationQueueResult> {
  const start = Date.now();
  const now = options.now ?? new Date();
  const limit = options.limit ?? 10;

  const items = await getPendingItems(now, limit);

  const result: ProcessDueEmailAutomationQueueResult = {
    queueItemsRead: items.length,
    items,
    durationMs: Date.now() - start,
    shadowMode: true,
  };

  console.log('[email-automation-queue][consumer][shadow]', JSON.stringify({
    queueItemsRead: result.queueItemsRead,
    durationMs: result.durationMs,
    itemIds: items.map((i) => i.id),
  }));

  return result;
}
