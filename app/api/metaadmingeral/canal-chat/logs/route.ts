import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  listFinanceiroCobrancaEnviosGlobal,
  toFinanceiroCobrancaEnvioDto,
} from '@/services/financeiroCobrancaEnvioService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/canal-chat/logs
 * Log global de cobranças enviadas pelo Canal Chat.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  const limitRaw = request.nextUrl.searchParams.get('limit');
  const parsed = limitRaw ? Number.parseInt(limitRaw, 10) : 200;
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 200;

  try {
    const envios = await listFinanceiroCobrancaEnviosGlobal({ limit });
    return NextResponse.json({
      ok: true,
      envios: envios.map(toFinanceiroCobrancaEnvioDto),
    });
  } catch (error) {
    console.error('[metaadmingeral/canal-chat/logs GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar log do Canal Chat.',
      },
      { status: 500 },
    );
  }
}
