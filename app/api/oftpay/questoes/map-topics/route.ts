/**
 * POST /api/oftpay/questoes/map-topics
 * Identifica tópicos reais da apostila via Gemini e salva em oftreviewApostilaTopics.
 * Admin only. Usa oftreviewContent. Não gera questões.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildApostilaContentForMapping } from '@/lib/oftpay/buildApostilaContentForMapping';
import {
  computeMappingPercent,
  isMappingComplete,
  MAPPING_CHUNK_MAX_CHARS,
  MAPPING_MIN_CHUNK_PAGES,
  resolveLastPageProcessed,
  selectNextMappingChunk,
} from '@/lib/oftpay/apostilaTopicMappingChunks';
import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';
import { normalizeTopicsFromPayload, type GeminiTopicJson } from '@/lib/oftpay/normalizeGeminiTopics';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import {
  clampTopicCapacity,
  computeCoveragePercent,
  OFTREVIEW_APOSTILA_TOPICS_COLLECTION,
  suggestTopicStatus,
  TOPIC_CAPACITY_MAX,
  TOPIC_CAPACITY_MIN,
} from '@/types/oftreviewApostilaTopic';
import { OFTREVIEW_CONTENT_COLLECTION, type TopicMappingProgress } from '@/types/oftreviewContent';
import { QUESTOES_ADMIN_EMAIL } from '@/types/oftpayQuestoes';
import {
  buildPlannedSubjectsFromTitles,
  syncPlannedSubjectsWithQuestoes,
  countCoveredSubjectSlots,
  getEffectiveTopicCapacity,
} from '@/lib/oftpay/plannedQuestionSubjects';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DISCOVERY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const QUESTOES_COLLECTION = 'oftpayQuestoes';

interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface MapTopicsBody {
  apostilaTitulo?: string;
  /** reset = apaga tópicos e recomeça; continue = próximo lote de páginas */
  mode?: 'reset' | 'continue';
}

interface ContentPage {
  page: number;
  content: string;
}

function getVertexCredentials(): GoogleCreds | null {
  const jsonEnv = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      const key =
        typeof parsed.private_key === 'string' ? parsed.private_key.replace(/\\n/g, '\n') : '';
      if (parsed.project_id && parsed.client_email && key) {
        return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: key };
      }
    } catch (e) {
      console.error('[map-topics] GOOGLE_VERTEX_CREDENTIALS_JSON parse error:', e);
    }
  }
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (projectId && clientEmail && rawKey) {
    return { projectId, clientEmail, privateKey: rawKey.replace(/\\n/g, '\n') };
  }
  return null;
}

function getAccessToken(creds: GoogleCreds): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [DISCOVERY_SCOPE],
  });
  return client.authorize().then((t) => (t as { access_token?: string }).access_token || '');
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

const MAP_TOPICS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topics: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          topicTitle: { type: 'STRING' },
          topicSummary: { type: 'STRING' },
          pages: { type: 'ARRAY', items: { type: 'INTEGER' } },
          keywords: { type: 'ARRAY', items: { type: 'STRING' } },
          estimatedQuestionCapacity: { type: 'INTEGER' },
          questionSubjects: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['topicTitle'],
      },
    },
  },
  required: ['topics'],
};

const GEMINI_SYSTEM_PROMPT = `Você é um especialista em oftalmologia e curadoria pedagógica.

Use EXCLUSIVAMENTE o conteúdo textual fornecido.
Não invente tópicos, conceitos ou páginas que não estejam no material.

Estime quantas questões objetivas, úteis e não repetitivas podem ser geradas a partir de cada tópico.
Não estime quantidade alta se o trecho for superficial.

Responda somente com JSON estrito conforme solicitado.`;

