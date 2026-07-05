import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  KNOWLEDGE_MAP_ADMIN_EMAIL,
  normalizeKnowledgeMapCapitulos,
  validateKnowledgeMap,
  type OftreviewKnowledgeMap,
  type OftreviewKnowledgeMapDoc,
} from '@/types/oftpayKnowledgeMap';

const COLLECTION_NAME = 'oftreviewKnowledgeMap';

export class OftpayKnowledgeMapPermissionError extends Error {
  constructor(message = 'Acesso negado: apenas administrador.') {
    super(message);
    this.name = 'OftpayKnowledgeMapPermissionError';
  }
}

export class OftpayKnowledgeMapValidationError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join(' '));
    this.name = 'OftpayKnowledgeMapValidationError';
    this.errors = errors;
  }
}

function assertAdmin(currentUserEmail: string | null | undefined): void {
  if (!currentUserEmail || currentUserEmail.toLowerCase() !== KNOWLEDGE_MAP_ADMIN_EMAIL.toLowerCase()) {
    throw new OftpayKnowledgeMapPermissionError();
  }
}

function timestampToMillis(value: unknown): number | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function normalizeCapitulosFromFirestore(raw: unknown): OftreviewKnowledgeMap['capitulos'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const cap = item as Record<string, unknown>;
    const subtemasRaw = cap.subtemas;
    const subtemas = Array.isArray(subtemasRaw)
      ? subtemasRaw.map((s) => String(s).trim()).filter(Boolean)
      : [];
    return {
      titulo: String(cap.titulo ?? ''),
      subtemas,
    };
  });
}

function fromFirestore(id: string, data: Record<string, unknown>): OftreviewKnowledgeMapDoc {
  return {
    id,
    apostilaTitulo: String(data.apostilaTitulo ?? ''),
    categoria: data.categoria != null ? String(data.categoria) : undefined,
    capitulos: normalizeCapitulosFromFirestore(data.capitulos),
    criadoPor: String(data.criadoPor ?? ''),
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

function toFirestorePayload(
  map: OftreviewKnowledgeMap,
  timestamps: { createdAt?: Timestamp; updatedAt: Timestamp }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    apostilaTitulo: map.apostilaTitulo.trim(),
    capitulos: normalizeKnowledgeMapCapitulos(map.capitulos),
    criadoPor: map.criadoPor,
    updatedAt: timestamps.updatedAt,
  };

  if (map.categoria?.trim()) {
    payload.categoria = map.categoria.trim();
  }

  if (timestamps.createdAt) {
    payload.createdAt = timestamps.createdAt;
  }

  return payload;
}

/** Leitura aberta — catálogo oficial consultável por qualquer usuário autenticado ou anônimo via SDK. */
export async function listKnowledgeMaps(): Promise<OftreviewKnowledgeMapDoc[]> {
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
  return items.sort((a, b) =>
    a.apostilaTitulo.localeCompare(b.apostilaTitulo, 'pt-BR', { sensitivity: 'base' })
  );
}

export async function createKnowledgeMap(
  map: Omit<OftreviewKnowledgeMap, 'id' | 'createdAt' | 'updatedAt'>,
  currentUserEmail: string
): Promise<string> {
  assertAdmin(currentUserEmail);

  const normalized: OftreviewKnowledgeMap = {
    ...map,
    apostilaTitulo: map.apostilaTitulo.trim(),
    capitulos: normalizeKnowledgeMapCapitulos(map.capitulos),
    criadoPor: currentUserEmail,
  };

  const validation = validateKnowledgeMap(normalized);
  if (!validation.valid) {
    throw new OftpayKnowledgeMapValidationError(validation.errors);
  }

  const now = Timestamp.now();
  const payload = toFirestorePayload(normalized, { createdAt: now, updatedAt: now });
  const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
  return ref.id;
}

export async function updateKnowledgeMap(
  id: string,
  patch: Partial<OftreviewKnowledgeMap>,
  currentUserEmail: string
): Promise<void> {
  assertAdmin(currentUserEmail);

  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Mapa não encontrado.');
  }

  const existing = fromFirestore(id, snap.data() as Record<string, unknown>);
  const merged: OftreviewKnowledgeMap = {
    ...existing,
    ...patch,
    criadoPor: existing.criadoPor,
    capitulos: patch.capitulos
      ? normalizeKnowledgeMapCapitulos(patch.capitulos)
      : existing.capitulos,
  };

  const validation = validateKnowledgeMap(merged);
  if (!validation.valid) {
    throw new OftpayKnowledgeMapValidationError(validation.errors);
  }

  const now = Timestamp.now();
  const payload = toFirestorePayload(merged, { updatedAt: now });
  delete payload.createdAt;
  await updateDoc(ref, payload);
}

export async function deleteKnowledgeMap(id: string, currentUserEmail: string): Promise<void> {
  assertAdmin(currentUserEmail);
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
