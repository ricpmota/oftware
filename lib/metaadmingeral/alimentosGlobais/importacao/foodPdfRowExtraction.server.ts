/**
 * FASE B — Extração de linhas multimodal orientada por TableSchema.
 */

import { callFoodImportGeminiJson } from './foodPdfVertexClient.server';
import { parseGeminiExtractionPayload } from './normalizeExtraction';
import type { GeminiFoodExtractionPayload } from './types';
import type { FoodTableSchema } from './tableSchema';
import { FOOD_PDF_PROMPT_VERSION } from './constants';
import { GeminiImportError } from './geminiRetry';
import { buildFoodTableRowExtractionPromptV2 } from '@/lib/metaadmingeral/alimentosGlobais/prompts/foodTableRowExtractionPrompt';
import { pngToInlineDataPart } from './renderPdfPage.server';

export function buildSchemaOrientedExtractionPrompt(opts: {
  pageStart: number;
  pageEnd: number;
  fonteNome?: string;
  schema: FoodTableSchema;
}): string {
  return buildFoodTableRowExtractionPromptV2({
    pageNumber: opts.pageStart,
    fonteNome: opts.fonteNome,
    schema: opts.schema,
    estimatedDataRows: opts.schema.estimatedDataRows,
  });
}

export async function extrairLinhasComSchema(opts: {
  chunkText: string;
  pageStart: number;
  pageEnd: number;
  fonteNome?: string;
  schema: FoodTableSchema;
  pageImagePng?: Buffer | null;
  zeroRetry?: boolean;
}): Promise<{
  payload: GeminiFoodExtractionPayload;
  model: string;
  promptVersion: string;
  rawText: string;
  durationMs: number;
  finishReason: string | null;
  usage: { promptTokens?: number | null; candidatesTokens?: number | null; totalTokens?: number | null };
  extractionMode: 'text' | 'multimodal' | 'hybrid';
}> {
  const prompt = buildFoodTableRowExtractionPromptV2({
    pageNumber: opts.pageStart,
    fonteNome: opts.fonteNome,
    schema: opts.schema,
    estimatedDataRows: opts.schema.estimatedDataRows,
    zeroRetry: opts.zeroRetry,
  });

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: prompt }];

  let extractionMode: 'text' | 'multimodal' | 'hybrid' = 'text';
  if (opts.pageImagePng && opts.pageImagePng.length > 0) {
    parts.push(pngToInlineDataPart(opts.pageImagePng));
    extractionMode = opts.chunkText?.trim() ? 'hybrid' : 'multimodal';
  }
  if (opts.chunkText?.trim()) {
    parts.push({
      text: `\n\nTEXTO AUXILIAR (páginas ${opts.pageStart}-${opts.pageEnd}):\n\n${opts.chunkText}`,
    });
  }

  const result = await callFoodImportGeminiJson({
    parts,
    maxOutputTokens: 16384,
  });

  const payload = parseGeminiExtractionPayload(result.parsed);
  if (!Array.isArray(payload.foods)) {
    throw new GeminiImportError({
      message: 'Payload sem array foods.',
      code: 'GEMINI_INVALID_RESPONSE',
      transient: true,
    });
  }

  return {
    payload,
    model: result.model,
    promptVersion: FOOD_PDF_PROMPT_VERSION,
    rawText: result.text,
    durationMs: result.durationMs,
    finishReason: result.finishReason,
    usage: result.usage,
    extractionMode,
  };
}
