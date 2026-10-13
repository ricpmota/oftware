import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { AutomationOpsSearchResult } from '@/types/automationOps';

function pushUnique(
  results: AutomationOpsSearchResult[],
  item: AutomationOpsSearchResult,
  seen: Set<string>,
) {
  const key = `${item.kind}:${item.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push(item);
}

export async function searchAutomationOps(params: {
  q: string;
  limit?: number;
}): Promise<AutomationOpsSearchResult[]> {
  const q = params.q.trim();
  const limit = Math.min(params.limit ?? 30, 50);
  if (!q) return [];

  const db = getFirestoreAdmin();
  const results: AutomationOpsSearchResult[] = [];
  const seen = new Set<string>();

  const isEmail = q.includes('@');

  if (isEmail) {
    const emailLower = q.toLowerCase();
    const [queueSnap, ledgerSnap] = await Promise.all([
      db.collection('email_automation_queue').where('leadEmail', '==', emailLower).limit(20).get(),
      db.collection('email_envios').where('leadEmail', '==', emailLower).limit(20).get(),
    ]);
    for (const doc of queueSnap.docs) {
      const data = doc.data();
      pushUnique(results, {
        kind: 'queue',
        id: doc.id,
        at: data.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        summary: `${data.emailTipo} · ${data.status}`,
        organizationId: data.organizationId,
        leadId: data.leadId,
        email: data.leadEmail,
        automationExecutionId: data.automationExecutionId,
      }, seen);
    }
    for (const doc of ledgerSnap.docs) {
      const data = doc.data();
      pushUnique(results, {
        kind: 'ledger',
        id: doc.id,
        at: data.enviadoEm?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        summary: `Ledger ${data.emailTipo} · ${data.status}`,
        organizationId: data.organizationId,
        leadId: data.leadId,
        email: data.leadEmail,
        automationExecutionId: data.automationExecutionId,
      }, seen);
    }
    return results.slice(0, limit);
  }

  if (q.startsWith('email:') || q.startsWith('run:')) {
    const [queueSnap, ledgerSnap, runSnap] = await Promise.all([
      db.collection('email_automation_queue').where('automationExecutionId', '==', q).limit(10).get(),
      db.collection('email_envios').where('automationExecutionId', '==', q).limit(10).get(),
      db.collection('automation_engine_run_metrics').where('automationExecutionId', '==', q).limit(5).get(),
    ]);
    for (const doc of queueSnap.docs) {
      const data = doc.data();
      pushUnique(results, {
        kind: 'queue',
        id: doc.id,
        at: data.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        summary: `Queue ${data.status} · ${data.emailTipo}`,
        organizationId: data.organizationId,
        leadId: data.leadId,
        automationExecutionId: q,
      }, seen);
    }
    for (const doc of ledgerSnap.docs) {
      const data = doc.data();
      pushUnique(results, {
        kind: 'ledger',
        id: doc.id,
        at: data.enviadoEm?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
        summary: `Ledger ${data.status}`,
        automationExecutionId: q,
      }, seen);
    }
    for (const doc of runSnap.docs) {
      const data = doc.data();
      pushUnique(results, {
        kind: 'queue',
        id: doc.id,
        at: data.finishedAt ?? new Date().toISOString(),
        summary: `Run ${data.channel} · ${data.engine}`,
        organizationId: data.organizationId,
        automationExecutionId: q,
      }, seen);
    }
    return results.slice(0, limit);
  }

  const [queueByLead, queueByOrg, queueByDoctor, ledgerByLead] = await Promise.all([
    db.collection('email_automation_queue').where('leadId', '==', q).limit(15).get(),
    db.collection('email_automation_queue').where('organizationId', '==', q).limit(15).get(),
    db.collection('email_automation_queue').where('doctorId', '==', q).limit(15).get(),
    db.collection('email_envios').where('leadId', '==', q).limit(15).get(),
  ]);

  for (const doc of [...queueByLead.docs, ...queueByOrg.docs, ...queueByDoctor.docs]) {
    const data = doc.data();
    pushUnique(results, {
      kind: 'queue',
      id: doc.id,
      at: data.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      summary: `${data.emailTipo} · ${data.status}`,
      organizationId: data.organizationId,
      leadId: data.leadId,
      doctorId: data.doctorId || undefined,
      email: data.leadEmail,
      automationExecutionId: data.automationExecutionId,
    }, seen);
  }

  for (const doc of ledgerByLead.docs) {
    const data = doc.data();
    pushUnique(results, {
      kind: 'ledger',
      id: doc.id,
      at: data.enviadoEm?.toDate?.()?.toISOString?.() ?? new Date().toISOString(),
      summary: `Ledger ${data.emailTipo}`,
      leadId: data.leadId,
      email: data.leadEmail,
      automationExecutionId: data.automationExecutionId,
    }, seen);
  }

  return results.slice(0, limit);
}
