/**
 * Classificação barata/determinística de páginas de PDF nutricional.
 * Não precisa ser perfeita — reduz chamadas Gemini.
 */

import type { ExtractedPdfPage } from '@/lib/oftpay/extractedPdfPage';
import type {
  DocumentFoodMap,
  DocumentFoodMapSummary,
  DocumentFoodRange,
  PageClassification,
  TextExtractionQuality,
} from './tableSchema';
import {
  hasFoodTableSignals,
  looksLikeBibliographyOnly,
  looksLikeCompositionDataTable,
} from './parseIbgeTabela1';

export function assessTextExtractionQuality(content: string): TextExtractionQuality {
  const t = (content || '').trim();
  if (t.length < 40) return 'UNUSABLE';
  const alnum = (t.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
  const ratio = alnum / Math.max(1, t.length);
  if (ratio < 0.35 && t.length < 200) return 'UNUSABLE';
  if (ratio < 0.45) return 'DEGRADED';
  const digits = (t.match(/\d/g) || []).length;
  if (digits < 3 && t.length > 800) return 'DEGRADED';
  return 'GOOD';
}

export function classifyPdfPage(page: ExtractedPdfPage): {
  classification: PageClassification;
  textQuality: TextExtractionQuality;
} {
  const text = page.content || '';
  const textQuality = assessTextExtractionQuality(text);
  const lower = text.toLowerCase();

  // UNUSABLE não descarta tabela visual — vira UNKNOWN para inspeção multimodal
  if (textQuality === 'UNUSABLE') {
    return { classification: 'UNKNOWN', textQuality };
  }

  // Dados de composição têm prioridade sobre a palavra "Referências" (coluna TBCA)
  if (looksLikeCompositionDataTable(text)) {
    if (
      /\(continua(ção|cao)\)|continua(ção|cao)\s*$/i.test(lower) ||
      /tabela\s+\d+[^\n]{0,40}continua|quadro\s+\d+[^\n]{0,40}continua/i.test(lower)
    ) {
      return { classification: 'TABLE_CONTINUATION', textQuality };
    }
    return { classification: 'FOOD_TABLE', textQuality };
  }

  if (looksLikeBibliographyOnly(text)) {
    return { classification: 'REFERENCE_TABLE', textQuality };
  }

  if (
    /\(continua(ção|cao)\)|continua(ção|cao)\s*$/i.test(lower) ||
    /tabela\s+\d+[^\n]{0,40}continua/i.test(lower)
  ) {
    return { classification: 'TABLE_CONTINUATION', textQuality };
  }

  const digitRatio = (text.match(/\d/g) || []).length / Math.max(1, text.length);
  const hasUnits =
    /\bkcal\b|\bkg\b|\bmg\b|\bµg\b|\bug\b|\bg\b|\bmcg\b/i.test(text);
  const hasCodeLike = /\b\d{5,8}\b/.test(text) || /\b\d{2,4}[A-Za-z]\b/.test(text);
  const foodSignals = hasFoodTableSignals(text);

  if (foodSignals || (digitRatio > 0.08 && hasUnits && hasCodeLike)) {
    return { classification: 'FOOD_TABLE', textQuality };
  }

  if (digitRatio > 0.12 && hasUnits) {
    return { classification: 'FOOD_TABLE', textQuality };
  }

  if (digitRatio < 0.03 && text.length > 400) {
    return { classification: 'NARRATIVE', textQuality };
  }

  return { classification: 'UNKNOWN', textQuality };
}

/** Agrupa páginas consecutivas com mesma classificação em ranges. */
export function buildDocumentFoodMap(pages: ExtractedPdfPage[]): DocumentFoodMap {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const ranges: DocumentFoodRange[] = [];
  let current: DocumentFoodRange | null = null;

  for (const p of sorted) {
    const { classification, textQuality } = classifyPdfPage(p);
    if (
      current &&
      current.classification === classification &&
      p.page === current.endPage + 1
    ) {
      current.endPage = p.page;
      continue;
    }
    if (current) ranges.push(current);
    current = {
      startPage: p.page,
      endPage: p.page,
      classification,
      textQuality,
      schemaId: null,
    };
  }
  if (current) ranges.push(current);

  // Continuação após FOOD_TABLE herda semanticamente como tabela
  for (let i = 1; i < ranges.length; i++) {
    if (
      ranges[i].classification === 'TABLE_CONTINUATION' &&
      (ranges[i - 1].classification === 'FOOD_TABLE' ||
        ranges[i - 1].classification === 'TABLE_CONTINUATION')
    ) {
      // mantém TABLE_CONTINUATION; schemaId preenchido depois
    }
  }

  return {
    totalPages: sorted.length,
    ranges,
    pagesMapped: sorted.length,
    complete: true,
    mappedAt: new Date().toISOString(),
    version: 1,
  };
}

/** Classifica páginas 1..throughPage e marca progresso parcial. */
export function buildDocumentFoodMapThrough(
  pages: ExtractedPdfPage[],
  throughPage: number,
  totalPages: number
): DocumentFoodMap {
  const subset = pages
    .filter((p) => p.page <= throughPage)
    .sort((a, b) => a.page - b.page);
  const map = buildDocumentFoodMap(subset);
  const pagesMapped = Math.min(Math.max(0, throughPage), totalPages);
  return {
    ...map,
    totalPages,
    pagesMapped,
    complete: pagesMapped >= totalPages && totalPages > 0,
    mappedAt: new Date().toISOString(),
    version: 1,
  };
}

export function isDocumentFoodMapComplete(
  map: DocumentFoodMap | null | undefined,
  totalPages: number
): boolean {
  if (!map?.ranges?.length || totalPages <= 0) return false;
  if (map.complete === true) return true;
  if (typeof map.pagesMapped === 'number' && map.pagesMapped >= totalPages) return true;
  // Legacy (pré–Fase 1 explícita): ranges cobrem o documento inteiro
  const maxEnd = Math.max(...map.ranges.map((r) => r.endPage));
  const minStart = Math.min(...map.ranges.map((r) => r.startPage));
  return minStart <= 1 && maxEnd >= totalPages;
}

export function summarizeDocumentFoodMap(
  map: DocumentFoodMap | null | undefined
): DocumentFoodMapSummary {
  const empty: DocumentFoodMapSummary = {
    pagesMapped: 0,
    totalPages: map?.totalPages || 0,
    complete: false,
    tablePages: 0,
    narrativePages: 0,
    referencePages: 0,
    unknownPages: 0,
    tableRanges: 0,
  };
  if (!map?.ranges?.length) return empty;

  let tablePages = 0;
  let narrativePages = 0;
  let referencePages = 0;
  let unknownPages = 0;
  let tableRanges = 0;

  for (const r of map.ranges) {
    const n = Math.max(0, r.endPage - r.startPage + 1);
    if (r.classification === 'FOOD_TABLE' || r.classification === 'TABLE_CONTINUATION') {
      tablePages += n;
      tableRanges += 1;
    } else if (r.classification === 'NARRATIVE') {
      narrativePages += n;
    } else if (r.classification === 'REFERENCE_TABLE') {
      referencePages += n;
    } else {
      unknownPages += n;
    }
  }

  const pagesMapped =
    typeof map.pagesMapped === 'number'
      ? map.pagesMapped
      : Math.max(...map.ranges.map((r) => r.endPage), 0);

  return {
    pagesMapped,
    totalPages: map.totalPages || pagesMapped,
    complete: Boolean(map.complete) || pagesMapped >= (map.totalPages || 0),
    tablePages,
    narrativePages,
    referencePages,
    unknownPages,
    tableRanges,
  };
}

export function classificationForPage(
  map: DocumentFoodMap,
  page: number
): PageClassification {
  const r = map.ranges.find((x) => page >= x.startPage && page <= x.endPage);
  return r?.classification || 'UNKNOWN';
}

export function isFoodBearingClassification(c: PageClassification): boolean {
  return c === 'FOOD_TABLE' || c === 'TABLE_CONTINUATION';
}

/** Páginas que devem tentar extração (UNKNOWN incluso — conservador). */
export function shouldExtractFoods(c: PageClassification): boolean {
  return isFoodBearingClassification(c) || c === 'UNKNOWN';
}
