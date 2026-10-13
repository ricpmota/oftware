import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getWhatsappAutoEnvioStatusMap } from '@/services/whatsappAutoAplicacaoService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmin/whatsapp/auto-envios?date=YYYY-MM-DD
 * Status dos envios automáticos do dia (para badges no calendário).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  const date = request.nextUrl.searchParams.get('date')?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, error: 'Parâmetro date inválido. Use YYYY-MM-DD.' },
      { status: 400 },
    );
  }

  try {
    const statusMap = await getWhatsappAutoEnvioStatusMap(auth.medicoDocId, date);

    return NextResponse.json({
      ok: true,
      date,
      envios: statusMap,
    });
  } catch (error) {
    console.error('[metaadmin/whatsapp/auto-envios]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao consultar envios automáticos.' },
      { status: 500 },
    );
  }
}
