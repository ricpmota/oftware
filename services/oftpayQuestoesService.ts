import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validateOftpayQuestao } from '@/lib/oftpay/questoes/validateQuestao';
import { reopenPlannedSubjectAfterQuestaoDelete } from '@/services/oftreviewApostilaTopicService';
import {
  QUESTOES_ADMIN_EMAIL,
  OFTREVIEW_APOSTILAS_GCS_PREFIX,
  type OftpayQuestao,
  type OftpayQuestaoAlternativa,
  type OftpayQuestaoFonte,
} from '@/types/oftpayQuestoes';

const COLLECTION_NAME = 'oftpayQuestoes';

export type OftpayQuestaoDoc = OftpayQuestao & { id: string };

export class OftpayQuestoesPermissionError extends Error {
  constructor(message = 'Acesso negado: apenas administrador.') {
    super(message);
    this.name = 'OftpayQuestoesPermissionError';
  }
}

export class OftpayQuestoesValidationError extends Error {
  errors: string[];
  warnings: string[];

  constructor(errors: string[], warnings: string[] = []) {
    super(errors.join(' '));
    this.name = 'OftpayQuestoesValidationError';
    this.errors = errors;
    this.warnings = warnings;
  }
}

function assertAdmin(currentUserEmail: string | null | undefined): void {
  if (!currentUserEmail || currentUserEmail.toLowerCase() !== QUESTOES_ADMIN_EMAIL.toLowerCase()) {
    throw new OftpayQuestoesPermissionError();
  }
}

