import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { rebuildWhatsappAutomationQueueForOrganization } from '@/services/whatsappRemindersService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/cron/rebuild-whatsapp-queue
 * Cron diário LEVE (1x/dia) — backup de consistência da fila de lembretes.
 * Reconstrói whatsapp_automation_queue (próximos 45 dias) para cada médico com
 * lembrete ativo. NÃO roda a cada minuto: os itens do dia já são mantidos pelos
 * gatilhos leves (salvar plano / registrar aplicação). Este cron só garante que
 * planos alterados sem gatilho e a janela rolante de 45 dias fiquem em dia.
 *
 * O cron de 1 min (send-whatsapp-lembretes) continua lendo APENAS a fila.
 */
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  const brasil = getBrasilDateTimeParts();
  const start = Date.now();

  try {
    const result = await rebuildWhatsappAutomationQueueForOrganization();

    return NextResponse.json({
      ok: true,
      brasil,
      durationMs: Date.now() - start,
      doctors: result.doctors,
      enqueued: result.enqueued,
      updated: result.updated,
    });
  } catch (error) {
    console.error('[cron/rebuild-whatsapp-queue]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir a fila (cron diário).',
      },
      { status: 500 },
    );
  }
}
