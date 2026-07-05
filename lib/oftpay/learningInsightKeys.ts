/**
 * Chaves estáveis para agrupamento de insights de aprendizado (sem depender do texto da recomendação).
 * Mantido em módulo separado para evitar import circular entre laudoCaseArchive e learningInsights.
 */

export type LearningInsightKeyType = 'error_pattern' | 'success_pattern' | 'uncertainty_pattern';

export type LearningInsightKeyDomain = 'glaucoma' | 'retina' | 'cornea';

/** Normaliza `condition` para identidade estável (não usa `recommendation`). */
export function normalizeLearningInsightCondition(condition: string | null | undefined): string {
  if (typeof condition !== 'string' || !condition.trim()) return '';
  return condition
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024f\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

/**
 * Chave estável `sk1:` + tipo + exame + domínio + condição normalizada.
 * Sem `condition` (registros antigos / metadados incompletos) usa sentinel `__nocond__` — alinhar com `buildLegacyLearningInsightGroupingKey` para histórico quando não houver condição.
 */
export function buildStableLearningInsightKey(params: {
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
  const cond = normalizeLearningInsightCondition(params.condition);
  const condPart = cond.length > 0 ? cond : '__nocond__';
  return `sk1:${params.type}|${exam}|${domain}|${condPart}`;
}

/** Formato legado usado antes da ETAPA 27 (compatível com impact records sem stableKey). */
export function buildLegacyLearningInsightGroupingKey(params: {
  type: LearningInsightKeyType;
  relatedExamType?: string | null;
  relatedDomain?: LearningInsightKeyDomain | null;
}): string {
  const exam =
    typeof params.relatedExamType === 'string' && params.relatedExamType.trim()
      ? params.relatedExamType.trim().toLowerCase()
      : 'all_exam_types';
  const domain =
    typeof params.relatedDomain === 'string' && params.relatedDomain.trim()
      ? params.relatedDomain.trim().toLowerCase()
      : 'all_domains';
  return `${params.type}::${exam}::${domain}`;
}
