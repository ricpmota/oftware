/** Collection de importações PDF (isolada de alimentos_globais). */
export const COL_ALIMENTOS_IMPORTACOES = 'alimentos_importacoes';
export const SUBCOL_IMPORT_ITENS = 'itens';
export const SUBCOL_IMPORT_LOTES = 'lotes';
/** Texto por página — NUNCA no doc pai (limite 1 MiB do Firestore). */
export const SUBCOL_IMPORT_PAGINAS = 'paginas';
/** Schemas descobertos (FASE A). */
export const SUBCOL_IMPORT_SCHEMAS = 'schemas';
/** Páginas por documento na subcoleção (reduz writes; mantém cada doc << 1 MiB). */
export const FOOD_IMPORT_PAGES_PER_CACHE_DOC = 5;

export const FOOD_PDF_PROMPT_VERSION = 'food-pdf-extract-v4-hybrid';
export const FOOD_PDF_SCHEMA_PROMPT_VERSION = 'schema-discovery-v2';
/** Subcoleção de PNGs renderizados por página (cache multimodal). */
export const SUBCOL_IMPORT_PAGE_IMAGES = 'page_images';

/** Páginas por lote Gemini (tabelas densas) — default; chunking dinâmico pode reduzir. */
export const FOOD_IMPORT_PAGES_PER_CHUNK = 3;
export const FOOD_IMPORT_MIN_CHUNK_PAGES = 1;
export const FOOD_IMPORT_CHUNK_MAX_CHARS = 32000;
/** Páginas classificadas por request na Fase 1 (Mapear). */
export const FOOD_IMPORT_MAP_PAGES_PER_BATCH = 40;

export const STATUS_IMPORTACAO_ALIMENTO = [
  'uploaded',
  'mapping',
  'mapped',
  'processing',
  'processed',
  'review',
  'completed',
  'partially_completed',
  'failed',
] as const;

export type StatusImportacaoAlimento = (typeof STATUS_IMPORTACAO_ALIMENTO)[number];

export const ROTULO_STATUS_IMPORTACAO: Record<StatusImportacaoAlimento, string> = {
  uploaded: 'Enviado',
  mapping: 'Mapeando documento',
  mapped: 'Mapeado — pronto para ler tabelas',
  processing: 'Lendo tabelas',
  processed: 'Processado',
  review: 'Em revisão',
  completed: 'Concluído',
  partially_completed: 'Parcialmente concluído',
  failed: 'Falhou',
};

export const REVIEW_STATUS_ITEM = ['OK', 'ATTENTION', 'REVIEW', 'IGNORE'] as const;
export type ReviewStatusItem = (typeof REVIEW_STATUS_ITEM)[number];

export const STATUS_LOTE_IMPORT = [
  'pending',
  'processing',
  'waiting_retry',
  'done',
  'done_no_food_table',
  'failed',
  'failed_extraction',
  'failed_transient',
  'attention',
] as const;
export type StatusLoteImport = (typeof STATUS_LOTE_IMPORT)[number];

export const ROTULO_STATUS_LOTE: Record<StatusLoteImport, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  waiting_retry: 'Aguardando Gemini',
  done: 'Concluído',
  done_no_food_table: 'Sem tabela',
  failed: 'Falha',
  failed_extraction: 'Revisar extração',
  failed_transient: 'Falha temporária',
  attention: 'Atenção',
};

/** Ação humana de publicação (ETAPA 04). */
export const PUBLICATION_ACTIONS = ['CREATE', 'MERGE', 'SKIP'] as const;
export type PublicationAction = (typeof PUBLICATION_ACTIONS)[number];

export const PUBLICATION_READINESS = ['READY', 'NEEDS_REVIEW', 'BLOCKED', 'IGNORED'] as const;
export type PublicationReadiness = (typeof PUBLICATION_READINESS)[number];

export const PUBLICATION_STATUS = ['pending', 'published', 'skipped', 'failed'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUS)[number];

export const MERGE_RESOLUTIONS = [
  'KEEP_EXISTING',
  'USE_IMPORTED',
  'KEEP_BOTH_IF_SUPPORTED',
  'UNRESOLVED',
] as const;
export type MergeResolution = (typeof MERGE_RESOLUTIONS)[number];

export function isStatusImportacaoAlimento(v: unknown): v is StatusImportacaoAlimento {
  return typeof v === 'string' && (STATUS_IMPORTACAO_ALIMENTO as readonly string[]).includes(v);
}

export function isReviewStatusItem(v: unknown): v is ReviewStatusItem {
  return typeof v === 'string' && (REVIEW_STATUS_ITEM as readonly string[]).includes(v);
}

export function isPublicationAction(v: unknown): v is PublicationAction {
  return typeof v === 'string' && (PUBLICATION_ACTIONS as readonly string[]).includes(v);
}

export function isMergeResolution(v: unknown): v is MergeResolution {
  return typeof v === 'string' && (MERGE_RESOLUTIONS as readonly string[]).includes(v);
}
