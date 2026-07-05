import type { LearningImpactRecord } from '@/lib/oftpay/laudoCaseArchive';
import {
  buildLegacyLearningInsightGroupingKey,
  buildStableLearningInsightKey,
} from '@/lib/oftpay/learningInsightKeys';
import { buildLearningInsightPatternId } from '@/lib/oftpay/learningInsightPattern';
import {
  buildLearningContext,
  type LearningInsight,
  type LearningInsightStabilityMeta,
  type LearningInsightStabilityStatus,
  type LearningInsightType,
} from '@/lib/oftpay/learningInsights';

/** Compatível com agregações pré-ETAPA 27 (`type::exam::domain`). */
export { buildLegacyLearningInsightGroupingKey as buildLearningInsightKey } from '@/lib/oftpay/learningInsightKeys';

export type LearningEffectivenessStatus =
  | 'promising'
  | 'mixed'
  | 'weak_signal'
  | 'insufficient_data';

export type LearningInsightEffectiveness = {
  insightKey: string;
  type: LearningInsightType;
  relatedExamType: string | null;
  relatedDomain: 'glaucoma' | 'retina' | 'cornea' | null;
  totalUses: number;
  agreeCount: number;
  partialCount: number;
  disagreeCount: number;
  agreeRate: number;
  partialRate: number;
  disagreeRate: number;
  effectivenessStatus: LearningEffectivenessStatus;
  /** Janela ~30 dias (recência). */
  recentUses: number;
  recentAgreeRate: number;
  recentPartialRate: number;
  recentDisagreeRate: number;
  /** Janela ~90 dias (contexto intermediário). */
  intermediateUses: number;
  intermediateAgreeRate: number;
  intermediatePartialRate: number;
  intermediateDisagreeRate: number;
  stabilityStatus: LearningInsightStabilityStatus;
};

export type LearningImpactAggregationFilters = {
  relatedDomain?: 'glaucoma' | 'retina' | 'cornea';
  relatedExamType?: string;
  insightType?: LearningInsightType;
};

export type LearningImpactAggregationOptions = {
  minVolume?: number;
  filters?: LearningImpactAggregationFilters;
  /** Para testes determinísticos; padrão `Date.now()`. */
  nowMs?: number;
};

export type LearningEffectivenessSummary = {
  totalInsights: number;
  promisingCount: number;
  mixedCount: number;
  weakSignalCount: number;
  insufficientDataCount: number;
  topPromising: LearningInsightEffectiveness[];
  topWeakSignals: LearningInsightEffectiveness[];
  notes: string[];
};

type InsightWindowCounts = {
  uses: number;
  agreeCount: number;
  partialCount: number;
  disagreeCount: number;
};

type FullInsightCounts = {
  type: LearningInsightType;
  relatedExamType: string | null;
  relatedDomain: 'glaucoma' | 'retina' | 'cornea' | null;
  all: InsightWindowCounts;
  w30: InsightWindowCounts;
  w90: InsightWindowCounts;
};

export type LearningInsightPrioritizationContext = {
  currentExamTypes?: string[];
  currentDomains?: Array<'glaucoma' | 'retina' | 'cornea'>;
  maxInsights?: number;
};

type LearningInsightPriorityCandidate = {
  insight: LearningInsight;
  effectiveness?: LearningInsightEffectiveness;
  relevanceScore: number;
  priorityScore: number;
};

const MS_PER_DAY = 86_400_000;
const WINDOW_30_MS = 30 * MS_PER_DAY;
const WINDOW_90_MS = 90 * MS_PER_DAY;

/** Volume mínimo na janela recente para classificar estabilidade além de `insufficient_recent_data`. */
const MIN_RECENT_FOR_STABILITY_SIGNAL = 5;
const MIN_INTERMEDIATE_FOR_GAP = 5;

function emptyWindow(): InsightWindowCounts {
  return { uses: 0, agreeCount: 0, partialCount: 0, disagreeCount: 0 };
}

function asRate(count: number, total: number): number {
  if (!total) return 0;
  return Number((count / total).toFixed(3));
}

function resolveImpactAggregationKey(
  insight: LearningImpactRecord['insightsUsed'][number]
): string {
  if (typeof insight.patternId === 'string' && insight.patternId.trim()) {
    return insight.patternId.trim();
  }
  if (typeof insight.stableKey === 'string' && insight.stableKey.trim()) {
    return insight.stableKey.trim();
  }
  return buildLegacyLearningInsightGroupingKey({
    type: insight.type,
    relatedExamType: insight.relatedExamType ?? null,
    relatedDomain: insight.relatedDomain ?? null,
  });
}

