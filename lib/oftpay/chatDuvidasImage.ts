import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';

export const CHAT_DUVIDAS_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const CHAT_DUVIDAS_MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export interface ChatDuvidasImagePayload {
  data: string;
  mimeType: string;
}

export interface ChatDuvidasImageAnalysis {
  description: string;
  examOrContext?: string;
  findings?: string[];
  searchTerms?: string[];
}

const VISION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    description: { type: 'STRING' },
    examOrContext: { type: 'STRING' },
    findings: { type: 'ARRAY', items: { type: 'STRING' } },
    searchTerms: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['description', 'searchTerms'],
};

const VISION_PROMPT = `Você analisa imagens enviadas por alunos de oftalmologia no OftPay/Oftreview.

Descreva objetivamente o que é visível (exame de retina, OCT, topografia, diagrama, foto clínica, slide, etc.).
Liste achados oftalmológicos observáveis ou temas prováveis.
Gere searchTerms em português (5–12 termos) para buscar conteúdo em apostilas: doenças, estruturas, exames, sinais.

Não invente detalhes que não estejam visíveis. Se a imagem estiver ilegível, diga isso na description e use searchTerms genéricos do contexto visível.

Retorne JSON:
{"description":"...","examOrContext":"...","findings":["..."],"searchTerms":["..."]}`;

export function parseChatDuvidasImageBody(
  image?: Partial<ChatDuvidasImagePayload> | null
): { buffer: Buffer; mimeType: string } | { error: string } {
  const data = typeof image?.data === 'string' ? image.data.trim() : '';
  const mimeType =
    typeof image?.mimeType === 'string' ? image.mimeType.split(';')[0].trim().toLowerCase() : '';

  if (!data || !mimeType) {
    return { error: 'Imagem inválida.' };
  }
  if (!CHAT_DUVIDAS_IMAGE_MIMES.has(mimeType)) {
    return { error: 'Formato não suportado. Use JPEG, PNG ou WebP.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch {
    return { error: 'Não foi possível ler a imagem enviada.' };
  }

  if (buffer.length === 0) {
    return { error: 'Imagem vazia.' };
  }
  if (buffer.length > CHAT_DUVIDAS_MAX_IMAGE_BYTES) {
    return { error: 'Imagem muito grande. Máximo 4 MB.' };
  }

  return { buffer, mimeType };
}

function normalizeImageAnalysis(raw: unknown): ChatDuvidasImageAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  const description = String(root.description ?? '').trim();
  if (!description) return null;

  const findings = Array.isArray(root.findings)
    ? root.findings.map((f) => String(f).trim()).filter(Boolean)
    : undefined;
  const searchTerms = Array.isArray(root.searchTerms)
    ? root.searchTerms.map((t) => String(t).trim()).filter(Boolean)
    : [];

  return {
    description,
    examOrContext: String(root.examOrContext ?? '').trim() || undefined,
    findings,
    searchTerms,
  };
}

export async function analyzeImageForChatDuvidas(params: {
  buffer: Buffer;
  mimeType: string;
  geminiUrl: string;
  accessToken: string;
}): Promise<ChatDuvidasImageAnalysis | null> {
  const { buffer, mimeType, geminiUrl, accessToken } = params;
  const base64 = buffer.toString('base64');

  const res = await fetch(geminiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: VISION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: VISION_SCHEMA,
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[chat-duvidas] vision error', res.status, data);
    return null;
  }

  const { text } = getGeminiAnswerText(
    data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  );
  const parsed = extractJsonFromGeminiText(text);
  return normalizeImageAnalysis(parsed);
}
