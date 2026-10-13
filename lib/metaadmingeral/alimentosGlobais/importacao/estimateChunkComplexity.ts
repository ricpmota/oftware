/**
 * Chunking dinâmico por complexidade estimada da tabela.
 */

import type { ExtractedPdfPage } from '@/lib/oftpay/extractedPdfPage';
import {
  FOOD_IMPORT_CHUNK_MAX_CHARS,
  FOOD_IMPORT_MIN_CHUNK_PAGES,
} from './constants';

export type ChunkComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export function estimateChunkComplexity(pages: ExtractedPdfPage[]): ChunkComplexity {
  const text = pages.map((p) => p.content || '').join('\n');
  const chars = text.length;
  const lines = text.split(/\n|(?=\d{5,8}\s)/).length;
  const numbers = (text.match(/\d+[.,]\d+|\b\d{2,}\b/g) || []).length;
  const score = chars / 1200 + lines / 40 + numbers / 80;
  if (score >= 8 || chars > 9000 || numbers > 180) return 'HIGH';
  if (score >= 4 || chars > 4500 || numbers > 90) return 'MEDIUM';
  return 'LOW';
}

export function maxPagesForComplexity(c: ChunkComplexity): number {
  if (c === 'HIGH') return 1;
  if (c === 'MEDIUM') return 2;
  return 3;
}

/**
 * Seleciona próximo lote com tamanho dinâmico.
 * `candidatePages` já filtradas (ex.: só páginas a processar).
 */
export function selectDynamicFoodImportChunk(
  candidatePages: ExtractedPdfPage[],
  opts?: { maxChars?: number }
): ExtractedPdfPage[] {
  if (candidatePages.length === 0) return [];
  const maxChars = opts?.maxChars ?? FOOD_IMPORT_CHUNK_MAX_CHARS;

  // Começa com até 3 e reduz conforme complexidade do prefixo
  const probe = candidatePages.slice(0, 3);
  const complexity = estimateChunkComplexity(probe);
  const maxPages = Math.max(
    FOOD_IMPORT_MIN_CHUNK_PAGES,
    maxPagesForComplexity(complexity)
  );

  const slice = candidatePages.slice(0, maxPages);
  // Reavalia: se HIGH mesmo com 1 página ok; se MEDIUM com 2 e estoura chars, corta
  let chars = 0;
  const out: ExtractedPdfPage[] = [];
  for (const p of slice) {
    const len = (p.content || '').length;
    if (out.length > 0 && chars + len > maxChars) break;
    // Se adicionar 2ª página torna HIGH, fica só com a 1ª quando já há conteúdo denso
    if (out.length === 1) {
      const nextComplexity = estimateChunkComplexity([...out, p]);
      if (nextComplexity === 'HIGH' && (out[0].content || '').length > 2000) break;
    }
    out.push(p);
    chars += len;
  }
  return out.length > 0 ? out : candidatePages.slice(0, 1);
}
