import type { AlimentoGlobal, AlimentoGlobalUpdateInput } from '../types';
import type { MergeConflict, ImportedFoodDraft } from './types';
import type { MergeResolution } from './constants';

/** Campos comparáveis no merge (identidade + nutrientes). */
export const MERGE_COMPARABLE_FIELDS = [
  'nome',
  'nomeCientifico',
  'marca',
  'segmento',
  'estado',
  'processamento',
  'preparo',
  'descricao',
  'baseQuantidade',
  'energiaKcal',
  'energiaKj',
  'proteinasG',
  'carboidratosG',
  'gordurasTotaisG',
  'fibrasG',
  'glicoseG',
  'frutoseG',
  'lactoseG',
  'sacaroseG',
  'acucaresTotaisG',
  'amidoTotalG',
  'amidoDisponivelG',
  'amidoResistenteG',
  'gordurasSaturadasG',
  'gordurasMonoinsaturadasG',
  'gordurasPoliinsaturadasG',
  'gordurasTransG',
  'calcioMg',
  'ferroMg',
  'magnesioMg',
  'fosforoMg',
  'potassioMg',
  'sodioMg',
  'zincoMg',
  'vitaminaAMcg',
  'vitaminaCMg',
  'vitaminaDMcg',
  'vitaminaEMg',
  'vitaminaB1Mg',
  'vitaminaB2Mg',
  'vitaminaB3Mg',
  'vitaminaB6Mg',
  'vitaminaB12Mcg',
  'folatoMcg',
] as const;

export type MergeComparableField = (typeof MERGE_COMPARABLE_FIELDS)[number];

export type MergeFieldSuggestion = {
  field: MergeComparableField;
  existingValue: unknown;
  importedValue: unknown;
  /** Sugestão automática (conflitos ficam UNRESOLVED). */
  suggestedResolution: MergeResolution;
};

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() === b.trim();
  }
  return a === b;
}

function getDraftField(draft: ImportedFoodDraft, field: MergeComparableField): unknown {
  if (field === 'segmento') return draft.segmento ?? draft.segmentoSugerido ?? null;
  return (draft as Record<string, unknown>)[field] ?? null;
}

function getExistingField(food: AlimentoGlobal, field: MergeComparableField): unknown {
  return (food as Record<string, unknown>)[field] ?? null;
}

/**
 * Compara existente vs importado e sugere resoluções.
 * Conflito (ambos não-null e diferentes) → UNRESOLVED.
 */
export function buildMergeSuggestions(
  existing: AlimentoGlobal,
  draft: ImportedFoodDraft
): MergeFieldSuggestion[] {
  const out: MergeFieldSuggestion[] = [];
  for (const field of MERGE_COMPARABLE_FIELDS) {
    const existingValue = getExistingField(existing, field);
    const importedValue = getDraftField(draft, field);

    let suggestedResolution: MergeResolution;
    if (existingValue == null && importedValue != null) {
      suggestedResolution = 'USE_IMPORTED';
    } else if (existingValue != null && importedValue == null) {
      suggestedResolution = 'KEEP_EXISTING';
    } else if (valuesEqual(existingValue, importedValue)) {
      suggestedResolution = 'KEEP_EXISTING';
    } else if (existingValue != null && importedValue != null) {
      suggestedResolution = 'UNRESOLVED';
    } else {
      suggestedResolution = 'KEEP_EXISTING';
    }

    out.push({ field, existingValue, importedValue, suggestedResolution });
  }
  return out;
}

export function suggestionsToConflicts(
  suggestions: MergeFieldSuggestion[],
  resolutions?: Record<string, MergeResolution>
): MergeConflict[] {
  return suggestions.map((s) => {
    const resolution = resolutions?.[s.field] ?? s.suggestedResolution;
    return {
      field: s.field,
      existingValue: s.existingValue,
      importedValue: s.importedValue,
      resolution,
    };
  });
}

export function hasUnresolvedConflicts(conflicts: MergeConflict[]): boolean {
  return conflicts.some((c) => c.resolution === 'UNRESOLVED');
}

/**
 * Aplica resoluções humanas → patch de update (sem fontes).
 * Nunca sobrescreve silenciosamente: só aplica KEEP_EXISTING / USE_IMPORTED resolvidos.
 */
export function applyMergeResolutions(
  conflicts: MergeConflict[]
): AlimentoGlobalUpdateInput {
  if (hasUnresolvedConflicts(conflicts)) {
    throw new Error('Há conflitos UNRESOLVED. Resolva antes de mesclar.');
  }
  const patch: AlimentoGlobalUpdateInput = {};
  for (const c of conflicts) {
    if (c.resolution === 'USE_IMPORTED') {
      (patch as Record<string, unknown>)[c.field] = c.importedValue;
    }
    // KEEP_EXISTING / KEEP_BOTH_IF_SUPPORTED: não altera o campo neste V1
  }
  return patch;
}
