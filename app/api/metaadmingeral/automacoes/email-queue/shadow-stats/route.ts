import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { getEmailAutomationEngineSetting } from '@/services/emailAutomationEngineService';
import { stats as getEmailQueueStats } from '@/services/emailAutomationQueueService';
import { getEmailQueueShadowStats } from '@/services/emailQueueShadowValidationService';

export const runtime = 'nodejs';

const CUTOVER_MIN_COMPARISONS = 500;
const CUTOVER_MIN_MATCH_RATE = 99.9;

/**
 * GET /api/metaadmingeral/automacoes/email-queue/shadow-stats
 * Métricas da validação shadow + checklist operacional de cutover.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim() || getDefaultOrganizationId();

    const [shadow, engineSetting, queueStats] = await Promise.all([
      getEmailQueueShadowStats(),
      getEmailAutomationEngineSetting(organizationId),
      getEmailQueueStats().catch(() => null),
    ]);

    const { aggregate, enabled, recentMismatches, last24h, last72h, matchRateTrend24h } = shadow;

    const operationalChecklist = {
      matchRateAtLeast999: aggregate.matchRate >= CUTOVER_MIN_MATCH_RATE,
      comparisonsAtLeast500: aggregate.totalComparisons >= CUTOVER_MIN_COMPARISONS,
      zeroCriticalMismatchLast72h: shadow.criticalMismatchesInLast72h === 0,
      shadowValidationEnabled: enabled,
      rebuildQueuePopulated: (queueStats?.counts.total ?? 0) > 0,
      engineIsLegacy: engineSetting.engine === 'legacy',
      statisticsConsistent:
        aggregate.totalComparisons === 0 ||
        Math.abs(aggregate.matchRate - computeSafeRate(aggregate.matches, aggregate.totalComparisons)) < 0.01,
    };

    const allChecklistPassed = Object.values(operationalChecklist).every(Boolean);

    return NextResponse.json({
      ok: true,
      organizationId,
      engine: {
        current: engineSetting.engine,
        automationEmailEngine: engineSetting.engine,
        updatedAt: engineSetting.updatedAt,
        updatedBy: engineSetting.updatedBy,
      },
      enabled,
      comparisons: aggregate.totalComparisons,
      matches: aggregate.matches,
      mismatches: aggregate.mismatches,
      matchRate: aggregate.matchRate,
      matchRatePercent: `${aggregate.matchRate}%`,
      targetMatchRate: CUTOVER_MIN_MATCH_RATE,
      windows: {
        last24h,
        last72h,
        previous24h: shadow.previous24h,
      },
      matchRateTrend24h,
      matchRateTrendLabel:
        matchRateTrend24h > 0
          ? 'melhorando'
          : matchRateTrend24h < 0
            ? 'piorando'
            : 'estável',
      lastMismatchAt: shadow.lastMismatchAt,
      lastCriticalMismatchAt: shadow.lastCriticalMismatchAt,
      consecutiveDaysWithoutCriticalMismatch: shadow.consecutiveDaysWithoutCriticalMismatch,
      criticalMismatchesInLast72h: shadow.criticalMismatchesInLast72h,
      byEmailTipo: aggregate.byEmailTipo,
      lastUpdatedAt: aggregate.lastUpdatedAt,
      operationalChecklist,
      readyForCutover: allChecklistPassed,
      recentMismatches: recentMismatches.map((m) => ({
        ...m,
        explanation:
          m.status === 'MISMATCH'
            ? `Legacy: ${m.legacyDecision} (${m.legacyReason}) | Queue: ${m.queueDecision} (${m.queueReason})`
            : undefined,
      })),
      queueStats: queueStats
        ? {
            counts: queueStats.counts,
            dueNow: queueStats.dueNow,
            nextScheduledFor: queueStats.nextScheduledFor?.toISOString() ?? null,
          }
        : null,
      audit: {
        logPrefix: '[email_queue_shadow]',
        featureFlag: 'EMAIL_QUEUE_SHADOW_VALIDATION=true',
        engineCollection: 'automation_email_engine',
        note: 'Motor legado continua enviando; fila não é alterada nesta etapa.',
      },
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/email-queue/shadow-stats GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar shadow stats.',
      },
      { status: 500 },
    );
  }
}

function computeSafeRate(matches: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((matches / total) * 100_000) / 1000;
}
