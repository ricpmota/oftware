import type { ImportedFoodDraft, DuplicateMatchRef } from './types';
import type { ReviewStatusItem } from './constants';
import { CAMPOS_NUTRIENTE_DEDICADOS } from './nutrientFieldMap';

const PLAUSIBLE_MAX_G_PER_100 = 110;
const PLAUSIBLE_MAX_KCAL_PER_100 = 950;

/** Alimento só entra na lista se tiver ≥1 valor nutricional (canônico ou extra). Zero conta. */
export function foodDraftHasNutrientData(
  draft: Pick<ImportedFoodDraft, 'nutrientesExtras'> & Record<string, unknown>
): boolean {
  for (const field of CAMPOS_NUTRIENTE_DEDICADOS) {
    const v = draft[field];
    if (typeof v === 'number' && Number.isFinite(v)) return true;
  }
  const extras = Array.isArray(draft.nutrientesExtras) ? draft.nutrientesExtras : [];
  for (const ex of extras) {
    if (!ex || typeof ex !== 'object') continue;
    const valor = (ex as { valor?: unknown }).valor;
    if (typeof valor === 'number' && Number.isFinite(valor)) return true;
  }
  return false;
}

export function validateImportedFoodDraft(
  draft: Omit<
    ImportedFoodDraft,
    'qualityFlags' | 'reviewStatus' | 'duplicateCandidate' | 'duplicateMatches'
  > &
    Partial<Pick<ImportedFoodDraft, 'duplicateCandidate' | 'duplicateMatches'>>
): {
  qualityFlags: string[];
  reviewStatus: ReviewStatusItem;
} {
  const flags: string[] = [];

  if (!draft.nome?.trim() || draft.nome === 'Sem nome') {
    flags.push('NOME_VAZIO');
  }
  if (!draft.segmento && !draft.segmentoSugerido) {
    flags.push('SEGMENTO_AUSENTE');
  }
  if (draft.segmentoSugerido == null && draft.segmentoConfidence != null && draft.segmentoConfidence < 0.55) {
    flags.push('SEGMENTO_BAIXA_CONFIANCA');
  }
  if (draft.segmentoConfidence != null && draft.segmentoConfidence < 0.55) {
    flags.push('SEGMENTO_BAIXA_CONFIANCA');
  }
  if (!draft.baseUnidade || draft.baseQuantidade == null) {
    flags.push('BASE_DESCONHECIDA');
  } else if (!draft.baseSeguraPara100g) {
    flags.push('BASE_NAO_100G');
  }

  const macros: Array<[string, number | null | undefined]> = [
    ['proteinasG', draft.proteinasG],
    ['carboidratosG', draft.carboidratosG],
    ['gordurasTotaisG', draft.gordurasTotaisG],
    ['fibrasG', draft.fibrasG],
  ];
  for (const [key, val] of macros) {
    if (val != null && val < 0) flags.push(`VALOR_NEGATIVO:${key}`);
    if (val != null && val > PLAUSIBLE_MAX_G_PER_100) flags.push(`FORA_FAIXA:${key}`);
  }
  if (draft.energiaKcal != null && draft.energiaKcal < 0) flags.push('VALOR_NEGATIVO:energiaKcal');
  if (draft.energiaKcal != null && draft.energiaKcal > PLAUSIBLE_MAX_KCAL_PER_100) {
    flags.push('FORA_FAIXA:energiaKcal');
  }

  if (draft.baseSeguraPara100g) {
    const sum =
      (draft.proteinasG || 0) +
      (draft.carboidratosG || 0) +
      (draft.gordurasTotaisG || 0) +
      (draft.fibrasG || 0);
    const anyMacro =
      draft.proteinasG != null ||
      draft.carboidratosG != null ||
      draft.gordurasTotaisG != null ||
      draft.fibrasG != null;
    if (anyMacro && sum > 105) {
      flags.push('SOMA_MACROS_GT_100');
    }
  }

  // Decimal suspeito: original numérico com campo mapeado null
  for (const [k, orig] of Object.entries(draft.valoresOriginais || {})) {
    if (orig && orig.trim() && /[0-9]/.test(orig)) {
      const mappedKeys = [
        'energiaKcal',
        'proteinasG',
        'carboidratosG',
        'gordurasTotaisG',
        'fibrasG',
      ] as const;
      if ((mappedKeys as readonly string[]).includes(k)) {
        const fieldVal = draft[k as (typeof mappedKeys)[number]];
        if (fieldVal == null) {
          flags.push(`PARSE_FALHOU:${k}`);
        }
      }
    }
  }

  if (draft.extractionConfidence != null && draft.extractionConfidence < 0.5) {
    flags.push('BAIXA_CONFIANCA_EXTRACAO');
  }

  if (draft.duplicateCandidate) {
    flags.push('DUPLICATA_CANDIDATA');
  }

  const unique = [...new Set(flags)];
  let reviewStatus: ReviewStatusItem = 'OK';
  const hard = unique.some((f) =>
    f.startsWith('NOME_VAZIO') ||
    f.startsWith('PARSE_FALHOU') ||
    f === 'BASE_DESCONHECIDA' ||
    f.startsWith('VALOR_NEGATIVO')
  );
  const soft = unique.some((f) =>
    f === 'SEGMENTO_AUSENTE' ||
    f === 'SEGMENTO_BAIXA_CONFIANCA' ||
    f === 'BASE_NAO_100G' ||
    f === 'SOMA_MACROS_GT_100' ||
    f === 'DUPLICATA_CANDIDATA' ||
    f === 'BAIXA_CONFIANCA_EXTRACAO' ||
    f.startsWith('FORA_FAIXA')
  );
  if (hard) reviewStatus = 'REVIEW';
  else if (soft) reviewStatus = 'ATTENTION';

  return { qualityFlags: unique, reviewStatus };
}

export function applyValidationAndDuplicates(
  draft: Omit<
    ImportedFoodDraft,
    'qualityFlags' | 'reviewStatus' | 'duplicateCandidate' | 'duplicateMatches'
  >,
  matches: DuplicateMatchRef[]
): ImportedFoodDraft {
  const duplicateCandidate = matches.length > 0;
  const withDup = { ...draft, duplicateCandidate, duplicateMatches: matches };
  const { qualityFlags, reviewStatus } = validateImportedFoodDraft(withDup);
  return {
    ...draft,
    duplicateCandidate,
    duplicateMatches: matches,
    qualityFlags,
    reviewStatus,
  };
}
