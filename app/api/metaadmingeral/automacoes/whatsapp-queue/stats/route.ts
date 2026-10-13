import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getWhatsappAutomationQueueStats } from '@/services/whatsappAutomationQueueService';

export const runtime = 'nodejs';

const MINUTE_CRON_LIMIT_DEFAULT = 10;

/**
 * GET /api/metaadmingeral/automacoes/whatsapp-queue/stats
 * Estatísticas da fila otimizada + auditoria de custo (somente leitura).
 * NÃO altera cron, envio, templates nem regras clínicas.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const stats = await getWhatsappAutomationQueueStats(new Date());

    return NextResponse.json({
      ok: true,
      stats: {
        counts: stats.counts,
        dueNow: stats.dueNow,
        nextScheduledFor: stats.nextScheduledFor ? stats.nextScheduledFor.toISOString() : null,
        upcoming: stats.upcoming.map((item) => ({
          id: item.id,
          automationId: item.automationId,
          patientName: item.patientName,
          milestone: item.milestone,
          status: item.status,
          dateKey: item.dateKey,
          scheduledDateKey: item.scheduledDateKey,
          scheduledTime: item.scheduledTime,
          scheduledFor: item.scheduledFor ? item.scheduledFor.toISOString() : null,
          semana: item.semana,
          dose: item.dose,
          hasLink: !!item.link,
        })),
      },
      audit: {
        cronReadsOnlyQueue: true,
        minuteCronLimitDefault: MINUTE_CRON_LIMIT_DEFAULT,
        // Audit log do cron de minuto vai para os logs do servidor (não persistido em Firestore).
        lastAuditLog: null,
        note: 'O cron não varre pacientes.',
      },
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/whatsapp-queue/stats GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar estatísticas da fila.',
      },
      { status: 500 },
    );
  }
}
