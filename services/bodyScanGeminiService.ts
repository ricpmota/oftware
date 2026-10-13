/**
 * Oftware BodyScan — análise multimodal de composição corporal estimada por imagem.
 * Server-only. Não alegar bioimpedância/DXA.
 */

import { resolveBodyScanGeminiModelId } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { buildBodyScanPrompt, type BodyScanPromptAnthropometrics } from '@/lib/bodyscan/bodyScanPrompt';
import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';
import { validateBodyScanGeminiResponse, type BodyScanValidationResult } from '@/lib/bodyscan/bodyScanValidate';

const TIMEOUT_MS = 90_000;

export type BodyScanGeminiImagePart = {
  buffer: Buffer;
  mimeType: string;
  label: 'front' | 'side';
};

export async function analyzeBodyScanWithGemini(params: {
  front: BodyScanGeminiImagePart;
  side: BodyScanGeminiImagePart;
  anthropometrics: BodyScanPromptAnthropometrics;
}): Promise<{ validation: BodyScanValidationResult; model: string }> {
  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new Error('Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).');
  }

  const accessToken = await getVertexAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model = resolveBodyScanGeminiModelId();
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const prompt = buildBodyScanPrompt(params.anthropometrics);
  const frontMime = params.front.mimeType.split(';')[0].trim().toLowerCase() || 'image/jpeg';
  const sideMime = params.side.mimeType.split(';')[0].trim().toLowerCase() || 'image/jpeg';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: 'Foto frontal:' },
          {
            inline_data: {
              mime_type: frontMime,
              data: params.front.buffer.toString('base64'),
            },
          },
          { text: 'Foto lateral/perfil:' },
          {
            inline_data: {
              mime_type: sideMime,
              data: params.side.buffer.toString('base64'),
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0,
      topP: 0.95,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout ao gerar BodyScan.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText;
    console.error('[BodyScan] Gemini HTTP error', { status: res.status, message: errMsg, model });
    throw new Error(`Gemini BodyScan: ${errMsg}`);
  }

  const { text } = getGeminiAnswerText(data);
  if (!text) {
    console.error('[BodyScan] Gemini empty response', { model });
    throw new Error('Gemini BodyScan retornou resposta vazia.');
  }

  const parsed = extractJsonFromGeminiText(text);
  const validation = validateBodyScanGeminiResponse(parsed);
  if (!validation.ok) {
    console.error('[BodyScan] JSON inválido após parse', { model, error: validation.error });
  }

  return { validation, model };
}
