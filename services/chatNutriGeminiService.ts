/**
 * ChatNutri Gemini - Texto e Vision via Vertex AI REST
 * Reutiliza padrão de app/api/chat/route.ts
 * NÃO usa @google-cloud/vertexai
 */

import { JWT } from 'google-auth-library';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import type { ChatNutriDayTotals } from '@/lib/chatnutri/types';
import {
  safeParseGeminiJson,
  type VisionParseResult,
} from '@/lib/chatnutri/safeParseGeminiJson';
import { loadKnowledge } from '@/lib/knowledge/knowledgeLoader';
import { buildKnowledgeBlock } from '@/lib/knowledge/buildKnowledgeBlock';
import { findOperationalFlow } from '@/services/knowledge/findOperationalFlow';
import { buildOperationalBlock } from '@/services/knowledge/buildOperationalBlock';
import { OPERATIONAL_ANCHORING_RULES_TEXT } from '@/services/knowledge/operationalAnchoringPrompt';
import { formatOperationalFallback } from '@/services/knowledge/formatOperationalFallback';
import { validateOperationalAnswer } from '@/services/knowledge/validateOperationalAnswer';
import { logOperationalResolution } from '@/services/knowledge/operationalLearningLogger';
import type { OperationalFlowMatch, OperationalProfile } from '@/services/knowledge/operationalFlowTypes';

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

const CHATNUTRI_KNOWLEDGE_MAX_CHARS = Math.max(
  0,
  Number.parseInt(process.env.CHATNUTRI_KNOWLEDGE_MAX_CHARS ?? '', 10) || 48_000
);

const CHATNUTRI_TEMPERATURE_NORMAL = 0.55;
const CHATNUTRI_TEMPERATURE_GROUNDED = 0.15;

/** Resposta quando nem o modo grounded remove linguagem proibida ou falta fato. */
const FALLBACK_NO_OPERATIONAL_PATH =
  'Não encontrei no conhecimento carregado o caminho exato para essa ação. Peça orientação ao seu nutricionista ou ao suporte Oftware; se puder, envie um print da tela em que você está.';

/** Padrões que indicam navegação “genérica” / inventada (regenerar em modo grounded). */
const FORBIDDEN_GENERIC_NAV_PATTERNS: RegExp[] = [
  /\bprocure\s+por\b/i,
  /\bprocure(r)?\s+(uma\s+)?(se[cç][aã]o|aba|menu|tela|op[cç][aã]o)\b/i,
  /\balgo\s+similar\b/i,
  /\bou\s+similar\b/i,
  /\b(similar|parecido)\s+com\b/i,
  /\bpode\s+variar\b/i,
  /\bpode\s+ter\s+varia/i,
  /\bplataforma\s+pode\s+ter\b/i,
  /\bse[cç][aã]o\s+chamad/i,
  /\bmenu\s+chamad/i,
  /\bbot[aã]o\s+chamad/i,
  /\b(uma\s+)?tela\s+que\s+pode\b/i,
  /\btente\s+localizar\b/i,
  /\bv[eê]\s+se\s+encontra\b/i,
  /\bnavegue\s+at[eé]\b/i,
  /\bgeralmente\b.*\b(menu|tela|aba|bot[aã]o|clique|se[cç][aã]o|sistema)\b/i,
  /\bnormalmente\b.*\b(menu|tela|aba|bot[aã]o|clique)\b/i,
  /\bem\s+geral\b.*\b(menu|tela|aba|clique)\b/i,
  /\btipicamente\b.*\b(menu|tela|aba)\b/i,
  /\bpossivelmente\b.*\b(aba|menu|tela)\b/i,
];

function admitsMissingKnowledge(text: string): boolean {
  return /Não encontrei no conhecimento carregado/i.test(text);
}

function answerHasForbiddenGenericNav(answer: string): boolean {
  const t = answer.trim();
  if (!t || admitsMissingKnowledge(t)) return false;
  return FORBIDDEN_GENERIC_NAV_PATTERNS.some((re) => re.test(t));
}

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
      console.error('[chatNutriGemini] GOOGLE_VERTEX_CREDENTIALS_JSON parse error:', e);
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
    scopes: [SCOPE],
  });
  return client.authorize().then((t) => (t as { access_token?: string }).access_token || '');
}

