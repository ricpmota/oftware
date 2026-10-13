import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { AutomationEngineRunMetrics } from '@/types/automationEngine';

const COLLECTION = 'automation_engine_run_metrics';

export async function persistAutomationRunMetrics(metrics: AutomationEngineRunMetrics): Promise<void> {
  const id = `${metrics.channel}_${metrics.organizationId}_latest`;
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(id)
    .set({
      ...metrics,
      persistedAt: Timestamp.now(),
    });
}

export async function getLatestAutomationRunMetrics(params: {
  channel: string;
  organizationId: string;
}): Promise<AutomationEngineRunMetrics | null> {
  const id = `${params.channel}_${params.organizationId}_latest`;
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as AutomationEngineRunMetrics;
}

export async function getLegacyVsQueueComparison(organizationId: string): Promise<{
  legacy: AutomationEngineRunMetrics | null;
  queue: AutomationEngineRunMetrics | null;
}> {
  const [legacy, queue] = await Promise.all([
    getLatestAutomationRunMetrics({ channel: 'email_legacy', organizationId }),
    getLatestAutomationRunMetrics({ channel: 'email', organizationId }),
  ]);
  return { legacy, queue };
}

export async function listLatestAutomationRunMetrics(): Promise<AutomationEngineRunMetrics[]> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).get();
  return snap.docs.map((doc) => doc.data() as AutomationEngineRunMetrics);
}