function timestampToMillis(value: unknown): number | undefined {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function normalizeAlternativas(alternativas: OftpayQuestaoAlternativa[] | undefined): OftpayQuestaoAlternativa[] {
  return (alternativas ?? []).map((alt) => ({
    letra: alt.letra,
    texto: alt.texto ?? '',
    correta: Boolean(alt.correta),
  }));
}

function normalizeFonte(fonte: OftpayQuestaoFonte | undefined): OftpayQuestaoFonte {
  return {
    apostilaTitulo: fonte?.apostilaTitulo ?? '',
    pagina: fonte?.pagina ?? null,
    trechoBase: fonte?.trechoBase ?? '',
    uri: fonte?.uri,
    sourceType: 'pdf_bucket',
    bucketPath: fonte?.bucketPath ?? OFTREVIEW_APOSTILAS_GCS_PREFIX,
  };
}

function fromFirestore(id: string, data: Record<string, unknown>): OftpayQuestaoDoc {
  const fonteRaw = data.fonte as Record<string, unknown> | undefined;
  return {
    id,
    courseId: 'oftreview',
    tema: String(data.tema ?? ''),
    subtema: data.subtema != null ? String(data.subtema) : undefined,
    ...(data.knowledgeMapId != null && String(data.knowledgeMapId).trim()
      ? { knowledgeMapId: String(data.knowledgeMapId).trim() }
      : {}),
    ...(data.capituloTitulo != null && String(data.capituloTitulo).trim()
      ? { capituloTitulo: String(data.capituloTitulo).trim() }
      : {}),
    enunciado: String(data.enunciado ?? ''),
    alternativas: normalizeAlternativas(data.alternativas as OftpayQuestaoAlternativa[] | undefined),
    explicacao: String(data.explicacao ?? ''),
    dificuldade: (data.dificuldade as OftpayQuestao['dificuldade']) ?? 'medio',
    status: (data.status as OftpayQuestao['status']) ?? 'rascunho',
    fonte: normalizeFonte(fonteRaw as OftpayQuestaoFonte | undefined),
    ...(data.sourceId != null && String(data.sourceId).trim()
      ? { sourceId: String(data.sourceId).trim() }
      : {}),
    ...(data.apostilaTopicId != null && String(data.apostilaTopicId).trim()
      ? { apostilaTopicId: String(data.apostilaTopicId).trim() }
      : {}),
    ...(data.plannedSubjectId != null && String(data.plannedSubjectId).trim()
      ? { plannedSubjectId: String(data.plannedSubjectId).trim() }
      : {}),
    ...(data.plannedSubjectTitle != null && String(data.plannedSubjectTitle).trim()
      ? { plannedSubjectTitle: String(data.plannedSubjectTitle).trim() }
      : {}),
    criadoPor: String(data.criadoPor ?? ''),
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

function toFirestorePayload(questao: OftpayQuestao, timestamps: { createdAt?: Timestamp; updatedAt: Timestamp }) {
  const payload: Record<string, unknown> = {
    courseId: 'oftreview',
    tema: questao.tema.trim(),
    enunciado: questao.enunciado.trim(),
    alternativas: normalizeAlternativas(questao.alternativas),
    explicacao: questao.explicacao.trim(),
    dificuldade: questao.dificuldade,
    status: questao.status,
    fonte: {
      apostilaTitulo: questao.fonte.apostilaTitulo.trim(),
      sourceType: 'pdf_bucket',
      bucketPath: questao.fonte.bucketPath ?? OFTREVIEW_APOSTILAS_GCS_PREFIX,
      ...(questao.fonte.pagina != null ? { pagina: questao.fonte.pagina } : {}),
      ...(questao.fonte.trechoBase?.trim() ? { trechoBase: questao.fonte.trechoBase.trim() } : {}),
      ...(questao.fonte.uri?.trim() ? { uri: questao.fonte.uri.trim() } : {}),
    },
    criadoPor: questao.criadoPor,
    updatedAt: timestamps.updatedAt,
  };

  if (questao.subtema?.trim()) {
    payload.subtema = questao.subtema.trim();
  }

  if (questao.knowledgeMapId?.trim()) {
    payload.knowledgeMapId = questao.knowledgeMapId.trim();
  }

  if (questao.capituloTitulo?.trim()) {
    payload.capituloTitulo = questao.capituloTitulo.trim();
  }

  if (questao.sourceId?.trim()) {
    payload.sourceId = questao.sourceId.trim();
  }

  if (timestamps.createdAt) {
    payload.createdAt = timestamps.createdAt;
  }

  return payload;
}

/** Rascunho: bloqueia só erros estruturais; publicação exige validação completa. */
function validateForPersist(questao: Partial<OftpayQuestao>, publishing: boolean) {
  const full = validateOftpayQuestao(
    publishing ? { ...questao, status: 'publicado' } : questao
  );

  if (publishing || questao.status === 'publicado') {
    return full;
  }

  const hardErrors = full.errors.filter(
    (message) =>
      message.includes('courseId') ||
      message.includes('sourceType') ||
      message.includes('máximo') ||
      message.includes('repetida') ||
      message.includes('letra inválida')
  );

  const softAsWarnings = full.errors
    .filter((message) => !hardErrors.includes(message))
    .map((message) => `(pendente para publicar) ${message}`);

  return {
    valid: hardErrors.length === 0,
    errors: hardErrors,
    warnings: [...full.warnings, ...softAsWarnings],
  };
}

function assertValidOrThrow(result: ReturnType<typeof validateForPersist>): void {
  if (!result.valid) {
    throw new OftpayQuestoesValidationError(result.errors, result.warnings);
  }
}

function sortQuestoesByCreatedAtDesc(items: OftpayQuestaoDoc[]): OftpayQuestaoDoc[] {
  return [...items].sort((a, b) => {
    const ta = a.createdAt ?? 0;
    const tb = b.createdAt ?? 0;
    return tb - ta;
  });
}

export async function listQuestoesPublicadas(): Promise<OftpayQuestaoDoc[]> {
  const q = query(collection(db, COLLECTION_NAME), where('status', '==', 'publicado'));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
  return sortQuestoesByCreatedAtDesc(items);
}

export async function listQuestoesAdmin(currentUserEmail: string): Promise<OftpayQuestaoDoc[]> {
  assertAdmin(currentUserEmail);
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
  return sortQuestoesByCreatedAtDesc(items);
}

export async function createQuestao(
  questao: Omit<OftpayQuestao, 'id' | 'createdAt' | 'updatedAt'>,
  currentUserEmail: string
): Promise<string> {
  assertAdmin(currentUserEmail);

  const normalized: OftpayQuestao = {
    ...questao,
    courseId: 'oftreview',
    criadoPor: currentUserEmail,
    fonte: normalizeFonte(questao.fonte),
    alternativas: normalizeAlternativas(questao.alternativas),
  };

  const publishing = normalized.status === 'publicado';
  const validation = validateForPersist(normalized, publishing);
  assertValidOrThrow(validation);

  const now = Timestamp.now();
  const payload = toFirestorePayload(normalized, { createdAt: now, updatedAt: now });
  const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
  return ref.id;
}

export async function updateQuestao(
  id: string,
  patch: Partial<OftpayQuestao>,
  currentUserEmail: string
): Promise<void> {
  assertAdmin(currentUserEmail);

  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Questão não encontrada.');
  }

  const existing = fromFirestore(id, snap.data() as Record<string, unknown>);
  const merged: OftpayQuestao = {
    ...existing,
    ...patch,
    id: undefined,
    courseId: 'oftreview',
    criadoPor: existing.criadoPor,
    fonte: normalizeFonte({ ...existing.fonte, ...patch.fonte }),
    alternativas: patch.alternativas
      ? normalizeAlternativas(patch.alternativas)
      : existing.alternativas,
  };

  const publishing = merged.status === 'publicado';
  const validation = validateForPersist(merged, publishing);
  assertValidOrThrow(validation);

  const now = Timestamp.now();
  const payload = toFirestorePayload(merged, { updatedAt: now });
  delete payload.createdAt;
  await updateDoc(ref, payload);
}

export async function deleteQuestao(id: string, currentUserEmail: string): Promise<void> {
  assertAdmin(currentUserEmail);

  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = fromFirestore(id, snap.data() as Record<string, unknown>);
    await reopenPlannedSubjectAfterQuestaoDelete({
      id,
      apostilaTopicId: existing.apostilaTopicId,
      plannedSubjectId: existing.plannedSubjectId,
      plannedSubjectTitle: existing.plannedSubjectTitle,
      subtema: existing.subtema,
      dificuldade: existing.dificuldade,
    });
  }

  await deleteDoc(ref);
}

export async function publicarQuestao(id: string, currentUserEmail: string): Promise<void> {
  assertAdmin(currentUserEmail);

  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Questão não encontrada.');
  }

  const existing = fromFirestore(id, snap.data() as Record<string, unknown>);
  const toPublish: OftpayQuestao = { ...existing, status: 'publicado' };

  const validation = validateOftpayQuestao(toPublish);
  if (!validation.valid) {
    throw new OftpayQuestoesValidationError(validation.errors, validation.warnings);
  }

  const now = Timestamp.now();
  const payload = toFirestorePayload(toPublish, { updatedAt: now });
  delete payload.createdAt;
  await updateDoc(ref, payload);
}

/** Fluxo editorial: rascunho → revisão (sem exigir publicação completa). */
export async function markQuestaoAsReview(id: string, currentUserEmail: string): Promise<void> {
  assertAdmin(currentUserEmail);

  const ref = doc(db, COLLECTION_NAME, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Questão não encontrada.');
  }

  await updateDoc(ref, {
    status: 'revisao',
    updatedAt: Timestamp.now(),
  });
}