const SYSTEM_PROMPT_CHAT = `Você é o assistente oficial da plataforma Oftware neste canal (ChatNutri): responde sobre nutrição, hábitos e **uso do sistema Oftware** quando o usuário perguntar.
Responda em pt-BR, tom profissional e acolhedor.
Quando o contexto incluir o nome do paciente, use o primeiro nome de forma pessoal.
Use "Olá [Nome]!" só na primeira mensagem do dia do paciente; se já houve interação no dia, não repita saudação longa.
Nutrição: refeições, substituições, hábitos; cardápio simples brasileiro focado em emagrecimento e boa proteína quando pedido. Não prescreva medicamentos. Estimativas são aproximadas. Emojis com moderação.

A seguir: CONHECIMENTO_BASE e, se houver, CONTEXTO DINÂMICO DO PACIENTE/DIA.

CONHECIMENTO_BASE: documentação interna (fluxos oficiais, jornadas, políticas). Use-o como **única fonte** para nomes de rotas, menus, abas, pastas, botões e ordem de passos da plataforma — salvo quando houver FLUXO_OPERACIONAL_PRIORITARIO, que prevalece para aquele assunto.

CONTEXTO DINÂMICO: dados do dia, totais e texto sobre o paciente; histórico nos turnos.

Conflitos: entre CONHECIMENTO_BASE e dados **pessoais atuais** do paciente (peso, restrições, totais do dia), prevalece o contexto dinâmico. CONHECIMENTO_BASE não substitui clínica individual.

Em seguida vêm, nesta ordem: REGRAS DE ANCORAGEM OPERACIONAL; opcionalmente FLUXO_OPERACIONAL_PRIORITARIO; CONHECIMENTO_BASE; CONTEXTO DINÂMICO. Siga literalmente as regras e o fluxo prioritário quando presentes.`;

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe: 'Café da Manhã',
  lanche1: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche2: 'Lanche da Tarde',
  jantar: 'Jantar',
};

function buildVisionPrompt(mealType: string): string {
  const mealLabel = MEAL_TYPE_LABELS[mealType] || 'refeição';
  return `Analise a imagem de uma refeição típica brasileira com foco em estimativa nutricional REALISTA.

OBJETIVO:
Identificar alimentos visíveis e estimar calorias e macronutrientes de forma CONSERVADORA e plausível para um(a) ${mealLabel} brasileiro comum.

REGRAS IMPORTANTES:

1. Identifique APENAS alimentos claramente visíveis.
2. NÃO invente ingredientes ocultos.
3. Use porções visuais realistas (pequena, média ou grande).
4. Em caso de dúvida sobre quantidade, prefira estimativa conservadora.
5. Evite superestimar proteína de carnes.
6. Considere padrões brasileiros:
   - arroz branco comum
   - feijão comum
   - bife grelhado típico
   - saladas simples
7. Em cada item, preencha "portionDescription" de forma **específica** em pt-BR (ex.: "concha média cheia", "cerca de 2 fatias finas", "porção ~150 g visível"), não genérica.
8. Se a imagem estiver pouco clara, reduza a confidence.
9. As estimativas devem ser aproximadas, não máximas.

CLASSIFICAÇÃO DE CONFIANÇA:

- high → alimentos e porções bem visíveis
- medium → alguma incerteza de porção
- low → imagem ruim ou muitos itens ambíguos

RETORNE APENAS JSON VÁLIDO:

{
  "items":[
    {
      "name":"",
      "portionDescription":"",
      "calories":0,
      "protein":0,
      "carbs":0,
      "fat":0
    }
  ],
  "totals":{
    "calories":0,
    "protein":0,
    "carbs":0,
    "fat":0
  },
  "confidence":"low|medium|high",
  "notes":"2 a 4 frases em pt-BR: resumo do prato; o que foi mais fácil ou difícil de estimar; nada de prescrição"
}`;
}

function inferMimeType(gsUri: string): string {
  const lower = gsUri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function buildMealVisionResponseSchema(): Record<string, unknown> {
  const itemSchema = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      portionDescription: { type: 'STRING' },
      calories: { type: 'NUMBER' },
      protein: { type: 'NUMBER' },
      carbs: { type: 'NUMBER' },
      fat: { type: 'NUMBER' },
    },
    required: ['name', 'portionDescription', 'calories', 'protein', 'carbs', 'fat'],
  };

  return {
    type: 'OBJECT',
    properties: {
      items: { type: 'ARRAY', items: itemSchema },
      totals: {
        type: 'OBJECT',
        properties: {
          calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
        },
        required: ['calories', 'protein', 'carbs', 'fat'],
      },
      confidence: { type: 'STRING' },
      notes: { type: 'STRING' },
    },
    required: ['items', 'totals', 'confidence', 'notes'],
  };
}

function extractGeminiResponseText(
  parts: Array<{ text?: string; thought?: boolean }> | undefined
): string {
  if (!parts?.length) return '';
  let text = '';
  for (const part of parts) {
    if (part?.thought) continue;
    if (typeof part.text === 'string') text += part.text;
  }
  return text;
}

