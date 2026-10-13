import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getLegacyVsQueueComparison } from '@/lib/automation/executionMetrics';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { stats } from '@/services/emailAutomationQueueService';
import { listEmailAutomationEngineSettings } from '@/services/emailAutomationEngineService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/email-queue/stats
 * Estatísticas da fila + throughput do Automation Engine (ETAPA 2).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const organizationId =
      request.nextUrl.searchParams.get('organizationId')?.trim() || getDefaultOrganizationId();
    const now = new Date();
    const [queueStats, engineSettings, comparison] = await Promise.all([
      stats(now, organizationId),
      listEmailAutomationEngineSettings(),
      getLegacyVsQueueComparison(organizationId),
    ]);

    const engineForOrg =
      engineSettings.find((s) => s.organizationId === organizationId)?.engine ?? 'legacy';

    const queueMetrics = comparison.queue;
    const legacyMetrics = comparison.legacy;

    return NextResponse.json({
      ok: true,
      etapa: 2,
      organizationId,
      engine: engineForOrg,
      stats: {
        counts: queueStats.counts,
        dueNow: queueStats.dueNow,
        nextScheduledFor: queueStats.nextScheduledFor ? queueStats.nextScheduledFor.toISOString() : null,
        upcoming: queueStats.upcoming.map((item) => ({
          id: item.id,
          leadId: item.leadId,
          leadEmail: item.leadEmail,
          leadNome: item.leadNome,
          emailTipo: item.emailTipo,
          status: item.status,
          scheduledFor: item.scheduledFor.toISOString(),
          organizationId: item.organizationId,
          doctorId: item.doctorId,
          retryCount: item.retryCount ?? 0,
          automationExecutionId: item.automationExecutionId,
        })),
        retries: {
          totalRetries: queueStats.totalRetries,
          avgRetryCountFailed: queueStats.avgRetryCountFailed,
        },
      },
      throughput: queueMetrics ?
        {
          emailsPerMinute: queueMetrics.emailsPerMinute,
          avgSendLatencyMs: queueMetrics.avgSendLatencyMs,
          maxSendLatencyMs: queueMetrics.maxSendLatencyMs,
          smtpErrors: queueMetrics.smtpErrors,
          lastRunAt: queueMetrics.finishedAt,
        }
      : null,
      performance: {
        queue: queueMetrics ?
          {
            firestoreReads: queueMetrics.firestoreReads,
            firestoreWrites: queueMetrics.firestoreWrites,
            durationMs: queueMetrics.durationMs,
            processed: queueMetrics.processed,
            sent: queueMetrics.sent,
            failed: queueMetrics.failed,
            skipped: queueMetrics.skipped,
          }
        : null,
        legacy: legacyMetrics ?
          {
            firestoreReads: legacyMetrics.firestoreReads,
            firestoreWrites: legacyMetrics.firestoreWrites,
            durationMs: legacyMetrics.durationMs,
            processed: legacyMetrics.processed,
            sent: legacyMetrics.sent,
            failed: legacyMetrics.failed,
          }
        : null,
        comparison:
          queueMetrics && legacyMetrics ?
            {
              firestoreReadsSaved: Math.max(0, legacyMetrics.firestoreReads - queueMetrics.firestoreReads),
              firestoreWritesDelta: queueMetrics.firestoreWrites - legacyMetrics.firestoreWrites,
              durationMsDelta: queueMetrics.durationMs - legacyMetrics.durationMs,
              readsReductionPct:
                legacyMetrics.firestoreReads > 0 ?
                  Math.round(
                    ((legacyMetrics.firestoreReads - queueMetrics.firestoreReads) /
                      legacyMetrics.firestoreReads) *
                      100,
                  )
                : null,
            }
          : null,
      },
      engines: engineSettings.map((s) => ({
        organizationId: s.organizationId,
        engine: s.engine,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/email-queue/stats GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar estatísticas da fila.',
      },
      { status: 500 },
    );
  }
}
