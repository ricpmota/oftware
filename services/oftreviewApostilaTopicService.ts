import { collection, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  clampTopicCapacity,
  computeCoveragePercent,
  OFTREVIEW_APOSTILA_TOPICS_COLLECTION,
  suggestTopicStatus,
  TOPIC_CAPACITY_MIN,
  type OftreviewApostilaTopicDoc,
  type OftreviewApostilaTopicPlannedSubject,
  type OftreviewApostilaTopicStatus,
  type OftreviewApostilaTopicWithStats,
  type ApostilaQuestoesOverview,
  type ApostilaQuestoesOverviewTotals,
} from '@/types/oftreviewApostilaTopic';
import {
  normalizePlannedSubjects,
  countCoveredSubjectSlots,
  getEffectiveTopicCapacity,
  reopenSubjectForQuestao,
} from '@/lib/oftpay/plannedQuestionSubjects';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';

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

function parsePages(data: Record<string, unknown>): number[] | undefined {
  if (Array.isArray(data.pages)) {
    const nums = data.pages
      .map((p) => (typeof p === 'number' ? p : parseInt(String(p), 10)))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length > 0) return [...new Set(nums)].sort((a, b) => a - b);
  }
  const start =
    typeof data.pageStart === 'number' && Number.isFinite(data.pageStart)
      ? data.pageStart
      : undefined;
  const end =
    typeof data.pageEnd === 'number' && Number.isFinite(data.pageEnd) ? data.pageEnd : undefined;
  if (start != null && end != null && end >= start) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  if (start != null) return [start];
  return undefined;
}

