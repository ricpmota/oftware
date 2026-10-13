import type { WeeklyNutritionAnalytics, WeeklyNutritionTrend } from '@/lib/nutri/checkInSemanalNutriAnalytics';
import {
  toWeeklyNutritionPortfolioPatient,
  type WeeklyNutritionPortfolioClassification,
  type WeeklyNutritionPortfolioPatient,
  type WeeklyNutritionPortfolioReason,
} from '@/lib/nutri/checkInSemanalNutriPortfolio';

export const NUTRI_WEEKLY_PORTFOLIO_SUMMARIES_COLLECTION = 'nutri_weekly_portfolio_summaries';
export const PORTFOLIO_SUMMARY_LOOKBACK = 8;
export const PORTFOLIO_SUMMARY_BACKFILL_CHUNK = 15;

export type WeeklyNutritionPortfolioSummaryDoc = {
  patientId: string;
  nutritionistId: string;
  latestWeekKey: string | null;
  latestScore: number | null;
  latestAdherence: number | null;
  trend: WeeklyNutritionTrend;
  trendDelta: number | null;
  scoreDelta: number | null;
  classification: WeeklyNutritionPortfolioClassification;
  priorityScore: number;
  reasons: WeeklyNutritionPortfolioReason[];
  recurringAttentionCount: number;
  updatedAt: Date;
};

export function nutriWeeklyPortfolioSummaryDocId(nutritionistId: string, patientId: string): string {
  return `${String(nutritionistId || '').trim()}__${String(patientId || '').trim()}`;
}

export function buildWeeklyNutritionPortfolioSummaryWrite(input: {
  patientId: string;
  nutritionistId: string;
  analytics: WeeklyNutritionAnalytics;
}): Omit<WeeklyNutritionPortfolioSummaryDoc, 'updatedAt'> {
  const classified = toWeeklyNutritionPortfolioPatient({
    patientId: input.patientId,
    patientName: 'Paciente',
    analytics: input.analytics,
  });
  return {
    patientId: input.patientId,
    nutritionistId: input.nutritionistId,
    latestWeekKey: classified.latestWeekKey,
    latestScore: classified.latestScore,
    latestAdherence: input.analytics.latest?.aderenciaPlano ?? null,
    trend: classified.trend,
    trendDelta: input.analytics.trendDelta,
    scoreDelta: classified.scoreDelta,
    classification: classified.classification,
    priorityScore: classified.priorityScore,
    reasons: classified.reasons,
    recurringAttentionCount: input.analytics.portfolioSignals.recurringAttentionCount,
  };
}

export function portfolioSummaryToPatient(
  summary: WeeklyNutritionPortfolioSummaryDoc,
  patientName: string
): WeeklyNutritionPortfolioPatient {
  return {
    patientId: summary.patientId,
    patientName,
    classification: summary.classification,
    reasons: summary.reasons,
    priorityScore: summary.priorityScore,
    latestScore: summary.latestScore,
    scoreDelta: summary.scoreDelta,
    trend: summary.trend,
    latestWeekKey: summary.latestWeekKey,
  };
}

export function deserializeWeeklyNutritionPortfolioSummary(
  data: Record<string, unknown>,
  fallbackPatientId: string
): WeeklyNutritionPortfolioSummaryDoc | null {
  const id = String(data.patientId ?? fallbackPatientId ?? '').trim();
  const nutritionistId = String(data.nutritionistId ?? '').trim();
  if (!id || !nutritionistId) return null;
  const classification = data.classification as WeeklyNutritionPortfolioSummaryDoc['classification'];
  if (
    classification !== 'attention' &&
    classification !== 'improving' &&
    classification !== 'stable' &&
    classification !== 'insufficient_data'
  ) {
    return null;
  }
  const updatedAtRaw = data.updatedAt;
  const updatedAt =
    updatedAtRaw instanceof Date
      ? updatedAtRaw
      : updatedAtRaw && typeof updatedAtRaw === 'object' && 'toDate' in updatedAtRaw
        ? (updatedAtRaw as { toDate: () => Date }).toDate()
        : new Date();
  return {
    patientId: id,
    nutritionistId,
    latestWeekKey: data.latestWeekKey ? String(data.latestWeekKey) : null,
    latestScore: typeof data.latestScore === 'number' ? data.latestScore : null,
    latestAdherence: typeof data.latestAdherence === 'number' ? data.latestAdherence : null,
    trend: (data.trend as WeeklyNutritionTrend) || 'insufficient_data',
    trendDelta: typeof data.trendDelta === 'number' ? data.trendDelta : null,
    scoreDelta: typeof data.scoreDelta === 'number' ? data.scoreDelta : null,
    classification,
    priorityScore: Number(data.priorityScore) || 0,
    reasons: Array.isArray(data.reasons)
      ? data.reasons
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const row = item as { id?: unknown; label?: unknown };
            const reasonId = String(row.id || '').trim();
            const label = String(row.label || '').trim();
            if (!reasonId || !label) return null;
            return { id: reasonId, label };
          })
          .filter((item): item is WeeklyNutritionPortfolioReason => Boolean(item))
      : [],
    recurringAttentionCount: Number(data.recurringAttentionCount) || 0,
    updatedAt,
  };
}
