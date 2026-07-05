import type { LearningImpactRecord } from '@/lib/oftpay/laudoCaseArchive';
import {
  aggregateLearningImpact,
  buildLearningEffectivenessSummary,
  type LearningEffectivenessStatus,
  type LearningImpactAggregationFilters,
  type LearningInsightEffectiveness,
} from '@/lib/oftpay/learningEffectiveness';
import type { LearningInsightStabilityStatus, LearningInsightType } from '@/lib/oftpay/learningInsights';

/** Campos expostos ao painel técnico (sem texto clínico livre nem identificadores de caso). */
export type OftpayLearningInsightRow = {
  patternIdOrKey: string;
  type: LearningInsightType;
  relatedDomain: 'glaucoma' | 'retina' | 'cornea' | null;
  relatedExamType: string | null;
  totalUses: number;
  agreeRate: number;
  partialRate: number;
  disagreeRate: number;
  effectivenessStatus: LearningEffectivenessStatus;
  stabilityStatus: LearningInsightStabilityStatus;
  recentUses: number;
  recentAgreeRate: number;
};

export type OftpayLearningInsightsAdminPayload = {
  generatedAt: number;
  impactRecordsLoaded: number;
  summary: {
    totalInsights: number;
    promisingCount: number;
    mixedCount: number;
    weakSignalCount: number;
    insufficientDataCount: number;
    notes: string[];
  };
  topPromising: OftpayLearningInsightRow[];
  weakeningSignals: OftpayLearningInsightRow[];
  lowDataSignals: OftpayLearningInsightRow[];
  filtersApplied: {
    aggregation: LearningImpactAggregationFilters;
    post: {
      effectivenessStatus?: LearningEffectivenessStatus;
      stabilityStatus?: LearningInsightStabilityStatus;
    };
  };
};

export type BuildOftpayLearningInsightsAdminParams = {
  nowMs?: number;
  /** Repasse opcional (ex.: `minVolume` menor em testes). */
  minVolume?: number;
  aggregationFilters?: LearningImpactAggregationFilters;
  postFilters?: {
    effectivenessStatus?: LearningEffectivenessStatus;
    stabilityStatus?: LearningInsightStabilityStatus;
  };
  /** Limite de linhas por bloco (evita payloads grandes). */
  listLimit?: number;
  /** Tamanho do “top” dentro do resumo numérico (top promissores / fracos no summary interno). */
  summaryTopN?: number;
};

function toRow(e: LearningInsightEffectiveness): OftpayLearningInsightRow {
  return {
    patternIdOrKey: e.insightKey,
    type: e.type,
    relatedDomain: e.relatedDomain,
    relatedExamType: e.relatedExamType,
    totalUses: e.totalUses,
    agreeRate: e.agreeRate,
    partialRate: e.partialRate,
    disagreeRate: e.disagreeRate,
    effectivenessStatus: e.effectivenessStatus,
    stabilityStatus: e.stabilityStatus,
    recentUses: e.recentUses,
    recentAgreeRate: e.recentAgreeRate,
  };
}

function applyPostFilters(
  items: LearningInsightEffectiveness[],
  post?: BuildOftpayLearningInsightsAdminParams['postFilters']
): LearningInsightEffectiveness[] {
  if (!post) return items;
  return items.filter((x) => {
    if (post.effectivenessStatus && x.effectivenessStatus !== post.effectivenessStatus) return false;
    if (post.stabilityStatus && x.stabilityStatus !== post.stabilityStatus) return false;
    return true;
  });
}

/**
 * Agrega impactos globais anonimizados e monta o payload do painel técnico (sem dados privados de caso).
 */
