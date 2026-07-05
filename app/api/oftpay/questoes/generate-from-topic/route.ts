/**
 * POST /api/oftpay/questoes/generate-from-topic
 * Gera 1 questão (rascunho) a partir de um tópico mapeado + conteúdo extraído.
 * Admin only. Sem PDF, sem lote.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildTopicContentForGeneration } from '@/lib/oftpay/buildTopicContentForGeneration';
import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import {
  QUESTOES_ADMIN_EMAIL,
  OFTREVIEW_APOSTILAS_GCS_PREFIX,
  type AlternativaLetra,
  type OftpayQuestaoAlternativa,
  type QuestaoDificuldade,
} from '@/types/oftpayQuestoes';
import {
  clampTopicCapacity,
  computeCoveragePercent,
  OFTREVIEW_APOSTILA_TOPICS_COLLECTION,
  suggestTopicStatus,
} from '@/types/oftreviewApostilaTopic';
import { OFTREVIEW_CONTENT_COLLECTION } from '@/types/oftreviewContent';
import { OFTREVIEW_SOURCE_TRECHO_MIN_CHARS } from '@/types/oftpaySources';
import {
  countCoveredSubjectSlots,
  DEFAULT_NUMERO_ALTERNATIVAS,
  getCoveredCombinationsForPrompt,
  getEffectiveTopicCapacity,
  getSubjectById,
  isSubjectDifficultyCovered,
  markSubjectDifficultyCancelled,
  markSubjectDifficultyCovered,
  normalizePlannedSubjects,
  type PlannedSubjectDifficulty,
} from '@/lib/oftpay/plannedQuestionSubjects';

export const runtime = 'nodejs';
export const maxDuration = 120;

const DISCOVERY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const QUESTOES_COLLECTION = 'oftpayQuestoes';

const VALID_DIFICULDADES: QuestaoDificuldade[] = ['facil', 'medio', 'dificil'];
const VALID_LETRAS: AlternativaLetra[] = ['A', 'B', 'C', 'D', 'E'];

interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface GeneratePayload {
  topicId?: string;
  plannedSubjectId?: string;
  dificuldade?: QuestaoDificuldade;
  /** Status inicial da questão gerada (padrão: rascunho). */
  initialStatus?: 'rascunho' | 'publicado';
  /** Em lote, pode cancelar a célula ao falhar validação da IA. */
  onValidationFailure?: 'error' | 'cancel';
  /** Ignorado — sempre 5 alternativas. */
  numeroAlternativas?: 4 | 5;
}

interface GeminiAlternativa {
  letra?: string;
  texto?: string;
  correta?: boolean;
}

interface GeminiQuestaoJson {
  error?: string;
  enunciado?: string;
  alternativas?: GeminiAlternativa[];
  explicacao?: string;
  dificuldade?: string;
}

const GEMINI_SYSTEM_PROMPT = `Você é um professor de oftalmologia criando questões para estudo.

Use EXCLUSIVAMENTE o conteúdo textual fornecido sobre o tópico.
Não use conhecimento externo.
Não invente informações.
Não cite condutas, números, classificações ou conceitos que não estejam no material.

A questão deve:
- ter linguagem clara
- testar compreensão do conceito do tópico
- ter apenas uma alternativa correta
- ter distratores plausíveis, mas não ambíguos
- explicar por que a correta está correta com base no material
- não mencionar "segundo o trecho" no enunciado
- não criar pegadinha maliciosa

Responda somente com JSON estrito conforme solicitado.`;

const QUESTAO_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    enunciado: { type: 'STRING' },
    alternativas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          letra: { type: 'STRING' },
          texto: { type: 'STRING' },
          correta: { type: 'BOOLEAN' },
        },
        required: ['letra', 'texto', 'correta'],
      },
    },
    explicacao: { type: 'STRING' },
    dificuldade: { type: 'STRING' },
  },
  required: ['enunciado', 'alternativas', 'explicacao'],
};

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
      console.error('[generate-from-topic] GOOGLE_VERTEX_CREDENTIALS_JSON parse error:', e);
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

function parseTopicPages(data: Record<string, unknown>): number[] | undefined {
  if (!Array.isArray(data.pages)) return undefined;
  const nums = data.pages
    .map((p) => (typeof p === 'number' ? p : parseInt(String(p), 10)))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? [...new Set(nums)].sort((a, b) => a - b) : undefined;
}

