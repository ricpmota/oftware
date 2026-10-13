/**
 * Cliente Vertex para geração de imagem do prato.
 * Gemini 3.1 Flash Image via generateContent — Imagen :predict foi descontinuado.
 * Server-only.
 */

import { resolveMealImageModelId } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';

export const MEAL_IMAGE_VERTEX_TIMEOUT_MS = 90_000;
export const MEAL_IMAGE_VERTEX_MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = MEAL_IMAGE_VERTEX_TIMEOUT_MS;

export type MealImageVertexResult = {
  buffer: Buffer;
  mimeType: string;
  model: string;
  location: string;
};

export class MealImageVertexError extends Error {
  code: string;
  systemic: boolean;
  constructor(message: string, code: string, systemic = false) {
    super(message);
    this.name = 'MealImageVertexError';
    this.code = code;
    this.systemic = systemic;
  }
}

/** Falha de configuração/auth/schema do Vertex — não depende do prato. */
export function isMealImageVertexConfigurationMessage(message: string): boolean {
  const m = String(message || '').toLowerCase();
  return (
    m.includes('person_generation') ||
    m.includes('generation_config') ||
    m.includes('image_config') ||
    m.includes('invalid value at') ||
    m.includes('invalid argument') ||
    m.includes('invalid_argument') ||
    m.includes('permission denied') ||
    m.includes('permission_denied') ||
    m.includes('unauthenticated') ||
    m.includes('api has not been used') ||
    m.includes('has not been enabled') ||
    m.includes('service_disabled') ||
    m.includes('failed precondition') ||
    (m.includes('not found') && (m.includes('model') || m.includes('publisher')))
  );
}

export function classifyMealImageVertexHttpFailure(
  status: number,
  message: string
): { code: 'VERTEX_CONFIG' | 'VERTEX_HTTP'; systemic: boolean } {
  if (status === 401 || status === 403 || status === 404) {
    return { code: 'VERTEX_CONFIG', systemic: true };
  }
  if (isMealImageVertexConfigurationMessage(message)) {
    return { code: 'VERTEX_CONFIG', systemic: true };
  }
  return { code: 'VERTEX_HTTP', systemic: false };
}

export const DEFAULT_MEAL_IMAGE_VERTEX_LOCATION = 'global';

/**
 * Gemini 3.1 Flash Image só está no endpoint global.
 * Não herda VERTEX_AI_LOCATION (em produção costuma ser us-central1).
 */
export function resolveMealImageVertexLocation(
  env: NodeJS.ProcessEnv = process.env
): string {
  const dedicated = String(env.VERTEX_MEAL_IMAGE_LOCATION || '').trim();
  if (dedicated) return dedicated;
  return DEFAULT_MEAL_IMAGE_VERTEX_LOCATION;
}

function vertexHost(location: string): string {
  return location === 'global'
    ? 'https://aiplatform.googleapis.com'
    : `https://${location}-aiplatform.googleapis.com`;
}

export function buildMealImageVertexGenerateContentUrl(params: {
  projectId: string;
  location: string;
  model: string;
}): string {
  const { projectId, location, model } = params;
  return `${vertexHost(location)}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

/** TEXT+IMAGE: IMAGE sozinho pode retornar candidatos vazios no Gemini Image. */
export function buildMealImageVertexGenerateContentBody(prompt: string): {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  generationConfig: {
    responseModalities: string[];
    imageConfig: {
      aspectRatio: string;
      imageSize: string;
      personGeneration: string;
    };
  };
} {
  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '1:1',
        imageSize: '1K',
        personGeneration: 'ALLOW_NONE',
      },
    },
  };
}

function mimeFromInline(mime: string | undefined): string | null {
  const m = (mime || '').split(';')[0].trim().toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg') return 'image/jpeg';
  if (m === 'image/png') return 'image/png';
  if (m === 'image/webp') return 'image/webp';
  return null;
}

function decodeInlineImageBytes(b64: string): Buffer | null {
  const cleaned = String(b64 || '').replace(/\s/g, '');
  if (!cleaned || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null;
  const buffer = Buffer.from(cleaned, 'base64');
  if (!buffer.length) return null;
  return buffer;
}

export function extractInlineImageFromGenerateContent(data: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mime_type?: string; data?: string };
      }>;
    };
    finishReason?: string;
  }>;
  error?: { message?: string };
}): { buffer: Buffer; mimeType: string } {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let sawText = false;
  let invalidMime = false;
  let tooLarge = false;
  for (const part of parts) {
    if (typeof part.text === 'string' && part.text.trim()) sawText = true;
    const inline = part.inlineData || part.inline_data;
    const b64 = inline?.data;
    if (!b64) continue;
    const mimeType = mimeFromInline(inline.mimeType || inline.mime_type);
    if (!mimeType) {
      invalidMime = true;
      continue;
    }
    const buffer = decodeInlineImageBytes(b64);
    if (!buffer) continue;
    if (buffer.length > MEAL_IMAGE_VERTEX_MAX_BYTES) {
      tooLarge = true;
      continue;
    }
    return { buffer, mimeType };
  }
  if (tooLarge) {
    throw new MealImageVertexError('Imagem gerada excede o tamanho permitido.', 'VERTEX_TOO_LARGE');
  }
  if (invalidMime) {
    throw new MealImageVertexError('MIME de imagem não suportado.', 'VERTEX_MIME');
  }
  if (sawText && parts.every((part) => !part.inlineData && !part.inline_data)) {
    throw new MealImageVertexError('O modelo retornou texto sem imagem.', 'VERTEX_TEXT_ONLY');
  }
  throw new MealImageVertexError(
    candidate?.finishReason
      ? `Resposta de imagem vazia (${candidate.finishReason}).`
      : 'Resposta de imagem vazia.',
    'VERTEX_EMPTY'
  );
}

export async function generateMealImageWithVertex(prompt: string): Promise<MealImageVertexResult> {
  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new MealImageVertexError(
      'Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).',
      'VERTEX_AUTH',
      true
    );
  }

  const location = resolveMealImageVertexLocation();
  const model = resolveMealImageModelId();
  const url = buildMealImageVertexGenerateContentUrl({
    projectId: creds.projectId,
    location,
    model,
  });
  const accessToken = await getVertexAccessToken(creds);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildMealImageVertexGenerateContentBody(prompt)),
      signal: controller.signal,
    });
  } catch (e) {
    const aborted =
      (e instanceof Error && e.name === 'AbortError') ||
      (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError');
    throw new MealImageVertexError(
      aborted ? 'Tempo esgotado na geração da imagem.' : e instanceof Error ? e.message : 'Falha de rede Vertex',
      aborted ? 'VERTEX_TIMEOUT' : 'VERTEX_NETWORK'
    );
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
      finishReason?: string;
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const technical = data?.error?.message || res.statusText || 'Erro Vertex';
    const classified = classifyMealImageVertexHttpFailure(res.status, technical);
    throw new MealImageVertexError(technical, classified.code, classified.systemic);
  }

  const image = extractInlineImageFromGenerateContent(data);
  return { ...image, model, location };
}
