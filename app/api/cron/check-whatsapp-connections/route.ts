import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { checkAllWhatsappConnectionsAndNotify } from '@/services/whatsappDisconnectNotifyService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/cron/check-whatsapp-connections
 * Verifica sessões conectadas e envia e-mail ao médico quando a conexão cair.
 */
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    const result = await checkAllWhatsappConnectionsAndNotify();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[cron/check-whatsapp-connections]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar conexões WhatsApp.',
      },
      { status: 500 },
    );
  }
}
