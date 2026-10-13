import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAutomationDashboardMetrics } from '@/services/automationDashboardService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/dashboard
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const dashboard = await getAutomationDashboardMetrics();

    return NextResponse.json({
      ok: true,
      dashboard,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/dashboard GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar dashboard de automações.',
      },
      { status: 500 },
    );
  }
}
