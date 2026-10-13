import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAutomationDefinitionById } from '@/lib/metaadmingeral/automationCenterCatalog';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  buildAutomationTemplatePreviewBody,
  getAutomationTemplateSeedById,
  mergeAutomationTemplates,
  resolveEffectiveAutomationTemplate,
} from '@/lib/metaadmingeral/automationCenterTemplates';
import { findDisallowedTemplateVariable } from '@/lib/metaadmingeral/renderAutomationTemplate';
import type { AutomationTemplate, AutomationTemplateStatus } from '@/types/automationCenter';

const COLLECTION = 'automationTemplates';

/**
 * Status efetivo do template. Quando a automação correspondente está ATIVA
 * (ou seja, já integrada ao envio real), o template é considerado Publicado
 * automaticamente — o status deixa de ser gerido manualmente. Um template
 * explicitamente Inativo continua Inativo.
 */
function withEffectiveTemplateStatus(template: AutomationTemplate): AutomationTemplate {
  if (template.status === 'inactive') return template;

  const automation = getAutomationDefinitionById(template.automationId);
  if (automation?.status === 'active' && template.status !== 'published') {
    return { ...template, status: 'published' };
  }
  return template;
}

export type UpsertAutomationTemplateInput = {
  id: string;
  name: string;
  description: string;
  status: AutomationTemplateStatus;
  body: string;
  updatedBy: string;
};

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

function docToTemplate(docId: string, data: Record<string, unknown>): AutomationTemplate {
  const seed = getAutomationTemplateSeedById(docId);

  return {
    id: docId,
    automationId: String(data.automationId ?? seed?.automationId ?? ''),
    name: String(data.name ?? seed?.name ?? ''),
    description: String(data.description ?? seed?.description ?? ''),
    channel: (data.channel as AutomationTemplate['channel']) ?? seed?.channel ?? 'whatsapp',
    category: (data.category as AutomationTemplate['category']) ?? seed?.category ?? 'jornada',
    status: (data.status as AutomationTemplateStatus) ?? seed?.status ?? 'draft',
    variables: Array.isArray(data.variables)
      ? data.variables.map((item) => String(item))
      : seed?.variables ?? [],
    body: String(data.body ?? seed?.body ?? ''),
    previewBody: String(data.previewBody ?? seed?.previewBody ?? ''),
    version: typeof data.version === 'number' ? data.version : seed?.version ?? 1,
    createdAt: (toDate(data.createdAt) ?? new Date(seed?.createdAt ?? Date.now())).toISOString(),
    updatedAt: (toDate(data.updatedAt) ?? new Date(seed?.updatedAt ?? Date.now())).toISOString(),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

async function fetchFirestoreTemplates(): Promise<AutomationTemplate[]> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).get();
  return snap.docs.map((doc) => docToTemplate(doc.id, doc.data() as Record<string, unknown>));
}

async function getFirestoreTemplateById(id: string): Promise<AutomationTemplate | undefined> {
  const templateId = id?.trim();
  if (!templateId) return undefined;

  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(templateId).get();
  if (!snap.exists) return undefined;

  return docToTemplate(snap.id, snap.data() as Record<string, unknown>);
}

function resolveBaseTemplate(id: string): AutomationTemplate {
  const seed = getAutomationTemplateSeedById(id);
  if (!seed) {
    throw new Error(`Template não encontrado: ${id}`);
  }
  return seed;
}

function validateTemplateBody(body: string, allowedVariables: string[]): void {
  const error = findDisallowedTemplateVariable(body, allowedVariables);
  if (error) {
    throw new Error(error);
  }
}

