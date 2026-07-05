/**

 * POST /api/oftpay/questoes/chat-duvidas

 * Chat do aluno: responde com base nos tópicos mapeados e sugere simulado.

 * Suporta imagem (Gemini Vision) para correlacionar achados ao banco mapeado.

 */



import { NextRequest, NextResponse } from 'next/server';

import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';

import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';

import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';

import {

  buildChatDuvidasContextPrompt,

  buildChatDuvidasSearchQuery,

  buildFallbackSimuladoSuggestion,

  loadMappedTopics,

  loadPublishedQuestoesAdmin,

  rankMappedTopics,

  sanitizeSimuladoSuggestion,

  summarizeTopicsForAnswer,

} from '@/lib/oftpay/chatDuvidasContext';

import {

  analyzeImageForChatDuvidas,

  parseChatDuvidasImageBody,

  type ChatDuvidasImagePayload,

} from '@/lib/oftpay/chatDuvidasImage';

import { buildPublishedTopicIndex } from '@/lib/oftpay/simuladoTopicSearch';

import { verifyOftpayQuestoesStudent } from '@/lib/oftpay/verifyOftpayQuestoesStudent';



export const runtime = 'nodejs';

export const maxDuration = 120;



const DEFAULT_IMAGE_QUESTION =

  'Analise esta imagem e relacione ao conteúdo das apostilas oftalmológicas.';



interface ChatDuvidasBody {

  question?: string;

  image?: ChatDuvidasImagePayload;

}



const RESPONSE_SCHEMA = {

  type: 'OBJECT',

  properties: {

    answer: { type: 'STRING' },

    simuladoSuggestion: {

      type: 'OBJECT',

      properties: {

        title: { type: 'STRING' },

        selections: {

          type: 'ARRAY',

          items: {

            type: 'OBJECT',

            properties: {

              apostilaTitulo: { type: 'STRING' },

              capituloTitulo: { type: 'STRING' },

              dificuldade: { type: 'STRING' },

              quantidade: { type: 'INTEGER' },

            },

            required: ['capituloTitulo', 'dificuldade', 'quantidade'],

          },

        },

      },

      required: ['title', 'selections'],

    },

  },

  required: ['answer'],

};



