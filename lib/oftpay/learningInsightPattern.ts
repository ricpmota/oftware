/**
 * Identidade lógica (patternId) para insights de aprendizado — menos dependente do wording da `condition`.
 * Heurística leve, revisável, sem NLP pesado.
 */

import type { LearningInsightKeyDomain, LearningInsightKeyType } from '@/lib/oftpay/learningInsightKeys';

export type LearningInsightConditionCategory =
  | 'review_status_disagree'
  | 'low_extraction_reliability'
  | 'multi_domain_ambiguity'
  | 'exam_type_high_disagree'
  | 'domain_axis_high_agree'
  | 'sample_partial_disagree_frequent'
  | 'vf_low_reliability'
  | 'unclassified'
  | 'nocond';

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Texto em minúsculas sem acentos, para matching heurístico. */
function foldForMatch(condition: string): string {
  return stripDiacritics(condition.trim().toLowerCase().normalize('NFD')).replace(/ç/g, 'c');
}

/**
 * Mapeia a `condition` para uma categoria lógica estável (várias formulações → mesmo token).
 */
export function categorizeLearningInsightCondition(condition: string | null | undefined): LearningInsightConditionCategory {
  if (typeof condition !== 'string' || !condition.trim()) return 'nocond';
  const t = foldForMatch(condition);

  if (t.includes('reviewstatus') || (t.includes('review') && t.includes('discord'))) {
    return 'review_status_disagree';
  }
  if (
    (t.includes('multiplos') && t.includes('dominios')) ||
    (t.includes('ambiguidade') && (t.includes('conflito') || t.includes('dominios')))
  ) {
    return 'multi_domain_ambiguity';
  }
  if (
    (t.includes('campimetria') ||
      t.includes('campo visual') ||
      t.includes('perimetria') ||
      t.includes('perimetr') ||
      t.includes('perime')) &&
    (t.includes('confiav') ||
      t.includes('confiab') ||
      t.includes('confiavel') ||
      t.includes('limitad') ||
      t.includes('pouco confiavel'))
  ) {
    return 'vf_low_reliability';
  }
  if (
    t.includes('baixa confiabilidade') ||
    t.includes('possible_ocr') ||
    t.includes('interpretabilidade') ||
    (t.includes('extracao') && t.includes('discord'))
  ) {
    return 'low_extraction_reliability';
  }
  if (t.includes('taxa de discordancia acima') || t.includes('discordancia acima do esperado')) {
    return 'exam_type_high_disagree';
  }
  if (
    (t.includes('eixo') && t.includes('boa taxa')) ||
    (t.includes('eixo') && t.includes('concordancia medica'))
  ) {
    return 'domain_axis_high_agree';
  }
  if (t.includes('concordancia parcial') || t.includes('discordancia frequente')) {
    return 'sample_partial_disagree_frequent';
  }

  return 'unclassified';
}

/**
 * Identificador lógico do padrão clínico (independente de pequenas mudanças de redação na `condition` dentro da mesma categoria).
 */
export function buildLearningInsightPatternId(params: {
  type: LearningInsightKeyType;
  relatedExamType?: string | null;
  relatedDomain?: LearningInsightKeyDomain | null;
  condition?: string | null;
}): string {
  const exam =
    typeof params.relatedExamType === 'string' && params.relatedExamType.trim()
      ? params.relatedExamType.trim().toLowerCase()
      : 'all_exam_types';
  const domain =
    typeof params.relatedDomain === 'string' && params.relatedDomain.trim()
      ? params.relatedDomain.trim().toLowerCase()
      : 'all_domains';
  const cat = categorizeLearningInsightCondition(params.condition ?? null);
  return `pid1:${params.type}|${exam}|${domain}|${cat}`;
}
