import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { rebuildEmailAutomationQueueForOrganization } from '@/services/emailAutomationRebuildService';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/cron/rebuild-email-queue
 * Cron diário LEVE (1x/dia) — backup de consistência da fila email_automation_queue.
 * Materializa email1–email5 para leads elegíveis. NÃO envia e-mails (shadow mode).
 */
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  const brasil = getBrasilDateTimeParts();
  const start = Date.now();

  try {
    const result = await rebuildEmailAutomationQueueForOrganization();

    return NextResponse.json({
      ok: true,
      shadowMode: true,
      brasil,
      durationMs: Date.now() - start,
      result,
    });
  } catch (error) {
    console.error('[cron/rebuild-email-queue]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir fila de e-mails.',
      },
      { status: 500 },
    );
  }
}
