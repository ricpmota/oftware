import type { SegmentoAlimento } from '../segmentos';
import type { NutrienteExtraAlimento } from '../types';
import type {
  MergeResolution,
  PublicationAction,
  PublicationReadiness,
  PublicationStatus,
  ReviewStatusItem,
  StatusImportacaoAlimento,
  StatusLoteImport,
} from './constants';

/** Resposta bruta esperada do Gemini (antes da normalização). */
export interface GeminiFoodExtractionDocument {
  page?: number | null;
  table?: string | null;
  baseQuantity?: number | null;
  baseUnit?: string | null;
}

export interface GeminiFoodNutrientsRaw {
  [key: string]: unknown;
}

export interface GeminiFoodItemRaw {
  codigoOriginal?: string | null;
  /** IBGE/POF — código da preparação (ex.: "2" = Cozido). */
  codigoPreparacao?: string | null;
  nome?: string | null;
  nomeCientifico?: string | null;
  marca?: string | null;
  estado?: string | null;
  processamento?: string | null;
  preparo?: string | null;
  segmentoSugerido?: string | null;
  segmentoConfidence?: number | null;
  baseQuantidade?: number | null;
  baseUnidade?: string | null;
  nutrientes?: GeminiFoodNutrientsRaw | null;
  valoresOriginais?: Record<string, string | null> | null;
  nutrientesExtras?: Array<{
    nome?: string;
    valor?: unknown;
    unidade?: string;
    valorOriginal?: string | null;
    codigo?: string | null;
  }> | null;
  source?: {
    page?: number | null;
    table?: string | null;
    codigoOriginal?: string | null;
  } | null;
  extractionConfidence?: number | null;
}

export interface GeminiFoodExtractionPayload {
  document?: GeminiFoodExtractionDocument | null;
  foods?: GeminiFoodItemRaw[] | null;
}

export interface DuplicateMatchRef {
  scope: 'import' | 'global';
  id: string;
  nome: string;
  codigoOriginal?: string | null;
  reason: string;
}

/** Draft intermediário — NÃO é AlimentoGlobal publicado. */
export interface ImportedFoodDraft {
  id: string;
  importId: string;
  loteId: string;

  codigoOriginal?: string | null;
  /** Código da preparação (IBGE/POF). Distingue Cru vs Cozido do mesmo alimento. */
  codigoPreparacao?: string | null;
  /** Identidade de fonte estável — ex.: IBGE:6400101:2 */
  fonteIdentidade?: string | null;
  nome: string;
  nomeNormalizado: string;
  nomeCientifico?: string | null;
  marca?: string | null;
  estado?: string | null;
  processamento?: string | null;
  preparo?: string | null;
  descricao?: string | null;

  segmentoSugerido?: SegmentoAlimento | null;
  segmentoConfidence?: number | null;
  /** Segmento editável no preview (inicia = sugerido). */
  segmento?: SegmentoAlimento | null;

  baseQuantidade: number | null;
  baseUnidade: string | null;
  baseSeguraPara100g: boolean;

  energiaKcal?: number | null;
  energiaKj?: number | null;
  proteinasG?: number | null;
  carboidratosG?: number | null;
  gordurasTotaisG?: number | null;
  fibrasG?: number | null;
  glicoseG?: number | null;
  frutoseG?: number | null;
  lactoseG?: number | null;
  sacaroseG?: number | null;
  acucaresTotaisG?: number | null;
  amidoTotalG?: number | null;
  amidoDisponivelG?: number | null;
  amidoResistenteG?: number | null;
  gordurasSaturadasG?: number | null;
  gordurasMonoinsaturadasG?: number | null;
  gordurasPoliinsaturadasG?: number | null;
  gordurasTransG?: number | null;
  calcioMg?: number | null;
  ferroMg?: number | null;
  magnesioMg?: number | null;
  fosforoMg?: number | null;
  potassioMg?: number | null;
  sodioMg?: number | null;
  zincoMg?: number | null;
  vitaminaAMcg?: number | null;
  vitaminaCMg?: number | null;
  vitaminaDMcg?: number | null;
  vitaminaEMg?: number | null;
  vitaminaB1Mg?: number | null;
  vitaminaB2Mg?: number | null;
  vitaminaB3Mg?: number | null;
  vitaminaB6Mg?: number | null;
  vitaminaB12Mcg?: number | null;
  folatoMcg?: number | null;

  nutrientesExtras: NutrienteExtraAlimento[];
  valoresOriginais: Record<string, string | null>;

  sourcePage?: number | null;
  sourceTable?: string | null;
  extractionConfidence?: number | null;

  qualityFlags: string[];
  reviewStatus: ReviewStatusItem;
  duplicateCandidate: boolean;
  duplicateMatches: DuplicateMatchRef[];

  ignored?: boolean;
  rawGemini?: GeminiFoodItemRaw | null;

  /** ETAPA 04 — publicação */
  publicationAction?: PublicationAction | null;
  publicationReadiness?: PublicationReadiness | null;
  publicationStatus?: PublicationStatus | null;
  publishedFoodId?: string | null;
  publishedAt?: Date | null;
  publishedByUid?: string | null;
  publishedByEmail?: string | null;
  mergeTargetFoodId?: string | null;
  mergeConflictsResolved?: MergeConflict[] | null;
  publicationError?: string | null;

  criadoEm: Date;
  atualizadoEm: Date;
}

export interface MergeConflict {
  field: string;
  existingValue: unknown;
  importedValue: unknown;
  resolution: MergeResolution;
}

export interface ImportPublicationSummary {
  extraidos: number;
  criados: number;
  mesclados: number;
  ignorados: number;
  comRevisaoPendente: number;
  falharam: number;
}

export interface AlimentoImportacaoLote {
  id: string;
  importId: string;
  pageStart: number;
  pageEnd: number;
  status: StatusLoteImport;
  foodsExtracted: number;
  error?: string | null;
  errorCode?: string | null;
  errorType?: string | null;
  durationMs?: number | null;
  geminiModel?: string | null;
  promptVersion?: string | null;
  schemaId?: string | null;
  extractionSource?: string | null;
  classification?: string | null;
  attemptCount?: number;
  lastAttemptAt?: Date | null;
  nextRetryAt?: Date | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  lastErrorType?: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ImportObservability {
  geminiCalls: number;
  retryCalls: number;
  pagesSentToGemini: number;
  pagesSkippedNarrative: number;
  rateLimitHits: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AlimentoImportacaoDoc {
  id: string;
  arquivoNome: string;
  arquivoStoragePath: string;
  arquivoUrl?: string | null;
  fonteNome: string;
  fonteVersao?: string | null;
  fonteAno?: number | null;
  licenca?: string | null;
  observacao?: string | null;
  tipoConteudoEsperado?: string | null;

  status: StatusImportacaoAlimento;
  totalPaginas: number;
  paginasProcessadas: number;
  totalItensExtraidos: number;
  totalValidos: number;
  totalComAtencao: number;
  totalParaRevisao: number;
  totalDuplicados: number;

  geminiModel?: string | null;
  promptVersion?: string | null;
  erro?: string | null;

  /** ETAPA 03.2 */
  documentFoodMap?: import('./tableSchema').DocumentFoodMap | null;
  activeTableSchemaId?: string | null;
  observability?: ImportObservability | null;

  /** ETAPA 04 */
  publicationSummary?: ImportPublicationSummary | null;
  publishedAt?: Date | null;
  publishedByUid?: string | null;

  criadoPorUid: string;
  criadoPorEmail?: string | null;
  criadoEm: Date;
  atualizadoEm: Date;
}
