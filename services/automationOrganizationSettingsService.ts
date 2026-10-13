import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  AUTOMATION_ORGANIZATION_SETTINGS_SEED,
  buildAutomationOrganizationSettingId,
  mergeAutomationOrganizationSettings,
  resolveDefaultTemplateIdForAutomation,
} from '@/lib/metaadmingeral/automationOrganizationSettings';
import { getAutomationDefinitionById } from '@/lib/metaadmingeral/automationCenterCatalog';
import type { AutomationChannel, AutomationOrganizationSetting } from '@/types/automationCenter';

const COLLECTION = 'automationOrganizationSettings';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate();
  }
  return undefined;
}

function docToSetting(docId: string, data: Record<string, unknown>): AutomationOrganizationSetting {
  const organizationId = String(data.organizationId ?? '');
  const automationId = String(data.automationId ?? '');
  const automation = getAutomationDefinitionById(automationId);

  return {
    id: docId || buildAutomationOrganizationSettingId(organizationId, automationId),
    organizationId,
    automationId,
    enabled: data.enabled === true,
    channel: (data.channel as AutomationChannel) ?? automation?.channel ?? 'whatsapp',
    templateId: typeof data.templateId === 'string' ? data.templateId : undefined,
    createdAt: (toDate(data.createdAt) ?? new Date()).toISOString(),
    updatedAt: (toDate(data.updatedAt) ?? new Date()).toISOString(),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

async function fetchFirestoreSettings(organizationId?: string): Promise<AutomationOrganizationSetting[]> {
  const db = getFirestoreAdmin();
  const collection = db.collection(COLLECTION);

  const snap = organizationId?.trim()
    ? await collection.where('organizationId', '==', organizationId.trim()).get()
    : await collection.get();

  return snap.docs.map((doc) => docToSetting(doc.id, doc.data() as Record<string, unknown>));
}

export async function listAutomationOrganizationSettings(): Promise<AutomationOrganizationSetting[]> {
  const firestoreSettings = await fetchFirestoreSettings();
  return mergeAutomationOrganizationSettings(firestoreSettings);
}

export async function listSettingsByOrganizationId(
  organizationId: string,
): Promise<AutomationOrganizationSetting[]> {
  const id = organizationId?.trim();
  if (!id) return [];

  const firestoreSettings = await fetchFirestoreSettings(id);
  return mergeAutomationOrganizationSettings(firestoreSettings, id);
}

export async function getAutomationOrganizationSetting(
  organizationId: string,
  automationId: string,
): Promise<AutomationOrganizationSetting | undefined> {
  const orgId = organizationId?.trim();
  const autoId = automationId?.trim();
  if (!orgId || !autoId) return undefined;

  const docId = buildAutomationOrganizationSettingId(orgId, autoId);
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(docId).get();

  if (snap.exists) {
    return docToSetting(snap.id, snap.data() as Record<string, unknown>);
  }

  return AUTOMATION_ORGANIZATION_SETTINGS_SEED.find(
    (item) => item.organizationId === orgId && item.automationId === autoId,
  );
}

export async function upsertAutomationOrganizationSetting(input: {
  organizationId: string;
  automationId: string;
  enabled: boolean;
  updatedBy: string;
}): Promise<AutomationOrganizationSetting> {
  const organizationId = input.organizationId?.trim();
  const automationId = input.automationId?.trim();
  const updatedBy = input.updatedBy?.trim();

  if (!organizationId || !automationId) {
    throw new Error('organizationId e automationId são obrigatórios.');
  }
  if (!updatedBy) {
    throw new Error('updatedBy é obrigatório.');
  }

  const automation = getAutomationDefinitionById(automationId);
  if (!automation) {
    throw new Error(`Automação não encontrada: ${automationId}`);
  }

  const docId = buildAutomationOrganizationSettingId(organizationId, automationId);
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(docId);
  const existing = await ref.get();
  const templateId = resolveDefaultTemplateIdForAutomation(automationId);
  const now = FieldValue.serverTimestamp();

  await ref.set(
    {
      organizationId,
      automationId,
      enabled: input.enabled === true,
      channel: automation.channel,
      templateId: templateId ?? null,
      updatedBy,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  const saved = await ref.get();
  return docToSetting(saved.id, saved.data() as Record<string, unknown>);
}
