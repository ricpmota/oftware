import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getEmailCutoverControl } from '@/services/emailCutoverControlService';

export const runtime = 'nodejs';

/** GET /api/metaadmingeral/automation/cutover/email */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const control = await getEmailCutoverControl();
    return NextResponse.json({ ok: true, control });
  } catch (error) {
    console.error('[automation/cutover/email GET]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar cutover control.' },
      { status: 500 },
    );
  }
}
