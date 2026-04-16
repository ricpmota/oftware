/**
 * POST /api/chat
 * 1) Busca no Discovery Engine (search, não answer).
 * 2) Extrai trechos (snippets / extractive segments) dos resultados.
 * 3) Envia os trechos ao Gemini (Vertex AI) para reescrever como resposta clínica curta.
 * 4) Retorna apenas a resposta do Gemini.
 *
 * Configuração no Vercel:
 * - GOOGLE_VERTEX_CREDENTIALS_JSON: JSON da chave com Vertex AI / Discovery Engine.
 * - DISCOVERY_ENGINE_ID ou DISCOVERY_DATA_STORE_ID: ID do app de busca.
 * Runtime: Node.js (não Edge).
 */

import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { loadKnowledge } from '@/lib/knowledge/knowledgeLoader';
import { buildKnowledgeBlock } from '@/lib/knowledge/buildKnowledgeBlock';

export const runtime = 'nodejs';

const DISCOVERY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

/** Limite de caracteres (Unicode) da base local; sobrescrever com CHAT_KNOWLEDGE_MAX_CHARS se necessário. */
const CHAT_KNOWLEDGE_MAX_CHARS = Math.max(
  0,
  Number.parseInt(process.env.CHAT_KNOWLEDGE_MAX_CHARS ?? '', 10) || 48_000
);

const GEMINI_SYSTEM_PROMPT = `Você é um médico preceptor ensinando para prova e prática clínica.
Responda em português (Brasil), em Markdown, com tópicos curtos (bullets).
Use sempre listas com - e não use * misturado.
Não escreva parágrafos longos.

CONHECIMENTO_BASE (no início do contexto do usuário): regras do produto, contexto estrutural, linguagem, glossário e políticas internas. Não trate como citação factual de apostila nem use para afirmar conteúdo clínico que deva vir das apostilas indexadas.

EVIDÊNCIAS (trechos numerados do Discovery, quando existirem): base factual principal da resposta sobre conteúdo de apostilas e clínica tutelada por elas.

Regra obrigatória: em caso de conflito entre CONHECIMENTO_BASE e EVIDÊNCIAS, priorize sempre as EVIDÊNCIAS. Não transforme CONHECIMENTO_BASE em citação factual de apostila.

Quando houver EVIDÊNCIAS:
- Baseie afirmações clínicas e de apostila nelas.
- Ao final de CADA bullet, inclua 1 a 2 referências no formato [1] ou [2,3] quando fizer sentido.
- Não use a mesma referência para todos os bullets se houver evidências diferentes.
- Use preferencialmente a fonte mais direta para aquele bullet.
- Evite colocar [n] em títulos; use referências só nas afirmações.
- Se a evidência não suportar a resposta, diga que não encontrou nas apostilas.
- Não cite fontes [n] que não estejam nas EVIDÊNCIAS.

Quando NÃO houver EVIDÊNCIAS:
- Para conteúdo clínico ou factual de apostila: diga que não encontrou nas apostilas indexadas (não invente [n]).
- Para dúvidas estruturais do produto, linguagem ou políticas internas: pode responder usando apenas o CONHECIMENTO_BASE, sem numerar como apostila.`;

interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function getCredentials(): GoogleCreds | null {
  const jsonEnv = process.env.GOOGLE_VERTEX_CREDENTIALS_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as { project_id?: string; client_email?: string; private_key?: string };
      const key = typeof parsed.private_key === 'string' ? parsed.private_key.replace(/\\n/g, '\n') : '';
      if (parsed.project_id && parsed.client_email && key) {
        return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: key };
      }
    } catch (e) {
      console.error('GOOGLE_VERTEX_CREDENTIALS_JSON parse error:', e);
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

/** Extrai texto dos resultados do search: derivedStructData (snippets, extractive), chunk.content */
function extractSnippetsFromSearchResponse(data: Record<string, unknown>): string[] {
  const results = data.results as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(results)) return [];

  const texts: string[] = [];
  for (const r of results) {
    const doc = r.document as Record<string, unknown> | undefined;
    if (doc?.derivedStructData && typeof doc.derivedStructData === 'object') {
      const d = doc.derivedStructData as Record<string, unknown>;
      if (Array.isArray(d.snippets)) {
        for (const s of d.snippets) {
          const snip = typeof s === 'object' && s !== null && 'snippet' in s ? (s as { snippet?: string }).snippet : s;
          if (typeof snip === 'string' && snip.trim()) texts.push(snip.trim());
        }
      }
      if (Array.isArray(d.extractive_segments)) {
        for (const seg of d.extractive_segments) {
          const content = typeof seg === 'object' && seg !== null && 'content' in seg ? (seg as { content?: string }).content : seg;
          if (typeof content === 'string' && content.trim()) texts.push(content.trim());
        }
      }
      if (Array.isArray(d.extractive_answers)) {
        for (const a of d.extractive_answers) {
          const content = typeof a === 'object' && a !== null && 'content' in a ? (a as { content?: string }).content : a;
          if (typeof content === 'string' && content.trim()) texts.push(content.trim());
        }
      }
    }
    const chunk = r.chunk as Record<string, unknown> | undefined;
    if (chunk && typeof chunk.content === 'string' && chunk.content.trim()) {
      texts.push(chunk.content.trim());
    }
  }
  return [...new Set(texts)];
}

