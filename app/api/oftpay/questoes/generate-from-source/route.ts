/**
 * POST /api/oftpay/questoes/generate-from-source
 * Gera exatamente 1 questão (rascunho) a partir de 1 trecho oficial (oftreviewSources).
 * Admin only. Sem Discovery, sem PDF, sem lote.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import {
  QUESTOES_ADMIN_EMAIL,
  OFTREVIEW_APOSTILAS_GCS_PREFIX,
  type AlternativaLetra,
  type OftpayQuestaoAlternativa,
  type QuestaoDificuldade,
} from '@/types/oftpayQuestoes';
import {
  OFTREVIEW_SOURCE_TRECHO_MAX_CHARS,
  type OftreviewSource,
} from '@/types/oftpaySources';

export const runtime = 'nodejs';

const DISCOVERY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const SOURCES_COLLECTION = 'oftreviewSources';
const QUESTOES_COLLECTION = 'oftpayQuestoes';

const VALID_DIFICULDADES: QuestaoDificuldade[] = ['facil', 'medio', 'dificil'];
const VALID_LETRAS: AlternativaLetra[] = ['A', 'B', 'C', 'D', 'E'];

interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface GeneratePayload {
  sourceId?: string;
  dificuldade?: QuestaoDificuldade;
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
      console.error('[generate-from-source] GOOGLE_VERTEX_CREDENTIALS_JSON parse error:', e);
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

function sourceFromAdminDoc(id: string, data: Record<string, unknown>): OftreviewSource {
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
  };
}

function truncateTrecho(trecho: string): string {
  const t = trecho.trim();
  if ([...t].length <= OFTREVIEW_SOURCE_TRECHO_MAX_CHARS) return t;
  return [...t].slice(0, OFTREVIEW_SOURCE_TRECHO_MAX_CHARS).join('');
}

function buildGeminiPrompt(
  source: OftreviewSource,
  dificuldade: QuestaoDificuldade,
  numeroAlternativas: 4 | 5
): string {
  const trecho = truncateTrecho(source.trecho);
  const letras = VALID_LETRAS.slice(0, numeroAlternativas).join(', ');
  const temaRef = (source.capituloTitulo ?? '').trim() || source.tema;

  return `TRECHO OFICIAL (única fonte permitida):
Apostila: ${source.apostilaTitulo}
Página: ${source.pagina ?? 'não informada'}
Tema: ${temaRef}
Subtema: ${source.subtema ?? 'não informado'}

---
${trecho}
---

Gere exatamente 1 questão de múltipla escolha com dificuldade "${dificuldade}" e ${numeroAlternativas} alternativas (${letras}).

Responda SOMENTE com JSON válido, sem markdown, sem texto antes ou depois.
Formato exato:
{
  "enunciado": "...",
  "alternativas": [
    { "letra": "A", "texto": "...", "correta": false },
    { "letra": "B", "texto": "...", "correta": true }
  ],
  "explicacao": "...",
  "dificuldade": "${dificuldade}"
}

Se o trecho não for suficiente para uma questão de boa qualidade, responda apenas:
{ "error": "TRECHO_INSUFICIENTE" }`;
}

const GEMINI_SYSTEM_PROMPT = `Você é um professor de oftalmologia criando questões para estudo.

Use EXCLUSIVAMENTE o trecho oficial fornecido pelo usuário.
Não use conhecimento externo.
Não invente informações.
Não cite condutas, números, classificações ou conceitos que não estejam no trecho.

A questão deve:
- ter linguagem clara
- testar compreensão do conceito
- ter apenas uma alternativa correta
- ter distratores plausíveis, mas não ambíguos
- explicar por que a correta está correta com base no trecho
- não mencionar "segundo o trecho" no enunciado
- não criar pegadinha maliciosa

Responda somente com JSON estrito conforme solicitado.`;

function extractJsonFromText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
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
    if (alt.correta) corretas += 1;
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
      correta: Boolean(alt.correta),
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminEmail(request);
    if (authResult instanceof NextResponse) return authResult;
    const adminEmail = authResult.email;

    const body = (await request.json().catch(() => ({}))) as GeneratePayload;
    const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : '';
    const dificuldade = body.dificuldade;
    const numeroAlternativas = body.numeroAlternativas === 5 ? 5 : 4;

    if (!sourceId) {
      return NextResponse.json({ error: 'sourceId é obrigatório.' }, { status: 400 });
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
    const sourceSnap = await db.collection(SOURCES_COLLECTION).doc(sourceId).get();
    if (!sourceSnap.exists) {
      return NextResponse.json({ error: 'Trecho oficial não encontrado.' }, { status: 404 });
    }

    const source = sourceFromAdminDoc(sourceId, sourceSnap.data() as Record<string, unknown>);
    if (!source.trecho.trim()) {
      return NextResponse.json({ error: 'Trecho oficial vazio.' }, { status: 400 });
    }

    const accessToken = await getAccessToken(creds);
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const geminiModel = resolveGeminiModelId();
    const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

    const userPrompt = buildGeminiPrompt(source, dificuldade, numeroAlternativas);

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'user', parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2,
        },
      }),
    });

    const geminiData = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      const errMsg =
        (geminiData as { error?: { message?: string } }).error?.message || geminiRes.statusText;
      console.error('[generate-from-source] Gemini error:', geminiRes.status, errMsg);
      return NextResponse.json(
        { error: 'Falha ao gerar questão. Tente novamente.' },
        { status: geminiRes.status >= 500 ? 502 : 400 }
      );
    }

    const candidates = (geminiData as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }).candidates;

    let answerText = '';
    if (Array.isArray(candidates) && candidates.length > 0) {
      for (const part of candidates[0].content?.parts ?? []) {
        if (typeof part.text === 'string') answerText += part.text;
      }
    }

    const parsed = extractJsonFromText(answerText);
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json(
        {
          error: 'Resposta da IA em formato inválido. Tente novamente.',
          hint: 'Não foi possível extrair JSON da resposta.',
        },
        { status: 422 }
      );
    }

    const validated = validateGeneratedQuestao(parsed as GeminiQuestaoJson, numeroAlternativas);
    if (!validated.ok) {
      if (validated.errors.includes('TRECHO_INSUFICIENTE')) {
        return NextResponse.json(
          { error: 'TRECHO_INSUFICIENTE', message: 'O trecho não é suficiente para gerar uma questão de boa qualidade.' },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { error: 'Questão gerada inválida.', details: validated.errors },
        { status: 422 }
      );
    }

    const generated = validated.data;
    const alternativas = normalizeAlternativas(generated.alternativas ?? [], numeroAlternativas);
    const temaQuestao = ((source.capituloTitulo ?? '').trim() || source.tema).trim();

    const questaoPayload: Record<string, unknown> = {
      courseId: 'oftreview',
      tema: temaQuestao,
      enunciado: String(generated.enunciado ?? '').trim(),
      alternativas,
      explicacao: String(generated.explicacao ?? '').trim(),
      dificuldade,
      status: 'rascunho',
      sourceId,
      fonte: {
        apostilaTitulo: source.apostilaTitulo.trim(),
        sourceType: 'pdf_bucket',
        bucketPath: OFTREVIEW_APOSTILAS_GCS_PREFIX,
        trechoBase: truncateTrecho(source.trecho),
        ...(source.pagina != null ? { pagina: source.pagina } : {}),
      },
      criadoPor: adminEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (source.subtema?.trim()) {
      questaoPayload.subtema = source.subtema.trim();
    }

    if (source.knowledgeMapId?.trim()) {
      questaoPayload.knowledgeMapId = source.knowledgeMapId.trim();
    }

    if (source.capituloTitulo?.trim()) {
      questaoPayload.capituloTitulo = source.capituloTitulo.trim();
    }

    const questaoRef = await db.collection(QUESTOES_COLLECTION).add(questaoPayload);

    return NextResponse.json({
      ok: true,
      questaoId: questaoRef.id,
      message: 'Questão criada como rascunho.',
      status: 'rascunho',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-from-source] error:', msg, err);
    return NextResponse.json({ error: 'Erro interno ao gerar questão.' }, { status: 500 });
  }
}
