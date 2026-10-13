import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { promoteEmailCutover } from '@/services/emailCutoverControlService';

export const runtime = 'nodejs';

/** POST /api/metaadmingeral/automation/cutover/email/promote */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as { organizationId?: string };
    const organizationId = body.organizationId?.trim() || 'metodo';

    const control = await promoteEmailCutover({
      organizationId,
      changedBy: auth.email,
    });

    return NextResponse.json({ ok: true, control });
  } catch (error) {
    console.error('[automation/cutover/email/promote POST]', error);
    const message = error instanceof Error ? error.message : 'Erro ao promover cutover.';
    const status = message.includes('bloqueou') || message.includes('pronto') ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
