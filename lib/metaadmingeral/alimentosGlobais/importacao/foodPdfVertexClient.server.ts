/**
 * Cliente Vertex dedicado ao importador de alimentos (location/modelo isolados).
 */

import { resolveGeminiModelId } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import { extractJsonFromGeminiText, getGeminiAnswerText } from '@/lib/oftpay/extractGeminiJson';
import {
  classifyGeminiHttpError,
  GeminiImportError,
  withGeminiRetry,
} from './geminiRetry';
import { throttleFoodImportGeminiCall } from './geminiThrottle';

export function resolveFoodImportVertexLocation(): string {
  return (
    process.env.FOOD_IMPORT_VERTEX_LOCATION ||
    process.env.VERTEX_AI_LOCATION ||
    'us-central1'
  );
}

export type FoodImportGeminiUsage = {
  promptTokens?: number | null;
  candidatesTokens?: number | null;
  totalTokens?: number | null;
};

export type FoodImportGeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export async function callFoodImportGeminiJson(opts: {
  parts: FoodImportGeminiPart[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<{
  text: string;
  parsed: unknown;
  model: string;
  location: string;
  durationMs: number;
  finishReason: string | null;
  usage: FoodImportGeminiUsage;
}> {
  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new GeminiImportError({
      message: 'Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).',
      code: 'GEMINI_AUTH',
      transient: false,
    });
  }

  const location = resolveFoodImportVertexLocation();
  const model = resolveGeminiModelId();
  // Endpoint regional clássico; se FOOD_IMPORT_VERTEX_LOCATION=global, usa host global.
  const host =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`;
  const url = `${host}/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  return throttleFoodImportGeminiCall(() =>
    withGeminiRetry(async () => {
      const accessToken = await getVertexAccessToken(creds);
      const started = Date.now();
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: opts.parts }],
            generationConfig: {
              maxOutputTokens: opts.maxOutputTokens ?? 16384,
              temperature: opts.temperature ?? 0,
              topP: 0.95,
              responseMimeType: 'application/json',
            },
          }),
        });
      } catch (e) {
        throw new GeminiImportError({
          message: e instanceof Error ? e.message : 'Falha de rede Gemini',
          code: 'GEMINI_TIMEOUT',
          transient: true,
        });
      }

      const data = (await res.json().catch(() => ({}))) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        error?: { message?: string; code?: number };
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };

      if (!res.ok) {
        throw classifyGeminiHttpError(
          res.status,
          data?.error?.message || res.statusText,
          res.headers.get('retry-after')
        );
      }

      const { text, finishReason } = getGeminiAnswerText(data);
      if (!text.trim()) {
        throw new GeminiImportError({
          message: 'Resposta Gemini vazia.',
          code: 'GEMINI_INVALID_RESPONSE',
          transient: true,
        });
      }

      const parsed = extractJsonFromGeminiText(text);
      if (parsed == null) {
        throw new GeminiImportError({
          message: 'JSON Gemini inválido/truncado sem recovery.',
          code: 'GEMINI_INVALID_RESPONSE',
          transient: true,
        });
      }

      return {
        text,
        parsed,
        model,
        location,
        durationMs: Date.now() - started,
        finishReason: finishReason || null,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount ?? null,
          candidatesTokens: data.usageMetadata?.candidatesTokenCount ?? null,
          totalTokens: data.usageMetadata?.totalTokenCount ?? null,
        },
      };
    })
  );
}
