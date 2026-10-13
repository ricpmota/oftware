import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  listFinanceiroCobrancaEnviosByMedico,
  toFinanceiroCobrancaEnvioDto,
} from '@/services/financeiroCobrancaEnvioService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmin/financeiro/cobranca-envios
 * Histórico de cobranças avulsas enviadas pelo médico (Canal Chat).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const envios = await listFinanceiroCobrancaEnviosByMedico(auth.medicoDocId, { limit: 300 });
    return NextResponse.json({
      ok: true,
      envios: envios.map(toFinanceiroCobrancaEnvioDto),
    });
  } catch (error) {
    console.error('[metaadmin/financeiro/cobranca-envios GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar histórico de cobranças.',
      },
      { status: 500 },
    );
  }
}