async function callGeminiForTopics(
  accessToken: string,
  creds: GoogleCreds,
  userPrompt: string,
  options?: { useResponseSchema?: boolean; maxOutputTokens?: number }
): Promise<{ text: string; finishReason?: string; blocked?: boolean }> {
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const geminiModel = resolveGeminiModelId();
  const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

  const useSchema = options?.useResponseSchema !== false;
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: options?.maxOutputTokens ?? 16384,
    temperature: 0.15,
    topP: 0.9,
  };
  if (useSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = MAP_TOPICS_RESPONSE_SCHEMA;
  }

  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'user', parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });

  const geminiData = await geminiRes.json().catch(() => ({}));
  if (!geminiRes.ok) {
    const errMsg =
      (geminiData as { error?: { message?: string } }).error?.message || geminiRes.statusText;
    throw new Error(`Gemini HTTP ${geminiRes.status}: ${errMsg}`);
  }

  const blocked = Boolean(
    (geminiData as { promptFeedback?: { blockReason?: string } }).promptFeedback?.blockReason
  );

  return {
    ...getGeminiAnswerText(
      geminiData as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      }
    ),
    blocked,
  };
}

function buildMapTopicsPrompt(
  apostilaTitulo: string,
  contentText: string,
  totalPages: number,
  options?: { compact?: boolean; chunkStart?: number; chunkEnd?: number }
): string {
  const compact = options?.compact ?? false;
  const chunkStart = options?.chunkStart;
  const chunkEnd = options?.chunkEnd;
  const isChunk = chunkStart != null && chunkEnd != null;

  const chunkNote = isChunk
    ? `
IMPORTANTE: Analise APENAS o trecho das páginas ${chunkStart} a ${chunkEnd} (de ${totalPages} no documento completo).
Os números em "pages" devem estar entre ${chunkStart} e ${chunkEnd}.
Identifique os tópicos pedagógicos presentes NESTE trecho — não invente conteúdo de outras páginas.
`
    : '';

  return `APOSTILA: ${apostilaTitulo}
TOTAL DE PÁGINAS NO DOCUMENTO: ${totalPages}
${isChunk ? `TRECHO ATUAL: páginas ${chunkStart}–${chunkEnd}\n` : ''}
CONTEÚDO EXTRAÍDO (trechos por página):
${contentText}

---
${chunkNote}
Analise o conteúdo acima e identifique os TÓPICOS REAIS de estudo presentes nesta apostila.

Para cada tópico, estime quantas questões objetivas, úteis e NÃO repetitivas podem ser geradas a partir dele.
Não estime quantidade alta se o trecho for superficial.
estimatedQuestionCapacity deve ser inteiro entre ${TOPIC_CAPACITY_MIN} e ${TOPIC_CAPACITY_MAX}.

Para cada tópico, inclua questionSubjects: array de strings com ângulos distintos de questão derivados do conteúdo.
Cada item deve descrever UM conceito, diagnóstico, conduta ou comparação específico do tópico.
${compact
  ? '- Modo compacto: questionSubjects com até 6 títulos curtos (máx. 6 palavras cada). Se não houver ângulos distintos, repita conceitos com focos diferentes.\n- topicSummary com no máximo 80 caracteres. keywords com no máximo 3 itens.\n'
  : '- questionSubjects: de 1 a estimatedQuestionCapacity itens distintos (ângulos pedagógicos do tópico).\n'}
Regras:
- Não invente tópicos que não estejam no conteúdo.
- Agrupe por assuntos pedagógicos coerentes (não apenas por página).
- pages: lista de números de página do conteúdo que sustentam o tópico.
- Se o conteúdo de um tópico for pequeno, estimatedQuestionCapacity deve ser baixo (1–3).
- Tópicos densos com muitos conceitos podem ter capacidade maior, até ${TOPIC_CAPACITY_MAX}.
${compact ? '- Retorne no máximo 20 tópicos principais. JSON compacto.\n' : '- Retorne no máximo 30 tópicos.\n'}
Responda SOMENTE com JSON válido no formato:
{"topics":[{"topicTitle":"...","topicSummary":"...","pages":[1],"keywords":["..."],"estimatedQuestionCapacity":5,"questionSubjects":["diagnóstico clínico","exame complementar","conduta terapêutica"]}]}`;
}