async function writeTemplate(
  id: string,
  patch: Record<string, unknown>,
  options: { incrementVersion?: boolean } = {},
): Promise<AutomationTemplate> {
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(id);
  const existingFirestore = await ref.get();
  const seed = resolveBaseTemplate(id);
  const existing = existingFirestore.exists
    ? docToTemplate(existingFirestore.id, existingFirestore.data() as Record<string, unknown>)
    : seed;
  const effective = resolveEffectiveAutomationTemplate(seed, existingFirestore.exists ? existing : undefined) ?? existing;

  const body = typeof patch.body === 'string' ? patch.body : effective.body;
  const variables = Array.isArray(patch.variables)
    ? (patch.variables as string[])
    : effective.variables;

  validateTemplateBody(body, variables);

  const previewBody = buildAutomationTemplatePreviewBody(body, variables);
  const currentVersion = existingFirestore.exists ? existing.version : seed.version;
  const version = options.incrementVersion === false ? currentVersion : currentVersion + 1;
  const now = FieldValue.serverTimestamp();

  await ref.set(
    {
      id,
      automationId: existing.automationId,
      name: typeof patch.name === 'string' ? patch.name : effective.name,
      description: typeof patch.description === 'string' ? patch.description : effective.description,
      channel: existing.channel,
      category: existing.category,
      status: (patch.status as AutomationTemplateStatus) ?? existing.status,
      variables,
      body,
      previewBody,
      version,
      updatedBy: typeof patch.updatedBy === 'string' ? patch.updatedBy : existing.updatedBy ?? null,
      updatedAt: now,
      ...(existingFirestore.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  const saved = await ref.get();
  return docToTemplate(saved.id, saved.data() as Record<string, unknown>);
}

export async function listAutomationTemplates(): Promise<AutomationTemplate[]> {
  const firestoreTemplates = await fetchFirestoreTemplates();
  return mergeAutomationTemplates(firestoreTemplates).map(withEffectiveTemplateStatus);
}

export async function getAutomationTemplateById(id: string): Promise<AutomationTemplate | undefined> {
  const templateId = id?.trim();
  if (!templateId) return undefined;

  const seed = getAutomationTemplateSeedById(templateId);
  const firestoreTemplate = await getFirestoreTemplateById(templateId);
  const resolved = resolveEffectiveAutomationTemplate(seed, firestoreTemplate);
  return resolved ? withEffectiveTemplateStatus(resolved) : undefined;
}

export async function upsertAutomationTemplate(
  input: UpsertAutomationTemplateInput,
): Promise<AutomationTemplate> {
  const id = input.id?.trim();
  const name = input.name?.trim();
  const description = input.description?.trim() ?? '';
  const updatedBy = input.updatedBy?.trim();

  if (!id) throw new Error('id é obrigatório.');
  if (!name) throw new Error('name é obrigatório.');
  if (!updatedBy) throw new Error('updatedBy é obrigatório.');
  if (!input.body?.trim()) throw new Error('body é obrigatório.');

  resolveBaseTemplate(id);

  return writeTemplate(id, {
    name,
    description,
    status: input.status,
    body: input.body,
    updatedBy,
  });
}

export async function updateAutomationTemplateBody(
  id: string,
  body: string,
  updatedBy: string,
): Promise<AutomationTemplate> {
  const templateId = id?.trim();
  const editor = updatedBy?.trim();

  if (!templateId) throw new Error('id é obrigatório.');
  if (!body?.trim()) throw new Error('body é obrigatório.');
  if (!editor) throw new Error('updatedBy é obrigatório.');

  const base = resolveBaseTemplate(templateId);
  const existing = (await getFirestoreTemplateById(templateId)) ?? base;

  return writeTemplate(templateId, {
    body,
    updatedBy: editor,
    name: existing.name,
    description: existing.description,
    status: existing.status,
  });
}

export async function publishAutomationTemplate(
  id: string,
  updatedBy: string,
): Promise<AutomationTemplate> {
  const templateId = id?.trim();
  const editor = updatedBy?.trim();

  if (!templateId) throw new Error('id é obrigatório.');
  if (!editor) throw new Error('updatedBy é obrigatório.');

  const existing = (await getAutomationTemplateById(templateId)) ?? resolveBaseTemplate(templateId);

  return writeTemplate(templateId, {
    name: existing.name,
    description: existing.description,
    body: existing.body,
    status: 'published',
    updatedBy: editor,
  });
}

export async function disableAutomationTemplate(
  id: string,
  updatedBy: string,
): Promise<AutomationTemplate> {
  const templateId = id?.trim();
  const editor = updatedBy?.trim();

  if (!templateId) throw new Error('id é obrigatório.');
  if (!editor) throw new Error('updatedBy é obrigatório.');

  const existing = (await getAutomationTemplateById(templateId)) ?? resolveBaseTemplate(templateId);

  return writeTemplate(templateId, {
    name: existing.name,
    description: existing.description,
    body: existing.body,
    status: 'inactive',
    updatedBy: editor,
  });
}