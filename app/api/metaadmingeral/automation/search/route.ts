import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { searchAutomationOps } from '@/services/automationOpsSearchService';

export const runtime = 'nodejs';

/** GET /api/metaadmingeral/automation/search?q= */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const q = request.nextUrl.searchParams.get('q') ?? '';
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? '30');
    const results = await searchAutomationOps({ q, limit });
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('[automation/search GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro na busca.' },
      { status: 500 },
    );
  }
}
