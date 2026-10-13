import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAutomationOpsDashboard } from '@/services/automationOpsDashboardService';

export const runtime = 'nodejs';

/** GET /api/metaadmingeral/automation/ops-dashboard */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const orgParam = request.nextUrl.searchParams.get('organizationIds');
    const organizationIds = orgParam ?
      orgParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

    const dashboard = await getAutomationOpsDashboard({ organizationIds });
    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    console.error('[automation/ops-dashboard GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar ops dashboard.' },
      { status: 500 },
    );
  }
}
