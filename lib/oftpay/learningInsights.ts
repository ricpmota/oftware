import type { LaudoLearningRecord } from '@/lib/oftpay/laudoCaseArchive';
import { buildStableLearningInsightKey } from '@/lib/oftpay/learningInsightKeys';
import { buildLearningInsightPatternId } from '@/lib/oftpay/learningInsightPattern';

export type LearningInsightType = 'error_pattern' | 'success_pattern' | 'uncertainty_pattern';

/** Sinal interno de recência/estabilidade (ETAPA 26); opcional e sem uso em UI obrigatório. */
export type LearningInsightStabilityStatus =
  | 'stable_positive'
  | 'recently_improving'
  | 'volatile'
  | 'recently_weakening'
  | 'insufficient_recent_data';

export type LearningInsightStabilityMeta = {
  status: LearningInsightStabilityStatus;
  recentUses: number;
  recentAgreeRate: number;
  recentPartialRate: number;
  recentDisagreeRate: number;
  intermediateUses: number;
  intermediateAgreeRate: number;
  intermediatePartialRate: number;
  intermediateDisagreeRate: number;
};

export type LearningInsight = {
  type: LearningInsightType;
  relatedExamType?: string | null;
  relatedDomain?: 'glaucoma' | 'retina' | 'cornea' | null;
  condition: string;
  recommendation: string;
  /**
   * Identidade estável para agrupamento com feedback (ETAPA 27);
   * não depende do texto de `recommendation`.
   */
  stableKey?: string;
  /** Identidade lógica do padrão clínico (ETAPA 28); menos sensível ao wording da `condition`. */
  patternId?: string;
  /** Metadados leves para rastreio interno; não altera o texto da recomendação. */
  stability?: LearningInsightStabilityMeta;
};

/** Atribui `stableKey` e `patternId` a cada insight. */
export function assignStableKeysToInsights(insights: LearningInsight[]): LearningInsight[] {
  if (!Array.isArray(insights)) return [];
  return insights.map((insight) => ({
    ...insight,
    stableKey: buildStableLearningInsightKey({
      type: insight.type,
      relatedExamType: insight.relatedExamType ?? null,
      relatedDomain: insight.relatedDomain ?? null,
      condition: insight.condition,
    }),
    patternId: buildLearningInsightPatternId({
      type: insight.type,
      relatedExamType: insight.relatedExamType ?? null,
      relatedDomain: insight.relatedDomain ?? null,
      condition: insight.condition,
    }),
  }));
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return part / total;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function analyzeLearningPatterns(records: LaudoLearningRecord[]): LearningInsight[] {
  if (!Array.isArray(records) || records.length < 8) return [];
  const insights: LearningInsight[] = [];
  const disagreements = records.filter((r) => r.doctorAgreement === 'disagree').length;
  const partials = records.filter((r) => r.doctorAgreement === 'partial').length;

  const reviewCases = records.filter((r) => r.reviewStatus === 'review');
  const reviewDisagree = reviewCases.filter((r) => r.doctorAgreement === 'disagree').length;
  if (reviewCases.length >= 6 && pct(reviewDisagree, reviewCases.length) >= 0.35) {
    insights.push({
      type: 'error_pattern',
      condition: 'Casos com reviewStatus=review mostram maior discordância médica.',
      recommendation:
        'Reduzir assertividade quando reviewStatus=review e explicitar necessidade de revisão manual.',
    });
  }

  const lowQualityCases = records.filter(
    (r) =>
      r.qualityFlags.includes('possible_ocr_issue') ||
      r.qualityFlags.includes('limited_interpretability') ||
      r.reviewStatus === 'review'
  );
  const lowQualityDisagree = lowQualityCases.filter((r) => r.doctorAgreement === 'disagree').length;
  if (lowQualityCases.length >= 6 && pct(lowQualityDisagree, lowQualityCases.length) >= 0.3) {
    insights.push({
      type: 'uncertainty_pattern',
      condition: 'Baixa confiabilidade de extração associa-se a maior discordância.',
      recommendation:
        'Em baixa confiabilidade, priorizar linguagem prudente e reduzir inferências definitivas.',
    });
  }

  const multiDomainCases = records.filter((r) => r.domainsActive.length >= 2);
  const multiDomainAmbiguous = multiDomainCases.filter((r) => r.hasAmbiguity || r.hasDomainConflict).length;
  if (multiDomainCases.length >= 6 && pct(multiDomainAmbiguous, multiDomainCases.length) >= 0.4) {
    insights.push({
      type: 'uncertainty_pattern',
      condition: 'Múltiplos domínios ativos elevam ambiguidades e conflitos.',
      recommendation:
        'Quando houver múltiplos domínios, manter prudência na hierarquização e explicitar eixo principal provisório.',
    });
  }

  const examTypes = uniq(records.flatMap((r) => r.examTypes));
  for (const examType of examTypes) {
    const group = records.filter((r) => r.examTypes.includes(examType));
    if (group.length < 8) continue;
    const disagreeRate = pct(group.filter((r) => r.doctorAgreement === 'disagree').length, group.length);
    if (disagreeRate >= 0.3) {
      insights.push({
        type: 'error_pattern',
        relatedExamType: examType,
        condition: `${examType} apresenta taxa de discordância acima do esperado.`,
        recommendation:
          `No contexto de ${examType}, reforçar limitações e correlacionar com contexto clínico complementar antes de priorizar conclusões.`,
      });
    }
  }

  const domainList: Array<'glaucoma' | 'retina' | 'cornea'> = ['glaucoma', 'retina', 'cornea'];
  for (const domain of domainList) {
    const group = records.filter((r) => r.domainsActive.includes(domain));
    if (group.length < 8) continue;
    const agreeRate = pct(group.filter((r) => r.doctorAgreement === 'agree').length, group.length);
    if (agreeRate >= 0.6) {
      insights.push({
        type: 'success_pattern',
        relatedDomain: domain,
        condition: `Eixo ${domain} mostra boa taxa de concordância médica.`,
        recommendation:
          `No eixo ${domain}, manter correlação estruturada atual e preservar explicitação de limitações remanescentes.`,
      });
    }
  }

  if (partials + disagreements >= Math.max(10, Math.floor(records.length * 0.4))) {
    insights.push({
      type: 'uncertainty_pattern',
      condition: 'Concordância parcial/discordância frequente na amostra recente.',
      recommendation:
        'Manter recomendações condicionais e enfatizar hipóteses compatíveis em vez de conclusões fechadas.',
    });
  }

  return insights;
}

export function buildLearningContext(insights: LearningInsight[], maxInsights = 5): string {
  if (!Array.isArray(insights) || insights.length === 0) return '';
  const capped = insights.slice(0, Math.max(1, maxInsights));
  const lines = capped.map((insight) => `- ${insight.recommendation}`);
  return `APRENDIZADO_DO_SISTEMA:\n${lines.join('\n')}`;
}
