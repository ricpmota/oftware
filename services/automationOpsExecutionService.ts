import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { AutomationOpsExecutionDetail } from '@/types/automationOps';

export async function getAutomationExecutionDetail(
  automationExecutionId: string,
): Promise<AutomationOpsExecutionDetail | null> {
  const id = automationExecutionId.trim();
  if (!id) return null;

  const db = getFirestoreAdmin();

  const [queueSnap, ledgerSnap, runSnap] = await Promise.all([
    db.collection('email_automation_queue').where('automationExecutionId', '==', id).limit(5).get(),
    db.collection('email_envios').where('automationExecutionId', '==', id).limit(10).get(),
    db.collection('automation_engine_run_metrics').where('automationExecutionId', '==', id).limit(1).get(),
  ]);

  const queueItem = queueSnap.docs[0]?.data() ?? null;
  const queueDocId = queueSnap.docs[0]?.id;
  const ledgerEntries = ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let shadowEvents: Record<string, unknown>[] = [];
  if (queueItem && typeof queueItem.leadId === 'string') {
    const shadowSnapByLead = await db
      .collection('email_queue_shadow_events')
      .where('leadId', '==', queueItem.leadId)
      .limit(10)
      .get()
      .catch(() => null);
    if (shadowSnapByLead) {
      shadowEvents = shadowSnapByLead.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  }

  const runMetrics = runSnap.docs[0]?.data() ?? null;

  if (!queueItem && ledgerEntries.length === 0 && !runMetrics) {
    return null;
  }

  let zepto: AutomationOpsExecutionDetail['zepto'] = null;
  const ledgerWithZepto = ledgerEntries.find(
    (e) => typeof e.messageId === 'string' || typeof e.provedor === 'string',
  );
  if (ledgerWithZepto) {
    zepto = {
      messageId: typeof ledgerWithZepto.messageId === 'string' ? ledgerWithZepto.messageId : undefined,
      provedor: typeof ledgerWithZepto.provedor === 'string' ? ledgerWithZepto.provedor : undefined,
    };
  }

  return {
    automationExecutionId: id,
    queueItem: queueItem ? { id: queueDocId, ...queueItem } : null,
    ledgerEntries,
    shadowEvents,
    runMetrics: runMetrics ? { id: runSnap.docs[0]!.id, ...runMetrics } : null,
    zepto,
  };
}