function buildGeminiPrompt(
  apostilaTitulo: string,
  topicTitle: string,
  topicSummary: string | undefined,
  keywords: string[] | undefined,
  contentText: string,
  pagesIncluded: number[],
  dificuldade: QuestaoDificuldade,
  numeroAlternativas: 4 | 5,
  targetSubject: { title: string; hint?: string },
  alreadyCoveredSubjects: string[]
): string {
  const letras = VALID_LETRAS.slice(0, numeroAlternativas).join(', ');
  const keywordsLine = keywords?.length ? keywords.join(', ') : 'não informadas';
  const coveredBlock =
    alreadyCoveredSubjects.length > 0
      ? `\nASSUNTOS JÁ ABORDADOS (NÃO repita estes focos):\n${alreadyCoveredSubjects.map((s) => `- ${s}`).join('\n')}\n`
      : '';

  return `TÓPICO DE ESTUDO (fonte permitida):
Apostila: ${apostilaTitulo}
Tópico: ${topicTitle}
Resumo: ${topicSummary ?? 'não informado'}
Palavras-chave: ${keywordsLine}
Páginas incluídas: ${pagesIncluded.length ? pagesIncluded.join(', ') : 'todas disponíveis'}

ASSUNTO ESPECÍFICO DESTA QUESTÃO (foco obrigatório):
${targetSubject.title}
${targetSubject.hint ? `Detalhe: ${targetSubject.hint}` : ''}
${coveredBlock}
CONTEÚDO DO TÓPICO:
---
${contentText}
---

Gere exatamente 1 questão de múltipla escolha com dificuldade "${dificuldade}" e ${numeroAlternativas} alternativas (${letras}).

A questão DEVE abordar exclusivamente o ASSUNTO ESPECÍFICO indicado acima, usando o conteúdo do tópico.
Não repita enunciados ou focos dos assuntos já abordados listados acima.

Responda SOMENTE com JSON válido:
{
  "enunciado": "...",
  "alternativas": [
    { "letra": "A", "texto": "...", "correta": false },
    { "letra": "B", "texto": "...", "correta": true }
  ],
  "explicacao": "...",
  "dificuldade": "${dificuldade}"
}

Se o conteúdo não for suficiente para uma questão de boa qualidade, responda apenas:
{ "error": "TRECHO_INSUFICIENTE" }`;
}

const GEMINI_GENERATE_MAX_ATTEMPTS = 3;

function coerceCorreta(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === 'sim' || v === '1') return true;
    if (v === 'false' || v === 'nao' || v === 'não' || v === '0' || v === '') return false;
  }
  if (typeof value === 'number') return value === 1;
  return Boolean(value);
}

/** Normaliza JSON bruto da IA antes da validação (letras, booleanos, ordem). */
function preprocessGeminiQuestao(raw: GeminiQuestaoJson): GeminiQuestaoJson {
  const alternativas = (raw.alternativas ?? []).map((alt) => ({
    letra: String(alt.letra ?? '')
      .trim()
      .toUpperCase()
      .replace(/[^A-E]/g, '')
      .slice(0, 1),
    texto: String(alt.texto ?? '').trim(),
    correta: coerceCorreta(alt.correta),
  }));

  return {
    ...raw,
    enunciado: String(raw.enunciado ?? '').trim(),
    explicacao: String(raw.explicacao ?? '').trim(),
    alternativas,
  };
}

function validateGeneratedQuestao(
  raw: GeminiQuestaoJson,
  numeroAlternativas: 4 | 5
): { ok: true; data: GeminiQuestaoJson } | { ok: false; errors: string[] } {
  if (raw.error === 'TRECHO_INSUFICIENTE') {
    return { ok: false, errors: ['TRECHO_INSUFICIENTE'] };
  }

  const errors: string[] = [];
  const enunciado = (raw.enunciado ?? '').trim();
  const explicacao = (raw.explicacao ?? '').trim();
  const alts = raw.alternativas ?? [];

  if (!enunciado) errors.push('enunciado ausente na resposta da IA.');
  if (!explicacao) errors.push('explicacao ausente na resposta da IA.');
  if (alts.length < 4) errors.push('mínimo de 4 alternativas na resposta da IA.');
  if (alts.length > 5) errors.push('máximo de 5 alternativas na resposta da IA.');
  if (alts.length !== numeroAlternativas) {
    errors.push(`esperado ${numeroAlternativas} alternativas, recebido ${alts.length}.`);
  }

  const expectedLetras = VALID_LETRAS.slice(0, numeroAlternativas);
  const seen = new Set<string>();
  let corretas = 0;

  for (const alt of alts) {
    const letra = String(alt.letra ?? '').trim().toUpperCase();
    if (!expectedLetras.includes(letra as AlternativaLetra)) {
      errors.push(`letra inválida: ${letra || '(vazia)'}.`);
    }
    if (seen.has(letra)) errors.push(`letra repetida: ${letra}.`);
    seen.add(letra);
    if (!(alt.texto ?? '').trim()) errors.push(`alternativa ${letra} sem texto.`);
    if (coerceCorreta(alt.correta)) corretas += 1;
  }

  if (corretas !== 1) errors.push('deve haver exatamente 1 alternativa correta.');

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: raw };
}