function buildMinimalMapTopicsPrompt(
  apostilaTitulo: string,
  contentText: string,
  chunkStart: number,
  chunkEnd: number,
  totalPages: number
): string {
  return `APOSTILA: ${apostilaTitulo}
TRECHO: páginas ${chunkStart}–${chunkEnd} (de ${totalPages})

${contentText}

---
Liste os tópicos pedagógicos de oftalmologia presentes NESTE trecho.
Use somente o conteúdo acima. estimatedQuestionCapacity entre ${TOPIC_CAPACITY_MIN} e ${TOPIC_CAPACITY_MAX}.
pages deve conter números entre ${chunkStart} e ${chunkEnd}.

Responda SOMENTE com JSON válido:
{"topics":[{"topicTitle":"nome do tópico","estimatedQuestionCapacity":3,"pages":[${chunkStart}]}]}

Se o trecho for capa, índice ou estiver vazio de conteúdo clínico, retorne {"topics":[]}.`;
}

async function fetchTopicsFromGemini(
  accessToken: string,
  creds: GoogleCreds,
  apostilaTitulo: string,
  pages: ContentPage[],
  totalPages: number,
  options?: {
    compact?: boolean;
    minimal?: boolean;
    chunkStart?: number;
    chunkEnd?: number;
    useResponseSchema?: boolean;
  }
): Promise<{
  rawTopics: GeminiTopicJson[];
  finishReason?: string;
  pagesIncluded: number;
  truncated: boolean;
  answerPreview?: string;
}> {
  const compact = options?.compact ?? false;
  const minimal = options?.minimal ?? false;
  const { text: contentText, pagesIncluded, truncated } = buildApostilaContentForMapping(pages, {
    maxTotalChars: MAPPING_CHUNK_MAX_CHARS,
  });
  const chunkStart = options?.chunkStart ?? pages[0]?.page ?? 1;
  const chunkEnd = options?.chunkEnd ?? pages[pages.length - 1]?.page ?? chunkStart;

  const userPrompt = minimal
    ? buildMinimalMapTopicsPrompt(apostilaTitulo, contentText, chunkStart, chunkEnd, totalPages)
    : buildMapTopicsPrompt(apostilaTitulo, contentText, totalPages, {
        compact,
        chunkStart: options?.chunkStart,
        chunkEnd: options?.chunkEnd,
      });

  const { text: answerText, finishReason } = await callGeminiForTopics(
    accessToken,
    creds,
    userPrompt,
    {
      useResponseSchema: options?.useResponseSchema ?? !minimal,
      maxOutputTokens: minimal ? 4096 : compact ? 8192 : 16384,
    }
  );

  const parsed = extractJsonFromGeminiText(answerText);
  const rawTopics = normalizeTopicsFromPayload(parsed);

  return {
    rawTopics,
    finishReason,
    pagesIncluded,
    truncated,
    answerPreview: answerText.slice(0, 240),
  };
}

const MIN_CHUNK_PAGES = MAPPING_MIN_CHUNK_PAGES;

async function fetchTopicsForChunkWithRetries(
  accessToken: string,
  creds: GoogleCreds,
  apostilaTitulo: string,
  chunkPages: ContentPage[],
  effectiveTotalPages: number
): Promise<{
  rawTopics: GeminiTopicJson[];
  finishReason?: string;
  pagesIncluded: number;
  truncated: boolean;
  effectiveChunkPages: ContentPage[];
}> {
  let pagesSlice = chunkPages;

  while (pagesSlice.length > 0) {
    const chunkStart = pagesSlice[0].page;
    const chunkEnd = pagesSlice[pagesSlice.length - 1].page;

    let result = await fetchTopicsFromGemini(
      accessToken,
      creds,
      apostilaTitulo,
      pagesSlice,
      effectiveTotalPages,
      { chunkStart, chunkEnd }
    );

    if (result.rawTopics.length === 0) {
      console.warn('[map-topics] retrying with compact prompt', {
        finishReason: result.finishReason,
        chunkStart,
        chunkEnd,
        pagesInChunk: pagesSlice.length,
        answerPreview: result.answerPreview,
      });
      result = await fetchTopicsFromGemini(
        accessToken,
        creds,
        apostilaTitulo,
        pagesSlice,
        effectiveTotalPages,
        { compact: true, chunkStart, chunkEnd }
      );
    }

    if (result.rawTopics.length === 0) {
      console.warn('[map-topics] retrying with minimal prompt (no schema)', {
        finishReason: result.finishReason,
        chunkStart,
        chunkEnd,
        answerPreview: result.answerPreview,
      });
      result = await fetchTopicsFromGemini(
        accessToken,
        creds,
        apostilaTitulo,
        pagesSlice,
        effectiveTotalPages,
        { minimal: true, chunkStart, chunkEnd, useResponseSchema: false }
      );
    } else if (result.finishReason === 'MAX_TOKENS' || result.finishReason === 'LENGTH') {
      console.warn('[map-topics] accepting partial topics from truncated response', {
        finishReason: result.finishReason,
        topicsFound: result.rawTopics.length,
        chunkStart,
        chunkEnd,
      });
    }

    if (result.rawTopics.length > 0) {
      return { ...result, effectiveChunkPages: pagesSlice };
    }

    if (pagesSlice.length <= MIN_CHUNK_PAGES) {
      return { ...result, effectiveChunkPages: pagesSlice };
    }

    const nextSize = Math.ceil(pagesSlice.length / 2);
    console.warn('[map-topics] shrinking chunk after empty AI response', {
      chunkStart,
      chunkEnd,
      fromPages: pagesSlice.length,
      toPages: nextSize,
    });
    pagesSlice = pagesSlice.slice(0, nextSize);
  }

  return {
    rawTopics: [],
    pagesIncluded: 0,
    truncated: false,
    effectiveChunkPages: chunkPages,
  };
}

