import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { processDueCalendarioLembretesWhatsapp } from '@/services/calendarioLembreteWhatsappService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEFAULT_LIMIT = 20;

/**
 * GET /api/cron/send-whatsapp-calendario-lembretes
 * Motor dos lembretes do calendário:
 * Canal Chat → telefoneAviso; consulta médica 30 min → Canal Chat → paciente;
 * demais whatsappNotifyTarget=paciente saem do WhatsApp do profissional.
 */
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  const brasil = getBrasilDateTimeParts();
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : DEFAULT_LIMIT;

  try {
    const result = await processDueCalendarioLembretesWhatsapp({ now: new Date(), limit });

    console.log(
      '[cron/send-whatsapp-calendario-lembretes]',
      JSON.stringify({ brasil, limit, ...result }),
    );

    return NextResponse.json({
      ok: true,
      brasil,
      limit,
      ...result,
    });
  } catch (error) {
    console.error('[cron/send-whatsapp-calendario-lembretes]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro no cron WhatsApp lembretes do calendário.',
      },
      { status: 500 },
    );
  }
}
