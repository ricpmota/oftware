import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  buildEmailAutomationEngineDocId,
  EMAIL_AUTOMATION_ENGINE_DEFAULT,
  type EmailAutomationEngine,
  type EmailAutomationEngineSetting,
  isEmailAutomationEngine,
} from '@/types/emailAutomationEngine';

/** Coleção: automation_email_engine — governança de cutover por organização. */
const COLLECTION = 'automation_email_engine';

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function docToSetting(docId: string, data: Record<string, unknown>): EmailAutomationEngineSetting {
  const engineRaw = data['automation.email.engine'] ?? data.engine;
  const engine = isEmailAutomationEngine(engineRaw)
    ? engineRaw
    : EMAIL_AUTOMATION_ENGINE_DEFAULT;

  return {
    organizationId: String(data.organizationId ?? docId),
    engine,
    updatedAt: toIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

/**
 * Retorna o motor configurado para a organização.
 * Default: `legacy` (todas as orgs iniciam no motor legado até promoção explícita).
 * ETAPA pré-cutover: não altera envio — ETAPA 2 usa emailAutomationEngineProcessor.
 */
export async function getEmailAutomationEngine(
  organizationId?: string,
): Promise<EmailAutomationEngine> {
  const orgId = organizationId?.trim() || getDefaultOrganizationId();
  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(buildEmailAutomationEngineDocId(orgId))
    .get();

  if (!snap.exists) return EMAIL_AUTOMATION_ENGINE_DEFAULT;
  return docToSetting(snap.id, snap.data() as Record<string, unknown>).engine;
}

export async function getEmailAutomationEngineSetting(
  organizationId: string,
): Promise<EmailAutomationEngineSetting> {
  const orgId = organizationId?.trim();
  if (!orgId) {
    return {
      organizationId: getDefaultOrganizationId(),
      engine: EMAIL_AUTOMATION_ENGINE_DEFAULT,
      updatedAt: new Date().toISOString(),
    };
  }

  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(buildEmailAutomationEngineDocId(orgId))
    .get();

  if (!snap.exists) {
    return {
      organizationId: orgId,
      engine: EMAIL_AUTOMATION_ENGINE_DEFAULT,
      updatedAt: new Date().toISOString(),
    };
  }

  return docToSetting(snap.id, snap.data() as Record<string, unknown>);
}

export async function listEmailAutomationEngineSettings(): Promise<EmailAutomationEngineSetting[]> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).get();
  return snap.docs.map((doc) => docToSetting(doc.id, doc.data() as Record<string, unknown>));
}

export async function setEmailAutomationEngine(params: {
  organizationId: string;
  engine: EmailAutomationEngine;
  updatedBy: string;
}): Promise<EmailAutomationEngineSetting> {
  const orgId = params.organizationId?.trim();
  const updatedBy = params.updatedBy?.trim();
  if (!orgId) throw new Error('organizationId é obrigatório.');
  if (!updatedBy) throw new Error('updatedBy é obrigatório.');
  if (!isEmailAutomationEngine(params.engine)) {
    throw new Error('engine inválido. Use legacy, shadow ou queue.');
  }

  const ref = getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(buildEmailAutomationEngineDocId(orgId));

  await ref.set(
    {
      organizationId: orgId,
      engine: params.engine,
      'automation.email.engine': params.engine,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    },
    { merge: true },
  );

  const saved = await ref.get();
  return docToSetting(saved.id, saved.data() as Record<string, unknown>);
}
