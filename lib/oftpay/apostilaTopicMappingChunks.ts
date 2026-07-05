import type { OftreviewContentPage } from '@/types/oftreviewContent';
import type { TopicMappingProgress } from '@/types/oftreviewContent';

/** Páginas por requisição à IA — mantém o prompt dentro do limite de tokens. */
export const MAPPING_PAGES_PER_CHUNK = 14;

/** Mínimo de páginas ao reduzir chunk após falha da IA. */
export const MAPPING_MIN_CHUNK_PAGES = 4;

export const MAPPING_CHUNK_MAX_CHARS = 38000;

export function sortContentPages(pages: OftreviewContentPage[]): OftreviewContentPage[] {
  return [...pages].sort((a, b) => a.page - b.page);
}

export function inferLastPageFromTopics(topics: Array<{ pages?: number[] }>): number {
  let max = 0;
  for (const topic of topics) {
    for (const page of topic.pages ?? []) {
      if (page > max) max = page;
    }
  }
  return max;
}

export function resolveLastPageProcessed(
  stored: TopicMappingProgress | undefined | null,
  existingTopics: Array<{ pages?: number[] }>
): number {
  const fromStored =
    stored &&
    typeof stored.lastPageProcessed === 'number' &&
    Number.isFinite(stored.lastPageProcessed) &&
    stored.lastPageProcessed > 0
      ? stored.lastPageProcessed
      : 0;
  const fromTopics = inferLastPageFromTopics(existingTopics);
  return Math.max(fromStored, fromTopics);
}

export function computeMappingPercent(lastPageProcessed: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  const ratio = Math.min(1, lastPageProcessed / totalPages);
  return Math.round(ratio * 1000) / 10;
}

export function isMappingComplete(lastPageProcessed: number, totalPages: number): boolean {
  if (totalPages <= 0) return false;
  return lastPageProcessed >= totalPages;
}

export function selectNextMappingChunk(
  pages: OftreviewContentPage[],
  lastPageProcessed: number,
  maxPages = MAPPING_PAGES_PER_CHUNK
): OftreviewContentPage[] {
  const sorted = sortContentPages(pages);
  const remaining = sorted.filter((p) => p.page > lastPageProcessed);
  return remaining.slice(0, maxPages);
}