const MAX_SOURCES = 6;

export interface Source {
  id: number;
  title: string;
  snippet: string;
  page?: number;
  uri?: string;
}

/** Extrai fontes dos resultados do search. Deduplica por (title+snippet), limita a MAX_SOURCES, ordenado por relevância (ordem do search). */
function extractSourcesFromSearchResponse(data: Record<string, unknown>): Source[] {
  const results = data.results as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const raw: { title: string; snippet: string; page?: number; uri?: string }[] = [];

  for (const r of results) {
    if (raw.length >= MAX_SOURCES) break;

    const doc = r.document as Record<string, unknown> | undefined;
    const chunk = r.chunk as Record<string, unknown> | undefined;
    const docMeta = chunk?.documentMetadata as Record<string, unknown> | undefined;
    const title = (typeof docMeta?.title === 'string' ? docMeta.title : null) ??
      (doc?.derivedStructData && typeof doc.derivedStructData === 'object' && (doc.derivedStructData as Record<string, unknown>).title) as string | undefined ??
      (typeof doc?.title === 'string' ? doc.title : null) ?? 'Apostila';
    const pageIdentifier = docMeta?.pageIdentifier;
    const pageNum = typeof pageIdentifier === 'number' && Number.isFinite(pageIdentifier)
      ? pageIdentifier
      : typeof pageIdentifier === 'string'
        ? parseInt(pageIdentifier.replace(/\D/g, ''), 10) || undefined
        : undefined;
    const uri = typeof docMeta?.uri === 'string' ? docMeta.uri : (doc?.derivedStructData && typeof doc.derivedStructData === 'object' && (doc.derivedStructData as Record<string, unknown>).link) as string | undefined ?? undefined;

    const push = (snippet: string) => {
      const key = `${title}\0${snippet}`;
      if (!snippet.trim() || seen.has(key)) return;
      seen.add(key);
      raw.push({ title, snippet: snippet.trim(), ...(pageNum != null && { page: pageNum }), ...(uri && { uri }) });
    };

    if (doc?.derivedStructData && typeof doc.derivedStructData === 'object') {
      const d = doc.derivedStructData as Record<string, unknown>;
      if (Array.isArray(d.snippets)) {
        for (const s of d.snippets) {
          const snip = typeof s === 'object' && s !== null && 'snippet' in s ? (s as { snippet?: string }).snippet : s;
          if (typeof snip === 'string') push(snip);
        }
      }
      if (Array.isArray(d.extractive_segments)) {
        for (const seg of d.extractive_segments) {
          const content = typeof seg === 'object' && seg !== null && 'content' in seg ? (seg as { content?: string }).content : seg;
          if (typeof content === 'string') push(content);
        }
      }
      if (Array.isArray(d.extractive_answers)) {
        for (const a of d.extractive_answers) {
          const content = typeof a === 'object' && a !== null && 'content' in a ? (a as { content?: string }).content : a;
          if (typeof content === 'string') push(content);
        }
      }
    }
    if (chunk && typeof chunk.content === 'string') push(chunk.content);
  }

  return raw.slice(0, MAX_SOURCES).map((s, i) => ({ ...s, id: i + 1 }));
}