export function buildOftpayLearningInsightsAdminPayload(
  records: LearningImpactRecord[],
  params: BuildOftpayLearningInsightsAdminParams = {}
): OftpayLearningInsightsAdminPayload {
  const listLimit = Math.min(40, Math.max(5, params.listLimit ?? 15));
  const summaryTopN = Math.min(20, Math.max(3, params.summaryTopN ?? 10));
  const aggregated = aggregateLearningImpact(records, {
    nowMs: params.nowMs,
    filters: params.aggregationFilters,
    ...(typeof params.minVolume === 'number' ? { minVolume: params.minVolume } : {}),
  });
  const filtered = applyPostFilters(aggregated, params.postFilters);
  const summary = buildLearningEffectivenessSummary(filtered, summaryTopN);

  const topPromising = summary.topPromising.slice(0, listLimit).map(toRow);

  const weakeningSignals = filtered
    .filter(
      (e) =>
        e.effectivenessStatus === 'weak_signal' ||
        e.stabilityStatus === 'recently_weakening' ||
        e.stabilityStatus === 'volatile'
    )
    .sort((a, b) => b.totalUses - a.totalUses || b.disagreeRate - a.disagreeRate)
    .slice(0, listLimit)
    .map(toRow);

  const lowDataSignals = filtered
    .filter(
      (e) =>
        e.effectivenessStatus === 'insufficient_data' || e.stabilityStatus === 'insufficient_recent_data'
    )
    .sort((a, b) => a.recentUses - b.recentUses || a.totalUses - b.totalUses)
    .slice(0, listLimit)
    .map(toRow);

  return {
    generatedAt: typeof params.nowMs === 'number' ? params.nowMs : Date.now(),
    impactRecordsLoaded: records.length,
    summary: {
      totalInsights: summary.totalInsights,
      promisingCount: summary.promisingCount,
      mixedCount: summary.mixedCount,
      weakSignalCount: summary.weakSignalCount,
      insufficientDataCount: summary.insufficientDataCount,
      notes: summary.notes,
    },
    topPromising,
    weakeningSignals,
    lowDataSignals,
    filtersApplied: {
      aggregation: { ...(params.aggregationFilters ?? {}) },
      post: {
        ...(params.postFilters?.effectivenessStatus
          ? { effectivenessStatus: params.postFilters.effectivenessStatus }
          : {}),
        ...(params.postFilters?.stabilityStatus ? { stabilityStatus: params.postFilters.stabilityStatus } : {}),
      },
    },
  };
}

const ADMIN_FILTER_DOMAINS = new Set(['glaucoma', 'retina', 'cornea']);

const ADMIN_EFF_STATUSES = new Set<LearningEffectivenessStatus>([
  'promising',
  'mixed',
  'weak_signal',
  'insufficient_data',
]);

const ADMIN_STAB_STATUSES = new Set<LearningInsightStabilityStatus>([
  'stable_positive',
  'recently_improving',
  'volatile',
  'recently_weakening',
  'insufficient_recent_data',
]);

/** Parser compartilhado com GET `/api/metaadmingeral/oftpay/learning-insights` (testável). */
export function parseOftpayLearningInsightsUrlFilters(searchParams: URLSearchParams): {
  aggregation: LearningImpactAggregationFilters;
  post: {
    effectivenessStatus?: LearningEffectivenessStatus;
    stabilityStatus?: LearningInsightStabilityStatus;
  };
} {
  const aggregation: LearningImpactAggregationFilters = {};
  const post: {
    effectivenessStatus?: LearningEffectivenessStatus;
    stabilityStatus?: LearningInsightStabilityStatus;
  } = {};

  const domain = searchParams.get('relatedDomain')?.trim().toLowerCase();
  if (domain && ADMIN_FILTER_DOMAINS.has(domain)) {
    aggregation.relatedDomain = domain as LearningImpactAggregationFilters['relatedDomain'];
  }

  const exam = searchParams.get('relatedExamType')?.trim();
  if (exam) {
    aggregation.relatedExamType = exam;
  }

  const eff = searchParams.get('effectivenessStatus')?.trim() as LearningEffectivenessStatus | undefined;
  if (eff && ADMIN_EFF_STATUSES.has(eff)) {
    post.effectivenessStatus = eff;
  }

  const stab = searchParams.get('stabilityStatus')?.trim() as LearningInsightStabilityStatus | undefined;
  if (stab && ADMIN_STAB_STATUSES.has(stab)) {
    post.stabilityStatus = stab;
  }

  return { aggregation, post };
}
