import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { processDueWhatsappAutomationQueue } from '@/services/whatsappRemindersService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEFAULT_LIMIT = 10;

/**
 * GET /api/cron/send-whatsapp-lembretes
 * Motor de lembretes: consome APENAS itens vencidos da fila
 * (whatsapp_automation_queue: status pending + scheduledFor <= agora).
 * NÃO varre pacientes_completos nem automationDoctorSettings.
 */
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  const brasil = getBrasilDateTimeParts();
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : DEFAULT_LIMIT;

  try {
    const result = await processDueWhatsappAutomationQueue({ now: new Date(), limit });

    return NextResponse.json({
      ok: true,
      brasil,
      limit,
      ...result,
    });
  } catch (error) {
    console.error('[cron/send-whatsapp-lembretes]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro no cron WhatsApp lembretes.',
      },
      { status: 500 },
    );
  }
}