export async function POST(request: NextRequest) {
  try {
    const creds = getCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Discovery Engine não configurado.', hint: 'Defina GOOGLE_VERTEX_CREDENTIALS_JSON no Vercel.' },
        { status: 500 }
      );
    }

    const dataStoreId = process.env.DISCOVERY_DATA_STORE_ID;
    const engineId = process.env.DISCOVERY_ENGINE_ID;
    if (!dataStoreId && !engineId) {
      return NextResponse.json(
        { error: 'Discovery Engine não configurado.', hint: 'Defina DISCOVERY_DATA_STORE_ID ou DISCOVERY_ENGINE_ID no Vercel.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : undefined;
    if (!message) {
      return NextResponse.json({ error: 'Campo "message" é obrigatório.' }, { status: 400 });
    }

    const accessToken = await getAccessToken(creds);
    const servingPath = engineId
      ? `engines/${engineId}/servingConfigs/default_search`
      : `dataStores/${dataStoreId}/servingConfigs/default_search`;
    const searchUrl = `https://discoveryengine.googleapis.com/v1/projects/${creds.projectId}/locations/global/collections/default_collection/${servingPath}:search`;

    // 1) Discovery Engine search (não answer)
    const searchPayload = {
      query: message,
      pageSize: 10,
      contentSearchSpec: {
        snippetSpec: { returnSnippet: true },
        extractiveContentSpec: {
          maxExtractiveSegmentCount: 8,
        },
      },
    };

    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(searchPayload),
    });

    const searchData = await searchRes.json().catch(() => ({}));
    if (!searchRes.ok) {
      const errMsg = (searchData as { error?: { message?: string } }).error?.message || searchRes.statusText;
      console.error('Discovery Engine search error:', searchRes.status, errMsg, searchData);
      return NextResponse.json(
        { error: 'Falha ao obter resposta do assistente. Tente novamente.' },
        { status: searchRes.status >= 500 ? 502 : 400 }
      );
    }

    // 2) Extrair fontes (id 1..N) e montar bloco EVIDÊNCIAS para o Gemini
    const searchPayloadTyped = searchData as Record<string, unknown>;
    const snippets = extractSnippetsFromSearchResponse(searchPayloadTyped);
    const sources = extractSourcesFromSearchResponse(searchPayloadTyped);
    const evidenceText = sources.length > 0
      ? sources.map((s) => `[${s.id}] ${s.title}\n${s.snippet}`).join('\n\n')
      : snippets.length > 0
        ? snippets.join('\n\n---\n\n')
        : '';

    const knowledge = await loadKnowledge({
      surface: 'oftreview',
      maxTotalChars: CHAT_KNOWLEDGE_MAX_CHARS,
    });
    const knowledgeText = buildKnowledgeBlock(knowledge);
    const knowledgePrefix = knowledgeText.trim()
      ? `${knowledgeText.trim()}\n\n---\n\n`
      : '';

    console.info('[api/chat] local knowledge', {
      sourceCount: knowledge.sources.length,
      knowledgeTextChars: knowledgeText.length,
    });

    // 3) Gemini (Vertex AI Generative API)
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const geminiModel = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash-001';
    const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

    let userPrompt: string;
    if (evidenceText) {
      userPrompt = `${knowledgePrefix}EVIDÊNCIAS:\n\n${evidenceText}\n\n---\n\nPergunta: ${message}`;
    } else if (knowledgePrefix) {
      userPrompt =
        `${knowledgePrefix}` +
        `Não há EVIDÊNCIAS (trechos do Discovery) para esta pergunta.\n` +
        `Para conteúdo clínico ou factual de apostila, diga que não encontrou nas apostilas indexadas.\n` +
        `Para dúvidas estruturais do produto, linguagem ou políticas internas, use apenas o CONHECIMENTO_BASE acima.\n\n` +
        `Pergunta: ${message}`;
    } else {
      userPrompt = `Não há evidências indexadas para esta pergunta. Responda apenas: "Não encontrei isso nas apostilas indexadas."`;
    }

    const geminiPayload = {
      systemInstruction: { role: 'user', parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.3,
      },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload),
    });

    const geminiData = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      const errMsg = (geminiData as { error?: { message?: string } }).error?.message || geminiRes.statusText;
      console.error('Gemini generateContent error:', geminiRes.status, errMsg, geminiData);
      return NextResponse.json(
        { error: 'Falha ao obter resposta do assistente. Tente novamente.' },
        { status: geminiRes.status >= 500 ? 502 : 400 }
      );
    }

    const candidates = (geminiData as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
    let answerText = '';
    if (Array.isArray(candidates) && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (typeof p.text === 'string') answerText += p.text;
        }
      }
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() || '-' : '-';
    const relatedQuestions: string[] = [];
    const finalAnswer =
      answerText.trim() ||
      (sources.length === 0 && !knowledgePrefix
        ? 'Não encontrei isso nas apostilas indexadas.'
        : 'Não foi possível gerar uma resposta para essa pergunta. Tente reformular.');

    return NextResponse.json({
      answer: finalAnswer,
      sessionId,
      relatedQuestions,
      sources,
      ...(conversationId && { conversationId }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Chat API error:', msg, err);
    return NextResponse.json(
      { error: 'Erro interno. Verifique as variáveis de ambiente e tente novamente.' },
      { status: 500 }
    );
  }
}
