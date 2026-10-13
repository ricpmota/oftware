/**
 * Extração Gemini legado / compat — agora usa cliente + retry/throttle.
 * Preferir foodPdfRowExtraction (schema-oriented) no fluxo principal.
 */

import { buildFoodPdfExtractionPrompt, FOOD_PDF_PROMPT_VERSION } from '@/lib/metaadmingeral/alimentosGlobais/prompts/foodPdfExtractionPrompt';
import { parseGeminiExtractionPayload } from './normalizeExtraction';
import type { GeminiFoodExtractionPayload } from './types';
import { callFoodImportGeminiJson } from './foodPdfVertexClient.server';

export async function extrairAlimentosDePaginasComGemini(opts: {
  chunkText: string;
  pageStart: number;
  pageEnd: number;
  fonteNome?: string;
}): Promise<{
  payload: GeminiFoodExtractionPayload;
  model: string;
  promptVersion: string;
  rawText: string;
  durationMs: number;
  finishReason?: string | null;
}> {
  const prompt = buildFoodPdfExtractionPrompt({
    pageStart: opts.pageStart,
    pageEnd: opts.pageEnd,
    fonteNome: opts.fonteNome,
  });

  const result = await callFoodImportGeminiJson({
    parts: [
      { text: prompt },
      {
        text: `\n\nTEXTO DO PDF (páginas ${opts.pageStart}-${opts.pageEnd}):\n\n${opts.chunkText}`,
      },
    ],
  });

  const extraction = parseGeminiExtractionPayload(result.parsed);

  return {
    payload: extraction,
    model: result.model,
    promptVersion: FOOD_PDF_PROMPT_VERSION,
    rawText: result.text,
    durationMs: result.durationMs,
    finishReason: result.finishReason,
  };
}
