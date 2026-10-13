/**
 * Núcleo ETAPA 03.3 — mapear documento, discovery/extraction multimodal híbrido.
 */

import type { ExtractedPdfPage } from '@/lib/oftpay/extractedPdfPage';
import { buildChunkTextForGemini } from './chunking';
import { selectDynamicFoodImportChunk } from './estimateChunkComplexity';
import {
  classificationForPage,
  isFoodBearingClassification,
  shouldExtractFoods,
} from './classifyPdfPage';
import { discoverFoodTableSchema } from './foodPdfSchemaDiscovery.server';
import { extrairLinhasComSchema } from './foodPdfRowExtraction.server';
import { extrairAlimentosDePaginasComGemini } from './foodPdfGemini.server';
import {
  hasFoodTableSignals,
  looksLikeCompositionDataTable,
  parseIbgeTabela1FromText,
} from './parseIbgeTabela1';
import type { DocumentFoodMap, FoodTableSchema } from './tableSchema';
import type { GeminiFoodItemRaw, ImportObservability } from './types';
import type { FoodImportErrorCode } from './geminiRetry';
import type { FoodImportExtractionMode, FoodImportPageQualityMetrics } from './pageRepresentation';

export function emptyObservability(): ImportObservability {
  return {
    geminiCalls: 0,
    retryCalls: 0,
    pagesSentToGemini: 0,
    pagesSkippedNarrative: 0,
    rateLimitHits: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}

export function mergeObservability(
  base: ImportObservability | null | undefined,
  delta: Partial<ImportObservability>
): ImportObservability {
  const b = base || emptyObservability();
  return {
    geminiCalls: b.geminiCalls + (delta.geminiCalls || 0),
    retryCalls: b.retryCalls + (delta.retryCalls || 0),
    pagesSentToGemini: b.pagesSentToGemini + (delta.pagesSentToGemini || 0),
    pagesSkippedNarrative: b.pagesSkippedNarrative + (delta.pagesSkippedNarrative || 0),
    rateLimitHits: b.rateLimitHits + (delta.rateLimitHits || 0),
    inputTokens: b.inputTokens + (delta.inputTokens || 0),
    outputTokens: b.outputTokens + (delta.outputTokens || 0),
  };
}

export function selectNextMappedChunk(
  pages: ExtractedPdfPage[],
  lastPageProcessed: number,
  map: DocumentFoodMap | null
): {
  chunk: ExtractedPdfPage[];
  classification: ReturnType<typeof classificationForPage>;
} {
  const remaining = pages
    .filter((p) => p.page > lastPageProcessed)
    .sort((a, b) => a.page - b.page);
  if (remaining.length === 0) {
    return { chunk: [], classification: 'UNKNOWN' };
  }

  if (!map) {
    // Multimodal: 1 página por vez
    return {
      chunk: remaining.slice(0, 1),
      classification: 'UNKNOWN',
    };
  }

  const firstClass = classificationForPage(map, remaining[0].page);

  // Multimodal confiável: 1 página por chamada
  if (isFoodBearingClassification(firstClass) || firstClass === 'UNKNOWN') {
    return { chunk: remaining.slice(0, 1), classification: firstClass };
  }

  // Narrativa/referência: processa até 5 páginas sem Gemini
  const family = remaining.filter((p) => classificationForPage(map, p.page) === firstClass);
  const consecutive: ExtractedPdfPage[] = [];
  for (const p of family) {
    if (consecutive.length === 0) {
      consecutive.push(p);
      continue;
    }
    if (p.page === consecutive[consecutive.length - 1].page + 1) consecutive.push(p);
    else break;
  }
  return {
    chunk: consecutive.slice(0, 5),
    classification: firstClass,
  };
}

export async function extractFoodsForChunk(opts: {
  chunk: ExtractedPdfPage[];
  classification: string;
  fonteNome: string;
  schema: FoodTableSchema | null;
  ensureSchema: (
    sample: ExtractedPdfPage[],
    imagePng?: Buffer | null
  ) => Promise<FoodTableSchema | null>;
  /** Render sob demanda para a página do chunk. */
  resolvePageImage?: (pageNumber: number) => Promise<Buffer | null>;
}): Promise<{
  foods: GeminiFoodItemRaw[];
  extractionSource: string;
  errorCode: FoodImportErrorCode | null;
  schema: FoodTableSchema | null;
  geminiCalls: number;
  pagesSentToGemini: number;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  model: string | null;
  promptVersion: string | null;
  finishReason: string | null;
  extractionMode: FoodImportExtractionMode;
  pageMetrics: FoodImportPageQualityMetrics[];
  flags: string[];
}> {
  const pageStart = opts.chunk[0].page;
  const pageEnd = opts.chunk[opts.chunk.length - 1].page;
  const chunkText = buildChunkTextForGemini(opts.chunk);
  const textQuality = opts.chunk[0]
    ? (await import('./classifyPdfPage')).assessTextExtractionQuality(
        opts.chunk[0].content || ''
      )
    : 'GOOD';

  if (!shouldExtractFoods(opts.classification as import('./tableSchema').PageClassification)) {
    return {
      foods: [],
      extractionSource: 'skipped_narrative',
      errorCode: 'NO_FOOD_TABLE',
      schema: opts.schema,
      geminiCalls: 0,
      pagesSentToGemini: 0,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 0,
      model: null,
      promptVersion: null,
      finishReason: null,
      extractionMode: 'text',
      pageMetrics: opts.chunk.map((p) => ({
        pageNumber: p.page,
        classification: opts.classification as FoodImportPageQualityMetrics['classification'],
        textQuality,
        extractionMode: 'text',
        extractedFoods: 0,
        retryCount: 0,
      })),
      flags: [],
    };
  }

  let schema = opts.schema;
  let geminiCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let durationMs = 0;
  let model: string | null = null;
  let promptVersion: string | null = null;
  let finishReason: string | null = null;
  let extractionMode: FoodImportExtractionMode = 'text';
  const flags: string[] = [];
  let retryCount = 0;

  const pageImage =
    opts.resolvePageImage && opts.chunk.length === 1
      ? await opts.resolvePageImage(opts.chunk[0].page)
      : null;

  if (!schema) {
    schema = await opts.ensureSchema(opts.chunk.slice(0, 1), pageImage);
    geminiCalls += 1;
  }

  let foods: GeminiFoodItemRaw[] = [];
  let extractionSource = 'gemini_schema_hybrid';

  if (schema) {
    const extracted = await extrairLinhasComSchema({
      chunkText,
      pageStart,
      pageEnd,
      fonteNome: opts.fonteNome,
      schema,
      pageImagePng: pageImage,
    });
    foods = [...(extracted.payload.foods || [])];
    geminiCalls += 1;
    durationMs += extracted.durationMs;
    model = extracted.model;
    promptVersion = extracted.promptVersion;
    finishReason = extracted.finishReason;
    inputTokens += extracted.usage.promptTokens || 0;
    outputTokens += extracted.usage.candidatesTokens || 0;
    extractionMode = extracted.extractionMode;
  } else {
    const extracted = await extrairAlimentosDePaginasComGemini({
      chunkText,
      pageStart,
      pageEnd,
      fonteNome: opts.fonteNome,
    });
    foods = [...(extracted.payload.foods || [])];
    extractionSource = 'gemini_legacy';
    geminiCalls += 1;
    durationMs += extracted.durationMs;
    model = extracted.model;
    promptVersion = extracted.promptVersion;
    finishReason = extracted.finishReason;
  }

  // Zero suspeito em FOOD_TABLE → 1 retry multimodal
  const tableLike =
    isFoodBearingClassification(
      opts.classification as import('./tableSchema').PageClassification
    ) ||
    looksLikeCompositionDataTable(chunkText) ||
    hasFoodTableSignals(chunkText);

  if (foods.length === 0 && tableLike && schema && pageImage) {
    retryCount = 1;
    flags.push('ZERO_SUSPECT_RETRY');
    const retry = await extrairLinhasComSchema({
      chunkText,
      pageStart,
      pageEnd,
      fonteNome: opts.fonteNome,
      schema,
      pageImagePng: pageImage,
      zeroRetry: true,
    });
    foods = [...(retry.payload.foods || [])];
    geminiCalls += 1;
    durationMs += retry.durationMs;
    inputTokens += retry.usage.promptTokens || 0;
    outputTokens += retry.usage.candidatesTokens || 0;
    extractionMode = retry.extractionMode;
    finishReason = retry.finishReason;
  }

  // Fallback determinístico IBGE só depois do universal
  if (foods.length === 0 && hasFoodTableSignals(chunkText)) {
    const ibge = parseIbgeTabela1FromText(chunkText);
    if (ibge.length > 0) {
      foods = ibge;
      extractionSource = 'dense_fallback_after_hybrid';
      flags.push('IBGE_DENSE_FALLBACK');
    }
  }

  const estimated = schema?.estimatedDataRows ?? null;
  if (
    estimated != null &&
    estimated >= 8 &&
    foods.length > 0 &&
    foods.length < estimated * 0.4
  ) {
    flags.push('POSSIBLE_PARTIAL_EXTRACTION');
  }

  let errorCode: FoodImportErrorCode | null = null;
  if (foods.length === 0 && tableLike) {
    errorCode = 'TABLE_DETECTED_ZERO_ITEMS';
    flags.push('REVIEW_REQUIRED');
  }

  return {
    foods,
    extractionSource,
    errorCode,
    schema,
    geminiCalls,
    pagesSentToGemini: opts.chunk.length,
    inputTokens,
    outputTokens,
    durationMs,
    model,
    promptVersion,
    finishReason,
    extractionMode,
    pageMetrics: opts.chunk.map((p) => ({
      pageNumber: p.page,
      classification: opts.classification as FoodImportPageQualityMetrics['classification'],
      schemaId: schema?.id || null,
      textQuality,
      extractionMode,
      detectedRows: foods.length,
      estimatedDataRows: estimated,
      extractedFoods: foods.length,
      retryCount,
      flags,
    })),
    flags,
  };
}

export { discoverFoodTableSchema };
export { selectDynamicFoodImportChunk };
