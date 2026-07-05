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
  SOURCES_ADMIN_EMAIL,
  validateOftreviewSource,
  type OftreviewSource,
  type OftreviewSourceDoc,
} from '@/types/oftpaySources';

const COLLECTION_NAME = 'oftreviewSources';

export class OftpaySourcesPermissionError extends Error {
  constructor(message = 'Acesso negado: apenas administrador.') {
    super(message);
    this.name = 'OftpaySourcesPermissionError';
  }
}

export class OftpaySourcesValidationError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join(' '));
    this.name = 'OftpaySourcesValidationError';
    this.errors = errors;
  }
}

function assertAdmin(currentUserEmail: string | null | undefined): void {
  if (!currentUserEmail || currentUserEmail.toLowerCase() !== SOURCES_ADMIN_EMAIL.toLowerCase()) {
    throw new OftpaySourcesPermissionError();
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

function fromFirestore(id: string, data: Record<string, unknown>): OftreviewSourceDoc {
  const paginaRaw = data.pagina;
  const pagina =
    typeof paginaRaw === 'number' && Number.isFinite(paginaRaw)
      ? paginaRaw
      : typeof paginaRaw === 'string' && paginaRaw.trim()
        ? parseInt(paginaRaw, 10) || undefined
        : undefined;

  return {
    id,
    apostilaTitulo: String(data.apostilaTitulo ?? ''),
    ...(pagina != null ? { pagina } : {}),
    tema: String(data.tema ?? ''),
    subtema: data.subtema != null ? String(data.subtema) : undefined,
    ...(data.knowledgeMapId != null && String(data.knowledgeMapId).trim()
      ? { knowledgeMapId: String(data.knowledgeMapId).trim() }
      : {}),
    ...(data.capituloTitulo != null && String(data.capituloTitulo).trim()
      ? { capituloTitulo: String(data.capituloTitulo).trim() }
      : {}),
    trecho: String(data.trecho ?? ''),
    observacoes: data.observacoes != null ? String(data.observacoes) : undefined,
    criadoPor: String(data.criadoPor ?? ''),
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

function toFirestorePayload(
  source: OftreviewSource,
  timestamps: { createdAt?: Timestamp; updatedAt: Timestamp }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    apostilaTitulo: source.apostilaTitulo.trim(),
    tema: source.tema.trim(),
    trecho: source.trecho.trim(),
    criadoPor: source.criadoPor,
    updatedAt: timestamps.updatedAt,
  };

  if (source.pagina != null && Number.isFinite(source.pagina)) {
    payload.pagina = source.pagina;
  }
  if (source.subtema?.trim()) {
    payload.subtema = source.subtema.trim();
  }
  if (source.knowledgeMapId?.trim()) {
    payload.knowledgeMapId = source.knowledgeMapId.trim();
  }
  if (source.capituloTitulo?.trim()) {
    payload.capituloTitulo = source.capituloTitulo.trim();
  }
  if (source.observacoes?.trim()) {
    payload.observacoes = source.observacoes.trim();
  }
  if (timestamps.createdAt) {
    payload.createdAt = timestamps.createdAt;
  }

  return payload;
}

/** Leitura aberta — biblioteca consultável por qualquer cliente com acesso ao Firestore. */
export async function listSources(): Promise<OftreviewSourceDoc[]> {
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
  return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function createSource(
  source: Omit<OftreviewSource, 'id' | 'createdAt' | 'updatedAt'>,
  currentUserEmail: string
): Promise<string> {
  assertAdmin(currentUserEmail);

  const normalized: OftreviewSource = {
    ...source,
    apostilaTitulo: source.apostilaTitulo.trim(),
    tema: (source.capituloTitulo?.trim() || source.tema).trim(),
    trecho: source.trecho.trim(),
    criadoPor: currentUserEmail,
  };

  const validation = validateOftreviewSource(normalized);
  if (!validation.valid) {
    throw new OftpaySourcesValidationError(validation.errors);
  }

  const now = Timestamp.now();
  const payload = toFirestorePayload(normalized, { createdAt: now, updatedAt: now });
  const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
  return ref.id;
}

export async function updateSource(
  id: string,
  patch: Partial<OftreviewSource>,
  currentUserEmail: string
): Promise<void> {
  assertAdmin(currentUserEmail);

  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Trecho não encontrado.');
  }

  const existing = fromFirestore(id, snap.data() as Record<string, unknown>);
  const merged: OftreviewSource = {
    ...existing,
    ...patch,
    criadoPor: existing.criadoPor,
  };

  const validation = validateOftreviewSource(merged);
  if (!validation.valid) {
    throw new OftpaySourcesValidationError(validation.errors);
  }

  const now = Timestamp.now();
  const payload = toFirestorePayload(merged, { updatedAt: now });
  delete payload.createdAt;
  await updateDoc(ref, payload);
}

export async function deleteSource(id: string, currentUserEmail: string): Promise<void> {
  assertAdmin(currentUserEmail);
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}
