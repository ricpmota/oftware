import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { isMetaAdminGeralEmail } from '@/lib/meta/anamneseInteligenteGate';
import { CONTRATO_TIRZEPATIDA_TEMPLATE } from '@/lib/contratos/contratoTirzepatidaTemplate';
import {
  CONTRATO_PADRAO_FIRESTORE_COLLECTION,
  CONTRATO_PADRAO_MEDICO_PACIENTE_DOC_ID,
  CONTRATO_PADRAO_VERSOES_SUBCOLLECTION,
} from '@/lib/contratos/contratoPadraoConstants';
import type {
  ContratoPadraoEditor,
  ContratoPadraoMedicoPacienteConfig,
  ContratoPadraoUpdatedBy,
  ContratoPadraoVersaoCompleta,
  ContratoPadraoVersaoResumo,
} from '@/lib/contratos/contratoPadraoTypes';

let cachedTemplate: string | null | undefined;
let cacheExpiresAt = 0;
const CACHE_MS = 60_000;

function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

function mapEditor(raw: unknown): ContratoPadraoEditor | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const uid = typeof o.uid === 'string' ? o.uid.trim() : '';
  const email = typeof o.email === 'string' ? o.email.trim() : '';
  if (!uid || !email) return null;
  return {
    uid,
    email,
    displayName: typeof o.displayName === 'string' ? o.displayName.trim() : email,
  };
}

function mapUpdatedBy(raw: unknown): ContratoPadraoUpdatedBy | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const uid = typeof o.uid === 'string' ? o.uid.trim() : '';
  const email = typeof o.email === 'string' ? o.email.trim() : '';
  if (!uid || !email) return null;
  return {
    uid,
    email,
    displayName: typeof o.displayName === 'string' ? o.displayName.trim() : email,
  };
}

function toIsoDate(raw: unknown): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof (raw as { toDate?: () => Date }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof raw === 'string' ? raw : null;
}

function mainDocRef() {
  return getFirestoreAdmin()
    .collection(CONTRATO_PADRAO_FIRESTORE_COLLECTION)
    .doc(CONTRATO_PADRAO_MEDICO_PACIENTE_DOC_ID);
}

function docToConfig(data: FirebaseFirestore.DocumentData | undefined): ContratoPadraoMedicoPacienteConfig {
  const template =
    typeof data?.template === 'string' && data.template.trim()
      ? data.template
      : CONTRATO_TIRZEPATIDA_TEMPLATE;
  const editors = Array.isArray(data?.editors)
    ? data.editors.map(mapEditor).filter((e): e is ContratoPadraoEditor => e !== null)
    : [];
  return {
    template,
    editors,
    updatedAt: toIsoDate(data?.updatedAt),
    updatedBy: mapUpdatedBy(data?.updatedBy),
    currentVersionId:
      typeof data?.currentVersionId === 'string' ? data.currentVersionId.trim() || null : null,
    currentVersionNumber:
      typeof data?.versionCounter === 'number' && data.versionCounter > 0
        ? data.versionCounter
        : null,
  };
}

function mapVersaoResumo(
  id: string,
  data: FirebaseFirestore.DocumentData,
  currentVersionId: string | null
): ContratoPadraoVersaoResumo | null {
  const createdBy = mapUpdatedBy(data.createdBy);
  const versionNumber = typeof data.versionNumber === 'number' ? data.versionNumber : 0;
  const template = typeof data.template === 'string' ? data.template : '';
  if (!createdBy || versionNumber <= 0) return null;
  const createdAt = toIsoDate(data.createdAt);
  if (!createdAt) return null;
  return {
    id,
    versionNumber,
    createdAt,
    createdBy,
    isCurrent: currentVersionId === id,
    templateLength: template.length,
  };
}

export function invalidateContratoPadraoTemplateCache(): void {
  cachedTemplate = undefined;
  cacheExpiresAt = 0;
}

export async function getContratoPadraoMedicoPacienteConfig(): Promise<ContratoPadraoMedicoPacienteConfig> {
  const snap = await mainDocRef().get();
  return docToConfig(snap.data());
}