export async function POST(request: NextRequest) {

  try {

    const authResult = await verifyOftpayQuestoesStudent(request);

    if (authResult instanceof NextResponse) return authResult;



    const body = (await request.json().catch(() => ({}))) as ChatDuvidasBody;

    const rawQuestion = typeof body.question === 'string' ? body.question.trim() : '';

    const hasImagePayload =

      typeof body.image?.data === 'string' && typeof body.image?.mimeType === 'string';



    if (!hasImagePayload && rawQuestion.length < 3) {

      return NextResponse.json(

        { error: 'Digite uma pergunta com pelo menos 3 caracteres ou envie uma imagem.' },

        { status: 400 }

      );

    }

    if (rawQuestion.length > 2000) {

      return NextResponse.json({ error: 'Pergunta muito longa (máx. 2000 caracteres).' }, { status: 400 });

    }



    let imageBuffer: Buffer | null = null;

    let imageMimeType: string | null = null;

    if (hasImagePayload) {

      const parsed = parseChatDuvidasImageBody(body.image);

      if ('error' in parsed) {

        return NextResponse.json({ error: parsed.error }, { status: 400 });

      }

      imageBuffer = parsed.buffer;

      imageMimeType = parsed.mimeType;

    }



    const question = rawQuestion || DEFAULT_IMAGE_QUESTION;



    const db = getFirestoreAdmin();

    const [mappedTopics, publicadas] = await Promise.all([

      loadMappedTopics(db),

      loadPublishedQuestoesAdmin(db),

    ]);



    const creds = getGoogleVertexCredentials();

    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

    const geminiModel = resolveGeminiModelId();

    const geminiUrl = creds

      ? `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`

      : '';



    let imageAnalysis = null;

    if (imageBuffer && imageMimeType && creds) {

      const accessToken = await getVertexAccessToken(creds);

      imageAnalysis = await analyzeImageForChatDuvidas({

        buffer: imageBuffer,

        mimeType: imageMimeType,

        geminiUrl,

        accessToken,

      });

    }



    const searchQuery = buildChatDuvidasSearchQuery(question, imageAnalysis);

    const publishedIndex = buildPublishedTopicIndex(publicadas);

    const contextPrompt = buildChatDuvidasContextPrompt(

      searchQuery,

      mappedTopics,

      publishedIndex,

      imageAnalysis

    );

    const rankedMapped = rankMappedTopics(searchQuery, mappedTopics, 5);



    let answer = '';

    let simuladoSuggestion = buildFallbackSimuladoSuggestion(searchQuery, publicadas, mappedTopics);



    if (creds) {

      const accessToken = await getVertexAccessToken(creds);



      const systemPrompt = `Você é tutor de oftalmologia do OftPay/Oftreview.



Use APENAS as informações dos tópicos mapeados e do banco de questões fornecidos no contexto.

${imageAnalysis ? 'Quando houver imagem, correlacione os achados visíveis com os tópicos mapeados — não extrapole além do que a imagem e o contexto permitem.' : ''}

Se não houver material suficiente, diga claramente e oriente o aluno a revisar a apostila correspondente.

Responda em português do Brasil, de forma didática e objetiva (2–4 parágrafos curtos).

Não invente guidelines ou dados clínicos fora do contexto.



Inclua simuladoSuggestion quando houver questões publicadas sobre o assunto:

- title: título curto do simulado

- selections: array com apostilaTitulo, capituloTitulo, dificuldade (facil|medio|dificil), quantidade (use até o disponível, preferindo 8–20 questões por tópico relevante)

Se houver vários tópicos relacionados, inclua até 3 seleções.`;



      const userPrompt = `${contextPrompt}



---

Responda em JSON:

{"answer":"...","simuladoSuggestion":{"title":"...","selections":[{"apostilaTitulo":"...","capituloTitulo":"...","dificuldade":"medio","quantidade":10}]}}`;



      const userParts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> =

        [];

      if (imageBuffer && imageMimeType) {

        userParts.push({

          inline_data: {

            mime_type: imageMimeType,

            data: imageBuffer.toString('base64'),

          },

        });

      }

      userParts.push({ text: userPrompt });



      const geminiRes = await fetch(geminiUrl, {

        method: 'POST',

        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },

        body: JSON.stringify({

          systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] },

          contents: [{ role: 'user', parts: userParts }],

          generationConfig: {

            maxOutputTokens: 4096,

            temperature: 0.35,

            topP: 0.9,

            responseMimeType: 'application/json',

            responseSchema: RESPONSE_SCHEMA,

          },

        }),

      });



      const geminiData = await geminiRes.json().catch(() => ({}));

      if (geminiRes.ok) {

        const { text: answerText } = getGeminiAnswerText(

          geminiData as {

            candidates?: Array<{

              content?: { parts?: Array<{ text?: string }> };

            }>;

          }

        );

        const parsed = extractJsonFromGeminiText(answerText);

        if (parsed && typeof parsed === 'object') {

          const root = parsed as Record<string, unknown>;

          answer = String(root.answer ?? '').trim();

          const sanitized = sanitizeSimuladoSuggestion(root.simuladoSuggestion, publicadas);

          if (sanitized) simuladoSuggestion = sanitized;

        }

      } else {

        console.warn('[chat-duvidas] Gemini error', geminiRes.status);

      }

    }



    if (!answer) {

      const topicsLabel = summarizeTopicsForAnswer(rankedMapped);

      if (imageAnalysis && topicsLabel) {

        answer = `Na imagem identifiquei: ${imageAnalysis.description} Material relacionado nas apostilas: ${topicsLabel}. `;

        if (simuladoSuggestion) {

          answer +=

            'Você pode praticar com um simulado personalizado — escolha o nível e clique em "Gerar simulado sugerido".';

        }

      } else if (topicsLabel) {

        answer = `Encontrei material relacionado em: ${topicsLabel}. Revise esses tópicos nas apostilas oficiais. `;

        if (simuladoSuggestion) {

          answer +=

            'Você pode praticar com um simulado personalizado usando as questões publicadas sobre esse assunto — clique em "Gerar simulado sugerido" abaixo.';

        } else {

          answer += 'Ainda não há questões publicadas suficientes para montar um simulado automático sobre este tema.';

        }

      } else if (imageAnalysis) {

        answer = `Interpretação da imagem: ${imageAnalysis.description} Não encontrei tópicos mapeados claramente relacionados — tente complementar com uma pergunta em texto (ex.: nome da doença ou do exame).`;

      } else {

        answer =

          'Não encontrei tópicos mapeados nem questões publicadas claramente relacionadas à sua pergunta. Tente reformular com termos mais específicos (ex.: nome da doença, estrutura anatômica ou exame).';

      }

    }



    return NextResponse.json({

      ok: true,

      answer,

      imageAnalysis: imageAnalysis

        ? {

            description: imageAnalysis.description,

            examOrContext: imageAnalysis.examOrContext,

            findings: imageAnalysis.findings,

          }

        : null,

      relatedTopics: rankedMapped.map((t) => ({

        apostilaTitulo: t.apostilaTitulo,

        topicTitle: t.topicTitle,

        topicSummary: t.topicSummary,

      })),

      simuladoSuggestion,

    });

  } catch (err) {

    const msg = err instanceof Error ? err.message : String(err);

    console.error('[chat-duvidas] error:', msg, err);

    return NextResponse.json({ error: 'Erro ao processar sua dúvida.' }, { status: 500 });

  }

}


