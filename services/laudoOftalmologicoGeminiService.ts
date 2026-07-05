/**
 * Extração estruturada de laudos oftalmológicos (PDF/imagem) via Vertex AI Gemini.
 * Server-only.
 */

import { DEFAULT_GEMINI_MODEL_ID } from '@/lib/gcp/geminiConfig';
import { getGoogleVertexCredentials, getVertexAccessToken } from '@/lib/gcp/googleVertexAuth';
import {
  STRUCTURED_FIELDS_BY_TYPE,
  buildExtractionGuidanceByExamType,
  getExamTypeLabel,
  structuredFieldsListForPrompt,
  type OftalmoExamType,
} from '@/lib/oftpay/laudoOftalmoExtraction';
import type { OftalmoEye } from '@/lib/oftpay/laudoOftalmoEye';
import type { LaudoOftalmoExtracaoData } from '@/lib/oftpay/laudoOftalmoExtracaoData';
import { finalizeLaudoExtractionData } from '@/lib/oftpay/laudoOftalmoExtractionPostProcess';

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function extractJsonObject(text: string): unknown {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    let cleaned = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function buildExtractionPrompt(examType: OftalmoExamType): string {
  const label = getExamTypeLabel(examType);
  const guidance = buildExtractionGuidanceByExamType(examType);
  const fieldsLine = structuredFieldsListForPrompt(examType);
  const allowedKeys = STRUCTURED_FIELDS_BY_TYPE[examType];

  return `Você extrai dados de documentos oftalmológicos brasileiros (laudo, relatório, print de tela ou PDF).
Modalidade informada pelo usuário: **${label}** (código interno: ${examType}).

OBJETIVO:
Preencher o objeto JSON de saída com medidas e descrições **explicitamente presentes** no documento/imagem.
Esta é extração documental, não interpretação clínica nem diagnóstico.

ORIENTAÇÃO POR MODALIDADE:
${guidance}

CAMPOS EM camposEstruturados (use exatamente estas chaves; valor string, number ou null se ausente/ilegível):
{
  ${fieldsLine}
}

REGRAS OBRIGATÓRIAS:
1) NÃO invente valores, NÃO estime, NÃO complete lacunas. Use null quando não estiver claro no documento.
2) Preserve números e unidades como no laudo (vírgula decimal é comum no Brasil).
3) Para texto livre em campos descritivos, seja objetivo; não conclua diagnóstico.
4) Se o documento não for da modalidade esperada, ainda assim extraia o que for legível nos campos acima e registre em avisos.
5) examesNaoMapeados: trechos ou rótulos legíveis que não couberem nos campos (sem diagnóstico novo).
6) avisos: limitações reais (OCR, sombra, corte, baixa resolução, contraste) e incertezas.
7) qualityFlags: lista curta de flags como "imagem_tremida", "baixa_resolucao", "documento_incompleto" quando aplicável.
8) rawSummary: resumo factual de 2 a 4 frases sobre o que foi lido (sem diagnóstico).
9) dataExame: data de exame/emissão clara no formato YYYY-MM-DD, ou null.

Chaves permitidas em camposEstruturados (não adicione outras): ${JSON.stringify(allowedKeys)}

Saída: APENAS JSON válido (sem markdown), com a estrutura:
{
  "dataExame": "YYYY-MM-DD" | null,
  "camposEstruturados": { ... },
  "examesNaoMapeados": [],
  "avisos": [],
  "rawSummary": string | null,
  "qualityFlags": []
}`;
}

function filterStructuredObject(
  raw: unknown,
  allowedKeys: readonly string[]
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  const set = new Set(allowedKeys);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!set.has(k)) continue;
    if (v === null || v === undefined) {
      out[k] = null;
      continue;
    }
    if (typeof v === 'string' || typeof v === 'number') {
      out[k] = v;
      continue;
    }
    out[k] = String(v);
  }
  for (const k of allowedKeys) {
    if (!(k in out)) out[k] = null;
  }
  return out;
}

function normalizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

export async function extrairLaudoOftalmologicoComGemini(params: {
  buffer: Buffer;
  mimeType: string;
  examType: OftalmoExamType;
  fileName?: string | null;
  eye?: OftalmoEye | null;
  /** true quando o tipo veio ausente/inválido na API e foi usado fallback. */
  usedExamTypeFallback?: boolean;
}): Promise<LaudoOftalmoExtracaoData> {
  const {
    buffer,
    mimeType,
    examType,
    fileName = null,
    eye = null,
    usedExamTypeFallback = false,
  } = params;
  if (buffer.length > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 5 MB.');
  }
  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase();
  if (!MIME_ALLOWED.has(normalizedMime)) {
    throw new Error('Formato não suportado. Use PDF, JPEG, PNG ou WebP.');
  }

  const creds = getGoogleVertexCredentials();
  if (!creds) {
    throw new Error('Vertex AI não configurado (GOOGLE_VERTEX_CREDENTIALS_JSON ou equivalente).');
  }

  const accessToken = await getVertexAccessToken(creds);
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
  const model =
    process.env.GEMINI_LAUDO_OFTALMO_MODEL_ID ||
    process.env.GEMINI_MODEL_ID ||
    DEFAULT_GEMINI_MODEL_ID;
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${creds.projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const prompt = buildExtractionPrompt(examType);
  const base64 = buffer.toString('base64');

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 8192,
    temperature: 0,
    topP: 0.95,
    responseMimeType: 'application/json',
  };

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: normalizedMime,
              data: base64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig,
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
    throw new Error(`Gemini: ${errMsg}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  let text = '';
  for (const p of parts) {
    if (typeof p.text === 'string') text += p.text;
  }

  const parsed = extractJsonObject(text) as Record<string, unknown> | null;
  const allowedKeys = STRUCTURED_FIELDS_BY_TYPE[examType];

  let camposEstruturados: Record<string, string | number | null> = {};
  if (parsed?.camposEstruturados && typeof parsed.camposEstruturados === 'object') {
    camposEstruturados = filterStructuredObject(parsed.camposEstruturados, allowedKeys);
  } else {
    for (const k of allowedKeys) camposEstruturados[k] = null;
  }

  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  let dataExame: string | null = null;
  const de = parsed?.dataExame;
  if (typeof de === 'string' && ISO_DATE.test(de.trim())) dataExame = de.trim();

  const examesNaoMapeados = normalizeStringArray(parsed?.examesNaoMapeados);
  const avisos = normalizeStringArray(parsed?.avisos);
  const qualityFlags = normalizeStringArray(parsed?.qualityFlags);

  let rawSummary: string | null = null;
  if (typeof parsed?.rawSummary === 'string' && parsed.rawSummary.trim()) {
    rawSummary = parsed.rawSummary.trim();
  }

  return finalizeLaudoExtractionData({
    examType,
    usedExamTypeFallback,
    fileName,
    eye,
    dataExame,
    camposEstruturadosRaw: camposEstruturados,
    examesNaoMapeados,
    avisos,
    rawSummary,
    qualityFlagsFromModel: qualityFlags,
  });
}