function lookupEffectivenessForInsight(
  insight: LearningInsight,
  map: Map<string, LearningInsightEffectiveness>
): LearningInsightEffectiveness | undefined {
  const keys: string[] = [];
  if (insight.patternId?.trim()) keys.push(insight.patternId.trim());
  keys.push(
    buildLearningInsightPatternId({
      type: insight.type,
      relatedExamType: insight.relatedExamType ?? null,
      relatedDomain: insight.relatedDomain ?? null,
      condition: insight.condition,
    })
  );
  if (insight.stableKey?.trim()) keys.push(insight.stableKey.trim());
  keys.push(
    buildStableLearningInsightKey({
      type: insight.type,
      relatedExamType: insight.relatedExamType ?? null,
      relatedDomain: insight.relatedDomain ?? null,
      condition: insight.condition,
    })
  );
  keys.push(
    buildLegacyLearningInsightGroupingKey({
      type: insight.type,
      relatedExamType: insight.relatedExamType ?? null,
      relatedDomain: insight.relatedDomain ?? null,
    })
  );
  const seen = new Set<string>();
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const hit = map.get(k);
    if (hit) return hit;
  }
  return undefined;
}

function bumpAgreement(target: InsightWindowCounts, agreement: LearningImpactRecord['doctorAgreement']) {
  target.uses += 1;
  if (agreement === 'agree') target.agreeCount += 1;
  else if (agreement === 'partial') target.partialCount += 1;
  else target.disagreeCount += 1;
}

function resolveStatus(
  counts: InsightWindowCounts,
  minVolume: number
): LearningInsightEffectiveness['effectivenessStatus'] {
  const agreeRate = asRate(counts.agreeCount, counts.uses);
  const partialRate = asRate(counts.partialCount, counts.uses);
  const disagreeRate = asRate(counts.disagreeCount, counts.uses);

  if (counts.uses < minVolume) return 'insufficient_data';
  if (disagreeRate >= 0.4 || agreeRate < 0.35) return 'weak_signal';
  if (agreeRate >= 0.6 && disagreeRate <= 0.2) return 'promising';
  if (partialRate >= 0.35 || (agreeRate >= 0.35 && disagreeRate >= 0.2)) return 'mixed';
  return 'mixed';
}

function matchesFilters(
  insight: LearningImpactRecord['insightsUsed'][number],
  filters?: LearningImpactAggregationFilters
): boolean {
  if (!filters) return true;
  if (filters.insightType && insight.type !== filters.insightType) return false;
  if (filters.relatedDomain && insight.relatedDomain !== filters.relatedDomain) return false;
  if (filters.relatedExamType && insight.relatedExamType !== filters.relatedExamType) return false;
  return true;
}

/**
 * Avalia estabilidade/recência com heurística leve (não é inferência estatística).
 */
export function evaluateLearningInsightStability(params: {
  allUses: number;
  agreeRate: number;
  partialRate: number;
  disagreeRate: number;
  recent: InsightWindowCounts;
  intermediate: InsightWindowCounts;
}): LearningInsightStabilityStatus {
  const recentUses = params.recent.uses;
  const recentAgreeRate = asRate(params.recent.agreeCount, recentUses);
  const recentPartialRate = asRate(params.recent.partialCount, recentUses);
  const recentDisagreeRate = asRate(params.recent.disagreeCount, recentUses);

  const intermediateUses = params.intermediate.uses;
  const intermediateAgreeRate = asRate(params.intermediate.agreeCount, intermediateUses);
  const intermediatePartialRate = asRate(params.intermediate.partialCount, intermediateUses);
  const intermediateDisagreeRate = asRate(params.intermediate.disagreeCount, intermediateUses);

  if (recentUses < MIN_RECENT_FOR_STABILITY_SIGNAL) {
    return 'insufficient_recent_data';
  }

  const enoughIntermediate = intermediateUses >= MIN_INTERMEDIATE_FOR_GAP;

  if (
    enoughIntermediate &&
    (recentAgreeRate + 0.12 < params.agreeRate ||
      recentDisagreeRate > params.disagreeRate + 0.12)
  ) {
    return 'recently_weakening';
  }

  if (
    enoughIntermediate &&
    recentAgreeRate > params.agreeRate + 0.1 &&
    recentDisagreeRate + 0.05 < params.disagreeRate
  ) {
    return 'recently_improving';
  }

  if (recentUses >= MIN_RECENT_FOR_STABILITY_SIGNAL) {
    const gap30vs90 =
      intermediateUses >= MIN_INTERMEDIATE_FOR_GAP
        ? Math.abs(recentAgreeRate - intermediateAgreeRate)
        : 0;
    const disagreeGapOk =
      intermediateUses >= MIN_INTERMEDIATE_FOR_GAP
        ? Math.abs(recentDisagreeRate - intermediateDisagreeRate) > 0.22
        : false;
    if (
      (recentPartialRate >= 0.35 && recentDisagreeRate >= 0.18) ||
      gap30vs90 > 0.22 ||
      disagreeGapOk
    ) {
      return 'volatile';
    }
  }

  if (recentAgreeRate >= 0.55 && recentDisagreeRate <= 0.28) {
    return 'stable_positive';
  }

  if (recentDisagreeRate > 0.35) {
    return 'volatile';
  }

  return 'stable_positive';
}

