/**
 * ETAPA 03.3 — representação híbrida TEXT + VISUAL de uma página de importação.
 */

import type { PageClassification, TextExtractionQuality } from './tableSchema';

export type FoodImportExtractionMode = 'text' | 'multimodal' | 'hybrid';

export interface FoodImportPageRepresentation {
  pageNumber: number;
  extractedText?: string;
  textQuality: TextExtractionQuality;
  /** Path Storage ou id de doc em subcoleção de cache de imagens. */
  renderedPageRef?: string | null;
  /** Data URL / base64 sem prefixo — só em memória durante o lote. */
  renderedImageBase64?: string | null;
  renderedMimeType?: 'image/png' | 'image/jpeg';
  classification: PageClassification;
}

export interface FoodImportPageQualityMetrics {
  pageNumber: number;
  classification: PageClassification;
  schemaId?: string | null;
  textQuality: TextExtractionQuality;
  extractionMode: FoodImportExtractionMode;
  detectedRows?: number | null;
  estimatedDataRows?: number | null;
  extractedFoods: number;
  retryCount: number;
  flags?: string[];
}

export function isSchemaValidForExtraction(schema: {
  columns?: Array<{ semanticType?: string }> | null;
}): boolean {
  const cols = schema.columns || [];
  const hasIdentity = cols.some(
    (c) =>
      c.semanticType === 'food_name' ||
      c.semanticType === 'food_code' ||
      c.semanticType === 'brand'
  );
  const hasData = cols.some(
    (c) =>
      c.semanticType === 'nutrient' ||
      c.semanticType === 'portion' ||
      c.semanticType === 'preparation' ||
      c.semanticType === 'reference' ||
      c.semanticType === 'other'
  );
  return hasIdentity && hasData && cols.length >= 2;
}