export async function analyzeMealFromImage({
  gsUri,
  mealType = 'almoco',
}: {
  gsUri: string;
  mealType?: string;
}): Promise<VisionParseResult> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Credenciais Vertex não configuradas. Defina GOOGLE_VERTEX_CREDENTIALS_JSON.');
  }
  const accessToken = await getAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model = resolveGeminiModelId();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const mimeType = inferMimeType(gsUri);

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: gsUri,
              mimeType,
            },
          },
          { text: buildVisionPrompt(mealType) },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: buildMealVisionResponseSchema(),
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
    error?: { message?: string };
  };

  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText;
    throw new Error(`Gemini Vision error: ${errMsg}`);
  }

  const candidate = data?.candidates?.[0];
  const text = extractGeminiResponseText(candidate?.content?.parts);

  if (!text.trim()) {
    const finishReason = candidate?.finishReason ?? 'unknown';
    const blockReason = data?.promptFeedback?.blockReason;
    console.error('[chatNutriGemini] Vision resposta vazia', { finishReason, blockReason, model });
    throw new Error(
      blockReason
        ? `Gemini Vision bloqueou a imagem (${blockReason}).`
        : `Gemini Vision retornou resposta vazia (${finishReason}).`
    );
  }

  const parsed = safeParseGeminiJson(text);
  if (parsed.notes === 'Falha ao interpretar resposta do modelo') {
    console.error('[chatNutriGemini] Vision JSON inválido', {
      model,
      preview: text.slice(0, 400),
    });
  }

  return parsed;
}

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  text: string;
}

function groundedRetryAddendum(hasOperationalPriority: boolean): string {
  const fluxoLine = hasOperationalPriority
    ? '- Se existir FLUXO_OPERACIONAL_PRIORITARIO, copie a sequência de passos oficiais (sem reformular para linguagem vaga).\n'
    : '';
  return `
---
MODO GROUNDED (última chance — cumprimento estrito):
Sua resposta anterior foi rejeitada por linguagem genérica ou passos não fundamentados.

Reescreva a resposta inteira agora:
${fluxoLine}- Use APENAS rotas, nomes de área, abas, pastas, botões e ordem de passos que apareçam literalmente no FLUXO_OPERACIONAL_PRIORITARIO, no CONHECIMENTO_BASE ou no CONTEXTO DINÂMICO acima.
- Não use: "procure por", "algo similar", "ou similar", "pode variar", "geralmente/normalmente/tipicamente" para descrever onde clicar, nem invente nomes de UI.
- Se ainda assim não existir caminho explícito no texto acima, responda somente com a frase obrigatória (sem passos): "Não encontrei no conhecimento carregado o caminho exato para essa ação."
- Priorize fidelidade ao conhecimento operacional sobre tom conversacional.`;
}

type GeminiContentPart = { text: string };

const SECTION_BREAK = '\n\n---\n\n';

export type ChatNutriSystemInstructionParts = {
  operationalMatch: OperationalFlowMatch;
  hasOperationalBlock: boolean;
  /** Ordem lógica: systemPrompt, anchoring, operational?, knowledge, dynamic */
  sectionOrder: string[];
  systemInstructionText: string;
};

/**
 * Monta o systemInstruction na ordem exigida (útil para testes e para o chat).
 */
export async function buildChatNutriSystemInstruction(args: {
  userText: string;
  knowledgeText: string;
  dynamicBlock: string;
  profileHint?: OperationalProfile;
}): Promise<ChatNutriSystemInstructionParts> {
  const operationalMatch = await findOperationalFlow(args.userText.trim(), {
    surface: 'chatnutri',
    profileHint: args.profileHint,
  });

  const opRaw = buildOperationalBlock(operationalMatch);
  const operationalSection = operationalMatch.matched && opRaw ? opRaw : '';
  const hasOperationalBlock = Boolean(operationalSection);

  const knowledgeTrim = args.knowledgeText.trim();
  const knowledgeSection = knowledgeTrim ? knowledgeTrim : '';

  const parts: string[] = [SYSTEM_PROMPT_CHAT, OPERATIONAL_ANCHORING_RULES_TEXT];
  const sectionOrder = ['SYSTEM_PROMPT_CHAT', 'REGRAS_DE_ANCORAGEM_OPERACIONAL'];

  if (operationalSection) {
    parts.push(operationalSection);
    sectionOrder.push('FLUXO_OPERACIONAL_PRIORITARIO');
  }
  if (knowledgeSection) {
    parts.push(knowledgeSection);
    sectionOrder.push('CONHECIMENTO_BASE');
  }
  const dyn = args.dynamicBlock.trim();
  if (dyn) {
    parts.push(dyn);
    sectionOrder.push('CONTEXTO_DINAMICO_PACIENTE');
  }

  const systemInstructionText = parts.join(SECTION_BREAK);

  return {
    operationalMatch,
    hasOperationalBlock,
    sectionOrder,
    systemInstructionText,
  };
}