function stabilityMetaFromEffectiveness(eff: LearningInsightEffectiveness): LearningInsightStabilityMeta {
  return {
    status: eff.stabilityStatus,
    recentUses: eff.recentUses,
    recentAgreeRate: eff.recentAgreeRate,
    recentPartialRate: eff.recentPartialRate,
    recentDisagreeRate: eff.recentDisagreeRate,
    intermediateUses: eff.intermediateUses,
    intermediateAgreeRate: eff.intermediateAgreeRate,
    intermediatePartialRate: eff.intermediatePartialRate,
    intermediateDisagreeRate: eff.intermediateDisagreeRate,
  };
}

export function attachStabilityToInsights(
  insights: LearningInsight[],
  effectiveness: LearningInsightEffectiveness[]
): LearningInsight[] {
  const map = new Map<string, LearningInsightEffectiveness>();
  for (const e of effectiveness) {
    map.set(e.insightKey, e);
  }
  return insights.map((insight) => {
    const eff = lookupEffectivenessForInsight(insight, map);
    if (!eff) return { ...insight };
    return { ...insight, stability: stabilityMetaFromEffectiveness(eff) };
  });
}

export function aggregateLearningImpact(
  records: LearningImpactRecord[],
  options: LearningImpactAggregationOptions = {}
): LearningInsightEffectiveness[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const minVolume = Math.max(1, options.minVolume ?? 5);
  const nowMs = typeof options.nowMs === 'number' ? options.nowMs : Date.now();
  const cutoff30 = nowMs - WINDOW_30_MS;
  const cutoff90 = nowMs - WINDOW_90_MS;

  const map = new Map<string, FullInsightCounts>();

  for (const record of records) {
    if (!record || !Array.isArray(record.insightsUsed)) continue;
    const ts =
      typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
        ? record.createdAt
        : nowMs;
    const in90 = ts >= cutoff90;
    const in30 = ts >= cutoff30;

    for (const insight of record.insightsUsed) {
      if (!matchesFilters(insight, options.filters)) continue;

      const relatedExamType = insight.relatedExamType ?? null;
      const relatedDomain = insight.relatedDomain ?? null;
      const key = resolveImpactAggregationKey(insight);

      const base =
        map.get(key) ??
        ({
          type: insight.type,
          relatedExamType,
          relatedDomain,
          all: emptyWindow(),
          w30: emptyWindow(),
          w90: emptyWindow(),
        } satisfies FullInsightCounts);

      bumpAgreement(base.all, record.doctorAgreement);
      if (in90) bumpAgreement(base.w90, record.doctorAgreement);
      if (in30) bumpAgreement(base.w30, record.doctorAgreement);

      map.set(key, base);
    }
  }

  return Array.from(map.entries())
    .map(([insightKey, row]) => {
      const effectivenessStatus = resolveStatus(row.all, minVolume);
      const agreeRate = asRate(row.all.agreeCount, row.all.uses);
      const partialRate = asRate(row.all.partialCount, row.all.uses);
      const disagreeRate = asRate(row.all.disagreeCount, row.all.uses);

      const recentUses = row.w30.uses;
      const recentAgreeRate = asRate(row.w30.agreeCount, recentUses);
      const recentPartialRate = asRate(row.w30.partialCount, recentUses);
      const recentDisagreeRate = asRate(row.w30.disagreeCount, recentUses);

      const intermediateUses = row.w90.uses;
      const intermediateAgreeRate = asRate(row.w90.agreeCount, intermediateUses);
      const intermediatePartialRate = asRate(row.w90.partialCount, intermediateUses);
      const intermediateDisagreeRate = asRate(row.w90.disagreeCount, intermediateUses);

      const stabilityStatus = evaluateLearningInsightStability({
        allUses: row.all.uses,
        agreeRate,
        partialRate,
        disagreeRate,
        recent: row.w30,
        intermediate: row.w90,
      });

      return {
        insightKey,
        type: row.type,
        relatedExamType: row.relatedExamType,
        relatedDomain: row.relatedDomain,
        totalUses: row.all.uses,
        agreeCount: row.all.agreeCount,
        partialCount: row.all.partialCount,
        disagreeCount: row.all.disagreeCount,
        agreeRate,
        partialRate,
        disagreeRate,
        effectivenessStatus,
        recentUses,
        recentAgreeRate,
        recentPartialRate,
        recentDisagreeRate,
        intermediateUses,
        intermediateAgreeRate,
        intermediatePartialRate,
        intermediateDisagreeRate,
        stabilityStatus,
      } satisfies LearningInsightEffectiveness;
    })
    .sort((a, b) => {
      if (b.totalUses !== a.totalUses) return b.totalUses - a.totalUses;
      return b.agreeRate - a.agreeRate;
    });
}

