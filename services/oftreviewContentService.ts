import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  OFTREVIEW_CONTENT_ADMIN_EMAIL,
  OFTREVIEW_CONTENT_COLLECTION,
  parseTopicMappingProgress,
  toContentSummary,
  type OftreviewContentDoc,
  type OftreviewContentSummary,
} from '@/types/oftreviewContent';

export class OftreviewContentPermissionError extends Error {
  constructor(message = 'Acesso negado: apenas administrador.') {
    super(message);
    this.name = 'OftreviewContentPermissionError';
  }
}

function assertAdmin(currentUserEmail: string | null | undefined): void {
  if (
    !currentUserEmail ||
    currentUserEmail.toLowerCase() !== OFTREVIEW_CONTENT_ADMIN_EMAIL.toLowerCase()
  ) {
    throw new OftreviewContentPermissionError();
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

function fromFirestore(id: string, data: Record<string, unknown>): OftreviewContentDoc {
  const pagesRaw = Array.isArray(data.pages) ? data.pages : [];
  const pages = pagesRaw.map((p, index) => {
    const row = p as Record<string, unknown>;
    const pageNum =
      typeof row.page === 'number' && Number.isFinite(row.page) ? row.page : index + 1;
    return {
      page: pageNum,
      content: String(row.content ?? ''),
    };
  });

  return {
    id,
    apostilaTitulo: String(data.apostilaTitulo ?? ''),
    sourcePath: String(data.sourcePath ?? ''),
    pages,
    totalPages:
      typeof data.totalPages === 'number' && Number.isFinite(data.totalPages)
        ? data.totalPages
        : pages.length,
    extractedAt: timestampToMillis(data.extractedAt),
    topicMappingProgress: parseTopicMappingProgress(data.topicMappingProgress),
  };
}

/** Lista conteúdos extraídos (ordenado por apostila no client). */
export async function listOftreviewContent(
  currentUserEmail?: string | null
): Promise<OftreviewContentSummary[]> {
  assertAdmin(currentUserEmail);
  const snap = await getDocs(collection(db, OFTREVIEW_CONTENT_COLLECTION));
  const items = snap.docs.map((d) =>
    toContentSummary(fromFirestore(d.id, d.data() as Record<string, unknown>))
  );
  return items.sort((a, b) =>
    a.apostilaTitulo.localeCompare(b.apostilaTitulo, 'pt-BR', { sensitivity: 'base' })
  );
}

export async function getOftreviewContentById(
  id: string,
  currentUserEmail?: string | null
): Promise<OftreviewContentDoc | null> {
  assertAdmin(currentUserEmail);
  const snap = await getDoc(doc(db, OFTREVIEW_CONTENT_COLLECTION, id));
  if (!snap.exists()) return null;
  return fromFirestore(snap.id, snap.data() as Record<string, unknown>);
}

/** Busca por título exato (útil após extração). */
export async function findOftreviewContentByTitulo(
  apostilaTitulo: string,
  currentUserEmail?: string | null
): Promise<OftreviewContentDoc | null> {
  assertAdmin(currentUserEmail);
  const titulo = apostilaTitulo.trim();
  if (!titulo) return null;

  const q = query(
    collection(db, OFTREVIEW_CONTENT_COLLECTION),
    where('apostilaTitulo', '==', titulo)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return fromFirestore(d.id, d.data() as Record<string, unknown>);
}
