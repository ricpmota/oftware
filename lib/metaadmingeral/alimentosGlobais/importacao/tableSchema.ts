/**
 * ETAPA 03.2 — TableSchema genérico (descoberta dinâmica, não hardcode por fonte).
 */

export const FOOD_TABLE_TYPES = [
  'MACRONUTRIENTS',
  'CARBOHYDRATES',
  'FATS',
  'MINERALS',
  'VITAMINS',
  'AMINO_ACIDS',
  'PORTIONS',
  'GLYCEMIC_RESPONSE',
  'REFERENCES',
  'MIXED',
  'UNKNOWN',
] as const;

export type FoodTableType = (typeof FOOD_TABLE_TYPES)[number];

export const FOOD_COLUMN_SEMANTIC_TYPES = [
  'food_code',
  'food_name',
  'scientific_name',
  'brand',
  'preparation_code',
  'preparation',
  'portion',
  'nutrient',
  'reference',
  'other',
] as const;

export type FoodColumnSemanticType = (typeof FOOD_COLUMN_SEMANTIC_TYPES)[number];

export interface FoodTableColumn {
  sourceHeader: string;
  semanticType: FoodColumnSemanticType;
  /** Campo canônico quando conhecido (ex.: energiaKcal). Null → nutrientesExtras. */
  targetField?: string | null;
  nutrientName?: string | null;
  unit?: string | null;
}

export interface FoodTableSchema {
  id: string;
  tableTitle?: string | null;
  tableNumber?: string | null;
  tableType: FoodTableType;
  confidence: number;
  base?: {
    quantity?: number | null;
    unit?: string | null;
    description?: string | null;
  } | null;
  columns: FoodTableColumn[];
  rowIdentityHints?: string[];
  continuationPattern?: string | null;
  detectedLanguage?: string | null;
  /** Estimativa visual de linhas de dados (ETAPA 03.3). */
  estimatedDataRows?: number | null;
  rowPattern?: {
    rowType?: string;
    foodIdentityColumns?: string[];
    preparationColumns?: string[];
    nutrientColumns?: string[];
  } | null;
  /** Páginas usadas na discovery */
  samplePages?: number[];
  criadoEm?: Date;
  atualizadoEm?: Date;
}

export const PAGE_CLASSIFICATIONS = [
  'NARRATIVE',
  'FOOD_TABLE',
  'TABLE_CONTINUATION',
  'REFERENCE_TABLE',
  'UNKNOWN',
] as const;

export type PageClassification = (typeof PAGE_CLASSIFICATIONS)[number];

export type TextExtractionQuality = 'GOOD' | 'DEGRADED' | 'UNUSABLE';

export interface DocumentFoodRange {
  startPage: number;
  endPage: number;
  classification: PageClassification;
  schemaId?: string | null;
  textQuality?: TextExtractionQuality;
}

export interface DocumentFoodMap {
  totalPages: number;
  ranges: DocumentFoodRange[];
  /** Páginas já classificadas (cursor da Fase 1). */
  pagesMapped?: number;
  /** true quando pagesMapped >= totalPages. */
  complete?: boolean;
  mappedAt?: string;
  version: number;
}

export interface DocumentFoodMapSummary {
  pagesMapped: number;
  totalPages: number;
  complete: boolean;
  tablePages: number;
  narrativePages: number;
  referencePages: number;
  unknownPages: number;
  tableRanges: number;
}

export function isFoodTableType(v: unknown): v is FoodTableType {
  return typeof v === 'string' && (FOOD_TABLE_TYPES as readonly string[]).includes(v);
}

export function isFoodColumnSemanticType(v: unknown): v is FoodColumnSemanticType {
  return typeof v === 'string' && (FOOD_COLUMN_SEMANTIC_TYPES as readonly string[]).includes(v);
}

export function parseFoodTableSchema(raw: unknown, id: string): FoodTableSchema {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const columnsRaw = Array.isArray(r.columns) ? r.columns : [];
  const columns: FoodTableColumn[] = columnsRaw
    .filter((c) => c && typeof c === 'object')
    .map((c) => {
      const col = c as Record<string, unknown>;
      const semantic = isFoodColumnSemanticType(col.semanticType)
        ? col.semanticType
        : 'other';
      return {
        sourceHeader: String(col.sourceHeader || col.header || '').trim() || 'coluna',
        semanticType: semantic,
        targetField:
          col.targetField == null || col.targetField === ''
            ? null
            : String(col.targetField),
        nutrientName:
          col.nutrientName == null ? null : String(col.nutrientName),
        unit: col.unit == null ? null : String(col.unit),
      };
    });

  const base =
    r.base && typeof r.base === 'object'
      ? {
          quantity:
            typeof (r.base as { quantity?: unknown }).quantity === 'number'
              ? (r.base as { quantity: number }).quantity
              : null,
          unit:
            (r.base as { unit?: unknown }).unit == null
              ? null
              : String((r.base as { unit: unknown }).unit),
          description:
            (r.base as { description?: unknown }).description == null
              ? null
              : String((r.base as { description: unknown }).description),
        }
      : null;

  const conf =
    typeof r.confidence === 'number' && Number.isFinite(r.confidence)
      ? Math.max(0, Math.min(1, r.confidence))
      : 0.5;

  return {
    id,
    tableTitle: r.tableTitle == null ? null : String(r.tableTitle),
    tableNumber: r.tableNumber == null ? null : String(r.tableNumber),
    tableType: isFoodTableType(r.tableType) ? r.tableType : 'UNKNOWN',
    confidence: conf,
    base,
    columns,
    rowIdentityHints: Array.isArray(r.rowIdentity || r.rowIdentityHints)
      ? ((r.rowIdentity || r.rowIdentityHints) as unknown[]).map(String)
      : [],
    continuationPattern:
      r.continuationPattern == null ? null : String(r.continuationPattern),
    detectedLanguage:
      r.detectedLanguage == null ? null : String(r.detectedLanguage),
    samplePages: Array.isArray(r.samplePages)
      ? (r.samplePages as unknown[]).map(Number).filter((n) => Number.isFinite(n))
      : [],
    estimatedDataRows:
      typeof r.estimatedDataRows === 'number' && Number.isFinite(r.estimatedDataRows)
        ? Math.max(0, Math.round(r.estimatedDataRows))
        : null,
    rowPattern:
      r.rowPattern && typeof r.rowPattern === 'object'
        ? (r.rowPattern as FoodTableSchema['rowPattern'])
        : null,
  };
}
