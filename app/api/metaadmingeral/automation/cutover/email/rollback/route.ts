import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { rollbackEmailCutover } from '@/services/emailCutoverControlService';
import { EMAIL_CUTOVER_ROLLBACK_REASONS } from '@/types/emailCutoverControl';

export const runtime = 'nodejs';

/** POST /api/metaadmingeral/automation/cutover/email/rollback */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      organizationId?: string;
      reason?: string;
      reasonDetail?: string;
    } | null;

    const organizationId = body?.organizationId?.trim() || 'metodo';
    const reason = body?.reason?.trim();

    if (!reason || !EMAIL_CUTOVER_ROLLBACK_REASONS.includes(reason as never)) {
      return NextResponse.json(
        { ok: false, error: 'Motivo de rollback inválido.' },
        { status: 400 },
      );
    }

    const control = await rollbackEmailCutover({
      organizationId,
      changedBy: auth.email,
      reason: reason as (typeof EMAIL_CUTOVER_ROLLBACK_REASONS)[number],
      reasonDetail: body?.reasonDetail?.trim(),
    });

    return NextResponse.json({ ok: true, control });
  } catch (error) {
    console.error('[automation/cutover/email/rollback POST]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro no rollback.' },
      { status: 400 },
    );
  }
}