function normalizeAlternativas(
  alts: GeminiAlternativa[],
  numeroAlternativas: 4 | 5
): OftpayQuestaoAlternativa[] {
  const expectedLetras = VALID_LETRAS.slice(0, numeroAlternativas);
  const byLetter = new Map<string, GeminiAlternativa>();
  for (const alt of alts) {
    byLetter.set(String(alt.letra ?? '').trim().toUpperCase(), alt);
  }
  return expectedLetras.map((letra) => {
    const alt = byLetter.get(letra)!;
    return {
      letra,
      texto: String(alt.texto ?? '').trim(),
      correta: coerceCorreta(alt.correta),
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminEmail(request);
    if (authResult instanceof NextResponse) return authResult;
    const adminEmail = authResult.email;

    const body = (await request.json().catch(() => ({}))) as GeneratePayload;
    const topicId = typeof body.topicId === 'string' ? body.topicId.trim() : '';
    const plannedSubjectId =
      typeof body.plannedSubjectId === 'string' ? body.plannedSubjectId.trim() : '';
    const dificuldade = body.dificuldade;
    const numeroAlternativas = DEFAULT_NUMERO_ALTERNATIVAS;
    const initialStatus = body.initialStatus === 'publicado' ? 'publicado' : 'rascunho';
    const onValidationFailure = body.onValidationFailure === 'cancel' ? 'cancel' : 'error';

    if (!topicId) {
      return NextResponse.json({ error: 'topicId é obrigatório.' }, { status: 400 });
    }
    if (!plannedSubjectId) {
      return NextResponse.json({ error: 'plannedSubjectId é obrigatório.' }, { status: 400 });
    }
    if (!dificuldade || !VALID_DIFICULDADES.includes(dificuldade)) {
      return NextResponse.json(
        { error: 'dificuldade deve ser "facil", "medio" ou "dificil".' },
        { status: 400 }
      );
    }

    const creds = getVertexCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Vertex AI não configurado.', hint: 'Defina GOOGLE_VERTEX_CREDENTIALS_JSON.' },
        { status: 500 }
      );
    }

    const db = getFirestoreAdmin();

    const topicSnap = await db.collection(OFTREVIEW_APOSTILA_TOPICS_COLLECTION).doc(topicId).get();
    if (!topicSnap.exists) {
      return NextResponse.json({ error: 'Tópico não encontrado.' }, { status: 404 });
    }

    const topicData = topicSnap.data() as Record<string, unknown>;
    const apostilaTitulo = String(topicData.apostilaTitulo ?? '').trim();
    const topicTitle = String(topicData.topicTitle ?? topicData.titulo ?? '').trim();
    const topicSummary =
      topicData.topicSummary != null
        ? String(topicData.topicSummary).trim()
        : topicData.trechoResumo != null
          ? String(topicData.trechoResumo).trim()
          : undefined;
    const topicPages = parseTopicPages(topicData);
    const keywords = Array.isArray(topicData.keywords)
      ? topicData.keywords.map((k) => String(k).trim()).filter(Boolean)
      : undefined;
    const estimatedQuestionCapacity = clampTopicCapacity(topicData.estimatedQuestionCapacity);
    const plannedSubjects = normalizePlannedSubjects(topicData.plannedSubjects);

    if (!apostilaTitulo || !topicTitle) {
      return NextResponse.json({ error: 'Tópico inválido (dados incompletos).' }, { status: 400 });
    }

    if (plannedSubjects.length === 0) {
      return NextResponse.json(
        {
          error: 'PLANO_ASSUNTOS_AUSENTE',
          message:
            'Este tópico não tem assuntos planejados. Remapeie os tópicos da apostila para gerar o plano de cobertura.',
        },
        { status: 422 }
      );
    }

    const targetSubject = getSubjectById(plannedSubjects, plannedSubjectId);
    if (!targetSubject) {
      return NextResponse.json({ error: 'Assunto não encontrado neste tópico.' }, { status: 404 });
    }

    const diffKey = dificuldade as PlannedSubjectDifficulty;
    if (isSubjectDifficultyCovered(targetSubject, diffKey)) {
      return NextResponse.json(
        {
          error: 'CELULA_JA_COBERTA',
          message: `Já existe questão ${dificuldade} para este assunto.`,
        },
        { status: 422 }
      );
    }

    const totalCapacity = getEffectiveTopicCapacity(
      plannedSubjects,
      estimatedQuestionCapacity
    );

    const contentSnap = await db
      .collection(OFTREVIEW_CONTENT_COLLECTION)
      .where('apostilaTitulo', '==', apostilaTitulo)
      .limit(1)
      .get();

    if (contentSnap.empty) {
      return NextResponse.json(
        {
          error: 'CONTEUDO_NAO_EXTRAIDO',
          message: 'Extraia o conteúdo desta apostila antes de gerar questões.',
        },
        { status: 404 }
      );
    }

    const contentData = contentSnap.docs[0].data() as {
      pages?: Array<{ page?: number; content?: string }>;
    };
    const contentPages = Array.isArray(contentData.pages)
      ? contentData.pages.map((p, i) => ({
          page: typeof p.page === 'number' ? p.page : i + 1,
          content: String(p.content ?? ''),
        }))
      : [];

    const { text: contentText, pagesIncluded } = buildTopicContentForGeneration(
      contentPages,
      topicPages
    );

    if (contentText.length < OFTREVIEW_SOURCE_TRECHO_MIN_CHARS) {
      return NextResponse.json(
        {
          error: 'TRECHO_INSUFICIENTE',
          message: 'O conteúdo deste tópico não é suficiente para gerar uma questão de boa qualidade.',
        },
        { status: 422 }
      );
    }

    const generatedQuestionCount = countCoveredSubjectSlots(plannedSubjects);
    const coveredCombinations = getCoveredCombinationsForPrompt(plannedSubjects);

    const coveragePercent = computeCoveragePercent(generatedQuestionCount, totalCapacity);
    const topicStatus = suggestTopicStatus(
      generatedQuestionCount,
      totalCapacity,
      topicData.status as 'ativo' | 'revisar' | 'esgotado' | 'ignorar' | undefined
    );

    if (topicData.status === 'ignorar') {
      return NextResponse.json(
        {
          error: 'TOPICO_ESGOTADO',
          message: 'Tópico marcado como ignorar.',
          coveragePercent,
        },
        { status: 422 }
      );
    }

    const accessToken = await getAccessToken(creds);
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const geminiModel = resolveGeminiModelId();
    const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

    const userPrompt = buildGeminiPrompt(
      apostilaTitulo,
      topicTitle,
      topicSummary,
      keywords,
      contentText,
      pagesIncluded,
      dificuldade,
      numeroAlternativas,
      { title: targetSubject.title, hint: targetSubject.hint },
      coveredCombinations
    );

    let generated: GeminiQuestaoJson | null = null;
    let lastValidationErrors: string[] = [];
    let lastParseHint = '';

    for (let attempt = 1; attempt <= GEMINI_GENERATE_MAX_ATTEMPTS; attempt += 1) {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { role: 'user', parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: attempt === 1 ? 0.2 : 0.35,
            responseMimeType: 'application/json',
            responseSchema: QUESTAO_RESPONSE_SCHEMA,
          },
        }),
      });

      const geminiData = await geminiRes.json().catch(() => ({}));
      if (!geminiRes.ok) {
        const errMsg =
          (geminiData as { error?: { message?: string } }).error?.message || geminiRes.statusText;
        console.error('[generate-from-topic] Gemini error:', geminiRes.status, errMsg);
        return NextResponse.json(
          { error: 'Falha ao gerar questão. Tente novamente.', hint: errMsg },
          { status: geminiRes.status >= 500 ? 502 : 400 }
        );
      }

      const { text: answerText, finishReason } = getGeminiAnswerText(
        geminiData as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
        }
      );

      if (finishReason === 'MAX_TOKENS') {
        lastParseHint = 'Resposta da IA truncada (MAX_TOKENS).';
        lastValidationErrors = ['resposta truncada pela IA'];
        console.warn('[generate-from-topic] MAX_TOKENS attempt', attempt, topicId);
        continue;
      }

      const parsed = extractJsonFromGeminiText(answerText);
      if (!parsed || typeof parsed !== 'object') {
        lastParseHint = 'Não foi possível extrair JSON da resposta.';
        lastValidationErrors = ['JSON inválido ou vazio'];
        console.warn('[generate-from-topic] invalid JSON attempt', attempt, topicId, answerText.slice(0, 200));
        continue;
      }

      const preprocessed = preprocessGeminiQuestao(parsed as GeminiQuestaoJson);
      const validated = validateGeneratedQuestao(preprocessed, numeroAlternativas);
      if (!validated.ok) {
        lastValidationErrors = validated.errors;
        if (validated.errors.includes('TRECHO_INSUFICIENTE')) {
          break;
        }
        console.warn(
          '[generate-from-topic] validation failed attempt',
          attempt,
          topicId,
          validated.errors
        );
        continue;
      }

      generated = validated.data;
      break;
    }

    if (!generated) {
      const shouldCancelCell =
        onValidationFailure === 'cancel' &&
        !lastValidationErrors.includes('TRECHO_INSUFICIENTE');
      if (shouldCancelCell) {
        const cancelReason =
          lastValidationErrors.length > 0
            ? lastValidationErrors.join('; ')
            : lastParseHint || 'Falha de validação da IA';
        const cancelledSubjects = markSubjectDifficultyCancelled(
          plannedSubjects,
          targetSubject.id,
          diffKey,
          cancelReason
        );
        const newCount = countCoveredSubjectSlots(cancelledSubjects);
        const newCoverage = computeCoveragePercent(newCount, totalCapacity);
        const newStatus = suggestTopicStatus(newCount, totalCapacity, topicStatus);

        await topicSnap.ref.update({
          plannedSubjects: cancelledSubjects,
          generatedQuestionCount: newCount,
          coveragePercent: newCoverage,
          status: newStatus,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          ok: true,
          cancelled: true,
          message: 'Célula cancelada após falha repetida de validação da IA. Seguindo para a próxima.',
          status: 'cancelada',
          topicTitle,
          plannedSubjectTitle: targetSubject.title,
          dificuldade,
          coveragePercent: newCoverage,
          details: lastValidationErrors,
          hint: lastParseHint || undefined,
        });
      }

      if (lastValidationErrors.includes('TRECHO_INSUFICIENTE')) {
        return NextResponse.json(
          {
            error: 'TRECHO_INSUFICIENTE',
            message: 'O conteúdo deste tópico não é suficiente para gerar uma questão de boa qualidade.',
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        {
          error: 'Questão gerada inválida.',
          message: 'A IA não retornou uma questão válida após várias tentativas. Tente novamente.',
          details: lastValidationErrors,
          hint: lastParseHint || undefined,
        },
        { status: 422 }
      );
    }

    const alternativas = normalizeAlternativas(generated.alternativas ?? [], numeroAlternativas);
    const trechoBase =
      contentText.length > 5000 ? `${contentText.slice(0, 5000)}…` : contentText;

    const questaoPayload: Record<string, unknown> = {
      courseId: 'oftreview',
      tema: topicTitle,
      capituloTitulo: topicTitle,
      enunciado: String(generated.enunciado ?? '').trim(),
      alternativas,
      explicacao: String(generated.explicacao ?? '').trim(),
      dificuldade,
      status: initialStatus,
      apostilaTopicId: topicId,
      plannedSubjectId: targetSubject.id,
      plannedSubjectTitle: targetSubject.title,
      fonte: {
        apostilaTitulo,
        sourceType: 'pdf_bucket',
        bucketPath: OFTREVIEW_APOSTILAS_GCS_PREFIX,
        trechoBase,
        ...(pagesIncluded[0] != null ? { pagina: pagesIncluded[0] } : {}),
      },
      criadoPor: adminEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    questaoPayload.subtema = targetSubject.title;

    const questaoRef = await db.collection(QUESTOES_COLLECTION).add(questaoPayload);

    const updatedSubjects = markSubjectDifficultyCovered(
      plannedSubjects,
      targetSubject.id,
      diffKey,
      questaoRef.id
    );
    const newCount = countCoveredSubjectSlots(updatedSubjects);
    const newCoverage = computeCoveragePercent(newCount, totalCapacity);
    const newStatus = suggestTopicStatus(newCount, totalCapacity, topicStatus);

    await topicSnap.ref.update({
      plannedSubjects: updatedSubjects,
      generatedQuestionCount: newCount,
      coveragePercent: newCoverage,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      questaoId: questaoRef.id,
      message:
        initialStatus === 'publicado'
          ? 'Questão criada e publicada.'
          : 'Questão criada como rascunho.',
      status: initialStatus,
      topicTitle,
      plannedSubjectTitle: targetSubject.title,
      dificuldade,
      coveragePercent: newCoverage,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-from-topic] error:', msg, err);
    return NextResponse.json({ error: 'Erro interno ao gerar questão.' }, { status: 500 });
  }
}
