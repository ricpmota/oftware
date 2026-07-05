/**
 * POST /api/oftpay/questoes/repair-placeholder-topics
 * Corrige assuntos genéricos (Aspecto N) em tópicos já mapeados, apaga questões
 * vinculadas a esses assuntos e atualiza o plano de assuntos com títulos reais da IA.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildTopicContentForGeneration } from '@/lib/oftpay/buildTopicContentForGeneration';
import {
  fetchTopicQuestionSubjectsFromGemini,
  getVertexAccessToken,
  getVertexCredentials,
} from '@/lib/oftpay/fetchTopicQuestionSubjectsFromGemini';
import {
  getPlaceholderPlannedSubjectIds,
  isPlaceholderPlannedSubjectTitle,
  mergeRepairedPlannedSubjects,
  splitPlannedSubjectsByPlaceholder,
  topicHasPlaceholderPlannedSubjects,
} from '@/lib/oftpay/placeholderPlannedSubjects';
import {
  countCoveredSubjectSlots,
  getEffectiveTopicCapacity,
  normalizePlannedSubjects,
} from '@/lib/oftpay/plannedQuestionSubjects';
import {
  clampTopicCapacity,
  computeCoveragePercent,
  OFTREVIEW_APOSTILA_TOPICS_COLLECTION,
  suggestTopicStatus,
} from '@/types/oftreviewApostilaTopic';
import { OFTREVIEW_CONTENT_COLLECTION } from '@/types/oftreviewContent';
import { QUESTOES_ADMIN_EMAIL } from '@/types/oftpayQuestoes';

export const runtime = 'nodejs';
export const maxDuration = 300;

const QUESTOES_COLLECTION = 'oftpayQuestoes';

interface RepairBody {
  apostilaTitulo?: string;
  /** Corrige um único tópico por requisição (evita timeout em apostilas grandes). */
  topicId?: string;
}

interface ContentPage {
  page: number;
  content: string;
}

interface TopicDoc {
  id: string;
  topicTitle: string;
  topicSummary?: string;
  keywords?: string[];
  pages?: number[];
  estimatedQuestionCapacity?: number;
  plannedSubjects: ReturnType<typeof normalizePlannedSubjects>;
}

interface QuestaoRow {
  id: string;
  apostilaTopicId?: string;
  capituloTitulo?: string;
  tema?: string;
  subtema?: string;
  plannedSubjectId?: string;
  plannedSubjectTitle?: string;
  dificuldade?: 'facil' | 'medio' | 'dificil';
  fonte?: { apostilaTitulo?: string };
}

async function verifyAdminEmail(
  request: NextRequest
): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 });
  }

  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Token sem e-mail.' }, { status: 400 });
    }
    if (email.toLowerCase() !== QUESTOES_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado: apenas administrador.' }, { status: 403 });
    }
    return { email };
  } catch {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }
}

function questaoBelongsToTopic(
  questao: QuestaoRow,
  topic: TopicDoc,
  apostilaTitulo: string
): boolean {
  if (questao.apostilaTopicId === topic.id) return true;
  const qAp = (questao.fonte?.apostilaTitulo ?? '').trim().toLowerCase();
  if (qAp !== apostilaTitulo.trim().toLowerCase()) return false;
  const cap = (questao.capituloTitulo ?? questao.tema ?? '').trim().toLowerCase();
  return cap === topic.topicTitle.trim().toLowerCase();
}

function questaoUsesPlaceholderSubject(
  questao: QuestaoRow,
  placeholderIds: Set<string>
): boolean {
  const subjectId = questao.plannedSubjectId?.trim();
  if (subjectId && placeholderIds.has(subjectId)) return true;
  const title = (questao.plannedSubjectTitle ?? questao.subtema ?? '').trim();
  return isPlaceholderPlannedSubjectTitle(title);
}

type FirestoreDb = ReturnType<typeof getFirestoreAdmin>;

