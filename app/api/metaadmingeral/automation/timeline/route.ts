import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAutomationOpsTimeline } from '@/services/automationOpsTimelineService';

export const runtime = 'nodejs';

/** GET /api/metaadmingeral/automation/timeline */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '50');
    const events = await getAutomationOpsTimeline(limit);
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    console.error('[automation/timeline GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar timeline.' },
      { status: 500 },
    );
  }
}
