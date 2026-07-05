import { JWT } from 'google-auth-library';
import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';
import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
const DISCOVERY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export interface GoogleCreds {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const SUBJECTS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questionSubjects: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['questionSubjects'],
};

const GEMINI_SYSTEM_PROMPT = `Você é um especialista em oftalmologia e curadoria pedagógica.

Use EXCLUSIVAMENTE o conteúdo textual fornecido.
Não invente conceitos que não estejam no material.

Responda somente com JSON estrito conforme solicitado.`;

export function getVertexCredentials(): GoogleCreds | null {
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
    } catch {
      return null;
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

export function getVertexAccessToken(creds: GoogleCreds): Promise<string> {
  const client = new JWT({
    email: creds.clientEmail,
    key: creds.privateKey,
    scopes: [DISCOVERY_SCOPE],
  });
  return client.authorize().then((t) => (t as { access_token?: string }).access_token || '');
}

function buildRepairSubjectsPrompt(params: {
  apostilaTitulo: string;
  topicTitle: string;
  topicSummary?: string;
  keywords?: string[];
  slotsNeeded: number;
  existingSubjectTitles: string[];
  contentText: string;
}): string {
  const keywordsLine =
    params.keywords && params.keywords.length > 0
      ? `Palavras-chave do tópico: ${params.keywords.join(', ')}\n`
      : '';

  const existingLine =
    params.existingSubjectTitles.length > 0
      ? `ASSUNTOS JÁ EXISTENTES NESTE TÓPICO (NÃO REPITA, NÃO PARAFRASEIE):\n${params.existingSubjectTitles.map((t) => `- ${t}`).join('\n')}\n\n`
      : '';

  return `APOSTILA: ${params.apostilaTitulo}
TÓPICO: ${params.topicTitle}
${params.topicSummary ? `RESUMO: ${params.topicSummary}\n` : ''}${keywordsLine}${existingLine}NOVOS ASSUNTOS NECESSÁRIOS: ${params.slotsNeeded}

CONTEÚDO DO TÓPICO:
${params.contentText}

---
Gere EXATAMENTE ${params.slotsNeeded} assuntos NOVOS e distintos (questionSubjects) para substituir slots genéricos neste tópico.
Cada assunto deve descrever um ângulo pedagógico específico derivado do conteúdo: conceito, diagnóstico, conduta, comparação, fisiopatologia, exame, complicação, etc.
Não use títulos genéricos como "Aspecto N do tópico", "ângulo 1" ou "conceito 2".
Não repita nem parafraseie os assuntos já existentes listados acima.
Os ${params.slotsNeeded} assuntos devem ser únicos entre si.

Responda SOMENTE com JSON:
{"questionSubjects":["assunto novo 1","assunto novo 2"]}`;
}

export async function fetchTopicQuestionSubjectsFromGemini(
  accessToken: string,
  creds: GoogleCreds,
  params: {
    apostilaTitulo: string;
    topicTitle: string;
    topicSummary?: string;
    keywords?: string[];
    slotsNeeded: number;
    existingSubjectTitles: string[];
    contentText: string;
  }
): Promise<string[]> {
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const geminiModel = resolveGeminiModelId();
  const geminiUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${geminiModel}:generateContent`;

  const userPrompt = buildRepairSubjectsPrompt(params);

  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'user', parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.15,
        topP: 0.9,
        responseMimeType: 'application/json',
        responseSchema: SUBJECTS_RESPONSE_SCHEMA,
      },
    }),
  });

  const geminiData = await geminiRes.json().catch(() => ({}));
  if (!geminiRes.ok) {
    const errMsg =
      (geminiData as { error?: { message?: string } }).error?.message || geminiRes.statusText;
    throw new Error(`Gemini HTTP ${geminiRes.status}: ${errMsg}`);
  }

  const { text: answerText } = getGeminiAnswerText(
    geminiData as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    }
  );

  const parsed = extractJsonFromGeminiText(answerText);
  const root = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const raw = root.questionSubjects ?? root.assuntos ?? root.subjects;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => String(item).trim())
    .filter(Boolean)
    .filter((title) => !/^aspecto \d+ do tópico$/i.test(title));
}