export async function getContratoPadraoTemplateTextFromFirestore(): Promise<string> {
  const now = Date.now();
  if (cachedTemplate !== undefined && cacheExpiresAt > now) {
    return cachedTemplate ?? CONTRATO_TIRZEPATIDA_TEMPLATE;
  }
  const config = await getContratoPadraoMedicoPacienteConfig();
  const template = config.template.trim() || CONTRATO_TIRZEPATIDA_TEMPLATE;
  cachedTemplate = template;
  cacheExpiresAt = now + CACHE_MS;
  return template;
}

export function isContratoPadraoEditor(
  config: ContratoPadraoMedicoPacienteConfig,
  uid: string,
  email?: string | null
): boolean {
  const normalizedUid = uid.trim();
  const normalizedEmail = normalizeEmail(email);
  if (isMetaAdminGeralEmail(email)) return true;
  return config.editors.some(
    (editor) =>
      editor.uid === normalizedUid || normalizeEmail(editor.email) === normalizedEmail
  );
}

export async function verifyAuthToken(token: string | null): Promise<
  | { ok: false; status: number; error: string }
  | { ok: true; uid: string; email: string; displayName: string }
> {
  if (!token) {
    return { ok: false, status: 401, error: 'Token obrigatório.' };
  }
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    const email = decoded.email || '';
    if (!email) {
      return { ok: false, status: 401, error: 'Usuário sem e-mail.' };
    }
    return {
      ok: true,
      uid: decoded.uid,
      email,
      displayName: decoded.name || email,
    };
  } catch {
    return { ok: false, status: 401, error: 'Token inválido.' };
  }
}

async function persistTemplateAsNewVersion(args: {
  template: string;
  updatedBy: ContratoPadraoUpdatedBy;
  editors: ContratoPadraoEditor[];
}): Promise<ContratoPadraoMedicoPacienteConfig> {
  const db = getFirestoreAdmin();
  const ref = mainDocRef();
  const now = new Date();

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = docToConfig(snap.data());
    const editors = args.editors.length ? args.editors : existing.editors;
    const prevCounter = snap.data()?.versionCounter;
    const nextVersion =
      typeof prevCounter === 'number' && prevCounter > 0 ? prevCounter + 1 : 1;

    const versionRef = ref.collection(CONTRATO_PADRAO_VERSOES_SUBCOLLECTION).doc();
    tx.set(versionRef, {
      versionNumber: nextVersion,
      template: args.template,
      createdAt: now,
      createdBy: args.updatedBy,
    });

    tx.set(
      ref,
      {
        template: args.template,
        editors,
        updatedAt: now,
        updatedBy: args.updatedBy,
        versionCounter: nextVersion,
        currentVersionId: versionRef.id,
      },
      { merge: true }
    );

    return {
      template: args.template,
      editors,
      updatedAt: now.toISOString(),
      updatedBy: args.updatedBy,
      currentVersionId: versionRef.id,
      currentVersionNumber: nextVersion,
    } satisfies ContratoPadraoMedicoPacienteConfig;
  });

  invalidateContratoPadraoTemplateCache();
  return result;
}

/** Garante que o estado atual sem histórico vire a versão 1 no Firestore. */
async function ensureInitialVersionSnapshot(): Promise<void> {
  const ref = mainDocRef();
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data()!;
  if (typeof data.versionCounter === 'number' && data.versionCounter > 0) return;

  const versionsSnap = await ref.collection(CONTRATO_PADRAO_VERSOES_SUBCOLLECTION).limit(1).get();
  if (!versionsSnap.empty) return;

  const config = docToConfig(data);
  const template = config.template.trim();
  if (!template) return;

  const now = new Date();
  const createdBy =
    config.updatedBy ??
    ({
      uid: 'sistema',
      email: 'sistema@oftware.com.br',
      displayName: 'Versão inicial',
    } satisfies ContratoPadraoUpdatedBy);

  const versionRef = ref.collection(CONTRATO_PADRAO_VERSOES_SUBCOLLECTION).doc();
  await versionRef.set({
    versionNumber: 1,
    template,
    createdAt: config.updatedAt ? new Date(config.updatedAt) : now,
    createdBy,
  });

  await ref.set(
    {
      versionCounter: 1,
      currentVersionId: versionRef.id,
    },
    { merge: true }
  );
}

