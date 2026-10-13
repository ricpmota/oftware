import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { recordWhatsappCronHeartbeat } from '@/services/whatsappCronHeartbeatService';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/cron/send-whatsapp-aplicacao
 *
 * MIGRADO: o envio de "aplicação do dia" passou a ser feito pela fila
 * `whatsapp_automation_queue` + cron `/api/cron/send-whatsapp-lembretes`
 * (mesmo motor de D-1 / atrasada).
 *
 * Esta rota permanece como no-op para não quebrar o schedule da Vercel
 * e para registrar heartbeat claro (`migrated_to_queue`).
 */
export async function GET(request: NextRequest) {
  const brasil = getBrasilDateTimeParts();
  const host = request.headers.get('host') ?? undefined;
  const envGate = assertCronProductionEnvironment(request);

  if (!envGate.ok) {
    if (process.env.VERCEL_ENV === 'production') {
      await recordWhatsappCronHeartbeat({
        host,
        skipped: true,
        skipReason: envGate.body.reason,
        skipMessage: envGate.body.message,
        medicos: 0,
        enviados: 0,
        falhas: 0,
        brasilDateKey: brasil.dateKey,
        brasilHhmm: brasil.hhmm,
      }).catch((error) => console.error('[cron/send-whatsapp-aplicacao] heartbeat skip', error));
    }

    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  await recordWhatsappCronHeartbeat({
    host,
    skipped: true,
    skipReason: 'migrated_to_queue',
    skipMessage:
      'Aplicação do dia migrou para whatsapp_automation_queue + send-whatsapp-lembretes. Rebuild a fila para enfileirar itens d0.',
    medicos: 0,
    enviados: 0,
    falhas: 0,
    brasilDateKey: brasil.dateKey,
    brasilHhmm: brasil.hhmm,
  }).catch((error) => console.error('[cron/send-whatsapp-aplicacao] heartbeat', error));

  return NextResponse.json({
    ok: true,
    migrated: true,
    reason: 'migrated_to_queue',
    message:
      'Envio da aplicação do dia é feito por /api/cron/send-whatsapp-lembretes (fila). Esta rota não envia mais.',
    brasil,
    medicos: 0,
    enviados: 0,
    falhas: 0,
  });
}