function normalizeText(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

function resolveRelevanceScore(
  insight: LearningInsight,
  ctx: LearningInsightPrioritizationContext
): number {
  const examTypes = new Set((ctx.currentExamTypes ?? []).map((x) => normalizeText(x)));
  const domains = new Set((ctx.currentDomains ?? []).map((x) => normalizeText(x)));
  const insightExamType = normalizeText(insight.relatedExamType ?? null);
  const insightDomain = normalizeText(insight.relatedDomain ?? null);

  let score = 0;
  if (insightExamType) score += examTypes.has(insightExamType) ? 2 : -1;
  if (insightDomain) score += domains.has(insightDomain) ? 2 : -1;
  if (!insightExamType && !insightDomain) score += 1;
  return score;
}

function resolveStatusWeight(status?: LearningEffectivenessStatus): number {
  if (!status) return 1.5;
  if (status === 'promising') return 3;
  if (status === 'mixed') return 2;
  if (status === 'insufficient_data') return 1;
  return 0;
}

function stabilityPriorityBonus(stability?: LearningInsightStabilityStatus): number {
  if (!stability) return 0;
  if (stability === 'stable_positive') return 0.45;
  if (stability === 'recently_improving') return 0.32;
  if (stability === 'insufficient_recent_data') return -0.12;
  if (stability === 'recently_weakening') return -0.38;
  if (stability === 'volatile') return -0.22;
  return 0;
}

export function prioritizeLearningInsights(params: {
  insights: LearningInsight[];
  effectiveness: LearningInsightEffectiveness[];
  context?: LearningInsightPrioritizationContext;
}): LearningInsight[] {
  const insights = Array.isArray(params.insights) ? params.insights : [];
  if (insights.length === 0) return [];

  const maxInsights = Math.max(1, params.context?.maxInsights ?? 5);
  const effectiveness = Array.isArray(params.effectiveness) ? params.effectiveness : [];
  if (effectiveness.length === 0) {
    return insights.slice(0, maxInsights);
  }

  const map = new Map<string, LearningInsightEffectiveness>();
  for (const item of effectiveness) {
    map.set(item.insightKey, item);
  }

  const ranked: LearningInsightPriorityCandidate[] = insights.map((insight, idx) => {
    const eff = lookupEffectivenessForInsight(insight, map);
    const relevanceScore = resolveRelevanceScore(insight, params.context ?? {});
    const statusWeight = resolveStatusWeight(eff?.effectivenessStatus);
    const agreeRate = eff?.agreeRate ?? 0;
    const disagreeRate = eff?.disagreeRate ?? 0;
    let stabilityBonus = stabilityPriorityBonus(eff?.stabilityStatus);
    if (
      eff &&
      eff.recentUses < MIN_RECENT_FOR_STABILITY_SIGNAL &&
      eff.effectivenessStatus === 'promising'
    ) {
      stabilityBonus -= 0.1;
    }
    const baseOrderBias = (insights.length - idx) * 0.01;
    const priorityScore =
      relevanceScore * 2 +
      statusWeight +
      agreeRate -
      disagreeRate +
      stabilityBonus +
      baseOrderBias;

    return {
      insight,
      effectiveness: eff,
      relevanceScore,
      priorityScore,
    };
  });

  ranked.sort((a, b) => b.priorityScore - a.priorityScore);

  const selected: LearningInsightPriorityCandidate[] = [];
  let weakCount = 0;
  let insufficientCount = 0;

  for (const candidate of ranked) {
    if (selected.length >= maxInsights) break;
    if (candidate.relevanceScore < -1) continue;

    const status = candidate.effectiveness?.effectivenessStatus;
    const stab = candidate.effectiveness?.stabilityStatus;
    const hasStrongerSelected = selected.some((x) => {
      const s = x.effectiveness?.effectivenessStatus;
      return s === 'promising' || s === 'mixed' || !s;
    });

    if (status === 'weak_signal') {
      if (weakCount >= 1) continue;
      if (candidate.relevanceScore < 2 && hasStrongerSelected) continue;
      weakCount += 1;
    }

    if (status === 'insufficient_data') {
      if (insufficientCount >= 1) continue;
      if (candidate.relevanceScore < 2 && selected.length >= Math.max(1, Math.floor(maxInsights / 2))) {
        continue;
      }
      insufficientCount += 1;
    }

    if (stab === 'insufficient_recent_data') {
      const alreadyInsufficientRecent = selected.some(
        (x) => x.effectiveness?.stabilityStatus === 'insufficient_recent_data'
      );
      if (alreadyInsufficientRecent) continue;
    }

    selected.push(candidate);
  }

  if (selected.length === 0) {
    return ranked.slice(0, maxInsights).map((x) => x.insight);
  }

  return selected.map((x) => x.insight);
}

export function buildAdaptiveLearningContext(params: {
  insights: LearningInsight[];
  effectiveness: LearningInsightEffectiveness[];
  context?: LearningInsightPrioritizationContext;
}): { learningInsightsApplied: LearningInsight[]; learningContext: string } {
  const prioritized = prioritizeLearningInsights(params);
  const learningInsightsApplied = attachStabilityToInsights(prioritized, params.effectiveness);
  const maxInsights = Math.max(1, params.context?.maxInsights ?? 5);
  const learningContext = buildLearningContext(learningInsightsApplied, maxInsights);
  return { learningInsightsApplied, learningContext };
}

export function buildLearningEffectivenessSummary(
  effectiveness: LearningInsightEffectiveness[],
  topN = 3
): LearningEffectivenessSummary {
  const safeTopN = Math.max(1, topN);
  const promising = effectiveness.filter((x) => x.effectivenessStatus === 'promising');
  const mixed = effectiveness.filter((x) => x.effectivenessStatus === 'mixed');
  const weak = effectiveness.filter((x) => x.effectivenessStatus === 'weak_signal');
  const insufficient = effectiveness.filter((x) => x.effectivenessStatus === 'insufficient_data');

  const topPromising = [...promising]
    .sort((a, b) => b.agreeRate - a.agreeRate || b.totalUses - a.totalUses)
    .slice(0, safeTopN);
  const topWeakSignals = [...weak]
    .sort((a, b) => b.disagreeRate - a.disagreeRate || b.totalUses - a.totalUses)
    .slice(0, safeTopN);

  const notes: string[] = [];
  if (topPromising.length > 0) {
    notes.push('Há insights com sinal promissor para priorização incremental.');
  }
  if (topWeakSignals.length > 0) {
    notes.push('Alguns insights mostram sinal fraco e pedem revisão prudente.');
  }
  if (insufficient.length > 0) {
    notes.push('Parte dos insights ainda tem volume insuficiente para inferência confiável.');
  }

  return {
    totalInsights: effectiveness.length,
    promisingCount: promising.length,
    mixedCount: mixed.length,
    weakSignalCount: weak.length,
    insufficientDataCount: insufficient.length,
    topPromising,
    topWeakSignals,
    notes,
  };
}