async function loadQuestoesForTopic(
  db: FirestoreDb,
  topic: TopicDoc,
  apostilaTitulo: string
): Promise<QuestaoRow[]> {
  const byId = new Map<string, QuestaoRow>();

  const byTopicSnap = await db
    .collection(QUESTOES_COLLECTION)
    .where('apostilaTopicId', '==', topic.id)
    .get();
  for (const doc of byTopicSnap.docs) {
    byId.set(doc.id, { id: doc.id, ...(doc.data() as Omit<QuestaoRow, 'id'>) });
  }

  const byApostilaSnap = await db
    .collection(QUESTOES_COLLECTION)
    .where('fonte.apostilaTitulo', '==', apostilaTitulo)
    .get();
  for (const doc of byApostilaSnap.docs) {
    if (byId.has(doc.id)) continue;
    const row: QuestaoRow = { id: doc.id, ...(doc.data() as Omit<QuestaoRow, 'id'>) };
    if (questaoBelongsToTopic(row, topic, apostilaTitulo)) {
      byId.set(doc.id, row);
    }
  }

  return [...byId.values()];
}

interface RepairTopicResult {
  repaired: boolean;
  skipped?: boolean;
  questionsDeleted: number;
  error?: string;
}

async function repairOneTopic(params: {
  db: FirestoreDb;
  topic: TopicDoc;
  contentPages: ContentPage[];
  apostilaTitulo: string;
  accessToken: string;
  creds: NonNullable<ReturnType<typeof getVertexCredentials>>;
  now: ReturnType<typeof FieldValue.serverTimestamp>;
  questoes: QuestaoRow[];
}): Promise<RepairTopicResult> {
  const { db, topic, contentPages, apostilaTitulo, accessToken, creds, now, questoes } = params;

  if (!topicHasPlaceholderPlannedSubjects(topic.plannedSubjects)) {
    return { repaired: false, skipped: true, questionsDeleted: 0 };
  }

  const placeholderIds = getPlaceholderPlannedSubjectIds(topic.plannedSubjects);
  const questoesToDelete = questoes.filter(
    (q) =>
      questaoBelongsToTopic(q, topic, apostilaTitulo) &&
      questaoUsesPlaceholderSubject(q, placeholderIds)
  );

  const { text: contentText, pagesIncluded } = buildTopicContentForGeneration(
    contentPages,
    topic.pages
  );

  if (!contentText.trim() || contentText.length < 80) {
    return {
      repaired: false,
      questionsDeleted: 0,
      error: 'Conteúdo insuficiente para regenerar assuntos deste tópico.',
    };
  }

  const { real: realSubjects, placeholders } = splitPlannedSubjectsByPlaceholder(
    topic.plannedSubjects
  );
  const slotsNeeded = placeholders.length;

  const questionSubjects = await fetchTopicQuestionSubjectsFromGemini(accessToken, creds, {
    apostilaTitulo,
    topicTitle: topic.topicTitle,
    topicSummary: topic.topicSummary,
    keywords: topic.keywords,
    slotsNeeded,
    existingSubjectTitles: realSubjects.map((subject) => subject.title),
    contentText,
  });

  if (questionSubjects.length === 0 && slotsNeeded > 0) {
    return {
      repaired: false,
      questionsDeleted: 0,
      error: 'A IA não retornou assuntos válidos para este tópico.',
    };
  }

  const deleteBatch = db.batch();
  for (const questao of questoesToDelete) {
    deleteBatch.delete(db.collection(QUESTOES_COLLECTION).doc(questao.id));
  }
  let questionsDeleted = 0;
  if (questoesToDelete.length > 0) {
    await deleteBatch.commit();
    questionsDeleted = questoesToDelete.length;
    for (const deleted of questoesToDelete) {
      const idx = questoes.findIndex((q) => q.id === deleted.id);
      if (idx >= 0) questoes.splice(idx, 1);
    }
  }

  const keptQuestoes = questoes
    .filter(
      (q) =>
        questaoBelongsToTopic(q, topic, apostilaTitulo) &&
        !questaoUsesPlaceholderSubject(q, placeholderIds)
    )
    .map((q) => ({
      id: q.id,
      plannedSubjectId: q.plannedSubjectId,
      plannedSubjectTitle: q.plannedSubjectTitle,
      subtema: q.subtema,
      dificuldade: q.dificuldade,
    }));

  const idPrefix =
    topic.topicTitle.slice(0, 24).replace(/\W+/g, '-').toLowerCase() || 'subj';
  let plannedSubjects = mergeRepairedPlannedSubjects(
    topic.plannedSubjects,
    questionSubjects,
    idPrefix,
    { topicTitle: topic.topicTitle, keywords: topic.keywords }
  );

  for (const questao of keptQuestoes) {
    if (!questao.id) continue;
    const subjectId = questao.plannedSubjectId?.trim();
    const diff =
      questao.dificuldade === 'facil' ||
      questao.dificuldade === 'medio' ||
      questao.dificuldade === 'dificil'
        ? questao.dificuldade
        : 'medio';
    plannedSubjects = plannedSubjects.map((subject) => {
      const matchesId = subjectId && subject.id === subjectId;
      const titleMatch =
        (questao.plannedSubjectTitle ?? questao.subtema ?? '').trim().toLowerCase() ===
        subject.title.trim().toLowerCase();
      if (!matchesId && !titleMatch) return subject;
      if (subject.byDifficulty[diff].covered) return subject;
      return {
        ...subject,
        byDifficulty: {
          ...subject.byDifficulty,
          [diff]: {
            covered: true,
            questaoId: questao.id,
            coveredAt: Date.now(),
          },
        },
      };
    });
  }

  const capacity = clampTopicCapacity(topic.estimatedQuestionCapacity ?? plannedSubjects.length);
  const totalCapacity = getEffectiveTopicCapacity(plannedSubjects, capacity);
  const generatedQuestionCount = countCoveredSubjectSlots(plannedSubjects);
  const coveragePercent = computeCoveragePercent(generatedQuestionCount, totalCapacity);
  const status = suggestTopicStatus(generatedQuestionCount, totalCapacity);

  await db.collection(OFTREVIEW_APOSTILA_TOPICS_COLLECTION).doc(topic.id).update({
    plannedSubjects,
    estimatedQuestionCapacity: totalCapacity,
    generatedQuestionCount,
    coveragePercent,
    status,
    ...(pagesIncluded.length > 0 && !topic.pages?.length ? { pages: pagesIncluded } : {}),
    updatedAt: now,
  });

  return { repaired: true, questionsDeleted };
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminEmail(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = (await request.json().catch(() => ({}))) as RepairBody;
    const apostilaTitulo = typeof body.apostilaTitulo === 'string' ? body.apostilaTitulo.trim() : '';
    const topicId = typeof body.topicId === 'string' ? body.topicId.trim() : '';
    if (!apostilaTitulo) {
      return NextResponse.json({ error: 'apostilaTitulo é obrigatório.' }, { status: 400 });
    }

    const creds = getVertexCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Vertex AI não configurado.', hint: 'Defina GOOGLE_VERTEX_CREDENTIALS_JSON.' },
        { status: 500 }
      );
    }

    const db = getFirestoreAdmin();

    const contentSnap = await db
      .collection(OFTREVIEW_CONTENT_COLLECTION)
      .where('apostilaTitulo', '==', apostilaTitulo)
      .limit(1)
      .get();

    if (contentSnap.empty) {
      return NextResponse.json(
        {
          error: 'CONTEUDO_NAO_EXTRAIDO',
          message: 'Extraia o conteúdo desta apostila antes de corrigir assuntos.',
        },
        { status: 404 }
      );
    }

    const contentData = contentSnap.docs[0].data() as { pages?: ContentPage[] };
    const contentPages: ContentPage[] = Array.isArray(contentData.pages)
      ? contentData.pages.map((p, i) => ({
          page: typeof p.page === 'number' ? p.page : i + 1,
          content: String(p.content ?? ''),
        }))
      : [];

    if (contentPages.length === 0 || contentPages.every((p) => !p.content.trim())) {
      return NextResponse.json(
        { error: 'Conteúdo extraído vazio. Reextraia a apostila.' },
        { status: 400 }
      );
    }

    const topicsSnap = await db
      .collection(OFTREVIEW_APOSTILA_TOPICS_COLLECTION)
      .where('apostilaTitulo', '==', apostilaTitulo)
      .get();

    const allTopics: TopicDoc[] = topicsSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        topicTitle: String(data.topicTitle ?? '').trim(),
        topicSummary: data.topicSummary != null ? String(data.topicSummary) : undefined,
        keywords: Array.isArray(data.keywords)
          ? data.keywords.map((k) => String(k).trim()).filter(Boolean)
          : undefined,
        pages: Array.isArray(data.pages)
          ? data.pages
              .map((p) => (typeof p === 'number' ? p : parseInt(String(p), 10)))
              .filter((n) => Number.isFinite(n) && n > 0)
          : undefined,
        estimatedQuestionCapacity:
          typeof data.estimatedQuestionCapacity === 'number'
            ? clampTopicCapacity(data.estimatedQuestionCapacity)
            : undefined,
        plannedSubjects: normalizePlannedSubjects(data.plannedSubjects ?? data.questionSubjects),
      };
    });

    const topicsToRepair = allTopics.filter((topic) =>
      topicHasPlaceholderPlannedSubjects(topic.plannedSubjects)
    );

    if (topicsToRepair.length === 0) {
      return NextResponse.json({
        ok: true,
        apostilaTitulo,
        topicsRepaired: 0,
        questionsDeleted: 0,
        repairedTopicIds: [],
        message: 'Nenhum tópico com assuntos genéricos (Aspecto N) encontrado.',
      });
    }

    const accessToken = await getVertexAccessToken(creds);
    const now = FieldValue.serverTimestamp();

    // Modo por tópico: uma requisição por tópico (usado pelo criador com barra de progresso).
    if (topicId) {
      const topic = allTopics.find((t) => t.id === topicId);
      if (!topic) {
        return NextResponse.json({ error: 'Tópico não encontrado nesta apostila.' }, { status: 404 });
      }

      const questoes = await loadQuestoesForTopic(db, topic, apostilaTitulo);
      const result = await repairOneTopic({
        db,
        topic,
        contentPages,
        apostilaTitulo,
        accessToken,
        creds,
        now,
        questoes,
      });

      if (result.skipped) {
        return NextResponse.json({
          ok: true,
          apostilaTitulo,
          topicId: topic.id,
          topicTitle: topic.topicTitle,
          skipped: true,
          topicsRepaired: 0,
          questionsDeleted: 0,
          repairedTopicIds: [],
          message: 'Este tópico não tem assuntos genéricos para corrigir.',
        });
      }

      if (!result.repaired) {
        return NextResponse.json(
          {
            error: result.error ?? 'Não foi possível corrigir este tópico.',
            topicId: topic.id,
            topicTitle: topic.topicTitle,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        ok: true,
        apostilaTitulo,
        topicId: topic.id,
        topicTitle: topic.topicTitle,
        topicsRepaired: 1,
        questionsDeleted: result.questionsDeleted,
        repairedTopicIds: [topic.id],
        message: `Tópico "${topic.topicTitle}" corrigido (${result.questionsDeleted} questão(ões) removida(s)).`,
      });
    }

    const questoesSnap = await db.collection(QUESTOES_COLLECTION).get();
    const questoes: QuestaoRow[] = questoesSnap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<QuestaoRow, 'id'>),
    }));

    const repairedTopicIds: string[] = [];
    const repairErrors: Array<{ topicId: string; topicTitle: string; error: string }> = [];
    let questionsDeleted = 0;

    for (const topic of topicsToRepair) {
      try {
        const result = await repairOneTopic({
          db,
          topic,
          contentPages,
          apostilaTitulo,
          accessToken,
          creds,
          now,
          questoes,
        });

        if (result.skipped) continue;

        if (!result.repaired) {
          repairErrors.push({
            topicId: topic.id,
            topicTitle: topic.topicTitle,
            error: result.error ?? 'Falha desconhecida.',
          });
          continue;
        }

        questionsDeleted += result.questionsDeleted;
        repairedTopicIds.push(topic.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        repairErrors.push({
          topicId: topic.id,
          topicTitle: topic.topicTitle,
          error: msg,
        });
      }
    }

    if (repairedTopicIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Não foi possível corrigir os tópicos com assuntos genéricos.',
          details: repairErrors,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      apostilaTitulo,
      topicsRepaired: repairedTopicIds.length,
      questionsDeleted,
      repairedTopicIds,
      errors: repairErrors,
      message: `${repairedTopicIds.length} tópico(s) corrigido(s), ${questionsDeleted} questão(ões) removida(s). Gere as questões novamente para os assuntos atualizados.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[repair-placeholder-topics] error:', msg, err);
    return NextResponse.json(
      { error: 'Erro interno ao corrigir assuntos genéricos.', hint: msg },
      { status: 500 }
    );
  }
}