async function callGeminiChatGenerate(
  url: string,
  accessToken: string,
  systemInstructionText: string,
  contents: Array<{ role: string; parts: GeminiContentPart[] }>,
  temperature: number
): Promise<string> {
  const payload = {
    systemInstruction: {
      role: 'user',
      parts: [{ text: systemInstructionText }],
    },
    contents,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText;
    throw new Error(`Gemini Chat error: ${errMsg}`);
  }

  const partsOut = data?.candidates?.[0]?.content?.parts ?? [];
  let answer = '';
  for (const p of partsOut) {
    if (typeof p.text === 'string') answer += p.text;
  }
  return answer.trim();
}

export async function chatNutriTextReply({
  history,
  dayTotals,
  patientContext,
  userText,
}: {
  history: ChatHistoryEntry[];
  dayTotals: ChatNutriDayTotals | null;
  patientContext?: string;
  userText: string;
}): Promise<string> {
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Credenciais Vertex não configuradas. Defina GOOGLE_VERTEX_CREDENTIALS_JSON.');
  }
  const accessToken = await getAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model = resolveGeminiModelId();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const knowledge = await loadKnowledge({
    surface: 'chatnutri',
    maxTotalChars: CHATNUTRI_KNOWLEDGE_MAX_CHARS,
  });
  const knowledgeText = buildKnowledgeBlock(knowledge);

  console.info('[chatNutriGemini] local knowledge', {
    sourceCount: knowledge.sources.length,
    knowledgeTextChars: knowledgeText.length,
  });

  const dayContext = dayTotals
    ? `Totais do dia (até o momento): ${dayTotals.calories} kcal, ${dayTotals.protein}g proteína, ${dayTotals.carbs}g carboidratos, ${dayTotals.fat}g gordura.`
    : '';

  const patientTrim = patientContext?.trim() ?? '';
  const dynamicLines: string[] = [];
  if (dayContext) dynamicLines.push(dayContext);
  if (patientTrim) {
    dynamicLines.push(patientTrim);
    dynamicLines.push('Use essas informações para personalizar suas respostas ao paciente quando relevante.');
  }
  const dynamicBlock =
    dynamicLines.length > 0
      ? `CONTEXTO DINÂMICO DO PACIENTE (situação atual, dados do paciente):\n${dynamicLines.join('\n\n')}`
      : '';

  const { systemInstructionText: systemInstructionBase, hasOperationalBlock, operationalMatch } =
    await buildChatNutriSystemInstruction({
      userText,
      knowledgeText,
      dynamicBlock,
    });

  if (operationalMatch.matched) {
    console.info('[chatNutriGemini] operational flow match', {
      flowId: operationalMatch.flowId,
      title: operationalMatch.title,
      surface: operationalMatch.surface,
      confidence: operationalMatch.confidence,
      band: operationalMatch.confidenceBand,
    });
  }

  const contents = history
    .slice(-20)
    .map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));

  contents.push({ role: 'user', parts: [{ text: userText }] });

  let answer = await callGeminiChatGenerate(
    url,
    accessToken,
    systemInstructionBase,
    contents,
    CHATNUTRI_TEMPERATURE_NORMAL
  );

  const operationalAnswerBad = (text: string) =>
    answerHasForbiddenGenericNav(text) || (hasOperationalBlock && !validateOperationalAnswer(text, true));

  let usedDeterministicFallback = false;

  if (operationalAnswerBad(answer)) {
    console.info('[chatNutriGemini] regenerating grounded (weak/forbidden operational language)');
    const systemGrounded = systemInstructionBase + groundedRetryAddendum(hasOperationalBlock);
    answer = await callGeminiChatGenerate(
      url,
      accessToken,
      systemGrounded,
      contents,
      CHATNUTRI_TEMPERATURE_GROUNDED
    );
  }

  if (operationalAnswerBad(answer)) {
    if (hasOperationalBlock && operationalMatch.matched) {
      console.warn('[chatNutriGemini] using deterministic operational fallback');
      answer = formatOperationalFallback(operationalMatch);
      usedDeterministicFallback = true;
    } else {
      console.warn('[chatNutriGemini] grounded retry still matched forbidden patterns; using fallback');
      answer = admitsMissingKnowledge(answer) ? answer : FALLBACK_NO_OPERATIONAL_PATH;
      usedDeterministicFallback = !admitsMissingKnowledge(answer);
    }
  }

  const wasValidated =
    !operationalAnswerBad(answer) &&
    (!hasOperationalBlock || validateOperationalAnswer(answer, true)) &&
    !answerHasForbiddenGenericNav(answer);

  void logOperationalResolution({
    userText,
    matched: operationalMatch.matched,
    confidence: operationalMatch.confidence,
    flowId: operationalMatch.flowId,
    usedFallback: usedDeterministicFallback,
    wasValidated,
    strategy: operationalMatch.resolution?.strategy,
  });

  return answer.trim();
}
