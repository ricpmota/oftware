import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAutomationExecutionDetail } from '@/services/automationOpsExecutionService';

export const runtime = 'nodejs';

/** GET /api/metaadmingeral/automation/execution?id= */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = request.nextUrl.searchParams.get('id')?.trim() ?? '';
    if (!id) {
      return NextResponse.json({ ok: false, error: 'Parâmetro id é obrigatório.' }, { status: 400 });
    }

    const detail = await getAutomationExecutionDetail(id);
    if (!detail) {
      return NextResponse.json({ ok: false, error: 'Execução não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    console.error('[automation/execution GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar execução.' },
      { status: 500 },
    );
  }
}