function fromFirestore(id: string, data: Record<string, unknown>): OftreviewApostilaTopicDoc {
  const topicTitle = String(data.topicTitle ?? data.titulo ?? '').trim();
  const keywords = Array.isArray(data.keywords)
    ? data.keywords.map((k) => String(k).trim()).filter(Boolean)
    : undefined;
  const capacity =
    data.estimatedQuestionCapacity != null
      ? clampTopicCapacity(data.estimatedQuestionCapacity)
      : undefined;
  const statusRaw = data.status;
  const status =
    statusRaw === 'ativo' ||
    statusRaw === 'revisar' ||
    statusRaw === 'esgotado' ||
    statusRaw === 'ignorar'
      ? statusRaw
      : undefined;

  return {
    id,
    apostilaTitulo: String(data.apostilaTitulo ?? ''),
    topicTitle,
    topicSummary:
      data.topicSummary != null
        ? String(data.topicSummary)
        : data.trechoResumo != null
          ? String(data.trechoResumo)
          : undefined,
    ...(parsePages(data) ? { pages: parsePages(data) } : {}),
    ...(keywords?.length ? { keywords } : {}),
    ...(capacity != null ? { estimatedQuestionCapacity: capacity } : {}),
    ...(parsePlannedSubjects(data).length ? { plannedSubjects: parsePlannedSubjects(data) } : {}),
    ...(status ? { status } : {}),
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

function normalizeTitulo(value: string): string {
  return value.trim().toLowerCase();
}

function parsePlannedSubjects(data: Record<string, unknown>): OftreviewApostilaTopicPlannedSubject[] {
  const raw = data.plannedSubjects ?? data.questionSubjects;
  return normalizePlannedSubjects(raw);
}

function getTopicFirstPage(topic: Pick<OftreviewApostilaTopicDoc, 'pages'>): number {
  if (!topic.pages?.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...topic.pages);
}

/** Ordem pedagógica: primeira página do tópico; desempate alfabético. */
export function compareTopicsByPageOrder(
  a: Pick<OftreviewApostilaTopicDoc, 'pages' | 'topicTitle'>,
  b: Pick<OftreviewApostilaTopicDoc, 'pages' | 'topicTitle'>
): number {
  const pageA = getTopicFirstPage(a);
  const pageB = getTopicFirstPage(b);
  if (pageA !== pageB) return pageA - pageB;
  return a.topicTitle.localeCompare(b.topicTitle, 'pt-BR');
}

/** Conta questões publicadas vinculadas ao tópico. */
export function countQuestoesPublicadasForTopic(
  topic: Pick<OftreviewApostilaTopicDoc, 'apostilaTitulo' | 'topicTitle'>,
  questoes: OftpayQuestaoDoc[]
): number {
  const ap = normalizeTitulo(topic.apostilaTitulo);
  const titulo = normalizeTitulo(topic.topicTitle);
  return questoes.filter((q) => {
    if (q.status !== 'publicado') return false;
    if (normalizeTitulo(q.fonte.apostilaTitulo) !== ap) return false;
    const cap = normalizeTitulo(q.capituloTitulo ?? '');
    const tema = normalizeTitulo(q.tema ?? '');
    return cap === titulo || tema === titulo;
  }).length;
}

/** Conta questões vinculadas ao tópico (apostila + título do tópico). */
export function countQuestoesForTopic(
  topic: Pick<OftreviewApostilaTopicDoc, 'apostilaTitulo' | 'topicTitle'>,
  questoes: OftpayQuestaoDoc[]
): number {
  const ap = normalizeTitulo(topic.apostilaTitulo);
  const titulo = normalizeTitulo(topic.topicTitle);
  return questoes.filter((q) => {
    if (normalizeTitulo(q.fonte.apostilaTitulo) !== ap) return false;
    const cap = normalizeTitulo(q.capituloTitulo ?? '');
    const tema = normalizeTitulo(q.tema ?? '');
    return cap === titulo || tema === titulo;
  }).length;
}

export function enrichTopicWithStats(
  topic: OftreviewApostilaTopicDoc,
  questoes: OftpayQuestaoDoc[]
): OftreviewApostilaTopicWithStats {
  const plannedSubjects = topic.plannedSubjects ?? [];
  const generatedQuestionCount =
    plannedSubjects.length > 0
      ? countCoveredSubjectSlots(plannedSubjects)
      : countQuestoesForTopic(topic, questoes);
  const estimatedQuestionCapacity =
    plannedSubjects.length > 0
      ? getEffectiveTopicCapacity(plannedSubjects, topic.estimatedQuestionCapacity)
      : clampTopicCapacity(topic.estimatedQuestionCapacity ?? TOPIC_CAPACITY_MIN);
  const coveragePercent = computeCoveragePercent(
    generatedQuestionCount,
    estimatedQuestionCapacity
  );
  const status = suggestTopicStatus(
    generatedQuestionCount,
    estimatedQuestionCapacity,
    topic.status
  );

  return {
    ...topic,
    estimatedQuestionCapacity,
    generatedQuestionCount,
    coveragePercent,
    status,
  };
}

/** Lista tópicos mapeados para uma apostila. */
export async function listApostilaTopics(
  apostilaTitulo: string
): Promise<OftreviewApostilaTopicDoc[]> {
  const titulo = apostilaTitulo.trim();
  if (!titulo) return [];

  try {
    const q = query(
      collection(db, OFTREVIEW_APOSTILA_TOPICS_COLLECTION),
      where('apostilaTitulo', '==', titulo)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
    return items.sort(compareTopicsByPageOrder);
  } catch (e) {
    console.error('[apostilaTopics] listApostilaTopics:', e);
    return [];
  }
}

/** Lista todos os tópicos mapeados (todas as apostilas). */
export async function listAllApostilaTopics(): Promise<OftreviewApostilaTopicDoc[]> {
  try {
    const snap = await getDocs(collection(db, OFTREVIEW_APOSTILA_TOPICS_COLLECTION));
    const items = snap.docs.map((d) => fromFirestore(d.id, d.data() as Record<string, unknown>));
    return items.sort((a, b) => {
      const byAp = a.apostilaTitulo.localeCompare(b.apostilaTitulo, 'pt-BR');
      if (byAp !== 0) return byAp;
      return compareTopicsByPageOrder(a, b);
    });
  } catch (e) {
    console.error('[apostilaTopics] listAllApostilaTopics:', e);
    return [];
  }
}

function normalizeApostilaTitulo(value: string): string {
  return value.trim().toLowerCase();
}

function questoesForApostila(apostilaTitulo: string, questoes: OftpayQuestaoDoc[]): OftpayQuestaoDoc[] {
  const ap = normalizeApostilaTitulo(apostilaTitulo);
  return questoes.filter((q) => normalizeApostilaTitulo(q.fonte.apostilaTitulo) === ap);
}

/** Monta resumos por apostila a partir de listas já carregadas. */
export function buildApostilaQuestoesOverviews(params: {
  apostilaTitulos: string[];
  topics: OftreviewApostilaTopicDoc[];
  questoes: OftpayQuestaoDoc[];
  contentExtractedTitles: Set<string>;
}): ApostilaQuestoesOverview[] {
  const { apostilaTitulos, topics, questoes, contentExtractedTitles } = params;
  const topicsByAp = new Map<string, OftreviewApostilaTopicDoc[]>();

  for (const topic of topics) {
    const key = normalizeApostilaTitulo(topic.apostilaTitulo);
    const list = topicsByAp.get(key) ?? [];
    list.push(topic);
    topicsByAp.set(key, list);
  }

  const seen = new Set<string>();
  const orderedTitles = [...apostilaTitulos];
  for (const topic of topics) {
    const t = topic.apostilaTitulo.trim();
    if (t && !orderedTitles.some((a) => normalizeApostilaTitulo(a) === normalizeApostilaTitulo(t))) {
      orderedTitles.push(t);
    }
  }

  return orderedTitles
    .map((rawTitle) => {
      const apostilaTitulo = rawTitle.trim();
      if (!apostilaTitulo) return null;
      const key = normalizeApostilaTitulo(apostilaTitulo);
      if (seen.has(key)) return null;
      seen.add(key);

      const apTopics = [...(topicsByAp.get(key) ?? [])].sort(compareTopicsByPageOrder);
      const enrichedTopics = apTopics.map((t) => enrichTopicWithStats(t, questoes));
      const totalCapacity = enrichedTopics.reduce(
        (sum, t) => sum + (t.estimatedQuestionCapacity ?? 0),
        0
      );
      const apQuestoes = questoesForApostila(apostilaTitulo, questoes);
      const questoesPublicadas = apQuestoes.filter((q) => q.status === 'publicado').length;
      const questoesRascunho = apQuestoes.filter((q) => q.status === 'rascunho').length;
      const questoesRevisao = apQuestoes.filter((q) => q.status === 'revisao').length;
      const coveragePercent =
        totalCapacity > 0
          ? Math.round((questoesPublicadas / totalCapacity) * 1000) / 10
          : questoesPublicadas > 0
            ? 100
            : 0;

      const hasContentExtracted = [...contentExtractedTitles].some(
        (t) => normalizeApostilaTitulo(t) === key
      );

      return {
        apostilaTitulo,
        hasContentExtracted,
        topicsMapped: enrichedTopics.length,
        totalCapacity,
        questoesTotal: apQuestoes.length,
        questoesPublicadas,
        questoesRascunho,
        questoesRevisao,
        coveragePercent,
        topics: enrichedTopics,
      } satisfies ApostilaQuestoesOverview;
    })
    .filter((row): row is ApostilaQuestoesOverview => row != null)
    .sort((a, b) => a.apostilaTitulo.localeCompare(b.apostilaTitulo, 'pt-BR'));
}

export async function listApostilaTopicsWithStats(
  apostilaTitulo: string,
  questoes: OftpayQuestaoDoc[]
): Promise<OftreviewApostilaTopicWithStats[]> {
  const topics = await listApostilaTopics(apostilaTitulo);
  return topics.map((topic) => enrichTopicWithStats(topic, questoes));
}

export function computeApostilaOverviewTotals(
  rows: ApostilaQuestoesOverview[]
): ApostilaQuestoesOverviewTotals {
  const totalCapacity = rows.reduce((s, r) => s + r.totalCapacity, 0);
  const questoesPublicadas = rows.reduce((s, r) => s + r.questoesPublicadas, 0);
  return {
    apostilas: rows.length,
    apostilasComConteudo: rows.filter((r) => r.hasContentExtracted).length,
    apostilasMapeadas: rows.filter((r) => r.topicsMapped > 0).length,
    topicsMapped: rows.reduce((s, r) => s + r.topicsMapped, 0),
    totalCapacity,
    questoesTotal: rows.reduce((s, r) => s + r.questoesTotal, 0),
    questoesPublicadas,
    coveragePercent:
      totalCapacity > 0
        ? Math.round((questoesPublicadas / totalCapacity) * 1000) / 10
        : questoesPublicadas > 0
          ? 100
          : 0,
  };
}

/** Reabre assunto planejado no tópico ao excluir questão vinculada. */
export async function reopenPlannedSubjectAfterQuestaoDelete(questao: {
  id: string;
  apostilaTopicId?: string;
  plannedSubjectId?: string;
  plannedSubjectTitle?: string;
  subtema?: string;
  dificuldade?: import('@/types/oftpayQuestoes').QuestaoDificuldade;
}): Promise<void> {
  const topicId = questao.apostilaTopicId?.trim();
  if (!topicId) return;

  try {
    const topicRef = doc(db, OFTREVIEW_APOSTILA_TOPICS_COLLECTION, topicId);
    const snap = await getDoc(topicRef);
    if (!snap.exists()) return;

    const data = snap.data() as Record<string, unknown>;
    const plannedSubjects = normalizePlannedSubjects(data.plannedSubjects);
    if (plannedSubjects.length === 0) return;

    const { subjects: updatedSubjects, changed } = reopenSubjectForQuestao(plannedSubjects, questao);
    if (!changed) return;

    const capacity = getEffectiveTopicCapacity(
      plannedSubjects,
      data.estimatedQuestionCapacity != null
        ? clampTopicCapacity(data.estimatedQuestionCapacity)
        : undefined
    );
    const newCount = countCoveredSubjectSlots(updatedSubjects);
    const coveragePercent = computeCoveragePercent(newCount, capacity);
    const statusRaw = data.status;
    const storedStatus =
      statusRaw === 'ativo' ||
      statusRaw === 'revisar' ||
      statusRaw === 'esgotado' ||
      statusRaw === 'ignorar'
        ? statusRaw
        : undefined;
    const status = suggestTopicStatus(newCount, capacity, storedStatus);

    await updateDoc(topicRef, {
      plannedSubjects: updatedSubjects,
      generatedQuestionCount: newCount,
      coveragePercent,
      status,
      updatedAt: Timestamp.now(),
    });
  } catch (e) {
    console.error('[apostilaTopics] reopenPlannedSubjectAfterQuestaoDelete:', e);
  }
}
