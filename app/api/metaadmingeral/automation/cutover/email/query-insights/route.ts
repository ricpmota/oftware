import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { recordEmailCutoverQueryInsights } from '@/services/emailCutoverControlService';

export const runtime = 'nodejs';

/** POST /api/metaadmingeral/automation/cutover/email/query-insights */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      organizationId?: string;
      window?: string;
      reads24h?: number;
      executions24h?: number;
      note?: string;
    } | null;

    const organizationId = body?.organizationId?.trim() || 'metodo';
    const window = body?.window as 'baseline' | '30m' | '60m' | undefined;

    if (!window || !['baseline', '30m', '60m'].includes(window)) {
      return NextResponse.json(
        { ok: false, error: 'window deve ser baseline, 30m ou 60m.' },
        { status: 400 },
      );
    }

    const control = await recordEmailCutoverQueryInsights({
      organizationId,
      window,
      reads24h: typeof body?.reads24h === 'number' ? body.reads24h : undefined,
      executions24h: typeof body?.executions24h === 'number' ? body.executions24h : undefined,
      note: body?.note?.trim(),
    });

    return NextResponse.json({ ok: true, control });
  } catch (error) {
    console.error('[automation/cutover/email/query-insights POST]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao registrar Query Insights.' },
      { status: 400 },
    );
  }
}
