import type { PublicationReadiness } from './constants';
import type { ImportedFoodDraft } from './types';

/** Flags que impedem publicação até correção humana. */
export const BLOCKING_PUBLICATION_FLAGS = [
  'NOME_VAZIO',
  'SEGMENTO_AUSENTE',
  'BASE_DESCONHECIDA',
  'BASE_INCOMPATIVEL',
  'PARSE_INVALIDO',
  'UNIDADE_CRITICA_DESCONHECIDA',
] as const;

function hasBlockingFlag(flags: string[]): boolean {
  return flags.some(
    (f) =>
      (BLOCKING_PUBLICATION_FLAGS as readonly string[]).includes(f) ||
      f.startsWith('VALOR_NEGATIVO:') ||
      f.startsWith('VALOR_IMPOSSIVEL:')
  );
}

/**
 * Calcula readiness de publicação.
 * null em nutriente NÃO bloqueia.
 */
export function computePublicationReadiness(
  draft: Pick<
    ImportedFoodDraft,
    | 'nome'
    | 'segmento'
    | 'segmentoSugerido'
    | 'qualityFlags'
    | 'reviewStatus'
    | 'ignored'
    | 'publicationAction'
    | 'publicationStatus'
    | 'baseQuantidade'
    | 'baseUnidade'
    | 'baseSeguraPara100g'
  >
): PublicationReadiness {
  if (
    draft.ignored ||
    draft.reviewStatus === 'IGNORE' ||
    draft.publicationAction === 'SKIP' ||
    draft.publicationStatus === 'skipped'
  ) {
    return 'IGNORED';
  }

  const flags = draft.qualityFlags || [];
  const nomeOk = Boolean(draft.nome?.trim() && draft.nome !== 'Sem nome');
  const segmentoOk = Boolean(draft.segmento || draft.segmentoSugerido);
  const baseBlocked =
    !draft.baseUnidade ||
    draft.baseQuantidade == null ||
    (!draft.baseSeguraPara100g && flags.includes('BASE_NAO_100G') && !draft.baseSeguraPara100g);

  if (!nomeOk || !segmentoOk || hasBlockingFlag(flags)) {
    return 'BLOCKED';
  }

  // BASE_NAO_100G sozinho → NEEDS_REVIEW (pode publicar com confirmação se unidade resolvida)
  if (baseBlocked && !draft.baseSeguraPara100g && (draft.baseUnidade || '').toLowerCase() !== 'g') {
    return 'BLOCKED';
  }

  if (
    draft.reviewStatus === 'ATTENTION' ||
    draft.reviewStatus === 'REVIEW' ||
    flags.some((f) => f === 'BASE_NAO_100G' || f.startsWith('FORA_FAIXA:') || f === 'SOMA_MACROS_GT_100')
  ) {
    return 'NEEDS_REVIEW';
  }

  return 'READY';
}

export function isSafeForBatchCreate(
  draft: Pick<
    ImportedFoodDraft,
    | 'publicationAction'
    | 'publicationStatus'
    | 'publicationReadiness'
    | 'duplicateCandidate'
    | 'ignored'
    | 'mergeTargetFoodId'
  >
): boolean {
  if (draft.ignored) return false;
  if (draft.publicationStatus === 'published' || draft.publicationStatus === 'skipped') return false;
  if (draft.publicationAction !== 'CREATE') return false;
  if (draft.publicationReadiness !== 'READY') return false;
  if (draft.duplicateCandidate) return false;
  return true;
}
