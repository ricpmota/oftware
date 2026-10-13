/**
 * FASE A — Schema Discovery multimodal (imagem + texto auxiliar).
 */

import { callFoodImportGeminiJson } from './foodPdfVertexClient.server';
import { parseFoodTableSchema, type FoodTableSchema } from './tableSchema';
import { FOOD_PDF_SCHEMA_PROMPT_VERSION } from './constants';
import { buildFoodTableSchemaDiscoveryPromptV2 } from '@/lib/metaadmingeral/alimentosGlobais/prompts/foodTableSchemaDiscoveryPrompt';
import { isSchemaValidForExtraction } from './pageRepresentation';
import { pngToInlineDataPart } from './renderPdfPage.server';
import { GeminiImportError } from './geminiRetry';

export function buildFoodTableSchemaDiscoveryPrompt(opts: {
  pageStart: number;
  pageEnd: number;
  fonteNome?: string;
}): string {
  // legado text-only — delega ao v2 com a primeira página
  return buildFoodTableSchemaDiscoveryPromptV2({
    pageNumber: opts.pageStart,
    fonteNome: opts.fonteNome,
  });
}

export async function discoverFoodTableSchema(opts: {
  chunkText: string;
  pageStart: number;
  pageEnd: number;
  fonteNome?: string;
  schemaId: string;
  /** PNG da página (obrigatório no fluxo híbrido; opcional no legado). */
  pageImagePng?: Buffer | null;
  textQuality?: string;
}): Promise<{
  schema: FoodTableSchema | null;
  isFoodCompositionTable: boolean;
  isContinuation: boolean;
  model: string;
  promptVersion: string;
  durationMs: number;
  usage: { promptTokens?: number | null; candidatesTokens?: number | null; totalTokens?: number | null };
  rawText: string;
  extractionMode: 'text' | 'multimodal' | 'hybrid';
}> {
  const prompt = buildFoodTableSchemaDiscoveryPromptV2({
    pageNumber: opts.pageStart,
    fonteNome: opts.fonteNome,
    textQuality: opts.textQuality,
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
      text: `\n\nTEXTO EXTRAÍDO AUXILIAR (pode estar fora de ordem):\n\n${opts.chunkText}`,
    });
  }

  const result = await callFoodImportGeminiJson({
    parts,
    maxOutputTokens: 4096,
  });

  const raw = result.parsed as Record<string, unknown>;
  const isFood =
    raw?.isFoodCompositionTable === true ||
    (Array.isArray(raw?.columns) && (raw.columns as unknown[]).length > 0);
  const isContinuation = raw?.isContinuation === true;

  if (!isFood) {
    return {
      schema: null,
      isFoodCompositionTable: false,
      isContinuation,
      model: result.model,
      promptVersion: FOOD_PDF_SCHEMA_PROMPT_VERSION,
      durationMs: result.durationMs,
      usage: result.usage,
      rawText: result.text,
      extractionMode,
    };
  }

  const schema = parseFoodTableSchema(raw, opts.schemaId);
  schema.samplePages = [opts.pageStart];
  if (!isSchemaValidForExtraction(schema)) {
    throw new GeminiImportError({
      message: 'SCHEMA_DISCOVERY_FAILED: schema sem food_name/código e coluna de dado.',
      code: 'PARSER_ERROR',
      transient: false,
    });
  }

  return {
    schema,
    isFoodCompositionTable: true,
    isContinuation,
    model: result.model,
    promptVersion: FOOD_PDF_SCHEMA_PROMPT_VERSION,
    durationMs: result.durationMs,
    usage: result.usage,
    rawText: result.text,
    extractionMode,
  };
}