export async function saveContratoPadraoMedicoPacienteTemplate(args: {
  template: string;
  updatedBy: ContratoPadraoUpdatedBy;
}): Promise<ContratoPadraoMedicoPacienteConfig> {
  const template = args.template.trim();
  if (!template) {
    throw new Error('O texto do contrato não pode ficar vazio.');
  }

  await ensureInitialVersionSnapshot();

  const existing = await getContratoPadraoMedicoPacienteConfig();
  return persistTemplateAsNewVersion({
    template,
    updatedBy: args.updatedBy,
    editors: existing.editors,
  });
}

export async function saveContratoPadraoMedicoPacienteEditors(
  editors: ContratoPadraoEditor[]
): Promise<ContratoPadraoMedicoPacienteConfig> {
  const normalized = editors
    .map(mapEditor)
    .filter((e): e is ContratoPadraoEditor => e !== null);

  const ref = mainDocRef();
  const existing = await ref.get();
  const template = existing.exists
    ? docToConfig(existing.data()).template
    : CONTRATO_TIRZEPATIDA_TEMPLATE;

  const now = new Date();
  await ref.set(
    {
      template,
      editors: normalized,
      updatedAt: now,
    },
    { merge: true }
  );

  invalidateContratoPadraoTemplateCache();
  const config = docToConfig((await ref.get()).data());
  return {
    ...config,
    editors: normalized,
    updatedAt: now.toISOString(),
  };
}

export async function listContratoPadraoVersoes(limit = 50): Promise<ContratoPadraoVersaoResumo[]> {
  await ensureInitialVersionSnapshot();

  const ref = mainDocRef();
  const mainSnap = await ref.get();
  const currentVersionId =
    typeof mainSnap.data()?.currentVersionId === 'string'
      ? mainSnap.data()!.currentVersionId
      : null;

  const snap = await ref
    .collection(CONTRATO_PADRAO_VERSOES_SUBCOLLECTION)
    .orderBy('versionNumber', 'desc')
    .limit(limit)
    .get();

  return snap.docs
    .map((doc) => mapVersaoResumo(doc.id, doc.data(), currentVersionId))
    .filter((v): v is ContratoPadraoVersaoResumo => v !== null);
}

export async function getContratoPadraoVersao(
  versionId: string
): Promise<ContratoPadraoVersaoCompleta | null> {
  const id = versionId.trim();
  if (!id) return null;

  const ref = mainDocRef();
  const mainSnap = await ref.get();
  const currentVersionId =
    typeof mainSnap.data()?.currentVersionId === 'string'
      ? mainSnap.data()!.currentVersionId
      : null;

  const snap = await ref.collection(CONTRATO_PADRAO_VERSOES_SUBCOLLECTION).doc(id).get();
  if (!snap.exists) return null;

  const resumo = mapVersaoResumo(snap.id, snap.data(), currentVersionId);
  if (!resumo) return null;

  const template = typeof snap.data()?.template === 'string' ? snap.data()!.template : '';
  return { ...resumo, template };
}

export async function restaurarContratoPadraoVersao(args: {
  versionId: string;
  updatedBy: ContratoPadraoUpdatedBy;
}): Promise<ContratoPadraoMedicoPacienteConfig> {
  const versao = await getContratoPadraoVersao(args.versionId);
  if (!versao) {
    throw new Error('Versão não encontrada.');
  }

  const template = versao.template.trim();
  if (!template) {
    throw new Error('A versão selecionada está vazia.');
  }

  const config = await getContratoPadraoMedicoPacienteConfig();
  return persistTemplateAsNewVersion({
    template,
    updatedBy: args.updatedBy,
    editors: config.editors,
  });
}
