/**
 * POST /api/chat
 * 1) Busca evidências nas apostilas (Discovery + fallback tópicos mapeados).
 * 2) Envia ao Gemini (Vertex AI) para resposta clínica didática.
 * 3) Retorna answer + sources.
 *
 * Configuração no Vercel:
 * - GOOGLE_VERTEX_CREDENTIALS_JSON: JSON da chave com Vertex AI / Discovery Engine.
 * - DISCOVERY_ENGINE_ID ou DISCOVERY_DATA_STORE_ID: ID do app de busca (recomendado).
 * Runtime: Node.js (não Edge).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { loadKnowledge } from '@/lib/knowledge/knowledgeLoader';
import { buildKnowledgeBlock } from '@/lib/knowledge/buildKnowledgeBlock';
import { searchApostilaEvidence } from '@/lib/oftpay/apostilaEvidenceSearch';
import { buildApostilaRetrievalQuery, isApostilaProductQuestion } from '@/lib/oftpay/apostilaRetrievalQuery';

export const runtime = 'nodejs';

/** Limite de caracteres (Unicode) da base local; sobrescrever com CHAT_KNOWLEDGE_MAX_CHARS se necessário. */
const CHAT_KNOWLEDGE_MAX_CHARS = Math.max(
  0,
  Number.parseInt(process.env.CHAT_KNOWLEDGE_MAX_CHARS ?? '', 10) || 48_000
);

const GEMINI_SYSTEM_PROMPT = `Você é um médico preceptor ensinando para prova e prática clínica.
Responda em português (Brasil), em Markdown, com bullets (-).
Use sempre listas com - e não use * misturado.
Quando houver EVIDÊNCIAS suficientes, escreva de 4 a 8 bullets objetivos e didáticos (cada um com 1–3 frases).
Não seja telegráfico: explique o raciocínio clínico quando as evidências permitirem.

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

export type Source = {
  id: number;
  title: string;
  snippet: string;
  page?: number;
  uri?: string;
  docId?: string;
};

const NO_EVIDENCE_ANSWER =
  'Não encontrei essa informação nas apostilas disponíveis. Tente reformular a pergunta com o nome da doença, da estrutura ou do exame.';

export async function POST(request: NextRequest) {
  try {
    const creds = getGoogleVertexCredentials();
    if (!creds) {
      return NextResponse.json(
        { error: 'Discovery Engine não configurado.', hint: 'Defina GOOGLE_VERTEX_CREDENTIALS_JSON no Vercel.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : undefined;
    const priorUserMessages = Array.isArray(body.priorUserMessages)
      ? body.priorUserMessages
          .filter((item: unknown): item is string => typeof item === 'string')
          .map((item: string) => item.trim())
          .filter(Boolean)
          .slice(-4)
      : [];
    if (!message) {
      return NextResponse.json({ error: 'Campo "message" é obrigatório.' }, { status: 400 });
    }

    const surface = typeof body.surface === 'string' ? body.surface.trim() : 'general';
    const retrievalQuery =
      surface === 'chatnutri' ? message : buildApostilaRetrievalQuery(message, priorUserMessages);
    const evidence = await searchApostilaEvidence(retrievalQuery);
    const { sources, evidenceText, evidenceSource, discoveryResultCount } = evidence;

    if (surface !== 'chatnutri' && !evidence.evidenceText.trim() && !isApostilaProductQuestion(message)) {
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() || '-' : '-';
      return NextResponse.json({
        answer: NO_EVIDENCE_ANSWER,
        sessionId,
        relatedQuestions: [],
        sources: [],
        ...(conversationId && { conversationId }),
      });
    }

    const knowledge = await loadKnowledge({
      surface: 'oftreview',
      maxTotalChars: CHAT_KNOWLEDGE_MAX_CHARS,
    });
    const knowledgeText = buildKnowledgeBlock(knowledge);
    const knowledgePrefix = knowledgeText.trim()
      ? `${knowledgeText.trim()}\n\n---\n\n`
      : '';

    console.info('[api/chat] evidence', {
      evidenceSource,
      discoveryResultCount,
      sourceCount: sources.length,
      knowledgeSourceCount: knowledge.sources.length,
      retrievalRewritten: retrievalQuery !== message,
    });

    const accessToken = await getVertexAccessToken(creds);
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const geminiModel = resolveGeminiModelId();
    const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

    let userPrompt: string;
    if (evidenceText) {
      const evidenceLabel =
        evidenceSource === 'mapped_topics'
          ? 'EVIDÊNCIAS (tópicos mapeados das apostilas — use como base factual):'
          : 'EVIDÊNCIAS (trechos das apostilas indexadas):';
      userPrompt = `${knowledgePrefix}${evidenceLabel}\n\n${evidenceText}\n\n---\n\nPergunta: ${message}`;
    } else if (knowledgePrefix) {
      userPrompt =
        `${knowledgePrefix}` +
        `Não há EVIDÊNCIAS das apostilas para esta pergunta.\n` +
        `Para conteúdo clínico ou factual de apostila, diga que não encontrou nas apostilas indexadas e sugira reformular com termos mais específicos (doença, estrutura, exame).\n` +
        `Para dúvidas estruturais do produto, linguagem ou políticas internas, use apenas o CONHECIMENTO_BASE acima.\n\n` +
        `Pergunta: ${message}`;
    } else {
      userPrompt = `Não há evidências indexadas para esta pergunta. Responda apenas: "Não encontrei isso nas apostilas indexadas. Tente reformular com termos mais específicos (ex.: nome da doença ou do exame)."`;
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
        maxOutputTokens: 2048,
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
