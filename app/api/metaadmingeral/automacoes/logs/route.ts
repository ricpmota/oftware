import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAutomationCenterLogs } from '@/services/automationCenterLogsService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/logs?limit=100
 * Últimos eventos de envio automático (WhatsApp + e-mail) em todas as organizações.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 100;
    const logs = await getAutomationCenterLogs(Number.isFinite(limit) ? limit : 100);

    return NextResponse.json({
      ok: true,
      logs,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/logs GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar logs de automação.',
      },
      { status: 500 },
    );
  }
}