function normalizeTopicPages(pages: unknown, validPageNumbers: Set<number>): number[] {
  if (!Array.isArray(pages)) return [];
  const nums = pages
    .map((p) => (typeof p === 'number' ? p : parseInt(String(p), 10)))
    .filter((n) => Number.isFinite(n) && n > 0 && validPageNumbers.has(n));
  return [...new Set(nums)].sort((a, b) => a - b);
}

function countGeneratedForTopic(
  apostilaTitulo: string,
  topicTitle: string,
  questoes: Array<{ tema?: string; capituloTitulo?: string; fonte?: { apostilaTitulo?: string } }>
): number {
  const ap = apostilaTitulo.trim().toLowerCase();
  const tt = topicTitle.trim().toLowerCase();
  return questoes.filter((q) => {
    const qAp = (q.fonte?.apostilaTitulo ?? '').trim().toLowerCase();
    if (qAp !== ap) return false;
    const cap = (q.capituloTitulo ?? '').trim().toLowerCase();
    const tema = (q.tema ?? '').trim().toLowerCase();
    return cap === tt || tema === tt;
  }).length;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminEmail(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = (await request.json().catch(() => ({}))) as MapTopicsBody;
    const apostilaTitulo = typeof body.apostilaTitulo === 'string' ? body.apostilaTitulo.trim() : '';
    const mode = body.mode === 'reset' ? 'reset' : 'continue';

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
          message: 'Extraia o conteúdo desta apostila antes de mapear tópicos.',
        },
        { status: 404 }
      );
    }

    const contentDocRef = contentSnap.docs[0].ref;
    const contentData = contentSnap.docs[0].data() as {
      pages?: ContentPage[];
      totalPages?: number;
      topicMappingProgress?: TopicMappingProgress;
    };
    const pages: ContentPage[] = Array.isArray(contentData.pages)
      ? contentData.pages.map((p, i) => ({
          page: typeof p.page === 'number' ? p.page : i + 1,
          content: String(p.content ?? ''),
        }))
      : [];

    if (pages.length === 0 || pages.every((p) => !p.content.trim())) {
      return NextResponse.json(
        { error: 'Conteúdo extraído vazio. Reextraia a apostila.' },
        { status: 400 }
      );
    }

    const totalPages =
      typeof contentData.totalPages === 'number' ? contentData.totalPages : pages.length;
    const maxPageInDoc = pages.reduce((max, p) => Math.max(max, p.page), 0);
    const effectiveTotalPages = Math.max(totalPages, maxPageInDoc);
    const validPageNumbers = new Set(pages.map((p) => p.page));

    const existingTopicsSnap = await db
      .collection(OFTREVIEW_APOSTILA_TOPICS_COLLECTION)
      .where('apostilaTitulo', '==', apostilaTitulo)
      .get();

    const existingTopicsByTitle = new Map<
      string,
      { ref: DocumentReference; data: Record<string, unknown> }
    >();
    for (const doc of existingTopicsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const title = String(data.topicTitle ?? '').trim().toLowerCase();
      if (title) existingTopicsByTitle.set(title, { ref: doc.ref, data });
    }

    let lastPageProcessed = resolveLastPageProcessed(
      contentData.topicMappingProgress,
      existingTopicsSnap.docs.map((d) => d.data() as { pages?: number[] })
    );

    if (mode === 'reset') {
      const deleteBatch = db.batch();
      existingTopicsSnap.docs.forEach((doc) => deleteBatch.delete(doc.ref));
      if (existingTopicsSnap.docs.length > 0) {
        await deleteBatch.commit();
      }
      existingTopicsByTitle.clear();
      lastPageProcessed = 0;
    }

    if (
      mode === 'continue' &&
      isMappingComplete(lastPageProcessed, effectiveTotalPages)
    ) {
      const percentComplete = computeMappingPercent(lastPageProcessed, effectiveTotalPages);
      return NextResponse.json({
        ok: true,
        apostilaTitulo,
        mode,
        topicsCount: existingTopicsSnap.size,
        topicsAdded: 0,
        topicsUpdated: 0,
        lastPageProcessed,
        totalPages: effectiveTotalPages,
        percentComplete,
        mappingComplete: true,
        message: `Mapeamento completo: ${lastPageProcessed} de ${effectiveTotalPages} páginas (100%).`,
      });
    }

    const chunkPages = selectNextMappingChunk(pages, lastPageProcessed);
    if (chunkPages.length === 0) {
      const percentComplete = computeMappingPercent(lastPageProcessed, effectiveTotalPages);
      await contentDocRef.set(
        {
          topicMappingProgress: {
            lastPageProcessed,
            totalPages: effectiveTotalPages,
            updatedAt: Date.now(),
          },
        },
        { merge: true }
      );
      return NextResponse.json({
        ok: true,
        apostilaTitulo,
        mode,
        topicsCount: existingTopicsByTitle.size,
        topicsAdded: 0,
        topicsUpdated: 0,
        lastPageProcessed,
        totalPages: effectiveTotalPages,
        percentComplete,
        mappingComplete: true,
        message: `Mapeamento completo: ${lastPageProcessed} de ${effectiveTotalPages} páginas.`,
      });
    }

    const chunkStart = chunkPages[0].page;
    const chunkEnd = chunkPages[chunkPages.length - 1].page;
    const accessToken = await getAccessToken(creds);

    const geminiResult = await fetchTopicsForChunkWithRetries(
      accessToken,
      creds,
      apostilaTitulo,
      chunkPages,
      effectiveTotalPages
    );

    const {
      rawTopics,
      pagesIncluded,
      truncated,
      finishReason,
      effectiveChunkPages,
    } = geminiResult;
    const effectiveChunkEnd = effectiveChunkPages[effectiveChunkPages.length - 1]?.page ?? chunkEnd;

    if (rawTopics.length === 0) {
      console.warn('[map-topics] skipping chunk without topics', {
        finishReason,
        apostilaTitulo,
        pagesIncluded,
        truncated,
        chunkStart,
        chunkEnd: effectiveChunkEnd,
      });

      const newLastPageProcessed = effectiveChunkEnd;
      await contentDocRef.set(
        {
          topicMappingProgress: {
            lastPageProcessed: newLastPageProcessed,
            totalPages: effectiveTotalPages,
            updatedAt: Date.now(),
          },
        },
        { merge: true }
      );

      const mappingComplete = isMappingComplete(newLastPageProcessed, effectiveTotalPages);
      const percentComplete = computeMappingPercent(newLastPageProcessed, effectiveTotalPages);

      return NextResponse.json({
        ok: true,
        apostilaTitulo,
        mode,
        topicsCount: existingTopicsByTitle.size,
        topicsAdded: 0,
        topicsUpdated: 0,
        lastPageProcessed: newLastPageProcessed,
        totalPages: effectiveTotalPages,
        percentComplete,
        mappingComplete,
        chunkSkipped: true,
        chunkStart,
        chunkEnd: effectiveChunkEnd,
        warning:
          finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH'
            ? `Trecho páginas ${chunkStart}–${effectiveChunkEnd} truncado pela IA — páginas avançadas; o próximo lote continuará o mapeamento.`
            : `Trecho páginas ${chunkStart}–${effectiveChunkEnd} sem tópicos identificáveis (capa, índice ou conteúdo insuficiente) — páginas avançadas automaticamente.`,
        message: mappingComplete
          ? `Mapeamento completo: ${newLastPageProcessed} de ${effectiveTotalPages} páginas. ${existingTopicsByTitle.size} tópico(s) no total.`
          : `Trecho páginas ${chunkStart}–${effectiveChunkEnd} ignorado (${newLastPageProcessed} de ${effectiveTotalPages} páginas, ${percentComplete}%).`,
      });
    }

    const normalizedTopics = rawTopics
      .map((t) => {
        const topicTitle = (t.topicTitle ?? '').trim();
        if (!topicTitle) return null;
        const estimatedQuestionCapacity = clampTopicCapacity(t.estimatedQuestionCapacity);
        let topicPages = normalizeTopicPages(t.pages, validPageNumbers);
        if (topicPages.length === 0) {
          topicPages = effectiveChunkPages
            .filter((p) => p.content.trim().length > 0)
            .map((p) => p.page);
        }
        const keywords = Array.isArray(t.keywords)
          ? t.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 12)
          : [];
        const questionSubjects = Array.isArray(t.questionSubjects)
          ? t.questionSubjects.map((s) => String(s).trim()).filter(Boolean)
          : [];

        return {
          topicTitle,
          topicSummary: (t.topicSummary ?? '').trim() || undefined,
          pages: topicPages.length > 0 ? topicPages : undefined,
          keywords: keywords.length > 0 ? keywords : undefined,
          questionSubjects,
          estimatedQuestionCapacity,
        };
      })
      .filter(Boolean) as Array<{
      topicTitle: string;
      topicSummary?: string;
      pages?: number[];
      keywords?: string[];
      questionSubjects: string[];
      estimatedQuestionCapacity: number;
    }>;

    if (normalizedTopics.length === 0) {
      return NextResponse.json({ error: 'Tópicos retornados inválidos.' }, { status: 422 });
    }

    const questoesSnap = await db.collection(QUESTOES_COLLECTION).get();
    const questoes = questoesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    })) as Array<{
      id: string;
      fonte?: { apostilaTitulo?: string };
      capituloTitulo?: string;
      tema?: string;
      plannedSubjectId?: string;
      plannedSubjectTitle?: string;
      subtema?: string;
      dificuldade?: 'facil' | 'medio' | 'dificil';
    }>;

    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    const savedIds: string[] = [];
    let topicsAdded = 0;
    let topicsUpdated = 0;

    for (const topic of normalizedTopics) {
      const titleKey = topic.topicTitle.trim().toLowerCase();
      const existing = existingTopicsByTitle.get(titleKey);

      if (existing && mode === 'continue') {
        const existingPages = Array.isArray(existing.data.pages)
          ? (existing.data.pages as number[])
          : [];
        const mergedPages = [...new Set([...existingPages, ...(topic.pages ?? [])])].sort(
          (a, b) => a - b
        );
        const existingKeywords = Array.isArray(existing.data.keywords)
          ? (existing.data.keywords as string[])
          : [];
        const mergedKeywords = [
          ...new Set([...existingKeywords, ...(topic.keywords ?? [])]),
        ].slice(0, 12);

        batch.update(existing.ref, {
          ...(mergedPages.length > 0 ? { pages: mergedPages } : {}),
          ...(mergedKeywords.length > 0 ? { keywords: mergedKeywords } : {}),
          ...(!existing.data.topicSummary && topic.topicSummary
            ? { topicSummary: topic.topicSummary }
            : {}),
          updatedAt: now,
        });
        savedIds.push(existing.ref.id);
        topicsUpdated += 1;
        continue;
      }

      const topicQuestoes = questoes
        .filter((q) => {
          const qAp = (q.fonte as { apostilaTitulo?: string } | undefined)?.apostilaTitulo;
          if ((qAp ?? '').trim().toLowerCase() !== apostilaTitulo.trim().toLowerCase()) return false;
          const cap = q.capituloTitulo != null ? String(q.capituloTitulo) : '';
          const tema = q.tema != null ? String(q.tema) : '';
          const tt = topic.topicTitle.trim().toLowerCase();
          return cap.trim().toLowerCase() === tt || tema.trim().toLowerCase() === tt;
        })
        .map((q) => ({
          id: q.id,
          plannedSubjectId: q.plannedSubjectId != null ? String(q.plannedSubjectId) : undefined,
          plannedSubjectTitle:
            q.plannedSubjectTitle != null ? String(q.plannedSubjectTitle) : undefined,
          subtema: q.subtema != null ? String(q.subtema) : undefined,
          dificuldade:
            q.dificuldade === 'facil' || q.dificuldade === 'medio' || q.dificuldade === 'dificil'
              ? q.dificuldade
              : undefined,
        }));

      const plannedSubjectsRaw = buildPlannedSubjectsFromTitles(
        topic.questionSubjects,
        topic.estimatedQuestionCapacity,
        topic.topicTitle.slice(0, 24).replace(/\W+/g, '-').toLowerCase() || 'subj',
        { topicTitle: topic.topicTitle, keywords: topic.keywords }
      );
      const plannedSubjects = syncPlannedSubjectsWithQuestoes(plannedSubjectsRaw, topicQuestoes);
      const totalCapacity = getEffectiveTopicCapacity(plannedSubjects, topic.estimatedQuestionCapacity);

      const generatedQuestionCount = countCoveredSubjectSlots(plannedSubjects);
      const coveragePercent = computeCoveragePercent(
        generatedQuestionCount,
        totalCapacity
      );
      const status = suggestTopicStatus(
        generatedQuestionCount,
        totalCapacity
      );

      const ref = db.collection(OFTREVIEW_APOSTILA_TOPICS_COLLECTION).doc();
      batch.set(ref, {
        apostilaTitulo,
        topicTitle: topic.topicTitle,
        ...(topic.topicSummary ? { topicSummary: topic.topicSummary } : {}),
        ...(topic.pages ? { pages: topic.pages } : {}),
        ...(topic.keywords ? { keywords: topic.keywords } : {}),
        plannedSubjects,
        estimatedQuestionCapacity: totalCapacity,
        generatedQuestionCount,
        coveragePercent,
        status,
        createdAt: now,
        updatedAt: now,
      });
      savedIds.push(ref.id);
      topicsAdded += 1;
      existingTopicsByTitle.set(titleKey, { ref, data: { topicTitle: topic.topicTitle } });
    }

    const newLastPageProcessed = effectiveChunkEnd;
    batch.set(
      contentDocRef,
      {
        topicMappingProgress: {
          lastPageProcessed: newLastPageProcessed,
          totalPages: effectiveTotalPages,
          updatedAt: Date.now(),
        },
      },
      { merge: true }
    );

    await batch.commit();

    const mappingComplete = isMappingComplete(newLastPageProcessed, effectiveTotalPages);
    const percentComplete = computeMappingPercent(newLastPageProcessed, effectiveTotalPages);
    const totalTopicsNow = existingTopicsByTitle.size;

    return NextResponse.json({
      ok: true,
      apostilaTitulo,
      mode,
      topicsCount: totalTopicsNow,
      topicsAdded,
      topicsUpdated,
      topicIds: savedIds,
      pagesAnalyzed: pagesIncluded,
      chunkStart,
      chunkEnd: effectiveChunkEnd,
      contentTruncated: truncated,
      lastPageProcessed: newLastPageProcessed,
      totalPages: effectiveTotalPages,
      percentComplete,
      mappingComplete,
      message: mappingComplete
        ? `Mapeamento completo: ${newLastPageProcessed} de ${effectiveTotalPages} páginas. ${totalTopicsNow} tópico(s) no total.`
        : `Trecho páginas ${chunkStart}–${effectiveChunkEnd} mapeado (${newLastPageProcessed} de ${effectiveTotalPages} páginas, ${percentComplete}%).`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[map-topics] error:', msg, err);
    if (msg.startsWith('Gemini HTTP')) {
      return NextResponse.json(
        { error: 'Falha ao mapear tópicos. Tente novamente.', hint: msg },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: 'Erro interno ao mapear tópicos.' }, { status: 500 });
  }
}
