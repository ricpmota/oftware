import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { processDueCobrancaAutomaticaWhatsapp } from '@/services/cobrancaAutomaticaWhatsappService';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEFAULT_LIMIT = 40;

/**
 * GET /api/cron/send-whatsapp-cobranca-automatica
 * No dia do vencimento da parcela, envia cobrança ao paciente via Canal Chat.
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
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : DEFAULT_LIMIT;

  try {
    const result = await processDueCobrancaAutomaticaWhatsapp({ now: new Date(), limit });

    console.log(
      '[cron/send-whatsapp-cobranca-automatica]',
      JSON.stringify({ brasil, limit, ...result }),
    );

    return NextResponse.json({
      ok: true,
      brasil,
      limit,
      ...result,
    });
  } catch (error) {
    console.error('[cron/send-whatsapp-cobranca-automatica]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro no cron WhatsApp cobrança automática.',
      },
      { status: 500 },
    );
  }
}
