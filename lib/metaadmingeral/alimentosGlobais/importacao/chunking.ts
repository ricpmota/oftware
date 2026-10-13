import type { ExtractedPdfPage } from '@/lib/oftpay/extractedPdfPage';
import {
  FOOD_IMPORT_CHUNK_MAX_CHARS,
  FOOD_IMPORT_MIN_CHUNK_PAGES,
  FOOD_IMPORT_PAGES_PER_CHUNK,
} from './constants';

export function sortPdfPages(pages: ExtractedPdfPage[]): ExtractedPdfPage[] {
  return [...pages].sort((a, b) => a.page - b.page);
}

export function selectNextFoodImportChunk(
  pages: ExtractedPdfPage[],
  lastPageProcessed: number,
  maxPages = FOOD_IMPORT_PAGES_PER_CHUNK
): ExtractedPdfPage[] {
  const sorted = sortPdfPages(pages);
  const remaining = sorted.filter((p) => p.page > lastPageProcessed);
  if (remaining.length === 0) return [];

  const slice = remaining.slice(0, Math.max(FOOD_IMPORT_MIN_CHUNK_PAGES, maxPages));
  let chars = 0;
  const out: ExtractedPdfPage[] = [];
  for (const p of slice) {
    const len = (p.content || '').length;
    if (out.length > 0 && chars + len > FOOD_IMPORT_CHUNK_MAX_CHARS) break;
    out.push(p);
    chars += len;
  }
  return out.length > 0 ? out : slice.slice(0, 1);
}

export function buildChunkTextForGemini(pages: ExtractedPdfPage[]): string {
  return pages
    .map((p) => `===== PÁGINA ${p.page} =====\n${p.content || '(sem texto extraído)'}`)
    .join('\n\n');
}

export function isImportProcessingComplete(paginasProcessadas: number, totalPaginas: number): boolean {
  if (totalPaginas <= 0) return false;
  return paginasProcessadas >= totalPaginas;
}

export function computeImportProgressPercent(paginasProcessadas: number, totalPaginas: number): number {
  if (totalPaginas <= 0) return 0;
  return Math.round(Math.min(1, paginasProcessadas / totalPaginas) * 1000) / 10;
}
