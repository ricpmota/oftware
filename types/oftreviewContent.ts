/**
 * Conteúdo textual extraído das apostilas oficiais Oftreview.
 * Coleção Firestore: oftreviewContent
 */

import { QUESTOES_ADMIN_EMAIL } from '@/types/oftpayQuestoes';

export const OFTREVIEW_CONTENT_COLLECTION = 'oftreviewContent';
export const OFTREVIEW_CONTENT_ADMIN_EMAIL = QUESTOES_ADMIN_EMAIL;

export interface OftreviewContentPage {
  page: number;
  content: string;
}

/** Progresso do mapeamento incremental de tópicos por apostila. */
export interface TopicMappingProgress {
  lastPageProcessed: number;
  totalPages: number;
  updatedAt?: number;
}

export interface OftreviewContent {
  id?: string;
  apostilaTitulo: string;
  sourcePath: string;
  pages: OftreviewContentPage[];
  totalPages?: number;
  extractedAt?: number;
  topicMappingProgress?: TopicMappingProgress;
}

export type OftreviewContentDoc = OftreviewContent & { id: string };

/** Metadados para listagem (sem carregar texto de todas as páginas na UI). */
export interface OftreviewContentSummary {
  id: string;
  apostilaTitulo: string;
  sourcePath: string;
  totalPages: number;
  extractedAt?: number;
  topicMappingProgress?: TopicMappingProgress;
}

function parseTopicMappingProgress(raw: unknown): TopicMappingProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const lastPageProcessed =
    typeof row.lastPageProcessed === 'number' && Number.isFinite(row.lastPageProcessed)
      ? row.lastPageProcessed
      : undefined;
  const totalPages =
    typeof row.totalPages === 'number' && Number.isFinite(row.totalPages)
      ? row.totalPages
      : undefined;
  if (lastPageProcessed == null || totalPages == null) return undefined;
  return {
    lastPageProcessed,
    totalPages,
    updatedAt:
      typeof row.updatedAt === 'number' && Number.isFinite(row.updatedAt)
        ? row.updatedAt
        : undefined,
  };
}

export function toContentSummary(doc: OftreviewContentDoc): OftreviewContentSummary {
  return {
    id: doc.id,
    apostilaTitulo: doc.apostilaTitulo,
    sourcePath: doc.sourcePath,
    totalPages: doc.totalPages ?? doc.pages?.length ?? 0,
    extractedAt: doc.extractedAt,
    topicMappingProgress: doc.topicMappingProgress,
  };
}

export { parseTopicMappingProgress };
